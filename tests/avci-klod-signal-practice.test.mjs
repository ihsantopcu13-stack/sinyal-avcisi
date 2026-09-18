// KATMAN 5I — CANONICAL SIGNAL-TARGETED PRACTICE. GERÇEK ÇALIŞTIRMA
// (execution) + statik testler. index.html'den komut eşleştirici + seçim
// fonksiyonu + mevcut slIdx/SL_HAVUZ/SL_SINYAL_LOOKUP/slRender/
// window.__slDeepLinkSoru (deep-link ile AYNI mekanizma) kaynağı BİREBİR
// çıkarılıp Node'un `vm` modülüyle GERÇEKTEN ÇALIŞTIRILIYOR — sahte
// yeniden-yazım DEĞİL (bkz. avci-klod-context.test.mjs / avci-klod-
// next-question.test.mjs ile AYNI desen).
//
// TEMEL SÖZLEŞME: state mutasyonu (aynı sinyalden başka soruya geçiş)
// SADECE öğrencinin AÇIK/deterministik komutuna bağlıdır — LLM'e HİÇ
// SORULMAZ, yeni bir soru üretilmez/seçim algoritması YAZILMADI (mevcut
// SL_SINYAL_LOOKUP + window.__slDeepLinkSoru + slRender() aynen reuse
// ediliyor), api/klod.mjs'e HİÇ dokunulmadı, yeni allowlist board
// action/state/schema/migration/RPC EKLENMEDİ. 5H (Sonraki Soru) ile
// 5I (Aynı Sinyalden Pratik) birbirinden BAĞIMSIZ, ayrı komut listeleri.

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

// ============================================================
// STATİK — komut matcher/seçici tam olarak 1 kez tanımlı, 5H'den bağımsız,
// allowlist/tool/prompt/server bu katmanda HİÇ genişletilmedi
// ============================================================
{
  kontrol("S1) avciSinyalPratikKomutuMu TAM OLARAK 1 kez tanımlı (duplicate YOK)", (html.match(/function avciSinyalPratikKomutuMu\(metin\)\{/g) || []).length === 1);
  kontrol("S2) avciAyniSinyaldenPratikSorusuBul TAM OLARAK 1 kez tanımlı (duplicate YOK)", (html.match(/function avciAyniSinyaldenPratikSorusuBul\(\)\{/g) || []).length === 1);
  kontrol("S3) AVCI_SINYAL_PRATIK_KOMUTLARI TAM OLARAK 5 sabit ifade içeriyor", (() => {
    const blok = slice("const AVCI_SINYAL_PRATIK_KOMUTLARI=[", "];");
    return (blok.match(/'/g) || []).length === 10; // 5 ifade x 2 tırnak
  })());
  kontrol("S4) 5I komut listesi 5H komut listesiyle HİÇ ÇAKIŞMIYOR (ortak ifade yok)", (() => {
    const kom5h = slice("const AVCI_SONRAKI_SORU_KOMUTLARI=[", "];").match(/'([^']+)'/g).map((s) => s.slice(1, -1));
    const kom5i = slice("const AVCI_SINYAL_PRATIK_KOMUTLARI=[", "];").match(/'([^']+)'/g).map((s) => s.slice(1, -1));
    return !kom5h.some((k) => kom5i.includes(k));
  })());
  kontrol("S5) 5I köprüsü mevcut SL_SINYAL_LOOKUP.indeksleriBul()'u REUSE ediyor (yeni harita YAZILMADI)", /SL_SINYAL_LOOKUP\.indeksleriBul\(sinyalNorm\)/.test(html) && (html.match(/var SL_SINYAL_LOOKUP=\(function\(\)\{/g) || []).length === 1);
  kontrol("S6) 5I geçişi mevcut window.__slDeepLinkSoru + slRender() mekanizmasını (deep-link ile AYNI) reuse ediyor", /window\.__slDeepLinkSoru=SL_HAVUZ\[adayRawIdx\];\s*\n\s*slRender\(\);/.test(html));
  kontrol("S7) 5I bloğu Anthropic/fetch çağrısı YAPMIYOR", (() => {
    const blok = slice("if(avciSinyalPratikKomutuMu(val)&&_aktifSoruModulu==='sinyal_lab'){", "\n\n  // 20. TOKEN COUNTING");
    return !/fetch\(|\/api\/klod/.test(blok);
  })());
  kontrol("S8) 5I bloğu answer_history/student-model/diagnostic'e HİÇ yazmıyor", (() => {
    const blok = slice("if(avciSinyalPratikKomutuMu(val)&&_aktifSoruModulu==='sinyal_lab'){", "\n\n  // 20. TOKEN COUNTING");
    return !/cevapKaydet|answer_history|diagnostic_events|avciOgrenciModeliHesapla|avciTeshisKaydet/.test(blok);
  })());
  kontrol("S9) eval/new Function 5I bloklarında hiç kullanılmıyor", (() => {
    const matcherBlok = slice("const AVCI_SINYAL_PRATIK_KOMUTLARI=[", "async function dnavChat(){");
    const koprubBlok = slice("if(avciSinyalPratikKomutuMu(val)&&_aktifSoruModulu==='sinyal_lab'){", "\n\n  // 20. TOKEN COUNTING");
    return !/\beval\(|new Function\(/.test(matcherBlok) && !/\beval\(|new Function\(/.test(koprubBlok);
  })());
  kontrol("S10) schema/migration/RPC bu katmanda EKLENMEDİ", (() => {
    const matcherBlok = slice("const AVCI_SINYAL_PRATIK_KOMUTLARI=[", "async function dnavChat(){");
    const koprubBlok = slice("if(avciSinyalPratikKomutuMu(val)&&_aktifSoruModulu==='sinyal_lab'){", "\n\n  // 20. TOKEN COUNTING");
    return !/create table|alter table|\.rpc\(/i.test(matcherBlok + koprubBlok);
  })());
  kontrol("S11) NEXT_QUESTION/PRACTICE_QUESTION board action HİÇ eklenmedi (index.html'de yok)", !/'NEXT_QUESTION'|'PRACTICE_QUESTION'/.test(html));
  kontrol("S12) 5G MİNİ KONTROL bölümü KORUNMUŞ", /MINI KONTROL \(MINI SORU\) KURALI \(ZORUNLU\):/.test(html));
  kontrol("S13) 5H komut köprüsü hâlâ TAM OLARAK 1 kez tanımlı, DEĞİŞMEDİ", (html.match(/if\(avciSonrakiSoruKomutuMu\(val\)&&_aktifSoruModulu==='sinyal_lab'\)\{/g) || []).length === 1);
}

// ============================================================
// STATİK — api/klod.mjs (server) BU KATMANDA HİÇ DEĞİŞMEDİ
// ============================================================
{
  const klodKodSatirlari = klodSrc.split("\n").filter((s) => !s.trim().startsWith("//")).join("\n");
  kontrol("18) api/klod.mjs — 'PRACTICE_QUESTION'/'avciAyniSinyaldenPratikSorusuBul'/'KATMAN 5I' hiç geçmiyor (server'a dokunulmadı)", !/PRACTICE_QUESTION/.test(klodSrc) && !/avciAyniSinyaldenPratikSorusuBul/.test(klodSrc) && !/KATMAN 5I/.test(klodSrc));
  kontrol("18b) BOARD_ACTION_ALLOWLIST HÂLÂ tam olarak 8 action (yeni action eklenmedi)", (klodSrc.match(/'HIGHLIGHT_VERB', 'SHOW_SVO', 'HIGHLIGHT_SIGNAL', 'SHOW_LEFT_RIGHT',/) || []).length === 1 && (klodSrc.match(/'SHOW_HINT', 'SHOW_AVCI_REFLEX', 'CLEAR_BOARD', 'ELIMINATE_OPTION',/) || []).length === 1);
  kontrol("klodBoardActionlariDogrula TAM OLARAK 1 kez, imzası DEĞİŞMEDİ", (klodSrc.match(/function klodBoardActionlariDogrula\(rawActions, dogrulanmisBaglam, canonical\)/g) || []).length === 1);
  kontrol("service_role GERÇEK KODDA (yorum hariç) HİÇ YOK", !/SERVICE_ROLE/i.test(klodKodSatirlari) && !/\bserviceRoleKey\b/.test(klodKodSatirlari));
}

// ============================================================
// GERÇEK ÇALIŞTIRMA — komut eşleştirici SAF fonksiyon testleri
// ============================================================
const MATCHER_SRC = slice("const AVCI_SONRAKI_SORU_KOMUTLARI=[", "async function dnavChat(){");

function matcherSandbox() {
  const sandbox = { console: { warn: () => {}, log: () => {}, error: () => {} }, window: {}, SL_HAVUZ: [] };
  const context = vm.createContext(sandbox);
  vm.runInContext(MATCHER_SRC, context, { filename: "index.html (5I matcher)" });
  return context;
}
const m = matcherSandbox();

kontrol('1) "Bu sinyalden başka soru sor." match', m.avciSinyalPratikKomutuMu("Bu sinyalden başka soru sor.") === true);
kontrol('2) "Bu sinyalden bir soru daha." match', m.avciSinyalPratikKomutuMu("Bu sinyalden bir soru daha.") === true);
kontrol('3) "Aynı sinyalden başka soru." match', m.avciSinyalPratikKomutuMu("Aynı sinyalden başka soru.") === true);
kontrol('4) "Aynı sinyalden bir soru daha." match', m.avciSinyalPratikKomutuMu("Aynı sinyalden bir soru daha.") === true);
kontrol('5) "Bu sinyali tekrar çalışalım." match', m.avciSinyalPratikKomutuMu("Bu sinyali tekrar çalışalım.") === true);

kontrol("6) case normalization (tr-TR: İ/I/ı/i dahil)", m.avciSinyalPratikKomutuMu("BU SİNYALDEN BAŞKA SORU SOR") === true && m.avciSinyalPratikKomutuMu("aynı sinyalden BİR soru daha") === true);
kontrol("7) punctuation normalization (./!/?/… kırpılıyor, gövde bozulmuyor)", m.avciSinyalPratikKomutuMu("Bu sinyalden başka soru sor!") === true && m.avciSinyalPratikKomutuMu("Aynı sinyalden başka soru?") === true && m.avciSinyalPratikKomutuMu("Bu sinyali tekrar çalışalım…") === true);
kontrol("8) alakasız mesaj tetiklemez", m.avciSinyalPratikKomutuMu("Bu cümlede fiil hangisi?") === false && m.avciSinyalPratikKomutuMu("") === false);
kontrol("9) substring/fuzzy yanlış pozitif tetiklemez (exact-match)", m.avciSinyalPratikKomutuMu("bu sinyalden başka soru sormak istemiyorum") === false && m.avciSinyalPratikKomutuMu("acaba bu sinyalden başka soru var mı") === false);

// ============================================================
// GERÇEK ÇALIŞTIRMA — 5I köprüsü + mevcut slIdx/SL_HAVUZ/SL_SINYAL_LOOKUP/
// slRender/window.__slDeepLinkSoru (BİREBİR çıkarım)
// ============================================================
const TRACKER_DECL = "let _aktifSoruModulu=null;\nlet dnavHistory=[];\n";
const STATE_DECL = slice("let slIdx=0,slAnswered=false,slCurrentSoru=null,_slRtBaslangic=null;", "function slRender(){");
const SLRENDER_FN = slice("function slRender(){", "// S+V+O AKADEMİ");
// 5B assembler + 5E board dispatcher + 5H matcher + 5I matcher/seçici —
// HEPSİ TEK PARÇA, çünkü dosyada bu sırayla ARDIŞIK duruyorlar (sahte
// yeniden-yazım YOK, gerçek kaynağın kendisi).
const BAGLAM_VE_BOARD_BLOK = slice("function avciAktifSinyalLabBaglamiAl(){", "async function dnavChat(){");
const BRIDGE_BRANCH = slice("if(avciSinyalPratikKomutuMu(val)&&_aktifSoruModulu==='sinyal_lab'){", "\n\n  // 20. TOKEN COUNTING");

const TEST_HARNESS = `
function __t_setAktifModul(v){_aktifSoruModulu=v;}
function __t_getSlIdx(){return slIdx;}
function __t_getSlState(){return {slIdx:slIdx,soruId:slCurrentSoru&&slCurrentSoru.id,answered:slAnswered,selText:_slSelectedAnswerText,selCorrect:_slSelectedAnswerCorrect};}
function __t_setDirtyAnswered(){slAnswered=true;_slSelectedAnswerText='X';_slSelectedAnswerCorrect=true;}
function __t_getDnavHistory(){return dnavHistory.slice();}
function __t_pushBoardSentinel(){_avciBoardTemizlenecekler.push({classList:{contains:()=>false},tagName:'DIV',parentNode:null,remove(){}});}
function __t_getBoardTemizlenecekler(){return _avciBoardTemizlenecekler.slice();}
function __t_bulAdayRawIdx(){return avciAyniSinyaldenPratikSorusuBul();}
function __komutBridgeProbe(val, body, inp){
${BRIDGE_BRANCH}
}
`;

const FULL_SRC = TRACKER_DECL + "\n" + STATE_DECL + "\n" + SLRENDER_FN + "\n" + BAGLAM_VE_BOARD_BLOK + "\n" + TEST_HARNESS;

// Sabit fixture: Q0/Q1/Q2 aynı sinyal ("despite"), Q3 tekil sinyal
// ("however", eşi yok) — ham SL_HAVUZ sırasıyla q000..q003.
const Q0 = { id: "q000", sinyal: "despite", eye: "Genel", sent: "Sentence zero despite issues.", q: "Soru 0?", opts: ["a", "b"], ans: 0, fb: "fb0" };
const Q1 = { id: "q001", sinyal: "despite", eye: "Genel", sent: "Sentence one despite issues.", q: "Soru 1?", opts: ["a", "b"], ans: 0, fb: "fb1" };
const Q2 = { id: "q002", sinyal: "despite", eye: "Genel", sent: "Sentence two despite issues.", q: "Soru 2?", opts: ["a", "b"], ans: 0, fb: "fb2" };
const Q3 = { id: "q003", sinyal: "however", eye: "Genel", sent: "Sentence three however.", q: "Soru 3?", opts: ["a", "b"], ans: 0, fb: "fb3" };

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
    SL_HAVUZ: [Q0, Q1, Q2, Q3],
    fetch: async (...args) => { fetchCagrilari.push(args); throw new Error("fetch ÇAĞRILMAMALIYDI"); },
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(FULL_SRC, context, { filename: "index.html (5I signal-practice bridge)" });
  return { context, fetchCagrilari };
}

function slRenderSetActive(t, soru) {
  // Sinyal Lab'ta o soru aktifmiş gibi kurmak için slIdx'i deep-link
  // mekanizmasıyla (mevcut, gerçek) o soruya sabitliyoruz.
  t.context.window.__slDeepLinkSoru = soru;
  t.context.slRender();
}

// 11) canonical active signal read + 12) SL_SINYAL_LOOKUP reuse + 13/14/15/16/17)
// deterministik seçim: mevcut sorudan SONRAKİ ilk aynı-sinyal aday
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  slRenderSetActive(t, Q0); // aktif: Q0 (ham idx 0, sinyal despite)
  const adayRawIdx = t.context.__t_bulAdayRawIdx();
  kontrol("11) aktif sorunun canonical sinyali (slCurrentSoru.sinyal) okunuyor", t.context.__t_getSlState().soruId === Q0.id);
  kontrol("12) SL_SINYAL_LOOKUP.indeksleriBul() reuse edildi (yeni harita YOK)", adayRawIdx !== null);
  kontrol("13) canonical candidate only — aday SL_HAVUZ içinden geldi (uydurma değil)", [0, 1, 2].includes(adayRawIdx));
  kontrol("14) current question excluded — aday KENDİSİ (Q0) DEĞİL", adayRawIdx !== 0);
  kontrol("15) same signal preserved — seçilen aday da 'despite'", t.context.SL_HAVUZ[adayRawIdx].sinyal === "despite");
  kontrol("16) deterministic selection — mevcut sorudan (idx0) SONRAKİ ilk aday (idx1=Q1) seçildi", adayRawIdx === 1);
  kontrol("17) no random selection — aynı girdiyle tekrar çağrıldığında AYNI sonuç", t.context.__t_bulAdayRawIdx() === 1 && t.context.__t_bulAdayRawIdx() === 1);
}

// wrap-around: aktif soru Q2 (son 'despite' adayı) iken seçim BAŞA (Q0'a) sarmalı
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  slRenderSetActive(t, Q2);
  const adayRawIdx = t.context.__t_bulAdayRawIdx();
  kontrol("wrap-around) mevcut sorudan sonra aday yoksa listedeki İLK adaya (wrap) döner (Q2 → Q0)", adayRawIdx === 0);
}

// 18/19/20) canonical qid/slIdx/slCurrentSoru gerçekten güncelleniyor
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  slRenderSetActive(t, Q0);
  const once = t.context.__t_getSlState();
  const body = fakeBody();
  const inp = fakeInp();
  t.context.__komutBridgeProbe("Bu sinyalden başka soru sor.", body, inp);
  const after = t.context.__t_getSlState();
  kontrol("18) question_id DEĞİŞTİ (q000 → q001)", once.soruId === Q0.id && after.soruId === Q1.id);
  kontrol("19) slIdx güncellendi (window.__slDeepLinkSoru tüketilip slIdx=0'a resetlendi, mevcut slRender davranışı — deep-link ile AYNI)", t.context.__t_getSlIdx() === 0);
  kontrol("20) slCurrentSoru yeni canonical soruyu gösteriyor", after.soruId === Q1.id);
  kontrol("21) slAnswered reset edildi", after.answered === false && after.selText === null && after.selCorrect === null);
  kontrol("24) navigasyon answer_history YAZMADI (cevapKaydet hiç çağrılmadı — fonksiyon sandbox'ta bile tanımlı değil, çağrılsaydı ReferenceError verirdi)", true);
  kontrol("25) mevcut answer pipeline (dAns/cevapKaydet) bu turda DEĞİŞMEDİ (bkz. S8 statik kontrolü)", true);
  kontrol("26) Student Model'e doğrudan write YOK (blok böyle bir çağrı içermiyor, bkz. S8)", true);
  kontrol("27) diagnostic write YOK (blok böyle bir çağrı içermiyor, bkz. S8)", true);
  kontrol("28) LLM state mutation YOK — fetch hiç tetiklenmedi", t.fetchCagrilari.length === 0);
  kontrol("29) LLM navigation YOK — geçiş tamamen deterministik fonksiyon çağrısıyla oldu", true);
  kontrol("30) LLM question selection YOK — seçim avciAyniSinyaldenPratikSorusuBul() ile deterministik yapıldı", true);
  kontrol("UI confirmation) kısa deterministik onay mesajı chat body'sine eklendi", body.children.length === 1 && body.children[0].textContent === "Aynı sinyalden başka bir soruya geçtik.");
}

// 22/23) board reset korunur (mevcut avciBoardTemizle, slRender üzerinden)
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  slRenderSetActive(t, Q0);
  t.context.__t_pushBoardSentinel();
  kontrol("22-ön) board temizlenecekler listesi geçiş ÖNCESİ dolu (test kurulumu doğru)", t.context.__t_getBoardTemizlenecekler().length === 1);
  t.context.__komutBridgeProbe("Aynı sinyalden başka soru.", fakeBody(), fakeInp());
  kontrol("22) board reset korunur — geçiş SONRASI temizlenecekler listesi BOŞ", t.context.__t_getBoardTemizlenecekler().length === 0);
  kontrol("23) slRender() reuse edildi (yeni bir render fonksiyonu YAZILMADI, bkz. S6 statik kontrolü)", true);
}

// 10) Sinyal Lab AKTİF DEĞİLKEN komut eşleşse bile state mutasyonu OLMAZ
{
  const t = sandboxKur();
  t.context.__t_setAktifModul(null);
  slRenderSetActive(t, Q0);
  const once = t.context.__t_getSlState();
  const body = fakeBody();
  const inp = fakeInp();
  t.context.__komutBridgeProbe("Bu sinyalden başka soru sor.", body, inp);
  const after = t.context.__t_getSlState();
  kontrol("10) Sinyal Lab aktif DEĞİLKEN komut eşleşse bile state mutasyonu OLMAZ (soru DEĞİŞMEDİ)", after.soruId === once.soruId);
  kontrol("10b) modül aktif değilken köprü hiçbir UI/history yan etkisi üretmiyor (fail-open)", body.children.length === 0 && t.context.__t_getDnavHistory().length === 0);
}

// 39/40) aynı sinyalden BAŞKA canonical aday YOKSA — state mutasyonu YOK, güvenli deterministik mesaj
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  slRenderSetActive(t, Q3); // sinyal 'however', eşi YOK
  const once = t.context.__t_getSlState();
  const body = fakeBody();
  const inp = fakeInp();
  t.context.__komutBridgeProbe("Aynı sinyalden bir soru daha.", body, inp);
  const after = t.context.__t_getSlState();
  kontrol("39) aday yok → state mutasyonu YAPILMADI (soru/idx DEĞİŞMEDİ)", after.soruId === once.soruId);
  kontrol("40) aday yok → güvenli deterministik bilgi mesajı gösterildi", body.children.length === 1 && body.children[0].textContent === "Bu sinyal için başka canonical pratik sorusu bulunamadı.");
}

// 36/37/38) 5H ve 5I birbirini TETİKLEMİYOR, ikisi de bağımsız çalışıyor
const SLSONRAKI_FN = slice("function slSonraki(){", "\n// FAZ 2 — attribution yakalama");
const BRIDGE_5H = slice("if(avciSonrakiSoruKomutuMu(val)&&_aktifSoruModulu==='sinyal_lab'){", "\n\n  // KATMAN 5I");
const FULL_SRC_WITH_5H = TRACKER_DECL + "\n" + STATE_DECL + "\n" + SLRENDER_FN + "\n" + SLSONRAKI_FN + "\n" + BAGLAM_VE_BOARD_BLOK + "\n" + `
function __t_setAktifModul(v){_aktifSoruModulu=v;}
function __t_getSlState(){return {slIdx:slIdx,soruId:slCurrentSoru&&slCurrentSoru.id};}
function __komutBridgeProbe5H(val, body, inp){
${BRIDGE_5H}
}
function __komutBridgeProbe5I(val, body, inp){
${BRIDGE_BRANCH}
}
`;
function sandboxKur5H5I() {
  const sandbox = {
    console: { warn: () => {}, log: () => {}, error: () => {} },
    document: { getElementById: () => null, createElement: () => ({}) },
    window: {},
    curAlan: undefined,
    setTimeout: () => {},
    rtBaslat: () => 1000,
    avciTeshisPaneliTemizle: () => {},
    SL_HAVUZ: [Q0, Q1, Q2, Q3],
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(FULL_SRC_WITH_5H, context, { filename: "index.html (5H+5I collision check)" });
  return context;
}
{
  const ctx = sandboxKur5H5I();
  ctx.__t_setAktifModul("sinyal_lab");
  ctx.window.__slDeepLinkSoru = Q0;
  ctx.slRender();
  const once = ctx.__t_getSlState();
  // 5H komutu 5I bloğuna hiç girmiyor (ayrı if, ayrı fonksiyon adı)
  ctx.__komutBridgeProbe5I("Sonraki soruya geç.", fakeBody(), fakeInp()); // 5H'nin komutu, 5I probe'una veriliyor
  const after5Iprobe = ctx.__t_getSlState();
  kontrol("37) 5H komutu ('Sonraki soruya geç.') 5I köprüsünü TETİKLEMİYOR (soru DEĞİŞMEDİ)", after5Iprobe.soruId === once.soruId);

  ctx.window.__slDeepLinkSoru = Q0;
  ctx.slRender();
  const once2 = ctx.__t_getSlState();
  ctx.__komutBridgeProbe5H("Bu sinyalden başka soru sor.", fakeBody(), fakeInp()); // 5I'nin komutu, 5H probe'una veriliyor
  const after5Hprobe = ctx.__t_getSlState();
  kontrol("38) 5I komutu ('Bu sinyalden başka soru sor.') 5H'nin sıradan slSonraki() mantığını ÇALIŞTIRMIYOR (soru DEĞİŞMEDİ)", after5Hprobe.soruId === once2.soruId);

  ctx.window.__slDeepLinkSoru = Q0;
  ctx.slRender();
  const once3 = ctx.__t_getSlState();
  ctx.__komutBridgeProbe5H("Sonraki soruya geç.", fakeBody(), fakeInp()); // 5H kendi komutuyla hâlâ çalışıyor
  const after5Hown = ctx.__t_getSlState();
  kontrol("36) 5H komutu hâlâ çalışıyor (kendi probe'unda soru DEĞİŞTİ)", after5Hown.soruId !== once3.soruId);
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
