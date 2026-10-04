# Reels otomatik yayın

`output_kanca`'da üretilen Reels'leri (video + açıklama) **Instagram** ve **Facebook Sayfası**'na (mevcut **Buffer** bağlantısıyla) ve **YouTube Shorts**'a (mevcut **YouTube Data API** bağlantısıyla) sırayla paylaşır. İş akışı: `.github/workflows/reels-yayin.yml`.

## Nasıl çalışır

| | |
|---|---|
| Takvim | Her gün **08:30, 13:00, 20:00** (TR). Her çalışma kuyruktaki **sıradaki konuyu** Instagram ve Facebook'a gönderir, YouTube'a da bekleyen sırasıyla yükler; 40 konu ≈ 14 gün. GitHub zamanlanmış işleri birkaç dakika gecikebilir. Not: günlük video hattı (`video-pipeline.yml`) da 20:00'de Instagram'a Reels gönderiyor. |
| Güvenlik kilidi | Zamanlanmış çalışmalar repo değişkeni **`REELS_YAYIN=acik`** olmadıkça yalnızca **deneme** yapar. Elle çalıştırmada varsayılan mod da `deneme`. |
| Deneme modu | Hiçbir şey paylaşmaz. Anahtarları, Buffer'daki Instagram ve Facebook kanallarını, Buffer şemasının desteklediği alanları (Facebook Reels, ilk yorum), YouTube token'ını ve sıradaki konunun videosunu kontrol eder; gönderilecek açıklamayı loga yazar. |
| Medya | GitHub Release **`reels-medya-v1`** (`konuXX.mp4`). Buffer'a Release'in herkese açık adresi verilir (günlük video hattı da böyle çalışıyor); YouTube'a dosyanın kendisi yüklenir. |
| Instagram (Buffer) | Reels, akışta da paylaşılır, **yapay zekâ etiketi işaretli** (`isAiGenerated: true`). **Kapak: videonun ilk karesi** (Buffer Instagram'da kapak görseli kabul etmiyor; ilk kare zaten kanca kartı). |
| Facebook (Buffer) | Buffer şeması destekliyorsa Reels, değilse normal video gönderisi. |
| İlk yorum | Buffer şemasında "first comment" alanı varsa mini test ilk yorum olarak gider; yoksa gönderilmez (deneme modu hangisi olduğunu raporlar). |
| YouTube | `containsSyntheticMedia: true` (**değiştirilmiş/sentetik içerik beyanı**), çocuklara özel değil, kategori Eğitim, herkese açık. |
| Yapay zekâ beyanı | Instagram'da Buffer'ın `isAiGenerated` alanıyla etiket; ayrıca her açıklamada "🤖 Anlatıcımız KLOD yapay zekâ ile oluşturulmuştur." satırı. YouTube'da sentetik içerik beyanı. |
| YouTube bekleyen listesi | Instagram/Facebook YouTube'u **beklemez**. YouTube'a gidemeyen konular `durum.json` → `youtube_bekleyen` listesine girer, **kalıcı atlanmaz**; YouTube düzelince eskiden yeniye, çalışma başına en fazla 2 yüklenir (YouTube kotası günde ~6 yükleme). Bir çalışmada ilk YouTube hatasında o çalışmanın YouTube denemeleri durur. Kurallar: `kuyruk-mantigi.mjs`, testi: `test/durum.test.mjs`. |
| Hata | Instagram/Facebook bağımsız: biri başarısız olursa diğeri tekrar gönderilmez, yalnız o platform sonraki çalışmada yeniden denenir (en fazla 3 kez; sonra o konu için bırakılır). İlerleme `data/durum.json`'a commit edilir. Buffer gönderileri ~1 dk sonrasına zamanlanır; Buffer'ın kendi yayın sonucu Buffer panelinde görünür. |

Kuyruk (`data/kuyruk.json`) yerelde `yds-video-fabrikasi-space\kuyruk_olustur.py` ile üretilir; her çalışmada `test/kuyruk.test.mjs` platform kurallarını (≤2200 karakter, ≤5 hashtag, YouTube başlığı ≤100, yapay zekâ satırı, istatistik iddiası yok…) doğrular.

Gerekli secret'lar (hepsi zaten tanımlı): `BUFFER_ACCESS_TOKEN`, `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`. `GITHUB_TOKEN` otomatik gelir.

## Bir kerelik kurulum (sırayla)

1. **Buffer'a Facebook Sayfasını bağla** (bağlı değilse — deneme modu "Buffer Facebook Sayfası kanalı" satırında söyler):
   1. buffer.com'a gir → sol menüde kanallar listesinin altındaki **"+"** / **Kanal bağla** (Connect channel).
   2. **Facebook**'u seç → **Facebook Sayfası** (Page; Grup değil).
   3. Açılan Facebook penceresinde, **Sinyal Avcısı Sayfasını yöneten** Facebook hesabıyla giriş yap ve Buffer'a izin ver.
   4. Sayfa listesinde **Sinyal Avcısı**'nı işaretle → onayla. Buffer kanal listesinde Facebook simgeli "Sinyal Avcısı" görünmeli.
   - Buffer planının kanal sınırı dolduysa Buffer bunu bildirir.
2. **YouTube**, console.cloud.google.com → projen:
   - *OAuth onay ekranı* durumu **In production** olmalı (*Testing* modunda refresh token 7 günde geçersiz olur). Değiştirdiysen token'ı `automation/video-pipeline/scripts/youtube-oauth-recover.mjs` ile yenile.
   - **Önemli:** Denetimden (audit) geçmemiş API projelerinden yüklenen videolar YouTube tarafından **gizli (private)** kilitlenir. Herkese açık Shorts için *YouTube API Services – Audit and Quota Extension* formunu doldur.
3. Medya yüklemesine onay ver (videolar herkese açık GitHub Release'e konur; Claude `medya_yukle.ps1` ile yükler).
4. PR'ı merge et → *Actions → "Reels — Instagram, Facebook (Buffer), YouTube Shorts" → Run workflow → mod: deneme*. Bütün satırlar ✔ olmalı.
5. Otomatik yayını aç: *Settings → Secrets and variables → Actions → Variables → New repository variable* → ad **`REELS_YAYIN`**, değer **`acik`**. Durdurmak için değeri değiştir ya da sil.
