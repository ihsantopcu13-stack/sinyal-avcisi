// Sinyal sayfaları (/sinyal-soru, /sinyal-kartlari) ortak tema düğmesi.
// Açık (Adaçayı) varsayılan; seçim localStorage 'sa_ss_tema' ('acik'|'koyu').
// Sayfa <head>'indeki küçük satır içi betik temayı ilk boyamadan önce uygular;
// bu dosya yalnız #tema-btn düğmesini bağlar.
(function () {
  'use strict';
  var kok = document.documentElement;
  var btn = document.getElementById('tema-btn');
  if (!btn) return;
  function yaz() {
    var koyu = kok.getAttribute('data-tema') === 'koyu';
    btn.textContent = koyu ? 'Açık tema' : 'Koyu tema';
    btn.setAttribute('aria-pressed', String(koyu));
  }
  btn.addEventListener('click', function () {
    var yeni = kok.getAttribute('data-tema') === 'koyu' ? 'acik' : 'koyu';
    kok.setAttribute('data-tema', yeni);
    try { localStorage.setItem('sa_ss_tema', yeni); } catch (e) {}
    yaz();
  });
  yaz();
})();
