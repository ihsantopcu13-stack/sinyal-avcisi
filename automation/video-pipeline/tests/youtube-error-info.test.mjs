// 2026-09-17 "5/30 sınırı" teşhisi: extractYoutubeErrorInfo()'nun
// googleapis/gaxios hata nesnesinden {error, reason, status} alanlarını
// doğru çıkardığını, ve publish-next-master-lesson.mjs /
// retry-failed-master-publishes.mjs'in bunu gerçekten kullandığını
// doğrular. Gerçek Google ağına hiç çıkılmaz — sahte hata nesneleri
// kullanılır.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractYoutubeErrorInfo } from "../scripts/_master-publish-meta.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

// ---- TEST: gerçekte 2026-09-10'da görülen upload-limit hatasıyla birebir aynı şekil ----
{
  const gercekciHata = {
    message: "The user has exceeded the number of videos they may upload.",
    response: {
      status: 400,
      data: {
        error: {
          code: 400,
          message: "The user has exceeded the number of videos they may upload.",
          errors: [{ domain: "youtube.video", reason: "uploadLimitExceeded", message: "The user has exceeded the number of videos they may upload." }],
        },
      },
    },
  };
  const info = extractYoutubeErrorInfo(gercekciHata);
  kontrol("1) error mesajı doğru çıkarılıyor", info.error === "The user has exceeded the number of videos they may upload.");
  kontrol("2) reason doğru çıkarılıyor: uploadLimitExceeded", info.reason === "uploadLimitExceeded");
  kontrol("3) status doğru çıkarılıyor: 400", info.status === 400);
}

// ---- TEST: quotaExceeded ile uploadLimitExceeded birbirinden ayrışıyor ----
{
  const kotaHatasi = {
    message: "The request cannot be completed because you have exceeded your quota.",
    response: {
      status: 403,
      data: { error: { code: 403, errors: [{ domain: "youtube.quota", reason: "quotaExceeded", message: "The request cannot be completed because you have exceeded your quota." }] } },
    },
  };
  const info = extractYoutubeErrorInfo(kotaHatasi);
  kontrol("4) quotaExceeded, uploadLimitExceeded ile karıştırılmıyor", info.reason === "quotaExceeded" && info.reason !== "uploadLimitExceeded");
  kontrol("5) quotaExceeded status'u 403 (uploadLimitExceeded'ın 400'ünden farklı)", info.status === 403);
}

// ---- TEST: eksik/bozuk hata nesneleri crash üretmiyor ----
{
  kontrol("6) undefined err crash üretmiyor", (() => {
    const i = extractYoutubeErrorInfo(undefined);
    return i.error === "Bilinmeyen hata" && i.reason === null && i.status === null;
  })());
  kontrol("7) sadece message olan düz Error nesnesi de çalışıyor (response yok)", (() => {
    const i = extractYoutubeErrorInfo(new Error("ağ hatası"));
    return i.error === "ağ hatası" && i.reason === null && i.status === null;
  })());
  kontrol("8) response.data.error.errors boş dizi olsa crash üretmiyor", (() => {
    const i = extractYoutubeErrorInfo({ message: "x", response: { status: 500, data: { error: { errors: [] } } } });
    return i.reason === null && i.status === 500;
  })());
}

// ---- TEST: dönen nesne SADECE üç alan içeriyor (credential/secret sızıntısı yok) ----
{
  const kirliHata = {
    message: "x",
    response: { status: 400, data: { error: { errors: [{ reason: "uploadLimitExceeded" }] }, client_secret: "SAHTE-ASLA-GERCEK-DEGIL" } },
  };
  const info = extractYoutubeErrorInfo(kirliHata);
  kontrol("9) dönen nesnenin anahtarları TAM OLARAK error/reason/status", JSON.stringify(Object.keys(info).sort()) === JSON.stringify(["error", "reason", "status"]));
  kontrol("10) allowlist dışı alanlar (client_secret) sızmıyor", !JSON.stringify(info).includes("SAHTE-ASLA-GERCEK-DEGIL"));
}

// ---- TEST: publish-next-master-lesson.mjs gerçekten extractYoutubeErrorInfo kullanıyor ----
{
  const src = readFileSync(path.join(ROOT, "scripts", "publish-next-master-lesson.mjs"), "utf-8");
  kontrol("11) extractYoutubeErrorInfo import edilmiş", /import\s*\{[^}]*extractYoutubeErrorInfo[^}]*\}\s*from\s*["']\.\/_master-publish-meta\.mjs["']/.test(src));
  kontrol("12) youtube hata dalında kullanılıyor (artık sadece .message değil)", /extractYoutubeErrorInfo\(ytResult\.reason\)/.test(src));
  kontrol("13) eski shallow desen (sadece error: ytResult.reason?.message) artık YOK", !/\{\s*error:\s*ytResult\.reason\?\.message\s*\}/.test(src));
}

// ---- TEST: retry-failed-master-publishes.mjs de aynı şekilde güncellendi ----
{
  const src = readFileSync(path.join(ROOT, "scripts", "retry-failed-master-publishes.mjs"), "utf-8");
  kontrol("14) extractYoutubeErrorInfo import edilmiş", /import\s*\{[^}]*extractYoutubeErrorInfo[^}]*\}\s*from\s*["']\.\/_master-publish-meta\.mjs["']/.test(src));
  kontrol("15) catch bloğunda kullanılıyor", /extractYoutubeErrorInfo\(e\)/.test(src));
  kontrol("16) erken-çıkış artık reason'ı da kontrol ediyor (sadece regex değil)", /info\.reason === ["']uploadLimitExceeded["']/.test(src));
  kontrol("17) eski shallow desen (sadece error: e.message) youtube dalında artık YOK", !/o\.youtube = \{ error: e\.message \};/.test(src));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
