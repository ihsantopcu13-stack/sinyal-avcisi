// ============================================================
// ADIM 1 — sinyal-avcisi.com'daki gerçek Sinyal Lab soru havuzundan
// (data/sorular.json, bkz. scripts/extract-sorular.mjs) günün sorusunu
// seçip video senaryosunu oluşturur.
// ============================================================
// Uydurma bir soru üretmek yerine sitedeki gerçek YDS/YÖKDİL içeriğini
// kullanıyoruz — hook ve kapanış cümlesi dışındaki her şey (soru, şıklar,
// doğru cevap, açıklama) birebir site verisinden gelir.
//
// AVCI ÖĞRETİM KATMANI (opsiyonel, feature-flag'li — bkz. AVCI_OGRETIM_KATMANI
// ortam değişkeni, varsayılan KAPALI): flag açıkken, orta bölüm (hook ve
// kapanış HARİÇ) avci-ogretim-katmani.mjs ile AI destekli, adım adım bir
// öğretim senaryosuna dönüştürülmeye çalışılır. AI'nın ürettiği içerik
// şüpheliyse (needs_review) VEYA flag kapalıysa, bu fonksiyon SESSİZCE
// DEĞİL AÇIKÇA LOGLANARAK, aşağıdaki sabloniSenaryoUret() ile üretilen
// (bugünkü, değişmemiş) şablon içeriğine döner — iki içerik ASLA
// harmanlanmaz, biri ya da diğeri kullanılır (bkz. scriptOlustur).

import { readFile, writeFile, mkdir, appendFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { avciOgretimUret } from "./avci-ogretim-katmani.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "out");
const DATA_DIR = path.join(__dirname, "..", "data");
const SORULAR_PATH = path.join(DATA_DIR, "sorular.json");
const NEEDS_REVIEW_LOG_PATH = path.join(DATA_DIR, "needs-review-log.json");

const HOOK_SABLONLARI = [
  "Bu cümlede herkes aynı hataya düşüyor, sen de düşecek misin?",
  "ÖSYM bu tuzağı sevdiği için tekrar tekrar soruyor.",
  "3 saniyede çöz: bu sinyali kaçırırsan puan gider.",
  "Bu tuzağa düşenlerin çoğu sınavda bunu görmüştü.",
  "Sinyal kelimeyi bulursan cevap kendini gösteriyor.",
  "YDS/YÖKDİL'de en çok kaybettiren tuzaklardan biri bu.",
];

const KAPANIS_SABLONLARI = [
  "Bu tuzaklardan kurtulmak için sinyal-avcisi.com'a ücretsiz katıl.",
  "Daha fazla sinyal için sinyal-avcisi.com'u ücretsiz keşfet.",
  "sinyal-avcisi.com'da ücretsiz pratik yapmaya hemen başla.",
  "Sinyalleri öğrenmek tamamen ücretsiz: sinyal-avcisi.com.",
  "Bunun gibi yüzlerce soru sinyal-avcisi.com'da ücretsiz seni bekliyor.",
];

// Bir önceki gün ile aynı soru/hook/kapanışın tekrar etmemesi için gün
// sayısına göre deterministik ama birbirinden bağımsız (farklı offsetli)
// indeksler seçiyoruz — ekstra bir durum/dosya takibi gerekmeden.
function gunSayisi() {
  return Math.floor(Date.now() / 86_400_000);
}

function gununSoruIndeksi(sorularUzunluk) {
  return gunSayisi() % sorularUzunluk;
}

function sabloniSec(sablonlar, offset) {
  return sablonlar[(gunSayisi() + offset) % sablonlar.length];
}

// Bugünkü (değişmemiş) davranış: hook + soru/şıklar/cevap/açıklama +
// kapanış, tamamı şablon/direkt veri, AI yok. AVCI katmanı devre dışıysa
// veya needs_review dönerse SENARYONUN TAMAMI bu fonksiyondan gelir.
function sabloniSenaryoUret(soru, hook, kapanisTr) {
  return {
    hook,
    soru_en: soru.soru_en,
    sinyal: soru.sinyal,
    soru_tr: soru.soru_tr,
    secenekler_tr: soru.secenekler_tr,
    dogru_index: soru.dogru_index,
    aciklama_tr: soru.aciklama_tr,
    kapanis_tr: kapanisTr,
  };
}

async function needsReviewLogYaz(soruIndex, soru, sebep) {
  let kayitlar = [];
  try {
    kayitlar = JSON.parse(await readFile(NEEDS_REVIEW_LOG_PATH, "utf-8"));
    if (!Array.isArray(kayitlar)) kayitlar = [];
  } catch {
    kayitlar = [];
  }
  kayitlar.push({
    tarih: new Date().toISOString(),
    soruIndex,
    soruEn: soru.soru_en,
    sinyal: soru.sinyal,
    sebep,
  });
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(NEEDS_REVIEW_LOG_PATH, JSON.stringify(kayitlar, null, 2), "utf-8");
}

// Her pipeline çalışmasında AVCI katmanının durumunu görünür şekilde
// raporlar — hem konsola hem (varsa) GitHub Actions job summary'sine.
// Amaç: fallback'lerin haftalarca fark edilmeden sessizce çalışmaması.
async function ozetYazdir({ soruIndex, uretimKaynagi, sebep }) {
  const durum = uretimKaynagi === "avci" ? "OK" : "FALLBACK";
  const satirlar = [
    `AVCI: ${durum}`,
    `Soru ID: ${soruIndex}`,
    `Sebep: ${sebep ?? (durum === "OK" ? "-" : "flag_kapali")}`,
    `Üretim kaynağı: ${uretimKaynagi === "avci" ? "AVCI" : "ŞABLON"}`,
  ];
  console.log("\n=== AVCI ÖZET ===\n" + satirlar.join("\n") + "\n");

  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (summaryPath) {
    const markdown = `\n### AVCI Öğretim Katmanı Özeti\n\n| Alan | Değer |\n|---|---|\n${satirlar
      .map((s) => {
        const [k, ...v] = s.split(":");
        return `| ${k.trim()} | ${v.join(":").trim()} |`;
      })
      .join("\n")}\n`;
    try {
      await appendFile(summaryPath, markdown, "utf-8");
    } catch (err) {
      console.error("GITHUB_STEP_SUMMARY yazılamadı (devam ediliyor):", err.message);
    }
  }
}

async function scriptOlustur() {
  const sorular = JSON.parse(await readFile(SORULAR_PATH, "utf-8"));
  const soruIndex = gununSoruIndeksi(sorular.length);
  const soru = sorular[soruIndex];
  const hook = sabloniSec(HOOK_SABLONLARI, 7);
  const kapanisTr = sabloniSec(KAPANIS_SABLONLARI, 13);

  const sablonSenaryo = sabloniSenaryoUret(soru, hook, kapanisTr);

  // Flag kapalıyken davranış bugünküyle BYTE-BYTE aynı kalmalı.
  if (process.env.AVCI_OGRETIM_KATMANI !== "on") {
    const senaryo = { ...sablonSenaryo, uretimKaynagi: "sablon" };
    await ozetYazdir({ soruIndex, uretimKaynagi: "sablon", sebep: "flag_kapali" });
    return senaryo;
  }

  let avciSonuc;
  try {
    avciSonuc = await avciOgretimUret(soru);
  } catch (err) {
    avciSonuc = { status: "needs_review", sebep: `beklenmeyen_hata: ${err.message}` };
  }

  if (avciSonuc.status !== "ok") {
    await needsReviewLogYaz(soruIndex, soru, avciSonuc.sebep);
    await ozetYazdir({ soruIndex, uretimKaynagi: "sablon", sebep: avciSonuc.sebep });
    // Şüpheli/eksik AVCI içeriği HİÇBİR ZAMAN buradan aşağı geçmiyor —
    // sadece log dosyasına yazıldı, senaryoya hiç karışmıyor.
    return { ...sablonSenaryo, uretimKaynagi: "sablon" };
  }

  await ozetYazdir({ soruIndex, uretimKaynagi: "avci" });
  return {
    ...sablonSenaryo, // hook/soru_en/secenekler_tr/dogru_index/aciklama_tr/kapanis_tr — indirici tüketiciler için değişmeden kalır
    uretimKaynagi: "avci",
    kaynak: avciSonuc.kaynak,
    ogretim: { adimlar: avciSonuc.adimlar },
    avciKullanim: avciSonuc.kullanim ?? null, // sadece raporlama amaçlı, render/yayın bunu okumuyor
  };
}

function narrasyonVeAltyaziSatirlariUret(senaryo) {
  if (senaryo.uretimKaynagi === "avci" && senaryo.ogretim?.adimlar?.length) {
    return [senaryo.hook, ...senaryo.ogretim.adimlar.map((a) => a.metin), senaryo.kapanis_tr].filter(Boolean);
  }

  // Bugünkü (değişmemiş) şablon davranışı.
  const dogruHarf = ["A", "B", "C", "D"][senaryo.dogru_index] || "A";
  const dogruMetni = senaryo.secenekler_tr[senaryo.dogru_index] || "";
  const secenekSatirlari = senaryo.secenekler_tr.map(
    (s, i) => `${["A", "B", "C", "D"][i]}) ${s}`
  );

  return [
    senaryo.hook,
    `İngilizce metin: ${senaryo.soru_en}`,
    senaryo.soru_tr,
    ...secenekSatirlari,
    senaryo.sinyal ? `Sinyal kelime: ${senaryo.sinyal}.` : null,
    senaryo.aciklama_tr,
    `Doğru cevap ${dogruHarf}: ${dogruMetni}`,
    senaryo.kapanis_tr,
  ].filter(Boolean);
}

export async function scriptUret() {
  const senaryo = await scriptOlustur();
  const satirlar = narrasyonVeAltyaziSatirlariUret(senaryo);
  const cikti = { senaryo, satirlar, narrasyon: satirlar.join(" ... ") };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, "script.json"), JSON.stringify(cikti, null, 2), "utf-8");

  return cikti;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  scriptUret()
    .then((cikti) => console.log("script.json yazıldı:\n", JSON.stringify(cikti, null, 2)))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
