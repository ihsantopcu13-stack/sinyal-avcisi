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
// BECAUSE / BECAUSE OF Tuzağı Reel — OF Tuzağı serisinin altıncı bölümü,
// aynı AVCI görsel kimliği. Sahne süreleri gerçek TTS ses uzunluklarına göre.
// ============================================================

const FPS = 30;
const BG = "#000000";
const RED = "#ff1744";
const YELLOW = "#faff00";
const GREEN = "#39ff14";
const WHITE = "#ffffff";

export const SCENE_FRAMES = [62, 91, 79, 69, 122, 105, 44];
export const TOTAL_FRAMES = SCENE_FRAMES.reduce((a, b) => a + b, 0);
const STARTS = SCENE_FRAMES.reduce((acc, _, i) => [...acc, (acc[i - 1] ?? 0) + (i === 0 ? 0 : SCENE_FRAMES[i - 1])], []);

function pop(frame, delay = 0, damping = 12) {
  const f = Math.max(0, frame - delay);
  return spring({ frame: f, fps: FPS, config: { damping, stiffness: 180 } });
}

function Word({ children, color = WHITE, size = 40 }) {
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
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, transform: `scale(${0.7 + 0.3 * scale}) translateX(${shake}px)` }}>
        <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: 54, color: GREEN, textShadow: `0 0 24px ${GREEN}` }}>BECAUSE</div>
        <div style={{ fontSize: 40 }}>⚔️</div>
        <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: 54, color: YELLOW, textShadow: `0 0 24px ${YELLOW}` }}>BECAUSE OF</div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 2 --------------------
function Scene2({ frame }) {
  const arrowX = interpolate(frame % 30, [0, 15, 30], [0, 18, 0]);
  const line2In = pop(frame, 20, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Word size={36} color={GREEN}>BECAUSE + CÜMLE (S+V)</Word>
          <div style={{ fontSize: 38, color: GREEN, transform: `translateX(${arrowX}px)`, textShadow: `0 0 16px ${GREEN}` }}>→</div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            opacity: line2In,
            transform: `translateY(${(1 - line2In) * 14}px)`,
          }}
        >
          <Word size={36} color={YELLOW}>BECAUSE OF + İSİM / V-ing</Word>
          <div style={{ fontSize: 38, color: YELLOW, transform: `translateX(${arrowX}px)`, textShadow: `0 0 16px ${YELLOW}` }}>→</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 3 --------------------
function Scene3({ frame }) {
  const sIn = pop(frame, 18, 14);
  const vIn = pop(frame, 30, 14);
  const okIn = pop(frame, 48, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 38, color: WHITE, textAlign: "center", padding: "0 30px" }}>
          "because the economy improved"
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, fontFamily: "sans-serif", fontWeight: 700, fontSize: 28 }}>
          <div style={{ color: GREEN, opacity: sIn, textShadow: `0 0 14px ${GREEN}` }}>the economy = S</div>
          <div style={{ color: GREEN, opacity: vIn, textShadow: `0 0 14px ${GREEN}` }}>improved = V</div>
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 46,
            color: GREEN,
            opacity: okIn,
            transform: `scale(${0.8 + 0.2 * okIn})`,
            textShadow: `0 0 24px ${GREEN}`,
          }}
        >
          BECAUSE ✅
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 4 --------------------
function Scene4({ frame }) {
  const nounIn = pop(frame, 16, 14);
  const okIn = pop(frame, 38, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 38, color: WHITE, textAlign: "center", padding: "0 30px" }}>
          "because of the economic crisis"
        </div>
        <div style={{ color: YELLOW, opacity: nounIn, fontFamily: "sans-serif", fontWeight: 700, fontSize: 28, textShadow: `0 0 14px ${YELLOW}` }}>
          the economic crisis = NOUN
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 46,
            color: GREEN,
            opacity: okIn,
            transform: `scale(${0.8 + 0.2 * okIn})`,
            textShadow: `0 0 24px ${GREEN}`,
          }}
        >
          BECAUSE OF ✅
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
          width: 830,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          boxShadow: `0 0 40px ${RED}55`,
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 30, color: WHITE, textAlign: "center" }}>
          Many businesses closed _____ the economic crisis.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: "sans-serif", fontWeight: 700, fontSize: 30, color: YELLOW }}>
          <div>A) because</div>
          <div>B) because of</div>
          <div>C) although</div>
          <div>D) however</div>
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
  const lockScale = interpolate(frame, [0, 12], [2.2, 1], { extrapolateRight: "clamp" });
  const lockOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const hitFrame = frame - 18;
  const hitOn = hitFrame >= 0;
  const hitScale = hitOn ? pop(hitFrame, 0, 9) : 0;
  const dramaFrame = frame - 76;
  const dramaOn = dramaFrame >= 0;
  const dramaOpacity = dramaOn ? interpolate(dramaFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" }) : 0;

  if (dramaOn) {
    return (
      <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 42,
            color: RED,
            textAlign: "center",
            padding: "0 26px",
            opacity: dramaOpacity,
            textShadow: `0 0 26px ${RED}, 0 0 50px ${YELLOW}66`,
          }}
        >
          ÇEVİRME → SAĞA BAK{"\n"}→ YAPIYI AVLA!
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      {!hitOn ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: lockOpacity }}>
          <div style={{ fontSize: 64, transform: `scale(${lockScale})` }}>🎯</div>
          <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 32, color: YELLOW, textShadow: `0 0 16px ${YELLOW}` }}>
            the economic crisis = İSİM
          </div>
        </div>
      ) : (
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 52,
            color: GREEN,
            transform: `scale(${0.5 + 0.5 * hitScale})`,
            textShadow: `0 0 30px ${GREEN}`,
          }}
        >
          🎯 B) BECAUSE OF
        </div>
      )}
    </AbsoluteFill>
  );
}

// -------------------- SCENE 7 --------------------
function Scene7({ frame }) {
  const inAnim = pop(frame, 0, 10);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: inAnim, transform: `scale(${0.85 + 0.15 * inAnim})` }}>
        <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: 46, color: YELLOW, textShadow: `0 0 24px ${YELLOW}` }}>🎯 SİNYAL AVCISI</div>
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 32, color: WHITE }}>YDS / YÖKDİL</div>
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 32, color: RED, textShadow: `0 0 16px ${RED}` }}>HEDEF 60+</div>
      </div>
    </AbsoluteFill>
  );
}

export const BecauseReel = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* SFX + narasyon */}
      <Sequence from={STARTS[0]} durationInFrames={SCENE_FRAMES[0]}>
        <Audio src={staticFile("of-tuzagi/siren.mp3")} />
        <Sequence from={3}>
          <Audio src={staticFile("because/n1.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[1]} durationInFrames={SCENE_FRAMES[1]}>
        <Sequence from={3}>
          <Audio src={staticFile("because/n2.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[2]} durationInFrames={SCENE_FRAMES[2]}>
        <Sequence from={3}>
          <Audio src={staticFile("because/n3.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[3]} durationInFrames={SCENE_FRAMES[3]}>
        <Sequence from={3}>
          <Audio src={staticFile("because/n4.mp3")} />
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
          <Audio src={staticFile("because/n5.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[6]} durationInFrames={SCENE_FRAMES[6]}>
        <Sequence from={3}>
          <Audio src={staticFile("because/n6.mp3")} />
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
