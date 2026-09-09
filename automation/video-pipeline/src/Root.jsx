import { Composition, getInputProps } from "remotion";
import { ShortVideo } from "./ShortVideo.jsx";
import { OfTuzagiReel, TOTAL_FRAMES as OF_TUZAGI_FRAMES } from "./OfTuzagiReel.jsx";
import { ANumberOfReel, TOTAL_FRAMES as A_NUMBER_OF_FRAMES } from "./ANumberOfReel.jsx";
import { TheNumberOfReel, TOTAL_FRAMES as THE_NUMBER_OF_FRAMES } from "./TheNumberOfReel.jsx";
import { WhoseReel, TOTAL_FRAMES as WHOSE_FRAMES } from "./WhoseReel.jsx";
import { AlthoughDespiteReel, TOTAL_FRAMES as ALTHOUGH_DESPITE_FRAMES } from "./AlthoughDespiteReel.jsx";
import { BecauseReel, TOTAL_FRAMES as BECAUSE_FRAMES } from "./BecauseReel.jsx";
import { HoweverReel, TOTAL_FRAMES as HOWEVER_FRAMES } from "./HoweverReel.jsx";

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
      {/* Seri devamı — A NUMBER OF Tuzağı, aynı AVCI görsel kimliği. */}
      <Composition
        id="ANumberOfReel"
        component={ANumberOfReel}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={A_NUMBER_OF_FRAMES}
      />
      {/* Seri devamı — THE NUMBER OF Tuzağı, aynı AVCI görsel kimliği. */}
      <Composition
        id="TheNumberOfReel"
        component={TheNumberOfReel}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={THE_NUMBER_OF_FRAMES}
      />
      {/* Seri devamı — WHOSE Tuzağı, aynı AVCI görsel kimliği. */}
      <Composition
        id="WhoseReel"
        component={WhoseReel}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={WHOSE_FRAMES}
      />
      {/* Seri devamı — ALTHOUGH / DESPITE Tuzağı, aynı AVCI görsel kimliği. */}
      <Composition
        id="AlthoughDespiteReel"
        component={AlthoughDespiteReel}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={ALTHOUGH_DESPITE_FRAMES}
      />
      {/* Seri devamı — BECAUSE / BECAUSE OF Tuzağı, aynı AVCI görsel kimliği. */}
      <Composition
        id="BecauseReel"
        component={BecauseReel}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={BECAUSE_FRAMES}
      />
      {/* Seri devamı — HOWEVER Tuzağı, aynı AVCI görsel kimliği. */}
      <Composition
        id="HoweverReel"
        component={HoweverReel}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={HOWEVER_FRAMES}
      />
    </>
  );
};
