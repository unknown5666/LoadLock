"""Parse Liebherr brochure load-chart PDFs (text-based) into chart definitions for the lift planner."""
import sys, re, json, collections
import pdfplumber

NUM = re.compile(r'^\d+(?:[.,]\d+)?$')
def fnum(s): return float(s.replace(',', '.'))

def lines_of(words, tol=2.2):
    rows = []
    for w in sorted(words, key=lambda w: (round(w['top']), w['x0'])):
        for r in rows:
            if abs(r['top'] - w['top']) < tol: r['w'].append(w); break
        else: rows.append({'top': w['top'], 'w': [w]})
    for r in rows: r['w'].sort(key=lambda w: w['x0']); r['text'] = ' '.join(w['text'] for w in r['w'])
    rows.sort(key=lambda r: r['top'])
    return rows

def cx(w): return (w['x0'] + w['x1']) / 2

def is_data(r):
    t = [w['text'] for w in r['w']]
    if len(t) < 2 or not NUM.match(t[0]) or not NUM.match(t[-1]): return False
    return abs(fnum(t[0]) - fnum(t[-1])) < 1e-6 and all(NUM.match(x) for x in t)


def partition(cols, heads):
    """Assign ordered columns to ordered header tokens as contiguous groups; minimise centring error."""
    n, m = len(cols), len(heads)
    if m == 0 or m > n: return None
    INF = float('inf'); import functools
    @functools.lru_cache(None)
    def best(i, j):  # columns i.. assigned to headers j..
        if j == m: return (0, ()) if i == n else (INF, ())
        if n - i < m - j: return (INF, ())
        res = (INF, ())
        for k in range(i + 1, n - (m - j - 1) + 1):
            grp = cols[i:k]; err = abs(sum(grp) / len(grp) - heads[j]) + (0 if len(grp) == 1 else 0.5 * (max(grp) - min(grp)) / max(1, len(grp)) * 0)
            sub = best(k, j + 1)
            if err + sub[0] < res[0]: res = (err + sub[0], (k,) + sub[1])
        return res
    cost, cuts = best(0, 0)
    if cost == INF: return None
    out = []; start = 0
    for j, k in enumerate(cuts):
        out += [j] * (k - start); start = k
    return out

def classify(title):
    t = title.lower().replace(' ', '')
    if 'luffing' in t: return 'luffing'
    if 'jib' in t or 'lattice' in t or 'extension' in t: return 'fixedjib'
    if 'telescopicboom' in t: return 'main'
    return None

def parse_pdf(path, maxpages=None):
    charts = []
    with pdfplumber.open(path) as pdf:
        for pno, page in enumerate(pdf.pages[:maxpages] if maxpages else pdf.pages, 1):
            words = page.extract_words(x_tolerance=1.2, y_tolerance=1.5, keep_blank_chars=False)
            if not words: continue
            L = lines_of(words)
            eng = next((r['text'] for r in L[:8] if re.search(r'lifting capacit', r['text'], re.I)), None)
            if not eng: continue
            kind = classify(eng)
            code = next((w['text'] for r in L[:8] for w in r['w'] if re.match(r'^T[A-Z0-9]{0,6}$', w['text']) and w['x0'] > page.width * 0.7), None)
            if code:
                kind = 'luffing' if 'N' in code and 'NZ' not in code else 'fixedjib' if ('K' in code or 'F' in code or 'NZ' in code) else 'main'
            if not kind: continue
            guyed = bool(re.search(r'guy|Y-', eng, re.I)) or (code is not None and 'Y' in code) or any(r['text'].strip() in ('TY', 'TY3', 'TY2') for r in L[:10])
            # split into tables: each table = header block + run of data rows
            i = 0; tables = []
            while i < len(L):
                if is_data(L[i]):
                    j = i
                    while j < len(L) and is_data(L[j]): j += 1
                    tables.append((i, j)); i = j
                else: i += 1
            prev_end = 0
            for (a, b) in tables:
                if b - a < 3: prev_end = b; continue
                head = L[prev_end:a]; data = L[a:b]; prev_end = b
                foot = ' '.join(r['text'] for r in L[b:b + 3])
                # value columns from data x-centres
                xs = sorted(cx(w) for r in data for w in r['w'][1:-1])
                if not xs: continue
                clusters = [[xs[0]]]
                for x in xs[1:]:
                    if x - clusters[-1][-1] > 9: clusters.append([x])
                    else: clusters[-1].append(x)
                cols = [sum(c) / len(c) for c in clusters]
                # config row = last row with a CWT ("97,5 t") or slew token; header rows follow it
                def is_cfg(r): return re.search(r'\d\s*t\b', r['text']) or '360°' in r['text'] or re.search(r'\s[–-]\s', r['text'])
                ci = max([k for k, r in enumerate(head) if is_cfg(r)], default=-1)
                if ci >= 0:
                    page_cfg = ' '.join(r['text'] for r in head[max(0, ci - 2):ci + 1] if is_cfg(r) or '°' in r['text'])
                else: page_cfg = last_cfg if 'last_cfg' in dir() else ''
                last_cfg = page_cfg
                hrows = [r for r in head[ci + 1:] if not re.search(r'DIN|ISO|Adapter|adapter|TAB', r['text'])]
                hrows = [r for r in hrows if r['top'] > data[0]['top'] - 60]
                def tokens(r):
                    out = []; ws = r['w']; k = 0
                    while k < len(ws):
                        t = ws[k]['text']
                        m = re.match(r'^(\d+(?:[.,]\d+)?)(m|°|t)?\*?$', t)
                        if m:
                            unit = m.group(2)
                            if not unit and k + 1 < len(ws) and ws[k + 1]['text'] in ('m', 'm*', '°', 't'):
                                unit = ws[k + 1]['text'][0] if ws[k + 1]['text'] != '°' else '°'; star = ws[k + 1]['text'].endswith('*')
                                out.append((fnum(m.group(1)), unit + ('*' if star else ''), (ws[k]['x0'] + ws[k + 1]['x1']) / 2)); k += 2; continue
                            out.append((fnum(m.group(1)), (unit or '') + ('*' if t.endswith('*') else ''), cx(ws[k])))
                        elif t in ('*',): out.append((None, '*', cx(ws[k])))
                        k += 1
                    return out
                htoks = [tokens(r) for r in hrows]
                htoks = [h for h in htoks if h]
                def nearest(tok_list, x):
                    if not tok_list: return None
                    return min(tok_list, key=lambda t: abs(t[2] - x))
                # identify rows: degree row, metre rows (top = boom, next = jib)
                deg_row = next((h for h in htoks if sum(1 for t in h if t[1] == '°') >= 2), None)
                m_rows = [h for h in htoks if sum(1 for t in h if t[1] in ('m',)) >= 1 and h is not deg_row and not (len(h) <= 2 and all(t[0] is None or t[1] != 'm' for t in h))]
                star_row = next((h for h in htoks if any(t[1] == '*' for t in h)), None)
                colspec = []
                def assign(row):
                    mt = sorted([t for t in row if t[1] == 'm'], key=lambda t: t[2])
                    part = partition(cols, [t[2] for t in mt])
                    if part is None: return [nearest(mt, x)[0] if mt else None for x in cols]
                    return [mt[p][0] for p in part]
                a0 = assign(m_rows[0]) if m_rows else None
                a1 = assign(m_rows[1]) if len(m_rows) > 1 else None
                for ci_, x in enumerate(cols):
                    spec = {}
                    if m_rows:
                        spec['boom'] = a0[ci_]
                        adapt = [t for t in m_rows[0] if t[1] == 'm*']
                        if adapt: spec['adapter'] = adapt[0][0]
                        if a1: spec['jib'] = a1[ci_]
                    if deg_row:
                        nd = nearest([t for t in deg_row if t[1] == '°'], x); spec['deg'] = nd[0] if nd else None
                    if star_row:
                        ns = [t for t in star_row if t[1] == '*' and abs(t[2] - x) < 8]
                        if ns: spec['star'] = True
                    colspec.append(spec)
                rows = []
                for r in data:
                    rad = fnum(r['w'][0]['text']); vals = [None] * len(cols)
                    for w in r['w'][1:-1]:
                        k = min(range(len(cols)), key=lambda c: abs(cols[c] - cx(w)))
                        vals[k] = fnum(w['text'])
                    rows.append([rad] + vals)
                cfgtext = page_cfg
                cwt = re.findall(r'(\d+(?:[.,]\d+)?)\s*t\b', cfgtext)
                slew = '360°' if '360' in cfgtext else ('0°' if re.search(r'\b0°', cfgtext) else '')
                ang = [r['text'].strip()[:-1] for r in head if re.match(r'^\d{2}°$', r['text'].strip())] or re.findall(r'\b(\d{2})°', cfgtext)
                tab = re.findall(r'TAB\s*[\d /]+', foot)
                charts.append({'page': pno, 'kind': kind, 'guyed': guyed, 'title': eng, 'cfg': cfgtext, 'cwt': fnum(cwt[-1]) if cwt else None, 'slew': slew,
                               'mainAngle': float(ang[0]) if (kind == 'luffing' and ang) else None, 'cols': colspec, 'rows': rows, 'tab': tab[0].strip() if tab else ''})
    return charts

if __name__ == '__main__':
    ch = parse_pdf(sys.argv[1], int(sys.argv[3]) if len(sys.argv) > 3 else None)
    json.dump(ch, open(sys.argv[2], 'w'))
    for c in ch: print(c['page'], c['kind'], 'TY' if c['guyed'] else 'T', c['cwt'], c['slew'], c['mainAngle'], len(c['cols']), 'cols', len(c['rows']), 'rows', c['cols'][:3], '|', c['cfg'][:70], c['tab'])
