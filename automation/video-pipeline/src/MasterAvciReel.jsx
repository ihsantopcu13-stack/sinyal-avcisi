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
// MASTER AVCI — OF Tuzağı serisinin sezon finali, aynı AVCI görsel
// kimliği ama daha dramatik (8 sahne). Sahne süreleri gerçek TTS ses
// uzunluklarına göre.
// ============================================================

const FPS = 30;
const BG = "#000000";
const RED = "#ff1744";
const YELLOW = "#faff00";
const GREEN = "#39ff14";
const WHITE = "#ffffff";

export const SCENE_FRAMES = [99, 39, 55, 80, 120, 101, 70, 39];
export const TOTAL_FRAMES = SCENE_FRAMES.reduce((a, b) => a + b, 0);
const STARTS = SCENE_FRAMES.reduce((acc, _, i) => [...acc, (acc[i - 1] ?? 0) + (i === 0 ? 0 : SCENE_FRAMES[i - 1])], []);

function pop(frame, delay = 0, damping = 12) {
  const f = Math.max(0, frame - delay);
  return spring({ frame: f, fps: FPS, config: { damping, stiffness: 180 } });
}

function Word({ children, color = WHITE, size = 32 }) {
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

const SENTENCE = "The rapid development of digital technologies has changed modern society.";

function ScannerLine({ frame, width = 900 }) {
  const x = interpolate(frame % 30, [0, 30], [0, width], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 0, bottom: 0, left: x - width / 2, width: 3, background: GREEN, boxShadow: `0 0 20px ${GREEN}`, opacity: 0.7 }} />
  );
}

// -------------------- SCENE 1 --------------------
function Scene1({ frame }) {
  const scale = pop(frame, 0, 10);
  const subIn = pop(frame, 20, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 78,
            color: YELLOW,
            transform: `scale(${0.6 + 0.4 * scale})`,
            textShadow: `0 0 40px ${YELLOW}, 0 0 80px ${YELLOW}88`,
          }}
        >
          MASTER AVCI 🎯
        </div>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 800,
            fontSize: 34,
            color: GREEN,
            opacity: subIn,
            textShadow: `0 0 18px ${GREEN}`,
          }}
        >
          20 SANİYEDE YDS TARAMASI
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 2 --------------------
function Scene2({ frame }) {
  const flashFrame = frame - 20;
  const flashOn = flashFrame >= 0;
  const flashOpacity = flashOn ? interpolate(flashFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" }) : 0;
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 22, padding: "0 24px" }}>
        <ScannerLine frame={frame} />
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, textAlign: "center" }}>
          <Word size={26}>The rapid development of digital technologies</Word>
          <Box color={YELLOW} size={28}>has changed</Box>
          <Word size={26}>modern society.</Word>
        </div>
        {flashOn && (
          <div style={{ opacity: flashOpacity, fontFamily: "sans-serif", fontWeight: 900, fontSize: 44, color: YELLOW, textShadow: `0 0 24px ${YELLOW}` }}>
            V 🎯
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 3 --------------------
function Scene3({ frame }) {
  const sFlash = frame >= 15 && frame < 30;
  const warnOn = frame >= 30;
  const warnOpacity = warnOn ? interpolate(frame - 30, [0, 6], [0, 1], { extrapolateRight: "clamp" }) : 0;
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, padding: "0 24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, textAlign: "center" }}>
          <Box color={GREEN} size={26}>The rapid development of digital technologies</Box>
          <Word size={26}>has changed modern society.</Word>
        </div>
        {sFlash && (
          <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: 44, color: GREEN, textShadow: `0 0 24px ${GREEN}` }}>S 🎯</div>
        )}
        {warnOn && (
          <div
            style={{
              opacity: warnOpacity,
              fontFamily: "sans-serif",
              fontWeight: 900,
              fontSize: 38,
              color: RED,
              textAlign: "center",
              textShadow: `0 0 22px ${RED}`,
            }}
          >
            OF TUZAĞINA DÜŞME!
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 4 --------------------
function Scene4({ frame }) {
  const warnIn = pop(frame, 8, 14);
  const stage2 = frame >= 40;
  const sIn = stage2 ? pop(frame, 40, 14) : 0;
  const vIn = stage2 ? pop(frame, 52, 14) : 0;
  const oIn = stage2 ? pop(frame, 64, 14) : 0;

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      {!stage2 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, padding: "0 24px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, textAlign: "center" }}>
            <Word size={26}>The rapid development</Word>
            <Box color={RED} size={28}>of digital technologies</Box>
          </div>
          <div style={{ opacity: warnIn, fontFamily: "sans-serif", fontWeight: 900, fontSize: 36, color: RED, textAlign: "center", textShadow: `0 0 20px ${RED}` }}>
            SON İSİM = ÖZNE DEĞİL!
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, fontFamily: "sans-serif", fontWeight: 800, fontSize: 26 }}>
          <div style={{ color: GREEN, opacity: sIn, textShadow: `0 0 14px ${GREEN}` }}>S → The rapid development of digital technologies</div>
          <div style={{ color: YELLOW, opacity: vIn, textShadow: `0 0 14px ${YELLOW}` }}>V → has changed</div>
          <div style={{ color: RED, opacity: oIn, textShadow: `0 0 14px ${RED}` }}>O → modern society</div>
        </div>
      )}
    </AbsoluteFill>
  );
}

// -------------------- SCENE 5 --------------------
function Scene5({ frame }) {
  const cardIn = pop(frame, 0, 14);
  const countdownStart = 78;
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
          padding: "30px 28px",
          width: 880,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          boxShadow: `0 0 40px ${RED}55`,
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 20, color: YELLOW, textAlign: "center", letterSpacing: 2 }}>MASTER QUESTION</div>
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 25, color: WHITE, textAlign: "center" }}>
          The increasing use of artificial intelligence _____ many aspects of modern life.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: "sans-serif", fontWeight: 700, fontSize: 26, color: YELLOW }}>
          <div>A) influence</div>
          <div>B) influences</div>
          <div>C) influencing</div>
          <div>D) influenced by</div>
        </div>
      </div>
      {num && (
        <div
          style={{
            position: "absolute",
            bottom: 150,
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 130,
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
  const scanIn = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });
  const headFrame = frame - 22;
  const headOn = headFrame >= 0 && frame < 45;
  const headOpacity = headOn ? interpolate(headFrame, [0, 6], [0, 1], { extrapolateRight: "clamp" }) : 0;
  const hitFrame = frame - 45;
  const hitOn = hitFrame >= 0;
  const hitScale = hitOn ? pop(hitFrame, 0, 9) : 0;

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      {!headOn && !hitOn && (
        <div style={{ opacity: scanIn, padding: "0 30px", textAlign: "center" }}>
          <Box color={GREEN} size={24}>S → The increasing use of artificial intelligence</Box>
        </div>
      )}
      {headOn && (
        <div style={{ opacity: headOpacity, fontFamily: "sans-serif", fontWeight: 900, fontSize: 36, color: YELLOW, textAlign: "center", textShadow: `0 0 20px ${YELLOW}` }}>
          HEAD NOUN → USE → TEKİL
        </div>
      )}
      {hitOn && (
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 50,
            color: GREEN,
            transform: `scale(${0.5 + 0.5 * hitScale})`,
            textShadow: `0 0 30px ${GREEN}`,
          }}
        >
          🎯 B) INFLUENCES
        </div>
      )}
    </AbsoluteFill>
  );
}

// -------------------- SCENE 7 (rapid sequence) --------------------
const STEPS = ["GÖR", "FİİLİ BUL", "S+V+O", "SİNYALİ YAKALA", "SAĞ / SOL KONTROL", "ŞIKKI ELE", "ANLAMI DOĞRULA", "🎯 AVLA!"];
const STEP_COLORS = [WHITE, YELLOW, GREEN, YELLOW, WHITE, YELLOW, WHITE, GREEN];

function Scene7({ frame, totalFrames }) {
  const stepDur = totalFrames / STEPS.length;
  const idx = Math.min(STEPS.length - 1, Math.floor(frame / stepDur));
  const localFrame = frame - idx * stepDur;
  const scale = pop(localFrame, 0, 9);
  const isLast = idx === STEPS.length - 1;
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontFamily: "sans-serif",
          fontWeight: 900,
          fontSize: isLast ? 64 : 46,
          color: STEP_COLORS[idx],
          textAlign: "center",
          padding: "0 30px",
          transform: `scale(${0.6 + 0.4 * scale})`,
          textShadow: `0 0 26px ${STEP_COLORS[idx]}`,
        }}
      >
        {STEPS[idx]}
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 8 --------------------
function Scene8({ frame }) {
  const inAnim = pop(frame, 0, 10);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: inAnim, transform: `scale(${0.85 + 0.15 * inAnim})` }}>
        <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: 46, color: YELLOW, textShadow: `0 0 24px ${YELLOW}` }}>🎯 SİNYAL AVCISI</div>
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 30, color: WHITE }}>YDS / YÖKDİL</div>
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 30, color: RED, textShadow: `0 0 16px ${RED}` }}>HEDEF 60+</div>
      </div>
    </AbsoluteFill>
  );
}

export const MasterAvciReel = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* SFX + narasyon */}
      <Sequence from={STARTS[0]} durationInFrames={SCENE_FRAMES[0]}>
        <Audio src={staticFile("of-tuzagi/siren.mp3")} />
        <Sequence from={3}>
          <Audio src={staticFile("master-avci/n1.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[1]} durationInFrames={SCENE_FRAMES[1]}>
        <Sequence from={2}>
          <Audio src={staticFile("master-avci/n2.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[2]} durationInFrames={SCENE_FRAMES[2]}>
        <Sequence from={2}>
          <Audio src={staticFile("master-avci/n3.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[5]}>
        <Audio src={staticFile("of-tuzagi/lock.mp3")} />
      </Sequence>
      <Sequence from={STARTS[5] + 45}>
        <Audio src={staticFile("of-tuzagi/hit.mp3")} />
      </Sequence>
      <Sequence from={STARTS[5]} durationInFrames={SCENE_FRAMES[5]}>
        <Sequence from={47}>
          <Audio src={staticFile("master-avci/n4.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[7]}>
        <Audio src={staticFile("of-tuzagi/hit.mp3")} />
      </Sequence>
      <Sequence from={STARTS[7]} durationInFrames={SCENE_FRAMES[7]}>
        <Sequence from={3}>
          <Audio src={staticFile("master-avci/n5.mp3")} />
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
        <Scene7 frame={frame - STARTS[6]} totalFrames={SCENE_FRAMES[6]} />
      </Sequence>
      <Sequence from={STARTS[7]} durationInFrames={SCENE_FRAMES[7]}>
        <Scene8 frame={frame - STARTS[7]} />
      </Sequence>
    </AbsoluteFill>
  );
};
