import json, base64, io, os
from PIL import Image
out = []
# crane drawings — side views from the Liebherr / Demag / Zoomlion CAD library (body, telescopic sections, cylinder, hook)
NAMES = {'ltm1090': 'Liebherr LTM 1090-4.2', 'ltm1100': 'Liebherr LTM 1100-5.1', 'ltm1110': 'Liebherr LTM 1110-5.2', 'ltm1160': 'Liebherr LTM 1160-5.2',
         'ltm1220': 'Liebherr LTM 1220-5.2', 'ltm1230': 'Liebherr LTM 1230-5.1', 'ltm1250': 'Liebherr LTM 1250-6.1', 'ltm1300': 'Liebherr LTM 1300-6.2',
         'ltm1300_63': 'Liebherr LTM 1300-6.3', 'ltm1400': 'Liebherr LTM 1400-7.1', 'ltm1450': 'Liebherr LTM 1450-8.1', 'ltm1500': 'Liebherr LTM 1500-8.1',
         'ltm1650': 'Liebherr LTM 1650-8.1', 'ltm1750': 'Liebherr LTM 1750-9.1', 'ltm11200': 'Liebherr LTM 11200-9.1', 'ac700': 'Demag AC 700',
         'ztc1000v': 'Zoomlion ZTC1000V', 'ztc600v': 'Zoomlion ZTC600V', 'ztc300v': 'Zoomlion ZTC300V', 'zat2000v': 'Zoomlion ZAT2000V'}
dr = {}
for k, lab in NAMES.items():
    d = json.load(open(f'/home/claude/lun_in/nm/{k}.json'))
    d['v'] = 2; d['label'] = lab
    dr[k] = d
out.append('const CRANE_DRAWINGS = ' + json.dumps(dr, separators=(',', ':')) + ';')
out.append("const DRAWING_ALIAS = { k11002: 'ztc1000v', ltm1200: 'ltm1220' };")
# dimension images
imgs = {}
for fn in sorted(os.listdir('/home/claude/lc/dims/out')):
    im = Image.open('/home/claude/lc/dims/out/' + fn).convert('RGB'); im.thumbnail((1150, 1150))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=62, optimize=True, progressive=True)
    imgs[fn[:-4]] = 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()
out.append('const DIMS_IMG = ' + json.dumps(imgs) + ';')
# imported charts
ch = {}
for key, src in (('ltm1080', 'LTM10801'), ('ltm1160', 'LTM116051'), ('ltm1200', 'LTM120051'), ('ltm1250', 'LTM125061'), ('ltm1300', 'LTM130062'), ('ltm1500', 'LTM150081')):
    a = json.load(open(f'/home/claude/lc/app_{src}.json'))
    order = {'main': 0, 'fixedjib': 1, 'luffing': 2}
    a.sort(key=lambda c: (order[c['kind']], c['config'].startswith('TY'), ))
    for c in a:
        if c['kind'] != 'main' and ' · p.' not in c['name']: c['name'] += ' · ' + c['source'].split(' p.')[1].split(' ')[0].join(['p.', ''])
    ch[key] = a
out.append('const IMPORTED_CHARTS = ' + json.dumps(ch, separators=(',', ':')) + ';')
s = '\n'.join(out)
open('/home/claude/liftplan/gen/assets.js', 'w').write(s)
print('assets.js', len(s) // 1024, 'KB', {k: len(v) for k, v in ch.items()}, {k: len(v) // 1024 for k, v in imgs.items()})
