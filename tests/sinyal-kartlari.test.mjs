// Sinyal kelime kartları (/sinyal-kartlari) — kart verisinin eksiksiz
// olduğunu, kelimenin örnek cümlede geçtiğini, süzgeçlerin doğru
// çalıştığını ve sayfanın ödeme/üyelik duvarı içermediğini doğrular.
// Ağ çağrısı yok.

import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
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

const ctx = { Set };
vm.createContext(ctx);
for (const f of ["assets/modules/sinyal-soru.js", "assets/data/sinyal-kartlari.js", "assets/modules/sinyal-kartlari.js"]) {
  vm.runInContext(readFileSync(path.join(ROOT, f), "utf-8"), ctx, { filename: f });
}
const kartlar = vm.runInContext("SINYAL_KARTLARI", ctx);
const K = ctx.SinyalKartlari;
kontrol("modül SinyalKartlari'yı dışa verir", !!K && typeof K.baslat === "function");
kontrol("veri tek bir dizi (SINYAL_KARTLARI)", Array.isArray(kartlar));
kontrol("en az 30 kart", kartlar.length >= 30, kartlar.length);

const hatalar = kartlar.flatMap((k) => K.kartDogrula(k));
kontrol("her kart eksiksiz ve kelime örnekte geçiyor", hatalar.length === 0, hatalar.join(" | ") || "hata yok");
const kelimeler = kartlar.map((k) => k.word.toLowerCase());
kontrol("aynı kelime iki kez yok", new Set(kelimeler).size === kelimeler.length);
for (const w of ["although", "despite", "furthermore"]) kontrol(`"${w}" kartı var`, kelimeler.includes(w));
const seviyeler = new Set(kartlar.map((k) => k.level));
kontrol("üç zorluk derecesi de kullanılıyor", ["kolay", "orta", "zor"].every((s) => seviyeler.has(s)), [...seviyeler].join(", "));
kontrol("en az 5 sinyal türü var", new Set(kartlar.map((k) => k.type)).size >= 5);

// süzgeç
const durum = { Although: "ogrendim", Despite: "tekrar" };
kontrol("Öğrendim listesi", K.filtrele(kartlar, durum, "ogrendim", "hepsi").map((k) => k.word).join() === "Although");
kontrol("Tekrar Et listesi", K.filtrele(kartlar, durum, "tekrar", "hepsi").map((k) => k.word).join() === "Despite");
kontrol("Yeni listesi işaretlileri dışarıda bırakır", K.filtrele(kartlar, durum, "yeni", "hepsi").length === kartlar.length - 2);
kontrol("tür süzgeci", K.filtrele(kartlar, {}, "hepsi", "kosul").every((k) => k.type === "kosul"));
const p = K.ornekParcala("Hardly had the plane taken off when the engine failed.", "Hardly ... when");
kontrol("'Hardly ... when' örnekte iki parça vurgulanır", p.filter((x) => x.v).map((x) => x.m).join("|") === "Hardly|when");
kontrol("parçalar birleşince örnek aynen çıkar", p.map((x) => x.m).join("") === "Hardly had the plane taken off when the engine failed.");

// sayfa
const html = readFileSync(path.join(ROOT, "sinyal-kartlari.html"), "utf-8");
const kod = readFileSync(path.join(ROOT, "assets/modules/sinyal-kartlari.js"), "utf-8");
const temaCss = readFileSync(path.join(ROOT, "assets/sinyal-tema.css"), "utf-8");
const vercel = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf-8"));
const sitemap = readFileSync(path.join(ROOT, "sitemap.xml"), "utf-8");
kontrol("sayfa ortak temayı, veriyi ve modülü yükler", ["/assets/sinyal-tema.css", "/assets/data/sinyal-kartlari.js", "/assets/modules/sinyal-kartlari.js", "/assets/modules/sinyal-tema.js"].every((s) => html.includes(s)));
kontrol("Önceki/Sonraki ve Öğrendim/Tekrar Et düğmeleri var", ["Önceki Kart", "Sonraki Kart", "Öğrendim", "Tekrar Et"].every((s) => html.includes(s)));
kontrol("çevirme animasyonu ve hareket azaltma desteği", html.includes("rotateY(180deg)") && html.includes("prefers-reduced-motion"));
kontrol("ödeme / üyelik duvarı yok", !/paywall|premium|abone ol|satın al|giriş yap/i.test(html + kod));
kontrol("sarı/turuncu/altın renk yok", !/#(f59e0b|fbbf24|fcd34d|f97316|fb923c|eab308|facc15|d4af37|ffd700)\b|gold|orange|yellow/i.test(html + temaCss));
kontrol("/sinyal-kartlari yönlendirmesi var", vercel.rewrites.some((r) => r.source === "/sinyal-kartlari" && r.destination === "/sinyal-kartlari.html"));
kontrol("site haritasında var", sitemap.includes("https://sinyal-avcisi.com/sinyal-kartlari<"));

console.log(`\n${toplam - basarisiz}/${toplam} geçti`);
if (basarisiz) process.exit(1);
