import { AbsoluteFill, getInputProps } from "remotion";

// Özel YouTube/Instagram kapak görseli — video içeriğinin marka diliyle
// (koyu zemin + neon kırmızı/sarı/yeşil, crosshair teması) tutarlı, tek
// karelik bir "Still" render. Otomatik seçilen rastgele video karesi yerine
// tıklanma oranını artırmak için üretildi (bkz. kullanıcı isteği: CTR).
const BG = "#05060a";
const RED = "#ff2d55";
const YELLOW = "#faff00";
const WHITE = "#ffffff";

export function Thumbnail(props) {
  const topic = props?.topic || getInputProps()?.topic || "SİNYAL";
  const sub = props?.sub || getInputProps()?.sub || "YDS / YÖKDİL";

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 42%, #14060a 0%, ${BG} 65%)`,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: 130, marginBottom: 18 }}>🎯</div>
      <div
        style={{
          fontFamily: "sans-serif",
          fontWeight: 900,
          fontSize: 108,
          lineHeight: 1.05,
          color: YELLOW,
          textAlign: "center",
          textShadow: `0 0 50px ${YELLOW}, 0 8px 20px rgba(0,0,0,.8)`,
          padding: "0 60px",
        }}
      >
        {topic.toLocaleUpperCase("tr-TR")}
      </div>
      <div
        style={{
          marginTop: 30,
          fontFamily: "sans-serif",
          fontWeight: 800,
          fontSize: 44,
          color: WHITE,
          textShadow: "0 4px 14px rgba(0,0,0,.9)",
        }}
      >
        {sub}
      </div>
      <div
        style={{
          marginTop: 14,
          fontFamily: "sans-serif",
          fontWeight: 800,
          fontSize: 34,
          color: RED,
          textShadow: `0 0 20px ${RED}`,
          letterSpacing: 2,
        }}
      >
        SİNYAL AVCISI
      </div>
    </AbsoluteFill>
  );
}
