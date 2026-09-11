import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  getInputProps,
} from "remotion";
import { CaptionOverlay, computeChunkTimings } from "./captionUtils.jsx";

// ============================================================
// SİNYAL AVCISI — MASTER VİDEO PAKETİ — genel/parametrik ders şablonu.
// #1 OF TUZAĞI'nda (Master01OfTuzagiReel.jsx, artık arşiv) elle kurulan
// 9 sahnelik yapı buraya veri-odaklı olarak taşındı — #2-#30 bu tek
// component + data/master-lessons.mjs'teki lesson objeleriyle üretiliyor.
// Görsel kimlik (siyah zemin + neon kırmızı/sarı/yeşil, crosshair),
// öğretim akışı (HOOK→KURAL→NEDEN→ÖSYM TUZAĞI→ÖRNEK→MİNİ SORU→3-2-1→
// CEVAP VE ÇÖZÜM→AVCI REFLEKSİ→marka) ve seslendirme (Murat/ElevenLabs)
// #1'de onaylanan haliyle korunuyor.
// ============================================================

const FPS = 30;
// 2026-09-11 renk revizyonu (önizleme onayı bekliyor) — premium/akademik
// kimlik: nötr koyu lacivert-antrasit zemin, kontrollü altın/kırmızı/yeşil
// bilgi hiyerarşisi. Eski neon (#ff1744 pembe-kırmızı, #faff00 asit sarı,
// #39ff14 neon yeşil) tonları KALDIRILDI.
const BG = "#05070d";
const RED = "#dc2626";
const YELLOW = "#eab308";
const GREEN = "#22c55e";
const WHITE = "#f4f3ef";
const COLORS = { plain: WHITE, verb: YELLOW, trap: RED, good: GREEN };

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
  return <div style={{ position: "absolute", top: 56, right: 44, fontSize: 40, opacity: 0.85 }}>🎯</div>;
}

// -------------------- SCENE 1 — HOOK --------------------
function Scene1({ frame, lesson }) {
  const shake = frame < 8 ? Math.sin(frame * 3) * (8 - frame) : 0;
  const scale = pop(frame, 0, 10);
  const flash = interpolate(frame, [0, 3, 8], [1, 0.15, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", padding: "0 40px" }}>
      <AbsoluteFill style={{ background: RED, opacity: flash * 0.5 }} />
      <div
        style={{
          fontFamily: "sans-serif",
          fontWeight: 900,
          fontSize: 78,
          color: RED,
          letterSpacing: 1,
          textAlign: "center",
          transform: `translateX(${shake}px) scale(${0.6 + 0.4 * scale})`,
          textShadow: `0 0 40px ${RED}, 0 0 80px ${RED}88`,
        }}
      >
        {lesson.hookEmoji || "⚠"} {lesson.hookTitle}
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 2 — KURAL --------------------
function Scene2({ frame, lesson }) {
  const lineColors = [WHITE, YELLOW, GREEN, GREEN];
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", padding: "0 60px" }}>
      <CrosshairCorner />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, textAlign: "center" }}>
        <StepLabel color={GREEN}>KURAL</StepLabel>
        {lesson.kuralLines.map((line, i) => {
          const opIn = pop(frame, i * 22, 14);
          return (
            <div key={i} style={{ opacity: opIn, transform: `translateY(${(1 - opIn) * 16}px)` }}>
              <Word color={lineColors[i % lineColors.length]} size={38}>
                {line}
              </Word>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 3 — NEDEN --------------------
function Scene3({ frame, lesson }) {
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
            fontSize: 42,
            color: YELLOW,
            border: `3px solid ${YELLOW}`,
            borderRadius: 14,
            padding: "12px 26px",
            background: YELLOW + "18",
            textShadow: `0 0 20px ${YELLOW}`,
          }}
        >
          {lesson.nedenBadge}
        </div>
        <div style={{ opacity: textIn, transform: `translateY(${(1 - textIn) * 16}px)` }}>
          <Word color={WHITE} size={36}>
            {lesson.nedenText}
          </Word>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 4 — ÖSYM TUZAĞI --------------------
function Scene4({ frame, lesson }) {
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
            fontSize: 52,
            color: RED,
            transform: `translateX(${shake}px) scale(${0.7 + 0.3 * scale})`,
            textShadow: `0 0 30px ${RED}`,
          }}
        >
          🚨 ÖSYM TUZAĞI
        </div>
        <div style={{ opacity: subIn, transform: `translateY(${(1 - subIn) * 16}px)` }}>
          <Word color={WHITE} size={34}>
            {lesson.tuzakText}
          </Word>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 5 — ÖRNEK --------------------
function ExampleSentence({ parts }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, textAlign: "center" }}>
      {parts.map((p, i) => {
        const style = p.style || "plain";
        const isHighlight = style === "verb" || style === "trap" || style === "good";
        const color = COLORS[style] || WHITE;
        return (
          <span
            key={i}
            style={{
              fontFamily: "sans-serif",
              fontWeight: isHighlight ? 900 : 800,
              fontSize: 40,
              color,
              background: isHighlight ? color + "22" : "transparent",
              border: isHighlight ? `3px solid ${color}` : "none",
              borderRadius: isHighlight ? 10 : 0,
              padding: isHighlight ? "2px 10px" : 0,
              textShadow: isHighlight ? `0 0 18px ${color}` : "none",
            }}
          >
            {p.text}
          </span>
        );
      })}
    </div>
  );
}

function Scene5({ frame, lesson, exampleRevealAt, breakdownRevealAt }) {
  const revealIn = pop(frame, exampleRevealAt, 14);
  const breakdownIn = pop(frame, breakdownRevealAt, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", padding: "0 44px" }}>
      <StepLabel color={GREEN}>ÖRNEK</StepLabel>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, marginTop: 10 }}>
        {lesson.examples.map((ex, i) => (
          <div key={i} style={{ opacity: i === 0 ? 1 : revealIn, transform: i === 0 ? "none" : `translateY(${(1 - revealIn) * 14}px)` }}>
            <ExampleSentence parts={ex.parts} />
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, fontFamily: "sans-serif", fontWeight: 800, fontSize: 30 }}>
          {lesson.breakdown.map((b, i) => (
            <div
              key={i}
              style={{
                color: b.color,
                opacity: breakdownIn,
                transform: `translateX(${(1 - breakdownIn) * -20}px)`,
                textShadow: `0 0 14px ${b.color}`,
                textAlign: "center",
              }}
            >
              {b.text}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 6 — MİNİ SORU + 3-2-1 --------------------
function Scene6({ frame, lesson, countdownStart }) {
  const cardIn = pop(frame, 0, 14);
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
          width: 820,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          marginTop: 14,
          boxShadow: `0 0 40px ${RED}55`,
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontWeight: 800, fontSize: 30, color: WHITE, textAlign: "center" }}>
          {lesson.question.sentence}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontFamily: "sans-serif", fontWeight: 700, fontSize: 27, color: YELLOW }}>
          {lesson.question.options.map((o, i) => (
            <div key={i}>{o}</div>
          ))}
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

// -------------------- SCENE 7 — ŞIKLARI ELE + CEVAP VE ÇÖZÜM --------------------
// Yanlış şıklar tek tek elenir ("A olmaz çünkü...") sonra doğru cevap
// yeşille vurgulanır — 2026-09-11 içerik standardı (bkz. proje hafızası:
// "şıkları nasıl eleyeceğim" / "yanlış seçenekler neden yanlış" maddeleri).
// narration.cozum tek bir ses dosyasında tüm elemeleri + doğru cevabı art
// arda anlatıyor; ekrandaki geçişler bu sesle computeChunkTimings ile
// orantılı senkronlanıyor (captionUtils.jsx'teki aynı mantık).
function optionFullText(lesson, letter) {
  const found = (lesson.question?.options || []).find((o) => o.trim().startsWith(`${letter})`));
  return found || `${letter})`;
}

function Scene7({ frame, lesson, durationFrames }) {
  const eliminations = lesson.eliminations || [];
  const chunks = [...eliminations.map((e) => `${e.option}: ${e.text}`), lesson.cozumText || ""];
  const timings = durationFrames ? computeChunkTimings(chunks, durationFrames) : null;
  const idx = timings ? timings.findIndex((t) => frame >= t.start && frame < t.end) : -1;
  const activeIdx = idx === -1 ? chunks.length - 1 : idx;
  const isFinal = activeIdx >= eliminations.length;
  const localStart = timings?.[activeIdx]?.start ?? 0;
  const local = frame - localStart;

  if (!isFinal && eliminations.length > 0) {
    const elim = eliminations[activeIdx];
    const inAnim = pop(local, 0, 11);
    return (
      <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", padding: "0 44px" }}>
        <StepLabel color={RED}>ŞIKLARI ELE</StepLabel>
        <div
          style={{
            marginTop: 10,
            opacity: inAnim,
            transform: `translateX(${(1 - inAnim) * -24}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            maxWidth: 900,
          }}
        >
          <div
            style={{
              fontFamily: "sans-serif",
              fontWeight: 900,
              fontSize: 34,
              color: RED,
              textAlign: "center",
              textShadow: `0 0 20px ${RED}`,
            }}
          >
            ✕ {optionFullText(lesson, elim.option)}
          </div>
          <div
            style={{
              fontFamily: "sans-serif",
              fontWeight: 700,
              fontSize: 28,
              color: WHITE,
              textAlign: "center",
              textShadow: "0 4px 14px rgba(0,0,0,.8)",
            }}
          >
            {elim.text}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  const hitScale = pop(local, 0, 9);
  const l1 = pop(local, 14, 14);
  return (
    <AbsoluteFill style={{ background: BG, justifyContent: "center", alignItems: "center", padding: "0 40px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div
          style={{
            fontFamily: "sans-serif",
            fontWeight: 900,
            fontSize: 52,
            color: GREEN,
            textAlign: "center",
            transform: `scale(${0.5 + 0.5 * hitScale})`,
            textShadow: `0 0 30px ${GREEN}`,
          }}
        >
          🎯 {lesson.answerLabel}
        </div>
        <div
          style={{
            opacity: l1,
            transform: `translateY(${(1 - l1) * 16}px)`,
            fontFamily: "sans-serif",
            fontWeight: 700,
            fontSize: 30,
            color: WHITE,
            textAlign: "center",
            padding: "0 30px",
            textShadow: `0 4px 14px rgba(0,0,0,.8)`,
          }}
        >
          {lesson.cozumText}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// -------------------- SCENE 8 — AVCI REFLEKSİ --------------------
function Scene8({ frame, lesson }) {
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
            fontSize: 38,
            color: YELLOW,
            textAlign: "center",
            lineHeight: 1.4,
            textShadow: `0 0 24px ${YELLOW}`,
            whiteSpace: "pre-line",
          }}
        >
          {lesson.avciKodu}
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
        <div style={{ fontFamily: "sans-serif", fontWeight: 700, fontSize: 26, color: GREEN, marginTop: 8 }}>Tam ders ücretsiz → sinyal-avcisi.com</div>
      </div>
    </AbsoluteFill>
  );
}

function computeStarts(sceneFrames) {
  return sceneFrames.reduce((acc, d, i) => [...acc, (acc[i - 1] ?? 0) + (i === 0 ? 0 : sceneFrames[i - 1])], []);
}

export function totalFramesFor(lesson) {
  return lesson.sceneFrames.reduce((a, b) => a + b, 0);
}

export const MasterLessonReel = (props) => {
  const frame = useCurrentFrame();
  const lesson = props?.lesson || getInputProps().lesson;
  const SCENE_FRAMES = lesson.sceneFrames;
  const STARTS = computeStarts(SCENE_FRAMES);
  const af = (name) => staticFile(`${lesson.audioFolder}/${name}.mp3`);
  const [a1, a2, a3, a4, a5, a6, a7, a8] = lesson.audioFiles;

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* SFX + narasyon */}
      <Sequence from={STARTS[0]} durationInFrames={SCENE_FRAMES[0]}>
        <Audio src={staticFile("of-tuzagi/siren.mp3")} />
        <Sequence from={2}>
          <Audio src={af(a1)} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[1]} durationInFrames={SCENE_FRAMES[1]}>
        <Sequence from={4}>
          <Audio src={af(a2)} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[2]} durationInFrames={SCENE_FRAMES[2]}>
        <Sequence from={4}>
          <Audio src={af(a3)} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[3]}>
        <Audio src={staticFile("of-tuzagi/lock.mp3")} />
      </Sequence>
      <Sequence from={STARTS[3]} durationInFrames={SCENE_FRAMES[3]}>
        <Sequence from={4}>
          <Audio src={af(a4)} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[4]} durationInFrames={SCENE_FRAMES[4]}>
        <Sequence from={4}>
          <Audio src={af(a5)} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[5]} durationInFrames={SCENE_FRAMES[5]}>
        <Sequence from={4}>
          <Audio src={af(a6)} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[6]}>
        <Audio src={staticFile("of-tuzagi/hit.mp3")} />
      </Sequence>
      <Sequence from={STARTS[6]} durationInFrames={SCENE_FRAMES[6]}>
        <Sequence from={5}>
          <Audio src={af(a7)} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[7]} durationInFrames={SCENE_FRAMES[7]}>
        <Sequence from={4}>
          <Audio src={af(a8)} />
        </Sequence>
      </Sequence>
      <Sequence from={STARTS[8]}>
        <Audio src={staticFile("of-tuzagi/hit.mp3")} />
      </Sequence>

      {/* Görsel sahneler */}
      <Sequence from={STARTS[0]} durationInFrames={SCENE_FRAMES[0]}>
        <Scene1 frame={frame - STARTS[0]} lesson={lesson} />
      </Sequence>
      <Sequence from={STARTS[1]} durationInFrames={SCENE_FRAMES[1]}>
        <Scene2 frame={frame - STARTS[1]} lesson={lesson} />
      </Sequence>
      <Sequence from={STARTS[2]} durationInFrames={SCENE_FRAMES[2]}>
        <Scene3 frame={frame - STARTS[2]} lesson={lesson} />
      </Sequence>
      <Sequence from={STARTS[3]} durationInFrames={SCENE_FRAMES[3]}>
        <Scene4 frame={frame - STARTS[3]} lesson={lesson} />
      </Sequence>
      <Sequence from={STARTS[4]} durationInFrames={SCENE_FRAMES[4]}>
        <Scene5
          frame={frame - STARTS[4]}
          lesson={lesson}
          exampleRevealAt={lesson.exampleRevealAt ?? 40}
          breakdownRevealAt={lesson.breakdownRevealAt ?? Math.round(SCENE_FRAMES[4] * 0.55)}
        />
      </Sequence>
      <Sequence from={STARTS[5]} durationInFrames={SCENE_FRAMES[5]}>
        <Scene6 frame={frame - STARTS[5]} lesson={lesson} countdownStart={lesson.countdownStart} />
      </Sequence>
      <Sequence from={STARTS[6]} durationInFrames={SCENE_FRAMES[6]}>
        <Scene7 frame={frame - STARTS[6]} lesson={lesson} durationFrames={lesson.audioFrames.cozum} />
      </Sequence>
      <Sequence from={STARTS[7]} durationInFrames={SCENE_FRAMES[7]}>
        <Scene8 frame={frame - STARTS[7]} lesson={lesson} />
      </Sequence>
      <Sequence from={STARTS[8]} durationInFrames={SCENE_FRAMES[8]}>
        <Scene9 frame={frame - STARTS[8]} />
      </Sequence>

      {/* Altyazılar — narasyonla senkron, kısa öbekler, sinyal kelime
          vurgulu (bkz. captionUtils.jsx). Her narasyon Sequence'ının
          "from" ofsetiyle birebir hizalı, mevcut soru/şık metnini
          engellemesin diye üst güvenli alanda (top). */}
      {lesson.audioFrames && (
        <>
          <CaptionOverlay frame={frame - STARTS[0] - 2} text={lesson.narration.hook} durationFrames={lesson.audioFrames.hook} accentColor={RED} top={520} />
          <CaptionOverlay frame={frame - STARTS[1] - 4} text={lesson.narration.kural} durationFrames={lesson.audioFrames.kural} accentColor={GREEN} top={150} />
          <CaptionOverlay frame={frame - STARTS[2] - 4} text={lesson.narration.neden} durationFrames={lesson.audioFrames.neden} accentColor={YELLOW} top={150} />
          <CaptionOverlay frame={frame - STARTS[3] - 4} text={lesson.narration.tuzak} durationFrames={lesson.audioFrames.tuzak} accentColor={RED} top={150} />
          <CaptionOverlay frame={frame - STARTS[4] - 4} text={lesson.narration.ornek} durationFrames={lesson.audioFrames.ornek} accentColor={YELLOW} top={130} />
          <CaptionOverlay frame={frame - STARTS[5] - 4} text={lesson.narration.soru} durationFrames={lesson.audioFrames.soru} accentColor={YELLOW} top={150} />
          {/* Şıkları eleme sahnesi (bkz. Scene7) kendi senkronlu metin
              gösterimini zaten sağlıyor — üstte genel CaptionOverlay ile
              çakışıp iki farklı senkronsuz metin göstermemesi için
              eliminations olan derslerde (yeni içerik standardı) atlanır. */}
          {!(lesson.eliminations && lesson.eliminations.length > 0) && (
            <CaptionOverlay frame={frame - STARTS[6] - 5} text={lesson.narration.cozum} durationFrames={lesson.audioFrames.cozum} accentColor={GREEN} top={150} />
          )}
          <CaptionOverlay frame={frame - STARTS[7] - 4} text={lesson.narration.avci} durationFrames={lesson.audioFrames.avci} accentColor={RED} top={150} />
        </>
      )}
    </AbsoluteFill>
  );
};
