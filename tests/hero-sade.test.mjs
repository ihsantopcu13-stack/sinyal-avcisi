// Ana sayfa hero'su sade: Instagram → ücretsiz test akışıyla yarışan metin
// bağlantıları yok. Hero'da yalnız birincil düğme, "Yöntemi Gör" ve demo kartı
// (Dinle, 4 şık, Sonraki alan) var. Kaldırılan hedefler başka yerden erişilebilir:
// Hedef Programı menüde, /hedef-rota, /50-puan-programi, /puan-hedefi altbilgideki
// Rehberler'de. Ağ çağrısı yok, sadece repo dosyalarını okur.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const indexHtml = readFileSync(path.join(ROOT, "index.html"), "utf-8");
const hero = (indexHtml.match(/<section id="hero"[\s\S]*?<\/section>/) || [""])[0];
kontrol("hero bölümü bulundu", hero.length > 0);

// ---- Hero'da yalnız izin verilen düğmeler, hiç metin bağlantısı yok ----
const baglantilar = hero.match(/<a\s[^>]*>/g) || [];
kontrol("hero'da <a> bağlantısı yok", baglantilar.length === 0, baglantilar.join(" "));
const dugmeler = [...hero.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]);
const izinli = [
  /id="hero-basla-btn"/, // birincil: Ücretsiz AVCI Testini Başlat
  /data-landing-cta="hero_yontem"/, // Yöntemi Gör
  /id="demo-dinle"/, // demo kartı: Dinle
  /class="dopt"/, // demo kartı: şıklar
  /id="dnext"/, // demo kartı: Sonraki alan
];
const izinsiz = dugmeler.filter((d) => !izinli.some((r) => r.test(d)));
kontrol("hero'daki her düğme izin verilenlerden (birincil, Yöntemi Gör, demo kartı)", izinsiz.length === 0, izinsiz.join(" "));
kontrol("hero'da 2 yol düğmesi + 6 demo düğmesi = 8", dugmeler.length === 8, String(dugmeler.length));
for (const metin of ["Derslere git", "Günün denemesi · 5 soru", "Hedef Programını kur", "Hedef Puan Rotanı çıkar", "Gün gün 50 puan programı", "Zor, sınava benzeyen soruları çöz"]) {
  kontrol(`hero'da "${metin}" yok`, !hero.includes(metin));
}

// ---- Ölü kod kalmadı ----
kontrol("hero-50-metin hiçbir yerde kalmadı", !indexHtml.includes("hero-50-metin"));
kontrol("hero-diger-yollar hiçbir yerde kalmadı", !indexHtml.includes("hero-diger-yollar"));
const tema = readFileSync(path.join(ROOT, "assets", "tema-adacayi.css"), "utf-8");
kontrol("temada kullanılmayan .hero-baglantilar a kuralı yok", !/\.hero-baglantilar a\{/.test(tema));
kontrol("tema CSS sürümü önbellek için artırıldı", /tema-adacayi\.css\?v=20261114a/.test(indexHtml));
kontrol("sınav geçince geri sayım kutusu da gizleniyor (boş çizgili kutu kalmaz)", /satir\.closest\('\.hero-baglantilar'\)\|\|satir\)\.style\.display='none'/.test(indexHtml));

// ---- Kaldırılan hedefler başka yerden erişilebilir ----
const footer = (indexHtml.match(/<footer>[\s\S]*?<\/footer>/) || [""])[0];
const rehber = (footer.match(/<nav aria-label="Rehberler"[\s\S]*?<\/nav>/) || [""])[0];
for (const ad of ["hedef-rota", "50-puan-programi", "puan-hedefi"]) {
  const a = rehber.match(new RegExp(`<a href="/${ad}"[^>]*>([^<]+)</a>`));
  kontrol(`/${ad} altbilgideki Rehberler'de gerçek <a href> bağlantısı`, !!a && !/onclick|javascript:/i.test(a[0]), a && a[1]);
  kontrol(`/${ad} hedef dosyası repoda mevcut`, existsSync(path.join(ROOT, `${ad}.html`)));
}
kontrol("Hedef Programı menüde (hpAc) duruyor", /class="dn-item[^"]*" onclick="hpAc\(\)"[^>]*>[\s\S]{0,200}?Hedef Programım/.test(indexHtml));

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
