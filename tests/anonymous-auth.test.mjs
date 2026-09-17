// 2026-09-17 ANONYMOUS AUTH — "zorunlu kayıt yok" ilkesini koruyarak HER
// ziyaretçiye (misafir dahil) gerçek bir auth.uid() sağlayan _sbInit()/
// _sbAnonBaslat()/_sbAd()/showUserMenu()/showGuestMenu() zincirinin
// GERÇEK ÇALIŞTIRMA (execution) testi. answer-history-execution.test.mjs
// ile AYNI desen: index.html'den kaynak BİREBİR çıkarılıp Node'un `vm`
// modülüyle GERÇEKTEN ÇALIŞTIRILIYOR — sahte yeniden-yazım DEĞİL.
//
// Gerçek Supabase'e HİÇ bağlanılmaz — supabase.createClient/auth tamamen
// sahte (in-memory) bir SDK ile simüle edilir.
//
// Doğrulanan KRİTİK ürün şartları:
// - Anonim kullanıcı arayüzde HİÇBİR ZAMAN "giriş yapmış" gösterilmiyor
//   (showUserMenu SADECE gerçek/is_anonymous=false session'da çağrılıyor).
// - session.user.email null/undefined olduğunda hiçbir kod patlamıyor.
// - Anonymous sign-in başarısız olursa (hata veya exception) site/quiz
//   akışı asla bozulmuyor, sadece güvenli (code/status/reason) bir log
//   üretiliyor — secret/token/email/user id ASLA loglanmıyor.
// - Aynı anda birden fazla anonim giriş denemesi (race) engelleniyor.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const html = readFileSync(path.join(ROOT, "index.html"), "utf-8");

// ---- STATİK: duplicate/override yok ----
{
  const sayimlar = {
    "let _sbAnonGirisimde=false;": (html.match(/let _sbAnonGirisimde=false;/g) || []).length,
    "async function _sbAnonBaslat\\(\\)": (html.match(/async function _sbAnonBaslat\(\)/g) || []).length,
    "function _sbAd\\(u\\)": (html.match(/function _sbAd\(u\)/g) || []).length,
    "function _sbInit\\(\\)": (html.match(/function _sbInit\(\)/g) || []).length,
    "function showUserMenu\\(u\\)": (html.match(/function showUserMenu\(u\)/g) || []).length,
    "function showGuestMenu\\(\\)": (html.match(/function showGuestMenu\(\)/g) || []).length,
  };
  kontrol(
    "1) index.html'de _sbAnonBaslat/_sbAd/_sbInit/showUserMenu/showGuestMenu her biri TAM OLARAK 1 kez tanımlı (duplicate/override YOK)",
    Object.values(sayimlar).every((n) => n === 1),
    JSON.stringify(sayimlar)
  );
  kontrol("2) sb.auth.signInAnonymously() gerçekten çağrılıyor (yeniden yazım değil)", /sb\.auth\.signInAnonymously\(\)/.test(html));
}

// ---- Kaynağı BİREBİR çıkar: _sbAnonBaslat → showGuestMenu arası ----
const startMarker = "let _sbAnonGirisimde=false;";
const endMarker = "function hosgeldinAnimasyonuGoster(isim){";
const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker, startIdx);
if (startIdx === -1 || endIdx === -1) {
  console.log("[FAIL] 0) kaynak çıkarma başarısız — startIdx/endIdx bulunamadı");
  console.log(`\nTOPLAM: 1 test, 1 başarısız.`);
  process.exit(1);
}
const gercekKaynak = html.slice(startIdx, endIdx);

function sandboxKur() {
  const warnCagrilari = [];
  const showUserMenuCagrilari = [];
  const showGuestMenuCagrilari = { n: 0 };
  const signInAnonymouslyCagrilari = { n: 0 };
  let signInAnonymouslyImpl = async () => ({ error: null });
  let onAuthStateChangeCallback = null;

  const sandbox = {
    console: { warn: (...args) => warnCagrilari.push(args), log: () => {}, error: () => {} },
    document: {
      querySelector: () => null,
      getElementById: () => null,
      addEventListener: () => {},
    },
    goTo: () => {},
    setTimeout,
    supabase: {
      createClient: () => ({
        auth: {
          onAuthStateChange: (cb) => {
            onAuthStateChangeCallback = cb;
          },
          signInAnonymously: async (...args) => {
            signInAnonymouslyCagrilari.n++;
            return signInAnonymouslyImpl(...args);
          },
        },
      }),
    },
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_KEY: "test-anon-key-not-real",
    sb: undefined,
    currentUser: null,
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(gercekKaynak, context, { filename: "index.html (extracted, anonymous-auth)" });

  // showUserMenu/showGuestMenu GERÇEK fonksiyonlar — çağrıldıklarını
  // yakalamak için sarmalıyoruz (davranışlarını DEĞİŞTİRMİYORUZ, sadece
  // gözlemliyoruz).
  const orijinalShowUserMenu = context.showUserMenu;
  context.showUserMenu = function (u) {
    showUserMenuCagrilari.push(u);
    return orijinalShowUserMenu(u);
  };
  const orijinalShowGuestMenu = context.showGuestMenu;
  context.showGuestMenu = function () {
    showGuestMenuCagrilari.n++;
    return orijinalShowGuestMenu();
  };

  return {
    context,
    warnCagrilari,
    showUserMenuCagrilari,
    showGuestMenuCagrilari,
    signInAnonymouslyCagrilari,
    setSignInAnonymouslyImpl: (fn) => {
      signInAnonymouslyImpl = fn;
    },
    tetikle: async (session, event = "INITIAL_SESSION") => {
      onAuthStateChangeCallback(event, session);
      // _sbAnonBaslat fire-and-forget çağrılıyor — mikro görev kuyruğunun
      // boşalması için birkaç tık bekle.
      await new Promise((r) => setTimeout(r, 20));
    },
  };
}

// ---- 1) GERÇEK (is_anonymous olmayan) session → showUserMenu çağrılıyor, anonim giriş DENENMİYOR ----
{
  const t = sandboxKur();
  const gercekUser = { id: "real-user-1", email: "gercek@ornek.com", user_metadata: { ad: "Ahmet" }, is_anonymous: false };
  await t.tetikle({ user: gercekUser }, "SIGNED_IN");

  kontrol("3) gerçek session'da currentUser doğru set ediliyor", t.context.currentUser?.id === "real-user-1");
  kontrol("4) gerçek session'da showUserMenu TAM OLARAK 1 kez çağrılıyor", t.showUserMenuCagrilari.length === 1);
  kontrol("5) gerçek session'da showGuestMenu HİÇ çağrılmıyor", t.showGuestMenuCagrilari.n === 0);
  kontrol("6) gerçek session'da anonim giriş HİÇ denenmiyor", t.signInAnonymouslyCagrilari.n === 0);
}

// ---- 2) ANONİM session (zaten var olan, örn. dönen ziyaretçi) → currentUser dolduruluyor, UI'da GİRİŞ YAPMIŞ GÖSTERİLMİYOR ----
{
  const t = sandboxKur();
  const anonUser = { id: "anon-user-1", email: null, user_metadata: {}, is_anonymous: true };
  await t.tetikle({ user: anonUser }, "INITIAL_SESSION");

  kontrol("7) anonim session'da currentUser answer_history senkronu için doğru set ediliyor", t.context.currentUser?.id === "anon-user-1");
  kontrol("8) anonim kullanıcı ARAYÜZDE GİRİŞ YAPMIŞ GİBİ GÖSTERİLMİYOR — showUserMenu HİÇ çağrılmıyor", t.showUserMenuCagrilari.length === 0);
  kontrol("9) anonim session zaten varken showGuestMenu de çağrılmıyor (misafir/giriş arayüzü DEĞİŞMİYOR, sessiz kalıyor)", t.showGuestMenuCagrilari.n === 0);
  kontrol("10) zaten anonim bir session varken YENİDEN anonim giriş denenmiyor", t.signInAnonymouslyCagrilari.n === 0);
}

// ---- 3) SESSION YOK (ilk ziyaret/sign-out) → misafir görünümü + sessizce anonim giriş deneniyor ----
{
  const t = sandboxKur();
  await t.tetikle(null, "INITIAL_SESSION");

  kontrol("11) session yokken currentUser null'a düşüyor", t.context.currentUser === null);
  kontrol("12) session yokken showGuestMenu TAM OLARAK 1 kez çağrılıyor (misafir görünümü)", t.showGuestMenuCagrilari.n === 1);
  kontrol("13) session yokken sessizce TAM OLARAK 1 kez anonim giriş deneniyor", t.signInAnonymouslyCagrilari.n === 1);
  kontrol("14) showUserMenu bu senaryoda HİÇ çağrılmıyor", t.showUserMenuCagrilari.length === 0);
}

// ---- 4) Anonim giriş BAŞARISIZ (hata objesi) → site/quiz bozulmaz, sadece güvenli alanlar loglanır ----
{
  const t = sandboxKur();
  t.setSignInAnonymouslyImpl(async () => ({ error: { code: "anonymous_provider_disabled", status: 422, message: "Anonymous sign-ins are disabled" } }));
  let firlatilanHata = null;
  try {
    await t.tetikle(null, "INITIAL_SESSION");
  } catch (e) {
    firlatilanHata = e;
  }

  kontrol("15) anonim giriş reddedilse bile HİÇBİR HATA DIŞARI FIRLAMIYOR", firlatilanHata === null);
  const warnArgs = t.warnCagrilari.find((a) => a[0] === "[answer-history] anonymous sign-in skipped:");
  kontrol(
    "16) hata SADECE code/status/reason alanlarıyla loglanıyor",
    warnArgs && warnArgs[1]?.code === "anonymous_provider_disabled" && warnArgs[1]?.status === 422 && /disabled/.test(warnArgs[1]?.reason || "")
  );
  kontrol("17) loglanan objede SADECE 3 güvenli alan var (code,reason,status) — email/id/session YOK", warnArgs && Object.keys(warnArgs[1]).sort().join(",") === "code,reason,status");
}

// ---- 5) Anonim giriş EXCEPTION fırlatıyor (network hatası) → dış catch yakalıyor, quiz bozulmaz ----
{
  const t = sandboxKur();
  t.setSignInAnonymouslyImpl(async () => {
    throw new Error("simulated network failure");
  });
  let firlatilanHata = null;
  try {
    await t.tetikle(null, "INITIAL_SESSION");
  } catch (e) {
    firlatilanHata = e;
  }

  kontrol("18) network hatası dışarı FIRLAMIYOR", firlatilanHata === null);
  const warnArgs = t.warnCagrilari.find((a) => a[0] === "[answer-history] anonymous sign-in skipped:");
  kontrol("19) güvenli, tanımlı bir mesajla loglandı (gerçek hata stack'i/detayı değil)", warnArgs && warnArgs[1]?.reason === "unexpected error");
}

// ---- 6) RACE GUARD — üst üste iki null-session tetiklemesi TEK anonim girişe düşüyor ----
{
  const t = sandboxKur();
  let resolveSignIn;
  t.setSignInAnonymouslyImpl(
    () =>
      new Promise((resolve) => {
        resolveSignIn = resolve;
      })
  );
  // İlk tetikleme — signInAnonymously PENDING kalır (henüz resolve edilmedi).
  const p1 = t.tetikle(null, "INITIAL_SESSION");
  await new Promise((r) => setTimeout(r, 5));
  // İkinci tetikleme — ilk hâlâ beklerken.
  const p2 = t.tetikle(null, "INITIAL_SESSION");
  await new Promise((r) => setTimeout(r, 5));
  resolveSignIn({ error: null });
  await Promise.all([p1, p2]);

  kontrol("20) ilk giriş DEVAM EDERKEN ikinci tetiklemede YENİ bir anonim giriş BAŞLATILMIYOR (race guard çalışıyor)", t.signInAnonymouslyCagrilari.n === 1);
}

// ---- 7) EMAIL NULL GUARD — gerçek kullanıcı ama email/ad yok → showUserMenu ÇÖKMÜYOR, fallback isim kullanılıyor ----
{
  const t = sandboxKur();
  const gercekAmaAdsiz = { id: "real-user-2", email: null, user_metadata: {}, is_anonymous: false };
  let firlatilanHata = null;
  try {
    await t.tetikle({ user: gercekAmaAdsiz }, "SIGNED_IN");
  } catch (e) {
    firlatilanHata = e;
  }
  kontrol("21) session.user.email null/undefined olsa bile showUserMenu HİÇ PATLAMIYOR", firlatilanHata === null);
  kontrol("22) showUserMenu yine de çağrıldı (is_anonymous:false olduğu için)", t.showUserMenuCagrilari.length === 1);

  // _sbAd() fallback davranışını DOĞRUDAN da doğrula (gerçek fonksiyon).
  kontrol("23) _sbAd(u) email VE ad yokken 'Avcı' fallback'ine düşüyor", t.context._sbAd({ email: null, user_metadata: {} }) === "Avcı");
  kontrol("24) _sbAd(u) email varsa @ öncesini kullanıyor", t.context._sbAd({ email: "test@ornek.com", user_metadata: {} }) === "test");
  kontrol("25) _sbAd(u) user_metadata.ad varsa onu önceliklendiriyor", t.context._sbAd({ email: "test@ornek.com", user_metadata: { ad: "Zeynep" } }) === "Zeynep");
  kontrol("26) _sbAd(u) u'nun kendisi null/undefined olsa bile PATLAMIYOR", t.context._sbAd(undefined) === "Avcı" && t.context._sbAd(null) === "Avcı");
}

// ---- 8) Genel secret-sızıntısı taraması — bu dosyanın kapsadığı TÜM warn çağrılarında ----
{
  const t = sandboxKur();
  t.setSignInAnonymouslyImpl(async () => ({ error: { code: "x", status: 500, message: "generic failure with session abc" } }));
  await t.tetikle(null, "INITIAL_SESSION");
  const tumWarnMetni = JSON.stringify(t.warnCagrilari);
  kontrol(
    "27) hiçbir warn çağrısında access_token/refresh_token/gerçek e-posta/user id ALAN ADI olarak geçmiyor",
    !/access_token|refresh_token|"email"|"id":|currentUser\.id/.test(tumWarnMetni)
  );
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
