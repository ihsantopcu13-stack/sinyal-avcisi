// AVCI TURN HANDOFF CUE (iç çalışma adı — henüz kanonik katman adı
// verilmedi). AVCI Turn Controller + Tap-to-Interrupt'ın ÜZERİNE, YENİ
// BİR STATE EKLEMEDEN, sadece mevcut dnavTurnState'in zaten var olan
// (generation-guarded) atama noktalarına küçük bir görsel güncelleme
// (dnavMicGorselGuncelle) ekler: AVCI konuşurken (SPEAKING) mic butonunun
// tooltip'i "kesmek için bas" der, konuşma bitip sıra öğrenciye geçtiğinde
// (IDLE) normale döner. Board/history/current question/answer-leak/5H/5I/
// 5J/api-klod'a HİÇ dokunulmadı. Gerçek Supabase/Anthropic/TTS ağına HİÇ
// çıkılmaz — dnavChat()/dnavKlodSesTaniBaslat()/dnavAvciSustur()/
// dnavMicGorselGuncelle() index.html'den BİREBİR çıkarılıp AYNI paylaşılan
// vm context'inde GERÇEKTEN ÇALIŞTIRILIYOR (sahte yeniden-yazım DEĞİL).

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

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
const klodSrc = readFileSync(path.join(ROOT, "api", "klod.mjs"), "utf-8");

function slice(startMarker, endMarker, fromIdx) {
  const s = html.indexOf(startMarker, fromIdx || 0);
  const e = html.indexOf(endMarker, s);
  if (s === -1 || e === -1) throw new Error(`marker bulunamadı: "${startMarker}" -> "${endMarker}"`);
  return html.slice(s, e);
}

const STATE_DECL = slice("let dnavHistory=[];", "\n\n// ─── MOBİL ALT NAVİGASYON");
const DNAVCHAT_FN = slice("async function dnavChat(){", "function dAns(btn,correct){");
const VOICE_FN_SRC = slice("let dnavRecognition=null;", "\n</script>");
const CUE_FN = slice("function dnavMicGorselGuncelle(){", "\n</script>");

// ============================================================
// STATİK — Turn Handoff Cue kod sözleşmesi + kapsam kilidi
// ============================================================
{
  kontrol("S1) dnavMicGorselGuncelle TAM OLARAK 1 kez tanımlı", (html.match(/function dnavMicGorselGuncelle\(\)\{/g) || []).length === 1);
  kontrol("S2) fail-open — micBtn yoksa erken return", /function dnavMicGorselGuncelle\(\)\{\s*\n\s*const micBtn=document\.getElementById\('dnav-mic-btn'\);\s*\n\s*if\(!micBtn\)return;/.test(CUE_FN));
  kontrol("S3) SPEAKING'de tooltip 'kesmek için bas' anlamına geliyor", /dnavTurnState==='SPEAKING'\)\{\s*\n\s*micBtn\.title='AVCI konuşuyor — kesmek için bas';/.test(CUE_FN));
  kontrol("S4) IDLE'da tooltip normale ('Sesle söyle') dönüyor", /dnavTurnState==='IDLE'\)\{\s*\n\s*micBtn\.title='Sesle söyle';/.test(CUE_FN));
  kontrol("S5) SPEAKING ataması hâlâ benimTurNesil===dnavTurNesil guard'ı İÇİNDE çağrılıyor (stale-turn koruması BOZULMADI)", /if\(benimTurNesil===dnavTurNesil\)\{dnavTurnState='SPEAKING';dnavMicGorselGuncelle\(\);\}/.test(DNAVCHAT_FN));
  kontrol("S6) _dnavSpeakingBitir IDLE dönüşü de AYNI guard İÇİNDE çağrılıyor", /if\(benimTurNesil===dnavTurNesil\)\{dnavTurnState='IDLE';dnavMicGorselGuncelle\(\);\}/.test(DNAVCHAT_FN));
  kontrol("S7) dnavAvciSustur (⏹ Dur / Tap-to-Interrupt) da GÜNCEL tooltip'i çağırıyor (tutarlılık)", /function dnavAvciSustur\(\)\{[\s\S]*?dnavTurnState='IDLE';\s*\n\s*dnavMicGorselGuncelle\(\);\s*\n\}/.test(VOICE_FN_SRC));
  kontrol("S8) YENİ bir state değeri EKLENMEDİ — dnavTurnState hâlâ TAM OLARAK 4 değerle sınırlı", (() => {
    const atamalar = [...html.matchAll(/dnavTurnState=('[A-Z]+')/g)].map((m) => m[1]);
    const izinliler = new Set(["'IDLE'", "'LISTENING'", "'THINKING'", "'SPEAKING'"]);
    return atamalar.every((a) => izinliler.has(a));
  })());
  kontrol("S9) YENİ bir global değişken/state EKLENMEDİ (dnavMicGorselGuncelle içinde sadece const micBtn var, let/var YOK)", !/^\s*(let|var) /m.test(CUE_FN.split("\n").slice(1, -2).join("\n")));
  kontrol("S10) YENİ bir board action/DOM elemanı EKLENMEDİ (SADECE mevcut dnav-mic-btn güncelleniyor)", (CUE_FN.match(/getElementById\(/g) || []).length === 1);
  kontrol("S11) re-entrancy guard (dnavChat) DEĞİŞMEDİ", /if\(dnavTurnState!=='IDLE'\)return;\s*\n\s*dnavTurnState='THINKING';/.test(DNAVCHAT_FN));
  kontrol("S12) THINKING sırasında mic click guard'ı DEĞİŞMEDİ (Tap-to-Interrupt)", /if\(dnavTurnState==='THINKING'\)return;/.test(VOICE_FN_SRC));
  kontrol("S13) SPEAKING sırasında mic click -> dnavAvciSustur() DEĞİŞMEDİ (Tap-to-Interrupt)", /if\(dnavTurnState==='SPEAKING'\)dnavAvciSustur\(\);/.test(VOICE_FN_SRC));
  kontrol("S14) mic start -> LISTENING DEĞİŞMEDİ", /try\{dnavRecognition\.start\(\);dnavTurnState='LISTENING';\}catch\(e\)\{\}/.test(VOICE_FN_SRC));
  kontrol("S15) recognition onend/onerror hâlâ IDLE'a dönüyor (DEĞİŞMEDİ)", /onend=function\(\)\{dnavTurnState='IDLE';/.test(VOICE_FN_SRC) && /onerror=function\(\)\{dnavTurnState='IDLE';/.test(VOICE_FN_SRC));
  kontrol("S16) dnav-stop-btn (⏹ Dur) HÂLÂ mevcut, DEĞİŞMEDİ", /id="dnav-stop-btn"[^>]*onclick="dnavAvciSustur\(\)"/.test(html));
  kontrol("S17) 5H matcher DEĞİŞMEDİ", (html.match(/function avciSonrakiSoruKomutuMu\(metin\)\{/g) || []).length === 1);
  kontrol("S18) 5I matcher DEĞİŞMEDİ", (html.match(/function avciSinyalPratikKomutuMu\(metin\)\{/g) || []).length === 1);
  kontrol("S19) 5J explicit reteach kontratı KORUNUYOR", /AVCI BASAMAK YENIDEN OGRETIMI \(EXPLICIT ADIM\) KURALI \(ZORUNLU\)/.test(html));
  kontrol("S20) 5F SOR->DUR->BEKLE->CEVABI AL->DEGERLENDIR döngüsü KORUNUYOR", /SOR \(tek kucuk soru\) -> DUR -> OGRENCIYI BEKLE -> CEVABI AL -> DEGERLENDIR/.test(html));
  kontrol("S21) BOARD_ACTION_ALLOWLIST hâlâ TAM OLARAK 8 action", (klodSrc.match(/'HIGHLIGHT_VERB', 'SHOW_SVO', 'HIGHLIGHT_SIGNAL', 'SHOW_LEFT_RIGHT',/) || []).length === 1 && (klodSrc.match(/'SHOW_HINT', 'SHOW_AVCI_REFLEX', 'CLEAR_BOARD', 'ELIMINATE_OPTION',/) || []).length === 1);
  kontrol("S22) yeni bir board action EKLENMEDİ", !/'CUE_|'HANDOFF_|'MIC_TITLE/.test(html) && !/'CUE_|'HANDOFF_|'MIC_TITLE/.test(klodSrc));
  kontrol("S23) klodBoardActionlariDogrula TAM OLARAK 1 kez, imzası DEĞİŞMEDİ", (klodSrc.match(/function klodBoardActionlariDogrula\(rawActions, dogrulanmisBaglam, canonical\)/g) || []).length === 1);
  kontrol("S24) api/klod.mjs bu katmanda HİÇ değişmedi ('TURN HANDOFF'/'dnavMicGorselGuncelle' hiç geçmiyor)", !/TURN HANDOFF/i.test(klodSrc) && !/dnavMicGorselGuncelle/.test(klodSrc));
  kontrol("S25) api/klod.mjs — service_role/eval/new Function hâlâ yok", (() => {
    const kodSatirlari = klodSrc.split("\n").filter((s) => !s.trim().startsWith("//")).join("\n");
    return !/SERVICE_ROLE/i.test(kodSatirlari) && !/\beval\(/.test(kodSatirlari) && !/new Function\(/.test(kodSatirlari);
  })());
  kontrol("S26) eval/new Function bu katmanda (client) HİÇ kullanılmadı", !/\beval\(|new Function\(/.test(CUE_FN));
  kontrol("S27) DB/schema/migration/RPC/localStorage/sessionStorage referansı YOK", !/create table|alter table|\.rpc\(|localStorage\.setItem|sessionStorage/i.test(CUE_FN));
}

// ============================================================
// GERÇEK ÇALIŞTIRMA — paylaşılan sandbox (dnavChat + mic + stop + cue
// AYNI context'te, gerçek state paylaşımıyla)
// ============================================================
const TEST_HARNESS = `
function __t_getTurnState(){return dnavTurnState;}
function __t_getTurNesil(){return dnavTurNesil;}
`;
const FULL_SRC = STATE_DECL + "\n" + DNAVCHAT_FN + "\n" + VOICE_FN_SRC + "\n" + TEST_HARNESS;

function fakeInputEl() {
  let v = "";
  return { get value() { return v; }, set value(x) { v = x; }, disabled: false, focus() {} };
}
function fakeBodyEl() {
  return { children: [], scrollTop: 0, appendChild(el) { this.children.push(el); } };
}
function fakeElGeneric() {
  return { _cls: "", _text: "", _html: "", style: {}, appendChild() {}, remove() {} };
}

function sandboxKur({ fetchOk = true, ttsOnEndGecikmeMs = 0, micBtnVarMi = true } = {}) {
  const inp = fakeInputEl();
  const body = fakeBodyEl();
  const micBtn = micBtnVarMi ? { style: {}, title: "Sesle söyle" } : null;
  const els = { "dnav-in": inp, "dnav-chat": body, "dnav-mic-btn": micBtn };
  const fetchCagrilari = [];
  let sonOlusturulanSR = null;
  class FakeSpeechRecognition {
    constructor() { this.lang = null; this.interimResults = null; this.maxAlternatives = null; this.onresult = null; this.onend = null; this.onerror = null; sonOlusturulanSR = this; }
    start() {}
  }
  const sandbox = {
    console: { warn: () => {}, log: () => {}, error: () => {} },
    document: { getElementById: (id) => els[id] || null, createElement: () => fakeElGeneric() },
    window: { SpeechRecognition: FakeSpeechRecognition },
    localStorage: { getItem: () => null },
    KB: [],
    renderMD: (t) => t,
    // 0be0968 (XSS sanitizer) sonrası dnavChat cevabı window._safeHTML ile sarıyor;
    // sandbox'ta sağlanmazsa ReferenceError → catch/fallback yoluna düşülür.
    _safeHTML: (s) => s,
    sb: undefined,
    _aktifSoruModulu: null,
    avciAktifSinyalLabBaglamiAl: () => null,
    avciSonrakiSoruKomutuMu: () => false,
    avciSinyalPratikKomutuMu: () => false,
    fetch: async (url, opts) => {
      fetchCagrilari.push({ url, opts });
      if (!fetchOk) throw new Error("network hatası (simüle)");
      return { ok: true, json: async () => ({ content: [{ type: "text", text: "cevap" }] }) };
    },
    ttsSpeak: (text, lang, onEnd) => new Promise((resolve) => {
      setTimeout(() => { if (onEnd) onEnd(); resolve({ fakeAudio: true }); }, ttsOnEndGecikmeMs);
    }),
    ttsNesil: 0,
    pAudio: null,
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(FULL_SRC, context, { filename: "index.html (turn handoff cue)" });
  return { context, inp, body, micBtn, fetchCagrilari, srSinifOrneği: () => sonOlusturulanSR };
}
function bekle(ms) { return new Promise((r) => setTimeout(r, ms)); }

// 1) Başlangıçta (hiç mesaj yok) tooltip statik varsayılanında kalıyor
{
  const t = sandboxKur();
  kontrol("1) başlangıçta mic tooltip DEĞİŞMEDİ (statik varsayılan)", t.micBtn.title === "Sesle söyle");
}

// 2/3) AVCI konuşmaya başlayınca tooltip GERÇEKTEN 'kesmek için bas' oluyor
{
  const t = sandboxKur({ ttsOnEndGecikmeMs: 300 });
  t.inp.value = "merhaba";
  await t.context.dnavChat();
  kontrol("2) SPEAKING'e geçince tooltip GERÇEKTEN 'AVCI konuşuyor — kesmek için bas' oldu", t.micBtn.title === "AVCI konuşuyor — kesmek için bas");
  kontrol("3) bu SIRADA state gerçekten SPEAKING (test kurulumu doğru)", t.context.__t_getTurnState() === "SPEAKING");
  await bekle(320);
  kontrol("3b) TTS doğal olarak bitince tooltip GERÇEKTEN normale döndü", t.micBtn.title === "Sesle söyle");
}

// 4/5) Tap-to-Interrupt ile kesince tooltip HEMEN normale dönüyor (Dur çağrısı üzerinden)
{
  const t = sandboxKur({ ttsOnEndGecikmeMs: 500 });
  t.inp.value = "merhaba";
  await t.context.dnavChat();
  kontrol("4-ön) SPEAKING'de, tooltip 'kesmek için bas' (test kurulumu doğru)", t.micBtn.title === "AVCI konuşuyor — kesmek için bas");
  t.context.dnavKlodSesTaniBaslat(); // Tap-to-Interrupt: içeride dnavAvciSustur() çağrılıyor
  kontrol("4) interrupt SONRASI tooltip GERÇEKTEN normale döndü ('Sesle söyle')", t.micBtn.title === "Sesle söyle");
  kontrol("5) interrupt SONRASI state GERÇEKTEN LISTENING (Tap-to-Interrupt DEĞİŞMEDİ)", t.context.__t_getTurnState() === "LISTENING");
}

// 6) Standalone ⏹ Dur (dnavAvciSustur doğrudan çağrılırsa) SPEAKING'de tooltip'i düzeltiyor
{
  const t = sandboxKur({ ttsOnEndGecikmeMs: 500 });
  t.inp.value = "merhaba";
  await t.context.dnavChat();
  kontrol("6-ön) SPEAKING'de (test kurulumu doğru)", t.micBtn.title === "AVCI konuşuyor — kesmek için bas");
  t.context.dnavAvciSustur();
  kontrol("6) standalone Dur SONRASI tooltip GERÇEKTEN normale döndü (tutarsızlık YOK)", t.micBtn.title === "Sesle söyle");
}

// 7) micBtn DOM'da yoksa dnavMicGorselGuncelle crash ETMİYOR (fail-open)
{
  const t = sandboxKur({ ttsOnEndGecikmeMs: 10, micBtnVarMi: false });
  t.inp.value = "merhaba";
  let hata = false;
  try { await t.context.dnavChat(); await bekle(30); } catch (e) { hata = true; }
  kontrol("7) micBtn DOM'da yokken TÜM akış (SPEAKING+IDLE geçişleri dahil) CRASH ETMİYOR", !hata);
}

// 8) STALE TURN — Dur ile geçersiz kılınmış bir turun GECİKMELİ TTS bitişi, YENİ turun tooltip'ini BOZAMAZ
{
  const t = sandboxKur({ ttsOnEndGecikmeMs: 200 });
  t.inp.value = "tur A";
  await t.context.dnavChat();
  t.context.dnavAvciSustur(); // Tur A geçersiz kılınıyor, tooltip normale döner
  kontrol("8-ön) Dur sonrası tooltip normal (test kurulumu doğru)", t.micBtn.title === "Sesle söyle");
  // Tur B hemen başlıyor, SPEAKING'e ulaşıyor (kısa gecikmeli TTS)
  t.context.ttsSpeak = (text, lang, onEnd) => new Promise((resolve) => { setTimeout(() => { if (onEnd) onEnd(); resolve({}); }, 500); });
  t.inp.value = "tur B";
  await t.context.dnavChat();
  kontrol("8-ön2) Tur B SPEAKING'de, tooltip GERÇEKTEN 'kesmek için bas' (test kurulumu doğru)", t.micBtn.title === "AVCI konuşuyor — kesmek için bas");
  // Tur A'nın ESKİ, gecikmeli TTS bitişi şimdi ateşleniyor (200ms doldu)
  await bekle(220);
  kontrol("8) Tur A'nın stale TTS bitişi, Tur B'nin tooltip'ini ('kesmek için bas') BOZMADI", t.micBtn.title === "AVCI konuşuyor — kesmek için bas");
  kontrol("8b) Tur B'nin state'i de BOZULMADI (hâlâ SPEAKING)", t.context.__t_getTurnState() === "SPEAKING");
}

// 9) Network/API hatası — SPEAKING'e hiç ulaşılmadığı için tooltip DEĞİŞMEDİ (yanlış bir 'konuşuyor' iddiası yok)
{
  const t = sandboxKur({ fetchOk: false });
  t.inp.value = "merhaba";
  await t.context.dnavChat();
  kontrol("9) network hatasında tooltip HİÇ 'konuşuyor'a dönüşmedi (SPEAKING'e hiç girilmedi)", t.micBtn.title === "Sesle söyle");
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
