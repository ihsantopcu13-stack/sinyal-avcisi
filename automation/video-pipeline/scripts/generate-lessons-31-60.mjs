// ============================================================
// TEK SEFERLİK — MASTER VİDEO PAKETİ #31-60 için 30 yeni konu üretir
// (/api/generate-topic-lesson üzerinden), data/master-lessons.mjs'teki
// LESSONS dizisine epNum 31-60 olarak ekler. #1-30 ile ÇAKIŞMAYAN, gerçek
// YDS/YÖKDİL gramer sinyalleri.
// ============================================================

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const TOPICS = [
  "NOT ONLY...BUT ALSO",
  "NEITHER...NOR",
  "EITHER...OR",
  "SUCH...THAT (sonuç cümleciği)",
  "SO...THAT (sonuç cümleciği, sıfat/zarf ile)",
  "NO SOONER...THAN (devrik yapı)",
  "HARDLY/SCARCELY...WHEN (devrik yapı)",
  "BY THE TIME",
  "AS SOON AS",
  "RATHER THAN",
  "LET ALONE",
  "REPORTED SPEECH (dolaylı anlatım, zaman kayması)",
  "WISH / IF ONLY (pişmanlık/dilek)",
  "HAD BETTER / WOULD RATHER",
  "USED TO / BE USED TO / GET USED TO",
  "CLEFT SENTENCES (IT IS...THAT vurgu yapısı)",
  "CAUSATIVE (HAVE/GET SOMETHING DONE)",
  "MIXED CONDITIONALS (karışık koşul cümleleri)",
  "ELLIPSIS (SO DO I / NEITHER DO I)",
  "ENOUGH / TOO...TO",
  "AS LONG AS / ON CONDITION THAT",
  "DUE TO / OWING TO (isim tamlamasıyla neden)",
  "RESULT IN / RESULT FROM",
  "NOT UNTIL (devrik yapı)",
  "APPOSITION (virgülle ayrılmış isim tamlaması)",
  "PARTICIPLE CLAUSES (Ving/V3 ile indirgenmiş cümlecik)",
  "DISCOURSE MARKERS: ZITLIK (ON THE OTHER HAND / NEVERTHELESS / NONETHELESS)",
  "DISCOURSE MARKERS: NEDEN-SONUÇ (THEREFORE / THUS / CONSEQUENTLY)",
  "REFERANS KELİMELERİ (THIS/THAT/SUCH ile paragrafta geriye atıf)",
  "MASTER AVCI 3 — FİNAL BOSS (tüm motoru tek soruda çalıştır, seri finali)",
];

async function ucretsizUret(topic, epNum) {
  const res = await fetch("https://sinyal-avcisi.com/api/generate-topic-lesson", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, epNum }),
  });
  if (!res.ok) throw new Error(`API hata: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const cleaned = data.text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned);
}

function lessonToCode(l, epNum) {
  const audioFolder = `master-${String(epNum).padStart(2, "0")}`;
  const esc = (s) => JSON.stringify(s ?? "");
  const examplesCode = JSON.stringify(l.examples, null, 2).replace(/"style":/g, '"style":');
  const breakdownCode = (l.breakdown || []).map(
    (b) => `      { text: ${esc(b.text)}, color: ${b.styleColor === "good" ? "G" : b.styleColor === "verb" ? "Y" : b.styleColor === "trap" ? "R" : "W"} }`
  ).join(",\n");
  return `  lesson({
    id: ${esc(l.id)}, epNum: ${epNum}, audioFolder: ${esc(audioFolder)},
    hookTitle: ${esc(l.hookTitle)},
    kuralLines: ${JSON.stringify(l.kuralLines)},
    narration: {
      hook: ${esc(l.narration.hook)},
      kural: ${esc(l.narration.kural)},
      neden: ${esc(l.narration.neden)},
      tuzak: ${esc(l.narration.tuzak)},
      ornek: ${esc(l.narration.ornek)},
      soru: ${esc(l.narration.soru)},
      cozum: ${esc(l.narration.cozum)},
      avci: ${esc(l.narration.avci)},
    },
    nedenBadge: ${esc(l.nedenBadge)},
    nedenText: ${esc(l.nedenText)},
    tuzakText: ${esc(l.tuzakText)},
    examples: ${examplesCode},
    breakdown: [
${breakdownCode}
    ],
    question: { sentence: ${esc(l.question.sentence)}, options: ${JSON.stringify(l.question.options)} },
    answerLabel: ${esc(l.answerLabel)},
    cozumText: ${esc(l.cozumText)},
    avciKodu: ${esc(l.avciKodu)},
  })`;
}

async function main() {
  const results = [];
  for (let i = 0; i < TOPICS.length; i++) {
    const epNum = 31 + i;
    const topic = TOPICS[i];
    console.log(`\n=== #${epNum} — ${topic} ===`);
    try {
      const l = await ucretsizUret(topic, epNum);
      results.push({ epNum, topic, lesson: l });
      console.log(`  OK: ${l.hookTitle} (id: ${l.id})`);
    } catch (err) {
      console.error(`  HATA: ${err.message}`);
      results.push({ epNum, topic, error: err.message });
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  const successful = results.filter((r) => r.lesson);
  const failed = results.filter((r) => r.error);
  console.log(`\n\nBaşarılı: ${successful.length}/30, Başarısız: ${failed.length}/30`);
  if (failed.length) failed.forEach((f) => console.log(`  #${f.epNum} ${f.topic}: ${f.error}`));

  const codeBlocks = successful.map((r) => lessonToCode(r.lesson, r.epNum)).join(",\n");

  const filePath = path.join(ROOT, "data", "master-lessons.mjs");
  let code = await readFile(filePath, "utf-8");
  // "];\n\nexport const DUMMY_LESSON" öncesine, LESSONS dizisinin son elemanından sonra ekle.
  code = code.replace(
    /\n\];\n\nexport const DUMMY_LESSON/,
    `\n${codeBlocks},\n];\n\nexport const DUMMY_LESSON`
  );
  await writeFile(filePath, code, "utf-8");
  console.log("data/master-lessons.mjs güncellendi.");

  await writeFile(
    path.join(ROOT, "out", "lessons-31-60-report.json"),
    JSON.stringify(results, null, 2)
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
