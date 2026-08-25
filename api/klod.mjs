export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Gecersiz istek' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: system || 'Sen KLOD\'sun — Sinyal Avcısı platformunun YDS/YÖKDİL AI öğretmenisin. Türkçe konuşuyorsun. Kısa ve net cevaplar ver, max 3-4 cümle.',
        messages: messages.slice(-10),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'API hatasi', detail: err });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Sunucu hatasi' });
  }
}
