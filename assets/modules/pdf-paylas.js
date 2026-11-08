// ============================================================
// PDF REHBER PANELİ — "100 Sinyal Kelime ve Tuzaklar Rehberi"
// ============================================================
// /sinyal-soru ve /sinyal-kartlari sayfalarında <div id="pdf-paylas"> içine
// banner + modal kurar. PDF her zaman ücretsiz ve şartsız iner; paylaşım
// düğmeleri (WhatsApp, Telegram, kopyala) yalnız teşvik içindir; indirme
// paylaşıma bağlı DEĞİL (İhsan kararı, 8 Kas 2026: kilitsiz). Üyelik, kayıt, sunucu yok.
// ============================================================
(function (kok) {
  'use strict';

  var PDF = '/assets/sinyal-avcisi-100-sinyal-kelime-rehberi.pdf';
  var PDF_ADI = '100 Sinyal Kelime ve Tuzaklar Rehberi';
  var SITE = 'https://sinyal-avcisi.com';

  /** Paylaşım metni ve bağlantısı. Sayfanın kanonik adresini kullanır. */
  function paylasimBilgisi(belge) {
    var kanon = belge && belge.querySelector && belge.querySelector('link[rel="canonical"]');
    var url = (kanon && kanon.href) || SITE;
    var metin = 'YDS ve YÖKDİL için ücretsiz sinyal kelime soruları, kartlar ve 100 kelimelik PDF rehber. Üyelik yok:';
    return {
      url: url,
      metin: metin,
      whatsapp: 'https://wa.me/?text=' + encodeURIComponent(metin + ' ' + url),
      telegram: 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(metin)
    };
  }

  var IKON = {
    indir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9.5 9.5c.3 1.8 2.2 3.8 4 4.2l1-1 1.8.8-.4 1.4c-3 .4-7-3.5-6.8-6.6l1.4-.4.8 1.8z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 4 3 11l6 2 2 6 3-4 5 4z"/><path d="m9 13 8-6"/></svg>',
    kopya: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>'
  };

  function el(etiket, sinif, metin) {
    var e = document.createElement(etiket);
    if (sinif) e.className = sinif;
    if (metin != null) e.textContent = metin;
    return e;
  }
  function olay(ad, ek) { try { if (typeof window.gtag === 'function') window.gtag('event', ad, ek || {}); } catch (e) {} }

  function baslat(kap) {
    if (!kap) return;
    var P = paylasimBilgisi(document);

    // ---- banner ----
    var banner = el('section', 'pp-banner');
    banner.setAttribute('aria-label', 'Ücretsiz PDF rehber');
    var bm = el('div', 'pp-banner-metin');
    bm.append(el('b', null, 'Ücretsiz PDF: ' + PDF_ADI), el('span', null, '100 kelime, her biri için kural, örnek ve tuzak. Yazdır, istediğin yerde çalış.'));
    var bAc = el('button', 'pp-btn');
    bAc.type = 'button';
    bAc.innerHTML = IKON.indir + '<span>PDF rehberini al</span>';
    banner.append(bm, bAc);

    // ---- modal ----
    var d = el('dialog', 'pp-modal');
    d.setAttribute('aria-labelledby', 'pp-baslik');
    var ic = el('div', 'pp-ic');
    var ust = el('div', 'pp-ust');
    var h = el('h2', null, 'YDS ve YÖKDİL: ' + PDF_ADI + ' (PDF)');
    h.id = 'pp-baslik';
    var kapat = el('button', 'pp-kapat', '×');
    kapat.type = 'button';
    kapat.setAttribute('aria-label', 'Kapat');
    ust.append(h, kapat);

    var aciklama = el('p', 'pp-aciklama', 'Rehber ücretsiz. Kayıt ya da paylaşım şartı yok, hemen indir. Faydalı bulursan bir arkadaşınla ya da çalışma grubunla paylaş.');
    var indir = el('a', 'pp-btn pp-indir');
    indir.href = PDF;
    indir.setAttribute('download', '');
    indir.innerHTML = IKON.indir + '<span>PDF rehberini indir</span>';
    indir.addEventListener('click', function () { olay('pdf_rehber_indir'); });
    var not = el('p', 'pp-not', '23 sayfa, yaklaşık 0,4 MB.');

    var pb = el('p', 'pp-paylas-baslik', 'Bir arkadaşına da gönder');
    var pl = el('div', 'pp-paylas');
    function paylasBtn(ikon, yazi, href) {
      var b = el(href ? 'a' : 'button', 'pp-btn pp-ikincil');
      if (href) { b.href = href; b.target = '_blank'; b.rel = 'noopener'; } else b.type = 'button';
      b.innerHTML = IKON[ikon] + '<span>' + yazi + '</span>';
      return b;
    }
    var wa = paylasBtn('whatsapp', 'WhatsApp', P.whatsapp);
    var tg = paylasBtn('telegram', 'Telegram', P.telegram);
    var kp = paylasBtn('kopya', 'Bağlantıyı kopyala');
    pl.append(wa, tg, kp);
    var durum = el('p', 'pp-durum');
    durum.setAttribute('aria-live', 'polite');

    function paylasildi(kanal) {
      olay('pdf_rehber_paylas', { kanal: kanal });
      if (kanal !== 'kopya') durum.textContent = 'Teşekkürler, paylaştığın için!';
    }
    wa.addEventListener('click', function () { paylasildi('whatsapp'); });
    tg.addEventListener('click', function () { paylasildi('telegram'); });
    kp.addEventListener('click', function () {
      function tamam() { durum.textContent = 'Bağlantı kopyalandı: ' + P.url; paylasildi('kopya'); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(P.url).then(tamam, function () { yedekKopya(P.url); tamam(); });
      else { yedekKopya(P.url); tamam(); }
    });

    ic.append(ust, aciklama);
    ic.append(indir, not, pb, pl, durum);
    d.append(ic);

    bAc.addEventListener('click', function () {
      olay('pdf_rehber_ac');
      if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    });
    kapat.addEventListener('click', function () { d.close ? d.close() : d.removeAttribute('open'); });
    d.addEventListener('click', function (e) { if (e.target === d && d.close) d.close(); }); // dışına dokununca kapan

    kap.innerHTML = '';
    kap.append(banner, d);
  }

  function yedekKopya(t) {
    try {
      var ta = document.createElement('textarea');
      ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    } catch (e) {}
  }

  kok.PdfPaylas = { PDF: PDF, paylasimBilgisi: paylasimBilgisi, baslat: baslat };
  if (typeof document !== 'undefined' && document.getElementById) {
    var k = document.getElementById('pdf-paylas');
    if (k) baslat(k);
  }
})(typeof window !== 'undefined' ? window : this);
