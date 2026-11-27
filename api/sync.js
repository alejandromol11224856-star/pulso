// API de sincronización de Pulso (función serverless de Vercel).
// Guarda UN archivo por usuario en Vercel Blob (almacenamiento privado).
// El contenido llega CIFRADO desde el navegador (AES-GCM): el servidor nunca ve tus datos,
// solo un identificador derivado de tu código de sincronización.
import { get, put, BlobPreconditionFailedError } from '@vercel/blob';

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB alcanza para años de movimientos

// La app de Android (Capacitor) corre en https://localhost: le permitimos llamar a esta API.
const ALLOWED_ORIGINS = new Set(['https://localhost', 'http://localhost', 'capacitor://localhost']);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-If-Match');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  const id = String(req.query.id || '');
  if (!/^[a-f0-9]{64}$/.test(id)) return res.status(400).json({ error: 'id inválido' });
  const pathname = `pulso/${id}.json`;

  try {
    if (req.method === 'GET') {
      // sin compresión: si no, el ETag llega "débil" (W/"…") y no sirve para If-Match
      const r = await get(pathname, { access: 'private', useCache: false, headers: { 'Accept-Encoding': 'identity' } });
      if (!r || r.statusCode !== 200) return res.status(404).json({ error: 'sin datos' });
      const doc = await new Response(r.stream).text();
      // el ETag va dentro del JSON (los proxies pueden reescribir el header ETag)
      return res.status(200).json({ etag: String(r.blob.etag).replace(/^W\//, ''), doc });
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      if (body.length > MAX_BYTES) return res.status(413).json({ error: 'demasiado grande' });
      let doc;
      try { doc = JSON.parse(body); } catch { return res.status(400).json({ error: 'JSON inválido' }); }
      if (doc?.v !== 1 || typeof doc.iv !== 'string' || typeof doc.ct !== 'string') {
        return res.status(400).json({ error: 'formato inválido' });
      }
      const ifMatch = req.headers['x-if-match'];
      const opts = { access: 'private', addRandomSuffix: false, contentType: 'application/json' };
      if (ifMatch) opts.ifMatch = String(ifMatch);
      try {
        const out = await put(pathname, body, opts);
        return res.status(200).json({ etag: out.etag });
      } catch (e) {
        // otro dispositivo guardó antes (ETag distinto) o ya existe y no mandamos ETag
        if (e instanceof BlobPreconditionFailedError || /already exists|precondition/i.test(e?.message || '')) {
          return res.status(409).json({ error: 'conflicto' });
        }
        throw e;
      }
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'método no permitido' });
  } catch (e) {
    console.error('sync error', e);
    return res.status(500).json({ error: 'error del servidor' });
  }
}
