import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dump import OUT
import sys, json, runpy, io, contextlib
# the three table-by-hand modules write their chart text into OUT first
for _m in ('m_stc1000', 'm_sac', 'm_zat'):
    with contextlib.redirect_stdout(io.StringIO()): runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), _m + '.py'))
from asm import *
from demag import demag_table
import ac100x
out={}
def add(crane, ch): out.setdefault(crane,[]).append(ch)
ld=lambda n: json.load(open(OUT+'/%s.json'%n))['src']
H='UNVERIFIED'
# ---------- STC1000 (STC1000C brochure) ----------
F='Cranepedia - Sany STC1000C - STC1000C - Load Chart - Metric - English.pdf'
add('stc1000',dict(id='c325',name='Main boom · 32.5 t CWT · 7.6×7.6 m · 360° · 13.25–60 m · UNVERIFIED',kind='main',config='MAINBOOM',cwt=32.5,outrigger='7.6x7.6',src=ld('stc1000_c325'),verify=True,
  source=F+' p.5-6 (brochure pp.7-10). UNVERIFIED. SANY STC1000C chart, 32.5 t counterweight, outriggers fully extended. The brochure prints 26.8 over the three 21.8 m columns (its boom list on p.4 and the line counts agree on 21.8 m).'))
# ---------- ZTC1000V (the library chart is the ZTC1000) ----------
F='Cranepedia - Zoomlion ZTC1000 - ZTC1000 - Load Chart - Metric - EN.pdf'
for pg,x0,cwt in ((3,50,32),(3,430,28),(3,910,20),(3,1275,6),(4,50,0)):
    ws=words('ztc1000v','ZTC1000',pg,(x0,60,x0+300,570)); t=auto_table(ws)
    assert ('with %d counterweight'%cwt) in t['title'] and 'fully' in t['title'], t['title']
    assert not check(t['cols'],t['table'],cap=100) and not [w for w in t['warn'] if w[0]!='far']
    tn=[32,28,20,6,0].index(cwt)+1+(0 if pg==3 else 0)
    add('ztc1000v',dict(id='z%d'%cwt,name='ZTC1000 (not the V) · Main boom · %s CWT · full outriggers · 360° · 13.5–63 m · UNVERIFIED'%('no' if cwt==0 else '%d t'%cwt),kind='main',config='MAINBOOM',cwt=cwt,
      src=chart_text2(t['cols'],t['table'],t['falls']),verify=True,
      source=F+' p.%d (%d t counterweight, outriggers fully extended). UNVERIFIED. Maker chart of the ZTC1000, the nearest chart in the library. The ZTC1000V has a longer boom (to 70 m), so check it against the V chart.'%(pg,cwt)))
# ---------- SAC2600 ----------
F='Cranepedia - Sany SAC2600 - SAC2600 - Metric - Chinese.pdf'
add('sac2600',dict(id='c100',name='Main boom · 100 t CWT · full outriggers · 360° · 15.65–52.58 m · UNVERIFIED',kind='main',config='MAINBOOM',cwt=100,src=ld('sac2600_c100'),verify=True,
  source=F+' p.10-11 (SANY brochure, "full outriggers + 100 t counterweight", 100 %, 360°). UNVERIFIED. Boom lengths shown are the brochure telescoping stages; columns of one length are different partial-extension modes.'))
# ---------- ZAT4000V ----------
F='Cranepedia - Zoomlion ZAT4000VS863-1 - ZAT4000VS863-1 - Brochure - Metric - Chinese.pdf'
add('zat4000v',dict(id='c92',name='Main boom · 92 t CWT · 9.38×8.6 m · 360° · 15–90.1 m · UNVERIFIED',kind='main',config='MAINBOOM',cwt=92,outrigger='9.38x8.6',src=ld('zat4000v_c92'),verify=True,
  source=F+' p.10 (outlined text, read with a glyph decoder; 100 % outriggers 9.38x8.6 m, 360°, 92 t counterweight). UNVERIFIED. The starred 2.2 m row (nominal case) is left out.'))
# ---------- AC100 ----------
F='Bigge AC 100 - Demag-AC100.pdf'
SUB11='Cranepedia - Demag AC 100 - AC100 - Technical Data - Metric - English (2011'
def ac100chart(p08,cwt,p11=None):
    ttl,cols,tab,warn=ac100x.ac100(p08)
    assert ttl.split()[0].replace(',','.')==('%g'%cwt) and '7,10 m x 7,00 m' in ttl and '360' in ttl,(ttl,cwt)
    assert not check(cols,tab,cap=100)
    note=''
    if p11:
        ws=words('ac100',SUB11,p11,(0,100,600,480)); c11,t11,w11=assemble(ws,(146,152),(165,480),(55,70))
        n=0
        for R,v in tab.items():
            if R in t11:
                for i,(a,b) in enumerate(zip(v,t11[R])):
                    if a is not None and b is not None and b<a-1e-9: v[i]=b; n+=1
        if n: note=' %d cell(s) where the 2011 edition (same library, p.%d of the Technical Data 2011 pdf) prints a lower value use the lower value.'%(n,p11)
    return chart_text2(cols,tab),note,sum(1 for w in warn if w[0]=='starred')
for p08,cwt,p11 in ((8,32,9),(9,25,None),(10,13.3,10)):
    s,note,ns=ac100chart(p08,cwt,p11)
    add('ac100',dict(id='ha%g'%cwt,name='Main boom (HA) · %g t CWT · 7.1×7.0 m · 360° · 12.5–50.2 m · UNVERIFIED'%cwt,kind='main',config='HA',cwt=cwt,outrigger='7.0x7.1',src=s,verify=True,
      source=F+' p.%d (AC 100 HA, 7.10 m x 7.00 m, 360°, 2008 edition). UNVERIFIED. Cells marked with a star in the table (they belong to a shorter boom or are over-rear only) are left blank; the over-rear-only 3 m value is left out.%s'%(p08,note)))
# ---------- AC500-2 ----------
F='Cranepedia - Demag AC500-2 - AC 500-2 - Load Chart - Metric - English.pdf'; S='AC500-2 - AC 500-2 - Load Chart - Metric'
for p,hy,cwt in ((8,168.4,160),(9,168.6,120),(11,168.7,60)):
    cols,tab,warn,foot=demag_table('ac500',S,p,hy,(0,100,600,500),rad_x=(50,72))
    keep=[i for i in range(len(cols)) if i not in foot]
    assert not check(cols,tab,idx=keep,cap=500)
    ttl=' '.join(w[4] for y,r in rows_of(words('ac500',S,p,(0,110,600,130))) for w in r)
    assert ttl.startswith('%d t'%cwt),ttl
    add('ac500',dict(id='ha%d'%cwt,name='Main boom (HA) · %d t CWT · 360° · 14.7–56 m · UNVERIFIED'%cwt,kind='main',config='HA',cwt=cwt,src=chart_text2(cols,tab,drop=set(foot)),verify=True,
      source=F+' p.%d (AC 500-2 HA, %d t, 360°, DIN/ISO). UNVERIFIED. %s Over-rear-only (starred) values are left blank.'%(p,cwt,'The three columns marked 1) (180 t counterweight with central outriggers) are left out.' if foot else '')))
# ---------- AC700 ----------
F='Cranepedia - Demag AC700 - AC 700 - Load Chart - Metric - English.pdf'; S='Load Chart - Metric - English.pdf'
for p,hy,cwt in ((11,149.2,140),(12,149,100),(13,149,60)):
    cols,tab,warn,foot=demag_table('ac700',S,p,hy,(0,100,600,520),rad_x=(50,72))
    keep=[i for i in range(len(cols)) if i not in foot]
    assert not check(cols,tab,idx=keep,cap=700)
    ttl=' '.join(w[4] for y,r in rows_of(words('ac700',S,p,(0,110,600,130))) for w in r)
    assert ttl.startswith('%d t'%cwt),ttl
    add('ac700',dict(id='ha%d'%cwt,name='Main boom (HA) · %d t CWT · 360° · 15.5–60 m · UNVERIFIED'%cwt,kind='main',config='HA',cwt=cwt,src=chart_text2(cols,tab,drop=set(foot)),verify=True,
      source=F+' p.%d (AC 700 HA, %d t, 360°, ISO). UNVERIFIED. %sStarred cells (other boom length) are left blank.'%(p,cwt,'The columns marked * (central jack leg + 160 t counterweight) are left out. ' if foot else '')))
json.dump(out,open(OUT+'/all_charts.json','w'),ensure_ascii=False,indent=1)
for c,l in out.items(): print(c,[ (x['id'],x['src'].count('\n')) for x in l])
