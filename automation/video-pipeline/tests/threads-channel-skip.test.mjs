// THREADS — Buffer kanalı bağlı değilken güvenli SKIP testi.
//
// Threads kuyruğu marketing-queue'nun aksine STATE'SİZ (günlük içerik
// tarih bazlı rotasyonla üretiliyor, ilerletilecek bir index yok) —
// asıl sorun her gün job'un "Fatal:" ile exit 1 vermesiydi. Bu test
// findThreadsChannel() bulamadığında threadsYayinla()'nın artık THROW
// ETMEDİĞİNİ, {skipped:true, reason:"Threads channel not configured"}
// ile RESOLVE ettiğini (CLI çalıştırmasında bu, exit 0 anlamına gelir)
// doğruluyor. Kanalın BAŞKA bir sebeple bulunamamasını (gerçek API
// hatası) SKIPPED'e çevirmediğimizi de doğruluyor.
//
// Gerçek Buffer API'sine hiç istek atılmaz (global.fetch stub'lanır).
// Gerçek out/ dosyalarına DOKUNULMAZ — PIPELINE_OUT_DIR_OVERRIDE ile
// geçici bir dizin kullanılır. Gerçek Threads yayını YOK.

import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(__dirname, "..", "scripts", "publish-threads.mjs");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const tmpDir = await mkdtemp(path.join(tmpdir(), "threads-test-"));
process.env.BUFFER_ACCESS_TOKEN = "test-fixture-not-real";
process.env.PIPELINE_OUT_DIR_OVERRIDE = tmpDir;

const { threadsYayinla } = await import(`${pathToFileURL(SCRIPT_PATH).href}?t=${Date.now()}`);

async function threadsPostYaz(metin = "Test sinyal ipucu metni.") {
  await writeFile(path.join(tmpDir, "threads-post.json"), JSON.stringify({ metin }));
}
async function sonucOku() {
  return JSON.parse(await readFile(path.join(tmpDir, "threads-result.json"), "utf-8"));
}

function fetchStub({ threadsConnected, mutationError = false, accountError = false }) {
  return async (url, options = {}) => {
    const urlStr = String(url);
    if (urlStr === "https://api.buffer.com") {
      if (accountError) {
        return { ok: false, status: 500, json: async () => ({ errors: [{ message: "Simulated 500" }] }) };
      }
      const body = JSON.parse(options.body);
      const query = body.query;
      if (query.includes("organizations")) {
        return jsonResponse({ data: { account: { organizations: [{ id: "org1" }] } } });
      }
      if (query.includes("channels(input:")) {
        const channels = threadsConnected ? [{ id: "th1", name: "Threads Hesabı", service: "threads" }] : [{ id: "ig1", name: "IG", service: "instagram" }];
        return jsonResponse({ data: { channels } });
      }
      if (query.includes("createPost")) {
        if (mutationError) {
          return jsonResponse({ data: { createPost: { message: "Simulated mutation failure" } } });
        }
        return jsonResponse({
          data: { createPost: { post: { id: "postABC", text: "x", dueAt: "2026-01-01T00:00:00.000Z", status: "scheduled" } } },
        });
      }
    }
    throw new Error(`fetchStub: beklenmeyen istek — ${urlStr}`);
  };
}
function jsonResponse(obj) {
  return { ok: true, json: async () => obj };
}

// ---- 1/2) Threads kanalı BAĞLI DEĞİL -> SKIPPED + doğru reason, job fatal olmuyor ----
{
  await threadsPostYaz();
  globalThis.fetch = fetchStub({ threadsConnected: false });
  let hataFirladi = false;
  let sonuc;
  try {
    sonuc = await threadsYayinla();
  } catch (e) {
    hataFirladi = true;
  }
  const kayit = await sonucOku();
  kontrol("1) Threads kanalı yokken threadsYayinla() THROW ETMİYOR (job fatal olmuyor)", !hataFirladi);
  kontrol("2) Doğru sebep: 'Threads channel not configured'", sonuc?.skipped === true && sonuc?.reason === "Threads channel not configured", JSON.stringify(sonuc));
  kontrol("2b) threads-result.json'a skip kaydı yazıldı", kayit.skipped === true && kayit.reason === "Threads channel not configured", JSON.stringify(kayit));
}

// ---- 3) queue/state kavramı yok (stateless) — bir sonraki günün çalışması bu skip'ten etkilenmez ----
// (Threads'in kendi bir ilerleme index'i yok, bu yüzden "ilerleme" testi
// yerine: skip'ten SONRA script'in tekrar çağrılabilir/tekrar deterministik
// davrandığını doğruluyoruz — kalıcı bir kilitlenme YOK.)
{
  await threadsPostYaz();
  globalThis.fetch = fetchStub({ threadsConnected: false });
  const sonuc2 = await threadsYayinla();
  kontrol("3) Skip sonrası tekrar çalıştırıldığında yine güvenli şekilde SKIPPED dönüyor (kilitlenme yok)", sonuc2.skipped === true);
}

// ---- 5) Threads kanalı BAĞLI -> normal publish yolu korunuyor ----
{
  await threadsPostYaz();
  globalThis.fetch = fetchStub({ threadsConnected: true });
  const sonuc = await threadsYayinla();
  kontrol("5) Threads kanalı bağlıyken normal publish çalışıyor (skip yok)", !sonuc.skipped && sonuc.id === "postABC", JSON.stringify(sonuc));
}

// ---- 6) Gerçek API hatası (mutasyon hatası) SKIPPED'e çevrilmiyor ----
{
  await threadsPostYaz();
  globalThis.fetch = fetchStub({ threadsConnected: true, mutationError: true });
  let hataFirladi = false;
  try {
    await threadsYayinla();
  } catch (e) {
    hataFirladi = true;
  }
  kontrol("6a) Kanal bağlı ama mutasyon hatası veriyorsa hâlâ FATAL (skip edilmiyor)", hataFirladi);
}
{
  await threadsPostYaz();
  globalThis.fetch = fetchStub({ threadsConnected: false, accountError: true });
  let hataFirladi = false;
  try {
    await threadsYayinla();
  } catch (e) {
    hataFirladi = true;
  }
  kontrol("6b) Buffer hesap sorgusu 500 dönerse hâlâ FATAL (channel-not-configured ile karıştırılmıyor)", hataFirladi);
}

await rm(tmpDir, { recursive: true, force: true });

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
