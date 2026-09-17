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

  // 2026-09-17 denetiminde bulunan savunma-derinliği eksikliği: PostgreSQL
  // yeni fonksiyonlara varsayılan olarak PUBLIC'e EXECUTE veriyor — bu
  // yüzden REVOKE FROM PUBLIC, GRANT TO authenticated'DEN ÖNCE gelmeli
  // (update_lesson_progress RPC'siyle AYNI desen).
  const revokeIdx = sql.indexOf("revoke execute on function public.record_answer");
  const grantIdx = sql.indexOf("grant execute on function public.record_answer");
  kontrol("14b) REVOKE EXECUTE ... FROM PUBLIC satırı mevcut", revokeIdx !== -1);
  kontrol("14c) REVOKE, GRANT'ten ÖNCE geliyor (sıra önemli)", revokeIdx !== -1 && grantIdx !== -1 && revokeIdx < grantIdx);
  kontrol("14d) REVOKE'un imzası GRANT'inkiyle BİREBİR aynı (13 parametre, aynı sırada)", (() => {
    const revokeBlok = sql.slice(revokeIdx, sql.indexOf(";", revokeIdx));
    const grantBlok = sql.slice(grantIdx, sql.indexOf(";", grantIdx));
    const imzaCikar = (b) => (b.match(/\(([\s\S]*?)\)\s*(from|to)/)?.[1] || "").replace(/\s+/g, " ").trim();
    const revokeImza = imzaCikar(revokeBlok);
    const grantImza = imzaCikar(grantBlok);
    return revokeImza.length > 0 && revokeImza === grantImza;
  })());
  kontrol("14e) REVOKE 'from public' hedefliyor", /revoke execute on function public\.record_answer[\s\S]*?from public/.test(sql));
}

// ---- TEST: rollback dosyası — SADECE bu migration'ın 2 nesnesini geri alıyor ----
{
  const rollbackPath = path.join(ROOT, "supabase", "answer-history-schema-rollback.sql");
  kontrol("14f) rollback dosyası mevcut", existsSync(rollbackPath));
  const rb = existsSync(rollbackPath) ? readFileSync(rollbackPath, "utf-8") : "";
  kontrol("14g) record_answer fonksiyonunu (tam imzayla) geri alıyor", /drop function if exists public\.record_answer\(/.test(rb));
  kontrol("14h) answer_history tablosunu geri alıyor", /drop table if exists public\.answer_history cascade/.test(rb));
  kontrol("14i) IF EXISTS koruması var (idempotent — dosya zaten geri alınmışsa hata vermez)", /drop function if exists/.test(rb) && /drop table if exists/.test(rb));
  {
    // Yorum satırlarını (-- ile başlayan) at — sadece GERÇEK SQL kodunda
    // başka tablo adı geçip geçmediğini kontrol et (açıklama metninde
    // "profiles, emails, ... ETKİLENMEZ" gibi doğal bir şekilde geçmesi
    // yanlış pozitif üretmesin).
    const sadeceKod = rb
      .split("\n")
      .filter((satir) => !satir.trim().startsWith("--"))
      .join("\n");
    kontrol(
      "14j) BAŞKA HİÇBİR tabloya/nesneye dokunmuyor (gerçek SQL kodunda profiles/emails/testimonials/push_subscriptions/user_activity adı geçmiyor)",
      !["profiles", "emails", "testimonials", "push_subscriptions", "user_activity", "leaderboard", "dilavcisi"].some((t) => new RegExp(`\\b${t}\\b`).test(sadeceKod))
    );
  }
  kontrol("14k) rollback dosyasında sadece 2 DROP ifadesi var (fazlası yok)", (rb.match(/^drop /gm) || []).length === 2);
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
  kontrol("30) sb yoksa (client hazır değilse) graceful skip", /if\(!sb\)\{/.test(senkronBody));
  kontrol(
    "30a) sb yoksa artık SESSİZ DEĞİL — güvenli, tanımlı bir teşhis mesajıyla skip ediliyor (2026-09-17 production teşhisi: eskiden hiçbir iz bırakmadan çıkıyordu)",
    /if\(!sb\)\{console\.warn\('\[answer-history\] sync skipped: supabase client not ready'\);return;\}/.test(senkronBody)
  );
  kontrol("31) sb.rpc('record_answer', ...) çağrılıyor (RPC deseni, ham .insert() DEĞİL)", /sb\.rpc\(['"]record_answer['"]/.test(senkronBody));
  kontrol("32) window.SinyalAttribution.context() kullanıyor (attribution bağlantısı)", /window\.SinyalAttribution\.context\(\)/.test(senkronBody));
  kontrol("33) RPC hatası await ile yakalanıp sadece console.warn ile loglanıyor, throw edilmiyor", /const r=await sb\.rpc\(['"]record_answer['"]/.test(senkronBody) && /if\(r&&r\.error\)\{/.test(senkronBody) && /console\.warn/.test(senkronBody) && !/throw/.test(senkronBody));
  kontrol("34) eski sessiz-yutan .catch(function(){}) deseni KALDIRILDI (regresyon kilidi)", !/\.catch\(function\(\)\{\}\)/.test(senkronBody));

  // 2026-09-17 AUTH RACE FIX — currentUser sadece onAuthStateChange'de
  // (asenkron) set edildiği için, sayfa açılır açılmaz/hızlı cevapta
  // hâlâ null olabiliyordu ve eskiden RPC hiç denenmeden, hiçbir log
  // olmadan sessizce atlanıyordu. Artık currentUser boşsa BİR KEZ
  // sb.auth.getSession() ile gerçek session kontrol ediliyor.
  kontrol("30b) fonksiyon async (getSession'ı await edebilmek için)", /async function cevapSunucuyaSenkronla\(kayit\)\{/.test(html));
  kontrol("30c) currentUser doluysa DOĞRUDAN kullanılıyor (gereksiz getSession çağrısı yok)", /let user=currentUser;/.test(senkronBody));
  kontrol("30d) currentUser boşsa BİR KEZ sb.auth.getSession() ile fallback kontrol ediliyor", /if\(!user\)\{[\s\S]*?await sb\.auth\.getSession\(\)/.test(senkronBody));
  kontrol(
    "30e) getSession sonucu GERÇEK session'da user varsa currentUser güncellenip devam ediliyor (sonraki cevaplarda race kapanıyor)",
    /if\(!session\|\|!session\.user\)\{/.test(senkronBody) && /user=session\.user;/.test(senkronBody) && /currentUser=user;/.test(senkronBody)
  );
  kontrol(
    "30f) session yoksa (gerçek misafir) güvenli, tanımlı bir mesajla skip ediliyor — RPC HİÇ çağrılmıyor",
    /console\.warn\('\[answer-history\] sync skipped: no authenticated session'\)/.test(senkronBody)
  );
  {
    // Guest-skip mesajının RPC çağrısından ÖNCE (kod akışında daha erken)
    // geldiğini doğrula — yani gerçekten RPC'ye hiç ulaşılmadan return ediliyor.
    const guestSkipIdx = senkronBody.indexOf("no authenticated session");
    const rpcIdx = senkronBody.indexOf("sb.rpc('record_answer'");
    kontrol("30g) guest-skip mesajı RPC çağrısından ÖNCE geliyor (RPC'ye hiç ulaşılmıyor)", guestSkipIdx !== -1 && rpcIdx !== -1 && guestSkipIdx < rpcIdx);
  }
  kontrol(
    "30h) getSession'ın kendisi hata verirse (network/exception) KENDİ try/catch'i içinde güvenli mesajla yakalanıp return ediliyor — dışarı fırlatılmıyor",
    /try\{\s*const \{ data \} = await sb\.auth\.getSession\(\);[\s\S]*?\}catch\(e\)\{\s*console\.warn\('\[answer-history\] sync skipped: session check failed'\);\s*return;\s*\}/.test(senkronBody)
  );
  kontrol(
    "33b) RPC hata logu SADECE güvenli alanları içeriyor (code/status/reason) — session/token/email/id YOK",
    /console\.warn\('\[answer-history\] sync failed:',\{code:r\.error\.code\|\|null,status:r\.status\|\|null,reason:r\.error\.message\|\|null\}\)/.test(senkronBody)
  );
  kontrol(
    "34b) dış catch de güvenli (session/token/email/id İÇERMEYEN) bir mesajla loglanıyor, dışarı rethrow YOK",
    /\}catch\(e\)\{\s*console\.warn\('\[answer-history\] sync failed:',\{code:e&&e\.code\|\|null,status:null,reason:'unexpected error'\}\);\s*\}\s*\}$/.test(senkronBody)
  );
  kontrol(
    "34c) senkronBody içinde access_token/refresh_token/email/user nesnesinin tamamı HİÇBİR yerde loglanmıyor (mesaj METNİNDE 'session' kelimesi geçmesi sorun değil — sadece gerçek token/credential referansları yasak)",
    !/access_token|refresh_token|\.email\b|JSON\.stringify\((session|user|r|e)\)|console\.(warn|log|error)\([^)]*,\s*(session|user|currentUser)\s*[,)]/.test(senkronBody)
  );
  kontrol(
    "34d) cevapKaydet çağrı noktası HÂLÂ await ETMİYOR (fire-and-forget) — async dönüşüm quiz akışını bloklamıyor",
    /cevapSunucuyaSenkronla\(kayit\);/.test(html) && !/await cevapSunucuyaSenkronla\(kayit\)/.test(html)
  );
  kontrol("34e) cevapKaydet KENDİSİ async DEĞİL (senkron quiz akışı korunuyor)", /^function cevapKaydet\(opts\)\{/m.test(html) && !/async function cevapKaydet/.test(html));
  kontrol(
    "34f) RPC'ye giden 13 p_* parametre seti DEĞİŞMEDİ (regresyon kilidi)",
    ["p_question_id", "p_module", "p_soru", "p_selected_option", "p_correct_option", "p_is_correct", "p_topic", "p_signal", "p_response_time_ms", "p_attribution_source", "p_attribution_medium", "p_attribution_campaign", "p_attribution_signal"].every((k) => senkronBody.includes(k + ":"))
  );
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

// ---- TEST: production teşhisinde bulunan _sbInit() zafiyeti — Supabase SDK
// (cdn.jsdelivr.net, defer) DOMContentLoaded'a kadar yüklenemezse `sb` SESSİZCE
// ve KALICI OLARAK tanımsız kalıyordu (ReferenceError try/catch'siz fırlıyordu,
// answer-history hiçbir iz bırakmadan skip ediyordu). Artık kısa aralıklarla
// birkaç kez retry ediliyor, tükenirse güvenli bir teşhis logu üretiliyor. ----
{
  kontrol("39b) production teşhisi: index.html'de sadece TEK bir cevapKaydet/cevapSunucuyaSenkronla/_sbInit tanımı var (duplicate/override YOK)", (() => {
    const sayimlar = {
      "function cevapKaydet\\(opts\\)": (html.match(/function cevapKaydet\(opts\)/g) || []).length,
      "function cevapSunucuyaSenkronla\\(kayit\\)": (html.match(/function cevapSunucuyaSenkronla\(kayit\)/g) || []).length,
      "function _sbInit\\(\\)": (html.match(/function _sbInit\(\)/g) || []).length,
      "function dAns\\(": (html.match(/function dAns\(/g) || []).length,
    };
    return Object.values(sayimlar).every((n) => n === 1);
  })());

  const sbInitMatch = html.match(/function _sbInit\(\)\{[\s\S]*?\n\}/);
  const sbInitBody = sbInitMatch ? sbInitMatch[0] : "";
  kontrol("39c) _sbInit gövdesi bulundu", sbInitBody.length > 0);
  kontrol(
    "39d) supabase SDK henüz hazır değilse artık DOĞRUDAN createClient çağırıp patlamıyor — önce typeof kontrolü var",
    /^function _sbInit\(\)\{\s*if\(typeof supabase==='undefined'\)\{/.test(sbInitBody)
  );
  kontrol("39e) hazır değilse sınırlı sayıda (kaçmayan bir sayaçla) kısa aralıklarla retry ediyor", /_sbInit\._retries=\(_sbInit\._retries\|\|0\)\+1;/.test(sbInitBody) && /setTimeout\(_sbInit,300\)/.test(sbInitBody));
  kontrol("39f) retry sınırı VAR (sonsuz döngü değil)", /if\(_sbInit\._retries<=10\)\{setTimeout\(_sbInit,300\);return;\}/.test(sbInitBody));
  kontrol(
    "39g) retry tükenirse güvenli, tanımlı bir teşhis mesajıyla vazgeçiliyor (secret/token YOK)",
    /console\.warn\('\[answer-history\] sync skipped: supabase client not ready'\);\s*return;/.test(sbInitBody)
  );
  kontrol("39h) supabase gerçekten hazırsa eski davranış AYNEN korunuyor (createClient + onAuthStateChange)", /sb=supabase\.createClient\(SUPABASE_URL,SUPABASE_KEY\);/.test(sbInitBody) && /sb\.auth\.onAuthStateChange\(/.test(sbInitBody));
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
