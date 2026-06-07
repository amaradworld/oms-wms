#!/usr/bin/env python3
"""Generate favicons and OG image from logo.png using PIL."""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\alokg\oms-wms-app\frontend\public"
LOGO = os.path.join(ROOT, "logo.png")
NAVY = (15, 23, 42)
NAVY_DARK = (11, 18, 32)
TEAL = (20, 184, 166)
WHITE = (255, 255, 255)
MUTED = (148, 163, 184)
DIM = (100, 116, 139)


def make_resize(size, out_path):
    img = Image.open(LOGO).convert("RGBA")
    img = img.resize((size, size), Image.LANCZOS)
    img.save(out_path, "PNG", optimize=True)
    f = os.path.getsize(out_path)
    print(f"  -> {os.path.basename(out_path):<26} {size}x{size:<5}  {f:,} bytes")


def make_og(out_path):
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), NAVY)
    draw = ImageDraw.Draw(img)

    # Vertical gradient navy
    for y in range(H):
        t = y / H
        r = int(NAVY[0] * (1 - t) + NAVY_DARK[0] * t)
        g = int(NAVY[1] * (1 - t) + NAVY_DARK[1] * t)
        b = int(NAVY[2] * (1 - t) + NAVY_DARK[2] * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    # Teal accent bar at top
    draw.rectangle([(0, 0), (W, 6)], fill=TEAL)

    # Logo (max 380px wide, centered vertically, 80px from left)
    logo = Image.open(LOGO).convert("RGBA")
    max_w = 380
    ratio = max_w / logo.width
    new_size = (max_w, int(logo.height * ratio))
    logo = logo.resize(new_size, Image.LANCZOS)
    logo_y = (H - logo.height) // 2
    img.paste(logo, (80, logo_y), logo)

    # Try common font paths (Windows)
    font_paths = [
        r"C:\Windows\Fonts\segoeuib.ttf",   # Segoe UI Bold
        r"C:\Windows\Fonts\segoeui.ttf",    # Segoe UI
        r"C:\Windows\Fonts\arialbd.ttf",    # Arial Bold
        r"C:\Windows\Fonts\arial.ttf",     # Arial
    ]
    bold_path = next((p for p in font_paths if os.path.exists(p)), None)
    if not bold_path:
        raise RuntimeError("No usable font found")

    word_font = ImageFont.truetype(bold_path, 84)
    tag_font = ImageFont.truetype(bold_path, 32)
    small_font = ImageFont.truetype(bold_path, 22)
    foot_font = ImageFont.truetype(bold_path, 20)

    # Wordmark
    draw.text((500, 200), "SupplyHub", font=word_font, fill=WHITE)

    # Teal underline
    draw.rectangle([(500, 320), (620, 326)], fill=TEAL)

    # Tagline
    draw.text((500, 350), "Order & Warehouse Management", font=tag_font, fill=WHITE)
    draw.text((500, 395), "for Indian Ecommerce", font=tag_font, fill=WHITE)

    # Sub-line
    draw.text((500, 470),
              "Multi-tenant OMS + WMS  *  D2C  *  Marketplaces  *  3PLs",
              font=small_font, fill=MUTED)

    # Domain
    draw.text((80, 560), "globalsupply.in", font=foot_font, fill=DIM)

    img.save(out_path, "PNG", optimize=True)
    f = os.path.getsize(out_path)
    print(f"  -> {os.path.basename(out_path):<26} {W}x{H:<5}  {f:,} bytes")


if __name__ == "__main__":
    print("Generating favicons + OG image from logo.png\n")
    make_resize(32,  os.path.join(ROOT, "favicon-32.png"))
    make_resize(180, os.path.join(ROOT, "apple-touch-icon.png"))
    make_resize(192, os.path.join(ROOT, "favicon-192.png"))
    make_resize(512, os.path.join(ROOT, "logo-512.png"))
    make_og(os.path.join(ROOT, "og-image.png"))
    print("\nDone.")
