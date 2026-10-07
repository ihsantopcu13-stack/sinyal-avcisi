// ============================================================
// GÜNÜN SORUSU → TELEGRAM KANALI
// generate-gunun-sorusu-kart.mjs'in ürettiği kartı (out/gunun-sorusu.png +
// out/gunun-sorusu-meta.json) Telegram kanalına gönderir. Cevap Telegram'ın
// "spoiler" biçimiyle gizlidir (dokununca açılır).
// gunun-sorusu-publish.yml'de Buffer adımından SONRA, continue-on-error ile
// çalışır: Telegram hatası Instagram/Facebook yayınını asla etkilemez.
//
// Modlar (TELEGRAM_MOD): deneme (varsayılan, hiçbir şey göndermez) · yayinla
// Gerekli env: TELEGRAM_BOT_TOKEN (secret), TELEGRAM_CHAT_ID (değişken)
// İsteğe bağlı: GUNUN_SORUSU_OUT (varsayılan ../video-pipeline/out)
// ============================================================

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { telegramIstemci } from "./telegram-istemci.mjs";
import { modBelirle, gununSorusuMetni, gorunurUzunluk } from "./telegram-mantigi.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.GUNUN_SORUSU_OUT || path.join(__dirname, "..", "video-pipeline", "out");
const MOD = modBelirle(process.env);
const CHAT_ID = (process.env.TELEGRAM_CHAT_ID || "").trim();

if (!CHAT_ID) { console.error("TELEGRAM_CHAT_ID tanımlı değil (repo değişkeni)"); process.exit(1); }
const tg = telegramIstemci(process.env.TELEGRAM_BOT_TOKEN);

try {
  const meta = JSON.parse(await readFile(path.join(OUT_DIR, "gunun-sorusu-meta.json"), "utf-8"));
  const kart = await readFile(path.join(OUT_DIR, "gunun-sorusu.png"));
  const { caption, ekMesaj } = gununSorusuMetni(meta.soru, meta.dogruHarf);
  if (gorunurUzunluk(caption) > 1024 || (ekMesaj === null && caption.includes("aşağıda"))) {
    throw new Error("Soru metni Telegram sınırlarını aşıyor (4096 karakter)");
  }
  const k = await tg.kanalKontrol(CHAT_ID);
  console.log(`Telegram: ${k.bot} → "${k.kanal}" — mod: ${MOD}`);

  if (MOD !== "yayinla") {
    console.log(`DENEME — gönderilmedi. Kart ${(kart.length / 1024).toFixed(0)} KB, ${ekMesaj ? "kart + ayrı mesaj" : "tek gönderi"}:\n${caption}${ekMesaj ? `\n---\n${ekMesaj}` : ""}`);
  } else {
    const foto = await tg.fotoGonder(CHAT_ID, kart, "gunun-sorusu.png", { caption, parse_mode: "HTML" });
    console.log(`✔ Kart gönderildi: mesaj ${foto.message_id}`);
    if (ekMesaj) {
      const m = await tg.mesajGonder(CHAT_ID, ekMesaj, { parse_mode: "HTML", reply_parameters: { message_id: foto.message_id }, disable_notification: true });
      console.log(`✔ Soru metni gönderildi: mesaj ${m.message_id}`);
    }
  }
} catch (e) {
  const mesaj = tg.gizle(e.message);
  console.error("✘ Telegram:", mesaj);
  console.log(`::warning title=Günün Sorusu Telegram'a gitmedi::${mesaj}`);
  process.exitCode = 1;
}
