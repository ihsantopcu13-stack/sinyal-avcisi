// ============================================================
// ADIM 6 — Buffer GraphQL API: render edilen videoyu TikTok'a yükler.
// upload-instagram-buffer.mjs ile birebir aynı mantık (GitHub Release'e
// video yükleyip public URL'i Buffer'a vermek) — sadece hedef kanal ve
// TikTok'a özgü metadata farklı.
//
// NOT: TikTok'un Content Posting API'si (Buffer'ın arkasında konuştuğu
// gerçek API) içerik ifşa alanlarını (privacy_level, duet/stitch/yorum
// izinleri) ZORUNLU tutuyor — Buffer'ın bunları GraphQL şemasında nasıl
// adlandırdığı bu repoda daha önce hiç test edilmedi. İlk canlı
// çalıştırmada alan adı/isteğe bağlılık hatası çıkması olası (bkz.
// Instagram'daki shouldShareToFeed, Facebook'taki firstComment
// deneyimleri) — hata çıkarsa mesajına göre burada düzeltilmeli.
//
// Gerekli env: BUFFER_ACCESS_TOKEN, GITHUB_TOKEN
// Opsiyonel env: BUFFER_TIKTOK_CHANNEL_ID (verilmezse bağlı TikTok
// kanalı otomatik bulunur)

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { hashtagSeti } from "./_seo.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "out");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const BUFFER_ACCESS_TOKEN = process.env.BUFFER_ACCESS_TOKEN;
const BUFFER_TIKTOK_CHANNEL_ID = process.env.BUFFER_TIKTOK_CHANNEL_ID;

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
      name: `Video ${tag}`,
      body: "Sinyal Avcısı günlük Reels videosu — otomatik yayın için barındırılan dosya.",
      draft: false,
      prerelease: false,
    }),
  });
  if (!created.ok) {
    throw new Error(`GitHub Release oluşturulamadı: ${created.status} ${await created.text()}`);
  }
  return created.json();
}

async function uploadReleaseAsset(release, filePath, assetName, contentType = "video/mp4") {
  const uploadBase = release.upload_url.replace(/\{.*\}$/, "");
  const fileBuffer = await readFile(filePath);

  const existingAsset = (release.assets || []).find((a) => a.name === assetName);
  if (existingAsset) return existingAsset.browser_download_url;

  const res = await fetch(`${uploadBase}?name=${encodeURIComponent(assetName)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, "Content-Type": contentType },
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
    headers: { Authorization: `Bearer ${BUFFER_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) {
    throw new Error(`Buffer GraphQL hatası: ${res.status} ${JSON.stringify(json.errors ?? json)}`);
  }
  return json.data;
}

async function findTikTokChannel() {
  const accountData = await bufferGraphQL("{ account { organizations { id name } } }");
  const organizations = accountData?.account?.organizations ?? [];
  if (organizations.length === 0) {
    throw new Error("Buffer hesabında hiç organizasyon bulunamadı.");
  }

  for (const org of organizations) {
    const channelsData = await bufferGraphQL(
      `{ channels(input: { organizationId: "${org.id}" }) { id name service } }`
    );
    const channels = channelsData?.channels ?? [];
    if (BUFFER_TIKTOK_CHANNEL_ID) {
      const match = channels.find((c) => c.id === BUFFER_TIKTOK_CHANNEL_ID);
      if (match) return match;
    }
    const tiktok = channels.find((c) => c.service === "tiktok");
    if (tiktok) return tiktok;
  }

  throw new Error("Bağlı bir TikTok kanalı bulunamadı — Buffer hesabınıza TikTok kanalının eklendiğinden emin olun.");
}

function captionOlustur(senaryo) {
  const dogruHarf = ["A", "B", "C", "D"][senaryo.dogru_index] || "A";
  const secenekSatirlari = senaryo.secenekler_tr.map((s, i) => `${["A", "B", "C", "D"][i]}) ${s}`);
  const sinyalSatiri = senaryo.sinyal ? ` — Sinyal: "${senaryo.sinyal}"` : "";
  return `🎯 ${senaryo.hook}\n\n${senaryo.soru_en}\n\n${senaryo.soru_tr}\n${secenekSatirlari.join("\n")}\n\nDoğru cevap: ${dogruHarf}${sinyalSatiri}\n\n${senaryo.aciklama_tr}\n\n💙 Platform tamamen ücretsiz — link bio'da.\n\n${hashtagSeti(senaryo, { instagram: true }).join(" ")}`;
}

function dueAtIso() {
  return new Date(Date.now() + 60_000).toISOString();
}

async function publishToBuffer(channelId, videoUrl, caption) {
  const mutation = `
    mutation {
      createPost(input: {
        text: ${JSON.stringify(caption)}
        channelId: "${channelId}"
        schedulingType: automatic
        mode: customScheduled
        dueAt: "${dueAtIso()}"
        assets: [{ video: { url: "${videoUrl}" } }]
        metadata: { tiktok: { privacyLevel: PUBLIC_TO_EVERYONE, disableDuet: false, disableStitch: false, disableComment: false, brandContentToggle: false, brandOrganicToggle: false } }
      }) {
        ... on PostActionSuccess {
          post { id text dueAt status }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;
  const data = await bufferGraphQL(mutation);
  const result = data?.createPost;
  if (!result || result.message) {
    throw new Error(`Buffer post oluşturulamadı: ${result?.message ?? "boş yanıt"}`);
  }
  return result.post;
}

export async function tiktokYayinlaBuffer() {
  if (!BUFFER_ACCESS_TOKEN) throw new Error("BUFFER_ACCESS_TOKEN env değişkeni tanımlı değil");
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN env değişkeni tanımlı değil");
  if (!GITHUB_REPOSITORY) throw new Error("GITHUB_REPOSITORY env değişkeni tanımlı değil");

  const script = JSON.parse(await readFile(path.join(OUT_DIR, "script.json"), "utf-8"));
  const caption = captionOlustur(script.senaryo);

  const dateTag = `video-${new Date().toISOString().slice(0, 10)}-${Date.now()}`;
  const release = await getOrCreateRelease(dateTag);
  const videoUrl = await uploadReleaseAsset(release, path.join(OUT_DIR, "video.mp4"), "video.mp4");
  console.log("Video herkese açık URL (TikTok):", videoUrl);

  const channel = await findTikTokChannel();
  console.log(`Bağlı TikTok kanalı: ${channel.name} (${channel.id})`);

  const post = await publishToBuffer(channel.id, videoUrl, caption);
  await writeFile(path.join(OUT_DIR, "tiktok-result.json"), JSON.stringify(post, null, 2));
  console.log("TikTok'a Buffer üzerinden gönderildi:", post.id, post.status, post.dueAt);
  return post;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  tiktokYayinlaBuffer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
