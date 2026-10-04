// Kuyruk ilerleme kuralları: Instagram/Facebook YouTube'u beklemez, YouTube bekleyenleri kalıcı atlanmaz.
import { durumHazirla, siradaki, youtubeBekleyeneEkle, youtubeSiradakiler, youtubeTamamlandi, youtubeAcik, MAX_DENEME } from "../kuyruk-mantigi.mjs";

let toplam = 0, hata = 0;
const kontrol = (ad, ok) => { toplam++; if (!ok) { hata++; console.log(`[FAIL] ${ad}`); } };
const kuyruk = { ogeler: [1, 2, 3, 4].map((konu) => ({ konu })) };

{
  const d = durumHazirla({});
  kontrol("başta sıradaki Konu 1, kalan instagram+facebook", siradaki(kuyruk, d)?.oge.konu === 1 && siradaki(kuyruk, d).kalan.join() === "instagram,facebook");
}
{
  // Konu 1: IG+FB tamam, YouTube başarısız → sıradaki Konu 2, Konu 1 YouTube bekleyende
  const d = durumHazirla({ konular: { 1: { instagram: { tamam: true }, facebook: { tamam: true }, youtube: { deneme: 5, hata: "invalid_client" } } } });
  youtubeBekleyeneEkle(d, 1);
  kontrol("YouTube başarısızken IG/FB sıradakine geçer", siradaki(kuyruk, d)?.oge.konu === 2);
  kontrol("başarısız YouTube konusu bekleyende", d.youtube_bekleyen.join() === "1");
  kontrol("YouTube denemesi ne kadar çok olursa olsun konu atlanmaz", youtubeSiradakiler(d).join() === "1");
}
{
  // YouTube 3 konu geride; bekleyenler eskiden yeniye, çalışma başına en fazla 2
  const d = durumHazirla({ youtube_bekleyen: [1, 2, 3], konular: {} });
  youtubeBekleyeneEkle(d, 2);
  kontrol("aynı konu bekleyene iki kez eklenmez", d.youtube_bekleyen.join() === "1,2,3");
  kontrol("çalışma başına en fazla 2, eskiden yeniye", youtubeSiradakiler(d).join() === "1,2");
  d.konular[1] = { youtube: { tamam: true } }; youtubeTamamlandi(d, 1);
  kontrol("yüklenen konu bekleyenden çıkar", d.youtube_bekleyen.join() === "2,3" && youtubeSiradakiler(d).join() === "2,3");
}
{
  // YouTube'a zaten yüklenmiş konu bekleyene eklenmez
  const d = durumHazirla({ konular: { 4: { youtube: { tamam: true } } } });
  youtubeBekleyeneEkle(d, 4);
  kontrol("yüklenmiş konu bekleyene eklenmez", d.youtube_bekleyen.length === 0);
}
{
  // Instagram MAX_DENEME kez başarısız → o platform bırakılır, Facebook bitmişse sıradakine geçilir
  const d = durumHazirla({ konular: { 1: { instagram: { deneme: MAX_DENEME }, facebook: { tamam: true } } } });
  kontrol("Instagram deneme sınırına ulaşınca sıradakine geçilir", siradaki(kuyruk, d)?.oge.konu === 2);
}
{
  // IG/FB kuyruğu bitse de YouTube bekleyenleri işlenmeye devam eder
  const tamam = { instagram: { tamam: true }, facebook: { tamam: true } };
  const d = durumHazirla({ konular: { 1: tamam, 2: tamam, 3: tamam, 4: tamam }, youtube_bekleyen: [3, 4] });
  kontrol("IG/FB bitince sıradaki yok", siradaki(kuyruk, d) === null);
  kontrol("IG/FB bitse de YouTube bekleyenleri sürer", youtubeSiradakiler(d).join() === "3,4");
}

{
  // YouTube anahtarı: yalnız "acik" iken yükleme; kapalıyken bekleyen listesi büyümeye devam eder
  kontrol("REELS_YOUTUBE yoksa YouTube kapalı", youtubeAcik({}) === false);
  kontrol("REELS_YOUTUBE=kapali → kapalı", youtubeAcik({ REELS_YOUTUBE: "kapali" }) === false);
  kontrol("REELS_YOUTUBE=acik → açık", youtubeAcik({ REELS_YOUTUBE: "acik" }) === true);
  const d = durumHazirla({ youtube_bekleyen: [1] });
  youtubeBekleyeneEkle(d, 2);
  kontrol("YouTube kapalıyken de bekleyen listesi korunur ve büyür", d.youtube_bekleyen.join() === "1,2");
}

console.log(`${toplam - hata}/${toplam} kontrol geçti`);
if (hata) process.exit(1);
