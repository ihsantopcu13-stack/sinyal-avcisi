#!/usr/bin/env python3
"""Eski tasarım Reels videosunu (avatar fotoğraflı) 18 Ekim tasarımına çevirir:
avatar yok, nane yeşili başlık, ilk 3 sn 3-2-1 sayacı, son ~2,85 sn TAKİP ET kartı, -14 LUFS ses.
Kullanım: yenile.py girdi.mp4 cikti.mp4 "Başlık" [--tuzak|--tuzaksiz]"""
import subprocess, sys, tempfile, os
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
BG = (11, 10, 15)
NANE = (92, 255, 194)  # 18 Ekim kararı: sarı/altın yok
KART_IC = (10, 15, 25)
BEYAZ = (255, 255, 255)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
OLCEK, DX, DY = 1.1235, -66.6, 190.1   # eski kare -> yeni kare (konu45 eski/yeni karşılaştırmasından)
SON_KART = 2.85

def tr_upper(s):
    return s.replace("i", "İ").replace("ı", "I").upper()

def font_genislige(metin, boyut, maks):
    while boyut > 20:
        f = ImageFont.truetype(FONT, boyut)
        if f.getlength(metin) <= maks: return f
        boyut -= 2
    return ImageFont.truetype(FONT, boyut)

def ortala(d, metin, f, ust_cap, renk):
    # ust_cap: büyük harf üst çizgisinin y'si
    asc = f.getbbox("H")[1]
    d.text(((W - f.getlength(metin)) / 2, ust_cap - asc), metin, font=f, fill=renk)

def baslik_katmani(baslik):
    im = Image.new("RGBA", (W, 480), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    f = font_genislige(baslik, 65, 1020)
    ortala(d, baslik, f, 370 + (65 - f.size) * 0.36, NANE)
    return im

def sayac(n):
    im = Image.new("RGBA", (W, 400), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    ortala(d, str(n), ImageFont.truetype(FONT, 302), 1259 - 1200, NANE)
    return im

def son_kart():
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rectangle([0, 500, W, H], fill=BG + (255,))
    d.rectangle([30, 561, 1049, 1415], fill=KART_IC + (255,), outline=NANE + (255,), width=8)
    def genislik(metin, hedef):
        b = 40
        while ImageFont.truetype(FONT, b + 1).getlength(metin) <= hedef: b += 1
        return ImageFont.truetype(FONT, b)
    for metin, hedef, ust, renk in (("Yarın yeni bir tuzak", 788, 780, BEYAZ),
                                    ("TAKİP ET", 836, 951, NANE),
                                    ("kaçırma", 311, 1146, BEYAZ)):
        f = genislik(metin, hedef)
        if metin == "kaçırma":   # küçük harf: üst = ascender
            d.text(((W - f.getlength(metin)) / 2, ust - f.getbbox("k")[1]), metin, font=f, fill=renk)
        else:
            ortala(d, metin, f, ust, renk)
    return im

def sure(p):
    o = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p],
                       capture_output=True, text=True, check=True)
    return float(o.stdout)

def main():
    girdi, cikti, baslik = sys.argv[1], sys.argv[2], sys.argv[3]
    tuzak = "--tuzaksiz" not in sys.argv
    # Türkçe başlıklar (--tuzaksiz) Türkçe kuralla büyür (i → İ); İngilizce başlıklar düz (INFINITIVE)
    b = baslik.upper() + " TUZAĞI" if tuzak else tr_upper(baslik)
    t = sure(girdi)
    with tempfile.TemporaryDirectory() as tmp:
        p = lambda n: os.path.join(tmp, n)
        baslik_katmani(b).save(p("baslik.png"))
        for n in (3, 2, 1): sayac(n).save(p(f"s{n}.png"))
        son_kart().save(p("son.png"))
        sw, sh = round(W * OLCEK), round(H * OLCEK)
        y0, y1 = 242, 1404           # eski y 215..1250 (başlık ve avatar dışı)
        x0 = round(-DX)
        ks = t - SON_KART
        fc = (
            f"color=c=0x0b0a0f:s={W}x{H}:r=25:d={t}[bg];"
            f"[0:v]scale={sw}:{sh}:flags=lanczos,crop={W}:{y1-y0}:{x0}:{y0}[ic];"
            f"[bg][ic]overlay=0:{round(y0+DY)}:shortest=1[a];"
            f"[a][1]overlay=0:0[b];"
            f"[b][2]overlay=0:1200:enable='lt(t,1)'[c];"
            f"[c][3]overlay=0:1200:enable='between(t,1,2)*lt(t,2)'[d];"
            f"[d][4]overlay=0:1200:enable='between(t,2,3)*lt(t,3)'[e];"
            f"[e][5]overlay=0:0:enable='gte(t,{ks:.3f})',format=yuv420p[v];"
            f"[0:a]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[au]"
        )
        cmd = ["ffmpeg", "-v", "error", "-y", "-i", girdi,
               "-i", p("baslik.png"), "-i", p("s3.png"), "-i", p("s2.png"), "-i", p("s1.png"), "-i", p("son.png"),
               "-filter_complex", fc, "-map", "[v]", "-map", "[au]",
               "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-r", "25",
               "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", cikti]
        subprocess.run(cmd, check=True)

if __name__ == "__main__":
    main()
