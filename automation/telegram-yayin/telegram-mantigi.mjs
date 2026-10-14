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

export const YENIDEN_BEKLEME_SN = [5, 15, 45]; // geçici hatada yeniden denemeden önce beklemeler

// Hata nesnesi: status (HTTP kodu) ve gecici (bağlantı/zaman aşımı) yeniden deneme kararı için taşınır
export function hataOlustur(mesaj, { status, gecici } = {}) {
  const e = new Error(mesaj);
  if (status !== undefined) e.status = status;
  if (gecici) e.gecici = true;
  return e;
}

// Geçici: bağlantı hatası, zaman aşımı, 5xx, 408, 429. Kalıcı (404, 400, 403…): yeniden denenmez.
export function geciciMi(e) {
  if (e?.gecici) return true;
  const s = e?.status;
  return typeof s === "number" && (s >= 500 || s === 408 || s === 429);
}

// is() geçici hatayla düşerse beklemeler kadar yeniden dener; kalıcı hatayı hemen fırlatır.
export async function yenidenDene(is, { beklemeler = YENIDEN_BEKLEME_SN, uyku = (ms) => new Promise((r) => setTimeout(r, ms)), ad = "işlem", log = () => {} } = {}) {
  for (let i = 0; ; i++) {
    try {
      return await is();
    } catch (e) {
      if (i >= beklemeler.length || !geciciMi(e)) throw e;
      log(`  ↻ ${ad}: geçici hata (${e.message}) — ${beklemeler[i]} sn sonra yeniden deneme ${i + 1}/${beklemeler.length}`);
      await uyku(beklemeler[i] * 1000);
    }
  }
}

// Çalışma sonu özeti: başarılı/düşen konular ve kısa sebepleri
export function ozetMetni(sonuclar) {
  const iyi = sonuclar.filter((s) => s.tamam);
  const kotu = sonuclar.filter((s) => !s.tamam);
  const satirlar = [`ÖZET: ${iyi.length}/${sonuclar.length} konu gönderildi${iyi.length ? ` (${iyi.map((s) => `Konu ${s.konu}`).join(", ")})` : ""}.`];
  for (const s of kotu) satirlar.push(`  ✘ Konu ${s.konu} düştü: ${String(s.hata ?? "").slice(0, 160)}`);
  return satirlar.join("\n");
}

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

// Elle tek konu (workflow_dispatch "konu" alanı): yalnız o konu, 12 saat penceresi YOK.
// Diğer kurallar reelsSec ile aynı: saati gelmiş, Instagram/Facebook'a gitmiş, kuyrukta var,
// deneme hakkı bitmemiş. Telegram'da "tamam" kaydı varsa hiçbir şey seçilmez (çift paylaşım yok).
// Döner: { secilen: [{konu, slot}] } ya da { secilen: [], neden }
export function tekKonuSec(konuGirdi, kuyruk, reelsDurum, tg, simdi) {
  const metin = String(konuGirdi ?? "").trim();
  if (!/^[1-9]\d*$/.test(metin)) return { secilen: [], neden: `geçersiz konu numarası: "${metin}"`, gecersiz: true };
  const konu = Number(metin);
  const d = reelsDurum?.konular?.[konu];
  const t = tg.konular[konu];
  if (t?.tamam) return { secilen: [], neden: `Konu ${konu} zaten gönderildi (Telegram mesaj ${t.mesaj_id ?? "?"}) — hiçbir şey gönderilmeyecek` };
  if (!kuyruk.ogeler.some((o) => o.konu === konu)) return { secilen: [], neden: `Konu ${konu} kuyrukta yok` };
  const slotMs = Date.parse(d?.slot ?? "");
  if (!Number.isFinite(slotMs)) return { secilen: [], neden: `Konu ${konu} bir yayın saatine atanmamış` };
  if (slotMs > simdi.getTime()) return { secilen: [], neden: `Konu ${konu} yayın saati henüz gelmedi` };
  if (!(d.instagram?.tamam || d.facebook?.tamam)) return { secilen: [], neden: `Konu ${konu} Instagram/Facebook'a gitmemiş` };
  if ((t?.deneme ?? 0) >= MAX_DENEME) return { secilen: [], neden: `Konu ${konu} deneme hakkı bitti (${t.deneme}/${MAX_DENEME})` };
  return { secilen: [{ konu, slot: d.slot }] };
}

// Reels açıklaması Telegram'a uyarlanır: Instagram'a özgü "Link biyografide." yerine site adresi.
// Telegram kanalında yorum yok → "yoruma yaz" çağrısı düşünme çağrısına çevrilir.
// Düz metin gönderilir (parse_mode yok) — kaçış hatası riski olmasın.
export function reelsAciklamasi(aciklama) {
  let metin = String(aciklama ?? "")
    .replace(/Link biyografide\.?/g, `👉 ${SITE}`)
    .replace(/👇 Cevabını yoruma yaz!/g, "🤔 Cevabını düşün, sonra izle.")
    .trim();
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
