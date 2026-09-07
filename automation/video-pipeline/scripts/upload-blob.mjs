// ============================================================
// ADIM 4 — Vercel Blob: render edilen videoyu geçici genel bir URL'e
// yükler. Instagram Graph API, Reels yayınlamak için dosya yüklemesi
// değil PUBLİK bir video_url ister — bu adım tam olarak onu sağlar.
// (YouTube upload için gerekmez, o dosyayı doğrudan diskten okur.)
// ============================================================

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { put, del } from "@vercel/blob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "out");

export async function videoYukle() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN env değişkeni tanımlı değil");
  }

  const buffer = await readFile(path.join(OUT_DIR, "video.mp4"));
  const dosyaAdi = `sinyal-avcisi-short-${Date.now()}.mp4`;

  const { url } = await put(dosyaAdi, buffer, {
    access: "public",
    contentType: "video/mp4",
  });

  await writeFile(path.join(OUT_DIR, "video-url.json"), JSON.stringify({ url, pathname: dosyaAdi }, null, 2));
  console.log("Video yüklendi:", url);
  return { url, pathname: dosyaAdi };
}

export async function videoSil(pathname) {
  await del(pathname);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  videoYukle().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
