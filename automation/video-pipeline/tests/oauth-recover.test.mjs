// YouTube OAuth güvenli kurtarma aracı için deterministik testler.
// 2026-09-17 MİMARİ DEĞİŞİKLİĞİ: artık gerçek `google.auth.OAuth2`
// (google-auth-library) kullanılıyor — gerçek Google ağına ASLA
// çıkılmaz, çünkü `createOAuth2Client`'a sahte bir `transporter`
// enjekte edilir (`.request()` metodu override edilir). Bu, elle
// yazılmış `fetch` mock'undan daha güçlü bir test: gerçek kütüphanenin
// authorize URL üretimi ve token exchange kodu ÇALIŞTIRILARAK test
// ediliyor, sadece ağ katmanı sahte.
//
// Bu dosya artık `googleapis`'e bağımlı olduğu için repo'nun izole CI'ı
// (.github/workflows/faz1-avci-ci.yml, npm install YOK) listesinde DEĞİL
// — tıpkı `upload-youtube.mjs`/`youtube-oauth-setup.mjs` gibi. Lokalde
// `npm install` yapılmış `automation/video-pipeline` içinden çalıştırılır.
//
// Hiçbir gerçek/sahte secret değeri konsola YAZILMAZ; testler sadece
// dönen nesnelerin ŞEKLİNİ, gerçek istek gövdesinin İÇERİĞİNİ ve kaynak
// metnin LOGLAMA yapmadığını doğrular.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REDIRECT_URI,
  SCOPE,
  REQUIRED_ENV_NAMES,
  createOAuth2Client,
  buildAuthUrl,
  redactGoogleError,
  exchangeCodeForTokens,
  verifyTokenExchange,
  buildGhSecretSetArgs,
  updateAllThreeSecrets,
  safeTokenErrorDetails,
  printSafeErrorDetails,
  credentialPresenceCheck,
} from "../scripts/_oauth-recover-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..", "..");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

// Testlerde kullanılan değerler GERÇEK DEĞİL — sadece "bu string URL'ye/
// argv'ye/request body'sine sızmıyor mu" diye aranan sahte fixture'lar.
const SAHTE_CLIENT_ID = "test-client-id-123.apps.googleusercontent.com";
const SAHTE_CLIENT_SECRET = "SAHTE-SECRET-ASLA-GERCEK-DEGIL-xyz789";
const SAHTE_REFRESH_TOKEN = "1//SAHTE-REFRESH-TOKEN-asla-gercek-degil";

// Gerçek google.auth.OAuth2'ye enjekte edilen sahte transporter — `.request()`
// gerçek ağa hiç çıkmaz, sadece görülen isteği kaydedip senaryoya göre
// başarı/hata döner. `respond` fonksiyonu her istekte çağrılır.
function sahteTransporter(respond) {
  const gorulenIstekler = [];
  return {
    gorulenIstekler,
    async request(opts) {
      gorulenIstekler.push(opts);
      return respond(opts, gorulenIstekler.length);
    },
  };
}

function gaxiosBenzeriHata(status, data) {
  const err = new Error(`Request failed with status code ${status}`);
  err.response = { status, data };
  return err;
}

// ---- TEST: sabitler doğru loopback formatını ve port'u kullanıyor ----
{
  // Google'ın resmi OAuth dokümantasyonu loopback akışı için birincil
  // önerilen formatın "http://127.0.0.1:port" olduğunu, "localhost"
  // kullanımının ise "client firewall'larla sorun çıkarabileceğini"
  // belirtiyor (invalid_request teşhisi, 2026-09-17). Bu yüzden
  // REDIRECT_URI bilerek 127.0.0.1 kullanıyor — localhost DEĞİL.
  kontrol("1) REDIRECT_URI 127.0.0.1 loopback formatını kullanıyor (localhost DEĞİL)", REDIRECT_URI === "http://127.0.0.1:53682");
  kontrol("1b) REDIRECT_URI 'localhost' string'ini içermiyor", !REDIRECT_URI.includes("localhost"));
  kontrol("1c) Port hâlâ Google Cloud Console'da kayıtlı olan 53682", REDIRECT_URI.endsWith(":53682"));
  kontrol("2) SCOPE sadece youtube.upload", SCOPE.length === 1 && SCOPE[0] === "https://www.googleapis.com/auth/youtube.upload");
  kontrol(
    "3) REQUIRED_ENV_NAMES doğru üçlü",
    JSON.stringify(REQUIRED_ENV_NAMES) === JSON.stringify(["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"])
  );
}

// ---- TEST: createOAuth2Client + buildAuthUrl — gerçek google.auth.OAuth2, secret'ı URL'e SIZDIRMIYOR ----
{
  kontrol("4a) createOAuth2Client clientId olmadan hata fırlatıyor", (() => {
    try {
      createOAuth2Client({});
      return false;
    } catch {
      return true;
    }
  })());

  const client = createOAuth2Client({ clientId: SAHTE_CLIENT_ID, clientSecret: SAHTE_CLIENT_SECRET, redirectUri: REDIRECT_URI });
  const url = buildAuthUrl(client);
  kontrol("4) authUrl access_type=offline içeriyor", url.includes("access_type=offline"));
  kontrol("5) authUrl prompt=consent içeriyor", url.includes("prompt=consent"));
  kontrol("6) authUrl youtube.upload scope'unu içeriyor", url.includes(encodeURIComponent("https://www.googleapis.com/auth/youtube.upload")));
  kontrol("7) authUrl client_id'yi içeriyor", url.includes(encodeURIComponent(SAHTE_CLIENT_ID)));
  kontrol("8) authUrl redirect_uri = 127.0.0.1:53682", url.includes(encodeURIComponent(REDIRECT_URI)));
  kontrol("9) authUrl client_secret'ı İÇERMİYOR (Google authorize endpoint'i istemez)", !url.includes("client_secret") && !url.includes(SAHTE_CLIENT_SECRET));
}

// ---- TEST: redactGoogleError sadece bilinen kısa kodları döndürür ----
{
  kontrol("10) invalid_client mesajı tanınıyor", redactGoogleError({ message: "invalid_client" }) === "invalid_client");
  kontrol("11) invalid_grant mesajı tanınıyor", redactGoogleError({ message: "invalid_grant" }) === "invalid_grant");
  kontrol(
    "12) response.data.error formatı da tanınıyor",
    redactGoogleError({ response: { data: { error: "unauthorized_client" } } }) === "unauthorized_client"
  );
  const uzunSizinti = `beklenmeyen hata gövdesi ${SAHTE_CLIENT_SECRET} ve ${SAHTE_REFRESH_TOKEN}`;
  const redacted = redactGoogleError({ message: uzunSizinti });
  kontrol("13) tanınmayan/serbest metin unknown_error'a düşüyor", redacted === "unknown_error");
  kontrol("14) redactGoogleError çıktısı asla ham mesajı içermiyor", !redacted.includes(SAHTE_CLIENT_SECRET) && !redacted.includes(SAHTE_REFRESH_TOKEN));
  kontrol("15) null/undefined err crash üretmiyor", redactGoogleError(undefined) === "unknown_error" && redactGoogleError(null) === "unknown_error");
}

// ---- TEST: verifyTokenExchange — GERÇEK google.auth.OAuth2 ile, sahte transporter'a çıkan isteği yakalar ----
{
  const basariliT = sahteTransporter((opts) => ({ data: { access_token: "sahte-at-asla-gercek-degil", expires_in: 3600 }, status: 200 }));
  const basariliClient = createOAuth2Client({ clientId: SAHTE_CLIENT_ID, clientSecret: SAHTE_CLIENT_SECRET, redirectUri: REDIRECT_URI, transporter: basariliT });
  const basariliSonuc = await verifyTokenExchange(basariliClient, SAHTE_REFRESH_TOKEN);
  kontrol("16) başarılı exchange {ok:true} döner", basariliSonuc.ok === true);
  kontrol("17) başarılı sonuç sadece 'ok' alanı içerir (token/secret alanı yok)", JSON.stringify(Object.keys(basariliSonuc)) === JSON.stringify(["ok"]));
  kontrol("17b) doğru endpoint'e (oauth2.googleapis.com/token) istek atılıyor", basariliT.gorulenIstekler[0]?.url === "https://oauth2.googleapis.com/token");
  kontrol("17c) grant_type=refresh_token gönderiliyor (upload/insert DEĞİL)", basariliT.gorulenIstekler[0]?.data.includes("grant_type=refresh_token"));

  const basarisizT = sahteTransporter(() => {
    throw gaxiosBenzeriHata(401, { error: "invalid_client" });
  });
  const basarisizClient = createOAuth2Client({ clientId: SAHTE_CLIENT_ID, clientSecret: SAHTE_CLIENT_SECRET, redirectUri: REDIRECT_URI, transporter: basarisizT });
  const basarisizSonuc = await verifyTokenExchange(basarisizClient, SAHTE_REFRESH_TOKEN);
  kontrol("18) başarısız exchange invalid_client tipini döner", basarisizSonuc.ok === false && basarisizSonuc.errorType === "invalid_client");
  kontrol(
    "19) başarısız sonuç hiçbir credential değeri içermiyor",
    !JSON.stringify(basarisizSonuc).includes(SAHTE_CLIENT_SECRET) && !JSON.stringify(basarisizSonuc).includes(SAHTE_REFRESH_TOKEN)
  );
}

// ---- TEST: safeTokenErrorDetails — SADECE status/error/error_description, katı allowlist ----
{
  const gercekciHata = {
    response: {
      status: 400,
      data: { error: "invalid_request", error_description: "client_secret is missing." },
    },
  };
  const detay = safeTokenErrorDetails(gercekciHata);
  kontrol("19b) status doğru çıkarılıyor", detay.status === 400);
  kontrol("19c) error doğru çıkarılıyor", detay.error === "invalid_request");
  kontrol("19d) error_description doğru çıkarılıyor", detay.error_description === "client_secret is missing.");

  const kirliGovde = {
    response: {
      status: 401,
      data: {
        error: "invalid_client",
        error_description: "The OAuth client was not found.",
        error_uri: "https://example.com/should-not-leak",
        hint: "extra-field-should-not-leak",
        client_secret: SAHTE_CLIENT_SECRET, // Google bunu asla döndürmez ama savunma amaçlı test ediyoruz
      },
    },
  };
  const kirliDetay = safeTokenErrorDetails(kirliGovde);
  kontrol("19e) dönen nesnenin anahtarları TAM OLARAK status/error/error_description", JSON.stringify(Object.keys(kirliDetay).sort()) === JSON.stringify(["error", "error_description", "status"]));
  kontrol("19f) allowlist dışı alanlar (error_uri/hint/client_secret) sızmıyor", !JSON.stringify(kirliDetay).includes("should-not-leak") && !JSON.stringify(kirliDetay).includes(SAHTE_CLIENT_SECRET));

  const bozukTipler = { response: { status: "400", data: { error: 12345, error_description: { nested: true } } } };
  const bozukDetay = safeTokenErrorDetails(bozukTipler);
  kontrol("19h) sayısal olmayan status null'a düşüyor", bozukDetay.status === null);
  kontrol("19i) string olmayan error/error_description undefined'a düşüyor", bozukDetay.error === undefined && bozukDetay.error_description === undefined);

  kontrol("19k) response yoksa crash etmiyor, hepsi boş/null döner", (() => {
    const d = safeTokenErrorDetails(undefined);
    return d.status === null && d.error === undefined && d.error_description === undefined;
  })());
}

// ---- TEST: printSafeErrorDetails — SADECE 3 alanı yazdırır, başka HİÇBİR ŞEYİ yazdırmaz ----
{
  const yazilanSatirlar = [];
  printSafeErrorDetails(
    { status: 400, error: "invalid_request", error_description: "client_secret is missing." },
    { logImpl: (s) => yazilanSatirlar.push(s) }
  );
  kontrol("19l) HTTP status satırı yazıldı", yazilanSatirlar.some((s) => s.includes("400")));
  kontrol("19m) error satırı yazıldı", yazilanSatirlar.some((s) => s.includes("invalid_request")));
  kontrol("19n) error_description satırı yazıldı", yazilanSatirlar.some((s) => s.includes("client_secret is missing")));
  kontrol("19o) tam olarak 3 satır yazıldı (fazlası yok)", yazilanSatirlar.length === 3);

  const yazilanSatirlar2 = [];
  printSafeErrorDetails(
    { status: 401, error: "invalid_client", error_description: "not found", clientSecret: SAHTE_CLIENT_SECRET, refreshToken: SAHTE_REFRESH_TOKEN },
    { logImpl: (s) => yazilanSatirlar2.push(s) }
  );
  kontrol(
    "19p) fazladan alanlar (clientSecret/refreshToken) hiçbir satırda görünmüyor",
    !yazilanSatirlar2.some((s) => s.includes(SAHTE_CLIENT_SECRET) || s.includes(SAHTE_REFRESH_TOKEN))
  );

  const yazilanSatirlar3 = [];
  printSafeErrorDetails({ status: null, error: undefined, error_description: undefined }, { logImpl: (s) => yazilanSatirlar3.push(s) });
  kontrol("19r) hiçbir alan yoksa hiç satır yazdırmıyor", yazilanSatirlar3.length === 0);
}

// ---- TEST: verifyTokenExchange başarısızlıkta status/error/error_description de taşıyor (gerçek OAuth2Client ile) ----
{
  const t = sahteTransporter(() => {
    throw gaxiosBenzeriHata(400, { error: "invalid_request", error_description: "client_secret is missing." });
  });
  const client = createOAuth2Client({ clientId: SAHTE_CLIENT_ID, clientSecret: SAHTE_CLIENT_SECRET, redirectUri: REDIRECT_URI, transporter: t });
  const sonuc = await verifyTokenExchange(client, SAHTE_REFRESH_TOKEN);
  kontrol("19s) errorType invalid_request", sonuc.errorType === "invalid_request");
  kontrol("19t) status taşınıyor", sonuc.status === 400);
  kontrol("19u) error_description taşınıyor (gerçek Google mesajı: client_secret is missing.)", sonuc.error_description === "client_secret is missing.");
  kontrol(
    "19v) yine de hiçbir credential değeri içermiyor",
    !JSON.stringify(sonuc).includes(SAHTE_CLIENT_SECRET) && !JSON.stringify(sonuc).includes(SAHTE_REFRESH_TOKEN)
  );
}

// ---- TEST: exchangeCodeForTokens — GERÇEK google.auth.OAuth2, ZORUNLU 5 alan da outgoing body'de mevcut mu ----
// (2026-09-17 mimari değişikliği: artık manuel fetch/URLSearchParams YOK —
// google-auth-library'nin GERÇEK getToken() implementasyonu, gerçek
// querystring.stringify çağrısıyla body'yi üretiyor; testin doğruladığı
// şey artık BİZİM kodumuz değil, KÜTÜPHANENİN gerçek davranışı.)
{
  const t = sahteTransporter(() => ({ data: { access_token: "at", refresh_token: "rt", expires_in: 3600 }, status: 200 }));
  const client = createOAuth2Client({ clientId: SAHTE_CLIENT_ID, clientSecret: SAHTE_CLIENT_SECRET, redirectUri: REDIRECT_URI, transporter: t });
  const tokens = await exchangeCodeForTokens(client, "sahte-auth-code-5-alan-testi");

  kontrol("20a) tokens.refresh_token döndü", tokens.refresh_token === "rt");
  const gorulenBody = t.gorulenIstekler[0]?.data ?? "";
  const parsed = new URLSearchParams(gorulenBody);
  kontrol("31) body'de client_id mevcut", parsed.get("client_id") === SAHTE_CLIENT_ID);
  kontrol("32) body'de client_secret mevcut", parsed.get("client_secret") === SAHTE_CLIENT_SECRET);
  kontrol("33) body'de code mevcut", parsed.get("code") === "sahte-auth-code-5-alan-testi");
  kontrol("34) body'de redirect_uri mevcut", parsed.get("redirect_uri") === REDIRECT_URI);
  kontrol("34b) body'de grant_type=authorization_code mevcut", parsed.get("grant_type") === "authorization_code");
  kontrol("34c) authorize URL'de kullanılan client_id ile token body'sindeki client_id AYNI (tek OAuth2Client)", buildAuthUrl(client).includes(encodeURIComponent(SAHTE_CLIENT_ID)) && parsed.get("client_id") === SAHTE_CLIENT_ID);
}

// ---- TEST: credentialPresenceCheck — DEĞERİ HİÇ AÇIĞA ÇIKARMADAN present/length_gt_0 ----
{
  kontrol("19ab) dolu string: present=true, lengthGtZero=true", (() => {
    const r = credentialPresenceCheck(SAHTE_CLIENT_SECRET);
    return r.present === true && r.lengthGtZero === true;
  })());
  kontrol("19ac) boş string '': present=true (tanımlı), lengthGtZero=false — 'boşaldı' durumunu tam olarak yakalar", (() => {
    const r = credentialPresenceCheck("");
    return r.present === true && r.lengthGtZero === false;
  })());
  kontrol("19ad) undefined: present=false, lengthGtZero=false", (() => {
    const r = credentialPresenceCheck(undefined);
    return r.present === false && r.lengthGtZero === false;
  })());
  kontrol("19ae) null: present=false, lengthGtZero=false", (() => {
    const r = credentialPresenceCheck(null);
    return r.present === false && r.lengthGtZero === false;
  })());
  kontrol(
    "19af) credentialPresenceCheck çıktısı hiçbir zaman gerçek değeri içermiyor (sadece boolean döner)",
    !JSON.stringify(credentialPresenceCheck(SAHTE_CLIENT_SECRET)).includes(SAHTE_CLIENT_SECRET)
  );
}

// ---- TEST: gh secret set argümanları değeri ASLA argv'de taşımıyor ----
{
  const args = buildGhSecretSetArgs("YOUTUBE_CLIENT_SECRET");
  kontrol("20) argv 'secret set <AD> --body -' şeklinde", JSON.stringify(args) === JSON.stringify(["secret", "set", "YOUTUBE_CLIENT_SECRET", "--body", "-"]));
  kontrol("21) argv içinde sahte secret değeri geçmiyor (zaten hiç verilmedi)", !args.some((a) => a.includes(SAHTE_CLIENT_SECRET)));
  let hataFirladi = false;
  try {
    buildGhSecretSetArgs("BILINMEYEN_SECRET_ADI");
  } catch {
    hataFirladi = true;
  }
  kontrol("22) bilinmeyen secret adı reddediliyor", hataFirladi);
}

// ---- TEST: updateAllThreeSecrets — sahte spawn ile 3 secret'ı doğru sırada, stdin üzerinden günceller ----
{
  const cagrilar = [];
  function sahteSpawn(bin, args) {
    const yazilanlar = [];
    const child = {
      stdin: {
        write: (v) => yazilanlar.push(v),
        end: () => {},
      },
      on(event, cb) {
        if (event === "exit") {
          setTimeout(() => cb(0), 0); // her secret için başarı simüle et
        }
        return this;
      },
    };
    cagrilar.push({ bin, args, yazilanlarRef: yazilanlar });
    return child;
  }

  const sonuclar = await updateAllThreeSecrets(
    { clientId: SAHTE_CLIENT_ID, clientSecret: SAHTE_CLIENT_SECRET, refreshToken: SAHTE_REFRESH_TOKEN },
    { spawnImpl: sahteSpawn }
  );

  kontrol("23) 3 secret için 3 ayrı gh çağrısı yapıldı", cagrilar.length === 3);
  kontrol(
    "24) çağrı sırası CLIENT_ID -> CLIENT_SECRET -> REFRESH_TOKEN",
    cagrilar[0].args[2] === "YOUTUBE_CLIENT_ID" && cagrilar[1].args[2] === "YOUTUBE_CLIENT_SECRET" && cagrilar[2].args[2] === "YOUTUBE_REFRESH_TOKEN"
  );
  kontrol(
    "25) hiçbir gh çağrısının argv'sinde secret/token değeri yok (stdin üzerinden gitti)",
    cagrilar.every((c) => !c.args.some((a) => a.includes(SAHTE_CLIENT_SECRET) || a.includes(SAHTE_REFRESH_TOKEN)))
  );
  kontrol("26) her secret'ın değeri kendi çağrısının stdin'ine yazıldı", cagrilar[1].yazilanlarRef[0] === SAHTE_CLIENT_SECRET && cagrilar[2].yazilanlarRef[0] === SAHTE_REFRESH_TOKEN);
  kontrol("27) 3 secret de ok:true döndü", sonuclar.every((r) => r.ok === true));
  kontrol(
    "28) sonuç nesneleri sadece {name, ok, exitCode} alanları içeriyor (value yok)",
    sonuclar.every((r) => JSON.stringify(Object.keys(r).sort()) === JSON.stringify(["exitCode", "name", "ok"].sort()))
  );
}

// ---- TEST: bir secret güncellemesi başarısız olursa açıkça raporlanıyor, value sızmıyor ----
{
  let sayac = 0;
  function sahteSpawnKismenBasarisiz() {
    sayac++;
    const basarisizMi = sayac === 2; // CLIENT_SECRET adımı başarısız simüle edilsin
    const child = {
      stdin: { write: () => {}, end: () => {} },
      on(event, cb) {
        if (event === "exit") setTimeout(() => cb(basarisizMi ? 1 : 0), 0);
        return this;
      },
    };
    return child;
  }
  const sonuclar = await updateAllThreeSecrets(
    { clientId: SAHTE_CLIENT_ID, clientSecret: SAHTE_CLIENT_SECRET, refreshToken: SAHTE_REFRESH_TOKEN },
    { spawnImpl: sahteSpawnKismenBasarisiz }
  );
  const basarisizOlan = sonuclar.find((r) => !r.ok);
  kontrol("29) kısmi başarısızlık açıkça hangi secret'ın başarısız olduğunu söylüyor", basarisizOlan?.name === "YOUTUBE_CLIENT_SECRET");
  kontrol("30) başarısızlık raporu value içermiyor", !JSON.stringify(sonuclar).includes(SAHTE_CLIENT_SECRET) && !JSON.stringify(sonuclar).includes(SAHTE_REFRESH_TOKEN));
}

// Statik analiz testleri için: yorum satırlarını ve string/template literal
// İÇERİKLERİNİ kaldırır — sadece GERÇEK KOD üzerinde arama yapabilmek için.
// Regex ile naif strip yerine karakter taraması kullanılıyor: Türkçe
// yorumlardaki kesme işaretleri ("Client'ın") veya string içindeki
// "https://" gibi kaçışlar regex tabanlı bir yaklaşımda yanlışlıkla
// string/comment sınırlarını kaydırabiliyordu.
function kaynakKoduSadelestir(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    if (src[i] === "/" && src[i + 1] === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    const ch = src[i];
    if (ch === '"' || ch === "'") {
      out += ch + ch;
      i++;
      while (i < n && src[i] !== ch) {
        if (src[i] === "\\") i++;
        i++;
      }
      i++;
      continue;
    }
    if (ch === "`") {
      i++;
      out += "`";
      while (i < n && src[i] !== "`") {
        if (src[i] === "\\") {
          i += 2;
          continue;
        }
        if (src[i] === "$" && src[i + 1] === "{") {
          i += 2;
          out += "(";
          let derinlik = 1;
          while (i < n && derinlik > 0) {
            if (src[i] === "{") derinlik++;
            else if (src[i] === "}") derinlik--;
            if (derinlik > 0) out += src[i];
            i++;
          }
          out += ")";
          continue;
        }
        i++;
      }
      i++;
      out += "`";
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

// ---- TEST: interaktif CLI kaynak kodu secret/token değerlerini LOGLAMIYOR (statik analiz) ----
{
  const scriptYolu = path.join(ROOT, "automation", "video-pipeline", "scripts", "youtube-oauth-recover.mjs");
  const kaynakHam = readFileSync(scriptYolu, "utf-8");
  const kaynak = kaynakKoduSadelestir(kaynakHam);

  const yasakliLogPattern = /console\.(log|error|info|warn)\([^)]*\b(clientSecret|refreshToken|accessToken|refresh_token|access_token)\b/;
  kontrol("35) youtube-oauth-recover.mjs hiçbir yerde secret/token değişkenini (kod olarak) console'a yazmıyor", !yasakliLogPattern.test(kaynak));

  kontrol("36) upload fonksiyonu (videos.insert) hiç çağrılmıyor — bu araç upload yapmaz", !/videos\.insert\s*\(/.test(kaynak));
  kontrol("37) YOUTUBE_OAUTH_TOKEN_OK literal çıktısı mevcut", kaynakHam.includes("YOUTUBE_OAUTH_TOKEN_OK"));
  kontrol("38) YOUTUBE_OAUTH_TOKEN_FAIL literal çıktısı mevcut", kaynakHam.includes("YOUTUBE_OAUTH_TOKEN_FAIL"));
  kontrol("39) redactGoogleError, ham err.message yerine kullanılıyor", /redactGoogleError\(err\)/.test(kaynakHam));
  kontrol("39b) dosya kendi başına 'localhost' string'i inşa etmiyor (REDIRECT_URI kullanıyor)", !kaynakHam.includes("localhost"));
  kontrol("39c) dosya kendi başına '127.0.0.1' string'i inşa etmiyor (REDIRECT_URI kullanıyor)", !kaynakHam.includes("127.0.0.1"));
  kontrol("39d) 'Bekleniyor...' mesajı REDIRECT_URI değişkenini referans alıyor", /Bekleniyor[\s\S]{0,40}REDIRECT_URI/.test(kaynakHam));

  kontrol("39e) authorization_code hata yolunda printSafeErrorDetails çağrılıyor", /printSafeErrorDetails\(safeTokenErrorDetails\(err\)\)/.test(kaynak));
  kontrol("39f) verifyTokenExchange hata yolunda printSafeErrorDetails çağrılıyor", /printSafeErrorDetails\(testSonuc\)/.test(kaynak));
  kontrol("39g) ham err nesnesi hiçbir yerde doğrudan console'a yazılmıyor (console.error(err) yok)", !/console\.(log|error|warn|info)\(\s*err\s*\)/.test(kaynak));
  kontrol("39h) err.response.data hiçbir yerde doğrudan loglanmıyor", !/console\.(log|error|warn|info)\([^)]*\berr\.response\b/.test(kaynak));
  kontrol("39i) request body/Authorization header hiçbir yerde loglanmıyor", !/console\.(log|error|warn|info)\([^)]*\b(body|Authorization)\b/.test(kaynak));

  kontrol("39j) exchangeCodeForTokens'tan önce credentialPresenceCheck çağrılıyor", /credentialPresenceCheck\(clientSecret\)/.test(kaynak));
  {
    const logSatiriEslesme = kaynakHam.match(/console\.log\(`client_secret_present=[^\n]*`\);/);
    kontrol("39k) client_secret_present/length_gt_0 log satırı mevcut", !!logSatiriEslesme);
    kontrol(
      "39l) o log satırı .present/.lengthGtZero kullanıyor, clientSecret'in KENDİSİNİ değil",
      !!logSatiriEslesme?.[0]?.includes(".present") &&
        !!logSatiriEslesme?.[0]?.includes(".lengthGtZero") &&
        !/\bclientSecret\}/.test(logSatiriEslesme?.[0] ?? "")
    );
  }

  kontrol("39m) rl._writeToOutput override (maskeli readline) hiç kullanılmıyor", !kaynak.includes("_writeToOutput"));
  kontrol("39n) maskedPrompt/getClientSecret/getClientId fonksiyonları yok (kaldırıldı)", !/\bmaskedPrompt\b|\bgetClientSecret\b|\bgetClientId\b/.test(kaynak));
  kontrol("39o) clientId doğrudan process.env.YOUTUBE_CLIENT_ID'den okunuyor", /process\.env\.YOUTUBE_CLIENT_ID/.test(kaynak));
  kontrol("39p) clientSecret doğrudan process.env.YOUTUBE_CLIENT_SECRET'ten okunuyor", /process\.env\.YOUTUBE_CLIENT_SECRET/.test(kaynak));
  kontrol("39q) başlangıçta YOUTUBE_CLIENT_ID_PRESENT boolean'ı loglanıyor", kaynakHam.includes("YOUTUBE_CLIENT_ID_PRESENT="));
  kontrol("39r) başlangıçta YOUTUBE_CLIENT_SECRET_PRESENT boolean'ı loglanıyor", kaynakHam.includes("YOUTUBE_CLIENT_SECRET_PRESENT="));

  const exchangeIdx = kaynak.indexOf("exchangeCodeForTokens(");
  const gateIdx = kaynak.indexOf("if (!secretDurumu.present || !secretDurumu.lengthGtZero)");
  kontrol(
    "39s) client_secret boş/eksikse exchangeCodeForTokens çağrılmadan ÖNCE durduran bir kapı var",
    gateIdx !== -1 && exchangeIdx !== -1 && gateIdx < exchangeIdx
  );
  kontrol(
    "39t) o kapının içinde bir 'return' var (fonksiyon gerçekten duruyor, sadece logluyor değil)",
    /if \(!secretDurumu\.present \|\| !secretDurumu\.lengthGtZero\) \{[\s\S]{0,200}?return;/.test(kaynak)
  );

  // 2026-09-17 MİMARİ: TEK OAuth2Client — createOAuth2Client tam olarak BİR
  // kez çağrılıyor mu, ve buildAuthUrl/exchangeCodeForTokens/
  // verifyTokenExchange üçü de AYNI `oauth2Client` değişkenini mi kullanıyor
  // (her biri kendi client'ını yeniden inşa etmiyor)?
  const createCagriSayisi = (kaynak.match(/createOAuth2Client\(/g) || []).length;
  kontrol("44) createOAuth2Client tam olarak BİR kez çağrılıyor (tek client)", createCagriSayisi === 1);
  kontrol("45) buildAuthUrl aynı oauth2Client değişkenini kullanıyor", /buildAuthUrl\(oauth2Client\)/.test(kaynak));
  kontrol("46) exchangeCodeForTokens aynı oauth2Client değişkenini kullanıyor", /exchangeCodeForTokens\(oauth2Client, ?code\)/.test(kaynak));
  kontrol("47) verifyTokenExchange aynı oauth2Client değişkenini kullanıyor", /verifyTokenExchange\(oauth2Client, ?refreshToken\)/.test(kaynak));
  kontrol("48) manuel fetch/URLSearchParams token exchange kodu bu dosyada yok (googleapis'e devredildi)", !/new URLSearchParams\(/.test(kaynak) && !/\bfetch\(/.test(kaynak));

  kontrol("40) secret argv ile değil, gh CLI'a stdin ile veriliyor (updateAllThreeSecrets üzerinden)", /updateAllThreeSecrets\(/.test(kaynak) && !/process\.argv\[3\]|process\.argv\[4\]/.test(kaynak));
}

// ---- TEST: lib modülü de statik olarak temiz (tokens objesini asla loglamıyor), googleapis kullanıyor ----
{
  const libYolu = path.join(ROOT, "automation", "video-pipeline", "scripts", "_oauth-recover-lib.mjs");
  const kaynakHamLib = readFileSync(libYolu, "utf-8");
  const kaynak = kaynakKoduSadelestir(kaynakHamLib);
  kontrol("41) _oauth-recover-lib.mjs hiçbir console.log/error refreshToken/clientSecret değişkenini (kod olarak) yazmıyor", !/console\.(log|error|info|warn)\([^)]*\b(refreshToken|clientSecret|accessToken)\b/.test(kaynak));
  kontrol("49) _oauth-recover-lib.mjs artık googleapis'i import ediyor (resmi kütüphane)", /from ["']googleapis["']/.test(kaynakHamLib));
  kontrol("50) manuel token endpoint URL'i (oauth2.googleapis.com/token) artık bu dosyada elle inşa edilmiyor", !kaynakHamLib.includes("https://oauth2.googleapis.com/token"));
}

// ---- TEST: her iki YouTube workflow'u aynı üç env adını kullanıyor (recovery aracının hedefi doğru) ----
{
  const weeklyYml = readFileSync(path.join(ROOT, ".github", "workflows", "weekly-signals-publish.yml"), "utf-8");
  const dailyYml = readFileSync(path.join(ROOT, ".github", "workflows", "video-pipeline.yml"), "utf-8");
  for (const name of REQUIRED_ENV_NAMES) {
    kontrol(`42.${name}) weekly workflow secrets.${name} kullanıyor`, weeklyYml.includes(`secrets.${name}`));
    kontrol(`43.${name}) daily workflow secrets.${name} kullanıyor`, dailyYml.includes(`secrets.${name}`));
  }
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
