// Ana sayfa landing (Aşama 1): hero metni ve çağrı düğmeleri, "Kimler için?"
// bölümü, 7 soruluk SSS + FAQPage JSON-LD eşleşmesi, sayfa sonu çağrısı ve
// PostHog olayları (landing_cta_click, sss_acildi). Ağ çağrısı yok, sadece
// index.html'i okur; sssToggle/landingCtaTikla node:vm içinde sahte DOM ile çalıştırılır.

import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const html = readFileSync(path.join(ROOT, "index.html"), "utf-8");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}
const duz = (s) => s.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
const bolum = (id) => {
  const m = html.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`));
  return m ? m[0] : "";
};

// ---- HERO ----
const hero = bolum("hero");
kontrol("hero h1 yeni başlık", /<h1>Soruyu çevirmeden, sinyali görerek çöz\.<\/h1>/.test(hero));
kontrol(
  "hero alt metni",
  hero.includes("<p class=\"hero-sub\">YDS ve YÖKDİL'de önce cümlenin iskeletine bakarsın: fiil, özne, nesne, sinyal kelimesi. Şıkları ondan sonra elersin.</p>")
);
const heroAna = hero.match(/<button[^>]*id="hero-basla-btn"[^>]*>[\s\S]*?<\/button>/);
kontrol("birincil düğme id'si korunuyor (iaHeroButonGuncelle/heroGuncelle)", !!heroAna);
kontrol("birincil düğme metni", !!heroAna && duz(heroAna[0]).includes("Ücretsiz AVCI Testini Başlat"));
kontrol("birincil düğme basla() + ölçüm", !!heroAna && /onclick="landingCtaTikla\('hero_test'\);basla\(\)"/.test(heroAna[0]));
const heroYontem = hero.match(/<button[^>]*data-landing-cta="hero_yontem"[^>]*>[\s\S]*?<\/button>/);
kontrol("ikincil düğme 'Yöntemi Gör'", !!heroYontem && duz(heroYontem[0]).includes("Yöntemi Gör"));
kontrol("ikincil düğme #nasil'a kaydırır", !!heroYontem && /goTo\('nasil'\)/.test(heroYontem[0]));
kontrol("#nasil bölümü mevcut", /<section id="nasil"/.test(html));
kontrol("hero'da test akışıyla yarışan metin bağlantısı yok (dersler/deneme bölümleri sayfada duruyor)", !/<a\s/.test(hero) && /<section id="dersler"/.test(html) && /<section id="antrenman"/.test(html));
// (#medya'daki mevcut "60 Saniyede ÖSYM Avı" başlığı bu işin kapsamı dışında.)
kontrol("hero'da '60 saniye' ifadesi yok", !/60 saniye/i.test(hero));

// ---- KİMLER İÇİN ----
const kimler = bolum("kimler-icin");
kontrol("Kimler için? bölümü var", !!kimler);
kontrol("Kimler için? SSS'den hemen önce", html.indexOf('<section id="kimler-icin"') < html.indexOf('<section id="sss"') && html.indexOf('<section id="kimler-icin"') > html.indexOf('<section id="medya"'));
kontrol("başlık h2 + aria-labelledby", /aria-labelledby="kimler-icin-baslik"/.test(kimler) && /<h2 id="kimler-icin-baslik">Kimler için\?<\/h2>/.test(kimler));
const EVET = [
  "YDS ya da YÖKDİL'e hazırlanıyorsan",
  "Uzun cümlelerde fiili bulmakta zorlanıyorsan",
  "Şıkları rastgele değil, bir sırayla elemek istiyorsan",
  "Yanlış yaptığında nedenini görmek istiyorsan",
];
const HAYIR = [
  "Çalışmadan sonuç bekliyorsan",
  "Sadece kelime ezberlemeyi düşünüyorsan, buradaki asıl iş cümle çözmek",
  "Tek tıkla sınav başarısı bekliyorsan",
];
const evetKart = (kimler.match(/<div class="ad-kart kimler-evet">[\s\S]*?<\/ul>/) || [""])[0];
const hayirKart = (kimler.match(/<div class="ad-kart kimler-hayir">[\s\S]*?<\/ul>/) || [""])[0];
const liler = (s) => [...s.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => duz(m[1]));
kontrol("'Senin için uygunsa' sütunu", duz(evetKart).startsWith("Senin için uygunsa"));
kontrol("'Senin için uygunsa' maddeleri sırayla", JSON.stringify(liler(evetKart)) === JSON.stringify(EVET), liler(evetKart).join(" | "));
kontrol("'Şimdilik uygun olmayabilir' sütunu", duz(hayirKart).startsWith("Şimdilik uygun olmayabilir"));
kontrol("'Şimdilik uygun olmayabilir' maddeleri sırayla", JSON.stringify(liler(hayirKart)) === JSON.stringify(HAYIR), liler(hayirKart).join(" | "));
kontrol("iki sütun masaüstü, mobilde tek sütun", /\.ad-kartlar\.ad-ikili\{grid-template-columns:repeat\(2/.test(html) && /@media\(max-width:900px\)\{body\.tema-adacayi \.ad-kartlar\.ad-ikili\{grid-template-columns:minmax\(0,1fr\)\}\}/.test(html));
kontrol("ikonlar ekran okuyucudan gizli", (kimler.match(/<svg/g) || []).length === (kimler.match(/<svg[^>]*aria-hidden="true"/g) || []).length);

// ---- SSS ----
const SSS = [
  ["Sinyal Avcısı nedir?", "YDS ve YÖKDİL için ücretsiz bir hazırlık sitesi. Soruyu çözerken sırayla fiile, cümle yapısına ve sinyal kelimesine bakmayı öğretir."],
  ["YDS ve YÖKDİL için uygun mu?", "Evet, ikisine hazırlananlar için yapıldı."],
  ["İngilizcem zayıfsa kullanabilir miyim?", "Kullanabilirsin. Zayıfsan Dersler bölümünden başla, takıldığın yeri KLOD'a sor."],
  ["Puan garantisi veriyor mu?", "Hayır. Amacı, soruya sistemli bakmayı alışkanlık yapmak."],
  ["Mobilde çalışır mı?", "Evet, telefonda tarayıcıdan açılır, uygulama kurmana gerek yok."],
  ["Ücretli mi?", "Hayır, ücretsiz; kayıt da istemiyor."],
  ["Çalışmalarım kaydediliyor mu?", "İlerlemen bu tarayıcıda tutuluyor. Tarayıcı verilerini silersen ya da başka cihaza geçersen kaybolabilir."],
];
const sss = bolum("sss");
const ogeler = [...sss.matchAll(/<div class="sss-item">([\s\S]*?)<\/div><\/div>/g)].map((m) => m[1]);
kontrol("SSS'de 7 soru var", ogeler.length === 7, `${ogeler.length} adet`);
ogeler.forEach((o, i) => {
  const n = i + 1;
  const q = o.match(/<button type="button" class="sss-q" id="sss-q-(\d+)" aria-expanded="false" aria-controls="sss-a-(\d+)" data-sss-no="(\d+)" onclick="sssToggle\(this\)"><span>([\s\S]*?)<\/span>/);
  const a = o.match(/<div class="sss-a" id="sss-a-(\d+)" role="region" aria-labelledby="sss-q-(\d+)">([\s\S]*)$/);
  kontrol(`SSS ${n}: gerçek <button> + aria-expanded/aria-controls`, !!q && q[1] == n && q[2] == n && q[3] == n);
  kontrol(`SSS ${n}: cevap bölgesi id/aria-labelledby eşleşiyor`, !!a && a[1] == n && a[2] == n);
  kontrol(`SSS ${n}: soru metni`, !!q && duz(q[4]) === SSS[i][0], q && duz(q[4]));
  kontrol(`SSS ${n}: cevap metni`, !!a && duz(a[3]) === SSS[i][1], a && duz(a[3]));
});
kontrol("SSS'de eski div role=button kalmadı", !/class="sss-q"[^>]*role="button"/.test(html));

const ldHam = (html.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":"FAQPage"[\s\S]*?)<\/script>/) || [])[1];
let ld = null;
try { ld = JSON.parse(ldHam); } catch (_) {}
kontrol("FAQPage JSON-LD geçerli JSON", !!ld);
kontrol("JSON-LD 7 soru", !!ld && ld.mainEntity.length === 7);
kontrol(
  "JSON-LD metni sayfadaki SSS ile birebir aynı",
  !!ld && ld.mainEntity.every((e, i) => e["@type"] === "Question" && e.name === SSS[i][0] && e.acceptedAnswer["@type"] === "Answer" && e.acceptedAnswer.text === SSS[i][1])
);
kontrol("sayfada tek FAQPage JSON-LD", (html.match(/"@type":"FAQPage"/g) || []).length === 1);

// ---- SAYFA SONU ÇAĞRISI ----
const son = bolum("son-cagri");
kontrol("son çağrı bölümü SSS'den sonra", !!son && html.indexOf('<section id="son-cagri"') > html.indexOf('<section id="sss"'));
kontrol("son çağrı başlığı", /<h2 id="son-cagri-baslik">İlk sorunu birlikte avlayalım\.<\/h2>/.test(son));
const sonBtn = son.match(/<button[^>]*id="son-cta-btn"[^>]*>([\s\S]*?)<\/button>/);
kontrol("son çağrı düğmesi hero ile aynı metin + aynı giriş", !!sonBtn && duz(sonBtn[1]) === "Ücretsiz AVCI Testini Başlat" && /onclick="landingCtaTikla\('son_test'\);basla\(\)"/.test(sonBtn[0]));

// Son çağrı, hero metni değişince (dönen kullanıcı: "Bugünkü Görevime Git") onu aynalar.
{
  const k = html.slice(html.indexOf('<section id="son-cagri"'));
  const betik = (k.match(/<\/section>\s*<script>([\s\S]*?)<\/script>/) || [])[1] || "";
  kontrol("son çağrı aynalama betiği bölümün hemen ardında", /hero-basla-btn/.test(betik) && /son-cta-btn/.test(betik));
  let heroIc = { b: "Ücretsiz AVCI Testini Başlat" }, gozlemci = null;
  const hero = {
    querySelector: (s) => (s === "b" && heroIc.b ? { textContent: heroIc.b } : null),
    get textContent() { return heroIc.metin || heroIc.b; },
  };
  const son = { textContent: "" };
  const ctx = {
    document: { getElementById: (id) => (id === "hero-basla-btn" ? hero : id === "son-cta-btn" ? son : null) },
    MutationObserver: class { constructor(cb) { gozlemci = cb; } observe() {} },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(betik, ctx);
  kontrol("ilk ziyaret: son düğme metni hero ile aynı", son.textContent === "Ücretsiz AVCI Testini Başlat", son.textContent);
  heroIc = { b: null, metin: "📡 Bugünkü Görevime Git \n →" };
  gozlemci && gozlemci();
  kontrol("dönen kullanıcı: son düğme 'Bugünkü Görevime Git'", son.textContent === "📡 Bugünkü Görevime Git →", son.textContent);
}

// Seviye testi ekranında "AVCI Testi · 5 soru" etiketi (başlık/akış aynı)
{
  const ov = (html.match(/<div class="ia-overlay" id="ia-overlay"[\s\S]*?<div id="ia-icerik"><\/div>/) || [""])[0];
  kontrol("seviye testi ekranında 'AVCI Testi · 5 soru' etiketi", /<span class="ia-test-etiket">AVCI Testi · 5 soru<\/span>/.test(ov));
  kontrol("seviye testi başlığı değişmedi", html.includes('<div class="ia-baslik">Hangi sınava hazırlanıyorsun?</div>'));
}

// ---- DOKUNULMAMASI GEREKENLER ----
for (const id of ["dersler", "soru-lab-tanitim", "antrenman", "nasil", "ekitap", "klod", "calisma-plani", "ilerleme", "ses", "dashboard", "medya"]) {
  kontrol(`mevcut bölüm duruyor: #${id}`, html.includes(`<section id="${id}"`));
}
kontrol("Sabah listen panosu duruyor", html.includes('<div class="sabah-kart" id="sabah-kart" aria-live="polite"></div>') && /function sabahListesiRender\(\)/.test(html));

// ---- SES OTOMATİK ÇALMAZ ----
const yeniler = hero + kimler + sss + son;
kontrol("yeni bölümlerde '60 saniye' yok", !/60 saniye/i.test(kimler + sss + son));
kontrol("yeni/değişen bölümlerde autoplay yok", !/autoplay/i.test(yeniler));
kontrol("yeni bölümlerde ses çağrısı yok", !/ttsSpeak|new Audio|\.play\(/.test(kimler + sss + son));
kontrol("sayfa açılışındaki ilk Sinyal Lab render'ı sessiz", !/setTimeout\(slRender,\s*\d+\)/.test(html) && /setTimeout\(\(\)=>\{window\.__slSessizAcilis=true;try\{slRender\(\);\}finally\{window\.__slSessizAcilis=false;\}\},100\)/.test(html));
kontrol("slRender hiç otomatik okuma yapmıyor (ses yalnız #sl-dinle-btn)", (() => { const i = html.indexOf("function slRender(){"), j = html.indexOf("// S+V+O AKADEMİ", i); const k = i > -1 && j > i ? html.slice(i, j) : ""; return k.length > 0 && !/\b(ttsSpeak|ttsKaraoke)\s*\(|speechSynthesis\.speak/.test(k); })() && /id="sl-dinle-btn"/.test(html));

// ---- KELİME KARTLARI + SAT: hover/otomatik ses yok, ses yalnız tıklamayla ----
{
  const fnGovde = (ad) => { const i = html.indexOf(`function ${ad}(`); if (i < 0) return ""; const j = html.indexOf("\nfunction ", i + 10); return html.slice(i, j > i ? j : undefined); };
  const TTS_CAGRI = /\b(ttsSpeak|ttsKaraoke|ttsEleven)\s*\(/;
  const kk = (html.match(/<div class="dmod" id="mod-kelime"[\s\S]*?<div class="kk-actions"/) || [""])[0];
  kontrol("kelime kartı HTML'inde onmouseenter yok", kk.length > 0 && !/onmouseenter/i.test(kk));
  const kkBtn = kk.match(/<button[^>]*id="kk-dinle-btn"[^>]*>Dinle<\/button>/);
  kontrol("kartın ön yüzünde 'Dinle' düğmesi: tıklama kartı çevirmez, kelimeyi okur", !!kkBtn && /onclick="event\.stopPropagation\(\);[^"]*ttsKaraoke\(kkCurrent\.en/.test(kkBtn[0]) && /onkeydown="event\.stopPropagation\(\)"/.test(kkBtn[0]));
  kontrol("kartın arka yüzündeki örnek cümle tıklamayla okunmaya devam ediyor", /id="kk-ex-back"[^>]*onclick="event\.stopPropagation\(\);if\(kkCurrent&&window\.ttsKaraoke\)ttsKaraoke\(kkCurrent\.ex/.test(kk));
  kontrol("'üstüne gel, sesli dinle' yönlendirmeleri kalmadı", !/üstüne gel, sesli dinle|Üzerine gel, sesli dinle/i.test(kk));
  kontrol("kkShow yeni kartta kelimeyi otomatik okumuyor", (() => { const g = fnGovde("kkShow"); return g.length > 0 && !TTS_CAGRI.test(g); })());
  const sat = fnGovde("satPratikRender");
  kontrol("SAT: cümle, vurgulu kelime ve şıklarda onmouseenter yok", sat.length > 0 && !/onmouseenter/i.test(sat));
  kontrol("SAT: soru açılışında otomatik okuma yok, yalnız #sat-dinle-btn tıklaması", !TTS_CAGRI.test(sat.replace(/<button[^>]*id="sat-dinle-btn"[\s\S]*?<\/button>/, "")) && /id="sat-dinle-btn"[^>]*onclick="[^"]*ttsKaraoke\(/.test(sat));
}

// ---- ÖLÇÜM: davranış (vm) ----
const fnKaynak = (ad) => {
  const i = html.indexOf(`function ${ad}(`);
  if (i < 0) return "";
  let d = 0, j = html.indexOf("{", i);
  for (let k = j; k < html.length; k++) {
    if (html[k] === "{") d++;
    else if (html[k] === "}" && --d === 0) return html.slice(i, k + 1);
  }
  return "";
};
const olaylar = [];
const ctx = { phOlay: (ad, ek) => olaylar.push([ad, ek]) };
vm.createContext(ctx);
vm.runInContext(fnKaynak("sssToggle") + "\n" + fnKaynak("landingCtaTikla"), ctx);

function sahteSoru(no, metin) {
  const sinif = new Set();
  const attr = { "data-sss-no": String(no), "aria-expanded": "false" };
  const item = { classList: { toggle: (c) => (sinif.has(c) ? (sinif.delete(c), false) : (sinif.add(c), true)) } };
  return {
    parentElement: item,
    getAttribute: (k) => attr[k],
    setAttribute: (k, v) => { attr[k] = v; },
    querySelector: () => ({ textContent: metin }),
    attr,
  };
}
const s3 = sahteSoru(3, "İngilizcem zayıfsa kullanabilir miyim?");
ctx.sssToggle(s3);
kontrol("açılınca aria-expanded=true", s3.attr["aria-expanded"] === "true");
kontrol("açılınca sss_acildi + soru_no", olaylar.length === 1 && olaylar[0][0] === "sss_acildi" && olaylar[0][1].soru_no === 3, JSON.stringify(olaylar[0]));
ctx.sssToggle(s3);
kontrol("kapanınca aria-expanded=false", s3.attr["aria-expanded"] === "false");
kontrol("kapanırken olay gitmez", olaylar.length === 1);
ctx.landingCtaTikla("hero_test");
kontrol("landing_cta_click + dugme", olaylar.length === 2 && olaylar[1][0] === "landing_cta_click" && olaylar[1][1].dugme === "hero_test");

// phOlay çerez onayına bağlı: onay yoksa posthog.opt_out_capturing, phOlay sessizce geçer.
kontrol("PostHog yalnız çerez onayıyla başlar", /if\(onay==='1'\)phBaslat\(\);else\{try\{posthog\.opt_out_capturing\(\);\}/.test(html));
const ctx2 = {};
vm.createContext(ctx2);
vm.runInContext(fnKaynak("sssToggle") + "\n" + fnKaynak("landingCtaTikla"), ctx2);
let hata = null;
try { ctx2.landingCtaTikla("son_test"); ctx2.sssToggle(sahteSoru(1, "x")); } catch (e) { hata = e; }
kontrol("phOlay yoksa hata fırlatmaz", hata === null, hata && hata.message);

console.log(`\n${toplam - basarisiz}/${toplam} geçti`);
if (basarisiz) process.exit(1);
