r"""
Build the Book's handwriting font from Steve's Calligraphr export.

    python3 tools/build-hand-font.py

Reads tools/fonts/steve-hand-source.ttf and writes src/assets/fonts/steve-hand.woff2.
Characters Steve hasn't drawn are assembled from strokes he did draw, the way
font makers build accented letters: nothing here is drawn by a computer.

    ꓘ   his K, mirrored (strikeout looking)
    –   his hyphen, stretched (scores like 13–7)
    +   two of his hyphens, crossed
    #   two of his slashes and two of his hyphens
    • · his period, raised to the middle of the line (• a little bigger)
    ① ② ③  his digits inside his O
    é á í ó ú É Á Í Ó Ú  his letters with his apostrophe tipped into an accent
    ü ö Ü Ö  his letters with two of his periods
    ñ Ñ  his letters with his S turned on its side
    |   his lowercase l, stretched to a full-height line
    \   his slash, mirrored
    ✕ × his slash crossed with a mirrored copy (× a little smaller)
    →   his hyphen with two of his slashes, small, for the head
    *   three of his hyphens, crossed
    𝍷 𝍸  tally marks: his l, short; five is four of them with his slash across

Anything Steve draws himself (in a new export) always wins over a built one.
CHARACTER_SOURCES below lists where every built character came from; the
alphabet preview reads it.

Needs: pip install "fonttools[woff]"
"""
import json
import math
from pathlib import Path

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.reverseContourPen import ReverseContourPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "tools/fonts/steve-hand-source.ttf"
OUT = ROOT / "src/assets/fonts/steve-hand.woff2"
MANIFEST = ROOT / "tools/fonts/steve-hand-built.json"

font = TTFont(SOURCE)
glyf, hmtx = font["glyf"], font["hmtx"]
cmap = dict(font.getBestCmap())  # a copy: the best table's own dict only reaches U+FFFF
SOURCE_CHARS = set(cmap)
glyph_set = font.getGlyphSet()
CHARACTER_SOURCES = {}

# ---- 2D affine matrices (a, b, c, d, e, f): x' = a x + c y + e, y' = b x + d y + f ----


def mat(a=1, b=0, c=0, d=1, e=0, f=0):
    return (a, b, c, d, e, f)


def then(first, second):
    """Apply `first`, then `second`."""
    a1, b1, c1, d1, e1, f1 = first
    a2, b2, c2, d2, e2, f2 = second
    return (
        a2 * a1 + c2 * b1,
        b2 * a1 + d2 * b1,
        a2 * c1 + c2 * d1,
        b2 * c1 + d2 * d1,
        a2 * e1 + c2 * f1 + e2,
        b2 * e1 + d2 * f1 + f2,
    )


def move(dx, dy):
    return mat(e=dx, f=dy)


def scale(sx, sy=None):
    return mat(a=sx, d=sx if sy is None else sy)


def turn(degrees):
    r = math.radians(degrees)
    return mat(a=math.cos(r), b=math.sin(r), c=-math.sin(r), d=math.cos(r))


def about(center, m):
    """Apply m around a point instead of the origin."""
    cx, cy = center
    return then(then(move(-cx, -cy), m), move(cx, cy))


# ---- reading Steve's strokes ----------------------------------------------------------


def strokes(char, drop_top_contour=False):
    """The outline of one of Steve's characters, as a list of contours."""
    rec = DecomposingRecordingPen(glyph_set)
    glyph_set[cmap[ord(char)]].draw(rec)
    contours, current = [], []
    for op, args in rec.value:
        current.append((op, args))
        if op in ("closePath", "endPath"):
            contours.append(current)
            current = []
    if drop_top_contour and len(contours) > 1:
        # The dot of an i is the contour that sits highest.
        contours.remove(max(contours, key=lambda c: min(p[1] for _, a in c for p in a if p is not None)))
    return contours


def bounds(contours, m=mat()):
    xs, ys = [], []
    for c in contours:
        for _, args in c:
            for pt in args:
                if pt is None:
                    continue
                x, y = pt
                a, b, cc, d, e, f = m
                xs.append(a * x + cc * y + e)
                ys.append(b * x + d * y + f)
    return min(xs), min(ys), max(xs), max(ys)


def center(contours, m=mat()):
    x0, y0, x1, y1 = bounds(contours, m)
    return (x0 + x1) / 2, (y0 + y1) / 2


def advance(char):
    return hmtx[cmap[ord(char)]][0]


def add(name, char, parts, width, source, replace_source=False):
    """Make a character from (contours, matrix) parts, unless Steve drew it himself."""
    codepoint = ord(char)
    if codepoint in SOURCE_CHARS and not replace_source:
        return
    pen = TTGlyphPen(None)
    for contours, m in parts:
        mirrored = m[0] * m[3] - m[1] * m[2] < 0
        target = ReverseContourPen(pen) if mirrored else pen
        tp = TransformPen(target, m)
        for c in contours:
            for op, args in c:
                getattr(tp, op)(*args)
    glyf[name] = pen.glyph()
    glyf[name].recalcBounds(glyf)
    hmtx[name] = (round(width), getattr(glyf[name], "xMin", 0))
    for table in font["cmap"].tables:
        # The older (format 4) tables only reach U+FFFF; tally marks live past it.
        if table.isUnicode() and (codepoint <= 0xFFFF or table.format == 12):
            table.cmap[codepoint] = name
    cmap[codepoint] = name
    CHARACTER_SOURCES[char] = source


# ---- measurements from his letters ------------------------------------------------------

CAP = bounds(strokes("H"))[3]  # top of his capitals
X_HEIGHT = bounds(strokes("n"))[3]  # top of his lowercase
SIDE = 15  # Calligraphr's side bearing on every glyph
HY = strokes("-")
HY_CX, HY_CY = center(HY)
HY_X0, HY_Y0, HY_X1, HY_Y1 = bounds(HY)
HY_LEN = HY_X1 - HY_X0

# ---- ꓘ and – -------------------------------------------------------------------------------

add("uniA4D8", "ꓘ", [(strokes("K"), then(scale(-1, 1), move(advance("K"), 0)))], advance("K"), "your K, mirrored")

stretch = 1.6
dash_w = advance("-") + HY_LEN * (stretch - 1)
add(
    "endash",
    "–",
    [(HY, then(about((HY_CX, HY_CY), scale(stretch, 1)), move(dash_w / 2 - HY_CX, 0)))],
    dash_w,
    "your hyphen, stretched",
)

# ---- + and # -----------------------------------------------------------------------------------

PLUS = 1.2  # a little bigger than his hyphen, to sit with his digits
plus_w = HY_LEN * PLUS + 2 * SIDE + 60
plus_c = (plus_w / 2, HY_CY)
to_plus = then(about((HY_CX, HY_CY), scale(PLUS, 1)), move(plus_c[0] - HY_CX, 0))
add(
    "plus",
    "+",
    [(HY, to_plus), (HY, then(to_plus, about(plus_c, turn(90))))],
    plus_w,
    "two of your hyphens, crossed",
)

SL = strokes("/")
sl_x0, sl_y0, sl_x1, sl_y1 = bounds(SL)
hash_h = CAP * 0.85
sl_scale = hash_h / (sl_y1 - sl_y0)
hash_w = 560
slash_parts = []
for x_center in (hash_w * 0.40, hash_w * 0.68):
    m = then(scale(sl_scale), move(0, 0))
    cx, cy = center(SL, m)
    slash_parts.append((SL, then(m, move(x_center - cx, hash_h / 2 + 20 - cy))))
bar_scale = (hash_w - 2 * SIDE - 40) / HY_LEN
bar_parts = []
for y in (hash_h * 0.36 + 20, hash_h * 0.68 + 20):
    m = about((HY_CX, HY_CY), scale(bar_scale, 0.85))
    cx, cy = center(HY, m)
    bar_parts.append((HY, then(m, move(hash_w / 2 - cx, y - cy))))
add("numbersign", "#", slash_parts + bar_parts, hash_w, "two of your slashes and two of your hyphens")

# ---- • and · -----------------------------------------------------------------------------------

DOT = strokes(".")
for name, char, size, label in (
    ("bullet", "•", 1.5, "your period, bigger, at the middle of the line"),
    ("periodcentered", "·", 1.0, "your period, at the middle of the line"),
):
    m = scale(size)
    cx, cy = center(DOT, m)
    w = (bounds(DOT, m)[2] - bounds(DOT, m)[0]) + 2 * SIDE + 40
    add(name, char, [(DOT, then(m, move(w / 2 - cx, HY_CY - cy)))], w, label)

# ---- ① ② ③ ---------------------------------------------------------------------------------------

RING = strokes("O")
# His O is a tall oval: widen it toward a circle so a number fits inside.
_, ry0, _, ry1 = bounds(RING)
ring_sy = CAP * 0.98 / (ry1 - ry0)
ring_m0 = scale(ring_sy * 1.32, ring_sy)
ring_w = (bounds(RING, ring_m0)[2] - bounds(RING, ring_m0)[0]) + 2 * SIDE
for digit, char, name in (("1", "\u2460", "uni2460"), ("2", "\u2461", "uni2461"), ("3", "\u2462", "uni2462")):
    rc = (ring_w / 2, CAP * 0.5)
    rcx, rcy = center(RING, ring_m0)
    ring_m = then(ring_m0, move(rc[0] - rcx, rc[1] - rcy))
    D = strokes(digit)
    dx0, dy0, dx1, dy1 = bounds(D)
    d_scale = min(0.52 * CAP / (dy1 - dy0), 0.5 * ring_w / (dx1 - dx0))
    dm = scale(d_scale)
    dcx, dcy = center(D, dm)
    add(name, char, [(RING, ring_m), (D, then(dm, move(rc[0] - dcx, rc[1] - dcy)))], ring_w, f"your {digit} inside your O")

# ---- accented letters ---------------------------------------------------------------------------

TICK = strokes("'")
GAP = 40


def accent_parts(mark, base_contours, base_char, capital):
    """Place a mark centered over a letter."""
    top = bounds(base_contours)[3]
    x0, _, x1, _ = bounds(base_contours)
    if mark == "acute":
        m = then(scale(0.45 if capital else 0.62), about((0, 0), turn(-38)))
        cx, _ = center(TICK, m)
        _, y0, _, _ = bounds(TICK, m)
        return [(TICK, then(m, move((x0 + x1) / 2 + 18 - cx, top + GAP - y0)))]
    if mark == "dots":
        m = scale(0.75 if capital else 0.9)
        cx, _ = center(DOT, m)
        _, y0, _, _ = bounds(DOT, m)
        spread = (x1 - x0) * 0.22
        return [
            (DOT, then(m, move((x0 + x1) / 2 - spread - cx, top + GAP - y0))),
            (DOT, then(m, move((x0 + x1) / 2 + spread - cx, top + GAP - y0))),
        ]
    if mark == "tilde":
        S = strokes("S")
        width = (x1 - x0) * (0.62 if capital else 0.75)
        sw = then(about(center(S), turn(-90)), mat())
        sx0, sy0, sx1, sy1 = bounds(S, sw)
        m = then(sw, scale(width / (sx1 - sx0), 0.13 * CAP / (sy1 - sy0) * (0.85 if capital else 1)))
        cx, _ = center(S, m)
        _, y0, _, _ = bounds(S, m)
        return [(S, then(m, move((x0 + x1) / 2 - cx, top + GAP - y0)))]
    raise ValueError(mark)


ACCENTED = [
    ("eacute", "é", "e", "acute"),
    ("aacute", "á", "a", "acute"),
    ("iacute", "í", "i", "acute"),
    ("oacute", "ó", "o", "acute"),
    ("uacute", "ú", "u", "acute"),
    ("Eacute", "É", "E", "acute"),
    ("Aacute", "Á", "A", "acute"),
    ("Iacute", "Í", "I", "acute"),
    ("Oacute", "Ó", "O", "acute"),
    ("Uacute", "Ú", "U", "acute"),
    ("udieresis", "ü", "u", "dots"),
    ("odieresis", "ö", "o", "dots"),
    ("Udieresis", "Ü", "U", "dots"),
    ("Odieresis", "Ö", "O", "dots"),
    ("ntilde", "ñ", "n", "tilde"),
    ("Ntilde", "Ñ", "N", "tilde"),
]
MARK_WORDS = {"acute": "your apostrophe as the accent", "dots": "two of your periods", "tilde": "your S, turned on its side"}
for name, char, base, mark in ACCENTED:
    base_contours = strokes(base, drop_top_contour=(base == "i"))
    add(
        name,
        char,
        [(base_contours, mat())] + accent_parts(mark, base_contours, base, base.isupper()),
        advance(base),
        f"your {base} with {MARK_WORDS[mark]}",
    )

# ---- symbols Steve drew on his second sheet (traced by tools/trace-sheet.py) ----------------
#
# These replace anything built above, and his first-sheet curly quotes (he drew
# better ones). Sizes: each symbol is scaled to a height that sits with his
# letters; he drew them freehand outside the boxes, so as-drawn sizes vary.

import re
import subprocess
import tempfile

from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.recordingPen import RecordingPen
from fontTools.svgLib.path import parse_path
from PIL import Image, ImageFilter

TRACED = ROOT / "tools/fonts/traced"
quote_ref = bounds(strokes("\u201c"))  # his first-sheet quotes: keep their height and place
dot_c = HY_CY  # middle of the line, where his hyphen sits
#            name           char      height      bottom (or center)       what it is
PLACEMENT = [
    ("plus", "+", 470, ("center", dot_c)),
    ("bullet", "\u2022", 210, ("center", dot_c)),
    ("periodcentered", "\u00b7", 125, ("center", dot_c), "bullet"),
    ("numbersign", "#", 650, ("bottom", 30)),
    ("Ntilde", "\u00d1", 950, ("bottom", 12)),
    ("ntilde", "\u00f1", 690, ("bottom", 60)),
    ("uni2460", "\u2460", 790, ("bottom", 0)),
    ("uni2461", "\u2461", 790, ("bottom", 0)),
    ("uni2462", "\u2462", 790, ("bottom", 0)),
    ("dollar", "$", 900, ("bottom", -60)),
    ("ampersand", "&", 760, ("bottom", 30)),
    ("percent", "%", 740, ("bottom", 30)),
    ("star", "\u2605", 780, ("bottom", 20)),
    ("checkmark", "\u2713", 760, ("bottom", 20), "check"),
    ("diamond", "\u25c6", 800, ("bottom", 20)),
    ("at", "@", 760, ("bottom", -20)),
    ("quotedblleft", "\u201c", quote_ref[3] - quote_ref[1], ("top", quote_ref[3])),
    ("quotedblright", "\u201d", quote_ref[3] - quote_ref[1], ("top", quote_ref[3])),
]


SHEET = json.loads((TRACED / "sheet.json").read_text()) if (TRACED / "sheet.json").exists() else {}
def stem_units():
    """
    His letters' stroke width in this font, so traced symbols match it (pencil
    or felt pen). For a single stroke like "l", twice the area over the
    outline's length is about its width; x1.08 matches what we measured on
    screen for the felt pen (about 90 units).
    """
    from fontTools.pens.areaPen import AreaPen
    from fontTools.pens.perimeterPen import PerimeterPen

    area, edge = AreaPen(glyph_set), PerimeterPen(glyph_set)
    glyph_set[cmap[ord("l")]].draw(area)
    glyph_set[cmap[ord("l")]].draw(edge)
    return abs(2 * area.value / edge.value) * 1.08


STEM_UNITS = stem_units()


def traced(file_name, height):
    """Thicken one drawing to match his letters at its final size, trace it, and read the outline."""
    img = Image.open(TRACED / f"{file_name}.png").convert("L")
    k = height / img.size[1]  # font units per scan pixel at this size
    grow = round(max(0.0, (STEM_UNITS / k - SHEET["stroke_px"]) / 2))
    pad = grow + 4
    canvas = Image.new("L", (img.size[0] + 2 * pad, img.size[1] + 2 * pad), 255)
    canvas.paste(img, (pad, pad))
    if grow:
        canvas = canvas.filter(ImageFilter.MinFilter(2 * grow + 1))  # ink is black: spread it
    with tempfile.TemporaryDirectory() as tmp:
        pbm, svg = Path(tmp) / "g.pbm", Path(tmp) / "g.svg"
        canvas.point(lambda v: 0 if v < 128 else 255).convert("1").save(pbm)
        # -t: ignore specks; -a: corner threshold; -O: curve-fitting tolerance.
        subprocess.run(["potrace", str(pbm), "-s", "-t", "6", "-a", "1.0", "-O", "0.4", "-o", str(svg)], check=True)
        text = svg.read_text()
    m = re.search(r"translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)", text)
    sx, sy = float(m.group(3)), -float(m.group(4))  # path units → pixels, y up
    rec = RecordingPen()
    tp = TransformPen(rec, (sx, 0, 0, sy, 0, 0))
    for d in re.findall(r'<path d="([^"]+)"', text, re.S):
        parse_path(d.replace("\n", " "), tp)
    contours, current = [], []
    for op, args in rec.value:
        current.append((op, args))
        if op in ("closePath", "endPath"):
            contours.append(current)
            current = []
    return contours


def add_traced(name, char, contours, height, anchor, how="you drew it (sheet 2)"):
    x0, y0, x1, y1 = bounds(contours)
    k = height / (y1 - y0)
    width = (x1 - x0) * k
    kind, y = anchor
    dy = {"bottom": y - y0 * k, "top": y - y1 * k, "center": y - (y0 + y1) / 2 * k}[kind]
    m = then(scale(k), move(SIDE + 10 - x0 * k, dy))
    pen = TTGlyphPen(None)
    tp = TransformPen(Cu2QuPen(pen, max_err=1.0, reverse_direction=True), m)
    for c in contours:
        for op, args in c:
            getattr(tp, op)(*args)
    glyf[name] = pen.glyph()
    glyf[name].recalcBounds(glyf)
    hmtx[name] = (round(width + 2 * (SIDE + 10)), getattr(glyf[name], "xMin", 0))
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap[ord(char)] = name
    cmap[ord(char)] = name
    CHARACTER_SOURCES[char] = how


for row in PLACEMENT:
    name, char, height, anchor = row[:4]
    file_name = row[4] if len(row) > 4 else name
    if (TRACED / f"{file_name}.png").exists():
        how = "your bullet (sheet 2), smaller" if name == "periodcentered" else "you drew it (sheet 2)"
        add_traced(name, char, traced(file_name, height), height, anchor, how)

# ---- | \ ✕ × → * and tally marks (Nov 2026: the Book's scorekeeping symbols) ------------------

ELL = strokes("l")
el_x0, el_y0, el_x1, el_y1 = bounds(ELL)
SL = strokes("/")
sl_x0, sl_y0, sl_x1, sl_y1 = bounds(SL)
SL_ADV = advance("/")


def placed(contours, m, cx, cy):
    """Matrix m, then moved so the contours' center lands on (cx, cy)."""
    x, y = center(contours, m)
    return then(m, move(cx - x, cy - y))


# |: his l, from a little below the line to a little above his capitals.
bar_h = CAP * 1.25
bar_m = scale(bar_h / (el_y1 - el_y0) * 0.92, bar_h / (el_y1 - el_y0))
bar_w = (bounds(ELL, bar_m)[2] - bounds(ELL, bar_m)[0]) + 2 * SIDE + 60
add("bar", "|", [(ELL, placed(ELL, bar_m, bar_w / 2, CAP * 0.5))], bar_w, "your l, stretched to a full-height line")

# \: his slash, mirrored.
add("backslash", "\\", [(SL, then(scale(-1, 1), move(SL_ADV, 0)))], SL_ADV, "your slash, mirrored")

def slash45(height):
    """His slash, widened so it leans at 45 degrees: square, the size given."""
    return scale(height / (sl_x1 - sl_x0), height / (sl_y1 - sl_y0))


# ✕ and ×: his slash, widened to 45 degrees, crossed with its mirror image.
for name, char, size, label in (
    ("uni2715", "\u2715", 0.72, "your slash crossed with a mirrored copy"),
    ("multiply", "\u00d7", 0.5, "your slash crossed with a mirrored copy, smaller"),
):
    m = slash45(CAP * size)
    w = CAP * size + 2 * SIDE + 70
    c = (w / 2, CAP * 0.5 if char == "\u2715" else HY_CY)
    add(name, char, [(SL, placed(SL, m, *c)), (SL, placed(SL, then(m, scale(-1, 1)), *c))], w, label)

# →: a long hyphen for the shaft, and two of his slashes at 45 degrees meeting at the point.
shaft_k = 1.8
head = CAP * 0.3
arrow_w = HY_LEN * shaft_k + 2 * SIDE + 60
tip_x = arrow_w - SIDE - 25
shaft_m = about((HY_CX, HY_CY), scale(shaft_k, 1))
shaft = (HY, then(shaft_m, move(tip_x - 10 - bounds(HY, shaft_m)[2], 0)))
low_m = slash45(head)  # / : its top-right end is the point
lx0, ly0, lx1, ly1 = bounds(SL, low_m)
low = (SL, then(low_m, move(tip_x - lx1, HY_CY + 10 - ly1)))
up_m = then(slash45(head), scale(-1, 1))  # \ : its bottom-right end is the point
ux0, uy0, ux1, uy1 = bounds(SL, up_m)
up = (SL, then(up_m, move(tip_x - ux1, HY_CY - 10 - uy0)))
add("arrowright", "\u2192", [shaft, low, up], arrow_w, "your hyphen, with two of your slashes for the head")

# *: three of his hyphens, crossed, up high like a footnote star.
ast_k = 1.0
ast_w = HY_LEN * ast_k + 2 * SIDE + 50
ast_c = (ast_w / 2, CAP * 0.66)
ast_m = about((HY_CX, HY_CY), scale(ast_k, 0.95))
add(
    "asterisk",
    "*",
    [(HY, then(placed(HY, ast_m, *ast_c), about(ast_c, turn(a)))) for a in (90, 30, -30)],
    ast_w,
    "three of your hyphens, crossed",
)

# Tally marks: one is his l, short; five is four with his slash across.
tally_h = X_HEIGHT * 1.15
tally_m = scale(tally_h / (el_y1 - el_y0) * 0.9, tally_h / (el_y1 - el_y0))
stroke_w = bounds(ELL, tally_m)[2] - bounds(ELL, tally_m)[0]
one_w = stroke_w + 2 * SIDE + 50
add("u1D377", "\U0001D377", [(ELL, placed(ELL, tally_m, one_w / 2, tally_h / 2))], one_w, "your l, short: one tally mark")
gap = stroke_w + 55
five_w = 3 * gap + stroke_w + 2 * SIDE + 90
x_first = SIDE + 45 + stroke_w / 2
four = [(ELL, placed(ELL, tally_m, x_first + i * gap, tally_h / 2)) for i in range(4)]
cross_k = (3 * gap + 110) / (sl_x1 - sl_x0)
cross_m = scale(cross_k, tally_h * 0.8 / (sl_y1 - sl_y0))
cross = (SL, placed(SL, cross_m, x_first + 1.5 * gap, tally_h / 2))
add("u1D378", "\U0001D378", four + [cross], five_w, "four of your tally marks with your slash across: five")

# Tally marks are past U+FFFF, so the font needs a full-range (format 12) character table too.
from fontTools.ttLib.tables._c_m_a_p import cmap_format_12

if not any(t.format == 12 for t in font["cmap"].tables):
    full = cmap_format_12(12)
    full.platformID, full.platEncID, full.format, full.reserved, full.language = 3, 10, 12, 0, 0
    full.cmap = {}
    font["cmap"].tables.append(full)
for t in font["cmap"].tables:
    if t.format == 12:
        t.cmap.update(cmap)

# ---- Nov 11, 2026 sheets: his second alphabet, pairs, symbols, words, spacing ---------------------
#
# tools/read-sheets.py cut these out of his scans. His second copy of every
# letter and digit becomes an alternate: the font switches between his two
# versions letter by letter (fixed rules, never random), so "Bobby" or "1–1"
# never looks stamped. Pairs (th, ff…), codes (1B, HR…), and whole words he
# wrote in one go replace the letters they stand for. Symbols he drew in the
# boxes replace the ones built from his strokes above.

SHEETS = ROOT / "tools/fonts/sheets"
GLYPH_ALTS = {}  # base glyph -> its alternate
LIGATURES = []  # (component glyphs, ligature glyph), longest first within each group
WORD_LIGATURES = []

if (SHEETS / "sheets.json").exists():
    from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

    META = json.loads((SHEETS / "sheets.json").read_text())

    from fontTools.pens.areaPen import AreaPen
    from fontTools.pens.perimeterPen import PerimeterPen

    def stem_of(contours):
        """Line width of an outline: twice its area over its length (the same measure for both copies)."""
        a, p = AreaPen(), PerimeterPen()
        for c in contours:
            for op, args in c:
                getattr(a, op)(*args)
                getattr(p, op)(*args)
        return abs(2 * a.value / p.value) if p.value else 0.0

    def trace_png(path, change=0, hollow=0):
        """Trace one piece, its strokes widened (or thinned) by `change` pixels on each side.
        With `hollow`, keep only a band that wide around the edge (a filled star becomes an open one)."""
        img = Image.open(path).convert("L")
        pad = abs(change) + 4
        canvas = Image.new("L", (img.size[0] + 2 * pad, img.size[1] + 2 * pad), 255)
        canvas.paste(img, (pad, pad))
        # Close hairline gaps where two passes of his pen didn't quite overlap.
        canvas = canvas.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
        if change > 0:
            canvas = canvas.filter(ImageFilter.MinFilter(2 * change + 1))  # ink is black: spread it
        elif change < 0:
            canvas = canvas.filter(ImageFilter.MaxFilter(2 * -change + 1))  # thin it
        if hollow:
            import numpy as np

            inner = np.array(canvas.filter(ImageFilter.MaxFilter(2 * hollow + 1)))
            ink = np.array(canvas)
            canvas = Image.fromarray(np.where((ink < 128) & (inner >= 128), 0, 255).astype("uint8"))
        with tempfile.TemporaryDirectory() as tmp:
            pbm, svg = Path(tmp) / "g.pbm", Path(tmp) / "g.svg"
            canvas.point(lambda v: 0 if v < 128 else 255).convert("1").save(pbm)
            subprocess.run(["potrace", str(pbm), "-s", "-t", "8", "-a", "1.0", "-O", "0.4", "-o", str(svg)], check=True)
            text = svg.read_text()
        m = re.search(r"translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)", text)
        sx, sy = float(m.group(3)), -float(m.group(4))
        rec = RecordingPen()
        tp = TransformPen(rec, (sx, 0, 0, sy, 0, 0))
        for d in re.findall(r'<path d="([^"]+)"', text, re.S):
            parse_path(d.replace("\n", " "), tp)
        contours, current = [], []
        for op, args in rec.value:
            current.append((op, args))
            if op in ("closePath", "endPath"):
                contours.append(current)
                current = []
        return contours

    # His first font's line width, by the same measure, over his lowercase.
    FIRST_STEM = sorted(stem_of(strokes(ch)) for ch in "abcdefghijklmnopqrstuvwxyz")[13]
    CHANGE = {}

    def change_for(group, names, k):
        """How much to widen this page's pieces so they match his first font's line, measured, not guessed."""
        if group not in CHANGE:
            # Try widths and keep the one whose traced line comes closest (widening also
            # fills tight gaps between letters, so it isn't a straight sum).
            def miss(c):
                sample = sorted(stem_of(trace_png(SHEETS / group / f"{n}.png", c)) for n in names[:14])
                return abs(sample[len(sample) // 2] * k - FIRST_STEM)
            CHANGE[group] = min(range(-3, 9), key=miss)
        return CHANGE[group]

    def put(name, contours, k, top=None, bottom=None, char=None, how=None):
        """Scale a traced piece by k and set it on the line: its top (or bottom) at the given height."""
        x0, y0, x1, y1 = bounds(contours)
        dy = (top - y1 * k) if top is not None else (bottom - y0 * k)
        m = then(scale(k), move(SIDE - x0 * k, dy))
        pen = TTGlyphPen(None)
        tp = TransformPen(Cu2QuPen(pen, max_err=1.0, reverse_direction=True), m)
        for c in contours:
            for op, args in c:
                getattr(tp, op)(*args)
        glyf[name] = pen.glyph()
        glyf[name].recalcBounds(glyf)
        hmtx[name] = (round((x1 - x0) * k + 2 * SIDE), getattr(glyf[name], "xMin", 0))
        if char is not None:
            for table in font["cmap"].tables:
                if table.isUnicode() and (ord(char) <= 0xFFFF or table.format == 12):
                    table.cmap[ord(char)] = name
            cmap[ord(char)] = name
            CHARACTER_SOURCES[char] = how or "you drew it (Nov 11 sheet)"

    # -- calibrate: the template box to the font's units, from letters in both copies --
    letters = META["letters"]["pieces"]
    pairs = []
    for name, p in letters.items():
        if p.get("margin") or "_" in name or name not in glyf.glyphOrder:
            continue
        g = glyf[name]
        if not hasattr(g, "yMax"):
            continue
        pairs.append((p["y0"], g.yMax))
        pairs.append((p["y1"], g.yMin))
    # font_y = A - B * fraction (least squares over every letter's top and bottom).
    n = len(pairs)
    sx_ = sum(f for f, _ in pairs)
    sy_ = sum(y for _, y in pairs)
    sxx = sum(f * f for f, _ in pairs)
    sxy = sum(f * y for f, y in pairs)
    B = -(n * sxy - sx_ * sy_) / (n * sxx - sx_ * sx_)
    A = (sy_ + B * sx_) / n
    box_h_px = next(iter(letters.values()))["box_px"][1] if "box_px" in next(iter(letters.values())) else 1
    box_px = [p["box_px"] for p in letters.values() if "box_px" in p][0]
    K_BOX = B / box_px[1]  # font units per scan pixel on the template pages

    LOWER = [c for c in "abcdefghijklmnopqrstuvwxyz"]
    CHANGE_BOX = {"letters": change_for("letters", LOWER, K_BOX)}
    CHANGE_BOX["symbols"] = CHANGE_BOX["letters"]  # the same pen, the same day

    def from_box(group, name, glyph_name, char=None, how=None, height=None, bottom=0):
        """Place a boxed piece where Calligraphr would, or at a set height sitting on `bottom`."""
        p = META[group]["pieces"][name]
        change = CHANGE_BOX[group]
        contours = trace_png(SHEETS / group / f"{name}.png", change)
        if height is None:
            put(glyph_name, contours, K_BOX, top=A - B * p["y0"] + change * K_BOX, char=char, how=how)
        else:
            x0, y0, x1, y1 = bounds(contours)
            put(glyph_name, contours, height / (y1 - y0), bottom=bottom, char=char, how=how)

    # -- his second alphabet: alternates for every letter, digit, and the punctuation on that page --
    for name, p in letters.items():
        if p.get("margin") or "_" in name or name not in glyf.glyphOrder:
            continue
        from_box("letters", name, f"{name}.alt")
        GLYPH_ALTS[name] = f"{name}.alt"

    # -- pairs he wrote as one piece --
    def glyphs_for(text):
        return [cmap[ord(ch)] for ch in text]

    for name, text in (("t_t", "tt"), ("c_h", "ch"), ("s_h", "sh"), ("i_n_g", "ing"), ("o_o", "oo"), ("e_e", "ee"), ("l_l", "ll")):
        from_box("letters", name, name)
        LIGATURES.append((glyphs_for(text), name))
    # Margin pairs sit on the line; their height comes from his box size.
    for name, text in (("t_h", "th"), ("s_s", "ss"), ("f_f", "ff"), ("v_s_period", "vs.")):
        p = letters[name]
        change = CHANGE_BOX["letters"]
        contours = trace_png(SHEETS / "letters" / f"{name}.png", change)
        ref = {"t_h": "t", "s_s": "s", "f_f": "f", "v_s_period": "v"}[name]
        put(name, contours, K_BOX, bottom=min(glyf[cmap[ord(ref)]].yMin, 40))
        LIGATURES.append((glyphs_for(text), name))

    # -- symbols he drew in boxes: these replace the ones built from his strokes --
    SYMBOL_CHARS = {
        "numbersign": "#", "dollar": "$", "percent": "%", "ampersand": "&", "asterisk": "*", "plus": "+",
        "less": "<", "equal": "=", "greater": ">", "at": "@", "bracketleft": "[", "backslash": "\\",
        "bracketright": "]", "asciicircum": "^", "underscore": "_", "grave": "`", "braceleft": "{", "bar": "|",
        "braceright": "}", "asciitilde": "~", "quoteleft": "‘", "quoteright": "’",
        "quotedblleft": "“", "quotedblright": "”", "uni22A0": "⊠", "checkmark": "✓",
        "uni2714": "✔", "uni2717": "✗", "uni2718": "✘", "star": "★", "heart": "❤",
        "uni2460": "①", "uni2461": "②", "uni2462": "③", "uni2198": "↘", "arrowright": "→",
        "uni2197": "↗", "arrowleft": "←",
    }
    CIRCLED = {"uni2460", "uni2461", "uni2462"}  # out numbers: all one size, on the line
    for name, char in SYMBOL_CHARS.items():
        from_box("symbols", name, name, char=char, height=790 if name in CIRCLED else None)
    for base, alt in (("star", "star.2"), ("heart", "heart.2"), ("uni2460", "uni2460.2"), ("uni2461", "uni2461.2"), ("uni2462", "uni2462.2")):
        from_box("symbols", alt, f"{base}.alt", height=790 if base in CIRCLED else None)
        GLYPH_ALTS[base] = f"{base}.alt"
    # ✕ (out on the bases): the X he drew in the margin, on the line like his capitals.
    p = letters["uni2715"]
    contours = trace_png(SHEETS / "letters" / "uni2715.png", CHANGE_BOX["letters"])
    put("uni2715", contours, K_BOX, top=CAP * 0.86, char="✕")
    # ꓘ: his own backwards K, two copies.
    from_box("symbols", "uniA4D8.2", "uniA4D8", char="ꓘ", how="you drew it (Nov 11 sheet)")
    from_box("symbols", "uniA4D8.3", "uniA4D8.alt")
    GLYPH_ALTS["uniA4D8"] = "uniA4D8.alt"
    # Codes, two copies each: the first is the code, the second its alternate.
    for name, text in (("one_B", "1B"), ("two_B", "2B"), ("three_B", "3B"), ("H_R", "HR"), ("B_B", "BB")):
        from_box("symbols", name, name)
        from_box("symbols", f"{name}.2", f"{name}.alt")
        GLYPH_ALTS[name] = f"{name}.alt"
        LIGATURES.insert(0, (glyphs_for(text), name))

    # -- whole words: one size for the page, each sitting on its own line --
    words = META["words"]["pieces"]
    x_heights = [w["baseline_px"] - w["body_top_px"] for w in words.values() if w["baseline_px"] - w["body_top_px"] > 20]
    x_heights.sort()
    K_WORDS = (X_HEIGHT - 60) / x_heights[len(x_heights) // 2]
    WORD_TEXT = {
        "Complete Book": ["Complete Book"],
        "Walk-Off": ["Walk-Off"],
        "Rare Plays": ["Rare Plays"],
        "Inside the Park": ["Inside the Park"],
        "Player of the Game": ["Player of the Game"],
        "Final": ["Final"],
        "Tie": ["Tie"],
        "Scorer's Notes": ["Scorer's Notes", "Scorer’s Notes"],
        "Cycle": ["Cycle"],
        "Double Play": ["Double Play"],
        "Triple Play": ["Triple Play"],
        "Triple": ["Triple"],
        "Grand Slam": ["Grand Slam"],
        "Sub": ["Sub"],
        "vs.": ["vs."],
    }
    for i, (piece, texts) in enumerate(WORD_TEXT.items()):
        w = words[piece]
        change = change_for("words", list(WORD_TEXT), K_WORDS)
        contours = trace_png(SHEETS / "words" / f"{piece}.png", change)
        gname = f"word{i:02d}"
        # The baseline sits at his letters' usual baseline.
        put(gname, contours, K_WORDS, bottom=60 - (w["height_px"] - w["baseline_px"]) * K_WORDS - change * K_WORDS)
        for text in texts:
            if all(ord(ch) in cmap for ch in text):
                WORD_LIGATURES.append((glyphs_for(text), gname))
        CHARACTER_SOURCES[f"[{piece}]"] = "you wrote the whole word (Nov 11 sheet)"
    # -- the "no" sign (Steve: like the circle and line on the Ghostbusters logo) --
    # He drew the line from bottom left to top right; the sign runs top left to
    # bottom right, so 🚫 is his drawing mirrored. ⊘ keeps it as he drew it.
    def mirrored(contours):
        out = []
        for c in contours:
            out.append([(op, tuple(None if pt is None else (-pt[0], pt[1]) for pt in args)) for op, args in c])
        return out

    change = change_for("words", list(WORD_TEXT), K_WORDS)
    no_sign = trace_png(SHEETS / "words" / "slashed zero.png", change)
    nx0, ny0, nx1, ny1 = bounds(no_sign)
    put("uni2298", no_sign, 790 / (ny1 - ny0), bottom=0, char="\u2298", how="you drew it (Nov 11 sheet)")
    put("u1F6AB", mirrored(no_sign), 790 / (ny1 - ny0), bottom=0, char="\U0001F6AB", how="your no sign, mirrored so the line runs like the Ghostbusters sign")
    no_sign2 = trace_png(SHEETS / "words" / "slashed zero.2.png", change)
    nx0, ny0, nx1, ny1 = bounds(no_sign2)
    put("u1F6AB.alt", mirrored(no_sign2), 790 / (ny1 - ny0), bottom=0)
    GLYPH_ALTS["u1F6AB"] = "u1F6AB.alt"

    # -- symbols he didn't draw, built from pieces he did (Steve, Nov 2026: "generate them yourself") --
    def outline(glyph_name):
        rec = RecordingPen()
        glyf[glyph_name].draw(rec, glyf)
        contours, current = [], []
        for op, args in rec.value:
            current.append((op, args))
            if op in ("closePath", "endPath"):
                contours.append(current)
                current = []
        return contours

    def built(name, char, parts, width, how):
        """Like add(), for pieces taken from the finished glyphs (his Nov 11 drawings included)."""
        add(name, char, parts, width, how, replace_source=True)

    # ↑ ↓: his right arrow, turned. ↖ ↙: his ↗ and ↘, mirrored.
    AR = outline("arrowright")
    ax0, ay0, ax1, ay1 = bounds(AR)
    arrow_mid = (ax0 + ax1) / 2, (ay0 + ay1) / 2
    up_w = (ay1 - ay0) + 2 * SIDE + 40
    for name, char, deg in (("arrowup", "\u2191", 90), ("arrowdown", "\u2193", -90)):
        m = about(arrow_mid, turn(deg))
        built(name, char, [(AR, then(m, move(up_w / 2 - arrow_mid[0], CAP * 0.5 - arrow_mid[1])))], up_w, f"your right arrow, turned to point {'up' if deg > 0 else 'down'}")
    for src, name, char in (("uni2197", "uni2196", "\u2196"), ("uni2198", "uni2199", "\u2199")):
        c = outline(src)
        w = hmtx[src][0]
        built(name, char, [(c, then(scale(-1, 1), move(w, 0)))], w, "your diagonal arrow, mirrored")

    # ☆: the outline of his own star.
    star_path = SHEETS / "symbols" / "star.png"
    hollow = trace_png(star_path, CHANGE_BOX["symbols"], hollow=max(2, round(FIRST_STEM / K_BOX)))
    sp_ = META["symbols"]["pieces"]["star"]
    put("uni2606", hollow, K_BOX, top=A - B * sp_["y0"] + CHANGE_BOX["symbols"] * K_BOX, char="\u2606", how="your star, drawn as an outline")

    # …: three of his periods. °: his lowercase o, small and up high.
    DOTP = outline(cmap[ord(".")])
    dx0, dy0, dx1, dy1 = bounds(DOTP)
    dot_w = dx1 - dx0
    ell_w = dot_w * 3 + 110 * 2 + 2 * SIDE + 20
    built("ellipsis", "\u2026", [(DOTP, move(SIDE + 10 + i * (dot_w + 110) - dx0, 0)) for i in range(3)], ell_w, "three of your periods")
    OO = strokes("o")
    ox0, oy0, ox1, oy1 = bounds(OO)
    deg_k = 0.5
    deg_w = (ox1 - ox0) * deg_k + 2 * SIDE + 30
    built("degree", "\u00b0", [(OO, then(scale(deg_k), move(SIDE + 15 - ox0 * deg_k, CAP - oy1 * deg_k)))], deg_w, "your o, small and up high")

    # More accents for names (José, Zoë, François): his grave mark, his ^, his dots, his comma.
    COMMA = outline(cmap[ord(",")])

    MORE_ACCENTS = [
        (base, mark) for base in "aeiouAEIOU" for mark in ("grave", "circumflex")
    ] + [(base, "dots") for base in "aeiAEI"] + [("c", "cedilla"), ("C", "cedilla")]
    NAMES = {"grave": "grave", "circumflex": "circumflex", "dots": "dieresis", "cedilla": "cedilla"}
    COMBINE = {"grave": "\u0300", "circumflex": "\u0302", "dots": "\u0308", "cedilla": "\u0327"}
    import unicodedata

    for base, mark in MORE_ACCENTS:
        char = unicodedata.normalize("NFC", base + COMBINE[mark])
        if len(char) != 1 or ord(char) in cmap:
            continue
        bc = strokes(base, drop_top_contour=(base == "i"))
        cap = base.isupper()
        # Grave and circumflex use his apostrophe stroke at full weight, like his acute:
        # tipped left for a grave, and two of them meeting at the top for a circumflex.
        k_t = 0.45 if cap else 0.62
        x0, _, x1, top = bounds(bc)
        mid = (x0 + x1) / 2

        def tick(deg, cx):
            m = then(scale(k_t), about((0, 0), turn(deg)))
            tx, _ = center(TICK, m)
            _, ty0, _, _ = bounds(TICK, m)
            return (TICK, then(m, move(cx - tx, top + GAP - ty0)))

        if mark == "grave":
            parts = [tick(38, mid - 18)]
        elif mark == "circumflex":
            spread = (x1 - x0) * (0.11 if cap else 0.14)
            parts = [tick(-34, mid - spread), tick(34, mid + spread)]
        elif mark == "dots":
            parts = accent_parts("dots", bc, base, cap)
        else:
            cx0, cy0, cx1, cy1 = bounds(COMMA)
            x0, y0, x1, _ = bounds(bc)
            k = 0.75
            parts = [(COMMA, then(scale(k), move((x0 + x1) / 2 - (cx0 + cx1) / 2 * k, y0 - 20 - cy1 * k)))]
        words_for = {"grave": "your apostrophe, tipped the other way", "circumflex": "two of your apostrophes, meeting at the top", "dots": "two of your periods", "cedilla": "your comma"}
        built(f"{base}{NAMES[mark]}", char, [(bc, mat())] + parts, advance(base), f"your {base} with {words_for[mark]}")

    # -- his word spacing, from the free-writing page --
    # On open paper his word gap is wide (about 1.2 times his lowercase height); in a
    # book's name column scorers squeeze names, so the font uses a third of the way
    # from the old space toward his. Both numbers are kept here so it can be tuned.
    sp = META["spacing"]
    open_paper = round(sp["word_gap"] * (X_HEIGHT - 60) - 2 * SIDE)
    old_space = hmtx["space"][0]
    hmtx["space"] = (round(old_space + (open_paper - old_space) / 3), 0)
    SPACE_NOTE = f"word space {hmtx['space'][0]} units (was {old_space}; {open_paper} on your free-writing page)"

    # -- the features: whole words first, then pairs and codes, then his two copies taking turns --
    font.setGlyphOrder(list(glyf.glyphOrder))
    def fea_seq(gs):
        return " ".join(f"\\{g}" for g in gs)

    bases = [b for b in GLYPH_ALTS]
    alts = [GLYPH_ALTS[b] for b in bases]
    fea = ["languagesystem DFLT dflt;", "languagesystem latn dflt;"]
    fea.append("lookup words {")
    for comps, lig in sorted(WORD_LIGATURES, key=lambda x: -len(x[0])):
        fea.append(f"  sub {fea_seq(comps)} by \\{lig};")
    fea.append("} words;")
    fea.append("lookup pairs {")
    for comps, lig in sorted(LIGATURES, key=lambda x: -len(x[0])):
        fea.append(f"  sub {fea_seq(comps)} by \\{lig};")
    fea.append("} pairs;")
    fea.append(f"@BASE = [{' '.join(chr(92) + b for b in bases)}];")
    fea.append(f"@ALT = [{' '.join(chr(92) + a for a in alts)}];")
    fea.append("lookup turns {")
    fea.append("  sub @BASE @BASE' by @ALT;")
    fea.append("} turns;")
    fea.append("feature liga { lookup words; lookup pairs; } liga;")
    fea.append("feature calt { lookup turns; } calt;")
    addOpenTypeFeaturesFromString(font, "\n".join(fea))
    CHARACTER_SOURCES["[features]"] = (
        f"{len(bases)} characters with your second copy taking turns; {len(LIGATURES)} pairs and codes; "
        f"{len(WORD_LIGATURES)} whole words; {SPACE_NOTE}"
    )
    print(f"template scale {K_BOX:.2f} units/px, words {K_WORDS:.2f} units/px; line change {CHANGE} px; first-font line {FIRST_STEM:.0f}; {SPACE_NOTE}")


# ---- write --------------------------------------------------------------------------------------

font.setGlyphOrder(list(glyf.glyphOrder))
font["maxp"].numGlyphs = len(glyf.glyphOrder)
font.flavor = "woff2"
font.save(OUT)
MANIFEST.write_text(json.dumps(CHARACTER_SOURCES, ensure_ascii=False, indent=1) + "\n")
print(f"stroke width {STEM_UNITS:.0f} units")
print(f"wrote {OUT.relative_to(ROOT)}: {len(font.getBestCmap())} characters, {len(CHARACTER_SOURCES)} built from your strokes")
