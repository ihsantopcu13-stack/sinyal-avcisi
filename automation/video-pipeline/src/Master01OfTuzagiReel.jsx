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
// SİNYAL AVCISI — MASTER VİDEO PAKETİ — #1 OF TUZAĞI (DETAY sürümü)
// automation/video-pipeline/data/master-video-paketi.md'deki #1
// bölümünden birebir üretildi (kural/neden/örnek/tuzak/soru/çözüm/AVCI
// kodu değiştirilmedi). OfTuzagiReel.jsx ile aynı görsel dil (siyah
// zemin + neon kırmızı/sarı/yeşil, crosshair) ama bu seri "öğretme +
// pekiştirme" formatında, kısa Reels'ten ayrı ve onu değiştirmiyor.
// Sahne süreleri gerçek TTS ses uzunluklarına göre (bkz.
// scripts/_tmp_gen_master01_audio.mjs çıktısı, public/master-01/durations.json).
// ============================================================

const FPS = 30;
const BG = "#000000";
const RED = "#ff1744";
const YELLOW = "#faff00";
const GREEN = "#39ff14";
const WHITE = "#ffffff";

export const SCENE_FRAMES = [45, 152, 118, 103, 267, 297, 168, 142, 60];
export const TOTAL_FRAMES = SCENE_FRAMES.reduce((a, b) => a + b, 0);
const STARTS = SCENE_FRAMES.reduce((acc, d, i) => [...acc, (acc[i - 1] ?? 0) + (i === 0 ? 0 : SCENE_FRAMES[i - 1])], []);

function pop(frame, delay = 0, damping = 12) {
  const f = Math.max(0, frame - delay);
  return spring({ frame: f, fps: FPS, config: { damping, stiffness: 180 } });
}

function Word({ children, color = WHITE, size = 44 }) {
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

function StepLabel({ children, color = YELLOW }) {
  return (
    <div
      style={{
        fontFamily: "sans-serif",
        fontWeight: 700,
        fontSize: 24,
        letterSpacing: 3,
        color,
        textTransform: "uppercase",
        textShadow: `0 0 14px ${color}`,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function CrosshairCorner() {
  return (
    <div style={{ position: "absolute", top: 56, right: 44, fontSize: 40, opacity: 0.85 }}>🎯</div>
  );
}

// -------------------- SCENE 1 — HOOK --------------------
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
          fontSize: 92,
          color: RED,
          letterSpacing: 2,
          transform: `translateX(${shake}px) scale(${0.6 + 0.4 * scale})`,
          textShadow: `0 0 40px ${RED}, 0 0 80px ${RED}88`,
        }}
      >
        ⚠ OF TUZAĞI!
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 2 — KURAL / NASIL TANIRIM --------------------
function Scene2({ frame }) {
  const l1 = pop(frame, 0, 14);
  const l2 = pop(frame, 20, 14);
  const l3 = pop(frame, 45, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", padding: "0 60px" }}>
      <CrosshairCorner />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, textAlign: "center" }}>
        <StepLabel color={GREEN}>KURAL</StepLabel>
        <div style={{ opacity: l1, transform: `translateY(${(1 - l1) * 16}px)` }}>
          <Word color={WHITE} size={40}>
            "of" gördüğünde son ismi özne sanma.
          </Word>
        </div>
        <div style={{ opacity: l2, transform: `translateY(${(1 - l2) * 16}px)` }}>
          <Word color={YELLOW} size={40}>
            Önce fiili bul.
          </Word>
        </div>
        <div style={{ opacity: l3, transform: `translateY(${(1 - l3) * 16}px)` }}>
          <Word color={GREEN} size={40}>
            Sonra sola dön, patron ismi bul.
          </Word>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 3 — NEDEN --------------------
function Scene3({ frame }) {
  const boxIn = pop(frame, 0, 12);
  const textIn = pop(frame, 25, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", padding: "0 60px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30, textAlign: "center" }}>
        <StepLabel color={GREEN}>NEDEN?</StepLabel>
        <div
          style={{
            opacity: boxIn,
            transform: `scale(${0.85 + 0.15 * boxIn})`,
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 48,
            color: YELLOW,
            border: `3px solid ${YELLOW}`,
            borderRadius: 14,
            padding: "12px 26px",
            background: YELLOW + "18",
            textShadow: `0 0 20px ${YELLOW}`,
          }}
        >
          OF + İSİM
        </div>
        <div style={{ opacity: textIn, transform: `translateY(${(1 - textIn) * 16}px)` }}>
          <Word color={WHITE} size={38}>
            kendinden önceki ismi tamamlayan bir edat grubudur.
          </Word>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 4 — ÖSYM TUZAĞI --------------------
function Scene4({ frame }) {
  const shake = frame < 10 ? Math.sin(frame * 4) * (10 - frame) : 0;
  const scale = pop(frame, 0, 10);
  const subIn = pop(frame, 24, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", padding: "0 50px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, textAlign: "center" }}>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 56,
            color: RED,
            transform: `translateX(${shake}px) scale(${0.7 + 0.3 * scale})`,
            textShadow: `0 0 30px ${RED}`,
          }}
        >
          🚨 ÖSYM TUZAĞI
        </div>
        <div style={{ opacity: subIn, transform: `translateY(${(1 - subIn) * 16}px)` }}>
          <Word color={WHITE} size={36}>
            Fiile en yakın ismi özne sanmanı bekler.
          </Word>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 5 — ÖRNEK --------------------
function Scene5({ frame }) {
  const verbIn = pop(frame, 95, 14);
  const trapIn = pop(frame, 156, 14);
  const svoIn = pop(frame, 210, 14);
  const highlightPulse = 1 + 0.06 * Math.sin(frame / 3);

  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", padding: "0 44px" }}>
      <StepLabel color={GREEN}>ÖRNEK</StepLabel>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30, marginTop: 10 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, textAlign: "center" }}>
          <Word>The rapid development</Word>{" "}
          <span
            style={{
              fontFamily: "sans-serif",
              fontWeight: 900,
              fontSize: 42,
              color: trapIn > 0.3 ? RED : WHITE,
              background: trapIn > 0.3 ? RED + "22" : "transparent",
              border: trapIn > 0.3 ? `3px solid ${RED}` : "none",
              borderRadius: 10,
              padding: trapIn > 0.3 ? "2px 10px" : 0,
              transform: `scale(${trapIn > 0.3 ? 0.9 + 0.1 * trapIn : 1})`,
              textShadow: trapIn > 0.3 ? `0 0 18px ${RED}` : "none",
            }}
          >
            of technology
          </span>{" "}
          <span
            style={{
              fontFamily: "sans-serif",
              fontWeight: 900,
              fontSize: 42,
              color: YELLOW,
              background: verbIn > 0.2 ? YELLOW + "22" : "transparent",
              border: verbIn > 0.2 ? `3px solid ${YELLOW}` : "none",
              borderRadius: 10,
              padding: verbIn > 0.2 ? "2px 10px" : 0,
              transform: `scale(${verbIn > 0.2 ? highlightPulse : 1})`,
              textShadow: verbIn > 0.2 ? `0 0 20px ${YELLOW}` : "none",
            }}
          >
            changes
          </span>{" "}
          <Word>society.</Word>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, fontFamily: "sans-serif", fontWeight: 800, fontSize: 32 }}>
          <div style={{ color: YELLOW, opacity: svoIn, transform: `translateX(${(1 - svoIn) * -20}px)`, textShadow: `0 0 14px ${YELLOW}` }}>
            V → changes
          </div>
          <div style={{ color: GREEN, opacity: svoIn, transform: `translateX(${(1 - svoIn) * -20}px)`, textShadow: `0 0 14px ${GREEN}` }}>
            patron isim → development
          </div>
          <div style={{ color: RED, opacity: svoIn, transform: `translateX(${(1 - svoIn) * -20}px)`, textShadow: `0 0 14px ${RED}` }}>
            technology → özne DEĞİL, of grubunda
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 6 — MİNİ SORU + 3-2-1 --------------------
function Scene6({ frame }) {
  const cardIn = pop(frame, 0, 14);
  const countdownStart = 233; // narasyon (l6_soru) bittikten hemen sonra
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
      <StepLabel color={YELLOW}>MİNİ SORU</StepLabel>
      <div
        style={{
          opacity: cardIn,
          transform: `scale(${0.85 + 0.15 * cardIn})`,
          background: "#0a0a0a",
          border: `${borderPulse}px solid ${RED}`,
          borderRadius: 18,
          padding: "30px 30px",
          width: 780,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          marginTop: 14,
          boxShadow: `0 0 40px ${RED}55`,
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 32, color: WHITE, textAlign: "center" }}>
          The rapid development of technology _____ new opportunities.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: "sans-serif", fontWeight: 700, fontSize: 28, color: YELLOW }}>
          <div>A) create</div>
          <div>B) creates</div>
          <div>C) creating</div>
          <div>D) have created</div>
        </div>
      </div>
      {num && (
        <div
          style={{
            position: "absolute",
            bottom: 130,
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

// -------------------- SCENE 7 — CEVAP VE ÇÖZÜM --------------------
function Scene7({ frame }) {
  const hitScale = pop(frame, 0, 9);
  const l1 = pop(frame, 18, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
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
          🎯 B) CREATES
        </div>
        <div
          style={{
            opacity: l1,
            transform: `translateY(${(1 - l1) * 16}px)`,
            fontFamily: "sans-serif",
            fontWeight: 700,
            fontSize: 32,
            color: WHITE,
            textAlign: "center",
            padding: "0 50px",
            textShadow: `0 4px 14px rgba(0,0,0,.8)`,
          }}
        >
          Patron isim <span style={{ color: YELLOW }}>development</span> tekil.
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 8 — AVCI REFLEKSİ --------------------
function Scene8({ frame }) {
  const inAnim = pop(frame, 0, 10);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", padding: "0 40px" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          opacity: inAnim,
          transform: `scale(${0.85 + 0.15 * inAnim})`,
        }}
      >
        <StepLabel color={RED}>AVCI REFLEKSİ</StepLabel>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 42,
            color: YELLOW,
            textAlign: "center",
            lineHeight: 1.4,
            textShadow: `0 0 24px ${YELLOW}`,
          }}
        >
          OF GÖR → FİİLİ BUL →{"\n"}SOLA DÖN → PATRON İSMİ BUL → AVLA
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 9 — FINAL BRAND --------------------
function Scene9({ frame }) {
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
      </div>
    </AbsoluteFill>
  );
}

export const Master01OfTuzagiReel = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* SFX + narasyon */}
      <Sequence from={STARTS[0]} durationInFrames={SCENE_FRAMES[0]}>
        <Audio src={staticFile("of-tuzagi/siren.mp3")} />
        <Sequence from={2}>
          <Audio src={staticFile("master-01/l1_hook.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[1]} durationInFrames={SCENE_FRAMES[1]}>
        <Sequence from={4}>
          <Audio src={staticFile("master-01/l2_kural.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[2]} durationInFrames={SCENE_FRAMES[2]}>
        <Sequence from={4}>
          <Audio src={staticFile("master-01/l3_neden.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[3]}>
        <Audio src={staticFile("of-tuzagi/lock.mp3")} />
      </Sequence>
      <Sequence from={STARTS[3]} durationInFrames={SCENE_FRAMES[3]}>
        <Sequence from={4}>
          <Audio src={staticFile("master-01/l4_tuzak.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[4]} durationInFrames={SCENE_FRAMES[4]}>
        <Sequence from={4}>
          <Audio src={staticFile("master-01/l5_ornek.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[5]} durationInFrames={SCENE_FRAMES[5]}>
        <Sequence from={4}>
          <Audio src={staticFile("master-01/l6_soru.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[6]}>
        <Audio src={staticFile("of-tuzagi/hit.mp3")} />
      </Sequence>
      <Sequence from={STARTS[6]} durationInFrames={SCENE_FRAMES[6]}>
        <Sequence from={5}>
          <Audio src={staticFile("master-01/l7_cozum.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[7]} durationInFrames={SCENE_FRAMES[7]}>
        <Sequence from={4}>
          <Audio src={staticFile("master-01/l8_avci.mp3")} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[8]}>
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
      <Sequence from={STARTS[7]} durationInFrames={SCENE_FRAMES[7]}>
        <Scene8 frame={frame - STARTS[7]} />
      </Sequence>
      <Sequence from={STARTS[8]} durationInFrames={SCENE_FRAMES[8]}>
        <Scene9 frame={frame - STARTS[8]} />
      </Sequence>
    </AbsoluteFill>
  );
};
