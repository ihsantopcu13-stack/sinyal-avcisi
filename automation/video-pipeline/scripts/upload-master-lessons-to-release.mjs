// ============================================================
// MASTER VİDEO PAKETİ — üretilen tüm out/master-*.mp4 dosyalarını
// tek bir GitHub Release'e (master-lessons-v1) asset olarak yükler.
// Bu, publish-next-master-lesson.mjs'in hem yerel hem CI'dan aynı
// video kaynağına (herkese açık, kalıcı URL) erişmesini sağlar.
// out/ dosyaları SİLİNMEZ — bu sadece ek bir kopyalama/yayınlama adımı.
// ============================================================

import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "out");
const RELEASE_TAG = "master-lessons-v1";

const envText = await readFile(path.join(ROOT, ".env.local"), "utf-8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
// .env.local'de yoksa (bu proje için normal — sadece Actions'ta secret
// olarak sağlanıyor), yerel çalıştırmalarda `gh auth token` fallback'i.
const GITHUB_TOKEN = env.GITHUB_TOKEN || process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN yok (.env.local ve process.env'de yok)");

// GITHUB_REPOSITORY .env.local'de yok (sadece Actions'ta otomatik gelir) —
// git remote'dan çıkarıyoruz.
const { execSync } = await import("node:child_process");
const remoteUrl = execSync("git remote get-url origin", { cwd: ROOT.replace(/automation.video-pipeline$/, "") }).toString().trim();
const m = remoteUrl.match(/github\.com[:/]([^/]+\/[^/.]+)/);
const GITHUB_REPOSITORY = m[1];
console.log("repo:", GITHUB_REPOSITORY);

async function ghApi(pathSuffix, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${pathSuffix}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });
  return res;
}

async function getOrCreateRelease() {
  const existing = await ghApi(`/releases/tags/${RELEASE_TAG}`);
  if (existing.ok) return existing.json();
  const created = await ghApi("/releases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tag_name: RELEASE_TAG,
      name: "Sinyal Avcısı — Master Video Paketi (barındırma)",
      body: "MASTER VİDEO PAKETİ #1-#30 videolarının Instagram/CI için barındırıldığı release. Yayın takvimine göre otomatik yükleniyor.",
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
    console.log(`  zaten yüklü, atlanıyor: ${assetName}`);
    return existingAsset.browser_download_url;
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
  const files = (await readdir(OUT_DIR)).filter((f) => /^master-\d\d-.*\.mp4$/.test(f) || f === "master-01-episode-01.mp4");
  console.log(`${files.length} video dosyası bulundu.`);
  for (const f of files) {
    await uploadAsset(release, path.join(OUT_DIR, f), f);
  }
  console.log("Tamamlandı.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
