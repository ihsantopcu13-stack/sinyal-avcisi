// AVCI SIDE-QUESTION RETURN-TO-TASK MVP (Yan Soru Sonrası Göreve Dönüş).
// Bekleyen açık bir mikro-soru varken öğrenci kısa bir YAN SORU (kelime
// anlamı, dilbilgisi terimi, konu dışı) sorduğunda AVCI'nin yan soruyu
// 1-2 cümleyle, bekleyen sorunun cevabını sızdırmadan yanıtlamasını, sonra
// AYNI bekleyen mikro-soruya dönüp DUR + BEKLE yapmasını (sorumluluğu
// öğrenciye geri vererek) ve genel bir sohbet botuna dönüşmemesini doğrular.
//
// TASARIM KARARI (TURBO #2-#5 ile AYNI): TAMAMEN dnavChat() sistem
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
const BASLIK = "YAN SORU SONRASI GOREVE DONUS KURALI (ZORUNLU)";
const ACIK_SORU = "ANLADIM-DEVAM ACIK SORU KONTROLU KURALI (ZORUNLU";
const bas = P.indexOf(BASLIK);
const BLOK = P.slice(bas, P.indexOf(ACIK_SORU, bas));

// ---- konum / tekillik ----
kontrol("1) kural başlığı TAM OLARAK 1 kez geçiyor", P.split(BASLIK).length === 2);
kontrol("2) blok OGRENCI CIPLAK/KISA CEVAP ile TURBO#5 açık-soru kuralı arasında (doğru yerde)", P.indexOf("OGRENCI CIPLAK/KISA BIR CEVAP") < bas && bas < P.indexOf(ACIK_SORU) && P.indexOf(ACIK_SORU) < P.indexOf("DIGER OGRENCI IFADELERI"));

// ---- tetikleyici ----
kontrol("3) SADECE son mesaj cevaplanmamış açık mikro-soruyla bitiyorsa + öğrenci kısa YAN SORU soruyorsa çalışıyor", /SADECE senin SON mesajin ogrencinin HENUZ cevaplamadigi acik bir mikro-soruyla bittiginde VE ogrenci bu soruyu cevaplamak yerine kisa bir YAN SORU sordugunda calisir/.test(BLOK));
kontrol("4) yan soru örnekleri: kelime anlamı, dilbilgisi terimi, konu dışı kısa soru", /cumledeki bir kelimenin anlami, bir dilbilgisi terimi, ya da konu disi kisa bir soru/.test(BLOK));
kontrol("5) bekleyen soruya HER deneme (yanlış/eksik dahi) yan soru DEĞİL, cevap; bekleyen soru yoksa kural ÇALIŞMIYOR", /HER deneme \(yanlis\/eksik olsa bile\) yan soru DEGIL, cevaptir/.test(BLOK) && /Bekleyen acik soru yoksa bu kural CALISMAZ/.test(BLOK));

// ---- davranış ----
kontrol("6) yan soru EN FAZLA 1-2 kısa cümleyle cevaplanıyor", /EN FAZLA 1-2 kisa cumleyle cevapla/.test(BLOK));
kontrol("7) yan soru cevabı bekleyen sorunun cevabını SÖYLEMİYOR/ima etmiyor; cevabı isteyen yan soruda sadece nereye bakacağı gösteriliyor", /bekleyen mikro-sorunun cevabini SOYLEMEMELI\/ima etmemeli/.test(BLOK) && /cevabi verme, sadece nereye bakmasi gerektigini goster \(TAHTA ZAMANLAMASI gecerli\)/.test(BLOK));
kontrol("8) AYNI bekleyen mikro-soruya dönülüyor, öğrenciden kendisinin cevaplaması isteniyor, DUR + BEKLE", /AYNI bekleyen mikro-soruya DON: onu tek kisa cumleyle yeniden sor, ogrenciden bunu kendisinin cevaplamasini iste, sonra DUR ve BEKLE/.test(BLOK));
kontrol("9) yeni soru/örnek üretilmiyor, ders baştan anlatılmıyor, sorumluluk öğrenciye geri veriliyor", /YENI bir soru\/ornek URETME, dersi bastan ANLATMA - sorumluluk ogrenciye geri verilir/.test(BLOK));
kontrol("10) konu dışı/uzun sohbet: tek nazik cümle + derse dönüş; genel sohbet botuna DÖNÜŞMÜYOR; üst üste yan soruda aynı soruya dönüş", /uzun sohbete GIRME, AVCI'yi genel bir sohbet botuna DONUSTURME/.test(BLOK) && /Ust uste yan soru gelirse her seferinde kisa cevapla ve AYNI bekleyen soruya don/.test(BLOK));

// ---- etkileşim / öncelik / guardrail ----
kontrol("11) yan soru yanlış cevap DEĞİL: geri adım sayacı ARTMIYOR; zayıflık/ustalık çıkarımı YOK; KANIT ÖZETİ'ne bakılmıyor; KAYDETME yok", /KONTROLLU GERI ADIM kuralinin hata sayacini ARTIRMAZ/.test(BLOK) && /HICBIR cikarim icin KULLANILMAZ/.test(BLOK) && /OGRENCI KANIT OZETI'ne BAKARAK karar verme, hicbir sey KAYDETME/.test(BLOK));
kontrol("12) öncelik: devam istekleri ('Anladim, devam.'), açık basamak adı (5J), özet talebi, 'Bugunluk yeter.', mini soru/test, 'Cozumu goster.' YAN SORU SAYILMIYOR ve önceliklidir", /"Anladim, devam\." ve benzeri devam istekleri/.test(BLOK) && /acik basamak yeniden ogretimi kurali/.test(BLOK) && /ozet talebi \("Konuyu ozetle\." vb\.\)/.test(BLOK) && /"Bugunluk yeter\."/.test(BLOK) && /"Mini soru sor\."\/"Beni test et\."/.test(BLOK) && /ACIKCA "Cozumu goster\." yan soru SAYILMAZ - kendi kurallari bu kuraldan ONCELIKLIDIR/.test(BLOK));
kontrol("13) blok başka bölümlerin başlık marker'larını TAŞIMIYOR (locked testlerin indexOf'unu bozmaz)", !/AVCI BASAMAK YENIDEN OGRETIMI|MINI KONTROL|DIGER OGRENCI IFADELERI|CEVAP ACIKLAMA POLITIKASI|GUVENLI SOHBET OZETI|GERI ADIM SONRASI|KONTROLLU GERI ADIM \(TEKRAR HATA\)|ANLADIM-DEVAM ACIK SORU|AVCI YEDI ADIM|ANLATIM TARZI/.test(BLOK));
kontrol("14) blok DB/diagnostic/localStorage/ses/mikrofon/ağ/JS enterpolasyonu içermiyor", !/diagnostic_events|avciKokNedenAnalizEt|supabase|localStorage|upsert|rpc|getUserMedia|MediaRecorder|WebSocket|WebRTC|realtime|VAD|auto-send|[`$]\{|`/i.test(BLOK));

// ---- kilitli kurallar sağlam ----
kontrol("15) SOCRATIC, TAHTA, 5J reteach, mini kontrol, TURBO#2 özet, #3 geri adım, #4 toparlanma, #5 açık-soru ve CEVAP ACIKLAMA (sızdırmama) TAM 1 kez mevcut",
  ["SOCRATIC TEK ADIM KURALI (ZORUNLU", "TAHTA ZAMANLAMASI KURALI (ZORUNLU", "AVCI BASAMAK YENIDEN OGRETIMI (EXPLICIT ADIM) KURALI", "MINI KONTROL (MINI SORU) KURALI", "GUVENLI SOHBET OZETI (DERS KAPANISI) KURALI", "KONTROLLU GERI ADIM (TEKRAR HATA) KURALI (ZORUNLU)", "GERI ADIM SONRASI TOPARLANMA KURALI (ZORUNLU", ACIK_SORU, "CEVAP ACIKLAMA POLITIKASI (ZORUNLU)"].every(m => P.split(m).length === 2)
  && /Dogru sikki ASLA dogrudan soyleme\./.test(P));

console.log(`\n${toplam - basarisiz}/${toplam} kontrol geçti`);
if (basarisiz > 0) { console.error(`${basarisiz} kontrol BAŞARISIZ`); process.exit(1); }
