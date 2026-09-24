// ============================================================
// Tam akış: Gerçek soru havuzu → OpenAI TTS → Remotion → Instagram + TikTok (Buffer)
// (YouTube kanalı silindi — yükleme adımı 2026-09-25'te kaldırıldı)
// ============================================================

import { scriptUret } from "./generate-script.mjs";
import { audioUret } from "./generate-audio.mjs";
import { render } from "./render.mjs";
import { kapakGoruntusuUret } from "./generate-thumbnail.mjs";
import { reelsYayinlaBuffer } from "./upload-instagram-buffer.mjs";
import { tiktokYayinlaBuffer } from "./upload-tiktok-buffer.mjs";

async function main() {
  console.log("1/6 Günün sorusu seçiliyor (gerçek soru havuzu)...");
  const scriptSonuc = await scriptUret();

  // ATLANDI — kaynak veri kalite kontrolünden geçemedi (bkz.
  // generate-script.mjs:veriKalitesiSorunu). Bu bir HATA/crash DEĞİL,
  // bilinçli bir güvenlik kararı: audio/render/Instagram/TikTok
  // adımlarının hiçbiri çalıştırılmadan pipeline nazikçe sonlanır.
  if (scriptSonuc.atlandi) {
    console.log("\n=== PIPELINE ATLANDI (güvenlik kararı, hata değil) ===");
    console.log(`Soru ID: ${scriptSonuc.soruIndex}`);
    console.log(`Sebep: ${scriptSonuc.sebep}`);
    console.log("Kaynak veri kalite kontrolünden geçemedi — audio/render/upload adımları çalıştırılmadı.");
    return;
  }

  console.log("2/6 Seslendirme üretiliyor (OpenAI TTS)...");
  await audioUret();

  console.log("3/6 Video render ediliyor (Remotion)...");
  await render();

  console.log("4/6 Kapak görseli üretiliyor...");
  try {
    await kapakGoruntusuUret();
  } catch (err) {
    // Kapak görseli opsiyonel bir iyileştirme — üretilemezse Instagram
    // yüklemesi otomatik seçilen video karesine düşerek devam eder.
    console.error("Kapak görseli üretilemedi (devam ediliyor):", err.message);
  }

  // Instagram ve TikTok yüklemeleri birbirinden bağımsız: biri başarısız
  // olsa da diğeri yine de denenir.
  console.log("5/6 Instagram Reels'e yükleniyor (Buffer)...");
  console.log("6/6 TikTok'a yükleniyor (Buffer)...");
  const [instagram, tiktok] = await Promise.allSettled([
    reelsYayinlaBuffer(),
    tiktokYayinlaBuffer(),
  ]);

  console.log("\n=== SONUÇ ===");
  console.log(
    "Instagram:",
    instagram.status === "fulfilled"
      ? `${instagram.value.id} ${instagram.value.status}`
      : `HATA: ${instagram.reason?.message || instagram.reason}`
  );
  console.log(
    "TikTok:",
    tiktok.status !== "fulfilled"
      ? `HATA: ${tiktok.reason?.message || tiktok.reason}`
      : tiktok.value?.skipped
        ? `SKIPPED: ${tiktok.value.reason}`
        : `${tiktok.value.id} ${tiktok.value.status}`
  );

  if (instagram.status === "rejected" || tiktok.status === "rejected") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Pipeline hatası:", err);
  process.exit(1);
});
