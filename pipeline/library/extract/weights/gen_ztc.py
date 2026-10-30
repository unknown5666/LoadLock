"""ZTC1000 intermediate-outrigger main-boom tables from the ZTC1000 load chart PDF text layer -> setups_ztc1000v.json"""
import fitz,os,re,sys,json
L=os.environ.get('LL_LIB',os.path.expanduser('~/Downloads/LoadLock Crane Library'))+'/'
F="Zoomlion ZTC1000V - 100t Truck/Load Charts/Cranepedia - Zoomlion ZTC1000 - ZTC1000 - Load Chart - Metric - EN.pdf"
d=fitz.open(L+F)
NUM=re.compile(r'^\d+(?:\.\d+)?$'); fmt=lambda v:'%g'%v
def rows_of(ws,tol=2.5):
    ws=sorted(ws,key=lambda w:((w[1]+w[3])/2,w[0])); out=[]
    for w in ws:
        y=(w[1]+w[3])/2
        if out and abs(out[-1][0]-y)<=tol: out[-1][1].append(w)
        else: out.append([y,[w]])
    return [(y,sorted(r,key=lambda w:w[0])) for y,r in out]
xc=lambda w:(w[0]+w[2])/2
res=[];info=[]
for pn in (4,5,6):
    ws=[w[:5] for w in d[pn-1].get_text('words')]
    tb=sorted([w for w in ws if w[4]=='Table'],key=lambda w:w[0])
    xs=[w[0]-5 for w in tb]+[1e5]
    for k,t in enumerate(tb):
        reg=[w for w in ws if xs[k]<=w[0]<xs[k+1] and w[1]>60]
        R=rows_of(reg)
        title=' '.join(w[4] for y,r in R for w in r if False)
        tl=[ ' '.join(w[4] for w in r) for y,r in R if any(w[4]=='Outriggers' for w in r)]
        title=tl[0] if tl else ''
        m=re.search(r'Table (\d+)',' '.join(w[4] for w in reg[:3])) 
        tno=int(ws[ws.index(t)+1][4]) if False else int([x[4] for x in ws if abs(x[1]-t[1])<2 and t[2]<=x[0]<t[2]+15][0])
        info.append((pn,tno,title[:110]))
        if 'intermediate' not in title or 'Jib' in ' '.join(w[4] for w in reg): continue
        cw=int(re.search(r'with (\d+) tons',title).group(1))
        # header: row after 'Boom length'
        hi=[i for i,(y,r) in enumerate(R) if any(w[4]=='Boom' for w in r)][0]
        hdr=None
        for y,r in R[hi+1:]:
            nums=[w for w in r if NUM.match(w[4])]
            if len(nums)>=8 and float(nums[0][4])>=10: hdr=(y,nums);break
        cols=[xc(w) for w in hdr[1][1:]] if False else [xc(w) for w in hdr[1] if True]
        # first number is the radius label? check: green header starts after 'Radius' label (not numeric) so all nums are booms
        Ls=[float(w[4]) for w in hdr[1]]
        rows={}
        for y,r in R:
            if y<=hdr[0]+1: continue
            if any(w[4] in('Reeving','Hook') for w in r): break
            nums=[w for w in r if NUM.match(w[4])]
            if not nums: continue
            lab=nums[0]
            if xc(lab)>cols[0]-8: continue
            rad=float(lab[4]); vals=[None]*len(cols)
            for w in nums[1:]:
                if xc(w)>cols[-1]+15: continue  # right radius label
                i=min(range(len(cols)),key=lambda j:abs(cols[j]-xc(w)))
                assert abs(cols[i]-xc(w))<9,(tno,rad,w[4]); v=float(w[4]); assert v<=100; vals[i]=v
            if any(v is not None for v in vals): rows[rad]=vals
        assert len(Ls)==12,Ls
        src='H: '+' | '.join(fmt(l) for l in Ls)+'\n'+'\n'.join(fmt(r)+': '+' '.join(fmt(v) if v is not None else '-' for v in rows[r]) for r in sorted(rows))
        res.append({"id":"i%d"%cw,"name":"Main boom · %d t counterweight · intermediate outriggers · 360°"%cw,"kind":"main","config":"MAINBOOM","cwt":cw,"outrigger":"half","setup":"half","sectors":["360"],"source":"ZTC1000 load chart (Zoomlion) p.%d table %d"%(pn,tno),"src":src,"verify":True})
for i in info: print(i)
json.dump(res,open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'setups_ztc1000v.json'),'w'),indent=1)
print(len(res),[ (c['id'],c['source']) for c in res])
