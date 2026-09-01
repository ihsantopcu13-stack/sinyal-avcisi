// ============================================================
// ADMIN BROADCAST API — Tüm abonelere manuel push bildirimi
// Sinyal Avcısı
// ============================================================
// "Yeni soru paketi eklendi" gibi duyurular için admin panelinden
// tetiklenir. Aynı yetkilendirme deseni: api/admin-users.mjs ile
// birebir aynı Supabase Auth doğrulaması + ADMIN_EMAILS allowlist.
//
// POST /api/admin-broadcast {title, body, url?}

import { fetchAllSubscriptions, sendPushToSubscriptions } from './_push.mjs';

const SUPABASE_URL = 'https://scqczkyiyshmczzmlshl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RDVMnTcB60LjI8n6gBI1Pw__9YVVZHp';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Oturum bulunamadı' });

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

  if (!serviceRoleKey || adminEmails.length === 0 || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_PUBLIC_KEY) {
    console.error('admin-broadcast: gerekli ortam değişkenleri eksik');
    return res.status(500).json({ error: 'Sunucu yapılandırması eksik' });
  }

  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Oturum geçersiz veya süresi dolmuş' });
    const user = await userRes.json();
    const email = (user?.email || '').toLowerCase();
    if (!email || !adminEmails.includes(email)) {
      return res.status(403).json({ error: 'Bu hesabın admin yetkisi yok' });
    }

    const { title, body, url } = req.body || {};
    if (!title || !body || typeof title !== 'string' || typeof body !== 'string') {
      return res.status(400).json({ error: 'Başlık ve mesaj gerekli' });
    }
    if (title.length > 100 || body.length > 300) {
      return res.status(400).json({ error: 'Başlık veya mesaj çok uzun' });
    }

    const subs = await fetchAllSubscriptions(serviceRoleKey);
    const result = await sendPushToSubscriptions(
      subs,
      { title, body, url: url || '/', tag: 'sinyal-avcisi-duyuru' },
      serviceRoleKey
    );

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('admin-broadcast error:', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
}
