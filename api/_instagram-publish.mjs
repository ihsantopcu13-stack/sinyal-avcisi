// ============================================================
// Instagram Graph API — gönderi yayınlama (paylaşılan yardımcı)
// ============================================================
// Akış (Meta resmi 2 adımlı content publishing süreci):
//   1) POST /{ig-user-id}/media  → image_url + caption → container (creation_id)
//   2) GET  /{container-id}?fields=status_code → FINISHED olana kadar bekle
//   3) POST /{ig-user-id}/media_publish → creation_id → yayınla
//
// GÜVENLİK: access_token asla client'a dönmez, sadece sunucu (Vercel Node
// runtime) üzerinden env değişkeninden okunur.

const GRAPH_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

async function containerHazirMi(containerId, accessToken, denemeSayisi = 10) {
  for (let i = 0; i < denemeSayisi; i++) {
    const res = await fetch(`${GRAPH_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`);
    const data = await res.json();
    if (data.status_code === 'FINISHED') return true;
    if (data.status_code === 'ERROR') throw new Error('Instagram container işleme hatası: ' + JSON.stringify(data));
    await new Promise(r => setTimeout(r, 2000)); // 2sn bekleyip tekrar dene
  }
  return false; // resim için genelde ilk denemede FINISHED döner; yine de son çare denenir
}

export async function instagramGonderiYayinla({ igBusinessAccountId, accessToken, imageUrl, caption }) {
  if (!igBusinessAccountId || !accessToken) {
    throw new Error('IG Business Account ID veya access token eksik');
  }

  // 1) Container oluştur
  const containerRes = await fetch(`${GRAPH_BASE}/${igBusinessAccountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
  });
  const containerData = await containerRes.json();
  if (!containerRes.ok || !containerData.id) {
    throw new Error('Container oluşturulamadı: ' + JSON.stringify(containerData));
  }

  // 2) Hazır olana kadar bekle (resimlerde genelde anında hazır olur)
  await containerHazirMi(containerData.id, accessToken);

  // 3) Yayınla
  const publishRes = await fetch(`${GRAPH_BASE}/${igBusinessAccountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
  });
  const publishData = await publishRes.json();
  if (!publishRes.ok || !publishData.id) {
    throw new Error('Yayınlama başarısız: ' + JSON.stringify(publishData));
  }

  return publishData; // { id: '<media-id>' }
}
