// ============================================================
// master + weekly publish-state'den site'nin api/data/published-content.json
// dosyasını (yeniden) üretir.
// ============================================================
// `publish-next-weekly-signal.mjs` her başarılı çalıştırma sonunda bunu
// çağırır; bu, site (Vercel) ile video-pipeline (GitHub Actions) arasındaki
// TEK bağlantı noktasıdır (bkz. "Site + Instagram + YouTube yayın zinciri").
// `api/` dizini `.vercelignore` tarafından hariç tutulmadığı için (sadece
// `automation/` hariç tutuluyor), bu dosya deploy'a dahil olur ve
// `api/published-content.mjs` tarafından okunabilir.
//
// Hata verirse SADECE bu adımı etkiler — asıl YouTube/Instagram/Facebook
// yayın akışını hiç bozmaz (çağıran taraf try/catch ile sarmalar).

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPublishedContentManifest } from "./_publication-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PIPELINE_DATA_DIR = path.join(__dirname, "..", "data");
const SITE_API_DATA_DIR = path.join(__dirname, "..", "..", "..", "api", "data");
const OUT_PATH = path.join(SITE_API_DATA_DIR, "published-content.json");

async function readJsonSafe(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    return null;
  }
}

export async function regeneratePublishedContent({ outPath = OUT_PATH, dataDir = PIPELINE_DATA_DIR } = {}) {
  const masterState = await readJsonSafe(path.join(dataDir, "master-publish-state.json"));
  const weeklyState = await readJsonSafe(path.join(dataDir, "weekly-signals-publish-state.json"));
  const manifest = buildPublishedContentManifest({ masterState, weeklyState });
  await writeFile(outPath, JSON.stringify(manifest, null, 2) + "\n");
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  regeneratePublishedContent()
    .then((m) => console.log(`published-content.json güncellendi: ${m.items.length} öğe`))
    .catch((err) => {
      console.error("Manifest güncellenemedi:", err.message);
      process.exit(1);
    });
}
