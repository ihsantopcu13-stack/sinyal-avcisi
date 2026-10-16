import { AbsoluteFill, Sequence, useCurrentFrame, spring, interpolate } from "remotion";

// ============================================================
// Ortak kapanış CTA'sı — yeni üretilen Reel'lerin son 2 saniyesinde
// alt bantta görünür. Eski bölümler bunu import etmediği için onların
// akışı/süresi değişmez; yeni bölümler ana composition'ın en sonuna
// <ReelEndCta totalFrames={TOTAL_FRAMES} /> eklemeli.
// ============================================================

const FPS = 30;
export const CTA_FRAMES = 2 * FPS;
export const CTA_TEXT = "YDS'ye girenler: yarınki soru için takip et";
// Metin tek yerde: ":"ye kadar olan kısım sarı vurgulu.
const [CTA_HEAD, CTA_TAIL] = [CTA_TEXT.slice(0, CTA_TEXT.indexOf(":") + 1), CTA_TEXT.slice(CTA_TEXT.indexOf(":") + 1)];

const YELLOW = "#eab308";
const WHITE = "#f4f3ef";

function CtaBand({ bottom }) {
  const frame = useCurrentFrame();
  const inAnim = spring({ frame, fps: FPS, config: { damping: 14, stiffness: 180 } });
  const pulse = interpolate(frame % 30, [0, 15, 30], [1, 1.03, 1]);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: bottom }}>
      <div
        style={{
          opacity: inAnim,
          transform: `translateY(${(1 - inAnim) * 60}px) scale(${pulse})`,
          background: "#0b0f1a",
          border: `4px solid ${YELLOW}`,
          borderRadius: 22,
          padding: "26px 36px",
          width: 940,
          textAlign: "center",
          fontFamily: "sans-serif",
          fontWeight: 900,
          fontSize: 46,
          lineHeight: 1.25,
          color: WHITE,
          boxShadow: `0 0 40px ${YELLOW}55`,
        }}
      >
        <span style={{ color: YELLOW }}>{CTA_HEAD}</span>{CTA_TAIL}
      </div>
    </AbsoluteFill>
  );
}

// bottom: bandın alt boşluğu (px); varsayılan önceki kullanımlarla aynı.
export const ReelEndCta = ({ totalFrames, bottom = 230 }) => (
  <Sequence from={totalFrames - CTA_FRAMES} durationInFrames={CTA_FRAMES}>
    <CtaBand bottom={bottom} />
  </Sequence>
);
