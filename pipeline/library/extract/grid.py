import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sys
import fitz, re
from dump import find, LIB
NUM = re.compile(r'^[\d]+(?:[.,]\d+)?\*?$')
def words(crane, sub, page, clip=None, idx=0):
    f=find(crane,sub)[idx]; d=fitz.open(LIB+'/'+f); pg=d[page-1]
    ws=pg.get_text('words', clip=fitz.Rect(*clip) if clip else None)
    return [(w[0],w[1],w[2],w[3],w[4]) for w in ws]
def rows_of(ws, tol=2.5):
    ws=sorted(ws,key=lambda w:((w[1]+w[3])/2,w[0])); rows=[]
    for w in ws:
        yc=(w[1]+w[3])/2
        if rows and abs(rows[-1][0]-yc)<=tol: rows[-1][1].append(w); rows[-1][0]=(rows[-1][0]*(len(rows[-1][1])-1)+yc)/len(rows[-1][1])
        else: rows.append([yc,[w]])
    return [(y,sorted(r,key=lambda w:w[0])) for y,r in rows]
def show(crane, sub, page, clip=None, idx=0, tol=2.5):
    for y,r in rows_of(words(crane,sub,page,clip,idx),tol):
        print('%6.1f | '%y + '  '.join('%s@%d'%(w[4],round((w[0]+w[2])/2)) for w in r))
if __name__=='__main__':
    crane,sub,page=sys.argv[1:4]; clip=list(map(float,sys.argv[4:8])) if len(sys.argv)>7 else None
    show(crane,sub,int(page),clip)
