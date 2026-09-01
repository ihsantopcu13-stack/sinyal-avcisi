// ============================================================
// ADMIN USERS API — Supabase Auth ile sunucu taraflı yetki kontrolü
// Sinyal Avcısı
// ============================================================
//
// Gerekli ortam değişkenleri (Vercel > Settings > Environment Variables):
//   SUPABASE_SERVICE_ROLE_KEY  — Supabase proje ayarlarındaki "service_role" secret key
//   ADMIN_EMAILS               — Admin yetkisi olan e-postalar, virgülle ayrılmış
//                                 örn: "admin@ornek.com,ikinci@ornek.com"
//
// NOT: SUPABASE_URL ve anon key zaten public (client tarafında da açık),
// bu yüzden burada sabit olarak tutuluyor — güvenlik anon/publishable
// key'in gizliliğine değil, aşağıdaki service-role doğrulamasına dayanıyor.

const SUPABASE_URL = 'https://scqczkyiyshmczzmlshl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RDVMnTcB60LjI8n6gBI1Pw__9YVVZHp';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Oturum bulunamadı' });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (!serviceRoleKey || adminEmails.length === 0) {
    console.error('admin-users: SUPABASE_SERVICE_ROLE_KEY veya ADMIN_EMAILS tanımlı değil');
    return res.status(500).json({ error: 'Sunucu yapılandırması eksik' });
  }

  try {
    // 1. Token'ı Supabase Auth üzerinden doğrula — sahte/uydurma token'lar burada elenir
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userRes.ok) {
      return res.status(401).json({ error: 'Oturum geçersiz veya süresi dolmuş' });
    }

    const user = await userRes.json();
    const email = (user?.email || '').toLowerCase();

    // 2. Doğrulanmış kullanıcı admin listesinde mi?
    if (!email || !adminEmails.includes(email)) {
      return res.status(403).json({ error: 'Bu hesabın admin yetkisi yok' });
    }

    // 3. Yetki onaylandı — kullanıcı listesini service role key ile çek (RLS bypass, sadece burada)
    const listRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=id,email,ad,created_at&order=created_at.desc&limit=100`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!listRes.ok) {
      const err = await listRes.text();
      console.error('admin-users: profiles fetch error', err);
      return res.status(500).json({ error: 'Kullanıcı listesi alınamadı' });
    }

    const users = await listRes.json();
    return res.status(200).json({ users });

  } catch (error) {
    console.error('admin-users handler error:', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
}
