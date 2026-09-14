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
const OUT_DIR = path.join(__dirname, "..", "out");

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
  throw new Error("Bağlı bir Threads kanalı bulunamadı.");
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

  const channel = await findThreadsChannel();
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
