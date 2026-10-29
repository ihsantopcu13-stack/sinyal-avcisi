// AVCI SOSYAL BİLİMLER ÖĞRETMENİ + İNSAN DİLİ FİLTRESİ — api/_sosyalBilimler.mjs
// ve _klodAciklama.mjs'deki koşullu bağlantısı için deterministik testler.
// Ağ YOK: Supabase ve Anthropic çağrıları sahte fetch ile taklit edilir.

import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { soruBul, soruHash, kullaniciMesaji, klodAciklamaIsle, KLOD_ACIKLAMA_PROMPT } from "../api/_klodAciklama.mjs";
import {
  alanTespit, sosyalKatmanBaglami, soruDurumu, sosyalDogrula, insanDiliFiltresi,
  ALAN_BELIRSIZ, BILGI_DOGRULANMADI, SOSYAL_BILIMLER_PROMPT, SOSYAL_ALANLAR, nesneZarfMi,
} from "../api/_sosyalBilimler.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HAVUZ = JSON.parse(readFileSync(path.join(__dirname, "..", "api", "data", "sorular.json"), "utf-8"));

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const q001 = soruBul(HAVUZ, "q001"); // Genel, alan kanıtı yok, doğru D
const q005 = soruBul(HAVUZ, "q005"); // Sosyal, "Sociologists", doğru C
const q011 = soruBul(HAVUZ, "q011"); // Sosyal, alan kanıtı yok

// --- alan tespiti ---
kontrol("1) sekiz alan destekleniyor", SOSYAL_ALANLAR.length === 8 && SOSYAL_ALANLAR.includes("Siyaset bilimi") && SOSYAL_ALANLAR.includes("Arkeoloji"));
kontrol("2) açık kanıtla alan bulunuyor", alanTespit(q005.soru_en).alan === "Sosyoloji" && alanTespit(q005.soru_en).kanit === "Sociologists");
kontrol("3) kanıt yoksa 'Alan kesin olarak belirlenemedi.'", alanTespit(q011.soru_en).alan === ALAN_BELIRSIZ && ALAN_BELIRSIZ === "Alan kesin olarak belirlenemedi.");
kontrol("4) iki farklı alan geçerse kesin değil", alanTespit("Historians and economists disagree.").alan === ALAN_BELIRSIZ);
kontrol("5) kelime parçası kanıt sayılmaz (prehistoric ≠ history)", alanTespit("Prehistoric tools were found.").alan === ALAN_BELIRSIZ);

// --- koşullu açılma ---
const disarida = HAVUZ.filter(s => !/^sosyal/i.test(s.kategori) && alanTespit(s.soru_en).alan === ALAN_BELIRSIZ);
kontrol("6) Sosyal olmayan, kanıtsız sorularda katman KAPALI", disarida.length > 0 && disarida.every(s => sosyalKatmanBaglami(s) === null), `${disarida.length} soru`);
kontrol("7) Sosyal kategori + kanıt yok → katman açık, alan belirsiz", sosyalKatmanBaglami(q011)?.alan === ALAN_BELIRSIZ);

// --- soru durumu ---
kontrol("8) tam soru eksiksiz", soruDurumu(q005).tamam === true);
kontrol("9) boş seçenek → eksik", soruDurumu({ ...q005, secenekler_tr: [...q005.secenekler_tr.slice(0, 4), " "] }).tamam === false);
kontrol("10) okunamayan işaret → eksik", soruDurumu({ ...q005, soru_en: "Sociologists ??? that stratification" }).tamam === false);

// --- sosyal çıktı doğrulama ---
const sbHam = (ek = {}) => ({
  ana_fiil: "argue",
  cekirdek: { tip: "SVO", s: "Sociologists", v: "argue", o: "that stratification hardly operates independently of cultural norms" },
  sinyaller: "hardly (neredeyse hiç): gizli olumsuz.",
  sade_turkce: "Sosyologlar, tabakalaşmanın kültürel normlardan neredeyse hiç bağımsız işlemediğini söylüyor.",
  bilgi_notu: BILGI_DOGRULANMADI,
  kanit: "Hardly operates independently = bağımsız değil, yani yakından ilişkili.",
  osym_tuzagi: "D şıkkı hardly'yi görmezden gelip tersini söylüyor.",
  ...ek,
});
const b005 = sosyalKatmanBaglami(q005);
{
  const r = sosyalDogrula(sbHam(), q005, b005);
  kontrol("11) geçerli sosyal çıktı kabul ediliyor", !r.hata && r.sosyal.alan === "Sosyoloji" && r.sosyal.cekirdek.tip === "SVO");
}
kontrol("12) cümlede olmayan fiil reddediliyor", sosyalDogrula(sbHam({ ana_fiil: "claim" }), q005, b005).hata === "cumlede_yok");
kontrol("13) cümlede olmayan nesne reddediliyor",
  sosyalDogrula(sbHam({ cekirdek: { tip: "SVO", s: "Sociologists", v: "argue", o: "social classes" } }), q005, b005).hata === "cumlede_yok");
kontrol("14) bilgi notundaki uydurma yıl atılıyor",
  sosyalDogrula(sbHam({ bilgi_notu: "Bu kavram 1922 yılında ortaya çıktı." }), q005, b005).sosyal.bilgi_notu === BILGI_DOGRULANMADI);
kontrol("15) model alanı değiştiremiyor", sosyalDogrula(sbHam({ alan: "Tarih" }), q005, b005).sosyal.alan === "Sosyoloji");

// --- nesnesiz fiil (S–V) ve zarfın nesne yazılması ---
// q027 gerçek model çıktısında "more quickly than anticipated" nesne (O) diye yazılmıştı.
const q027 = soruBul(HAVUZ, "q027");
const b027 = sosyalKatmanBaglami(q027);
const sb027 = cekirdek => sbHam({ ana_fiil: "recovered", cekirdek });
kontrol("15a) SVO'da zarf öbeği nesne olarak reddediliyor",
  sosyalDogrula(sb027({ tip: "SVO", s: "The economy", v: "recovered", o: "more quickly than anticipated" }), q027, b027).hata === "nesne_zarf");
{
  const r = sosyalDogrula(sb027({ tip: "SV", s: "The economy", v: "recovered", o: "" }), q027, b027);
  kontrol("15b) nesnesiz cümle S–V olarak kabul ediliyor", !r.hata && r.sosyal.cekirdek.tip === "SV" && r.sosyal.cekirdek.o === "");
}
kontrol("15c) S–V'de nesne alanı doluysa reddediliyor",
  sosyalDogrula(sb027({ tip: "SV", s: "The economy", v: "recovered", o: "more quickly" }), q027, b027).hata === "sv_nesne_dolu");
kontrol("15d) gerçek nesne zarf sanılmıyor (that-cümleciği, more people, family members)",
  ["that stratification hardly operates independently of cultural norms", "more people", "family members", "early warnings"].every(o => !nesneZarfMi(o)));

// --- İnsan Dili Filtresi ---
{
  const f = insanDiliFiltresi({
    sade_turkce: "Hocam, tek tek bakalım. Bu  cümle zor değil. Bu cümle zor değil. \"hardly\" aynen kalır.",
    kanit: "Hocam, kanıt burada.",
  });
  kontrol("16) art arda tekrarlanan cümle bir kez kalıyor", f.sade_turkce === "Hocam, tek tek bakalım. Bu cümle zor değil. \"hardly\" aynen kalır.");
  kontrol("17) 'Hocam' en fazla bir kez", f.kanit === "Kanıt burada.");
}
{
  const r = sosyalDogrula(sbHam({ sade_turkce: "Hocam, tane tane bakalım.  Hocam, fiil argue." }), q005, b005).sosyal;
  const h = sbHam();
  kontrol("18) filtre doğru cevaba/çivi tabloya/sinyale dokunmuyor",
    r.ana_fiil === h.ana_fiil && JSON.stringify(r.cekirdek) === JSON.stringify(h.cekirdek) && r.sinyaller === h.sinyaller);
  kontrol("19) filtre İngilizce kelimeyi değiştirmiyor", r.sade_turkce.includes("argue"));
}

// --- handler (sahte fetch) ---
function sahteRes() {
  return { kod: null, govde: null, status(k) { this.kod = k; return this; }, json(g) { this.govde = g; return this; } };
}
const temel = (harf, ek = {}) => ({
  dogru: harf,
  yapi: "Boşluk yok; cümlenin tamamı yorumlanıyor.",
  sinyal: "hardly gizli olumsuzdur.",
  eleme: ["A", "B", "C", "D", "E"].filter(h => h !== harf).map(sik => ({ sik, neden: `${sik} anlam uymuyor.` })),
  avci_ipucu: "hardly gör, olumsuz oku.",
  emin: true,
  ...ek,
});
function senaryo({ havuz = HAVUZ, onbellek = null, modelMetni }) {
  const c = { anthropic: 0, yaz: [], govde: null };
  const fetchFn = async (url, opts = {}) => {
    if (url.startsWith("https://api.anthropic.com")) {
      c.anthropic++;
      c.govde = JSON.parse(opts.body);
      return { ok: true, json: async () => ({ content: [{ type: "text", text: modelMetni }] }) };
    }
    if (opts.method === "POST") { c.yaz.push(JSON.parse(opts.body)); return { ok: true, text: async () => "" }; }
    return { ok: true, json: async () => (onbellek ? [{ aciklama: onbellek }] : []) };
  };
  const costGuard = async () => ({ blocked: false });
  const env = { ANTHROPIC_API_KEY: "x", SUPABASE_SERVICE_ROLE_KEY: "srv" };
  return { c, calistir: async (soru_id) => { const res = sahteRes(); await klodAciklamaIsle({ body: { mode: "aciklama", soru_id } }, res, { havuz, costGuard, env, fetchFn }); return res; } };
}
{
  const s = senaryo({ modelMetni: JSON.stringify(temel("D")) });
  const res = await s.calistir("q001");
  kontrol("20) Sosyal olmayan soruda istek BİREBİR eskisi gibi",
    s.c.govde.system === KLOD_ACIKLAMA_PROMPT && s.c.govde.messages[0].content === kullaniciMesaji(q001) && s.c.govde.max_tokens === 1200);
  kontrol("21) Sosyal olmayan soruda yanıt ve önbellek anahtarı değişmedi",
    res.kod === 200 && !("sosyal" in res.govde.aciklama) && s.c.yaz[0].aciklama.kaynak_hash === soruHash(q001));
}
{
  const s = senaryo({ modelMetni: JSON.stringify({ ...temel("C"), sosyal: sbHam() }) });
  const res = await s.calistir("q005");
  kontrol("22) Sosyal soruda katman prompt'u ve ALAN ekleniyor",
    s.c.govde.system.endsWith(SOSYAL_BILIMLER_PROMPT) && s.c.govde.messages[0].content.includes('ALAN: Sosyoloji (soru cümlesindeki açık kanıt: "Sociologists")'));
  kontrol("23) İngilizce cümle ve seçenekler modele aynen gidiyor",
    s.c.govde.messages[0].content.includes(q005.soru_en) && q005.secenekler_tr.every(o => s.c.govde.messages[0].content.includes(o)));
  kontrol("24) yanıtta sosyal blok var, doğru cevap anahtarla aynı",
    res.kod === 200 && res.govde.aciklama.sosyal?.alan === "Sosyoloji" && res.govde.aciklama.dogru === "C");
  kontrol("25) sosyal önbellek anahtarı ayrı sürümlü", s.c.yaz.length === 1 && s.c.yaz[0].aciklama.kaynak_hash === soruHash(q005) + ":sb2");
}
{
  const s = senaryo({ modelMetni: JSON.stringify({ ...temel("C"), sosyal: sbHam({ ana_fiil: "believe" }) }) });
  const res = await s.calistir("q005");
  kontrol("26) uydurma kelimeli sosyal çıktı atılıyor, temel açıklama dönüyor, kayıt yok",
    res.kod === 200 && !res.govde.aciklama.sosyal && s.c.yaz.length === 0);
}
{
  const eksik = HAVUZ.map(s => s.id === "q011" ? { ...s, secenekler_tr: [...s.secenekler_tr.slice(0, 4), ""] } : s);
  const s = senaryo({ havuz: eksik, modelMetni: "{}" });
  const res = await s.calistir("q011");
  kontrol("27) eksik sosyal soruda model çağrılmıyor, tahmin yok", res.kod === 422 && s.c.anthropic === 0 && /tahmin/.test(res.govde.error));
}
{
  const s = senaryo({ onbellek: { ...temel("C"), kaynak_hash: soruHash(q005) }, modelMetni: JSON.stringify({ ...temel("C"), sosyal: sbHam() }) });
  await s.calistir("q005");
  kontrol("28) katmansız eski önbellek kaydı yeniden üretiliyor", s.c.anthropic === 1);
}

// --- istemci kartı (index.html) ---
{
  const html = readFileSync(path.join(__dirname, "..", "index.html"), "utf-8");
  const bas = html.indexOf("function klodAciklamaKartHtml(");
  const son = html.indexOf("function yanlisCevapKlodaSor(", bas);
  const ctx = { ycKacis: s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`) };
  vm.runInNewContext(html.slice(bas, son) + "; this.kart = klodAciklamaKartHtml;", ctx);
  const duz = ctx.kart(temel("D"), 0);
  kontrol("29) sosyal olmayan kart eskisi gibi", duz.includes("🧱 Yapı") && !duz.includes("Sosyal Bilimler"));
  const sosyal = ctx.kart({ ...temel("C"), sosyal: sosyalDogrula(sbHam(), q005, b005).sosyal }, 0);
  const sira = ["Soru durumu", "Konu alanı", "Ana fiil", "Çivi tablo", "Sinyaller", "Sağ–sol kontrolü", "Cümlenin sade Türkçesi",
    "Sosyal Bilimler bilgi notu", "Şık eleme", "Doğru cevap", "Kanıt", "ÖSYM tuzağı", "3 saniyelik çözüm kartı", "Doğrulama durumu"];
  const yerler = sira.map(b => sosyal.indexOf(b));
  kontrol("30) sosyal kart çıktı düzeni sırasıyla", yerler.every((y, i) => y > 0 && (i === 0 || y > yerler[i - 1])), yerler.join(","));
  const svKart = ctx.kart({ ...temel("E"), sosyal: sosyalDogrula(sb027({ tip: "SV", s: "The economy", v: "recovered", o: "" }), q027, b027).sosyal }, 0);
  kontrol("31) S–V kartında nesne satırı yok", svKart.includes("S–V (nesnesiz)") && !svKart.includes("<b>O:</b>") && !svKart.includes("<b>C:</b>"));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
