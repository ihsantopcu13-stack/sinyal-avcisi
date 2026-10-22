// Puan hedefine göre YDS soruları (/puan-hedefi) — soru verisinin geçerli
// olduğunu, her sorunun Kural → Örnek → Tuzak taşıdığını ve sayfanın
// 50 / 70 / 90-100 sekmelerini içerdiğini doğrular. Ağ çağrısı yok.

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

const html = readFileSync(path.join(ROOT, "puan-hedefi.html"), "utf-8");
const vercel = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf-8"));
const sitemap = readFileSync(path.join(ROOT, "sitemap.xml"), "utf-8");

const m = html.match(/<script type="application\/json" id="ph-sorular">([\s\S]*?)<\/script>/);
kontrol("soru verisi bloğu var", !!m);
let sorular = [];
try { sorular = JSON.parse(m[1]); } catch (e) { kontrol("soru verisi JSON olarak okunur", false, e.message); }

const TIPLER = ["kelime", "dilbilgisi", "cloze", "cümle tamamlama", "çeviri (İng → Tr)", "çeviri (Tr → İng)",
  "okuma", "diyalog", "yakın anlam", "paragraf tamamlama", "anlamı bozan cümle"];

kontrol("90-100 için en az 30 soru", sorular.filter((q) => q.seviye === "90").length >= 30);
kontrol("70 için en az 10 soru", sorular.filter((q) => q.seviye === "70").length >= 10);
for (const sev of ["90", "70"]) {
  const tipler = new Set(sorular.filter((q) => q.seviye === sev).map((q) => q.tip));
  kontrol(`${sev}: 11 soru tipinin hepsi var`, TIPLER.every((t) => tipler.has(t)), [...tipler].join(", "));
  const dagilim = [0, 0, 0, 0, 0];
  sorular.filter((q) => q.seviye === sev).forEach((q) => dagilim[q.dogru]++);
  kontrol(`${sev}: doğru cevaplar tek harfte toplanmıyor`, Math.max(...dagilim) <= Math.ceil(dagilim.reduce((a, b) => a + b) / 2), dagilim.join("/"));
}

const idler = new Set();
for (const q of sorular) {
  const hatalar = [];
  if (idler.has(q.id)) hatalar.push("tekrar eden id");
  idler.add(q.id);
  if (!["70", "90"].includes(q.seviye)) hatalar.push("seviye");
  if (!TIPLER.includes(q.tip)) hatalar.push("tip");
  if (!q.soru || q.soru.length < 20) hatalar.push("soru");
  if (!Array.isArray(q.secenekler) || q.secenekler.length !== 5 || q.secenekler.some((s) => !s)) hatalar.push("5 şık");
  if (new Set(q.secenekler).size !== 5) hatalar.push("şıklar farklı olmalı");
  if (!Number.isInteger(q.dogru) || q.dogru < 0 || q.dogru > 4) hatalar.push("dogru");
  for (const alan of ["kural", "ornek", "tuzak"]) if (!q[alan] || q[alan].length < 15) hatalar.push(alan);
  kontrol(`${q.id}: soru alanları geçerli`, hatalar.length === 0, hatalar.join(", ") || undefined);
}

kontrol("50 / 70 / 90-100 sekmeleri var", ["50", "70", "90"].every((s) => html.includes(`data-seviye="${s}"`)));
kontrol("50 sekmesi 50 puan programına bağlı", html.includes('href="/50-puan-programi"'));
kontrol("tahmin uyarısı var", /kesin çıkar/.test(html) && /tahmin/.test(html));
kontrol("ÖSYM kontrol hatırlatması var", /ÖSYM'den kontrol et/.test(html));
kontrol("sarı/altın renk yok", !/#f5a623|#fbbf24|#eab308|#facc15/i.test(html));
kontrol("canonical doğru", html.includes('<link rel="canonical" href="https://sinyal-avcisi.com/puan-hedefi">'));
kontrol("vercel.json rewrite", vercel.rewrites.some((r) => r.source === "/puan-hedefi" && r.destination === "/puan-hedefi.html"));
kontrol("sitemap'te", sitemap.includes("<loc>https://sinyal-avcisi.com/puan-hedefi</loc>"));

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
