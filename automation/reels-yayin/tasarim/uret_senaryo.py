#!/usr/bin/env python3
"""Takipçi kazanmak için yazılmış KLOD sesli Reels'leri (senaryo.json, konu 401+) ve kuyruk kayıtlarını üretir.

Çizim ve ses uret_tanitim.py ile aynı (sahne_ciz, OpenAI TTS, -14 LUFS). Fark: son sahne her videonun
kendi kapanış cümlesi + TAKİP ET kartı; açıklamada site tanıtımı yerine gönderme/kaydetme çağrısı.
Video Türkçe olduğu için Türkçe alt satır yok; kapağı kapak.py ekler. YouTube'a da gider.

Kullanım:
  uret_senaryo.py --kuyruk                  kuyruk.json'a eksik kayıtları ekler (ağ yok)
  uret_senaryo.py --kare 401 [--cikti D]    yalnız kareler (PNG, ağ yok)
  uret_senaryo.py --video 401 [--sessiz]    tek video; --sessiz: TTS'siz, tahmini sürelerle
  uret_senaryo.py --hepsi --yukle           Release'te olmayanları üretir ve yükler (üzerine yazmaz)
"""
import json, os, subprocess, sys
from uret_yeni import W, H, ZEMIN, KART, NANE, BEYAZ, KOYU, ETIKET, KUYRUK, f, sigdir, satir_ciz
from uret_tanitim import AI, ortala, sahne_ciz, video_uret
from PIL import Image, ImageDraw

KOK = os.path.dirname(os.path.abspath(__file__))
VERI = os.path.join(KOK, "senaryo.json")


def son_ciz(baslik):
    im = Image.new("RGB", (W, H), ZEMIN); d = ImageDraw.Draw(im)
    d.rectangle([30, 560, 1049, 1060], fill=KART); d.rectangle([30, 560, 42, 1060], fill=NANE)
    fn, st, ara = sigdir([(w, BEYAZ) for w in baslik.split()], 900, 400, 84, 48)
    satir_ciz(d, st, fn, 810 - len(st) * ara / 2, ara)
    d.rectangle([30, 1150, 1049, 1490], fill=KOYU, outline=NANE, width=10)
    ortala(d, "TAKİP ET", f(150), 1210, NANE)
    ortala(d, "@sinyalavcisi.yds", f(56), 1390, BEYAZ)
    return im


def kareler(v):
    return [sahne_ciz(s)[0] for s in v["sahneler"]] + [son_ciz(v["kapanis"]["baslik"])]


def kuyruk_kaydi(v):
    ig = f"{v['metin']}\n\nHer gün yeni YDS/YÖKDİL tuzağı için takip et.\nÜcretsiz çalışma planı. Link biyografide.\n\n{AI}\n\n{v['etiket']}"
    yt = f"{v['metin']}\n\nHer gün yeni YDS/YÖKDİL tuzağı için abone ol.\nÜcretsiz çalışma planı: sinyal-avcisi.com\n\n{AI}\n\n{v['etiket']}\n\n#Shorts"
    return {"konu": v["konu"], "baslik": v["baslik"], "video": f"konu{v['konu']}.mp4", "senaryo": True,
            "aciklama": ig, "ilk_yorum": v["ilk_yorum"],
            "youtube": {"baslik": f"{v['kanca']} | {v['baslik']} | YDS YÖKDİL", "aciklama": yt}}


def kuyruga_ekle(veri):
    """Eksik kayıtları ekler; "once" verilmişse kayıt o konunun önüne girer (yayın saatini sıra belirler)."""
    d = json.load(open(KUYRUK, encoding="utf-8"))
    var = {o["konu"] for o in d["ogeler"]}
    eklenen = 0
    for v in veri["videolar"]:
        if v["konu"] in var: continue
        sira = next((i for i, o in enumerate(d["ogeler"]) if o["konu"] == v.get("once")), len(d["ogeler"]))
        d["ogeler"].insert(sira, kuyruk_kaydi(v)); eklenen += 1
    open(KUYRUK, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
    print(f"{eklenen} senaryo kuyruğa eklendi")


def uret(v, yol, sessiz=False):
    video_uret(v, v["kapanis"]["ses"], yol, sessiz, kare_listesi=kareler(v))


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
            im.save(os.path.join(cikti, f"senaryo{v['konu']}-{i + 1}.png"))
    if "--video" in a:
        for n in [x for x in a[a.index("--video") + 1:] if x.isdigit()]:
            uret(bul(n), os.path.join(cikti, f"konu{n}.mp4"), "--sessiz" in a)
    if "--hepsi" in a:
        varolan = set(subprocess.run(["gh", "release", "view", ETIKET, "--json", "assets", "-q", ".assets[].name"],
                                     capture_output=True, text=True, check=True).stdout.split())
        for v in veri["videolar"]:
            ad = f"konu{v['konu']}.mp4"
            if ad in varolan: continue
            yol = os.path.join(cikti, ad)
            uret(v, yol)
            if "--yukle" in a:
                subprocess.run(["gh", "release", "upload", ETIKET, yol], check=True)  # --clobber YOK
                print(f"✔ Senaryo {v['konu']} yüklendi")


if __name__ == "__main__":
    main()
