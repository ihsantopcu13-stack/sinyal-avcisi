// SOURCE OF TRUTH — AŞAMA 3: canonical -> frontend generated mirror.
//
// Bu modül SAF (side-effect'siz) bir fonksiyon olarak canonical
// api/data/sorular.json kayıtlarını, index.html'in SL_HAVUZ dizisinin
// beklediği eski nesne şekline (eye/sent/q/opts/ans/fb) + yeni stable
// id/sinyal alanlarına çevirir. Hem CLI script'i (scripts/generate-sl-havuz.mjs,
// index.html'i günceller) hem de tests/sot-mirror.test.mjs (üretimin
// canonical'la güncel/tutarlı kaldığını doğrular) bu modülü kullanır —
// mantık tek yerde, iki farklı kopyası yok.
//
// sinyal/tuzak/anahtar metinleri soru_en içinde büyük/küçük harf
// duyarsız aranır, ilk eşleşme bulunduğu ORİJİNAL harf biçimiyle
// <span class="s-sig|s-trap|s-key" data-tip="...">...</span> ile
// sarmalanır. Üç span çakışırsa (aynı metin aralığını paylaşırsa) hata
// fırlatılır — bu veri kalitesi sorunudur, sessizce yutulmaz.

function findSpan(text, needle) {
  if (!needle) return null;
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) return null;
  return { start: idx, end: idx + needle.length, text: text.slice(idx, idx + needle.length) };
}

export function buildSentHtml(soru) {
  const { soru_en, sinyal, sinyal_ipucu, tuzak, tuzak_ipucu, anahtar } = soru;
  const spans = [];
  const sinyalSpan = findSpan(soru_en, sinyal);
  if (sinyalSpan) spans.push({ ...sinyalSpan, cls: "s-sig", tip: sinyal_ipucu });
  const tuzakSpan = findSpan(soru_en, tuzak);
  if (tuzakSpan) spans.push({ ...tuzakSpan, cls: "s-trap", tip: tuzak_ipucu });
  const anahtarSpan = findSpan(soru_en, anahtar);
  if (anahtarSpan) spans.push({ ...anahtarSpan, cls: "s-key", tip: null });

  spans.sort((a, b) => a.start - b.start);
  for (let i = 1; i < spans.length; i++) {
    if (spans[i].start < spans[i - 1].end) {
      throw new Error(`sl-havuz-generator: span çakışması ${soru.id} — ${JSON.stringify(spans[i - 1])} vs ${JSON.stringify(spans[i])}`);
    }
  }

  let out = "";
  let cursor = 0;
  for (const s of spans) {
    out += soru_en.slice(cursor, s.start);
    const tipAttr = s.tip ? ` data-tip="${s.tip}"` : "";
    out += `<span class="${s.cls}"${tipAttr}>${s.text}</span>`;
    cursor = s.end;
  }
  out += soru_en.slice(cursor);
  return soru.alinti ? `"${out}"` : out;
}

// Canonical soru dizisinden index.html'in beklediği frontend nesnesini üretir.
export function canonicalToFrontendEntry(soru) {
  return {
    id: soru.id,
    sinyal: soru.sinyal,
    eye: soru.kategori,
    sent: buildSentHtml(soru),
    q: soru.soru_tr,
    opts: soru.secenekler_tr,
    ans: soru.dogru_index,
    fb: soru.aciklama_tr,
  };
}

export function buildSlHavuz(canonicalSorular) {
  return canonicalSorular.map(canonicalToFrontendEntry);
}

// Bir frontend nesnesini index.html'e yazılacak tek satırlık JS obje
// literaline çevirir. JSON.stringify her zaman geçerli bir JS literali
// üretir (JSON, JS'in bir alt kümesidir) — tek tırnak/çift tırnak veya
// virgülden sonra boşluk gibi eski, tutarsız stil kararlarını taklit
// etmeye çalışmıyoruz (kullanıcıya görünen render çıktısını etkilemez).
export function frontendEntryToLine(entry) {
  const parcalar = [
    `id:${JSON.stringify(entry.id)}`,
    `sinyal:${JSON.stringify(entry.sinyal)}`,
    `eye:${JSON.stringify(entry.eye)}`,
    `sent:${JSON.stringify(entry.sent)}`,
    `q:${JSON.stringify(entry.q)}`,
    `opts:${JSON.stringify(entry.opts)}`,
    `ans:${entry.ans}`,
    `fb:${JSON.stringify(entry.fb)}`,
  ];
  return `  {${parcalar.join(",")}},`;
}

export function buildSlHavuzSource(canonicalSorular) {
  const satirlar = buildSlHavuz(canonicalSorular).map(frontendEntryToLine);
  return `const SL_HAVUZ=[\n${satirlar.join("\n")}\n];`;
}
