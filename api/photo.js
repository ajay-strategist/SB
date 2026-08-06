// Vercel serverless image proxy for public Google Drive photos.
// Fetches the image server-side (no browser CORS/referrer limits) and serves
// it from this same origin, so the app + PDF can embed it reliably.
// Usage: /api/photo?id=<GOOGLE_DRIVE_FILE_ID>
export default async function handler(req, res) {
  const id = String(req.query.id || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!id) { res.status(400).send('missing id'); return; }

  const sources = [
    `https://lh3.googleusercontent.com/d/${id}=w800`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w800`,
    `https://drive.google.com/uc?export=view&id=${id}`,
  ];

  for (const url of sources) {
    try {
      const r = await fetch(url, { redirect: 'follow' });
      if (!r.ok) continue;
      const ct = r.headers.get('content-type') || '';
      if (!ct.startsWith('image/')) continue; // Drive HTML error page, not an image
      const buf = Buffer.from(await r.arrayBuffer());
      res.setHeader('Content-Type', ct);
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(200).send(buf);
      return;
    } catch (e) { /* try next source */ }
  }
  res.status(404).send('image not found or not public');
}
