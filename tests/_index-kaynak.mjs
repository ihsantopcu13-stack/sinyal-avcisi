// Ana sayfanın büyük betiği index.html'den js/ana.js'e taşındı (ayrı dosya
// tarayıcıda önbelleğe girsin diye). Testler hâlâ "tek index.html" metni
// üzerinde regex/çıkarma yapıyor; bu yardımcı, js/ana.js'i eski yerine
// <script>…</script> olarak geri koyup birleşik kaynağı döndürür. Böylece
// testler taşınmadan önceki metni birebir görür.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ANA_BETIK_ETIKETI = '<script src="/js/ana.js"></script>';

export function indexKaynak(kok = ROOT) {
  const html = readFileSync(path.join(kok, "index.html"), "utf-8");
  if (!html.includes(ANA_BETIK_ETIKETI)) return html;
  const js = readFileSync(path.join(kok, "js", "ana.js"), "utf-8");
  return html.replace(ANA_BETIK_ETIKETI, () => "<script>\n" + js + "</script>");
}
