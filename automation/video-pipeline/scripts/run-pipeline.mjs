// ============================================================
// Tam akış: Gerçek soru havuzu → OpenAI TTS → Remotion → YouTube + Instagram (Buffer)
// ============================================================

import { scriptUret } from "./generate-script.mjs";
import { audioUret } from "./generate-audio.mjs";
import { render } from "./render.mjs";
import { youtubeYukle } from "./upload-youtube.mjs";
import { reelsYayinlaBuffer } from "./upload-instagram-buffer.mjs";

async function main() {
  console.log("1/5 Günün sorusu seçiliyor (gerçek soru havuzu)...");
  await scriptUret();

  console.log("2/5 Seslendirme üretiliyor (OpenAI TTS)...");
  await audioUret();

  console.log("3/5 Video render ediliyor (Remotion)...");
  await render();

  // YouTube ve Instagram yüklemeleri birbirinden bağımsız: biri (örn. YouTube
  // günlük yükleme kotası) başarısız olsa da diğeri yine de denenir.
  console.log("4/5 YouTube Shorts'a yükleniyor...");
  console.log("5/5 Instagram Reels'e yükleniyor (Buffer)...");
  const [youtube, instagram] = await Promise.allSettled([youtubeYukle(), reelsYayinlaBuffer()]);

  console.log("\n=== SONUÇ ===");
  console.log(
    "YouTube:",
    youtube.status === "fulfilled" ? youtube.value.videoUrl : `HATA: ${youtube.reason?.message || youtube.reason}`
  );
  console.log(
    "Instagram:",
    instagram.status === "fulfilled"
      ? `${instagram.value.id} ${instagram.value.status}`
      : `HATA: ${instagram.reason?.message || instagram.reason}`
  );

  if (youtube.status === "rejected" || instagram.status === "rejected") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Pipeline hatası:", err);
  process.exit(1);
});
