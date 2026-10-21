"""Classify a side-view crane block (Russian dynamic-block library) into body / telescopic sections / head / cylinder / hook.
Output (metres, cm ints in item lists): pivot, theta0, tip (s,n in boom frame), sections [{s0,s1,items(s,n)}], cyl, hook, body."""
import sys, json, math, collections
import numpy as np

def rdp(pts, eps):
    if len(pts) < 3: return pts
    a = np.array(pts); st, en = a[0], a[-1]; d = en - st; L = np.hypot(*d)
    dist = np.hypot(*(a - st).T) if L < 1e-9 else np.abs(d[0] * (a[:, 1] - st[1]) - d[1] * (a[:, 0] - st[0])) / L
    i = int(np.argmax(dist))
    if dist[i] > eps: l = rdp(pts[:i + 1], eps); r = rdp(pts[i:], eps); return l[:-1] + r
    return [pts[0], pts[-1]]

def circles(items, rmin=60):
    out = []
    for t, c, pts in items:
        if len(pts) < 10: continue
        a = np.array(pts); cen = a.mean(0); r = np.hypot(*(a - cen).T)
        if r.mean() > rmin and r.std() / r.mean() < 0.05 and np.hypot(*(a[0] - a[-1])) < r.mean() * 0.25: out.append((cen, r.mean()))
    return out

def colfix(t, c):
    c = c.lower()
    if t == 's' and c == '#ffffff': return '#000000'
    if t == 'f' and c in ('#212830', '#000000'): return '#ffffff'
    return c

def main(src, out, opts={}):
    d = json.load(open(src)); parts = d['parts']
    for p in parts: p['items'] = [(t, colfix(t, c), pts) for t, c, pts in p['items']]
    ins = [p for p in parts if p['type'] == 'INSERT']
    def rmod(p): return p['rot'] % 180
    grp = collections.defaultdict(float)
    for p in ins:
        r = round(rmod(p), 1)
        if min(abs(r - 0), abs(r - 90), abs(r - 180)) < 0.5: continue
        b = p['bbox']; grp[r] += math.hypot(b[2] - b[0], b[3] - b[1])
    r0 = opts.get('rot') or max(grp, key=grp.get)
    boomP = [p for p in ins if abs(rmod(p) - r0) < 0.6 or abs(rmod(p) - r0) > 179.4]
    pts = np.array([q for p in boomP for _, _, ps in p['items'] for q in ps])
    cen = pts.mean(0); _, _, vt = np.linalg.svd(pts - cen); u = vt[0]
    if u[1] < 0: u = -u
    th0 = math.degrees(math.atan2(u[1], u[0])); mirror = th0 > 90
    if mirror:  # make the boom point right
        for p in parts:
            p['items'] = [(t, c, [(-x, y) for x, y in ps]) for t, c, ps in p['items']]
            b = p['bbox']; p['bbox'] = [-b[2], b[1], -b[0], b[3]]
        u = np.array([-u[0], u[1]]); th0 = 180 - th0
    nrm = np.array([-u[1], u[0]])
    def sr(p):
        a = np.array([q for _, _, ps in p['items'] for q in ps]); s = a @ u; n = a @ nrm
        return s.min(), s.max(), n.min(), n.max()
    for p in boomP: p['s0'], p['s1'], p['n0'], p['n1'] = sr(p)
    Lmax = max(p['s1'] - p['s0'] for p in boomP)
    secs = [p for p in boomP if p['s1'] - p['s0'] > 0.45 * Lmax and p['n1'] - p['n0'] > 250]
    att = [p for p in boomP if p not in secs]
    # merge parts describing the same section (same end within 120 mm)
    secs.sort(key=lambda p: p['s1']); groups = []
    for p in secs:
        if groups and abs(p['s1'] - groups[-1][-1]['s1']) < 30 and abs((p['n1'] - p['n0']) - (groups[-1][-1]['n1'] - groups[-1][-1]['n0'])) < 80: groups[-1].append(p)
        else: groups.append([p])
    lattice = len(groups) > 12 or opts.get('lattice')
    base = groups[0]
    bc = [c for p in base for c in circles(p['items'])]
    bs0 = min(p['s0'] for p in base); bs1 = max(p['s1'] for p in base)
    rear = [c for c in bc if c[0] @ u < bs0 + 0.3 * (bs1 - bs0)]
    if opts.get('pivot'): piv = np.array(opts['pivot'], float)
    elif rear: piv = max(rear, key=lambda c: c[1])[0]
    else:
        a = np.array([q for p in base for _, _, ps in p['items'] for q in ps]); piv = a[np.argmin(a @ u)] + u * 400
    # head: circles near the far end of the boom (last section + attachments)
    far = max(p['s1'] for p in boomP)
    hc = [c for p in groups[-1] + att for c in circles(p['items'], 90) if c[0] @ u > far - 2600]
    if opts.get('tip'): tip = np.array(opts['tip'], float)
    elif hc: tip = max(hc, key=lambda c: (c[0] @ u) + 0.8 * c[1])[0]
    else: a = np.array([q for p in groups[-1] for _, _, ps in p['items'] for q in ps]); tip = a[np.argmax(a @ u)]
    tipR = max([c[1] for c in hc if np.hypot(*(c[0] - tip)) < 5] or [300])
    # ---- KNOWN BUG in the head-sheave choice above (found when the owner reported ropes leaving the rear sheave) -----------------------
    # Every telescopic head carries TWO sheave circles at almost the same s: a rear/top one (n about 0 .. +0.5) and the FRONT/LOWER one
    # (n about -0.6 .. -1.5) the hook rope actually hangs from. `max(hc, key = s + 0.8 r)` only compares their s, which differ by 1-7 cm (and
    # sometimes the upper one is 1 cm further forward), so it is a coin flip: ltm1500, ztc300v and ltm1230 got the REAR/TOP sheave.
    # ltm1160: hc came back empty (tipR fell to the 300 default, tip = end of the head casting, 0.26 m in front of the real sheave);
    #   check len(hc) and `far` here - `far - 2600` is measured from the furthest boomP part, which can sit beyond the head.
    # ltm11200: the block has no sheave circle at all, tip landed on a circle that far_ok() later dropped (19.99, -1.16, in mid-air).
    # Suggested patch (NOT applied / pipeline not re-run; src/fixes.js SHEAVE_FIX patches the 5 bad bodies at load time until gen/assets.js is
    # regenerated, and switches itself off per crane once the generated tip already matches):
    #     if opts.get('tip'): tip = np.array(opts['tip'], float)
    #     elif hc:
    #         fwd = max(c[0] @ u for c in hc)
    #         front = [c for c in hc if c[0] @ u > fwd - 250]            # the sheaves of the nose (within 25 cm of the most forward one)
    #         tip = min(front, key=lambda c: c[0] @ nrm)[0]              # lowest = most negative n = FRONT sheave the rope hangs from
    #     else: ...  (for blocks with no sheave drawn, take the lowest pin lug of the head frame, not the farthest point)
    # ---------------------------------------------------------------------------------------------------------------------------------------
    ps_ = float(piv @ u); pn_ = float(piv @ nrm)
    far_ok = lambda a_: a_['s1'] < max(p['s1'] for p in secs) + 3000 and a_['n0'] > min(p['n0'] for p in secs) - 2500 and a_['n1'] < max(p['n1'] for p in secs) + 2500
    att = [a_ for a_ in att if far_ok(a_)]
    # attachments → section whose end they sit near, else base
    gidx = {id(p): gi for gi, g in enumerate(groups) for p in g}
    ends = [max(p['s1'] for p in g) for g in groups]
    for a_ in att:
        c = (a_['s0'] + a_['s1']) / 2; best = 0
        for gi, e in enumerate(ends):
            if c > e - 2600 and c < e + 1500: best = gi
        if a_['s1'] > ends[-1] - 300: best = len(groups) - 1
        groups[best].append(a_)
    # cylinder
    other = [p for p in ins if p not in boomP and min(abs(rmod(p) - 0), abs(rmod(p) - 90), abs(rmod(p) - 180)) > 0.5]
    L0 = float((tip - piv) @ u)
    cyl = []
    for p in other:
        b = p['bbox']; c = np.array([(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]); s = (c - piv) @ u; n = (c - piv) @ nrm
        if 0 < s < 0.7 * L0 and n < 0 and abs(rmod(p) - (th0 if not mirror else 180 - th0)) > 3: cyl.append(p)
    # hook + body
    flat = [p for p in parts if p not in boomP and p not in other]
    def big(p): b = p['bbox']; return math.hypot(b[2] - b[0], b[3] - b[1])
    cand_body = [p for p in flat if p['bbox'][3] < piv[1] + 4500 and not (p['type'] in ('LINE',) and big(p) > 3000)]
    bx0 = min(p['bbox'][0] for p in cand_body if p['type'] == 'INSERT'); bx1 = max(p['bbox'][2] for p in cand_body if p['type'] == 'INSERT')
    hook = [p for p in flat if p['type'] == 'INSERT' and abs((p['bbox'][0] + p['bbox'][2]) / 2 - tip[0]) < 2500 and p['bbox'][3] < tip[1] - 200 and (p['bbox'][1] > piv[1] + 600 or (p['bbox'][0] + p['bbox'][2]) / 2 > bx1 + 300)]
    body = [p for p in cand_body if p not in hook and not (p['type'] == 'LINE' and abs(p['bbox'][2] - p['bbox'][0]) < 5 and abs(p['bbox'][1]) < 5)]
    body = [p for p in body if not (p['type'] in ('LINE', 'LWPOLYLINE', 'POLYLINE') and len(p['items']) <= 2 and big(p) > 2000)]
    ib = [p for p in body if p['type'] == 'INSERT']
    bx0_, bx1_ = min(p['bbox'][0] for p in ib) - 600, max(p['bbox'][2] for p in ib) + 600
    by1_ = max(p['bbox'][3] for p in ib) + 600
    body = [p for p in body if p['bbox'][0] >= bx0_ and p['bbox'][2] <= bx1_ and p['bbox'][3] <= by1_]
    ground = min(p['bbox'][1] for p in body)
    x0 = opts.get('x0', 0.0)
    pal = {}
    def ci(c):
        if c not in pal: pal[c] = len(pal)
        return pal[c]
    eps = opts.get('eps', 12)
    def enc(items, fn):
        res = []
        for t, c, pts in items:
            q = rdp([tuple(fn(np.array(v))) for v in pts], eps)
            if len(q) < 2: continue
            if np.ptp(np.array(q), 0).max() < 6: continue
            res.append([1 if t == 'f' else 0, ci(c), [int(round(v / 10)) for xy in q for v in xy]])
        return res
    W = lambda v: ((v[0] - x0), (v[1] - ground))
    Bf = lambda v: (float((v - piv) @ u), float((v - piv) @ nrm))
    o = {'theta0': round(th0, 3), 'pivot': [round((piv[0] - x0) / 1000, 3), round((piv[1] - ground) / 1000, 3)],
         'tip': [round(float((tip - piv) @ u) / 1000, 3), round(float((tip - piv) @ nrm) / 1000, 3)], 'tipR': round(tipR / 1000, 3), 'mirror': mirror, 'lattice': bool(lattice),
         'body': enc([it for p in body for it in p['items']], W),
         'bbox': [round((min(p['bbox'][0] for p in body) - x0) / 1000, 2), 0, round((max(p['bbox'][2] for p in body) - x0) / 1000, 2), round((max(p['bbox'][3] for p in body) - ground) / 1000, 2)]}
    if not lattice:
        o['secs'] = []
        for g in groups:
            s0 = min(p['s0'] for p in g if p in secs) if any(p in secs for p in g) else min(p['s0'] for p in g)
            s1 = max(p['s1'] for p in g if p in secs) if any(p in secs for p in g) else max(p['s1'] for p in g)
            n0 = min(p['n0'] for p in g); n1 = max(p['n1'] for p in g)
            o['secs'].append({'s0': round((s0 - ps_) / 1000, 3), 's1': round((s1 - ps_) / 1000, 3), 'n0': round((n0 - pn_) / 1000, 3), 'n1': round((n1 - pn_) / 1000, 3), 'items': enc([it for p in g for it in p['items']], Bf)})
    else:
        o['boomDepth'] = round(float(np.median([p['n1'] - p['n0'] for g in groups for p in g])) / 1000, 3)
        hg = groups[-1]; o['head'] = enc([it for p in hg for it in p['items']], Bf)
    if len(cyl) >= 1:
        a = np.array([q for p in cyl for _, _, ps in p['items'] for q in ps]); cc = a.mean(0)
        _, _, vt = np.linalg.svd(a - cc); ax = vt[0]
        if ax @ u < 0 and ax[1] < 0: ax = -ax
        if ax[1] < 0: ax = -ax
        pr = (a - cc) @ ax; C = cc + ax * pr.min(); B = cc + ax * pr.max()
        # inset the pins slightly so they sit on the eye centres
        C = C + ax * 250; B = B - ax * 250
        an = np.array([-ax[1], ax[0]])
        lo = [p for p in cyl if ((np.array([(p['bbox'][0] + p['bbox'][2]) / 2, (p['bbox'][1] + p['bbox'][3]) / 2]) - cc) @ ax) < 0]
        hi = [p for p in cyl if p not in lo]
        if not lo or not hi:  # one part only: split by position along the axis
            lo, hi = cyl, []
        Cf = lambda v: (float((v - C) @ ax), float((v - C) @ an)); Bfx = lambda v: (float((v - B) @ ax), float((v - B) @ an))
        o['cyl'] = {'C': [round((C[0] - x0) / 1000, 3), round((C[1] - ground) / 1000, 3)], 'B': [round(float((B - piv) @ u) / 1000, 3), round(float((B - piv) @ nrm) / 1000, 3)],
                    'bar': enc([it for p in lo for it in p['items']], Cf), 'rod': enc([it for p in hi for it in p['items']], Bfx)}
    if hook:
        a = np.array([q for p in hook for _, _, ps in p['items'] for q in ps]); top = np.array([a[:, 0].mean(), a[:, 1].max()])
        Hf = lambda v: ((v[0] - top[0]), (v[1] - top[1]))
        o['hook'] = {'items': enc([it for p in hook for it in p['items']], Hf), 'h': round(float(top[1] - a[:, 1].min()) / 1000, 3), 'w': round(float(np.ptp(a[:, 0])) / 1000, 3)}
    o['pal'] = [c for c, _ in sorted(pal.items(), key=lambda kv: kv[1])]
    json.dump(o, open(out, 'w'), separators=(',', ':'))
    info = {'th0': o['theta0'], 'pivot': o['pivot'], 'tip': o['tip'], 'L0': o['tip'][0], 'secs': len(o.get('secs', [])), 'lattice': lattice, 'cyl': len(cyl), 'hook': len(hook), 'body': len(body), 'kb': len(json.dumps(o, separators=(',', ':'))) // 1024}
    print(src.split('/')[-1], info)
    return o

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], json.loads(sys.argv[3]) if len(sys.argv) > 3 else {})
