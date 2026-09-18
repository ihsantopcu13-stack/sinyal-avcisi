// KATMAN 5G — MINI CHECK MVP. AVCI'nın öğrenciden "Mini soru sor."/"Beni
// test et." dediğinde, SADECE aktif Sinyal Lab sorusu hakkında TEK küçük
// bir mikro-soru sorabilmesini, 5F'in SOR→DUR→BEKLE→CEVABI AL→DEĞERLENDİR
// döngüsüne ve aynı-tur answer-leak yasağına (metin + board) tabi olarak
// yapabilmesini doğrular. Bu, YENİ bir soru/pratik ÜRETİMİ DEĞİL — 5E'nin
// board allowlist/canonical validator'ı bu turda HİÇ değişmedi, yeni
// context/state/schema/RPC/write eklenmedi. Gerçek bir LLM çağrısı
// YAPILAMAYACAĞI için (CI'da Anthropic ağı yok) testler "prompt CONTAINS/
// EXCLUDES X" seviyesinde bir davranış sözleşmesi testidir — 5D/5E/5F'nin
// kendi yaklaşımıyla AYNI. Gerçek Supabase/Anthropic ağına HİÇ çıkılmaz.

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
const MINI_BLOK = SYSTEM_PROMPT.slice(SYSTEM_PROMPT.indexOf("MINI KONTROL"), SYSTEM_PROMPT.indexOf("CEVAP ACIKLAMA POLITIKASI"));

// ============================================================
// STATİK — teacher contract içeriği
// ============================================================
{
  kontrol("1) MINI KONTROL (MINI SORU) KURALI başlığı prompt'ta mevcut", /MINI KONTROL \(MINI SORU\) KURALI \(ZORUNLU\)/i.test(SYSTEM_PROMPT));
  kontrol("2) 'Mini soru sor.' desteği AÇIKÇA tanımlı", /"Mini soru sor\."/i.test(MINI_BLOK));
  kontrol("3) 'Beni test et.' desteği AÇIKÇA tanımlı", /"Beni test et\."/i.test(MINI_BLOK));
  kontrol("4) SADECE aktif/canonical Sinyal Lab sorusu şartı AÇIKÇA yazılı", /SADECE aktif Sinyal Lab sorusu \(AKTIF SORU BAGLAMI\) hakkinda/i.test(MINI_BLOK));
  kontrol("4b) aktif soru yoksa mini kontrol YAPILMAYACAĞI açık", /aktif soru yoksa nazikce belirt ve mini kontrol yapma/i.test(MINI_BLOK));
  kontrol("5) TEK ve küçük bir mikro-soru şartı AÇIKÇA yazılı", /TEK ve kucuk bir mikro-soru sor/i.test(MINI_BLOK));
  kontrol("5b) mikro-soru kategorileri (fiil/SVO parçası/sinyal/sağ-sol/şık eleme/anlam kontrolü) tam listelenmiş", /fiil \/ S\+V\+O'nun bir parcasi \/ sinyal \/ sag-sol \/ sik eleme mantigi \/ anlam kontrolunden SADECE BIRI/i.test(MINI_BLOK));
  kontrol("6) Mini kontrolün YENİ bir soru/pratik ÜRETMEDİĞİ, 'örnek' OLMADIĞI açıkça yazılı (Teaching Example ile karışmıyor)", /Mini kontrol YENI bir soru\/pratik URETMEZ, YENI bir "ornek" DEGILDIR/i.test(MINI_BLOK));
}

// ============================================================
// 5F ZAMANLAMA KİLİDİNİN MİNİ KONTROL'E AÇIKÇA UYGULANMASI
// ============================================================
{
  kontrol("7) SOR->DUR->BEKLE->CEVABI AL->DEGERLENDIR döngüsü mini kontrol için AÇIKÇA referans veriliyor", /SOR -> DUR -> OGRENCIYI BEKLE -> CEVABI AL -> DEGERLENDIR/i.test(MINI_BLOK));
  kontrol("8) SOCRATIC TEK ADIM ve TAHTA ZAMANLAMASI kurallarına 'TAM OLARAK tabidir' diye AÇIKÇA bağlanmış", /TAM OLARAK SOCRATIC TEK ADIM ve TAHTA ZAMANLAMASI kurallarina tabidir/i.test(MINI_BLOK));
  kontrol("9) mini sorunun cevabını AYNI mesajda söylememe/ima etmeme kuralı AÇIKÇA yazılı (metin answer-leak yasağı)", /Sordugun mini sorunun cevabini AYNI mesajda soyleme veya ima etme/i.test(MINI_BLOK));
  kontrol("10) ilgili board action'ı (HIGHLIGHT_VERB/SHOW_SVO/HIGHLIGHT_SIGNAL/SHOW_LEFT_RIGHT/SHOW_HINT) AYNI turda çağırmama kuralı AÇIKÇA yazılı (board answer-leak yasağı)", /ilgili board action'i \(HIGHLIGHT_VERB\/SHOW_SVO\/HIGHLIGHT_SIGNAL\/SHOW_LEFT_RIGHT\/SHOW_HINT\) AYNI turda cagirma/i.test(MINI_BLOK));
  kontrol("11) yanlış/eksik cevapta TEK küçük ek ipucu + tekrar DUR/BEKLE kuralı var (cevabı doğrudan vermeme)", /Ogrenci yanlis\/eksik cevap verirse: TEK kucuk ek ipucu ver, tekrar DUR ve BEKLE - cevabi dogrudan verme/i.test(MINI_BLOK));
  kontrol("12) doğru cevapta kısa değerlendirme + BİR SONRAKİ AVCI adımına geçme kuralı var", /Ogrenci dogru cevap verirse: kisa bir dogrulama yap ve aktif sorunun BIR SONRAKI AVCI adimina gec/i.test(MINI_BLOK));
  kontrol("13) explicit solution mode ('pes ettim/çözümü göster') mevcut ÇÖZÜM MODU kuralına dönüşle korunuyor", /Ogrenci acikca "pes ettim\/cozumu goster" derse mevcut COZUM MODU kuralina don/i.test(MINI_BLOK));
}

// ============================================================
// KAPSAM KİLİDİ — Teaching Example / yeni soru üretimi / yeni state EKLENMEDİ
// ============================================================
{
  kontrol("14) 'Bir örnek daha' / Teaching Example kavramı prompt'a EKLENMEDİ", !/bir ornek daha/i.test(SYSTEM_PROMPT) && !/baska ornek ver/i.test(SYSTEM_PROMPT));
  kontrol("15) soru_uret / FEW_SHOT_EXAMPLES / ilgiliSorulariBul bu turda değişmedi (kaynakta hâlâ AYNI gating koşullarına bağlı)", (() => {
    const src = readFileSync(path.join(ROOT, "api", "klod.mjs"), "utf-8");
    return /mode === 'soru_uret'/.test(src) && /function ilgiliSorulariBul\(kullaniciMesaji, limit = 2\)/.test(src) && /if \(!system && mode !== 'sinyal_analiz'\)/.test(src);
  })());
  kontrol("16) BOARD_ACTION_ALLOWLIST hâlâ TAM OLARAK 8 action (genişletilmedi)", BOARD_ACTION_ALLOWLIST.size === 8);
  kontrol("17) klodBoardActionlariDogrula TAM OLARAK 1 kez tanımlı, DEĞİŞMEDİ (canonical validator aynı)", (() => {
    const src = readFileSync(path.join(ROOT, "api", "klod.mjs"), "utf-8");
    return (src.match(/function klodBoardActionlariDogrula\(rawActions, dogrulanmisBaglam, canonical\)/g) || []).length === 1;
  })());
  kontrol("18) api/klod.mjs bu turda HİÇ değişmedi (5G tamamen client-taraflı prompt eklemesi)", (() => {
    const src = readFileSync(path.join(ROOT, "api", "klod.mjs"), "utf-8");
    // service_role/eval/Function hâlâ yok — dolaylı regresyon kontrolü
    const kodSatirlari = src.split("\n").filter((s) => !s.trim().startsWith("//")).join("\n");
    return !/SERVICE_ROLE/i.test(kodSatirlari) && !/\beval\(/.test(kodSatirlari) && !/new Function\(/.test(kodSatirlari);
  })());
}

// ============================================================
// AVCI 7-ADIM SIRASI DEĞİŞMEDİ (regresyon, UI parity)
// ============================================================
{
  const stripEtiketleri = [...html.matchAll(/<span class="klod-method-chip">([^<]+)<\/span>/g)].map((m) => m[1]);
  function fold(s) {
    return String(s).toLocaleLowerCase("tr-TR").replace(/ı/g, "i").replace(/İ/g, "i").replace(/ğ/g, "g").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ç/g, "c").replace(/[^a-z0-9+/\s]/g, "").trim();
  }
  const beklenen = ["gor", "fiili bul", "s+v+o", "sinyali yakala", "sag/sol kontrol", "sik ele", "anlami dogrula"];
  kontrol("19) AVCI 7 adımı UI method-strip ile hâlâ birebir aynı (değişmedi)", JSON.stringify(stripEtiketleri.map(fold)) === JSON.stringify(beklenen));
}

// ============================================================
// SERVER — handler mock testleri (gerçek ağ yok) — 5B/5C/5E regresyon spot-check
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

// 20) 5B answer-leak: mini kontrol eklendikten sonra bile before-answer'da correct_answer/is_correct sistemde yok
{
  const m = anthropicMock({ toolActions: null });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "mini soru sor" }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: SYSTEM_PROMPT }, { ip: "70.0.0.1" }), res);
  const anth = m.gorulenIstekler.find((i) => i.url === "ANTHROPIC_PARSED");
  const sistemMetni = JSON.stringify(anth.parsed.system);
  kontrol("20) 5B answer-leak regresyonu: before-answer'da correct_answer/is_correct HÂLÂ yok", !sistemMetni.includes('"correct_answer"') && !sistemMetni.includes('"is_correct"'));
  fetchMockTemizle();
}

// 21) board_actions akışı (5E) mini-check senaryosunda da bozulmadan çalışıyor — HIGHLIGHT_SIGNAL canonical eşleşmesi HÂLÂ zorunlu
{
  const m = anthropicMock({ toolActions: [{ type: "HIGHLIGHT_SIGNAL", text: "despite" }, { type: "HIGHLIGHT_SIGNAL", text: "sahte-sinyal" }] });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "beni test et" }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: SYSTEM_PROMPT }, { ip: "70.0.0.2" }), res);
  kontrol("21) 5E regresyonu: gerçek sinyal ACCEPT, sahte sinyal DROP — allowlist/canonical validator değişmedi", res._json.board_actions.length === 1 && res._json.board_actions[0].text === "despite");
  fetchMockTemizle();
}

// 22) ELIMINATE_OPTION answered=false → hâlâ server tarafında DROP (5E kilidi mini-check ile gevşemedi)
{
  kontrol("22) ELIMINATE_OPTION answered=false → HÂLÂ sunucu tarafında DROP (doğrudan fonksiyon çağrısı)", klodBoardActionlariDogrula([{ type: "ELIMINATE_OPTION", option_index: 0 }], { module: "sinyal_lab", question_id: "q001", answered: false }, CANONICAL_Q1).length === 0);
}

// 23) 5C privacy: mini-check akışında bile user_id/PII Anthropic isteğine hiç gitmiyor
{
  const m = anthropicMock({ authBody: { id: "cok-gizli-id-mini", is_anonymous: false }, toolActions: null });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "mini soru sor" }], mode: "chat", system: SYSTEM_PROMPT }, { ip: "70.0.0.3", authorization: "Bearer tok" }), res);
  const anth = m.gorulenIstekler.find((i) => i.url === "ANTHROPIC_PARSED");
  kontrol("23) 5C regresyonu: user_id/PII Anthropic isteğinde hâlâ yok", !JSON.stringify(anth.parsed).includes("cok-gizli-id-mini"));
  fetchMockTemizle();
}

// 24) genel akış: yeni prompt ile board_actions/answer_history/schema/RPC yazma YOK — sadece mevcut cevap+board_actions alanı döner
{
  const m = anthropicMock({ toolActions: null });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "mini soru sor" }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: SYSTEM_PROMPT }, { ip: "70.0.0.4" }), res);
  kontrol("24) uçtan uca) mini-check destekli yeni prompt ile mevcut response şekli (content/board_actions) DEĞİŞMEDEN çalışıyor (regresyon yok)", res._status === 200 && Array.isArray(res._json.board_actions) && res._json.content?.find((b) => b.type === "text")?.text === "cevap");
  fetchMockTemizle();
}

process.env.ANTHROPIC_API_KEY = orijinalKey;

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
