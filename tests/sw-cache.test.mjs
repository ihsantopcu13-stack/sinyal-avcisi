// sw.js önbellek kapsamının GERÇEK ÇALIŞTIRMA testi. sw.js kaynağı BİREBİR
// okunup Node'un `vm` modülünde, sahte (in-memory) self/caches/fetch ile
// çalıştırılır — gerçek ağa veya tarayıcıya HİÇ çıkılmaz.
//
// Doğrulanan kurallar (2026-10-01 sw-cache-fix):
// - /api/ istekleri SW tarafından HİÇ ele alınmaz → önbelleğe girmez
//   (admin listeleri, anon-profile kurtarma yanıtları cihazda kalmasın).
// - HTML (navigate) network-first; yalnızca res.ok yanıtlar önbelleğe girer.
// - Önbelleğe HTML dışında yalnızca /assets/ ve /manifest.json girer.
// - CACHE_NAME v4 → activate eski (v3) önbelleği siler.

import { readFileSync } from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ORIGIN = "https://sinyal-avcisi.com";

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

class SahteYanit {
  constructor(govde, status = 200) { this.govde = govde; this.status = status; this.ok = status >= 200 && status < 300; }
  clone() { return new SahteYanit(this.govde, this.status); }
}

function ortamKur({ agStatus = 200, cevrimdisi = false } = {}) {
  const depolar = new Map(); // önbellek adı -> Map(url -> yanıt)
  const dinleyiciler = {};
  const agIstekleri = [];
  const caches = {
    async open(ad) {
      if (!depolar.has(ad)) depolar.set(ad, new Map());
      const d = depolar.get(ad);
      return {
        async put(req, res) { d.set(typeof req === "string" ? req : req.url, res); },
        async addAll(urls) { urls.forEach((u) => d.set(new URL(u, ORIGIN).href, new SahteYanit("precache"))); },
      };
    },
    async match(req) {
      const u = new URL(typeof req === "string" ? req : req.url, ORIGIN).href;
      for (const d of depolar.values()) if (d.has(u)) return d.get(u);
      return undefined;
    },
    async keys() { return [...depolar.keys()]; },
    async delete(ad) { return depolar.delete(ad); },
  };
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (t, fn) => { dinleyiciler[t] = fn; },
    skipWaiting() {},
    clients: { claim: async () => {} },
    registration: { showNotification() {} },
  };
  const ctx = vm.createContext({
    self, caches, URL, console,
    clients: self.clients,
    fetch: async (req) => {
      agIstekleri.push(req.url);
      if (cevrimdisi) throw new Error("offline");
      return new SahteYanit("ag:" + req.url, agStatus);
    },
  });
  vm.runInContext(readFileSync(path.join(ROOT, "sw.js"), "utf-8"), ctx);
  return { ctx, depolar, dinleyiciler, agIstekleri };
}

function istek(yol, { method = "GET", mode = "cors", accept = "*/*" } = {}) {
  return { url: new URL(yol, ORIGIN).href, method, mode, headers: { get: (h) => (h === "accept" ? accept : null) } };
}

// fetch olayını tetikler; respondWith çağrılmadıysa null döner.
async function fetchTetikle(env, req) {
  let yanitSozu = null;
  env.dinleyiciler.fetch({ request: req, respondWith: (p) => { yanitSozu = p; } });
  if (!yanitSozu) return null;
  const res = await yanitSozu;
  await new Promise((r) => setTimeout(r, 0)); // arka plandaki cache.put'ları beklet
  return res;
}

const tumOnbellekUrlleri = (env) => [...env.depolar.values()].flatMap((d) => [...d.keys()]);

{
  const env = ortamKur();
  kontrol("1) CACHE_NAME 'sinyal-avcisi-v4'", vm.runInContext("CACHE_NAME", env.ctx) === "sinyal-avcisi-v4");
}

{
  const env = ortamKur();
  const yollar = ["/api/admin-users", "/api/admin-testimonials", "/api/anon-profile?recovery=ABC123", "/api/published-content"];
  const ele = [];
  for (const y of yollar) if ((await fetchTetikle(env, istek(y))) !== null) ele.push(y);
  kontrol("2) /api/ GET istekleri SW tarafından ele alınmıyor", ele.length === 0, ele.length ? `ele alınan: ${ele.join(", ")}` : undefined);
  kontrol("3) /api/ yanıtları önbelleğe girmiyor", !tumOnbellekUrlleri(env).some((u) => u.includes("/api/")));
}

{
  const env = ortamKur();
  const res = await fetchTetikle(env, istek("/api/klod", { mode: "navigate", accept: "text/html" }));
  kontrol("4) /api/ adresine navigate bile ele alınmıyor", res === null);
}

{
  const env = ortamKur();
  const res1 = await fetchTetikle(env, istek("/assets/modules/attribution.js"));
  const res2 = await fetchTetikle(env, istek("/manifest.json"));
  const urller = tumOnbellekUrlleri(env);
  kontrol("5) /assets/ dosyası önbelleğe giriyor", res1 !== null && urller.includes(`${ORIGIN}/assets/modules/attribution.js`));
  kontrol("6) /manifest.json önbelleğe giriyor", res2 !== null && urller.includes(`${ORIGIN}/manifest.json`));
}

{
  const env = ortamKur();
  const sonuc = [];
  for (const y of ["/sitemap.xml", "/robots.txt", "/sw.js"]) if ((await fetchTetikle(env, istek(y))) !== null) sonuc.push(y);
  kontrol("7) kapsam dışı dosyalar (sitemap/robots/sw.js) ele alınmıyor", sonuc.length === 0, sonuc.length ? `ele alınan: ${sonuc.join(", ")}` : undefined);
}

{
  const env = ortamKur();
  const res = await fetchTetikle(env, istek("/", { mode: "navigate", accept: "text/html" }));
  kontrol("8) HTML navigate network-first (ağdan geliyor)", res?.govde === `ag:${ORIGIN}/`);
  kontrol("9) başarılı HTML yanıtı önbelleğe giriyor", tumOnbellekUrlleri(env).includes(`${ORIGIN}/`));
}

{
  const env = ortamKur({ agStatus: 500 });
  await fetchTetikle(env, istek("/privacy", { mode: "navigate", accept: "text/html" }));
  kontrol("10) HTML hata yanıtı (500) önbelleğe girmiyor", !tumOnbellekUrlleri(env).includes(`${ORIGIN}/privacy`));
}

{
  const env = ortamKur({ cevrimdisi: true });
  await env.ctx.caches.open("sinyal-avcisi-v4").then((c) => c.put(`${ORIGIN}/`, new SahteYanit("eski-sayfa")));
  const res = await fetchTetikle(env, istek("/sat", { mode: "navigate", accept: "text/html" }));
  kontrol("11) çevrimdışıyken HTML önbellekteki '/' sayfasına düşüyor", res?.govde === "eski-sayfa");
}

{
  const env = ortamKur();
  await env.ctx.caches.open("sinyal-avcisi-v3").then((c) => c.put(`${ORIGIN}/api/admin-users`, new SahteYanit("eski-admin")));
  await env.ctx.caches.open("sinyal-avcisi-v4");
  let bekle;
  env.dinleyiciler.activate({ waitUntil: (p) => { bekle = p; } });
  await bekle;
  const adlar = [...env.depolar.keys()];
  kontrol("12) activate eski v3 önbelleğini (biriken API yanıtlarıyla) siliyor", !adlar.includes("sinyal-avcisi-v3") && adlar.includes("sinyal-avcisi-v4"), `kalan: ${adlar.join(", ")}`);
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
