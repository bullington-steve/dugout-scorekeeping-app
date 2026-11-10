"""
Trace symbols Steve drew on a scanned Calligraphr sheet into outlines.

    python3 tools/trace-sheet.py /path/to/scan.png

The scan itself stays out of the repo. This writes one cleaned black-and-white
PNG per symbol to tools/fonts/traced/, plus traced/sheet.json with his marker's
stroke width on this sheet (measured from letters). tools/build-hand-font.py
then thickens each symbol by however much it shrinks it, and traces it with
potrace, so every symbol's strokes match his letters. Needs: Pillow.

Boxes are in "preview units": the sheet scaled to 850 points wide. Only thick
marker strokes are kept; thin printed grid and baselines are dropped.
"""
import json
import statistics
import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tools/fonts/traced"

# Sheet 2 (Nov 2026): Steve's letters sheet with symbols added around the edges.
SYMBOLS = {
    "plus": (8, 95, 62, 165),
    "bullet": (8, 190, 62, 250),
    "numbersign": (8, 280, 62, 350),
    "Ntilde": (8, 360, 62, 450),
    "uni2462": (4, 455, 66, 535),
    "uni2461": (4, 548, 66, 625),
    "uni2460": (4, 640, 66, 718),
    "ntilde": (8, 725, 62, 808),
    "dollar": (8, 812, 62, 898),
    "ampersand": (703, 365, 762, 450),
    "percent": (703, 455, 762, 535),
    "star": (698, 548, 766, 625),
    "check": (698, 640, 766, 718),
    "diamond": (703, 725, 762, 812),
    "at": (698, 812, 766, 898),
    "quotedblleft": (563, 812, 627, 895),
    "quotedblright": (633, 812, 697, 895),
}
# Letters on the same sheet, to measure scan pixels against font units.
REFERENCES = {"H": (493, 368, 557, 442), "K": (73, 458, 137, 532), "T": (73, 548, 137, 622), "E": (283, 368, 347, 442)}

INK = 110  # darker than this is marker
MIN_THICK = 7  # strokes at least this many pixels across; grid lines are 1–3


def strokes_only(img):
    """Keep connected ink blobs thick enough to be marker, drop printed lines."""
    w, h = img.size
    px = img.load()
    ink = [[px[x, y] < INK for x in range(w)] for y in range(h)]
    seen = [[False] * w for _ in range(h)]
    keep = Image.new("1", (w, h), 1)
    kp = keep.load()
    for sy in range(h):
        for sx in range(w):
            if not ink[sy][sx] or seen[sy][sx]:
                continue
            blob, q = [], deque([(sx, sy)])
            seen[sy][sx] = True
            while q:
                x, y = q.popleft()
                blob.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and ink[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        q.append((nx, ny))
            xs = [p[0] for p in blob]
            ys = [p[1] for p in blob]
            bw, bh = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
            # Thin lines: long and skinny, or mostly empty bounding box.
            thick = min(bw, bh) >= MIN_THICK and len(blob) >= 0.08 * bw * bh
            if thick and len(blob) > 40:
                for x, y in blob:
                    kp[x, y] = 0
    return keep


def crop(sheet, box):
    k = sheet.size[0] / 850
    x0, y0, x1, y1 = box
    return sheet.crop((int(x0 * k), int(y0 * k), int(x1 * k), int(y1 * k)))


def main(scan_path):
    sheet = Image.open(scan_path).convert("L")
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {"sheet": "Calligraphr sheet 2, Nov 2026", "references": {}, "symbols": {}}

    runs = []
    for letter, box in REFERENCES.items():
        mask = strokes_only(crop(sheet, box))
        x0, y0, x1, y1 = Image.eval(mask.convert("L"), lambda v: 255 - v).getbbox()
        meta["references"][letter] = {"height_px": y1 - y0}
        # Stroke width: dark runs across the lower middle of the letter (its stems).
        px = mask.load()
        for y in (y0 + (y1 - y0) * 6 // 10, y0 + (y1 - y0) * 7 // 10):
            run = 0
            for x in range(x0, x1 + 1):
                if x < x1 and px[x, y] == 0:
                    run += 1
                elif run:
                    if run < 40:  # a stem, not a crossbar
                        runs.append(run)
                    run = 0
    meta["stroke_px"] = statistics.median(runs)

    for name, box in SYMBOLS.items():
        mask = strokes_only(crop(sheet, box))
        bbox = Image.eval(mask.convert("L"), lambda v: 255 - v).getbbox()
        if not bbox:
            print(f"{name}: no ink found", file=sys.stderr)
            continue
        tight = mask.crop(bbox)
        tight.save(OUT / f"{name}.png")
        meta["symbols"][name] = {"width_px": tight.size[0], "height_px": tight.size[1]}
        print(f"{name}: {tight.size[0]} x {tight.size[1]} px")

    for old in OUT.glob("*.svg"):
        old.unlink()
    (OUT / "sheet.json").write_text(json.dumps(meta, indent=1) + "\n")
    print(f"marker stroke: {meta['stroke_px']} px")


if __name__ == "__main__":
    main(sys.argv[1])
