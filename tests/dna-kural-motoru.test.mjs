// AVCI ÖSYM DNA — UNIT: kural motoru ve bağlam sınıflandırıcı.
// Ağ/tarayıcı/LLM gerektirmez. Cümleler sentetiktir.
import {
  sagBaglamSiniflandir, sinyalKurallariniBul, SINYAL_KURAL_PAKETI, BOSLUK_KURAL_PAKETI, yardimcilar,
} from "../api/_avciDnaKurallar.mjs";
import { taksonomiDogrula, taksonomiGecerli, slugNormalize, SKILLS, SIGNAL_FUNCTIONS } from "../api/_avciDnaTaksonomi.mjs";

let toplam = 0, basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++; if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}
const sag = (cumle, sonrasi) => sagBaglamSiniflandir(cumle, cumle.toLowerCase().indexOf(sonrasi) + sonrasi.length);

// ---- Sağ bağlam sınıflandırıcı ----
{
  const b = sag("Despite the heavy rain, the match continued.", "despite");
  kontrol("U1) 'despite the heavy rain' → noun_phrase (güçlü)", b.type === "noun_phrase" && b.strength === "strong", `${b.type}/${b.strength}`);
  kontrol("U2) sağ bağlam span'i virgülde biter", b.span.text === "the heavy rain", b.span.text);
  kontrol("U3) span başlangıç/bitiş konumu metinle tutarlı", "Despite the heavy rain, the match continued.".slice(b.span.start, b.span.end) === b.span.text);
}
{
  const b = sag("Although it was raining, the match continued.", "although");
  kontrol("U4) 'although it was raining' → clause (güçlü, yardımcı fiil)", b.type === "clause" && b.strength === "strong" && b.has_finite_verb === true, b.evidence);
}
{
  const b = sag("Despite being tired, she finished the report.", "despite");
  kontrol("U5) 'despite being tired' → gerund_phrase", b.type === "gerund_phrase", b.type);
}
{
  const b = sag("Although researchers continued the study, funding ended.", "although");
  kontrol("U6) yardımcı fiilsiz cümle → clause ama ZAYIF kanıt", b.type === "clause" && b.strength === "weak", `${b.type}/${b.strength}`);
}
{
  const b = sag("Despite the controlled laboratory conditions, results varied.", "despite");
  kontrol("U7) yanlış pozitif koruması: öbek sonundaki çoğul isim fiil sayılmaz", b.type === "noun_phrase", `${b.type}: ${b.evidence}`);
}
{
  const b = sag("As long as employees adhere to the rules, accidents drop.", "as long as");
  kontrol("U8) çoğul özne + yalın fiil → clause (zayıf)", b.type === "clause", `${b.type}: ${b.evidence}`);
}

// ---- Kural paketi bütünlüğü ----
{
  const idler = [...SINYAL_KURAL_PAKETI, ...BOSLUK_KURAL_PAKETI].map((k) => k.rule_id);
  kontrol("U9) rule_id'ler benzersiz", new Set(idler).size === idler.length, idler.join(","));
  kontrol("U10) rule_id biçimi AILE_NNN", idler.every((i) => /^[A-Z_0-9]+_\d{3}$/.test(i)));
  const beceriHatali = [...SINYAL_KURAL_PAKETI, ...BOSLUK_KURAL_PAKETI].filter((k) => k.skill && !SKILLS.includes(k.skill));
  kontrol("U11) kuralların becerileri taksonomide", beceriHatali.length === 0, beceriHatali.map((k) => k.rule_id).join(","));
  const fnHatali = SINYAL_KURAL_PAKETI.filter((k) => k.fn && !SIGNAL_FUNCTIONS.includes(k.fn));
  kontrol("U12) kuralların sinyal işlevleri taksonomide", fnHatali.length === 0);
  const tekrar = {};
  SINYAL_KURAL_PAKETI.forEach((k) => k.sinyaller.forEach((s) => { (tekrar[s] = tekrar[s] || []).push(k.family); }));
  const cakisan = Object.entries(tekrar).filter(([s, a]) => a.length > 1).map(([s, a]) => `${s}:${a.join("+")}`);
  // Bilinçli çift üyelik: "hardly" hem gizli olumsuz hem (cümle başında) devrik — bağlamla ayrılır.
  kontrol("U13) sadece bilinçli çift kural üyelikleri var (hardly)", cakisan.every((c) => c.startsWith("hardly:")), cakisan.join(", ") || "yok");
}
{
  kontrol("U14) 'Because of' büyük harfle de bulunur", sinyalKurallariniBul("Because of")[0]?.rule_id === "CONN_NP_002");
  kontrol("U15) bilinmeyen sinyal → kural yok (uydurma eşleşme yok)", sinyalKurallariniBul("of").length === 0);
}
{
  const { fiilBicimi } = yardimcilar;
  const ok = [["analyze", "base"], ["analyzing", "gerund"], ["analyzed", "past_or_participle"], ["to analyze", "to_infinitive"], ["postpones", "third_person"], ["been", "past_or_participle"]]
    .every(([w, b]) => fiilBicimi(w) === b);
  kontrol("U16) fiil biçimi sınıflandırma (V1 / V-ing / V3 / to V / -s)", ok);
}

// ---- Taksonomi ----
{
  kontrol("U17) slug normalize: 'clause-vs-noun-phrase' → clause_vs_noun_phrase", slugNormalize("clause-vs-noun-phrase") === "clause_vs_noun_phrase");
  kontrol("U18) taksonomi dışı beceri reddedilir", taksonomiGecerli("skill", "clauseNounThing") === false);
  const hatalar = taksonomiDogrula({ question_type: "sentence_comprehension", status: "analyzed", confidence: "high", analysis_source: "rule",
    auto: { primary_skill: "uydurma_beceri", secondary_skills: [], signals: [], context: { right: null } } });
  kontrol("U19) taksonomiDogrula serbest metin etiketi yakalar", hatalar.length === 1 && /uydurma_beceri/.test(hatalar[0]), hatalar.join("; "));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
