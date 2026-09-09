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

  console.log("4/5 YouTube Shorts'a yükleniyor...");
  const youtube = await youtubeYukle();

  console.log("5/5 Instagram Reels'e yükleniyor (Buffer)...");
  const instagram = await reelsYayinlaBuffer();

  console.log("\nTamamlandı:");
  console.log("YouTube:", youtube.videoUrl);
  console.log("Instagram Buffer post id:", instagram.id, instagram.status);
}

main().catch((err) => {
  console.error("Pipeline hatası:", err);
  process.exit(1);
});
