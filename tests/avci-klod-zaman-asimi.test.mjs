// KLOD /api/klod İSTEMCİ ZAMAN AŞIMI — deterministik/yerel test.
// dnavChat()'in /api/klod isteği hiç yanıt gelmezse (ör. mobil bağlantı yarıda koptu) sonsuza
// kadar beklemez: KLOD_ZAMAN_ASIMI_MS dolunca istek iptal edilir (AbortController) ve MEVCUT hata
// yolu çalışır — hata kutusu ("↻ Tekrar dene" ile), tur IDLE, girdi açık, cevapsız kullanıcı
// mesajı geçmişte kalmaz. Hem KLOD ekranı hem Canlı Ders (_dnavHedef) için geçerli.
// AbortController/setTimeout olmayan ortamda (eski tarayıcı, diğer testlerin sandbox'ı) davranış
// eskisiyle aynıdır. Gerçek dnavChat kaynağı index.html'den BİREBİR çıkarılıp Node vm'de
// çalıştırılır (canli-ders-avci-hoca.test.mjs ile AYNI desen); gerçek ağ/model çağrısı YOK.

import vm from "node:vm";
import { readFileSync } from "node:fs";
import path from "node:path";
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

const html = readFileSync(path.join(ROOT, "index.html"), "utf-8").replace(/\r\n/g, "\n");
function slice(startMarker, endMarker) {
  const s = html.indexOf(startMarker);
  const e = html.indexOf(endMarker, s);
  if (s === -1 || e === -1) throw new Error(`marker bulunamadı: "${startMarker}" -> "${endMarker}"`);
  return html.slice(s, e);
}

const STATE_DECL = slice("let dnavHistory=[];", "\n\n// ─── MOBİL ALT NAVİGASYON");
// Süre testte 50 ms'ye indirilir (sabit kaynakta tanımlıysa metinden, değilse sandbox'tan).
const TEST_SURE_MS = 50;
const DNAVCHAT_FN = slice("async function dnavChat(){", "function dAns(btn,correct){").replace(/KLOD_ZAMAN_ASIMI_MS=\d+/, `KLOD_ZAMAN_ASIMI_MS=${TEST_SURE_MS}`);
const VOICE_FN_SRC = slice("let dnavRecognition=null;", "\n</script>");
const CL_DATA = slice("const CL_KONULAR=[", "let clIdx=0,clTypeTimer=null;");
const BRIDGE = slice("// ==== CANLI DERS ↔ AVCI HOCA (KATMAN 5) KÖPRÜSÜ ====", "// ==== /CANLI DERS ↔ AVCI HOCA (KATMAN 5) KÖPRÜSÜ ====");
const TEST_HARNESS = `
function __t_turnState(){return dnavTurnState;}
function __t_history(){return dnavHistory;}
`;
const FULL_SRC = STATE_DECL + "\n" + DNAVCHAT_FN + "\n" + VOICE_FN_SRC + "\n" + CL_DATA + "\nlet clIdx=0,clTypeTimer=null;\n" + BRIDGE + "\n" + TEST_HARNESS;

class FakeEl {
  constructor() { this.children = []; this.className = ""; this.textContent = ""; this._html = ""; this.style = {}; this.value = ""; this.disabled = false; this.scrollTop = 0; this.scrollHeight = 0; this._focus = 0; }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = v; if (v === "") this.children.length = 0; }
  appendChild(el) { this.children.push(el); el._ebeveyn = this; }
  remove() { const p = this._ebeveyn; if (!p) return; const i = p.children.indexOf(this); if (i >= 0) p.children.splice(i, 1); this._ebeveyn = null; }
  focus() { this._focus++; }
  querySelectorAll(sec) { return sec === ".klod-hata" ? this.children.filter((c) => c.className === "klod-hata") : []; }
}

// fetchModu: "asili" (hiç yanıt yok; signal varsa abort'ta AbortError ile reddedilir),
//            "hizli" (200 + metin), "hata500"
function sandboxKur({ fetchModu = "asili", abortVar = true, zamanlayiciVar = true } = {}) {
  const el = {};
  for (const id of ["dnav-in", "dnav-chat", "cl-hoca", "cl-hoca-chat", "cl-hoca-giris", "cl-hoca-baslat", "cl-hoca-in", "dnav-mic-btn"]) el[id] = new FakeEl();
  el["dnav-mic-btn"].title = "Sesle söyle";
  const durum = { mod: fetchModu, cagrilar: [], abortSayisi: 0 };
  class SayanAbortController extends AbortController {
    abort(...a) { durum.abortSayisi++; return super.abort(...a); }
  }
  const sandbox = {
    console: { warn: () => {}, log: () => {}, error: () => {} },
    document: { getElementById: (id) => el[id] || null, createElement: () => new FakeEl() },
    window: {},
    localStorage: { getItem: () => null },
    KB: [],
    renderMD: (t) => t,
    _safeHTML: (t) => t,
    sb: undefined,
    _aktifSoruModulu: null,
    avciAktifSinyalLabBaglamiAl: () => null,
    avciSonrakiSoruKomutuMu: () => false,
    avciSinyalPratikKomutuMu: () => false,
    KLOD_ZAMAN_ASIMI_MS: TEST_SURE_MS,
    fetch: (url, opts) => {
      durum.cagrilar.push({ url, body: JSON.parse(opts.body), signalVar: !!(opts && opts.signal) });
      if (durum.mod === "hizli") return Promise.resolve({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: "Cevap " + durum.cagrilar.length }] }) });
      if (durum.mod === "hata500") return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: "API hatası" }) });
      return new Promise((_, reddet) => {
        const s = opts && opts.signal;
        if (s) s.addEventListener("abort", () => { const e = new Error("The operation was aborted."); e.name = "AbortError"; reddet(e); });
      });
    },
    ttsSpeak: () => undefined,
    ttsNesil: 0,
    pAudio: null,
  };
  if (abortVar) sandbox.AbortController = SayanAbortController;
  if (zamanlayiciVar) {
    sandbox.setTimeout = (fn, ms) => { const t = setTimeout(fn, ms); if (t && t.unref) t.unref(); return t; };
    sandbox.clearTimeout = (t) => clearTimeout(t);
  }
  const context = vm.createContext(sandbox);
  vm.runInContext(FULL_SRC, context, { filename: "index.html (klod zaman aşımı)" });
  return { context, el, durum };
}
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const hataKutusu = (kutu) => kutu.children.find((c) => c.className === "klod-hata");
const kutuMetni = (k) => (k ? k.children.map((c) => c.textContent).join(" ") : "");
const ZAMAN_METNI = /yanıt vermedi/;

// ---- Z1 + Z3: KLOD ekranında asılı istek → zaman aşımı → Tekrar dene ----
{
  const t = sandboxKur({ fetchModu: "asili" });
  t.el["dnav-in"].value = "KLOD'a soru";
  t.context.dnavChat(); // asılı istek — await EDİLMEZ
  await bekle(TEST_SURE_MS + 150);
  const k = hataKutusu(t.el["dnav-chat"]);
  const gecmiste = t.context.__t_history().some((m) => m.role === "user" && /KLOD'a soru/.test(m.content));
  kontrol("Z1) asılı istek süre dolunca iptal: hata kutusu (zaman aşımı metni + Tekrar dene), tur IDLE, girdi açık, cevapsız kullanıcı mesajı geçmişte YOK",
    !!k && ZAMAN_METNI.test(kutuMetni(k)) && /Tekrar dene/.test(kutuMetni(k)) && t.context.__t_turnState() === "IDLE" && t.el["dnav-in"].disabled === false && !gecmiste && t.durum.cagrilar[0].signalVar,
    `hata kutusu=${!!k}, metin="${kutuMetni(k).slice(0, 60)}", tur=${t.context.__t_turnState()}, girdi kapalı=${t.el["dnav-in"].disabled}, signal=${t.durum.cagrilar[0].signalVar}`);
  const btn = k && k.children.find((c) => c.className === "klod-hata-btn");
  t.durum.mod = "hizli";
  if (btn) btn.onclick();
  await bekle(60);
  kontrol("Z3) zaman aşımından sonra 'Tekrar dene' → 2. istek AYNI mesajla gider, cevap görünür, tur IDLE",
    t.durum.cagrilar.length === 2 && t.durum.cagrilar[1].body.messages.at(-1).content === "KLOD'a soru" && t.el["dnav-chat"].children.some((c) => c.className === "msg k" && /Cevap 2/.test(c.innerHTML)) && t.context.__t_turnState() === "IDLE",
    `tekrar butonu=${!!btn}, istek=${t.durum.cagrilar.length}`);
}

// ---- Z2: hızlı cevapta zamanlayıcı temizlenir, sonradan abort YOK ----
{
  const t = sandboxKur({ fetchModu: "hizli" });
  t.el["dnav-in"].value = "hızlı soru";
  await t.context.dnavChat();
  await bekle(TEST_SURE_MS + 100);
  kontrol("Z2) hızlı cevap: cevap görünür, süre geçtikten sonra abort() ÇAĞRILMAZ, hata kutusu yok",
    t.el["dnav-chat"].children.some((c) => c.className === "msg k" && /Cevap 1/.test(c.innerHTML)) && t.durum.abortSayisi === 0 && !hataKutusu(t.el["dnav-chat"]),
    `abort sayısı=${t.durum.abortSayisi}`);
}

// ---- Z4: Canlı Ders (_dnavHedef) yolunda zaman aşımı ----
{
  const t = sandboxKur({ fetchModu: "asili" });
  t.context.clHocaGoster();
  t.context.clHocaBaslat();
  await bekle(TEST_SURE_MS + 150);
  const k = hataKutusu(t.el["cl-hoca-chat"]);
  kontrol("Z4) Canlı Ders'te asılı istek süre dolunca iptal: hata kutusu cl-hoca-chat'te, KLOD ekranına düşmez, tur IDLE, girdi açık",
    !!k && ZAMAN_METNI.test(kutuMetni(k)) && !hataKutusu(t.el["dnav-chat"]) && t.context.__t_turnState() === "IDLE" && t.el["cl-hoca-in"].disabled === false,
    `panelde=${!!k}, tur=${t.context.__t_turnState()}, girdi kapalı=${t.el["cl-hoca-in"].disabled}`);
}

// ---- Z5: AbortController/setTimeout olmayan ortam — davranış eskisi gibi ----
{
  const t = sandboxKur({ fetchModu: "hizli", abortVar: false, zamanlayiciVar: false });
  t.el["dnav-in"].value = "eski tarayıcı";
  let hata = null;
  try { await t.context.dnavChat(); } catch (e) { hata = e; }
  kontrol("Z5) AbortController/setTimeout YOKKEN çökmez: istek gider (signal'siz), cevap görünür",
    !hata && t.durum.cagrilar.length === 1 && t.durum.cagrilar[0].signalVar === false && t.el["dnav-chat"].children.some((c) => c.className === "msg k" && /Cevap 1/.test(c.innerHTML)),
    hata ? String(hata.message) : `istek=${t.durum.cagrilar.length}`);
}

// ---- Z6: HTTP 500 hâlâ 'genel' metniyle; yalnız iptal 'zaman aşımı' ----
{
  const t = sandboxKur({ fetchModu: "hata500" });
  t.el["dnav-in"].value = "500 sorusu";
  await t.context.dnavChat();
  const k = hataKutusu(t.el["dnav-chat"]);
  kontrol("Z6) HTTP 500 → 'KLOD şu an yanıt veremiyor' (genel) metni, zaman aşımı metni DEĞİL; Tekrar dene var",
    !!k && /yanıt veremiyor/.test(kutuMetni(k)) && !ZAMAN_METNI.test(kutuMetni(k)) && /Tekrar dene/.test(kutuMetni(k)),
    `metin="${kutuMetni(k).slice(0, 60)}"`);
}

console.log(`\n${toplam - basarisiz}/${toplam} kontrol geçti`);
if (basarisiz > 0) { console.error(`${basarisiz} kontrol BAŞARISIZ`); process.exit(1); }
