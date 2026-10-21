// Renders the REAL app elevation (drawElevation: CAD boom + hook rope) for every CAD drawing, zoomed on the boom head, to check that the
// hook rope hangs from the FRONT/lower head sheave.   node sheave_elev.js            -> out/sheave/elev_<key>.png
//   TAG=before|after   file suffix          NOFIX=1  load the bundle without src/fixes.js (the "before" state)
//   CHART=6 (chart index, e.g. a fixed-jib chart)  JIB=1 (centre the crop on the jib foot)
//   ONLY=ltm1500,ztc300v                    R=14     radius (default 14)       COL=3  chart column (default 3)
const fs = require('fs'), vm = require('vm'), path = require('path');
const { chromium } = require('playwright');
const strip = s => s.replace(/\nif \(typeof module[\s\S]*$/, '\n');
const mods = ['gen/assets.js', 'src/data.js', 'src/engine.js', 'src/draw.js', 'src/crane2d.js']; if (!process.env.NOFIX) mods.push('src/fixes.js'); mods.push('src/samples.js');
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(mods.map(f => strip(fs.readFileSync(f, 'utf8'))).join('\n') + '\nthis.X={DEFAULT_CRANES,DEFAULT_SETTINGS,SAMPLE_PLANS,computePlan,drawElevation,Prims,toSVG,CRANE_DRAWINGS,SHEAVE_FIX_APPLIED:typeof SHEAVE_FIX_APPLIED!=="undefined"?SHEAVE_FIX_APPLIED:[]};', ctx);
const X = ctx.X; const tag = process.env.TAG || (process.env.NOFIX ? 'before' : 'after');
const only = (process.env.ONLY || '').split(',').filter(Boolean);
fs.mkdirSync('out/sheave', { recursive: true });
console.log('fixes applied:', JSON.stringify(X.SHEAVE_FIX_APPLIED));
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1000, height: 760 } });
  const rows = [];
  for (const key of Object.keys(X.CRANE_DRAWINGS)) {
    const d = X.CRANE_DRAWINGS[key]; if (!d.secs || (only.length && !only.includes(key))) continue;
    const base = X.DEFAULT_CRANES.find(c => c.id === 'ltm1250');
    const crane = { ...base, id: 'audit', model: 'AUDIT ' + key, drawing: key, tint: true };
    const plan = X.SAMPLE_PLANS[0].make(); plan.craneId = 'audit'; plan.chartIdx = +(process.env.CHART || 0); plan.colIdx = +(process.env.COL || 3); plan.config = null; plan.cwt = null;
    plan.site.obstacles = []; plan.loads[0].R = +(process.env.R || 14); plan.loads[0].w = 5; plan.loads[0].h = 1; plan.loads[0].l = 3;
    const calc = X.computePlan(plan, [crane], X.DEFAULT_SETTINGS);
    const res = calc.loads[0]; const geo = res.geo; if (!geo || !geo.tip) { console.log(key, 'no geometry', res.geo && res.geo.msgs); continue; }
    const P = new X.Prims(); const box = { x: 10, y: 10, w: 1000, h: 560 };
    const r = X.drawElevation(P, box, plan, calc, 0, {});
    const T = r.T, k = r.scale.k; const focus = process.env.JIB && geo.jibFoot ? geo.jibFoot : geo.tip; const tp = T(focus.x, focus.y);
    const vb = [tp[0] - 4.2 * k, tp[1] - 2.2 * k, 6.6 * k, 5.6 * k];
    const svg = X.toSVG(P, { viewBox: vb, width: '1000', height: String(Math.round(1000 * vb[3] / vb[2])) });
    // mark the sheave centre the engine uses (red cross) on top of the drawing
    const mark = `<g stroke="red" stroke-width="${0.25}" fill="none"><circle cx="${tp[0]}" cy="${tp[1]}" r="${(d.tipR || 0.3) * k}"/><path d="M${tp[0] - 0.4 * k},${tp[1]}h${0.8 * k}M${tp[0]},${tp[1] - 0.4 * k}v${0.8 * k}"/></g>`;
    const svg2 = svg.replace('</svg>', `<rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="none"/>${process.env.NOMARK ? '' : mark}<text x="${vb[0] + 2}" y="${vb[1] + 0.35 * k}" font-size="${0.2 * k}" fill="#c00">${key} ${tag} tip=[${d.tip}] L=${(geo.L ?? geo.Lb ?? 0).toFixed(1)} R=${res.R} th=${geo.theta.toFixed(1)}</text></svg>`);
    await pg.setContent('<body style="margin:0;background:#fff">' + svg2 + '</body>'); await pg.setViewportSize({ width: 1000, height: Math.round(1000 * vb[3] / vb[2]) });
    await pg.screenshot({ path: `out/sheave/elev_${key}_${tag}.png` });
    rows.push([key, d.tip.join(','), (geo.L ?? geo.Lb ?? 0).toFixed(2), res.R, geo.theta.toFixed(2), geo.tip.x.toFixed(2), geo.tip.y.toFixed(2)]);
  }
  console.log('key tip L R theta tipX tipY'); for (const r of rows) console.log(r.join('\t'));
  await b.close();
})();
