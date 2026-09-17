// Ortak içerik/publication state (aggregator) + public-safe manifest
// builder için deterministik testler. Gerçek ağ çağrısı yok; state
// dosyaları sahte fixture olarak (ya da geçici bir dizine yazılarak)
// veriliyor — gerçek production state dosyaları OKUNMUYOR/DEĞİŞTİRİLMİYOR.

import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { getUnifiedPublicationState, summarizeHistory } from "../scripts/_publication-state.mjs";
import { buildPublishedContentManifest } from "../scripts/_publication-manifest.mjs";
import { regeneratePublishedContent } from "../scripts/regenerate-published-content.mjs";

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

// ---- TEST: summarizeHistory ----
{
  kontrol("1) boş/eksik girdi crash üretmiyor, 0 döner", summarizeHistory(undefined).toplamKayit === 0);
  kontrol("2) history-wrapped nesneyi de kabul ediyor", summarizeHistory({ history: [{ publishedAt: "2026-01-01T00:00:00.000Z" }] }).toplamKayit === 1);
  const ozet = summarizeHistory([
    { publishedAt: "2026-01-01T00:00:00.000Z" },
    { publishedAt: "2026-03-01T00:00:00.000Z" },
    { publishedAt: "invalid-date" },
  ]);
  kontrol("3) en son publishedAt doğru bulunuyor", ozet.sonYayinTarihi === "2026-03-01T00:00:00.000Z");
  kontrol("4) toplam kayıt sayısı doğru (bozuk tarihli kayıt da sayılır)", ozet.toplamKayit === 3);
}

// ---- TEST: getUnifiedPublicationState — 4 ayrı state dosyasını sahte bir dizinden okuyor ----
{
  const tmp = await mkdtemp(path.join(tmpdir(), "sa-pubstate-"));
  await writeFile(path.join(tmp, "master-publish-state.json"), JSON.stringify({ nextIndex: 2, history: [{ publishedAt: "2026-01-01T00:00:00.000Z" }, { publishedAt: "2026-02-01T00:00:00.000Z" }] }));
  await writeFile(path.join(tmp, "weekly-signals-publish-state.json"), JSON.stringify({ nextIndex: 1, history: [{ publishedAt: "2026-03-01T00:00:00.000Z" }] }));
  // marketing-queue-state.json ve master-playlist-state.json BİLEREK eksik bırakıldı —
  // aggregator diğerlerini raporlamaya devam etmeli (graceful).
  const durum = await getUnifiedPublicationState({ dataDir: tmp });
  kontrol("5) masterLessons doğru okundu", durum.masterLessons.toplamKayit === 2 && durum.masterLessons.nextIndex === 2);
  kontrol("6) weeklySignals doğru okundu", durum.weeklySignals.toplamKayit === 1 && durum.weeklySignals.nextIndex === 1);
  kontrol("7) eksik marketingQueue dosyası crash üretmiyor, 0 döner", durum.marketingQueue.toplamKayit === 0);
  kontrol("8) eksik masterPlaylist dosyası crash üretmiyor, null/0 döner", durum.masterPlaylist.playlistId === null && durum.masterPlaylist.eklenenVideoSayisi === 0);
  await rm(tmp, { recursive: true, force: true });
}

// ---- TEST: buildPublishedContentManifest — SADECE başarılı (youtube.videoUrl dolu) kayıtları alıyor ----
{
  const masterState = {
    history: [
      { id: "ep1", epNum: 1, youtube: { videoUrl: "https://youtube.com/shorts/AAA" }, instagram: { id: "ig1" }, publishedAt: "2026-01-01T00:00:00.000Z" },
      { id: "ep2", epNum: 2, youtube: { error: "quota exceeded" }, publishedAt: "2026-01-02T00:00:00.000Z" }, // HATALI — dahil edilmemeli
    ],
  };
  const weeklyState = {
    history: [
      { id: "w1", youtube: { videoUrl: "https://youtube.com/shorts/BBB" }, instagram: {}, publishedAt: "2026-02-01T00:00:00.000Z" },
      { id: "w2", youtube: { error: "invalid_client" }, publishedAt: "2026-02-02T00:00:00.000Z" }, // HATALI — dahil edilmemeli
    ],
  };
  const manifest = buildPublishedContentManifest({ masterState, weeklyState });
  kontrol("9) sadece 2 başarılı kayıt dahil edildi (hatalı 2 kayıt elendi)", manifest.items.length === 2);
  kontrol("10) hiçbir öğe error alanı içermiyor", manifest.items.every((it) => !("error" in it)));
  kontrol("11) en yeni yayın en başta (tarihe göre sıralı)", manifest.items[0].id === "weekly-w1");
  kontrol("12) master öğesi doğru başlık üretiyor", manifest.items.find((it) => it.id === "master-ep1")?.title === "OF Tuzağı — Bölüm 1");
  kontrol("13) instagramPublished doğru işaretleniyor", manifest.items.find((it) => it.id === "master-ep1")?.instagramPublished === true && manifest.items.find((it) => it.id === "weekly-w1")?.instagramPublished === false);
  kontrol("14) hiçbir öğe internal path/dosya adı (videoFile) içermiyor", !JSON.stringify(manifest.items).includes(".mp4"));

  // Eski (raw array) weekly state biçimini de destekliyor mu (geriye dönük uyum)?
  const manifestRawArray = buildPublishedContentManifest({ masterState: null, weeklyState: weeklyState.history });
  kontrol("15) weeklyState düz dizi olarak verilirse de doğru çalışıyor", manifestRawArray.items.length === 1 && manifestRawArray.items[0].id === "weekly-w1");
}

// ---- TEST: regeneratePublishedContent — gerçek dosya yazma, geçici dizinde ----
{
  const tmpData = await mkdtemp(path.join(tmpdir(), "sa-pubdata-"));
  const tmpOut = await mkdtemp(path.join(tmpdir(), "sa-pubout-"));
  await writeFile(
    path.join(tmpData, "master-publish-state.json"),
    JSON.stringify({ history: [{ id: "x", epNum: 9, youtube: { videoUrl: "https://youtube.com/shorts/ZZZ" }, publishedAt: "2026-05-01T00:00:00.000Z" }] })
  );
  const outPath = path.join(tmpOut, "published-content.json");
  const manifest = await regeneratePublishedContent({ outPath, dataDir: tmpData });
  kontrol("16) regeneratePublishedContent dosyayı gerçekten yazdı", JSON.parse(await readFile(outPath, "utf-8")).items.length === 1);
  kontrol("17) dönen manifest ile yazılan dosya aynı", manifest.items.length === 1 && manifest.items[0].youtubeUrl === "https://youtube.com/shorts/ZZZ");
  await rm(tmpData, { recursive: true, force: true });
  await rm(tmpOut, { recursive: true, force: true });
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
