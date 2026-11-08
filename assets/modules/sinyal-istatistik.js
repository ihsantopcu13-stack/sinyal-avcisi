// ============================================================
// SİNYAL SORU — İLERLEME ÖZETİM (/sinyal-soru)
// ============================================================
// Her cevap tarayıcıda saklanır (localStorage 'sa_sinyal_istatistik_v1'); üyelik
// ya da sunucu yok. sinyal-soru.js her cevapta 'sinyal-soru-cevap' olayı yayar,
// bu modül olayı yakalayıp kartı sayfa yenilemeden günceller.
// Çekirdek (kaydet, ozet) DOM'suz; tests/sinyal-istatistik.test.mjs sınar.
// ============================================================
(function (kok) {
  'use strict';

  var LS = 'sa_sinyal_istatistik_v1';
  var LS_ACIK = 'sa_ss_ozet_acik';
  var EN_FAZLA = 1000; // en eski cevaplar atılır; hafıza şişmesin

  /**
   * @typedef {Object} Cevap
   * @property {string} id      soru kimliği (ss001)
   * @property {boolean} dogru
   * @property {string} kelime  ana sinyal kelime (mainSignal.word)
   * @property {string} tur     sinyal türü (SINYAL_TIPLERI anahtarı)
   * @property {number} t       zaman (ms)
   */

  /** Yeni cevabı listeye ekler, yeni liste döner. @returns {Cevap[]} */
  function kaydet(liste, c) {
    var yeni = (Array.isArray(liste) ? liste : []).concat([{
      id: String(c.id || ''), dogru: !!c.dogru, kelime: String(c.kelime || ''), tur: String(c.tur || ''), t: c.t || Date.now()
    }]);
    return yeni.length > EN_FAZLA ? yeni.slice(yeni.length - EN_FAZLA) : yeni;
  }

  /**
   * @returns {{toplam:number,dogru:number,yuzde:number,takildigin:{kelime:string,tur:string,yanlis:number,deneme:number}[]}}
   */
  function ozet(liste) {
    liste = Array.isArray(liste) ? liste : [];
    var dogru = liste.filter(function (c) { return c.dogru; }).length;
    var grup = {};
    liste.forEach(function (c, i) {
      if (!c.kelime) return;
      var k = c.kelime.toLowerCase();
      var g = grup[k] || (grup[k] = { kelime: c.kelime, tur: c.tur, yanlis: 0, deneme: 0, son: 0 });
      g.deneme++;
      if (!c.dogru) { g.yanlis++; g.son = i; }
    });
    var takildigin = Object.keys(grup).map(function (k) { return grup[k]; })
      .filter(function (g) { return g.yanlis > 0; })
      // çok yanlış önce; eşitse yanlış oranı yüksek, sonra en yeni yanlış
      .sort(function (a, b) { return b.yanlis - a.yanlis || (b.yanlis / b.deneme) - (a.yanlis / a.deneme) || b.son - a.son; })
      .slice(0, 3)
      .map(function (g) { return { kelime: g.kelime, tur: g.tur, yanlis: g.yanlis, deneme: g.deneme }; });
    return { toplam: liste.length, dogru: dogru, yuzde: liste.length ? Math.round(dogru * 100 / liste.length) : 0, takildigin: takildigin };
  }

  function oku() {
    try { var v = JSON.parse(localStorage.getItem(LS)); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function yaz(v) { try { localStorage.setItem(LS, JSON.stringify(v)); } catch (e) {} }

  function el(etiket, sinif, metin) {
    var e = document.createElement(etiket);
    if (sinif) e.className = sinif;
    if (metin != null) e.textContent = metin;
    return e;
  }

  /**
   * @param {HTMLDetailsElement} kart  <details> kabı
   * @param {Object<string,{ad:string}>} tipler  SinyalSoru.SINYAL_TIPLERI
   * @param {string} olay  dinlenecek olay adı
   */
  function baslat(kart, tipler, olay) {
    var liste = oku();
    try { kart.open = localStorage.getItem(LS_ACIK) === '1'; } catch (e) {}
    kart.addEventListener('toggle', function () { try { localStorage.setItem(LS_ACIK, kart.open ? '1' : '0'); } catch (e) {} });

    kart.innerHTML = '';
    var baslik = el('summary', 'oz-baslik');
    var bAd = el('span', 'oz-ad', 'İlerleme Özetim');
    var bKisa = el('span', 'oz-kisa');
    baslik.append(bAd, bKisa);
    var govde = el('div', 'oz-govde');
    govde.setAttribute('aria-live', 'polite');
    kart.append(baslik, govde);

    function ciz() {
      var o = ozet(liste);
      govde.innerHTML = '';
      bKisa.textContent = o.toplam ? o.toplam + ' soru · %' + o.yuzde : 'Henüz soru çözülmedi';
      if (!o.toplam) {
        govde.append(el('p', 'oz-bos', 'Henüz soru çözülmedi. Aşağıdan bir soru çöz, özetin burada anında görünsün.'));
        return;
      }
      var sayilar = el('div', 'oz-sayilar');
      [[String(o.toplam), 'Çözülen soru'], ['%' + o.yuzde, 'Başarı (' + o.dogru + ' doğru)']].forEach(function (x) {
        var k = el('div', 'oz-sayi');
        k.append(el('b', null, x[0]), el('span', null, x[1]));
        sayilar.append(k);
      });
      var cubuk = el('div', 'oz-cubuk');
      cubuk.setAttribute('role', 'img');
      cubuk.setAttribute('aria-label', 'Başarı yüzde ' + o.yuzde);
      var dolgu = el('span');
      dolgu.style.width = o.yuzde + '%';
      cubuk.append(dolgu);

      var tk = el('div', 'oz-takil');
      tk.append(el('h3', null, 'En çok takıldığın 3 sinyal kelime'));
      if (!o.takildigin.length) tk.append(el('p', 'oz-bos', 'Henüz yanlışın yok. Böyle devam!'));
      else {
        var ol = el('ol');
        o.takildigin.forEach(function (g) {
          var li = el('li');
          var k = el('span', 'oz-kelime ss-t-' + (tipler[g.tur] ? g.tur : 'anlam'), g.kelime);
          k.lang = 'en';
          li.append(k, el('span', 'oz-tur', tipler[g.tur] ? tipler[g.tur].ad : ''), el('span', 'oz-yanlis', g.yanlis + ' yanlış / ' + g.deneme + ' deneme'));
          ol.append(li);
        });
        tk.append(ol);
        var not = el('p', 'oz-not', 'Bu kelimeleri ');
        var a = el('a', null, 'sinyal kelime kartlarıyla');
        a.href = '/sinyal-kartlari';
        not.append(a, ' tekrar et.');
        tk.append(not);
      }

      var sil = el('button', 'oz-sil', 'İstatistikleri temizle');
      sil.type = 'button';
      sil.addEventListener('click', function () {
        if (!window.confirm('Tüm istatistiklerin silinsin mi? Bu geri alınamaz.')) return;
        liste = []; yaz(liste); ciz();
      });
      govde.append(sayilar, cubuk, tk, sil);
    }

    document.addEventListener(olay, function (e) {
      if (!e.detail) return;
      liste = kaydet(oku(), e.detail); // başka sekmede çözülenleri ezmemek için önce oku
      yaz(liste); ciz();
    });
    window.addEventListener('storage', function (e) { if (e.key === LS) { liste = oku(); ciz(); } });
    ciz();
  }

  var api = { LS: LS, EN_FAZLA: EN_FAZLA, kaydet: kaydet, ozet: ozet, baslat: baslat };
  kok.SinyalIstatistik = api;
})(typeof window !== 'undefined' ? window : this);
