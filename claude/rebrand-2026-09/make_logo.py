"""Sodales — générateur de logo (v2 : glyphe A corrigé — bustes tronqués par la table).

Usage : python make_logo.py [previews|qa|final]
"""
import os
import sys
from collections import Counter
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SS = 4
NAVY = (8, 36, 71, 255)
GOLD = (200, 158, 80, 255)
WHITE = (255, 255, 255, 255)
IVORY = (245, 241, 233, 255)
DARK_BG = (43, 45, 49, 255)   # fond sombre type Discord

GLYPH = "A"

BASE = os.path.expanduser("~/work/virtualtable-rpg-audit/claude/rebrand-2026-09")
FONTS = f"{BASE}/fonts"
OUT = f"{BASE}/assets"
REF_LOCKUP = "/home/administrator/work/depenses-maison/sources/backend/app/static/brand/sumptus-lockup.png"


def S(v):
    return int(round(v * SS))


def draw_emblem(glyph=None, out_h=520, variant="standard"):
    glyph = glyph or GLYPH
    W, H = 400, 520
    small = variant in ("small", "tiny")
    tiny = variant == "tiny"
    beef = 1.75 if tiny else (1.5 if small else 1.0)
    im = Image.new("RGBA", (S(W), S(H)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    d.rounded_rectangle([0, 0, S(W) - 1, S(H) - 1], radius=S(58), fill=NAVY)
    inset = 26
    if not tiny:
        d.rounded_rectangle([S(inset), S(inset), S(W - inset) - 1, S(H - inset) - 1],
                            radius=S(40), outline=GOLD, width=S(12 if small else 8))

    cx = S(200)
    t = lambda v: S(v * beef)

    if glyph == "A":
        # --- trois compagnons (bustes) ---
        for xo in (-90, 0, 90):
            x = cx + S(xo)
            rr = S(43)  # dôme d'épaules
            d.pieslice([x - rr, S(220) - rr, x + rr, S(220) + rr], start=180, end=360, fill=GOLD)
            rh = S(24)  # tête
            d.ellipse([x - rh, S(156) - rh, x + rh, S(156) + rh], fill=GOLD)

        # --- table (union plateau + pieds) avec halo navy de séparation ---
        m = Image.new("L", im.size, 0)
        dm = ImageDraw.Draw(m)
        dm.rounded_rectangle([S(68), S(260), S(332), S(260) + t(20)], radius=t(10), fill=255)
        for xo in (-78, 78):
            x = cx + S(xo)
            dm.rounded_rectangle([x - t(4.5), S(274), x + t(4.5), S(390)], radius=t(4.5), fill=255)
        gap_px = int(round(6 * SS))
        halo = m.filter(ImageFilter.MaxFilter(2 * gap_px + 1))
        im.paste(Image.new("RGBA", im.size, NAVY), (0, 0), halo)
        im.paste(Image.new("RGBA", im.size, GOLD), (0, 0), m)

    elif glyph == "B":
        # --- table ronde vue de dessus + trois places détachées + dé ---
        import math
        rc = S(270)
        r_in = S(104)
        r_out = S(104) + t(15)
        d.ellipse([cx - r_out, rc - r_out, cx + r_out, rc + r_out], fill=GOLD)
        d.ellipse([cx - r_in, rc - r_in, cx + r_in, rc + r_in], fill=NAVY)
        for ang in (90, 210, 330):
            a = math.radians(ang)
            x = cx + int(round(142 * math.cos(a) * SS))
            y = rc - int(round(142 * math.sin(a) * SS))
            rn = t(19)
            d.ellipse([x - rn, y - rn, x + rn, y + rn], fill=GOLD)
        hs = S(26)
        d.rounded_rectangle([cx - hs, rc - hs, cx + hs, rc + hs], radius=S(13), fill=GOLD)
        for (dx_, dy_) in ((-12, -12), (0, 0), (12, 12)):
            rp = S(4.6)
            x, y = cx + S(dx_), rc + S(dy_)
            d.ellipse([x - rp, y - rp, x + rp, y + rp], fill=NAVY)

    return im.resize((int(W * out_h / H), out_h), Image.LANCZOS)


# ---------------------------------------------------------------- textes
def font(path, size, weight=None, axes=None):
    f = ImageFont.truetype(path, size)
    if axes:
        f.set_variation_by_axes(axes)
    elif weight:
        try:
            f.set_variation_by_name(weight)
        except Exception as e:
            print("WARN", weight, e)
    return f


def text_img(text, font_path, size, weight, tracking, fill, axes=None):
    f = font(font_path, size * SS, weight, axes)
    tr = tracking * SS
    probe = Image.new("RGBA", (10, 10))
    pd = ImageDraw.Draw(probe)
    widths = [pd.textlength(ch, font=f) for ch in text]
    total = int(sum(widths) + tr * (len(text) - 1)) + size * SS
    tmp = Image.new("RGBA", (total + 50, size * SS * 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    x = 0
    for ch, w in zip(text, widths):
        d.text((x, size * SS), ch, font=f, fill=fill)
        x += w + tr
    return tmp.crop(tmp.getbbox())


def stem_mode(img):
    px = img.load()
    w, h = img.size
    runs = []
    for y in range(int(h * 0.35), int(h * 0.6), 2):
        run = 0
        for x in range(w):
            if px[x, y][3] > 150:
                run += 1
            else:
                if 4 <= run <= 22:
                    runs.append(run)
                run = 0
    c = Counter(runs)
    return c.most_common(1)[0][0] if c else 0


def build_lockup(glyph=None, wm_color=NAVY, emblem_h=560, content_w=660):
    glyph = glyph or GLYPH
    em = draw_emblem(glyph, emblem_h)
    wm = text_img("SODALES", f"{FONTS}/Montserrat.ttf", 100, None, 4, wm_color, axes=[550])
    wm = wm.resize((int(wm.width * 72 / wm.height), 72), Image.LANCZOS)
    if wm.width > 545:
        wm = wm.resize((545, int(wm.height * 545 / wm.width)), Image.LANCZOS)
    print("  stem wordmark:", stem_mode(wm), "px (cible 11)")

    cap = 21
    tag = text_img("DATA SOVEREIGNTY", f"{FONTS}/Montserrat.ttf", 30, "Regular", 6.6, GOLD)
    tag = tag.resize((int(tag.width * cap / tag.height), cap), Image.LANCZOS)

    margin = 14
    w = max(em.width, wm.width, content_w)
    gap1, gap2 = 56, 34
    h = em.height + gap1 + wm.height + gap2 + tag.height
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    im.paste(em, ((w - em.width) // 2, 0), em)
    im.paste(wm, ((w - wm.width) // 2, em.height + gap1), wm)
    ty = em.height + gap1 + wm.height + gap2
    im.paste(tag, ((w - tag.width) // 2, ty), tag)

    d = ImageDraw.Draw(im)
    rule_len, rule_gap, rule_w = 101, 28, 4
    mid = ty + tag.height // 2
    for side in (-1, 1):
        x_inner = w // 2 + side * (tag.width // 2 + rule_gap)
        x_outer = x_inner + side * rule_len
        d.rectangle([min(x_inner, x_outer), mid - rule_w // 2, max(x_inner, x_outer), mid + rule_w // 2], fill=GOLD)

    canvas = Image.new("RGBA", (w + 2 * margin, h + 2 * margin), (0, 0, 0, 0))
    canvas.paste(im, (margin, margin), im)
    print(f"lockup={canvas.size} wm={wm.size} tag={tag.size}")
    return canvas


def flatten(img, bg):
    c = Image.new("RGBA", img.size, bg)
    c.paste(img, (0, 0), img)
    return c.convert("RGB")


# ---------------------------------------------------------------- aperçus
def previews():
    os.makedirs(f"{OUT}/qa", exist_ok=True)
    for glyph in ("A", "B"):
        em = draw_emblem(glyph, 520)
        strip = Image.new("RGBA", (1150, 620), WHITE)
        strip.paste(em, (20, 40), em)
        i128 = em.resize((int(em.width * 128 / em.height), 128), Image.LANCZOS)
        strip.paste(i128, (730, 40), i128)
        i32 = em.resize((int(em.width * 32 / em.height), 32), Image.LANCZOS)
        strip.paste(i32, (730, 220), i32)
        z = i32.resize((i32.width * 6, i32.height * 6), Image.NEAREST)
        strip.paste(z, (730, 280), z)
        strip.convert("RGB").save(f"{OUT}/qa/prev-{glyph}.png")
    print("previews OK")


def qa():
    os.makedirs(f"{OUT}/qa", exist_ok=True)
    lk = build_lockup()
    lk.save(f"{OUT}/qa/41-lockup.png")
    lkd = build_lockup(wm_color=IVORY)
    lkd.save(f"{OUT}/qa/41-lockup-dark.png")

    # comparatif famille à LARGEUR DE CONTENU égale (430 px)
    try:
        fam = Image.open(REF_LOCKUP).convert("RGBA")
        f = 430 / fam.width
        fam = fam.resize((int(fam.width * f), int(fam.height * f)), Image.LANCZOS)
        mine = lk.resize((430, int(lk.height * 430 / lk.width)), Image.LANCZOS)
        for bgname, bg in [("white", WHITE), ("navy", NAVY)]:
            sheet = Image.new("RGBA", (1100, max(fam.height, mine.height) + 40), bg)
            sheet.paste(fam, (60, 20), fam)
            sheet.paste(mine, (600, 20), mine)
            sheet.convert("RGB").save(f"{OUT}/qa/42-cmp-{bgname}.png")
    except Exception as e:
        print("cmp ref KO:", e)

    for vname, variant in [("std", "standard"), ("small", "small"), ("tiny", "tiny")]:
        em = draw_emblem(GLYPH, 520, variant)
        strip = Image.new("RGBA", (1500, 330), WHITE)
        x = 20
        for hpx in (16, 24, 32, 48, 64, 128):
            ic = em.resize((int(em.width * hpx / em.height), hpx), Image.LANCZOS)
            strip.paste(ic, (x, 20), ic)
            z = ic.resize((ic.width * 5, ic.height * 5), Image.NEAREST)
            strip.paste(z, (x, 60), z)
            x += max(z.width, 120) + 25
        strip.convert("RGB").save(f"{OUT}/qa/43-icons-{vname}.png")

    em = draw_emblem(GLYPH, 520)
    em.resize((em.width * 2, em.height * 2), Image.LANCZOS).crop((200, 200, 3000, 2600)).save(f"{OUT}/qa/44-zoom.png")

    # planche tailles réelles sur fonds blanc / sombre
    f = 360 / lk.width
    lk_s = lk.resize((360, int(lk.height * f)), Image.LANCZOS)
    lkd_s = lkd.resize((360, int(lkd.height * f)), Image.LANCZOS)
    sheet = Image.new("RGBA", (860, lk_s.height + 40), WHITE)
    sheet.paste(lk_s, (40, 20), lk_s)
    dk = Image.new("RGBA", (400, lk_s.height + 40), DARK_BG)
    dk.paste(lkd_s, (20, 20), lkd_s)
    sheet.paste(dk, (450, 0), dk)
    sheet.convert("RGB").save(f"{OUT}/qa/45-real-light-dark.png")
    print("QA OK")


def final_assets():
    fin = f"{OUT}/final"
    os.makedirs(fin, exist_ok=True)
    build_lockup().save(f"{fin}/sodales-lockup.png")
    build_lockup(wm_color=IVORY).save(f"{fin}/sodales-lockup-dark.png")

    em_std = draw_emblem(GLYPH, 400)
    ic = Image.new("RGBA", (em_std.width + 20, em_std.height + 20), (0, 0, 0, 0))
    ic.paste(em_std, (10, 10), em_std)
    ic.save(f"{fin}/sodales-icon.png")

    em_small = draw_emblem(GLYPH, 520, "small")
    em_tiny = draw_emblem(GLYPH, 520, "tiny")
    em_big = draw_emblem(GLYPH, 520)

    def icon(variant, h):
        em = {"std": em_big, "small": em_small, "tiny": em_tiny}[variant]
        return em.resize((int(em.width * h / em.height), h), Image.LANCZOS)

    def square(img, n):
        c = Image.new("RGBA", (n, n), (0, 0, 0, 0))
        c.paste(img, ((n - img.width) // 2, (n - img.height) // 2), img)
        return c

    f64 = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    i62 = icon("small", 62)
    f64.paste(i62, ((64 - i62.width) // 2, 1), i62)
    f64.save(f"{fin}/favicon.png")
    for hpx, v in ((16, "tiny"), (32, "tiny"), (48, "small")):
        square(icon(v, hpx), hpx).save(f"{fin}/ico-{hpx}.png")
    at = Image.new("RGBA", (180, 180), WHITE)
    i138 = icon("small", 138)
    at.paste(i138, ((180 - i138.width) // 2, (180 - 138) // 2), i138)
    at.save(f"{fin}/apple-touch-icon.png")
    print("assets finaux écrits dans", fin)


if __name__ == "__main__":
    if "previews" in sys.argv:
        previews()
    elif "qa" in sys.argv:
        qa()
    elif "final" in sys.argv:
        final_assets()
    else:
        previews()
