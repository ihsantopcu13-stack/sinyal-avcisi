// ============================================================
// MASTER VİDEO PAKETİ — #2 ila #30 için yapılandırılmış ders verisi.
// Kural/örnek/mini soru/cevap/AVCI kodu data/master-video-paketi.md'den
// (#1'in kaynağı olan orijinal MASTER dosya) birebir alınmıştır —
// pedagojik içerik değiştirilmedi, sadece MasterLessonReel.jsx'in
// props şemasına uyacak şekilde yapılandırıldı. sceneFrames ve
// countdownStart, scripts/render-master-lesson.mjs tarafından gerçek
// TTS ses sürelerine göre RUNTIME'DA hesaplanıp bu objelere enjekte
// edilir (buradaki değerler yalnızca placeholder / Studio preview içindir).
// ============================================================

// 2026-09-11 onaylı görsel standart (bkz. src/MasterLessonReel.jsx BG/RED/
// YELLOW/GREEN/WHITE) — breakdown satırları bu değerleri LİTERAL hex olarak
// (style-key değil) taşıyor, bu yüzden burada da ayrıca güncellenmesi gerekti.
const Y = "#eab308";
const G = "#22c55e";
const R = "#dc2626";
const W = "#f4f3ef";

const DEFAULT_SCENE_FRAMES = [45, 130, 110, 95, 220, 250, 150, 130, 60];
const AUDIO_FILES = ["l1_hook", "l2_kural", "l3_neden", "l4_tuzak", "l5_ornek", "l6_soru", "l7_cozum", "l8_avci"];

function lesson(l) {
  return {
    sceneFrames: DEFAULT_SCENE_FRAMES,
    countdownStart: 190,
    audioFiles: AUDIO_FILES,
    hookEmoji: "⚠",
    ...l,
  };
}

export const LESSONS = [
  lesson({
    id: "a-number-of", epNum: 2, audioFolder: "master-02",
    hookTitle: "A NUMBER OF TUZAĞI!",
    kuralLines: ["A number of + çoğul isim.", "Fiil de çoğul olur."],
    narration: {
      hook: "A NUMBER OF TUZAĞI!",
      kural: "A number of, çoğul isimle kullanılır. Fiil de çoğul olur.",
      neden: "Yapı 'birçok' anlamında çoğul bir grubu anlatır.",
      tuzak: "'Number' tekil diye tekil fiile atlama tuzağı.",
      ornek: "A number of students attend online courses. Özne: students. Fiil: attend, çoğul.",
      soru: "Şimdi sırada soru var. A supports, B support, C is supporting, D has supported.",
      cozum: "Cevap B, support. A number of researchers, çoğul özne.",
      avci: "A NUMBER OF gör, çoğul ismi yakala, çoğul fiil, avla!",
    },
    nedenBadge: "A NUMBER OF + ÇOĞUL",
    nedenText: "\"birçok\" anlamında çoğul bir grubu anlatır.",
    tuzakText: "\"number\" tekil diye tekil fiile atlama tuzağı.",
    examples: [{ parts: [
      { text: "A number of", style: "trap" }, { text: "students", style: "plain" }, { text: "attend", style: "verb" }, { text: "online courses.", style: "plain" },
    ] }],
    breakdown: [
      { text: "S → students (çoğul)", color: G },
      { text: "V → attend (çoğul fiil)", color: Y },
    ],
    question: { sentence: "A number of researchers _____ this view.", options: ["A) supports", "B) support", "C) is supporting", "D) has supported"] },
    answerLabel: "B) SUPPORT",
    cozumText: "A number of + çoğul isim → çoğul fiil.",
    avciKodu: "A NUMBER OF GÖR →\nÇOĞUL İSMİ YAKALA → ÇOĞUL FİİL",
  }),
  lesson({
    id: "the-number-of", epNum: 3, audioFolder: "master-03",
    hookTitle: "THE NUMBER OF TUZAĞI!",
    kuralLines: ["The number of + çoğul isim.", "Fiil TEKİL olur."],
    narration: {
      hook: "THE NUMBER OF TUZAĞI!",
      kural: "The number of, çoğul isimle kullanılır ama fiil tekildir.",
      neden: "Konu kişiler değil, onların sayısıdır. Patron: number.",
      tuzak: "Users çoğul diye 'are' seçme tuzağı.",
      ornek: "The number of online users is increasing. Patron isim: number, tekil.",
      soru: "Şimdi sırada soru var. A are increasing, B increase, C is increasing, D have increased.",
      cozum: "Cevap C, is increasing. Patron isim number, tekil.",
      avci: "THE NUMBER OF gör, patron number, tekil fiil, avla!",
    },
    nedenBadge: "THE NUMBER OF",
    nedenText: "Konu sayıdır — patron isim \"number\", tekil.",
    tuzakText: "users çoğul diye \"are\" seçme tuzağı.",
    examples: [{ parts: [
      { text: "The number of", style: "trap" }, { text: "online users", style: "plain" }, { text: "is increasing.", style: "verb" },
    ] }],
    breakdown: [
      { text: "patron isim → number (tekil)", color: G },
      { text: "V → is increasing", color: Y },
    ],
    question: { sentence: "The number of people using social media _____ rapidly.", options: ["A) are increasing", "B) increase", "C) is increasing", "D) have increased"] },
    answerLabel: "C) IS INCREASING",
    cozumText: "The number of + çoğul isim → tekil fiil.",
    avciKodu: "THE NUMBER OF GÖR →\nPATRON NUMBER → TEKİL FİİL",
  }),
  lesson({
    id: "whose", epNum: 4, audioFolder: "master-04",
    hookTitle: "WHOSE TUZAĞI!",
    kuralLines: ["WHOSE sahiplik bildirir.", "Sağında isim gelir."],
    narration: {
      hook: "WHOSE TUZAĞI!",
      kural: "Whose sahiplik bildirir, sağında bir isim gelir.",
      neden: "Boşluğun sağına bak: isim varsa ve sahiplik ilişkisi varsa whose güçlü adaydır.",
      tuzak: "İnsan gördüğü için otomatik WHO seçme tuzağı.",
      ornek: "The scientist whose research changed medicine received an award. Whose research, bilim insanının araştırması.",
      soru: "Şimdi sırada soru var. A who, B whom, C whose, D which.",
      cozum: "Cevap C, whose. Sağda isim var, sahiplik ilişkisi var.",
      avci: "Sağa bak, isim var, sahiplik ara, whose, avla!",
    },
    nedenBadge: "WHOSE + İSİM",
    nedenText: "sağında isim varsa ve sahiplik ilişkisi varsa whose güçlü adaydır.",
    tuzakText: "İnsan gördüğü için otomatik WHO seçme tuzağı.",
    examples: [{ parts: [
      { text: "The scientist", style: "plain" }, { text: "whose research", style: "trap" }, { text: "changed medicine received an award.", style: "plain" },
    ] }],
    breakdown: [
      { text: "whose research → bilim insanının araştırması", color: G },
      { text: "sağda isim + sahiplik → WHOSE", color: Y },
    ],
    question: { sentence: "The researcher _____ findings attracted attention received an award.", options: ["A) who", "B) whom", "C) whose", "D) which"] },
    answerLabel: "C) WHOSE",
    cozumText: "Sağda isim var, sahiplik ilişkisi var → whose.",
    avciKodu: "SAĞA BAK → İSİM VAR →\nSAHİPLİK ARA → WHOSE",
  }),
  lesson({
    id: "although-despite", epNum: 5, audioFolder: "master-05",
    hookTitle: "ALTHOUGH / DESPITE TUZAĞI!",
    kuralLines: ["Although + cümle (S+V).", "Despite + isim / V-ing."],
    narration: {
      hook: "ALTHOUGH DESPITE TUZAĞI!",
      kural: "Although'dan sonra cümle gelir. Despite'tan sonra isim ya da V-ing gelir.",
      neden: "İkisi de zıtlık taşır ama ayrımı sağdaki yapı yapar.",
      tuzak: "Türkçe anlamları yakın diye yalnız çeviriyle seçim yapma tuzağı.",
      ornek: "Although the economy improved, özne artı fiil. Despite the economic improvement, isim grubu.",
      soru: "Şimdi sırada soru var. A Although, B Despite, C Because, D However.",
      cozum: "Cevap B, Despite. Sağda isim grubu var, cümle değil.",
      avci: "Zıtlık, sağa bak, S artı V ise although, isim ise despite, avla!",
    },
    nedenBadge: "ALTHOUGH ≠ DESPITE",
    nedenText: "ikisi de zıtlık taşır, ayrımı sağdaki yapı yapar.",
    tuzakText: "Türkçe anlamları yakın diye yalnız çeviriyle seçim yapma tuzağı.",
    examples: [
      { parts: [{ text: "Although", style: "verb" }, { text: "the economy improved, …", style: "plain" }] },
      { parts: [{ text: "Despite", style: "trap" }, { text: "the economic improvement, …", style: "plain" }] },
    ],
    breakdown: [
      { text: "Although → S + V", color: Y },
      { text: "Despite → isim / isim grubu", color: R },
    ],
    question: { sentence: "_____ the heavy rain, the event continued.", options: ["A) Although", "B) Despite", "C) Because", "D) However"] },
    answerLabel: "B) DESPITE",
    cozumText: "Sağda isim grubu var (the heavy rain) → Despite.",
    avciKodu: "ZITLIK → SAĞA BAK →\nS+V=ALTHOUGH | İSİM/V-ING=DESPITE",
  }),
  lesson({
    id: "because-because-of", epNum: 6, audioFolder: "master-06",
    hookTitle: "BECAUSE / BECAUSE OF TUZAĞI!",
    kuralLines: ["Because + cümle (S+V).", "Because of + isim."],
    narration: {
      hook: "BECAUSE BECAUSE OF TUZAĞI!",
      kural: "Because'dan sonra cümle gelir. Because of'tan sonra isim gelir.",
      neden: "İkisi de sebep bildirir ama yapı farklıdır.",
      tuzak: "İkisini de yalnız 'çünkü' diye çevirip yapıyı kaçırma tuzağı.",
      ornek: "Because the economy collapsed, özne artı fiil. Because of the economic crisis, isim grubu.",
      soru: "Şimdi sırada soru var. A because, B because of, C although, D however.",
      cozum: "Cevap B, because of. Sağda isim grubu var.",
      avci: "Sebep, sağa bak, cümle ise because, isim ise because of, avla!",
    },
    nedenBadge: "BECAUSE ≠ BECAUSE OF",
    nedenText: "ikisi de sebep bildirir, ayrımı sağdaki yapı yapar.",
    tuzakText: "İkisini de yalnız 'çünkü' diye çevirip yapıyı kaçırma tuzağı.",
    examples: [
      { parts: [{ text: "because", style: "verb" }, { text: "the economy collapsed", style: "plain" }] },
      { parts: [{ text: "because of", style: "trap" }, { text: "the economic crisis", style: "plain" }] },
    ],
    breakdown: [
      { text: "because → S + V", color: Y },
      { text: "because of → isim grubu", color: R },
    ],
    question: { sentence: "Many businesses closed _____ the economic crisis.", options: ["A) because", "B) because of", "C) although", "D) however"] },
    answerLabel: "B) BECAUSE OF",
    cozumText: "Sağda isim grubu var (the economic crisis) → because of.",
    avciKodu: "SEBEP → SAĞA BAK →\nCÜMLE=BECAUSE | İSİM=BECAUSE OF",
  }),
  lesson({
    id: "however", epNum: 7, audioFolder: "master-07",
    hookTitle: "HOWEVER TUZAĞI!",
    kuralLines: ["However bağlayıcı zarftır.", "Yeni cümle başlatır."],
    narration: {
      hook: "HOWEVER TUZAĞI!",
      kural: "However bağlayıcı bir zarftır, yeni bir cümle başlatır.",
      neden: "Although gibi doğrudan yan cümle başlatan bir bağlaç değildir.",
      tuzak: "Zıtlık gördüğü anda Although seçme tuzağı.",
      ornek: "The method is effective. However, it is expensive. Nokta ve yeni cümle sinyali.",
      soru: "Şimdi sırada soru var. A Although, B Despite, C However, D Because.",
      cozum: "Cevap C, However. Nokta var, yeni cümle başlıyor.",
      avci: "Zıtlık, yeni cümle, However, avla!",
    },
    nedenBadge: "HOWEVER",
    nedenText: "Although gibi doğrudan yan cümle başlatan bağlaçla aynı yapıda kullanılmaz.",
    tuzakText: "Zıtlık gördüğü anda Although seçme tuzağı.",
    examples: [{ parts: [
      { text: "The method is effective.", style: "plain" }, { text: "However,", style: "trap" }, { text: "it is expensive.", style: "plain" },
    ] }],
    breakdown: [
      { text: "nokta + yeni cümle → HOWEVER sinyali", color: Y },
    ],
    question: { sentence: "The new technology is useful. _____, it is very expensive.", options: ["A) Although", "B) Despite", "C) However", "D) Because"] },
    answerLabel: "C) HOWEVER",
    cozumText: "Nokta var, yeni bağımsız cümle başlıyor → However.",
    avciKodu: "ZITLIK + YENİ CÜMLE → HOWEVER",
  }),
  lesson({
    id: "if-unless", epNum: 8, audioFolder: "master-08",
    hookTitle: "IF / UNLESS TUZAĞI!",
    kuralLines: ["Unless = if...not.", "Olumsuz koşul fikri."],
    narration: {
      hook: "IF UNLESS TUZAĞI!",
      kural: "Unless, if artı not fikri verir.",
      neden: "You cannot pass unless you study, if you do not study cümlesine denktir.",
      tuzak: "Her cümlede mekanik kelime değiştirme tuzağı — anlamı doğrula.",
      ornek: "You cannot pass unless you study. Olumsuz koşul fikri.",
      soru: "Şimdi sırada soru var. A because, B although, C unless, D despite.",
      cozum: "Cevap C, unless. Olumsuz koşul fikri var.",
      avci: "Unless, olumsuz koşul fikri, anlamı doğrula, avla!",
    },
    nedenBadge: "UNLESS = IF...NOT",
    nedenText: "olumsuz koşul fikri verir — mekanik değil, anlamı doğrula.",
    tuzakText: "Her cümlede mekanik kelime değiştirme tuzağı.",
    examples: [{ parts: [
      { text: "You cannot pass", style: "plain" }, { text: "unless", style: "trap" }, { text: "you study.", style: "plain" },
    ] }],
    breakdown: [
      { text: "unless ≈ if...not", color: Y },
    ],
    question: { sentence: "You will not improve _____ you practise regularly.", options: ["A) because", "B) although", "C) unless", "D) despite"] },
    answerLabel: "C) UNLESS",
    cozumText: "Olumsuz koşul fikri var → unless.",
    avciKodu: "UNLESS → OLUMSUZ KOŞUL →\nANLAMI DOĞRULA",
  }),
  lesson({
    id: "after-when", epNum: 9, audioFolder: "master-09",
    hookTitle: "AFTER / WHEN TUZAĞI!",
    kuralLines: ["Gelecek zamanlı time clause'da", "after/when tarafında WILL yok."],
    narration: {
      hook: "AFTER WHEN TUZAĞI!",
      kural: "Gelecek anlamlı zaman cümlelerinde after ve when tarafında will kullanılmaz.",
      neden: "When he arrives, we will start. Ana cümlede gelecek, yan cümlede present.",
      tuzak: "Gelecek anlamı var diye iki tarafa da will koyma tuzağı.",
      ornek: "When he arrives, we will start. Yanlış: when he will arrive.",
      soru: "Şimdi sırada soru var. A will arrive, B arrives, C would arrive, D will be arriving.",
      cozum: "Cevap B, arrives. After tarafında will sorgulanır.",
      avci: "Gelecek zamanlı time clause, after when tarafında will'i sorgula, avla!",
    },
    nedenBadge: "AFTER / WHEN + PRESENT",
    nedenText: "ana cümlede gelecek zaman olabilir, yan cümlede will kullanılmaz.",
    tuzakText: "Gelecek anlamı var diye iki tarafa da will koyma tuzağı.",
    examples: [{ parts: [
      { text: "When he", style: "plain" }, { text: "arrives", style: "verb" }, { text: ", we will start.", style: "plain" },
    ] }],
    breakdown: [
      { text: "yan cümle → present (arrives)", color: G },
      { text: "ana cümle → gelecek (will start)", color: Y },
    ],
    question: { sentence: "We will begin the meeting after the manager _____.", options: ["A) will arrive", "B) arrives", "C) would arrive", "D) will be arriving"] },
    answerLabel: "B) ARRIVES",
    cozumText: "After tarafında will yok, present kullanılır.",
    avciKodu: "GELECEK TIME CLAUSE →\nAFTER/WHEN'DE WILL'İ SORGULA",
  }),
  lesson({
    id: "ving-v3", epNum: 10, audioFolder: "master-10",
    hookTitle: "V-ING / V3 TUZAĞI!",
    kuralLines: ["Aktif ilişki → V-ing.", "Pasif ilişki → V3."],
    narration: {
      hook: "V İNG V3 TUZAĞI!",
      kural: "Aktif ilişkide V-ing, pasif ilişkide V3 kullanılır.",
      neden: "People using technology, insanlar kullanıyor, aktif. Technology used in education, teknoloji kullanılıyor, pasif.",
      tuzak: "Sadece kelimenin biçimine bakıp yönü kontrol etmeme tuzağı.",
      ornek: "The methods used in this study produced reliable results. İsim işi yapmıyor, iş isme yapılıyor.",
      soru: "Şimdi sırada soru var. A using, B used, C use, D uses.",
      cozum: "Cevap B, used. Methods'a iş yapılıyor, pasif ilişki.",
      avci: "İsim işi yapıyorsa V-ing, işe maruz kalıyorsa V3, avla!",
    },
    nedenBadge: "V-ING vs V3",
    nedenText: "isim işi yapıyorsa V-ing, işe maruz kalıyorsa V3.",
    tuzakText: "Sadece kelimenin biçimine bakıp yönü kontrol etmeme tuzağı.",
    examples: [{ parts: [
      { text: "The methods", style: "plain" }, { text: "used", style: "trap" }, { text: "in this study produced reliable results.", style: "plain" },
    ] }],
    breakdown: [
      { text: "methods → işe maruz kalıyor (pasif)", color: R },
      { text: "V3 → used", color: Y },
    ],
    question: { sentence: "The methods _____ in this study produced reliable results.", options: ["A) using", "B) used", "C) use", "D) uses"] },
    answerLabel: "B) USED",
    cozumText: "Metodlar kullanılıyor (pasif ilişki) → used.",
    avciKodu: "İSİM İŞİ YAPIYOR→V-ING |\nİŞ İSME YAPILIYOR→V3",
  }),
  lesson({
    id: "passive-voice", epNum: 11, audioFolder: "master-11",
    hookTitle: "PASSIVE VOICE TUZAĞI!",
    kuralLines: ["Pasif iskelet: BE + V3.", "Tense bilgisi BE'de."],
    narration: {
      hook: "PASSIVE VOICE TUZAĞI!",
      kural: "Pasif yapının iskeleti BE artı V3'tür.",
      neden: "The data were collected in 2025. Odak, işi yapandan çok eyleme maruz kalan öğede.",
      tuzak: "BE fiilini unutup sadece V3 yazma tuzağı.",
      ornek: "The data were collected in 2025. Were artı collected.",
      soru: "Şimdi sırada soru var. A introduced, B were introduced, C introducing, D have introduce.",
      cozum: "Cevap B, were introduced. Özne işi yapmıyor.",
      avci: "Özne işi yapıyor mu? Hayır ise BE artı V3 ara, avla!",
    },
    nedenBadge: "BE + V3",
    nedenText: "odak, işi yapandan çok eyleme maruz kalan öğededir.",
    tuzakText: "BE fiilini unutup sadece V3 yazma tuzağı.",
    examples: [{ parts: [
      { text: "The data", style: "plain" }, { text: "were collected", style: "trap" }, { text: "in 2025.", style: "plain" },
    ] }],
    breakdown: [
      { text: "BE → were", color: Y },
      { text: "V3 → collected", color: G },
    ],
    question: { sentence: "The new regulations _____ last year.", options: ["A) introduced", "B) were introduced", "C) introducing", "D) have introduce"] },
    answerLabel: "B) WERE INTRODUCED",
    cozumText: "Özne (regulations) işi yapmıyor → BE + V3.",
    avciKodu: "ÖZNE İŞİ YAPIYOR MU? HAYIR →\nBE + V3 ARA",
  }),
  lesson({
    id: "who-which", epNum: 12, audioFolder: "master-12",
    hookTitle: "WHO / WHICH TUZAĞI!",
    kuralLines: ["Kişi için WHO.", "Şey/nesne için WHICH."],
    narration: {
      hook: "WHO WHICH TUZAĞI!",
      kural: "Kişi için who, şey ya da nesne için which kullanılır.",
      neden: "The scientist who developed the method, the technology which changed communication.",
      tuzak: "Öncülü tanımadan önce şık seçme tuzağı.",
      ornek: "The scientist who discovered the treatment received an award. Öncül: kişi.",
      soru: "Şimdi sırada soru var. A who, B whom, C whose, D where.",
      cozum: "Cevap A, who. Öncül kişi ve cümlede özne.",
      avci: "Sola bak, öncülü tanı, kişi veya şey, avla!",
    },
    nedenBadge: "WHO vs WHICH",
    nedenText: "kişi için who, şey/nesne/kavram için which kullanılır.",
    tuzakText: "Öncülü tanımadan önce şık seçme tuzağı.",
    examples: [{ parts: [
      { text: "The scientist", style: "trap" }, { text: "who discovered the treatment", style: "plain" }, { text: "received an award.", style: "plain" },
    ] }],
    breakdown: [
      { text: "öncül → the scientist (kişi)", color: G },
      { text: "cümlede görev → özne", color: Y },
    ],
    question: { sentence: "The scientist _____ discovered the treatment received an award.", options: ["A) who", "B) whom", "C) whose", "D) where"] },
    answerLabel: "A) WHO",
    cozumText: "Öncül kişi ve clause içinde özne → who.",
    avciKodu: "SOLA BAK → ÖNCÜLÜ TANI →\nKİŞİ/ŞEY + GÖREV → AVLA",
  }),
  lesson({
    id: "modal-have-v3", epNum: 13, audioFolder: "master-13",
    hookTitle: "MODAL + HAVE V3 TUZAĞI!",
    kuralLines: ["Modal + have + V3.", "Geçmişe dönük çıkarım."],
    narration: {
      hook: "MODAL HAVE V3 TUZAĞI!",
      kural: "Modal artı have artı V3, geçmişteki bir olay hakkında çıkarım kurar.",
      neden: "He must have forgotten the meeting, geçmişe dönük güçlü çıkarım.",
      tuzak: "Şimdiki zamanla karıştırıp modal artı V1 seçme tuzağı.",
      ornek: "She looks exhausted. She must have worked all night. Şimdiki kanıt, geçmiş sebep.",
      soru: "Şimdi sırada soru var. A must work, B must have worked, C should work, D can work.",
      cozum: "Cevap B, must have worked. Şimdiki kanıt, geçmiş sebep.",
      avci: "Modal artı have artı V3, geçmiş pencereyi aç, avla!",
    },
    nedenBadge: "MODAL + HAVE + V3",
    nedenText: "geçmişteki bir olay hakkında çıkarım, olasılık, eleştiri kurar.",
    tuzakText: "Şimdiki zamanla karıştırıp modal artı V1 seçme tuzağı.",
    examples: [{ parts: [
      { text: "She looks exhausted. She", style: "plain" }, { text: "must have worked", style: "trap" }, { text: "all night.", style: "plain" },
    ] }],
    breakdown: [
      { text: "şimdiki kanıt → looks exhausted", color: G },
      { text: "geçmiş sebep → must have worked", color: Y },
    ],
    question: { sentence: "She looks exhausted. She _____ all night.", options: ["A) must work", "B) must have worked", "C) should work", "D) can work"] },
    answerLabel: "B) MUST HAVE WORKED",
    cozumText: "Şimdiki kanıt + geçmiş sebep → must have worked.",
    avciKodu: "MODAL+HAVE+V3 →\nGEÇMİŞ PENCEREYİ AÇ → ANLAMI KONTROL ET",
  }),
  lesson({
    id: "zamir-referans", epNum: 14, audioFolder: "master-14",
    hookTitle: "ZAMİR TUZAĞI!",
    kuralLines: ["it/they/this/these gördüğünde", "geriye dön, sayıyı kontrol et."],
    narration: {
      hook: "ZAMİR TUZAĞI!",
      kural: "It, they, this, these gördüğünde geriye dön, sayı ve anlam uyumunu kontrol et.",
      neden: "It tekil, they çoğul, these çoğul. Researchers developed new methods, they tested them.",
      tuzak: "Zamiri, en yakın ismi bakmadan otomatik seçme tuzağı.",
      ornek: "Researchers developed new methods. They tested them carefully. They, researchers'a işaret eder.",
      soru: "Şimdi sırada soru var. A it, B they, C this, D that.",
      cozum: "Cevap B, they. Online resources çoğul.",
      avci: "Zamir, geriye bak, tekil çoğul kontrol et, avla!",
    },
    nedenBadge: "ZAMİR → GERİYE BAK",
    nedenText: "IT tekil, THEY/THESE çoğul; referansı geriye bakarak bul.",
    tuzakText: "Zamiri, en yakın ismi bakmadan otomatik seçme tuzağı.",
    examples: [{ parts: [
      { text: "Researchers developed new methods.", style: "plain" }, { text: "They", style: "trap" }, { text: "tested them carefully.", style: "plain" },
    ] }],
    breakdown: [
      { text: "they → researchers (çoğul)", color: G },
    ],
    question: { sentence: "Many students use online resources because _____ provide quick access to information.", options: ["A) it", "B) they", "C) this", "D) that"] },
    answerLabel: "B) THEY",
    cozumText: "\"Online resources\" çoğul → they.",
    avciKodu: "ZAMİR → GERİYE BAK →\nTEKİL/ÇOĞUL → ANLAM",
  }),
  lesson({
    id: "svo-master-1", epNum: 15, audioFolder: "master-15",
    hookTitle: "S+V+O MASTER AVCI 1!",
    kuralLines: ["Tek kurala değil,", "tarama sistemine geç."],
    narration: {
      hook: "S V O MASTER AVCI!",
      kural: "Tek bir kurala değil, tam bir tarama sistemine geç: fiil, özne, patron, nesne.",
      neden: "The rapid development of digital technologies has changed modern society. Fiil, sola dön, patron isim, nesne.",
      tuzak: "Özne bloğunun patronunu bulmadan fiil çekimleme tuzağı.",
      ornek: "Has changed fiili, özne bloğu development, patron isim development, nesne modern society.",
      soru: "Şimdi sırada soru var. A influence, B influences, C influencing, D influenced by.",
      cozum: "Cevap B, influences. Özne bloğunun patronu use, tekil.",
      avci: "Fiil, özne, patron, nesne, sinyal, şık ele, anlam, avla!",
    },
    nedenBadge: "TARAMA SİSTEMİ",
    nedenText: "fiil → sola dön → patron isim → nesne → tek tek tara.",
    tuzakText: "Özne bloğunun patronunu bulmadan fiil çekimleme tuzağı.",
    examples: [{ parts: [
      { text: "The rapid development of digital technologies", style: "plain" }, { text: "has changed", style: "verb" }, { text: "modern society.", style: "plain" },
    ] }],
    breakdown: [
      { text: "patron isim → development", color: G },
      { text: "V → has changed", color: Y },
      { text: "O → modern society", color: R },
    ],
    question: { sentence: "The increasing use of artificial intelligence _____ many aspects of modern life.", options: ["A) influence", "B) influences", "C) influencing", "D) influenced by"] },
    answerLabel: "B) INFLUENCES",
    cozumText: "Özne bloğunun patronu \"use\" tekildir.",
    avciKodu: "FİİL→S→PATRON→O→\nSİNYAL→ŞIK ELE→ANLAM",
  }),
  lesson({
    id: "so-that-in-order-to", epNum: 16, audioFolder: "master-16",
    hookTitle: "SO THAT / IN ORDER TO TUZAĞI!",
    kuralLines: ["So that + cümle (S+V).", "In order to + V1."],
    narration: {
      hook: "SO THAT IN ORDER TO TUZAĞI!",
      kural: "So that'ten sonra cümle, in order to'dan sonra yalın fiil gelir.",
      neden: "Students study hard so that they can pass. Students study hard in order to pass.",
      tuzak: "İkisini de 'mek için' diye çevirip sağdaki yapıyı kaçırma tuzağı.",
      ornek: "Researchers collect data in order to understand social changes.",
      soru: "Şimdi sırada soru var. A so that, B in order to, C although, D because of.",
      cozum: "Cevap B, in order to. Sağda yalın fiil var.",
      avci: "Amaç, sağa bak, S artı V ise so that, V1 ise in order to, avla!",
    },
    nedenBadge: "SO THAT ≠ IN ORDER TO",
    nedenText: "amaç anlatımında sağdaki yapı hangisinin kullanılacağını belirler.",
    tuzakText: "İkisini de \"-mek için\" diye çevirip sağdaki yapıyı kaçırma tuzağı.",
    examples: [
      { parts: [{ text: "so that", style: "verb" }, { text: "they can pass the exam", style: "plain" }] },
      { parts: [{ text: "in order to", style: "trap" }, { text: "pass the exam", style: "plain" }] },
    ],
    breakdown: [
      { text: "so that → S + V", color: Y },
      { text: "in order to → V1", color: R },
    ],
    question: { sentence: "Researchers collect data _____ understand social changes.", options: ["A) so that", "B) in order to", "C) although", "D) because of"] },
    answerLabel: "B) IN ORDER TO",
    cozumText: "Sağda yalın fiil (understand) var → in order to.",
    avciKodu: "AMAÇ→SAĞA BAK→\nS+V=SO THAT | V1=IN ORDER TO",
  }),
  lesson({
    id: "since-as", epNum: 17, audioFolder: "master-17",
    hookTitle: "SINCE / AS TUZAĞI!",
    kuralLines: ["SINCE sebep veya zaman.", "Bağlamı tara, ezberleme."],
    narration: {
      hook: "SINCE AS TUZAĞI!",
      kural: "Since sebep veya zaman anlamı taşıyabilir, bağlamı tara.",
      neden: "Since the weather was bad, event cancelled, sebep. She has lived here since 2020, zaman.",
      tuzak: "SINCE gördüğü anda otomatik 'den beri' deme tuzağı.",
      ornek: "Since many people use social media, companies advertise online. Sebep ilişkisi.",
      soru: "Şimdi sırada soru var. A Since, B Despite, C However, D Unless.",
      cozum: "Cevap A, Since. Sebep-sonuç ilişkisi var.",
      avci: "Since as, bağlamı tara, sebep mi zaman mı, doğrula, avla!",
    },
    nedenBadge: "SINCE / AS",
    nedenText: "sebep veya zaman anlamı taşıyabilir — bağlamı tara.",
    tuzakText: "SINCE gördüğü anda otomatik \"-den beri\" deme tuzağı.",
    examples: [{ parts: [
      { text: "Since", style: "trap" }, { text: "the weather was bad, the event was cancelled.", style: "plain" },
    ] }],
    breakdown: [
      { text: "since → sebep (bu örnekte)", color: Y },
    ],
    question: { sentence: "_____ many people use social media, companies increasingly advertise online.", options: ["A) Since", "B) Despite", "C) However", "D) Unless"] },
    answerLabel: "A) SINCE",
    cozumText: "Sebep-sonuç ilişkisi var → Since.",
    avciKodu: "SINCE/AS → BAĞLAMI TARA →\nSEBEP Mİ ZAMAN MI? DOĞRULA",
  }),
  lesson({
    id: "while-whereas", epNum: 18, audioFolder: "master-18",
    hookTitle: "WHILE / WHEREAS TUZAĞI!",
    kuralLines: ["WHEREAS karşılaştırma/zıtlık.", "WHILE de zıtlık, ayrıca zaman."],
    narration: {
      hook: "WHILE WHEREAS TUZAĞI!",
      kural: "Whereas iki durum arasında karşılaştırma kurar. While de zıtlık ve zaman anlamı taşıyabilir.",
      neden: "Some students prefer online courses, whereas others prefer traditional classes. Some, others sinyali.",
      tuzak: "While gördüğünde yalnız zaman düşünme tuzağı.",
      ornek: "Some people enjoy city life, whereas others prefer the countryside. Karşılaştırma.",
      soru: "Şimdi sırada soru var. A because, B whereas, C therefore, D despite.",
      cozum: "Cevap B, whereas. İki taraf karşılaştırılıyor.",
      avci: "İki tarafı tara, karşılaştırma varsa whereas, avla!",
    },
    nedenBadge: "WHEREAS = KARŞILAŞTIRMA",
    nedenText: "some ↔ others gibi sinyallerle iki durumu karşılaştırır.",
    tuzakText: "While gördüğünde yalnız zaman düşünme tuzağı.",
    examples: [{ parts: [
      { text: "Some students prefer online courses,", style: "plain" }, { text: "whereas", style: "trap" }, { text: "others prefer traditional classes.", style: "plain" },
    ] }],
    breakdown: [
      { text: "some ↔ others → karşılaştırma", color: G },
    ],
    question: { sentence: "Some people enjoy city life, _____ others prefer the countryside.", options: ["A) because", "B) whereas", "C) therefore", "D) despite"] },
    answerLabel: "B) WHEREAS",
    cozumText: "İki durum karşılaştırılıyor → whereas.",
    avciKodu: "İKİ TARAFI TARA →\nKARŞILAŞTIRMA → WHEREAS/WHILE",
  }),
  lesson({
    id: "even-though-even-if", epNum: 19, audioFolder: "master-19",
    hookTitle: "EVEN THOUGH / EVEN IF TUZAĞI!",
    kuralLines: ["EVEN THOUGH gerçek duruma rağmen.", "EVEN IF varsayım/koşula rağmen."],
    narration: {
      hook: "EVEN THOUGH EVEN IF TUZAĞI!",
      kural: "Even though gerçek bir duruma rağmen zıt sonuç, even if varsayımsal koşulda 'olsa bile' fikri verir.",
      neden: "Even though he was tired, he continued working, yorgun olduğu gerçek. I will go even if it rains, olası koşul.",
      tuzak: "İkisini de aynı sanma tuzağı.",
      ornek: "I will attend the meeting even if it rains. Olası koşul.",
      soru: "Şimdi sırada soru var. A even if, B even though, C because of, D whereas.",
      cozum: "Cevap A, even if. Olası bir koşul var.",
      avci: "Gerçek durum ise even though, varsayım ise even if, avla!",
    },
    nedenBadge: "EVEN THOUGH ≠ EVEN IF",
    nedenText: "gerçek durum mu, varsayım/koşul mu — ayrımı bu belirler.",
    tuzakText: "İkisini de aynı sanma tuzağı.",
    examples: [{ parts: [
      { text: "I will attend the meeting", style: "plain" }, { text: "even if", style: "trap" }, { text: "it rains.", style: "plain" },
    ] }],
    breakdown: [
      { text: "even if → olası koşul", color: Y },
    ],
    question: { sentence: "I will attend the meeting _____ it rains.", options: ["A) even if", "B) even though", "C) because of", "D) whereas"] },
    answerLabel: "A) EVEN IF",
    cozumText: "Yağmur olası bir koşul → even if.",
    avciKodu: "GERÇEK=EVEN THOUGH |\nVARSAYIM/KOŞUL=EVEN IF",
  }),
  lesson({
    id: "provided-that", epNum: 20, audioFolder: "master-20",
    hookTitle: "PROVIDED THAT TUZAĞI!",
    kuralLines: ["Provided that = şartıyla.", "IF benzeri koşul ilişkisi."],
    narration: {
      hook: "PROVIDED THAT TUZAĞI!",
      kural: "Provided that, şartıyla koşuluyla anlamına gelir, if benzeri koşul kurar.",
      neden: "You can borrow the car provided that you drive carefully. Sonuç bir koşula bağlı.",
      tuzak: "Provided that'i sıradan bir bağlaç sanma tuzağı.",
      ornek: "The project can continue provided that sufficient funding is available. Sonuç şarta bağlı.",
      soru: "Şimdi sırada soru var. A although, B provided that, C despite, D however.",
      cozum: "Cevap B, provided that. Sonuç bir şarta bağlı.",
      avci: "Sonuç bir şarta bağlıysa provided that, avla!",
    },
    nedenBadge: "PROVIDED THAT = ŞARTIYLA",
    nedenText: "sonuç bir koşula bağlıysa provided that kullanılır.",
    tuzakText: "Provided that'i sıradan bir bağlaç sanma tuzağı.",
    examples: [{ parts: [
      { text: "You can borrow the car", style: "plain" }, { text: "provided that", style: "trap" }, { text: "you drive carefully.", style: "plain" },
    ] }],
    breakdown: [
      { text: "sonuç → bir şarta bağlı", color: Y },
    ],
    question: { sentence: "The project can continue _____ sufficient funding is available.", options: ["A) although", "B) provided that", "C) despite", "D) however"] },
    answerLabel: "B) PROVIDED THAT",
    cozumText: "Sonuç bir şarta bağlı → provided that.",
    avciKodu: "SONUÇ BİR ŞARTA BAĞLI →\nPROVIDED THAT",
  }),
  lesson({
    id: "in-case", epNum: 21, audioFolder: "master-21",
    hookTitle: "IN CASE TUZAĞI!",
    kuralLines: ["IN CASE = önceden tedbir.", "IF ile aynı değildir."],
    narration: {
      hook: "IN CASE TUZAĞI!",
      kural: "In case, olası bir duruma karşı önceden tedbir alma fikri taşır, if ile aynı değildir.",
      neden: "Take an umbrella in case it rains. Şemsiye, yağmur ihtimaline karşı önceden alınır.",
      tuzak: "In case'i otomatik if olarak çevirme tuzağı.",
      ornek: "Take some extra money in case you need it. Önceden tedbir.",
      soru: "Şimdi sırada soru var. A although, B in case, C because of, D whereas.",
      cozum: "Cevap B, in case. Olası duruma karşı tedbir.",
      avci: "Olası durum, önceden tedbir, in case, avla!",
    },
    nedenBadge: "IN CASE = ÖNCEDEN TEDBİR",
    nedenText: "olası bir duruma karşı önceden alınan tedbiri anlatır.",
    tuzakText: "In case'i otomatik if olarak çevirme tuzağı.",
    examples: [{ parts: [
      { text: "Take an umbrella", style: "plain" }, { text: "in case", style: "trap" }, { text: "it rains.", style: "plain" },
    ] }],
    breakdown: [
      { text: "in case → olası duruma karşı tedbir", color: Y },
    ],
    question: { sentence: "Take some extra money _____ you need it.", options: ["A) although", "B) in case", "C) because of", "D) whereas"] },
    answerLabel: "B) IN CASE",
    cozumText: "Olası bir duruma karşı önceden tedbir → in case.",
    avciKodu: "OLASI DURUM →\nÖNCEDEN TEDBİR → IN CASE",
  }),
  lesson({
    id: "which-that", epNum: 22, audioFolder: "master-22",
    hookTitle: "WHICH / THAT TUZAĞI!",
    kuralLines: ["Virgüllü (non-defining) clause'da", "WHICH var, THAT yok."],
    narration: {
      hook: "WHICH THAT TUZAĞI!",
      kural: "Virgülle ek bilgi veren non-defining relative clause'da which kullanılır, that kullanılmaz.",
      neden: "The device, which was developed recently, is expensive. Virgül sinyali.",
      tuzak: "Şey/nesne gördüğünde which ve that'i her yerde eşit sanma tuzağı.",
      ornek: "The new system, which was introduced last year, reduced costs. Virgüllü ek bilgi.",
      soru: "Şimdi sırada soru var. A that, B which, C what, D whom.",
      cozum: "Cevap B, which. Virgüllü yapıda that kullanılmaz.",
      avci: "Virgülü gör, non-defining kontrol et, that'i ele, which, avla!",
    },
    nedenBadge: "VİRGÜL → WHICH",
    nedenText: "non-defining relative clause'da (virgüllü) which kullanılır, that kullanılmaz.",
    tuzakText: "Şey/nesne gördüğünde which ve that'i her yerde eşit sanma tuzağı.",
    examples: [{ parts: [
      { text: "The device,", style: "plain" }, { text: "which", style: "trap" }, { text: "was developed recently, is expensive.", style: "plain" },
    ] }],
    breakdown: [
      { text: "virgül → non-defining → WHICH", color: Y },
    ],
    question: { sentence: "The new system, _____ was introduced last year, reduced costs.", options: ["A) that", "B) which", "C) what", "D) whom"] },
    answerLabel: "B) WHICH",
    cozumText: "Virgüllü ek bilgi cümlesi → which (that olamaz).",
    avciKodu: "VİRGÜLÜ GÖR → NON-DEFINING →\nTHAT'I ELE → WHICH",
  }),
  lesson({
    id: "who-whom", epNum: 23, audioFolder: "master-23",
    hookTitle: "WHO / WHOM TUZAĞI!",
    kuralLines: ["WHO clause içinde özne.", "WHOM clause içinde nesne."],
    narration: {
      hook: "WHO WHOM TUZAĞI!",
      kural: "Who relative clause içinde özne olabilir, whom nesne işlevindedir.",
      neden: "The scientist who discovered the drug, who işi yapan. The researcher whom we interviewed, whom nesne.",
      tuzak: "Clause içinde özne olup olmadığını kontrol etmeden şık seçme tuzağı.",
      ornek: "The researcher whom we interviewed was very experienced. We özne, whom nesne.",
      soru: "Şimdi sırada soru var. A whose, B whom, C which, D where.",
      cozum: "Cevap B, whom. Clause'da özne (we) zaten var.",
      avci: "Clause'da özne var mı? Varsa boşluk nesne, whom, avla!",
    },
    nedenBadge: "WHO=ÖZNE, WHOM=NESNE",
    nedenText: "clause içinde zaten bir özne varsa boşluk nesne işlevi görür.",
    tuzakText: "Clause içinde özne olup olmadığını kontrol etmeden şık seçme tuzağı.",
    examples: [{ parts: [
      { text: "The researcher", style: "plain" }, { text: "whom", style: "trap" }, { text: "we interviewed was very experienced.", style: "plain" },
    ] }],
    breakdown: [
      { text: "we → clause'un öznesi", color: G },
      { text: "whom → nesne", color: Y },
    ],
    question: { sentence: "The researcher _____ we interviewed was very experienced.", options: ["A) whose", "B) whom", "C) which", "D) where"] },
    answerLabel: "B) WHOM",
    cozumText: "Clause'da özne (we) zaten var → boşluk nesne, whom.",
    avciKodu: "CLAUSE'DA ÖZNE VAR MI? →\nVARSA BOŞLUK NESNE → WHOM",
  }),
  lesson({
    id: "noun-clause-that", epNum: 24, audioFolder: "master-24",
    hookTitle: "NOUN CLAUSE: THAT TUZAĞI!",
    kuralLines: ["'that + S + V' bütünü", "isim görevi görebilir."],
    narration: {
      hook: "NOUN CLAUSE THAT TUZAĞI!",
      kural: "That bir noun clause başlatabilir, that artı özne artı fiil bütünü isim görevi görür.",
      neden: "Researchers believe that technology affects society. That technology affects society, believe fiilinin içeriğidir.",
      tuzak: "Her that'i relative pronoun sanma tuzağı.",
      ornek: "Scientists believe that climate change affects human health. Noun clause.",
      soru: "Şimdi sırada soru var. A what, B that, C whose, D whom.",
      cozum: "Cevap B, that. Sağda tam bir cümle var, fiilin içeriği.",
      avci: "That, sağda tam cümle, fiilin içeriği mi, noun clause, avla!",
    },
    nedenBadge: "THAT + S + V = NOUN CLAUSE",
    nedenText: "sağda tam bir cümle varsa ve fiilin içeriğiyse noun clause'dur.",
    tuzakText: "Her that'i relative pronoun sanma tuzağı.",
    examples: [{ parts: [
      { text: "Researchers believe", style: "plain" }, { text: "that", style: "trap" }, { text: "technology affects society.", style: "plain" },
    ] }],
    breakdown: [
      { text: "that technology affects society → believe'in içeriği", color: Y },
    ],
    question: { sentence: "Scientists believe _____ climate change affects human health.", options: ["A) what", "B) that", "C) whose", "D) whom"] },
    answerLabel: "B) THAT",
    cozumText: "Sağda tam cümle var, believe fiilinin içeriği → that.",
    avciKodu: "THAT→SAĞDA TAM CÜMLE→\nFİİLİN İÇERİĞİ Mİ?→NOUN CLAUSE",
  }),
  lesson({
    id: "present-perfect", epNum: 25, audioFolder: "master-25",
    hookTitle: "PRESENT PERFECT TUZAĞI!",
    kuralLines: ["HAVE/HAS + V3.", "SINCE=başlangıç, FOR=süre."],
    narration: {
      hook: "PRESENT PERFECT TUZAĞI!",
      kural: "Have has artı V3, geçmiş ile şimdi arasında bağlantı kurar. Since başlangıç noktası, for süre.",
      neden: "Researchers have studied this issue for many years. Bağlamı doğrula, sadece since for'a bakma.",
      tuzak: "SINCE FOR görünce otomatik cevap verme tuzağı.",
      ornek: "Scientists have studied the problem since 2020. Şimdiye uzanan zaman çizgisi.",
      soru: "Şimdi sırada soru var. A studied, B have studied, C were studying, D had studied.",
      cozum: "Cevap B, have studied. Zaman çizgisi şimdiye uzanıyor.",
      avci: "Since for, zaman çizgisini kontrol et, şimdiye uzanıyorsa have has artı V3, avla!",
    },
    nedenBadge: "SINCE=BAŞLANGIÇ, FOR=SÜRE",
    nedenText: "geçmiş ile şimdi arasında bağlantı varsa present perfect kullanılır.",
    tuzakText: "SINCE FOR görünce otomatik cevap verme tuzağı.",
    examples: [{ parts: [
      { text: "Scientists", style: "plain" }, { text: "have studied", style: "verb" }, { text: "the problem since 2020.", style: "plain" },
    ] }],
    breakdown: [
      { text: "since 2020 → şimdiye uzanan zaman çizgisi", color: Y },
    ],
    question: { sentence: "Scientists _____ the problem since 2020.", options: ["A) studied", "B) have studied", "C) were studying", "D) had studied"] },
    answerLabel: "B) HAVE STUDIED",
    cozumText: "Zaman çizgisi 2020'den şimdiye uzanıyor → have studied.",
    avciKodu: "SINCE/FOR→ZAMAN ÇİZGİSİ→\nŞİMDİYE UZANIYORSA HAVE/HAS+V3",
  }),
  lesson({
    id: "past-perfect", epNum: 26, audioFolder: "master-26",
    hookTitle: "PAST PERFECT TUZAĞI!",
    kuralLines: ["HAD + V3.", "Geçmişte daha önceki olay."],
    narration: {
      hook: "PAST PERFECT TUZAĞI!",
      kural: "Had artı V3, geçmişte başka bir geçmiş noktadan daha önce tamamlanan olayı gösterir.",
      neden: "The train had left before we arrived. Had left önce, arrived sonra.",
      tuzak: "İki geçmiş olay görünce otomatik had V3 seçme tuzağı, kronolojiyi doğrula.",
      ornek: "By the time we arrived, the meeting had started. Kronoloji sinyali.",
      soru: "Şimdi sırada soru var. A starts, B had started, C has started, D will start.",
      cozum: "Cevap B, had started. Toplantı, biz varmadan önce başlamıştı.",
      avci: "Geçmiş referans, daha önceki olay, had artı V3, avla!",
    },
    nedenBadge: "HAD + V3",
    nedenText: "iki geçmiş olaydan önce gerçekleşeni gösterir — kronolojiyi doğrula.",
    tuzakText: "İki geçmiş olay görünce otomatik had V3 seçme tuzağı.",
    examples: [{ parts: [
      { text: "The train", style: "plain" }, { text: "had left", style: "trap" }, { text: "before we arrived.", style: "plain" },
    ] }],
    breakdown: [
      { text: "had left → önce", color: Y },
      { text: "arrived → sonra", color: G },
    ],
    question: { sentence: "By the time we arrived, the meeting _____.", options: ["A) starts", "B) had started", "C) has started", "D) will start"] },
    answerLabel: "B) HAD STARTED",
    cozumText: "Toplantı, biz varmadan önce başlamıştı → had started.",
    avciKodu: "GEÇMİŞ REFERANS →\nDAHA ÖNCEKİ OLAY → HAD+V3",
  }),
  lesson({
    id: "conditionals", epNum: 27, audioFolder: "master-27",
    hookTitle: "CONDITIONALS TUZAĞI!",
    kuralLines: ["IF+Present→WILL+V1 (Type 1).", "IF+HAD+V3→WOULD HAVE+V3 (Type 3)."],
    narration: {
      hook: "CONDITIONALS TUZAĞI!",
      kural: "If artı present, will artı V1. If artı had artı V3, would have artı V3.",
      neden: "Bunlar temel sınav eşleştirmeleridir, önce yapı sonra anlam kontrol edilir.",
      tuzak: "Tipleri karıştırıp yanlış eşleştirme tuzağı.",
      ornek: "If they had acted earlier, they would have prevented the problem. Type 3.",
      soru: "Şimdi sırada soru var. A prevent, B would prevent, C would have prevented, D will prevent.",
      cozum: "Cevap C, would have prevented. If tarafı had artı V3, Type 3.",
      avci: "If tarafını önce tara, had V3 ise would have V3, avla!",
    },
    nedenBadge: "IF HAD V3 → WOULD HAVE V3",
    nedenText: "önce IF tarafının yapısı taranır, sonra ana cümle buna göre kurulur.",
    tuzakText: "Tipleri karıştırıp yanlış eşleştirme tuzağı.",
    examples: [{ parts: [
      { text: "If they had acted earlier,", style: "plain" }, { text: "they would have prevented", style: "trap" }, { text: "the problem.", style: "plain" },
    ] }],
    breakdown: [
      { text: "IF + had + V3 → Type 3", color: Y },
      { text: "would have + V3", color: G },
    ],
    question: { sentence: "If they had acted earlier, they _____ the problem.", options: ["A) prevent", "B) would prevent", "C) would have prevented", "D) will prevent"] },
    answerLabel: "C) WOULD HAVE PREVENTED",
    cozumText: "IF tarafı had + V3 → Type 3 → would have prevented.",
    avciKodu: "IF TARAFINI ÖNCE TARA →\nHAD V3 → WOULD HAVE V3",
  }),
  lesson({
    id: "inversion", epNum: 28, audioFolder: "master-28",
    hookTitle: "INVERSION TUZAĞI!",
    kuralLines: ["Never/rarely/seldom başta →", "AUX önce özne."],
    narration: {
      hook: "INVERSION TUZAĞI!",
      kural: "Never, rarely, seldom cümle başına taşındığında yardımcı fiil öznenin önüne gelir.",
      neden: "Never have scientists faced such a challenge. Never artı aux artı özne artı fiil.",
      tuzak: "Normal özne fiil sırasını koruma tuzağı.",
      ornek: "Rarely has society experienced such rapid social change. Ters çevrilmiş sıra.",
      soru: "Şimdi sırada soru var. A society has experienced, B has society experienced, C society experienced, D did experienced society.",
      cozum: "Cevap B, has society experienced. Rarely başta, aux önce özne.",
      avci: "Negatif ifade başta, aux artı özne sırasını ara, avla!",
    },
    nedenBadge: "NEVER/RARELY + AUX + S",
    nedenText: "negatif/limitli ifadeler başa taşınınca yardımcı fiil özneden önce gelir.",
    tuzakText: "Normal özne-fiil sırasını koruma tuzağı.",
    examples: [{ parts: [
      { text: "Never", style: "trap" }, { text: "have scientists faced", style: "plain" }, { text: "such a challenge.", style: "plain" },
    ] }],
    breakdown: [
      { text: "NEVER + AUX + S + V", color: Y },
    ],
    question: { sentence: "Rarely _____ such rapid social change.", options: ["A) society has experienced", "B) has society experienced", "C) society experienced", "D) did experienced society"] },
    answerLabel: "B) HAS SOCIETY EXPERIENCED",
    cozumText: "Rarely başta → aux (has) özneden (society) önce gelir.",
    avciKodu: "NEGATİF/LİMİTLİ BAŞTA →\nAUX+S SIRASINI ARA",
  }),
  lesson({
    id: "paragraf-sinyal-avi", epNum: 29, audioFolder: "master-29",
    hookTitle: "PARAGRAF SİNYAL AVI!",
    kuralLines: ["Önceki-sonraki cümle ilişkisi.", "Zıtlık, sebep, sonuç, örnek."],
    narration: {
      hook: "PARAGRAF SİNYAL AVI!",
      kural: "Paragraf boşluğunu tek başına çözme, önceki ve sonraki cümle arasındaki ilişkiyi bul.",
      neden: "Dört temel av: zıtlık, sebep, sonuç, örnek.",
      tuzak: "Kelime çevirisine takılıp paragrafın yönünü kaçırma tuzağı.",
      ornek: "Online education is flexible. However, some students struggle without face-to-face interaction. Zıtlık.",
      soru: "Şimdi sırada soru var. A Therefore, B However, C Because, D For example.",
      cozum: "Cevap B, However. Flexible ile struggle arasında zıtlık var.",
      avci: "Sol cümle, sağ cümle, ilişkiyi bul, sinyali yakala, avla!",
    },
    nedenBadge: "ZITLIK · SEBEP · SONUÇ · ÖRNEK",
    nedenText: "önceki ve sonraki cümle arasındaki mantıksal ilişkiyi bul.",
    tuzakText: "Kelime çevirisine takılıp paragrafın yönünü kaçırma tuzağı.",
    examples: [{ parts: [
      { text: "Online education is flexible.", style: "plain" }, { text: "However,", style: "trap" }, { text: "some students struggle...", style: "plain" },
    ] }],
    breakdown: [
      { text: "flexible ↔ struggle → zıtlık", color: Y },
    ],
    question: { sentence: "Online education is flexible. _____, some students struggle without face-to-face interaction.", options: ["A) Therefore", "B) However", "C) Because", "D) For example"] },
    answerLabel: "B) HOWEVER",
    cozumText: "flexible ↔ struggle arasında zıtlık var → However.",
    avciKodu: "SOL CÜMLE → SAĞ CÜMLE →\nİLİŞKİ → SİNYAL",
  }),
  lesson({
    id: "master-avci-2-finale", epNum: 30, audioFolder: "master-30",
    hookTitle: "MASTER AVCI 2 — SEZON FİNALİ!",
    kuralLines: ["Bütün motoru tek soruda çalıştır.", "Fiil, sinyal, patron isim, anlam."],
    narration: {
      hook: "MASTER AVCI 2! SEZON FİNALİ!",
      kural: "Bütün AVCI motorunu tek bir soruda çalıştıracağız: fiil, sinyal, patron isim, anlam.",
      neden: "Although the rapid development of technology has created new opportunities, many people still face difficulties.",
      tuzak: "Of technology grubunda technology'i otomatik özne sanma tuzağı — patron development.",
      ornek: "Fiiller: has created, face. Sinyal: Although, zıtlık. Although'dan sonra S artı V doğrula.",
      soru: "Şimdi sırada master soru var. A Despite, B Although, C Because of, D Therefore.",
      cozum: "Cevap B, Although. Sağda özne artı fiil var, iletişim gelişmesine rağmen izolasyon var.",
      avci: "Gör, fiili bul, S V O, patron ismi bul, sinyali yakala, sağ sol kontrol, şıkları ele, anlamı doğrula, avla!",
    },
    nedenBadge: "TÜM MOTORU ÇALIŞTIR",
    nedenText: "fiilleri bul, sinyali yakala, patron ismi bul, anlamı doğrula.",
    tuzakText: "\"of technology\" grubunda technology'yi özne sanma tuzağı — patron development.",
    examples: [{ parts: [
      { text: "Although the rapid development of technology has created new opportunities,", style: "plain" },
      { text: "many people still face difficulties.", style: "plain" },
    ] }],
    breakdown: [
      { text: "fiiller → has created / face", color: G },
      { text: "sinyal → Although (zıtlık)", color: Y },
    ],
    question: { sentence: "_____ technological advances have improved communication, some people remain socially isolated.", options: ["A) Despite", "B) Although", "C) Because of", "D) Therefore"] },
    answerLabel: "B) ALTHOUGH",
    cozumText: "Sağda S+V var; iletişim gelişmesine RAĞMEN izolasyon var — zıtlık.",
    avciKodu: "GÖR→FİİLİ BUL→S+V+O→PATRON İSMİ→\nSİNYALİ YAKALA→ŞIKLARI ELE→ANLAMI DOĞRULA→🎯AVLA",
    sceneFrames: [45, 150, 130, 110, 260, 260, 160, 160, 70],
  }),
  lesson({
    id: "not-only-but-also", epNum: 31, audioFolder: "master-31",
    hookTitle: "NOT ONLY...BUT ALSO TUZAĞI!",
    kuralLines: ["İki yapıyı paralel bağlar, vurgu yapar","Fiil ve yapı sırası kritiktir"],
    narration: {
      hook: "Aynı anda iki şeyi söylemek istiyorsanız, not only...but also'nun sırrını bilmelisiniz!",
      kural: "Not only + yapı A, but also + yapı B şeklinde kullanılır. Burada yapı A ve yapı B dilbilgisel olarak aynı türde olmalıdır — ikisi de isim öbeği, ikisi de fiil öbeği veya ikisi de sıfat olabilir. Fiil konusu değişirse, fiil de değişebilir ama paralel yapı bozulmamalıdır.",
      neden: "İngilizce, denge ve simetri sevdiği için paralel yapıları tercih eder. Not only...but also, dinleyiciye 'iki şey de önemli' mesajı verir ve cümleyi ritmik kılar. Sağında ve solunda aynı gramer kategorisi aranır.",
      tuzak: "Sınav, not only'den sonra bir yapı, but also'dan sonra farklı bir yapı sunarak öğrenciyi paralel yapıyı bozmaya teşvik eder.",
      ornek: "Not only is she intelligent, but also she is kind. Burada 'is she intelligent' ve 'she is kind' paralel yapıdır — her ikisi de özne + fiil + sıfat şeklindedir.",
      soru: "Aşağıdaki cümlede not only...but also yapısını doğru kullanan seçeneği bulun.",
      cozum: "Not only'den sonra gelen yapı ile but also'dan sonra gelen yapı dilbilgisel olarak aynı türde olmalıdır. Fiil konusu değişirse, fiil de değişebilir ama yapının kategorisi aynı kalmalıdır.",
      avci: "Not only → yapı A, but also → yapı A (paralel) | Fiil konusu değişse bile yapı türü aynı kalmalı!",
    },
    nedenBadge: "PARALEL YAPININ GÜCÜ",
    nedenText: "Not only...but also, iki benzer yapıyı bağlayarak ikincisine daha fazla vurgu katar ve cümleyi dengeli tutar.",
    tuzakText: "ÖSYM, fiil konumunu değiştirerek veya paralel yapıyı bozarak yanlış seçenekler sunar.",
    examples: [
  {
    "parts": [
      {
        "text": "Not only",
        "style": "trap"
      },
      {
        "text": "does he speak English",
        "style": "verb"
      },
      {
        "text": ", but also",
        "style": "trap"
      },
      {
        "text": "he speaks French fluently",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "Not only",
        "style": "trap"
      },
      {
        "text": "is the book interesting",
        "style": "verb"
      },
      {
        "text": ", but also",
        "style": "trap"
      },
      {
        "text": "it is educational",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "Not only'den sonra ters yapı (inversion) gelebilir: Does he...?", color: Y },
      { text: "But also'dan sonra normal yapı gelir: he speaks...", color: G },
      { text: "Paralel yapı: her iki kısım da aynı gramer kategorisinde olmalı", color: G }
    ],
    question: { sentence: "Not only _____ the project on time, but also she delivered exceptional results.", options: ["A) she completed","B) did she complete","C) she did complete","D) completing"] },
    answerLabel: "B) DID SHE COMPLETE",
    cozumText: "Not only'den sonra ters yapı (inversion) kullanılır: did she complete.",
    avciKodu: "Not only → TERS YAPIYI KONTROL ET (does/did/is vb. öne gelir) | But also → normal yapı | Paralel tutarlılık zorunlu!",
  }),
  lesson({
    id: "neither-nor", epNum: 32, audioFolder: "master-32",
    hookTitle: "NEITHER...NOR TUZAĞI!",
    kuralLines: ["Neither...nor olumsuz seçim sunar","Fiil her zaman tekil olur"],
    narration: {
      hook: "İki şeyi aynı anda reddetmek istediğinde İngilizce'de hangi yapı kullanırsın?",
      kural: "Neither...nor, iki isim veya isim öbeğini bağlayarak her ikisini de olumsuz yapar. Bu yapıda fiil daima tekil (singular) olur, çünkü 'hiçbiri' anlamı taşır. Örneğin: 'Neither Ali nor Veli' — ikisinden hiçbiri, yani tekil.",
      neden: "Sağında ve solunda iki seçenek vardır, ama neither...nor bunları birleştirerek tek bir olumsuz birim oluşturur. Gramer açısından bu, 'ne bu ne de o' demek olduğu için tekil fiil alır.",
      tuzak: "ÖSYM, neither...nor'un yanına çoğul fiil koyarak veya neither'i yanlış yerde (ortada, başında) göstererek öğrenciyi yanıltır.",
      ornek: "Cümle: 'Neither the manager nor the assistant was available.' — manager ve assistant iki kişi olsa da, neither...nor yapısı onları birlikte reddediyor, bu yüzden 'was' (tekil) kullanılır.",
      soru: "Aşağıdaki cümlede boşluğa hangi fiil gelmelidir?",
      cozum: "Neither...nor yapısı iki seçeneği birlikte olumsuz yapar ve gramer olarak tekil kabul edilir. Bu yüzden 'was' doğru, 'were' yanlıştır.",
      avci: "Neither...nor = hiçbiri → TEKİL FİİL ⚡ Sağ ve sol ikisi de reddedilir, ama sayı açısından 'bir' olur.",
    },
    nedenBadge: "ÇİFT OLUMSUZLUK KÖPRÜSÜ",
    nedenText: "Neither...nor yapısı iki seçeneği birlikte reddeder; gramer olarak tekil fiil gerektirir çünkü 'hiçbiri' anlamı taşır.",
    tuzakText: "ÖSYM, çoğul fiil koyan şıkları doğru göstererek veya neither'i yanlış konumlandırarak kandırır.",
    examples: [
  {
    "parts": [
      {
        "text": "Neither",
        "style": "trap"
      },
      {
        "text": "coffee",
        "style": "plain"
      },
      {
        "text": "nor",
        "style": "trap"
      },
      {
        "text": "tea",
        "style": "plain"
      },
      {
        "text": "is",
        "style": "verb"
      },
      {
        "text": "available in the office.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "Neither",
        "style": "trap"
      },
      {
        "text": "the student",
        "style": "plain"
      },
      {
        "text": "nor",
        "style": "trap"
      },
      {
        "text": "the teacher",
        "style": "plain"
      },
      {
        "text": "has",
        "style": "verb"
      },
      {
        "text": "completed the assignment.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "Neither...nor iki ismi bağlar ve her ikisini reddeder", color: G },
      { text: "Fiil daima tekil (is, has, was) olur", color: Y },
      { text: "Trap: Çoğul fiil (are, have) seçmek yanlıştır", color: R }
    ],
    question: { sentence: "Neither the doctor nor the nurse _____ able to attend the emergency meeting yesterday.", options: ["A) were","B) are","C) was","D) have been"] },
    answerLabel: "C) WAS",
    cozumText: "Neither...nor tekil fiil alır; geçmiş zaman için 'was' doğru.",
    avciKodu: "Neither...nor → Tekil Fiil ⚡ | Sağ + Sol = Hiçbiri (1 birim) | was/is/has ✓ | were/are/have ✗",
  }),
  lesson({
    id: "either-or", epNum: 33, audioFolder: "master-33",
    hookTitle: "EITHER...OR TUZAĞI!",
    kuralLines: ["Either A or B = A veya B seçeneklerinden biri","Fiil, sağdaki isimle uyumlu olur"],
    narration: {
      hook: "İki seçenekten birini seçerken, fiil kimi dinler — solda olanı mı, sağda olanı mı?",
      kural: "Either...or yapısı iki seçeneği birbirinden ayırır. Fiil, 'or' dan sonra gelen isimle uyum sağlar. Yani sağdaki isim, fiil formunu belirler.",
      neden: "Either...or, mantıksal olarak 'ya bu ya da şu' anlamı taşır; seçim yapılmış olur. Gramer açısından, seçim yapıldıktan sonra (sağdaki isim), o isimle fiil uyumlandırılır.",
      tuzak: "Öğrenci solda bulunan isimle fiili eşleştirmeye çalışır ve sağdaki ismi göz ardı eder. ÖSYM bu yanılgıyı test eder.",
      ornek: "Either the manager or the employees are responsible for the project. Burada 'employees' (çoğul) sağda olduğu için 'are' kullanılır, 'manager' (tekil) göz ardı edilir.",
      soru: "Şimdi senin için hazırladığım mini soruyu çöz ve either...or'un gerçek kuralını yakala.",
      cozum: "Doğru cevap C'dir çünkü 'or' dan sonra gelen 'students' (çoğul) fiili belirler; 'have' kullanılır, 'has' değil.",
      avci: "Either A or B → Sağdaki ismi bul → O isimle fiili uydur → Solda olanı unut!",
    },
    nedenBadge: "SEÇİM VE UYUM",
    nedenText: "Either...or iki seçeneği sunar; fiil, 'or' dan sonraki isimle anlaşma kurar.",
    tuzakText: "ÖSYM solda bulunan isimle fiil uyumunu sınar, sağdaki ismi görmezden gelmeyi bekler.",
    examples: [
  {
    "parts": [
      {
        "text": "Either",
        "style": "trap"
      },
      {
        "text": " the teacher ",
        "style": "plain"
      },
      {
        "text": "or",
        "style": "trap"
      },
      {
        "text": " the students ",
        "style": "plain"
      },
      {
        "text": "are",
        "style": "verb"
      },
      {
        "text": " attending the conference.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "Either",
        "style": "trap"
      },
      {
        "text": " John ",
        "style": "plain"
      },
      {
        "text": "or",
        "style": "trap"
      },
      {
        "text": " his parents ",
        "style": "plain"
      },
      {
        "text": "have",
        "style": "verb"
      },
      {
        "text": " the final say.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "Either...or iki seçeneği sunar; ikincisi (or'dan sonra) fiil uyumunu kontrol eder.", color: G },
      { text: "Sağdaki isim tekil ise → is/has; çoğul ise → are/have kullan.", color: Y },
      { text: "Soldaki isim göz ardı edilir; sadece sağdaki isim fiili belirler.", color: R }
    ],
    question: { sentence: "Either the director or the team members _____ responsible for the delay in the project.", options: ["A) is","B) was","C) are","D) has been"] },
    answerLabel: "C) ARE",
    cozumText: "Sağdaki 'members' çoğul → 'are' gerekli; solda 'director' yok sayılır.",
    avciKodu: "Either __ or [SAĞDAKI İSİM] → Sağdakinin sayısını bul → Fiili ona uydur → ✓",
  }),
  lesson({
    id: "such-that-result-clause", epNum: 34, audioFolder: "master-34",
    hookTitle: "SUCH...THAT TUZAĞI!",
    kuralLines: ["SUCH + sıfat/isim + THAT + sonuç","Sonuç cümlecikle bağlantı şarttır"],
    narration: {
      hook: "Bir sıfat o kadar güçlüyse, arkasında mutlaka bir sonuç cümlecik gelir — bu bağlantıyı kaçıran öğrenci hata yapar.",
      kural: "SUCH yapısı bir şeyin derecesini (ne kadar çok, ne kadar yoğun) gösterir ve bu derecenin bir sonucu vardır. Sıfat + SUCH + THAT + sonuç cümlecik şeklinde ilerler. SUCH'tan sonra THAT gelmelidir, aksi halde cümle eksik kalır.",
      neden: "SUCH bir yoğunluk/derecenin göstergesidir; bu yoğunluğun bir sonucu olmak zorundadır. THAT'sız SUCH cümlesi mantıksal olarak tamamlanmamış, öğrenci için de anlamı belirsiz kalır.",
      tuzak: "ÖSYM seçeneklerde SUCH'tan sonra BECAUSE, SO, WHICH gibi yanlış bağlaçlar koyarak öğrenciyi kandırır; ayrıca THAT'sız cümleleri doğru gösterir.",
      ornek: "The problem was such a complex issue that the team couldn't solve it in one day. — Burada SUCH + isim + THAT + sonuç cümlecik (couldn't solve it) net şekilde görülüyor.",
      soru: "Aşağıdaki cümlede boşluğu dolduracak en uygun yapıyı seçin ve SUCH...THAT kuralını test edin.",
      cozum: "SUCH'tan sonra THAT gelmelidir çünkü derecenin bir sonucu vardır. Diğer bağlaçlar (BECAUSE, SO, WHICH) bu yapıda kullanılamaz.",
      avci: "SUCH gördün mü? → Hemen THAT ara; sonuç cümlecik gelecek, THAT'sız SUCH yapısı yalan!",
    },
    nedenBadge: "SONUÇ GÖSTERMEK İÇİN",
    nedenText: "Bir şeyin o kadar yoğun/çok olduğunu göstermek için sonuç cümlecik gereklidir.",
    tuzakText: "ÖSYM, SUCH'tan sonra THAT olmadan cümle tamamlamaya çalıştırır veya yanlış bağlaç koyar.",
    examples: [
  {
    "parts": [
      {
        "text": "The weather was",
        "style": "plain"
      },
      {
        "text": "such",
        "style": "trap"
      },
      {
        "text": "terrible",
        "style": "verb"
      },
      {
        "text": "that",
        "style": "trap"
      },
      {
        "text": "we cancelled the picnic.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "She gave",
        "style": "plain"
      },
      {
        "text": "such",
        "style": "trap"
      },
      {
        "text": "a brilliant presentation",
        "style": "verb"
      },
      {
        "text": "that",
        "style": "trap"
      },
      {
        "text": "everyone applauded.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "SUCH her zaman derecenin göstergesi, yoğunluğu vurgular.", color: G },
      { text: "THAT sonuç cümlecik başlatır, SUCH'tan ayrılmaz.", color: Y },
      { text: "SUCH...THAT arasında sıfat veya isim + sıfat gelir.", color: G }
    ],
    question: { sentence: "The noise was _____ that I couldn't concentrate on my work.", options: ["A) so loud","B) such loud","C) very loud","D) too loud"] },
    answerLabel: "A) SO LOUD",
    cozumText: "SUCH değil SO kullanılır; sıfat + THAT sonuç cümlecik.",
    avciKodu: "SUCH + (isim/sıfat+isim) + THAT | SO + sıfat + THAT → Derecenin sonucu var mı? → THAT'ı ara!",
  }),
  lesson({
    id: "so-that-sonuc-yapisi", epNum: 35, audioFolder: "master-35",
    hookTitle: "SO...THAT TUZAĞI: SONUÇ CÜMLECİĞİ!",
    kuralLines: ["SO + sıfat/zarf + THAT + sonuç cümlesi","Neden-sonuç ilişkisi, amaç değil"],
    narration: {
      hook: "Bir şey çok fazla olunca, doğal olarak bir sonuç meydana geliyor — işte bu SO...THAT'in sırrı!",
      kural: "SO...THAT yapısında SO'dan sonra sıfat veya zarf gelir, ardından THAT ile sonuç cümlesi başlar. Bu yapı 'o kadar çok ki' anlamını taşır ve gerçekleşen bir sonucu gösterir, planlanmış bir amacı değil.",
      neden: "İngilizce'de neden-sonuç ilişkisini göstermek için bu yapı kullanılır. Solunda derecesi yüksek bir durum, sağında ise o durumun doğal sonucu vardır. Amaç cümlecikleri (IN ORDER TO, SO THAT'in amaç versiyonu) ile karıştırılması yaygındır.",
      tuzak: "ÖSYM, SO...THAT'i IN ORDER TO veya PURPOSE ifadeleriyle karıştıran seçenekler koyar; öğrenci sonuç yerine amacı seçebilir.",
      ornek: "The coffee was SO hot THAT she couldn't drink it immediately. — Kahve o kadar sıcaktı ki, o hemen içemedi. Burada amaç değil, sıcaklığın doğal sonucu gösterilir.",
      soru: "Şimdi bir mini soru ile SO...THAT'in gerçek sonuç anlamını yakalayalım.",
      cozum: "Doğru cevap, SO'dan sonra sıfat/zarf + THAT + sonuç cümlesi yapısını koruyandır. Amaç ifadeleri (IN ORDER TO, FOR) bu yapıyı bozar.",
      avci: "SO + (sıfat/zarf) + THAT = SONUÇ (amaç DEĞİL) → Solda derece, sağda doğal sonuç!",
    },
    nedenBadge: "SONUÇ GÖSTERMEK İÇİN",
    nedenText: "Bir durumun derecesi o kadar yüksek ki, doğal sonuç ortaya çıkıyor; amaç değil, gerçek sonuç anlatılır.",
    tuzakText: "ÖSYM, SO...THAT'i IN ORDER TO (amaç) ile karıştırtarak yanlış seçeneği çeldirici yapar.",
    examples: [
      { parts: [
        { text: "The music was", style: "plain" },
        { text: "SO loud", style: "trap" },
        { text: "THAT", style: "verb" },
        { text: "nobody could hear the announcement.", style: "plain" },
      ] },
      { parts: [
        { text: "She spoke", style: "plain" },
        { text: "SO quickly", style: "trap" },
        { text: "THAT", style: "verb" },
        { text: "I missed half of what she said.", style: "plain" },
      ] },
    ],
    breakdown: [
      { text: "SO + sıfat/zarf = derece gösterir", color: G },
      { text: "THAT + sonuç cümlesi = gerçekleşen sonuç", color: Y },
      { text: "Amaç DEĞİL, doğal sonuç anlatılır", color: R },
    ],
    question: { sentence: "The weather was _____ that all outdoor events were cancelled.", options: ["A) so bad in order to","B) so bad that","C) bad enough for","D) too bad to prevent"] },
    answerLabel: "B) SO...THAT SONUÇ",
    cozumText: "SO bad THAT = sonuç (iptal edildi). Diğerleri amaç veya yanlış yapı.",
    avciKodu: "SO + sıfat/zarf + THAT + sonuç cümlesi ← SONUÇ YAKALAMAK İÇİN!",
  }),
  lesson({
    id: "no-sooner-than-inversion", epNum: 36, audioFolder: "master-36",
    hookTitle: "NO SOONER...THAN DEVRIK TUZAĞI!",
    kuralLines: ["NO SOONER'dan sonra ters sıra geliyor","Yardımcı fiil başa alınır mutlaka"],
    narration: {
      hook: "İngilizce'de bazı kelimeler cümleyi baştan sona ters çevirir — NO SOONER bunlardan biri!",
      kural: "NO SOONER ile başlayan cümlede yardımcı fiil (did, had, was) özneyi takip eder. Mesela: 'No sooner had he arrived than...' — 'had' hemen 'he'nin önüne geçer. Bu devrik yapı (inversion) İngilizce'de dramatik etki yaratır.",
      neden: "NO SOONER olumsuz/kısıtlayıcı anlamı taşıdığı için cümle ters sıraya girer. Sağında THAN gelir, solunda ise yardımcı fiil + özne + ana fiil düzeni vardır. Bu yapı vurguyu güçlendirir.",
      tuzak: "ÖSYM normal özne-fiil sırasını seçeneklere koyar; öğrenci devrik yapıyı bilmezse yanlış seçer.",
      ornek: "Cümle: 'No sooner had the meeting ended than everyone left.' — Burada 'had' (yardımcı fiil) 'the meeting' (özne) önüne geçti. Eğer normal sıra olsaydı 'No sooner the meeting had ended' olurdu — bu yanlış!",
      soru: "Aşağıdaki cümlede boşluğu tamamlayan doğru yapı hangisidir?",
      cozum: "NO SOONER'dan sonra yardımcı fiil gelir, sonra özne. Seçeneklerde 'had he' devrik yapısı doğru, 'he had' normal sıra yanlış.",
      avci: "NO SOONER → THAN → Yardımcı Fiil + Özne (devrik) | Normal sıra = TUZAK",
    },
    nedenBadge: "DEVRIK YAPILAR ÖNEMLİ",
    nedenText: "NO SOONER, HARDLY, SCARCELY gibi olumsuz anlamlar cümleyi ters çevirir.",
    tuzakText: "Sınav normal sıra gösterir, öğrenci devrik yapıyı fark etmez.",
    examples: [
  {
    "parts": [
      {
        "text": "No sooner",
        "style": "trap"
      },
      {
        "text": "had",
        "style": "verb"
      },
      {
        "text": "she",
        "style": "plain"
      },
      {
        "text": "arrived than her friends called her.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "No sooner",
        "style": "trap"
      },
      {
        "text": "did",
        "style": "verb"
      },
      {
        "text": "the storm pass",
        "style": "plain"
      },
      {
        "text": "than the sun appeared.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "NO SOONER başında devrik yapı başlar", color: R },
      { text: "Yardımcı fiil (had/did/was) özneyi takip eder", color: Y },
      { text: "THAN ile ikinci olay bağlanır", color: G }
    ],
    question: { sentence: "No sooner _____ the project completed than the team celebrated their success.", options: ["A) the manager had","B) had the manager","C) the manager has","D) has the manager"] },
    answerLabel: "B) HAD THE MANAGER",
    cozumText: "NO SOONER'dan sonra 'had' (yardımcı fiil) gelir, ardından özne 'the manager'.",
    avciKodu: "NO SOONER + THAN = Devrik Yapı Sinyali | Yardımcı Fiil ÖNCE, Özne SONRA | Normal sıra = ✗",
  }),
  lesson({
    id: "hardly-scarcely-when-inversion", epNum: 37, audioFolder: "master-37",
    hookTitle: "HARDLY/SCARCELY...WHEN TUZAĞI!",
    kuralLines: ["Hardly/Scarcely + had + özne + fiil, when...","Devrik yapı: olumsuz başlayınca inversion zorunlu"],
    narration: {
      hook: "Hardly ve Scarcely ile başlayan cümlelerde fiil ve özne yer değiştirir — bunu kaçıran öğrenci soruyu hemen yanlış yapar.",
      kural: "Hardly/Scarcely ile başlayan cümlelerde auxiliary fiil (had, was, did vb.) öznenin önüne geçer. Bu yapı 'neredeyse hiç' anlamında geçmiş zamanda iki olayın hemen peş peşe gerçekleşmesini gösterir. Sıra: Hardly/Scarcely + auxiliary + özne + fiil + when + diğer cümle.",
      neden: "Hardly ve Scarcely olumsuz anlamdaki adverblerdir; cümleyi olumsuzluk/kısıtlama ile başlattığında, İngilizcede soru veya vurgulanmış cümleler gibi inversion (yer değişimi) meydana gelir. Bu, dil yapısının doğal vurgulama mekanizmasıdır.",
      tuzak: "Sınav sorusu normal sıra (Hardly he had) sunabilir veya when yerine başka bağlaç koyabilir; öğrenci devrik yapıyı kontrol etmezse yanlış seçer.",
      ornek: "Cümle: 'Hardly had she arrived when the phone rang.' — Burada 'had' (auxiliary) 'she' (özne) öncesine geçmiştir. Eğer normal sıra olsaydı 'Hardly she had arrived' olurdu ama bu yanlıştır.",
      soru: "Aşağıdaki cümlede boşluğu doğru şekilde tamamlayın ve devrik yapının kuralını kontrol edin.",
      cozum: "Hardly ile başlayan cümlede auxiliary fiil öznenin önüne geçmelidir. Doğru sıra: Hardly + had + özne + fiil. When bağlacı ikinci cümleyi bağlar.",
      avci: "Hardly/Scarcely gördün → hemen 'had/was/did + özne' ara → when'i kontrol et → devrik yapı tamamlandı!",
    },
    nedenBadge: "OLUMSUZ BAŞLAMA KURALI",
    nedenText: "Hardly ve Scarcely cümleyi olumsuz başlattığı için auxiliary fiil öznenin önüne geçer, tıpkı sorularda olduğu gibi.",
    tuzakText: "ÖSYM normal sırayı (Hardly had he) sunup, öğrenciyi devrik yapıyı unutturtmaya çalışır.",
    examples: [
  {
    "parts": [
      {
        "text": "Hardly",
        "style": "trap"
      },
      {
        "text": "had",
        "style": "verb"
      },
      {
        "text": "we",
        "style": "plain"
      },
      {
        "text": "finished",
        "style": "verb"
      },
      {
        "text": "dinner",
        "style": "plain"
      },
      {
        "text": "when",
        "style": "trap"
      },
      {
        "text": "the guests arrived.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "Scarcely",
        "style": "trap"
      },
      {
        "text": "had",
        "style": "verb"
      },
      {
        "text": "the meeting begun",
        "style": "plain"
      },
      {
        "text": "when",
        "style": "trap"
      },
      {
        "text": "an urgent call interrupted it.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "Hardly/Scarcely = olumsuz adverb, cümle başında inversion tetikler", color: R },
      { text: "Auxiliary fiil (had/was/did) özne öncesine geçer", color: Y },
      { text: "When bağlacı ikinci olayı bağlar, devrik yapı değişmez", color: G }
    ],
    question: { sentence: "_____ had the storm passed _____ the sun emerged from behind the clouds.", options: ["A) Hardly / than","B) Hardly / when","C) Scarcely / before","D) Scarcely / than"] },
    answerLabel: "B) HARDLY/WHEN",
    cozumText: "Hardly devrik yapı gerektirir; when iki olayı bağlayan doğru bağlaçtır.",
    avciKodu: "Hardly/Scarcely → aux + özne kontrol ✓ → when/before seç (when daha yaygın) ✓ → cevap B",
  }),
  lesson({
    id: "by-the-time", epNum: 38, audioFolder: "master-38",
    hookTitle: "BY THE TIME TUZAĞI!",
    kuralLines: ["By the time = belirli bir zaman noktasına kadar","Sonraki fiil PERFECT tense olmalı"],
    narration: {
      hook: "By the time ile başlayan cümlede zaman karmaşası yaşayan adaylar, sınav salonunda çıkmazda kalıyor.",
      kural: "By the time, 'belirli bir zaman noktasına kadar' anlamında kullanılır ve sonrasında gelen fiil Perfect tense (have/has + past participle) şeklinde olmalıdır. Eğer Simple Past yazarsanız, iki olayın zamansal sırası belirsiz kalır.",
      neden: "By the time cümlesi, bir olayın diğer olaydan ÖNCE tamamlanmış olduğunu gösterir. Bu nedenle Perfect tense gereklidir çünkü 'tamamlanmış' anlamını taşır. Sağında her zaman bir zaman ifadesi, solunda Perfect tense fiil aranır.",
      tuzak: "Sınav sorularında by the time'dan sonra Simple Past yazılı şıklar sunulur; öğrenci zamansal ilişkiyi göremeyip yanlış seçer.",
      ornek: "By the time I arrived at the station, the train had already left. — Burada 'arrived' (Simple Past) ana olay, 'had left' (Perfect) ise ondan önce tamamlanan olay. By the time'dan sonra Perfect tense gelmiş.",
      soru: "Şimdi sana by the time yapısında bir sınav sorusu göstereceğim; dikkatini Perfect tense'e ver.",
      cozum: "By the time'dan sonra gelen fiil Perfect tense olmalıdır çünkü bu olay, by the time'dan sonraki zaman noktasından ÖNCE tamamlanmış olmalıdır. Simple Past seçilirse zamansal sıralama bozulur.",
      avci: "BY THE TIME = önceki olay PERFECT, sonraki olay SIMPLE PAST. Zaman sırası: Perfect → Simple Past.",
    },
    nedenBadge: "ZAMAN SIRALAMASI ÖNEMLİ",
    nedenText: "By the time cümlesi, iki olayın zamansal ilişkisini gösterir; önceki olay mutlaka Perfect tense'te olmalıdır.",
    tuzakText: "ÖSYM, by the time'dan sonra Simple Past yazıp Perfect tense'i atlatan öğrenciyi seçtirmeye çalışır.",
    examples: [
  {
    "parts": [
      {
        "text": "By the time",
        "style": "trap"
      },
      {
        "text": "she finished her homework,",
        "style": "plain"
      },
      {
        "text": "her friends had already gone",
        "style": "verb"
      },
      {
        "text": "to the cinema.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "By the time",
        "style": "trap"
      },
      {
        "text": "the doctor arrived,",
        "style": "plain"
      },
      {
        "text": "the patient had recovered",
        "style": "verb"
      },
      {
        "text": "from the shock.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "By the time = belirli zaman noktasına kadar", color: G },
      { text: "Sonraki fiil MUTLAKA Perfect tense (have/has + past participle)", color: Y },
      { text: "Simple Past yazılırsa zamansal sıralama kaybolur", color: R }
    ],
    question: { sentence: "By the time the conference started, most delegates _____ their registration forms.", options: ["A) submitted","B) have submitted","C) had submitted","D) were submitting"] },
    answerLabel: "C) HAD SUBMITTED",
    cozumText: "By the time'dan sonra Perfect tense (had submitted) gelir; olay önceden tamamlanmış.",
    avciKodu: "BY THE TIME + PERFECT TENSE ← Zaman sırası: Önceki olay (Perfect) → Sonraki olay (Simple Past)",
  }),
  lesson({
    id: "as-soon-as", epNum: 39, audioFolder: "master-39",
    hookTitle: "AS SOON AS TUZAĞI!",
    kuralLines: ["AS SOON AS = hemen, derhal, anında","İki fiil arasında zaman bağlantısı kurar"],
    narration: {
      hook: "Bir olayın hemen ardından diğeri başlıyor — işte bu bağlantıyı AS SOON AS kuruyor.",
      kural: "AS SOON AS, iki eylemi zaman açısından bağlar: birincisi bittiğinde, ikincisi hemen başlar. Yapı: AS SOON AS + zaman cümlesi (Present Simple), ana cümle (Future/Imperative). Örneğin: 'As soon as you arrive, call me.' — Siz vardığınız an, ben çağırırım.",
      neden: "İngilizce, gelecek zaman cümlelerinde (Future Simple) zaman cümlesi kısmında Present Simple kullanır. AS SOON AS'ın solunda gelecek eylem, sağında (zaman cümlesi içinde) şimdiki zaman gelir. Bu, İngilizcenin zaman mantığının temel kuralıdır.",
      tuzak: "ÖSYM, AS SOON AS'ın ardından WILL veya GOING TO koyduğu şıkları sunarak, öğrenciyi zaman cümlesi kuralını ihlal etmeye çeker.",
      ornek: "Cümle: 'As soon as the meeting finishes, we will discuss the results.' — Toplantı bittiği an, sonuçları tartışacağız. AS SOON AS'ın ardında 'finishes' (Present Simple) gelir, ana cümlede 'will discuss' (Future Simple) vardır.",
      soru: "Şimdi sana, AS SOON AS yapısını test eden bir soru gösterelim — hangisi doğru?",
      cozum: "Doğru cevap, AS SOON AS'ın ardından Present Simple kullanandır. Zaman cümlesi kuralı gereği, gelecek bağlamda bile şimdiki zaman gerekir.",
      avci: "AS SOON AS = gelecek cümlede Present Simple zorunlu, WILL yasak!",
    },
    nedenBadge: "ZAMAN BAĞLANTISI SİNYALİ",
    nedenText: "AS SOON AS, iki olayın çok yakın zaman içinde peş peşe gerçekleştiğini gösterir.",
    tuzakText: "ÖSYM, AS SOON AS'ı WHEN yerine geçebileceğini düşündürerek, zaman cümlesi kuralını (Present Simple) unutturur.",
    examples: [
  {
    "parts": [
      {
        "text": "As soon as",
        "style": "trap"
      },
      {
        "text": "she receives",
        "style": "verb"
      },
      {
        "text": "the email, she will respond immediately.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "As soon as",
        "style": "trap"
      },
      {
        "text": "you finish",
        "style": "verb"
      },
      {
        "text": "your homework, you can play outside.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "As soon as",
        "style": "trap"
      },
      {
        "text": "the sun rises",
        "style": "verb"
      },
      {
        "text": ", the birds start singing.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "AS SOON AS'ın ardı sıra Present Simple gelir (finishes, receives, arrives).", color: G },
      { text: "Ana cümlede Future Simple (will + verb) veya Imperative (command) kullanılır.", color: Y },
      { text: "WILL, AS SOON AS'ın hemen ardına gelmez — bu çok yaygın hata.", color: R }
    ],
    question: { sentence: "_____ the train arrives, we will pick you up from the station.", options: ["A) As soon as you will arrive","B) As soon as the train arrives","C) When the train will arrive","D) Immediately the train will arrive"] },
    answerLabel: "B) AS SOON AS PRESENT",
    cozumText: "AS SOON AS'ın ardı sıra Present Simple (arrives) zorunludur.",
    avciKodu: "AS SOON AS + Present Simple ✓ | AS SOON AS + will ✗ | Zaman cümlesi = Present!",
  }),
  lesson({
    id: "rather-than", epNum: 40, audioFolder: "master-40",
    hookTitle: "RATHER THAN TUZAĞI!",
    kuralLines: ["Rather than + fiil (base form veya -ing)","Seçim/tercih anlamında kullanılır"],
    narration: {
      hook: "Rather than sadece bir bağlaç değil, seçim yaparken kullandığımız güçlü bir tercih ifadesidir.",
      kural: "Rather than'dan sonra her zaman fiil base form (to olmadan) veya -ing formu gelir. Asla to-infinitive gelmez. Cümlenin ilk yarısındaki fiil formuyla tutarlılık önemlidir.",
      neden: "Rather than karşılaştırma yapan bir yapı olduğu için, her iki tarafta da aynı gramer yapısı kullanılmalıdır (parallelism). Bu sayede cümle dengeli ve anlaşılır olur.",
      tuzak: "Sınav yazarları rather than'dan sonra 'to + verb' koyarak öğrenciyi kandırır; oysa doğru form base verb veya -ing'dir.",
      ornek: "Rather than waiting for a promotion, she decided to start her own business. Burada 'waiting' (-ing formu) 'decided' ile paralel yapıdadır ve tercih açıkça görülür.",
      soru: "Şimdi aşağıdaki cümlede doğru formu seçerek rather than tuzağından kurtulun.",
      cozum: "Rather than'dan sonra base form veya -ing gelmelidir; to-infinitive asla gelmez. Cümlenin diğer tarafıyla parallelism sağlanmalıdır.",
      avci: "Rather than → base verb VEYA -ing ✓ | Rather than → to + verb ✗",
    },
    nedenBadge: "TERCİH VE KARŞITLIK",
    nedenText: "Rather than iki seçeneği karşılaştırırken, hangisini tercih ettiğimizi gösterir.",
    tuzakText: "ÖSYM, rather than'dan sonra yanlış fiil formu (to-infinitive) koyarak öğrenciyi tuzağa düşürür.",
    examples: [
  {
    "parts": [
      {
        "text": "Rather than",
        "style": "trap"
      },
      {
        "text": "complaining",
        "style": "verb"
      },
      {
        "text": "about the problem, he took action to solve it.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "I prefer",
        "style": "plain"
      },
      {
        "text": "reading books",
        "style": "verb"
      },
      {
        "text": "rather than",
        "style": "trap"
      },
      {
        "text": "watching television.",
        "style": "verb"
      }
    ]
  }
],
    breakdown: [
      { text: "Rather than + base form/gerund = tercih gösterme", color: G },
      { text: "Parallelism kuralı: her iki taraf aynı yapıda olmalı", color: G },
      { text: "To-infinitive rather than'dan sonra YASAKLANMIŞTIR", color: R }
    ],
    question: { sentence: "The company decided _____ outsourcing the work, they hired full-time employees.", options: ["A) to outsource rather than","B) rather than to outsource","C) rather than outsourcing","D) outsourcing rather than"] },
    answerLabel: "C) RATHER THAN",
    cozumText: "Rather than'dan sonra -ing formu gelir; to-infinitive değil.",
    avciKodu: "Rather than → kontrol et → base/ing mi? → EVET ✓ | to-infinitive mi? → HAYIR ✗",
  }),
  lesson({
    id: "let-alone", epNum: 41, audioFolder: "master-41",
    hookTitle: "LET ALONE TUZAĞI!",
    kuralLines: ["Let alone = 'bir şey yok, başka şey de yok'","Olumsuz bağlamda kullanılır, ikinci şey daha imkansız"],
    narration: {
      hook: "Bir şeyi yapamayan biri, daha zor bir şeyi nasıl yapabilir?",
      kural: "Let alone, olumsuz bir durumdan başlayıp daha ağır bir duruma geçer. Örneğin 'Türkçe konuşamıyor, let alone İngilizce' demek; Türkçe konuşamadığı için İngilizce konuşması imkansız demektir.",
      neden: "Bu yapı mantıksal bir sıralama yapar: ilk şey zaten başarısız ise, ikinci şey (daha zor) kesinlikle başarısız olur. Solunda olumsuz durum, sağında daha imkansız durum vardır.",
      tuzak: "Sınav, 'let alone' yerine 'much less', 'not to mention' ya da 'aside from' gibi yakın anlamlı yapıları sunarak öğrenciyi yanıltır; ancak 'let alone' sadece olumsuz zincir için kullanılır.",
      ornek: "He can't even speak French, let alone Mandarin Chinese. = Fransızca bile konuşamıyor, Mandarin'i konuşması imkansız.",
      soru: "Şimdi bir test cümlesi ile bu yapıyı tanıyıp doğru seçeneği bulabilir misin?",
      cozum: "Let alone'dan sonra gelen durum, önceki durumdan daha imkansız/zor olmalıdır. Olumsuz bağlam korunmalı ve mantıksal sıralama bozulmamalıdır.",
      avci: "Let alone = İlki başarısız → İkincisi DAHA başarısız. Olumsuzluk zinciri, sağında daha ağır durum.",
    },
    nedenBadge: "OLUMSUZLUK ZINCIRI",
    nedenText: "Let alone, ilk durumun imkansız olduğunu söyleyip ikinci durumun daha da imkansız olduğunu vurgular.",
    tuzakText: "ÖSYM, 'let alone' yerine 'much less' ya da 'not to mention' gibi benzer yapıları şıklara koyarak öğrenciyi yanıltır.",
    examples: [
  {
    "parts": [
      {
        "text": "She couldn't afford a car,",
        "style": "plain"
      },
      {
        "text": "let alone",
        "style": "trap"
      },
      {
        "text": "a house.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "He has never read a novel,",
        "style": "plain"
      },
      {
        "text": "let alone",
        "style": "trap"
      },
      {
        "text": "written one.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "Let alone her parents, she doesn't even know her own address. (Ebeveynlerini tanımıyor, kendisinin adresini bile bilmiyor.)", color: G },
      { text: "I can't cook rice, let alone prepare a five-course meal. (Pirinç pişiremiyorum, beş çeşit yemek hazırlamak imkansız.)", color: Y }
    ],
    question: { sentence: "The company hasn't released a single product this year, _____ launched a successful marketing campaign.", options: ["A) much less","B) let alone","C) not to mention","D) aside from"] },
    answerLabel: "B) LET ALONE",
    cozumText: "Ürün yok → kampanya imkansız. Olumsuz zincir let alone ile kurulur.",
    avciKodu: "Olumsuz durum₁ + let alone + Daha olumsuz durum₂ → Mantıksal imkansızlık sırası",
  }),
  lesson({
    id: "reported-speech-zaman-kayması", epNum: 42, audioFolder: "master-42",
    hookTitle: "DOLAYLÍ ANLATIMDA ZAMAN KAYMASINI KAÇIRMA!",
    kuralLines: ["Doğru konuşmada Present → Reported'da Past","Zaman bir adım geriye kayıyor, her zaman"],
    narration: {
      hook: "Birinin söylediğini aktarırken, zaman makinesi geriye gidiyor — bunu bilmezsen sınavda hata yaparsın.",
      kural: "Doğru konuşma (Direct Speech) geçmişte söylendiğinde, Reported Speech'te tüm fiiller bir zaman adım geriye kaymak zorundadır. Present Simple → Past Simple, Present Perfect → Past Perfect, will → would olur.",
      neden: "Çünkü konuşma anı geçmiş olduğu için, o anki 'şimdi' bizim 'o zaman'ımızdır. Dinleyici için her şey geçmiş perspektiften anlatılır.",
      tuzak: "ÖSYM, doğru konuşmanın zamanını aynen bırakıp, 'doğru cevap' gibi gösteren şıkları koyar; öğrenci zaman kaymayı unutup yanıltılır.",
      ornek: "Direct: 'I am happy.' (şimdi söylüyor). Reported: She said (that) she was happy. — 'am' → 'was' oldu, çünkü konuşma geçmişte.",
      soru: "Şimdi, bu kuralı test etmek için gerçek bir sınav sorusuna bakacaksın.",
      cozum: "Doğru cevap, konuşmanın geçmiş olduğu bağlamda zamanı geriye kaymış olan şıktır. Diğer şıklar ya zamanı değiştirmemiş ya da yanlış zaman kullanmıştır.",
      avci: "KURAL: Reported Speech = Zaman bir adım geriye. Direct Past → Reported Past Perfect. Direct Present → Reported Past. Direct will → Reported would. Şık seçerken: 'Konuşma geçmişte mi?' diye sor, evet ise zamanı geri kaydır.",
    },
    nedenBadge: "ZAMAN DÜZLEMİ KAYIŞI",
    nedenText: "Konuşma anı geçmiş olduğu için, anlatılan olayın zamanı da geriye kaymak zorundadır.",
    tuzakText: "ÖSYM, doğru konuşmanın zamanını değiştirmeden bırakıp, öğrenciyi yanıltıcı şıklarla tuzağa düşürür.",
    examples: [
  {
    "parts": [
      {
        "text": "She told me",
        "style": "plain"
      },
      {
        "text": "(that)",
        "style": "trap"
      },
      {
        "text": "she was",
        "style": "verb"
      },
      {
        "text": "working on the project.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "He said",
        "style": "plain"
      },
      {
        "text": "(that)",
        "style": "trap"
      },
      {
        "text": "he had already finished",
        "style": "verb"
      },
      {
        "text": "his homework.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "They announced",
        "style": "plain"
      },
      {
        "text": "(that)",
        "style": "trap"
      },
      {
        "text": "they would attend",
        "style": "verb"
      },
      {
        "text": "the conference.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "Direct: 'I work here.' → Reported: She said she worked there. (Present → Past)", color: G },
      { text: "Direct: 'I have seen it.' → Reported: He said he had seen it. (Present Perfect → Past Perfect)", color: Y },
      { text: "Direct: 'I will come.' → Reported: She said she would come. (will → would)", color: G },
      { text: "Tuzak: Zamanı değiştirmemiş şıklar yanıltıcıdır, her zaman kayma olmalı.", color: R }
    ],
    question: { sentence: "The manager announced that the company _____ a new office in the city center next year.", options: ["A) opens","B) had opened","C) would open","D) is opening"] },
    answerLabel: "C) WOULD OPEN",
    cozumText: "Konuşma geçmiş ('announced'), direct 'will' → reported 'would' olur.",
    avciKodu: "announced (geçmiş) → zaman kayması başla → will → would. Şık C doğru. A/D şimdi zamanı (tuzak), B yanlış zaman.",
  }),
  lesson({
    id: "wish-if-only-pismanlık", epNum: 43, audioFolder: "master-43",
    hookTitle: "WISH/IF ONLY TUZAĞI: ZAMAN KARMAŞASI!",
    kuralLines: ["WISH/IF ONLY + PAST = şimdiki pişmanlık","WISH/IF ONLY + PAST PERFECT = geçmiş pişmanlığı"],
    narration: {
      hook: "Geçmişe dönüş istiyorsanız, dileklerinizi zamanında söylemelisiniz — ama hangi zamanda?",
      kural: "WISH ve IF ONLY, pişmanlık ve dilek ifade eder. Şimdiki duruma pişmanlık Past Simple ile, geçmiş olayına pişmanlık Past Perfect ile yazılır. Kısaca: bir zaman geriye gidiyorsun, ama ne kadar geriye?",
      neden: "Pişmanlık, gerçeklikten uzaklaşmayı gerektirir; dilekçe ne kadar eski olursa, zaman formu da o kadar gerilere gider. Sağında 'now' gibi işaretler varsa Past Simple, 'yesterday/last year' varsa Past Perfect aranır.",
      tuzak: "ÖSYM, Present Simple veya Present Perfect seçenekleri koyarak öğrenciyi 'pişmanlık' kelimesini görmeden gerçek zamanda bırakmaya çalışır.",
      ornek: "I wish I studied harder yesterday (geçmiş olayı) vs. I wish I studied harder now (şimdiki duruma pişmanlık). Birincisi Past Perfect, ikincisi Past Simple — ikisi de 'studied' gibi görünse de bağlam farklı.",
      soru: "Aşağıdaki cümlede boşluğu tamamlayan en uygun seçeneği bulun.",
      cozum: "Cümlede 'now' veya geçmiş zaman işareti aranır. Eğer 'now' varsa Past Simple, 'yesterday/last year' varsa Past Perfect. Doğru seçenek her zaman pişmanlık zamanı kuralına uyar.",
      avci: "WISH/IF ONLY → Pişmanlık = Zaman Geri Git | Şimdi'ye pişmanlık: Past Simple | Geçmiş'e pişmanlık: Past Perfect",
    },
    nedenBadge: "ZAMAN KAYMASI TUZAĞI",
    nedenText: "Pişmanlık ifade etmek için gerçek zamandan bir adım geri gidilir; ÖSYM bu farkı görmeyenleri yakalar.",
    tuzakText: "Sınav, pişmanlığın konusu (şimdi mi geçmiş mi) görmeden yanlış zaman seçtiren şıklar sunar.",
    examples: [
  {
    "parts": [
      {
        "text": "I wish",
        "style": "plain"
      },
      {
        "text": "I had studied",
        "style": "trap"
      },
      {
        "text": "harder",
        "style": "plain"
      },
      {
        "text": "for the exam last week.",
        "style": "verb"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "If only",
        "style": "plain"
      },
      {
        "text": "she lived",
        "style": "trap"
      },
      {
        "text": "closer to",
        "style": "plain"
      },
      {
        "text": "the university now.",
        "style": "verb"
      }
    ]
  }
],
    breakdown: [
      { text: "Past Perfect (had + V3) = geçmiş olayına pişmanlık", color: G },
      { text: "Past Simple (V2) = şimdiki duruma pişmanlık", color: Y },
      { text: "'now' = Past Simple; 'yesterday/last year' = Past Perfect", color: R }
    ],
    question: { sentence: "I wish I _____ that job offer three months ago; it would have changed my career.", options: ["A) accept","B) accepted","C) had accepted","D) have accepted"] },
    answerLabel: "C) HAD ACCEPTED",
    cozumText: "Geçmiş olayına pişmanlık: 'three months ago' → Past Perfect (had + V3).",
    avciKodu: "WISH + [zaman işareti] → Şimdi: Past Simple | Geçmiş: Past Perfect ✓",
  }),
  lesson({
    id: "had-better-would-rather", epNum: 44, audioFolder: "master-44",
    hookTitle: "HAD BETTER vs WOULD RATHER KARIŞIKLIĞI!",
    kuralLines: ["Had better = güçlü tavsiye, uyarı","Would rather = kişisel tercih, istek"],
    narration: {
      hook: "İngilizce'de birisi sana 'Had better study!' derse, o sadece tavsiye değil, tehdit içeren uyarıdır.",
      kural: "Had better, zorunluluk ve olumsuz sonuç duygusunu taşır — 'bunu yapmazsan kötü olur' anlamı vardır. Would rather ise tamamen kişisel tercih ve hoşlanmadır — 'ben bunu daha çok seviyorum' demektir.",
      neden: "Had better, konuşmacının dış dünyada bir riski veya baskıyı hissettiğini gösterir; would rather ise tamamen içsel, duygusal bir seçimdir. Sağında her zaman bir tehdit veya sonuç gizlidir.",
      tuzak: "Sınav, her iki yapıyı da 'tavsiye' olarak sunup, farkı görmeyenleri yanıltır; ayrıca 'better' kelimesini 'prefer' ile karıştırtmaya çalışır.",
      ornek: "You had better finish your homework or you'll fail the exam. — Bu cümlede 'or you'll fail' kısmı, had better'ın uyarı/tehdit yönünü gösterir. Oysa I would rather watch a movie than read a book. cümlesi sadece kişisel tercih anlatır.",
      soru: "Bu mini soruyu çözerek had better ile would rather arasındaki duygusal farkı yakalayacaksın.",
      cozum: "Had better seçilirse, cümlede olumsuz sonuç veya zorunluluk olmalı; would rather seçilirse, sadece kişisel hoşlanma/tercih olmalı.",
      avci: "Had better = uyarı + tehdit | Would rather = sadece tercih ✓",
    },
    nedenBadge: "TAVSIYE vs TERCİH FARKINI",
    nedenText: "Had better dış baskı/sonuç içerir; would rather sadece kişisel hoşlanma ifade eder.",
    tuzakText: "ÖSYM her ikisini de 'tavsiye' gibi göstererek yapısal farkı gizler.",
    examples: [
  {
    "parts": [
      {
        "text": "You",
        "style": "plain"
      },
      {
        "text": "had better",
        "style": "trap"
      },
      {
        "text": "leave",
        "style": "verb"
      },
      {
        "text": "now or the boss will be angry.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "I",
        "style": "plain"
      },
      {
        "text": "would rather",
        "style": "trap"
      },
      {
        "text": "stay",
        "style": "verb"
      },
      {
        "text": "home than go to the party.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "Had better + fiil = zorunluluk + uyarı tonusu", color: R },
      { text: "Would rather + fiil = kişisel tercih, olumsuz sonuç yok", color: G }
    ],
    question: { sentence: "She _____ call her mother immediately, or she will worry all night.", options: ["A) would rather","B) had better","C) would prefer","D) should like"] },
    answerLabel: "B) HAD BETTER",
    cozumText: "Cümlede 'or she will worry' uyarı/tehdit içeriyor; had better gerekli.",
    avciKodu: "Had better → sonuç/tehdit varsa ✓ | Would rather → tercih/hoşlanma varsa",
  }),
  lesson({
    id: "used-to-be-used-to-get-used-to", epNum: 45, audioFolder: "master-45",
    hookTitle: "USED TO / BE USED TO / GET USED TO TUZAĞI!",
    kuralLines: ["USED TO = geçmiş alışkanlık, şimdi yok","BE USED TO = şu an alışkın, devam ediyor","GET USED TO = alışma süreci başlıyor"],
    narration: {
      hook: "Aynı 'used' kelimesi üç farklı anlama gelebilir — hangisini seçersen sınav puanın değişir!",
      kural: "USED TO geçmiş alışkanlığı anlatır (şimdi artık yapılmıyor), BE USED TO şu anki alışkanlığı gösterir (hâlâ yapıyorsun), GET USED TO ise alışma işleminin başlamasını ifade eder (henüz tam alışmadın). Üçü de 'alışkanlık' konusu ama zaman ve durum tamamen farklı.",
      neden: "İngilizce, geçmiş, şimdiki ve gelecek alışkanlıkları ayrı ayrı kodlar. USED TO'da 'used' geçmiş fiil, BE USED TO'da 'used' sıfat gibi çalışır, GET USED TO'da ise 'used' yine sıfat ama süreç halindedir. Sağında ne geldiğine bakmalısın.",
      tuzak: "Sınav, cümlede sadece 'used' kelimesini göstererek öğrenciyi yanıltır; oysa sağında 'to + fiil' mi, 'to + isim' mi, yoksa başında 'be' veya 'get' mi var, onu kontrol etmek gerekir.",
      ornek: "I used to smoke cigarettes (geçmiş alışkanlık, artık bıraktım). I am used to smoking (şu an alışkınım, hâlâ yapıyorum). I am getting used to smoking (yeni başladım, henüz tam alışmadım). Her cümlede 'used' var ama anlam tamamen değişiyor.",
      soru: "Şimdi sana bir cümle göstereceğim; hangi 'used to' yapısının doğru olduğunu bul — zamanı ve alışkanlığın durumunu dikkate al.",
      cozum: "Cümlede geçmiş zaman işareti varsa USED TO, şimdiki durum ve alışkanlık varsa BE USED TO, alışma süreci varsa GET USED TO seç. Sağında 'to + fiil' mi 'to + isim' mi, onu da kontrol et.",
      avci: "USED TO (geçmiş, bitti) → BE USED TO (şimdi, alışkın) → GET USED TO (süreç, alışıyor) — zaman ve durum sırasını hatırla!",
    },
    nedenBadge: "ZAMAN VE DURUM FARKIDIR",
    nedenText: "Her üç yapı farklı zamansal perspektif ve alışkanlığın durumunu gösterir.",
    tuzakText: "ÖSYM, 'used' kelimesinin aynı görünüşüne aldanarak yanlış zamanı seçtirtir.",
    examples: [
  {
    "parts": [
      {
        "text": "She",
        "style": "plain"
      },
      {
        "text": "used to",
        "style": "trap"
      },
      {
        "text": "work",
        "style": "verb"
      },
      {
        "text": "in London, but she moved to Paris five years ago.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "He is",
        "style": "plain"
      },
      {
        "text": "used to",
        "style": "trap"
      },
      {
        "text": "living",
        "style": "verb"
      },
      {
        "text": "in a big city now.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "They are getting",
        "style": "plain"
      },
      {
        "text": "used to",
        "style": "trap"
      },
      {
        "text": "eating",
        "style": "verb"
      },
      {
        "text": "spicy food since they moved to India.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "USED TO + fiil (bare) = geçmiş alışkanlık", color: G },
      { text: "BE USED TO + isim/gerund = şimdiki alışkanlık", color: Y },
      { text: "GET USED TO + isim/gerund = alışma süreci", color: R }
    ],
    question: { sentence: "After living abroad for two years, Maria _____ the different culture and now she enjoys it very much.", options: ["A) used to accept","B) is used to accepting","C) has used to accept","D) gets used to accepting"] },
    answerLabel: "B) IS USED TO",
    cozumText: "Şimdiki durum (now) ve alışkanlık (enjoys) → BE USED TO + gerund.",
    avciKodu: "Zaman işareti: NOW (şimdi) → BE USED TO ✓ | Fiil: accepting (gerund) → BE USED TO ✓ | CEVAP: B",
  }),
  lesson({
    id: "cleft-sentences-it-is-that", epNum: 46, audioFolder: "master-46",
    hookTitle: "IT IS...THAT VURGU TUZAĞI!",
    kuralLines: ["It is + vurgulanan öğe + that + cümlenin geri kalanı","Vurgulamak için yapı değişir, anlam aynı kalır"],
    narration: {
      hook: "Aynı cümleyi farklı şekilde vurgulamak istersen, yapı değişir ama anlam çoğu zaman aynı kalır — işte bu tuzak!",
      kural: "Cleft sentence, 'It is + vurgulanan kısım + that + geri kalan' şeklinde kurulur. Örneğin 'John bought the car yesterday' cümlesinde 'John'u vurgulamak istersen 'It is John that bought the car yesterday' dersin. Vurgulanan kısım değişirse, that'ten sonraki yapı da değişebilir.",
      neden: "İngilizce konuşurken önemli bilgiyi öne çıkarmak için bu yapıyı kullanırız. That'ten sonra gelen kısım, orijinal cümlenin geri kalanı olmalı ve fiil zamanı korunmalıdır.",
      tuzak: "ÖSYM, vurgulanan öğeyi değiştirdiğinde that'ten sonraki fiili veya zamanı yanlış seçmeni ister; ya da 'it is' yerine başka yapı sunar.",
      ornek: "Orijinal: 'She solved the problem with logic.' → Vurgu: 'It is with logic that she solved the problem.' Burada 'with logic' vurgulandı, that'ten sonra orijinal cümlenin geri kalanı (she solved the problem) geldi.",
      soru: "Şimdi senin çözmek için hazır bir mini soru var — cleft yapısının doğru formunu bulabilir misin?",
      cozum: "Doğru cevap C'dir: 'It is the manager that makes the final decision.' Vurgulanan 'the manager' after 'that' fiil ve nesne korunmuş, zaman değişmemiş.",
      avci: "IT IS + [VURGULANAN] + THAT + [GERİ KALAN CÜMLENİN AYNI HALI] — vurgulanan kısım değişse bile that'ten sonrası orijinal kalır!",
    },
    nedenBadge: "VURGU İÇİN YAPIYA UYUM",
    nedenText: "İngilizce, cümlenin hangi kısmını öne çıkarmak istiyorsa onu 'It is...that' arasına sıkıştırır.",
    tuzakText: "ÖSYM, orijinal cümleyi tanımadığında veya that'ten sonraki fiili yanlış seçtiğinde kandırır.",
    examples: [
  {
    "parts": [
      {
        "text": "It is",
        "style": "plain"
      },
      {
        "text": "the quality of the product",
        "style": "trap"
      },
      {
        "text": "that",
        "style": "verb"
      },
      {
        "text": "attracts customers the most.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "It is",
        "style": "plain"
      },
      {
        "text": "yesterday",
        "style": "trap"
      },
      {
        "text": "that",
        "style": "verb"
      },
      {
        "text": "we received the important email.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "It is",
        "style": "plain"
      },
      {
        "text": "the professor",
        "style": "trap"
      },
      {
        "text": "that",
        "style": "verb"
      },
      {
        "text": "explained the complex theory.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "It is + vurgulanan öğe = cümlenin odak noktası, önemli kısım", color: G },
      { text: "That + geri kalan = orijinal cümlenin yapısı korunur, zaman değişmez", color: Y },
      { text: "Vurgulanan kısım değişirse, that'ten sonrası aynı kalır — bu fark sınavda soru olur", color: R }
    ],
    question: { sentence: "Original sentence: 'The team won the championship because of their dedication.' If we want to emphasize 'because of their dedication', which cleft sentence is correct? _____ that the team won the championship.", options: ["A) It is their dedication","B) It is because of their dedication","C) It is because their dedication","D) It is the dedication that"] },
    answerLabel: "B) BECAUSE OF THEIR DEDICATION",
    cozumText: "Vurgulanan kısım 'because of their dedication' — that'ten sonra 'the team won the championship' gelir.",
    avciKodu: "VURGULANAN ÖĞE → IT IS [___] THAT [GERİ KALAN] ← ZAMAN/FİİL AYNI KALIR",
  }),
  lesson({
    id: "causative-have-get-something-done", epNum: 47, audioFolder: "master-47",
    hookTitle: "CAUSATIVE TUZAĞI: KİM YAPTI, SEN Mİ?",
    kuralLines: ["have/get + object + past participle","Başkasına yaptırıyorsun, sen değil"],
    narration: {
      hook: "Fotoğrafını çektirdin mi, çektin mi? Cevap gramer kuralında gizli!",
      kural: "Causative yapıda have veya get kullanıyorsun, sonra object (nesne) ve past participle (fiilinin -ed hali) gelir. Örneğin: 'I had my car repaired' — arabamı (başkasına) tamir ettirdim, ben tamir etmedim.",
      neden: "İngilizce, kim işi yaptığını net göstermek ister. Eğer sen yaptıysan 'I repaired' dersin, ama başkasına yaptırdıysan 'I had it repaired' dersin. Bu ayrım, cümlenin anlamını tamamen değiştirir.",
      tuzak: "Sınav, causative cümlede active voice fiili koyarak kandırır. Örneğin 'have + repair' yerine 'have + repaired' yazıp yazmamanızı test eder.",
      ornek: "Cümle: 'She got her hair cut yesterday.' — Saçını (başkasına) kestirdi. 'cut' past participle, çünkü başkası kesti, o değil. Eğer 'got her hair cutting' yazarsan, yanlış olur.",
      soru: "Aşağıdaki cümlede boşluğu doğru causative yapıyla doldurun.",
      cozum: "Causative yapıda have/get sonrası object gelir, sonra mutlaka past participle. Doğru seçenek bu sıraya uyar.",
      avci: "have/get → object → past participle (ASLA -ing değil, ASLA active fiil değil)",
    },
    nedenBadge: "BAŞKASI YAPAR, SEN DEĞİL",
    nedenText: "Causative yapı, işi kendimiz yapmadığımız, başkasına yaptırdığımız durumları anlatır.",
    tuzakText: "ÖSYM, active voice (ben yaptım) ile causative (yaptırdım) arasında karıştırma yaratır.",
    examples: [
  {
    "parts": [
      {
        "text": "I",
        "style": "plain"
      },
      {
        "text": "had",
        "style": "trap"
      },
      {
        "text": "my house",
        "style": "plain"
      },
      {
        "text": "painted",
        "style": "verb"
      },
      {
        "text": "last month.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "They",
        "style": "plain"
      },
      {
        "text": "got",
        "style": "trap"
      },
      {
        "text": "their documents",
        "style": "plain"
      },
      {
        "text": "translated",
        "style": "verb"
      },
      {
        "text": "by a professional.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "We",
        "style": "plain"
      },
      {
        "text": "will have",
        "style": "trap"
      },
      {
        "text": "the website",
        "style": "plain"
      },
      {
        "text": "redesigned",
        "style": "verb"
      },
      {
        "text": "next week.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "have/get = başkasına yaptırma işareti", color: G },
      { text: "Past participle (painted, translated, redesigned) = işi başkası yaptı", color: Y },
      { text: "-ing form ASLA causative'de kullanılmaz", color: R },
      { text: "Active voice fiil (paint, translate) causative'de ASLA tek başına gelmez", color: R }
    ],
    question: { sentence: "The company _____ its annual report _____ by an external auditor.", options: ["A) had; audited","B) has; auditing","C) got; audit","D) will have; auditing"] },
    answerLabel: "A) HAD; AUDITED",
    cozumText: "had (causative) + object + audited (past participle) = başkasına yaptırdı",
    avciKodu: "have/get + [kişi/şey] + [fiil-ed] ← Bu sıra SABIT. -ing veya bare verb = TUZAK!",
  }),
  lesson({
    id: "mixed-conditionals-zaman-karması", epNum: 48, audioFolder: "master-48",
    hookTitle: "MIXED CONDITIONALS: ZAMANI KARIŞTIRANLAR!",
    kuralLines: ["Geçmiş koşul + şimdiki sonuç veya tersi","Zaman düzeylerini ayırt etmelisin"],
    narration: {
      hook: "Ya geçmişte yapmazsam, şimdi ne olurdu? İşte bu Mixed Conditional'ın sırrı!",
      kural: "Mixed Conditional, koşul cümlesi ile sonuç cümlesi farklı zaman düzeylerinde olduğunda kullanılır. Örneğin, geçmişte alınan bir karar, bugünkü durumu etkiliyor olabilir. Her zaman kendi kuralını takip eder: geçmiş için past perfect, şimdiki için would + verb.",
      neden: "Gerçek hayatta, geçmiş olaylar şimdiki sonuçlara yol açar. Dilbilgisi de bu mantığı yansıtır. Koşul geçmişse Past Perfect, sonuç şimdiyse would + base verb kullanılır.",
      tuzak: "Sınav sorusu tüm fiilleri aynı zamanda sunarak, öğrenciyi standart If I had... I would have... kalıbına yönlendirir; oysa sonuç şimdiki olabilir.",
      ornek: "If you had studied harder, you would understand this topic now. — Geçmiş koşul (had studied), şimdiki sonuç (would understand).",
      soru: "Şimdi sana, koşul ve sonucun zamanlarını doğru seçmen gereken bir cümle göstereceğim.",
      cozum: "Koşul geçmişte (If you had...), sonuç şimdiki duruma etki ediyorsa (would + verb), bu Mixed Conditional Type 3-2'dir. Zamanları karıştırma, her biri kendi kuralını takip eder.",
      avci: "GEÇMIŞ KOŞUL + ŞİMDİKİ SONUÇ = Past Perfect + would + V1 | Zaman uyumsuzluğu gördüğün anda Mixed Conditional'ı düşün!",
    },
    nedenBadge: "ZAMAN UYUMSUZLUĞU KURALı",
    nedenText: "Koşul ve sonuç farklı zaman düzeylerindeyse, her biri kendi zamanını korur.",
    tuzakText: "ÖSYM, tüm kısımları aynı zamanda koymaya çalışır; sen farkı görüp doğru zamanı seçmelisin.",
    examples: [
  {
    "parts": [
      {
        "text": "If",
        "style": "plain"
      },
      {
        "text": "you had listened",
        "style": "verb"
      },
      {
        "text": "to my advice",
        "style": "plain"
      },
      {
        "text": "you",
        "style": "plain"
      },
      {
        "text": "would know",
        "style": "verb"
      },
      {
        "text": "the answer now.",
        "style": "trap"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "If",
        "style": "plain"
      },
      {
        "text": "she didn't have",
        "style": "verb"
      },
      {
        "text": "a car",
        "style": "plain"
      },
      {
        "text": "she",
        "style": "plain"
      },
      {
        "text": "couldn't have arrived",
        "style": "verb"
      },
      {
        "text": "on time yesterday.",
        "style": "trap"
      }
    ]
  }
],
    breakdown: [
      { text: "Past Perfect (had + V3) koşul cümlesi geçmiş olayı gösterir", color: G },
      { text: "would + V1 sonuç cümlesi şimdiki durumu veya yeteneği ifade eder", color: Y },
      { text: "Zaman göstergeleri (now, today, yesterday) yapıyı doğrular", color: R }
    ],
    question: { sentence: "If he _____ to university, he would have a better job today.", options: ["A) went","B) had gone","C) goes","D) would go"] },
    answerLabel: "B) HAD GONE",
    cozumText: "Geçmiş koşul (had gone) + şimdiki sonuç (would have) = Mixed Conditional.",
    avciKodu: "GEÇMIŞ KOŞUL mi? → Past Perfect (had + V3) | ŞİMDİKİ SONUÇ mu? → would + V1 | Zaman uyumsuzluğu = MİXED!",
  }),
  lesson({
    id: "ellipsis-so-do-i-neither", epNum: 49, audioFolder: "master-49",
    hookTitle: "SO DO I / NEITHER DO I TUZAĞI!",
    kuralLines: ["Aynı durumda katılmak için ellipsis kullan","Olumlu: SO + yardımcı fiil + özne"],
    narration: {
      hook: "Arkadaşın 'I love coffee' dediğinde sen 'Me too' mi diyorsun, yoksa 'So do I' mi?",
      kural: "Birisi olumlu bir cümle söylediğinde aynı durumda olduğunu göstermek için 'SO + yardımcı fiil + özne' yapısını kullanırız. Olumsuz durumda ise 'NEITHER + yardımcı fiil + özne' yapısı geçerlidir. Bu yapı, tekrarlanan fiili atlayıp (ellipsis) sadece yardımcı fiili ve öznesi korur.",
      neden: "Cümlenin başında yardımcı fiil gelir çünkü bu, İngilizcede ters soru yapısıdır (inversion). Ellipsis sayesinde konuşma doğal ve akıcı kalır; aksi halde 'I love coffee too' gibi basit cevap yerine 'So I love coffee' gibi garip görünürdü.",
      tuzak: "Öğrenciler sık sık 'So I do' yazarlar (özne-fiil sırası) veya yanlış yardımcı fiil seçerler ('So am I' yerine 'So do I' yazarlar). ÖSYM bu hataları şıklara yerleştirir.",
      ornek: "A: 'I have finished my homework.' B: 'So have I.' — Burada 'have' yardımcı fiilidir, özne (I) sonra gelir, ve orijinal fiil (finished) atlanmıştır.",
      soru: "Aşağıdaki diyalogu tamamlayarak ellipsis kuralını doğru uygulayacak mısın?",
      cozum: "Cümlenin türüne (olumlu/olumsuz) ve yardımcı fiil türüne (do/have/be) bakılır. 'I like pizza' olumlu ve 'do' içerdiğinden, katılmak için 'So do I' yazılır. Özne ve fiil sırası ters soru gibi olur.",
      avci: "SINYAL: Olumlu + yardımcı fiil → SO + fiil + özne | Olumsuz → NEITHER + fiil + özne | Fiil türü cümleyle eşleş!",
    },
    nedenBadge: "TEKRAR KAÇINMA VE UYUM",
    nedenText: "İngilizce aynı fiili tekrar etmemek için kısa form kullanır, ancak yardımcı fiilin sırası değişir.",
    tuzakText: "ÖSYM, özne ve yardımcı fiilin yerini karıştırarak veya yanlış yardımcı fiil seçtirerek hata yaptırır.",
    examples: [
  {
    "parts": [
      {
        "text": "A: 'I",
        "style": "plain"
      },
      {
        "text": "have",
        "style": "verb"
      },
      {
        "text": "been to Paris.'",
        "style": "plain"
      },
      {
        "text": "B: 'So",
        "style": "trap"
      },
      {
        "text": "have",
        "style": "verb"
      },
      {
        "text": "I.'",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "A: 'I",
        "style": "plain"
      },
      {
        "text": "don't",
        "style": "verb"
      },
      {
        "text": "like spicy food.'",
        "style": "plain"
      },
      {
        "text": "B: 'Neither",
        "style": "trap"
      },
      {
        "text": "do",
        "style": "verb"
      },
      {
        "text": "I.'",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "A: 'She",
        "style": "plain"
      },
      {
        "text": "is",
        "style": "verb"
      },
      {
        "text": "a doctor.'",
        "style": "plain"
      },
      {
        "text": "B: 'So",
        "style": "trap"
      },
      {
        "text": "am",
        "style": "verb"
      },
      {
        "text": "I.'",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "Olumlu cevap: SO + yardımcı fiil + özne", color: G },
      { text: "Olumsuz cevap: NEITHER + yardımcı fiil + özne", color: G },
      { text: "Yardımcı fiil cümleyle eşleşmeli (do/does/did/have/has/had/be)", color: Y },
      { text: "Özne her zaman ters soru sırasında gelir", color: R }
    ],
    question: { sentence: "A: 'I haven't finished the project yet.' B: '_____ have I.'", options: ["A) So","B) Neither","C) Either","D) Nor"] },
    answerLabel: "B) NEITHER",
    cozumText: "Olumsuz cümleye olumsuz cevap: NEITHER + have + I.",
    avciKodu: "Olumsuz sinyal (haven't) → NEITHER seç | Olumlu sinyal → SO seç | Yardımcı fiili cümleden kopyala",
  }),
  lesson({
    id: "enough-too-to", epNum: 50, audioFolder: "master-50",
    hookTitle: "ENOUGH/TOO...TO TUZAĞI!",
    kuralLines: ["ENOUGH: isim/sıfat + enough + to","TOO: too + sıfat/zarf + to"],
    narration: {
      hook: "Aynı anlama gelen iki yapı, ama biri başa, biri sona gidiyor — hangisi?",
      kural: "ENOUGH kelimesi, niteleyeceği isim veya sıfatın ÖNCESİNE gelir, sonra to + fiil gelir. TOO ise sıfat/zarfın ÖNCESİNE gelir, sonra to + fiil gelir. İkisinin de amacı 'sonuç' göstermektir, ama pozisyonları terstir.",
      neden: "ENOUGH 'yeterlilik' anlamını taşır ve niteleyeceği kelimeyi destekler; TOO ise 'aşırılık' anlamını taşır ve sıfatı vurgular. Türkçede 'yeterince' ve 'çok fazla' gibi zarflar da sıfatın önüne gelir, bu sebeple İngilizce de aynı kuralı takip eder.",
      tuzak: "Şıklarda 'too enough' veya 'enough too' gibi yanlış kombinasyonlar, ya da doğru kelimeler ama ters sırada sunulur.",
      ornek: "Cümle: 'She is intelligent enough to solve this problem' — burada 'intelligent' sıfat, 'enough' onun sonrasında gelir. Karşılaştırma: 'This problem is too difficult to solve' — burada 'too' sıfat 'difficult'in önünde gelir.",
      soru: "Şimdi bu yapıyı sınav formatında test edelim ve hangi şıkkın doğru pozisyonu gösterdiğini bulalım.",
      cozum: "Doğru cevap, enough'u isim/sıfatın sonrasına, too'yu sıfat/zarfın öncesine koyan şıktır; diğer tüm kombinasyonlar gramer açısından yanlıştır.",
      avci: "ENOUGH = kelime + enough + to | TOO = too + kelime + to — sıra ters, anlam benzer!",
    },
    nedenBadge: "SÖZ DİZİMİ FARKIDIR",
    nedenText: "Enough ve too aynı anlama gelse de, kelime sırası tamamen zıttır; yanlış sıra cümleyi gramer açısından yanlış yapar.",
    tuzakText: "ÖSYM, şıklarda doğru kelimeyi yanlış konuma koyarak öğrencileri kandırır.",
    examples: [
  {
    "parts": [
      {
        "text": "The water is",
        "style": "plain"
      },
      {
        "text": "too",
        "style": "trap"
      },
      {
        "text": "hot",
        "style": "verb"
      },
      {
        "text": "to drink.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "He has",
        "style": "plain"
      },
      {
        "text": "enough",
        "style": "trap"
      },
      {
        "text": "experience",
        "style": "verb"
      },
      {
        "text": "to lead the team.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "This book is",
        "style": "plain"
      },
      {
        "text": "too",
        "style": "trap"
      },
      {
        "text": "complicated",
        "style": "verb"
      },
      {
        "text": "to understand.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "ENOUGH: nitelik + enough + to (yeterlilik)", color: G },
      { text: "TOO: too + nitelik + to (aşırılık)", color: Y },
      { text: "Her iki yapı da sonuç gösterir, ama sıra zıttır", color: R }
    ],
    question: { sentence: "The test was _____ difficult _____ everyone to pass.", options: ["A) enough / to","B) too / to","C) to / too","D) too / for"] },
    answerLabel: "B) TOO...TO",
    cozumText: "Too sıfatın önüne, to fiilden önce gelir; aşırılık anlamı.",
    avciKodu: "TOO + sıfat + TO → ✓ | ENOUGH + sıfat + TO → ✗ (enough sonra gelir)",
  }),
  lesson({
    id: "as-long-as-on-condition-that", epNum: 51, audioFolder: "master-51",
    hookTitle: "AS LONG AS / ON CONDITION THAT TUZAĞI!",
    kuralLines: ["Koşul + ana cümle yapısı","Her ikisi de şart anlamı taşır"],
    narration: {
      hook: "Bir şeyin olması başka bir şeyin olmasına bağlıysa, İngilizce'de bunu nasıl söyleriz?",
      kural: "AS LONG AS ve ON CONDITION THAT ikisi de koşul cümlesi kurar. AS LONG AS daha sık ve konuşma dilinde kullanılır; ON CONDITION THAT ise daha resmi ve yazı dilindedir. Her ikisi de \"şu şart sağlandığı sürece\" anlamını taşır.",
      neden: "Bu yapılar, ana eylemin gerçekleşmesinin önceden belirlenmiş bir koşula tamamen bağlı olduğunu vurgular. Solunda koşul, sağında sonuç vardır ve bu ilişki zorunludur.",
      tuzak: "ÖSYM, IF ile AS LONG AS / ON CONDITION THAT'ı karıştırmaya çalışır; IF daha genel şartı ifade ederken, bu yapılar daha kesin sınır ve süreklilik belirtir.",
      ornek: "\"As long as you study hard, you will pass the exam.\" cümlesinde AS LONG AS koşul belirtir; koşul yerine ON CONDITION THAT koyarsak aynı anlamı taşır ama daha resmi olur.",
      soru: "Şimdi sınav formatında bu yapıyı tanıyıp doğru seçeneği bulabilir misin?",
      cozum: "Doğru cevap, koşul ve ana cümle arasında zorunlu ilişki kuran yapıdır. AS LONG AS veya ON CONDITION THAT kullanıldığında, koşul sağlanmadığı sürece ana eylem gerçekleşmez.",
      avci: "AS LONG AS / ON CONDITION THAT = Koşul + Zorunlu Sonuç (IF'ten daha kesin!)",
    },
    nedenBadge: "KOŞUL VE SINIR BELIRTME",
    nedenText: "Bu yapılar bir eylemin gerçekleşmesinin başka bir koşula bağlı olduğunu gösterir.",
    tuzakText: "ÖSYM, benzer anlamlı bu iki yapıyı karıştırarak yanlış seçeneği doğru gibi sunabilir.",
    examples: [
  {
    "parts": [
      {
        "text": "As long as",
        "style": "trap"
      },
      {
        "text": "you have a valid passport,",
        "style": "plain"
      },
      {
        "text": "you can",
        "style": "verb"
      },
      {
        "text": "travel abroad.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "On condition that",
        "style": "trap"
      },
      {
        "text": "the weather remains clear,",
        "style": "plain"
      },
      {
        "text": "the flight will",
        "style": "verb"
      },
      {
        "text": "depart on time.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "AS LONG AS = koşul süresi boyunca, konuşma dili", color: G },
      { text: "ON CONDITION THAT = resmi koşul, yazı dili", color: G },
      { text: "Her ikisi de IF'ten daha zorunlu ve kesin", color: Y }
    ],
    question: { sentence: "The company will hire new employees _____ they meet the required qualifications and pass the background check.", options: ["A) if only","B) as long as","C) unless","D) in case"] },
    answerLabel: "B) AS LONG AS",
    cozumText: "AS LONG AS koşul sağlandığı sürece sonuç garantidir; zorunlu ilişki kurar.",
    avciKodu: "AS LONG AS / ON CONDITION THAT → Koşul (MUTLAKA) → Sonuç ✓ | IF → Koşul (BELKİ) → Sonuç",
  }),
  lesson({
    id: "due-to-owing-to-reason", epNum: 52, audioFolder: "master-52",
    hookTitle: "DUE TO / OWING TO TUZAĞI!",
    kuralLines: ["İsim tamlaması ile neden gösterir","Fiilden sonra gelmez, yalnızca isim"],
    narration: {
      hook: "Due to ve owing to'yu gördüğünde, hemen arkasında isim var mı diye kontrol et — çünkü bu iki yapı sadece isim sevgidir!",
      kural: "Due to ve owing to, 'neden' anlamında kullanılan prepozisyonel ifadelerdir. Bunlar daima bir isim veya isim tamlamasından sonra gelir. Eğer fiil gerekirse, because of veya because kullanmalısın.",
      neden: "Bu yapılar prepozisyon grubunun başında yer alır ve prepozisyon her zaman isim gerektirir. Sağında isim, solunda da genellikle 'be' fiili veya başka bir fiil bulunur.",
      tuzak: "ÖSYM, due to/owing to'dan sonra V-ing (gerund) veya infinitive formlarını doğru gibi göstererek öğrenciyi kandırır; oysa bu formlar fiil davranışı gösterir.",
      ornek: "The match was postponed owing to heavy rain. — Burada 'owing to' dan sonra 'heavy rain' (isim tamlaması) gelir, fiil değil. Eğer 'owing to raining' dersek, yanlış olur.",
      soru: "Şimdi sınav formatında bir soru çözerek bu tuzaktan nasıl kurtulacağını öğren.",
      cozum: "Doğru cevap due to/owing to'dan sonra gelen yapının İSİM TAMLAMASI olup olmadığını kontrol etmektir. Eğer fiil formu (V-ing, infinitive) varsa, o şık yanlıştır.",
      avci: "DUE TO / OWING TO → İSİM GELMELİ (fiil değil) → 'be' + DUE TO/OWING TO + İSİM ✓",
    },
    nedenBadge: "İSİM TAŞIYICI YAPISI",
    nedenText: "Due to ve owing to, kendilerinden sonra İSİM (veya isim tamlaması) gerektirir; fiil değil.",
    tuzakText: "ÖSYM, due to/owing to'dan sonra fiil formları (V-ing, infinitive) koymak isteyen çeldirici şıklar sunar.",
    examples: [
  {
    "parts": [
      {
        "text": "The flight was cancelled",
        "style": "plain"
      },
      {
        "text": "due to",
        "style": "trap"
      },
      {
        "text": "bad weather",
        "style": "good"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "Owing to",
        "style": "trap"
      },
      {
        "text": "the manager's absence",
        "style": "good"
      },
      {
        "text": ", the meeting was rescheduled",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "Her success is",
        "style": "plain"
      },
      {
        "text": "owing to",
        "style": "trap"
      },
      {
        "text": "hard work",
        "style": "good"
      }
    ]
  }
],
    breakdown: [
      { text: "Due to / Owing to = prepozisyon grubu, 'neden' anlamı", color: G },
      { text: "Arkasında daima İSİM veya isim tamlaması gelir", color: G },
      { text: "Fiil formu (V-ing, to+V) gelmez; yanlış tuzaktır", color: R },
      { text: "Cümlenin başında veya ortasında yer alabilir", color: Y }
    ],
    question: { sentence: "The project was delayed _____ the lack of funding and resources.", options: ["A) owing to","B) owing to having","C) owing to be","D) owing to being delayed"] },
    answerLabel: "A) OWING TO",
    cozumText: "Owing to'dan sonra isim tamlaması gelir; 'the lack of funding' isimdir.",
    avciKodu: "DUE TO / OWING TO + İSİM ✓ | DUE TO / OWING TO + V-ing ✗ | DUE TO / OWING TO + to+V ✗",
  }),
  lesson({
    id: "result-in-result-from", epNum: 53, audioFolder: "master-53",
    hookTitle: "RESULT IN vs RESULT FROM KARIŞIKLIĞI!",
    kuralLines: ["RESULT IN = sebep → sonuç yönü","RESULT FROM = sonuç ← sebep yönü"],
    narration: {
      hook: "Aynı sonucu anlatan iki fiil var ama hangisini seçeceğini biliyor musun?",
      kural: "RESULT IN demek: bir şey yapıyor, o da başka bir şeye yol açıyor — sebepten sonuca doğru gidiyorsun. RESULT FROM demek: bir şey var, o da başka bir şeyden kaynaklanıyor — sonuçtan sebebine doğru bakıyorsun.",
      neden: "İngilizce sebep-sonuç ilişkisini iki yönden görebilir: başlangıç noktasından (RESULT IN) veya bitiş noktasından (RESULT FROM). Cümlede hangi taraf ön planda ise o yön seçilir.",
      tuzak: "Sınav her iki fiili de aynı cümlede sunup yanlış yönü seçtirtmeye çalışır; öğrenci anlamı bilse de yönü karıştırır.",
      ornek: "The accident RESULTED IN three injuries — kaza sebep, yaralanma sonuç, sebepten sonuca gidiyoruz. The injuries RESULTED FROM the accident — yaralanma sonuç, kaza sebep, sonuçtan sebebine bakıyoruz.",
      soru: "Şimdi bir sınav cümlesini çöz ve doğru yönü bul.",
      cozum: "Cümlede hangi isim ön planda ise, o isimden başla: eğer sebep ön plandaysa RESULT IN, sonuç ön plandaysa RESULT FROM kullan.",
      avci: "SEBEP ÖN PLANDA → RESULT IN | SONUÇ ÖN PLANDA → RESULT FROM",
    },
    nedenBadge: "YÖNLENDİRME FARKIDIR",
    nedenText: "İki fiilin anlamı aynı ama sebep-sonuç ilişkisinin yönü tam tersidir.",
    tuzakText: "ÖSYM her iki yapıyı aynı cümlede sunarak hangi yönün doğru olduğunu karıştırır.",
    examples: [
  {
    "parts": [
      {
        "text": "The policy changes",
        "style": "plain"
      },
      {
        "text": "resulted in",
        "style": "verb"
      },
      {
        "text": "significant economic growth.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "The company's success",
        "style": "plain"
      },
      {
        "text": "resulted from",
        "style": "verb"
      },
      {
        "text": "years of research and development.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "Heavy rainfall",
        "style": "plain"
      },
      {
        "text": "resulted in",
        "style": "trap"
      },
      {
        "text": "severe flooding in rural areas.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "RESULT IN: sebep → sonuç yönü, sebebi söyle sonuç çıkar", color: G },
      { text: "RESULT FROM: sonuç ← sebep yönü, sonucu söyle sebebi ara", color: Y },
      { text: "Cümlede ön planda hangi taraf varsa o yön doğru", color: G }
    ],
    question: { sentence: "The delayed shipment _____ in customer dissatisfaction and lost sales.", options: ["A) resulted from","B) resulted in","C) has resulted","D) results"] },
    answerLabel: "B) RESULTED IN",
    cozumText: "Gecikmiş kargo sebep, müşteri memnuniyetsizliği sonuç — RESULT IN doğru.",
    avciKodu: "DELAYED SHIPMENT (sebep) → DISSATISFACTION (sonuç) = RESULTED IN ✓",
  }),
  lesson({
    id: "not-until-inversion", epNum: 54, audioFolder: "master-54",
    hookTitle: "NOT UNTIL TUZAĞI: DEVRIK YAPIYI KAÇIRMA!",
    kuralLines: ["NOT UNTIL başında → fiil devrik olur","Olumsuz yapı, fakat olumlu anlam taşır"],
    narration: {
      hook: "NOT UNTIL ile başlayan cümleler neden kafa karıştırıyor? Çünkü fiil ve özne yer değiştiriyor!",
      kural: "NOT UNTIL bir zaman belirteci olarak cümlenin başına geldiğinde, yardımcı fiil (auxiliary verb) öznenin önüne geçer — bu devrik yapıdır. Örneğin: \"Not until 2020 did the company launch its new product\" — burada \"did\" (yardımcı fiil) \"the company\" (özne) öncesine yerleşir.",
      neden: "İngilizcede olumsuz veya sınırlayıcı zaman belirteçleri cümlenin başında gelince, vurgu ve dramatiklik için fiil devrik olur. Bu, cümleyi daha güçlü ve resmi kılar.",
      tuzak: "ÖSYM, NOT UNTIL'in ardından normal sıra (subject+verb) sunar ve öğrenci bunu doğru sanır; oysa devrik sıra (auxiliary verb+subject) gereklidir.",
      ornek: "\"Not until she arrived did everyone understand the situation.\" — NOT UNTIL başında olduğu için \"did\" (yardımcı fiil) \"she\" (özne) öncesine geçmiş, devrik yapı oluşmuştur.",
      soru: "Aşağıdaki cümlede NOT UNTIL devrik yapısı doğru şekilde kullanılmış mı? Test et!",
      cozum: "NOT UNTIL cümlenin başında geldiğinde, yardımcı fiil özne öncesine geçmeli. Eğer normal sıra varsa (subject+verb), yapı yanlıştır.",
      avci: "NOT UNTIL başında → AUX+SUBJECT+VERB sırası zorunlu; normal sıra = TUZAK!",
    },
    nedenBadge: "DEVRIK YAPININ KURALI",
    nedenText: "NOT UNTIL cümlesi başında gelince, olumsuz bir zaman belirteci olarak işlev görür ve İngilizcede devrik (inversion) yapısını tetikler.",
    tuzakText: "ÖSYM, öğrenciyi normal sıra (NOT UNTIL...subject+verb) ile devrik sıra (NOT UNTIL...verb+subject) arasında karıştırır.",
    examples: [
  {
    "parts": [
      {
        "text": "Not until",
        "style": "trap"
      },
      {
        "text": "the results were announced",
        "style": "plain"
      },
      {
        "text": "did",
        "style": "verb"
      },
      {
        "text": "the team realize their mistake.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "Not until",
        "style": "trap"
      },
      {
        "text": "last year",
        "style": "plain"
      },
      {
        "text": "did",
        "style": "verb"
      },
      {
        "text": "I understand the importance of saving.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "NOT UNTIL = olumsuz zaman belirteci, cümle başında devrik yapı tetikler", color: R },
      { text: "DID/DOES/DID = yardımcı fiil, özne öncesine geçer (inversion)", color: Y },
      { text: "Devrik yapı = formal, dramatik, vurgulu anlatım", color: G }
    ],
    question: { sentence: "Not until the manager approved the budget _____ the project team begin their work.", options: ["A) could the","B) the could","C) could they","D) they could"] },
    answerLabel: "C) COULD THEY",
    cozumText: "NOT UNTIL başında → yardımcı fiil (could) özne (they) öncesine geçer.",
    avciKodu: "NOT UNTIL başı → [AUX + SUBJECT + MAIN VERB] | A/B/D = normal sıra tuzağı",
  }),
  lesson({
    id: "apposition-virgul-isim-tamlamasi", epNum: 55, audioFolder: "master-55",
    hookTitle: "APPOSITION: İKİ İSİM BİR KİŞİ!",
    kuralLines: ["Virgülle ayrılmış iki isim aynı kişi/şey","İkinci isim birincinin açıklaması/tanımı"],
    narration: {
      hook: "Bir cümlede aynı kişi iki farklı isimle anılabilir — ama nasıl?",
      kural: "Apposition, virgülle ayrılmış iki ismin aynı kişi veya şeyi gösterdiği yapıdır. Birinci isim tanıtır, ikinci isim onu açıklar ya da başka bir adla anılmasını sağlar.",
      neden: "İngilizce, bir kişinin kimliğini ya da rolünü hemen netleştirmek için bu yapıyı kullanır. Okuyucu virgülü gördüğünde 'ah, bu kişi başka bir şekilde de tanınıyor' diye anlar.",
      tuzak: "Sınav sorusu virgülü çıkarıp iki ayrı yapı gibi gösterir, ya da apposition olmayan virgüllü yapıları apposition sanıyor gibi şıklar sunar.",
      ornek: "Cümlede 'John, the manager, arrived late' dediğimizde John ve the manager aynı kişidir. Virgüller John'un rolünü açıklar.",
      soru: "Şimdi apposition yapısını tanıyıp doğru cevabı bulmaya hazır mısın?",
      cozum: "Doğru cevap apposition'ı gösteren seçenektir — virgülle ayrılmış iki isim, aynı varlık, açıklama ilişkisi.",
      avci: "VIRGÜL + İSİM + VIRGÜL = Aynı kişi iki kez anılıyor → Apposition!",
    },
    nedenBadge: "AÇIKLAMA İÇİN TEKRAR",
    nedenText: "Bir ismi açıklamak için yanına virgülle aynı kişi/şeyi gösteren başka bir isim koyarız.",
    tuzakText: "ÖSYM virgülü görmezden gelip iki ayrı cümle sanıyor gibi şıklar sunar.",
    examples: [
  {
    "parts": [
      {
        "text": "My friend",
        "style": "plain"
      },
      {
        "text": ",",
        "style": "trap"
      },
      {
        "text": "Sarah",
        "style": "good"
      },
      {
        "text": ",",
        "style": "trap"
      },
      {
        "text": "is a doctor.",
        "style": "verb"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "The CEO",
        "style": "plain"
      },
      {
        "text": ",",
        "style": "trap"
      },
      {
        "text": "Mr. Thompson",
        "style": "good"
      },
      {
        "text": ",",
        "style": "trap"
      },
      {
        "text": "announced the merger.",
        "style": "verb"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "Istanbul",
        "style": "plain"
      },
      {
        "text": ",",
        "style": "trap"
      },
      {
        "text": "the largest city in Turkey",
        "style": "good"
      },
      {
        "text": ",",
        "style": "trap"
      },
      {
        "text": "attracts millions of tourists.",
        "style": "verb"
      }
    ]
  }
],
    breakdown: [
      { text: "Virgül + isim = Apposition sinyali", color: R },
      { text: "İkinci isim birincinin kimliğini/rolünü açıklar", color: G },
      { text: "Virgülsüz ise apposition değil, başka yapı", color: Y }
    ],
    question: { sentence: "Dr. Elizabeth, _____, has published three groundbreaking papers this year.", options: ["A) who is a neuroscientist and researcher","B) a neuroscientist and researcher,","C) being a neuroscientist and researcher","D) that is a neuroscientist and researcher"] },
    answerLabel: "B) APPOSITION FORM",
    cozumText: "Virgülle ayrılmış isim Dr. Elizabeth'i açıklayan apposition yapısı.",
    avciKodu: "VIRGÜL + İSİM + VIRGÜL = Apposition ✓ | WHO/THAT/BEING = Başka yapı ✗",
  }),
  lesson({
    id: "participle-clauses-indirgenmiş-cümlecik", epNum: 56, audioFolder: "master-56",
    hookTitle: "PARTICIPLE CLAUSES TUZAĞI!",
    kuralLines: ["V-ing veya V3 ile cümle kısalt","Özne aynı kalmalı, yoksa hata"],
    narration: {
      hook: "Bir cümleyi kısaltırken iki özne birden kullanırsan, sınav senin için tuzak kurar.",
      kural: "Participle clause, ana cümlenin öznesiyle aynı kişi/nesneyi anlatmalıdır. V-ing (present participle) veya V3 (past participle) kullanarak yan cümleyi indirgenmiş hale getirirsin, ama her zaman özne tutarlılığını kontrol etmelisin.",
      neden: "İngilizce, dilbilgisel ekonomi için cümleleri kısaltır; ancak bu kısaltma sırasında anlam kaybı yaşanmaması için özne hiçbir zaman değişmemelidir. Okuyucu, participle'ın ana özneyi işaret ettiğini otomatik olarak varsayar.",
      tuzak: "ÖSYM, ana cümlenin öznesiyle uyuşmayan bir participle clause sunarak, öğrencinin mantık hatası yapmasını bekler.",
      ornek: "\"Having finished the report, the manager left the office.\" — 'Having finished' (V3 participle), 'the manager' (özne) ile tutarlı. Eğer \"Having finished the report, the office was empty.\" dersek, 'having finished' ofise atfedilir ki bu yanlıştır.",
      soru: "Şimdi senin için hazırladığım mini soruyu çöz ve participle clause'un özne tutarlılığını yakala.",
      cozum: "Doğru cevap, participle clause'un ana cümlenin öznesiyle eşleştiği seçenektir; yanlış seçenekler, farklı özne taşıyan yapıları sunar.",
      avci: "Participle gördün mü? Hemen sor: 'Bu participle, ana özneyi mi anlatıyor, yoksa başka birini mi?' Eşleşirse ✓, eşleşmezse ✗",
    },
    nedenBadge: "ÖZNE TUTARLILIĞI ŞART",
    nedenText: "Participle clause'un öznesi, ana cümlenin öznesiyle aynı olmalı; aksi takdirde anlam bozulur.",
    tuzakText: "ÖSYM, farklı özneyle participle clause sunarak mantık hatası yaptırtmaya çalışır.",
    examples: [
  {
    "parts": [
      {
        "text": "Having completed",
        "style": "verb"
      },
      {
        "text": "the project,",
        "style": "plain"
      },
      {
        "text": "the team",
        "style": "plain"
      },
      {
        "text": "celebrated",
        "style": "verb"
      },
      {
        "text": "their success.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "Exhausted",
        "style": "verb"
      },
      {
        "text": "by the long journey,",
        "style": "plain"
      },
      {
        "text": "the travelers",
        "style": "plain"
      },
      {
        "text": "rested",
        "style": "verb"
      },
      {
        "text": "at the hotel.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "Being",
        "style": "verb"
      },
      {
        "text": "a talented musician,",
        "style": "plain"
      },
      {
        "text": "Sarah",
        "style": "plain"
      },
      {
        "text": "performed",
        "style": "verb"
      },
      {
        "text": "brilliantly.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "Participle (V-ing/V3) her zaman ana cümlenin öznesiyle aynı kişi/nesneyi anlatır.", color: G },
      { text: "Özne değişirse, cümle gramer ve anlam açısından yanlış olur.", color: R },
      { text: "Participle clause, ana cümleden önce veya sonra gelebilir, ancak özne tutarlılığı her zaman korunmalı.", color: Y }
    ],
    question: { sentence: "_____ the urgent email, the director immediately called an emergency meeting.", options: ["A) Receiving","B) Having received","C) Being received","D) To receive"] },
    answerLabel: "B) HAVING RECEIVED",
    cozumText: "Participle 'the director' (özne) ile tutarlı, tamamlanmış eylem gerekli.",
    avciKodu: "Participle → Özne kontrol → Ana cümle öznesiyle eşleş? → Evet = ✓ | Hayır = ✗",
  }),
  lesson({
    id: "discourse-markers-zitlik-contrast", epNum: 57, audioFolder: "master-57",
    hookTitle: "ZITLIK İŞARETLERİ TUZAĞI!",
    kuralLines: ["Zıtlık işaretleri iki fikri karşılaştırır","Sağında/solunda mantık bağlantısı ara"],
    narration: {
      hook: "Bir cümle olumlu görünüyor ama 'on the other hand' gelince bütün oyun değişiyor—hangisi gerçek mesaj?",
      kural: "Zıtlık işaretleri (on the other hand, nevertheless, nonetheless) iki fikri birbirine karşıt olarak sunar. İlk fikir kabul edilir ama ikinci fikir daha güçlü veya farklı bir açıdan sunulur. Bu işaretler 'evet ama' anlamında çalışır.",
      neden: "İngilizce yazıda mantıksal akış önemlidir; zıtlık işaretleri okuyucuya 'dikkat, şimdi başka bir bakış açısı geliyor' diye sinyal verir. Solunda pozitif/kabul, sağında olumsuz/karşı fikir veya farklı perspektif beklenir.",
      tuzak: "ÖSYM, zıtlık işaretinden sonra aynı yönde devam eden cümleler koyarak öğrenciyi yanıltır; örneğin 'The project was successful; nevertheless, it was very successful' gibi mantıksız seçenekler sunar.",
      ornek: "Cümle: 'The economy improved last quarter. On the other hand, unemployment rates remained high.' İlk kısım olumlu (ekonomi iyileşti), zıtlık işareti sonrası olumsuz (işsizlik yüksek). Bu yapı doğru kontrastı gösterir.",
      soru: "Şimdi sana bir boşluk doldurma sorusu sunacağım; zıtlık işaretinin sağında ne tür fikir gelmesi gerektiğini sen belirle.",
      cozum: "Doğru cevap, zıtlık işaretinden sonra ilk fikirle çelişen veya farklı bir açı sunan seçenektir. Aynı yönde devam eden seçenekler tuzaktır.",
      avci: "ZITLIK İŞARETİ = İlk fikir ✓ / Sonrası ✗ veya ≠ Mantık. Sağında karşı veya farklı görüş olmalı!",
    },
    nedenBadge: "FİKİR KARŞITLIĞI GÖSTERGESI",
    nedenText: "Yazarın bir fikri kabul etmesine rağmen başka bir fikri vurgulamak istediğini gösterir.",
    tuzakText: "ÖSYM, zıtlık işaretinden sonra aynı yönde fikir koyarak öğrenciyi yanıltır.",
    examples: [
  {
    "parts": [
      {
        "text": "The technology is innovative and cost-effective.",
        "style": "plain"
      },
      {
        "text": "Nevertheless,",
        "style": "trap"
      },
      {
        "text": "many companies",
        "style": "plain"
      },
      {
        "text": "hesitate",
        "style": "verb"
      },
      {
        "text": "to adopt it due to implementation challenges.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "The proposal received strong support from management.",
        "style": "plain"
      },
      {
        "text": "On the other hand,",
        "style": "trap"
      },
      {
        "text": "the team",
        "style": "plain"
      },
      {
        "text": "raised",
        "style": "verb"
      },
      {
        "text": "serious concerns about its feasibility.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "The research findings are promising.",
        "style": "plain"
      },
      {
        "text": "Nonetheless,",
        "style": "trap"
      },
      {
        "text": "further testing",
        "style": "plain"
      },
      {
        "text": "is",
        "style": "verb"
      },
      {
        "text": "required before commercial release.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "On the other hand = ama, fakat, tersine (zıt fikir başlat)", color: R },
      { text: "Nevertheless/Nonetheless = yine de, buna rağmen (karşı görüş vur)", color: R },
      { text: "Solunda kabul/olumlu, sağında karşı/olumsuz veya farklı açı", color: G }
    ],
    question: { sentence: "The report demonstrates significant cost savings. _____, the environmental impact of the process remains concerning to stakeholders.", options: ["A) Furthermore","B) On the other hand","C) In addition","D) As a result"] },
    answerLabel: "B) ON THE OTHER HAND",
    cozumText: "Maliyet tasarrufu (olumlu) vs. çevre etkisi (olumsuz) = zıtlık gerekli.",
    avciKodu: "Zıtlık İşareti Motoru:\n→ Solda: ✓ (olumlu/kabul)\n→ Sağda: ✗ veya ≠ (olumsuz/karşı)\n→ İkisi KARŞIT ise: Nevertheless/On the other hand ✓\n→ İkisi AYNI YÖN ise: Furthermore/Moreover ✗",
  }),
  lesson({
    id: "discourse-markers-reason-result", epNum: 58, audioFolder: "master-58",
    hookTitle: "THEREFORE / THUS / CONSEQUENTLY TUZAĞI!",
    kuralLines: ["Neden-sonuç bağlacı: sebep → sonuç","Virgül + bağlaç + virgül kuralı"],
    narration: {
      hook: "Bir cümle mantıklı sonuç çıkarıyorsa, onu bağlamak için hangi kelimeyi kullanmalısın?",
      kural: "Therefore, thus, consequently gibi bağlaçlar önceki cümlenin sonucunu gösterir. Bu kelimeler her zaman virgülle çevrelenir: cümle + , therefore, + cümle. Aralarında mantıksal bir neden-sonuç ilişkisi olmalıdır.",
      neden: "İngilizce yazı dilinde sonuç bildiren bağlaçlar, okuyucuya 'bunun sonucu şudur' mesajı verir. Solunda sebep, sağında sonuç aranır. Bu yapı mantıksal akışı güçlendirir.",
      tuzak: "ÖSYM, bu bağlaçları cümlenin ortasına yerleştirerek veya mantıksız bir neden-sonuç ilişkisinde sunarak çelişki yaratır. Ayrıca 'and', 'but' gibi bağlaçlarla karıştırarak seçenekler sunar.",
      ornek: "Örnek cümlede 'The company invested heavily in research; therefore, they developed innovative products.' yapısında therefore, virgülle çevrelenerek iki bağımsız cümleyi birleştirir. Solda yatırım (sebep), sağda ürün geliştirme (sonuç) vardır.",
      soru: "Aşağıdaki cümlede boş yere hangi bağlaç uygun gelir, incele.",
      cozum: "Therefore/thus/consequently, önceki cümlenin doğrudan sonucunu gösterir ve her zaman virgülle çevrelenir. Mantıksal ilişki net olmalıdır.",
      avci: "THEREFORE = Sebep → Virgül → Therefore → Virgül → Sonuç (mantık zinciri kırılmaz!)",
    },
    nedenBadge: "SONUÇ BAĞLAYICI SİNYAL",
    nedenText: "İki bağımsız cümleyi mantıksal neden-sonuç ilişkisiyle birleştirir.",
    tuzakText: "ÖSYM, bu bağlaçları yanlış konumda veya yanlış anlamda sunarak öğrenciyi yanıltır.",
    examples: [
  {
    "parts": [
      {
        "text": "The weather was extremely cold",
        "style": "plain"
      },
      {
        "text": "therefore",
        "style": "trap"
      },
      {
        "text": "the outdoor event",
        "style": "plain"
      },
      {
        "text": "was postponed.",
        "style": "verb"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "She studied diligently for months",
        "style": "plain"
      },
      {
        "text": "consequently",
        "style": "trap"
      },
      {
        "text": "she",
        "style": "plain"
      },
      {
        "text": "passed the exam with distinction.",
        "style": "verb"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "The factory reduced its emissions significantly",
        "style": "plain"
      },
      {
        "text": "thus",
        "style": "trap"
      },
      {
        "text": "improving",
        "style": "verb"
      },
      {
        "text": "the air quality in the region.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "Therefore/thus/consequently = sonuç bildiren bağlaç", color: G },
      { text: "Her zaman virgülle çevrelenir: , bağlaç,", color: G },
      { text: "Solda sebep, sağda sonuç mantığı", color: Y },
      { text: "Cümle ortasına konulamaz, cümle başında yer alır", color: R }
    ],
    question: { sentence: "The government implemented strict environmental regulations; _____, pollution levels decreased significantly within two years.", options: ["A) and then","B) therefore","C) however","D) meanwhile"] },
    answerLabel: "B) THEREFORE",
    cozumText: "Therefore, sebep-sonuç ilişkisini gösterir; virgülle çevrelenir.",
    avciKodu: "Sebep (regulations) → Therefore → Sonuç (pollution decreased) ✓ | And/However/Meanwhile ✗",
  }),
  lesson({
    id: "referans-kelimeleri-this-that-such", epNum: 59, audioFolder: "master-59",
    hookTitle: "THIS/THAT/SUCH ATIF TUZAĞI!",
    kuralLines: ["This/That/Such önceki fikri işaret eder","Yanlış antesedent seçmek sınav kaybı"],
    narration: {
      hook: "Bir cümlede 'this' veya 'that' gördüğünde, hangisine atıf yaptığını biliyor musun?",
      kural: "This/That/Such gibi referans kelimeleri, paragrafta önceki bir fikri, durumu veya ismi işaret eder. Bunlar kısaltma değil, bağlantı köprüsüdür. Doğru antesedenti (geri atıf yaptığı şeyi) bulmak, cümlenin anlamını değiştirir.",
      neden: "İngilizce yazı akışında tekrar etmemek için bu kelimeler kullanılır. Sınav sorusu, öğrencinin paragrafı bütünsel olarak okumasını ve mantıksal bağlantıyı görmesini test eder. Yanlış seçim, cümleyi anlamsız veya çelişkili kılar.",
      tuzak: "ÖSYM, yakın duran bir kelimeyi veya ismi şık olarak sunar; ama 'this' aslında daha önceki bir cümlenin tamamına veya başka bir isme atıf yapmaktadır.",
      ornek: "Cümlede 'The government announced new policies. This decision shocked many citizens.' yazıyorsa, 'This' sadece 'policies' değil, 'announcement' olayının tamamına atıf yapar. Kontekst bunu belirler.",
      soru: "Aşağıdaki paragrafta 'that' kelimesi hangi fikre atıf yapmaktadır? Seçenekleri okuyarak mantıksal bağlantıyı takip et.",
      cozum: "Doğru cevap, 'that' veya 'this' kelimesinden hemen önceki cümlenin ana fikrini veya önceki paragrafın sonuç cümlesini işaret eder. Cümleyi oku, anlam bütünlüğünü kontrol et.",
      avci: "THIS/THAT/SUCH → Bir adım geri git, önceki cümleyi oku, 'ne' işaret ettiğini sor, mantık tutarsa doğru!",
    },
    nedenBadge: "PARAGRAF BAĞLANTISI SINAVI",
    nedenText: "Sınav yazarı, öğrenciyi yanlış cümleye veya yanlış isme bağlamaya çalışır.",
    tuzakText: "Yakın kelime veya isim seçmek, ama gerçek referans daha uzaktadır.",
    examples: [
  {
    "parts": [
      {
        "text": "The company invested heavily in renewable energy. ",
        "style": "plain"
      },
      {
        "text": "This",
        "style": "trap"
      },
      {
        "text": " decision ",
        "style": "plain"
      },
      {
        "text": "reflected",
        "style": "verb"
      },
      {
        "text": " their commitment to sustainability.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "Scientists discovered a new species in the Amazon. ",
        "style": "plain"
      },
      {
        "text": "Such",
        "style": "trap"
      },
      {
        "text": " findings ",
        "style": "plain"
      },
      {
        "text": "are",
        "style": "verb"
      },
      {
        "text": " rare and require further study.",
        "style": "plain"
      }
    ]
  },
  {
    "parts": [
      {
        "text": "The policy was rejected by parliament. ",
        "style": "plain"
      },
      {
        "text": "That",
        "style": "trap"
      },
      {
        "text": " outcome ",
        "style": "plain"
      },
      {
        "text": "disappointed",
        "style": "verb"
      },
      {
        "text": " environmental groups.",
        "style": "plain"
      }
    ]
  }
],
    breakdown: [
      { text: "This = yakın geçmiş / şu anda söylenen fikir", color: G },
      { text: "That = daha uzak / önceki paragrafın fikri", color: G },
      { text: "Such = benzer tür / kategori işaret eder", color: G },
      { text: "Antesedent = atıf yapılan kelime/fikir, her zaman öncedir", color: Y }
    ],
    question: { sentence: "The government introduced strict environmental regulations. Many industries opposed _____ decision because it increased operational costs.", options: ["A) the government's","B) that","C) this","D) such"] },
    answerLabel: "B) THAT",
    cozumText: "'That' önceki cümledeki 'regulations' kararını işaret eder, mantık tutarlı.",
    avciKodu: "THIS/THAT/SUCH → [Kelimeyi gör] → [Bir cümle geri git] → [Anlam tutarsa ✓] → Seç!",
  }),
  lesson({
    id: "master-avci-3-finale", epNum: 60, audioFolder: "master-60",
    hookTitle: "MASTER AVCI 3 — FİNAL BOSS!",
    kuralLines: ["Bütün motoru tek soruda çalıştır.", "Sinyal, devrik yapı, patron isim, anlam."],
    narration: {
      hook: "MASTER AVCI 3! FİNAL BOSS! Bütün öğrendiklerini tek cümlede kullanacaksın!",
      kural: "Not only bir cümlenin başına geldiğinde devrik yapı ister; yardımcı fiil özneden önce gelir. But also ile ikinci parçayı bağlarsın.",
      neden: "Not only...but also paralel yapı ve vurgu kurar; başta olduğunda inversion (devrik sözdizimi) zorunludur — bu, cümleye resmiyet ve vurgu katar.",
      tuzak: "Öğrenci 'Not only' gördüğünde normal sözdizimini (S+V) seçer, devrik yapıyı (yardımcı fiil+özne) gözden kaçırır — ÖSYM bu yüzden normal sıralı şıkları çeldirici koyar.",
      ornek: "Not only did the company launch a new product, but it also expanded into three new markets. Fiil: did launch / expanded. Sinyal: Not only...but also, devrik yapı.",
      soru: "Şimdi sırada final soru var. A the team not only improved, B not only did the team improve, C the team did not only improve, D not only the team improved.",
      cozum: "Cevap B, not only did the team improve. Not only cümle başında, devrik yapı zorunlu: yardımcı fiil (did) özneden (the team) önce gelir.",
      avci: "Gör, fiili bul, S V O, patron ismi bul, sinyali yakala, devrik mi kontrol et, sağ sol kontrol, şıkları ele, anlamı doğrula, avla!",
    },
    nedenBadge: "TÜM MOTORU ÇALIŞTIR",
    nedenText: "sinyali yakala, devrik yapıyı kontrol et, patron ismi bul, anlamı doğrula.",
    tuzakText: "\"Not only\" başta iken normal sözdizimi (S+V) seçmek — devrik yapı zorunlu, gözden kaçırılıyor.",
    examples: [
      { parts: [
        { text: "Not only", style: "trap" },
        { text: "did", style: "verb" },
        { text: "the company launch a new product, but it also expanded into three new markets.", style: "plain" },
      ] },
    ],
    breakdown: [
      { text: "sinyal → Not only...but also (devrik + paralel)", color: Y },
      { text: "fiiller → did launch / expanded", color: G },
    ],
    question: { sentence: "_____ improve its efficiency, but it also reduced overall costs significantly.", options: ["A) The team not only improved", "B) Not only did the team improve", "C) The team did not only improve", "D) Not only the team improved"] },
    answerLabel: "B) NOT ONLY DID",
    cozumText: "Not only başta → devrik yapı zorunlu: yardımcı fiil + özne.",
    avciKodu: "GÖR→FİİLİ BUL→S+V+O→PATRON İSMİ→\nSİNYALİ YAKALA→DEVRİK Mİ KONTROL ET→ŞIKLARI ELE→ANLAMI DOĞRULA→🎯AVLA",
  }),
];

export const DUMMY_LESSON = LESSONS[0];

// #1 OF TUZAĞI, bespoke Master01OfTuzagiReel.jsx ile üretildi (bu dosyanın
// LESSONS'ından önce, genel şablon henüz yokken) — video dosyası zaten
// out/master-01-episode-01.mp4'te hazır. Burada sadece YAYIN metadata'sı
// (başlık/açıklama/hashtag üretimi) için lesson-şekilli bir obje tutuyoruz.
export const EPISODE_1_META = {
  id: "of-tuzagi", epNum: 1, hookTitle: "OF TUZAĞI!",
  narration: { kural: "'Of' gördüğünde son ismi özne sanma. Fiili bul, sola dön, patron ismi bul." },
  question: {
    sentence: "The rapid development of technology _____ new opportunities.",
    options: ["A) create", "B) creates", "C) creating", "D) have created"],
  },
  answerLabel: "B) CREATES",
  cozumText: "Patron isim development tekil.",
  videoFile: "master-01-episode-01.mp4",
};

// Yayın script'i için: #1 (bespoke) + #2-#30 (LESSONS) tek sırada.
export const ALL_EPISODES_META = [
  EPISODE_1_META,
  ...LESSONS.map((l) => ({ ...l, videoFile: `master-${String(l.epNum).padStart(2, "0")}-${l.id}.mp4` })),
];
