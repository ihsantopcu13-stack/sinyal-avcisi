// Kuyruk ilerleme kuralları (ağa çıkmaz; test/durum.test.mjs ile test edilir).
//
// Instagram ve Facebook kuyruğu sırayla ilerletir: bir konu bu iki platformda
// bitince (ya da MAX_DENEME kez başarısız olunca) sıradakine geçilir.
// YouTube kuyruğu BEKLETMEZ: YouTube'a gidemeyen konular durum.youtube_bekleyen
// listesine girer ve hiçbir zaman kalıcı olarak atlanmaz; YouTube düzelince
// bekleyenler eskiden yeniye, çalışma başına en fazla YT_CALISMA_BASINA kadar
// yüklenir (YouTube kotası: videos.insert 1600 birim, günlük 10.000 → günde ~6).

export const MAX_DENEME = 3;
export const BUFFER_PLATFORMLARI = ["instagram", "facebook"];
export const YT_CALISMA_BASINA = 2;

// YouTube yüklemesi yalnız repo değişkeni REELS_YOUTUBE=acik iken denenir. Kapalıyken konular yine
// youtube_bekleyen listesine eklenir (liste korunur), yükleme denenmez ve çalışma YouTube yüzünden
// başarısız sayılmaz. Bağlantı düzelince REELS_YOUTUBE=acik → bekleyenler sırayla yüklenir.
export function youtubeAcik(env) {
  return String(env.REELS_YOUTUBE || "").trim() === "acik";
}

export function durumHazirla(durum) {
  durum.konular ||= {};
  durum.youtube_bekleyen ||= [];
  return durum;
}

// Instagram/Facebook için sıradaki konu ve o konuda kalan platformlar
export function siradaki(kuyruk, durum) {
  for (const oge of kuyruk.ogeler) {
    const d = durum.konular[oge.konu] || {};
    const kalan = BUFFER_PLATFORMLARI.filter((p) => !d[p]?.tamam && (d[p]?.deneme || 0) < MAX_DENEME);
    if (kalan.length) return { oge, kalan };
  }
  return null;
}

// Konu Instagram/Facebook sırasına geldiğinde YouTube bekleyenlerine eklenir (zaten yüklendiyse eklenmez)
export function youtubeBekleyeneEkle(durum, konu) {
  if (durum.konular[konu]?.youtube?.tamam) return;
  if (!durum.youtube_bekleyen.includes(konu)) durum.youtube_bekleyen.push(konu);
}

// Bu çalışmada YouTube'a denenecek konular (eskiden yeniye)
export function youtubeSiradakiler(durum, adet = YT_CALISMA_BASINA) {
  return durum.youtube_bekleyen.filter((k) => !durum.konular[k]?.youtube?.tamam).slice(0, adet);
}

export function youtubeTamamlandi(durum, konu) {
  durum.youtube_bekleyen = durum.youtube_bekleyen.filter((k) => k !== konu);
}
