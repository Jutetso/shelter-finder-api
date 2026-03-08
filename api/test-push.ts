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
              channelId: 'alerts',
              priority: 'max',
              defaultSound: true,
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
      }
    }

    const sent = results.filter(r => r.status === 'ok').length
    return res.status(200).json({ ok: true, sent, total: tokens.length, results })
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message })
  }
}
