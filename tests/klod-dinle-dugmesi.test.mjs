// KLOD AKTİF SORU KARTI — "Dinle" düğmesi (hazır mp3, assets/sl-ses).
//
// Doğrulanan kurallar:
// - Düğme İngilizce cümlenin ALTINDA, şıklardan ÖNCE; yalnız mp3'ü olan havuz
//   sorularında (q001–q083) çizilir, havuz dışı soruda hiç yoktur.
// - Tıklama merkezi [data-action] dinleyicisinden gelir; inline onclick yok.
// - Audio nesnesi yalnız basınca oluşur (kart çizilirken indirme yok);
//   /api/tts ve /api/tts-eleven çağrısı yok, fetch hiç çağrılmaz.
// - Basınca "Durdur", bitince/yeniden basınca "Dinle"; kart yeniden çizilince,
//   başka soruya ya da başka ekrana geçilince çalan ses kesilir.
// - assets/sl-ses: 83 mp3 + manifest; manifest metinleri bankadaki cümlelerle aynı.
//
// index.html'deki ilgili kaynak BİREBİR çıkarılıp Node `vm` ile sahte bir DOM
// üzerinde GERÇEKTEN çalıştırılır (diğer KLOD testleriyle aynı desen).

import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const html = readFileSync(path.join(ROOT, "index.html"), "utf-8").replace(/\r\n/g, "\n");
function slice(startMarker, endMarker, fromIdx) {
  const s = html.indexOf(startMarker, fromIdx || 0);
  const e = html.indexOf(endMarker, s);
  if (s === -1 || e === -1) throw new Error(`marker bulunamadı: "${startMarker}" -> "${endMarker}"`);
  return html.slice(s, e);
}

const KART_CIZ = slice("function klodSoruKartiCiz(){", "// ─── AKTİF SORU KARTI: \"Dinle\"");
const DINLE_BLOK = slice("// ─── AKTİF SORU KARTI: \"Dinle\"", "// Açıklanan rol metinlerini");
const CUMLE_DOLDUR = slice("function klodKartCumleDoldur(el,metin){", "function klodAdimVurgula(adim){");
const BASILDI = DINLE_BLOK.slice(DINLE_BLOK.indexOf("function klodKartDinleBasildi(){"), DINLE_BLOK.indexOf("// Merkezi tıklama dinleyicisi"));
const SES_DIZIN = path.join(ROOT, "assets", "sl-ses");

// ---- STATİK ----
{
  kontrol("S1) düğme data-action ile bağlı, inline onclick / .onclick ataması YOK", /d\.dataset\.action='klod-kart-dinle'/.test(KART_CIZ) && !/klod-kart-dinle[^\n]*onclick\s*=/i.test(html) && !/onclick\s*=/.test(DINLE_BLOK));
  kontrol("S2) merkezi dinleyici: belge düzeyinde click + closest('[data-action]') + aksiyon tablosu", /document\.addEventListener\('click'/.test(DINLE_BLOK) && /closest\('\[data-action\]'\)/.test(DINLE_BLOK) && /MERKEZI_AKSIYONLAR=\{'klod-kart-dinle':klodKartDinleBasildi\}/.test(DINLE_BLOK));
  kontrol("S3) /api/tts ve /api/tts-eleven çağrısı YOK, fetch YOK", !/\/api\/tts|fetch\(/.test(DINLE_BLOK) && !/\/api\/tts|fetch\(/.test(KART_CIZ));
  kontrol("S4) Audio nesnesi YALNIZ basılınca oluşuyor (tek new Audio, klodKartDinleBasildi içinde)", (DINLE_BLOK.match(/new Audio\(/g) || []).length === 1 && /new Audio\(yol\)/.test(BASILDI) && !/new Audio\(/.test(KART_CIZ));
  kontrol("S5) sayfa açılışında mp3 indirme YOK: sl-ses yolu kodda tek yerde, preload/link etiketi yok", (html.match(/'assets\/sl-ses\/q'/g) || []).length === 1 && !/<(link|audio|source)[^>]*sl-ses/i.test(html));
  kontrol("S6) kart yeniden çizilirken çalan ses kesiliyor (temizlemeden ÖNCE)", KART_CIZ.indexOf("klodKartDinleDurdur();") > -1 && KART_CIZ.indexOf("klodKartDinleDurdur();") < KART_CIZ.indexOf("kart.textContent='';"));
  kontrol("S7) başka soruya geçilince ses kesiliyor (slRender: slCurrentSoru atamasından hemen önce)", /if\(typeof klodKartDinleDurdur==='function'&&slCurrentSoru!==soru\)klodKartDinleDurdur\(\);[^\n]*\n  slCurrentSoru=soru;/.test(html));
  kontrol("S8) başka ekrana geçilince ses kesiliyor (dnav başında)", /function dnav\(el\)\{\n  if\(typeof klodKartDinleDurdur==='function'\)klodKartDinleDurdur\(\);/.test(html));
  const css = (html.match(/\.klod-kart-dinle\{[^}]*\}/) || [""])[0];
  kontrol("S9) dokunma alanı en az 44 px (min-height:44px, min-width ≥ 44px)", /min-height:44px/.test(css) && Number((css.match(/min-width:(\d+)px/) || [])[1]) >= 44, css.slice(0, 80));
  kontrol("S10) düğme metninde emoji yok", /h\('button','klod-kart-dinle','Dinle'\)/.test(KART_CIZ) && /caliyor\?'Durdur':'Dinle'/.test(DINLE_BLOK));
  const sw = readFileSync(path.join(ROOT, "sw.js"), "utf-8");
  kontrol("S11) sw.js CACHE_NAME v7 (assets cache-first: yeni dosyalar için sürüm arttı)", /const CACHE_NAME = 'sinyal-avcisi-v7';/.test(sw));
}

// ---- SES DOSYALARI + MANIFEST ----
const havuz = vm.runInNewContext(slice("const SL_HAVUZ=[", "\n];").replace("const SL_HAVUZ=", "(") + "\n])");
{
  const manifest = JSON.parse(readFileSync(path.join(SES_DIZIN, "manifest.json"), "utf-8"));
  const mp3ler = readdirSync(SES_DIZIN).filter((f) => f.endsWith(".mp3")).sort();
  const beklenen = Array.from({ length: 83 }, (_, i) => `q${String(i + 1).padStart(3, "0")}.mp3`);
  kontrol("D1) assets/sl-ses içinde tam olarak q001..q083.mp3 var", JSON.stringify(mp3ler) === JSON.stringify(beklenen), `${mp3ler.length} dosya`);
  const boyut = mp3ler.reduce((t, f) => t + statSync(path.join(SES_DIZIN, f)).size, 0);
  kontrol("D2) toplam mp3 boyutu makul (3–6 MB), boş dosya yok", boyut > 3e6 && boyut < 6e6 && mp3ler.every((f) => statSync(path.join(SES_DIZIN, f)).size > 5000), `${(boyut / 1048576).toFixed(2)} MB`);
  kontrol("D3) manifest 83 kayıt, her kaydın dosyası mevcut", manifest.kayit_sayisi === 83 && manifest.kayitlar.length === 83 && manifest.kayitlar.every((k) => k.dosya === `${k.id}.mp3` && existsSync(path.join(SES_DIZIN, k.dosya))));
  const havuzIdleri = havuz.map((s) => s.id);
  kontrol("D4) bankadaki her soru kimliği (SL_HAVUZ) için bir ses kaydı var, fazlası yok", JSON.stringify([...havuzIdleri].sort()) === JSON.stringify(manifest.kayitlar.map((k) => k.id).sort()), `${havuzIdleri.length} soru`);
  const sade = (t) => String(t || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().replace(/^["“”]+|["“”]+$/g, "");
  const farkli = manifest.kayitlar.filter((k) => sade(havuz.find((s) => s.id === k.id)?.sent) !== sade(k.metin)).map((k) => k.id);
  kontrol("D5) seslendirilen metin bankadaki İngilizce cümleyle AYNI (soru değişirse ses yeniden üretilmeli)", farkli.length === 0, farkli.length ? `farklı: ${farkli.join(", ")}` : undefined);
}

// ---- GERÇEK ÇALIŞTIRMA (sahte DOM) ----
function ortamKur() {
  class El {
    constructor(etiket) { this.tagName = String(etiket).toUpperCase(); this.cocuklar = []; this.ust = null; this.className = ""; this._metin = ""; this.dataset = {}; this.oznitelikler = {}; this.id = ""; }
    get textContent() { return this._metin + this.cocuklar.map((c) => c.textContent).join(""); }
    set textContent(v) { this.cocuklar = []; this._metin = String(v); }
    append(...ds) { for (const d of ds) { d.ust = this; this.cocuklar.push(d); } }
    setAttribute(a, v) { this.oznitelikler[a] = String(v); }
    getAttribute(a) { return this.oznitelikler[a] ?? null; }
    get classList() {
      const el = this;
      const liste = () => el.className.split(/\s+/).filter(Boolean);
      return { contains: (c) => liste().includes(c), toggle: (c, ac) => { const l = liste().filter((x) => x !== c); if (ac) l.push(c); el.className = l.join(" "); } };
    }
    closest(sec) { let e = this; while (e) { if (sec === "[data-action]" && e.dataset && e.dataset.action) return e; e = e.ust; } return null; }
    bul(sinif) { for (const c of this.cocuklar) { if (c.className && c.className.split(/\s+/).includes(sinif)) return c; const a = c.bul && c.bul(sinif); if (a) return a; } return null; }
  }
  const kart = new El("aside"); kart.id = "klod-soru-karti";
  const sesler = [];
  class SahteAudio {
    constructor(src) { this.src = src; this.durdu = false; this.caldi = false; sesler.push(this); }
    play() { this.caldi = true; return Promise.resolve(); }
    pause() { this.durdu = true; }
  }
  const dinleyiciler = {};
  let fetchSayisi = 0;
  const ctx = {
    console,
    Audio: SahteAudio,
    fetch: () => { fetchSayisi++; throw new Error("fetch çağrılmamalı"); },
    document: {
      getElementById: (id) => (id === "klod-soru-karti" ? kart : null),
      createElement: (t) => new El(t),
      createTextNode: (t) => { const e = new El("#text"); e._metin = String(t); return e; },
      querySelector: (sec) => (sec === "#klod-soru-karti .klod-kart-dinle" ? kart.bul("klod-kart-dinle") : null),
      addEventListener: (ad, f) => { dinleyiciler[ad] = f; },
    },
    klodHizliAksiyon() {},
    klodSesDurdur() { ctx.__klodSusturuldu = (ctx.__klodSusturuldu || 0) + 1; },
  };
  vm.createContext(ctx);
  vm.runInContext(`let _aktifSoruModulu='sinyal_lab',slCurrentSoru=null,_klodKartRoller={};\n${KART_CIZ}\n${DINLE_BLOK}\n${CUMLE_DOLDUR}\nfunction __soru(s,modul){slCurrentSoru=s;_aktifSoruModulu=modul===undefined?'sinyal_lab':modul;klodSoruKartiCiz();}`, ctx);
  const tikla = (el) => dinleyiciler.click({ target: el });
  return { ctx, kart, sesler, tikla, fetchSayisi: () => fetchSayisi };
}

{
  const env = ortamKur();
  const q5 = havuz.find((s) => s.id === "q005");
  env.ctx.__soru(q5);
  const siniflar = env.kart.cocuklar.map((c) => c.className);
  const dugme = env.kart.bul("klod-kart-dinle");
  kontrol("1) havuz sorusunda düğme çiziliyor: 'Dinle', <button type=button>, data-action", !!dugme && dugme.textContent === "Dinle" && dugme.tagName === "BUTTON" && dugme.type === "button" && dugme.dataset.action === "klod-kart-dinle");
  kontrol("2) düğme cümlenin ALTINDA, soru kökü ve şıklardan ÖNCE", siniflar.indexOf("klod-kart-dinle") === siniflar.indexOf("klod-kart-cumle") + 1 && siniflar.indexOf("klod-kart-dinle") < siniflar.indexOf("klod-kart-siklar"), siniflar.join(" > "));
  kontrol("3) kart çizilirken Audio OLUŞMUYOR (indirme yok)", env.sesler.length === 0);

  env.tikla(dugme);
  kontrol("4) basınca soru kimliğine göre assets/sl-ses/q005.mp3 çalıyor", env.sesler.length === 1 && env.sesler[0].src === "assets/sl-ses/q005.mp3" && env.sesler[0].caldi);
  kontrol("5) çalarken düğme 'Durdur' (aria-pressed=true)", dugme.textContent === "Durdur" && dugme.getAttribute("aria-pressed") === "true" && dugme.classList.contains("caliyor"));
  kontrol("6) KLOD'un kendi sesi üst üste binmesin diye susturuluyor", env.ctx.__klodSusturuldu === 1);

  env.tikla(dugme);
  kontrol("7) yeniden basınca ses duruyor, düğme 'Dinle'ye dönüyor, yeni Audio yok", env.sesler[0].durdu && dugme.textContent === "Dinle" && dugme.getAttribute("aria-pressed") === "false" && env.sesler.length === 1);

  env.tikla(dugme);
  env.sesler[1].onended();
  kontrol("8) ses bitince düğme eski haline dönüyor", dugme.textContent === "Dinle" && !dugme.classList.contains("caliyor"));

  env.tikla(dugme);
  env.sesler[2].onerror();
  kontrol("9) dosya yüklenemezse düğme 'Dinle'ye dönüyor (takılı kalmıyor)", dugme.textContent === "Dinle");

  env.tikla(dugme);
  env.ctx.__soru(havuz.find((s) => s.id === "q006"));
  const yeniDugme = env.kart.bul("klod-kart-dinle");
  kontrol("10) çalarken başka soru çizilince ses kesiliyor, yeni kartta düğme 'Dinle'", env.sesler[3].durdu && yeniDugme.textContent === "Dinle");
  env.tikla(yeniDugme);
  kontrol("11) yeni soruda kendi dosyası çalıyor (q006)", env.sesler[4].src === "assets/sl-ses/q006.mp3");
  env.ctx.klodSoruKartiCiz();
  kontrol("12) aynı kart yeniden çizilince de çalan ses kesiliyor", env.sesler[4].durdu && env.kart.bul("klod-kart-dinle").textContent === "Dinle");

  const once = env.sesler.length;
  env.tikla(env.kart.bul("klod-kart-cumle"));
  kontrol("13) data-action taşımayan öğeye tıklama hiçbir şey çalmıyor", env.sesler.length === once);
  kontrol("14) hiçbir adımda fetch çağrılmadı", env.fetchSayisi() === 0);
}

{
  const env = ortamKur();
  for (const [ad, soru] of [["kimliksiz soru", { sent: "A sentence.", q: "?", opts: ["a", "b"] }], ["havuz dışı kimlik (q084)", { id: "q084", sent: "A sentence.", opts: ["a"] }], ["başka biçimli kimlik (b012)", { id: "b012", sent: "A sentence.", opts: ["a"] }], ["q000", { id: "q000", sent: "A sentence.", opts: ["a"] }]]) {
    env.ctx.__soru(soru);
    kontrol(`15) mp3'ü olmayan soruda düğme HİÇ yok: ${ad}`, env.kart.bul("klod-kart-dinle") === null && !!env.kart.bul("klod-kart-cumle"));
  }
  env.ctx.__soru(null, null);
  kontrol("16) açık soru yokken düğme yok, boş kart metni duruyor", env.kart.bul("klod-kart-dinle") === null && !!env.kart.bul("klod-kart-bos"));
  env.ctx.klodKartDinleBasildi();
  kontrol("17) soru yokken aksiyon çağrılsa da Audio oluşmuyor", env.sesler.length === 0);
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
