// ============================================================
// GÜNÜN SORUSU — kartı (generate-gunun-sorusu-kart.mjs tarafından
// out/gunun-sorusu.png + out/gunun-sorusu-meta.json olarak üretilmiş
// olmalı) Instagram'a gönderi, Facebook'a paylaşım olarak Buffer
// üzerinden yayınlar.
//
// ÖNEMLİ — doğrulanmış Buffer sınırlaması: Buffer'ın GraphQL şemasında
// Instagram için "firstComment" alanı VAR ama sessizce çalışmıyor
// (post oluşuyor, alan kabul ediliyor, ama yorum hiç atılmıyor —
// Facebook ve LinkedIn'de aynı alan sorunsuz çalışıyor). Bu yüzden:
//   - Facebook: cevap gerçekten firstComment olarak atılıyor, kartın
//     "Cevap için yoruma bak" vaadi orada birebir tutuyor.
//   - Instagram: cevap captionın İÇİNE, birkaç boş satırla "kaydırmadan
//     önce düşün" boşluğu bırakılarak ekleniyor — Buffer/Instagram
//     otomatik yorum atamadığı için tek güvenilir yol bu.
//
// Gerekli env: BUFFER_ACCESS_TOKEN, GITHUB_TOKEN, GITHUB_REPOSITORY
// ============================================================

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { nicheHashtag } from "./_seo.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "out");
const RELEASE_TAG_PREFIX = "gunun-sorusu";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const BUFFER_ACCESS_TOKEN = process.env.BUFFER_ACCESS_TOKEN;

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

async function getOrCreateRelease(tag) {
  const existing = await ghApi(`/releases/tags/${tag}`);
  if (existing.ok) return existing.json();

  const created = await ghApi("/releases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tag_name: tag,
      name: `Günün Sorusu ${tag}`,
      body: "Sinyal Avcısı günün sorusu kartı — Buffer yayını için barındırılan dosya.",
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
    await ghApi(`/releases/assets/${existingAsset.id}`, { method: "DELETE" });
  }

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

function ortakGovde(soru) {
  const harfler = ["A", "B", "C", "D"];
  const secenekSatirlari = soru.secenekler_tr.map((s, i) => `${harfler[i]}) ${s}`);
  return [
    `🎯 Günün Sorusu`,
    ``,
    `"${soru.soru_en}"`,
    ``,
    soru.soru_tr,
    ...secenekSatirlari,
  ].join("\n");
}

function instagramCaptionOlustur(soru, dogruHarf) {
  const niche = nicheHashtag(soru.sinyal);
  const hashtags = ["#YDS", "#YÖKDİL", niche, "#SinyalAvcısı", "#İngilizce"].filter(Boolean).slice(0, 5);
  const bosluk = Array(6).fill("⠀").join("\n");
  return [
    ortakGovde(soru),
    ``,
    soru.sinyal ? `Sinyal: "${soru.sinyal}"` : null,
    ``,
    `👇 Cevabı görmeden önce kendi cevabını düşün`,
    bosluk,
    `Doğru cevap: ${dogruHarf}`,
    soru.aciklama_tr,
    ``,
    `💙 Bunun gibi yüzlerce soru sinyal-avcisi.com'da tamamen ücretsiz — link bio'da.`,
    ``,
    hashtags.join(" "),
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function facebookCaptionOlustur(soru) {
  return [ortakGovde(soru), ``, `Cevap ve açıklama ilk yorumda 👇`].join("\n");
}

function facebookFirstComment(soru, dogruHarf) {
  return `Doğru cevap: ${dogruHarf}\n\n${soru.aciklama_tr}\n\n💙 sinyal-avcisi.com'da tamamen ücretsiz pratik yap.`;
}

async function publishInstagram(item, imageUrl, caption) {
  const channel = await findBufferChannel("instagram");
  if (!channel) throw new Error("Bağlı bir Instagram kanalı bulunamadı.");

  const mutation = `
    mutation {
      createPost(input: {
        text: ${JSON.stringify(caption)}
        channelId: "${channel.id}"
        schedulingType: automatic
        mode: customScheduled
        dueAt: "${dueAtIso()}"
        assets: [{ image: { url: "${imageUrl}" } }]
        metadata: { instagram: { type: post, shouldShareToFeed: true } }
      }) {
        ... on PostActionSuccess { post { id text dueAt status } }
        ... on MutationError { message }
      }
    }
  `;
  const data = await bufferGraphQL(mutation);
  const result = data?.createPost;
  if (!result || result.message) {
    throw new Error(`Instagram post oluşturulamadı: ${result?.message ?? "boş yanıt"}`);
  }
  return result.post;
}

async function publishFacebook(item, imageUrl, caption, firstComment) {
  const channel = await findBufferChannel("facebook");
  if (!channel) throw new Error("Bağlı bir Facebook kanalı bulunamadı.");

  const mutation = `
    mutation {
      createPost(input: {
        text: ${JSON.stringify(caption)}
        channelId: "${channel.id}"
        schedulingType: automatic
        mode: customScheduled
        dueAt: "${dueAtIso()}"
        assets: [{ image: { url: "${imageUrl}" } }]
        metadata: { facebook: { type: post, firstComment: ${JSON.stringify(firstComment)} } }
      }) {
        ... on PostActionSuccess { post { id text dueAt status } }
        ... on MutationError { message }
      }
    }
  `;
  const data = await bufferGraphQL(mutation);
  const result = data?.createPost;
  if (!result || result.message) {
    throw new Error(`Facebook post oluşturulamadı: ${result?.message ?? "boş yanıt"}`);
  }
  return result.post;
}

export async function yayinla() {
  if (!BUFFER_ACCESS_TOKEN) throw new Error("BUFFER_ACCESS_TOKEN env değişkeni tanımlı değil");
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN env değişkeni tanımlı değil");
  if (!GITHUB_REPOSITORY) throw new Error("GITHUB_REPOSITORY env değişkeni tanımlı değil");

  const meta = JSON.parse(await readFile(path.join(OUT_DIR, "gunun-sorusu-meta.json"), "utf-8"));
  const { soru, dogruHarf } = meta;

  const dateTag = `${RELEASE_TAG_PREFIX}-${new Date().toISOString().slice(0, 10)}`;
  const release = await getOrCreateRelease(dateTag);
  const imageUrl = await uploadReleaseAsset(
    release,
    path.join(OUT_DIR, "gunun-sorusu.png"),
    "gunun-sorusu.png",
    "image/png"
  );
  console.log("Kart herkese açık URL:", imageUrl);

  const igCaption = instagramCaptionOlustur(soru, dogruHarf);
  const fbCaption = facebookCaptionOlustur(soru);
  const fbFirstComment = facebookFirstComment(soru, dogruHarf);

  const [igResult, fbResult] = await Promise.allSettled([
    publishInstagram(soru, imageUrl, igCaption),
    publishFacebook(soru, imageUrl, fbCaption, fbFirstComment),
  ]);

  const sonuc = {
    sinyal: soru.sinyal,
    dogruHarf,
    instagram: igResult.status === "fulfilled" ? igResult.value : { error: igResult.reason?.message },
    facebook: fbResult.status === "fulfilled" ? fbResult.value : { error: fbResult.reason?.message },
  };
  await writeFile(path.join(OUT_DIR, "gunun-sorusu-result.json"), JSON.stringify(sonuc, null, 2));
  console.log(JSON.stringify(sonuc, null, 2));

  // İkisi de başarısız olduysa iş görünür şekilde başarısız olsun.
  if (igResult.status === "rejected" && fbResult.status === "rejected") {
    throw new Error(
      `Her iki platform da başarısız: IG=${igResult.reason?.message} FB=${fbResult.reason?.message}`
    );
  }
  return sonuc;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  yayinla().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
