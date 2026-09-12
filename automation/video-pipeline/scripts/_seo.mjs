// ============================================================
// SEO yardımcıları — YouTube/Instagram başlık, açıklama ve hashtag
// üretiminde upload-youtube.mjs ve upload-instagram-buffer.mjs
// tarafından paylaşılır.
// ============================================================
// 2026 platform araştırmasına göre (bkz. proje memory'si):
// - Instagram: artık hashtag değil, caption İÇİNDEKİ doğal anahtar
//   kelimeler birincil keşif sinyali; hashtag sayısı 5 ile sınırlı.
// - YouTube Shorts: başlıkta hashtag KULLANILMAMALI (anahtar kelime
//   öne yüklenmeli), açıklamadaki hashtag'ler sona, 3-5 adet; gizli
//   "tags" alanı da 3-5 adet olmalı.
// Ortak fikir: jenerik (#YDS, #YÖKDİL) etiketlerin yanına her bölümün
// kendi sinyal kelimesinden (despite, however, aware of...) türetilen
// NİŞ bir long-tail etiket eklemek — aksi halde her video aynı 5
// jenerik etikete rekabet ediyor, hiçbiri kendi konusuna özel sinyal
// vermiyor.

// "aware of" -> "AwareOf", "despite" -> "Despite" — hashtag'e uygun,
// boşluksuz PascalCase.
export function sinyalSlug(sinyal) {
  if (!sinyal) return null;
  return sinyal
    .split(/\s+/)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1))
    .join("");
}

export function nicheHashtag(sinyal) {
  const slug = sinyalSlug(sinyal);
  return slug ? `#${slug}` : null;
}

// YouTube açıklaması / Instagram caption için 5 hashtag'lik sabit set:
// 2 geniş (marka+platform), 1 niş (bölüme özel sinyal), 2 geniş sınav
// terimi. Instagram'ın 5 etiket sınırına ve YouTube'un "3-5 doğru
// aralık" tavsiyesine birebir uyar.
export function hashtagSeti(senaryo, { instagram = false } = {}) {
  const niche = nicheHashtag(senaryo?.sinyal);
  const temel = instagram
    ? ["#YDS", "#YÖKDİL", niche, "#SinyalAvcısı", "#Reels"]
    : ["#YDS", "#YÖKDİL", niche, "#SinyalAvcısı", "#Shorts"];
  return temel.filter(Boolean).slice(0, 5);
}

// YouTube'un gizli "tags" metadata alanı (herkese açık değil, algoritma
// sınıflandırması için) — 3-5 arası, jenerik + bölüme özel karışık.
export function youtubeTags(senaryo) {
  return ["YDS", "YÖKDİL", "İngilizce", "SinyalAvcısı", senaryo?.sinyal]
    .filter(Boolean)
    .slice(0, 5);
}
