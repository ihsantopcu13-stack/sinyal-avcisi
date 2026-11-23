// "3 SANİYEDE ÇÖZ" günlük videosunun kuyruk kuralları (ağa çıkmaz; test/cozum.test.mjs ile test edilir).
// 23 Kas 2026, İhsan onayı: her gün 10:00'da bir "3 saniyede çöz" videosu. Video
// automation/video-pipeline/scripts/cozum-video.mjs ile üretilir; cozum-ekle.mjs kuyruğa ekler.
//
// Konu numarası: 500 + soru numarası (q031 → konu 531, video konu531.mp4). Hazır kuyruk 408'de bitiyor.
// Her soru bir kez kullanılır. Sorular bitince 10:00 saati hazır kuyruktan dolar (kuyruk-mantigi.mjs).
import { cozumMu } from "./kuyruk-mantigi.mjs";

export const COZUM_KONU_TABANI = 500;
export const harf = (i) => String.fromCharCode(65 + i);

export function cozumKonusu(soruId) {
  const m = /^q(\d{1,3})$/.exec(String(soruId));
  return m ? COZUM_KONU_TABANI + Number(m[1]) : null;
}

// Saati atanmamış "3 saniyede çöz" videosu var mı? Varsa yenisi üretilmez.
export function hazirCozumVar(kuyruk, durum) {
  return kuyruk.ogeler.some((o) => cozumMu(o) && !durum.konular?.[o.konu]?.slot);
}

// Sıradaki kullanılmamış soru (id sırasıyla). kalite: soru → sorun metni ya da null
export function siradakiSoru(kuyruk, sorular, kalite = () => null) {
  const kullanilan = new Set(kuyruk.ogeler.filter(cozumMu).map((o) => o.soru));
  const konular = new Set(kuyruk.ogeler.map((o) => o.konu));
  return (
    [...sorular]
      .filter((q) => cozumKonusu(q.id) !== null)
      .sort((a, b) => cozumKonusu(a.id) - cozumKonusu(b.id))
      .find((q) => !kullanilan.has(q.id) && !konular.has(cozumKonusu(q.id)) && !kalite(q)) || null
  );
}

const siklar = (q) => q.secenekler_tr.map((s, i) => `${harf(i)}) ${s}`).join("\n");

// Kuyruk öğesi. Cevap açıklamada YOK: izleyici videoda görür (geçme oranı için merak kalsın).
export function cozumOgesi(q) {
  const konu = cozumKonusu(q.id);
  const sinyal = String(q.sinyal || "").trim();
  const soruMetni = `3 saniyede çöz:\n${q.soru_en}\n\n${q.soru_tr}\n${siklar(q)}`;
  const aciklama = [
    soruMetni,
    "Cevabını yoruma harfle yaz, sonra videoda kontrol et.",
    sinyal ? `İpucu: "${sinyal}" kelimesine bak.` : null,
    "Yarın 10:00'da yeni soru. Kaçırmamak için takip et.\nKaydet, YDS'ye çalışan arkadaşına gönder.",
    "Ücretsiz çalışma planı. Link biyografide.",
    "Anlatıcımız KLOD yapay zekâ ile oluşturulmuştur.",
    "#yds #yökdil #sinyalavcısı #yökdilsosyal #ydsgramer",
  ].filter(Boolean).join("\n\n");
  const ytAciklama = [
    soruMetni,
    "Doğru cevap ve nasıl çözüleceği videoda.",
    "Yarın 10:00'da yeni soru. Kaçırmamak için abone ol.\nÜcretsiz çalışma planı: sinyal-avcisi.com",
    "Anlatıcımız KLOD yapay zekâ ile oluşturulmuştur.",
    "#yds #yökdil #sinyalavcısı #yökdilsosyal #ydsgramer\n\n#Shorts",
  ].join("\n\n");
  const temiz = (m) => m.replace(/[<>]/g, "");
  return {
    konu,
    tur: "cozum",
    soru: q.id,
    baslik: `3 Saniyede Çöz: ${sinyal || q.id}`,
    video: `konu${konu}.mp4`,
    aciklama,
    ilk_yorum: "Cevabın hangisi? A, B, C, D ya da E? Yoruma yaz, yarın yeni soru geliyor.",
    youtube: {
      baslik: temiz(`3 Saniyede Çöz: ${sinyal ? `${sinyal} sinyali` : "YDS sorusu"} | YDS YÖKDİL`).slice(0, 100),
      aciklama: temiz(ytAciklama),
    },
  };
}
