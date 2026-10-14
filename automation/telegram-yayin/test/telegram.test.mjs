// node test/telegram.test.mjs — telegram-mantigi.mjs kuralları
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { reelsSec, reelsAciklamasi, gununSorusuMetni, gorunurUzunluk, modBelirle, tgDurumHazirla, CAPTION_SINIR, MAX_DENEME } from "../telegram-mantigi.mjs";

const kuyruk = { ogeler: [1, 2, 3, 4, 5].map((konu) => ({ konu, video: `konu0${konu}.mp4`, aciklama: "x" })) };
const tamam = { tamam: true };
const reels = {
  konular: {
    1: { slot: "2026-10-01T08:30:00+03:00", instagram: tamam },            // çok eski → gitmez
    2: { slot: "2026-10-08T08:30:00+03:00", instagram: tamam },            // saati geldi
    3: { slot: "2026-10-08T13:00:00+03:00", facebook: tamam },             // saati geldi
    4: { slot: "2026-10-08T17:30:00+03:00", instagram: tamam },            // gelecekte → gitmez
    5: { slot: "2026-10-08T09:00:00+03:00", instagram: { tamam: false } }, // hiçbir yere gitmemiş → gitmez
  },
};
const simdi = new Date("2026-10-08T14:00:00+03:00");

let t = 0;
const test = async (ad, fn) => { await fn(); t++; console.log("✔", ad); };

await test("mod: yalnız 'yayinla' gerçek gönderim", () => {
  assert.equal(modBelirle({}), "deneme");
  assert.equal(modBelirle({ TELEGRAM_MOD: "yayinla" }), "yayinla");
  assert.equal(modBelirle({ TELEGRAM_MOD: "acik" }), "deneme");
});

await test("seçim: saati gelmiş, pencere içinde, gerçekten zamanlanmış konular, eskiden yeniye", () => {
  const s = reelsSec(kuyruk, reels, tgDurumHazirla({}), simdi);
  assert.deepEqual(s.map((x) => x.konu), [2, 3]);
});

await test("seçim: gönderilmiş konu tekrar gitmez, deneme hakkı biten konu gitmez", () => {
  const tg = tgDurumHazirla({ konular: { 2: { tamam: true }, 3: { deneme: MAX_DENEME } } });
  assert.deepEqual(reelsSec(kuyruk, reels, tg, simdi), []);
});

await test("seçim: çalışma başına sınır", () => {
  assert.equal(reelsSec(kuyruk, reels, tgDurumHazirla({}), simdi, 12, 1).length, 1);
});

await test("seçim: durum dosyası boş/bozuksa çökmez", () => {
  assert.deepEqual(reelsSec(kuyruk, {}, tgDurumHazirla(null), simdi), []);
});

await test("Reels açıklaması: biyografi yerine site, sınır içinde", () => {
  assert.equal(reelsAciklamasi("Ücretsiz. Link biyografide."), "Ücretsiz. 👉 sinyal-avcisi.com");
  assert.ok(reelsAciklamasi("a".repeat(2000)).length <= CAPTION_SINIR);
});

await test("Reels açıklaması: kanalda yorum yok → 'yoruma yaz' düşünme çağrısına çevrilir", () => {
  assert.equal(
    reelsAciklamasi("Soru? 👇 Cevabını yoruma yaz!\n\nLink biyografide."),
    "Soru? 🤔 Cevabını düşün, sonra izle.\n\n👉 sinyal-avcisi.com"
  );
});

const gercekKuyruk = JSON.parse(await readFile(new URL("../../reels-yayin/data/kuyruk.json", import.meta.url), "utf-8"));

await test("gerçek kuyruktaki tüm açıklamalar Telegram sınırına sığar", () => {
  for (const o of gercekKuyruk.ogeler) assert.ok(reelsAciklamasi(o.aciklama).length <= CAPTION_SINIR, `Konu ${o.konu}`);
});

await test("gerçek kuyruk: Telegram metninde 'yoruma yaz' kalmaz", () => {
  for (const o of gercekKuyruk.ogeler) assert.doesNotMatch(reelsAciklamasi(o.aciklama), /yoruma? yaz/i, `Konu ${o.konu}`);
});

await test("gerçek kuyruk: hiçbir açıklama 1024'te kesilmez (hashtag'ler kaybolmaz)", () => {
  for (const o of gercekKuyruk.ogeler) assert.ok(!reelsAciklamasi(o.aciklama).endsWith("…"), `Konu ${o.konu} kesildi`);
});

await test("Günün Sorusu: cevap spoiler içinde, HTML kaçışlı", () => {
  const soru = { soru_en: "A <b> & c", soru_tr: "Hangisi?", secenekler_tr: ["bir", "iki"], sinyal: "however", aciklama_tr: "Çünkü zıtlık." };
  const { caption, ekMesaj } = gununSorusuMetni(soru, "B");
  assert.equal(ekMesaj, null);
  assert.match(caption, /<tg-spoiler>Doğru cevap: B\nÇünkü zıtlık\.<\/tg-spoiler>/);
  assert.match(caption, /A &lt;b&gt; &amp; c/);
  assert.match(caption, /B\) iki/);
});

await test("Günün Sorusu: uzun metin kart + ayrı mesaja bölünür", () => {
  const soru = { soru_en: "x".repeat(900), soru_tr: "y", secenekler_tr: ["a"], aciklama_tr: "z".repeat(300) };
  const { caption, ekMesaj } = gununSorusuMetni(soru, "A");
  assert.ok(gorunurUzunluk(caption) <= CAPTION_SINIR);
  assert.ok(ekMesaj && ekMesaj.includes("<tg-spoiler>"));
});

// ---- yeniden deneme ----
const { geciciMi, yenidenDene, hataOlustur, ozetMetni, YENIDEN_BEKLEME_SN } = await import("../telegram-mantigi.mjs");

await test("geçici/kalıcı hata ayrımı", () => {
  assert.ok(geciciMi(hataOlustur("x", { status: 500 })));
  assert.ok(geciciMi(hataOlustur("x", { status: 503 })));
  assert.ok(geciciMi(hataOlustur("x", { gecici: true })));
  assert.ok(!geciciMi(hataOlustur("x", { status: 404 })));
  assert.ok(!geciciMi(hataOlustur("x", { status: 400 })));
  assert.ok(!geciciMi(new Error("bilinmeyen")));
});

await test("geçici hata: 5/15/45 sn bekleyerek yeniden dener, sonra başarır", async () => {
  const beklenen = [];
  let n = 0;
  const sonuc = await yenidenDene(async () => { if (++n < 3) throw hataOlustur("500", { status: 500 }); return "ok"; }, { uyku: async (ms) => beklenen.push(ms) });
  assert.equal(sonuc, "ok");
  assert.equal(n, 3);
  assert.deepEqual(beklenen, [5000, 15000]);
  assert.deepEqual(YENIDEN_BEKLEME_SN, [5, 15, 45]);
});

await test("geçici hata sürerse 3 yeniden denemeden sonra fırlatır", async () => {
  const beklenen = [];
  let n = 0;
  await assert.rejects(yenidenDene(async () => { n++; throw hataOlustur("bağlantı", { gecici: true }); }, { uyku: async (ms) => beklenen.push(ms) }), /bağlantı/);
  assert.equal(n, 4);
  assert.deepEqual(beklenen, [5000, 15000, 45000]);
});

await test("kalıcı hata (404) yeniden denenmez", async () => {
  let n = 0;
  await assert.rejects(yenidenDene(async () => { n++; throw hataOlustur("404", { status: 404 }); }, { uyku: async () => assert.fail("beklememeli") }), /404/);
  assert.equal(n, 1);
});

await test("özet: başarılı sayısı ve düşen konuların sebebi", () => {
  const m = ozetMetni([{ konu: 26, tamam: false, hata: "konu26.mp4 indirilemedi: 500" }, { konu: 27, tamam: true }, { konu: 28, tamam: true }]);
  assert.match(m, /2\/3 konu gönderildi \(Konu 27, Konu 28\)/);
  assert.match(m, /Konu 26 düştü: konu26\.mp4 indirilemedi: 500/);
});

console.log(`\n${t} test geçti`);
