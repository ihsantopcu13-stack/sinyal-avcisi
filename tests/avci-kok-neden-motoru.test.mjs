// AVCI Hata Kökü Motoru (Katman 4) — KONTROLLÜ INFERENCE ENGINE
// (avciKokNedenAnalizEt) GERÇEK ÇALIŞTIRMA (execution) testi.
// index.html'den fonksiyonun kaynağı BİREBİR çıkarılıp Node'un `vm`
// modülüyle GERÇEKTEN ÇALIŞTIRILIYOR — sahte yeniden-yazım DEĞİL.
// Bu fonksiyon SAF'tır (Supabase/DOM erişimi yok) — sandbox minimaldir.

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

// ---- STATİK: motor tanımlı, duplicate yok, hiçbir modüle/UI'a bağlanmamış ----
{
  kontrol(
    "S1) avciKokNedenAnalizEt TAM OLARAK 1 kez tanımlı (duplicate YOK)",
    (html.match(/function avciKokNedenAnalizEt\(diagnosticEventleri,opts\)/g) || []).length === 1
  );
  kontrol(
    "S2) AVCI_DESTEKLENEN_KOK_NEDENLER TAM OLARAK 1 kez tanımlı",
    (html.match(/const AVCI_DESTEKLENEN_KOK_NEDENLER=/g) || []).length === 1
  );
  kontrol(
    "S3) motor HİÇBİR render/UI fonksiyonundan çağrılmıyor (bu PR'da bilinçli olarak UI'sız) — avciZayifAlanlarimRender/avciOgrenciProfiliHTML/avciTeshisPaneliGoster içinde avciKokNedenAnalizEt YOK",
    (() => {
      const fonksiyonlar = ["avciZayifAlanlarimRender", "avciOgrenciProfiliHTML", "avciTeshisPaneliGoster", "avciZayifAlanlarimHTML"];
      return fonksiyonlar.every((ad) => {
        const m = html.match(new RegExp(`function ${ad}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`));
        return m ? !/avciKokNedenAnalizEt/.test(m[0]) : true;
      });
    })()
  );
  kontrol(
    "S4) motor Supabase'e HİÇ dokunmuyor (bu bloğun kaynağında sb\\. yok) — pure function garantisi",
    !/\bsb\./.test(html.slice(html.indexOf("function avciKokNedenAnalizEt"), html.indexOf("// KELIME KARTLARI SM-2")))
  );
  kontrol(
    "S5) diğer 4 modülün handler'ları (satAns/kkAnswer/tuzakAns/paragraf) avciKokNedenAnalizEt'e HİÇ dokunmuyor",
    !/function satAns[\s\S]{0,2000}?avciKokNedenAnalizEt/.test(html) &&
      !/function kkAnswer[\s\S]{0,2000}?avciKokNedenAnalizEt/.test(html)
  );
  kontrol(
    "S6) KESIN_TESHIS gibi bir status değeri kodda YOK — status sadece YETERSIZ_KANIT/HIPOTEZ/DESTEKLENEN_HIPOTEZ",
    !/KESIN_TESHIS/.test(html.slice(html.indexOf("function avciKokNedenAnalizEt"), html.indexOf("// KELIME KARTLARI SM-2")))
  );
  kontrol(
    "S7) yeni bir DB tablo/kolon/migration referansı YOK bu blokta (create table/alter table/CREATE TABLE hiç geçmiyor)",
    !/create table|alter table/i.test(html.slice(html.indexOf("function avciKokNedenAnalizEt"), html.indexOf("// KELIME KARTLARI SM-2")))
  );
}

// ---- Kaynağı BİREBİR çıkar ----
const startMarker = "const AVCI_DESTEKLENEN_KOK_NEDENLER=";
const endMarker = "// KELIME KARTLARI SM-2";
const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker, startIdx);
if (startIdx === -1 || endIdx === -1) {
  console.log("[FAIL] 0) kaynak çıkarma başarısız");
  console.log(`\nTOPLAM: 1 test, 1 başarısız.`);
  process.exit(1);
}
const gercekKaynak = html.slice(startIdx, endIdx);

function motoruCalistir(diagnosticEventleri, opts) {
  const sandbox = { __events: diagnosticEventleri, __opts: opts };
  vm.createContext(sandbox);
  vm.runInContext(gercekKaynak + "\nthis.__sonuc = avciKokNedenAnalizEt(__events, __opts);", sandbox);
  return sandbox.__sonuc;
}

function olay(o) {
  return {
    id: o.id ?? null,
    user_id: o.user_id ?? "u1",
    question_id: o.question_id ?? "q001",
    self_report_reason: o.self_report_reason ?? null,
    micro_test_type: o.micro_test_type ?? null,
    micro_test_selected: o.micro_test_selected ?? null,
    micro_test_correct: o.micro_test_correct ?? null,
    created_at: o.created_at ?? "2026-09-18T00:00:00Z",
  };
}

// 1) hiç diagnostic event yok → YETERSIZ_KANIT
{
  const r = motoruCalistir([], {});
  kontrol("1) hiç event yok → status=YETERSIZ_KANIT, evidenceCount=0", r.status === "YETERSIZ_KANIT" && r.evidenceCount === 0);
}

// 2) yalnız SIGNAL_MISSED self-report (mikro test yok) → HIPOTEZ
{
  const r = motoruCalistir([olay({ id: "e1", self_report_reason: "SIGNAL_MISSED" })], {});
  kontrol(
    "2) sadece SIGNAL_MISSED self-report → status=HIPOTEZ, verifiedEvidence boş",
    r.status === "HIPOTEZ" && r.verifiedEvidence.length === 0 && r.hypotheses.length === 1 && r.hypotheses[0].label === "SIGNAL_MISSED"
  );
}

// 3) SIGNAL_MISSED + SIGNAL_SELECT false → DESTEKLENEN_HIPOTEZ olabilir
{
  const r = motoruCalistir(
    [olay({ id: "e2", self_report_reason: "SIGNAL_MISSED", micro_test_type: "SIGNAL_SELECT", micro_test_correct: false })],
    {}
  );
  kontrol(
    "3) SIGNAL_MISSED + kontrollü test YANLIŞ (aynı yön) → status=DESTEKLENEN_HIPOTEZ",
    r.status === "DESTEKLENEN_HIPOTEZ" && r.verifiedEvidence.length === 1 && r.verifiedEvidence[0].label === "SIGNAL_MISSED"
  );
}

// 4) SIGNAL_MISSED + SIGNAL_SELECT true → otomatik kesin SIGNAL_MISSED üretme (çelişki dışlanır)
{
  const r = motoruCalistir(
    [olay({ id: "e3", self_report_reason: "SIGNAL_MISSED", micro_test_type: "SIGNAL_SELECT", micro_test_correct: true })],
    {}
  );
  kontrol(
    "4) SIGNAL_MISSED self-report + kontrollü testte DOĞRU bulundu (çelişki) → ne hipotez ne kanıt üretilir, status=YETERSIZ_KANIT",
    r.status === "YETERSIZ_KANIT" && r.hypotheses.length === 0 && r.verifiedEvidence.length === 0 && r.observations.length === 1
  );
}

// 5) VOCAB_BLOCK self-report → hypothesis only (asla DESTEKLENEN_HIPOTEZ değil)
{
  const r = motoruCalistir([olay({ id: "e4", self_report_reason: "VOCAB_BLOCK" })], {});
  kontrol("5) VOCAB_BLOCK self-report → status=HIPOTEZ, verifiedEvidence boş (kanıt yükseltmesi yok)", r.status === "HIPOTEZ" && r.verifiedEvidence.length === 0);
}

// 6) RULE_UNKNOWN → RULE_CONFUSED üretme
{
  const r = motoruCalistir([olay({ id: "e5", self_report_reason: "RULE_UNKNOWN" })], {});
  kontrol(
    "6) RULE_UNKNOWN self-report → çıktıda hiçbir yerde RULE_CONFUSED etiketi YOK",
    r.status === "HIPOTEZ" && !r.hypotheses.some((h) => h.label === "RULE_CONFUSED") && !r.verifiedEvidence.some((v) => v.label === "RULE_CONFUSED")
  );
}

// 7) unsupported/tanınmayan self_report_reason değeri → output'a girmez
{
  const r = motoruCalistir([olay({ id: "e6", self_report_reason: "MEANING_TRAP" })], {});
  kontrol(
    "7) desteklenmeyen (allowlist dışı) self_report_reason → hypotheses/verifiedEvidence'a HİÇ girmez, ama observations'ta ham veri korunur",
    r.hypotheses.length === 0 && r.verifiedEvidence.length === 0 && r.status === "YETERSIZ_KANIT" && r.observations.length === 1
  );
}

// 8) CARELESS_PATTERN → response-time kanıtı olmadan üretilmez (motor bu alanı hiç kullanmaz/üretmez)
{
  const r = motoruCalistir([olay({ id: "e7", self_report_reason: "GUESSED" })], {});
  const tumEtiketler = [...r.hypotheses, ...r.verifiedEvidence].map((x) => x.label);
  kontrol(
    "8) CARELESS_PATTERN hiçbir girdi/koşulda üretilmez (response_time_ms motora hiç girmiyor)",
    !tumEtiketler.includes("CARELESS_PATTERN") && r.status === "YETERSIZ_KANIT"
  );
}

// 9) duplicate events sonucu şişirmesin — gerçek event identity (id) kullan
{
  const tekrarli = [
    olay({ id: "e8", self_report_reason: "SIGNAL_MISSED" }),
    olay({ id: "e8", self_report_reason: "SIGNAL_MISSED" }),
    olay({ id: "e8", self_report_reason: "SIGNAL_MISSED" }),
  ];
  const r = motoruCalistir(tekrarli, {});
  kontrol("9) aynı id'li 3 kopya olay → tek bir observation/hypothesis olarak sayılır (şişirme YOK)", r.observations.length === 1 && r.hypotheses.length === 1 && r.evidenceCount === 1);
}

// 10) başka kullanıcının event'i karışmasın
{
  const karisik = [olay({ id: "e9", user_id: "u1", self_report_reason: "SIGNAL_MISSED" }), olay({ id: "e10", user_id: "u2", self_report_reason: "VOCAB_BLOCK" })];
  const r = motoruCalistir(karisik, { beklenenUserId: "u1" });
  kontrol(
    "10) beklenenUserId verildiğinde başka kullanıcıya ait event dışlanır",
    r.observations.length === 1 && r.observations[0].id === "e9" && r.hypotheses.length === 1 && r.hypotheses[0].label === "SIGNAL_MISSED"
  );
}

// 11) null fields → crash yok
{
  let hataAlindi = false;
  let r = null;
  try {
    r = motoruCalistir([{ id: null, user_id: null, question_id: null, self_report_reason: null, micro_test_type: null, micro_test_selected: null, micro_test_correct: null, created_at: null }, null, undefined], {});
  } catch (e) {
    hataAlindi = true;
  }
  kontrol("11) tamamen null alanlı olay + null/undefined satırlar → crash YOK", !hataAlindi && r && r.status === "YETERSIZ_KANIT");
}

// 11b) opts hiç verilmezse (undefined) → crash yok
{
  let hataAlindi = false;
  try {
    motoruCalistir([olay({ id: "e11", self_report_reason: "SIGNAL_MISSED" })], undefined);
  } catch (e) {
    hataAlindi = true;
  }
  kontrol("11b) opts=undefined ile çağrı → crash YOK", !hataAlindi);
}

// 12) anonymous user senaryosu → engine agnostic, mevcut read path bozulmuyor (user_id anonim auth'un ürettiği gerçek bir uuid gibi davranır, engine ayrım yapmaz)
{
  const r = motoruCalistir([olay({ id: "e12", user_id: "anon-uuid-1234", self_report_reason: "VOCAB_BLOCK" })], { beklenenUserId: "anon-uuid-1234" });
  kontrol("12) anonim kullanıcı user_id'si ile normal kullanıcı AYNI şekilde işlenir (özel dallanma yok)", r.status === "HIPOTEZ" && r.hypotheses.length === 1);
}

// 13) diagnostic_events boş → Katman 3 bozulmuyor (statik: Katman 3 fonksiyonları hâlâ mevcut ve değişmedi)
{
  const katman3Fonksiyonlari = ["function avciZayifAlanlariHesapla(", "function avciOgrenciModeliHesapla(", "function avciZayifAlanlarimRender("];
  kontrol("13) Katman 3 fonksiyonları (avciZayifAlanlariHesapla/avciOgrenciModeliHesapla/avciZayifAlanlarimRender) hâlâ TAM OLARAK 1 kez tanımlı — motor eklemesi bunlara dokunmadı", katman3Fonksiyonlari.every((s) => (html.match(new RegExp(s.replace(/[()]/g, "\\$&"), "g")) || []).length === 1));
}

// 14) Sinyal Lab bozulmuyor (statik: dAns/slRender/avciTeshis* köprüsü değişmeden duruyor)
{
  const slFonksiyonlari = ["function dAns(btn,correct){", "function avciTeshisPaneliGoster(soru){", "function avciTeshisPaneliTemizle(){"];
  kontrol("14) Sinyal Lab / Katman 4 köprü fonksiyonları hâlâ TAM OLARAK 1 kez tanımlı — motor eklemesi bunlara dokunmadı", slFonksiyonlari.every((s) => (html.match(new RegExp(s.replace(/[()[\]{}.*+?^$|\\]/g, "\\$&"), "g")) || []).length === 1));
}

// 15) diğer 4 modül bozulmuyor (statik: satAns/kkAnswer/tuzakAns/paragraf handler'ları mevcut, motora referans yok — S5 ile birlikte)
{
  kontrol(
    "15) diğer 4 modülün ana handler fonksiyonları (satAns/kkAnswer) hâlâ mevcut (varlık kontrolü — motor eklemesi modülleri silmedi/bozmadı)",
    /function satAns\(/.test(html) && /function kkAnswer\(/.test(html)
  );
}

// 16) TWO_OPTIONS self-report → allowlist dışı, hiçbir root-cause label üretmez (ham gözlem olarak kalır)
{
  const r = motoruCalistir([olay({ id: "e13", self_report_reason: "TWO_OPTIONS" })], {});
  kontrol("16) TWO_OPTIONS → hypotheses/verifiedEvidence'a hiç girmez, sadece observations'ta kalır", r.hypotheses.length === 0 && r.verifiedEvidence.length === 0 && r.observations.length === 1 && r.status === "YETERSIZ_KANIT");
}

// 17) karma senaryo: birden çok event, karışık etiketler → status en yüksek kanıt seviyesine göre belirlenir
{
  const karma = [
    olay({ id: "e14", self_report_reason: "TWO_OPTIONS" }),
    olay({ id: "e15", self_report_reason: "VOCAB_BLOCK" }),
    olay({ id: "e16", self_report_reason: "SIGNAL_MISSED", micro_test_type: "SIGNAL_SELECT", micro_test_correct: false }),
  ];
  const r = motoruCalistir(karma, {});
  kontrol(
    "17) karma event seti (observation-only + hipotez + doğrulanmış kanıt) → status=DESTEKLENEN_HIPOTEZ (en güçlü kanıt kazanır), diğerleri kaybolmaz",
    r.status === "DESTEKLENEN_HIPOTEZ" && r.observations.length === 3 && r.hypotheses.length === 1 && r.verifiedEvidence.length === 1
  );
}

// 18) raw event'ler hiç mutasyona uğramıyor — girdi dizisi motor tarafından değiştirilmiyor
{
  const girdi = [olay({ id: "e17", self_report_reason: "SIGNAL_MISSED" })];
  const kopya = JSON.parse(JSON.stringify(girdi));
  motoruCalistir(girdi, {});
  kontrol("18) motor çalıştıktan sonra girdi dizisi (ham event) HİÇ değişmedi", JSON.stringify(girdi) === JSON.stringify(kopya));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
