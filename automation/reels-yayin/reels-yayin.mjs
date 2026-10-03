// ============================================================
// REELS OTOMATİK YAYIN — Instagram (Graph API), Facebook Sayfası (Reels),
// YouTube Shorts. GitHub Actions (reels-yayin.yml) günde 3 kez çalıştırır;
// her çalışma kuyruktaki SIRADAKİ konuyu üç platforma sırayla gönderir.
// ============================================================
// Modlar (REELS_MOD):
//   deneme  — HİÇBİR ŞEY PAYLAŞMAZ. Anahtarları, hesap bağlantılarını,
//             medya dosyasını ve gönderilecek metni kontrol edip raporlar.
//   yayinla — Gerçek paylaşım. Zamanlanmış çalışmalar SADECE repo
//             değişkeni REELS_YAYIN=acik ise bu moda geçer.
//
// Medya: videolar/kapaklar GitHub Release'te (RELEASE_TAG) durur. Instagram
// ve Facebook dosya kabul etmez, herkese açık DOĞRUDAN bir adres ister —
// Release adresleri yönlendirmeli olduğu için yayından önce dosya Vercel
// Blob'a kopyalanır (bir kez; adres durum.json'a yazılır). YouTube'a
// dosyanın kendisi yüklenir ve "değiştirilmiş/sentetik içerik" beyanı
// (status.containsSyntheticMedia) işaretlenir.
//
// İlerleme data/durum.json'da platform platform tutulur: bir platform
// başarısız olursa diğerleri tekrar gönderilmez, sadece o platform bir
// sonraki çalışmada yeniden denenir (en fazla MAX_DENEME kez).
//
// Akış PR #2'deki (feat/instagram-otomasyonu) Graph API deseninin video
// sürümüdür: container → hazır olana kadar bekle → yayınla.
//
// Gerekli env: META_ACCESS_TOKEN, IG_USER_ID, FB_PAGE_ID,
//   YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN,
//   BLOB_READ_WRITE_TOKEN, GITHUB_TOKEN, GITHUB_REPOSITORY
// ============================================================

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KUYRUK_YOLU = path.join(__dirname, "data", "kuyruk.json");
const DURUM_YOLU = process.env.REELS_DURUM_YOLU || path.join(__dirname, "data", "durum.json");
const INDIRME_DIZINI = path.join(__dirname, ".medya");

const MOD = (process.env.REELS_MOD || "deneme").trim();
const RELEASE_TAG = "reels-medya-v1";
const GRAPH = "https://graph.facebook.com/v23.0";
const MAX_DENEME = 3;
const PLATFORMLAR = ["instagram", "facebook", "youtube"];

const env = process.env;

// ---------------- yardımcılar ----------------

function log(...a) { console.log(new Date().toISOString().slice(11, 19), ...a); }
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

async function jsonOku(yol, varsayilan) {
  try { return JSON.parse(await readFile(yol, "utf-8")); } catch { return varsayilan; }
}

async function graph(metod, yol, params = {}, token) {
  const url = new URL(`${GRAPH}/${yol}`);
  const istek = { method: metod };
  if (metod === "GET") {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("access_token", token);
  } else {
    istek.headers = { "Content-Type": "application/json" };
    istek.body = JSON.stringify({ ...params, access_token: token });
  }
  const res = await fetch(url, istek);
  const veri = await res.json().catch(() => ({}));
  if (!res.ok || veri.error) {
    const e = veri.error || {};
    throw new Error(`Graph ${metod} /${yol}: ${res.status} ${e.type || ""} ${e.code || ""} ${e.message || JSON.stringify(veri)}`.trim());
  }
  return veri;
}

async function ghApi(yol, secenek = {}) {
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}${yol}`, {
    ...secenek,
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...secenek.headers },
  });
  return res;
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

// Sistem kullanıcısı / kullanıcı token'ından Sayfa token'ını al (Facebook Reels Sayfa token'ı ister)
async function sayfaTokeni() {
  const v = await graph("GET", env.FB_PAGE_ID, { fields: "id,name,access_token" }, env.META_ACCESS_TOKEN);
  if (!v.access_token) throw new Error("Sayfa token'ı alınamadı — token'ın bu Sayfa üzerinde yetkisi yok");
  return { token: v.access_token, ad: v.name };
}

// ---------------- kuyruk / durum ----------------

function siradaki(kuyruk, durum) {
  for (const oge of kuyruk.ogeler) {
    const d = durum.konular?.[oge.konu] || {};
    const kalan = PLATFORMLAR.filter((p) => !d[p]?.tamam && (d[p]?.deneme || 0) < MAX_DENEME);
    if (kalan.length) return { oge, kalan };
  }
  return null;
}

// ---------------- DENEME MODU ----------------

async function deneme(kuyruk, durum) {
  const sonuc = [];
  // gerekenler: bu kontrolün ihtiyaç duyduğu anahtarlar; biri yoksa API hiç çağrılmaz
  const kontrol = async (ad, fn, gerekenler = []) => {
    const yok = gerekenler.filter((k) => !env[k]);
    if (yok.length) { sonuc.push({ ad, ok: false, m: "atlandı" }); log(`✘ ${ad}: atlandı — eksik anahtar: ${yok.join(", ")}`); return; }
    try { const m = await fn(); sonuc.push({ ad, ok: true, m }); log(`✔ ${ad}: ${m}`); }
    catch (e) { sonuc.push({ ad, ok: false, m: e.message }); log(`✘ ${ad}: ${e.message}`); }
  };
  const META = ["META_ACCESS_TOKEN", "IG_USER_ID"], FB = ["META_ACCESS_TOKEN", "FB_PAGE_ID"];
  const YT = ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"];

  const gerekli = ["META_ACCESS_TOKEN", "IG_USER_ID", "FB_PAGE_ID", "YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN", "BLOB_READ_WRITE_TOKEN", "GITHUB_TOKEN"];
  await kontrol("Anahtarlar", async () => {
    const eksik = gerekli.filter((k) => !env[k]);
    if (eksik.length) throw new Error("eksik: " + eksik.join(", "));
    return "hepsi tanımlı";
  });

  await kontrol("Instagram hesabı", async () => {
    const v = await graph("GET", env.IG_USER_ID, { fields: "id,username,media_count" }, env.META_ACCESS_TOKEN);
    return `@${v.username} (${v.media_count} gönderi)`;
  }, META);
  await kontrol("Instagram yayın izni", async () => {
    const v = await graph("GET", `${env.IG_USER_ID}/content_publishing_limit`, { fields: "config,quota_usage" }, env.META_ACCESS_TOKEN);
    const q = v.data?.[0];
    return `24 saatte ${q?.quota_usage ?? "?"}/${q?.config?.quota_total ?? "?"} kullanıldı (instagram_content_publish izni var)`;
  }, META);
  await kontrol("Facebook Sayfası", async () => {
    const { ad, token } = await sayfaTokeni();
    const v = await graph("GET", `${env.FB_PAGE_ID}/video_reels`, { limit: "1" }, token);
    return `"${ad}" — Sayfa token'ı alındı, Reels uç noktası erişilebilir (${(v.data || []).length} örnek)`;
  }, FB);
  await kontrol("YouTube", async () => {
    const { client } = await youtubeAuth();
    const { token } = await client.getAccessToken();
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
    const info = await r.json();
    if (!r.ok) throw new Error(`tokeninfo ${r.status}: ${JSON.stringify(info)}`);
    if (!String(info.scope || "").includes("youtube.upload")) throw new Error(`token'da youtube.upload izni yok: ${info.scope}`);
    return `refresh token geçerli, youtube.upload izni var`;
  }, YT);
  await kontrol("Vercel Blob", async () => {
    const { list } = await import("@vercel/blob");
    const v = await list({ limit: 1, token: env.BLOB_READ_WRITE_TOKEN });
    return `token geçerli (${v.blobs.length} örnek dosya)`;
  }, ["BLOB_READ_WRITE_TOKEN"]);

  const s = siradaki(kuyruk, durum);
  if (!s) {
    log("Kuyruk bitti: yayınlanacak konu yok.");
  } else {
    const { oge, kalan } = s;
    await kontrol(`Medya (Konu ${oge.konu})`, async () => {
      const a = await releaseAssetleri();
      const eksik = [oge.video, oge.kapak].filter((n) => !a[n]);
      if (eksik.length) throw new Error(`Release'te eksik: ${eksik.join(", ")}`);
      return `${oge.video} (${(a[oge.video].size / 1e6).toFixed(1)} MB) + ${oge.kapak} hazır`;
    }, ["GITHUB_TOKEN", "GITHUB_REPOSITORY"]);
    log(`\n—— Sıradaki: Konu ${oge.konu} — ${oge.baslik} → ${kalan.join(", ")} ——`);
    log("Instagram/Facebook açıklaması:\n" + oge.aciklama);
    log("İlk yorum:\n" + oge.ilk_yorum);
    log(`YouTube başlık: ${oge.youtube.baslik}`);
    log("YouTube: sentetik içerik beyanı = EVET, çocuklara özel = HAYIR, kategori = Eğitim");
  }

  const hata = sonuc.filter((x) => !x.ok);
  log(`\nDENEME SONUCU: ${sonuc.length - hata.length}/${sonuc.length} kontrol geçti. Hiçbir şey paylaşılmadı.`);
  if (hata.length) process.exitCode = 1;
}

// ---------------- YAYIN ----------------

async function blobaKopyala(oge, durum, assetler) {
  const d = (durum.medya[oge.konu] ||= {});
  const { put } = await import("@vercel/blob");
  for (const [alan, ad, tip] of [["video_url", oge.video, "video/mp4"], ["kapak_url", oge.kapak, "image/png"]]) {
    if (d[alan]) continue;
    const yerel = await assetIndir(assetler[ad]);
    const v = await put(`reels/${ad}`, await readFile(yerel), {
      access: "public", contentType: tip, token: env.BLOB_READ_WRITE_TOKEN, addRandomSuffix: false, allowOverwrite: true,
    });
    d[alan] = v.url;
    log(`Blob: ${ad} → ${v.url}`);
  }
  return d;
}

async function instagramYayinla(oge, medya) {
  const tok = env.META_ACCESS_TOKEN;
  const kap = await graph("POST", `${env.IG_USER_ID}/media`, {
    media_type: "REELS", video_url: medya.video_url, cover_url: medya.kapak_url,
    caption: oge.aciklama, share_to_feed: true,
  }, tok);
  for (let i = 0; i < 60; i++) { // video işleme: en fazla ~10 dk
    const s = await graph("GET", kap.id, { fields: "status_code,status" }, tok);
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error(`container ${s.status_code}: ${s.status}`);
    if (i === 59) throw new Error("container 10 dk içinde hazır olmadı");
    await bekle(10_000);
  }
  const pub = await graph("POST", `${env.IG_USER_ID}/media_publish`, { creation_id: kap.id }, tok);
  const bilgi = await graph("GET", pub.id, { fields: "permalink" }, tok).catch(() => ({}));
  let yorum = null;
  try { yorum = (await graph("POST", `${pub.id}/comments`, { message: oge.ilk_yorum }, tok)).id; }
  catch (e) { log("Instagram ilk yorum eklenemedi (gönderi yayında):", e.message); }
  return { id: pub.id, link: bilgi.permalink || null, yorum };
}

async function facebookYayinla(oge, medya) {
  const { token } = await sayfaTokeni();
  const bas = await graph("POST", `${env.FB_PAGE_ID}/video_reels`, { upload_phase: "start" }, token);
  const yuk = await fetch(bas.upload_url, { method: "POST", headers: { Authorization: `OAuth ${token}`, file_url: medya.video_url } });
  const yukV = await yuk.json().catch(() => ({}));
  if (!yuk.ok || yukV.success === false) throw new Error(`Facebook yükleme: ${yuk.status} ${JSON.stringify(yukV)}`);
  await graph("POST", `${env.FB_PAGE_ID}/video_reels`, {
    upload_phase: "finish", video_id: bas.video_id, video_state: "PUBLISHED", description: oge.aciklama,
  }, token);
  let yorum = null;
  try { yorum = (await graph("POST", `${bas.video_id}/comments`, { message: oge.ilk_yorum }, token)).id; }
  catch (e) { log("Facebook ilk yorum eklenemedi (video yayında):", e.message); }
  return { id: bas.video_id, link: `https://www.facebook.com/reel/${bas.video_id}`, yorum };
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
  return { id: r.data.id, link: `https://youtube.com/shorts/${r.data.id}` };
}

async function yayinla(kuyruk, durum) {
  const s = siradaki(kuyruk, durum);
  if (!s) { log("Kuyruk bitti: yayınlanacak konu yok."); return; }
  const { oge, kalan } = s;
  log(`YAYIN: Konu ${oge.konu} — ${oge.baslik} → ${kalan.join(", ")}`);

  const assetler = await releaseAssetleri();
  const medya = await blobaKopyala(oge, durum, assetler);
  await writeFile(DURUM_YOLU, JSON.stringify(durum, null, 2) + "\n");

  const islem = { instagram: () => instagramYayinla(oge, medya), facebook: () => facebookYayinla(oge, medya), youtube: () => youtubeYayinla(oge, assetler) };
  const d = (durum.konular[oge.konu] ||= {});
  let hataVar = false;
  for (const p of kalan) {
    const kayit = (d[p] ||= { deneme: 0 });
    kayit.deneme += 1;
    try {
      Object.assign(kayit, await islem[p](), { tamam: true, zaman: new Date().toISOString() });
      delete kayit.hata;
      log(`✔ ${p}: ${kayit.link || kayit.id}`);
    } catch (e) {
      kayit.hata = e.message.slice(0, 500);
      hataVar = true;
      log(`✘ ${p} (deneme ${kayit.deneme}/${MAX_DENEME}): ${e.message}`);
    }
    await writeFile(DURUM_YOLU, JSON.stringify(durum, null, 2) + "\n"); // her platformdan sonra kaydet
  }
  if (hataVar) process.exitCode = 1;
}

// ---------------- giriş ----------------

const kuyruk = await jsonOku(KUYRUK_YOLU, { ogeler: [] });
const durum = await jsonOku(DURUM_YOLU, {});
durum.konular ||= {};
durum.medya ||= {};
log(`Mod: ${MOD} — kuyrukta ${kuyruk.ogeler.length} konu`);
if (MOD === "yayinla") await yayinla(kuyruk, durum);
else await deneme(kuyruk, durum);
