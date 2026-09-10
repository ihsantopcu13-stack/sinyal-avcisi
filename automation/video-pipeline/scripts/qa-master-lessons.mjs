// ============================================================
// MASTER VİDEO PAKETİ — #1-#30 teknik kontrol.
// Her video için: dosya var mı, boyutu makul mü, video+audio stream'i
// var mı, ses akışı gerçekten sessiz değil mi (ortalama ses seviyesi),
// süre 0 ya da anormal değil mi. Bozuk/eksik olanları listeler.
// ============================================================

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_EPISODES_META } from "../data/master-lessons.mjs";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "out");

async function ffprobeStreams(filePath) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error", "-show_entries", "stream=codec_type,duration",
    "-show_entries", "format=duration",
    "-of", "json", filePath,
  ]);
  return JSON.parse(stdout);
}

async function meanVolume(filePath) {
  // ffmpeg volumedetect -> stderr'e "mean_volume: -X dB" yazar.
  try {
    await execFileAsync("ffmpeg", ["-i", filePath, "-af", "volumedetect", "-vn", "-f", "null", "-"]);
    return null; // buraya asla ulaşmaz (ffmpeg -f null hata kodu döner ama stderr'de bilgi var), hatayı yakala
  } catch (err) {
    const m = String(err.stderr || "").match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
    return m ? parseFloat(m[1]) : null;
  }
}

async function checkOne(episode) {
  const filePath = path.join(OUT_DIR, episode.videoFile);
  const issues = [];

  let st;
  try {
    st = await stat(filePath);
  } catch {
    return { epNum: episode.epNum, id: episode.id, ok: false, issues: ["dosya yok"] };
  }
  if (st.size < 300_000) issues.push(`dosya çok küçük (${(st.size / 1024).toFixed(0)}KB) — muhtemelen bozuk render`);

  let info;
  try {
    info = await ffprobeStreams(filePath);
  } catch (e) {
    return { epNum: episode.epNum, id: episode.id, ok: false, issues: ["ffprobe okuyamadı: " + e.message] };
  }

  const hasVideo = info.streams?.some((s) => s.codec_type === "video");
  const hasAudio = info.streams?.some((s) => s.codec_type === "audio");
  if (!hasVideo) issues.push("video akışı yok");
  if (!hasAudio) issues.push("ses akışı yok (SESSİZ video)");

  const dur = parseFloat(info.format?.duration || "0");
  if (dur < 15) issues.push(`süre çok kısa (${dur.toFixed(1)}s) — muhtemelen kesik render`);
  if (dur > 90) issues.push(`süre anormal uzun (${dur.toFixed(1)}s)`);

  const vol = await meanVolume(filePath);
  if (vol !== null && vol < -50) issues.push(`ses seviyesi çok düşük (${vol}dB) — muhtemelen sessiz/boş ses`);

  return { epNum: episode.epNum, id: episode.id, videoFile: episode.videoFile, ok: issues.length === 0, issues, durationSec: dur, sizeMB: (st.size / 1024 / 1024).toFixed(1) };
}

async function main() {
  const results = [];
  for (const episode of ALL_EPISODES_META) {
    const r = await checkOne(episode);
    results.push(r);
    console.log(`#${r.epNum} ${r.id}: ${r.ok ? "OK" : "SORUN -> " + r.issues.join("; ")} (${r.durationSec?.toFixed?.(1)}s, ${r.sizeMB}MB)`);
  }
  const broken = results.filter((r) => !r.ok);
  console.log(`\n${results.length - broken.length}/${results.length} temiz.`);
  if (broken.length) {
    console.log("SORUNLU:", broken.map((b) => `#${b.epNum}`).join(", "));
  }
  return { results, broken };
}

main().then(({ broken }) => {
  process.exit(broken.length ? 1 : 0);
}).catch((err) => {
  console.error("Fatal:", err);
  process.exit(2);
});
