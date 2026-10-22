// Günün Denemesi — her gün 5 soruluk süreli mini YDS denemesi. Seçim,
// süre ve sabah listesi bağlantısı index.html içinden vm ile denenir.
// Ağ çağrısı yok, sadece repo dosyalarını okur.

import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
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
const sorular = JSON.parse(readFileSync(path.join(ROOT, "api/data/sorular.json"), "utf-8"));

function kesit(bas, son) {
  const i = indexHtml.indexOf(bas);
  const j = indexHtml.indexOf(son, i);
  if (i < 0 || j < 0) throw new Error("kesit bulunamadı: " + bas);
  return indexHtml.slice(i, j);
}

for (const fn of ["gdSorulariSec", "gdYukle", "gunlukDenemeAc", "gdBitir", "gdRender", "gdBugunBittiMi"]) {
  kontrol(`1) ${fn} tanımlı`, new RegExp(`function ${fn}\\(`).test(indexHtml));
}

const ctx = vm.createContext({
  SL_HAVUZ: sorular.map((s) => ({ id: s.id, sinyal: s.sinyal })),
  sabahTohum(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; },
});
vm.runInContext(kesit("const GD_SORU_SAYISI=", "function gdYukle(") + "this.sec=gdSorulariSec;this.SURE=GD_SORU_SAYISI*GD_SORU_SURE_SN;", ctx);

const a = ctx.sec("2026-10-22");
const b = ctx.sec("2026-10-22");
const c = ctx.sec("2026-10-23");
kontrol("2) 5 farklı soru seçiliyor", a.length === 5 && new Set(a).size === 5, a.join(","));
kontrol("3) aynı gün herkes için aynı set", JSON.stringify(a) === JSON.stringify(b));
kontrol("4) ertesi gün set değişiyor", JSON.stringify(a) !== JSON.stringify(c), c.join(","));
const sinyal = (id) => sorular.find((s) => s.id === id).sinyal.toLowerCase();
kontrol("5) sinyaller birbirinden farklı", new Set(a.map(sinyal)).size === 5);
let hepsiGecerli = true;
for (let g = 1; g <= 60; g++) {
  const t = "2026-11-" + String(((g - 1) % 30) + 1).padStart(2, "0") + (g > 30 ? "x" : "");
  const s = ctx.sec(t);
  if (s.length !== 5 || new Set(s).size !== 5 || !s.every((id) => sorular.some((q) => q.id === id))) hepsiGecerli = false;
}
kontrol("6) 60 farklı günde set hep geçerli", hepsiGecerli);
kontrol("7) toplam süre 7,5 dakika (soru başı 90 sn)", ctx.SURE === 450);

kontrol("8) sabah listesinde deneme maddesi", indexHtml.includes("maddeler.push(SABAH_DENEME_MADDE);"));
kontrol("9) bugünkü eski listeye madde ekleniyor", indexHtml.includes("if(!v.maddeler.some(m=>m.tip==='deneme'))"));
kontrol("10) madde deneme bitince işaretleniyor", indexHtml.includes("if(m.tip==='deneme')return gdBugunBittiMi();"));
kontrol("11) madde denemeyi açıyor", indexHtml.includes("if(m.tip==='deneme'){gunlukDenemeAc();return;}"));
kontrol("12) cevaplar geçmişe yazılıyor", /function gdBitir\(\)[\s\S]*?cevapKaydet\(\{questionId:s\.id/.test(indexHtml));
const gdKod = kesit("// ─── GÜNÜN DENEMESİ", "// ─── PUAN ANALİZÖRÜ");
const gdCss = kesit("/* GÜNÜN DENEMESİ", "@media(max-width:600px){.gd-panel");
kontrol("13) açıklama Kural → Örnek → Tuzak sırasında", /Kural<\/span>[\s\S]*Örnek<\/span>[\s\S]*Tuzak<\/span>/.test(gdKod));
kontrol("14) süre varsayım notu ve ÖSYM hatırlatması", gdKod.includes("Süre varsayım") && gdKod.includes("ÖSYM'den kontrol et"));
kontrol("15) emoji yok", !/\p{Extended_Pictographic}/u.test(gdKod.replace(/→/g, "")));
kontrol("16) sarı/altın renk yok", !/#(f5c518|fbbf24|facc15|eab308|d4af37|ffd700|f59e0b)/i.test(gdCss + gdKod));

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz) process.exit(1);
