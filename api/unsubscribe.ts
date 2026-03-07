import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedis } from './_redis'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { token } = req.body as { token?: string }
    if (!token) return res.status(400).json({ error: 'Missing token' })

    const kv = getRedis()

    const citiesRaw = await kv.get(`token:${token}`)
    if (citiesRaw) {
      const cities: string[] = JSON.parse(citiesRaw)
      for (const city of cities) {
        await kv.srem(`city:${city}`, token)
      }
    }
    await kv.del(`token:${token}`)

    return res.status(200).json({ ok: true })
  } catch (e) {
    const err = e as Error
    return res.status(500).json({ error: err.message })
  }
}
