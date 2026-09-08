// ============================================================
// GEÇİCİ DEBUG SCRIPT — ElevenLabs hesabındaki sesleri listeler
// (premade sesler ücretsiz planda API ile kullanılabilir, library
// sesleri kullanılamaz). Doğru voice ID'yi seçmek için kullanılır.
// ============================================================

const response = await fetch("https://api.elevenlabs.io/v1/voices", {
  headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
});

if (!response.ok) {
  console.error("Hata:", response.status, await response.text());
  process.exit(1);
}

const data = await response.json();
for (const v of data.voices) {
  console.log(
    `${v.voice_id}\t${v.category}\t${v.name}\tgender=${v.labels?.gender || "?"}\taccent=${v.labels?.accent || "?"}\tdesc=${v.labels?.description || ""}`
  );
}
