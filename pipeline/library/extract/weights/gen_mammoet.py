"""Reduced-outrigger-base main-boom tables from Mammoet reference datasheets (text layer) -> setups_ltm1500.json, setups_ac500.json, setups_ac700.json
Mammoet prints rows = boom length (with a ballast column), columns = radius; the app wants columns = boom length, so every ballast group is transposed."""
import fitz,os,re,json
L=os.environ.get('LL_LIB',os.path.expanduser('~/Downloads/LoadLock Crane Library'))+'/'
OUT=os.path.dirname(os.path.abspath(__file__))
NUM=re.compile(r'^\d+(?:\.\d+)?$'); fmt=lambda v:'%g'%v
xc=lambda w:(w[0]+w[2])/2
def rows_of(ws,tol=2.5):
    ws=sorted(ws,key=lambda w:((w[1]+w[3])/2,w[0])); out=[]
    for w in ws:
        y=(w[1]+w[3])/2
        if out and abs(out[-1][0]-y)<=tol: out[-1][1].append(w)
        else: out.append([y,[w]])
    return [(y,sorted(r,key=lambda w:w[0])) for y,r in out]
def table(ws,base,cls):
    """returns {ballast: (booms, {radius:[vals]})} for the table whose bullet says 'Outrigger base: <base>'"""
    R=rows_of(ws)
    ys=[y for y,r in R if any(w[4]=='base:' for w in r)]
    hit=[y for y,r in R if any(w[4]=='base:' for w in r) and base in ' '.join(w[4] for w in r)]
    assert len(hit)==1,(base,hit)
    y0=hit[0]; nxt=[y for y in ys if y>y0+5]; y1=(nxt[0]-15) if nxt else 1e9
    foot=[y for y,r in R if y>y0 and r[0][4]=='t' and len(r)>1 and r[1][4]=='=']
    if foot: y1=min(y1,foot[0]-1)
    T=[(y,r) for y,r in R if y0<y<y1]
    hdr=[i for i,(y,r) in enumerate(T) if sum(bool(NUM.match(w[4])) for w in r)>=10][0]
    cols=[xc(w) for w in T[hdr][1] if NUM.match(w[4])]; rad=[float(w[4]) for w in T[hdr][1] if NUM.match(w[4])]
    sp=min(b-a for a,b in zip(cols,cols[1:])); left=cols[0]-0.6*sp
    groups={}; ball=None
    for y,r in T[hdr+1:]:
        nums=[w for w in r if NUM.match(w[4])]
        lab=[w for w in nums if xc(w)<left]
        if not lab: continue
        if len(lab)>=2: ball=float(lab[0][4])
        boom=float(lab[-1][4]); vals=[None]*len(cols)
        for w in nums:
            if xc(w)<left: continue
            i=min(range(len(cols)),key=lambda j:abs(cols[j]-xc(w))); assert abs(cols[i]-xc(w))<0.45*sp,(boom,w[4])
            v=float(w[4]); assert v<=cls,v; vals[i]=v
        groups.setdefault(ball,[]).append((boom,vals))
    out={}
    for b,g in groups.items():
        rows={r:[v[1][i] for v in g] for i,r in enumerate(rad)}
        rows={r:v for r,v in rows.items() if any(x is not None for x in v)}
        out[b]=([x[0] for x in g],rows)
    return out
def src_of(booms,rows):
    return 'H: '+' | '.join(fmt(b) for b in booms)+'\n'+'\n'.join(fmt(r)+': '+' '.join(fmt(v) if v is not None else '-' for v in rows[r]) for r in sorted(rows))
def run(crane,f,page,base,cls,mk):
    d=fitz.open(L+f); ws=[w[:5] for w in d[page-1].get_text('words')]
    ch=[]
    for b,(booms,rows) in table(ws,base,cls).items():
        c=mk(b); c['src']=src_of(booms,rows); c['verify']=True; ch.append(c)
    json.dump(ch,open(os.path.join(OUT,'setups_%s.json'%crane),'w'),indent=1); print(crane,[(c['id'],c['cwt'],len(c['src'].split('\n'))) for c in ch])
base=lambda **k:dict(kind='main',sectors=['360'],setup='half',**k)
run('ltm1500',"Liebherr LTM1500-8.1 - 500t AT/Load Charts/Antbuildz LTM 1500-8.1.pdf",12,'10×6.3',500,
    lambda b:base(id='r%g'%b,name='Main boom (T6) · %g t counterweight · reduced outriggers 10×6.3 m · 360°'%b,config='T',cwt=b,outrigger='10x6.3',source='Mammoet LTM 1500-8.1 reference sheet (Antbuildz copy) p.12'))
run('ac500',"Demag AC500-2 - 500t AT/Load Charts/Mammoet AC 500-2 datasheet.pdf",3,'8×7.3',500,
    lambda b:base(id='r%g'%b,name='Main boom · %g t counterweight · reduced outriggers 8×7.3 m · 360°'%b,config='MAINBOOM',cwt=b,outrigger='8x7.3',source='Mammoet AC 500-2 reference sheet p.3'))
run('ac700',"Demag AC700 - 700t AT/Load Charts/Mammoet AC 700 datasheet.pdf",3,'9×8.8',700,
    lambda b:base(id='r%g'%b,name='Main boom · %g t counterweight · reduced outriggers 9×8.8 m · 360°'%b,config='MAINBOOM',cwt=b,outrigger='9x8.8',source='Mammoet AC 700 reference sheet p.3'))
