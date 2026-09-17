// ============================================================
// YOUTUBE OAUTH — GÜVENLİ KURTARMA ARACI (interaktif, tek seferlik)
// ============================================================
// AMAÇ: Google Cloud Console'da Desktop OAuth Client için yeni bir
// Client Secret oluşturduktan SONRA, aynı Client ID + yeni Client Secret
// ile yeni bir refresh token üretmek, upload YAPMADAN token exchange'i
// doğrulamak ve (onay verirsen) üç GitHub Secret'ı tek seferde,
// değerleri hiç terminale/log'a yazmadan güncellemek.
//
// GÜVENLİK:
// - CLIENT_SECRET terminalde MASKELİ girilir (readline._writeToOutput
//   üzerinden — bkz. _oauth-recover-lib.mjs maskedOutputChunk).
// - refresh_token / access_token HİÇBİR ZAMAN console.log'a yazılmaz —
//   sadece bu process'in belleğinde tutulur.
// - Google hata mesajları redactGoogleError() ile süzülür; sadece
//   bilinen kısa hata kodu (örn. invalid_client) gösterilir.
// - GitHub Secrets güncellemesi `gh secret set <AD> --body -` ile,
//   değer child process STDIN'inden verilir — argv'de asla geçmez,
//   shell history'ye düşmez.
// - Upload YAPMAZ (youtube.videos.insert hiç çağrılmaz).
//
// Kullanım (SEN çalıştıracaksın — bu script şu an OTOMATİK ÇALIŞTIRILMADI):
//   cd automation/video-pipeline
//   node scripts/youtube-oauth-recover.mjs
//
// Adımlar: Client ID (env varsa otomatik) -> Client Secret (maskeli) ->
// tarayıcıda izin -> local callback -> upload'sız doğrulama -> (onayınla)
// GitHub Secrets güncelleme.

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import readline from "node:readline";
import {
  REDIRECT_URI,
  buildAuthUrl,
  exchangeCodeForTokens,
  verifyTokenExchange,
  updateAllThreeSecrets,
  maskedOutputChunk,
  redactGoogleError,
} from "./_oauth-recover-lib.mjs";

const PORT = 53682; // mevcut Desktop OAuth Client'ın kayıtlı redirect URI'siyle AYNI olmalı

function plainPrompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (value) => {
      rl.close();
      resolve(value.trim());
    });
  });
}

// CLIENT_SECRET asla ekrana yazılmaz — her tuş vuruşu "*" ile gösterilir.
function maskedPrompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let muted = false;
  const originalWrite = rl._writeToOutput.bind(rl);
  rl._writeToOutput = (stringToWrite) => {
    originalWrite(muted ? maskedOutputChunk(stringToWrite, question) : stringToWrite);
  };
  return new Promise((resolve) => {
    rl.question(question, (value) => {
      // Girilen değer readline geçmişine (yukarı ok ile erişilebilecek
      // şekilde) düşmesin.
      if (Array.isArray(rl.history)) rl.history = rl.history.slice(1);
      rl.close();
      resolve(value);
    });
    muted = true;
  });
}

async function confirmPrompt(question) {
  const cevap = await plainPrompt(`${question} (y/N): `);
  return /^y(es)?$/i.test(cevap.trim());
}

async function getClientId() {
  if (process.env.YOUTUBE_CLIENT_ID) {
    console.log("YOUTUBE_CLIENT_ID ortam değişkeninden alındı.");
    return process.env.YOUTUBE_CLIENT_ID;
  }
  return plainPrompt("Google Cloud Desktop Client ID: ");
}

async function getClientSecret() {
  return maskedPrompt("Yeni Client Secret (görünmeyecek): ");
}

function waitForAuthorizationCode(authUrl) {
  console.log("\n1) Aşağıdaki linki bir tarayıcıda aç:\n");
  console.log(authUrl);
  console.log("\n2) Video yükleme yetkisini vereceğin YouTube kanalının bağlı olduğu");
  console.log("   Google hesabıyla giriş yap ve izin ver.\n");
  console.log(`Bekleniyor... (http://localhost:${PORT} adresine yönlendirme bekleniyor)\n`);

  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, REDIRECT_URI);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.end("Yetkilendirme reddedildi, terminale dön.");
        server.close();
        reject(new Error("authorization_denied"));
        return;
      }
      if (!code) {
        res.end("Kod bulunamadı.");
        return;
      }
      res.end("Yetkilendirme tamamlandı, bu sekmeyi kapatabilirsin. Terminale dön.");
      server.close();
      resolve(code);
    });
    server.listen(PORT);
  });
}

async function main() {
  console.log("=== YouTube OAuth güvenli kurtarma ===");
  console.log("Bu araç video YÜKLEMEZ — sadece yeni bir refresh token üretip doğrular.\n");

  const clientId = await getClientId();
  const clientSecret = await getClientSecret();

  const authUrl = buildAuthUrl({ clientId, redirectUri: REDIRECT_URI });
  const code = await waitForAuthorizationCode(authUrl);

  let refreshToken;
  try {
    const tokens = await exchangeCodeForTokens({ clientId, clientSecret, redirectUri: REDIRECT_URI, code });
    if (!tokens.refresh_token) {
      console.error(
        "refresh_token dönmedi (genelde bu hesap için daha önce zaten izin verilmiş olmasından kaynaklanır)."
      );
      console.error("Çözüm: https://myaccount.google.com/permissions adresinden bu uygulamanın erişimini kaldır, tekrar dene.");
      process.exitCode = 1;
      return;
    }
    refreshToken = tokens.refresh_token; // SADECE bellekte — hiç loglanmaz
  } catch (err) {
    console.error(`Token değişimi başarısız: ${redactGoogleError(err)}`);
    process.exitCode = 1;
    return;
  }

  console.log("\nYeni refresh token üretildi (değer güvenlik gereği gösterilmiyor).");
  console.log("Upload YAPILMADAN token exchange doğrulanıyor...\n");

  const testSonuc = await verifyTokenExchange({ clientId, clientSecret, refreshToken });
  if (!testSonuc.ok) {
    console.log(`YOUTUBE_OAUTH_TOKEN_FAIL: ${testSonuc.errorType}`);
    console.log("\nGitHub Secrets GÜNCELLENMEDİ (doğrulama başarısız olduğu için).");
    process.exitCode = 1;
    return;
  }
  console.log("YOUTUBE_OAUTH_TOKEN_OK");

  const guncelle = await confirmPrompt(
    "\nDoğrulama başarılı. Üç GitHub Secret'ı (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN) şimdi güncellemek ister misin?"
  );
  if (!guncelle) {
    console.log("GitHub Secrets güncellenmedi (kullanıcı onayı verilmedi). Değerler bu process kapanınca bellekten silinir.");
    return;
  }

  const sonuclar = await updateAllThreeSecrets({ clientId, clientSecret, refreshToken }, { spawnImpl: spawn });
  console.log("\n=== GitHub Secrets güncelleme sonucu ===");
  for (const r of sonuclar) {
    console.log(`${r.ok ? "OK" : "FAIL"} — ${r.name}`);
  }
  if (sonuclar.some((r) => !r.ok)) {
    console.log("\nEn az bir secret güncellemesi başarısız oldu — yukarıdaki isimleri kontrol et ve `gh secret set <AD>` ile elle tamamla.");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Beklenmeyen hata (detay gizlendi güvenlik amacıyla).", err?.code || "");
  process.exitCode = 1;
});
