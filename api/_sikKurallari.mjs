// ============================================================
// SİNYAL LAB ŞIK KURALLARI — 4 → 5 şık geçişi (Aşama 2-3)
// ============================================================
// YDS/YÖKDİL 5 şıklıdır (A-E). Havuzdaki 4 şıklı sorulara 5. şık
// partiler halinde eklenir: yeni şık önce dizinin SONUNA eklenir
// (eSikkiEkle), ardından partinin şıkları tohumlu olarak karıştırılır
// (partiyiKaristir) — aksi halde E hiçbir zaman doğru cevap olmaz ve
// öğrenci "E asla doğru değil" diye eleyebilir. Karıştırmada şık
// METİNLERİ ve doğru cevabın METNİ korunur; yalnızca sıra ve
// dogru_index değişir. answer_history şık METNİNİ sakladığı için
// geçmiş kayıtlar bozulmaz.
//
// DURUM (2026-10-02): geçiş tamamlandı (#62-#67), havuz tamamen 5 şıklı.
// soruSikHatasi (kopya/boş şık) ve sikSayaci kalıcı kontroller olarak
// kullanılmaya devam ediyor; eSikkiEkle/partiyiKaristir yalnızca 4 şıklı
// yeni soru aktarımı için.
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

// Bir soru kaydının şıklarını doğrular: hiçbir şık boş olamaz, hiçbir iki
// şık (normalize edilmiş haliyle) aynı olamaz. Karıştırmadan sonra yeni
// eklenen şık E konumunda olmayabileceği için TÜM çiftler karşılaştırılır.
// Hata metni ya da null döndürür.
export function soruSikHatasi(soru) {
  const s = soru?.secenekler_tr;
  if (!Array.isArray(s)) return null;
  const harf = (i) => String.fromCharCode(65 + i);
  const normal = s.map(sikNormalize);
  const bos = normal.findIndex((n) => n.length === 0);
  if (bos !== -1) return `${harf(bos)} şıkkı boş olamaz`;
  for (let i = 0; i < normal.length; i++) {
    for (let j = i + 1; j < normal.length; j++) {
      if (normal[i] === normal[j]) return `${harf(i)} ve ${harf(j)} şıkları aynı (birbirinin kopyası olamaz)`;
    }
  }
  return null;
}

// mulberry32: sabit tohumlu PRNG → aynı girdi her zaman aynı sonucu verir.
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function metinOzeti(metin) {
  let h = 2166136261; // FNV-1a
  for (const c of metin) h = Math.imul(h ^ c.codePointAt(0), 16777619);
  return h >>> 0;
}

export const VARSAYILAN_TOHUM = 20261001;

// Partideki soruların şıklarını tohumlu karıştırır. Doğru cevaplar parti
// İÇİNDE harflere dengeli dağıtılır (n/5'er; artan k soru, havuzun geri
// kalanında en az doğru cevap olan harflere verilir → havuz geneli de
// dengeye yaklaşır). Tohum, taban tohum + partinin id listesinden türetilir:
// aynı parti her zaman aynı sonucu verir, farklı partiler farklı desen alır.
// Girdi dizisini DEĞİŞTİRMEZ. Şık kümesi veya doğru cevap metni değişirse
// fırlatır (savunma amaçlı; olmaması gerekir).
export function partiyiKaristir(sorular, idler, tohum = VARSAYILAN_TOHUM) {
  const idKumesi = new Set(idler);
  const parti = sorular.filter((s) => idKumesi.has(s.id));
  if (parti.length !== idKumesi.size) throw new Error("partiyiKaristir: bazı id'ler havuzda yok");
  const k = parti[0]?.secenekler_tr.length;
  if (!parti.every((s) => s.secenekler_tr.length === k)) throw new Error("partiyiKaristir: partideki soruların şık sayısı aynı olmalı");

  const rnd = mulberry32((tohum ^ metinOzeti([...idKumesi].sort().join(","))) >>> 0);
  const karistir = (d0) => { const d = [...d0]; for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; };

  // Havuzun geri kalanındaki doğru cevap konumu sayıları (artanları dağıtmak için)
  const disarida = Array(k).fill(0);
  sorular.forEach((s) => { if (!idKumesi.has(s.id) && s.dogru_index < k) disarida[s.dogru_index]++; });
  const hedefler = [];
  for (let h = 0; h < k; h++) for (let t = 0; t < Math.floor(parti.length / k); t++) hedefler.push(h);
  const artanSirasi = karistir([...Array(k).keys()]).sort((a, b) => disarida[a] - disarida[b]); // eşitlikte tohumlu sıra
  for (let t = 0; t < parti.length % k; t++) hedefler.push(artanSirasi[t]);
  const karisikHedefler = karistir(hedefler);

  const yeni = new Map();
  parti.forEach((s, i) => {
    const dogru = s.secenekler_tr[s.dogru_index];
    const celdiriciler = karistir(s.secenekler_tr.filter((_, j) => j !== s.dogru_index));
    const hedef = karisikHedefler[i];
    const secenekler = [];
    for (let j = 0, c = 0; j < k; j++) secenekler.push(j === hedef ? dogru : celdiriciler[c++]);
    if ([...secenekler].sort().join("\0") !== [...s.secenekler_tr].sort().join("\0") || secenekler[hedef] !== dogru) {
      throw new Error(`${s.id}: karıştırmada şık kümesi/doğru cevap değişti`);
    }
    yeni.set(s.id, { ...s, secenekler_tr: secenekler, dogru_index: hedef });
  });
  return sorular.map((s) => yeni.get(s.id) || s);
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
      ? { ...s, secenekler_tr: [...s.secenekler_tr, ekMap.get(s.id)] } // dogru_index aynen kalır (karıştırma ayrı adım)
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
