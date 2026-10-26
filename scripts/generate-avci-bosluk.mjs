// Çalıştırma: node scripts/generate-avci-bosluk.mjs
//
// api/data/avci-bosluk-sorular.json okunur, index.html'deki
// AVCI_BOSLUK_HAVUZ bloğu yeniden yazılır. Blok yoksa SL_HAVUZ dizisinin
// hemen arkasına eklenir. tests/avci-cozum-motoru.test.mjs index.html'in
// bu çıktıyla aynı olduğunu (drift yok) kontrol eder.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildBoslukSource, BASLA, BITIS } from "./avci-bosluk-generator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const INDEX = path.join(ROOT, "index.html");
const KAYNAK = path.join(ROOT, "api", "data", "avci-bosluk-sorular.json");

const canonical = JSON.parse(await readFile(KAYNAK, "utf-8"));
const blok = buildBoslukSource(canonical);
let html = await readFile(INDEX, "utf-8");
const b = html.indexOf(BASLA);
if (b >= 0) {
  const s = html.indexOf(BITIS, b);
  if (s < 0) throw new Error("AVCI_BOSLUK_HAVUZ bitiş işareti bulunamadı.");
  html = html.slice(0, b) + blok + html.slice(s + BITIS.length);
} else {
  const i = html.indexOf("const SL_HAVUZ=[");
  const j = html.indexOf("\n];\n", i);
  if (i < 0 || j < 0) throw new Error("SL_HAVUZ bulunamadı.");
  html = html.slice(0, j + 4) + blok + "\n" + html.slice(j + 4);
}
await writeFile(INDEX, html, "utf-8");
console.log(`SL_BOSLUK_HAVUZ güncellendi: ${canonical.length} soru`);
