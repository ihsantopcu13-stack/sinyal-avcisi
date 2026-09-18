// KATMAN 5H — CANONICAL NEXT QUESTION MVP (mimari B2: deterministic client
// command bridge). GERÇEK ÇALIŞTIRMA (execution) + statik testler.
// index.html'den komut eşleştirici + mevcut slIdx/SL_HAVUZ/slRender/
// slSonraki/avciBoardTemizle/avciAktifSinyalLabBaglamiAl kaynağı BİREBİR
// çıkarılıp Node'un `vm` modülüyle GERÇEKTEN ÇALIŞTIRILIYOR — sahte
// yeniden-yazım DEĞİL (diğer avci-*.test.mjs dosyalarıyla AYNI desen,
// bkz. avci-klod-context.test.mjs / avci-klod-board-bridge.test.mjs).
//
// TEMEL SÖZLEŞME: state mutasyonu (yeni soru) SADECE öğrencinin AÇIK/
// deterministik komutuna bağlıdır — LLM/Anthropic'e HİÇ SORULMAZ, yeni
// bir soru seçme algoritması YAZILMADI (mevcut slSonraki() aynen reuse
// ediliyor), api/klod.mjs'e HİÇ dokunulmadı, yeni allowlist board
// action/state/schema/migration/RPC EKLENMEDİ.

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

// CRLF/LF normalize (Windows checkout vs Linux CI) — mevcut zorunlu desen.
const html = readFileSync(path.join(ROOT, "index.html"), "utf-8").replace(/\r\n/g, "\n");
const klodSrc = readFileSync(path.join(ROOT, "api", "klod.mjs"), "utf-8");

function slice(startMarker, endMarker, fromIdx) {
  const s = html.indexOf(startMarker, fromIdx || 0);
  const e = html.indexOf(endMarker, s);
  if (s === -1 || e === -1) throw new Error(`marker bulunamadı: "${startMarker}" -> "${endMarker}"`);
  return html.slice(s, e);
}

// ============================================================
// STATİK — komut matcher tam olarak 1 kez tanımlı, allowlist/tool/prompt
// bu katmanda HİÇ genişletilmedi
// ============================================================
{
  kontrol("S1) avciSonrakiSoruKomutuMu TAM OLARAK 1 kez tanımlı (duplicate YOK)", (html.match(/function avciSonrakiSoruKomutuMu\(metin\)\{/g) || []).length === 1);
  kontrol("S2) AVCI_SONRAKI_SORU_KOMUTLARI TAM OLARAK 5 sabit ifade içeriyor (fuzzy liste büyümedi)", (() => {
    const blok = slice("const AVCI_SONRAKI_SORU_KOMUTLARI=[", "];");
    return (blok.match(/'/g) || []).length === 10; // 5 ifade x 2 tırnak
  })());
  kontrol("S3) dnavChat() içindeki köprü SADECE _aktifSoruModulu==='sinyal_lab' şartıyla slSonraki() çağırıyor", /if\(avciSonrakiSoruKomutuMu\(val\)&&_aktifSoruModulu==='sinyal_lab'\)\{/.test(html));
  kontrol("S4) köprü mevcut slSonraki()'yi ÇAĞIRIYOR, YENİ bir seçim algoritması YAZILMADI", /if\(typeof slSonraki==='function'\)slSonraki\(\);/.test(html) && (html.match(/function slSonraki\(\)\{/g) || []).length === 1);
  kontrol("S5) köprü Anthropic/fetch çağrısı YAPMIYOR (bkz. blok içinde fetch/api\\/klod referansı yok)", (() => {
    const blok = slice("if(avciSonrakiSoruKomutuMu(val)&&_aktifSoruModulu==='sinyal_lab'){", "\n\n  // 20. TOKEN COUNTING");
    return !/fetch\(|\/api\/klod/.test(blok);
  })());
  kontrol("S6) köprü blok'u answer_history/student-model/diagnostic'e HİÇ yazmıyor", (() => {
    const blok = slice("if(avciSonrakiSoruKomutuMu(val)&&_aktifSoruModulu==='sinyal_lab'){", "\n\n  // 20. TOKEN COUNTING");
    return !/cevapKaydet|answer_history|diagnostic_events|avciOgrenciModeliHesapla|avciTeshisKaydet/.test(blok);
  })());
  kontrol("S7) eval/new Function 5H bloklarında hiç kullanılmıyor", (() => {
    const matcherBlok = slice("const AVCI_SONRAKI_SORU_KOMUTLARI=[", "async function dnavChat(){");
    const koprubBlok = slice("if(avciSonrakiSoruKomutuMu(val)&&_aktifSoruModulu==='sinyal_lab'){", "\n\n  // 20. TOKEN COUNTING");
    return !/\beval\(|new Function\(/.test(matcherBlok) && !/\beval\(|new Function\(/.test(koprubBlok);
  })());
  kontrol("S8) 22) — index.html genelinde bu katmanla eval/new Function EKLENMEDİ (mevcut dosyada zaten yoktu, hâlâ yok)", !/\beval\(/.test(html.replace(/\/\/.*$/gm, "")) && !/new Function\(/.test(html));
  kontrol("23) Teaching Example bu katmanda EKLENMEDİ (dnavChat sistem promptunda yeni bir 'örnek üretici' bölüm başlığı yok)", !/ÖRNEK ÜRETİCİ KURALI|TEACHING EXAMPLE KURALI/i.test(html));
  kontrol("24) Lesson Summary bu katmanda EKLENMEDİ (dnavChat sistem promptunda yeni bir 'ders özeti' bölüm başlığı yok)", !/DERS ÖZETİ KURALI|LESSON SUMMARY KURALI/i.test(html));
  kontrol("26) 5G MİNİ KONTROL bölümü KORUNMUŞ (satır/başlık aynen duruyor)", /MINI KONTROL \(MINI SORU\) KURALI \(ZORUNLU\):/.test(html));
  kontrol("25) schema/migration/RPC bu katmanda EKLENMEDİ (köprü/matcher bloklarında create table/alter table/\\.rpc\\( yok)", (() => {
    const matcherBlok = slice("const AVCI_SONRAKI_SORU_KOMUTLARI=[", "async function dnavChat(){");
    const koprubBlok = slice("if(avciSonrakiSoruKomutuMu(val)&&_aktifSoruModulu==='sinyal_lab'){", "\n\n  // 20. TOKEN COUNTING");
    return !/create table|alter table|\.rpc\(/i.test(matcherBlok + koprubBlok);
  })());
}

// ============================================================
// STATİK — api/klod.mjs (server) BU KATMANDA HİÇ DEĞİŞMEDİ
// ============================================================
{
  const klodKodSatirlari = klodSrc.split("\n").filter((s) => !s.trim().startsWith("//")).join("\n");
  kontrol("18/19) api/klod.mjs — 'NEXT_QUESTION'/'slSonraki'/'KATMAN 5H' hiç geçmiyor (server'a dokunulmadı)", !/NEXT_QUESTION/.test(klodSrc) && !/slSonraki/.test(klodSrc) && !/KATMAN 5H/.test(klodSrc));
  kontrol("18) BOARD_ACTION_ALLOWLIST HÂLÂ tam olarak 8 action (yeni action eklenmedi)", (klodSrc.match(/'HIGHLIGHT_VERB', 'SHOW_SVO', 'HIGHLIGHT_SIGNAL', 'SHOW_LEFT_RIGHT',/) || []).length === 1 && (klodSrc.match(/'SHOW_HINT', 'SHOW_AVCI_REFLEX', 'CLEAR_BOARD', 'ELIMINATE_OPTION',/) || []).length === 1);
  kontrol("klodBoardActionlariDogrula TAM OLARAK 1 kez, imzası DEĞİŞMEDİ", (klodSrc.match(/function klodBoardActionlariDogrula\(rawActions, dogrulanmisBaglam, canonical\)/g) || []).length === 1);
  kontrol("service_role GERÇEK KODDA (yorum hariç) HİÇ YOK (5H bunu değiştirmedi)", !/SERVICE_ROLE/i.test(klodKodSatirlari) && !/\bserviceRoleKey\b/.test(klodKodSatirlari));
}

// ============================================================
// GERÇEK ÇALIŞTIRMA — komut eşleştirici SAF fonksiyon testleri
// ============================================================
const MATCHER_SRC = slice("const AVCI_SONRAKI_SORU_KOMUTLARI=[", "async function dnavChat(){");

function matcherSandbox() {
  const sandbox = { console: { warn: () => {}, log: () => {}, error: () => {} } };
  const context = vm.createContext(sandbox);
  vm.runInContext(MATCHER_SRC, context, { filename: "index.html (5H matcher)" });
  return context;
}
const m = matcherSandbox();

kontrol('1) "Sonraki soruya geç." tetikler', m.avciSonrakiSoruKomutuMu("Sonraki soruya geç.") === true);
kontrol('2) "Sonraki soru." tetikler', m.avciSonrakiSoruKomutuMu("Sonraki soru.") === true);
kontrol('3) "Başka soru sor." tetikler', m.avciSonrakiSoruKomutuMu("Başka soru sor.") === true);
kontrol('4) "Devam, yeni soru." tetikler', m.avciSonrakiSoruKomutuMu("Devam, yeni soru.") === true);
kontrol('5) "Bir sonraki soruyu aç." tetikler', m.avciSonrakiSoruKomutuMu("Bir sonraki soruyu aç.") === true);

kontrol("6) büyük/küçük harf normalization güvenli (tr-TR: İ/I/ı/i dahil)", m.avciSonrakiSoruKomutuMu("SONRAKİ SORUYA GEÇ") === true && m.avciSonrakiSoruKomutuMu("sONRAKi soru") === true && m.avciSonrakiSoruKomutuMu("BAŞKA SORU SOR") === true);
kontrol("7) basit terminal punctuation güvenli (./!/?/… kırpılıyor, iç boşluk/virgül bozulmuyor)", m.avciSonrakiSoruKomutuMu("Sonraki soru!") === true && m.avciSonrakiSoruKomutuMu("Sonraki soru?") === true && m.avciSonrakiSoruKomutuMu("Devam, yeni soru") === true && m.avciSonrakiSoruKomutuMu("Devam, yeni soru…") === true);

kontrol("8) alakasız mesaj tetiklemez", m.avciSonrakiSoruKomutuMu("Bu cümlede fiil hangisi?") === false && m.avciSonrakiSoruKomutuMu("Bugün hava çok güzel") === false && m.avciSonrakiSoruKomutuMu("") === false);
kontrol("9) substring/fuzzy yanlış pozitif tetiklemez (exact-match, includes/startsWith DEĞİL)", m.avciSonrakiSoruKomutuMu("sonraki soruya geçmeden önce bir şey sorabilir miyim") === false && m.avciSonrakiSoruKomutuMu("acaba sonraki soru ne olacak") === false && m.avciSonrakiSoruKomutuMu("başka soru sormak istemiyorum") === false);
kontrol("9b) non-string girdi crash üretmiyor", m.avciSonrakiSoruKomutuMu(null) === false && m.avciSonrakiSoruKomutuMu(undefined) === false && m.avciSonrakiSoruKomutuMu(42) === false);

// ============================================================
// GERÇEK ÇALIŞTIRMA — dnavChat KÖPRÜSÜ + mevcut slIdx/SL_HAVUZ/slRender/
// slSonraki/avciBoardTemizle/avciAktifSinyalLabBaglamiAl (BİREBİR çıkarım)
// ============================================================
const TRACKER_DECL = "let _aktifSoruModulu=null;\nlet dnavHistory=[];\n";
const STATE_DECL = slice("let slIdx=0,slAnswered=false,slCurrentSoru=null,_slRtBaslangic=null;", "function slRender(){");
const SLRENDER_FN = slice("function slRender(){", "// S+V+O AKADEMİ");
const SLSONRAKI_FN = slice("function slSonraki(){", "\n// FAZ 2 — attribution yakalama");
// BAGLAM_VE_BOARD_BLOK: 5B assembler + 5E board dispatcher (temizle dahil)
// + 5H matcher — HEPSİ TEK PARÇA, çünkü dosyada bu sırayla ARDIŞIK
// duruyorlar (sahte yeniden-yazım YOK, gerçek kaynağın kendisi).
const BAGLAM_VE_BOARD_BLOK = slice("function avciAktifSinyalLabBaglamiAl(){", "async function dnavChat(){");
const BRIDGE_BRANCH = slice("if(avciSonrakiSoruKomutuMu(val)&&_aktifSoruModulu==='sinyal_lab'){", "\n\n  // 20. TOKEN COUNTING");

const TEST_HARNESS = `
function __t_setAktifModul(v){_aktifSoruModulu=v;}
function __t_getSlIdx(){return slIdx;}
function __t_getSlState(){return {slIdx:slIdx,soruId:slCurrentSoru&&slCurrentSoru.id,answered:slAnswered,selText:_slSelectedAnswerText,selCorrect:_slSelectedAnswerCorrect};}
function __t_setDirtyAnswered(){slAnswered=true;_slSelectedAnswerText='X';_slSelectedAnswerCorrect=true;}
function __t_getDnavHistory(){return dnavHistory.slice();}
function __t_resetDnavHistory(){dnavHistory.length=0;}
function __t_pushBoardSentinel(){_avciBoardTemizlenecekler.push({classList:{contains:()=>false},tagName:'DIV',parentNode:null,remove(){}});}
function __t_getBoardTemizlenecekler(){return _avciBoardTemizlenecekler.slice();}
function __komutBridgeProbe(val, body, inp){
${BRIDGE_BRANCH}
}
`;

const FULL_SRC = TRACKER_DECL + "\n" + STATE_DECL + "\n" + SLRENDER_FN + "\n" + SLSONRAKI_FN + "\n" + BAGLAM_VE_BOARD_BLOK + "\n" + TEST_HARNESS;

const Q1 = { id: "q001", sinyal: "despite", eye: "Genel", sent: "The court ruled, despite the issues, it was valid.", q: "Soru 1?", opts: ["a", "b", "c", "d"], ans: 1, fb: "fb1" };
const Q2 = { id: "q002", sinyal: "however", eye: "Genel", sent: "Researchers concluded results were significant.", q: "Soru 2?", opts: ["a", "b", "c", "d"], ans: 0, fb: "fb2" };
const Q3 = { id: "q003", sinyal: "although", eye: "Genel", sent: "Although tired, she finished the race.", q: "Soru 3?", opts: ["a", "b", "c", "d"], ans: 2, fb: "fb3" };

function fakeBody() {
  return { children: [], scrollTop: 0, appendChild(el) { this.children.push(el); } };
}
function fakeInp() {
  return { disabled: true, _focused: false, focus() { this._focused = true; } };
}

function sandboxKur() {
  const fetchCagrilari = [];
  const sandbox = {
    console: { warn: () => {}, log: () => {}, error: () => {} },
    document: { getElementById: () => null, createElement: () => ({}) },
    window: {},
    curAlan: undefined,
    setTimeout: () => {},
    rtBaslat: () => 1000,
    avciTeshisPaneliTemizle: () => {},
    SL_HAVUZ: [Q1, Q2, Q3],
    fetch: async (...args) => { fetchCagrilari.push(args); throw new Error("fetch ÇAĞRILMAMALIYDI — state mutasyonu LLM/API'ye bağlı olmamalı"); },
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(FULL_SRC, context, { filename: "index.html (5H next-question bridge)" });
  return { context, fetchCagrilari };
}

// 10) Sinyal Lab AKTİFKEN komut eşleşirse slSonraki() gerçekten tetiklenir
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  t.context.slRender(); // ilk soru (q001) render edilsin
  const once = t.context.__t_getSlState();
  const body = fakeBody();
  const inp = fakeInp();
  t.context.__komutBridgeProbe("Sonraki soruya geç.", body, inp);
  const after = t.context.__t_getSlState();
  kontrol("10) sinyal_lab aktifken komut eşleşince slSonraki() tetiklenir (soru DEĞİŞTİ)", after.soruId !== once.soruId);
  kontrol("12) slIdx mevcut mekanizmayla (slSonraki İÇİNDEKİ %SL_HAVUZ.length) ilerledi", t.context.__t_getSlIdx() === 1);
  kontrol("13) yeni soru canonical SL_HAVUZ'dan geldi (uydurma/üretilmiş değil)", after.soruId === Q2.id);
  kontrol("14) question_id DEĞİŞTİ (q001 → q002)", once.soruId === Q1.id && after.soruId === Q2.id);
  kontrol("15) yeni active context mevcut mekanizmayla okunabiliyor (avciAktifSinyalLabBaglamiAl)", (() => {
    const baglam = t.context.avciAktifSinyalLabBaglamiAl();
    return baglam && baglam.question_id === Q2.id && baglam.answered === false;
  })());
  kontrol("21) state mutasyonu fetch/Anthropic çağrısına BAĞLI DEĞİL (fetch hiç tetiklenmedi)", t.fetchCagrilari.length === 0);
  kontrol("UI confirmation) kısa deterministik onay mesajı chat body'sine eklendi, Anthropic ÇAĞRILMADAN", body.children.length === 1 && body.children[0].textContent === "Yeni soruya geçtik.");
  kontrol("dnavHistory) kullanıcı+onay mesajı sırasıyla geçmişe eklendi", (() => {
    const h = t.context.__t_getDnavHistory();
    return h.length === 2 && h[0].role === "user" && h[0].content === "Sonraki soruya geç." && h[1].role === "assistant";
  })());
  kontrol("inp) input tekrar aktif edildi ve focus çağrıldı (UX kesintisiz)", inp.disabled === false && inp._focused === true);
}

// 16) slAnswered/selected-answer reset korunur (slRender'ın mevcut davranışı)
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  t.context.slRender();
  t.context.__t_setDirtyAnswered(); // önceki soruyu cevaplamış gibi kirlet
  t.context.__komutBridgeProbe("Sonraki soru.", fakeBody(), fakeInp());
  const s = t.context.__t_getSlState();
  kontrol("16) slAnswered/_slSelectedAnswerText/_slSelectedAnswerCorrect YENİ soruda RESET edildi (stale sızıntı yok)", s.answered === false && s.selText === null && s.selCorrect === null);
}

// 17) board reset korunur (mevcut avciBoardTemizle, slRender üzerinden)
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  t.context.slRender();
  t.context.__t_pushBoardSentinel();
  kontrol("17-ön) board temizlenecekler listesi geçiş ÖNCESİ dolu (test kurulumu doğru)", t.context.__t_getBoardTemizlenecekler().length === 1);
  t.context.__komutBridgeProbe("Sonraki soruya geç.", fakeBody(), fakeInp());
  kontrol("17) board reset korunur — geçiş SONRASI temizlenecekler listesi BOŞ (avciBoardTemizle slRender üzerinden çalıştı)", t.context.__t_getBoardTemizlenecekler().length === 0);
}

// 11) Sinyal Lab AKTİF DEĞİLKEN aynı komut slSonraki()'yi TETİKLEMEZ (fail-open)
{
  const t = sandboxKur();
  t.context.__t_setAktifModul(null); // başka modül / hiçbiri
  t.context.slRender();
  const once = t.context.__t_getSlState();
  const body = fakeBody();
  const inp = fakeInp();
  t.context.__komutBridgeProbe("Sonraki soruya geç.", body, inp);
  const after = t.context.__t_getSlState();
  kontrol("11) Sinyal Lab aktif DEĞİLKEN komut eşleşse bile slSonraki() ÇAĞRILMAZ (soru/idx DEĞİŞMEDİ)", after.soruId === once.soruId && t.context.__t_getSlIdx() === 0);
  kontrol("11b) modül aktif değilken köprü hiçbir UI/history yan etkisi üretmiyor (normal chat akışına düşer)", body.children.length === 0 && t.context.__t_getDnavHistory().length === 0);
  kontrol("21b) fetch yine tetiklenmedi (bu testte zaten hiç API çağrısı simüle edilmedi)", t.fetchCagrilari.length === 0);
}

// 9c) eşleşmeyen mesajda köprü hiçbir şey yapmaz (sinyal_lab aktifken bile)
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  t.context.slRender();
  const once = t.context.__t_getSlState();
  t.context.__komutBridgeProbe("Bu cümlede fiil hangisi?", fakeBody(), fakeInp());
  const after = t.context.__t_getSlState();
  kontrol("9c) alakasız mesaj sinyal_lab aktifken bile slSonraki()'yi TETİKLEMEZ", after.soruId === once.soruId);
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
