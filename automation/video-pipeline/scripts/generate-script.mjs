// ============================================================
// ADIM 1 — sinyal-avcisi.com'daki gerçek Sinyal Lab soru havuzundan
// (data/sorular.json, bkz. scripts/extract-sorular.mjs) günün sorusunu
// seçip video senaryosunu oluşturur.
// ============================================================
// Uydurma bir soru üretmek yerine sitedeki gerçek YDS/YÖKDİL içeriğini
// kullanıyoruz — hook ve kapanış cümlesi dışındaki her şey (soru, şıklar,
// doğru cevap, açıklama) birebir site verisinden gelir.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "out");
const SORULAR_PATH = path.join(__dirname, "..", "data", "sorular.json");

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

function gununSorusunuSec(sorular) {
  return sorular[gunSayisi() % sorular.length];
}

function sabloniSec(sablonlar, offset) {
  return sablonlar[(gunSayisi() + offset) % sablonlar.length];
}

async function scriptOlustur() {
  const sorular = JSON.parse(await readFile(SORULAR_PATH, "utf-8"));
  const soru = gununSorusunuSec(sorular);

  return {
    hook: sabloniSec(HOOK_SABLONLARI, 7),
    soru_en: soru.soru_en,
    sinyal: soru.sinyal,
    soru_tr: soru.soru_tr,
    secenekler_tr: soru.secenekler_tr,
    dogru_index: soru.dogru_index,
    aciklama_tr: soru.aciklama_tr,
    kapanis_tr: sabloniSec(KAPANIS_SABLONLARI, 13),
  };
}

function narrasyonVeAltyaziSatirlariUret(senaryo) {
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
