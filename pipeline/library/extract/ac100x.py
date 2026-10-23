import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sys
from asm import *
def ac100(page, sub='Bigge AC 100 - Demag-AC100', idx=0):
    ws=words('ac100',sub,page,(0,100,600,440),idx)
    R=rows_of(ws)
    # title row (cwt etc)
    ttl=next(' '.join(w[4] for w in r) for y,r in R if y>125 and y<145)
    new=[]
    rowsy=sorted({round(y,1) for y,r in R if 178<y<430})
    first10=rowsy[:10]
    for w in ws:
        yc=(w[1]+w[3])/2
        if 70<(w[0]+w[2])/2<92 and 178<yc<430:
            k=min(range(len(first10)),key=lambda i:abs(first10[i]-yc))
            if abs(first10[k]-yc)<3 and w[4].startswith('1') and len(w[4])<=4 and w[4]!='10':  w=(w[0],w[1],w[2],w[3],w[4][1:])
        new.append(w)
    new=[w for w in new if not (178<(w[1]+w[3])/2<184 and True)]    # first row: 100,0 over-rear-only (footnote 1)
    cols,tab,warn=assemble(new,(159,165),(185,430),(70,92))
    return ttl,cols,tab,warn
if __name__=='__main__':
    ttl,cols,tab,warn=ac100(int(sys.argv[1]))
    print(ttl); print([c[2] for c in cols]); print([w for w in warn if w[0] not in('far',)][:20]); print(check(cols,tab,cap=100))
    print(chart_text2(cols,tab))
