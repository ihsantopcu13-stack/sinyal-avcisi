// FAZ 2 — attribution.js için deterministik testler. Network/tarayıcı
// gerektirmez; window/sessionStorage minimal stub'larla simüle edilir.

import { createRequire } from "node:module";
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

function sahteSessionStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}

function moduluYukle() {
  // require ile taze bir kopya yükle (her testte izole global.window ile)
  const require = createRequire(import.meta.url);
  const modPath = path.join(__dirname, "..", "assets", "modules", "attribution.js");
  delete require.cache[require.resolve(modPath)];
  return require(modPath);
}

// ---- TEST 1: Instagram UTM+signal doğru parse ----
{
  global.window = { sessionStorage: sahteSessionStorage(), location: {} };
  const attr = moduluYukle();
  const sonuc = attr.capture("?utm_source=instagram&utm_medium=reel&utm_campaign=because&utm_content=reel_06&signal=because");
  kontrol(
    "1) Instagram UTM+signal parse",
    sonuc &&
      sonuc.utm_source === "instagram" &&
      sonuc.utm_medium === "reel" &&
      sonuc.utm_campaign === "because" &&
      sonuc.utm_content === "reel_06" &&
      sonuc.signal === "because",
    JSON.stringify(sonuc)
  );
}

// ---- TEST 4: YouTube kaynağı ayrı tutuluyor ----
{
  global.window = { sessionStorage: sahteSessionStorage(), location: {} };
  const attr = moduluYukle();
  const sonuc = attr.capture("?utm_source=youtube&utm_medium=shorts&signal=despite");
  kontrol("4) YouTube ayrı kaynak", sonuc && sonuc.utm_source === "youtube" && sonuc.utm_medium === "shorts", JSON.stringify(sonuc));
}

// ---- TEST 5: UTM'siz direkt ziyaret bozulmuyor ----
{
  global.window = { sessionStorage: sahteSessionStorage(), location: {} };
  const attr = moduluYukle();
  const sonuc = attr.capture("");
  kontrol("5) UTM'siz ziyaret -> null, crash yok", sonuc === null);
}

// ---- TEST 9: malicious/bozuk signal siteyi bozmuyor ----
{
  global.window = { sessionStorage: sahteSessionStorage(), location: {} };
  const attr = moduluYukle();
  const kotu = "?utm_source=<script>alert(1)</script>&signal=\"; DROP TABLE--";
  let hataFirladi = false;
  let sonuc;
  try {
    sonuc = attr.capture(kotu);
  } catch (e) {
    hataFirladi = true;
  }
  const guvenli = !hataFirladi && sonuc && !/[<>"';]/.test(sonuc.utm_source) && !/[<>"';]/.test(sonuc.signal);
  kontrol("9) Malicious query crash etmiyor + temizleniyor", guvenli, JSON.stringify(sonuc));
}

// ---- TEST 10: boşluklu sinyaller (URL encode/decode) ----
{
  global.window = { sessionStorage: sahteSessionStorage(), location: {} };
  const attr = moduluYukle();
  const usp = new URLSearchParams();
  usp.set("utm_source", "instagram");
  usp.set("signal", "the number of");
  const sonuc = attr.capture("?" + usp.toString());
  kontrol("10a) 'the number of' encode/decode", sonuc && sonuc.signal === "the number of", JSON.stringify(sonuc));

  global.window = { sessionStorage: sahteSessionStorage(), location: {} };
  const attr2 = moduluYukle();
  const usp2 = new URLSearchParams();
  usp2.set("utm_source", "instagram");
  usp2.set("signal", "anything but");
  const sonuc2 = attr2.capture("?" + usp2.toString());
  kontrol("10b) 'anything but' encode/decode", sonuc2 && sonuc2.signal === "anything but", JSON.stringify(sonuc2));
}

// ---- TEST 11+12: session içinde korunma + yeni geçerli attribution ile güncelleme ----
{
  const ss = sahteSessionStorage();
  global.window = { sessionStorage: ss, location: {} };
  const attr = moduluYukle();

  const ilk = attr.capture("?utm_source=instagram&utm_medium=reel&signal=despite");
  const internalNav = attr.capture(""); // UTM'siz iç navigasyon -> korunmalı
  kontrol("11) Internal navigasyonda attribution korunuyor", internalNav && internalNav.utm_source === "instagram" && internalNav.signal === "despite", JSON.stringify(internalNav));

  const yeniZiyaret = attr.capture("?utm_source=youtube&utm_medium=shorts&signal=although");
  kontrol("12) Yeni geçerli attribution eskiyi güncelliyor", yeniZiyaret && yeniZiyaret.utm_source === "youtube" && yeniZiyaret.signal === "although", JSON.stringify(yeniZiyaret));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
