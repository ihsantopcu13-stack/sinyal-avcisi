# Reels otomatik yayın

`output_kanca`'da üretilen Reels'leri (video + açıklama) **Instagram** ve **Facebook Sayfası**'na (mevcut **Buffer** bağlantısıyla) ve **YouTube Shorts**'a (mevcut **YouTube Data API** bağlantısıyla) sırayla paylaşır. İş akışı: `.github/workflows/reels-yayin.yml`.

## Nasıl çalışır

| | |
|---|---|
| Takvim | Yayın saatleri her gün **08:30, 13:00, 17:30** (İstanbul); 40 konu ≈ 14 gün. İş akışı günde **bir kez, 21:00'de** çalışır ve önündeki saatleri (bugünün kalanı + yarın) sıradaki konularla doldurup Buffer'a **tam o saat için zamanlanmış** gönderir. GitHub bu repoda zamanlanmış işleri 2–6 saat geç başlatabildiği için saati Buffer tutar; gecikme yayın saatini etkilemez. Günlük video hattı (`video-pipeline.yml`) 20:00'de ayrı çalışır. |
| Çift gönderim yok | Her konu bir kez bir saate atanır (`durum.json` → `konular[k].slot`) ve her Buffer gönderiminden hemen sonra kaydedilir; aynı konu iki kez gönderilmez. |
| Kaçan çalışma | Bir gün çalışma olmazsa sonraki çalışma kaldığı konudan devam eder: geçmiş boş saatler doldurulmaz (rastgele saatte yayın olmaz), hiçbir konu atlanmaz. Bir platform başarısızsa yalnız o platform yeniden denenir (saati hâlâ gelecekteyse aynı saate, geçtiyse 15 dk sonrasına). Hiçbir platforma gidemeyen konunun saati bırakılır, sonraki ilk boş saate geçer. |
| Güvenlik kilidi | Zamanlanmış çalışmalar repo değişkeni **`REELS_YAYIN=acik`** olmadıkça yalnızca **deneme** yapar. Elle çalıştırmada varsayılan mod da `deneme`. |
| Deneme modu | Hiçbir şey paylaşmaz. Anahtarları, Buffer'daki Instagram ve Facebook kanallarını, Buffer şemasının desteklediği alanları (Facebook Reels, ilk yorum), YouTube token'ını ve sıradaki konunun videosunu kontrol eder; gönderilecek açıklamayı loga yazar. |
| Medya | GitHub Release **`reels-medya-v1`** (`konuXX.mp4`). Buffer'a Release'in herkese açık adresi verilir (günlük video hattı da böyle çalışıyor); YouTube'a dosyanın kendisi yüklenir. |
| Instagram (Buffer) | Reels, akışta da paylaşılır, **yapay zekâ etiketi işaretli** (`isAiGenerated: true`). Kapak: aşağıdaki **Kapak** satırına bak. |
| Kapak | Instagram kapağı ilk kareden alır, Buffer kapak görseli kabul etmez. Bu yüzden her çalışmada `tasarim/kapak.py` sıradaki konulara büyük başlıklı kapak karesi (0,12 sn) ekler ve `konuXX-kapak.mp4` olarak Release'e koyar (üzerine yazmaz). Instagram/Facebook bu dosyayı alır; yoksa asıl videoyu. YouTube asıl videoyu yükler. Örnek kapak: `python3 tasarim/kapak.py --ornek 68`. |
| Facebook (Buffer) | Buffer şeması destekliyorsa Reels, değilse normal video gönderisi. |
| İlk yorum | Buffer şemasında "first comment" alanı varsa mini test ilk yorum olarak gider; yoksa gönderilmez (deneme modu hangisi olduğunu raporlar). |
| YouTube | `containsSyntheticMedia: true` (**değiştirilmiş/sentetik içerik beyanı**), çocuklara özel değil, kategori Eğitim, herkese açık. |
| Yapay zekâ beyanı | Instagram'da Buffer'ın `isAiGenerated` alanıyla etiket; ayrıca her açıklamada "🤖 Anlatıcımız KLOD yapay zekâ ile oluşturulmuştur." satırı. YouTube'da sentetik içerik beyanı. |
| YouTube anahtarı | YouTube yüklemesi yalnız repo değişkeni **`REELS_YOUTUBE=acik`** iken denenir. Değişken yoksa/başka değerdeyse yükleme **bekletilir**: konular `youtube_bekleyen` listesinde birikir, deneme modundaki YouTube kontrolü bilgi olarak raporlanır ve çalışmayı kırmızıya çevirmez. YouTube bağlantısı düzelince `gh variable set REELS_YOUTUBE --body acik`. |
| YouTube bekleyen listesi | Instagram/Facebook YouTube'u **beklemez**. YouTube'a gidemeyen konular `durum.json` → `youtube_bekleyen` listesine girer, **kalıcı atlanmaz**; YouTube düzelince eskiden yeniye, çalışma başına en fazla 3 yüklenir (YouTube kotası günde ~6 yükleme). Bir çalışmada ilk YouTube hatasında o çalışmanın YouTube denemeleri durur. Kurallar: `kuyruk-mantigi.mjs`, testi: `test/durum.test.mjs`. |
| Hata | Instagram/Facebook bağımsız: biri başarısız olursa diğeri tekrar gönderilmez, yalnız o platform sonraki çalışmada yeniden denenir (en fazla 3 kez; sonra o konu için bırakılır). İlerleme `data/durum.json`'a commit edilir. Buffer'ın kendi yayın sonucu Buffer panelinde görünür. |
| Kuyruk azaldı | Saate atanmamış konu sayısı **6 veya altına** inince (`KALAN_UYARI_ESIGI`, günde 3 saatle ≈ 2 günlük pay) çalışma, gönderimler bittikten sonra **kırmızı biter**: logda ve iş özetinde kalan konular ve son atanan yayın saati yazar. Gönderilenler ve `durum.json` commit'i etkilenmez. Yeni konular `kuyruk.json`'a ve Release'e eklenene kadar her çalışma kırmızı biter. Saati bırakılan başarısız konu da kalan sayılır. |

## Tekrar turu (konu 101–140)

Konu 1–40 eski tasarımda (avatar fotoğraflı) olduğu için yeni tasarımla ikinci kez sıraya girer: konu `100 + n`, `"tekrar": n`. Videolar `tasarim/yenile.py` ile eski videodan üretilir (fotoğraf yok, nane yeşili başlık, 3-2-1 sayacı, TAKİP ET kartı, −14 LUFS) ve `reels-tekrar-medya.yml` ile Release'e **üzerine yazmadan** yüklenir. 22 Ekim 2026: başlık sarıdan nane yeşiline geçti; yeni sürüm `konuXXX-nane.mp4` adıyla (eski sarı dosyalar Release'te durur, kullanılmaz). Tekrar konuları YouTube'a gitmez (ders orada zaten var).

## Türkçe alt satır

`tasarim/turkce.py` videodaki İngilizce cümlenin altına kısa Türkçe anlamını ekler (`tasarim/turkce-satirlar.json`; tekrar konuları asıl konunun satırını kullanır, konu 59 yok). Satır 3-2-1 sayacından sonra görünür, TAKİP ET kartında kalkar; ses aynı kalır. Eski şablonda (1–67, 101–140) cümle kartının altındaki boş şeride bindirilir (başlığı hâlâ sarı olan 58, 64–67 de aynı seferde nane yeşiline çevrilir); yeni şablonda (`yeni-konular.json`) kareler `uret_yeni.kare(..., tr=...)` ile yeniden çizilir, süreler ve ses asıl videodan alınır. Çıktı `konuXX-tr.mp4` (`konu101-nane.mp4` → `konu101-tr.mp4`), Release'e üzerine yazmadan yüklenir; kapak varsa onun üstüne yapılır (`konuXX-tr-kapak.mp4`). Paylaşım sırası: Türkçe+kapak > kapak > Türkçe > asıl video; YouTube Türkçe satırlı kapaksız sürümü yükler. `reels-turkce.yml` main'de eksikleri üretir; günlük yayın da kapaktan önce eksikleri tamamlar. Örnek: `python3 tasarim/turkce.py --ornek 101 56`.

## Yeni konular (56, 57, 59–63, 68–77)

Metinler `tasarim/yeni-konular.json`'da (22 Ekim 2026'da onaylandı). `tasarim/uret_yeni.py` nane yeşili şablonla video üretir (OpenAI TTS sesi, −14 LUFS) ve `--kuyruk` ile kuyruk kayıtlarını yazar. `reels-yeni-konular.yml`: PR'da konu 68 örneğini `reels-onizleme` ön sürümüne koyar; main'de eksik videoları `reels-medya-v1`'e üzerine yazmadan yükler.

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

## Site tanıtım videoları (201–203)

Sitenin yeni özelliklerini (50 Puan Programı, Puan Hedefi, Yanlış defteri + kelime kartları + puan tahmini) tanıtan Reels. Metinler `tasarim/tanitim.json`'da; `tasarim/uret_tanitim.py` nane yeşili şablonla video üretir (OpenAI TTS, −14 LUFS) ve `--kuyruk` ile kayıtları `once` alanındaki konunun önüne ekler (yayın saatini sıra belirler: 24 Eki 13:00, 25 Eki 17:30, 26 Eki 13:00). Son kart: "Yoruma PLAN yaz" (ManyChat DM) + TAKİP ET. Türkçe alt satır yok (video Türkçe); kapağı `kapak.py` ekler; YouTube'a gitmez (`"tanitim": true`), Telegram kuyruğu kendiliğinden izler. Threads aynı günlerde (`threads_gunu`) günlük ipucu yerine `threads` metnini paylaşır. `reels-tanitim.yml`: PR'da üç videoyu ve kapakları `reels-onizleme`'ye koyar; main'de eksikleri `reels-medya-v1`'e üzerine yazmadan yükler. Kare önizlemesi: `python3 tasarim/uret_tanitim.py --kare 201`.
