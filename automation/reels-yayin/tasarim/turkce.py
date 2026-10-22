#!/usr/bin/env python3
"""Reels videolarına Türkçe alt satır: İngilizce cümlenin kısa Türkçe anlamı.

Cevabı ele vermesin diye satır sayaçtan sonra (cevap açıklanınca) görünür, TAKİP ET kartında
kalkar. Asıl video değişmez; yeni dosya "konuXX-tr.mp4" adıyla Release'e konur (üzerine yazmaz).
Metinler: turkce-satirlar.json (tekrar konuları 101–140 asıl konunun satırını kullanır).

İki şablon:
  eski (konu 1–67 ve tekrar turu): satır, cümle kartının hemen altındaki boş şeride bindirilir.
  yeni (yeni-konular.json): kareler uret_yeni.kare ile Türkçe satırlı yeniden çizilir; ses ve
       kare süreleri asıl videodan alınır (yeni TTS yok).

Kullanım:
  turkce.py --ornek 101 56 [--cikti D]   örnek videolar (asıl videoyu Release'in herkese açık adresinden indirir)
  turkce.py --hepsi --yukle              henüz zamanlanmamış konuların Türkçe satırlı videolarını
                                         üretir, Release'e yükler (var olanın üzerine yazmaz)
Gerekli: gh CLI (GH_TOKEN, yalnız --hepsi), ffmpeg, Pillow, numpy, DejaVu Sans Bold.
"""
import json, os, subprocess, sys, tempfile, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageFont

KOK = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, KOK)
import uret_yeni  # noqa: E402
from kapak import tr_adi  # noqa: E402

KUYRUK = os.path.join(KOK, "..", "data", "kuyruk.json")
DURUM = os.path.join(KOK, "..", "data", "durum.json")
SATIRLAR = os.path.join(KOK, "turkce-satirlar.json")
YENI = os.path.join(KOK, "yeni-konular.json")
ETIKET = "reels-medya-v1"
URL = "https://github.com/ihsantopcu13-stack/sinyal-avcisi/releases/download/" + ETIKET + "/"

W, H = 1080, 1920
SAYAC_SN = 3.0       # eski şablonda satır 3-2-1 sayacından sonra görünür
SON_KART = 2.85      # eski şablonda TAKİP ET kartı son ~2,85 sn
ESKI_KART = (22, 22, 32)
NANE = (92, 255, 194)
ACIK = (225, 238, 232)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def f(n):
    return ImageFont.truetype(FONT, n)


def satirlar():
    return json.load(open(SATIRLAR, encoding="utf-8"))["satirlar"]


def turkcesi(o, s):
    return s.get(str(o.get("tekrar") or o["konu"]))


def sure(yol):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", yol],
                                capture_output=True, text=True, check=True).stdout)


def gecisler(video, esik):
    """Ardışık kareler arasında ortalama farkı eşiği aşan anlar (sn)."""
    w, h = 54, 96
    ham = subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vf", f"scale={w}:{h},format=gray",
                          "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    a = np.frombuffer(ham, np.uint8).reshape(-1, h, w).astype(np.int16)
    fark = np.abs(np.diff(a, axis=0)).mean(axis=(1, 2))
    fps = 25
    return [round((i + 1) / fps, 3) for i in np.nonzero(fark > esik)[0]]


# ---------------- eski şablon: bindirme ----------------

def serit(metin):
    """Cümle kartının altındaki boş şerit (y 1226–1398): TÜRKÇESİ etiketi + anlam."""
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    y0, y1 = 1226, 1398
    d.rounded_rectangle((30, y0, 1050, y1), radius=22, fill=ESKI_KART + (255,))
    d.rectangle((30, y0 + 16, 42, y1 - 16), fill=NANE + (255,))
    fe = f(28); et = "TÜRKÇESİ"
    d.text(((W - fe.getlength(et)) / 2, y0 + 18), et, font=fe, fill=NANE + (255,))
    fn, s, ara = uret_yeni.sigdir([(w, ACIK + (255,)) for w in metin.split()], 920, y1 - y0 - 70, 44, 28)
    alan_ust, alan_alt = y0 + 58, y1 - 10
    uret_yeni.satir_ciz(d, s, fn, (alan_ust + alan_alt - len(s) * ara) / 2 + 2, ara)
    return im


def eski_uret(video, metin, cikti):
    t = sure(video)
    buyuk = gecisler(video, 8)   # TAKİP ET kartına geçiş: ekranın çoğu değişir
    son = buyuk[-1] if buyuk and buyuk[-1] > t - 5 else t - SON_KART
    with tempfile.TemporaryDirectory() as tmp:
        png = os.path.join(tmp, "serit.png"); serit(metin).save(png)
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", "-i", video, "-i", png, "-filter_complex",
            f"[0:v][1:v]overlay=0:0:enable='between(t,{SAYAC_SN},{son - 0.001:.3f})',format=yuv420p[v]",
            "-map", "[v]", "-map", "0:a", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", "25",
            "-c:a", "copy", "-movflags", "+faststart", cikti], check=True, stdin=subprocess.DEVNULL)


# ---------------- yeni şablon: yeniden çizim ----------------

def yeni_uret(video, k, metin, cikti):
    # Kareler: sayaç 3, 2, 1, [kanca], kural, tuzak, son. Süreler asıl videodan.
    t = sure(video)
    sinir = [0.0] + gecisler(video, 0.5) + [t]
    sureler = [b - a for a, b in zip(sinir, sinir[1:])]
    asamalar = [("kanca", 3), ("kanca", 2), ("kanca", 1)]
    if len(sureler) == 7: asamalar.append(("kanca", None))
    elif len(sureler) != 6: raise SystemExit(f"Konu {k['konu']}: {len(sureler)} kare bulundu, 6 ya da 7 beklenirdi")
    asamalar += [("kural", None), ("tuzak", None), ("son", None)]
    with tempfile.TemporaryDirectory() as tmp:
        liste = os.path.join(tmp, "kareler.txt")
        with open(liste, "w") as o:
            for i, ((asama, sayac), sn) in enumerate(zip(asamalar, sureler)):
                yol = os.path.join(tmp, f"k{i}.png")
                uret_yeni.kare(k, asama, sayac, tr=metin).save(yol)
                o.write(f"file '{yol}'\nduration {sn:.3f}\n")
            o.write(f"file '{yol}'\n")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", liste, "-i", video,
                        "-map", "0:v", "-map", "1:a", "-vf", "fps=25,format=yuv420p",
                        "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-c:a", "copy",
                        "-shortest", "-movflags", "+faststart", cikti], check=True, stdin=subprocess.DEVNULL)


def uret(o, metin, video, cikti, yeni):
    k = yeni.get(o["konu"])
    if k: yeni_uret(video, k, metin, cikti)
    else: eski_uret(video, metin, cikti)


def gh(*arg):
    return subprocess.run(["gh", *arg], check=True, text=True, capture_output=True).stdout


def main():
    arg = sys.argv[1:]
    kuyruk = json.load(open(KUYRUK, encoding="utf-8"))["ogeler"]
    yeni = {k["konu"]: k for k in json.load(open(YENI, encoding="utf-8"))["konular"]}
    s = satirlar()
    cikti = os.environ.get("CIKTI_KLASORU") or tempfile.mkdtemp()
    if "--cikti" in arg: cikti = arg[arg.index("--cikti") + 1]
    os.makedirs(cikti, exist_ok=True)

    if "--ornek" in arg:
        with tempfile.TemporaryDirectory() as tmp:
            for n in [int(x) for x in arg[arg.index("--ornek") + 1:] if x.isdigit()]:
                o = next(x for x in kuyruk if x["konu"] == n)
                yol = os.path.join(tmp, o["video"])
                urllib.request.urlretrieve(URL + o["video"], yol)
                uret(o, turkcesi(o, s), yol, os.path.join(cikti, tr_adi(o["video"])), yeni)
        print(f"Örnekler: {cikti}")
        return

    if "--hepsi" not in arg:
        print(__doc__); sys.exit(1)
    durum = json.load(open(DURUM, encoding="utf-8"))["konular"]
    varolan = set(gh("release", "view", ETIKET, "--json", "assets", "-q", ".assets[].name").split())
    # Saati atanmış (Buffer'a gitmiş) konular atlanır; yalnız sıradakiler
    eksik = [o for o in kuyruk if not durum.get(str(o["konu"]), {}).get("slot") and turkcesi(o, s)
             and o["video"] in varolan and tr_adi(o["video"]) not in varolan]
    print(f"{len(eksik)} konunun Türkçe satırlı videosu eksik")
    with tempfile.TemporaryDirectory() as tmp:
        for o in eksik:
            gh("release", "download", ETIKET, "-p", o["video"], "-D", tmp, "--clobber")
            hedef = os.path.join(cikti, tr_adi(o["video"]))
            uret(o, turkcesi(o, s), os.path.join(tmp, o["video"]), hedef, yeni)
            if "--yukle" in arg:
                gh("release", "upload", ETIKET, hedef)  # --clobber yok: üzerine yazmaz
            print(f"✔ Konu {o['konu']}: {tr_adi(o['video'])}")


if __name__ == "__main__":
    main()
