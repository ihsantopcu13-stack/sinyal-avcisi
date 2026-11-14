// KATMAN 5H-B — AÇIK SORU YOKKEN "SORU GETİR". KLOD ekranında Sinyal Lab
// aktif DEĞİLKEN (AKTİF SORU kartı "Şu an açık bir soru yok") öğrenci
// 'soru getir' ailesinden birini yazarsa: sohbet LLM'e gitmez, tracker
// 'sinyal_lab' olur, soru 5H'nin AYNI seçicisiyle (slSonraki → slRender)
// bankadan açılır ve AKTİF SORU kartı yeniden çizilir.
//
// index.html'den dnavChat içindeki 5H-B bloğu + mevcut slIdx/SL_HAVUZ/
// slRender/slSonraki kaynağı BİREBİR çıkarılıp Node `vm` ile GERÇEKTEN
// çalıştırılır (avci-klod-next-question.test.mjs ile AYNI desen). Gerçek
// ağa HİÇ çıkılmaz: fetch çağrılırsa test başarısız olur.

import { readFileSync } from "node:fs";
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

const DNAVCHAT_BAS = html.indexOf("async function dnavChat(){");
const TOKEN_IDX = html.indexOf("// 20. TOKEN COUNTING", DNAVCHAT_BAS);
const BLOK_IDX = html.indexOf("// KATMAN 5H-B", DNAVCHAT_BAS);
const TYPING_IDX = html.indexOf("// Typing göstergesi", DNAVCHAT_BAS);
const BLOK_5HB = slice("// KATMAN 5H-B", "\n\n  // Typing göstergesi", DNAVCHAT_BAS);

// ---- STATİK ----
{
  kontrol("S1) 5H-B bloğu dnavChat içinde TOKEN COUNTING'den SONRA, typing göstergesinden ÖNCE", BLOK_IDX > TOKEN_IDX && BLOK_IDX < TYPING_IDX && TOKEN_IDX > DNAVCHAT_BAS);
  kontrol("S2) 5H-B bloğu 5H köprü diliminin (… → TOKEN COUNTING) DIŞINDA — mevcut köprü testleri onu çalıştırmaz", !slice("if(avciSonrakiSoruKomutuMu(val)&&_aktifSoruModulu==='sinyal_lab'){", "\n\n  // 20. TOKEN COUNTING").includes("KATMAN 5H-B"));
  const blokIfadeleri = BLOK_5HB.match(/\[('[^\]]+')\]\.includes\(_soruGetirNorm\)/)[1].match(/'([^']+)'/g).map((s) => s.slice(1, -1));
  const kom5h = slice("const AVCI_SONRAKI_SORU_KOMUTLARI=[", "];").match(/'([^']+)'/g).map((s) => s.slice(1, -1));
  kontrol("S3) 5H-B tam olarak 4 ifadeyi tanıyor: soru getir / soru ver / bana soru / bir soru sor", JSON.stringify(blokIfadeleri) === JSON.stringify(["soru getir", "soru ver", "bana soru", "bir soru sor"]));
  kontrol("S4) 5H-B ifadelerinin HEPSİ 5H listesinde de var (iki liste ayrışmadı)", blokIfadeleri.every((k) => kom5h.includes(k)));
  kontrol("S5) 5H-B bloğu fetch / /api/klod çağrısı İÇERMİYOR (token harcamaz)", !/fetch\(|\/api\/klod/.test(BLOK_5HB));
  kontrol("S6) soru 5H'nin seçicisiyle açılıyor (slSonraki), sabit indeks/SL_HAVUZ[0] YOK", /slSonraki\(\);/.test(BLOK_5HB) && !/SL_HAVUZ\[0\]|slIdx\s*=\s*0/.test(BLOK_5HB));
  kontrol("S7) AKTİF SORU kartı yeniden çiziliyor (klodSoruKartiBaslat)", /klodSoruKartiBaslat\(\)/.test(BLOK_5HB));
  kontrol("S8) yalnız KLOD ekranında (hedef yokken) çalışıyor", /if\(!hedef&&/.test(BLOK_5HB));
  kontrol("S9) kartı gizleyen tam odak (klod-tam) kapatılıyor: klodTamAyarla(false), kart çiziminden SONRA", /klodTamAyarla\(false\)/.test(BLOK_5HB) && BLOK_5HB.indexOf("klodTamAyarla(false)") > BLOK_5HB.indexOf("klodSoruKartiBaslat()"));
  const SLRENDER_KAYNAK = slice("function slRender(){", "// S+V+O AKADEMİ");
  kontrol("S11) 5H-B sessiz bayrağını slSonraki çevresinde açıp finally ile kapatıyor", /window\.__slSessizAcilis=true;\s*\n\s*try\{slSonraki\(\);\}finally\{window\.__slSessizAcilis=false;\}/.test(BLOK_5HB));
  kontrol("S12) slRender HİÇ otomatik okuma yapmıyor (ttsSpeak/ttsKaraoke yok; ses yalnız #sl-dinle-btn)", SLRENDER_KAYNAK.length > 0 && !/\b(ttsSpeak|ttsKaraoke)\s*\(|speechSynthesis\.speak/.test(SLRENDER_KAYNAK));
  const avciCozum = readFileSync(path.join(ROOT, "assets", "modules", "avci-cozum.js"), "utf-8");
  kontrol("S13) kuyruk yolu (avciKuyrukSonraki → soruGoster) slRender'ı SENKRON çağırıyor — bayrak bu yolu da kapsar", /window\.__slDeepLinkSoru=s;slRender\(\);/.test(avciCozum));
  kontrol("S10) tam odak sınıfı kartı gerçekten gizliyor (S9'un nedeni — CSS hâlâ böyle)", /body\.klod-odak\.klod-tam [^{]*\.klod-soru-karti\{display:none!important\}/.test(html));
  // 5H köprüsü (Sinyal Lab AKTİFKEN — ör. Sinyal Lab → KLOD → "soru ver") da aynı sessiz bayrağı kullanmalı
  const kopru = slice("if(avciSonrakiSoruKomutuMu(val)&&_aktifSoruModulu==='sinyal_lab'){", "\n\n  // KATMAN 5I");
  const kopruIfadeleri = (kopru.match(/const _sessizKomut=\[([^\]]+)\]/) || [, ""])[1].match(/'([^']+)'/g)?.map((s) => s.slice(1, -1)) || [];
  kontrol("S14) 5H köprüsündeki sessiz ifade listesi 5H-B ile BİREBİR aynı (4 ifade)", JSON.stringify(kopruIfadeleri) === JSON.stringify(["soru getir", "soru ver", "bana soru", "bir soru sor"]), JSON.stringify(kopruIfadeleri));
  kontrol("S15) 5H köprüsü bayrağı yalnız bu ifadelerde açıyor ve finally ile kapatıyor; slSonraki satırı korunuyor", /if\(_sessizKomut\)window\.__slSessizAcilis=true;\s*\n\s*try\{if\(typeof slSonraki==='function'\)slSonraki\(\);\}finally\{if\(_sessizKomut\)window\.__slSessizAcilis=false;\}/.test(kopru));
}

// ---- GERÇEK ÇALIŞTIRMA ----
const TRACKER_DECL = "let _aktifSoruModulu=null;\nlet dnavHistory=[];\nlet dnavTurnState='THINKING';\nlet __kartCizimSayisi=0;\nfunction klodSoruKartiBaslat(){__kartCizimSayisi++;}\nlet __tamOdak=true;\nfunction klodTamAyarla(acik){__tamOdak=!!acik;}\n";
const STATE_DECL = slice("let slIdx=0,slAnswered=false,slCurrentSoru=null,_slRtBaslangic=null;", "function slRender(){");
const SLRENDER_FN = slice("function slRender(){", "// S+V+O AKADEMİ");
const SLSONRAKI_FN = slice("function slSonraki(){", "\n// FAZ 2 — attribution yakalama");
const BAGLAM_VE_BOARD_BLOK = slice("function avciAktifSinyalLabBaglamiAl(){", "async function dnavChat(){");
const HARNESS = `
function __t_setAktifModul(v){_aktifSoruModulu=v;}
function __t_durum(){return {modul:_aktifSoruModulu,slIdx:slIdx,soruId:slCurrentSoru&&slCurrentSoru.id,gecmis:dnavHistory.slice(),tur:dnavTurnState,kart:__kartCizimSayisi,tamOdak:__tamOdak};}
function __t_turSifirla(){dnavTurnState='THINKING';}
function __probe5HB(val, body, inp, hedef){
${BLOK_5HB}
  return 'sohbete-devam';
}
function __probe5H(val, body, inp){
${slice("if(avciSonrakiSoruKomutuMu(val)&&_aktifSoruModulu==='sinyal_lab'){", "\n\n  // 20. TOKEN COUNTING")}
  return 'sohbete-devam';
}
`;
const FULL_SRC = TRACKER_DECL + "\n" + STATE_DECL + "\n" + SLRENDER_FN + "\n" + SLSONRAKI_FN + "\n" + BAGLAM_VE_BOARD_BLOK + "\n" + HARNESS;

const Q1 = { id: "q001", sinyal: "despite", eye: "Genel", sent: "The court ruled, despite the issues, it was valid.", q: "Soru 1?", opts: ["a", "b", "c", "d", "e"], ans: 1, fb: "fb1" };
const Q2 = { id: "q002", sinyal: "however", eye: "Genel", sent: "Researchers concluded results were significant.", q: "Soru 2?", opts: ["a", "b", "c", "d", "e"], ans: 0, fb: "fb2" };
const Q3 = { id: "q003", sinyal: "although", eye: "Genel", sent: "Although tired, she finished the race.", q: "Soru 3?", opts: ["a", "b", "c", "d", "e"], ans: 2, fb: "fb3" };

const fakeBody = () => ({ children: [], scrollTop: 0, scrollHeight: 0, appendChild(el) { this.children.push(el); } });
const fakeInp = () => ({ disabled: true, _focused: false, focus() { this._focused = true; } });

function sandboxKur() {
  const fetchCagrilari = [];
  const zamanlayicilar = []; // slRender'ın kurduğu setTimeout'lar — elle çalıştırılır
  const ttsCagrilari = [];
  const sandbox = {
    console: { warn: () => {}, log: () => {}, error: () => {} },
    document: { getElementById: () => null, createElement: () => ({}) },
    window: {},
    curAlan: undefined,
    setTimeout: (fn, ms) => { zamanlayicilar.push({ fn, ms }); return zamanlayicilar.length; },
    rtBaslat: () => 1000,
    avciTeshisPaneliTemizle: () => {},
    // Gerçek ttsSpeak /api/tts (OpenAI) ve /api/tts-eleven'e gider; burada yalnız sayılır.
    ttsSpeak: (metin, dil) => { ttsCagrilari.push({ metin, dil }); },
    SL_HAVUZ: [Q1, Q2, Q3],
    fetch: async (...args) => { fetchCagrilari.push(args); throw new Error("fetch ÇAĞRILMAMALIYDI"); },
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(FULL_SRC, context, { filename: "index.html (5H-B soru getir)" });
  context.slRender(); // sayfa açılışındaki ilk render (q001) — kart yine de "açık soru yok" der, çünkü tracker null
  zamanlayicilar.length = 0; // açılış render'ının zamanlayıcıları bu testlerin konusu değil
  const zamanlayicilariCalistir = () => { const l = zamanlayicilar.splice(0); l.forEach((z) => z.fn()); return l.length; };
  return { context, fetchCagrilari, zamanlayicilar, ttsCagrilari, zamanlayicilariCalistir, sandbox };
}

// 1) Açık soru yokken "Soru getir." → bankadan soru açılır, kart güncellenir
{
  const t = sandboxKur();
  const once = t.context.__t_durum();
  const body = fakeBody();
  const inp = fakeInp();
  const sonuc = t.context.__probe5HB("Soru getir.", body, inp, null);
  const d = t.context.__t_durum();
  kontrol("1-ön) başlangıçta modül aktif değil (AKTİF SORU kartı 'açık soru yok')", once.modul === null && once.slIdx === 0);
  kontrol("1a) komut ele alındı, sohbete (LLM) DÜŞMEDİ", sonuc === undefined);
  kontrol("1b) tracker 'sinyal_lab' yapıldı", d.modul === "sinyal_lab");
  kontrol("1c) soru 5H seçicisiyle açıldı: slIdx 0→1, q002 (ilk soru sabit seçilmedi)", d.slIdx === 1 && d.soruId === Q2.id, `${d.slIdx} ${d.soruId}`);
  kontrol("1d) AKTİF SORU kartı yeniden çizildi (1 kez)", d.kart === 1);
  kontrol("1d2) kartı gizleyen tam odak kapatıldı", d.tamOdak === false);
  kontrol("1e) KLOD onay mesajı eklendi, kartı işaret ediyor", body.children.length === 1 && /AKTİF SORU kartında/.test(body.children[0].textContent));
  kontrol("1f) geçmişe kullanıcı + onay mesajı eklendi", d.gecmis.length === 2 && d.gecmis[0].role === "user" && d.gecmis[0].content === "Soru getir." && d.gecmis[1].role === "assistant");
  kontrol("1g) tur IDLE'a döndü, girdi açıldı ve odaklandı", d.tur === "IDLE" && inp.disabled === false && inp._focused === true);
  kontrol("1h) fetch HİÇ çağrılmadı (0 token)", t.fetchCagrilari.length === 0);
  const baglam = t.context.avciAktifSinyalLabBaglamiAl();
  kontrol("1i) açılan soru KLOD bağlamında aktif soru olarak görünüyor (q002, cevaplanmamış)", !!baglam && baglam.question_id === Q2.id && baglam.answered === false);
  // Sessiz açılış: otomatik okuma zamanlayıcısı HİÇ kurulmadı; kalanlar çalışsa bile TTS/fetch yok
  const kurulanZamanlayici = t.zamanlayicilar.length;
  t.zamanlayicilariCalistir();
  kontrol("1j) sessiz açılış: otomatik okuma zamanlayıcısı KURULMADI", kurulanZamanlayici === 0, kurulanZamanlayici);
  kontrol("1k) sessiz açılış: ttsSpeak HİÇ çağrılmadı (/api/tts ve /api/tts-eleven yok)", t.ttsCagrilari.length === 0, JSON.stringify(t.ttsCagrilari));
  kontrol("1l) sessiz açılış: fetch HİÇ çağrılmadı", t.fetchCagrilari.length === 0);
  kontrol("1m) sessiz bayrağı çağrıdan sonra kapandı (sızıntı yok)", t.sandbox.window.__slSessizAcilis === false);
}

// 6) Sinyal Lab'ın NORMAL açılışı (Sonraki soru düğmesi = slSonraki) da artık SESSİZ
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  t.context.slSonraki();
  const kurulan = t.zamanlayicilar.map((z) => z.ms);
  t.zamanlayicilariCalistir();
  kontrol("6a) normal açılışta okuma zamanlayıcısı (600/2500 ms) kurulmadı", !kurulan.includes(600) && !kurulan.includes(2500), JSON.stringify(kurulan));
  kontrol("6b) normal açılışta ttsSpeak 0, fetch 0 (ücretli /api/tts* yok); soru yine açıldı", t.ttsCagrilari.length === 0 && t.fetchCagrilari.length === 0 && t.context.__t_durum().soruId === Q2.id, JSON.stringify(t.ttsCagrilari));
}

// 7) 5H-B sessiz açılışından sonra normal açılış da sessiz (bayrak ne olursa olsun okuma yok)
{
  const t = sandboxKur();
  t.context.__probe5HB("soru getir", fakeBody(), fakeInp(), null); // q002
  t.zamanlayicilariCalistir();
  const sessizTts = t.ttsCagrilari.length;
  t.context.slSonraki(); // Sinyal Lab'daki "Sonraki soru" (q003)
  t.zamanlayicilariCalistir();
  kontrol("7) 5H-B açılışında 0 TTS, ardından normal açılışta da 0 TTS; bayrak kapalı", sessizTts === 0 && t.ttsCagrilari.length === 0 && t.context.__t_durum().soruId === Q3.id && t.sandbox.window.__slSessizAcilis === false, `${sessizTts} → ${t.ttsCagrilari.length}`);
}

// 8) slSonraki hata atsa bile bayrak kapanıyor (finally)
{
  const t = sandboxKur();
  t.context.slSonraki = () => { throw new Error("test: seçici patladı"); };
  let hata = null;
  try { t.context.__probe5HB("soru getir", fakeBody(), fakeInp(), null); } catch (e) { hata = e; }
  kontrol("8) slSonraki hata atsa bile sessiz bayrağı kapandı (finally)", !!hata && t.sandbox.window.__slSessizAcilis === false);
}

// 2) 4 ifadenin hepsi (noktalama/büyük harf dahil) tetikler; her seferinde seçici ilerler
{
  const t = sandboxKur();
  const sonuclar = [];
  for (const metin of ["soru getir", "Soru ver!", "BANA SORU", "Bir soru sor?"]) {
    t.context.__t_setAktifModul(null); // her denemede "açık soru yok" durumu
    t.context.__t_turSifirla();
    const r = t.context.__probe5HB(metin, fakeBody(), fakeInp(), null);
    const d = t.context.__t_durum();
    sonuclar.push({ metin, ele: r === undefined, modul: d.modul, slIdx: d.slIdx });
  }
  kontrol("2a) 4 ifadenin hepsi ele alındı ve tracker 'sinyal_lab' oldu", sonuclar.every((s) => s.ele && s.modul === "sinyal_lab"), JSON.stringify(sonuclar));
  kontrol("2b) seçici her seferinde ilerledi (1,2,0,1 — %SL_HAVUZ.length), sabit soru YOK", JSON.stringify(sonuclar.map((s) => s.slIdx)) === "[1,2,0,1]", JSON.stringify(sonuclar.map((s) => s.slIdx)));
  kontrol("2c) fetch HİÇ çağrılmadı", t.fetchCagrilari.length === 0);
}

// 3) Tetiklememesi gerekenler → hiçbir yan etki, sohbete devam
{
  for (const metin of ["sonraki soru", "bana soruyu açıkla", "bu soruyu çöz", "bir soru sorabilir miyim", "bana bir soru getirir misin", "despite ne demek?"]) {
    const t = sandboxKur();
    const body = fakeBody();
    const r = t.context.__probe5HB(metin, body, fakeInp(), null);
    const d = t.context.__t_durum();
    kontrol(`3) "${metin}" → 5H-B tetiklenmez (modül null, slIdx 0, mesaj/geçmiş yok, tam odak değişmedi, sohbete devam)`, r === "sohbete-devam" && d.modul === null && d.slIdx === 0 && body.children.length === 0 && d.gecmis.length === 0 && d.kart === 0 && d.tamOdak === true);
  }
}

// 4) Sinyal Lab ZATEN aktifken 5H-B iş yapmaz (o durumda 5H köprüsü ele alır)
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  const r = t.context.__probe5HB("soru getir", fakeBody(), fakeInp(), null);
  const d = t.context.__t_durum();
  kontrol("4) modül zaten aktifken 5H-B tetiklenmez (çift ilerleme yok)", r === "sohbete-devam" && d.slIdx === 0 && d.kart === 0);
}

// 5) Başka ekrandan (hedef: Canlı Ders) gelirse 5H-B tetiklenmez
{
  const t = sandboxKur();
  const r = t.context.__probe5HB("soru getir", fakeBody(), fakeInp(), { inp: {}, body: {} });
  const d = t.context.__t_durum();
  kontrol("5) hedef varken (KLOD dışı ekran) 5H-B tetiklenmez", r === "sohbete-devam" && d.modul === null && d.slIdx === 0);
}

// 9) Sinyal Lab AKTİFKEN (Sinyal Lab → KLOD) "soru ver" → 5H köprüsü; otomatik okuma YOK
//    (gerçek tarayıcıda bulunan hata: 5H-B yalnız modül aktif DEĞİLKEN çalışıyordu)
{
  for (const metin of ["soru ver", "Soru getir.", "BANA SORU", "bir soru sor"]) {
    const t = sandboxKur();
    t.context.__t_setAktifModul("sinyal_lab");
    const r = t.context.__probe5H(metin, fakeBody(), fakeInp());
    const kurulan = t.zamanlayicilar.length;
    t.zamanlayicilariCalistir();
    const d = t.context.__t_durum();
    kontrol(`9) modül aktifken "${metin}" → 5H köprüsü soruyu açtı, okuma zamanlayıcısı 0, ttsSpeak 0, fetch 0, bayrak kapalı`,
      r === undefined && d.soruId === Q2.id && kurulan === 0 && t.ttsCagrilari.length === 0 && t.fetchCagrilari.length === 0 && t.sandbox.window.__slSessizAcilis === false,
      `${r} ${d.soruId} z=${kurulan} tts=${t.ttsCagrilari.length}`);
  }
}

// 10) Modül aktifken KLOD'da "Sonraki soru" (5H'nin diğer ifadeleri) de okuma başlatmıyor
{
  const t = sandboxKur();
  t.context.__t_setAktifModul("sinyal_lab");
  const r = t.context.__probe5H("Sonraki soru.", fakeBody(), fakeInp());
  t.zamanlayicilariCalistir();
  kontrol("10) modül aktifken 'Sonraki soru.' → soru açıldı, ttsSpeak 0, fetch 0", r === undefined && t.context.__t_durum().soruId === Q2.id && t.ttsCagrilari.length === 0 && t.fetchCagrilari.length === 0, JSON.stringify(t.ttsCagrilari));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
