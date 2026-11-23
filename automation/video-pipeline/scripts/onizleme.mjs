// ============================================================
// ÖNİZLEME — günün sorusuyla TEK "3 saniyede çöz" videosu üretir, HİÇBİR YERE PAYLAŞMAZ.
// Format ve ses: scripts/cozum-video.mjs (günlük hatla aynı). Çıktı: out/video.mp4.
// ============================================================
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scriptUret } from "./generate-script.mjs";
import { cozumVideosuUret, SORULAR } from "./cozum-video.mjs";

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "out");
const sonuc = await scriptUret(); // günün sorusunu seçer (tarihe göre)
if (sonuc.atlandi) {
  console.log(`Önizleme atlandı: soru ${sonuc.soruIndex} kalite kontrolünden geçemedi (${sonuc.sebep}).`);
  process.exit(1);
}
const s = JSON.parse(await readFile(path.join(OUT_DIR, "script.json"), "utf-8"));
const sorular = JSON.parse(await readFile(SORULAR, "utf-8"));
const soru = sorular.find((q) => q.soru_en === s.senaryo.soru_en);
if (!soru) throw new Error("Seçilen soru sorular.json'da bulunamadı");
await cozumVideosuUret(soru);
console.log("Önizleme hazır: out/video.mp4 — hiçbir yere paylaşılmadı.");
