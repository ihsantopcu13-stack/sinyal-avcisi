// ============================================================
// AVCI PEDAGOJI KONTROLCUSU (KATMAN 5 FINAL SINAV / TURBO #8-B) — TEK ÇAĞRI
// ============================================================
// Gerçek modelle (Preview) yapılan doğrulamada B merdiveninin PROMPT ile
// GARANTİ EDİLEMEDİĞİ kanıtlandı (1. hatada anlamsal cevap ifşası, 2. hatada
// gerçek geri adım yok, aday cevap listesi). Bu modül EN KÜÇÜK deterministik
// kontrolcüdür: pedagojik DURUMU/geçişi kod belirler, LLM sadece bu durumun
// İÇİNDE (ADVANCE metni ve TEK geri adım sorusu) ifade üretir. Soru başına
// senaryo/ipucu tablosu YOKTUR; q004/although'a özgü hiçbir şey yoktur.
//
// MALİYET: ÖĞRETMEN çağrısından BAŞKA hiçbir model çağrısı YOKTUR (ne ayrı
// değerlendirici ne anlamsal sızıntı hakemi). Öğrenci cevabının hükmü AYNI
// öğretmen yanıtının ilk satırındaki makine işaretinden okunur ([[V=C]] doğru,
// [[V=W]] yanlış, [[V=U]] belirsiz), sunucu tarafından deterministik olarak
// ayıklanır ve görünür yanıta/board'a ASLA sızmaz. Durum yönergesi, ÖNCEKİ
// (sunucunun bildiği) duruma göre şekillenir; hüküm sonradan gelir, geçişi kod
// uygular. İşaret eksik/bozuk/UNCLEAR ise: durum İLERLEMEZ, öğrenci yanlış
// SAYILMAZ, cevap AÇILMAZ, bekleyen soru korunur (HOLD).
//
// Akış:  ORIGINAL_PENDING -> MISS_1 -> STEP_BACK -> RECOVERY -> ORIGINAL_PENDING
//   durum yok  + WRONG   -> MISS_1   (SUNUCU jenerik yapısal ipucu + ASIL soru)
//   MISS_1     + WRONG   -> STEP_BACK (TEK küçük LLM sorusu; sunucu doğrular)
//   STEP_BACK  + CORRECT -> RECOVERY (SUNUCU nötr onay + ASIL soru; ilerleme YOK)
//   STEP_BACK  + WRONG   -> OFFER    (SUNUCU şablonu, durum düşer)
//   RECOVERED  + CORRECT -> ADVANCE  (ancak şimdi ilerleyebilir)
//   RECOVERED  + WRONG   -> MISS_1
//   herhangi   + CORRECT -> ADVANCE (durum düşer; model metni geçer)
// Açık çözüm isteği / cevaplanmış soru: durum DÜŞER (çözüm modu serbest).
//
// Durum istemciden gelir ama sunucuda DOĞRULANIR: qid uyuşmazlığı, geçmiş
// uzunluğu uyuşmazlığı veya `orig`'in konuşmadaki bir asistan mesajında
// bulunmaması => durum atılır. Yeni DB/şema/RPC/kimlik/ağ çağrısı YOK.

export const PEDAGOJI_SURUM = 1;

export function katla(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function kelimeler(s) {
  return katla(s).match(/[a-z0-9]+(?:['’-][a-z0-9]+)*/g) || [];
}

export function benzerlik(a, b) {
  const A = new Set(kelimeler(a));
  const B = new Set(kelimeler(b));
  if (A.size === 0 || B.size === 0) return 0;
  let kesisim = 0;
  for (const k of A) if (B.has(k)) kesisim++;
  return kesisim / (A.size + B.size - kesisim);
}

// "X mi Y mi?" / "mi ... yoksa" gibi aday cevap sunan kalıplar.
export function alternatifSoruMu(metin) {
  const f = katla(metin);
  return /\bm[iu]\b[^.!?\n]{0,80}\b(yoksa|ya da)\b/.test(f) || /\b[\w'’-]+ m[iu]\b,?\s+[\w'’-]+ m[iu]\b/.test(f);
}

// Cevabı ağza koyan "etiket sorular" ("... değil mi?", "öyle mi?", "doğru mu?").
export function yonlendiriciSoruMu(metin) {
  return /\b(degil mi|degil midir|oyle mi|boyle mi|dogru mu|yanlis mi|hakli mi)\b/.test(katla(metin));
}

export function cozumIstegiMi(metin) {
  return /cozum|pes ettim|acikla/.test(katla(metin));
}

// Metindeki SON soru cümlesi (kalın işaretleri atılmış).
export function soruCumlesiCikar(metin) {
  if (typeof metin !== 'string') return null;
  const temiz = metin.replace(/\*\*/g, '').trim();
  const parcalar = temiz.match(/[^.!?\n]+\?/g);
  if (!parcalar) return null;
  const son = parcalar[parcalar.length - 1].replace(/^[\s\-–•>*_"'“”]+/, '').trim();
  if (son.length < 4 || son.length > 300) return null;
  return son;
}

export function durumuDogrula(ham, { qid, messages }) {
  try {
    if (!ham || typeof ham !== 'object' || Array.isArray(ham)) return null;
    if (ham.v !== PEDAGOJI_SURUM || ham.qid !== qid) return null;
    if (!['MISS_1', 'STEP_BACK', 'RECOVERED'].includes(ham.faz)) return null;
    if (typeof ham.orig !== 'string' || !ham.orig || ham.orig.length > 300) return null;
    if (!Array.isArray(messages) || !Number.isInteger(ham.n) || messages.length !== ham.n + 1) return null;
    const hedef = katla(ham.orig);
    const konusmadaVar = messages.some(
      (m) => m && m.role === 'assistant' && typeof m.content === 'string' && katla(m.content.replace(/\*\*/g, '')).includes(hedef)
    );
    if (!konusmadaVar) return null;
    return { v: PEDAGOJI_SURUM, qid: ham.qid, faz: ham.faz, orig: ham.orig, n: ham.n };
  } catch (e) {
    return null;
  }
}

// Saf geçiş fonksiyonu. verdict: 'CORRECT' | 'WRONG' | 'UNCLEAR'
export function gecis(durum, verdict, { pending } = {}) {
  if (verdict !== 'CORRECT' && verdict !== 'WRONG') return { mod: null, yeni: durum || null };
  if (!durum) {
    if (verdict === 'CORRECT') return { mod: 'ADVANCE', yeni: null };
    if (!pending) return { mod: null, yeni: null };
    return { mod: 'MISS_1', yeni: { faz: 'MISS_1', orig: pending } };
  }
  if (durum.faz === 'MISS_1') {
    return verdict === 'WRONG'
      ? { mod: 'STEP_BACK', yeni: { faz: 'STEP_BACK', orig: durum.orig } }
      : { mod: 'ADVANCE', yeni: null };
  }
  if (durum.faz === 'STEP_BACK') {
    return verdict === 'CORRECT'
      ? { mod: 'RECOVERY', yeni: { faz: 'RECOVERED', orig: durum.orig } }
      : { mod: 'OFFER', yeni: null };
  }
  // RECOVERED
  return verdict === 'CORRECT'
    ? { mod: 'ADVANCE', yeni: null }
    : { mod: 'MISS_1', yeni: { faz: 'MISS_1', orig: durum.orig } };
}

// ------------------------------------------------------------
// Hüküm işareti: ilk satırda [[V=C|W|U]]. Ayıklama deterministik; görünür
// metne/board'a sızmaz. Eksik/bozuk/çelişkili => UNCLEAR.
// ------------------------------------------------------------
const ISARET_KATI = /\[\[\s*V\s*=\s*([A-Za-z]*)\s*\]\]/g;
const ISARET_GEVSEK = /\[{1,2}\s*V\s*=?\s*[A-Za-z]{0,8}\s*\]{0,2}/g;

function hukumeCevir(v) {
  const k = String(v || '').toUpperCase();
  if (k === 'C' || k === 'CORRECT') return 'CORRECT';
  if (k === 'W' || k === 'WRONG') return 'WRONG';
  return 'UNCLEAR';
}

// Dönüş: { temiz, hukumler: string[] (katı eşleşenler), bozuk: boolean }
export function isaretiAyikla(metin) {
  if (typeof metin !== 'string') return { temiz: metin, hukumler: [], bozuk: false };
  const hukumler = [];
  let temiz = metin.replace(ISARET_KATI, (_, v) => { hukumler.push(hukumeCevir(v)); return ''; });
  let bozuk = false;
  temiz = temiz.replace(ISARET_GEVSEK, () => { bozuk = true; return ''; });
  return { temiz: temiz.trim(), hukumler, bozuk };
}

// Birden çok blok/işaret için nihai hüküm: tek ve tutarlı katı işaret yoksa UNCLEAR.
export function nihaiHukum(hukumler, bozuk) {
  if (bozuk || !hukumler || hukumler.length === 0) return 'UNCLEAR';
  return hukumler.every((h) => h === hukumler[0]) ? hukumler[0] : 'UNCLEAR';
}

// Durum yönergesi ÖNCEKİ duruma (sunucunun bildiği faz) göre; hüküm sonradan gelir.
const GIRIS =
  'PEDAGOJIK KONTROL (SUNUCU KONTROLLU - ZORUNLU): Yanitinin ILK satiri SADECE su isaretlerden biri olmali: [[V=C]] (ogrencinin son cevabi bekleyen soruyu DOGRU yanitliyor), [[V=W]] (YANLIS ya da EKSIK) veya [[V=U]] (cevap denemesi degil / belirsiz). Karar ver: "be" fiili (is/are/was/were) cumlenin TEK sonlu yuklem fiiliyse DOGRU cevaptir. Isareti ASLA aciklama, ogrenci gormeyecek. ';
export function dogrulamaYonergesi(faz) {
  if (faz === 'STEP_BACK') {
    return GIRIS + 'Isaretten sonra HICBIR SEY yazma (her hukumde): sistem onayi/ipucunu ve asil soruyu kendisi ekler.';
  }
  if (faz === 'MISS_1') {
    return GIRIS + '[[V=C]] ise isaretten sonra normal ogretmen yanitini yaz (kisa dogrulama + BIR SONRAKI AVCI adimi, TEK soru). [[V=W]] ise isaretten sonra SADECE bekleyen sorudan BIR KADEME daha kucuk, somut, cevaplanabilir TEK alt soru yaz (ayni adim; bekleyen sorunun tekrari/yeniden ifadesi DEGIL; aday cevap listeleme, "mi yoksa" ve "degil mi"/"oyle mi" gibi yonlendirici soru YASAK; cevabi/iliskiyi aciklama ya da ima etme; soru cumlesini yeniden yazma/alintilama) ve baska HICBIR cumle yazma. [[V=U]] ise HICBIR SEY yazma.';
  }
  // durum yok / RECOVERED
  return GIRIS + '[[V=C]] ise isaretten sonra normal ogretmen yanitini yaz (kisa dogrulama + BIR SONRAKI AVCI adimi, TEK soru). [[V=W]] ise isaretten sonra HICBIR SEY yazma (sistem ipucunu kendisi verir). [[V=U]] ise HICBIR SEY yazma.';
}

// ------------------------------------------------------------
// SUNUCU ŞABLONLARI: genel (soru/cevap-bağımsız), içerik-kelimesiz => sızdıramaz.
// tohum (geçmiş uzunluğu) ile deterministik çeşitlilik.
// ------------------------------------------------------------
const MISS_1_IPUCLARI = [
  'Henüz değil, birlikte tekrar bakalım. Bu kez cümlenin yapısına, yani hangi bölümün ne iş yaptığına dikkat et.',
  'Henüz değil. Cümleyi baştan sona bir kez daha oku ve soruyla ilgili bölüme odaklan.',
  'Tam değil, acele etmeden tekrar bakalım. Cümlenin bölümlerini tek tek düşün.',
];
const ONAYLAR = ['Güzel, doğru.', 'Evet, doğru yoldasın.', 'Doğru, güzel bir adım.'];
const STEP_BACK_YEDEK = 'Bir adım geri gidelim ve daha küçük bakalım: bu soruyla ilgili olarak cümlede gözünü ilk çeken tek bir kelime ya da bölüm hangisi?';
const OFFER_SABLONU = 'Şimdilik zorlanıyor gibisin; istersen bir ipucu daha verebilirim ya da "Cozumu goster." diyebilirsin.';
const HOLD_GIRIS = 'Cevabını tam anlayamadım; aynı soruya kendi cümlelerinle bir daha bakalım.';

export function sablon(mod, { orig, tohum = 0 } = {}) {
  const i = Math.abs(Number.isFinite(tohum) ? tohum : 0);
  switch (mod) {
    case 'MISS_1':
      return `${MISS_1_IPUCLARI[i % MISS_1_IPUCLARI.length]}\n\n${orig}`;
    case 'STEP_BACK':
      return STEP_BACK_YEDEK;
    case 'RECOVERY':
      return `${ONAYLAR[i % ONAYLAR.length]}\n\n${orig}`;
    case 'OFFER':
      return OFFER_SABLONU;
    case 'HOLD':
      return orig ? `${HOLD_GIRIS}\n\n${orig}` : null;
    default:
      return null;
  }
}

function cumleAyir(metin) {
  return String(metin || '')
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

// STEP_BACK: modelin metninden TEK soruyu deterministik doğrular; ihlalde genel yedek.
// Dönüş: { metin, yedek, sebep }
export function geriAdimDogrula(modelMetni, { orig, oncekiSoru, verbatimIhlalMi } = {}) {
  const yedek = (sebep) => ({ metin: STEP_BACK_YEDEK, yedek: true, sebep });
  try {
    const cumleler = cumleAyir(String(modelMetni || '').replace(/\*\*/g, ''));
    const sorular = cumleler.filter((c) => c.includes('?'));
    if (sorular.length !== 1) return yedek('soru-sayisi');
    const soru = sorular[0].replace(/^[\s\-–•>*_"'“”]+/, '').trim();
    if (!soru.endsWith('?')) return yedek('soru-bicimi');
    if (soru.length > 220) return yedek('uzun-soru');
    if (alternatifSoruMu(soru)) return yedek('aday-listesi');
    if (yonlendiriciSoruMu(soru)) return yedek('yonlendirici');
    if (orig && benzerlik(soru, orig) >= 0.6) return yedek('orijinal-tekrari');
    if (oncekiSoru && benzerlik(soru, oncekiSoru) >= 0.6) return yedek('onceki-tekrari');
    if (typeof verbatimIhlalMi === 'function' && verbatimIhlalMi(soru)) return yedek('verbatim');
    return { metin: soru, yedek: false, sebep: null };
  } catch (e) {
    return yedek('hata');
  }
}

// Hüküm + önceki duruma göre nihai yanıtı KURAR. Model metni SADECE ADVANCE'te
// (olduğu gibi) ve STEP_BACK'te (doğrulanmış TEK soru olarak) kullanılır.
// Dönüş: { mod, yeni: {faz,orig}|null, metin: string|null, yedek: boolean, taşi: boolean }
//   mod 'HOLD' => durum ilerlemez/yanlış sayılmaz; metin bekleyen soruyu korur.
export function yanitiKur({ gecerli, hukum, pending, modelMetni, ogrenciMetni, tohum, verbatimIhlalMi }) {
  const g = gecis(gecerli, hukum, { pending });
  if (!g.mod) {
    return { mod: 'HOLD', yeni: gecerli ? { faz: gecerli.faz, orig: gecerli.orig } : null, metin: sablon('HOLD', { orig: pending }), yedek: false };
  }
  const orig = (g.yeni && g.yeni.orig) || (gecerli && gecerli.orig) || pending;
  switch (g.mod) {
    case 'ADVANCE': {
      const m = String(modelMetni || '').trim();
      return { mod: 'ADVANCE', yeni: null, metin: m || 'Doğru. Devam edelim.', yedek: false };
    }
    case 'MISS_1':
      return { mod: 'MISS_1', yeni: g.yeni, metin: sablon('MISS_1', { orig, tohum }), yedek: false };
    case 'STEP_BACK': {
      const s = geriAdimDogrula(modelMetni, { orig, oncekiSoru: pending, verbatimIhlalMi });
      return { mod: 'STEP_BACK', yeni: g.yeni, metin: s.metin, yedek: s.yedek };
    }
    case 'RECOVERY':
      return { mod: 'RECOVERY', yeni: g.yeni, metin: sablon('RECOVERY', { orig, tohum }), yedek: false };
    case 'OFFER':
      return { mod: 'OFFER', yeni: null, metin: sablon('OFFER'), yedek: false };
    default:
      return { mod: 'HOLD', yeni: gecerli || null, metin: sablon('HOLD', { orig: pending }), yedek: false };
  }
}
