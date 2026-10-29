// ============================================================
// AVCI SOSYAL BİLİMLER ÖĞRETMENİ + İNSAN DİLİ FİLTRESİ
// ============================================================
// _klodAciklama.mjs (mode:'aciklama') için KOŞULLU ek katman. Sadece
// soru Sosyal Bilimler kapsamındaysa devreye girer; diğer sorularda prompt,
// önbellek anahtarı ve çıktı birebir eskisi gibidir.
//
// Katman şu durumlarda açılır:
//   - soru_en içinde aşağıdaki ALAN_KANITLARI'ndan biri AÇIKÇA geçiyorsa, ya da
//   - sorular.json'daki kategori "Sosyal" ile başlıyorsa (alan o zaman
//     "Alan kesin olarak belirlenemedi." olur — kategori alanın kanıtı değildir).
// Alanı model değil bu modül belirler; model bu değeri değiştiremez.
//
// Deterministik korumalar (prompt'a güvenilmez):
//   - Eksik/okunamayan soru → model çağrılmaz, tahmin yürütülmez.
//   - ana_fiil ve çivi tablo parçaları soru cümlesinde birebir geçmiyorsa
//     katman çıktısı atılır (uydurma kelime kabul edilmez).
//   - Nesnesiz fiil için tip "SV"dir; SVO'da nesne yerine zarf/edat öbeği
//     yazılmışsa (ör. "more quickly than anticipated") çıktı atılır.
//   - Bilgi notunda kaynakta olmayan bir sayı/yıl varsa not, sabit
//     "doğrulanmadı" cümlesiyle değiştirilir.
//   - İnsan Dili Filtresi SADECE Türkçe anlatım alanlarına uygulanır;
//     doğru cevap, çivi tablo, sinyal, sağ-sol ve şık eleme alanlarına dokunmaz.

export const SB_SURUM = 2;
export const ALAN_BELIRSIZ = 'Alan kesin olarak belirlenemedi.';
export const BILGI_DOGRULANMADI = 'Bu alan bilgisi doğrulanmadığı için eklenmedi.';

// Alan adı → soru cümlesinde alanı AÇIKÇA gösteren kelime kökleri.
// Bilinçli olarak dar: "policy", "society", "population" gibi genel
// kelimeler alan kanıtı sayılmaz.
const ALAN_KANITLARI = [
  ['Tarih', /\b(history|histories|historian|historians|historical|historically|historiography)\b/i],
  ['Coğrafya', /\b(geography|geographer|geographers|geographic|geographical|geographically)\b/i],
  ['Sosyoloji', /\b(sociology|sociologist|sociologists|sociological|sociologically)\b/i],
  ['Psikoloji', /\b(psychology|psychologist|psychologists|psychological|psychologically)\b/i],
  ['Ekonomi', /\b(economics|economist|economists|economy|economies|economic|economically)\b/i],
  ['Siyaset bilimi', /\b(political science|political scientists?|politics|political|politically)\b/i],
  ['Antropoloji', /\b(anthropology|anthropologist|anthropologists|anthropological)\b/i],
  ['Arkeoloji', /\b(archaeology|archeology|archaeologist|archaeologists|archeologists?|archaeological|archeological)\b/i],
];

export const SOSYAL_ALANLAR = ALAN_KANITLARI.map(([alan]) => alan);

// Tek bir alan açıkça geçiyorsa { alan, kanit }. Hiç geçmiyorsa ya da
// birden fazla alan geçiyorsa { alan: ALAN_BELIRSIZ, kanit: null }.
export function alanTespit(metin) {
  const bulunan = [];
  for (const [alan, re] of ALAN_KANITLARI) {
    const m = String(metin || '').match(re);
    if (m) bulunan.push({ alan, kanit: m[0] });
  }
  return bulunan.length === 1 ? bulunan[0] : { alan: ALAN_BELIRSIZ, kanit: null };
}

// Katman bu soru için açılmalı mı? Açılmayacaksa null.
export function sosyalKatmanBaglami(soru) {
  if (!soru) return null;
  const tespit = alanTespit(soru.soru_en);
  const sosyalKategori = typeof soru.kategori === 'string' && /^sosyal\b/i.test(soru.kategori.trim());
  if (tespit.alan === ALAN_BELIRSIZ && !sosyalKategori) return null;
  return tespit;
}

const OKUNAMAZ = /�|\?{3,}|\[\s*\?\s*\]|\[(okunamad\w*|illegible|unreadable)\]/i;

function doluMetin(v) {
  return typeof v === 'string' && v.trim().length > 0 && !OKUNAMAZ.test(v);
}

// Soru ve bütün seçenekler eksiksiz mi? Eksikse neyin eksik olduğunu döner.
export function soruDurumu(soru) {
  const eksik = [];
  if (!doluMetin(soru && soru.soru_en)) eksik.push('soru cümlesi');
  if (!doluMetin(soru && soru.soru_tr)) eksik.push('soru kökü');
  const sec = soru && Array.isArray(soru.secenekler_tr) ? soru.secenekler_tr : [];
  if (sec.length < 2 || sec.some(s => !doluMetin(s))) eksik.push('seçenekler');
  if (!(soru && Number.isInteger(soru.dogru_index) && sec[soru.dogru_index] !== undefined)) eksik.push('cevap anahtarı');
  return eksik.length ? { tamam: false, eksik } : { tamam: true, eksik: [] };
}

export const EKSIK_SORU_MESAJI = 'Bu soru eksik ya da okunamıyor. KLOD eksik soruda tahmin yürütmez; soru tamamlanınca tekrar dene.';

export const SOSYAL_BILIMLER_PROMPT = `SOSYAL BİLİMLER ÖĞRETMENİ KATMANI (bu soru için AÇIK)
Bu soru Sosyal Bilimler kapsamında. Yukarıdaki kurallar ve alanlar aynen geçerli; ek olarak "sosyal" nesnesini doldur.
SIRA (bu sırayla düşün):
1. Soru ve seçenekler sana eksiksiz verildi; eksik ya da okunamayan kelime görürsen tahmin etme, "emin": false yaz.
2. İngilizce cümleyi ve seçenekleri DEĞİŞTİRME; alıntı yaparken birebir kopyala.
3. Ana fiili bul. 4. S-V-O ya da gerekiyorsa S-V-C iskeletini çıkar. Fiil nesne almıyorsa tip "SV" olur ve "o" boş kalır.
   Zarf, zarf öbeği ve edat öbeği (ör. "quickly", "more quickly than anticipated", "in the city") nesne ya da tümleç DEĞİLDİR; "o" alanına yazma.
5. Zaman, bağlaç, edat, modal, passive ve relative clause sinyallerini belirle; olmayanı yazma.
6. Boşluğun sağına ve soluna bak ("yapi" alanı). Boşluk yoksa bunu söyle.
7. Seçenekleri dilbilgisi ve anlam kanıtıyla ele ("eleme" alanı).
8. ALAN sana verildi. Onu değiştirme, yeni alan önerme.
9. Bilgi notuna SADECE cümlede ve REFERANS AÇIKLAMA'da yazan bilgiyi koy. Soruyu anlamak için dışarıdan bilgi gerekiyorsa ya da emin değilsen notu TAM OLARAK şöyle yaz: "${BILGI_DOGRULANMADI}"
10. Doğru cevabı cümleden kanıtla. 11. ÖSYM tuzağını göster. 12. "avci_ipucu" 3 saniyelik çözüm kartıdır.
DOĞRULUK
- Kaynakta olmayan tarih, kişi, olay, tanım, örnek ya da bilimsel bilgi ekleme.
- Sayıları, özel isimleri ve cevap anahtarını değiştirme.
- Doğruluk ile akıcı anlatım çatışırsa doğruluğu seç.
İNSAN DİLİ (sadece Türkçe anlatım alanlarında: sade_turkce, bilgi_notu, kanit, osym_tuzagi)
- Sıcak, sade, tane tane öğretmen dili. Kısa cümle; uzun cümleyi böl.
- Gereksiz resmiyet, tekrar ve süslü ifade yok. Övgü ve reklam dili yok.
- Teknik terimi silme; hemen yanına parantez içinde kolay Türkçesini yaz (ör. "passive (edilgen yapı)").
- Uydurma kişisel deneyim, duygu, alıntı ya da kaynak yazma.
- "Bu sadece X değil, aynı zamanda Y" kalıbını kullanma. "Hocam" hitabını en fazla bir kez kullan.
"sosyal" NESNESİ (JSON'a ekle, diğer alanların yanına):
"sosyal": {
  "ana_fiil": "cümlede birebir geçen ana fiil",
  "cekirdek": {"tip": "SVO", "SVC" ya da "SV", "s": "özne (cümleden birebir)", "v": "fiil (cümleden birebir)", "o": "nesne ya da tümleç (cümleden birebir; SV ise boş: \"\")"},
  "sinyaller": "zaman/bağlaç/edat/modal/passive/relative clause sinyalleri ve anlamları",
  "sade_turkce": "cümlenin sade Türkçesi",
  "bilgi_notu": "kaynaktaki alan bilgisi ya da sabit doğrulanmadı cümlesi",
  "kanit": "doğru cevabı cümleden kanıtlayan kısım",
  "osym_tuzagi": "bu sorudaki ÖSYM tuzağı"
}`;

export function sosyalKullaniciEki(baglam) {
  return baglam.kanit
    ? `ALAN: ${baglam.alan} (soru cümlesindeki açık kanıt: "${baglam.kanit}")`
    : `ALAN: ${ALAN_BELIRSIZ}`;
}

const SB_ALAN_MAX = 600;
function sbMetin(v) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= SB_ALAN_MAX;
}

// SVO'da "nesne" zarf ya da edat öbeğiyle başlıyorsa nesne değildir.
const EDATLAR = 'about|above|across|after|against|along|among|around|at|before|behind|below|beneath|beside|between|beyond|by|despite|during|for|from|in|inside|into|near|of|off|on|onto|out|over|since|than|through|throughout|to|toward|towards|under|until|upon|with|within|without';
const ZARF_NESNE = new RegExp(`^(?:(?:${EDATLAR})\\b|(?:more|less|most|least|as|so|very|too|rather|quite)\\s+\\w+ly\\b|\\w+ly\\s*$)`, 'i');
export function nesneZarfMi(o) {
  return ZARF_NESNE.test(String(o || '').trim());
}

function cumledeGeciyor(parca, cumle) {
  const p = String(parca || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const c = String(cumle || '').replace(/\s+/g, ' ').toLowerCase();
  return p.length > 0 && c.includes(p);
}

// Bilgi notundaki sayılar (yıl, yüzde vb.) kaynakta yoksa not uydurma sayılır.
function notKaynaktaMi(not, soru) {
  const kaynak = [soru.soru_en, soru.soru_tr, soru.aciklama_tr, soru.sinyal_ipucu, soru.tuzak_ipucu, ...(soru.secenekler_tr || [])].join(' ');
  const sayilar = String(not).match(/\d+(?:[.,]\d+)?/g) || [];
  return sayilar.every(s => kaynak.includes(s));
}

// ------------------------------------------------------------
// İNSAN DİLİ FİLTRESİ — son düzenleme aşaması, deterministik.
// Anlamı değiştirebilecek hiçbir dönüşüm yapmaz: kelime eklemez,
// kelime çevirmez, cümle yeniden yazmaz. Sadece:
//   1) fazla boşlukları sadeleştirir,
//   2) art arda birebir tekrarlanan cümleyi bir kez bırakır,
//   3) "Hocam" hitabını tüm alanlarda en fazla bir kez bırakır.
// ------------------------------------------------------------
const HOCAM = /(^|[.!?]\s+)Hocam,?\s+(\S)/gu;

function tekrarCumleleriAt(metin) {
  const cumleler = metin.match(/[^.!?]+[.!?]*\s*/g) || [metin];
  const sonuc = [];
  for (const c of cumleler) {
    const onceki = sonuc[sonuc.length - 1];
    if (onceki && onceki.trim().toLocaleLowerCase('tr') === c.trim().toLocaleLowerCase('tr')) continue;
    sonuc.push(c);
  }
  return sonuc.join('').trim();
}

export function insanDiliFiltresi(alanlar) {
  let hocamGoruldu = false;
  const cikti = {};
  for (const [ad, deger] of Object.entries(alanlar)) {
    let m = String(deger).replace(/\s+/g, ' ').trim();
    m = tekrarCumleleriAt(m);
    m = m.replace(HOCAM, (tum, onEk, harf) => {
      if (!hocamGoruldu) { hocamGoruldu = true; return tum; }
      return onEk + harf.toLocaleUpperCase('tr');
    });
    cikti[ad] = m;
  }
  return cikti;
}

const FILTRE_ALANLARI = ['sade_turkce', 'bilgi_notu', 'kanit', 'osym_tuzagi'];

// Modelin "sosyal" nesnesini doğrular. Geçersizse { hata }, geçerliyse { sosyal }.
export function sosyalDogrula(ham, soru, baglam) {
  if (!ham || typeof ham !== 'object' || Array.isArray(ham)) return { hata: 'sosyal_yok' };
  const c = ham.cekirdek;
  if (!c || typeof c !== 'object') return { hata: 'cekirdek_yok' };
  const tip = typeof c.tip === 'string' ? c.tip.replace(/[^A-Z]/gi, '').toUpperCase() : '';
  if (tip !== 'SVO' && tip !== 'SVC' && tip !== 'SV') return { hata: 'cekirdek_tip' };
  for (const alan of ['ana_fiil', 'sinyaller', ...FILTRE_ALANLARI]) {
    if (!sbMetin(ham[alan])) return { hata: 'sosyal_alan_eksik:' + alan };
  }
  for (const p of tip === 'SV' ? ['s', 'v'] : ['s', 'v', 'o']) {
    if (!sbMetin(c[p])) return { hata: 'cekirdek_eksik:' + p };
  }
  if (tip === 'SV' && typeof c.o === 'string' && c.o.trim()) return { hata: 'sv_nesne_dolu' };
  if (tip === 'SVO' && nesneZarfMi(c.o)) return { hata: 'nesne_zarf' };
  const parcalar = tip === 'SV' ? [ham.ana_fiil, c.s, c.v] : [ham.ana_fiil, c.s, c.v, c.o];
  // Uydurma kelime koruması: fiil ve iskelet parçaları cümlede birebir geçmeli.
  for (const parca of parcalar) {
    if (!cumledeGeciyor(parca, soru.soru_en)) return { hata: 'cumlede_yok' };
  }

  let bilgiNotu = ham.bilgi_notu.trim();
  let notDogrulandi = bilgiNotu === BILGI_DOGRULANMADI || notKaynaktaMi(bilgiNotu, soru);
  if (!notDogrulandi) bilgiNotu = BILGI_DOGRULANMADI;

  const filtreli = insanDiliFiltresi({
    sade_turkce: ham.sade_turkce,
    bilgi_notu: bilgiNotu,
    kanit: ham.kanit,
    osym_tuzagi: ham.osym_tuzagi,
  });

  return {
    sosyal: {
      surum: SB_SURUM,
      soru_durumu: 'Soru ve bütün seçenekler eksiksiz.',
      alan: baglam.alan,
      alan_kaniti: baglam.kanit,
      ana_fiil: ham.ana_fiil.trim(),
      cekirdek: { tip, s: c.s.trim(), v: c.v.trim(), o: tip === 'SV' ? '' : c.o.trim() },
      sinyaller: ham.sinyaller.trim(),
      ...filtreli,
      dogrulama: [
        'Soru eksiksiz.',
        'Doğru cevap cevap anahtarıyla eşleşti.',
        'Ana fiil ve çivi tablo soru cümlesinde birebir bulundu; nesne yerine zarf yazılmadı.',
        notDogrulandi && bilgiNotu !== BILGI_DOGRULANMADI ? 'Bilgi notu yalnızca soru kaynağına dayanıyor.' : 'Haricî alan bilgisi eklenmedi.',
      ].join(' '),
    },
  };
}
