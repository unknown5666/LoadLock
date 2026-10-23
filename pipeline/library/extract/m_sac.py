import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dump import OUT
import sys, json
from asm import *
SUB='SAC2600 - SAC2600 - Metric'
def falls_for(ws, cols, y0, y1):
    f=[None]*len(cols)
    for w in ws:
        yc=(w[1]+w[3])/2
        if y0<yc<y1 and isnum(w[4]):
            xc=(w[0]+w[2])/2; k=min(range(len(cols)),key=lambda i:abs(cols[i][1]-xc))
            if abs(cols[k][1]-xc)<8: f[k]=int(fl(w[4]))
    return f
def tbl(page, clip, xr):
    ws=words('sac2600',SUB,page,clip)
    c,t,w=assemble(ws,(169,175),(180,655),xr)
    f=falls_for(ws,c,656,663)
    return c,t,f,w
parts=[tbl(10,(640,150,1134,740),(632,652)), tbl(11,(0,150,600,740),(65,88)), tbl(11,(630,150,1134,740),(632,652))]
cols=[];falls=[];table={}
for c,t,f,w in parts:
    n0=len(cols); cols+=c; falls+=f
    for R,v in t.items():
        table[R]=table.get(R,[])+[None]*(n0-len(table.get(R,[])))+v
for R in table: table[R]+=[None]*(len(cols)-len(table[R]))
print(len(cols),[c[0] for c in cols]); print(falls); print(check(cols,table,cap=260))
src=chart_text2(cols,table,falls); print(src)
json.dump({'src':src},open(OUT+'/sac2600_c100.json','w'))
