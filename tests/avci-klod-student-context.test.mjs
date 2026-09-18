// KATMAN 5C — SERVER-SIDE STUDENT MODEL CONTEXT. Gerçek Supabase/
// Anthropic ağına HİÇ çıkılmaz (mock fetch, mail-dryrun.test.mjs/avci-
// klod-auth.test.mjs ile AYNI desen). Client/server PARITY testi
// index.html'den avciOgrenciModeliHesapla()'yı BİREBİR çıkarıp Node vm
// ile GERÇEKTEN ÇALIŞTIRIP api/klod.mjs'nin (named export) server twin'i
// ile AYNI fixture üzerinde AYNI sonucu ürettiğini doğrular — sahte
// yeniden-yazım DEĞİL.

import handler, { klodOgrenciModeliHesapla, klodStudentContextOlustur, klodGrupIstatistigi } from "../api/klod.mjs";
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

// ============================================================
// STATİK — server tarafı kaynak seviyesinde güvenlik kontrolleri
// ============================================================
{
  const src = readFileSync(path.join(ROOT, "api", "klod.mjs"), "utf-8");
  const srcKodSatirlari = src.split("\n").filter((satir) => !satir.trim().startsWith("//")).join("\n");
  kontrol("S1) klodOgrenciKanitiniAl TAM OLARAK 1 kez tanımlı", (src.match(/async function klodOgrenciKanitiniAl\(verifiedUser\)/g) || []).length === 1);
  kontrol("S2) klodOgrenciModeliHesapla TAM OLARAK 1 kez tanımlı", (src.match(/function klodOgrenciModeliHesapla\(satirlar\)/g) || []).length === 1);
  kontrol("S3) klodStudentContextOlustur TAM OLARAK 1 kez tanımlı", (src.match(/function klodStudentContextOlustur\(satirlar\)/g) || []).length === 1);
  kontrol("S4) service_role GERÇEK KODDA (yorum hariç) HİÇ YOK", !/SERVICE_ROLE/i.test(srcKodSatirlari) && !/\bserviceRoleKey\b/.test(srcKodSatirlari));
  kontrol("S5) REST çağrısı SADECE answer_history'ye, sadece izinli 5 koloni çekiyor", /answer_history\?select=signal,topic,is_correct,answered_at,response_time_ms/.test(src));
  kontrol("S6) REST çağrısı limit=500 ile sınırlı", /limit=500/.test(src));
  kontrol("S7) REST çağrısı service_role DEĞİL, verifiedUser.token kullanıyor", /Authorization: `Bearer \$\{verifiedUser\.token\}`/.test(src));
  kontrol("S8) klodOgrenciKanitiniAl verifiedUser yoksa (auth false) DB'ye HİÇ gitmiyor (erken return null)", /if \(!verifiedUser \|\| !verifiedUser\.token\) return null;/.test(src));
  kontrol("S9) user_id/email/profile GERÇEK KODDA prompt'a/response'a hiç yazılmıyor (select'te yok, context objesinde yok)", !/select=.*user_id/.test(src) && !/select=.*email/.test(src));
  kontrol("S10) STUDENT_CONTEXT objesinde ham satır/timestamp listesi/bireysel cevap YOK (sadece overall/weak_evidence/reflex anahtarları)", /const context = \{\s*overall: \{/.test(src) && !/answered_at:/.test(src.split("klodStudentContextOlustur")[1]?.split("\n\n// 1. SYSTEM PROMPT")[0] || ""));
  kontrol("S11) weak_evidence YETERSİZ_KANIT olanları HARİÇ tutuyor (0 veri ≠ 0 beceri ilkesi kodda uygulanmış)", /\.filter\(\(g\) => g\.kanitGuveni !== 'YETERSİZ_KANIT'\)/.test(src));
  kontrol("S12) weak_evidence en fazla 3 ile sınırlı", /\.slice\(0, 3\)/.test(src));
  kontrol("S13) profilEtiketi (kişilik/GÜÇLÜ-ÇALIŞILACAK etiketi) STUDENT_CONTEXT'e HİÇ eklenmiyor", !/profilEtiketi/.test(src.split("function klodStudentContextOlustur")[1]?.split("\n\n// 1. SYSTEM PROMPT")[0] || ""));
  kontrol("S14) diagnostic_events/Katman 4 GERÇEK KODDA hiç bağlanmadı", !/diagnostic_events|avciKokNedenAnalizEt/.test(srcKodSatirlari));
  kontrol("S15) context injection `system` override'ından BAĞIMSIZ (5B ile aynı gerekçe)", !/if \(!system[\s\S]{0,80}klodOgrenciKanitiniAl/.test(src));
  kontrol("S16) mevcut auth/5B fonksiyonları (klodDogrulanmisKullaniciAl/klodSinyalLabBaglamiDogrula) DEĞİŞMEDİ (varlık+tekillik)", (src.match(/async function klodDogrulanmisKullaniciAl\(authHeader\)/g) || []).length === 1 && (src.match(/function klodSinyalLabBaglamiDogrula\(context\)/g) || []).length === 1);
  kontrol("S17) mevcut rateLimit/KLOD_SYSTEM_PROMPT/SINYAL_ANALIZ_SYSTEM_PROMPT DEĞİŞMEDİ", /rateLimit\(req, \{ key: 'klod', limit: 15, windowMs: 60_000 \}\)/.test(src) && (src.match(/const KLOD_SYSTEM_PROMPT = /g) || []).length === 1 && (src.match(/const SINYAL_ANALIZ_SYSTEM_PROMPT = /g) || []).length === 1);
}

// ============================================================
// CLIENT/SERVER PARITY — index.html'in GERÇEK avciOgrenciModeliHesapla()
// kaynağı vm ile çalıştırılıp, AYNI fixture'da server twin'iyle
// karşılaştırılıyor.
// ============================================================
const CLIENT_FN_SRC = slice("function avciOgrenciModeliHesapla(satirlar){", "function avciOgrenciProfiliHTML(profiller){");
function clientHesapla(satirlar) {
  const sandbox = { satirlar, console: { warn: () => {}, log: () => {}, error: () => {} } };
  const context = vm.createContext(sandbox);
  vm.runInContext(CLIENT_FN_SRC + "\nthis.__sonuc = avciOgrenciModeliHesapla(satirlar);", context, { filename: "index.html (extracted, avciOgrenciModeliHesapla)" });
  return context.__sonuc;
}

function fixtureUret() {
  const simdi = Date.now();
  const gun = 86400000;
  return [
    { signal: "despite", topic: null, is_correct: true, answered_at: new Date(simdi - 1 * gun).toISOString(), response_time_ms: 4200 },
    { signal: "despite", topic: null, is_correct: false, answered_at: new Date(simdi - 2 * gun).toISOString(), response_time_ms: 6100 },
    { signal: "despite", topic: null, is_correct: true, answered_at: new Date(simdi - 3 * gun).toISOString(), response_time_ms: null },
    { signal: "despite", topic: null, is_correct: true, answered_at: new Date(simdi - 4 * gun).toISOString(), response_time_ms: 3300 },
    { signal: "despite", topic: null, is_correct: false, answered_at: new Date(simdi - 5 * gun).toISOString(), response_time_ms: 5000 },
    { signal: "despite", topic: null, is_correct: true, answered_at: new Date(simdi - 6 * gun).toISOString(), response_time_ms: 2900 },
    { signal: null, topic: "modal_perfect", is_correct: false, answered_at: new Date(simdi - 1 * gun).toISOString(), response_time_ms: null },
    { signal: null, topic: "modal_perfect", is_correct: false, answered_at: new Date(simdi - 2 * gun).toISOString(), response_time_ms: null },
    { signal: null, topic: "modal_perfect", is_correct: false, answered_at: new Date(simdi - 3 * gun).toISOString(), response_time_ms: null },
    { signal: "however", topic: null, is_correct: true, answered_at: new Date(simdi).toISOString(), response_time_ms: 1000 },
    { signal: null, topic: null, is_correct: true, answered_at: new Date(simdi).toISOString(), response_time_ms: 1000 }, // anahtar yok → atlanmalı
  ];
}

{
  const fixture = fixtureUret();
  const clientSonuc = clientHesapla(fixture);
  const serverSonuc = klodOgrenciModeliHesapla(fixture);
  kontrol("P1) client ve server AYNI sayıda grup üretiyor", clientSonuc.length === serverSonuc.length, `client:${clientSonuc.length} server:${serverSonuc.length}`);
  kontrol("P2) client ve server BİREBİR AYNI JSON çıktısı üretiyor (tam parity)", JSON.stringify(clientSonuc) === JSON.stringify(serverSonuc), `client:${JSON.stringify(clientSonuc)}\n      server:${JSON.stringify(serverSonuc)}`);
  const despiteGrup = serverSonuc.find((g) => g.anahtar === "despite");
  kontrol("P3) 'despite' grubu evidence_count=6, YETERLİ_KANIT (5+)", despiteGrup.evidenceCount === 6 && despiteGrup.kanitGuveni === "YETERLİ_KANIT");
  kontrol("P4) 'despite' long-term accuracy doğru (4/6 = %67)", despiteGrup.longTermAccuracy === 67);
  kontrol("P5) 'despite' reflex sadece response_time_ms dolu 5 satırdan hesaplanmış (null olan 1 satır HARİÇ)", despiteGrup.reflex.kanitSayisi === 5);
  const modalGrup = serverSonuc.find((g) => g.anahtar === "modal_perfect");
  kontrol("P6) 'modal_perfect' grubu evidence_count=3, DÜŞÜK_KANIT (2-4)", modalGrup.evidenceCount === 3 && modalGrup.kanitGuveni === "DÜŞÜK_KANIT");
  kontrol("P7) 'modal_perfect' reflex NULL (hiç response_time_ms verisi yok — UYDURULMUYOR)", modalGrup.reflex === null);
  const howeverGrup = serverSonuc.find((g) => g.anahtar === "however");
  kontrol("P8) 'however' grubu evidence_count=1, YETERSİZ_KANIT (<2)", howeverGrup.evidenceCount === 1 && howeverGrup.kanitGuveni === "YETERSİZ_KANIT");
  kontrol("P9) 'however' YETERSİZ_KANIT olduğu için profilEtiketi de YETERSİZ_KANIT (GÜÇLÜ/ÇALIŞILACAK UYDURULMUYOR)", howeverGrup.profilEtiketi === "YETERSİZ_KANIT");
  kontrol("P10) signal/topic'i olmayan satır (11. eleman) hiçbir gruba dahil edilmedi", serverSonuc.every((g) => g.anahtar !== ""));
}

// boş fixture — sahte skor üretilmiyor
{
  const bos = clientHesapla([]);
  const bosServer = klodOgrenciModeliHesapla([]);
  kontrol("P11) boş answer_history → client ve server İKİSİ DE boş dizi (sahte grup YOK)", bos.length === 0 && bosServer.length === 0);
}

// ============================================================
// klodStudentContextOlustur — sanitize edilmiş STUDENT_CONTEXT içeriği
// ============================================================
{
  const fixture = fixtureUret();
  const ctx = klodStudentContextOlustur(fixture);
  kontrol("C1) overall.evidence_count TÜM satırları (11 — anahtar'sız satır dahil, overall gruplanmıyor) sayıyor", ctx.overall.evidence_count === 11);
  kontrol("C2) weak_evidence en fazla 3 öğe", ctx.weak_evidence.length <= 3);
  kontrol("C3) weak_evidence içinde YETERSİZ_KANIT olan 'however' YOK (0 veri ≠ 0 beceri)", !ctx.weak_evidence.some((w) => w.konu === "however"));
  kontrol("C4) weak_evidence en düşük accuracy önce sıralı", ctx.weak_evidence.length < 2 || ctx.weak_evidence[0].accuracy <= ctx.weak_evidence[ctx.weak_evidence.length - 1].accuracy);
  kontrol("C5) reflex SADECE overall'da gerçek kanıt varsa ekleniyor", ctx.reflex && typeof ctx.reflex.ortalama_sure_ms === "number" && typeof ctx.reflex.kanit_sayisi === "number");
  kontrol("C6) STUDENT_CONTEXT'te user_id/email/profil/answered_at/is_correct (satır-seviyesi) hiç YOK", !("user_id" in ctx) && !JSON.stringify(ctx).includes("answered_at") && !JSON.stringify(ctx).includes("is_correct"));
  kontrol("C7) STUDENT_CONTEXT'te knowledge/recognition/application/reasoning/profilEtiketi hiç YOK", !("knowledge" in ctx.overall) && !("recognition" in ctx.overall) && !("application" in ctx.overall) && !("reasoning" in ctx.overall) && !JSON.stringify(ctx).includes("profilEtiketi"));

  const reflexsizFixture = fixtureUret().map((r) => ({ ...r, response_time_ms: null }));
  const ctx2 = klodStudentContextOlustur(reflexsizFixture);
  kontrol("C8) hiç response_time kanıtı yoksa reflex alanı HİÇ eklenmiyor (omit, 0/null UYDURULMUYOR)", !("reflex" in ctx2));

  const bosCtx = klodStudentContextOlustur([]);
  kontrol("C9) boş answer_history → overall.evidence_count=0, accuracy=null (sahte skor YOK), weak_evidence=[]", bosCtx.overall.evidence_count === 0 && bosCtx.overall.accuracy === null && bosCtx.weak_evidence.length === 0);
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

function fullMock({ authOk = true, authBody = { id: "u1", is_anonymous: false }, restOk = true, restRows = [], restThrow = false, restStatus = 200 } = {}) {
  const gorulenIstekler = [];
  return {
    gorulenIstekler,
    impl: async (url, opts) => {
      gorulenIstekler.push({ url: String(url), opts });
      if (String(url).includes("/auth/v1/user")) {
        return authOk ? { ok: true, json: async () => authBody } : { ok: false, status: 401 };
      }
      if (String(url).includes("/rest/v1/answer_history")) {
        if (restThrow) throw new Error("ağ hatası (simüle)");
        return { ok: restOk, status: restStatus, json: async () => restRows };
      }
      if (String(url).includes("api.anthropic.com")) {
        const parsed = JSON.parse(opts.body);
        gorulenIstekler.push({ url: "ANTHROPIC_PARSED", parsed });
        return { ok: true, json: async () => ({ content: [{ type: "text", text: "cevap" }], usage: {} }) };
      }
      throw new Error("beklenmeyen istek: " + url);
    },
  };
}
function getStudentCtx(gorulenIstekler) {
  const anth = gorulenIstekler.find((i) => i.url === "ANTHROPIC_PARSED");
  if (!anth) return null;
  const blok = (anth.parsed.system || []).find((b) => b.text && b.text.includes("ÖĞRENCİ KANIT ÖZETİ"));
  if (!blok) return null;
  const jsonStr = blok.text.slice(blok.text.indexOf("{"), blok.text.indexOf("}\n\nGÜVENLİ") + 1);
  return JSON.parse(jsonStr);
}

const orijinalKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = "sahte-test-degeri-gercek-degil";

// 1) verified=true + valid rows → summary var
{
  const m = fullMock({ restRows: fixtureUret() });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "nasıl gidiyorum?" }] }, { ip: "30.0.0.1", authorization: "Bearer gecerli-token" }), res);
  const ctx = getStudentCtx(m.gorulenIstekler);
  kontrol("1) verified=true + valid rows → STUDENT_CONTEXT VAR", ctx !== null && ctx.overall.evidence_count === 11);
  fetchMockTemizle();
}

// 2) verified=false → DB query yok, STUDENT_CONTEXT yok
{
  const m = fullMock({ authOk: false });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }] }, { ip: "30.0.0.2" }), res); // header yok
  kontrol("2) auth header yok → answer_history'ye HİÇ istek atılmadı", !m.gorulenIstekler.some((i) => i.url.includes("/rest/v1/answer_history")));
  kontrol("2b) STUDENT_CONTEXT yok", getStudentCtx(m.gorulenIstekler) === null);
  fetchMockTemizle();
}

// 3) invalid/expired token → context yok, chat devam
{
  const m = fullMock({ authOk: false });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }] }, { ip: "30.0.0.3", authorization: "Bearer gecersiz-veya-suresi-dolmus" }), res);
  kontrol("3) invalid/expired token → answer_history sorgusu atılmadı, context yok, 200", !m.gorulenIstekler.some((i) => i.url.includes("/rest/v1/answer_history")) && res._status === 200);
  fetchMockTemizle();
}

// 4) REST 401/403 → context yok, chat devam
{
  const m = fullMock({ restOk: false, restStatus: 403 });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }] }, { ip: "30.0.0.4", authorization: "Bearer gecerli-token" }), res);
  kontrol("4) answer_history REST 403 → context YOK, chat 200 devam ediyor", getStudentCtx(m.gorulenIstekler) === null && res._status === 200);
  fetchMockTemizle();
}

// 5) REST network hatası (throw) → context yok, chat devam, crash yok
{
  const m = fullMock({ restThrow: true });
  fetchMockKur(m.impl);
  const res = sahteRes();
  let hata = false;
  try {
    await handler(sahteReq({ messages: [{ role: "user", content: "test" }] }, { ip: "30.0.0.5", authorization: "Bearer gecerli-token" }), res);
  } catch (e) { hata = true; }
  kontrol("5) answer_history REST network hatası → crash YOK, context yok, 200", !hata && getStudentCtx(m.gorulenIstekler) === null && res._status === 200);
  fetchMockTemizle();
}

// 6) empty answer_history → sahte skor yok, ama context yine üretilir (dürüst 0)
{
  const m = fullMock({ restRows: [] });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }] }, { ip: "30.0.0.6", authorization: "Bearer gecerli-token" }), res);
  const ctx = getStudentCtx(m.gorulenIstekler);
  kontrol("6) boş answer_history → sahte skor YOK (evidence_count=0, accuracy=null)", ctx !== null && ctx.overall.evidence_count === 0 && ctx.overall.accuracy === null);
  fetchMockTemizle();
}

// 7) client'ın sahte STUDENT_CONTEXT'i (body.studentContext gibi) tamamen görmezden geliniyor
{
  const m = fullMock({ restRows: fixtureUret() });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }], studentContext: { overall: { accuracy: 100, evidence_count: 999 } }, student_summary: "ben süperim" }, { ip: "30.0.0.7", authorization: "Bearer gecerli-token" }), res);
  const ctx = getStudentCtx(m.gorulenIstekler);
  kontrol("7) client'ın uydurma studentContext/student_summary alanları YOK SAYILIYOR — sadece server'ın kendi hesapladığı (evidence_count=11) kullanılıyor", ctx.overall.evidence_count === 11 && ctx.overall.accuracy !== 100);
  fetchMockTemizle();
}

// 8) 5B CURRENT QUESTION context ile 5C STUDENT_CONTEXT AYNI ANDA çalışıyor (kompozisyon)
{
  const m = fullMock({ restRows: fixtureUret() });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "bu soruda niye B?" }], context: { module: "sinyal_lab", question_id: "q001", answered: false } }, { ip: "30.0.0.8", authorization: "Bearer gecerli-token" }), res);
  const anth = m.gorulenIstekler.find((i) => i.url === "ANTHROPIC_PARSED");
  const sistemMetni = JSON.stringify(anth.parsed.system);
  kontrol("8) 5B (AKTİF SORU BAĞLAMI) ve 5C (ÖĞRENCİ KANIT ÖZETİ) İKİSİ DE AYNI istekte mevcut", sistemMetni.includes("AKTİF SORU BAĞLAMI") && sistemMetni.includes("ÖĞRENCİ KANIT ÖZETİ"));
  kontrol("8b) before-answer answer-leak kontratı YİNE korunuyor (correct_answer yok)", !sistemMetni.includes('"correct_answer"'));
  fetchMockTemizle();
}

// 9) anonim doğrulanmış session da destekleniyor
{
  const m = fullMock({ authBody: { id: "anon-1", is_anonymous: true }, restRows: fixtureUret() });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }] }, { ip: "30.0.0.9", authorization: "Bearer anon-token" }), res);
  const ctx = getStudentCtx(m.gorulenIstekler);
  kontrol("9) anonim doğrulanmış session → STUDENT_CONTEXT yine üretiliyor (anonim=authenticated rolünde)", ctx !== null && ctx.overall.evidence_count === 11);
  fetchMockTemizle();
}

// 10) user_id LLM'e hiç gitmiyor + PII yok
{
  const m = fullMock({ authBody: { id: "cok-gizli-user-id-123", is_anonymous: false }, restRows: fixtureUret() });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }] }, { ip: "30.0.0.10", authorization: "Bearer gecerli-token" }), res);
  const anth = m.gorulenIstekler.find((i) => i.url === "ANTHROPIC_PARSED");
  const tumIstek = JSON.stringify(anth.parsed);
  kontrol("10) user_id (cok-gizli-user-id-123) Anthropic isteğinde hiç yok", !tumIstek.includes("cok-gizli-user-id-123"));
  fetchMockTemizle();
}

// 11) service_role hiçbir istekte kullanılmadı (tüm istekler anon key ile)
{
  const m = fullMock({ restRows: fixtureUret() });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "test" }] }, { ip: "30.0.0.11", authorization: "Bearer gecerli-token" }), res);
  const restCagri = m.gorulenIstekler.find((i) => i.url.includes("/rest/v1/answer_history"));
  kontrol("11) answer_history isteği apikey olarak PUBLIC anon key kullanıyor (service_role DEĞİL)", restCagri.opts.headers.apikey === "sb_publishable_RDVMnTcB60LjI8n6gBI1Pw__9YVVZHp");
  fetchMockTemizle();
}

// 12) DILA/response_time/Katman4/SAT/Tuzak/Paragraf etkilenmedi (statik, index.html)
{
  const htmlSrc = readFileSync(path.join(ROOT, "index.html"), "utf-8");
  kontrol("12) response_time_ms telemetrisi (rtBaslat/rtBitir) DEĞİŞMEDİ", (htmlSrc.match(/function rtBaslat\(\)/g) || []).length === 1 && (htmlSrc.match(/function rtBitir\(baslangic\)/g) || []).length === 1);
  kontrol("13) Katman 4 motoru (avciKokNedenAnalizEt) DEĞİŞMEDİ", (htmlSrc.match(/function avciKokNedenAnalizEt\(diagnosticEventleri,opts\)/g) || []).length === 1);
  kontrol("14) SAT/Tuzak/Paragraf'a context eklenmedi (avciAktifSat/Tuzak/ParagrafBaglami gibi bir fonksiyon YOK)", !/avciAktifSatBaglami|avciAktifTuzakBaglami|avciAktifParagrafBaglami/.test(htmlSrc));
  kontrol("15) DILA (konusmaGonder/dilaSor) student context'e hiç dokunmadı", !/function konusmaGonder[\s\S]{0,600}(klodOgrenciKanitiniAl|studentContext)/.test(htmlSrc) && !/function dilaSor[\s\S]{0,600}(klodOgrenciKanitiniAl|studentContext)/.test(htmlSrc));
}

process.env.ANTHROPIC_API_KEY = orijinalKey;

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
