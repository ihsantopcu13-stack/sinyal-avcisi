// Sinyal kelimeli soru çözüm modülü (/sinyal-soru) — soru verisinin şemaya
// uyduğunu, her sinyal kelimenin metinde geçtiğini, metin parçalamanın
// doğru çalıştığını ve sayfanın ödeme/üyelik duvarı içermediğini doğrular.
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

const kod = readFileSync(path.join(ROOT, "assets/modules/sinyal-soru.js"), "utf-8");
const ctx = { Set };
vm.createContext(ctx);
vm.runInContext(kod, ctx);
const S = ctx.SinyalSoru;
kontrol("modül SinyalSoru'yu dışa verir", !!S && typeof S.baslat === "function");

const sorular = JSON.parse(readFileSync(path.join(ROOT, "assets/data/sinyal-sorular.json"), "utf-8"));
kontrol("en az 10 soru", sorular.length >= 10, sorular.length);
const hatalar = sorular.flatMap((s) => S.dogrula(s));
kontrol("her soru şemaya uyar", hatalar.length === 0, hatalar.join(" | ") || "hata yok");
kontrol("soru kimlikleri tekil", new Set(sorular.map((s) => s.id)).size === sorular.length);
const tipler = new Set(sorular.flatMap((s) => s.signalWords.map((k) => k.type)));
kontrol("en az 6 farklı sinyal tipi kullanılıyor", tipler.size >= 6, [...tipler].join(", "));
const dagilim = [0, 0, 0, 0, 0];
sorular.forEach((s) => dagilim[s.correctAnswer]++);
kontrol("doğru cevap her harfe dağılmış", dagilim.every((n) => n > 0), dagilim.join("/"));
kontrol("her soru türü en az bir kez var", Object.keys(S.SORU_TURLERI).every((t) => sorular.some((s) => s.questionType === t)));

// parcala: kelime sınırı, sıra, boşluk
const p = S.parcala("He also left, so ---- stayed.", [{ word: "so", type: "sebep", tip: "x" }]);
const sinyalParca = p.filter((x) => x.tur === "sinyal");
kontrol("'so' kelimesi 'also' içinde yakalanmaz", sinyalParca.length === 1 && p.map((x) => x.metin).join("").indexOf("also") !== -1 && p[0].metin.includes("also"));
kontrol("boşluk ayrı parça olur", p.some((x) => x.tur === "bosluk"));
kontrol("parçalar birleşince metin aynen çıkar", p.map((x) => x.metin).join("") === "He also left, so ---- stayed.");
kontrol("büyük/küçük harf duyarsız bulur", S.sinyalBul("Since then", { word: "since" }) === 0);
kontrol("bulunamayan kelime hataya düşer", S.dogrula({ ...sorular[0], signalWords: [{ word: "zzz", type: "zitlik", tip: "x" }] }).length > 0);
kontrol("bilinmeyen sinyal tipi hataya düşer", S.dogrula({ ...sorular[0], signalWords: [{ ...sorular[0].signalWords[0], type: "yok" }] }).length > 0);

// sayfa
const html = readFileSync(path.join(ROOT, "sinyal-soru.html"), "utf-8");
const vercel = JSON.parse(readFileSync(path.join(ROOT, "vercel.json"), "utf-8"));
const sitemap = readFileSync(path.join(ROOT, "sitemap.xml"), "utf-8");
kontrol("sayfa modülü ve veriyi yükler", html.includes("/assets/modules/sinyal-soru.js") && html.includes("/assets/data/sinyal-sorular.json"));
kontrol("ödeme / üyelik duvarı yok", !/paywall|premium|abone ol|satın al|giriş yap/i.test(html + kod));
kontrol("sarı/turuncu/altın renk yok", !/#(f59e0b|fbbf24|fcd34d|f97316|fb923c|eab308|facc15|d4af37|ffd700)\b|gold|orange|yellow/i.test(html));
kontrol("açık ve koyu tema tanımlı", html.includes(':root[data-tema="koyu"]') && html.includes("color-scheme:light"));
kontrol("/sinyal-soru yönlendirmesi var", vercel.rewrites.some((r) => r.source === "/sinyal-soru" && r.destination === "/sinyal-soru.html"));
kontrol("site haritasında var", sitemap.includes("https://sinyal-avcisi.com/sinyal-soru<"));

console.log(`\n${toplam - basarisiz}/${toplam} geçti`);
if (basarisiz) process.exit(1);
