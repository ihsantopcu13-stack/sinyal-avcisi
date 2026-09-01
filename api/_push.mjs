// ============================================================
// Paylaşılan Web Push gönderim yardımcıları
// api/admin-broadcast.mjs ve api/cron-streak-risk.mjs tarafından kullanılır
// ============================================================
import webpush from 'web-push';

const SUPABASE_URL = 'https://scqczkyiyshmczzmlshl.supabase.co';

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  webpush.setVapidDetails(
    'mailto:destek@sinyal-avcisi.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  vapidConfigured = true;
}

export async function fetchAllSubscriptions(serviceRoleKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth,user_id`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  });
  if (!res.ok) throw new Error('subscriptions fetch failed: ' + await res.text());
  return res.json();
}

export async function fetchSubscriptionsForUsers(serviceRoleKey, userIds) {
  if (!userIds.length) return [];
  const inList = userIds.map(id => `"${id}"`).join(',');
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth,user_id&user_id=in.(${inList})`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
  );
  if (!res.ok) throw new Error('subscriptions fetch failed: ' + await res.text());
  return res.json();
}

async function deleteStaleSubscription(serviceRoleKey, id) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
  } catch (e) { /* sessizce yut — temizlik başarısız olursa kritik değil */ }
}

export async function sendPushToSubscriptions(subscriptions, payload, serviceRoleKey) {
  ensureVapid();
  let sent = 0, failed = 0, cleaned = 0;
  await Promise.allSettled(subscriptions.map(async sub => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err) {
      failed++;
      // 410 Gone / 404 Not Found = tarayıcı aboneliği artık geçersiz kılmış
      if (err.statusCode === 410 || err.statusCode === 404) {
        cleaned++;
        await deleteStaleSubscription(serviceRoleKey, sub.id);
      }
    }
  }));
  return { sent, failed, cleaned, total: subscriptions.length };
}
