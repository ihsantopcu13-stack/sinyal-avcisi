# Video Pipeline — Kurulum

Akış: Claude API → ElevenLabs (Yunus sesi) → Remotion (9:16 branded video + altyazı) →
Vercel Blob (geçici public URL) → YouTube Shorts + Instagram Reels.

Her gün 20:00 TR saatinde `.github/workflows/video-pipeline.yml` üzerinden otomatik
çalışır (GitHub Actions). Manuel tetiklemek için repo → Actions →
"Video Pipeline (YDS/YÖKDİL Shorts + Reels)" → **Run workflow**.

## Gerekli GitHub Secrets

Repo → Settings → Secrets and variables → Actions → **New repository secret**:

| Secret adı | Nereden alınır |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys (muhtemelen zaten Vercel'de var, aynı değeri kopyala) |
| `ELEVENLABS_API_KEY` | elevenlabs.io → Profile → API Key (Vercel'deki `ELEVENLABS_API_KEY` ile aynı) |
| `ELEVENLABS_VOICE_ID_YUNUS` | ElevenLabs hesabında "Yunus" sesinin Voice ID'si (VoiceLab → sese tıkla → ID kopyala) |
| `BLOB_READ_WRITE_TOKEN` | Vercel → proje → Storage → Blob → bir store oluştur (yoksa) → `.env.local` sekmesinden token'ı kopyala |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` / `YOUTUBE_REFRESH_TOKEN` | aşağıdaki "YouTube OAuth kurulumu" |
| `IG_SINYAL_ACCESS_TOKEN` / `IG_SINYAL_BUSINESS_ACCOUNT_ID` | `feat/instagram-otomasyonu` dalındaki Sinyal Avcısı Instagram akışıyla aynı değerler (zaten kurulduysa Vercel'den kopyala) |

İsteğe bağlı: `CLAUDE_MODEL` adında bir **repository variable** (Settings → Secrets and
variables → Actions → Variables) tanımlarsan farklı bir model kullanılır (varsayılan
`claude-sonnet-5`).

## YouTube OAuth kurulumu (tek seferlik)

YouTube Data API v3, basit bir API anahtarı değil OAuth2 refresh token ister —
çünkü senin kanalına video yükleme yetkisi gerekir.

1. [Google Cloud Console](https://console.cloud.google.com) → yeni proje oluştur
   (örn. "sinyal-avcisi-video").
2. **APIs & Services → Library** → "YouTube Data API v3" ara → **Enable**.
3. **APIs & Services → OAuth consent screen** → User Type: **External** → uygulama
   adı "Sinyal Avcısı Video Pipeline" → kendi e-postanı ekle → kaydet. **Test
   users** kısmına kendi Google/YouTube hesabının e-postasını ekle (uygulama
   "Testing" modunda kalacağı için sadece test kullanıcıları giriş yapabilir —
   bu senin için sorun değil, refresh token süresiz çalışır).
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** →
   Application type: **Desktop app** → oluştur → **Client ID** ve **Client
   Secret**'ı kaydet (bunlar `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET`).
5. Aynı Credentials sayfasında oluşturduğun client'a tıkla → **Authorized
   redirect URIs** → **Add URI** → `http://localhost:53682` ekle → kaydet.
   (Google "oob" kod kopyalama akışını kaldırdığı için, aşağıdaki script
   yerel bir sunucu açıp bu adrese gelen yönlendirmeyi yakalıyor.)
6. Refresh token almak için (bir kereliğine, kendi bilgisayarında):
   ```bash
   cd automation/video-pipeline
   npm install
   node scripts/youtube-oauth-setup.mjs "CLIENT_ID" "CLIENT_SECRET"
   ```
   Terminalde çıkan linki tarayıcıda aç → kendi YouTube kanalının bağlı
   olduğu Google hesabıyla giriş yap → izin ver. Tarayıcı otomatik olarak
   script'in açtığı yerel sunucuya yönlenir, terminale `refresh_token`
   değeri yazdırılır. Bu değer → `YOUTUBE_REFRESH_TOKEN` secret'ı.

   Eğer terminalde `refresh_token dönmedi` hatası alırsan, bu hesaba daha
   önce zaten izin vermişsindir: https://myaccount.google.com/permissions
   adresinden "Sinyal Avcısı Video Pipeline" erişimini kaldır ve script'i
   tekrar çalıştır.

## Yerelde tek adım test etmek

```bash
cd automation/video-pipeline
npm install
export ANTHROPIC_API_KEY=...
export ELEVENLABS_API_KEY=...
export ELEVENLABS_VOICE_ID_YUNUS=...

npm run generate-script   # out/script.json
npm run generate-audio    # out/render-props.json + public/audio.mp3
npm run render            # out/video.mp4 — bunu izleyip kontrol et

# Yayınlamadan önce video.mp4'ü gözle kontrol etmeden gerçek hesaplara
# yüklemeyi tetiklemeyin — aşağıdaki adımlar gerçek YouTube/Instagram
# hesaplarına canlı yayın yapar:
npm run upload-blob
npm run upload-youtube
npm run upload-instagram
```

Tüm akışı tek komutla çalıştırmak için: `npm run pipeline` (yukarıdaki tüm
adımları sırayla çalıştırır — GitHub Actions da bunu kullanır).

## Notlar

- Instagram Reels container'ları resimlere göre çok daha yavaş işlenir;
  `upload-instagram.mjs` içindeki bekleme süresi (~3-4 dakikaya kadar) buna
  göre ayarlandı.
- Render edilen video geçici olarak Vercel Blob'a yüklenir (Instagram'ın
  `video_url` gereksinimi için), Instagram'a yayınlandıktan sonra otomatik
  silinir.
- Video markası (renkler, "SİNYAL AVCISI" başlığı) sitedeki
  `api/og-instagram.mjs`'teki Instagram görsel şablonuyla aynı paleti kullanır.
