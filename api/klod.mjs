// ============================================================
// KLOD API — Sinyal Avcısı AI Backend
// 20 Pro Prompt Engineering Tekniği Uygulandı
// ============================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { rateLimit } from './_rateLimit.mjs';
import { costGuard } from './_costGuard.mjs';
import { originIzinliMi, klodGovdesiniDogrula, toplamKarakter, SINIRLAR } from './_requestGuard.mjs';
import * as Pedagoji from './_avciPedagogy.mjs';
import { KLOD_CHAT_SYSTEM_PROMPT } from './_klodChatPrompt.mjs';

// RAG — gerçek soru bankası. data/sorular.json (bu dosya) TEK canonical
// source-of-truth'tur — frontend (index.html'deki SL_HAVUZ) ve video
// pipeline (automation/video-pipeline) buradan üretilir/beslenir, tersi
// değil (bkz. scripts/sl-havuz-generator.mjs). Modül yüklenirken bir kere
// okunuyor, soğuk başlangıç dışında sıcak fonksiyon çağrılarında tekrar
// disk I/O yok.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let SORU_HAVUZU = [];
try {
  SORU_HAVUZU = JSON.parse(readFileSync(path.join(__dirname, 'data', 'sorular.json'), 'utf-8'));
} catch (e) {
  console.error('Soru havuzu yüklenemedi (RAG devre dışı, devam ediliyor):', e.message);
}

// Kullanıcının mesajında geçen sinyal kelimeye (despite, must have, by no
// means...) göre gerçek soru bankasından 1-2 örnek bulur. Basit anahtar
// kelime eşleştirmesi — 59 kayıtlık bir havuz için vektör arama gereksiz
// karmaşıklık olurdu. Eşleşme yoksa boş dizi döner, KLOD normal (RAG'sız)
// çalışmaya devam eder.
function ilgiliSorulariBul(kullaniciMesaji, limit = 2) {
  if (!kullaniciMesaji || SORU_HAVUZU.length === 0) return [];
  const metin = kullaniciMesaji.toLowerCase();
  return SORU_HAVUZU
    .filter((s) => s.sinyal && metin.includes(s.sinyal.toLowerCase()))
    .slice(0, limit);
}

// ============================================================
// KATMAN 5B — SİNYAL LAB CURRENT QUESTION CONTEXT (2026-09-18)
// ============================================================
// STUDENT MODEL/WEAK AREA/ANSWER HISTORY/DIAGNOSTIC/user_id/email HİÇ
// eklenmedi — bu SADECE paylaşılan canonical soru içeriği + öğrencinin
// bu TEK soruya verdiği anlık cevap. Client'ın gönderdiği hiçbir alana
// (özellikle correct_answer/is_correct'e) KÖRÜ KÖRÜNE güvenilmez:
// question_id ile SORU_HAVUZU'ndaki (RAG için zaten yüklü, frontend'deki
// SL_HAVUZ ile AYNI canonical source, bkz. scripts/sl-havuz-generator.mjs)
// KENDİ kopyasından doğrulanır/türetilir. Bilinmeyen question_id veya
// malformed context (yanlış tip/şekil) SESSİZCE null döner — çağıran
// (handler) bunu mevcut context'siz KLOD davranışına dönerek ele alır,
// hiçbir hata/uyarı kullanıcıya sızmaz.
//
// CEVAP ÖNCESİ (context.answered !== true): correct_answer/is_correct
// asla üretilmez — LLM'e giden context'te bu alanlar hiç YOKTUR (prompt
// talimatına güvenmek yerine alan seviyesinde çıkarma). CEVAP SONRASI:
// correct_answer SADECE server'ın kendi canonical kopyasından türetilir;
// client'ın context.correct_answer/context.is_correct alanları HİÇ
// OKUNMAZ — sahte/manipüle edilmiş bir "doğru cevap" iddiası canonical'ı
// değiştiremez. is_correct de client'a güvenilmeden, sadece client'ın
// (salt bir OLGU olarak) bildirdiği selected_answer metni ile server'ın
// kendi doğru cevabı karşılaştırılarak server'da yeniden hesaplanır.
function klodSinyalLabBaglamiDogrula(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return null;
  if (context.module !== 'sinyal_lab') return null;
  if (typeof context.question_id !== 'string' || !context.question_id) return null;
  const canonical = SORU_HAVUZU.find((s) => s.id === context.question_id);
  if (!canonical) return null; // bilinmeyen question_id → context sessizce atılır

  const dogrulanmis = {
    module: 'sinyal_lab',
    question_id: canonical.id,
    question_text: `${String(canonical.soru_en || '')}\n\nSORU: ${String(canonical.soru_tr || '')}`.slice(0, 600),
    options: Array.isArray(canonical.secenekler_tr) ? canonical.secenekler_tr.slice(0, 4).map((o) => String(o).slice(0, 200)) : [],
    signal: canonical.sinyal ? String(canonical.sinyal).slice(0, 50) : null,
    answered: context.answered === true,
  };

  if (dogrulanmis.answered) {
    const dogruMetin = Array.isArray(canonical.secenekler_tr) ? canonical.secenekler_tr[canonical.dogru_index] : null;
    const secilenMetin = typeof context.selected_answer === 'string' ? context.selected_answer.slice(0, 200).trim() : null;
    dogrulanmis.correct_answer = dogruMetin ? String(dogruMetin).slice(0, 200) : null;
    dogrulanmis.selected_answer = secilenMetin;
    dogrulanmis.is_correct = secilenMetin !== null && dogruMetin !== null ? secilenMetin === String(dogruMetin).trim() : null;
  }

  return dogrulanmis;
}

// ============================================================
// KATMAN 5E — CANLI AVCI HOCA <-> AKILLI TAHTA KÖPRÜSÜ (2026-09-18)
// ============================================================
// LLM'e ASLA arbitrary JavaScript/HTML/CSS selector/DOM path/eval/
// innerHTML payload/URL/SQL üretme YETKİSİ verilmez. Tool_use şeması
// (BOARD_ACTION_TOOL) SADECE sabit bir action adı + kısa, düz metin
// alanları kabul eder — ama şemaya bile KÖRÜ KÖRÜNE güvenilmez: her
// action burada (klodBoardActionlariDogrula) YENİDEN, canonical veriye
// karşı doğrulanır (defense-in-depth, 5B'nin "client'a güvenme, kendi
// canonical kopyandan doğrula" ilkesiyle AYNI).
//
// Aktif Sinyal Lab sorusu yoksa (dogrulanmisBaglam null) board_actions
// HER ZAMAN boş dizidir — board sadece GERÇEKTEN görünen bir soru
// üzerinde çalışabilir, hayali/varsayımsal bir soru üzerinde ASLA.
//
// ELIMINATE_OPTION ve SHOW_AVCI_REFLEX: dogrulanmisBaglam.answered
// KESİNLİKLE true olmalı, aksi halde SUNUCU TARAFINDA DROP edilir —
// 5B'nin answer-leak kilidi board seviyesine BİREBİR taşınıyor (cevap
// öncesi hiçbir action doğru cevabı elemeyle/göstererek sızdıramaz).
const BOARD_ACTION_ALLOWLIST = new Set([
  'HIGHLIGHT_VERB', 'SHOW_SVO', 'HIGHLIGHT_SIGNAL', 'SHOW_LEFT_RIGHT',
  'SHOW_HINT', 'SHOW_AVCI_REFLEX', 'CLEAR_BOARD', 'ELIMINATE_OPTION',
]);

const BOARD_ACTION_TOOL = {
  name: 'avci_board_actions',
  description: "Aktif Sinyal Lab sorusu ekranda görünürken, o AN anlattığın AVCI adımını GÖRSEL olarak desteklemek için tahtada küçük, yapılandırılmış hareketler öner. SADECE gerçekten öğretici bir andaysa çağır — her mesajda çağırman GEREKMEZ. TEK seferde EN FAZLA 2-3 küçük hareket öner (7 adımı bir kerede doldurma, Socratic tek-adım kuralına uy). ZORUNLU ZAMANLAMA KURALI: öğrenciden bir bilgiyi (fiil/S+V+O/sinyal/sağ-sol) bulmasını SEN İSTEDİĞİN aynı mesajda, o bilginin cevabını gösteren HIGHLIGHT_VERB/SHOW_SVO/HIGHLIGHT_SIGNAL/SHOW_LEFT_RIGHT'ı ASLA çağırma — sormakla aynı anda cevabı göstermek demektir. Bu dört action SADECE öğrenci o adımda en az bir GERÇEK deneme yaptıktan SONRA (doğrulamak/düzeltmek için) veya öğrenci açıkça çözüm istediğinde (çözüm modu) kullanılabilir. ELIMINATE_OPTION ve SHOW_AVCI_REFLEX SADECE öğrenci soruyu zaten cevapladıysa anlamlıdır.",
  input_schema: {
    type: 'object',
    properties: {
      actions: {
        type: 'array',
        maxItems: 3,
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: Array.from(BOARD_ACTION_ALLOWLIST),
              description: 'Yapılacak tahta hareketi.',
            },
            text: { type: 'string', description: 'HIGHLIGHT_VERB/HIGHLIGHT_SIGNAL: aktif cümlede GERÇEKTEN geçen kelime/ifade (uydurma). SHOW_HINT/SHOW_AVCI_REFLEX: kısa, düz metin (HTML/kod YOK).' },
            subject: { type: 'string', description: 'SHOW_SVO: cümlede GERÇEKTEN geçen özne metni.' },
            verb: { type: 'string', description: 'SHOW_SVO: cümlede GERÇEKTEN geçen fiil metni.' },
            object: { type: 'string', description: 'SHOW_SVO: cümlede GERÇEKTEN geçen nesne metni.' },
            left: { type: 'string', description: 'SHOW_LEFT_RIGHT: cümlede GERÇEKTEN geçen sol taraf metni.' },
            right: { type: 'string', description: 'SHOW_LEFT_RIGHT: cümlede GERÇEKTEN geçen sağ taraf metni.' },
            option_index: { type: 'integer', description: 'ELIMINATE_OPTION: elenecek şıkkın 0 tabanlı indexi. SADECE öğrenci zaten cevapladıysa kullan.' },
          },
          required: ['type'],
        },
      },
    },
    required: ['actions'],
  },
};

function klodDuzMetinKirp(s, maxLen) {
  if (typeof s !== 'string') return null;
  const temiz = s.replace(/[<>]/g, '').trim(); // HTML/etiket parçacıkları defense-in-depth olarak burada da kırpılır (client zaten textContent kullanıyor)
  if (!temiz) return null;
  return temiz.slice(0, maxLen);
}
function klodAltDizeMi(aday, kaynakMetin) {
  if (typeof aday !== 'string' || !aday.trim()) return false;
  return String(kaynakMetin || '').toLowerCase().includes(aday.trim().toLowerCase());
}

// dogrulanmisBaglam: yukarıdaki klodSinyalLabBaglamiDogrula()'nın SONUCU
// (zaten canonical'a göre doğrulanmış). canonical: AYNI question_id için
// SORU_HAVUZU'ndaki ham kayıt (soru_en/sinyal/dogru_index/secenekler_tr
// gibi ELIMINATE_OPTION/HIGHLIGHT_SIGNAL doğrulaması için gereken ek
// alanlara erişmek için ayrıca geçiriliyor — dogrulanmisBaglam bilerek
// bunları LLM'e giden haliyle TUTMUYOR).
function klodBoardActionlariDogrula(rawActions, dogrulanmisBaglam, canonical) {
  if (!dogrulanmisBaglam || !canonical || !Array.isArray(rawActions)) return [];
  const aktifCumle = String(canonical.soru_en || '');
  const sonuc = [];
  for (const raw of rawActions.slice(0, 3)) {
    if (!raw || typeof raw !== 'object' || typeof raw.type !== 'string') continue;
    if (!BOARD_ACTION_ALLOWLIST.has(raw.type)) continue; // bilinmeyen action → DROP

    if (raw.type === 'CLEAR_BOARD') {
      sonuc.push({ type: 'CLEAR_BOARD' });
      continue;
    }

    if (raw.type === 'HIGHLIGHT_SIGNAL') {
      const metin = klodDuzMetinKirp(raw.text, 60);
      const canonicalSinyal = canonical.sinyal ? String(canonical.sinyal).trim().toLowerCase() : null;
      if (metin && canonicalSinyal && metin.toLowerCase() === canonicalSinyal) {
        sonuc.push({ type: 'HIGHLIGHT_SIGNAL', text: metin });
      } // canonical sinyalle eşleşmiyorsa (sahte/uydurma sinyal) sessizce DROP
      continue;
    }

    if (raw.type === 'HIGHLIGHT_VERB') {
      const metin = klodDuzMetinKirp(raw.text, 60);
      if (metin && klodAltDizeMi(metin, aktifCumle)) {
        sonuc.push({ type: 'HIGHLIGHT_VERB', text: metin });
      } // aktif cümlenin gerçek bir alt dizesi değilse (uydurma metin) DROP
      continue;
    }

    if (raw.type === 'SHOW_SVO') {
      const s = raw.subject !== undefined ? klodDuzMetinKirp(raw.subject, 80) : null;
      const v = raw.verb !== undefined ? klodDuzMetinKirp(raw.verb, 80) : null;
      const o = raw.object !== undefined ? klodDuzMetinKirp(raw.object, 80) : null;
      // sağlanan HER parça aktif cümlenin gerçek bir alt dizesi olmalı;
      // biri bile uydurmaysa (cümlede yoksa) TÜM action reddedilir.
      const gecerli = (s === null || klodAltDizeMi(s, aktifCumle)) && (v === null || klodAltDizeMi(v, aktifCumle)) && (o === null || klodAltDizeMi(o, aktifCumle));
      if (gecerli && (s || v || o)) {
        sonuc.push({ type: 'SHOW_SVO', subject: s, verb: v, object: o });
      }
      continue;
    }

    if (raw.type === 'SHOW_LEFT_RIGHT') {
      const sol = raw.left !== undefined ? klodDuzMetinKirp(raw.left, 80) : null;
      const sag = raw.right !== undefined ? klodDuzMetinKirp(raw.right, 80) : null;
      const gecerli = (sol === null || klodAltDizeMi(sol, aktifCumle)) && (sag === null || klodAltDizeMi(sag, aktifCumle));
      if (gecerli && (sol || sag)) {
        sonuc.push({ type: 'SHOW_LEFT_RIGHT', left: sol, right: sag });
      }
      continue;
    }

    if (raw.type === 'SHOW_HINT') {
      const metin = klodDuzMetinKirp(raw.text, 300);
      if (metin) sonuc.push({ type: 'SHOW_HINT', text: metin });
      continue;
    }

    if (raw.type === 'SHOW_AVCI_REFLEX') {
      if (dogrulanmisBaglam.answered !== true) continue; // cevap öncesi KESİNLİKLE DROP
      const metin = klodDuzMetinKirp(raw.text, 400);
      if (metin) sonuc.push({ type: 'SHOW_AVCI_REFLEX', text: metin });
      continue;
    }

    if (raw.type === 'ELIMINATE_OPTION') {
      if (dogrulanmisBaglam.answered !== true) continue; // BEFORE ANSWER → SUNUCU TARAFINDA KESİNLİKLE DROP
      const idx = Number.isInteger(raw.option_index) ? raw.option_index : null;
      const secenekSayisi = Array.isArray(canonical.secenekler_tr) ? canonical.secenekler_tr.length : 0;
      if (idx !== null && idx >= 0 && idx < secenekSayisi && idx !== canonical.dogru_index) {
        sonuc.push({ type: 'ELIMINATE_OPTION', option_index: idx });
      } // geçersiz index VEYA gerçek doğru cevabı elemeye çalışıyorsa DROP
      continue;
    }
  }
  return sonuc;
}

// ============================================================
// KATMAN 5 MVP-1 — KLOD AUTH FOUNDATION (2026-09-18)
// ============================================================
// Kişisel context (soru/öğrenci/teşhis) HENÜZ eklenmedi — bu SADECE
// gelecekteki context işi için önkoşul olan kimlik doğrulama temelidir.
// Client (dnavChat) varsa geçerli Supabase session token'ını
// `Authorization: Bearer <token>` ile gönderir; burada admin-users.mjs
// ile AYNI desenle (GET {SUPABASE_URL}/auth/v1/user, anon key + kullanıcı
// token'ı) doğrulanır. service_role GEREKMİYOR/KULLANILMIYOR — sadece
// token'ın GEÇERLİ bir Supabase session'a ait olduğu teyit ediliyor.
//
// KRİTİK: Doğrulama BAŞARISIZ olursa (header yok/bozuk/token geçersiz/
// süresi dolmuş/ağ hatası) istek REDDEDİLMEZ — "zorunlu kayıt yok"
// ilkesi ve mevcut misafir/anonim deneyim (bkz. index.html
// _sbAnonBaslat) ASLA bozulmaz; sadece doğrulanmamış (auth.verified:
// false) sayılır. Bu turda doğrulanmış identity (user.id) hiçbir
// prompt/context'e eklenmiyor — sadece yanıtta PII içermeyen bir
// boolean çift olarak (`auth.verified`/`auth.anonymous`) dönüyor,
// gelecekteki context işi için altyapı. Client'ın gönderebileceği
// herhangi bir user_id/email/role alanı (req.body'de zaten hiç
// okunmuyor) ASLA güvenilmez — kimlik SADECE bu sunucu-taraflı
// doğrulamadan gelir.
const SUPABASE_URL_AUTH = 'https://scqczkyiyshmczzmlshl.supabase.co';
const SUPABASE_ANON_KEY_AUTH = process.env.SUPABASE_ANON_KEY || 'sb_publishable_RDVMnTcB60LjI8n6gBI1Pw__9YVVZHp';

async function klodDogrulanmisKullaniciAl(authHeader) {
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  try {
    const userRes = await fetch(`${SUPABASE_URL_AUTH}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY_AUTH, Authorization: `Bearer ${token}` },
    });
    if (!userRes.ok) return null;
    const user = await userRes.json();
    // KATMAN 5C: `token` alanı SADECE server'ın kendi izleyen REST okuması
    // (answer_history, RLS auth.uid()=user_id) için tutulur — hiçbir zaman
    // response'a/prompt'a/loglara yazılmaz (bkz. klodOgrenciKanitiniAl).
    return user && user.id ? { id: user.id, isAnonymous: Boolean(user.is_anonymous), token } : null;
  } catch (e) {
    // Token DEĞERİ hiçbir zaman loglanmaz — sadece genel bir teşhis nedeni.
    console.warn('[klod-auth] token verification skipped:', { reason: 'unexpected error' });
    return null;
  }
}

// ============================================================
// KATMAN 5C — SERVER-SIDE STUDENT MODEL CONTEXT (2026-09-18)
// ============================================================
// index.html'deki avciOgrenciModeliHesapla() (Katman 3, PR #21+) ile
// BİREBİR AYNI formül — FORMÜL DEĞİŞTİRİLMEDİ, sadece server'da tekrar
// çalıştırılabilir hale getirmek için buraya taşındı (bkz.
// tests/avci-klod-student-context.test.mjs — client/server parity testi
// AYNI fixture üzerinde AYNI sonucu doğrular). Amaç: client'ın kendi
// hesapladığı "başarı oranım %95" gibi bir özeti OLDUĞU GİBİ /api/klod'a
// göndermesine güvenmemek (5B'de correct_answer için kapattığımız AYNI
// sınıf risk) — server, doğrulanmış kullanıcının KENDİ token'ıyla RLS
// korumalı answer_history'yi kendisi okuyup AYNI formülü kendisi
// hesaplar. Client'tan gelen HERHANGİ bir "student context" iddiası HİÇ
// OKUNMAZ/kullanılmaz (req.body'de böyle bir alan zaten HİÇ okunmuyor).
//
// service_role KULLANILMIYOR — sadece anon/publishable key + kullanıcının
// kendi doğrulanmış Bearer token'ı. RLS (`answer_history_own`,
// auth.uid()=user_id) kullanıcı izolasyonunu zaten sağlıyor — admin-
// users.mjs'nin service_role'ü SADECE admin panelinde (RLS'i kasıtlı
// bypass etmesi GEREKEN tek yer) kullandığı deseninin AKSİNE, burada
// hiç gerekmiyor: her kullanıcı zaten SADECE kendi satırını istiyor.
//
// AUTH VERIFIED=false (verifiedUser null) ise bu fonksiyon HİÇ
// çağrılmaz/DB sorgusu ATILMAZ (bkz. handler). REST 401/403/timeout/ağ
// hatası → SESSİZCE null, chat ASLA bloklanmaz — 5A/5B ile AYNI fail-
// open felsefesi.
async function klodOgrenciKanitiniAl(verifiedUser) {
  if (!verifiedUser || !verifiedUser.token) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL_AUTH}/rest/v1/answer_history?select=signal,topic,is_correct,answered_at,response_time_ms&order=answered_at.desc&limit=500`,
      { headers: { apikey: SUPABASE_ANON_KEY_AUTH, Authorization: `Bearer ${verifiedUser.token}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows : null;
  } catch (e) {
    console.warn('[klod-student-context] answer_history read skipped:', { reason: 'unexpected error' });
    return null;
  }
}

// index.html'deki avciOgrenciModeliHesapla()'nın İÇ formülü (KANIT_ESIGI_
// DUSUK/YETERLI=2/5, SON_N=5, kanitGuveni/recentAccuracy/longTermAccuracy/
// reflex/profilEtiketi) — BİREBİR AYNI, tek satırı bile değişmedi. Ayrı
// bir yardımcıya çıkarılmasının SEBEBİ: hem "gruplanmış" (signal/topic
// bazlı, weak_evidence için — klodOgrenciModeliHesapla) hem "tek grup"
// (TÜM satırlar birlikte, overall için) modda ÇAĞRILABİLMESİ — hesabın
// KENDİSİ hiç değişmedi, sadece iki yerden çağrılabilir hale getirildi.
function klodGrupIstatistigi(olaylarHam) {
  const KANIT_ESIGI_DUSUK = 2, KANIT_ESIGI_YETERLI = 5, SON_N = 5;
  const olaylar = olaylarHam.slice().sort((a, b) => new Date(b.answered_at || 0) - new Date(a.answered_at || 0));
  const toplam = olaylar.length;
  const dogruSayisi = olaylar.filter((o) => o.is_correct).length;
  const sonGorulme = olaylar[0]?.answered_at || null;
  const kanitGuveni = toplam < KANIT_ESIGI_DUSUK ? 'YETERSİZ_KANIT' : toplam < KANIT_ESIGI_YETERLI ? 'DÜŞÜK_KANIT' : 'YETERLİ_KANIT';
  const sonN = olaylar.slice(0, SON_N);
  const recentAccuracy = sonN.length ? Math.round((sonN.filter((o) => o.is_correct).length / sonN.length) * 100) : null;
  const longTermAccuracy = toplam ? Math.round((dogruSayisi / toplam) * 100) : null;
  const zamanliOlaylar = olaylar.filter((o) => typeof o.response_time_ms === 'number' && o.response_time_ms > 0);
  const reflex = zamanliOlaylar.length ? { ortalamaSureMs: Math.round(zamanliOlaylar.reduce((s, o) => s + o.response_time_ms, 0) / zamanliOlaylar.length), kanitSayisi: zamanliOlaylar.length } : null;
  let profilEtiketi = 'YETERSİZ_KANIT';
  if (kanitGuveni !== 'YETERSİZ_KANIT') {
    profilEtiketi = longTermAccuracy >= 80 ? 'GÜÇLÜ' : longTermAccuracy >= 50 ? 'GELİŞİYOR' : 'ÇALIŞILACAK';
  }
  // uygulama/gerekce: client'taki (index.html) fonksiyonla BİREBİR aynı
  // sabit 'VERİ_YOK' alanları — tam parity için korunuyor (bkz. parity
  // testi), ama klodStudentContextOlustur bunları LLM'e giden objeye HİÇ
  // kopyalamıyor (cherry-pick, spread değil) — sızıntı riski yok.
  return { evidenceCount: toplam, lastSeen: sonGorulme, kanitGuveni, recentAccuracy, longTermAccuracy, reflex, uygulama: 'VERİ_YOK', gerekce: 'VERİ_YOK', profilEtiketi };
}

// index.html'deki avciOgrenciModeliHesapla() ile BİREBİR AYNI gruplama +
// evidenceCount'a göre sıralama + slice(0,10) — client/server parity
// testi bunu index.html'in GERÇEK kaynağıyla karşılaştırıyor.
function klodOgrenciModeliHesapla(satirlar) {
  const gruplar = {};
  for (const r of (satirlar || [])) {
    const anahtar = String(r.signal || r.topic || '').trim();
    if (!anahtar) continue;
    if (!gruplar[anahtar]) gruplar[anahtar] = [];
    gruplar[anahtar].push(r);
  }
  return Object.entries(gruplar)
    .map(([anahtar, olaylarHam]) => ({ anahtar, ...klodGrupIstatistigi(olaylarHam) }))
    .sort((a, b) => b.evidenceCount - a.evidenceCount)
    .slice(0, 10);
}

// KATMAN 5C — LLM'e giden STUDENT_CONTEXT'i inşa eder. SADECE İZİNLİ
// alanlar: overall (evidence_count/accuracy/recent_accuracy/evidence_
// confidence), reflex (SADECE gerçek kanıt varsa — yoksa alan hiç
// eklenmez), weak_evidence (EN FAZLA 3, SADECE kanitGuveni!=='YETERSİZ_
// KANIT' olan gruplardan, en düşük accuracy önce — "YETERSİZ_KANIT ≠
// zayıf" ilkesi gereği kanıtı yetersiz bir konuyu ASLA "zayıf alan" gibi
// GÖSTERMİYORUZ). user_id/email/profile/raw satır/timestamp listesi/
// bireysel cevaplar/knowledge-recognition-application-reasoning tahmini/
// diagnostic_events/Katman 4 hypothesis/kişilik etiketi (profilEtiketi
// dahil) KESİNLİKLE BURADA YOK.
function klodStudentContextOlustur(satirlar) {
  const genel = klodGrupIstatistigi(satirlar || []);
  const gruplanmis = klodOgrenciModeliHesapla(satirlar);
  const zayifKanitlar = gruplanmis
    .filter((g) => g.kanitGuveni !== 'YETERSİZ_KANIT')
    .sort((a, b) => a.longTermAccuracy - b.longTermAccuracy)
    .slice(0, 3)
    .map((g) => ({
      konu: String(g.anahtar).slice(0, 60),
      evidence_count: g.evidenceCount,
      accuracy: g.longTermAccuracy,
      evidence_confidence: g.kanitGuveni,
    }));

  const context = {
    overall: {
      evidence_count: genel.evidenceCount,
      accuracy: genel.longTermAccuracy,
      recent_accuracy: genel.recentAccuracy,
      evidence_confidence: genel.kanitGuveni,
    },
    weak_evidence: zayifKanitlar,
  };
  if (genel.reflex) {
    context.reflex = { ortalama_sure_ms: genel.reflex.ortalamaSureMs, kanit_sayisi: genel.reflex.kanitSayisi };
  }
  return context;
}

// 1. SYSTEM PROMPT — Tutarlı karakter tanımı
const KLOD_SYSTEM_PROMPT = `Sen KLOD'sun — Sinyal Avcısı platformunun YDS/YÖKDİL AI öğretmenisin.

ROL: 20 yıllık YDS sınav hazırlık uzmanısın. ÖSYM soru kalıplarını ezbere biliyorsun. Türkçe konuşuyorsun.

AVCI MASTER PRENSİBİ:
1. SORU TÜRÜNÜ TANI → 2. SİNYALİ BUL → 3. YAPIYI TANI → 4. SAĞ/SOL KONTROL → 5. S+V+O → 6. ŞIKLARI ELE → 7. KRİTİK FARKI BUL → 8. KANITLA → 9. CEVABI AVLA

SİNYAL KELİME RADARI:
- although/despite/yet/however/whereas = ZIT + yapı farkına dikkat
- because/since/therefore/thus = NEDEN-SONUÇ
- by no means/far from/hardly/scarcely = GİZLİ OLUMSUZ
- must have/should have/could have = MODAL PERFECT
- by the time/no sooner than/prior to = ZAMAN SIRASI
- provided that/unless/as long as = KOŞUL

ÖĞRETME TARZI:
- Cevabı hemen verme — önce ipucu, sonra yönlendir
- Chain of thought: önce kuralı açıkla, sonra neden bu şık doğru
- Kısa ve net: MAX 3-4 cümle, asla uzun paragraflar yazma
- Öğrenciyi düşündür, ezber yaptırma
- Tablo kullanma, sadece düz metin ve **bold** kullan
- Her cevap maksimum 80 kelime

6. NEGATİF PROMPTING — Bunları yapma:
- B2 altı basit kelime kullanma
- Türkçe-İngilizce karışık yazma
- "Doğru cevap X'dir" diye direkt söyleme
- Açıklama olmadan sadece cevap verme`;

// 5. FEW-SHOT EXAMPLES — Kalibrasyon örnekleri
const FEW_SHOT_EXAMPLES = [
  {
    role: "user",
    content: "despite ne demek?"
  },
  {
    role: "assistant", 
    content: `<düşünce>
Kural: "despite" = zıtlık edatı, arkasından NOUN/V-ing gelir (S+V değil!)
Fark: "although" S+V ister, "despite" noun ister
</düşünce>

"Despite" = "-e rağmen" anlamında ZIT sinyal.

Sağ kontrolü: despite → noun/V-ing bekliyoruz
✅ "Despite the rain..." (noun)
✅ "Despite being tired..." (V-ing)  
❌ "Despite she was tired..." (S+V — YANLIŞ!)

ÖSYM bunu nasıl sorar? "Despite ___" boşluğuna fiil koydurup kandırır. Gördüğünde sağına bak — isim mi, fiil mi?`
  }
];

// 14. PROMPT CACHING — System prompt'u cache'le (maliyet %80 düşer)
const CACHED_HEADERS = {
  'Content-Type': 'application/json',
  'anthropic-version': '2023-06-01',
  'anthropic-beta': 'prompt-caching-2024-07-31'
};

// 9. OUTPUT FORMAT — XML yapısı için parser
function parseXMLOutput(text) {
  const result = { text, soru: null, siklar: null, aciklama: null, zorluk: null };
  
  const soruMatch = text.match(/<soru>([\s\S]*?)<\/soru>/);
  const sikMatch = text.match(/<siklar>([\s\S]*?)<\/siklar>/);
  const aciklamaMatch = text.match(/<aciklama>([\s\S]*?)<\/aciklama>/);
  const zorlukMatch = text.match(/<zorluk>([\s\S]*?)<\/zorluk>/);
  
  if (soruMatch) result.soru = soruMatch[1].trim();
  if (sikMatch) result.siklar = sikMatch[1].trim();
  if (aciklamaMatch) result.aciklama = aciklamaMatch[1].trim();
  if (zorlukMatch) result.zorluk = zorlukMatch[1].trim();
  
  return result;
}

// 20. TOKEN COUNTING — Context limiti kontrolü
function estimateTokens(messages) {
  const totalChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
  return Math.ceil(totalChars / 4); // Yaklaşık token sayısı
}

// 7. TEMPERATURE — Görev tipine göre ayar
function getTemperature(messageType) {
  if (messageType === 'soru_uret') return 0.8;   // Yaratıcılık
  if (messageType === 'aciklama') return 0.2;    // Kesinlik
  if (messageType === 'degerlendirme') return 0.3; // Dengeli
  return 0.5; // Varsayılan
}

// Mesaj tipini algıla
function detectMessageType(messages) {
  const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() || '';
  if (lastMsg.includes('soru üret') || lastMsg.includes('soru yaz')) return 'soru_uret';
  if (lastMsg.includes('açıkla') || lastMsg.includes('neden')) return 'aciklama';
  if (lastMsg.includes('değerlendir') || lastMsg.includes('puanla')) return 'degerlendirme';
  return 'chat';
}

// 16. TOOL USE — Araç tanımları
const TOOLS = [
  {
    name: "soru_olustur",
    description: "YDS/YÖKDİL formatında yapılandırılmış soru oluştur",
    input_schema: {
      type: "object",
      properties: {
        soru: { type: "string", description: "Soru metni" },
        siklar: { 
          type: "array", 
          items: { type: "string" },
          description: "4 seçenek"
        },
        dogru_sik: { type: "number", description: "Doğru şık indeksi (0-3)" },
        aciklama: { type: "string", description: "Neden doğru açıklaması" },
        sinyal: { type: "string", description: "Sinyal kelime" },
        zorluk: { type: "number", description: "1-5 arası zorluk" }
      },
      required: ["soru", "siklar", "dogru_sik", "aciklama", "sinyal", "zorluk"]
    }
  },
  {
    name: "soru_degerlendir",
    description: "Üretilen sorunun YDS standartlarına uygunluğunu değerlendir",
    input_schema: {
      type: "object",
      properties: {
        puan: { type: "number", description: "1-10 arası kalite puanı" },
        geri_bildirim: { type: "string", description: "İyileştirme önerileri" },
        yds_uygun: { type: "boolean", description: "YDS standardında mı?" }
      },
      required: ["puan", "geri_bildirim", "yds_uygun"]
    }
  }
];

// Avcı Çözüm Motoru — paragraf sorusu panelinin çözüm metni. Serbest metin +
// streaming kullanıyoruz (tool_use değil): kullanıcı "1-2 saniyede sonuç,
// anlık yazsın" istedi — tool_use'un JSON delta'ları typewriter göstermek için
// uygun değil, düz metni parça parça ekrana yazdırmak çok daha hızlı hissettiriyor.
// İstemci tarafı, ŞIKLAR bölümündeki "A) <emoji>" satırlarını regex ile
// yakalayıp o şıkkı canlı canlı renklendiriyor — format SIKI TUTULMALI.
// Altın kurallar sabit/genel geçer olduğu için AI'a ürettirilmiyor — panelde
// anında (API beklemeden) statik gösteriliyor, bu da hem hızı hem tutarlılığı
// artırıyor (bkz. index.html sinyalPaneliAc).
const SINYAL_ANALIZ_SYSTEM_PROMPT = `Sen Sinyal Avcısı platformunun Avcı Çözüm Motorusun. Sana bir YDS/YÖKDİL paragraf okuma sorusu (paragraf + soru + şıklar) verilecek.

TARZ: Doğal, sohbet gibi Türkçe konuş — bebek gibi anlaşılır anlat, ağır gramer terimleriyle boğma. ÇOK KISA yaz, toplam 110 kelimeyi geçme. Sadece paragraftaki bilgiye dayan, dış bilgi/varsayım kullanma.

ÇIKTIYI TAM OLARAK BU FORMATTA VER (başlıkları, emojileri, satır düzenini DEĞİŞTİRME):

SİNYAL KELİMESİ: <sinyal kelime/ifade> — <kategori: bağlaç/gizli olumsuz/modal perfect/zaman sinyali/koşul/zıtlık>. <ne anlama geldiği, 1 basit cümle>

PARAGRAF ANALİZİ:
Sinyal öncesi (tuzak kısım): <1 kısa cümle, basit dille>
Sinyal sonrası (asıl cevap): <1 kısa cümle, basit dille>

ŞIK ELİMİNASYONU:
A) <EMOJI> <max 10 kelimelik gerekçe>
B) <EMOJI> <max 10 kelimelik gerekçe>
C) <EMOJI> <max 10 kelimelik gerekçe>
D) <EMOJI> <max 10 kelimelik gerekçe>

CEVAP: <harf> (çözüm süresi: ~<n> saniye)

<EMOJI> kesinlikle şu 4 emojiden biri olmalı (başka işaret KULLANMA, açıklama ekleme, sadece emoji koy):
- 🔴: şık paragrafta hiç geçmiyor / paragrafla çelişiyor → direkt elenir
- 🟡: şık kısmen doğru ama tam isabetli olmayan bir tuzak
- 🟠: şık paragraftaki bir bilgiyi abartıyor/aşırı yorumluyor
- ✅: paragrafça tam desteklenen doğru cevap (yalnızca 1 şık ✅ olmalı, sinyal kelimesinden SONRAKİ bilgiye dayanmalı)`;

// 17. VISION — PDF/Görsel analiz
async function visionAnaliz(imageBase64, mediaType, soru) {
  return {
    role: "user",
    content: [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType || "image/jpeg",
          data: imageBase64
        }
      },
      {
        type: "text",
        text: soru || "Bu YDS/YÖKDİL soru görselini analiz et, soruları çöz ve açıkla."
      }
    ]
  };
}

// ============================================================
// AVCI — İPUCU CEVAP-SIZINTISI ARKA KORUMASI (KATMAN 5 FINAL SINAV / TURBO #8)
// ============================================================
// Gerçek model doğrulamasında (2/2 temiz koşu) AVCI'nin, prompt'taki "soru
// cümlesini yeniden yazma/kalın gösterme" yasağına rağmen, öğrencinin kısa
// bir cevap denemesine verdiği ipucu/geri adım mesajlarında soru cümlesinin
// bir parçasını (çoğu kez CEVABI içeren kısmı) kalın alıntı olarak tekrar
// yazdığı kanıtlandı. Prompt tek başına yetmediği için bu DETERMINISTIK,
// FAIL-OPEN bir arka korumadır: SADECE mode==='chat' (dnavChat), stream
// OLMAYAN, doğrulanmış aktif Sinyal Lab sorusu CEVAPLANMAMIŞKEN, önceki
// asistan mesajı açık bir soruyla bittiğinde ve öğrenci mesajı kısa bir
// cevap denemesi olduğunda (açık çözüm/anlamadım/özetle/devam/soru işareti
// vb. istekleri HARİÇ) çalışır. Yanıttaki, soru cümlesinden BİREBİR kopyalanmış
// 2+ kelimelik dizileri "…" ile değiştirir — öğrencinin KENDİ yazdığı ifadeler
// (onay mesajlarında geri söylenenler) ve tek kelimelik anmalar DOKUNULMAZ.
// Herhangi bir hata → orijinal metin aynen döner (yanıt ASLA bloklanmaz).
function klodKatla(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const KLOD_IPUCU_ISTISNA_DESENI = /cozum|pes ettim|acikla|anlamadim|tekrar anlat|bastan|ozetle|yaptik|calistik|mini soru|test et|sonraki|bugunluk|anladim|devam|\?/;

function klodIpucuYanitiMi(messages, dogrulanmisBaglam) {
  try {
    if (!dogrulanmisBaglam || dogrulanmisBaglam.answered) return false;
    if (!Array.isArray(messages) || messages.length < 3) return false;
    const son = messages[messages.length - 1];
    const onceki = messages[messages.length - 2];
    if (!son || son.role !== 'user' || typeof son.content !== 'string') return false;
    if (!onceki || onceki.role !== 'assistant' || typeof onceki.content !== 'string') return false;
    if (!/\?[\s*_"')\]]*$/.test(onceki.content.trim())) return false;
    const sonMetin = son.content.trim();
    if (!sonMetin || sonMetin.split(/\s+/).length > 8) return false;
    if (KLOD_IPUCU_ISTISNA_DESENI.test(klodKatla(sonMetin))) return false;
    return true;
  } catch (e) {
    return false;
  }
}

const KLOD_KELIME_DESENI = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const KLOD_YUMUSAK_AYIRAC = /^[ \t*_"'“”‘’.,;:…()[\]—–-]{0,8}$/;

function klodSoruIfadesiSizintisiniTemizle(yanit, soruEn, ogrenciMetni) {
  try {
    if (typeof yanit !== 'string' || !yanit || typeof soruEn !== 'string' || !soruEn) return yanit;
    const soruKelimeleri = (soruEn.match(KLOD_KELIME_DESENI) || []).map(klodKatla);
    if (soruKelimeleri.length < 2) return yanit;
    const jetonlar = [];
    for (const m of yanit.matchAll(KLOD_KELIME_DESENI)) {
      jetonlar.push({ t: klodKatla(m[0]), s: m.index, e: m.index + m[0].length });
    }
    const ogrenciKelimeleri = ` ${((ogrenciMetni || '').match(KLOD_KELIME_DESENI) || []).map(klodKatla).join(' ')} `;
    const aralar = [];
    for (let i = 0; i < jetonlar.length;) {
      let enUzun = 0;
      for (let j = 0; j < soruKelimeleri.length; j++) {
        let L = 0;
        while (
          i + L < jetonlar.length && j + L < soruKelimeleri.length &&
          jetonlar[i + L].t === soruKelimeleri[j + L] &&
          (L === 0 || KLOD_YUMUSAK_AYIRAC.test(yanit.slice(jetonlar[i + L - 1].e, jetonlar[i + L].s)))
        ) L++;
        if (L > enUzun) enUzun = L;
      }
      if (enUzun >= 2) {
        const dizi = ` ${jetonlar.slice(i, i + enUzun).map((x) => x.t).join(' ')} `;
        if (!ogrenciKelimeleri.includes(dizi)) {
          let bas = jetonlar[i].s;
          let son = jetonlar[i + enUzun - 1].e;
          // Aralık içinde tek kalan (eşsiz) ** varsa eşini de kapsa — yetim kalın işareti bırakma.
          if (((yanit.slice(bas, son).match(/\*\*/g) || []).length) % 2 === 1) {
            if (yanit.startsWith('**', son)) son += 2;
            else if (bas >= 2 && yanit.slice(bas - 2, bas) === '**') bas -= 2;
          }
          aralar.push([bas, son]);
        }
        i += enUzun;
      } else {
        i += 1;
      }
    }
    if (aralar.length === 0) return yanit;
    let sonuc = yanit;
    for (let k = aralar.length - 1; k >= 0; k--) {
      sonuc = sonuc.slice(0, aralar[k][0]) + '…' + sonuc.slice(aralar[k][1]);
    }
    return sonuc
      .replace(/…\.+/g, '…')
      .replace(/…(\s*…)+/g, '…')
      .replace(/\*\*\s*(["“”'‘’]?\s*…\s*["“”'‘’]?)\s*\*\*/g, '$1');
  } catch (e) {
    return yanit;
  }
}

// ============================================================
// AVCI PEDAGOJI KONTROLCUSU — handler köprüsü (bkz. _avciPedagogy.mjs)
// ============================================================
// TEK ÇAĞRI: öğretmen çağrısı dışında model çağrısı YOK. Yanıt ÖNCESİ: durumu
// doğrula; öğrenci cevap denemesiyse (mevcut klodIpucuYanitiMi kapısı) önceki
// duruma göre hüküm-işareti yönergesini system'e ekle. Yanıt SONRASI: işareti
// ayıkla (görünür yanıta/board'a asla sızmaz), geçişi kod uygular, yanıtı
// duruma göre KUR. Fail-open: hata => kontrolcü yok. Çözüm isteği /
// cevaplanmış soru => durum DÜŞER (tuzağa düşürme YOK).
function klodPedagojiHazirla(body, messages, baglam, systemContent) {
  const bos = { aktif: false, mod: null, yeniDurum: null };
  try {
    if (!baglam || baglam.answered) return bos;
    const qid = baglam.question_id;
    const son = Array.isArray(messages) ? messages[messages.length - 1] : null;
    const sonMetin = son && typeof son.content === 'string' ? son.content : '';
    if (Pedagoji.cozumIstegiMi(sonMetin)) return bos;
    const gecerli = Pedagoji.durumuDogrula(body && body.controller_state, { qid, messages });
    const n = messages.length + 1;
    const tasi = (d) => (d ? { ...d, n } : null);
    if (!klodIpucuYanitiMi(messages, baglam)) return { aktif: false, mod: null, yeniDurum: tasi(gecerli) };
    const pending = Pedagoji.soruCumlesiCikar(messages[messages.length - 2].content);
    const canonical = SORU_HAVUZU.find((s) => s.id === qid);
    if (!pending || !canonical) return { aktif: false, mod: null, yeniDurum: tasi(gecerli) };
    systemContent.push({ type: 'text', text: Pedagoji.dogrulamaYonergesi(gecerli ? gecerli.faz : null) });
    return { aktif: true, mod: null, yeniDurum: tasi(gecerli), gecerli, pending, cumle: canonical.soru_en, ogrenciMetni: sonMetin, qid, n, tohum: messages.length };
  } catch (e) {
    return bos;
  }
}

const KLOD_ISARET_TEMIZLE = /\[{1,2}\s*V\s*=?\s*[A-Za-z]{0,8}\s*\]{0,2}/g;

function klodPedagojiUygula(pedagoji, data) {
  const sonuc = { mod: pedagoji.mod, yeniDurum: pedagoji.yeniDurum, yedek: false, kontrollu: false };
  try {
    if (!Array.isArray(data.content)) return sonuc;
    // 1) Her chat yanıtında işareti AYIKLA (metin + tool_use girdisi): görünür yanıta/board'a sızmasın.
    const hukumler = [];
    let bozuk = false;
    let modelMetni = '';
    let ilkMetin = null;
    for (const blok of data.content) {
      if (!blok) continue;
      if (blok.type === 'text' && typeof blok.text === 'string') {
        const a = Pedagoji.isaretiAyikla(blok.text);
        blok.text = a.temiz;
        hukumler.push(...a.hukumler);
        if (a.bozuk) bozuk = true;
        modelMetni += (modelMetni ? '\n' : '') + a.temiz;
        if (ilkMetin === null) ilkMetin = blok;
      } else if (blok.type === 'tool_use' && blok.input) {
        try { blok.input = JSON.parse(JSON.stringify(blok.input).replace(KLOD_ISARET_TEMIZLE, '')); } catch (e) { /* girdi bozuksa olduğu gibi */ }
      }
    }
    if (!pedagoji.aktif) return sonuc;
    // 2) Hüküm -> deterministik geçiş -> yanıtı duruma göre KUR.
    const hukum = Pedagoji.nihaiHukum(hukumler, bozuk);
    const k = Pedagoji.yanitiKur({
      gecerli: pedagoji.gecerli,
      hukum,
      pending: pedagoji.pending,
      modelMetni,
      ogrenciMetni: pedagoji.ogrenciMetni,
      tohum: pedagoji.tohum,
      verbatimIhlalMi: (q) => klodSoruIfadesiSizintisiniTemizle(q, pedagoji.cumle, pedagoji.ogrenciMetni) !== q,
    });
    sonuc.mod = k.mod;
    sonuc.yedek = k.yedek;
    sonuc.yeniDurum = k.yeni
      ? { v: Pedagoji.PEDAGOJI_SURUM, qid: pedagoji.qid, faz: k.yeni.faz, orig: k.yeni.orig, n: pedagoji.n }
      : null;
    sonuc.kontrollu = k.mod !== 'ADVANCE';
    // Pending soru çıkarılamadığı için HOLD şablonu kurulamadıysa (metin null): model metni işaretsiz geçer.
    if (k.metin !== null && ilkMetin) {
      ilkMetin.text = k.metin;
      for (const blok of data.content) {
        if (blok && blok !== ilkMetin && blok.type === 'text') blok.text = '';
      }
    } else if (k.metin === null) {
      sonuc.kontrollu = false;
    }
  } catch (e) {
    // fail-open: yanıt bloklanmaz
  }
  return sonuc;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // İSTEK KORUMASI — başka sitelerden (tarayıcı üzerinden) kullanımı engelle
  if (!originIzinliMi(req.headers.origin)) {
    return res.status(403).json({ error: 'İzin verilmeyen kaynak' });
  }

  const rl = rateLimit(req, { key: 'klod', limit: 15, windowMs: 60_000 });
  if (!rl.allowed) {
    res.setHeader('Retry-After', Math.ceil(rl.retryAfterMs / 1000));
    return res.status(429).json({ error: 'Çok fazla istek gönderdiniz. Biraz sonra tekrar deneyin.' });
  }
  // IP başına günlük tavan (best-effort, instance başına) — costGuard'ın
  // anon_id'si istemciden geldiği için değiştirilerek aşılabiliyor.
  const rlGun = rateLimit(req, { key: 'klod-gun', limit: 400, windowMs: 24 * 60 * 60_000 });
  if (!rlGun.allowed) {
    res.setHeader('Retry-After', Math.ceil(rlGun.retryAfterMs / 1000));
    return res.status(429).json({ error: 'Günlük istek sınırına ulaşıldı. Yarın tekrar deneyin.' });
  }

  // Boyut / biçim sınırları — model çağrısından ve costGuard'ın sayaç
  // artırımından ÖNCE (geçersiz istek kullanıcının günlük hakkını yemesin).
  const gecersiz = klodGovdesiniDogrula(req.body);
  if (gecersiz) {
    return res.status(400).json({ error: gecersiz });
  }

  // COST GUARD — günlük limit kontrolü
  const cg = await costGuard(req, false /* anonim */);
  if (cg.blocked) {
    return res.status(cg.status).json(cg.json);
  }

  const { messages, mode, use_tools, image_base64, image_type, image_soru } = req.body;
  // İstemcinin gönderdiği `system` HİÇBİR modda kullanılmaz: aksi halde bu
  // endpoint kendi talimatını gönderen herkes için genel amaçlı bir Claude
  // vekili olurdu. KLOD sohbeti (mode==='chat') sunucudaki birebir kopyayı
  // kullanır; `system` dolu olduğu için aşağıdaki RAG bloğu KLOD'da eskisi
  // gibi (dnavChat hep system gönderdiğinden) ÇALIŞMAZ. Diğer modlarda
  // `system` boştur → varsayılan prompt + RAG, istemci system göndermeyen
  // DILA/dilaSor/demo sohbetinde olduğu gibi aynen devam eder.
  const system = mode === 'chat' ? KLOD_CHAT_SYSTEM_PROMPT : null;

  // KATMAN 5 MVP-1 — best-effort kimlik doğrulama (bkz. yukarıdaki blok).
  // Başarısız/eksik olması isteği ASLA engellemez.
  const verifiedUser = await klodDogrulanmisKullaniciAl(req.headers.authorization);

  // 20. TOKEN COUNTING — Limit kontrolü
  const estimatedTokens = estimateTokens(messages);
  if (estimatedTokens > 150000) {
    return res.status(400).json({ 
      error: 'Konuşma çok uzadı', 
      message: 'Yeni bir sohbet başlatın',
      token_estimate: estimatedTokens
    });
  }

  // 7. TEMPERATURE — Görev tipine göre
  const msgType = detectMessageType(messages);
  const temperature = mode === 'sinyal_analiz' ? 0.1 : getTemperature(msgType); // paragrafa sıkı sadakat, yaratıcılık istemiyoruz

  // 17. VISION — Görsel varsa mesaja ekle
  let processedMessages = messages;
  if (image_base64) {
    const visionMsg = await visionAnaliz(image_base64, image_type, image_soru);
    processedMessages = [...messages, visionMsg];
  }

  // 13. LONG CONTEXT — Geçmiş mesajları akıllıca kırp
  const maxMessages = estimatedTokens > 50000 ? 6 : 20;
  const trimmedMessages = processedMessages.slice(-maxMessages);
  // Modele GİDECEK kısmın toplam boyutu (kırpmadan SONRA — uzun sohbetler
  // eskisi gibi çalışsın, sadece tek istekte aşırı büyük girdi reddedilsin)
  if (toplamKarakter(trimmedMessages) > SINIRLAR.toplamKarakter) {
    return res.status(400).json({ error: 'Konuşma çok uzadı', message: 'Yeni bir sohbet başlatın' });
  }

  // 12. MULTISHOT CALIBRATION — İyi/kötü örnek ekle
  const calibratedMessages = mode === 'soru_uret' 
    ? [...FEW_SHOT_EXAMPLES, ...trimmedMessages]
    : trimmedMessages;

  // 14. PROMPT CACHING — Cache'li system prompt
  const defaultSystem = mode === 'sinyal_analiz' ? SINYAL_ANALIZ_SYSTEM_PROMPT : KLOD_SYSTEM_PROMPT;
  const systemContent = [
    {
      type: "text",
      text: system || defaultSystem,
      cache_control: { type: "ephemeral" } // Cache'le!
    }
  ];

  // RAG — öğrencinin son mesajında bir sinyal kelime geçiyorsa, gerçek soru
  // bankasından örnek(ler)i AYRI, cache'lenmeyen bir system bloğu olarak
  // ekle. Ana prompt'u değiştirmiyoruz ki yukarıdaki cache_control hit
  // oranı bozulmasın — sadece bu ek blok isteğe göre değişiyor.
  // sinyal_analiz zaten kendi paragrafından grounded olduğu ve caller
  // özel bir `system` verdiğinde onun isteğine karışmamak için atlanıyor.
  if (!system && mode !== 'sinyal_analiz') {
    const sonKullaniciMesaji = [...trimmedMessages].reverse().find((m) => m.role === 'user');
    const mesajMetni =
      typeof sonKullaniciMesaji?.content === 'string'
        ? sonKullaniciMesaji.content
        : Array.isArray(sonKullaniciMesaji?.content)
          ? sonKullaniciMesaji.content.find((b) => b.type === 'text')?.text || ''
          : '';
    const ilgiliSorular = ilgiliSorulariBul(mesajMetni);
    if (ilgiliSorular.length > 0) {
      const ornekMetni = ilgiliSorular.map((s) => `- "${s.soru_en}" → ${s.aciklama_tr}`).join('\n');
      systemContent.push({
        type: "text",
        text: `Aşağıdaki örnek(ler) Sinyal Avcısı platformunun GERÇEK soru bankasından, senin bilgi tabanının bir parçası olarak veriliyor. Amaç birebir alıntılamak değil — açıklamanın bu örneklerle TUTARLI ve DOĞRU olması. "Erişimim yok" / "platform veritabanına bağlı değilim" deme; bu bilgi zaten sende var, kendi bilgin gibi kullan. Öğrenci örnek cümleyi birebir isterse, ÖSYM telif hassasiyeti nedeniyle birebir alıntılamak yerine aynı yapıyı KENDİ örneğinle göster:\n${ornekMetni}`,
      });
    }
  }

  // KATMAN 5B — SİNYAL LAB CURRENT QUESTION CONTEXT: RAG bloğunun aksine
  // `system` override'ından BAĞIMSIZ eklenir (dnavChat HER ZAMAN kendi
  // system'ini gönderiyor — RAG'ın `!system` şartını burada uygulamak bu
  // context'i asla göndermemek anlamına gelirdi). Ayrı, cache'lenmeyen bir
  // ek blok olarak eklenir — ana (cache'lenen) system prompt'a KARIŞMAZ.
  // Doğrulama/türetme TAMAMEN yukarıdaki klodSinyalLabBaglamiDogrula()'da;
  // burada sadece sonucu (varsa) prompt'a yazıyoruz.
  const dogrulanmisBaglam = klodSinyalLabBaglamiDogrula(req.body.context);
  if (dogrulanmisBaglam) {
    systemContent.push({
      type: 'text',
      text: `AKTİF SORU BAĞLAMI (öğrenci şu an Sinyal Lab'da bu soruya bakıyor — bu bir teşhis/kimlik verisi DEĞİLDİR, sadece paylaşılan canonical soru içeriğidir, öğrencinin kimliği/geçmişi/zayıf alanları hakkında HİÇBİR bilgi içermez):\n${JSON.stringify(dogrulanmisBaglam)}\n\nBu bağlamı öğrencinin "bu soruda", "niye B değil", "burada X neden olmaz" gibi referanslarını çözmek için kullan. ${dogrulanmisBaglam.answered ? 'Öğrenci bu soruyu ZATEN CEVAPLADI, doğru cevabı ve doğru/yanlış olduğunu biliyorsun — buna göre açıklayabilirsin.' : 'Öğrenci bu soruyu HENÜZ CEVAPLAMADI — doğru cevap SANA DA GÖNDERİLMEDİ, bilmiyorsun. Doğrudan söyleme, ipucuyla düşündürerek yönlendir.'}`,
    });
  }

  // KATMAN 5C — SERVER-SIDE STUDENT MODEL CONTEXT: SADECE auth.verified
  // (verifiedUser) varsa DB'ye gidiyor — doğrulanmamış istekte HİÇBİR
  // sorgu atılmaz, STUDENT_CONTEXT hiç üretilmez. `system` override'ından
  // BAĞIMSIZ eklenir (5B ile AYNI gerekçe). Doğrulama/hesaplama TAMAMEN
  // yukarıdaki klodOgrenciKanitiniAl/klodStudentContextOlustur'da; burada
  // sadece sonucu (varsa) prompt'a yazıyoruz.
  const ogrenciSatirlari = await klodOgrenciKanitiniAl(verifiedUser);
  const studentContext = ogrenciSatirlari ? klodStudentContextOlustur(ogrenciSatirlari) : null;
  if (studentContext) {
    systemContent.push({
      type: 'text',
      text: `ÖĞRENCİ KANIT ÖZETİ (öğrencinin GEÇMİŞ performansından türetilmiş, doğrulanmış bir aggregate — isim/e-posta/kimlik bilgisi İÇERMEZ, sadece sayısal kanıt):\n${JSON.stringify(studentContext)}\n\nGÜVENLİ KULLANIM KURALLARI (ZORUNLU):\n- YETERSİZ_KANIT = zayıf öğrenci DEĞİLDİR, sadece henüz az veri var demektir.\n- Az kanıtla (evidence_count düşükken) kesin bir öğrenci özelliği/karakteri SÖYLEME.\n- response_time/reflex ASLA dikkatsizlik/tembellik olarak yorumlanmaz — sadece süre bilgisidir.\n- NULL/veri yok durumunu başarısızlık SAYMA — "henüz yeterli veri yok" de.\n- Öğrenci hakkında kişilik/zeka/öğrenme kapasitesi ÇIKARIMI YAPMA.\n- Kök-neden (root-cause) teşhisi YAPMA — bu veri sadece GÖZLEMLENEN performans, neden DEĞİL.\n- Bir teşhis/tanı motorundan (Katman 4) bahsetme, öyle bir şey yokmuş gibi davran.\n- Veriye dayanmayan hiçbir kişiselleştirme yapma.\nDil örnekleri: "Son kayıtlarında...", "Mevcut kanıta göre...", "Bu konuda henüz yeterli veri yok..." gibi kanıta dayalı, nötr ifadeler kullan.`,
    });
  }

  // TURBO #8-B — pedagoji kontrolcüsü (SADECE chat + stream değil + doğrulanmış aktif soru).
  let pedagoji = { aktif: false, mod: null, yeniDurum: null };
  if (mode === 'chat' && req.body.stream !== true) {
    pedagoji = klodPedagojiHazirla(req.body, messages, dogrulanmisBaglam, systemContent);
  }

  // 8. PROMPT CHAINING — Mod bazlı zincir
  let finalMessages = calibratedMessages;
  
  // 11. PREFILL — JSON garantisi için başlatıcı
  if (mode === 'json_output') {
    finalMessages = [
      ...calibratedMessages,
      { role: "assistant", content: '{"soru":' } // prefill — JSON garantili
    ];
  } else if (mode === 'xml_output') {
    finalMessages = [
      ...calibratedMessages,
      { role: "assistant", content: '<soru>' } // prefill — XML garantili
    ];
  }

  // 2. XML TAGS — Yapılandırılmış çıktı için sistem eki
  const xmlInstruction = mode === 'structured' 
    ? '\n\nCevabını şu XML formatında ver:\n<soru>...</soru>\n<siklar>A)...\nB)...\nC)...\nD)...</siklar>\n<aciklama>...</aciklama>\n<zorluk>1-5</zorluk>'
    : '';

  try {
    // 18. STREAMING — Destekli yapı. sinyal_analiz her zaman stream'li: panel
    // "anlık yazsın" istiyor, ilk token'ın gelmesi tüm cevabı beklemekten
    // çok daha hızlı hissettiriyor.
    const useStream = mode === 'sinyal_analiz' ? true : req.body.stream === true;

    const requestBody = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: mode === 'soru_uret' ? 512 : mode === 'sinyal_analiz' ? 400 : mode === 'chat' ? 700 : 350,
      temperature,
      system: systemContent,
      messages: finalMessages,
      stream: useStream,
    };

    // 16. TOOL USE — Gerektiğinde araç ekle (sinyal_analiz serbest metin
    // olarak stream ediliyor, tool kullanmıyor — bkz. SINYAL_ANALIZ_SYSTEM_PROMPT)
    // KATMAN 5E: board_actions tool'u SADECE mode==='chat' (dashboard KLOD
    // akışı) için, `use_tools`'tan BAĞIMSIZ ekleniyor — dnavChat() her
    // zaman use_tools:false gönderiyor ama board köprüsü onun ÜZERİNE,
    // ayrı bir mekanizma. sendChat() (mode YOK) ve sinyal_analiz
    // ETKİLENMİYOR.
    const araclar = [];
    if (use_tools && mode !== 'sinyal_analiz') araclar.push(...TOOLS);
    if (mode === 'chat') araclar.push(BOARD_ACTION_TOOL);
    if (araclar.length) {
      requestBody.tools = araclar;
      requestBody.tool_choice = { type: "auto" };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        ...CACHED_HEADERS,
        'x-api-key': process.env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      // Ayrıntı yalnızca sunucu log'unda — istemciye iç hata metni gönderilmez
      return res.status(500).json({ error: 'API hatası' });
    }

    // 18. STREAMING yanıtı
    if (useStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        res.write(chunk);
      }
      res.end();
      return;
    }

    const data = await response.json();

    // TURBO #8-B — pedagoji kontrolcüsü (TEK çağrı): hüküm işaretini ayıkla, geçişi uygula,
    // yanıtı duruma göre kur. Kontrolcü kurduysa aşağıdaki verbatim guard ATLANIR (sunucunun
    // geri eklediği ASIL soru bozulmasın; STEP_BACK sorusu zaten verbatim için doğrulandı).
    const pedagojiSonuc = mode === 'chat'
      ? klodPedagojiUygula(pedagoji, data)
      : { mod: null, yeniDurum: null, yedek: false, kontrollu: false };

    // TURBO #8 — ipucu cevap-sızıntısı arka koruması (bkz. yukarıdaki blok).
    // Fail-open: hata/uygunsuzluk → yanıt AYNEN döner.
    let ipucuKorumaUygulandi = false;
    if (mode === 'chat' && !pedagojiSonuc.kontrollu && Array.isArray(data.content) && klodIpucuYanitiMi(messages, dogrulanmisBaglam)) {
      try {
        const canonicalSoru = SORU_HAVUZU.find((s) => s.id === dogrulanmisBaglam.question_id);
        const ogrenciMetni = messages[messages.length - 1].content;
        for (const blok of data.content) {
          if (blok && blok.type === 'text' && typeof blok.text === 'string') {
            const temiz = klodSoruIfadesiSizintisiniTemizle(blok.text, canonicalSoru?.soru_en, ogrenciMetni);
            if (temiz !== blok.text) { blok.text = temiz; ipucuKorumaUygulandi = true; }
          }
        }
      } catch (e) {
        ipucuKorumaUygulandi = false;
      }
    }

    // 10. EVALUATION — Tool use sonuçlarını işle
    let toolResults = null;
    if (data.content) {
      const toolUse = data.content.find(b => b.type === 'tool_use');
      if (toolUse) {
        toolResults = toolUse.input;
      }
    }

    // 9. XML PARSE — Yapılandırılmış çıktıyı parse et
    const textContent = data.content?.find(b => b.type === 'text')?.text || '';
    const parsed = parseXMLOutput(textContent);

    // KATMAN 5E — board_actions: LLM'in avci_board_actions tool_use ile
    // ürettiği ham veri (varsa) canonical'a karşı doğrulanıp sanitize
    // edilir. Parse/tool bulunamama/malformed HER durumda [] döner —
    // bu turda hiçbir zaman handler'ı bloklamaz/hata fırlatmaz (fail-open,
    // metin cevabı yukarıda ZATEN hazırlandı).
    let boardActions = [];
    try {
      const boardToolUse = data.content?.find(b => b.type === 'tool_use' && b.name === 'avci_board_actions');
      if (boardToolUse) {
        const canonicalForBoard = dogrulanmisBaglam ? SORU_HAVUZU.find((s) => s.id === dogrulanmisBaglam.question_id) : null;
        boardActions = klodBoardActionlariDogrula(boardToolUse.input?.actions, dogrulanmisBaglam, canonicalForBoard);
      }
    } catch (e) {
      boardActions = [];
    }

    // Token kullanım raporu ekle
    const tokenInfo = {
      input_tokens: data.usage?.input_tokens || 0,
      output_tokens: data.usage?.output_tokens || 0,
      cache_read: data.usage?.cache_read_input_tokens || 0,
      cache_created: data.usage?.cache_creation_input_tokens || 0,
      estimated_cost_saved: data.usage?.cache_read_input_tokens 
        ? `${Math.round(data.usage.cache_read_input_tokens * 0.0003 * 0.9)} token tasarrufu`
        : null
    };

    return res.status(200).json({
      ...data,
      parsed,
      tool_results: toolResults,
      token_info: tokenInfo,
      message_type: msgType,
      temperature_used: temperature,
      // KATMAN 5 MVP-1 — PII YOK, sadece doğrulama sonucu (id/email/role
      // asla dönmüyor). Şimdilik hiçbir context/davranış bu alana bağlı
      // değil — gelecekteki context işi için altyapı.
      auth: { verified: Boolean(verifiedUser), anonymous: verifiedUser ? verifiedUser.isAnonymous : null },
      // KATMAN 5E — mevcut text reply kontratı (content[0]/parsed/vs.)
      // DEĞİŞMEDEN, geriye uyumlu, ADDITIVE bir alan. Client bu alanı
      // okumazsa (eski davranış) hiçbir şey değişmez.
      // TURBO #8-B: kontrollü (ipucu/geri adım/toparlanma/teklif/bekleme) turlarda board action YOK
      // (cevabı gösteren tahta hamlesi, sunucunun kurduğu yanıtla çelişmesin).
      board_actions: pedagojiSonuc.kontrollu ? [] : boardActions,
      // TURBO #8 — ADDITIVE: arka koruma yanıtı değiştirdi mi (gözlemlenebilirlik).
      hint_leak_guard: ipucuKorumaUygulandi,
      // TURBO #8-B — ADDITIVE: pedagoji kontrolcüsü durumu (istemci bir sonraki istekte geri gönderir).
      controller_state: pedagojiSonuc.yeniDurum || null,
      pedagogy_mode: pedagojiSonuc.mod || null,
      pedagogy_fallback: pedagojiSonuc.yedek,
    });

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
}

// Test-only named export'lar (Vercel SADECE default export'u kullanır,
// bu satır runtime davranışını DEĞİŞTİRMEZ) — client/server parity
// testinin saf fonksiyonları doğrudan çağırabilmesi için, bkz.
// tests/avci-klod-student-context.test.mjs.
export { klodOgrenciModeliHesapla, klodStudentContextOlustur, klodGrupIstatistigi, klodBoardActionlariDogrula, klodSinyalLabBaglamiDogrula, BOARD_ACTION_ALLOWLIST, klodIpucuYanitiMi, klodSoruIfadesiSizintisiniTemizle };
