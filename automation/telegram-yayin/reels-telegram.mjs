// ============================================================
// REELS → TELEGRAM KANALI
// Reels hattının (automation/reels-yayin) Instagram/Facebook'a zamanladığı
// konuları, yayın saati gelince Telegram kanalına video olarak gönderir.
// Reels hattına DOKUNMAZ: kuyruk.json ve durum.json'u yalnızca OKUR; kendi
// ilerlemesini data/telegram-durum.json'da tutar.
//
// Telegram Bot API zamanlamayı desteklemediği için bu betik saatlik çalışır
// (telegram-reels.yml) ve saati gelmiş konuları gönderir. Yayın saati
// PENCERE_SAAT'ten eski konular gönderilmez (ilk açılışta geçmiş taşkını yok).
//
// Modlar (TELEGRAM_MOD):
//   deneme  — HİÇBİR ŞEY GÖNDERMEZ. Token, kanal, botun yönetici izni ve
//             sıradaki videoyu kontrol eder; gönderilecek metni loga yazar.
//   yayinla — Gerçek gönderim. Zamanlanmış çalışmalar yalnız repo değişkeni
//             TELEGRAM_YAYIN=acik iken bu moda geçer.
//
// Gerekli env: TELEGRAM_BOT_TOKEN (secret), TELEGRAM_CHAT_ID (değişken),
//   GITHUB_TOKEN, GITHUB_REPOSITORY
// ============================================================

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { telegramIstemci } from "./telegram-istemci.mjs";
import { modBelirle, tgDurumHazirla, reelsSec, reelsAciklamasi, MAX_DENEME, VIDEO_SINIR, SITE } from "./telegram-mantigi.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REELS_DATA = path.join(__dirname, "..", "reels-yayin", "data");
const TG_DURUM_YOLU = path.join(__dirname, "data", "telegram-durum.json");
const RELEASE_TAG = "reels-medya-v1";

const env = process.env;
const MOD = modBelirle(env);
const CHAT_ID = (env.TELEGRAM_CHAT_ID || "").trim();

function log(...a) { console.log(new Date().toISOString().slice(11, 19), ...a); }
async function jsonOku(yol, varsayilan) { try { return JSON.parse(await readFile(yol, "utf-8")); } catch { return varsayilan; } }
const istanbul = (iso) => new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

async function ghApi(yol, secenek = {}) {
  return fetch(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}${yol}`, {
    ...secenek,
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...secenek.headers },
  });
}

async function releaseAssetleri() {
  const res = await ghApi(`/releases/tags/${RELEASE_TAG}`);
  if (!res.ok) throw new Error(`GitHub Release "${RELEASE_TAG}" bulunamadı (${res.status})`);
  const rel = await res.json();
  return Object.fromEntries((rel.assets || []).map((a) => [a.name, a]));
}

async function assetIndir(asset) {
  const res = await fetch(asset.url, { headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/octet-stream" } });
  if (!res.ok) throw new Error(`${asset.name} indirilemedi: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Video 50 MB'tan büyükse Telegram kabul etmez → metin + site bağlantısı gönderilir
async function konuGonder(tg, oge, asset) {
  const aciklama = reelsAciklamasi(oge.aciklama);
  if (asset.size > VIDEO_SINIR) {
    log(`  ⚠ ${oge.video} ${(asset.size / 1048576).toFixed(1)} MB — Telegram sınırını aşıyor, yalnız metin gönderiliyor`);
    const m = await tg.mesajGonder(CHAT_ID, `${aciklama}\n\n▶️ Videosu: ${SITE}`.slice(0, 4096));
    return { mesaj_id: m.message_id, tur: "metin" };
  }
  const buf = await assetIndir(asset);
  const m = await tg.videoGonder(CHAT_ID, buf, oge.video, { caption: aciklama });
  return { mesaj_id: m.message_id, tur: "video" };
}

async function deneme(tg, kuyruk, secilen) {
  let hata = false;
  try {
    const k = await tg.kanalKontrol(CHAT_ID);
    log(`✔ Telegram: ${k.bot} → "${k.kanal}" (${k.tur}), mesaj gönderme izni var`);
  } catch (e) { hata = true; log(`✘ Telegram kanalı: ${tg.gizle(e.message)}`); }

  if (!secilen.length) {
    log("Şu an saati gelmiş, Telegram'a gidecek Reels yok.");
  } else {
    try {
      const a = await releaseAssetleri();
      for (const s of secilen) {
        const oge = kuyruk.ogeler.find((o) => o.konu === s.konu);
        const asset = a[oge.video];
        if (!asset) { hata = true; log(`✘ Konu ${s.konu}: Release'te ${oge.video} yok`); continue; }
        log(`✔ Konu ${s.konu} (${istanbul(s.slot)}) — ${oge.video} ${(asset.size / 1048576).toFixed(1)} MB → ${asset.size > VIDEO_SINIR ? "metin olarak" : "video olarak"} gönderilirdi`);
      }
      const ilk = kuyruk.ogeler.find((o) => o.konu === secilen[0].konu);
      log("İlk konunun Telegram açıklaması:\n" + reelsAciklamasi(ilk.aciklama));
    } catch (e) { hata = true; log(`✘ Medya: ${e.message}`); }
  }
  log(`\nDENEME SONUCU: ${hata ? "sorun var (yukarıda ✘)" : "hepsi geçti"}. Hiçbir şey gönderilmedi.`);
  if (hata) process.exitCode = 1;
}

async function yayinla(tg, kuyruk, secilen, tgDurum) {
  if (!secilen.length) { log("Saati gelmiş, Telegram'a gidecek Reels yok."); return; }
  await tg.kanalKontrol(CHAT_ID);
  const assetler = await releaseAssetleri();
  const kaydet = () => writeFile(TG_DURUM_YOLU, JSON.stringify(tgDurum, null, 2) + "\n");
  let hata = false;
  for (const s of secilen) {
    const oge = kuyruk.ogeler.find((o) => o.konu === s.konu);
    const kayit = (tgDurum.konular[s.konu] ||= { deneme: 0 });
    kayit.deneme += 1;
    try {
      if (!assetler[oge.video]) throw new Error(`Release'te ${oge.video} yok`);
      Object.assign(kayit, await konuGonder(tg, oge, assetler[oge.video]), { tamam: true, slot: s.slot, zaman: new Date().toISOString() });
      delete kayit.hata;
      log(`✔ Konu ${s.konu} — ${oge.baslik} (${istanbul(s.slot)}) → Telegram mesaj ${kayit.mesaj_id} (${kayit.tur})`);
    } catch (e) {
      kayit.hata = tg.gizle(e.message).slice(0, 500);
      hata = true;
      log(`✘ Konu ${s.konu} (deneme ${kayit.deneme}/${MAX_DENEME}): ${kayit.hata}`);
    }
    await kaydet(); // her gönderimden sonra: aynı konu iki kez gitmesin
  }
  if (hata) process.exitCode = 1;
}

// ---------------- giriş ----------------
if (!CHAT_ID) { console.error("TELEGRAM_CHAT_ID tanımlı değil (repo değişkeni)"); process.exit(1); }
const tg = telegramIstemci(env.TELEGRAM_BOT_TOKEN);
const kuyruk = await jsonOku(path.join(REELS_DATA, "kuyruk.json"), { ogeler: [] });
const reelsDurum = await jsonOku(path.join(REELS_DATA, "durum.json"), { konular: {} });
const tgDurum = tgDurumHazirla(await jsonOku(TG_DURUM_YOLU, {}));
const secilen = reelsSec(kuyruk, reelsDurum, tgDurum, new Date());
log(`Mod: ${MOD} — saati gelmiş ${secilen.length} konu${secilen.length ? `: ${secilen.map((s) => `Konu ${s.konu}`).join(", ")}` : ""}`);
try {
  if (MOD === "yayinla") await yayinla(tg, kuyruk, secilen, tgDurum);
  else await deneme(tg, kuyruk, secilen);
} catch (e) {
  console.error("Hata:", tg.gizle(e.message));
  process.exitCode = 1;
}
