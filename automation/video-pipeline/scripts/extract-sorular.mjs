// ============================================================
// TEK SEFERLİK/PERİYODİK ARAÇ — sitedeki (index.html) gerçek Sinyal Lab
// soru havuzunu (SL_HAVUZ) video pipeline'ın kullanabileceği temiz bir
// JSON dosyasına çevirir.
// ============================================================
// Çalıştırma: node scripts/extract-sorular.mjs
// Çıktı: data/sorular.json
//
// Siteye yeni sorular eklendiğinde bu script tekrar çalıştırılıp
// data/sorular.json güncellenmelidir.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_HTML = path.join(__dirname, "..", "..", "..", "index.html");
const OUT_FILE = path.join(__dirname, "..", "data", "sorular.json");

function etiketleriTemizle(html) {
  return html
    .replace(/<[^>]+>/g, "") // <span ...>...</span> etiketlerini kaldır, iç metni bırak
    .replace(/^"|"$/g, "") // baştaki/sondaki tırnak işaretleri
    .trim();
}

async function main() {
  const html = await readFile(INDEX_HTML, "utf-8");
  const startMarker = "const SL_HAVUZ=[";
  const startIdx = html.indexOf(startMarker);
  if (startIdx === -1) throw new Error("SL_HAVUZ bulunamadı — index.html değişmiş olabilir.");

  const endIdx = html.indexOf("\n];", startIdx);
  if (endIdx === -1) throw new Error("SL_HAVUZ dizisinin sonu bulunamadı.");

  const arrayLiteral = html.slice(startIdx + "const SL_HAVUZ=".length, endIdx + 2);
  // Kaynak, güvendiğimiz kendi site dosyamız — bir JS dizi literali, JSON değil
  // (tek tırnak, HTML içeren string'ler içeriyor), bu yüzden Function ile
  // değerlendiriyoruz.
  const havuz = new Function(`return ${arrayLiteral}`)();

  const sorular = havuz.map((s) => {
    const sinyalEslesme = s.sent.match(/class="s-sig"[^>]*>([^<]+)</);
    return {
      kategori: s.eye,
      soru_en: etiketleriTemizle(s.sent),
      sinyal: sinyalEslesme ? sinyalEslesme[1] : null,
      soru_tr: s.q,
      secenekler_tr: s.opts,
      dogru_index: s.ans,
      aciklama_tr: s.fb,
    };
  });

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(sorular, null, 2), "utf-8");
  console.log(`${sorular.length} soru yazıldı: ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
