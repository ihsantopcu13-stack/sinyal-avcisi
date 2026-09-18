// KATMAN 5K — AVCI VOICE-LITE MVP. Öğrencinin mikrofona basıp konuşması,
// transcript'in mevcut dnav-in input'una yazılması (OTOMATİK GÖNDERİM
// YOK — öğrenci transcript'i görür/düzeltir, kendisi Gönder/Enter yapar),
// mevcut dnavChat()/AVCI beyninin (5A-5J TAMAMEN) DEĞİŞMEDEN çalışması ve
// AVCI cevabının mevcut TTS motoruyla (fire-and-forget) seslendirilmesini
// doğrular. Bu KESİNLİKLE Live Voice DEĞİL — streaming/barge-in/VAD/
// realtime/getUserMedia/MediaRecorder/WebSocket/WebRTC HİÇBİRİ YOK.
// Gerçek Supabase/Anthropic/TTS ağına HİÇ çıkılmaz; mikrofon/SpeechRecognition
// gerçek tarayıcı API'si sahte (fake) sınıflarla, gerçek VM ÇALIŞTIRMASIYLA
// test edilir — sahte yeniden-yazım DEĞİL (diğer avci-*.test.mjs dosyalarıyla
// AYNI desen).

import { readFileSync, readdirSync } from "node:fs";
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

const KLOD_TAB_BLOK = slice("} else if(txt.includes('KLOD')){", "} else if(txt.includes('Kelime')){");
const VOICE_FN_SRC = slice("let dnavRecognition=null;", "\n</script>");
const TTS_CALL_BLOK = slice("// KATMAN 5K — VOICE-LITE: metin cevabı", "// KATMAN 5E — AKILLI TAHTA: server");
const DNAVCHAT_SRC = slice("async function dnavChat(){", "function dAns(btn,correct){");

// ============================================================
// MIC — statik yapı
// ============================================================
{
  kontrol("1) KLOD mic butonu (dnav-mic-btn) HTML'de mevcut", /id="dnav-mic-btn"/.test(KLOD_TAB_BLOK));
  kontrol("2) mic butonu dnavKlodSesTaniBaslat() çağırıyor", /onclick="dnavKlodSesTaniBaslat\(\)"/.test(KLOD_TAB_BLOK));
  kontrol("3) dnavKlodSesTaniBaslat TAM OLARAK 1 kez tanımlı (duplicate YOK)", (html.match(/function dnavKlodSesTaniBaslat\(\)\{/g) || []).length === 1);
  kontrol("4) SpeechRecognition feature detection mevcut", /window\.SpeechRecognition\|\|window\.webkitSpeechRecognition/.test(VOICE_FN_SRC));
  kontrol("5) webkitSpeechRecognition fallback AÇIKÇA mevcut (sadece SpeechRecognition değil)", /window\.webkitSpeechRecognition/.test(VOICE_FN_SRC));
  kontrol("6) push-to-talk — continuous=true HİÇ ayarlanmıyor (tek-atış, sürekli dinleme YOK)", !/\.continuous\s*=\s*true/.test(VOICE_FN_SRC));
  kontrol("7) tr-TR VARSAYILAN dil olarak ayarlanmış", /dnavRecognition\.lang='tr-TR';/.test(VOICE_FN_SRC));
  kontrol("8) onresult SADECE input.value'yu dolduruyor (mevcut konusma/dila deseniyle AYNI satır şekli)", /dnavRecognition\.onresult=function\(e\)\{input\.value=e\.results\[0\]\[0\]\.transcript;\};/.test(VOICE_FN_SRC));
  kontrol("9) onresult içinde dnavChat çağrısı HİÇ YOK (transcript görünür kalır, otomatik gönderilmez)", !/onresult=function\(e\)\{[^}]*dnavChat/.test(VOICE_FN_SRC));
  kontrol("10) fonksiyon gövdesinde dnavChat() çağrısı HİÇ YOK (auto-send YOK)", !/dnavChat\(\)/.test(VOICE_FN_SRC));
  kontrol("11) fonksiyon gövdesinde otomatik Enter/keyboard event simülasyonu YOK", !/KeyboardEvent|dispatchEvent/.test(VOICE_FN_SRC));
  kontrol("12) SR unavailable → mic butonu render sonrası gizleniyor (fail-open, mevcut desenle AYNI)", /if\(!SR&&micBtn\)micBtn\.style\.display='none';/.test(KLOD_TAB_BLOK));
  kontrol("13) dnav-in input'unun mevcut Enter-ile-gönder davranışı DEĞİŞMEDİ", /id="dnav-in"[^>]*onkeydown="if\(event\.key==='Enter'\)dnavChat\(\)"/.test(KLOD_TAB_BLOK));
  kontrol("14) mevcut Gönder butonu (dnavChat onclick) DEĞİŞMEDEN duruyor", /class="chat-send klod-send" onclick="dnavChat\(\)"/.test(KLOD_TAB_BLOK));
  kontrol("15) dnavKlodSesTaniBaslat mevcut input yoksa (dnav-in bulunamazsa) crash YERİNE erken return ediyor", /if\(!input\)return;/.test(VOICE_FN_SRC));
}

// ============================================================
// TTS — statik yapı
// ============================================================
{
  // NOT (AVCI Turn Controller, 2026-09-18): 5K'nın çağrı imzası
  // ttsSpeak(temizCevap,null,null) idi; Turn Controller onEnd'i (üçüncü
  // parametre) mevcut _dnavSpeakingBitir callback'ine BAĞLADI (SPEAKING'i
  // IDLE'a döndürmek için, bkz. tests/avci-turn-controller.test.mjs) —
  // ttsSpeak()'in KENDİSİ hâlâ AYNI, sadece çağıran taraftan üçüncü
  // argüman artık null değil bir callback.
  kontrol("16) mevcut ttsSpeak() reuse ediliyor (yeni bir TTS fonksiyonu YAZILMADI)", /ttsSpeak\(temizCevap,null,_dnavSpeakingBitir\)/.test(TTS_CALL_BLOK));
  kontrol("17) yeni bir TTS provider/fonksiyon TANIMLANMADI (bu blokta function tanımı YOK)", !/function\s+tts/.test(TTS_CALL_BLOK));
  kontrol("18) bu blokta yeni bir fetch()/endpoint çağrısı YOK (mevcut /api/tts, /api/tts-eleven zaten ttsSpeak içinde)", !/fetch\(/.test(TTS_CALL_BLOK));
  kontrol("19) yeni TTS endpoint dosyası oluşturulmadı (api/tts.mjs ve api/tts-eleven.mjs hâlâ mevcut, başka yeni tts-* dosyası yok)", (() => {
    const files = readdirSync(path.join(ROOT, "api"));
    const ttsFiles = files.filter((f) => f.includes("tts"));
    return ttsFiles.length === 2 && ttsFiles.includes("tts.mjs") && ttsFiles.includes("tts-eleven.mjs");
  })());
  kontrol("20) metin ÖNCE render ediliyor, TTS SONRA çağrılıyor (kaynak sırası)", html.indexOf("km.innerHTML=renderMD(temizCevap);") < html.indexOf("ttsSpeak(temizCevap,null,_dnavSpeakingBitir)"));
  kontrol("21) TTS çağrısı await EDİLMİYOR (fire-and-forget)", !/await\s+ttsSpeak\(temizCevap/.test(DNAVCHAT_SRC));
  kontrol("22) TTS çağrısı try/catch ile sarılmış (senkron hata chat'i bloklamaz)", /try\{[\s\S]{0,20}const _ttsSonuc=ttsSpeak\(temizCevap,null,_dnavSpeakingBitir\);/.test(TTS_CALL_BLOK));
  kontrol("23) TTS promise'ine .catch() bağlanmış (asenkron ret de yakalanır, unhandled rejection YOK)", /\.catch\(_dnavSpeakingBitir\)/.test(TTS_CALL_BLOK));
  kontrol("24) TTS çağrısı temizCevap (öğrenciye gösterilen GÜVENLİ final metin) kullanıyor — board_actions/JSON DEĞİL", /ttsSpeak\(temizCevap/.test(TTS_CALL_BLOK) && !/board_actions/.test(TTS_CALL_BLOK) && !/JSON\.stringify/.test(TTS_CALL_BLOK));
}

// ============================================================
// 5H / 5I / 5J — matcher'lar ve davranış DEĞİŞMEDİ, transcript aynı
// dnav-in input'undan (val) geçtiği için otomatik reuse ediliyor
// ============================================================
{
  kontrol("25) 5H matcher (avciSonrakiSoruKomutuMu) TAM OLARAK 1 kez, DEĞİŞMEDİ", (html.match(/function avciSonrakiSoruKomutuMu\(metin\)\{/g) || []).length === 1);
  kontrol("26) 5I matcher (avciSinyalPratikKomutuMu) TAM OLARAK 1 kez, DEĞİŞMEDİ", (html.match(/function avciSinyalPratikKomutuMu\(metin\)\{/g) || []).length === 1);
  kontrol("27) dnavChat() hâlâ val'i AYNI input'tan (dnav-in) okuyor — voice/klavye AYNI kanaldan geçiyor", /const val=inp\.value\.trim\(\);/.test(DNAVCHAT_SRC) && /document\.getElementById\('dnav-in'\)/.test(DNAVCHAT_SRC));
  kontrol("28) 5H köprüsü hâlâ SADECE _aktifSoruModulu==='sinyal_lab' + matcher eşleşmesiyle çalışıyor (yeni bir 'voice' şartı EKLENMEDİ)", /if\(avciSonrakiSoruKomutuMu\(val\)&&_aktifSoruModulu==='sinyal_lab'\)\{/.test(DNAVCHAT_SRC));
  kontrol("29) 5I köprüsü hâlâ SADECE _aktifSoruModulu==='sinyal_lab' + matcher eşleşmesiyle çalışıyor (yeni bir 'voice' şartı EKLENMEDİ)", /if\(avciSinyalPratikKomutuMu\(val\)&&_aktifSoruModulu==='sinyal_lab'\)\{/.test(DNAVCHAT_SRC));
  kontrol("30) transcript 5H/5I köprülerine ulaşmadan ÖNCE otomatik bir state mutasyonu YOK (voice fonksiyonu bu köprüleri hiç çağırmıyor)", !/slSonraki\(\)|avciAyniSinyaldenPratikSorusuBul/.test(VOICE_FN_SRC));
  kontrol("31) 5J explicit reteach bölümü DEĞİŞMEDEN korunuyor", /AVCI BASAMAK YENIDEN OGRETIMI \(EXPLICIT ADIM\) KURALI \(ZORUNLU\)/.test(html));
  kontrol("32) 5J generic 'anlamadım' istisna kuralı DEĞİŞMEDEN korunuyor", /HICBIR basamaga otomatik ESLENMEZ - boyle bir durumda bu kurali TETIKLEME/.test(html));
}

// ============================================================
// 5F — ASK/STOP/WAIT kontratı korunuyor
// ============================================================
{
  kontrol("33) SOCRATIC TEK ADIM döngüsü (SOR->DUR->BEKLE->CEVABI AL->DEGERLENDIR) DEĞİŞMEDEN korunuyor", /SOR \(tek kucuk soru\) -> DUR -> OGRENCIYI BEKLE -> CEVABI AL -> DEGERLENDIR/.test(html));
  kontrol("34) TAHTA ZAMANLAMASI KURALI DEĞİŞMEDEN korunuyor", /TAHTA ZAMANLAMASI KURALI \(ZORUNLU/.test(html));
}

// ============================================================
// BOARD — allowlist/validator/answer-leak korunuyor, yeni action YOK
// ============================================================
{
  kontrol("35) BOARD_ACTION_ALLOWLIST hâlâ TAM OLARAK 8 action", (() => {
    return (klodSrc.match(/'HIGHLIGHT_VERB', 'SHOW_SVO', 'HIGHLIGHT_SIGNAL', 'SHOW_LEFT_RIGHT',/) || []).length === 1 && (klodSrc.match(/'SHOW_HINT', 'SHOW_AVCI_REFLEX', 'CLEAR_BOARD', 'ELIMINATE_OPTION',/) || []).length === 1;
  })());
  kontrol("36) yeni bir 'VOICE_*'/'MIC_*' board action EKLENMEDİ", !/'VOICE_|'MIC_/.test(klodSrc) && !/'VOICE_|'MIC_/.test(html));
  kontrol("37) klodBoardActionlariDogrula TAM OLARAK 1 kez, imzası DEĞİŞMEDİ", (klodSrc.match(/function klodBoardActionlariDogrula\(rawActions, dogrulanmisBaglam, canonical\)/g) || []).length === 1);
}

// ============================================================
// SECURITY — getUserMedia/MediaRecorder/WebSocket/WebRTC/realtime/VAD YOK
// ============================================================
{
  kontrol("38) getUserMedia bu katmanda HİÇ kullanılmadı (VOICE_FN_SRC + TTS bloğu)", !/getUserMedia/.test(VOICE_FN_SRC) && !/getUserMedia/.test(TTS_CALL_BLOK));
  kontrol("39) MediaRecorder bu katmanda HİÇ kullanılmadı", !/MediaRecorder/.test(VOICE_FN_SRC) && !/MediaRecorder/.test(TTS_CALL_BLOK));
  kontrol("40) WebSocket bu katmanda HİÇ kullanılmadı", !/WebSocket/.test(VOICE_FN_SRC) && !/WebSocket/.test(TTS_CALL_BLOK));
  kontrol("41) WebRTC/RTCPeerConnection bu katmanda HİÇ kullanılmadı", !/RTCPeerConnection|WebRTC/.test(VOICE_FN_SRC) && !/RTCPeerConnection|WebRTC/.test(TTS_CALL_BLOK));
  kontrol("42) 'realtime' (canlı akış) altyapısı bu katmanda HİÇ eklenmedi", !/realtime/i.test(VOICE_FN_SRC) && !/realtime/i.test(TTS_CALL_BLOK));
  kontrol("43) VAD (voice-activity-detection)/barge-in/interruption bu katmanda HİÇ eklenmedi", !/\bVAD\b|barge-in|interruption/i.test(VOICE_FN_SRC));
  kontrol("44) ham ses (audio blob/base64) yükleme kodu YOK", !/audio\/webm|audio\/wav|Blob\(/.test(VOICE_FN_SRC));
  kontrol("45) bu katmanda yeni bir secret/API key literal'i EKLENMEDİ", !/sk-|AIza|AKIA/.test(VOICE_FN_SRC) && !/sk-|AIza|AKIA/.test(TTS_CALL_BLOK));
  kontrol("46) api/klod.mjs'de service_role hâlâ YOK (5K bunu değiştirmedi)", (() => {
    const kodSatirlari = klodSrc.split("\n").filter((s) => !s.trim().startsWith("//")).join("\n");
    return !/SERVICE_ROLE/i.test(kodSatirlari);
  })());
  kontrol("47) eval/new Function bu katmanda HİÇ kullanılmadı", !/\beval\(|new Function\(/.test(VOICE_FN_SRC) && !/\beval\(|new Function\(/.test(TTS_CALL_BLOK));
}

// ============================================================
// STATE — yeni persistent/session/DB state YOK
// ============================================================
{
  kontrol("48) bu katmanda schema/migration/RPC/create table/alter table referansı YOK", !/create table|alter table|\.rpc\(/i.test(VOICE_FN_SRC + TTS_CALL_BLOK));
  kontrol("49) yeni bir sessionStorage/localStorage tabanlı ses state'i EKLENMEDİ", !/sessionStorage|localStorage/.test(VOICE_FN_SRC));
  kontrol("50) api/klod.mjs bu katmanda HİÇ değişmedi ('KATMAN 5K' / 'dnavKlodSesTaniBaslat' hiç geçmiyor)", !/KATMAN 5K/.test(klodSrc) && !/dnavKlodSesTaniBaslat/.test(klodSrc));
}

// ============================================================
// GERÇEK ÇALIŞTIRMA — dnavKlodSesTaniBaslat, fake SpeechRecognition ile
// ============================================================
function fakeMicBtn() {
  return { style: {} };
}
function fakeInputEl() {
  let v = "";
  return {
    get value() { return v; },
    set value(x) { v = x; },
  };
}
function sandboxKur({ srVarMi = true } = {}) {
  const dnavChatCagrilari = { count: 0 };
  let sonOlusturulanSR = null;
  class FakeSpeechRecognition {
    constructor() {
      this.lang = null;
      this.interimResults = null;
      this.maxAlternatives = null;
      this.onresult = null;
      this.onend = null;
      this.onerror = null;
      this._startCount = 0;
      sonOlusturulanSR = this;
    }
    start() { this._startCount++; }
  }
  const micBtn = fakeMicBtn();
  const input = fakeInputEl();
  const els = { "dnav-mic-btn": micBtn, "dnav-in": input };
  const sandbox = {
    console: { warn: () => {}, log: () => {}, error: () => {} },
    document: { getElementById: (id) => els[id] || null },
    window: srVarMi ? { SpeechRecognition: FakeSpeechRecognition } : {},
    dnavChat: () => { dnavChatCagrilari.count++; },
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(VOICE_FN_SRC, context, { filename: "index.html (5K voice-lite fn)" });
  return { context, micBtn, input, dnavChatCagrilari, srSinifOrneği: () => sonOlusturulanSR };
}

// 51-54) SR mevcutken: recognition kuruluyor, tr-TR ayarlı, start() çağrılıyor, ikinci çağrıda AYNI instance reuse ediliyor
{
  const t = sandboxKur({ srVarMi: true });
  t.context.dnavKlodSesTaniBaslat();
  const sr1 = t.srSinifOrneği();
  kontrol("51) SR mevcutken recognition GERÇEKTEN oluşturuluyor", sr1 !== null);
  kontrol("52) recognition.lang GERÇEKTEN 'tr-TR' olarak ayarlanıyor", sr1.lang === "tr-TR");
  kontrol("53) recognition.start() GERÇEKTEN çağrılıyor", sr1._startCount === 1);
  t.context.dnavKlodSesTaniBaslat();
  const sr2 = t.srSinifOrneği();
  kontrol("54) ikinci çağrıda AYNI recognition instance reuse ediliyor (yeni SR nesnesi YOK), start() tekrar çağrılıyor", sr1 === sr2 && sr1._startCount === 2);
}

// 55-56) onresult SADECE input.value'yu dolduruyor, dnavChat OTOMATİK ÇAĞRILMIYOR
{
  const t = sandboxKur({ srVarMi: true });
  t.context.dnavKlodSesTaniBaslat();
  const sr = t.srSinifOrneği();
  sr.onresult({ results: [[{ transcript: "Sonraki soruya geç." }]] });
  kontrol("55) onresult transcript'i GERÇEKTEN input.value'ya yazıyor", t.input.value === "Sonraki soruya geç.");
  kontrol("56) onresult SONRASI dnavChat OTOMATİK ÇAĞRILMADI (auto-send YOK, gerçek çalıştırmayla kanıtlandı)", t.dnavChatCagrilari.count === 0);
}

// 57) onend/onerror mic buton stilini GERÇEKTEN resetliyor
{
  const t = sandboxKur({ srVarMi: true });
  t.context.dnavKlodSesTaniBaslat();
  t.micBtn.style.animation = "pulse 1s ease infinite";
  t.micBtn.style.background = "#22d3ee30";
  const sr = t.srSinifOrneği();
  sr.onend();
  kontrol("57) onend mic buton animasyonunu/rengini GERÇEKTEN sıfırlıyor", t.micBtn.style.animation === "" && t.micBtn.style.background === "#0a0c1480");
}

// 58-59) SR YOKKEN: fonksiyon crash ETMİYOR, input/mic'e HİÇ dokunmuyor (fail-open, gerçek çalıştırmayla kanıtlandı)
{
  const t = sandboxKur({ srVarMi: false });
  let hata = false;
  try { t.context.dnavKlodSesTaniBaslat(); } catch (e) { hata = true; }
  kontrol("58) SR yokken çağrı crash ETMİYOR", !hata);
  kontrol("59) SR yokken input/mic butonuna HİÇ dokunulmadı (written AVCI etkilenmedi)", t.input.value === "" && JSON.stringify(t.micBtn.style) === "{}");
}

// 60) dnav-in yoksa (KLOD sekmesi henüz render edilmemiş) crash YOK, erken return
{
  const dnavChatCagrilari = { count: 0 };
  class FakeSR { constructor() {} start() {} }
  const sandbox = {
    console: { warn: () => {}, log: () => {}, error: () => {} },
    document: { getElementById: () => null },
    window: { SpeechRecognition: FakeSR },
    dnavChat: () => { dnavChatCagrilari.count++; },
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(VOICE_FN_SRC, context, { filename: "index.html (5K voice-lite fn, no input)" });
  let hata = false;
  try { context.dnavKlodSesTaniBaslat(); } catch (e) { hata = true; }
  kontrol("60) dnav-in DOM'da yokken (henüz render edilmemiş) crash YOK", !hata);
}

// ============================================================
// GERÇEK ÇALIŞTIRMA — TTS fire-and-forget bloğu, reject eden sahte
// ttsSpeak ile (unhandled rejection ÜRETMEDİĞİNİ kanıtlıyor)
// ============================================================
{
  // NOT (AVCI Turn Controller, 2026-09-18): TTS_CALL_BLOK artık dışarıdan
  // gelen benimTurNesil/dnavTurNesil/dnavTurnState'e referans veriyor -
  // probe fonksiyonuna bunları sağlıyoruz (benimTurNesil===dnavTurNesil
  // eşleşsin diye ikisi de aynı değerle, ki guard PASS olsun ve gerçek
  // davranış test edilsin).
  const TTS_PROBE_SRC = `function __ttsProbe(temizCevap){\nconst benimTurNesil=dnavTurNesil;\n${TTS_CALL_BLOK}\n}`;
  let reddedenPromiseYakalandiMi = false;
  const sandbox = {
    console: { warn: () => {}, log: () => {}, error: () => {} },
    ttsSpeak: (text) => Promise.reject(new Error("simüle edilmiş TTS hatası")),
    dnavTurNesil: 1,
    dnavTurnState: 'THINKING',
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(TTS_PROBE_SRC, context, { filename: "index.html (5K tts probe)" });
  let hata = false;
  try { context.__ttsProbe("test cevabı"); } catch (e) { hata = true; }
  kontrol("61) TTS çağrısı reddedilse bile __ttsProbe SENKRON OLARAK crash ETMİYOR", !hata);
  process.on("unhandledRejection", () => { reddedenPromiseYakalandiMi = true; });
  await new Promise((r) => setTimeout(r, 20));
  kontrol("62) reddedilen TTS promise'i unhandledRejection ÜRETMEDİ (.catch() gerçekten yakalıyor)", !reddedenPromiseYakalandiMi);
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
