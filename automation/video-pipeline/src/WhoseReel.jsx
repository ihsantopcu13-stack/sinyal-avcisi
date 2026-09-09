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
// WHOSE Tuzağı Reel — OF Tuzağı serisinin dördüncü bölümü, aynı AVCI
// görsel kimliği. Sahne süreleri gerçek TTS ses uzunluklarına göre.
// ============================================================

const FPS = 30;
const BG = "#000000";
const RED = "#ff1744";
const YELLOW = "#faff00";
const GREEN = "#39ff14";
const WHITE = "#ffffff";

export const SCENE_FRAMES = [55, 86, 71, 110, 130, 109, 39];
export const TOTAL_FRAMES = SCENE_FRAMES.reduce((a, b) => a + b, 0);
const STARTS = SCENE_FRAMES.reduce((acc, _, i) => [...acc, (acc[i - 1] ?? 0) + (i === 0 ? 0 : SCENE_FRAMES[i - 1])], []);

function pop(frame, delay = 0, damping = 12) {
  const f = Math.max(0, frame - delay);
  return spring({ frame: f, fps: FPS, config: { damping, stiffness: 180 } });
}

function Word({ children, color = WHITE, size = 44 }) {
  return (
    <span style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: size, color, textShadow: `0 0 18px ${color}88, 0 4px 20px rgba(0,0,0,.8)` }}>
      {children}
    </span>
  );
}

function Box({ children, color, size = 46 }) {
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

function CrosshairCorner({ frame }) {
  const s = interpolate(frame % 30, [0, 15, 30], [1, 1.15, 1]);
  return (
    <div style={{ position: "absolute", top: 56, right: 44, fontSize: 40, transform: `scale(${s})`, opacity: 0.85 }}>
      🎯
    </div>
  );
}

// -------------------- SCENE 1 --------------------
function Scene1({ frame }) {
  const shake = frame < 8 ? Math.sin(frame * 3) * (8 - frame) : 0;
  const scale = pop(frame, 0, 10);
  const flash = interpolate(frame, [0, 3, 8], [1, 0.15, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <AbsoluteFill style={{ background: RED, opacity: flash * 0.5 }} />
      <div
        style={{
          fontFamily: "sans-serif",
          fontWeight: 900,
          fontSize: 96,
          color: RED,
          letterSpacing: 1,
          textAlign: "center",
          padding: "0 30px",
          transform: `scale(${0.6 + 0.4 * scale}) translateX(${shake}px)`,
          textShadow: `0 0 40px ${RED}, 0 0 80px ${RED}88`,
        }}
      >
        ⚠ WHOSE TUZAĞI!
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 2 --------------------
function Scene2({ frame }) {
  const arrowX = interpolate(frame % 30, [0, 15, 30], [0, 18, 0]);
  const ex1 = pop(frame, 25, 14);
  const ex2 = pop(frame, 38, 14);
  const ex3 = pop(frame, 51, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: 50, color: YELLOW, textShadow: `0 0 20px ${YELLOW}` }}>
            WHOSE + NOUN
          </div>
          <div style={{ fontSize: 44, color: GREEN, transform: `translateX(${arrowX}px)`, textShadow: `0 0 16px ${GREEN}` }}>→</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ opacity: ex1, transform: `translateY(${(1 - ex1) * 14}px)` }}><Box color={GREEN} size={34}>whose research</Box></div>
          <div style={{ opacity: ex2, transform: `translateY(${(1 - ex2) * 14}px)` }}><Box color={GREEN} size={34}>whose effects</Box></div>
          <div style={{ opacity: ex3, transform: `translateY(${(1 - ex3) * 14}px)` }}><Box color={GREEN} size={34}>whose policies</Box></div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 3 --------------------
function Scene3({ frame }) {
  const scale = pop(frame, 0, 12);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <CrosshairCorner frame={frame} />
      <div
        style={{
          fontFamily: "sans-serif",
          fontWeight: 900,
          fontSize: 60,
          color: GREEN,
          textAlign: "center",
          transform: `scale(${0.7 + 0.3 * scale})`,
          textShadow: `0 0 30px ${GREEN}`,
        }}
      >
        WHOSE → İSİM 🎯
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 4 --------------------
function Scene4({ frame }) {
  const checkIn = pop(frame, 40, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, padding: "0 46px", textAlign: "center" }}>
          <Word size={38}>The scientist</Word>{" "}
          <Box color={GREEN} size={40}>whose research</Box>{" "}
          <Word size={38}>changed medicine received an award.</Word>
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 46,
            color: GREEN,
            opacity: checkIn,
            transform: `scale(${0.8 + 0.2 * checkIn})`,
            textShadow: `0 0 20px ${GREEN}`,
          }}
        >
          whose + research ✅
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 5 --------------------
function Scene5({ frame }) {
  const cardIn = pop(frame, 0, 14);
  const countdownStart = 60;
  const tick = frame - countdownStart;
  let num = null;
  if (tick >= 0 && tick < 24) num = "3";
  else if (tick >= 24 && tick < 48) num = "2";
  else if (tick >= 48) num = "1";
  const localTick = tick >= 0 ? tick % 24 : 0;
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
          width: 840,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          boxShadow: `0 0 40px ${RED}55`,
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 30, color: WHITE, textAlign: "center" }}>
          The researcher _____ findings attracted attention received an award.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: "sans-serif", fontWeight: 700, fontSize: 30, color: YELLOW }}>
          <div>A) who</div>
          <div>B) whom</div>
          <div>C) whose</div>
          <div>D) which</div>
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
  const hitScale = pop(frame, 0, 9);
  const dramaFrame = frame - 60;
  const dramaOn = dramaFrame >= 0;
  const dramaOpacity = dramaOn ? interpolate(dramaFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" }) : 0;
  const dramaShake = dramaOn ? Math.sin(dramaFrame * 2) * Math.max(0, 6 - dramaFrame) : 0;

  if (dramaOn) {
    return (
      <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 46,
            color: RED,
            textAlign: "center",
            padding: "0 26px",
            opacity: dramaOpacity,
            transform: `translateX(${dramaShake}px)`,
            textShadow: `0 0 30px ${RED}, 0 0 60px ${YELLOW}66`,
          }}
        >
          SAĞA BAK → İSMİ GÖR{"\n"}→ WHOSE'U AVLA!
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
          fontSize: 60,
          color: GREEN,
          transform: `scale(${0.5 + 0.5 * hitScale})`,
          textShadow: `0 0 30px ${GREEN}`,
        }}
      >
        🎯 C) WHOSE
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 7 --------------------
function Scene7({ frame }) {
  const inAnim = pop(frame, 0, 10);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, opacity: inAnim, transform: `scale(${0.85 + 0.15 * inAnim})` }}>
        <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: 42, color: YELLOW, textAlign: "center", textShadow: `0 0 24px ${YELLOW}` }}>
          🎯 SİNYAL AVCISI | HEDEF 60+
        </div>
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 28, color: GREEN, textAlign: "center", textShadow: `0 0 16px ${GREEN}` }}>
          SONRAKİ: ALTHOUGH / DESPITE
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const WhoseReel = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* SFX + narasyon */}
      <Sequence from={STARTS[0]} durationInFrames={SCENE_FRAMES[0]}>
        <Audio src={staticFile("of-tuzagi/siren.mp3")} />
        <Sequence from={3}>
          <Audio src={staticFile("whose/n1.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[1] + 25}>
        <Audio src={staticFile("of-tuzagi/lock.mp3")} />
      </Sequence>
      <Sequence from={STARTS[2]} durationInFrames={SCENE_FRAMES[2]}>
        <Sequence from={3}>
          <Audio src={staticFile("whose/n2.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[5]}>
        <Audio src={staticFile("of-tuzagi/hit.mp3")} />
      </Sequence>
      <Sequence from={STARTS[5]} durationInFrames={SCENE_FRAMES[5]}>
        <Sequence from={3}>
          <Audio src={staticFile("whose/n3.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[6]}>
        <Audio src={staticFile("of-tuzagi/hit.mp3")} />
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
