import json, sys
from PIL import Image
import numpy as np
from psd_tools import PSDImage
from psd_tools.api.layers import PixelLayer, Group
src, out = sys.argv[1], sys.argv[2]
m = json.load(open(f'{src}/manifest.json'))
first = Image.open(f"{src}/{m[0]['file']}")
psd = PSDImage.new('RGBA', first.size)
groups = {}
NAMES = {'ꓘ': 'Backwards K (Looking)', 'K': 'K (Swinging)', 'BB': 'BB (Walk)', 'E': 'E (Error)', 'FC': 'FC (Fielder\'s Choice)', 'GO': 'GO (Grounder)', 'F': 'F (Fly Out)', 'L': 'L (Line Out)', 'P': 'P (Pop Out)', 'SF': 'SF (Sac Fly)', 'DP': 'DP (Double Play)', 'HRO': 'HRO (HR Out, dimmed)', 'FBO': 'FBO (Foul Out)', 'HR': 'HR (Home Run)', '1B': '1B (Single)', '2B': '2B (Double)', '3B': '3B (Triple)'}
for l in m:
    l['name'] = NAMES.get(l['name'], l['name'])
    # Photoshop's layer names are Mac Roman: swap what it can't hold (the Book's arrows, for one).
    l['name'] = l['name'].replace('→', '->').replace('ꓘ', 'K (looking)').encode('mac_roman', 'replace').decode('mac_roman')
    im = Image.open(f"{src}/{l['file']}").convert('RGBA')
    bbox = im.getbbox()
    if not bbox or np.array(im)[:, :, 3].max() == 0:
        continue
    g = groups.get(l['group'])
    if g is None:
        g = Group.new(psd, name=l['group'])
        groups[l['group']] = g
    piece = im.crop(bbox)
    PixelLayer.frompil(piece, g, name=l['name'], top=bbox[1], left=bbox[0])

# ---- Guides (Steve, Nov 16): a point grid and the sizes of the big pieces, in points. ----
from PIL import ImageDraw, ImageFont
import io, os
W, H = first.size
S = W / 393  # pixels per point (3 on an iPhone 16 export)
def label_font(size):
    try:
        from fontTools.ttLib import TTFont
        here = os.path.dirname(os.path.abspath(__file__))
        f = TTFont(os.path.join(here, '..', '..', 'src', 'assets', 'fonts', 'barlow-condensed-700.woff2'))
        f.flavor = None
        buf = io.BytesIO(); f.save(buf); buf.seek(0)
        return ImageFont.truetype(buf, size)
    except Exception:
        return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', size)
guides = Group.new(psd, name='Guides (points)')
grid = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(grid)
small = label_font(int(9 * S))
for pt in range(0, int(W / S) + 1, 8):
    x = round(pt * S)
    major = pt % 40 == 0
    d.line([(x, 0), (x, H)], fill=(0, 170, 255, 150 if major else 55), width=2 if major else 1)
    if major and pt:
        d.text((x + 3, 3), str(pt), font=small, fill=(0, 120, 210, 255))
for pt in range(0, int(H / S) + 1, 8):
    y = round(pt * S)
    major = pt % 40 == 0
    d.line([(0, y), (W, y)], fill=(0, 170, 255, 150 if major else 55), width=2 if major else 1)
    if major and pt:
        d.text((3, y + 2), str(pt), font=small, fill=(0, 120, 210, 255))
d.text((round(6 * S), round(H - 18 * S)), '1 point = %d pixels here. Fine lines every 8 points, numbered lines every 40.' % round(S), font=small, fill=(0, 120, 210, 255))
PixelLayer.frompil(grid, guides, name='Point Grid (8 pt, numbered every 40)', top=0, left=0)
sizes = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(sizes)
font = label_font(int(10 * S))
placed = []
for l in m:
    me = l.get('measure')
    if not me:
        continue
    x0, y0 = round(me['x'] * S), round(me['y'] * S)
    x1, y1 = round((me['x'] + me['w']) * S), round((me['y'] + me['h']) * S)
    d.rectangle([x0, y0, x1, y1], outline=(255, 45, 120, 255), width=3)
    text = '%s  %g x %g pt' % (l['name'], round(me['w']), round(me['h']))
    if me.get('text'):
        text += '  ·  text %g pt' % round(me['text'], 1)
    tb = d.textbbox((0, 0), text, font=font)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    bw, bh = tw + 12, th + 10
    lx = min(max(0, x0), W - bw)
    # Above the piece if there's room, else just inside its top; then step down past any label
    # already placed, so no two labels cover each other.
    tries = [y0 - bh - 2, y0 + 4] + [y0 + 4 + k * (bh + 2) for k in range(1, 12)]
    ly = next((y for y in tries if y >= 0 and not any(lx < px1 and lx + bw > px0 and y < py1 and y + bh > py0 for px0, py0, px1, py1 in placed)), y0 + 4)
    placed.append((lx, ly, lx + bw, ly + bh))
    d.rectangle([lx, ly, lx + bw, ly + bh], fill=(255, 45, 120, 235))
    d.text((lx + 6, ly + 3 - tb[1]), text, font=font, fill=(255, 255, 255, 255))
PixelLayer.frompil(sizes, guides, name='Sizes (points)', top=0, left=0)
psd.save(out)
check = PSDImage.open(out)
print(out, check.size, sum(1 for _ in check.descendants()), 'layers and groups')
