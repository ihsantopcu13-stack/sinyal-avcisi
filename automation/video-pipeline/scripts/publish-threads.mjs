// ============================================================
// THREADS'E BUFFER ÜZERİNDEN YAYINLA — generate-threads-post.mjs'in
// ürettiği out/threads-post.json'daki metni Threads kanalına gönderir.
//
// Görsel/video gerekmediği için diğer scriptlerin aksine GitHub Release
// barındırma adımı YOK — sadece düz metin paylaşımı.
//
// Gerekli env: BUFFER_ACCESS_TOKEN
// ============================================================

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Testler gerçek out/ dosyalarına DOKUNMADAN izole çalışabilsin diye
// opsiyonel bir override — normal pipeline çalışmasında bu env
// değişkeni hiç set edilmez, davranış değişmez.
const OUT_DIR = process.env.PIPELINE_OUT_DIR_OVERRIDE || path.join(__dirname, "..", "out");

const BUFFER_ACCESS_TOKEN = process.env.BUFFER_ACCESS_TOKEN;

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

// Kalıcı config eksikliğini (Threads kanalı hiç bağlanmamış) transient/
// gerçek API hatalarından ayırmak için özel bir tip — SADECE
// threadsYayinla() bunu yakalayıp SKIPPED'e çevirir; bufferGraphQL()'den
// gelen network/auth/500/rate-limit hataları bu sınıfa GİRMEZ, olduğu
// gibi fırlar.
class ChannelNotConfiguredError extends Error {
  constructor(message) {
    super(message);
    this.name = "ChannelNotConfiguredError";
  }
}

async function findThreadsChannel() {
  const accountData = await bufferGraphQL("{ account { organizations { id } } }");
  const organizations = accountData?.account?.organizations ?? [];
  const hepsiKanallar = [];
  for (const org of organizations) {
    const channelsData = await bufferGraphQL(
      `{ channels(input: { organizationId: "${org.id}" }) { id name service } }`
    );
    const channels = channelsData?.channels ?? [];
    hepsiKanallar.push(...channels);
    const match = channels.find((c) => c.service === "threads");
    if (match) return match;
  }
  // Bulunamadıysa hata ayıklama için bağlı TÜM kanalları (id/isim/servis) logla
  // — "threads" servis adı yanlış tahmin mi, yoksa kanal gerçekten yok mu
  // tek çalıştırmada anlaşılsın.
  console.error("Bağlı kanallar:", JSON.stringify(hepsiKanallar, null, 2));
  throw new ChannelNotConfiguredError("Threads channel not configured");
}

function dueAtIso() {
  return new Date(Date.now() + 60_000).toISOString();
}

async function publishToBuffer(channelId, text) {
  const mutation = `
    mutation {
      createPost(input: {
        text: ${JSON.stringify(text)}
        channelId: "${channelId}"
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
    throw new Error(`Threads post oluşturulamadı: ${result?.message ?? "boş yanıt"}`);
  }
  return result.post;
}

export async function threadsYayinla() {
  if (!BUFFER_ACCESS_TOKEN) throw new Error("BUFFER_ACCESS_TOKEN env değişkeni tanımlı değil");

  const { metin } = JSON.parse(await readFile(path.join(OUT_DIR, "threads-post.json"), "utf-8"));

  let channel;
  try {
    channel = await findThreadsChannel();
  } catch (err) {
    if (err instanceof ChannelNotConfiguredError) {
      const skip = { skipped: true, reason: "Threads channel not configured", skippedAt: new Date().toISOString() };
      await writeFile(path.join(OUT_DIR, "threads-result.json"), JSON.stringify(skip, null, 2));
      console.log("Atlandı (Threads): Threads channel not configured");
      return skip;
    }
    throw err;
  }
  console.log(`Bağlı Threads kanalı: ${channel.name} (${channel.id})`);

  const post = await publishToBuffer(channel.id, metin);
  await writeFile(path.join(OUT_DIR, "threads-result.json"), JSON.stringify(post, null, 2));
  console.log("Threads'e Buffer üzerinden gönderildi:", post.id, post.status, post.dueAt);
  return post;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  threadsYayinla().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
