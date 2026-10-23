import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sys
from grid import *
def isnum(t): return bool(NUM.match(t.replace('　','').strip()))
def fl(t): return float(t.replace(',','.').replace('*',''))
def assemble(ws, hdr, rows, xr, tol=2.5, colTol=None, drop_star=True):
    """ws: words. hdr=(y0,y1): header band (boom lengths). rows=(y0,y1): data rows band. xr=(x0,x1): radius column x range.
    returns (cols[(L,xc)], table{radius:[val per col or None]}, warnings)"""
    warn=[]
    H=[w for w in ws if hdr[0]<=(w[1]+w[3])/2<=hdr[1] and isnum(w[4]) and not (xr[0]<=(w[0]+w[2])/2<=xr[1])]
    H.sort(key=lambda w:w[0]); cols=[(fl(w[4]),(w[0]+w[2])/2, w[4]) for w in H]
    if len(cols)>1:
        sp=min(cols[i+1][1]-cols[i][1] for i in range(len(cols)-1))
    else: sp=40
    ctol=colTol or sp*0.45
    out={}
    for y,r in rows_of([w for w in ws if rows[0]<=(w[1]+w[3])/2<=rows[1]], tol):
        rad=[w for w in r if xr[0]<=(w[0]+w[2])/2<=xr[1] and isnum(w[4])]
        if not rad: continue
        R=fl(rad[0][4]); vals=[None]*len(cols); starred=set()
        for w in r:
            if w in rad: continue
            t=w[4].replace('\u3000','').strip()
            if not t or t in '-\u2013\u2014': continue
            xc=(w[0]+w[2])/2
            k=min(range(len(cols)),key=lambda i:abs(cols[i][1]-xc))
            if abs(cols[k][1]-xc)>ctol: warn.append(('far',R,t,round(xc))); continue
            if set(t)<=set('*'):
                left=[j for j in range(len(cols)) if vals[j] is not None and cols[j][1]<xc]
                if drop_star and left: starred.add(max(left,key=lambda j:cols[j][1]))
                continue
            if not isnum(t): warn.append(('nonnum',R,t)); continue
            if t.endswith('*') and drop_star: starred.add(k)
            if vals[k] is not None: warn.append(('dup',R,t,k))
            vals[k]=fl(t)
        for k in starred: vals[k]=None; warn.append(('starred',R,k))
        out[R]=vals
    return cols,out,warn
def fmt(v): return ('%g'%v)
def chart_text(cols, table, labels=None, drop=None):
    """labels: list of label strings per col (or None). Repeated lengths get /a /b /c unless labels given."""
    idx=[i for i in range(len(cols)) if not (drop and i in drop)]
    # does column have any value
    heads=[]; from collections import Counter
    cnt=Counter(cols[i][0] for i in idx); seen=Counter()
    for i in idx:
        L=cols[i][0]
        if labels and labels[i]: heads.append(fmt(L)+'/'+labels[i])
        elif cnt[L]>1: heads.append(fmt(L)+'/'+'abcdefghij'[seen[L]]); seen[L]+=1
        else: heads.append(fmt(L))
    lines=['H: '+' | '.join(heads)]
    for R in sorted(table):
        vals=table[R]
        if all(vals[i] is None for i in idx): continue
        lines.append(fmt(R)+': '+' '.join('-' if vals[i] is None else fmt(vals[i]) for i in idx))
    return '\n'.join(lines)
def check(cols, table, idx=None, cap=None):
    prob=[]
    for i in (idx or range(len(cols))):
        prev=None
        for R in sorted(table):
            v=table[R][i]
            if v is None: continue
            if prev is not None and v>prev[1]+1e-9: prob.append((cols[i][0],i,'rises',prev,(R,v)))
            if cap and v>cap: prob.append((cols[i][0],i,'>cap',R,v))
            prev=(R,v)
    return prob

def auto_table(ws, bandword='Boom', stopword='Reeving', radword='Radius'):
    """tables laid out like Zoomlion/Liebherr: title row, 'Radius .. Boom length (m)' row, numeric header row, data rows, 'Reeving' row.
    returns dict(title, cols, table, falls(list or None), warn)"""
    R=rows_of(ws)
    rb=next((i for i,(y,r) in enumerate(R) if any(w[4]==bandword for w in r)),None)
    rs=next((i for i,(y,r) in enumerate(R) if any(w[4]==stopword for w in r)),None)
    rad=next(w for w in ws if w[4]==radword)
    rx=(rad[0]+rad[2])/2
    title=' '.join(w[4] for y,r in R[:rb] for w in r if y>0 and not w[4].startswith('Table') and w[4] not in('Unit:','Metric','tons') and w[1]>rad[1]-30)
    hy=R[rb+1][0]
    cols,tab,warn=assemble(ws,(hy-3,hy+3),(hy+4,R[rs][0]-3 if rs else 1e9),(rx-12,rx+12))
    falls=None
    if rs is not None:
        y,r=R[rs]; vals=[w for w in r if isnum(w[4])]
        falls=[None]*len(cols)
        for w in vals:
            xc=(w[0]+w[2])/2; k=min(range(len(cols)),key=lambda i:abs(cols[i][1]-xc))
            if abs(cols[k][1]-xc)<8: falls[k]=int(fl(w[4]))
    return dict(title=title,cols=cols,table=tab,falls=falls,warn=warn)
def chart_text2(cols, table, falls=None, labels=None, drop=None):
    idx=[i for i in range(len(cols)) if not (drop and i in drop)]
    from collections import Counter
    cnt=Counter(cols[i][0] for i in idx); seen=Counter(); heads=[]
    for i in idx:
        L=fmt(cols[i][0]); lab=(labels[i] if labels else None)
        if not lab and cnt[cols[i][0]]>1: lab='abcdefghij'[seen[cols[i][0]]]; seen[cols[i][0]]+=1
        h=L+('/'+lab if lab else '')+('/'+str(falls[i]) if falls and falls[i] else '')
        heads.append(h)
    lines=['H: '+' | '.join(heads)]
    for R in sorted(table):
        vals=table[R]
        if all(vals[i] is None for i in idx): continue
        lines.append(fmt(R)+': '+' '.join('-' if vals[i] is None else fmt(vals[i]) for i in idx))
    return '\n'.join(lines)
