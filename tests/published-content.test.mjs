// Site + YouTube/Instagram yayın zinciri bağlantısı için deterministik
// testler. Gerçek ağa çıkılmaz — api/data/published-content.json
// (video-pipeline'ın ürettiği gerçek dosya) ve index.html/api/*.mjs'in
// kaynak metni okunup statik olarak doğrulanır.

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

// ---- TEST: api/data/published-content.json — gerçek dosya, güvenli şekil ----
{
  const jsonPath = path.join(ROOT, "api", "data", "published-content.json");
  kontrol("1) api/data/published-content.json mevcut", existsSync(jsonPath));
  if (existsSync(jsonPath)) {
    const manifest = JSON.parse(readFileSync(jsonPath, "utf-8"));
    kontrol("2) generatedAt alanı var", typeof manifest.generatedAt === "string");
    kontrol("3) items bir dizi", Array.isArray(manifest.items));
    kontrol("4) en az bir gerçek yayın kaydı var", manifest.items.length > 0, `${manifest.items.length} öğe`);
    kontrol(
      "5) her öğe SADECE beklenen public-safe alanları içeriyor (secret/internal path yok)",
      manifest.items.every((it) => {
        const keys = Object.keys(it).sort();
        return JSON.stringify(keys) === JSON.stringify(["epNum", "id", "instagramPublished", "publishedAt", "series", "title", "youtubeUrl"].sort()) || JSON.stringify(keys) === JSON.stringify(["id", "instagramPublished", "publishedAt", "series", "title", "youtubeUrl"].sort());
      })
    );
    kontrol("6) her youtubeUrl gerçekten youtube.com/shorts formatında", manifest.items.every((it) => /^https:\/\/youtube\.com\/shorts\//.test(it.youtubeUrl)));
    kontrol("7) hiçbir öğe .mp4/dosya yolu içermiyor", !JSON.stringify(manifest.items).includes(".mp4"));
    kontrol("8) hiçbir öğe 'error' alanı içermiyor (sadece başarılı yayınlar)", !manifest.items.some((it) => "error" in it));
  }
}

// ---- TEST: api/published-content.mjs — güvenli, graceful serverless endpoint ----
{
  const src = readFileSync(path.join(ROOT, "api", "published-content.mjs"), "utf-8");
  kontrol("9) sadece GET kabul ediyor", /req\.method !== ['"]GET['"]/.test(src));
  kontrol("10) dosya okunamazsa (try/catch) boş listeye düşüyor, crash etmiyor", /try\s*\{[\s\S]*readFileSync[\s\S]*\}\s*catch/.test(src));
  kontrol("11) hiçbir env/secret değişkeni referans etmiyor (process.env yok)", !src.includes("process.env"));
}

// ---- TEST: index.html — sonYayinlarRender güvenli şekilde wired ----
{
  const html = readFileSync(path.join(ROOT, "index.html"), "utf-8");
  kontrol("12) sonYayinlarRender fonksiyonu tanımlı", /function sonYayinlarRender\(\)/.test(html));
  kontrol("13) DOMContentLoaded içinde çağrılıyor (medyaRender ile birlikte)", /medyaRender\(\);\s*\n\s*sonYayinlarRender\(\);/.test(html));
  kontrol("14) /api/published-content endpoint'ine fetch atıyor", /fetch\(['"]\/api\/published-content['"]\)/.test(html));
  kontrol("15) try/catch ile sarmalı — fetch hatası sayfayı bozmuyor", /async function sonYayinlarRender\(\)\{[\s\S]{0,80}try\{/.test(html));
  kontrol("16) son-yayinlar-wrap varsayılan olarak gizli (display:none), sadece veri gelirse gösteriliyor", /id="son-yayinlar-wrap" style="display:none/.test(html));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
