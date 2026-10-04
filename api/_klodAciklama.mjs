// ============================================================
// KLOD AÇIKLAMA — Sinyal Lab yanlış cevap açıklaması (mode:'aciklama')
// ============================================================
// api/klod.mjs'in erken bir dalı olarak çağrılır; sohbet akışına
// (mode:'chat') ve diğer modlara HİÇ dokunmaz.
//
// İstemci SADECE soru_id gönderir. Soru metni, şıklar, doğru cevap ve
// referans açıklama sunucuda canonical api/data/sorular.json'dan okunur —
// istemcinin gönderdiği hiçbir metin modele veya önbelleğe gitmez
// (sahte soruyla önbellek zehirlenemez).
//
// Akış: klod_aciklama tablosunda soru_id ara → kaynak_hash tutuyorsa
// döndür (model çağrısı YOK, günlük KLOD hakkı düşmez) → yoksa costGuard →
// Claude → JSON doğrula → emin:true ise service_role ile kaydet → döndür.
// JSON bozuksa kaydedilmez, dürüst hata mesajı döner.

import { createHash } from 'node:crypto';

const SUPABASE_URL = 'https://scqczkyiyshmczzmlshl.supabase.co';
const MODEL = 'claude-sonnet-5-5';
const HARFLER = ['A', 'B', 'C', 'D', 'E'];
const ALAN_MAX = 600;

export const KLOD_ACIKLAMA_PROMPT = `Sen KLOD'sun: Sinyal Avcısı'nın YDS/YÖKDİL öğretmeni.
Görevin: Verilen sorunun doğru cevabını iki katmanda açıklamak ve yanlış şıkları tek tek çürütmek.
KURALLAR
- Türkçe yaz, sade ve kısa. Her alan en fazla 2 cümle.
- Sadece sorudaki bilgiye dayan. Uydurma kural yazma.
- Anlam ilişkisini doğru adlandır: zıtlık, sebep, sonuç, koşul, zaman, amaç, ekleme, örnekleme.
  Farklı anlamdaki kelimeleri aynı gruba koyma (ör. "due to" sebeptir, "despite" zıtlıktır).
- Sana bir REFERANS AÇIKLAMA verilecek. Açıklaman onunla çelişmemeli. Çelişki varsa veya referansa katılmıyorsan "emin": false yaz.
- Emin değilsen "emin": false yaz.
- Çıktı SADECE JSON olsun. Açıklama, markdown, ön söz yok.
ÇIKTI FORMATI
{
  "dogru": "E",
  "yapi": "Boşluktan sonra ne geliyor ve bu neden bu şıkkı gerektiriyor",
  "sinyal": "Cümleler arasındaki anlam ilişkisi ve onu gösteren ipucu",
  "eleme": [{"sik": "A", "neden": "yapı uymuyor / anlam uymuyor + tek cümle"}],
  "avci_ipucu": "Bu soru tipini bir sonraki sefer 3 saniyede çözme taktiği",
  "emin": true
}`;

export function soruBul(havuz, soruId) {
  if (typeof soruId !== 'string' || !/^q\d{3,4}$/.test(soruId)) return null;
  return (Array.isArray(havuz) ? havuz : []).find(s => s && s.id === soruId) || null;
}

// Soru içeriği değişirse önbellekteki açıklama geçersiz sayılır.
export function soruHash(soru) {
  const kaynak = JSON.stringify([soru.soru_en, soru.soru_tr, soru.secenekler_tr, soru.dogru_index, soru.aciklama_tr]);
  return createHash('sha256').update(kaynak).digest('hex').slice(0, 16);
}

export function kullaniciMesaji(soru) {
  const siklar = soru.secenekler_tr.map((s, i) => `${HARFLER[i]}) ${s}`).join('\n');
  return [
    `CÜMLE (İngilizce): ${soru.soru_en}`,
    `SORU: ${soru.soru_tr}`,
    `ŞIKLAR:\n${siklar}`,
    `DOĞRU CEVAP: ${HARFLER[soru.dogru_index]}`,
    soru.sinyal ? `SİNYAL KELİME: ${soru.sinyal}` : '',
    `REFERANS AÇIKLAMA: ${soru.aciklama_tr || '(yok)'}`,
  ].filter(Boolean).join('\n');
}

function metinAlani(v) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= ALAN_MAX;
}

// Modelin ham metnini doğrular. Geçersizse { hata }, geçerliyse { aciklama }.
// Doğru harf canonical cevapla tutmazsa açıklama YANLIŞ şıkkı savunuyor
// demektir — öğrenciye gösterilmez.
export function aciklamaDogrula(hamMetin, soru) {
  if (typeof hamMetin !== 'string') return { hata: 'bos' };
  const bas = hamMetin.indexOf('{');
  const son = hamMetin.lastIndexOf('}');
  if (bas === -1 || son <= bas) return { hata: 'json_yok' };
  let j;
  try { j = JSON.parse(hamMetin.slice(bas, son + 1)); } catch { return { hata: 'json_bozuk' }; }
  if (!j || typeof j !== 'object') return { hata: 'json_bozuk' };

  const sikSayisi = soru.secenekler_tr.length;
  const gecerliHarfler = HARFLER.slice(0, sikSayisi);
  const dogruHarf = HARFLER[soru.dogru_index];
  if (typeof j.dogru !== 'string' || j.dogru.trim().toUpperCase() !== dogruHarf) return { hata: 'dogru_uyusmuyor' };
  for (const alan of ['yapi', 'sinyal', 'avci_ipucu']) {
    if (!metinAlani(j[alan])) return { hata: 'alan_eksik:' + alan };
  }
  if (typeof j.emin !== 'boolean') return { hata: 'emin_eksik' };
  if (!Array.isArray(j.eleme)) return { hata: 'eleme_eksik' };

  const beklenen = gecerliHarfler.filter(h => h !== dogruHarf);
  const eleme = [];
  const gorulen = new Set();
  for (const e of j.eleme) {
    const sik = e && typeof e.sik === 'string' ? e.sik.trim().toUpperCase().replace(/[).]/g, '') : '';
    if (!beklenen.includes(sik) || gorulen.has(sik) || !metinAlani(e.neden)) return { hata: 'eleme_gecersiz' };
    gorulen.add(sik);
    eleme.push({ sik, neden: e.neden.trim() });
  }
  if (gorulen.size !== beklenen.length) return { hata: 'eleme_eksik_sik' };
  eleme.sort((a, b) => a.sik.localeCompare(b.sik));

  return {
    aciklama: {
      dogru: dogruHarf,
      yapi: j.yapi.trim(),
      sinyal: j.sinyal.trim(),
      eleme,
      avci_ipucu: j.avci_ipucu.trim(),
      emin: j.emin,
    },
  };
}

function okumaAnahtari(env) {
  return env.SUPABASE_ANON_KEY || 'sb_publishable_RDVMnTcB60LjI8n6gBI1Pw__9YVVZHp';
}

async function onbellektenOku(soruId, env, fetchFn) {
  try {
    const anahtar = okumaAnahtari(env);
    const r = await fetchFn(
      `${SUPABASE_URL}/rest/v1/klod_aciklama?soru_id=eq.${encodeURIComponent(soruId)}&select=aciklama&limit=1`,
      { headers: { apikey: anahtar, Authorization: `Bearer ${anahtar}` } }
    );
    if (!r.ok) return null;
    const satirlar = await r.json();
    return Array.isArray(satirlar) && satirlar[0] ? satirlar[0].aciklama : null;
  } catch {
    return null; // önbellek erişilemezse modelden üretmeye devam
  }
}

// Yalnızca service_role ile yazılır; anahtar yoksa kaydetmeden geçer.
async function onbellegeYaz(soruId, aciklama, env, fetchFn) {
  const anahtar = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!anahtar) return false;
  try {
    const r = await fetchFn(`${SUPABASE_URL}/rest/v1/klod_aciklama?on_conflict=soru_id`, {
      method: 'POST',
      headers: {
        apikey: anahtar,
        Authorization: `Bearer ${anahtar}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ soru_id: soruId, aciklama, olusturma: new Date().toISOString() }),
    });
    if (!r.ok) console.error('[klod-aciklama] kayıt hatası:', r.status, await r.text());
    return r.ok;
  } catch (e) {
    console.error('[klod-aciklama] kayıt hatası:', e.message);
    return false;
  }
}

function istemciyeAciklama(a) {
  return { dogru: a.dogru, yapi: a.yapi, sinyal: a.sinyal, eleme: a.eleme, avci_ipucu: a.avci_ipucu, emin: a.emin };
}

const HATA_MESAJI = 'KLOD bu soru için şu an güvenilir bir açıklama üretemedi. Biraz sonra tekrar dene ya da sohbette sor.';

export async function klodAciklamaIsle(req, res, { havuz, costGuard, env = process.env, fetchFn = fetch }) {
  const soru = soruBul(havuz, req.body && req.body.soru_id);
  if (!soru || !Array.isArray(soru.secenekler_tr) || !HARFLER[soru.dogru_index]) {
    return res.status(400).json({ error: 'Geçersiz istek' });
  }
  const hash = soruHash(soru);

  const onbellek = await onbellektenOku(soru.id, env, fetchFn);
  if (onbellek && onbellek.kaynak_hash === hash) {
    return res.status(200).json({ aciklama: istemciyeAciklama(onbellek), kaynak: 'onbellek' });
  }

  const cg = await costGuard(req, false /* anonim */);
  if (cg.blocked) return res.status(cg.status).json(cg.json);

  let hamMetin;
  try {
    const r = await fetchFn('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        system: KLOD_ACIKLAMA_PROMPT,
        messages: [{ role: 'user', content: kullaniciMesaji(soru) }],
      }),
    });
    if (!r.ok) {
      console.error('[klod-aciklama] Anthropic hatası:', r.status, await r.text());
      return res.status(502).json({ error: HATA_MESAJI });
    }
    const data = await r.json();
    hamMetin = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  } catch (e) {
    console.error('[klod-aciklama] istek hatası:', e.message);
    return res.status(502).json({ error: HATA_MESAJI });
  }

  const sonuc = aciklamaDogrula(hamMetin, soru);
  if (sonuc.hata) {
    console.error('[klod-aciklama] geçersiz çıktı', soru.id, sonuc.hata);
    return res.status(502).json({ error: HATA_MESAJI });
  }

  let kaydedildi = false;
  if (sonuc.aciklama.emin) {
    kaydedildi = await onbellegeYaz(soru.id, { ...sonuc.aciklama, kaynak_hash: hash }, env, fetchFn);
  }
  return res.status(200).json({ aciklama: sonuc.aciklama, kaynak: 'model', kaydedildi });
}
