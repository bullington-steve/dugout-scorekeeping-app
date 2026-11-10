"""
Build the Book's handwriting font from Steve's Calligraphr export.

    python3 tools/build-hand-font.py

Reads tools/fonts/steve-hand-source.ttf and writes src/assets/fonts/steve-hand.woff2,
adding characters made from strokes Steve already drew:

    ꓘ (U+A4D8)  backwards K, his K mirrored (strikeout looking)
    ’ (U+2019)  his apostrophe          ‘ (U+2018)  his apostrophe, turned
    ” (U+201D)  his double quote        “ (U+201C)  his double quote, turned
    – (U+2013)  his hyphen, stretched (scores like 13–7)

Needs: pip install "fonttools[woff]"
"""
from pathlib import Path

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.reverseContourPen import ReverseContourPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "tools/fonts/steve-hand-source.ttf"
OUT = ROOT / "src/assets/fonts/steve-hand.woff2"

font = TTFont(SOURCE)
glyf, hmtx, cmap = font["glyf"], font["hmtx"], font.getBestCmap()
glyph_set = font.getGlyphSet()


def derive(new_name, codepoint, from_char, transform, width=None, mirrored=False):
    """Copy a drawn glyph through an affine transform (xx, xy, yx, yy, dx, dy)."""
    if codepoint in cmap:
        return  # Steve drew it himself: keep his.
    src = cmap[ord(from_char)]
    rec = DecomposingRecordingPen(glyph_set)
    glyph_set[src].draw(rec)
    tt = TTGlyphPen(None)
    # Mirroring flips which way outlines run; turn them back so fills stay right.
    target = ReverseContourPen(tt) if mirrored else tt
    rec.replay(TransformPen(target, transform))
    glyf[new_name] = tt.glyph()
    advance, _ = hmtx[src]
    advance = width if width is not None else advance
    glyf[new_name].recalcBounds(glyf)
    hmtx[new_name] = (advance, getattr(glyf[new_name], "xMin", 0))
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap[codepoint] = new_name


def bbox(char):
    g = glyf[cmap[ord(char)]]
    g.recalcBounds(glyf)
    return g.xMin, g.yMin, g.xMax, g.yMax


# Backwards K: mirror inside its own advance width.
k_adv = hmtx[cmap[ord("K")]][0]
derive("uniA4D8", 0xA4D8, "K", (-1, 0, 0, 1, k_adv, 0), mirrored=True)

# Curly apostrophe and quotes: his strokes as drawn, and turned for the opening ones.
for char, close_cp, open_cp, close_name, open_name in (
    ("'", 0x2019, 0x2018, "quoteright", "quoteleft"),
    ('"', 0x201D, 0x201C, "quotedblright", "quotedblleft"),
):
    derive(close_name, close_cp, char, (1, 0, 0, 1, 0, 0))
    x0, y0, x1, y1 = bbox(char)
    derive(open_name, open_cp, char, (-1, 0, 0, -1, x0 + x1, y0 + y1))

# En dash: the hyphen stretched to 1.6 times its length, centered in a wider space.
x0, y0, x1, y1 = bbox("-")
hy_adv = hmtx[cmap[ord("-")]][0]
stretch = 1.6
new_adv = round(hy_adv + (x1 - x0) * (stretch - 1))
dx = (new_adv - (x0 + x1) * stretch) / 2
derive("endash", 0x2013, "-", (stretch, 0, 0, 1, dx, 0), width=new_adv)

font.setGlyphOrder(list(glyf.glyphOrder))
font["maxp"].numGlyphs = len(glyf.glyphOrder)
font.flavor = "woff2"
font.save(OUT)
print(f"wrote {OUT.relative_to(ROOT)}: {len(font.getBestCmap())} characters")
