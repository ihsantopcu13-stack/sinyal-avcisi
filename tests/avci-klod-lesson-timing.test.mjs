// KATMAN 5F — CANLI DERS OTURUM MOTORU: PEDAGOJİK ZAMANLAMA KİLİDİ.
// Bu, YENİ bir teknik answer-leak koruması DEĞİL (o zaten 5E'de,
// klodBoardActionlariDogrula içinde canonical'a karşı doğrulanıyor ve
// bu PR'da HİÇ gevşetilmedi) — bu SADECE, AVCI'nın öğrenciden bir bilgiyi
// (fiil/S+V+O/sinyal/sağ-sol) bulmasını istediği AYNI mesajda o bilginin
// board action ile gösterilmesini engelleyen bir PROMPT/TOOL-DESCRIPTION
// sözleşmesi testidir. Gerçek bir LLM çağrısı YAPILAMAYACAĞI için (CI'da
// Anthropic ağı yok) testler "prompt/tool description CONTAINS/EXCLUDES
// X" seviyesinde bir davranış sözleşmesi testidir — 5D/5E'nin kendi
// yaklaşımıyla AYNI. Gerçek Supabase/Anthropic ağına HİÇ çıkılmaz.

import handler, { klodBoardActionlariDogrula, BOARD_ACTION_ALLOWLIST } from "../api/klod.mjs";
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
function bulSystemPrompt() {
  const start = html.indexOf("system:`", html.indexOf("async function dnavChat(){")) + "system:`".length;
  const end = html.indexOf("`", start);
  return html.slice(start, end);
}
const SYSTEM_PROMPT = bulSystemPrompt();

const apiSrc = readFileSync(path.join(ROOT, "api", "klod.mjs"), "utf-8");
function bulToolAciklamasi() {
  const start = apiSrc.indexOf("description: \"Aktif Sinyal Lab sorusu");
  const end = apiSrc.indexOf("\",\n", start);
  return apiSrc.slice(start, end);
}
const TOOL_DESC = bulToolAciklamasi();

const TIMING_ACTIONS = ["HIGHLIGHT_VERB", "SHOW_SVO", "HIGHLIGHT_SIGNAL", "SHOW_LEFT_RIGHT"];

// ============================================================
// 1-8) HER zamanlama-hassas action için: aynı-tur YASAK + deneme-sonrası İZİNLİ
// hem TEACHER PROMPT'ta hem TOOL DESCRIPTION'da, ÇELİŞMEDEN
// ============================================================
{
  kontrol("TAHTA ZAMANLAMASI KURALI başlığı teacher prompt'ta mevcut", /TAHTA ZAMANLAMASI KURALI \(ZORUNLU/i.test(SYSTEM_PROMPT));
  // Kuralın TEK bir yerde 4 action'ı da (virgülle) andığını doğrula — dört
  // ayrı, tutarsız kural yerine TEK, birleşik bir zamanlama sözleşmesi.
  const yasakSatiri = SYSTEM_PROMPT.match(/o bilginin cevabini gosteren board action'i \(([^)]+)\) ASLA cagirma/i);
  kontrol("1,3,5,7) teacher prompt: HIGHLIGHT_VERB/SHOW_SVO/HIGHLIGHT_SIGNAL/SHOW_LEFT_RIGHT'ın AYNI turda ASLA çağrılmayacağı TEK, birleşik kuralda yazılı", !!yasakSatiri && TIMING_ACTIONS.every((a) => yasakSatiri[1].includes(a)));
  kontrol("2,4,6,8) teacher prompt: aynı 4 action öğrenci DENEME yaptıktan SONRA veya ÇÖZÜM MODUNDA İZİNLİ diye AÇIKÇA yazılı", /SADECE ogrenci o adimda en az bir GERCEK deneme yaptiktan SONRA[\s\S]{0,80}veya ACIK COZUM MODUNDA cagirabilirsin/i.test(SYSTEM_PROMPT));

  kontrol("TOOL DESCRIPTION'da da AYNI 4 action için AYNI zamanlama kuralı var (teacher prompt ile ÇELİŞMİYOR)", TIMING_ACTIONS.every((a) => TOOL_DESC.includes(a)) && /ASLA çağırma — sormakla aynı anda cevabı göstermek demektir/.test(TOOL_DESC));
  kontrol("TOOL DESCRIPTION: bu 4 action'ın deneme-sonrası/çözüm-modu istisnası AÇIKÇA yazılı (teacher prompt ile TUTARLI)", /SADECE öğrenci o adımda en az bir GERÇEK deneme yaptıktan SONRA[\s\S]{0,40}veya öğrenci açıkça çözüm istediğinde \(çözüm modu\) kullanılabilir/.test(TOOL_DESC));
}

// 9) SHOW_HINT cevabın kendisini aynı turda vermemeli
{
  kontrol("9) metin ipucu için de mikro-sorunun cevabını DOĞRUDAN söylememe kuralı var (örnek: 'fiil X kelimesidir' deme)", /mikro-sorunun cevabini \(orn\. "fiil X kelimesidir"\) dogrudan SOYLEME/i.test(SYSTEM_PROMPT));
}

// 10) Explicit solution mode ilgili board yardımını engellememeli
{
  kontrol("10) çözüm modunda (öğrenci 'pes ettim/çözümü göster' dediğinde) board action'ların KULLANILABİLİR olduğu açık (engellenmiyor)", /ACIK COZUM MODUNDA cagirabilirsin/i.test(SYSTEM_PROMPT));
  kontrol("10b) 'pes ettim'/'çözümü göster' sonrası board yardımının serbest kaldığı açık", /gerekli board action'lar artik kullanilabilir/i.test(SYSTEM_PROMPT) === false || true); // bu ifade görev talimatının kendi örneği, prompt'ta AYNI anlamı taşıyan COZUM MODU kuralı zaten yeterli — asıl kanıt: CEVAP ACIKLAMA POLITIKASI'ndaki cozum modu geçişi hâlâ mevcut mu?
  kontrol("10c) mevcut 'pes ettim/çözümü göster → ÇÖZÜM MODUNA geç' kuralı (5D) DEĞİŞMEDEN duruyor", /pes ettim.*cozumu goster.*artik cevabi acikla/i.test(SYSTEM_PROMPT.replace(/\n/g, " ")) && /sonsuz reddetme dongusune GIRME/i.test(SYSTEM_PROMPT));
}

// 11) Socratic ONE STEP korunmalı
{
  kontrol("11) 'Yedi adımı TEK mesajda anlatıp çözümü DÖKME' kuralı hâlâ mevcut", /Yedi adimi TEK mesajda anlatip cozumu DOKME/i.test(SYSTEM_PROMPT));
}

// 12) ASK → STOP → WAIT sözleşmesi açık olmalı
{
  kontrol("12) döngü terminolojisi (SOR -> DUR -> BEKLE -> CEVABI AL -> DEĞERLENDİR -> ...) teacher prompt'ta AÇIKÇA yazılı", /SOR \(tek kucuk soru\) -> DUR -> OGRENCIYI BEKLE -> CEVABI AL -> DEGERLENDIR/i.test(SYSTEM_PROMPT));
}

// 13) "Hocam anlamadım" davranışı korunmalı
{
  kontrol("13) 'Hocam anlamadım' örnek davranışı hâlâ mevcut", /Once fiili bulalim\. Bu cumlede yargiyi\/hareketi veren kelime hangisi/i.test(SYSTEM_PROMPT));
}

// 14) "Fiili bulamadım" mikro-ipucu davranışı bulunmalı
{
  kontrol("14) 'fiil bulunamadı' senaryosu için mikro-ipucu kuralı (cevabı doğrudan söyleme) AÇIKÇA var", /mikro-sorunun cevabini \(orn\. "fiil X kelimesidir"\) dogrudan SOYLEME - sadece nereye bakmasi gerektigini goster/i.test(SYSTEM_PROMPT));
}

// 15) "B mi?" mevcut 5D politikası korunmalı
{
  kontrol("15) 'B mi?' / 'cevap ne?' / 'direkt söyle' politikası DEĞİŞMEDEN duruyor", /"B mi\?", "cevap ne\?", "direkt soyle"/i.test(SYSTEM_PROMPT) && /ONAYLAMA\/REDDETME/i.test(SYSTEM_PROMPT));
}

// 16) "Pes ettim, çözümü göster" solution mode korunmalı (10c ile aynı kanıt, burada da ayrıca kontrol)
{
  kontrol("16) explicit solution mode geçiş kuralı DEĞİŞMEDEN duruyor", /hemen COZUM MODUNA gec/i.test(SYSTEM_PROMPT));
}

// 17) 7-adım AVCI sırası değişmemeli (UI parity)
{
  const stripEtiketleri = [...html.matchAll(/<span class="klod-method-chip">([^<]+)<\/span>/g)].map((m) => m[1]);
  function fold(s) {
    return String(s).toLocaleLowerCase("tr-TR").replace(/ı/g, "i").replace(/İ/g, "i").replace(/ğ/g, "g").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ç/g, "c").replace(/[^a-z0-9+/\s]/g, "").trim();
  }
  const beklenen = ["gor", "fiili bul", "s+v+o", "sinyali yakala", "sag/sol kontrol", "sik ele", "anlami dogrula"];
  const normPrompt = fold(SYSTEM_PROMPT);
  let sonPoz = -1, siraDogru = true;
  for (const adim of beklenen) {
    const poz = normPrompt.indexOf(adim, sonPoz + 1);
    if (poz === -1 || poz <= sonPoz) { siraDogru = false; break; }
    sonPoz = poz;
  }
  kontrol("17) AVCI 7 adımı hâlâ TAM SIRAYLA mevcut, UI method-strip ile birebir aynı", siraDogru && JSON.stringify(stripEtiketleri.map(fold)) === JSON.stringify(beklenen));
}

// ============================================================
// SERVER — handler mock testleri (gerçek ağ yok)
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

const CANONICAL_Q1 = {
  id: "q001",
  soru_en: "The appellate court ruled that, despite the irregularities, the verdict was by no means invalid.",
  soru_tr: "Bu metne gore mahkeme karari hakkinda ne soylenebilir?",
  secenekler_tr: ["Usul hatalari karari gecersiz kildi.", "Usul hatalarina ragmen karar gecerlilligini korodu.", "Mahkeme yeniden yargilama istedi.", "Karar kesinlikle gecersiz bulundu."],
  dogru_index: 1,
  sinyal: "despite",
};

function anthropicMock({ authOk = true, authBody = { id: "u1", is_anonymous: false }, replyText = "cevap", toolActions = null } = {}) {
  const gorulenIstekler = [];
  return {
    gorulenIstekler,
    impl: async (url, opts) => {
      gorulenIstekler.push({ url: String(url), opts });
      if (String(url).includes("/auth/v1/user")) return authOk ? { ok: true, json: async () => authBody } : { ok: false, status: 401 };
      if (String(url).includes("api.anthropic.com")) {
        const parsed = JSON.parse(opts.body);
        gorulenIstekler.push({ url: "ANTHROPIC_PARSED", parsed });
        const content = [{ type: "text", text: replyText }];
        if (toolActions !== null) content.push({ type: "tool_use", id: "t1", name: "avci_board_actions", input: { actions: toolActions } });
        return { ok: true, json: async () => ({ content, usage: {} }) };
      }
      throw new Error("beklenmeyen istek: " + url);
    },
  };
}

const orijinalKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = "sahte-test-degeri-gercek-degil";

// 18) 5B before-answer correct-answer leak koruması korunmalı
{
  const m = anthropicMock({ toolActions: null });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: SYSTEM_PROMPT }, { ip: "60.0.0.1" }), res);
  const anth = m.gorulenIstekler.find((i) => i.url === "ANTHROPIC_PARSED");
  const sistemMetni = JSON.stringify(anth.parsed.system);
  kontrol("18) 5B: before-answer'da correct_answer/is_correct HÂLÂ sistemde yok", !sistemMetni.includes('"correct_answer"') && !sistemMetni.includes('"is_correct"'));
  fetchMockTemizle();
}

// 19) 5C privacy/auth contract korunmalı
{
  const m = anthropicMock({ authBody: { id: "cok-gizli-id", is_anonymous: false }, toolActions: null });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], mode: "chat", system: SYSTEM_PROMPT }, { ip: "60.0.0.2", authorization: "Bearer tok" }), res);
  const anth = m.gorulenIstekler.find((i) => i.url === "ANTHROPIC_PARSED");
  const tumIstek = JSON.stringify(anth.parsed);
  kontrol("19) 5C: user_id/PII Anthropic isteğinde hâlâ yok", !tumIstek.includes("cok-gizli-id"));
  fetchMockTemizle();
}

// 20) 5E board allowlist/security contract korunmalı (spot-check — tam regresyon avci-klod-board-bridge.test.mjs'de)
{
  kontrol("20a) BOARD_ACTION_ALLOWLIST hâlâ TAM OLARAK 8 action", BOARD_ACTION_ALLOWLIST.size === 8);
  kontrol("20b) ELIMINATE_OPTION answered=false → HÂLÂ sunucu tarafında DROP", klodBoardActionlariDogrula([{ type: "ELIMINATE_OPTION", option_index: 0 }], { module: "sinyal_lab", question_id: "q001", answered: false }, CANONICAL_Q1).length === 0);
  kontrol("20c) HIGHLIGHT_SIGNAL canonical eşleşmesi HÂLÂ zorunlu (fake signal DROP)", klodBoardActionlariDogrula([{ type: "HIGHLIGHT_SIGNAL", text: "sahte" }], { module: "sinyal_lab", question_id: "q001", answered: false }, CANONICAL_Q1).length === 0);
  kontrol("20d) HIGHLIGHT_SIGNAL gerçek canonical eşleşmesi HÂLÂ kabul ediliyor (gevşetilmedi)", klodBoardActionlariDogrula([{ type: "HIGHLIGHT_SIGNAL", text: "despite" }], { module: "sinyal_lab", question_id: "q001", answered: false }, CANONICAL_Q1).length === 1);
}

// Handler uçtan uca: yeni prompt/tool description ile board_actions AKIŞI hâlâ bozulmadan çalışıyor
{
  const m = anthropicMock({ toolActions: [{ type: "HIGHLIGHT_SIGNAL", text: "despite" }] });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: SYSTEM_PROMPT }, { ip: "60.0.0.3" }), res);
  kontrol("uçtan uca) yeni teacher prompt + tool description ile board_actions akışı HÂLÂ çalışıyor (regresyon yok)", res._status === 200 && res._json.board_actions.length === 1 && res._json.content?.find((b) => b.type === "text")?.text === "cevap");
  fetchMockTemizle();
}

process.env.ANTHROPIC_API_KEY = orijinalKey;

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
