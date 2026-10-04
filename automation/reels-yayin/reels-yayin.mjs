// ============================================================
// REELS OTOMATİK YAYIN — Instagram ve Facebook Sayfası (Buffer üzerinden),
// YouTube Shorts (YouTube Data API). GitHub Actions (reels-yayin.yml) günde
// bir kez (21:00 TR) çalıştırır; çalışma önündeki yayın saatlerini (bugünün
// kalanı + yarın; 08:30, 13:00, 17:30 İstanbul) sıradaki konularla doldurup
// Buffer'a TAM O SAAT için zamanlanmış gönderir. GitHub'ın zamanlanmış işleri
// saatlerce geciktirmesi yayın saatini etkilemez (kurallar: kuyruk-mantigi.mjs).
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
import { MAX_DENEME, YT_CALISMA_BASINA, durumHazirla, planla, atamaSonucu, youtubeAcik, ilkYorumAcik, youtubeBekleyeneEkle, youtubeSiradakiler, youtubeTamamlandi } from "./kuyruk-mantigi.mjs";

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

// "ilk yorum" alanının Buffer'daki adı (şemada varsa VE BUFFER_ILK_YORUM=acik ise)
function ilkYorumAlani(servisSemasi) {
  if (!ilkYorumAcik(env)) return null; // Buffer ücretsiz planı ilk yorumu reddediyor ("requires a paid plan")
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
  // gerekenler: bu kontrolün ihtiyaç duyduğu anahtarlar; biri yoksa API hiç çağrılmaz.
  // kritik=false: sonuç raporlanır ama çalışmayı başarısız saymaz (YouTube bekletilirken).
  const kontrol = async (ad, fn, gerekenler = [], kritik = true) => {
    const isaret = kritik ? "✘" : "⚠";
    const yok = gerekenler.filter((k) => !env[k]);
    if (yok.length) { sonuc.push({ ad, ok: false, kritik }); log(`${isaret} ${ad}: atlandı — eksik anahtar: ${yok.join(", ")}`); return; }
    try { const m = await fn(); sonuc.push({ ad, ok: true, kritik }); log(`✔ ${ad}: ${m}`); }
    catch (e) { sonuc.push({ ad, ok: false, kritik }); log(`${isaret} ${ad}: ${e.message}${kritik ? "" : " (bilgi: YouTube bekletiliyor, çalışmayı başarısız saymaz)"}`); }
  };
  const BUF = ["BUFFER_ACCESS_TOKEN"], YT = ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"];
  const ytAcik = youtubeAcik(env);
  log(`YouTube yüklemesi: ${ytAcik ? "AÇIK" : "BEKLETİLİYOR (REELS_YOUTUBE≠acik) — konular bekleyen listesinde birikir"}`);

  await kontrol("Anahtarlar", async () => {
    const eksik = [...BUF, ...(ytAcik ? YT : []), "GITHUB_TOKEN"].filter((k) => !env[k]);
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
      ilkYorumAcik(env) ? `ilk yorum: Instagram=${ilkYorumAlani(ig) || "desteklenmiyor"}, Facebook=${ilkYorumAlani(fb) || "desteklenmiyor"}` : "ilk yorum: gönderilmiyor (BUFFER_ILK_YORUM≠acik)",
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
  }, YT, ytAcik);

  const bekleyen = youtubeSiradakiler(durum, Infinity);
  log(`YouTube bekleyen: ${bekleyen.length ? bekleyen.map((k) => `Konu ${k}`).join(", ") : "yok"} (çalışma başına en fazla ${YT_CALISMA_BASINA} yüklenir)`);
  const plan = planla(kuyruk, durum, new Date());
  if (!plan.length) {
    log("Önümüzdeki yayın saatleri zaten dolu ya da kuyruk bitti: Buffer'a gönderilecek yeni bir şey yok.");
  } else {
    const ilk = kuyruk.ogeler.find((o) => o.konu === plan[0].konu);
    await kontrol(`Medya (${plan.map((x) => `Konu ${x.konu}`).join(", ")})`, async () => {
      const a = await releaseAssetleri();
      const eksik = plan.map((x) => kuyruk.ogeler.find((o) => o.konu === x.konu).video).filter((v) => !a[v]);
      if (eksik.length) throw new Error(`Release'te eksik: ${eksik.join(", ")}`);
      const r = await fetch(a[ilk.video].browser_download_url, { method: "HEAD", redirect: "follow" });
      if (!r.ok) throw new Error(`herkese açık adres erişilemiyor: ${r.status}`);
      return `${plan.length} video Release'te, herkese açık adres erişilebilir`;
    }, ["GITHUB_TOKEN", "GITHUB_REPOSITORY"]);
    log("\n—— Bu çalışma yayın modunda olsaydı Buffer'a şunlar ZAMANLANIRDI ——");
    for (const x of plan) log(`  Konu ${x.konu} — ${istanbulSaati(x.dueAt)} → ${x.platformlar.join(", ")}${x.yeni ? "" : " (eksik platform)"}`);
    log(`YouTube: ${ytAcik ? "bekleyen sırasıyla yüklenir" : "bekletiliyor (konular bekleyen listesine girer)"}`);
    log("İlk konunun açıklaması:\n" + ilk.aciklama);
    log(ilkYorumAcik(env) ? "İlk yorum:\n" + ilk.ilk_yorum : "İlk yorum Buffer'a gönderilmez (BUFFER_ILK_YORUM≠acik); mini test elle yorumlanır.");
  }

  const kritikler = sonuc.filter((x) => x.kritik);
  const hata = kritikler.filter((x) => !x.ok);
  const bilgi = sonuc.filter((x) => !x.kritik && !x.ok).map((x) => x.ad);
  log(`\nDENEME SONUCU: ${kritikler.length - hata.length}/${kritikler.length} kontrol geçti${bilgi.length ? ` (bilgi amaçlı başarısız: ${bilgi.join(", ")})` : ""}. Hiçbir şey paylaşılmadı.`);
  if (hata.length) process.exitCode = 1;
}

// ---------------- YAYIN ----------------

// "2026-10-05T05:30:00.000Z" → "5 Eki 08:30" (İstanbul)
function istanbulSaati(iso) {
  return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// dueAt: Buffer'ın yayınlayacağı TAM saat (planla() verir; GitHub'ın gecikmesinden bağımsız)
async function bufferGonder(kanal, oge, videoUrl, metadata, dueAt) {
  const input = {
    text: oge.aciklama, channelId: kanal.id, schedulingType: E("automatic"), mode: E("customScheduled"),
    dueAt, assets: [{ video: { url: videoUrl } }],
  };
  if (metadata) input.metadata = metadata;
  const d = await buffer(`mutation { createPost(input: ${gql(input)}) {
      ... on PostActionSuccess { post { id dueAt status } }
      ... on MutationError { message } } }`);
  const r = d?.createPost;
  if (!r || r.message) throw new Error(`Buffer post oluşturulamadı: ${r?.message ?? "boş yanıt"}`);
  return { id: r.post.id, durum: r.post.status, zamanlandi: r.post.dueAt };
}

async function instagramYayinla(oge, videoUrl, kanallar, sema, dueAt) {
  if (!kanallar.instagram) throw new Error("Buffer'da Instagram kanalı yok");
  const ig = { type: E("reel"), shouldShareToFeed: true };
  const yorum = ilkYorumAlani(sema?.instagram);
  if (yorum) ig[yorum] = oge.ilk_yorum;
  const yzEtiketi = Boolean(sema?.instagram?.alanlar?.includes("isAiGenerated"));
  if (yzEtiketi) ig.isAiGenerated = true; // Instagram'ın yapay zekâ etiketi
  return { ...(await bufferGonder(kanallar.instagram, oge, videoUrl, { instagram: ig }, dueAt)), ilkYorum: Boolean(yorum), yzEtiketi };
}

async function facebookYayinla(oge, videoUrl, kanallar, sema, dueAt) {
  if (!kanallar.facebook) throw new Error("Buffer'da Facebook Sayfası kanalı yok");
  const fbSema = sema?.facebook;
  const reelVar = !sema || (fbSema?.typeDegerleri ?? []).some((t) => t.toLowerCase() === "reel");
  const fb = {};
  if (reelVar) fb.type = E(fbSema?.typeDegerleri?.find((t) => t.toLowerCase() === "reel") || "reel");
  const yorum = ilkYorumAlani(fbSema);
  if (yorum) fb[yorum] = oge.ilk_yorum;
  try {
    return { ...(await bufferGonder(kanallar.facebook, oge, videoUrl, Object.keys(fb).length ? { facebook: fb } : null, dueAt)), tur: reelVar ? "reel" : "video", ilkYorum: Boolean(yorum) };
  } catch (e) {
    if (sema || !reelVar) throw e;
    log("Facebook Reels metadata'sı kabul edilmedi, normal video gönderisi deneniyor:", e.message);
    return { ...(await bufferGonder(kanallar.facebook, oge, videoUrl, null, dueAt)), tur: "video", ilkYorum: false };
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
  const plan = planla(kuyruk, durum, new Date());
  const ytAcik = youtubeAcik(env);
  const ytSira = () => (ytAcik ? youtubeSiradakiler(durum) : []);
  if (!plan.length && !ytSira().length) { log(`Buffer'a gönderilecek yeni bir şey yok; YouTube ${ytAcik ? "bekleyeni yok" : "bekletiliyor"}.`); return; }
  const assetler = await releaseAssetleri();
  const kaydet = () => writeFile(DURUM_YOLU, JSON.stringify(durum, null, 2) + "\n");
  let hataVar = false;
  const zamanlanan = [];

  // 1) Instagram + Facebook: önümüzdeki yayın saatleri, Buffer'a TAM saatle zamanlanır
  if (plan.length) {
    const kanallar = await bufferKanallari();
    const sema = await bufferSemasi();
    for (const x of plan) {
      const oge = kuyruk.ogeler.find((o) => o.konu === x.konu);
      log(`ZAMANLA: Konu ${oge.konu} — ${oge.baslik} → ${istanbulSaati(x.dueAt)} (${x.platformlar.join(", ")})`);
      const d = (durum.konular[oge.konu] ||= {});
      d.slot = x.slot;
      if (!assetler[oge.video]) { log(`✘ Release'te ${oge.video} yok`); hataVar = true; atamaSonucu(durum, oge.konu); await kaydet(); continue; }
      const videoUrl = assetler[oge.video].browser_download_url;
      const islem = {
        instagram: () => instagramYayinla(oge, videoUrl, kanallar, sema, x.dueAt),
        facebook: () => facebookYayinla(oge, videoUrl, kanallar, sema, x.dueAt),
      };
      for (const p of x.platformlar) {
        const kayit = (d[p] ||= { deneme: 0 });
        kayit.deneme += 1;
        try {
          Object.assign(kayit, await islem[p](), { tamam: true, gonderildi: new Date().toISOString() });
          delete kayit.hata;
          zamanlanan.push({ konu: oge.konu, saat: istanbulSaati(kayit.zamanlandi || x.dueAt), platform: p, id: kayit.id, durum: kayit.durum });
          log(`  ✔ ${p}: Buffer ${kayit.id} (${kayit.durum}, ${istanbulSaati(kayit.zamanlandi || x.dueAt)})`);
        } catch (e) {
          kayit.hata = e.message.slice(0, 500);
          hataVar = true;
          log(`  ✘ ${p} (deneme ${kayit.deneme}/${MAX_DENEME}): ${e.message}`);
        }
        await kaydet(); // her gönderimden sonra: aynı konu asla iki kez gönderilmesin
      }
      atamaSonucu(durum, oge.konu); // hiçbir platform gitmediyse saat bırakılır
      if (d.slot) youtubeBekleyeneEkle(durum, oge.konu);
      await kaydet();
    }
  }
  if (zamanlanan.length) {
    log("\n—— BUFFER'DA ZAMANLANAN GÖNDERİLER ——");
    for (const z of zamanlanan) log(`  Konu ${z.konu} | ${z.saat} | ${z.platform} | Buffer ${z.id} (${z.durum})`);
  }

  // 2) YouTube: bekleyenler eskiden yeniye; ilk hatada durur (bağlantı sorunu tüm konuları etkiler).
  //    REELS_YOUTUBE≠acik iken denenmez; konular bekleyen listesinde kalır.
  if (!ytAcik) log(`YouTube bekletiliyor (REELS_YOUTUBE≠acik): bekleyen ${durum.youtube_bekleyen.map((k) => `Konu ${k}`).join(", ") || "yok"}`);
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
