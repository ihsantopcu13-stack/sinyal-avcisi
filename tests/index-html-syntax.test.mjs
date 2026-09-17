// index.html'in inline <script> bloklarının GEÇERLİ JavaScript olduğunu
// doğrular. Repo'da index.html'i derleyen/build eden hiçbir adım yok
// (bkz. 2026-09-17 "12 maddelik yol haritası" teşhisi) — bu test o
// boşluğu kapatır: her PR'da index.html'e eklenen JS'in en azından
// SÖZDİZİMSEL olarak geçerli olduğunu garanti eder. Kod ÇALIŞTIRILMAZ,
// sadece `node --check` ile ayrıştırılır (parse) — hiçbir side effect yok.

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { tmpdir } from "node:os";
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

const html = readFileSync(path.join(ROOT, "index.html"), "utf-8");

// type="application/ld+json" (JSON-LD) ve src= ile yüklenen harici
// script'ler hariç, sayfadaki TÜM inline <script> bloklarını topla.
const scriptBloklari = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter((m) => !/\bsrc=/.test(m[1]) && !/type=["']application\/ld\+json["']/.test(m[1]))
  .map((m) => m[2]);

kontrol("1) en az bir inline <script> bloğu bulundu", scriptBloklari.length > 0, `bulunan: ${scriptBloklari.length}`);

{
  const tmp = mkdtempSync(path.join(tmpdir(), "sa-htmlsyntax-"));
  const birlesikYol = path.join(tmp, "combined.js");
  writeFileSync(birlesikYol, scriptBloklari.join("\n;\n"));
  let hata = null;
  try {
    execFileSync(process.execPath, ["--check", birlesikYol], { stdio: "pipe" });
  } catch (err) {
    hata = err.stderr?.toString() || err.message;
  }
  kontrol("2) tüm inline script'ler BİRLEŞTİRİLDİĞİNDE geçerli JS (node --check)", hata === null, hata ? hata.split("\n").slice(0, 3).join(" | ") : undefined);
  rmSync(tmp, { recursive: true, force: true });
}

// Ayrıca her bloğu TEK TEK de kontrol et — hangi blokta hata olduğunu
// daha kolay bulmak için (birleştirilmiş kontrol geçse de, bağımsız
// çalışması beklenen bloklar arasında sınır hatası olabilir).
{
  const tmp = mkdtempSync(path.join(tmpdir(), "sa-htmlsyntax-each-"));
  let hataliSayisi = 0;
  scriptBloklari.forEach((blok, i) => {
    const dosyaYolu = path.join(tmp, `block-${i}.js`);
    writeFileSync(dosyaYolu, blok);
    try {
      execFileSync(process.execPath, ["--check", dosyaYolu], { stdio: "pipe" });
    } catch {
      hataliSayisi++;
    }
  });
  rmSync(tmp, { recursive: true, force: true });
  // NOT: bazı bloklar kasıtlı olarak birbirine bağımlı olabilir (üstteki
  // blokta tanımlanan bir değişkeni kullanan alt blok) — bu durumda
  // TEK BAŞINA parse hatası vermez çünkü referans hatası runtime hatasıdır,
  // parse hatası değil. Bu yüzden burada sadece GERÇEK sözdizimi
  // hatalarını (eşleşmeyen parantez/tırnak vb.) yakalıyoruz.
  kontrol("3) hiçbir tek blok bağımsız sözdizimi hatası içermiyor", hataliSayisi === 0, `hatalı blok sayısı: ${hataliSayisi}`);
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
