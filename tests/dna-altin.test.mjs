// AVCI ÖSYM DNA — GOLDEN: bilinen AVCI örnekleri (sentetik boşluk soruları
// + kanonik bankadan seçilmiş sorular). Kural motorunun davranışı değişirse kırılır.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dnaAnalizEt, ogrenciOzeti } from "../api/_avciDna.mjs";
import { ALTIN_BOSLUK, ALTIN_KANONIK, ALTIN_ANLAMA } from "./fixtures/dna-altin-set.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sorular = JSON.parse(readFileSync(path.join(__dirname, "..", "api", "data", "sorular.json"), "utf-8"));

let toplam = 0, basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++; if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

for (const g of ALTIN_BOSLUK) {
  const { kayit } = dnaAnalizEt(g, { simdi: "2026-01-01T00:00:00Z" });
  const b = g.beklenen; const a = kayit.auto || {};
  const elenen = (a.distractors || []).filter((d) => d.structural_fit === false).map((d) => d.index);
  const hatalar = [];
  if (kayit.status !== b.status) hatalar.push(`status ${kayit.status}≠${b.status}`);
  if (b.confidence && kayit.confidence !== b.confidence) hatalar.push(`confidence ${kayit.confidence}≠${b.confidence}`);
  if ("predicted_index" in b && (a.answer?.predicted_index ?? null) !== b.predicted_index) hatalar.push(`tahmin ${a.answer?.predicted_index}≠${b.predicted_index}`);
  if (b.primary_skill && a.primary_skill !== b.primary_skill) hatalar.push(`beceri ${a.primary_skill}≠${b.primary_skill}`);
  if (b.elenen && JSON.stringify(elenen) !== JSON.stringify(b.elenen)) hatalar.push(`elenen ${JSON.stringify(elenen)}≠${JSON.stringify(b.elenen)}`);
  if (b.fallback && kayit.fallback?.reason !== b.fallback) hatalar.push(`fallback ${kayit.fallback?.reason}≠${b.fallback}`);
  if (b.flag && !kayit.quality_flags.includes(b.flag)) hatalar.push(`bayrak '${b.flag}' yok`);
  if (b.rule_ids) { const izler = new Set(kayit.trace.map((t) => t.rule_id)); b.rule_ids.forEach((r) => { if (!izler.has(r)) hatalar.push(`trace'te ${r} yok`); }); }
  if (kayit.fallback && kayit.fallback.executed !== false) hatalar.push("fallback yürütülmüş (LLM çağrısı!)");
  kontrol(`G-${g.id}) ${g.stem.slice(0, 48)}…`, hatalar.length === 0, hatalar.join("; ") || `${kayit.status}/${kayit.confidence}`);
}

// Elenen her şık öğrenciye gösterilebilir bir NEDEN taşımalı
{
  const eksik = [];
  for (const g of ALTIN_BOSLUK) {
    const { kayit } = dnaAnalizEt(g, { simdi: "x" });
    (kayit.auto?.distractors || []).filter((d) => d.structural_fit === false && !d.elimination_rule).forEach((d) => eksik.push(`${g.id}:${d.option}`));
  }
  kontrol("G-E1) yapısal olarak elenen her şıkta eleme kuralı metni var", eksik.length === 0, eksik.join(", "));
}
{
  const { kayit } = dnaAnalizEt(ALTIN_BOSLUK[0], { simdi: "x" });
  const hedef = kayit.auto.distractors.find((d) => d.option === "Because");
  kontrol("G-E2) Distractor DNA: Because → meaning_first + clause_noun_confusion + 'Because + CÜMLE ister.'",
    hedef.trap_family === "meaning_first" && hedef.targeted_misconception === "clause_noun_confusion" && hedef.elimination_rule === "Because + CÜMLE ister.",
    JSON.stringify(hedef));
}

for (const [id, b] of Object.entries(ALTIN_KANONIK)) {
  const soru = sorular.find((s) => s.id === id);
  const { kayit } = dnaAnalizEt(soru, { simdi: "x" });
  const a = kayit.auto || {}; const hatalar = [];
  if (kayit.status !== b.status) hatalar.push(`status ${kayit.status}≠${b.status}`);
  if (b.confidence && kayit.confidence !== b.confidence) hatalar.push(`confidence ${kayit.confidence}≠${b.confidence}`);
  if ("primary_skill" in b && (a.primary_skill ?? null) !== b.primary_skill) hatalar.push(`beceri ${a.primary_skill}≠${b.primary_skill}`);
  if (b.right && a.context?.right?.type !== b.right) hatalar.push(`sağ ${a.context?.right?.type}≠${b.right}`);
  if (b.rule && !kayit.trace.some((t) => t.rule_id === b.rule && t.result === "matched")) hatalar.push(`${b.rule} eşleşmedi`);
  if (b.secondary) b.secondary.forEach((s) => { if (!(a.secondary_skills || []).includes(s)) hatalar.push(`ikincil '${s}' yok`); });
  if (b.flag && !kayit.quality_flags.includes(b.flag)) hatalar.push(`bayrak '${b.flag}' yok`);
  kontrol(`G-${id}) ${soru.soru_en.slice(0, 50)}…`, hatalar.length === 0, hatalar.join("; ") || `${kayit.status}/${kayit.confidence}/${a.primary_skill}`);
}

// ---- "provided (that)": bağlam duyarlı kural (q020 regresyonu) ----
for (const g of ALTIN_ANLAMA) {
  const { kayit } = dnaAnalizEt(g, { simdi: "x" });
  const b = g.beklenen, a = kayit.auto || {}, hatalar = [];
  if (kayit.status !== b.status) hatalar.push(`status ${kayit.status}≠${b.status}`);
  if ((a.primary_skill ?? null) !== b.primary_skill) hatalar.push(`beceri ${a.primary_skill}≠${b.primary_skill}`);
  if (b.flag && !kayit.quality_flags.includes(b.flag)) hatalar.push(`bayrak '${b.flag}' yok`);
  if (b.rule && !kayit.trace.some((t) => t.rule_id === b.rule && t.result === "matched")) hatalar.push(`${b.rule} eşleşmedi`);
  if (!b.rule && kayit.trace.some((t) => t.rule_id === "CONN_CLAUSE_001" && t.result === "matched")) hatalar.push("koşul kuralı yanlışlıkla eşleşti");
  kontrol(`G-${g.id}) ${g.soru_en}`, hatalar.length === 0, hatalar.join("; ") || `${kayit.status}/${a.primary_skill}`);
}

// ---- AVCI pedagoji koruması: öğrenci özeti sade, teknik veri yok ----
{
  const { kayit } = dnaAnalizEt(ALTIN_BOSLUK[0], { simdi: "x" });
  const oz = ogrenciOzeti(kayit);
  const metin = JSON.stringify(oz);
  kontrol("G-P1) öğrenci özeti 5 alan: nereye bak / ne gördün / elenen şıklar / neden / refleks",
    oz && ["nereye_bak", "ne_gordun", "elenen_siklar", "neden", "refleks"].every((k) => k in oz) && Object.keys(oz).length === 5, metin);
  kontrol("G-P2) öğrenci özetinde rule_id / confidence / JSON alanı yok",
    !/[A-Z]+_\d{3}|confidence|high|medium|sha256|trace/.test(metin), metin);
  kontrol("G-P3) refleks = 'Despite gördün → sağa bak → isim / V-ing ara.' (ana sayfa demosuyla aynı)",
    oz.refleks === "Despite gördün → sağa bak → isim / V-ing ara.", oz.refleks);
}
{
  const orta = dnaAnalizEt(ALTIN_BOSLUK.find((g) => g.id === "g12"), { simdi: "x" }).kayit;
  const inceleme = dnaAnalizEt(ALTIN_BOSLUK.find((g) => g.id === "g05"), { simdi: "x" }).kayit;
  kontrol("G-P4) orta güvenli ve incelemedeki DNA öğrenciye GÖSTERİLMEZ (null → mevcut davranış)",
    ogrenciOzeti(orta) === null && ogrenciOzeti(inceleme) === null);
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
