// ============================================================
// CRON: Streak Kırılma Riski Bildirimi
// Sinyal Avcısı
// ============================================================
// Vercel Cron tarafından günlük tetiklenir (bkz. vercel.json "crons").
// Bugün henüz çalışmamış ama aktif bir serisi olan kullanıcılara
// "serini kaybetme" push bildirimi gönderir.
//
// GÜVENLİK: Vercel, projede bir CRON_SECRET ortam değişkeni tanımlıysa
// cron isteklerine otomatik olarak `Authorization: Bearer $CRON_SECRET`
// header'ı ekler. Bu header doğrulanmadan hiçbir gönderim yapılmaz —
// aksi halde bu URL'i bilen herkes toplu bildirim tetikleyebilirdi.

import { fetchSubscriptionsForUsers, sendPushToSubscriptions } from './_push.mjs';

const SUPABASE_URL = 'https://scqczkyiyshmczzmlshl.supabase.co';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || '';
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('cron-streak-risk: CRON_SECRET tanımlı değil');
    return res.status(500).json({ error: 'Sunucu yapılandırması eksik' });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Yetkisiz' });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_PUBLIC_KEY) {
    console.error('cron-streak-risk: gerekli ortam değişkenleri eksik');
    return res.status(500).json({ error: 'Sunucu yapılandırması eksik' });
  }

  try {
    const bugun = new Date().toISOString().split('T')[0];

    // Aktif serisi olup bugün henüz çalışmamış kullanıcılar
    const actRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_activity?select=user_id,current_streak,last_active_date&current_streak=gt.0&last_active_date=lt.${bugun}`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
    );
    if (!actRes.ok) {
      const err = await actRes.text();
      console.error('cron-streak-risk: activity fetch error', err);
      return res.status(500).json({ error: 'Aktivite verisi alınamadı' });
    }
    const atRisk = await actRes.json();

    if (atRisk.length === 0) {
      return res.status(200).json({ success: true, atRisk: 0, sent: 0 });
    }

    const userIds = atRisk.map(a => a.user_id);
    const subs = await fetchSubscriptionsForUsers(serviceRoleKey, userIds);

    // Her kullanıcının kendi seri sayısını gösterebilmek için abonelikleri
    // streak'e göre grupla (çoğu kullanıcı için tek satır olacak)
    const streakByUser = Object.fromEntries(atRisk.map(a => [a.user_id, a.current_streak]));
    const gruplu = {};
    for (const sub of subs) {
      const streak = streakByUser[sub.user_id] || 0;
      gruplu[streak] = gruplu[streak] || [];
      gruplu[streak].push(sub);
    }

    let toplamSonuc = { sent: 0, failed: 0, cleaned: 0, total: 0 };
    for (const [streak, grupSubs] of Object.entries(gruplu)) {
      const payload = {
        title: '🔥 Serini kaybetme!',
        body: `${streak} günlük serin risk altında — bugün 1 soru çözerek koru.`,
        url: '/#dashboard',
        tag: 'sinyal-avcisi-streak-risk',
      };
      const r = await sendPushToSubscriptions(grupSubs, payload, serviceRoleKey);
      toplamSonuc.sent += r.sent;
      toplamSonuc.failed += r.failed;
      toplamSonuc.cleaned += r.cleaned;
      toplamSonuc.total += r.total;
    }

    return res.status(200).json({ success: true, atRisk: atRisk.length, ...toplamSonuc });
  } catch (error) {
    console.error('cron-streak-risk error:', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
}
