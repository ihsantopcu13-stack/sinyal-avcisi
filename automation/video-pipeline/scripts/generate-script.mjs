// ============================================================
// ADIM 1 — Claude API: Sinyal Avcısı odaklı YDS/YÖKDİL video senaryosu
// ============================================================
// _instagram-content.mjs'teki prefill (JSON garantili çıktı) tekniğiyle
// aynı deseni kullanır. Çıktı out/script.json'a yazılır.

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "out");

const SISTEM_PROMPT = `Sen Sinyal Avcısı platformunun kısa video (YouTube Shorts / Instagram Reels) senaryo yazarısın. YDS/YÖKDİL formatında, ÖSYM tarzı ORİJİNAL bir boşluk doldurma sorusu etrafında 25-35 saniyelik bir video senaryosu üret.

KURALLAR:
- "hook" izleyiciyi ilk 2 saniyede durduracak, merak uyandıran Türkçe bir açılış cümlesi olsun (max 10 kelime).
- "soru_en" cümlesi B2-C1 seviyesinde akademik İngilizce olsun, boşluk yerine "___" kullan.
- "sinyal" mutlaka şunlardan biri olsun: despite/although/however/whereas/because/therefore/unless/provided that/must have/should have.
- 4 şık üret, sadece biri doğru, diğerleri yapısal olarak yanlış (gramer tuzağı).
- "aciklama_tr" sinyal kelimenin mantığını 1-2 kısa cümleyle Türkçe açıklasın (sesli okunacak, konuşma diline uygun olsun).
- "kapanis_tr" kısa bir çağrı cümlesi olsun (max 12 kelime), "ücretsiz" kelimesini içersin.
- Tüm Türkçe metinler SESLENDİRME için yazılıyor: kısa, akıcı, noktalama sade olsun.

SADECE şu JSON şemasıyla cevap ver — kod bloğu (\`\`\`) kullanma, taslak yazma, açıklama/önizleme ekleme, tek ve nihai bir JSON nesnesi döndür, başka hiçbir metin ekleme:
{"hook":"...","soru_en":"...","siklar":["A) ...","B) ...","C) ...","D) ..."],"dogru_sik":0,"sinyal":"...","aciklama_tr":"...","kapanis_tr":"..."}`;

async function claudeJsonUret() {
  const bugun = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-5";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      thinking: { type: "disabled" },
      system: SISTEM_PROMPT,
      messages: [
        { role: "user", content: `Bugün ${bugun}. Bugüne özel, daha önce üretilmemiş yeni bir video senaryosu üret.` },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API hatası: ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.content?.find((b) => b.type === "text")?.text || "";

  // Claude bazen (talimata rağmen) taslak + düzeltme gibi birden fazla JSON
  // bloğu üretebiliyor — kod bloklarını (varsa) ayrı ayrı dener, en sondan
  // başlayarak şemayı tam sağlayan ilk adayı kabul eder.
  const adaylar = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1]);
  adaylar.push(text);

  for (let i = adaylar.length - 1; i >= 0; i--) {
    const aday = adaylar[i];
    const jsonMetni = aday.slice(aday.indexOf("{"), aday.lastIndexOf("}") + 1);
    try {
      const senaryo = JSON.parse(jsonMetni);
      if (senaryoTamMi(senaryo)) return senaryo;
    } catch {
      // sıradaki adaya geç
    }
  }

  throw new Error(`Claude yanıtı JSON olarak parse edilemedi. stop_reason: ${data.stop_reason}, ham metin: ${JSON.stringify(text)}`);
}

function senaryoTamMi(s) {
  return (
    s &&
    typeof s.hook === "string" &&
    typeof s.soru_en === "string" &&
    Array.isArray(s.siklar) &&
    s.siklar.length === 4 &&
    typeof s.dogru_sik === "number" &&
    typeof s.sinyal === "string" &&
    typeof s.aciklama_tr === "string" &&
    typeof s.kapanis_tr === "string"
  );
}

function narrasyonVeAltyaziSatirlariUret(senaryo) {
  const dogruHarf = ["A", "B", "C", "D"][senaryo.dogru_sik] || "A";
  const dogruMetni = (senaryo.siklar[senaryo.dogru_sik] || "").replace(/^[A-D]\)\s*/, "");

  // Her satır hem seslendirilecek hem de ekranda gösterilecek altyazı
  // parçasıdır — sıralama, video akışının kendisidir.
  return [
    senaryo.hook,
    `İşte cümle: ${senaryo.soru_en}`,
    ...senaryo.siklar,
    `Doğru sinyal kelime: ${senaryo.sinyal}.`,
    senaryo.aciklama_tr,
    `Doğru cevap ${dogruHarf}: ${dogruMetni}`,
    senaryo.kapanis_tr,
  ].filter(Boolean);
}

export async function scriptUret() {
  const senaryo = await claudeJsonUret();
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
