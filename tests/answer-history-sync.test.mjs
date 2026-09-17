// Öğrenci çözüm sonuçlarının (DOĞRU + YANLIŞ) kaydedilmesi + UTM/
// attribution bağlantısı için deterministik testler. Gerçek Supabase'e
// hiç bağlanılmaz — sadece SQL şema dosyası ve index.html'deki
// client-side kod statik olarak doğrulanır (index.html bir ES modülü
// değil, doğrudan import edilemiyor — bu yüzden repo genelinde
// yerleşik desen budur, bkz. legal-pages/published-content testleri).
//
// 2026-09-17: hataEkle'nin eski, SADECE yanlış cevapları dar bir alan
// setiyle senkronlayan hataSunucuyaSenkronla()'sı, hem doğru hem yanlış
// cevapları zengin bir alan setiyle (question_id/module/is_correct/
// topic/signal/attempt_count) kaydeden cevapKaydet()/
// cevapSunucuyaSenkronla() ile DEĞİŞTİRİLDİ — bu dosya o eski
// mekanizmayı değil, yeni mimariyi test eder.

import { readFileSync, existsSync } from "node:fs";
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

// ---- TEST: supabase/answer-history-schema.sql — zengin alan seti, RLS, RPC ----
{
  const sqlPath = path.join(ROOT, "supabase", "answer-history-schema.sql");
  kontrol("1) şema dosyası mevcut", existsSync(sqlPath));
  const sql = existsSync(sqlPath) ? readFileSync(sqlPath, "utf-8") : "";
  kontrol("2) answer_history tablosu tanımlı", /create table if not exists public\.answer_history/.test(sql));
  kontrol("3) user_id, auth.users'a referans veriyor (cascade delete ile)", /user_id uuid not null references auth\.users\(id\) on delete cascade/.test(sql));
  kontrol(
    "4) istenen zengin alan seti mevcut (question_id/module/selected_option/correct_option/is_correct/topic/signal/attempt_count/response_time_ms)",
    ["question_id", "module", "selected_option", "correct_option", "is_correct", "topic", "signal", "attempt_count", "response_time_ms", "answered_at"].every((k) => sql.includes(k))
  );
  kontrol("5) question_id NULLABLE (not null kısıtı YOK) — 4/5 modülde stable id yok", !/question_id text not null/.test(sql));
  kontrol("6) RLS açık", /alter table public\.answer_history enable row level security/.test(sql));
  kontrol("7) policy SADECE kendi satırına izin veriyor (push_subscriptions ile aynı desen)", /using \(auth\.uid\(\) = user_id\)/.test(sql) && /with check \(auth\.uid\(\) = user_id\)/.test(sql));
  kontrol("8) attribution_* alanları var (UTM/attribution bağlantısı)", ["attribution_source", "attribution_medium", "attribution_campaign", "attribution_signal"].every((k) => sql.includes(k)));
  kontrol("9) dosya idempotent (DROP POLICY IF EXISTS + CREATE OR REPLACE FUNCTION)", /drop policy if exists "answer_history_own"/.test(sql) && /create or replace function public\.record_answer/.test(sql));
  kontrol("10) record_answer SECURITY INVOKER (RLS normal uygulanır)", /security invoker/.test(sql));
  kontrol("11) record_answer user_id'yi PARAMETRE OLARAK ALMIYOR — spoofing imkansız, hep auth.uid()", !/p_user_id/.test(sql) && /auth\.uid\(\)/.test(sql));
  kontrol("12) question_id dolu satırlarda benzersizlik (upsert+attempt_count artışı) için unique index var", /create unique index if not exists answer_history_user_question_idx/.test(sql) && /where question_id is not null/.test(sql));
  kontrol("13) attempt_count çakışmada artıyor (public\\.answer_history\\.attempt_count \\+ 1)", /attempt_count = public\.answer_history\.attempt_count \+ 1/.test(sql));
  kontrol("14) EXECUTE yetkisi sadece authenticated'e veriliyor (anon değil)", /grant execute on function public\.record_answer[\s\S]*?to authenticated/.test(sql));
}

const html = readFileSync(path.join(ROOT, "index.html"), "utf-8");

// ---- TEST: eski dar-kapsamlı mekanizma tamamen kaldırıldı (regresyon kilidi) ----
{
  kontrol("15) eski hataSunucuyaSenkronla fonksiyonu ARTIK YOK (cevapKaydet'e devredildi)", !/function hataSunucuyaSenkronla\(/.test(html));
  kontrol("16) hataEkle artık hataSunucuyaSenkronla ÇAĞIRMIYOR (tekrar saf local)", !/hataSunucuyaSenkronla\(soru/.test(html));
  kontrol("17) eski dar answer_history .from().insert() deseni ARTIK YOK (RPC'ye taşındı)", !/sb\.from\(['"]answer_history['"]\)\.insert\(/.test(html));
}

// ---- TEST: yeni cevapKaydet/cevapGecmisi* katmanı tanımlı ve güvenli ----
{
  kontrol("18) cevapGecmisiLoad/Save tanımlı", /function cevapGecmisiLoad\(\)/.test(html) && /function cevapGecmisiSave\(/.test(html));
  kontrol("19) cevapKaydet tanımlı", /function cevapKaydet\(opts\)/.test(html));
  kontrol("20) cevapSunucuyaSenkronla tanımlı", /function cevapSunucuyaSenkronla\(kayit\)/.test(html));
  kontrol("21) cevapGecmisiOzet tanımlı", /function cevapGecmisiOzet\(\)/.test(html));

  const cevapKaydetMatch = html.match(/function cevapKaydet\(opts\)\{[\s\S]*?\n\}/);
  const cevapKaydetBody = cevapKaydetMatch ? cevapKaydetMatch[0] : "";
  kontrol("22) cevapKaydet gövdesi bulundu", cevapKaydetBody.length > 0);
  kontrol("23) tüm gövde try/catch ile sarmalı (quiz akışını asla bozmaz)", /^function cevapKaydet\(opts\)\{\s*try\{/.test(cevapKaydetBody));
  kontrol("24) questionId varsa ona, yoksa soru metnine göre dedup ediyor (hataEkle ile aynı desen)", /d\.findIndex\(h=>h\.questionId===questionId\)/.test(cevapKaydetBody) && /d\.findIndex\(h=>!h\.questionId&&h\.soru===soru\)/.test(cevapKaydetBody));
  kontrol("25) tekrar denemede attemptCount artıyor", /attemptCount:idx>=0\?\(d\[idx\]\.attemptCount\|\|1\)\+1:1/.test(cevapKaydetBody));
  kontrol("26) log 200 kayıtla sınırlı (sınırsız büyümüyor)", /d\.length>200/.test(cevapKaydetBody) && /d\.slice\(0,200\)/.test(cevapKaydetBody));
  kontrol("27) alanlar string(...).slice(...) ile sınırlandırılmış (aşırı büyük veri Supabase'e gitmiyor)", /\.slice\(0,300\)/.test(cevapKaydetBody) && (cevapKaydetBody.match(/\.slice\(0,200\)/g) || []).length >= 2);

  const senkronMatch = html.match(/function cevapSunucuyaSenkronla\(kayit\)\{[\s\S]*?\n\}/);
  const senkronBody = senkronMatch ? senkronMatch[0] : "";
  kontrol("28) cevapSunucuyaSenkronla gövdesi bulundu", senkronBody.length > 0);
  kontrol("29) tüm gövde try/catch ile sarmalı", /^function cevapSunucuyaSenkronla\(kayit\)\{\s*try\{/.test(senkronBody));
  kontrol("30) sb/currentUser kontrolü yapılmadan senkron denenmiyor", /if\(!sb\|\|!currentUser\)return;/.test(senkronBody));
  kontrol("31) sb.rpc('record_answer', ...) çağrılıyor (RPC deseni, ham .insert() DEĞİL)", /sb\.rpc\(['"]record_answer['"]/.test(senkronBody));
  kontrol("32) window.SinyalAttribution.context() kullanıyor (attribution bağlantısı)", /window\.SinyalAttribution\.context\(\)/.test(senkronBody));
  kontrol("33) Supabase hatası sadece console.warn ile loglanıyor, throw edilmiyor", /\.then\(function\(r\)\{[\s\S]*console\.warn/.test(senkronBody) && !/throw/.test(senkronBody));
  kontrol("34) network hatası .catch ile sessizce yutuluyor", /\.catch\(function\(\)\{\}\)/.test(senkronBody));
}

// ---- TEST: tüm 5 quiz modülü hem DOĞRU hem YANLIŞ cevabı kaydediyor ----
{
  const cevapKaydetCagriSayisi = (html.match(/cevapKaydet\(\{/g) || []).length;
  kontrol("35) cevapKaydet tam olarak 10 kez çağrılıyor (5 modül × doğru+yanlış)", cevapKaydetCagriSayisi === 10, `bulunan: ${cevapKaydetCagriSayisi}`);

  const moduller = ["sinyal", "sat", "kelime", "tuzak", "paragraf"];
  for (const modul of moduller) {
    const regex = new RegExp(`cevapKaydet\\(\\{[^}]*modul:['"]${modul}['"][^}]*isCorrect:true`, "s");
    const regexWrong = new RegExp(`cevapKaydet\\(\\{[^}]*modul:['"]${modul}['"][^}]*isCorrect:false`, "s");
    kontrol(`36.${modul}) doğru cevap dalı kaydediliyor`, regex.test(html));
    kontrol(`37.${modul}) yanlış cevap dalı kaydediliyor`, regexWrong.test(html));
  }

  kontrol("38) Sinyal Lab (dAns) gerçek stable questionId (soru.id) kullanıyor", /cevapKaydet\(\{questionId:soru\.id,modul:['"]sinyal['"]/.test(html));
  kontrol("39) Diğer 4 modül questionId GEÇMİYOR (stable id'leri yok, null bırakılıyor)", (html.match(/cevapKaydet\(\{questionId:soru\.id/g) || []).length === 2);
}

// ---- TEST: cevapGecmisiOzet — veri yoksa UYDURMAZ, null döner ----
{
  const ozetMatch = html.match(/function cevapGecmisiOzet\(\)\{[\s\S]*?\n\}/);
  const ozetBody = ozetMatch ? ozetMatch[0] : "";
  kontrol("40) cevapGecmisiOzet gövdesi bulundu", ozetBody.length > 0);
  kontrol("41) veri yoksa null döner (fabricate etmiyor)", /if\(!d\.length\)return null;/.test(ozetBody));
  kontrol("42) attempts/correct/incorrect/accuracy alanları üretiliyor", ["attempts", "correct", "incorrect", "accuracy"].every((k) => ozetBody.includes(k)));
  kontrol("43) recentAccuracy (son 20 cevaba göre) üretiliyor", /recentAccuracy/.test(ozetBody));
}

// ---- TEST: sinavZayifAlanAnalizi() artık cevapGecmisiOzet'e BAĞLI, ama eski davranış FALLBACK olarak korunuyor ----
{
  const fnMatch = html.match(/function sinavZayifAlanAnalizi\(\)\{[\s\S]*?\n\}/);
  const fnBody = fnMatch ? fnMatch[0] : "";
  kontrol("44) fonksiyon gövdesi bulundu", fnBody.length > 0);
  kontrol("44b) cevapGecmisiOzet() ile bağlandı (yeni, isabetli seçim)", /cevapGecmisiOzet\(\)/.test(fnBody));
  kontrol(
    "44c) eski hataLoad()-bazlı davranış (hatalar.length>=3 eşiği, kaynak:'gercek'/'tahmini') FALLBACK olarak hâlâ mevcut",
    /hatalar\.length>=3/.test(fnBody) && /kaynak:['"]gercek['"]/.test(fnBody) && /kaynak:['"]tahmini['"]/.test(fnBody)
  );
  kontrol("44d) yeterli cevap geçmişi yoksa (toplamCevap<3) yeni dala hiç girilmiyor — eski davranışa düşülüyor", /cgOzet&&cgOzet\.toplamCevap>=3/.test(fnBody));
  kontrol("44e) dönen şekil DEĞİŞMEDİ — her iki dal da {etiket,gorev,mod,adet} taşıyan SP_ZAYIF_GOREV nesnelerini kullanıyor", (fnBody.match(/SP_ZAYIF_GOREV/g) || []).length >= 2);
  kontrol("44f) sinavPlanimOlustur çağrı şekli DEĞİŞMEDİ (tek, parametresiz çağrı)", /const zayif=sinavZayifAlanAnalizi\(\);/.test(html));
}

// ---- TEST: dashboard/İstatistiklerim paneli güvenli şekilde wired ----
{
  kontrol("45) ist-cevap-gecmisi-panel HTML'i mevcut, varsayılan GİZLİ", /id="ist-cevap-gecmisi-panel" style="display:none"/.test(html));
  const renderMatch = html.match(/function istatistikRender\(\)\{[\s\S]*?\n\}/);
  const renderBody = renderMatch ? renderMatch[0] : "";
  kontrol("46) istatistikRender içinde cevapGecmisiOzet çağrılıyor", /cevapGecmisiOzet\(\)/.test(renderBody));
  kontrol("47) veri yoksa panel gizleniyor (UYDURMA yok), varsa gösteriliyor", /if\(!cgOzet\)\{[\s\S]{0,60}?cgPanel\.style\.display='none';/.test(renderBody) && /cgPanel\.style\.display='block';/.test(renderBody));
  kontrol("48) son cevaplar listesi gösteriliyor", /ist-son-cevaplar/.test(renderBody));
  kontrol("49) attribution kaynağı gösteriliyor", /ist-attribution-kaynak/.test(renderBody) && /window\.SinyalAttribution\.context\(\)/.test(renderBody));
}

// ---- TEST: hiçbir yerde secret/token loglanmıyor (güvenlik regresyon kilidi) ----
{
  const yasakliLogPattern = /console\.(log|error|info|warn)\([^)]*\b(clientSecret|refreshToken|accessToken|serviceRoleKey|SUPABASE_KEY)\b/;
  kontrol("50) yeni kodda secret/token değişkeni console'a yazılmıyor", !yasakliLogPattern.test(html.slice(html.indexOf("CEVAP GEÇMİŞİ"), html.indexOf("function hataCountGuncelle"))));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
