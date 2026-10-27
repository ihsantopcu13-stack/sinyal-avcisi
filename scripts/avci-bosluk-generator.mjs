// AVCI ÇÖZÜM MOTORU — ÖSYM tipi boşluk soruları: canonical → frontend mirror.
//
// Canonical kaynak: api/data/avci-bosluk-sorular.json (q501+). Bu sorular
// api/data/sorular.json'a KONMAZ: o dosya video/Threads/Günün Sorusu
// hattını da besliyor ve İngilizce şıklı boşluk soruları o hatta uymaz.
// index.html'de SL_HAVUZ'un hemen ardından SL_BOSLUK_HAVUZ olarak gömülür
// ve SL_HAVUZ'a eklenir; böylece Sinyal Lab'ın mevcut soru akışı (slRender,
// dAns, cevap kaydı, yanlış defteri, günün denemesi) bu soruları da çözer.
//
// Bu modül SAF: scripts/generate-avci-bosluk.mjs (CLI) ve
// tests/avci-cozum-motoru.test.mjs aynı çıktıyı buradan üretir.

export const BASLA = "// AVCI_BOSLUK_HAVUZ — BAŞLA (scripts/generate-avci-bosluk.mjs üretir; elle düzenleme)";
export const BITIS = "// AVCI_BOSLUK_HAVUZ — BİTİŞ";

function kacis(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function boslukSentHtml(soruEn) {
  return kacis(soruEn).replace(/-{3,}/g, '<span class="avci-bosluk" aria-label="boşluk">----</span>');
}

export function boslukFrontendEntry(soru) {
  return {
    id: soru.id,
    sinyal: soru.sinyal,
    eye: soru.kategori,
    tip: "bosluk",
    sent: boslukSentHtml(soru.soru_en),
    en: soru.soru_en,
    q: soru.soru_tr,
    opts: soru.secenekler_tr,
    ans: soru.dogru_index,
    fb: soru.aciklama_tr,
    tr: soru.ceviri_tr,
  };
}

export function buildBoslukSource(canonical) {
  const satirlar = canonical.map((s) => "  " + JSON.stringify(boslukFrontendEntry(s)) + ",");
  return [
    BASLA,
    "const SL_BOSLUK_HAVUZ=[",
    ...satirlar,
    "];",
    "SL_HAVUZ.push.apply(SL_HAVUZ,SL_BOSLUK_HAVUZ);",
    BITIS,
  ].join("\n");
}
