import sys, json
from PIL import Image, ImageDraw
def render(src, out, W=1400, labels=True, only=None):
    d = json.load(open(src)); P = [p for p in d['parts'] if only is None or p['i'] in only]
    xs = [v for p in P for v in (p['bbox'][0], p['bbox'][2])]; ys = [v for p in P for v in (p['bbox'][1], p['bbox'][3])]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys); s = (W - 20) / max(x1 - x0, y1 - y0)
    H = int((y1 - y0) * s) + 20; Wd = int((x1 - x0) * s) + 20
    im = Image.new('RGB', (Wd, H), 'white'); dr = ImageDraw.Draw(im)
    T = lambda x, y: (10 + (x - x0) * s, H - 10 - (y - y0) * s)
    for p in P:
        for t, c, pts in p['items']:
            q = [T(x, y) for x, y in pts]
            if t == 'f' and len(q) > 2: dr.polygon(q, fill='#ffffff' if c == '#212830' else c)
    for p in P:
        for t, c, pts in p['items']:
            q = [T(x, y) for x, y in pts]
            if t == 's' and len(q) > 1: dr.line(q, fill=c if c != '#ffffff' else '#000', width=1)
    a=T(0,y0); b=T(0,y1); dr.line([a,b], fill=(0,0,255), width=1); g=T(x0,0); h=T(x1,0); dr.line([g,h], fill=(0,160,0), width=1)
    if labels:
        for p in P:
            b = p['bbox']; dr.text(T(b[0], b[3]), f"{p['i']}:{p['rot']:g}", fill=(220, 0, 0))
    im.save(out)
if __name__ == '__main__':
    render(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 1400)
