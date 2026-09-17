// ============================================================
// YouTube OAuth güvenli kurtarma — test edilebilir saf mantık
// ============================================================
// Bu modül ağ çağrısı yapmaz (fetchImpl enjekte edilmediği sürece), stdin
// okumaz, hiçbir credential değerini loglamaz. Bilerek `googleapis`
// paketine bağımlı DEĞİL — repo'nun izole CI'ı (.github/workflows/
// faz1-avci-ci.yml) `npm install` çalıştırmadan `node --check` + testleri
// yürütüyor (bkz. o dosyanın başındaki not), bu yüzden buradaki authorize
// URL üretimi ve token endpoint çağrısı native `fetch`/`URLSearchParams`
// ile elle yapılıyor. `youtube-oauth-recover.mjs` (interaktif CLI) bu
// modülü kullanır; testler (`tests/oauth-recover.test.mjs`) doğrudan bunu
// import eder — gerçek Google ağına veya terminale ihtiyaç yok.

export const REDIRECT_URI = "http://localhost:53682";
export const SCOPE = ["https://www.googleapis.com/auth/youtube.upload"];
export const REQUIRED_ENV_NAMES = ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET", "YOUTUBE_REFRESH_TOKEN"];
const AUTHORIZE_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

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
// yazılmaz (Google'ın authorize endpoint'i onu istemez, bu fonksiyon onu
// parametre olarak dahi almaz).
export function buildAuthUrl({ clientId, redirectUri = REDIRECT_URI } = {}) {
  if (!clientId) {
    throw new Error("buildAuthUrl: clientId gerekli");
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPE.join(" "),
  });
  return `${AUTHORIZE_ENDPOINT}?${params.toString()}`;
}

// oauth2.googleapis.com/token'a tek bir istek — grant tipi çağırana ait.
// fetchImpl enjekte edilebilir (testlerde gerçek ağa hiç çıkılmaz).
async function tokenEndpointRequest(bodyParams, { fetchImpl = fetch } = {}) {
  const res = await fetchImpl(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(bodyParams).toString(),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    const err = new Error(data?.error || "unknown_error");
    err.response = { data };
    throw err;
  }
  return data;
}

// Authorization code -> {access_token, refresh_token, ...} değişimi
// (loopback callback'ten gelen `code` ile, tek seferlik).
export async function exchangeCodeForTokens({ clientId, clientSecret, redirectUri = REDIRECT_URI, code, fetchImpl } = {}) {
  return tokenEndpointRequest(
    {
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    },
    { fetchImpl }
  );
}

// Gerçek video upload YAPMADAN sadece refresh_token -> access_token
// değişiminin çalıştığını doğrular (Stage 3 — uploadsuz auth testi).
// fetchImpl enjekte edilebilir (testlerde gerçek ağa hiç çıkılmaz).
export async function verifyTokenExchange({ clientId, clientSecret, refreshToken, fetchImpl } = {}) {
  try {
    await tokenEndpointRequest(
      {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      },
      { fetchImpl }
    );
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
