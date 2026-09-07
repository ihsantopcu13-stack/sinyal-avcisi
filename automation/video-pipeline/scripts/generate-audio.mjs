// ============================================================
// ADIM 2 — ElevenLabs: her senaryo satırı için ayrı seslendirme,
// aralarına kısa sessizlik koyarak tek bir audio.mp3'te birleştirme.
// ============================================================
// Satır satır TTS + ffmpeg concat kullanıyoruz (tek seferde uzun bir
// metni seslendirip karakter-hizalama üzerinden kelime zamanlaması
// çıkarmak yerine) çünkü her satırın süresi doğrudan altyazı
// zamanlamasına dönüşüyor — kırılgan hizalama matematiği gerekmiyor.

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "out");
const AUDIO_DIR = path.join(OUT_DIR, "audio");
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const SILENCE_SECONDS = 0.35;

async function ffprobeDuration(filePath) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  return parseFloat(stdout.trim());
}

async function elevenLabsSesUret(text, voiceId, index) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs hatası (satır ${index}): ${await response.text()}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const filePath = path.join(AUDIO_DIR, `line-${index}.mp3`);
  await writeFile(filePath, buffer);
  return filePath;
}

async function sessizlikUret(seconds) {
  const filePath = path.join(AUDIO_DIR, "silence.mp3");
  await execFileAsync("ffmpeg", [
    "-y",
    "-f", "lavfi",
    "-i", `anullsrc=r=44100:cl=mono`,
    "-t", String(seconds),
    "-q:a", "9",
    filePath,
  ]);
  return filePath;
}

async function birlestirVeSureleriHesapla(satirlar) {
  const voiceId = process.env.ELEVENLABS_VOICE_ID_YUNUS;
  if (!voiceId) throw new Error("ELEVENLABS_VOICE_ID_YUNUS env değişkeni tanımlı değil");
  if (!process.env.ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY env değişkeni tanımlı değil");

  await mkdir(AUDIO_DIR, { recursive: true });

  const lineFiles = [];
  for (let i = 0; i < satirlar.length; i++) {
    lineFiles.push(await elevenLabsSesUret(satirlar[i], voiceId, i));
  }
  const silenceFile = await sessizlikUret(SILENCE_SECONDS);

  // ffmpeg concat filter için input listesi: satır, sessizlik, satır, sessizlik, ...
  // (son satırdan sonra sessizlik eklemiyoruz). Her girişi aynı sample
  // rate/kanal düzenine zorluyoruz (aformat) — ElevenLabs çıktısı ile
  // anullsrc sessizliği farklı formatta gelirse concat filtresi hata verir.
  const inputs = [];
  const normalizeLabels = [];
  const captions = [];
  let cursor = 0;
  let inputIndex = 0;

  function ekle(filePath) {
    inputs.push(filePath);
    const rawLabel = `${inputIndex}:a`;
    const normLabel = `n${inputIndex}`;
    normalizeLabels.push(`[${rawLabel}]aformat=sample_rates=44100:channel_layouts=mono[${normLabel}]`);
    inputIndex++;
    return normLabel;
  }

  const concatLabels = [];
  for (let i = 0; i < lineFiles.length; i++) {
    const dur = await ffprobeDuration(lineFiles[i]);
    captions.push({ text: satirlar[i], start: cursor, end: cursor + dur });
    cursor += dur;

    concatLabels.push(ekle(lineFiles[i]));

    if (i < lineFiles.length - 1) {
      cursor += SILENCE_SECONDS;
      concatLabels.push(ekle(silenceFile));
    }
  }

  const finalPath = path.join(AUDIO_DIR, "audio.mp3");
  const filterComplex = `${normalizeLabels.join(";")};${concatLabels.map((l) => `[${l}]`).join("")}concat=n=${concatLabels.length}:v=0:a=1[out]`;
  const ffmpegArgs = ["-y"];
  inputs.forEach((f) => ffmpegArgs.push("-i", f));
  ffmpegArgs.push("-filter_complex", filterComplex, "-map", "[out]", finalPath);
  await execFileAsync("ffmpeg", ffmpegArgs);

  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeFile(path.join(PUBLIC_DIR, "audio.mp3"), await readFile(finalPath));

  return { captions, durationInSeconds: cursor };
}

export async function audioUret() {
  const script = JSON.parse(await readFile(path.join(OUT_DIR, "script.json"), "utf-8"));
  const { captions, durationInSeconds } = await birlestirVeSureleriHesapla(script.satirlar);

  const renderProps = {
    captions,
    durationInSeconds,
    audioFile: "audio.mp3",
    brand: { title: "SİNYAL AVCISI", cta: "Ücretsiz dene → sinyal-avcisi.com" },
  };
  await writeFile(path.join(OUT_DIR, "render-props.json"), JSON.stringify(renderProps, null, 2), "utf-8");

  return renderProps;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  audioUret()
    .then((props) => console.log("render-props.json yazıldı:\n", JSON.stringify(props, null, 2)))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
