// ============================================================
// Tam akış: Claude → ElevenLabs → Remotion → Vercel Blob → YouTube + Instagram
// ============================================================

import { scriptUret } from "./generate-script.mjs";
import { audioUret } from "./generate-audio.mjs";
import { render } from "./render.mjs";
import { videoYukle, videoSil } from "./upload-blob.mjs";
import { youtubeYukle } from "./upload-youtube.mjs";
import { reelsYayinla } from "./upload-instagram.mjs";

async function main() {
  console.log("1/5 Senaryo üretiliyor (Claude)...");
  await scriptUret();

  console.log("2/5 Seslendirme üretiliyor (ElevenLabs)...");
  await audioUret();

  console.log("3/5 Video render ediliyor (Remotion)...");
  await render();

  console.log("4/5 YouTube Shorts'a yükleniyor...");
  const youtube = await youtubeYukle();

  console.log("5/5 Instagram Reels'e yükleniyor...");
  const { pathname } = await videoYukle();
  let instagram;
  try {
    instagram = await reelsYayinla();
  } finally {
    // Instagram yayınlandıktan sonra Blob'daki geçici kopyaya artık gerek yok.
    await videoSil(pathname).catch((e) => console.warn("Blob temizlenemedi:", e.message));
  }

  console.log("\nTamamlandı:");
  console.log("YouTube:", youtube.videoUrl);
  console.log("Instagram media id:", instagram.id);
}

main().catch((err) => {
  console.error("Pipeline hatası:", err);
  process.exit(1);
});
