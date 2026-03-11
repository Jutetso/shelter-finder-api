import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedis } from './_redis'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const kv = getRedis()
  const [alertLog, sendLog] = await Promise.all([
    kv.lrange('alert_log', 0, 19),
    kv.lrange('send_log', 0, 19),
  ])
  return res.json({
    alerts: alertLog.map((l: string) => JSON.parse(l)),
    sends: sendLog.map((l: string) => JSON.parse(l)),
  })
}
