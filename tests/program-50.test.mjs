// 22 Kasım'a 50 puan programı (/50-puan-programi) — gün sonu sınavı soruları
// ve kilit kuralları. Ağ yok, sadece sayfa dosyasını okur.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.join(__dirname, "..", "50-puan-programi.html"), "utf-8");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const blok = (bas, son) => html.slice(html.indexOf(bas), html.indexOf(son));
const SORU = new Function(blok("const SORU", "/* SORU-BITIS */") + "; return SORU;")();
const KONU = new Function(blok("const KONU", "const sabit") + "; return KONU;")();
const sayi = (ad) => Number(html.match(new RegExp(`${ad} = (\\d+)`))[1]);

const konuGunleri = Object.keys(KONU).map(Number);
kontrol("her konu gününün sınav sorusu var", konuGunleri.every((g) => SORU[g]), konuGunleri.filter((g) => !SORU[g]).join(","));
kontrol("soru olan her gün bir konu günü", Object.keys(SORU).every((g) => KONU[g]));
const SORU_SAYI = sayi("SORU_SAYI"), GECME = sayi("GECME");
kontrol("geçme eşiği 5'te 4", SORU_SAYI === 5 && GECME === 4, `${GECME}/${SORU_SAYI}`);

for (const [g, liste] of Object.entries(SORU)) {
  kontrol(`${g}. gün: tekrar için soru sayısından fazla soru`, liste.length > SORU_SAYI, liste.length);
  for (const [q, opts, dogru] of liste) {
    const ok = typeof q === "string" && q.length > 5 && opts.length === 4 && new Set(opts).size === 4
      && (dogru === undefined || (Number.isInteger(dogru) && dogru >= 0 && dogru < 4));
    if (!ok) kontrol(`${g}. gün soru biçimi`, false, q);
  }
}

kontrol("kilit: önceki gün geçilmeden açılmaz", /const acik = \(g\) => g === 1 \|\| !!gecti\[g - 1\]/.test(html));
kontrol("kilitli günde görev kutuları kapalı", /cb\.disabled = kilitli/.test(html));
kontrol("varsayım ve ÖSYM hatırlatması", /Varsayım:/.test(html) && /ÖSYM/.test(html));
kontrol("emoji yok", !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(html));

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
