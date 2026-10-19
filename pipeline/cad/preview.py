import sys, json
d=json.load(open(sys.argv[1])); out=sys.argv[2]
P=d['parts']; xs=[v for p in P for v in (p['bbox'][0],p['bbox'][2])]; ys=[v for p in P for v in (p['bbox'][1],p['bbox'][3])]
x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys); W=x1-x0; H=y1-y0
s=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="%f %f %f %f" width="%d" height="%d"><rect x="%f" y="%f" width="%f" height="%f" fill="white"/>'%(x0,-y1,W,H,int(min(700,700*W/H)),int(min(700,700*W/H)*H/W),x0,-y1,W,H)]
for p in P:
    for t,c,pts in p['items']:
        d_='M'+' L'.join('%.0f %.0f'%(x,-y) for x,y in pts)
        s.append('<path d="%s%s" fill="%s" stroke="%s" stroke-width="%f"/>'%(d_,' Z' if t=='f' else '',c if t=='f' else 'none','none' if t=='f' else c, W/1500))
    bx=p['bbox']; s.append('<text x="%f" y="%f" font-size="%f" fill="red">%d</text>'%(bx[0],-bx[3],W/80,p['i']))
s.append('</svg>'); open(out,'w').write('\n'.join(s))
