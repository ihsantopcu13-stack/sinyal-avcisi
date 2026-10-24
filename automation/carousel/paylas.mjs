// INSTAGRAM CAROUSEL — gorseller/<klasor>/slide-*.png dosyalarını Buffer üzerinden
// tek bir çok resimli Instagram gönderisi olarak ayar.json'daki saate zamanlar.
// mod "deneme": hiçbir şey paylaşmaz; kanalı, şemayı ve görsel adreslerini kontrol eder.
// mod "yayin": gönderiyi Buffer'a zamanlar.
// Görseller repo herkese açık olduğu için raw.githubusercontent adresinden verilir.
import { readFile, readdir } from "node:fs/promises";

const { BUFFER_ACCESS_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA } = process.env;
const ayar = JSON.parse(await readFile(new URL("./ayar.json", import.meta.url), "utf8"));

async function buffer(query) {
  const res = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: { Authorization: `Bearer ${BUFFER_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) throw new Error(`Buffer GraphQL: ${res.status} ${JSON.stringify(json.errors ?? json).slice(0, 600)}`);
  return json.data;
}

async function instagramKanali() {
  const hesap = await buffer("{ account { organizations { id } } }");
  for (const org of hesap?.account?.organizations ?? []) {
    const v = await buffer(`{ channels(input: { organizationId: "${org.id}" }) { id name service } }`);
    const k = (v?.channels ?? []).find((c) => c.service === "instagram");
    if (k) return k;
  }
  throw new Error("Buffer'da bağlı Instagram kanalı yok");
}

const dosyalar = (await readdir(new URL(`./gorseller/${ayar.klasor}/`, import.meta.url)))
  .filter((d) => /^slide-\d+\.png$/.test(d))
  .sort((a, b) => parseInt(a.slice(6)) - parseInt(b.slice(6)));
if (dosyalar.length < 2 || dosyalar.length > 10) throw new Error(`Carousel 2-10 görsel olmalı, ${dosyalar.length} bulundu`);
const adresler = dosyalar.map((d) => `https://raw.githubusercontent.com/${GITHUB_REPOSITORY}/${GITHUB_SHA}/automation/carousel/gorseller/${ayar.klasor}/${d}`);

for (const a of adresler) {
  const r = await fetch(a, { method: "HEAD" });
  if (!r.ok) throw new Error(`Görsel açılmıyor (${r.status}): ${a}`);
}
console.log("Görseller:", adresler.join("\n"));

const kanal = await instagramKanali();
console.log("Instagram kanalı:", kanal.name);
const dueAt = new Date(ayar.saat).toISOString();
if (Date.parse(dueAt) < Date.now() + 10 * 60_000) throw new Error(`Saat en az 10 dk ileride olmalı: ${ayar.saat}`);

if (ayar.mod !== "yayin") {
  const t = await buffer(`{ __type(name: "InstagramPostType") { enumValues { name } } }`).catch((e) => ({ hata: e.message }));
  console.log("Instagram gönderi türleri:", JSON.stringify(t));
  console.log(`DENEME: yayında ${dosyalar.length} görsel ${dueAt} için zamanlanırdı. Açıklama:\n${ayar.aciklama}`);
  process.exit(0);
}

const assets = adresler.map((url) => `{ image: { url: ${JSON.stringify(url)} } }`).join(", ");
const d = await buffer(`mutation { createPost(input: {
    text: ${JSON.stringify(ayar.aciklama)}
    channelId: "${kanal.id}"
    schedulingType: automatic
    mode: customScheduled
    dueAt: "${dueAt}"
    assets: [${assets}]
    metadata: { instagram: { type: carousel, shouldShareToFeed: true } }
  }) {
    ... on PostActionSuccess { post { id dueAt status } }
    ... on MutationError { message } } }`);
const r = d?.createPost;
if (!r || r.message) throw new Error(`Buffer post oluşturulamadı: ${r?.message ?? "boş yanıt"}`);
console.log("ZAMANLANDI:", JSON.stringify(r.post));
