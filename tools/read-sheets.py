"""
Read Steve's handwriting sheets (Nov 11, 2026 scan) into clean pieces for the font.

    python3 tools/read-sheets.py /path/to/scan-page-1.png ... page-4.png

The four pages, scanned at 300 dpi (the scans stay out of the repo):
  1. Sheet F, free writing: measures his letter and word spacing.
  2. Sheet C, whole words, two copies each: whole-word pieces.
  3. Calligraphr letters template, his second copy of every letter and digit,
     with letter pairs in the last row and ꓘ, ✕, vs., th, ss, ff in the margins.
  4. Calligraphr symbols template: punctuation, marks, circled out numbers,
     arrows, and 1B 2B 3B HR BB ꓘ, two copies each.

Writes tools/fonts/sheets/<group>/<name>.png (black ink on white, tight) and
tools/fonts/sheets/sheets.json with where each piece sat: for template boxes,
its place in the box (so the build can put it on the line the way Calligraphr
would); for words, its baseline. tools/build-hand-font.py reads these.
Needs: Pillow, numpy.
"""
import json
import statistics
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "tools/fonts/sheets"
INK = 110  # darker than this is his pen; printed grid lines are lighter or thin

# Template geometry at 300 dpi (Calligraphr letter-size template): 9 columns, 9 rows.
COLS = [200, 410, 620, 831, 1042, 1252, 1462, 1672, 1883, 2094]
ROWS = [240, 512, 784, 1058, 1330, 1603, 1876, 2148, 2421, 2692]
LABEL = 44  # the printed label strip at the top of each box

# What he drew in each box, row by row ("" = empty or the QR code).
LETTERS = [
    ["exclam", "quotedbl", "quotesingle", "comma", "period", "zero", "one", "", ""],
    ["two", "three", "four", "five", "six", "seven", "eight", "", ""],
    ["nine", "colon", "semicolon", "question", "A", "B", "C", "D", "E"],
    ["F", "G", "H", "I", "J", "K", "L", "M", "N"],
    ["O", "P", "Q", "R", "S", "T", "U", "V", "W"],
    ["X", "Y", "Z", "a", "b", "c", "d", "e", "f"],
    ["g", "h", "i", "j", "k", "l", "m", "n", "o"],
    ["p", "q", "r", "s", "t", "u", "v", "w", "x"],
    ["y", "z", "t_t", "c_h", "s_h", "i_n_g", "o_o", "e_e", "l_l"],
]
# Written in the margins of the letters page: (name, row, side).
MARGIN = [("uniA4D8", 3, "left"), ("uni2715", 5, "left"), ("v_s_period", 5, "right"), ("t_h", 6, "right"), ("s_s", 7, "right"), ("f_f", 8, "right")]
SYMBOLS = [
    ["exclam", "quotedbl", "numbersign", "dollar", "percent", "ampersand", "", "", ""],
    ["quotesingle", "parenleft", "parenright", "asterisk", "plus", "comma", "", "", ""],
    ["hyphen", "period", "slash", "colon", "semicolon", "less", "equal", "greater", "question"],
    ["at", "bracketleft", "backslash", "bracketright", "asciicircum", "underscore", "grave", "braceleft", "bar"],
    ["braceright", "asciitilde", "quoteleft", "quoteright", "quotedblleft", "quotedblright", "uni22A0", "checkmark", "uni2714"],
    ["uni2717", "uni2718", "star", "star.2", "star.3", "", "heart", "heart.2", "uni2460"],
    ["uni2461", "uni2462", "uni2460.2", "uni2461.2", "uni2462.2", "uni2460.3", "uni2461.3", "uni2462.3", "uni2198"],
    ["arrowright", "uni2197", "arrowleft", "one_B", "one_B.2", "two_B", "two_B.2", "three_B", "three_B.2"],
    ["H_R", "H_R.2", "B_B", "B_B.2", "uniA4D8.2", "uniA4D8.3", "", "", ""],
]
# The words page, line by line: the phrases in order (None = crossed out, skip).
WORDS = [
    ["Complete Book", "Complete Book.2"],
    ["Walk-Off", "Walk-Off.2", "vs.", "vs..2", "v.", "v..2"],
    ["Rare Plays", "Rare Plays.2"],
    ["Inside the Park", "Inside the Park.2"],
    ["Player of the Game", "Final"],
    ["Player of the Game.2", "Final.2"],
    [None, "Tie", "Tie.2", "slashed zero", "slashed zero.2", "slashed zero.3"],
    ["Scorer's Notes", "Scorer's Notes.2"],
    ["Cycle", "Triple", "Double Play"],
    ["Cycle.2", "Triple.2", "Double Play.2"],
    ["Triple Play", "Grand Slam", "Sub"],
    ["Triple Play.2", "Grand Slam.2", "Sub.2"],
]


def components(mask):
    """Connected blobs of ink (8-way), as lists of (y, x)."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    out = []
    for y, x in zip(*np.nonzero(mask)):
        if seen[y, x]:
            continue
        blob, q = [], deque([(y, x)])
        seen[y, x] = True
        while q:
            cy, cx = q.popleft()
            blob.append((cy, cx))
            for ny in (cy - 1, cy, cy + 1):
                for nx in (cx - 1, cx, cx + 1):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
        out.append(blob)
    return out


def pen_only(gray):
    """Keep his pen strokes; drop printed lines, labels, and specks."""
    mask = gray < INK
    keep = np.zeros_like(mask)
    for blob in components(mask):
        ys = [p[0] for p in blob]
        xs = [p[1] for p in blob]
        bh, bw = max(ys) - min(ys) + 1, max(xs) - min(xs) + 1
        # A printed line is 1–4 px across and long; a speck is tiny.
        if len(blob) < 50 or min(bh, bw) < 7:
            continue
        for y, x in blob:
            keep[y, x] = True
    return keep


def save(mask, group, name):
    ys, xs = np.nonzero(mask)
    if not len(ys):
        return None
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    tight = mask[y0:y1, x0:x1]
    (OUT / group).mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.where(tight, 0, 255).astype(np.uint8)).save(OUT / group / f"{name.replace('/', '_')}.png")
    return int(x0), int(y0), int(x1), int(y1)


def stroke_px(mask):
    """His pen's line width on this page: twice the ink area over the outline length."""
    area = mask.sum()
    edge = (mask[1:, :] != mask[:-1, :]).sum() + (mask[:, 1:] != mask[:, :-1]).sum()
    return float(2 * area / edge) if edge else 0.0


def read_template(gray, layout, group, meta, margin=()):
    pieces = {}
    whole = np.zeros(gray.shape, dtype=bool)
    for r, row in enumerate(layout):
        for c, name in enumerate(row):
            if not name:
                continue
            top, bottom = ROWS[r] + LABEL + 6, ROWS[r + 1] - 6
            left, right = COLS[c] + 8, COLS[c + 1] - 8
            mask = pen_only(gray[top:bottom, left:right])
            box = save(mask, group, name)
            if box is None:
                print(f"{group}/{name}: empty box", file=sys.stderr)
                continue
            whole[top:bottom, left:right] |= mask
            # Place in the box, as fractions of the box's writing area.
            bw, bh = right - left, bottom - top
            pieces[name] = {"x0": box[0] / bw, "y0": box[1] / bh, "x1": box[2] / bw, "y1": box[3] / bh, "box_px": [bw, bh]}
    for name, r, side in margin:
        top, bottom = ROWS[r] + 10, ROWS[r + 1] - 10
        left, right = (0, COLS[0] - 6) if side == "left" else (COLS[-1] + 6, gray.shape[1] - 40)
        mask = pen_only(gray[top:bottom, left:right])
        box = save(mask, group, name)
        if box is None:
            continue
        whole[top:bottom, left:right] |= mask
        # Margin pieces have no box: record their height against the row's box, bottom aligned later.
        bh = ROWS[r + 1] - ROWS[r] - LABEL - 12
        pieces[name] = {"height": (box[3] - box[1]) / bh, "width_over_height": (box[2] - box[0]) / (box[3] - box[1]), "margin": True}
    meta[group] = {"pieces": pieces, "stroke_px": stroke_px(whole)}


def lines_of(mask, min_gap=12):
    """Text lines: bands of rows with ink, split where the ink nearly stops (a tail can cross)."""
    counts = mask.sum(1)
    rows = counts > max(4, 0.03 * counts.max())
    bands, start, empty = [], None, 0
    for y, on in enumerate(rows):
        if on:
            if start is None:
                start = y
            empty = 0
        elif start is not None:
            empty += 1
            if empty >= min_gap:
                bands.append((start, y - empty + 1))
                start, empty = None, 0
    if start is not None:
        bands.append((start, len(rows)))
    return [b for b in bands if b[1] - b[0] > 40]


def gaps_of(mask):
    """Ink column runs across a line: [(x0, x1)] with the gaps between them."""
    cols = mask.sum(0) > 0
    runs, start = [], None
    for x, on in enumerate(cols):
        if on and start is None:
            start = x
        elif not on and start is not None:
            runs.append((start, x))
            start = None
    if start is not None:
        runs.append((start, len(cols)))
    return runs


def baseline_of(mask):
    """Where the letters sit: the bottom of the dense band (descenders are thin)."""
    counts = mask.sum(1).astype(float)
    peak = counts.max()
    dense = np.nonzero(counts > 0.35 * peak)[0]
    return int(dense.max()), int(dense.min())


def line_pieces(mask):
    """
    Split a page of writing into lines of whole strokes. Bands of dense rows find
    the lines; each stroke then joins the line its middle sits in, so a tail
    that dips into the next line stays with its own letter.
    """
    bands = lines_of(mask)
    lines = [np.zeros_like(mask) for _ in bands]
    mids = [(a + b) / 2 for a, b in bands]
    for blob in components(mask):
        ys = [p[0] for p in blob]
        cy = (min(ys) + max(ys)) / 2
        i = min(range(len(bands)), key=lambda k: 0 if bands[k][0] <= cy < bands[k][1] else abs(cy - mids[k]))
        for y, x in blob:
            lines[i][y, x] = True
    return lines


def split_phrases(line, count):
    """Cut a line into `count` phrases at its widest gaps."""
    runs = gaps_of(line)
    gaps = sorted(((runs[i + 1][0] - runs[i][1], i) for i in range(len(runs) - 1)), reverse=True)
    cuts = sorted(i for _, i in gaps[: count - 1])
    starts = [0] + [i + 1 for i in cuts]
    ends = cuts + [len(runs) - 1]
    return [(runs[a][0], runs[b][1]) for a, b in zip(starts, ends)]


def read_words(gray, meta):
    mask = pen_only(gray[150:3200, 60:2500])
    lines = line_pieces(mask)
    if len(lines) != len(WORDS):
        raise SystemExit(f"words page: found {len(lines)} lines, expected {len(WORDS)}")
    pieces = {}
    for line, phrases in zip(lines, WORDS):
        for name, (x0, x1) in zip(phrases, split_phrases(line, len(phrases))):
            if name is None:
                continue
            piece = np.zeros_like(line)
            piece[:, x0:x1] = line[:, x0:x1]
            box = save(piece, "words", name)
            base, top = baseline_of(piece)
            pieces[name] = {"baseline_px": base - box[1], "body_top_px": top - box[1], "height_px": box[3] - box[1], "width_px": box[2] - box[0]}
    meta["words"] = {"pieces": pieces, "stroke_px": stroke_px(mask)}


def read_spacing(gray, meta):
    """Free writing: his gaps between letters and between words, against his x-height."""
    mask = pen_only(gray[150:3200, 60:2500])
    letter_gaps, word_gaps, x_heights = [], [], []
    for line in line_pieces(mask):
        base, top = baseline_of(line)
        x_heights.append(base - top)
        runs = gaps_of(line)
        gaps = [runs[i + 1][0] - runs[i][1] for i in range(len(runs) - 1)]
        if not gaps:
            continue
        # Word gaps are the clear outliers; everything else is between letters.
        cut = max(statistics.median(gaps) * 2.5, 40)
        letter_gaps += [g for g in gaps if g < cut]
        word_gaps += [g for g in gaps if g >= cut]
    xh = statistics.median(x_heights)
    meta["spacing"] = {
        "x_height_px": xh,
        "letter_gap": statistics.median(letter_gaps) / xh,
        "word_gap": statistics.median(word_gaps) / xh,
        "stroke_px": stroke_px(mask),
    }
    print("spacing:", meta["spacing"])


def main(paths):
    if len(paths) != 4:
        raise SystemExit("give the four page images, in order")
    pages = [np.array(Image.open(p).convert("L")) for p in paths]
    if OUT.exists():
        for old in OUT.rglob("*.png"):
            old.unlink()
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {"scan": "Steve's handwriting sampler, Nov 11, 2026, 300 dpi"}
    read_spacing(pages[0], meta)
    read_words(pages[1], meta)
    read_template(pages[2], LETTERS, "letters", meta, MARGIN)
    read_template(pages[3], SYMBOLS, "symbols", meta)
    (OUT / "sheets.json").write_text(json.dumps(meta, indent=1) + "\n")
    print("pen stroke (px):", {k: round(v["stroke_px"], 1) for k, v in meta.items() if isinstance(v, dict) and "stroke_px" in v})


if __name__ == "__main__":
    main(sys.argv[1:])
