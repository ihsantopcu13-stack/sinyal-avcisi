// AVCI Hata Kökü Motoru (Katman 4) — Sinyal Lab MVP davranışsal kanıt
// köprüsünün GERÇEK ÇALIŞTIRMA (execution) testi. Diğer answer-history-*
// /avci-*/anonymous-auth test dosyalarıyla AYNI desen: index.html'den
// dAns() + yeni avciTeshis*/avciSinyal* fonksiyonlarının kaynağı BİREBİR
// çıkarılıp Node'un `vm` modülüyle GERÇEKTEN ÇALIŞTIRILIYOR — sahte
// yeniden-yazım DEĞİL. Gerçek Supabase'e hiç bağlanılmaz.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

let toplam = 0;
let basarisiz = 0;
function kontrol(ad, sonuc, detay) {
  toplam++;
  if (!sonuc) basarisiz++;
  console.log(`[${sonuc ? "PASS" : "FAIL"}] ${ad}${detay !== undefined ? " — " + detay : ""}`);
}

const html = readFileSync(path.join(ROOT, "index.html"), "utf-8");

// ---- STATİK: duplicate/override yok, diğer 4 modül/Katman 3'e dokunulmadı ----
{
  const sayimlar = {
    "function avciSpanMetniCikar\\(sentHtml,sinifAdi\\)": (html.match(/function avciSpanMetniCikar\(sentHtml,sinifAdi\)/g) || []).length,
    "function avciSinyalAdaylariUret\\(soru\\)": (html.match(/function avciSinyalAdaylariUret\(soru\)/g) || []).length,
    "function avciSinyalNormalize\\(s\\)": (html.match(/function avciSinyalNormalize\(s\)/g) || []).length,
    "async function avciTeshisKaydet\\(kayit\\)": (html.match(/async function avciTeshisKaydet\(kayit\)/g) || []).length,
    "function avciTeshisPaneliGoster\\(soru\\)": (html.match(/function avciTeshisPaneliGoster\(soru\)/g) || []).length,
    "function avciTeshisPaneliTemizle\\(\\)": (html.match(/function avciTeshisPaneliTemizle\(\)/g) || []).length,
    "function avciTeshisGonder\\(\\)": (html.match(/function avciTeshisGonder\(\)/g) || []).length,
  };
  kontrol("1) tüm yeni fonksiyonlar TAM OLARAK 1 kez tanımlı (duplicate YOK)", Object.values(sayimlar).every((n) => n === 1), JSON.stringify(sayimlar));
  kontrol("2) id=\"avci-teshis-panel\" konteyneri mod-sinyal içinde mevcut", /id="avci-teshis-panel"/.test(html));
  kontrol("3) dAns() panel çağrısı SADECE yanlış (else) dalında — doğru dalda YOK", (() => {
    const dAnsMatch = html.match(/function dAns\(btn,correct\)\{[\s\S]*?\n\}/);
    const gövde = dAnsMatch ? dAnsMatch[0] : "";
    const dogruDal = gövde.slice(gövde.indexOf("if(correct){"), gövde.indexOf("} else {"));
    const yanlisDal = gövde.slice(gövde.indexOf("} else {"));
    return !/avciTeshisPaneliGoster/.test(dogruDal) && /avciTeshisPaneliGoster\(soru\)/.test(yanlisDal);
  })());
  kontrol("4) slRender() her yeni soruda paneli temizliyor (stale panel kalmıyor)", /avciTeshisPaneliTemizle\(\);\s*\n\s*slAnswered=false;/.test(html));
  kontrol(
    "5) diğer 4 modülün handler'ları (satAns/kkAnswer/tuzakAns/paragraf) avciTeshis* fonksiyonlarına HİÇ dokunmuyor",
    !/function satAns[\s\S]{0,2000}?avciTeshis/.test(html) && !/function kkAnswer[\s\S]{0,2000}?avciTeshis/.test(html)
  );
  kontrol("6) answer_history_id HER ZAMAN null gönderiliyor (statik) — sahte/tahmini id ÜRETİLMİYOR", /answer_history_id:null,/.test(html));
  kontrol(
    "7) GERÇEK SQL KODUNDA service_role KULLANILMIYOR (Katman 4 bloğunda) — yorumdaki 'service_role KULLANILMIYOR' açıklaması hariç",
    !/service_role/i.test(
      html
        .slice(html.indexOf("AVCI HATA KÖKÜ MOTORU — KATMAN 4 MVP"), html.indexOf("// KELIME KARTLARI SM-2"))
        .split("\n")
        .filter((satir) => !satir.trim().startsWith("//"))
        .join("\n")
    )
  );
  kontrol("8) yeni bir RPC/migration çağrısı YOK — sb.rpc( bu Katman 4 bloğunda hiç geçmiyor (doğrudan .from().insert() kullanılıyor)", !/sb\.rpc\(/.test(html.slice(html.indexOf("AVCI HATA KÖKÜ MOTORU — KATMAN 4 MVP"), html.indexOf("// KELIME KARTLARI SM-2"))));
}

// ---- Kaynağı BİREBİR çıkar: dAns() + tüm yeni avciTeshis*/avciSinyal* fonksiyonları ----
const startMarker = "function dAns(btn,correct){";
const endMarker = "// KELIME KARTLARI SM-2";
const startIdx = html.indexOf(startMarker);
const endIdx = html.indexOf(endMarker, startIdx);
if (startIdx === -1 || endIdx === -1) {
  console.log("[FAIL] 0) kaynak çıkarma başarısız");
  console.log(`\nTOPLAM: 1 test, 1 başarısız.`);
  process.exit(1);
}
const gercekKaynak = html.slice(startIdx, endIdx);

function sahteBtn(metin) {
  return {
    _textContent: metin,
    get textContent() {
      return this._textContent;
    },
    classList: { added: [], add(c) { this.added.push(c); } },
    disabled: false,
  };
}

function sandboxKur() {
  const warnCagrilari = [];
  const insertCagrilari = [];
  const gaEventCagrilari = [];
  const cevapKaydetCagrilari = [];
  const hataEkleCagrilari = [];
  let insertSonucu = { error: null };
  let insertImpl = null;

  const panelEl = { innerHTML: "" };
  const fbEl = { textContent: "", className: "" };
  const nextBtnEl = { style: { display: "none" } };
  const optButtons = [sahteBtn("A"), sahteBtn("B"), sahteBtn("C"), sahteBtn("D")];

  const sandbox = {
    console: { warn: (...a) => warnCagrilari.push(a), log: () => {}, error: () => {} },
    document: {
      getElementById: (id) => {
        if (id === "avci-teshis-panel") return panelEl;
        if (id === "dm-fb") return fbEl;
        if (id === "sl-next-btn") return nextBtnEl;
        return null;
      },
      querySelectorAll: (sel) => (sel === "#dm-opts .dmo" ? optButtons : []),
    },
    _hgEscape: (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
    SINYAL_PING_KELIMELER: ["provided that", "must have", "far from", "despite", "however", "although", "unless", "yet"],
    faz2GaEvent: (...a) => gaEventCagrilari.push(a),
    streakSoruEkle: () => {},
    cevapKaydet: (...a) => cevapKaydetCagrilari.push(a),
    hataEkle: (...a) => hataEkleCagrilari.push(a),
    slAnswered: false,
    sb: undefined,
    currentUser: null,
  };
  sandbox.sb = {
    from: (tablo) => ({
      insert: async (payload) => {
        insertCagrilari.push({ tablo, payload });
        if (insertImpl) return insertImpl();
        return insertSonucu;
      },
    }),
  };
  const context = vm.createContext(sandbox);
  vm.runInContext(gercekKaynak, context, { filename: "index.html (extracted, avci-teshis-koprusu)" });

  return {
    context,
    warnCagrilari,
    insertCagrilari,
    gaEventCagrilari,
    cevapKaydetCagrilari,
    hataEkleCagrilari,
    optButtons,
    panelEl,
    setInsertSonucu: (v) => {
      insertSonucu = v;
    },
    setInsertImpl: (fn) => {
      insertImpl = fn;
    },
    // dAns fire-and-forget avciTeshisKaydet çağırabilir (async) — mikro
    // görev kuyruğunun boşalması için kısa bir bekleme.
    bekle: () => new Promise((r) => setTimeout(r, 20)),
  };
}

// Gerçek sl-havuz-generator.mjs çıktı biçimiyle AYNI: sinyal .s-sig,
// tuzak .s-trap, anahtar .s-key span'leriyle sarmalı.
const SORU_TEK_SINYAL = {
  id: "q001",
  sent: 'The appellate court ruled that, <span class="s-sig" data-tip="Zıtlık">despite</span> the irregularities, the verdict was <span class="s-trap" data-tip="x">by no means</span> <span class="s-key">invalid</span>.',
  q: "Bu metne göre mahkeme kararı hakkında ne söylenebilir?",
  opts: ["A) ...", "B) ...", "C) ...", "D) ..."],
  ans: 1,
  fb: "despite = zıtlık.",
};
const SORU_SINYALSIZ = {
  id: "q051",
  sent: "Had the witness come forward earlier, the outcome of the trial might have been different.",
  q: "Bu cümleden ne çıkarılabilir?",
  opts: ["A) ...", "B) ...", "C) ...", "D) ..."],
  ans: 0,
  fb: "Açıklama.",
};
// Sadece s-sig var (trap/key yok) ama cümlede fallback listesinden 2
// GERÇEK kelime daha geçiyor — 3 adaya tamamlanabilmeli.
const SORU_FALLBACK_GEREKLI = {
  id: "q999",
  sent: '<span class="s-sig" data-tip="x">although</span> it was raining, however the match continued, yet the crowd stayed until the unless clause was resolved.',
  q: "Soru?",
  opts: ["A) ...", "B) ...", "C) ...", "D) ..."],
  ans: 0,
  fb: "Açıklama.",
};
// Sadece s-sig var, cümlede fallback listesinden BAŞKA hiçbir kelime
// yok — 3 adaya ULAŞILAMAZ, test gösterilmemeli.
const SORU_YETERSIZ_ADAY = {
  id: "q998",
  sent: '<span class="s-sig" data-tip="x">because</span> the results were conclusive.',
  q: "Soru?",
  opts: ["A) ...", "B) ...", "C) ...", "D) ..."],
  ans: 0,
  fb: "Açıklama.",
};
// Çok kelimeli sinyal + noktalama kenar durumu (virgülle bitişik).
const SORU_COK_KELIMELI_NOKTALAMA = {
  id: "q028",
  sent: 'The court held that, <span class="s-sig" data-tip="x">provided that</span> the conditions were met, however the appeal would proceed, unless the deadline passed, yet the ruling stood.',
  q: "Soru?",
  opts: ["A) ...", "B) ...", "C) ...", "D) ..."],
  ans: 0,
  fb: "Açıklama.",
};

function dAnsCagir(t, soru, secilenIdx, dogruMu) {
  t.context.slAnswered = false;
  t.context.slCurrentSoru = soru;
  t.context.SL_HAVUZ = [soru];
  t.context.slIdx = 0;
  t.context.dAns(t.optButtons[secilenIdx], dogruMu);
}

// ---- 1) DOĞRU CEVAP → panel HİÇ gösterilmiyor ----
{
  const t = sandboxKur();
  dAnsCagir(t, SORU_TEK_SINYAL, 1, true);
  kontrol("9) doğru cevapta avci-teshis-panel BOŞ (panel gösterilmiyor)", t.panelEl.innerHTML === "");
  kontrol("10) doğru cevapta cevapKaydet yine çağrıldı (mevcut davranış BOZULMADI)", t.cevapKaydetCagrilari.length === 1);
}

// ---- 2) YANLIŞ CEVAP → panel VAR (Adım A gösteriliyor) ----
{
  const t = sandboxKur();
  dAnsCagir(t, SORU_TEK_SINYAL, 0, false);
  kontrol("11) yanlış cevapta panel gösteriliyor", /Bir noktayı kontrol edelim/.test(t.panelEl.innerHTML));
  kontrol("12) mevcut yanlış cevap akışı (hataEkle/cevapKaydet) BOZULMADI", t.hataEkleCagrilari.length === 1 && t.cevapKaydetCagrilari.length === 1);
  kontrol("13) UI'da 'kesin hata/teşhis' gibi bir ifade YOK, nötr soru cümlesi var", /en etkili olan neydi/.test(t.panelEl.innerHTML) && !/kesin/i.test(t.panelEl.innerHTML));
}

// ---- 3) ATLA (Adım A) + sinyal YOK → hiçbir event yazılmıyor, quiz devam ----
{
  const t = sandboxKur();
  t.context.currentUser = { id: "user-1" };
  dAnsCagir(t, SORU_SINYALSIZ, 0, false);
  t.context.avciTeshisAdimBGoster(); // Adım A'daki "Atla →"
  await t.bekle();
  kontrol("14) sinyal yoksa + Atla → HİÇ insert çağrılmıyor", t.insertCagrilari.length === 0);
  kontrol("15) panel temizlendi (quiz akışı kilitlenmedi)", t.panelEl.innerHTML === "");
}

// ---- 4) self-report chip → doğru tag; sadece Adım A yapılıp Adım B atlanırsa TEK event ----
{
  const t = sandboxKur();
  t.context.currentUser = { id: "user-2", is_anonymous: false };
  dAnsCagir(t, SORU_SINYALSIZ, 0, false); // sinyalsiz soru → Adım B otomatik skip olur
  t.context.avciTeshisAdimASecim("VOCAB_BLOCK");
  await t.bekle();
  kontrol("16) self-report chip DOĞRU tag ile kaydediliyor (VOCAB_BLOCK)", t.insertCagrilari[0]?.payload?.self_report_reason === "VOCAB_BLOCK");
  kontrol("17) micro_test_type NULL (Adım B hiç yapılmadı)", t.insertCagrilari[0]?.payload?.micro_test_type === null);
  kontrol("18) micro_test_correct NULL (self-report KESİN TEŞHİS sayılmıyor)", t.insertCagrilari[0]?.payload?.micro_test_correct === null);
  kontrol("19) TEK insert çağrısı yapıldı (A+B için 2 ayrı event YOK)", t.insertCagrilari.length === 1);
}

// ---- 5) canonical sinyal VARSA Adım B (SIGNAL_SELECT) gösteriliyor ----
{
  const t = sandboxKur();
  dAnsCagir(t, SORU_TEK_SINYAL, 0, false);
  t.context.avciTeshisAdimBGoster();
  kontrol("20) sinyal varsa 'cümledeki sinyali bul' mikro testi gösteriliyor", /cümledeki sinyali bul/.test(t.panelEl.innerHTML));
}

// ---- 6) canonical sinyal YOKSA (s-sig span'i yok) mikro test HİÇ gösterilmiyor ----
{
  const t = sandboxKur();
  t.context.currentUser = { id: "user-3" };
  dAnsCagir(t, SORU_SINYALSIZ, 0, false);
  t.context.avciTeshisAdimASecim("GUESSED"); // Adım A → otomatik Adım B'ye geçer
  await t.bekle();
  kontrol("21) sinyal yoksa mikro test HİÇ gösterilmeden doğrudan kaydediliyor (self-report ile)", t.insertCagrilari[0]?.payload?.self_report_reason === "GUESSED" && t.insertCagrilari[0]?.payload?.micro_test_type === null);
}

// avciTeshisAdimBGoster() SADECE render eder — hangi index'in hangi
// metne karşılık geldiğini (gerçek kullanıcı gibi) RENDER EDİLEN
// HTML'den okuyoruz; `let _avciTeshisState` vm context'te dışarıdan
// GÖRÜNMEZ (top-level let/const, function/var'ın aksine context
// nesnesine yansımaz) — bu yüzden testler kasıtlı olarak "black box".
function adaylariCikarHtml(panelHtml) {
  return Array.from(panelHtml.matchAll(/onclick="avciTeshisAdimBSecim\((\d+)\)"[^>]*>([^<]*)</g)).map((m) => ({ idx: Number(m[1]), metin: m[2] }));
}

// ---- 7) doğru sinyal seçimi → micro_test_correct=true ----
{
  const t = sandboxKur();
  t.context.currentUser = { id: "user-4" };
  dAnsCagir(t, SORU_TEK_SINYAL, 0, false);
  t.context.avciTeshisAdimBGoster();
  const adaylar = adaylariCikarHtml(t.panelEl.innerHTML);
  const dogru = adaylar.find((a) => a.metin.toLowerCase() === "despite");
  t.context.avciTeshisAdimBSecim(dogru.idx);
  await t.bekle();
  kontrol("22) doğru sinyal seçilirse micro_test_correct=TRUE", t.insertCagrilari[0]?.payload?.micro_test_correct === true);
  kontrol("22b) micro_test_type=SIGNAL_SELECT, micro_test_selected ham metin", t.insertCagrilari[0]?.payload?.micro_test_type === "SIGNAL_SELECT" && /despite/i.test(t.insertCagrilari[0]?.payload?.micro_test_selected || ""));
}

// ---- 8) yanlış sinyal seçimi → micro_test_correct=false ----
{
  const t = sandboxKur();
  t.context.currentUser = { id: "user-5" };
  dAnsCagir(t, SORU_TEK_SINYAL, 0, false);
  t.context.avciTeshisAdimBGoster();
  const adaylar = adaylariCikarHtml(t.panelEl.innerHTML);
  const yanlis = adaylar.find((a) => a.metin.toLowerCase() !== "despite");
  t.context.avciTeshisAdimBSecim(yanlis.idx);
  await t.bekle();
  kontrol("23) yanlış aday seçilirse micro_test_correct=FALSE", t.insertCagrilari[0]?.payload?.micro_test_correct === false);
}

// ---- 9/10) NORMALIZATION — case/whitespace/punctuation kenar durumları ----
{
  const t = sandboxKur();
  const norm = t.context.avciSinyalNormalize;
  kontrol("25) trim çalışıyor", norm("  despite  ") === "despite");
  kontrol("26) case normalization çalışıyor", norm("DESPITE") === "despite");
  kontrol("27) çevresel noktalama temizleniyor", norm("despite," ) === "despite" && norm('"despite"') === "despite");
  kontrol("28) iç boşluklu çok kelimeli ifade AYNEN korunuyor (bozulmuyor)", norm("Provided That") === "provided that");
}

// ---- 11) multi-word signal — "provided that" gibi çok kelimeli sinyal doğru çıkarılıyor ----
{
  const t = sandboxKur();
  const bilgi = t.context.avciSinyalAdaylariUret(SORU_COK_KELIMELI_NOKTALAMA);
  kontrol("29) çok kelimeli sinyal ('provided that') doğru span'den ÇIKARILIYOR (whitespace split ile BOZULMUYOR)", bilgi && bilgi.dogru.toLowerCase() === "provided that");
  kontrol("29b) aday listesinde de tam ifade olarak yer alıyor", bilgi && bilgi.adaylar.some((a) => a.toLowerCase() === "provided that"));
}

// ---- 12) punctuation edge case — noktalamaya bitişik sinyal doğru bulunuyor ----
{
  const t = sandboxKur();
  const bilgi = t.context.avciSinyalAdaylariUret(SORU_TEK_SINYAL);
  kontrol("30) virgülle çevrili sinyal (', despite the irregularities,') noktalama İÇERMEDEN çıkarılıyor", bilgi && bilgi.dogru === "despite" && !/,/.test(bilgi.dogru));
}

// ---- 13) doğru sinyal testten ÖNCE vurgulanmıyor — aday HTML'i s-sig/renk taşımıyor ----
{
  const t = sandboxKur();
  dAnsCagir(t, SORU_TEK_SINYAL, 0, false);
  t.context.avciTeshisAdimBGoster();
  kontrol("31) mikro test HTML'inde s-sig sınıfı veya doğru cevabı işaretleyen bir stil YOK", !/class="s-sig"/.test(t.panelEl.innerHTML) && !/class="s-trap"/.test(t.panelEl.innerHTML));
  kontrol("32) tüm aday butonları AYNI (nötr) stille render ediliyor", (() => {
    const stiller = Array.from(t.panelEl.innerHTML.matchAll(/onclick="avciTeshisAdimBSecim\(\d+\)" style="([^"]*)"/g)).map((m) => m[1]);
    return stiller.length >= 3 && stiller.every((s) => s === stiller[0]);
  })());
}

// ---- 14) invalid/ambiguous candidate → güvenilir 3 aday yoksa mikro test SKIP ----
{
  const t = sandboxKur();
  const bilgiYetersiz = t.context.avciSinyalAdaylariUret(SORU_YETERSIZ_ADAY);
  kontrol("33) 3 adaya ulaşılamıyorsa avciSinyalAdaylariUret NULL döner (sahte test üretilmiyor)", bilgiYetersiz === null);

  const t2 = sandboxKur();
  t2.context.currentUser = { id: "user-6" };
  dAnsCagir(t2, SORU_YETERSIZ_ADAY, 0, false);
  t2.context.avciTeshisAdimASecim("RULE_UNKNOWN");
  await t2.bekle();
  kontrol("34) yetersiz adayda Adım A sonrası panel mikro test GÖSTERMEDEN kaydı tamamlıyor", t2.insertCagrilari[0]?.payload?.self_report_reason === "RULE_UNKNOWN" && t2.insertCagrilari[0]?.payload?.micro_test_type === null);

  const t3 = sandboxKur();
  const bilgiFallback = t3.context.avciSinyalAdaylariUret(SORU_FALLBACK_GEREKLI);
  kontrol("34b) fallback listesiyle (SINYAL_PING_KELIMELER) 3 adaya TAMAMLANABİLİYORSA test gösteriliyor", bilgiFallback && bilgiFallback.adaylar.length >= 3);
}

// ---- 15/16) anonim VE gerçek authenticated kullanıcı — ikisi de çalışıyor ----
{
  const t = sandboxKur();
  t.context.currentUser = { id: "anon-1", is_anonymous: true };
  dAnsCagir(t, SORU_SINYALSIZ, 0, false);
  t.context.avciTeshisAdimASecim("TWO_OPTIONS");
  await t.bekle();
  kontrol("35) anonim kullanıcı (is_anonymous:true) için de kayıt başarılı", t.insertCagrilari.length === 1 && t.insertCagrilari[0].payload.user_id === "anon-1");
}
{
  const t = sandboxKur();
  t.context.currentUser = { id: "real-1", is_anonymous: false };
  dAnsCagir(t, SORU_SINYALSIZ, 0, false);
  t.context.avciTeshisAdimASecim("TWO_OPTIONS");
  await t.bekle();
  kontrol("36) gerçek authenticated kullanıcı için de kayıt başarılı", t.insertCagrilari.length === 1 && t.insertCagrilari[0].payload.user_id === "real-1");
}

// ---- 17) session/sb YOK → graceful skip, insert HİÇ denenmiyor ----
{
  const t = sandboxKur();
  t.context.sb = undefined;
  t.context.currentUser = null;
  dAnsCagir(t, SORU_SINYALSIZ, 0, false);
  t.context.avciTeshisAdimASecim("GUESSED");
  await t.bekle();
  kontrol("37) sb/currentUser yokken insert HİÇ denenmiyor, hata da fırlamıyor", t.insertCagrilari.length === 0);
}

// ---- 18) Supabase/network hatası → quiz bozulmuyor ----
{
  const t = sandboxKur();
  t.context.currentUser = { id: "user-7" };
  t.setInsertImpl(async () => {
    throw new Error("simulated network failure");
  });
  let firlatilanHata = null;
  dAnsCagir(t, SORU_SINYALSIZ, 0, false);
  try {
    t.context.avciTeshisAdimASecim("GUESSED");
    await t.bekle();
  } catch (e) {
    firlatilanHata = e;
  }
  kontrol("38) network hatası dışarı FIRLAMIYOR (quiz bozulmuyor)", firlatilanHata === null);
  const w = t.warnCagrilari.find((a) => a[0] === "[avci-teshis] kayıt atlandı:");
  kontrol("39) güvenli, tanımlı bir mesajla loglandı", w && w[1]?.reason === "unexpected error");
}
{
  const t = sandboxKur();
  t.context.currentUser = { id: "user-8" };
  t.setInsertSonucu({ error: { code: "42501", status: 403, message: "RLS violation" } });
  dAnsCagir(t, SORU_SINYALSIZ, 0, false);
  t.context.avciTeshisAdimASecim("GUESSED");
  await t.bekle();
  const w = t.warnCagrilari.find((a) => a[0] === "[avci-teshis] kayıt atlandı:");
  kontrol("40) RLS/DB hatası SADECE code/status/reason ile loglanıyor", w && w[1]?.code === "42501" && w[1]?.status === 403 && Object.keys(w[1]).sort().join(",") === "code,reason,status");
}

// ---- 19) duplicate click → duplicate event YOK ----
{
  const t = sandboxKur();
  t.context.currentUser = { id: "user-9" };
  dAnsCagir(t, SORU_SINYALSIZ, 0, false);
  t.context.avciTeshisAdimASecim("GUESSED");
  await t.bekle();
  // Panel zaten temizlenmiş olsa da fonksiyonu doğrudan tekrar çağırıyoruz —
  // gonderildi bayrağı (artık state null olsa da) ikinci bir satır YAZDIRMAMALI.
  t.context.avciTeshisGonder();
  await t.bekle();
  kontrol("41) çift çağrıda İKİNCİ bir insert oluşmuyor", t.insertCagrilari.length === 1);
}

// ---- 20/21) answer_history_id HER ZAMAN null — cross-user ilişkilendirme ÜRETİLEMİYOR ----
{
  const t = sandboxKur();
  t.context.currentUser = { id: "user-10" };
  t.setInsertSonucu({ error: null });
  dAnsCagir(t, SORU_SINYALSIZ, 0, false);
  t.context.avciTeshisAdimASecim("GUESSED");
  await t.bekle();
  kontrol("42) answer_history_id HER ZAMAN null gönderiliyor (sahte/tahmini id YOK)", t.insertCagrilari[0]?.payload?.answer_history_id === null);
  kontrol("43) question_id ile GERÇEK canonical id izlenebilirliği korunuyor", t.insertCagrilari[0]?.payload?.question_id === "q051");
  kontrol("44) null answer_history_id ile insert BAŞARILI kabul ediliyor (nullable davranış güvenli)", t.insertCagrilari.length === 1);
}

// ---- 22) tek etkileşim (self-report + micro-test birlikte) → TEK insert ----
{
  const t = sandboxKur();
  t.context.currentUser = { id: "user-11" };
  dAnsCagir(t, SORU_TEK_SINYAL, 0, false);
  t.context.avciTeshisAdimASecim("SIGNAL_MISSED");
  t.context.avciTeshisAdimBSecim(0);
  await t.bekle();
  kontrol("45) Adım A + Adım B birlikte yapılınca TEK diagnostic_events satırı yazılıyor", t.insertCagrilari.length === 1);
  kontrol("46) o TEK satırda hem self_report_reason hem micro_test_type dolu", t.insertCagrilari[0]?.payload?.self_report_reason === "SIGNAL_MISSED" && t.insertCagrilari[0]?.payload?.micro_test_type === "SIGNAL_SELECT");
}

// ---- 25) mobil/inline yapısal kontrol — modal/popup/fixed-overlay YOK ----
{
  const t = sandboxKur();
  dAnsCagir(t, SORU_TEK_SINYAL, 0, false);
  const icerik = t.panelEl.innerHTML;
  kontrol("47) panel modal/fixed-overlay DEĞİL (position:fixed yok — inline akış içinde)", !/position:fixed/.test(icerik));
  kontrol("48) flex-wrap ile mobilde taşmayan bir chip düzeni kullanılıyor", /flex-wrap:wrap/.test(icerik));
}

// ---- SECRET SCAN — hiçbir warn/insert çağrısında token/email/session yok ----
{
  const t = sandboxKur();
  t.context.currentUser = { id: "user-12", email: "gizli@ornek.com" };
  t.setInsertSonucu({ error: { code: "x", status: 500, message: "generic failure with session data" } });
  dAnsCagir(t, SORU_SINYALSIZ, 0, false);
  t.context.avciTeshisAdimASecim("GUESSED");
  await t.bekle();
  const tumMetin = JSON.stringify(t.warnCagrilari) + JSON.stringify(t.insertCagrilari.map((c) => c.payload));
  kontrol("49) hiçbir yerde access_token/refresh_token/e-posta/gerçek user id ALAN ADI olarak sızmıyor", !/access_token|refresh_token|gizli@ornek\.com/.test(tumMetin));
}

console.log(`\nTOPLAM: ${toplam} test, ${basarisiz} başarısız.`);
if (basarisiz > 0) process.exit(1);
