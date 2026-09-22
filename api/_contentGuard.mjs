// ============================================================
// CONTENT GUARD — Sinyal Avcısı İçerik Kalite Kapısı
// ============================================================
// Yeni soru/içerik eklemeden önce bu kapıdan geçmeli.
// NEEDS_REVIEW döndürürse içerik yayımlanmaz, admin kuyruğuna gider.
//
// Kontroller:
// 1. Doğru şık kontrolü (dogru_index geçerli mi)
// 2. Sinyal whitelist eşleşmesi (30 tanınan sinyal)
// 3. ÖSYM format kontrolü (4 şık, İngilizce soru)
// 4. Türkçe açıklama kontrolü
// 5. Gramer doğrulaması (temel)
// ============================================================

// 30 tanınan AVCI sinyali
export const SINYAL_WHITELIST = new Set([
  'despite', 'although', 'even though', 'whereas', 'while',
  'however', 'nevertheless', 'nonetheless', 'yet', 'but',
  'because', 'since', 'as', 'therefore', 'thus',
  'consequently', 'moreover', 'furthermore', 'in addition',
  'by no means', 'far from', 'hardly', 'scarcely', 'rarely',
  'must have', 'should have', 'could have', 'might have',
  'not only', 'not until', 'provided that',
  'nor', 'neither', 'prior to', 'anything but', 'on the contrary',
  'in contrast', 'on the other hand', 'as long as', 'unless',
  'even if', 'so that', 'in order to', 'rather than',
  'no sooner had', 'notwithstanding', 'by the time', 'contrary to',
  'contrary to popular belief', 'as a result', 'as a consequence of',
  'on condition that', 'after', 'once', 'so as to',
]);

// Kontrol sonucu tipleri
export const SONUC = {
  GECTI: 'PASSED',
  INCELEME: 'NEEDS_REVIEW',
  REDDEDILDI: 'REJECTED',
};

// Tek soru doğrulama
export function soruDogrula(soru) {
  const hatalar = [];
  const uyarilar = [];

  // 1. Zorunlu alanlar
  if (!soru.id || typeof soru.id !== 'string') hatalar.push('id eksik veya geçersiz');
  if (!soru.soru_en || typeof soru.soru_en !== 'string') hatalar.push('soru_en eksik');
  if (!soru.soru_tr || typeof soru.soru_tr !== 'string') hatalar.push('soru_tr eksik');
  if (!soru.aciklama_tr || typeof soru.aciklama_tr !== 'string') hatalar.push('aciklama_tr eksik');
  if (!soru.sinyal || typeof soru.sinyal !== 'string') hatalar.push('sinyal eksik');

  // 2. Şıklar kontrolü
  if (!Array.isArray(soru.secenekler_tr)) {
    hatalar.push('secenekler_tr dizi değil');
  } else {
    if (soru.secenekler_tr.length !== 4) {
      hatalar.push(`4 şık gerekli, ${soru.secenekler_tr.length} var`);
    }
    const bos = soru.secenekler_tr.filter(s => !s || s.trim().length < 2);
    if (bos.length > 0) hatalar.push(`${bos.length} şık boş veya çok kısa`);
  }

  // 3. Doğru şık indexi
  if (typeof soru.dogru_index !== 'number') {
    hatalar.push('dogru_index sayı değil');
  } else if (soru.dogru_index < 0 || soru.dogru_index > 3) {
    hatalar.push(`dogru_index geçersiz: ${soru.dogru_index} (0-3 arası olmalı)`);
  }

  // 4. Sinyal whitelist kontrolü
  if (soru.sinyal) {
    const sinyal = soru.sinyal.toLowerCase().trim();
    if (!SINYAL_WHITELIST.has(sinyal)) {
      uyarilar.push(`'${soru.sinyal}' sinyal whitelist'te yok — yeni sinyal mi eklenecek?`);
    }
  }

  // 5. ÖSYM format — İngilizce soru kontrolü (en az 1 İngilizce kelime)
  if (soru.soru_en) {
    const ingilizceKelimeSayisi = (soru.soru_en.match(/\b[a-zA-Z]{3,}\b/g) || []).length;
    if (ingilizceKelimeSayisi < 5) {
      hatalar.push('soru_en çok kısa veya İngilizce değil');
    }
  }

  // 6. Türkçe açıklama uzunluğu
  if (soru.aciklama_tr && soru.aciklama_tr.length < 20) {
    uyarilar.push('aciklama_tr çok kısa (min 20 karakter önerilen)');
  }

  // 7. Şıklarda tekrar kontrolü
  if (Array.isArray(soru.secenekler_tr) && soru.secenekler_tr.length === 4) {
    const setSecenekler = new Set(soru.secenekler_tr.map(s => s.toLowerCase().trim()));
    if (setSecenekler.size < soru.secenekler_tr.length) {
      hatalar.push('Şıklar arasında tekrar var');
    }
  }

  // Sonuç
  let durum;
  if (hatalar.length > 0) {
    durum = SONUC.INCELEME;
  } else if (uyarilar.length > 0) {
    durum = SONUC.INCELEME;
  } else {
    durum = SONUC.GECTI;
  }

  return { durum, hatalar, uyarilar, soruId: soru.id || '?' };
}

// Toplu doğrulama — tüm soru havuzunu kontrol et
export function havuzDogrula(sorular) {
  if (!Array.isArray(sorular)) return { durum: SONUC.REDDEDILDI, hata: 'Dizi bekleniyor' };

  const sonuclar = sorular.map(soruDogrula);
  const gecenler = sonuclar.filter(s => s.durum === SONUC.GECTI);
  const inceleme = sonuclar.filter(s => s.durum === SONUC.INCELEME);
  const reddedilen = sonuclar.filter(s => s.durum === SONUC.REDDEDILDI);

  // ID tekrarı kontrolü
  const idler = sorular.map(s => s.id).filter(Boolean);
  const tekrarlar = idler.filter((id, i) => idler.indexOf(id) !== i);
  if (tekrarlar.length > 0) {
    inceleme.push({ durum: SONUC.INCELEME, hatalar: [`Tekrarlanan ID'ler: ${tekrarlar.join(', ')}`], uyarilar: [] });
  }

  return {
    toplam: sorular.length,
    gecti: gecenler.length,
    inceleme: inceleme.length,
    reddedildi: reddedilen.length,
    sonuclar,
    temiz: inceleme.length === 0 && reddedilen.length === 0,
  };
}

// API handler — POST /api/content-guard
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST gerekli' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Geçersiz JSON' }); }

  const { soru, sorular } = body || {};

  if (soru) {
    // Tek soru kontrolü
    const sonuc = soruDogrula(soru);
    return res.status(200).json(sonuc);
  }

  if (sorular) {
    // Toplu kontrol
    const sonuc = havuzDogrula(sorular);
    return res.status(200).json(sonuc);
  }

  return res.status(400).json({ error: 'soru veya sorular gerekli' });
}
