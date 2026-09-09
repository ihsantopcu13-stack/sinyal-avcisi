import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  spring,
  interpolate,
} from "remotion";

// ============================================================
// UNLESS Tuzağı Reel — OF Tuzağı serisinin sekizinci bölümü, aynı AVCI
// görsel kimliği. Sahne süreleri gerçek TTS ses uzunluklarına göre.
// ============================================================

const FPS = 30;
const BG = "#000000";
const RED = "#ff1744";
const YELLOW = "#faff00";
const GREEN = "#39ff14";
const WHITE = "#ffffff";

export const SCENE_FRAMES = [66, 94, 78, 130, 113, 30, 44];
export const TOTAL_FRAMES = SCENE_FRAMES.reduce((a, b) => a + b, 0);
const STARTS = SCENE_FRAMES.reduce((acc, _, i) => [...acc, (acc[i - 1] ?? 0) + (i === 0 ? 0 : SCENE_FRAMES[i - 1])], []);

function pop(frame, delay = 0, damping = 12) {
  const f = Math.max(0, frame - delay);
  return spring({ frame: f, fps: FPS, config: { damping, stiffness: 180 } });
}

function Word({ children, color = WHITE, size = 38 }) {
  return (
    <span style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: size, color, textShadow: `0 0 18px ${color}88, 0 4px 20px rgba(0,0,0,.8)` }}>
      {children}
    </span>
  );
}

function Box({ children, color, size = 38 }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "sans-serif",
        fontWeight: 900,
        fontSize: size,
        color,
        background: color + "22",
        border: `3px solid ${color}`,
        borderRadius: 10,
        padding: "2px 12px",
        textShadow: `0 0 20px ${color}`,
      }}
    >
      {children}
    </span>
  );
}

// -------------------- SCENE 1 --------------------
function Scene1({ frame }) {
  const shake = frame < 8 ? Math.sin(frame * 3) * (8 - frame) : 0;
  const scale = pop(frame, 0, 10);
  const flashFrame = frame - 22;
  const flashOn = flashFrame >= 0;
  const flashOpacity = flashOn ? interpolate(flashFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" }) : 0;

  if (flashOn) {
    return (
      <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 54,
            color: YELLOW,
            textAlign: "center",
            opacity: flashOpacity,
            transform: `scale(${0.85 + 0.15 * flashOpacity})`,
            textShadow: `0 0 26px ${YELLOW}`,
          }}
        >
          UNLESS = IF...NOT
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontFamily: "sans-serif",
          fontWeight: 900,
          fontSize: 78,
          color: RED,
          letterSpacing: 1,
          textAlign: "center",
          padding: "0 30px",
          transform: `scale(${0.6 + 0.4 * scale}) translateX(${shake}px)`,
          textShadow: `0 0 40px ${RED}, 0 0 80px ${RED}88`,
        }}
      >
        ⚠ UNLESS TUZAĞI! 🚨
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 2 --------------------
function Scene2({ frame }) {
  const ruleOpacity = interpolate(frame, [0, 10], [1, 1]);
  const transformFrame = frame - 35;
  const showTransform = transformFrame >= 0;
  const arrowIn = showTransform ? pop(transformFrame, 10, 12) : 0;
  const line2In = showTransform ? pop(transformFrame, 20, 14) : 0;

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      {!showTransform ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
          <Word size={36}>IF + olumlu/olumsuz koşul</Word>
          <Box color={YELLOW} size={40}>UNLESS = IF...NOT</Box>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
          <Box color={WHITE} size={34}>unless you study</Box>
          <div style={{ fontSize: 34, color: YELLOW, opacity: arrowIn, transform: `translateY(${(1 - arrowIn) * -10}px)` }}>↓</div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, opacity: line2In, transform: `translateY(${(1 - line2In) * 14}px)` }}>
            <Word size={34}>if you do</Word>
            <Box color={RED} size={36}>NOT</Box>
            <Word size={34}>study</Word>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
}

// -------------------- SCENE 3 --------------------
function Scene3({ frame }) {
  const sIn = pop(frame, 20, 14);
  const vIn = pop(frame, 32, 14);
  const uIn = pop(frame, 44, 14);
  const flashFrame = frame - 60;
  const flashOn = flashFrame >= 0;
  const flashOpacity = flashOn ? interpolate(flashFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 36, color: WHITE, textAlign: "center", padding: "0 30px" }}>
          "You cannot pass unless you study."
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, fontFamily: "sans-serif", fontWeight: 700, fontSize: 26 }}>
          <div style={{ color: GREEN, opacity: sIn, textShadow: `0 0 14px ${GREEN}` }}>S → You</div>
          <div style={{ color: GREEN, opacity: vIn, textShadow: `0 0 14px ${GREEN}` }}>V → cannot pass</div>
          <div style={{ color: YELLOW, opacity: uIn, textShadow: `0 0 14px ${YELLOW}` }}>UNLESS → unless you study</div>
        </div>
        {flashOn && (
          <div
            style={{
              fontFamily: "sans-serif",
              fontWeight: 900,
              fontSize: 38,
              color: GREEN,
              opacity: flashOpacity,
              transform: `scale(${0.85 + 0.15 * flashOpacity})`,
              textShadow: `0 0 22px ${GREEN}`,
            }}
          >
            UNLESS = IF NOT 🎯
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 4 --------------------
function Scene4({ frame }) {
  const cardIn = pop(frame, 0, 14);
  const countdownStart = 62;
  const tick = frame - countdownStart;
  let num = null;
  if (tick >= 0 && tick < 23) num = "3";
  else if (tick >= 23 && tick < 46) num = "2";
  else if (tick >= 46) num = "1";
  const localTick = tick >= 0 ? tick % 23 : 0;
  const numScale = tick >= 0 ? interpolate(localTick, [0, 6], [1.6, 1], { extrapolateRight: "clamp" }) : 1;
  const borderPulse = tick >= 0 ? 8 + 6 * Math.sin(frame / 3) : 4;

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          opacity: cardIn,
          transform: `scale(${0.85 + 0.15 * cardIn})`,
          background: "#0a0a0a",
          border: `${borderPulse}px solid ${RED}`,
          borderRadius: 18,
          padding: "34px 30px",
          width: 850,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          boxShadow: `0 0 40px ${RED}55`,
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 28, color: WHITE, textAlign: "center" }}>
          You will not improve _____ you practise regularly.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: "sans-serif", fontWeight: 700, fontSize: 30, color: YELLOW }}>
          <div>A) because</div>
          <div>B) although</div>
          <div>C) unless</div>
          <div>D) despite</div>
        </div>
      </div>
      {num && (
        <div
          style={{
            position: "absolute",
            bottom: 160,
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 140,
            color: RED,
            transform: `scale(${numScale})`,
            textShadow: `0 0 50px ${RED}`,
          }}
        >
          {num}
        </div>
      )}
    </AbsoluteFill>
  );
}

// -------------------- SCENE 5 --------------------
function Scene5({ frame }) {
  const lockOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const hitFrame = frame - 24;
  const hitOn = hitFrame >= 0;
  const hitScale = hitOn ? pop(hitFrame, 0, 9) : 0;

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      {!hitOn ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, opacity: lockOpacity }}>
          <div style={{ fontSize: 56 }}>🎯</div>
          <Box color={YELLOW} size={32}>will not improve</Box>
          <Box color={YELLOW} size={32}>you practise regularly</Box>
        </div>
      ) : (
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 56,
            color: GREEN,
            transform: `scale(${0.5 + 0.5 * hitScale})`,
            textShadow: `0 0 30px ${GREEN}`,
          }}
        >
          🎯 C) UNLESS
        </div>
      )}
    </AbsoluteFill>
  );
}

// -------------------- SCENE 6 --------------------
function Scene6({ frame }) {
  const in1 = pop(frame, 0, 10);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontFamily: "sans-serif",
          fontWeight: 900,
          fontSize: 38,
          color: RED,
          textAlign: "center",
          padding: "0 26px",
          opacity: in1,
          transform: `scale(${0.85 + 0.15 * in1})`,
          textShadow: `0 0 24px ${RED}`,
        }}
      >
        UNLESS GÖR → IF NOT DÜŞÜN{"\n"}→ KOŞULU AVLA!
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 7 --------------------
function Scene7({ frame }) {
  const inAnim = pop(frame, 0, 10);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: inAnim, transform: `scale(${0.85 + 0.15 * inAnim})` }}>
        <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: 44, color: YELLOW, textShadow: `0 0 24px ${YELLOW}` }}>🎯 SİNYAL AVCISI</div>
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 30, color: WHITE }}>YDS / YÖKDİL</div>
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 30, color: RED, textShadow: `0 0 16px ${RED}` }}>HEDEF 60+</div>
      </div>
    </AbsoluteFill>
  );
}

export const UnlessReel = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* SFX + narasyon */}
      <Sequence from={STARTS[0]} durationInFrames={SCENE_FRAMES[0]}>
        <Audio src={staticFile("of-tuzagi/siren.mp3")} />
        <Sequence from={3}>
          <Audio src={staticFile("unless/n1.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[1]} durationInFrames={SCENE_FRAMES[1]}>
        <Sequence from={3}>
          <Audio src={staticFile("unless/n2.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[2]} durationInFrames={SCENE_FRAMES[2]}>
        <Sequence from={3}>
          <Audio src={staticFile("unless/n3.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[4]}>
        <Audio src={staticFile("of-tuzagi/lock.mp3")} />
      </Sequence>
      <Sequence from={STARTS[4] + 24}>
        <Audio src={staticFile("of-tuzagi/hit.mp3")} />
      </Sequence>
      <Sequence from={STARTS[4]} durationInFrames={SCENE_FRAMES[4]}>
        <Sequence from={26}>
          <Audio src={staticFile("unless/n4.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[6]} durationInFrames={SCENE_FRAMES[6]}>
        <Sequence from={3}>
          <Audio src={staticFile("unless/n5.mp3")} />
        </Sequence>
      </Sequence>

      {/* Görsel sahneler */}
      <Sequence from={STARTS[0]} durationInFrames={SCENE_FRAMES[0]}>
        <Scene1 frame={frame - STARTS[0]} />
      </Sequence>
      <Sequence from={STARTS[1]} durationInFrames={SCENE_FRAMES[1]}>
        <Scene2 frame={frame - STARTS[1]} />
      </Sequence>
      <Sequence from={STARTS[2]} durationInFrames={SCENE_FRAMES[2]}>
        <Scene3 frame={frame - STARTS[2]} />
      </Sequence>
      <Sequence from={STARTS[3]} durationInFrames={SCENE_FRAMES[3]}>
        <Scene4 frame={frame - STARTS[3]} />
      </Sequence>
      <Sequence from={STARTS[4]} durationInFrames={SCENE_FRAMES[4]}>
        <Scene5 frame={frame - STARTS[4]} />
      </Sequence>
      <Sequence from={STARTS[5]} durationInFrames={SCENE_FRAMES[5]}>
        <Scene6 frame={frame - STARTS[5]} />
      </Sequence>
      <Sequence from={STARTS[6]} durationInFrames={SCENE_FRAMES[6]}>
        <Scene7 frame={frame - STARTS[6]} />
      </Sequence>
    </AbsoluteFill>
  );
};
