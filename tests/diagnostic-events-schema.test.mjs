// AVCI Hata Kökü Motoru (Katman 4) — davranışsal kanıt köprüsünün SQL
// şema hazırlığı için statik testler. Gerçek Supabase'e HİÇ bağlanılmaz
// — bu repo genelinde SQL için yerleşik desen budur (bkz. answer-history
// şema testleri): sadece dosya metni üzerinde regex/yapısal doğrulama.
// Bu migration ÇALIŞTIRILMADI — sadece dosya hazırlığı test ediliyor.

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

function sadeceKodSatirlari(sql) {
  return sql
    .split("\n")
    .filter((satir) => !satir.trim().startsWith("--"))
    .join("\n");
}

function parenDengeli(sql) {
  // Yorum satırlarını (-- ile başlayan) at — parantez dengesini yorumdaki
  // örnek kod parçaları (backtick içindeki `exists(...)` gibi) bozmasın.
  const kod = sql
    .split("\n")
    .filter((satir) => !satir.trim().startsWith("--"))
    .join("\n");
  let derinlik = 0;
  for (const ch of kod) {
    if (ch === "(") derinlik++;
    if (ch === ")") derinlik--;
    if (derinlik < 0) return false;
  }
  return derinlik === 0;
}

// ---- TEST: diagnostic-events-schema.sql — tablo, constraint, RLS, index ----
const sqlPath = path.join(ROOT, "supabase", "diagnostic-events-schema.sql");
kontrol("1) şema dosyası mevcut", existsSync(sqlPath));
const sql = existsSync(sqlPath) ? readFileSync(sqlPath, "utf-8") : "";
{
  kontrol("2) SQL kodunda parantezler dengeli (yorumlar hariç)", parenDengeli(sql));
  kontrol("3) diagnostic_events tablosu idempotent oluşturuluyor (create table if not exists)", /create table if not exists public\.diagnostic_events/.test(sql));
  kontrol("4) id uuid primary key + gen_random_uuid() (mevcut proje standardı)", /id uuid primary key default gen_random_uuid\(\)/.test(sql));
  kontrol("5) user_id auth.users'a referans veriyor, cascade delete ile (answer_history ile AYNI desen)", /user_id uuid not null references auth\.users\(id\) on delete cascade/.test(sql));
  kontrol("6) answer_history_id public.answer_history(id)'ye referans veriyor, cascade delete ile", /answer_history_id uuid references public\.answer_history\(id\) on delete cascade/.test(sql));
  kontrol("7) answer_history_id NULLABLE (not null KISITI yok — her teşhis olayı bir cevaba bağlı olmak zorunda değil)", !/answer_history_id uuid not null/.test(sql));
  kontrol("8) question_id NULLABLE (answer_history'deki question_id ile AYNI ilke)", /question_id text,/.test(sql) && !/question_id text not null/.test(sql));
  kontrol("9) created_at timestamptz + now() (mevcut proje standardı)", /created_at timestamptz not null default now\(\)/.test(sql));

  // self_report_reason / micro_test_type — serbest metin DEĞİL, sabit CHECK listeli
  kontrol(
    "10) self_report_reason SADECE 5 sabit değere (veya NULL'a) sınırlı — serbest metin DEĞİL",
    /self_report_reason text check \(\s*self_report_reason is null or self_report_reason in \(\s*'VOCAB_BLOCK', 'SIGNAL_MISSED', 'RULE_UNKNOWN', 'TWO_OPTIONS', 'GUESSED'\s*\)\s*\)/.test(sql)
  );
  kontrol(
    "11) micro_test_type SADECE 2 sabit değere (veya NULL'a) sınırlı — serbest metin DEĞİL",
    /micro_test_type text check \(\s*micro_test_type is null or micro_test_type in \(\s*'SIGNAL_SELECT', 'OPTION_ELIMINATION'\s*\)\s*\)/.test(sql)
  );
  kontrol(
    "12) GERÇEK SQL KODUNDA 'SKIPPED' gibi bir sentinel string YOK — atlama NULL ile temsil ediliyor (yorumdaki gerekçe açıklaması hariç)",
    !/'SKIPPED'/.test(sadeceKodSatirlari(sql))
  );
  kontrol("13) micro_test_correct boolean, DEFAULT YOK (test yapılmadıysa NULL kalır, asla varsayılan true/false üretilmez)", /micro_test_correct boolean,/.test(sql) && !/micro_test_correct boolean default/.test(sql));
  kontrol("14) micro_test_selected serbest metin (ham veri — enum'la sınırlanmadı, answer_history.selected_option ile AYNI ilke)", /micro_test_selected text,/.test(sql));

  kontrol("15) RLS açık", /alter table public\.diagnostic_events enable row level security/.test(sql));
  kontrol(
    "16) policy SADECE kendi satırına izin veriyor (answer_history/push_subscriptions/user_activity ile AYNI desen — for all + using/with check auth.uid()=user_id)",
    /create policy "diagnostic_events_own"\s*\n\s*on public\.diagnostic_events for all\s*\n\s*to authenticated\s*\n\s*using \(auth\.uid\(\) = user_id\)\s*\n\s*with check \(auth\.uid\(\) = user_id\)/.test(sql)
  );
  kontrol("17) dosya idempotent (drop policy if exists + create table/index if not exists)", /drop policy if exists "diagnostic_events_own"/.test(sql) && (sql.match(/create index if not exists/g) || []).length === 2);
  kontrol("18) user_id+created_at composite index var (beklenen 'kendi son olaylarım' sorgusu için)", /create index if not exists diagnostic_events_user_id_created_at_idx\s*\n\s*on public\.diagnostic_events\(user_id, created_at desc\)/.test(sql));
  kontrol("19) answer_history_id index var (FK/cascade performansı için)", /create index if not exists diagnostic_events_answer_history_id_idx\s*\n\s*on public\.diagnostic_events\(answer_history_id\)/.test(sql));
  kontrol("20) question_id için AYRI bir index YOK (gereksiz index üretilmedi — hiçbir planlanan sorgu bunu tek başına kullanmıyor)", !/create index if not exists diagnostic_events_question_id_idx/.test(sql));
  kontrol("21) tablo seviyesinde açık grant/revoke YOK (mevcut proje deseni — RLS + Supabase platform varsayılanı yeterli)", !/^grant /im.test(sql) && !/^revoke /im.test(sql));
  kontrol("22) SECURITY DEFINER/INVOKER fonksiyon tanımı YOK (bu dosya SADECE tablo — RPC ayrı bir işe bırakıldı)", !/create (or replace )?function/i.test(sql));
}

// ---- TEST: rollback dosyası — SADECE diagnostic_events'i geri alıyor ----
{
  const rollbackPath = path.join(ROOT, "supabase", "diagnostic-events-schema-rollback.sql");
  kontrol("23) rollback dosyası mevcut", existsSync(rollbackPath));
  const rb = existsSync(rollbackPath) ? readFileSync(rollbackPath, "utf-8") : "";
  kontrol("24) parantezler dengeli", parenDengeli(rb));
  kontrol("25) diagnostic_events tablosunu geri alıyor (IF EXISTS + CASCADE)", /drop table if exists public\.diagnostic_events cascade/.test(rb));
  {
    const sadeceKod = rb
      .split("\n")
      .filter((satir) => !satir.trim().startsWith("--"))
      .join("\n");
    kontrol(
      "26) BAŞKA HİÇBİR tabloya/nesneye dokunmuyor (gerçek SQL kodunda answer_history/profiles/emails/testimonials/push_subscriptions/user_activity adı geçmiyor)",
      !["answer_history", "profiles", "emails", "testimonials", "push_subscriptions", "user_activity", "leaderboard", "dilavcisi"].some((t) => new RegExp(`\\b${t}\\b`).test(sadeceKod))
    );
  }
  kontrol("27) rollback dosyasında sadece 1 DROP ifadesi var (fazlası yok)", (rb.match(/^drop /gm) || []).length === 1);
}

// ---- TEST: mevcut projeyle çakışma denetimi (isim/policy/index/tablo) ----
{
  const supabaseDir = path.join(ROOT, "supabase");
  const digerDosyalar = [
    "answer-history-schema.sql",
    "dilavcisi-sync-schema.sql",
    "emails-schema.sql",
    "leaderboard-schema.sql",
    "notifications-schema.sql",
    "profiles-lesson-progress.sql",
    "profiles-rls.sql",
    "testimonials-schema.sql",
  ];
  const digerIcerik = digerDosyalar.map((d) => readFileSync(path.join(supabaseDir, d), "utf-8")).join("\n");
  kontrol("28) 'diagnostic_events' adı BAŞKA HİÇBİR mevcut şema dosyasında geçmiyor (tablo adı çakışması yok)", !/diagnostic_events/.test(digerIcerik));
  kontrol("29) 'diagnostic_events_own' policy adı BAŞKA HİÇBİR mevcut şema dosyasında geçmiyor", !/diagnostic_events_own/.test(digerIcerik));
  kontrol(
    "30) yeni index adları (user_id_created_at_idx / answer_history_id_idx) BAŞKA HİÇBİR mevcut şema dosyasında geçmiyor",
    !/diagnostic_events_user_id_created_at_idx/.test(digerIcerik) && !/diagnostic_events_answer_history_id_idx/.test(digerIcerik)
  );
}

// ---- TEST: answer_history/record_answer/RLS'e DOKUNULMADI (bu PR'ın sınırı) ----
{
  const answerHistorySql = readFileSync(path.join(ROOT, "supabase", "answer-history-schema.sql"), "utf-8");
  kontrol("31) answer-history-schema.sql'de 'diagnostic' kelimesi hiç geçmiyor (o dosyaya HİÇ dokunulmadı)", !/diagnostic/i.test(answerHistorySql));
  kontrol("32) record_answer fonksiyon imzası (13 parametre) HÂLÂ AYNI — bu dosya onu değiştirmedi", /create or replace function public\.record_answer\(\s*p_question_id text,\s*p_module text,\s*p_soru text,\s*p_selected_option text,\s*p_correct_option text,\s*p_is_correct boolean,\s*p_topic text,\s*p_signal text,\s*p_response_time_ms int,\s*p_attribution_source text,\s*p_attribution_medium text,\s*p_attribution_campaign text,\s*p_attribution_signal text\s*\)/.test(answerHistorySql));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
