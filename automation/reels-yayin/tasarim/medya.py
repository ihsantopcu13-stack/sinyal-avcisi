"""Reels medya Release'leri: okuma iki Release'ten, yükleme yenisine.

GitHub bir Release'e en fazla 1000 dosya kabul ediyor. reels-medya-v1 24 Kas 2026'da doldu
(yeni yüklemeler HTTP 422). Yeni dosyalar reels-medya-v2'ye gider; okurken ikisine de bakılır.
Aynı ad iki Release'te varsa v1'deki kullanılır (eski dosyalara dokunulmaz).
"""
import subprocess

ETIKETLER = ["reels-medya-v1", "reels-medya-v2"]
YUKLEME_ETIKETI = "reels-medya-v2"
URL_KOK = "https://github.com/ihsantopcu13-stack/sinyal-avcisi/releases/download/"


def _gh(*arg, check=True):
    return subprocess.run(["gh", *arg], check=check, text=True, capture_output=True)


def varolan():
    """{dosya adı: Release etiketi} — iki Release'in tüm dosyaları."""
    sonuc = {}
    for etiket in ETIKETLER:
        r = _gh("release", "view", etiket, "--json", "assets", "-q", ".assets[].name", check=False)
        if r.returncode != 0:
            if etiket == ETIKETLER[0]:
                raise RuntimeError(f"{etiket} okunamadı: {r.stderr.strip()}")
            continue  # v2 henüz yok: ilk yüklemede açılır
        for ad in r.stdout.split():
            sonuc.setdefault(ad, etiket)
    return sonuc


def indir(ad, dizin, mevcut):
    _gh("release", "download", mevcut[ad], "-p", ad, "-D", dizin, "--clobber")


def yukle(yol):
    """Yeni Release'e yükler; Release yoksa açar. --clobber YOK: var olanın üzerine yazmaz."""
    if _gh("release", "view", YUKLEME_ETIKETI, check=False).returncode != 0:
        r = _gh("release", "create", YUKLEME_ETIKETI, "--title", "Reels medya v2",
                "--notes", "reels-medya-v1 1000 dosya sınırına ulaştı; yeni videolar burada.", check=False)
        if r.returncode != 0 and _gh("release", "view", YUKLEME_ETIKETI, check=False).returncode != 0:
            raise RuntimeError(f"{YUKLEME_ETIKETI} açılamadı: {r.stderr.strip()}")
    _gh("release", "upload", YUKLEME_ETIKETI, yol)


def url_adaylari(ad):
    """Ağdan doğrudan indirme için olası adresler (önce v1)."""
    return [URL_KOK + e + "/" + ad for e in ETIKETLER]
