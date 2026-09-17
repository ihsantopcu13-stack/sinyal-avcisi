// AVCI ÖĞRENME HAFIZASI — FAZ 1 ÇEKİRDEK testleri.
// Diğer answer-history-*.test.mjs dosyalarıyla AYNI desen: index.html'den
// avciZayifAlanliHesapla/avciZayifAlanlarimHTML/avciZayifAlanlarimBosState/
// avciZayifAlanlarimRender kaynağı BİREBİR çıkarılıp Node'un `vm` modülüyle
// GERÇEKTEN ÇALIŞTIRILIYOR — sahte yeniden-yazım DEĞİL. Gerçek Supabase'e
// hiç bağlanılmaz.

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

const html = readFileSync(path.join(ROOT, "index.html"), "utf-8");

// ---- STATİK: tanımlar tek, dtab hook'u ve konteyner mevcut ----
{
  const sayimlar = {
    "function avciZayifAlanlariHesapla\\(satirlar\\)": (html.match(/function avciZayifAlanlariHesapla\(satirlar\)/g) || []).length,
    "function avciZayifEtiketBicimlendir\\(s\\)": (html.match(/function avciZayifEtiketBicimlendir\(s\)/g) || []).length,
    "function avciZayifAlanlarimBosState\\(\\)": (html.match(/function avciZayifAlanlarimBosState\(\)/g) || []).length,
    "function avciZayifAlanlarimHTML\\(gruplar\\)": (html.match(/function avciZayifAlanlarimHTML\(gruplar\)/g) || []).length,
    "async function avciZayifAlanlarimRender\\(\\)": (html.match(/async function avciZayifAlanlarimRender\(\)/g) || []).length,
  };
  kontrol("1) tüm yeni fonksiyonlar index.html'de TAM OLARAK 1 kez tanımlı (duplicate YOK)", Object.values(sayimlar).every((n) => n === 1), JSON.stringify(sayimlar));
  kontrol("2) id=\"avci-zayif-alanlarim\" konteyneri mod-avci içinde mevcut", /id="avci-zayif-alanlarim"/.test(html));
  kontrol("3) dtab() 'avci' dalı artık render fonksiyonunu çağırıyor (eski boş {} DEĞİL)", /if\(mod=='avci'\)avciZayifAlanlarimRender\(\);/.test(html));
  kontrol("4) sadece 4 GEREKLİ kolon seçiliyor (select('*') DEĞİL — performans şartı)", /\.select\('signal,topic,is_correct,answered_at'\)/.test(html));
  kontrol("5) sorgu sınırlı (tüm tabloyu çekmiyor)", /\.limit\(500\)/.test(html));
  kontrol("6) service_role/service role KULLANILMIYOR (sadece mevcut sb client)", !/service_role/i.test(html.slice(html.indexOf("AVCI ÖĞRENME HAFIZASI"), html.indexOf("function hataCountGuncelle"))));
}

// ---- Kaynağı BİREBİR çıkar ----
const startMarker = "function avciZayifAlanlariHesapla(satirlar){";
const endMarker = "function hataCountGuncelle(){";
const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker, startIdx);
if (startIdx === -1 || endIdx === -1) {
  console.log("[FAIL] 0) kaynak çıkarma başarısız");
  console.log(`\nTOPLAM: 1 test, 1 başarısız.`);
  process.exit(1);
}
const gercekKaynak = html.slice(startIdx, endIdx);

function sandboxKur() {
  const warnCagrilari = [];
  const selectCagrilari = [];
  let selectSonucu = { data: [], error: null };
  let selectImpl = null;

  const sandbox = {
    console: { warn: (...a) => warnCagrilari.push(a), log: () => {}, error: () => {} },
    document: {
      getElementById: (id) => (id === "avci-zayif-alanlarim" ? sandbox.__el : null),
    },
    _hgEscape: (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
    __el: { innerHTML: "" },
    sb: undefined,
    currentUser: null,
  };
  sandbox.sb = {
    from: (tablo) => ({
      select: (kolonlar) => ({
        order: (kolon, opts) => ({
          limit: async (n) => {
            selectCagrilari.push({ tablo, kolonlar, kolon, opts, n });
            if (selectImpl) return selectImpl();
            return selectSonucu;
          },
        }),
      }),
    }),
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(gercekKaynak, context, { filename: "index.html (extracted, avci-zayif-alanlarim)" });

  return {
    context,
    warnCagrilari,
    selectCagrilari,
    setSelectSonucu: (v) => {
      selectSonucu = v;
    },
    setSelectImpl: (fn) => {
      selectImpl = fn;
    },
    elIcerik: () => sandbox.__el.innerHTML,
  };
}

// ---- PURE FONKSİYON: avciZayifAlanliHesapla — deterministik skor ----
{
  const t = sandboxKur();
  const bosSonuc = t.context.avciZayifAlanliHesapla ? t.context.avciZayifAlanliHesapla([]) : t.context.avciZayifAlanlariHesapla([]);
  kontrol("7) boş veri → boş dizi (uydurma YOK)", Array.isArray(bosSonuc) && bosSonuc.length === 0);
}
{
  const t = sandboxKur();
  const simdi = Date.now();
  const satirlar = [
    // "despite": 5 cevap, 3 yanlış, son yanlış 1 gün önce → Yüksek beklenir
    { signal: "despite", topic: null, is_correct: false, answered_at: new Date(simdi - 1 * 86400000).toISOString() },
    { signal: "despite", topic: null, is_correct: false, answered_at: new Date(simdi - 2 * 86400000).toISOString() },
    { signal: "despite", topic: null, is_correct: false, answered_at: new Date(simdi - 3 * 86400000).toISOString() },
    { signal: "despite", topic: null, is_correct: true, answered_at: new Date(simdi - 4 * 86400000).toISOString() },
    { signal: "despite", topic: null, is_correct: true, answered_at: new Date(simdi - 5 * 86400000).toISOString() },
    // "relative clauses": 6 cevap, 1 yanlış, 60 gün önce → Düşük beklenir
    { signal: "relative clauses", topic: null, is_correct: false, answered_at: new Date(simdi - 60 * 86400000).toISOString() },
    { signal: "relative clauses", topic: null, is_correct: true, answered_at: new Date(simdi - 61 * 86400000).toISOString() },
    { signal: "relative clauses", topic: null, is_correct: true, answered_at: new Date(simdi - 62 * 86400000).toISOString() },
    { signal: "relative clauses", topic: null, is_correct: true, answered_at: new Date(simdi - 63 * 86400000).toISOString() },
    { signal: "relative clauses", topic: null, is_correct: true, answered_at: new Date(simdi - 64 * 86400000).toISOString() },
    { signal: "relative clauses", topic: null, is_correct: true, answered_at: new Date(simdi - 65 * 86400000).toISOString() },
    // tek cevap — 2 eşiğinin altında, listeye GİRMEMELİ
    { signal: "unless", topic: null, is_correct: false, answered_at: new Date(simdi).toISOString() },
    // signal yok, topic var (diğer 4 modül deseni) — topic'e düşmeli
    { signal: null, topic: "kelime", is_correct: false, answered_at: new Date(simdi).toISOString() },
    { signal: null, topic: "kelime", is_correct: false, answered_at: new Date(simdi).toISOString() },
    // hem signal hem topic yok — atlanmalı (uydurma yapılmamalı)
    { signal: null, topic: null, is_correct: false, answered_at: new Date(simdi).toISOString() },
  ];
  const sonuc = t.context.avciZayifAlanliHesapla ? t.context.avciZayifAlanliHesapla(satirlar) : t.context.avciZayifAlanlariHesapla(satirlar);

  kontrol("8) tek cevaplı grup (unless) SONUÇTA YOK (toplam>=2 eşiği)", !sonuc.some((g) => g.anahtar === "unless"));
  kontrol("9) signal/topic'i olmayan satır SESSİZCE atlandı (crash yok, uydurma yok)", sonuc.length > 0);
  const despite = sonuc.find((g) => g.anahtar === "despite");
  kontrol("10) despite grubu doğru sayılıyor: 5 cevap, 3 yanlış", despite && despite.toplam === 5 && despite.yanlis === 3);
  kontrol("11) yakın zamanlı + yüksek yanlış oranı → seviye Yüksek", despite && despite.seviye === "Yüksek");
  const relative = sonuc.find((g) => g.anahtar === "relative clauses");
  kontrol("12) relative clauses grubu doğru sayılıyor: 6 cevap, 1 yanlış", relative && relative.toplam === 6 && relative.yanlis === 1);
  kontrol("13) düşük yanlış oranı + eski hata → seviye Düşük", relative && relative.seviye === "Düşük");
  const kelime = sonuc.find((g) => g.anahtar === "kelime");
  kontrol("14) signal yokken topic'e düşüyor (kelime modülü örneği)", kelime && kelime.toplam === 2 && kelime.yanlis === 2);
  kontrol("15) sonuç skora göre AZALAN sıralı (en zayıf ilk)", sonuc.every((g, i) => i === 0 || sonuc[i - 1].skor >= g.skor));
  kontrol("16) en fazla 5 grup döndürülüyor (UI'ı taşırmıyor)", sonuc.length <= 5);
}

// ---- avciZayifEtiketBicimlendir — büyük harf biçimlendirme ----
{
  const t = sandboxKur();
  kontrol("17) tek kelime doğru büyütülüyor", t.context.avciZayifEtiketBicimlendir("despite") === "Despite");
  kontrol("18) çok kelimeli doğru büyütülüyor", t.context.avciZayifEtiketBicimlendir("modal perfect") === "Modal Perfect");
}

// ---- RENDER: sb/currentUser yok → boş-durum, SORGU HİÇ ATILMIYOR ----
{
  const t = sandboxKur();
  t.context.sb = undefined;
  t.context.currentUser = null;
  await t.context.avciZayifAlanlarimRender();
  kontrol("19) sb yokken sorgu HİÇ atılmıyor", t.selectCagrilari.length === 0);
  kontrol("20) sb yokken boş-durum mesajı gösteriliyor", /Henüz yeterli cevap yok/.test(t.elIcerik()));
}

// ---- RENDER: sb+currentUser var, 0 KAYIT → empty-state (hata değil) ----
{
  const t = sandboxKur();
  t.context.currentUser = { id: "user-1" };
  t.setSelectSonucu({ data: [], error: null });
  await t.context.avciZayifAlanlarimRender();
  kontrol("21) 0 kayıtla HATA VERMİYOR, empty-state gösteriyor", /Henüz yeterli cevap yok/.test(t.elIcerik()));
  kontrol("22) SADECE 4 kolon istendi (signal,topic,is_correct,answered_at)", t.selectCagrilari[0]?.kolonlar === "signal,topic,is_correct,answered_at");
  kontrol("23) limit(500) uygulanmış (tüm tablo çekilmiyor)", t.selectCagrilari[0]?.n === 500);
}

// ---- RENDER: gerçek veriyle doğru/yanlış sayıları ve HTML doğru üretiliyor ----
{
  const t = sandboxKur();
  t.context.currentUser = { id: "user-2" };
  const simdi = Date.now();
  t.setSelectSonucu({
    data: [
      { signal: "although", topic: null, is_correct: false, answered_at: new Date(simdi).toISOString() },
      { signal: "although", topic: null, is_correct: false, answered_at: new Date(simdi).toISOString() },
      { signal: "although", topic: null, is_correct: true, answered_at: new Date(simdi).toISOString() },
    ],
    error: null,
  });
  await t.context.avciZayifAlanlarimRender();
  const icerik = t.elIcerik();
  kontrol("24) render sonrası ZAYIF ALANLARIM başlığı görünüyor", /ZAYIF ALANLARIM/.test(icerik));
  kontrol("25) doğru etiket + doğru/yanlış sayısı HTML'de yer alıyor", /Although/.test(icerik) && /3 cevap/.test(icerik) && /2 yanlış/.test(icerik));
}

// ---- RENDER: sorgu hata döndürüyor → empty-state + SADECE güvenli alanlar loglanıyor ----
{
  const t = sandboxKur();
  t.context.currentUser = { id: "user-3" };
  t.setSelectSonucu({ data: null, error: { code: "PGRST301", status: 401, message: "JWT expired" } });
  await t.context.avciZayifAlanlarimRender();
  kontrol("26) sorgu hatasında empty-state gösteriliyor (panel BOZULMUYOR)", /Henüz yeterli cevap yok/.test(t.elIcerik()));
  const w = t.warnCagrilari.find((a) => a[0] === "[avci-zayif-alan] yükleme atlandı:");
  kontrol("27) SADECE code/status/reason loglanıyor", w && w[1]?.code === "PGRST301" && w[1]?.status === 401 && w[1]?.reason === "JWT expired");
  kontrol("28) loglanan objede sadece 3 güvenli alan var", w && Object.keys(w[1]).sort().join(",") === "code,reason,status");
}

// ---- RENDER: sorgu EXCEPTION fırlatıyor (network) → panel bozulmaz ----
{
  const t = sandboxKur();
  t.context.currentUser = { id: "user-4" };
  t.setSelectImpl(async () => {
    throw new Error("simulated network failure");
  });
  let firlatilanHata = null;
  try {
    await t.context.avciZayifAlanlarimRender();
  } catch (e) {
    firlatilanHata = e;
  }
  kontrol("29) network hatası dışarı FIRLAMIYOR", firlatilanHata === null);
  kontrol("30) exception'da da empty-state gösteriliyor", /Henüz yeterli cevap yok/.test(t.elIcerik()));
  const w = t.warnCagrilari.find((a) => a[0] === "[avci-zayif-alan] yükleme atlandı:");
  kontrol("31) güvenli, tanımlı bir mesajla loglandı", w && w[1]?.reason === "unexpected error");
}

// ---- SECRET SCAN — bu bloktaki hiçbir warn çağrısında token/session/email/id yok ----
{
  const t = sandboxKur();
  t.context.currentUser = { id: "user-5" };
  t.setSelectSonucu({ data: null, error: { code: "x", status: 500, message: "generic failure" } });
  await t.context.avciZayifAlanlarimRender();
  const tumWarnMetni = JSON.stringify(t.warnCagrilari);
  kontrol("32) hiçbir warn çağrısında access_token/refresh_token/email/user id alan adı yok", !/access_token|refresh_token|"email"|"id":|currentUser\.id/.test(tumWarnMetni));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
