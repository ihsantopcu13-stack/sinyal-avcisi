// KATMAN 5B — SİNYAL LAB CURRENT QUESTION CONTEXT. GERÇEK ÇALIŞTIRMA
// (execution) + statik yapı + server mock testleri. index.html'den
// active-module tracker / context assembler / dAns / slRender kaynağı
// BİREBİR çıkarılıp Node'un `vm` modülüyle GERÇEKTEN ÇALIŞTIRILIYOR —
// sahte yeniden-yazım DEĞİL (diğer avci-*.test.mjs dosyalarıyla AYNI
// desen). api/klod.mjs tarafı gerçek Anthropic ağına HİÇ çıkmadan mock
// fetch ile test ediliyor (mail-dryrun.test.mjs / avci-klod-auth.test.mjs
// ile AYNI desen).
//
// ÖNEMLİ: Node vm'de top-level `let` bir context property'si OLARAK dışa
// yansımaz (sadece `function` bildirimleri yansır) — bu yüzden test
// senaryolarını kurmak için extracted kaynağın SONUNA, aynı script içinde
// çalışan (ve dolayısıyla aynı `let` binding'lerini closure ile gören)
// küçük test-yardımcı fonksiyonları ekleniyor. Bunlar gerçek dosyanın bir
// parçası DEĞİL, sadece bu test dosyasının kurduğu vm script'inin bir
// parçası.

import handler from "../api/klod.mjs";
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

// CRLF/LF normalize: Windows checkout CRLF verirken, Linux CI (git
// autocrlf farkı) LF verebiliyor — tüm marker'ları TEK bir satır sonu
// biçimine (\n) göre yazabilmek için burada normalize ediyoruz.
const html = readFileSync(path.join(ROOT, "index.html"), "utf-8").replace(/\r\n/g, "\n");

function slice(startMarker, endMarker, fromIdx) {
  const s = html.indexOf(startMarker, fromIdx || 0);
  const e = html.indexOf(endMarker, s);
  if (s === -1 || e === -1) throw new Error(`marker bulunamadı: "${startMarker}" -> "${endMarker}"`);
  return html.slice(s, e);
}

// ============================================================
// STATİK — tracker/assembler/state alanları duplicate yok, doğru yerde
// ============================================================
{
  kontrol("S1) _aktifSoruModulu TAM OLARAK 1 kez tanımlı (duplicate YOK)", (html.match(/let _aktifSoruModulu=null;/g) || []).length === 1);
  kontrol("S2) dtab() mod!=='sinyal' olan HER durumda tracker'ı null'a çekiyor", /_aktifSoruModulu=\(mod==='sinyal'\)\?'sinyal_lab':null;/.test(html));
  kontrol("S3) dnav() 'Dashboard' ve 'Sinyal Lab' dallarında tracker'ı 'sinyal_lab' yapıyor", (html.match(/_aktifSoruModulu='sinyal_lab';/g) || []).length === 2);
  kontrol("S4) dnav() 'KLOD' dalında tracker'a DOKUNULMUYOR (context KLOD'a geçince kaybolmamalı)", (() => {
    const klodDali = slice("} else if(txt.includes('KLOD')){", "} else if(txt.includes('Kelime')){");
    return !/_aktifSoruModulu/.test(klodDali);
  })());
  kontrol("S5) dnav() Kelime/SAT/Tuzak/Ses/Rapor/Raporlar dallarının HEPSİ tracker'ı null yapıyor (6 dal)", (() => {
    const dnavGovde = slice("function dnav(el){", "\n}\n", html.indexOf("function dnav(el){"));
    return (dnavGovde.match(/_aktifSoruModulu=null;/g) || []).length === 6;
  })());
  kontrol("S6) avciAktifSinyalLabBaglamiAl TAM OLARAK 1 kez tanımlı", (html.match(/function avciAktifSinyalLabBaglamiAl\(\)\{/g) || []).length === 1);
  kontrol("S7) assembler cevap ÖNCESİ correct_answer/is_correct'i objeye HİÇ KOYMUYOR (sadece answered:true bloğunda ekleniyor)", (() => {
    const fn = slice("function avciAktifSinyalLabBaglamiAl(){", "async function dnavChat(){");
    const oncesiBlok = fn.slice(0, fn.indexOf("if(slAnswered"));
    return !/correct_answer|is_correct/.test(oncesiBlok);
  })());
  kontrol("S8) assembler fb/explanation/tuzak_ipucu/data-tip alanlarını HİÇ payload'a koymuyor", !/correct_answer[\s\S]{0,300}?\bfb\b/.test(slice("function avciAktifSinyalLabBaglamiAl(){", "async function dnavChat(){")) && !/data-tip/.test(slice("function avciAktifSinyalLabBaglamiAl(){", "async function dnavChat(){")));
  kontrol("S9) assembler HTML etiketlerini temizliyor (duzMetin regex ile)", /replace\(\/<\[\^>\]\*>\/g,''\)/.test(slice("function avciAktifSinyalLabBaglamiAl(){", "async function dnavChat(){")));
  kontrol("S10) dnavChat() context'i _aktifSoruModulu'a bakmadan HER ZAMAN assembler'dan (canlı) alıyor — cache/snapshot YOK", /const _aktifBaglam=avciAktifSinyalLabBaglamiAl\(\);/.test(html));
  kontrol("S11) _slSelectedAnswerText/_slSelectedAnswerCorrect TAM OLARAK 1 kez deklare edilmiş", (html.match(/let _slSelectedAnswerText=null,_slSelectedAnswerCorrect=null;/g) || []).length === 1);
  kontrol("S12) dAns() guard'ın (slAnswered=true) HEMEN ardından seçilen cevabı yakalıyor", /slAnswered=true;\s*\n\s*_slSelectedAnswerText=btn\.textContent;_slSelectedAnswerCorrect=Boolean\(correct\);/.test(html));
  kontrol("S13) slRender() yeni soruda seçilen cevabı SIFIRLIYOR (stale sızıntı yok)", /_slSelectedAnswerText=null;_slSelectedAnswerCorrect=null;/.test(html));
  kontrol("S14) STUDENT MODEL/WEAK AREA/ANSWER HISTORY/DIAGNOSTIC/user_id/email assembler'a HİÇ eklenmedi", !/avciOgrenciModeliHesapla|avciZayifAlanlarimRender|answer_history|diagnostic_events|user_id|currentUser/.test(slice("function avciAktifSinyalLabBaglamiAl(){", "async function dnavChat(){")));
  kontrol("S15) response_time_ms (rtBaslat/rtBitir) çağrıları dAns/slRender içinde HÂLÂ mevcut — dokunulmadı", /const _slRt=rtBitir\(_slRtBaslangic\);/.test(html) && /_slRtBaslangic=rtBaslat\(\);/.test(html));
  kontrol("S16) Katman 4 motoru (avciKokNedenAnalizEt) TAM OLARAK 1 kez, DEĞİŞMEDİ", (html.match(/function avciKokNedenAnalizEt\(diagnosticEventleri,opts\)/g) || []).length === 1);
  kontrol("S17) DILA (konusmaGonder/dilaSor) hiç context/_aktifSoruModulu referansı içermiyor — dokunulmadı", !/function konusmaGonder[\s\S]{0,600}_aktifSoruModulu/.test(html) && !/function dilaSor[\s\S]{0,600}_aktifSoruModulu/.test(html));
}

// ============================================================
// GERÇEK ÇALIŞTIRMA — assembler + dAns + slRender vm ile çalıştırılıyor
// ============================================================
const AVCI_BAGLAM_FN = slice("function avciAktifSinyalLabBaglamiAl(){", "async function dnavChat(){");
const DANS_FN = slice("function dAns(btn,correct){", "AVCI HATA KÖKÜ MOTORU — KATMAN 4 MVP");
const STATE_DECL = slice("let slIdx=0,slAnswered=false,slCurrentSoru=null,_slRtBaslangic=null;", "function slRender(){");
const SLRENDER_FN = slice("function slRender(){", "// S+V+O AKADEMİ");
const TRACKER_DECL = "let _aktifSoruModulu=null;\n";

const TEST_HARNESS = `
function __t_setAktifModul(v){_aktifSoruModulu=v;}
function __t_getAktifModul(){return _aktifSoruModulu;}
function __t_getSlState(){return {slAnswered:slAnswered,selText:_slSelectedAnswerText,selCorrect:_slSelectedAnswerCorrect,soruId:slCurrentSoru&&slCurrentSoru.id};}
`;

const FULL_SRC = TRACKER_DECL + "\n" + STATE_DECL + "\n" + AVCI_BAGLAM_FN + "\n" + DANS_FN + "\n" + SLRENDER_FN + "\n" + TEST_HARNESS;

const CANONICAL_Q1 = { id: "q001", sinyal: "despite", eye: "Genel", sent: '"The court ruled, <span class="s-sig">despite</span> the issues, it was <span class="s-trap">by no means</span> invalid."', q: "Bu metne göre ne söylenebilir?", opts: ["Usul hataları geçersiz kıldı.", "Usul hatalarına rağmen geçerliliğini korudu.", "Yeniden yargılama istendi.", "Kesinlikle geçersiz bulundu."], ans: 1, fb: "despite = zıtlık, by no means = kesinlikle değil." };
const CANONICAL_Q2 = { id: "q002", sinyal: "despite", eye: "Genel", sent: '"Researchers concluded, despite results, treatment was far from guaranteed."', q: "Araştırmacılar ne söylemiştir?", opts: ["Etkilidir.", "Umut verici ama garantili değil.", "Yetersiz.", "Tamamlandı."], ans: 1, fb: "far from = garantili değil." };

function fakeBtn(metin) {
  return { _text: metin, get textContent() { return this._text; }, classList: { added: [], add(c) { this.added.push(c); } }, disabled: false };
}

function sandboxKur() {
  const elMap = {
    "sl-eyebrow": { textContent: "" },
    "sl-sent": { innerHTML: "", onmouseenter: null, querySelectorAll: () => [] },
    "sl-q": { textContent: "" },
    "dm-opts": { innerHTML: "", get opts() { return []; } },
    "dm-fb": { textContent: "", className: "" },
    "sl-next-btn": { style: { display: "none" } },
  };
  const dmOptButtons = [fakeBtn(""), fakeBtn(""), fakeBtn(""), fakeBtn("")];
  const sandbox = {
    console: { warn: () => {}, log: () => {}, error: () => {} },
    document: {
      getElementById: (id) => elMap[id] || null,
      querySelectorAll: (sel) => (sel === "#dm-opts .dmo" ? dmOptButtons : []),
    },
    window: {},
    curAlan: null,
    setTimeout: () => {},
    rtBaslat: () => 1000,
    rtBitir: () => 500,
    ttsSpeak: () => {},
    faz2GaEvent: () => {},
    avciTeshisPaneliTemizle: () => {},
    avciTeshisPaneliGoster: () => {},
    cevapKaydet: () => {},
    hataEkle: () => {},
    streakSoruEkle: () => {},
    konfeti: () => {},
    saShakeBtn: () => {},
    SL_HAVUZ: [CANONICAL_Q1, CANONICAL_Q2],
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(FULL_SRC, context, { filename: "index.html (extracted, katman5b-context)" });
  return { context, dmOptButtons };
}

// 1) Sinyal Lab pasif iken assembler null döner
{
  const t = sandboxKur();
  t.context.__t_setAktifModul(null);
  kontrol("1) başka modül aktif (veya hiçbiri) → Sinyal Lab context YOK (null)", t.context.avciAktifSinyalLabBaglamiAl() === null);
}

// 2) Sinyal Lab aktif ama henüz soru render edilmemiş (slCurrentSoru null) → null
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  kontrol("2) Sinyal Lab aktif ama slCurrentSoru yok → null (crash yok)", t.context.avciAktifSinyalLabBaglamiAl() === null);
}

// 3) Sinyal Lab aktif + soru render edilmiş, CEVAP ÖNCESİ
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  t.context.slRender();
  const baglam = t.context.avciAktifSinyalLabBaglamiAl();
  kontrol("3) Sinyal Lab active → context VAR", baglam !== null);
  kontrol("4) module:'sinyal_lab', question_id doğru", baglam.module === "sinyal_lab" && baglam.question_id === "q001");
  kontrol("5) before answer → answered:false", baglam.answered === false);
  kontrol("6) before answer → correct_answer YOK", !("correct_answer" in baglam));
  kontrol("7) before answer → is_correct YOK", !("is_correct" in baglam));
  kontrol("8) before answer → selected_answer YOK", !("selected_answer" in baglam));
  kontrol("9) before answer → explanation/fb YOK (payload'da hiç yok)", !("explanation" in baglam) && !("fb" in baglam));
  kontrol("10) question_text HTML etiketi içermiyor (raw HTML yok)", !/<[^>]+>/.test(baglam.question_text));
  kontrol("11) options 4 öğe, HTML yok", baglam.options.length === 4 && baglam.options.every((o) => !/<[^>]+>/.test(o)));
  kontrol("12) signal doğru", baglam.signal === "despite");
}

// 13-14) CEVAP SONRASI — doğru cevap
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  t.context.slRender();
  const btn = fakeBtn(CANONICAL_Q1.opts[1]);
  t.context.dAns(btn, true);
  const baglam = t.context.avciAktifSinyalLabBaglamiAl();
  kontrol("13) after answer → answered:true, selected_answer VAR", baglam.answered === true && baglam.selected_answer === CANONICAL_Q1.opts[1]);
  kontrol("14) after answer → correct_answer VAR ve doğru, is_correct:true", baglam.correct_answer === CANONICAL_Q1.opts[1] && baglam.is_correct === true);
}

// 15) CEVAP SONRASI — yanlış cevap
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  t.context.slRender();
  const btn = fakeBtn(CANONICAL_Q1.opts[0]);
  t.context.dAns(btn, false);
  const baglam = t.context.avciAktifSinyalLabBaglamiAl();
  kontrol("15) yanlış cevap sonrası → is_correct:false, selected_answer yanlış şık, correct_answer YİNE doğru şık", baglam.is_correct === false && baglam.selected_answer === CANONICAL_Q1.opts[0] && baglam.correct_answer === CANONICAL_Q1.opts[1]);
}

// 16) double click → state değişmez
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  t.context.slRender();
  const btn1 = fakeBtn(CANONICAL_Q1.opts[1]);
  t.context.dAns(btn1, true);
  const durum1 = t.context.__t_getSlState();
  const btn2 = fakeBtn(CANONICAL_Q1.opts[0]); // farklı bir şıkka "ikinci tıklama" simülasyonu
  t.context.dAns(btn2, false);
  const durum2 = t.context.__t_getSlState();
  kontrol("16) double click → seçilen cevap/is_correct DEĞİŞMEDİ (guard çalışıyor)", durum1.selText === durum2.selText && durum1.selCorrect === durum2.selCorrect && durum2.selText === CANONICAL_Q1.opts[1]);
}

// 17-18) yeni soru → eski seçim temiz
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  t.context.slRender(); // q001
  t.context.dAns(fakeBtn(CANONICAL_Q1.opts[1]), true);
  const oncekiDurum = t.context.__t_getSlState();
  kontrol("17) cevaplandıktan hemen sonra selected_answer dolu", oncekiDurum.selText !== null);
  t.context.slRender(); // yeni soru (deterministik pool'da idx aynı kalsa da render tekrar çağrıldı)
  const yeniBaglam = t.context.avciAktifSinyalLabBaglamiAl();
  kontrol("18) yeni soru render sonrası → answered:false, eski selected_answer TEMİZ", yeniBaglam.answered === false && !("selected_answer" in yeniBaglam));
}

// 19) stale navigation → Sinyal Lab'dan çıkılınca context sızmıyor
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  t.context.slRender();
  t.context.dAns(fakeBtn(CANONICAL_Q1.opts[1]), true);
  kontrol("19a) cevaplanmış context hâlâ mevcut (kontrol)", t.context.avciAktifSinyalLabBaglamiAl() !== null);
  t.context.__t_setAktifModul(null); // dtab/dnav başka modüle geçti simülasyonu
  kontrol("19b) tracker temizlenince (başka modüle geçildi) → context ARTIK YOK, cevaplanmış soru bile sızmıyor", t.context.avciAktifSinyalLabBaglamiAl() === null);
}

// ============================================================
// SERVER — api/klod.mjs canonical doğrulama + auth ortogonalliği
// ============================================================
function sahteRes() {
  const res = { _status: null, _json: null };
  res.status = (s) => { res._status = s; return res; };
  res.json = (j) => { res._json = j; return res; };
  res.setHeader = () => {};
  return res;
}
function sahteReq(body, { ip = "1.2.3.4", authorization } = {}) {
  const headers = { "x-forwarded-for": ip };
  if (authorization !== undefined) headers.authorization = authorization;
  return { method: "POST", body, headers };
}
const orijinalFetch = globalThis.fetch;
function fetchMockKur(impl) { globalThis.fetch = impl; }
function fetchMockTemizle() { globalThis.fetch = orijinalFetch; }

function anthropicMockCaptureSystem() {
  const capturedRequests = [];
  return {
    capturedRequests,
    impl: async (url, opts) => {
      if (String(url).includes("supabase.co/auth/v1/user")) {
        return { ok: true, json: async () => ({ id: "user-1", is_anonymous: false }) };
      }
      if (String(url).includes("api.anthropic.com")) {
        const parsed = JSON.parse(opts.body);
        capturedRequests.push(parsed);
        return { ok: true, json: async () => ({ content: [{ type: "text", text: "cevap" }], usage: {} }) };
      }
      throw new Error("beklenmeyen istek: " + url);
    },
  };
}

const orijinalKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = "sahte-test-degeri-gercek-degil";

// Anthropic'e giden system dizisindeki "AKTİF SORU BAĞLAMI" bloğundan
// gerçek JSON objesini çıkarır (substring/quote-escaping'e duyarlı
// olmayan, doğru bir ayrıştırma).
function getBaglamObj(capturedRequest) {
  const blok = (capturedRequest.system || []).find((b) => b.text && b.text.includes("AKTİF SORU BAĞLAMI"));
  if (!blok) return null;
  const jsonStr = blok.text.slice(blok.text.indexOf("{"), blok.text.indexOf("}\n\nBu bağlamı") + 1);
  return JSON.parse(jsonStr);
}

// 20) before answer context → sistemde correct_answer/aciklama YOK
{
  const m = anthropicMockCaptureSystem();
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "bu soruda niye B?" }], context: { module: "sinyal_lab", question_id: "q001", answered: false } }, { ip: "20.0.0.1" }), res);
  const baglam = getBaglamObj(m.capturedRequests[0]);
  kontrol("20) before answer (server) → AKTİF SORU BAĞLAMI VAR, answered:false", baglam !== null && baglam.answered === false);
  kontrol("20a) before answer (server) → correct_answer/is_correct/selected_answer ALAN OLARAK bile YOK", !("correct_answer" in baglam) && !("is_correct" in baglam) && !("selected_answer" in baglam));
  const sistemMetni = JSON.stringify(m.capturedRequests[0].system);
  kontrol("20b) before answer (server) → aciklama_tr/tuzak_ipucu (canonical açıklama alanları) sistemde YOK", !sistemMetni.includes("aciklama_tr") && !sistemMetni.includes("tuzak_ipucu"));
  fetchMockTemizle();
}

// 21) after answer → selected_answer + canonical correct_answer sistemde VAR
{
  const m = anthropicMockCaptureSystem();
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "niye yanlış?" }], context: { module: "sinyal_lab", question_id: "q001", answered: true, selected_answer: "Usul hatalari karari gecersiz kildi." } }, { ip: "20.0.0.2" }), res);
  const baglam = getBaglamObj(m.capturedRequests[0]);
  kontrol("21) after answer → correct_answer VAR ve canonical (dogru_index=1)", baglam.correct_answer === "Usul hatalarina ragmen karar gecerlilligini korodu.");
  kontrol("21b) after answer → selected_answer VAR ve client'ın bildirdiği gibi", baglam.selected_answer === "Usul hatalari karari gecersiz kildi.");
  kontrol("21c) after answer → is_correct SERVER TARAFINDAN doğru hesaplanmış (yanlış şık seçildi → false)", baglam.is_correct === false);
  fetchMockTemizle();
}

// 22) FAKE client correct_answer/is_correct etkisiz — server KENDİ canonical'ını kullanır ve is_correct'i KENDİSİ hesaplar
{
  const m = anthropicMockCaptureSystem();
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], context: { module: "sinyal_lab", question_id: "q001", answered: true, selected_answer: "Usul hatalari karari gecersiz kildi.", correct_answer: "SAHTE UYDURMA CEVAP", is_correct: true } }, { ip: "20.0.0.3" }), res);
  const baglam = getBaglamObj(m.capturedRequests[0]);
  kontrol("22) client'ın uydurma correct_answer alanı HİÇ YANSIMIYOR — gerçek canonical cevap kullanılıyor", baglam.correct_answer === "Usul hatalarina ragmen karar gecerlilligini korodu." && baglam.correct_answer !== "SAHTE UYDURMA CEVAP");
  kontrol("22b) server KENDİ hesapladığı is_correct'i kullanıyor (yanlış şık seçilmiş → false), client'ın is_correct:true İDDİASI YOK SAYILDI", baglam.is_correct === false);
  fetchMockTemizle();
}

// 23) unknown question_id → context dropped, KLOD normal çalışır
{
  const m = anthropicMockCaptureSystem();
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], context: { module: "sinyal_lab", question_id: "olmayan-soru-id-999", answered: false } }, { ip: "20.0.0.4" }), res);
  const sistemMetni = JSON.stringify(m.capturedRequests[0].system);
  kontrol("23) bilinmeyen question_id → context SESSİZCE ATILIYOR (AKTİF SORU BAĞLAMI hiç yok), 200 dönüyor", !sistemMetni.includes("AKTİF SORU BAĞLAMI") && res._status === 200);
  fetchMockTemizle();
}

// 24) malformed context (çeşitli şekiller) → hepsi dropped, crash YOK
{
  const senaryolar = [
    { ad: "string context", context: "sinyal_lab" },
    { ad: "module eksik", context: { question_id: "q001" } },
    { ad: "module yanlış", context: { module: "sat", question_id: "q001" } },
    { ad: "question_id sayı", context: { module: "sinyal_lab", question_id: 123 } },
    { ad: "question_id eksik", context: { module: "sinyal_lab" } },
    { ad: "null context", context: null },
    { ad: "context hiç yok (undefined)", context: undefined },
  ];
  for (const s of senaryolar) {
    const m = anthropicMockCaptureSystem();
    fetchMockKur(m.impl);
    const res = sahteRes();
    let hata = false;
    try {
      await handler(sahteReq({ messages: [{ role: "user", content: "test" }], context: s.context }, { ip: "20.0.0.5" }), res);
    } catch (e) { hata = true; }
    const sistemMetni = JSON.stringify(m.capturedRequests[0]?.system || []);
    kontrol(`24) malformed context (${s.ad}) → crash YOK, context dropped, 200`, !hata && res._status === 200 && !sistemMetni.includes("AKTİF SORU BAĞLAMI"));
    fetchMockTemizle();
  }
}

// 25-26) AUTH ORTOGONAL: verified=false / verified=true → AYNI context davranışı
{
  const m1 = anthropicMockCaptureSystem();
  fetchMockKur(m1.impl);
  const res1 = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], context: { module: "sinyal_lab", question_id: "q001", answered: false } }, { ip: "20.0.0.6" }), res1); // auth header YOK
  fetchMockTemizle();

  const m2 = anthropicMockCaptureSystem();
  fetchMockKur(m2.impl);
  const res2 = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], context: { module: "sinyal_lab", question_id: "q001", answered: false } }, { ip: "20.0.0.7", authorization: "Bearer gecerli-token" }), res2); // auth header VAR + geçerli
  fetchMockTemizle();

  const baglam1 = getBaglamObj(m1.capturedRequests[0]);
  const baglam2 = getBaglamObj(m2.capturedRequests[0]);
  kontrol("25) auth verified=false → CURRENT context YİNE DE çalışıyor", baglam1 !== null);
  kontrol("26) auth verified=true → AYNI context (auth durumu context içeriğini DEĞİŞTİRMİYOR)", JSON.stringify(baglam1) === JSON.stringify(baglam2) && baglam2 !== null);
  kontrol("26b) auth verified=true response'u ayrıca auth.verified:true de gösteriyor (iki kontrat bağımsız ama ikisi de doğru)", res2._json.auth.verified === true);
}

// 27) PII yok — response/context içinde user_id/email hiç geçmiyor
{
  const m = anthropicMockCaptureSystem();
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], context: { module: "sinyal_lab", question_id: "q001", answered: false } }, { ip: "20.0.0.8", authorization: "Bearer gecerli-token" }), res);
  const tumIstek = JSON.stringify(m.capturedRequests[0]);
  kontrol("27) gönderilen Anthropic isteğinde user_id/email/currentUser hiç yok", !/user-1|email|currentUser/.test(tumIstek));
  fetchMockTemizle();
}

process.env.ANTHROPIC_API_KEY = orijinalKey;

// ============================================================
// STATİK — server tarafı ek güvenlik kontrolleri
// ============================================================
{
  const src = readFileSync(path.join(ROOT, "api", "klod.mjs"), "utf-8");
  const srcKodSatirlari = src.split("\n").filter((satir) => !satir.trim().startsWith("//")).join("\n");
  kontrol("28) klodSinyalLabBaglamiDogrula TAM OLARAK 1 kez tanımlı", (src.match(/function klodSinyalLabBaglamiDogrula\(context\)/g) || []).length === 1);
  kontrol("29) server context.correct_answer/context.is_correct alanlarını GERÇEK KODDA (yorum hariç) HİÇ OKUMUYOR", !/context\.correct_answer/.test(srcKodSatirlari) && !/context\.is_correct/.test(srcKodSatirlari));
  kontrol("30) server sadece answered===true ise correct_answer/selected_answer/is_correct ÜRETİYOR", /if \(dogrulanmis\.answered\) \{/.test(src));
  kontrol("31) context injection `system` override'ından BAĞIMSIZ (dnavChat'in kendi system'i varken de çalışır)", /const dogrulanmisBaglam = klodSinyalLabBaglamiDogrula\(req\.body\.context\);/.test(src) && !/if \(!system[\s\S]{0,50}klodSinyalLabBaglamiDogrula/.test(src));
  // NOT (Katman 5C, 2026-09-18): answer_history/avciOgrenciModeli artık
  // BİLİNÇLİ OLARAK bu dosyada var (bkz. tests/avci-klod-student-context.
  // test.mjs) — bu, 5B'nin (SADECE Sinyal Lab current-question context)
  // kapsam kilidiydi; Katman 4 diagnostic bağlantısı (asıl kalıcı yasak)
  // HÂLÂ burada kontrol ediliyor, sadece o zamanki answer_history/
  // avciOgrenciModeli/avciZayifAlan ifadeleri kaldırıldı.
  kontrol("32) DIAGNOSTIC (Katman 4) bu dosyada GERÇEK KODDA (yorum hariç) context ile HİÇ bağlanmadı", !/diagnostic_events/.test(src.split("\n").filter((satir) => !satir.trim().startsWith("//")).join("\n")));
  kontrol("33) mevcut KLOD_SYSTEM_PROMPT/SINYAL_ANALIZ_SYSTEM_PROMPT/rateLimit/klodDogrulanmisKullaniciAl DEĞİŞMEDİ", (src.match(/const KLOD_SYSTEM_PROMPT = /g) || []).length === 1 && (src.match(/const SINYAL_ANALIZ_SYSTEM_PROMPT = /g) || []).length === 1 && /rateLimit\(req, \{ key: 'klod', limit: 15, windowMs: 60_000 \}\)/.test(src) && (src.match(/async function klodDogrulanmisKullaniciAl\(authHeader\)/g) || []).length === 1);
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
