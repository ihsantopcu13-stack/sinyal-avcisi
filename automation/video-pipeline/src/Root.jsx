import { Composition, getInputProps } from "remotion";
import { ShortVideo } from "./ShortVideo.jsx";
import { OfTuzagiReel, TOTAL_FRAMES as OF_TUZAGI_FRAMES } from "./OfTuzagiReel.jsx";

const FPS = 30;

// Prodüksiyon süresini (saniye) input props üzerinden alıyoruz — sesin
// gerçek uzunluğuna göre scripts/generate-audio.mjs tarafından hesaplanır.
// Prop verilmezse (örn. Remotion Studio'da önizleme) 30sn'lik varsayılan
// kullanılır.
function toDurationInFrames(props) {
  const seconds = props?.durationInSeconds || 30;
  return Math.ceil(seconds * FPS) + FPS; // sonda 1sn'lik kapanış payı
}

export const RemotionRoot = () => {
  const inputProps = getInputProps();

  return (
    <>
      <Composition
        id="SinyalShort"
        component={ShortVideo}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={toDurationInFrames(inputProps)}
        defaultProps={{
          captions: [],
          durationInSeconds: 30,
          audioFile: "audio.mp3",
          brand: {
            title: "SİNYAL AVCISI",
            cta: "Ücretsiz dene → sinyal-avcisi.com",
          },
        }}
        calculateMetadata={({ props }) => ({
          durationInFrames: toDurationInFrames(props),
        })}
      />
      {/* Tek seferlik özel Reel — OF Tuzağı (siyah zemin + neon kırmızı/
          sarı/yeşil, crosshair/uyarı temalı gramer dersi). Günlük otomatik
          SinyalShort akışını etkilemez, ayrı bir composition. */}
      <Composition
        id="OfTuzagiReel"
        component={OfTuzagiReel}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={OF_TUZAGI_FRAMES}
      />
    </>
  );
};
