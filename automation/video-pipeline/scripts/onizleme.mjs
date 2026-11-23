// ============================================================
// ÖNİZLEME — "3 saniyede çöz" formatında TEK örnek video üretir, HİÇBİR YERE PAYLAŞMAZ.
// Akış: soru seçimi → satırlar → OpenAI TTS → Remotion → kapak. Buffer/Instagram/TikTok/YouTube adımı YOK.
// Format: soru → 3-2-1 → doğru cevap → "Nasıl çözülür?" (sinyal → kural → tuzak) → takip çağrısı.
// Çıktı: out/video.mp4 (+ out/thumbnail.png). İş akışı bunu "reels-onizleme" ön sürümüne koyar.
// ============================================================
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scriptUret } from "./generate-script.mjs";
import { audioUret } from "./generate-audio.mjs";
import { render } from "./render.mjs";
import { kapakGoruntusuUret } from "./generate-thumbnail.mjs";

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(KOK, "out");
const SORULAR = path.join(KOK, "..", "..", "api", "data", "sorular.json");
const HOOK = "3 saniyede çöz: bu sinyali kaçırırsan puan gider.";
const KAPANIS = "Yarın 10:00'da yeni soru. Kaçırmamak için takip et.";

const temizle = (m) => String(m || "").replace(/^\s*tuzak\s*:\s*/i, "").replace(/\s*sinyali\s*$/i, "").trim();
const nokta = (m) => (/[.!?]$/.test(m) ? m : m + ".");
const buyuk = (m) => (m ? m[0].toLocaleUpperCase("tr") + m.slice(1) : m);

export function satirlarUret(soru) {
  const harf = (i) => String.fromCharCode(65 + i);
  const d = soru.dogru_index;
  const tur = temizle(soru.sinyal_ipucu).toLocaleLowerCase("tr");
  const satirlar = [
    HOOK,
    soru.soru_en,
    // Şıklar ekranda yazılı durur, tek tek okunmaz (video kısa kalsın)
    {
      ekran: `${soru.soru_tr}\n\n` + soru.secenekler_tr.map((s, i) => `${harf(i)}) ${s}`).join("\n"),
      ses: `${soru.soru_tr} Şıklara bak, 3 saniyen var! 3... 2... 1!`,
      kucuk: true,
    },
    `Doğru cevap ${harf(d)}: ${soru.secenekler_tr[d]}`,
    `Nasıl çözülür? Önce sinyali bul: ${soru.sinyal}${tur ? `. Bu bir ${tur} sinyali.` : "."}`,
    `Kural: ${nokta(soru.aciklama_tr)}`,
  ];
  if (soru.tuzak) {
    const ipucu = temizle(soru.tuzak_ipucu);
    satirlar.push(`Tuzak: "${soru.tuzak}" ifadesini kaçırma.${ipucu ? " " + buyuk(nokta(ipucu)) : ""}`);
  }
  satirlar.push(KAPANIS);
  return satirlar;
}

const sonuc = await scriptUret();
if (sonuc.atlandi) {
  console.log(`Önizleme atlandı: soru ${sonuc.soruIndex} kalite kontrolünden geçemedi (${sonuc.sebep}).`);
  process.exit(1);
}

// Seçilen sorunun ham verisi (sinyal_ipucu, tuzak, tuzak_ipucu senaryoya taşınmıyor)
const yol = path.join(OUT_DIR, "script.json");
const s = JSON.parse(await readFile(yol, "utf-8"));
const sorular = JSON.parse(await readFile(SORULAR, "utf-8"));
const soru = sorular.find((q) => q.soru_en === s.senaryo.soru_en);
if (!soru) throw new Error("Seçilen soru sorular.json'da bulunamadı");

s.senaryo.hook = HOOK;
s.senaryo.kapanis_tr = KAPANIS;
s.satirlar = satirlarUret(soru);
s.narrasyon = s.satirlar.map((x) => (typeof x === "string" ? x : x.ses)).join(" ... ");
await writeFile(yol, JSON.stringify(s, null, 2), "utf-8");
console.log(`Soru ${soru.id}. Satırlar:\n- ` + s.satirlar.map((x) => (typeof x === "string" ? x : `[ekran] ${x.ekran.replace(/\n/g, " | ")} [ses] ${x.ses}`)).join("\n- "));

// İhsan'ın seçtiği ses (23 Kas 2026, ses örneği 2): Ash, genç ve enerjik eğitmen tonu
process.env.OPENAI_TTS_VOICE ||= "ash";
process.env.OPENAI_TTS_MODEL ||= "gpt-4o-mini-tts";
process.env.OPENAI_TTS_INSTRUCTIONS ||=
  "Türkçe konuş. Genç, enerjik, samimi bir YouTube eğitmeni gibi: sıcak, tok ve canlı bir ses, hızlı tempo, " +
  "vurgulu ve heyecanlı. Öğrenciyi uyandıran, motive eden bir ton. Monoton olma. Akıcı konuş, gereksiz duraklama yapma.";
process.env.TTS_HIZ ||= "1.1";
await audioUret();
await render();
try {
  await kapakGoruntusuUret();
} catch (err) {
  console.error("Kapak üretilemedi (devam):", err.message);
}
console.log("Önizleme hazır: out/video.mp4 — hiçbir yere paylaşılmadı.");
