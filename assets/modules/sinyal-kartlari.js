// ============================================================
// SİNYAL KELİME KARTLARI — arayüz (sayfa: /sinyal-kartlari, 2026-11-08)
// ============================================================
// Veri: assets/data/sinyal-kartlari.js (SINYAL_KARTLARI dizisi).
// Sinyal türü adları/renkleri: assets/modules/sinyal-soru.js (SINYAL_TIPLERI)
// ve assets/sinyal-tema.css (.ss-t-<tür>).
// İlerleme: localStorage 'sa_sinyal_kart_v1' = {durum:{word:'ogrendim'|'tekrar'}, liste, tur}
// Üyelik/ödeme kontrolü yok; her kart herkese açık.
// ============================================================
(function (kok) {
  'use strict';

  var SEVIYELER = { kolay: 'Kolay', orta: 'Orta', zor: 'Zor' };
  var TURLER_YEDEK = { zitlik: { ad: 'Zıtlık' }, sebep: { ad: 'Sebep-sonuç' }, zaman: { ad: 'Zaman' }, kosul: { ad: 'Koşul' }, ekleme: { ad: 'Ekleme' }, olumsuz: { ad: 'Gizli olumsuz' } };
  function turler() { return (kok.SinyalSoru && kok.SinyalSoru.SINYAL_TIPLERI) || TURLER_YEDEK; }

  /** Kartın biçimini denetler. Boş dizi = sorun yok. */
  function kartDogrula(k) {
    var h = [], ad = (k && k.word) || '(adsız)';
    function hata(m) { h.push(ad + ': ' + m); }
    if (!k || typeof k !== 'object') return ['kart nesne değil'];
    ['word', 'tr', 'islev', 'ornek', 'ornekTr', 'tuzak'].forEach(function (a) {
      if (typeof k[a] !== 'string' || !k[a].trim()) hata(a + ' boş');
    });
    if (!turler()[k.type]) hata('bilinmeyen type: ' + k.type);
    if (!SEVIYELER[k.level]) hata('level kolay, orta ya da zor olmalı');
    if (k.word && k.ornek) {
      var eksik = k.word.split(/\s*\.\.\.\s*/).filter(function (p) { return k.ornek.toLowerCase().indexOf(p.toLowerCase()) === -1; });
      if (eksik.length) hata('örnek cümlede "' + eksik.join(', ') + '" geçmiyor');
    }
    return h;
  }

  /** Listeyi duruma ve türe göre süzer. liste: 'hepsi'|'tekrar'|'ogrendim'|'yeni', tur: 'hepsi'|<tür> */
  function filtrele(kartlar, durum, liste, tur) {
    return kartlar.filter(function (k) {
      var d = durum[k.word];
      if (tur && tur !== 'hepsi' && k.type !== tur) return false;
      if (liste === 'tekrar') return d === 'tekrar';
      if (liste === 'ogrendim') return d === 'ogrendim';
      if (liste === 'yeni') return !d;
      return true;
    });
  }

  /** Örnek cümlede sinyal kelimeyi bulup parçalara ayırır (vurgu için). */
  function ornekParcala(ornek, word) {
    var parcalar = [], kalan = ornek, alt = ornek.toLowerCase();
    var aranan = word.split(/\s*\.\.\.\s*/);
    var imlec = 0;
    aranan.forEach(function (p) {
      var i = alt.indexOf(p.toLowerCase(), imlec);
      if (i === -1) return;
      if (i > imlec) parcalar.push({ v: false, m: ornek.slice(imlec, i) });
      parcalar.push({ v: true, m: ornek.slice(i, i + p.length) });
      imlec = i + p.length;
    });
    if (imlec < ornek.length) parcalar.push({ v: false, m: ornek.slice(imlec) });
    return parcalar.length ? parcalar : [{ v: false, m: kalan }];
  }

  var Cekirdek = { SEVIYELER: SEVIYELER, kartDogrula: kartDogrula, filtrele: filtrele, ornekParcala: ornekParcala };

  // ======================= ARAYÜZ =======================
  var LS = 'sa_sinyal_kart_v1';
  function oku() { try { var v = JSON.parse(localStorage.getItem(LS)); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function yaz(v) { try { localStorage.setItem(LS, JSON.stringify(v)); } catch (e) {} }
  function $(id) { return document.getElementById(id); }
  function el(t, c, m) { var e = document.createElement(t); if (c) e.className = c; if (m != null) e.textContent = m; return e; }

  function baslat(kartlar) {
    kartlar = (kartlar || []).filter(function (k) { return kartDogrula(k).length === 0; });
    var kayit = oku();
    kayit.durum = kayit.durum || {};
    var D = { liste: kayit.liste || 'hepsi', tur: kayit.tur || 'hepsi', idx: 0, gorunen: [], cevrik: false };

    var kart = $('sk-kart'), ic = $('sk-ic'), on = $('sk-on'), arka = $('sk-arka');
    var bos = $('sk-bos'), sayac = $('sk-sayac'), ilerleme = $('sk-ilerleme'), cubuk = $('sk-cubuk');
    var listeler = $('sk-listeler'), turKutu = $('sk-turler');

    // tür süzgeci düğmeleri
    var T = turler();
    var turAnahtarlari = ['hepsi'].concat(Object.keys(T).filter(function (t) { return kartlar.some(function (k) { return k.type === t; }); }));
    turAnahtarlari.forEach(function (t) {
      var b = el('button', 'sk-tur' + (t === 'hepsi' ? '' : ' ss-rozet ss-t-' + t), t === 'hepsi' ? 'Tüm türler' : T[t].ad);
      b.type = 'button'; b.dataset.tur = t;
      b.addEventListener('click', function () { D.tur = t; D.idx = 0; kaydet(); yenile(); });
      turKutu.appendChild(b);
    });
    listeler.querySelectorAll('[data-liste]').forEach(function (b) {
      b.addEventListener('click', function () { D.liste = b.dataset.liste; D.idx = 0; kaydet(); yenile(); });
    });

    function kaydet() {
      kayit.liste = D.liste; kayit.tur = D.tur; yaz(kayit);
      // süzgeçler sayfanın altında: seçince karta geri kaydır
      var ust = document.querySelector('.sk-ilerleme-kutu');
      if (ust) try { ust.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
    }

    function cevir(durum) {
      D.cevrik = durum == null ? !D.cevrik : durum;
      kart.classList.toggle('cevrik', D.cevrik);
      kart.setAttribute('aria-pressed', String(D.cevrik));
      kart.setAttribute('aria-label', D.cevrik ? 'Kartın arka yüzü. Ön yüze dönmek için dokun.' : 'Kartı çevir, Türkçesini ve tuzağını gör.');
      on.setAttribute('aria-hidden', String(D.cevrik));
      arka.setAttribute('aria-hidden', String(!D.cevrik));
      boyut();
    }
    // kartın yüksekliği görünen yüze göre: ön yüz kısa, arka yüz uzun olabilir
    function boyut() {
      if (kart.hidden) return;
      ic.style.height = (D.cevrik ? arka : on).offsetHeight + 'px';
    }
    window.addEventListener('resize', boyut);

    function sayilariYaz() {
      var ogr = 0, tek = 0;
      kartlar.forEach(function (k) { var d = kayit.durum[k.word]; if (d === 'ogrendim') ogr++; else if (d === 'tekrar') tek++; });
      var say = { hepsi: kartlar.length, yeni: kartlar.length - ogr - tek, tekrar: tek, ogrendim: ogr };
      listeler.querySelectorAll('[data-liste]').forEach(function (b) {
        b.querySelector('b').textContent = say[b.dataset.liste];
        b.setAttribute('aria-selected', String(b.dataset.liste === D.liste));
      });
      turKutu.querySelectorAll('[data-tur]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tur === D.tur)); });
      ilerleme.textContent = 'Öğrendiğin: ' + ogr + ' / ' + kartlar.length;
      cubuk.style.width = (kartlar.length ? Math.round(ogr * 100 / kartlar.length) : 0) + '%';
    }

    function ciz() {
      var k = D.gorunen[D.idx];
      cevir(false);
      if (!k) {
        kart.hidden = true; bos.hidden = false;
        bos.textContent = D.liste === 'tekrar' ? 'Tekrar listen boş. Bir karta "Tekrar Et" dersen buraya gelir.'
          : D.liste === 'ogrendim' ? 'Henüz öğrendim dediğin kart yok.'
          : D.liste === 'yeni' ? 'Bu türdeki tüm kartları işaretledin. Tekrar listene göz at.'
          : 'Bu türde kart yok.';
        sayac.textContent = '0 / 0';
        ['sk-onceki', 'sk-sonraki', 'sk-ogrendim', 'sk-tekrar'].forEach(function (id) { $(id).disabled = true; });
        return;
      }
      kart.hidden = false; bos.hidden = true;
      ['sk-onceki', 'sk-sonraki', 'sk-ogrendim', 'sk-tekrar'].forEach(function (id) { $(id).disabled = false; });
      $('sk-onceki').disabled = D.idx === 0;
      sayac.textContent = (D.idx + 1) + ' / ' + D.gorunen.length;

      var turAd = (T[k.type] || {}).ad || k.type;
      on.className = 'sk-yuz sk-on ss-t-' + k.type;
      $('sk-kelime').textContent = k.word;
      var tr = $('sk-tur-on'); tr.className = 'ss-rozet ss-t-' + k.type; tr.textContent = turAd;
      var sv = $('sk-seviye'); sv.className = 'sk-seviye sk-' + k.level; sv.textContent = SEVIYELER[k.level];
      sv.setAttribute('aria-label', 'Zorluk: ' + SEVIYELER[k.level]);
      var d = kayit.durum[k.word];
      var dr = $('sk-durum'); dr.hidden = !d; dr.textContent = d === 'ogrendim' ? 'Öğrendin' : d === 'tekrar' ? 'Tekrar listende' : '';
      dr.className = 'sk-durum ' + (d || '');

      $('sk-kelime-arka').textContent = k.word;
      var tra = $('sk-tur-arka'); tra.className = 'ss-rozet ss-t-' + k.type; tra.textContent = turAd;
      $('sk-tr').textContent = k.tr;
      $('sk-islev').textContent = k.islev;
      var orn = $('sk-ornek'); orn.innerHTML = '';
      ornekParcala(k.ornek, k.word).forEach(function (p) {
        if (p.v) { var m = el('mark', 'ss-t-' + k.type, p.m); orn.appendChild(m); }
        else orn.appendChild(document.createTextNode(p.m));
      });
      $('sk-ornek-tr').textContent = k.ornekTr;
      $('sk-tuzak').textContent = k.tuzak;
      boyut();
    }

    function yenile() {
      D.gorunen = filtrele(kartlar, kayit.durum, D.liste, D.tur);
      if (D.idx >= D.gorunen.length) D.idx = Math.max(0, D.gorunen.length - 1);
      sayilariYaz();
      ciz();
    }

    function isaretle(durum) {
      var k = D.gorunen[D.idx];
      if (!k) return;
      kayit.durum[k.word] = durum;
      yaz(kayit);
      try { if (typeof kok.gtag === 'function') kok.gtag('event', 'sinyal_kart', { kelime: k.word, durum: durum }); } catch (e) {}
      var once = D.gorunen.length;
      D.gorunen = filtrele(kartlar, kayit.durum, D.liste, D.tur);
      // kart listeden çıktıysa aynı sıradaki bir sonraki kart gelir; kalmışsa bir ileri geç
      if (D.gorunen.length === once && D.idx < D.gorunen.length - 1) D.idx++;
      if (D.idx >= D.gorunen.length) D.idx = Math.max(0, D.gorunen.length - 1);
      sayilariYaz();
      ciz();
    }

    kart.addEventListener('click', function () { cevir(); });
    kart.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cevir(); } });
    $('sk-onceki').addEventListener('click', function () { if (D.idx > 0) { D.idx--; ciz(); } });
    $('sk-sonraki').addEventListener('click', function () { if (!D.gorunen.length) return; D.idx = (D.idx + 1) % D.gorunen.length; ciz(); });
    $('sk-ogrendim').addEventListener('click', function () { isaretle('ogrendim'); });
    $('sk-tekrar').addEventListener('click', function () { isaretle('tekrar'); });
    document.addEventListener('keydown', function (e) {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') $('sk-sonraki').click();
      else if (e.key === 'ArrowLeft') $('sk-onceki').click();
    });
    // ekranı kaydırarak geçiş (telefon)
    var x0 = null;
    kart.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    kart.addEventListener('touchend', function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 60) { e.preventDefault(); $(dx < 0 ? 'sk-sonraki' : 'sk-onceki').click(); }
    });
    yenile();
  }

  Cekirdek.baslat = baslat;
  kok.SinyalKartlari = Cekirdek;
})(typeof window !== 'undefined' ? window : globalThis);
