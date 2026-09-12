// ============================================================
// MASTER VİDEO PAKETİ — senkron altyazı yardımcıları.
// Her narasyon satırı kısa anlamlı öbeklere bölünüyor (kelime kelime
// zıplama YOK), süre karakter say��sına göre orantılı dağıtılıyor
// (gerçek TTS hizalama API'si olmadan makul bir yaklaşım — proje
// genelinde generate-audio.mjs'in satır-bazlı süre yaklaşımıyla
// tutarlı). Gramer sinyali kelimeleri otomatik tespit edilip vurgulanıyor.
// ============================================================

import { interpolate } from "remotion";

// \b JS'te ASCII \w'ye dayanır, Türkçe ö/ü/ğ/ş/ı harflerini "kelime
// karakteri" saymaz — bu yüzden "özne" gibi kelimelerde sınır hiç
// bulunamıyordu. Bunun yerine Unicode-farkında lookaround kullanıyoruz
// (\p{L}/\p{N} = herhangi bir dildeki harf/rakam).
const SIGNAL_RE = new RegExp(
  "(?<![\\p{L}\\p{N}])(" +
    [
      "of", "whose", "although", "despite", "because of", "because", "however",
      "unless", "v-?ing", "v3", "which", "whom", "who", "that", "since", "as",
      "while", "whereas", "even though", "even if", "provided that", "in case",
      "özne", "fiil", "nesne", "patron isim", "patron", "sinyal", "tuzak",
      "doğru cevap", "cevap",
    ].join("|") +
    ")(?![\\p{L}\\p{N}])",
  "giu"
);

// Metni kısa, anlamlı öbeklere böler (nokta/virgül sınırında, uzunsa
// ~4-6 kelimelik parçalara) — tek kelime zıplatma yok.
export function splitIntoCaptionChunks(text) {
  const clauses = text
    .split(/(?<=[.,!?;:])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Daha büyük fontta okunabilir kalması için öbekler küçük tutuluyor
  // (eskiden 5-6 kelime, artık en fazla 3-4 — büyük/kalın caption stiline uygun).
  const chunks = [];
  for (const clause of clauses) {
    const words = clause.split(/\s+/);
    if (words.length <= 4) {
      chunks.push(clause);
      continue;
    }
    for (let i = 0; i < words.length; i += 3) {
      chunks.push(words.slice(i, i + 3).join(" "));
    }
  }
  return chunks.length ? chunks : [text];
}

// Her öbeğe, toplam kare sayısından karakter uzunluğuna orantılı bir
// süre + minimum taban (12 kare ≈ 0.4sn, çok hızlı geçmesin diye) verir.
export function computeChunkTimings(chunks, totalFrames) {
  const MIN_FRAMES = 12;
  const lengths = chunks.map((c) => c.length);
  const totalLen = lengths.reduce((a, b) => a + b, 0) || 1;
  let remaining = totalFrames;
  const raw = lengths.map((len, i) => {
    const isLast = i === lengths.length - 1;
    const f = isLast ? remaining : Math.max(MIN_FRAMES, Math.round((len / totalLen) * totalFrames));
    remaining -= f;
    return f;
  });
  let cursor = 0;
  return raw.map((f) => {
    const start = cursor;
    cursor += f;
    return { start, end: start + f };
  });
}

export function renderWithHighlight(text, color, { uppercase = true } = {}) {
  // text.split(regex-with-1-capture-group) -> [öncesi, YAKALANAN, sonrası, YAKALANAN, ...]
  // yakalanan parçalar HER ZAMAN tek indexte (1,3,5,...) gelir — global
  // regex'i .test() ile tekrar tekrar kullanmak lastIndex state bug'ına
  // yol açtığı için (kaçırılmış eşleşmeler) index pariteye göre ayırıyoruz.
  const parts = text.split(SIGNAL_RE);
  return parts.map((part, i) =>
    i % 2 === 1 && part.length > 0 ? (
      <span key={i} style={{ color, textShadow: `0 0 16px ${color}` }}>
        {uppercase ? part.toLocaleUpperCase("tr-TR") : part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// frame: sahne-relatif kare. text: o sahnenin TAM narasyon metni.
// durationFrames: o narasyonun kapladığı kare sayısı (sahne içindeki
// audio Sequence'ın uzunluğu). accentColor: sinyal kelime rengi.
export function CaptionOverlay({ frame, text, durationFrames, accentColor = "#faff00", top = 150 }) {
  if (!text || !durationFrames) return null;
  const chunks = splitIntoCaptionChunks(text);
  const timings = computeChunkTimings(chunks, durationFrames);
  const idx = timings.findIndex((t) => frame >= t.start && frame < t.end);
  if (idx === -1) return null;

  const { start, end } = timings[idx];
  const local = frame - start;
  const dur = end - start;
  const fadeIn = interpolate(local, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(local, [dur - 5, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = Math.min(fadeIn, dur > 8 ? fadeOut : 1);

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        padding: "0 56px",
        opacity,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontFamily: "sans-serif",
          fontWeight: 900,
          fontSize: 52,
          lineHeight: 1.2,
          color: "#ffffff",
          textAlign: "center",
          textShadow: "0 4px 14px rgba(0,0,0,.95), 0 0 28px rgba(0,0,0,.85)",
          WebkitTextStroke: "2px rgba(0,0,0,.65)",
          background: "rgba(0,0,0,.5)",
          borderRadius: 16,
          padding: "10px 26px",
          boxShadow: "0 4px 18px rgba(0,0,0,.4)",
        }}
      >
        {renderWithHighlight(chunks[idx].toLocaleUpperCase("tr-TR"), accentColor)}
      </div>
    </div>
  );
}
