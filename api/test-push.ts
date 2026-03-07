import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Expo } from 'expo-server-sdk'
import { getRedis } from './_redis'

const expo = new Expo()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  try {
    const kv = getRedis()
    const tokens = await kv.smembers('city:חיפה')

    if (!tokens || tokens.length === 0) {
      return res.status(200).json({ ok: false, reason: 'No subscribers' })
    }

    // Фильтруем только валидные токены (не test123)
    const validTokens = tokens.filter(t => Expo.isExpoPushToken(t))

    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default' as const,
      title: 'Test push',
      body: 'If you see this, push works!',
      priority: 'high' as const,
      data: { type: 'test' },
    }))

    // Отправить и получить ПОДРОБНЫЙ ответ
    const chunks = expo.chunkPushNotifications(messages)
    const tickets: any[] = []

    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk)
      tickets.push(...ticketChunk)
    }

    // Показать ticket для каждого токена
    const results = validTokens.map((token, i) => ({
      token: token.substring(0, 30) + '...',
      ticket: tickets[i],
    }))

    return res.status(200).json({
      ok: true,
      sent: validTokens.length,
      allTokens: tokens.length,
      results,
    })
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message })
  }
}
