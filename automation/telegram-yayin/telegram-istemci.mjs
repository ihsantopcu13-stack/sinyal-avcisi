// ============================================================
// Telegram Bot API istemcisi (bağımlılıksız; Node 20 fetch/FormData).
// Token hiçbir hata mesajına ya da loga yazılmaz.
// ============================================================

const API = "https://api.telegram.org";

export function telegramIstemci(token) {
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN tanımlı değil");
  const gizle = (s) => String(s ?? "").split(token).join("***");

  async function cagir(metod, govde = {}, tekrar = true) {
    const form = govde instanceof FormData;
    let res;
    try {
      res = await fetch(`${API}/bot${token}/${metod}`, {
        method: "POST",
        ...(form ? { body: govde } : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(govde) }),
      });
    } catch (e) {
      throw new Error(`Telegram ${metod}: bağlantı hatası (${gizle(e.message)})`);
    }
    const json = await res.json().catch(() => ({}));
    if (json.ok) return json.result;
    const bekle = json.parameters?.retry_after;
    if (res.status === 429 && bekle && tekrar) {
      await new Promise((r) => setTimeout(r, (bekle + 1) * 1000));
      return cagir(metod, govde, false);
    }
    throw new Error(`Telegram ${metod}: ${res.status} ${gizle(json.description ?? "bilinmeyen hata")}`);
  }

  // Bot kanalda mesaj atabilir mi? (deneme modunda ve gönderimden önce)
  async function kanalKontrol(chatId) {
    const ben = await cagir("getMe");
    const kanal = await cagir("getChat", { chat_id: chatId });
    const uye = await cagir("getChatMember", { chat_id: chatId, user_id: ben.id });
    const yonetici = uye.status === "administrator" || uye.status === "creator";
    const yazabilir = uye.status === "creator" || (yonetici && uye.can_post_messages !== false);
    if (!yazabilir) {
      throw new Error(`@${ben.username} kanalda mesaj gönderemiyor (durum: ${uye.status}). Kanal → Yöneticiler → bot → "Mesaj gönder" izni açık olmalı.`);
    }
    return { bot: `@${ben.username}`, kanal: kanal.title || kanal.username || String(chatId), tur: kanal.type };
  }

  async function dosyaGonder(metod, alan, chatId, buf, dosyaAdi, mime, ek = {}) {
    const fd = new FormData();
    fd.append("chat_id", String(chatId));
    for (const [k, v] of Object.entries(ek)) if (v !== undefined && v !== null) fd.append(k, String(v));
    fd.append(alan, new Blob([buf], { type: mime }), dosyaAdi);
    return cagir(metod, fd);
  }

  return {
    cagir,
    gizle,
    kanalKontrol,
    videoGonder: (chatId, buf, ad, ek) => dosyaGonder("sendVideo", "video", chatId, buf, ad, "video/mp4", { supports_streaming: true, ...ek }),
    fotoGonder: (chatId, buf, ad, ek) => dosyaGonder("sendPhoto", "photo", chatId, buf, ad, "image/png", ek),
    mesajGonder: (chatId, text, ek = {}) => cagir("sendMessage", { chat_id: chatId, text, link_preview_options: { is_disabled: true }, ...ek }),
  };
}
