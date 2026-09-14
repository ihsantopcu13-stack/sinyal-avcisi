// ============================================================
// PAZARLAMA İÇERİK KUYRUĞU — 3 Instagram Story + 1 LinkedIn paylaşımı.
// scripts/publish-next-marketing-asset.mjs bu sırayla, günde bir öğe
// olacak şekilde yayınlar (bkz. marketing-assets-publish.yml, 09:00 TR).
//
// NOT: TikTok scripti (assets/tiktok-script-despite-although.txt) bu
// kuyrukta YOK — o bir prodüksiyon dokümanı (seslendirme + sahne
// yönergesi), gerçek bir video dosyası değil; Buffer/TikTok bunu
// yayınlayamaz. Video prodüksiyonu tamamlanıp assets/ altına gerçek
// bir .mp4 olarak eklendiğinde ayrı bir kuyruk maddesi olarak eklenmeli.
// ============================================================

export const MARKETING_QUEUE = [
  {
    id: "story-1",
    type: "instagram_story",
    file: "story-1.png",
    caption:
      "YDS seni kaç yıldır bekletiyor? 🎯\n\nStrateji değil, tek kuruş ödemeden başlayacağın bir yer eksikti. Sinyal Avcısı'nda kayıt bile istemeden, sonsuza kadar ücretsiz başla.\n\n👉 Bio'daki linkten şimdi başla.",
  },
  {
    id: "story-2",
    type: "instagram_story",
    file: "story-2.png",
    caption:
      "ÖSYM'nin kurduğu tuzağı 10 saniyede gör 🔍\n\n7 sinyal tipini öğren, gramer ezberi yerine cümledeki tuzağı okumayı öğren.\n\n👉 Bio'daki linkten ücretsiz başla.",
  },
  {
    id: "story-3",
    type: "instagram_story",
    file: "story-3.png",
    caption:
      "\"Bilgi, parasıyla satılacak bir şey değil.\" 💛\n\nBu yüzden Sinyal Avcısı'nda kayıt bile istemeden, tek kuruş ödemeden, sonsuza kadar öğrenebilirsin.\n\n👉 Bio'daki linkten keşfet.",
  },
  {
    id: "linkedin-docentlik",
    type: "linkedin_post",
    caption: `Doçentlik başvurusu, uluslararası yayın süreci ya da akademik teşvik başvurusu yapmış her araştırmacı bu tabloyu bilir: alanınızda yıllarca emek vermiş olmanız yetmiyor; YDS ya da YÖKDİL'den yeterli bir yabancı dil puanı da şart koşuluyor.

Sorun dil bilmemek değil çoğu zaman. Sorun zaman. Ders yükü, tez danışmanlığı, yayın takvimi arasında sınava hazırlanacak vakit bulmak — ve bunun için aylık ücret ödeyen özel kurs ya da bire bir ders almak, herkesin bütçesine uygun değil.

Bu ihtiyaçtan yola çıkarak geliştirdiğimiz Sinyal Avcısı, YDS ve YÖKDİL'e hazırlanan akademisyenler, hekimler, hukukçular ve araştırmacılar için tamamen ücretsiz bir hazırlık platformu:

→ Sınav sorularının büyük kısmı gramer bilgisini değil, cümledeki "sinyal"i (bağlaç, zıtlık, tuzak ifade) doğru okuyup okumadığınızı ölçüyor. Platform bu okuma becerisini sistemli şekilde öğretiyor.

→ İçerikler alanınıza göre özelleşiyor: Sosyal Bilimler, Fen, Sağlık ve Hukuk alanlarına özgü akademik kelime bankaları ve örnek metinler.

→ Yapay zeka destekli KLOD, çözemediğiniz bir soruyu veya cümle yapısını Türkçe olarak, adım adım açıklıyor.

→ Kayıt zorunluluğu yok, ücret yok, gizli abonelik yok. Kullanıcı verilerimize göre düzenli çalışanlar ortalama 3 ayda 15-25 puan artış gösteriyor.

Akademik kariyerinde YDS/YÖKDİL eşiğini beklemeden aşmak isteyen meslektaşlarım için paylaşıyorum. Sorularınızı yorumlarda yanıtlamaktan memnuniyet duyarım.

🔗 sinyal-avcisi.com

#YDS #YÖKDİL #Doçentlik #AkademikYükselme #Akademisyen #YükseköğretimdeYabancıDil #ÜcretsizEğitim`,
  },
];
