// ============================================================
// "3 SANİYEDE ÇÖZ" GÜNLÜK VİDEO — tek soru için video üretir (paylaşmaz).
// Format (23 Kas 2026, İhsan onayı): soru → şıklar ekranda yazılı + 3-2-1 → cevap →
// "Nasıl çözülür?" sinyal → kural + tuzak → "Yarın 10:00'da yeni soru, takip et".
// Ses: Ash (gpt-4o-mini-tts) + enerjik eğitmen talimatı (ses örneği 2).
//
// Kullanım: node scripts/cozum-video.mjs --soru q031   → out/video.mp4 (+ out/thumbnail.png)
// Yayına koyma işi automation/reels-yayin/cozum-ekle.mjs'tedir.
// ============================================================
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(KOK, "out");
export const SORULAR = path.join(KOK, "..", "..", "api", "data", "sorular.json");
export const HOOK = "3 saniyede çöz: bu sinyali kaçırırsan puan gider.";
export const KAPANIS = "Yarın 10:00'da yeni soru. Kaçırmamak için takip et.";
export const SES = {
  OPENAI_TTS_VOICE: "ash",
  OPENAI_TTS_MODEL: "gpt-4o-mini-tts",
  OPENAI_TTS_INSTRUCTIONS:
    "Türkçe konuş. Genç, enerjik, samimi bir YouTube eğitmeni gibi: sıcak, tok ve canlı bir ses, hızlı tempo, " +
    "vurgulu ve heyecanlı. Öğrenciyi uyandıran, motive eden bir ton. Monoton olma.",
  TTS_HIZ: "1.1",
};

export const temizle = (m) => String(m || "").replace(/^\s*tuzak\s*:\s*/i, "").replace(/\s*sinyali\s*$/i, "").trim();
const nokta = (m) => (/[.!?]$/.test(m) ? m : m + ".");
export const harf = (i) => String.fromCharCode(65 + i);
export const sinyalTuru = (soru) => temizle(soru.sinyal_ipucu).toLocaleLowerCase("tr");

export function satirlarUret(soru) {
  const d = soru.dogru_index;
  const tur = sinyalTuru(soru);
  const satirlar = [
    HOOK,
    soru.soru_en,
    // Şıklar ekranda yazılı durur, tek tek okunmaz (video kısa kalsın)
    {
      ekran: `${soru.soru_tr}\n\n` + soru.secenekler_tr.map((s, i) => `${harf(i)}) ${s}`).join("\n"),
      ses: `${soru.soru_tr} Şıklara bak, 3 saniyen var! 3... 2... 1!`,
      kucuk: true,
    },
    // Ekranda cevabın tamamı yazar; ses yalnız harfi söyler
    { ekran: `Doğru cevap ${harf(d)}: ${soru.secenekler_tr[d]}`, ses: `Doğru cevap ${harf(d)}!` },
    `Nasıl çözülür? Sinyal: ${soru.sinyal}${tur ? `, yani ${tur}.` : "."}`,
  ];
  // Kural ve tuzak tek satırda
  const ipucu = soru.tuzak ? temizle(soru.tuzak_ipucu) : "";
  satirlar.push(
    `${nokta(soru.aciklama_tr)}` +
      (soru.tuzak ? ` Tuzak: "${soru.tuzak}"${ipucu ? `, ${ipucu.toLocaleLowerCase("tr").replace(/[.!]+$/, "")}` : ""}.` : "")
  );
  satirlar.push(KAPANIS);
  return satirlar;
}

export async function soruBul(id) {
  const sorular = JSON.parse(await readFile(SORULAR, "utf-8"));
  const soru = sorular.find((q) => q.id === id);
  if (!soru) throw new Error(`Soru bulunamadı: ${id}`);
  return soru;
}

// Videoyu üretir: script.json → OpenAI TTS → Remotion → kapak görseli
export async function cozumVideosuUret(soru) {
  const { veriKalitesiSorunu } = await import("./generate-script.mjs");
  const sorun = veriKalitesiSorunu(soru);
  if (sorun) throw new Error(`Soru ${soru.id} kalite kontrolünden geçemedi: ${sorun}`);

  for (const [k, v] of Object.entries(SES)) process.env[k] ||= v;
  const satirlar = satirlarUret(soru);
  const senaryo = {
    hook: HOOK,
    soru_en: soru.soru_en,
    sinyal: soru.sinyal,
    soru_tr: soru.soru_tr,
    secenekler_tr: soru.secenekler_tr,
    dogru_index: soru.dogru_index,
    aciklama_tr: soru.aciklama_tr,
    kapanis_tr: KAPANIS,
    uretimKaynagi: "cozum",
  };
  await mkdir(OUT_DIR, { recursive: true });
  const narrasyon = satirlar.map((x) => (typeof x === "string" ? x : x.ses)).join(" ... ");
  await writeFile(path.join(OUT_DIR, "script.json"), JSON.stringify({ senaryo, satirlar, narrasyon }, null, 2), "utf-8");
  console.log(`Soru ${soru.id}. Satırlar:\n- ` + satirlar.map((x) => (typeof x === "string" ? x : `[ekran] ${x.ekran.replace(/\n/g, " | ")} [ses] ${x.ses}`)).join("\n- "));

  const { audioUret } = await import("./generate-audio.mjs");
  const { render } = await import("./render.mjs");
  await audioUret();
  const video = await render();
  try {
    const { kapakGoruntusuUret } = await import("./generate-thumbnail.mjs");
    await kapakGoruntusuUret();
  } catch (err) {
    console.error("Kapak görseli üretilemedi (devam):", err.message);
  }
  return video;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const a = process.argv.slice(2);
  const id = a[a.indexOf("--soru") + 1];
  if (!a.includes("--soru") || !id) {
    console.error("Kullanım: node scripts/cozum-video.mjs --soru q031");
    process.exit(1);
  }
  const video = await cozumVideosuUret(await soruBul(id));
  console.log("Video hazır:", video);
}
