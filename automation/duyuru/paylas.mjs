// TEK SEFERLİK DUYURU — ayar.json'daki metinleri Buffer (Instagram, Facebook,
// Threads) ve Telegram kanalına gönderir. duyuru-paylas dalına ayar.json
// push'lanınca çalışır (.github/workflows/duyuru-paylas.yml).
//   mod "deneme": hiçbir şey paylaşmaz; kanalları, görseli, metin uzunluklarını kontrol eder.
//   mod "yayin":  Buffer gönderilerini ayar.saat'e zamanlar, Telegram'a hemen gönderir.
// Her platform ayrı denenir; biri hata verirse diğerleri yine gönderilir.
import { readFile } from "node:fs/promises";
import { telegramIstemci } from "../telegram-yayin/telegram-istemci.mjs";

const { BUFFER_ACCESS_TOKEN, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, GITHUB_REPOSITORY, GITHUB_SHA } = process.env;
const ayar = JSON.parse(await readFile(new URL("./ayar.json", import.meta.url), "utf8"));
const M = ayar.metinler || {};
const gorselYolu = `automation/duyuru/gorseller/${ayar.gorsel}`;
const gorselUrl = `https://raw.githubusercontent.com/${GITHUB_REPOSITORY}/${GITHUB_SHA}/${gorselYolu}`;
const YAYIN = ayar.mod === "yayin";

async function buffer(query) {
  const res = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: { Authorization: `Bearer ${BUFFER_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) throw new Error(`Buffer GraphQL: ${res.status} ${JSON.stringify(json.errors ?? json).slice(0, 500)}`);
  return json.data;
}

async function kanallar() {
  const out = {};
  const hesap = await buffer("{ account { organizations { id } } }");
  for (const org of hesap?.account?.organizations ?? []) {
    const v = await buffer(`{ channels(input: { organizationId: "${org.id}" }) { id name service } }`);
    for (const k of v?.channels ?? []) if (!out[k.service]) out[k.service] = k;
  }
  return out;
}

async function bufferGonder(kanal, metin, dueAt, ekler) {
  const d = await buffer(`mutation { createPost(input: {
      text: ${JSON.stringify(metin)}
      channelId: "${kanal.id}"
      schedulingType: automatic
      mode: customScheduled
      dueAt: "${dueAt}"
      ${ekler}
    }) {
      ... on PostActionSuccess { post { id dueAt status } }
      ... on MutationError { message } } }`);
  const r = d?.createPost;
  if (!r || r.message) throw new Error(r?.message ?? "boş yanıt");
  return r.post;
}

const sonuc = {};
const dueAt = new Date(ayar.saat).toISOString();
if (YAYIN && Date.parse(dueAt) < Date.now() + 5 * 60_000) throw new Error(`Saat en az 5 dk ileride olmalı: ${ayar.saat}`);

const g = await fetch(gorselUrl, { method: "HEAD" });
if (!g.ok) throw new Error(`Görsel açılmıyor (${g.status}): ${gorselUrl}`);
console.log("Görsel:", gorselUrl);
for (const [p, t] of Object.entries(M)) console.log(`${p}: ${[...t].length} karakter`);
if (M.threads && [...M.threads].length > 500) throw new Error("Threads metni 500 karakteri aşıyor");
if (M.telegram && [...M.telegram].length > 1024) throw new Error("Telegram foto açıklaması 1024 karakteri aşıyor");

const k = await kanallar();
console.log("Buffer kanalları:", Object.entries(k).map(([s, c]) => `${s}=${c.name}`).join(", "));
const resim = `assets: [{ image: { url: ${JSON.stringify(gorselUrl)} } }]`;
const isler = {
  instagram: () => bufferGonder(k.instagram, M.instagram, dueAt, `${resim}\n metadata: { instagram: { type: post, shouldShareToFeed: true } }`),
  facebook: () => bufferGonder(k.facebook, M.facebook, dueAt, `${resim}\n metadata: { facebook: { type: post } }`),
  threads: () => bufferGonder(k.threads, M.threads, dueAt, ""),
};
for (const [p, is] of Object.entries(isler)) {
  if (!M[p]) continue;
  if (!k[p]) { sonuc[p] = "HATA: Buffer'da kanal yok"; continue; }
  if (!YAYIN) { sonuc[p] = `deneme: ${dueAt} için zamanlanırdı (${k[p].name})`; continue; }
  try { const r = await is(); sonuc[p] = `zamanlandı ${r.id} ${r.status} ${r.dueAt}`; }
  catch (e) { sonuc[p] = `HATA: ${e.message}`; }
}

if (M.telegram) {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) throw new Error("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID yok");
    const tg = telegramIstemci(TELEGRAM_BOT_TOKEN);
    const kk = await tg.kanalKontrol(TELEGRAM_CHAT_ID);
    if (!YAYIN) sonuc.telegram = `deneme: ${kk.kanal} kanalına ${kk.bot} ile gönderilirdi`;
    else {
      const buf = Buffer.from(await (await fetch(gorselUrl)).arrayBuffer());
      const m = await tg.fotoGonder(TELEGRAM_CHAT_ID, buf, "duyuru.png", { caption: M.telegram, disable_notification: true });
      sonuc.telegram = `gönderildi (mesaj ${m.message_id}, ${kk.kanal})`;
    }
  } catch (e) { sonuc.telegram = `HATA: ${e.message}`; }
}

console.log("SONUÇ:", JSON.stringify(sonuc, null, 2));
if (Object.values(sonuc).some((v) => String(v).startsWith("HATA"))) process.exit(1);
