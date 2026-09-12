// ============================================================
// HAFTALIK SİNYAL VİDEOLARI — sıradaki videoyu (ya da PUBLISH_COUNT ile
// birden fazlasını) YouTube + Instagram + Facebook'a yayınlar. Günlük GitHub Actions
// cron'u (weekly-signals-publish.yml) bunu çalıştırır, state'i ilerletir
// — böylece 14 video hepsi birden değil, düzenli bir takvimde yayınlanır.
//
// Video kaynağı: bu repodaki weekly-signals-v1 Release'ine asset olarak
// yüklenmiş MP4'ler (bkz. scripts/upload-weekly-signals-to-release.mjs).
//
// Gerekli env: YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN, BUFFER_ACCESS_TOKEN,
// GITHUB_TOKEN, GITHUB_REPOSITORY
// ============================================================

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { google } from "googleapis";
import { WEEKLY_SIGNALS_QUEUE } from "../data/weekly-signals-meta.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const STATE_PATH = path.join(ROOT, "data", "weekly-signals-publish-state.json");
const RELEASE_TAG = "weekly-signals-v1";
const PUBLISH_COUNT = Number(process.env.PUBLISH_COUNT || "2");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

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

async function uploadYouTube(item, videoPath) {
  const { title, description, tags } = item.youtube;
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

async function findBufferChannel(service) {
  const orgs = await bufferGraphQL("{ account { organizations { id } } }");
  const orgId = orgs.account.organizations[0].id;
  const channelsData = await bufferGraphQL(`{ channels(input: { organizationId: "${orgId}" }) { id service } }`);
  return channelsData.channels.find((c) => c.service === service);
}

async function uploadViaBuffer(service, caption, videoUrl, { metadata } = {}) {
  const channel = await findBufferChannel(service);
  if (!channel) throw new Error(`Bağlı ${service} kanalı bulunamadı.`);

  const dueAt = new Date(Date.now() + 60_000).toISOString();
  const metadataField = metadata ? `\n        metadata: ${metadata}` : "";
  const mutation = `
    mutation {
      createPost(input: {
        text: ${JSON.stringify(caption)}
        channelId: "${channel.id}"
        schedulingType: automatic
        mode: customScheduled
        dueAt: "${dueAt}"
        assets: [{ video: { url: "${videoUrl}" } }]${metadataField}
      }) {
        ... on PostActionSuccess { post { id status } }
        ... on MutationError { message }
      }
    }`;
  const data = await bufferGraphQL(mutation);
  if (!data.createPost || data.createPost.message) {
    throw new Error(`${service} post oluşturulamadı: ${data.createPost?.message ?? "boş yanıt"}`);
  }
  return data.createPost.post;
}

async function uploadInstagram(item, videoUrl) {
  return uploadViaBuffer("instagram", item.instagram, videoUrl, {
    metadata: "{ instagram: { type: reel, shouldShareToFeed: true } }",
  });
}

async function uploadFacebook(item, videoUrl) {
  return uploadViaBuffer("facebook", item.facebook || item.instagram, videoUrl, {
    metadata: "{ facebook: { type: reel } }",
  });
}

async function publishOne(item) {
  console.log(`Yayınlanıyor: ${item.id} (${item.videoFile})`);
  const videoPath = await resolveVideoPath(item.videoFile);
  const videoUrl = await getReleaseAssetUrl(item.videoFile);

  const [ytResult, igResult, fbResult] = await Promise.allSettled([
    uploadYouTube(item, videoPath),
    uploadInstagram(item, videoUrl),
    uploadFacebook(item, videoUrl),
  ]);

  return {
    id: item.id,
    videoFile: item.videoFile,
    youtube: ytResult.status === "fulfilled" ? ytResult.value : { error: ytResult.reason?.message },
    instagram: igResult.status === "fulfilled" ? igResult.value : { error: igResult.reason?.message },
    facebook: fbResult.status === "fulfilled" ? fbResult.value : { error: fbResult.reason?.message },
  };
}

// Ana kuyruk state'i ilerlemiş olsa bile, tek seferlik bir platform hatası
// yüzünden atlanmış öğeleri yeniden denemek için: data/facebook-retry.json
// içine ["gun-tur", ...] id listesi konursa, bu id'ler için SADECE Facebook'a
// yeniden post atılır (YouTube/Instagram'a dokunulmaz, state ilerletilmez),
// sonra dosya boşaltılır.
const FB_RETRY_PATH = path.join(ROOT, "data", "facebook-retry.json");

async function retryFacebook() {
  let ids;
  try {
    ids = JSON.parse(await readFile(FB_RETRY_PATH, "utf-8"));
  } catch {
    return [];
  }
  if (!Array.isArray(ids) || ids.length === 0) return [];

  const results = [];
  for (const id of ids) {
    const item = WEEKLY_SIGNALS_QUEUE.find((i) => i.id === id);
    if (!item) {
      results.push({ id, error: "Kuyrukta bulunamadı" });
      continue;
    }
    console.log(`Facebook yeniden deneniyor: ${item.id} (${item.videoFile})`);
    try {
      const videoUrl = await getReleaseAssetUrl(item.videoFile);
      const post = await uploadFacebook(item, videoUrl);
      results.push({ id: item.id, ...post });
    } catch (err) {
      results.push({ id: item.id, error: err.message });
    }
  }
  await writeFile(FB_RETRY_PATH, "[]\n");
  return results;
}

export async function publishNext() {
  const retryResults = await retryFacebook();
  if (retryResults.length) {
    console.log("Facebook yeniden deneme sonuçları:", JSON.stringify(retryResults, null, 2));
  }

  const state = await readState();
  if (state.nextIndex >= WEEKLY_SIGNALS_QUEUE.length) {
    console.log("Tüm haftalık sinyal videoları zaten yayınlandı.");
    return { done: true };
  }

  const results = [];
  for (let i = 0; i < PUBLISH_COUNT && state.nextIndex < WEEKLY_SIGNALS_QUEUE.length; i++) {
    const item = WEEKLY_SIGNALS_QUEUE[state.nextIndex];
    const result = await publishOne(item);
    results.push(result);

    // Bir sonraki videoya ilerle (kısmi başarı olsa da — aksi halde kalıcı
    // hata veren bir video tüm takvimi tıkar; başarısızlıklar rapora düşüyor).
    state.nextIndex += 1;
    state.history = state.history || [];
    state.history.push({ ...result, publishedAt: new Date().toISOString() });
  }

  await writeState(state);
  console.log(JSON.stringify(results, null, 2));
  return { results };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  publishNext().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
