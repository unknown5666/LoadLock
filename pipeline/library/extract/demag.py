import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import re, sys
from asm import *
def demag_table(crane, sub, page, hdr_y, clip, rad_x=(70,92), idx=0, y_first=None, drop_rows=()):
    """Demag/Terex 'HA' table: radius garbled with a spurious leading 1 for single-digit radii; '-,0' = blank; '*' own word = value to its left is over-rear only.
    Header cells followed by a '1)' superscript (180 t configuration) are dropped as separate configurations."""
    ws=words(crane,sub,page,clip,idx)
    # shaded rows can come out as '165' '0' (value split before the decimal digit): glue an integer and a lone digit that follow each other closely
    merged=[]
    for y,r in rows_of(ws):
        r=sorted(r,key=lambda w:w[0]); out=[]
        for w in r:
            if out and re.fullmatch(r'\d',w[4]) and re.fullmatch(r'\d+',out[-1][4]) and 0<=w[0]-out[-1][2]<14 and not (rad_x[0]<=(out[-1][0]+out[-1][2])/2<=rad_x[1]) and (w[0]+w[2])/2<rad_x[1]+470:
                p=out.pop(); out.append((p[0],p[1],w[2],p[3],p[4]+','+w[4]))
            else: out.append(w)
        merged+=out
    ws=merged
    R=rows_of(ws)
    # junk row ('1m t,0 ...') and title
    data=[(y,r) for y,r in R if y>hdr_y+8]
    # radius rows: those with a radius-column word
    labels=[]
    for y,r in data:
        rw=[w for w in r if rad_x[0]<=(w[0]+w[2])/2<=rad_x[1] and isnum(w[4])]
        if rw: labels.append((y,rw[0]))
    first10=next((i for i,(y,w) in enumerate(labels) if w[4]=='10'),len(labels))
    fixed=[]
    for w in ws:
        yc=(w[1]+w[3])/2
        for i,(y,lw) in enumerate(labels):
            if lw is w:
                if i<first10 and w[4].startswith('1'): w=(w[0],w[1],w[2],w[3],w[4][1:])
        fixed.append(w)
    fixed=[w for w in fixed if not any(abs((w[1]+w[3])/2-y)<2 for y in drop_rows)]
    # cut the table where the radius column stops rising (footnotes / page number below the last row)
    prev=-1; ylast=None
    for y,lw in labels:
        r=fl([w for w in fixed if abs((w[1]+w[3])/2-y)<1.5 and rad_x[0]<=(w[0]+w[2])/2<=rad_x[1] and isnum(w[4])][0][4])
        if r<prev: break
        prev=r; ylast=y
    if ylast is not None: fixed=[w for w in fixed if (w[1]+w[3])/2<=ylast+4]
    cols,tab,warn=assemble(fixed,(hdr_y-3,hdr_y+3),(hdr_y+10,clip[3]),rad_x)
    # footnote 1) columns
    foot=[]
    hw=[w for w in ws if abs((w[1]+w[3])/2-hdr_y)<3]
    for i,(L,xc,tx) in enumerate(cols):
        if any(w[4] in ('1)','*') and 0<w[0]-xc<14 for w in hw): foot.append(i)
    return cols,tab,warn,foot
