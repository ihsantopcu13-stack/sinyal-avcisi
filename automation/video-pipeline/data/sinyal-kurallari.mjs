// ============================================================
// SİNYAL KURALLARI — AVCI öğretim katmanı için önceden ONAYLI,
// sabit gramer kuralları whitelist'i.
// ============================================================
// Bu tablo api/klod.mjs'deki (production, öğrenci-facing) SİNYAL KELİME
// RADARI ile aynı YDS/YÖKDİL kategorilerine dayanır, ama o dosyaya hiç
// dokunulmadan burada bağımsız ve yeniden yazılmış olarak tutulur —
// iki sistem birbirinden kod olarak ayrık kalır.
//
// GÜVENLİK: automation/video-pipeline/scripts/avci-ogretim-katmani.mjs
// bu tabloda OLMAYAN bir "sinyal" için AI çağrısı YAPMAZ, direkt
// needs_review döner. Yani AI sadece burada insan tarafından önceden
// onaylanmış, tartışmasız kurallar için devreye giriyor — kendi gramer
// kuralı icat etme ihtimali yapısal olarak kapatılıyor. Yeni bir sinyal
// kelimesini otomasyona dahil etmek isterseniz, buraya elle bir satır
// eklemeniz gerekir (bilinçli bir insan onayı adımı).
//
// Anahtarlar küçük harfe çevrilip aranır (bkz. avci-ogretim-katmani.mjs
// içindeki normalizeSinyal) — sorular.json'da "Despite" / "despite" gibi
// büyük/küçük harf farkları olabiliyor.

export const SINYAL_KURALLARI = {
  // ZIT (kontrast) — despite/notwithstanding/contrary to grubu EDAT'tır,
  // arkasından isim/V-ing gelir (S+V gelmez); although/though/even
  // though/whereas grubu BAĞLAÇ'tır, arkasından S+V (tam cümle) gelir.
  "despite": "\"Despite\" bir EDAT'tır — arkasından isim veya V-ing gelir, asla S+V (tam cümle) gelmez.",
  "notwithstanding": "\"Notwithstanding\" bir EDAT'tır (despite ile eşdeğer) — arkasından isim/V-ing gelir, S+V gelmez.",
  "contrary to": "\"Contrary to\" bir EDAT ifadesidir — arkasından isim/V-ing gelir, zıtlık anlamı taşır.",
  "contrary to popular belief": "\"Contrary to popular belief\" sabit bir zarf ifadesidir — yaygın inanışın aksine anlamındadır, cümlenin geri kalanı bu inanışla ZIT bir bilgi verir.",
  "on the contrary": "\"On the contrary\" bir zarf/bağlayıcıdır — önceki cümledeki fikri tam tersine çevirir, genelde noktalama (. veya ;) ile ayrılır.",
  "nonetheless": "\"Nonetheless\" bir bağlayıcı ZARF'tır — \"buna rağmen/yine de\" anlamı verir; although gibi bağlaç veya despite gibi edat değildir.",
  "anything but": "\"Anything but X\" idiomatik bir GİZLİ OLUMSUZLUKTUR — \"X hiç değil/X'ten çok uzak\" anlamına gelir; kelimesi kelimesine çevrilmez.",
  "although": "\"Although\" bir BAĞLAÇ'tır — arkasından S+V (tam cümle) gelir, isim/V-ing gelmez.",
  "even though": "\"Even though\" bir BAĞLAÇ'tır (although ile eşdeğer, daha vurgulu) — arkasından S+V (tam cümle) gelir.",
  "whereas": "\"Whereas\" bir BAĞLAÇ'tır — iki cümleyi zıtlık ilişkisiyle bağlar, her iki tarafta da S+V bulunur.",
  "while": "\"While\" BAĞLAÇ'tır, arkasından S+V gelir. İki taraf karşıt bilgi veriyorsa ZITLIK (\"oysa\"), aynı anda oluyorsa EŞZAMANLILIK (\"-iken\") anlamındadır.",
  "yet": "\"Yet\" iki bağımsız cümleyi bağlarsa \"ama/fakat\" zıtlığı verir. \"Henüz\" anlamındaki zarf kullanımıyla (\"has yet to\") karıştırma.",

  // NEDEN-SONUÇ
  "because": "\"Because\" bir BAĞLAÇ'tır — arkasından S+V (tam cümle) gelir, sebep bildirir.",
  "since": "\"Since\" isim alırsa EDAT'tır (zaman: \"-den beri\"), S+V alırsa BAĞLAÇ'tır (zaman \"-den beri\" veya sebep \"çünkü/mademki\"). Cümlenin bütününe bak.",
  "consequently": "\"Consequently\" bir zarf/bağlayıcıdır — önceki cümlenin SONUCUNU bildirir, genelde yeni bir cümle başında kullanılır.",
  "as a result": "\"As a result\" bir zarf ifadesidir — önceki cümlenin sonucunu bildirir.",
  "as a consequence of": "\"As a consequence of\" bir EDAT ifadesidir — arkasından isim/V-ing gelir, sonuç-sebep ilişkisi kurar.",
  "therefore": "\"Therefore\" bir zarf/bağlayıcıdır — önceki cümlenin mantıksal sonucunu bildirir.",
  "thus": "\"Thus\" bir zarf/bağlayıcıdır — \"bu şekilde/böylece\" anlamıyla sonuç bildirir.",

  // MODAL PERFECT
  "must have": "\"Must have + V3\" geçmişe yönelik GÜÇLÜ bir çıkarım/kesinlik ifade eder (\"...mış olmalı\").",
  "should have": "\"Should have + V3\" geçmişte yapılması gerekip yapılmamış bir eylemi ifade eder (\"...malıydı ama yapmadı\").",
  "could have": "\"Could have + V3\" geçmişte mümkün olup gerçekleşmemiş bir eylemi ifade eder (\"...abilirdi\").",
  "might have": "\"Might have + V3\" geçmişe yönelik ZAYIF bir olasılık ifade eder (\"...mış olabilir\").",

  // ZAMAN SIRASI
  "after": "\"After\" isim/V-ing alırsa EDAT, S+V alırsa BAĞLAÇ olarak kullanılabilir; iki kullanımda da zaman sırası bildirir.",
  "by the time": "\"By the time\" bir BAĞLAÇ'tır — arkasından S+V gelir, bir eylemin başka bir zamana kadar/o zamana dek tamamlandığını bildirir.",
  "prior to": "\"Prior to\" bir EDAT'tır — arkasından isim/V-ing gelir, \"-den önce\" anlamındadır.",
  "once": "\"Once\" zaman bağlacı olarak kullanıldığında arkasından S+V gelir, \"bir kere ... olunca\" anlamındadır.",
  "no sooner had": "\"No sooner had + S + V3\" devrik yapılı bir zaman ifadesidir — \"... olur olmaz\" anlamındadır, arkasında \"than\" ile ikinci cümle gelir.",

  // KOŞUL
  "unless": "\"Unless\" olumsuz bir koşul bağlacıdır — \"eğer ... olmazsa\" anlamındadır, arkasından olumlu bir S+V gelir.",
  "provided that": "\"Provided that\" bir koşul bağlacıdır (\"if\" ile eşdeğer) — arkasından S+V gelir, \"... şartıyla/koşuluyla\" anlamındadır.",
  "on condition that": "\"On condition that\" bir koşul bağlacıdır (provided that ile eşdeğer) — arkasından S+V gelir.",
  "as long as": "\"As long as\" bir koşul bağlacıdır — \"... olduğu sürece\" anlamındadır, arkasından S+V gelir.",

  // DİĞER
  "rather than": "\"Rather than\" bir karşılaştırma ifadesidir — arkasından genelde isim/V-ing gelir, bir tercih/karşıtlık bildirir.",
  "not only": "\"Not only\" cümle başında kullanıldığında DEVRİK yapı gerektirir (yardımcı fiil öne gelir) ve genelde \"but also\" ile tamamlanır.",
  "so as to": "\"So as to\" bir amaç ifadesidir (\"in order to\" ile eşdeğer) — arkasından fiilin yalın hali (V1) gelir.",
  "nor": "\"Nor\" önceki olumsuz ifadeye devam ettiğinde devrik yapı kullanır: yardımcı fiil + özne + fiil (\"nor did it reach\" gibi).",

  // 2026-09-23 — q060-q083 genişlemesiyle gelen sinyaller (site sahibi onayladı)
  // GİZLİ OLUMSUZ / DEVRİK
  "hardly": "\"Hardly\" GİZLİ bir OLUMSUZLUKTUR — \"neredeyse hiç\" anlamı verir; cümlede \"not\" olmasa da anlam olumsuzdur. Cümle başında \"Hardly had + S + V3 ... when\" devrik yapısıyla \"... olur olmaz\" anlamına gelir (than DEĞİL, when kullanılır).",
  "by no means": "\"By no means\" \"kesinlikle ... değil\" anlamında GÜÇLÜ bir OLUMSUZLUKTUR — cümleye ikinci bir \"not\" eklenmez. Cümle başına gelirse DEVRİK yapı gerektirir (\"By no means should/did + S + V\").",
  "far from": "\"Far from\" \"... olmaktan çok uzak / hiç de ... değil\" anlamında GİZLİ bir OLUMSUZLUKTUR — arkasından isim, sıfat veya V-ing gelir, S+V gelmez (\"far from being a burden\").",
  "had": "Cümle başındaki \"Had + S + V3\" \"if\" düşürülmüş DEVRİK 3. tip koşuldur (\"If S had V3\" ile eşdeğer) — geçmişte GERÇEKLEŞMEMİŞ bir durumu anlatır; sonuç tarafında would/could/might have + V3 gelir.",

  // AMAÇ / TERCİH
  "so that": "\"So that\" bir AMAÇ bağlacıdır (\"... sın diye\") — arkasından S+V gelir, genelde can/could/will/would gibi bir modal içerir. Derece-sonuç bildiren \"so + sıfat + that\" yapısıyla karıştırma.",
  "in order to": "\"In order to\" bir AMAÇ ifadesidir — arkasından fiilin yalın hali (V1) gelir, V-ing gelmez (\"in order to make\" doğru, \"in order to making\" YANLIŞ).",
  "instead of": "\"Instead of\" bir EDAT ifadesidir (\"... yerine\") — arkasından isim veya V-ing gelir, fiilin yalın hali gelmez (\"instead of expanding\").",

  // DİĞER BAĞLAÇLAR
  "either": "\"Either ... or\" \"ya ... ya da\" anlamlı ikili bağlaçtır — iki seçenekten biri. Fiil, \"or\"dan sonraki (fiile YAKIN olan) özneye göre çekimlenir (proximity rule).",
  "as far as": "\"As far as X is concerned\" sabit bir ifadedir — \"X açısından / X'e göre\" anlamında bakış açısını SINIRLAR; koşul bildiren \"as long as\" ile karıştırma.",
};
