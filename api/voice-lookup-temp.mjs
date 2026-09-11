// GEÇİCİ — ElevenLabs hesabındaki "George" sesinin gerçek Voice ID'sini
// doğrulamak için. Kullanımdan sonra silinecek.
export default async function handler(req, res) {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: await response.text() });
    }
    const data = await response.json();
    const voices = (data.voices || []).map(v => ({
      name: v.name,
      voice_id: v.voice_id,
      category: v.category,
      description: v.description,
      labels: v.labels,
    }));
    return res.status(200).json({ count: voices.length, voices });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
