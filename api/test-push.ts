import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Expo } from 'expo-server-sdk'
import { getRedis } from './_redis'

const expo = new Expo()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const kv = getRedis()

    // Найти все токены подписанные на Хайфу
    const tokens = await kv.smembers('city:חיפה')

    if (!tokens || tokens.length === 0) {
      return res.status(200).json({ ok: false, reason: 'No subscribers for חיפה', tokens: 0 })
    }

    const messages = tokens
      .filter(t => Expo.isExpoPushToken(t))
      .map(token => ({
        to: token,
        sound: 'default' as const,
        title: '🧪 ТЕСТ push уведомления',
        body: 'Если видишь это — фоновый режим работает!',
        priority: 'high' as const,
        channelId: 'alerts',
        data: { type: 'test' },
      }))

    if (messages.length === 0) {
      return res.status(200).json({ ok: false, reason: 'No valid Expo tokens', tokens: tokens.length })
    }

    const chunks = expo.chunkPushNotifications(messages)
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk)
    }

    return res.status(200).json({ ok: true, sent: messages.length })
  } catch (e) {
    const err = e as Error
    return res.status(500).json({ error: err.message })
  }
}
