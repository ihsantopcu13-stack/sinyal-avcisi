// AVCI ÖSYM DNA — CACHE + VERSIONING + IDEMPOTENCY + HUMAN OVERRIDE
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  dnaAnalizEt, dnaToplu, dosyaSerilestir, dnaEtkin, icerikHash, soruNormalize, SURUMLER, RULE_VERSION, kararliJson,
} from "../api/_avciDna.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const sorular = JSON.parse(readFileSync(path.join(ROOT, "api", "data", "sorular.json"), "utf-8"));
const dnaMetni = readFileSync(path.join(ROOT, "api", "data", "soru-dna.json"), "utf-8");
const dnaDosyasi = JSON.parse(dnaMetni);

let toplam = 0, basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++; if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}
const kopya = (x) => JSON.parse(JSON.stringify(x));

// ---- Commit edilen DNA dosyası güncel mi? ----
{
  const { dosya, istatistik } = dnaToplu(sorular, dnaDosyasi, { simdi: "2099-01-01T00:00:00Z" });
  kontrol("C1) repo'daki soru-dna.json güncel: 83/83 cache hit", istatistik.cache_hit === sorular.length, `${istatistik.cache_hit}/${sorular.length} — değilse: node scripts/dna-analyze.mjs`);
  kontrol("C2) idempotent: ikinci çalıştırma bayt bayt aynı dosyayı üretir", dosyaSerilestir(dosya) === dnaMetni);
  kontrol("C3) cache hit'te analyzed_at DEĞİŞMEZ (gereksiz kayıt / diff yok)", dosya.records.q001.analyzed_at === dnaDosyasi.records.q001.analyzed_at);
  kontrol("C4) LLM çağrısı = 0", istatistik.llm_calls === 0);
  kontrol("C5) her kanonik soru için tam 1 DNA kaydı (duplicate yok)", Object.keys(dosya.records).length === sorular.length);
}

// ---- Sürüm artırılmadan motor mantığı değişti mi? ----
// Cache'siz, sıfırdan analiz commit edilen dosyayla (analyzed_at hariç) aynı olmalı.
// Değilse: kural/analyzer değişmiş ama ANALYZER_VERSION / RULE_PACK_VERSION artırılmamış.
{
  const { dosya } = dnaToplu(sorular, null, { simdi: "SABIT" });
  const temizle = (d) => kararliJson(Object.values(d.records).map((k) => ({ ...k, analyzed_at: null })));
  kontrol("C0) sıfırdan analiz = commit edilen DNA (sürüm artırmadan mantık değişmemiş)", temizle(dosya) === temizle(dnaDosyasi));
}

// ---- İçerik hash'i ----
{
  const s = kopya(sorular[0]);
  const h1 = icerikHash(soruNormalize(s));
  kontrol("C6) hash deterministik", h1 === icerikHash(soruNormalize(kopya(sorular[0]))));
  const degisik = kopya(s); degisik.soru_en = s.soru_en.replace("irregularities", "errors");
  kontrol("C7) stem değişince hash değişir", icerikHash(soruNormalize(degisik)) !== h1);
  const sik = kopya(s); sik.dogru_index = (s.dogru_index + 1) % 4;
  kontrol("C8) doğru cevap değişince hash değişir", icerikHash(soruNormalize(sik)) !== h1);
  const kategori = kopya(s); kategori.kategori = "Fen - YÖKDİL Metni";
  kontrol("C9) DNA'yı etkilemeyen alan (kategori) hash'i değiştirmez", icerikHash(soruNormalize(kategori)) === h1);
}

// ---- Geçersiz kılma (invalidation) ----
{
  const onceki = dnaDosyasi.records.q001;
  const r1 = dnaAnalizEt(sorular[0], { onceki, simdi: "2099-01-01T00:00:00Z" });
  kontrol("C10) aynı içerik + aynı sürüm → cache_hit (analiz yapılmaz)", r1.olay === "cache_hit" && r1.kayit === onceki);
  const degisik = kopya(sorular[0]); degisik.soru_en = degisik.soru_en.replace("irregularities", "errors");
  const r2 = dnaAnalizEt(degisik, { onceki, simdi: "2099-01-01T00:00:00Z" });
  kontrol("C11) soru değişti → yeniden analiz (eski DNA kullanılmaz)", r2.olay === "analyzed" && r2.kayit.content_hash !== onceki.content_hash && r2.kayit.analyzed_at === "2099-01-01T00:00:00Z");
  const eskiKural = kopya(onceki); eskiKural.versions.rule = "0.9.0+eskiKural";
  const r3 = dnaAnalizEt(sorular[0], { onceki: eskiKural, simdi: "2099-01-01T00:00:00Z" });
  kontrol("C12) rule_version değişti → yeniden analiz", r3.olay === "analyzed" && r3.kayit.versions.rule === RULE_VERSION);
  const eskiTaks = kopya(onceki); eskiTaks.versions.taxonomy = "2020.01.0";
  kontrol("C13) taxonomy_version değişti → yeniden analiz", dnaAnalizEt(sorular[0], { onceki: eskiTaks, simdi: "x" }).olay === "analyzed");
  const hatali = kopya(onceki); hatali.status = "failed";
  kontrol("C14) 'failed' kayıt cache'lenmez, tekrar denenir", dnaAnalizEt(sorular[0], { onceki: hatali, simdi: "x" }).olay === "analyzed");
  const eskiKayitlar = Object.values(dnaDosyasi.records).filter((k) => k.versions.rule !== SURUMLER.rule);
  kontrol("C15) eski rule_version taşıyan kayıtlar sorgulanabilir (şu an 0)", eskiKayitlar.length === 0, `${eskiKayitlar.length}`);
}

// ---- Human override ----
{
  const onceki = kopya(dnaDosyasi.records.q001);
  onceki.override = { fields: { primary_skill: "clause_vs_noun_phrase" }, by: "ogretmen", at: "2026-10-01", note: "yapı sorusu olarak işaretlendi" };
  const aynı = dnaAnalizEt(sorular[0], { onceki, simdi: "x" });
  kontrol("C16) override'lı kayıt aynı içerikle cache'ten gelir, override korunur", aynı.olay === "cache_hit" && aynı.kayit.override.fields.primary_skill === "clause_vs_noun_phrase");
  onceki.versions.rule = "0.0.1+eski";
  const yeniden = dnaAnalizEt(sorular[0], { onceki, simdi: "x" });
  kontrol("C17) kural güncellenip yeniden analiz edilince override EZİLMEZ, durum human_verified", yeniden.kayit.override.note === "yapı sorusu olarak işaretlendi" && yeniden.kayit.status === "human_verified");
  const e = dnaEtkin(yeniden.kayit);
  kontrol("C18) etkin görünüm: override alanı kazanır, kaynağı 'human'; diğerleri 'rule'", e.primary_skill === "clause_vs_noun_phrase" && e._kaynak.primary_skill === "human" && e._kaynak.signals === "rule");
  const degisik = kopya(sorular[0]); degisik.soru_en = degisik.soru_en.replace("irregularities", "errors");
  const bayat = dnaAnalizEt(degisik, { onceki, simdi: "x" });
  kontrol("C19) soru içeriği değişince override silinmez, kayıt 'stale' olur (inceleme kuyruğu)", bayat.kayit.status === "stale" && bayat.kayit.override !== null);
  kontrol("C20) motor yeni analizde override'a yazmaz (aynı nesne içeriği)", JSON.stringify(bayat.kayit.override) === JSON.stringify(onceki.override));
}

// ---- Deneme anı referansı (attempt snapshot için) ----
{
  const k = dnaDosyasi.records.q001;
  kontrol("C21) dna_ref = soru@hash/analyzer/rule (denemeye tek string olarak yazılabilir)", /^q001@[0-9a-f]{8}\/a[\d.]+\/r.+$/.test(k.dna_ref), k.dna_ref);
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
