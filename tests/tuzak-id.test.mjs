// TUZAK_HAVUZ kalıcı ID testi (FAZ 1 kapanış).
// index.html'deki TUZAK_HAVUZ dizisi BİREBİR çıkarılıp Node vm ile değerlendirilir.
// Doğrular: 160 soru · tz001…tz160 · sıra ve içerik değişmedi (kilit dosyası) ·
// sıraya bağlı mevcut davranış (günlük soru, zorluk aralıkları) aynı ·
// DNA motoru bu sorular üzerinde çökmüyor ve LLM çağırmıyor.
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dnaToplu } from "../api/_avciDna.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const html = readFileSync(path.join(ROOT, "index.html"), "utf-8");
const kilit = JSON.parse(readFileSync(path.join(__dirname, "fixtures", "tuzak-id-kilidi.json"), "utf-8"));
const kanonik = JSON.parse(readFileSync(path.join(ROOT, "api", "data", "sorular.json"), "utf-8"));

let toplam = 0, basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++; if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const a = html.indexOf("const TUZAK_HAVUZ=[");
const b = html.indexOf("\n];", a);
const havuz = vm.runInNewContext("(" + html.slice(a + "const TUZAK_HAVUZ=".length, b + 3).replace(/;$/, "") + ")");
const iz = (q) => createHash("sha256").update(JSON.stringify([q.q, q.sent, q.opts, q.dogru, q.fb])).digest("hex").slice(0, 16);

kontrol("T1) TUZAK_HAVUZ tam olarak 1 kez tanımlı", (html.match(/const TUZAK_HAVUZ=\[/g) || []).length === 1);
kontrol("T2) 160 soru (sayı değişmedi → günlük soru döngüsü aynı)", havuz.length === 160, `${havuz.length}`);
kontrol("T3) her sorunun id'si var", havuz.every((q) => typeof q.id === "string"));
kontrol("T4) id'ler tz001…tz160, dizideki konuma göre sıralı", havuz.every((q, i) => q.id === "tz" + String(i + 1).padStart(3, "0")));
kontrol("T5) id'ler benzersiz", new Set(havuz.map((q) => q.id)).size === havuz.length);
kontrol("T6) kanonik bankanın q### id'leriyle çakışma yok", !havuz.some((q) => kanonik.some((k) => k.id === q.id)));
{
  const farkli = kilit.kayitlar.filter((k) => { const q = havuz[k.sira]; return !q || q.id !== k.id || iz(q) !== k.iz; });
  kontrol("T7) kilit: her id aynı konumda ve içerik (q/sent/opts/dogru/fb) değişmedi", farkli.length === 0 && kilit.kayitlar.length === 160,
    farkli.slice(0, 5).map((k) => k.id).join(",") || "tamam");
}
{
  const alanlar = new Set(["id", "q", "sent", "opts", "dogru", "fb"]);
  const fazla = havuz.filter((q) => Object.keys(q).some((k) => !alanlar.has(k)));
  kontrol("T8) sadece 'id' alanı eklendi (başka alan yok)", fazla.length === 0);
}
{
  // Sıraya bağlı mevcut kod: günlük index ve zorluk aralıkları dizinin uzunluğuna/sırasına bağlı
  const gunlukIdx = (gun) => gun % havuz.length;
  kontrol("T9) günlük soru formülü (gün % uzunluk) aynı sonucu verir", gunlukIdx(20356) === 20356 % 160);
  kontrol("T10) zorluk aralıkları (0-9 / 10-19 / 20-159) hâlâ geçerli", havuz[9] && havuz[19] && havuz[159]);
}
{
  // Kayıtlar metne göre tutuluyor (cevapKaydet: soru metni; hataEkle: soru metni) → id eklemek eski kayıtları etkilemez
  const tuzakKayit = html.slice(html.indexOf("function tuzakAns("), html.indexOf("function tuzakPaylas("));
  kontrol("T11) tuzakAns kayıt çağrıları değişmedi (questionId gönderilmiyor → sunucu satırları eskisi gibi)", !/questionId/.test(tuzakKayit) && /cevapKaydet\(\{modul:'tuzak',soru:soru\.sent/.test(tuzakKayit));
}

// DNA motoru bu gerçek sorularda çökmemeli, LLM çağırmamalı (sadece doğrulama, dosyaya yazılmaz)
{
  const bosluklu = havuz.filter((q) => /_{3,}/.test(q.sent)).map((q) => ({
    id: q.id, question_type: "blank_grammar", stem: q.sent.replace(/^["“]|["”]$/g, ""), options: q.opts, correct_index: q.dogru,
  }));
  let firlatti = false, sonuc = null;
  try { sonuc = dnaToplu(bosluklu, null, { simdi: "x" }); } catch { firlatti = true; }
  const i = sonuc?.istatistik || {};
  kontrol(`T12) ${bosluklu.length} boşluklu tuzak sorusunda DNA motoru hata fırlatmıyor, 'failed' yok`, !firlatti && bosluklu.length > 0 && i.failed === 0,
    `analiz: ${i.analyzed} · inceleme: ${i.needs_review} · yüksek güven: ${i.confidence?.high}`);
  const catisan = Object.values(sonuc?.dosya.records || {}).filter((k) => k.auto?.answer?.matches_key === false);
  kontrol("T13) LLM çağrısı 0", i.llm_calls === 0);
  kontrol("T14) kural motoru hiçbir tuzak sorusunda cevap anahtarıyla çelişmiyor", catisan.length === 0, catisan.map((k) => k.question_id).join(", ") || "yok");
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
