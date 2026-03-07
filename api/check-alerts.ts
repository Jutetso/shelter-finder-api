import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Expo, ExpoPushMessage } from 'expo-server-sdk'
import { getRedis } from './_redis'

const expo = new Expo()
const LAST_ALERT_KEY = 'last_alert_id'

// ── Fetch active alert cities ─────────────────────────────────────────────────
async function fetchAlerts(): Promise<string[]> {
  // Primary: tzevaadom aggregator (works from outside Israel)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch('https://api.tzevaadom.co.il/notifications', {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const data = await res.json() as Array<{ date: string; cities?: string[] }>
    if (Array.isArray(data) && data.length > 0) {
      const recent = data[0]
      const alertTime = new Date(recent.date).getTime()
      if (Date.now() - alertTime < 120000) { // within last 2 minutes
        return recent.cities || []
      }
    }
    return []
  } catch {
    // Fallback: direct oref
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const res = await fetch('https://www.oref.org.il/WarningMessages/alert/alerts.json', {
        headers: {
          'Referer': 'https://www.oref.org.il/',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
        },
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const text = await res.text()
      const cleaned = text.replace(/^\uFEFF/, '').trim()
      if (!cleaned || cleaned.length <= 5 || cleaned === '[]' || cleaned === 'null') return []
      const parsed = JSON.parse(cleaned) as { data?: string | string[] }
      if (!parsed?.data) return []
      return Array.isArray(parsed.data) ? parsed.data : [parsed.data]
    } catch {
      return []
    }
  }
}

// ── Check and notify ──────────────────────────────────────────────────────────
interface CheckResult {
  alerts: number
  notified: number
  reason?: string
}

async function checkAndNotify(): Promise<CheckResult> {
  const alertCities = await fetchAlerts()
  if (alertCities.length === 0) return { alerts: 0, notified: 0 }

  const kv = getRedis()

  // Deduplicate — don't send same alert twice within 5 minutes
  const alertId = JSON.stringify(alertCities.slice().sort()).substring(0, 80)
  const lastId = await kv.get(LAST_ALERT_KEY)
  if (lastId === alertId) return { alerts: alertCities.length, notified: 0, reason: 'duplicate' }
  await kv.set(LAST_ALERT_KEY, alertId, 'EX', 300)

  // Collect tokens for matching cities
  const tokensToNotify = new Set<string>()
  const allKeys = await kv.keys('city:*')

  for (const alertCity of alertCities) {
    for (const key of allKeys) {
      const cityName = key.replace('city:', '')
      if (alertCity.includes(cityName) || cityName.includes(alertCity)) {
        const tokens = await kv.smembers(key)
        tokens.forEach(t => tokensToNotify.add(t))
      }
    }
  }

  if (tokensToNotify.size === 0) return { alerts: alertCities.length, notified: 0 }

  const messages: ExpoPushMessage[] = [...tokensToNotify]
    .filter(token => Expo.isExpoPushToken(token))
    .map(token => ({
      to: token,
      sound: 'default' as const,
      title: '🚨 צבע אדום!',
      body: 'היכנסו למרחב המוגן! Бегите в укрытие!',
      priority: 'high' as const,
      channelId: 'alerts',
      data: { type: 'alert', cities: alertCities },
    }))

  let sent = 0
  const chunks = expo.chunkPushNotifications(messages)
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk)
      sent += chunk.length
    } catch (e) {
      console.error('[Push] Chunk failed:', e)
    }
  }

  return { alerts: alertCities.length, notified: sent }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const result1 = await checkAndNotify()
    await new Promise<void>(r => setTimeout(r, 28000))
    const result2 = await checkAndNotify()

    return res.status(200).json({
      ok: true,
      check1: result1,
      check2: result2,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    const err = e as Error
    console.error('[check-alerts] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
