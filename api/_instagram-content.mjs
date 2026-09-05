// ============================================================
// Instagram otomasyonu — içerik üretimi (Claude ile JSON çıktı)
// ============================================================
// İki ayrı akış üretir: Sinyal Avcısı (YDS/YÖKDİL soru+kelime+ipucu) ve
// AI ile 5 Dakika (kısa AI ipucu). Her ikisi de klod.mjs'teki prefill
// (mode='json_output') tekniğiyle JSON garantili çıktı alır.

const SORU_SISTEM_PROMPT = `Sen Sinyal Avcısı platformunun içerik üreticisisin. YDS/YÖKDİL formatında, ÖSYM tarzı ORİJİNAL bir boşluk doldurma sorusu üret.

KURALLAR:
- Cümle B2-C1 seviyesinde akademik İngilizce olsun.
- "sinyal" alanı mutlaka şunlardan biri olsun: despite/although/however/whereas/because/therefore/unless/provided that/must have/should have.
- 4 şık üret, sadece biri doğru, diğerleri yapısal olarak yanlış (gramer tuzağı).
- "kelime" alanı sorudan BAĞIMSIZ, akademik/YDS'de sık geçen bir kelime olsun.
- "ipucu" alanı cevabı VERMEDEN, sinyal kelimeye dikkat çeksin (max 25 kelime).
- Tüm açıklamalar Türkçe, örnek cümle İngilizce.

SADECE şu JSON şemasıyla cevap ver, başka hiçbir metin ekleme:
{"soru":"...","siklar":["A) ...","B) ...","C) ...","D) ..."],"dogru_sik":0,"sinyal":"...","ipucu":"...","kelime":"...","kelime_anlam":"..."}`;

const AI5DK_SISTEM_PROMPT = `Sen "AI ile 5 Dakika" adlı Instagram kanalının içerik üreticisisin. Türk takipçilere yapay zekayı 5 dakikada anlaşılır kılan, ORİJİNAL, kısa ve pratik bir ipucu üret.

KURALLAR:
- Konu: bir AI aracı/tekniği/kavramı (prompt yazımı, ChatGPT/Claude kullanımı, üretkenlik, otomasyon vb.)
- Jargon yok — sıfır teknik bilgiyle anlaşılır olsun.
- "ornek" alanı somut ve hemen uygulanabilir olsun (kopyala-yapıştır bir prompt örneği gibi).
- Türkçe yaz, samimi ve enerjik bir ton kullan.

SADECE şu JSON şemasıyla cevap ver, başka hiçbir metin ekleme:
{"baslik":"...","ipucu":"...","ornek":"..."}`;

async function claudeJsonUret(systemPrompt, userMesaj) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      temperature: 0.9, // her gün farklı/orijinal içerik için yüksek yaratıcılık
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMesaj },
        { role: 'assistant', content: '{' }, // prefill — JSON garantili (bkz. klod.mjs)
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API hatası: ${err}`);
  }

  const data = await response.json();
  const text = data.content?.find(b => b.type === 'text')?.text || '';
  return JSON.parse('{' + text);
}

export async function sinyalIcerikUret() {
  const bugun = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  return claudeJsonUret(
    SORU_SISTEM_PROMPT,
    `Bugün ${bugun}. Bugüne özel, daha önce üretmediğin yeni bir soru üret.`
  );
}

export async function ai5dkIcerikUret() {
  const bugun = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
  return claudeJsonUret(
    AI5DK_SISTEM_PROMPT,
    `Bugün ${bugun}. Bugüne özel, daha önce üretmediğin yeni bir AI ipucu üret.`
  );
}
