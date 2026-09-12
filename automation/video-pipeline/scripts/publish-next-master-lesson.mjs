// ============================================================
// MASTER VİDEO PAKETİ — sıradaki bölümü YouTube + Instagram'a yayınlar.
// Günlük GitHub Actions cron'u (master-lesson-publish.yml) bunu bir kez
// çalıştırır, state'i ilerletir — böylece 30 video hepsi birden değil,
// düzenli bir takvimde (günde 1) yayınlanır.
//
// Video kaynağı: bu repodaki bir GitHub Release'e asset olarak
// yüklenmiş MP4'ler (bkz. scripts/upload-master-lessons-to-release.mjs).
// Bu sayede hem yerel oturumdan hem CI'dan aynı kod çalışır — out/*.mp4
// CI'da yok (gitignored), ama Release asset her yerden erişilebilir.
//
// Gerekli env: YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN, BUFFER_ACCESS_TOKEN,
// GITHUB_TOKEN, GITHUB_REPOSITORY
// ============================================================

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { google } from "googleapis";
import { ALL_EPISODES_META } from "../data/master-lessons.mjs";
import { youtubeMeta, instagramCaption } from "./_master-publish-meta.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const STATE_PATH = path.join(ROOT, "data", "master-publish-state.json");
const RELEASE_TAG = "master-lessons-v1";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

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

async function readState() {
  try {
    return JSON.parse(await readFile(STATE_PATH, "utf-8"));
  } catch {
    return { nextIndex: 0 };
  }
}

async function writeState(state) {
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
}

async function resolveVideoPath(videoFile) {
  const localPath = path.join(ROOT, "out", videoFile);
  if (existsSync(localPath)) return localPath;

  // CI: Release asset'ini indir
  const release = await (await ghApi(`/releases/tags/${RELEASE_TAG}`)).json();
  const asset = (release.assets || []).find((a) => a.name === videoFile);
  if (!asset) throw new Error(`Release asset bulunamadı: ${videoFile}`);
  const res = await fetch(asset.browser_download_url, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/octet-stream" },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const tmpDir = path.join(ROOT, "out");
  await mkdir(tmpDir, { recursive: true });
  await writeFile(localPath, buf);
  return localPath;
}

async function getReleaseAssetUrl(videoFile) {
  const release = await (await ghApi(`/releases/tags/${RELEASE_TAG}`)).json();
  const asset = (release.assets || []).find((a) => a.name === videoFile);
  if (!asset) throw new Error(`Release asset bulunamadı (Instagram için): ${videoFile}`);
  return asset.browser_download_url;
}

function youtubeClient() {
  const { YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN } = process.env;
  const client = new google.auth.OAuth2(YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: YOUTUBE_REFRESH_TOKEN });
  return google.youtube({ version: "v3", auth: client });
}

async function uploadYouTube(episode, videoPath) {
  const { title, description, tags } = youtubeMeta(episode);
  const youtube = youtubeClient();
  const res = await youtube.videos.insert({
    part: "snippet,status",
    requestBody: {
      snippet: { title, description, tags, categoryId: "27" },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    },
    media: { body: createReadStream(videoPath) },
  });
  return { videoId: res.data.id, videoUrl: `https://youtube.com/shorts/${res.data.id}` };
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

async function uploadInstagram(episode, videoUrl) {
  const orgs = await bufferGraphQL("{ account { organizations { id } } }");
  const orgId = orgs.account.organizations[0].id;
  const channelsData = await bufferGraphQL(`{ channels(input: { organizationId: "${orgId}" }) { id service } }`);
  const channel = channelsData.channels.find((c) => c.service === "instagram");
  if (!channel) throw new Error("Bağlı Instagram kanalı bulunamadı.");

  const caption = instagramCaption(episode);
  const dueAt = new Date(Date.now() + 60_000).toISOString();
  const mutation = `
    mutation {
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
  if (!data.createPost || data.createPost.message) {
    throw new Error(`Instagram post oluşturulamadı: ${data.createPost?.message ?? "boş yanıt"}`);
  }
  return data.createPost.post;
}

export async function publishNext() {
  const state = await readState();
  if (state.nextIndex >= ALL_EPISODES_META.length) {
    console.log("Tüm bölümler zaten yayınlandı.");
    return { done: true };
  }

  const episode = ALL_EPISODES_META[state.nextIndex];
  console.log(`Yayınlanıyor: #${episode.epNum} ${episode.id}`);

  const videoPath = await resolveVideoPath(episode.videoFile);
  const videoUrl = await getReleaseAssetUrl(episode.videoFile);

  const [ytResult, igResult] = await Promise.allSettled([
    uploadYouTube(episode, videoPath),
    uploadInstagram(episode, videoUrl),
  ]);

  const result = {
    epNum: episode.epNum,
    id: episode.id,
    youtube: ytResult.status === "fulfilled" ? ytResult.value : { error: ytResult.reason?.message },
    instagram: igResult.status === "fulfilled" ? igResult.value : { error: igResult.reason?.message },
  };

  // Bir sonraki bölüme ilerle (kısmi başarı olsa da — aksi halde kalıcı
  // hata veren bir bölüm tüm takvimi tıkar; başarısızlıklar rapora düşüyor).
  state.nextIndex += 1;
  state.history = state.history || [];
  state.history.push({ ...result, publishedAt: new Date().toISOString() });
  await writeState(state);

  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  publishNext().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
