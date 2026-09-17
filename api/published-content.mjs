// ============================================================
// PUBLISHED CONTENT API — site + YouTube/Instagram yayın zinciri bağlantısı
// ============================================================
// `automation/video-pipeline/scripts/regenerate-published-content.mjs`
// tarafından üretilen `data/published-content.json`'ı (bu dosyayla aynı
// dizinde, tıpkı `sorular.json` gibi) okuyup public-safe olarak döner.
// Dosya yoksa/bozuksa (ör. henüz hiç yayın yapılmadıysa) BOŞ liste döner —
// hiçbir zaman hata fırlatmaz, site tarafı bunu sessizce atlar.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let MANIFEST = { generatedAt: null, items: [] };
try {
  MANIFEST = JSON.parse(readFileSync(path.join(__dirname, 'data', 'published-content.json'), 'utf-8'));
} catch (e) {
  console.error('published-content.json yüklenemedi (boş liste dönülüyor):', e.message);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=86400');
  return res.status(200).json({
    generatedAt: MANIFEST.generatedAt ?? null,
    items: Array.isArray(MANIFEST.items) ? MANIFEST.items : [],
  });
}
