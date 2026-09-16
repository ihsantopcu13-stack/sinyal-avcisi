// ============================================================
// THREADS GÜNLÜK PAYLAŞIM — data/sorular.json'daki gerçek YDS/YÖKDİL
// soru havuzundan günlük bir "sinyal ipucu" metni üretir.
//
// Diğer platformlardan bilinçli olarak FARKLI format: Günün Sorusu
// (Instagram/Facebook) tam 4 şıklı quiz kartı; Threads metin ağırlıklı,
// hızlı taranan bir platform olduğu için burada tek bir sinyal kelimeyi
// kısa bir "ipucu" olarak anlatıyoruz — quiz şıkları yok.
//
// Aynı gün video pipeline'ı (offset 0) ve Günün Sorusu (offset 29) ile
// aynı soruyu tekrar etmemek için farklı bir offset (45) kullanıyoruz.
// Uydurma içerik yok — soru, sinyal kelime ve açıklama birebir gerçek
// soru havuzundan.
// ============================================================

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { nicheHashtag } from "./_seo.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "out");
// SOURCE OF TRUTH AŞAMA 5: tek canonical kaynak.
const SORULAR_PATH = path.join(__dirname, "..", "..", "..", "api", "data", "sorular.json");

const THREADS_OFFSET = 45;
const KARAKTER_LIMIT = 480; // Threads gönderi sınırı 500 — pay bırakıyoruz

function gunSayisi() {
  return Math.floor(Date.now() / 86_400_000);
}

// Rotasyon fiziksel array sırasına değil, stable id'ye göre sıralanmış
// bir kopyaya göre yapılır (bkz. generate-script.mjs'teki aynı desen).
function sorularStableSirali(sorular) {
  return [...sorular].sort((a, b) => (a.id || "").localeCompare(b.id || ""));
}

export function gununSorusunuSec(sorular) {
  const sirali = sorularStableSirali(sorular);
  return sirali[(gunSayisi() + THREADS_OFFSET) % sirali.length];
}

function metniKisalt(metin, limit) {
  if (metin.length <= limit) return metin;
  return metin.slice(0, limit - 1).trimEnd() + "…";
}

export function threadsMetniOlustur(soru) {
  const niche = nicheHashtag(soru.sinyal);
  const hashtags = ["#YDS", "#YÖKDİL", niche].filter(Boolean).join(" ");

  const govde = [
    `🎯 Sinyal ipucu: "${soru.sinyal}"`,
    ``,
    `"${soru.soru_en}"`,
    ``,
    soru.aciklama_tr,
    ``,
    `Bu sinyali gördüğünde tuzağı 10 saniyede yakalarsın. Sinyal Avcısı'nda tamamen ücretsiz, kayıt bile istemeden öğren.`,
    ``,
    hashtags,
  ].join("\n");

  return metniKisalt(govde, KARAKTER_LIMIT);
}

export async function threadsPostUret() {
  const sorular = JSON.parse(await readFile(SORULAR_PATH, "utf-8"));
  const soru = gununSorusunuSec(sorular);
  const metin = threadsMetniOlustur(soru);

  await mkdir(OUT_DIR, { recursive: true });
  const cikti = { soru, metin };
  await writeFile(path.join(OUT_DIR, "threads-post.json"), JSON.stringify(cikti, null, 2));
  console.log("Threads metni hazır:\n", metin);
  return cikti;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  threadsPostUret().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
