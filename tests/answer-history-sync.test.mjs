// Öğrenci çözüm sonuçlarının kaydedilmesi + UTM/attribution bağlantısı
// için deterministik testler. Gerçek Supabase'e hiç bağlanılmaz — sadece
// SQL şema dosyası ve index.html'deki client-side hook statik olarak
// doğrulanır.

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

// ---- TEST: supabase/answer-history-schema.sql — mevcut RLS deseniyle uyumlu ----
{
  const sqlPath = path.join(ROOT, "supabase", "answer-history-schema.sql");
  kontrol("1) şema dosyası mevcut", existsSync(sqlPath));
  const sql = existsSync(sqlPath) ? readFileSync(sqlPath, "utf-8") : "";
  kontrol("2) answer_history tablosu tanımlı", /create table if not exists public\.answer_history/.test(sql));
  kontrol("3) user_id, auth.users'a referans veriyor (cascade delete ile)", /user_id uuid not null references auth\.users\(id\) on delete cascade/.test(sql));
  kontrol("4) RLS açık", /alter table public\.answer_history enable row level security/.test(sql));
  kontrol("5) policy SADECE kendi satırına izin veriyor (push_subscriptions ile aynı desen)", /using \(auth\.uid\(\) = user_id\)/.test(sql) && /with check \(auth\.uid\(\) = user_id\)/.test(sql));
  kontrol("6) attribution_* alanları var (UTM/attribution bağlantısı)", ["attribution_source", "attribution_medium", "attribution_campaign", "attribution_signal"].every((k) => sql.includes(k)));
  kontrol("7) dosya bir CREATE POLICY için DROP POLICY IF EXISTS önce çalıştırıyor (idempotent — tekrar çalıştırılabilir)", /drop policy if exists "answer_history_own"/.test(sql));
}

// ---- TEST: index.html — hataSunucuyaSenkronla güvenli şekilde wired ----
{
  const html = readFileSync(path.join(ROOT, "index.html"), "utf-8");

  kontrol("8) hataSunucuyaSenkronla fonksiyonu tanımlı", /function hataSunucuyaSenkronla\(/.test(html));
  kontrol("9) hataEkle içinden çağrılıyor (mevcut localStorage akışından SONRA, ek satır olarak)", /streakSave\(sd\);\s*\n\s*hataSunucuyaSenkronla\(/.test(html));

  // hataSunucuyaSenkronla fonksiyonunun gövdesini izole çıkar (statik analiz için).
  const fnMatch = html.match(/function hataSunucuyaSenkronla\([^)]*\)\{[\s\S]*?\n\}/);
  const fnBody = fnMatch ? fnMatch[0] : "";
  kontrol("10) fonksiyon gövdesi bulundu", fnBody.length > 0);
  kontrol("11) sb/currentUser kontrolü yapılmadan senkron denenmiyor", /if\(!sb\|\|!currentUser\)return;/.test(fnBody));
  kontrol("12) answer_history tablosuna insert ediyor", /sb\.from\(['"]answer_history['"]\)\.insert\(/.test(fnBody));
  kontrol("13) window.SinyalAttribution.context() kullanıyor (attribution bağlantısı)", /window\.SinyalAttribution\.context\(\)/.test(fnBody));
  kontrol("14) Supabase hatası sadece console.warn ile loglanıyor, throw edilmiyor", /\.then\(function\(r\)\{[\s\S]*console\.warn/.test(fnBody) && !/throw/.test(fnBody));
  kontrol("15) network hatası .catch ile sessizce yutuluyor", /\.catch\(function\(\)\{\}\)/.test(fnBody));
  kontrol("16) tüm gövde try/catch ile sarmalı (hataEkle'nin ana akışını asla bozmaz)", /^\s*try\{/.test(fnBody.replace(/^function[^{]*\{/, "")));
  kontrol("17) gönderilen alanlar string(...).slice(...) ile sınırlandırılmış (aşırı büyük veri Supabase'e gitmiyor)", (fnBody.match(/\.slice\(\d+,\s*\d+\)/g) || []).length >= 3);
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
