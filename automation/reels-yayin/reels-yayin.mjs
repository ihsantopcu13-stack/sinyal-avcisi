// ============================================================
// REELS OTOMATİK YAYIN — Instagram ve Facebook Sayfası (Buffer üzerinden),
// YouTube Shorts (YouTube Data API). GitHub Actions (reels-yayin.yml) günde
// 3 kez (08:30, 13:00, 21:00 TR) çalıştırır; her çalışma kuyruktaki SIRADAKİ
// konuyu üç platforma sırayla gönderir.
// ============================================================
// Modlar (REELS_MOD):
//   deneme  — HİÇBİR ŞEY PAYLAŞMAZ. Anahtarları, Buffer'daki Instagram ve
//             Facebook kanallarını, Buffer şemasının desteklediği alanları,
//             YouTube token'ını ve sıradaki konunun medyasını kontrol eder;
//             gönderilecek metni loga yazar.
//   yayinla — Gerçek paylaşım. Zamanlanmış çalışmalar SADECE repo
//             değişkeni REELS_YAYIN=acik ise bu moda geçer.
//
// Instagram/Facebook: Buffer GraphQL API (upload-instagram-buffer.mjs ile
// aynı yaklaşım). Video GitHub Release'teki herkese açık adresiyle verilir
// (günlük video hattı da Buffer'a bu adresleri veriyor). Buffer Instagram'da
// kapak görseli kabul etmiyor; kapak videonun ilk karesi (kanca kartı) olur.
// Instagram'ın yapay zekâ etiketi Buffer'ın isAiGenerated alanıyla işaretlenir;
// beyan ayrıca açıklamada da yazar. Facebook Reels türü, "ilk yorum" ve
// isAiGenerated alanları Buffer şemasından (introspection) okunur; şema
// desteklemiyorsa o alan gönderilmez.
// YouTube: dosya yüklenir, "değiştirilmiş/sentetik içerik" beyanı
// (status.containsSyntheticMedia) işaretlenir.
//
// İlerleme data/durum.json'da platform platform tutulur (kurallar:
// kuyruk-mantigi.mjs). Instagram/Facebook kuyruğu YouTube'u BEKLEMEZ;
// YouTube'a gidemeyen konular durum.youtube_bekleyen listesinde kalır ve
// YouTube düzelince eskiden yeniye yüklenir (hiçbir konu kalıcı atlanmaz).
//
// Gerekli env: BUFFER_ACCESS_TOKEN, YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET,
//   YOUTUBE_REFRESH_TOKEN, GITHUB_TOKEN, GITHUB_REPOSITORY
// ============================================================

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_DENEME, YT_CALISMA_BASINA, durumHazirla, siradaki, youtubeBekleyeneEkle, youtubeSiradakiler, youtubeTamamlandi } from "./kuyruk-mantigi.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KUYRUK_YOLU = path.join(__dirname, "data", "kuyruk.json");
const DURUM_YOLU = process.env.REELS_DURUM_YOLU || path.join(__dirname, "data", "durum.json");
const INDIRME_DIZINI = path.join(__dirname, ".medya");

const MOD = (process.env.REELS_MOD || "deneme").trim();
const RELEASE_TAG = "reels-medya-v1";
const BUFFER_URL = "https://api.buffer.com";

const env = process.env;

// ---------------- yardımcılar ----------------

function log(...a) { console.log(new Date().toISOString().slice(11, 19), ...a); }

async function jsonOku(yol, varsayilan) {
  try { return JSON.parse(await readFile(yol, "utf-8")); } catch { return varsayilan; }
}

async function buffer(query) {
  const res = await fetch(BUFFER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.BUFFER_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) throw new Error(`Buffer GraphQL: ${res.status} ${JSON.stringify(json.errors ?? json).slice(0, 400)}`);
  return json.data;
}

// Buffer'daki kanalları servis adına göre döndürür: { instagram: {...}, facebook: {...} }
async function bufferKanallari() {
  const hesap = await buffer("{ account { organizations { id name } } }");
  const kanallar = {};
  for (const org of hesap?.account?.organizations ?? []) {
    const v = await buffer(`{ channels(input: { organizationId: "${org.id}" }) { id name service } }`);
    for (const k of v?.channels ?? []) if (!kanallar[k.service]) kanallar[k.service] = k;
  }
  return kanallar;
}

// Buffer şemasından createPost metadata'sında instagram/facebook için hangi alanların
// (ve facebook "type" için hangi değerlerin) desteklendiğini okur. Okunamazsa null.
async function bufferSemasi() {
  const tip = async (ad) => (await buffer(`{ __type(name: "${ad}") { name kind inputFields { name type { name kind ofType { name kind ofType { name } } } } enumValues { name } } }`))?.__type;
  const adi = (t) => t?.name || t?.ofType?.name || t?.ofType?.ofType?.name;
  try {
    const giris = await tip("CreatePostInput");
    const meta = giris?.inputFields?.find((f) => f.name === "metadata");
    if (!meta) return null;
    const metaTip = await tip(adi(meta.type));
    const sonuc = {};
    for (const servis of ["instagram", "facebook"]) {
      const alan = metaTip?.inputFields?.find((f) => f.name === servis);
      if (!alan) { sonuc[servis] = null; continue; }
      const t = await tip(adi(alan.type));
      const alanlar = Object.fromEntries((t?.inputFields ?? []).map((f) => [f.name, adi(f.type)]));
      const typeEnum = alanlar.type ? ((await tip(alanlar.type))?.enumValues ?? []).map((e) => e.name) : [];
      sonuc[servis] = { alanlar: Object.keys(alanlar), typeDegerleri: typeEnum };
    }
    return sonuc;
  } catch {
    return null; // introspection kapalı olabilir; yayında güvenli varsayılanlar kullanılır
  }
}

// "ilk yorum" alanının Buffer'daki adı (şemada varsa)
function ilkYorumAlani(servisSemasi) {
  return (servisSemasi?.alanlar ?? []).find((a) => /^first_?comment$/i.test(a)) || null;
}

// GraphQL literal: { tur: E("reel") } → enum, diğerleri JSON
const E = (deger) => ({ __enum: deger });
function gql(v) {
  if (v && typeof v === "object" && "__enum" in v) return v.__enum;
  if (Array.isArray(v)) return `[${v.map(gql).join(", ")}]`;
  if (v && typeof v === "object") return `{ ${Object.entries(v).map(([k, x]) => `${k}: ${gql(x)}`).join(", ")} }`;
  return JSON.stringify(v);
}

async function ghApi(yol, secenek = {}) {
  return fetch(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}${yol}`, {
    ...secenek,
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...secenek.headers },
  });
}

async function releaseAssetleri() {
  const res = await ghApi(`/releases/tags/${RELEASE_TAG}`);
  if (!res.ok) throw new Error(`GitHub Release "${RELEASE_TAG}" bulunamadı (${res.status}) — medya henüz yüklenmemiş`);
  const rel = await res.json();
  return Object.fromEntries((rel.assets || []).map((a) => [a.name, a]));
}

async function assetIndir(asset) {
  await mkdir(INDIRME_DIZINI, { recursive: true });
  const hedef = path.join(INDIRME_DIZINI, asset.name);
  const res = await fetch(asset.url, { headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/octet-stream" } });
  if (!res.ok) throw new Error(`${asset.name} indirilemedi: ${res.status}`);
  await writeFile(hedef, Buffer.from(await res.arrayBuffer()));
  return hedef;
}

async function youtubeAuth() {
  const { google } = await import("googleapis");
  const client = new google.auth.OAuth2(env.YOUTUBE_CLIENT_ID, env.YOUTUBE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: env.YOUTUBE_REFRESH_TOKEN });
  return { google, client };
}

// ---------------- DENEME MODU ----------------

async function deneme(kuyruk, durum) {
  const sonuc = [];
  // gerekenler: bu kontrolün ihtiyaç duyduğu anahtarlar; biri yoksa API hiç çağrılmaz
  const kontrol = async (ad, fn, gerekenler = []) => {
    const yok = gerekenler.filter((k) => !env[k]);
    if (yok.length) { sonuc.push({ ad, ok: false }); log(`✘ ${ad}: atlandı — eksik anahtar: ${yok.join(", ")}`); return; }
    try { const m = await fn(); sonuc.push({ ad, ok: true }); log(`✔ ${ad}: ${m}`); }
    catch (e) { sonuc.push({ ad, ok: false }); log(`✘ ${ad}: ${e.message}`); }
  };
  const BUF = ["BUFFER_ACCESS_TOKEN"], YT = ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"];

  await kontrol("Anahtarlar", async () => {
    const eksik = [...BUF, ...YT, "GITHUB_TOKEN"].filter((k) => !env[k]);
    if (eksik.length) throw new Error("eksik: " + eksik.join(", "));
    return "hepsi tanımlı";
  });

  let kanallar = {};
  await kontrol("Buffer bağlantısı", async () => {
    kanallar = await bufferKanallari();
    const liste = Object.values(kanallar).map((k) => `${k.service}: ${k.name}`);
    return liste.length ? `kanallar — ${liste.join(", ")}` : "hiç kanal yok";
  }, BUF);
  await kontrol("Buffer Instagram kanalı", async () => {
    if (!kanallar.instagram) throw new Error("Buffer'da bağlı Instagram kanalı yok");
    return `${kanallar.instagram.name} (${kanallar.instagram.id})`;
  }, BUF);
  await kontrol("Buffer Facebook Sayfası kanalı", async () => {
    if (!kanallar.facebook) throw new Error("Buffer'da bağlı Facebook kanalı yok — README'deki \"Buffer'a Facebook Sayfası bağlama\" adımlarını izle");
    return `${kanallar.facebook.name} (${kanallar.facebook.id})`;
  }, BUF);
  await kontrol("Buffer şeması", async () => {
    const s = await bufferSemasi();
    if (!s) return "şema okunamadı (introspection kapalı) — yayında Instagram için Reels, Facebook için önce Reels sonra normal video denenir; ilk yorum gönderilmez";
    const ig = s.instagram, fb = s.facebook;
    return [
      `Instagram alanları: ${ig?.alanlar?.join(", ") || "yok"} (tür: ${ig?.typeDegerleri?.join("/") || "?"})`,
      `Facebook alanları: ${fb?.alanlar?.join(", ") || "yok"} (tür: ${fb?.typeDegerleri?.join("/") || "?"})`,
      `ilk yorum: Instagram=${ilkYorumAlani(ig) || "desteklenmiyor"}, Facebook=${ilkYorumAlani(fb) || "desteklenmiyor"}`,
      `Instagram yapay zekâ etiketi (isAiGenerated): ${ig?.alanlar?.includes("isAiGenerated") ? "işaretlenecek" : "desteklenmiyor"}`,
    ].join(" | ");
  }, BUF);
  await kontrol("YouTube", async () => {
    const { client } = await youtubeAuth();
    const { token } = await client.getAccessToken();
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
    const info = await r.json();
    if (!r.ok) throw new Error(`tokeninfo ${r.status}: ${JSON.stringify(info)}`);
    if (!String(info.scope || "").includes("youtube.upload")) throw new Error(`token'da youtube.upload izni yok: ${info.scope}`);
    return "refresh token geçerli, youtube.upload izni var";
  }, YT);

  const bekleyen = youtubeSiradakiler(durum, Infinity);
  log(`YouTube bekleyen: ${bekleyen.length ? bekleyen.map((k) => `Konu ${k}`).join(", ") : "yok"} (çalışma başına en fazla ${YT_CALISMA_BASINA} yüklenir)`);
  const s = siradaki(kuyruk, durum);
  if (!s) {
    log("Instagram/Facebook kuyruğu bitti.");
  } else {
    const { oge } = s;
    const kalan = [...s.kalan, "youtube (bekleyen sırasıyla)"];
    await kontrol(`Medya (Konu ${oge.konu})`, async () => {
      const a = await releaseAssetleri();
      if (!a[oge.video]) throw new Error(`Release'te ${oge.video} yok`);
      const r = await fetch(a[oge.video].browser_download_url, { method: "HEAD", redirect: "follow" });
      if (!r.ok) throw new Error(`herkese açık adres erişilemiyor: ${r.status}`);
      return `${oge.video} (${(a[oge.video].size / 1e6).toFixed(1)} MB), herkese açık adres erişilebilir`;
    }, ["GITHUB_TOKEN", "GITHUB_REPOSITORY"]);
    log(`\n—— Sıradaki: Konu ${oge.konu} — ${oge.baslik} → ${kalan.join(", ")} ——`);
    log("Instagram/Facebook açıklaması:\n" + oge.aciklama);
    log("İlk yorum (Buffer destekliyorsa):\n" + oge.ilk_yorum);
    log(`YouTube başlık: ${oge.youtube.baslik}`);
    log("Kapak: videonun ilk karesi · YouTube: sentetik içerik beyanı = EVET, çocuklara özel = HAYIR, kategori = Eğitim");
  }

  const hata = sonuc.filter((x) => !x.ok);
  log(`\nDENEME SONUCU: ${sonuc.length - hata.length}/${sonuc.length} kontrol geçti. Hiçbir şey paylaşılmadı.`);
  if (hata.length) process.exitCode = 1;
}

// ---------------- YAYIN ----------------

function dueAtIso() { return new Date(Date.now() + 60_000).toISOString(); } // Buffer geçmiş dueAt'i reddediyor

async function bufferGonder(kanal, oge, videoUrl, metadata) {
  const input = {
    text: oge.aciklama, channelId: kanal.id, schedulingType: E("automatic"), mode: E("customScheduled"),
    dueAt: dueAtIso(), assets: [{ video: { url: videoUrl } }],
  };
  if (metadata) input.metadata = metadata;
  const d = await buffer(`mutation { createPost(input: ${gql(input)}) {
      ... on PostActionSuccess { post { id dueAt status } }
      ... on MutationError { message } } }`);
  const r = d?.createPost;
  if (!r || r.message) throw new Error(`Buffer post oluşturulamadı: ${r?.message ?? "boş yanıt"}`);
  return { id: r.post.id, durum: r.post.status, zamanlandi: r.post.dueAt };
}

async function instagramYayinla(oge, videoUrl, kanallar, sema) {
  if (!kanallar.instagram) throw new Error("Buffer'da Instagram kanalı yok");
  const ig = { type: E("reel"), shouldShareToFeed: true };
  const yorum = ilkYorumAlani(sema?.instagram);
  if (yorum) ig[yorum] = oge.ilk_yorum;
  const yzEtiketi = Boolean(sema?.instagram?.alanlar?.includes("isAiGenerated"));
  if (yzEtiketi) ig.isAiGenerated = true; // Instagram'ın yapay zekâ etiketi
  return { ...(await bufferGonder(kanallar.instagram, oge, videoUrl, { instagram: ig })), ilkYorum: Boolean(yorum), yzEtiketi };
}

async function facebookYayinla(oge, videoUrl, kanallar, sema) {
  if (!kanallar.facebook) throw new Error("Buffer'da Facebook Sayfası kanalı yok");
  const fbSema = sema?.facebook;
  const reelVar = !sema || (fbSema?.typeDegerleri ?? []).some((t) => t.toLowerCase() === "reel");
  const fb = {};
  if (reelVar) fb.type = E(fbSema?.typeDegerleri?.find((t) => t.toLowerCase() === "reel") || "reel");
  const yorum = ilkYorumAlani(fbSema);
  if (yorum) fb[yorum] = oge.ilk_yorum;
  try {
    return { ...(await bufferGonder(kanallar.facebook, oge, videoUrl, Object.keys(fb).length ? { facebook: fb } : null)), tur: reelVar ? "reel" : "video", ilkYorum: Boolean(yorum) };
  } catch (e) {
    if (sema || !reelVar) throw e;
    log("Facebook Reels metadata'sı kabul edilmedi, normal video gönderisi deneniyor:", e.message);
    return { ...(await bufferGonder(kanallar.facebook, oge, videoUrl, null)), tur: "video", ilkYorum: false };
  }
}

async function youtubeYayinla(oge, assetler) {
  const { google, client } = await youtubeAuth();
  const yt = google.youtube({ version: "v3", auth: client });
  const yerel = await assetIndir(assetler[oge.video]);
  const r = await yt.videos.insert({
    part: "snippet,status",
    requestBody: {
      snippet: { title: oge.youtube.baslik, description: oge.youtube.aciklama, categoryId: "27", defaultLanguage: "tr", defaultAudioLanguage: "tr" },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false, containsSyntheticMedia: true },
    },
    media: { body: createReadStream(yerel) },
  });
  return { id: r.data.id, link: `https://youtube.com/shorts/${r.data.id}`, gizlilik: r.data.status?.privacyStatus };
}

async function yayinla(kuyruk, durum) {
  const s = siradaki(kuyruk, durum);
  const ytSira = () => youtubeSiradakiler(durum);
  if (!s && !ytSira().length) { log("Kuyruk bitti: Instagram/Facebook ve YouTube'da bekleyen konu yok."); return; }
  const assetler = await releaseAssetleri();
  const kaydet = () => writeFile(DURUM_YOLU, JSON.stringify(durum, null, 2) + "\n");
  let hataVar = false;

  // 1) Instagram + Facebook: sıradaki konu (YouTube'u beklemez)
  if (s) {
    const { oge, kalan } = s;
    log(`YAYIN: Konu ${oge.konu} — ${oge.baslik} → ${kalan.join(", ")}`);
    if (!assetler[oge.video]) throw new Error(`Release'te ${oge.video} yok`);
    const videoUrl = assetler[oge.video].browser_download_url;
    const kanallar = await bufferKanallari();
    const sema = await bufferSemasi();
    const islem = { instagram: () => instagramYayinla(oge, videoUrl, kanallar, sema), facebook: () => facebookYayinla(oge, videoUrl, kanallar, sema) };
    const d = (durum.konular[oge.konu] ||= {});
    for (const p of kalan) {
      const kayit = (d[p] ||= { deneme: 0 });
      kayit.deneme += 1;
      try {
        Object.assign(kayit, await islem[p](), { tamam: true, zaman: new Date().toISOString() });
        delete kayit.hata;
        log(`✔ ${p}: Buffer ${kayit.id} (${kayit.durum}, ${kayit.zamanlandi})`);
      } catch (e) {
        kayit.hata = e.message.slice(0, 500);
        hataVar = true;
        log(`✘ ${p} (deneme ${kayit.deneme}/${MAX_DENEME}): ${e.message}`);
      }
      await kaydet();
    }
    youtubeBekleyeneEkle(durum, oge.konu); // YouTube ayrı sırada
    await kaydet();
  }

  // 2) YouTube: bekleyenler eskiden yeniye; ilk hatada durur (bağlantı sorunu tüm konuları etkiler)
  const ytListe = ytSira();
  if (ytListe.length) log(`YouTube bekleyen: ${durum.youtube_bekleyen.map((k) => `Konu ${k}`).join(", ")} → bu çalışmada: ${ytListe.join(", ")}`);
  for (const konu of ytListe) {
    const oge = kuyruk.ogeler.find((o) => o.konu === konu);
    const kayit = ((durum.konular[konu] ||= {}).youtube ||= { deneme: 0 });
    kayit.deneme += 1;
    try {
      if (!oge) throw new Error(`Konu ${konu} kuyrukta yok`);
      if (!assetler[oge.video]) throw new Error(`Release'te ${oge.video} yok`);
      Object.assign(kayit, await youtubeYayinla(oge, assetler), { tamam: true, zaman: new Date().toISOString() });
      delete kayit.hata;
      youtubeTamamlandi(durum, konu);
      log(`✔ youtube (Konu ${konu}): ${kayit.link} (${kayit.gizlilik})`);
      await kaydet();
    } catch (e) {
      kayit.hata = e.message.slice(0, 500);
      hataVar = true;
      log(`✘ youtube (Konu ${konu}, deneme ${kayit.deneme}): ${e.message} — konu bekleyende kalır`);
      await kaydet();
      break;
    }
  }
  if (hataVar) process.exitCode = 1;
}

// ---------------- giriş ----------------

const kuyruk = await jsonOku(KUYRUK_YOLU, { ogeler: [] });
const durum = durumHazirla(await jsonOku(DURUM_YOLU, {}));
log(`Mod: ${MOD} — kuyrukta ${kuyruk.ogeler.length} konu`);
if (MOD === "yayinla") await yayinla(kuyruk, durum);
else await deneme(kuyruk, durum);
