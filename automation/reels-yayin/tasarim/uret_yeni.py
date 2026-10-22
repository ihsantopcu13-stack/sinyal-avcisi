#!/usr/bin/env python3
"""Yeni konuların (yeni-konular.json) Reels videolarını ve kuyruk kayıtlarını üretir.

Tasarım: koyu yeşil zemin, nane yeşili vurgu (sarı yok). Akış:
  0-3 sn  kanca + boşluklu cümle + 3-2-1 sayacı   (ses: kanca)
  sonra   cevap nane yeşiliyle dolar + kural hapı (ses: doğru cevap + kural)
  sonra   TUZAK hapı + açıklama                   (ses: tuzak)
  son     TAKİP ET kartı                           (ses: kapanış)
Ses OpenAI TTS (OPENAI_API_KEY) ile üretilir, sonunda -14 LUFS'a çekilir.

Kullanım:
  uret_yeni.py --kuyruk                 kuyruk.json'a eksik kayıtları ekler (ağ yok)
  uret_yeni.py --video 68 [--cikti D]   tek konunun videosunu üretir
  uret_yeni.py --hepsi --yukle          Release'te olmayan videoları üretir ve yükler (üzerine yazmaz)
"""
import json, os, subprocess, sys, tempfile, urllib.request
from PIL import Image, ImageDraw, ImageFont

KOK = os.path.dirname(os.path.abspath(__file__))
VERI = os.path.join(KOK, "yeni-konular.json")
KUYRUK = os.path.join(KOK, "..", "data", "kuyruk.json")
ETIKET = "reels-medya-v1"

W, H = 1080, 1920
ZEMIN = (4, 36, 26)
KART = (10, 58, 43)
KANCA_BANT = (16, 80, 60)
NANE = (92, 255, 194)
BEYAZ = (255, 255, 255)
GRI = (170, 210, 195)
KOYU = (2, 22, 16)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SES = os.environ.get("OPENAI_TTS_VOICE", "onyx")
SON_KART = 2.85


def f(n):
    return ImageFont.truetype(FONT, n)


def tr_upper(s):
    return s.replace("i", "İ").replace("ı", "I").upper()


def baslik_metni(k):
    # Türkçe harf içeren başlık Türkçe kuralla büyür (i → İ); İngilizce başlık düz (TRANSLATION)
    b = tr_upper(k["baslik"]) if any(c in "çğıöşüÇĞİÖŞÜ" for c in k["baslik"]) else k["baslik"].upper()
    return b + " TUZAĞI" if k["tuzak"] else b


# ---------------- çizim ----------------

def sar(parcalar, font, genislik):
    """parcalar: [(kelime, renk)] -> satırlar [[(kelime, renk)]]"""
    satirlar, satir, w = [], [], 0
    bosluk = font.getlength(" ")
    for kel, renk in parcalar:
        kw = font.getlength(kel)
        if satir and w + bosluk + kw > genislik:
            satirlar.append(satir); satir, w = [], 0
        w += (bosluk if satir else 0) + kw
        satir.append((kel, renk))
    if satir: satirlar.append(satir)
    return satirlar


def satir_ciz(d, satirlar, font, y, ara):
    bosluk = font.getlength(" ")
    for s in satirlar:
        w = sum(font.getlength(k) for k, _ in s) + bosluk * (len(s) - 1)
        x = (W - w) / 2
        for k, renk in s:
            d.text((x, y), k, font=font, fill=renk)
            x += font.getlength(k) + bosluk
        y += ara
    return y


def sigdir(parcalar, genislik, yukseklik, buyuk=64, kucuk=30):
    for n in range(buyuk, kucuk - 1, -2):
        fn = f(n)
        s = sar(parcalar, fn, genislik)
        if len(s) * n * 1.38 <= yukseklik:
            return fn, s, int(n * 1.38)
    fn = f(kucuk)
    return fn, sar(parcalar, fn, genislik), int(kucuk * 1.38)


def cumle_parcalari(k, cevapli):
    kel = k["cumle"].split()
    if "____" in k["cumle"]:
        out = []
        for w in kel:
            if w.startswith("____"):
                ek = w[4:]
                if cevapli:
                    cev = k["dogru"].split()
                    out += [(c, NANE) for c in cev[:-1]] + [(cev[-1] + ek, NANE)]
                else:
                    out.append(("_____" + ek, BEYAZ))
            else:
                out.append((w, BEYAZ))
        return out, []
    isaret = f"({k['dogru']})"
    if isaret in kel:   # anlamı bozan cümle: o cümleyi vurgula
        out, icinde = [], False
        for w in kel:
            if w.startswith("("): icinde = (w == isaret)
            out.append((w, NANE if (cevapli and icinde) else BEYAZ))
        return out, []
    # çeviri: soru cümlesi + cevap ayrı satır
    return [(w, BEYAZ) for w in kel], ([(w, NANE) for w in k["dogru"].split()] if cevapli else [])


def kare(k, asama, sayac=None):
    im = Image.new("RGB", (W, H), ZEMIN); d = ImageDraw.Draw(im)
    bas = baslik_metni(k); n = 64
    while f(n).getlength(bas) > 1000: n -= 2
    d.text(((W - f(n).getlength(bas)) / 2, 360), bas, font=f(n), fill=NANE)
    if asama == "son":
        d.rectangle([30, 561, 1049, 1415], fill=KOYU, outline=NANE, width=10)
        for metin, boy, y, renk in (("Yarın yeni bir tuzak", 62, 780, BEYAZ),
                                    ("TAKİP ET", 160, 930, NANE), ("kaçırma", 60, 1150, BEYAZ)):
            d.text(((W - f(boy).getlength(metin)) / 2, y), metin, font=f(boy), fill=renk)
        return im
    # kart: kanca bandı + cümle
    d.rectangle([30, 470, 1050, 1215], fill=KART)
    d.rectangle([30, 470, 1050, 690], fill=KANCA_BANT); d.rectangle([30, 470, 42, 690], fill=NANE)
    fn, s, ara = sigdir([(w, BEYAZ) for w in k["kanca"].split()], 900, 190, 52, 34)
    satir_ciz(d, s, fn, 580 - len(s) * ara / 2, ara)
    ana, ek = cumle_parcalari(k, asama != "kanca")
    alan = 470 if not ek else 250
    fn, s, ara = sigdir(ana, 920, alan, 64, 30)
    y = (720 if ek else 952 - len(s) * ara / 2)
    y = satir_ciz(d, s, fn, y, ara)
    if ek:
        d.line([140, y + 10, 940, y + 10], fill=NANE, width=3)
        fn2, s2, ara2 = sigdir(ek, 920, 1200 - y - 30, 56, 30)
        satir_ciz(d, s2, fn2, y + 30, ara2)
    # alt bölüm
    if asama == "kanca":
        if sayac:
            t = str(sayac); fs = f(300)
            d.text(((W - fs.getlength(t)) / 2, 1290 - fs.getbbox(t)[1] + 30), t, font=fs, fill=NANE)
        return im
    if asama == "kural":
        hap, alt, metin = k["hap"], k["hap_alt"], k["kural"]
    else:
        hap, alt, metin = "TUZAK", None, k["tuzak_metin"]
    fh = f(60)
    while fh.getlength(hap) > 860: fh = f(fh.size - 2)
    hw = fh.getlength(hap) + 100
    d.rounded_rectangle([(W - hw) / 2, 1290, (W + hw) / 2, 1410], radius=60,
                        fill=NANE if asama == "kural" else None, outline=NANE, width=6)
    d.text(((W - fh.getlength(hap)) / 2, 1350 - fh.getbbox("H")[3] / 2 - 4), hap, font=fh,
           fill=KOYU if asama == "kural" else NANE)
    y = 1450
    if alt:
        fa = f(46)
        while fa.getlength(alt) > 980: fa = f(fa.size - 2)
        d.text(((W - fa.getlength(alt)) / 2, y), alt, font=fa, fill=GRI); y += 80
    fn, s, ara = sigdir([(w, BEYAZ) for w in metin.split()], 960, 1820 - y, 44, 30)
    satir_ciz(d, s, fn, y, ara)
    return im


# ---------------- ses ----------------

def tts(metin, yol):
    istek = urllib.request.Request(
        "https://api.openai.com/v1/audio/speech",
        data=json.dumps({"model": "tts-1-hd", "input": metin, "voice": SES, "response_format": "mp3"}).encode(),
        headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}", "Content-Type": "application/json"})
    with urllib.request.urlopen(istek, timeout=120) as r, open(yol, "wb") as o:
        o.write(r.read())


def sure(yol):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", yol],
                                capture_output=True, text=True, check=True).stdout)


def video_uret(k, cikti):
    sesler = [("kanca", k["kanca"]),
              ("kural", f"Doğru cevap: {k['dogru']}. {k['kural']}"),
              ("tuzak", f"Tuzak: {k['tuzak_metin']}"),
              ("son", "Yarın yeni bir tuzak. Takip et, kaçırma.")]
    with tempfile.TemporaryDirectory() as tmp:
        p = lambda n: os.path.join(tmp, n)
        sureler, ses_listesi, kare_listesi = [], [], []
        for i, (ad, metin) in enumerate(sesler):
            tts(metin, p(f"s{i}.mp3"))
            enaz = {"kanca": 3.2, "son": SON_KART}.get(ad, 0)
            sn = max(enaz, sure(p(f"s{i}.mp3")) + 0.45)
            sureler.append(sn)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", p(f"s{i}.mp3"), "-af", f"apad,atrim=0:{sn:.3f}",
                            "-ar", "44100", "-ac", "2", p(f"s{i}.wav")], check=True)
            ses_listesi.append(p(f"s{i}.wav"))
        # kareler: sayaç 3 x 1 sn, kanca kalan süre, kural, tuzak, son
        def ekle(ad, im, sn):
            im.save(p(ad)); kare_listesi.append((p(ad), sn))
        for i, n in enumerate((3, 2, 1)):
            ekle(f"k{i}.png", kare(k, "kanca", n), 1.0)
        if sureler[0] > 3: ekle("k3.png", kare(k, "kanca"), sureler[0] - 3)
        ekle("kural.png", kare(k, "kural"), sureler[1])
        ekle("tuzak.png", kare(k, "tuzak"), sureler[2])
        ekle("son.png", kare(k, "son"), sureler[3])
        with open(p("kareler.txt"), "w") as o:
            for yol, sn in kare_listesi: o.write(f"file '{yol}'\nduration {sn:.3f}\n")
            o.write(f"file '{kare_listesi[-1][0]}'\n")
        with open(p("sesler.txt"), "w") as o:
            for yol in ses_listesi: o.write(f"file '{yol}'\n")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", p("kareler.txt"),
                        "-f", "concat", "-safe", "0", "-i", p("sesler.txt"),
                        "-vf", "fps=25,format=yuv420p", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100",
                        "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-c:a", "aac", "-b:a", "128k",
                        "-shortest", "-movflags", "+faststart", cikti], check=True)


# ---------------- kuyruk ----------------

def kuyruk_kaydi(k):
    n = k["konu"]
    ornek = k["cumle"].replace("____", k["dogru"]) if "____" in k["cumle"] else f"{k['cumle']}\nCevap: {k['dogru']}"
    govde = (f"{k['kanca']} 👇 Cevabını yoruma yaz!\n\n{k['kural']}\n\nSinyal kelimeler: {k['sinyal']}\n\n"
             f"Örnek:\n{ornek}\n\n⚡ Avcı kuralı: {k['tuzak_metin']}\n\n"
             f"Bu, serinin {n}. konusu. Her gün 08:30, 13:00 ve 17:30'da yeni konu.\n\n")
    ai = "🤖 Anlatıcımız KLOD yapay zekâ ile oluşturulmuştur."
    ig = govde + ("🔔 Yarın yeni bir tuzak. Kaçırmamak için takip et.\n📌 Kaydet, sınav sabahı tekrar et.\n\n"
                  f"Ücretsiz çalışma planı. Link biyografide.\n\n{ai}\n\n{k['etiket']}")
    yt = govde + ("🔔 Yarın yeni bir tuzak. Kaçırmamak için abone ol.\n📌 Kaydet, sınav sabahı tekrar et.\n"
                  f"🗓️ Ücretsiz çalışma planı: sinyal-avcisi.com\n\n{ai}\n\n{k['etiket']}\n\n#Shorts")
    yt_baslik = f"{k['kanca']} | {k['baslik']} | YDS YÖKDİL"
    if len(yt_baslik) > 100: yt_baslik = f"{k['baslik']} | YDS YÖKDİL"
    return {"konu": n, "baslik": k["baslik"], "video": f"konu{n:02d}.mp4", "aciklama": ig,
            "ilk_yorum": k["ilk_yorum"], "youtube": {"baslik": yt_baslik, "aciklama": yt}}


def kuyruga_ekle(veri):
    d = json.load(open(KUYRUK, encoding="utf-8"))
    var = {o["konu"] for o in d["ogeler"]}
    yeni = [kuyruk_kaydi(k) for k in veri["konular"] if k["konu"] not in var]
    d["ogeler"] += yeni
    open(KUYRUK, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
    print(f"{len(yeni)} konu kuyruğa eklendi")


def main():
    veri = json.load(open(VERI, encoding="utf-8"))
    a = sys.argv[1:]
    cikti = a[a.index("--cikti") + 1] if "--cikti" in a else os.environ.get("CIKTI_KLASORU", ".")
    os.makedirs(cikti, exist_ok=True)
    if "--kuyruk" in a:
        kuyruga_ekle(veri)
    if "--kare" in a:   # yalnız görseller (ses yok), tasarım kontrolü için
        k = next(x for x in veri["konular"] if x["konu"] == int(a[a.index("--kare") + 1]))
        for asama, sayac in (("kanca", 3), ("kural", None), ("tuzak", None), ("son", None)):
            kare(k, asama, sayac).save(os.path.join(cikti, f"konu{k['konu']}-{asama}.png"))
    if "--video" in a:
        k = next(x for x in veri["konular"] if x["konu"] == int(a[a.index("--video") + 1]))
        video_uret(k, os.path.join(cikti, f"konu{k['konu']:02d}.mp4"))
    if "--hepsi" in a:
        varolan = set(subprocess.run(["gh", "release", "view", ETIKET, "--json", "assets", "-q", ".assets[].name"],
                                     capture_output=True, text=True, check=True).stdout.split())
        for k in veri["konular"]:
            ad = f"konu{k['konu']:02d}.mp4"
            if ad in varolan: continue
            yol = os.path.join(cikti, ad)
            video_uret(k, yol)
            if "--yukle" in a:
                # --clobber YOK: var olan dosyanın üzerine yazılmaz
                subprocess.run(["gh", "release", "upload", ETIKET, yol], check=True)
                print(f"✔ Konu {k['konu']} yüklendi")


if __name__ == "__main__":
    main()
