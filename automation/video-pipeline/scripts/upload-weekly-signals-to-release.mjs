// ============================================================
// HAFTALIK SİNYAL VİDEOLARI — automation/karaoke-video/batch/ içindeki
// 14 videoyu (7 gün × reels1 + reels2) tek bir GitHub Release'e
// (weekly-signals-v1) asset olarak yükler. publish-next-weekly-signal.mjs
// hem yerel hem CI'dan aynı herkese açık URL'lere erişsin diye.
// batch/ dosyaları SİLİNMEZ — bu sadece ek bir kopyalama/barındırma adımı.
// ============================================================

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { WEEKLY_SIGNALS_QUEUE } from "../data/weekly-signals-meta.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const REPO_ROOT = path.join(ROOT, "..", "..");
const BATCH_DIR = path.join(REPO_ROOT, "automation", "karaoke-video", "batch");
const RELEASE_TAG = "weekly-signals-v1";

const envPath = path.join(ROOT, ".env.local");
const env = {};
try {
  const envText = await readFile(envPath, "utf-8");
  for (const line of envText.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
} catch {
  // .env.local yoksa sorun değil — process.env'e (CI) düşülür.
}
const GITHUB_TOKEN = env.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN yok (.env.local ve process.env'de yok)");

const { execSync } = await import("node:child_process");
const remoteUrl = execSync("git remote get-url origin", { cwd: REPO_ROOT }).toString().trim();
const m = remoteUrl.match(/github\.com[:/]([^/]+\/[^/.]+)/);
const GITHUB_REPOSITORY = m[1];
console.log("repo:", GITHUB_REPOSITORY);

async function ghApi(pathSuffix, options = {}) {
  return fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${pathSuffix}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });
}

async function getOrCreateRelease() {
  const existing = await ghApi(`/releases/tags/${RELEASE_TAG}`);
  if (existing.ok) return existing.json();
  const created = await ghApi("/releases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tag_name: RELEASE_TAG,
      name: "Sinyal Avcısı — Haftalık Sinyal Videoları (barındırma)",
      body: "Pazartesi-Pazar haftalık sinyal videolarının Instagram/CI için barındırıldığı release. Yayın takvimine göre otomatik yükleniyor.",
      draft: false,
      prerelease: false,
    }),
  });
  if (!created.ok) throw new Error(`Release oluşturulamadı: ${created.status} ${await created.text()}`);
  return created.json();
}

async function uploadAsset(release, filePath, assetName) {
  const existingAsset = (release.assets || []).find((a) => a.name === assetName);
  if (existingAsset) {
    await ghApi(`/releases/assets/${existingAsset.id}`, { method: "DELETE" });
    console.log(`  eski asset silindi, güncelleniyor: ${assetName}`);
  }
  const uploadBase = release.upload_url.replace(/\{.*\}$/, "");
  const fileBuffer = await readFile(filePath);
  const res = await fetch(`${uploadBase}?name=${encodeURIComponent(assetName)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "Content-Type": "video/mp4" },
    body: fileBuffer,
  });
  if (!res.ok) throw new Error(`Asset yüklenemedi (${assetName}): ${res.status} ${await res.text()}`);
  const asset = await res.json();
  console.log(`  yüklendi: ${assetName} (${(fileBuffer.length / 1024 / 1024).toFixed(1)}MB)`);
  return asset.browser_download_url;
}

async function main() {
  const release = await getOrCreateRelease();
  console.log(`${WEEKLY_SIGNALS_QUEUE.length} video yüklenecek.`);
  for (const item of WEEKLY_SIGNALS_QUEUE) {
    await uploadAsset(release, path.join(BATCH_DIR, item.videoFile), item.videoFile);
  }
  console.log("Tamamlandı.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
