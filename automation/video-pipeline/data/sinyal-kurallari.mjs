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
  "although": "\"Although\" bir BAĞLAÇ'tır — arkasından S+V (tam cümle) gelir, isim/V-ing gelmez.",
  "even though": "\"Even though\" bir BAĞLAÇ'tır (although ile eşdeğer, daha vurgulu) — arkasından S+V (tam cümle) gelir.",
  "whereas": "\"Whereas\" bir BAĞLAÇ'tır — iki cümleyi zıtlık ilişkisiyle bağlar, her iki tarafta da S+V bulunur.",
  "while": "\"While\" bağlam bağlı bir BAĞLAÇ'tır — hem zıtlık (\"oysa\") hem eşzamanlılık (\"iken\") anlamı verebilir; arkasından S+V gelir.",
  "yet": "\"Yet\" bir bağlaçtır — iki cümle/fikir arasında zıtlık kurar, \"ama/yine de\" anlamındadır.",

  // NEDEN-SONUÇ
  "because": "\"Because\" bir BAĞLAÇ'tır — arkasından S+V (tam cümle) gelir, sebep bildirir.",
  "since": "\"Since\" bağlam bağlı bir BAĞLAÇ'tır — hem sebep (\"çünkü\") hem zaman (\"-den beri\") anlamı verebilir; arkasından S+V gelir.",
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
};
