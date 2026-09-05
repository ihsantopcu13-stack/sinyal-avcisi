// ============================================================
// CRON: Sinyal Avcısı — günlük Instagram gönderisi (YDS/YÖKDİL)
// ============================================================
// Vercel Cron tarafından her gün TR saatiyle 20:00'de tetiklenir (bkz.
// vercel.json "crons" — "0 17 * * *" = 17:00 UTC = 20:00 Türkiye, DST yok).
//
// GÜVENLİK: cron-streak-risk.mjs ile aynı desen — CRON_SECRET doğrulanmadan
// hiçbir paylaşım tetiklenmez.

import { sinyalIcerikUret } from './_instagram-content.mjs';
import { instagramGonderiYayinla } from './_instagram-publish.mjs';

const SITE_URL = 'https://www.sinyal-avcisi.com';

function captionOlustur(d) {
  const dogruHarf = ['A', 'B', 'C', 'D'][d.dogru_sik] || 'A';
  return `🎯 Bugünün Sinyal Sorusu\n\n${d.soru}\n\n${(d.siklar || []).join('\n')}\n\nDoğru cevap yorumlarda 👇 (ipucu: "${d.sinyal}" sinyaline dikkat)\n\n📇 Günün kelimesi: ${d.kelime} — ${d.kelime_anlam}\n\n💙 Platform tamamen ücretsiz — link bio'da.\n\n#YDS #YÖKDİL #SinyalAvcısı #İngilizce #YabancıDil #ÖSYM`;
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || '';
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('cron-instagram-sinyal: CRON_SECRET tanımlı değil');
    return res.status(500).json({ error: 'Sunucu yapılandırması eksik' });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Yetkisiz' });
  }

  const accessToken = process.env.IG_SINYAL_ACCESS_TOKEN;
  const igBusinessAccountId = process.env.IG_SINYAL_BUSINESS_ACCOUNT_ID;
  if (!accessToken || !igBusinessAccountId) {
    console.error('cron-instagram-sinyal: IG_SINYAL_ACCESS_TOKEN veya IG_SINYAL_BUSINESS_ACCOUNT_ID eksik');
    return res.status(500).json({ error: 'Instagram kimlik bilgileri eksik' });
  }

  try {
    const icerik = await sinyalIcerikUret();
    const encoded = Buffer.from(JSON.stringify(icerik)).toString('base64');
    const imageUrl = `${SITE_URL}/api/og-instagram?brand=sinyal&d=${encodeURIComponent(encoded)}`;
    const caption = captionOlustur(icerik);

    const sonuc = await instagramGonderiYayinla({ igBusinessAccountId, accessToken, imageUrl, caption });

    return res.status(200).json({ success: true, media_id: sonuc.id, icerik });
  } catch (error) {
    console.error('cron-instagram-sinyal error:', error);
    return res.status(500).json({ error: 'Paylaşım başarısız', message: error.message });
  }
}
