import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');

  try {
    // Попробуй tzevaadom сначала (работает отовсюду)
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const tzRes = await fetch('https://api.tzevaadom.co.il/notifications', {
      signal: controller.signal,
    });
    clearTimeout(timer);

    const data = await tzRes.json();

    if (Array.isArray(data) && data.length > 0) {
      const recent = data[0];
      const alertTime = (recent.time || 0) * 1000;
      if (Date.now() - alertTime < 300000) {
        return res.status(200).json({
          alerts: recent.cities || [],
          source: 'tzevaadom',
          time: alertTime,
        });
      }
    }

    return res.status(200).json({ alerts: [], source: 'none' });
  } catch (e: any) {
    return res.status(200).json({ alerts: [], source: 'error', error: e.message });
  }
}
