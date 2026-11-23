// ============================================================
// ÖNİZLEME — "3 saniyede çöz" formatında TEK örnek video üretir, HİÇBİR YERE PAYLAŞMAZ.
// Akış: soru seçimi → OpenAI TTS → Remotion → kapak. Buffer/Instagram/TikTok/YouTube adımı YOK.
// Çıktı: out/video.mp4 (+ out/thumbnail.png). İş akışı bunu "reels-onizleme" ön sürümüne koyar.
// ============================================================
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scriptUret } from "./generate-script.mjs";
import { audioUret } from "./generate-audio.mjs";
import { render } from "./render.mjs";
import { kapakGoruntusuUret } from "./generate-thumbnail.mjs";

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "out");
const HOOK = "3 saniyede çöz: bu sinyali kaçırırsan puan gider.";
const KAPANIS = "Yarın 10:00'da yeni soru. Kaçırmamak için takip et.";

const sonuc = await scriptUret();
if (sonuc.atlandi) {
  console.log(`Önizleme atlandı: soru ${sonuc.soruIndex} kalite kontrolünden geçemedi (${sonuc.sebep}).`);
  process.exit(1);
}

// Format: en çok izlenen videonun açılışı (2.199 görüntüleme) + takip çağrılı kapanış
const yol = path.join(OUT_DIR, "script.json");
const s = JSON.parse(await readFile(yol, "utf-8"));
const eskiHook = s.senaryo.hook, eskiKapanis = s.senaryo.kapanis_tr;
s.senaryo.hook = HOOK;
s.senaryo.kapanis_tr = KAPANIS;
s.satirlar = s.satirlar.map((x) => (x === eskiHook ? HOOK : x === eskiKapanis ? KAPANIS : x));
s.narrasyon = s.satirlar.join(" ... ");
await writeFile(yol, JSON.stringify(s, null, 2), "utf-8");
console.log("Satırlar:\n- " + s.satirlar.join("\n- "));

await audioUret();
await render();
try {
  await kapakGoruntusuUret();
} catch (err) {
  console.error("Kapak üretilemedi (devam):", err.message);
}
console.log("Önizleme hazır: out/video.mp4 — hiçbir yere paylaşılmadı.");
