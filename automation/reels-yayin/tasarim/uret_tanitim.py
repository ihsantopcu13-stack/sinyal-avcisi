#!/usr/bin/env python3
"""Sitedeki yeni özellikleri tanıtan Reels'leri (tanitim.json, konu 201+) ve kuyruk kayıtlarını üretir.

Tasarım uret_yeni.py ile aynı: koyu yeşil zemin, nane yeşili vurgu (sarı yok, emoji yok).
Akış: kanca sahnesi → özellik sahneleri → PLAN çağrısı + TAKİP ET kartı. Her sahnenin süresi
kendi anlatımı kadar; ses OpenAI TTS (OPENAI_API_KEY), sonunda -14 LUFS.
Videolar Türkçe olduğu için Türkçe alt satır yok; kapağı kapak.py her yayın çalışmasında ekler.
Tanıtım videoları YouTube'a gitmez (reels-yayin.mjs, "tanitim": true).

Kullanım:
  uret_tanitim.py --kuyruk                  kuyruk.json'a eksik kayıtları ekler (ağ yok)
  uret_tanitim.py --kare 201 [--cikti D]    yalnız kareler (PNG, ağ yok)
  uret_tanitim.py --video 201 [--sessiz]    tek video; --sessiz: TTS'siz, tahmini sürelerle
  uret_tanitim.py --hepsi --yukle           Release'te olmayanları üretir ve yükler (üzerine yazmaz)
"""
import json, os, subprocess, sys, tempfile
from uret_yeni import (W, H, ZEMIN, KART, NANE, BEYAZ, GRI, KOYU, SON_KART, ETIKET, KUYRUK,
                       f, sar, satir_ciz, sigdir, tts, sure)
from PIL import Image, ImageDraw

KOK = os.path.dirname(os.path.abspath(__file__))
VERI = os.path.join(KOK, "tanitim.json")
AI = "Anlatıcımız KLOD yapay zekâ ile oluşturulmuştur."


def ortala(d, metin, font, y, renk):
    d.text(((W - font.getlength(metin)) / 2, y), metin, font=font, fill=renk)


def sahne_ciz(s, y0=None):
    """Blok (etiket → başlık → dev yazı → maddeler) dikeyde ortalanır; y0 yoksa önce yüksekliği ölçer."""
    if y0 is None:
        _, son = sahne_ciz(s, 0)
        y0 = max(240, (H - son) // 2 - 40)
    im = Image.new("RGB", (W, H), ZEMIN); d = ImageDraw.Draw(im)
    fe = f(46)
    while fe.getlength(s["etiket"]) > 960: fe = f(fe.size - 2)
    ortala(d, s["etiket"], fe, y0, NANE)
    d.rounded_rectangle(((W - 160) / 2, y0 + 76, (W + 160) / 2, y0 + 88), radius=6, fill=NANE)
    y = y0 + 150
    maddeler = s.get("maddeler") or []
    if s.get("baslik"):
        fn, st, ara = sigdir([(w, BEYAZ) for w in s["baslik"].split()], 960, 380, 104, 60)
        y = satir_ciz(d, st, fn, y, ara) + (40 if s.get("buyuk") or maddeler else 0)
    if s.get("buyuk"):
        n = 260
        while f(n).getlength(s["buyuk"]) > 980: n -= 8
        fb = f(n)
        ortala(d, s["buyuk"], fb, y - fb.getbbox(s["buyuk"])[1], NANE)
        y += fb.getbbox(s["buyuk"])[3] - fb.getbbox(s["buyuk"])[1] + (80 if maddeler else 0)
    if maddeler:
        fm = f(60)
        satirlar = [sar([(w, BEYAZ) for w in m.split()], fm, 900) for m in maddeler]
        ara = int(60 * 1.35)
        yuk = sum(len(x) for x in satirlar) * ara + (len(maddeler) - 1) * 34 + 90
        d.rectangle([30, y, 1050, y + yuk], fill=KART); d.rectangle([30, y, 42, y + yuk], fill=NANE)
        yy = y + 45
        for st in satirlar:
            yy = satir_ciz(d, st, fm, yy, ara) + 34
        y += yuk
    return im, y


def son_ciz():
    im = Image.new("RGB", (W, H), ZEMIN); d = ImageDraw.Draw(im)
    ortala(d, "HEPSİ ÜCRETSİZ", f(64), 450, NANE)
    d.rectangle([30, 610, 1049, 1090], fill=KART); d.rectangle([30, 610, 42, 1090], fill=NANE)
    ortala(d, "Yoruma", f(64), 670, BEYAZ)
    ortala(d, "PLAN", f(200), 760, NANE)
    ortala(d, "yaz, linki DM'den göndereyim", f(50), 1000, BEYAZ)
    d.rectangle([30, 1170, 1049, 1510], fill=KOYU, outline=NANE, width=10)
    ortala(d, "TAKİP ET", f(150), 1230, NANE)
    ortala(d, "kaçırma", f(56), 1410, BEYAZ)
    return im


def kareler(v):
    return [sahne_ciz(s)[0] for s in v["sahneler"]] + [son_ciz()]


def video_uret(v, son_ses, cikti, sessiz=False):
    sesler = [s["ses"] for s in v["sahneler"]] + [son_ses]
    with tempfile.TemporaryDirectory() as tmp:
        p = lambda n: os.path.join(tmp, n)
        sureler, sesl = [], []
        for i, metin in enumerate(sesler):
            enaz = SON_KART if i == len(sesler) - 1 else 2.6
            if sessiz:   # Türkçe anlatım ~14 karakter/sn varsayımı (yalnız önizleme)
                sn = max(enaz, len(metin) / 14 + 0.45)
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                                "-t", f"{sn:.3f}", p(f"s{i}.wav")], check=True)
            else:
                tts(metin, p(f"s{i}.mp3"))
                sn = max(enaz, sure(p(f"s{i}.mp3")) + 0.45)
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", p(f"s{i}.mp3"), "-af", f"apad,atrim=0:{sn:.3f}",
                                "-ar", "44100", "-ac", "2", p(f"s{i}.wav")], check=True)
            sureler.append(sn); sesl.append(p(f"s{i}.wav"))
        with open(p("kareler.txt"), "w") as o:
            for i, (im, sn) in enumerate(zip(kareler(v), sureler)):
                im.save(p(f"k{i}.png")); o.write(f"file '{p(f'k{i}.png')}'\nduration {sn:.3f}\n")
            o.write(f"file '{p(f'k{len(sureler) - 1}.png')}'\n")
        with open(p("sesler.txt"), "w") as o:
            for yol in sesl: o.write(f"file '{yol}'\n")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", p("kareler.txt"),
                        "-f", "concat", "-safe", "0", "-i", p("sesler.txt"),
                        "-vf", "fps=25,format=yuv420p", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100",
                        "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-c:a", "aac", "-b:a", "128k",
                        "-shortest", "-movflags", "+faststart", cikti], check=True)
    print(f"{cikti}: {sum(sureler):.1f} sn")


# ---------------- kuyruk ----------------

def kuyruk_kaydi(v):
    cagri = ("Hepsi ücretsiz. Yoruma PLAN yaz, linki DM'den göndereyim.\n"
             "Her gün yeni YDS/YÖKDİL tuzağı için takip et.\n\n")
    ig = (f"{v['metin']}\n\n{cagri}Sayfa: {v['adres']}\nKayıt gerekmez. Link biyografide.\n\n"
          f"{AI}\n\n{v['etiket']}")
    yt = (f"{v['metin']}\n\nHepsi ücretsiz, kayıt gerekmez: {v['adres']}\n\n{AI}\n\n{v['etiket']}\n\n#Shorts")
    return {"konu": v["konu"], "baslik": v["baslik"], "video": f"konu{v['konu']}.mp4", "tanitim": True,
            "aciklama": ig, "ilk_yorum": v["ilk_yorum"],
            "youtube": {"baslik": f"{v['kanca']} | {v['baslik']} | YDS YÖKDİL", "aciklama": yt}}


def kuyruga_ekle(veri):
    """Eksik kayıtları ekler. "once" verilmişse kayıt o konunun önüne girer (yayın saatini sıra belirler)."""
    d = json.load(open(KUYRUK, encoding="utf-8"))
    var = {o["konu"] for o in d["ogeler"]}
    eklenen = 0
    for v in veri["videolar"]:
        if v["konu"] in var: continue
        kayit = kuyruk_kaydi(v)
        sira = next((i for i, o in enumerate(d["ogeler"]) if o["konu"] == v.get("once")), len(d["ogeler"]))
        d["ogeler"].insert(sira, kayit); eklenen += 1
    open(KUYRUK, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
    print(f"{eklenen} tanıtım kuyruğa eklendi")


def main():
    veri = json.load(open(VERI, encoding="utf-8"))
    a = sys.argv[1:]
    cikti = a[a.index("--cikti") + 1] if "--cikti" in a else os.environ.get("CIKTI_KLASORU", ".")
    os.makedirs(cikti, exist_ok=True)
    bul = lambda n: next(x for x in veri["videolar"] if x["konu"] == int(n))
    if "--kuyruk" in a:
        kuyruga_ekle(veri)
    if "--kare" in a:
        v = bul(a[a.index("--kare") + 1])
        for i, im in enumerate(kareler(v)):
            im.save(os.path.join(cikti, f"tanitim{v['konu']}-{i + 1}.png"))
    if "--video" in a:
        for n in [x for x in a[a.index("--video") + 1:] if x.isdigit()]:
            v = bul(n)
            video_uret(v, veri["son"]["ses"], os.path.join(cikti, f"konu{v['konu']}.mp4"), "--sessiz" in a)
    if "--hepsi" in a:
        varolan = set(subprocess.run(["gh", "release", "view", ETIKET, "--json", "assets", "-q", ".assets[].name"],
                                     capture_output=True, text=True, check=True).stdout.split())
        for v in veri["videolar"]:
            ad = f"konu{v['konu']}.mp4"
            if ad in varolan: continue
            yol = os.path.join(cikti, ad)
            video_uret(v, veri["son"]["ses"], yol)
            if "--yukle" in a:
                subprocess.run(["gh", "release", "upload", ETIKET, yol], check=True)  # --clobber YOK
                print(f"✔ Tanıtım {v['konu']} yüklendi")


if __name__ == "__main__":
    main()
