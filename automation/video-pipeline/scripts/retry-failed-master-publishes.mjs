// ============================================================
// MASTER VİDEO PAKETİ — out/publish-all-report.json'daki başarısız
// YouTube/Instagram işlemlerini tekrar dener (platform limitleri
// zamanla açıldıkça). Başarılı olanları TEKRAR yayınlamaz.
// ============================================================

import { readFile, writeFile, access } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_EPISODES_META } from "../data/master-lessons.mjs";
import { youtubeMeta, instagramCaption, topicName } from "./_master-publish-meta.mjs";
import { createReadStream, existsSync } from "node:fs";
import { google } from "googleapis";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const REPORT_PATH = path.join(ROOT, "out", "publish-all-report.json");

function youtubeClient() {
  const client = new google.auth.OAuth2(process.env.YOUTUBE_CLIENT_ID, process.env.YOUTUBE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  return google.youtube({ version: "v3", auth: client });
}

// Özel kapak görseli (bkz. src/Thumbnail.jsx) — otomatik seçilen video
// karesi yerine CTR için tasarlanmış tek kare. Opsiyonel: üretilemezse
// veya ayarlanamazsa yükleme akışını bozmadan sessizce geçilir.
async function kapakGoruntusuUretVeAyarla(youtube, videoId, episode) {
  const thumbPath = path.join(ROOT, "out", `thumb-${episode.id}.png`);
  const propsPath = path.join(ROOT, "out", `thumb-props-${episode.id}.json`);
  try {
    await writeFile(propsPath, JSON.stringify({ topic: topicName(episode), sub: "YDS / YÖKDİL" }, null, 2));
    await execFileAsync(
      "npx",
      ["remotion", "still", "src/index.jsx", "ThumbnailWide", thumbPath, "--props", propsPath],
      { cwd: ROOT, shell: true, maxBuffer: 1024 * 1024 * 50 }
    );
    await youtube.thumbnails.set({ videoId, media: { mimeType: "image/png", body: createReadStream(thumbPath) } });
    console.log(`  #${episode.epNum} özel kapak görseli ayarlandı.`);
  } catch (err) {
    console.error(`  #${episode.epNum} kapak görseli ayarlanamadı (devam ediliyor):`, err.message);
  }
}

async function uploadYouTube(episode, videoPath) {
  const { title, description, tags } = youtubeMeta(episode);
  const youtube = youtubeClient();
  const res = await youtube.videos.insert({
    part: "snippet,status",
    requestBody: { snippet: { title, description, tags, categoryId: "27" }, status: { privacyStatus: "public", selfDeclaredMadeForKids: false } },
    media: { body: createReadStream(videoPath) },
  });
  const videoId = res.data.id;
  await kapakGoruntusuUretVeAyarla(youtube, videoId, episode);
  return { videoId, videoUrl: `https://youtube.com/shorts/${videoId}` };
}

async function bufferGraphQL(query) {
  const res = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.BUFFER_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(`Buffer hata: ${JSON.stringify(json.errors)}`);
  return json.data;
}

async function getReleaseAssetUrl(videoFile) {
  const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/releases/tags/master-lessons-v1`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
  });
  const release = await res.json();
  const asset = (release.assets || []).find((a) => a.name === videoFile);
  if (!asset) throw new Error(`Release asset bulunamadı: ${videoFile}`);
  return asset.browser_download_url;
}

async function uploadInstagram(episode, videoUrl) {
  const orgs = await bufferGraphQL("{ account { organizations { id } } }");
  const orgId = orgs.account.organizations[0].id;
  const channelsData = await bufferGraphQL(`{ channels(input: { organizationId: "${orgId}" }) { id service } }`);
  const channel = channelsData.channels.find((c) => c.service === "instagram");
  const caption = instagramCaption(episode);
  const dueAt = new Date(Date.now() + 60_000).toISOString();
  const mutation = `mutation {
    createPost(input: {
      text: ${JSON.stringify(caption)}
      channelId: "${channel.id}"
      schedulingType: automatic
      mode: customScheduled
      dueAt: "${dueAt}"
      assets: [{ video: { url: "${videoUrl}" } }]
      metadata: { instagram: { type: reel, shouldShareToFeed: true } }
    }) {
      ... on PostActionSuccess { post { id status } }
      ... on MutationError { message }
    }
  }`;
  const data = await bufferGraphQL(mutation);
  if (!data.createPost || data.createPost.message) throw new Error(`Instagram: ${data.createPost?.message ?? "boş yanıt"}`);
  return data.createPost.post;
}

async function main() {
  const report = JSON.parse(await readFile(REPORT_PATH, "utf-8"));
  const ytFailed = report.outcomes.filter((o) => o.youtube?.error);
  const igFailed = report.outcomes.filter((o) => o.instagram?.error);
  console.log(`Yeniden denenecek: YouTube ${ytFailed.length}, Instagram ${igFailed.length}`);

  for (const o of report.outcomes) {
    const episode = ALL_EPISODES_META.find((e) => e.epNum === o.epNum);
    const videoPath = path.join(ROOT, "out", episode.videoFile);

    if (o.youtube?.error) {
      try {
        const r = await uploadYouTube(episode, videoPath);
        o.youtube = r;
        console.log(`#${o.epNum} YouTube OK -> ${r.videoUrl}`);
      } catch (e) {
        o.youtube = { error: e.message };
        console.log(`#${o.epNum} YouTube hala başarısız: ${e.message}`);
        if (/exceeded/i.test(e.message)) {
          console.log("YouTube kotası hala dolu, kalan YouTube denemelerini atlıyorum.");
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  for (const o of report.outcomes) {
    if (!o.instagram?.error) continue;
    const episode = ALL_EPISODES_META.find((e) => e.epNum === o.epNum);
    try {
      const videoUrl = await getReleaseAssetUrl(episode.videoFile);
      const post = await uploadInstagram(episode, videoUrl);
      o.instagram = post;
      console.log(`#${o.epNum} Instagram OK`);
    } catch (e) {
      o.instagram = { error: e.message };
      console.log(`#${o.epNum} Instagram hala başarısız: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  const ytSuccess = report.outcomes.filter((o) => o.youtube && !o.youtube.error).length;
  const igSuccess = report.outcomes.filter((o) => o.instagram && !o.instagram.error).length;
  report.ytSuccess = ytSuccess;
  report.igSuccess = igSuccess;
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\nGÜNCEL DURUM — YouTube: ${ytSuccess}/30, Instagram: ${igSuccess}/30`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
