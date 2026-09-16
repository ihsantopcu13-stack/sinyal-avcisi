// FAZ 2 — PRE-MERGE GATE, madde 4: attribution.js'in guvenliMetin()/
// normalizeSinyal() input contract testi. Üretim kodu DEĞİŞTİRİLMEDİ —
// mevcut MAX_LEN (100, signal için 60) zaten var; bu test onu doğrular.
// Ağ/tarayıcı gerektirmez.

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const SinyalAttribution = require(path.join(__dirname, "..", "assets", "modules", "attribution.js"));

let toplam = 0, basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++; if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

// ---- Güvenli, normal değerler korunmalı ----
const guvenliDegerler = ["despite", "the number of", "anything but", "reel_06", "youtube_2026-09-16"];
for (const deger of guvenliDegerler) {
  const sonuc = SinyalAttribution._guvenliMetin(deger, 100);
  kontrol(`Güvenli değer korunuyor: '${deger}'`, sonuc === deger, `-> '${sonuc}'`);
}

// ---- Zararlı karakterler executable hale gelmiyor, crash yok ----
{
  const girdi = "../script";
  let hataFirladi = false, sonuc;
  try { sonuc = SinyalAttribution._guvenliMetin(girdi, 100); } catch (e) { hataFirladi = true; }
  kontrol("'../script' -> path/traversal karakterleri temizleniyor, crash yok", !hataFirladi && !/[./]/.test(sonuc), `-> '${sonuc}'`);
}
{
  const girdi = "<script>alert(1)</script>";
  let hataFirladi = false, sonuc;
  try { sonuc = SinyalAttribution._guvenliMetin(girdi, 100); } catch (e) { hataFirladi = true; }
  kontrol("'<script>alert(1)</script>' -> executable karakterler (< > ( ) / ) tamamen temizleniyor", !hataFirladi && !/[<>()\/;'"]/.test(sonuc), `-> '${sonuc}'`);
}

// ---- Çok uzun input -> sınırsız büyümüyor (mevcut MAX_LEN doğrulanıyor) ----
{
  const girdi = "a".repeat(5000);
  const sonucVarsayilan = SinyalAttribution._guvenliMetin(girdi); // varsayılan MAX_LEN=100
  kontrol("Çok uzun input varsayılan MAX_LEN'e (100) kesiliyor", sonucVarsayilan.length === 100, `uzunluk: ${sonucVarsayilan.length}`);

  const sonucSinyal = SinyalAttribution._normalizeSinyal(girdi); // signal alanı 60'a kesiliyor
  kontrol("Çok uzun signal değeri 60 karaktere kesiliyor", sonucSinyal.length === 60, `uzunluk: ${sonucSinyal.length}`);
}

// ---- Çok uzun input tam URL/capture akışında da sessionStorage/event payload'ı şişirmiyor ----
{
  global.window = { sessionStorage: (() => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) }; })(), location: {} };
  delete require.cache[require.resolve(path.join(__dirname, "..", "assets", "modules", "attribution.js"))];
  const taze = require(path.join(__dirname, "..", "assets", "modules", "attribution.js"));
  const cokUzunSinyal = "x".repeat(5000);
  const cokUzunUtm = "y".repeat(5000);
  // NOT: gerçek capture() akışında urlDenOku() tüm utm_* alanlarını 60
  // karakterle sınırlıyor (attribution.js'teki explicit maxLen=60 çağrıları) —
  // genel varsayılan MAX_LEN=100 sadece maxLen verilmeyen çağrılar içindir.
  const ctx = taze.capture(`?utm_source=${cokUzunUtm}&signal=${cokUzunSinyal}`);
  kontrol("Gerçek capture() akışında utm_source ve signal 60 karaktere kesiliyor (sınırsız büyümüyor)", ctx && ctx.utm_source.length === 60 && ctx.signal.length === 60, `utm_source uzunluk: ${ctx && ctx.utm_source.length}, signal uzunluk: ${ctx && ctx.signal.length}`);
  delete global.window;
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
