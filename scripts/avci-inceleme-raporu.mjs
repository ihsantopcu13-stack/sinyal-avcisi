// AVCI ÇÖZÜM MOTORU — inceleme listesi.
// Motorun güveni "düşük" olan ya da bir kuralı doğru cevapla çeliştiği için
// eleyen soruları listeler. Ağ yok, dosya yazmaz.
// Kullanım: node scripts/avci-inceleme-raporu.mjs [--json]

import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ctx = vm.createContext({});
vm.runInContext(readFileSync(path.join(ROOT, "assets/modules/avci-motor.js"), "utf-8"), ctx);
const M = ctx.AvciMotor;
const oku = (p) => JSON.parse(readFileSync(path.join(ROOT, p), "utf-8"));
const havuz = [...oku("api/data/sorular.json"), ...oku("api/data/avci-bosluk-sorular.json")];
const fe = (s) => ({ id: s.id, tip: s.tip, en: s.soru_en, sent: s.soru_en, q: s.soru_tr, opts: s.secenekler_tr, ans: s.dogru_index, tr: s.ceviri_tr, sinyal: s.sinyal });

const sayac = { yuksek: 0, orta: 0, dusuk: 0 };
const liste = [];
for (const s of havuz) {
  const c = M.coz(fe(s));
  if (!c) continue;
  sayac[c.guven] = (sayac[c.guven] || 0) + 1;
  if (c.incelemeGerekli || c.guven === "dusuk" || (c.celiski && c.celiski.length)) {
    liste.push({ id: s.id, guven: c.guven, neden: c.guvenNeden || "", celiski: (c.celiski || []).map((x) => x.kural || x.id || String(x)) });
  }
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ sayac, inceleme: liste }, null, 2));
} else {
  console.log(`Toplam ${havuz.length} soru — yüksek ${sayac.yuksek}, orta ${sayac.orta}, düşük ${sayac.dusuk}`);
  console.log(`İncelenecek: ${liste.length}`);
  for (const x of liste) console.log(`- ${x.id} [${x.guven}] ${x.neden}${x.celiski.length ? " | çelişen kural: " + x.celiski.join(", ") : ""}`);
}
