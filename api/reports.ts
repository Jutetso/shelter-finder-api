import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedis } from './_redis'

// GET /api/reports?limit=100
// Returns aggregate stats + recent reports for dashboard

interface Report {
  ts: number
  cities: string[]
  responseTimeSec: number
  nearestMeters: number | null
  lang: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const kv = getRedis()
    const limit = Math.min(Number(req.query.limit) || 100, 500)

    const [rawList, totalStr] = await Promise.all([
      kv.lrange('reports', 0, limit - 1),
      kv.get('reports:total'),
    ])

    const reports: Report[] = rawList
      .map((r: string) => { try { return JSON.parse(r) } catch { return null } })
      .filter(Boolean)

    const total = Number(totalStr) || reports.length

    // Aggregate stats
    const withTime = reports.filter(r => r.responseTimeSec >= 0)
    const avgResponseSec = withTime.length
      ? Math.round(withTime.reduce((s, r) => s + r.responseTimeSec, 0) / withTime.length)
      : null

    const withDist = reports.filter(r => r.nearestMeters != null)
    const avgNearestM = withDist.length
      ? Math.round(withDist.reduce((s, r) => s + (r.nearestMeters ?? 0), 0) / withDist.length)
      : null

    // City frequency
    const cityCount: Record<string, number> = {}
    for (const r of reports) {
      for (const c of r.cities) {
        cityCount[c] = (cityCount[c] ?? 0) + 1
      }
    }
    const topCities = Object.entries(cityCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([city, count]) => ({ city, count }))

    // Lang distribution
    const langCount: Record<string, number> = {}
    for (const r of reports) {
      langCount[r.lang] = (langCount[r.lang] ?? 0) + 1
    }

    return res.status(200).json({
      total,
      shown: reports.length,
      avgResponseSec,
      avgNearestM,
      topCities,
      langCount,
      reports: reports.map(r => ({
        ts: r.ts,
        date: new Date(r.ts).toISOString(),
        cities: r.cities,
        responseTimeSec: r.responseTimeSec,
        nearestMeters: r.nearestMeters,
        lang: r.lang,
      })),
    })
  } catch (e: any) {
    console.error('[reports] Error:', e?.message)
    return res.status(500).json({ error: e?.message })
  }
}
