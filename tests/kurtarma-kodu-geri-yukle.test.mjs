// Kurtarma kodu ile geri yükleme: üzerine yazmaz, birleştirir; başlamadan yedek alır,
// hata olursa yedekten döner; boş/yanlış biçim/404/429/ağ hatasında yerel veri değişmez.
// Düğme yalnız İstatistiklerim ekranında. Ağ çağrısı yok: index.html'deki fonksiyonlar
// node:vm içinde sahte localStorage ve fetch ile çalıştırılır.

import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.join(__dirname, "..", "index.html"), "utf-8");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const bas = html.indexOf("const GY_YEDEK_KEY");
const son = html.indexOf("\n// Günlük sync", bas);
const kaynak = bas > -1 && son > bas ? html.slice(bas, son) : "";
kontrol("geri yükleme kaynağı bulundu", kaynak.includes("async function kurtarmaIleGeriYukle"));

function ortamKur(baslangic, fetchCevap, { bozukAnahtar } = {}) {
  const depo = new Map(Object.entries(baslangic));
  const istekler = [];
  const localStorage = {
    getItem: (k) => (depo.has(k) ? depo.get(k) : null),
    setItem: (k, v) => {
      if (bozukAnahtar && k === bozukAnahtar) throw new Error("QuotaExceededError");
      depo.set(k, String(v));
    },
    removeItem: (k) => depo.delete(k),
  };
  const fetch = async (url) => {
    istekler.push(url);
    if (fetchCevap === "ag") throw new TypeError("Failed to fetch");
    const { status, body } = fetchCevap;
    return { status, ok: status >= 200 && status < 300, json: async () => body };
  };
  const ctx = { localStorage, fetch, URLSearchParams, encodeURIComponent, Date, JSON, Math, Number, String, Array, Object, isNaN };
  vm.createContext(ctx);
  vm.runInContext(`const AP_KEY='sa_anon_id';const APC_KEY='sa_recovery_code';\n${kaynak}\n;globalThis.__geri=kurtarmaIleGeriYukle;`, ctx);
  return { ctx, depo, istekler, json: (k) => JSON.parse(depo.get(k)) };
}

const YEREL = {
  sa_xp: JSON.stringify({ toplam: 500, bugun: 40, hafta: 120, son: "2026-11-14" }),
  sa_streak: JSON.stringify({ son: "Sat Nov 14 2026", streak: 3, enUzun: 9, bugunCalistiMi: true, toplamSoru: 211, toplamYanlis: 40, modalDogru: 5, kusursuzTur: 2, kazanilanRozetler: ["ilk_gun", "uc_gun"], buHaftaSoru: 30 }),
  sa_hatalar: JSON.stringify([{ id: 1, soru: "A", verilenCevap: "x", dogruCevap: "y" }, { id: 2, soru: "B", verilenCevap: "x", dogruCevap: "y" }]),
  sa_yanlis_defteri: JSON.stringify({ kayitlar: { q1: { adim: 1 } } }),
  sa_anon_id: "yerel-anon",
  sa_recovery_code: "AVCI-YERE-L111",
};
const PROFIL = (ek = {}) => ({ status: 200, body: { found: true, profile: Object.assign({ anon_id: "eski-anon", recovery_code: "AVCI-ESK1-KOD2", xp: 200, streak: 7, streak_last: "2026-11-13", hatalar: [{ id: 9, soru: "B", verilenCevap: "z" }, { id: 10, soru: "C", verilenCevap: "z" }] }, ek) } });

// (1) Bu cihazda XP daha yüksek → korunuyor; bugün/hafta sayaçları bozulmuyor
{
  const o = ortamKur(YEREL, PROFIL());
  const r = await o.ctx.__geri("avci-esk1-kod2");
  const xp = o.json("sa_xp");
  kontrol("1a) sonuç ok, küçük harf/boşluk normalize", r.durum === "ok" && o.istekler[0].includes("recovery=AVCI-ESK1-KOD2"), r.durum);
  kontrol("1b) yerel XP (500) sunucudan (200) yüksek → 500 korunuyor", xp.toplam === 500, JSON.stringify(xp));
  kontrol("1c) bugün/hafta XP sayaçları korunuyor", xp.bugun === 40 && xp.hafta === 120);
}
{
  const o = ortamKur(YEREL, PROFIL({ xp: 900 }));
  await o.ctx.__geri("AVCI-ESK1-KOD2");
  kontrol("1d) sunucu XP (900) yüksekse 900'e çıkıyor", o.json("sa_xp").toplam === 900);
}

// (2) Seri sıfırlanmıyor, rozetler ve toplam soru bozulmuyor
{
  const o = ortamKur(YEREL, PROFIL());
  await o.ctx.__geri("AVCI-ESK1-KOD2");
  const st = o.json("sa_streak");
  kontrol("2a) sa_streak biçimi korunuyor (son/streak/enUzun; eski {gun,sonGun} yok)", "son" in st && "streak" in st && !("gun" in st) && !("sonGun" in st), JSON.stringify(st));
  kontrol("2b) sunucu serisi (7) yerelden (3) büyük → 7, son gün streak_last'ten", st.streak === 7 && st.son === new Date("2026-11-13T00:00:00").toDateString(), `${st.streak} ${st.son}`);
  kontrol("2c) enUzun büyük olan (9) korunuyor", st.enUzun === 9);
  kontrol("2d) rozetler, toplam soru/yanlış ve diğer alanlar aynen", JSON.stringify(st.kazanilanRozetler) === '["ilk_gun","uc_gun"]' && st.toplamSoru === 211 && st.toplamYanlis === 40 && st.modalDogru === 5 && st.kusursuzTur === 2 && st.buHaftaSoru === 30);
}
{
  const o = ortamKur(YEREL, PROFIL({ streak: 1 }));
  await o.ctx.__geri("AVCI-ESK1-KOD2");
  const st = o.json("sa_streak");
  kontrol("2e) yerel seri (3) büyükse seri ve son gün değişmiyor", st.streak === 3 && st.son === "Sat Nov 14 2026");
}
{
  const bos = Object.assign({}, YEREL); delete bos.sa_streak; delete bos.sa_xp; delete bos.sa_hatalar;
  const o = ortamKur(bos, PROFIL());
  await o.ctx.__geri("AVCI-ESK1-KOD2");
  const st = o.json("sa_streak");
  kontrol("2f) yerelde seri yoksa uygulamanın varsayılan biçimiyle kuruluyor", st.streak === 7 && Array.isArray(st.kazanilanRozetler) && st.toplamSoru === 0 && st.enUzun === 7 && o.json("sa_xp").toplam === 200);
}

// (3) Hata listesi tekrarsız birleşiyor
{
  const o = ortamKur(YEREL, PROFIL());
  await o.ctx.__geri("AVCI-ESK1-KOD2");
  const h = o.json("sa_hatalar");
  kontrol("3a) A, B (yerel) + C (sunucu); B tekrar etmiyor, yerel B kaydı korunuyor", JSON.stringify(h.map((x) => x.soru)) === '["A","B","C"]' && h[1].id === 2, JSON.stringify(h.map((x) => x.soru)));
  kontrol("3b) sa_yanlis_defteri'ne dokunulmuyor", o.depo.get("sa_yanlis_defteri") === YEREL.sa_yanlis_defteri);
  kontrol("3c) kimlik ve kod eski profile geçiyor", o.depo.get("sa_anon_id") === "eski-anon" && o.depo.get("sa_recovery_code") === "AVCI-ESK1-KOD2");
  const y = o.json("sa_geri_yukleme_yedek");
  kontrol("3d) başlamadan önce 6 anahtarın yedeği alındı", Object.keys(y.degerler).sort().join(",") === "sa_anon_id,sa_hatalar,sa_recovery_code,sa_streak,sa_xp,sa_yanlis_defteri" && y.degerler.sa_xp === YEREL.sa_xp && y.degerler.sa_recovery_code === "AVCI-YERE-L111");
}

// (4) Boş, yanlış biçim, 404, 429, ağ hatası → yerel veri değişmiyor
const ayni = (o) => Object.keys(YEREL).every((k) => o.depo.get(k) === YEREL[k]) && !o.depo.has("sa_geri_yukleme_yedek");
for (const [ad, kod, cevap, beklenen, istekVar] of [
  ["boş", "", PROFIL(), "bicim", false],
  ["yalnız boşluk", "   ", PROFIL(), "bicim", false],
  ["yanlış biçim", "ABC-123", PROFIL(), "bicim", false],
  ["404 bulunamadı", "AVCI-AAAA-BBBB", { status: 404, body: { found: false } }, "bulunamadi", true],
  ["429 çok fazla", "AVCI-AAAA-BBBB", { status: 429, body: { error: "x" } }, "cok_fazla", true],
  ["500 sunucu hatası", "AVCI-AAAA-BBBB", { status: 500, body: {} }, "hata", true],
  ["ağ hatası", "AVCI-AAAA-BBBB", "ag", "ag", true],
]) {
  const o = ortamKur(YEREL, cevap);
  const r = await o.ctx.__geri(kod);
  kontrol(`4) ${ad}: durum=${beklenen}, yerel veri ve yedek değişmedi`, r.durum === beklenen && ayni(o) && (o.istekler.length > 0) === istekVar, `${r.durum} istek=${o.istekler.length}`);
}

// Bir adım hata verirse yedekten dönülüyor (ör. sa_hatalar yazımı kota hatası)
{
  const o = ortamKur(YEREL, PROFIL({ xp: 900, streak: 20 }), { bozukAnahtar: "sa_hatalar" });
  const r = await o.ctx.__geri("AVCI-ESK1-KOD2");
  kontrol("5) yazım hatasında durum=hata ve XP/seri/kimlik yedekten geri döndü", r.durum === "hata" && Object.keys(YEREL).every((k) => o.depo.get(k) === YEREL[k]), r.durum);
}

// Arayüz: düğme yalnız İstatistiklerim ekranında; onay ve mesajlar
{
  const ist = (html.match(/<div class="dmod" id="mod-istatistik"[\s\S]*?\n        <\/div>\n/) || [""])[0];
  kontrol("6a) 'Başka cihazdaki ilerlemeni getir' düğmesi İstatistiklerim ekranında", /id="kurtarma-geri-yukle-btn" onclick="kurtarmaKoduGir\(\)"/.test(ist));
  kontrol("6b) kurtarmaKoduGir başka hiçbir düğme/bağlantıya bağlı değil", (html.match(/onclick="kurtarmaKoduGir\(\)"/g) || []).length === 1);
  const gir = html.slice(html.indexOf("window.kurtarmaKoduGir"), html.indexOf("// Kurtarma kodunu tekrar göster"));
  kontrol("6c) ilerleme varsa birleştirme onayı soruluyor", /ilerlemeVar\(\)\)\{\s*\n\s*const onay = confirm\(`Bu cihazdaki ilerleme, koddaki ilerlemeyle birleştirilecek; XP ve seride büyük olan kalır\. Bu cihazın kurtarma kodu/.test(gir));
  kontrol("6d) her hata durumunun ayrı mesajı var ve 'ilerlemen değişmedi' diyor", ["bicim", "bulunamadi", "cok_fazla", "ag", "hata"].every((d) => new RegExp(`${d}: '[^']*Bu cihazdaki ilerlemen değişmedi\\.'`).test(gir)));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
