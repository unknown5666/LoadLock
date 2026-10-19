import json, math, sys
d=json.load(open(sys.argv[1])); out=sys.argv[2]; th=float(sys.argv[3]); L=float(sys.argv[4])
pal=d['pal']; P=d['pivot']; t=math.radians(th); u=(math.cos(t),math.sin(t)); n=(-u[1],u[0])
paths=[]
def emit(items, fn):
    for f,c,flat in items:
        pts=[fn(flat[i]/100,flat[i+1]/100) for i in range(0,len(flat),2)]
        paths.append((f,pal[c],pts))
emit(d['body'], lambda x,y:(x,y))
dL=L-d['L0']
if 'cyl' in d:
    C=d['cyl']['C']; Bs,Bn=d['cyl']['B']; B=(P[0]+Bs*u[0]+Bn*n[0], P[1]+Bs*u[1]+Bn*n[1])
    a=math.atan2(B[1]-C[1],B[0]-C[0]); ax=(math.cos(a),math.sin(a)); an=(-ax[1],ax[0])
    emit(d['cyl']['bar'], lambda s,q:(C[0]+s*ax[0]+q*an[0], C[1]+s*ax[1]+q*an[1]))
    emit(d['cyl']['rod'], lambda s,q:(B[0]+s*ax[0]+q*an[0], B[1]+s*ax[1]+q*an[1]))
secs=d['boom']; s0=[x['s0'] for x in secs]; m=len(secs)-1
def place(L):
    if m==0: return [s0[0]]
    X=L-s0[0]-d['tipOff']; x0=[s0[i]-s0[i-1] for i in range(1,m+1)]
    lo=[0.25]*m; hi=[secs[i-1]['len']*0.85 for i in range(1,m+1)]
    x=[min(max(v+(X-sum(x0))/m,lo[i]),hi[i]) for i,v in enumerate(x0)]
    for _ in range(6):
        rem=X-sum(x); free=[i for i in range(m) if (rem>0 and x[i]<hi[i]-1e-9) or (rem<0 and x[i]>lo[i]+1e-9)]
        if abs(rem)<1e-6 or not free: break
        for i in free: x[i]=min(max(x[i]+rem/len(free),lo[i]),hi[i])
    rem=X-sum(x); x=[v+rem/m for v in x]
    out=[s0[0]]
    for v in x: out.append(out[-1]+v)
    return out
sn=place(L)
for i in reversed(range(len(secs))):
    sh=sn[i]-s0[i]
    emit(secs[i]['items'], lambda s,q,sh=sh:(P[0]+(s+sh)*u[0]+q*n[0], P[1]+(s+sh)*u[1]+q*n[1]))
tip=(P[0]+L*u[0],P[1]+L*u[1])
if 'hook' in d: emit(d['hook']['items'], lambda x,y:(tip[0]+x, tip[1]-6+y))
xs=[p[0] for _,_,pts in paths for p in pts]; ys=[p[1] for _,_,pts in paths for p in pts]
x0,x1,y0,y1=min(xs)-1,max(xs)+1,min(ys)-1,max(ys)+1
s=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="%f %f %f %f" width="%d" height="%d"><rect x="%f" y="%f" width="%f" height="%f" fill="white"/>'%(x0,-y1,x1-x0,y1-y0,int(min(800,800*(x1-x0)/(y1-y0))),int(min(800,800*(x1-x0)/(y1-y0))*(y1-y0)/(x1-x0)),x0,-y1,x1-x0,y1-y0)]
for f,c,pts in paths:
    dd='M'+' L'.join('%.2f %.2f'%(x,-y) for x,y in pts)
    s.append('<path d="%s%s" fill="%s" stroke="%s" stroke-width="0.03"/>'%(dd,' Z' if f else '',c if f else 'none','none' if f else c))
s.append('<circle cx="%f" cy="%f" r="0.3" fill="red"/><circle cx="%f" cy="%f" r="0.3" fill="blue"/><line x1="-30" y1="0" x2="90" y2="0" stroke="green" stroke-width="0.05"/>'%(P[0],-P[1],tip[0],-tip[1]))
s.append('</svg>'); open(out,'w').write('\n'.join(s))
