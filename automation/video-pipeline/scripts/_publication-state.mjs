// ============================================================
// Ortak içerik/publication state — salt-okunur aggregator
// ============================================================
// Bu modül YENİ bir source-of-truth DEĞİL: mevcut 4 ayrı publish-state
// dosyasının (master-publish-state.json, weekly-signals-publish-state.json,
// marketing-queue-state.json, master-playlist-state.json) hiçbirini
// değiştirmez, sadece tek bir noktadan birleşik bir ÖZET sunar. Her
// pipeline kendi state dosyasını kendi scriptiyle yazmaya devam eder —
// burada sadece OKUMA var.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

export async function readJsonSafe(fileName, { dataDir = DATA_DIR } = {}) {
  try {
    return JSON.parse(await readFile(path.join(dataDir, fileName), "utf-8"));
  } catch {
    return null;
  }
}

// history dizisindeki (ya da doğrudan dizi verilmişse onun) kayıtları
// özetler — kaç kayıt var, en son ne zaman yayınlanmış.
export function summarizeHistory(historyOrArray) {
  const arr = Array.isArray(historyOrArray) ? historyOrArray : Array.isArray(historyOrArray?.history) ? historyOrArray.history : [];
  let sonTs = 0;
  for (const h of arr) {
    const ts = h?.publishedAt ? Date.parse(h.publishedAt) : NaN;
    if (!Number.isNaN(ts) && ts > sonTs) sonTs = ts;
  }
  return { toplamKayit: arr.length, sonYayinTarihi: sonTs ? new Date(sonTs).toISOString() : null };
}

// Dört pipeline'ın state'ini tek bir nesnede özetler. Herhangi bir dosya
// eksik/okunamazsa o bölüm için sessizce boş bir özet döner (graceful) —
// tek bir pipeline'ın state'i bozuk olsa da diğerleri raporlanmaya devam
// eder.
export async function getUnifiedPublicationState({ dataDir = DATA_DIR } = {}) {
  const [master, weekly, marketing, playlist] = await Promise.all([
    readJsonSafe("master-publish-state.json", { dataDir }),
    readJsonSafe("weekly-signals-publish-state.json", { dataDir }),
    readJsonSafe("marketing-queue-state.json", { dataDir }),
    readJsonSafe("master-playlist-state.json", { dataDir }),
  ]);

  return {
    masterLessons: { ...summarizeHistory(master), nextIndex: master?.nextIndex ?? null },
    weeklySignals: { ...summarizeHistory(weekly), nextIndex: weekly?.nextIndex ?? null },
    marketingQueue: { ...summarizeHistory(marketing), nextIndex: marketing?.nextIndex ?? null },
    masterPlaylist: {
      playlistId: playlist?.playlistId ?? null,
      eklenenVideoSayisi: Array.isArray(playlist?.addedVideoIds) ? playlist.addedVideoIds.length : 0,
    },
  };
}
