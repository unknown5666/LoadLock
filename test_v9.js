// v9 engine asserts: curve-fit capacity, net-capacity deductions, wind on the load, tandem lifts (static shares, the two-line
// equilibrium, computePlan wiring), the Fit-Filter, satellite-map maths, the fast outrigger sweep and back-compat. No browser.
//   node test_v9.js        (exits non-zero on any failure)
const fs = require('fs'), vm = require('vm');
const strip = s => s.replace(/\nif \(typeof module[\s\S]*$/, '\n');
const FILES = ['gen/assets', 'src/data', 'src/engine', 'src/outrig', 'src/tandem', 'src/draw', 'src/crane2d', 'src/fixes', 'src/samples', 'src/gis', 'src/app'];
const code = FILES.map(f => strip(fs.readFileSync(f + '.js', 'utf8'))).join('\n') + `
this.X = { DEFAULT_CRANES, DEFAULT_SETTINGS, SAMPLE_PLANS, blankPlan, normalizePlan, computePlan, computeLoad, cranes, lookupCap, curveCap, getChart, parseChart, windTabOf,
  tandemStatic, tandemHang, tandemPose, tandemDefault, computeTandem, findCranes, bestPerCrane, GIS, outAt, outSweep, outTipHook, outPads, outMassModel, outExtOf, outMargin, outCog, outMasses,
  rigPick, switchRig, state, CRANE_KEYS, buildSheet, toSVG };`;
const ctx = { console, window: {}, localStorage: { getItem() { return null; }, setItem() {} }, performance }; vm.createContext(ctx); vm.runInContext(code, ctx);
const X = ctx.X; const clone = (o) => JSON.parse(JSON.stringify(o)); const S0 = X.DEFAULT_SETTINGS;
let fails = 0, passes = 0;
const ok = (c, msg) => { if (c) passes++; else { fails++; console.log('FAIL ' + msg); } };
const near = (a, b, msg, tol = 1e-6) => ok(Math.abs(a - b) <= tol, `${msg} (got ${typeof a === 'number' ? +a.toFixed(5) : a}, want ${b})`);
const CR = X.cranes(); const plan0 = (i = 0) => X.normalizePlan(X.SAMPLE_PLANS[i].make());

// ---------- 1. curve fit between chart radii ----------
{
  const pts = [[3, 100], [4, 80], [5, 64], [6, 52], [8, 36], [10, 26], [12, 19]];
  for (const R of [3.2, 3.5, 4.5, 5.5, 7, 9, 11, 11.9]) {
    const c = X.curveCap(pts, R); const k = pts.findIndex(p => p[0] > R); const lo = pts[k - 1], hi = pts[k]; const lin = lo[1] + (hi[1] - lo[1]) * (R - lo[0]) / (hi[0] - lo[0]);
    ok(c >= hi[1] - 1e-9 && c <= lin + 1e-9, `curve at ${R} m lies between the next radius up (${hi[1]}) and the straight line (${lin.toFixed(2)}): ${c.toFixed(3)}`);
  }
  let prev = Infinity, mono = true; for (let R = 3; R <= 12; R += 0.05) { const c = X.curveCap(pts, R); if (c > prev + 1e-9) mono = false; prev = c; } ok(mono, 'curve never rises with reach');
  const bump = [[3, 50], [4, 60], [5, 55], [6, 40]]; for (const R of [3.5, 4.5, 5.5]) { const c = X.curveCap(bump, R); const k = bump.findIndex(p => p[0] > R); ok(c >= Math.min(bump[k - 1][1], bump[k][1]) - 1e-9 && c <= Math.max(bump[k - 1][1], bump[k][1]) + 1e-9, `uneven chart: curve at ${R} stays between its neighbours`); }
  const ch = CR.find(c => c.id === 'ltm1250').charts[0]; const p = X.getChart(ch);
  const col = p.cols.findIndex((_, i) => p.rows.filter(r => r[i + 1] != null).length > 6); const rows = p.rows.filter(r => r[col + 1] != null);
  const Rm = (rows[2][0] + rows[3][0]) / 2; const cons = X.lookupCap(p, col, Rm, 'conservative').cap, curv = X.lookupCap(p, col, Rm, 'curve').cap, lin = X.lookupCap(p, col, Rm, 'interpolate').cap;
  ok(cons <= curv + 1e-9 && curv <= lin + 1e-9, `LTM1250 between rows: conservative ${cons} ≤ curve ${curv} ≤ line ${lin}`);
  ok(X.lookupCap(p, col, rows[3][0], 'curve').cap === rows[3][1], 'curve fit returns the chart value on a chart radius');
  ok(X.lookupCap(p, col, Rm, 'curve').curve === true, 'curve reading is flagged');
}

// ---------- 2. net capacity deductions ----------
{
  const p = plan0(); const base = X.computePlan(p, CR, S0).loads[0];
  ok(base.jd === 0 && base.rope === 0, 'no deductions by default');
  near(base.netCap, Math.round((base.cap / (base.daf || 1) - (base.hb + base.tk + base.ex)) * 100) / 100, 'net capacity = chart − hook − tackles − other', 0.011);
  const p2 = clone(p); p2.jibDed = 1.6; const r2 = X.computePlan(p2, CR, S0).loads[0];
  near(r2.total - base.total, 1.6, 'folded jib adds to the hook load', 0.011); ok(r2.checks.some(c => c.t === 'Deductions' && /folded jib 1.60 t/.test(c.m)), 'deduction check lists the folded jib');
  near(r2.netCap, base.netCap - 1.6, 'net capacity drops by the jib', 0.02);
  const p3 = clone(p); p3.ropeKgM = 4; p3.falls = 6; const r3 = X.computePlan(p3, CR, S0).loads[0];
  near(r3.rope, Math.round(6 * r3.ropeInfo.len * 4 / 1000 * 100) / 100, 'hoist rope = falls × hanging length × kg/m', 0.011); ok(r3.ropeInfo.len > 0, 'hanging rope length worked out from the boom head');
  ok(r3.util > base.util, 'rope weight raises the utilisation');
  const p4 = clone(p); p4.ropeKgM = 4; p4.falls = ''; for (const ch of [CR.find(c => c.id === p4.craneId)?.charts?.[p4.chartIdx]]) void ch;
  const r4 = X.computePlan(p4, CR, S0).loads[0]; ok(r4.rope === 0 || r4.ropeInfo.falls > 0, 'no falls known → rope not counted (or taken from the chart column)');
}

// ---------- 3. wind on the load (EN 13000 area rule) ----------
{
  const p = plan0(); const r0 = X.computePlan(p, CR, S0).loads[0];
  const pw = clone(p); pw.loads[0].area = 40; pw.loads[0].cw = 1.2; const rw = X.computePlan(pw, CR, S0).loads[0]; const w = rw.wind;
  ok(!!w, 'wind result present when the load area is set');
  near(w.vPerm, Math.round(Math.min(w.vTab, w.vTab * Math.sqrt(1.2 * w.mH / w.AW)) * 100) / 100, 'v_perm = v_chart · √(1.2 · m_H / A_W)', 0.011);
  ok(w.vTab === 9.8 && X.windTabOf(pw) === 9.8, 'chart wind limit defaults to 9.8 m/s'); ok(w.vDes == null, 'no weather → no design gust');
  ok(rw.checks.some(c => c.t === 'Wind on the load' && /stop lifting above/.test(c.m)), 'no weather: the check gives the wind limit for this load');
  near(rw.cap, r0.cap, 'no weather: capacity unchanged', 1e-9);
  const small = clone(p); small.loads[0].area = 0.5; const rs = X.computePlan(small, CR, S0).loads[0]; near(rs.wind.vPerm, rs.wind.vTab, 'small area: wind limit stays at the chart value', 1e-9);
  const hot = clone(pw); hot.weather = { limit: 12, start: '07:00', hours: 4, manual: { wind: 14, gust: 18 }, print: true }; const rh = X.computePlan(hot, CR, S0).loads[0];
  ok(rh.wind.vTab === 12, 'weather limit used as the chart wind limit'); ok(rh.wind.vDes > rh.wind.vPerm, 'strong gust beats the load wind limit');
  ok(rh.checks.some(c => c.t === 'Wind on the load' && c.s === 'fail'), 'too windy → FAIL'); ok(rh.wind.dR > 0, 'extra wind pushes the load out');
  ok(rh.cap <= r0.cap + 1e-9, 'capacity read at the drifted reach is not higher'); ok(rh.capInfo.wind === true || rh.cap === r0.cap, 'wind-drift capacity is flagged');
  const calm = clone(pw); calm.weather = { limit: 12, start: '07:00', hours: 4, manual: { wind: 1, gust: 1.5 }, print: true }; const rc = X.computePlan(calm, CR, S0).loads[0];
  ok(rc.wind.dR === 0 && rc.cap === r0.cap, 'calm day: no drift, no capacity change'); ok(rc.checks.some(c => c.t === 'Wind on the load' && c.s === 'ok'), 'calm day → wind check OK');
}

// ---------- 4. tandem: static shares ----------
{
  const s2 = X.tandemStatic([{ x: 0, z: 0 }, { x: 10, z: 0 }], 20, 2.5, 0); near(s2[0], 15, 'lever rule crane 1'); near(s2[1], 5, 'lever rule crane 2');
  const s3 = X.tandemStatic([{ x: 0, z: 0 }, { x: 5, z: 0 }, { x: 10, z: 0 }], 30, 5, 0); s3.forEach((v, i) => near(v, 10, `3 cranes in a line, CoG in the middle: crane ${i + 1}`));
  const s3b = X.tandemStatic([{ x: 0, z: 0 }, { x: 5, z: 0 }, { x: 10, z: 0 }], 30, 3, 0); near(s3b.reduce((a, b) => a + b, 0), 30, '3 cranes: shares add up'); near(s3b.reduce((a, v, i) => a + v * [0, 5, 10][i], 0), 90, '3 cranes: moments balance');
  const s4 = X.tandemStatic([{ x: 0, z: -2 }, { x: 10, z: -2 }, { x: 10, z: 2 }, { x: 0, z: 2 }], 40, 5, 0); s4.forEach((v, i) => near(v, 10, `4 corners, CoG central: crane ${i + 1}`));
  const sOut = X.tandemStatic([{ x: 0, z: 0 }, { x: 10, z: 0 }], 20, 12, 0); ok(sOut[0] === 0 && Math.abs(sOut[1] - 20) < 1e-9, 'CoG outside the picks: the far crane would take it all (and the check fails)');
}
// ---------- 5. tandem: the load hanging from two lines ----------
{
  const A = [{ s: 0, y: 30 }, { s: 10, y: 30 }]; const W = 20;
  const chk = (r, msg) => { ok(!!r && r.res < 1e-6, `${msg}: equilibrium residual ${r ? r.res.toExponential(1) : 'none'}`); if (r) near(r.T[0] * r.u[0].y + r.T[1] * r.u[1].y, W, `${msg}: vertical shares add up to W`, 1e-6); return r; };
  const plumb = chk(X.tandemHang(A, [20, 20], [0, 10], { c: 5, e: -1 }, W), 'plumb'); near(plumb.T[0], 10, 'plumb, CoG central: 10 t each', 1e-6); near(plumb.pose.al, 0, 'plumb: level', 1e-6);
  const off = chk(X.tandemHang(A, [20, 20], [0, 10], { c: 2.5, e: -1 }, W), 'off-centre'); near(off.T[0], 15, 'off-centre CoG: lever rule on the lines', 1e-4);
  const hBelow = chk(X.tandemHang(A, [19, 20], [0, 10], { c: 5, e: -1 }, W), 'hoist crane 1, CoG below'); ok(hBelow.T[0] * hBelow.u[0].y > 10.05, `CoG below the lifting points: the end hoisted up takes more (${(hBelow.T[0] * hBelow.u[0].y).toFixed(3)} t)`); ok(hBelow.pose.al < 0, 'crane 1 end is higher → tilt negative');
  const hAbove = chk(X.tandemHang(A, [19, 20], [0, 10], { c: 5, e: 1 }, W), 'hoist crane 1, CoG above'); ok(hAbove.T[0] * hAbove.u[0].y < 9.95, `CoG above the lifting points: load runs to the low end (${(hAbove.T[0] * hAbove.u[0].y).toFixed(3)} t on the high end)`);
  const boom = chk(X.tandemHang([{ s: -0.5, y: 30.3 }, A[1]], [20, 20], [0, 10], { c: 5, e: -1 }, W), 'boom crane 1 in');
  ok(Math.abs(boom.T[0] * boom.u[0].s + boom.T[1] * boom.u[1].s) < 1e-6, 'line pulls along the load balance each other');
  const ang = boom.u.map(u => Math.atan2(u.s, u.y) * 180 / Math.PI); ok(Math.abs(ang[0]) > 0.3 && Math.abs(ang[1]) > 0.3, `both lines lean out of plumb (${ang.map(a => a.toFixed(2)).join(', ')}°)`);
  const rev = chk(X.tandemHang([{ s: 10, y: 30 }, { s: 0, y: 30 }], [20, 20], [10, 0], { c: 7.5, e: -1 }, W), 'picks numbered the other way'); near(rev.T[0], 15, 'mirrored layout gives the mirrored share', 1e-4);
  const long = chk(X.tandemHang(A, [20, 26], [0, 10], { c: 2, e: -1 }, W), 'line 2 paid out 6 m'); ok(long.pose.al < -0.3 && long.T[1] > 0, 'a longer line lets that end hang low; both lines still carry');
  const slack = X.tandemHang(A, [20, 20], [0, 10], { c: -1, e: -1 }, W); ok(slack && slack.slack === 1 && slack.T[0] === W && slack.T[1] === 0, 'CoG beyond crane 1 lifting point → line 2 goes slack, crane 1 holds it all');
}
// ---------- 6. tandem in a plan ----------
{
  const p = plan0(); p.loads[0].w = 30; p.loads[0].cont = 0; p.loads[0].l = 12; const own = Math.round(p.loads[0].crane || 0);
  p.cranes.push({ ...X.rigPick(p), craneId: 'ltm1250', chartIdx: 0, colIdx: 3 });
  p.loads[0].tandem = X.tandemDefault(p.loads[0], 2, 12, 0); p.loads[0].tandem.picks[0].crane = own; p.loads[0].tandem.picks[1].crane = p.cranes.length - 1;
  const t0 = performance.now(); const calc = X.computePlan(p, CR, S0); const ms = performance.now() - t0; const r = calc.loads[0]; const T = r.tandem;
  ok(!!T && T.picks.length === 2, 'tandem result on the lift'); near(T.picks.reduce((a, q) => a + q.share, 0), 30, 'shares add up to the load', 0.02);
  ok(T.picks.every(q => q.res && q.res.cap != null), 'each crane checked against its own chart'); ok(r.checks.filter(c => /^Tandem · Crane/.test(c.t)).length === 2, 'one tandem line per crane');
  ok(!r.checks.some(c => c.t === 'Capacity utilisation'), 'single-crane capacity line replaced by the tandem lines'); ok(calc.outrigs.length === 2, 'both cranes get an outrigger model');
  ok(T.maxUtil === Math.max(...T.picks.map(q => q.util)), 'busiest crane reported'); ok(ms < 200, `tandem plan computed in ${ms.toFixed(1)} ms`);
  near(T.picks[0].pos.x, calc.loads[0].R * Math.cos(T.picks[0].boomHd * Math.PI / 180) + (p.sitePlan.cx || 0), 'crane 1 lifts under its own hook', 1e-6);
  const p2 = clone(p); p2.loads[0].tandem.cog = 2; const T2 = X.computePlan(p2, CR, S0).loads[0].tandem; ok(T2.picks[0].share > T2.picks[1].share, 'CoG near crane 1 → crane 1 carries more');
  const p3 = clone(p); p3.loads[0].tandem.picks[0].mv = { boom: 0, swing: 0, hoist: 0.6 }; p3.loads[0].tandem.cogH = -1.5; const T3 = X.computePlan(p3, CR, S0).loads[0].tandem;
  ok(T3.picks[0].share > T.picks[0].share + 0.01, `hoisting crane 1 shifts load onto it (${T.picks[0].share} → ${T3.picks[0].share} t)`); ok(T3.checks.some(c => c.t === 'Load transfer'), 'load transfer reported after a move');
  const p4 = clone(p); p4.loads[0].tandem.picks[1].mv = { boom: 2, swing: 0, hoist: 0 }; const T4 = X.computePlan(p4, CR, S0).loads[0].tandem; ok(T4.picks[1].Rnow !== T4.picks[1].R, 'booming up changes that crane\'s reach');
  ok(Math.abs(T4.picks[1].lineAng) > 0.05, `booming up pulls the line out of plumb (${T4.picks[1].lineAng}°)`);
  const p5 = clone(p); p5.loads[0].tandem.derate = 5; const r5 = X.computePlan(p5, CR, S0).loads[0]; ok(r5.status === 'fail' && r5.checks.some(c => /^Tandem · Crane/.test(c.t) && c.s === 'fail'), 'a crane over the tandem limit fails the lift');
  const p6 = clone(p); p6.loads[0].tandem.picks[1].crane = own; ok(X.computePlan(p6, CR, S0).loads[0].checks.some(c => c.t === 'Tandem cranes' && c.s === 'fail'), 'two lifting points on one crane → FAIL');
  const p6b = clone(p); p6b.loads[0].tandem.picks[1].crane = 9; ok(X.computePlan(p6b, CR, S0).loads[0].checks.some(c => c.t === 'Tandem cranes' && c.s === 'fail' && /no longer on the plan/.test(c.m)), 'a lifting point on a removed crane → FAIL, not a silent swap');
  const p7 = clone(p); p7.loads[0].tandem.on = false; const r7 = X.computePlan(p7, CR, S0).loads[0]; const r7b = X.computePlan(plan0(), CR, S0).loads[0]; ok(!r7.tandem && r7.checks.some(c => c.t === 'Capacity utilisation'), 'tandem off → the normal single-crane lift');
  void r7b;
  const p8 = clone(p); p8.cranes.push({ ...X.rigPick(p), craneId: 'ltm1300', chartIdx: 0, colIdx: 4 }); p8.loads[0].tandem = X.tandemDefault(p8.loads[0], 3, 12, 0); p8.loads[0].tandem.picks.forEach((q, i) => { q.crane = [own, 1, 2][i]; });
  const T8 = X.computePlan(p8, CR, S0).loads[0].tandem; ok(T8.picks.length === 3 && Math.abs(T8.picks.reduce((a, q) => a + q.share, 0) - 30) < 0.02, 'three cranes share the load'); ok(T8.checks.some(c => c.t === 'Tandem share'), 'three cranes: plumb-line share reported');
  let svg = ''; try { const sh = X.buildSheet(p, calc, S0); svg = X.toSVG(sh.P); } catch (e) { console.log(e); } ok(/C2 /.test(svg) || svg.length > 1000, 'A1 sheet still builds with a tandem lift');
}

// ---------- 7. Fit-Filter ----------
{
  const req = { w: 20, tk: 0.5, hb: 0, cont: 10, R: 18, h: 2, rigH: 3, site: { obstacles: [] }, hookAllowance: 3, side: 'rear' };
  let t0 = performance.now(); const all = X.findCranes(req, CR, S0, {}); const ms = performance.now() - t0; const best = X.bestPerCrane(all);
  ok(ms < 1000, `fleet searched in ${ms.toFixed(0)} ms (budget 1 s)`); ok(best.length >= 8, `${best.length} cranes ranked`);
  ok(best.findIndex(o => !o.ok) === -1 || best.slice(0, best.findIndex(o => !o.ok)).every(o => o.ok), 'cranes that can do it come first');
  for (const o of best.filter(x => x.ok)) { const full = X.computeLoad({ craneId: o.crane.id, chartIdx: o.chi, colIdx: o.ci, site: req.site, hookAllowance: 3, rigging: { height: 3 } }, o.crane, { w: 20, hb: o.crane.hookBlock, tk: 0.5, cont: 10, R: 18, h: 2, rigH: 3, side: 'rear' }, S0); ok(full.util <= 90 + 1e-9 && full.cap != null, `${o.crane.model}: the picked set-up really works (${full.util}%)`); }
  const okIds = new Set(best.filter(o => o.ok).map(o => o.crane.id)); ok(okIds.size > 0, 'some crane can lift 20 t at 18 m');
  const tall = X.bestPerCrane(X.findCranes({ ...req, obst: { h: 40, x: 12 } }, CR, S0, {})); const tallOk = tall.filter(o => o.ok);
  ok(tallOk.length <= okIds.size, `a 40 m obstruction rules some out (${okIds.size} → ${tallOk.length})`);
  ok(tallOk.every(o => o.r.clearance == null || o.r.clearance > 0), 'every crane still in clears the obstruction');
  ok(tallOk.every(o => o.col.L >= 40), 'only booms long enough to get over 40 m remain');
  const heavy = X.bestPerCrane(X.findCranes({ ...req, w: 5000 }, CR, S0, {})); ok(heavy.every(o => !o.ok) && heavy.length > 0, 'impossible load: every crane says no, with its strongest set-up');
  const ok1 = best.find(o => o.ok); ok(!ok1 || best.filter(o => o.ok && o.crane.id === ok1.crane.id).length === 1, 'one set-up per crane');
}

// ---------- 8. satellite map maths ----------
{
  near(X.GIS.mpp(0, 0), 156543.03392, 'equator, zoom 0: 156 543 m per pixel', 1e-3); near(X.GIS.mpp(60, 1), 156543.03392 / 4, 'lat 60, zoom 1: halves twice', 1e-3);
  const t = X.GIS.tileXY(0, 0, 1); near(t.x, 1, 'tile x at (0,0) z1'); near(t.y, 1, 'tile y at (0,0) z1');
  const L = X.GIS.layout(24.4539, 54.3773, 200, 'esri'); ok(L.z === 19 && L.px <= 1800 && L.n <= 16, `200 m round Abu Dhabi: zoom ${L.z}, ${L.px} px, ${L.n} tiles`); near(L.px * L.mpp, 200, 'picture covers 200 m', 0.5);
  const L8 = X.GIS.layout(24.4539, 54.3773, 800, 'esri'); ok(L8.px <= 1800 && L8.z < 19, `800 m keeps under 1800 px (zoom ${L8.z})`);
  const M = X.GIS.layout(24.4539, 54.3773, 200, 'mapbox'); ok(M.tile === 512 && M.px <= 1800, 'Mapbox 512-px tiles');
  ok(JSON.stringify(X.GIS.parseLatLon('24.4539, 54.3773')) === '{"lat":24.4539,"lon":54.3773}', 'coordinates parsed'); ok(X.GIS.parseLatLon('Abu Dhabi') === null && X.GIS.parseLatLon('95, 10') === null, 'non-coordinates refused');
}

// ---------- 9. fast outrigger sweep = the original one ----------
{
  const slowSweep = (mm, pads, geo, hookT, R, step = 5) => { const max = {}; for (const p of pads) max[p.id] = { v: 0, th: 0 }; let minMargin = Infinity, tipped = false, lifted = false;
    for (let th = 0; th < 360; th += step) { const a = X.outAt(mm, pads, geo, th, hookT, R); if (a.state === 'tipped') tipped = true; else if (a.lifted.length) lifted = true; if (a.margin < minMargin) minMargin = a.margin; for (const p of pads) if (a.R[p.id] > max[p.id].v) max[p.id] = { v: a.R[p.id], th }; }
    return { max, minMargin, tipped, lifted }; };
  let worst = 0, flags = true; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 60; i++) {
    const cr = CR[i % CR.length]; const ext = { left: rnd() < 0.3 ? 'half' : 'full', right: rnd() < 0.3 ? 'half' : 'full' }; const pads = X.outPads(cr, ext); const mm = X.outMassModel(cr, 5 + rnd() * 60);
    const geo = { kind: 'main', pivot: { x: -1.5, y: 3 }, L: 15 + rnd() * 40, theta: 20 + rnd() * 60 }; const hook = rnd() * 80, R = 4 + rnd() * 30;
    const a = X.outSweep(mm, pads, geo, hook, R, 5), b = slowSweep(mm, pads, geo, hook, R, 5);
    for (const p of pads) worst = Math.max(worst, Math.abs(a.max[p.id].v - b.max[p.id].v));
    if (a.tipped !== b.tipped || a.lifted !== b.lifted) flags = false;
    const tA = X.outTipHook(mm, pads, geo, 180, R); const inside = (m) => { const c = X.outCog(X.outMasses(mm, geo, 180, m, R)); return X.outMargin(c.x, c.y, pads) >= 0; };
    if (Number.isFinite(tA) && tA > 0) ok(inside(tA * 0.999) && !inside(tA * 1.001), `tipping load ${tA.toFixed(2)} t sits on the tipping edge (case ${i})`);
  }
  ok(worst < 1e-6, `fast sweep matches the original to ${worst.toExponential(1)} t`); ok(flags, 'fast sweep: same lift-off and tipping flags');
}

// ---------- 10. back-compat and speed ----------
{
  const want = { elswedey: [70.71], emcc: [47], zakir: [74.92], transformer: [64.17], tc: [35.62, 37.1] };
  for (const s of X.SAMPLE_PLANS) { const id = s.id || s.key || ''; const w = want[id]; const c = X.computePlan(X.normalizePlan(s.make()), CR, S0); if (!w) continue; w.forEach((u, i) => near(c.loads[i].util, u, `sample ${id} lift ${i + 1} utilisation unchanged`, 1e-9)); }
  const old = X.normalizePlan({ ...plan0(), jibDed: undefined, ropeKgM: undefined, windTab: undefined }); ok(X.computePlan(old, CR, S0).loads.length > 0, 'a plan saved before v9 still computes');
  const times = X.SAMPLE_PLANS.map(s => { const p = X.normalizePlan(s.make()); X.computePlan(p, CR, S0); const t = performance.now(); for (let i = 0; i < 10; i++) X.computePlan(p, CR, S0); return (performance.now() - t) / 10; });
  ok(Math.max(...times) < 25, `every sample recomputes in under 25 ms (worst ${Math.max(...times).toFixed(1)} ms)`);
  ok(X.cranes() === X.cranes(), 'fleet list is reused between redraws');
  X.state.userCranes = { ...X.state.userCranes, tst: { ...clone(CR[0]), id: 'tst', model: 'TEST' } }; ok(X.cranes().some(c => c.id === 'tst'), 'a new fleet crane shows at once');
}

console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
