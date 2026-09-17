// YouTube OAuth güvenli kurtarma aracı için deterministik testler.
// Gerçek Google ağına, gerçek `gh` CLI'a veya gerçek TTY'ye BAĞLANMAZ —
// tüm dış bağımlılıklar enjekte edilen sahte (fake) implementasyonlarla
// değiştirilir. Hiçbir gerçek/sahte secret değeri konsola YAZILMAZ;
// testler sadece dönen nesnelerin ŞEKLİNİ ve kaynak metnin LOGLAMA
// yapmadığını doğrular.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REDIRECT_URI,
  SCOPE,
  REQUIRED_ENV_NAMES,
  buildAuthUrl,
  redactGoogleError,
  verifyTokenExchange,
  buildGhSecretSetArgs,
  updateAllThreeSecrets,
  maskedOutputChunk,
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
// argv'ye sızmıyor mu" diye aranan sahte fixture'lar.
const SAHTE_CLIENT_ID = "test-client-id-123.apps.googleusercontent.com";
const SAHTE_CLIENT_SECRET = "SAHTE-SECRET-ASLA-GERCEK-DEGIL-xyz789";
const SAHTE_REFRESH_TOKEN = "1//SAHTE-REFRESH-TOKEN-asla-gercek-degil";

// ---- TEST: sabitler mevcut kayıtlı Desktop OAuth Client ile uyumlu ----
{
  kontrol("1) REDIRECT_URI mevcut youtube-oauth-setup.mjs ile aynı (localhost:53682)", REDIRECT_URI === "http://localhost:53682");
  kontrol("2) SCOPE sadece youtube.upload", SCOPE.length === 1 && SCOPE[0] === "https://www.googleapis.com/auth/youtube.upload");
  kontrol(
    "3) REQUIRED_ENV_NAMES doğru üçlü",
    JSON.stringify(REQUIRED_ENV_NAMES) === JSON.stringify(["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"])
  );
}

// ---- TEST: buildAuthUrl doğru parametreleri üretiyor, secret'ı SIZDIRMIYOR ----
{
  // buildAuthUrl bilerek clientSecret PARAMETRESİ BİLE ALMIYOR — Google'ın
  // authorize endpoint'i onu istemez. Yine de savunma amaçlı, üretilen
  // URL'nin hiçbir yerde sahte secret string'ini içermediğini doğruluyoruz.
  const url = buildAuthUrl({ clientId: SAHTE_CLIENT_ID });
  kontrol("4) authUrl access_type=offline içeriyor", url.includes("access_type=offline"));
  kontrol("5) authUrl prompt=consent içeriyor", url.includes("prompt=consent"));
  kontrol("6) authUrl youtube.upload scope'unu içeriyor", url.includes(encodeURIComponent("https://www.googleapis.com/auth/youtube.upload")));
  kontrol("7) authUrl client_id'yi içeriyor", url.includes(encodeURIComponent(SAHTE_CLIENT_ID)));
  kontrol("8) authUrl redirect_uri = localhost:53682", url.includes(encodeURIComponent(REDIRECT_URI)));
  kontrol("9) authUrl client_secret parametresi hiç yok, sahte secret string'i de geçmiyor", !url.includes("client_secret") && !url.includes(SAHTE_CLIENT_SECRET));
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

// ---- TEST: verifyTokenExchange upload YAPMADAN başarı/başarısızlığı ayırt ediyor ----
// (gerçek ağa hiç çıkmadan — sahte fetchImpl enjekte edilir)
{
  let gorulenIstek = null;
  async function sahteFetchBasarili(url, opts) {
    gorulenIstek = { url, body: opts.body };
    return { ok: true, json: async () => ({ access_token: "sahte-access-token-asla-gercek-degil" }) };
  }
  const basariliSonuc = await verifyTokenExchange({
    clientId: SAHTE_CLIENT_ID,
    clientSecret: SAHTE_CLIENT_SECRET,
    refreshToken: SAHTE_REFRESH_TOKEN,
    fetchImpl: sahteFetchBasarili,
  });
  kontrol("16) başarılı exchange {ok:true} döner", basariliSonuc.ok === true);
  kontrol("17) başarılı sonuç sadece 'ok' alanı içerir (token/secret alanı yok)", JSON.stringify(Object.keys(basariliSonuc)) === JSON.stringify(["ok"]));
  kontrol("17b) doğru endpoint'e (oauth2.googleapis.com/token) istek atılıyor", gorulenIstek?.url === "https://oauth2.googleapis.com/token");
  kontrol("17c) grant_type=refresh_token gönderiliyor (upload/insert DEĞİL)", gorulenIstek?.body.includes("grant_type=refresh_token"));

  async function sahteFetchInvalidClient() {
    return { ok: false, json: async () => ({ error: "invalid_client" }) };
  }
  const basarisizSonuc = await verifyTokenExchange({
    clientId: SAHTE_CLIENT_ID,
    clientSecret: SAHTE_CLIENT_SECRET,
    refreshToken: SAHTE_REFRESH_TOKEN,
    fetchImpl: sahteFetchInvalidClient,
  });
  kontrol("18) başarısız exchange invalid_client tipini döner", basarisizSonuc.ok === false && basarisizSonuc.errorType === "invalid_client");
  kontrol(
    "19) başarısız sonuç hiçbir credential değeri içermiyor",
    !JSON.stringify(basarisizSonuc).includes(SAHTE_CLIENT_SECRET) && !JSON.stringify(basarisizSonuc).includes(SAHTE_REFRESH_TOKEN)
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
      _listeners: {},
      on(event, cb) {
        this._listeners[event] = cb;
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

// ---- TEST: maskedOutputChunk — girilen karakterler ASLA ham yazılmıyor ----
{
  const prompt = "Yeni Client Secret (görünmeyecek): ";
  kontrol("31) satır sonu aynen geçiyor", maskedOutputChunk("\n", prompt) === "\n");
  kontrol("32) prompt metninin kendisi aynen geçiyor", maskedOutputChunk(prompt, prompt) === prompt);
  kontrol("33) yazılan herhangi bir karakter '*' ile değiştiriliyor", maskedOutputChunk(SAHTE_CLIENT_SECRET[0], prompt) === "*");
  kontrol("34) maskeli çıktı gerçek karakteri asla içermiyor", maskedOutputChunk(SAHTE_CLIENT_SECRET, prompt) !== SAHTE_CLIENT_SECRET);
}

// Statik analiz testleri için: yorum satırlarını ve string/template literal
// İÇERİKLERİNİ (ör. "refresh_token dönmedi" gibi açıklayıcı cümleler veya
// "youtube.videos.insert hiç çağrılmaz" gibi yorumlar) kaldırır — sadece
// GERÇEK KOD üzerinde arama yapabilmek için. Regex ile naif strip yerine
// karakter taraması kullanılıyor: Türkçe yorumlardaki kesme işaretleri
// ("Client'ın") veya string içindeki "https://" gibi kaçışlar regex
// tabanlı bir yaklaşımda yanlışlıkla string/comment sınırlarını kaydırıp
// dosyanın geri kalanını yanlışlıkla "yorum/string içi" sayabiliyordu.
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
      // Template literal: düz metni at, ama ${...} interpolasyonu GERÇEK
      // KOD olduğu için korur (ör. `token: ${refreshToken}` içindeki
      // refreshToken tespit edilebilsin diye).
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
  kontrol("40) secret argv ile değil, gh CLI'a stdin ile veriliyor (updateAllThreeSecrets üzerinden)", /updateAllThreeSecrets\(/.test(kaynak) && !/process\.argv\[3\]|process\.argv\[4\]/.test(kaynak));
}

// ---- TEST: lib modülü de statik olarak temiz (tokens objesini asla loglamıyor) ----
{
  const libYolu = path.join(ROOT, "automation", "video-pipeline", "scripts", "_oauth-recover-lib.mjs");
  const kaynak = kaynakKoduSadelestir(readFileSync(libYolu, "utf-8"));
  kontrol("41) _oauth-recover-lib.mjs hiçbir console.log/error refreshToken/clientSecret değişkenini (kod olarak) yazmıyor", !/console\.(log|error|info|warn)\([^)]*\b(refreshToken|clientSecret|accessToken)\b/.test(kaynak));
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
