// ============================================================
// SİNYAL LAB ŞIK KURALLARI — 4 → 5 şık geçişi (Aşama 2)
// ============================================================
// YDS/YÖKDİL 5 şıklıdır (A-E). Havuzdaki 4 şıklı sorulara 5. şık
// (E) partiler halinde eklenir. Kural: yeni şık HER ZAMAN dizinin
// SONUNA eklenir ve dogru_index DEĞİŞMEZ — böylece mevcut doğru
// cevaplar, question_id bağlantıları ve answer_history kayıtları
// (şık METNİNİ saklar) bozulmaz.
//
// Bu modül SAF (side-effect'siz): scripts/e-sikki-ekle.mjs (CLI),
// api/_contentGuard.mjs ve tests/sot-schema.test.mjs aynı kuralı
// buradan kullanır — tek yerde, iki kopyası yok.
// ============================================================

// Kopya kontrolü için şık metnini normalize et: baş/son boşluk,
// çoklu boşluk, büyük/küçük harf (Türkçe) ve sondaki noktalama
// farkı "farklı şık" sayılmaz ("Karar geçerli." ≈ "karar geçerli").
export function sikNormalize(metin) {
  return String(metin ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?…]+$/u, "")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

// 5. şık (E) için hata metni döndürür; geçerliyse null.
// mevcutlar: sorunun İLK 4 şıkkı (E hariç).
export function besinciSikHatasi(mevcutlar, yeni) {
  if (typeof yeni !== "string" || sikNormalize(yeni).length === 0) {
    return "5. şık (E) boş olamaz";
  }
  const n = sikNormalize(yeni);
  const kopyaIdx = (mevcutlar || []).findIndex((m) => sikNormalize(m) === n);
  if (kopyaIdx !== -1) {
    return `5. şık (E), ${String.fromCharCode(65 + kopyaIdx)} şıkkının kopyası olamaz`;
  }
  return null;
}

// Bir soru kaydının 5. şıkkını (varsa) doğrular; hata metni ya da null.
export function soruBesinciSikHatasi(soru) {
  const s = soru?.secenekler_tr;
  if (!Array.isArray(s) || s.length !== 5) return null;
  return besinciSikHatasi(s.slice(0, 4), s[4]);
}

// Bir partiyi uygular. ekler: [{ id, e }]. Girdi dizisini DEĞİŞTİRMEZ,
// yeni bir dizi döndürür. Partide TEK bir hata bile varsa hiçbir şey
// uygulanmaz (atomik) ve tüm hatalar birlikte fırlatılır.
export function eSikkiEkle(sorular, ekler) {
  if (!Array.isArray(ekler) || ekler.length === 0) {
    throw new Error("Parti boş: [{ id, e }] biçiminde en az bir kayıt gerekli");
  }
  const hatalar = [];
  const indeks = new Map(sorular.map((s, i) => [s.id, i]));
  const gorulen = new Set();
  for (const ek of ekler) {
    const id = ek?.id;
    if (gorulen.has(id)) { hatalar.push(`${id}: partide birden fazla kez var`); continue; }
    gorulen.add(id);
    if (!indeks.has(id)) { hatalar.push(`${id}: havuzda böyle bir soru yok`); continue; }
    const soru = sorular[indeks.get(id)];
    if (soru.secenekler_tr.length !== 4) {
      hatalar.push(`${id}: zaten ${soru.secenekler_tr.length} şıklı (yalnızca 4 şıklı sorulara E eklenir)`);
      continue;
    }
    const hata = besinciSikHatasi(soru.secenekler_tr, ek.e);
    if (hata) hatalar.push(`${id}: ${hata}`);
  }
  if (hatalar.length > 0) {
    throw new Error(`Parti uygulanmadı (${hatalar.length} hata):\n- ${hatalar.join("\n- ")}`);
  }
  const ekMap = new Map(ekler.map((ek) => [ek.id, ek.e.replace(/\s+/g, " ").trim()]));
  return sorular.map((s) =>
    ekMap.has(s.id)
      ? { ...s, secenekler_tr: [...s.secenekler_tr, ekMap.get(s.id)] } // dogru_index AYNEN kalır
      : s
  );
}

// Havuzun şık sayısı özeti: { dort, bes, diger }.
export function sikSayaci(sorular) {
  const sayac = { dort: 0, bes: 0, diger: 0 };
  for (const s of sorular) {
    const n = Array.isArray(s.secenekler_tr) ? s.secenekler_tr.length : 0;
    if (n === 4) sayac.dort++;
    else if (n === 5) sayac.bes++;
    else sayac.diger++;
  }
  return sayac;
}
