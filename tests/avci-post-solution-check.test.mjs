// AVCI POST-SOLUTION SINGLE CHECK MVP (Çözüm Sonrası Tek Kontrol).
// COZUM MODU cevabı verildikten sonra AVCI'nin çözümü tekrar etmeden, aynı
// aktif sorunun çözümüyle ilgili TEK küçük kontrol sorusu sorup (öğrencinin
// KENDİ CÜMLELERİYLE açıklaması), DUR + BEKLE yaparak sorumluluğu öğrenciye
// geri vermesini; doğru cevapta abartısız onay (ustalık iddiası YOK) ve
// öğrenci-tetikli devam seçeneği sunmasını; kontrolü ZORLAMAMASINI doğrular.
//
// TASARIM KARARI (TURBO #2-#6 ile AYNI): TAMAMEN dnavChat() sistem
// promptuna eklenen bir davranış sözleşmesidir — yeni JS/state/API/DB/ses
// davranışı YOKTUR; api/klod.mjs DEĞİŞMEDİ; sonraki soru geçişi 5H'nin
// öğrenci-tetikli komutunda KALIR (otomatik navigasyon YOK). "prompt
// CONTAINS/EXCLUDES X" seviyesinde sözleşme testidir; gerçek ağa HİÇ çıkılmaz.

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
const BASLIK = "COZUM SONRASI TEK KONTROL KURALI (ZORUNLU)";
const SONRAKI = "BAGLAM ONCELIK SIRASI (ZORUNLU)";
const bas = P.indexOf(BASLIK);
const BLOK = P.slice(bas, P.indexOf(SONRAKI, bas));

// ---- konum / tekillik ----
kontrol("1) kural başlığı TAM OLARAK 1 kez geçiyor", P.split(BASLIK).length === 2);
kontrol("2) blok COZUM MODU bölümünden SONRA, BAGLAM ONCELIK SIRASI'ndan ÖNCE (doğru yerde)", P.indexOf("COZUM MODU / CEVAPLANDIKTAN SONRA") < bas && bas < P.indexOf(SONRAKI));
kontrol("3) COZUM MODU bölümünün 7 maddelik sırası DOKUNULMADAN duruyor", /1\.Dogru\/Yanlis 2\.Neden dogru 3\.Kritik yanlis sik\(lar\) neden elenir 4\.S\+V\+O 5\.Sinyal 6\.Sag\/Sol kontrol 7\.AVCI REFLEKSI/.test(P));

// ---- davranış ----
kontrol("4) çözüm VERİLDİKTEN SONRA çalışıyor (açık istek ya da soru cevaplanmış); çözüm tekrar edilmiyor, yeni soru/örnek üretilmiyor", /cozum aciklamasini VERDIKTEN SONRA \(ogrenci acikca cozum istedigi icin ya da soruyu cevapladigi icin\) calisir/.test(BLOK) && /cozumu TEKRAR ETME, YENI soru\/ornek URETME/.test(BLOK));
kontrol("5) AYNI aktif sorunun çözümüyle ilgili TEK küçük kontrol sorusu, sorumluluk öğrenciye geri veriliyor, DUR + BEKLE", /AYNI aktif sorunun cozumuyle ilgili TEK kucuk kontrol sorusu sor/.test(BLOK) && /sorumlulugu ogrenciye geri vermek icin/.test(BLOK) && /Sonra DUR ve BEKLE/.test(BLOK));
kontrol("6) kontrol sorusu gösterilen bilgiyi kelimesi kelimesine tekrar ettirmiyor: öğrencinin KENDİ CÜMLELERİYLE açıklaması isteniyor", /KENDI CUMLELERIYLE aciklamasini istemelidir/.test(BLOK) && /kelimesi kelimesine tekrar ettirmek yerine/.test(BLOK));
kontrol("7) doğru cevap: abartısız onay; TEK yardımlı cevap ustalık kanıtı DEĞİL ('ustalastin','artik biliyorsun' yok)", /kisa, abartisiz onay ver; bu TEK yardimli cevap ustalik kaniti DEGILDIR \("ustalastin", "artik biliyorsun" deme\)/.test(BLOK));
kontrol("8) doğru cevap sonrası devam SEÇENEĞİ sunuluyor ama otomatik sonraki soruya GEÇİLMİYOR, yeni soru ÜRETİLMİYOR (5H öğrenci-tetikli kalıyor)", /"Sonraki soru\." ya da "Beni test et\." diyebilecegini soyle/.test(BLOK) && /otomatik olarak sonraki soruya GECME, yeni soru URETME/.test(BLOK));
kontrol("9) yanlış/eksik cevap: nazik/suçlamasız, çözüm baştan anlatılmıyor, TEK küçük ipucu + DUR + BEKLE; geri adım kuralları geçerli", /nazik ve suclamasiz ol, cozumu bastan anlatma - TEK kucuk ipucu ver, DUR ve BEKLE \(geri adim kurallari AYNEN gecerli\)/.test(BLOK));
kontrol("10) kontrol ZORLANMIYOR: sonraki soru/özet/'Bugunluk yeter.' istenirse ilgili kurala göre karşılanıyor, tekrar tekrar dayatılmıyor", /Kontrol sorusunu ZORLAMA/.test(BLOK) && /sonraki soru komutu, ozet talebi ya da "Bugunluk yeter\." derse/.test(BLOK) && /tekrar tekrar dayatma/.test(BLOK));
kontrol("11) kontrol sorusu açık mikro-soru: 'Anladim, devam.' (TURBO#5) ve yan soru (TURBO#6) kuralları ona AYNEN uygulanıyor", /"Anladim, devam\." ve yan soru kurallari ona AYNEN uygulanir/.test(BLOK));

// ---- guardrail ----
kontrol("12) SADECE çözüm verildikten sonra; cevaplanmamış soruda (çözüm modu yokken) ÇALIŞMIYOR ve cevabı önceden AÇMIYOR", /SADECE cozum verildikten sonra calisir; cevaplanmamis bir soruda \(cozum modu yokken\) calismaz ve hicbir cevabi onceden ACMAZ/.test(BLOK));
kontrol("13) OGRENCI KANIT OZETI'ne bakarak karar verme + KAYDETME yasak", /OGRENCI KANIT OZETI'ne BAKARAK karar verme, hicbir sey KAYDETME/.test(BLOK));
kontrol("14) blok başka bölümlerin başlık marker'larını TAŞIMIYOR (locked testlerin indexOf'unu bozmaz)", !/AVCI BASAMAK YENIDEN OGRETIMI|MINI KONTROL|DIGER OGRENCI IFADELERI|CEVAP ACIKLAMA POLITIKASI|GUVENLI SOHBET OZETI|GERI ADIM SONRASI|KONTROLLU GERI ADIM \(TEKRAR HATA\)|ANLADIM-DEVAM ACIK SORU|YAN SORU SONRASI|BAGLAM ONCELIK|AVCI YEDI ADIM|ANLATIM TARZI|COZUM MODU \/ CEVAPLANDIKTAN/.test(BLOK));
kontrol("15) blok DB/diagnostic/localStorage/ses/mikrofon/ağ/JS enterpolasyonu içermiyor", !/diagnostic_events|avciKokNedenAnalizEt|supabase|localStorage|upsert|rpc|getUserMedia|MediaRecorder|WebSocket|WebRTC|realtime|VAD|auto-send|[`$]\{|`/i.test(BLOK));

// ---- kilitli kurallar sağlam ----
kontrol("16) SOCRATIC, TAHTA, 5J, mini kontrol, TURBO#2-#6 kuralları ve CEVAP ACIKLAMA (sızdırmama) TAM 1 kez mevcut",
  ["SOCRATIC TEK ADIM KURALI (ZORUNLU", "TAHTA ZAMANLAMASI KURALI (ZORUNLU", "AVCI BASAMAK YENIDEN OGRETIMI (EXPLICIT ADIM) KURALI", "MINI KONTROL (MINI SORU) KURALI", "GUVENLI SOHBET OZETI (DERS KAPANISI) KURALI", "KONTROLLU GERI ADIM (TEKRAR HATA) KURALI (ZORUNLU)", "GERI ADIM SONRASI TOPARLANMA KURALI (ZORUNLU", "ANLADIM-DEVAM ACIK SORU KONTROLU KURALI (ZORUNLU", "YAN SORU SONRASI GOREVE DONUS KURALI (ZORUNLU)", "CEVAP ACIKLAMA POLITIKASI (ZORUNLU)", SONRAKI].every(m => P.split(m).length === 2)
  && /Dogru sikki ASLA dogrudan soyleme\./.test(P));

console.log(`\n${toplam - basarisiz}/${toplam} kontrol geçti`);
if (basarisiz > 0) { console.error(`${basarisiz} kontrol BAŞARISIZ`); process.exit(1); }
