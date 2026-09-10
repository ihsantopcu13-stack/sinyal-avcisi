// ============================================================
// MASTER VİDEO PAKETİ — YouTube/Instagram başlık, açıklama, hashtag
// üretimi. 2026 SEO stratejisiyle tutarlı (bkz. scripts/_seo.mjs):
// YouTube başlığında hashtag yok, açıklamada hashtag sonda ve ≤5,
// her bölüme özel niş bir hashtag (konu adından türetilir).
// ============================================================

function topicName(lesson) {
  return lesson.hookTitle.replace(/!$/, "").replace(/\s*TUZAĞI$/, "").trim();
}

function topicSlug(lesson) {
  return topicName(lesson)
    .split(/[\s/]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase("tr-TR") + w.slice(1).toLocaleLowerCase("tr-TR"))
    .join("");
}

export function youtubeMeta(lesson) {
  const topic = topicName(lesson);
  const title = `${topic} Sinyali — YDS/YÖKDİL #${lesson.epNum}`.slice(0, 70);
  const description = [
    lesson.narration.kural,
    "",
    lesson.question.sentence,
    ...lesson.question.options,
    "",
    `Doğru cevap: ${lesson.answerLabel} — ${lesson.cozumText}`,
    "",
    "Sinyal Avcısı MASTER Video Paketi ile YDS/YÖKDİL'e ücretsiz hazırlan: https://sinyal-avcisi.com",
    `#YDS #YÖKDİL #${topicSlug(lesson)} #SinyalAvcısı #Shorts`,
  ].join("\n");
  const tags = ["YDS", "YÖKDİL", "İngilizce", "SinyalAvcısı", topicSlug(lesson)].slice(0, 5);
  return { title, description, tags };
}

export function instagramCaption(lesson) {
  const topic = topicName(lesson);
  return [
    `🎯 ${topic} — MASTER #${lesson.epNum}`,
    "",
    lesson.narration.kural,
    "",
    lesson.question.sentence,
    ...lesson.question.options,
    "",
    `Doğru cevap: ${lesson.answerLabel} — ${lesson.cozumText}`,
    "",
    "💙 Platform tamamen ücretsiz — link bio'da.",
    "",
    `#YDS #YÖKDİL #${topicSlug(lesson)} #SinyalAvcısı #Reels`,
  ].join("\n");
}
