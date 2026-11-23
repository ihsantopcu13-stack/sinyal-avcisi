// Zamanlama ve kuyruk kuralları: tam saatte Buffer zamanlaması, aynı konu asla iki kez,
// kaçan gün sonrası kaldığı yerden devam, YouTube bekleyen listesi.
import {
  durumHazirla, planla, gununSlotlari, atamaSonucu, gelecekSlotlar, youtubeAcik, ilkYorumAcik,
  youtubeBekleyeneEkle, youtubeSiradakiler, youtubeTamamlandi, MAX_DENEME,
  kuyrukUyarisi, KALAN_UYARI_ESIGI, kapakliVideoAdi, paylasilacakVideo, turkceVideoAdi, asilVideo,
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
  // 25 Kasım 2026'dan itibaren günde 2: 10:00 ve 18:00; önceki günler eski 3 saatte kalır
  kontrol("24 Kas eski 3 saat", gununSlotlari("2026-11-24").join() === "08:30,13:00,17:30");
  kontrol("25 Kas yeni 2 saat", gununSlotlari("2026-11-25").join() === "10:00,18:00");
  const g = gelecekSlotlar(ist("2026-11-23 21:00"));
  kontrol("23 Kas 21:00: yarın (24 Kas) eski saatler", g.join() === "2026-11-24T08:30:00+03:00,2026-11-24T13:00:00+03:00,2026-11-24T17:30:00+03:00", g.join());
  const g2 = gelecekSlotlar(ist("2026-11-24 21:00"));
  kontrol("24 Kas 21:00: 25 Kas 10:00 ve 18:00", g2.join() === "2026-11-25T10:00:00+03:00,2026-11-25T18:00:00+03:00", g2.join());
  const g3 = gelecekSlotlar(ist("2026-11-25 09:50"));
  kontrol("25 Kas 09:50: 10:00 alınmaz (15 dk kuralı)", g3[0] === "2026-11-25T18:00:00+03:00" && g3.length === 3, g3.join());
  // Gerçek durum: 24 Kas'ın 3 saati dolu; 23 Kas 21:00 çalışması yeni konu eklemez
  const d = durumHazirla({ konular: { 1: { slot: "2026-11-24T08:30:00+03:00", instagram: { tamam: true }, facebook: { tamam: true } }, 2: { slot: "2026-11-24T13:00:00+03:00", instagram: { tamam: true }, facebook: { tamam: true } }, 3: { slot: "2026-11-24T17:30:00+03:00", instagram: { tamam: true }, facebook: { tamam: true } } } });
  kontrol("24 Kas çift dolmaz", planla(kuyruk, d, ist("2026-11-23 21:00")).length === 0, ozet(planla(kuyruk, d, ist("2026-11-23 21:00"))));
  const p2 = planla(kuyruk, d, ist("2026-11-24 21:00"));
  kontrol("24 Kas 21:00: 25 Kas'a 2 konu", ozet(p2) === "4@11-25T10:00 5@11-25T18:00", ozet(p2));
}

{
  // "3 saniyede çöz" (tur: cozum) 10:00'a, hazır kuyruk 18:00'e; aranan tür yoksa diğeri
  const k = { ogeler: [{ konu: 1 }, { konu: 2 }, { konu: 501, tur: "cozum" }, { konu: 3 }, { konu: 502, tur: "cozum" }] };
  const d = durumHazirla({});
  const p = planla(k, d, ist("2026-11-24 21:00"));
  kontrol("çözüm videosu 10:00'a, hazır kuyruk 18:00'e", ozet(p) === "501@11-25T10:00 1@11-25T18:00", ozet(p));
  isle(d, p);
  const p2 = planla(k, d, ist("2026-11-25 21:00"));
  kontrol("ertesi gün sıradaki çözüm 10:00'a", ozet(p2) === "502@11-26T10:00 2@11-26T18:00", ozet(p2));
  isle(d, p2);
  const p3 = planla(k, d, ist("2026-11-26 21:00"));
  kontrol("çözüm yoksa 10:00 hazır kuyruktan dolar", ozet(p3) === "3@11-27T10:00", ozet(p3));
  const k2 = { ogeler: [{ konu: 503, tur: "cozum" }, { konu: 504, tur: "cozum" }] };
  const p4 = planla(k2, durumHazirla({}), ist("2026-11-24 21:00"));
  kontrol("hazır kuyruk bitince 18:00 çözümle dolar", ozet(p4) === "503@11-25T10:00 504@11-25T18:00", ozet(p4));
  const p5 = planla(k, durumHazirla({}), ist("2026-11-23 21:00"));
  kontrol("eski saatlerde (10:00 yok) çözüm videosu bekler", !p5.some((x) => x.konu > 500), ozet(p5));
}

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

// ---- Kuyruk azaldı uyarısı (eşik 6 ≈ 2 günlük pay) ----
{
  kontrol("eşik 6", KALAN_UYARI_ESIGI === 6);
  const k10 = { ogeler: Array.from({ length: 10 }, (_, i) => ({ konu: i + 1 })) };
  const ata = (n) => durumHazirla({ konular: Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, { slot: `2026-10-${String(5 + i).padStart(2, "0")}T08:30:00+03:00` }])) });
  kontrol("hiç atama yok (10 kalan): uyarı yok", kuyrukUyarisi(k10, ata(0)) === null);
  kontrol("7 kalan: uyarı yok", kuyrukUyarisi(k10, ata(3)) === null);
  const u6 = kuyrukUyarisi(k10, ata(4));
  kontrol("6 kalan: uyarı", u6?.kalan.join() === "5,6,7,8,9,10" && u6.sonSlot === "2026-10-08T08:30:00+03:00", JSON.stringify(u6));
  const u0 = kuyrukUyarisi(k10, ata(10));
  kontrol("kuyruk bitti (0 kalan): uyarı sürer", u0?.kalan.length === 0 && u0.sonSlot === "2026-10-14T08:30:00+03:00", JSON.stringify(u0));
  const d = ata(5);
  delete d.konular[2].slot; // ikisi de başarısız → saati bırakıldı
  const ub = kuyrukUyarisi(k10, d);
  kontrol("saati bırakılan konu kalan sayılır", ub?.kalan.join() === "2,6,7,8,9,10", JSON.stringify(ub));
  const d5 = ata(5);
  d5.konular[99] = { slot: "2026-12-31T17:30:00+03:00" };
  const u5 = kuyrukUyarisi(k10, d5);
  kontrol("kuyrukta olmayan konu sayılmaz", u5?.kalan.join() === "6,7,8,9,10" && u5.sonSlot === "2026-10-09T08:30:00+03:00", JSON.stringify(u5));
  // Deneme modu: durum'a yazılmamış ama bu çalışmada atanacak konular atanmış sayılır
  const p = [{ konu: 4, slot: "2026-10-20T13:00:00+03:00" }];
  const ud = kuyrukUyarisi(k10, ata(3), p);
  kontrol("deneme: planlanan konu atanmış sayılır", ud?.kalan.join() === "5,6,7,8,9,10" && ud.sonSlot === "2026-10-20T13:00:00+03:00", JSON.stringify(ud));
}
{
  // Gerçek takvim: Konu 1–5 4 Eki 09:22'de, sonra her gün 21:00 çalışması
  const calistir = (kuyrukN, sonGun) => {
    const k = { ogeler: Array.from({ length: kuyrukN }, (_, i) => ({ konu: i + 1 })) };
    const d = durumHazirla({});
    isle(d, planla(k, d, ist("2026-10-04 09:22")));
    const kirmizi = [];
    for (let g = 4; g <= sonGun; g++) {
      const gun = `2026-10-${String(g).padStart(2, "0")}`;
      isle(d, planla(k, d, ist(`${gun} 21:00`)));
      const u = kuyrukUyarisi(k, d);
      if (u) kirmizi.push({ gun, ...u });
    }
    return { d, kirmizi };
  };
  const { d, kirmizi } = calistir(40, 18);
  kontrol("Konu 31 → 14 Eki 13:00", d.konular[31].slot === "2026-10-14T13:00:00+03:00", d.konular[31].slot);
  kontrol("Konu 40 → 17 Eki 13:00 (17:30 boş kalır)", d.konular[40].slot === "2026-10-17T13:00:00+03:00", d.konular[40].slot);
  const ilk = kirmizi[0];
  kontrol("40 konuyla ilk kırmızı: 14 Eki 21:00, kalan 36–40, son saat 15 Eki 17:30",
    ilk?.gun === "2026-10-14" && ilk.kalan.join() === "36,37,38,39,40" && ilk.sonSlot === "2026-10-15T17:30:00+03:00", JSON.stringify(ilk));
  kontrol("14 Eki'den sonra her çalışma kırmızı", kirmizi.map((x) => x.gun.slice(8)).join() === "14,15,16,17,18", kirmizi.map((x) => x.gun).join());
  // 41–77, 16 Eki 21:00 çalışmasından önce eklenirse: o çalışma 39, 40, 41'i atar, uyarı kalkar, boşluk olmaz
  const k77 = { ogeler: Array.from({ length: 77 }, (_, i) => ({ konu: i + 1 })) };
  const d2 = calistir(40, 15).d;
  isle(d2, planla(k77, d2, ist("2026-10-16 21:00")));
  kontrol("77 konuya çıkınca uyarı kalkar", kuyrukUyarisi(k77, d2) === null);
  kontrol("Konu 41 → 17 Eki 17:30 (boşluk yok)", d2.konular[41]?.slot === "2026-10-17T17:30:00+03:00", d2.konular[41]?.slot);
}

// ---- YouTube ----
{
  const d = durumHazirla({ youtube_bekleyen: [1, 2, 3, 4], konular: {} });
  youtubeBekleyeneEkle(d, 2);
  kontrol("aynı konu bekleyene iki kez eklenmez", d.youtube_bekleyen.join() === "1,2,3,4");
  kontrol("çalışma başına en fazla 3, eskiden yeniye", youtubeSiradakiler(d).join() === "1,2,3");
  d.konular[1] = { youtube: { tamam: true } }; youtubeTamamlandi(d, 1);
  kontrol("yüklenen konu bekleyenden çıkar", d.youtube_bekleyen.join() === "2,3,4");
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

// ---- Kapaklı video ----
{
  kontrol("kapaklı ad", kapakliVideoAdi("konu45.mp4") === "konu45-kapak.mp4");
  kontrol("kapaklı varsa o paylaşılır", paylasilacakVideo("konu45.mp4", { "konu45.mp4": {}, "konu45-kapak.mp4": {} }) === "konu45-kapak.mp4");
  kontrol("kapaklı yoksa asıl video", paylasilacakVideo("konu45.mp4", { "konu45.mp4": {} }) === "konu45.mp4");
  kontrol("Türkçe ad", turkceVideoAdi("konu58.mp4") === "konu58-tr.mp4" && turkceVideoAdi("konu101-nane.mp4") === "konu101-tr.mp4");
  kontrol("Türkçe+kapak önce", paylasilacakVideo("konu58.mp4", { "konu58.mp4": {}, "konu58-kapak.mp4": {}, "konu58-tr.mp4": {}, "konu58-tr-kapak.mp4": {} }) === "konu58-tr-kapak.mp4");
  kontrol("Türkçe kapaksızsa eski kapak", paylasilacakVideo("konu58.mp4", { "konu58.mp4": {}, "konu58-kapak.mp4": {}, "konu58-tr.mp4": {} }) === "konu58-kapak.mp4");
  kontrol("kapak yoksa Türkçe", paylasilacakVideo("konu101-nane.mp4", { "konu101-nane.mp4": {}, "konu101-tr.mp4": {} }) === "konu101-tr.mp4");
  kontrol("YouTube Türkçe varsa onu", asilVideo("konu56.mp4", { "konu56.mp4": {}, "konu56-tr.mp4": {} }) === "konu56-tr.mp4");
  kontrol("YouTube Türkçe yoksa asıl", asilVideo("konu56.mp4", { "konu56.mp4": {} }) === "konu56.mp4");
}

console.log(`${toplam - hata}/${toplam} kontrol geçti`);
if (hata) process.exit(1);
