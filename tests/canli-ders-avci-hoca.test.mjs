// CANLI DERS ↔ AVCI HOCA (KATMAN 5) KÖPRÜSÜ — deterministik/yerel test.
// Mevcut "CANLI DERS — Yeşil tahtada sesli konu anlatımı" ekranı Katman 5 öğretmen
// motoruna bağlı DEĞİLDİ (scripted: açıklama -> örnek -> soru -> tıklayınca cevabı hemen açar).
// Bu köprü, öğrenci İSTERSE (kendi tetikler; otomatik model çağrısı YOK) soru aşamasında
// yazılı AVCI Hoca diyaloğunu Canlı Ders ekranından ayrılmadan yürütmesini sağlar:
//   - mesaj GERÇEK dnavChat() üzerinden MEVCUT /api/klod (mode:'chat') yoluna gider
//     (yeni endpoint/model/prompt/state YOK; dnavChat DEĞİŞMEDİ)
//   - dnavChat'in render ettiği cevap düğümü (.msg.k) Canlı Ders paneline yansır
//   - tur bitince sistem öğrenciyi BEKLER (yeni istek yok), eşzamanlı ikinci istek yok
//   - Canlı Ders'in eski içeriği/anlatımı/seçenek davranışı AYNEN kalır
// Gerçek dnavChat kaynağı index.html'den BİREBİR çıkarılıp Node vm'de GERÇEKTEN
// çalıştırılır (diğer avci-* testleriyle AYNI desen); gerçek ağ/model çağrısı YOK.

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
const DNAVCHAT_FN = slice("async function dnavChat(){", "function dAns(btn,correct){");
const VOICE_FN_SRC = slice("let dnavRecognition=null;", "\n</script>");
const CL_DATA = slice("const CL_KONULAR=[", "let clIdx=0,clTypeTimer=null;");
const CL_MODUL_HTML_FN = slice("function clModulHTML(){", "let clAudioCtx=null");
const CL_ASAMA_FN = slice("function clOynatKonu(idx){", "function clCevapSec(i){");
const CL_CEVAP_FN = slice("function clCevapSec(i){", "function clTekrarAnlat(){");
const BRIDGE = slice("// ==== CANLI DERS ↔ AVCI HOCA (KATMAN 5) KÖPRÜSÜ ====", "// ==== /CANLI DERS ↔ AVCI HOCA (KATMAN 5) KÖPRÜSÜ ====");

// ============================================================
// STATİK — eski Canlı Ders KORUNUYOR; köprü kapsamı dar ve güvenli
// ============================================================
{
  kontrol("S1) Canlı Ders giriş noktası mevcut: mod-canliders + canliders-container + başlık metni AYNEN", /id="mod-canliders"/.test(html) && /id="canliders-container"/.test(html) && /CANLI DERS — Yeşil tahtada sesli konu anlatımı/.test(html));
  kontrol("S2) Yeşil tahta içeriği AYNEN: CL_KONULAR ilk konu 'despite / although' + örnek/soru/seçenek/cevap alanları duruyor", /baslik:'despite \/ although'/.test(CL_DATA) && /soru:"______ the traffic was terrible/.test(CL_DATA) && /secenekler:\["Despite","Although","In spite of","Because of"\]/.test(CL_DATA) && (CL_DATA.match(/baslik:'/g) || []).length >= 4);
  kontrol("S3) clModulHTML eski tahta bloklarını AYNEN koruyor (açıklama/örnek/soru/seçenekler/cevap + Tekrar Anlat/Sonraki Konu)", ["cl-blok-aciklama", "cl-blok-ornek", "cl-blok-soru", "cl-secenekler", "cl-blok-cevap", "cl-metin-aciklama"].every((id) => CL_MODUL_HTML_FN.includes(`id="${id}"`)) && /Tekrar Anlat/.test(CL_MODUL_HTML_FN) && /Sonraki Konu →/.test(CL_MODUL_HTML_FN) && /class="tahta-wrap"/.test(CL_MODUL_HTML_FN));
  kontrol("S4) Yeni panel MEVCUT soru bloğunun İÇİNDE (ekrandan ayrılmadan): seçeneklerden sonra, cevap bloğundan önce; girdi + Gönder mevcut", (() => { const a = CL_MODUL_HTML_FN.indexOf('id="cl-secenekler"'); const p = CL_MODUL_HTML_FN.indexOf('id="cl-hoca"'); const c = CL_MODUL_HTML_FN.indexOf('id="cl-blok-cevap"'); return a > 0 && p > a && p < c && /id="cl-hoca-in"/.test(CL_MODUL_HTML_FN) && /id="cl-hoca-gonder"/.test(CL_MODUL_HTML_FN) && /onclick="clHocaGonder\(\)"/.test(CL_MODUL_HTML_FN) && /onclick="clHocaBaslat\(\)"/.test(CL_MODUL_HTML_FN); })());
  kontrol("S5) Eski anlatım akışı DEĞİŞMEDİ: açıklama -> örnek -> soru zinciri ve TTS çağrıları duruyor; soru aşamasına SADECE typeof-korumalı 1 kanca eklendi", /ttsSpeak\(k\.aciklama,'tr-TR',\(\)=>clAsamaOrnek\(k\),clHookMouth\)/.test(html) && /ttsSpeak\(k\.ornekEn,'en-US',\(\)=>clAsamaSoru\(k\),clHookMouth\)/.test(html) && /ttsSpeak\(k\.soru,'en-US',null,clHookMouth\)/.test(html) && (html.match(/if\(typeof clHocaGoster==='function'\)clHocaGoster\(\);/g) || []).length === 1 && (CL_ASAMA_FN.match(/if\(typeof clHocaSifirla==='function'\)clHocaSifirla\(\);/g) || []).length === 1);
  kontrol("S6) Canlı Ders seçenek davranışı (clCevapSec: anında cevap+açıklama+TTS+ustalık) AYNEN", /Yanlış, doğru cevap:/.test(CL_CEVAP_FN) && /ttsSpeak\(tamMetin,'tr-TR',null,clHookMouth\)/.test(CL_CEVAP_FN) && /konuUstalikGuncelle\(k\.baslik,i===k\.cevap\)/.test(CL_CEVAP_FN) && !/clHoca/.test(CL_CEVAP_FN));
  kontrol("S7) dnavChat DEĞİŞMEDİ/bağlanmadı: köprüye ait hiçbir şey dnavChat içinde yok; TEK tanım", !/clHoca/.test(DNAVCHAT_FN) && (html.match(/async function dnavChat\(\)\{/g) || []).length === 1 && /if\(dnavTurnState!=='IDLE'\)return;\s*\n\s*dnavTurnState='THINKING';/.test(DNAVCHAT_FN));
  const kod = BRIDGE.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  kontrol("S8) Yeni AI endpoint/model/ağ çağrısı YOK: köprüde fetch/XMLHttpRequest/'/api'/anthropic/klod/sendBeacon yok", !/fetch\(|XMLHttpRequest|\/api|anthropic|klod|sendBeacon|WebSocket|EventSource/i.test(kod));
  kontrol("S9) Güvenlik: köprüde eval/new Function/document.write/secret/service_role/DB/storage YOK; öğrenci metni SADECE textContent ile balona yazılıyor", !/\beval\(|new Function\(|document\.write|sk-ant|service_role|supabase|localStorage|sessionStorage|\.rpc\(/i.test(kod) && /clHocaBalon\('u',gorunen,false\)/.test(kod) && /if\(html\)d\.innerHTML=icerik;else d\.textContent=icerik;/.test(kod));
  kontrol("S10) Kapsam: yeni voice/mikrofon/realtime YOK (getUserMedia/MediaRecorder/SpeechRecognition/WebRTC), otomatik model çağrısı YOK (clHocaIlet yalnız clHocaBaslat/clHocaGonder'dan)", !/getUserMedia|MediaRecorder|SpeechRecognition|WebRTC|VAD/i.test(kod) && (html.match(/clHocaIlet\(/g) || []).length === 3);
}

// ============================================================
// GERÇEK ÇALIŞTIRMA — gerçek dnavChat + köprü, sahte DOM/ağ
// ============================================================
class FakeEl {
  constructor() { this.children = []; this.className = ""; this.textContent = ""; this._html = ""; this.style = {}; this.value = ""; this.disabled = false; this.scrollTop = 0; this.scrollHeight = 0; this._focus = 0; this.observers = []; }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = v; if (v === "") this.children.length = 0; }
  appendChild(el) { this.children.push(el); const yeni = el; this.observers.forEach((cb) => Promise.resolve().then(() => cb([{ addedNodes: [yeni] }]))); }
  remove() {}
  focus() { this._focus++; }
}

const TEST_HARNESS = `
function __t_turnState(){return dnavTurnState;}
function __t_bekliyor(){return clHocaBekliyor;}
`;
const FULL_SRC = STATE_DECL + "\n" + DNAVCHAT_FN + "\n" + VOICE_FN_SRC + "\n" + CL_DATA + "\nlet clIdx=0,clTypeTimer=null;\n" + BRIDGE + "\n" + TEST_HARNESS;

function sandboxKur({ yanitlar = ["Boşluktan sonra ne geliyor?"], bekletFetch = false } = {}) {
  const el = {};
  for (const id of ["dnav-in", "dnav-chat", "cl-hoca", "cl-hoca-chat", "cl-hoca-giris", "cl-hoca-baslat", "cl-hoca-in", "dnav-mic-btn"]) el[id] = new FakeEl();
  el["cl-hoca"].style.display = "none";
  el["cl-hoca-chat"].style.display = "none";
  el["cl-hoca-giris"].style.display = "none";
  el["dnav-mic-btn"].title = "Sesle söyle";
  const fetchCagrilari = [];
  let yanitSira = 0;
  let serbest = null;
  const sandbox = {
    console: { warn: () => {}, log: () => {}, error: () => {} },
    document: { getElementById: (id) => el[id] || null, createElement: () => new FakeEl() },
    window: {},
    localStorage: { getItem: () => null },
    KB: [],
    renderMD: (t) => t,
    sb: undefined,
    _aktifSoruModulu: null,
    avciAktifSinyalLabBaglamiAl: () => null,
    avciSonrakiSoruKomutuMu: () => false,
    avciSinyalPratikKomutuMu: () => false,
    MutationObserver: class { constructor(cb) { this.cb = cb; } observe(hedef) { hedef.observers.push(this.cb); } },
    setTimeout: (fn, ms) => { const t = setTimeout(fn, ms); if (t && t.unref) t.unref(); return t; },
    fetch: async (url, opts) => {
      fetchCagrilari.push({ url, body: JSON.parse(opts.body) });
      if (bekletFetch) await new Promise((r) => { serbest = r; });
      const metin = yanitlar[Math.min(yanitSira++, yanitlar.length - 1)];
      return { ok: true, json: async () => ({ content: [{ type: "text", text: metin }] }) };
    },
    ttsSpeak: (text, lang, onEnd) => new Promise((resolve) => { setTimeout(() => { if (onEnd) onEnd(); resolve({ fakeAudio: true }); }, 0); }),
    ttsNesil: 0,
    pAudio: null,
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(FULL_SRC, context, { filename: "index.html (canli ders avci hoca)" });
  return { context, el, fetchCagrilari, birak: () => serbest && serbest() };
}
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const balonlar = (t, tur) => t.el["cl-hoca-chat"].children.filter((c) => c.className === "msg " + tur);

// ---- Tur 1: öğrenci "AVCI Hoca ile birlikte çöz" der ----
{
  const t = sandboxKur({ yanitlar: ["Boşluktan sonra ne geliyor? Bir isim mi, bir cümle mi?", "Güzel. Şimdi 'the traffic was terrible' içinde çekimli fiil görüyor musun?"] });
  t.context.clHocaGoster();
  kontrol("1) soru aşamasında panel görünür (clHocaGoster)", t.el["cl-hoca"].style.display === "block");
  t.context.clHocaBaslat();
  kontrol("2) 'birlikte çöz' TAM 1 istek başlatır: MEVCUT /api/klod, mode:'chat' (yeni endpoint YOK)", t.fetchCagrilari.length === 1 && t.fetchCagrilari[0].url === "/api/klod" && t.fetchCagrilari[0].body.mode === "chat");
  const b = t.fetchCagrilari[0].body;
  kontrol("3) mevcut Katman 5 öğretmen prompt'u (dnavChat system) gidiyor; gönderilen ilk mesaj Canlı Ders sorusunu + seçenekleri taşıyor; cevap anahtarı (cevap indexi/açıklaması) GİTMİYOR", /AVCI YEDI ADIM/.test(b.system) && /SOCRATIC TEK ADIM KURALI/.test(b.system) && b.messages.length === 1 && b.messages[0].role === "user" && /Canlı Ders sorusu/.test(b.messages[0].content) && /______ the traffic was terrible/.test(b.messages[0].content) && /B\) Although/.test(b.messages[0].content) && !/Boşluktan sonra «the traffic was terrible»|cevapAciklama|cevap:1/.test(JSON.stringify(b)) && b.context === null);
  kontrol("4) tur sürerken (THINKING) yeni istek YOK; öğrenci balonu temiz metinle (textContent) görünüyor", t.context.__t_turnState() === "THINKING" && balonlar(t, "u").length === 1 && balonlar(t, "u")[0].textContent === "Bu soruyu birlikte çözelim." && balonlar(t, "u")[0].innerHTML === "");
  await bekle(40);
  kontrol("5) AVCI Hoca cevabı Canlı Ders panelinde GÖRÜNÜYOR (dnavChat'in render ettiği düğüm yansıtıldı); yazma göstergesi ('...') yansıtılmadı: TAM 1 öğretmen balonu", balonlar(t, "k").length === 1 && /Boşluktan sonra ne geliyor/.test(balonlar(t, "k")[0].innerHTML) && !/chat-typing/.test(balonlar(t, "k")[0].innerHTML));
  kontrol("6) tur bitince sistem ÖĞRENCİYİ BEKLER: dnavTurnState IDLE, yeni istek YOK (hâlâ 1), cevap alanı yeniden açık ve odakta, bekleme bayrağı kapalı", t.context.__t_turnState() === "IDLE" && t.fetchCagrilari.length === 1 && t.el["cl-hoca-in"].disabled === false && t.el["cl-hoca-in"]._focus >= 1 && t.context.__t_bekliyor() === false);
  // ---- Tur 2: öğrenci cevabını yazar ve Gönder der ----
  t.el["cl-hoca-in"].value = "Cümle.";
  t.context.clHocaGonder();
  await bekle(40);
  const b2 = t.fetchCagrilari[1] && t.fetchCagrilari[1].body;
  kontrol("7) öğrenci cevabı ('Cümle.') AYNI Katman 5 yoluna gider ve konuşma sürekliliği korunur: messages = [Canlı Ders sorusu, hoca cevabı, 'Cümle.']", t.fetchCagrilari.length === 2 && t.fetchCagrilari[1].url === "/api/klod" && b2.messages.length === 3 && b2.messages[2].content === "Cümle." && b2.messages[1].role === "assistant" && /Boşluktan sonra ne geliyor/.test(b2.messages[1].content));
  kontrol("8) ikinci hoca cevabı da gösterildi (öğrenci 1, hoca 2 balon), sistem yine BEKLİYOR (istek sayısı 2'de kaldı)", balonlar(t, "u").length === 2 && balonlar(t, "k").length === 2 && /çekimli fiil/.test(balonlar(t, "k")[1].innerHTML) && t.context.__t_turnState() === "IDLE" && (await bekle(30), t.fetchCagrilari.length === 2));
  // ---- boş gönderim / XSS ----
  t.el["cl-hoca-in"].value = "   ";
  t.context.clHocaGonder();
  await bekle(10);
  kontrol("9) boş/boşluk cevap İSTEK ATMAZ", t.fetchCagrilari.length === 2);
  t.el["cl-hoca-in"].value = "<img src=x onerror=alert(1)>";
  t.context.clHocaGonder();
  await bekle(40);
  const xssBalon = balonlar(t, "u")[2];
  kontrol("10) HTML içeren öğrenci metni balona textContent olarak yazılır (innerHTML BOŞ) — enjeksiyon YOK", xssBalon && xssBalon.textContent === "<img src=x onerror=alert(1)>" && xssBalon.innerHTML === "");
  // ---- topic değişimi sıfırlar ----
  t.context.clHocaSifirla();
  kontrol("11) konu değişince/tekrar anlatınca clHocaSifirla: panel gizlenir, sohbet temizlenir, 'birlikte çöz' butonu geri gelir, girdi açık, bekleme bayrağı kapalı", t.el["cl-hoca"].style.display === "none" && t.el["cl-hoca-chat"].children.length === 0 && t.el["cl-hoca-giris"].style.display === "none" && t.el["cl-hoca-baslat"].style.display === "inline-block" && t.el["cl-hoca-in"].disabled === false && t.context.__t_bekliyor() === false);
}

// ---- Tur devam ederken ikinci gönderim / başka sekme cevabı ----
{
  const t = sandboxKur({ bekletFetch: true });
  t.context.clHocaBaslat();
  await bekle(5);
  kontrol("12) cevap beklenirken (THINKING) ikinci gönderim İSTEK ATMAZ ve öğrenciye nazik uyarı gösterilir", (() => { t.el["cl-hoca-in"].value = "acele cevap"; t.context.clHocaGonder(); return t.fetchCagrilari.length === 1 && balonlar(t, "k").some((c) => /konuşuyor\/düşünüyor/.test(c.textContent)); })());
  t.birak();
  await bekle(40);
  kontrol("13) bekleyen tur bitince cevap gösterilir ve girdi yeniden açılır", balonlar(t, "k").some((c) => /Boşluktan/.test(c.innerHTML)) && t.el["cl-hoca-in"].disabled === false);
}
{
  const t = sandboxKur();
  // KLOD sekmesindeki (Canlı Ders'ten BAĞIMSIZ) bir cevap köprü tetiklenmeden yansıtılmaz
  t.context.clHocaBaslat();
  await bekle(40);
  const once = balonlar(t, "k").length;
  const dis = new FakeEl(); dis.className = "msg k"; dis.innerHTML = "başka bir cevap";
  t.el["dnav-chat"].appendChild(dis);
  await bekle(10);
  kontrol("14) bekleme bayrağı kapalıyken düşen .msg.k (ör. KLOD sekmesi/uyarı) Canlı Ders paneline YANSITILMAZ", balonlar(t, "k").length === once);
  t.context.clHocaSifirla();
  const t2 = sandboxKur();
  kontrol("15) köprü hiç başlatılmadıysa hiçbir istek/DOM değişikliği yok (otomatik model çağrısı YOK)", t2.fetchCagrilari.length === 0 && t2.el["cl-hoca-chat"].children.length === 0);
}

console.log(`\n${toplam - basarisiz}/${toplam} kontrol geçti`);
if (basarisiz > 0) { console.error(`${basarisiz} kontrol BAŞARISIZ`); process.exit(1); }
