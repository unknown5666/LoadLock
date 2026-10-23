const fs=require('fs'); const vm=require('vm');
const strip=s=>s.replace(/if \(typeof module[\s\S]*$/,'');
const code=['../gen/assets','data','library','engine','outrig','draw','rigging','crane2d','fixes','samples'].map(f=>strip(fs.readFileSync((f.startsWith('..')?'src/'+f:'src/'+f)+'.js','utf8'))).join('\n')+'\nthis.DIMS_IMG=DIMS_IMG;this.X={DEFAULT_CRANES,DEFAULT_SETTINGS,SAMPLE_PLANS,computePlan,buildSheet,toSVG,toDXF};';
const ctx={console}; vm.createContext(ctx); vm.runInContext(code,ctx);
const X=ctx.X; fs.mkdirSync('out',{recursive:true});
for(const s of X.SAMPLE_PLANS){const plan=s.make(); const calc=X.computePlan(plan,X.DEFAULT_CRANES,X.DEFAULT_SETTINGS);
 for(const c of X.DEFAULT_CRANES){ if(c.dimsImg && ctx.DIMS_IMG) c.imgDims=ctx.DIMS_IMG[c.dimsImg]; }
 const {P,scale}=X.buildSheet(plan,calc,X.DEFAULT_SETTINGS); fs.writeFileSync('out/'+s.key+'.svg',X.toSVG(P,{width:'1682',height:'1188'}));
 fs.writeFileSync('out/'+s.key+'.dxf',X.toDXF(P,scale?scale.N:100));
 console.log(s.key,'prims',P.list.length,'scale',scale&&scale.N,'status',calc.status, calc.loads.map(l=>[l.util,l.sf,l.geo.theta&&l.geo.theta.toFixed(1),l.checks.filter(c=>c.s!=='ok').map(c=>c.t+': '+c.m).join(' | ')]));}
