import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedis } from './_redis'
import { getFirebaseMessaging } from './_firebase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const kv = getRedis()
    const tokens = await kv.smembers('city:חיפה')

    if (!tokens || tokens.length === 0) {
      return res.status(200).json({ ok: false, reason: 'No subscribers' })
    }

    const messaging = getFirebaseMessaging()
    const results: Array<{ token: string; status: string; error?: string }> = []

    for (const token of tokens) {
      try {
        await messaging.send({
          token,
          notification: { title: '🧪 ТЕСТ push уведомления', body: 'Если видишь это — FCM работает!' },
          android: {
            priority: 'high',
            ttl: 0,
            notification: {
              channelId: 'alerts_v2',
              priority: 'max',
              sound: 'siren',
              defaultVibrateTimings: true,
              visibility: 'public',
              notificationCount: 1,
            },
          },
          data: { type: 'test' },
        })
        results.push({ token: token.slice(0, 20) + '...', status: 'ok' })
      } catch (e: any) {
        results.push({ token: token.slice(0, 20) + '...', status: 'error', error: e?.message })
        const msg: string = e?.message ?? ''
        if (msg.includes('not found') || msg.includes('Requested entity') || msg.includes('UNREGISTERED') || msg.includes('InvalidRegistration')) {
          const cityKeys = await kv.keys('city:*')
          for (const key of cityKeys) await kv.srem(key, token)
          await kv.del(`token:${token}`)
        }
      }
    }

    const sent = results.filter(r => r.status === 'ok').length
    const cleaned = results.filter(r => r.status === 'error').length
    return res.status(200).json({ ok: true, sent, total: tokens.length, cleaned, results })
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message })
  }
}
