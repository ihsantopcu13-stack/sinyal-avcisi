// ============================================================
// TELEGRAM YAYIN — saf kurallar (ağ yok, dosya yok; test/telegram.test.mjs)
// ============================================================

export const PENCERE_SAAT = 12;       // yayın saati bundan eskiyse Telegram'a gönderilmez (geçmiş taşkını yok)
export const CALISMA_BASINA = 3;      // bir çalışmada en fazla bu kadar Reels gönderilir
export const MAX_DENEME = 3;          // bir konu en fazla bu kadar denenir
export const CAPTION_SINIR = 1024;    // Telegram medya açıklaması sınırı (UTF-16; JS .length ile aynı)
export const MESAJ_SINIR = 4096;      // Telegram düz mesaj sınırı
export const VIDEO_SINIR = 49 * 1024 * 1024; // Bot API dosya yükleme sınırı 50 MB; pay bırakıldı
export const SITE = "sinyal-avcisi.com";

export function modBelirle(env) {
  return (env.TELEGRAM_MOD || "deneme").trim() === "yayinla" ? "yayinla" : "deneme";
}

export function tgDurumHazirla(d) {
  const durum = d && typeof d === "object" ? d : {};
  durum.konular ||= {};
  return durum;
}

// Gönderilecek Reels konuları: Reels hattının bir yayın saatine atadığı (slot), Instagram ya da
// Facebook'a gerçekten zamanlanmış, saati gelmiş ama PENCERE_SAAT'ten eski olmayan, Telegram'a
// henüz gitmemiş ve deneme hakkı bitmemiş konular. Eskiden yeniye, en fazla CALISMA_BASINA.
export function reelsSec(kuyruk, reelsDurum, tg, simdi, pencereSaat = PENCERE_SAAT, adet = CALISMA_BASINA) {
  const simdiMs = simdi.getTime();
  const altSinir = simdiMs - pencereSaat * 3600_000;
  const konular = reelsDurum?.konular ?? {};
  const secilen = [];
  for (const [anahtar, d] of Object.entries(konular)) {
    const konu = Number(anahtar);
    if (!d?.slot) continue;
    const slotMs = Date.parse(d.slot);
    if (!Number.isFinite(slotMs) || slotMs > simdiMs || slotMs < altSinir) continue;
    if (!(d.instagram?.tamam || d.facebook?.tamam)) continue;
    const t = tg.konular[konu];
    if (t?.tamam) continue;
    if ((t?.deneme ?? 0) >= MAX_DENEME) continue;
    if (!kuyruk.ogeler.some((o) => o.konu === konu)) continue;
    secilen.push({ konu, slot: d.slot, slotMs });
  }
  return secilen.sort((a, b) => a.slotMs - b.slotMs).slice(0, adet).map(({ konu, slot }) => ({ konu, slot }));
}

// Reels açıklaması Telegram'a uyarlanır: Instagram'a özgü "Link biyografide." yerine site adresi.
// Düz metin gönderilir (parse_mode yok) — kaçış hatası riski olmasın.
export function reelsAciklamasi(aciklama) {
  let metin = String(aciklama ?? "").replace(/Link biyografide\.?/g, `👉 ${SITE}`).trim();
  if (metin.length > CAPTION_SINIR) metin = metin.slice(0, CAPTION_SINIR - 1).trimEnd() + "…";
  return metin;
}

export function htmlKacis(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// HTML etiketleri çıkarılmış, Telegram'ın sayacağı görünür uzunluk
export function gorunurUzunluk(html) {
  return html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").length;
}

// Günün Sorusu: cevap Telegram'ın "spoiler" (dokununca açılan) biçimiyle gizlenir.
// Döner: { caption, ekMesaj } — sığarsa tek gönderi (ekMesaj null), sığmazsa
// kart kısa açıklamayla + tam metin ayrı mesaj.
export function gununSorusuMetni(soru, dogruHarf) {
  const secenekler = (soru.secenekler_tr ?? []).map((s, i) => `${String.fromCharCode(65 + i)}) ${htmlKacis(s)}`);
  const govde = [
    `🎯 <b>Günün Sorusu</b>`,
    ``,
    soru.soru_en ? `<i>"${htmlKacis(soru.soru_en)}"</i>` : null,
    soru.soru_en ? `` : null,
    htmlKacis(soru.soru_tr),
    ...secenekler,
    ``,
    soru.sinyal ? `Sinyal: "${htmlKacis(soru.sinyal)}"` : null,
    soru.sinyal ? `` : null,
    `👇 Önce kendi cevabını düşün, sonra gizli kısma dokun:`,
    `<tg-spoiler>Doğru cevap: ${htmlKacis(dogruHarf)}${soru.aciklama_tr ? `\n${htmlKacis(soru.aciklama_tr)}` : ""}</tg-spoiler>`,
    ``,
    `💙 Bunun gibi yüzlerce soru tamamen ücretsiz: ${SITE}`,
  ].filter((x) => x !== null).join("\n");

  if (gorunurUzunluk(govde) <= CAPTION_SINIR) return { caption: govde, ekMesaj: null };
  const kisa = `🎯 <b>Günün Sorusu</b>\n\nSoru ve gizli cevap aşağıda 👇`;
  const ekMesaj = gorunurUzunluk(govde) <= MESAJ_SINIR ? govde : null;
  return { caption: kisa, ekMesaj };
}
