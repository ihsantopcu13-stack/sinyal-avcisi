// Ana sayfa footer'ındaki "Rehberler" bağlantı grubu — Google'ın statik
// rehber sayfalarını ana sayfadan keşfedebilmesi için bağlantıların JS'e
// bağlı olmayan gerçek <a href> olarak footer'da durduğunu doğrular.
// Ağ çağrısı yok, sadece repo dosyalarını okur.

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const REHBERLER = ["yds-cikmis-sorular", "yokdil-sinyal-kelimeler", "yds-sinav-teknikleri", "ucretsiz-rehber", "hedef-rota"];
const indexHtml = readFileSync(path.join(ROOT, "index.html"), "utf-8");
const footerler = indexHtml.match(/<footer>[\s\S]*?<\/footer>/g) || [];
const footer = footerler[0] || "";

kontrol("index.html'de tek <footer> var", footerler.length === 1, `${footerler.length} adet`);
kontrol("footer'da Rehberler nav'ı var", /<nav aria-label="Rehberler"/.test(footer));

for (const ad of REHBERLER) {
  const etiket = footer.match(new RegExp(`<a href="/${ad}"[^>]*>([^<]+)</a>`));
  kontrol(`footer: /${ad} gerçek <a href> bağlantısı`, !!etiket);
  kontrol(`footer: /${ad} JS'e bağlı değil`, !!etiket && !/onclick|javascript:/i.test(etiket[0]));
  kontrol(`footer: /${ad} anlamlı anchor metni`, !!etiket && etiket[1].trim().split(/\s+/).length >= 2, etiket && etiket[1]);
  kontrol(`/${ad} hedef dosyası repoda mevcut`, existsSync(path.join(ROOT, `${ad}.html`)));
}

// ---- TEST: hover'dan çıkınca bağlantı rengi başlangıç rengine (.62) döner ----
{
  const donusler = [...footer.matchAll(/onmouseout="this\.style\.color='([^']+)'"/g)].map((m) => m[1]);
  kontrol(
    "footer: onmouseout rengi başlangıç rengiyle aynı",
    donusler.length > 0 && donusler.every((r) => r === "rgba(236,231,218,.62)"),
    donusler.join(", ")
  );
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
