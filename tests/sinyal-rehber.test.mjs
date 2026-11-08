// Sinyal rehberi: /zitlik-baglaclari sayfası ve 100 kelimelik PDF.
// Sayfa scripts/generate-sinyal-rehber.mjs ile üretilir; veri değişip sayfa yenilenmezse bu test düşer.
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uret, ZITLIK_10, PDF_YOLU } from "../scripts/generate-sinyal-rehber.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let gecen = 0, kalan = 0;
function kontrol(ad, kosul, ek) { if (kosul) { gecen++; } else { kalan++; console.error("HATA:", ad, ek || ""); } }

const { sayfa, pdf } = uret();
const disk = readFileSync(path.join(ROOT, "zitlik-baglaclari.html"), "utf-8");
kontrol("sayfa üretilmiş haliyle aynı (node scripts/generate-sinyal-rehber.mjs çalıştır)", disk === sayfa);
kontrol("10 bağlaç", ZITLIK_10.length === 10);
for (const [w] of ZITLIK_10) kontrol("sayfada " + w, disk.includes(`>${w}</h2>`), w);
kontrol("şablon yer tutucusu kalmadı", !/\{\{[A-Z_]+\}\}/.test(disk) && !/\{\{[A-Z_]+\}\}/.test(pdf));
kontrol("PDF linki doğrudan indirme", disk.includes(`href="/${PDF_YOLU}" download`));
kontrol("PDF dosyası var", existsSync(path.join(ROOT, PDF_YOLU)) && statSync(path.join(ROOT, PDF_YOLU)).size > 50000);
kontrol("PDF HTML 100 kart", (pdf.match(/class="pk ss-t-/g) || []).length === 100);
const temiz = disk.replace(/<[^>]+>/g, " ").toLowerCase();
kontrol("ödeme/üyelik duvarı yok", !/(satın al|premium|abone ol|ödeme yap|giriş yap)/.test(temiz));
kontrol("emoji yok", !/\p{Extended_Pictographic}/u.test(disk));
const vercel = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf-8"));
kontrol("vercel rewrite", (vercel.rewrites || []).some((r) => r.source === "/zitlik-baglaclari" && r.destination === "/zitlik-baglaclari.html"));
kontrol("sitemap", readFileSync(path.join(ROOT, "sitemap.xml"), "utf-8").includes("https://sinyal-avcisi.com/zitlik-baglaclari</loc>"));

console.log(`sinyal-rehber: ${gecen} geçti, ${kalan} kaldı`);
if (kalan) process.exit(1);
