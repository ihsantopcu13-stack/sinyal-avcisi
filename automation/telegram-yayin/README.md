# Telegram otomatik gönderim

Kanal: **t.me/sinyalavcisiyds** · Bot: **@sinyalavcisi_yayin_bot**

| Akış | Ne gönderir | Ne zaman |
|---|---|---|
| `telegram-reels.yml` → `reels-telegram.mjs` | Reels hattının Instagram/Facebook'a zamanladığı konunun videosu + açıklaması ("Link biyografide." yerine site adresi) | Saatlik çalışır (08:20–21:20 TR); yayın saati gelmiş, **12 saatten eski olmayan** konuları gönderir. GitHub zamanlanmış işleri geciktirebildiği için Telegram gönderisi yayın saatinden biraz sonra düşebilir. |
| `gunun-sorusu-publish.yml` → `gunun-sorusu-telegram.mjs` | Günün Sorusu kartı; **cevap gizli** (Telegram spoiler, dokununca açılır) | Günün Sorusu Buffer'a gönderildikten sonra, aynı çalışmada |

## Güvenlik ve bağımsızlık

- **Kilit:** repo değişkeni `TELEGRAM_YAYIN=acik` olmadıkça iki akış da yalnız **deneme** yapar: botun kanalda yönetici olduğunu ve mesaj atabildiğini kontrol eder, gönderilecek metni loga yazar, hiçbir şey göndermez.
- **Reels hattına dokunmaz:** `reels-yayin/data/kuyruk.json` ve `durum.json` yalnız okunur; Telegram ilerlemesi `data/telegram-durum.json`'da ayrı tutulur. Aynı konu iki kez gitmez; başarısız konu en fazla 3 kez denenir.
- **Günün Sorusu'nu bozmaz:** Telegram adımı `continue-on-error` ile Buffer adımından sonra çalışır; hata olursa iş yeşil kalır, adımda uyarı görünür.
- **İlk açılışta taşkın yok:** 12 saatten eski Reels hiç gönderilmez.
- Video 49 MB'ı aşarsa (Bot API sınırı 50 MB) video yerine metin + site adresi gider.
- Token hiçbir loga ya da hata mesajına yazılmaz.

## Kurulum (bir kerelik)

1. Bot token'ını secret olarak ekle (sohbete yazma):
   `gh secret set TELEGRAM_BOT_TOKEN` → komut sorduğunda yapıştır.
2. `TELEGRAM_CHAT_ID` repo değişkeni zaten var (`@sinyalavcisiyds` ya da `-100…` biçiminde olmalı).
3. Bot kanalda **yönetici** ve **"Mesaj gönder"** izni açık olmalı.
4. *Actions → "Telegram — Reels kanala gönderim" → Run workflow → mod: deneme* → bütün satırlar ✔.
5. Aç: `gh variable set TELEGRAM_YAYIN --body acik`. Durdurmak için değeri değiştir ya da sil.

Test: `node test/telegram.test.mjs`
