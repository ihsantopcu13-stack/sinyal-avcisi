// ============================================================
// ADIM 3 — Remotion: audio.mp3 + altyazı zamanlamasını brandli
// dikey (9:16) videoya render eder.
// ============================================================

import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "out");
const ENTRY = path.join(__dirname, "..", "src", "index.jsx");

export async function render() {
  const inputProps = JSON.parse(await readFile(path.join(OUT_DIR, "render-props.json"), "utf-8"));

  console.log("Remotion paketleniyor...");
  const bundleLocation = await bundle({ entryPoint: ENTRY });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "SinyalShort",
    inputProps,
  });

  await mkdir(OUT_DIR, { recursive: true });
  const outputLocation = path.join(OUT_DIR, "video.mp4");

  console.log("Render ediliyor...");
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation,
    inputProps,
    overwrite: true,
  });

  console.log("Video hazır:", outputLocation);
  return outputLocation;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  render().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
