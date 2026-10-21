const fs=require('fs'); const vm=require('vm');
const ctx={module:{},console}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('gen/assets.js','utf8')+'\n'+fs.readFileSync('src/data.js','utf8')+'\n'+fs.readFileSync('src/engine.js','utf8').replace(/if \(typeof module[\s\S]*$/,'')+'\n'+fs.readFileSync('src/fixes.js','utf8')+'\nthis.E={DEFAULT_CRANES,DEFAULT_SETTINGS,parseChart,computeLoad,computePlan,getChart,radiusFromAngle,angleFromHeight,tipFromAngle,boomSpec,chartLengths};',ctx);
const E=ctx.E; const S=E.DEFAULT_SETTINGS; const C=id=>E.DEFAULT_CRANES.find(c=>c.id===id);
const plan={craneId:'ltm1250',chartIdx:0,colIdx:6,site:{obstacles:[]},loads:[]};
for (const by of ['radius','angle','height']) {
  const l={w:13,hb:1.5,tk:0.6,cont:20,R:28,angle:44,tipH:32.5,h:1,by};
  const r=E.computeLoad(plan,C('ltm1250'),l,S);
  console.log(by,'R',r.R,'theta',r.geo.theta.toFixed(2),'tip',r.geo.tip.x.toFixed(2),r.geo.tip.y.toFixed(2),'util',r.util,'cap',r.cap);
}
const l2={w:13,hb:1.5,cont:20,contOn:false,R:28,h:2,l:6,daf:{on:true,cls:'HC1',vh:0.1},tackles:[{name:'4-leg chain 6m',type:'sling',L:6,w:0.25,legs:4,wll:8.5},{name:'Spreader 6m',type:'spreader',L:6,w:0.9},{name:'Bottom slings 3m',type:'sling',L:3,w:0.1,legs:4}]};
const r2=E.computeLoad(plan,C('ltm1250'),l2,S);
console.log('stack',JSON.stringify(r2.stack.items.map(t=>[t.name,t.v,t.ang,t.T])),'H',r2.stack.H,'tk',r2.tk,'total',r2.total,'daf',r2.daf,'design',r2.design,'util',r2.util, r2.checks.map(c=>c.s+':'+c.t).join(', '));
const r3=E.computeLoad(plan,C('ltm1250'),{w:13,hb:1.5,cont:20,R:28,h:1,empty:true},S); console.log('empty total',r3.total,r3.util);
const P2={craneId:'ltm1250',chartIdx:0,colIdx:6,site:{obstacles:[]},activeCrane:0,cranes:[{},{craneId:'ltm1500',chartIdx:0,colIdx:5}],loads:[{w:13,R:28,h:1},{w:36,R:22,h:1,crane:1}]};
const cp=E.computePlan(P2,E.DEFAULT_CRANES,S); console.log('multi',cp.loads.map(r=>[r.crane.id,r.rigI,r.cap,r.util]), cp.rigs.map(x=>x.crane.id));
for (const id of ['ltm1250','ltm1080','stc500','ac700','ztc1000v']) { const c=C(id); console.log(id,c.drawing, JSON.stringify(E.boomSpec(c,E.chartLengths(c))).slice(0,90)); }
