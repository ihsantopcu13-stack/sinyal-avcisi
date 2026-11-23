// SES ÖRNEKLERİ — aynı kısa metni farklı OpenAI seslerle okur (paylaşmaz).
// Çıktı: out/ses-ornekleri/ses-<n>-<ad>.mp3 ve hepsini arka arkaya, aralarında duyuruyla birleştiren tum-sesler.mp3
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "out", "ses-ornekleri");
const METIN =
  "3 saniyede çöz: bu sinyali kaçırırsan puan gider! " +
  "Doğru cevap C. Nasıl çözülür? Önce sinyali bul: although. Bu bir zıtlık sinyali. " +
  "Yarın saat 10'da yeni soru. Kaçırmamak için takip et!";
const ENERJIK =
  "Türkçe konuş. Genç, enerjik, samimi bir YouTube eğitmeni gibi: sıcak, tok ve canlı bir ses, hızlı tempo, " +
  "vurgulu ve heyecanlı. Öğrenciyi uyandıran, motive eden bir ton. Monoton olma.";

const SECENEKLER = [
  { ad: "1-simdiki-onyx", model: "tts-1", voice: "onyx" },
  { ad: "2-ash-enerjik", model: "gpt-4o-mini-tts", voice: "ash", instructions: ENERJIK, speed: 1.1 },
  { ad: "3-verse-enerjik", model: "gpt-4o-mini-tts", voice: "verse", instructions: ENERJIK, speed: 1.1 },
  { ad: "4-echo-enerjik", model: "gpt-4o-mini-tts", voice: "echo", instructions: ENERJIK, speed: 1.1 },
  { ad: "5-onyx-enerjik", model: "gpt-4o-mini-tts", voice: "onyx", instructions: ENERJIK, speed: 1.1 },
  { ad: "6-coral-enerjik-kadin", model: "gpt-4o-mini-tts", voice: "coral", instructions: ENERJIK, speed: 1.1 },
];

async function tts(body) {
  const r = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ response_format: "mp3", ...body }),
  });
  if (!r.ok) throw new Error(`${body.voice}: ${r.status} ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

await mkdir(DIR, { recursive: true });
const parcalar = [];
for (const s of SECENEKLER) {
  const { ad, ...b } = s;
  const no = ad.split("-")[0];
  const duyuru = path.join(DIR, `duyuru-${no}.mp3`);
  await writeFile(duyuru, await tts({ model: "tts-1", voice: "alloy", input: `Ses ${no}.` }));
  const dosya = path.join(DIR, `ses-${ad}.mp3`);
  await writeFile(dosya, await tts({ ...b, input: METIN }));
  console.log("✔", ad);
  parcalar.push(duyuru, dosya);
}
const liste = path.join(DIR, "liste.txt");
await writeFile(liste, parcalar.map((p) => `file '${p}'`).join("\n"));
execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", liste, "-c:a", "libmp3lame", "-q:a", "3", path.join(DIR, "tum-sesler.mp3")]);
console.log("Hazır:", path.join(DIR, "tum-sesler.mp3"));
