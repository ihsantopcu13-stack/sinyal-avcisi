// ============================================================
// PDF REHBER PANELİ — "100 Sinyal Kelime ve Tuzaklar Rehberi"
// ============================================================
// /sinyal-soru ve /sinyal-kartlari sayfalarında <div id="pdf-paylas"> içine
// banner + modal kurar. PDF her zaman ücretsiz ve şartsız iner; paylaşım
// İhsan isteği (8 Kas 2026, 21:58): indirme düğmesi bir paylaşım işleminden
// (WhatsApp, Telegram, Bağlantıyı kopyala) sonra açılır; localStorage 'pdf_unlocked'
// kaydı kalıcıdır, sayfa yenilense de açık kalır. Üyelik, kayıt, sunucu yok.
// Not: /zitlik-baglaclari sayfasındaki doğrudan indirme bilerek şartsız kalır
// (yayınlanan gönderiler "paylaşım şartı yok" diyor).
// ============================================================
(function (kok) {
  'use strict';

  var PDF = '/assets/sinyal-avcisi-100-sinyal-kelime-rehberi.pdf';
  var PDF_ADI = '100 Sinyal Kelime ve Tuzaklar Rehberi';
  var SITE = 'https://sinyal-avcisi.com';
  var LS = 'pdf_unlocked';
  function acikMi() { try { return localStorage.getItem(LS) === 'true'; } catch (e) { return false; } }
  function kilidiAc() { try { localStorage.setItem(LS, 'true'); } catch (e) {} }

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
    var acik = acikMi();

    // ---- banner ----
    var banner = el('section', 'pp-banner');
    banner.setAttribute('aria-label', 'Ücretsiz PDF rehber');
    var bm = el('div', 'pp-banner-metin');
    bm.append(el('b', null, 'Bonus PDF Rehberi Kazan'), el('span', null, PDF_ADI + ': 100 kelime, her biri için kural, örnek ve tuzak. Ücretsiz.'));
    var bAc = el('button', 'pp-btn');
    bAc.type = 'button';
    bAc.innerHTML = IKON.indir + '<span>Rehberi kazan</span>';
    banner.append(bm, bAc);

    // ---- modal ----
    var d = el('dialog', 'pp-modal');
    d.setAttribute('aria-labelledby', 'pp-baslik');
    var ic = el('div', 'pp-ic');
    var ust = el('div', 'pp-ust');
    var h = el('h2', null, 'YDS & YÖKDİL 100 Sinyal Kelime ve Tuzak Rehberi (PDF)');
    h.id = 'pp-baslik';
    var kapat = el('button', 'pp-kapat', '×');
    kapat.type = 'button';
    kapat.setAttribute('aria-label', 'Kapat');
    ust.append(h, kapat);

    var aciklama = el('p', 'pp-aciklama', 'Sitemizi 1 arkadaşınla veya çalışma grubunla paylaş, 100 sinyal kelimelik özel PDF rehberinin indirme bağlantısını anında aç!');
    var indir = el('a', 'pp-btn pp-indir');
    indir.innerHTML = IKON.indir + '<span>PDF Rehberini İndir</span>';
    indir.addEventListener('click', function (e) {
      if (!acik) { e.preventDefault(); return; }
      olay('pdf_rehber_indir');
    });
    var not = el('p', 'pp-not');
    var link = el('a', 'pp-link');
    link.href = PDF;
    link.setAttribute('download', '');
    link.textContent = SITE.replace('https://', '') + PDF;

    var pb = el('p', 'pp-paylas-baslik', '1. Paylaş');
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

    var ib = el('p', 'pp-paylas-baslik', '2. İndir');
    function kilitCiz() {
      if (acik) {
        indir.href = PDF;
        indir.setAttribute('download', '');
        indir.removeAttribute('aria-disabled');
        indir.removeAttribute('tabindex');
        not.textContent = '';
        not.append('Kilit açık. 23 sayfa, yaklaşık 0,4 MB. Bağlantı: ', link);
      } else {
        indir.removeAttribute('href');
        indir.setAttribute('aria-disabled', 'true');
        indir.setAttribute('role', 'link');
        indir.setAttribute('tabindex', '-1');
        not.textContent = 'Paylaşım düğmelerinden birine bastığında bu düğme açılır.';
      }
    }
    function paylasildi(kanal) {
      olay('pdf_rehber_paylas', { kanal: kanal });
      var yeni = !acik;
      acik = true; kilidiAc(); kilitCiz();
      if (kanal !== 'kopya') durum.textContent = yeni ? 'Teşekkürler! İndirme bağlantısı açıldı.' : 'Teşekkürler, paylaştığın için!';
      else if (yeni) durum.textContent += ' İndirme bağlantısı açıldı.';
    }
    wa.addEventListener('click', function () { paylasildi('whatsapp'); });
    tg.addEventListener('click', function () { paylasildi('telegram'); });
    kp.addEventListener('click', function () {
      function tamam() { durum.textContent = 'Bağlantı kopyalandı: ' + P.url; paylasildi('kopya'); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(P.url).then(tamam, function () { yedekKopya(P.url); tamam(); });
      else { yedekKopya(P.url); tamam(); }
    });

    ic.append(ust, aciklama);
    ic.append(pb, pl, durum, ib, indir, not);
    d.append(ic);
    kilitCiz();

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

  kok.PdfPaylas = { PDF: PDF, LS: LS, paylasimBilgisi: paylasimBilgisi, baslat: baslat };
  if (typeof document !== 'undefined' && document.getElementById) {
    var k = document.getElementById('pdf-paylas');
    if (k) baslat(k);
  }
})(typeof window !== 'undefined' ? window : this);
