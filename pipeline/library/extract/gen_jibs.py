import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
"""v11: fly-jib tables from the LoadLock Crane Library -> LIB_JIBS in src/data.js (so the chart follows the jib on the crane).

    LL_LIB="/path/to/LoadLock Crane Library" LL_CHART_OUT=chart_out python3 pipeline/library/extract/gen_jibs.py [src/data.js]

Run it from a folder that is not the library (the PDFs are untrusted input). Every table is read from the PDF text layer (words with
positions) — nothing is typed by hand — and checked: capacities never rise as the radius grows (or as the boom angle falls), no cell above
the crane's class. Tables:
  SANY STC500, STC750  jib on the fully extended boom; rows = main-boom angle (rowsBy:'angle'), columns = offset; kg -> t
  Zoomlion ZTC1000     jib 11 / 18.6 / 26.6 m on a 58.5 / 63 m boom; rows = main-boom angle; t. Outriggers fully extended only.
                       Two tables are both titled "28 t" (Table 11 and 12, the second one lower): the lower value of each cell is used.
  Demag AC100 (HAV)    fly jib 9.2 / 17 m on 38.0 / 42.2 / 46.4 / 50.2 m; rows = radius; t. Cells marked * / ** (another boom length) are blank.
"""
import json, re
import fitz
from dump import find, LIB, OUT
from grid import rows_of, NUM

def words_of(f, page, clip=None):
    d = fitz.open(LIB + '/' + f); pg = d[page - 1]
    return [(w[0], w[1], w[2], w[3], w[4]) for w in pg.get_text('words', clip=fitz.Rect(*clip) if clip else None)]
xc = lambda w: (w[0] + w[2]) / 2
def deg(t):
    m = re.fullmatch(r'(\d+(?:[.,]\d+)?)°', t.strip()); return float(m.group(1).replace(',', '.')) if m else None
def num(t):
    t = t.strip().replace('　', ''); return float(t.replace(',', '.')) if NUM.match(t) and not t.endswith('*') else None
fmt = lambda v: '%g' % v

# ---------- angle-indexed tables (SANY, Zoomlion) ----------
def angle_table(ws, offs_y, jib_y, boom_y=None, scale=1.0, tol=12):
    """offs_y / jib_y / boom_y: the y of the offset, jib-length and (optional) boom-length header rows. Returns
    {(jibLen, mainLen or None): {'offs': [deg...], 'rows': {angle: [t or None per offset]}}}"""
    R = rows_of(ws)
    row_at = lambda y: next((r for yy, r in R if abs(yy - y) < 3), [])
    offs = [(xc(w), deg(w[4])) for w in row_at(offs_y) if deg(w[4]) is not None]
    jibs = [(xc(w), float(re.match(r'(\d+(?:\.\d+)?)m', w[4]).group(1))) for w in row_at(jib_y) if re.match(r'\d+(?:\.\d+)?m', w[4])]
    booms = [(xc(w), float(re.match(r'(\d+(?:\.\d+)?)m', w[4]).group(1))) for w in row_at(boom_y) if re.match(r'\d+(?:\.\d+)?m', w[4])] if boom_y else []
    # column groups: a new jib group starts where the boom length (or, without a boom row, the offset) starts again
    grp = []; gi = -1; prev = None
    for x, o in offs:
        b = min(booms, key=lambda q: abs(q[0] - x))[1] if booms else None
        key = b if booms else o
        if prev is None or (key <= prev if not booms else (b == booms[0][1] and prev != b)): gi += 1
        prev = key; grp.append((gi, b))
    assert gi + 1 == len(jibs), ('groups', gi + 1, jibs)
    out = {}
    for (x, o), (g, b) in zip(offs, grp): out.setdefault((jibs[g][1], b), {'offs': [], 'xs': [], 'rows': {}})['offs'].append(o); out[(jibs[g][1], b)]['xs'].append(x)
    for yy, r in R:
        if yy <= offs_y + 3: continue
        a = [w for w in r if deg(w[4]) is not None and xc(w) < offs[0][0] - 8]
        if not a: continue
        ang = deg(a[0][4])
        for key, t in out.items():
            vals = []
            for x in t['xs']:
                c = [w for w in r if abs(xc(w) - x) < tol and w is not a[0]]
                v = num(c[0][4]) if c else None
                vals.append(round(v * scale, 3) if v is not None else None)
            t['rows'][ang] = vals
    return out

# ---------- radius tables, Demag text layer (AC100 HAV) ----------
def demag_block(ws, clip):
    """one HAV block: main length in its title, jib 9.2 / 17.0 m x 0/20/40°. Returns {(jibLen, mainLen): {'offs', 'rows'}}"""
    B = [w for w in ws if clip[0] <= xc(w) <= clip[2] and clip[1] <= (w[1] + w[3]) / 2 <= clip[3]]
    R = rows_of(B)
    title = next(r for y, r in R if any(re.fullmatch(r'\d+,\d', w[4]) for w in r) and any(w[4] == 'm' for w in r) and not any('°' in w[4] for w in r))
    mainL = num(next(w[4] for w in title if re.fullmatch(r'\d+,\d', w[4])))
    jr = next(r for y, r in R if sum(1 for w in r if re.fullmatch(r'\d+,\d', w[4])) == 2 and r is not title)
    jibs = [(xc(w), num(w[4])) for w in jr if re.fullmatch(r'\d+,\d', w[4])]
    oy, orow = next((y, r) for y, r in R if sum(1 for w in r if deg(w[4]) is not None) >= 6)
    offs = [(xc(w), deg(w[4])) for w in orow if deg(w[4]) is not None]
    rx = min(x for x, _ in offs) - 25
    rows = []
    for y, r in R:
        if y <= oy + 3: continue
        lab = [w for w in r if xc(w) < rx and re.fullmatch(r'\d+', w[4])]
        if not lab: continue
        rows.append((y, lab[0], r))
    # the text layer puts a spurious 1 in front of one-digit radii: rows before the first drop (…19 → 10) lose it
    rs = [int(l[4]) for _, l, _ in rows]; drop = next((i for i in range(1, len(rs)) if rs[i] < rs[i - 1]), None)
    out = {}
    for j, (jx, jl) in enumerate(jibs):
        idx = [i for i, (x, o) in enumerate(offs) if (i // 3) == j]
        out[(jl, mainL)] = {'offs': [offs[i][1] for i in idx], 'rows': {}}
    for k, (y, lab, r) in enumerate(rows):
        R0 = int(lab[4]); R0 = int(lab[4][1:]) if drop is not None and k < drop and lab[4].startswith('1') and len(lab[4]) == 2 else R0
        cells = [None] * len(offs); star = set()
        for w in sorted(r, key=lambda q: q[0]):
            if w is lab or xc(w) < rx: continue
            t = w[4]
            if set(t) <= set('*'):  # a star on its own: the value to its left belongs to another boom length
                left = [i for i, (x, o) in enumerate(offs) if x < xc(w)]
                if left: star.add(max(left, key=lambda i: offs[i][0]))
                continue
            i = min(range(len(offs)), key=lambda i: abs(offs[i][0] - xc(w)))
            if abs(offs[i][0] - xc(w)) > 14: continue
            if t.endswith('*'): star.add(i); continue
            if t.startswith('-'): continue
            v = num(t)
            if v is not None: cells[i] = v
        for i in star: cells[i] = None
        for j, (key, tb) in enumerate(out.items()): tb['rows'][R0] = cells[j * 3:(j + 1) * 3]
    return out

def check(tb, cap, by_angle=False):
    """values never rise toward the weaker end (bigger radius / flatter boom), nothing above the class"""
    keys = sorted(tb['rows'], reverse=by_angle); probs = []
    for c in range(len(tb['offs'])):
        prev = None
        for k in keys:
            v = tb['rows'][k][c]
            if v is None: continue
            if v > cap: probs.append(('over class', k, c, v))
            if prev is not None and v > prev + 1e-9: probs.append(('rises', k, c, prev, v))
            prev = v
    return probs
def src_text(tb, by_angle=False):
    keys = sorted(tb['rows']); cols = list(range(len(tb['offs'])))
    lines = ['H: ' + ' | '.join(fmt(o) for o in tb['offs'])]
    for k in keys:
        v = tb['rows'][k]
        if all(x is None for x in v): continue
        lines.append(fmt(k) + ': ' + ' '.join('-' if x is None else fmt(x) for x in v))
    return '\n'.join(lines)

out = {}
def add(crane, ch): out.setdefault(crane, []).append(ch)
# ---- SANY STC500: the jib table of the Chinese/English brochure (page 14 of the brochure, p.8 of the pdf) ----
f = find('stc500', 'STC500 - Load Chart - Metric - English (2)')[0]
ws = words_of(f, 8, (600, 130, 1190, 470))
T = angle_table(ws, offs_y=206.4, jib_y=189.1, scale=0.001)
for (jl, _), tb in sorted(T.items()):
    assert not check(tb, 50, by_angle=True), check(tb, 50, True)
    add('stc500', dict(id='j%g' % jl, name='Fly jib %g m on 43 m boom · 0/15/30° · over rear and side · UNVERIFIED' % jl, kind='fixedjib', config='JIB', cwt=None, mainLen=43, mainLabel=43, jibLen=jl, rowsBy='angle', sectors=['rear', 'side'],
      src=src_text(tb, True), source=f + ' p.8 (brochure p.14, jib table: outriggers fully extended, over rear and side; the jib table states no counterweight). UNVERIFIED. kg converted to t. Rows are the main-boom angle (lowest 55°). The ratings include the hook; with the jib unfolded the main-boom hook rating drops by 2.3 t (maker\'s note 6).'))
# ---- SANY STC750 ----
f = find('stc750', 'STC750 - Load Chart - Metric - English')[0]
ws = words_of(f, 5, (600, 190, 1190, 480))
# the STC750 offset row has no '°' words of its own in the text layer → read the offsets from the drawn header (0/15/30°, as printed)
R = rows_of(ws); xs = sorted({round(xc(w)) for y, r in R if 255 < y < 470 for w in r if num(w[4]) is not None and xc(w) > 740})
def stc750():
    cols = []
    for x in xs:
        if not cols or x - cols[-1] > 20: cols.append(x)
    assert len(cols) == 6, cols
    tabs = {9.2: {'offs': [0, 15, 30], 'rows': {}}, 16: {'offs': [0, 15, 30], 'rows': {}}}
    for y, r in R:
        a = [w for w in r if deg(w[4]) is not None and xc(w) < 720]
        if not a: continue
        vals = []
        for x in cols:
            c = [w for w in r if abs(xc(w) - x) < 14 and w is not a[0]]; v = num(c[0][4]) if c else None; vals.append(round(v * 0.001, 3) if v is not None else None)
        tabs[9.2]['rows'][deg(a[0][4])] = vals[:3]; tabs[16]['rows'][deg(a[0][4])] = vals[3:]
    return tabs
for jl, tb in sorted(stc750().items()):
    assert not check(tb, 75, by_angle=True), check(tb, 75, True)
    add('stc750', dict(id='j%g' % jl, name='Fly jib %g m on 45 m boom · 0/15/30° · over rear and side · UNVERIFIED' % jl, kind='fixedjib', config='JIB', cwt=None, mainLen=45, mainLabel=45, jibLen=jl, rowsBy='angle', sectors=['rear', 'side'],
      src=src_text(tb, True), source=f + ' p.5 (brochure p.8, LOAD CHART FOR JIB: fully extended outriggers, over rear and side). UNVERIFIED. kg converted to t. Rows are the main-boom angle (lowest 55°). The ratings include the hook; with the jib unfolded the main hook rating drops by 2 t (maker\'s note 4).'))
# ---- Zoomlion ZTC1000 (the library holds the ZTC1000, not the V): jib tables, outriggers fully extended ----
f = find('ztc1000v', 'ZTC1000')[0]
def ztc(page, x0, x1, title_cwt, full=True):
    ws = words_of(f, page, (x0, 60, x1, 520)); R = rows_of(ws)
    ttl = ' '.join(w[4] for y, r in R if 85 < y < 95 for w in r)
    assert ('with %d tons counterweight' % title_cwt) in ttl and (('fully' in ttl) == full), ttl
    y = lambda word: next(yy for yy, r in R if any(w[4] == word for w in r))
    return angle_table(ws, offs_y=y('offset'), jib_y=next(yy for yy, r in R if r[0][4] == 'Jib'), boom_y=next(yy for yy, r in R if r[0][4] == 'Boom'))
z32 = ztc(5, 425, 800, 32); z28a = ztc(5, 905, 1270, 28); z28b = ztc(5, 1270, 1632, 28); z6 = ztc(6, 60, 420, 6)
def merge_min(a, b):
    m = {}
    for k in a:
        ta, tb = a[k], b[k]; rows = {}
        for ang in sorted(set(ta['rows']) | set(tb['rows'])):
            va, vb = ta['rows'].get(ang), tb['rows'].get(ang)
            rows[ang] = [None if (x is None or y is None) else min(x, y) for x, y in zip(va or [None] * len(ta['offs']), vb or [None] * len(ta['offs']))]
        m[k] = {'offs': ta['offs'], 'rows': rows}
    return m
z28 = merge_min(z28a, z28b)
for cwt, T, tn in ((32, z32, 'Table 10'), (28, z28, 'Tables 11 and 12, lower value of each cell'), (6, z6, 'Table 13')):
    for (jl, ml), tb in sorted(T.items()):
        if not any(any(v is not None for v in r) for r in tb['rows'].values()): continue
        assert not check(tb, 100, by_angle=True), (cwt, jl, ml, check(tb, 100, True))
        add('ztc1000v', dict(id='j%g-%g-%d' % (jl, ml, cwt), name='ZTC1000 (not the V) · Fly jib %g m on %g m boom · %d t CWT · full outriggers · UNVERIFIED' % (jl, ml, cwt), kind='fixedjib', config='JIB', cwt=cwt, mainLen=ml, mainLabel=ml, jibLen=jl, rowsBy='angle', sectors=['360'],
          src=src_text(tb, True), source=f + ' p.%d (%s: outriggers fully extended, %d t counterweight, over full range). UNVERIFIED. Rows are the main-boom angle. Zoomlion ZTC1000 chart, the nearest in the library — check it against the ZTC1000V\'s own jib chart.' % (5 if cwt != 6 else 6, tn, cwt)))
# ---- Demag AC100 HAV (Bigge copy of the 2008 chart): 4 counterweights, 4 main-boom lengths each ----
f = find('ac100', 'Bigge AC 100 - Demag-AC100')[0]
for page, cwt in ((14, 32), (15, 25), (16, 13.3), (17, 12)):
    ws = words_of(f, page)
    hdr = ' '.join(w[4] for y, r in rows_of(ws) if 130 < y < 140 for w in r); assert hdr.startswith(('%g' % cwt).replace('.', ',') + ' t') and '7,10 m x 7,00 m' in hdr and '360°' in hdr, hdr
    # the block titles ('38,0 m   42,2 m', then '46,4 m   50,2 m'): the lower pair starts at a different height on each page
    ty = [y for y, r in rows_of(ws) if len([w for w in r if re.fullmatch(r'\d+,\d', w[4])]) == 2 and any(xc(w) < 130 and re.fullmatch(r'\d+,\d', w[4]) for w in r) and any(300 < xc(w) < 360 and re.fullmatch(r'\d+,\d', w[4]) for w in r) and len(r) == 4]
    assert len(ty) == 2, (page, ty)
    for clip in ((60, ty[0] - 5, 295, ty[1] - 5), (295, ty[0] - 5, 560, ty[1] - 5), (60, ty[1] - 5, 295, 800), (295, ty[1] - 5, 560, 800)):
        blk = demag_block(ws, clip); assert all(ml in (38.0, 42.2, 46.4, 50.2) and jl in (9.2, 17.0) for jl, ml in blk), (page, list(blk))
        for (jl, ml), tb in sorted(blk.items()):
            if not any(any(v is not None for v in r) for r in tb['rows'].values()): continue
            assert not check(tb, 100), (page, ml, jl, check(tb, 100))
            add('ac100', dict(id='hav%g-%g-%g' % (jl, ml, cwt), name='Fly jib (HAV) %g m on %g m boom · %g t CWT · 7.1×7.0 m · 360° · UNVERIFIED' % (jl, ml, cwt), kind='fixedjib', config='HAV', cwt=cwt, outrigger='7.0x7.1', mainLen=ml, mainLabel=ml, jibLen=jl, sectors=['360'],
              src=src_text(tb), source=f + ' p.%d (AC 100 HAV, %g t, 7.10 m x 7.00 m, 360°, ISO). UNVERIFIED. Cells marked * or ** (they belong to a 40.8 m or 45.0 m boom) are left blank.' % (page, cwt)))
# ---- Demag AC700 HAV (fly jib on the 60 m boom, 100 t and 60 t counterweight; the HAVSSL superlift tables are not taken) ----
f = find('ac700', 'AC700 - AC 700 - Load Chart - Metric - English.pdf')[0]
ws = words_of(f, 17); R = rows_of(ws)
tops = [y for y, r in R if len(r) >= 3 and re.fullmatch(r'\d+', r[0][4]) and r[1][4] == 't' and any(w[4] == '360°' for w in r)]
assert len(tops) == 2, tops
for k, y0 in enumerate(tops):
    y1 = tops[k + 1] - 4 if k + 1 < len(tops) else 800; B = [w for w in ws if y0 - 3 <= (w[1] + w[3]) / 2 <= y1]; RB = rows_of(B)
    cwt = int(RB[0][1][0][4]); mrow = RB[1][1]; mainL = num(mrow[0][4]); assert mainL == 60.0, mrow
    jrow = RB[2][1]; jibs = [(xc(w), float(w[4])) for w in jrow if re.fullmatch(r'\d+', w[4])]
    orow = RB[3][1]; offs = [(xc(w), deg(w[4])) for w in orow if deg(w[4]) is not None]
    grp = []; g = -1; prev = None
    for x, o in offs:
        if prev is None or o <= prev: g += 1
        prev = o; grp.append(g)
    assert g + 1 == len(jibs), (cwt, jibs, offs)
    tabs = {}
    for (x, o), gi in zip(offs, grp): tabs.setdefault(jibs[gi][1], {'offs': [], 'xs': [], 'rows': {}}); tabs[jibs[gi][1]]['offs'].append(o); tabs[jibs[gi][1]]['xs'].append(x)
    for yy, r in RB[4:]:
        lab = [w for w in r if xc(w) < 90 and re.fullmatch(r'\d+', w[4])]
        if not lab: continue
        Rr = int(lab[0][4]); cells = {}; star = set()
        for w in r:
            if w is lab[0] or xc(w) < 90 or xc(w) > 520: continue
            t = w[4]; i = min(range(len(offs)), key=lambda i: abs(offs[i][0] - xc(w)))
            if set(t) <= set('*'): left = [j for j in range(len(offs)) if offs[j][0] < xc(w)]; star.add(max(left, key=lambda j: offs[j][0])) if left else None; continue
            if abs(offs[i][0] - xc(w)) > 14: continue
            if t.endswith('*'): star.add(i); continue
            v = num(t) if not t.startswith('-') else None
            if v is not None: cells[i] = v
        for jl, tb in tabs.items():
            idx = [i for i, (x, o) in enumerate(offs) if jibs[grp[i]][1] == jl]
            tb['rows'][Rr] = [None if (i in star) else cells.get(i) for i in idx]
    for jl, tb in sorted(tabs.items()):
        if not any(any(v is not None for v in r) for r in tb['rows'].values()): continue
        assert not check(tb, 700), (cwt, jl, check(tb, 700))
        add('ac700', dict(id='hav%g-60-%d' % (jl, cwt), name='Fly jib (HAV) %g m on 60 m boom · %d t CWT · 360° · UNVERIFIED' % (jl, cwt), kind='fixedjib', config='HAV', cwt=cwt, mainLen=60, mainLabel=60, jibLen=jl, sectors=['360'],
          src=src_text(tb), source=f + ' p.17 (AC 700 HAV, %d t, 360°, ISO, main boom 60 m). UNVERIFIED. The superlift jib tables (HAVSSL, pp.18-19) are not included.' % cwt))
os.makedirs(OUT, exist_ok=True); json.dump(out, open(OUT + '/jib_charts.json', 'w'), ensure_ascii=False, indent=1)
for c, l in out.items(): print(c, len(l), [x['id'] for x in l][:6], '…')
# ---- write the LIB_JIBS block into src/data.js (after LIB_CHARTS, so saved plans keep their chart numbers) ----
dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'src', 'data.js')
START = '// ---------- v11: jib charts from the crane library (UNVERIFIED) ----------'
END = 'for (const c of DEFAULT_CRANES) if (LIB_JIBS[c.id]) c.charts = (c.charts || []).concat(LIB_JIBS[c.id]);\n'
L = [START, '// Fly-jib tables read from the library PDFs by pipeline/library/extract/gen_jibs.py (text layer, never typed). All verify:true. rowsBy:\'angle\' = the rows are', '// the main-boom angle (SANY, Zoomlion), otherwise the radius. The app picks them from the set-up (duty.js) when a fly jib is put on.', 'const LIB_JIBS = {']
for i, (c, l) in enumerate(out.items()):
    L.append('  %s: [' % c)
    for j, ch in enumerate(l):
        f2 = ['id:%s' % json.dumps(ch['id']), 'name:%s' % json.dumps(ch['name'], ensure_ascii=False), "kind:'fixedjib'", 'config:%s' % json.dumps(ch['config']), 'cwt:%s' % json.dumps(ch['cwt']), 'mainLen:%s' % json.dumps(ch['mainLen']), 'mainLabel:%s' % json.dumps(ch['mainLabel']), 'jibLen:%s' % json.dumps(ch['jibLen']), 'sectors:%s' % json.dumps(ch['sectors'])]
        if ch.get('outrigger'): f2.append('outrigger:%s' % json.dumps(ch['outrigger']))
        if ch.get('rowsBy'): f2.append("rowsBy:'angle'")
        f2.append('verify:true')
        L.append('    { ' + ', '.join(f2) + ',')
        L.append('      source:%s,' % json.dumps(ch['source'], ensure_ascii=False))
        L.append('      src:`' + ch['src'] + '` }' + (',' if j < len(l) - 1 else ''))
    L.append('  ]' + (',' if i < len(out) - 1 else ''))
L.append('};'); L.append(END.rstrip('\n')); block = '\n'.join(L) + '\n'
s = open(dst, encoding='utf-8').read()
if START in s: i = s.index(START); j = s.index(END) + len(END); s = s[:i] + block + s[j:]
else: k = s.index('for (const c of DEFAULT_CRANES) if (LIB_CHARTS[c.id])'); k = s.index('\n', k) + 1; s = s[:k] + block + s[k:]
open(dst, 'w', encoding='utf-8').write(s); print('LIB_JIBS block written to', dst, '(%d chars)' % len(block))
