// ============================================================
// 13:30 "SİNYAL KELİME" VİDEOSU — sitedeki sinyal sorularından (assets/data/sinyal-sorular.json)
// tek video üretir, HİÇBİR YERE PAYLAŞMAZ. Ses ve görünüm 10:00 çözüm videosuyla aynı.
// Akış: açılış → boşluklu cümle + A–E şıklar + 3-2-1 → cevap → sinyal kelimeler → kural → tuzak → takip çağrısı.
// Kullanım: node scripts/sinyal-video.mjs --soru ss001  → out/video.mp4
// ============================================================
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SES, harf } from "./cozum-video.mjs";

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(KOK, "out");
export const SINYAL_SORULAR = path.join(KOK, "..", "..", "assets", "data", "sinyal-sorular.json");
export const HOOK = "YDS'ye çalışıyorsan bunu 3 saniyede bil.";
export const KAPANIS = "Cevabını yoruma yaz. Yarın 13:30'da yeni sinyal, takip et.";

const ilkCumle = (m) => {
  const t = String(m || "").replace(/^\s*(kural|tuzak)\s*:\s*/i, "").trim();
  const c = t.match(/^.*?[.!?](\s|$)/);
  return (c ? c[0] : t).trim();
};
const ikiCumle = (m) => {
  const t = String(m || "").trim();
  const c = t.match(/^(.*?[.!?])(\s+.*?[.!?])?(\s|$)/);
  return (c ? c[1] + (c[2] || "") : t).trim();
};
const TUR = { zitlik: "zıtlık", sebep: "sebep", sonuc: "sonuç", zaman: "zaman", kosul: "koşul", amac: "amaç", ekleme: "ekleme" };

export function satirlarUret(s) {
  const d = s.correctAnswer;
  const tur = TUR[s.mainSignal?.type] || s.mainSignal?.type || "";
  const ipuclari = (s.signalWords || []).map((w) => `"${w.word}"`).join(" ve ");
  const tuzak = ikiCumle(s.trap);
  return [
    HOOK,
    {
      ekran: `${s.questionText}\n\n` + s.options.map((o, i) => `${harf(i)}) ${o}`).join("\n"),
      ses: "Boşluğa hangisi gelir? Şıklara bak, 3 saniyen var! 3... 2... 1!",
      kucuk: true,
    },
    { ekran: `Doğru cevap ${harf(d)}: ${s.options[d]}`, ses: `Doğru cevap ${harf(d)}, ${s.options[d]}!` },
    `Sinyal kelimeler: ${ipuclari}${tur ? `. Bu bir ${tur} sinyali.` : "."}`,
    `Kural: ${ilkCumle(s.explanation)}`,
    ...(tuzak ? [`Tuzak: ${tuzak}`] : []),
    KAPANIS,
  ];
}

export async function sinyalVideosuUret(s) {
  if (!s.questionText || !Array.isArray(s.options) || s.options.length !== 5) throw new Error(`Soru ${s.id}: 5 şık yok`);
  for (const [k, v] of Object.entries(SES)) process.env[k] ||= v;
  const satirlar = satirlarUret(s);
  const senaryo = { hook: HOOK, sinyal: s.mainSignal?.word, soru_en: s.questionText, kapanis_tr: KAPANIS, uretimKaynagi: "sinyal" };
  await mkdir(OUT_DIR, { recursive: true });
  const narrasyon = satirlar.map((x) => (typeof x === "string" ? x : x.ses)).join(" ... ");
  await writeFile(path.join(OUT_DIR, "script.json"), JSON.stringify({ senaryo, satirlar, narrasyon }, null, 2), "utf-8");
  console.log(`Soru ${s.id}. Satırlar:\n- ` + satirlar.map((x) => (typeof x === "string" ? x : `[ekran] ${x.ekran.replace(/\n/g, " | ")} [ses] ${x.ses}`)).join("\n- "));
  const { audioUret } = await import("./generate-audio.mjs");
  const { render } = await import("./render.mjs");
  await audioUret();
  return render();
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const a = process.argv.slice(2);
  const id = a.includes("--soru") ? a[a.indexOf("--soru") + 1] : "ss001";
  const sorular = JSON.parse(await readFile(SINYAL_SORULAR, "utf-8"));
  const s = sorular.find((q) => q.id === id);
  if (!s) throw new Error(`Soru bulunamadı: ${id}`);
  console.log("Video hazır:", await sinyalVideosuUret(s));
}
