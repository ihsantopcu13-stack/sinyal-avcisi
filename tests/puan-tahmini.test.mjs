// Puan Tahmini — denemelerden tahmini YDS puanı ve 50 hedefine mesafe.
// Hesap index.html içinden vm ile denenir. Ağ çağrısı yok.

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
const program = readFileSync(path.join(ROOT, "50-puan-programi.html"), "utf-8");
function kesit(metin, bas, son) {
  const i = metin.indexOf(bas);
  const j = metin.indexOf(son, i);
  if (i < 0 || j < 0) throw new Error("kesit bulunamadı: " + bas);
  return metin.slice(i, j);
}

const ptKod = kesit(indexHtml, "// ─── PUAN TAHMİNİ", "// ─── PUAN ANALİZÖRÜ");
const depo = {};
const ctx = vm.createContext({
  localStorage: { getItem: (k) => (k in depo ? depo[k] : null), setItem: (k, v) => { depo[k] = String(v); } },
});
vm.runInContext(ptKod, ctx);

const simdi = Date.parse("2026-10-22T12:00:00Z");
let t = ctx.ptHesapla([], [], simdi);
kontrol("1) veri yokken tahmin yok", t.tur === "yok" && t.soruSayisi === 0);

t = ctx.ptHesapla([32], [], simdi);
kontrol("2) tek deneme: 32 doğru = 40 puan", t.tur === "deneme" && t.puan === 40, String(t.puan));
t = ctx.ptHesapla([20, 30, 36, 40], [], simdi);
// son 3: 30×1 + 36×2 + 40×3 = 222 / 6 = 37 doğru → 46,25 → 46,3
kontrol("3) son 3 deneme ağırlıklı (yeni daha ağır)", t.puan === 46.3, String(t.puan));
kontrol("4) son iki deneme arası değişim", t.fark === 5, String(t.fark));

const gecmis = [];
for (let i = 0; i < 25; i++) gecmis.push({ modul: "sinyal", isCorrect: i < 20, answeredAt: "2026-10-20T10:00:00Z" });
gecmis.push({ modul: "sinyal", isCorrect: false, answeredAt: "2026-08-01T10:00:00Z" });
gecmis.push({ modul: "kelime", isCorrect: false, answeredAt: "2026-10-20T10:00:00Z" });
t = ctx.ptHesapla([], gecmis, simdi);
kontrol("5) deneme yoksa mini tahmin: %80 × 0,85 = 68", t.tur === "mini" && t.puan === 68 && t.oran === 80, JSON.stringify(t));
kontrol("6) 30 günden eski ve kelime cevapları sayılmıyor", t.soruSayisi === 25);
kontrol("7) mini tahminde aralık var", t.alt === 60 && t.ust === 76);
kontrol("8) 20 sorudan azsa tahmin yok", ctx.ptHesapla([], gecmis.slice(0, 19), simdi).tur === "yok");
kontrol("9) deneme varsa mini yerine deneme kullanılır", ctx.ptHesapla([40], gecmis, simdi).tur === "deneme");

depo["program50:deneme"] = JSON.stringify({ 11: 36, 4: 28, 18: 40 });
kontrol("10) program sayfasındaki denemeler gün sırasıyla okunuyor", JSON.stringify(ctx.ptDenemeleriOku()) === "[28,36,40]");
depo["program50:deneme"] = "bozuk";
kontrol("11) bozuk veri sayfayı kırmıyor", ctx.ptDenemeleriOku().length === 0);

kontrol("12) panelde #pt-kart sabah listesinin altında", /id="sabah-kart"[^\n]*\n\s*<div class="pt-kart" id="pt-kart"><\/div>/.test(indexHtml));
kontrol("13) /50-puan-programi ve /puan-hedefi bağlantıları", ptKod.includes('href="/50-puan-programi"') && ptKod.includes('href="/puan-hedefi"'));
kontrol("14) ÖSYM hatırlatması ve varsayım", ptKod.includes("ÖSYM'den kontrol et") && ptKod.includes("varsayım"));
kontrol("15) program sayfasında tahmin satırı aynı kural", program.includes('id="tahmin"') && /function tahmin\(\)[\s\S]*?\* \(i \+ 1\)[\s\S]*?1\.25/.test(program));
const ptCss = kesit(indexHtml, "/* PUAN TAHMİNİ", "/* GÜNÜN DENEMESİ");
kontrol("16) emoji yok", !/\p{Extended_Pictographic}/u.test(ptKod + ptCss));
kontrol("17) sarı/altın renk yok", !/#(f5c518|fbbf24|facc15|eab308|d4af37|ffd700|f59e0b)/i.test(ptKod + ptCss));

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz) process.exit(1);
