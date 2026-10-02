// ============================================================
// FAZ 1 CI TESTİ — GitHub Actions runner üzerinde çalışır.
// ============================================================
// KURALLAR (bilerek):
// - Gerçek ağ çağrısı YAPILMAZ. Anthropic'e gidecek her yol
//   globalThis.fetch stub'lanarak yakalanır; whitelist-dışı test
//   ise fetch'in hiç çağrılmadığını doğrudan doğrular.
// - Gerçek secret İSTENMEZ/OKUNMAZ. Aşağıdaki ANTHROPIC_API_KEY
//   değeri GERÇEK BİR ANAHTAR DEĞİLDİR — sadece
//   avci-ogretim-katmani.mjs'in "apiKey yok" erken-çıkışını aşıp
//   stub'lanmış fetch'e ulaşması için gereken sahte bir metin.
// - Hiçbir yayın/publish/render/TTS/upload çağrılmaz.
// - Deterministiktir: gün rotasyonuna bağlı testler (flag-off
//   regresyonu hariç) hep aynı, elle kurulmuş soru objeleriyle
//   çalışır — hangi gün çalıştırılırsa çalıştırılsın sonuç aynıdır.
// - Başarısızlıkta process.exit(1) verir.

import { readFile } from "node:fs/promises";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, ".."); // automation/video-pipeline

process.env.ANTHROPIC_API_KEY = "test-fixture-not-a-real-key";

let toplamTest = 0;
let basarisizTest = 0;

function kontrol(ad, sonuc, detay) {
  toplamTest++;
  if (!sonuc) basarisizTest++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const generateScriptMod = await import(pathToFileURL(path.join(ROOT, "scripts", "generate-script.mjs")).href);
const avciMod = await import(pathToFileURL(path.join(ROOT, "scripts", "avci-ogretim-katmani.mjs")).href);
const sinyalKurallariMod = await import(pathToFileURL(path.join(ROOT, "data", "sinyal-kurallari.mjs")).href);
// SOURCE OF TRUTH AŞAMA 5: tek canonical kaynak — pipeline'ın gerçekte
// okuduğu dosyayla aynı (bkz. generate-script.mjs SORULAR_PATH).
const CANONICAL_SORULAR_PATH = path.join(ROOT, "..", "..", "api", "data", "sorular.json");
const sorular = JSON.parse(await readFile(CANONICAL_SORULAR_PATH, "utf-8"));

function fixtureOk(harf, adimlar) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ content: [{ type: "tool_use", input: { dogru_sik_harfi: harf, adimlar } }] }),
  };
}

const ADIMLAR_TEMEL = [
  { adim: "GÖR", metin: "Test adımı." },
  { adim: "SİNYALİ_YAKALA", metin: "Test adımı." },
  { adim: "ŞIK_ELE", metin: "Test adımı." },
  { adim: "KISA_KURAL", metin: "(AI taslağı, ezilecek)" },
];

const soruDespite = {
  soru_en: "The appellate court ruled that, despite the irregularities, the verdict was by no means invalid.",
  sinyal: "despite",
  soru_tr: "test",
  secenekler_tr: ["a", "dogru şık", "c", "d"],
  dogru_index: 1,
  aciklama_tr: "test-aciklama-despite-source-of-truth",
};

const soruAnythingBut = {
  soru_en: "The policy was anything but neutral; it disproportionately affected marginalized communities.",
  sinyal: "anything but",
  soru_tr: "test",
  secenekler_tr: ["a", "dogru şık", "c", "d"],
  dogru_index: 1,
  aciklama_tr: "test-aciklama-anything-but",
};

const soruNonetheless = {
  soru_en: "The satellite's trajectory deviated only slightly from the projected path, a fact that nonetheless required immediate correction.",
  sinyal: "nonetheless",
  soru_tr: "test",
  secenekler_tr: ["a", "dogru şık", "c", "d"],
  dogru_index: 1,
  aciklama_tr: "test-aciklama-nonetheless",
};

// ---- 1) 83 soru veri kalite taraması (banka 59 → 83'e genişledi, commit e4acff0) ----
{
  const sorunlu = sorular.filter((s) => generateScriptMod.veriKalitesiSorunu(s));
  kontrol(
    "1) 83 soru veri kalite taraması (0 sorunlu bekleniyor)",
    sorular.length === 83 && sorunlu.length === 0,
    `toplam=${sorular.length} sorunlu=${sorunlu.length}`
  );
}

// ---- 2) 83 sinyalli / 0 null (eski 5 null sinyal 5d79a5e ile dolduruldu) ----
{
  const sinyalli = sorular.filter((s) => (s.sinyal || "").trim()).length;
  const nullSinyal = sorular.length - sinyalli;
  kontrol("2) sinyalli/null soru sayısı (83/0 bekleniyor)", sinyalli === 83 && nullSinyal === 0, `sinyalli=${sinyalli} null=${nullSinyal}`);
}

// ---- 3) 83/83 whitelist kapsamı ----
{
  let destekli = 0;
  let disi = 0;
  sorular.forEach((s) => {
    const key = (s.sinyal || "").trim().toLowerCase();
    if (!key) return;
    if (sinyalKurallariMod.SINYAL_KURALLARI[key]) destekli++;
    else disi++;
  });
  // 2026-09-23: q060-q083 sinyalleri (hardly, had, either, as far as, so that, in order to, instead of, by no means, far from) onaylanıp eklendi.
  kontrol("3) whitelist kapsamı (83/83 bekleniyor, 0 dışı)", destekli === 83 && disi === 0, `destekli=${destekli} disi=${disi}`);
}

// ---- 4) Flag OFF regresyon (gerçek scriptUret, gün rotasyonundan bağımsız iddialar) ----
{
  delete process.env.AVCI_OGRETIM_KATMANI;
  const cikti = await generateScriptMod.scriptUret();
  const s = cikti.senaryo;
  const ok =
    !cikti.atlandi &&
    s.uretimKaynagi === "sablon" &&
    cikti.satirlar[0] === s.hook &&
    cikti.satirlar[cikti.satirlar.length - 1] === s.kapanis_tr &&
    cikti.satirlar.length >= 8;
  kontrol("4) Flag OFF regresyon (şablon, atlandi yok)", ok, `uretimKaynagi=${s?.uretimKaynagi} satirlar=${cikti.satirlar?.length}`);
}

// ---- 5) Flag ON stub success ----
{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => fixtureOk("B", ADIMLAR_TEMEL);
  const sonuc = await avciMod.avciOgretimUret(soruDespite);
  globalThis.fetch = originalFetch;
  kontrol("5) Flag ON stub success (status ok)", sonuc.status === "ok", sonuc.status);
}

// ---- 6) yanlış cevap harfi -> needs_review ----
{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => fixtureOk("A", ADIMLAR_TEMEL); // gerçek doğru harf B
  const sonuc = await avciMod.avciOgretimUret(soruDespite);
  globalThis.fetch = originalFetch;
  kontrol(
    "6) yanlış cevap harfi -> needs_review",
    sonuc.status === "needs_review" && sonuc.sebep.startsWith("cevap_harfi_uyumsuz"),
    sonuc.sebep
  );
}

// ---- 7) bozuk/beklenmeyen AI yanıtı -> needs_review ----
{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: "beklenmedik serbest metin" }] }) });
  const sonuc = await avciMod.avciOgretimUret(soruDespite);
  globalThis.fetch = originalFetch;
  kontrol("7) bozuk AI yanıtı -> needs_review", sonuc.status === "needs_review" && sonuc.sebep === "model_semaya_uymadi", sonuc.sebep);
}

// ---- 8) whitelist dışı/null sinyal -> needs_review (fetch hiç çağrılmamalı) ----
{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("fetch ÇAĞRILMAMALIYDI — whitelist kapısı önce kontrol etmeli");
  };
  const soruDestekliOlmayan = { ...soruDespite, sinyal: "xyz-whitelist-disi-test" };
  const sonuc = await avciMod.avciOgretimUret(soruDestekliOlmayan);
  globalThis.fetch = originalFetch;
  kontrol(
    "8) whitelist dışı sinyal -> needs_review (network hiç çağrılmadı)",
    sonuc.status === "needs_review" && sonuc.sebep.startsWith("whitelist_disi_sinyal"),
    sonuc.sebep
  );
}

// ---- 9) bozuk kaynak veri -> ATLANDI tetikleyicisi ----
{
  const bozukSoru = { ...soruDespite, aciklama_tr: "" };
  const sorun = generateScriptMod.veriKalitesiSorunu(bozukSoru);
  kontrol("9) bozuk kaynak veri tespiti (ATLANDI tetikleyici)", sorun === "bos_aciklama_tr", String(sorun));
}

// ---- 10) despite (yapısal) -> YAPIYI_KONTROL_ET VAR ----
{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => fixtureOk("B", ADIMLAR_TEMEL);
  const sonuc = await avciMod.avciOgretimUret(soruDespite);
  globalThis.fetch = originalFetch;
  const yapiVar = sonuc.adimlar?.some((a) => a.adim === "YAPIYI_KONTROL_ET");
  kontrol("10) despite -> YAPIYI_KONTROL_ET VAR", sonuc.status === "ok" && yapiVar === true);
}

// ---- 11) anything but (idiom) -> YAPIYI_KONTROL_ET YOK ----
{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => fixtureOk("B", ADIMLAR_TEMEL);
  const sonuc = await avciMod.avciOgretimUret(soruAnythingBut);
  globalThis.fetch = originalFetch;
  const yapiVar = sonuc.adimlar?.some((a) => a.adim === "YAPIYI_KONTROL_ET");
  kontrol("11) anything but -> YAPIYI_KONTROL_ET YOK", sonuc.status === "ok" && yapiVar === false);
}

// ---- 12) nonetheless (bağlayıcı) -> YAPIYI_KONTROL_ET YOK ----
{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => fixtureOk("B", ADIMLAR_TEMEL);
  const sonuc = await avciMod.avciOgretimUret(soruNonetheless);
  globalThis.fetch = originalFetch;
  const yapiVar = sonuc.adimlar?.some((a) => a.adim === "YAPIYI_KONTROL_ET");
  kontrol("12) nonetheless -> YAPIYI_KONTROL_ET YOK", sonuc.status === "ok" && yapiVar === false);
}

// ---- 13) KISA_KURAL source-of-truth ile eziliyor ----
{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => fixtureOk("B", ADIMLAR_TEMEL);
  const sonuc = await avciMod.avciOgretimUret(soruDespite);
  globalThis.fetch = originalFetch;
  const kisaKural = sonuc.adimlar?.find((a) => a.adim === "KISA_KURAL");
  const ezildi = Boolean(kisaKural) && kisaKural.metin.includes(soruDespite.aciklama_tr) && !kisaKural.metin.includes("(AI taslağı");
  kontrol("13) KISA_KURAL source-of-truth ile ezildi (AI taslağı silindi)", ezildi, kisaKural?.metin);
}

console.log(`\nTOPLAM: ${toplamTest} test, ${basarisizTest} başarısız.`);
if (basarisizTest > 0) {
  process.exit(1);
}
