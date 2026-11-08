// İlerleme Özetim (/sinyal-soru): cevap kaydı, başarı yüzdesi, en çok takılınan
// 3 sinyal kelime ve sayfa bağlantısı. Ağ çağrısı yok.
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let toplam = 0, basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++; if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const ctx = { Set };
vm.createContext(ctx);
for (const f of ["assets/modules/sinyal-soru.js", "assets/modules/sinyal-istatistik.js"]) vm.runInContext(readFileSync(path.join(ROOT, f), "utf-8"), ctx);
const S = ctx.SinyalSoru, I = ctx.SinyalIstatistik;
kontrol("modül dışa verilir", !!I && typeof I.baslat === "function" && typeof I.ozet === "function");

const bos = I.ozet([]);
kontrol("boş veri: 0 soru, %0, liste boş", bos.toplam === 0 && bos.yuzde === 0 && bos.takildigin.length === 0);

let l = [];
const ekle = (kelime, tur, dogru) => { l = I.kaydet(l, { id: "ss001", kelime, tur, dogru }); };
ekle("Although", "zitlik", false); ekle("although", "zitlik", false); ekle("Although", "zitlik", true);
ekle("unless", "kosul", false); ekle("unless", "kosul", false);
ekle("due to", "sebep", false);
ekle("moreover", "ekleme", false);
ekle("Since", "zaman", true);
const o = I.ozet(l);
kontrol("toplam çözülen", o.toplam === 8, o.toplam);
kontrol("başarı yüzdesi yuvarlanır", o.yuzde === 25 && o.dogru === 2, o.yuzde);
kontrol("en fazla 3 kelime", o.takildigin.length === 3);
kontrol("büyük/küçük harf birleşir, en çok yanlış önde", o.takildigin[0].kelime.toLowerCase() === "unless" || o.takildigin[0].kelime === "Although");
kontrol("eşit yanlışta oranı yüksek olan önde (unless 2/2 > although 2/3)", o.takildigin[0].kelime === "unless" && o.takildigin[1].kelime === "Although", o.takildigin.map((g) => g.kelime).join(","));
kontrol("eşit oranda en yeni yanlış önde (moreover > due to)", o.takildigin[2].kelime === "moreover");
kontrol("hiç yanlışı olmayan kelime listede yok", !o.takildigin.some((g) => g.kelime === "Since"));
kontrol("kaydet girdiyi değiştirmez", I.kaydet(l, { id: "x", dogru: true }).length === l.length + 1 && l.length === 8);
let cok = []; for (let i = 0; i < I.EN_FAZLA + 5; i++) cok = I.kaydet(cok, { id: "a", kelime: "k", dogru: true });
kontrol("kayıt sınırı aşılmaz", cok.length === I.EN_FAZLA);

const sorular = JSON.parse(readFileSync(path.join(ROOT, "assets/data/sinyal-sorular.json"), "utf-8"));
kontrol("her soruda geçerli ana sinyal (mainSignal)", sorular.every((s) => s.mainSignal && s.mainSignal.word && S.SINYAL_TIPLERI[s.mainSignal.type]));
kontrol("dogrula mainSignal eksikliğini yakalar", S.dogrula({ ...sorular[0], mainSignal: undefined }).some((h) => h.includes("mainSignal")));
kontrol("cevap olayı adı tanımlı", S.CEVAP_OLAYI === "sinyal-soru-cevap");

const html = readFileSync(path.join(ROOT, "sinyal-soru.html"), "utf-8");
kontrol("sayfada katlanabilir kart", /<details class="oz" id="ilerleme"/.test(html));
kontrol("kart soru panelinden önce", html.indexOf('id="ilerleme"') < html.indexOf('id="ss-panel"'));
kontrol("modül sayfaya yüklenir", html.includes("/assets/modules/sinyal-istatistik.js"));
const js = readFileSync(path.join(ROOT, "assets/modules/sinyal-istatistik.js"), "utf-8");
kontrol("boş durum metni var", js.includes("Henüz soru çözülmedi"));
kontrol("temizle düğmesi var", js.includes("İstatistikleri temizle"));
kontrol("sunucuya veri gönderilmez", !/fetch\(|XMLHttpRequest|sendBeacon/.test(js));

console.log(`\nsinyal-istatistik: ${toplam - basarisiz}/${toplam} geçti`);
if (basarisiz) process.exit(1);
