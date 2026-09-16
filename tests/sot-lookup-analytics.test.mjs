// SOURCE OF TRUTH — AŞAMA 4: stable lookup + analytics doğrulaması.
//
// (a) SL_SINYAL_LOOKUP'ın (AŞAMA 7 öncesi adıyla LEGACY_SL_HAVUZ_ADAPTER)
//     sinyal->indeks eşlemesi artık HTML'den
//     regex ile değil, doğrudan soru.sinyal alanından kuruluyor.
// (b) GA4 question_view/question_answered/answer_correct/answer_wrong
//     artık array index değil, stable qNNN id gönderiyor.
// (c) despite deep-linki ve bilinmeyen sinyal fallback'i hâlâ çalışıyor.
//
// Gerçek index.html'den marker tabanlı çıkarım kullanılır (kopya
// oluşturulmaz) — bkz. tests/sot-signal-lookup.test.mjs ile aynı desen.

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

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

const htmlPath = path.join(__dirname, "..", "index.html");
const html = readFileSync(htmlPath, "utf-8").replace(/\r\n/g, "\n");

const havuzBody = extractBetween(html, "const SL_HAVUZ=[", "\n];\n");
const SL_HAVUZ = new Function(`return [${havuzBody}];`)();

const attributionModPath = path.join(__dirname, "..", "assets", "modules", "attribution.js");
const SinyalAttribution = require(attributionModPath);

const adapterBody = extractBetween(html, "var SL_SINYAL_LOOKUP=(function(){", "})();");
const adapterFactory = new Function("SL_HAVUZ", "window", `return (function(){${adapterBody}})();`);

// ---- a) regex bağımlılığı kalktı mı: sent HTML'i tamamen bozulmuş bir
// SL_HAVUZ kopyasıyla (span'ler yok) test ederek doğruluyoruz — lookup
// SADECE soru.sinyal alanına bakıyorsa sonuç değişmemeli.
{
  const spansizHavuz = SL_HAVUZ.map((s) => ({ ...s, sent: (s.sent || "").replace(/<[^>]+>/g, "") }));
  const adapterSpansiz = adapterFactory(spansizHavuz, { SinyalAttribution });
  const indeksler = adapterSpansiz.indeksleriBul("despite");
  const hepsindeDespiteVar = indeksler.length > 0 && indeksler.every((i) => spansizHavuz[i].sinyal && spansizHavuz[i].sinyal.toLowerCase() === "despite");
  kontrol("a) Sinyal lookup HTML span'lerine değil soru.sinyal alanına dayanıyor (regex bağımlılığı yok)", hepsindeDespiteVar, `eşleşen indeksler: ${JSON.stringify(indeksler)}`);
}

// ---- b) despite deep-link hâlâ çalışıyor (gerçek SL_HAVUZ ile) ----
{
  const adapter = adapterFactory(SL_HAVUZ, { SinyalAttribution });
  const indeksler = adapter.indeksleriBul("despite");
  const dogru = indeksler.length > 0 && indeksler.every((i) => (SL_HAVUZ[i].sinyal || "").toLowerCase() === "despite");
  kontrol("b) 'despite' deep-link hâlâ doğru sorulara eşleşiyor", dogru, `eşleşen: ${JSON.stringify(indeksler)}`);
}

// ---- c) bilinmeyen sinyal fallback hâlâ güvenli ----
{
  const adapter = adapterFactory(SL_HAVUZ, { SinyalAttribution });
  let hataFirladi = false;
  let sonuc;
  try {
    sonuc = adapter.indeksleriBul("bu-sinyal-hicbir-yerde-yok");
  } catch (e) {
    hataFirladi = true;
  }
  kontrol("c) Bilinmeyen sinyal -> boş dizi, crash yok", !hataFirladi && Array.isArray(sonuc) && sonuc.length === 0);
}

// ---- d) GA4 question_id artık qNNN, array index değil ----
{
  const qidYerleri = [
    /var __slQidAns=soru\.id;/,
    /var __slQid=soru\.id;/,
  ];
  const hepsiVar = qidYerleri.every((re) => re.test(html));
  kontrol("d) question_answered + question_view kaynak kodda soru.id kullanıyor", hepsiVar);
}
{
  const eskiKalinti = /SL_HAVUZ\.indexOf\(soru\)/.test(html);
  kontrol("e) Eski array-index tabanlı question_id (SL_HAVUZ.indexOf) kaynak kodda kalmamış", !eskiKalinti);
}

// ---- f) canonical'daki her soru için stable id qNNN formatında ve GA4'e taşınabilir ----
{
  const kotuId = SL_HAVUZ.filter((s) => !/^q\d{3}$/.test(s.id));
  kontrol("f) SL_HAVUZ'daki her girişte GA4'e taşınabilir stable id var", kotuId.length === 0, kotuId.map((s) => s.id).join(","));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
