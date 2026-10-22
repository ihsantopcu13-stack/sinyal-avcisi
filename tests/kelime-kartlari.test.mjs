// Kelime Kartları — YDS sık kelime destesi ve günlük yeni kart sınırı.
// Kuyruk mantığı index.html içinden vm ile denenir. Ağ çağrısı yok.

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

const veri = kesit("const kkData=[", "function kkSave(){");
const ctx = vm.createContext({});
vm.runInContext(veri.replace("const kkData=", "this.kkData=") , ctx);
const kartlar = ctx.kkData;
kontrol("1) deste en az 500 kelime", kartlar.length >= 500, String(kartlar.length));
kontrol("2) ilk 44 kart yerinde (sa_kk sırası korunuyor)", kartlar[0].en === "liability" && kartlar[43].en === "autonomous");
const tekrar = kartlar.map((k) => k.en.toLowerCase()).filter((e, i, a) => a.indexOf(e) !== i);
kontrol("3) tekrar eden kelime yok", tekrar.length === 0, tekrar.join(","));
kontrol("4) her kartta kelime, Türkçe ve örnek cümle", kartlar.every((k) => k.en && k.tr && k.ex && k.ex.length > 10));
kontrol("5) örnek cümle kelimeyi içeriyor (çekimli hâli dahil)", kartlar.slice(44).filter((k) => !k.ex.toLowerCase().includes(k.en.toLowerCase().split(" ")[0].slice(0, 4))).length <= 10);

// Kuyruk: vadesi gelen tekrarlar + günde en fazla 15 yeni kart.
const depo = {};
const kuyrukKod = kesit("const KK_YENI_GUNLUK=", "function kkIlerlemeRender(");
const kctx = vm.createContext({
  kkData: kartlar.map((k) => ({ ...k, interval: 1, rep: 0, ef: 2.5, due: 0 })),
  localStorage: { getItem: (k) => (k in depo ? depo[k] : null), setItem: (k, v) => { depo[k] = String(v); } },
  sinavChecklistBugunAnahtari: () => "2026-10-22",
});
vm.runInContext(kuyrukKod + "this.durum=kkBugunDurum;this.ekle=kkBugunYeniEkle;this.kur=()=>{kkBuildQueue();return kkQueue;};this.data=kkData;", kctx);
let d = kctx.durum();
kontrol("6) ilk gün 15 yeni kart, tekrar yok", d.yeni.length === 15 && d.tekrar.length === 0);
kontrol("7) yeni kartlar listedeki sırayla (eski 44 önce)", d.yeni[0].en === "liability");
kctx.data[0].due = Date.now() + 86400000; kctx.data[0].rep = 1; kctx.ekle();
kctx.data[1].due = Date.now() - 1000; kctx.data[1].rep = 0; kctx.ekle();
d = kctx.durum();
kontrol("8) görülen kart yeni sayılmıyor, kota düşüyor", d.yeni.length === 13 && d.tekrar.length === 1, `${d.yeni.length}/${d.tekrar.length}`);
const q = kctx.kur();
kontrol("9) kuyrukta önce tekrar sonra yeni", q[0] === kctx.data[1] && q.length === 14);
kontrol("10) kkAnswer yeni kartı sayıyor", /function kkAnswer\(q\)\{\s*if\(!kkCurrent\)return;\s*if\(!kkGoruldu\(kkCurrent\)\)kkBugunYeniEkle\(\);/.test(indexHtml));
kontrol("11) kelime cevapları geçmişe yazılıyor (sabah listesi)", indexHtml.includes("cevapKaydet({modul:'kelime',soru:kkCurrent.en"));
const ui = kesit('<div class="dmod" id="mod-kelime"', '<div class="dmod" id="mod-tuzak"') + kesit("function kkIlerlemeRender(", "function kkFlip(") + kesit("/* KELİME KARTLARI", "@media");
kontrol("12) emoji yok (kelime ekranı)", !/\p{Extended_Pictographic}/u.test(ui.replace(/[⛶✓]/g, "")));
kontrol("13) sarı/altın renk yok", !/#(f5c518|fbbf24|facc15|eab308|d4af37|ffd700|f59e0b)/i.test(ui));
kontrol("14) varsayım notu", ui.includes("varsayım"));

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz) process.exit(1);
