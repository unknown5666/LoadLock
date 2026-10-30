"""v11.1: the full SANY STC1000 and STC1500S charts from the maker's brochures -> src/gen_sany.json pieces for data.js (LIB_SANY).

    python3 pipeline/library/extract/gen_sany.py <STC1000 brochure.pdf> <STC1500S brochure.pdf> <out.js>

Every number comes from the PDF text layer (words with positions); nothing is typed by hand. Checks: no empty column, no cell above the class,
every row number lands in exactly one column.
"""
import re, sys, json, fitz
NUM = re.compile(r'^\d+(?:\.\d+)?$')
fmt = lambda v: '%g' % v
def rows_of(ws, tol=3.0):
    ws = sorted(ws, key=lambda w: ((w[1] + w[3]) / 2, w[0])); out = []
    for w in ws:
        y = (w[1] + w[3]) / 2
        if out and abs(out[-1][0] - y) <= tol: out[-1][1].append(w)
        else: out.append([y, [w]])
    return [(y, sorted(r, key=lambda w: w[0])) for y, r in out]
xc = lambda w: (w[0] + w[2]) / 2
def nearest(cols, x, tol): 
    best = min(range(len(cols)), key=lambda i: abs(cols[i] - x)); return best if abs(cols[best] - x) <= tol else None
def src_of(heads, rows):
    lines = ['H: ' + ' | '.join(heads)]
    for r in sorted(rows): lines.append(fmt(r) + ': ' + ' '.join(fmt(v) if v is not None else '-' for v in rows[r]))
    return '\n'.join(lines)
def labelled(Ls, falls):
    seen = {}; [seen.__setitem__(fmt(L), seen.get(fmt(L), 0) + 1) for L in Ls]; n = {}; out = []
    for L, f in zip(Ls, falls):
        k = fmt(L); s = k
        if seen[k] > 1: n[k] = n.get(k, 0) + 1; s += '/' + 'abcdefgh'[n[k] - 1]
        if f: s += '/%d' % f
        out.append(s)
    return out

def main_table(ws, cls, xr):
    """A radius table in a page region: the first row holding several boom lengths is the header, Rope rate / Number of lines gives the falls."""
    R = rows_of(ws); head = None; cols = []; Ls = []; rows = {}; falls = None
    for y, r in R:
        txt = ' '.join(w[4] for w in r)
        nums = [w for w in r if NUM.match(w[4]) and xc(w) > xr]
        if head is None:
            if len(nums) >= 4 and float(nums[0][4]) > 10: head = y; cols = [xc(w) for w in nums]; Ls = [float(w[4]) for w in nums]
            continue
        if re.match(r'(?i)(rope|number)', txt):
            falls = [None] * len(cols)
            for w in nums:
                i = nearest(cols, xc(w), 9)
                if i is not None: falls[i] = int(float(w[4]))
            continue
        if re.match(r'(?i)(min|telescop|\d+(st|nd|rd|th)|prereq)', txt): 
            if re.match(r'(?i)(telescop|prereq)', txt): break
            continue
        first = [w for w in r if xc(w) <= xr and NUM.match(w[4])]
        if not first:
            if len(nums) >= len(cols) and all(float(w[4]).is_integer() for w in nums): falls = [int(float(w[4])) for w in nums[:len(cols)]]  # "Rope rate" split over two lines
            continue
        rad = float(first[0][4]); row = [None] * len(cols)
        for w in nums:
            if xc(w) > cols[-1] + 12: continue  # the radius column repeated on the right
            i = nearest(cols, xc(w), 12); assert i is not None, ('stray', w[4], y)
            v = float(w[4]); assert v <= cls, ('over class', v); row[i] = v
        if any(v is not None for v in row): rows[rad] = row
    return Ls, falls or [None] * len(cols), rows

CH = []
def add(crane, **k): k['crane'] = crane; CH.append(k)

# ---------- SANY STC1000: pages 7-9 are two-page spreads: 12-13 (0, 8.52 t + jib), 14-15 (14.48 t + jib), 16-17 (19.46 t + jib) ----------
D = fitz.open(sys.argv[1]); P = 595.0
wsof = lambda p, clip: [w[:5] for w in D[p].get_text('words', clip=fitz.Rect(*clip))]
H = D[6].rect.height
def stc_main(page, clip, cwt, ref):
    Ls, falls, rows = main_table(wsof(page, clip), 100, clip[0] + 150)
    assert len(Ls) == 9, Ls
    add('stc1000m', id='m%g' % cwt, name='Main boom · %g t counterweight · 7.56×7.6 m · 360°' % cwt, kind='main', config='MAINBOOM', cwt=cwt, outrigger='7.56x7.6', sectors=['360'],
        source='SANY STC1000 load chart, brochure p.%s' % ref, src=src_of(labelled(Ls, falls), rows))
def stc_jib(page, clip, cwt, ref):
    ws = wsof(page, clip); R = rows_of(ws)
    # rows: 78°  w r  w r  w r  w r  w r  w r
    tbl = {}
    for y, r in R:
        if not r or not re.fullmatch(r'\d+°', r[0][4]): continue
        cells = r[1:]
        if len(cells) != 12: continue
        ang = float(r[0][4][:-1]); vals = []
        for i in range(0, 12, 2):
            t = cells[i][4]; vals.append(float(t) if NUM.match(t) else None)
        tbl[ang] = vals
    assert len(tbl) >= 8, tbl
    for j, jl in enumerate((10.7, 18)):
        rows = {a: v[j * 3:j * 3 + 3] for a, v in tbl.items() if any(x is not None for x in v[j * 3:j * 3 + 3])}
        add('stc1000m', id='j%g.%g' % (jl, cwt), name='Fly jib %g m on 52 m boom · %g t counterweight · 0/15/30° · 360°' % (jl, cwt), kind='fixedjib', config='JIB', cwt=cwt, mainLen=52, mainLabel=52, jibLen=jl,
            rowsBy='angle', outrigger='7.56x7.6', sectors=['360'], source='SANY STC1000 load chart, brochure p.%s' % ref, src=src_of(['0', '15', '30'], rows))
LEFT, RIGHT = (0, 0, P, H), (P, 0, 2 * P, H)
ytop = lambda p, text, clip: [w[1] for w in D[p].get_text('words', clip=fitz.Rect(*clip)) if w[4].startswith(text)]
stc_main(6, LEFT, 0, '12')
pr = sorted(ytop(6, 'Prerequisites', RIGHT))
stc_main(6, (P, 0, 2 * P, pr[1] - 2), 8.52, '13')
stc_jib(6, (P, pr[1] - 2, 2 * P, H), 8.52, '13')
stc_main(7, LEFT, 14.48, '14'); stc_jib(7, RIGHT, 14.48, '15')
stc_main(8, LEFT, 19.46, '16'); stc_jib(8, RIGHT, 19.46, '17')

# ---------- SANY STC1500S: pages 10-33 pairs per counterweight, full then half extension; 35-41 jib ----------
D2 = fitz.open(sys.argv[2])
for pg, ext in ((10, 'full'), (22, 'half')):
    for k, cwt in enumerate((42, 33.5, 25.5, 17.5, 8, 0)):
        Ls = []; falls = []; rows = {}
        pages = (pg + 2 * k, pg + 2 * k + 1); off = 0
        for p in pages:
            ws = [w[:5] for w in D2[p - 1].get_text('words')]
            L, f, r = main_table(ws, 150, 75)
            for rad, vals in r.items(): rows.setdefault(rad, {}).update({off + i: v for i, v in enumerate(vals)})
            Ls += L; falls += f; off += len(L)
        grid = {rad: [v.get(i) for i in range(len(Ls))] for rad, v in rows.items()}
        w = 'half extension' if ext == 'half' else ''
        add('stc1500s', id='%s%g' % (ext[0], cwt), name='Main boom · %g t counterweight · %s · 360°' % (cwt, 'half outriggers' if ext == 'half' else '7.975×7.95 m'), kind='main', config='T', cwt=cwt,
            outrigger='7.975x7.95' if ext == 'full' else 'half', sectors=['360'], source='SANY STC1500S brochure p.%d-%d' % pages, src=src_of(labelled(Ls, falls), grid))
# jibs: one header block per page
jibs = {}
for p in (35, 36, 37, 38, 39, 41):
    W = [w[:5] for w in D2[p - 1].get_text('words')]; R = rows_of(W)
    hd = [w for w in W if 122 < w[1] < 170]; mid = lambda w: (w[1] + w[3]) / 2
    by0 = min(mid(w) for w in hd if re.fullmatch(r'\d+(\.\d+)?m', w[4]))
    bx = [(xc(w), float(w[4][:-1])) for w in hd if abs(mid(w) - by0) < 3 and re.fullmatch(r'\d+(\.\d+)?m', w[4])]
    jx = [(xc(w), w[4]) for w in hd if mid(w) > by0 + 6 and re.search(r'\d+m', w[4])]
    of = [w for w in hd if re.fullmatch(r'\d+°', w[4])]; ofy = max(mid(w) for w in of)
    cols = sorted((xc(w), float(w[4][:-1])) for w in of)
    ofs = (ofy, of)
    data = {}
    for y, r in R:
        if y <= ofs[0] + 3: continue
        txt = ' '.join(w[4] for w in r)
        if re.match(r'(?i)telescop', txt): break
        if not r or not NUM.match(r[0][4]): continue
        rad = float(r[0][4]); cells = [w for w in r[1:] if NUM.match(w[4]) and xc(w) < cols[-1][0] + 14]
        for w in cells:
            i = nearest([c[0] for c in cols], xc(w), 16); assert i is not None, (p, w[4])
            data.setdefault(i, {})[rad] = float(w[4])
    for i, (x, ofn) in enumerate(cols):
        b = min(bx, key=lambda q: abs(q[0] - x))[1]; js = min(jx, key=lambda q: abs(q[0] - x))[1]
        jl = sum(float(s) for s in re.findall(r'(\d+(?:\.\d+)?)m', js))
        jibs.setdefault((b, jl, js, p), {})[ofn] = data.get(i, {})
for (b, jl, js, p), bo in sorted(jibs.items()):
    offs = sorted(bo); rad = sorted({r for o in bo.values() for r in o})
    rows = {r: [bo[o].get(r) for o in offs] for r in rad}
    add('stc1500s', id='j%g.%g' % (jl, b), name='Fly jib %g m on %g m boom · 42 t counterweight · %s° · 360°' % (jl, b, '/'.join(fmt(o) for o in offs)), kind='fixedjib', config='JIB', cwt=42, mainLen=b, mainLabel=b, jibLen=jl,
        outrigger='7.975x7.95', sectors=['360'], source='SANY STC1500S brochure p.%d' % p, src=src_of([fmt(o) for o in offs], rows))

by = {}
for c in CH:
    d = {k: v for k, v in c.items() if k != 'crane'}; by.setdefault(c['crane'], []).append(d)
open(sys.argv[3], 'w').write(json.dumps(by, ensure_ascii=False, indent=0))
for k, v in by.items():
    print(k, len(v), [c['id'] for c in v])
