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
// THE NUMBER OF Tuzağı Reel — OF Tuzağı serisinin üçüncü bölümü, aynı
// AVCI görsel kimliği. Sahne süreleri gerçek TTS ses uzunluklarına göre.
// ============================================================

const FPS = 30;
const BG = "#000000";
const RED = "#ff1744";
const YELLOW = "#faff00";
const GREEN = "#39ff14";
const WHITE = "#ffffff";

export const SCENE_FRAMES = [74, 78, 83, 75, 130, 97, 39];
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
  const subOpacity = interpolate(frame, [10, 18], [0, 1], { extrapolateRight: "clamp" });
  const flash = interpolate(frame, [0, 3, 8], [1, 0.15, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <AbsoluteFill style={{ background: RED, opacity: flash * 0.5 }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, transform: `translateX(${shake}px)` }}>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 84,
            color: RED,
            letterSpacing: 1,
            textAlign: "center",
            padding: "0 30px",
            transform: `scale(${0.6 + 0.4 * scale})`,
            textShadow: `0 0 40px ${RED}, 0 0 80px ${RED}88`,
          }}
        >
          ⚠ THE NUMBER OF!
        </div>
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 34, color: YELLOW, opacity: subOpacity, textAlign: "center", padding: "0 30px", textShadow: `0 0 16px ${YELLOW}` }}>
          ÇOĞUL İSME ALDANMA!
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 2 --------------------
function Scene2({ frame }) {
  const highlightUsers = frame < 39;
  const pulse = 1 + 0.07 * Math.sin(frame / 3);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <CrosshairCorner frame={frame} />
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, padding: "0 50px", textAlign: "center" }}>
        {highlightUsers ? (
          <>
            <Word>The number of online</Word>{" "}
            <span style={{ transform: `scale(${pulse})`, display: "inline-block" }}>
              <Box color={YELLOW}>users</Box>
            </span>{" "}
            <Word>is increasing.</Word>
          </>
        ) : (
          <>
            <Word>The number of online users</Word>{" "}
            <span style={{ transform: `scale(${pulse})`, display: "inline-block" }}>
              <Box color={GREEN}>is</Box>
            </span>{" "}
            <Word>increasing.</Word>
          </>
        )}
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 3 --------------------
function Scene3({ frame }) {
  const xIn = pop(frame, 0, 10);
  const okIn = pop(frame, 14, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 46,
            color: RED,
            textAlign: "center",
            transform: `scale(${0.7 + 0.3 * xIn})`,
            textDecoration: "line-through",
            textDecorationColor: RED,
            textShadow: `0 0 20px ${RED}`,
          }}
        >
          users → are ❌
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 56,
            color: GREEN,
            textAlign: "center",
            opacity: okIn,
            transform: `scale(${0.7 + 0.3 * okIn})`,
            textShadow: `0 0 26px ${GREEN}`,
          }}
        >
          THE NUMBER → IS 🎯
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 4 --------------------
function Scene4({ frame }) {
  const sIn = pop(frame, 10, 14);
  const vIn = pop(frame, 24, 14);
  const flashFrame = frame - 42;
  const flashOn = flashFrame >= 0;
  const flashOpacity = flashOn ? interpolate(flashFrame % 20, [0, 2, 10, 12], [1, 0.3, 1, 0.3], { extrapolateRight: "clamp" }) : 0;

  if (flashOn) {
    return (
      <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 58,
            color: YELLOW,
            textAlign: "center",
            padding: "0 30px",
            opacity: flashOpacity,
            textShadow: `0 0 30px ${YELLOW}`,
          }}
        >
          THE NUMBER OF → TEKİL
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, fontFamily: "sans-serif", fontWeight: 800, fontSize: 36 }}>
        <div style={{ color: GREEN, opacity: sIn, transform: `translateX(${(1 - sIn) * -24}px)`, textShadow: `0 0 14px ${GREEN}` }}>
          S → The number of online users
        </div>
        <div style={{ color: YELLOW, opacity: vIn, transform: `translateX(${(1 - vIn) * -24}px)`, textShadow: `0 0 14px ${YELLOW}` }}>
          V → is increasing
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
          width: 820,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          boxShadow: `0 0 40px ${RED}55`,
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 32, color: WHITE, textAlign: "center" }}>
          The number of people using social media _____ rapidly.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: "sans-serif", fontWeight: 700, fontSize: 28, color: YELLOW }}>
          <div>A) are increasing</div>
          <div>B) increase</div>
          <div>C) is increasing</div>
          <div>D) have increased</div>
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
  const dramaFrame = frame - 58;
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
            fontSize: 50,
            color: RED,
            textAlign: "center",
            padding: "0 30px",
            opacity: dramaOpacity,
            transform: `translateX(${dramaShake}px)`,
            textShadow: `0 0 30px ${RED}, 0 0 60px ${YELLOW}66`,
          }}
        >
          ÇOĞUL İSME DEĞİL...{"\n"}PATRONA BAK!
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
          fontSize: 52,
          color: GREEN,
          textAlign: "center",
          padding: "0 30px",
          transform: `scale(${0.5 + 0.5 * hitScale})`,
          textShadow: `0 0 30px ${GREEN}`,
        }}
      >
        🎯 C) IS INCREASING
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
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 30, color: GREEN, textAlign: "center", textShadow: `0 0 16px ${GREEN}` }}>
          SONRAKİ AVCI: WHOSE
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const TheNumberOfReel = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* SFX + narasyon */}
      <Sequence from={STARTS[0]} durationInFrames={SCENE_FRAMES[0]}>
        <Audio src={staticFile("of-tuzagi/siren.mp3")} />
        <Sequence from={3}>
          <Audio src={staticFile("the-number-of/n1.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[1] + 39}>
        <Audio src={staticFile("of-tuzagi/lock.mp3")} />
      </Sequence>
      <Sequence from={STARTS[2]} durationInFrames={SCENE_FRAMES[2]}>
        <Sequence from={3}>
          <Audio src={staticFile("the-number-of/n2.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[5]}>
        <Audio src={staticFile("of-tuzagi/hit.mp3")} />
      </Sequence>
      <Sequence from={STARTS[5]} durationInFrames={SCENE_FRAMES[5]}>
        <Sequence from={3}>
          <Audio src={staticFile("the-number-of/n3.mp3")} />
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
