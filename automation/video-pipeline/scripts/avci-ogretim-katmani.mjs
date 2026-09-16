// ============================================================
// AVCI ÖĞRETİM KATMANI — soru bankasındaki DOĞRULANMIŞ cevabı/açıklamayı
// Reel için adım adım öğretim senaryosuna dönüştürür.
// ============================================================
// GÜVENLİK SINIRI: bu modül production api/klod.mjs'den TAMAMEN
// bağımsız çalışır — kendi ANTHROPIC_API_KEY'i (GitHub Secrets, ayrı/
// düşük limitli bir Anthropic Console key'i önerilir), kendi rate
// limiti yok (günde 1 çağrı), kendi hata alanı. Öğrenci-facing KLOD'a
// (api/klod.mjs) hiç dokunmaz, hiç çağırmaz, onun rate limitini/
// bütçesini paylaşmaz.
//
// AI HİÇBİR ZAMAN SOURCE OF TRUTH DEĞİLDİR: doğru cevap (dogru_index),
// doğru şık metni, mevcut doğrulanmış açıklama (aciklama_tr) ve sinyal
// kuralı (data/sinyal-kurallari.mjs, insan onaylı whitelist) hep koddan
// gelir ve `kaynak` alanında değişmeden saklanır. AI SADECE bunları
// pedagojik adımlara döker — yeni bir gramer kuralı veya cevap İCAT
// ETMEZ. Bunu koda bağlamak için: whitelist'te olmayan bir sinyal için
// AI'a hiç sorulmuyor (Kontrol B), model cevap harfini kendi bulmuyor
// sadece teyit ediyor ve teyidi koddaki dogru_index ile karşılaştırılıyor
// (Kontrol A), ve KISA_KURAL adımının nihai metni ne yazılmış olursa
// olsun kod tarafından aciklama_tr + sinyal_kurali ile EZİLİR — yani
// Reel'de görünecek asıl gramer iddiası her zaman insan-onaylı kaynaktan
// gelir, AI'ın serbest metninden değil.

import { SINYAL_KURALLARI } from "../data/sinyal-kurallari.mjs";

// SAĞ_SOL_KONTROL bilerek burada YOK: iki gerçek testte model bu etiketi
// hiç seçmedi (yapısal tespiti kendiliğinden SİNYALİ_YAKALA içine dahil
// etti) ve bu, cümledeki başka bir yeri "bitişikmiş" gibi sunma riski
// taşıyordu. Yapısal kontrol artık AI'nın seçimine bırakılmıyor — kod
// tarafından deterministik olarak ekleniyor (bkz. yapiyiKontrolEtEkle).
export const ADIM_ENUM = [
  "GÖR",
  "FİİLİ_BUL",
  "S_V_O",
  "SİNYALİ_YAKALA",
  "ANLAM_KARŞITLIĞI",
  "ŞIK_ELE",
  "ANLAMI_DOĞRULA",
  "DUR_ÇEVİRME",
  "KISA_KURAL",
];

const HARFLER = ["A", "B", "C", "D"];

// YAPISAL_KONTROL_UYGULANSIN — YAPIYI_KONTROL_ET adımı artık whitelist'teki
// HER sinyale koşulsuz eklenmiyor. Mimari denetimde (bkz. proje raporu)
// tespit edildi: bazı sinyaller (bağlayıcı zarflar: yet/consequently/
// therefore/thus/on the contrary; modal perfect: must/should/could/might
// have; sabit idiomlar: contrary to popular belief) için "bitişiğine bak"
// sorusu ya GEREKSİZ (yapı zaten sabit, kontrol edilecek değişken yok) ya
// da YANILTICI (asıl mesele bitişik yapı değil, önceki cümleyle anlamsal
// ilişki). Bu Set'te SADECE gerçekten yapısal bir tuzak taşıyan (isim/
// V-ing/S+V ayrımı öğrenciye bir şey öğreten) sinyaller var. Whitelist'in
// kendisi (SINYAL_KURALLARI) string format olarak DEĞİŞMEDİ — bu sadece
// avci-ogretim-katmani.mjs'in dahili bir davranış anahtarı.
const YAPISAL_KONTROL_UYGULANSIN = new Set([
  "despite",
  "notwithstanding",
  "contrary to",
  "although",
  "even though",
  "whereas",
  "while",
  "because",
  "since",
  "as a consequence of",
  "by the time",
  "prior to",
  "once",
  "no sooner had",
  "unless",
  "provided that",
  "on condition that",
  "as long as",
  "rather than",
  "not only",
  "so as to",
  "nor",
  "after",
]);

const SISTEM_PROMPT = `Sen Sinyal Avcısı'nın Reel öğretim senaryosu yazarısın.
Sana bir YDS/YÖKDİL sorusu ve BU SORUNUN ZATEN DOĞRULANMIŞ cevabı/açıklaması verilecek.

GÖREVİN: Bu SABİT gerçekleri, 3-6 adımlık kısa, öğretici bir Reel senaryosuna dönüştürmek. Yeni bir gramer kuralı bulmak veya cevabı yeniden değerlendirmek DEĞİL.

ÖNEMLİ: Sinyal kelimenin doğrudan bitişiğindeki YAPISAL kontrol (isim mi, V-ing mi, S+V mi geliyor) SENİN İŞİN DEĞİL — bunu sistem otomatik ve ayrı, sabit bir adımda zaten ekliyor. Sen SADECE anlam/pedagoji seviyesinde çalış:
- SİNYALİ_YAKALA: sinyal kelimeyi tanı, ne anlama geldiğini doğal dille anlat. Sana verilirse SİNYALİN BİTİŞİK BAĞLAMI bir İPUÇUDUR (kesin gerçek değil) — istersen doğal bir cümle içinde değin, ama "sağında/solunda kesinlikle X var" gibi KESİN KONUM İDDİASI yapma, o zaten ayrı bir adımda garanti ediliyor.
- ANLAM_KARŞITLIĞI: cümlenin BAŞKA bir yerindeki anlamsal karşıtlığı/kritik ifadeyi (örn. "by no means", "far from", "scarcely") ele alır. Bunu SİNYALİ_YAKALA ile karıştırma — biri sinyali tanımak, diğeri cümledeki başka bir ipucunu yakalamak.

KESİN KURALLAR:
- Sana verilen doğru şık ve açıklama SABİTTİR. DEĞİŞTİRME, sorgulama, yeni bir gerekçe İCAT ETME.
- Adım havuzundan (GÖR, FİİLİ_BUL, S_V_O, SİNYALİ_YAKALA, ANLAM_KARŞITLIĞI, ŞIK_ELE, ANLAMI_DOĞRULA, DUR_ÇEVİRME, KISA_KURAL) SORU TİPİNE UYGUN olanları seç — hepsini zorlama, 3-6 adım yeterli. Soru bir anlam/çeviri sorusuysa (paragraf + "ne söylenebilir" tarzı) ANLAM_KARŞITLIĞI'na öncelik ver.
- Her adımın metni MAX 2 kısa cümle, sohbet gibi Türkçe, B2 altı basit kelime kullanma.
- KISA_KURAL adımını mutlaka ekle (genelde sona yakın) — bu adıma yazacağın metin sadece bir taslak, son haliyle kod tarafından üzerine yazılacak, o yüzden kısa tut.
- Tablo kullanma, sadece düz metin.`;

const TOOL = {
  name: "avci_ogretim_uret",
  description: "Verilen, zaten doğrulanmış soru/cevap/açıklamayı Reel için adım adım öğretim senaryosuna döker.",
  input_schema: {
    type: "object",
    properties: {
      dogru_sik_harfi: {
        type: "string",
        enum: HARFLER,
        description: "Sana verilen doğru şık harfi — kendi çıkarımını YAPMA, sana söyleneni birebir yaz.",
      },
      adimlar: {
        type: "array",
        minItems: 3,
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            adim: { type: "string", enum: ADIM_ENUM },
            metin: { type: "string", description: "MAX 2 kısa cümle" },
          },
          required: ["adim", "metin"],
        },
      },
    },
    required: ["dogru_sik_harfi", "adimlar"],
  },
};

function normalizeSinyal(sinyal) {
  return (sinyal || "").trim().toLowerCase();
}

function dogruHarften(dogruIndex) {
  return HARFLER[dogruIndex] ?? null;
}

// GROUNDING İPUCU — SOURCE OF TRUTH DEĞİL. Sinyal kelimenin soru_en
// içindeki konumunun hemen ardından gelen ~6 kelimeyi (ilk virgül/nokta'ya
// kadar) basit bir indexOf ile çıkarır. Amaç: modelin "sinyalin sağında/
// bitişiğinde ne var" sorusunu KENDİ TAHMİNİYLE cevaplamasını önlemek —
// tam da önceki testte "sağında by no means invalid var" gibi cümledeki
// başka bir yeri bitişikmiş gibi sunma hatasını önler. Bu alan sadece bir
// İPUÇU: sinyal metinde bulunamazsa veya çıkarım anlamsızsa null döner,
// bu durumda model SAĞ_SOL_KONTROL'ü genel sinyal_kurali'ne dayandırır —
// pipeline'ı bloke etmez, needs_review tetiklemez.
function yapisalBaglamCikar(soruEn, sinyal) {
  if (!soruEn || !sinyal) return null;
  const idx = soruEn.toLowerCase().indexOf(sinyal.toLowerCase());
  if (idx === -1) return null;
  const sonrasi = soruEn.slice(idx + sinyal.length);
  const durakIdx = sonrasi.search(/[,.;]/);
  const parca = durakIdx !== -1 ? sonrasi.slice(0, durakIdx) : sonrasi;
  const kelimeler = parca.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  return kelimeler.length > 0 ? kelimeler.join(" ") : null;
}

function kullaniciMesajiOlustur(soru, dogruSecenek, beklenenHarf, kural, yapisalBaglam) {
  const sikSatirlari = soru.secenekler_tr.map((s, i) => `${HARFLER[i]}) ${s}`).join("\n");
  const baglamSatiri = yapisalBaglam
    ? `SİNYALİN BİTİŞİK BAĞLAMI (koddan çıkarılmış İPUÇU, kesin gerçek değil — SİNYALİ_YAKALA anlatımında istersen doğal bir renk olarak kullanabilirsin, ayrı bir adım/kesin konum iddiası olarak DEĞİL): "${yapisalBaglam}"`
    : `SİNYALİN BİTİŞİK BAĞLAMI: (koddan çıkarılamadı — konum iddiasında bulunma, sadece genel SİNYAL KURALI'na dayan)`;
  return `SORU (İngilizce): ${soru.soru_en}
SORU (Türkçe): ${soru.soru_tr}
ŞIKLAR:
${sikSatirlari}

DOĞRU ŞIK (sabit, değiştirme): ${beklenenHarf}) ${dogruSecenek}
DOĞRULANMIŞ AÇIKLAMA (sabit, sadece öğretici adımlara dök): ${soru.aciklama_tr}
SİNYAL KELİME: ${soru.sinyal}
SİNYAL KURALI (sabit, doğrulanmış — yeni bir kural icat etme, buna dayan): ${kural}
${baglamSatiri}`;
}

/**
 * Soru bankasındaki doğrulanmış bir soruyu AVCI Reel öğretim adımlarına
 * dönüştürür. Dönüş: {status:'ok', kaynak, adimlar} | {status:'needs_review', sebep}
 */
export async function avciOgretimUret(soru) {
  const sinyalKey = normalizeSinyal(soru?.sinyal);
  const kural = SINYAL_KURALLARI[sinyalKey];

  // Kontrol B — whitelist kapısı: insan onaylı bir kural yoksa AI'a hiç
  // sorulmuyor. Bu, AI'ın hiç tanımadığımız bir sinyal için gramer
  // kuralı icat etmesini yapısal olarak engelliyor.
  if (!kural) {
    return { status: "needs_review", sebep: `whitelist_disi_sinyal: "${soru?.sinyal ?? ""}"` };
  }

  const dogruSecenek = soru.secenekler_tr?.[soru.dogru_index];
  const beklenenHarf = dogruHarften(soru.dogru_index);
  if (!dogruSecenek || !beklenenHarf || !soru.aciklama_tr) {
    return { status: "needs_review", sebep: "soru_verisi_eksik (dogru_index/secenekler_tr/aciklama_tr)" };
  }

  // yapisal_baglam SOURCE OF TRUTH DEĞİLDİR — sadece grounding ipucu
  // (bkz. yapisalBaglamCikar). dogru_index/dogru_secenek/aciklama_tr/
  // sinyal_kurali hâlâ tek gerçek kaynak.
  const yapisalBaglam = yapisalBaglamCikar(soru.soru_en, soru.sinyal);

  const kaynak = {
    dogru_index: soru.dogru_index,
    dogru_secenek: dogruSecenek,
    aciklama_tr: soru.aciklama_tr,
    sinyal: soru.sinyal,
    sinyal_kurali: kural,
    yapisal_baglam: yapisalBaglam,
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { status: "needs_review", sebep: "ANTHROPIC_API_KEY tanımlı değil (video-pipeline ortamında)" };
  }

  let data;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 700,
        temperature: 0.3,
        system: SISTEM_PROMPT,
        messages: [{ role: "user", content: kullaniciMesajiOlustur(soru, dogruSecenek, beklenenHarf, kural, yapisalBaglam) }],
        tools: [TOOL],
        tool_choice: { type: "tool", name: "avci_ogretim_uret" },
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      return { status: "needs_review", sebep: `anthropic_http_${response.status}: ${errText.slice(0, 300)}` };
    }
    data = await response.json();
  } catch (err) {
    return { status: "needs_review", sebep: `anthropic_fetch_hatasi: ${err.message}` };
  }

  const toolUse = data?.content?.find((b) => b.type === "tool_use");
  const cikti = toolUse?.input;
  if (!cikti || !Array.isArray(cikti.adimlar) || cikti.adimlar.length < 3) {
    return { status: "needs_review", sebep: "model_semaya_uymadi" };
  }

  // Kontrol A — cevap harfi tutarlılığı: model karar vermiyor, sadece
  // teyit ediyor; teyit koddaki dogru_index'ten türeyenle uyuşmuyorsa
  // modelin akıl yürütmesi güvenilmez kabul edilir.
  if (cikti.dogru_sik_harfi !== beklenenHarf) {
    return {
      status: "needs_review",
      sebep: `cevap_harfi_uyumsuz: model="${cikti.dogru_sik_harfi}" beklenen="${beklenenHarf}"`,
    };
  }

  const adimlarTemiz = cikti.adimlar
    .filter((a) => ADIM_ENUM.includes(a?.adim) && typeof a?.metin === "string" && a.metin.trim())
    .map((a) => ({ adim: a.adim, metin: a.metin.trim().slice(0, 220) }));

  if (adimlarTemiz.length < 3) {
    return { status: "needs_review", sebep: "gecerli_adim_sayisi_yetersiz" };
  }

  // YAPIYI_KONTROL_ET — AI'nın seçebileceği bir adım DEĞİL, kod tarafından
  // eklenen deterministik bir adım — AMA artık KOŞULSUZ değil. Sadece
  // sinyal YAPISAL_KONTROL_UYGULANSIN Set'indeyse eklenir (mimari denetim
  // sonucu: bağlayıcı zarf/modal-perfect/sabit-idiom tipi sinyallerde
  // "bitişiğine bak" sorusu gereksiz veya yanıltıcı). Eklendiğinde metni
  // SADECE whitelist'teki insan-onaylı sinyal_kurali'ne dayanır;
  // soru_en'den kesilmiş/kırpılmış yapisal_baglam metni burada HİÇ
  // alıntılanmaz. SİNYALİ_YAKALA'dan hemen sonra (yoksa GÖR'den sonra, o
  // da yoksa en başa) eklenir.
  let adimlarYapiEklenmis = adimlarTemiz;
  if (YAPISAL_KONTROL_UYGULANSIN.has(sinyalKey)) {
    const yapiyiKontrolEtAdimi = {
      adim: "YAPIYI_KONTROL_ET",
      metin: `"${soru.sinyal}" kelimesinin hemen bitişiğine bak — ${kural}`.trim().slice(0, 260),
    };
    const ankorAdim = adimlarTemiz.find((a) => a.adim === "SİNYALİ_YAKALA") ? "SİNYALİ_YAKALA" : "GÖR";
    const ankorIdx = adimlarTemiz.findIndex((a) => a.adim === ankorAdim);
    adimlarYapiEklenmis =
      ankorIdx !== -1
        ? [...adimlarTemiz.slice(0, ankorIdx + 1), yapiyiKontrolEtAdimi, ...adimlarTemiz.slice(ankorIdx + 1)]
        : [yapiyiKontrolEtAdimi, ...adimlarTemiz];
  }

  // KISA_KURAL adımı — AI ne yazmış olursa olsun SOURCE OF TRUTH ile
  // EZİLİR. Reel'de görünecek/söylenecek nihai gramer iddiası her zaman
  // insan onaylı aciklama_tr + sinyal_kurali'nden gelir, AI'ın kendi
  // cümlesinden değil. Bu, AI'ın hiçbir zaman nihai gerçek haline
  // gelmemesini garanti eden asıl mekanizmadır.
  const kisaKuralMetni = `${kural} ${soru.aciklama_tr}`.trim().slice(0, 260);
  const kuralVarMi = adimlarYapiEklenmis.some((a) => a.adim === "KISA_KURAL");
  const adimlarSon = kuralVarMi
    ? adimlarYapiEklenmis.map((a) => (a.adim === "KISA_KURAL" ? { ...a, metin: kisaKuralMetni } : a))
    : [...adimlarYapiEklenmis, { adim: "KISA_KURAL", metin: kisaKuralMetni }];

  // Sadece raporlama/şeffaflık amaçlı — render/yayın akışını etkilemiyor.
  const kullanim = data?.usage
    ? { input_tokens: data.usage.input_tokens ?? null, output_tokens: data.usage.output_tokens ?? null }
    : null;

  return { status: "ok", kaynak, adimlar: adimlarSon, kullanim };
}
