"""
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
cmap = font.getBestCmap()
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
        if table.isUnicode():
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
STEM_UNITS = 90  # his letters' stem width in the Calligraphr font, measured


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

# ---- write --------------------------------------------------------------------------------------

font.setGlyphOrder(list(glyf.glyphOrder))
font["maxp"].numGlyphs = len(glyf.glyphOrder)
font.flavor = "woff2"
font.save(OUT)
MANIFEST.write_text(json.dumps(CHARACTER_SOURCES, ensure_ascii=False, indent=1) + "\n")
print(f"wrote {OUT.relative_to(ROOT)}: {len(font.getBestCmap())} characters, {len(CHARACTER_SOURCES)} built from your strokes")
