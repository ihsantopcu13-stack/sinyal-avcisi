// KATMAN 5 MVP-1 — KLOD AUTH FOUNDATION testleri. Gerçek Supabase/
// Anthropic ağına HİÇ çıkılmaz — global fetch geçici olarak sahte bir
// implementasyonla değiştirilir (her testten sonra orijinaline geri
// döndürülür). Bu turda hiçbir kişisel context (soru/öğrenci/teşhis)
// eklenmedi — SADECE doğrulama zincirinin (header yok/bozuk/geçersiz/
// süresi dolmuş/geçerli/anonim) isteği ASLA engellemediğini ve hiçbir
// PII/secret/token'ın loglanmadığını/response'a sızmadığını doğrular.

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

function sahteRes() {
  const res = { _status: null, _json: null, _headers: {} };
  res.status = (s) => { res._status = s; return res; };
  res.json = (j) => { res._json = j; return res; };
  res.setHeader = (k, v) => { res._headers[k] = v; };
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

const ANTHROPIC_OK = { ok: true, json: async () => ({ content: [{ type: "text", text: "merhaba" }], usage: {} }) };

function standartFetchMock({ authOk, authBody, authThrow } = {}) {
  const gorulenIstekler = [];
  return {
    gorulenIstekler,
    impl: async (url, opts) => {
      gorulenIstekler.push({ url: String(url), opts });
      if (String(url).includes("supabase.co/auth/v1/user")) {
        if (authThrow) throw new Error("ağ hatası (simüle)");
        if (authOk) return { ok: true, json: async () => authBody };
        return { ok: false, status: 401, json: async () => ({ error: "invalid_token" }) };
      }
      if (String(url).includes("api.anthropic.com")) return ANTHROPIC_OK;
      throw new Error("beklenmeyen istek: " + url);
    },
  };
}

const orijinalKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = "sahte-test-degeri-gercek-degil";

// ---- TEST: geçerli auth → istek kabul edilir, verified:true, anonymous:false ----
{
  const m = standartFetchMock({ authOk: true, authBody: { id: "user-abc-123", is_anonymous: false, email: "gercek@ornek.com" } });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }] }, { ip: "10.1.0.1", authorization: "Bearer gecerli-sahte-token" }), res);
  kontrol("1) geçerli auth → 200 kabul edilir", res._status === 200);
  kontrol("2) auth.verified === true", res._json?.auth?.verified === true);
  kontrol("3) auth.anonymous === false", res._json?.auth?.anonymous === false);
  kontrol("4) response body'de email/PII YOK", JSON.stringify(res._json).includes("gercek@ornek.com") === false);
  fetchMockTemizle();
}

// ---- TEST: anonim (authenticated role) session de GEÇERLİ sayılır ----
{
  const m = standartFetchMock({ authOk: true, authBody: { id: "anon-user-1", is_anonymous: true } });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }] }, { ip: "10.1.0.2", authorization: "Bearer anon-sahte-token" }), res);
  kontrol("5) anonim authenticated session desteklenir → 200", res._status === 200);
  kontrol("6) auth.verified === true (anonim ama geçerli)", res._json?.auth?.verified === true);
  kontrol("7) auth.anonymous === true", res._json?.auth?.anonymous === true);
  fetchMockTemizle();
}

// ---- TEST: Authorization header YOK → controlled fallback (istek yine de kabul edilir) ----
{
  const m = standartFetchMock({ authOk: true, authBody: { id: "u", is_anonymous: false } });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }] }, { ip: "10.1.0.3" }), res);
  kontrol("8) header yok → yine de 200 (chat ASLA bloklanmaz)", res._status === 200);
  kontrol("9) auth.verified === false", res._json?.auth?.verified === false);
  kontrol("10) auth.anonymous === null", res._json?.auth?.anonymous === null);
  kontrol("11) header yokken Supabase auth endpoint'ine HİÇ istek atılmadı (gereksiz ağ çağrısı yok)", !m.gorulenIstekler.some((i) => i.url.includes("/auth/v1/user")));
  fetchMockTemizle();
}

// ---- TEST: malformed Bearer (Bearer prefix yok) → controlled fallback ----
{
  const m = standartFetchMock({ authOk: true, authBody: { id: "u", is_anonymous: false } });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }] }, { ip: "10.1.0.4", authorization: "Basic abcdef" }), res);
  kontrol("12) malformed Bearer → yine de 200", res._status === 200);
  kontrol("13) auth.verified === false", res._json?.auth?.verified === false);
  kontrol("14) malformed header'da Supabase'e istek atılmadı", !m.gorulenIstekler.some((i) => i.url.includes("/auth/v1/user")));
  fetchMockTemizle();
}

// ---- TEST: boş Bearer token ("Bearer ") → controlled fallback ----
{
  const m = standartFetchMock({ authOk: true, authBody: { id: "u", is_anonymous: false } });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }] }, { ip: "10.1.0.5", authorization: "Bearer " }), res);
  kontrol("15) boş Bearer token → yine de 200", res._status === 200);
  kontrol("16) auth.verified === false", res._json?.auth?.verified === false);
  fetchMockTemizle();
}

// ---- TEST: geçersiz/süresi dolmuş token (Supabase 401 döner) → controlled fallback ----
{
  const m = standartFetchMock({ authOk: false });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }] }, { ip: "10.1.0.6", authorization: "Bearer gecersiz-veya-suresi-dolmus" }), res);
  kontrol("17) geçersiz/süresi dolmuş token → yine de 200 (reddedilmez, fallback)", res._status === 200);
  kontrol("18) auth.verified === false", res._json?.auth?.verified === false);
  fetchMockTemizle();
}

// ---- TEST: doğrulama sırasında ağ hatası (Supabase'e ulaşılamıyor) → crash YOK, fallback ----
{
  const m = standartFetchMock({ authThrow: true });
  fetchMockKur(m.impl);
  const res = sahteRes();
  let hata = false;
  try {
    await handler(sahteReq({ messages: [{ role: "user", content: "test" }] }, { ip: "10.1.0.7", authorization: "Bearer herhangi-bir-token" }), res);
  } catch (e) {
    hata = true;
  }
  kontrol("19) doğrulama ağ hatası → handler ÇÖKMÜYOR", !hata);
  kontrol("20) doğrulama ağ hatasında da 200 + verified:false (chat bozulmuyor)", res._status === 200 && res._json?.auth?.verified === false);
  fetchMockTemizle();
}

// ---- TEST: client'ın gönderdiği sahte user_id/email/role'e GÜVENİLMİYOR ----
{
  const m = standartFetchMock({ authOk: true, authBody: { id: "gercek-dogrulanmis-id", is_anonymous: false } });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(
    sahteReq(
      { messages: [{ role: "user", content: "test" }], user_id: "sahte-hacker-id", email: "sahte@saldirgan.com", role: "admin" },
      { ip: "10.1.0.8", authorization: "Bearer gecerli-token" }
    ),
    res
  );
  kontrol("21) body'deki sahte user_id/email/role response'u ETKİLEMİYOR (sadece doğrulanmış token'a göre verified:true)", res._status === 200 && res._json?.auth?.verified === true);
  fetchMockTemizle();
}

// ---- TEST: mevcut IP rate limit KORUNUYOR (auth eklemesi bozmadı) ----
{
  const m = standartFetchMock({ authOk: true, authBody: { id: "u", is_anonymous: false } });
  fetchMockKur(m.impl);
  const ip = "10.1.0.9";
  let sonRes;
  for (let i = 0; i < 16; i++) {
    sonRes = sahteRes();
    await handler(sahteReq({ messages: [{ role: "user", content: "test" }] }, { ip }), sonRes);
  }
  kontrol("22) aynı IP'den 16. istek 429 döner (limit=15, rate limit hâlâ çalışıyor)", sonRes._status === 429);
  fetchMockTemizle();
}

// ---- TEST: response body/hata mesajı HİÇBİR ZAMAN token değerini içermiyor ----
{
  const GIZLI_TOKEN = "cok-gizli-sahte-token-XYZ789";
  const m = standartFetchMock({ authOk: false });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }] }, { ip: "10.1.0.10", authorization: `Bearer ${GIZLI_TOKEN}` }), res);
  kontrol("23) başarısız doğrulamada bile response body token'ı İÇERMİYOR", JSON.stringify(res._json).includes(GIZLI_TOKEN) === false);
  fetchMockTemizle();
}

process.env.ANTHROPIC_API_KEY = orijinalKey;

// ============================================================
// STATİK — kaynak seviyesinde güvenlik/regresyon kontrolleri
// ============================================================
{
  const src = readFileSync(path.join(ROOT, "api", "klod.mjs"), "utf-8");
  kontrol("24) service_role FİİLEN kullanılmıyor (sadece anon/publishable key ile doğrulama) — env değişkeni/değişken adı olarak hiç referans yok", !/process\.env\.\w*SERVICE_ROLE\w*/i.test(src) && !/\bserviceRoleKey\b/.test(src));
  kontrol("25) req.body'den user_id/email/role hiç okunmuyor (client identity'e güvenilmiyor)", !/body\.user_id|body\.email|body\.role\b/.test(src));
  kontrol("26) token değeri hiçbir console.* çağrısına interpolate/concat EDİLMİYOR (sadece sabit metinli 'reason' logu)", !/console\.(log|warn|error)\([^)]*\$\{token\}/.test(src) && !/console\.(log|warn|error)\([^)]*\+\s*token\b/.test(src) && !/console\.(log|warn|error)\([^,]*,\s*token\b/.test(src));
  kontrol("27) doğrulanmış identity (user.id) hiçbir Anthropic mesaj/prompt alanına enjekte edilmiyor", !/systemContent[\s\S]{0,200}verifiedUser/.test(src) && !/finalMessages[\s\S]{0,200}verifiedUser/.test(src));
  kontrol("28) mevcut KLOD_SYSTEM_PROMPT/SINYAL_ANALIZ_SYSTEM_PROMPT/FEW_SHOT_EXAMPLES/TOOLS DEĞİŞMEDİ (varlık + tekillik)", (src.match(/const KLOD_SYSTEM_PROMPT = /g) || []).length === 1 && (src.match(/const SINYAL_ANALIZ_SYSTEM_PROMPT = /g) || []).length === 1 && (src.match(/const FEW_SHOT_EXAMPLES = /g) || []).length === 1 && (src.match(/const TOOLS = /g) || []).length === 1);
  kontrol("29) mevcut rateLimit çağrısı (key:'klod', limit:15, windowMs:60_000) DEĞİŞMEDİ", /rateLimit\(req, \{ key: 'klod', limit: 15, windowMs: 60_000 \}\)/.test(src));
  kontrol("30) klodDogrulanmisKullaniciAl TAM OLARAK 1 kez tanımlı (duplicate YOK)", (src.match(/async function klodDogrulanmisKullaniciAl\(authHeader\)/g) || []).length === 1);
}

// ---- index.html: dnavChat auth header eklemesi DILA/response_time/Katman4'e dokunmadı ----
{
  const html = readFileSync(path.join(ROOT, "index.html"), "utf-8");
  const dnavChatMatch = html.match(/async function dnavChat\(\)\{[\s\S]*?\r?\n\}\r?\n/);
  const dnavChatGovde = dnavChatMatch ? dnavChatMatch[0] : "";
  kontrol("31) dnavChat() TAM OLARAK 1 kez tanımlı (duplicate YOK)", (html.match(/async function dnavChat\(\)\{/g) || []).length === 1);
  kontrol("31b) dnavChat() kaynağı bulundu (extraction başarılı)", dnavChatGovde.length > 0);
  kontrol("32) dnavChat() sb.auth.getSession() ile token alıp Authorization header'ı EKLİYOR", /sb\.auth\.getSession\(\)/.test(dnavChatGovde) && /'Authorization':'Bearer '\+_dnavToken/.test(dnavChatGovde));
  kontrol("33) dnavChat() sb yokken/getSession hata verirken de try\\/catch ile GÜVENLİ fallback yapıyor (header'sız devam)", /_dnavToken=\(data&&data\.session&&data\.session\.access_token\)\|\|null;[\s\S]*?\}catch\(e\)\{_dnavToken=null;\}/.test(dnavChatGovde));
  kontrol("34) DILA akışları (konusmaGonder/dilaSor) Authorization header'ı GEREKTİRMİYOR — dokunulmadı", !/function konusmaGonder[\s\S]{0,400}Authorization/.test(html) && !/function dilaSor[\s\S]{0,400}Authorization/.test(html));
  kontrol("35) response_time_ms telemetrisi (rtBaslat/rtBitir) hâlâ TAM OLARAK 1 kez tanımlı — bu tur dokunulmadı", (html.match(/function rtBaslat\(\)/g) || []).length === 1 && (html.match(/function rtBitir\(baslangic\)/g) || []).length === 1);
  kontrol("36) Katman 4 motoru (avciKokNedenAnalizEt) hâlâ TAM OLARAK 1 kez tanımlı — bu tur dokunulmadı", (html.match(/function avciKokNedenAnalizEt\(diagnosticEventleri,opts\)/g) || []).length === 1);
  kontrol("37) diagnostic_events/SIGNAL_SELECT/schema referansları bu turda DEĞİŞMEDİ (insert deseni aynı)", /sb\.from\('diagnostic_events'\)\.insert\(/.test(html));
}

// ============================================================
// GERÇEK ÇALIŞTIRMA — dnavChat() index.html'den BİREBİR çıkarılıp
// Node vm ile GERÇEKTEN ÇALIŞTIRILIYOR (sahte yeniden-yazım DEĞİL),
// diğer avci-*.test.mjs dosyalarıyla AYNI desen.
// ============================================================
{
  const html = readFileSync(path.join(ROOT, "index.html"), "utf-8");
  const dnavChatMatch = html.match(/async function dnavChat\(\)\{[\s\S]*?\r?\n\}\r?\n/);
  const dnavChatSrc = dnavChatMatch[0];

  function fakeEl() {
    return { _cls: "", _text: "", _html: "", classList: { added: [], add(c) { this.added.push(c); } }, get className() { return this._cls; }, set className(v) { this._cls = v; }, get textContent() { return this._text; }, set textContent(v) { this._text = v; }, get innerHTML() { return this._html; }, set innerHTML(v) { this._html = v; }, appendChild() {}, remove() {}, disabled: false };
  }

  function sandboxKur({ sbImpl, fetchImpl } = {}) {
    const inp = fakeEl();
    inp._val = "test mesajı";
    Object.defineProperty(inp, "value", { get() { return inp._val; }, set(v) { inp._val = v; } });
    inp.focus = () => {};
    const body = fakeEl();
    body.scrollTop = 0;
    const els = { "dnav-in": inp, "dnav-chat": body };
    const fetchCagrilari = [];
    const sandbox = {
      console: { warn: () => {}, log: () => {}, error: () => {} },
      document: {
        getElementById: (id) => els[id] || null,
        createElement: () => fakeEl(),
      },
      localStorage: { getItem: () => null },
      dnavHistory: [],
      KB: [],
      renderMD: (t) => t,
      // KATMAN 5B (context assembler) bu dosyanın kapsamı DIŞINDA — burada
      // sadece auth header davranışı test ediliyor, context her zaman null.
      avciAktifSinyalLabBaglamiAl: () => null,
      sb: sbImpl,
      fetch: async (url, opts) => {
        fetchCagrilari.push({ url, opts });
        return fetchImpl ? fetchImpl(url, opts) : { ok: true, json: async () => ({ content: [{ type: "text", text: "cevap" }] }) };
      },
    };
    const context = vm.createContext(sandbox);
    vm.runInContext(dnavChatSrc, context, { filename: "index.html (extracted, dnavChat)" });
    return { context, fetchCagrilari, inp };
  }

  // 38) geçerli session → gerçekten Authorization header'ı ile fetch çağrılıyor
  {
    const sbImpl = { auth: { getSession: async () => ({ data: { session: { access_token: "gercek-sahte-access-token" } } }) } };
    const t = sandboxKur({ sbImpl });
    await t.context.dnavChat();
    const cagri = t.fetchCagrilari[0];
    kontrol("38) geçerli session → fetch Authorization:'Bearer <token>' header'ıyla çağrıldı", cagri && cagri.opts.headers.Authorization === "Bearer gercek-sahte-access-token");
  }

  // 39) sb undefined (misafir/henüz hazır değil) → header'sız, crash YOK
  {
    const t = sandboxKur({ sbImpl: undefined });
    let hata = false;
    try { await t.context.dnavChat(); } catch (e) { hata = true; }
    const cagri = t.fetchCagrilari[0];
    kontrol("39) sb yok → crash YOK, fetch header'sız (Authorization YOK) çağrıldı, chat çalışmaya devam ediyor", !hata && cagri && !("Authorization" in cagri.opts.headers));
  }

  // 40) sb var ama getSession() reddediyor (network hatası) → header'sız, crash YOK, GİZLİCE bypass YOK (sadece fallback)
  {
    const sbImpl = { auth: { getSession: async () => { throw new Error("ağ hatası (simüle)"); } } };
    const t = sandboxKur({ sbImpl });
    let hata = false;
    try { await t.context.dnavChat(); } catch (e) { hata = true; }
    const cagri = t.fetchCagrilari[0];
    kontrol("40) getSession() reddediyor → crash YOK, fetch yine de header'sız gönderilip chat çalışıyor", !hata && cagri && !("Authorization" in cagri.opts.headers));
  }

  // 41) session var ama access_token yok/null → header'sız (sahte/boş token EKLENMİYOR)
  {
    const sbImpl = { auth: { getSession: async () => ({ data: { session: { access_token: null } } }) } };
    const t = sandboxKur({ sbImpl });
    await t.context.dnavChat();
    const cagri = t.fetchCagrilari[0];
    kontrol("41) session var ama access_token null → Authorization header'ı EKLENMİYOR (sahte token yok)", cagri && !("Authorization" in cagri.opts.headers));
  }

  // 42) Content-Type her durumda korunuyor (header eklemesi mevcut header'ı BOZMADI)
  {
    const sbImpl = { auth: { getSession: async () => ({ data: { session: { access_token: "tkn" } } }) } };
    const t = sandboxKur({ sbImpl });
    await t.context.dnavChat();
    const cagri = t.fetchCagrilari[0];
    kontrol("42) Content-Type:'application/json' korunuyor", cagri && cagri.opts.headers["Content-Type"] === "application/json");
  }
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
