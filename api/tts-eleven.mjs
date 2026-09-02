// ============================================================
// TTS API — ElevenLabs Text-to-Speech Proxy
// Sinyal Avcısı — sitedeki TÜRKÇE metinler için kullanılır.
// (İngilizce metinler için api/tts.mjs / OpenAI nova kullanılıyor;
// yönlendirme istemci tarafında ttsSpeak() içinde dil tespitiyle yapılır.)
// ============================================================

import { rateLimit } from './_rateLimit.mjs';

// Rachel — ElevenLabs'in hazır sesi, eleven_multilingual_v2 modeliyle Türkçe dahil
// çoklu dili destekler
const RACHEL_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rl = rateLimit(req, { key: 'tts-eleven', limit: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    res.setHeader('Retry-After', Math.ceil(rl.retryAfterMs / 1000));
    return res.status(429).json({ error: 'Çok fazla ses isteği gönderdiniz. Biraz sonra tekrar deneyin.' });
  }

  const { text, voiceId = RACHEL_VOICE_ID } = req.body;

  if (!text || typeof text !== 'string' || text.length > 2000) {
    return res.status(400).json({ error: 'Invalid text' });
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const audioBuffer = await response.arrayBuffer();

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 gün cache
    res.status(200).send(Buffer.from(audioBuffer));

  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    res.status(500).json({ error: 'TTS failed' });
  }
}
