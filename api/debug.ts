import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedis } from './_redis'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const kv = getRedis()
    const allKeys = await kv.keys('*')
    const data: Record<string, any> = {}
    for (const key of allKeys) {
      const type = await kv.type(key)
      if (type === 'set') {
        data[key] = await kv.smembers(key)
      } else if (type === 'string') {
        data[key] = await kv.get(key)
      }
    }
    return res.status(200).json({ keys: allKeys.length, data })
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message })
  }
}
