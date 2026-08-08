#!/usr/bin/env python3
"""Generate legacy (pre-26) launcher PNGs for BLCKBOLT Browser."""
from PIL import Image, ImageDraw
import os

SIZES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
BG = (34, 34, 34, 255)
YELLOW = (255, 214, 0, 255)
WHITE = (255, 255, 255, 255)
BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app/src/main/res")


def draw_icon(size):
    img = Image.new("RGBA", (size, size), BG)
    d = ImageDraw.Draw(img)
    s = size / 64.0
    # bolt polygon (from icon.svg path)
    pts = [(32, 8), (40, 32), (28, 32), (36, 56), (24, 32), (36, 32)]
    poly = [(x * s, y * s) for x, y in pts]
    d.polygon(poly, fill=YELLOW, outline=WHITE, width=max(1, int(2 * s)))
    # outer circle
    r = 30 * s
    c = 32 * s
    box = [c - r, c - r, c + r, c + r]
    d.arc(box, start=0, end=360, fill=YELLOW, width=max(1, int(2 * s)))
    return img


for dpi, size in SIZES.items():
    out_dir = os.path.join(BASE, f"mipmap-{dpi}")
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, "ic_launcher.png")
    draw_icon(size).save(out, "PNG")
    print(f"wrote {out}")

