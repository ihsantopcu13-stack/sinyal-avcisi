// api/_testimonialBildirim.mjs — yeni yorum Telegram bildirimi (/api/testimonial-bildirim).
// Gizli anahtar doğrulaması, düz metin (enjeksiyonsuz) mesaj, @kanal engeli
// ve "Telegram hatası yorum akışını bozmaz" davranışını doğrular.
// Ağ çağrısı yok: global fetch sahte.

import { testimonialBildirimHandler as handler, gizliDogru, metniTemizle, mesajOlustur } from "../api/_testimonialBildirim.mjs";

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const SIR = "test-gizli-anahtar-123";
const TOKEN = "123456:TEST_TOKEN_GIZLI";
const KAYIT = { isim: "Ayşe", unvan: "YDS adayı", yorum: "Çok faydalı.", yildiz: 4, onaylandi: false };

function ortam(degerler) {
  for (const k of ["TESTIMONIAL_WEBHOOK_SECRET", "TELEGRAM_BOT_TOKEN", "TELEGRAM_ADMIN_CHAT_ID", "TELEGRAM_CHAT_ID"]) delete process.env[k];
  Object.assign(process.env, degerler);
}
function sahteRes() {
  const r = { kod: null, govde: null, basliklar: {} };
  r.status = (k) => { r.kod = k; return r; };
  r.json = (g) => { r.govde = g; return r; };
  r.setHeader = (k, v) => { r.basliklar[k] = v; };
  return r;
}
let fetchCagrilari = [];
let fetchDavranis = async () => ({ status: 200, json: async () => ({ ok: true }) });
globalThis.fetch = async (url, secenek) => { fetchCagrilari.push({ url, secenek }); return fetchDavranis(url, secenek); };
const loglar = [];
const asilHata = console.error;
console.error = (...a) => loglar.push(a.join(" "));

async function cagir({ method = "POST", secret = SIR, body = { type: "INSERT", table: "testimonials", record: KAYIT } } = {}) {
  fetchCagrilari = [];
  const res = sahteRes();
  await handler({ method, headers: secret === null ? {} : { "x-webhook-secret": secret }, body }, res);
  return res;
}
const tamOrtam = { TESTIMONIAL_WEBHOOK_SECRET: SIR, TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_ADMIN_CHAT_ID: "987654321" };

// 1) yöntem ve gizli anahtar
ortam(tamOrtam);
let r = await cagir({ method: "GET" });
kontrol("1) GET → 405", r.kod === 405);
r = await cagir({ secret: null }); // null = header hiç yok
kontrol("2) header yok → 401, Telegram çağrılmadı", r.kod === 401 && fetchCagrilari.length === 0);
r = await cagir({ secret: "yanlis" });
kontrol("3) yanlış anahtar → 401, Telegram çağrılmadı", r.kod === 401 && fetchCagrilari.length === 0);
r = await cagir({ secret: SIR + "x" });
kontrol("4) uzunluğu farklı anahtar → 401", r.kod === 401);
ortam({ ...tamOrtam, TESTIMONIAL_WEBHOOK_SECRET: "" });
r = await cagir();
kontrol("5) ortamda anahtar tanımsız → 401 (boş anahtarla eşleşme yok)", r.kod === 401 && fetchCagrilari.length === 0);
kontrol("6) gizliDogru: doğru/yanlış/boş", gizliDogru(SIR, SIR) && !gizliDogru("a", SIR) && !gizliDogru("", "") && !gizliDogru(undefined, SIR));

// 2) olay türü
ortam(tamOrtam);
r = await cagir({ body: { type: "UPDATE", table: "testimonials", record: KAYIT } });
kontrol("7) UPDATE olayı → 200, gönderilmedi", r.kod === 200 && r.govde.gonderildi === false && fetchCagrilari.length === 0);
r = await cagir({ body: { type: "INSERT", table: "profiles", record: KAYIT } });
kontrol("8) başka tablo → 200, gönderilmedi", r.kod === 200 && fetchCagrilari.length === 0);

// 3) başarılı gönderim ve mesaj içeriği
r = await cagir();
const istek = fetchCagrilari[0] && JSON.parse(fetchCagrilari[0].secenek.body);
kontrol("9) INSERT → 200, Telegram'a 1 istek", r.kod === 200 && r.govde.gonderildi === true && fetchCagrilari.length === 1);
kontrol("10) özel sohbete gidiyor, parse_mode YOK (düz metin)", istek && istek.chat_id === "987654321" && !("parse_mode" in istek));
kontrol("11) mesajda isim, unvan, yıldız, yorum, onay linki", istek && /İsim: Ayşe/.test(istek.text) && /Unvan: YDS adayı/.test(istek.text) && /★★★★☆ \(4\/5\)/.test(istek.text) && /Yorum: Çok faydalı\./.test(istek.text) && istek.text.includes("Onay için: https://sinyal-avcisi.com/?admin=1"));

// 4) enjeksiyon / temizleme
const kotu = { isim: "<b>Hacker</b>‮", unvan: "[tıkla](http://kotu.example)", yorum: "<a href='x'>link</a>\u0000\u0007 *kalın* _eğik_ `kod`\n\nyeni satır", yildiz: 99 };
const m = mesajOlustur(kotu);
kontrol("12) HTML/Markdown işaretleri olduğu gibi düz metin (parse_mode yok, yorumlanmaz)", m.includes("<b>Hacker</b>") && m.includes("[tıkla](http://kotu.example)"));
kontrol("13) kontrol ve yön karakterleri temizlendi", !/[\u0000-\u0008‮]/.test(m));
kontrol("14) yorumdaki satır sonları tek satıra indi (sahte satır eklenemez)", /Yorum: <a href='x'>link<\/a> \*kalın\* _eğik_ `kod` yeni satır/.test(m));
kontrol("15) yıldız 1–5 aralığına sıkıştı", m.includes("(5/5)") && mesajOlustur({ yildiz: -3 }).includes("(1/5)"));
const uzun = metniTemizle("ğ".repeat(500), 200);
kontrol("16) yorum ~200 karakterde kesildi (+…)", Array.from(uzun).length === 201 && uzun.endsWith("…"));
kontrol("17) eksik alanlar '—'", mesajOlustur({}).includes("İsim: —") && mesajOlustur(null).includes("Yorum: —"));

// 5) Telegram hataları akışı bozmaz, token loglanmaz
loglar.length = 0;
fetchDavranis = async () => ({ status: 400, json: async () => ({ ok: false, description: "Bad Request: chat not found " + TOKEN }) });
r = await cagir();
kontrol("18) Telegram 400 → uç yine 200, gonderildi=false, hata loglandı", r.kod === 200 && r.govde.gonderildi === false && loglar.some((l) => l.includes("chat not found")));
fetchDavranis = async () => { throw new Error("ağ yok " + TOKEN); };
r = await cagir();
kontrol("19) fetch hata fırlatırsa → 200", r.kod === 200 && r.govde.gonderildi === false);
kontrol("20) token hiçbir loga yazılmadı", loglar.length > 0 && loglar.every((l) => !l.includes(TOKEN)));
fetchDavranis = async () => ({ status: 200, json: async () => ({ ok: true }) });

// 6) yapılandırma
ortam({ ...tamOrtam, TELEGRAM_ADMIN_CHAT_ID: "@sinyalavcisiyds" });
r = await cagir();
kontrol("21) TELEGRAM_ADMIN_CHAT_ID bir @kanal → gönderilmedi (onaysız yorum kanala düşmez), 200", r.kod === 200 && r.govde.gonderildi === false && fetchCagrilari.length === 0);
ortam({ TESTIMONIAL_WEBHOOK_SECRET: SIR, TELEGRAM_BOT_TOKEN: TOKEN, TELEGRAM_CHAT_ID: "@sinyalavcisiyds" });
r = await cagir();
kontrol("23) yayın otomasyonunun TELEGRAM_CHAT_ID'si kullanılmaz (yalnız TELEGRAM_ADMIN_CHAT_ID)", r.kod === 200 && r.govde.gonderildi === false && fetchCagrilari.length === 0);
ortam({ ...tamOrtam, TELEGRAM_BOT_TOKEN: "" });
r = await cagir();
kontrol("22) bot token yok → 200, gönderilmedi", r.kod === 200 && r.govde.gonderildi === false && fetchCagrilari.length === 0);

console.error = asilHata;
console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
