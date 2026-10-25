// Kuyruk ve durum dosyalarının platform kurallarına uyduğunu doğrular (ağa çıkmaz).
// Her iş akışı çalışmasında yayından ÖNCE çalışır; bir kural bozuksa hiçbir şey gönderilmez.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { facebookAciklamasi, youtubeAciklamasi, sonrakiKonu, merakliAciklama, GENEL_TAKIP_SATIRI } from "../kuyruk-mantigi.mjs";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const kuyruk = JSON.parse(await readFile(path.join(dir, "kuyruk.json"), "utf-8"));
const durum = JSON.parse(await readFile(path.join(dir, "durum.json"), "utf-8"));

let toplam = 0, hata = 0;
const kontrol = (ad, ok, detay = "") => { toplam++; if (!ok) { hata++; console.log(`[FAIL] ${ad} ${detay}`); } };
// Veriye bağlı, yayını DURDURMAYAN kontroller: yalnız uyarı yazar
let uyari = 0;
const uyar = (ad, ok, detay = "") => { if (!ok) { uyari++; console.log(`[UYARI] ${ad} ${detay}`); } };

// Platform dönüşümleri (birim): Facebook/YouTube'da "biyografi" yok
kontrol("Facebook: 'Link biyografide.' site adresine çevrilir",
  facebookAciklamasi("Ücretsiz. Link biyografide.") === "Ücretsiz: https://sinyal-avcisi.com");
kontrol("Facebook: noktasız tek cümle de çevrilir", facebookAciklamasi("Link biyografide") === "https://sinyal-avcisi.com");
kontrol("YouTube: 'Link biyografide.' çıkarılır, satır yapısı korunur",
  youtubeAciklamasi("Ücretsiz. Link biyografide.\n\n#x") === "Ücretsiz.\n\n#x");

// Merak satırı (birim): genel takip satırı sıradaki konunun adını alır, tanıtım videoları atlanır
{
  const k = { ogeler: [{ konu: 78, baslik: "Passive Voice" }, { konu: 203, baslik: "Yanlış Defteri" }, { konu: 67, baslik: "Reading: Author Attitude" }] };
  kontrol("Merak: tanıtım atlanır, sıradaki asıl konu bulunur", sonrakiKonu(k, 78)?.konu === 67);
  kontrol("Merak: son konudan sonrası yok", sonrakiKonu(k, 67) === null);
  kontrol("Merak: satır sıradaki konuyla değişir",
    merakliAciklama(`A\n${GENEL_TAKIP_SATIRI}\nB`, { baslik: "Passive Voice" }) === "A\n🔔 Sıradaki video: Passive Voice. Kaçırmamak için takip et.\nB");
  kontrol("Merak: satırı olmayan açıklama aynı kalır", merakliAciklama("Takip et.", { baslik: "X" }) === "Takip et.");
  kontrol("Merak: sıradaki yoksa genel satır kalır", merakliAciklama(GENEL_TAKIP_SATIRI, null) === GENEL_TAKIP_SATIRI);
}

kontrol("kuyruk boş değil", Array.isArray(kuyruk.ogeler) && kuyruk.ogeler.length > 0);
const konular = new Set();
for (const o of kuyruk.ogeler) {
  const k = `Konu ${o.konu}`;
  kontrol(`${k}: konu numarası tekil`, !konular.has(o.konu)); konular.add(o.konu);
  // Tekrar videoları nane yeşili başlıkla yeni adla üretildi (eski sarı sürümün üzerine yazılmaz)
  const ad = `konu${String(o.konu).padStart(2, "0")}`;
  kontrol(`${k}: medya adı`, o.video === `${ad}.mp4` || ("tekrar" in o && o.video === `${ad}-nane.mp4`));
  kontrol(`${k}: açıklama dolu`, typeof o.aciklama === "string" && o.aciklama.trim().length > 50);
  kontrol(`${k}: Instagram açıklaması ≤ 2200 karakter`, [...o.aciklama].length <= 2200, `(${[...o.aciklama].length})`);
  const etiketler = o.aciklama.match(/#[\p{L}\p{N}_]+/gu) || [];
  kontrol(`${k}: en fazla 5 hashtag`, etiketler.length <= 5, `(${etiketler.length})`);
  kontrol(`${k}: yapay zekâ beyanı satırı var`, o.aciklama.includes("yapay zekâ ile oluşturulmuştur"));
  // Dayanaksız istatistik yok: "%80", "80%", "yüzde 80", "her 10 kişiden" gibi ifadeler yasak
  const metinler = [o.aciklama, o.ilk_yorum, o.youtube.baslik, o.youtube.aciklama].join("\n");
  const istatistik = metinler.match(/%\s*\d|\d+\s*%|yüzde\s*\d|\bher\s+\d+\s+(?:kişi|öğrenci|aday)/i);
  kontrol(`${k}: istatistik iddiası yok`, !istatistik, istatistik ? `(«${istatistik[0]}»)` : "");
  kontrol(`${k}: ilk yorum dolu ve hashtag'siz`, typeof o.ilk_yorum === "string" && o.ilk_yorum.length > 10 && !o.ilk_yorum.includes("#"));
  kontrol(`${k}: YouTube başlığı 1–100 karakter`, o.youtube?.baslik && [...o.youtube.baslik].length <= 100, `(${[...(o.youtube?.baslik || "")].length})`);
  kontrol(`${k}: YouTube başlık/açıklamada < > yok`, !/[<>]/.test(o.youtube.baslik + o.youtube.aciklama));
  kontrol(`${k}: YouTube açıklaması ≤ 5000 karakter`, [...o.youtube.aciklama].length <= 5000);
  // Gönderilen metinler (dönüşüm sonrası)
  const fb = facebookAciklamasi(o.aciklama), yt = youtubeAciklamasi(o.youtube.aciklama);
  kontrol(`${k}: Facebook metninde "biyografi" yok`, !/biyografi/i.test(fb));
  kontrol(`${k}: YouTube açıklamasında "biyografi" yok`, !/biyografi/i.test(yt));
  kontrol(`${k}: YouTube açıklamasında satır sonu boşluk / çift boş satır yok`, !/[ \t]+$/m.test(yt) && !/\n{3,}/.test(yt) && yt === yt.trim());
  kontrol(`${k}: YouTube açıklaması ≤ 5000 byte (API sınırı)`, Buffer.byteLength(yt, "utf8") <= 5000, `(${Buffer.byteLength(yt, "utf8")})`);
  uyar(`${k}: Instagram metninde "Link biyografide." var`, /biyografi/i.test(o.aciklama));
  uyar(`${k}: YouTube açıklamasında sinyal-avcisi.com var`, yt.includes("sinyal-avcisi.com"));
}
// Tekrar turu: asıl konu kuyrukta olmalı, başlık aynı kalmalı
for (const o of kuyruk.ogeler.filter((x) => x.tekrar !== undefined)) {
  const asil = kuyruk.ogeler.find((x) => x.konu === o.tekrar && x.tekrar === undefined);
  kontrol(`Konu ${o.konu}: tekrar ettiği konu (${o.tekrar}) kuyrukta`, !!asil);
  kontrol(`Konu ${o.konu}: başlık asıl konuyla aynı`, asil?.baslik === o.baslik);
  kontrol(`Konu ${o.konu}: tekrar numarası 100 + asıl konu`, o.konu === 100 + o.tekrar);
}
kontrol("durum.json biçimi", typeof durum === "object" && typeof (durum.konular ?? {}) === "object");

console.log(`${toplam - hata}/${toplam} kontrol geçti (${kuyruk.ogeler.length} konu)${uyari ? `, ${uyari} uyarı` : ""}`);
if (hata) process.exit(1);
