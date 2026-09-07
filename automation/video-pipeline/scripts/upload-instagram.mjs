// ============================================================
// ADIM 5b — Instagram Graph API: videoyu Reels olarak yayınlar.
// ============================================================
// api/_instagram-publish.mjs ile aynı 2 adımlı akış (container oluştur →
// hazır olana kadar bekle → yayınla), REELS için media_type + video_url
// eklenmiş hali. Video container'ların işlenmesi resimlere göre çok daha
// uzun sürebildiği için bekleme süresi artırıldı.
//
// Aynı Sinyal Avcısı Instagram hesabını kullanır (IG_SINYAL_* env
// değişkenleri — bkz. feat/instagram-otomasyonu dalındaki görsel
// paylaşım akışı).

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "out");
const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

async function containerHazirMi(containerId, accessToken, denemeSayisi = 40, bekleMs = 5000) {
  for (let i = 0; i < denemeSayisi; i++) {
    const res = await fetch(`${GRAPH_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`);
    const data = await res.json();
    if (data.status_code === "FINISHED") return true;
    if (data.status_code === "ERROR") throw new Error("Instagram container işleme hatası: " + JSON.stringify(data));
    await new Promise((r) => setTimeout(r, bekleMs));
  }
  return false;
}

function captionOlustur(senaryo) {
  const dogruHarf = ["A", "B", "C", "D"][senaryo.dogru_sik] || "A";
  return `🎯 ${senaryo.hook}\n\n${senaryo.soru_en}\n\n${(senaryo.siklar || []).join("\n")}\n\nDoğru cevap: ${dogruHarf} — Sinyal: "${senaryo.sinyal}"\n\n${senaryo.aciklama_tr}\n\n💙 Platform tamamen ücretsiz — link bio'da.\n\n#YDS #YÖKDİL #SinyalAvcısı #İngilizce #Reels`;
}

export async function reelsYayinla() {
  const accessToken = process.env.IG_SINYAL_ACCESS_TOKEN;
  const igBusinessAccountId = process.env.IG_SINYAL_BUSINESS_ACCOUNT_ID;
  if (!accessToken || !igBusinessAccountId) {
    throw new Error("IG_SINYAL_ACCESS_TOKEN veya IG_SINYAL_BUSINESS_ACCOUNT_ID eksik");
  }

  const script = JSON.parse(await readFile(path.join(OUT_DIR, "script.json"), "utf-8"));
  const { url: videoUrl } = JSON.parse(await readFile(path.join(OUT_DIR, "video-url.json"), "utf-8"));
  const caption = captionOlustur(script.senaryo);

  const containerRes = await fetch(`${GRAPH_BASE}/${igBusinessAccountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      share_to_feed: true,
      access_token: accessToken,
    }),
  });
  const containerData = await containerRes.json();
  if (!containerRes.ok || !containerData.id) {
    throw new Error("Container oluşturulamadı: " + JSON.stringify(containerData));
  }

  const hazir = await containerHazirMi(containerData.id, accessToken);
  if (!hazir) {
    throw new Error("Video container zaman aşımına uğradı (FINISHED olmadı)");
  }

  const publishRes = await fetch(`${GRAPH_BASE}/${igBusinessAccountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
  });
  const publishData = await publishRes.json();
  if (!publishRes.ok || !publishData.id) {
    throw new Error("Yayınlama başarısız: " + JSON.stringify(publishData));
  }

  await writeFile(path.join(OUT_DIR, "instagram-result.json"), JSON.stringify(publishData, null, 2));
  console.log("Instagram Reels yayınlandı:", publishData.id);
  return publishData;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  reelsYayinla().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
