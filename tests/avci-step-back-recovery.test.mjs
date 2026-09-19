// AVCI STEP-BACK RECOVERY BRIDGE MVP (Geri Adım Sonrası Toparlanma).
// TURBO #3'ün kademeli geri adımında öğrenci yalnızca DARALTILMIŞ soruyu
// doğru cevapladığında, AVCI'nin asıl mikro-soruyu atlayıp bir sonraki AVCI
// adımına geçmesi yerine, öğrenciyi ASIL mikro-soruya geri döndürmesini
// (kendi ağzından cevaplatması) doğrular.
//
// TASARIM KARARI (TURBO #2/#3 ile AYNI): TAMAMEN dnavChat() sistem
// promptuna eklenen bir davranış sözleşmesidir — yeni JS/state/API/DB/ses
// davranışı YOKTUR; api/klod.mjs DEĞİŞMEDİ. "prompt CONTAINS/EXCLUDES X"
// seviyesinde sözleşme testidir; gerçek ağa HİÇ çıkılmaz.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
function bulSystemPrompt() {
  const start = html.indexOf("system:`", html.indexOf("async function dnavChat(){")) + "system:`".length;
  const end = html.indexOf("`", start);
  return html.slice(start, end);
}
const P = bulSystemPrompt();
const BASLIK = "GERI ADIM SONRASI TOPARLANMA KURALI (ZORUNLU";
const STEPBACK = "KONTROLLU GERI ADIM (TEKRAR HATA) KURALI (ZORUNLU)";
const bas = P.indexOf(BASLIK);
const BLOK = P.slice(bas, P.indexOf(STEPBACK, bas));

// ---- konum / tekillik ----
kontrol("1) kural başlığı TAM OLARAK 1 kez geçiyor", P.split(BASLIK).length === 2);
kontrol("2) blok OGRENCI CIPLAK/KISA CEVAP ile KONTROLLU GERI ADIM arasında (doğru yerde, KONTROLLU GERI ADIM da 1 kez)", P.indexOf("OGRENCI CIPLAK/KISA BIR CEVAP") < bas && bas < P.indexOf(STEPBACK) && P.split(STEPBACK).length === 2);
kontrol("3) KONTROLLU GERI ADIM'ın 'dogru cevap' maddesine AÇIK istisna olduğu belirtiliyor", /KONTROLLU GERI ADIM kuralinin "dogru cevap" maddesine ISTISNADIR/.test(BLOK));

// ---- tetikleyici + davranış ----
kontrol("4) SADECE önceki mesajda daraltılmış geri adım sorusu sorulup ona DOĞRU cevap gelince çalışıyor", /SADECE bir onceki mesajinda ogrenciye daraltilmis bir GERI ADIM sorusu sorduysan ve ogrenci ona DOGRU cevap verdiyse calisir/.test(BLOK));
kontrol("5) öğrenci yalnız daraltılmış soruyu cevapladı; sonraki AVCI adımına ATLAMIYOR", /ASIL mikro-soruyu HENUZ cevaplamadi/.test(BLOK) && /bir sonraki AVCI adimina ATLAMA/.test(BLOK));
kontrol("6) ASIL mikro-soruya DÖNÜLÜYOR ve öğrenciden kendisinin cevaplaması isteniyor", /ASIL mikro-soruya DON ve ogrenciden simdi bunu kendisinin cevaplamasini iste/.test(BLOK));
kontrol("7) onay abartısız: kanıtsız başarı iddiası ('ustalastin','artik biliyorsun') yasak", /abartisiz bir onay/.test(BLOK) && /"ustalastin", "artik biliyorsun" gibi kanitsiz iddia YOK/.test(BLOK));
kontrol("8) asıl sorunun cevabı söylenmiyor/ima edilmiyor, yeni soru/örnek yok, ders baştan anlatılmıyor, TEK soru + DUR + BEKLE", /Asil sorunun cevabini SOYLEME\/ima etme, yeni soru\/ornek URETME, dersi bastan ANLATMA\. TEK soru sor, sonra DUR ve BEKLE/.test(BLOK));
kontrol("9) asıl soru doğruysa doğrulama + sonraki AVCI adımı; tekrar yanlışsa ladder baştan, sonsuz döngü YOK", /ASIL mikro-soruyu dogru cevaplarsa: kisa dogrulama yap ve BIR SONRAKI AVCI adimina gec/.test(BLOK) && /basamaklar bastan islenir/.test(BLOK) && /sonsuz dongu OLMAZ/.test(BLOK));
kontrol("10) daraltılmış soruya yanlış cevapta bu kural ÇALIŞMIYOR; 3. basamak (seçenek sunumu) geçerli", /Daraltilmis soruya yanlis\/eksik cevap gelirse bu kural CALISMAZ/.test(BLOK) && /3\. basamagi \(secenek sunumu\)/.test(BLOK));

// ---- guardrail ----
kontrol("11) TAHTA ZAMANLAMASI: cevabı gösteren board action AYNI turda çağrılmıyor", /HIGHLIGHT_VERB\/SHOW_SVO\/HIGHLIGHT_SIGNAL\/SHOW_LEFT_RIGHT\) ayni turda cagirma \(TAHTA ZAMANLAMASI\)/.test(BLOK));
kontrol("12) OGRENCI KANIT OZETI'ne bakarak karar verme + KAYDETME yasak", /OGRENCI KANIT OZETI'ne BAKARAK karar verme, hicbir sey KAYDETME/.test(BLOK));
kontrol("13) blok başka bölümlerin başlık marker'larını TAŞIMIYOR (locked testlerin indexOf'unu bozmaz)", !/AVCI BASAMAK YENIDEN OGRETIMI|MINI KONTROL|DIGER OGRENCI IFADELERI|CEVAP ACIKLAMA POLITIKASI|GUVENLI SOHBET OZETI|AVCI YEDI ADIM|ANLATIM TARZI/.test(BLOK));
kontrol("14) blok DB/diagnostic/localStorage/ses/mikrofon/ağ/JS enterpolasyonu içermiyor", !/diagnostic_events|avciKokNedenAnalizEt|supabase|localStorage|upsert|rpc|getUserMedia|MediaRecorder|WebSocket|WebRTC|realtime|VAD|auto-send|[`$]\{|`/i.test(BLOK));

// ---- kilitli kurallar sağlam ----
kontrol("15) SOCRATIC, TAHTA ZAMANLAMASI, 5J reteach, mini kontrol, TURBO#2 özet, TURBO#3 geri adım ve CEVAP ACIKLAMA (sızdırmama) TAM 1 kez mevcut",
  ["SOCRATIC TEK ADIM KURALI (ZORUNLU", "TAHTA ZAMANLAMASI KURALI (ZORUNLU", "AVCI BASAMAK YENIDEN OGRETIMI (EXPLICIT ADIM) KURALI", "MINI KONTROL (MINI SORU) KURALI", "GUVENLI SOHBET OZETI (DERS KAPANISI) KURALI", STEPBACK, "CEVAP ACIKLAMA POLITIKASI (ZORUNLU)"].every(m => P.split(m).length === 2)
  && /Dogru sikki ASLA dogrudan soyleme\./.test(P) && /1\. yanlis\/eksik cevap: mevcut SOCRATIC kuralini uygula/.test(P));

console.log(`\n${toplam - basarisiz}/${toplam} kontrol geçti`);
if (basarisiz > 0) { console.error(`${basarisiz} kontrol BAŞARISIZ`); process.exit(1); }
