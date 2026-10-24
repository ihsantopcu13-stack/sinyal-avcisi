// INSTAGRAM CAROUSEL — gorseller/<klasor>/slide-*.png dosyalarını Buffer üzerinden
// tek bir çok resimli Instagram gönderisi olarak ayar.json'daki saate zamanlar.
// mod "deneme": hiçbir şey paylaşmaz; kanalı, şemayı ve görsel adreslerini kontrol eder.
// mod "yayin": gönderiyi Buffer'a zamanlar.
// Buffer Instagram için "carousel" türünü reddediyor; çok görselli "post" carousel olur.
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
if (ayar.mod === "simdi") {
  // Zamanlanmış gönderiyi (ayar.post_id) yeni gönderi açmadan hemen paylaşıma çevirir.
  const modTip = (await buffer(`{ __type(name: "EditPostInput") { inputFields { name type { name ofType { name } } } } }`))
    .__type.inputFields.find((f) => f.name === "mode").type;
  const modlar = ((await buffer(`{ __type(name: "${modTip.name || modTip.ofType.name}") { enumValues { name } } }`)).__type.enumValues ?? []).map((e) => e.name);
  console.log("Modlar:", modlar.join(", "));
  const hemen = modlar.includes("shareNow");
  const assets = adresler.map((url) => `{ image: { url: ${JSON.stringify(url)} } }`).join(", ");
  const d = await buffer(`mutation { editPost(input: {
      id: "${ayar.post_id}"
      text: ${JSON.stringify(ayar.aciklama)}
      schedulingType: automatic
      mode: ${hemen ? "shareNow" : "customScheduled"}
      ${hemen ? "" : `dueAt: "${new Date(Date.now() + 2 * 60_000).toISOString()}"`}
      assets: [${assets}]
      metadata: { instagram: { type: post, shouldShareToFeed: true } }
    }) {
      ... on PostActionSuccess { post { id dueAt status } }
      ... on MutationError { message } } }`);
  const r = d?.editPost;
  if (!r || r.message) throw new Error(`Buffer post düzenlenemedi: ${r?.message ?? "boş yanıt"}`);
  console.log("HEMEN:", JSON.stringify(r.post));
  process.exit(0);
}
if (Date.parse(dueAt) < Date.now() + 10 * 60_000) throw new Error(`Saat en az 10 dk ileride olmalı: ${ayar.saat}`);

if (ayar.mod === "sema") {
  const m = await buffer(`{ __schema { mutationType { fields { name args { name type { name kind ofType { name } } } } } } }`);
  for (const f of m.__schema.mutationType.fields.filter((f) => /post/i.test(f.name)))
    console.log("MUTATION", f.name, JSON.stringify(f.args.map((a) => [a.name, a.type.name || a.type.ofType?.name])));
  for (const ad of ["DeletePostInput", "EditPostInput", "UpdatePostInput", "SharePostNowInput"]) {
    const t = await buffer(`{ __type(name: "${ad}") { inputFields { name } } }`).catch(() => null);
    if (t?.__type) console.log("INPUT", ad, t.__type.inputFields.map((f) => f.name).join(", "));
  }
  process.exit(0);
}
if (ayar.mod !== "yayin") {
  // Buffer şemasından Instagram "type" değerlerini oku (carousel destekleniyor mu?)
  const tip = async (ad) => (await buffer(`{ __type(name: "${ad}") { inputFields { name type { name ofType { name ofType { name } } } } enumValues { name } } }`))?.__type;
  const adi = (t) => t?.name || t?.ofType?.name || t?.ofType?.ofType?.name;
  try {
    const meta = (await tip("CreatePostInput"))?.inputFields?.find((f) => f.name === "metadata");
    const ig = (await tip(adi(meta.type)))?.inputFields?.find((f) => f.name === "instagram");
    const igAlan = (await tip(adi(ig.type)))?.inputFields ?? [];
    console.log("Instagram alanları:", igAlan.map((f) => f.name).join(", "));
    const tur = igAlan.find((f) => f.name === "type");
    console.log("Instagram gönderi türleri:", ((await tip(adi(tur.type)))?.enumValues ?? []).map((e) => e.name).join(", "));
    const asset = (await tip("AssetsInput"))?.inputFields ?? (await tip(adi((await tip("CreatePostInput")).inputFields.find((f) => f.name === "assets").type)))?.inputFields;
    console.log("Asset alanları:", (asset ?? []).map((f) => f.name).join(", "));
  } catch (e) { console.log("Şema okunamadı:", e.message); }
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
    metadata: { instagram: { type: post, shouldShareToFeed: true } }
  }) {
    ... on PostActionSuccess { post { id dueAt status } }
    ... on MutationError { message } } }`);
const r = d?.createPost;
if (!r || r.message) throw new Error(`Buffer post oluşturulamadı: ${r?.message ?? "boş yanıt"}`);
console.log("ZAMANLANDI:", JSON.stringify(r.post));
