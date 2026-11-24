// 13:30 "sinyal kelime" kuyruk kuralları (ağa çıkmaz). sinyal-mantigi.mjs
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sinyalKonusu, sinyalKalitesi, hazirSinyalVar, siradakiSinyal, sinyalOgesi } from "../sinyal-mantigi.mjs";
import { cozumKonusu } from "../cozum-mantigi.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const sorular = JSON.parse(await readFile(path.join(dir, "..", "..", "..", "assets", "data", "sinyal-sorular.json"), "utf-8"));
let toplam = 0, hata = 0;
const kontrol = (ad, ok, detay = "") => { toplam++; if (!ok) { hata++; console.log(`[FAIL] ${ad} ${detay}`); } };

kontrol("konu numarası 700 + soru", sinyalKonusu("ss001") === 701 && sinyalKonusu("ss042") === 742);
kontrol("geçersiz id konu almaz", sinyalKonusu("q001") === null && sinyalKonusu("ss123") === null && sinyalKonusu("ss01") === null);
kontrol("çözüm konularıyla çakışmaz", cozumKonusu("q099") < sinyalKonusu("ss001"));

{
  const k = { ogeler: [{ konu: 1 }, { konu: 701, tur: "sinyal", soru: "ss001" }, { konu: 501, tur: "cozum", soru: "q001" }] };
  kontrol("saati atanmamış sinyal varsa hazır", hazirSinyalVar(k, { konular: {} }) === true);
  kontrol("sinyalin saati atandıysa yenisi gerekir", hazirSinyalVar(k, { konular: { 701: { slot: "x" } } }) === false);
  kontrol("çözüm videosu sinyal sayılmaz", hazirSinyalVar({ ogeler: [k.ogeler[2]] }, { konular: {} }) === false);
  kontrol("sıradaki soru kullanılanı atlar", siradakiSinyal(k, sorular)?.id === "ss002");
  const hepsi = { ogeler: sorular.map((q) => ({ konu: sinyalKonusu(q.id), tur: "sinyal", soru: q.id })) };
  kontrol("sorular bitince null", siradakiSinyal(hepsi, sorular) === null);
  kontrol("4 şıklı soru atlanır", sinyalKalitesi({ ...sorular[0], options: ["a", "b", "c", "d"] }) === "sik_5_degil");
}

const ids = new Set();
for (const q of sorular) {
  const ad = `Soru ${q.id}`;
  kontrol(`${ad}: video üretilebilir`, sinyalKalitesi(q) === null, sinyalKalitesi(q) || "");
  const o = sinyalOgesi(q);
  ids.add(o.konu);
  kontrol(`${ad}: konu 701-799`, o.konu > 700 && o.konu < 800 && o.video === `konu${o.konu}.mp4`);
  kontrol(`${ad}: açıklama ≤ 2200`, [...o.aciklama].length <= 2200);
  kontrol(`${ad}: en fazla 5 hashtag`, (o.aciklama.match(/#[\p{L}\p{N}_]+/gu) || []).length <= 5);
  kontrol(`${ad}: yapay zekâ beyanı`, o.aciklama.includes("yapay zekâ ile oluşturulmuştur"));
  kontrol(`${ad}: cevap açıklamada yok`, !/Doğru cevap [A-E]/.test(o.aciklama + o.youtube.aciklama));
  kontrol(`${ad}: şıklar açıklamada`, q.options.every((s) => o.aciklama.includes(s)));
  kontrol(`${ad}: takip çağrısı`, o.aciklama.includes("Yarın 13:30'da yeni sinyal. Kaçırmamak için takip et."));
  kontrol(`${ad}: ilk yorum hashtag'siz`, !o.ilk_yorum.includes("#"));
  kontrol(`${ad}: YouTube başlığı ≤ 100, < > yok`, [...o.youtube.baslik].length <= 100 && !/[<>]/.test(o.youtube.baslik + o.youtube.aciklama));
  kontrol(`${ad}: YouTube açıklamasında biyografi yok`, !/biyografi/i.test(o.youtube.aciklama));
}
kontrol("konu numaraları tekil", ids.size === sorular.length);

console.log(`${toplam - hata}/${toplam} kontrol geçti`);
if (hata) process.exit(1);
