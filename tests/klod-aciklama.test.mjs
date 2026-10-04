// KLOD AÇIKLAMA (mode:'aciklama') — api/_klodAciklama.mjs için deterministik
// testler. Ağ YOK: Supabase ve Anthropic çağrıları sahte fetch ile taklit
// edilir; gerçek tablo/anahtar kullanılmaz.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { soruBul, soruHash, kullaniciMesaji, aciklamaDogrula, klodAciklamaIsle } from "../api/_klodAciklama.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HAVUZ = JSON.parse(readFileSync(path.join(__dirname, "..", "api", "data", "sorular.json"), "utf-8"));

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const q001 = soruBul(HAVUZ, "q001"); // dogru_index 3 → D
const gecerli = (ek = {}) => JSON.stringify({
  dogru: "D",
  yapi: "Yapı açıklaması.",
  sinyal: "Despite zıtlık bildirir.",
  eleme: ["A", "B", "C", "E"].map(sik => ({ sik, neden: `${sik} anlam uymuyor.` })),
  avci_ipucu: "Despite gör, zıtlığı ara.",
  emin: true,
  ...ek,
});

// --- saf fonksiyonlar ---
kontrol("1) soruBul geçerli id'yi buluyor", q001 && q001.id === "q001");
kontrol("2) soruBul uydurma/biçimsiz id'yi reddediyor",
  soruBul(HAVUZ, "q999") === null && soruBul(HAVUZ, "../x") === null && soruBul(HAVUZ, 5) === null);
kontrol("3) soruHash kararlı ve içerik değişince değişiyor",
  soruHash(q001) === soruHash({ ...q001 }) && soruHash(q001) !== soruHash({ ...q001, aciklama_tr: "farklı" }));
kontrol("4) kullanıcı mesajı referans açıklamayı ve doğru harfi içeriyor",
  kullaniciMesaji(q001).includes("REFERANS AÇIKLAMA: " + q001.aciklama_tr) && kullaniciMesaji(q001).includes("DOĞRU CEVAP: D"));

kontrol("5) geçerli JSON kabul ediliyor", !aciklamaDogrula(gecerli(), q001).hata);
kontrol("6) ```json çitli çıktı da ayrıştırılıyor", !aciklamaDogrula("```json\n" + gecerli() + "\n```", q001).hata);
kontrol("7) bozuk JSON reddediliyor", aciklamaDogrula('{"dogru": "D", yapi }', q001).hata === "json_bozuk");
kontrol("8) yanlış şıkkı savunan çıktı reddediliyor", aciklamaDogrula(gecerli({ dogru: "A" }), q001).hata === "dogru_uyusmuyor");
kontrol("9) eksik eleme reddediliyor",
  !!aciklamaDogrula(gecerli({ eleme: [{ sik: "A", neden: "x" }] }), q001).hata);
kontrol("10) doğru şık elemede reddediliyor",
  !!aciklamaDogrula(gecerli({ eleme: ["A", "B", "C", "D"].map(sik => ({ sik, neden: "x" })) }), q001).hata);
kontrol("11) boş alan reddediliyor", !!aciklamaDogrula(gecerli({ yapi: "  " }), q001).hata);
kontrol("12) emin boolean değilse reddediliyor", !!aciklamaDogrula(gecerli({ emin: "evet" }), q001).hata);
kontrol("13) eleme harf sırasına diziliyor",
  aciklamaDogrula(gecerli({ eleme: ["E", "C", "A", "B"].map(sik => ({ sik, neden: "x" })) }), q001).aciklama.eleme.map(e => e.sik).join("") === "ABCE");

// --- handler (sahte fetch) ---
function sahteRes() {
  return { kod: null, govde: null, status(k) { this.kod = k; return this; }, json(g) { this.govde = g; return this; } };
}
function senaryo({ onbellek = null, modelMetni = gecerli(), env = { ANTHROPIC_API_KEY: "x", SUPABASE_SERVICE_ROLE_KEY: "srv" }, blok = false } = {}) {
  const cagrilar = { anthropic: 0, yaz: [], costGuard: 0 };
  const fetchFn = async (url, opts = {}) => {
    if (url.startsWith("https://api.anthropic.com")) {
      cagrilar.anthropic++;
      const govde = JSON.parse(opts.body);
      cagrilar.model = govde.model;
      return { ok: true, json: async () => ({ content: [{ type: "text", text: modelMetni }] }) };
    }
    if (opts.method === "POST") {
      cagrilar.yaz.push({ url, govde: JSON.parse(opts.body), anahtar: opts.headers.apikey });
      return { ok: true, text: async () => "" };
    }
    return { ok: true, json: async () => (onbellek ? [{ aciklama: onbellek }] : []) };
  };
  const costGuard = async () => { cagrilar.costGuard++; return blok ? { blocked: true, status: 429, json: { error: "limit" } } : { blocked: false }; };
  return { cagrilar, calistir: async (body) => { const res = sahteRes(); await klodAciklamaIsle({ body }, res, { havuz: HAVUZ, costGuard, env, fetchFn }); return res; } };
}

{
  const s = senaryo();
  const res = await s.calistir({ mode: "aciklama", soru_id: "q001" });
  kontrol("14) önbellek boş → model çağrılıyor, Sonnet 5.5", s.cagrilar.anthropic === 1 && s.cagrilar.model === "claude-sonnet-5-5");
  kontrol("15) emin:true → service_role ile kaydediliyor, hash ekli",
    res.kod === 200 && s.cagrilar.yaz.length === 1 && s.cagrilar.yaz[0].anahtar === "srv" && s.cagrilar.yaz[0].govde.aciklama.kaynak_hash === soruHash(q001));
  kontrol("16) istemciye kaynak_hash gönderilmiyor", res.govde.aciklama && !("kaynak_hash" in res.govde.aciklama));
}
{
  const kayit = { ...JSON.parse(gecerli()), kaynak_hash: soruHash(q001) };
  const s = senaryo({ onbellek: kayit });
  const res = await s.calistir({ mode: "aciklama", soru_id: "q001" });
  kontrol("17) önbellekte varsa model ve costGuard çağrılmıyor",
    res.kod === 200 && res.govde.kaynak === "onbellek" && s.cagrilar.anthropic === 0 && s.cagrilar.costGuard === 0);
}
{
  const s = senaryo({ onbellek: { ...JSON.parse(gecerli()), kaynak_hash: "eski" } });
  await s.calistir({ mode: "aciklama", soru_id: "q001" });
  kontrol("18) hash tutmazsa yeniden üretilip üzerine yazılıyor", s.cagrilar.anthropic === 1 && s.cagrilar.yaz.length === 1);
}
{
  const s = senaryo({ modelMetni: gecerli({ emin: false }) });
  const res = await s.calistir({ mode: "aciklama", soru_id: "q001" });
  kontrol("19) emin:false → gösteriliyor ama kaydedilmiyor", res.kod === 200 && res.govde.aciklama.emin === false && s.cagrilar.yaz.length === 0);
}
{
  const s = senaryo({ modelMetni: "Tabii! İşte açıklama: ..." });
  const res = await s.calistir({ mode: "aciklama", soru_id: "q001" });
  kontrol("20) bozuk JSON → 502 dürüst hata, kayıt yok", res.kod === 502 && typeof res.govde.error === "string" && s.cagrilar.yaz.length === 0);
}
{
  const s = senaryo({ env: { ANTHROPIC_API_KEY: "x" } });
  const res = await s.calistir({ mode: "aciklama", soru_id: "q001" });
  kontrol("21) service_role yoksa açıklama dönüyor, yazma denenmiyor", res.kod === 200 && s.cagrilar.yaz.length === 0);
}
{
  const s = senaryo();
  const res = await s.calistir({ mode: "aciklama", soru_id: "q999" });
  kontrol("22) bilinmeyen soru_id → 400, model/costGuard yok", res.kod === 400 && s.cagrilar.anthropic === 0 && s.cagrilar.costGuard === 0);
}
{
  const s = senaryo({ blok: true });
  const res = await s.calistir({ mode: "aciklama", soru_id: "q001" });
  kontrol("23) günlük limit doluysa model çağrılmıyor", res.kod === 429 && s.cagrilar.anthropic === 0);
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
