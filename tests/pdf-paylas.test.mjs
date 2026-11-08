// PDF rehber paneli (/sinyal-soru, /sinyal-kartlari): indirme şartsız,
// paylaşım bağlantıları doğru, iki sayfaya da bağlı. Ağ çağrısı yok.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let toplam = 0, basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++; if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}
const js = readFileSync(path.join(ROOT, "assets/modules/pdf-paylas.js"), "utf-8");
const ctx = {}; vm.createContext(ctx); vm.runInContext(js, ctx);
const P = ctx.PdfPaylas;
kontrol("modül dışa verilir", !!P && typeof P.baslat === "function");
kontrol("PDF dosyası var", existsSync(path.join(ROOT, P.PDF.slice(1))), P.PDF);
const b = P.paylasimBilgisi({ querySelector: () => ({ href: "https://sinyal-avcisi.com/sinyal-soru" }) });
kontrol("WhatsApp bağlantısı", b.whatsapp.startsWith("https://wa.me/?text=") && decodeURIComponent(b.whatsapp).includes("https://sinyal-avcisi.com/sinyal-soru"));
kontrol("Telegram bağlantısı", b.telegram.startsWith("https://t.me/share/url?url=") && b.telegram.includes(encodeURIComponent("https://sinyal-avcisi.com/sinyal-soru")));
kontrol("kanonik yoksa site adresi", P.paylasimBilgisi({ querySelector: () => null }).url === "https://sinyal-avcisi.com");
kontrol("indirme paylaşıma bağlı değil (kilit yok)", !/pdf_unlocked|aria-disabled|kilitli/.test(js));
kontrol("şartsız metni var", js.includes("Kayıt ya da paylaşım şartı yok"));
kontrol("sunucuya veri gönderilmez", !/fetch\(|XMLHttpRequest|sendBeacon/.test(js));
for (const f of ["sinyal-soru.html", "sinyal-kartlari.html"]) {
  const h = readFileSync(path.join(ROOT, f), "utf-8");
  kontrol(f + ": panel kabı ve modül", h.includes('<div id="pdf-paylas"></div>') && h.includes("/assets/modules/pdf-paylas.js"));
  kontrol(f + ": modül kaptan sonra yüklenir", h.indexOf('id="pdf-paylas"') < h.indexOf("/assets/modules/pdf-paylas.js"));
}
const css = readFileSync(path.join(ROOT, "assets/sinyal-tema.css"), "utf-8");
kontrol("stiller ortak temada", css.includes(".pp-modal") && css.includes(".pp-banner"));
console.log(`\npdf-paylas: ${toplam - basarisiz}/${toplam} geçti`);
if (basarisiz) process.exit(1);
