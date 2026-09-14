// ============================================================
// KLOD API — Sinyal Avcısı AI Backend
// 20 Pro Prompt Engineering Tekniği Uygulandı
// ============================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { rateLimit } from './_rateLimit.mjs';

// RAG — gerçek soru bankası (data/sorular.json, automation/video-pipeline
// ile aynı kaynaktan kopyalanmıştır — o pipeline extract-sorular.mjs ile
// sitenin gerçek SAT/Sinyal Lab içeriğinden üretiyor, burada da uydurma
// yok). Modül yüklenirken bir kere okunuyor, soğuk başlangıç dışında
// sıcak fonksiyon çağrılarında tekrar disk I/O yok.
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rl = rateLimit(req, { key: 'klod', limit: 15, windowMs: 60_000 });
  if (!rl.allowed) {
    res.setHeader('Retry-After', Math.ceil(rl.retryAfterMs / 1000));
    return res.status(429).json({ error: 'Çok fazla istek gönderdiniz. Biraz sonra tekrar deneyin.' });
  }

  const { messages, system, mode, use_tools, image_base64, image_type, image_soru } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Geçersiz istek' });
  }

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
      max_tokens: mode === 'soru_uret' ? 512 : mode === 'sinyal_analiz' ? 400 : 350,
      temperature,
      system: systemContent,
      messages: finalMessages,
      stream: useStream,
    };

    // 16. TOOL USE — Gerektiğinde araç ekle (sinyal_analiz serbest metin
    // olarak stream ediliyor, tool kullanmıyor — bkz. SINYAL_ANALIZ_SYSTEM_PROMPT)
    if (use_tools && mode !== 'sinyal_analiz') {
      requestBody.tools = TOOLS;
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
      return res.status(500).json({ error: 'API hatası', detail: err });
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
      temperature_used: temperature
    });

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Sunucu hatası', message: error.message });
  }
}
