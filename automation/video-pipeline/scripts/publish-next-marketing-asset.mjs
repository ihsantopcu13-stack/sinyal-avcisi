// ============================================================
// PAZARLAMA İÇERİK KUYRUĞU — sıradaki öğeyi (3 Instagram Story + 1
// LinkedIn paylaşımı) Buffer üzerinden yayınlar. Günlük GitHub Actions
// cron'u (marketing-assets-publish.yml, 09:00 Türkiye) bunu çalıştırır.
//
// Görseller GitHub Release'e asset olarak yüklenir (Buffer'ın GraphQL
// API'si doğrudan dosya upload'ı desteklemediği için — bkz.
// upload-instagram-buffer.mjs'deki aynı yaklaşım), oradan alınan public
// URL Buffer'a assets[].image.url olarak verilir.
//
// Bu kuyruk küçük ve tek seferliktir (4 öğe): bir öğe yayınlanamazsa
// state İLERLETİLMEZ ve iş başarısız biter — böylece ertesi günkü
// cron aynı öğeyi yeniden dener, içerik sessizce atlanmaz.
//
// Gerekli env: BUFFER_ACCESS_TOKEN, GITHUB_TOKEN, GITHUB_REPOSITORY
// ============================================================

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { MARKETING_QUEUE } from "../data/marketing-queue.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ASSETS_DIR = path.join(ROOT, "..", "..", "assets");
const STATE_PATH = path.join(ROOT, "data", "marketing-queue-state.json");
const RELEASE_TAG = "marketing-assets-v1";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const BUFFER_ACCESS_TOKEN = process.env.BUFFER_ACCESS_TOKEN;

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

async function getOrCreateRelease(tag) {
  const existing = await ghApi(`/releases/tags/${tag}`);
  if (existing.ok) return existing.json();

  const created = await ghApi("/releases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tag_name: tag,
      name: `Pazarlama Görselleri ${tag}`,
      body: "Sinyal Avcısı pazarlama görselleri — Buffer yayını için barındırılan dosyalar.",
      draft: false,
      prerelease: false,
    }),
  });
  if (!created.ok) {
    throw new Error(`GitHub Release oluşturulamadı: ${created.status} ${await created.text()}`);
  }
  return created.json();
}

async function uploadReleaseAsset(release, filePath, assetName, contentType) {
  const uploadBase = release.upload_url.replace(/\{.*\}$/, "");
  const fileBuffer = await readFile(filePath);

  const existingAsset = (release.assets || []).find((a) => a.name === assetName);
  if (existingAsset) {
    // Aynı isimde asset zaten varsa (önceki başarılı retry'dan kalmış olabilir)
    // yeniden yükleme, doğrudan mevcut URL'i kullan.
    return existingAsset.browser_download_url;
  }

  const res = await fetch(`${uploadBase}?name=${encodeURIComponent(assetName)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": contentType,
    },
    body: fileBuffer,
  });
  if (!res.ok) {
    throw new Error(`Asset yüklenemedi: ${res.status} ${await res.text()}`);
  }
  const asset = await res.json();
  return asset.browser_download_url;
}

async function bufferGraphQL(query) {
  const res = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BUFFER_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) {
    throw new Error(`Buffer GraphQL hatası: ${res.status} ${JSON.stringify(json.errors ?? json)}`);
  }
  return json.data;
}

async function findBufferChannel(service) {
  const accountData = await bufferGraphQL("{ account { organizations { id } } }");
  const organizations = accountData?.account?.organizations ?? [];
  for (const org of organizations) {
    const channelsData = await bufferGraphQL(
      `{ channels(input: { organizationId: "${org.id}" }) { id name service } }`
    );
    const match = (channelsData?.channels ?? []).find((c) => c.service === service);
    if (match) return match;
  }
  return null;
}

function dueAtIso() {
  return new Date(Date.now() + 60_000).toISOString();
}

async function publishInstagramStory(item) {
  const channel = await findBufferChannel("instagram");
  if (!channel) throw new Error("Bağlı bir Instagram kanalı bulunamadı.");

  const release = await getOrCreateRelease(RELEASE_TAG);
  const imageUrl = await uploadReleaseAsset(
    release,
    path.join(ASSETS_DIR, item.file),
    item.file,
    "image/png"
  );
  console.log(`${item.id} görsel URL:`, imageUrl);

  const mutation = `
    mutation {
      createPost(input: {
        text: ${JSON.stringify(item.caption)}
        channelId: "${channel.id}"
        schedulingType: automatic
        mode: customScheduled
        dueAt: "${dueAtIso()}"
        assets: [{ image: { url: "${imageUrl}" } }]
        # Buffer'ın şeması shouldShareToFeed'i type ne olursa olsun zorunlu
        # kılıyor; story feed'e değil sadece story'ye gittiği için false.
        metadata: { instagram: { type: story, shouldShareToFeed: false } }
      }) {
        ... on PostActionSuccess { post { id text dueAt status } }
        ... on MutationError { message }
      }
    }
  `;
  const data = await bufferGraphQL(mutation);
  const result = data?.createPost;
  if (!result || result.message) {
    throw new Error(`Instagram story post oluşturulamadı: ${result?.message ?? "boş yanıt"}`);
  }
  return result.post;
}

async function publishLinkedInPost(item) {
  const channel = await findBufferChannel("linkedin");
  if (!channel) {
    throw new Error(
      "Bağlı bir LinkedIn kanalı bulunamadı — Buffer hesabınıza LinkedIn sayfasının/profilinin eklendiğinden emin olun."
    );
  }

  const mutation = `
    mutation {
      createPost(input: {
        text: ${JSON.stringify(item.caption)}
        channelId: "${channel.id}"
        schedulingType: automatic
        mode: customScheduled
        dueAt: "${dueAtIso()}"
      }) {
        ... on PostActionSuccess { post { id text dueAt status } }
        ... on MutationError { message }
      }
    }
  `;
  const data = await bufferGraphQL(mutation);
  const result = data?.createPost;
  if (!result || result.message) {
    throw new Error(`LinkedIn post oluşturulamadı: ${result?.message ?? "boş yanıt"}`);
  }
  return result.post;
}

async function readState() {
  try {
    return JSON.parse(await readFile(STATE_PATH, "utf-8"));
  } catch {
    return { nextIndex: 0, history: [] };
  }
}

async function writeState(state) {
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

export async function publishNext() {
  if (!BUFFER_ACCESS_TOKEN) throw new Error("BUFFER_ACCESS_TOKEN env değişkeni tanımlı değil");
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN env değişkeni tanımlı değil");
  if (!GITHUB_REPOSITORY) throw new Error("GITHUB_REPOSITORY env değişkeni tanımlı değil");

  const state = await readState();
  if (state.nextIndex >= MARKETING_QUEUE.length) {
    console.log("Pazarlama içerik kuyruğu tamamen yayınlandı — yapılacak bir şey yok.");
    return { done: true };
  }

  const item = MARKETING_QUEUE[state.nextIndex];
  console.log(`Yayınlanıyor (${state.nextIndex + 1}/${MARKETING_QUEUE.length}): ${item.id}`);

  const post =
    item.type === "instagram_story"
      ? await publishInstagramStory(item)
      : await publishLinkedInPost(item);

  console.log(`Yayınlandı: ${item.id} → Buffer post ${post.id} (${post.status}, ${post.dueAt})`);

  // State sadece BAŞARIDA ilerletilir — bir hata olsaydı script zaten
  // throw edip non-zero exit ile biterdi, bu satıra hiç gelinmezdi.
  state.nextIndex += 1;
  state.history = state.history || [];
  state.history.push({ id: item.id, type: item.type, post, publishedAt: new Date().toISOString() });
  await writeState(state);

  return { item: item.id, post };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  publishNext().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
