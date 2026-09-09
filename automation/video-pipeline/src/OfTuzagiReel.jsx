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

// ============================================================
// OF Tuzağı Reel — özel tek seferlik video (avci-reels-preview.html
// senaryosundan farklı, kendi görsel diliyle: siyah zemin + neon
// kırmızı/sarı/yeşil, crosshair/uyarı temalı YDS/YÖKDİL gramer dersi).
// Sahne süreleri gerçek TTS ses uzunluklarına göre (SCENE_FRAMES) —
// sabit tahmin DEĞİL, aksi halde narasyon yarıda kesilir.
// ============================================================

const FPS = 30;
const BG = "#000000";
const RED = "#ff1744";
const YELLOW = "#faff00";
const GREEN = "#39ff14";
const WHITE = "#ffffff";

export const SCENE_FRAMES = [45, 52, 122, 128, 84, 101, 39];
export const TOTAL_FRAMES = SCENE_FRAMES.reduce((a, b) => a + b, 0);
const STARTS = SCENE_FRAMES.reduce((acc, d, i) => [...acc, (acc[i - 1] ?? 0) + (i === 0 ? 0 : SCENE_FRAMES[i - 1])], []);

function pop(frame, delay = 0, damping = 12) {
  const f = Math.max(0, frame - delay);
  return spring({ frame: f, fps: FPS, config: { damping, stiffness: 180 } });
}

function Word({ children, color = WHITE, size = 46 }) {
  return (
    <span
      style={{
        fontFamily: "sans-serif",
        fontWeight: 800,
        fontSize: size,
        color,
        textShadow: `0 0 18px ${color}88, 0 4px 20px rgba(0,0,0,.8)`,
      }}
    >
      {children}
    </span>
  );
}

function Sentence({ frame, parts }) {
  // parts: [{ text, color?, boxColor? }]
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, padding: "0 60px", textAlign: "center" }}>
      {parts.map((p, i) => (
        <span
          key={i}
          style={{
            fontFamily: "sans-serif",
            fontWeight: 800,
            fontSize: 44,
            color: p.color || WHITE,
            background: p.boxColor ? p.boxColor + "33" : "transparent",
            border: p.boxColor ? `3px solid ${p.boxColor}` : "none",
            borderRadius: p.boxColor ? 10 : 0,
            padding: p.boxColor ? "2px 10px" : 0,
            textShadow: `0 4px 16px rgba(0,0,0,.8)`,
          }}
        >
          {p.text}
        </span>
      ))}
    </div>
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
  const subOpacity = interpolate(frame, [8, 16], [0, 1], { extrapolateRight: "clamp" });
  const flash = interpolate(frame, [0, 3, 8], [1, 0.15, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <AbsoluteFill style={{ background: RED, opacity: flash * 0.5 }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, transform: `translateX(${shake}px)` }}>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 96,
            color: RED,
            letterSpacing: 2,
            transform: `scale(${0.6 + 0.4 * scale})`,
            textShadow: `0 0 40px ${RED}, 0 0 80px ${RED}88`,
          }}
        >
          ⚠ OF TUZAĞI!
        </div>
        <div style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 34, color: YELLOW, opacity: subOpacity, textAlign: "center", padding: "0 40px" }}>
          Son ismi hemen özne sanma!
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 2 --------------------
function Scene2({ frame }) {
  const highlightPulse = 1 + 0.08 * Math.sin(frame / 3);
  const labelIn = pop(frame, 20, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <CrosshairCorner frame={frame} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, padding: "0 50px", textAlign: "center" }}>
          <Word>The rapid development of technology</Word>{" "}
          <span
            style={{
              display: "inline-block",
              fontFamily: "sans-serif",
              fontWeight: 900,
              fontSize: 46,
              color: YELLOW,
              background: YELLOW + "22",
              border: `3px solid ${YELLOW}`,
              borderRadius: 10,
              padding: "2px 12px",
              transform: `scale(${highlightPulse})`,
              textShadow: `0 0 20px ${YELLOW}`,
            }}
          >
            changes
          </span>{" "}
          <Word>society.</Word>
        </div>
        <div
          style={{
            opacity: labelIn,
            transform: `translateY(${(1 - labelIn) * 20}px)`,
            fontFamily: "sans-serif",
            fontWeight: 800,
            fontSize: 40,
            color: GREEN,
            textShadow: `0 0 18px ${GREEN}`,
          }}
        >
          V → changes 🎯
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 3 --------------------
function Scene3({ frame }) {
  const xIn = pop(frame, 50, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 44 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, padding: "0 50px", textAlign: "center" }}>
          <Word>The rapid development</Word>{" "}
          <span
            style={{
              fontFamily: "sans-serif",
              fontWeight: 900,
              fontSize: 46,
              color: RED,
              background: RED + "22",
              border: `3px solid ${RED}`,
              borderRadius: 10,
              padding: "2px 12px",
              textShadow: `0 0 20px ${RED}`,
            }}
          >
            of technology
          </span>{" "}
          <Word>changes society.</Word>
        </div>
        <div
          style={{
            opacity: xIn,
            transform: `scale(${0.7 + 0.3 * xIn})`,
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 52,
            color: RED,
            textShadow: `0 0 26px ${RED}`,
          }}
        >
          ❌ technology = S
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 4 --------------------
function Bracket({ frame }) {
  const draw = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  const w = 620;
  return (
    <svg width={w} height={40} style={{ overflow: "visible" }}>
      <path
        d={`M 4 4 L 4 24 L ${w - 4} 24 L ${w - 4} 4`}
        fill="none"
        stroke={GREEN}
        strokeWidth={5}
        strokeDasharray={w}
        strokeDashoffset={w * (1 - draw)}
        style={{ filter: `drop-shadow(0 0 8px ${GREEN})` }}
      />
    </svg>
  );
}

function Scene4({ frame }) {
  const sIn = pop(frame, 55, 14);
  const vIn = pop(frame, 68, 14);
  const oIn = pop(frame, 81, 14);
  const flashFrame = frame - 96;
  const flashOn = flashFrame >= 0;
  const flashOpacity = flashOn ? interpolate(flashFrame % 20, [0, 2, 10, 12], [1, 0.3, 1, 0.3], { extrapolateRight: "clamp" }) : 0;

  if (flashOn) {
    return (
      <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", padding: "0 36px" }}>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 52,
            color: YELLOW,
            textAlign: "center",
            lineHeight: 1.4,
            opacity: flashOpacity,
            textShadow: `0 0 30px ${YELLOW}`,
          }}
        >
          OF GÖR → FİİLİ BUL →{"\n"}SOLA DÖN → BLOĞU KORU
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 40, color: WHITE, textAlign: "center", padding: "0 40px" }}>
            The rapid development of technology
          </div>
          <Bracket frame={frame} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, fontFamily: "sans-serif", fontWeight: 800, fontSize: 34 }}>
          <div style={{ color: GREEN, opacity: sIn, transform: `translateX(${(1 - sIn) * -24}px)`, textShadow: `0 0 14px ${GREEN}` }}>
            S → The rapid development of technology
          </div>
          <div style={{ color: YELLOW, opacity: vIn, transform: `translateX(${(1 - vIn) * -24}px)`, textShadow: `0 0 14px ${YELLOW}` }}>
            V → changes
          </div>
          <div style={{ color: RED, opacity: oIn, transform: `translateX(${(1 - oIn) * -24}px)`, textShadow: `0 0 14px ${RED}` }}>
            O → society
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 5 --------------------
function Scene5({ frame }) {
  const cardIn = pop(frame, 0, 14);
  const countdownStart = 30;
  const tick = frame - countdownStart;
  let num = null;
  if (tick >= 0 && tick < 18) num = "3";
  else if (tick >= 18 && tick < 36) num = "2";
  else if (tick >= 36) num = "1";
  const localTick = tick >= 0 ? tick % 18 : 0;
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
          width: 780,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          boxShadow: `0 0 40px ${RED}55`,
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 34, color: WHITE, textAlign: "center" }}>
          The rapid development of technology _____ new opportunities.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: "sans-serif", fontWeight: 700, fontSize: 30, color: YELLOW }}>
          <div>A) needs</div>
          <div>B) creates</div>
          <div>C) prevents</div>
          <div>D) ignores</div>
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
  const sIn = pop(frame, 20, 14);
  const vIn = pop(frame, 32, 14);
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
            fontSize: 58,
            color: RED,
            textAlign: "center",
            padding: "0 40px",
            opacity: dramaOpacity,
            transform: `translateX(${dramaShake}px)`,
            textShadow: `0 0 30px ${RED}, 0 0 60px ${YELLOW}66`,
          }}
        >
          SORUYU ÇÖZME...{"\n"}AVLA!
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
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
          🎯 B) CREATES
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, fontFamily: "sans-serif", fontWeight: 800, fontSize: 32 }}>
          <div style={{ color: WHITE, opacity: sIn, textShadow: `0 4px 14px rgba(0,0,0,.8)` }}>S = development → TEKİL</div>
          <div style={{ color: GREEN, opacity: vIn, textShadow: `0 0 14px ${GREEN}` }}>V = creates</div>
        </div>
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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          opacity: inAnim,
          transform: `scale(${0.85 + 0.15 * inAnim})`,
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontWeight: 900, fontSize: 54, color: YELLOW, textShadow: `0 0 26px ${YELLOW}` }}>
          🎯 SİNYAL AVCISI
        </div>
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 34, color: WHITE }}>YDS / YÖKDİL</div>
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 34, color: RED, textShadow: `0 0 16px ${RED}` }}>HEDEF 60+</div>
        <div style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 22, color: GREEN, marginTop: 8, textAlign: "center", padding: "0 30px" }}>
          GÖR → FİİLİ BUL → SİNYALİ YAKALA → AVLA
        </div>
      </div>
    </AbsoluteFill>
  );
}

export const OfTuzagiReel = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* SFX + narasyon */}
      <Sequence from={STARTS[0]} durationInFrames={SCENE_FRAMES[0]}>
        <Audio src={staticFile("of-tuzagi/siren.mp3")} />
        <Sequence from={3}>
          <Audio src={staticFile("of-tuzagi/s1.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[1] + 20}>
        <Audio src={staticFile("of-tuzagi/lock.mp3")} />
      </Sequence>
      <Sequence from={STARTS[1]} durationInFrames={SCENE_FRAMES[1]}>
        <Sequence from={4}>
          <Audio src={staticFile("of-tuzagi/s2.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[2]} durationInFrames={SCENE_FRAMES[2]}>
        <Sequence from={4}>
          <Audio src={staticFile("of-tuzagi/s3.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[3]} durationInFrames={SCENE_FRAMES[3]}>
        <Sequence from={4}>
          <Audio src={staticFile("of-tuzagi/s4.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[5]}>
        <Audio src={staticFile("of-tuzagi/hit.mp3")} />
      </Sequence>
      <Sequence from={STARTS[5]} durationInFrames={SCENE_FRAMES[5]}>
        <Sequence from={5}>
          <Audio src={staticFile("of-tuzagi/s6a.mp3")} />
        </Sequence>
        <Sequence from={60}>
          <Audio src={staticFile("of-tuzagi/s6b.mp3")} />
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
