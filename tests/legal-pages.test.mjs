// OAuth branding hazırlığı — Gizlilik Politikası / Kullanım Şartları
// sayfalarının varlığını, routing'ini ve güvenliğini doğrulayan
// deterministik testler. Ağ çağrısı yok, sadece repo dosyalarını okur.

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

const SECRET_DESENLERI = [
  /CLIENT_SECRET/i,
  /REFRESH_TOKEN/i,
  /service_role/i,
  /API_KEY\s*[:=]/i,
  /sk-[A-Za-z0-9]{10,}/,
  /AIza[0-9A-Za-z_-]{20,}/,
  /ya29\.[0-9A-Za-z_-]{10,}/,
];

// ---- TEST: privacy.html / terms.html repo kökünde mevcut ----
{
  const privacyVar = existsSync(path.join(ROOT, "privacy.html"));
  const termsVar = existsSync(path.join(ROOT, "terms.html"));
  kontrol("1) privacy.html repo kökünde mevcut", privacyVar);
  kontrol("2) terms.html repo kökünde mevcut", termsVar);
}

const privacyHtml = existsSync(path.join(ROOT, "privacy.html")) ? readFileSync(path.join(ROOT, "privacy.html"), "utf-8") : "";
const termsHtml = existsSync(path.join(ROOT, "terms.html")) ? readFileSync(path.join(ROOT, "terms.html"), "utf-8") : "";

// ---- TEST: gerçek legal metin (sadece SPA fallback değil) ----
{
  kontrol(
    "3) privacy.html gerçek gizlilik metni içeriyor",
    /Gizlilik Politikası/.test(privacyHtml) && /Sinyal Avcısı/.test(privacyHtml)
  );
  kontrol(
    "4) terms.html gerçek kullanım şartları metni içeriyor",
    /Kullanım Şartları/.test(termsHtml) && /Sinyal Avcısı/.test(termsHtml)
  );
}

// ---- TEST: hiçbir secret pattern'i public sayfalara sızmamış ----
{
  const privacySizinti = SECRET_DESENLERI.some((d) => d.test(privacyHtml));
  const termsSizinti = SECRET_DESENLERI.some((d) => d.test(termsHtml));
  kontrol("5) privacy.html'de secret pattern'i yok", !privacySizinti);
  kontrol("6) terms.html'de secret pattern'i yok", !termsSizinti);
}

// ---- TEST: answer-key (dogru_index / sorular.json) legal sayfalara sızmamış ----
{
  const privacyLeak = /dogru_index/i.test(privacyHtml) || /sorular\.json/i.test(privacyHtml);
  const termsLeak = /dogru_index/i.test(termsHtml) || /sorular\.json/i.test(termsHtml);
  kontrol("7) privacy.html'de answer-key referansı yok", !privacyLeak);
  kontrol("8) terms.html'de answer-key referansı yok", !termsLeak);
}

// ---- TEST: vercel.json clean-URL rewrite'ları tanımlı ----
{
  const vercelJson = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf-8"));
  const rewrites = vercelJson.rewrites || [];
  const privacyRewrite = rewrites.some((r) => r.source === "/privacy" && r.destination === "/privacy.html");
  const termsRewrite = rewrites.some((r) => r.source === "/terms" && r.destination === "/terms.html");
  kontrol("9) vercel.json /privacy -> /privacy.html rewrite'ı var", privacyRewrite);
  kontrol("10) vercel.json /terms -> /terms.html rewrite'ı var", termsRewrite);
}

// ---- TEST: ana sayfa footer'ında privacy/terms linkleri var ----
{
  const indexHtml = readFileSync(path.join(ROOT, "index.html"), "utf-8");
  kontrol("11) index.html footer'ında /privacy linki var", /href="\/privacy"/.test(indexHtml));
  kontrol("12) index.html footer'ında /terms linki var", /href="\/terms"/.test(indexHtml));
}

// ---- TEST: automation/ hâlâ Vercel deployment'ından hariç (regresyon koruması) ----
{
  const vercelignore = readFileSync(path.join(ROOT, ".vercelignore"), "utf-8");
  kontrol("13) .vercelignore hâlâ automation/ satırını içeriyor", /^automation\/\s*$/m.test(vercelignore));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
