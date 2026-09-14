// ============================================================
// GÜNÜN SORUSU KARTI — data/sorular.json'daki gerçek YDS/YÖKDİL
// sorularından birini seçip 1080x1080 PNG kart olarak render eder.
// Uydurma soru üretmiyoruz — generate-script.mjs'in izlediği prensibin
// aynısı: soru, şıklar, doğru cevap ve açıklama birebir gerçek soru
// havuzundan gelir.
//
// Video pipeline'ın günlük soru seçimiyle (gunSayisi() % length, offset 0)
// AYNI GÜN aynı soruyu tekrar etmemek için farklı bir offset (29)
// kullanıyoruz — deterministik, ekstra state dosyası gerekmez.
// ============================================================

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import puppeteer from "puppeteer";
import { nicheHashtag } from "./_seo.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "out");
const SORULAR_PATH = path.join(ROOT, "data", "sorular.json");

const GUNUN_SORUSU_OFFSET = 29;

function gunSayisi() {
  return Math.floor(Date.now() / 86_400_000);
}

export function gununSorusunuSec(sorular) {
  return sorular[(gunSayisi() + GUNUN_SORUSU_OFFSET) % sorular.length];
}

// soru_en içindeki sinyal kelimeyi (despite, however, must have...) amber
// renkle vurgulamak için basit, case-insensitive bir sarmalama.
function sinyalVurgula(soruEn, sinyal) {
  if (!sinyal) return escapeHtml(soruEn);
  const escaped = escapeHtml(soruEn);
  const escapedSinyal = escapeHtml(sinyal);
  const re = new RegExp(`(${escapedSinyal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i");
  if (!re.test(escaped)) return escaped;
  return escaped.replace(re, '<span style="color:#f5a623">$1</span>');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function kartHtmlUret(soru) {
  const harfler = ["A", "B", "C", "D"];
  const secenekSatirlari = soru.secenekler_tr
    .map(
      (s, i) => `
        <div style="display:flex;align-items:flex-start;gap:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:16px 20px">
          <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:rgba(245,166,35,.14);border:1.5px solid #f5a623;color:#f5a623;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center">${harfler[i]}</div>
          <div style="font-family:'IBM Plex Sans',sans-serif;font-weight:500;font-size:21px;line-height:1.45;color:rgba(255,255,255,.9);padding-top:4px">${escapeHtml(s)}</div>
        </div>`
    )
    .join("\n");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&family=Space+Grotesk:wght@600;700&display=swap">
<style>
  body{margin:0}
  .kart{width:1080px;height:1080px;position:relative;overflow:hidden;background:radial-gradient(ellipse 820px 640px at 50% -8%,#16295c,#0d1b3e 60%);font-family:'IBM Plex Sans',Arial,sans-serif;box-sizing:border-box;color:#fff}
</style>
</head>
<body>
<div class="kart">

  <svg width="1080" height="1080" style="position:absolute;top:0;left:0" viewBox="0 0 1080 1080" fill="none">
    <circle cx="920" cy="960" r="200" stroke="#f5a623" stroke-width="1.5" opacity="0.08"/>
    <circle cx="920" cy="960" r="360" stroke="#f5a623" stroke-width="1.5" opacity="0.06"/>
  </svg>

  <div style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;flex-direction:column;padding:56px 64px;box-sizing:border-box">

    <!-- header -->
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:10px">
        <svg width="30" height="30" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="27" stroke="#f5a623" stroke-width="4"/>
          <circle cx="32" cy="32" r="15" stroke="#f5a623" stroke-width="4"/>
          <circle cx="32" cy="32" r="5" fill="#f5a623"/>
        </svg>
        <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:20px">
          SİNYAL <span style="color:#f5a623">AVCISI</span>
        </div>
      </div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:14px;letter-spacing:.1em;color:rgba(255,255,255,.55);text-transform:uppercase">
        YDS · YÖKDİL
      </div>
    </div>

    <!-- eyebrow -->
    <div style="margin-top:36px;display:inline-flex;align-self:flex-start;align-items:center;gap:8px;background:rgba(245,166,35,.12);border:1px solid rgba(245,166,35,.4);border-radius:999px;padding:8px 20px">
      <span style="width:8px;height:8px;border-radius:50%;background:#f5a623"></span>
      <span style="font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:15px;letter-spacing:.08em;color:#f5a623;text-transform:uppercase">GÜNÜN SORUSU</span>
    </div>

    <!-- english sentence -->
    <div style="margin-top:28px;font-family:'IBM Plex Serif',serif;font-weight:700;font-size:33px;line-height:1.42;letter-spacing:-.005em;text-wrap:balance">
      "${sinyalVurgula(soru.soru_en, soru.sinyal)}"
    </div>

    <!-- turkish question -->
    <div style="margin-top:22px;font-family:'IBM Plex Sans',sans-serif;font-weight:600;font-size:22px;color:rgba(255,255,255,.72)">
      ${escapeHtml(soru.soru_tr)}
    </div>

    <!-- options -->
    <div style="margin-top:26px;display:flex;flex-direction:column;gap:12px">
      ${secenekSatirlari}
    </div>

    <!-- spacer -->
    <div style="flex:1"></div>

    <!-- footer CTA -->
    <div style="display:flex;align-items:center;justify-content:center;gap:12px;background:#f5a623;color:#0d1b3e;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:24px;letter-spacing:.01em;padding:18px 32px;border-radius:999px;box-shadow:0 16px 40px rgba(245,166,35,.3)">
      Cevap için yoruma bak 👇
    </div>

  </div>
</div>
</body>
</html>`;
}

export async function kartUret() {
  const sorular = JSON.parse(await readFile(SORULAR_PATH, "utf-8"));
  const soru = gununSorusunuSec(sorular);

  await mkdir(OUT_DIR, { recursive: true });

  const html = kartHtmlUret(soru);
  const htmlPath = path.join(OUT_DIR, "gunun-sorusu.html");
  await writeFile(htmlPath, html, "utf-8");

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
    const pngPath = path.join(OUT_DIR, "gunun-sorusu.png");
    await page.screenshot({ path: pngPath, type: "png" });
    console.log("Günün Sorusu kartı hazır:", pngPath);

    const dogruHarf = ["A", "B", "C", "D"][soru.dogru_index] || "A";
    const cikti = {
      soru,
      dogruHarf,
      niceHashtag: nicheHashtag(soru.sinyal),
      pngPath,
    };
    await writeFile(
      path.join(OUT_DIR, "gunun-sorusu-meta.json"),
      JSON.stringify(cikti, null, 2)
    );
    return cikti;
  } finally {
    await browser.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  kartUret().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
