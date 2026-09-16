// SOURCE OF TRUTH — AŞAMA 3: frontend generated mirror doğrulaması.
//
// index.html'deki SL_HAVUZ artık elle düzenlenmiyor; canonical
// api/data/sorular.json'dan scripts/sl-havuz-generator.mjs ile
// üretiliyor (bkz. scripts/generate-sl-havuz.mjs). Bu test index.html'i
// DEĞİŞTİRMEZ — sadece generator'ın canonical'dan ÜRETTİĞİ çıktının,
// index.html içine gömülü olanla birebir aynı olduğunu (taze/drift'siz)
// doğrular. Fark varsa demek ki index.html elle düzenlenmiş veya
// generator çalıştırılmadan commit edilmiş.
//
// Ayrıca AŞAMA 2'de bilinen 2 sinyal düzeltmesinin (q011/q053) artık
// frontend'e DOĞRU şekilde yayıldığını (eski yanlış değere DÖNMEDİĞİNİ)
// burada zorunlu kılıyoruz — bu, sot-migration.test.mjs'in bilinçli
// olarak muaf tuttuğu kontrolün AŞAMA 3'teki karşılığıdır.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSlHavuz, buildSlHavuzSource } from "../scripts/sl-havuz-generator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

function extractBetween(text, startMarker, endMarker) {
  const s = text.indexOf(startMarker);
  if (s === -1) throw new Error(`Marker bulunamadı: ${startMarker}`);
  const from = s + startMarker.length;
  const e = text.indexOf(endMarker, from);
  if (e === -1) throw new Error(`Bitiş marker'ı bulunamadı: ${endMarker}`);
  return text.slice(from, e);
}

const canonicalPath = path.join(__dirname, "..", "api", "data", "sorular.json");
const canonical = JSON.parse(readFileSync(canonicalPath, "utf-8"));

const htmlPath = path.join(__dirname, "..", "index.html");
const html = readFileSync(htmlPath, "utf-8").replace(/\r\n/g, "\n");
const havuzBody = extractBetween(html, "const SL_HAVUZ=[", "\n];\n");
const embeddedSlHavuz = new Function(`return [${havuzBody}];`)();

const generatedSlHavuz = buildSlHavuz(canonical);

kontrol("a) Üretilen ve gömülü SL_HAVUZ uzunluğu eşit", generatedSlHavuz.length === embeddedSlHavuz.length, `üretilen=${generatedSlHavuz.length} gömülü=${embeddedSlHavuz.length}`);

// ---- freshness / drift kontrolü: index.html elle mi değiştirilmiş? ----
let driftSayisi = 0;
const driftDetaylari = [];
for (let i = 0; i < generatedSlHavuz.length; i++) {
  const g = generatedSlHavuz[i];
  const e = embeddedSlHavuz[i];
  const alanlar = ["id", "sinyal", "eye", "sent", "q", "ans", "fb"];
  const farkliAlanlar = alanlar.filter((a) => g[a] !== e[a]);
  if (JSON.stringify(g.opts) !== JSON.stringify(e?.opts)) farkliAlanlar.push("opts");
  if (farkliAlanlar.length) {
    driftSayisi++;
    driftDetaylari.push(`${g.id}: ${farkliAlanlar.join(",")}`);
  }
}
kontrol("b) index.html'deki SL_HAVUZ, canonical'dan üretilenle birebir aynı (drift yok)", driftSayisi === 0, driftDetaylari.join(" | ") || "tam eşleşme");

// ---- generator'ın kendi çıktısı deterministik mi (aynı girdi -> aynı çıktı) ----
{
  const src1 = buildSlHavuzSource(canonical);
  const src2 = buildSlHavuzSource(canonical);
  kontrol("c) Generator deterministik (aynı canonical -> byte-byte aynı çıktı)", src1 === src2);
}

// ---- stable id + temiz sinyal her girişte taşınıyor ----
{
  const idEksik = generatedSlHavuz.filter((e) => !/^q\d{3}$/.test(e.id));
  kontrol("d) Üretilen her girişte stable id (qNNN) var", idEksik.length === 0, idEksik.map((e) => e.id).join(","));
}

// ---- bilinen 2 düzeltme artık frontend'de DOĞRU (eski hataya dönülmedi) ----
{
  const q011 = embeddedSlHavuz.find((e, i) => canonical[i].id === "q011");
  const q011Sig = (q011.sent.match(/class="s-sig"[^>]*>([^<]+)</) || [])[1];
  kontrol("e) q011 frontend'de artık doğru sinyal 'anything but' gösteriliyor (eski 'marginalized' değil)", q011Sig === "anything but", `bulunan: ${q011Sig}`);
}
{
  const q053 = embeddedSlHavuz.find((e, i) => canonical[i].id === "q053");
  const q053Sig = (q053.sent.match(/class="s-sig"[^>]*>([^<]+)</) || [])[1];
  kontrol("f) q053 frontend'de artık doğru sinyal 'nonetheless' gösteriliyor (eski 'a fact that' değil)", q053Sig === "nonetheless", `bulunan: ${q053Sig}`);
}

// ---- s-sig/s-trap/s-key render sınıfları ve tooltip'ler hâlâ üretiliyor ----
{
  const sigTrapKeySayisi = embeddedSlHavuz.reduce((acc, e) => {
    acc.sig += (e.sent.match(/class="s-sig"/g) || []).length;
    acc.trap += (e.sent.match(/class="s-trap"/g) || []).length;
    acc.key += (e.sent.match(/class="s-key"/g) || []).length;
    return acc;
  }, { sig: 0, trap: 0, key: 0 });
  kontrol("g) s-sig/s-trap/s-key span'leri üretimde korunuyor", sigTrapKeySayisi.sig > 0 && sigTrapKeySayisi.trap > 0 && sigTrapKeySayisi.key > 0, JSON.stringify(sigTrapKeySayisi));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
