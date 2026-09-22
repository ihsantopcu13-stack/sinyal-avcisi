// ============================================================
// ANON-PROFILE API — Sinyal Avcısı Anonim Profil + Kurtarma
// ============================================================
// GET  /api/anon-profile?anon_id=xxx        → profil getir
// GET  /api/anon-profile?recovery=AVCI-xxx  → kurtarma kodu ile getir
// POST /api/anon-profile                    → profil oluştur/güncelle
//
// GÜVENLİK: service_role key KULLANILMIYOR.
// RLS politikalarıyla korunuyor. Kişisel veri YOK.
// ============================================================

const SUPABASE_URL  = 'https://scqczkyiyshmczzmlshl.supabase.co';
const SUPABASE_ANON = 'sb_publishable_RDVMnTcB60LjI8n6gBI1Pw__9YVVZHp';

// Güvenli random kurtarma kodu: AVCI-XXXX-XXXX (harf+rakam, karıştırma yok)
function kurtarmaKoduUret() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // O/0, I/1 karışmasın
  const blok = (n) => Array.from({length: n}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `AVCI-${blok(4)}-${blok(4)}`;
}

// Supabase REST isteği
async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      'apikey': SUPABASE_ANON,
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: profil getir ──────────────────────────────────────
  if (req.method === 'GET') {
    const { anon_id, recovery } = req.query || {};

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

    // action: 'create' | 'sync'
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
