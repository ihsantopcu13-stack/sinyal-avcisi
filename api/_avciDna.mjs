// ============================================================
// AVCI ÖSYM DNA MOTORU — FAZ 1 ÇEKİRDEĞİ
// ============================================================
// Ne yapar: Bir sorunun "DNA"sını çıkarır. Ölçülen beceri, sinyal
// (türü, işlevi, konumu), sağ bağlam, tuzak / çeldirici haritası ve
// AVCI refleksi. Sonuç açıklanabilir: her kayıt hangi kuralların çalıştığını
// (trace), kanıtları (evidence) ve güven seviyesini taşır.
//
// Mimari kararlar (FAZ 0 raporu → A seçeneği):
//  • DNA çalışma anında değil, DERLEME ANINDA üretilir
//    (scripts/dna-analyze.mjs → api/data/soru-dna.json). Öğrenci soru
//    açarken DNA hesaplanmaz, beklenmez; DNA yoksa soru aynen çalışır.
//  • Kanonik soru bankası (api/data/sorular.json) DEĞİŞMEZ; DNA ayrı bir
//    yan dosyadır. SOT testleri, SL_HAVUZ kopyası ve video hattı etkilenmez.
//  • COST GUARD sırası: CACHE → RULE → LOCAL → LLM. FAZ 1'de LLM KAPALI;
//    kurallar yetmediğinde kayıt "fallback.needed" ile işaretlenir ama
//    hiçbir LLM çağrısı yapılmaz (llm_calls = 0).
//  • İnsan düzeltmesi (override) otomatik analizden AYRI tutulur; motor
//    override'a asla yazmaz, sadece okur ve üstüne geçirir.
//
// SAF modül: ağ, process.env, dosya sistemi, DOM, LLM erişimi YOK
// (tests/dna-guvenlik.test.mjs statik olarak doğrular). Saat bile
// dışarıdan verilir (opts.simdi) ki çıktı deterministik olsun.
// "_" önekli olduğu için Vercel bunu endpoint olarak yayınlamaz.
// ============================================================

import { createHash } from "node:crypto";
import {
  TAXONOMY_VERSION, taksonomiDogrula,
} from "./_avciDnaTaksonomi.mjs";
import {
  RULE_PACK_VERSION, SINYAL_KURAL_PAKETI, BOSLUK_KURAL_PAKETI,
  sinyalKurallariniBul, sagBaglamSiniflandir, normalizeSinyal, anlamAilesi, yardimcilar,
} from "./_avciDnaKurallar.mjs";

const { kelimeler, kelimeSpanlari, fiilBicimi, AUX, MODALS, DETERMINERS, PREPOSITIONS,
  TO_PREPOSITION_PHRASES, SINGULAR_VERBS, PLURAL_VERBS, RELATIVES } = yardimcilar;

export const SCHEMA_VERSION = 1;
export const ANALYZER_VERSION = "1.0.2"; // 1.0.1: beceri eşlemesi olmayan sonuç "needs_review" · 1.0.2: "provided" ana fiilse koşul sinyali reddedilir

// ---- Deterministik JSON + hash --------------------------------------
export function kararliJson(deger) {
  if (Array.isArray(deger)) return "[" + deger.map(kararliJson).join(",") + "]";
  if (deger && typeof deger === "object") {
    return "{" + Object.keys(deger).sort().filter((k) => deger[k] !== undefined)
      .map((k) => JSON.stringify(k) + ":" + kararliJson(deger[k])).join(",") + "}";
  }
  return JSON.stringify(deger === undefined ? null : deger);
}
function sha256(metin) { return createHash("sha256").update(metin).digest("hex"); }

// Kural tablosunun içeriğinden türetilen sürüm: bir kural sessizce
// değişse bile eski analizler "farklı rule_version" olarak yakalanır.
export const RULE_VERSION = RULE_PACK_VERSION + "+" + sha256(kararliJson({
  s: SINYAL_KURAL_PAKETI.map((k) => ({ ...k })), b: BOSLUK_KURAL_PAKETI.map((k) => ({ ...k })),
})).slice(0, 12);

export const SURUMLER = Object.freeze({
  schema: SCHEMA_VERSION, analyzer: ANALYZER_VERSION, rule: RULE_VERSION, taxonomy: TAXONOMY_VERSION,
});

// ---- Soru adaptörü ----------------------------------------------------
// Mevcut soru biçimlerini tek iç biçime çevirir. Soru metni GÜVENİLMEYEN
// girdidir: sadece metin olarak işlenir, hiçbir yerde çalıştırılmaz ve
// (ileride) LLM'e talimat olarak verilmez.
const KATEGORI_META = [
  [/^genel/i, "general"], [/^hukuk/i, "law"], [/^sağlık|^saglik/i, "health"],
  [/^sosyal/i, "social_sciences"], [/^fen/i, "science"], [/^dilbilgisi/i, "grammar"],
];
function metaCikar(kategori, acik) {
  const k = String(kategori || "");
  const alan = (KATEGORI_META.find(([re]) => re.test(k)) || [null, null])[1];
  const sinav = /yökdil|yokdil/i.test(k) ? "YOKDIL" : /yds/i.test(k) ? "YDS" : null;
  return {
    exam_family: acik?.exam_family ?? sinav,
    domain: acik?.domain ?? alan,
    category_raw: kategori ?? null,
  };
}
export function soruNormalize(ham) {
  if (!ham || typeof ham !== "object") throw new Error("soru nesnesi yok");
  if (!ham.id) throw new Error("soru id'si yok");
  // Kanonik banka biçimi (api/data/sorular.json)
  if (typeof ham.soru_en === "string" && Array.isArray(ham.secenekler_tr)) {
    return {
      id: String(ham.id), question_type: "sentence_comprehension",
      stem: ham.soru_en, prompt: ham.soru_tr ?? null, options: ham.secenekler_tr.slice(), correct_index: ham.dogru_index,
      signal: ham.sinyal ?? null, trap: ham.tuzak ?? null, meta: metaCikar(ham.kategori),
    };
  }
  // Boşluk doldurma biçimi (TUZAK_HAVUZ tipi / altın set)
  // Tip açıkça verilmişse ona uyulur (vocabulary boşluğu grammar'a zorlanmaz)
  if (ham.question_type === "blank_grammar" || (!ham.question_type && typeof ham.stem === "string" && /_{3,}/.test(ham.stem))) {
    return {
      id: String(ham.id), question_type: "blank_grammar",
      stem: ham.stem, prompt: ham.prompt ?? null,
      options: (ham.options || []).map((o) => String(o).replace(/^[A-E]\)\s*/, "")),
      correct_index: ham.correct_index, signal: null, trap: null, meta: metaCikar(ham.category, ham.meta),
    };
  }
  // Diğer tipler (vocabulary, reading, translation…): FAZ 1'de analyzer yok
  return {
    id: String(ham.id), question_type: ham.question_type || null, stem: ham.stem ?? ham.soru_en ?? null,
    prompt: null, options: ham.options || [], correct_index: ham.correct_index ?? null, signal: null, trap: null,
    meta: metaCikar(ham.kategori ?? ham.category, ham.meta),
  };
}

// İçerik hash'i: stem + şıklar + doğru cevap + tip + DNA'yı etkileyen
// metadata. Soru metni değişirse eski analiz KULLANILMAZ.
export function icerikHash(soru) {
  return "sha256:" + sha256(kararliJson({
    t: soru.question_type, s: soru.stem, o: soru.options, c: soru.correct_index, sig: soru.signal, trap: soru.trap,
  }));
}
export function dnaRef(kayit) {
  if (!kayit) return null;
  return `${kayit.question_id}@${String(kayit.content_hash || "").slice(7, 15)}/a${kayit.versions?.analyzer}/r${kayit.versions?.rule}`;
}

// ---- Ortak yardımcılar ------------------------------------------------
const GUVEN_SIRA = { high: 3, medium: 2, low: 1 };
function enDusuk(...g) { return g.filter(Boolean).sort((a, b) => GUVEN_SIRA[a] - GUVEN_SIRA[b])[0] || "low"; }
function sinyalGoster(s) { const t = String(s || ""); return t.charAt(0).toUpperCase() + t.slice(1); }
function refleksYaz(sablon, sinyal, partner) {
  return sablon.replace("{S}", sinyalGoster(sinyal)).replace("{P}", partner || "");
}
function sinyalSpanBul(stem, sinyal) {
  const i = String(stem).toLowerCase().indexOf(normalizeSinyal(sinyal));
  return i === -1 ? null : { start: i, end: i + normalizeSinyal(sinyal).length, text: String(stem).slice(i, i + normalizeSinyal(sinyal).length) };
}
function cumleBasindaMi(stem, span) {
  return /^[\s"“'(]*$/.test(String(stem).slice(0, span.start));
}
function sonrakiKelime(stem, idx) {
  const m = String(stem).slice(idx).match(/[A-Za-z]+(?:'[A-Za-z]+)?/);
  return m ? m[0].toLowerCase() : null;
}
const GIZLI_OLUMSUZ = ["by no means", "far from", "hardly", "scarcely", "anything but", "nowhere near", "next to impossible"];
function tuzakAilesi(tuzak) {
  const t = normalizeSinyal(tuzak);
  if (!t) return null;
  return GIZLI_OLUMSUZ.some((g) => t.startsWith(g)) ? "hidden_negative" : null;
}

// =====================================================================
// ANALYZER 1 — sentence_comprehension (mevcut kanonik banka)
// Soru tipi: İngilizce cümle + Türkçe anlam sorusu + Türkçe şıklar.
// Şıklar Türkçe olduğu için şık bazında yapısal eleme YAPILMAZ
// (distractors = null); DNA sinyal + bağlam + tuzak düzeyindedir.
// =====================================================================
const SinyalAnlamaAnalyzer = {
  id: "sentence_comprehension.signal", version: "1.0.0",
  analiz(soru) {
    const trace = []; const flags = [];
    const s = normalizeSinyal(soru.signal);
    if (!s) return { eksik: "canonical sinyal alanı boş" };
    const span = sinyalSpanBul(soru.stem, soru.signal);
    if (!span) {
      flags.push("signal_not_in_stem");
      trace.push({ rule_id: "SIGNAL_LOCATE", result: "failed", evidence: `'${s}' cümlede bulunamadı` });
    }
    const adaylar = sinyalKurallariniBul(s);
    if (adaylar.length === 0) {
      trace.push({ rule_id: "NO_RULE", result: "unmatched", evidence: `'${s}' için kural yok` });
      return sonucKur({ soru, s, span, kural: null, guven: "low", trace, flags: [...flags, "no_rule"], baglam: null, fn: null, ekBeceriler: [] });
    }
    const basta = span ? cumleBasindaMi(soru.stem, span) : false;
    const sonraki = span ? sonrakiKelime(soru.stem, span.end) : null;
    const devrik = basta && sonraki && (AUX.has(sonraki) || sonraki === "had");
    const ekBeceriler = [];
    let secilen = null, guven = "low", baglam = null, fn = null, partner = null;

    for (const k of adaylar) {
      if (k.family === "inversion") {
        // "had" / "no sooner had": cümle başında olması yeter; diğerlerinde ardından yardımcı fiil gelmeli (Not only did…)
        const uygun = basta && (s === "had" || s.endsWith(" had") ? true : AUX.has(sonraki));
        trace.push({ rule_id: k.rule_id, result: uygun ? "matched" : "rejected",
          evidence: uygun ? `cümle başında '${span.text}' + ${sonraki ? `'${sonraki}'` : "yardımcı fiil"} → devrik yapı` : `'${s}' cümle başında devrik kullanılmamış` });
        if (uygun && !secilen) { secilen = k; guven = "high"; fn = k.fn; }
        continue;
      }
      if (secilen) { trace.push({ rule_id: k.rule_id, result: "skipped", evidence: `önce ${secilen.rule_id} eşleşti` }); continue; }
      const d = kuralDegerlendir(k, soru, s, span);
      trace.push(...d.trace);
      flags.push(...d.flags); // reddedilen kuralın bulguları da (ör. signal_is_main_verb) kayda geçer
      if (d.uygun) { secilen = k; guven = d.guven; baglam = d.baglam; fn = d.fn; partner = d.partner; }
    }
    if (!secilen) {
      // Sinyal kelimesi cümlede sinyal olarak kullanılmamışsa (ör. fiil) anlam ailesi de atanmaz
      const anaFiil = flags.includes("signal_is_main_verb");
      return sonucKur({ soru, s, span, kural: null, guven: "low", trace, flags: anaFiil ? flags : [...flags, "rule_conflict"], baglam, fn: null, ekBeceriler, anlamYok: anaFiil });
    }
    if (devrik && secilen.family !== "inversion") {
      ekBeceriler.push("inversion");
      trace.push({ rule_id: "INVERSION_007", result: "matched", evidence: `cümle başında '${span.text}' + '${sonraki}' → devrik yapı (ek beceri)` });
    }
    return sonucKur({ soru, s, span, kural: secilen, guven, trace, flags, baglam, fn, ekBeceriler, partner });
  },
};

// Tek bir sinyal kuralını cümle bağlamında değerlendirir.
function kuralDegerlendir(k, soru, s, span) {
  const trace = []; const flags = [];
  const r = (uygun, guven, evidence, extra = {}) => {
    trace.push({ rule_id: k.rule_id, result: uygun ? "matched" : "rejected", evidence });
    return { uygun, guven, trace, flags, baglam: extra.baglam ?? null, fn: extra.fn ?? k.fn, partner: extra.partner ?? null };
  };
  if (!span) return r(true, "low", "sinyal konumu bilinmiyor; bağlam kontrolü yapılamadı");
  const stem = soru.stem;

  if (k.expects === "clause" || k.expects === "noun_phrase" || k.expects === "either") {
    const b = sagBaglamSiniflandir(stem, span.end);
    trace.push({ rule_id: "CTX_RIGHT_201", result: b.type, evidence: `sağ bağlam '${b.span.text}': ${b.evidence}` });
    if (k.expects === "either") {
      const fn = b.type === "clause" ? "expects_clause" : (b.type === "noun_phrase" || b.type === "gerund_phrase") ? "expects_noun_phrase" : null;
      return r(true, b.strength === "strong" ? "high" : "medium",
        `'${s}' hem edat hem bağlaç olabilir; burada ${b.type === "clause" ? "bağlaç (+S+V)" : "edat (+isim)"} kullanılmış`, { baglam: b, fn });
    }
    if (k.expects === "clause") {
      // "provided that" fiil olarak da kullanılabilir: "The statute provided that…" (= öngördü)
      if (s === "provided that" && !cumleBasindaMi(stem, span)) {
        const sol = stem.slice(0, span.start);
        const solParca = sol.slice(Math.max(sol.lastIndexOf(","), sol.lastIndexOf(";")) + 1);
        const solKelime = kelimeler(solParca);
        const solFiil = solKelime.some((w) => AUX.has(w)) || solKelime.some((w, i) => i > 0 && /ed$/.test(w));
        // Solda özne var ama çekimli fiil yok → cümlenin ana fiili "provided"dır (= öngördü/şart koştu).
        // Bu durumda koşul sinyali KABUL EDİLMEZ (kural reddedilir, koşul becerisi atanmaz).
        if (!solFiil && solKelime.length > 0) {
          flags.push("signal_is_main_verb");
          return r(false, "low", `solda özne var, çekimli fiil yok ('${solParca.trim()}'): 'provided' burada ANA FİİL (= öngördü), koşul bağlacı değil`, { baglam: b });
        }
      }
      if (b.type === "clause") return r(true, b.strength === "strong" ? "high" : "medium", `'${s}' + S + V bekler; sağda cümle var`, { baglam: b });
      if (s === "while" && b.type === "noun_phrase") {
        return r(true, "medium", `'while' + sıfat/isim: kısaltılmış yan cümle ('${b.span.text}')`, { baglam: b });
      }
      if (b.strength === "strong") { flags.push("rule_conflict"); return r(false, "low", `'${s}' + S + V bekler ama sağda ${b.type} var`, { baglam: b }); }
      return r(true, "low", `'${s}' + S + V bekler; sağ bağlam belirsiz`, { baglam: b });
    }
    // noun_phrase
    if (b.type === "noun_phrase" || b.type === "gerund_phrase") {
      const kisa = kelimeler(b.span.text).length <= 4;
      return r(true, b.strength === "strong" || kisa ? "high" : "medium", `'${s}' + isim / V-ing bekler; sağda ${b.type === "gerund_phrase" ? "V-ing öbeği" : "isim öbeği"} var`, { baglam: b });
    }
    if (b.type === "clause" && b.strength === "strong") { flags.push("rule_conflict"); return r(false, "low", `'${s}' + isim bekler ama sağda çekimli fiil var`, { baglam: b }); }
    return r(true, "medium", `'${s}' + isim bekler; sağda zayıf bir fiil adayı var (${b.evidence})`, { baglam: b });
  }
  if (k.family === "modal_perfect") {
    const haveIdx = stem.toLowerCase().indexOf("have", span.start);
    const v = haveIdx === -1 ? null : sonrakiKelime(stem, haveIdx + 4);
    const bicim = fiilBicimi(v);
    return bicim === "past_or_participle"
      ? r(true, "high", `'${s}' + '${v}' (V3)`)
      : r(true, "medium", `'${s}' sonrası '${v}' V3 olarak doğrulanamadı`);
  }
  if (k.family === "correlative") {
    const alt = stem.toLowerCase();
    const esler = { nor: ["neither", "no", "not", "never", "by no means"], either: ["or"], neither: ["nor"] };
    const aranan = esler[s] || [];
    const oncesi = alt.slice(0, span.start), sonrasi = alt.slice(span.end);
    const bulunan = s === "nor" ? aranan.find((a) => new RegExp(`\\b${a}\\b`).test(oncesi)) : aranan.find((a) => new RegExp(`\\b${a}\\b`).test(sonrasi));
    const partner = s === "nor" ? (bulunan === "neither" ? "neither … nor" : "olumsuz cümle … nor") : s === "either" ? "either … or" : "neither … nor";
    return bulunan ? r(true, "high", `eş bulundu: '${bulunan}' → ${partner}`, { partner }) : r(true, "medium", `'${s}' için eş bulunamadı`, { partner });
  }
  if (k.family === "linking_adverb") {
    const oncesi = stem.slice(0, span.start).trimEnd();
    if (s === "yet" && /^\s*to\b/i.test(stem.slice(span.end))) {
      flags.push("signal_usage_ambiguous");
      return r(false, "low", "'yet to' = henüz …medi (bağlayıcı değil)");
    }
    const ayrik = oncesi === "" || /[,;.:]$/.test(oncesi);
    return r(true, ayrik ? "high" : "medium", ayrik ? `'${s}' noktalama / cümle başı ile ayrılmış → iki cümleyi bağlıyor` : `'${s}' cümle içinde; bağlayıcı işlevi zayıf kanıtlı`);
  }
  if (k.family === "purpose_infinitive") {
    const v = sonrakiKelime(stem, span.end);
    return fiilBicimi(v) === "base" ? r(true, "high", `'${s}' + '${v}' (V1)`) : r(true, "medium", `'${s}' sonrası '${v}' V1 olarak doğrulanamadı`);
  }
  if (k.family === "hidden_negative") return r(true, "high", `'${s}' gizli olumsuzluk ifadesi`);
  return r(true, "medium", `'${s}' için yapısal kontrol tanımlı değil (${k.family})`);
}

function sonucKur({ soru, s, span, kural, guven, trace, flags, baglam, fn, ekBeceriler, partner, anlamYok }) {
  const aile = anlamYok ? null : anlamAilesi(s);
  let primary = kural?.skill || aile || null;
  const secondary = [];
  if (kural && ["clause_connector", "noun_connector", "dual_connector"].includes(kural.family)) secondary.push("clause_vs_noun_phrase");
  if (aile && aile !== primary) secondary.push(aile);
  secondary.push(...ekBeceriler);
  const tuzakAile = tuzakAilesi(soru.trap);
  if (tuzakAile === "hidden_negative" && primary !== "hidden_negative") secondary.push("hidden_negative");
  const sinyaller = [];
  if (kural) sinyaller.push({ value: s, type: kural.sinyalTipi, function: fn ?? null, span: span || null, source: "canonical" });
  const auto = {
    primary_skill: primary,
    secondary_skills: [...new Set(secondary)].filter((x) => x !== primary),
    signals: sinyaller,
    context: { right: baglam ? { type: baglam.type, span: baglam.span, has_finite_verb: baglam.has_finite_verb, pattern: baglam.pattern } : null, left: null },
    trap: soru.trap ? { value: soru.trap, trap_family: tuzakAile, source: "canonical" } : null,
    distractors: null, // Türkçe anlam şıkları: şık bazında yapısal eleme yok
    answer: null,
    avci_reflex: kural ? { rule_id: kural.rule_id, text: refleksYaz(kural.refleks, s, partner) } : null,
    family_key: primary ? `${primary}:${fn || kural?.family || "none"}` : null,
    difficulty: null,
  };
  const fallback = guven === "low" ? { needed: true, level: "llm", reason: flags[0] || "low_confidence", executed: false } : null;
  return { auto, guven, trace, flags: [...new Set(flags)], fallback };
}

// =====================================================================
// ANALYZER 2 — blank_grammar (boşluk + İngilizce şıklar)
// Her şık yapısal olarak değerlendirilir: uyuyor / uymuyor / belirsiz.
// Tek şık kalırsa → kural çözdü. Birden fazla kalırsa → anlam gerekir
// (YAPI → SİNYAL → ELEME → ANLAM): fallback işaretlenir, LLM ÇAĞRILMAZ.
// =====================================================================
const BoslukGramerAnalyzer = {
  id: "blank_grammar.structure", version: "1.0.0",
  analiz(soru) {
    const trace = []; const flags = [];
    const stem = String(soru.stem);
    const m = stem.match(/_{3,}/);
    if (!m) return { eksik: "boşluk (_____) bulunamadı" };
    const sol = stem.slice(0, m.index); const bosSonu = m.index + m[0].length;
    const solKelime = kelimeler(sol); const oncekiKelime = solKelime[solKelime.length - 1] || null;
    const secenekler = soru.options.map((o) => normalizeSinyal(o));

    // 1) Hangi kural ailesi? (bağlam + şıklar birlikte — tek bir kalıba bakarak karar verilmez)
    let aile = null, kuralId = null, beklenen = null, ek = {};
    const solMetin = sol.toLowerCase();
    const fiilSikMi = secenekler.every((o) => o.split(" ").length <= 2 && !sinyalKurallariniBul(o).length);
    if (/\b(the|a) number of\b/.test(solMetin) && secenekler.some((o) => SINGULAR_VERBS.has(o) || PLURAL_VERBS.has(o))) {
      aile = "agreement"; kuralId = "AGREE_NUMBER_101";
      const tekil = /\bthe number of\b/.test(solMetin);
      beklenen = tekil ? "singular" : "plural";
      ek.sinyal = tekil ? "the number of" : "a number of";
      ek.partner = tekil ? "tekil fiil" : "çoğul fiil";
    } else if (oncekiKelime && MODALS.has(oncekiKelime) && fiilSikMi) {
      aile = "modal_base"; kuralId = "MODAL_V1_102"; beklenen = "base"; ek.sinyal = oncekiKelime;
    } else if (oncekiKelime === "to" && fiilSikMi) {
      const edatTo = TO_PREPOSITION_PHRASES.some((p) => solMetin.trimEnd().endsWith(p));
      aile = edatTo ? "preposition_gerund" : "to_infinitive"; kuralId = edatTo ? "PREP_GERUND_104" : "TO_V1_103";
      beklenen = edatTo ? "gerund" : "base"; ek.sinyal = edatTo ? TO_PREPOSITION_PHRASES.find((p) => solMetin.trimEnd().endsWith(p)) : "to";
      trace.push({ rule_id: "TO_V1_103", result: edatTo ? "rejected" : "matched", evidence: edatTo ? `'${ek.sinyal}': burada 'to' edat → V-ing` : "'to' mastar işareti → V1" });
    } else if (oncekiKelime && PREPOSITIONS.has(oncekiKelime) && fiilSikMi) {
      aile = "preposition_gerund"; kuralId = "PREP_GERUND_104"; beklenen = "gerund"; ek.sinyal = oncekiKelime;
    } else if (secenekler.includes("whose") && secenekler.filter((o) => RELATIVES.has(o)).length >= 3) {
      aile = "relative_whose"; kuralId = "REL_WHOSE_105";
    } else if (secenekler.some((o) => sinyalKurallariniBul(o).length)) {
      aile = "connector";
    }
    if (!aile) {
      trace.push({ rule_id: "NO_RULE", result: "unmatched", evidence: "bağlam + şıklar hiçbir kurala uymadı; yanlış pozitif üretmemek için atama yapılmadı" });
      return { auto: bosAuto(soru), guven: "low", trace, flags: ["no_rule"], fallback: { needed: true, level: "llm", reason: "no_rule", executed: false } };
    }

    // 2) Şıkları değerlendir
    const sagBaglam = sagBaglamSiniflandir(stem, bosSonu);
    const distractors = [];
    const uyum = soru.options.map((ham, i) => {
      const o = secenekler[i];
      let fit = null, rule_id = kuralId, eleme = null, trap_family = null, yanilgi = null, kanit = "";
      if (aile === "connector") {
        const k = sinyalKurallariniBul(o).find((x) => x.expects || x.family === "linking_adverb");
        rule_id = k?.rule_id || "NO_RULE";
        if (!k) { fit = null; kanit = `'${o}' için kural yok`; }
        else if (k.family === "linking_adverb") {
          // Bağlayıcı zarf (however/therefore): cümle başında + ardından TAM CÜMLE ister
          const oncesi = sol.trimEnd();
          const basta = oncesi === "" || /[;.]$/.test(oncesi);
          fit = !basta ? false : sagBaglam.type === "clause" ? null : (sagBaglam.type === "noun_phrase" || sagBaglam.type === "gerund_phrase") ? false : null;
          kanit = !basta ? `'${o}' iki bağımsız cümleyi bağlar; boşluk bir cümlenin içinde` : `'${o}' + CÜMLE bekler; sağda ${sagBaglam.type}`;
          eleme = fit === false ? `${sinyalGoster(o)} + CÜMLE ister.` : null; trap_family = "connector_confusion"; yanilgi = "connector_confusion";
        } else if (k.expects === "either") { fit = true; kanit = `'${o}' hem isim hem cümle alabilir`; }
        else if (k.expects === "clause") {
          fit = sagBaglam.type === "clause" ? true : (sagBaglam.type === "noun_phrase" || sagBaglam.type === "gerund_phrase") ? false : null;
          kanit = `'${o}' + S + V bekler; sağda ${sagBaglam.type}`; eleme = fit === false ? `${sinyalGoster(o)} + CÜMLE ister.` : null;
          trap_family = "meaning_first"; yanilgi = "clause_noun_confusion";
        } else if (k.expects === "noun_phrase") {
          fit = (sagBaglam.type === "noun_phrase" || sagBaglam.type === "gerund_phrase") ? true : sagBaglam.type === "clause" ? false : null;
          kanit = `'${o}' + isim / V-ing bekler; sağda ${sagBaglam.type}`; eleme = fit === false ? `${sinyalGoster(o)} + İSİM / V-ing ister.` : null;
          trap_family = "meaning_first"; yanilgi = "clause_noun_confusion";
        }
      } else if (aile === "agreement") {
        const tekil = SINGULAR_VERBS.has(o), cogul = PLURAL_VERBS.has(o);
        fit = beklenen === "singular" ? tekil : cogul;
        if (!tekil && !cogul) fit = false;
        kanit = `'${ek.sinyal}' → ${ek.partner}; '${o}' ${tekil ? "tekil" : cogul ? "çoğul" : "çekimsiz"}`;
        eleme = fit ? null : `'${sinyalGoster(ek.sinyal)}' ${ek.partner} ister.`; trap_family = "agreement_trap"; yanilgi = "svo_confusion";
      } else if (["modal_base", "to_infinitive", "preposition_gerund"].includes(aile)) {
        const b = fiilBicimi(o);
        fit = b === beklenen;
        kanit = `'${ek.sinyal}' → ${beklenen === "base" ? "V1" : "V-ing"}; '${o}' = ${b}`;
        eleme = fit ? null : `${sinyalGoster(ek.sinyal)} + ${beklenen === "base" ? "V1" : "V-ing"} ister.`; trap_family = "form_trap"; yanilgi = "clause_noun_confusion";
      } else if (aile === "relative_whose") {
        const sonra = kelimeler(stem.slice(bosSonu)).slice(0, 3);
        const isimFiil = sonra.length >= 2 && !DETERMINERS.has(sonra[0]) && !AUX.has(sonra[0]) && fiilBicimi(sonra[1]) !== "base";
        fit = o === "whose" ? (isimFiil ? true : null) : (isimFiil ? false : null);
        kanit = `boşluktan sonra '${sonra.join(" ")}' → ${isimFiil ? "isim + fiil" : "belirsiz"}`;
        eleme = fit === false ? `Boşluktan sonra isim + fiil var; ${o} değil whose gerekir.` : null; trap_family = "structural_mismatch"; yanilgi = "svo_confusion";
      }
      trace.push({ rule_id, result: fit === true ? "fits" : fit === false ? "eliminated" : "undetermined", evidence: `${String.fromCharCode(65 + i)}) ${kanit}` });
      const uyumNedeni = fit !== true ? null
        : aile === "connector" ? `${sinyalGoster(o)} + ${sagBaglam.type === "clause" ? "cümle" : "isim / V-ing"}: sağda ${sagBaglam.type === "clause" ? "cümle" : "isim öbeği"} var.`
        : aile === "agreement" ? `${sinyalGoster(ek.sinyal)} + ${ek.partner} → ${o}.`
        : aile === "relative_whose" ? "Boşluktan sonra isim + fiil var → whose."
        : `${sinyalGoster(ek.sinyal)} + ${beklenen === "base" ? "V1" : "V-ing"} → ${o}.`;
      distractors.push({
        index: i, option: ham, is_correct: i === soru.correct_index, rule_id, structural_fit: fit, fit_reason: uyumNedeni,
        elimination_rule: eleme, trap_family: i === soru.correct_index ? null : (fit === false ? trap_family : null),
        targeted_misconception: i === soru.correct_index || fit !== false ? null : yanilgi,
        semantic_plausibility: null, // ileride (FAZ 3+): anlam benzerliği
      });
      return fit;
    });

    // 3) Sonuç
    const kalan = uyum.map((f, i) => (f === false ? null : i)).filter((i) => i !== null);
    const kesinUyan = uyum.map((f, i) => (f === true ? i : null)).filter((i) => i !== null);
    let predicted = null, guven = "low", fallback = null;
    if (kalan.length === 1 && kesinUyan.length === 1) {
      predicted = kalan[0];
      // Zayıf sağ bağlam kanıtı: kısa, fiilsiz isim öbeği ("heavy rainfall") yine güçlü sayılır
      const kisaIsim = (sagBaglam.type === "noun_phrase" || sagBaglam.type === "gerund_phrase") && kelimeler(sagBaglam.span.text).length <= 4;
      guven = aile === "relative_whose" ? "medium" : sagBaglam.strength === "weak" && aile === "connector" && !kisaIsim ? "medium" : "high";
    } else if (kalan.length === 0) {
      flags.push("no_structural_fit");
    } else {
      flags.push("semantic_required");
      fallback = { needed: true, level: "llm", reason: "semantic_required", executed: false,
        candidates: kalan.map((i) => soru.options[i]) };
    }
    if (predicted !== null && predicted !== soru.correct_index) { flags.push("rule_conflict"); guven = "low"; }
    if (aile === "connector") trace.push({ rule_id: "CTX_RIGHT_201", result: sagBaglam.type, evidence: `sağ bağlam '${sagBaglam.span.text}': ${sagBaglam.evidence}` });

    const dogru = normalizeSinyal(soru.options[soru.correct_index]);
    const dogruKural = aile === "connector" ? sinyalKurallariniBul(dogru)[0] : null;
    const primary = aile === "connector" ? "clause_vs_noun_phrase"
      : { agreement: "subject_verb_agreement", modal_base: "modal_base_verb", to_infinitive: "to_infinitive", preposition_gerund: "preposition_gerund", relative_whose: "relative_clause" }[aile];
    const secondary = aile === "connector" && anlamAilesi(dogru) ? [anlamAilesi(dogru)] : [];
    const refleksKural = aile === "connector" ? dogruKural : BOSLUK_KURAL_PAKETI.find((k) => k.rule_id === kuralId);
    const sinyalDegeri = aile === "connector" ? dogru : ek.sinyal || null;
    const auto = {
      primary_skill: primary, secondary_skills: secondary,
      signals: [
        { value: "_____", type: "positional", function: null, span: { start: m.index, end: bosSonu, text: m[0] }, source: "rule" },
        ...(sinyalDegeri ? [{ value: sinyalDegeri, type: aile === "connector" ? "lexical" : "grammatical",
          function: aile === "connector" ? dogruKural?.fn ?? null : { base: "expects_base_verb", gerund: "expects_gerund", singular: "expects_singular_verb", plural: "expects_plural_verb" }[beklenen] ?? (aile === "relative_whose" ? "expects_noun_after_relative" : null),
          span: null, source: "rule" }] : []),
      ],
      context: { right: { type: sagBaglam.type, span: sagBaglam.span, has_finite_verb: sagBaglam.has_finite_verb, pattern: sagBaglam.pattern }, left: { type: null, span: { start: 0, end: m.index, text: sol.trim() }, has_finite_verb: null, pattern: null } },
      trap: null,
      distractors,
      answer: { predicted_index: predicted, matches_key: predicted === null ? null : predicted === soru.correct_index },
      avci_reflex: refleksKural ? { rule_id: refleksKural.rule_id, text: refleksYaz(refleksKural.refleks, sinyalDegeri, ek.partner) } : null,
      family_key: primary ? `${primary}:${auto_fn(aile, dogruKural, beklenen)}` : null,
      difficulty: null,
    };
    return { auto, guven, trace, flags: [...new Set(flags)], fallback };
  },
};
function auto_fn(aile, dogruKural, beklenen) {
  if (aile === "connector") return dogruKural?.fn || "none";
  return beklenen || aile;
}
function bosAuto(soru) {
  return { primary_skill: null, secondary_skills: [], signals: [], context: { right: null, left: null }, trap: null,
    distractors: null, answer: null, avci_reflex: null, family_key: null, difficulty: null };
}

// ---- Analyzer kaydı ---------------------------------------------------
// Yeni soru tipi = yeni analyzer (VocabularyAnalyzer, ReadingAnalyzer…).
// Grammar pipeline başka tiplere ZORLA uygulanmaz.
export const ANALYZERS = Object.freeze({
  sentence_comprehension: SinyalAnlamaAnalyzer,
  blank_grammar: BoslukGramerAnalyzer,
});

// =====================================================================
// COST GUARD HATTI:  L0 CACHE → L1 RULE (+ L2 LOCAL sezgisel) → L3 LLM
// =====================================================================
// opts: { onceki: eski kayıt | null, simdi: ISO string, analyzers?, llm? }
// Dönüş: { kayit, olay: 'cache_hit' | 'analyzed' | 'pending' | 'failed' | 'stale' }
// ASLA hata fırlatmaz: analyzer çökerse kayıt "failed" olur, toplu iş sürer.
export function dnaAnalizEt(hamSoru, opts = {}) {
  const simdi = opts.simdi || null;
  const onceki = opts.onceki || null;
  const analyzers = opts.analyzers || ANALYZERS;
  let soru;
  try { soru = soruNormalize(hamSoru); }
  catch (e) {
    return { olay: "failed", kayit: temelKayit({ id: hamSoru?.id ?? null, question_type: null, meta: null }, null, "failed", simdi, onceki, { error: `normalize: ${e.message}` }) };
  }
  const hash = icerikHash(soru);

  // L0 — CACHE: aynı içerik + aynı sürümler → hiçbir iş yapılmaz (idempotent)
  if (onceki && onceki.content_hash === hash && ayniSurum(onceki.versions) && onceki.status !== "failed" && onceki.status !== "pending") {
    return { olay: "cache_hit", kayit: onceki };
  }

  const analyzer = analyzers[soru.question_type];
  if (!analyzer) {
    return { olay: "pending", kayit: temelKayit(soru, hash, "pending", simdi, onceki, { flags: ["no_analyzer_for_type"] }) };
  }
  let sonuc;
  try {
    sonuc = analyzer.analiz(soru);
  } catch (e) {
    return { olay: "failed", kayit: temelKayit(soru, hash, "failed", simdi, onceki, { error: String(e && e.message || e), analyzer }) };
  }
  if (!sonuc || sonuc.eksik) {
    return { olay: "failed", kayit: temelKayit(soru, hash, "failed", simdi, onceki, { error: sonuc?.eksik || "analyzer boş sonuç döndü", analyzer }) };
  }

  // L3 — LLM: FAZ 1'de KAPALI. Kurallar yetmediyse sadece işaretlenir.
  // (opts.llm ileride {enabled, budget, model, prompt_version} alacak;
  //  şimdi verilse bile kullanılmaz — llm_calls her zaman 0.)
  // Ölçülen beceri eşlenemediyse sonuç "analyzed" sayılmaz — taksonomi boşluğu insan incelemesine gider
  if (sonuc.auto && !sonuc.auto.primary_skill && !sonuc.flags.includes("no_skill_mapping")) sonuc.flags.push("no_skill_mapping");
  const durum = sonuc.guven === "low" || sonuc.flags.includes("rule_conflict") || sonuc.flags.includes("semantic_required") || sonuc.flags.includes("no_skill_mapping")
    ? "needs_review" : "analyzed";
  let kayit = temelKayit(soru, hash, durum, simdi, onceki, { analyzer, sonuc });
  const hatalar = taksonomiDogrula(kayit);
  if (hatalar.length) {
    return { olay: "failed", kayit: temelKayit(soru, hash, "failed", simdi, onceki, { error: "taksonomi: " + hatalar.join("; "), analyzer }) };
  }
  // İnsan düzeltmesi: içerik değiştiyse override korunur ama "stale" olur.
  const olay = kayit.status === "stale" ? "stale" : "analyzed";
  return { olay, kayit };
}

function ayniSurum(v) {
  return !!v && v.schema === SCHEMA_VERSION && v.analyzer === ANALYZER_VERSION && v.rule === RULE_VERSION && v.taxonomy === TAXONOMY_VERSION;
}

function temelKayit(soru, hash, status, simdi, onceki, { analyzer, sonuc, error, flags } = {}) {
  const override = onceki?.override ?? null; // motor override'ı ASLA değiştirmez
  let st = status;
  if (override && status !== "failed") {
    st = onceki.content_hash && hash && onceki.content_hash !== hash ? "stale" : "human_verified";
  }
  const kayit = {
    question_id: soru.id,
    question_type: soru.question_type,
    content_hash: hash,
    status: st,
    confidence: sonuc ? sonuc.guven : null,
    analysis_source: sonuc ? "rule" : null,
    analyzer: analyzer ? { id: analyzer.id, version: analyzer.version } : null,
    versions: { ...SURUMLER },
    analyzed_at: simdi,
    meta: soru.meta,
    auto: sonuc ? sonuc.auto : null,
    trace: sonuc ? sonuc.trace : [],
    quality_flags: sonuc ? sonuc.flags : (flags || []),
    fallback: sonuc ? sonuc.fallback : null,
    llm: null, // ileride: { provider, model, prompt_version, tokens_in, tokens_out, cost_usd, reason }
    override,
    error: error || null,
  };
  kayit.dna_ref = hash ? dnaRef(kayit) : null;
  return kayit;
}

// ---- Toplu çalıştırma (build script ve testler için) ------------------
export function dnaToplu(hamSorular, oncekiDosya, opts = {}) {
  const oncekiKayitlar = (oncekiDosya && oncekiDosya.records) || {};
  const records = {};
  const istatistik = { toplam: 0, cache_hit: 0, analyzed: 0, needs_review: 0, human_verified: 0, stale: 0, pending: 0, failed: 0,
    rule_resolved: 0, llm_calls: 0, fallback_needed: 0, confidence: { high: 0, medium: 0, low: 0 }, fallback_reasons: {} };
  for (const ham of hamSorular) {
    const id = ham && ham.id != null ? String(ham.id) : null;
    const { olay, kayit } = dnaAnalizEt(ham, { ...opts, onceki: id ? oncekiKayitlar[id] : null });
    istatistik.toplam++;
    if (olay === "cache_hit") istatistik.cache_hit++;
    istatistik[kayit.status] = (istatistik[kayit.status] || 0) + 1;
    if (kayit.confidence) istatistik.confidence[kayit.confidence]++;
    if (kayit.analysis_source === "rule" && kayit.status === "analyzed") istatistik.rule_resolved++;
    if (kayit.fallback?.needed) {
      istatistik.fallback_needed++;
      istatistik.fallback_reasons[kayit.fallback.reason] = (istatistik.fallback_reasons[kayit.fallback.reason] || 0) + 1;
    }
    if (id) records[id] = kayit;
  }
  const dosya = { schema_version: SCHEMA_VERSION, versions: { ...SURUMLER }, records };
  return { dosya, istatistik };
}

// Aynı veri → aynı bayt (idempotency: gereksiz diff / duplicate yok)
export function dosyaSerilestir(dosya) {
  return JSON.stringify(JSON.parse(kararliJson(dosya)), null, 2) + "\n";
}

// ---- Okuma tarafı -----------------------------------------------------
// Etkin görünüm: override alanları otomatik analizin üstüne geçer; her
// alanın kaynağı (rule | human) izlenebilir.
export function dnaEtkin(kayit) {
  if (!kayit || !kayit.auto && !kayit.override) return null;
  const auto = kayit.auto || {};
  const ov = (kayit.override && kayit.override.fields) || {};
  const alanlar = {}; const kaynak = {};
  for (const k of new Set([...Object.keys(auto), ...Object.keys(ov)])) {
    if (Object.prototype.hasOwnProperty.call(ov, k)) { alanlar[k] = ov[k]; kaynak[k] = "human"; }
    else { alanlar[k] = auto[k]; kaynak[k] = kayit.analysis_source || "rule"; }
  }
  return { ...alanlar, _kaynak: kaynak, _status: kayit.status, _confidence: kayit.confidence };
}

// Soru sunumunu ASLA bloke etmez: her türlü hata/eksiklikte null döner.
export function dnaGuvenliGetir(dosya, soruId) {
  try {
    const k = dosya && dosya.records && dosya.records[String(soruId)];
    if (!k || k.status === "failed" || k.status === "pending") return null;
    return k;
  } catch { return null; }
}

// ---- Öğrenci özeti (AVCI pedagojisi) ---------------------------------
// Öğrenci JSON, güven yüzdesi, rule_id GÖRMEZ. Sadece: NEREYE BAK · NE
// GÖRDÜN · HANGİ ŞIK ELENİR · NEDEN · AVCI REFLEKSİ. Yalnız yüksek
// güvenli veya öğretmen onaylı DNA gösterilir; aksi halde null (mevcut
// davranış sürer).
const BAGLAM_TR = { clause: "özne + fiil (cümle)", noun_phrase: "isim öbeği", gerund_phrase: "V-ing öbeği", base_verb: "V1", unknown: "belirsiz" };
export function ogrenciOzeti(kayit) {
  if (!kayit) return null;
  const guvenli = kayit.status === "human_verified" || (kayit.status === "analyzed" && kayit.confidence === "high");
  if (!guvenli) return null;
  const d = dnaEtkin(kayit);
  if (!d || !d.avci_reflex) return null;
  const sinyal = (d.signals || []).find((x) => x.type !== "positional");
  const sag = d.context && d.context.right;
  const devrik = (d.secondary_skills || []).includes("inversion") || d.primary_skill === "inversion";
  const bosluk = kayit.question_type === "blank_grammar";
  const solIpucu = bosluk && d.primary_skill !== "clause_vs_noun_phrase"; // modal/to/edat/uyum: ipucu boşluğun SOLUNDA
  const nereye = devrik ? "Cümlenin başına" : solIpucu ? "Boşluğun soluna" : sag ? (bosluk ? "Boşluğun sağına" : "Sinyalin sağına")
    : d.primary_skill === "hidden_negative" ? "Olumsuzluk taşıyan ifadeye" : "Sinyale";
  const neGordun = !sinyal ? null : solIpucu ? `${sinyalGoster(sinyal.value)} (boşluğun solunda)`
    : sag ? `${bosluk ? "Sağda" : sinyalGoster(sinyal.value) + " → sağda"} ${BAGLAM_TR[sag.type] || sag.type}` : sinyalGoster(sinyal.value);
  const elenen = (d.distractors || []).filter((x) => x.structural_fit === false && x.elimination_rule)
    .map((x) => ({ sik: x.option, neden: x.elimination_rule }));
  const dogruSik = (d.distractors || []).find((x) => x.is_correct);
  return {
    nereye_bak: nereye,
    ne_gordun: neGordun,
    elenen_siklar: elenen,
    neden: dogruSik ? dogruSik.fit_reason || null
      : sinyal && sinyal.function === "expects_noun_phrase" ? `${sinyalGoster(sinyal.value)} + isim / V-ing ister; sağda ${BAGLAM_TR[sag?.type] || "isim"} var.`
      : sinyal && sinyal.function === "expects_clause" ? `${sinyalGoster(sinyal.value)} + özne + fiil ister; sağda cümle var.` : null,
    refleks: d.avci_reflex.text,
  };
}
