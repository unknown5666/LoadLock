// Before/after effect of the sheave fixes on the engine geometry (hook-line radius for a fixed boom pose, boom angle & tip height for a fixed radius)
//   node sheave_radius.js
const fs = require('fs'), vm = require('vm'); const strip = s => s.replace(/\nif \(typeof module[\s\S]*$/, '\n');
function load(fix) { const ctx = { console }; vm.createContext(ctx);
  vm.runInContext(['gen/assets.js', 'src/data.js', 'src/engine.js'].concat(fix ? ['src/fixes.js'] : []).map(f => strip(fs.readFileSync(f, 'utf8'))).join('\n') + '\nthis.X={DEFAULT_CRANES,solveGeometry,geoPivot,CRANE_DRAWINGS};', ctx); return ctx.X; }
const B = load(false), A = load(true);
const keys = (process.env.KEYS || 'ltm1500,ztc300v,ltm1230,ltm1160,ltm11200').split(',');
const L = +(process.env.L || 25.9), TH = +(process.env.TH || 60), RR = +(process.env.RR || 14);
console.log(`fixed boom pose L=${L} m, theta=${TH} deg  |  fixed radius R=${RR} m, L=${L} m`);
console.log('crane      tip before -> after            R(hook line) before -> after (dR)      theta@R before -> after    tipY before -> after');
for (const k of keys) {
  const row = [];
  for (const X of [B, A]) {
    const crane = { id: 'a', drawing: k }; const pf = X.geoPivot(crane); const th = TH * Math.PI / 180;
    const R = pf.x + L * Math.cos(th) - pf.n * Math.sin(th);
    const g = X.solveGeometry(crane, { kind: 'main' }, { L }, RR, L);
    row.push({ tip: X.CRANE_DRAWINGS[k].tip, R, theta: g.theta, tipY: g.tip.y });
  }
  const [b, a] = row;
  console.log(k.padEnd(9), `[${b.tip}] -> [${a.tip}]`.padEnd(34), `${b.R.toFixed(2)} -> ${a.R.toFixed(2)} (${(a.R - b.R >= 0 ? '+' : '') + (a.R - b.R).toFixed(2)} m)`.padEnd(36), `${b.theta.toFixed(2)} -> ${a.theta.toFixed(2)} deg`.padEnd(28), `${b.tipY.toFixed(2)} -> ${a.tipY.toFixed(2)} m`);
}
