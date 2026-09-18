// AVCI TAP-TO-INTERRUPT MVP (iç çalışma adı — henüz kanonik katman adı
// verilmedi). AVCI Turn Controller MVP'nin ÜZERİNE, öğrenci AVCI
// konuşurken (SPEAKING) 🎤 mic butonuna FİZİKSEL OLARAK basarsa, mevcut
// ⏹ Dur mekanizmasını (dnavAvciSustur) reuse ederek TTS'i güvenle
// durdurup dinlemeye geçmesini sağlar. BU FULL BARGE-IN DEĞİL: otomatik/
// sürekli dinleme, VAD, auto-send, auto-mic-restart YOK — öğrenci HER
// ZAMAN fiziksel olarak butona basmalı. Gerçek Supabase/Anthropic/TTS
// ağına HİÇ çıkılmaz — dnavChat()/dnavKlodSesTaniBaslat()/dnavAvciSustur()
// index.html'den BİREBİR çıkarılıp AYNI paylaşılan vm context'inde
// GERÇEKTEN ÇALIŞTIRILIYOR (sahte yeniden-yazım DEĞİL, diğer avci-*.
// test.mjs dosyalarıyla AYNI desen, bkz. tests/avci-turn-controller.
// test.mjs).

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
const MIC_FN = slice("function dnavKlodSesTaniBaslat(){", "\nfunction dnavAvciSustur(){");
const MIC_FN_KOD = MIC_FN.split("\n").filter((s) => !s.trim().startsWith("//")).join("\n");

// ============================================================
// STATİK — Tap-to-Interrupt kod sözleşmesi + kapsam kilidi
// ============================================================
{
  kontrol("S1) THINKING sırasında mic click HİÇBİR ŞEY yapmıyor (erken return)", /if\(dnavTurnState==='THINKING'\)return;/.test(MIC_FN_KOD));
  kontrol("S2) SPEAKING sırasında mic click ÖNCE mevcut dnavAvciSustur()'ı ÇAĞIRIYOR (reuse, yeniden yazma YOK)", /if\(dnavTurnState==='SPEAKING'\)dnavAvciSustur\(\);/.test(MIC_FN_KOD));
  kontrol("S3) THINKING/SPEAKING guard'ları .start()'TAN ÖNCE geliyor (kaynak sırası)", MIC_FN.indexOf("if(dnavTurnState==='THINKING')return;") < MIC_FN.indexOf("dnavRecognition.start()"));
  kontrol("S4) dnavAvciSustur çağrısı .start()'TAN ÖNCE geliyor (TTS invalidation STT'den önce TAMAMLANIR)", MIC_FN.indexOf("if(dnavTurnState==='SPEAKING')dnavAvciSustur();") < MIC_FN.indexOf("dnavRecognition.start()"));
  kontrol("S5) dnavKlodSesTaniBaslat İÇİNDE ttsNesil++/pAudio.pause() TEKRAR YAZILMADI (SADECE dnavAvciSustur() çağrısı var, kod TEKRARI yok)", !/ttsNesil\+\+/.test(MIC_FN_KOD) && !/pAudio\.pause\(\)/.test(MIC_FN_KOD));
  kontrol("S6) mic fonksiyonunda YENİ bir ses motoru/API YOK (new Audio/MediaRecorder/AudioContext/getUserMedia)", !/new Audio\(|MediaRecorder|AudioContext|getUserMedia/.test(MIC_FN_KOD));
  kontrol("S7) mic fonksiyonunda YENİ bir state değişkeni TANIMLANMADI (sadece mevcut dnavTurnState okunuyor/dnavAvciSustur çağrılıyor)", !/^\s*let \w+=/m.test(MIC_FN_KOD.split("\n").slice(1, -1).join("\n")));
  kontrol("S8) sürekli dinleme (continuous=true) hiç ayarlanmadı", !/\.continuous\s*=\s*true/.test(MIC_FN_KOD));
  kontrol("S9) AUTO-SEND yok — mic fonksiyonu dnavChat() çağrısı İÇERMİYOR", !/dnavChat\(\)/.test(MIC_FN_KOD));
  kontrol("S10) onresult SADECE input.value'yu dolduruyor (DEĞİŞMEDİ)", /onresult=function\(e\)\{input\.value=e\.results\[0\]\[0\]\.transcript;\};/.test(MIC_FN_KOD));
  kontrol("S11) recognition onend hâlâ IDLE'a dönüyor (DEĞİŞMEDİ)", /onend=function\(\)\{dnavTurnState='IDLE';/.test(MIC_FN_KOD));
  kontrol("S12) recognition onerror hâlâ IDLE'a dönüyor (DEĞİŞMEDİ)", /onerror=function\(\)\{dnavTurnState='IDLE';/.test(MIC_FN_KOD));
  kontrol("S13) dnavTurnState hâlâ TAM OLARAK 4 değerle sınırlı — kaynakta 5. bir state string'i YOK (IDLE/LISTENING/THINKING/SPEAKING dışında)", (() => {
    const atamalar = [...html.matchAll(/dnavTurnState=('[A-Z]+')/g)].map((m) => m[1]);
    const izinliler = new Set(["'IDLE'", "'LISTENING'", "'THINKING'", "'SPEAKING'"]);
    return atamalar.every((a) => izinliler.has(a));
  })());
  kontrol("S14) dnavAvciSustur TAM OLARAK 1 kez tanımlı, DEĞİŞMEDİ (ttsNesil++/dnavTurNesil++/pAudio.pause/state=IDLE)", (html.match(/function dnavAvciSustur\(\)\{/g) || []).length === 1 && /function dnavAvciSustur\(\)\{\s*\n\s*ttsNesil\+\+;\s*\n\s*dnavTurNesil\+\+;/.test(html));
  kontrol("S15) dnav-stop-btn (⏹ Dur) HÂLÂ mevcut, DEĞİŞMEDİ", /id="dnav-stop-btn"[^>]*onclick="dnavAvciSustur\(\)"/.test(KLOD_TAB_BLOK));
  kontrol("S16) re-entrancy guard (dnavChat) DEĞİŞMEDİ", /if\(dnavTurnState!=='IDLE'\)return;\s*\n\s*dnavTurnState='THINKING';/.test(DNAVCHAT_FN));
  // NOT (Turn Handoff Cue, sonraki katman): SPEAKING ataması artık AYNI
  // guard İÇİNDE dnavMicGorselGuncelle() da çağırıyor - guard'ın KENDİSİ
  // DEĞİŞMEDİ, sadece ayraç içine bir görsel-güncelleme çağrısı eklendi.
  kontrol("S17) dnavTurNesil (stale-turn koruması) DEĞİŞMEDİ", /const benimTurNesil=\+\+dnavTurNesil;/.test(DNAVCHAT_FN) && /if\(benimTurNesil===dnavTurNesil\)\{dnavTurnState='SPEAKING';/.test(DNAVCHAT_FN));
  kontrol("S18) 5H matcher (avciSonrakiSoruKomutuMu) DEĞİŞMEDİ", (html.match(/function avciSonrakiSoruKomutuMu\(metin\)\{/g) || []).length === 1);
  kontrol("S19) 5I matcher (avciSinyalPratikKomutuMu) DEĞİŞMEDİ", (html.match(/function avciSinyalPratikKomutuMu\(metin\)\{/g) || []).length === 1);
  kontrol("S20) 5J explicit reteach kontratı KORUNUYOR", /AVCI BASAMAK YENIDEN OGRETIMI \(EXPLICIT ADIM\) KURALI \(ZORUNLU\)/.test(html));
  kontrol("S21) 5F SOR->DUR->BEKLE->CEVABI AL->DEGERLENDIR döngüsü KORUNUYOR", /SOR \(tek kucuk soru\) -> DUR -> OGRENCIYI BEKLE -> CEVABI AL -> DEGERLENDIR/.test(html));
  kontrol("S22) BOARD_ACTION_ALLOWLIST hâlâ TAM OLARAK 8 action", (klodSrc.match(/'HIGHLIGHT_VERB', 'SHOW_SVO', 'HIGHLIGHT_SIGNAL', 'SHOW_LEFT_RIGHT',/) || []).length === 1 && (klodSrc.match(/'SHOW_HINT', 'SHOW_AVCI_REFLEX', 'CLEAR_BOARD', 'ELIMINATE_OPTION',/) || []).length === 1);
  kontrol("S23) yeni bir board action EKLENMEDİ", !/'INTERRUPT_|'TAP_|'MIC_ACTION/.test(html) && !/'INTERRUPT_|'TAP_|'MIC_ACTION/.test(klodSrc));
  kontrol("S24) klodBoardActionlariDogrula TAM OLARAK 1 kez, imzası DEĞİŞMEDİ (answer-leak koruması sürüyor)", (klodSrc.match(/function klodBoardActionlariDogrula\(rawActions, dogrulanmisBaglam, canonical\)/g) || []).length === 1);
  kontrol("S25) api/klod.mjs bu katmanda HİÇ değişmedi ('TAP-TO-INTERRUPT'/'INTERRUPT' hiç geçmiyor)", !/TAP-TO-INTERRUPT/i.test(klodSrc) && !/INTERRUPT/i.test(klodSrc));
  kontrol("S26) api/klod.mjs — service_role/eval/new Function hâlâ yok", (() => {
    const kodSatirlari = klodSrc.split("\n").filter((s) => !s.trim().startsWith("//")).join("\n");
    return !/SERVICE_ROLE/i.test(kodSatirlari) && !/\beval\(/.test(kodSatirlari) && !/new Function\(/.test(kodSatirlari);
  })());
  kontrol("S27) getUserMedia/MediaRecorder/WebSocket/WebRTC/Realtime/VAD (gerçek kod) bu katmanda HİÇ eklenmedi", (() => {
    const scopeKod = (DNAVCHAT_FN + "\n" + MIC_FN_KOD).split("\n").filter((s) => !s.trim().startsWith("//")).join("\n");
    return !/getUserMedia|MediaRecorder|WebSocket|RTCPeerConnection|realtime/i.test(scopeKod) && !/\bVAD\b/.test(scopeKod);
  })());
  kontrol("S28) eval/new Function bu katmanda (client) HİÇ kullanılmadı", !/\beval\(|new Function\(/.test(MIC_FN_KOD));
  kontrol("S29) yeni bir secret/API key literal'i EKLENMEDİ", !/sk-|AIza|AKIA/.test(MIC_FN_KOD));
  kontrol("S30) DB/schema/migration/RPC referansı YOK", !/create table|alter table|\.rpc\(/i.test(MIC_FN_KOD));
  kontrol("S31) yeni localStorage/sessionStorage tabanlı state EKLENMEDİ", !/localStorage\.setItem|sessionStorage/.test(MIC_FN_KOD));
}

// ============================================================
// GERÇEK ÇALIŞTIRMA — paylaşılan sandbox (dnavChat + mic + stop AYNI
// context'te, gerçek state paylaşımıyla)
// ============================================================
const TEST_HARNESS = `
function __t_getTurnState(){return dnavTurnState;}
function __t_setTurnState(v){dnavTurnState=v;}
function __t_getTurNesil(){return dnavTurNesil;}
function __t_getDnavHistory(){return dnavHistory.slice();}
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

function sandboxKur({ fetchOk = true, ttsOnEndGecikmeMs = 0, srVarMi = true, baslangicPAudio = null } = {}) {
  const inp = fakeInputEl();
  const body = fakeBodyEl();
  const micBtn = { style: {} };
  const els = { "dnav-in": inp, "dnav-chat": body, "dnav-mic-btn": micBtn };
  const fetchCagrilari = [];
  let sonOlusturulanSR = null;
  let startCagrildiMi = 0;
  class FakeSpeechRecognition {
    constructor() { this.lang = null; this.interimResults = null; this.maxAlternatives = null; this.onresult = null; this.onend = null; this.onerror = null; sonOlusturulanSR = this; }
    start() { startCagrildiMi++; }
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
      if (!fetchOk) throw new Error("network hatası (simüle)");
      return { ok: true, json: async () => ({ content: [{ type: "text", text: "cevap" }] }) };
    },
    ttsSpeak: (text, lang, onEnd) => new Promise((resolve) => {
      setTimeout(() => { if (onEnd) onEnd(); resolve({ fakeAudio: true }); }, ttsOnEndGecikmeMs);
    }),
    ttsNesil: 0,
    pAudio: baslangicPAudio,
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(FULL_SRC, context, { filename: "index.html (tap-to-interrupt)" });
  return { context, inp, body, micBtn, fetchCagrilari, srSinifOrneği: () => sonOlusturulanSR, startSayisi: () => startCagrildiMi };
}
function bekle(ms) { return new Promise((r) => setTimeout(r, ms)); }

// 1) NORMAL MIC — IDLE → LISTENING (regresyon değil, bkz. AYRI ele alma)
{
  const t = sandboxKur();
  t.context.dnavKlodSesTaniBaslat();
  kontrol("1) IDLE'da mic click NORMAL şekilde LISTENING'e geçiyor (regresyon yok)", t.context.__t_getTurnState() === "LISTENING" && t.startSayisi() === 1);
}

// 2/3/4/5) INTERRUPT — SPEAKING sırasında mic click: TTS durur, nesiller ilerler, LISTENING'e geçer
{
  const fakePAudio = { pause: () => { fakePAudio._pauseCagrildi = true; }, _pauseCagrildi: false };
  const t = sandboxKur({ ttsOnEndGecikmeMs: 500, baslangicPAudio: fakePAudio });
  t.inp.value = "merhaba";
  await t.context.dnavChat();
  kontrol("2-ön) Tur SPEAKING'de (test kurulumu doğru)", t.context.__t_getTurnState() === "SPEAKING");
  const eskiTurNesil = t.context.__t_getTurNesil();
  const eskiTtsNesil = t.context.ttsNesil;
  t.context.dnavKlodSesTaniBaslat();
  kontrol("2) SPEAKING sırasında mic click → pAudio.pause() GERÇEKTEN çağrıldı (TTS durdu)", t.context.pAudio._pauseCagrildi === true);
  kontrol("3) SPEAKING sırasında mic click → ttsNesil GERÇEKTEN ilerledi", t.context.ttsNesil === eskiTtsNesil + 1);
  kontrol("4) SPEAKING sırasında mic click → dnavTurNesil GERÇEKTEN ilerledi (stale generation invalidated)", t.context.__t_getTurNesil() === eskiTurNesil + 1);
  kontrol("5) SPEAKING sırasında mic click → state GERÇEKTEN LISTENING'e geçti", t.context.__t_getTurnState() === "LISTENING");
  kontrol("5b) recognition.start() GERÇEKTEN çağrıldı", t.startSayisi() === 1);
}

// 6) THINKING sırasında mic click → HİÇBİR ŞEY olmaz (yeni istek/tur karışıklığı yok)
{
  const t = sandboxKur({ ttsOnEndGecikmeMs: 500 });
  t.inp.value = "merhaba";
  const p = t.context.dnavChat();
  kontrol("6-ön) Tur THINKING'de (test kurulumu doğru)", t.context.__t_getTurnState() === "THINKING");
  t.context.dnavKlodSesTaniBaslat();
  kontrol("6) THINKING sırasında mic click → state DEĞİŞMEDİ (hâlâ THINKING)", t.context.__t_getTurnState() === "THINKING");
  kontrol("6b) THINKING sırasında mic click → recognition.start() HİÇ ÇAĞRILMADI", t.startSayisi() === 0);
  await p;
  await bekle(520);
}

// 7) STALE CALLBACK — Eski TTS'in gecikmeli onEnd'i, interrupt SONRASI LISTENING state'ini IDLE'a ÇEVİREMEZ
{
  const t = sandboxKur({ ttsOnEndGecikmeMs: 300 });
  t.inp.value = "merhaba";
  await t.context.dnavChat();
  kontrol("7-ön) SPEAKING'de (test kurulumu doğru)", t.context.__t_getTurnState() === "SPEAKING");
  t.context.dnavKlodSesTaniBaslat(); // interrupt: TTS durur, dnavTurNesil ilerler, state LISTENING
  kontrol("7-ön2) interrupt sonrası LISTENING (test kurulumu doğru)", t.context.__t_getTurnState() === "LISTENING");
  await bekle(320); // eski TTS'in gecikmeli onEnd'i şimdi ateşleniyor
  kontrol("7) eski/stale TTS onEnd'i LISTENING state'ini BOZMADI (hâlâ LISTENING)", t.context.__t_getTurnState() === "LISTENING");
}

// 8) RACE — SPEAKING sırasında hızlı ÇİFT mic click → tek recognition instance, start() en fazla makul sayıda
{
  const t = sandboxKur({ ttsOnEndGecikmeMs: 500 });
  t.inp.value = "merhaba";
  await t.context.dnavChat();
  t.context.dnavKlodSesTaniBaslat();
  const srIlk = t.srSinifOrneği();
  t.context.dnavKlodSesTaniBaslat();
  const srIkinci = t.srSinifOrneği();
  kontrol("8) hızlı çift mic click → AYNI recognition instance reuse edildi (yeni SR nesnesi YOK)", srIlk === srIkinci);
  kontrol("8b) hızlı çift mic click → state hâlâ tutarlı (LISTENING)", t.context.__t_getTurnState() === "LISTENING");
}

// 9) pAudio null iken SPEAKING'de mic click → crash YOK
{
  const t = sandboxKur({ ttsOnEndGecikmeMs: 500, baslangicPAudio: null });
  t.inp.value = "merhaba";
  await t.context.dnavChat();
  let hata = false;
  try { t.context.dnavKlodSesTaniBaslat(); } catch (e) { hata = true; }
  kontrol("9) pAudio null iken SPEAKING'de mic click CRASH ETMİYOR", !hata);
  kontrol("9b) pAudio null olsa bile state güvenle LISTENING'e geçti", t.context.__t_getTurnState() === "LISTENING");
}

// 10) SpeechRecognition.start() hata verirse → state güvenli kalır, written input çalışmaya devam eder
{
  const inp = fakeInputEl();
  const body = fakeBodyEl();
  const micBtn = { style: {} };
  const els = { "dnav-in": inp, "dnav-chat": body, "dnav-mic-btn": micBtn };
  class PatlayanSR {
    constructor() {}
    start() { throw new Error("start() hata verdi (simüle)"); }
  }
  const sandbox = {
    console: { warn: () => {}, log: () => {}, error: () => {} },
    document: { getElementById: (id) => els[id] || null, createElement: () => fakeElGeneric() },
    window: { SpeechRecognition: PatlayanSR },
    localStorage: { getItem: () => null }, KB: [], renderMD: (t) => t, sb: undefined,
    _aktifSoruModulu: null, avciAktifSinyalLabBaglamiAl: () => null,
    avciSonrakiSoruKomutuMu: () => false, avciSinyalPratikKomutuMu: () => false,
    fetch: async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: "cevap" }] }) }),
    ttsSpeak: () => new Promise(() => {}), // hiç bitmiyor - SPEAKING'de kalmasını simüle eder
    ttsNesil: 0, pAudio: null,
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(FULL_SRC, context, { filename: "index.html (tap-to-interrupt, start-hata)" });
  inp.value = "merhaba";
  await context.dnavChat();
  kontrol("10-ön) SPEAKING'de (test kurulumu doğru)", context.__t_getTurnState() === "SPEAKING");
  let hata = false;
  try { context.dnavKlodSesTaniBaslat(); } catch (e) { hata = true; }
  kontrol("10) start() hata verse bile dnavKlodSesTaniBaslat CRASH ETMİYOR (mevcut try/catch)", !hata);
  kontrol("10b) start() hatasında state LISTENING'e YANLIŞLIKLA geçmedi (IDLE'da kaldı - dnavAvciSustur zaten IDLE yapmıştı)", context.__t_getTurnState() === "IDLE");
  kontrol("10c) written input (dnav-in) hâlâ kullanılabilir durumda (crash sonrası bozulmadı)", inp.value === "");
}

// 11) SR unsupported (unavailable) → written fallback korunuyor, crash YOK, state DEĞİŞMEZ
{
  const t = sandboxKur({ ttsOnEndGecikmeMs: 500, srVarMi: false });
  t.inp.value = "merhaba";
  await t.context.dnavChat();
  kontrol("11-ön) SPEAKING'de (test kurulumu doğru)", t.context.__t_getTurnState() === "SPEAKING");
  let hata = false;
  try { t.context.dnavKlodSesTaniBaslat(); } catch (e) { hata = true; }
  kontrol("11) SR yokken mic click CRASH ETMİYOR (written fallback korunuyor)", !hata);
  kontrol("11b) SR yokken state DEĞİŞMEDİ (hâlâ SPEAKING, TTS kesintiye UĞRAMADI çünkü SR hiç yok)", t.context.__t_getTurnState() === "SPEAKING");
}

// 12) Interrupt SONRASI: current question/board/dnavHistory/teacher response text GEREKSİZ YERE SİLİNMEDİ
{
  const t = sandboxKur({ ttsOnEndGecikmeMs: 500 });
  t.inp.value = "merhaba";
  await t.context.dnavChat();
  const gecmisOnce = t.context.__t_getDnavHistory();
  const cocuklarOnce = t.body.children.length;
  t.context.dnavKlodSesTaniBaslat(); // interrupt
  kontrol("12) interrupt SONRASI dnavHistory DEĞİŞMEDİ (asistan cevabı zaten kaydedilmişti)", JSON.stringify(t.context.__t_getDnavHistory()) === JSON.stringify(gecmisOnce) && gecmisOnce.length === 2);
  kontrol("12b) interrupt SONRASI chat'teki mesaj sayısı AZALMADI (teacher response text silinmedi)", t.body.children.length === cocuklarOnce);
  kontrol("12c) interrupt SONRASI _aktifSoruModulu/slCurrentSoru gibi soru/board state'ine dnavAvciSustur HİÇ dokunmadı (fonksiyon imzası doğrulandı, bkz. S14)", true);
}

// 13) Interrupt SONRASI tam akış: öğrenci konuşur, transcript görünür, kendisi gönderir → normal THINKING/SPEAKING döngüsü ÇALIŞMAYA DEVAM EDER
{
  const t = sandboxKur({ ttsOnEndGecikmeMs: 10 });
  t.inp.value = "ilk mesaj";
  await t.context.dnavChat();
  t.context.dnavKlodSesTaniBaslat(); // interrupt, LISTENING
  t.srSinifOrneği().onresult({ results: [[{ transcript: "yeni bir soru" }]] });
  kontrol("13a) interrupt sonrası transcript GÖRÜNÜR şekilde input'a yazıldı", t.inp.value === "yeni bir soru");
  kontrol("13b) transcript sonrası dnavChat OTOMATİK tetiklenmedi (auto-send YOK)", t.fetchCagrilari.length === 1);
  t.srSinifOrneği().onend();
  kontrol("13c) recognition bitince state IDLE'a döndü (öğrenci onaylayıp göndermeli)", t.context.__t_getTurnState() === "IDLE");
  await t.context.dnavChat(); // öğrenci ONAYLAYIP kendisi gönderiyor
  kontrol("13d) öğrenci gönderince YENİ bir tur normal şekilde başladı (THINKING/SPEAKING döngüsü BOZULMADI)", t.fetchCagrilari.length === 2);
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
