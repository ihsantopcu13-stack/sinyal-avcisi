// answer_history senkron zincirinin GERÇEK ÇALIŞTIRMA (execution) testi —
// diğer answer-history-sync.test.mjs dosyasındaki statik regex testlerinden
// FARKLI olarak, bu dosya index.html'den cevapGecmisiLoad/cevapGecmisiSave/
// cevapKaydet/cevapSunucuyaSenkronla fonksiyonlarının KAYNAK KODUNU BİREBİR
// (verbatim) çıkarıp Node'un `vm` modülüyle GERÇEKTEN ÇALIŞTIRIYOR — sahte
// bir yeniden-yazım/mock implementasyon DEĞİL, production'a gidecek TAM O
// KOD. index.html bir ES modülü olmadığı için doğrudan import edilemiyor;
// bu yüzden `vm.createContext` ile sahte (ama gerçekçi) sb/localStorage/
// window global'leri sağlanıp fonksiyonlar bu sandbox içinde icra ediliyor.
//
// Gerçek Supabase'e HİÇ bağlanılmaz — sb.rpc/sb.auth.getSession tamamen
// sahte (in-memory) promise'lerle simüle edilir.
//
// 2026-09-17: production'da answer_history'ye hiç satır yazılmıyor sorunu
// teşhis edilirken, "fonksiyon var" demenin yeterli olmadığı görüldü —
// bu dosya "fonksiyon gerçekten çağrılabiliyor ve doğru RPC'yi doğru
// parametrelerle tam olarak 1 kez tetikliyor" iddiasını GERÇEK ÇALIŞTIRMAYLA
// kanıtlar.

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

// ---- Production kaynağını BİREBİR çıkar (cevapGecmisiLoad → cevapGecmisiOzet arası) ----
const startMarker = "function cevapGecmisiLoad(){";
const endMarker = "function cevapGecmisiOzet(){";
const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker, startIdx);
if (startIdx === -1 || endIdx === -1) {
  console.log("[FAIL] 0) kaynak çıkarma başarısız — startIdx/endIdx bulunamadı");
  console.log(`\nTOPLAM: 1 test, 1 başarısız.`);
  process.exit(1);
}
const gercekKaynak = html.slice(startIdx, endIdx);

// ---- Her senaryo için taze bir sandbox kur ----
function sandboxKur({ sbYok = false } = {}) {
  const localStorageStore = {};
  const rpcCagrilari = [];
  const getSessionCagriSayisi = { n: 0 };
  const warnCagrilari = [];

  let getSessionImpl = async () => ({ data: { session: null } });
  let rpcImpl = async () => ({ error: null });

  const sandbox = {
    console: {
      warn: (...args) => warnCagrilari.push(args),
      log: () => {},
      error: () => {},
    },
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(localStorageStore, k) ? localStorageStore[k] : null),
      setItem: (k, v) => {
        localStorageStore[k] = String(v);
      },
    },
    window: {
      SinyalAttribution: {
        context: () => ({ source: "test-source", medium: "test-medium", campaign: "test-campaign", signal: "test-signal" }),
      },
    },
    JSON,
    String,
    Boolean,
    Date,
    setTimeout,
    sb: sbYok
      ? null
      : {
          auth: {
            getSession: async (...args) => {
              getSessionCagriSayisi.n++;
              return getSessionImpl(...args);
            },
          },
          rpc: async (adi, params) => {
            rpcCagrilari.push({ adi, params });
            return rpcImpl(adi, params);
          },
        },
    currentUser: null,
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(gercekKaynak, context, { filename: "index.html (extracted)" });

  return {
    sandbox,
    rpcCagrilari,
    warnCagrilari,
    getSessionCagriSayisi,
    localStorageStore,
    setGetSessionImpl: (fn) => {
      getSessionImpl = fn;
    },
    setRpcImpl: (fn) => {
      rpcImpl = fn;
    },
    // cevapKaydet fire-and-forget çağırdığı için cevapSunucuyaSenkronla'nın
    // döndürdüğü promise'i dışarıdan yakalayıp await edebilmek için sarmalıyoruz
    // — GERÇEK fonksiyonun KENDİSİNİ çağırıyor, sadece dönüş değerini yakalıyoruz.
    cevapKaydetVeBekle: async (opts) => {
      const orijinalSenkron = context.cevapSunucuyaSenkronla;
      let senkronPromise = Promise.resolve();
      context.cevapSunucuyaSenkronla = function (kayit) {
        senkronPromise = orijinalSenkron(kayit);
        return senkronPromise;
      };
      context.cevapKaydet(opts);
      await senkronPromise;
      context.cevapSunucuyaSenkronla = orijinalSenkron;
    },
  };
}

const SINYAL_LAB_OPTS = {
  questionId: "q001",
  modul: "sinyal",
  soru: "Despite the heavy rain, they continued playing.",
  selectedOption: "Despite",
  correctOption: "Despite",
  isCorrect: true,
  topic: "sinyal",
  signal: "despite",
};

// ---- 1) currentUser HAZIR → RPC tam 1 kez çağrılıyor, getSession'a HİÇ gerek yok ----
{
  const t = sandboxKur();
  t.sandbox.currentUser = { id: "user-1", email: "gizli@ornek.com" };
  await t.cevapKaydetVeBekle(SINYAL_LAB_OPTS);

  kontrol("1) currentUser hazırken RPC TAM OLARAK 1 KEZ çağrılıyor", t.rpcCagrilari.length === 1, `çağrı sayısı: ${t.rpcCagrilari.length}`);
  kontrol("2) doğru RPC adı çağrılıyor (record_answer)", t.rpcCagrilari[0]?.adi === "record_answer");
  kontrol("3) currentUser hazırken getSession'a HİÇ gerek kalmıyor (gereksiz ağ çağrısı yok)", t.getSessionCagriSayisi.n === 0);
  kontrol(
    "4) RPC parametreleri gerçek kayıt verisiyle birebir eşleşiyor (p_question_id/p_module/p_is_correct/p_signal)",
    t.rpcCagrilari[0]?.params?.p_question_id === "q001" &&
      t.rpcCagrilari[0]?.params?.p_module === "sinyal" &&
      t.rpcCagrilari[0]?.params?.p_is_correct === true &&
      t.rpcCagrilari[0]?.params?.p_signal === "despite"
  );
  kontrol(
    "5) attribution context RPC'ye gerçekten taşınıyor (p_attribution_source vb.)",
    t.rpcCagrilari[0]?.params?.p_attribution_source === "test-source" && t.rpcCagrilari[0]?.params?.p_attribution_signal === "test-signal"
  );
  kontrol("6) localStorage'a GERÇEKTEN kaydedildi (ana kaynak)", JSON.parse(t.localStorageStore["sa_cevap_gecmisi"] || "[]").length === 1);
}

// ---- 2) currentUser BOŞ + getSession AUTHENTICATED → RPC yine tam 1 kez çağrılıyor ----
{
  const t = sandboxKur();
  t.sandbox.currentUser = null;
  t.setGetSessionImpl(async () => ({ data: { session: { user: { id: "user-2", email: "gizli2@ornek.com" } } } }));
  await t.cevapKaydetVeBekle(SINYAL_LAB_OPTS);

  kontrol("7) currentUser boşken ama GERÇEK session varken RPC TAM OLARAK 1 KEZ çağrılıyor (auth race düzeltmesi çalışıyor)", t.rpcCagrilari.length === 1);
  kontrol("8) getSession TAM OLARAK 1 KEZ çağrıldı (fallback sadece bir kez denendi)", t.getSessionCagriSayisi.n === 1);
  kontrol("9) currentUser artık güncellendi (sonraki cevaplar için race kapandı)", t.sandbox.currentUser?.id === "user-2");
}

// ---- 3) currentUser BOŞ + getSession GUEST (session yok) → RPC HİÇ çağrılmıyor, graceful skip ----
{
  const t = sandboxKur();
  t.sandbox.currentUser = null;
  t.setGetSessionImpl(async () => ({ data: { session: null } }));
  await t.cevapKaydetVeBekle(SINYAL_LAB_OPTS);

  kontrol("10) gerçek misafirde RPC HİÇ ÇAĞRILMIYOR", t.rpcCagrilari.length === 0);
  kontrol(
    "11) güvenli, tanımlı bir skip mesajı loglandı",
    t.warnCagrilari.some((args) => args[0] === "[answer-history] sync skipped: no authenticated session")
  );
  kontrol("12) misafirde bile localStorage'a GERÇEKTEN kaydedildi (local davranış bozulmadı)", JSON.parse(t.localStorageStore["sa_cevap_gecmisi"] || "[]").length === 1);
}

// ---- 4) getSession HATA VERİYOR (network/exception) → quiz bozulmaz, RPC çağrılmaz ----
{
  const t = sandboxKur();
  t.sandbox.currentUser = null;
  t.setGetSessionImpl(async () => {
    throw new Error("simulated network failure");
  });
  let firlatilanHata = null;
  try {
    await t.cevapKaydetVeBekle(SINYAL_LAB_OPTS);
  } catch (e) {
    firlatilanHata = e;
  }

  kontrol("13) getSession patlarsa DIŞARI HİÇBİR HATA FIRLAMIYOR (quiz akışı asla bozulmaz)", firlatilanHata === null);
  kontrol("14) RPC HİÇ çağrılmadı", t.rpcCagrilari.length === 0);
  kontrol(
    "15) güvenli bir teşhis mesajı loglandı, gerçek hata objesi/stack değil",
    t.warnCagrilari.some((args) => args[0] === "[answer-history] sync skipped: session check failed")
  );
  kontrol("16) localStorage kaydı yine de tamamlandı", JSON.parse(t.localStorageStore["sa_cevap_gecmisi"] || "[]").length === 1);
}

// ---- 5) RPC BAŞARISIZ (Postgrest hata objesi döndürüyor) → quiz bozulmaz, sadece güvenli alanlar loglanıyor ----
{
  const t = sandboxKur();
  t.sandbox.currentUser = { id: "user-3" };
  t.setRpcImpl(async () => ({ error: { code: "42501", message: "permission denied for function record_answer" }, status: 403 }));
  await t.cevapKaydetVeBekle(SINYAL_LAB_OPTS);

  kontrol("17) RPC çağrıldı (tam 1 kez) ama hata döndürdü — quiz'i bozmadı", t.rpcCagrilari.length === 1);
  const warnArgs = t.warnCagrilari.find((args) => args[0] === "[answer-history] sync failed:");
  kontrol("18) hata SADECE code/status/reason alanlarıyla loglandı", warnArgs && warnArgs[1]?.code === "42501" && warnArgs[1]?.status === 403 && /permission denied/.test(warnArgs[1]?.reason || ""));
  kontrol("19) loglanan objede user id/email/session YOK (sadece 3 güvenli alan)", warnArgs && Object.keys(warnArgs[1]).sort().join(",") === "code,reason,status");
}

// ---- 6) RPC PROMISE REDDEDİYOR (gerçek network exception) → dış catch yakalıyor, quiz bozulmaz ----
{
  const t = sandboxKur();
  t.sandbox.currentUser = { id: "user-4" };
  t.setRpcImpl(async () => {
    throw new Error("simulated fetch failure");
  });
  let firlatilanHata = null;
  try {
    await t.cevapKaydetVeBekle(SINYAL_LAB_OPTS);
  } catch (e) {
    firlatilanHata = e;
  }

  kontrol("20) RPC network hatası dışarı FIRLAMIYOR", firlatilanHata === null);
  const warnArgs = t.warnCagrilari.find((args) => args[0] === "[answer-history] sync failed:");
  kontrol("21) dış catch güvenli alanlarla logluyor (code/status/reason)", warnArgs && "code" in warnArgs[1] && "status" in warnArgs[1] && "reason" in warnArgs[1]);
}

// ---- 7) sb hiç yok (guest/Supabase client hazır değil) → RPC hiç denenmiyor, güvenli log var ----
{
  const t = sandboxKur({ sbYok: true });
  t.sandbox.currentUser = null;
  await t.cevapKaydetVeBekle(SINYAL_LAB_OPTS);

  kontrol("22) sb yokken RPC'ye HİÇ ULAŞILMIYOR", t.rpcCagrilari.length === 0);
  kontrol(
    "23) 2026-09-17 production teşhisinde eklenen tanımlı skip mesajı gerçekten üretiliyor",
    t.warnCagrilari.some((args) => args[0] === "[answer-history] sync skipped: supabase client not ready")
  );
  kontrol("24) sb yokken bile localStorage'a kaydedildi (guest tamamen çalışıyor)", JSON.parse(t.localStorageStore["sa_cevap_gecmisi"] || "[]").length === 1);
}

// ---- 8) doğru + yanlış cevap ikisi de RPC'ye doğru is_correct değeriyle gidiyor ----
{
  const t = sandboxKur();
  t.sandbox.currentUser = { id: "user-5" };
  await t.cevapKaydetVeBekle({ ...SINYAL_LAB_OPTS, questionId: "q010", isCorrect: true });
  await t.cevapKaydetVeBekle({ ...SINYAL_LAB_OPTS, questionId: "q011", isCorrect: false, selectedOption: "although", correctOption: "despite" });

  kontrol("25) doğru cevap RPC'de p_is_correct:true taşıyor", t.rpcCagrilari.find((c) => c.params.p_question_id === "q010")?.params.p_is_correct === true);
  kontrol("26) yanlış cevap RPC'de p_is_correct:false taşıyor", t.rpcCagrilari.find((c) => c.params.p_question_id === "q011")?.params.p_is_correct === false);
  kontrol("27) her ikisi de ayrı ayrı RPC çağrısı üretti (2 çağrı)", t.rpcCagrilari.length === 2);
}

// ---- 9) DUPLICATE/IDEMPOTENCY — aynı questionId'ye tekrar cevap → local'de TEK kayıt, attemptCount artıyor, RPC yine çağrılıyor (upsert server'a bırakılır) ----
{
  const t = sandboxKur();
  t.sandbox.currentUser = { id: "user-6" };
  await t.cevapKaydetVeBekle({ ...SINYAL_LAB_OPTS, questionId: "q020", isCorrect: false });
  await t.cevapKaydetVeBekle({ ...SINYAL_LAB_OPTS, questionId: "q020", isCorrect: true });

  const gecmis = JSON.parse(t.localStorageStore["sa_cevap_gecmisi"] || "[]");
  const kayit = gecmis.find((k) => k.questionId === "q020");
  kontrol("28) aynı questionId için localStorage'da TEK kayıt var (çoğalmadı)", gecmis.filter((k) => k.questionId === "q020").length === 1);
  kontrol("29) tekrar denemede attemptCount 2'ye çıktı", kayit?.attemptCount === 2);
  kontrol("30) son deneme sonucu (isCorrect:true) kayda yansıdı", kayit?.isCorrect === true);
  kontrol("31) her iki deneme de RPC'ye ayrı ayrı gönderildi (server'daki ON CONFLICT upsert'i bu iki çağrıyı birleştirir)", t.rpcCagrilari.length === 2);
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
