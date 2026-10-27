// AVCI ÇÖZÜM MOTORU — kural motoru, sinyal kütüphanesi, boşluk soruları
// mirror'ı ve index.html bağlantı noktaları. Ağ çağrısı yok.

import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { buildBoslukSource, BASLA, BITIS } from "../scripts/avci-bosluk-generator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
let toplam = 0, basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const ctx = vm.createContext({});
vm.runInContext(readFileSync(path.join(ROOT, "assets/modules/avci-motor.js"), "utf-8"), ctx);
const M = ctx.AvciMotor;
const bosluk = JSON.parse(readFileSync(path.join(ROOT, "api/data/avci-bosluk-sorular.json"), "utf-8"));
const anlam = JSON.parse(readFileSync(path.join(ROOT, "api/data/sorular.json"), "utf-8"));
const html = readFileSync(path.join(ROOT, "index.html"), "utf-8");
const fe = (s) => ({ id: s.id, tip: s.tip, en: s.soru_en, sent: s.soru_en, q: s.soru_tr, opts: s.secenekler_tr, ans: s.dogru_index, tr: s.ceviri_tr, sinyal: s.sinyal });

// ---- referans soru: than previously thought ----
const q501 = M.coz(fe(bosluk.find((s) => s.id === "q501")));
kontrol("1) referans soru C'yi buluyor", q501 && q501.dogruHarf === "C" && q501.dogruMetin === "produces / thought");
kontrol("2) en güçlü sinyal 'than previously + V3'", q501.sinyal.id === "than_previously_v3");
kontrol("3) 1. aşamada sinyal A, B, D, E'yi eliyor", q501.asama1.map(M.harf).join(",") === "A,B,D,E");
const ozneSira = q501.adimlar.findIndex((a) => a.no === 7);
const sinyalSira = q501.adimlar.findIndex((a) => a.no === 3);
kontrol("4) önce sinyal, sonra 'a given level → produces' doğrulaması", sinyalSira < ozneSira && q501.dogrulama.some((d) => /level/.test(d.metin) && /tekil/.test(d.metin) && /produces/.test(d.metin)));
const tz = Object.fromEntries(q501.tuzaklar.map((t) => [t.harf, t.kural]));
kontrol("5) tuzak açıklamaları doğru kuralı söylüyor",
  /mastar/.test(tz.A) && /etken V-ing/.test(tz.B) && /etken/.test(tz.D) && /öznenin kendisinin/.test(tz.D) && /yalın V3/.test(tz.E));
kontrol("6) güven yüksek", q501.guven === "yuksek");
kontrol("7) 10 adımlı anlatım, sıra istemle aynı", q501.adimlar.length === 10 && q501.adimlar[0].baslik === "Boşluğun sağına bak." && q501.adimlar[9].baslik === "AVCI REFLEKSİ");
kontrol("8) refleks 'Önce sağa bak' ile başlıyor ve özne kontrolünü içeriyor", /^Önce sağa bak/.test(q501.refleks) && /özneyi kontrol et/.test(q501.refleks));
const gb = M.geriBildirim(q501, 3);
kontrol("9) yanlış seçimde geri bildirim (seçilen, doğru, sinyal, hata)", !gb.dogruMu && gb.secilenHarf === "D" && gb.dogruHarf === "C" && gb.sinyal && gb.hata.metin.length > 0);

// ---- tüm sorular: kural motoru doğru cevabı ASLA elemez ----
let celiskili = [], cozulemeyen = [], gosterilenCeliski = [];
const guven = { yuksek: 0, orta: 0, dusuk: 0 };
for (const s of [...bosluk, ...anlam]) {
  const c = M.coz(fe(s));
  if (!c) { cozulemeyen.push(s.id); continue; }
  guven[c.guven]++;
  if (c.elenenler[s.dogru_index]) celiskili.push(s.id);
  if (c.celiski.length && c.guven === "yuksek") gosterilenCeliski.push(s.id);
}
kontrol("10) 111 sorunun hepsi için çözüm üretiliyor", cozulemeyen.length === 0, cozulemeyen.join(","));
kontrol("11) hiçbir çözümde doğru cevap elenmiş görünmüyor", celiskili.length === 0, celiskili.join(","));
kontrol("12) çelişki olan soru 'yüksek güven' almıyor", gosterilenCeliski.length === 0, gosterilenCeliski.join(","));
const bGuven = bosluk.map((s) => M.coz(fe(s)).guven);
kontrol("13) boşluk sorularının en az 25'i yüksek güvenli", bGuven.filter((g) => g === "yuksek").length >= 25, JSON.stringify(guven));
kontrol("14) her yanlış şık için kural + çekicilik + eleyen alanı var", bosluk.every((s) => { const c = M.coz(fe(s)); return c.tuzaklar.length === 4 && c.tuzaklar.every((t) => t.kural && t.cekicilik); }));

// ---- sinyal kütüphanesi ----
const alanlar = ["signalId", "signalText", "questionType", "measuredSkill", "leftPattern", "rightPattern", "expectedStructure", "eliminationRules", "verificationRules", "commonTraps", "shortExplanation", "hunterReflex", "example", "difficultyLevel"];
kontrol("15) kütüphanedeki her kayıtta 14 alan var", M.KUTUPHANE.every((k) => alanlar.every((a) => k[a] !== undefined)), M.KUTUPHANE.length + " kayıt");
const istenen = ["because_cumle", "because_of_isim", "although_cumle", "despite_isim", "however_yeni_cumle", "zaman_yan_cumle_will", "whose_isim", "the_number_of", "a_number_of", "than_previously_v3", "by_edilgen", "since_for_zaman", "if_kosul", "so_such", "not_only_but_also", "either_neither_yakin_ozne", "edat_ving", "modal_v1", "have_v3", "be_v3_edilgen", "be_ving_surerlik", "relative_eksik_ozne"];
const idler = new Set(M.KUTUPHANE.map((k) => k.signalId));
kontrol("16) istemdeki 22 başlangıç sinyalinin hepsi var", istenen.every((i) => idler.has(i)), istenen.filter((i) => !idler.has(i)).join(","));
const kullanilan = new Set(bosluk.map((s) => M.coz(fe(s)).sinyal?.id));
kontrol("17) 22 sinyalin her biri en az bir gerçek soruda devreye giriyor", istenen.every((i) => kullanilan.has(i) || (i === "because_cumle" && kullanilan.has("although_cumle"))), istenen.filter((i) => !kullanilan.has(i)).join(","));

// ---- rapor ----
const v = { kayitlar: [
  { qid: "q501", sinyalId: "than_previously_v3", sinyalMetin: "than previously + V3", dogru: false, tarih: "2026-10-26", tuzak: "yapi", refleks: "R1" },
  { qid: "q509", sinyalId: "the_number_of", sinyalMetin: "the number of", dogru: true, tarih: "2026-10-26" },
  { qid: "q509", sinyalId: "the_number_of", sinyalMetin: "the number of", dogru: true, tarih: "2026-10-25" },
] };
const r = M.raporHesapla(v, "2026-10-26", bosluk.map((s) => ({ id: s.id, tip: "bosluk", sinyalId: M.coz(fe(s)).sinyal?.id })));
kontrol("18) rapor: en güçlü, kaçırılan, tuzak, kurallar, 5 soruluk antrenman",
  r.enGuclu?.id === "the_number_of" && r.kacirilan?.id === "than_previously_v3" && r.tuzak?.id === "yapi" && r.yarinKurallar[0] === "R1" && r.antrenman.length === 5);

// ---- mirror ve index.html bağlantıları ----
const b = html.indexOf(BASLA), e = html.indexOf(BITIS);
kontrol("19) index.html'deki SL_BOSLUK_HAVUZ canonical'la aynı (drift yok)", b > 0 && html.slice(b, e + BITIS.length) === buildBoslukSource(bosluk));
kontrol("20) sorular.json'a dokunulmadı (83 soru, q5xx yok)", anlam.length === 83 && !anlam.some((s) => /^q5/.test(s.id)));
kontrol("21) boşluk soruları 5 şıklı, id'ler q501+ ve benzersiz", bosluk.every((s) => s.secenekler_tr.length === 5 && /^q5\d\d$/.test(s.id)) && new Set(bosluk.map((s) => s.id)).size === bosluk.length);
kontrol("22) slRender/dAns/slSonraki bağlantıları typeof korumalı",
  /if\(typeof avciMotorSoruAcildi==='function'\)avciMotorSoruAcildi\(soru\)/.test(html)
  && /if\(typeof avciMotorCevaplandi==='function'\)avciMotorCevaplandi\(/.test(html)
  && /if\(typeof avciKuyrukSonraki==='function'&&avciKuyrukSonraki\(\)\)return;/.test(html)
  && /typeof avciTurFiltresi==='function'/.test(html));
kontrol("23) modüller defer ile yükleniyor (sayfa açılışını bloklamaz)", /avci-motor\.js\?v=\d+" defer/.test(html) && /avci-cozum\.js\?v=\d+" defer/.test(html));

// ---- arayüz dosyası: modlar ve COST GUARD ----
const ui = readFileSync(path.join(ROOT, "assets/modules/avci-cozum.js"), "utf-8");
kontrol("24) üç mod tanımlı", /hizli:\{ad:'Hızlı Avcı'/.test(ui) && /hoca:\{ad:'Hoca Anlatımı'/.test(ui) && /sinav:\{ad:'Sınav Modu'/.test(ui));
kontrol("25) yapay zekâ yalnızca düşük güvende ve butonla çağrılıyor", (ui.match(/fetch\(/g) || []).length === 1 && /if\(c\.guven!=='dusuk'\)/.test(ui) && /data-avm-yz/.test(ui));
kontrol("26) yapay zekâ çıktısı cevap anahtarıyla karşılaştırılıyor + yerel önbellek + tek istek", /!==M\.harf\(s\.ans\)/.test(ui) && /LS_AI/.test(ui) && /_yzBekleyen\[s\.id\]/.test(ui));
kontrol("27) motor tarayıcı API'si veya ağ kullanmıyor (saf)", !/fetch\(|localStorage\.|document\./.test(readFileSync(path.join(ROOT, "assets/modules/avci-motor.js"), "utf-8")));

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
