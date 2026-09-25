// ============================================================
// AVCI ÖSYM DNA — TAKSONOMİ (FAZ 1)
// ============================================================
// Soru DNA'sında kullanılan TÜM etiketler burada, sabit slug'lar olarak
// tanımlıdır. Motor, testler ve (ileride) admin paneli sadece bu
// listelerden değer kullanır; serbest metin etiket üretilmez. Böylece
// "clause_vs_noun_phrase" zamanla "clause-vs-np", "clauseNoun" gibi
// farklı adlarla çoğalmaz (bkz. ALIASES + taksonomiDogrula()).
//
// Yeni bir slug eklemek bilinçli bir işlemdir: listeye eklenir ve
// TAXONOMY_VERSION artırılır. Bir slug SİLİNMEZ; kullanımdan kalkarsa
// DEPRECATED listesine taşınır (eski DNA kayıtları okunabilir kalsın).
//
// Bu dosya SAF veridir: ağ, dosya sistemi, DOM veya LLM erişimi yok.
// Hem Node (build script/testler) hem ileride tarayıcı tarafından
// import edilebilir. api/ altında "_" önekli olduğu için Vercel bunu
// bir endpoint olarak yayınlamaz.
// ============================================================

export const TAXONOMY_VERSION = "2026.09.1";

// Soru tipi → hangi analyzer'ın çalışacağını belirler. Grammar pipeline'ı
// reading/vocabulary/translation sorularına ZORLA uygulanmaz: o tipler
// için FAZ 1'de analyzer yok, kayıt "pending" kalır (bkz. _avciDna.mjs).
export const QUESTION_TYPES = Object.freeze([
  "sentence_comprehension", // mevcut kanonik banka (api/data/sorular.json): EN cümle + TR soru + TR şıklar
  "blank_grammar",          // boşluk doldurma, İngilizce şıklar (TUZAK_HAVUZ tipi)
  "vocabulary",
  "reading",
  "cloze",
  "sentence_completion",
  "translation",
  "paragraph_completion",
  "irrelevant_sentence",
  "dialogue",
  "restatement",
]);

// Ölçülen beceri (primary_skill / secondary_skills).
export const SKILLS = Object.freeze([
  // yapı
  "clause_vs_noun_phrase",   // bağlaç (+S+V) ile edat (+isim/V-ing) ayrımı
  "subject_verb_agreement",
  "modal_base_verb",         // modal + V1
  "to_infinitive",           // to + V1
  "preposition_gerund",      // edat + V-ing
  "relative_clause",         // who/whose/which/that…
  "inversion",               // No sooner had…, Not only did…
  "correlative_conjunction", // neither…nor, either…or, not only…but also
  "modal_perfect",           // must/should/could/might have + V3
  "passive_voice",
  "tense",
  "tense_agreement",
  // anlam ilişkisi (bağlaç aileleri)
  "connector_contrast",
  "connector_cause_effect",
  "connector_condition",
  "connector_time",
  "connector_purpose",
  "connector_addition",
  "connector_comparison",
  "hidden_negative",         // by no means, far from, hardly, anything but…
  // ileride (FAZ 1'de üretilmiyor, slug'ları şimdiden sabit)
  "vocabulary",
  "collocation",
  "reference",
  "inference",
  "main_idea",
  "detail",
  "cohesion",
  "paragraph_logic",
  "tone",
  "purpose",
  "translation_structure",
]);

// Sinyal türü — sinyal sadece "kelime" değildir.
export const SIGNAL_TYPES = Object.freeze([
  "lexical",        // however, despite, although
  "grammatical",    // modal + V1, the number of + …
  "punctuation",    // virgül, noktalı virgül
  "positional",     // boşluğun sağı/solu
  "morphological",  // V-ing, V3, -s
  "semantic",       // anlam karşıtlığı
  "discourse",      // paragraf bağlayıcıları
]);

// Sinyalin cümlede yaptığı iş / sağ tarafta beklediği yapı.
export const SIGNAL_FUNCTIONS = Object.freeze([
  "expects_clause",           // + S + V
  "expects_noun_phrase",      // + isim öbeği / V-ing
  "expects_base_verb",        // + V1
  "expects_gerund",           // + V-ing
  "expects_singular_verb",
  "expects_plural_verb",
  "expects_noun_after_relative",
  "expects_past_participle",  // have + V3
  "links_sentences",          // however/therefore: iki bağımsız cümle
  "negates_meaning",          // gizli olumsuz
  "inverts_word_order",
  "pairs_with_partner",       // neither…nor
]);

// Bağlam penceresi türleri (sağ/sol bağlam).
export const CONTEXT_TYPES = Object.freeze([
  "clause",        // çekimli fiil içeriyor
  "noun_phrase",
  "gerund_phrase", // V-ing ile başlıyor, çekimli fiil yok
  "base_verb",
  "unknown",
]);

// Tuzak / çeldirici aileleri (Distractor DNA).
export const TRAP_FAMILIES = Object.freeze([
  "meaning_first",          // anlamca uyuyor ama yapı yanlış (because vs because of)
  "connector_confusion",    // aynı anlam ailesinden yanlış yapı
  "structural_mismatch",
  "hidden_negative",
  "agreement_trap",
  "form_trap",              // V-ing / to V / V3 biçim tuzağı
  "partner_mismatch",       // neither…or gibi
  "semantic_opposite",
]);

// Öğrenci hata tipleri — FAZ 3 (error attribution) için sabit slug'lar.
// Mevcut index.html AVCI kök-neden etiketleriyle eşleşme ROOT_CAUSE_MAP'te.
export const ERROR_TYPES = Object.freeze([
  "right_context_missed",
  "left_context_missed",
  "main_verb_missed",
  "svo_confusion",
  "signal_missed",
  "clause_noun_confusion",
  "tense_confusion",
  "passive_active_confusion",
  "connector_confusion",
  "vocabulary_gap",
  "meaning_first_error",
  "trap_selected",
  "careless_error",
]);

// index.html → AVCI_DESTEKLENEN_KOK_NEDENLER / diagnostic_events etiketleri
// ile DNA hata tipleri arasındaki köprü. Mevcut hiçbir değer değişmez.
export const ROOT_CAUSE_MAP = Object.freeze({
  SIGNAL_MISSED: "signal_missed",
  VOCAB_BLOCK: "vocabulary_gap",
  RULE_UNKNOWN: "clause_noun_confusion",
  CLAUSE_NOT_RECOGNIZED: "clause_noun_confusion",
  NOUN_PHRASE_NOT_RECOGNIZED: "clause_noun_confusion",
  VERB_NOT_FOUND: "main_verb_missed",
  MEANING_TRAP: "meaning_first_error",
  TENSE_RELATION_ERROR: "tense_confusion",
  CARELESS_PATTERN: "careless_error",
});

export const ANALYSIS_STATUS = Object.freeze([
  "pending",        // bu soru tipi için analyzer yok / henüz analiz edilmedi
  "analyzed",       // kural motoru güvenilir sonuç üretti
  "needs_review",   // düşük güven, kural çatışması veya semantik gerekli
  "human_verified", // öğretmen onayladı / düzeltti
  "stale",          // soru değişti, eski insan düzeltmesi yeniden gözden geçirilmeli
  "failed",         // analyzer hata verdi (soru sistemi etkilenmez)
]);

export const CONFIDENCE = Object.freeze(["high", "medium", "low"]);
export const ANALYSIS_SOURCES = Object.freeze(["rule", "parser", "llm", "human"]);

// Sınav / alan metadata'sı — tek sınava kilitlenmemek için.
export const EXAM_FAMILIES = Object.freeze(["YDS", "YOKDIL", "YKSDIL", "OTHER"]);
export const DOMAINS = Object.freeze(["general", "law", "health", "social_sciences", "science", "grammar"]);

// Kullanımdan kalkan slug'lar buraya taşınır (şu an boş).
export const DEPRECATED = Object.freeze({});

// Yazım varyantlarını tek slug'a indirger (serbest çoğalmayı engeller).
export const ALIASES = Object.freeze({
  "clause-vs-noun-phrase": "clause_vs_noun_phrase",
  "clause_vs_np": "clause_vs_noun_phrase",
  "clausenounconfusion": "clause_noun_confusion",
  "connector-confusion": "connector_confusion",
  "signal-missed": "signal_missed",
});

const KUMELER = {
  question_type: QUESTION_TYPES,
  skill: SKILLS,
  signal_type: SIGNAL_TYPES,
  signal_function: SIGNAL_FUNCTIONS,
  context_type: CONTEXT_TYPES,
  trap_family: TRAP_FAMILIES,
  error_type: ERROR_TYPES,
  status: ANALYSIS_STATUS,
  confidence: CONFIDENCE,
  source: ANALYSIS_SOURCES,
  exam_family: EXAM_FAMILIES,
  domain: DOMAINS,
};

export function slugNormalize(deger) {
  if (typeof deger !== "string") return deger;
  const k = deger.trim().toLowerCase();
  return ALIASES[k] || ALIASES[k.replace(/[\s-]+/g, "")] || k.replace(/[\s-]+/g, "_");
}

// Değer ilgili kümede mi? (normalize edilmiş haliyle)
export function taksonomiGecerli(kume, deger) {
  const liste = KUMELER[kume];
  if (!liste) throw new Error(`Bilinmeyen taksonomi kümesi: ${kume}`);
  return liste.includes(deger);
}

// Bir DNA kaydındaki tüm etiketlerin taksonomide olduğunu doğrular.
// Hata listesi döner (boş = geçerli). Motor kayıt yazmadan önce çağırır.
export function taksonomiDogrula(kayit) {
  const hatalar = [];
  const kontrol = (kume, deger, yer) => {
    if (deger == null) return;
    if (!taksonomiGecerli(kume, deger)) hatalar.push(`${yer}: '${deger}' ${kume} taksonomisinde yok`);
  };
  if (!kayit) return ["kayıt yok"];
  kontrol("question_type", kayit.question_type, "question_type");
  kontrol("status", kayit.status, "status");
  kontrol("confidence", kayit.confidence, "confidence");
  kontrol("source", kayit.analysis_source, "analysis_source");
  const a = kayit.auto;
  if (a) {
    kontrol("skill", a.primary_skill, "auto.primary_skill");
    (a.secondary_skills || []).forEach((s, i) => kontrol("skill", s, `auto.secondary_skills[${i}]`));
    (a.signals || []).forEach((s, i) => {
      kontrol("signal_type", s.type, `auto.signals[${i}].type`);
      kontrol("signal_function", s.function, `auto.signals[${i}].function`);
    });
    if (a.context && a.context.right) kontrol("context_type", a.context.right.type, "auto.context.right.type");
    if (a.trap) kontrol("trap_family", a.trap.trap_family, "auto.trap.trap_family");
    (a.distractors || []).forEach((d, i) => kontrol("trap_family", d.trap_family, `auto.distractors[${i}].trap_family`));
  }
  if (kayit.meta) {
    kontrol("exam_family", kayit.meta.exam_family, "meta.exam_family");
    kontrol("domain", kayit.meta.domain, "meta.domain");
  }
  return hatalar;
}
