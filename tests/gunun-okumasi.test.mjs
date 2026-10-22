// Günün Okuma Parçası — her gün 1 kısa paragraf, süreli 3 soru. Parça
// verisi, tarihe göre seçim, yanlış defteri ve sabah listesi bağlantısı
// index.html içinden vm ile denenir. Ağ çağrısı yok.

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

function kesit(bas, son) {
  const i = indexHtml.indexOf(bas);
  const j = indexHtml.indexOf(son, i);
  if (i < 0 || j < 0) throw new Error("kesit bulunamadı: " + bas);
  return indexHtml.slice(i, j);
}

for (const fn of ["okParcaSec", "okSoruBul", "okYukle", "gununOkumasiAc", "okBitir", "okRender", "okBugunBittiMi", "okAciklamaSatirlari"]) {
  kontrol(`1) ${fn} tanımlı`, new RegExp(`function ${fn}\\(`).test(indexHtml));
}

const okKod = kesit("// ─── GÜNÜN OKUMA PARÇASI", "// ─── PUAN TAHMİNİ");
const ctx = vm.createContext({});
vm.runInContext(okKod + "this.P=OKUMA_PARCALARI;this.K=OK_KURAL;this.sec=okParcaSec;this.bul=okSoruBul;this.sure=okToplamSn;", ctx);
const P = ctx.P;

kontrol("2) en az 15 özgün parça", P.length >= 15, P.length);
kontrol("3) parça kimlikleri tekil", new Set(P.map((p) => p.id)).size === P.length);
const kelimeSayisi = (t) => t.split(/\s+/).filter(Boolean).length;
const uzunlukHatasi = P.filter((p) => { const n = kelimeSayisi(p.metin); return n < 100 || n > 150; });
kontrol("4) parçalar kısa: 100-150 kelime", uzunlukHatasi.length === 0, uzunlukHatasi.map((p) => p.id + ":" + kelimeSayisi(p.metin)).join(","));

let yapiHatasi = [];
let ornekHatasi = [];
const cevapSayaci = [0, 0, 0, 0, 0];
const kelimeler = (t) => t.toLowerCase().replace(/[^a-z0-9' ]/g, " ").split(/\s+/).filter((w) => w && w !== "..." );
for (const p of P) {
  if (p.sorular.length !== 3) yapiHatasi.push(p.id + ": soru sayısı");
  const metinKelime = new Set(kelimeler(p.metin));
  p.sorular.forEach((s, i) => {
    const ad = `${p.id}-${i + 1}`;
    if (!Array.isArray(s.opts) || s.opts.length !== 5 || new Set(s.opts).size !== 5) yapiHatasi.push(ad + ": 5 farklı şık");
    if (!(s.ans >= 0 && s.ans < 5)) yapiHatasi.push(ad + ": cevap");
    if (!ctx.K[s.tip]) yapiHatasi.push(ad + ": tip " + s.tip);
    if (!s.q || !s.ornek || !s.ornekTr || !s.tuzak) yapiHatasi.push(ad + ": eksik alan");
    cevapSayaci[s.ans]++;
    const eksik = kelimeler(s.ornek).filter((w) => !metinKelime.has(w));
    if (eksik.length) ornekHatasi.push(ad + ": " + eksik.join(" "));
  });
}
kontrol("5) her parçada 3 soru, 5 farklı şık, geçerli cevap ve tip", yapiHatasi.length === 0, yapiHatasi.join(" | "));
kontrol("6) Örnek satırı parçadan alıntı (her kelime parçada var)", ornekHatasi.length === 0, ornekHatasi.join(" | "));
const enCok = Math.max(...cevapSayaci) / P.length / 3;
kontrol("7) doğru şıklar dağılmış (tek harf %35'i geçmiyor)", enCok <= 0.35, cevapSayaci.join("/"));

kontrol("8) 22 Ekim ilk parça", ctx.sec("2026-10-22").id === P[0].id);
kontrol("9) ertesi gün sıradaki parça", ctx.sec("2026-10-23").id === P[1].id);
kontrol("10) liste bitince başa dönüyor", ctx.sec("2026-10-22").id === ctx.sec(new Date(Date.UTC(2026, 9, 22 + P.length)).toISOString().slice(0, 10)).id);
let gunHatasi = 0;
for (let g = -40; g < 60; g++) {
  const t = new Date(Date.UTC(2026, 9, 22 + g)).toISOString().slice(0, 10);
  if (!ctx.sec(t)) gunHatasi++;
}
kontrol("11) geçmiş ve gelecek 100 günde hep parça var", gunHatasi === 0);
kontrol("12) süre 3 soru için 6 dakika", ctx.sure(P[0]) === 360);
kontrol("13) soru kimliği çözülüyor (ok03-2)", ctx.bul("ok03-2")?.soru === P[2].sorular[1] && ctx.bul("q001") === null && ctx.bul("ok99-1") === null);

// Yanlış defteri okuma sorusunu kabul ediyor
const ydKod = kesit("// ─── YANLIŞ DEFTERİ", "// ─── GÜNÜN DENEMESİ");
const depo = {};
const ydCtx = vm.createContext({
  SL_HAVUZ: [{ id: "q001" }],
  okSoruBul: ctx.bul,
  localStorage: { getItem: (k) => (k in depo ? depo[k] : null), setItem: (k, v) => { depo[k] = String(v); } },
  cevapGecmisiLoad: () => [],
  sinavChecklistBugunAnahtari: () => "2026-10-22",
  document: { getElementById: () => null },
});
vm.runInContext(ydKod, ydCtx);
ydCtx.ydCevapIsle({ modul: "okuma", questionId: "ok01-2", isCorrect: false });
kontrol("14) okuma yanlışı yanlış defterine düşüyor", ydCtx.ydLoad().kayitlar["ok01-2"]?.siradaki === "2026-10-23");
kontrol("15) defter okuma sorusunu buluyor", ydCtx.ydSoru("ok01-2")?.ans === P[0].sorular[1].ans && ydCtx.ydSoru("q001")?.sl);

kontrol("16) bitince cevaplar modul 'okuma' ile kaydediliyor", /cevapKaydet\(\{questionId:okSoruId\(p,i\),modul:'okuma'/.test(okKod));
kontrol("17) sabah listesinde okuma maddesi", indexHtml.includes("maddeler.push(SABAH_OKUMA_MADDE);") && indexHtml.includes("if(!v.maddeler.some(m=>m.tip==='okuma'))"));
kontrol("18) madde okuma bitince işaretleniyor ve açılıyor", indexHtml.includes("if(m.tip==='okuma')return okBugunBittiMi();") && indexHtml.includes("if(m.tip==='okuma'){gununOkumasiAc();return;}"));
kontrol("19) açıklama Kural → Örnek → Tuzak", /Kural<\/span>[\s\S]*Örnek<\/span>[\s\S]*Tuzak<\/span>/.test(kesit("function okAciklamaSatirlari(", "let _okSayac")));
kontrol("20) varsayım ve ÖSYM hatırlatması", okKod.includes("Varsayım:") && okKod.includes("ÖSYM'den kontrol et"));
kontrol("21) 50 puan programı okuma parçasına bağlı", program.includes("günün okuma parçası") && program.includes('href="/#okuma"'));
kontrol("22) Paragraf sekmesinde düğme", indexHtml.includes('onclick="gununOkumasiAc()"'));
const okCss = indexHtml.slice(indexHtml.indexOf("/* GÜNÜN OKUMA PARÇASI"), indexHtml.indexOf("/* YANLIŞ DEFTERİ"));
kontrol("23) emoji yok", !/\p{Extended_Pictographic}/u.test(okKod + okCss));
kontrol("24) sarı/altın renk yok", !/#(f5c518|fbbf24|facc15|eab308|d4af37|ffd700|f59e0b)/i.test(okKod + okCss));

console.log(`\n${toplam - basarisiz}/${toplam} geçti`);
if (basarisiz) process.exit(1);
