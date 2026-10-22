#!/usr/bin/env python3
"""Tekrar turu videolarını üretir ve Release'e yükler.

kuyruk.json'da "tekrar" alanı olan her konu için (ör. konu 101 = konu 1'in tekrarı):
Release'te videosu yoksa asıl videoyu indirir, yenile.py ile yeni tasarıma çevirir ve
aynı Release'e yükler. Var olan dosyanın üzerine asla yazmaz.

Kullanım: tekrar_medya.py [--dene]   (--dene: yalnız ilk eksik konuyu üretir, yüklemez)
Gerekli: gh CLI (GH_TOKEN), ffmpeg, Pillow, DejaVu Sans Bold.
"""
import json, os, subprocess, sys, tempfile

KOK = os.path.dirname(os.path.abspath(__file__))
KUYRUK = os.path.join(KOK, "..", "data", "kuyruk.json")
ETIKET = "reels-medya-v1"
# Başlığı zaten Türkçe olan konulara "TUZAĞI" eklenmez
TUZAKSIZ = ("İskeleti", "Refleksi", "Yapılar", "Uyumu", "Tuzağı")

def gh(*arg, **kw):
    return subprocess.run(["gh", *arg], check=True, text=True, capture_output=True, **kw).stdout

def main():
    dene = "--dene" in sys.argv
    kuyruk = json.load(open(KUYRUK, encoding="utf-8"))
    varolan = set(gh("release", "view", ETIKET, "--json", "assets", "-q", ".assets[].name").split())
    eksik = [o for o in kuyruk["ogeler"] if "tekrar" in o and o["video"] not in varolan]
    print(f"{len(eksik)} tekrar videosu eksik")
    if dene: eksik = eksik[:1]
    cikti = os.environ.get("CIKTI_KLASORU") or tempfile.mkdtemp()
    os.makedirs(cikti, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for o in eksik:
            asil = next(x for x in kuyruk["ogeler"] if x["konu"] == o["tekrar"] and "tekrar" not in x)
            gh("release", "download", ETIKET, "-p", asil["video"], "-D", tmp, "--clobber")
            hedef = os.path.join(cikti, o["video"])
            bayrak = "--tuzaksiz" if any(w in o["baslik"] for w in TUZAKSIZ) else "--tuzak"
            subprocess.run([sys.executable, os.path.join(KOK, "yenile.py"),
                            os.path.join(tmp, asil["video"]), hedef, o["baslik"], bayrak],
                           check=True, stdin=subprocess.DEVNULL)
            if dene:
                print(f"deneme: {hedef} üretildi, yüklenmedi"); continue
            # --clobber YOK: aynı adda dosya varsa gh hata verir, üzerine yazılmaz
            gh("release", "upload", ETIKET, hedef)
            print(f"✔ Konu {o['konu']} ({o['baslik']}) → {o['video']} yüklendi")

if __name__ == "__main__":
    main()
