// Kategorili kelime kartları (/kelime-kartlari) — veri dosyasının yapısını,
// sayfanın ana sayfadaki SM-2 kelime kartlarından (sa_kk_*) ayrı anahtar
// kullandığını ve route/sitemap kaydını doğrular. Ağ çağrısı yok.

import { readFileSync } from "node:fs";
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

const html = readFileSync(path.join(ROOT, "kelime-kartlari.html"), "utf-8");
const vercel = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf-8"));
const sitemap = readFileSync(path.join(ROOT, "sitemap.xml"), "utf-8");
const index = readFileSync(path.join(ROOT, "index.html"), "utf-8");

let veri = {};
try { veri = JSON.parse(readFileSync(path.join(ROOT, "data/kelime-kartlari.json"), "utf-8")); kontrol("veri JSON olarak okunur", true); }
catch (e) { kontrol("veri JSON olarak okunur", false, e.message); }

const kat = veri.kategoriler || [];
kontrol("en az 6 kategori", kat.length >= 6, kat.length);
const gorulen = new Set();
for (const k of kat) {
  kontrol(`${k.id}: ad, renk, ikon var`, !!k.ad && /^#[0-9a-f]{6}$/i.test(k.renk) && !!k.ikon);
  kontrol(`${k.id}: 5-8 kelime`, k.kelimeler.length >= 5 && k.kelimeler.length <= 8, k.kelimeler.length);
  for (const w of k.kelimeler) {
    kontrol(`${w.en}: en/okunus/anlam dolu`, !!w.en && !!w.okunus && !!w.anlam);
    kontrol(`${w.en}: tekrar etmiyor`, !gorulen.has(w.en));
    gorulen.add(w.en);
  }
}
kontrol("sarı/altın renk yok", !/#f5a623|#fbbf24|#eab308|#facc15|#f59e0b/i.test(html + JSON.stringify(veri)));
kontrol("ayrı localStorage anahtarı", html.includes("'sa_kat_kelime_durum'") && !/sa_kk_/.test(html.replace("(sa_kk_*)", "")));
kontrol("sesli okuma en-US", html.includes("speechSynthesis") && html.includes("u.lang = 'en-US'"));
kontrol("canonical doğru", html.includes('<link rel="canonical" href="https://sinyal-avcisi.com/kelime-kartlari">'));
kontrol("vercel.json rewrite", vercel.rewrites.some((r) => r.source === "/kelime-kartlari" && r.destination === "/kelime-kartlari.html"));
kontrol("sitemap'te", sitemap.includes("<loc>https://sinyal-avcisi.com/kelime-kartlari</loc>"));
kontrol("ana sayfa footer bağlantısı", index.includes('<a href="/kelime-kartlari"'));

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
