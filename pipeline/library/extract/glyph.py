import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sys
import fitz
from collections import defaultdict, Counter
from dump import find, LIB
def glyphs(crane, sub, page, clip, idx=0, maxw=14, maxh=16):
    d=fitz.open(LIB+'/'+find(crane,sub)[idx]); pg=d[page-1]
    cr=fitz.Rect(*clip); out=[]
    for x in pg.get_drawings():
        r=x['rect']
        if x['type'] not in('f','fs') or not x.get('fill'): continue
        if r.width>maxw or r.height>maxh or r.width<0.3 or not cr.contains(r): continue
        sig=[]
        for it in x['items']:
            for p in it[1:]:
                if hasattr(p,'x'): sig.append((round(p.x-r.x0,1),round(p.y-r.y0,1)))
        out.append(dict(rect=r,sig=tuple(sig),h=round(r.height,1),fill=x.get('fill')))
    return out
if __name__=='__main__':
    g=glyphs('zat4000v','ZAT4000',10,(640,60,1200,800))
    print(len(g))
    c=Counter((x['sig']) for x in g)
    print(len(c),'distinct shapes'); 
    hs=Counter(x['h'] for x in g); print(sorted(hs.items())[:30])

def tokens(g, hmin=5.1, hmax=5.7, gap=1.6, ytol=2.0):
    gs=[x for x in g if hmin<=x['h']<=hmax or (x['h']<1.2 and x['rect'].width<1.4)]   # digits + decimal points (small)
    shapes={}
    def sid(sig): return shapes.setdefault(sig,len(shapes))
    gs.sort(key=lambda x:((x['rect'].y0+x['rect'].y1)/2, x['rect'].x0))
    # group by row
    rows=[]
    for x in gs:
        yc=x['rect'].y1 if x['h']<1.2 else (x['rect'].y0+x['rect'].y1)/2
        yb=x['rect'].y1   # baseline = bottom
        if rows and abs(rows[-1][0]-yb)<=ytol: rows[-1][1].append(x)
        else: rows.append([yb,[x]])
    toks=[]
    for yb,r in rows:
        r.sort(key=lambda x:x['rect'].x0); cur=[]
        for x in r:
            if cur and x['rect'].x0-cur[-1]['rect'].x1>gap: toks.append((yb,cur)); cur=[]
            cur.append(x)
        if cur: toks.append((yb,cur))
    out=[]
    for yb,t in toks:
        out.append(dict(y=yb,x0=t[0]['rect'].x0,x1=t[-1]['rect'].x1,xc=(t[0]['rect'].x0+t[-1]['rect'].x1)/2,ids=[sid(x['sig']) for x in t],small=[x['h']<1.2 for x in t]))
    return out,shapes

def decode_table(crane, sub, page, clip, radii, rad_x, hdr_y, rows_y, gap=3.5, idx=0, hdr_expect=None, rad_tol=14):
    """OCR-free decode of a table whose text was converted to outlines: glyph shapes are mapped to characters using the printed
    radius column (a list of the radius labels as strings, top to bottom, which the caller read off the page)."""
    g=glyphs(crane,sub,page,clip,idx)
    t,sh=tokens(g,gap=gap)
    # radius label tokens
    lab=sorted([k for k in t if abs(k['xc']-rad_x)<rad_tol and rows_y[0]<=k['y']<=rows_y[1]],key=lambda k:k['y'])
    assert len(lab)==len(radii),(len(lab),len(radii))
    cmap={}
    for k,s in zip(lab,radii):
        assert len(k['ids'])==len(s),(s,k['ids'])
        for i,ch in zip(k['ids'],s):
            if i in cmap and cmap[i]!=ch: raise Exception('conflict %s %s %s'%(i,cmap[i],ch))
            cmap[i]=ch
    dec=lambda k:''.join(cmap.get(i,'?') for i in k['ids'])
    hdr=sorted([k for k in t if abs(k['y']-hdr_y)<2.5 and k['xc']>rad_x+10 and k['xc']<clip[2]-40],key=lambda k:k['xc'])
    cols=[(float(dec(k)),k['xc']) for k in hdr]
    table={}
    for rk,s in zip(lab,radii):
        R=float(s); vals=[None]*len(cols)
        for k in t:
            if abs(k['y']-rk['y'])<2.0 and k['xc']>rad_x+10 and k['xc']<clip[2]-40:
                j=min(range(len(cols)),key=lambda i:abs(cols[i][1]-k['xc']))
                if abs(cols[j][1]-k['xc'])>10: print('far',R,dec(k),k['xc']); continue
                v=dec(k)
                if '?' in v: print('unknown glyph',R,v); continue
                vals[j]=float(v) if '*' not in v else None
        table[R]=vals
    return cols,table,cmap
