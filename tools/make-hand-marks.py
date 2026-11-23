"""Writes src/ui/book/hand.ts: Steve's O, slash, x, hyphen, and period as SVG outlines (Nov 23).
Run from the repo root: python3 tools/make-hand-marks.py"""
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

f = TTFont('tools/fonts/steve-hand-source.ttf')
gs = f.getGlyphSet()
cmap = f.getBestCmap()
out = [
    "/*",
    " * Steve's own pen strokes for the Book's written marks (Steve, Nov 23: what the scorebook prints",
    " * stays clean; what the scorer writes is in his hand). Outlines from his handwriting font",
    " * (tools/fonts/steve-hand-source.ttf), flipped to SVG's y-down and moved so each starts at 0,0;",
    " * w and h are each glyph's size. Regenerate with tools/make-hand-marks.py.",
    " */",
    "export interface HandMark {", "  d: string;", "  w: number;", "  h: number;", "}", "",
    "export const HAND: Record<'loop' | 'slash' | 'x' | 'dash' | 'dot', HandMark> = {",
]
for key, ch in [('loop', 'O'), ('slash', '/'), ('x', 'x'), ('dash', '-'), ('dot', '.')]:
    n = cmap[ord(ch)]
    bp = BoundsPen(gs)
    gs[n].draw(bp)
    x0, y0, x1, y1 = bp.bounds
    sp = SVGPathPen(gs, ntos=lambda v: str(int(round(v))))
    gs[n].draw(TransformPen(sp, (1, 0, 0, -1, -x0, y1)))
    out.append(f"  {key}: {{ w: {round(x1 - x0)}, h: {round(y1 - y0)}, d: '{sp.getCommands()}' }},")
out.append("};\n")
open('src/ui/book/hand.ts', 'w').write("\n".join(out))
