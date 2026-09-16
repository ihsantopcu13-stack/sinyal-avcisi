// SOURCE OF TRUTH — AŞAMA 2: 59 sorunun kayıpsız migration doğrulaması.
//
// Gerçek index.html'deki SL_HAVUZ (eski, elle düzenlenen bağımsız kopya)
// ile canonical api/data/sorular.json'u soru soru karşılaştırır. Kopya
// üretmez, doğrudan kaynaklardan okur (bkz. faz2-legacy-adapter.test.mjs
// ile aynı marker tabanlı çıkarım deseni). Ağ/tarayıcı gerektirmez.
//
// BİLİNEN 2 FARK (kasıtlı, AŞAMA 1'de düzeltildi — bkz. tests/sot-schema.test.mjs
// testi 10a/10b): eski frontend'in s-sig etiketi q011'de "marginalized",
// q053'te "a fact that" kelimesini yanlışlıkla sinyal olarak işaretlemişti.
// Canonical doğru değer ("anything but" / "nonetheless") frontend'e
// yayılacak (AŞAMA 3), bu test o iki soruda sinyal alanını KARŞILAŞTIRMAZ
// — geri kalan 57 soruda + 2 sorunun diğer tüm alanlarında tam eşleşme
// zorunludur.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

function extractBetween(text, startMarker, endMarker) {
  const s = text.indexOf(startMarker);
  if (s === -1) throw new Error(`Marker bulunamadı: ${startMarker}`);
  const from = s + startMarker.length;
  const e = text.indexOf(endMarker, from);
  if (e === -1) throw new Error(`Bitiş marker'ı bulunamadı: ${endMarker}`);
  return text.slice(from, e);
}

function extractSpan(html, cls) {
  const re = new RegExp(`<span class="${cls}"(?:\\s+data-tip="([^"]*)")?>([^<]*)</span>`);
  const m = html.match(re);
  if (!m) return { tip: null, text: null };
  return { tip: m[1] ?? null, text: m[2] };
}

const htmlPath = path.join(__dirname, "..", "index.html");
const html = readFileSync(htmlPath, "utf-8").replace(/\r\n/g, "\n");
const havuzBody = extractBetween(html, "const SL_HAVUZ=[", "\n];\n");
const SL_HAVUZ = new Function(`return [${havuzBody}];`)();

const canonicalPath = path.join(__dirname, "..", "api", "data", "sorular.json");
const canonical = JSON.parse(readFileSync(canonicalPath, "utf-8"));

const BILINEN_SINYAL_FARKI = new Set(["q011", "q053"]);

kontrol("a) Canonical ve frontend uzunluğu eşit (59/59)", canonical.length === 59 && SL_HAVUZ.length === 59, `canonical=${canonical.length} frontend=${SL_HAVUZ.length}`);

let uyusanSoru = 0;
const uyusmazlikDetaylari = [];

for (let i = 0; i < canonical.length; i++) {
  const c = canonical[i];
  const f = SL_HAVUZ[i];
  if (!f) {
    uyusmazlikDetaylari.push(`${c.id}: frontend'de karşılığı yok`);
    continue;
  }
  const sorunlar = [];
  if (c.kategori !== f.eye) sorunlar.push("kategori");
  const frontendPlainEn = f.sent.replace(/<[^>]+>/g, "").replace(/^"|"$/g, "").trim();
  if (c.soru_en.trim() !== frontendPlainEn) sorunlar.push("soru_en");
  if (c.soru_tr !== f.q) sorunlar.push("soru_tr");
  if (JSON.stringify(c.secenekler_tr) !== JSON.stringify(f.opts)) sorunlar.push("secenekler_tr");
  if (c.dogru_index !== f.ans) sorunlar.push("dogru_index");
  if (c.aciklama_tr !== f.fb) sorunlar.push("aciklama_tr");

  if (!BILINEN_SINYAL_FARKI.has(c.id)) {
    const sig = extractSpan(f.sent, "s-sig");
    if (c.sinyal !== sig.text) sorunlar.push(`sinyal (canonical="${c.sinyal}" frontend="${sig.text}")`);
  }

  if (sorunlar.length === 0) {
    uyusanSoru++;
  } else {
    uyusmazlikDetaylari.push(`${c.id}: ${sorunlar.join(", ")}`);
  }
}

kontrol("b) 59/59 soru veri kaybı olmadan doğrulandı (bilinen 2 sinyal farkı hariç)", uyusanSoru === 59, uyusmazlikDetaylari.join(" | ") || "tam eşleşme");

// NOT: q011/q053'ün frontend'de DOĞRU canonical sinyale sahip olduğunun
// zorunlu kılınması bu testin işi değil — bu, AŞAMA 3'ün ürettiği
// generated mirror'ı doğrulayan tests/sot-mirror.test.mjs'in işidir.
// Burada bilinçli olarak sadece "geri kalan her şey kayıpsız taşındı"
// doğrulanıyor; bu istisna AŞAMA 3 sonrasında da geçerliliğini korur.

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
