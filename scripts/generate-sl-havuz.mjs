// SOURCE OF TRUTH — AŞAMA 3: canonical'dan frontend mirror'ı yeniden üretir.
//
// Çalıştırma: node scripts/generate-sl-havuz.mjs
//
// api/data/sorular.json (TEK canonical kaynak) okunur, index.html
// içindeki "const SL_HAVUZ=[ ... ];" bloğu bununla değiştirilir. SL_HAVUZ
// artık elle düzenlenmez — bir soru değiştiğinde/eklendiğinde önce
// api/data/sorular.json güncellenir, sonra bu script çalıştırılır.
//
// tests/sot-mirror.test.mjs bu script'i ÇALIŞTIRMAZ (index.html'i CI'da
// değiştirmemek için) — bunun yerine aynı buildSlHavuzSource() çıktısını
// index.html'in mevcut içeriğiyle karşılaştırıp "taze mi" (drift var mı)
// diye kontrol eder.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildSlHavuzSource } from "./sl-havuz-generator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const INDEX_HTML = path.join(REPO_ROOT, "index.html");
const CANONICAL_PATH = path.join(REPO_ROOT, "api", "data", "sorular.json");

const START_MARKER = "const SL_HAVUZ=[";
const END_MARKER = "\n];";

async function main() {
  const canonical = JSON.parse(await readFile(CANONICAL_PATH, "utf-8"));
  const yeniBlok = buildSlHavuzSource(canonical);

  const html = await readFile(INDEX_HTML, "utf-8");
  const dosyaCRLFKullaniyor = html.includes("\r\n");
  const startIdx = html.indexOf(START_MARKER);
  if (startIdx === -1) throw new Error("SL_HAVUZ bulunamadı — index.html değişmiş olabilir.");
  const endIdx = html.indexOf(END_MARKER, startIdx);
  if (endIdx === -1) throw new Error("SL_HAVUZ dizisinin sonu bulunamadı.");

  // index.html CRLF kullanıyorsa üretilen blok da CRLF olmalı — aksi halde
  // dosyada satır sonu stili karışır (git core.autocrlf her checkout'ta
  // tekrar normalize etse de gereksiz/karışık diff'e yol açar).
  const eklenecekBlok = dosyaCRLFKullaniyor ? yeniBlok.replace(/\n/g, "\r\n") : yeniBlok;
  const yeniHtml = html.slice(0, startIdx) + eklenecekBlok + html.slice(endIdx + END_MARKER.length);
  await writeFile(INDEX_HTML, yeniHtml, "utf-8");
  console.log(`SL_HAVUZ güncellendi: ${canonical.length} soru, ${INDEX_HTML}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
