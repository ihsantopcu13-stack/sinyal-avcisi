// ============================================================
// YouTube OAuth güvenli kurtarma — test edilebilir saf mantık
// ============================================================
// 2026-09-17 MİMARİ DEĞİŞİKLİK: Elle yazılmış fetch/URLSearchParams token
// exchange kodu KALDIRILDI. Artık `googleapis`/`google-auth-library`'nin
// resmi `OAuth2` client'ı kullanılıyor — TIPKI production'da çalışan
// `upload-youtube.mjs` ve orijinal `youtube-oauth-setup.mjs`'nin (7 gün
// sorunsuz refresh token üretmiş script) yaptığı gibi. Gerekçe: elle
// yazılmış implementasyon Google'ın token endpoint sözleşmesini (Content-
// Type, grant_type/client_id/client_secret/code/redirect_uri alanları)
// doğru uyguladığı test edilerek doğrulanmış olsa da, resmi kütüphane
// PKCE/Basic-Auth/retry/hata sınıflandırma gibi Google'ın zamanla
// değiştirebileceği edge-case'leri OTOMATİK takip eder — elle yazılmış
// kod etmez. Tek bir `OAuth2Client` nesnesi clientId+clientSecret+
// redirectUri'yi authorize URL üretiminden token exchange'e ve refresh
// doğrulamasına kadar TUTARLI şekilde taşır.
//
// Bu modül artık `googleapis`'e bağımlı — repo'nun izole CI'ı
// (.github/workflows/faz1-avci-ci.yml) `npm install` çalıştırmadığı için
// bu dosya o CI'ın `node --check` listesinde YOK (tıpkı `upload-youtube.mjs`
// ve `youtube-oauth-setup.mjs` gibi — bkz. o dosyanın başındaki not).
// Testler (`tests/oauth-recover.test.mjs`) lokalde `npm install`
// yapılmış `automation/video-pipeline` içinden çalıştırılır; gerçek
// Google ağına hiç çıkılmaz — `google.auth.OAuth2`'ye enjekte edilen
// sahte bir `transporter` ile.

import { google } from "googleapis";

export const REDIRECT_URI = "http://127.0.0.1:53682";
export const SCOPE = ["https://www.googleapis.com/auth/youtube.upload"];
export const REQUIRED_ENV_NAMES = ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"];

// Google'ın token endpoint'inin döndürebileceği bilinen, GÜVENLİ (hiçbir
// credential içermeyen) hata kodları. Bunun dışındaki her şey (yanlışlıkla
// bir secret/token parçası içerebilecek serbest metin dahil) elenip
// "unknown_error" ile değiştirilir — hata mesajının içeriği ASLA
// terminale/rapora yansımaz.
const KNOWN_OAUTH_ERRORS = new Set([
  "invalid_client",
  "invalid_grant",
  "invalid_request",
  "unauthorized_client",
  "unsupported_grant_type",
  "invalid_scope",
  "access_denied",
]);

export function redactGoogleError(err) {
  const raw = err?.response?.data?.error ?? err?.message ?? "";
  const code = String(raw).trim().toLowerCase();
  return KNOWN_OAUTH_ERRORS.has(code) ? code : "unknown_error";
}

// Google'ın token endpoint hata gövdesinden SADECE {status, error,
// error_description} alanlarını çıkarır — teşhis amaçlı, ama katı bir
// ALLOWLIST ile: bu üç alan dışında Google'ın gövdesinde başka ne olursa
// olsun (error_uri, hint, vb.) asla dışarı sızmaz. Bu üç alan da bizim
// isteğimizde göndermediğimiz, YALNIZCA Google'ın kendi ürettiği kısa
// teşhis metinleri olduğu için client_id/client_secret/code/refresh_token/
// access_token/id_token/request body/Authorization header gibi hassas
// değerleri ASLA içeremez. google-auth-library'nin fırlattığı GaxiosError
// da aynı {response:{status,data}} şeklini kullanır — uyumlu.
export function safeTokenErrorDetails(err) {
  const status = typeof err?.response?.status === "number" ? err.response.status : null;
  const data = err?.response?.data;
  const error = typeof data?.error === "string" ? data.error : undefined;
  const error_description = typeof data?.error_description === "string" ? data.error_description : undefined;
  return { status, error, error_description };
}

// safeTokenErrorDetails()'in döndürdüğü nesneyi terminale yazar — SADECE
// status/error/error_description alanlarını destructure edip yazdırır,
// verilen nesnede başka hangi alanlar olursa olsun (ör. yanlışlıkla
// eklenmiş bir clientSecret/refreshToken) bu fonksiyon onları hiç OKUMAZ,
// dolayısıyla asla yazdıramaz. `logImpl` enjekte edilebilir (testlerde
// gerçek console.error'a hiç yazılmaz).
export function printSafeErrorDetails({ status, error, error_description } = {}, { logImpl = console.error } = {}) {
  if (status !== null && status !== undefined) logImpl(`  HTTP status: ${status}`);
  if (error !== undefined) logImpl(`  error: ${error}`);
  if (error_description !== undefined) logImpl(`  error_description: ${error_description}`);
}

// client_secret'in bir yerde boş string'e/undefined'a düşüp düşmediğini
// SADECE BOOLEAN olarak (değeri hiç açığa çıkarmadan) doğrulamak için.
export function credentialPresenceCheck(value) {
  return {
    present: value !== undefined && value !== null,
    lengthGtZero: typeof value === "string" && value.length > 0,
  };
}

// TEK OAuth2Client — authorize URL üretimi, authorization_code->token
// değişimi VE refresh_token doğrulaması hepsi BU AYNI nesne üzerinden
// geçer (tıpkı youtube-oauth-setup.mjs / upload-youtube.mjs'nin yaptığı
// gibi). clientId+clientSecret+redirectUri bir kere burada set edilir,
// bir daha asla ayrı ayrı yeniden inşa edilmez. `transporter` enjekte
// edilebilir — testlerde gerçek Google ağına hiç çıkılmaz.
export function createOAuth2Client({ clientId, clientSecret, redirectUri = REDIRECT_URI, transporter } = {}) {
  if (!clientId) {
    throw new Error("createOAuth2Client: clientId gerekli");
  }
  const opts = { clientId, clientSecret, redirectUri };
  if (transporter) opts.transporter = transporter;
  return new google.auth.OAuth2(opts);
}

export function buildAuthUrl(oauth2Client) {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPE,
  });
}

// Authorization code -> {access_token, refresh_token, ...} değişimi
// (loopback callback'ten gelen `code` ile, tek seferlik).
export async function exchangeCodeForTokens(oauth2Client, code) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Gerçek video upload YAPMADAN sadece refresh_token -> access_token
// değişiminin çalıştığını doğrular (Stage 3 — uploadsuz auth testi).
// Aynı `upload-youtube.mjs`'nin `youtube.videos.insert` çağrısından önce
// örtük olarak yaptığı `getAccessToken()` çağrısı — gerçek prod kod yolu.
export async function verifyTokenExchange(oauth2Client, refreshToken) {
  try {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    await oauth2Client.getAccessToken();
    return { ok: true };
  } catch (err) {
    return { ok: false, errorType: redactGoogleError(err), ...safeTokenErrorDetails(err) };
  }
}

// `gh secret set <NAME> --body -` argümanları — değer HİÇBİR ZAMAN argv
// içinde geçmez, çağıran taraf değeri child process'in stdin'ine yazar.
export function buildGhSecretSetArgs(name) {
  if (!REQUIRED_ENV_NAMES.includes(name)) {
    throw new Error(`buildGhSecretSetArgs: bilinmeyen secret adı: ${name}`);
  }
  return ["secret", "set", name, "--body", "-"];
}

// Üç secret'ı sırayla (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN) günceller.
// spawnImpl enjekte edilebilir (testlerde gerçek `gh` çalıştırılmaz).
// Her sonuç sadece {name, ok, exitCode?} döner — value hiçbir yerde yok.
export async function updateAllThreeSecrets(values, { spawnImpl, ghBin = "gh" } = {}) {
  if (!spawnImpl) throw new Error("updateAllThreeSecrets: spawnImpl gerekli (gerçek gh çağrısı enjekte edilmeli)");
  const order = ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"];
  const keyForName = {
    YOUTUBE_CLIENT_ID: "clientId",
    YOUTUBE_CLIENT_SECRET: "clientSecret",
    YOUTUBE_REFRESH_TOKEN: "refreshToken",
  };
  const results = [];
  for (const name of order) {
    const value = values[keyForName[name]];
    const args = buildGhSecretSetArgs(name);
    const result = await new Promise((resolve) => {
      const child = spawnImpl(ghBin, args, { stdio: ["pipe", "ignore", "ignore"] });
      child.on("error", () => resolve({ name, ok: false }));
      child.on("exit", (exitCode) => resolve({ name, ok: exitCode === 0, exitCode }));
      child.stdin.write(String(value));
      child.stdin.end();
    });
    results.push(result);
  }
  return results;
}
