import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedis } from './_redis'

// POST /api/report
// Body: { cities: string[], responseTimeSec: number, nearestMeters?: number, lang?: string }
// Anonymous — no user IDs, no IP stored

const MAX_REPORTS = 2000

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { cities, responseTimeSec, nearestMeters, lang } = req.body ?? {}
    if (!Array.isArray(cities) || typeof responseTimeSec !== 'number') {
      return res.status(400).json({ error: 'Invalid payload' })
    }

    const kv = getRedis()
    const report = JSON.stringify({
      ts: Date.now(),
      cities: cities.slice(0, 10),
      responseTimeSec: Math.round(responseTimeSec),
      nearestMeters: typeof nearestMeters === 'number' ? Math.round(nearestMeters) : null,
      lang: typeof lang === 'string' ? lang : 'unknown',
    })

    await kv.lpush('reports', report)
    await kv.ltrim('reports', 0, MAX_REPORTS - 1)
    await kv.incr('reports:total')

    return res.status(200).json({ ok: true })
  } catch (e: any) {
    console.error('[report] Error:', e?.message)
    return res.status(500).json({ error: e?.message })
  }
}
