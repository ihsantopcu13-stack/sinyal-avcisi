// KATMAN 5J — EXPLICIT AVCI STEP RETEACH MVP. Öğrenci belirli bir AVCI
// basamağını (fiil/S+V+O/sinyal/sağ-sol/şık eleme) AÇIKÇA adlandırıp
// yeniden anlatılmasını istediğinde, AVCI'nin dersi baştan anlatmak veya
// yeni soru/örnek üretmek yerine SADECE o basamağı, aktif sorunun kendi
// canonical içeriğiyle, farklı bir açıdan yeniden öğretmesini doğrular.
//
// TASARIM KARARI (5I/5H'den FARKLI): Bu katman hiçbir state mutasyonu
// YAPMAZ (navigasyon/soru değişimi yok) — bu yüzden 5H/5I'nin aksine
// deterministik bir CLIENT-SIDE JS komut eşleştiricisi YAZILMADI (yeni bir
// JS fonksiyonu/state korumaya gerek yok, çünkü korunacak bir state
// mutasyonu zaten yok). Katman TAMAMEN dnavChat()'in sistem promptuna
// eklenen bir davranış sözleşmesidir — 5D/5F/5G'nin kendi yaklaşımıyla
// AYNI ("prompt CONTAINS/EXCLUDES X" seviyesinde davranış sözleşmesi
// testi). Gerçek bir LLM çağrısı YAPILAMAYACAĞI için (CI'da Anthropic ağı
// yok) "case/punctuation normalization" gibi maddeler, promptun KATI
// literal eşleşme DEĞİL, esanlamlı ifadeleri kabul eden bir tolerans
// kuralı içerdiğinin doğrulanmasıyla test edilir. Gerçek Supabase/
// Anthropic ağına HİÇ çıkılmaz.

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
const klodSrc = readFileSync(path.join(ROOT, "api", "klod.mjs"), "utf-8");

function bulSystemPrompt() {
  const start = html.indexOf("system:`", html.indexOf("async function dnavChat(){")) + "system:`".length;
  const end = html.indexOf("`", start);
  return html.slice(start, end);
}
const SYSTEM_PROMPT = bulSystemPrompt();
const RETEACH_BLOK = SYSTEM_PROMPT.slice(
  SYSTEM_PROMPT.indexOf("AVCI BASAMAK YENIDEN OGRETIMI"),
  SYSTEM_PROMPT.indexOf("MINI KONTROL (MINI SORU) KURALI")
);

// ============================================================
// STATİK — EXPLICIT STEP DETECTION sözleşmesi (VERB/SVO/SIGNAL/
// LEFT_RIGHT/OPTION_ELIMINATION)
// ============================================================
{
  kontrol("1) AVCI BASAMAK YENIDEN OGRETIMI (EXPLICIT ADIM) KURALI başlığı prompt'ta mevcut", /AVCI BASAMAK YENIDEN OGRETIMI \(EXPLICIT ADIM\) KURALI \(ZORUNLU\)/.test(SYSTEM_PROMPT));
  kontrol("2) VERB explicit detection — 'Fiili anlamadim.' VE 'Fiili tekrar anlat.' ikisi de tanımlı, SADECE FIILI BUL'a eşleniyor", /"Fiili anlamadim\." \/ "Fiili tekrar anlat\." -> SADECE FIILI BUL basamagini yeniden ogret/.test(RETEACH_BLOK));
  kontrol("3) SVO explicit detection — ikisi de tanımlı, SADECE S+V+O'ya eşleniyor", /"SVO'yu anlamadim\." \/ "S\+V\+O'yu tekrar anlat\." -> SADECE S\+V\+O basamagini yeniden ogret/.test(RETEACH_BLOK));
  kontrol("4) SIGNAL explicit detection — ikisi de tanımlı, SADECE SINYALI YAKALA'ya eşleniyor", /"Sinyali anlamadim\." \/ "Sinyali tekrar anlat\." -> SADECE SINYALI YAKALA basamagini yeniden ogret/.test(RETEACH_BLOK));
  kontrol("5) LEFT_RIGHT explicit detection — ikisi de tanımlı, SADECE SAG\/SOL KONTROL'e eşleniyor", /"Sag solu anlamadim\." \/ "Sag\/sol kontrolunu tekrar anlat\." -> SADECE SAG\/SOL KONTROL basamagini yeniden ogret/.test(RETEACH_BLOK));
  kontrol("6) OPTION_ELIMINATION explicit detection — ikisi de tanımlı, SADECE SIK ELE'ye eşleniyor", /"Sik elemeyi anlamadim\." \/ "Siklari nasil eleyecegimi anlamadim\." -> SADECE SIK ELE basamagini yeniden ogret/.test(RETEACH_BLOK));
  kontrol("7) tam olarak 5 basamak eşlemesi var (fazlası/eksiği yok)", (RETEACH_BLOK.match(/-> SADECE [A-Z+\/ ]+ basamagini yeniden ogret\./g) || []).length === 5);
  kontrol("8) 'esanlamli ifadeleri de kabul et' toleransı AÇIKÇA yazılı (case/punctuation'ı katı literal eşleşmeye MAHKUM etmiyor)", /esanlamli ifadeleri de kabul et/.test(RETEACH_BLOK));
  kontrol("9) blok yapısal olarak DIGER OGRENCI IFADELERI ile MINI KONTROL arasında (doğru yerde, tek kopya)", SYSTEM_PROMPT.indexOf("DIGER OGRENCI IFADELERI") < SYSTEM_PROMPT.indexOf("AVCI BASAMAK YENIDEN OGRETIMI") && SYSTEM_PROMPT.indexOf("AVCI BASAMAK YENIDEN OGRETIMI") < SYSTEM_PROMPT.indexOf("MINI KONTROL (MINI SORU) KURALI"));
  kontrol("10) blok TAM OLARAK 1 kez geçiyor (duplicate YOK)", (SYSTEM_PROMPT.match(/AVCI BASAMAK YENIDEN OGRETIMI \(EXPLICIT ADIM\) KURALI/g) || []).length === 1);
}

// ============================================================
// GENERIC "HALA ANLAMADIM" — hiçbir basamağa otomatik eşlenmez
// ============================================================
{
  kontrol('11) "Hocam hala anlamadim." AÇIKÇA istisna olarak yazılı (bir basamağa otomatik eşlenmiyor)', /"Hocam hala anlamadim\."/.test(RETEACH_BLOK));
  kontrol('12) "Yine anlamadim." AÇIKÇA istisna olarak yazılı', /"Yine anlamadim\."/.test(RETEACH_BLOK));
  kontrol('13) "Anlamadim." AÇIKÇA istisna olarak yazılı', /"Anlamadim\."/.test(RETEACH_BLOK));
  kontrol("14) genel/belirsiz ifadelerin HİÇBİR basamağa otomatik ESLENMEDIĞİ ve bu kuralın TETIKLENMEDIĞI açıkça yazılı", /HICBIR basamaga otomatik ESLENMEZ - boyle bir durumda bu kurali TETIKLEME/.test(RETEACH_BLOK));
  kontrol("15) genel ifadede mevcut SOCRATIC\/\"Bastan anlat\" akışına devam edileceği açık (yeni bir davranış İCAT edilmiyor)", /mevcut SOCRATIC\/"Bastan anlat" akisina \(konusma gecmisinden cikarimla\) devam et/.test(RETEACH_BLOK));
}

// ============================================================
// OTOMATIK KOK-NEDEN / DIAGNOSTIC / STUDENT-MODEL TABANLI SEÇİM YASAĞI
// ============================================================
{
  kontrol("16) 'Otomatik kok-neden teshisi YAPMA' AÇIKÇA yazılı", /Otomatik kok-neden teshisi YAPMA/.test(RETEACH_BLOK));
  kontrol("17) OGRENCI KANIT OZETI'ne/gecmis performansa göre basamak SEÇİMİ AÇIKÇA yasaklanmış", /OGRENCI KANIT OZETI'ne veya gecmis performansa BAKARAK hangi basamaga donulecegine KARAR VERME/.test(RETEACH_BLOK));
  kontrol("18) basamağın SADECE öğrencinin kendi AÇIK ifadesinden geldiği AÇIKÇA yazılı", /basamak SADECE ogrencinin kendi ACIK ifadesinden gelir/.test(RETEACH_BLOK));
  kontrol("19) 'diagnostic_events'/'avciKokNedenAnalizEt' bu blokta HİÇ geçmiyor (Katman4'e bağlanmadı)", !/diagnostic_events|avciKokNedenAnalizEt/.test(RETEACH_BLOK));
}

// ============================================================
// RETEACH BEHAVIOR — aktif soru korunur, tam restart/yeni soru/yeni
// örnek YOK, SADECE istenen basamak farklı açıdan yeniden anlatılır
// ============================================================
{
  kontrol("20) aktif soruyu DEGISTIRME yasağı AÇIKÇA yazılı", /Aktif soruyu DEGISTIRME/.test(RETEACH_BLOK));
  kontrol("21) dersi bastan ANLATMA (GOR adimindan tekrar baslatma) yasağı AÇIKÇA yazılı — 'Bastan anlat' ile KARIŞTIRILMIYOR", /dersi bastan ANLATMA \(GOR adimindan tekrar baslatma\)/.test(RETEACH_BLOK));
  kontrol("22) YENI bir soru ACMA yasağı AÇIKÇA yazılı (5H/5I ile KARIŞTIRILMIYOR)", /YENI bir soru ACMA/.test(RETEACH_BLOK));
  kontrol("23) YENI bir 'ornek' URETME yasağı AÇIKÇA yazılı (Teaching Example ile KARIŞTIRILMIYOR)", /YENI bir "ornek" URETME/.test(RETEACH_BLOK));
  kontrol("24) SADECE istenen TEK basamağın, AYNI aktif soru üzerinde tekrar verileceği AÇIKÇA yazılı", /SADECE istenen TEK basamagi, AYNI aktif soru uzerinde, farkli bir anlatimla tekrar ver/.test(RETEACH_BLOK));
  kontrol("25) 'daha sade ve FARKLI bir acidan' (sade + farklı açı) sözleşmesi AÇIKÇA yazılı", /daha sade ve FARKLI bir acidan yeniden ogret/.test(RETEACH_BLOK));
}

// ============================================================
// MİKRO-KONTROL + STOP/WAIT + SAME-TURN BOARD/METİN ANSWER-LEAK YASAĞI
// ============================================================
{
  kontrol("26) basamağı yeniden anlattıktan SONRA TEK küçük bir kontrol sorusu sor kuralı AÇIKÇA yazılı", /Basamagi yeniden anlattiktan SONRA TEK kucuk bir kontrol sorusu sor/.test(RETEACH_BLOK));
  kontrol("27) sonra DUR - öğrencinin cevabını BEKLE AÇIKÇA yazılı", /sonra DUR - ogrencinin cevabini BEKLE/.test(RETEACH_BLOK));
  kontrol("28) SOCRATIC TEK ADIM ve TAHTA ZAMANLAMASI kurallarına 'AYNEN tabidir' diye AÇIKÇA bağlanmış", /SOCRATIC TEK ADIM ve TAHTA ZAMANLAMASI kurallarina AYNEN tabidir/.test(RETEACH_BLOK));
  kontrol("29) kontrol sorusunun cevabını AYNI mesajda söylememe/ima etmeme (metin answer-leak yasağı) AÇIKÇA yazılı", /sordugun kontrol sorusunun cevabini AYNI mesajda soyleme\/ima etme/.test(RETEACH_BLOK));
  kontrol("30) VERB check → HIGHLIGHT_VERB aynı turda çağrılmama AÇIKÇA yazılı (board answer-leak yok)", /FIILI BUL kontrolu icin HIGHLIGHT_VERB/.test(RETEACH_BLOK));
  kontrol("31) SVO check → SHOW_SVO aynı turda çağrılmama AÇIKÇA yazılı", /S\+V\+O kontrolu icin SHOW_SVO/.test(RETEACH_BLOK));
  kontrol("32) SIGNAL check → HIGHLIGHT_SIGNAL aynı turda çağrılmama AÇIKÇA yazılı", /SINYALI YAKALA kontrolu icin HIGHLIGHT_SIGNAL/.test(RETEACH_BLOK));
  kontrol("33) LEFT_RIGHT check → SHOW_LEFT_RIGHT aynı turda çağrılmama AÇIKÇA yazılı", /SAG\/SOL KONTROL icin SHOW_LEFT_RIGHT/.test(RETEACH_BLOK));
  kontrol("34) bu 4 action'ın HİÇBİRİNİN kontrol sorusuyla AYNI mesajda çağrılmayacağı AÇIKÇA yazılı", /bunlarin hicbiri kontrol sorusuyla AYNI mesajda cagrilmaz/.test(RETEACH_BLOK));
}

// ============================================================
// STATE / NAVIGATION LOCK — yeni JS kodu/state/navigasyon YOK (bu blok
// TAMAMEN düz metin, çalıştırılabilir kod İÇERMİYOR)
// ============================================================
{
  kontrol("35) reteach bloğu (extracted) hiçbir JS kontrol akışı/atama İÇERMİYOR (function/=>/slIdx=/slAnswered= yok) — pure prose", !/function\s|=>|slIdx\s*=|slAnswered\s*=|slCurrentSoru\s*=/.test(RETEACH_BLOK));
  kontrol("36) reteach bloğunda slSonraki()/window.__slDeepLinkSoru HİÇ geçmiyor (navigasyon YOK)", !/slSonraki\(\)|__slDeepLinkSoru/.test(RETEACH_BLOK));
  kontrol("37) index.html'de slSonraki()/window.__slDeepLinkSoru referansları hâlâ TAM OLARAK 5H/5I'deki gibi (bu turda YENİ bir çağrı EKLENMEDİ)", (html.match(/if\(typeof slSonraki==='function'\)slSonraki\(\);/g) || []).length === 1 && (html.match(/window\.__slDeepLinkSoru=SL_HAVUZ\[adayRawIdx\];/g) || []).length === 1);
  kontrol("38) 5H komut eşleştirici (avciSonrakiSoruKomutuMu) TAM OLARAK 1 kez, DEĞİŞMEDİ", (html.match(/function avciSonrakiSoruKomutuMu\(metin\)\{/g) || []).length === 1);
  kontrol("39) 5I komut eşleştirici (avciSinyalPratikKomutuMu) TAM OLARAK 1 kez, DEĞİŞMEDİ", (html.match(/function avciSinyalPratikKomutuMu\(metin\)\{/g) || []).length === 1);
  kontrol("40) 5H/5I komut listeleri bu turda BÜYÜMEDİ (hâlâ 5'er sabit ifade)", (() => {
    const kom5h = html.match(/const AVCI_SONRAKI_SORU_KOMUTLARI=\[([\s\S]*?)\];/)[1].match(/'/g).length;
    const kom5i = html.match(/const AVCI_SINYAL_PRATIK_KOMUTLARI=\[([\s\S]*?)\];/)[1].match(/'/g).length;
    return kom5h === 10 && kom5i === 10; // 5 ifade x 2 tırnak
  })());
}

// ============================================================
// KAPSAM KİLİDİ / REGRESYON — 5D/5E/5F/5G/5H/5I korunuyor, api/klod.mjs
// bu katmanda HİÇ değişmedi
// ============================================================
{
  kontrol("41) MINI KONTROL (5G) bölümü hâlâ mevcut, korunmuş", /MINI KONTROL \(MINI SORU\) KURALI \(ZORUNLU\):/.test(SYSTEM_PROMPT));
  kontrol("42) TAHTA ZAMANLAMASI KURALI (5F) bölümü hâlâ mevcut, korunmuş", /TAHTA ZAMANLAMASI KURALI \(ZORUNLU/.test(SYSTEM_PROMPT));
  kontrol("43) SOCRATIC TEK ADIM KURALI (5D) bölümü hâlâ mevcut, korunmuş", /SOCRATIC TEK ADIM KURALI \(ZORUNLU/.test(SYSTEM_PROMPT));
  kontrol("44) BOARD_ACTION_ALLOWLIST hâlâ TAM OLARAK 8 action (genişletilmedi)", BOARD_ACTION_ALLOWLIST.size === 8);
  kontrol("45) klodBoardActionlariDogrula TAM OLARAK 1 kez tanımlı, DEĞİŞMEDİ", (klodSrc.match(/function klodBoardActionlariDogrula\(rawActions, dogrulanmisBaglam, canonical\)/g) || []).length === 1);
  kontrol("46) api/klod.mjs — 'KATMAN 5J'/'avciBasamakYenidenOgret' hiç geçmiyor (server'a dokunulmadı)", !/KATMAN 5J/.test(klodSrc) && !/avciBasamakYenidenOgret/i.test(klodSrc));
  kontrol("47) api/klod.mjs — service_role/eval/new Function hâlâ yok (5J bunu değiştirmedi)", (() => {
    const kodSatirlari = klodSrc.split("\n").filter((s) => !s.trim().startsWith("//")).join("\n");
    return !/SERVICE_ROLE/i.test(kodSatirlari) && !/\beval\(/.test(kodSatirlari) && !/new Function\(/.test(kodSatirlari);
  })());
  kontrol("48) AVCI 7 adımı UI method-strip ile hâlâ birebir aynı (değişmedi)", (() => {
    const stripEtiketleri = [...html.matchAll(/<span class="klod-method-chip">([^<]+)<\/span>/g)].map((m) => m[1]);
    function fold(s) {
      return String(s).toLocaleLowerCase("tr-TR").replace(/ı/g, "i").replace(/İ/g, "i").replace(/ğ/g, "g").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ç/g, "c").replace(/[^a-z0-9+/\s]/g, "").trim();
    }
    const beklenen = ["gor", "fiili bul", "s+v+o", "sinyali yakala", "sag/sol kontrol", "sik ele", "anlami dogrula"];
    return JSON.stringify(stripEtiketleri.map(fold)) === JSON.stringify(beklenen);
  })());
}

// ============================================================
// SERVER — handler mock testleri (gerçek ağ yok) — 5B/5C/5E regresyon
// spot-check, yeni sistem promptu ile
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

// 49) 5B answer-leak: reteach kuralı eklendikten sonra bile before-answer'da correct_answer/is_correct sistemde yok
{
  const m = anthropicMock({ toolActions: null });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "Fiili anlamadim." }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: SYSTEM_PROMPT }, { ip: "80.0.0.1" }), res);
  const anth = m.gorulenIstekler.find((i) => i.url === "ANTHROPIC_PARSED");
  const sistemMetni = JSON.stringify(anth.parsed.system);
  kontrol("49) 5B answer-leak regresyonu: before-answer'da correct_answer/is_correct HÂLÂ yok", !sistemMetni.includes('"correct_answer"') && !sistemMetni.includes('"is_correct"'));
  fetchMockTemizle();
}

// 50) board_actions akışı (5E) reteach senaryosunda da bozulmadan çalışıyor
{
  const m = anthropicMock({ toolActions: [{ type: "HIGHLIGHT_VERB", text: "ruled" }, { type: "HIGHLIGHT_VERB", text: "uydurma-fiil" }] });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "Fiili tekrar anlat." }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: SYSTEM_PROMPT }, { ip: "80.0.0.2" }), res);
  kontrol("50) 5E regresyonu: gerçek fiil ACCEPT, uydurma fiil DROP — allowlist/canonical validator değişmedi", res._json.board_actions.length === 1 && res._json.board_actions[0].text === "ruled");
  fetchMockTemizle();
}

// 51) ELIMINATE_OPTION answered=false → hâlâ server tarafında DROP (5E kilidi 5J ile gevşemedi)
kontrol("51) ELIMINATE_OPTION answered=false → HÂLÂ sunucu tarafında DROP (doğrudan fonksiyon çağrısı)", klodBoardActionlariDogrula([{ type: "ELIMINATE_OPTION", option_index: 0 }], { module: "sinyal_lab", question_id: "q001", answered: false }, CANONICAL_Q1).length === 0);

// 52) 5C privacy: reteach akışında bile user_id/PII Anthropic isteğine hiç gitmiyor
{
  const m = anthropicMock({ authBody: { id: "cok-gizli-id-reteach", is_anonymous: false }, toolActions: null });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "SVO'yu anlamadim." }], mode: "chat", system: SYSTEM_PROMPT }, { ip: "80.0.0.3", authorization: "Bearer tok" }), res);
  const anth = m.gorulenIstekler.find((i) => i.url === "ANTHROPIC_PARSED");
  kontrol("52) 5C regresyonu: user_id/PII Anthropic isteğinde hâlâ yok", !JSON.stringify(anth.parsed).includes("cok-gizli-id-reteach"));
  fetchMockTemizle();
}

// 53) genel akış: yeni prompt ile response şekli (content/board_actions) DEĞİŞMEDEN çalışıyor, yeni bir write alanı YOK
{
  const m = anthropicMock({ toolActions: null });
  fetchMockKur(m.impl);
  const res = sahteRes();
  await handler(sahteReq({ messages: [{ role: "user", content: "Sinyali anlamadim." }], mode: "chat", context: { module: "sinyal_lab", question_id: "q001", answered: false }, system: SYSTEM_PROMPT }, { ip: "80.0.0.4" }), res);
  kontrol("53) uçtan uca) reteach destekli yeni prompt ile mevcut response şekli DEĞİŞMEDEN çalışıyor (regresyon yok)", res._status === 200 && Array.isArray(res._json.board_actions) && res._json.content?.find((b) => b.type === "text")?.text === "cevap" && !("answer_history" in res._json) && !("student_model" in res._json));
  fetchMockTemizle();
}

process.env.ANTHROPIC_API_KEY = orijinalKey;

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
