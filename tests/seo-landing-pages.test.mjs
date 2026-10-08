// SEO statik landing sayfaları — sitemap'te yalnızca gerçek URL'ler olduğunu,
// her landing sayfasının dizine eklenebilir temel öğeleri taşıdığını ve
// vercel.json'da temiz URL rewrite'ının bulunduğunu doğrulayan deterministik
// testler. Ağ çağrısı yok, sadece repo dosyalarını okur.

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

const SAYFALAR = ["yds-cikmis-sorular", "yokdil-sinyal-kelimeler", "yds-sinav-teknikleri"];
const sitemap = readFileSync(path.join(ROOT, "sitemap.xml"), "utf-8");
const vercel = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf-8"));

// ---- TEST: sitemap'te hash (#) URL yok ----
{
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  kontrol("sitemap.xml'de hash URL yok", locs.every((u) => !u.includes("#")), locs.filter((u) => u.includes("#")).join(", "));
}

for (const ad of SAYFALAR) {
  const dosya = path.join(ROOT, `${ad}.html`);
  const html = existsSync(dosya) ? readFileSync(dosya, "utf-8") : "";
  const url = `https://sinyal-avcisi.com/${ad}`;
  const govde = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/i, "")
    .replace(/<[^>]+>/g, " ");
  const kelime = govde.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;

  kontrol(`${ad}: dosya mevcut`, html.length > 0);
  kontrol(`${ad}: tek <h1>`, (html.match(/<h1\b/gi) || []).length === 1);
  kontrol(`${ad}: <title> var`, /<title>[^<]{10,}<\/title>/.test(html));
  kontrol(`${ad}: meta description var`, /<meta name="description" content="[^"]{50,}"/.test(html));
  kontrol(`${ad}: canonical doğru`, html.includes(`<link rel="canonical" href="${url}">`));
  kontrol(`${ad}: noindex yok`, !/noindex/i.test(html));
  kontrol(`${ad}: en az 400 kelime`, kelime >= 400, `${kelime} kelime`);
  kontrol(`${ad}: ana sayfaya link`, /href="\/"/.test(html));
  kontrol(
    `${ad}: diğer landing sayfalarına link`,
    SAYFALAR.filter((d) => d !== ad).every((d) => html.includes(`href="/${d}"`))
  );
  kontrol(`${ad}: sitemap'te`, sitemap.includes(`<loc>${url}</loc>`));
  kontrol(
    `${ad}: vercel.json rewrite`,
    vercel.rewrites.some((r) => r.source === `/${ad}` && r.destination === `/${ad}.html`)
  );
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
