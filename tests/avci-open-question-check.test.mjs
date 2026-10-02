// AVCI OPEN-QUESTION CHECK MVP ("Anladim, devam." açık soru kontrolü).
// Öğrenci "Anladim, devam." dediğinde ve öğretmenin SON mesajı öğrencinin
// HENÜZ cevaplamadığı açık bir mikro-soruyla bitiyorsa, AVCI'nin bunu bir
// CEVAP saymayıp adımı atlamak yerine öğrenciden cevabını kısaca yazmasını
// istemesini (SOR -> DUR -> BEKLE zamanlamasını koruyarak) doğrular.
//
// TASARIM KARARI (TURBO #2/#3/#4 ile AYNI): TAMAMEN dnavChat() sistem
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
const BASLIK = "ANLADIM-DEVAM ACIK SORU KONTROLU KURALI (ZORUNLU";
const RECOVERY = "GERI ADIM SONRASI TOPARLANMA KURALI (ZORUNLU";
const bas = P.indexOf(BASLIK);
const BLOK = P.slice(bas, P.indexOf(RECOVERY, bas));

// ---- konum / tekillik ----
kontrol("1) kural başlığı TAM OLARAK 1 kez geçiyor", P.split(BASLIK).length === 2);
kontrol("2) blok OGRENCI CIPLAK/KISA CEVAP ile GERI ADIM SONRASI TOPARLANMA arasında; 'Anladim, devam.' satırı (DIGER OGRENCI IFADELERI) artık AÇIK-SORU KOŞULUYLA nitelendirilmiş (koşulsuz ilerletme YOK)", P.indexOf("OGRENCI CIPLAK/KISA BIR CEVAP") < bas && bas < P.indexOf(RECOVERY) && P.indexOf(RECOVERY) < P.indexOf("DIGER OGRENCI IFADELERI") && /- "Anladim, devam\." -> SADECE senin SON mesajin ogrencinin cevaplamadigi acik bir mikro-soruyla BITMEDIYSE aktif sorunun BIR SONRAKI AVCI adimina gec; acik soru VARSA adimi ILERLETME/.test(P) && !/- "Anladim, devam\." -> aktif sorunun BIR SONRAKI AVCI adimina gec\./.test(P));
kontrol("3) 'Anladim, devam.' maddesine AÇIK istisna olduğu belirtiliyor", /"Anladim, devam\." maddesine ISTISNADIR/.test(BLOK));

// ---- tetikleyici + davranış ----
kontrol("4) SADECE 'Anladim, devam.' + son mesaj cevaplanmamış açık mikro-soruyla bitiyorsa çalışıyor", /SADECE ogrenci "Anladim, devam\." \(veya esanlamlisi\) dediginde VE senin SON mesajin ogrencinin HENUZ cevaplamadigi acik bir mikro-soruyla bittiginde calisir/.test(BLOK));
kontrol("5) 'Anladim' CEVAP sayılmıyor, tek başına kanıt değil, cevaplanmamış adım ATLANMIYOR", /"Anladim" bir CEVAP degildir ve anlama iddiasi tek basina kanit degildir/.test(BLOK) && /cevaplanmis sayip ATLAMA/.test(BLOK));
kontrol("6) suçlamasız TEK nazik cümle + öğrenciden cevabını kendi cümleleriyle yazması isteniyor", /Suclama\/sorgulama yapmadan, kisa ve nazik TEK bir cumleyle/.test(BLOK) && /cevabini kendi cumleleriyle kisaca yazmasini iste/.test(BLOK));
kontrol("7) cevap söylenmiyor/ima edilmiyor, yeni soru/örnek yok, ders baştan anlatılmıyor, DUR + BEKLE", /Sorunun cevabini SOYLEME\/ima etme, yeni soru\/ornek URETME, dersi bastan ANLATMA\. Sonra DUR ve BEKLE/.test(BLOK));
kontrol("8) ikinci kez cevapsız geçmek isterse: dongu YOK, sonraki adıma geçiliyor, atlanan adımın cevabı SÖYLENMİYOR (görmek için açık 'Cozumu goster.')", /ikinci kez gecmek isterse: israr etme, dongu OLMAZ - BIR SONRAKI AVCI adimina gec/.test(BLOK) && /atlanan adimin cevabini SOYLEME\/ima etme/.test(BLOK) && /ACIKCA "Cozumu goster\." demelidir/.test(BLOK));
kontrol("9) açık soru YOKSA kural çalışmıyor; mevcut 'Anladim, devam.' davranışı (sonraki adım) aynen geçerli", /acik bir soruyla BITMEDIYSE/.test(BLOK) && /bu kural CALISMAZ; "Anladim, devam\." maddesi aynen gecerlidir: BIR SONRAKI AVCI adimina gec/.test(BLOK));

// ---- etkileşim / öncelik / guardrail ----
kontrol("10) yanlış cevap DEĞİL: geri adım hata sayacı ARTMIYOR", /Bu bir yanlis cevap DEGILDIR: KONTROLLU GERI ADIM kuralinin hata sayacini ARTIRMAZ/.test(BLOK));
kontrol("11) öncelik: açık basamak adı (5J), özet talebi, 'Bugunluk yeter.', 'Cozumu goster.' (COZUM MODU) bu kuraldan ÖNCELİKLİ", /acik basamak yeniden ogretimi \(EXPLICIT ADIM\) kurali; ozet talebi \("Konuyu ozetle\." vb\.\) ve "Bugunluk yeter\." bu kuraldan ONCELIKLIDIR; ogrenci ACIKCA "Cozumu goster\." derse COZUM MODU gecerlidir/.test(BLOK));
kontrol("12) TAHTA ZAMANLAMASI: bekleyen sorunun cevabını gösteren board action çağrılmıyor", /HIGHLIGHT_VERB\/SHOW_SVO\/HIGHLIGHT_SIGNAL\/SHOW_LEFT_RIGHT\) cagirma \(TAHTA ZAMANLAMASI\)/.test(BLOK));
kontrol("13) OGRENCI KANIT OZETI'ne bakarak karar verme + KAYDETME yasak", /OGRENCI KANIT OZETI'ne BAKARAK karar verme, hicbir sey KAYDETME/.test(BLOK));
kontrol("14) blok başka bölümlerin başlık marker'larını TAŞIMIYOR (locked testlerin indexOf'unu bozmaz)", !/AVCI BASAMAK YENIDEN OGRETIMI|MINI KONTROL|DIGER OGRENCI IFADELERI|CEVAP ACIKLAMA POLITIKASI|GUVENLI SOHBET OZETI|GERI ADIM SONRASI|KONTROLLU GERI ADIM \(TEKRAR HATA\)|AVCI YEDI ADIM|ANLATIM TARZI/.test(BLOK));
kontrol("15) blok DB/diagnostic/localStorage/ses/mikrofon/ağ/JS enterpolasyonu içermiyor", !/diagnostic_events|avciKokNedenAnalizEt|supabase|localStorage|upsert|rpc|getUserMedia|MediaRecorder|WebSocket|WebRTC|realtime|VAD|auto-send|[`$]\{|`/i.test(BLOK));

// ---- kilitli kurallar sağlam ----
kontrol("16) SOCRATIC, TAHTA, 5J reteach, mini kontrol, TURBO#2 özet, TURBO#3 geri adım, TURBO#4 toparlanma ve CEVAP ACIKLAMA (sızdırmama) TAM 1 kez mevcut",
  ["SOCRATIC TEK ADIM KURALI (ZORUNLU", "TAHTA ZAMANLAMASI KURALI (ZORUNLU", "AVCI BASAMAK YENIDEN OGRETIMI (EXPLICIT ADIM) KURALI", "MINI KONTROL (MINI SORU) KURALI", "GUVENLI SOHBET OZETI (DERS KAPANISI) KURALI", "KONTROLLU GERI ADIM (TEKRAR HATA) KURALI (ZORUNLU)", RECOVERY, "CEVAP ACIKLAMA POLITIKASI (ZORUNLU)"].every(m => P.split(m).length === 2)
  && /Dogru sikki ASLA dogrudan soyleme\./.test(P));

console.log(`\n${toplam - basarisiz}/${toplam} kontrol geçti`);
if (basarisiz > 0) { console.error(`${basarisiz} kontrol BAŞARISIZ`); process.exit(1); }
