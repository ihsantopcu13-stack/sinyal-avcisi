// ============================================================
// SİNYAL SORU — sinyal kelime vurgulu soru çözüm modülü (2026-11-08)
// ============================================================
// Sayfa: /sinyal-soru (sinyal-soru.html). Veri: assets/data/sinyal-sorular.json
//
// Bu dosya iki katmandan oluşur:
//   1) SAF ÇEKİRDEK (DOM yok, testler doğrudan çalıştırır):
//      SINYAL_TIPLERI, SORU_TURLERI, sinyalBul(), parcala(), dogrula()
//   2) ARAYÜZ: baslat(kok, sorular) — paneli kurar, sinyal kelimelere
//      dokununca/üstüne gelince ipucu kutusu açar, şık seçilince anında
//      Doğru/Yanlış der ve "Soru Çözümü ve Sinyal Kelime Analizi"ni açar.
//
// Üyelik, giriş ya da ödeme kontrolü YOK: her soru ve ipucu herkese açık.
//
// YENİ SORU EKLEMEK: assets/data/sinyal-sorular.json'a aşağıdaki
// SinyalSoru biçiminde bir nesne ekle. `node tests/sinyal-soru.test.mjs`
// her sinyal kelimenin metinde gerçekten geçtiğini ve alanların
// eksiksiz olduğunu kontrol eder.
// YENİ SORU TÜRÜ EKLEMEK: SORU_TURLERI'ne bir satır ekle (ad + yönerge).
// YENİ SİNYAL TİPİ EKLEMEK: SINYAL_TIPLERI'ne bir satır ekle ve
// sinyal-soru.html'de .ss-t-<anahtar> renklerini tanımla.
// ============================================================

/**
 * Sinyal kelimenin sınavdaki işlevi. Anahtar SINYAL_TIPLERI'nden biri olmalı.
 * @typedef {'zitlik'|'sebep'|'zaman'|'kosul'|'ekleme'|'olumsuz'|'anlam'|'yapi'} SinyalTipi
 */
/**
 * @typedef {Object} SinyalKelime
 * @property {string} word   Soru metninde birebir geçen kelime ya da öbek ("By the time").
 * @property {SinyalTipi} type
 * @property {string} tip    İpucu kutusunda çıkan kısa açıklama (sade Türkçe).
 * @property {number} [occurrence]  Kelime metinde birden çok geçiyorsa kaçıncısı (1'den başlar).
 */
/**
 * @typedef {Object} SinyalSoru
 * @property {string} id              Kalıcı kimlik, örn. "ss001".
 * @property {'bosluk'|'tamamlama'|'anlam'} questionType  SORU_TURLERI anahtarı.
 * @property {'YDS'|'YÖKDİL'|'YDS ve YÖKDİL'} exam
 * @property {string} topic           Alan: Genel, Sağlık, Fen, Sosyal...
 * @property {string} questionText    İngilizce soru kökü. Boşluk "----" ile yazılır.
 * @property {SinyalKelime[]} signalWords
 * @property {string[]} options       Tam 5 şık (A-E), harfsiz.
 * @property {number} correctAnswer   Doğru şıkkın sırası: 0=A ... 4=E.
 * @property {string} explanation     Çözüm: kural + bu soruda nasıl uygulandığı.
 * @property {string} trap            En çekici yanlış şık neden yanlış (Tuzak).
 * @property {string} [translation]   Türkçe anlamı (cevaptan sonra gösterilir).
 */
(function (kok) {
  'use strict';

  /** @type {Object<string,{ad:string,ozet:string}>} */
  var SINYAL_TIPLERI = {
    zitlik:  { ad: 'Zıtlık',        ozet: 'İki fikir birbirine ters düşer.' },
    sebep:   { ad: 'Sebep-sonuç',   ozet: 'Bir şey ötekine yol açar.' },
    zaman:   { ad: 'Zaman',         ozet: 'Hangi zaman kipinin geleceğini söyler.' },
    kosul:   { ad: 'Koşul',         ozet: 'Bir şey ancak bir şarta bağlıysa olur.' },
    ekleme:  { ad: 'Ekleme',        ozet: 'Aynı yönde yeni bilgi eklenir.' },
    olumsuz: { ad: 'Gizli olumsuz', ozet: 'Olumlu görünür, anlamı olumsuzdur.' },
    anlam:   { ad: 'Anlam ipucu',   ozet: 'Kelimenin olumlu ya da olumsuz yükü yön verir.' },
    yapi:    { ad: 'Yapı ipucu',    ozet: 'Boşluktan sonra gelen yapı şıkları eler.' }
  };

  /** @type {Object<string,{ad:string,yonerge:string}>} */
  var SORU_TURLERI = {
    bosluk:    { ad: 'Boşluk doldurma',  yonerge: 'Boşluğa en uygun ifadeyi seç.' },
    tamamlama: { ad: 'Cümle tamamlama',  yonerge: 'Cümleyi en uygun şekilde tamamlayan ifadeyi seç.' },
    anlam:     { ad: 'Yakın anlam',      yonerge: 'Cümleye anlamca en yakın ifadeyi seç.' }
  };

  var HARFLER = ['A', 'B', 'C', 'D', 'E'];
  var BOSLUK = '----';

  function harfMi(c) { return !!c && /[A-Za-zÀ-ɏ']/.test(c); }

  /**
   * Sinyal kelimenin metindeki yerini bulur (büyük/küçük harf duyarsız,
   * kelime sınırına dikkat eder: "so" kelimesi "also" içinde bulunmaz).
   * @param {string} metin
   * @param {SinyalKelime} sk
   * @param {Array<[number,number]>} [dolu] Daha önce işaretlenen aralıklar.
   * @returns {number} Başlangıç sırası, bulunamazsa -1.
   */
  function sinyalBul(metin, sk, dolu) {
    var k = String(sk.word || '').toLowerCase();
    var m = String(metin || '').toLowerCase();
    if (!k) return -1;
    var istenen = sk.occurrence || 1, sayac = 0, i = m.indexOf(k);
    while (i !== -1) {
      var bas = i, son = i + k.length;
      var sinirOk = !harfMi(metin.charAt(bas - 1)) && !harfMi(metin.charAt(son));
      var cakisma = (dolu || []).some(function (r) { return bas < r[1] && son > r[0]; });
      if (sinirOk && !cakisma) {
        sayac++;
        if (sayac === istenen) return bas;
      }
      i = m.indexOf(k, i + 1);
    }
    return -1;
  }

  /**
   * Soru metnini parçalara ayırır: düz metin, sinyal kelime, boşluk.
   * @param {string} metin
   * @param {SinyalKelime[]} sinyaller
   * @returns {Array<{tur:'metin'|'sinyal'|'bosluk', metin:string, sinyal?:number}>}
   */
  function parcala(metin, sinyaller) {
    metin = String(metin || '');
    var araliklar = [];
    (sinyaller || []).forEach(function (sk, idx) {
      var bas = sinyalBul(metin, sk, araliklar);
      if (bas !== -1) araliklar.push([bas, bas + sk.word.length, idx]);
    });
    var b = metin.indexOf(BOSLUK);
    if (b !== -1) araliklar.push([b, b + BOSLUK.length, -1]);
    araliklar.sort(function (x, y) { return x[0] - y[0]; });
    var parcalar = [], imlec = 0;
    araliklar.forEach(function (r) {
      if (r[0] < imlec) return;
      if (r[0] > imlec) parcalar.push({ tur: 'metin', metin: metin.slice(imlec, r[0]) });
      if (r[2] === -1) parcalar.push({ tur: 'bosluk', metin: BOSLUK });
      else parcalar.push({ tur: 'sinyal', metin: metin.slice(r[0], r[1]), sinyal: r[2] });
      imlec = r[1];
    });
    if (imlec < metin.length) parcalar.push({ tur: 'metin', metin: metin.slice(imlec) });
    return parcalar;
  }

  /**
   * Bir sorunun biçimini denetler. Boş dizi = sorun yok.
   * @param {SinyalSoru} s
   * @returns {string[]} Hata listesi (Türkçe).
   */
  function dogrula(s) {
    var h = [];
    if (!s || typeof s !== 'object') return ['soru nesne değil'];
    var ad = s.id || '(kimliksiz)';
    function hata(m) { h.push(ad + ': ' + m); }
    if (!/^ss\d{3,}$/.test(s.id || '')) hata('id "ss001" biçiminde olmalı');
    if (!SORU_TURLERI[s.questionType]) hata('bilinmeyen questionType: ' + s.questionType);
    if (['YDS', 'YÖKDİL', 'YDS ve YÖKDİL'].indexOf(s.exam) === -1) hata('exam YDS, YÖKDİL ya da "YDS ve YÖKDİL" olmalı');
    ['topic', 'questionText', 'explanation', 'trap'].forEach(function (k) {
      if (typeof s[k] !== 'string' || !s[k].trim()) hata(k + ' boş');
    });
    if (s.questionType === 'bosluk' && String(s.questionText).indexOf(BOSLUK) === -1) hata('boşluk sorusunda "----" yok');
    if (!Array.isArray(s.options) || s.options.length !== 5) hata('tam 5 şık olmalı');
    else {
      if (s.options.some(function (o) { return typeof o !== 'string' || !o.trim(); })) hata('boş şık var');
      var tekil = new Set(s.options.map(function (o) { return String(o).trim().toLowerCase(); }));
      if (tekil.size !== 5) hata('aynı şık iki kez yazılmış');
    }
    if (!(Number.isInteger(s.correctAnswer) && s.correctAnswer >= 0 && s.correctAnswer <= 4)) hata('correctAnswer 0-4 arası tam sayı olmalı');
    if (!Array.isArray(s.signalWords) || !s.signalWords.length) hata('en az 1 sinyal kelime olmalı');
    else {
      var dolu = [];
      s.signalWords.forEach(function (sk) {
        if (!sk || !sk.word) { hata('sinyal kelimenin word alanı boş'); return; }
        if (!SINYAL_TIPLERI[sk.type]) hata('"' + sk.word + '" için bilinmeyen type: ' + sk.type);
        if (typeof sk.tip !== 'string' || !sk.tip.trim()) hata('"' + sk.word + '" için tip boş');
        var bas = sinyalBul(s.questionText, sk, dolu);
        if (bas === -1) hata('"' + sk.word + '" soru metninde bulunamadı');
        else dolu.push([bas, bas + sk.word.length]);
      });
    }
    return h;
  }

  var Cekirdek = {
    SINYAL_TIPLERI: SINYAL_TIPLERI, SORU_TURLERI: SORU_TURLERI, HARFLER: HARFLER,
    sinyalBul: sinyalBul, parcala: parcala, dogrula: dogrula
  };

  // ======================= ARAYÜZ =======================
  var LS = 'sa_sinyal_soru_v1';
  function lsOku() { try { var v = JSON.parse(localStorage.getItem(LS)); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function lsYaz(v) { try { localStorage.setItem(LS, JSON.stringify(v)); } catch (e) {} }

  function el(etiket, sinif, metin) {
    var e = document.createElement(etiket);
    if (sinif) e.className = sinif;
    if (metin != null) e.textContent = metin;
    return e;
  }

  /**
   * Paneli kurar.
   * @param {HTMLElement} kap
   * @param {SinyalSoru[]} sorular
   */
  function baslat(kap, sorular) {
    sorular = (sorular || []).filter(function (s) { return dogrula(s).length === 0; });
    if (!sorular.length) { kap.textContent = 'Sorular yüklenemedi. Sayfayı yenile.'; return; }
    var kayit = lsOku();
    kayit.sonuclar = kayit.sonuclar || {};
    var D = { idx: Math.min(Math.max(kayit.idx | 0, 0), sorular.length - 1), cevap: null, acikSinyal: -1, sabit: false };

    kap.innerHTML = '';
    var ust = el('div', 'ss-ust');
    var sayac = el('span', 'ss-sayac');
    var skor = el('span', 'ss-skor');
    ust.append(sayac, skor);

    var etiketler = el('div', 'ss-etiketler');
    var yonerge = el('p', 'ss-yonerge');
    var kutu = el('div', 'ss-metin-kutu');
    var metin = el('p', 'ss-metin');
    metin.lang = 'en';
    var pop = el('div', 'ss-pop');
    pop.id = 'ss-pop';
    pop.setAttribute('role', 'tooltip');
    pop.hidden = true;
    var popTip = el('span', 'ss-pop-tip');
    var popMetin = el('span', 'ss-pop-metin');
    pop.append(popTip, popMetin);
    kutu.append(metin, pop);
    var dokun = el('p', 'ss-dokun', 'Renkli kelimelere dokun: sınavda ne işe yaradığını gör.');

    var siklar = el('div', 'ss-siklar');
    siklar.setAttribute('role', 'group');
    siklar.setAttribute('aria-label', 'Şıklar');
    var geri = el('div', 'ss-geri');
    geri.setAttribute('aria-live', 'polite');
    var analiz = el('section', 'ss-analiz');
    analiz.hidden = true;
    analiz.setAttribute('aria-labelledby', 'ss-analiz-baslik');

    var alt = el('div', 'ss-alt');
    var onceki = el('button', 'ss-btn', 'Önceki');
    onceki.type = 'button';
    var sonraki = el('button', 'ss-btn ss-ana', 'Sonraki soru');
    sonraki.type = 'button';
    alt.append(onceki, sonraki);

    kap.append(ust, etiketler, yonerge, kutu, dokun, siklar, geri, analiz, alt);

    function skorYaz() {
      var ids = Object.keys(kayit.sonuclar).filter(function (id) { return sorular.some(function (s) { return s.id === id; }); });
      var dogru = ids.filter(function (id) { return kayit.sonuclar[id]; }).length;
      skor.textContent = ids.length ? 'Çözdüğün: ' + ids.length + ' · Doğru: ' + dogru : '';
    }

    // ---------- ipucu kutusu ----------
    function popAc(btn, sabit) {
      var s = sorular[D.idx];
      var i = +btn.dataset.i, sk = s.signalWords[i];
      if (!sk) return;
      popKapat();
      D.acikSinyal = i; D.sabit = !!sabit;
      pop.className = 'ss-pop ss-t-' + sk.type;
      popTip.textContent = SINYAL_TIPLERI[sk.type].ad;
      popMetin.textContent = sk.tip;
      pop.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      btn.setAttribute('aria-describedby', 'ss-pop');
      btn.classList.add('ss-acik');
      // konum: kelimenin altına, kutudan taşmadan
      var kr = kutu.getBoundingClientRect(), br = btn.getBoundingClientRect();
      var pw = pop.offsetWidth, kw = kutu.clientWidth;
      var sol = br.left - kr.left + br.width / 2 - pw / 2;
      sol = Math.max(0, Math.min(sol, kw - pw));
      pop.style.left = sol + 'px';
      pop.style.top = (br.bottom - kr.top + 8) + 'px';
      pop.style.setProperty('--ok', Math.max(14, Math.min(pw - 14, br.left - kr.left + br.width / 2 - sol)) + 'px');
    }
    function popKapat() {
      if (D.acikSinyal === -1) return;
      var eski = metin.querySelector('.ss-sinyal[data-i="' + D.acikSinyal + '"]');
      if (eski) { eski.setAttribute('aria-expanded', 'false'); eski.removeAttribute('aria-describedby'); eski.classList.remove('ss-acik'); }
      pop.hidden = true;
      D.acikSinyal = -1; D.sabit = false;
    }
    metin.addEventListener('click', function (e) {
      var btn = e.target.closest('.ss-sinyal');
      if (!btn) return;
      var i = +btn.dataset.i;
      if (D.acikSinyal === i && D.sabit) popKapat();
      else popAc(btn, true);
    });
    metin.addEventListener('pointerover', function (e) {
      if (e.pointerType !== 'mouse') return;
      var btn = e.target.closest('.ss-sinyal');
      if (btn && !D.sabit && D.acikSinyal !== +btn.dataset.i) popAc(btn, false);
    });
    metin.addEventListener('pointerout', function (e) {
      if (e.pointerType !== 'mouse' || D.sabit) return;
      var btn = e.target.closest('.ss-sinyal');
      if (btn && !btn.contains(e.relatedTarget)) popKapat();
    });
    metin.addEventListener('focusin', function (e) {
      var btn = e.target.closest('.ss-sinyal');
      if (btn && e.target.matches(':focus-visible')) popAc(btn, false);
    });
    metin.addEventListener('focusout', function () { if (!D.sabit) popKapat(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') popKapat(); });
    document.addEventListener('click', function (e) { if (!kutu.contains(e.target)) popKapat(); });
    window.addEventListener('resize', popKapat);

    // ---------- soru çizimi ----------
    function ciz() {
      var s = sorular[D.idx];
      D.cevap = null;
      popKapat();
      sayac.textContent = 'Soru ' + (D.idx + 1) + ' / ' + sorular.length;
      skorYaz();
      etiketler.innerHTML = '';
      [s.exam, SORU_TURLERI[s.questionType].ad, s.topic].forEach(function (t) { etiketler.append(el('span', 'ss-etiket', t)); });
      yonerge.textContent = SORU_TURLERI[s.questionType].yonerge;

      metin.innerHTML = '';
      parcala(s.questionText, s.signalWords).forEach(function (p) {
        if (p.tur === 'metin') metin.append(document.createTextNode(p.metin));
        else if (p.tur === 'bosluk') {
          var b = el('span', 'ss-bosluk', '');
          b.setAttribute('aria-label', 'boşluk');
          metin.append(b);
        } else {
          var sk = s.signalWords[p.sinyal];
          var btn = el('button', 'ss-sinyal ss-t-' + sk.type, p.metin);
          btn.type = 'button';
          btn.dataset.i = p.sinyal;
          btn.setAttribute('aria-expanded', 'false');
          btn.setAttribute('aria-label', p.metin + ', sinyal kelime: ' + SINYAL_TIPLERI[sk.type].ad);
          metin.append(btn);
        }
      });

      siklar.innerHTML = '';
      s.options.forEach(function (o, i) {
        var b = el('button', 'ss-sik');
        b.type = 'button';
        b.dataset.i = i;
        var h = el('span', 'ss-harf', HARFLER[i]);
        var t = el('span', 'ss-sik-metin', o);
        t.lang = 'en';
        b.append(h, t);
        b.addEventListener('click', function () { cevapla(i); });
        siklar.append(b);
      });
      geri.textContent = '';
      geri.className = 'ss-geri';
      analiz.hidden = true;
      analiz.innerHTML = '';
      onceki.disabled = D.idx === 0;
      sonraki.textContent = D.idx === sorular.length - 1 ? 'Baştan başla' : 'Sonraki soru';
      kayit.idx = D.idx; lsYaz(kayit);
    }

    function cevapla(i) {
      if (D.cevap !== null) return;
      var s = sorular[D.idx];
      D.cevap = i;
      var dogru = i === s.correctAnswer;
      var butonlar = siklar.querySelectorAll('.ss-sik');
      butonlar.forEach(function (b, j) {
        b.disabled = true;
        if (j === s.correctAnswer) { b.classList.add('ss-dogru'); b.append(el('span', 'ss-isaret', 'Doğru cevap')); }
        else if (j === i) { b.classList.add('ss-yanlis'); b.append(el('span', 'ss-isaret', 'Senin seçimin')); }
      });
      geri.className = 'ss-geri ' + (dogru ? 'ss-geri-dogru' : 'ss-geri-yanlis');
      geri.textContent = dogru
        ? 'Doğru! Sinyali yakaladın.'
        : 'Yanlış. Doğru cevap ' + HARFLER[s.correctAnswer] + ') ' + s.options[s.correctAnswer];
      kayit.sonuclar[s.id] = dogru; lsYaz(kayit);
      skorYaz();
      analizCiz(s);
      try { if (typeof window.gtag === 'function') window.gtag('event', 'sinyal_soru_cevap', { soru: s.id, dogru: dogru }); } catch (e) {}
    }

    function analizCiz(s) {
      analiz.innerHTML = '';
      var h = el('h2', 'ss-analiz-baslik', 'Soru Çözümü ve Sinyal Kelime Analizi');
      h.id = 'ss-analiz-baslik';
      analiz.append(h);

      var cozum = el('div', 'ss-blok ss-blok-cozum');
      cozum.append(el('h3', null, 'Çözüm'), el('p', null, s.explanation));
      analiz.append(cozum);

      var sinyal = el('div', 'ss-blok');
      sinyal.append(el('h3', null, 'Sinyal kelimeler'));
      var liste = el('ul', 'ss-sinyal-liste');
      s.signalWords.forEach(function (sk) {
        var li = el('li');
        var k = el('span', 'ss-rozet ss-t-' + sk.type, sk.word);
        k.lang = 'en';
        var tip = el('span', 'ss-liste-tip', SINYAL_TIPLERI[sk.type].ad);
        li.append(k, tip, el('p', null, sk.tip));
        liste.append(li);
      });
      sinyal.append(liste);
      analiz.append(sinyal);

      var tuzak = el('div', 'ss-blok ss-blok-tuzak');
      tuzak.append(el('h3', null, 'Tuzak'), el('p', null, s.trap));
      analiz.append(tuzak);

      if (s.translation) {
        var tr = el('div', 'ss-blok');
        tr.append(el('h3', null, 'Türkçesi'), el('p', null, s.translation));
        analiz.append(tr);
      }
      analiz.hidden = false;
      setTimeout(function () { try { geri.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }, 60);
    }

    onceki.addEventListener('click', function () { if (D.idx > 0) { D.idx--; ciz(); kap.scrollIntoView({ block: 'start' }); } });
    sonraki.addEventListener('click', function () { D.idx = (D.idx + 1) % sorular.length; ciz(); kap.scrollIntoView({ block: 'start' }); });
    ciz();
  }

  Cekirdek.baslat = baslat;
  kok.SinyalSoru = Cekirdek;
})(typeof window !== 'undefined' ? window : globalThis);
