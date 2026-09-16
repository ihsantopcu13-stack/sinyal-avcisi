// TIKTOK — Buffer kanalı yapılandırılmamışken güvenli SKIP testi.
//
// tiktokYayinlaBuffer() önce videoyu GitHub Release'e yükler (mevcut,
// değişmeyen davranış), SONRA TikTok kanalını arar. Kanal
// bulunamadığında artık THROW ETMİYOR — {skipped:true, reason:"TikTok
// channel not configured"} ile RESOLVE ediyor. run-pipeline.mjs bunu
// Promise.allSettled'da "fulfilled" (rejected DEĞİL) olarak görüyor,
// yani TikTok eksikliği artık process.exitCode'u 1 yapmıyor — diğer
// platformların (YouTube/Instagram) sonucu bundan etkilenmiyor.
//
// Gerçek Buffer/GitHub API'sine hiç istek atılmaz (global.fetch
// stub'lanır). Gerçek out/ dosyalarına DOKUNULMAZ (PIPELINE_OUT_DIR_
// OVERRIDE ile geçici dizin). Gerçek TikTok yayını YOK.

import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(__dirname, "..", "scripts", "upload-tiktok-buffer.mjs");
const RUN_PIPELINE_SOURCE = await readFile(path.join(__dirname, "..", "scripts", "run-pipeline.mjs"), "utf-8");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const tmpDir = await mkdtemp(path.join(tmpdir(), "tiktok-test-"));
process.env.BUFFER_ACCESS_TOKEN = "test-fixture-not-real";
process.env.GITHUB_TOKEN = "test-fixture-not-real";
process.env.GITHUB_REPOSITORY = "test-owner/test-repo";
process.env.PIPELINE_OUT_DIR_OVERRIDE = tmpDir;
delete process.env.BUFFER_TIKTOK_CHANNEL_ID;

const { tiktokYayinlaBuffer } = await import(`${pathToFileURL(SCRIPT_PATH).href}?t=${Date.now()}`);

const FAKE_SENARYO = {
  hook: "test hook",
  soru_en: "Despite the rain, they finished the match.",
  sinyal: "despite",
  soru_tr: "test",
  secenekler_tr: ["a", "b", "c", "d"],
  dogru_index: 1,
  aciklama_tr: "test aciklama",
};

async function fixtureHazirla() {
  await writeFile(path.join(tmpDir, "script.json"), JSON.stringify({ senaryo: FAKE_SENARYO }));
  await writeFile(path.join(tmpDir, "video.mp4"), Buffer.from("fake-video-bytes"));
}
async function sonucOku() {
  return JSON.parse(await readFile(path.join(tmpDir, "tiktok-result.json"), "utf-8"));
}

function fetchStub({ tiktokConnected, mutationError = false }) {
  return async (url, options = {}) => {
    const urlStr = String(url);
    if (urlStr.startsWith("https://api.github.com/repos/")) {
      if (urlStr.includes("/releases/tags/")) {
        return { ok: false, status: 404, text: async () => "not found" };
      }
      if (urlStr.endsWith("/releases") && options.method === "POST") {
        return jsonResponse({ upload_url: "https://uploads.github.com/fake/assets{?name,label}", assets: [] });
      }
      throw new Error(`fetchStub(github): beklenmeyen istek — ${urlStr}`);
    }
    if (urlStr.startsWith("https://uploads.github.com/fake/assets")) {
      return jsonResponse({ browser_download_url: "https://github.com/fake/releases/download/x/video.mp4" });
    }
    if (urlStr === "https://api.buffer.com") {
      const body = JSON.parse(options.body);
      const query = body.query;
      if (query.includes("organizations")) {
        return jsonResponse({ data: { account: { organizations: [{ id: "org1", name: "Org" }] } } });
      }
      if (query.includes("channels(input:")) {
        const channels = tiktokConnected ? [{ id: "tt1", name: "TikTok Hesabı", service: "tiktok" }] : [{ id: "ig1", name: "IG", service: "instagram" }];
        return jsonResponse({ data: { channels } });
      }
      if (query.includes("createPost")) {
        if (mutationError) {
          return jsonResponse({ data: { createPost: { message: "Simulated mutation failure" } } });
        }
        return jsonResponse({
          data: { createPost: { post: { id: "ttPost1", text: "x", dueAt: "2026-01-01T00:00:00.000Z", status: "scheduled" } } },
        });
      }
    }
    throw new Error(`fetchStub: beklenmeyen istek — ${urlStr}`);
  };
}
function jsonResponse(obj) {
  return { ok: true, json: async () => obj };
}

// ---- 7/8) channel ID yok -> SKIPPED + doğru reason ----
{
  await fixtureHazirla();
  globalThis.fetch = fetchStub({ tiktokConnected: false });
  let hataFirladi = false;
  let sonuc;
  try {
    sonuc = await tiktokYayinlaBuffer();
  } catch (e) {
    hataFirladi = true;
  }
  const kayit = await sonucOku();
  kontrol("7) TikTok kanalı yokken tiktokYayinlaBuffer() THROW ETMİYOR", !hataFirladi);
  kontrol("8) Doğru sebep: 'TikTok channel not configured'", sonuc?.skipped === true && sonuc?.reason === "TikTok channel not configured", JSON.stringify(sonuc));
  kontrol("8b) tiktok-result.json'a skip kaydı yazıldı", kayit.skipped === true && kayit.reason === "TikTok channel not configured");
}

// ---- 9/10) pipeline devam ediyor, diğer platform sonucu bozulmuyor (Promise.allSettled simülasyonu) ----
{
  await fixtureHazirla();
  globalThis.fetch = fetchStub({ tiktokConnected: false });
  const sahteYoutube = Promise.resolve({ videoUrl: "https://youtube.com/fake" });
  const sahteInstagram = Promise.resolve({ id: "igPost1", status: "scheduled" });
  const [youtube, instagram, tiktok] = await Promise.allSettled([sahteYoutube, sahteInstagram, tiktokYayinlaBuffer()]);
  kontrol("9) TikTok skip olduğunda pipeline'ın diğer adımları (simüle) etkilenmeden tamamlanıyor", youtube.status === "fulfilled" && instagram.status === "fulfilled" && tiktok.status === "fulfilled");
  kontrol("10) TikTok 'fulfilled' (rejected DEĞİL) döndüğü için process.exitCode=1 tetiklenmiyor — diğer sonuçlar bozulmadı", tiktok.status === "fulfilled" && tiktok.value.skipped === true && youtube.value.videoUrl === "https://youtube.com/fake" && instagram.value.id === "igPost1");
}

// ---- run-pipeline.mjs kaynak kontrolü: rejected/exitCode mantığı TikTok skip'i fatal saymıyor ----
{
  const exitLogicVar = /if \(youtube\.status === "rejected" \|\| instagram\.status === "rejected" \|\| tiktok\.status === "rejected"\) \{\s*\n\s*process\.exitCode = 1;/.test(RUN_PIPELINE_SOURCE);
  kontrol("10b) run-pipeline.mjs sadece 'rejected' durumunda exitCode=1 basıyor (skip artık 'fulfilled' olduğu için buna girmiyor)", exitLogicVar);
}

// ---- 11) channel varsa normal publish yolu korunuyor ----
{
  await fixtureHazirla();
  globalThis.fetch = fetchStub({ tiktokConnected: true });
  const sonuc = await tiktokYayinlaBuffer();
  kontrol("11) TikTok kanalı bağlıyken normal publish çalışıyor (skip yok)", !sonuc.skipped && sonuc.id === "ttPost1", JSON.stringify(sonuc));
}

// ---- 12) gerçek publish/API hatası SKIPPED'e çevrilmiyor ----
{
  await fixtureHazirla();
  globalThis.fetch = fetchStub({ tiktokConnected: true, mutationError: true });
  let hataFirladi = false;
  try {
    await tiktokYayinlaBuffer();
  } catch (e) {
    hataFirladi = true;
  }
  kontrol("12) Kanal bağlı ama mutasyon hatası veriyorsa hâlâ FATAL (skip edilmiyor)", hataFirladi);
}

await rm(tmpDir, { recursive: true, force: true });

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
