// AVCI ÖSYM DNA — ALTIN SORU SETİ (FAZ 1 regresyon testleri)
// Tüm cümleler bu proje için SENTETİK olarak yazılmıştır; gerçek ÖSYM
// sorusu kopyalanmamıştır. Her kayıt, kural motorunun vermesi gereken
// sonucu (beklenen) taşır. Bir kural değişip bu sonuçlar bozulursa
// tests/dna-altin.test.mjs kırılır.

export const ALTIN_BOSLUK = [
  { id: "g01", question_type: "blank_grammar", stem: "_____ heavy rainfall, the event continued.",
    options: ["Because", "Although", "Despite", "Therefore"], correct_index: 2,
    beklenen: { status: "analyzed", confidence: "high", predicted_index: 2, primary_skill: "clause_vs_noun_phrase", elenen: [0, 1, 3], rule_ids: ["CONN_CLAUSE_001", "CONN_NP_002", "LINK_ADV_004"] } },
  { id: "g02", question_type: "blank_grammar", stem: "The match was cancelled _____ the heavy rain.",
    options: ["because", "although", "because of", "however"], correct_index: 2,
    beklenen: { status: "analyzed", confidence: "high", predicted_index: 2, primary_skill: "clause_vs_noun_phrase", elenen: [0, 1, 3] } },
  { id: "g03", question_type: "blank_grammar", stem: "The match was cancelled _____ it was raining heavily.",
    options: ["because of", "despite", "because", "due to"], correct_index: 2,
    beklenen: { status: "analyzed", confidence: "high", predicted_index: 2, primary_skill: "clause_vs_noun_phrase", elenen: [0, 1, 3] } },
  { id: "g04", question_type: "blank_grammar", stem: "_____ the budget was limited, the team finished the project on time.",
    options: ["Despite", "In spite of", "Although", "Because of"], correct_index: 2,
    beklenen: { status: "analyzed", confidence: "high", predicted_index: 2, primary_skill: "clause_vs_noun_phrase", elenen: [0, 1, 3] } },
  // İki şık yapısal olarak uyuyor (Despite / Because of) → ANLAM gerekir.
  // Kural motoru cevabı UYDURMAZ: needs_review + fallback işaretlenir, LLM ÇAĞRILMAZ.
  { id: "g05", question_type: "blank_grammar", stem: "_____ the heavy rain, the match was cancelled.",
    options: ["Despite", "Because of", "Although", "Because"], correct_index: 1,
    beklenen: { status: "needs_review", confidence: "low", predicted_index: null, fallback: "semantic_required", elenen: [2, 3] } },
  { id: "g06", question_type: "blank_grammar", stem: "The number of students applying to the program _____ increased this year.",
    options: ["have", "has", "are", "having"], correct_index: 1,
    beklenen: { status: "analyzed", confidence: "high", predicted_index: 1, primary_skill: "subject_verb_agreement", elenen: [0, 2, 3], rule_ids: ["AGREE_NUMBER_101"] } },
  { id: "g07", question_type: "blank_grammar", stem: "A number of researchers _____ questioned the results.",
    options: ["has", "have", "is", "having"], correct_index: 1,
    beklenen: { status: "analyzed", confidence: "high", predicted_index: 1, primary_skill: "subject_verb_agreement", elenen: [0, 2, 3] } },
  { id: "g08", question_type: "blank_grammar", stem: "Researchers must _____ the data before publishing the report.",
    options: ["analyzed", "analyzing", "analyze", "to analyze"], correct_index: 2,
    beklenen: { status: "analyzed", confidence: "high", predicted_index: 2, primary_skill: "modal_base_verb", elenen: [0, 1, 3], rule_ids: ["MODAL_V1_102"] } },
  { id: "g09", question_type: "blank_grammar", stem: "The committee decided to _____ the meeting until next week.",
    options: ["postponing", "postponed", "postpone", "postpones"], correct_index: 2,
    beklenen: { status: "analyzed", confidence: "high", predicted_index: 2, primary_skill: "to_infinitive", elenen: [0, 1, 3], rule_ids: ["TO_V1_103"] } },
  { id: "g10", question_type: "blank_grammar", stem: "She is interested in _____ abroad after graduation.",
    options: ["study", "to study", "studied", "studying"], correct_index: 3,
    beklenen: { status: "analyzed", confidence: "high", predicted_index: 3, primary_skill: "preposition_gerund", elenen: [0, 1, 2], rule_ids: ["PREP_GERUND_104"] } },
  // "to" burada edat (look forward to) → to + V1 kuralı yanlış pozitif ÜRETMEMELİ.
  { id: "g11", question_type: "blank_grammar", stem: "We look forward to _____ your reply.",
    options: ["receive", "receiving", "received", "receives"], correct_index: 1,
    beklenen: { status: "analyzed", confidence: "high", predicted_index: 1, primary_skill: "preposition_gerund", elenen: [0, 2, 3] } },
  { id: "g12", question_type: "blank_grammar", stem: "The scientist _____ research changed the field received an award.",
    options: ["who", "whose", "which", "whom"], correct_index: 1,
    beklenen: { status: "analyzed", confidence: "medium", predicted_index: 1, primary_skill: "relative_clause" } },
  // Modal + edilgen: "be signed" de V1 ile başlar → yapı tek başına seçemez (etken/edilgen anlamı gerekir).
  // Kural yanlış pozitif üretip anahtarla ÇELİŞMEMELİ (TUZAK_HAVUZ tz076 bulgusu).
  { id: "g15", question_type: "blank_grammar", stem: "The documents must _____ by the director before Friday.",
    options: ["approve", "approved", "be approved", "be approving"], correct_index: 2,
    beklenen: { status: "needs_review", confidence: "low", predicted_index: null, fallback: "semantic_required", elenen: [1] } },
  // Yanlış pozitif koruması: "of" görüldü diye kural ATANMAMALI.
  { id: "g13", question_type: "blank_grammar", stem: "_____ of the students passed the final exam.",
    options: ["Most", "Much", "Every", "Each"], correct_index: 0,
    beklenen: { status: "needs_review", confidence: "low", predicted_index: null, fallback: "no_rule" } },
  // Soru kalitesi: cevap anahtarı yapıyla çelişiyor → rule_conflict + needs_review.
  { id: "g14", question_type: "blank_grammar", stem: "_____ heavy rainfall, the event continued.",
    options: ["Because", "Although", "Despite", "Therefore"], correct_index: 0,
    beklenen: { status: "needs_review", confidence: "low", predicted_index: 2, flag: "rule_conflict" } },
];

// Kanonik bankadan (projenin kendi içeriği) seçilmiş altın beklentiler.
export const ALTIN_KANONIK = {
  q001: { status: "analyzed", confidence: "high", primary_skill: "connector_contrast", right: "noun_phrase", rule: "CONN_NP_002", secondary: ["clause_vs_noun_phrase", "hidden_negative"] },
  q021: { status: "analyzed", primary_skill: "connector_contrast", right: "clause", rule: "CONN_CLAUSE_001" },
  q010: { status: "analyzed", confidence: "high", right: "gerund_phrase", rule: "CONN_NP_002" },
  q038: { status: "analyzed", confidence: "high", primary_skill: "modal_perfect", rule: "MODAL_PERF_006" },
  q055: { status: "analyzed", confidence: "high", rule: "INVERSION_007" },
  q051: { status: "analyzed", confidence: "high", rule: "INVERSION_007" },
  q060: { status: "analyzed", confidence: "high", primary_skill: "correlative_conjunction", rule: "CORREL_008" },
  q059: { status: "analyzed", confidence: "high", right: "noun_phrase", rule: "CONN_DUAL_003" },
  q011: { status: "analyzed", confidence: "high", primary_skill: "hidden_negative", rule: "HIDDEN_NEG_005" },
  q067: { status: "analyzed", confidence: "high", primary_skill: "hidden_negative", secondary: ["inversion"] },
  // "The statute provided that…": 'provided' ana fiil → koşul bağlacı gibi etiketlenmiş; insan incelemeli.
  q020: { status: "needs_review", confidence: "low", flag: "signal_is_main_verb", primary_skill: null },
};

// Sentetik anlama cümleleri: "provided (that)" bağlama göre koşul bağlacı mı, ana fiil mi?
// Sırf "provided" görüldü diye koşul sinyali kabul EDİLMEMELİ.
const anlama = (id, soru_en, beklenen) => ({ id, kategori: "Dilbilgisi - YDS", soru_en, alinti: false, soru_tr: "", secenekler_tr: ["a", "b", "c", "d"],
  dogru_index: 0, aciklama_tr: "", sinyal: "provided that", sinyal_ipucu: "", tuzak: null, tuzak_ipucu: null, anahtar: null, beklenen });
export const ALTIN_ANLAMA = [
  anlama("a01", "The contract provided that both parties share the costs.", { status: "needs_review", primary_skill: null, flag: "signal_is_main_verb" }),
  anlama("a02", "Congress provided that the funds be spent locally.", { status: "needs_review", primary_skill: null, flag: "signal_is_main_verb" }),
  anlama("a03", "You may leave early provided that you finish the report.", { status: "analyzed", primary_skill: "connector_condition", rule: "CONN_CLAUSE_001" }),
  anlama("a04", "The loan is approved, provided that the income is verified.", { status: "analyzed", primary_skill: "connector_condition", rule: "CONN_CLAUSE_001" }),
  anlama("a05", "Provided that the data are valid, the model works.", { status: "analyzed", primary_skill: "connector_condition", rule: "CONN_CLAUSE_001" }),
];
