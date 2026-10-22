// ============================================================
// CRON: Streak Kırılma Riski Bildirimi
// Sinyal Avcısı
// ============================================================
// Vercel Cron tarafından günlük tetiklenir (bkz. vercel.json "crons").
// Bugün henüz çalışmamış ama aktif bir serisi olan kullanıcılara
// "serini kaybetme" push bildirimi gönderir.
//
// ?tur=sabah ile (06:00 UTC = Türkiye 09:00) aynı fonksiyon "sabah listen
// hazır" bildirimini gönderir: son 7 günde çalışmış ve bildirime izin vermiş
// kullanıcılara. Listenin kendisi kişiye özeldir ve tarayıcıda (index.html →
// sabahListesiRender) cevap geçmişinden kurulur; bildirim sadece öğrenciyi
// panele geri çağırır. Ayrı dosya değil: Vercel Hobby 12 fonksiyon sınırında.
//
// Pazar günleri 18:00 UTC (Türkiye 21:00) çalışmasında, ya da ?tur=haftalik
// ile, "haftalık raporun hazır" bildirimi gider: son 7 günde çalışmış ve
// bildirime izin vermiş kullanıcılara. Kişinin sayıları (soru, doğruluk,
// tahmini puan) sunucuda yok; sw.js bildirimi gösterirken cihazdaki özetten
// yazar. Serisi risk altında olana ayrıca seri bildirimi gitmez: aynı
// bildirime "serin kopmasın" cümlesi eklenir (payload.seri). Yeni cron
// satırı yok: mevcut 18:00 cron'u Pazar günü bu dala girer.
//
// GÜVENLİK: Vercel, projede bir CRON_SECRET ortam değişkeni tanımlıysa
// cron isteklerine otomatik olarak `Authorization: Bearer $CRON_SECRET`
// header'ı ekler. Bu header doğrulanmadan hiçbir gönderim yapılmaz —
// aksi halde bu URL'i bilen herkes toplu bildirim tetikleyebilirdi.

import { fetchSubscriptionsForUsers, sendPushToSubscriptions } from './_push.mjs';

const SUPABASE_URL = 'https://scqczkyiyshmczzmlshl.supabase.co';
const SABAH_AKTIF_GUN = 7;

export const SABAH_PAYLOAD = {
  title: 'Sabah listen hazır',
  body: 'Bugün sana özel 4 adım seni bekliyor. 10 dakikada bitir.',
  url: '/#dashboard',
  tag: 'sinyal-avcisi-sabah-listesi',
};

export const HAFTALIK_PAYLOAD = {
  title: 'Haftalık raporun hazır',
  body: 'Bu haftaki soru sayın, doğruluk oranın ve tahmini puanın hazır. 1 dakikada bak.',
  url: '/#haftalik-rapor',
  tag: 'sinyal-avcisi-haftalik',
  tur: 'haftalik',
};

// Pazar mı? (UTC; cron 18:00 UTC'de çalışır, Türkiye'de de aynı gün)
export function haftalikGunuMu(simdi = new Date()) {
  return simdi.getUTCDay() === 0;
}

// Abonelikleri seri riskine göre iki gruba ayırır: riskli olanların
// bildirimine seri sayısı eklenir. Dönen her grup tek bir gönderimdir.
export function haftalikGruplar(subs, seriByUser) {
  const gruplar = {};
  for (const sub of subs) {
    const seri = seriByUser[sub.user_id] || 0;
    (gruplar[seri] ||= []).push(sub);
  }
  return Object.entries(gruplar).map(([seri, liste]) => ({
    payload: Number(seri) > 0 ? { ...HAFTALIK_PAYLOAD, seri: Number(seri) } : HAFTALIK_PAYLOAD,
    subs: liste,
  }));
}

async function haftalikGonder(serviceRoleKey, res) {
  const sinir = new Date(Date.now() - SABAH_AKTIF_GUN * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const bugun = new Date().toISOString().split('T')[0];
  const actRes = await fetch(
    `${SUPABASE_URL}/rest/v1/user_activity?select=user_id,current_streak,last_active_date&last_active_date=gte.${sinir}`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
  );
  if (!actRes.ok) {
    const err = await actRes.text();
    console.error('cron-haftalik: activity fetch error', err);
    return res.status(500).json({ error: 'Aktivite verisi alınamadı' });
  }
  const aktifler = await actRes.json();
  if (aktifler.length === 0) {
    return res.status(200).json({ success: true, tur: 'haftalik', aktif: 0, sent: 0 });
  }
  // Bugün henüz çalışmamış ve serisi olanlar: seri riski
  const seriByUser = Object.fromEntries(
    aktifler.filter(a => a.current_streak > 0 && a.last_active_date < bugun).map(a => [a.user_id, a.current_streak])
  );
  const subs = await fetchSubscriptionsForUsers(serviceRoleKey, aktifler.map(a => a.user_id));
  const toplam = { sent: 0, failed: 0, cleaned: 0, total: 0 };
  for (const g of haftalikGruplar(subs, seriByUser)) {
    const r = await sendPushToSubscriptions(g.subs, g.payload, serviceRoleKey);
    toplam.sent += r.sent; toplam.failed += r.failed; toplam.cleaned += r.cleaned; toplam.total += r.total;
  }
  return res.status(200).json({ success: true, tur: 'haftalik', aktif: aktifler.length, ...toplam });
}

function istekTuru(req) {
  if (req.query && req.query.tur) return String(req.query.tur);
  try { return new URL(req.url, 'http://x').searchParams.get('tur') || ''; } catch (e) { return ''; }
}

async function sabahListesiGonder(serviceRoleKey, res) {
  const sinir = new Date(Date.now() - SABAH_AKTIF_GUN * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  // Son 7 günde en az bir kez çalışmış kullanıcılar
  const actRes = await fetch(
    `${SUPABASE_URL}/rest/v1/user_activity?select=user_id&last_active_date=gte.${sinir}`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
  );
  if (!actRes.ok) {
    const err = await actRes.text();
    console.error('cron-sabah-listesi: activity fetch error', err);
    return res.status(500).json({ error: 'Aktivite verisi alınamadı' });
  }
  const aktifler = await actRes.json();
  if (aktifler.length === 0) {
    return res.status(200).json({ success: true, tur: 'sabah', aktif: 0, sent: 0 });
  }
  const subs = await fetchSubscriptionsForUsers(serviceRoleKey, aktifler.map(a => a.user_id));
  const sonuc = await sendPushToSubscriptions(subs, SABAH_PAYLOAD, serviceRoleKey);
  return res.status(200).json({ success: true, tur: 'sabah', aktif: aktifler.length, ...sonuc });
}

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
    if (istekTuru(req) === 'sabah') return await sabahListesiGonder(serviceRoleKey, res);
    if (istekTuru(req) === 'haftalik' || haftalikGunuMu()) return await haftalikGonder(serviceRoleKey, res);

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
