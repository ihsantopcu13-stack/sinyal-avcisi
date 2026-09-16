// ============================================================
// FAZ 2 — ATTRIBUTION MODÜLÜ
// ============================================================
// UTM/signal yakalama, sessionStorage'da tutma, güvenli normalize/encode.
// GA4 event context üretimi. index.html sadece bu modülün API'sini
// (window.SinyalAttribution) çağırır — parsing/sanitization mantığı
// burada izole tutulur.
//
// GÜVENLİK: hiçbir değer innerHTML/executable koda enjekte edilmiyor,
// hiçbir kişisel veri (IP, fingerprint, cihaz kimliği) toplanmıyor.
// Sadece sessionStorage (sekme kapanınca silinir) kullanılıyor.
//
// Node'da da test edilebilir (module.exports guard'lı) — tarayıcıda
// window.SinyalAttribution olarak global.

(function (global) {
  "use strict";

  var STORAGE_KEY = "sa_attribution_v1";
  var MAX_LEN = 100;
  var GUVENLI_DESEN = /[^a-zA-Z0-9 _\-]/g;

  // Bilinmeyen/bozuk/kötü amaçlı query değerlerinin siteyi bozmaması için:
  // uzunluk sınırlanır, sadece harf/rakam/boşluk/_/- karakterlerine izin
  // verilir (URL/HTML enjeksiyonu için kullanılabilecek karakterler atılır).
  function guvenliMetin(deger, maxLen) {
    if (typeof deger !== "string") return "";
    var kesilmis = deger.slice(0, maxLen || MAX_LEN);
    return kesilmis.replace(GUVENLI_DESEN, "").trim();
  }

  function normalizeSinyal(deger) {
    return guvenliMetin(deger, 60).toLowerCase();
  }

  function storageOku() {
    try {
      var ss = global.sessionStorage;
      var raw = ss && ss.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function storageYaz(data) {
    try {
      var ss = global.sessionStorage;
      if (ss) ss.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* sessionStorage yoksa (gizli sekme vb.) sessizce geç */
    }
  }

  // search: "?utm_source=instagram&..." — verilmezse global.location.search
  function urlDenOku(search) {
    var kaynak = search != null ? search : global.location && global.location.search;
    if (!kaynak) return null;
    var params;
    try {
      var USP = global.URLSearchParams || (typeof URLSearchParams !== "undefined" ? URLSearchParams : null);
      if (!USP) return null;
      params = new USP(kaynak);
    } catch (e) {
      return null; // bozuk query string — crash etme, sadece attribution yok say
    }
    var utmSource = guvenliMetin(params.get("utm_source") || "", 60);
    if (!utmSource) return null; // "geçerli attribution" = en az utm_source var
    return {
      utm_source: utmSource,
      utm_medium: guvenliMetin(params.get("utm_medium") || "", 60),
      utm_campaign: guvenliMetin(params.get("utm_campaign") || "", 60),
      utm_content: guvenliMetin(params.get("utm_content") || "", 60),
      signal: normalizeSinyal(params.get("signal") || ""),
      question_id: guvenliMetin(params.get("question_id") || "", 40),
      lesson_id: guvenliMetin(params.get("lesson_id") || "", 40),
    };
  }

  // Sayfa her yüklendiğinde çağrılır. URL'de geçerli (utm_source'lu) bir
  // attribution varsa onu SAKLANANIN ÜZERİNE yazar (yeni ziyaret önceliklidir).
  // Yoksa mevcut session'daki (varsa) attribution'a dokunmaz — böylece
  // internal navigasyonda kaybolmaz, UTM'siz direkt ziyaret de bozulmaz.
  function capture(search) {
    var yeni;
    try {
      yeni = urlDenOku(search);
    } catch (e) {
      yeni = null;
    }
    if (yeni) {
      yeni._ts = Date.now();
      storageYaz(yeni);
      return yeni;
    }
    return storageOku();
  }

  function get() {
    return storageOku();
  }

  // GA4 event parametreleri için düz, kısa isimli context.
  function context() {
    var a = get() || {};
    return {
      source: a.utm_source || "",
      medium: a.utm_medium || "",
      campaign: a.utm_campaign || "",
      content: a.utm_content || "",
      signal: a.signal || "",
      question_id: a.question_id || "",
      lesson_id: a.lesson_id || "",
    };
  }

  var api = {
    capture: capture,
    get: get,
    context: context,
    _normalizeSinyal: normalizeSinyal,
    _guvenliMetin: guvenliMetin,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  global.SinyalAttribution = api;
})(typeof window !== "undefined" ? window : globalThis);
