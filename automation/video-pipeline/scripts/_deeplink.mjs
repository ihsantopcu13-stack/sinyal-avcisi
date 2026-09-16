// ============================================================
// FAZ 2 — TEK REUSABLE DEEP-LINK ÜRETECİ
// ============================================================
// Instagram ve YouTube (ve gelecekte Facebook/TikTok) için AYNI
// fonksiyon kullanılır — platform-özel metadata parametre olarak
// gelir, hard-code edilmiş ayrı URL string'leri YOK.
//
// SOURCE OF TRUTH: sinyal bilgisi çağıran script'in zaten elinde olan
// soru/script metadata'sından (senaryo.sinyal) gelir — burada yeniden
// üretilmiyor/icat edilmiyor, sadece URL'e güvenli biçimde kodlanıyor.

const SITE_URL = "https://sinyal-avcisi.com/";

/**
 * @param {object} p
 * @param {string} p.sinyal - soru bankasındaki sinyal (örn. "despite"), SOURCE OF TRUTH
 * @param {'instagram'|'youtube'|'tiktok'|'threads'|string} p.platform
 * @param {string} p.medium - örn. "reel", "shorts", "post"
 * @param {string} p.contentId - örn. "reel_06" veya video id
 * @param {number|string} [p.questionId]
 * @param {number|string} [p.lessonId]
 */
export function deepLinkUret({ sinyal, platform, medium, contentId, questionId, lessonId }) {
  const url = new URL(SITE_URL);
  if (platform) url.searchParams.set("utm_source", platform);
  if (medium) url.searchParams.set("utm_medium", medium);
  if (sinyal) url.searchParams.set("utm_campaign", sinyal);
  if (contentId) url.searchParams.set("utm_content", String(contentId));
  if (sinyal) url.searchParams.set("signal", sinyal);
  if (questionId != null) url.searchParams.set("question_id", String(questionId));
  if (lessonId != null) url.searchParams.set("lesson_id", String(lessonId));
  return url.toString();
}
