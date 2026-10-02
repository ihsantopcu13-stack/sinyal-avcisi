// AVCI LIVE-TEACHER HARDENING (KATMAN 5 FINAL SINAV / TURBO #8 düzeltmesi).
// Gerçek modelle (production /api/klod) yapılan doğrulamada kanıtlanan 4
// bulguyu prompt-sözleşmesi seviyesinde kilitler:
//   1) COZUM MODU 350 token'da (max_tokens) kesiliyordu (3/7 madde) ->
//      yedi maddenin SIRASI aynen korunur, ama her madde <=1 kısa cümle,
//      ayırıcı/emoji yok, ~70 kelime hedef, 3. madde tek kritik şık,
//      kontrol sorusu SON satır. Gerçek model 114 kelimede 350 token'a
//      ulaştı (Türkçe ~3 token/kelime) -> chat modu için max_tokens 700
//      (tavan, hedef DEĞİL).
//   2) "Anladim, devam." açık soru varken adımı ilerletebiliyordu (2 örnekten
//      1'i) -> düz kural KOŞULLU hale getirildi + KESİN madde eklendi.
//   3) Geri adım kuralı cevaba yakın ipucu/alıntı veriyordu -> cevap
//      sızıntısı koruması (aday listeleme / cevap alıntılama yasak).
//   4) İç kontrol kelimeleri (DUR/BEKLE/SOR) öğrenciye yazılıyordu -> yasak.
//
// TASARIM KARARI (TURBO #2-#7 ile AYNI): TAMAMEN dnavChat() sistem promptuna
// eklenen davranış sözleşmesidir; yeni JS/state/DB/ses davranışı YOKTUR.
// api/klod.mjs'de TEK değişiklik: chat modu için max_tokens 350 -> 700.
// Ek (real-model B bulgusu): cevap ifadesini kalın/vurgulu/alıntı yazma
// yasağı, 2. hatada GERÇEK geri adım, doğru daraltılmış cevapta ASIL soruya
// dönüş, ve tek sonlu 'be' fiilinin (was) doğru cevap sayılması.
// Gerçek ağa HİÇ çıkılmaz.

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
const klodSrc = readFileSync(path.join(ROOT, "api", "klod.mjs"), "utf-8");
function bulSystemPrompt() {
  const start = html.indexOf("system:`", html.indexOf("async function dnavChat(){")) + "system:`".length;
  const end = html.indexOf("`", start);
  return html.slice(start, end);
}
const P = bulSystemPrompt();
function blok(baslik, bitis) {
  const b = P.indexOf(baslik);
  return P.slice(b, P.indexOf(bitis, b));
}
const COZUM = blok("COZUM SONRASI TEK KONTROL KURALI (ZORUNLU)", "BAGLAM ONCELIK SIRASI (ZORUNLU)");
const ACIK = blok("ANLADIM-DEVAM ACIK SORU KONTROLU KURALI (ZORUNLU", "GERI ADIM SONRASI TOPARLANMA KURALI (ZORUNLU");
const GERI = blok("KONTROLLU GERI ADIM (TEKRAR HATA) KURALI (ZORUNLU)", "DIGER OGRENCI IFADELERI");
const ICKURAL = blok("ICKURAL KELIMELERI OGRENCIYE YAZILMAZ KURALI (ZORUNLU)", "TAHTA ZAMANLAMASI KURALI (ZORUNLU");

// ---- 1) COZUM KISALIGI ----
kontrol("1) çözüm kısalığı kuralı mevcut; yedi maddenin SIRASI aynen ve HİÇBİRİ atlanmıyor", /COZUM KISA OLMALI/.test(COZUM) && /1\.Dogru\/Yanlis 2\.Neden dogru 3\.Kritik yanlis sik\(lar\) neden elenir 4\.S\+V\+O 5\.Sinyal 6\.Sag\/Sol kontrol 7\.AVCI REFLEKSI\) ve HICBIRINI atlama/.test(COZUM));
kontrol("2) her madde EN FAZLA 1 kısa cümle; 3. madde SADECE en kritik TEK yanlış şık; ayırıcı çizgi/emoji YOK; tekrar YOK; ~70 kelime hedef; üst sınır HEDEF DEĞİL", /her madde EN FAZLA 1 kisa cumle olsun/.test(COZUM) && /3\. madde SADECE en kritik TEK yanlis sikki ele/.test(COZUM) && /dekoratif ayirici cizgi \(---\) ve emoji KULLANMA/.test(COZUM) && /ayni seyi tekrarlama/.test(COZUM) && /toplam yaklasik 70 kelime hedefle/.test(COZUM) && /Cevap uzunlugu ust siniri bir HEDEF DEGILDIR: uzun yazmak icin sebep yok/.test(COZUM) && !/120 kelime/.test(COZUM));
kontrol("3) kontrol sorusu SON satır: TEK soru, sonrasında HİÇBİR şey yok", /Kontrol sorusu cozum mesajinin SON satiri olmalidir: TEK bir soru, ondan sonra HICBIR sey yazma/.test(COZUM));
kontrol("4) orijinal COZUM MODU satırı ve 7 maddelik sıra prompt'ta DEĞİŞMEDEN duruyor", /COZUM MODU \/ CEVAPLANDIKTAN SONRA - bu sirayla, kisa ve ogretici anlat:\n1\.Dogru\/Yanlis 2\.Neden dogru 3\.Kritik yanlis sik\(lar\) neden elenir 4\.S\+V\+O 5\.Sinyal 6\.Sag\/Sol kontrol 7\.AVCI REFLEKSI/.test(P));
kontrol("5) max_tokens SADECE mode==='chat' icin 350 -> 700 (tek satir); soru_uret 512, sinyal_analiz 400, diger modlar 350 DEGISMEDI; model AYNI", /max_tokens: mode === 'soru_uret' \? 512 : mode === 'sinyal_analiz' \? 400 : mode === 'chat' \? 700 : 350,/.test(klodSrc) && (klodSrc.match(/max_tokens:/g) || []).length === 1 && /model: 'claude-haiku-4-5-20251001',/.test(klodSrc));

// ---- 2) ANLADIM-DEVAM determinizmi ----
kontrol("6) düz 'Anladim, devam.' satırı KOŞULLU: açık soru VARSA adım ilerletilmiyor; koşulsuz eski satır KALMADI", /- "Anladim, devam\." -> SADECE senin SON mesajin ogrencinin cevaplamadigi acik bir mikro-soruyla BITMEDIYSE aktif sorunun BIR SONRAKI AVCI adimina gec; acik soru VARSA adimi ILERLETME/.test(P) && !/- "Anladim, devam\." -> aktif sorunun BIR SONRAKI AVCI adimina gec\./.test(P));
kontrol("7) KESIN madde: açık soru varken 'Anladim, devam.' adımı ASLA ilerletmez; sorumluluk geri verilir; AYNI soru yeniden sorulur; ilerleme ancak cevaptan sonra", /KESIN: bu durumda "Anladim, devam\." \(veya esanlamlisi\) adimi ASLA ilerletmez/.test(ACIK) && /sorumlulugu ogrenciye geri ver ve AYNI bekleyen mikro-soruyu tek kisa cumleyle yeniden sor; adim SADECE o soru cevaplandiktan sonra ilerler/.test(ACIK));
kontrol("8) TURBO#5 kuralının önceki maddeleri (açık soru yokken ilerleme, ikinci geçişte döngü yok) KORUNUYOR", /acik bir soruyla BITMEDIYSE/.test(ACIK) && /ikinci kez gecmek isterse: israr etme, dongu OLMAZ/.test(ACIK));

// ---- 3) STEP-BACK cevap sızıntısı ----
kontrol("9) 1. hata ipucusu aday cevap/seçenek LİSTELEMİYOR, cevap kelimesini ANMIYOR (yalnızca ne türden bir şeye bakılacağı)", /1\. hata ipucusu aday cevaplari\/secenekleri LISTELEMEZ/.test(GERI) && /"X mi Y mi\?" gibi iki secenek sunma/.test(GERI) && /cevap kelimesini\/ifadesini ANMAZ/.test(GERI));
kontrol("10) geri adım sorusu cevap kelimesini/ifadesini ALINTILAMIYOR ve doğrudan GÖSTERMİYOR; yalnızca bölümün TÜRÜ/rolü daraltılıyor; sorumluluk ÖĞRENCİDE", /Geri adim sorusu cevap kelimesini\/ifadesini ALINTILAMAZ ve dogrudan GOSTERMEZ/.test(GERI) && /sadece TURUNU\/rolunu daraltir/.test(GERI) && /sorumlulugu OGRENCIDE kalir/.test(GERI));
kontrol("11) ladder yapısı DEĞİŞMEDİ (1. tek ipucu, 2. tek kademe geri, 3. seçenek sunumu, çözüm SADECE açık istekle)", /1\. yanlis\/eksik cevap: mevcut SOCRATIC kuralini uygula - TEK kucuk ek ipucu ver, DUR, BEKLE\./.test(GERI) && /AYNI soruyu ve AYNI ipucunu tekrarlama - TEK BIR KADEME GERI GEL/.test(GERI) && /3\. art arda yanlis\/eksik cevap/.test(GERI) && /COZUM MODUNA SADECE ogrenci ACIKCA isterse gec/.test(GERI));

// ---- 4) iç kontrol kelimeleri ----
kontrol("12) DUR/BEKLE/SOR kontrol kelimeleri öğrenciye YAZILMIYOR; soru doğal cümleyle bitiyor", /DUR, BEKLE, SOR gibi kontrol kelimeleri SADECE senin davranisini yonetir; ogrenciye gorunen cevapta ASLA yazma/.test(ICKURAL) && /"DUR, cevabini bekleyecegim" YAZMA/.test(ICKURAL) && /dogal bir soru cumlesiyle bitir/.test(ICKURAL));
kontrol("13) iç-kural bloğu TAM 1 kez ve SOCRATIC ile TAHTA arasında", P.split("ICKURAL KELIMELERI OGRENCIYE YAZILMAZ KURALI (ZORUNLU)").length === 2 && P.indexOf("SOCRATIC TEK ADIM KURALI (ZORUNLU") < P.indexOf("ICKURAL KELIMELERI OGRENCIYE YAZILMAZ KURALI") && P.indexOf("ICKURAL KELIMELERI OGRENCIYE YAZILMAZ KURALI") < P.indexOf("TAHTA ZAMANLAMASI KURALI (ZORUNLU"));

// ---- 5) B düzeltmesi: görsel sızıntı yasağı + gerçek geri adım + ASIL soruya dönüş ----
kontrol("16) SORU CUMLESINI YENIDEN YAZMA YASAGI: 1. hata ipucusunda ve geri adım mesajlarında soru cümlesi/içindeki ifade yeniden yazılmıyor, alıntılanmıyor, kopyalanmıyor, kalın/vurgulu gösterilmiyor; öğrenci cümleyi ekranda zaten görüyor", /SORU CUMLESINI YENIDEN YAZMA YASAGI: 1\. hata ipucusunda ve geri adim mesajlarinda soru cumlesini ya da icinden herhangi bir ifadeyi ASLA yeniden yazma, alintilama, kopyalama, kalin\/vurgulu gosterme \(ogrenci cumleyi ekranda zaten goruyor; cevap sizabilir\)/.test(GERI) && !/GORSEL SIZINTI YASAGI/.test(P));
kontrol("16b) yönlendirme SADECE yapısal konumla (cümlenin başı / bağlaçtan önceki bölüm / özne konumu); aday cevap LİSTELENMİYOR; cevap SÖYLENMİYOR; düzeltme 'Hayir' gibi keskin değil, kısa ve nötr; sorumluluk ÖĞRENCİDE", /Sadece YAPISAL konumla yonlendir \(ornek: "cumlenin basina bak", "baglactan onceki bolume bak", "ozne konumuna bak"\)/.test(GERI) && /Aday cevaplari LISTELEME, cevabi SOYLEME/.test(GERI) && /Duzeltmeyi "Hayir" gibi keskin bir kelimeyle degil, kisa ve notr bir cumleyle yap/.test(GERI) && /Cevabi bulma sorumlulugu OGRENCIDE kalir/.test(GERI));
kontrol("17) 2. hatada geri adım sorusu öncekinin tekrarı/yeniden ifadesi OLAMAZ: daha KÜÇÜK ve FARKLI alt soru", /2\. hatada geri adim sorusu bir onceki sorunun\/ipucunun tekrari ya da yeniden ifadesi OLAMAZ: daha KUCUK ve FARKLI bir alt soru olmalidir/.test(GERI));
kontrol("18) daraltılmış soruya DOĞRU cevap -> ASIL bekleyen mikro-soruya dönüş; hemen sonraki adıma ATLANMIYOR", /Geri adim sorusuna DOGRU cevap gelirse ASIL bekleyen mikro-soruya donus \(toparlanma\) kuralini uygula; hemen sonraki adima ATLAMA/.test(GERI) && P.split("GERI ADIM SONRASI TOPARLANMA KURALI (ZORUNLU").length === 2);

// ---- 6) B düzeltmesi: dar 'be' fiili doğruluk notu ----
const BE = blok("BE FIILI DEGERLENDIRME NOTU (ZORUNLU - dar kapsam):", "OGRENCI CIPLAK/KISA BIR CEVAP VERIRSE");
kontrol("19) tek sonlu 'be' fiili (yüklem) ASIL fiildir: öğrenci 'was' derse DOĞRU; 'yardımcı fiil' diye reddedilmiyor, ek kelime İSTENMİYOR, sonraki adıma geçiliyor", /TEK sonlu \(finite\) fiil ise/.test(BE) && /ogrenci bu fiili \(ornek: "was"\) soylerse cevap DOGRUDUR/.test(BE) && /"sadece yardimci fiil" diye reddetme ve ek bir kelime ISTEME/.test(BE) && /BIR SONRAKI adima gec/.test(BE));
kontrol("20) 'be' notu DAR kapsamlı: başka asıl fiile eşlik eden 'be' (was shown, is increasing) yardımcı fiil olarak kalıyor; geniş dilbilgisi yeniden yazımı YOK; blok TAM 1 kez ve TAHTA ile CIPLAK arasında", /baska bir asil fiile eslik ediyorsa \(ornek: was shown, is increasing\) yardimci fiildir/.test(BE) && BE.length < 900 && P.split("BE FIILI DEGERLENDIRME NOTU (ZORUNLU").length === 2 && P.indexOf("TAHTA ZAMANLAMASI KURALI (ZORUNLU") < P.indexOf("BE FIILI DEGERLENDIRME NOTU"));
kontrol("21) eklenen bloklar (görsel-sızıntı, geri adım, 'be' notu) DB/diagnostic/ses/ağ/JS enterpolasyonu içermiyor", !/diagnostic_events|avciKokNedenAnalizEt|supabase|localStorage|upsert|rpc|getUserMedia|MediaRecorder|WebSocket|WebRTC|realtime|\bVAD\b|auto-send|[`$]\{|`/i.test(BE));

// ---- guardrail: ek metinler güvenli ----
const EKLER = [COZUM, ACIK, GERI, ICKURAL].join("\n");
kontrol("14) düzeltilen bloklar DB/diagnostic/ses/mikrofon/ağ/JS enterpolasyonu içermiyor", !/diagnostic_events|avciKokNedenAnalizEt|supabase|localStorage|upsert|rpc|getUserMedia|MediaRecorder|WebSocket|WebRTC|realtime|\bVAD\b|auto-send|[`$]\{|`/i.test(EKLER));
kontrol("15) tüm kilitli kural başlıkları TAM 1 kez (kopya YOK) ve cevap-anahtarı koruması sağlam",
  ["SOCRATIC TEK ADIM KURALI (ZORUNLU", "TAHTA ZAMANLAMASI KURALI (ZORUNLU", "AVCI BASAMAK YENIDEN OGRETIMI (EXPLICIT ADIM) KURALI", "MINI KONTROL (MINI SORU) KURALI", "GUVENLI SOHBET OZETI (DERS KAPANISI) KURALI", "KONTROLLU GERI ADIM (TEKRAR HATA) KURALI (ZORUNLU)", "GERI ADIM SONRASI TOPARLANMA KURALI (ZORUNLU", "ANLADIM-DEVAM ACIK SORU KONTROLU KURALI (ZORUNLU", "YAN SORU SONRASI GOREVE DONUS KURALI (ZORUNLU)", "COZUM SONRASI TEK KONTROL KURALI (ZORUNLU)", "CEVAP ACIKLAMA POLITIKASI (ZORUNLU)"].every(m => P.split(m).length === 2)
  && /Dogru sikki ASLA dogrudan soyleme\./.test(P));

console.log(`\n${toplam - basarisiz}/${toplam} kontrol geçti`);
if (basarisiz > 0) { console.error(`${basarisiz} kontrol BAŞARISIZ`); process.exit(1); }
