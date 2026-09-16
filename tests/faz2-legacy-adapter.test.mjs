// FAZ 2 — LEGACY_SL_HAVUZ_ADAPTER kalıcı testi.
//
// Bu test SAHTE bir SL_HAVUZ kopyası OLUŞTURMAZ. Gerçek index.html
// dosyasından hem SL_HAVUZ veri dizisini hem de LEGACY_SL_HAVUZ_ADAPTER
// IIFE kaynağını marker tabanlı çıkarım ile alır ve gerçek koda karşı
// çalıştırır — böylece index.html değişirse test otomatik güncel veriyle
// çalışır, çürümez. Sinyal normalize mantığı da gerçek attribution.js
// modülünden (window.SinyalAttribution._normalizeSinyal) alınır, burada
// yeniden yazılmaz. Ağ/tarayıcı gerektirmez.

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
// \r\n -> \n normalize: Windows'ta git core.autocrlf checkout'ta CRLF'e
// çevirebiliyor (CI'nin Linux runner'ında bu olmuyor) — marker eşleşmesi
// satır sonu stilinden bağımsız olmalı.
const html = readFileSync(htmlPath, "utf-8").replace(/\r\n/g, "\n");

// ---- Gerçek SL_HAVUZ verisini çıkar (kopyalama değil, doğrudan kaynaktan) ----
const havuzBody = extractBetween(html, "const SL_HAVUZ=[", "\n];\n");
const SL_HAVUZ = new Function(`return [${havuzBody}];`)();

kontrol("a) Gerçek SL_HAVUZ index.html'den çıkarılabiliyor ve boş değil", Array.isArray(SL_HAVUZ) && SL_HAVUZ.length > 0, `kayıt sayısı: ${SL_HAVUZ.length}`);

// ---- Gerçek attribution modülünü kullan (normalize mantığı burada tekrar yazılmıyor) ----
const attributionModPath = path.join(__dirname, "..", "assets", "modules", "attribution.js");
const SinyalAttribution = require(attributionModPath);

// ---- Gerçek LEGACY_SL_HAVUZ_ADAPTER IIFE kaynağını çıkar ve çalıştır ----
const adapterBody = extractBetween(html, "var LEGACY_SL_HAVUZ_ADAPTER=(function(){", "})();");
const adapterFactory = new Function("SL_HAVUZ", "window", `return (function(){${adapterBody}})();`);
const LEGACY_SL_HAVUZ_ADAPTER = adapterFactory(SL_HAVUZ, { SinyalAttribution });

// ---- b) "despite" eşleşiyor ----
{
  const indeksler = LEGACY_SL_HAVUZ_ADAPTER.indeksleriBul("despite");
  const hepsindeDespiteVar = indeksler.length > 0 && indeksler.every((i) => (SL_HAVUZ[i].sent || "").toLowerCase().includes("despite"));
  kontrol("b) 'despite' gerçek veride eşleşiyor", hepsindeDespiteVar, `eşleşen indeksler: ${JSON.stringify(indeksler)}`);
}

// ---- c) boşluklu sinyaller güvenli çalışıyor ("prior to", gerçek veride var) ----
{
  const indeksler = LEGACY_SL_HAVUZ_ADAPTER.indeksleriBul("prior to");
  const dogru = indeksler.length > 0 && indeksler.every((i) => (SL_HAVUZ[i].sent || "").toLowerCase().includes("prior to"));
  kontrol("c) Boşluklu sinyal ('prior to') gerçek veride doğru eşleşiyor", dogru, `eşleşen indeksler: ${JSON.stringify(indeksler)}`);
}

// ---- d) bilinmeyen sinyal -> boş sonuç / fallback, crash yok ----
{
  let hataFirladi = false;
  let sonuc;
  try {
    sonuc = LEGACY_SL_HAVUZ_ADAPTER.indeksleriBul("bu-sinyal-hicbir-yerde-yok");
  } catch (e) {
    hataFirladi = true;
  }
  kontrol("d) Bilinmeyen sinyal -> boş dizi, crash yok", !hataFirladi && Array.isArray(sonuc) && sonuc.length === 0, JSON.stringify(sonuc));
}

// ---- e) malformed input crash üretmiyor ----
{
  const girdiler = [undefined, null, "", "<script>alert(1)</script>", 12345, {}];
  let hepsiGuvenli = true;
  const detaylar = [];
  for (const girdi of girdiler) {
    try {
      const r = LEGACY_SL_HAVUZ_ADAPTER.indeksleriBul(girdi);
      const guvenli = Array.isArray(r);
      detaylar.push(`${JSON.stringify(girdi)}->${guvenli ? "OK" : "BEKLENMEYEN"}`);
      if (!guvenli) hepsiGuvenli = false;
    } catch (e) {
      hepsiGuvenli = false;
      detaylar.push(`${JSON.stringify(girdi)}->THROW(${e.message})`);
    }
  }
  kontrol("e) Malformed/beklenmeyen girdiler crash üretmiyor", hepsiGuvenli, detaylar.join(", "));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
