// ============================================================
// MAIL API — Resend ile e-kitap gönderimi
// Sinyal Avcısı
// ============================================================
//
// NOT: Resend hesabı domain doğrulaması tamamlanana kadar SADECE
// hesap sahibinin doğrulanmış test e-postasına gönderim yapabiliyor
// (gerçek kullanıcı e-postalarına gönderim 422 "Invalid `to` field"
// hatasıyla reddediliyor). Bu, e-posta kaybolmasın diye önce
// Supabase'deki public.emails tablosuna kaydedip, ardından Resend
// ile göndermeyi best-effort deniyoruz — Resend başarısız olsa da
// adres kayıt altına alınmış oluyor (bkz. supabase/emails-schema.sql).

import { rateLimit } from './_rateLimit.mjs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SUPABASE_URL = 'https://scqczkyiyshmczzmlshl.supabase.co';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rl = rateLimit(req, { key: 'mail', limit: 3, windowMs: 10 * 60_000 });
  if (!rl.allowed) {
    res.setHeader('Retry-After', Math.ceil(rl.retryAfterMs / 1000));
    return res.status(429).json({ error: 'Çok fazla e-posta isteği gönderdiniz. Biraz sonra tekrar deneyin.' });
  }

  let { email, tip = 'ekitap' } = req.body;

  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'Geçersiz e-posta' });
  }
  email = email.trim();

  let supabaseOk = false;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    try {
      const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/emails`, {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ email, tip }),
      });
      supabaseOk = dbRes.ok;
      if (!dbRes.ok) console.error('Supabase emails insert hatasi:', await dbRes.text());
    } catch (dbError) {
      console.error('Supabase emails insert exception:', dbError);
    }
  } else {
    console.error('mail.mjs: SUPABASE_SERVICE_ROLE_KEY tanimli degil, e-posta Supabase\'e kaydedilemedi');
  }

  const konular = {
    ekitap: '📖 30 Günlük Metin Fetih Kılavuzu — Sinyal Avcısı',
    hosgeldin: '🎯 Sinyal Avcısı\'na Hoş Geldin!',
  };

  const icerikler = {
    ekitap: `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#f8f7f3">
        <div style="background:#fff;border-radius:20px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,.08)">
          <div style="font-family:'Georgia',serif;font-size:28px;color:#1a4fd6;margin-bottom:8px">Sinyal <span style="color:#0c0e14">Avcısı</span></div>
          <hr style="border:none;border-top:2px solid #1a4fd6;margin:16px 0 24px">
          <h2 style="font-size:22px;color:#0c0e14;margin-bottom:12px">E-kitabın hazır! 🎉</h2>
          <p style="font-size:16px;color:#6b7280;line-height:1.7;margin-bottom:24px">
            <strong>30 Günlük Metin Fetih Kılavuzu</strong>'nu indirmek için aşağıdaki butona tıkla.
          </p>
          <div style="background:#eef2ff;border-radius:12px;padding:20px;margin-bottom:24px">
            <p style="font-size:14px;color:#1a4fd6;font-weight:700;margin-bottom:8px">📖 E-kitapta neler var?</p>
            <ul style="font-size:14px;color:#374151;line-height:2;margin:0;padding-left:20px">
              <li>Bağlaç sinyal haritaları</li>
              <li>Modal perfect tuzak rehberi</li>
              <li>30 günlük çalışma planı</li>
              <li>ÖSYM en sık tuzak listesi</li>
            </ul>
          </div>
          <a href="https://sinyal-avcisi.com" style="display:inline-block;background:#1a4fd6;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:700;margin-bottom:24px">
            📥 E-Kitabı İndir →
          </a>
          <p style="font-size:13px;color:#9ca3af;line-height:1.6">
            Sinyal Avcısı · YDS & YÖKDİL Hazırlık Platformu<br>
            Gelirin bir kısmı yetim çocukların eğitimi için bağışlanmaktadır ❤️
          </p>
        </div>
      </div>
    `,
  };

  let mailSent = false;
  let mailId = null;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sinyal Avcısı <info@sinyal-avcisi.com>',
        to: [email],
        subject: konular[tip] || konular.ekitap,
        html: icerikler[tip] || icerikler.ekitap,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      mailSent = true;
      mailId = data.id;
    } else {
      console.error('Resend gonderim hatasi:', data);
    }
  } catch (error) {
    console.error('Mail error:', error);
  }

  // E-posta ne Supabase'e kaydedilebildi ne de Resend ile gönderilebildiyse
  // gerçekten bir şey başaramadık — kullanıcıyı bilgilendirip tekrar denetelim.
  if (!supabaseOk && !mailSent) {
    return res.status(502).json({ error: 'E-posta kaydedilemedi, lütfen tekrar dene.' });
  }

  return res.status(200).json({ success: true, mailSent, id: mailId });
}
