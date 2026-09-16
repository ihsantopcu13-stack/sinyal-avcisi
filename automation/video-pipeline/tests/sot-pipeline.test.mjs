// SOURCE OF TRUTH — AŞAMA 5: AVCI + KLOD + video pipeline canonical
// kaynak doğrulaması.
//
// - generate-script.mjs, generate-gunun-sorusu-kart.mjs,
//   generate-threads-post.mjs, produce-daily-lesson.mjs artık HEPSİ
//   api/data/sorular.json'u (canonical) okuyor —
//   automation/video-pipeline/data/sorular.json'u DEĞİL.
// - Video rotasyonu artık stable id'ye göre sıralı bir kopya üzerinden
//   çalışıyor; dataset'in fiziksel array sırası karıştırılsa bile aynı
//   gün aynı soruyu seçmeye devam ediyor.
// - api/klod.mjs zaten canonical'ı okuyordu (path zaten api/data/
//   altında) — burada bunu doğruluyoruz.
// - dogru_index + canonical seçenekler cevap doğrulamasının TEK
//   otoritesi olmaya devam ediyor; AI hiçbir yerde bunu override etmiyor
//   (avci-ogretim-katmani.mjs zaten böyle tasarlanmıştı, bkz. FAZ1
//   testleri 6/7/8/13).
//
// Ağ çağrısı yapılmaz (dersIcerigiUret/AVCI AI çağrıları test edilmez —
// bunlar FAZ1'in stub'lanmış testinde zaten kapsanıyor).

import { readFile } from "node:fs/promises";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, ".."); // automation/video-pipeline
const REPO_ROOT = path.join(ROOT, "..", "..");
const CANONICAL_PATH = path.join(REPO_ROOT, "api", "data", "sorular.json");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const canonical = JSON.parse(await readFile(CANONICAL_PATH, "utf-8"));

// ---- a) generate-script.mjs canonical'ı okuyor + rotasyon stable id'ye göre ----
{
  const mod = await import(pathToFileURL(path.join(ROOT, "scripts", "generate-script.mjs")).href);
  const orijinalSira = canonical.map((s) => s.id);
  const karisik = [...canonical].sort(() => Math.random() - 0.5);
  const karisikSira = karisik.map((s) => s.id);
  const sirali1 = mod.sorularStableSirali(canonical).map((s) => s.id);
  const sirali2 = mod.sorularStableSirali(karisik).map((s) => s.id);
  const rotasyonArraySirasindanBagimsiz = JSON.stringify(sirali1) === JSON.stringify(sirali2);
  kontrol(
    "a) generate-script.mjs rotasyonu fiziksel array sırasından bağımsız (karışık dizi de aynı stable sırayı üretiyor)",
    rotasyonArraySirasindanBagimsiz && orijinalSira.join() !== karisikSira.join(),
    `orijinal!=karışık: ${orijinalSira.join() !== karisikSira.join()}, sıralı1==sıralı2: ${rotasyonArraySirasindanBagimsiz}`
  );
}

// ---- b) generate-threads-post.mjs aynı canonical'ı okuyor + aynı stable rotasyon deseni ----
{
  const mod = await import(pathToFileURL(path.join(ROOT, "scripts", "generate-threads-post.mjs")).href);
  const soru = mod.gununSorusunuSec(canonical);
  kontrol("b) generate-threads-post.mjs canonical'dan geçerli bir soru (stable id ile) seçiyor", /^q\d{3}$/.test(soru?.id), `id: ${soru?.id}`);

  const karisik = [...canonical].sort(() => Math.random() - 0.5);
  const soruKarisik = mod.gununSorusunuSec(karisik);
  kontrol("c) generate-threads-post.mjs rotasyonu array sırasından bağımsız (karışık dizide de aynı soru)", soru?.id === soruKarisik?.id, `düz: ${soru?.id} karışık: ${soruKarisik?.id}`);
}

// ---- d) SORULAR_PATH artık hiçbiri automation/video-pipeline/data/sorular.json'a değil, canonical'a işaret ediyor ----
{
  const dosyalar = ["generate-script.mjs", "generate-gunun-sorusu-kart.mjs", "generate-threads-post.mjs", "produce-daily-lesson.mjs"];
  const kotuOlanlar = [];
  for (const dosya of dosyalar) {
    const kaynak = await readFile(path.join(ROOT, "scripts", dosya), "utf-8");
    const canonicalIsaretVar = /api["'`]?\s*,\s*["'`]?data["'`]?\s*,\s*["'`]?sorular\.json/.test(kaynak) || /"api", "data", "sorular\.json"/.test(kaynak);
    const eskiYerelYolVar = /path\.join\(ROOT,\s*"data",\s*"sorular\.json"\)/.test(kaynak) || /path\.join\(DATA_DIR,\s*"sorular\.json"\)/.test(kaynak);
    if (!canonicalIsaretVar || eskiYerelYolVar) kotuOlanlar.push(dosya);
  }
  kontrol("d) Pipeline script'lerinin hiçbiri artık yerel automation/.../data/sorular.json'a işaret etmiyor", kotuOlanlar.length === 0, kotuOlanlar.join(","));
}

// ---- e) api/klod.mjs zaten canonical'ı okuyor (api/data/sorular.json) ----
{
  const klodKaynak = await readFile(path.join(REPO_ROOT, "api", "klod.mjs"), "utf-8");
  const dogruYol = /readFileSync\(path\.join\(__dirname,\s*'data',\s*'sorular\.json'\)/.test(klodKaynak);
  kontrol("e) api/klod.mjs canonical api/data/sorular.json'u okuyor (__dirname='api')", dogruYol);
}

// ---- f) dogru_index + canonical seçenekler cevap doğrulamasının tek otoritesi (AI değil) ----
{
  const avciKaynak = await readFile(path.join(ROOT, "scripts", "avci-ogretim-katmani.mjs"), "utf-8");
  const aiCevapSecmiyorYorum = /AI HİÇBİR ZAMAN SOURCE OF TRUTH DEĞİLDİR/.test(avciKaynak);
  const dogruIndexKullaniliyor = /soru\.dogru_index/.test(avciKaynak);
  kontrol("f) avci-ogretim-katmani.mjs hâlâ dogru_index'i tek otorite kabul ediyor, AI cevap seçmiyor", aiCevapSecmiyorYorum && dogruIndexKullaniliyor);
}

// ---- g/h/i) AŞAMA 8: duplicate canonical kopyası ve onu üreten ölü
// script kalıcı olarak kaldırıldı (yeniden oluşmasına karşı regresyon
// koruması) ----
{
  const duplicatePath = path.join(ROOT, "data", "sorular.json");
  const varMi = await readFile(duplicatePath, "utf-8").then(() => true).catch(() => false);
  kontrol("g) automation/video-pipeline/data/sorular.json artık mevcut değil (canonical tek dosya)", !varMi);
}
{
  const extractPath = path.join(ROOT, "scripts", "extract-sorular.mjs");
  const varMi = await readFile(extractPath, "utf-8").then(() => true).catch(() => false);
  kontrol("h) extract-sorular.mjs (ölü/ters yönlü senkron script'i) kaldırıldı", !varMi);
}
{
  const pkg = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf-8"));
  kontrol("i) package.json'da 'extract-sorular' npm script'i kalmamış", !("extract-sorular" in (pkg.scripts || {})));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
