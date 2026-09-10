// ============================================================
// MASTER VİDEO PAKETİ — YouTube'da yayınlanan bölümleri tek bir
// oynatma listesinde #1'den #30'a doğru sırayla toplar. Idempotent:
// tekrar çalıştırıldığında sadece henüz eklenmemiş yeni videoları ekler
// (YouTube kota/rate-limit yüzünden bölümler zamana yayılarak
// yayınlandığı için bu script birden çok kez çağrılabilir).
//
// Playlist yönetimi (oluşturma/ekleme) youtube.upload scope'unda değil
// — bu yüzden geniş yetkili YOUTUBE_REFRESH_TOKEN_FULL_SCOPE kullanılır
// (bkz. .env.local, kanal sahibinin bir kerelik OAuth onayıyla alındı).
// ============================================================

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const REPORT_PATH = path.join(ROOT, "out", "publish-all-report.json");
const STATE_PATH = path.join(ROOT, "data", "master-playlist-state.json");
const PLAYLIST_TITLE = "MASTER VİDEO PAKETİ — YDS/YÖKDİL (#1-#30)";

async function loadEnvLocal() {
  const text = await readFile(path.join(ROOT, ".env.local"), "utf-8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

async function main() {
  const env = await loadEnvLocal();
  const client = new google.auth.OAuth2(env.YOUTUBE_CLIENT_ID, env.YOUTUBE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: env.YOUTUBE_REFRESH_TOKEN_FULL_SCOPE });
  const youtube = google.youtube({ version: "v3", auth: client });

  let state = { playlistId: null, addedVideoIds: [] };
  try {
    state = JSON.parse(await readFile(STATE_PATH, "utf-8"));
  } catch {}

  if (!state.playlistId) {
    const created = await youtube.playlists.insert({
      part: "snippet,status",
      requestBody: {
        snippet: { title: PLAYLIST_TITLE, description: "Sinyal Avcısı MASTER Video Paketi — #1'den #30'a öğretici YDS/YÖKDİL gramer sinyalleri serisi." },
        status: { privacyStatus: "public" },
      },
    });
    state.playlistId = created.data.id;
    console.log("Oynatma listesi oluşturuldu:", state.playlistId);
  } else {
    console.log("Mevcut oynatma listesi kullanılıyor:", state.playlistId);
  }

  const report = JSON.parse(await readFile(REPORT_PATH, "utf-8"));
  const successful = report.outcomes
    .filter((o) => o.youtube && o.youtube.videoId && !state.addedVideoIds.includes(o.youtube.videoId))
    .sort((a, b) => a.epNum - b.epNum);

  console.log(`Eklenecek yeni video sayısı: ${successful.length}`);

  for (const o of successful) {
    try {
      await youtube.playlistItems.insert({
        part: "snippet",
        requestBody: {
          snippet: {
            playlistId: state.playlistId,
            resourceId: { kind: "youtube#video", videoId: o.youtube.videoId },
          },
        },
      });
      state.addedVideoIds.push(o.youtube.videoId);
      console.log(`  #${o.epNum} ${o.id} eklendi.`);
      await writeFile(STATE_PATH, JSON.stringify(state, null, 2));
    } catch (e) {
      console.error(`  #${o.epNum} eklenemedi:`, e.message);
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log(`\nOynatma listesi: https://www.youtube.com/playlist?list=${state.playlistId}`);
  console.log(`Toplamda listede: ${state.addedVideoIds.length} video.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
