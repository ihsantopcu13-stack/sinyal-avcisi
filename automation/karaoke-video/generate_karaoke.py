#!/usr/bin/env python3
"""
generate_karaoke.py — mp3 + script metni -> kelime kelime senkronize 9:16 video.

Kullanım:
    python generate_karaoke.py --audio narration.mp3 --script script.txt --output out.mp4

Gereksinimler: pip install -r requirements.txt (moviepy, openai-whisper) + sistemde ffmpeg.
Whisper, sesteki kelimelerin ZAMANLAMASINI (start/end) tespit eder; ekranda gösterilen
metin olarak --script dosyasındaki temiz kelimeler kullanılır (indeks bazlı eşleştirme).
Kelime sayıları uyuşmazsa (whisper'ın kaçırdığı/fazladan duyduğu kelimeler olabilir)
whisper'ın kendi transkripsiyonuna geri düşülür ve bir uyarı basılır.
"""

import argparse
import sys
from pathlib import Path

# Windows konsolu varsayılan olarak UTF-8 kullanmayabilir, Türkçe karakterler
# (ı/ş/ğ/ö/ü/ç) terminalde bozuk görünür — dosyaya yazılan/videodaki metni
# etkilemez, sadece print() çıktısını düzeltir.
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

import whisper
from moviepy import AudioFileClip, ColorClip, CompositeVideoClip, TextClip, concatenate_audioclips
from moviepy.audio.AudioClip import AudioClip

WIDTH, HEIGHT = 1080, 1920
FPS = 30

WORD_FONT_SIZE = 100
WORD_COLOR = "#FACC15"  # sarı
WORD_STROKE_COLOR = "black"
WORD_STROKE_WIDTH = 6
# Türkçe alt-uzantılı harfler (ç/ş/ğ) + kalın stroke, dar bbox'ta kesilebiliyor —
# margin bu boşluğu ekliyor (yatay, dikey).
WORD_MARGIN = (30, 40)
POP_DURATION = 0.15  # kelime çıkarken "vurma" animasyonu süresi (sn)
POP_START_SCALE = 1.35
MIN_WORD_DURATION = 0.45  # her kelime en az bu kadar ekranda kalsın (sn)

WATERMARK_TEXT = "George - Sinyal Avcısı"
WATERMARK_FONT_SIZE = 34
WATERMARK_COLOR = "white"
WATERMARK_MARGIN = 40

DEFAULT_FONT = r"C:\Windows\Fonts\arialbd.ttf"

# --- "cards" modu (sinyal / örnek cümle / çeviri, 3 satır bir arada) ---
CARD_SIGNAL_FONT_SIZE = 92
CARD_SIGNAL_COLOR = "#FACC15"
CARD_EXAMPLE_FONT_SIZE = 52
CARD_EXAMPLE_COLOR = "white"
CARD_TRANSLATION_FONT_SIZE = 52
CARD_TRANSLATION_COLOR = "#FACC15"
CARD_STROKE_WIDTH = 4
CARD_LINE_GAP = 36
CARD_TEXT_WIDTH = WIDTH - 160  # kenar boşluğu, satır kaydırma (wrap) için
CARD_AUDIO_GAP = 0.35  # her satır sesi arasına eklenen doğal duraklama (sn)


def transcribe_words(audio_path: str, model_size: str, language: str):
    print(f"Whisper ({model_size}) ile ses analiz ediliyor...")
    model = whisper.load_model(model_size)
    result = model.transcribe(audio_path, word_timestamps=True, language=language)
    words = []
    for segment in result["segments"]:
        for w in segment.get("words", []):
            text = w["word"].strip()
            if text:
                words.append({"text": text, "start": w["start"], "end": w["end"]})
    print(f"  {len(words)} kelime tespit edildi.")
    return words


def load_script_words(script_path: str):
    text = Path(script_path).read_text(encoding="utf-8")
    return text.split()


def align_script_to_timestamps(script_words, whisper_words):
    if len(script_words) == len(whisper_words):
        return [
            {"text": sw, "start": ww["start"], "end": ww["end"]}
            for sw, ww in zip(script_words, whisper_words)
        ]
    print(
        f"UYARI: script kelime sayısı ({len(script_words)}) whisper kelime sayısından "
        f"({len(whisper_words)}) farklı — ekranda whisper'ın kendi transkripsiyonu gösterilecek.",
        file=sys.stderr,
    )
    return whisper_words


def enforce_minimum_duration(words, min_duration: float):
    """Her kelimeyi en az min_duration kadar ekranda tut — whisper'ın tespit
    ettiği doğal süre daha kısaysa uzat. Bir sonraki kelimenin başlangıcını
    geçmeyecek şekilde sınırlanır (üst üste binme olmasın diye); çok hızlı
    art arda gelen kelimelerde bu sınır min_duration'ın altına düşebilir,
    bu durumda mevcut boşluğun tamamı kullanılır."""
    adjusted = []
    for i, w in enumerate(words):
        start, end = w["start"], w["end"]
        desired_end = max(end, start + min_duration)
        if i + 1 < len(words):
            desired_end = min(desired_end, words[i + 1]["start"])
        adjusted.append({"text": w["text"], "start": start, "end": max(desired_end, start + 0.05)})
    return adjusted


def parse_card_groups(script_path: str):
    """Boş satırla ayrılmış gruplar, her grup TAM 3 satır: sinyal / İngilizce
    örnek cümle / Türkçe çevirisi."""
    text = Path(script_path).read_text(encoding="utf-8")
    blocks = [b.strip() for b in text.split("\n\n") if b.strip()]
    groups = []
    for block in blocks:
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        if len(lines) != 3:
            sys.exit(
                f"HATA: script'te bir grup 3 satır değil (sinyal/örnek/çeviri), "
                f"{len(lines)} satır bulundu: {lines!r}"
            )
        groups.append({"signal": lines[0], "example": lines[1], "translation": lines[2]})
    if not groups:
        sys.exit("HATA: script'te (cards modu) hiç grup bulunamadı — boş satırla ayrılmış 3'er satırlık gruplar olmalı.")
    return groups


def flat_card_lines(groups):
    """15 satırı (5 grup x 3 satır) sırayla düz bir liste olarak döner —
    dıştaki TTS üretim script'i bu sırayla line_000.mp3, line_001.mp3, ...
    dosyalarını üretmeli."""
    lines = []
    for g in groups:
        lines += [g["signal"], g["example"], g["translation"]]
    return lines


def silent_clip(duration: float):
    return AudioClip(lambda t: 0, duration=duration)


def load_card_audio_and_timing(groups, audio_dir: str):
    """Whisper KULLANMAZ — her satır için ayrı üretilmiş mp3'ün gerçek
    süresini (ffprobe/moviepy) doğrudan ölçüp zamanlamayı bundan hesaplar.
    Karışık dilli (TR/EN) tek bir sesi whisper'a transkript ettirmenin
    (dil karışıklığında tamamen yanlış kelime sayısı/metin üretmesi)
    önüne geçer — bkz. 2026-09-11 carousel denemesi."""
    audio_dir = Path(audio_dir)
    clips = []
    cursor = 0.0
    cards = []
    line_idx = 0
    for g in groups:
        line_starts = {}
        for key in ("signal", "example", "translation"):
            line_path = audio_dir / f"line_{line_idx:03d}.mp3"
            if not line_path.exists():
                sys.exit(f"HATA: ses dosyası bulunamadı: {line_path} (--print-lines ile üretilen satır sırasına göre isimlendirilmeli)")
            clip = AudioFileClip(str(line_path))
            clips.append(clip)
            line_starts[key] = cursor
            cursor += clip.duration
            clips.append(silent_clip(CARD_AUDIO_GAP))
            cursor += CARD_AUDIO_GAP
            line_idx += 1
        cards.append({
            "signal": g["signal"], "example": g["example"], "translation": g["translation"],
            "signal_start": line_starts["signal"],
            "example_start": line_starts["example"],
            "translation_start": line_starts["translation"],
            "group_end": cursor,
        })
    full_audio = concatenate_audioclips(clips)
    return cards, full_audio


def build_cards_video(cards, audio_clip, output_path: str, font: str):
    duration = audio_clip.duration

    background = ColorClip(size=(WIDTH, HEIGHT), color=(0, 0, 0), duration=duration)
    watermark = (
        TextClip(font=font, text=WATERMARK_TEXT, font_size=WATERMARK_FONT_SIZE, color=WATERMARK_COLOR, method="label")
        .with_position((WATERMARK_MARGIN, WATERMARK_MARGIN))
        .with_duration(duration)
    )

    layers = [background, watermark]
    for c in cards:
        group_end = min(c["group_end"], duration)

        signal_clip = (
            TextClip(font=font, text=c["signal"].upper(), font_size=CARD_SIGNAL_FONT_SIZE, color=CARD_SIGNAL_COLOR,
                      stroke_color="black", stroke_width=CARD_STROKE_WIDTH, method="label", margin=(20, 30))
            .with_start(c["signal_start"]).with_duration(max(group_end - c["signal_start"], 0.1))
        )
        example_clip = (
            TextClip(font=font, text=c["example"], font_size=CARD_EXAMPLE_FONT_SIZE, color=CARD_EXAMPLE_COLOR,
                      stroke_color="black", stroke_width=2, method="caption", size=(CARD_TEXT_WIDTH, None),
                      text_align="center", margin=(10, 20))
            .with_start(c["example_start"]).with_duration(max(group_end - c["example_start"], 0.1))
        )
        translation_clip = (
            TextClip(font=font, text=c["translation"], font_size=CARD_TRANSLATION_FONT_SIZE, color=CARD_TRANSLATION_COLOR,
                      stroke_color="black", stroke_width=2, method="caption", size=(CARD_TEXT_WIDTH, None),
                      text_align="center", margin=(10, 20))
            .with_start(c["translation_start"]).with_duration(max(group_end - c["translation_start"], 0.1))
        )

        total_h = signal_clip.h + CARD_LINE_GAP + example_clip.h + CARD_LINE_GAP + translation_clip.h
        top = (HEIGHT - total_h) // 2
        signal_clip = signal_clip.with_position(("center", top))
        example_clip = example_clip.with_position(("center", top + signal_clip.h + CARD_LINE_GAP))
        translation_clip = translation_clip.with_position(
            ("center", top + signal_clip.h + CARD_LINE_GAP + example_clip.h + CARD_LINE_GAP)
        )
        layers += [signal_clip, example_clip, translation_clip]

    video = CompositeVideoClip(layers, size=(WIDTH, HEIGHT)).with_audio(audio_clip)
    print(f"Video render ediliyor -> {output_path}")
    video.write_videofile(output_path, fps=FPS, codec="libx264", audio_codec="aac")


def pop_scale(t):
    if t >= POP_DURATION:
        return 1.0
    progress = t / POP_DURATION
    return POP_START_SCALE - (POP_START_SCALE - 1.0) * progress


def build_video(words, audio_path: str, output_path: str, font: str):
    audio = AudioFileClip(audio_path)
    duration = audio.duration

    background = ColorClip(size=(WIDTH, HEIGHT), color=(0, 0, 0), duration=duration)

    watermark = (
        TextClip(
            font=font,
            text=WATERMARK_TEXT,
            font_size=WATERMARK_FONT_SIZE,
            color=WATERMARK_COLOR,
            method="label",
        )
        .with_position((WATERMARK_MARGIN, WATERMARK_MARGIN))
        .with_duration(duration)
    )

    layers = [background, watermark]
    for w in words:
        start, end = w["start"], w["end"]
        if end <= start:
            continue
        clip = (
            TextClip(
                font=font,
                text=w["text"].upper(),
                font_size=WORD_FONT_SIZE,
                color=WORD_COLOR,
                stroke_color=WORD_STROKE_COLOR,
                stroke_width=WORD_STROKE_WIDTH,
                method="label",
                margin=WORD_MARGIN,
            )
            .with_start(start)
            .with_duration(end - start)
            .with_position(("center", "center"))
            .resized(pop_scale)
        )
        layers.append(clip)

    video = CompositeVideoClip(layers, size=(WIDTH, HEIGHT)).with_audio(audio)
    print(f"Video render ediliyor -> {output_path}")
    video.write_videofile(output_path, fps=FPS, codec="libx264", audio_codec="aac")


def main():
    parser = argparse.ArgumentParser(description="mp3 + script -> senkronize 9:16 video")
    parser.add_argument("--audio", help="(word modu) Ses dosyası (mp3)")
    parser.add_argument("--audio-dir", help="(cards modu) --print-lines sırasına göre line_000.mp3, line_001.mp3, ... içeren klasör")
    parser.add_argument("--script", required=True, help="Script metni (txt dosyası)")
    parser.add_argument("--output", help="Çıktı video (mp4) — --print-lines ile birlikte gerekmez")
    parser.add_argument("--model", default="medium", help="(word modu) Whisper model boyutu: tiny/base/small/medium/large")
    parser.add_argument("--language", default="tr", help="(word modu) Ses dili (whisper dil kodu)")
    parser.add_argument("--font", default=DEFAULT_FONT, help="TTF/OTF font dosya yolu")
    parser.add_argument("--mode", choices=["word", "cards"], default="word",
                         help="word: kelime kelime akış, whisper ile senkronize (varsayılan). "
                              "cards: sinyal/örnek/çeviri 3 satır bir arada — whisper KULLANMAZ, "
                              "her satır için ayrı üretilmiş sesin gerçek süresine göre zamanlar "
                              "(karışık dilli içerikte whisper transkripsiyonu güvenilmez).")
    parser.add_argument("--print-lines", action="store_true",
                         help="(cards modu) script'teki her satırı (sinyal/örnek/çeviri) sırayla, birer satır halinde yazdırır ve çıkar — "
                              "her satır için ayrı ayrı TTS üretip line_000.mp3, line_001.mp3, ... olarak kaydedin, sonra --audio-dir ile video üretin")
    args = parser.parse_args()

    if not Path(args.script).exists():
        sys.exit(f"HATA: script dosyası bulunamadı: {args.script}")

    if args.print_lines:
        if args.mode != "cards":
            sys.exit("HATA: --print-lines sadece --mode cards ile kullanılır.")
        groups = parse_card_groups(args.script)
        for line in flat_card_lines(groups):
            print(line)
        return

    if not args.output:
        sys.exit("HATA: --output gerekli (--print-lines kullanmıyorsanız).")
    if not Path(args.font).exists():
        sys.exit(f"HATA: font dosyası bulunamadı: {args.font}")

    if args.mode == "cards":
        if not args.audio_dir:
            sys.exit("HATA: --mode cards için --audio-dir gerekli (bkz. --print-lines).")
        groups = parse_card_groups(args.script)
        cards, audio_clip = load_card_audio_and_timing(groups, args.audio_dir)
        build_cards_video(cards, audio_clip, args.output, args.font)
    else:
        if not args.audio:
            sys.exit("HATA: --mode word için --audio gerekli.")
        if not Path(args.audio).exists():
            sys.exit(f"HATA: ses dosyası bulunamadı: {args.audio}")
        whisper_words = transcribe_words(args.audio, args.model, args.language)
        if not whisper_words:
            sys.exit("HATA: whisper hiç kelime tespit edemedi.")
        script_words = load_script_words(args.script)
        print(f"Script'te {len(script_words)} kelime var.")
        words = align_script_to_timestamps(script_words, whisper_words)
        words = enforce_minimum_duration(words, MIN_WORD_DURATION)
        build_video(words, args.audio, args.output, args.font)

    print(f"Tamamlandı: {args.output}")


if __name__ == "__main__":
    main()
