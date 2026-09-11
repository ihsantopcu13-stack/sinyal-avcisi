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
from moviepy import AudioFileClip, ColorClip, CompositeVideoClip, TextClip

WIDTH, HEIGHT = 1080, 1920
FPS = 30

WORD_FONT_SIZE = 130
WORD_COLOR = "#FACC15"  # sarı
WORD_STROKE_COLOR = "black"
WORD_STROKE_WIDTH = 6
POP_DURATION = 0.15  # kelime çıkarken "vurma" animasyonu süresi (sn)
POP_START_SCALE = 1.35

WATERMARK_TEXT = "George - Sinyal Avcısı"
WATERMARK_FONT_SIZE = 34
WATERMARK_COLOR = "white"
WATERMARK_MARGIN = 40

DEFAULT_FONT = r"C:\Windows\Fonts\arialbd.ttf"


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
    parser = argparse.ArgumentParser(description="mp3 + script -> kelime kelime senkronize 9:16 video")
    parser.add_argument("--audio", required=True, help="Ses dosyası (mp3)")
    parser.add_argument("--script", required=True, help="Script metni (txt dosyası)")
    parser.add_argument("--output", required=True, help="Çıktı video (mp4)")
    parser.add_argument("--model", default="medium", help="Whisper model boyutu: tiny/base/small/medium/large")
    parser.add_argument("--language", default="tr", help="Ses dili (whisper dil kodu)")
    parser.add_argument("--font", default=DEFAULT_FONT, help="TTF/OTF font dosya yolu")
    args = parser.parse_args()

    if not Path(args.font).exists():
        sys.exit(f"HATA: font dosyası bulunamadı: {args.font}")
    if not Path(args.audio).exists():
        sys.exit(f"HATA: ses dosyası bulunamadı: {args.audio}")
    if not Path(args.script).exists():
        sys.exit(f"HATA: script dosyası bulunamadı: {args.script}")

    whisper_words = transcribe_words(args.audio, args.model, args.language)
    if not whisper_words:
        sys.exit("HATA: whisper hiç kelime tespit edemedi.")

    script_words = load_script_words(args.script)
    print(f"Script'te {len(script_words)} kelime var.")

    words = align_script_to_timestamps(script_words, whisper_words)
    build_video(words, args.audio, args.output, args.font)
    print(f"Tamamlandı: {args.output}")


if __name__ == "__main__":
    main()
