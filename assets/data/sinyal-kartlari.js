// ============================================================
// SİNYAL KELİME KARTLARI — veri (sayfa: /sinyal-kartlari)
// ============================================================
// YENİ KELİME EKLEMEK: aşağıdaki diziye bir nesne daha ekle. Hepsi bu.
// `node tests/sinyal-kartlari.test.mjs` alanların eksiksiz olduğunu ve
// kelimenin örnek cümlede gerçekten geçtiğini kontrol eder.
//
// Alanlar:
//   word    Sinyal kelime ya da öbek (İngilizce), kartın ön yüzünde.
//   type    Sinyal türü: zitlik | sebep | zaman | kosul | ekleme | olumsuz
//           (renkler ve adlar assets/modules/sinyal-soru.js → SINYAL_TIPLERI)
//   level   Zorluk: kolay | orta | zor
//   tr      Türkçe karşılığı.
//   islev   Sınavdaki işlevi: ne zaman, hangi yapıyla gelir (Kural).
//   ornek   YDS/YÖKDİL tarzı örnek cümle (İngilizce, kelime içinde geçer).
//   ornekTr Örnek cümlenin Türkçesi.
//   tuzak   Sınavda sık yapılan yanlış.
// ============================================================

/**
 * @typedef {Object} SinyalKart
 * @property {string} word
 * @property {'zitlik'|'sebep'|'zaman'|'kosul'|'ekleme'|'olumsuz'} type
 * @property {'kolay'|'orta'|'zor'} level
 * @property {string} tr
 * @property {string} islev
 * @property {string} ornek
 * @property {string} ornekTr
 * @property {string} tuzak
 */

/** @type {SinyalKart[]} */
var SINYAL_KARTLARI = [
  // ---------------- Zıtlık ----------------
  { word: 'Although', type: 'zitlik', level: 'kolay', tr: '-e rağmen, -dığı hâlde',
    islev: 'İki cümleyi zıtlıkla bağlar. Arkasından tam cümle gelir (özne + yüklem).',
    ornek: 'Although the drug reduced pain, it caused serious side effects.',
    ornekTr: 'İlaç ağrıyı azaltmasına rağmen ciddi yan etkilere yol açtı.',
    tuzak: 'Despite ile karıştırma. Although + cümle, despite + isim. Boşluktan sonra özne ve fiil varsa although seç.' },
  { word: 'Even though', type: 'zitlik', level: 'kolay', tr: '-mesine rağmen (güçlü)',
    islev: 'Although ile aynı yapı, zıtlığı daha güçlü vurgular. Arkasından cümle gelir.',
    ornek: 'Even though the team worked overtime, the project was delayed.',
    ornekTr: 'Ekip fazla mesai yapmasına rağmen proje gecikti.',
    tuzak: 'Even if ile karıştırma. Even if "olsa bile" demektir, bir koşul bildirir. Even though gerçek bir durumu anlatır.' },
  { word: 'Despite', type: 'zitlik', level: 'kolay', tr: '-e rağmen',
    islev: 'Zıtlık edatıdır. Arkasından isim, isim öbeği ya da V-ing gelir.',
    ornek: 'Despite the heavy rain, the match was not cancelled.',
    ornekTr: 'Şiddetli yağmura rağmen maç iptal edilmedi.',
    tuzak: '"Despite of" diye bir yapı yoktur. Arkasından cümle gelecekse "despite the fact that" olur.' },
  { word: 'In spite of', type: 'zitlik', level: 'kolay', tr: '-e rağmen',
    islev: 'Despite ile aynı. Arkasından isim ya da V-ing gelir.',
    ornek: 'In spite of its small size, the device is extremely powerful.',
    ornekTr: 'Küçük boyutuna rağmen cihaz son derece güçlüdür.',
    tuzak: 'Of olmadan kullanılmaz. Şıklarda "in spite" ve "despite" yan yana çıkarsa yapıya bak: ikisi de isim ister.' },
  { word: 'However', type: 'zitlik', level: 'kolay', tr: 'ancak, fakat',
    islev: 'İki ayrı cümleyi zıtlıkla bağlar. Genelde nokta ya da noktalı virgülden sonra, virgülle gelir: "; however,".',
    ornek: 'The theory seemed convincing; however, later experiments disproved it.',
    ornekTr: 'Teori ikna edici görünüyordu; ancak sonraki deneyler onu çürüttü.',
    tuzak: 'Although gibi tek cümle içinde iki yan cümleyi bağlamaz. Noktalı virgül görüp her zaman however seçme, önce anlamın zıt olduğunu kontrol et.' },
  { word: 'Nevertheless', type: 'zitlik', level: 'orta', tr: 'yine de, buna rağmen',
    islev: 'However gibi iki ayrı cümleyi bağlar. Beklenene rağmen olan durumu anlatır.',
    ornek: 'The evidence was weak; nevertheless, the jury found him guilty.',
    ornekTr: 'Kanıtlar zayıftı; yine de jüri onu suçlu buldu.',
    tuzak: 'Consequently ile şıklarda yan yana çıkar. Sonuç beklenen bir şeyse consequently, beklenmedik bir şeyse nevertheless.' },
  { word: 'Nonetheless', type: 'zitlik', level: 'orta', tr: 'yine de',
    islev: 'Nevertheless ile aynı anlam ve kullanım.',
    ornek: 'The task was difficult; nonetheless, the students completed it on time.',
    ornekTr: 'Görev zordu; yine de öğrenciler onu zamanında bitirdi.',
    tuzak: 'Arkasından cümle gelir, isim gelmez. "Nonetheless the rain" yanlış; isimle zıtlık için despite kullan.' },
  { word: 'Whereas', type: 'zitlik', level: 'orta', tr: 'oysa, -iken',
    islev: 'İki şeyi karşılaştırır, farkı gösterir. Arkasından cümle gelir.',
    ornek: 'Some species adapt quickly to change, whereas others become extinct.',
    ornekTr: 'Bazı türler değişime hızla uyum sağlarken diğerleri yok olur.',
    tuzak: 'Sebep anlamı yoktur. "Some ... others" gibi iki grup görürsen whereas ya da while düşün.' },
  { word: 'While', type: 'zitlik', level: 'orta', tr: '-iken; oysa',
    islev: 'Hem zaman ("-iken") hem zıtlık ("oysa") bildirir. Hangisi olduğunu bağlam söyler.',
    ornek: 'While most people prefer cities, a growing number are moving to rural areas.',
    ornekTr: 'Çoğu insan şehirleri tercih ederken, giderek artan sayıda kişi kırsala taşınıyor.',
    tuzak: 'Her zaman "-iken" diye çevirme. İki karşıt bilgi varsa while = whereas olur.' },
  { word: 'Yet', type: 'zitlik', level: 'orta', tr: 'ama, yine de',
    islev: 'Cümle ortasında "but" gibi zıtlık bağlacıdır.',
    ornek: 'The plan was simple, yet it proved surprisingly effective.',
    ornekTr: 'Plan basitti, ama şaşırtıcı derecede etkili oldu.',
    tuzak: '"Not yet" (henüz değil) anlamıyla karıştırma. Virgülden sonra iki cümleyi bağlıyorsa anlamı "ama"dır.' },
  { word: 'In contrast', type: 'zitlik', level: 'orta', tr: 'buna karşın, aksine',
    islev: 'İki farklı şeyi karşılaştırır. Genelde cümle başında, virgülle gelir.',
    ornek: 'Northern regions are cold and wet. In contrast, the south is warm and dry.',
    ornekTr: 'Kuzey bölgeleri soğuk ve yağışlıdır. Buna karşın güney sıcak ve kurudur.',
    tuzak: 'On the contrary ile karıştırma. In contrast iki ayrı şeyi karşılaştırır; on the contrary önceki fikri reddeder.' },
  { word: 'On the contrary', type: 'zitlik', level: 'zor', tr: 'tam tersine',
    islev: 'Önceki cümledeki fikri reddeder, doğrusunu söyler. Genelde olumsuz bir cümleden sonra gelir.',
    ornek: 'The new law did not reduce crime. On the contrary, it increased it.',
    ornekTr: 'Yeni yasa suçu azaltmadı. Tam tersine, artırdı.',
    tuzak: 'İki farklı grubu karşılaştırmak için kullanılmaz; bunun için in contrast ya da whereas gelir.' },
  { word: 'Notwithstanding', type: 'zitlik', level: 'zor', tr: '-e rağmen (resmî)',
    islev: 'Despite ile aynı anlam, daha resmî. Arkasından isim gelir.',
    ornek: 'Notwithstanding the economic crisis, exports continued to rise.',
    ornekTr: 'Ekonomik krize rağmen ihracat artmaya devam etti.',
    tuzak: 'Uzun ve tanıdık olmadığı için elenir. Akademik metinde despite görevi görür, unutma.' },

  // ---------------- Sebep-sonuç ----------------
  { word: 'Because of', type: 'sebep', level: 'kolay', tr: '-den dolayı, yüzünden',
    islev: 'Sebep bildirir. Arkasından isim ya da isim öbeği gelir.',
    ornek: 'The flight was delayed because of a technical problem.',
    ornekTr: 'Uçuş teknik bir sorun yüzünden ertelendi.',
    tuzak: 'Because + cümle, because of + isim. Boşluktan sonra yapıya bak.' },
  { word: 'Due to', type: 'sebep', level: 'kolay', tr: 'yüzünden, nedeniyle',
    islev: 'Because of ile aynı. Arkasından isim gelir.',
    ornek: 'Many crops failed due to the long drought.',
    ornekTr: 'Uzun kuraklık nedeniyle birçok ürün yetişmedi.',
    tuzak: 'In spite of da isim alır, yapı tutar ama anlam tersidir. Yapıyı eledikten sonra anlamı kontrol et.' },
  { word: 'Owing to', type: 'sebep', level: 'orta', tr: 'nedeniyle, sayesinde',
    islev: 'Due to ile aynı anlam ve yapı.',
    ornek: 'Owing to improved hygiene, infant deaths fell sharply.',
    ornekTr: 'Gelişen hijyen sayesinde bebek ölümleri hızla azaldı.',
    tuzak: '"Owe" (borçlu olmak) fiilini düşünüp anlamı kaçırma. Owing to = because of.' },
  { word: 'Since', type: 'sebep', level: 'orta', tr: 'çünkü; -den beri',
    islev: 'İki anlamı var: "çünkü" (sebep) ve "-den beri" (zaman). Zaman anlamında present perfect ister.',
    ornek: 'Since the data were incomplete, the researchers repeated the survey.',
    ornekTr: 'Veriler eksik olduğu için araştırmacılar anketi tekrarladı.',
    tuzak: 'Since + geçmişte bir zaman noktası görürsen ana cümleyi present perfect yap. Sebep anlamında zaman kuralı yoktur.' },
  { word: 'Therefore', type: 'sebep', level: 'kolay', tr: 'bu nedenle, bu yüzden',
    islev: 'Önceki cümlenin sonucunu başlatır.',
    ornek: 'The bridge is unsafe; therefore, it will be closed to traffic.',
    ornekTr: 'Köprü güvenli değil; bu nedenle trafiğe kapatılacak.',
    tuzak: 'Sonuç başlatır, sebep değil. İkinci cümle birincinin sebebiyse therefore yanlıştır.' },
  { word: 'Consequently', type: 'sebep', level: 'orta', tr: 'sonuç olarak',
    islev: 'Önceki durumun doğal sonucunu bildirir. Therefore ile aynı.',
    ornek: 'The company lost its biggest client; consequently, it had to cut jobs.',
    ornekTr: 'Şirket en büyük müşterisini kaybetti; sonuç olarak işten çıkarma yapmak zorunda kaldı.',
    tuzak: 'Sonuç beklenmedik bir şeyse consequently değil, nevertheless gelir.' },
  { word: 'Hence', type: 'sebep', level: 'orta', tr: 'bu yüzden, dolayısıyla',
    islev: 'Sonuç bildirir. Arkasından cümle de isim de gelebilir: "hence the name".',
    ornek: 'The island was once a prison, hence its gloomy reputation.',
    ornekTr: 'Ada bir zamanlar hapishaneydi, bu yüzden kasvetli bir üne sahip.',
    tuzak: 'Arkasından fiilsiz bir isim gelince yanlış sanılır. "Hence + isim" doğru ve sık bir kullanımdır.' },
  { word: 'Thus', type: 'sebep', level: 'orta', tr: 'böylece, bu yüzden',
    islev: 'Sonuç bildirir. "Thus + V-ing" ile sonucu kısaca ekler.',
    ornek: 'Trees absorb carbon dioxide, thus reducing the effects of climate change.',
    ornekTr: 'Ağaçlar karbondioksiti emer, böylece iklim değişikliğinin etkilerini azaltır.',
    tuzak: 'Thus + V-ing yapısında V-ing, önceki eylemin sonucudur, ayrı bir eylem değildir.' },
  { word: 'As a result', type: 'sebep', level: 'kolay', tr: 'sonuç olarak',
    islev: 'Tek başına sonuç bildirir. "As a result of + isim" ise sebep bildirir.',
    ornek: 'The factory changed its process. As a result, pollution dropped by half.',
    ornekTr: 'Fabrika üretim yöntemini değiştirdi. Sonuç olarak kirlilik yarıya indi.',
    tuzak: 'As a result (sonuç) ile as a result of (sebep) farklıdır. Of varsa arkasından gelen şey sebeptir.' },

  // ---------------- Ekleme ----------------
  { word: 'Furthermore', type: 'ekleme', level: 'kolay', tr: 'ayrıca, üstelik',
    islev: 'Aynı yönde yeni bir bilgi ekler. Genelde cümle başında, virgülle.',
    ornek: 'The method is cheap. Furthermore, it is easy to apply.',
    ornekTr: 'Yöntem ucuz. Ayrıca uygulaması kolay.',
    tuzak: 'Zıtlık yoksa however seçme. İki cümle de olumlu ya da ikisi de olumsuzsa ekleme bağlacı ara.' },
  { word: 'Moreover', type: 'ekleme', level: 'kolay', tr: 'üstelik, bunun yanı sıra',
    islev: 'Furthermore ile aynı. Önceki fikri güçlendiren bir bilgi ekler.',
    ornek: 'Smoking damages the lungs; moreover, it increases the risk of heart disease.',
    ornekTr: 'Sigara akciğerlere zarar verir; üstelik kalp hastalığı riskini artırır.',
    tuzak: 'Moreover sadece ekler. İkinci cümle birinciyle çelişiyorsa ya da onun sonucuysa moreover yanlıştır.' },
  { word: 'In addition', type: 'ekleme', level: 'kolay', tr: 'buna ek olarak',
    islev: 'Tek başına cümle başında ekleme yapar. "In addition to + isim/V-ing" de olur.',
    ornek: 'In addition to teaching, she conducts research on child language.',
    ornekTr: 'Ders vermenin yanı sıra çocuk dili üzerine araştırma yapıyor.',
    tuzak: 'In addition to\'dan sonra fiil yalın gelmez, V-ing gelir: "in addition to teach" yanlış.' },
  { word: 'Besides', type: 'ekleme', level: 'orta', tr: 'ayrıca; -in yanı sıra',
    islev: 'Cümle başında "ayrıca", isimden önce "-in yanı sıra" anlamındadır.',
    ornek: 'Besides being expensive, the treatment takes a long time.',
    ornekTr: 'Pahalı olmasının yanı sıra tedavi uzun sürüyor.',
    tuzak: 'Beside (s olmadan) "yanında" demektir, yer bildirir. Tek harf farkı anlamı değiştirir.' },
  { word: 'Likewise', type: 'ekleme', level: 'orta', tr: 'benzer şekilde',
    islev: 'Önceki bilgiye benzeyen bir bilgi ekler.',
    ornek: 'Children need regular sleep. Likewise, adults perform better when well rested.',
    ornekTr: 'Çocukların düzenli uykuya ihtiyacı vardır. Benzer şekilde yetişkinler de iyi dinlenince daha iyi performans gösterir.',
    tuzak: 'Şıklarda in contrast ile yan yana çıkar. İki cümle benziyorsa likewise, farklıysa in contrast.' },

  // ---------------- Koşul ----------------
  { word: 'Unless', type: 'kosul', level: 'orta', tr: '-medikçe, -mezse',
    islev: '"If not" anlamındadır. Birinci tip koşulda: unless + present, ana cümle will.',
    ornek: 'Unless action is taken soon, many species will disappear.',
    ornekTr: 'Yakında önlem alınmazsa birçok tür yok olacak.',
    tuzak: 'Unless zaten olumsuzdur. Arkasından olumsuz fiil (unless ... not) gelirse anlam ters döner.' },
  { word: 'Provided that', type: 'kosul', level: 'orta', tr: 'şartıyla, -mesi koşuluyla',
    islev: 'Sadece belli bir şart gerçekleşirse olacağını söyler. "Providing that" ve "provided" da aynıdır.',
    ornek: 'You can borrow the book provided that you return it by Friday.',
    ornekTr: 'Cuma gününe kadar geri getirmen şartıyla kitabı ödünç alabilirsin.',
    tuzak: '"Provided" bir fiilin V3 hâli sanılıp elenir. Burada şart bağlacıdır, anlamı "if"tir.' },
  { word: 'As long as', type: 'kosul', level: 'kolay', tr: '-dığı sürece',
    islev: 'Şart bildirir: bir durum sürdükçe öteki de olur.',
    ornek: 'The plants will grow well as long as they get enough light.',
    ornekTr: 'Bitkiler yeterli ışık aldığı sürece iyi büyür.',
    tuzak: '"Kadar uzun" diye çevirip karşılaştırma sanma. Burada koşul bağlacıdır.' },
  { word: 'Otherwise', type: 'kosul', level: 'orta', tr: 'aksi takdirde, yoksa',
    islev: 'Önceki cümlede söylenen yapılmazsa ne olacağını söyler. Önceki cümlede genelde must / should / emir vardır.',
    ornek: 'Patients must follow the diet strictly; otherwise, the treatment may fail.',
    ornekTr: 'Hastalar diyete sıkı uymalı; aksi takdirde tedavi başarısız olabilir.',
    tuzak: 'However ile karıştırma. Otherwise "yapmazsan" demektir, zıtlık değil koşul bildirir.' },
  { word: 'In case', type: 'kosul', level: 'zor', tr: '-e karşı, ihtimaline karşı',
    islev: 'Olası bir duruma karşı önlem almayı anlatır. Arkasından cümle gelir.',
    ornek: 'Take an umbrella in case it rains this afternoon.',
    ornekTr: 'Öğleden sonra yağmur yağma ihtimaline karşı şemsiye al.',
    tuzak: 'If ile aynı değildir. In case önlem bildirir: yağsa da yağmasa da şemsiyeyi alırsın.' },

  // ---------------- Zaman ----------------
  { word: 'By the time', type: 'zaman', level: 'orta', tr: '-diği zamana kadar',
    islev: 'Geçmişte: by the time + past, ana cümle past perfect. Gelecekte: by the time + present, ana cümle future perfect.',
    ornek: 'By the time the doctors arrived, the patient had already recovered.',
    ornekTr: 'Doktorlar geldiğinde hasta çoktan iyileşmişti.',
    tuzak: 'Ana cümlede simple past seçme. Önce biten olay past perfect (had + V3) olur.' },
  { word: 'As soon as', type: 'zaman', level: 'kolay', tr: '-ir -mez',
    islev: 'Bir olaydan hemen sonra ötekinin olduğunu söyler.',
    ornek: 'As soon as the results are published, we will contact all participants.',
    ornekTr: 'Sonuçlar yayımlanır yayımlanmaz tüm katılımcılarla iletişime geçeceğiz.',
    tuzak: 'Gelecek anlamda bile as soon as\'tan sonra will gelmez: "as soon as the results will be" yanlış.' },
  { word: 'Until', type: 'zaman', level: 'kolay', tr: '-e kadar',
    islev: 'Bir durumun ne zamana kadar sürdüğünü söyler. "Not ... until" = ancak ... olunca.',
    ornek: 'The disease was not understood until the microscope was invented.',
    ornekTr: 'Hastalık ancak mikroskop icat edilince anlaşıldı.',
    tuzak: '"Not ... until" yapısını "-e kadar anlaşılmadı" diye bırakma. Asıl anlam: o zaman anlaşıldı.' },
  { word: 'Hardly ... when', type: 'zaman', level: 'zor', tr: '-ir -mez',
    islev: 'Hardly had + özne + V3 ... when + past. Bir olay biter bitmez öteki olur. Devrik yapıdır.',
    ornek: 'Hardly had the plane taken off when the engine failed.',
    ornekTr: 'Uçak kalkar kalkmaz motor arızalandı.',
    tuzak: 'Hardly burada "zar zor" ya da "neredeyse hiç" değil, "-ir -mez" demektir. No sooner ... than da aynı anlamdadır.' },

  // ---------------- Gizli olumsuz ----------------
  { word: 'Far from', type: 'olumsuz', level: 'orta', tr: 'hiç de ... değil',
    islev: 'Olumlu bir kelimenin önüne gelip anlamı olumsuz yapar.',
    ornek: 'The results of the trial were far from satisfactory.',
    ornekTr: 'Denemenin sonuçları hiç de tatmin edici değildi.',
    tuzak: 'Olumlu kelimeyi (satisfactory) görüp olumlu şıkkı seçme. Anlam olumsuz.' },
  { word: 'By no means', type: 'olumsuz', level: 'zor', tr: 'asla, hiçbir şekilde',
    islev: 'Güçlü bir olumsuzluk bildirir. Cümle başına gelirse devrik yapı ister.',
    ornek: 'The problem is by no means easy to solve.',
    ornekTr: 'Sorunu çözmek hiç de kolay değil.',
    tuzak: '"By all means" (elbette, tabii) ile karıştırma. İkisi tam ters anlamdadır.' },
  { word: 'Hardly', type: 'olumsuz', level: 'orta', tr: 'neredeyse hiç, pek ... değil',
    islev: 'Cümleyi olumsuz yapar, cümlede "not" yoktur ama anlam olumsuzdur.',
    ornek: 'There is hardly any evidence to support this claim.',
    ornekTr: 'Bu iddiayı destekleyen neredeyse hiç kanıt yok.',
    tuzak: '"Hard" (sıkı, zor) ile karıştırma. "Work hardly" yanlış; doğrusu "work hard".' }
];

if (typeof module !== 'undefined' && module.exports) module.exports = SINYAL_KARTLARI;
