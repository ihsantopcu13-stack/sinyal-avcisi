// ============================================================
// TTS API — OpenAI Text-to-Speech Proxy
// Sinyal Avcısı — Ses Kurs
// ============================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, voice = 'onyx', speed = 1.0 } = req.body;

  if (!text || text.length > 4096) {
    return res.status(400).json({ error: 'Invalid text' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice, // onyx (erkek, derin), nova (kadın, doğal), shimmer (kadın, yumuşak)
        speed: speed,
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err });
    }

    const audioBuffer = await response.arrayBuffer();

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 gün cache
    res.status(200).send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'TTS failed' });
  }
}
