// ============================================================
// ADIM 5a — YouTube Data API v3: videoyu Shorts olarak yükler.
// ============================================================
// OAuth2 refresh token gerektirir (bkz. README.md "YouTube OAuth kurulumu").

import { readFile, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { google } from "googleapis";
import { hashtagSeti, youtubeTags } from "./_seo.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "out");

function oauthClient() {
  const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET || !YOUTUBE_REFRESH_TOKEN) {
    throw new Error("YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN eksik");
  }
  const client = new google.auth.OAuth2(YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: YOUTUBE_REFRESH_TOKEN });
  return client;
}

function baslikVeAciklamaOlustur(senaryo) {
  const dogruHarf = ["A", "B", "C", "D"][senaryo.dogru_index] || "A";
  const secenekSatirlari = senaryo.secenekler_tr.map((s, i) => `${["A", "B", "C", "D"][i]}) ${s}`);
  // 2026 YouTube Shorts SEO: başlıkta hashtag KULLANMA — anahtar kelime
  // öne yüklensin, mobilde tam görünmesi için ~70 karakterde kessin.
  // (bkz. scripts/_seo.mjs üstündeki not)
  const sinyalEki = senaryo.sinyal ? ` — "${senaryo.sinyal}" sinyali` : "";
  const genisletilmisBaslik = `${senaryo.hook}${sinyalEki}`;
  // Sinyal eki eklenince 70 karakteri aşıyorsa kelimenin ortasından
  // kesmek yerine ekisiz hook'u kullan (hook'lar zaten ~70'i geçmiyor).
  const title = genisletilmisBaslik.length <= 70 ? genisletilmisBaslik : senaryo.hook.slice(0, 70);
  const description = [
    senaryo.soru_en,
    "",
    senaryo.soru_tr,
    ...secenekSatirlari,
    "",
    senaryo.sinyal ? `Doğru cevap: ${dogruHarf} — Sinyal kelime: ${senaryo.sinyal}` : `Doğru cevap: ${dogruHarf}`,
    senaryo.aciklama_tr,
    "",
    "Sinyal Avcısı ile YDS/YÖKDİL'e ücretsiz hazırlan: https://sinyal-avcisi.com",
    hashtagSeti(senaryo).join(" "),
  ].join("\n");
  return { title, description };
}

export async function youtubeYukle() {
  const script = JSON.parse(await readFile(path.join(OUT_DIR, "script.json"), "utf-8"));
  const { title, description } = baslikVeAciklamaOlustur(script.senaryo);

  const auth = oauthClient();
  const youtube = google.youtube({ version: "v3", auth });

  const videoPath = path.join(OUT_DIR, "video.mp4");

  const res = await youtube.videos.insert({
    part: "snippet,status",
    requestBody: {
      snippet: {
        title,
        description,
        tags: youtubeTags(script.senaryo),
        categoryId: "27", // Eğitim
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: createReadStream(videoPath),
    },
  });

  const videoId = res.data.id;
  const videoUrl = `https://youtube.com/shorts/${videoId}`;
  await writeFile(path.join(OUT_DIR, "youtube-result.json"), JSON.stringify({ videoId, videoUrl }, null, 2));
  console.log("YouTube'a yüklendi:", videoUrl);
  return { videoId, videoUrl };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  youtubeYukle().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
