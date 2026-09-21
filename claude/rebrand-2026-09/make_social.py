"""Sodales — carte sociale 1280×640 (v2 : emblème propre et centré, textes rééquilibrés).
Usage : python make_social.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

NAVY = (8, 36, 71, 255)
NAVY_BG = (9, 22, 42, 255)
GOLD = (200, 158, 80, 255)
OFFWHITE = (229, 231, 235, 255)
GREY = (166, 176, 192, 255)

BASE = os.path.expanduser("~/work/virtualtable-rpg-audit/claude/rebrand-2026-09")
FONTS = f"{BASE}/fonts"
SS = 4  # travail à ×4 puis downscale global


def text_img(s, size_px, weight_axes, tracking, fill):
    f = ImageFont.truetype(f"{FONTS}/Montserrat.ttf", size_px * SS)
    f.set_variation_by_axes(weight_axes)
    tr = tracking * SS
    probe = ImageDraw.Draw(Image.new("RGBA", (4, 4)))
    widths = [probe.textlength(ch, font=f) for ch in s]
    total = int(sum(widths) + tr * (len(s) - 1)) + size_px * SS
    tmp = Image.new("RGBA", (total + 60, size_px * SS * 3), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    x = 0
    for ch, w in zip(s, widths):
        d.text((x, size_px * SS), ch, font=f, fill=fill)
        x += w + tr
    return tmp.crop(tmp.getbbox())


def glyph_sodales():
    """Glyphe 'trois compagnons à la table' sur fond transparent (repères du générateur de logo)."""
    W, H = 400, 520
    im = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    def S(v):
        return int(round(v * SS))

    beef = 1.15
    t = lambda v: S(v * beef)
    cx = S(200)
    for xo in (-90, 0, 90):
        x = cx + S(xo)
        rr = S(43)
        d.pieslice([x - rr, S(220) - rr, x + rr, S(220) + rr], start=180, end=360, fill=GOLD)
        rh = S(24)
        d.ellipse([x - rh, S(156) - rh, x + rh, S(156) + rh], fill=GOLD)
    d.rounded_rectangle([S(68), S(260), S(332), S(260) + t(20)], radius=t(10), fill=GOLD)
    for xo in (-78, 78):
        x = cx + S(xo)
        d.rounded_rectangle([x - t(4.5), S(274), x + t(4.5), S(390)], radius=t(4.5), fill=GOLD)
    return im


def main():
    W, H = 1280, 640
    im = Image.new("RGBA", (W * SS, H * SS), NAVY_BG)
    d = ImageDraw.Draw(im)

    def S(v):
        return int(round(v * SS))

    # ── badge squircle gauche (un seul cadre or, pas de double anneau)
    sq_x, sq_y, sq_w = 100, 110, 420
    d.rounded_rectangle([S(sq_x), S(sq_y), S(sq_x + sq_w), S(sq_y + sq_w)], radius=S(96), fill=NAVY)
    d.rounded_rectangle([S(sq_x + 26), S(sq_y + 26), S(sq_x + sq_w - 26), S(sq_y + sq_w - 26)],
                        radius=S(74), outline=GOLD, width=S(6))

    glyph = glyph_sodales()
    g = glyph.crop(glyph.getbbox())
    target_h = 270 * SS  # hauteur du glyphe en px de la carte (converti en px canvas)
    g = g.resize((int(g.width * target_h / g.height), target_h), Image.LANCZOS)
    gx = S(sq_x + sq_w // 2) - g.width // 2
    gy = S(sq_y + sq_w // 2) - g.height // 2
    im.alpha_composite(g, (gx, gy))

    # ── bloc texte droit
    tx = 600
    title = text_img("SODALES", 86, [640], 6, GOLD)
    sub = text_img("Self-hosted virtual tabletop for RPGs", 27, [420], 0.6, OFFWHITE)
    meta = text_img("Maps · Tokens · Sheets · Dice · Chat", 23, [450], 0.8, GREY)

    block_h = (title.height + sub.height + meta.height) // SS + 66 + 40
    y = (H - block_h) // 2 + 8
    for img, gap in ((title, 40), (sub, 26)):
        layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
        layer.alpha_composite(img, (S(tx), S(y)))
        im.alpha_composite(layer)
        y += img.height // SS + gap
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    layer.alpha_composite(meta, (S(tx), S(y)))
    im.alpha_composite(layer)

    out = f"{BASE}/assets/sodales-social.png"
    im.resize((W, H), Image.LANCZOS).convert("RGB").save(out)
    print("saved", out)


if __name__ == "__main__":
    main()
