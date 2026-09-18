// AVCI Katman 3/4 ortak telemetri — response_time_ms HAM DAVRANIŞSAL
// KANIT. GERÇEK ÇALIŞTIRMA (execution) + statik yapı testleri.
// SÜRE ≠ DİKKATSİZLİK, HIZ ≠ BİLGİ, YAVAŞLIK ≠ ZAYIFLIK — bu dosya
// CARELESS_PATTERN veya başka bir teşhis ÜRETİLMEDİĞİNİ de doğrular.
//
// index.html'den rtBaslat/rtBitir/cevapKaydet/cevapSunucuyaSenkronla ve
// Tuzak modülünün TAM zincirini (render→answer) BİREBİR çıkarıp Node'un
// `vm` modülüyle GERÇEKTEN ÇALIŞTIRIYORUZ — sahte yeniden-yazım DEĞİL.
// Diğer 3 modülün (Sinyal Lab/SAT/Paragraf) AYNI deseni kullandığı ve
// Kelime Kartları'nın BİLİNÇLİ OLARAK bağlanmadığı statik olarak
// doğrulanıyor (gerekçe: rapora bkz — flip, cevabı answer'dan ÖNCE
// açığa çıkarıyor, "cevap sonrası okuma süresi" kontrata aykırı olurdu).

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

const html = readFileSync(path.join(ROOT, "index.html"), "utf-8");

function slice(startMarker, endMarker, fromIdx) {
  const s = html.indexOf(startMarker, fromIdx || 0);
  const e = html.indexOf(endMarker, s);
  if (s === -1 || e === -1) throw new Error(`marker bulunamadı: "${startMarker}" -> "${endMarker}"`);
  return html.slice(s, e);
}

const SHARED = slice("let _rtSekmeArkaplanaGecti=false;", "function cevapGecmisiOzet(){");
// SADECE rtBaslat/rtBitir — cevapKaydet/cevapSunucuyaSenkronla'nın GERÇEK
// gövdesi YOK. Modül entegrasyon testlerinde (TUZAK) cevapKaydet'i KENDİ
// mock'umuzla yakalamak istiyoruz; SHARED'in tamamını eklersek gerçek
// `function cevapKaydet(){...}` tanımı bizim mock'umuzu EZER (aynı isimli
// function declaration global'i overwrite eder) — bu yüzden ayrı, daha
// dar bir dilim.
const RT_HELPERS = slice("let _rtSekmeArkaplanaGecti=false;", "// CEVAP GEÇMİŞİ (doğru + yanlış, birleşik)");
const TUZAK = slice("let tuzakIdx=0,tuzakAnswered=false", "// Tarih etiketini sayfa açılışında set et");
const REFLEKS = slice("function avciOgrenciModeliHesapla(satirlar){", "function avciOgrenciProfiliHTML(profiller){");

// ============================================================
// STATİK — 5 handler'ın her biri ayrı değerlendirildi, duplicate yok,
// diğer modüller ve Katman 4 motoruna karışma yok
// ============================================================
{
  kontrol("S1) rtBaslat/rtBitir TAM OLARAK 1 kez tanımlı (duplicate YOK)", (html.match(/function rtBaslat\(\)/g) || []).length === 1 && (html.match(/function rtBitir\(baslangic\)/g) || []).length === 1);
  kontrol("S2) visibilitychange listener TAM OLARAK 1 kez kayıtlı", (html.match(/addEventListener\('visibilitychange'/g) || []).length === 1);
  kontrol("S3) cevapKaydet finite/>=0 sanitize ediyor, sahte varsayılan (5000 gibi) YOK", /Number\.isFinite\(opts\.responseTimeMs\)&&opts\.responseTimeMs>=0/.test(html) && !/responseTimeMs.*5000/.test(html));
  kontrol("S4) cevapSunucuyaSenkronla artık p_response_time_ms:null SABİT DEĞİL — kayit.responseTimeMs gönderiyor", !/p_response_time_ms:null,/.test(html) && /p_response_time_ms:\(typeof kayit\.responseTimeMs/.test(html));

  // KATMAN 5B (2026-09-18): slAnswered=false/true ile rtBaslat/rtBitir
  // arasına seçilen-cevap state satırı eklendi (bkz. avci-klod-context.
  // test.mjs) — sıralama/davranış AYNI, sadece aralarında 1 satır var;
  // regex bunu tolere edecek şekilde genişletildi (hâlâ "hemen ardından"
  // sınırını [\s\S]{0,120} ile koruyor, fonksiyonun geri kalanına sızmıyor).
  kontrol("S5) SİNYAL LAB — slRender rtBaslat() çağırıyor, dAns rtBitir() çağırıyor (feedback/kaydetmeden ÖNCE)", /slAnswered=false;[\s\S]{0,250}?_slRtBaslangic=rtBaslat\(\)/.test(html) && /slAnswered=true;[\s\S]{0,250}?const _slRt=rtBitir\(_slRtBaslangic\);/.test(html));
  kontrol("S6) SİNYAL LAB — her iki dal (doğru/yanlış) da responseTimeMs:_slRt gönderiyor", (html.match(/responseTimeMs:_slRt\}/g) || []).length === 2);

  kontrol("S7) SAT — satPratikRender'da idx-değişti-veya-cevaplanmış guard'ı var", /_satRtIdx!==satSoruIdx\|\|_satRtAnsweredSlot===satSoruIdx/.test(html));
  kontrol("S8) SAT — satAns rtBitir() çağırıp slot'u işaretliyor, her iki dal da responseTimeMs gönderiyor", /satAnswered=true;const _satRt=rtBitir\(_satRtBaslangic\);_satRtAnsweredSlot=satSoruIdx;/.test(html) && (html.match(/responseTimeMs:_satRt\}/g) || []).length === 2);
  kontrol("S9) SAT — satSureDoIdi de slot'u işaretliyor (süre dolduktan sonra revisit'te stale timer kalmıyor)", /satAnswered=true;_satRtAnsweredSlot=satSoruIdx;/.test(html));

  kontrol("S10) TUZAK — tuzakRender VE tuzakSonraki'de aynı guard deseni var (2 kez)", (html.match(/_tuzakRtIdx!==_ytIdx\|\|_tuzakRtAnsweredSlot===_ytIdx/g) || []).length === 2);
  kontrol("S11) TUZAK — tuzakAns rtBitir() çağırıp slot'u işaretliyor, her iki dal da responseTimeMs gönderiyor", /tuzakAnswered=true;\s*\n\s*const _tuzakRt=rtBitir\(_tuzakRtBaslangic\);_tuzakRtAnsweredSlot=tuzakIdx;/.test(html) && (html.match(/responseTimeMs:_tuzakRt\}/g) || []).length === 2);

  kontrol("S12) PARAGRAF — paragrafSec idx-değişti guard'ı var, paragrafCevapla SADECE aynı pidx'te render varsa süreyi kullanıyor", /_paragrafRtIdx!==idx\){_paragrafRtBaslangic=rtBaslat\(\)/.test(html) && /const _paragrafRt=\(pidx===_paragrafRtIdx\)\?rtBitir\(_paragrafRtBaslangic\):null;/.test(html));
  kontrol("S13) PARAGRAF — her iki dal da responseTimeMs:_paragrafRt gönderiyor", (html.match(/responseTimeMs:_paragrafRt\}/g) || []).length === 2);

  kontrol(
    "S14) KELİME KARTLARI — bilinçli olarak BAĞLANMADI: kkShow/kkFlip/kkAnswer içinde rtBaslat/rtBitir/responseTimeMs HİÇ geçmiyor",
    (() => {
      const kkBlok = slice("function kkShow(){", "function tuzakGetDailyIdx(){");
      return !/rtBaslat|rtBitir|responseTimeMs/.test(kkBlok);
    })()
  );
  kontrol(
    "S15) KATMAN 4 motoru (avciKokNedenAnalizEt) response_time_ms'e BAĞLANMADI, CARELESS_PATTERN üretmiyor (PR #26'dan değişmedi)",
    (() => {
      const motorBlok = slice("function avciKokNedenAnalizEt(diagnosticEventleri,opts){", "// KELIME KARTLARI SM-2");
      return !/response_time_ms|responseTimeMs|CARELESS_PATTERN/.test(motorBlok);
    })()
  );
  kontrol(
    "S16) diagnostic_events / avciTeshisKaydet response_time_ms'e HİÇ dokunmadı (kapsam dışı, korunuyor)",
    !/response_time_ms|responseTimeMs/.test(slice("async function avciTeshisKaydet(kayit){", "function avciTeshisPaneliTemizle(){"))
  );
  kontrol("S17) REFLEKS (avciOgrenciModeliHesapla) formülü DEĞİŞTİRİLMEDİ — hâlâ aynı filter/reduce ifadesi", /zamanliOlaylar=olaylar\.filter\(o=>typeof o\.response_time_ms==='number'&&o\.response_time_ms>0\);/.test(REFLEKS) && /ortalamaSureMs:Math\.round\(zamanliOlaylar\.reduce\(\(s,o\)=>s\+o\.response_time_ms,0\)\/zamanliOlaylar\.length\)/.test(REFLEKS));
  kontrol("S18) yeni bir DB kolon/migration/RPC/schema referansı YOK (create table/alter table hiç geçmiyor)", !/create table|alter table/i.test(SHARED + TUZAK));
  kontrol(
    "S19) diagnostic_events şemasına response_time_ms KOLONU eklenmedi (mevcut yorumdaki kavramsal referans hariç)",
    !/response_time_ms/.test(
      readFileSync(path.join(ROOT, "supabase/diagnostic-events-schema.sql"), "utf-8")
        .split("\n")
        .filter((satir) => !satir.trim().startsWith("--"))
        .join("\n")
    )
  );
}

// ============================================================
// GERÇEK ÇALIŞTIRMA — rtBaslat/rtBitir SAF sözleşme testleri
// ============================================================
function sandboxKurSHARED() {
  const rpcCagrilari = [];
  let sessionSonucu = { data: { session: null }, error: null };
  const sandbox = {
    console: { warn: () => {}, log: () => {}, error: () => {} },
    document: { hidden: false, _visCb: null, addEventListener(evt, cb) { if (evt === "visibilitychange") this._visCb = cb; } },
    performance: { _now: 0, now() { return this._now; } },
    window: {},
    localStorage: undefined,
    sb: undefined,
    currentUser: null,
    setTimeout: () => {},
  };
  sandbox.sb = {
    auth: { getSession: async () => sessionSonucu },
    rpc: async (adi, payload) => {
      rpcCagrilari.push({ adi, payload });
      return { error: null };
    },
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(SHARED, context, { filename: "index.html (extracted, shared-rt)" });
  return {
    context,
    rpcCagrilari,
    setSaat: (ms) => { context.performance._now = ms; },
    sekmeArkaplanaGec: () => { context.document.hidden = true; if (context.document._visCb) context.document._visCb(); },
    setSession: (v) => { sessionSonucu = v; },
    bekle: () => new Promise((r) => setTimeout(r, 20)),
  };
}

{
  const t = sandboxKurSHARED();
  t.setSaat(1000);
  const start = t.context.rtBaslat();
  t.setSaat(1450);
  const ms = t.context.rtBitir(start);
  kontrol("1) render→answer = pozitif ms (1000→1450 arası, 450ms bekleniyor)", ms === 450);
}
{
  const t = sandboxKurSHARED();
  const ms = t.context.rtBitir(null);
  kontrol("2) timer yok (null başlangıç) → NULL", ms === null);
}
{
  const t = sandboxKurSHARED();
  const ms = t.context.rtBitir(NaN);
  kontrol("3) NaN başlangıç → NULL", ms === null);
}
{
  const t = sandboxKurSHARED();
  t.setSaat(1000);
  const start = t.context.rtBaslat();
  t.setSaat(500); // saat geriye gitti (negatif delta simülasyonu)
  const ms = t.context.rtBitir(start);
  kontrol("4) negatif delta → NULL (saat geriye giderse bile sahte/negatif değer üretilmiyor)", ms === null);
}
{
  const t = sandboxKurSHARED();
  t.setSaat(1000);
  const start = t.context.rtBaslat();
  t.context.performance.now = () => Infinity;
  const ms = t.context.rtBitir(start);
  kontrol("5) Infinity → NULL", ms === null);
}
{
  const t = sandboxKurSHARED();
  t.setSaat(1000);
  const start = t.context.rtBaslat();
  t.setSaat(2000);
  t.sekmeArkaplanaGec(); // gerçek tarayıcı sekmesi arka plana geçti
  const ms = t.context.rtBitir(start);
  kontrol("6) sekme (browser tab) arka plana geçti → NULL (SPA'nın iç mod-sekmeleri DEĞİL, gerçek document.hidden)", ms === null);
}
{
  const t = sandboxKurSHARED();
  t.setSaat(1000);
  const start = t.context.rtBaslat();
  t.setSaat(1300);
  const ms1 = t.context.rtBitir(start);
  const ms2 = t.context.rtBitir(start);
  kontrol("7) rtBitir aynı başlangıçla iki kez çağrılsa AYNI sonucu verir (deterministik, gizli side-effect yok)", ms1 === 300 && ms2 === 300);
}

// ============================================================
// GERÇEK ÇALIŞTIRMA — cevapKaydet sanitizasyonu + RPC payload'a geçiş
// ============================================================
function cevapKaydetCagir(t, opts) {
  return t.context.cevapKaydet(opts);
}
{
  const t = sandboxKurSHARED();
  cevapKaydetCagir(t, { modul: "test", soru: "s1", isCorrect: true, responseTimeMs: 1234.6 });
}
{
  const senaryolar = [
    { ad: "8) finite pozitif float → yuvarlanmış int RPC'ye gidiyor", giris: 1234.6, beklenen: 1235 },
    { ad: "9) NaN → NULL", giris: NaN, beklenen: null },
    { ad: "10) Infinity → NULL", giris: Infinity, beklenen: null },
    { ad: "11) negatif → NULL", giris: -50, beklenen: null },
    { ad: "12) responseTimeMs hiç verilmemiş (undefined) → NULL", giris: undefined, beklenen: null },
    { ad: "13) string ('120') → NULL (arbitrary tip zorlaması YOK, sadece number kabul)", giris: "120", beklenen: null },
    { ad: "14) 0 (anında cevap) → 0 kabul edilir (finite ve >=0)", giris: 0, beklenen: 0 },
  ];
  for (const s of senaryolar) {
    const t2 = sandboxKurSHARED();
    t2.setSession({ data: { session: { user: { id: "u1", is_anonymous: false } } }, error: null });
    t2.context.currentUser = { id: "u1" };
    cevapKaydetCagir(t2, { modul: "test", soru: "s1", isCorrect: true, responseTimeMs: s.giris });
    await t2.bekle();
    const payload = t2.rpcCagrilari[0]?.payload;
    kontrol(s.ad, payload && payload.p_response_time_ms === s.beklenen, `alınan: ${JSON.stringify(payload?.p_response_time_ms)}`);
  }
}
{
  // anonymous auth zinciri bozulmuyor + answer_history mevcut payload korunuyor
  // (currentUser henüz null — cevapSunucuyaSenkronla GERÇEK getSession() await
  // yolunu izliyor, ilk cevaptaki auth-race-fix davranışı)
  const t = sandboxKurSHARED();
  t.setSession({ data: { session: { user: { id: "anon-u9", is_anonymous: true, email: null } } }, error: null });
  cevapKaydetCagir(t, { questionId: "q001", modul: "sinyal", soru: "cümle", selectedOption: "A", correctOption: "B", isCorrect: false, topic: "sinyal", signal: "despite", responseTimeMs: 4200 });
  await t.bekle();
  const c = t.rpcCagrilari[0];
  kontrol(
    "15) anonim kullanıcı zinciri BOZULMADI + mevcut TÜM alanlar (question_id/module/soru/options/correct/topic/signal) korunarak p_response_time_ms eklendi",
    c && c.adi === "record_answer" && c.payload.p_question_id === "q001" && c.payload.p_module === "sinyal" && c.payload.p_soru === "cümle" && c.payload.p_selected_option === "A" && c.payload.p_correct_option === "B" && c.payload.p_is_correct === false && c.payload.p_topic === "sinyal" && c.payload.p_signal === "despite" && c.payload.p_response_time_ms === 4200
  );
}
{
  // sb/currentUser yokken (misafir, migration yok) hâlâ crash etmiyor
  const t = sandboxKurSHARED();
  t.context.sb = undefined;
  let hata = false;
  try {
    cevapKaydetCagir(t, { modul: "test", soru: "s1", isCorrect: true, responseTimeMs: 900 });
    await t.bekle();
  } catch (e) {
    hata = true;
  }
  kontrol("16) sb yokken (misafir/migration çalıştırılmamış) crash YOK, sync sessizce atlanıyor", !hata);
}

// ============================================================
// GERÇEK ÇALIŞTIRMA — TUZAK modülünün TAM zinciri (render→answer)
// rerender-koruma, double-click, sonraki-soru-taze-timer, önceki
// sorunun timer'ının sızmaması
// ============================================================
function sahteBtn() {
  return { classList: { added: [], add(c) { this.added.push(c); } }, disabled: false, textContent: "" };
}
function sandboxKurTUZAK() {
  const cevapKaydetCagrilari = [];
  const optButtons = [sahteBtn(), sahteBtn(), sahteBtn(), sahteBtn()];
  const elMap = {
    "tuzak-tarih-lbl": { innerHTML: "" },
    "tuzak-container": { innerHTML: "" },
    "tuzak-fb-inner": { className: "", textContent: "" },
    "tuzak-next-btn": { style: { display: "none" } },
    "tuzak-paylas-btn": { style: { display: "none" }, onclick: null },
  };
  const sandbox = {
    console: { warn: () => {}, log: () => {}, error: () => {} },
    document: {
      hidden: false,
      _visCb: null,
      addEventListener(evt, cb) { if (evt === "visibilitychange") this._visCb = cb; },
      getElementById: (id) => elMap[id] || null,
      querySelectorAll: (sel) => (sel === "#tuzak-opts-inner .tuzak-opt" ? optButtons : []),
    },
    performance: { _now: 0, now() { return this._now; } },
    window: {},
    sb: undefined,
    currentUser: null,
    setTimeout: () => {},
    ttsSpeak: () => {},
    // tuzakGetDailyIdx() Date.now() üzerinden gün-bazlı deterministik idx
    // üretir — SABİT bir Date mock'layarak sonucu ÖNCEDEN biliyoruz; böylece
    // context'ten `let tuzakIdx` OKUMAYA gerek kalmıyor (vm'de top-level
    // let/const global'e yansımıyor — bu dosyanın kendi kısıtı DEĞİL,
    // Node vm'in bilinen bir davranışı). tuzakRender() ayrıca tarih
    // etiketi için `new Date()` de çağırıyor — bu yüzden basit bir
    // {now} objesi yetmiyor, minimal bir constructor mock'u gerekiyor.
    Date: FakeDate,
    adaptifZorlukBadge: () => ({ cls: "", ikon: "", seviye: "" }),
    cevapKaydet: (opts) => cevapKaydetCagrilari.push(opts),
    hataEkle: () => {},
    streakSoruEkle: () => {},
    konfeti: () => {},
    saShakeBtn: () => {},
    TUZAK_HAVUZ: [
      { q: "Q0", sent: "S0", opts: ["A", "B"], dogru: 0, fb: "fb0" },
      { q: "Q1", sent: "S1", opts: ["A", "B"], dogru: 1, fb: "fb1" },
      { q: "Q2", sent: "S2", opts: ["A", "B"], dogru: 0, fb: "fb2" },
    ],
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(RT_HELPERS + "\n" + TUZAK, context, { filename: "index.html (extracted, tuzak-rt)" });
  return {
    context,
    cevapKaydetCagrilari,
    optButtons,
    setSaat: (ms) => { context.performance._now = ms; },
    sekmeArkaplanaGec: () => { context.document.hidden = true; if (context.document._visCb) context.document._visCb(); },
  };
}

const GUN_MS = 86400000;
const SABIT_GUN_MS = 20 * GUN_MS + 3600000; // sabit "gün" — testler boyunca deterministik
// tuzakRender() tarih etiketi için `new Date()` çağırıyor — minimal mock.
function FakeDate() {}
FakeDate.now = () => SABIT_GUN_MS;
FakeDate.prototype.getDate = () => 1;
FakeDate.prototype.getMonth = () => 0;
FakeDate.prototype.getFullYear = () => 2026;
const TUZAK_HAVUZ_UZUNLUK = 3;
const TUZAK_IDX0 = Math.floor(SABIT_GUN_MS / GUN_MS) % TUZAK_HAVUZ_UZUNLUK; // tuzakGetDailyIdx()'in üreteceği idx
const TUZAK_SORU0 = [{ dogru: 0 }, { dogru: 1 }, { dogru: 0 }][TUZAK_IDX0];
const TUZAK_IDX1 = (TUZAK_IDX0 + 1) % TUZAK_HAVUZ_UZUNLUK; // tuzakSonraki() sonrası
const TUZAK_SORU1 = [{ dogru: 0 }, { dogru: 1 }, { dogru: 0 }][TUZAK_IDX1];

{
  const t = sandboxKurTUZAK();
  t.setSaat(1000);
  t.context.tuzakRender();
  t.setSaat(1600);
  t.context.tuzakAns(t.optButtons[TUZAK_SORU0.dogru], true, TUZAK_SORU0.dogru);
  kontrol("17) TUZAK render→answer = pozitif ms", t.cevapKaydetCagrilari[0]?.responseTimeMs === 600, `alınan: ${t.cevapKaydetCagrilari[0]?.responseTimeMs}`);
}
{
  // rerender (mod-sekme geçişi simülasyonu) aynı gün/aynı idx için timer'ı SIFIRLAMIYOR
  const t = sandboxKurTUZAK();
  t.setSaat(1000);
  t.context.tuzakRender(); // 1. render — QUESTION_VISIBLE
  t.setSaat(5000);
  t.context.tuzakRender(); // 2. render — AYNI gün, AYNI idx, henüz cevaplanmadı (mod-sekme geçişi)
  t.setSaat(7000);
  t.context.tuzakAns(t.optButtons[TUZAK_SORU0.dogru], true, TUZAK_SORU0.dogru);
  kontrol(
    "18) rerender (aynı soru, henüz cevaplanmamış) yanlışlıkla timer'ı SIFIRLAMADI — süre 1000'den itibaren (6000ms), 5000'den itibaren (2000ms) DEĞİL",
    t.cevapKaydetCagrilari[0]?.responseTimeMs === 6000,
    `alınan: ${t.cevapKaydetCagrilari[0]?.responseTimeMs}`
  );
}
{
  // double click aynı süreyi değiştirmiyor — İKİNCİ çağrı hiç işlenmiyor
  const t = sandboxKurTUZAK();
  t.setSaat(1000);
  t.context.tuzakRender();
  t.setSaat(1400);
  t.context.tuzakAns(t.optButtons[TUZAK_SORU0.dogru], true, TUZAK_SORU0.dogru);
  t.setSaat(9999); // çok sonra ikinci (double) click
  t.context.tuzakAns(t.optButtons[TUZAK_SORU0.dogru], true, TUZAK_SORU0.dogru);
  kontrol("19) double click İKİNCİ bir cevapKaydet çağrısı ÜRETMİYOR (ilk süre değişmeden kalıyor)", t.cevapKaydetCagrilari.length === 1 && t.cevapKaydetCagrilari[0].responseTimeMs === 400);
}
{
  // sonraki soru yeni timer + önceki sorunun timer'ı sızmıyor
  const t = sandboxKurTUZAK();
  t.setSaat(1000);
  t.context.tuzakRender();
  t.setSaat(1300);
  t.context.tuzakAns(t.optButtons[TUZAK_SORU0.dogru], true, TUZAK_SORU0.dogru);
  t.setSaat(50000); // uzun bir ara — SIZMAMASI gereken eski timer
  t.context.tuzakSonraki(); // yeni soruya geç — TAZE timer
  t.setSaat(50800);
  t.context.tuzakAns(t.optButtons[TUZAK_SORU1.dogru], true, TUZAK_SORU1.dogru);
  kontrol(
    "20) sonraki soru TAZE bir timer alıyor (800ms) — önceki sorunun (50000'den) süresi SIZMIYOR",
    t.cevapKaydetCagrilari[1]?.responseTimeMs === 800,
    `alınan: ${t.cevapKaydetCagrilari[1]?.responseTimeMs}`
  );
}
{
  // background/hidden interaction → NULL (gerçek render→answer zinciri üzerinden)
  const t = sandboxKurTUZAK();
  t.setSaat(1000);
  t.context.tuzakRender();
  t.setSaat(3000);
  t.sekmeArkaplanaGec();
  t.setSaat(3500);
  t.context.tuzakAns(t.optButtons[TUZAK_SORU0.dogru], true, TUZAK_SORU0.dogru);
  kontrol("21) render→answer arasında gerçek tarayıcı sekmesi arka plana geçti → responseTimeMs NULL", t.cevapKaydetCagrilari[0]?.responseTimeMs === null);
}
{
  // correct/wrong fark etmeksizin AYNI contract
  const tCorrect = sandboxKurTUZAK();
  tCorrect.setSaat(1000);
  tCorrect.context.tuzakRender();
  tCorrect.setSaat(1500);
  tCorrect.context.tuzakAns(tCorrect.optButtons[TUZAK_SORU0.dogru], true, TUZAK_SORU0.dogru);

  const tWrong = sandboxKurTUZAK();
  tWrong.setSaat(1000);
  tWrong.context.tuzakRender();
  const yanlisOpsiyon = TUZAK_SORU0.dogru === 0 ? 1 : 0;
  tWrong.setSaat(1500);
  tWrong.context.tuzakAns(tWrong.optButtons[yanlisOpsiyon], false, TUZAK_SORU0.dogru);

  kontrol(
    "22) doğru/yanlış cevap AYNI ölçüm sözleşmesini kullanıyor (ikisi de 500ms, dallanmaya bağlı fark YOK)",
    tCorrect.cevapKaydetCagrilari[0]?.responseTimeMs === 500 && tWrong.cevapKaydetCagrilari[0]?.responseTimeMs === 500
  );
}

// ============================================================
// GERÇEK ÇALIŞTIRMA — REFLEKS (avciOgrenciModeliHesapla, DEĞİŞTİRİLMEDİ)
// gerçek response_time_ms verisi geldiğinde doğal biçimde çalışıyor
// ============================================================
function reflexHesapla(satirlar) {
  const sandbox = {};
  vm.createContext(sandbox);
  sandbox.__satirlar = satirlar;
  vm.runInContext(REFLEKS + "\nthis.__sonuc=avciOgrenciModeliHesapla(__satirlar);", sandbox, { filename: "index.html (extracted, reflex)" });
  return sandbox.__sonuc;
}
{
  const satirlar = [
    { signal: "despite", topic: "sinyal", is_correct: true, answered_at: "2026-09-18T10:00:00Z", response_time_ms: 4000 },
    { signal: "despite", topic: "sinyal", is_correct: false, answered_at: "2026-09-18T10:01:00Z", response_time_ms: 6000 },
  ];
  const profil = reflexHesapla(satirlar)[0];
  kontrol("23) gerçek response_time_ms verisi geldiğinde REFLEKS doğal biçimde hesaplanıyor (DEĞİŞTİRİLMEDEN)", profil.reflex && profil.reflex.ortalamaSureMs === 5000 && profil.reflex.kanitSayisi === 2);
}
{
  const satirlar = [
    { signal: "despite", topic: "sinyal", is_correct: true, answered_at: "2026-09-18T10:00:00Z", response_time_ms: null },
    { signal: "despite", topic: "sinyal", is_correct: false, answered_at: "2026-09-18T10:01:00Z", response_time_ms: null },
  ];
  const profil = reflexHesapla(satirlar)[0];
  kontrol("24) Katman 3 BOŞ response_time_ms ile hâlâ çalışıyor (reflex=null, crash YOK, diğer alanlar dolu)", profil.reflex === null && profil.evidenceCount === 2 && profil.longTermAccuracy === 50);
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
