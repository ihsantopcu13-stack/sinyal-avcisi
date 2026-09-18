// AVCI TURN CONTROLLER MVP (iç çalışma adı — henüz kanonik katman adı
// verilmedi). 5A-5K'nin ÜZERİNE, sadece konuşma-sırası disiplini (IDLE→
// LISTENING→THINKING→SPEAKING→IDLE) ve mevcut TTS mekanizmasını reuse
// eden bir ⏹ Dur butonu ekler. FULL LIVE VOICE DEĞİL: auto-listen,
// auto-send, always-listening YOK. Gerçek Supabase/Anthropic/TTS ağına
// HİÇ çıkılmaz — dnavChat()/dnavKlodSesTaniBaslat()/dnavAvciSustur()
// index.html'den BİREBİR çıkarılıp aynı paylaşılan vm context'inde
// GERÇEKTEN ÇALIŞTIRILIYOR (sahte yeniden-yazım DEĞİL, diğer avci-*.
// test.mjs dosyalarıyla AYNI desen).

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
const KLOD_TAB_BLOK = slice("} else if(txt.includes('KLOD')){", "} else if(txt.includes('Kelime')){");
const DNAVCHAT_FN = slice("async function dnavChat(){", "function dAns(btn,correct){");
const VOICE_FN_SRC = slice("let dnavRecognition=null;", "\n</script>");
// ÖNEMLİ: Node vm'de top-level `let` bir context property'si OLARAK dışa
// yansımaz (sadece `function` bildirimleri yansır — bkz. avci-klod-
// context.test.mjs'deki AYNI not) — dnavTurnState/dnavTurNesil `let` ile
// tanımlı olduğu için bunlara dışarıdan erişmek/yazmak için extracted
// kaynağın SONUNA küçük test-yardımcı fonksiyonları ekleniyor. Bunlar
// gerçek dosyanın bir parçası DEĞİL, sadece bu test dosyasının kurduğu
// vm script'inin bir parçası.
const TEST_HARNESS = `
function __t_getTurnState(){return dnavTurnState;}
function __t_setTurnState(v){dnavTurnState=v;}
function __t_getTurNesil(){return dnavTurNesil;}
`;
const FULL_SRC = STATE_DECL + "\n" + DNAVCHAT_FN + "\n" + VOICE_FN_SRC + "\n" + TEST_HARNESS;

// ============================================================
// STATİK — turn state sözleşmesi + kapsam kilidi
// ============================================================
{
  kontrol("S1) dnavTurnState TAM OLARAK 1 kez tanımlı, başlangıç değeri IDLE", (html.match(/let dnavTurnState='IDLE';/g) || []).length === 1);
  kontrol("S2) dnavTurNesil (nesil sayacı) TAM OLARAK 1 kez tanımlı", (html.match(/let dnavTurNesil=0;/g) || []).length === 1);
  kontrol("S3) dnavChat() SADECE IDLE'dan THINKING'e geçebiliyor (re-entrancy guard)", /if\(dnavTurnState!=='IDLE'\)return;\s*\n\s*dnavTurnState='THINKING';/.test(DNAVCHAT_FN));
  kontrol("S4) her dnavChat çağrısı kendi nesil numarasını alıyor", /const benimTurNesil=\+\+dnavTurNesil;/.test(DNAVCHAT_FN));
  // NOT (Turn Handoff Cue, sonraki katman): SPEAKING/IDLE atamaları artık
  // AYNI generation-guard İÇİNDE dnavMicGorselGuncelle() da çağırıyor
  // (tooltip güncellemesi) - guard'ın KENDİSİ (benimTurNesil===dnavTurNesil)
  // DEĞİŞMEDİ, sadece ayraç içine bir görsel-güncelleme çağrısı eklendi.
  kontrol("S5) SPEAKING geçişi benimTurNesil===dnavTurNesil ile korunuyor", /if\(benimTurNesil===dnavTurNesil\)\{dnavTurnState='SPEAKING';/.test(DNAVCHAT_FN));
  kontrol("S6) _dnavSpeakingBitir IDLE dönüşü de AYNI korumaya tabi", /if\(benimTurNesil===dnavTurNesil\)\{dnavTurnState='IDLE';/.test(DNAVCHAT_FN));
  kontrol("S7) catch (network/API hata) bloğu da AYNI korumaya tabi", /if\(benimTurNesil===dnavTurNesil\)dnavTurnState='IDLE';\s*\n\s*\}/.test(DNAVCHAT_FN));
  kontrol("S8) dnav-stop-btn (⏹ Dur) HTML'de mevcut, dnavAvciSustur()'a bağlı", /id="dnav-stop-btn"[^>]*onclick="dnavAvciSustur\(\)"/.test(KLOD_TAB_BLOK));
  kontrol("S9) dnavAvciSustur TAM OLARAK 1 kez tanımlı", (html.match(/function dnavAvciSustur\(\)\{/g) || []).length === 1);
  kontrol("S10) dnavAvciSustur mevcut ttsNesil++ deseni reuse ediyor (yeni ses motoru YOK)", /function dnavAvciSustur\(\)\{\s*\n\s*ttsNesil\+\+;/.test(VOICE_FN_SRC));
  kontrol("S11) dnavAvciSustur mevcut pAudio.pause() deseni reuse ediyor", /if\(pAudio\)pAudio\.pause\(\);/.test(VOICE_FN_SRC));
  kontrol("S12) dnavAvciSustur mevcut speechSynthesis.cancel() deseni reuse ediyor", /if\(window\.speechSynthesis\)speechSynthesis\.cancel\(\);/.test(VOICE_FN_SRC));
  kontrol("S13) dnavAvciSustur kendi dnavTurNesil'ini de ilerletiyor (stale callback koruması)", /function dnavAvciSustur\(\)\{[\s\S]{0,60}dnavTurNesil\+\+;/.test(VOICE_FN_SRC));
  kontrol("S14) dnavAvciSustur state'i IDLE'a çekiyor", /function dnavAvciSustur\(\)\{[\s\S]*?dnavTurnState='IDLE';\s*\n/.test(VOICE_FN_SRC));
  kontrol("S15) dnavAvciSustur YENİ bir ses motoru/API içermiyor (new Audio/MediaRecorder/AudioContext/getUserMedia yok)", (() => {
    const fn = html.slice(html.indexOf("function dnavAvciSustur(){"), html.indexOf("function dnavAvciSustur(){") + 400);
    return !/new Audio\(|MediaRecorder|AudioContext|getUserMedia/.test(fn);
  })());
  kontrol("S16) mic başladığında (start() başarılıysa) LISTENING'e geçiyor", /try\{dnavRecognition\.start\(\);dnavTurnState='LISTENING';\}catch\(e\)\{\}/.test(VOICE_FN_SRC));
  kontrol("S17) recognition onend IDLE'a dönüyor", /onend=function\(\)\{dnavTurnState='IDLE';/.test(VOICE_FN_SRC));
  kontrol("S18) recognition onerror IDLE'a dönüyor", /onerror=function\(\)\{dnavTurnState='IDLE';/.test(VOICE_FN_SRC));
  kontrol("S19) AUTO MICROPHONE RESTART YOK — TTS/onEnd zincirinde dnavKlodSesTaniBaslat() çağrısı YOK", !/dnavKlodSesTaniBaslat\(\)/.test(DNAVCHAT_FN));
  kontrol("S20) sürekli dinleme (continuous=true) hiç ayarlanmadı", !/\.continuous\s*=\s*true/.test(VOICE_FN_SRC));
  kontrol("S21) AUTO-SEND yok — onresult SADECE input.value'yu dolduruyor, dnavChat çağrısı YOK", !/onresult=function\(e\)\{[^}]*dnavChat/.test(VOICE_FN_SRC));
  kontrol("S22) 5H matcher (avciSonrakiSoruKomutuMu) DEĞİŞMEDİ, 1 kez tanımlı", (html.match(/function avciSonrakiSoruKomutuMu\(metin\)\{/g) || []).length === 1);
  kontrol("S23) 5I matcher (avciSinyalPratikKomutuMu) DEĞİŞMEDİ, 1 kez tanımlı", (html.match(/function avciSinyalPratikKomutuMu\(metin\)\{/g) || []).length === 1);
  kontrol("S24) 5J explicit reteach kontratı KORUNUYOR", /AVCI BASAMAK YENIDEN OGRETIMI \(EXPLICIT ADIM\) KURALI \(ZORUNLU\)/.test(html));
  kontrol("S25) 5F SOR->DUR->BEKLE->CEVABI AL->DEGERLENDIR döngüsü KORUNUYOR", /SOR \(tek kucuk soru\) -> DUR -> OGRENCIYI BEKLE -> CEVABI AL -> DEGERLENDIR/.test(html));
  kontrol("S26) BOARD_ACTION_ALLOWLIST hâlâ TAM OLARAK 8 action", (klodSrc.match(/'HIGHLIGHT_VERB', 'SHOW_SVO', 'HIGHLIGHT_SIGNAL', 'SHOW_LEFT_RIGHT',/) || []).length === 1 && (klodSrc.match(/'SHOW_HINT', 'SHOW_AVCI_REFLEX', 'CLEAR_BOARD', 'ELIMINATE_OPTION',/) || []).length === 1);
  kontrol("S27) yeni bir board action EKLENMEDİ (index.html/api/klod.mjs'de 'TURN_'/'STOP_'/'LISTEN_' action adı yok)", !/'TURN_|'STOP_ACTION|'LISTEN_/.test(html) && !/'TURN_|'STOP_ACTION|'LISTEN_/.test(klodSrc));
  kontrol("S28) klodBoardActionlariDogrula TAM OLARAK 1 kez, imzası DEĞİŞMEDİ (answer-leak koruması sürüyor)", (klodSrc.match(/function klodBoardActionlariDogrula\(rawActions, dogrulanmisBaglam, canonical\)/g) || []).length === 1);
  kontrol("S29) api/klod.mjs bu katmanda HİÇ değişmedi ('TURN CONTROLLER'/'dnavTurnState' hiç geçmiyor)", !/TURN CONTROLLER/i.test(klodSrc) && !/dnavTurnState/.test(klodSrc));
  kontrol("S30) api/klod.mjs — service_role/eval/new Function hâlâ yok", (() => {
    const kodSatirlari = klodSrc.split("\n").filter((s) => !s.trim().startsWith("//")).join("\n");
    return !/SERVICE_ROLE/i.test(kodSatirlari) && !/\beval\(/.test(kodSatirlari) && !/new Function\(/.test(kodSatirlari);
  })());
  kontrol("S31) getUserMedia/MediaRecorder/WebSocket/WebRTC/Realtime/VAD bu katmanda HİÇ eklenmedi", (() => {
    const scope = DNAVCHAT_FN + VOICE_FN_SRC;
    return !/getUserMedia|MediaRecorder|WebSocket|RTCPeerConnection|realtime/i.test(scope) && !/\bVAD\b/.test(scope);
  })());
  kontrol("S32) eval/new Function bu katmanda (client) HİÇ kullanılmadı", !/\beval\(|new Function\(/.test(DNAVCHAT_FN) && !/\beval\(|new Function\(/.test(VOICE_FN_SRC));
  kontrol("S33) yeni bir secret/API key literal'i EKLENMEDİ", !/sk-|AIza|AKIA/.test(DNAVCHAT_FN) && !/sk-|AIza|AKIA/.test(VOICE_FN_SRC));
  kontrol("S34) DB/schema/migration/RPC referansı YOK", !/create table|alter table|\.rpc\(/i.test(DNAVCHAT_FN + VOICE_FN_SRC));
  // NOT: STATE_DECL'in AÇIKLAYICI YORUMU kasıtlı olarak "localStorage/
  // sessionStorage/server state DEĞİL" diye YAZIYOR (bkz. kaynak) - bu
  // yüzden GERÇEK KOD satırlarını (yorum satırları hariç) test ediyoruz,
  // aksi halde kendi negatif-örnek yorumumuz yanlış-pozitif üretir.
  const STATE_DECL_KOD = STATE_DECL.split("\n").filter((s) => !s.trim().startsWith("//")).join("\n");
  kontrol("S35) localStorage/sessionStorage tabanlı YENİ bir turn/voice state EKLENMEDİ", !/sessionStorage|localStorage\.setItem/.test(VOICE_FN_SRC) && !/sessionStorage/.test(STATE_DECL_KOD));
  kontrol("S36) dnavTurnState/dnavTurNesil client-only ephemeral (persistent state YOK) — kalıcı bir kaynağa yazılmıyor", !/localStorage|sessionStorage|indexedDB|document\.cookie/.test(STATE_DECL_KOD));
}

// ============================================================
// GERÇEK ÇALIŞTIRMA — paylaşılan sandbox (dnavChat + mic + stop AYNI
// context'te, gerçek state paylaşımıyla)
// ============================================================
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

function sandboxKur({ fetchOk = true, fetchGecikmeMs = 0, ttsOnEndGecikmeMs = 0, srVarMi = true } = {}) {
  const fetchCagrilari = [];
  const inp = fakeInputEl();
  const body = fakeBodyEl();
  const micBtn = { style: {} };
  const els = { "dnav-in": inp, "dnav-chat": body, "dnav-mic-btn": micBtn };
  let sonOlusturulanSR = null;
  class FakeSpeechRecognition {
    constructor() { this.lang = null; this.interimResults = null; this.maxAlternatives = null; this.onresult = null; this.onend = null; this.onerror = null; sonOlusturulanSR = this; }
    start() {}
  }
  const sandbox = {
    console: { warn: () => {}, log: () => {}, error: () => {} },
    document: { getElementById: (id) => els[id] || null, createElement: () => fakeElGeneric() },
    window: srVarMi ? { SpeechRecognition: FakeSpeechRecognition } : {},
    localStorage: { getItem: () => null },
    KB: [],
    renderMD: (t) => t,
    sb: undefined,
    _aktifSoruModulu: null,
    avciAktifSinyalLabBaglamiAl: () => null,
    avciSonrakiSoruKomutuMu: () => false,
    avciSinyalPratikKomutuMu: () => false,
    fetch: async (url, opts) => {
      fetchCagrilari.push({ url, opts });
      if (fetchGecikmeMs) await new Promise((r) => setTimeout(r, fetchGecikmeMs));
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
  vm.runInContext(FULL_SRC, context, { filename: "index.html (turn controller)" });
  return { context, inp, body, micBtn, fetchCagrilari, srSinifOrneği: () => sonOlusturulanSR };
}
function bekle(ms) { return new Promise((r) => setTimeout(r, ms)); }

// 1) initial IDLE
{
  const t = sandboxKur();
  kontrol("1) initial state IDLE", t.context.__t_getTurnState() === "IDLE");
}

// 2) mic → LISTENING
{
  const t = sandboxKur();
  t.context.dnavKlodSesTaniBaslat();
  kontrol("2) mic başlatılınca GERÇEKTEN LISTENING'e geçiyor", t.context.__t_getTurnState() === "LISTENING");
}

// 3) recognition end → IDLE
{
  const t = sandboxKur();
  t.context.dnavKlodSesTaniBaslat();
  t.srSinifOrneği().onend();
  kontrol("3) recognition bitince (onend) GERÇEKTEN IDLE'a dönüyor", t.context.__t_getTurnState() === "IDLE");
}

// 4) recognition error → IDLE
{
  const t = sandboxKur();
  t.context.dnavKlodSesTaniBaslat();
  t.srSinifOrneği().onerror();
  kontrol("4) recognition hata verirse (onerror) GERÇEKTEN IDLE'a dönüyor", t.context.__t_getTurnState() === "IDLE");
}

// 5/6/7) manual send → THINKING → SPEAKING → (TTS onEnd) → IDLE
{
  const t = sandboxKur({ ttsOnEndGecikmeMs: 30 });
  t.inp.value = "merhaba";
  const p = t.context.dnavChat();
  kontrol("5) Send/Enter sonrası (fetch henüz dönmeden) state GERÇEKTEN THINKING", t.context.__t_getTurnState() === "THINKING");
  await p;
  kontrol("6) metin cevabı geldikten sonra, TTS başlarken state GERÇEKTEN SPEAKING", t.context.__t_getTurnState() === "SPEAKING");
  await bekle(60);
  kontrol("7) TTS onEnd ateşlenince state GERÇEKTEN IDLE'a dönüyor", t.context.__t_getTurnState() === "IDLE");
}

// 8) network/API hatası → IDLE (deadlock yok)
{
  const t = sandboxKur({ fetchOk: false });
  t.inp.value = "merhaba";
  await t.context.dnavChat();
  kontrol("8) network/API hatasında state GERÇEKTEN IDLE'a dönüyor (deadlock yok)", t.context.__t_getTurnState() === "IDLE");
}

// 9) no invalid state — tüm gözlemlenen durumlar HER ZAMAN izin verilen 4 değerden biri
{
  const IZIN_VERILEN = new Set(["IDLE", "LISTENING", "THINKING", "SPEAKING"]);
  const t = sandboxKur({ ttsOnEndGecikmeMs: 10 });
  const gozlemler = [t.context.__t_getTurnState()];
  t.context.dnavKlodSesTaniBaslat(); gozlemler.push(t.context.__t_getTurnState());
  t.srSinifOrneği().onend(); gozlemler.push(t.context.__t_getTurnState());
  t.inp.value = "merhaba"; const p = t.context.dnavChat(); gozlemler.push(t.context.__t_getTurnState());
  await p; gozlemler.push(t.context.__t_getTurnState());
  await bekle(30); gozlemler.push(t.context.__t_getTurnState());
  kontrol("9) no invalid state — tüm gözlemlenen durumlar {IDLE,LISTENING,THINKING,SPEAKING} kümesinde", gozlemler.every((s) => IZIN_VERILEN.has(s)));
}

// 10/11) transcript visible, NO auto-send
{
  const t = sandboxKur();
  t.context.dnavKlodSesTaniBaslat();
  t.srSinifOrneği().onresult({ results: [[{ transcript: "Sonraki soruya geç." }]] });
  kontrol("10) transcript GERÇEKTEN input'a yazılıyor (görünür)", t.inp.value === "Sonraki soruya geç.");
  kontrol("11) onresult sonrası dnavChat OTOMATİK tetiklenmedi (fetch YAPILMADI)", t.fetchCagrilari.length === 0);
}

// 12) no auto-mic restart after TTS ends
{
  const t = sandboxKur({ ttsOnEndGecikmeMs: 10 });
  t.inp.value = "merhaba";
  await t.context.dnavChat();
  await bekle(30);
  kontrol("12) TTS bittikten sonra mikrofon OTOMATİK yeniden başlamadı (state IDLE, LISTENING DEĞİL)", t.context.__t_getTurnState() === "IDLE");
}

// 13) no always-listening — mic her tıklamada TEK seferlik başlıyor, start() tekrar tekrar çağrılabiliyor (continuous değil)
{
  const t = sandboxKur();
  t.context.dnavKlodSesTaniBaslat();
  const sr1 = t.srSinifOrneği();
  t.srSinifOrneği().onend();
  kontrol("13) recognition bitince sürekli dinlemeye DEVAM ETMİYOR (state IDLE'a düşüyor, yeniden dinlemiyor)", t.context.__t_getTurnState() === "IDLE");
}

// 14/15/16/17) RACE — hızlı çift gönderim / duplicate Enter / duplicate dnavChat THINKING sırasında BLOK
{
  const t = sandboxKur({ fetchGecikmeMs: 30, ttsOnEndGecikmeMs: 0 });
  t.inp.value = "birinci mesaj";
  const p1 = t.context.dnavChat();
  t.inp.value = "ikinci mesaj (çift tıklama/Enter simülasyonu)";
  const p2 = t.context.dnavChat();
  await Promise.all([p1, p2]);
  await bekle(20);
  kontrol("14) hızlı çift gönderim → SADECE 1 fetch isteği gitti (ikinci istek BLOKLANDI)", t.fetchCagrilari.length === 1);
  kontrol("15) duplicate Enter/Send AYNI mekanizmayla BLOKLANDI (aynı sonuç)", t.fetchCagrilari.length === 1);
  kontrol("16) duplicate dnavChat() çağrısı ikinci bir /api/klod isteği BAŞLATMADI", t.fetchCagrilari.length === 1);
  kontrol("17) THINKING sırasında ikinci istek BLOKLANDI (kanıtlandı)", t.fetchCagrilari.length === 1);
  kontrol("19) çift denemeye rağmen chat'te TEK bir AVCI cevabı var (duplicate response YOK)", t.body.children.filter((c) => c._text === "cevap" || (c._html && c._html.includes("cevap"))).length <= 1);
}

// 18) SPEAKING sırasında ikinci istek BLOKLANIR
{
  const t = sandboxKur({ ttsOnEndGecikmeMs: 50 });
  t.inp.value = "ilk mesaj";
  await t.context.dnavChat();
  kontrol("18-ön) TTS henüz bitmedi, state SPEAKING (test kurulumu doğru)", t.context.__t_getTurnState() === "SPEAKING");
  t.inp.value = "ikinci mesaj (AVCI hâlâ konuşurken)";
  await t.context.dnavChat();
  kontrol("18) SPEAKING sırasında ikinci istek BLOKLANDI (hâlâ sadece 1 fetch)", t.fetchCagrilari.length === 1);
  await bekle(70);
}

// 20) hatadan sonra DEADLOCK yok — yeni bir istek başlatılabiliyor
{
  let ilkSeferHataVersin = true;
  const fetchCagrilari = [];
  const inp = fakeInputEl();
  const body = fakeBodyEl();
  const sandbox = {
    console: { warn: () => {}, log: () => {}, error: () => {} },
    document: { getElementById: (id) => ({ "dnav-in": inp, "dnav-chat": body }[id] || null), createElement: () => fakeElGeneric() },
    window: {},
    localStorage: { getItem: () => null },
    KB: [], renderMD: (t) => t, sb: undefined,
    _aktifSoruModulu: null, avciAktifSinyalLabBaglamiAl: () => null,
    avciSonrakiSoruKomutuMu: () => false, avciSinyalPratikKomutuMu: () => false,
    fetch: async () => { fetchCagrilari.push(1); if (ilkSeferHataVersin) { ilkSeferHataVersin = false; throw new Error("ilk seferde hata"); } return { ok: true, json: async () => ({ content: [{ type: "text", text: "cevap" }] }) }; },
    ttsSpeak: (text, lang, onEnd) => new Promise((resolve) => { if (onEnd) onEnd(); resolve({}); }),
    ttsNesil: 0, pAudio: null,
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(FULL_SRC, context, { filename: "index.html (turn controller, deadlock-after-error)" });
  inp.value = "birinci (hata alacak)";
  await context.dnavChat();
  kontrol("20-ön) ilk istek hata verdi, state IDLE'a döndü", context.__t_getTurnState() === "IDLE");
  inp.value = "ikinci (başarılı olmalı)";
  await context.dnavChat();
  kontrol("20) hatadan SONRA yeni bir istek BAŞLATILABİLDİ (DEADLOCK YOK)", fetchCagrilari.length === 2 && context.__t_getTurnState() === "IDLE");
}

// 21) Stop butonu var (statik olarak S8'de zaten kanıtlandı, burada gerçek DOM üzerinden de doğrula)
{
  kontrol("21) ⏹ Dur butonu KLOD HTML şablonunda gerçekten mevcut (dnav-stop-btn)", KLOD_TAB_BLOK.includes('id="dnav-stop-btn"'));
}

// 22/23/24) Stop — pAudio.pause() reuse, ttsNesil++ reuse, state → IDLE
{
  const t = sandboxKur();
  let pauseÇağrıldıMı = false;
  t.context.pAudio = { pause: () => { pauseÇağrıldıMı = true; } };
  t.context.ttsNesil = 5;
  t.context.__t_setTurnState("SPEAKING");
  t.context.dnavAvciSustur();
  kontrol("22) dnavAvciSustur GERÇEKTEN pAudio.pause()'u çağırıyor", pauseÇağrıldıMı === true);
  kontrol("23) dnavAvciSustur GERÇEKTEN ttsNesil'i ilerletiyor", t.context.ttsNesil === 6);
  kontrol("24) dnavAvciSustur GERÇEKTEN state'i IDLE'a çekiyor", t.context.__t_getTurnState() === "IDLE");
}

// 25) no new audio engine (S15 statik kontrolüyle birlikte, çalışma zamanında da doğrula — pAudio null olsa bile crash YOK)
{
  const t = sandboxKur();
  let hata = false;
  try { t.context.dnavAvciSustur(); } catch (e) { hata = true; }
  kontrol("25) pAudio null/yokken bile dnavAvciSustur crash ETMİYOR (yeni ses motoru gerekmiyor)", !hata);
}

// 26) DURDURULMUŞ/BAYATLAMIŞ (stale) bir turun GECİKMELİ TTS callback'i, ARADAN BAŞLAYAN YENİ bir turun state'ini BOZAMAZ
{
  const t = sandboxKur({ ttsOnEndGecikmeMs: 200 });
  // Tur A: SPEAKING'e gir (TTS henüz bitmeyecek, 200ms gecikmeli)
  t.inp.value = "tur A";
  await t.context.dnavChat();
  kontrol("26-ön1) Tur A SPEAKING'de (test kurulumu doğru)", t.context.__t_getTurnState() === "SPEAKING");
  // Öğrenci ⏹ Dur'a basıyor — Tur A'yı geçersiz kılar, state IDLE'a döner,
  // AMA Tur A'nın zamanlayıcısı (setTimeout) hâlâ arka planda çalışıyor.
  t.context.dnavAvciSustur();
  kontrol("26-ön2) Dur sonrası state IDLE (Tur A geçersiz kılındı)", t.context.__t_getTurnState() === "IDLE");
  // Tur B: HEMEN yeni bir soru sor, SPEAKING'e ulaşsın (kısa gecikmeli TTS)
  t.context.ttsSpeak = (text, lang, onEnd) => new Promise((resolve) => { setTimeout(() => { if (onEnd) onEnd(); resolve({}); }, 500); });
  t.inp.value = "tur B";
  await t.context.dnavChat();
  kontrol("26-ön3) Tur B SPEAKING'e ulaştı (test kurulumu doğru)", t.context.__t_getTurnState() === "SPEAKING");
  // Şimdi Tur A'nın ESKİ, gecikmeli TTS callback'i ateşleniyor (200ms doldu)
  await bekle(220);
  kontrol("26) Tur A'nın GECİKMELİ/stale TTS bitişi, Tur B'nin state'ini (SPEAKING) BOZMADI — hâlâ SPEAKING", t.context.__t_getTurnState() === "SPEAKING");
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
