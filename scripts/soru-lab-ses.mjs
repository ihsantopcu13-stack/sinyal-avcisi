// Kullanım:
//   node scripts/soru-lab-ses.mjs          → yalnızca metinleri say, maliyet tahmini yaz (üretim yok)
//   node scripts/soru-lab-ses.mjs --uret   → eksik mp3'leri üret, manifest.json yaz
// soru-lab/index.html içindeki anlatım metinlerini George (canlı /api/tts-eleven proxy'si,
// hız 1.00, stability 0.5 sunucuda sabit) ile önceden üretir. API anahtarı kullanılmaz.
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENDPOINT = "https://sinyal-avcisi.com/api/tts-eleven";
const SPEED = 1.0;
const BEKLEME_MS = 7000; // dakikada en fazla ~8 istek (10/dk/IP sınırının altında)

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(root, "soru-lab", "index.html");
const audioDir = path.join(root, "soru-lab", "audio");
const html = await readFile(htmlPath, "utf-8");

function literal(re, name) {
  const m = html.match(re);
  if (!m) throw new Error(`${name} bulunamadı`);
  return new Function(`return (${m[1]})`)();
}

const lessons = literal(/const lessons\s*=\s*(\{[\s\S]*?\n\s*\});/, "lessons");
const videoNarration = literal(/const videoNarration\s*=\s*(\[[\s\S]*?\n\s*\]);/, "videoNarration");
const diagnoses = literal(/const diagnoses\s*=\s*(\{[\s\S]*?\n\s*\});/, "diagnoses");
const dogru = html.match(/const text=correct\?'([^']+)'/);
if (!dogru) throw new Error("speakTeacherFeedback doğru-cevap metni bulunamadı");

// --yalniz=until → yalnızca lessons.until metinleri (mevcut mp3'lere dokunmaz, manifest'e eklenir)
const yalniz = process.argv.find((a) => a.startsWith("--yalniz="))?.split("=")[1];
const metinler = yalniz
  ? lessons[yalniz].map((p) => p.text)
  : [
      ...["teacher", "quick", "simple", "until"].filter((k) => lessons[k]).flatMap((k) => lessons[k].map((p) => p.text)),
      ...videoNarration.map((p) => p.text),
      dogru[1],
      ...["A", "B", "D", "E"].map((h) => "Henüz cevabı açmıyorum. " + diagnoses[h]),
    ];
const benzersiz = [...new Set(metinler)];
const dosyaAdi = (t) => createHash("sha256").update(t).digest("hex").slice(0, 12) + ".mp3";

const toplam = benzersiz.reduce((s, t) => s + t.length, 0);
console.log(`Metin sayısı: ${benzersiz.length} (tekrarsız)`);
console.log(`Toplam karakter: ${toplam}`);
console.log(`Tahmini kredi (eleven_multilingual_v2, 1 kredi/karakter): ~${toplam}`);

if (!process.argv.includes("--uret")) process.exit(0);

await mkdir(audioDir, { recursive: true });
const manifestPath = path.join(audioDir, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf-8").catch(() => "{}"));
for (const [i, text] of benzersiz.entries()) {
  const ad = dosyaAdi(text);
  const out = path.join(audioDir, ad);
  manifest[text] = ad;
  if (await access(out).then(() => true, () => false)) {
    console.log(`[${i + 1}/${benzersiz.length}] ${ad} zaten var, atlandı`);
    continue;
  }
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(process.env.TTS_ADMIN_TOKEN ? { "X-Admin-Token": process.env.TTS_ADMIN_TOKEN } : {}) },
    body: JSON.stringify({ text, speed: SPEED }),
  });
  if (!res.ok) {
    console.error(`[${i + 1}] HTTP ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  await writeFile(out, Buffer.from(await res.arrayBuffer()));
  console.log(`[${i + 1}/${benzersiz.length}] ${ad} yazıldı`);
  await new Promise((r) => setTimeout(r, BEKLEME_MS));
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log("manifest.json yazıldı");
