// AVCI LESSON CLOSURE SUMMARY MVP (Güvenli Sohbet Özeti). Öğrenci
// "Konuyu ozetle." / "Bugun ne yaptik?" / "Bugun ne calistik?" dediğinde
// AVCI'nin SADECE mevcut konuşmada FİİLEN ele alınanları nötr/olgusal
// dille özetlemesini, KANITSIZ başarı/ustalık iddiasında bulunmamasını ve
// hiçbir veri/durum KAYDETMEMESİNİ doğrular.
//
// TASARIM KARARI (5J ile AYNI): Bu katman TAMAMEN dnavChat() sistem
// promptuna eklenen bir davranış sözleşmesidir — yeni JS fonksiyonu, state,
// API, DB, ses/mikrofon davranışı YOKTUR; api/klod.mjs DEĞİŞMEDİ. Gerçek
// LLM çağrısı yapılamayacağı için test "prompt CONTAINS/EXCLUDES X"
// seviyesinde davranış sözleşmesidir. Gerçek ağa HİÇ çıkılmaz.

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
const SYSTEM_PROMPT = bulSystemPrompt();
const BASLIK = "GUVENLI SOHBET OZETI (DERS KAPANISI) KURALI (ZORUNLU)";
const bas = SYSTEM_PROMPT.indexOf(BASLIK);
const BLOK = SYSTEM_PROMPT.slice(bas, SYSTEM_PROMPT.indexOf("AVCI BASAMAK YENIDEN OGRETIMI", bas));

// ============================================================
// TETİKLEYİCİLER + KONUM
// ============================================================
{
  kontrol("1) kural başlığı prompt'ta TAM OLARAK 1 kez geçiyor", (SYSTEM_PROMPT.match(/GUVENLI SOHBET OZETI \(DERS KAPANISI\) KURALI \(ZORUNLU\)/g) || []).length === 1);
  kontrol("2) üç tetikleyici ifade de tanımlı", /"Konuyu ozetle\."/.test(BLOK) && /"Bugun ne yaptik\?"/.test(BLOK) && /"Bugun ne calistik\?"/.test(BLOK));
  kontrol("3) blok DIGER OGRENCI IFADELERI ile AVCI BASAMAK YENIDEN OGRETIMI arasında (doğru yerde)", SYSTEM_PROMPT.indexOf("DIGER OGRENCI IFADELERI") < bas && bas < SYSTEM_PROMPT.indexOf("AVCI BASAMAK YENIDEN OGRETIMI"));
  kontrol("4) 'Bugunluk yeter.' kuralı hâlâ mevcut ve blokun ÖNCESİNDE (dokunulmadı)", /"Bugunluk yeter\." -> kisa, dogal, nazik bir kapanis cumlesi kur; herhangi bir veri\/durum KAYDETME\./.test(SYSTEM_PROMPT) && SYSTEM_PROMPT.indexOf('"Bugunluk yeter."') < bas);
}

// ============================================================
// KAPSAM: SADECE mevcut konuşma; başarı iddiası / kanıt özeti YOK
// ============================================================
{
  kontrol("5) SADECE mevcut mesaj geçmişinde FİİLEN ele alınanlar özetleniyor", /SADECE bu konusmada \(mevcut mesaj gecmisinde\) FIILEN ele alinan noktalari/.test(BLOK));
  kontrol("6) başarı/ustalık değerlendirmesi OLMADIĞI açık", /Bu bir basari\/ustalik degerlendirmesi DEGILDIR/.test(BLOK));
  kontrol("7) kanıtsız iddia kalıpları ('ogrendin','ustalastin','artik biliyorsun') AÇIKÇA yasak", /"ogrendin", "ustalastin", "artik biliyorsun" gibi KANITSIZ bir basari iddiasinda ASLA bulunma/.test(BLOK));
  kontrol("8) OGRENCI KANIT OZETI ile başarı/zayıflık değerlendirmesi YAPILMIYOR", /OGRENCI KANIT OZETI \(varsa\) kullanilarak bir basari\/zayiflik degerlendirmesi YAPMA/.test(BLOK));
  kontrol("9) boş konuşma (ilk mesaj) durumu: 'henuz ozetlenecek bir sey yok' deniyor", /henuz ozetlenecek bir sey yok/.test(BLOK));
  kontrol("10) 'Bugunluk yeter' ile AYRI olduğu ve içerik özeti içermediği açık", /"Bugunluk yeter" SADECE nazik bir kapanis cumlesidir, icerik ozeti ICERMEZ/.test(BLOK));
}

// ============================================================
// GÜVENLİK: yeni yetenek/veri/kayıt/ses/ağ YOK; cevap anahtarı sızmaz
// ============================================================
{
  kontrol("11) blok veri kaydetme/DB/diagnostic/student-model'e bağlanmıyor", !/diagnostic_events|avciKokNedenAnalizEt|supabase|localStorage|insert|upsert|rpc/i.test(BLOK));
  kontrol("12) blok yeni ses/mikrofon/ağ davranışı içermiyor", !/getUserMedia|MediaRecorder|WebSocket|WebRTC|realtime|VAD|otomatik gonder|auto-send|always-listening/i.test(BLOK));
  kontrol("13) blok JS kodu/şablon enterpolasyonu içermiyor (prompt template literal güvenli)", !/[`$]\{|`/.test(BLOK));
  kontrol("14) mevcut cevap-anahtarı sızdırmama korumaları (TAHTA ZAMANLAMASI + 'Dogru sikki ASLA dogrudan soyleme') prompt'ta korunuyor", /TAHTA ZAMANLAMASI KURALI \(ZORUNLU/.test(SYSTEM_PROMPT) && /Dogru sikki ASLA dogrudan soyleme\./.test(SYSTEM_PROMPT) && /mikro-sorunun cevabini \(orn\. "fiil X kelimesidir"\) dogrudan SOYLEME/.test(SYSTEM_PROMPT));
}

console.log(`\n${toplam - basarisiz}/${toplam} kontrol geçti`);
if (basarisiz > 0) {
  console.error(`${basarisiz} kontrol BAŞARISIZ`);
  process.exit(1);
}
