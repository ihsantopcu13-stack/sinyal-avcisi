// ============================================================
// 📊 Sinyal Avcısı — haftalık kullanıcı raporu
// ============================================================
// Supabase'den SADECE sayım okur (count + head:true → satır verisi çekilmez,
// insert/update/delete YOK) ve sonucu Gmail SMTP ile e-posta olarak gönderir.
//
// Kişiler iki tabloda:
//   profiles       → kayıtlı (giriş yapmış) kullanıcılar
//   anon_profiles  → kayıtsız ziyaretçiler (kurtarma kodlu anonim profil)
// İki tablo arasında bağlantı alanı yok; anonimken kayıt olan biri iki
// tabloda da sayılabilir. Bu yüzden "Toplam kişi" YAKLAŞIK bir sayıdır.
//
// Ortam değişkenleri:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (zorunlu)
//   GMAIL_USER, GMAIL_APP_PASSWORD            (kuru çalışmada gerekmez)
//   RAPOR_ALICI      alıcı (varsayılan: GMAIL_USER)
//   HEDEF_KULLANICI  hedef kişi sayısı (varsayılan: 1000)
//   SINAV_TARIHI     YYYY-MM-DD (varsayılan: sıradaki 26 Kasım — sitedeki geri sayımla aynı)
//   KURU_CALISMA     "true" → e-posta gönderme, raporu log'a yaz
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { pathToFileURL } from 'node:url';

const GUN_MS = 864e5;
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// ---------- tarih yardımcıları (İstanbul takvimine göre) ----------
export function istanbulTarihi(an) {
  // en-CA biçimi YYYY-MM-DD verir
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(an);
}
function gunFarki(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number), [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / GUN_MS);
}
function gunEkle(s, n) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
export function tarihYaz(s) {
  const [y, m, d] = s.split('-').map(Number);
  return `${d} ${AYLAR[m - 1]} ${y}`;
}
export function varsayilanSinavTarihi(bugun) {
  const y = Number(bugun.slice(0, 4));
  const buYil = `${y}-11-26`;
  return gunFarki(bugun, buYil) >= 0 ? buYil : `${y + 1}-11-26`;
}
const sayi = n => n.toLocaleString('tr-TR');

// ---------- Supabase: sadece sayım ----------
export async function sayimlariAl(sb, simdi) {
  const yediGunOnce = new Date(simdi - 7 * GUN_MS).toISOString();
  const ondortGunOnce = new Date(simdi - 14 * GUN_MS).toISOString();
  async function say(tablo, filtre) {
    let q = sb.from(tablo).select('*', { count: 'exact', head: true });
    if (filtre) q = filtre(q);
    const { count, error } = await q;
    if (error) throw new Error(`${tablo} sayılamadı: ${error.message}`);
    return count ?? 0;
  }
  const tablo = ad => Promise.all([
    say(ad),
    say(ad, q => q.gte('created_at', yediGunOnce)),
    say(ad, q => q.gte('created_at', ondortGunOnce).lt('created_at', yediGunOnce))
  ]).then(([toplam, son7, onceki7]) => ({ toplam, son7, onceki7 }));
  const [kayitli, anonim] = await Promise.all([tablo('profiles'), tablo('anon_profiles')]);
  return { kayitli, anonim };
}

// ---------- hesap ----------
export function raporHesapla({ kayitli, anonim }, { hedef, sinavTarihi, bugun }) {
  const toplam = {
    toplam: kayitli.toplam + anonim.toplam,
    son7: kayitli.son7 + anonim.son7,
    onceki7: kayitli.onceki7 + anonim.onceki7
  };
  const degisim = g => (g.onceki7 > 0 ? Math.round(((g.son7 - g.onceki7) / g.onceki7) * 100) : null);
  const kalan = Math.max(0, hedef - toplam.toplam);
  const sinavaKalanGun = gunFarki(bugun, sinavTarihi);
  const gunlukHiz = toplam.son7 / 7;

  let tahmin;
  if (kalan === 0) {
    tahmin = { durum: 'ulasildi', metin: `🎉 Hedefe ulaşıldı: ${sayi(toplam.toplam)} / ${sayi(hedef)} kişi.` };
  } else if (gunlukHiz === 0) {
    tahmin = { durum: 'hayir', metin: 'Son 7 günde yeni katılım yok; bu hızla hedefe ulaşılamaz.' };
  } else {
    const gerekenGun = Math.ceil(kalan / gunlukHiz);
    const tarih = tarihYaz(gunEkle(bugun, gerekenGun));
    if (sinavaKalanGun <= 0) {
      tahmin = { durum: 'bilgi', metin: `Bu hızla (haftada ${sayi(toplam.son7)} kişi) hedefe ~${sayi(gerekenGun)} günde ulaşılır (${tarih}).` };
    } else if (gerekenGun <= sinavaKalanGun) {
      tahmin = { durum: 'evet', metin: `✅ Evet: bu hızla (haftada ${sayi(toplam.son7)} kişi) hedefe ~${sayi(gerekenGun)} günde, ${tarih} civarında ulaşılır — sınavdan ${sinavaKalanGun - gerekenGun} gün önce.` };
    } else {
      const gerekenHaftalik = Math.ceil((kalan / sinavaKalanGun) * 7);
      tahmin = { durum: 'hayir', metin: `⚠️ Hayır: bu hızla (haftada ${sayi(toplam.son7)} kişi) hedefe ~${sayi(gerekenGun)} gün gerekir. Sınava kadar yetişmesi için haftada ~${sayi(gerekenHaftalik)} yeni kişi lazım.` };
    }
  }
  return {
    kayitli: { ...kayitli, degisim: degisim(kayitli) },
    anonim: { ...anonim, degisim: degisim(anonim) },
    toplam: { ...toplam, degisim: degisim(toplam) },
    hedef, kalan, sinavTarihi, sinavaKalanGun, tahmin
  };
}

// ---------- e-posta ----------
function degisimYaz(d) {
  if (d === null) return 'önceki hafta 0, kıyas yok';
  return `önceki haftaya göre ${d > 0 ? '+' : ''}${d}%`;
}
export function epostaOlustur(r, bugun) {
  const konu = `📊 Sinyal Avcısı Haftalık Rapor – ${tarihYaz(bugun)}`;
  const satirlar = [
    ['Toplam kişi (yaklaşık)*', r.toplam],
    ['Kayıtlı', r.kayitli],
    ['Anonim', r.anonim]
  ];
  const sinav = r.sinavaKalanGun > 0 ? `${r.sinavaKalanGun} gün (${tarihYaz(r.sinavTarihi)})` : r.sinavaKalanGun === 0 ? `bugün (${tarihYaz(r.sinavTarihi)})` : `sınav geçti (${tarihYaz(r.sinavTarihi)})`;
  const dipnot = '* Kayıtlı + anonim. Anonimken kayıt olan biri iki tabloda da sayılabilir; tablolar arasında bağlantı alanı olmadığı için çift sayım düşülemiyor.';

  const metin = [
    konu, '',
    ...satirlar.map(([ad, g]) => `${ad}: ${sayi(g.toplam)} — son 7 gün +${sayi(g.son7)} (${degisimYaz(g.degisim)})`),
    '',
    `Hedef: ${sayi(r.hedef)} kişi — kalan ${sayi(r.kalan)}`,
    `Sınava kalan: ${sinav}`,
    r.tahmin.metin,
    '', dipnot
  ].join('\n');

  const renk = { evet: '#047857', hayir: '#b45309', ulasildi: '#047857', bilgi: '#374151' }[r.tahmin.durum];
  const td = 'padding:8px 10px;border-bottom:1px solid #e5e7eb';
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#111827;max-width:560px">
<h2 style="font-size:18px;margin:0 0 12px">📊 Sinyal Avcısı — ${tarihYaz(bugun)}</h2>
<table style="border-collapse:collapse;width:100%;margin-bottom:14px">
<tr><th style="${td};text-align:left">Kişiler</th><th style="${td};text-align:right">Toplam</th><th style="${td};text-align:right">Son 7 gün</th></tr>
${satirlar.map(([ad, g], i) => `<tr><td style="${td}${i === 0 ? ';font-weight:bold' : ''}">${ad}</td><td style="${td};text-align:right${i === 0 ? ';font-weight:bold' : ''}">${sayi(g.toplam)}</td><td style="${td};text-align:right">+${sayi(g.son7)}<br><span style="font-size:12px;color:#6b7280">${degisimYaz(g.degisim)}</span></td></tr>`).join('\n')}
</table>
<p style="margin:6px 0">🎯 <b>Hedef:</b> ${sayi(r.hedef)} kişi — kalan <b>${sayi(r.kalan)}</b></p>
<p style="margin:6px 0">📅 <b>Sınava kalan:</b> ${sinav}</p>
<p style="margin:12px 0;padding:10px 12px;border-radius:8px;background:#f3f4f6;color:${renk}">${r.tahmin.metin}</p>
<p style="font-size:12px;color:#6b7280;margin-top:16px">${dipnot}</p>
</div>`;
  return { konu, metin, html };
}

// ---------- ana akış ----------
async function main() {
  const env = process.env;
  const kuru = /^(1|true|evet)$/i.test(env.KURU_CALISMA || '');
  const eksik = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].concat(kuru ? [] : ['GMAIL_USER', 'GMAIL_APP_PASSWORD']).filter(k => !env[k]);
  if (eksik.length) throw new Error('Eksik secret: ' + eksik.join(', '));

  const simdi = Date.now();
  const bugun = istanbulTarihi(new Date(simdi));
  const hedef = env.HEDEF_KULLANICI ? Number(env.HEDEF_KULLANICI) : 1000;
  if (!Number.isInteger(hedef) || hedef <= 0) throw new Error(`HEDEF_KULLANICI pozitif bir tam sayı olmalı (gelen: "${env.HEDEF_KULLANICI}")`);
  const sinavTarihi = env.SINAV_TARIHI || varsayilanSinavTarihi(bugun);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sinavTarihi) || Number.isNaN(Date.parse(sinavTarihi))) throw new Error(`SINAV_TARIHI YYYY-MM-DD olmalı (gelen: "${sinavTarihi}")`);

  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const sayim = await sayimlariAl(sb, simdi);
  const rapor = raporHesapla(sayim, { hedef, sinavTarihi, bugun });
  const eposta = epostaOlustur(rapor, bugun);

  if (kuru) {
    console.log('🧪 KURU ÇALIŞMA — e-posta gönderilmedi. Gönderilecek içerik:\n');
    console.log(eposta.metin);
    return;
  }
  const alici = env.RAPOR_ALICI || env.GMAIL_USER;
  const tasiyici = nodemailer.createTransport({ service: 'gmail', auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD } });
  await tasiyici.sendMail({ from: `"Sinyal Avcısı Rapor" <${env.GMAIL_USER}>`, to: alici, subject: eposta.konu, text: eposta.metin, html: eposta.html });
  console.log(`✅ Rapor gönderildi → ${alici}\n\n${eposta.metin}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error('❌ ' + e.message); process.exit(1); });
}
