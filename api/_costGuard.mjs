// ============================================================
// COST GUARD — Sinyal Avcısı Günlük KLOD Limiti
// ============================================================
// Anonim kullanıcılar: günde 30 KLOD isteği (ücretsiz)
// Kayıtlı kullanıcılar: günde 60 KLOD isteği
// Limit aşılırsa 429 döner, kullanıcıya Türkçe mesaj gösterilir.
//
// Supabase anon_profiles tablosuna daily_klod_count/daily_klod_date
// kolonları gerektirir (migration: cost_guard.sql).
//
// GÜVENLİK: IP bazlı in-memory fallback da var — Supabase erişilmezse
// devreye girer (best-effort, cold start'ta sıfırlanır).
// ============================================================

const SUPABASE_URL  = 'https://scqczkyiyshmczzmlshl.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_RDVMnTcB60LjI8n6gBI1Pw__9YVVZHp';

// Limitler
const LIMIT_ANON = 30;      // anonim kullanıcı günlük limit
const LIMIT_AUTH = 60;      // kayıtlı kullanıcı günlük limit

// In-memory fallback (Supabase erişilmezse)
const _fallback = new Map();

function bugun() {
  return new Date().toISOString().slice(0, 10);
}

async function sbFetch(path, opts = {}) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
      ...opts,
      headers: {
        'apikey': SUPABASE_ANON,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...(opts.headers || {}),
      },
    });
    const text = await res.text();
    return { ok: res.ok, data: JSON.parse(text) };
  } catch (e) {
    return { ok: false, data: null, err: e.message };
  }
}

// anon_id'den profil bul, sayacı artır, limit kontrolü yap
async function checkAndIncrement(anonId, isAuth) {
  const gun = bugun();
  const limit = isAuth ? LIMIT_AUTH : LIMIT_ANON;

  if (!anonId) {
    // anon_id yoksa in-memory fallback
    return fallbackCheck('unknown', limit);
  }

  try {
    // Profili getir
    const get = await sbFetch(
      `/anon_profiles?anon_id=eq.${encodeURIComponent(anonId)}&select=daily_klod_count,daily_klod_date&limit=1`
    );

    if (!get.ok || !Array.isArray(get.data) || get.data.length === 0) {
      // Profil bulunamadı — in-memory fallback
      return fallbackCheck(anonId, limit);
    }

    const profil = get.data[0];
    const eskiGun = profil.daily_klod_date;
    const eskiCount = profil.daily_klod_count || 0;

    // Yeni gün mü?
    const count = (eskiGun === gun) ? eskiCount : 0;

    if (count >= limit) {
      return { allowed: false, count, limit, remaining: 0 };
    }

    // Sayacı artır (PATCH)
    const patch = {
      daily_klod_count: count + 1,
      daily_klod_date: gun,
    };
    await sbFetch(
      `/anon_profiles?anon_id=eq.${encodeURIComponent(anonId)}`,
      { method: 'PATCH', headers: { 'Prefer': 'return=minimal' }, body: JSON.stringify(patch) }
    );

    return { allowed: true, count: count + 1, limit, remaining: limit - count - 1 };
  } catch (_) {
    return fallbackCheck(anonId, limit);
  }
}

// In-memory fallback — cold start'ta sıfırlanır, birden fazla instance'ta paylaşılmaz
function fallbackCheck(key, limit) {
  const gun = bugun();
  const k = `cg:${key}:${gun}`;
  const count = (_fallback.get(k) || 0) + 1;
  _fallback.set(k, count);

  // Map temizliği
  if (_fallback.size > 2000) {
    for (const [fk] of _fallback) {
      if (!fk.endsWith(gun)) _fallback.delete(fk);
    }
  }

  return {
    allowed: count <= limit,
    count,
    limit,
    remaining: Math.max(0, limit - count),
    fallback: true,
  };
}

// Request'ten anon_id çıkar (header veya body)
export function getAnonId(req) {
  try {
    const h = req.headers['x-anon-id'];
    if (h && typeof h === 'string' && h.length < 64) return h;
    // body'den (POST)
    const b = req.body;
    if (b && b.anon_id && typeof b.anon_id === 'string') return b.anon_id;
  } catch (_) {}
  return null;
}

// Ana export — klod.mjs bunu çağırır
export async function costGuard(req, isAuth = false) {
  const anonId = getAnonId(req);
  const result = await checkAndIncrement(anonId, isAuth);

  if (!result.allowed) {
    return {
      blocked: true,
      status: 429,
      json: {
        error: `Günlük KLOD limitine ulaştın (${result.limit} soru). Yarın devam edebilirsin! 🌙`,
        limit: result.limit,
        remaining: 0,
        resetAt: 'gece yarısı',
      },
    };
  }

  return {
    blocked: false,
    remaining: result.remaining,
    count: result.count,
  };
}
