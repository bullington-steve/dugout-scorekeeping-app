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
psd.save(out)
check = PSDImage.open(out)
print(out, check.size, sum(1 for _ in check.descendants()), 'layers and groups')
