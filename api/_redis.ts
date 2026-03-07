import Redis from 'ioredis'

// Reuse connection across invocations within the same container
let client: Redis | null = null

export function getRedis(): Redis {
  if (!client) {
    const url = process.env.UPSTASH_REDIS_REST_REDIS_URL
    if (!url) throw new Error('UPSTASH_REDIS_REST_REDIS_URL is not set')
    client = new Redis(url, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: false,
    })
    client.on('error', (e) => console.error('[Redis] Error:', e.message))
  }
  return client
}
