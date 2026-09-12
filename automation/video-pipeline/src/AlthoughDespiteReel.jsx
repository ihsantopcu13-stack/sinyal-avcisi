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
// ALTHOUGH / DESPITE Tuzağı Reel — OF Tuzağı serisinin beşinci bölümü,
// aynı AVCI görsel kimliği. Sahne süreleri gerçek TTS ses uzunluklarına göre.
// ============================================================

const FPS = 30;
const BG = "#000000";
const RED = "#ff1744";
const YELLOW = "#faff00";
const GREEN = "#39ff14";
const WHITE = "#ffffff";

export const SCENE_FRAMES = [80, 90, 90, 93, 122, 85, 39];
export const TOTAL_FRAMES = SCENE_FRAMES.reduce((a, b) => a + b, 0);
const STARTS = SCENE_FRAMES.reduce((acc, _, i) => [...acc, (acc[i - 1] ?? 0) + (i === 0 ? 0 : SCENE_FRAMES[i - 1])], []);

function pop(frame, delay = 0, damping = 12) {
  const f = Math.max(0, frame - delay);
  return spring({ frame: f, fps: FPS, config: { damping, stiffness: 180 } });
}

function Word({ children, color = WHITE, size = 42 }) {
  return (
    <span style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: size, color, textShadow: `0 0 18px ${color}88, 0 4px 20px rgba(0,0,0,.8)` }}>
      {children}
    </span>
  );
}

function Box({ children, color, size = 40 }) {
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
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          transform: `scale(${0.7 + 0.3 * scale}) translateX(${shake}px)`,
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: 52, color: GREEN, textShadow: `0 0 24px ${GREEN}` }}>ALTHOUGH</div>
        <div style={{ fontSize: 52 }}>⚔️</div>
        <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: 52, color: YELLOW, textShadow: `0 0 24px ${YELLOW}` }}>DESPITE</div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 2 --------------------
function Scene2({ frame }) {
  const line2In = pop(frame, 30, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Word size={40}>ALTHOUGH +</Word>
          <Box color={GREEN}>S</Box>
          <Box color={GREEN}>V</Box>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            opacity: line2In,
            transform: `translateY(${(1 - line2In) * 14}px)`,
          }}
        >
          <Word size={40}>DESPITE +</Word>
          <Box color={YELLOW} size={34}>NOUN / V-ing</Box>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 3 --------------------
function Scene3({ frame }) {
  const sIn = pop(frame, 24, 14);
  const vIn = pop(frame, 36, 14);
  const okIn = pop(frame, 55, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 40, color: WHITE, textAlign: "center", padding: "0 30px" }}>
          "Although the economy improved, ..."
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, fontFamily: "sans-serif", fontWeight: 700, fontSize: 30 }}>
          <div style={{ color: GREEN, opacity: sIn, textShadow: `0 0 14px ${GREEN}` }}>the economy = S</div>
          <div style={{ color: GREEN, opacity: vIn, textShadow: `0 0 14px ${GREEN}` }}>improved = V</div>
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 48,
            color: GREEN,
            opacity: okIn,
            transform: `scale(${0.8 + 0.2 * okIn})`,
            textShadow: `0 0 24px ${GREEN}`,
          }}
        >
          ALTHOUGH ✅
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 4 --------------------
function Scene4({ frame }) {
  const okIn = pop(frame, 55, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, padding: "0 30px", textAlign: "center" }}>
          <Word size={38}>"Despite</Word>
          <Box color={YELLOW}>the economic improvement</Box>
          <Word size={38}>, ..."</Word>
        </div>
        <div style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 28, color: YELLOW }}>the economic improvement = NOUN</div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 48,
            color: GREEN,
            opacity: okIn,
            transform: `scale(${0.8 + 0.2 * okIn})`,
            textShadow: `0 0 24px ${GREEN}`,
          }}
        >
          DESPITE ✅
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 5 --------------------
function Scene5({ frame }) {
  const cardIn = pop(frame, 0, 14);
  const countdownStart = 52;
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
          width: 800,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          boxShadow: `0 0 40px ${RED}55`,
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 32, color: WHITE, textAlign: "center" }}>
          _____ the heavy rain, the event continued.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: "sans-serif", fontWeight: 700, fontSize: 30, color: YELLOW }}>
          <div>A) Although</div>
          <div>B) Despite</div>
          <div>C) Because</div>
          <div>D) However</div>
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

// -------------------- SCENE 6 --------------------
function Scene6({ frame }) {
  const lockScale = interpolate(frame, [0, 10], [2.2, 1], { extrapolateRight: "clamp" });
  const lockOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const hitFrame = frame - 18;
  const hitOn = hitFrame >= 0;
  const hitScale = hitOn ? pop(hitFrame, 0, 9) : 0;

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      {!hitOn ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: lockOpacity }}>
          <div style={{ fontSize: 64, transform: `scale(${lockScale})` }}>🎯</div>
          <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 34, color: YELLOW, textShadow: `0 0 16px ${YELLOW}` }}>
            the heavy rain = NOUN
          </div>
        </div>
      ) : (
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 58,
            color: GREEN,
            transform: `scale(${0.5 + 0.5 * hitScale})`,
            textShadow: `0 0 30px ${GREEN}`,
          }}
        >
          🎯 B) DESPITE
        </div>
      )}
    </AbsoluteFill>
  );
}

// -------------------- SCENE 7 --------------------
function Scene7({ frame }) {
  const l1 = pop(frame, 0, 10);
  const l2 = pop(frame, 10, 10);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 44,
            color: RED,
            textAlign: "center",
            padding: "0 30px",
            opacity: l1,
            transform: `scale(${0.85 + 0.15 * l1})`,
            textShadow: `0 0 26px ${RED}`,
          }}
        >
          SORUYU ÇÖZME... AVLA!
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 38,
            color: YELLOW,
            textAlign: "center",
            opacity: l2,
            transform: `scale(${0.85 + 0.15 * l2})`,
            textShadow: `0 0 20px ${YELLOW}`,
          }}
        >
          🎯 SİNYAL AVCISI | HEDEF 60+
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const AlthoughDespiteReel = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* SFX + narasyon */}
      <Sequence from={STARTS[0]} durationInFrames={SCENE_FRAMES[0]}>
        <Audio src={staticFile("of-tuzagi/siren.mp3")} />
        <Sequence from={3}>
          <Audio src={staticFile("although-despite/n1.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[3]} durationInFrames={SCENE_FRAMES[3]}>
        <Sequence from={3}>
          <Audio src={staticFile("although-despite/n2.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[5]}>
        <Audio src={staticFile("of-tuzagi/lock.mp3")} />
      </Sequence>
      <Sequence from={STARTS[5] + 18}>
        <Audio src={staticFile("of-tuzagi/hit.mp3")} />
      </Sequence>
      <Sequence from={STARTS[5]} durationInFrames={SCENE_FRAMES[5]}>
        <Sequence from={20}>
          <Audio src={staticFile("although-despite/n3.mp3")} />
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
