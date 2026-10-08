// Ana sayfa hero'sundaki /hedef-rota bağlantısı — JS'e bağlı olmayan gerçek
// <a href> olarak hero bölümünde durduğunu ve onclick'li bir kapsayıcıya
// düşmediğini doğrular. Ağ çağrısı yok, sadece repo dosyalarını okur.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const indexHtml = readFileSync(path.join(ROOT, "index.html"), "utf-8");
const hero = (indexHtml.match(/<section id="hero"[\s\S]*?<\/section>/) || [""])[0];
const satir = hero.split("\n").find((s) => s.includes('href="/hedef-rota"')) || "";
const link = satir.match(/<a href="\/hedef-rota"[^>]*>([^<]+)<\/a>/);

kontrol("hero bölümü bulundu", hero.length > 0);
kontrol("hero'da /hedef-rota gerçek <a href> bağlantısı", !!link);
kontrol("bağlantı JS'e bağlı değil", !!link && !/onclick|javascript:/i.test(link[0]));
kontrol("bağlantının kapsayıcı satırında onclick yok", satir.length > 0 && !/onclick/i.test(satir.replace(link ? link[0] : "", "")));
kontrol("anchor metni doğru", !!link && link[1].trim() === "Hedef Puan Rotanı çıkar →", link && link[1]);
kontrol('"kayıtsız" kelimesi kullanılmıyor', !/kayıtsız/i.test(satir));
kontrol("hedef-rota.html repoda mevcut", existsSync(path.join(ROOT, "hedef-rota.html")));
kontrol(
  "Hedef Programı (hpAc) bağlantısı yerinde duruyor",
  /onclick="hpAc\(\)"[^>]*>Hedef Programını kur →<\/a>/.test(hero)
);

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
