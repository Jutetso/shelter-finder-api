import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedis } from './_redis'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { token, cities } = req.body as { token?: string; cities?: string[] }
    if (!token || !cities) return res.status(400).json({ error: 'Missing token or cities' })

    const kv = getRedis()

    // Remove token from old city sets
    const oldCitiesRaw = await kv.get(`token:${token}`)
    if (oldCitiesRaw) {
      const oldCities: string[] = JSON.parse(oldCitiesRaw)
      for (const city of oldCities) {
        await kv.srem(`city:${city}`, token)
      }
    }

    // Add token to new city sets
    for (const city of cities) {
      await kv.sadd(`city:${city}`, token)
    }
    await kv.set(`token:${token}`, JSON.stringify(cities))

    return res.status(200).json({ ok: true, cities: cities.length })
  } catch (e) {
    const err = e as Error
    return res.status(500).json({ error: err.message })
  }
}
