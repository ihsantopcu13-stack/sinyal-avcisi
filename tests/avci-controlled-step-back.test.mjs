// AVCI CONTROLLED STEP-BACK MVP (Tekrar Hata Kontrollü Geri Adım). Öğrenci
// AYNI mikro-soruya art arda yanlış/eksik cevap verdiğinde AVCI'nin sonsuz
// "bir ipucu daha" döngüsüne girmek yerine kontrollü bir merdiven
// uygulamasını doğrular: 1. hata -> mevcut tek ipucu; 2. hata -> TEK kademe
// geri (daha küçük/somut soru); 3. hata -> suçlamayan seçenek sunumu
// ("Cozumu goster." daveti), çözüm modu SADECE açık istekle.
//
// TASARIM KARARI (5J/TURBO #2 ile AYNI): TAMAMEN dnavChat() sistem
// promptuna eklenen bir davranış sözleşmesidir — yeni JS fonksiyonu, state,
// API, DB, ses/mikrofon davranışı YOKTUR; api/klod.mjs DEĞİŞMEDİ. Gerçek
// LLM çağrısı yapılamayacağı için "prompt CONTAINS/EXCLUDES X" seviyesinde
// sözleşme testidir. Gerçek ağa HİÇ çıkılmaz.

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
const BASLIK = "KONTROLLU GERI ADIM (TEKRAR HATA) KURALI (ZORUNLU)";
const bas = P.indexOf(BASLIK);
const BLOK = P.slice(bas, P.indexOf("DIGER OGRENCI IFADELERI", bas));

// ---- konum / tekillik / merdiven yapısı ----
kontrol("1) kural başlığı TAM OLARAK 1 kez geçiyor", (P.match(/KONTROLLU GERI ADIM \(TEKRAR HATA\) KURALI \(ZORUNLU\)/g) || []).length === 1);
kontrol("2) blok OGRENCI CIPLAK/KISA CEVAP ile DIGER OGRENCI IFADELERI arasında", P.indexOf("OGRENCI CIPLAK/KISA BIR CEVAP") < bas && bas < P.indexOf("DIGER OGRENCI IFADELERI"));
kontrol("3) SADECE AYNI soru + AYNI mikro-soruya art arda hata ile tetikleniyor, sayım konuşma geçmişinden", /AYNI aktif sorunun AYNI mikro-sorusuna/.test(BLOK) && /sayimi SADECE mevcut konusma gecmisinden yap/.test(BLOK));
kontrol("4) 1. hata: mevcut SOCRATIC tek ipucu + DUR + BEKLE (davranış değişmedi)", /1\. yanlis\/eksik cevap: mevcut SOCRATIC kuralini uygula - TEK kucuk ek ipucu ver, DUR, BEKLE/.test(BLOK));
kontrol("5) 2. hata: aynı soru/ipucu tekrarlanmıyor, TEK kademe geri, daha küçük/somut soru", /2\. art arda yanlis\/eksik cevap/.test(BLOK) && /AYNI soruyu ve AYNI ipucunu tekrarlama - TEK BIR KADEME GERI GEL/.test(BLOK) && /daha kucuk ve daha somut/.test(BLOK));
kontrol("6) 2. hata: cevap söylenmiyor/ima edilmiyor, yeni soru/örnek üretilmiyor, ders baştan anlatılmıyor", /Cevabi soyleme\/ima etme, yeni soru\/ornek URETME, dersi bastan ANLATMA/.test(BLOK));
kontrol("7) 3. hata: sonsuz döngü yok, cevap KENDILIGINDEN verilmiyor, suçlamayan seçenek sunuluyor", /3\. art arda yanlis\/eksik cevap/.test(BLOK) && /sonsuz ipucu dongusune GIRME ve cevabi KENDILIGINDEN VERME/.test(BLOK) && /suclamayan/.test(BLOK));
kontrol("8) çözüm modu SADECE öğrenci AÇIKÇA isterse ('Cozumu goster.' daveti)", /'Cozumu goster\.'/.test(BLOK) && /COZUM MODUNA SADECE ogrenci ACIKCA isterse gec/.test(BLOK));
kontrol("9) doğru cevapta sayaç sıfırlanıyor ve sonraki AVCI adımına geçiliyor", /dogru cevap verirse sayac SIFIRLANIR/.test(BLOK) && /BIR SONRAKI AVCI adimina gec/.test(BLOK));

// ---- guardrail: SOCRATIC/TAHTA, kanıt özeti/teşhis yok, kayıt yok, öncelik ----
kontrol("10) OGRENCI KANIT OZETI/geçmiş performansla tetikleme + kök-neden teşhisi + KAYDETME AÇIKÇA yasak", /OGRENCI KANIT OZETI'ne veya gecmis performansa BAKARAK bu kurali TETIKLEME, otomatik kok-neden teshisi YAPMA, hicbir sey KAYDETME/.test(BLOK));
kontrol("11) SOCRATIC TEK ADIM + TAHTA ZAMANLAMASI AYNEN geçerli; cevabı gösteren board action AYNI turda yok", /SOCRATIC TEK ADIM ve TAHTA ZAMANLAMASI kurallarina AYNEN uy/.test(BLOK) && /HIGHLIGHT_VERB\/SHOW_SVO\/HIGHLIGHT_SIGNAL\/SHOW_LEFT_RIGHT\) AYNI turda cagirma/.test(BLOK));
kontrol("12) sayı/suçlama ('kac kere yanlis yaptin') yasak", /"kac kere yanlis yaptin" gibi sayi\/suclama soyleme/.test(BLOK));
kontrol("13) öncelik: açık basamak adı -> 5J reteach, 'Mini soru sor' -> mini kontrol (ve blok, başka bölümlerin başlık marker'larını TAŞIMIYOR)", /acik basamak yeniden ogretimi \(EXPLICIT ADIM\) kurali onceliklidir/.test(BLOK) && /mini kontrol \(mini soru\) kuralina tabidir/.test(BLOK) && !/AVCI BASAMAK YENIDEN OGRETIMI|MINI KONTROL/.test(BLOK));
kontrol("14) blok DB/diagnostic/localStorage/ses/mikrofon/ağ/JS enterpolasyonu içermiyor", !/diagnostic_events|avciKokNedenAnalizEt|supabase|localStorage|upsert|rpc|getUserMedia|MediaRecorder|WebSocket|WebRTC|realtime|VAD|auto-send|[`$]\{|`/i.test(BLOK));

// ---- mevcut kilitli kurallar prompt'ta sağlam ----
kontrol("15) SOCRATIC, TAHTA ZAMANLAMASI, 5J reteach, MINI KONTROL, TURBO#2 özet ve CEVAP ACIKLAMA POLITIKASI (sızdırmama) hâlâ TAM 1 kez mevcut",
  ["SOCRATIC TEK ADIM KURALI (ZORUNLU", "TAHTA ZAMANLAMASI KURALI (ZORUNLU", "AVCI BASAMAK YENIDEN OGRETIMI (EXPLICIT ADIM) KURALI", "MINI KONTROL (MINI SORU) KURALI", "GUVENLI SOHBET OZETI (DERS KAPANISI) KURALI", "CEVAP ACIKLAMA POLITIKASI (ZORUNLU)"].every(m => P.split(m).length === 2)
  && /Dogru sikki ASLA dogrudan soyleme\./.test(P));

console.log(`\n${toplam - basarisiz}/${toplam} kontrol geçti`);
if (basarisiz > 0) { console.error(`${basarisiz} kontrol BAŞARISIZ`); process.exit(1); }
