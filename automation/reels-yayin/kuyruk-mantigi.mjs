// Kuyruk ve zamanlama kuralları (ağa çıkmaz; test/durum.test.mjs ile test edilir).
//
// ZAMANLAMA: GitHub zamanlanmış işleri bu repoda saatlerce geç başlatıyor. Bu yüzden yayın saatini
// GitHub değil Buffer tutar: iş akışı günde bir kez (21:00) çalışır ve önündeki yayın saatlerini
// (bugünün kalanı + yarın; 08:30, 13:00, 17:30 İstanbul) sıradaki konularla doldurup Buffer'a TAM O
// SAAT için zamanlanmış gönderir.
//   - Her konu bir kez bir saate atanır (durum.konular[k].slot) ve asla iki kez gönderilmez.
//   - Çalışma kaçarsa sonraki çalışma sıradan devam eder: geçmiş boş saatler doldurulmaz (rastgele
//     saatte yayın olmaz), hiçbir konu atlanmaz.
//   - Bir konunun bir platformu başarısızsa yalnız o platform yeniden denenir: saati hâlâ gelecekteyse
//     aynı saate, geçtiyse en kısa sürede (en fazla MAX_DENEME kez).
//   - Bir konu hiçbir platforma gönderilemezse saati bırakılır; sonraki çalışma onu ilk boş saate koyar.
//
// YOUTUBE: kuyruğu BEKLETMEZ. Zamanlanan konular durum.youtube_bekleyen listesine girer ve hiçbir
// zaman kalıcı olarak atlanmaz; yükleme yalnız REELS_YOUTUBE=acik iken, eskiden yeniye, çalışma başına
// en fazla YT_CALISMA_BASINA kadar yapılır (YouTube kotası: videos.insert 1600 birim, günlük 10.000).

export const MAX_DENEME = 3;
export const BUFFER_PLATFORMLARI = ["instagram", "facebook"];
export const YT_CALISMA_BASINA = 2;
export const SLOTLAR = ["08:30", "13:00", "17:30"]; // İstanbul saati (UTC+3, yaz saati uygulaması yok)
export const ON_SURE_DK = 15; // Buffer'a verilen saat en az bu kadar ileride olmalı

const IST_MS = 3 * 60 * 60 * 1000;
const istanbulGunu = (t) => new Date(t + IST_MS).toISOString().slice(0, 10);

export function youtubeAcik(env) {
  return String(env.REELS_YOUTUBE || "").trim() === "acik";
}

export function durumHazirla(durum) {
  durum.konular ||= {};
  durum.youtube_bekleyen ||= [];
  return durum;
}

// Şu andan itibaren doldurulabilecek yayın saatleri: bugünün kalanı + yarın (İstanbul), en az ON_SURE_DK ileride
export function gelecekSlotlar(simdi, onSureDk = ON_SURE_DK) {
  const t = simdi.getTime();
  const gunler = [istanbulGunu(t), istanbulGunu(t + 24 * 60 * 60 * 1000)];
  const sinir = t + onSureDk * 60 * 1000;
  return gunler.flatMap((g) => SLOTLAR.map((s) => `${g}T${s}:00+03:00`)).filter((z) => Date.parse(z) >= sinir);
}

// Bu çalışmada Buffer'a gönderilecekler: [{ konu, slot, dueAt, platformlar, yeni }]
export function planla(kuyruk, durum, simdi, onSureDk = ON_SURE_DK) {
  const enErken = simdi.getTime() + onSureDk * 60 * 1000;
  const plan = [];
  const doluSlotlar = new Set();

  // 1) Saati atanmış ama bir platformu eksik konular (yalnız eksik platform, aynı saat ya da en kısa sürede)
  for (const o of kuyruk.ogeler) {
    const d = durum.konular[o.konu];
    if (!d?.slot) continue;
    doluSlotlar.add(d.slot);
    const eksik = BUFFER_PLATFORMLARI.filter((p) => !d[p]?.tamam && (d[p]?.deneme || 0) < MAX_DENEME);
    if (eksik.length) {
      const due = Math.max(Date.parse(d.slot), enErken);
      plan.push({ konu: o.konu, slot: d.slot, dueAt: new Date(due).toISOString(), platformlar: eksik, yeni: false });
    }
  }

  // 2) Boş gelecek saatlere, saati hiç atanmamış sıradaki konular
  const atanmamis = kuyruk.ogeler.filter((o) => !durum.konular[o.konu]?.slot);
  let i = 0;
  for (const slot of gelecekSlotlar(simdi, onSureDk)) {
    if (doluSlotlar.has(slot)) continue;
    const o = atanmamis[i++];
    if (!o) break;
    plan.push({ konu: o.konu, slot, dueAt: new Date(Date.parse(slot)).toISOString(), platformlar: [...BUFFER_PLATFORMLARI], yeni: true });
  }
  return plan;
}

// Gönderim denemesinden sonra: hiçbir platform başarılı olmadıysa saat bırakılır (konu sonra ilk boş saate gider)
export function atamaSonucu(durum, konu) {
  const d = durum.konular[konu];
  if (d && !BUFFER_PLATFORMLARI.some((p) => d[p]?.tamam)) delete d.slot;
}

export function youtubeBekleyeneEkle(durum, konu) {
  if (durum.konular[konu]?.youtube?.tamam) return;
  if (!durum.youtube_bekleyen.includes(konu)) durum.youtube_bekleyen.push(konu);
}

export function youtubeSiradakiler(durum, adet = YT_CALISMA_BASINA) {
  return durum.youtube_bekleyen.filter((k) => !durum.konular[k]?.youtube?.tamam).slice(0, adet);
}

export function youtubeTamamlandi(durum, konu) {
  durum.youtube_bekleyen = durum.youtube_bekleyen.filter((k) => k !== konu);
}
