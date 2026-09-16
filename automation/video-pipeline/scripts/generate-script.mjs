// ============================================================
// ADIM 1 — canonical soru bankasından (api/data/sorular.json, TEK
// source-of-truth — bkz. scripts/sl-havuz-generator.mjs) günün sorusunu
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
// SOURCE OF TRUTH AŞAMA 5: tek canonical kaynak — automation/video-pipeline/
// data/sorular.json artık kullanılmıyor (bkz. AŞAMA 8'de kaldırılacak).
const SORULAR_PATH = path.join(__dirname, "..", "..", "..", "api", "data", "sorular.json");
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

// Rotasyon fiziksel array sırasına değil, stable id'ye (q001..q059) göre
// sıralanmış bir kopyaya göre yapılır — dataset'e yeni soru eklenmesi/
// sırasının değişmesi mevcut günlerin hangi soruyu gördüğünü kaydırmaz.
export function sorularStableSirali(sorular) {
  return [...sorular].sort((a, b) => (a.id || "").localeCompare(b.id || ""));
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

// VERİ KALİTE KAPISI — AVCI/şablon ayrımından ÖNCE, ikisinin de ortak
// girişinde çalışır. Amaç: kaynak sorunun KENDİSİ bozuksa (boş alan,
// geçersiz dogru_index, bozuk karakter...) ne AVCI ne de "güvenli"
// şablon yolu bu bozuk veriyi yayınlamasın — şablon yolu da aynı ham
// alanları (soru_tr, secenekler_tr, aciklama_tr) kullandığı için AVCI
// hatalarına karşı olan fallback, kaynak veri hatasına karşı koruma
// SAĞLAMAZ. Bu yüzden bu kontrol ayrı ve her ikisinden önce gelir.
// Dönüş: sorun yoksa null, varsa insan-okunur bir sebep string'i.
export function veriKalitesiSorunu(soru) {
  if (!soru) return "soru_bulunamadi";

  const metinAlanlari = [soru.soru_en, soru.soru_tr, soru.aciklama_tr, soru.sinyal, ...(soru.secenekler_tr ?? [])];
  if (metinAlanlari.some((a) => typeof a === "string" && a.includes("�"))) {
    return "bozuk_karakter (U+FFFD)";
  }
  if (!soru.soru_en || !soru.soru_en.trim()) return "bos_soru_en";
  if (!soru.soru_tr || !soru.soru_tr.trim()) return "bos_soru_tr";
  if (!soru.aciklama_tr || !soru.aciklama_tr.trim()) return "bos_aciklama_tr";
  if (!Array.isArray(soru.secenekler_tr)) return "secenekler_tr_yok";
  if (soru.secenekler_tr.length !== 4) return `secenekler_tr_4_eleman_degil (${soru.secenekler_tr.length})`;
  if (soru.secenekler_tr.some((s) => typeof s !== "string" || !s.trim())) return "bos_secenek";
  if (!Number.isInteger(soru.dogru_index) || soru.dogru_index < 0 || soru.dogru_index > 3) {
    return `gecersiz_dogru_index (${soru.dogru_index})`;
  }
  if (!soru.secenekler_tr[soru.dogru_index] || !soru.secenekler_tr[soru.dogru_index].trim()) {
    return "dogru_secenek_bulunamiyor";
  }
  // NOT: eksik/boş sinyal burada bloke edilmiyor. Şablon yolu sinyal
  // olmadan da güvenle çalışıyor (narrasyonVeAltyaziSatirlariUret'te
  // opsiyonel bir satır, hiç kırılmıyor) — bu yüzden "eksik sinyal" bir
  // KAYNAK VERİ BOZUKLUĞU değil, sadece AVCI'nin whitelist kapısının
  // (avci-ogretim-katmani.mjs) kendi needs_review sebebi. Bunu burada da
  // bloke etmek, flag KAPALIYKEN bile önceden sorunsuz yayınlanan
  // sinyal'siz sorularda YENİ bir ATLANDI regresyonu yaratıyordu — test
  // sırasında yakalanıp düzeltildi (bkz. FAZ1 nihai rapor, Test F).

  return null;
}

async function needsReviewLogYaz(soruIndex, soru, sebep, tur = "needs_review") {
  let kayitlar = [];
  try {
    kayitlar = JSON.parse(await readFile(NEEDS_REVIEW_LOG_PATH, "utf-8"));
    if (!Array.isArray(kayitlar)) kayitlar = [];
  } catch {
    kayitlar = [];
  }
  kayitlar.push({
    tarih: new Date().toISOString(),
    tur, // 'needs_review' (AVCI şüpheli) | 'veri_kalitesi' (kaynak veri bozuk, ATLANDI)
    soruIndex,
    soruEn: soru?.soru_en,
    sinyal: soru?.sinyal,
    sebep,
  });
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(NEEDS_REVIEW_LOG_PATH, JSON.stringify(kayitlar, null, 2), "utf-8");
}

// Her pipeline çalışmasında AVCI katmanının durumunu görünür şekilde
// raporlar — hem konsola hem (varsa) GitHub Actions job summary'sine.
// Amaç: fallback'lerin/skip'lerin haftalarca fark edilmeden sessizce
// çalışmaması. durum: 'avci' | 'sablon' | 'atlandi'.
async function ozetYazdir({ soruIndex, durum, sebep }) {
  const etiket = durum === "avci" ? "OK" : durum === "atlandi" ? "SKIP" : "FALLBACK";
  const uretimKaynagiEtiket = durum === "avci" ? "AVCI" : durum === "atlandi" ? "YOK" : "ŞABLON";
  const satirlar = [
    `AVCI: ${etiket}`,
    `Soru ID: ${soruIndex}`,
    `Sebep: ${sebep ?? (durum === "avci" ? "-" : "flag_kapali")}`,
    `Üretim kaynağı: ${uretimKaynagiEtiket}`,
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
  const sorularHam = JSON.parse(await readFile(SORULAR_PATH, "utf-8"));
  const sorular = sorularStableSirali(sorularHam);
  const soruIndex = gununSoruIndeksi(sorular.length);
  const soru = sorular[soruIndex];
  const soruId = soru?.id ?? soruIndex;

  // VERİ KALİTE KAPISI — AVCI/şablon ayrımından ÖNCE. Kaynak veri
  // bozuksa NE AVCI NE ŞABLON çalışır: ATLANDI. (bkz. veriKalitesiSorunu)
  const veriSorunu = veriKalitesiSorunu(soru);
  if (veriSorunu) {
    await needsReviewLogYaz(soruId, soru, veriSorunu, "veri_kalitesi");
    await ozetYazdir({ soruIndex: soruId, durum: "atlandi", sebep: veriSorunu });
    return { atlandi: true, soruIndex: soruId, sebep: veriSorunu };
  }

  const hook = sabloniSec(HOOK_SABLONLARI, 7);
  const kapanisTr = sabloniSec(KAPANIS_SABLONLARI, 13);
  const sablonSenaryo = sabloniSenaryoUret(soru, hook, kapanisTr);

  // Flag kapalıyken davranış bugünküyle BYTE-BYTE aynı kalmalı.
  if (process.env.AVCI_OGRETIM_KATMANI !== "on") {
    const senaryo = { ...sablonSenaryo, uretimKaynagi: "sablon" };
    await ozetYazdir({ soruIndex: soruId, durum: "sablon", sebep: "flag_kapali" });
    return senaryo;
  }

  let avciSonuc;
  try {
    avciSonuc = await avciOgretimUret(soru);
  } catch (err) {
    avciSonuc = { status: "needs_review", sebep: `beklenmeyen_hata: ${err.message}` };
  }

  if (avciSonuc.status !== "ok") {
    await needsReviewLogYaz(soruId, soru, avciSonuc.sebep, "needs_review");
    await ozetYazdir({ soruIndex: soruId, durum: "sablon", sebep: avciSonuc.sebep });
    // Şüpheli/eksik AVCI içeriği HİÇBİR ZAMAN buradan aşağı geçmiyor —
    // sadece log dosyasına yazıldı, senaryoya hiç karışmıyor.
    return { ...sablonSenaryo, uretimKaynagi: "sablon" };
  }

  await ozetYazdir({ soruIndex: soruId, durum: "avci" });
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
  const sonuc = await scriptOlustur();

  // ATLANDI — kaynak veri kalite kontrolünden geçemedi. script.json bile
  // YAZILMIYOR (out/ klasöründe eski/bayat bir dosya varsa onunla devam
  // edilmesin) — çağıran taraf (run-pipeline.mjs) bunu kontrol edip
  // audio/render/upload adımlarını hiç çalıştırmamalı.
  if (sonuc.atlandi) {
    return { atlandi: true, soruIndex: sonuc.soruIndex, sebep: sonuc.sebep };
  }

  const senaryo = sonuc;
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
