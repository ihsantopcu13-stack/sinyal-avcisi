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

// ---- TEST: privacy.html kodun yaptığını anlatıyor (anonim oturum, e-kitap formu) ----
{
  kontrol("14) 'sunucularımıza gönderilmez' / 'cihazınızdan çıkmaz' çelişkisi kalmadı", !/sunucularımıza gönderilmez|cihazınızdan çıkmaz/.test(privacyHtml));
  kontrol("15) kampanya bilgisi için 'sunucuya kaydedilmez' ifadesi kalmadı", !/sunucuya kaydedilmez/.test(privacyHtml));
  kontrol("16) anonim oturum + kurtarma kodu bölümü var (Supabase)", /id="anonim-oturum"/.test(privacyHtml) && /Supabase üzerinde anonim bir oturum/.test(privacyHtml) && /kurtarma kodu/.test(privacyHtml));
  kontrol("17) 30 Günlük Metin Fetih Kılavuzu formu adıyla ve Resend ile anılıyor", /30 Günlük Metin Fetih Kılavuzu \(ücretsiz e-kitap\)/.test(privacyHtml) && /Resend aracılığıyla/.test(privacyHtml));
}

// ---- TEST: çerez bandı — eşit düğmeler, GA/PostHog adı, Reddet GA çerezlerini siler ----
{
  const indexHtml = readFileSync(path.join(ROOT, "index.html"), "utf-8");
  const i = indexHtml.indexOf("// 9. COOKIE / KVKK BANNER"), j = indexHtml.indexOf("// 10. AKILLI GERİ BİLDİRİM", i);
  const bant = i > -1 && j > i ? indexHtml.slice(i, j) : "";
  const dugmeler = [...bant.matchAll(/<button[^>]*onclick="saCerez(Kabul|Red)\(this\)"[^>]*>/g)].map((m) => m[0]);
  kontrol("18) bantta iki düğme, ikisi de aynı sınıf (cb-btn), satır içi stil yok", dugmeler.length === 2 && dugmeler.every((d) => /class="cb-btn"/.test(d) && !/style=/.test(d)));
  kontrol("19) düğmeler koyu adaçayı, aynı boyut ve ağırlık (tek kural)", /\.cb-btn\{min-width:120px;min-height:44px;[^}]*background:var\(--ad-koyu,#365C4B\);color:#fff;[^}]*font-weight:700/.test(bant));
  kontrol("20) bant metninde Google Analytics, PostHog ve amaç (ölçüm) geçiyor", /class="cb-metin">[^<]*Ölçüm için Google Analytics ve PostHog/.test(bant));
  kontrol("21) Reddet GA çerezlerini siliyor", /window\.saCerezRed=function[\s\S]*?gaCerezleriniSil\(\)[\s\S]*?opt_out_capturing/.test(bant));
  kontrol("22) bant açıkken sayfa altına boşluk (içerik bandın altında kalmaz)", /bantBoslukAyarla\(\);\s*\n\s*\},gecikme\)/.test(bant) && /document\.body\.style\.paddingBottom=b\.offsetHeight\+'px'/.test(bant));

  kontrol("25) kısa ekranda bant hero düğmesini örtecekse gizli başlıyor, kaydırınca açılıyor; altbilgiden açılış hemen görünür",
    /if\(gecikme>0&&heroDugmesiniOrter\(div\)\)\{\s*\n\s*div\.style\.visibility='hidden'/.test(bant) && /window\.addEventListener\('scroll',kontrol,\{passive:true\}\)/.test(bant) && /return r\.bottom>window\.innerHeight-bant\.offsetHeight;/.test(bant) && /bannerGoster\(0\);/.test(bant));

  // gaCerezleriniSil davranışı (sahte document.cookie)
  const fnI = bant.indexOf("function gaCerezleriniSil()"), fnJ = bant.indexOf("window.saGaCerezleriniSil", fnI);
  const yazilan = [];
  const ctx = { document: { get cookie() { return "_ga=GA1.1.1; _ga_PM25HTL46K=GS1.1; sa_x=1; _gid=GA1.2"; }, set cookie(v) { yazilan.push(v); } }, location: { hostname: "www.sinyal-avcisi.com" } };
  let silinen = [];
  try { const vm = await import("node:vm"); vm.createContext(ctx); vm.runInContext(bant.slice(fnI, fnJ) + "\n;globalThis.__sil=gaCerezleriniSil;", ctx); silinen = ctx.__sil(); } catch (e) { silinen = ["HATA " + e.message]; }
  kontrol("23) yalnız GA çerezleri seçiliyor", JSON.stringify(silinen) === JSON.stringify(["_ga", "_ga_PM25HTL46K", "_gid"]), JSON.stringify(silinen));
  kontrol("24) her GA çerezi alan adsız, www, kök ve .kök için Max-Age=0 ile siliniyor", ["", "; domain=www.sinyal-avcisi.com", "; domain=sinyal-avcisi.com", "; domain=.sinyal-avcisi.com"].every((d) => yazilan.includes("_ga_PM25HTL46K=; Max-Age=0; path=/" + d)) && !yazilan.some((y) => y.startsWith("sa_x")));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
