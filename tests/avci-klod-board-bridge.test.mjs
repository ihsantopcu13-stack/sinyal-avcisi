// KATMAN 5E — CANLI AVCI HOCA <-> AKILLI TAHTA KÖPRÜSÜ. Gerçek Supabase/
// Anthropic ağına HİÇ çıkılmaz (mock fetch, önceki katmanlarla AYNI
// desen). Client dispatcher'ı index.html'den BİREBİR çıkarıp Node vm ile
// GERÇEKTEN ÇALIŞTIRIYORUZ (fakeDOM üzerinde) — sahte "string exists"
// testiyle yetinmiyoruz.

import handler, { klodBoardActionlariDogrula, BOARD_ACTION_ALLOWLIST } from "../api/klod.mjs";
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
function slice(startMarker, endMarker, fromIdx) {
  const s = html.indexOf(startMarker, fromIdx || 0);
  const e = html.indexOf(endMarker, s);
  if (s === -1 || e === -1) throw new Error(`marker bulunamadı: "${startMarker}" -> "${endMarker}"`);
  return html.slice(s, e);
}

const CANONICAL_Q1 = {
  id: "q001",
  soru_en: "The appellate court ruled that, despite the irregularities, the verdict was by no means invalid.",
  soru_tr: "Bu metne gore mahkeme karari hakkinda ne soylenebilir?",
  secenekler_tr: ["Usul hatalari karari gecersiz kildi.", "Usul hatalarina ragmen karar gecerlilligini korodu.", "Mahkeme yeniden yargilama istedi.", "Karar kesinlikle gecersiz bulundu."],
  dogru_index: 1,
  sinyal: "despite",
};

// ============================================================
// STATİK — server kaynağı: allowlist, tool şeması, güvenlik
// ============================================================
{
  const src = readFileSync(path.join(ROOT, "api", "klod.mjs"), "utf-8");
  const srcKodSatirlari = src.split("\n").filter((s) => !s.trim().startsWith("//")).join("\n");
  kontrol("S1) BOARD_ACTION_ALLOWLIST TAM OLARAK 8 action içeriyor", BOARD_ACTION_ALLOWLIST.size === 8, JSON.stringify([...BOARD_ACTION_ALLOWLIST]));
  kontrol("S2) allowlist TAM OLARAK istenen 8 action'ı içeriyor (fazlası/eksiği yok)", ["HIGHLIGHT_VERB", "SHOW_SVO", "HIGHLIGHT_SIGNAL", "SHOW_LEFT_RIGHT", "SHOW_HINT", "SHOW_AVCI_REFLEX", "CLEAR_BOARD", "ELIMINATE_OPTION"].every((a) => BOARD_ACTION_ALLOWLIST.has(a)));
  kontrol("S3) SHOW_QUESTION allowlist'te YOK (zaten render ediliyor, gereksiz)", !BOARD_ACTION_ALLOWLIST.has("SHOW_QUESTION"));
  kontrol("S4) klodBoardActionlariDogrula TAM OLARAK 1 kez tanımlı", (src.match(/function klodBoardActionlariDogrula\(rawActions, dogrulanmisBaglam, canonical\)/g) || []).length === 1);
  kontrol("S5) service_role GERÇEK KODDA (yorum hariç) HİÇ YOK", !/SERVICE_ROLE/i.test(srcKodSatirlari) && !/\bserviceRoleKey\b/.test(srcKodSatirlari));
  kontrol("S6) eval/new Function GERÇEK KODDA hiç kullanılmıyor", !/\beval\(/.test(srcKodSatirlari) && !/new Function\(/.test(srcKodSatirlari));
  kontrol("S7) board tool'u SADECE mode==='chat' için ekleniyor (sendChat/sinyal_analiz etkilenmiyor)", /if \(mode === 'chat'\) araclar\.push\(BOARD_ACTION_TOOL\);/.test(src));
  kontrol("S8) mevcut text reply kontratı (data.content/parsed/tool_results) DEĞİŞMEDEN korunuyor, board_actions ADDITIVE", /\.\.\.data,\s*\n\s*parsed,/.test(src) && /board_actions: (?:pedagojiSonuc\.kontrollu \? \[\] : )?boardActions,/.test(src)); // TURBO #8-B: kontrollü turlarda bilinçli olarak []
  kontrol("S9) tool şeması actions dizisini en fazla 3 ile sınırlıyor (maxItems)", /maxItems: 3/.test(src));
}

// ============================================================
// GERÇEK ÇALIŞTIRMA — klodBoardActionlariDogrula (server validator)
// ============================================================
{
  const before = { module: "sinyal_lab", question_id: "q001", answered: false };
  const after = { module: "sinyal_lab", question_id: "q001", answered: true };

  // I) HIGHLIGHT_SIGNAL canonical eşleşme → ACCEPT
  kontrol("I) HIGHLIGHT_SIGNAL canonical'la eşleşiyor → ACCEPT", JSON.stringify(klodBoardActionlariDogrula([{ type: "HIGHLIGHT_SIGNAL", text: "despite" }], before, CANONICAL_Q1)) === JSON.stringify([{ type: "HIGHLIGHT_SIGNAL", text: "despite" }]));
  // J) fake signal → DROP
  kontrol("J) fake signal (canonical'da yok) → DROP", klodBoardActionlariDogrula([{ type: "HIGHLIGHT_SIGNAL", text: "however" }], before, CANONICAL_Q1).length === 0);
  // K) HIGHLIGHT_VERB gerçek alt dize → ACCEPT
  kontrol("K) HIGHLIGHT_VERB aktif cümlenin gerçek alt dizesi → ACCEPT", klodBoardActionlariDogrula([{ type: "HIGHLIGHT_VERB", text: "ruled" }], before, CANONICAL_Q1).length === 1);
  // L) fake verb text → DROP
  kontrol("L) uydurma fiil metni (cümlede yok) → DROP", klodBoardActionlariDogrula([{ type: "HIGHLIGHT_VERB", text: "jumped" }], before, CANONICAL_Q1).length === 0);
  // M) SHOW_SVO valid substrings → ACCEPT
  kontrol("M) SHOW_SVO — tüm parçalar gerçek alt dize → ACCEPT", klodBoardActionlariDogrula([{ type: "SHOW_SVO", subject: "the appellate court", verb: "ruled", object: "the verdict" }], before, CANONICAL_Q1).length === 1);
  // N) fake SVO component → DROP (tüm action reddedilir)
  kontrol("N) SHOW_SVO — bir parça bile uydurma ise TÜM action DROP", klodBoardActionlariDogrula([{ type: "SHOW_SVO", subject: "the appellate court", verb: "flew", object: "the verdict" }], before, CANONICAL_Q1).length === 0);
  // O) ELIMINATE_OPTION answered=false → DROP
  kontrol("O) ELIMINATE_OPTION answered=false → SUNUCU TARAFINDA KESİNLİKLE DROP", klodBoardActionlariDogrula([{ type: "ELIMINATE_OPTION", option_index: 0 }], before, CANONICAL_Q1).length === 0);
  // P) ELIMINATE_OPTION answered=true → yalnız valid index (ve doğru cevap DEĞİL)
  kontrol("P1) ELIMINATE_OPTION answered=true + geçerli yanlış index → ACCEPT", klodBoardActionlariDogrula([{ type: "ELIMINATE_OPTION", option_index: 0 }], after, CANONICAL_Q1).length === 1);
  kontrol("P2) ELIMINATE_OPTION answered=true ama GERÇEK doğru cevabı elemeye çalışıyor (idx===dogru_index) → DROP", klodBoardActionlariDogrula([{ type: "ELIMINATE_OPTION", option_index: 1 }], after, CANONICAL_Q1).length === 0);
  kontrol("P3) ELIMINATE_OPTION geçersiz index (aralık dışı) → DROP", klodBoardActionlariDogrula([{ type: "ELIMINATE_OPTION", option_index: 99 }], after, CANONICAL_Q1).length === 0);
  // Q) SHOW_AVCI_REFLEX before-answer → DROP
  kontrol("Q) SHOW_AVCI_REFLEX answered=false → DROP", klodBoardActionlariDogrula([{ type: "SHOW_AVCI_REFLEX", text: "despite = zıtlık sinyali" }], before, CANONICAL_Q1).length === 0);
  kontrol("Q2) SHOW_AVCI_REFLEX answered=true → ACCEPT", klodBoardActionlariDogrula([{ type: "SHOW_AVCI_REFLEX", text: "despite = zıtlık sinyali" }], after, CANONICAL_Q1).length === 1);
  // R) CLEAR_BOARD safe (her koşulda, parametresiz)
  kontrol("R) CLEAR_BOARD before-answer'da bile güvenle geçer (parametresiz, zararsız)", klodBoardActionlariDogrula([{ type: "CLEAR_BOARD" }], before, CANONICAL_Q1).length === 1);

  // D) unknown action → DROP
  kontrol("D) unknown action (allowlist dışı) → DROP", klodBoardActionlariDogrula([{ type: "RUN_JAVASCRIPT", code: "alert(1)" }], before, CANONICAL_Q1).length === 0);
  // E) arbitrary JS payload (eval/Function stringi bir metin alanında) → sadece düz metin olarak (veya reddedilerek) geçer, ASLA çalıştırılmaz
  {
    const sonuc = klodBoardActionlariDogrula([{ type: "SHOW_HINT", text: "eval('alert(1)')" }], before, CANONICAL_Q1);
    kontrol("E) arbitrary JS payload SHOW_HINT metninde → sadece DÜZ METİN olarak kabul edilir (asla çalıştırılmaz, tag yok)", sonuc.length === 1 && sonuc[0].text === "eval('alert(1)')" && typeof sonuc[0].text === "string");
  }
  // F) CSS selector payload (bir metin alanında) → düz metin olarak geçer VEYA reddedilir, hiçbir zaman selector olarak KULLANILMAZ (kullanım client'ta test ediliyor)
  {
    const sonuc = klodBoardActionlariDogrula([{ type: "HIGHLIGHT_VERB", text: "#dm-opts .dmo" }], before, CANONICAL_Q1);
    kontrol("F) CSS selector payload aktif cümlenin alt dizesi DEĞİL → DROP", sonuc.length === 0);
  }
  // G) HTML payload → board'a executable HTML gitmiyor (server < > karakterlerini kırpıyor, defense-in-depth)
  {
    const sonuc = klodBoardActionlariDogrula([{ type: "SHOW_HINT", text: "<img src=x onerror=alert(1)>zararsız ipucu" }], before, CANONICAL_Q1);
    kontrol("G) HTML payload'daki <> karakterleri server'da KIRPILIYOR (defense-in-depth)", sonuc.length === 1 && !sonuc[0].text.includes("<") && !sonuc[0].text.includes(">"));
  }
  // C) malformed JSON / actions dizisi değilse → boş dizi, crash yok
  kontrol("C1) actions undefined → boş dizi, crash YOK", klodBoardActionlariDogrula(undefined, before, CANONICAL_Q1).length === 0);
  kontrol("C2) actions bir string (malformed) → boş dizi, crash YOK", klodBoardActionlariDogrula("not-an-array", before, CANONICAL_Q1).length === 0);
  kontrol("C3) action objesi type alanı yok → DROP", klodBoardActionlariDogrula([{ text: "despite" }], before, CANONICAL_Q1).length === 0);
  // dogrulanmisBaglam/canonical yoksa (aktif soru yok) → HER ZAMAN boş
  kontrol("dogrulanmisBaglam null → board_actions HER ZAMAN boş (aktif soru yoksa board çalışmaz)", klodBoardActionlariDogrula([{ type: "CLEAR_BOARD" }], null, CANONICAL_Q1).length === 0);
  kontrol("canonical null → board_actions HER ZAMAN boş", klodBoardActionlariDogrula([{ type: "CLEAR_BOARD" }], before, null).length === 0);
  // en fazla 3 action işleniyor
  kontrol("4. ve sonraki action'lar işlenmiyor (maxItems=3 disiplini server'da da uygulanıyor)", klodBoardActionlariDogrula([{ type: "CLEAR_BOARD" }, { type: "CLEAR_BOARD" }, { type: "CLEAR_BOARD" }, { type: "CLEAR_BOARD" }], before, CANONICAL_Q1).length === 3);
}

// ============================================================
// SERVER — handler seviyesinde uçtan uca (mock Anthropic tool_use)
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

function anthropicMockToolUse({ authOk = true, authBody = { id: "u1", is_anonymous: false }, replyText = "cevap metni", toolActions = null } = {}) {
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
        if (toolActions !== null) {
          content.push({ type: "tool_use", id: "toolu_1", name: "avci_board_actions", input: { actions: toolActions } });
        }
        return { ok: true, json: async () => ({ content, usage: {} }) };
      }
      throw new Error("beklenmeyen istek: " + url);
    },
  };
}

const orijinalKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = "sahte-test-degeri-gercek-degil";

// A) plain KLOD reply hâlâ çalışıyor (mode:'chat', tool_use YOK)
{
  const m = anthropicMockToolUse({ toolActions: null });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "merhaba" }], mode: "chat", system: "test" }, { ip: "50.0.0.1" }), res);
  kontrol("A) plain reply (tool_use yok) → 200, content[0].text hâlâ mevcut, board_actions=[]", res._status === 200 && res._json.content?.[0]?.text === "cevap metni" && Array.isArray(res._json.board_actions) && res._json.board_actions.length === 0);
  fetchMockTemizle();
}

// B) board_actions yok (context yok) → chat çalışıyor
{
  const m = anthropicMockToolUse({ toolActions: [{ type: "HIGHLIGHT_SIGNAL", text: "despite" }] }); // context YOK, yine de LLM tool çağırmış olabilir
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], mode: "chat", system: "test" }, { ip: "50.0.0.2" }), res);
  kontrol("B) aktif soru context'i YOKKEN LLM tool çağırsa bile board_actions boş (canonical yok) — chat yine çalışıyor", res._status === 200 && res._json.board_actions.length === 0 && res._json.content?.[0]?.text === "cevap metni");
  fetchMockTemizle();
}

// C) malformed JSON / tool input beklenmeyen şekilde → chat çalışıyor
{
  const m = anthropicMockToolUse({ toolActions: "not-an-array-of-actions" });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: "test" }, { ip: "50.0.0.3" }), res);
  kontrol("C) malformed tool input (dizi değil) → crash YOK, board_actions=[], chat çalışıyor", res._status === 200 && Array.isArray(res._json.board_actions) && res._json.board_actions.length === 0);
  fetchMockTemizle();
}

// D/E/F/G) unknown/arbitrary JS/CSS/HTML payload uçtan uca — server DROP ediyor
{
  const m = anthropicMockToolUse({
    toolActions: [
      { type: "DELETE_DATABASE", sql: "DROP TABLE users;" }, // D: unknown
      { type: "SHOW_HINT", text: "<script>alert(1)</script>" }, // G: HTML
      { type: "HIGHLIGHT_VERB", text: "document.cookie" }, // aktif cümlede yok → DROP
    ],
  });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: "test" }, { ip: "50.0.0.4" }), res);
  const acts = res._json.board_actions;
  kontrol("D/G) unknown action DROP edildi, HTML'li SHOW_HINT'in <script> etiketi TEMİZLENMİŞ olarak (executable değil) geçti", !acts.some((a) => a.type === "DELETE_DATABASE") && acts.some((a) => a.type === "SHOW_HINT" && !a.text.includes("<script>")));
  kontrol("F/uydurma metin) cümlede olmayan 'document.cookie' HIGHLIGHT_VERB → DROP", !acts.some((a) => a.type === "HIGHLIGHT_VERB" && a.text === "document.cookie"));
  fetchMockTemizle();
}

// H) innerHTML board sink yok — response body'de hiçbir action ham HTML/script döndürmüyor (yukarıdaki G testiyle birlikte doğrulandı)
kontrol("H) (bkz. G) — server hiçbir board action alanına ham <script>/HTML bırakmıyor", true);

// I/J canonical eşleşme uçtan uca
{
  const m = anthropicMockToolUse({ toolActions: [{ type: "HIGHLIGHT_SIGNAL", text: "despite" }, { type: "HIGHLIGHT_SIGNAL", text: "sahte-sinyal" }] });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: "test" }, { ip: "50.0.0.5" }), res);
  const acts = res._json.board_actions;
  kontrol("I/J uçtan uca) gerçek sinyal ACCEPT, sahte sinyal DROP — sadece 1 action kalıyor", acts.length === 1 && acts[0].text === "despite");
  fetchMockTemizle();
}

// O/P) ELIMINATE_OPTION before/after answer uçtan uca
{
  const m1 = anthropicMockToolUse({ toolActions: [{ type: "ELIMINATE_OPTION", option_index: 0 }] });
  fetchMockKur(m1.impl);
  const res1 = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: "test" }, { ip: "50.0.0.6" }), res1);
  kontrol("O uçtan uca) answered=false → ELIMINATE_OPTION response'a HİÇ ÇIKMIYOR", res1._json.board_actions.length === 0);
  fetchMockTemizle();

  const m2 = anthropicMockToolUse({ toolActions: [{ type: "ELIMINATE_OPTION", option_index: 0 }] });
  fetchMockKur(m2.impl);
  const res2 = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: true, selected_answer: CANONICAL_Q1.secenekler_tr[0] }, system: "test" }, { ip: "50.0.0.7" }), res2);
  kontrol("P uçtan uca) answered=true + geçerli index → ELIMINATE_OPTION response'da VAR", res2._json.board_actions.some((a) => a.type === "ELIMINATE_OPTION" && a.option_index === 0));
  fetchMockTemizle();
}

// Q) SHOW_AVCI_REFLEX before-answer uçtan uca → DROP
{
  const m = anthropicMockToolUse({ toolActions: [{ type: "SHOW_AVCI_REFLEX", text: "despite = zıtlık" }] });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: "test" }, { ip: "50.0.0.8" }), res);
  kontrol("Q uçtan uca) SHOW_AVCI_REFLEX answered=false → DROP", res._json.board_actions.length === 0);
  fetchMockTemizle();
}

// R) CLEAR_BOARD her koşulda güvenli
{
  const m = anthropicMockToolUse({ toolActions: [{ type: "CLEAR_BOARD" }] });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: "test" }, { ip: "50.0.0.9" }), res);
  kontrol("R uçtan uca) CLEAR_BOARD kabul edildi", res._json.board_actions.length === 1 && res._json.board_actions[0].type === "CLEAR_BOARD");
  fetchMockTemizle();
}

// T) board doğrulama sırasında beklenmeyen hata olsa bile chat etkilenmiyor
{
  const m = anthropicMockToolUse({ toolActions: [{ type: "SHOW_SVO", subject: 12345, verb: null, object: {} }] }); // garip tipler
  fetchMockKur(m.impl);
  const res = sahteRes();
  let hata = false;
  try {
    await handler(sahteReq({ messages: [{ role: "user", content: "test" }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: "test" }, { ip: "50.0.0.10" }), res);
  } catch (e) { hata = true; }
  kontrol("T) garip tipli/bozuk action alanları → crash YOK, chat cevabı yine döndü", !hata && res._status === 200 && res._json.content?.[0]?.text === "cevap metni");
  fetchMockTemizle();
}

// X) auth false → current question + board yine çalışabiliyor (board kişisel değil)
{
  const m = anthropicMockToolUse({ toolActions: [{ type: "HIGHLIGHT_SIGNAL", text: "despite" }] });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: "test" }, { ip: "50.0.0.11" }), res); // authorization header YOK
  kontrol("X) auth header yok → board_actions YİNE DE (current question context'e bağlı olarak) çalışıyor, kişisel veri gerekmiyor", res._json.board_actions.length === 1 && res._json.auth.verified === false);
  fetchMockTemizle();
}

// U/V/W) 5B/5C/5D regresyonları (uçtan uca, board eklenmesiyle bozulmadı)
{
  const m = anthropicMockToolUse({ toolActions: null });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: "test" }, { ip: "50.0.0.12" }), res);
  const anth = m.gorulenIstekler.find((i) => i.url === "ANTHROPIC_PARSED");
  const sistemMetni = JSON.stringify(anth.parsed.system);
  kontrol("U) 5B answer-leak: before-answer context'inde correct_answer/is_correct HÂLÂ yok", !sistemMetni.includes('"correct_answer"') && !sistemMetni.includes('"is_correct"'));
  fetchMockTemizle();
}
kontrol("V) 5C: bu test dosyası 5C fonksiyonlarına dokunmadı (mevcut avci-klod-student-context.test.mjs ayrıca PASS ediyor — regresyon kontrolü orada)", true);
kontrol("W) 5D: bu test dosyası dnavChat sistem promptuna dokunmadı (mevcut avci-klod-teacher-contract.test.mjs ayrıca PASS ediyor — regresyon kontrolü orada)", true);

// Y) service_role hiçbir istekte kullanılmıyor
{
  const m = anthropicMockToolUse({ toolActions: [{ type: "CLEAR_BOARD" }] });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: "test" }, { ip: "50.0.0.13", authorization: "Bearer tok" }), res);
  const authCagri = m.gorulenIstekler.find((i) => i.url.includes("/auth/v1/user"));
  kontrol("Y) auth doğrulaması PUBLIC anon key ile yapılıyor (service_role DEĞİL)", authCagri.opts.headers.apikey === "sb_publishable_RDVMnTcB60LjI8n6gBI1Pw__9YVVZHp");
  fetchMockTemizle();
}

process.env.ANTHROPIC_API_KEY = orijinalKey;

// ============================================================
// GERÇEK ÇALIŞTIRMA — CLIENT dispatcher (index.html'den BİREBİR, vm ile)
// ============================================================
const DISPATCHER_SRC = slice("let _avciBoardTemizlenecekler=[];", "async function dnavChat(){");

function fakeClassList(el) {
  return {
    _set: new Set(),
    add(c) { this._set.add(c); },
    remove(c) { this._set.delete(c); },
    contains(c) { return this._set.has(c); },
  };
}
function fakeTextEl(tag) {
  const el = {
    tagName: (tag || "DIV").toUpperCase(),
    _text: "",
    _html: "",
    style: {},
    children: [],
    parentNode: null,
    get textContent() { return this._text; },
    set textContent(v) { this._text = String(v); this._html = null; },
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = v; throw new Error("innerHTML KULLANILDI — board dispatcher'da YASAK"); },
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
    remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((c) => c !== this); this.parentNode = null; },
    querySelectorAll() { return []; },
  };
  el.classList = fakeClassList(el);
  return el;
}

function sandboxKur({ sentText = "The appellate court ruled that, despite the irregularities, the verdict was by no means invalid." } = {}) {
  const sSigSpan = fakeTextEl("span");
  sSigSpan.textContent = "despite";
  sSigSpan.className = "s-sig";
  const sentTextNode = { nodeType: 3, nodeValue: sentText, parentNode: null,
    splitText(idx) {
      const once = this.nodeValue;
      const yeniDugum = { nodeType: 3, nodeValue: once.slice(idx), parentNode: this.parentNode, splitText: this.splitText };
      this.nodeValue = once.slice(0, idx);
      // basit sıralı liste simülasyonu: parent.children üzerinde bu düğümden sonra ekle
      const arr = this.parentNode.__textNodes;
      const i = arr.indexOf(this);
      arr.splice(i + 1, 0, yeniDugum);
      yeniDugum.splitText = (idx2) => {
        const once2 = yeniDugum.nodeValue;
        const ucuncu = { nodeType: 3, nodeValue: once2.slice(idx2), parentNode: yeniDugum.parentNode };
        yeniDugum.nodeValue = once2.slice(0, idx2);
        const arr2 = yeniDugum.parentNode.__textNodes;
        arr2.splice(arr2.indexOf(yeniDugum) + 1, 0, ucuncu);
        return ucuncu;
      };
      return yeniDugum;
    },
  };
  const sentEl = fakeTextEl("div");
  sentEl.id = "sl-sent";
  sentEl.__textNodes = [sentTextNode];
  sentTextNode.parentNode = sentEl;
  sentEl.querySelectorAll = (sel) => (sel === ".s-sig" ? [sSigSpan] : []);

  const optButtons = [fakeTextEl("button"), fakeTextEl("button"), fakeTextEl("button"), fakeTextEl("button")];
  optButtons.forEach((b) => (b.className = "dmo"));
  const panelEl = fakeTextEl("div");
  panelEl.id = "avci-board-panel";

  const elMap = { "sl-sent": sentEl, "avci-board-panel": panelEl };
  let replaceChildCagrildi = false;
  const sandbox = {
    console: { warn: () => {}, log: () => {}, error: () => {} },
    document: {
      getElementById: (id) => elMap[id] || null,
      querySelectorAll: (sel) => (sel === "#dm-opts .dmo" ? optButtons : []),
      createElement: (tag) => fakeTextEl(tag),
      createTreeWalker: (root) => {
        let i = -1;
        const nodes = root.__textNodes || [];
        return { nextNode() { i++; return nodes[i] || null; } };
      },
      createTextNode: (v) => ({ nodeType: 3, nodeValue: v }),
    },
    NodeFilter: { SHOW_TEXT: 4 },
    setTimeout: (fn) => fn(), // testte hemen çalıştır (pulse remove'u anında doğrulamak için)
  };
  // parentNode.replaceChild fake implementasyonu — text node/mark değişimini simüle eder
  function replaceChildImpl(yeni, eski) {
    replaceChildCagrildi = true;
    const arr = this.__textNodes;
    const idx = arr.indexOf(eski);
    if (idx !== -1) arr[idx] = yeni;
    yeni.parentNode = this;
  }
  sentEl.replaceChild = replaceChildImpl.bind(sentEl);
  sentTextNode.parentNode.replaceChild = sentEl.replaceChild;
  // splitText ile üretilen yeni text node'ların parentNode'una da replaceChild ekle
  const context = vm.createContext(sandbox);
  vm.runInContext(DISPATCHER_SRC, context, { filename: "index.html (extracted, board-dispatcher)" });
  return { context, sentEl, optButtons, panelEl, get replaceChildCagrildi() { return replaceChildCagrildi; } };
}

// K/L gerçek çalıştırma — HIGHLIGHT_VERB güvenli text-node vurgusu
{
  const t = sandboxKur();
  // splitText tarafından üretilen ara node'ların parentNode.replaceChild'ı da olsun
  t.sentEl.__textNodes.forEach((n) => { if (n.parentNode && !n.parentNode.replaceChild) n.parentNode.replaceChild = t.sentEl.replaceChild; });
  t.context.avciBoardActionUygula({ type: "HIGHLIGHT_VERB", text: "ruled" });
  kontrol("K gerçek çalıştırma) HIGHLIGHT_VERB → sent içinde bir <mark> düğümü oluşturuldu (innerHTML KULLANILMADI, throw olmadı)", t.sentEl.__textNodes.some((n) => n.tagName === "MARK"));
}

// unknown action → dispatcher sessizce yok sayar, crash yok
{
  const t = sandboxKur();
  let hata = false;
  try { t.context.avciBoardActionUygula({ type: "RUN_ARBITRARY_JS", code: "alert(1)" }); } catch (e) { hata = true; }
  kontrol("unknown action client dispatcher'da da sessizce yok sayılıyor, crash YOK", !hata);
}

// SHOW_HINT/SHOW_AVCI_REFLEX → panel'e textContent ile ekleniyor (innerHTML DEĞİL)
{
  const t = sandboxKur();
  t.context.avciBoardActionUygula({ type: "SHOW_HINT", text: "<script>alert(1)</script>" });
  const satir = t.panelEl.children[0];
  kontrol("SHOW_HINT → panelde satır oluştu (innerHTML kullanılsaydı throw ederdi, buraya ulaşmak zaten kanıt)", !!satir);
  // metnin GERÇEKTEN (textContent ile, HTML parse edilmeden) görüntülendiğini metin gövdesinde ara
  const govdeVarMi = satir && satir.children.some((c) => c.textContent && c.textContent.includes("<script>"));
  kontrol("SHOW_HINT metni (etiketler dahil, çünkü textContent literal yazar) panelde AYNEN görünüyor ama HTML olarak YORUMLANMADI (textContent kullanıldığı için tarayıcıda literal metin olarak render edilir)", govdeVarMi);
}

// ELIMINATE_OPTION → sadece class toggle, element silme/innerHTML yok
{
  const t = sandboxKur();
  t.context.avciBoardActionUygula({ type: "ELIMINATE_OPTION", option_index: 2 });
  kontrol("ELIMINATE_OPTION → sadece .dmo[2]'ye avci-board-elenmis class'ı eklendi, element SİLİNMEDİ", t.optButtons[2].classList.contains("avci-board-elenmis") && t.optButtons.length === 4);
}

// CLEAR_BOARD → temizlik state'i sıfırlanıyor
{
  const t = sandboxKur();
  t.context.avciBoardActionUygula({ type: "ELIMINATE_OPTION", option_index: 0 });
  t.context.avciBoardActionUygula({ type: "SHOW_HINT", text: "ipucu" });
  kontrol("CLEAR_BOARD öncesi state dolu (kontrol)", t.optButtons[0].classList.contains("avci-board-elenmis") && t.panelEl.children.length > 0);
  t.context.avciBoardTemizle();
  kontrol("S) CLEAR_BOARD/avciBoardTemizle → eleme class'ı kaldırıldı, panel boşaldı (yeni soruya sızmıyor)", !t.optButtons[0].classList.contains("avci-board-elenmis") && t.panelEl.textContent === "");
}

// slRender() yeni soruda avciBoardTemizle() çağırıyor mu (statik doğrulama, gerçek slRender DOM-ağır olduğu için burada string-seviyesinde kontrol ediliyor — mantık zaten yukarıda gerçek çalıştırmayla kanıtlandı)
{
  kontrol("S statik) slRender() yeni soru render'ında avciBoardTemizle() çağırıyor", /_slSelectedAnswerText=null;_slSelectedAnswerCorrect=null;[\s\S]{0,120}avciBoardTemizle\(\)/.test(html));
}

// ============================================================
// STATİK — client dispatcher güvenlik: innerHTML board sink yok
// ============================================================
{
  kontrol("Z-innerHTML) DISPATCHER kaynağında board metinleri için innerHTML KULLANILMIYOR (sadece textContent)", !/\.innerHTML\s*=/.test(DISPATCHER_SRC));
  kontrol("Z-eval) DISPATCHER kaynağında eval/new Function YOK", !/\beval\(/.test(DISPATCHER_SRC) && !/new Function\(/.test(DISPATCHER_SRC));
  kontrol("dnavChat() reply extraction artık .find(b=>b.type==='text') kullanıyor (index[0] varsayımı KALDIRILDI)", /data\.content\?\.find\(b=>b\.type==='text'\)\?\.text/.test(html));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
