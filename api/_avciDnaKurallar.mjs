// ============================================================
// AVCI ÖSYM DNA — DETERMİNİSTİK KURAL PAKETİ (FAZ 1)
// ============================================================
// Kurallar LLM'siz, parser'sız ve ağsız çalışır. Her kural:
//   - sabit bir rule_id taşır (izlenebilirlik / admin review / tuning),
//   - bir sonuç verirken EVIDENCE (neden) ve CONFIDENCE üretir,
//   - bir kalıp görüldü diye kesin karar vermez: pattern + bağlam
//     (+ boşluk sorularında şıklar) birlikte değerlendirilir.
//
// Öğrenciye gösterilecek gramer açıklaması BURADA YAZILMAZ; onun insan
// onaylı kaynağı automation/video-pipeline/data/sinyal-kurallari.mjs
// (SINYAL_KURALLARI). Bu paket sadece YAPISAL beklentiyi (sağda cümle mi,
// isim mi…) ve kısa AVCI refleksini tutar. tests/dna-kanonik.test.mjs,
// buradaki her kanonik sinyalin SINYAL_KURALLARI'nda da bulunduğunu
// denetler (iki tablo birbirinden kopmasın).
//
// Bu dosya SAF'tır: fetch/process.env/dosya sistemi/LLM çağrısı yok
// (tests/dna-guvenlik.test.mjs bunu statik olarak doğrular).
// ============================================================

// Kural paketi sürümü — bir kural eklendiğinde / değiştiğinde artırılır.
// Etkin rule_version ayrıca bu tablonun içerik hash'iyle hesaplanır
// (bkz. _avciDna.mjs → RULE_VERSION), yani elle artırmayı unutmak bile
// eski analizlerin tespit edilmesini engellemez.
export const RULE_PACK_VERSION = "1.0.1"; // 1.0.1: çok kelimeli fiil şıkkı ilk kelimesine göre ("be signed" = V1 + V3, edilgen)

// ---- Sözlükler ------------------------------------------------------
const AUX = new Set(["am","is","are","was","were","be","been","being","has","have","had","do","does","did",
  "will","would","shall","should","can","could","may","might","must","ought"]);
const MODALS = new Set(["will","would","shall","should","can","could","may","might","must"]);
const DETERMINERS = new Set(["the","a","an","this","that","these","those","its","their","his","her","our","your","my",
  "some","any","no","each","every","many","much","several","few","all","both","such","another","other"]);
const PRONOUN_SUBJECTS = new Set(["i","you","he","she","it","we","they","there","one"]);
const PREPOSITIONS = new Set(["in","on","at","of","for","about","without","before","after","by","from","with","against","despite","instead"]);
const IRREGULAR_V3 = new Set(["been","done","gone","seen","taken","given","made","written","shown","known","found",
  "held","brought","thought","begun","come","become","run","put","set","cast","spread","withheld","kept","left","led","met"]);
// "to" edat olduğunda (look forward to V-ing) — to + V1 kuralının istisnası.
const TO_PREPOSITION_PHRASES = ["look forward to","looking forward to","object to","be used to","is used to","are used to",
  "get used to","got used to","committed to","devoted to","dedicated to","in addition to","with a view to","when it comes to","prior to","contrary to"];
const SINGULAR_VERBS = new Set(["is","was","has","does"]);
const PLURAL_VERBS = new Set(["are","were","have","do"]);
const RELATIVES = new Set(["who","whose","which","whom","that","where","when"]);

// ---- Metin yardımcıları ---------------------------------------------
export function normalizeSinyal(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function kelimeler(metin) {
  return String(metin || "").toLowerCase().replace(/[“”"]/g, "").match(/[a-z]+(?:'[a-z]+)?/g) || [];
}
// Başlangıç indeksiyle birlikte (sağ/sol bağlam span'i için).
function kelimeSpanlari(metin) {
  const r = []; const re = /[A-Za-z]+(?:'[A-Za-z]+)?/g; let m;
  while ((m = re.exec(metin))) r.push({ w: m[0].toLowerCase(), start: m.index, end: m.index + m[0].length });
  return r;
}
function fiilBicimi(kelime) {
  const w = String(kelime || "").toLowerCase().trim();
  if (!w) return "unknown";
  if (w.startsWith("to ")) return "to_infinitive";
  // Çok kelimeli fiil öbeği ilk kelimesine göre: "be signed" (modal + be + V3 = edilgen) yapısal olarak V1 ile başlar
  if (/\s/.test(w)) return fiilBicimi(w.split(/\s+/)[0]);
  if (/ing$/.test(w) && w.length > 4) return "gerund";
  if (/ed$/.test(w) || IRREGULAR_V3.has(w)) return "past_or_participle";
  if (/(?:[^s]s|ies|ches|shes|xes)$/.test(w) && !/(?:ss|us|is)$/.test(w)) return "third_person";
  return "base";
}

// ---- BAĞLAM PENCERESİ ------------------------------------------------
// Bir konumdan sağa doğru ilk noktalama işaretine kadar olan parçayı
// sınıflandırır. Dönen yapı ileride parser/LLM sonuçlarını da taşıyabilir:
// { type, span:{start,end,text}, has_finite_verb, pattern, strength, evidence }
// strength: "strong" (yardımcı fiil / belirteç gibi açık kanıt) | "weak" (sezgisel)
export function sagBaglamSiniflandir(cumle, baslangic) {
  const metin = String(cumle || "");
  const kalan = metin.slice(baslangic);
  const bitisRel = kalan.search(/[,;.:!?]|\s—\s|\s–\s/);
  const bitis = baslangic + (bitisRel === -1 ? kalan.length : bitisRel);
  const parca = metin.slice(baslangic, bitis);
  const lead = parca.length - parca.trimStart().length;
  const span = { start: baslangic + lead, end: bitis, text: parca.trim() };
  const ks = kelimeSpanlari(parca).map((k) => k.w);
  const sonuc = (type, has_finite_verb, pattern, strength, evidence) =>
    ({ type, span, has_finite_verb, pattern, strength, evidence });
  if (ks.length === 0) return sonuc("unknown", null, "empty", "weak", "sağda kelime yok");

  const auxIdx = ks.findIndex((w, i) => AUX.has(w) && !(i === 0 && w === "being"));
  if (ks[0].endsWith("ing") && ks[0].length > 4 && !DETERMINERS.has(ks[0])) {
    // "being administered" gibi: V-ing ile başlıyor; ardından çekimli yardımcı fiil yoksa gerund öbeği
    const sonrakiAux = ks.slice(1).findIndex((w) => AUX.has(w) && w !== "being" && w !== "been");
    if (sonrakiAux === -1) return sonuc("gerund_phrase", false, "V-ing ...", "strong", `'${ks[0]}' V-ing ile başlıyor, çekimli fiil yok`);
  }
  if (auxIdx !== -1 && !(auxIdx === 0 && ks.length === 1)) {
    return sonuc("clause", true, "S + AUX ...", "strong", `yardımcı/modal fiil '${ks[auxIdx]}' var → çekimli fiil`);
  }
  if (PRONOUN_SUBJECTS.has(ks[0]) && ks.length > 1) {
    return sonuc("clause", true, "PRONOUN + V", "strong", `özne zamiri '${ks[0]}' + fiil`);
  }
  // Zayıf fiil adayı: -ed / 3. tekil -s biçimi, önünde belirteç/sıfat olmayan konumda
  // Fiil tamamlayıcı ister: aday fiil öbeğin SON kelimesiyse (örn. "promising results") fiil sayılmaz.
  const ISLEV = new Set([...DETERMINERS, ...PREPOSITIONS, "to", "and", "or", "but", "not", "than"]);
  for (let i = 1; i < ks.length; i++) {
    const w = ks[i], onceki = ks[i - 1], sonrakiVar = i + 1 < ks.length;
    if (ISLEV.has(onceki) || ISLEV.has(w) || /ly$/.test(w)) continue;
    if (/ed$/.test(w) && w.length > 4) return sonuc("clause", true, "NOUN + V-ed", "weak", `'${onceki} ${w}': -ed biçimli fiil adayı`);
    if (!sonrakiVar) continue;
    if (IRREGULAR_V3.has(w) && !/s$/.test(w)) return sonuc("clause", true, "NOUN + V2", "weak", `'${onceki} ${w}': düzensiz geçmiş zaman fiil adayı`);
    if (/[^s]s$/.test(w) && !/(ings|ness|ics|ies|ous|ss|us|is)$/.test(w) && !/s$/.test(onceki) && w.length > 3)
      return sonuc("clause", true, "NOUN + V-s", "weak", `'${onceki} ${w}': 3. tekil -s fiil adayı`);
    if (/[^s']s$/.test(onceki) && !/(ss|us|is)$/.test(onceki) && !/(s|ing)$/.test(w) && w.length > 2)
      return sonuc("clause", true, "PLURAL NOUN + V", "weak", `'${onceki} ${w}': çoğul özne + fiil adayı`);
  }
  if (DETERMINERS.has(ks[0]) || /'s$/.test(ks[0])) {
    return sonuc("noun_phrase", false, "DET + ... NOUN", "strong", `'${ks[0]}' belirteç ile başlıyor, çekimli fiil yok`);
  }
  return sonuc("noun_phrase", false, "(ADJ) + NOUN", "weak", "çekimli fiil bulunamadı; isim öbeği varsayıldı");
}

// ---- SİNYAL KURALLARI -------------------------------------------------
// family: kuralın ailesi (trace ve refleks şablonu için)
// expects: sağ bağlamdan beklenen yapı ("clause" | "noun_phrase" | "either" | "base_verb" | null)
// fn: SIGNAL_FUNCTIONS slug'ı, skill: ölçülen anlam becerisi (taksonomi slug'ı)
function kural(rule_id, family, sinyaller, expects, fn, skill, sinyalTipi, refleks) {
  return { rule_id, family, sinyaller, expects, fn, skill, sinyalTipi, refleks };
}
export const SINYAL_KURAL_PAKETI = Object.freeze([
  kural("CONN_CLAUSE_001", "clause_connector",
    ["although","even though","though","whereas","while","because","unless","provided that","on condition that",
     "as long as","as far as","so that","by the time","once","if"],
    "clause", "expects_clause", null, "lexical", "{S} gördün → sağa bak → özne + fiil ara."),
  kural("CONN_NP_002", "noun_connector",
    ["despite","in spite of","notwithstanding","because of","due to","owing to","as a consequence of",
     "contrary to","prior to","instead of","regardless of"],
    "noun_phrase", "expects_noun_phrase", null, "lexical", "{S} gördün → sağa bak → isim / V-ing ara."),
  kural("CONN_DUAL_003", "dual_connector", ["after","before","since","until"],
    "either", null, null, "lexical", "{S} gördün → sağa bak: isimse edat, cümleyse bağlaç."),
  kural("LINK_ADV_004", "linking_adverb",
    ["however","yet","consequently","as a result","therefore","thus","nonetheless","nevertheless","on the contrary","moreover","furthermore"],
    null, "links_sentences", null, "discourse", "{S} gördün → iki cümlenin ilişkisini kur: zıtlık mı, sonuç mu?"),
  kural("HIDDEN_NEG_005", "hidden_negative",
    ["by no means","far from","hardly","scarcely","anything but","nowhere near","next to impossible"],
    null, "negates_meaning", "hidden_negative", "semantic", "{S} gördün → cümleyi olumsuz oku, kelimeye kanma."),
  kural("MODAL_PERF_006", "modal_perfect", ["must have","should have","could have","might have","may have","can't have","cannot have"],
    "past_participle", "expects_past_participle", "modal_perfect", "grammatical", "{S} + V3 gördün → geçmişe dair çıkarım / pişmanlık ara."),
  kural("INVERSION_007", "inversion", ["no sooner had","not only","had","hardly had","never","seldom","rarely"],
    null, "inverts_word_order", "inversion", "positional", "Cümle {S} ile başlıyorsa → devrik yapı: yardımcı fiil özneden önce."),
  kural("CORREL_008", "correlative", ["nor","neither","either"],
    null, "pairs_with_partner", "correlative_conjunction", "lexical", "{S} gördün → eşini ara: {P}."),
  kural("PURPOSE_V1_009", "purpose_infinitive", ["in order to","so as to"],
    "base_verb", "expects_base_verb", "connector_purpose", "grammatical", "{S} gördün → sağa bak → V1 ara."),
  kural("COMPARE_010", "comparison", ["rather than"],
    null, null, "connector_comparison", "lexical", "{S} gördün → tercih edilen ile edilmeyeni ayır."),
  kural("FIXED_ADV_011", "fixed_adverbial", ["contrary to popular belief"],
    null, null, "connector_contrast", "discourse", "{S} gördün → cümlenin geri kalanı yaygın inanışın tersini söyler."),
]);

// Anlam ailesi (ikincil / birincil anlam becerisi)
const ANLAM_AILESI = {
  connector_contrast: ["although","even though","though","whereas","while","despite","in spite of","notwithstanding","contrary to","yet","however","nonetheless","nevertheless","on the contrary","contrary to popular belief"],
  connector_cause_effect: ["because","because of","due to","owing to","as a consequence of","consequently","as a result","therefore","thus","since"],
  connector_condition: ["unless","provided that","on condition that","as long as","if","had"],
  connector_time: ["by the time","once","after","before","until","prior to","no sooner had","hardly had"],
  connector_purpose: ["so that","in order to","so as to"],
  connector_comparison: ["rather than","instead of"],
  connector_addition: ["not only","moreover","furthermore"],
};
export function anlamAilesi(sinyal) {
  const s = normalizeSinyal(sinyal);
  for (const [aile, liste] of Object.entries(ANLAM_AILESI)) if (liste.includes(s)) return aile;
  return null;
}

// Aynı sinyal birden fazla kurala uyabilir ("hardly": gizli olumsuz ve
// cümle başındaysa devrik). En özel kural önce gelir; bağlam kontrolü
// kural motorunda (_avciDna.mjs) yapılır.
export function sinyalKurallariniBul(sinyal) {
  const s = normalizeSinyal(sinyal);
  return SINYAL_KURAL_PAKETI.filter((k) => k.sinyaller.includes(s));
}
export function kuralById(id) {
  return SINYAL_KURAL_PAKETI.find((k) => k.rule_id === id) || BOSLUK_KURAL_PAKETI.find((k) => k.rule_id === id) || null;
}

// ---- BOŞLUK DOLDURMA (blank_grammar) KURALLARI ------------------------
// Bunlar sinyali şıktan değil, BOŞLUĞUN SOLUNDAKİ bağlamdan alır.
export const BOSLUK_KURAL_PAKETI = Object.freeze([
  { rule_id: "AGREE_NUMBER_101", family: "agreement", skill: "subject_verb_agreement", sinyalTipi: "grammatical",
    refleks: "'{S}' gördün → fiili ona göre çek: {P}." },
  { rule_id: "MODAL_V1_102", family: "modal_base", skill: "modal_base_verb", sinyalTipi: "grammatical",
    refleks: "Modal gördün → sağa bak → V1 ara." },
  { rule_id: "TO_V1_103", family: "to_infinitive", skill: "to_infinitive", sinyalTipi: "grammatical",
    refleks: "'to' gördün → önce edat mı diye bak; değilse V1 ara." },
  { rule_id: "PREP_GERUND_104", family: "preposition_gerund", skill: "preposition_gerund", sinyalTipi: "grammatical",
    refleks: "Edat gördün → sağa bak → isim / V-ing ara." },
  { rule_id: "REL_WHOSE_105", family: "relative_whose", skill: "relative_clause", sinyalTipi: "grammatical",
    refleks: "Boşluktan sonra isim + fiil geliyorsa → whose adayını kontrol et." },
]);

export const yardimcilar = Object.freeze({
  kelimeler, kelimeSpanlari, fiilBicimi,
  AUX, MODALS, DETERMINERS, PREPOSITIONS, TO_PREPOSITION_PHRASES, SINGULAR_VERBS, PLURAL_VERBS, RELATIVES,
});
