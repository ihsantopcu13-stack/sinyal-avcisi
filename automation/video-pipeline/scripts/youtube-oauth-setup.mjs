// ============================================================
// TEK SEFERLİK KURULUM SCRIPT'İ — YouTube refresh token alma
// ============================================================
// Google, "oob" (kodu elle kopyala-yapıştır) akışını kaldırdığı için
// OAuth2 "Desktop app" istemcilerinin desteklediği loopback (yerel
// sunucu) akışını kullanıyoruz: bu script geçici olarak localhost'ta
// bir sunucu açar, tarayıcıda izin verdiğinde Google seni bu sunucuya
// geri yönlendirir, script kodu yakalar ve refresh token'a çevirir.
//
// Kullanım:
//   cd automation/video-pipeline
//   npm install
//   node scripts/youtube-oauth-setup.mjs <CLIENT_ID> <CLIENT_SECRET>

import { createServer } from "node:http";
import { google } from "googleapis";

const [, , clientId, clientSecret] = process.argv;

if (!clientId || !clientSecret) {
  console.error("Kullanım: node scripts/youtube-oauth-setup.mjs <CLIENT_ID> <CLIENT_SECRET>");
  process.exit(1);
}

const PORT = 53682; // rastgele sabit bir port — Google Cloud Console'da bu portu redirect URI'ye eklemen gerekiyor
const REDIRECT_URI = `http://localhost:${PORT}`;

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline", // refresh token almak için şart
  prompt: "consent", // her seferinde refresh token dönmesi için şart
  scope: ["https://www.googleapis.com/auth/youtube.upload"],
});

console.log("\n1) Aşağıdaki linki bir tarayıcıda aç:\n");
console.log(authUrl);
console.log("\n2) Video yükleme yetkisini yükleyeceğin YouTube kanalının bağlı olduğu");
console.log("   Google hesabıyla giriş yap ve izin ver.\n");
console.log(`Bekleniyor... (http://localhost:${PORT} adresine yönlendirme bekleniyor)\n`);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, REDIRECT_URI);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      res.end("Yetkilendirme reddedildi, terminale dön.");
      console.error("Google hata döndü:", error);
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.end("Kod bulunamadı.");
      return;
    }

    res.end("Yetkilendirme tamamlandı, bu sekmeyi kapatabilirsin. Terminale dön.");
    server.close();

    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      console.error(
        "\nrefresh_token dönmedi. Bu genelde bu hesap için daha önce zaten izin verilmiş olmasından kaynaklanır."
      );
      console.error(
        "Çözüm: https://myaccount.google.com/permissions adresinden bu uygulamanın erişimini kaldır, sonra script'i tekrar çalıştır.\n"
      );
      process.exit(1);
    }

    console.log("\nBaşarılı! Aşağıdaki değeri YOUTUBE_REFRESH_TOKEN GitHub secret'ı olarak ekle:\n");
    console.log(tokens.refresh_token);
    console.log("");
    process.exit(0);
  } catch (err) {
    console.error("Token değişimi başarısız:", err.message);
    res.end("Hata oluştu, terminale dön.");
    server.close();
    process.exit(1);
  }
});

server.listen(PORT);
