#!/usr/bin/env node
// ============================================================
// AVCI ÖSYM DNA — derleme anı analizi (FAZ 1)
// ============================================================
// Kanonik soru bankasını (api/data/sorular.json) okur, DNA'yı
// api/data/soru-dna.json yan dosyasına yazar. sorular.json'a DOKUNMAZ.
//
//   node scripts/dna-analyze.mjs            → üret / güncelle (sadece değişen sorular)
//   node scripts/dna-analyze.mjs --kontrol  → yazmaz; DNA dosyası güncel değilse exit 1 (CI)
//
// COST GUARD: L0 cache (içerik hash + sürümler) → L1 kural → L3 LLM KAPALI.
// Aynı soru aynı sürümle tekrar çalıştırılırsa hiçbir kayıt değişmez,
// dosya bayt bayt aynı kalır (idempotent). LLM çağrısı: 0.
// ============================================================

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dnaToplu, dosyaSerilestir } from "../api/_avciDna.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SORULAR = path.join(ROOT, "api", "data", "sorular.json");
const DNA = path.join(ROOT, "api", "data", "soru-dna.json");

const kontrolModu = process.argv.includes("--kontrol");
const sorular = JSON.parse(readFileSync(SORULAR, "utf-8"));
const oncekiMetin = existsSync(DNA) ? readFileSync(DNA, "utf-8") : null;
const onceki = oncekiMetin ? JSON.parse(oncekiMetin) : null;

const { dosya, istatistik } = dnaToplu(sorular, onceki, { simdi: new Date().toISOString() });
const yeniMetin = dosyaSerilestir(dosya);
const degisti = yeniMetin !== oncekiMetin;

const yuzde = (a, b) => (b ? Math.round((a / b) * 100) : 0) + "%";
console.log("AVCI DNA analizi");
console.log(`  soru: ${istatistik.toplam}  cache hit: ${istatistik.cache_hit} (${yuzde(istatistik.cache_hit, istatistik.toplam)})`);
console.log(`  kural ile çözülen: ${istatistik.rule_resolved}  needs_review: ${istatistik.needs_review}  failed: ${istatistik.failed}  pending: ${istatistik.pending}`);
console.log(`  güven: high ${istatistik.confidence.high} / medium ${istatistik.confidence.medium} / low ${istatistik.confidence.low}`);
console.log(`  LLM çağrısı: ${istatistik.llm_calls}  fallback gereken: ${istatistik.fallback_needed} ${JSON.stringify(istatistik.fallback_reasons)}`);

if (kontrolModu) {
  if (degisti) { console.error("✕ api/data/soru-dna.json güncel değil — `node scripts/dna-analyze.mjs` çalıştırın."); process.exit(1); }
  console.log("✓ DNA dosyası güncel.");
} else if (degisti) {
  writeFileSync(DNA, yeniMetin);
  console.log(`✓ yazıldı: api/data/soru-dna.json`);
} else {
  console.log("✓ değişiklik yok (tüm sorular cache'ten).");
}
