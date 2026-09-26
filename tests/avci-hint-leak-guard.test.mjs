// AVCI HINT LEAK GUARD (KATMAN 5 FINAL SINAV / TURBO #8). Gerçek modelle
// yapılan 2 temiz koşuda AVCI, prompt yasağına rağmen ipucu mesajında soru
// cümlesinin cevabı içeren kısmını KALIN alıntı olarak tekrar yazdı. Bu test
// api/klod.mjs'deki DETERMINISTIK, FAIL-OPEN arka korumayı doğrular:
//   - klodIpucuYanitiMi(): SADECE cevaplanmamış aktif soruda, açık soru
//     sonrası kısa cevap denemesinde true (çözüm/anlamadım/özetle/devam/soru
//     işareti/ilk tur/cevaplanmış soru/uzun mesaj → false)
//   - klodSoruIfadesiSizintisiniTemizle(): soru cümlesinden BİREBİR 2+ kelimelik
//     dizileri "…" yapar; öğrencinin kendi yazdığı ve tek kelimelik anmalar
//     DOKUNULMAZ; hata → orijinal metin
//   - handler: mode==='chat' + stream değil; chat max_tokens 700, diğer modlar 350
// Gerçek Anthropic/Supabase ağına HİÇ çıkılmaz (mock fetch).

import handler, { klodIpucuYanitiMi, klodSoruIfadesiSizintisiniTemizle } from "../api/klod.mjs";
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

const SORU = "The treatment was far from effective although it had shown promising results in trials.";
const BAGLAM = { module: "sinyal_lab", question_id: "q004", answered: false };
const ACIK_SORU_MSG = "Cumledeki asil fiili bulabilir misin? Yargiyi veren fiil hangisi?";
const orta = (son) => [
  { role: "user", content: "Hocam anlamadim." },
  { role: "assistant", content: ACIK_SORU_MSG },
  { role: "user", content: son },
];

// ---- gerçek koşularda yakalanan sızıntı transkriptleri ----
const SIZINTI_1 = 'Hayır, "trials" bir isim.\n\nCümleye başından bak: **"The treatment was far from effective..."**\n\nBurada ana konu (özne) olarak kim/ne hakkında konuşuluyor?';
const SIZINTI_2 = 'Geri dönelim: cümlede yargıyı veren asıl fiil hangisi?\n\n"The treatment **was far from effective**" — burada ne söyleniyor tedavi hakkında?';

// ============================================================
// SAF FONKSİYON — temizleme
// ============================================================
{
  const t1 = klodSoruIfadesiSizintisiniTemizle(SIZINTI_1, SORU, "trials");
  kontrol("1) gerçek sızıntı #1 (kalın tırnaklı cümle başı): cevabı içeren 'The treatment was far from effective' KALKTI, '…' geldi, kalın alıntı KALMADI", !/treatment|far from effective/i.test(t1) && t1.includes("…") && !/\*\*"?…/.test(t1) && /Burada ana konu/.test(t1), JSON.stringify(t1));
  const t2 = klodSoruIfadesiSizintisiniTemizle(SIZINTI_2, SORU, "trials");
  kontrol("2) gerçek sızıntı #2 (içte kalın): 'The treatment was far from effective' KALKTI, yetim ** KALMADI, Türkçe metin AYNEN", !/treatment|far from effective/i.test(t2) && (t2.match(/\*\*/g) || []).length % 2 === 0 && /Geri dönelim: cümlede yargıyı veren asıl fiil hangisi\?/.test(t2) && /burada ne söyleniyor tedavi hakkında\?/.test(t2), JSON.stringify(t2));
  kontrol("3) 2 kelimelik ifade ('The treatment' = özne cevabı) de kaldırılıyor", !/treatment/i.test(klodSoruIfadesiSizintisiniTemizle('Cümlenin başındaki "The treatment" kısmına bak.', SORU, "results")));
  kontrol("4) öğrencinin KENDİ yazdığı ifade onay mesajında geri söylenirse DOKUNULMAZ", klodSoruIfadesiSizintisiniTemizle('Doğru! "The treatment" özne.', SORU, "The treatment") === 'Doğru! "The treatment" özne.');
  kontrol("5) tek kelimelik anmalar ('was', 'trials', 'although') DOKUNULMAZ", klodSoruIfadesiSizintisiniTemizle('"trials" bir isim, "was" bir fiil, "although" bir bağlaç.', SORU, "x") === '"trials" bir isim, "was" bir fiil, "although" bir bağlaç.');
  kontrol("6) soru cümlesinden kopyalanmayan/sıralı olmayan metin ve tamamen Türkçe metin AYNEN döner", klodSoruIfadesiSizintisiniTemizle("Bu cümlede özne konumuna bak, hangi kelime?", SORU, "x") === "Bu cümlede özne konumuna bak, hangi kelime?" && klodSoruIfadesiSizintisiniTemizle("results promising trials in", SORU, "x") === "results promising trials in");
  kontrol("7) büyük/küçük harf ve noktalama fark etmeksizin yakalanıyor ('THE treatment, was far')", !/far/i.test(klodSoruIfadesiSizintisiniTemizle("bak: THE treatment, was far", SORU, "x")));
  kontrol("8) FAIL-OPEN: geçersiz girdiler (null/sayı/boş soru) orijinali AYNEN döndürür, HATA FIRLATMAZ", klodSoruIfadesiSizintisiniTemizle(null, SORU, "x") === null && klodSoruIfadesiSizintisiniTemizle(42, SORU, "x") === 42 && klodSoruIfadesiSizintisiniTemizle("abc def", "", "x") === "abc def" && klodSoruIfadesiSizintisiniTemizle("abc def", undefined, undefined) === "abc def");
}

// ============================================================
// SAF FONKSİYON — uygulanabilirlik kapısı
// ============================================================
{
  kontrol("9) cevaplanmamış soru + açık soru sonrası kısa cevap denemesi → TRUE", klodIpucuYanitiMi(orta("trials"), BAGLAM) === true && klodIpucuYanitiMi(orta("The treatment"), BAGLAM) === true);
  kontrol("10) cevaplanMIŞ soru → false (çözüm/analiz serbest)", klodIpucuYanitiMi(orta("trials"), { ...BAGLAM, answered: true }) === false);
  kontrol("11) context YOK → false", klodIpucuYanitiMi(orta("trials"), null) === false);
  kontrol("12) ilk tur (öncesinde asistan mesajı yok) → false", klodIpucuYanitiMi([{ role: "user", content: "Hocam anlamadim." }], BAGLAM) === false);
  kontrol("13) açık çözüm isteği ('Cozumu goster.', 'pes ettim', 'cevabi acikla') → false", klodIpucuYanitiMi(orta("Cozumu goster."), BAGLAM) === false && klodIpucuYanitiMi(orta("pes ettim"), BAGLAM) === false && klodIpucuYanitiMi(orta("cevabi acikla"), BAGLAM) === false);
  kontrol("14) yan soru ('?'), 'Anladim, devam.', 'Sinyali anlamadim.', özet, mini soru, sonraki soru, Bugünlük yeter → false", ["Promising ne demek?", "Anladim, devam.", "Sinyali anlamadim.", "Konuyu ozetle.", "Mini soru sor.", "Sonraki soru.", "Bugünlük yeter.", "Beni test et."].every((m) => klodIpucuYanitiMi(orta(m), BAGLAM) === false));
  kontrol("15) uzun mesaj (>8 kelime) → false; önceki asistan mesajı soruyla BİTMİYORSA → false", klodIpucuYanitiMi(orta("bence cevap su olmali cunku cumlede boyle bir sey var"), BAGLAM) === false && klodIpucuYanitiMi([{ role: "user", content: "a" }, { role: "assistant", content: "Tamam, devam ediyoruz." }, { role: "user", content: "trials" }], BAGLAM) === false);
  kontrol("16) FAIL-OPEN: bozuk mesaj yapıları (string olmayan content, dizi olmayan messages) → false, HATA YOK", klodIpucuYanitiMi("x", BAGLAM) === false && klodIpucuYanitiMi([{ role: "user", content: "a" }, { role: "assistant", content: ["x"] }, { role: "user", content: "b" }], BAGLAM) === false && klodIpucuYanitiMi([{ role: "user", content: "a" }, { role: "assistant", content: "soru?" }, { role: "user", content: { x: 1 } }], BAGLAM) === false);
}

// ============================================================
// HANDLER — mock Anthropic (gerçek ağ YOK); max_tokens + arka koruma
// ============================================================
function sahteRes() {
  const res = { _status: null, _json: null };
  res.status = (s) => { res._status = s; return res; };
  res.json = (j) => { res._json = j; return res; };
  res.setHeader = () => {};
  res.write = () => {};
  res.end = () => {};
  return res;
}
let ipSayac = 0;
function sahteReq(body) {
  return { method: "POST", body, headers: { "x-forwarded-for": `30.0.0.${++ipSayac}` } };
}
const orijinalFetch = globalThis.fetch;
const orijinalKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = "sahte-test-degeri-gercek-degil";
const isteklerim = [];
function anthropicMock(yanitMetni) {
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes("api.anthropic.com")) {
      isteklerim.push(JSON.parse(opts.body));
      return { ok: true, body: { getReader: () => ({ read: async () => ({ done: true }) }) }, json: async () => ({ content: [{ type: "text", text: yanitMetni }], usage: {}, stop_reason: "end_turn" }) };
    }
    return { ok: false, status: 500, json: async () => ({}), text: async () => "" };
  };
}
async function cagir(body, yanitMetni) {
  isteklerim.length = 0;
  anthropicMock(yanitMetni);
  const res = sahteRes();
  await handler(sahteReq(body), res);
  // Ana (öğretmen) istek: system'i DİZİ olan. Pedagoji kontrolcüsünün küçük hakem
  // çağrıları (string system) ayrı istektir ve önce gidebilir.
  return { res, istek: isteklerim.find((b) => Array.isArray(b.system)) };
}

try {
  {
    // Tek-çağrı pedagoji kontrolcüsü: cevap denemesi turunda model hüküm işareti verir. '[[V=C]]'
    // (doğru) => model metni AYNEN geçer ve verbatim guard bu metne uygulanır (guard'ın kendi sözleşmesi).
    const { res, istek } = await cagir({ messages: orta("trials"), mode: "chat", use_tools: false, context: BAGLAM, system: "S" }, "[[V=C]]\n" + SIZINTI_2);
    const metin = res._json?.content?.[0]?.text || "";
    kontrol("17) HANDLER chat + cevaplanmamış aktif soru + kısa deneme: sızıntı SIZDIRILMIYOR, hint_leak_guard=true, orijinal alanlar (content/board_actions/usage) yerinde", res._status === 200 && !/far from effective/i.test(metin) && metin.includes("…") && res._json.hint_leak_guard === true && Array.isArray(res._json.board_actions) && res._json.stop_reason === "end_turn", JSON.stringify(metin));
    kontrol("18) HANDLER chat modu max_tokens = 700", istek && istek.max_tokens === 700);
  }
  {
    const { res } = await cagir({ messages: orta("Cozumu goster."), mode: "chat", use_tools: false, context: BAGLAM, system: "S" }, SIZINTI_2);
    kontrol("19) HANDLER açık çözüm isteği: yanıt DEĞİŞMİYOR (çözümde cümle alıntısı serbest), hint_leak_guard=false", res._json?.content?.[0]?.text === SIZINTI_2 && res._json.hint_leak_guard === false);
  }
  {
    const { res } = await cagir({ messages: orta("trials"), mode: "chat", use_tools: false, context: { ...BAGLAM, answered: true, selected_answer: "Denemelerde etkili bulundu." }, system: "S" }, SIZINTI_2);
    kontrol("20) HANDLER cevaplanmış soru: yanıt DEĞİŞMİYOR", res._json?.content?.[0]?.text === SIZINTI_2 && res._json.hint_leak_guard === false);
  }
  {
    const { res, istek } = await cagir({ messages: orta("trials"), context: BAGLAM, system: "S" }, SIZINTI_2);
    kontrol("21) HANDLER mode YOK (chat değil): yanıt DEĞİŞMİYOR ve max_tokens 350 (diğer modlar DEĞİŞMEDİ)", res._json?.content?.[0]?.text === SIZINTI_2 && res._json.hint_leak_guard === false && istek && istek.max_tokens === 350);
  }
  {
    // soru_uret hiçbir istemcide kullanılmadığı için mode izin listesinde yok → 400, model çağrısı YOK.
    const { res: r1, istek: i1 } = await cagir({ messages: [{ role: "user", content: "x" }], mode: "soru_uret" }, "a");
    const { istek: i2 } = await cagir({ messages: [{ role: "user", content: "x" }], mode: "sinyal_analiz" }, "a");
    kontrol("22) soru_uret artık reddediliyor (400, model çağrısı yok); sinyal_analiz 400 token DEĞİŞMEDİ", r1._status === 400 && !i1 && i2 && i2.max_tokens === 400);
  }
  {
    const { res } = await cagir({ messages: [{ role: "user", content: "Hocam anlamadim." }], mode: "chat", use_tools: false, context: BAGLAM, system: "S" }, 'Bak: "The treatment was far from effective although it had shown promising results in trials."');
    kontrol("23) HANDLER ilk tur (açılış): soru cümlesini tanıtan yanıt DEĞİŞMİYOR", res._json?.content?.[0]?.text.includes("The treatment was far from effective") && res._json.hint_leak_guard === false);
  }
} finally {
  globalThis.fetch = orijinalFetch;
  if (orijinalKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = orijinalKey;
}

// ============================================================
// STATİK — kapsam / güvenlik
// ============================================================
{
  const src = readFileSync(path.join(ROOT, "api", "klod.mjs"), "utf-8").replace(/\r\n/g, "\n");
  kontrol("24) guard SADECE mode==='chat' + Array.isArray(data.content) + klodIpucuYanitiMi kapısıyla çağrılıyor, try/catch FAIL-OPEN", /if \(mode === 'chat' && !pedagojiSonuc\.kontrollu && Array\.isArray\(data\.content\) && klodIpucuYanitiMi\(messages, dogrulanmisBaglam\)\)/.test(src) && /ipucuKorumaUygulandi = false;\n      }/.test(src));
  kontrol("25) yeni ağ/provider/DB YOK: api.anthropic.com çağrısı hâlâ TEK, model AYNI, yeni fetch/supabase/eval/Function YOK", (src.match(/api\.anthropic\.com/g) || []).length === 1 && /model: 'claude-haiku-4-5-20251001',/.test(src) && !/eval\(|new Function\(|child_process/.test(src));
  kontrol("26) yanıt sözleşmesi ADDITIVE: mevcut alanlar duruyor, sadece hint_leak_guard eklendi", /\.\.\.data,\n      parsed,/.test(src) && /board_actions: pedagojiSonuc\.kontrollu \? \[\] : boardActions,\n      \/\/ TURBO #8 — ADDITIVE/.test(src) && (src.match(/hint_leak_guard/g) || []).length === 1);
}

console.log(`\n${toplam - basarisiz}/${toplam} kontrol geçti`);
if (basarisiz > 0) { console.error(`${basarisiz} kontrol BAŞARISIZ`); process.exit(1); }
