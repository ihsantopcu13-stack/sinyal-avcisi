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
// IT / THEY Tuzağı Reel — OF Tuzağı serisinin on dördüncü bölümü, aynı
// AVCI görsel kimliği. Sahne süreleri gerçek TTS ses uzunluklarına göre.
// ============================================================

const FPS = 30;
const BG = "#000000";
const RED = "#ff1744";
const YELLOW = "#faff00";
const GREEN = "#39ff14";
const WHITE = "#ffffff";

export const SCENE_FRAMES = [80, 110, 78, 130, 84, 40, 30];
export const TOTAL_FRAMES = SCENE_FRAMES.reduce((a, b) => a + b, 0);
const STARTS = SCENE_FRAMES.reduce((acc, _, i) => [...acc, (acc[i - 1] ?? 0) + (i === 0 ? 0 : SCENE_FRAMES[i - 1])], []);

function pop(frame, delay = 0, damping = 12) {
  const f = Math.max(0, frame - delay);
  return spring({ frame: f, fps: FPS, config: { damping, stiffness: 180 } });
}

function Word({ children, color = WHITE, size = 34 }) {
  return (
    <span style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: size, color, textShadow: `0 0 18px ${color}88, 0 4px 20px rgba(0,0,0,.8)` }}>
      {children}
    </span>
  );
}

function Box({ children, color, size = 32 }) {
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
          fontFamily: "sans-serif",
          fontWeight: 900,
          fontSize: 68,
          color: RED,
          letterSpacing: 1,
          textAlign: "center",
          padding: "0 30px",
          transform: `scale(${0.6 + 0.4 * scale}) translateX(${shake}px)`,
          textShadow: `0 0 40px ${RED}, 0 0 80px ${RED}88`,
        }}
      >
        ⚠ IT / THEY TUZAĞI! 🚨
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 2 --------------------
function Scene2({ frame }) {
  const l2In = pop(frame, 20, 12);
  const l3In = pop(frame, 40, 12);
  const l4In = pop(frame, 60, 12);
  const arrowX = interpolate(frame % 30, [0, 15, 30], [0, -18, 0]);

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <Word size={30} color={GREEN}>IT → TEKİL</Word>
        <div style={{ opacity: l2In }}>
          <Word size={30} color={YELLOW}>THEY → ÇOĞUL</Word>
        </div>
        <div style={{ opacity: l3In }}>
          <Word size={28} color={GREEN}>THIS → tek fikir / tekil referans</Word>
        </div>
        <div style={{ opacity: l4In, display: "flex", alignItems: "center", gap: 10 }}>
          <Word size={28} color={YELLOW}>THESE → çoğul</Word>
        </div>
        <div style={{ marginTop: 10, fontSize: 30, color: RED, transform: `translateX(${arrowX}px)`, textShadow: `0 0 16px ${RED}` }}>
          ← GERİYE BAK
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 3 --------------------
function Scene3({ frame }) {
  const flashFrame = frame - 30;
  const flashOn = flashFrame >= 0;
  const flashOpacity = flashOn ? interpolate(flashFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, padding: "0 30px", textAlign: "center" }}>
          <Box color={GREEN} size={28}>Researchers</Box>
          <Word size={28}>developed new methods.</Word>
          <Box color={YELLOW} size={28}>They</Box>
          <Word size={28}>tested them carefully.</Word>
        </div>
        {flashOn && (
          <div
            style={{
              fontFamily: "sans-serif",
              fontWeight: 900,
              fontSize: 42,
              color: YELLOW,
              opacity: flashOpacity,
              transform: `scale(${0.85 + 0.15 * flashOpacity})`,
              textShadow: `0 0 24px ${YELLOW}`,
            }}
          >
            ÇOĞUL → THEY 🎯
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 4 --------------------
function Scene4({ frame }) {
  const cardIn = pop(frame, 0, 14);
  const countdownStart = 68;
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
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 26, color: WHITE, textAlign: "center" }}>
          Many students use online resources because _____ provide quick access to information.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: "sans-serif", fontWeight: 700, fontSize: 30, color: YELLOW }}>
          <div>A) it</div>
          <div>B) they</div>
          <div>C) this</div>
          <div>D) that</div>
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
  const highlightOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const hitFrame = frame - 15;
  const hitOn = hitFrame >= 0;
  const hitScale = hitOn ? pop(hitFrame, 0, 9) : 0;

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      {!hitOn ? (
        <div style={{ opacity: highlightOpacity }}>
          <Box color={YELLOW} size={32}>online resources → PLURAL</Box>
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
          🎯 B) THEY
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
          fontSize: 30,
          color: RED,
          textAlign: "center",
          padding: "0 26px",
          opacity: in1,
          transform: `scale(${0.85 + 0.15 * in1})`,
          textShadow: `0 0 22px ${RED}`,
        }}
      >
        ZAMİRİ GÖR → GERİYE BAK → TEKİL/ÇOĞUL KONTROL ET → AVLA!
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 7 --------------------
function Scene7({ frame }) {
  const inAnim = pop(frame, 0, 10);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontFamily: "sans-serif",
          fontWeight: 900,
          fontSize: 40,
          color: YELLOW,
          textAlign: "center",
          padding: "0 30px",
          opacity: inAnim,
          transform: `scale(${0.85 + 0.15 * inAnim})`,
          textShadow: `0 0 24px ${YELLOW}`,
        }}
      >
        🎯 SİNYAL AVCISI | HEDEF 60+
      </div>
    </AbsoluteFill>
  );
}

export const ItTheyReel = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* SFX + narasyon */}
      <Sequence from={STARTS[0]} durationInFrames={SCENE_FRAMES[0]}>
        <Audio src={staticFile("of-tuzagi/siren.mp3")} />
        <Sequence from={3}>
          <Audio src={staticFile("it-they/n1.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[2]} durationInFrames={SCENE_FRAMES[2]}>
        <Sequence from={3}>
          <Audio src={staticFile("it-they/n2.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[4]}>
        <Audio src={staticFile("of-tuzagi/hit.mp3")} />
      </Sequence>
      <Sequence from={STARTS[4]} durationInFrames={SCENE_FRAMES[4]}>
        <Sequence from={17}>
          <Audio src={staticFile("it-they/n3.mp3")} />
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
