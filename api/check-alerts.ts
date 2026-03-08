import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedis } from './_redis'
import { getFirebaseMessaging } from './_firebase'

const LAST_ALERT_KEY = 'last_alert_id'

async function fetchAlerts(): Promise<string[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const res = await fetch('https://api.tzevaadom.co.il/notifications', { signal: controller.signal })
    clearTimeout(timeout)
    const data = await res.json() as Array<{ date: string; cities?: string[] }>
    if (Array.isArray(data) && data.length > 0) {
      const recent = data[0]
      if (Date.now() - new Date(recent.date).getTime() < 120000) return recent.cities || []
    }
    return []
  } catch {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const res = await fetch('https://www.oref.org.il/WarningMessages/alert/alerts.json', {
        headers: { 'Referer': 'https://www.oref.org.il/', 'X-Requested-With': 'XMLHttpRequest' },
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const text = await res.text()
      const cleaned = text.replace(/^\uFEFF/, '').trim()
      if (!cleaned || cleaned.length <= 5 || cleaned === '[]' || cleaned === 'null') return []
      const parsed = JSON.parse(cleaned) as { data?: string | string[] }
      if (!parsed?.data) return []
      return Array.isArray(parsed.data) ? parsed.data : [parsed.data]
    } catch { return [] }
  }
}

interface CheckResult { alerts: number; notified: number; reason?: string }

async function checkAndNotify(): Promise<CheckResult> {
  const alertCities = await fetchAlerts()
  if (alertCities.length === 0) return { alerts: 0, notified: 0 }

  const kv = getRedis()
  const alertId = JSON.stringify(alertCities.slice().sort()).substring(0, 80)
  const lastId = await kv.get(LAST_ALERT_KEY)
  if (lastId === alertId) return { alerts: alertCities.length, notified: 0, reason: 'duplicate' }
  await kv.set(LAST_ALERT_KEY, alertId, 'EX', 300)

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

  const messaging = getFirebaseMessaging()
  let sent = 0
  for (const token of tokensToNotify) {
    try {
      await messaging.send({
        token,
        notification: { title: '🚨 צבע אדום!', body: 'היכנסו למרחב המוגן! Бегите в укрытие!' },
        android: {
            priority: 'high',
            ttl: 0,
            notification: {
              channelId: 'alerts',
              priority: 'max',
              sound: 'siren',
              defaultVibrateTimings: true,
              visibility: 'public',
              notificationCount: 1,
            },
          },
        data: { type: 'alert', cities: JSON.stringify(alertCities) },
      })
      sent++
    } catch (e: any) {
      console.error('[Push] Failed:', token.slice(0, 20), e?.message)
      if (e?.code === 'messaging/registration-token-not-registered' || e?.code === 'messaging/invalid-registration-token') {
        const cityData = await kv.get(`token:${token}`)
        if (cityData) {
          const cities: string[] = JSON.parse(cityData)
          for (const city of cities) await kv.srem(`city:${city}`, token)
          await kv.del(`token:${token}`)
        }
      }
    }
  }
  return { alerts: alertCities.length, notified: sent }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const result1 = await checkAndNotify()
    await new Promise<void>(r => setTimeout(r, 28000))
    const result2 = await checkAndNotify()
    return res.status(200).json({ ok: true, check1: result1, check2: result2, timestamp: new Date().toISOString() })
  } catch (e) {
    const err = e as Error
    console.error('[check-alerts] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
