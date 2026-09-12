// ============================================================
// TEK SEFERLİK — episode #1 (Master01OfTuzagiReel.jsx) ses ve sahne
// sürelerini George sesiyle yeniden üretir. Bu bileşen #2-30'un aksine
// sabit/hard-coded SCENE_FRAMES kullanıyor (dinamik hesaplama yok), bu
// yüzden yeni George ses süreleri ölçülüp aynı formülle (produce-master-
// lessons.mjs'teki pad=15 mantığı) SCENE_FRAMES + CaptionOverlay
// durationFrames değerleri koda geri yazılıyor.
// İçerik/metin DEĞİŞMEDİ — sadece ses ve buna bağlı süre senkronu.
// ============================================================

import { readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FPS = 30;

const LINES = {
  hook: "OF TUZAĞI!",
  kural: "Son ismi özne sanma. Fiili bul, sola dön.",
  neden: "'Of artı isim', önceki ismi tamamlayan bir edat grubudur.",
  tuzak: "Fiile en yakın ismi özne sanma tuzağı.",
  ornek: "The rapid development of technology changes society. Fiil: changes. Patron isim: development.",
  soru: "Şimdi sırada soru var. A create, B creates, C creating, D have created.",
  cozum: "Cevap B, creates. Patron isim development tekil.",
  avci: "OF gör, fiili bul, sola dön, patron ismi bul, avla!",
};
const FILES = { hook: "l1_hook", kural: "l2_kural", neden: "l3_neden", tuzak: "l4_tuzak", ornek: "l5_ornek", soru: "l6_soru", cozum: "l7_cozum", avci: "l8_avci" };

async function ffprobeDuration(filePath) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", filePath,
  ]);
  return parseFloat(stdout.trim());
}

async function ttsGeorge(text, outPath) {
  const res = await fetch("https://sinyal-avcisi.com/api/tts-eleven", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, speed: 1.0 }),
  });
  if (!res.ok) throw new Error(`TTS hata: ${res.status} ${await res.text()}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
  return ffprobeDuration(outPath);
}

function secToFrames(sec) {
  return Math.ceil(sec * FPS);
}

async function main() {
  const audioDir = path.join(ROOT, "public", "master-01");
  const audioFrames = {};
  for (const [key, text] of Object.entries(LINES)) {
    const filePath = path.join(audioDir, `${FILES[key]}.mp3`);
    const dur = await ttsGeorge(text, filePath);
    console.log(`  ${FILES[key]}: ${dur.toFixed(2)}s`);
    audioFrames[key] = secToFrames(dur);
  }

  const pad = 15;
  const scene1 = 45;
  const scene2 = audioFrames.kural + pad;
  const scene3 = audioFrames.neden + pad;
  const scene4 = audioFrames.tuzak + pad;
  const scene5 = audioFrames.ornek + pad;
  const countdownStart = audioFrames.soru;
  const scene6 = countdownStart + 54 + 10;
  const scene7 = audioFrames.cozum + 20;
  const scene8 = audioFrames.avci + 15;
  const scene9 = 60;
  const newSceneFrames = [scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8, scene9];

  console.log("Yeni SCENE_FRAMES:", newSceneFrames);
  console.log("Yeni countdownStart (soru audioFrames):", countdownStart);

  const filePath = path.join(ROOT, "src", "Master01OfTuzagiReel.jsx");
  let code = await readFile(filePath, "utf-8");

  code = code.replace(
    /export const SCENE_FRAMES = \[[^\]]+\];/,
    `export const SCENE_FRAMES = [${newSceneFrames.join(", ")}];`
  );
  code = code.replace(
    /const countdownStart = \d+;/,
    `const countdownStart = ${countdownStart};`
  );

  // CaptionOverlay durationFrames'leri sırayla güncelle (hook,kural,neden,tuzak,ornek,soru,cozum,avci)
  const order = ["hook", "kural", "neden", "tuzak", "ornek", "soru", "cozum", "avci"];
  let idx = 0;
  code = code.replace(/durationFrames=\{\d+\}/g, () => {
    const key = order[idx++];
    return `durationFrames={${audioFrames[key]}}`;
  });

  await writeFile(filePath, code, "utf-8");
  console.log("Master01OfTuzagiReel.jsx güncellendi.");

  await writeFile(path.join(ROOT, "out", "episode1-audioframes.json"), JSON.stringify({ audioFrames, newSceneFrames, countdownStart }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
