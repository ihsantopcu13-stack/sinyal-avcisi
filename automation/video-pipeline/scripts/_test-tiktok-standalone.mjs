// ============================================================
// TEK SEFERLİK TEST YARDIMCISI — tiktokYayinlaBuffer()'ı, pahalı
// Remotion render + TTS adımlarını tekrarlamadan, YouTube/Instagram'a
// DOKUNMADAN izole test etmek için. Daha önce gerçekten üretilmiş bir
// videoyu (en son "video-*" release'inden) yeniden kullanır — uydurma
// veya yeni bir video render edilmez.
//
// Kalıcı pipeline'ın bir parçası DEĞİL, cron'a bağlı değil — sadece
// gunun-sorusu-publish.yml/marketing-assets-publish.yml gibi diğer
// pipeline'ların ilk canlı testinde izlenen "gerçek hatayı gör, düzelt"
// akışı için manuel bir workflow_dispatch aracı.
// ============================================================

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { scriptUret } from "./generate-script.mjs";
import { tiktokYayinlaBuffer } from "./upload-tiktok-buffer.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "out");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const REUSE_RELEASE_TAG = process.env.REUSE_RELEASE_TAG; // örn: video-2026-09-13-1789326842817

async function ghApi(pathSuffix) {
  return fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${pathSuffix}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

async function enSonVideoReleasiniBul() {
  if (REUSE_RELEASE_TAG) {
    const res = await ghApi(`/releases/tags/${REUSE_RELEASE_TAG}`);
    if (!res.ok) throw new Error(`REUSE_RELEASE_TAG bulunamadı: ${REUSE_RELEASE_TAG}`);
    return res.json();
  }
  const res = await ghApi("/releases?per_page=30");
  if (!res.ok) throw new Error(`Release listesi alınamadı: ${res.status}`);
  const releases = await res.json();
  const video = releases.find((r) => r.tag_name.startsWith("video-2") && r.assets.some((a) => a.name === "video.mp4"));
  if (!video) throw new Error("Yeniden kullanılabilir bir video-* release bulunamadı.");
  return video;
}

async function main() {
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN tanımlı değil");
  if (!GITHUB_REPOSITORY) throw new Error("GITHUB_REPOSITORY tanımlı değil");

  await mkdir(OUT_DIR, { recursive: true });

  console.log("1/3 Gerçek soru havuzundan script.json üretiliyor (video render EDİLMİYOR)...");
  await scriptUret();

  console.log("2/3 Yeniden kullanılacak mevcut video indiriliyor...");
  const release = await enSonVideoReleasiniBul();
  const asset = release.assets.find((a) => a.name === "video.mp4");
  console.log(`   Kaynak: ${release.tag_name} / ${asset.name} (${asset.size} bytes)`);
  const videoRes = await fetch(asset.browser_download_url, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/octet-stream" },
  });
  const buf = Buffer.from(await videoRes.arrayBuffer());
  await writeFile(path.join(OUT_DIR, "video.mp4"), buf);

  console.log("3/3 TikTok'a Buffer üzerinden yayınlanıyor...");
  const post = await tiktokYayinlaBuffer();
  console.log("\n=== TEST SONUCU ===");
  console.log(JSON.stringify(post, null, 2));
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
