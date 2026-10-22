// Yanlış Defteri — yanlış sorular 1, 3 ve 7 gün sonra tekrar. Takvim
// mantığı index.html içinden vm ile denenir. Ağ çağrısı yok, sadece repo
// dosyalarını okur.

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

function kesit(bas, son) {
  const i = indexHtml.indexOf(bas);
  const j = indexHtml.indexOf(son, i);
  if (i < 0 || j < 0) throw new Error("kesit bulunamadı: " + bas);
  return indexHtml.slice(i, j);
}

for (const fn of ["ydLoad", "ydCevapIsle", "ydVadeliler", "ydKartRender", "ydTekrarAc", "ydRender", "gdAciklamaSatirlari"]) {
  kontrol(`1) ${fn} tanımlı`, new RegExp(`function ${fn}\\(`).test(indexHtml));
}

const ydKod = kesit("// ─── YANLIŞ DEFTERİ", "// ─── GÜNÜN DENEMESİ");
const depo = {};
let bugun = "2026-10-22";
const gecmis = [
  { modul: "sinyal", questionId: "q001", isCorrect: false, answeredAt: "2026-10-20T09:00:00" },
  { modul: "sinyal", questionId: "q002", isCorrect: true, answeredAt: "2026-10-20T09:00:00" },
  { modul: "kelime", questionId: null, isCorrect: false, answeredAt: "2026-10-20T09:00:00" },
];
const ctx = vm.createContext({
  SL_HAVUZ: ["q001", "q002", "q003", "q004"].map((id) => ({ id })),
  localStorage: { getItem: (k) => (k in depo ? depo[k] : null), setItem: (k, v) => { depo[k] = String(v); } },
  cevapGecmisiLoad: () => gecmis,
  sinavChecklistBugunAnahtari: () => bugun,
  document: { getElementById: () => null },
});
vm.runInContext(ydKod, ctx);
const cevap = (qid, isCorrect) => ctx.ydCevapIsle({ modul: "sinyal", questionId: qid, isCorrect });
const kayit = (qid) => ctx.ydLoad().kayitlar[qid];
const vadeli = () => ctx.ydVadeliler(bugun).map((k) => k.qid);

kontrol("2) ay sonu tarih hesabı", ctx.ydGunEkle("2026-10-31", 1) === "2026-11-01" && ctx.ydGunEkle("2026-12-29", 4) === "2027-01-02");
kontrol("3) eski geçmişteki yanlış deftere düşüyor", kayit("q001")?.siradaki === "2026-10-21");
kontrol("4) doğru çözülmüş soru deftere düşmüyor", !kayit("q002"));
kontrol("5) bugün tekrar zamanı gelen: q001", JSON.stringify(vadeli()) === '["q001"]', vadeli().join(","));

cevap("q003", false);
kontrol("6) yeni yanlış ertesi güne planlanıyor", kayit("q003").siradaki === "2026-10-23" && !vadeli().includes("q003"));
cevap("q003", true);
kontrol("7) gün dolmadan doğru cevap takvimi ilerletmiyor", kayit("q003").adim === 0 && kayit("q003").siradaki === "2026-10-23");

// 1-3-7 takvimi: 22'de yanlış → 23, 25, 29.
cevap("q004", false);
bugun = "2026-10-23"; cevap("q004", true);
kontrol("8) 1. gün doğru → 3. güne", kayit("q004").siradaki === "2026-10-25", kayit("q004").siradaki);
bugun = "2026-10-25"; cevap("q004", true);
kontrol("9) 3. gün doğru → 7. güne", kayit("q004").siradaki === "2026-10-29", kayit("q004").siradaki);
bugun = "2026-10-29"; cevap("q004", true);
kontrol("10) 7. gün doğru → öğrenildi", kayit("q004").ogrenildi === true && !vadeli().includes("q004"));

bugun = "2026-10-30";
kontrol("11) vadesi geçenler en eskiden sıralı", vadeli()[0] === "q001", vadeli().join(","));
cevap("q001", true);
cevap("q003", false);
kontrol("12) tekrarda yanlış takvimi baştan başlatıyor", kayit("q003").adim === 0 && kayit("q003").siradaki === "2026-10-31");
const o = ctx.ydOzet(bugun);
kontrol("13) özet sayıları", o.bugun === 0 && o.yarin === 1 && o.ogrenilen === 1 && o.toplam === 3, JSON.stringify(o));
ctx.ydCevapIsle({ modul: "kelime", questionId: null, isCorrect: false });
kontrol("14) Sinyal Lab dışı cevaplar defteri değiştirmiyor", Object.keys(ctx.ydLoad().kayitlar).length === 3);

kontrol("15) cevapKaydet defteri senkron yeniliyor (sabah listesinden önce)", /if\(typeof ydCevapIsle==='function'\)ydCevapIsle\(kayit\);[^\n]*\n\s*cevapSunucuyaSenkronla\(kayit\);/.test(indexHtml));
kontrol("16) sabah listesinde defter maddesi", indexHtml.includes("maddeler.push({tip:'defter'") && indexHtml.includes("if(m.tip==='defter'){ydTekrarAc();return;}"));
kontrol("17) Hata Defteri sekmesinde kart", indexHtml.includes('<div class="yd-kart" id="yd-kart"></div>') && indexHtml.includes("if(mod=='hatalar'){hataDefteriniGoster();ydKartRender();}"));
kontrol("18) açıklama Kural → Örnek → Tuzak", /Kural<\/span>[\s\S]*Örnek<\/span>[\s\S]*Tuzak<\/span>/.test(kesit("function gdAciklamaSatirlari(", "function gdPerde(")));
const ydCss = kesit("/* YANLIŞ DEFTERİ", "/* ACİL KURTARMA");
kontrol("19) emoji yok", !/\p{Extended_Pictographic}/u.test(ydKod + ydCss));
kontrol("20) sarı/altın renk yok", !/#(f5c518|fbbf24|facc15|eab308|d4af37|ffd700|f59e0b)/i.test(ydKod + ydCss));

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz) process.exit(1);
