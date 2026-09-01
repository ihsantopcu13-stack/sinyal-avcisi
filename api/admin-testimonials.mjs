// ============================================================
// ADMIN TESTIMONIALS API — Yorum onay/red işlemleri
// Sinyal Avcısı
// ============================================================
//
// Aynı yetkilendirme deseni: api/admin-users.mjs ile birebir aynı
// Supabase Auth doğrulaması + ADMIN_EMAILS allowlist kontrolü.
//
// Gerekli ortam değişkenleri (Vercel > Settings > Environment Variables):
//   SUPABASE_SERVICE_ROLE_KEY  — Supabase proje ayarlarındaki "service_role" secret key
//   ADMIN_EMAILS               — Admin yetkisi olan e-postalar, virgülle ayrılmış
//
// GET  /api/admin-testimonials            → onay bekleyen yorumları listeler
// POST /api/admin-testimonials {id,action} → action: 'approve' | 'reject'

const SUPABASE_URL = 'https://scqczkyiyshmczzmlshl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RDVMnTcB60LjI8n6gBI1Pw__9YVVZHp';

async function requireAdmin(req, res) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Oturum bulunamadı' });
    return null;
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

  if (!serviceRoleKey || adminEmails.length === 0) {
    console.error('admin-testimonials: SUPABASE_SERVICE_ROLE_KEY veya ADMIN_EMAILS tanımlı değil');
    res.status(500).json({ error: 'Sunucu yapılandırması eksik' });
    return null;
  }

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) {
    res.status(401).json({ error: 'Oturum geçersiz veya süresi dolmuş' });
    return null;
  }
  const user = await userRes.json();
  const email = (user?.email || '').toLowerCase();
  if (!email || !adminEmails.includes(email)) {
    res.status(403).json({ error: 'Bu hesabın admin yetkisi yok' });
    return null;
  }
  return serviceRoleKey;
}

export default async function handler(req, res) {
  const serviceRoleKey = await requireAdmin(req, res);
  if (!serviceRoleKey) return; // requireAdmin zaten uygun hata yanıtını gönderdi

  const svcHeaders = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

  if (req.method === 'GET') {
    try {
      const listRes = await fetch(
        `${SUPABASE_URL}/rest/v1/testimonials?select=id,isim,unvan,yorum,yildiz,created_at&onaylandi=eq.false&order=created_at.desc&limit=50`,
        { headers: svcHeaders }
      );
      if (!listRes.ok) {
        const err = await listRes.text();
        console.error('admin-testimonials: list error', err);
        return res.status(500).json({ error: 'Yorumlar alınamadı' });
      }
      const testimonials = await listRes.json();
      return res.status(200).json({ testimonials });
    } catch (error) {
      console.error('admin-testimonials GET error:', error);
      return res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { id, action } = req.body || {};
      if (!id || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Geçersiz istek' });
      }

      if (action === 'approve') {
        const upRes = await fetch(`${SUPABASE_URL}/rest/v1/testimonials?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { ...svcHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ onaylandi: true }),
        });
        if (!upRes.ok) {
          const err = await upRes.text();
          console.error('admin-testimonials: approve error', err);
          return res.status(500).json({ error: 'Onaylanamadı' });
        }
      } else {
        const delRes = await fetch(`${SUPABASE_URL}/rest/v1/testimonials?id=eq.${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: svcHeaders,
        });
        if (!delRes.ok) {
          const err = await delRes.text();
          console.error('admin-testimonials: reject error', err);
          return res.status(500).json({ error: 'Reddedilemedi' });
        }
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('admin-testimonials POST error:', error);
      return res.status(500).json({ error: 'Sunucu hatası' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
