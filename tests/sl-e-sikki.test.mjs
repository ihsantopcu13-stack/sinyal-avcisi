// SİNYAL LAB 5 ŞIK — AŞAMA 2: api/_sikKurallari.mjs (E şıkkı ekleme kuralları)
// ve scripts/e-sikki-ekle.mjs (parti CLI'ı) için deterministik testler.
// Gerçek veri DEĞİŞTİRİLMEZ: kural testleri sahte sorularla çalışır; CLI
// yalnızca --kuru (sadece doğrula) modunda çalıştırılır ve sorular.json'ın
// bayt bayt aynı kaldığı doğrulanır.

import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sikNormalize, besinciSikHatasi, soruBesinciSikHatasi, eSikkiEkle, sikSayaci } from "../api/_sikKurallari.mjs";
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
kontrol("5) soruBesinciSikHatasi: 4 şıklı soruda kontrol yok (null)", soruBesinciSikHatasi(soru("x")) === null);

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
  const hatalar = (s) => (soruDogrula(s).hatalar || []).filter((h) => /5\. şık/.test(h));
  kontrol("15) contentGuard: geçerli E'li 5 şıklı soruda 5. şık hatası yok", hatalar(bes).length === 0);
  kontrol("16) contentGuard: kopya E'yi aynı kuralla reddediyor", hatalar(kopyaE).some((h) => /B şıkkının kopyası/.test(h)), hatalar(kopyaE).join("; "));
}

// ---- CLI: --kuru modu veriyi DEĞİŞTİRMİYOR ----
{
  const veriYolu = path.join(ROOT, "api", "data", "sorular.json");
  const htmlYolu = path.join(ROOT, "index.html");
  const veriOnce = readFileSync(veriYolu);
  const htmlOnce = readFileSync(htmlYolu);
  const ilk = JSON.parse(veriOnce.toString("utf-8")).find((s) => s.secenekler_tr.length === 4);
  const tmp = mkdtempSync(path.join(tmpdir(), "sa-e-sikki-"));
  const cli = path.join(ROOT, "scripts", "e-sikki-ekle.mjs");
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
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  kontrol("19) CLI çalıştırmalarından sonra sorular.json ve index.html bayt bayt AYNI",
    readFileSync(veriYolu).equals(veriOnce) && readFileSync(htmlYolu).equals(htmlOnce));
}

// ---- CLI: GERÇEK yazma yolu — repo'nun GEÇİCİ bir kopyasında ----
// (gerçek repo dosyalarına dokunmadan: CLI'ın ihtiyaç duyduğu dosyalar aynı
// klasör yapısıyla tmp'ye kopyalanır, CLI orada çalıştırılır.)
{
  const tmp = mkdtempSync(path.join(tmpdir(), "sa-e-sikki-yaz-"));
  const kopyala = (rel) => {
    const hedef = path.join(tmp, rel);
    mkdirSync(path.dirname(hedef), { recursive: true });
    writeFileSync(hedef, readFileSync(path.join(ROOT, rel)));
  };
  try {
    ["scripts/e-sikki-ekle.mjs", "scripts/generate-sl-havuz.mjs", "scripts/sl-havuz-generator.mjs",
      "api/_sikKurallari.mjs", "api/data/sorular.json", "index.html"].forEach(kopyala);
    const veriOnce = JSON.parse(readFileSync(path.join(tmp, "api/data/sorular.json"), "utf-8"));
    const hedefler = veriOnce.filter((s) => s.secenekler_tr.length === 4).slice(0, 2);
    const parti = path.join(tmp, "parti.json");
    const eMetni = (s) => `Test çeldiricisi ${s.id} için benzersiz metin.`;
    writeFileSync(parti, JSON.stringify(hedefler.map((s) => ({ id: s.id, e: eMetni(s) }))));
    execFileSync(process.execPath, [path.join(tmp, "scripts/e-sikki-ekle.mjs"), parti], { encoding: "utf-8", stdio: "pipe" });

    const veriSonra = JSON.parse(readFileSync(path.join(tmp, "api/data/sorular.json"), "utf-8"));
    const dogru = hedefler.every((h) => {
      const s = veriSonra.find((x) => x.id === h.id);
      return s.secenekler_tr.length === 5 && s.secenekler_tr[4] === eMetni(h) && s.dogru_index === h.dogru_index
        && s.secenekler_tr.slice(0, 4).join("|") === h.secenekler_tr.join("|");
    });
    kontrol("20) CLI yazma: E sona eklendi, A-D ve dogru_index aynen kaldı", dogru);
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

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
