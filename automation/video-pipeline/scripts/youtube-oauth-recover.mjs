// ============================================================
// YOUTUBE OAUTH — GÜVENLİ KURTARMA ARACI (SADELEŞTİRİLMİŞ, tek seferlik)
// ============================================================
// AMAÇ: Google Cloud Console'da Desktop OAuth Client için yeni bir
// Client Secret oluşturduktan SONRA, aynı Client ID + yeni Client Secret
// ile yeni bir refresh token üretmek, upload YAPMADAN token exchange'i
// doğrulamak ve (onay verirsen) üç GitHub Secret'ı tek seferde,
// değerleri hiç terminale/log'a yazmadan güncellemek.
//
// 2026-09-17 SADELEŞTİRME (1/2): Client ID/Client Secret artık terminalde
// HİÇ SORULMUYOR (ne düz ne maskeli prompt) — ikisi de SADECE ortam
// değişkeninden okunuyor. Gerekçe: önceki masked-readline giriş yöntemi
// şüpheliydi (gerçek Google hatası "client_secret is missing" idi);
// env-var-only akış, terminaldeki karakter-karakter girdi/echo zincirini
// tamamen ortadan kaldırıp olası kaynaklardan birini eler.
//
// 2026-09-17 SADELEŞTİRME (2/2): Elle yazılmış fetch/URLSearchParams
// token exchange kodu KALDIRILDI. Artık authorize URL üretiminden token
// exchange'e ve refresh doğrulamasına kadar TEK bir google-auth-library
// `OAuth2Client` nesnesi (bkz. `createOAuth2Client`) kullanılıyor — tıpkı
// production'da çalışan `upload-youtube.mjs` ve orijinal
// `youtube-oauth-setup.mjs`'nin yaptığı gibi.
//
// GÜVENLİK:
// - YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET SADECE process.env'den
//   okunur — hiçbir interaktif prompt YOK.
// - Başlangıçta ve token isteğinden hemen önce SADECE boolean varlık
//   kontrolü loglanır (`credentialPresenceCheck`) — değerin kendisi
//   veya uzunluğu ASLA yazdırılmaz.
// - client_secret boş/eksikse Google'a HİÇBİR istek gönderilmeden durulur.
// - refresh_token / access_token HİÇBİR ZAMAN console.log'a yazılmaz —
//   sadece bu process'in belleğinde tutulur.
// - Google hata mesajları redactGoogleError() + safeTokenErrorDetails()
//   ile süzülür; sadece kısa hata kodu + status/error/error_description
//   gösterilir.
// - GitHub Secrets güncellemesi `gh secret set <AD> --body -` ile,
//   değer child process STDIN'inden verilir — argv'de asla geçmez.
// - Upload YAPMAZ (youtube.videos.insert hiç çağrılmaz).
//
// Kullanım (SEN çalıştıracaksın — bu script şu an OTOMATİK ÇALIŞTIRILMADI):
//   PowerShell'de önce:
//     $env:YOUTUBE_CLIENT_ID = "..."
//     $env:YOUTUBE_CLIENT_SECRET = "..."
//   sonra:
//     cd automation/video-pipeline
//     node scripts/youtube-oauth-recover.mjs
//
// Adımlar: env'den ID+Secret oku -> varlık kontrolü -> tarayıcıda izin ->
// local callback -> (client_secret hâlâ dolu mu doğrula) -> upload'sız
// doğrulama -> (onayınla) GitHub Secrets güncelleme.

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import readline from "node:readline";
import {
  REDIRECT_URI,
  createOAuth2Client,
  buildAuthUrl,
  exchangeCodeForTokens,
  verifyTokenExchange,
  updateAllThreeSecrets,
  redactGoogleError,
  safeTokenErrorDetails,
  printSafeErrorDetails,
  credentialPresenceCheck,
} from "./_oauth-recover-lib.mjs";

const PORT = 53682; // mevcut Desktop OAuth Client'ın kayıtlı redirect URI'siyle AYNI olmalı

// Sadece GitHub Secrets güncelleme onayı (y/N) için kullanılır — credential
// girişi DEĞİL, bu yüzden maskelemeye gerek yok.
function plainPrompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (value) => {
      rl.close();
      resolve(value.trim());
    });
  });
}

async function confirmPrompt(question) {
  const cevap = await plainPrompt(`${question} (y/N): `);
  return /^y(es)?$/i.test(cevap.trim());
}

function waitForAuthorizationCode(authUrl) {
  console.log("\n1) Aşağıdaki linki bir tarayıcıda aç:\n");
  console.log(authUrl);
  console.log("\n2) Video yükleme yetkisini vereceğin YouTube kanalının bağlı olduğu");
  console.log("   Google hesabıyla giriş yap ve izin ver.\n");
  console.log(`Bekleniyor... (${REDIRECT_URI} adresine yönlendirme bekleniyor)\n`);

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
  console.log("=== YouTube OAuth güvenli kurtarma (sadeleştirilmiş) ===");
  console.log("Bu araç video YÜKLEMEZ. Client ID/Secret terminalde SORULMAZ — sadece ortam değişkeninden okunur.\n");

  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

  const idDurumu = credentialPresenceCheck(clientId);
  const secretDurumuBaslangic = credentialPresenceCheck(clientSecret);
  console.log(`YOUTUBE_CLIENT_ID_PRESENT=${idDurumu.present}`);
  console.log(`YOUTUBE_CLIENT_SECRET_PRESENT=${secretDurumuBaslangic.present}`);

  if (!idDurumu.present || !secretDurumuBaslangic.present) {
    console.error("\nYOUTUBE_CLIENT_ID ve/veya YOUTUBE_CLIENT_SECRET ortam değişkeni set değil.");
    console.error("PowerShell'de önce şunu çalıştır, sonra script'i tekrar başlat:");
    console.error('  $env:YOUTUBE_CLIENT_ID = "..."');
    console.error('  $env:YOUTUBE_CLIENT_SECRET = "..."');
    process.exitCode = 1;
    return;
  }

  // TEK OAuth2Client — bu process boyunca authorize URL, token exchange ve
  // refresh doğrulaması hep BU nesne üzerinden gider, clientId/clientSecret/
  // redirectUri bir daha asla ayrı ayrı yeniden inşa edilmez.
  const oauth2Client = createOAuth2Client({ clientId, clientSecret, redirectUri: REDIRECT_URI });

  const authUrl = buildAuthUrl(oauth2Client);
  const code = await waitForAuthorizationCode(authUrl);

  // Token isteği gönderilmeden HEMEN ÖNCE zorunlu doğrulama: client_secret
  // env okumasından bu noktaya kadar hâlâ dolu mu? Değilse Google'a HİÇBİR
  // istek gönderilmeden kontrollü şekilde dur.
  const secretDurumu = credentialPresenceCheck(clientSecret);
  console.log(`client_secret_present=${secretDurumu.present} client_secret_length_gt_0=${secretDurumu.lengthGtZero}`);
  if (!secretDurumu.present || !secretDurumu.lengthGtZero) {
    console.error("\nclient_secret boş/eksik — Google'a hiçbir token isteği gönderilmeden duruluyor.");
    process.exitCode = 1;
    return;
  }

  let refreshToken;
  try {
    const tokens = await exchangeCodeForTokens(oauth2Client, code);
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
    printSafeErrorDetails(safeTokenErrorDetails(err));
    process.exitCode = 1;
    return;
  }

  console.log("\nYeni refresh token üretildi (değer güvenlik gereği gösterilmiyor).");
  console.log("Upload YAPILMADAN token exchange doğrulanıyor...\n");

  const testSonuc = await verifyTokenExchange(oauth2Client, refreshToken);
  if (!testSonuc.ok) {
    console.log(`YOUTUBE_OAUTH_TOKEN_FAIL: ${testSonuc.errorType}`);
    printSafeErrorDetails(testSonuc);
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
