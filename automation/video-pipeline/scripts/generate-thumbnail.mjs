// ============================================================
// ADIM 3.5 — günün sinyal kelimesinden özel kapak görseli üretir
// (otomatik seçilen rastgele video karesi yerine, CTR için tasarlanmış
// tek kare — bkz. src/Thumbnail.jsx). İki boyut: Instagram cover (9:16)
// ve YouTube thumbnail (16:9).
// ============================================================

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "out");

export async function kapakGoruntusuUret({ topic, sub = "YDS / YÖKDİL" } = {}) {
  if (!topic) {
    const script = JSON.parse(await readFile(path.join(OUT_DIR, "script.json"), "utf-8"));
    topic = script.senaryo.sinyal || script.senaryo.hook;
  }
  await mkdir(OUT_DIR, { recursive: true });
  const propsPath = path.join(OUT_DIR, "thumb-props.json");
  await writeFile(propsPath, JSON.stringify({ topic, sub }, null, 2));

  const verticalOut = path.join(OUT_DIR, "thumbnail.png");
  const wideOut = path.join(OUT_DIR, "thumbnail-wide.png");

  await execFileAsync(
    "npx",
    ["remotion", "still", "src/index.jsx", "Thumbnail", verticalOut, "--props", propsPath],
    { cwd: ROOT, shell: true, maxBuffer: 1024 * 1024 * 50 }
  );
  await execFileAsync(
    "npx",
    ["remotion", "still", "src/index.jsx", "ThumbnailWide", wideOut, "--props", propsPath],
    { cwd: ROOT, shell: true, maxBuffer: 1024 * 1024 * 50 }
  );

  console.log("Kapak görselleri hazır:", verticalOut, wideOut);
  return { verticalOut, wideOut };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  kapakGoruntusuUret().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
