// ============================================================
// GÜNLÜK PİPELİNE — YENİ İÇERİK KALİTE STANDARDI (2026-09-11)
// ============================================================
// Eski ShortVideo.jsx (basit rolling-caption) yerine, MASTER VİDEO
// PAKETİ'nin zengin şablonunu (MasterLessonReel.jsx — S/V/O renklendirme,
// şıkları tek tek eleme, AVCI ÇÖZÜM MOTORU) günlük gerçek soru havuzuna
// (data/sorular.json) uygular. Soru/cevap/İngilizce metin DEĞİŞTİRİLMEZ —
// /api/generate-lesson (Claude, sunucu tarafı) sadece pedagojik içerik
// (10 noktalı öğretim çerçevesi, şık-şık eleme gerekçesi) ekler.
//
// Süre artık 25-35sn'ye SIKIŞTIRILMIYOR — içerik ne kadar gerektiriyorsa
// o kadar (bkz. proje hafızası: "KISA OLMASI DEĞİL → ÖĞRETMESİ ÖNEMLİ").
// ============================================================

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FPS = 30;
const SORULAR_PATH = path.join(ROOT, "data", "sorular.json");

function gunSayisi() {
  return Math.floor(Date.now() / 86_400_000);
}

function slugify(text) {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

async function ffprobeDuration(filePath) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1", filePath,
  ]);
  return parseFloat(stdout.trim());
}

async function ttsMurat(text, outPath) {
  // speed 1.00 — kullanıcının 2026-09-11 onayladığı ses standardı (George,
  // eleven_multilingual_v2, stability 0.5, similarity_boost 0.75). Murat/1.05
  // yerine geçti.
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

function parseJsonFromModelText(text) {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}

async function dersIcerigiUret(soru) {
  const res = await fetch("https://sinyal-avcisi.com/api/generate-lesson", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ soru }),
  });
  if (!res.ok) throw new Error(`generate-lesson hata: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return parseJsonFromModelText(data.text);
}

export async function gunlukDersUret({ soruIndexOffset = 0 } = {}) {
  const sorular = JSON.parse(await readFile(SORULAR_PATH, "utf-8"));
  const soru = sorular[(gunSayisi() + soruIndexOffset) % sorular.length];

  console.log("Gerçek soru:", soru.soru_en);
  console.log("Sinyal:", soru.sinyal);

  const content = await dersIcerigiUret(soru);
  console.log("Ders içeriği üretildi:", content.hookTitle);

  const id = slugify(soru.sinyal || content.hookTitle || `gun-${gunSayisi()}`);
  const dogruHarf = String.fromCharCode(65 + (soru.dogru_index ?? 0));
  const options = soru.secenekler_tr.map((s, i) => `${String.fromCharCode(65 + i)}) ${s}`);

  const lesson = {
    id,
    hookTitle: content.hookTitle,
    kuralLines: content.kuralLines,
    nedenBadge: content.nedenBadge,
    nedenText: content.nedenText,
    tuzakText: content.tuzakText,
    narration: content.narration,
    examples: content.examples,
    breakdown: (content.breakdown || []).map((b) => ({ text: b.text, color: COLOR_MAP[b.styleColor] || COLOR_MAP.plain })),
    question: { sentence: soru.soru_en, options },
    answerLabel: content.answerLabel || `${dogruHarf})`,
    cozumText: content.cozumText || content.narration?.cozum || "",
    eliminations: content.eliminations,
    recognitionTip: content.recognitionTip,
    avciKodu: content.avciKodu,
    audioFolder: `daily/${id}`,
    audioFiles: ["l1_hook", "l2_kural", "l3_neden", "l4_tuzak", "l5_ornek", "l6_soru", "l7_cozum", "l8_avci"],
    hookEmoji: "⚠",
    sourceSoru: { ...soru, dogruHarf },
  };

  // Örnek cümledeki style değerlerinin geçerli olduğunu doğrula (AI bazen
  // beklenmedik bir anahtar üretebilir) — geçersizse "plain"e düş.
  const VALID_STYLES = new Set(["plain", "verb", "trap", "good"]);
  lesson.examples = (lesson.examples || []).map((ex) => ({
    parts: (ex.parts || []).map((p) => ({ text: p.text, style: VALID_STYLES.has(p.style) ? p.style : "plain" })),
  }));

  const audioDir = path.join(ROOT, "public", lesson.audioFolder);
  await mkdir(audioDir, { recursive: true });

  const order = ["hook", "kural", "neden", "tuzak", "ornek", "soru", "cozum", "avci"];
  const audioFrames = {};
  for (let i = 0; i < order.length; i++) {
    const key = order[i];
    const fileId = lesson.audioFiles[i];
    const filePath = path.join(audioDir, `${fileId}.mp3`);
    const alreadyExists = await access(filePath).then(() => true).catch(() => false);
    let dur;
    if (alreadyExists) {
      dur = await ffprobeDuration(filePath);
      console.log(`  ${fileId}: zaten var, atlandı (${dur.toFixed(2)}s)`);
    } else {
      dur = await ttsMurat(lesson.narration[key], filePath);
      console.log(`  ${fileId}: ${dur.toFixed(2)}s`);
    }
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
  const scene7 = audioFrames.cozum + 25; // eleme sahneleri için ekstra tampon
  const scene8 = audioFrames.avci + 15;
  const scene9 = 60;

  lesson.sceneFrames = [scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8, scene9];
  lesson.countdownStart = countdownStart;
  lesson.audioFrames = audioFrames;
  lesson.exampleRevealAt = Math.round(scene5 * 0.4);
  lesson.breakdownRevealAt = Math.round(scene5 * 0.65);

  const totalSec = lesson.sceneFrames.reduce((a, b) => a + b, 0) / FPS;
  console.log(`Toplam süre: ${totalSec.toFixed(1)}s`);

  await mkdir(path.join(ROOT, "out"), { recursive: true });
  const propsPath = path.join(ROOT, "out", `props-daily-${id}.json`);
  await writeFile(propsPath, JSON.stringify({ lesson }, null, 2));
  await writeFile(path.join(ROOT, "out", "daily-lesson.json"), JSON.stringify(lesson, null, 2));

  const outFile = path.join(ROOT, "out", `daily-${id}.mp4`);
  console.log("Render ediliyor ->", outFile);
  await execFileAsync(
    "npx",
    ["remotion", "render", "src/index.jsx", "MasterLessonReel", outFile, "--props", propsPath],
    { cwd: ROOT, shell: true, maxBuffer: 1024 * 1024 * 50 }
  );
  console.log("TAMAM:", outFile);

  return { lesson, outFile, totalSec };
}

const COLOR_MAP = { plain: "#ffffff", verb: "#faff00", trap: "#ff1744", good: "#39ff14" };

if (import.meta.url === `file://${process.argv[1]}`) {
  gunlukDersUret().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
