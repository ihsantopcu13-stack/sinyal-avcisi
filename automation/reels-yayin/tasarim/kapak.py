#!/usr/bin/env python3
"""Reels kapakları: profil ızgarasında okunan büyük başlıklı kapak karesi.

Buffer, Instagram'a kapak görseli iletemiyor (thumbnailUrl → "Invalid post"); Instagram
kapak olarak videonun ilk karesini alır. Bu yüzden kapak, videonun başına çok kısa
(KAPAK_SN) bir kare olarak eklenir ve "konuXX-kapak.mp4" adıyla Release'e konur.
reels-yayin.mjs bu dosya varsa onu, yoksa asıl videoyu paylaşır. Asıl video hiç değişmez.
Türkçe alt satırlı sürüm (turkce.py, "konuXX-tr.mp4") varsa kapak onun başına eklenir.

Tasarım: koyu yeşil zemin, nane yeşili vurgu (sarı yok, emoji yok). Başlık ve soru,
profil ızgarasının kırptığı orta 3:4 alanın içinde (y 240–1680).

Kullanım:
  kapak.py --ornek 45 101 68 [--cikti D]   yalnız kapak PNG'leri (ağ yok)
  kapak.py --hepsi --yukle                 henüz zamanlanmamış konuların kapaklı videolarını
                                           üretir, Release'e yükler (var olanın üzerine yazmaz)
Gerekli: gh CLI (GH_TOKEN), ffmpeg, Pillow, DejaVu Sans Bold.
"""
import json, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

KOK = os.path.dirname(os.path.abspath(__file__))
KUYRUK = os.path.join(KOK, "..", "data", "kuyruk.json")
DURUM = os.path.join(KOK, "..", "data", "durum.json")
ETIKET = "reels-medya-v1"
KAPAK_SN = 0.12  # 3 kare (25 fps): izleyici fark etmez, Instagram kapak olarak alır

W, H = 1080, 1920
ZEMIN = (4, 36, 26)
KART = (10, 58, 43)
NANE = (92, 255, 194)
BEYAZ = (255, 255, 255)
GRI = (170, 210, 195)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def f(n):
    return ImageFont.truetype(FONT, n)


def tr_upper(s):
    return s.replace("i", "İ").replace("ı", "I").upper()


def baslik_metni(b):
    # Türkçe harf içeren başlık Türkçe kuralla büyür (i → İ); İngilizce başlık düz
    return tr_upper(b) if any(c in "çğıöşüÇĞİÖŞÜ" for c in b) else b.upper()


def kapak_adi(video):
    return video.replace(".mp4", "-kapak.mp4")


def tr_adi(video):
    # Türkçe alt satırlı sürüm (turkce.py): konu58.mp4 → konu58-tr.mp4, konu101-nane.mp4 → konu101-tr.mp4
    return video.replace("-nane.mp4", ".mp4").replace(".mp4", "-tr.mp4")


def soru(o):
    # Videonun kanca sorusu YouTube başlığının ilk parçası; başlığın tekrarıysa yok sayılır
    s = (o.get("youtube") or {}).get("baslik", "").split(" | ")[0].strip()
    return "" if not s or s == o["baslik"] else s


def sar(metin, font, genislik):
    satirlar, satir = [], ""
    for kel in metin.split():
        aday = f"{satir} {kel}".strip()
        if satir and font.getlength(aday) > genislik:
            satirlar.append(satir); satir = kel
        else:
            satir = aday
    if satir: satirlar.append(satir)
    return satirlar


def sigdir(metin, genislik, en_cok_satir, buyuk, kucuk):
    for n in range(buyuk, kucuk - 1, -4):
        s = sar(metin, f(n), genislik)
        if len(s) <= en_cok_satir and all(f(n).getlength(x) <= genislik for x in s):
            return f(n), s
    return f(kucuk), sar(metin, f(kucuk), genislik)


def ortala(d, satirlar, font, y, ara, renk):
    for s in satirlar:
        d.text(((W - font.getlength(s)) / 2, y), s, font=font, fill=renk)
        y += ara
    return y


def kapak_ciz(o, hedef):
    img = Image.new("RGB", (W, H), ZEMIN)
    d = ImageDraw.Draw(img)
    ft, satirlar = sigdir(baslik_metni(o["baslik"]), W - 140, 3, 150, 84)
    ara = int(ft.size * 1.12)
    s = soru(o)
    fs, ss = sigdir(s, W - 220, 3, 60, 40) if s else (None, [])
    ara_s = int(fs.size * 1.25) if s else 0
    kart = ara_s * len(ss) + 70 if s else 0
    # Etiket + başlık + çizgi + kart bloğu dikeyde ortalanır (ızgara kırpmasının ortası)
    toplam = 90 + ara * len(satirlar) + 44 + (80 + kart if s else 0)
    y = (H - toplam) // 2
    fe = f(46)
    etiket = "YDS · YÖKDİL"
    d.text(((W - fe.getlength(etiket)) / 2, y), etiket, font=fe, fill=NANE)
    y = ortala(d, satirlar, ft, y + 90, ara, BEYAZ) + 30
    d.rounded_rectangle(((W - 220) / 2, y, (W + 220) / 2, y + 14), radius=7, fill=NANE)
    if s:
        ky = y + 94
        d.rounded_rectangle((70, ky, W - 70, ky + kart), radius=28, fill=KART)
        d.rectangle((70, ky + 18, 80, ky + kart - 18), fill=NANE)
        ortala(d, ss, fs, ky + 35, ara_s, NANE)
    fa = f(42)
    alt = "Sinyal Avcısı"
    d.text(((W - fa.getlength(alt)) / 2, 1580), alt, font=fa, fill=GRI)
    img.save(hedef)


def kapakli_video(o, video, png, hedef):
    """Kapak karesini videonun başına ekler; ses aynı süre kadar sessizlikle kaydırılır."""
    fps = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=r_frame_rate", "-of", "default=nk=1:nw=1", video],
                         check=True, text=True, capture_output=True).stdout.strip() or "25/1"
    ms = int(KAPAK_SN * 1000)
    subprocess.run([
        "ffmpeg", "-loglevel", "error", "-y",
        "-loop", "1", "-framerate", fps, "-t", str(KAPAK_SN), "-i", png, "-i", video,
        "-filter_complex",
        f"[0:v]format=yuv420p,setsar=1[k];[1:v]scale={W}:{H},format=yuv420p,setsar=1[v];"
        f"[k][v]concat=n=2:v=1:a=0[vo];[1:a]adelay={ms}|{ms}[ao]",
        "-map", "[vo]", "-map", "[ao]", "-r", fps,
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", hedef,
    ], check=True, stdin=subprocess.DEVNULL)


def gh(*arg):
    return subprocess.run(["gh", *arg], check=True, text=True, capture_output=True).stdout


def main():
    arg = sys.argv[1:]
    kuyruk = json.load(open(KUYRUK, encoding="utf-8"))["ogeler"]
    cikti = os.environ.get("CIKTI_KLASORU") or tempfile.mkdtemp()
    if "--cikti" in arg: cikti = arg[arg.index("--cikti") + 1]
    os.makedirs(cikti, exist_ok=True)

    if "--ornek" in arg:
        for n in [int(x) for x in arg[arg.index("--ornek") + 1:] if x.isdigit()]:
            o = next(x for x in kuyruk if x["konu"] == n)
            kapak_ciz(o, os.path.join(cikti, f"kapak{n}.png"))
        print(f"Örnekler: {cikti}")
        return

    if "--hepsi" not in arg:
        print(__doc__); sys.exit(1)
    durum = json.load(open(DURUM, encoding="utf-8"))["konular"]
    varolan = set(gh("release", "view", ETIKET, "--json", "assets", "-q", ".assets[].name").split())
    # Saati atanmış (Buffer'a gitmiş) konular atlanır; yalnız sıradakiler.
    # Türkçe satırlı sürüm varsa kapak onun üstüne yapılır (konuXX-tr-kapak.mp4).
    eksik = []
    for o in kuyruk:
        kaynak = tr_adi(o["video"]) if tr_adi(o["video"]) in varolan else o["video"]
        if not durum.get(str(o["konu"]), {}).get("slot") and kaynak in varolan and kapak_adi(kaynak) not in varolan:
            eksik.append((o, kaynak))
    print(f"{len(eksik)} konunun kapaklı videosu eksik")
    with tempfile.TemporaryDirectory() as tmp:
        for o, kaynak in eksik:
            gh("release", "download", ETIKET, "-p", kaynak, "-D", tmp, "--clobber")
            png = os.path.join(cikti, f"kapak{o['konu']}.png")
            hedef = os.path.join(cikti, kapak_adi(kaynak))
            kapak_ciz(o, png)
            kapakli_video(o, os.path.join(tmp, kaynak), png, hedef)
            if "--yukle" in arg:
                gh("release", "upload", ETIKET, hedef)  # --clobber yok: üzerine yazmaz
            print(f"✔ Konu {o['konu']}: {kapak_adi(kaynak)}")


if __name__ == "__main__":
    main()
