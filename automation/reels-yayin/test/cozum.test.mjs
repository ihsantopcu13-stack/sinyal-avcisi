// "3 saniyede çöz" kuyruk kuralları (ağa çıkmaz). cozum-mantigi.mjs
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cozumKonusu, hazirCozumVar, siradakiSoru, cozumOgesi } from "../cozum-mantigi.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const sorular = JSON.parse(await readFile(path.join(dir, "..", "..", "..", "api", "data", "sorular.json"), "utf-8"));
let toplam = 0, hata = 0;
const kontrol = (ad, ok, detay = "") => { toplam++; if (!ok) { hata++; console.log(`[FAIL] ${ad} ${detay}`); } };

kontrol("konu numarası 500 + soru", cozumKonusu("q031") === 531 && cozumKonusu("q001") === 501);
kontrol("geçersiz id konu almaz", cozumKonusu("x12") === null && cozumKonusu("q1234") === null);

{
  const k = { ogeler: [{ konu: 1 }, { konu: 501, tur: "cozum", soru: "q001" }] };
  kontrol("saati atanmamış çözüm varsa hazır", hazirCozumVar(k, { konular: {} }) === true);
  kontrol("çözümün saati atandıysa yenisi gerekir", hazirCozumVar(k, { konular: { 501: { slot: "x" } } }) === false);
  kontrol("sıradaki soru kullanılanı atlar", siradakiSoru(k, sorular)?.id === "q002");
  kontrol("kalite sorunu olan soru atlanır", siradakiSoru(k, sorular, (q) => (q.id === "q002" ? "bozuk" : null))?.id === "q003");
  const hepsi = { ogeler: sorular.map((q) => ({ konu: cozumKonusu(q.id), tur: "cozum", soru: q.id })) };
  kontrol("sorular bitince null", siradakiSoru(hepsi, sorular) === null);
}

// Her soru için kuyruk öğesi platform kurallarına uyar (kuyruk.test.mjs ile aynı kurallar)
const ids = new Set();
for (const q of sorular) {
  const o = cozumOgesi(q);
  const ad = `Soru ${q.id}`;
  ids.add(o.konu);
  kontrol(`${ad}: konu > 408 (hazır kuyrukla çakışmaz)`, o.konu > 408 && o.video === `konu${o.konu}.mp4`);
  kontrol(`${ad}: açıklama ≤ 2200`, [...o.aciklama].length <= 2200);
  kontrol(`${ad}: en fazla 5 hashtag`, (o.aciklama.match(/#[\p{L}\p{N}_]+/gu) || []).length <= 5);
  kontrol(`${ad}: yapay zekâ beyanı`, o.aciklama.includes("yapay zekâ ile oluşturulmuştur"));
  kontrol(`${ad}: cevap açıklamada yok`, !/Doğru cevap [A-E]/.test(o.aciklama + o.youtube.aciklama));
  kontrol(`${ad}: şıklar açıklamada`, q.secenekler_tr.every((s) => o.aciklama.includes(s)));
  kontrol(`${ad}: takip çağrısı`, o.aciklama.includes("Yarın 10:00'da yeni soru. Kaçırmamak için takip et."));
  kontrol(`${ad}: ilk yorum hashtag'siz`, !o.ilk_yorum.includes("#"));
  kontrol(`${ad}: YouTube başlığı ≤ 100, < > yok`, [...o.youtube.baslik].length <= 100 && !/[<>]/.test(o.youtube.baslik + o.youtube.aciklama));
  kontrol(`${ad}: YouTube açıklamasında biyografi yok`, !/biyografi/i.test(o.youtube.aciklama));
}
kontrol("konu numaraları tekil", ids.size === sorular.length);

console.log(`${toplam - hata}/${toplam} kontrol geçti`);
if (hata) process.exit(1);
