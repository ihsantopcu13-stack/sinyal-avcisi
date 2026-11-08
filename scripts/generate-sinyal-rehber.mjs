// ============================================================
// SİNYAL REHBERİ ÜRETİCİ (2026-11-08)
// ============================================================
// Tek kaynak: assets/data/sinyal-kartlari.js (SINYAL_KARTLARI, 100 kelime).
// Üretir:
//   1) zitlik-baglaclari.html  — "Sık çıkan 10 zıtlık bağlacı" sayfası (statik HTML)
//   2) assets/sinyal-avcisi-100-sinyal-kelime-rehberi.pdf — 100 kelimelik PDF rehber
//      (yalnız --pdf ile; Playwright gerekir: node scripts/generate-sinyal-rehber.mjs --pdf)
// Kart verisi değişince bu betiği yeniden çalıştır. tests/sinyal-rehber.test.mjs
// sayfanın veriyle aynı olduğunu kontrol eder.
// ============================================================
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ctx = { Set };
vm.createContext(ctx);
for (const f of ["assets/modules/sinyal-soru.js", "assets/data/sinyal-kartlari.js", "assets/modules/sinyal-kartlari.js"]) {
  vm.runInContext(readFileSync(path.join(ROOT, f), "utf-8"), ctx, { filename: f });
}
const KARTLAR = vm.runInContext("SINYAL_KARTLARI", ctx);
const TIPLER = ctx.SinyalSoru.SINYAL_TIPLERI;
const { SEVIYELER, ornekParcala } = ctx.SinyalKartlari;

export const PDF_YOLU = "assets/sinyal-avcisi-100-sinyal-kelime-rehberi.pdf";
export const PDF_ADI = "100 Sinyal Kelime ve Tuzaklar Rehberi";

// Sayfadaki 10 zıtlık bağlacı ve "arkasından ne gelir" bilgisi.
export const ZITLIK_10 = [
  ["Although", "Tam cümle"],
  ["Even though", "Tam cümle"],
  ["Despite", "İsim ya da V-ing"],
  ["However", "Yeni cümle (; however,)"],
  ["Nevertheless", "Yeni cümle"],
  ["Whereas", "Tam cümle"],
  ["While", "Tam cümle"],
  ["Yet", "Tam cümle (virgülden sonra)"],
  ["On the other hand", "Yeni cümle"],
  ["On the contrary", "Yeni cümle"],
];
const TUR_SIRA = ["zitlik", "sebep", "zaman", "kosul", "ekleme", "olumsuz"];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const kartBul = (w) => {
  const k = KARTLAR.find((x) => x.word.toLowerCase() === w.toLowerCase());
  if (!k) throw new Error(`Kart bulunamadı: ${w}`);
  return k;
};
const ornekHtml = (k) => ornekParcala(k.ornek, k.word).map((p) => (p.v ? `<mark class="ss-t-${k.type}">${esc(p.m)}</mark>` : esc(p.m))).join("");

// ---------------- 1) 10 zıtlık bağlacı sayfası ----------------
function sayfa() {
  const satirlar = ZITLIK_10.map(([w, ard], i) => {
    const k = kartBul(w);
    return `<tr><td><a href="#b${i + 1}" lang="en">${esc(k.word)}</a></td><td>${esc(k.tr)}</td><td>${esc(ard)}</td></tr>`;
  }).join("\n          ");
  const bolumler = ZITLIK_10.map(([w], i) => {
    const k = kartBul(w);
    return `
    <article class="zb" id="b${i + 1}">
      <div class="zb-ust"><span class="zb-no">${i + 1}</span><h2 lang="en">${esc(k.word)}</h2><span class="zb-tr">${esc(k.tr)}</span></div>
      <div class="zb-blok"><h3>Kural</h3><p>${esc(k.islev)}</p></div>
      <div class="zb-blok"><h3>Örnek</h3><p class="zb-ornek" lang="en">${ornekHtml(k)}</p><p class="zb-ornek-tr">${esc(k.ornekTr)}</p></div>
      <div class="zb-blok zb-tuzak"><h3>Tuzak</h3><p>${esc(k.tuzak)}</p></div>
    </article>`;
  }).join("\n");
  const sablon = readFileSync(path.join(ROOT, "scripts/sinyal-rehber/zitlik-sablon.html"), "utf-8");
  return sablon
    .replace("{{TABLO}}", satirlar)
    .replace("{{BOLUMLER}}", bolumler)
    .replaceAll("{{PDF_YOLU}}", "/" + PDF_YOLU)
    .replaceAll("{{PDF_ADI}}", PDF_ADI)
    .replaceAll("{{KART_SAYISI}}", String(KARTLAR.length));
}

// ---------------- 2) PDF HTML ----------------
function pdfHtml() {
  let no = 0;
  const icindekiler = TUR_SIRA.map((t) => `<li><span class="ss-rozet ss-t-${t}">${esc(TIPLER[t].ad)}</span> <span>${KARTLAR.filter((k) => k.type === t).length} kelime</span></li>`).join("");
  const bolumler = TUR_SIRA.map((t) => {
    const liste = KARTLAR.filter((k) => k.type === t);
    const kartlar = liste.map((k) => {
      no++;
      return `<div class="pk ss-t-${t}">
        <div class="pk-ust"><span class="pk-no">${no}</span><b lang="en">${esc(k.word)}</b><span class="pk-tr">${esc(k.tr)}</span><span class="pk-sv">${esc(SEVIYELER[k.level])}</span></div>
        <p><i>Kural:</i> ${esc(k.islev)}</p>
        <p class="pk-orn"><i>Örnek:</i> <span lang="en">${ornekHtml(k)}</span><br><span class="pk-orn-tr">${esc(k.ornekTr)}</span></p>
        <p class="pk-tuzak"><i>Tuzak:</i> ${esc(k.tuzak)}</p>
      </div>`;
    }).join("\n");
    return `<section class="pt"><h2><span class="ss-rozet ss-t-${t}">${esc(TIPLER[t].ad)}</span> ${esc(TIPLER[t].ozet)}</h2>${kartlar}</section>`;
  }).join("\n");
  const sablon = readFileSync(path.join(ROOT, "scripts/sinyal-rehber/pdf-sablon.html"), "utf-8");
  const tema = readFileSync(path.join(ROOT, "assets/sinyal-tema.css"), "utf-8");
  return sablon.replace("{{TEMA}}", tema).replace("{{ICINDEKILER}}", icindekiler).replace("{{BOLUMLER}}", bolumler)
    .replaceAll("{{PDF_ADI}}", PDF_ADI).replaceAll("{{KART_SAYISI}}", String(KARTLAR.length));
}

export function uret() { return { sayfa: sayfa(), pdf: pdfHtml() }; }

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { sayfa: s, pdf } = uret();
  writeFileSync(path.join(ROOT, "zitlik-baglaclari.html"), s);
  console.log("yazıldı: zitlik-baglaclari.html");
  if (process.argv.includes("--pdf")) {
    const { createRequire } = await import("node:module");
    const { chromium } = createRequire(import.meta.url)("playwright"); // global kurulum da bulunur
    const tmp = path.join(ROOT, ".rehber-tmp");
    mkdirSync(tmp, { recursive: true });
    const htmlYol = path.join(tmp, "rehber.html");
    writeFileSync(htmlYol, pdf);
    const b = await chromium.launch();
    const p = await b.newPage();
    await p.goto("file://" + htmlYol, { waitUntil: "networkidle" });
    await p.pdf({
      path: path.join(ROOT, PDF_YOLU), format: "A4", printBackground: true,
      margin: { top: "16mm", bottom: "18mm", left: "14mm", right: "14mm" },
      displayHeaderFooter: true, headerTemplate: "<span></span>",
      footerTemplate: `<div style="width:100%;font:9px sans-serif;color:#4F5F57;padding:0 14mm;display:flex;justify-content:space-between"><span>Sinyal Avcısı · sinyal-avcisi.com · Ücretsiz</span><span class="pageNumber"></span></div>`,
    });
    await b.close();
    console.log("yazıldı:", PDF_YOLU);
  }
}
