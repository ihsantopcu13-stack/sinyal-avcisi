// KATMAN 5D — CANLI AVCI HOCA DAVRANIŞ SÖZLEŞMESİ. dnavChat()'in GERÇEK
// system prompt'unu index.html'den BİREBİR çıkarıp içerik/parity/güvenlik
// testleri yapar; gerçek bir LLM çağrısı YAPILAMAYACAĞI için (CI'da
// Anthropic ağı yok) bu testler "prompt CONTAINS/EXCLUDES X" seviyesinde
// bir davranış SÖZLEŞMESİ testidir — 5B/5C'nin kendi context enjeksiyon
// testleriyle AYNI yaklaşım. Gerçek Supabase/Anthropic ağına HİÇ çıkılmaz.

import handler from "../api/klod.mjs";
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

// dnavChat() içindeki system template literal'ı (backtick'ler arası) çıkar.
// Not: prompt içinde backtick yok, bu yüzden ilk kapanış backtick'i doğru sınır.
function bulSystemPrompt() {
  const start = html.indexOf("system:`", html.indexOf("async function dnavChat(){")) + "system:`".length;
  const end = html.indexOf("`", start);
  return html.slice(start, end);
}
const SYSTEM_PROMPT = bulSystemPrompt();

function turkceKucultVeDiakritikSil(s) {
  return String(s)
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9+/\s]/g, "")
    .trim();
}

// ============================================================
// 1/7 — TEK AVCI MASTER SÖZLEŞMESİ: 7 adım, doğru sıra, eski metot yok
// ============================================================
{
  kontrol("1) SYSTEM_PROMPT bulundu ve boş değil", SYSTEM_PROMPT.length > 200);
  kontrol("2) dnavChat() TAM OLARAK 1 kez tanımlı (duplicate YOK)", (html.match(/async function dnavChat\(\)\{/g) || []).length === 1);

  const beklenenAdimlar = ["GOR", "FIILI BUL", "S+V+O", "SINYALI YAKALA", "SAG/SOL KONTROL", "SIK ELE", "ANLAMI DOGRULA"];
  const normalizedPrompt = turkceKucultVeDiakritikSil(SYSTEM_PROMPT);
  let sonPozisyon = -1;
  let siraDogru = true;
  for (const adim of beklenenAdimlar) {
    const norm = turkceKucultVeDiakritikSil(adim);
    const pozisyon = normalizedPrompt.indexOf(norm, sonPozisyon + 1);
    if (pozisyon === -1 || pozisyon <= sonPozisyon) { siraDogru = false; break; }
    sonPozisyon = pozisyon;
  }
  kontrol("3) AVCI 7 adımı prompt'ta TAM SIRAYLA mevcut (GÖR→FİİLİ BUL→S+V+O→SİNYALİ YAKALA→SAĞ/SOL→ŞIK ELE→ANLAMI DOĞRULA)", siraDogru);

  kontrol("4) ESKİ 9 adımlı 'AVCI MASTER ANA PRENSİBİ' listesi (SORU TÜRÜNÜ TANI/SON İKİDE KRİTİK FARK/CEVABI AVLA) KALDIRILDI", !/SORU TURUNU TANI|SON iKiDE KRiTiK FARKI BUL|CEVABI AVLA/i.test(SYSTEM_PROMPT));
  kontrol("5) ESKİ ters sıra (SİNYAL→YAPI→S+V+O, '2.SiNYALi BUL 3.YAPIYI TANI') kaldırıldı", !/2\.Si?NYALi? BUL 3\.YAPIYI TANI/i.test(SYSTEM_PROMPT));
  kontrol("6) ESKİ 'ALTIN KURALLAR' (10 maddeli, farklı numaralı ikinci metodoloji) KALDIRILDI", !/ALTIN KURALLAR/i.test(SYSTEM_PROMPT));
  kontrol("7) ESKİ 'MASTER FORMUL: TANI > SiNYAL > YAPI...' (üçüncü metodoloji) KALDIRILDI", !/MASTER FORMUL/i.test(SYSTEM_PROMPT));
  // AVCI YEDİ ADIM bölümü TAM OLARAK 7 madde içermeli (8./9. adım kalıntısı
  // = eski 9 adımlı listeden bir parça sızmış demektir).
  const yediAdimBolumu = SYSTEM_PROMPT.slice(SYSTEM_PROMPT.indexOf("AVCI YEDI ADIM"), SYSTEM_PROMPT.indexOf("ANLATIM TARZI"));
  kontrol("8) AVCI YEDİ ADIM bölümünde TAM OLARAK 7 madde var, 8./9. adım kalıntısı YOK (eski 9-adımlı liste tam temizlendi)", /7\.ANLAMI DOGRULA/i.test(yediAdimBolumu) && !/8\./.test(yediAdimBolumu) && !/9\./.test(yediAdimBolumu));
}

// ============================================================
// UI/PROMPT PARITY — method-strip ile prompt aynı 7 kelimeyi taşıyor
// ============================================================
{
  const stripEtiketleri = [...html.matchAll(/<span class="klod-method-chip">([^<]+)<\/span>/g)].map((m) => m[1]);
  kontrol("9) UI method-strip TAM OLARAK 7 adım gösteriyor", stripEtiketleri.length === 7, JSON.stringify(stripEtiketleri));
  const normStrip = stripEtiketleri.map(turkceKucultVeDiakritikSil);
  const normPromptAdimlar = ["gor", "fiili bul", "s+v+o", "sinyali yakala", "sag+sol kontrol".replace("+", "/"), "sik ele", "anlami dogrula"];
  kontrol("10) UI method-strip == AVCI YEDİ ADIM (kelime + sıra birebir aynı, diakritik farkı hariç)", JSON.stringify(normStrip) === JSON.stringify(normPromptAdimlar), `strip:${JSON.stringify(normStrip)} beklenen:${JSON.stringify(normPromptAdimlar)}`);
}

// ============================================================
// 2/7 — SOCRATIC ONE-STEP TEACHING
// ============================================================
{
  kontrol("11) SOCRATIC TEK ADIM KURALI başlığı prompt'ta mevcut", /SOCRATIC TEK ADIM KURALI/i.test(SYSTEM_PROMPT));
  kontrol("12) 'tek mesajda anlat/döküp' YASAK talimatı var (7 adımı tek seferde dökmeyi engelliyor)", /TEK mesajda anlatip cozumu DOKME/i.test(SYSTEM_PROMPT));
  kontrol("13) 'SONRA DUR' / öğrenci cevabını bekleme talimatı var", /SONRA DUR/i.test(SYSTEM_PROMPT) && /BEKLE/i.test(SYSTEM_PROMPT));
  kontrol("14) 'Hocam anlamadım' tipi örnek davranış (fiili bulalım) prompt'ta var", /Once fiili bulalim/i.test(SYSTEM_PROMPT));
  kontrol("15) doğru yönde ilerlerse 'bir sonraki adıma geç' talimatı var", /BIR SONRAKI adima gec/i.test(SYSTEM_PROMPT));
}

// ============================================================
// 3/7 — BEFORE / AFTER ANSWER POLICY
// ============================================================
{
  kontrol("16) CEVAP AÇIKLAMA POLİTİKASI başlığı mevcut", /CEVAP ACIKLAMA POLITIKASI/i.test(SYSTEM_PROMPT));
  kontrol("17) 'B mi?' / 'cevap ne?' / 'direkt söyle' taleplerinde onaylama/reddetme YASAK, kanıta yönlendirme VAR", /"B mi\?", "cevap ne\?", "direkt soyle"/i.test(SYSTEM_PROMPT) && /ONAYLAMA\/REDDETME/i.test(SYSTEM_PROMPT));
  kontrol("18) İlk direkt cevap talebinde bile hemen vermeme kuralı VAR", /Ilk direkt cevap talebinde bile hemen verme/i.test(SYSTEM_PROMPT));
  kontrol("19) Açık çözüm talebi ('pes ettim'/'çözümü göster'/'artık cevabı açıkla') ÇÖZÜM MODUNA geçiş kuralı VAR", /pes ettim.*cozumu goster.*artik cevabi acikla/i.test(SYSTEM_PROMPT.replace(/\n/g, " ")));
  kontrol("20) sonsuz reddetme döngüsüne GİRME talimatı VAR", /sonsuz reddetme dongusune GIRME/i.test(SYSTEM_PROMPT));
  kontrol("21) COZUM MODU / cevap sonrası açıklama sırası TAM OLARAK istenen 7 sırayla mevcut", /1\.Dogru\/Yanlis 2\.Neden dogru 3\.Kritik yanlis sik\(lar\) neden elenir 4\.S\+V\+O 5\.Sinyal 6\.Sag\/Sol kontrol 7\.AVCI REFLEKSI/i.test(SYSTEM_PROMPT));
}

// ============================================================
// 4/7 — CONTEXT HIERARCHY
// ============================================================
{
  kontrol("22) BAĞLAM ÖNCELİK SIRASI başlığı mevcut", /BAGLAM ONCELIK SIRASI/i.test(SYSTEM_PROMPT));
  kontrol("23) AKTİF SORU BAĞLAMI 'her zaman en yüksek öncelik' olarak tanımlı", /AKTIF SORU BAGLAMI[\s\S]{0,40}HER ZAMAN en yuksek oncelik/i.test(SYSTEM_PROMPT));
  kontrol("24) ÖĞRENCİ KANIT ÖZETİ 'sadece destekleyici' + 'aktif sorunun konusunu asla değiştirmez' olarak tanımlı", /OGRENCI KANIT OZETI[\s\S]{0,40}SADECE destekleyicidir/i.test(SYSTEM_PROMPT) && /ASLA degistirmez\/gecersiz kilmaz/i.test(SYSTEM_PROMPT));
  kontrol("25) 'sen bu konuda zayıfsın' gibi etiketleme AÇIKÇA YASAKLANMIŞ", /ASLA "sen bu konuda zayifsin" gibi bir etiket/i.test(SYSTEM_PROMPT));
  kontrol("26) YETERSİZ_KANIT≠zayıflık, response_time≠dikkatsizlik ilkeleri prompt'ta AÇIKÇA yazılı", /YETERSIZ_KANIT zayiflik degildir/i.test(SYSTEM_PROMPT) && /response_time dikkatsizlik degildir/i.test(SYSTEM_PROMPT));
}

// ============================================================
// STATİK — Katman 4/kişilik/kapasite çıkarımı YASAK dilinin varlığı
// ============================================================
{
  kontrol("27) prompt'ta kişilik/zeka/kapasite çıkarımına dair bir TALİMAT (yasaklama) var — 5C bloğuyla AYNI ilkeyi merkezi prompt da destekliyor", /etiket\/karakter yargisi/i.test(SYSTEM_PROMPT));
  kontrol("28) Katman 4/diagnostic_events bu prompt'ta hiç geçmiyor (kapsam dışı korunuyor)", !/diagnostic_events|Katman 4/i.test(SYSTEM_PROMPT));
}

// ============================================================
// SERVER — handler seviyesinde kompozisyon/güvenlik testleri (A-P)
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

function fullMock({ authOk = true, authBody = { id: "u1", is_anonymous: false }, restRows = [] } = {}) {
  const gorulenIstekler = [];
  return {
    gorulenIstekler,
    impl: async (url, opts) => {
      gorulenIstekler.push({ url: String(url), opts });
      if (String(url).includes("/auth/v1/user")) return authOk ? { ok: true, json: async () => authBody } : { ok: false, status: 401 };
      if (String(url).includes("/rest/v1/answer_history")) return { ok: true, status: 200, json: async () => restRows };
      if (String(url).includes("api.anthropic.com")) {
        const parsed = JSON.parse(opts.body);
        gorulenIstekler.push({ url: "ANTHROPIC_PARSED", parsed });
        return { ok: true, json: async () => ({ content: [{ type: "text", text: "cevap" }], usage: {} }) };
      }
      throw new Error("beklenmeyen istek: " + url);
    },
  };
}
function sistemMetniAl(gorulenIstekler) {
  const anth = gorulenIstekler.find((i) => i.url === "ANTHROPIC_PARSED");
  return anth ? JSON.stringify(anth.parsed.system) : "";
}

const orijinalKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = "sahte-test-degeri-gercek-degil";

// G) CURRENT QUESTION + STUDENT_CONTEXT birlikte → current question öncelikli, ikisi de mevcut
// NOT: dnavChat() HER ZAMAN kendi `system` alanını gönderir (bkz. index.html)
// — bu blok o gerçek davranışı taklit ediyor. `system` göndermemek
// api/klod.mjs'nin AYRI/ESKİ `KLOD_SYSTEM_PROMPT` varsayılanına (sendChat
// pazarlama demo widget'ının kullandığı, bu turun kapsamı DIŞINDAki prompt)
// düşer — dnavChat asla bu yolu kullanmaz.
{
  const m = fullMock({ restRows: [
    { signal: "because", topic: null, is_correct: false, answered_at: new Date().toISOString(), response_time_ms: null },
    { signal: "because", topic: null, is_correct: false, answered_at: new Date().toISOString(), response_time_ms: null },
  ] });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(
    sahteReq(
      { messages: [{ role: "user", content: "bu soruda niye B?" }], context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: SYSTEM_PROMPT },
      { ip: "40.0.0.1", authorization: "Bearer gecerli-token" }
    ),
    res
  );
  const sistem = sistemMetniAl(m.gorulenIstekler);
  kontrol("G) CURRENT QUESTION (5B) ve STUDENT_CONTEXT (5C) İKİSİ DE aynı istekte mevcut, ana prompt bağlam önceliğini tanımlıyor", sistem.includes("AKTİF SORU BAĞLAMI") && sistem.includes("ÖĞRENCİ KANIT ÖZETİ") && sistem.includes("BAGLAM ONCELIK SIRASI"));
  fetchMockTemizle();
}

// H) STUDENT_CONTEXT yok (auth yok) → öğretmen (ana prompt + current question) normal çalışıyor
{
  const m = fullMock();
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "bu soruda niye B?" }], context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: SYSTEM_PROMPT }, { ip: "40.0.0.2" }), res);
  const sistem = sistemMetniAl(m.gorulenIstekler);
  kontrol("H) STUDENT_CONTEXT yok (auth yok) → AKTİF SORU BAĞLAMI ve ana AVCI prompt'u yine de çalışıyor", sistem.includes("AKTİF SORU BAĞLAMI") && !sistem.includes("ÖĞRENCİ KANIT ÖZETİ") && sistem.includes("AVCI YEDI ADIM"));
  kontrol("I) AUTH false → current question öğretimi (5B) ETKİLENMEDEN çalışıyor", res._status === 200);
  fetchMockTemizle();
}

// J/K) YETERSİZ_KANIT / response_time → "zayıfsın/yavaşsın" iddiası YOK (prompt seviyesinde yasaklı + 5C sanitizer zaten profilEtiketi/knowledge göndermiyor)
{
  const m = fullMock({ restRows: [{ signal: "because", topic: null, is_correct: false, answered_at: new Date().toISOString(), response_time_ms: null }] }); // 1 satır → YETERSİZ_KANIT
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], system: SYSTEM_PROMPT }, { ip: "40.0.0.3", authorization: "Bearer gecerli-token" }), res);
  const sistem = sistemMetniAl(m.gorulenIstekler);
  kontrol("J) YETERSİZ_KANIT durumunda dahi prompt'ta 'zayıf öğrenci' etiketleme dili YOK, sadece yasaklama talimatı var", !/sen bu konuda zayifsin/i.test(sistem.replace(/ASLA "sen bu konuda zayifsin" gibi bir etiket\/karakter yargisi olarak yansitma/gi, "")) || sistem.includes("YETERSIZ_KANIT"));
  kontrol("K) response_time/reflex prompt'ta 'dikkatsizsin/yavaşsın' çıkarımına İZİN VERMİYOR (açık yasak var)", /response_time dikkatsizlik degildir/i.test(sistem));
  fetchMockTemizle();
}

// L) Katman 4 root-cause diagnosis yok
{
  const m = fullMock();
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], system: SYSTEM_PROMPT }, { ip: "40.0.0.4", authorization: "Bearer gecerli-token" }), res);
  const sistem = sistemMetniAl(m.gorulenIstekler);
  // NOT: 5C bloğu "Katman 4 varmış gibi davranma" diye AÇIKÇA yasaklıyor —
  // bu, ismi bir kez, sadece bir OLUMSUZLAMA/yasaklama içinde geçiriyor
  // (gerçek bir teşhis/hipotez olarak DEĞİL). Bu yüzden burada raw veri
  // yapısının (diagnostic_events tablosu) ve gerçek motor fonksiyonunun
  // (avciKokNedenAnalizEt) hiç geçmediğini kontrol ediyoruz — "Katman 4"
  // ifadesinin kendisi değil, çünkü onu YASAKLAMAK için bir kez anmak
  // gerekiyor (bkz. api/klod.mjs'deki 5C injection metni).
  kontrol("L) diagnostic_events/avciKokNedenAnalizEt (gerçek Katman 4 veri/motoru) sistem promptunda HİÇ YOK — sadece 'yokmuş gibi davran' yasaklaması var", !/diagnostic_events|avciKokNedenAnalizEt/i.test(sistem) && /Katman 4\)[^"]*bahsetme/i.test(sistem));
  fetchMockTemizle();
}

// O) 5B answer-leak testleri hâlâ PASS (regresyon — aynı mantık, sadece bağımsız doğrulama)
{
  const m = fullMock();
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: SYSTEM_PROMPT }, { ip: "40.0.0.5" }), res);
  const sistem = sistemMetniAl(m.gorulenIstekler);
  kontrol("O) 5B answer-leak: before-answer'da correct_answer/is_correct hâlâ YOK", !sistem.includes('"correct_answer"') && !sistem.includes('"is_correct"'));
  fetchMockTemizle();
}

// P) 5C student context güvenlik testleri hâlâ PASS (regresyon — aynı mantık, bağımsız doğrulama)
{
  const m = fullMock({ restRows: [] });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], system: SYSTEM_PROMPT }, { ip: "40.0.0.6", authorization: "Bearer gecerli-token" }), res);
  const sistem = sistemMetniAl(m.gorulenIstekler);
  kontrol("P) 5C: boş answer_history'de bile PII/profilEtiketi/user_id sistem promptunda YOK", !/profilEtiketi/i.test(sistem) && !sistem.includes("user-1") && !sistem.includes("u1"));
  fetchMockTemizle();
}

process.env.ANTHROPIC_API_KEY = orijinalKey;

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
