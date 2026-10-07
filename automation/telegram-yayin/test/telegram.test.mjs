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

await test("gerçek kuyruktaki tüm açıklamalar Telegram sınırına sığar", async () => {
  const k = JSON.parse(await readFile(new URL("../../reels-yayin/data/kuyruk.json", import.meta.url), "utf-8"));
  for (const o of k.ogeler) assert.ok(reelsAciklamasi(o.aciklama).length <= CAPTION_SINIR, `Konu ${o.konu}`);
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

console.log(`\n${t} test geçti`);
