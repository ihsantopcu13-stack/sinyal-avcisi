// SOURCE OF TRUTH — AŞAMA 1: canonical şema + stable ID testleri.
//
// Canonical dosya: api/data/sorular.json. Bu test dosyanın 59 soruyu
// kayıpsız, stable id'lerle (q001..q059) ve pedagojik metadata
// alanlarıyla (sinyal_ipucu/tuzak/tuzak_ipucu/anahtar) taşıdığını
// doğrular. Ağ/tarayıcı gerektirmez.

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

const canonicalPath = path.join(__dirname, "..", "api", "data", "sorular.json");
const sorular = JSON.parse(readFileSync(canonicalPath, "utf-8"));

kontrol("1) Canonical dosya 59 soru içeriyor", sorular.length === 59, `uzunluk: ${sorular.length}`);

// ---- stable id format + uniqueness + sıralılık ----
{
  const idFormatUyumsuz = sorular.filter((s) => !/^q\d{3}$/.test(s.id));
  kontrol("2) Tüm id'ler qNNN formatında (q001-q059)", idFormatUyumsuz.length === 0, `uyumsuz: ${idFormatUyumsuz.map((s) => s.id).join(", ") || "yok"}`);
}
{
  const idler = sorular.map((s) => s.id);
  const benzersiz = new Set(idler);
  kontrol("3) Id'ler benzersiz (duplicate yok)", benzersiz.size === idler.length, `${idler.length} id, ${benzersiz.size} benzersiz`);
}
{
  const beklenen = sorular.map((_, i) => `q${String(i + 1).padStart(3, "0")}`);
  const hepsiEslesiyor = sorular.every((s, i) => s.id === beklenen[i]);
  kontrol("4) Id'ler mevcut array sırasıyla q001..q059 olarak atanmış", hepsiEslesiyor);
}

// ---- zorunlu alanlar ----
// `sinyal` bilerek listede değil: FAZ1'in bildiği gibi 59 sorudan 5'i
// (genel okuma sorusu, belirli bir sinyal kelimesi hedeflemiyor) için
// sinyal=null geçerli ve beklenen bir durumdur (bkz. aşağıdaki 5b testi).
{
  const zorunluAlanlar = ["kategori", "soru_en", "soru_tr", "dogru_index", "aciklama_tr"];
  const eksikOlanlar = [];
  sorular.forEach((s) => {
    zorunluAlanlar.forEach((alan) => {
      const deger = s[alan];
      const bos = deger === null || deger === undefined || deger === "";
      if (bos) eksikOlanlar.push(`${s.id}.${alan}`);
    });
  });
  kontrol("5) Zorunlu alanların hiçbiri boş/eksik değil", eksikOlanlar.length === 0, eksikOlanlar.join(", "));
}
{
  const sinyalli = sorular.filter((s) => typeof s.sinyal === "string" && s.sinyal.length > 0);
  const sinyalsiz = sorular.filter((s) => s.sinyal === null);
  kontrol("5b) sinyalli/null soru sayısı (54/5 bekleniyor)", sinyalli.length === 54 && sinyalsiz.length === 5, `sinyalli=${sinyalli.length} null=${sinyalsiz.length}`);
}
{
  const kotuSecenekler = sorular.filter((s) => !Array.isArray(s.secenekler_tr) || s.secenekler_tr.length !== 4 || s.secenekler_tr.some((o) => typeof o !== "string" || o.length === 0));
  kontrol("6) Her soruda tam 4 dolu seçenek var", kotuSecenekler.length === 0, kotuSecenekler.map((s) => s.id).join(", "));
}
{
  const geciksizIndex = sorular.filter((s) => !Number.isInteger(s.dogru_index) || s.dogru_index < 0 || s.dogru_index > 3);
  kontrol("7) dogru_index her soruda 0-3 aralığında geçerli bir tam sayı", geciksizIndex.length === 0, geciksizIndex.map((s) => s.id).join(", "));
}

// ---- pedagojik metadata alanları (yeni: sinyal_ipucu, tuzak, tuzak_ipucu, anahtar) ----
{
  const pedagojikAlanlar = ["sinyal_ipucu", "tuzak", "tuzak_ipucu", "anahtar"];
  const eksikAlanTasiyanlar = sorular.filter((s) => pedagojikAlanlar.some((a) => !(a in s)));
  kontrol("8) Her soru 4 pedagojik alanı da taşıyor (string veya null)", eksikAlanTasiyanlar.length === 0, eksikAlanTasiyanlar.map((s) => s.id).join(", "));
}
{
  const pedagojikAlanlar = ["sinyal_ipucu", "tuzak", "tuzak_ipucu", "anahtar"];
  const yanlisTip = [];
  sorular.forEach((s) => {
    pedagojikAlanlar.forEach((a) => {
      const v = s[a];
      if (v !== null && typeof v !== "string") yanlisTip.push(`${s.id}.${a}`);
    });
  });
  kontrol("9) Pedagojik alanların tipi string ya da null", yanlisTip.length === 0, yanlisTip.join(", "));
}

// ---- bilinen 2 sinyal düzeltmesi (eski frontend hatası, canonical doğru değeri korur) ----
{
  const q011 = sorular.find((s) => s.id === "q011");
  kontrol("10a) q011 canonical sinyal = 'anything but'", q011?.sinyal === "anything but", `bulunan: ${q011?.sinyal}`);
}
{
  const q053 = sorular.find((s) => s.id === "q053");
  kontrol("10b) q053 canonical sinyal = 'nonetheless'", q053?.sinyal === "nonetheless", `bulunan: ${q053?.sinyal}`);
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
