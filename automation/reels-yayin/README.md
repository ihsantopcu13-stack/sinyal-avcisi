# Reels otomatik yayın

`output_kanca`'da üretilen Reels'leri (video + kapak + açıklama) **Instagram** (Graph API), **Facebook Sayfası** (Reels) ve **YouTube Shorts**'a sırayla paylaşır. İş akışı: `.github/workflows/reels-yayin.yml`.

## Nasıl çalışır

| | |
|---|---|
| Takvim | Her gün **08:30, 13:00, 20:00** (TR). Her çalışma kuyruktaki **sıradaki konuyu** üç platforma gönderir; 30 konu ≈ 10 gün. GitHub zamanlanmış işleri birkaç dakika gecikebilir. |
| Güvenlik kilidi | Zamanlanmış çalışmalar repo değişkeni **`REELS_YAYIN=acik`** olmadıkça yalnızca **deneme** yapar. Elle çalıştırmada varsayılan mod da `deneme`. |
| Deneme modu | Hiçbir şey paylaşmaz. Anahtarları, Instagram hesabını ve yayın iznini, Facebook Sayfası token'ını, YouTube token'ını, Vercel Blob'u ve sıradaki konunun medya dosyalarını kontrol eder; gönderilecek açıklamayı loga yazar. |
| Medya | Kaynak: GitHub Release **`reels-medya-v1`** (`konuXX.mp4`, `konuXX_kapak.png`). Instagram/Facebook herkese açık **doğrudan** adres istediği için dosya yayın anında **Vercel Blob**'a kopyalanır (bir kez). YouTube'a dosyanın kendisi yüklenir. |
| Instagram | `media_type=REELS`, `cover_url` = kapak, `share_to_feed=true`; yayından sonra mini test **ilk yorum** olarak eklenir (API yorum sabitlemeyi desteklemez). |
| Facebook | Sayfa Reels yükleme akışı (start → file_url → finish, `PUBLISHED`); mini test ilk yorum. |
| YouTube | `containsSyntheticMedia: true` (**değiştirilmiş/sentetik içerik beyanı**), çocuklara özel değil, kategori Eğitim, herkese açık. |
| Yapay zekâ beyanı | Instagram'ın "AI bilgisi" etiketi Graph API'de yok; bu yüzden her açıklamada "🤖 Anlatıcımız KLOD yapay zekâ ile oluşturulmuştur." satırı var. |
| Hata | Platformlar bağımsız: biri başarısız olursa diğerleri tekrar gönderilmez, yalnız o platform sonraki çalışmada yeniden denenir (en fazla 3 kez). İlerleme `data/durum.json`'a commit edilir. |

Kuyruk (`data/kuyruk.json`) yerelde `yds-video-fabrikasi-space\kuyruk_olustur.py` ile üretilir; her çalışmada `test/kuyruk.test.mjs` platform kurallarını (≤2200 karakter, ≤5 hashtag, YouTube başlığı ≤100, yapay zekâ satırı…) doğrular.

## Bir kerelik kurulum (sırayla)

1. **Instagram** hesabını *Profesyonel* (İşletme veya İçerik Üreticisi) yap ve **Facebook Sayfasına bağla** (Instagram → Ayarlar → Hesap türü ve araçları / Bağlı hesaplar).
2. **developers.facebook.com** → *Uygulama oluştur* → tür **İşletme**. Uygulamaya *Instagram Graph API* (Facebook ile giriş) ürününü ekle.
3. **business.facebook.com** → *Ayarlar → Kullanıcılar → Sistem kullanıcıları* → *Ekle* (rol: Yönetici). Bu kullanıcıya **Sayfayı**, **Instagram hesabını** ve **uygulamayı** tam yetkiyle ata.
4. Aynı ekranda *Yeni token oluştur* → uygulamayı seç → süre **Asla sona ermez** → izinler: `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `publish_video`, `business_management`. Token'ı kopyala.
5. **Kimlikleri bul** (developers.facebook.com/tools/explorer, 4. adımdaki token'la):
   - `GET me/accounts` → Sayfanın `id`'si = **FB_PAGE_ID**
   - `GET {FB_PAGE_ID}?fields=instagram_business_account` → `instagram_business_account.id` = **IG_USER_ID**
6. **GitHub Secrets** (repo → Settings → Secrets and variables → Actions → *New repository secret*): `META_ACCESS_TOKEN` (4. adım), `FB_PAGE_ID`, `IG_USER_ID`. YouTube (`YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN`) ve `BLOB_READ_WRITE_TOKEN` zaten tanımlı.
7. **YouTube**, console.cloud.google.com → projen:
   - *OAuth onay ekranı* durumu **In production** olmalı (*Testing* modunda refresh token 7 günde geçersiz olur). Değiştirdiysen token'ı `automation/video-pipeline/scripts/youtube-oauth-recover.mjs` ile yenile.
   - **Önemli:** Denetimden (audit) geçmemiş API projelerinden yüklenen videolar YouTube tarafından **gizli (private)** kilitlenir. Herkese açık Shorts için *YouTube API Services – Audit and Quota Extension* formunu doldur. Onay gelene kadar videolar gizli yüklenir.
8. Medya yüklemesine onay ver (videolar herkese açık bir GitHub Release'e konur; Claude `medya_yukle.ps1` ile yükler).
9. PR'ı merge et → *Actions → "Reels — Instagram, Facebook, YouTube Shorts" → Run workflow → mod: deneme*. Bütün satırlar ✔ olmalı.
10. Otomatik yayını aç: *Settings → Secrets and variables → Actions → Variables → New repository variable* → ad **`REELS_YAYIN`**, değer **`acik`**. Durdurmak için değeri değiştir ya da sil.
