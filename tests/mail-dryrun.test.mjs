// api/mail.mjs için mock/dry-run testler. Gerçek Resend/Supabase ağına
// HİÇ çıkılmaz — global fetch geçici olarak sahte bir implementasyonla
// değiştirilir (her testten sonra orijinaline geri döndürülür). Gerçek
// e-posta gönderilmez, gerçek credential kullanılmaz — sadece sahte,
// gerçek olmayan env değerleri kullanılır (network hiç çağrılmadığı
// için değerleri önemsiz).

import handler from "../api/mail.mjs";
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

function sahteRes() {
  const res = { _status: null, _json: null };
  res.status = (s) => {
    res._status = s;
    return res;
  };
  res.json = (j) => {
    res._json = j;
    return res;
  };
  res.setHeader = () => {};
  return res;
}

function sahteReq(body, { ip = "1.2.3.4" } = {}) {
  return { method: "POST", body, headers: { "x-forwarded-for": ip } };
}

const orijinalFetch = globalThis.fetch;
function fetchMockKur(impl) {
  globalThis.fetch = impl;
}
function fetchMockTemizle() {
  globalThis.fetch = orijinalFetch;
}

// ---- TEST: geçersiz e-posta → 400, hiç ağa çıkmıyor ----
{
  let fetchCagrildi = false;
  fetchMockKur(async () => {
    fetchCagrildi = true;
    throw new Error("fetch çağrılmamalıydı");
  });
  const res = sahteRes();
  await handler(sahteReq({ email: "gecersiz-eposta" }, { ip: "10.0.0.1" }), res);
  kontrol("1) geçersiz e-posta 400 döner", res._status === 400);
  kontrol("2) geçersiz e-postada hiç ağa çıkılmıyor", !fetchCagrildi);
  fetchMockTemizle();
}

// ---- TEST: sadece POST kabul ediyor ----
{
  const res = sahteRes();
  await handler({ method: "GET" }, res);
  kontrol("3) GET isteği 405 döner", res._status === 405);
}

// ---- TEST: Supabase kaydı + Resend gönderimi İKİSİ DE başarılı → 200, mailSent:true ----
{
  const orijinalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const orijinalResendKey = process.env.RESEND_API_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "sahte-test-degeri-gercek-degil";
  process.env.RESEND_API_KEY = "sahte-test-degeri-gercek-degil";

  const gorulenIstekler = [];
  fetchMockKur(async (url, opts) => {
    gorulenIstekler.push(String(url));
    if (String(url).includes("supabase.co")) return { ok: true, text: async () => "" };
    if (String(url).includes("resend.com")) return { ok: true, json: async () => ({ id: "sahte-mail-id" }) };
    throw new Error("beklenmeyen istek: " + url);
  });

  const res = sahteRes();
  await handler(sahteReq({ email: "test@example.com", tip: "ekitap" }, { ip: "10.0.0.2" }), res);
  kontrol("4) her ikisi de başarılıysa 200 döner", res._status === 200);
  kontrol("5) mailSent:true döner", res._json?.mailSent === true);
  kontrol("6) success:true döner", res._json?.success === true);
  kontrol("7) hem Supabase hem Resend'e istek atıldı (dry-run, gerçek yanıt değil)", gorulenIstekler.some((u) => u.includes("supabase.co")) && gorulenIstekler.some((u) => u.includes("resend.com")));

  fetchMockTemizle();
  process.env.SUPABASE_SERVICE_ROLE_KEY = orijinalKey;
  process.env.RESEND_API_KEY = orijinalResendKey;
}

// ---- TEST: SUPABASE_SERVICE_ROLE_KEY tanımlı DEĞİLKEN de çökmüyor (graceful) ----
{
  const orijinalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  fetchMockKur(async (url) => {
    if (String(url).includes("resend.com")) return { ok: true, json: async () => ({ id: "sahte-mail-id" }) };
    throw new Error("Supabase'e hiç istek atılmamalıydı (key yok)");
  });

  const res = sahteRes();
  await handler(sahteReq({ email: "test2@example.com" }, { ip: "10.0.0.3" }), res);
  kontrol("8) SUPABASE_SERVICE_ROLE_KEY yokken Supabase'e istek atılmıyor, ama çökmüyor", res._status === 200);
  kontrol("9) Resend yine de denenip başarılı olduğu için mailSent:true", res._json?.mailSent === true);

  fetchMockTemizle();
  process.env.SUPABASE_SERVICE_ROLE_KEY = orijinalKey;
}

// ---- TEST: HEM Supabase HEM Resend başarısız → 502 (gerçekten hiçbir şey başarılamadı) ----
{
  const orijinalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "sahte-test-degeri-gercek-degil";

  fetchMockKur(async (url) => {
    if (String(url).includes("supabase.co")) return { ok: false, text: async () => "hata" };
    if (String(url).includes("resend.com")) return { ok: false, json: async () => ({ message: "hata" }) };
    throw new Error("beklenmeyen istek: " + url);
  });

  const res = sahteRes();
  await handler(sahteReq({ email: "test3@example.com" }, { ip: "10.0.0.4" }), res);
  kontrol("10) ikisi de başarısızsa 502 döner", res._status === 502);

  fetchMockTemizle();
  process.env.SUPABASE_SERVICE_ROLE_KEY = orijinalKey;
}

// ---- TEST: rate limit — aynı IP'den 3'ten fazla istek 429 döner ----
{
  fetchMockKur(async () => ({ ok: true, json: async () => ({ id: "x" }), text: async () => "" }));
  const ip = "10.0.0.5";
  let sonRes;
  for (let i = 0; i < 4; i++) {
    sonRes = sahteRes();
    await handler(sahteReq({ email: "ratelimit@example.com" }, { ip }), sonRes);
  }
  kontrol("11) aynı IP'den 4. istek 429 döner (rate limit çalışıyor)", sonRes._status === 429);
  fetchMockTemizle();
}

// ---- TEST: konular/icerikler anahtar tutarlılığı (2026-09-17 hosgeldin bug'ının regresyon kilidi) ----
{
  const src = readFileSync(path.join(ROOT, "api", "mail.mjs"), "utf-8");
  const konularMatch = src.match(/const konular = \{([\s\S]*?)\};/);
  const iceriklerMatch = src.match(/const icerikler = \{([\s\S]*?)\n  \};/);
  const konularAnahtarlari = [...(konularMatch?.[1].matchAll(/^\s*(\w+):/gm) ?? [])].map((m) => m[1]);
  const iceriklerAnahtarlari = [...(iceriklerMatch?.[1].matchAll(/^\s*(\w+): `/gm) ?? [])].map((m) => m[1]);
  kontrol("12) konular içinde en az 2 anahtar bulundu (ekitap, hosgeldin)", konularAnahtarlari.length >= 2, JSON.stringify(konularAnahtarlari));
  kontrol(
    "13) konular'daki HER anahtarın icerikler'de karşılığı var (2026-09-17'de hosgeldin için eksikti, düzeltildi)",
    konularAnahtarlari.every((k) => iceriklerAnahtarlari.includes(k)),
    `konular: ${JSON.stringify(konularAnahtarlari)}, icerikler: ${JSON.stringify(iceriklerAnahtarlari)}`
  );
}

// ---- TEST: hiçbir secret literal hardcoded değil (sadece process.env üzerinden) ----
{
  const src = readFileSync(path.join(ROOT, "api", "mail.mjs"), "utf-8");
  kontrol("14) RESEND_API_KEY sadece process.env üzerinden okunuyor", /process\.env\.RESEND_API_KEY/.test(src) && !/RESEND_API_KEY\s*=\s*["'][A-Za-z0-9]/.test(src));
  kontrol("15) SUPABASE_SERVICE_ROLE_KEY sadece process.env üzerinden okunuyor", /process\.env\.SUPABASE_SERVICE_ROLE_KEY/.test(src));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
