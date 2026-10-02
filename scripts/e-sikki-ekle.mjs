// SİNYAL LAB 5 ŞIK — AŞAMA 2/3: 4 şıklı sorulara E şıkkını parti halinde ekler.
//
// Çalıştırma:
//   node scripts/e-sikki-ekle.mjs <parti.json>            # doğrula + uygula
//   node scripts/e-sikki-ekle.mjs <parti.json> --kuru     # sadece doğrula, hiçbir dosyaya yazma
//
// parti.json biçimi: [{ "id": "q001", "e": "Beşinci şıkkın metni." }, ...]
//
// Kurallar (api/_sikKurallari.mjs): yeni şık sona (E) eklenir; E boş
// olamaz ve ilk 4 şıktan birinin kopyası olamaz; yalnızca 4 şıklı sorulara
// eklenir; partide tek bir hata bile varsa hiçbir şey yazılmaz. Ardından
// partinin şıkları tohumlu karıştırılır (partiyiKaristir): doğru cevaplar
// A-E'ye dengeli dağılır, şık metinleri ve doğru cevap METNİ korunur.
// Uygulandıktan sonra index.html'deki SL_HAVUZ mirror'ı
// scripts/generate-sl-havuz.mjs ile otomatik yeniden üretilir
// (tests/sot-mirror.test.mjs ikisinin senkron kaldığını doğrular).

import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { eSikkiEkle, partiyiKaristir, sikSayaci } from "../api/_sikKurallari.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const CANONICAL_PATH = path.join(REPO_ROOT, "api", "data", "sorular.json");

async function main() {
  const [partiYolu, ...bayraklar] = process.argv.slice(2);
  if (!partiYolu) throw new Error("Kullanım: node scripts/e-sikki-ekle.mjs <parti.json> [--kuru]");
  const kuru = bayraklar.includes("--kuru");

  const ham = await readFile(CANONICAL_PATH, "utf-8");
  const sorular = JSON.parse(ham);
  const ekler = JSON.parse(await readFile(path.resolve(partiYolu), "utf-8"));

  const eklendi = eSikkiEkle(sorular, ekler); // hata varsa fırlatır, hiçbir şey yazılmaz
  const idler = ekler.map((e) => e.id);
  const yeni = partiyiKaristir(eklendi, idler);
  const s = sikSayaci(yeni);
  console.log(`Parti geçerli: ${ekler.length} soruya E şıkkı. Havuz sonrası: 4 şıklı ${s.dort}, 5 şıklı ${s.bes}.`);
  const harf = (i) => String.fromCharCode(65 + i);
  const partiDagilim = [0, 0, 0, 0, 0];
  yeni.filter((q) => idler.includes(q.id)).forEach((q) => partiDagilim[q.dogru_index]++);
  console.log(`Karıştırıldı — partide doğru cevap A/B/C/D/E = ${partiDagilim.join("/")}`);
  for (const id of idler) {
    const once = eklendi.find((q) => q.id === id), sonra = yeni.find((q) => q.id === id);
    console.log(`  ${id}: ${harf(once.dogru_index)} → ${harf(sonra.dogru_index)}`);
  }
  if (kuru) {
    console.log("--kuru: hiçbir dosyaya yazılmadı.");
    return;
  }

  const crlf = ham.includes("\r\n");
  const metin = JSON.stringify(yeni, null, 2) + "\n";
  await writeFile(CANONICAL_PATH, crlf ? metin.replace(/\n/g, "\r\n") : metin, "utf-8");
  console.log(`Yazıldı: ${CANONICAL_PATH}`);
  execFileSync(process.execPath, [path.join(__dirname, "generate-sl-havuz.mjs")], { stdio: "inherit" });
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
