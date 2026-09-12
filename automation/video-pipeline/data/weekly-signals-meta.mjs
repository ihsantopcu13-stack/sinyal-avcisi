// ============================================================
// HAFTALIK SİNYAL VİDEOLARI — 7 gün × 2 video (kart formatı sinyal
// videosu + motivasyon videosu) yayın metadata'sı.
// Video kaynağı: automation/karaoke-video/batch/<gün>_reels1.mp4 ve
// <gün>_reels2.mp4 (batch/ gitignored — bkz.
// scripts/upload-weekly-signals-to-release.mjs).
//
// NOT: <gün>_carousel.mp4 kasıtlı olarak listede YOK — reels1.mp4 ile
// birebir aynı içerik (aynı script + aynı kart render'ı), ayrı bir post
// olarak paylaşmak birebir kopya içerik olurdu.
// ============================================================

const DAY_LABELS = {
  pazartesi: "Pazartesi",
  sali: "Salı",
  carsamba: "Çarşamba",
  persembe: "Perşembe",
  cuma: "Cuma",
  cumartesi: "Cumartesi",
  pazar: "Pazar",
};

const SIGNAL_TOPICS = {
  pazartesi: "Koşul Sinyalleri",
  sali: "Sebep-Sonuç Sinyalleri",
  carsamba: "Amaç Sinyalleri",
  persembe: "Ekleme Sinyalleri",
  cuma: "Zıtlık Sinyalleri",
  cumartesi: "Bağlaç Sinyalleri",
  pazar: "Karşılaştırma Sinyalleri",
};

const SIGNALS = {
  pazartesi: [
    { word: "IF", en: "If you study, you will succeed.", tr: "Çalışırsan başarırsın." },
    { word: "UNLESS", en: "Unless you study, you will fail.", tr: "Çalışmazsan başarısız olursun." },
    { word: "PROVIDED THAT", en: "You will pass, provided that you study hard.", tr: "Sıkı çalışman şartıyla geçersin." },
    { word: "IN CASE", en: "Take an umbrella in case it rains.", tr: "Yağmur yağar ihtimaline karşı şemsiye al." },
    { word: "AS LONG AS", en: "You will improve as long as you practice.", tr: "Pratik yaptığın sürece gelişirsin." },
  ],
  sali: [
    { word: "BECAUSE", en: "He succeeded because he worked hard.", tr: "Çok çalıştığı için başardı." },
    { word: "SINCE", en: "Since you have time, start now.", tr: "Vaktin olduğuna göre şimdi başla." },
    { word: "AS", en: "As he was tired, he slept early.", tr: "Yorgun olduğu için erken yattı." },
    { word: "SO", en: "She slept little, so she felt tired.", tr: "Az uyudu, bu yüzden yorgun hissetti." },
    { word: "THEREFORE", en: "He studied a lot, therefore he won.", tr: "Çok çalıştı, bu nedenle kazandı." },
  ],
  carsamba: [
    { word: "SO THAT", en: "He studied hard so that he could pass.", tr: "Geçebilmek için sıkı çalıştı." },
    { word: "IN ORDER TO", en: "She practiced in order to improve.", tr: "Gelişmek amacıyla pratik yaptı." },
    { word: "SO AS TO", en: "He left early so as to catch the bus.", tr: "Otobüsü yakalamak için erken çıktı." },
    { word: "FOR THE PURPOSE OF", en: "He reviewed the notes for the purpose of understanding.", tr: "Anlamak amacıyla notları tekrar gözden geçirdi." },
    { word: "TO", en: "She studied to pass the exam.", tr: "Sınavı geçmek için çalıştı." },
  ],
  persembe: [
    { word: "MOREOVER", en: "She is hardworking; moreover, she is smart.", tr: "Çalışkan; üstelik zeki de." },
    { word: "FURTHERMORE", en: "He is disciplined; furthermore, he is patient.", tr: "Disiplinli; ayrıca sabırlı da." },
    { word: "IN ADDITION", en: "In addition to studying, he exercises daily.", tr: "Çalışmaya ek olarak her gün spor yapıyor." },
    { word: "BESIDES", en: "Besides being smart, she is kind.", tr: "Zeki olmasının yanında kibar da." },
    { word: "ADDITIONALLY", en: "Additionally, he reviews his notes every night.", tr: "İlaveten her gece notlarını gözden geçiriyor." },
  ],
  cuma: [
    { word: "ALTHOUGH", en: "Although it was raining, they played outside.", tr: "Yağmur yağmasına rağmen dışarıda oynadılar." },
    { word: "DESPITE", en: "Despite the rain, they continued.", tr: "Yağmura rağmen devam ettiler." },
    { word: "HOWEVER", en: "He tried hard, however he failed.", tr: "Çok denedi ancak başarısız oldu." },
    { word: "THEREFORE", en: "She studied every day, therefore she succeeded.", tr: "Her gün çalıştı bu yüzden başarılı oldu." },
    { word: "NEVERTHELESS", en: "It was difficult, nevertheless she continued.", tr: "Zordu yine de devam etti." },
  ],
  cumartesi: [
    { word: "NOT ONLY...BUT ALSO", en: "She is not only smart but also hardworking.", tr: "Sadece zeki değil aynı zamanda çalışkan." },
    { word: "NEITHER...NOR", en: "He has neither time nor money.", tr: "Ne zamanı ne de parası var." },
    { word: "EITHER...OR", en: "You either study now or regret later.", tr: "Ya şimdi çalışırsın ya da sonra pişman olursun." },
    { word: "BOTH...AND", en: "She is both talented and confident.", tr: "Hem yetenekli hem özgüvenli." },
    { word: "AS WELL AS", en: "He studies English as well as math.", tr: "İngilizce'nin yanı sıra matematik de çalışıyor." },
  ],
  pazar: [
    { word: "AS...AS", en: "She is as hardworking as her brother.", tr: "Kardeşi kadar çalışkan." },
    { word: "MORE THAN", en: "He studied more than expected.", tr: "Beklenenden daha fazla çalıştı." },
    { word: "LESS THAN", en: "She slept less than yesterday.", tr: "Dünden daha az uyudu." },
    { word: "SIMILAR TO", en: "This question is similar to the previous one.", tr: "Bu soru öncekine benzer." },
    { word: "UNLIKE", en: "Unlike the last exam, this one was easy.", tr: "Önceki sınavın aksine bu kolaydı." },
  ],
};

const DAY_ORDER = ["pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar"];

function signalVideo(day) {
  const label = DAY_LABELS[day];
  const topic = SIGNAL_TOPICS[day];
  const signals = SIGNALS[day];
  return {
    id: `${day}-reels1`,
    day,
    type: "signal",
    videoFile: `${day}_reels1.mp4`,
    youtube: {
      title: `${topic} — YDS/YÖKDİL`.slice(0, 70),
      description: [
        `Bu hafta ${label} sinyalleri: ${signals.map((s) => s.word).join(", ")}.`,
        "",
        ...signals.flatMap((s) => [`${s.word}`, s.en, s.tr, ""]),
        "Sinyal Avcısı ile YDS/YÖKDİL'e ücretsiz hazırlan: https://sinyal-avcisi.com",
        `#YDS #YÖKDİL #İngilizce #SinyalAvcısı #Shorts`,
      ].join("\n"),
      tags: ["YDS", "YÖKDİL", "İngilizce", "SinyalAvcısı", topic.replace(/\s+/g, "")].slice(0, 5),
    },
    instagram: [
      `🎯 ${topic}`,
      "",
      ...signals.flatMap((s) => [`${s.word} — ${s.en}`, s.tr, ""]),
      "💙 Platform tamamen ücretsiz — link bio'da.",
      "",
      `#YDS #YÖKDİL #İngilizce #SinyalAvcısı #Reels`,
    ].join("\n"),
  };
}

function motivationVideo(day) {
  const label = DAY_LABELS[day];
  return {
    id: `${day}-reels2`,
    day,
    type: "motivation",
    videoFile: `${day}_reels2.mp4`,
    youtube: {
      title: `${label} Motivasyonu — Sinyal Avcısı`.slice(0, 70),
      description: [
        `${label} günü YDS/YÖKDİL hazırlığına devam! Sinyal Avcısı ile her gün bir sinyal öğren.`,
        "",
        "Sinyal Avcısı ile YDS/YÖKDİL'e ücretsiz hazırlan: https://sinyal-avcisi.com",
        "#YDS #YÖKDİL #İngilizce #SinyalAvcısı #Shorts",
      ].join("\n"),
      tags: ["YDS", "YÖKDİL", "İngilizce", "SinyalAvcısı", "Motivasyon"],
    },
    instagram: [
      `📅 ${label} — Sinyal Avcısı`,
      "",
      `${label} günü de YDS/YÖKDİL hazırlığına ara verme.`,
      "",
      "💙 Platform tamamen ücretsiz — link bio'da.",
      "",
      "#YDS #YÖKDİL #İngilizce #SinyalAvcısı #Reels",
    ].join("\n"),
  };
}

export const WEEKLY_SIGNALS_QUEUE = DAY_ORDER.flatMap((day) => [signalVideo(day), motivationVideo(day)]);
