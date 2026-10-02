// SİNYAL LAB 5 ŞIK — AŞAMA 2-3: api/_sikKurallari.mjs (E şıkkı ekleme +
// parti karıştırma kuralları) ve scripts/e-sikki-ekle.mjs (parti CLI'ı) için
// deterministik testler. Gerçek veri DEĞİŞTİRİLMEZ: kural testleri sahte
// sorularla çalışır; CLI gerçek repoda yalnızca --kuru modunda çalıştırılır
// (sorular.json bayt bayt aynı kalır), yazma yolu GEÇİCİ bir kopyada denenir.

import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sikNormalize, besinciSikHatasi, soruSikHatasi, eSikkiEkle, partiyiKaristir, sikSayaci } from "../api/_sikKurallari.mjs";
import { soruDogrula } from "../api/_contentGuard.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}
function hataMetni(fn) {
  try { fn(); return null; } catch (e) { return e.message; }
}

const soru = (id, dogru_index = 1) => ({
  id, kategori: "Test", soru_en: "The verdict was by no means invalid.", soru_tr: "Ne söylenebilir?",
  secenekler_tr: ["Karar geçersiz.", "Karar geçerli.", "Yeniden yargılama.", "Kesinlikle geçersiz."],
  dogru_index, aciklama_tr: "Açıklama.", sinyal: "by no means",
});
const havuz = () => [soru("q001", 1), soru("q002", 3), soru("q003", 0)];

// ---- normalize + tek şık kuralı ----
kontrol("1) normalize: boşluk/büyük-küçük harf/sondaki noktalama farkı yok sayılır",
  sikNormalize("  KARAR   geçerli. ") === sikNormalize("karar geçerli") && sikNormalize("İSTANBUL") === "istanbul");
kontrol("2) boş / sadece boşluk / string olmayan E reddedilir",
  ["", "   ", " . ", null, undefined, 5].every((e) => besinciSikHatasi(soru("x").secenekler_tr, e) === "5. şık (E) boş olamaz"));
kontrol("3) A-D'den birinin kopyası olan E reddedilir (hangi şık olduğu söylenir)",
  besinciSikHatasi(soru("x").secenekler_tr, "  karar GEÇERLİ ") === "5. şık (E), B şıkkının kopyası olamaz");
kontrol("4) geçerli, farklı bir E kabul edilir", besinciSikHatasi(soru("x").secenekler_tr, "Mahkeme kararı erteledi.") === null);
kontrol("5) soruSikHatasi: kopyasız şıklarda hata yok; KARIŞMIŞ konumlardaki kopya ve boş şık da yakalanıyor",
  soruSikHatasi(soru("x")) === null
  && soruSikHatasi({ secenekler_tr: ["Dava düştü.", "Karar geçerli.", "Yeniden yargılama.", "dava  DÜŞTÜ", "Kesinlikle geçersiz."] }) === "A ve D şıkları aynı (birbirinin kopyası olamaz)"
  && soruSikHatasi({ secenekler_tr: ["aa", " . ", "cc", "dd"] }) === "B şıkkı boş olamaz");

// ---- parti uygulama ----
{
  const once = havuz();
  const anlik = JSON.stringify(once);
  const sonra = eSikkiEkle(once, [{ id: "q001", e: "  Mahkeme   kararı erteledi. " }, { id: "q002", e: "Dava düştü." }]);
  kontrol("6) E her zaman SONA (5. sıraya) ekleniyor, A-D sırası aynen korunuyor",
    sonra[0].secenekler_tr.length === 5 && sonra[0].secenekler_tr.slice(0, 4).join("|") === once[0].secenekler_tr.join("|") && sonra[0].secenekler_tr[4] === "Mahkeme kararı erteledi.");
  kontrol("7) dogru_index DEĞİŞMİYOR ve doğru cevap metni aynı",
    sonra[0].dogru_index === 1 && sonra[1].dogru_index === 3 && sonra[1].secenekler_tr[3] === once[1].secenekler_tr[3]);
  kontrol("8) partide olmayan soru dokunulmadan kalıyor", sonra[2] === once[2]);
  kontrol("9) girdi dizisi DEĞİŞTİRİLMİYOR (saf fonksiyon)", JSON.stringify(once) === anlik);
  kontrol("10) sayaç: 4 şıklı 1, 5 şıklı 2", JSON.stringify(sikSayaci(sonra)) === JSON.stringify({ dort: 1, bes: 2, diger: 0 }));
  kontrol("11) zaten 5 şıklı soruya ikinci E eklenmiyor",
    /zaten 5 şıklı/.test(hataMetni(() => eSikkiEkle(sonra, [{ id: "q001", e: "Başka bir şık." }])) || ""));
}
{
  const once = havuz();
  const mesaj = hataMetni(() => eSikkiEkle(once, [
    { id: "q001", e: "Geçerli yeni şık." },
    { id: "q002", e: "" },
    { id: "q003", e: "karar geçersiz" },
    { id: "q999", e: "Yok." },
    { id: "q001", e: "Tekrar." },
  ]));
  kontrol("12) partideki TÜM hatalar birlikte raporlanıyor (boş, kopya, bilinmeyen id, tekrarlı id)",
    /4 hata/.test(mesaj || "") && /q002: 5\. şık \(E\) boş/.test(mesaj) && /q003: .*A şıkkının kopyası/.test(mesaj) && /q999: havuzda/.test(mesaj) && /q001: partide birden fazla/.test(mesaj), mesaj?.split("\n")[0]);
  kontrol("13) hatalı partide HİÇBİR şey uygulanmıyor (atomik)", once.every((s) => s.secenekler_tr.length === 4));
  kontrol("14) boş parti reddediliyor", /Parti boş/.test(hataMetni(() => eSikkiEkle(once, [])) || ""));
}

// ---- _contentGuard ile tutarlılık ----
{
  const bes = eSikkiEkle(havuz(), [{ id: "q001", e: "Mahkeme kararı erteledi." }])[0];
  const kopyaE = { ...soru("q001"), secenekler_tr: [...soru("q001").secenekler_tr, "Karar Geçerli"] };
  const hatalar = (s) => (soruDogrula(s).hatalar || []).filter((h) => /şık/.test(h));
  kontrol("15) contentGuard: geçerli E'li 5 şıklı soruda şık hatası yok", hatalar(bes).length === 0, hatalar(bes).join("; "));
  kontrol("16) contentGuard: kopya E'yi aynı kuralla reddediyor", hatalar(kopyaE).some((h) => /B ve E şıkları aynı/.test(h)), hatalar(kopyaE).join("; "));
}

// ---- CLI testleri: repo'nun GEÇİCİ bir kopyasında, 4 şıklı SAHTE veriyle ----
// Gerçek havuz artık tamamen 5 şıklı (Aşama 3 bitti), bu yüzden CLI'ın başarı
// yolları gerçek veriye bağlı OLMAMALI: CLI'ın ihtiyaç duyduğu dosyalar aynı
// klasör yapısıyla tmp'ye kopyalanır; sorular.json, gerçek ilk 6 sorudan son
// çeldiricisi düşürülerek türetilmiş 4 şıklı kayıtlarla değiştirilir.
const CLI_DOSYALARI = ["scripts/e-sikki-ekle.mjs", "scripts/generate-sl-havuz.mjs", "scripts/sl-havuz-generator.mjs",
  "api/_sikKurallari.mjs", "index.html"];
function dortSikliSahteVeri() {
  const gercek = JSON.parse(readFileSync(path.join(ROOT, "api", "data", "sorular.json"), "utf-8"));
  return gercek.slice(0, 6).map((s) => {
    const dus = [...s.secenekler_tr.keys()].reverse().find((i) => i !== s.dogru_index); // doğru cevap olmayan son şık
    const secenekler_tr = s.secenekler_tr.filter((_, i) => i !== dus);
    return { ...s, secenekler_tr, dogru_index: secenekler_tr.indexOf(s.secenekler_tr[s.dogru_index]) };
  });
}
function geciciRepo(onEk) {
  const tmp = mkdtempSync(path.join(tmpdir(), onEk));
  for (const rel of CLI_DOSYALARI) {
    const hedef = path.join(tmp, rel);
    mkdirSync(path.dirname(hedef), { recursive: true });
    writeFileSync(hedef, readFileSync(path.join(ROOT, rel)));
  }
  mkdirSync(path.join(tmp, "api", "data"), { recursive: true });
  writeFileSync(path.join(tmp, "api", "data", "sorular.json"), JSON.stringify(dortSikliSahteVeri(), null, 2) + "\n");
  return tmp;
}

// ---- CLI: --kuru modu veriyi DEĞİŞTİRMİYOR + hatalı parti reddediliyor ----
{
  const tmp = geciciRepo("sa-e-sikki-");
  const cli = path.join(tmp, "scripts", "e-sikki-ekle.mjs");
  const veriYolu = path.join(tmp, "api", "data", "sorular.json");
  const htmlYolu = path.join(tmp, "index.html");
  const veriOnce = readFileSync(veriYolu);
  const htmlOnce = readFileSync(htmlYolu);
  const ilk = JSON.parse(veriOnce.toString("utf-8"))[0];
  try {
    const gecerli = path.join(tmp, "gecerli.json");
    writeFileSync(gecerli, JSON.stringify([{ id: ilk.id, e: "Bu şık testte üretilen benzersiz bir çeldiricidir." }]));
    const cikti = execFileSync(process.execPath, [cli, gecerli, "--kuru"], { encoding: "utf-8" });
    kontrol("17) CLI --kuru: geçerli parti doğrulanıyor ve sayaç yazdırılıyor", /Parti geçerli: 1 soruya E/.test(cikti) && /hiçbir dosyaya yazılmadı/.test(cikti), cikti.trim().split("\n")[0]);

    const hatali = path.join(tmp, "hatali.json");
    writeFileSync(hatali, JSON.stringify([{ id: ilk.id, e: ilk.secenekler_tr[0] }]));
    let kod = 0, hataCikti = "";
    try { execFileSync(process.execPath, [cli, hatali, "--kuru"], { encoding: "utf-8", stdio: "pipe" }); }
    catch (e) { kod = e.status; hataCikti = String(e.stderr); }
    kontrol("18) CLI: kopya E'li parti exit 1 ile reddediliyor", kod === 1 && /A şıkkının kopyası/.test(hataCikti), `exit=${kod}`);
    kontrol("19) CLI --kuru ve reddedilen parti sonrası sorular.json ve index.html bayt bayt AYNI",
      readFileSync(veriYolu).equals(veriOnce) && readFileSync(htmlYolu).equals(htmlOnce));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
{
  // Gerçek repoda: zaten 5 şıklı soruya E eklemeye çalışan parti (--kuru OLMADAN) yazmadan reddediliyor
  const veriYolu = path.join(ROOT, "api", "data", "sorular.json");
  const htmlYolu = path.join(ROOT, "index.html");
  const veriOnce = readFileSync(veriYolu);
  const htmlOnce = readFileSync(htmlYolu);
  const besSikli = JSON.parse(veriOnce.toString("utf-8")).find((s) => s.secenekler_tr.length === 5);
  if (besSikli) {
    const tmp = mkdtempSync(path.join(tmpdir(), "sa-e-sikki-gercek-"));
    try {
      const parti = path.join(tmp, "parti.json");
      writeFileSync(parti, JSON.stringify([{ id: besSikli.id, e: "Bu şık testte üretilen benzersiz bir çeldiricidir." }]));
      let kod = 0, hataCikti = "";
      try { execFileSync(process.execPath, [path.join(ROOT, "scripts", "e-sikki-ekle.mjs"), parti], { encoding: "utf-8", stdio: "pipe" }); }
      catch (e) { kod = e.status; hataCikti = String(e.stderr); }
      kontrol("19b) gerçek repo: 5 şıklı soruya E eklenmiyor (exit 1), sorular.json ve index.html bayt bayt AYNI",
        kod === 1 && /zaten 5 şıklı/.test(hataCikti) && readFileSync(veriYolu).equals(veriOnce) && readFileSync(htmlYolu).equals(htmlOnce), `exit=${kod}`);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
}

// ---- CLI: GERÇEK yazma yolu — repo'nun GEÇİCİ bir kopyasında (4 şıklı sahte veri) ----
{
  const tmp = geciciRepo("sa-e-sikki-yaz-");
  try {
    const veriOnce = JSON.parse(readFileSync(path.join(tmp, "api/data/sorular.json"), "utf-8"));
    const hedefler = veriOnce.filter((s) => s.secenekler_tr.length === 4).slice(0, 2);
    const parti = path.join(tmp, "parti.json");
    const eMetni = (s) => `Test çeldiricisi ${s.id} için benzersiz metin.`;
    writeFileSync(parti, JSON.stringify(hedefler.map((s) => ({ id: s.id, e: eMetni(s) }))));
    execFileSync(process.execPath, [path.join(tmp, "scripts/e-sikki-ekle.mjs"), parti], { encoding: "utf-8", stdio: "pipe" });

    const veriSonra = JSON.parse(readFileSync(path.join(tmp, "api/data/sorular.json"), "utf-8"));
    const dogru = hedefler.every((h) => {
      const s = veriSonra.find((x) => x.id === h.id);
      return s.secenekler_tr.length === 5
        && [...s.secenekler_tr].sort().join("|") === [...h.secenekler_tr, eMetni(h)].sort().join("|")
        && s.secenekler_tr[s.dogru_index] === h.secenekler_tr[h.dogru_index];
    });
    kontrol("20) CLI yazma: E eklendi, parti karıştırıldı; şıklar = eski 4 + E, doğru cevap METNİ aynı", dogru);
    const digerleri = veriSonra.filter((s) => !hedefler.some((h) => h.id === s.id));
    kontrol("21) CLI yazma: partide olmayan sorular değişmedi",
      JSON.stringify(digerleri) === JSON.stringify(veriOnce.filter((s) => !hedefler.some((h) => h.id === s.id))));
    const html = readFileSync(path.join(tmp, "index.html"), "utf-8");
    kontrol("22) CLI yazma: SL_HAVUZ mirror'ı otomatik yeniden üretildi (E metni index.html'de)",
      hedefler.every((h) => html.includes(eMetni(h))));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// ---- partiyiKaristir ----
{
  // 10 soruluk 5 şıklı sahte parti + parti dışı 4 şıklı sorular
  const besSik = (id, d) => ({ ...soru(id, d), secenekler_tr: [`${id}-a`, `${id}-b`, `${id}-c`, `${id}-d`, `${id}-e`] });
  const ids = Array.from({ length: 10 }, (_, i) => `p${String(i).padStart(2, "0")}`);
  const once = [...ids.map((id) => besSik(id, 4)), soru("q900", 0), soru("q901", 0)];
  const anlik = JSON.stringify(once);
  const sonra = partiyiKaristir(once, ids);
  const tekrar = partiyiKaristir(once, ids);
  kontrol("23) aynı girdi + aynı parti → aynı sonuç (tohumlu, deterministik)", JSON.stringify(sonra) === JSON.stringify(tekrar));
  kontrol("24) girdi DEĞİŞTİRİLMİYOR, parti dışı sorular aynı nesne", JSON.stringify(once) === anlik && sonra[10] === once[10] && sonra[11] === once[11]);
  kontrol("25) her soruda şık kümesi ve doğru cevap METNİ korunuyor",
    once.slice(0, 10).every((o, i) => [...sonra[i].secenekler_tr].sort().join("|") === [...o.secenekler_tr].sort().join("|")
      && sonra[i].secenekler_tr[sonra[i].dogru_index] === o.secenekler_tr[o.dogru_index]));
  const dagilim = [0, 0, 0, 0, 0];
  sonra.slice(0, 10).forEach((s) => dagilim[s.dogru_index]++);
  kontrol("26) 10 soru → doğru cevaplar A-E'ye tam dengeli (2/2/2/2/2), hepsi E iken bile", dagilim.join("/") === "2/2/2/2/2", dagilim.join("/"));
  const baska = partiyiKaristir(once, ids.slice(0, 9));
  kontrol("27) farklı parti → farklı desen (tohum id listesinden türetiliyor)",
    JSON.stringify(baska.slice(0, 9).map((s) => s.dogru_index)) !== JSON.stringify(sonra.slice(0, 9).map((s) => s.dogru_index)));
}
{
  // Artan soru(lar), havuzun geri kalanında en az doğru cevap olan harfe gidiyor
  const besSik = (id) => ({ ...soru(id, 0), secenekler_tr: [`${id}-a`, `${id}-b`, `${id}-c`, `${id}-d`, `${id}-e`] });
  const disari = [0, 0, 1, 1, 2, 2, 3, 3].map((d, i) => ({ ...besSik(`x${i}`), dogru_index: d })); // E hiç yok
  const sonra = partiyiKaristir([...disari, besSik("y0")], ["y0"]);
  kontrol("28) tek soruluk parti: artan soru havuzda en az kullanılan harfe (E) gidiyor", sonra[8].dogru_index === 4, `→ ${"ABCDE"[sonra[8].dogru_index]}`);
  kontrol("29) şık sayısı karışık parti reddediliyor",
    /şık sayısı aynı/.test(hataMetni(() => partiyiKaristir([besSik("z0"), soru("z1")], ["z0", "z1"])) || ""));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
