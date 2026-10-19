import sys, json, math
from PIL import Image, ImageDraw
CLS = {'body': None, 'sec': (0, 90, 220), 'cyl': (220, 0, 160), 'hook': (0, 160, 0)}
def render(src, out, theta=None, ext=0.0, Lmax=None, W=900, classes=True):
    d = json.load(open(src)); pal = d['pal']
    th = math.radians(theta if theta is not None else d['theta0'])
    piv = d['pivot']; u = (math.cos(th), math.sin(th)); n = (-u[1], u[0])
    secs = d.get('secs', []); ns = len(secs)
    L0 = d['tip'][0]; Lm = Lmax or L0 * 3.6
    E = (Lm - L0) / max(1, ns - 1) * ext
    D = [0.0] + [E * i for i in range(1, ns)]
    prims = []  # (z, kind, color, fill, pts)
    def add(items, xf, cls, z):
        for f, ci, fl in items:
            pts = [xf(fl[i] / 100, fl[i + 1] / 100) for i in range(0, len(fl), 2)]
            prims.append((z, f, pal[ci], pts, cls))
    add(d['body'], lambda x, y: (x, y), 'body', 0)
    BW = lambda s, q: (piv[0] + s * u[0] + q * n[0], piv[1] + s * u[1] + q * n[1])
    for i in reversed(range(ns)):  # innermost first; base drawn last
        sc = secs[i]; dd = D[i]
        add(sc['items'], lambda s, q, dd=dd: BW(s + dd, q), 'sec', 10 + (ns - i))
    tipS = d['tip'][0] + D[-1] if ns else d['tip'][0]; tip = BW(tipS, d['tip'][1])
    if 'cyl' in d:
        cy = d['cyl']; C = cy['C']; Bp = BW(cy['B'][0], cy['B'][1]); a = math.atan2(Bp[1] - C[1], Bp[0] - C[0]); ax = (math.cos(a), math.sin(a)); an = (-ax[1], ax[0])
        add(cy['bar'], lambda s, q: (C[0] + s * ax[0] + q * an[0], C[1] + s * ax[1] + q * an[1]), 'cyl', 5)
        add(cy['rod'], lambda s, q: (Bp[0] + s * ax[0] + q * an[0], Bp[1] + s * ax[1] + q * an[1]), 'cyl', 6)
    hk = d.get('hook')
    if hk:
        top = (tip[0], tip[1] - 4)
        add(hk['items'], lambda x, y: (top[0] + x, top[1] + y), 'hook', 30)
    xs = [p[0] for pr in prims for p in pr[3]]; ys = [p[1] for pr in prims for p in pr[3]]
    x0, x1, y0, y1 = min(xs) - 1, max(xs) + 1, min(ys) - 1, max(ys) + 1; s = (W - 20) / max(x1 - x0, y1 - y0)
    im = Image.new('RGB', (int((x1 - x0) * s) + 20, int((y1 - y0) * s) + 20), 'white'); dr = ImageDraw.Draw(im); Hh = im.size[1]
    T = lambda x, y: (10 + (x - x0) * s, Hh - 10 - (y - y0) * s)
    for z, f, c, pts, cls in sorted(prims, key=lambda p: (p[0], -p[1])):
        q = [T(*p) for p in pts]
        col = c if (not classes or CLS[cls] is None) else CLS[cls]
        if f and len(q) > 2: dr.polygon(q, fill=c, outline=None)
        elif not f and len(q) > 1: dr.line(q, fill=col, width=1)
    for p, c in ((piv, (255, 0, 0)), (tip, (255, 0, 0))):
        a = T(*p); dr.ellipse([a[0] - 4, a[1] - 4, a[0] + 4, a[1] + 4], outline=c, width=2)
    g0 = T(x0, 0); g1 = T(x1, 0); dr.line([g0, g1], fill=(0, 170, 0))
    im.save(out)
if __name__ == '__main__':
    a = sys.argv; render(a[1], a[2], float(a[3]) if len(a) > 3 and a[3] != '-' else None, float(a[4]) if len(a) > 4 else 0)
