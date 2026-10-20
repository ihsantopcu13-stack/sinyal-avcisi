// Ana sayfanın büyük betiği js/ana.js'te duruyor. Bu test üç şeyi korur:
// 1) index.html betiği tam bir kez, senkron (defer/async YOK) yüklüyor —
//    sonraki inline betikler ve onclick'ler ana.js'teki fonksiyonlara bağlı,
//    defer olursa onlardan SONRA çalışır ve sayfa bozulur.
// 2) js/ana.js geçerli JavaScript.
// 3) sw.js betiği önbelleğe alıyor ve HTML gibi network-first sunuyor
//    (cache-first olsaydı yeni HTML eski betikle açılabilirdi).
// Ağ çağrısı yok, sadece repo dosyalarını okur.

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ANA_BETIK_ETIKETI } from "./_index-kaynak.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const html = readFileSync(path.join(ROOT, "index.html"), "utf-8");
const etiketler = html.match(/<script[^>]*src="\/js\/ana\.js"[^>]*>/g) || [];
kontrol("index.html ana.js'i tam bir kez yüklüyor", etiketler.length === 1, `bulunan: ${etiketler.length}`);
kontrol("ana.js etiketi senkron (defer/async yok)", etiketler.length === 1 && etiketler[0] + "</script>" === ANA_BETIK_ETIKETI, etiketler[0]);
kontrol("attribution.js ana.js'ten önce yükleniyor",
  html.indexOf('src="assets/modules/attribution.js"') !== -1 && html.indexOf('src="assets/modules/attribution.js"') < html.indexOf(ANA_BETIK_ETIKETI));

const jsYolu = path.join(ROOT, "js", "ana.js");
kontrol("js/ana.js mevcut", existsSync(jsYolu));
let sozdizimi = true;
try { execFileSync(process.execPath, ["--check", jsYolu], { stdio: "pipe" }); } catch { sozdizimi = false; }
kontrol("js/ana.js sözdizimi geçerli", sozdizimi);
kontrol("SL_HAVUZ js/ana.js'te", readFileSync(jsYolu, "utf-8").includes("const SL_HAVUZ=["));

const sw = readFileSync(path.join(ROOT, "sw.js"), "utf-8");
kontrol("sw.js ana.js'i önbelleğe alıyor", /CACHE_URLS\s*=\s*\[[^\]]*'\/js\/ana\.js'/.test(sw));
kontrol("sw.js ana.js'i network-first sunuyor", sw.includes("if (isHtmlNav || url.pathname === '/js/ana.js')"));

console.log(`\n${toplam - basarisiz}/${toplam} geçti`);
if (basarisiz > 0) process.exit(1);
