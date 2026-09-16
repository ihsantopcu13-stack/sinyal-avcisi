// PAZARLAMA KUYRUĞU — LinkedIn "kanal bağlı değil" güvenli SKIP testi.
//
// LinkedIn Buffer kanalı bağlı olmadığında publish-next-marketing-asset.mjs
// artık job'u Fatal/failed yapmıyor, öğeyi "skipped" olarak state'e
// yazıp kuyruğu güvenle bir sonraki öğeye ilerletiyor. Bu SADECE
// linkedin_post öğeleri + "kanal hiç bağlanmamış" durumu için geçerli —
// Instagram'ın veya LinkedIn'in BAŞKA bir hatasının (örn. bozuk mutasyon)
// davranışı DEĞİŞMEDİ, hâlâ fatal.
//
// Gerçek Buffer/GitHub API'sine hiç istek atılmaz: global.fetch stub'lanır.
// Gerçek production state dosyasına (data/marketing-queue-state.json)
// DOKUNULMAZ — MARKETING_QUEUE_STATE_PATH env override'ıyla her test
// kendi geçici state dosyasını kullanır. Gerçek yayın/publish YOK.

import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(__dirname, "..", "scripts", "publish-next-marketing-asset.mjs");
const SCRIPT_SOURCE = await readFile(SCRIPT_PATH, "utf-8");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const tmpDir = await mkdtemp(path.join(tmpdir(), "marketing-queue-test-"));
process.env.BUFFER_ACCESS_TOKEN = "test-fixture-not-real";
process.env.GITHUB_TOKEN = "test-fixture-not-real";
process.env.GITHUB_REPOSITORY = "test-owner/test-repo";
process.env.MARKETING_QUEUE_STATE_PATH = path.join(tmpDir, "marketing-queue-state.json");

const { publishNext } = await import(`${pathToFileURL(SCRIPT_PATH).href}?t=${Date.now()}`);
const { MARKETING_QUEUE } = await import(pathToFileURL(path.join(__dirname, "..", "data", "marketing-queue.mjs")).href);

const LINKEDIN_INDEX = MARKETING_QUEUE.findIndex((i) => i.type === "linkedin_post");
const INSTAGRAM_INDEX = MARKETING_QUEUE.findIndex((i) => i.type === "instagram_story");

async function stateYaz(nextIndex, history = []) {
  await writeFile(process.env.MARKETING_QUEUE_STATE_PATH, JSON.stringify({ nextIndex, history }, null, 2));
}
async function stateOku() {
  return JSON.parse(await readFile(process.env.MARKETING_QUEUE_STATE_PATH, "utf-8"));
}

function fetchStub({ linkedinConnected, mutationError = false }) {
  return async (url, options = {}) => {
    const urlStr = String(url);
    if (urlStr === "https://api.buffer.com") {
      const body = JSON.parse(options.body);
      const query = body.query;
      if (query.includes("organizations")) {
        return jsonResponse({ data: { account: { organizations: [{ id: "org1" }] } } });
      }
      if (query.includes("channels(input:")) {
        const channels = linkedinConnected ? [{ id: "li1", name: "LinkedIn Sayfası", service: "linkedin" }] : [{ id: "ig1", name: "IG", service: "instagram" }];
        return jsonResponse({ data: { channels } });
      }
      if (query.includes("createPost")) {
        if (mutationError) {
          return jsonResponse({ data: { createPost: { message: "Simulated mutation failure" } } });
        }
        return jsonResponse({
          data: { createPost: { post: { id: "post123", text: "x", dueAt: "2026-01-01T00:00:00.000Z", status: "scheduled" } } },
        });
      }
    }
    throw new Error(`fetchStub: beklenmeyen istek — ${urlStr}`);
  };
}

function jsonResponse(obj) {
  return { ok: true, json: async () => obj };
}

// ---- a) LinkedIn kanalı BAĞLI DEĞİL -> SKIP + queue ilerliyor ----
{
  await stateYaz(LINKEDIN_INDEX, []);
  globalThis.fetch = fetchStub({ linkedinConnected: false });
  const sonuc = await publishNext();
  const state = await stateOku();
  const sonHistory = state.history[state.history.length - 1];
  kontrol(
    "a) LinkedIn kanalı yokken publishNext() SKIP döndürüyor (fatal değil)",
    sonuc.skipped === true && sonuc.reason === "LinkedIn channel not configured"
  );
  kontrol("a2) nextIndex güvenli şekilde bir sonrakine ilerledi", state.nextIndex === LINKEDIN_INDEX + 1, `nextIndex: ${state.nextIndex}`);
  kontrol(
    "a3) history'e status:skipped + doğru sebep kaydedildi, post alanı yok",
    sonHistory.status === "skipped" && sonHistory.reason === "LinkedIn channel not configured" && !("post" in sonHistory),
    JSON.stringify(sonHistory)
  );
}

// ---- b) LinkedIn kanalı BAĞLI -> normal publish yolu korunuyor (skip YOK) ----
{
  await stateYaz(LINKEDIN_INDEX, []);
  globalThis.fetch = fetchStub({ linkedinConnected: true });
  const sonuc = await publishNext();
  const state = await stateOku();
  const sonHistory = state.history[state.history.length - 1];
  kontrol("b) LinkedIn kanalı bağlıyken normal publish çalışıyor (skip yok)", !sonuc.skipped && sonuc.post?.id === "post123");
  kontrol("b2) nextIndex ilerledi", state.nextIndex === LINKEDIN_INDEX + 1);
  kontrol("b3) history'e normal post kaydı düştü (status:skipped değil)", sonHistory.status !== "skipped" && sonHistory.post?.id === "post123", JSON.stringify(sonHistory));
}

// ---- c) LinkedIn kanalı BAĞLI ama mutasyon BAŞKA bir hatayla başarısız -> hâlâ FATAL ----
{
  await stateYaz(LINKEDIN_INDEX, []);
  globalThis.fetch = fetchStub({ linkedinConnected: true, mutationError: true });
  let hataFirladi = false;
  try {
    await publishNext();
  } catch (e) {
    hataFirladi = true;
  }
  const state = await stateOku();
  kontrol("c) LinkedIn'in KANAL DIŞI bir hatası (mutasyon hatası) hâlâ fatal — sessizce skip edilmiyor", hataFirladi);
  kontrol("c2) Fatal hata durumunda nextIndex İLERLEMEDİ (state korunuyor)", state.nextIndex === LINKEDIN_INDEX, `nextIndex: ${state.nextIndex}`);
}

// ---- d) Instagram öğeleri bu değişiklikten yapısal olarak etkilenmiyor ----
{
  const fnStart = SCRIPT_SOURCE.indexOf("async function publishInstagramStory(item) {");
  const fnEnd = SCRIPT_SOURCE.indexOf("\nclass ChannelNotConfiguredError");
  const fnBody = SCRIPT_SOURCE.slice(fnStart, fnEnd);
  kontrol("d) publishInstagramStory bulunuyor", fnStart !== -1 && fnEnd !== -1 && fnEnd > fnStart);
  kontrol("d2) publishInstagramStory yeni ChannelNotConfiguredError mekanizmasına HİÇ referans vermiyor (dokunulmadı)", !fnBody.includes("ChannelNotConfiguredError"));
  kontrol("d3) publishInstagramStory'nin orijinal hata mesajı aynen duruyor", fnBody.includes("Bağlı bir Instagram kanalı bulunamadı."));
}

// ---- e) ChannelNotConfiguredError sadece linkedin_post dalında kullanılıyor ----
{
  const dispatchStart = SCRIPT_SOURCE.indexOf("export async function publishNext()");
  const dispatchBody = SCRIPT_SOURCE.slice(dispatchStart);
  const gateVar = /item\.type === ["']linkedin_post["'] && err instanceof ChannelNotConfiguredError/.test(dispatchBody);
  kontrol("e) SKIP mantığı açıkça item.type==='linkedin_post' ile sınırlandırılmış", gateVar);
}

await rm(tmpDir, { recursive: true, force: true });

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
