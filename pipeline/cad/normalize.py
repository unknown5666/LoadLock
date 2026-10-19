"""Turn an extracted crane assembly (mm, block coords) into a poseable drawing:
body (static), boom sections (slide along axis), luffing cylinder (barrel+rod), hook block.
Output in centimetres relative to slew centre at ground; boom items in boom frame (s along axis, n normal) from pivot."""
import json, math, sys, collections
import numpy as np

def fold(a):
    a %= 360
    return a

def color_fix(t, c):
    if t == 's' and c.lower() == '#ffffff': return '#000000'
    if t == 'f' and c.lower() == '#212830': return '#ffffff'
    return c.lower()

def rdp(pts, eps):
    if len(pts) < 3: return pts
    a = np.array(pts); start, end = a[0], a[-1]
    d = end - start; L = np.hypot(*d)
    if L < 1e-9: dist = np.hypot(*(a - start).T)
    else: dist = np.abs(d[0] * (a[:, 1] - start[1]) - d[1] * (a[:, 0] - start[0])) / L
    i = int(np.argmax(dist))
    if dist[i] > eps:
        l = rdp(pts[:i + 1], eps); r = rdp(pts[i:], eps); return l[:-1] + r
    return [pts[0], pts[-1]]

def circles(items):
    out = []
    for t, c, pts in items:
        if len(pts) < 12: continue
        a = np.array(pts); cen = a.mean(0); r = np.hypot(*(a - cen).T)
        if r.mean() > 30 and r.std() / r.mean() < 0.04 and np.hypot(*(a[0] - a[-1])) < r.mean() * 0.2:
            out.append((cen, r.mean()))
    return out

def main(src, out, opts):
    d = json.load(open(src))
    parts = []
    for p in d['parts']:
        b = p['bbox']; diag = math.hypot(b[2] - b[0], b[3] - b[1])
        if diag < 60: continue
        if p['type'] in ('LINE', 'LWPOLYLINE', 'POLYLINE') and len(p['items']) <= 2: continue  # ropes / aux lines
        if p['i'] in opts.get('drop', []): continue
        p['items'] = [(t, color_fix(t, c), pts) for t, c, pts in p['items']]
        parts.append(p)
    rots = collections.defaultdict(float)
    for p in parts:
        if p['type'] == 'INSERT' and abs(p['rot']) > 0.5:
            b = p['bbox']; rots[round(p['rot'], 1)] += math.hypot(b[2] - b[0], b[3] - b[1])
    # canonical boom angle (0..90) per rotation value
    def canon(r):
        r %= 180
        return r if r <= 90 else 180 - r
    groups = collections.defaultdict(float)
    for r, w in rots.items(): groups[round(canon(r), 1)] += w
    th0 = opts.get('theta') or max(groups, key=groups.get)
    boom = [p for p in parts if p['type'] == 'INSERT' and abs(p['rot']) > 0.5 and abs(canon(p['rot']) - th0) < 0.6]
    u = np.array([math.cos(math.radians(th0)), math.sin(math.radians(th0))]); nrm = np.array([-u[1], u[0]])
    allb = np.array([q for p in boom for _, _, pts in p['items'] for q in pts])
    proj = lambda pts: np.array(pts) @ u
    for p in boom:
        pr = np.concatenate([proj(pts) for _, _, pts in p['items']]); p['smin'], p['smax'] = pr.min(), pr.max()
    boom.sort(key=lambda p: (p['smin'], p['smax']))
    base = min(boom, key=lambda p: p['smin']); head = max(boom, key=lambda p: p['smax'])
    # pivot: biggest circle near the rear of the base section
    bc = circles(base['items'])
    rear = [c for c in bc if (c[0] @ u) < base['smin'] + 0.25 * (base['smax'] - base['smin'])]
    if opts.get('pivot'): piv = np.array(opts['pivot'], float)
    elif rear: piv = max(rear, key=lambda c: c[1])[0]
    else:
        pts = np.array([q for _, _, pts in base['items'] for q in pts]); piv = pts[np.argmin(pts @ u)] + u * 300
    hc = circles(head['items'])
    if opts.get('tip'): tip = np.array(opts['tip'], float)
    elif hc: tip = max(hc, key=lambda c: (c[0] @ u) + c[1])[0]
    else:
        pts = np.array([q for _, _, pts in head['items'] for q in pts]); tip = pts[np.argmax(pts @ u)]
    L0 = float((tip - piv) @ u)
    # body / hook / cylinder
    rest = [p for p in parts if p not in boom]
    cyl = [p for p in rest if p['type'] == 'INSERT' and abs(p['rot']) > 0.5 and math.hypot((p['bbox'][0] + p['bbox'][2]) / 2 - piv[0], (p['bbox'][1] + p['bbox'][3]) / 2 - piv[1]) < 0.55 * L0]
    rest = [p for p in rest if p not in cyl and not (p['type'] == 'INSERT' and abs(p['rot']) > 0.5)]
    hook = [p for p in rest if abs((p['bbox'][0] + p['bbox'][2]) / 2 - tip[0]) < 3000 and p['bbox'][1] > 2500 and p['bbox'][3] < tip[1] - 500]
    if opts.get('hook') is not None: hook = [p for p in parts if p['i'] in opts['hook']]
    body = [p for p in rest if p not in hook]
    if opts.get('bodyMaxX') is not None: body = [p for p in body if p['bbox'][0] < opts['bodyMaxX']]
    ground = min(p['bbox'][1] for p in body)
    x0 = opts.get('x0', 0.0)
    eps = opts.get('eps', 15)
    pal = {}
    def ci(c):
        if c not in pal: pal[c] = len(pal)
        return pal[c]
    def enc(items, fn):
        res = []
        for t, c, pts in items:
            q = [fn(np.array(v)) for v in pts]
            q = rdp([tuple(v) for v in q], eps)
            if len(q) < 2: continue
            ext = np.ptp(np.array(q), 0)
            if ext.max() < 8: continue
            flat = [int(round(v / 10)) for xy in q for v in xy]
            res.append([1 if t == 'f' else 0, ci(c), flat])
        return res
    W = lambda v: ((v[0] - x0), (v[1] - ground))
    B = lambda v: (float((v - piv) @ u), float((v - piv) @ nrm))
    outd = {'theta0': round(th0, 3), 'L0': round(L0 / 1000, 3), 'pivot': [round((piv[0] - x0) / 1000, 3), round((piv[1] - ground) / 1000, 3)],
            'body': enc([it for p in body for it in p['items']], W)}
    n = len(boom)
    # group parts into telescopic sections by start position along the boom
    clusters = []
    for p in sorted(boom, key=lambda p: p['smin']):
        if clusters and p['smin'] - clusters[-1]['s0'] < 450: clusters[-1]['parts'].append(p); clusters[-1]['smax'] = max(clusters[-1]['smax'], p['smax'])
        else: clusters.append({'s0': p['smin'], 'smax': p['smax'], 'parts': [p]})
    ps = float((piv) @ u)
    tip_s = float((tip - piv) @ u)
    outd['boom'] = [{'s0': round((c['s0'] - ps) / 1000, 3), 'len': round((c['smax'] - c['s0']) / 1000, 3), 'items': enc([it for p in c['parts'] for it in p['items']], B)} for c in clusters]
    outd['tipOff'] = round(tip_s / 1000 - outd['boom'][-1]['s0'], 3)
    if cyl:
        pts = np.array([q for p in cyl for _, _, pts in p['items'] for q in pts]); cen = pts.mean(0)
        _, _, vt = np.linalg.svd(pts - cen); a = vt[0]
        pr = (pts - cen) @ a; e1 = cen + a * pr.min(); e2 = cen + a * pr.max()
        C, Bp = (e1, e2) if np.hypot(*(e1 - piv)) > np.hypot(*(e2 - piv)) and e1[1] < e2[1] else (e2, e1) if e2[1] < e1[1] else (e1, e2)
        ax = (Bp - C) / np.hypot(*(Bp - C)); an = np.array([-ax[1], ax[0]])
        def Cf(v): return (float((v - C) @ ax), float((v - C) @ an))
        def Rf(v): return (float((v - Bp) @ ax), float((v - Bp) @ an))
        bar, rod = [], []
        for p in cyl:
            pp = np.array([q for _, _, pts in p['items'] for q in pts]).mean(0)
            (bar if np.hypot(*(pp - C)) < np.hypot(*(pp - Bp)) else rod).append(p)
        outd['cyl'] = {'C': [round((C[0] - x0) / 1000, 3), round((C[1] - ground) / 1000, 3)], 'B': [round(B(Bp)[0] / 1000, 3), round(B(Bp)[1] / 1000, 3)],
                       'bar': enc([it for p in bar for it in p['items']], Cf), 'rod': enc([it for p in rod for it in p['items']], Rf)}
    if hook:
        hp = np.array([q for p in hook for _, _, pts in p['items'] for q in pts]); top = np.array([hp[:, 0].mean(), hp[:, 1].max()]); bot = hp[:, 1].min()
        outd['hook'] = {'h': round((top[1] - bot) / 1000, 3), 'items': enc([it for p in hook for it in p['items']], lambda v: (float(v[0] - top[0]), float(v[1] - top[1])))}
    outd['pal'] = [c for c, _ in sorted(pal.items(), key=lambda kv: kv[1])]
    outd['bbox'] = [round(min(p['bbox'][0] for p in body) / 1000 - x0 / 1000, 2), round(max(p['bbox'][2] for p in body) / 1000 - x0 / 1000, 2)]
    json.dump(outd, open(out, 'w'), separators=(',', ':'))
    npts = lambda L: sum(len(i[2]) // 2 for i in L)
    print(src, 'theta0', th0, 'L0', round(L0), 'pivot', outd['pivot'], 'boom parts', n, [(s['s0'], s['len']) for s in outd['boom']], 'cyl', bool(cyl), 'hook', bool(hook),
          'pts body', npts(outd['body']), 'boom', sum(npts(s['items']) for s in outd['boom']), 'size', len(json.dumps(outd)) // 1024, 'KB', 'colors', len(pal))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], json.loads(sys.argv[3]) if len(sys.argv) > 3 else {})
