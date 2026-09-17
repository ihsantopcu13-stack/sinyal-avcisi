// ============================================================
// YouTube OAuth güvenli kurtarma — test edilebilir saf mantık
// ============================================================
// Bu modül ağ çağrısı yapmaz, stdin okumaz, hiçbir credential değerini
// loglamaz. `youtube-oauth-recover.mjs` (interaktif CLI) bu modülü
// kullanır; testler (`tests/oauth-recover.test.mjs`) doğrudan bunu
// import eder — gerçek Google ağına veya terminale ihtiyaç yok.

import { google } from "googleapis";

export const REDIRECT_URI = "http://localhost:53682";
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

// Authorization URL'i üretir. client_secret bu URL'nin İÇİNE hiçbir zaman
// yazılmaz (Google'ın authorize endpoint'i onu istemez) — sadece yerel
// OAuth2 nesnesini kurmak için kullanılır.
export function buildAuthUrl({ clientId, clientSecret, redirectUri = REDIRECT_URI }) {
  if (!clientId || !clientSecret) {
    throw new Error("buildAuthUrl: clientId ve clientSecret gerekli");
  }
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPE,
  });
}

// Gerçek video upload YAPMADAN sadece refresh_token -> access_token
// değişiminin çalıştığını doğrular (Stage 3 — uploadsuz auth testi).
// oauthClientImpl enjekte edilebilir (testlerde gerçek google.auth.OAuth2
// yerine sahte bir constructor verilir, ağa hiç çıkılmaz).
export async function verifyTokenExchange({ clientId, clientSecret, refreshToken, oauthClientImpl } = {}) {
  const OAuth2Ctor = oauthClientImpl || google.auth.OAuth2;
  try {
    const client = new OAuth2Ctor(clientId, clientSecret);
    client.setCredentials({ refresh_token: refreshToken });
    await client.getAccessToken();
    return { ok: true };
  } catch (err) {
    return { ok: false, errorType: redactGoogleError(err) };
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

// readline `_writeToOutput` maskeleme kararı — saf fonksiyon, gerçek TTY
// gerektirmeden test edilebilir. Satır sonu ve prompt metni aynen yazılır,
// yazılan her karakter tek bir "*" ile değiştirilir (gerçek değer asla
// ekrana basılmaz).
export function maskedOutputChunk(stringToWrite, promptText) {
  if (stringToWrite === "\n" || stringToWrite === "\r\n") return stringToWrite;
  if (stringToWrite === promptText) return promptText;
  return "*";
}
