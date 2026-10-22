// Birlikte seri — arkadaş daveti. Davet kodu şifreleme, API dalları (sahte
// fetch ile), ortak seri hesabı (vm) ve panel bağlantısı denenir. Gerçek
// Supabase'e ya da ağa çıkılmaz.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

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

// --- Sunucu: davet kodu ---
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
const sahteIstekler = [];
let sahteYanit = [];
globalThis.fetch = async (url) => { sahteIstekler.push(String(url)); return { ok: true, status: 200, text: async () => JSON.stringify(sahteYanit) }; };
const api = await import(pathToFileURL(path.join(ROOT, "api/anon-profile.mjs")).href);
const { createHash } = await import("node:crypto");
const anahtar = createHash("sha256").update("sinyal-davet-v1:test-service-role").digest();
const baskaAnahtar = createHash("sha256").update("sinyal-davet-v1:baska").digest();
const id = "3f2a9c1e-7b4d-4e8a-9c2f-1a2b3c4d5e6f";
const kod = api.davetKoduUret(id, anahtar);
kontrol("1) kod 22 karakter, anon_id'yi içermiyor", /^[A-Za-z0-9_-]{22}$/.test(kod) && !kod.includes("3f2a9c1e"), kod);
kontrol("2) kod geri çözülüyor", api.davetKoduCoz(kod, anahtar) === id);
kontrol("3) aynı kişi her zaman aynı kod", api.davetKoduUret(id, anahtar) === kod);
kontrol("4) başka anahtarla aynı kişiye çözülmüyor", api.davetKoduCoz(kod, baskaAnahtar) !== id);
kontrol("5) uydurma kod reddediliyor", api.davetKoduCoz("AAAAAAAAAAAAAAAAAAAAAA", anahtar) === null && api.davetKoduCoz("kisa", anahtar) === null && api.davetKoduCoz("../../etc", anahtar) === null);
kontrol("6) UUID olmayan anon_id'ye kod yok", api.davetKoduUret("abc", anahtar) === null);

function sahteRes() {
  const r = { kod: 0, govde: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (k) => { r.kod = k; return r; };
  r.json = (g) => { r.govde = g; return r; };
  r.end = () => r;
  return r;
}
sahteYanit = [{ anon_id: id, streak: 6, streak_last: "2026-10-22" }];
let res = sahteRes();
await api.default({ method: "GET", query: { davet: kod + ",AAAAAAAAAAAAAAAAAAAAAA" }, headers: { "x-forwarded-for": "1.1.1.1" } }, res);
const ark = res.govde?.arkadaslar || [];
kontrol("7) GET davet: arkadaşın serisi dönüyor", res.kod === 200 && ark[0]?.found && ark[0].streak === 6 && ark[0].streak_last === "2026-10-22", JSON.stringify(res.govde));
kontrol("8) çözülemeyen kod 'bulunamadı'", ark[1] && ark[1].found === false);
kontrol("9) sadece seri alanları okunuyor (kurtarma kodu yok)", sahteIstekler.at(-1).includes("select=anon_id,streak,streak_last") && !JSON.stringify(res.govde).includes("recovery"));
sahteYanit = [{ anon_id: id }];
res = sahteRes();
await api.default({ method: "POST", body: { anon_id: id, action: "davet" }, headers: { "x-forwarded-for": "1.1.1.2" } }, res);
kontrol("10) POST davet kod veriyor", res.kod === 200 && res.govde.kod === kod);
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
res = sahteRes();
await api.default({ method: "GET", query: { davet: kod }, headers: { "x-forwarded-for": "1.1.1.3" } }, res);
kontrol("11) service_role anahtarı yoksa davet kapalı", res.kod === 503);
const apiDosyalari = readdirSync(path.join(ROOT, "api")).filter((f) => f.endsWith(".mjs") && !f.startsWith("_"));
kontrol("12) yeni api dosyası yok (Hobby 12 sınırı)", apiDosyalari.length <= 12 && !apiDosyalari.some((f) => /davet|arkadas/.test(f)), apiDosyalari.length);

// --- İstemci: ortak seri ---
const dvKod = kesit("// ─── BİRLİKTE SERİ", "// ─── PUAN TAHMİNİ");
const ctx = vm.createContext({});
vm.runInContext(dvKod, ctx);
const g = (...gunler) => Object.fromEntries(gunler.map((x) => ["2026-10-" + x, 1]));
const seri = ctx.dvCalismaSerisi(g(18, 19, 20, 21, 22));
kontrol("13) ardışık 5 gün = seri 5", seri.seri === 5 && seri.son === "2026-10-22", JSON.stringify(seri));
kontrol("14) boşluk seriyi böler", ctx.dvCalismaSerisi(g(15, 16, 20, 21)).seri === 2);
kontrol("15) ay geçişi doğru", ctx.dvCalismaSerisi({ "2026-10-31": 1, "2026-11-01": 2 }).seri === 2);
const bugun = "2026-10-22";
kontrol("16) dün biten seri hâlâ canlı, önceki gün biten kopmuş", ctx.dvCanliSeri({ seri: 3, son: "2026-10-21" }, bugun) === 3 && ctx.dvCanliSeri({ seri: 3, son: "2026-10-20" }, bugun) === 0);
kontrol("17) ortak seri: ikisi de bugün, 5 ve 3 gün → 3", ctx.dvOrtakSeri({ seri: 5, son: bugun }, { seri: 3, son: bugun }, bugun) === 3);
kontrol("18) ortak seri: biri dün bitti → düne kadar ortak", ctx.dvOrtakSeri({ seri: 5, son: bugun }, { seri: 4, son: "2026-10-21" }, bugun) === 4);
kontrol("19) ortak seri: biri 2 gün önce bitti → 0", ctx.dvOrtakSeri({ seri: 5, son: bugun }, { seri: 4, son: "2026-10-20" }, bugun) === 0);
kontrol("20) ortak seri: arkadaşın verisi yok → 0", ctx.dvOrtakSeri({ seri: 5, son: bugun }, { seri: 0, son: null }, bugun) === 0);
kontrol("21) ad temizleniyor (etiket yok, 20 karakter)", ctx.dvAdTemizle('<img src=x>Ayşe Nur') === "img srcxAyşe Nur" && ctx.dvAdTemizle("a".repeat(40)).length === 20);

// --- Bağlantılar ---
kontrol("22) panelde birlikte seri kartı", indexHtml.includes('<div class="dv-kart" id="dv-kart"></div>') && indexHtml.includes("if(dvKartEl){dvKartEl.style.display='block';if(typeof davetKartRender==='function')davetKartRender();}"));
kontrol("23) günlük senkron gerçek seriyi yazıyor (eski strd.gun yok)", !indexHtml.includes("strd?.gun") && indexHtml.includes("streak: dvSeri.seri,"));
kontrol("24) günün ilk cevabında seri senkronu", indexHtml.includes("if(typeof dvSeriSenkron==='function')dvSeriSenkron();"));
kontrol("25) davet bağlantısı ?davet= ile karşılanıyor", dvKod.includes("p.get('davet')") && dvKod.includes("history.replaceState"));
const dvCss = indexHtml.slice(indexHtml.indexOf("/* BİRLİKTE SERİ"), indexHtml.indexOf("/* YANLIŞ DEFTERİ"));
kontrol("26) emoji yok", !/\p{Extended_Pictographic}/u.test(dvKod + dvCss));
kontrol("27) sarı/altın renk yok", !/#(f5c518|fbbf24|facc15|eab308|d4af37|ffd700|f59e0b)/i.test(dvKod + dvCss));

console.log(`\n${toplam - basarisiz}/${toplam} geçti`);
if (basarisiz) process.exit(1);
