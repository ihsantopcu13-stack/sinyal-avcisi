// FAZ 2 — deepLinkUret() testleri. Ağ çağrısı yok, deterministik.

import { deepLinkUret } from "../scripts/_deeplink.mjs";

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

// ---- TEST 14a: YouTube metadata ----
{
  const url = deepLinkUret({ sinyal: "despite", platform: "youtube", medium: "shorts", contentId: "youtube_2026-09-16" });
  const p = new URL(url);
  kontrol(
    "14a) YouTube deep-link doğru üretiliyor",
    p.searchParams.get("utm_source") === "youtube" &&
      p.searchParams.get("utm_medium") === "shorts" &&
      p.searchParams.get("utm_campaign") === "despite" &&
      p.searchParams.get("signal") === "despite" &&
      p.searchParams.get("utm_content") === "youtube_2026-09-16",
    url
  );
}

// ---- TEST 14b: Instagram metadata (aynı fonksiyon) ----
{
  const url = deepLinkUret({ sinyal: "anything but", platform: "instagram", medium: "reel", contentId: "reel_06" });
  const p = new URL(url);
  kontrol(
    "14b) Instagram deep-link doğru üretiliyor (aynı fonksiyon)",
    p.searchParams.get("utm_source") === "instagram" &&
      p.searchParams.get("utm_medium") === "reel" &&
      p.searchParams.get("signal") === "anything but",
    url
  );
}

// ---- TEST 10c: boşluklu sinyal doğru encode ediliyor ----
{
  const url = deepLinkUret({ sinyal: "the number of", platform: "instagram", medium: "reel", contentId: "reel_09" });
  const encodedDogru = url.includes("signal=the+number+of") || url.includes("signal=the%20number%20of");
  const p = new URL(url);
  kontrol("10c) 'the number of' URL'de doğru encode + decode ediliyor", encodedDogru && p.searchParams.get("signal") === "the number of", url);
}

// ---- questionId/lessonId opsiyonel alanlar ----
{
  const url = deepLinkUret({ sinyal: "unless", platform: "youtube", medium: "shorts", contentId: "c1", questionId: 17, lessonId: "master-05" });
  const p = new URL(url);
  kontrol("ek) question_id/lesson_id doğru taşınıyor", p.searchParams.get("question_id") === "17" && p.searchParams.get("lesson_id") === "master-05", url);
}

// ---- sinyal yoksa crash etmiyor, temel URL döner ----
{
  let hataFirladi = false;
  let url;
  try {
    url = deepLinkUret({ platform: "instagram", medium: "reel", contentId: "reel_10" });
  } catch (e) {
    hataFirladi = true;
  }
  kontrol("15) sinyal olmadan da crash etmiyor", !hataFirladi && typeof url === "string", url);
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
