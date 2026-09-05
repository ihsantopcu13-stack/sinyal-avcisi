// ============================================================
// Instagram gönderi görseli — Edge fonksiyonu (Vercel OG / Satori)
// ============================================================
// Instagram Graph API, gönderiyi yayınlamak için PUBLİK bir image_url
// ister (dosya yüklemesi kabul etmez) — bu endpoint tam olarak o URL'i
// sağlar. İçerik JSON'ı, ayrı bir depolama katmanı gerekmesin diye query
// string'de base64 olarak taşınır (Instagram'ın container oluşturma
// isteği bu URL'i çağırdığında anlık üretilip döner).
//
// GÜVENLİK NOTU: Bu endpoint kimliksiz herkese açıktır (Instagram'ın
// sunucuları buraya kimlik bilgisi olmadan istek atar) — ama sadece
// STATELESS bir görsel render eder, hiçbir veriyi okumaz/yazmaz, bu
// yüzden anon erişim güvenlidir.

import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

function h(type, props, ...children) {
  // Satori, birden fazla çocuğu olan HER <div>'de açık "display" bekler
  // (flex/none) — hangi div'de unutulduğunu ayıklamak yerine, tüm div'lere
  // varsayılan olarak display:flex veriyoruz (stil içinde override edilebilir).
  const style = type === 'div' ? { display: 'flex', ...props?.style } : props?.style;
  return { type, props: { ...props, style, children: children.flat() } };
}

function sinyalKart(d) {
  return h('div', {
    style: {
      display: 'flex', flexDirection: 'column', width: '1080px', height: '1080px',
      background: 'linear-gradient(135deg,#0a1428,#0a0c14)', padding: '70px',
      fontFamily: 'sans-serif', color: '#ece7da', position: 'relative',
    },
  },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' } },
      h('div', { style: { fontSize: '44px' } }, '🎯'),
      h('div', { style: { fontSize: '38px', fontWeight: 800, color: '#f5a623' } }, 'SİNYAL AVCISI'),
    ),
    h('div', { style: { display: 'flex', fontSize: '30px', fontWeight: 700, color: '#22d3ee', marginBottom: '20px' } }, 'Bugünün Sorusu'),
    h('div', { style: { display: 'flex', fontSize: '38px', lineHeight: 1.4, marginBottom: '36px' } }, d.soru || ''),
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '30px', color: 'rgba(236,231,218,.85)' } },
      ...(d.siklar || []).map(s => h('div', { style: { display: 'flex' } }, s)),
    ),
    h('div', {
      style: {
        display: 'flex', flexDirection: 'column', marginTop: '48px', padding: '28px 32px',
        background: 'rgba(245,166,35,.12)', border: '2px solid rgba(245,166,35,.35)', borderRadius: '20px',
      },
    },
      h('div', { style: { display: 'flex', fontSize: '26px', fontWeight: 700, color: '#f5a623', marginBottom: '10px' } }, `📇 Kelime: ${d.kelime || ''} — ${d.kelime_anlam || ''}`),
      h('div', { style: { display: 'flex', fontSize: '26px', color: 'rgba(236,231,218,.8)' } }, `💡 ${d.ipucu || ''}`),
    ),
    h('div', { style: { display: 'flex', position: 'absolute', bottom: '50px', right: '70px', fontSize: '26px', color: 'rgba(236,231,218,.5)' } }, 'sinyal-avcisi.com'),
  );
}

function ai5dkKart(d) {
  return h('div', {
    style: {
      display: 'flex', flexDirection: 'column', width: '1080px', height: '1080px',
      background: 'linear-gradient(135deg,#1a0a2e,#0a0c14)', padding: '70px',
      fontFamily: 'sans-serif', color: '#ece7da', position: 'relative',
    },
  },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' } },
      h('div', { style: { fontSize: '44px' } }, '🤖'),
      h('div', { style: { fontSize: '38px', fontWeight: 800, color: '#a78bfa' } }, 'AI İLE 5 DAKİKA'),
    ),
    h('div', { style: { display: 'flex', fontSize: '44px', fontWeight: 800, lineHeight: 1.3, marginBottom: '32px', color: '#22d3ee' } }, d.baslik || ''),
    h('div', { style: { display: 'flex', fontSize: '34px', lineHeight: 1.5, marginBottom: '40px' } }, d.ipucu || ''),
    h('div', {
      style: {
        display: 'flex', flexDirection: 'column', marginTop: 'auto', padding: '28px 32px',
        background: 'rgba(167,139,250,.12)', border: '2px solid rgba(167,139,250,.35)', borderRadius: '20px',
      },
    },
      h('div', { style: { display: 'flex', fontSize: '24px', fontWeight: 700, color: '#a78bfa', marginBottom: '10px' } }, '✍️ Hemen dene:'),
      h('div', { style: { display: 'flex', fontSize: '26px', color: 'rgba(236,231,218,.85)' } }, d.ornek || ''),
    ),
    h('div', { style: { display: 'flex', position: 'absolute', bottom: '50px', right: '70px', fontSize: '26px', color: 'rgba(236,231,218,.5)' } }, 'sinyal-avcisi.com'),
  );
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const brand = url.searchParams.get('brand') || 'sinyal';
    const encoded = url.searchParams.get('d') || '';
    const data = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));

    const element = brand === '5dk' ? ai5dkKart(data) : sinyalKart(data);

    return new ImageResponse(element, { width: 1080, height: 1080 });
  } catch (e) {
    return new Response('Görsel üretilemedi: ' + e.message, { status: 400 });
  }
}
