// ============================================================
// MASTER VİDEO PAKETİ #2-#30 — toplu üretim script'i.
// Her lesson için: 8 narasyon satırını ElevenLabs (Murat, speed 1.2)
// ile seslendirir, ffprobe ile gerçek süreleri ölçer, #1'de kanıtlanan
// formülle sceneFrames + countdownStart hesaplar, ardından Remotion
// CLI ile --props olarak videoyu render eder. out/ klasöründeki video
// dosyaları KALICI — yayınlandıktan sonra silinmez.
// ============================================================

import { writeFile, mkdir, readFile, access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LESSONS } from "../data/master-lessons.mjs";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FPS = 30;

async function ffprobeDuration(filePath) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", filePath,
  ]);
  return parseFloat(stdout.trim());
}

async function ttsMurat(text, outPath) {
  // speed 1.05 — kullanıcının 2026-09-11 A/B testiyle onayladığı ses standardı
  // (Murat, eleven_multilingual_v2, stability 0.5, similarity_boost 0.75).
  const res = await fetch("https://sinyal-avcisi.com/api/tts-eleven", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, speed: 1.05 }),
  });
  if (!res.ok) throw new Error(`TTS hata: ${res.status} ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
  return ffprobeDuration(outPath);
}

function secToFrames(sec) {
  return Math.ceil(sec * FPS);
}

async function produceLesson(l) {
  const audioDir = path.join(ROOT, "public", l.audioFolder);
  await mkdir(audioDir, { recursive: true });

  const order = ["hook", "kural", "neden", "tuzak", "ornek", "soru", "cozum", "avci"];
  const audioFrames = {};
  for (let i = 0; i < order.length; i++) {
    const key = order[i];
    const fileId = l.audioFiles[i];
    const filePath = path.join(audioDir, `${fileId}.mp3`);
    let dur;
    const alreadyExists = await access(filePath).then(() => true).catch(() => false);
    if (alreadyExists) {
      dur = await ffprobeDuration(filePath);
      console.log(`  [#${l.epNum}] ${fileId}: zaten var, atlandı (${dur.toFixed(2)}s)`);
    } else {
      dur = await ttsMurat(l.narration[key], filePath);
      console.log(`  [#${l.epNum}] ${fileId}: ${dur.toFixed(2)}s (${secToFrames(dur)}f)`);
    }
    audioFrames[key] = secToFrames(dur);
  }

  // #1'de kanıtlanan pacing formülü: her sahne = narasyon + ~15f tampon;
  // mini-soru sahnesi narasyon + 3-2-1 countdown (54f) + 10f tampon.
  const pad = 15;
  const scene1 = 45; // HOOK — sabit, görsel ağırlıklı (bkz. #1)
  const scene2 = audioFrames.kural + pad;
  const scene3 = audioFrames.neden + pad;
  const scene4 = audioFrames.tuzak + pad;
  const scene5 = audioFrames.ornek + pad;
  const countdownStart = audioFrames.soru;
  const scene6 = countdownStart + 54 + 10;
  const scene7 = audioFrames.cozum + 20;
  const scene8 = audioFrames.avci + 15;
  const scene9 = 60; // FINAL BRAND — sabit

  l.sceneFrames = [scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8, scene9];
  l.countdownStart = countdownStart;
  l.audioFrames = audioFrames; // altyazı senkronu için (bkz. captionUtils.jsx)
  l.exampleRevealAt = Math.round(scene5 * 0.4);
  l.breakdownRevealAt = Math.round(scene5 * 0.65);

  const totalSec = l.sceneFrames.reduce((a, b) => a + b, 0) / FPS;
  console.log(`  [#${l.epNum}] toplam: ${totalSec.toFixed(1)}s`);

  // Render
  const propsPath = path.join(ROOT, "out", `props-${l.id}.json`);
  await mkdir(path.join(ROOT, "out"), { recursive: true });
  await writeFile(propsPath, JSON.stringify({ lesson: l }, null, 2));

  const outFile = path.join(ROOT, "out", `master-${String(l.epNum).padStart(2, "0")}-${l.id}.mp4`);
  console.log(`  [#${l.epNum}] render ediliyor -> ${outFile}`);
  await execFileAsync(
    "npx",
    ["remotion", "render", "src/index.jsx", "MasterLessonReel", outFile, "--props", propsPath],
    { cwd: ROOT, shell: true, maxBuffer: 1024 * 1024 * 50 }
  );
  console.log(`  [#${l.epNum}] TAMAM: ${outFile}`);
  return { epNum: l.epNum, id: l.id, outFile, totalSec };
}

async function main() {
  const results = [];
  const failures = [];
  const offset = process.env.LESSON_OFFSET ? parseInt(process.env.LESSON_OFFSET, 10) : 0;
  const limit = process.env.LESSON_LIMIT ? parseInt(process.env.LESSON_LIMIT, 10) : LESSONS.length;
  for (const l of LESSONS.slice(offset, offset + limit)) {
    console.log(`\n=== #${l.epNum} — ${l.id} ===`);
    try {
      const r = await produceLesson(l);
      results.push(r);
    } catch (err) {
      console.error(`  [#${l.epNum}] HATA:`, err.message);
      failures.push({ epNum: l.epNum, id: l.id, error: err.message });
    }
  }
  await writeFile(
    path.join(ROOT, "out", "production-report.json"),
    JSON.stringify({ results, failures }, null, 2)
  );
  console.log("\n\n=== ÜRETİM RAPORU ===");
  console.log(`Başarılı: ${results.length}/29`);
  results.forEach((r) => console.log(`  #${r.epNum} ${r.id} -> ${r.outFile} (${r.totalSec.toFixed(1)}s)`));
  if (failures.length) {
    console.log(`Başarısız: ${failures.length}`);
    failures.forEach((f) => console.log(`  #${f.epNum} ${f.id}: ${f.error}`));
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
