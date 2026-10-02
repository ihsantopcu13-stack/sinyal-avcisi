// AVCI PEDAGOJI KONTROLCUSU — TEK ÇAĞRI (KATMAN 5 FINAL SINAV / TURBO #8-B).
// B merdiveni (1. hata -> 2. hata geri adım -> toparlanma -> ASIL soru) prompt ile
// garanti edilemedi (gerçek model kanıtı). Bu test api/_avciPedagogy.mjs +
// api/klod.mjs köprüsünün DETERMINISTIK sözleşmesini kanıtlar:
//   - öğretmen çağrısı DIŞINDA model çağrısı YOK (ayrı değerlendirici/sızıntı
//     hakemi YOK): kontrollü her tur = TAM 1 Anthropic isteği
//   - öğrenci cevabının hükmü AYNI öğretmen yanıtının [[V=C|W|U]] işaretinden
//     okunur; işaret ayıklanır, görünür yanıta/board'a ASLA sızmaz
//   - işaret eksik/bozuk/çelişkili/UNCLEAR => HOLD: durum ilerlemez, öğrenci
//     yanlış sayılmaz, cevap açılmaz, bekleyen soru korunur
//   - MISS_1 = sunucu şablonu + ASIL soru; STEP_BACK = doğrulanmış TEK LLM sorusu;
//     RECOVERY = sunucu onayı + ASIL soru BİREBİR; ADVANCE ancak restore edilen
//     ASIL soruya DOĞRU cevapta
//   - çözüm isteği / cevaplanmış soru durumu DÜŞÜRÜR (tuzak YOK); soru-bağımsız.
// Gerçek ağa HİÇ çıkılmaz (mock fetch).

import handler from "../api/klod.mjs";
import * as P from "../api/_avciPedagogy.mjs";
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

const ORIG = "Yargiyi veren fiil hangisi?";
const ASISTAN_1 = `Cumledeki asil fiili bulabilir misin? ${ORIG}`;
const SORU_EN = "The treatment was far from effective although it had shown promising results in trials.";

// ============================================================
// SAF — yardımcılar
// ============================================================
{
  kontrol("1) soruCumlesiCikar: mesajdaki SON soru cümlesini (kalın işaretsiz) verir; soru yoksa null", P.soruCumlesiCikar(ASISTAN_1) === ORIG && P.soruCumlesiCikar("**Bu cumledeki fiil hangisi?**") === "Bu cumledeki fiil hangisi?" && P.soruCumlesiCikar("Tamam, devam ediyoruz.") === null && P.soruCumlesiCikar(42) === null);
  kontrol("2) alternatifSoruMu: 'X mi yoksa Y mi?' ve 'X mi Y mi?' YAKALANIR; sade sorular ve 'misin' YAKALANMAZ", P.alternatifSoruMu("Zıtlık mı yoksa neden-sonuç mu?") && P.alternatifSoruMu("zitlik mi neden-sonuc mi?") && !P.alternatifSoruMu(ORIG) && !P.alternatifSoruMu("Bunu bulabilir misin?"));
  kontrol("3) yonlendiriciSoruMu: 'değil mi', 'öyle mi', 'doğru mu' gibi cevabı ağza koyan etiket sorular YAKALANIR; sade soru YAKALANMAZ", P.yonlendiriciSoruMu("Bu iki yargı zıt değil mi?") && P.yonlendiriciSoruMu("Öyle mi?") && P.yonlendiriciSoruMu("Bu doğru mu?") && !P.yonlendiriciSoruMu("Cümlede kaç yargı var?"));
  kontrol("4) cozumIstegiMi + benzerlik", P.cozumIstegiMi("Cozumu goster.") && P.cozumIstegiMi("pes ettim") && !P.cozumIstegiMi("was") && P.benzerlik(ORIG, ORIG) === 1 && P.benzerlik(ORIG, "Hangisi ana yargi?") < 0.6);
}

// ============================================================
// SAF — geçiş tablosu (ORIGINAL_PENDING -> MISS_1 -> STEP_BACK -> RECOVERY -> ORIGINAL)
// ============================================================
{
  let g = P.gecis(null, "WRONG", { pending: ORIG });
  kontrol("5) ilk yanlış: MISS_1 (ilerleme YOK), ASIL soru durumda saklanıyor", g.mod === "MISS_1" && g.yeni.faz === "MISS_1" && g.yeni.orig === ORIG);
  g = P.gecis({ faz: "MISS_1", orig: ORIG }, "WRONG", { pending: ORIG });
  kontrol("6) ikinci yanlış (AYNI soru): STEP_BACK", g.mod === "STEP_BACK" && g.yeni.faz === "STEP_BACK" && g.yeni.orig === ORIG);
  g = P.gecis({ faz: "STEP_BACK", orig: ORIG }, "CORRECT", { pending: "x?" });
  kontrol("7) geri adıma DOĞRU: RECOVERY (ADVANCE DEĞİL), durum RECOVERED, ASIL soru KORUNUYOR", g.mod === "RECOVERY" && g.yeni.faz === "RECOVERED" && g.yeni.orig === ORIG);
  g = P.gecis({ faz: "RECOVERED", orig: ORIG }, "CORRECT", { pending: ORIG });
  kontrol("8) restore edilen ASIL soruya DOĞRU: ADVANCE (ancak şimdi ilerler), durum düşer", g.mod === "ADVANCE" && g.yeni === null);
  g = P.gecis({ faz: "RECOVERED", orig: ORIG }, "WRONG", { pending: ORIG });
  kontrol("9) restore edilen ASIL soruya yanlış: MISS_1'e döner, ASIL soru KORUNUR", g.mod === "MISS_1" && g.yeni.orig === ORIG);
  g = P.gecis({ faz: "STEP_BACK", orig: ORIG }, "WRONG", {});
  kontrol("10) geri adıma da yanlış: OFFER, durum düşer — sonsuz döngü/tuzak YOK", g.mod === "OFFER" && g.yeni === null);
  kontrol("11) UNCLEAR durumu DEĞİŞTİRMEZ ve yanlış SAYMAZ (mod null)", P.gecis(null, "UNCLEAR", {}).mod === null && P.gecis({ faz: "MISS_1", orig: ORIG }, "UNCLEAR", {}).mod === null && P.gecis({ faz: "MISS_1", orig: ORIG }, "UNCLEAR", {}).yeni.faz === "MISS_1");
}

// ============================================================
// SAF — hüküm işareti (ayıklama, eksik/bozuk/çelişkili => UNCLEAR)
// ============================================================
{
  const w = P.isaretiAyikla("[[V=W]]\nBir şey.");
  kontrol("12) işaret ayıklanır: '[[V=W]]' -> hüküm WRONG, temiz metinde işaret YOK", w.hukumler[0] === "WRONG" && !/\[\[/.test(w.temiz) && w.temiz === "Bir şey." && w.bozuk === false);
  kontrol("13) biçim toleransı: '[[ V = correct ]]' -> CORRECT; '[[V=C]]' -> CORRECT; '[[V=U]]' -> UNCLEAR", P.isaretiAyikla("[[ V = correct ]] x").hukumler[0] === "CORRECT" && P.isaretiAyikla("[[V=C]]").hukumler[0] === "CORRECT" && P.isaretiAyikla("[[V=U]]").hukumler[0] === "UNCLEAR");
  const bozuk = P.isaretiAyikla("[[V=W] Metin");
  kontrol("14) BOZUK işaret ('[[V=W]') görünür metinden de TEMİZLENİR ve UNCLEAR sayılır", bozuk.bozuk === true && !/\[\[/.test(bozuk.temiz) && P.nihaiHukum(bozuk.hukumler, bozuk.bozuk) === "UNCLEAR");
  kontrol("15) nihaiHukum: eksik => UNCLEAR; çelişkili (C+W) => UNCLEAR; bilinmeyen ('[[V=Q]]') => UNCLEAR; tutarlı => o hüküm", P.nihaiHukum([], false) === "UNCLEAR" && P.nihaiHukum(["CORRECT", "WRONG"], false) === "UNCLEAR" && P.nihaiHukum(P.isaretiAyikla("[[V=Q]]").hukumler, false) === "UNCLEAR" && P.nihaiHukum(["WRONG", "WRONG"], false) === "WRONG");
  kontrol("16) yönerge ÖNCEKİ duruma göre: her durumda işaret talimatı + 'be' fiili kuralı (çalışma-zamanı if/else DEĞİL); STEP_BACK'te 'HICBIR SEY yazma'; MISS_1'de tek alt soru kısıtları", ["MISS_1", "STEP_BACK", null].every((f) => /\[\[V=C\]\]/.test(P.dogrulamaYonergesi(f)) && /"be" fiili \(is\/are\/was\/were\) cumlenin TEK sonlu yuklem fiiliyse DOGRU cevaptir/.test(P.dogrulamaYonergesi(f))) && /HICBIR SEY yazma/.test(P.dogrulamaYonergesi("STEP_BACK")) && /BIR KADEME daha kucuk/.test(P.dogrulamaYonergesi("MISS_1")) && /HICBIR SEY yazma \(sistem ipucunu kendisi verir\)/.test(P.dogrulamaYonergesi(null)));
}

// ============================================================
// SAF — şablonlar + geri adım doğrulaması
// ============================================================
{
  const sonuclar = [0, 1, 2, 3].map((t) => P.sablon("MISS_1", { orig: ORIG, tohum: t }));
  kontrol("17) MISS_1 şablonu: jenerik yapısal ipucu + ASIL soru sonda; TEK soru işareti; 'Hayır' YOK; aday listesi YOK; içerik/cevap kelimesi YOK", sonuclar.every((m) => m.endsWith(ORIG) && (m.match(/\?/g) || []).length === 1 && !/^Hay[ıi]r/i.test(m) && !P.alternatifSoruMu(m) && !/although|despite|treatment|was\b|zit|çeliş|celis|karşıt/i.test(m.replace(ORIG, ""))));
  kontrol("18) RECOVERY şablonu: nötr onay + ASIL soru BİREBİR; TEK soru; OFFER soru içermez; HOLD bekleyen soruyu korur", P.sablon("RECOVERY", { orig: ORIG, tohum: 1 }).endsWith(`\n\n${ORIG}`) && (P.sablon("RECOVERY", { orig: ORIG }).match(/\?/g) || []).length === 1 && !P.sablon("OFFER").includes("?") && P.sablon("HOLD", { orig: ORIG }).endsWith(ORIG) && P.sablon("HOLD", {}) === null);
  const iyi = P.geriAdimDogrula("Bir şey söyleyeyim: bu iki fikir ilişkili. Cümlede kaç ayrı yargı var?", { orig: ORIG, oncekiSoru: ORIG });
  kontrol("19) STEP_BACK: TEK küçük soru kabul; deklaratif lead ATILIR (sadece soru kalır); ASIL soru DEĞİL", !iyi.yedek && iyi.metin === "Cümlede kaç ayrı yargı var?");
  const ihlaller = {
    "aday listesi (mi yoksa)": "Zıtlık mı yoksa neden-sonuç mu?",
    "yönlendirici etiket soru (değil mi)": "Bu iki yargı birbirine zıt değil mi?",
    "öyle mi": "Öyle mi?",
    "birden çok soru": "Cümlede kaç yargı var? Hangisi ana yargı?",
    "soru yok": "Cümlenin başına bak.",
    "ASIL sorunun tekrarı": "Yargıyı veren fiil hangisi?",
    "ASIL sorunun yeniden ifadesi": "Peki yargiyi veren asil fiil hangisi?",
    "verbatim cümle alıntısı": "The treatment was far from effective kısmında ne var?",
    "çok uzun soru": "x ".repeat(150) + "?",
  };
  const verb = (q) => P.katla(q).includes("the treatment was far from effective");
  const hepsi = Object.entries(ihlaller).every(([, m]) => { const s = P.geriAdimDogrula(m, { orig: ORIG, oncekiSoru: ORIG, verbatimIhlalMi: verb }); return s.yedek === true && s.metin === P.sablon("STEP_BACK") && (s.metin.match(/\?/g) || []).length === 1; });
  kontrol("20) STEP_BACK ihlalleri (aday listesi, 'değil mi', 'öyle mi', çok soru, soru yok, ASIL soru tekrarı/yeniden ifadesi, verbatim alıntı, çok uzun) => TEK-soru genel yedek", hepsi, Object.keys(ihlaller).length + " ihlal türü");
  kontrol("21) yedek geri adım sorusu GENEL (içerik kelimesi yok), TEK soru", !/although|despite|treatment|was\b|q0\d\d/i.test(P.sablon("STEP_BACK")) && (P.sablon("STEP_BACK").match(/\?/g) || []).length === 1);
}

// ============================================================
// SAF — yanitiKur (model metni yalnız ADVANCE ve doğrulanmış STEP_BACK'te kullanılır)
// ============================================================
{
  const sizinti = "Tersine bir ilişki gösteriyor. Zıtlık mı yoksa neden mi?";
  const m = P.yanitiKur({ gecerli: null, hukum: "WRONG", pending: ORIG, modelMetni: sizinti, tohum: 0 });
  kontrol("22) 1. yanlış: model metni (anlamsal ifşa dahil) TAMAMEN yok sayılır; sunucu şablonu + ASIL soru", m.mod === "MISS_1" && !/Tersine|yoksa/.test(m.metin) && m.metin.endsWith(ORIG));
  const a = P.yanitiKur({ gecerli: null, hukum: "CORRECT", pending: ORIG, modelMetni: "Doğru! Şimdi S+V+O.", tohum: 0 });
  kontrol("23) doğru cevap: ADVANCE, model metni AYNEN geçer, durum düşer; boş model metni => nötr yedek", a.mod === "ADVANCE" && a.metin === "Doğru! Şimdi S+V+O." && a.yeni === null && P.yanitiKur({ gecerli: null, hukum: "CORRECT", pending: ORIG, modelMetni: "", tohum: 0 }).metin === "Doğru. Devam edelim.");
  const h = P.yanitiKur({ gecerli: { faz: "MISS_1", orig: ORIG }, hukum: "UNCLEAR", pending: ORIG, modelMetni: sizinti, tohum: 0 });
  kontrol("24) UNCLEAR: HOLD — durum AYNEN korunur (MISS_1), yanlış SAYILMAZ, model metni yok sayılır (sızmaz), bekleyen soru korunur", h.mod === "HOLD" && h.yeni.faz === "MISS_1" && !/Tersine/.test(h.metin) && h.metin.endsWith(ORIG));
}

// ============================================================
// SAF — durum doğrulama (istemciden gelen durum GÜVENİLMEZ)
// ============================================================
{
  const msgs = [{ role: "user", content: "Hocam anlamadim." }, { role: "assistant", content: `Bak: **${ASISTAN_1}**` }, { role: "user", content: "trials" }, { role: "assistant", content: `Henüz değil.\n\n${ORIG}` }, { role: "user", content: "results" }];
  const iyi2 = { v: 1, qid: "q004", faz: "MISS_1", orig: ORIG, n: msgs.length - 1 };
  kontrol("25) geçerli durum kabul edilir (kalın işaretli asistan mesajında da orig bulunur)", P.durumuDogrula(iyi2, { qid: "q004", messages: msgs })?.faz === "MISS_1");
  kontrol("26) başka soru (qid), yanlış geçmiş uzunluğu, konuşmada OLMAYAN orig, geçersiz faz/sürüm/tip => durum ATILIR", P.durumuDogrula(iyi2, { qid: "q001", messages: msgs }) === null && P.durumuDogrula({ ...iyi2, n: 99 }, { qid: "q004", messages: msgs }) === null && P.durumuDogrula({ ...iyi2, orig: "Uydurma soru mu?" }, { qid: "q004", messages: msgs }) === null && P.durumuDogrula({ ...iyi2, faz: "ADVANCE" }, { qid: "q004", messages: msgs }) === null && P.durumuDogrula({ ...iyi2, v: 2 }, { qid: "q004", messages: msgs }) === null && P.durumuDogrula("x", { qid: "q004", messages: msgs }) === null && P.durumuDogrula([iyi2], { qid: "q004", messages: msgs }) === null);
}

// ============================================================
// HANDLER — mock Anthropic; her kontrollü tur TAM 1 istek
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
const orijinalFetch = globalThis.fetch;
const orijinalKey = process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY = "sahte-test-degeri-gercek-degil";

function kur(icerik) {
  const sayac = { toplam: 0, sistemString: 0, kucukToken: 0, anaSistem: "" };
  globalThis.fetch = async (url, opts) => {
    if (!String(url).includes("api.anthropic.com")) return { ok: false, status: 500, json: async () => ({}), text: async () => "" };
    const b = JSON.parse(opts.body);
    sayac.toplam++;
    if (typeof b.system === "string") sayac.sistemString++;
    if (b.max_tokens < 100) sayac.kucukToken++;
    sayac.anaSistem = JSON.stringify(b.system);
    const bloklar = typeof icerik === "string" ? [{ type: "text", text: icerik }] : icerik;
    return { ok: true, body: { getReader: () => ({ read: async () => ({ done: true }) }) }, json: async () => ({ content: JSON.parse(JSON.stringify(bloklar)), usage: {}, stop_reason: "end_turn" }) };
  };
  return sayac;
}
async function cagir(messages, { qid = "q004", answered = false, state = null, mode = "chat" } = {}) {
  const res = sahteRes();
  await handler({ method: "POST", headers: { "x-forwarded-for": `40.0.0.${++ipSayac}` }, body: { messages, mode, use_tools: false, context: { module: "sinyal_lab", question_id: qid, answered }, controller_state: state, system: "S" } }, res);
  return res._json;
}
const TEK_SORU = (t) => (t.match(/\?/g) || []).length === 1;
const ISARET_YOK = (o) => !/\[\[/.test(JSON.stringify(o));
const metinDe = (r) => r.content.find((b) => b.type === "text")?.text;
const MISS_SABLONLARI = [0, 1, 2].map((t) => P.sablon("MISS_1", { orig: ORIG, tohum: t }));

try {
  const g0 = [{ role: "user", content: "Hocam anlamadim." }, { role: "assistant", content: ASISTAN_1 }, { role: "user", content: "trials" }];

  // ---- 1. yanlış ----
  let s = kur("[[V=W]]");
  const r1 = await cagir(g0);
  const t1 = metinDe(r1);
  kontrol("27) HANDLER 1. yanlış: TAM 1 Anthropic isteği (hakem/yargıç çağrısı YOK); mod MISS_1; sunucu şablonu + ASIL soru; TEK soru; ilerleme YOK; işaret SIZMADI; durum MISS_1", s.toplam === 1 && s.sistemString === 0 && s.kucukToken === 0 && r1.pedagogy_mode === "MISS_1" && MISS_SABLONLARI.includes(t1) && TEK_SORU(t1) && ISARET_YOK(r1) && r1.controller_state?.faz === "MISS_1" && r1.controller_state.orig === ORIG && r1.pedagogy_fallback === false, JSON.stringify(t1));
  kontrol("28) durum yönergesi (system) modele eklendi: işaret talimatı + 'be' fiili kuralı (duruma göre)", /PEDAGOJIK KONTROL/.test(s.anaSistem) && /\[\[V=C\]\]/.test(s.anaSistem) && /was\/were/.test(s.anaSistem));
  s = kur("[[V=W]]\nHayır, o kelime fiil değil. Tersine bir ilişki gösteriyor. Zıtlık mı yoksa neden mi?");
  const r1b = await cagir(g0);
  kontrol("29) 1. yanlışta model anlamsal cevap/aday listesi/'Hayır' YAZSA BİLE görünür yanıtta YOK (model metni kullanılmaz); ASIL soru sonda; tek çağrı", !/Tersine|yoksa|Hayır|Zıtlık/.test(metinDe(r1b)) && metinDe(r1b).endsWith(ORIG) && TEK_SORU(metinDe(r1b)) && s.toplam === 1);

  // ---- 2. yanlış: STEP_BACK ----
  const g1 = [...g0, { role: "assistant", content: t1 }, { role: "user", content: "results" }];
  s = kur("[[V=W]]\nCümlede kaç ayrı yargı var?");
  const r2 = await cagir(g1, { state: r1.controller_state });
  const t2 = metinDe(r2);
  kontrol("30) HANDLER 2. yanlış (state echo): TAM 1 istek; mod STEP_BACK; TEK küçük LLM sorusu; ASIL soru DEĞİL; durum STEP_BACK ve ASIL soru korunuyor", s.toplam === 1 && r2.pedagogy_mode === "STEP_BACK" && t2 === "Cümlede kaç ayrı yargı var?" && P.benzerlik(t2, ORIG) < 0.6 && r2.controller_state?.faz === "STEP_BACK" && r2.controller_state.orig === ORIG && ISARET_YOK(r2), JSON.stringify(t2));
  kontrol("31) MISS_1 durumunda yönerge 'BIR KADEME daha kucuk' tek alt soru kısıtlarını içerir", /BIR KADEME daha kucuk/.test(s.anaSistem));
  const ihlaller = ["Zıtlık mı yoksa neden-sonuç mu?", "Bu iki yargı zıt değil mi?", "Cümlede kaç yargı var? Hangisi ana yargı?", "Yargıyı veren fiil hangisi?", "The treatment was far from effective kısmında ne var?"];
  let hepsiYedek = true;
  for (const ih of ihlaller) {
    s = kur(`[[V=W]]\n${ih}`);
    const r = await cagir(g1, { state: r1.controller_state });
    if (!(s.toplam === 1 && r.pedagogy_mode === "STEP_BACK" && r.pedagogy_fallback === true && metinDe(r) === P.sablon("STEP_BACK") && r.controller_state?.faz === "STEP_BACK")) hepsiYedek = false;
  }
  kontrol("32) HANDLER STEP_BACK ihlalleri (aday listesi, 'değil mi', çok soru, ASIL soru tekrarı, verbatim alıntı) => genel TEK-soru yedek; her biri TAM 1 istek; durum yine STEP_BACK", hepsiYedek);

  // ---- 3. geri adıma DOĞRU: RECOVERY ----
  const g2 = [...g1, { role: "assistant", content: t2 }, { role: "user", content: "ikinci yargi" }];
  s = kur("[[V=C]]\nDoğru! Şimdi S+V+O çıkaralım. Özne kim?");
  const r3 = await cagir(g2, { state: r2.controller_state });
  const t3 = metinDe(r3);
  kontrol("33) HANDLER geri adım DOĞRU: TAM 1 istek; mod RECOVERY (ADVANCE DEĞİL); model 'ilerle' yazsa bile YOK SAYILIR; ASIL soru BİREBİR restore; TEK soru; durum RECOVERED", s.toplam === 1 && r3.pedagogy_mode === "RECOVERY" && !/S\+V\+O|Özne kim/.test(t3) && t3.endsWith(`\n\n${ORIG}`) && TEK_SORU(t3) && r3.controller_state?.faz === "RECOVERED" && r3.controller_state.orig === ORIG && ISARET_YOK(r3), JSON.stringify(t3));
  kontrol("34) STEP_BACK durumunda yönerge 'HICBIR SEY yazma' (sunucu onay + ASIL soruyu kendisi ekler)", /HICBIR SEY yazma/.test(s.anaSistem));

  // ---- 4. restore edilen ASIL soru ----
  const g3 = [...g2, { role: "assistant", content: t3 }, { role: "user", content: "was" }];
  s = kur("[[V=C]]\nDoğru! Şimdi S+V+O çıkaralım. Özne kim?");
  const r4 = await cagir(g3, { state: r3.controller_state });
  kontrol("35) HANDLER restore edilen ASIL soruya DOĞRU: mod ADVANCE, durum DÜŞTÜ, model metni AYNEN (işaret ayıklandı); tek istek", s.toplam === 1 && r4.pedagogy_mode === "ADVANCE" && r4.controller_state === null && metinDe(r4) === "Doğru! Şimdi S+V+O çıkaralım. Özne kim?" && ISARET_YOK(r4));
  s = kur("[[V=W]]");
  const r4b = await cagir(g3, { state: r3.controller_state });
  kontrol("36) HANDLER restore edilen ASIL soruya YANLIŞ: MISS_1'e döner ve ASIL soru korunur (atlama/tuzak yok)", r4b.pedagogy_mode === "MISS_1" && r4b.controller_state?.orig === ORIG && metinDe(r4b).endsWith(ORIG) && s.toplam === 1);
  s = kur("[[V=W]]");
  const rOffer = await cagir(g2, { state: r2.controller_state });
  kontrol("37) HANDLER geri adıma da YANLIŞ: OFFER şablonu (soru yok, cevap yok), durum düşer — tuzak yok; tek istek", rOffer.pedagogy_mode === "OFFER" && !metinDe(rOffer).includes("?") && /Cozumu goster/.test(metinDe(rOffer)) && rOffer.controller_state === null && s.toplam === 1);
  s = kur("[[V=C]]\nDoğru! Devam.");
  const rNormal = await cagir(g0);
  kontrol("38) NORMAL doğru cevap turu (ladder yok): TAM 1 istek, model metni AYNEN, durum yok", s.toplam === 1 && rNormal.pedagogy_mode === "ADVANCE" && metinDe(rNormal) === "Doğru! Devam." && rNormal.controller_state === null);

  // ---- işaret eksik/bozuk/UNCLEAR/çelişkili => HOLD (fail-safe) ----
  const sizintiMetni = "Tersine bir ilişki gösteriyor. Zıtlık mı yoksa neden mi?";
  const holdlar = [["işaret YOK", sizintiMetni], ["bozuk '[[V=W]'", `[[V=W] ${sizintiMetni}`], ["UNCLEAR '[[V=U]]'", `[[V=U]]\n${sizintiMetni}`], ["çelişkili", `[[V=C]][[V=W]]\n${sizintiMetni}`], ["bilinmeyen '[[V=Q]]'", `[[V=Q]]\n${sizintiMetni}`]];
  let holdOk = true; let holdDetay = "";
  for (const [ad, model] of holdlar) {
    s = kur(model);
    const r = await cagir(g1, { state: r1.controller_state });
    const ok = s.toplam === 1 && r.pedagogy_mode === "HOLD" && r.controller_state?.faz === "MISS_1" && metinDe(r).endsWith(ORIG) && !/Tersine|yoksa|Zıtlık/.test(metinDe(r)) && ISARET_YOK(r) && r.pedagogy_fallback === false;
    if (!ok) { holdOk = false; holdDetay += ` ${ad}:${JSON.stringify(metinDe(r))}`; }
  }
  kontrol("39) FAIL-SAFE: işaret eksik/bozuk/UNCLEAR/çelişkili/bilinmeyen => HOLD: tek istek; durum İLERLEMEZ (MISS_1 korunur), öğrenci yanlış SAYILMAZ, cevap AÇILMAZ, bekleyen soru korunur, işaret sızmaz", holdOk, holdDetay);
  s = kur(sizintiMetni);
  const rHold0 = await cagir(g0);
  kontrol("40) FAIL-SAFE (önceki durum yokken): işaret yok => durum HÂLÂ yok (yanlış işaretlenmedi), bekleyen soru korunur, sızıntı yok", rHold0.pedagogy_mode === "HOLD" && rHold0.controller_state === null && metinDe(rHold0).endsWith(ORIG) && !/Tersine|yoksa/.test(metinDe(rHold0)) && s.toplam === 1);

  // ---- kaçışlar / tuzak yok / yanlış koruma yok ----
  s = kur("Tamam, çözümü açıklıyorum: B doğru.");
  const gCozum = [...g1, { role: "assistant", content: t2 }, { role: "user", content: "Cozumu goster." }];
  const rc = await cagir(gCozum, { state: r2.controller_state });
  kontrol("41) ÇÖZÜM KAÇIŞI: 'Cozumu goster.' => durum DÜŞER, işaret yönergesi EKLENMEZ, model metni AYNEN (mevcut çözüm modu), tek istek", rc.controller_state === null && rc.pedagogy_mode === null && !/PEDAGOJIK KONTROL/.test(s.anaSistem) && metinDe(rc) === "Tamam, çözümü açıklıyorum: B doğru." && s.toplam === 1);
  s = kur("Analiz.");
  const ra = await cagir(g1, { answered: true, state: r1.controller_state });
  kontrol("42) answered=true TUZAĞA DÜŞMEZ: durum düşer, yönerge yok, model metni AYNEN", ra.controller_state === null && ra.pedagogy_mode === null && !/PEDAGOJIK KONTROL/.test(s.anaSistem) && metinDe(ra) === "Analiz.");
  s = kur("[[V=W]]");
  const rq = await cagir(g1, { state: { ...r1.controller_state, qid: "q001" } });
  kontrol("43) ALAKASIZ SORU: başka soruya (qid) ait durum MİRAS ALINMAZ => yeni ladder MISS_1 (STEP_BACK'e SIÇRAMAZ)", rq.pedagogy_mode === "MISS_1");
  s = kur("[[V=W]]");
  const rst = await cagir(g1, { state: { ...r1.controller_state, n: 999 } });
  kontrol("44) bayat/uydurma durum (geçmiş uzunluğu uyuşmuyor) atılır => MISS_1", rst.pedagogy_mode === "MISS_1");
  s = kur("[[V=W]]\nPromising = ümit verici.");
  const gYan = [...g1, { role: "assistant", content: t2 }, { role: "user", content: "Promising ne demek?" }];
  const ry = await cagir(gYan, { state: r2.controller_state });
  kontrol("45) YAN SORU ladder'ı ÖLDÜRMEZ: durum TAŞINIR (n güncellenir), yönerge eklenmez, model metni geçer, İŞARET yine de AYIKLANIR", ry.controller_state?.faz === "STEP_BACK" && ry.controller_state.n === gYan.length + 1 && ry.pedagogy_mode === null && !/PEDAGOJIK KONTROL/.test(s.anaSistem) && metinDe(ry) === "Promising = ümit verici." && ISARET_YOK(ry));
  s = kur("[[V=W]]\nTamam.");
  const rAnl = await cagir([...g1, { role: "assistant", content: t2 }, { role: "user", content: "Anladim, devam." }], { state: r2.controller_state });
  kontrol("46) 'Anladim, devam.' ladder'ı bozmaz: durum taşınır, kontrolcü devreye GİRMEZ (mevcut açık-soru kuralı geçerli)", rAnl.pedagogy_mode === null && rAnl.controller_state?.faz === "STEP_BACK" && !/PEDAGOJIK KONTROL/.test(s.anaSistem));
  s = kur("[[V=W]] x");
  const rDiger = await cagir(g1, { mode: null });
  kontrol("47) mode!=='chat': kontrolcü/işaret ayıklama UYGULANMAZ (diğer modlar DEĞİŞMEDİ)", rDiger.pedagogy_mode === null && metinDe(rDiger) === "[[V=W]] x" && !/PEDAGOJIK KONTROL/.test(s.anaSistem));

  // ---- board + işaret sızıntısı ----
  const boardBlok = [{ type: "text", text: "[[V=W]]" }, { type: "tool_use", name: "avci_board_actions", input: { actions: [{ type: "HIGHLIGHT_VERB", text: "was [[V=W]]" }] } }];
  s = kur(boardBlok);
  const rb = await cagir(g0);
  kontrol("48) kontrollü (yanlış) turda board action YOK (cevabı gösteren tahta hamlesi kurulan yanıtla çelişmesin) ve işaret tool_use'a/board'a SIZMAZ", Array.isArray(rb.board_actions) && rb.board_actions.length === 0 && ISARET_YOK(rb));
  s = kur([{ type: "text", text: "[[V=C]]\nDoğru!" }, { type: "tool_use", name: "avci_board_actions", input: { actions: [{ type: "SHOW_HINT", text: "ipucu [[V=C]]" }] } }]);
  const rb2 = await cagir(g0);
  kontrol("49) ADVANCE turunda tool_use girdisindeki işaret ayıklanır; board_actions dizisi mevcut doğrulamadan geçer (dizi)", Array.isArray(rb2.board_actions) && ISARET_YOK(rb2) && metinDe(rb2) === "Doğru!");

  // ---- mevcut verbatim guard sağlam; kontrolcü kurduğu yanıtı BOZMAZ ----
  s = kur('[[V=C]]\nDoğru! "The treatment was far from effective" kısmına bak.');
  const rg = await cagir(g0);
  kontrol("50) mevcut verbatim guard ADVANCE'te SAĞLAM: model metnindeki soru-cümlesi alıntısı '…' olur, hint_leak_guard=true", rg.hint_leak_guard === true && !/far from effective/i.test(metinDe(rg)) && metinDe(rg).includes("…"));
  const ASISTAN_EN = "Cümlede The treatment kısmı ne iş yapıyor?";
  s = kur("[[V=W]]");
  const rg2 = await cagir([{ role: "user", content: "x" }, { role: "assistant", content: ASISTAN_EN }, { role: "user", content: "yok" }]);
  kontrol("51) kontrolcünün kurduğu yanıt guard tarafından BOZULMAZ: ASIL soru (içinde 'The treatment' geçse bile) BİREBİR korunur", rg2.pedagogy_mode === "MISS_1" && metinDe(rg2).endsWith(ASISTAN_EN) && rg2.hint_leak_guard === false);

  // ---- GENELLİK: q001/despite ----
  const q1 = "Cumlede baglaci bulabilir misin? Hangi kelime karsitlik kuruyor?";
  const h0 = [{ role: "user", content: "Hocam anlamadim." }, { role: "assistant", content: q1 }, { role: "user", content: "irregularities" }];
  s = kur("[[V=W]]");
  const a1 = await cagir(h0, { qid: "q001" });
  s = kur("[[V=W]]\nVirgüllerin arasında kalan bölüm ne iş yapıyor?");
  const a2 = await cagir([...h0, { role: "assistant", content: metinDe(a1) }, { role: "user", content: "verdict" }], { qid: "q001", state: a1.controller_state });
  s = kur("[[V=C]]");
  const a3 = await cagir([...h0, { role: "assistant", content: metinDe(a1) }, { role: "user", content: "verdict" }, { role: "assistant", content: metinDe(a2) }, { role: "user", content: "araya giren bolum" }], { qid: "q001", state: a2.controller_state });
  kontrol("52) GENELLİK (q001/despite, farklı soru): MISS_1 -> STEP_BACK -> RECOVERY AYNI geçişlerle; ASIL soru BİREBİR restore; her tur tek çağrı", a1.pedagogy_mode === "MISS_1" && a2.pedagogy_mode === "STEP_BACK" && a3.pedagogy_mode === "RECOVERY" && metinDe(a3).endsWith("Hangi kelime karsitlik kuruyor?") && TEK_SORU(metinDe(a3)) && s.toplam === 1);
} finally {
  globalThis.fetch = orijinalFetch;
  if (orijinalKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = orijinalKey;
}

// ============================================================
// STATİK — tek çağrı / kapsam / genellik / güvenlik
// ============================================================
{
  const modul = readFileSync(path.join(ROOT, "api", "_avciPedagogy.mjs"), "utf-8").replace(/\r\n/g, "\n");
  const klod = readFileSync(path.join(ROOT, "api", "klod.mjs"), "utf-8").replace(/\r\n/g, "\n");
  const html = readFileSync(path.join(ROOT, "index.html"), "utf-8").replace(/\r\n/g, "\n");
  const kodOnly = modul.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  kontrol("53) AYRI değerlendirici/sızıntı hakemi model çağrısı YOK: modülde ağ/fetch/anahtar/uç nokta yok; miniLLM/ogrenciHakemi/sizintiHakemi tanımı yok (modül + klod)", !/fetch\(|api\.anthropic\.com|process\.env|x-api-key|AbortSignal/.test(kodOnly) && !/miniLLM|ogrenciHakemi|sizintiHakemi|DEGERLENDIRICI|SIZINTI HAKEMI/.test(modul + klod));
  kontrol("54) klod.mjs: Anthropic uç noktası HÂLÂ TEK, max_tokens HÂLÂ TEK satır (chat 700 değişmedi), yeni sağlayıcı/DB/eval YOK", (klod.match(/api\.anthropic\.com/g) || []).length === 1 && (klod.match(/max_tokens:/g) || []).length === 1 && /mode === 'chat' \? 700 : 350/.test(klod) && !/eval\(|new Function\(|child_process/.test(klod + kodOnly));
  kontrol("55) GENEL: modül kodunda q004/although/despite/soru-id/cevap tablosu/canonical alanları YOK", !/q0\d\d|although|despite|SORU_HAVUZU|dogru_index|secenekler|sinyal/i.test(kodOnly));
  kontrol("56) köprü: hazırlık SENKRON (await YOK), sonuç köprüsü SADECE mode==='chat'; verbatim guard SADECE kontrolcü yanıtı kurmadıysa; board kontrollü turda []; alanlar ADDITIVE", /pedagoji = klodPedagojiHazirla\(req\.body, messages, dogrulanmisBaglam, systemContent\);/.test(klod) && /const pedagojiSonuc = mode === 'chat'\n      \? klodPedagojiUygula\(pedagoji, data\)/.test(klod) && /if \(mode === 'chat' && !pedagojiSonuc\.kontrollu && Array\.isArray\(data\.content\) && klodIpucuYanitiMi\(messages, dogrulanmisBaglam\)\)/.test(klod) && /board_actions: pedagojiSonuc\.kontrollu \? \[\] : boardActions,/.test(klod) && /controller_state: pedagojiSonuc\.yeniDurum \|\| null,/.test(klod) && /\.\.\.data,\n      parsed,/.test(klod));
  kontrol("57) istemci: durum yankılanıyor (typeof korumalı okuma) ve yanıttan saklanıyor; başka istemci değişikliği YOK", /var _dnavCtrlState=null;/.test(html) && /controller_state:\(typeof _dnavCtrlState!=='undefined'\?_dnavCtrlState:null\),/.test(html) && /_dnavCtrlState=\(data&&data\.controller_state\)\|\|null;/.test(html) && (html.match(/_dnavCtrlState/g) || []).length === 4);
}

console.log(`\n${toplam - basarisiz}/${toplam} kontrol geçti`);
if (basarisiz > 0) { console.error(`${basarisiz} kontrol BAŞARISIZ`); process.exit(1); }
