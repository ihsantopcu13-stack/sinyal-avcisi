// ============================================================
// CRON: AI ile 5 Dakika — günlük Instagram gönderisi
// ============================================================
// Vercel Cron tarafından her gün TR saatiyle 20:00'de tetiklenir (bkz.
// vercel.json "crons" — "0 17 * * *" = 17:00 UTC = 20:00 Türkiye, DST yok).
// cron-instagram-sinyal.mjs ile aynı desen, ayrı Instagram hesabı ve
// ayrı içerik akışı kullanır.

import { ai5dkIcerikUret } from './_instagram-content.mjs';
import { instagramGonderiYayinla } from './_instagram-publish.mjs';

const SITE_URL = 'https://www.sinyal-avcisi.com';

function captionOlustur(d) {
  return `🤖 ${d.baslik}\n\n${d.ipucu}\n\n✍️ Hemen dene:\n${d.ornek}\n\n#YapayZeka #AI #ChatGPT #Claude #Verimlilik #Prompt`;
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || '';
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('cron-instagram-5dk: CRON_SECRET tanımlı değil');
    return res.status(500).json({ error: 'Sunucu yapılandırması eksik' });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Yetkisiz' });
  }

  const accessToken = process.env.IG_5DK_ACCESS_TOKEN;
  const igBusinessAccountId = process.env.IG_5DK_BUSINESS_ACCOUNT_ID;
  if (!accessToken || !igBusinessAccountId) {
    console.error('cron-instagram-5dk: IG_5DK_ACCESS_TOKEN veya IG_5DK_BUSINESS_ACCOUNT_ID eksik');
    return res.status(500).json({ error: 'Instagram kimlik bilgileri eksik' });
  }

  try {
    const icerik = await ai5dkIcerikUret();
    const encoded = Buffer.from(JSON.stringify(icerik)).toString('base64');
    const imageUrl = `${SITE_URL}/api/og-instagram?brand=5dk&d=${encodeURIComponent(encoded)}`;
    const caption = captionOlustur(icerik);

    const sonuc = await instagramGonderiYayinla({ igBusinessAccountId, accessToken, imageUrl, caption });

    return res.status(200).json({ success: true, media_id: sonuc.id, icerik });
  } catch (error) {
    console.error('cron-instagram-5dk error:', error);
    return res.status(500).json({ error: 'Paylaşım başarısız', message: error.message });
  }
}
