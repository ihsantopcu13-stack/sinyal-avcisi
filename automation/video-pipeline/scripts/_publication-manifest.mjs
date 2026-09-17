// ============================================================
// Public-safe "yayınlanan içerik" manifest üretici
// ============================================================
// Site (Vercel) tarafında gösterilecek gerçek yayınlanmış video linkleri
// için, master-publish-state.json + weekly-signals-publish-state.json'dan
// SADECE public-safe alanları (videoUrl, dizi adı, tarih) çıkarır. Hiçbir
// secret/internal path/dosya adı İÇERMEZ. Yeni bir source-of-truth değil —
// bu iki state dosyasının salt-okunur, filtrelenmiş bir izdüşümü.
//
// Sadece BAŞARILI (youtube.videoUrl dolu) kayıtlar dahil edilir — hata
// almış (ör. invalid_client) kayıtlar otomatik elenir, hiçbir hata mesajı
// veya iç durum bu manifest'e sızmaz.

export function buildPublishedContentManifest({ masterState, weeklyState } = {}) {
  const items = [];

  for (const ep of masterState?.history ?? []) {
    const url = ep?.youtube?.videoUrl;
    if (!url || typeof url !== "string") continue;
    items.push({
      id: `master-${ep.id ?? ep.epNum ?? items.length}`,
      series: "of-tuzagi",
      title: ep.epNum ? `OF Tuzağı — Bölüm ${ep.epNum}` : "OF Tuzağı",
      youtubeUrl: url,
      instagramPublished: Boolean(ep?.instagram?.id),
      publishedAt: typeof ep?.publishedAt === "string" ? ep.publishedAt : null,
    });
  }

  const weeklyHistory = Array.isArray(weeklyState) ? weeklyState : (weeklyState?.history ?? []);
  for (const w of weeklyHistory) {
    const url = w?.youtube?.videoUrl;
    if (!url || typeof url !== "string") continue;
    items.push({
      id: `weekly-${w.id ?? items.length}`,
      series: "haftalik-sinyal",
      title: "Haftalık Sinyal",
      youtubeUrl: url,
      instagramPublished: Boolean(w?.instagram?.id),
      publishedAt: typeof w?.publishedAt === "string" ? w.publishedAt : null,
    });
  }

  items.sort((a, b) => (Date.parse(b.publishedAt || "") || 0) - (Date.parse(a.publishedAt || "") || 0));
  return { generatedAt: new Date().toISOString(), items };
}
