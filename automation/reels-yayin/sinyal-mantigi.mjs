// 13:30 "SİNYAL KELİME" günlük videosunun kuyruk kuralları (ağa çıkmaz; test/sinyal.test.mjs ile test edilir).
// 24 Kas 2026, İhsan onayı: her gün 13:30'da sitedeki sinyal sorularından (assets/data/sinyal-sorular.json)
// bir video. Video automation/video-pipeline/scripts/sinyal-video.mjs ile üretilir; sinyal-ekle.mjs kuyruğa ekler.
//
// Konu numarası: 700 + soru numarası (ss001 → konu 701, video konu701.mp4).
// Hazır kuyruk 409'da, "3 saniyede çöz" 501-599'da biter: çakışmaz.
// Her soru bir kez kullanılır. Sorular bitince 13:30 saati hazır kuyruktan dolar (kuyruk-mantigi.mjs).
import { sinyalMu } from "./kuyruk-mantigi.mjs";

export const SINYAL_KONU_TABANI = 700;
export const harf = (i) => String.fromCharCode(65 + i);
const TUR = { zitlik: "zıtlık", sebep: "sebep", sonuc: "sonuç", zaman: "zaman", kosul: "koşul", amac: "amaç", ekleme: "ekleme" };

export function sinyalKonusu(soruId) {
  const m = /^ss(\d{3})$/.exec(String(soruId));
  return m && Number(m[1]) < 100 ? SINYAL_KONU_TABANI + Number(m[1]) : null;
}

// Video üretilebilir mi? 5 şık, geçerli doğru cevap, boşluklu cümle
export function sinyalKalitesi(s) {
  if (!s?.questionText?.trim()) return "bos_soru";
  if (!Array.isArray(s.options) || s.options.length !== 5 || s.options.some((o) => !String(o || "").trim())) return "sik_5_degil";
  if (!Number.isInteger(s.correctAnswer) || s.correctAnswer < 0 || s.correctAnswer > 4) return "gecersiz_cevap";
  if (!s.explanation?.trim()) return "bos_aciklama";
  return null;
}

export function hazirSinyalVar(kuyruk, durum) {
  return kuyruk.ogeler.some((o) => sinyalMu(o) && !durum.konular?.[o.konu]?.slot);
}

export function siradakiSinyal(kuyruk, sorular) {
  const kullanilan = new Set(kuyruk.ogeler.filter(sinyalMu).map((o) => o.soru));
  const konular = new Set(kuyruk.ogeler.map((o) => o.konu));
  return (
    [...sorular]
      .filter((q) => sinyalKonusu(q.id) !== null)
      .sort((a, b) => sinyalKonusu(a.id) - sinyalKonusu(b.id))
      .find((q) => !kullanilan.has(q.id) && !konular.has(sinyalKonusu(q.id)) && !sinyalKalitesi(q)) || null
  );
}

// Kuyruk öğesi. Cevap açıklamada YOK: izleyici videoda görür.
export function sinyalOgesi(s) {
  const konu = sinyalKonusu(s.id);
  const tur = TUR[s.mainSignal?.type] || "";
  const siklar = s.options.map((o, i) => `${harf(i)}) ${o}`).join("\n");
  const soruMetni = `YDS'ye çalışıyorsan bunu 3 saniyede bil:\n${s.questionText}\n\n${siklar}`;
  const aciklama = [
    soruMetni,
    "Boşluğa hangisi gelir? Cevabını yoruma harfle yaz, sonra videoda kontrol et.",
    tur ? `İpucu: bu bir ${tur} sinyali.` : null,
    "Yarın 13:30'da yeni sinyal. Kaçırmamak için takip et.\nKaydet, YDS ve YÖKDİL'e çalışan arkadaşına gönder.",
    "Ücretsiz çalışma planı. Link biyografide.",
    "Anlatıcımız KLOD yapay zekâ ile oluşturulmuştur.",
    "#yds #yökdil #sinyalavcısı #ydshazırlık #ingilizce",
  ].filter(Boolean).join("\n\n");
  const ytAciklama = [
    soruMetni,
    "Doğru cevap ve sinyal kelimeler videoda.",
    "Yarın 13:30'da yeni sinyal. Kaçırmamak için abone ol.\nÜcretsiz çalışma planı: sinyal-avcisi.com",
    "Anlatıcımız KLOD yapay zekâ ile oluşturulmuştur.",
    "#yds #yökdil #sinyalavcısı #ydshazırlık #ingilizce\n\n#Shorts",
  ].join("\n\n");
  const temiz = (m) => m.replace(/[<>]/g, "");
  const ad = tur ? `${tur[0].toLocaleUpperCase("tr")}${tur.slice(1)} sinyali` : "Sinyal kelime";
  return {
    konu,
    tur: "sinyal",
    soru: s.id,
    baslik: `Sinyali Bul: ${ad}`,
    video: `konu${konu}.mp4`,
    aciklama,
    ilk_yorum: "Boşluğa hangisi gelir? A, B, C, D ya da E? Yoruma yaz, yarın 13:30'da yeni sinyal.",
    youtube: {
      baslik: temiz(`Sinyali Bul: ${ad} | YDS YÖKDİL`).slice(0, 100),
      aciklama: temiz(ytAciklama),
    },
  };
}
