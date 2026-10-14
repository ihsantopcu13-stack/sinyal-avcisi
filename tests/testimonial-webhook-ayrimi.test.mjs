// /api/testimonial-bildirim webhook'u ile admin yorum işlemlerinin AYRIMI.
// Webhook isteği (yönlendirme ya da x-webhook-secret başlığı) yalnız Telegram
// bildirimine ulaşabilir; onayla/reddet/listele (Supabase) koduna asla girmez.
// Admin yolunun yetki kontrolü (giriş + ADMIN_EMAILS) aynen çalışır.
// vercel.json yönlendirmesi ve fonksiyon sayısı (Hobby: en fazla 12) da denetlenir.
// Ağ çağrısı yok: global fetch sahte.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import adminHandler, { webhookIstegiMi } from "../api/admin-testimonials.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const SIR = "webhook-gizli-anahtar-xyz";
const ADMIN_TOKEN = "admin-oturum-token";
const KULLANICI_TOKEN = "normal-oturum-token";
Object.assign(process.env, {
  SUPABASE_SERVICE_ROLE_KEY: "svc-rol-anahtari",
  ADMIN_EMAILS: "admin@ornek.com",
  TESTIMONIAL_WEBHOOK_SECRET: SIR,
  TELEGRAM_BOT_TOKEN: "111:BOT",
  TELEGRAM_ADMIN_CHAT_ID: "42",
});

// Sahte fetch: Supabase auth (token → e-posta), Supabase REST ve Telegram çağrılarını kaydeder
let cagrilar = [];
globalThis.fetch = async (url, secenek = {}) => {
  cagrilar.push({ url: String(url), method: secenek.method || "GET" });
  const u = String(url);
  if (u.includes("/auth/v1/user")) {
    const yetki = (secenek.headers && secenek.headers.Authorization) || "";
    const eposta = yetki === `Bearer ${ADMIN_TOKEN}` ? "admin@ornek.com" : yetki === `Bearer ${KULLANICI_TOKEN}` ? "ogrenci@ornek.com" : null;
    return eposta ? { ok: true, status: 200, json: async () => ({ email: eposta }) } : { ok: false, status: 401, json: async () => ({}) };
  }
  if (u.includes("/rest/v1/testimonials")) return { ok: true, status: 200, json: async () => [], text: async () => "" };
  if (u.includes("api.telegram.org")) return { ok: true, status: 200, json: async () => ({ ok: true }) };
  return { ok: false, status: 404, json: async () => ({}) };
};
const asilHata = console.error;
console.error = () => {};

const supabaseCagrisi = () => cagrilar.filter((c) => c.url.includes("supabase.co"));
const yaziCagrisi = () => cagrilar.filter((c) => c.url.includes("/rest/v1/testimonials") && ["PATCH", "DELETE", "POST"].includes(c.method));
const telegramCagrisi = () => cagrilar.filter((c) => c.url.includes("api.telegram.org"));

function sahteRes() {
  const r = { kod: null, govde: null };
  r.status = (k) => { r.kod = k; return r; };
  r.json = (g) => { r.govde = g; return r; };
  r.setHeader = () => {};
  return r;
}

// vercel.json'daki yönlendirmeyi uygulayarak isteği gerçek adresten çağırır
const vercel = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf-8"));
function yonlendir(yol) {
  const kural = (vercel.rewrites || []).find((r) => r.source === yol);
  const hedef = kural ? kural.destination : yol;
  const u = new URL(hedef, "https://sinyal-avcisi.com");
  return { fonksiyon: u.pathname, query: Object.fromEntries(u.searchParams), url: u.pathname + u.search };
}
async function istek(yol, { method = "POST", basliklar = {}, body } = {}) {
  cagrilar = [];
  const y = yonlendir(yol);
  if (y.fonksiyon !== "/api/admin-testimonials") throw new Error("beklenmeyen hedef: " + y.fonksiyon);
  const res = sahteRes();
  await adminHandler({ method, headers: basliklar, query: y.query, url: y.url, body }, res);
  return res;
}
const ONAYLA = { id: "11111111-1111-1111-1111-111111111111", action: "approve" };
const REDDET = { id: "11111111-1111-1111-1111-111111111111", action: "reject" };
const INSERT = { type: "INSERT", table: "testimonials", record: { isim: "Ali", unvan: "Aday", yorum: "Güzel", yildiz: 5 } };

// --- 1) /api/testimonial-bildirim adresi ve gizli anahtar ---
const y = yonlendir("/api/testimonial-bildirim");
kontrol("1) /api/testimonial-bildirim → /api/admin-testimonials?kaynak=webhook yönlendirmesi var", y.fonksiyon === "/api/admin-testimonials" && y.query.kaynak === "webhook");
let r = await istek("/api/testimonial-bildirim", { body: INSERT });
kontrol("2) adreste gizli anahtar EKSİK → 401, Supabase'e hiç gidilmedi", r.kod === 401 && supabaseCagrisi().length === 0 && telegramCagrisi().length === 0);
r = await istek("/api/testimonial-bildirim", { basliklar: { "x-webhook-secret": "yanlis" }, body: INSERT });
kontrol("3) adreste gizli anahtar YANLIŞ → 401, Supabase'e hiç gidilmedi", r.kod === 401 && supabaseCagrisi().length === 0 && telegramCagrisi().length === 0);
r = await istek("/api/testimonial-bildirim", { basliklar: { "x-webhook-secret": SIR }, body: INSERT });
kontrol("4) adreste doğru anahtar + INSERT → 200, Telegram'a 1 mesaj, Supabase'e 0 çağrı", r.kod === 200 && r.govde.gonderildi === true && telegramCagrisi().length === 1 && supabaseCagrisi().length === 0);

// --- 2) webhook anahtarıyla admin işlemi denemeleri reddedilir ---
r = await istek("/api/testimonial-bildirim", { basliklar: { "x-webhook-secret": SIR, authorization: `Bearer ${ADMIN_TOKEN}` }, body: ONAYLA });
kontrol("5) webhook adresinden ONAYLA (doğru anahtar + admin oturumu bile) → onaylanmadı, Supabase'e 0 çağrı", r.kod === 200 && r.govde.gonderildi === false && supabaseCagrisi().length === 0 && yaziCagrisi().length === 0);
r = await istek("/api/testimonial-bildirim", { basliklar: { "x-webhook-secret": SIR, authorization: `Bearer ${ADMIN_TOKEN}` }, body: REDDET });
kontrol("6) webhook adresinden REDDET/SİL → silinmedi, Supabase'e 0 çağrı", supabaseCagrisi().length === 0 && yaziCagrisi().length === 0);
r = await istek("/api/testimonial-bildirim", { method: "GET", basliklar: { "x-webhook-secret": SIR, authorization: `Bearer ${ADMIN_TOKEN}` } });
kontrol("7) webhook adresinden bekleyen yorumları LİSTELEME → 405, Supabase'e 0 çağrı", r.kod === 405 && supabaseCagrisi().length === 0);
r = await istek("/api/admin-testimonials", { basliklar: { "x-webhook-secret": SIR, authorization: `Bearer ${ADMIN_TOKEN}` }, body: ONAYLA });
kontrol("8) admin adresine x-webhook-secret başlığıyla ONAYLA → admin koduna girmedi, Supabase'e 0 çağrı", r.kod === 200 && supabaseCagrisi().length === 0 && yaziCagrisi().length === 0);
r = await istek("/api/admin-testimonials", { basliklar: { "x-webhook-secret": "yanlis", authorization: `Bearer ${ADMIN_TOKEN}` }, body: ONAYLA });
kontrol("9) yanlış webhook başlığı + admin oturumu → 401, admin yoluna DÜŞMEDİ, Supabase'e 0 çağrı", r.kod === 401 && supabaseCagrisi().length === 0);
r = await istek("/api/admin-testimonials", { basliklar: { "x-webhook-secret": "" }, body: ONAYLA });
kontrol("10) boş webhook başlığı → 401, Supabase'e 0 çağrı", r.kod === 401 && supabaseCagrisi().length === 0);
kontrol("11) webhookIstegiMi: yönlendirme sorgusu, url'deki sorgu ve başlık tanınır; düz admin isteği tanınmaz",
  webhookIstegiMi({ query: { kaynak: "webhook" }, headers: {} }) &&
  webhookIstegiMi({ url: "/api/admin-testimonials?kaynak=webhook", headers: {} }) &&
  webhookIstegiMi({ query: {}, headers: { "x-webhook-secret": "x" } }) &&
  !webhookIstegiMi({ query: {}, headers: { authorization: "Bearer x" }, url: "/api/admin-testimonials" }));

// --- 3) admin yolunun mevcut yetki kontrolü aynen çalışıyor ---
r = await istek("/api/admin-testimonials", { body: ONAYLA });
kontrol("12) admin: oturum yok → 401 (Oturum bulunamadı), Supabase REST'e 0 çağrı", r.kod === 401 && r.govde.error === "Oturum bulunamadı" && yaziCagrisi().length === 0);
r = await istek("/api/admin-testimonials", { basliklar: { authorization: `Bearer ${KULLANICI_TOKEN}` }, body: ONAYLA });
kontrol("13) admin: giriş yapmış ama ADMIN_EMAILS dışında → 403, yazma yok", r.kod === 403 && yaziCagrisi().length === 0);
r = await istek("/api/admin-testimonials", { basliklar: { authorization: `Bearer ${ADMIN_TOKEN}` }, body: ONAYLA });
kontrol("14) admin: yetkili admin ONAYLA → 200, Supabase'e PATCH (onaylandi=true)", r.kod === 200 && r.govde.success === true && yaziCagrisi().some((c) => c.method === "PATCH"));
r = await istek("/api/admin-testimonials", { basliklar: { authorization: `Bearer ${ADMIN_TOKEN}` }, body: REDDET });
kontrol("15) admin: yetkili admin REDDET → 200, Supabase'e DELETE", r.kod === 200 && yaziCagrisi().some((c) => c.method === "DELETE"));
r = await istek("/api/admin-testimonials", { method: "GET", basliklar: { authorization: `Bearer ${ADMIN_TOKEN}` } });
kontrol("16) admin: yetkili admin bekleyenleri LİSTELE → 200", r.kod === 200 && Array.isArray(r.govde.testimonials));
kontrol("17) admin yolunda Telegram'a hiç gidilmedi", telegramCagrisi().length === 0);

// --- 4) vercel.json ve fonksiyon sayısı ---
const ESKI_YONLENDIRMELER = ["/privacy", "/terms", "/ucretsiz-rehber", "/hedef-rota", "/yds-cikmis-sorular", "/yokdil-sinyal-kelimeler", "/yds-sinav-teknikleri"];
kontrol("18) mevcut 7 sayfa yönlendirmesi yerinde ve aynı hedefte", ESKI_YONLENDIRMELER.every((s) => (vercel.rewrites || []).some((r) => r.source === s && r.destination === s + ".html")));
kontrol("19) /api/testimonial-bildirim için tek kural; başka /api kuralı yok", (vercel.rewrites || []).filter((r) => r.source.startsWith("/api")).length === 1);
kontrol("20) www ve vercel.app yönlendirmeleri (2) yerinde; vercel.app kuralı /api'yi dışarıda bırakıyor", (vercel.redirects || []).length === 2 && (vercel.redirects || []).some((r) => r.source.includes("(?!api")));
kontrol("21) cron (/api/cron-streak-risk) yerinde", (vercel.crons || []).some((c) => c.path === "/api/cron-streak-risk"));
const fonksiyonlar = readdirSync(path.join(ROOT, "api")).filter((f) => /\.(m?js|ts)$/.test(f) && !f.startsWith("_"));
kontrol("22) api/ fonksiyon sayısı Vercel Hobby sınırı içinde (≤ 12)", fonksiyonlar.length <= 12, `${fonksiyonlar.length} fonksiyon`);
kontrol("23) ayrı api/testimonial-bildirim.mjs dosyası yok (adres yalnız yönlendirmeyle çalışır)", !existsSync(path.join(ROOT, "api", "testimonial-bildirim.mjs")));

console.error = asilHata;
console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
