// Kuyruk ve durum dosyalarının platform kurallarına uyduğunu doğrular (ağa çıkmaz).
// Her iş akışı çalışmasında yayından ÖNCE çalışır; bir kural bozuksa hiçbir şey gönderilmez.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const kuyruk = JSON.parse(await readFile(path.join(dir, "kuyruk.json"), "utf-8"));
const durum = JSON.parse(await readFile(path.join(dir, "durum.json"), "utf-8"));

let toplam = 0, hata = 0;
const kontrol = (ad, ok, detay = "") => { toplam++; if (!ok) { hata++; console.log(`[FAIL] ${ad} ${detay}`); } };

kontrol("kuyruk boş değil", Array.isArray(kuyruk.ogeler) && kuyruk.ogeler.length > 0);
const konular = new Set();
for (const o of kuyruk.ogeler) {
  const k = `Konu ${o.konu}`;
  kontrol(`${k}: konu numarası tekil`, !konular.has(o.konu)); konular.add(o.konu);
  kontrol(`${k}: medya adları`, o.video === `konu${String(o.konu).padStart(2, "0")}.mp4` && o.kapak === `konu${String(o.konu).padStart(2, "0")}_kapak.png`);
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
}
kontrol("durum.json biçimi", typeof durum === "object" && typeof (durum.konular ?? {}) === "object");

console.log(`${toplam - hata}/${toplam} kontrol geçti (${kuyruk.ogeler.length} konu)`);
if (hata) process.exit(1);
