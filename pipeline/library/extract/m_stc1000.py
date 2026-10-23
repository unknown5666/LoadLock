import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dump import OUT
import sys, json
from asm import *
F='Cranepedia - Sany STC1000C - STC1000C - Load Chart - Metric - English.pdf'
parts=[]
ws=words('stc1000','1000C',5,(600,150,1190,640)); c,t,w=assemble(ws,(188,196),(205,620),(660,680)); parts.append((c,t,[12,11,11,11,9,9,9,8,8,8]))
ws=words('stc1000','1000C',6,(0,100,600,580)); c,t,w=assemble(ws,(128,136),(145,580),(85,105)); parts.append((c,t,[6,6,6,5,5,5,4,4,4]))
ws=words('stc1000','1000C',6,(640,100,1190,612)); c,t,w=assemble(ws,(128,136),(145,612),(660,685)); parts.append((c,t,[3,3,3,3,3,3,2,2,2,2]))
cols=[];falls=[];labels=[];table={}
for pi,(c,t,f) in enumerate(parts):
    n0=len(cols)
    for k,(L,x,tx) in enumerate(c):
        if pi==0 and abs(L-26.8)<1e-9: L=21.8            # brochure prints 26.8 over the 3 columns of the 21.8 m boom (boom list p.4, line counts 9)
        cols.append((L,x,tx))
    falls+=f
    for R,v in t.items():
        table.setdefault(R,[None]*0)
        table[R]=table[R]+[None]*(n0-len(table[R]))+v
for R in table: table[R]+= [None]*(len(cols)-len(table[R]))
print([c[0] for c in cols]); print(falls)
print(check(cols,table,cap=100))
src=chart_text2(cols,table,falls)
print(src)
# sanity: heads
json.dump({'src':src},open(OUT+'/stc1000_c325.json','w'))
