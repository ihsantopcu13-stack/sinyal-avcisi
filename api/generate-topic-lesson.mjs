// ============================================================
// MASTER VİDEO PAKETİ #31-60 için TAM ders içeriği üretir — verilen bir
// gramer/sinyal konusundan (gerçek bir soru havuzu sorusuna anchor
// edilmeden, #2-30'un orijinal el yazması müfredatıyla AYNI tarzda)
// kural + kendi örnek cümlesi + kendi mini sorusu + AVCI kodu üretir.
// Şema, data/master-lessons.mjs'teki #2-30 lessons ile BİREBİR uyumlu
// (eliminations YOK — o yeni içerik standardı, #2-30'da da yok).
// ============================================================

import { rateLimit } from './_rateLimit.mjs';

const SYSTEM_PROMPT = `Sen SİNYAL AVCISI platformunun MASTER VİDEO PAKETİ ders yazarısın. 20 yıllık YDS/YÖKDİL sınav hazırlık uzmanı gibi yazıyorsun.

Sana bir gramer/sinyal konusu verilecek. Bu konu için TAMAMEN ÖZGÜN (uydurma değil, gerçek İngilizce dilbilgisi kurallarına dayanan), pedagojik olarak sağlam, doğal Türkçe konuşma diliyle bir MASTER ders içeriği yaz — hazırladığın örnek cümle ve mini soru GERÇEKÇİ, YDS/YÖKDİL sınav formatına uygun olmalı (uydurma ama sınav gerçekçiliğinde).

KURALLAR:
- Ağır gramer terimleriyle boğma, önce basit anlat sonra sınav tekniğini göster.
- Örnek cümle İngilizce, doğal ve gramer açısından kusursuz olmalı.
- Mini soru 4 şıklı (A-D), tek doğru cevap, diğer 3 şık gerçekçi çeldirici olmalı.
- Sadece istenen JSON şemasında, başka hiçbir metin/markdown olmadan cevap ver.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rl = rateLimit(req, { key: 'generate-topic-lesson', limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    res.setHeader('Retry-After', Math.ceil(rl.retryAfterMs / 1000));
    return res.status(429).json({ error: 'Çok fazla istek gönderdiniz. Biraz sonra tekrar deneyin.' });
  }

  const { topic, epNum } = req.body;
  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: 'Geçersiz topic' });
  }

  const userPrompt = `KONU: ${topic}

Bu konu için aşağıdaki JSON şemasında tam bir MASTER ders içeriği yaz (SADECE geçerli JSON döndür, kod bloğu/markdown/açıklama YOK):
{
  "id": "konu-slug (kebab-case, İngilizce, örn: not-only-but-also)",
  "hookTitle": "kısa çarpıcı başlık, büyük harf, sonunda ! (örn: NOT ONLY...BUT ALSO TUZAĞI!)",
  "kuralLines": ["kural satırı 1 (kısa, max 6 kelime)", "kural satırı 2 (kısa)"],
  "nedenBadge": "KISA ROZET METNİ (max 4 kelime, büyük harf)",
  "nedenText": "\\"neden böyle\\" açıklaması, tek kısa cümle",
  "tuzakText": "ÖSYM'nin kandırma yöntemi, tek kısa cümle",
  "narration": {
    "hook": "1 cümle, dikkat çekici, merak uyandıran",
    "kural": "kuralın doğal konuşma diliyle açıklaması, 2-3 cümle",
    "neden": "bu kural neden böyle işliyor, sağında/solunda ne aranır, 2-3 cümle",
    "tuzak": "ÖSYM'nin bu yapıda öğrenciyi nasıl kandırdığı, 1-2 cümle",
    "ornek": "örnek cümle üzerinden yapının nasıl göründüğünün açıklaması, 2 cümle",
    "soru": "mini soruyu tanıtan, öğrenciyi çözmeye davet eden 1 cümle",
    "cozum": "doğru cevabın mantığı, adım adım kısa gerekçe, 1-2 cümle",
    "avci": "AVCI REFLEKSİ — bu yapı için kısa, akılda kalıcı, formül gibi bir cümle"
  },
  "examples": [
    {
      "parts": [
        {"text": "kelime/öbek 1", "style": "plain"},
        {"text": "sinyal kelime/öbek", "style": "trap"},
        {"text": "fiil (varsa)", "style": "verb"},
        {"text": "kalan kısım", "style": "plain"}
      ]
    }
  ],
  "breakdown": [
    {"text": "kısa gramer notu 1", "styleColor": "good"},
    {"text": "kısa gramer notu 2", "styleColor": "verb"}
  ],
  "question": {
    "sentence": "mini soru cümlesi, boşluklu (_____ ile), İngilizce",
    "options": ["A) seçenek", "B) seçenek", "C) seçenek", "D) seçenek"]
  },
  "answerLabel": "kısa ekran etiketi, harf + max 3 kelime, büyük harf (örn: B) NEITHER)",
  "cozumText": "doğru cevabın kısa özet kuralı, tek satır, max 12 kelime",
  "avciKodu": "AVCI ÇÖZÜM MOTORU'nun bu konuya özel kısa versiyonu, oklarla"
}

NOT: "question.options" içindeki doğru şık, cevabın harfiyle (answerLabel'daki harf) tutarlı olmalı. "examples" içindeki İngilizce cümle kendi içinde tutarlı ve gramer açısından doğru olmalı, parçalara bölünürken sırayla birleştirildiğinde orijinal cümleyi vermeli. "style" değerleri SADECE: plain, verb, trap, good. "styleColor" değerleri SADECE: plain, verb, trap, good.`;

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
        max_tokens: 2500,
        temperature: 0.5,
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

    return res.status(200).json({ text: textContent, usage: data.usage, stop_reason: data.stop_reason, epNum });
  } catch (error) {
    console.error('generate-topic-lesson error:', error);
    return res.status(500).json({ error: 'Sunucu hatası', message: error.message });
  }
}
