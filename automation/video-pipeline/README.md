# Video Pipeline — Kurulum

Akış: sitedeki gerçek Sinyal Lab soru havuzu (`data/sorular.json`) → OpenAI TTS
(seslendirme) → Remotion (9:16 branded video + altyazı) → YouTube Shorts +
Instagram Reels (Buffer üzerinden).

Her gün 20:00 TR saatinde `.github/workflows/video-pipeline.yml` üzerinden otomatik
çalışır (GitHub Actions). Manuel tetiklemek için repo → Actions →
"Video Pipeline (YDS/YÖKDİL Shorts + Reels)" → **Run workflow**.

## Gerekli GitHub Secrets

Repo → Settings → Secrets and variables → Actions → **New repository secret**:

| Secret adı | Nereden alınır |
|---|---|
| `OPENAI_API_KEY` | platform.openai.com → API Keys (sitenin kendi TTS'inde de kullanılan aynı key) |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` / `YOUTUBE_REFRESH_TOKEN` | aşağıdaki "YouTube OAuth kurulumu" |
| `BUFFER_ACCESS_TOKEN` | Buffer → Settings → API (GraphQL API anahtarı — eski REST "access token"ı değil) |
| `BUFFER_CHANNEL_ID` | Opsiyonel — boş bırakılırsa Buffer hesabına bağlı Instagram kanalı otomatik bulunur |

`GITHUB_TOKEN` için bir şey yapmanıza gerek yok — GitHub Actions otomatik sağlar,
workflow'daki `permissions: contents: write` videoyu bir GitHub Release asset'i
olarak barındırıp Buffer'a public URL verebilmek için gerekli.

## Soru havuzu

İçerik, sitedeki (`index.html` → `SL_HAVUZ`) gerçek YDS/YÖKDİL sorularından gelir —
Claude ya da başka bir modelin uydurduğu bir şey değil. `scripts/extract-sorular.mjs`
bu havuzu `data/sorular.json`'a çıkarır; siteye yeni sorular eklendiğinde:

```bash
cd automation/video-pipeline
npm run extract-sorular
```

`generate-script.mjs` günün sorusunu (gün sayısına göre deterministik, ~59 günde bir
tekrar eden) `data/sorular.json`'dan seçer; sadece hook ve kapanış cümlesi önceden
yazılmış şablonlardan seçilir (kapanış her zaman sadece sinyal-avcisi.com'u tanıtır).

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

## Instagram (Buffer) kurulumu (tek seferlik)

1. [buffer.com](https://buffer.com) → hesap oluştur/giriş yap.
2. **Connect a channel** → Instagram → hesabınla giriş yap, izin ver (Instagram
   hesabının Business/Creator tipinde ve bir Facebook Sayfası'na bağlı olması
   Meta'nın kısıtı — Buffer bunu senin adına OAuth ile hallediyor).
3. **Settings → API** → yeni bir API key oluştur → `BUFFER_ACCESS_TOKEN`.

## Yerelde tek adım test etmek

```bash
cd automation/video-pipeline
npm install
export OPENAI_API_KEY=...

npm run generate-script   # out/script.json (gerçek soru havuzundan)
npm run generate-audio    # out/render-props.json + public/audio.mp3
npm run render            # out/video.mp4 — bunu izleyip kontrol et

# Yayınlamadan önce video.mp4'ü gözle kontrol etmeden gerçek hesaplara
# yüklemeyi tetiklemeyin — aşağıdaki adımlar gerçek YouTube/Instagram
# hesaplarına canlı yayın yapar:
npm run upload-youtube
npm run upload-instagram   # Buffer üzerinden (GITHUB_TOKEN + BUFFER_ACCESS_TOKEN gerekir)
```

Tüm akışı tek komutla çalıştırmak için: `npm run pipeline` (yukarıdaki tüm
adımları sırayla çalıştırır — GitHub Actions da bunu kullanır).

## Notlar

- Instagram Reels container'ları resimlere göre çok daha yavaş işlenir;
  `upload-instagram-buffer.mjs` içindeki bekleme süresi (~3-4 dakikaya kadar)
  buna göre ayarlandı.
- Render edilen video, Buffer'ın `video_url` gereksinimi için bu repoda bir
  GitHub Release asset'i olarak barındırılır (kalıcı olarak — GitHub Release'ler
  storage maliyeti oluşturmaz, sadece dosya boyutu limiti vardır).
- Video markası: koyu yeşil zemin, turkuaz vurgu + beyaz metin (bkz.
  `src/ShortVideo.jsx`).
