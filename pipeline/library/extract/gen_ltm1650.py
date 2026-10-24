import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
"""v11: LTM 1650-8.1 main-boom (T3) and Y-guyed (T3Y) tables -> LIB_1650 in src/data.js.

    LL_LIB="/path/to/LoadLock Crane Library" LL_CHART_OUT=chart_out python3 pipeline/library/extract/gen_ltm1650.py [src/data.js]

Liebherr prints these as "max" tables: every cell is coloured by the ballast set-up that gives it (VarioBallast 155 t at 6.4 / 7.4 / 8.4 m,
175 t at 6.4 / 7.4 m — the legend boxes at the top of the page). A value is only the maker's figure for the set-up of its colour, so one chart
is written per set-up holding only the cells of that colour; every other cell is '-' (not given for that set-up). The colour is read from the
rendered page (pixels round each number, majority vote against the five legend colours). The over-rear-only column (*) is left out.
Source: Nordic Crane LTM 1650-8.1.pdf (Liebherr data, pages 29 = T3 and 31 = T3Y).
"""
import json, re, collections
import fitz
from dump import find, LIB, OUT
from grid import rows_of, NUM

F = find('ltm1650', 'Nordic Crane LTM 1650-8.1')[0]
doc = fitz.open(LIB + '/' + F)
xc = lambda w: (w[0] + w[2]) / 2
yc = lambda w: (w[1] + w[3]) / 2
num = lambda t: float(t.replace(',', '.')) if NUM.match(t) and not t.endswith('*') else None
fmt = lambda v: '%g' % v
LEG = {(155, 6.4): (1.0, 0.969, 0.885), (155, 7.4): (1.0, 0.898, 0.587), (155, 8.4): (0.998, 0.799, 0.0), (175, 6.4): (0.852, 0.854, 0.855), (175, 7.4): (0.695, 0.698, 0.699)}
OTHER = {'white': (1.0, 1.0, 1.0), 'line': (0.93, 0.93, 0.93), 'ink': (0.10, 0.10, 0.10)}

def page_table(pno, cap):
    pg = doc[pno - 1]; ws = [(w[0], w[1], w[2], w[3], w[4]) for w in pg.get_text('words')]
    # legend check: the five boxes are where the script expects them
    sc = 150 / 72; pix = pg.get_pixmap(dpi=150); W, H = pix.width, pix.height; S = pix.samples; n = pix.n
    def px(x, y):
        X, Y = int(x * sc), int(y * sc)
        if not (0 <= X < W and 0 <= Y < H): return None
        i = (Y * W + X) * n; return (S[i] / 255, S[i + 1] / 255, S[i + 2] / 255)
    near = lambda c: min(list(LEG.items()) + list(OTHER.items()), key=lambda kv: sum((a - b) ** 2 for a, b in zip(kv[1], c)))[0]
    for w in ws:  # the legend boxes themselves must classify as their own set-up
        if w[4] in ('6,4', '7,4', '8,4') and w[1] < 200:
            k = near(px(w[0] - 2, yc(w)))
            assert isinstance(k, tuple) and k[1] == num(w[4]), ('legend', pno, w[4], k)
    # header: the boom lengths ('16,7 m' …) on the row above the table; '*' marks the over-rear-only column
    R = rows_of(ws)
    hy, hr = next((y, r) for y, r in R if y > 175 and sum(1 for w in r if re.fullmatch(r'\d+(,\d)?', w[4])) >= 6 and any(w[4] == 'm' for w in r))
    cols = [(xc(w), num(w[4])) for w in hr if re.fullmatch(r'\d+(,\d)?', w[4]) and 60 < xc(w) < 540]
    star_x = [xc(w) for y, r in R if hy < y < hy + 14 for w in r if w[4] == '*']
    # the first boom length heads two cells (the left one is over the rear only, marked *): the data columns are read from the value positions
    vals = [w for y, r in R if y > hy + 8 for w in r if num(w[4]) is not None and 60 < xc(w) < 540]
    xs = sorted(xc(w) for w in vals); cx = []
    for x in xs:
        if not cx or x - cx[-1][-1] > 14: cx.append([x])
        else: cx[-1].append(x)
    dcols = [sum(c) / len(c) for c in cx]
    # each data column belongs to the nearest header; the over-rear-only one is the column under the star
    hdr_of = [min(cols, key=lambda c: abs(c[0] - x))[1] for x in dcols]
    drop = {i for i, x in enumerate(dcols) if any(abs(x - s) < 16 for s in star_x)}
    tabs = {k: {} for k in LEG}; seen = collections.Counter(); unknown = []
    for y, r in R:
        if y <= hy + 8: continue
        lab = [w for w in r if xc(w) < 60 and re.fullmatch(r'\d+(,\d)?', w[4])]
        if not lab: continue
        Rr = num(lab[0][4]); row = {k: [None] * len(dcols) for k in LEG}
        for w in r:
            if w is lab[0] or not (60 < xc(w) < 540): continue
            v = num(w[4])
            if v is None: continue
            i = min(range(len(dcols)), key=lambda j: abs(dcols[j] - xc(w)))
            if i in drop: continue
            votes = collections.Counter(near(c) for c in (px(w[0] - 2.2, yc(w)), px(w[2] + 2.2, yc(w)), px(xc(w), w[1] - 0.8), px(xc(w), w[3] + 0.8), px(w[0] - 4, w[1]), px(w[2] + 4, w[3])) if c)
            k = next((kk for kk, _ in votes.most_common() if isinstance(kk, tuple)), None)
            if k is None: unknown.append((Rr, hdr_of[i], v)); continue
            assert v <= cap, (pno, Rr, v)
            row[k][i] = v; seen[k] += 1
        for k in LEG: tabs[k][Rr] = row[k]
    keep = [i for i in range(len(dcols)) if i not in drop]
    return tabs, [hdr_of[i] for i in keep], keep, seen, unknown

def chart_src(tab, heads, keep):
    cnt = collections.Counter(heads); used = collections.Counter(); hs = []
    for L in heads: hs.append(fmt(L) + ('/' + 'abcd'[used[L]] if cnt[L] > 1 else '')); used[L] += 1
    lines = ['H: ' + ' | '.join(hs)]
    for Rr in sorted(tab):
        v = [tab[Rr][i] for i in keep]
        if all(x is None for x in v): continue
        lines.append(fmt(Rr) + ': ' + ' '.join('-' if x is None else fmt(x) for x in v))
    return '\n'.join(lines)

def mono(tab, keep):  # capacity never rises with the radius in any column — except at the steepest radii (<= 5 m), where Liebherr's own table does
    for i in keep:
        prev = None
        for Rr in sorted(tab):
            v = tab[Rr][i]
            if v is None: continue
            if prev is not None and v > prev + 1e-9 and Rr > 5: return (Rr, i, prev, v)
            prev = v
    return None
# a picture of the page with each number's set-up written over it, to check the colour reading by eye (LL_OVERLAY=1)
def overlay(pno, tabs, keep):
    pg = doc[pno - 1]; ws = pg.get_text('words'); tag = {}
    for (cw, br), tab in tabs.items():
        for Rr, row in tab.items():
            for v in row:
                if v is not None: tag.setdefault(fmt(v), set()).add('%d/%s' % (cw, fmt(br)))
    for w in ws:
        if w[1] > 200 and fmt(num(w[4]) or -1) in tag: pg.insert_text((w[0], w[3] + 4), ','.join(sorted(tag[fmt(num(w[4]))])), fontsize=3.5, color=(0.8, 0, 0))
    pg.get_pixmap(dpi=130).save(os.path.join(OUT, 'ltm1650_p%d_overlay.png' % pno))

out = []
for pno, cfg, word in ((29, 'T3', 'telescopic boom'), (31, 'T3Y', 'telescopic boom, Y-guyed')):
    tabs, heads, keep, seen, unknown = page_table(pno, 700)
    print(cfg, 'cells per set-up', dict(seen), 'unclassified', len(unknown), unknown[:5])
    if os.environ.get('LL_OVERLAY'): overlay(pno, tabs, keep)
    assert len(unknown) <= 2, unknown
    for (cw, br), tab in tabs.items():
        if not seen[(cw, br)]: continue
        bad = mono(tab, keep); assert bad is None, (cfg, cw, br, bad)
        out.append(dict(id='%s-%d-%g' % (cfg.lower(), cw, br), name='%s · %d t CWT · VarioBallast at %s m · 360° · %s · UNVERIFIED' % (cfg, cw, fmt(br).replace('.', ','), word),
          kind='main', config=cfg, cwt=cw, ballastR=br, sectors=['360'], src=chart_src(tab, heads, keep),
          source=F + ' p.%d (Liebherr LTM 1650-8.1 %s, 360°, max table). UNVERIFIED. Only the cells Liebherr colours for %d t ballast at %s m are in this chart; a \'-\' means the maker gives that point for another ballast set-up. The over-rear-only column is left out.' % (pno, cfg, cw, fmt(br))))
os.makedirs(OUT, exist_ok=True); json.dump(out, open(OUT + '/ltm1650.json', 'w'), ensure_ascii=False, indent=1)
for ch in out: print(ch['id'], ch['src'].count('\n'), 'rows')
dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'src', 'data.js')
START = '// ---------- v11: LTM 1650-8.1 charts from the crane library (UNVERIFIED) ----------'
END = "for (const c of DEFAULT_CRANES) if (c.id === 'ltm1650') c.charts = (c.charts || []).concat(LIB_1650);\n"
L = [START, '// Read by pipeline/library/extract/gen_ltm1650.py: one chart per VarioBallast set-up, only the cells Liebherr colours for it (see the script).', 'const LIB_1650 = [']
for j, ch in enumerate(out):
    f2 = ['id:%s' % json.dumps(ch['id']), 'name:%s' % json.dumps(ch['name'], ensure_ascii=False), "kind:'main'", 'config:%s' % json.dumps(ch['config']), 'cwt:%s' % json.dumps(ch['cwt']), 'ballastR:%s' % json.dumps(ch['ballastR']), "sectors:['360']", 'verify:true']
    L.append('  { ' + ', '.join(f2) + ','); L.append('    source:%s,' % json.dumps(ch['source'], ensure_ascii=False)); L.append('    src:`' + ch['src'] + '` }' + (',' if j < len(out) - 1 else ''))
L.append('];'); L.append(END.rstrip('\n')); block = '\n'.join(L) + '\n'
s = open(dst, encoding='utf-8').read()
if START in s: i = s.index(START); j = s.index(END) + len(END); s = s[:i] + block + s[j:]
else: k = s.index('for (const c of DEFAULT_CRANES) if (LIB_JIBS[c.id])'); k = s.index('\n', k) + 1; s = s[:k] + block + s[k:]
open(dst, 'w', encoding='utf-8').write(s); print('LIB_1650 block written to', dst, '(%d chars)' % len(block))
