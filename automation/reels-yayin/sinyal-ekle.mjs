// 13:30 "SİNYAL KELİME" günlük videosu: kuyrukta saati atanmamış bir tane yoksa sıradaki sinyal sorusu için
// video üretir, reels-medya-v2 Release'ine koyar (v1 1000 dosya sınırında) (üzerine yazmaz) ve data/kuyruk.json'a ekler.
// reels-yayin.yml bunu planlamadan ÖNCE çalıştırır; planlama onu 13:30 saatine koyar.
//
//   node sinyal-ekle.mjs          → gerekiyorsa üret + yükle + kuyruğa ekle (GH_TOKEN, OPENAI_API_KEY)
//   node sinyal-ekle.mjs --kuru   → yalnız hangi soru seçileceğini ve kuyruk metnini yazar
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hazirSinyalVar, siradakiSinyal, sinyalOgesi } from "./sinyal-mantigi.mjs";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const KUYRUK = path.join(DIR, "data", "kuyruk.json");
const DURUM = path.join(DIR, "data", "durum.json");
const SORULAR = path.join(DIR, "..", "..", "assets", "data", "sinyal-sorular.json");
const PIPELINE = path.join(DIR, "..", "video-pipeline");
const OKUMA_ETIKETLERI = ["reels-medya-v1", "reels-medya-v2"];
const ETIKET = "reels-medya-v2"; // yükleme: v1 GitHub'ın 1000 dosya sınırına ulaştı (24 Kas 2026)
const KURU = process.argv.includes("--kuru");

const oku = async (p) => JSON.parse(await readFile(p, "utf-8"));
const kuyruk = await oku(KUYRUK);
const durum = await oku(DURUM);
durum.konular ||= {};

if (hazirSinyalVar(kuyruk, durum)) {
  console.log("Saati atanmamış bir sinyal videosu zaten var, yenisi üretilmedi.");
  process.exit(0);
}

const soru = siradakiSinyal(kuyruk, await oku(SORULAR));
if (!soru) {
  console.log("Kullanılmamış soru kalmadı: 13:30 saati hazır kuyruktan dolacak.");
  process.exit(0);
}
const oge = sinyalOgesi(soru);
console.log(`Sıradaki soru: ${soru.id} → konu ${oge.konu} (${oge.video})`);
if (KURU) {
  console.log(JSON.stringify(oge, null, 2));
  process.exit(0);
}

const gh = (...a) => execFileSync("gh", a, { encoding: "utf-8" });
const ghSessiz = (...a) => { try { return gh(...a); } catch { return null; } };
const varolan = new Set(OKUMA_ETIKETLERI.flatMap((e, i) => {
  const cikti = i === 0 ? gh("release", "view", e, "--json", "assets", "-q", ".assets[].name") : ghSessiz("release", "view", e, "--json", "assets", "-q", ".assets[].name");
  return (cikti || "").split(/\s+/).filter(Boolean);
}));

if (varolan.has(oge.video)) {
  // Önceki çalışma yükleyip kuyruğu commit'leyemediyse: aynı videoyu yeniden üretme
  console.log(`${oge.video} Release'te zaten var, yalnız kuyruğa ekleniyor.`);
} else {
  execFileSync("node", ["scripts/sinyal-video.mjs", "--soru", soru.id], { cwd: PIPELINE, stdio: "inherit", env: process.env });
  const hedef = path.join(PIPELINE, "out", oge.video);
  await copyFile(path.join(PIPELINE, "out", "video.mp4"), hedef);
  if (ghSessiz("release", "view", ETIKET) === null) {
    ghSessiz("release", "create", ETIKET, "--title", "Reels medya v2", "--notes", "reels-medya-v1 1000 dosya sınırına ulaştı; yeni videolar burada.");
  }
  gh("release", "upload", ETIKET, hedef); // --clobber YOK: var olan videonun üzerine yazılmaz
  console.log(`${oge.video} Release'e yüklendi.`);
}

kuyruk.ogeler.push(oge);
await writeFile(KUYRUK, JSON.stringify(kuyruk, null, 2) + "\n", "utf-8");
console.log(`Kuyruğa eklendi: konu ${oge.konu}, "${oge.baslik}".`);
