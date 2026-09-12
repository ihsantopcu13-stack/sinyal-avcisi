import { Composition, Still, getInputProps } from "remotion";
import { Thumbnail } from "./Thumbnail.jsx";
import { ShortVideo } from "./ShortVideo.jsx";
import { OfTuzagiReel, TOTAL_FRAMES as OF_TUZAGI_FRAMES } from "./OfTuzagiReel.jsx";
import { ANumberOfReel, TOTAL_FRAMES as A_NUMBER_OF_FRAMES } from "./ANumberOfReel.jsx";
import { TheNumberOfReel, TOTAL_FRAMES as THE_NUMBER_OF_FRAMES } from "./TheNumberOfReel.jsx";
import { WhoseReel, TOTAL_FRAMES as WHOSE_FRAMES } from "./WhoseReel.jsx";
import { AlthoughDespiteReel, TOTAL_FRAMES as ALTHOUGH_DESPITE_FRAMES } from "./AlthoughDespiteReel.jsx";
import { BecauseReel, TOTAL_FRAMES as BECAUSE_FRAMES } from "./BecauseReel.jsx";
import { HoweverReel, TOTAL_FRAMES as HOWEVER_FRAMES } from "./HoweverReel.jsx";
import { UnlessReel, TOTAL_FRAMES as UNLESS_FRAMES } from "./UnlessReel.jsx";
import { AfterWhenReel, TOTAL_FRAMES as AFTER_WHEN_FRAMES } from "./AfterWhenReel.jsx";
import { VingV3Reel, TOTAL_FRAMES as VING_V3_FRAMES } from "./VingV3Reel.jsx";
import { PassiveReel, TOTAL_FRAMES as PASSIVE_FRAMES } from "./PassiveReel.jsx";
import { WhoWhichReel, TOTAL_FRAMES as WHO_WHICH_FRAMES } from "./WhoWhichReel.jsx";
import { ModalHaveReel, TOTAL_FRAMES as MODAL_HAVE_FRAMES } from "./ModalHaveReel.jsx";
import { ItTheyReel, TOTAL_FRAMES as IT_THEY_FRAMES } from "./ItTheyReel.jsx";
import { MasterAvciReel, TOTAL_FRAMES as MASTER_AVCI_FRAMES } from "./MasterAvciReel.jsx";
import { Master01OfTuzagiReel, TOTAL_FRAMES as MASTER_01_FRAMES } from "./Master01OfTuzagiReel.jsx";
import { MasterLessonReel, totalFramesFor } from "./MasterLessonReel.jsx";
import { DUMMY_LESSON } from "../data/master-lessons.mjs";

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
      {/* Seri devamı — UNLESS Tuzağı, aynı AVCI görsel kimliği. */}
      <Composition
        id="UnlessReel"
        component={UnlessReel}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={UNLESS_FRAMES}
      />
      {/* Seri devamı — AFTER / WHEN Tuzağı, aynı AVCI görsel kimliği. */}
      <Composition
        id="AfterWhenReel"
        component={AfterWhenReel}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={AFTER_WHEN_FRAMES}
      />
      {/* Seri devamı — V-ING / V3 Tuzağı, aynı AVCI görsel kimliği. */}
      <Composition
        id="VingV3Reel"
        component={VingV3Reel}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={VING_V3_FRAMES}
      />
      {/* Seri devamı — PASSIVE Tuzağı, aynı AVCI görsel kimliği. */}
      <Composition
        id="PassiveReel"
        component={PassiveReel}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={PASSIVE_FRAMES}
      />
      {/* Seri devamı — WHO / WHICH Tuzağı, aynı AVCI görsel kimliği. */}
      <Composition
        id="WhoWhichReel"
        component={WhoWhichReel}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={WHO_WHICH_FRAMES}
      />
      {/* Seri devamı — MODAL + HAVE V3 Tuzağı, aynı AVCI görsel kimliği. */}
      <Composition
        id="ModalHaveReel"
        component={ModalHaveReel}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={MODAL_HAVE_FRAMES}
      />
      {/* Seri devamı — IT / THEY Tuzağı, aynı AVCI görsel kimliği. */}
      <Composition
        id="ItTheyReel"
        component={ItTheyReel}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={IT_THEY_FRAMES}
      />
      {/* Sezon finali — MASTER AVCI, aynı AVCI görsel kimliği, daha dramatik. */}
      <Composition
        id="MasterAvciReel"
        component={MasterAvciReel}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={MASTER_AVCI_FRAMES}
      />
      {/* MASTER VİDEO PAKETİ #1 — OF TUZAĞI (DETAY sürümü). Kısa OF Tuzağı
          Reels'ten ayrı, öğretme+pekiştirme formatlı 30 bölümlük serinin
          ilk videosu — bkz. data/master-video-paketi.md. */}
      <Composition
        id="Master01OfTuzagiReel"
        component={Master01OfTuzagiReel}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={MASTER_01_FRAMES}
      />
      {/* MASTER VİDEO PAKETİ #2-#30 — genel/parametrik ders şablonu.
          Her render, --props ile bir data/master-lessons.mjs LESSONS[i]
          objesi alır (bkz. scripts/render-master-lesson.mjs). */}
      <Composition
        id="MasterLessonReel"
        component={MasterLessonReel}
        fps={FPS}
        width={1080}
        height={1920}
        durationInFrames={totalFramesFor(getInputProps()?.lesson || DUMMY_LESSON)}
        defaultProps={{ lesson: DUMMY_LESSON }}
        calculateMetadata={({ props }) => ({
          durationInFrames: totalFramesFor(props?.lesson || DUMMY_LESSON),
        })}
      />
      {/* Özel kapak görseli — otomatik seçilen video karesi yerine CTR için
          özel tasarlanmış tek kare. İki boyut: Instagram cover (9:16) ve
          YouTube thumbnail (16:9, YouTube'un standart oranı). */}
      <Still id="Thumbnail" component={Thumbnail} width={1080} height={1920} />
      <Still id="ThumbnailWide" component={Thumbnail} width={1280} height={720} />
    </>
  );
};
