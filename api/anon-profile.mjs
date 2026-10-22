// ============================================================
// ANON-PROFILE API — Sinyal Avcısı Anonim Profil + Kurtarma
// ============================================================
// GET  /api/anon-profile?anon_id=xxx        → profil getir
// GET  /api/anon-profile?recovery=AVCI-xxx  → kurtarma kodu ile getir
// POST /api/anon-profile                    → profil oluştur/güncelle
// POST {anon_id, action:'davet'}             → arkadaş davet kodu
// GET  /api/anon-profile?davet=KOD1,KOD2     → arkadaşların serisi (sadece seri)
//
// GÜVENLİK: Tabloya YALNIZCA sunucu fonksiyonları erişir, SUPABASE_SERVICE_ROLE_KEY
// ile (tarayıcıya asla gönderilmez). anon_profiles'ta anon/authenticated rollerinin
// hiçbir yetkisi yok (supabase/anon-profiles-rls.sql). Kişisel veri YOK.
// ============================================================

import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';

// Y1 — In-memory rate limiting: aynı IP'den 60 istek/dakika
const _rl = new Map();
function rateLimitCheck(ip) {
  const now = Date.now();
  const window = 60_000;
  const limit = 60;
  let entry = _rl.get(ip);
  if (!entry || now - entry.start > window) {
    entry = { start: now, count: 0 };
    _rl.set(ip, entry);
  }
  entry.count++;
  // Harita temizliği: 1000'den fazla girdi varsa süresi dolmuşları sil
  if (_rl.size > 1000) {
    for (const [k, v] of _rl) { if (now - v.start > window) _rl.delete(k); }
  }
  return entry.count > limit;
}

const SUPABASE_URL  = 'https://scqczkyiyshmczzmlshl.supabase.co';
// Anahtar tanımlı değilse (örn. Preview ortamı) eski herkese açık anahtara düşer —
// RLS sıkılaştırıldıktan sonra bu yedek ÇALIŞMAZ; hangisinin kullanıldığı log'da görünür.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_ANON_KEY || 'sb_publishable_RDVMnTcB60LjI8n6gBI1Pw__9YVVZHp';
console.log('[anon-profile] Supabase anahtarı:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon (YEDEK)');

// K4 — Kriptografik random kurtarma kodu: AVCI-XXXX-XXXX
function kurtarmaKoduUret() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // O/0, I/1 karışmasın
  const bytes = randomBytes(8);
  const blok = (offset, n) => Array.from({length: n}, (_,i) => chars[bytes[offset+i] % chars.length]).join('');
  return `AVCI-${blok(0,4)}-${blok(4,4)}`;
}

// ── Arkadaş daveti ─────────────────────────────────────────
// Davet kodu = anon_id'nin (UUID, 16 bayt) sunucu anahtarıyla AES-256
// tek blok şifresi, base64url 22 karakter. Kod anon_id'yi açık etmez
// (anon_id ile tüm profil ve kurtarma kodu okunabildiği için açık
// paylaşılamaz) ve ek tablo/kolon gerektirmez: sunucu kodu çözüp profili
// bulur, dışarıya SADECE seri sayısı ve son çalışma gününü verir.
// Anahtar service_role anahtarından türetilir; o yoksa davet kapalıdır
// (herkese açık yedek anahtarla kod üretmek güvenli olmaz).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function davetAnahtari() {
  const gizli = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return gizli ? createHash('sha256').update('sinyal-davet-v1:' + gizli).digest() : null;
}
export function davetKoduUret(anonId, anahtar) {
  if (!anahtar || !UUID_RE.test(anonId)) return null;
  const c = createCipheriv('aes-256-ecb', anahtar, null);
  c.setAutoPadding(false);
  return Buffer.concat([c.update(Buffer.from(anonId.replace(/-/g, ''), 'hex')), c.final()]).toString('base64url');
}
export function davetKoduCoz(kod, anahtar) {
  if (!anahtar || typeof kod !== 'string' || !/^[A-Za-z0-9_-]{22}$/.test(kod)) return null;
  const b = Buffer.from(kod, 'base64url');
  if (b.length !== 16) return null;
  const d = createDecipheriv('aes-256-ecb', anahtar, null);
  d.setAutoPadding(false);
  const h = Buffer.concat([d.update(b), d.final()]).toString('hex');
  const id = `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  // Tarayıcının crypto.randomUUID'i v4 üretir; v4 biçiminde olmayan çözüm
  // uydurma ya da başka anahtarla üretilmiş koddur, sorguya hiç gitmez.
  return UUID_V4_RE.test(id) ? id : null;
}
const DAVET_EN_FAZLA = 5;

// Supabase REST isteği
async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': opts.prefer || 'return=representation',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://sinyal-avcisi.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Y1 — Rate limit kontrolü
  const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (rateLimitCheck(clientIp)) {
    return res.status(429).json({ error: 'Çok fazla istek, bir dakika bekleyin.' });
  }

  // ── GET: profil getir ──────────────────────────────────────
  if (req.method === 'GET') {
    const { anon_id, recovery, davet } = req.query || {};

    // Arkadaşların serisi: koddan anon_id çöz, sadece seri alanlarını döndür
    if (davet) {
      const anahtar = davetAnahtari();
      if (!anahtar) return res.status(503).json({ error: 'Davet kapalı' });
      const kodlar = [...new Set(String(davet).split(',').map(k => k.trim()).filter(Boolean))].slice(0, DAVET_EN_FAZLA);
      const eslesme = kodlar.map(kod => ({ kod, id: davetKoduCoz(kod, anahtar) }));
      const idler = eslesme.filter(e => e.id).map(e => e.id);
      let satirlar = [];
      if (idler.length) {
        const r = await sb(`/anon_profiles?select=anon_id,streak,streak_last&anon_id=in.(${idler.map(encodeURIComponent).join(',')})`, { method: 'GET' });
        if (!r.ok || !Array.isArray(r.data)) return res.status(500).json({ error: 'Okunamadı' });
        satirlar = r.data;
      }
      const arkadaslar = eslesme.map(({ kod, id }) => {
        const p = id && satirlar.find(x => x.anon_id === id);
        return p ? { kod, found: true, streak: p.streak || 0, streak_last: p.streak_last || null } : { kod, found: false };
      });
      return res.status(200).json({ arkadaslar });
    }

    if (!anon_id && !recovery) {
      return res.status(400).json({ error: 'anon_id veya recovery gerekli' });
    }

    let query;
    if (recovery) {
      // Kurtarma kodu ile getir — büyük harf normalize
      const kod = String(recovery).toUpperCase().trim();
      query = `/anon_profiles?recovery_code=eq.${encodeURIComponent(kod)}&limit=1`;
    } else {
      query = `/anon_profiles?anon_id=eq.${encodeURIComponent(anon_id)}&limit=1`;
    }

    const { ok, data } = await sb(query, { method: 'GET', prefer: 'return=representation' });

    if (!ok || !Array.isArray(data) || data.length === 0) {
      return res.status(404).json({ found: false });
    }

    return res.status(200).json({ found: true, profile: data[0] });
  }

  // ── POST: oluştur veya güncelle ───────────────────────────
  if (req.method === 'POST') {
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch { return res.status(400).json({ error: 'Geçersiz JSON' }); }

    const { anon_id, action, payload } = body || {};

    if (!anon_id || typeof anon_id !== 'string' || anon_id.length > 64) {
      return res.status(400).json({ error: 'Geçersiz anon_id' });
    }

    // action: 'create' | 'sync' | 'davet'
    if (action === 'davet') {
      const anahtar = davetAnahtari();
      if (!anahtar) return res.status(503).json({ error: 'Davet kapalı' });
      const kod = davetKoduUret(anon_id, anahtar);
      if (!kod) return res.status(400).json({ error: 'Davet kodu üretilemedi' });
      const chk = await sb(`/anon_profiles?select=anon_id&anon_id=eq.${encodeURIComponent(anon_id)}&limit=1`, { method: 'GET' });
      if (!chk.ok || !Array.isArray(chk.data) || chk.data.length === 0) return res.status(404).json({ error: 'Profil yok' });
      return res.status(200).json({ kod });
    }

    if (action === 'create') {
      // Önce var mı kontrol et
      const chk = await sb(`/anon_profiles?anon_id=eq.${encodeURIComponent(anon_id)}&limit=1`, {
        method: 'GET', prefer: 'return=representation'
      });
      if (chk.ok && Array.isArray(chk.data) && chk.data.length > 0) {
        // Zaten var — döndür
        return res.status(200).json({ created: false, profile: chk.data[0] });
      }

      // Yeni profil oluştur
      const recovery_code = kurtarmaKoduUret();
      const insert = await sb('/anon_profiles', {
        method: 'POST',
        prefer: 'return=representation',
        body: JSON.stringify({ anon_id, recovery_code }),
      });

      if (!insert.ok) {
        // Race condition: aynı anda iki istek geldiyse retry
        const retry = await sb(`/anon_profiles?anon_id=eq.${encodeURIComponent(anon_id)}&limit=1`, {
          method: 'GET', prefer: 'return=representation'
        });
        if (retry.ok && Array.isArray(retry.data) && retry.data.length > 0) {
          return res.status(200).json({ created: false, profile: retry.data[0] });
        }
        return res.status(500).json({ error: 'Profil oluşturulamadı' });
      }

      const profile = Array.isArray(insert.data) ? insert.data[0] : insert.data;
      return res.status(201).json({ created: true, profile });
    }

    if (action === 'sync') {
      // XP, streak, hata defteri vs. güncelle
      const { xp, streak, streak_last, hatalar, cevap_gecmisi, sinav_tarih } = payload || {};
      const patch = {};
      if (typeof xp === 'number')       patch.xp = xp;
      if (typeof streak === 'number')   patch.streak = streak;
      if (streak_last)                  patch.streak_last = streak_last;
      if (Array.isArray(hatalar))       patch.hatalar = hatalar.slice(0, 200);
      if (Array.isArray(cevap_gecmisi)) patch.cevap_gecmisi = cevap_gecmisi.slice(0, 500);
      if (sinav_tarih)                  patch.sinav_tarih = String(sinav_tarih).slice(0, 20);

      if (Object.keys(patch).length === 0) {
        return res.status(400).json({ error: 'Güncellenecek alan yok' });
      }

      const update = await sb(
        `/anon_profiles?anon_id=eq.${encodeURIComponent(anon_id)}`,
        { method: 'PATCH', prefer: 'return=minimal', body: JSON.stringify(patch) }
      );

      if (!update.ok) {
        return res.status(500).json({ error: 'Güncelleme başarısız' });
      }

      return res.status(200).json({ synced: true });
    }

    return res.status(400).json({ error: 'Geçersiz action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
