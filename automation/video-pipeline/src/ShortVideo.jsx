import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";

// Site markasıyla birebir aynı palet (bkz. api/og-instagram.mjs sinyalKart)
const BG = "linear-gradient(135deg,#0a1428,#0a0c14)";
const AMBER = "#f5a623";
const CYAN = "#22d3ee";
const INK = "#ece7da";

function CaptionLine({ text, active }) {
  const frame = useCurrentFrame();
  const enter = spring({ frame, fps: 30, config: { damping: 200 } });
  const scale = interpolate(enter, [0, 1], [0.92, 1]);
  const opacity = interpolate(enter, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        padding: "0 64px",
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: "sans-serif",
          fontSize: 58,
          fontWeight: 800,
          lineHeight: 1.3,
          textAlign: "center",
          color: active ? AMBER : INK,
          textShadow: "0 4px 24px rgba(0,0,0,0.6)",
        }}
      >
        {text}
      </div>
    </div>
  );
}

export const ShortVideo = ({ captions, brand, audioFile }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const currentSeconds = frame / fps;

  const activeIndex = captions.findIndex(
    (c) => currentSeconds >= c.start && currentSeconds < c.end
  );

  const outroStart = durationInFrames - fps; // son 1sn kapanış kartı

  return (
    <AbsoluteFill style={{ background: BG }}>
      <Audio src={staticFile(audioFile)} />

      {/* Üst marka şeridi */}
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 90 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 44 }}>🎯</div>
          <div style={{ fontFamily: "sans-serif", fontSize: 38, fontWeight: 800, color: AMBER }}>
            {brand?.title || "SİNYAL AVCISI"}
          </div>
        </div>
      </AbsoluteFill>

      {/* Aktif altyazı satırı */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {activeIndex >= 0 && (
          <Sequence
            from={Math.floor(captions[activeIndex].start * fps)}
            durationInFrames={Math.ceil((captions[activeIndex].end - captions[activeIndex].start) * fps)}
          >
            <CaptionLine text={captions[activeIndex].text} active />
          </Sequence>
        )}
      </AbsoluteFill>

      {/* Kapanış CTA kartı */}
      <Sequence from={outroStart} durationInFrames={fps}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              fontFamily: "sans-serif",
              fontSize: 42,
              fontWeight: 700,
              color: CYAN,
              textAlign: "center",
              padding: "0 80px",
            }}
          >
            {brand?.cta || "Ücretsiz dene → sinyal-avcisi.com"}
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
