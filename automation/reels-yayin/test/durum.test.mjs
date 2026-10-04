// Zamanlama ve kuyruk kuralları: tam saatte Buffer zamanlaması, aynı konu asla iki kez,
// kaçan gün sonrası kaldığı yerden devam, YouTube bekleyen listesi.
import {
  durumHazirla, planla, atamaSonucu, gelecekSlotlar, youtubeAcik, ilkYorumAcik,
  youtubeBekleyeneEkle, youtubeSiradakiler, youtubeTamamlandi, MAX_DENEME,
} from "../kuyruk-mantigi.mjs";

let toplam = 0, hata = 0;
const kontrol = (ad, ok, detay = "") => { toplam++; if (!ok) { hata++; console.log(`[FAIL] ${ad} ${detay}`); } };
const kuyruk = { ogeler: Array.from({ length: 10 }, (_, i) => ({ konu: i + 1 })) };
const ist = (s) => new Date(s.replace(" ", "T") + ":00+03:00"); // "2026-10-04 21:00" → İstanbul saati
const ozet = (plan) => plan.map((p) => `${p.konu}@${p.slot.slice(5, 16)}`).join(" ");
// Planı "Buffer'a başarıyla gönderildi" diye işler (yayinla()'nın yaptığı gibi)
const isle = (d, plan, basarisiz = {}) => {
  for (const p of plan) {
    const k = (d.konular[p.konu] ||= {});
    k.slot = p.slot;
    for (const pl of p.platformlar) {
      const kayit = (k[pl] ||= { deneme: 0 });
      kayit.deneme += 1;
      if (!(basarisiz[p.konu] || []).includes(pl)) kayit.tamam = true;
    }
    atamaSonucu(d, p.konu);
  }
};

{
  const s = gelecekSlotlar(ist("2026-10-04 21:00"));
  kontrol("21:00 çalışması yarının 3 saatini görür", s.join() === "2026-10-05T08:30:00+03:00,2026-10-05T13:00:00+03:00,2026-10-05T17:30:00+03:00", s.join());
  const s2 = gelecekSlotlar(ist("2026-10-04 12:50"));
  kontrol("13:00'e 15 dk'dan az kaldıysa 13:00 alınmaz", !s2.includes("2026-10-04T13:00:00+03:00") && s2[0] === "2026-10-04T17:30:00+03:00", s2.join());
}
{
  // Bugün 09:10'da merge + elle çalıştırma: bugünün 13:00 ve 17:30'u + yarın, Konu 1'den başlayarak
  const d = durumHazirla({});
  const plan = planla(kuyruk, d, ist("2026-10-04 09:10"));
  kontrol("bugün: 13:00 ve 17:30'dan başlar, Konu 1'den", ozet(plan) === "1@10-04T13:00 2@10-04T17:30 3@10-05T08:30 4@10-05T13:00 5@10-05T17:30", ozet(plan));
  kontrol("dueAt tam saat (UTC)", plan[0].dueAt === "2026-10-04T10:00:00.000Z", plan[0].dueAt);
  isle(d, plan);
  // Aynı gün tekrar çalışırsa (ya da 21:00 çalışması gelirse) hiçbir şey tekrar gönderilmez
  kontrol("aynı gün ikinci çalışma: plan boş (çift gönderim yok)", planla(kuyruk, d, ist("2026-10-04 21:00")).length === 0);
  // Ertesi gün 21:00: sadece 6 Ekim'in saatleri, Konu 6'dan
  const plan2 = planla(kuyruk, d, ist("2026-10-05 21:00"));
  kontrol("ertesi akşam: sıradaki konular, sonraki günün saatleri", ozet(plan2) === "6@10-06T08:30 7@10-06T13:00 8@10-06T17:30", ozet(plan2));
  const tum = [...plan, ...plan2].map((p) => p.konu);
  kontrol("hiçbir konu iki kez planlanmaz", new Set(tum).size === tum.length);
}
{
  // Çalışma kaçtı: 4 Ekim 21:00 çalışmadı, bir sonraki 5 Ekim 10:00'da geç başladı
  const d = durumHazirla({});
  isle(d, planla(kuyruk, d, ist("2026-10-03 21:00"))); // 4 Ekim'in 3 saati: Konu 1-3
  const plan = planla(kuyruk, d, ist("2026-10-05 10:00"));
  kontrol("kaçan günden sonra: geçmiş saatler doldurulmaz, Konu 4'ten devam", ozet(plan) === "4@10-05T13:00 5@10-05T17:30 6@10-06T08:30 7@10-06T13:00 8@10-06T17:30", ozet(plan));
}
{
  // Kısmi hata: Konu 1'de Instagram tamam, Facebook başarısız
  const d = durumHazirla({});
  isle(d, planla(kuyruk, d, ist("2026-10-04 21:00")), { 1: ["facebook"] });
  const plan = planla(kuyruk, d, ist("2026-10-04 22:00"));
  kontrol("eksik platform aynı saate yeniden denenir, yalnız Facebook", plan.length === 1 && plan[0].konu === 1 && plan[0].platformlar.join() === "facebook" && plan[0].slot === "2026-10-05T08:30:00+03:00", JSON.stringify(plan));
  // Saati geçtiyse en kısa sürede (rastgele bir saat değil, şimdi + 15 dk)
  const gec = planla(kuyruk, d, ist("2026-10-05 09:00"));
  kontrol("saati geçmiş eksik platform: şimdi + 15 dk", gec[0].konu === 1 && gec[0].dueAt === "2026-10-05T06:15:00.000Z", JSON.stringify(gec[0]));
  kontrol("eksik platform yeni konu gibi tekrar atanmaz", gec.filter((p) => p.konu === 1).length === 1);
  // MAX_DENEME'ye ulaşınca bırakılır
  d.konular[1].facebook.deneme = MAX_DENEME;
  kontrol("deneme sınırında platform bırakılır", !planla(kuyruk, d, ist("2026-10-05 09:00")).some((p) => p.konu === 1));
}
{
  // Hiçbir platform gönderilemezse saat bırakılır, konu sonraki ilk boş saate gider (atlanmaz, iki kez gitmez)
  const d = durumHazirla({});
  isle(d, planla(kuyruk, d, ist("2026-10-04 21:00")), { 1: ["instagram", "facebook"] });
  kontrol("ikisi de başarısız: saat bırakılır", !d.konular[1].slot);
  const plan = planla(kuyruk, d, ist("2026-10-05 09:00"));
  // 5 Ekim 13:00 ve 17:30 Konu 2 ve 3'te dolu → Konu 1 ilk boş saate (6 Ekim 08:30), sonra 4, 5
  kontrol("başarısız konu sonraki ilk boş saate gider", ozet(plan) === "1@10-06T08:30 4@10-06T13:00 5@10-06T17:30" && plan[0].yeni, ozet(plan));
}

// ---- YouTube ----
{
  const d = durumHazirla({ youtube_bekleyen: [1, 2, 3], konular: {} });
  youtubeBekleyeneEkle(d, 2);
  kontrol("aynı konu bekleyene iki kez eklenmez", d.youtube_bekleyen.join() === "1,2,3");
  kontrol("çalışma başına en fazla 2, eskiden yeniye", youtubeSiradakiler(d).join() === "1,2");
  d.konular[1] = { youtube: { tamam: true } }; youtubeTamamlandi(d, 1);
  kontrol("yüklenen konu bekleyenden çıkar", d.youtube_bekleyen.join() === "2,3");
  const d2 = durumHazirla({ konular: { 4: { youtube: { tamam: true } } } });
  youtubeBekleyeneEkle(d2, 4);
  kontrol("yüklenmiş konu bekleyene eklenmez", d2.youtube_bekleyen.length === 0);
  kontrol("REELS_YOUTUBE yoksa kapalı", youtubeAcik({}) === false);
  kontrol("REELS_YOUTUBE=kapali → kapalı", youtubeAcik({ REELS_YOUTUBE: "kapali" }) === false);
  kontrol("REELS_YOUTUBE=acik → açık", youtubeAcik({ REELS_YOUTUBE: "acik" }) === true);
}

// ---- Buffer ilk yorum (ücretli plan) ----
{
  kontrol("BUFFER_ILK_YORUM yoksa ilk yorum gönderilmez", ilkYorumAcik({}) === false);
  kontrol("BUFFER_ILK_YORUM=kapali → gönderilmez", ilkYorumAcik({ BUFFER_ILK_YORUM: "kapali" }) === false);
  kontrol("BUFFER_ILK_YORUM=acik → gönderilir", ilkYorumAcik({ BUFFER_ILK_YORUM: "acik" }) === true);
}

console.log(`${toplam - hata}/${toplam} kontrol geçti`);
if (hata) process.exit(1);
