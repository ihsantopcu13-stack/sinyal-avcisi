// ============================================================
// MASTER VİDEO PAKETİ — #1-#30'un TAMAMINI bugün, sırayla, aralıksız
// yayınlar (kullanıcı takvim istemedi — publish-next-master-lesson.mjs
// zaten sırayı state dosyasından koruyor, burada sadece 30 kez art arda
// çağırıyoruz). YouTube rate-limit'e takılırsa bile diğer bölümlere
// devam eder (allSettled), hatalar rapora düşer.
// ============================================================

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_EPISODES_META } from "../data/master-lessons.mjs";
import { publishNext } from "./publish-next-master-lesson.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

async function main() {
  const total = ALL_EPISODES_META.length;
  const outcomes = [];
  for (let i = 0; i < total; i++) {
    console.log(`\n--- ${i + 1}/${total} ---`);
    try {
      const r = await publishNext();
      if (r.done) break;
      outcomes.push(r);
      const ytOk = !r.youtube.error;
      const igOk = !r.instagram.error;
      console.log(`#${r.epNum} ${r.id} -> YouTube: ${ytOk ? "OK " + r.youtube.videoUrl : "HATA: " + r.youtube.error} | Instagram: ${igOk ? "OK" : "HATA: " + r.instagram.error}`);
    } catch (err) {
      console.error(`Beklenmeyen hata (${i + 1}/${total}):`, err.message);
      outcomes.push({ fatalError: err.message });
    }
    // Ardışık API çağrıları arasında kısa bir nefes payı (rate-limit nezaketi).
    await new Promise((r) => setTimeout(r, 3000));
  }

  const ytSuccess = outcomes.filter((o) => o.youtube && !o.youtube.error).length;
  const igSuccess = outcomes.filter((o) => o.instagram && !o.instagram.error).length;
  const failures = outcomes.filter((o) => (o.youtube && o.youtube.error) || (o.instagram && o.instagram.error) || o.fatalError);

  const report = { total: outcomes.length, ytSuccess, igSuccess, failures, outcomes };
  await writeFile(path.join(ROOT, "out", "publish-all-report.json"), JSON.stringify(report, null, 2));

  console.log("\n\n=== TOPLU YAYIN RAPORU ===");
  console.log(`YouTube: ${ytSuccess}/${outcomes.length}`);
  console.log(`Instagram: ${igSuccess}/${outcomes.length}`);
  if (failures.length) {
    console.log("Başarısız:");
    failures.forEach((f) => console.log(`  #${f.epNum ?? "?"}`, JSON.stringify(f.youtube?.error || f.instagram?.error || f.fatalError)));
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
