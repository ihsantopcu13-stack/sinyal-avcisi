// Sabah Listen — panelde her sabah kişiye özel çalışma listesi ve 09:00
// (06:00 UTC) "listen hazır" bildirimi. Ağ çağrısı yok, sadece repo
// dosyalarını okur.

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

const indexHtml = readFileSync(path.join(ROOT, "index.html"), "utf-8");
const vercel = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf-8"));
const cron = readFileSync(path.join(ROOT, "api/cron-streak-risk.mjs"), "utf-8");

kontrol("1) panelde #sabah-kart var", /<div class="sabah-kart" id="sabah-kart"/.test(indexHtml));
for (const fn of ["sabahListesiKur", "sabahListesiYukle", "sabahListesiRender", "sabahMaddeAc"]) {
  kontrol(`2) ${fn} tanımlı`, new RegExp(`function ${fn}\\(`).test(indexHtml));
}
kontrol("3) cevapKaydet listeyi yeniliyor", /cevapSunucuyaSenkronla\(kayit\);\n\s*if\(typeof sabahListesiRender==='function'\)sabahListesiRender\(\);/.test(indexHtml));
kontrol("4) liste günde bir kez saklanıyor (sa_sabah_listesi)", indexHtml.includes("localStorage.setItem('sa_sabah_listesi'"));
kontrol("5) cron vercel.json'da 06:00 UTC", (vercel.crons || []).some((c) => c.path === "/api/cron-streak-risk?tur=sabah" && c.schedule === "0 6 * * *"));
kontrol("6) streak cron'u yerinde", (vercel.crons || []).some((c) => c.path === "/api/cron-streak-risk" && c.schedule === "0 18 * * *"));
kontrol("6b) sabah bildirimi ayrı fonksiyon değil (Hobby 12 sınırı)", !existsSync(path.join(ROOT, "api/cron-sabah-listesi.mjs")));
kontrol("6c) ?tur=sabah dalı streak akışından önce", cron.indexOf("istekTuru(req) === 'sabah'") > 0 && cron.indexOf("istekTuru(req) === 'sabah'") < cron.indexOf("current_streak=gt.0"));
kontrol("7) cron CRON_SECRET doğruluyor", cron.includes("authHeader !== `Bearer ${cronSecret}`"));
kontrol("8) sadece son 7 günde aktif olanlara", cron.includes("last_active_date=gte."));
const payload = (cron.match(/export const SABAH_PAYLOAD = \{([\s\S]*?)\};/) || [])[1] || "";
kontrol("9) bildirim metni var ve emoji yok", payload.includes("title:") && !/\p{Extended_Pictographic}/u.test(payload));

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz) process.exit(1);
