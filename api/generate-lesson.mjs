// ============================================================
// Ders İçeriği Üretim API — SİNYAL AVCISI otomasyon pipeline'ı için.
// Gerçek soru havuzundaki (sorular.json) bir soruyu, 2026-09-11 kalite
// standardına göre (10 noktalı öğretim çerçevesi + AVCI ÇÖZÜM MOTORU +
// şık-şık eleme) tam bir video ders senaryosuna genişletir. Soru/cevap/
// İngilizce metin DEĞİŞTİRİLMEZ — sadece pedagojik içerik eklenir.
//
// klod.mjs'ten (canlı kullanıcı sohbeti) bilinçli olarak AYRI tutuldu:
// bu endpoint çok daha büyük bir max_tokens bütçesi gerektiriyor ve
// klod'un kullanıcıya dönük davranışını (kısa/Sokratik cevaplar)
// bozma riski taşımamalı.
// ============================================================

import { rateLimit } from './_rateLimit.mjs';

const SYSTEM_PROMPT = `Sen SİNYAL AVCISI platformunun video içerik yazarısın. 20 yıllık YDS/YÖKDİL sınav hazırlık uzmanı gibi, doğal ve sıcak bir Türkçe konuşma diliyle öğretiyorsun — bir öğretmenin öğrencinin yanında soru çözüyormuş gibi.

Her ders şu 10 noktayı MUTLAKA kapsamalı: (1) konu nedir, (2) sınavda nasıl karşıma çıkar, (3) ilk nereye bakarım, (4) hangi kelime/yapı sinyal verir, (5) sağında/solunda ne ararım, (6) ÖSYM nerede kandırmaya çalışır, (7) şıkları nasıl elerim, (8) doğru cevap neden doğru, (9) yanlış şıklar neden yanlış, (10) aynı yapı tekrar gelirse nasıl tanırım.

KURALLAR:
- Ağır gramer terimleriyle boğma, önce basit anlat sonra sınav tekniğini göster.
- Verilen soruyu, doğru cevabı ve İngilizce metni ASLA değiştirme.
- Sadece istenen JSON şemasında, başka hiçbir metin/markdown olmadan cevap ver.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rl = rateLimit(req, { key: 'generate-lesson', limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    res.setHeader('Retry-After', Math.ceil(rl.retryAfterMs / 1000));
    return res.status(429).json({ error: 'Çok fazla istek gönderdiniz. Biraz sonra tekrar deneyin.' });
  }

  const { soru } = req.body;
  if (!soru || !soru.soru_en || !Array.isArray(soru.secenekler_tr)) {
    return res.status(400).json({ error: 'Geçersiz soru objesi' });
  }

  const dogruHarf = String.fromCharCode(65 + (soru.dogru_index ?? 0));
  const sikSatirlari = soru.secenekler_tr.map((s, i) => `${String.fromCharCode(65 + i)}) ${s}`).join('\n');

  const userPrompt = `SORU (İngilizce): ${soru.soru_en}
SİNYAL KELİME: ${soru.sinyal || '(belirtilmemiş)'}
TÜRKÇE SORU: ${soru.soru_tr}
ŞIKLAR:
${sikSatirlari}
DOĞRU ŞIK: ${dogruHarf}
MEVCUT AÇIKLAMA: ${soru.aciklama_tr}

Bu soruyu aşağıdaki JSON şemasında genişlet (SADECE geçerli JSON döndür, kod bloğu/markdown/açıklama YOK):
{
  "hookTitle": "kısa çarpıcı başlık, büyük harf, sonunda ! (örn: DESPITE TUZAĞI!)",
  "kuralLines": ["kural satırı 1 (kısa, max 6 kelime)", "kural satırı 2 (kısa)"],
  "nedenBadge": "KISA ROZET METNİ (max 4 kelime, büyük harf, örn: DESPITE + İSİM/V-ING)",
  "nedenText": "\"neden böyle\" açıklaması, tek kısa cümle",
  "tuzakText": "ÖSYM'nin kandırma yöntemi, tek kısa cümle",
  "narration": {
    "hook": "1 cümle, dikkat çekici, merak uyandıran",
    "kural": "sinyal kelimenin/yapının kuralı, doğal konuşma diliyle, 2-3 cümle",
    "neden": "bu kural neden böyle işliyor, sağında/solunda ne aranır, 2-3 cümle",
    "tuzak": "ÖSYM'nin bu yapıda öğrenciyi nasıl kandırdığı, 1-2 cümle",
    "ornek": "örnek cümle üzerinden özne/fiil/nesne ve sinyalin nasıl göründüğü, 2 cümle",
    "soru": "mini soruyu tanıtan, öğrenciyi çözmeye davet eden 1 cümle",
    "cozum": "doğru cevabın mantığı, adım adım kısa gerekçe, 1-2 cümle",
    "avci": "AVCI REFLEKSİ — bu yapı için kısa, akılda kalıcı, formül gibi bir cümle"
  },
  "examples": [
    {
      "parts": [
        {"text": "kelime/öbek 1", "style": "plain"},
        {"text": "sinyal veya tuzak kelime/öbek", "style": "trap"},
        {"text": "fiil", "style": "verb"},
        {"text": "kalan kısım", "style": "plain"}
      ]
    }
  ],
  "breakdown": [
    {"text": "S → özne (kısa açıklama)", "styleColor": "good"},
    {"text": "V → fiil (kısa açıklama)", "styleColor": "verb"}
  ],
  "eliminations": [
    {"option": "harf (doğru olmayan şıklardan biri)", "text": "neden yanlış, kısa ve net, doğal dille"},
    {"option": "harf", "text": "neden yanlış"},
    {"option": "harf", "text": "neden yanlış"}
  ],
  "recognitionTip": "bu yapı başka bir soruda tekrar karşına gelirse nasıl tanırsın, 1 cümle",
  "avciKodu": "AVCI ÇÖZÜM MOTORU'nun bu soruya özel kısa versiyonu, oklarla (örn: DESPITE GÖR → SAĞINA BAK → İSİM/V-ING Mİ → ZITLIK KUR)",
  "answerLabel": "kısa ekran etiketi, harf + max 3 kelime, büyük harf (örn: B) GEÇERLİ KALDI)",
  "cozumText": "doğru cevabın kısa özet kuralı, tek satır, max 12 kelime (örn: DESPITE + hata → solunda ZITLIK ara.)"
}

NOT: "examples" alanındaki İngilizce örnek cümle, SORU'daki İngilizce metinle aynı veya ondan türetilmiş olmalı — parts'a bölünürken kelimeler/öbekler sırayla ve boşluklu birleştirildiğinde orijinal cümleyi verecek şekilde ayrılmalı. "style" değerleri SADECE şunlardan biri olabilir: plain, verb, trap, good. "breakdown" içindeki "styleColor" SADECE şunlardan biri olabilir: plain, verb, trap, good.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        temperature: 0.4,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return res.status(500).json({ error: 'API hatası', detail: err });
    }

    const data = await response.json();
    const textContent = data.content?.find((b) => b.type === 'text')?.text || '';

    return res.status(200).json({ text: textContent, usage: data.usage, stop_reason: data.stop_reason });
  } catch (error) {
    console.error('generate-lesson error:', error);
    return res.status(500).json({ error: 'Sunucu hatası', message: error.message });
  }
}
