// Haftalık rapor + Pazar 21:00 bildirimi. Günlük sayaç, rapor hesabı,
// sw.js'in bildirim metni ve cron dalı vm ile ya da statik olarak denenir.
// Ağ çağrısı yok, npm bağımlılığı yok (web-push import edilmez).

import { readFileSync, existsSync } from "node:fs";
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
const sw = readFileSync(path.join(ROOT, "sw.js"), "utf-8");
const cron = readFileSync(path.join(ROOT, "api/cron-streak-risk.mjs"), "utf-8");
const vercel = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf-8"));

function kesit(metin, bas, son) {
  const i = metin.indexOf(bas);
  const j = metin.indexOf(son, i);
  if (i < 0 || j < 0) throw new Error("kesit bulunamadı: " + bas);
  return metin.slice(i, j);
}

for (const fn of ["hrSayacEkle", "hrHafta", "hrOzet", "hrOzetCacheYaz", "haftalikRaporAc", "hrRender", "hrSonrakiAdim"]) {
  kontrol(`1) ${fn} tanımlı`, new RegExp(`function ${fn}\\(`).test(indexHtml));
}

// --- Günlük sayaç ve hafta hesabı ---
const hrKod = kesit(indexHtml, "// ─── HAFTALIK RAPOR", "// ─── PUAN TAHMİNİ");
const depo = {};
const ctx = vm.createContext({
  localStorage: { getItem: (k) => (k in depo ? depo[k] : null), setItem: (k, v) => { depo[k] = String(v); } },
});
vm.runInContext(hrKod, ctx);
const gun = (g, saat = 10) => new Date(2026, 9, g, saat).getTime(); // Ekim 2026
for (let i = 0; i < 6; i++) ctx.hrSayacEkle({ isCorrect: i < 4, modul: "sinyal" }, gun(25)); // Pazar: 6 soru, 4 doğru
for (let i = 0; i < 3; i++) ctx.hrSayacEkle({ isCorrect: true, modul: "okuma" }, gun(22));  // okuma: 3 doğru
ctx.hrSayacEkle({ isCorrect: false, modul: "sinyal" }, gun(15)); // geçen hafta
const bu = ctx.hrHafta(ctx.hrSayacLoad(), gun(25, 20), 0);
const once = ctx.hrHafta(ctx.hrSayacLoad(), gun(25, 20), 7);
kontrol("2) bu hafta 9 soru, %78 doğru, 2 gün, 1 okuma parçası", bu.soru === 9 && bu.oran === 78 && bu.gun === 2 && bu.okuma === 1, JSON.stringify(bu));
kontrol("3) önceki 7 gün ayrı sayılıyor", once.soru === 1 && once.oran === 0, JSON.stringify(once));
kontrol("4) aynı soruyu tekrar çözmek de sayılıyor (tekilleştirme yok)", ctx.hrSayacLoad()["2026-10-25"].s === 6);
ctx.hrSayacEkle({ isCorrect: true, modul: "sinyal" }, gun(25 + 40));
kontrol("5) 35 günden eski günler siliniyor", !("2026-10-15" in ctx.hrSayacLoad()));
kontrol("6) hiç soru yoksa sonraki adım deneme", ctx.hrSonrakiAdim({ bu: { soru: 0 }, bekleyen: 0 }).fn === "gunlukDenemeAc");
kontrol("7) defterde bekleyen varsa önce tekrar", ctx.hrSonrakiAdim({ bu: { soru: 5, gun: 6 }, bekleyen: 2 }).fn === "ydTekrarAc");
kontrol("8) cevapKaydet sayacı besliyor", indexHtml.includes("if(typeof hrCevapIsle==='function')hrCevapIsle(kayit);"));

// --- sw.js bildirim metni ---
const swKod = kesit(sw, "function haftalikGovde(", "async function ozetOku(");
const swCtx = vm.createContext({});
vm.runInContext(swKod + "this.govde=haftalikGovde;", swCtx);
const ozet = { gunler: { "2026-10-25": { s: 100, d: 68 }, "2026-10-20": { s: 20, d: 14 }, "2026-10-10": { s: 50, d: 0 } }, puan: 46.5 };
const metin = swCtx.govde(ozet, gun(25, 21), 0);
kontrol("9) bildirim kişinin sayılarını yazıyor", metin === "Bu hafta 120 soru, %68 doğru, tahmini puan 46,5. Raporuna bak.", metin);
kontrol("10) özet yoksa sunucu metni kalıyor (null)", swCtx.govde(null, gun(25), 0) === null);
kontrol("11) seri riski cümlesi ekleniyor", /3 günlük serin kopmasın\.$/.test(swCtx.govde(ozet, gun(25, 21), 3)));
kontrol("12) sw özet önbelleğini temizlikte silmiyor", sw.includes("k !== CACHE_NAME && k !== OZET_CACHE"));
kontrol("13) sayfa ve sw aynı önbellek adını kullanıyor", indexHtml.includes("const HR_OZET_CACHE='sa-ozet-v1';") && sw.includes("const OZET_CACHE = 'sa-ozet-v1';") && indexHtml.includes("const HR_OZET_URL='/__sa/haftalik-ozet';") && sw.includes("const OZET_URL = '/__sa/haftalik-ozet';"));
kontrol("14) bildirime tıklayınca açık sekme rapora gidiyor", sw.includes("c.navigate(url)") && indexHtml.includes("location.hash==='#haftalik-rapor'"));

// --- cron dalı ---
kontrol("15) yeni api dosyası yok (Hobby 12 sınırı)", !existsSync(path.join(ROOT, "api/cron-haftalik-rapor.mjs")));
kontrol("16) yeni cron satırı yok, 18:00 cron'u kullanılıyor", (vercel.crons || []).length === 2 && vercel.crons.some((c) => c.path === "/api/cron-streak-risk" && c.schedule === "0 18 * * *"));
kontrol("17) Pazar dalı seri akışından önce", cron.indexOf("haftalikGunuMu())") > 0 && cron.indexOf("haftalikGunuMu())") < cron.indexOf("current_streak=gt.0"));
kontrol("18) CRON_SECRET doğrulaması dallardan önce", cron.indexOf("authHeader !== `Bearer ${cronSecret}`") < cron.indexOf("istekTuru(req) === 'haftalik'"));
const cronKod = kesit(cron, "export const HAFTALIK_PAYLOAD", "async function haftalikGonder(").replace(/export /g, "");
const cronCtx = vm.createContext({});
vm.runInContext(cronKod + "this.P=HAFTALIK_PAYLOAD;this.gun=haftalikGunuMu;this.grup=haftalikGruplar;", cronCtx);
kontrol("19) Pazar algılanıyor (25 Ekim 2026 18:00 UTC)", cronCtx.gun(new Date(Date.UTC(2026, 9, 25, 18))) === true && cronCtx.gun(new Date(Date.UTC(2026, 9, 26, 18))) === false);
const gruplar = cronCtx.grup([{ user_id: "a" }, { user_id: "b" }, { user_id: "c" }], { b: 4 });
kontrol("20) seri riskli kullanıcı tek bildirimde seri bilgisiyle", gruplar.length === 2 && gruplar.find((g) => g.payload.seri === 4)?.subs.length === 1 && gruplar.find((g) => !g.payload.seri)?.subs.length === 2);
kontrol("21) bildirim raporu açıyor, tur haftalik", cronCtx.P.url === "/#haftalik-rapor" && cronCtx.P.tur === "haftalik");
kontrol("22) emoji yok", !/\p{Extended_Pictographic}/u.test(hrKod + swKod + cronKod));
kontrol("23) varsayım ve ÖSYM hatırlatması", hrKod.includes("varsayım") && hrKod.includes("ÖSYM'den kontrol et"));

console.log(`\n${toplam - basarisiz}/${toplam} geçti`);
if (basarisiz) process.exit(1);
