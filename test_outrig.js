// Outrigger engine asserts: the outrigger brief's worked example (§10, every number to ±0.1 kN), the invariants (§9), half outriggers,
// hand-typed (illustration) pad loads and the computePlan wiring. No browser.   node test_outrig.js   (exits non-zero on any failure)
const fs = require('fs'), vm = require('vm');
const strip = s => s.replace(/\nif \(typeof module[\s\S]*$/, '\n');
const FILES = ['gen/assets', 'src/data', 'src/library', 'src/engine', 'src/duty', 'src/outrig', 'src/draw', 'src/rigging', 'src/crane2d', 'src/fixes', 'src/samples', 'src/app'];
const code = FILES.map(f => strip(fs.readFileSync(f + '.js', 'utf8'))).join('\n') + `
this.X = { DEFAULT_CRANES, DEFAULT_SETTINGS, SAMPLE_PLANS, blankPlan, normalizePlan, computePlan, computeLoad, buildSheet, toSVG, OUT_G, OUT_PADS, outPlane, outSolve, outAt,
  outTipHook, outSweep, outMargin, outPads, outSpans, outExtOf, outMassModel, outPressure, outMatSide, chartOutExt, outriggerCrane, CRANE_KEYS, rigPick, sheetBlocks, sheetOverrides, groundRows };`;
const ctx = { console, window: {}, localStorage: { getItem() { return null; }, setItem() {} } }; vm.createContext(ctx); vm.runInContext(code, ctx);
const X = ctx.X; const clone = (o) => JSON.parse(JSON.stringify(o)); const G = X.OUT_G;

let fails = 0, passes = 0;
const ok = (c, msg) => { if (c) passes++; else { fails++; console.log('FAIL ' + msg); } };
const near = (a, b, msg, tol = 0.1) => ok(Math.abs(a - b) <= tol, `${msg} (got ${typeof a === 'number' ? a.toFixed(3) : a}, want ${b})`);

// ---------- §10 worked example (generic ~60 t crane, illustrative) ----------
const ex = 0.3, a = 3.6, b = 3.5;
const pads = [{ id: 'FR', x: ex + a, y: -b }, { id: 'FL', x: ex + a, y: b }, { id: 'RL', x: ex - a, y: b }, { id: 'RR', x: ex - a, y: -b }];
const mm = { carrier: 28, carrierX: 0.8, sup: 8, supR: -1.2, cwt: 12, cwtR: -3.2, boom: 9, jibPerM: 0, boomF: () => 0.4 };
const geo = { kind: 'main', pivot: { x: -1.5, y: 0 }, L: 25, theta: Math.acos((12 + 1.5) / 25) * 180 / Math.PI };
const kN = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v * G]));
const T103 = { 0: [206.5, 206.5, 106.9, 106.9], 45: [158.0, 227.2, 155.5, 86.2], 90: [109.9, 207.9, 203.5, 105.5], 135: [90.6, 159.9, 222.8, 153.6], 180: [111.3, 111.3, 202.1, 202.1] };
const C103 = { 0: [1.444, 0], 45: [1.124, 0.774], 90: [0.351, 1.094], 135: [-0.423, 0.774], 180: [-0.743, 0] };
for (const [th, want] of Object.entries(T103)) {
  const r = X.outAt(mm, pads, geo, +th, 6.9, 12); const R = kN(r.R);
  near(r.M * G, 626.9, `10.3 θ=${th} W`, 0.05);
  near(r.cog.x, C103[th][0], `10.3 θ=${th} x_cg`, 0.0006); near(r.cog.y, C103[th][1], `10.3 θ=${th} y_cg`, 0.0006);
  ['FR', 'FL', 'RL', 'RR'].forEach((id, i) => near(R[id], want[i], `10.3 θ=${th} ${id}`));
  ok(r.state === '4-point', `10.3 θ=${th} 4-point (got ${r.state})`);
}
const T104 = { 0: [353.5, 353.5, 29.1, 29.1, '4-point'], 45: [145.7, 465.9, 153.6, 0, '3-point'], 90: [23.1, 358.2, 359.5, 24.4, '4-point'], 135: [0, 150.9, 468.7, 145.7, '3-point'], 180: [27.7, 27.7, 354.9, 354.9, '4-point'] };
for (const [th, want] of Object.entries(T104)) {
  const r = X.outAt(mm, pads, geo, +th, 21, 12); const R = kN(r.R);
  near(r.M * G, 765.2, `10.4 θ=${th} W`, 0.05);
  ['FR', 'FL', 'RL', 'RR'].forEach((id, i) => near(R[id], want[i], `10.4 θ=${th} ${id}`));
  ok(r.state === want[4], `10.4 θ=${th} ${want[4]} (got ${r.state})`);
  ok(Object.values(r.R).every(v => v >= 0), `10.4 θ=${th} no negative reaction`);
}
ok(X.outAt(mm, pads, geo, 45, 21, 12).lifted.join() === 'RR', '10.4 θ=45 RR lifted'); ok(X.outAt(mm, pads, geo, 135, 21, 12).lifted.join() === 'FR', '10.4 θ=135 FR lifted');
{ const sw = X.outSweep(mm, pads, geo, 21, 12, 5); const top = Object.entries(sw.max).sort((p, q) => q[1].v - p[1].v)[0];
  near(top[1].v * G, 468.7, '10.4 sweep P_max'); ok((top[0] === 'RL' && top[1].th === 135) || (top[0] === 'RR' && top[1].th === 225), `10.4 sweep P_max at RL 135° (or its mirror RR 225°) (got ${top[0]} ${top[1].th}°)`); near(sw.max.RL.v * G, 468.7, '10.4 sweep RL max'); ok(sw.max.RL.th === 135, 'RL peaks at 135°');
  near(top[1].v * G / 765.2, 0.61, '10.4 P_max = 0.61 W', 0.005); ok(top[1].v * G < 0.65 * 765.2, 'under the 0.65 W rule of thumb'); }
for (const [th, want] of [[0, 26.27], [45, 41.85], [90, 24.99], [270, 24.99], [180, 25.68]]) near(X.outTipHook(mm, pads, geo, th, 12), want, `10.5 tipping load θ=${th}`, 0.01);
{ let mn = Infinity; for (let th = 0; th < 360; th += 1) mn = Math.min(mn, X.outTipHook(mm, pads, geo, th, 12)); near(mn, 24.99, '10.5 360° minimum tipping load', 0.01); near(mn * 0.85, 21.24, '10.5 360° rating (85 %)', 0.01); }
// §10.6 ground bearing (P in kN, pressure in kPa)
for (const [w, want] of [[0.6, 1302], [1.0, 469], [1.5, 208], [2.0, 117]]) near(X.outPressure(468.7, w, w), want, `10.6 pressure on ${w} m`, 1);
for (const [q, want] of [[150, 1.77], [100, 2.17], [50, 3.06]]) near(X.outMatSide(468.7, q), want, `10.6 mat side at ${q} kPa`, 0.0051);

// ---------- §9 invariants ----------
for (let th = 0; th < 360; th += 7) for (const hk of [0, 6.9, 15, 21]) {
  const r = X.outAt(mm, pads, geo, th, hk, 12); if (r.state === 'tipped') continue;
  const W = r.M; const sR = Object.values(r.R).reduce((s, v) => s + v, 0);
  const mx = pads.reduce((s, p) => s + r.R[p.id] * p.x, 0), my = pads.reduce((s, p) => s + r.R[p.id] * p.y, 0);
  ok(Math.abs(sR - W) < 1e-6 * W && Math.abs(mx - W * r.cog.x) < 1e-6 * W * 7.2 && Math.abs(my - W * r.cog.y) < 1e-6 * W * 7.2, `equilibrium θ=${th} hook ${hk}`);
}
{ const R = X.outPlane(pads, 100, ex, 0); ok(R.every(v => Math.abs(v - 25) < 1e-9), 'symmetry: CoG at the box centre → W/4 each'); }
{ // closed form 6a vs plane fit 6b
  const xc = 1.1, yc = 0.6, W = 500; const u = (xc - ex) / a, v = yc / b; const R = X.outPlane(pads, W, xc, yc); const sx = [1, 1, -1, -1], sy = [-1, 1, 1, -1];
  ok(R.every((r, i) => Math.abs(r - W / 4 * (1 + sx[i] * u + sy[i] * v)) < 1e-9), 'rigid plane = closed form on a symmetric box'); }
{ let prev = Infinity, okc = true, zero = false; for (let hk = 0; hk <= 30; hk += 0.25) { const r = X.outAt(mm, pads, geo, 45, hk, 12); if (r.state === 'tipped') break; const v = r.R.RR; if (v < -1e-12) okc = false; if (v === 0) zero = true; else if (zero) okc = false; prev = v; }
  ok(okc && zero, 'lift-off continuity: RR goes to 0 at 45° and stays 0'); }
{ const t = X.outTipHook(mm, pads, geo, 90, 12); const r = X.outAt(mm, pads, geo, 90, t - 1e-6, 12);
  ok(Math.abs(r.margin) < 0.001, `tipping limit: CoG on the edge (margin ${r.margin})`); ok(r.R.FR < 1e-3 * r.M && r.R.RR < 1e-3 * r.M, 'tipping limit: only the two edge pads carry load'); }
{ let last = 0, mono = true; for (let R = 6; R <= 20; R += 0.5) { const g = { ...geo, theta: Math.acos(Math.min(1, (R + 1.5) / 25)) * 180 / Math.PI }; const sw = X.outSweep(mm, pads, g, 6.9, R, 5); if (sw.tipped) break; const pk = Math.max(...Object.values(sw.max).map(m => m.v)); if (pk < last - 1e-9) mono = false; last = pk; }
  ok(mono, 'monotonic: longer reach never lowers the peak pad load'); }

// ---------- app wiring: half outriggers, spans, manual (illustration) pad loads, computePlan ----------
const crane = clone(X.DEFAULT_CRANES.find(c => c.id === 'ltm1080'));
const sp = X.outSpans(crane, { left: 'half', right: 'full' });
near(sp.yR * 2, crane.outTrans, 'full side keeps the full span', 1e-9); near(sp.yL * 2, (crane.outTrans + crane.width) / 2, 'half side = halfway between carrier and full', 1e-9);
ok(X.outSpans({ ...crane, outTransHalf: 5 }, { left: 'half', right: 'half' }).yL === 2.5, 'crane outTransHalf wins over the estimate');
ok(X.chartOutExt({ name: 'Main boom · 50% outriggers' }) === 'half' && X.chartOutExt({ name: 'T · 16 t CWT · 360°' }) === 'full', 'chart outrigger basis read from its name');
const plan = X.normalizePlan({ ...X.blankPlan(), craneId: 'ltm1080', chartIdx: 0, colIdx: 2 });
plan.loads[0] = { ...plan.loads[0], w: 8, R: 10, side: 'rear' };
let calc = X.computePlan(plan, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS);
const O = calc.outr; ok(!!O && O.lifts.length === 1, 'computePlan returns the outrigger result');
ok(O.est === true, 'built-in crane → estimated mass model');
const tot = O.lifts[0].at.M; near(Object.values(O.lifts[0].at.R).reduce((s, v) => s + v, 0), tot, 'pad loads add up to the crane + load', 1e-6);
ok(O.lifts[0].at.R.RL > O.lifts[0].at.R.FL && O.lifts[0].at.R.RR > O.lifts[0].at.R.FR, 'lifting over the rear loads the rear legs most');
ok(calc.loads[0].checks.some(c => c.t === 'Leg loads'), 'Leg loads check on the lift');
ok(O.Pmax.v >= Math.max(...Object.values(O.lifts[0].at.R)) - 1e-9, '360° basis ≥ the lift-side value');
// half out on the left, lifting over the left: less leg spread → bigger leg load + the chart is for full legs → FAIL
const p2 = clone(plan); p2.loads[0].side = 'left'; let c2 = X.computePlan(p2, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS);
const full = Math.max(...Object.values(c2.outr.lifts[0].at.R)); p2.outExt = { left: 'half', right: 'full' }; c2 = X.computePlan(p2, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS);
const half = Math.max(...Object.values(c2.outr.lifts[0].at.R)); ok(half > full, `half legs on the lift side raise the biggest leg load (${full.toFixed(2)} → ${half.toFixed(2)} t)`);
ok(c2.loads[0].checks.some(c => c.t === 'Outriggers' && c.s === 'fail') && c2.status === 'fail', 'half legs with a full-leg chart → FAIL');
p2.loads[0].capOverride = 5; c2 = X.computePlan(p2, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS); ok(c2.loads[0].checks.some(c => c.t === 'Outriggers' && c.s === 'warn'), 'capacity typed by hand → only a warning');
ok(X.CRANE_KEYS.includes('outExt') && X.CRANE_KEYS.includes('padMan'), 'outExt and padMan are per-crane fields');
// hand-typed pad loads: used for the ground, flagged as illustration
const p3 = clone(plan); p3.outrigger = { ...p3.outrigger, enabled: true, mat: '1.0x1.0', matSelf: 0, allow: 20 }; p3.padMan = { FL: 55, RR: '' };
const c3 = X.computePlan(p3, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS);
ok(c3.outr.illus && c3.outr.used.FL === 55 && c3.outr.manual.RR == null, 'typed FL used, empty RR stays calculated');
ok(c3.ground && c3.ground.src === 'illus' && Math.abs(c3.ground.P - 55) < 1e-9 && c3.ground.press === 55, 'ground uses the typed value and says it is an illustration');
ok(c3.outr.checks.some(c => /ILLUSTRATION ONLY/.test(c.m) && c.s === 'warn'), 'illustration warning check');
ok(c3.ground.status === 'fail', '55 t on a 1 m² mat over 20 t/m² → ground FAIL');
const svg = X.toSVG(X.buildSheet(p3, c3, X.DEFAULT_SETTINGS).P, {}); ok(/ILLUSTRATIVE/.test(svg) && /NOT REAL CRANE DATA/.test(svg), 'sheet prints the illustration warning');
ok(/FL/.test(svg) && /LEG LOADS/.test(svg), 'sheet prints the leg loads');
// sheet values typed over the calculated ones (Print → Change values on the sheet)
{ const p5 = clone(p3); p5.padMan = {}; p5.sheetRows = { ...(p5.sheetRows || {}), ov: { 'l0.cap#0': '99.5t', 'c0.crane#0': 'my crane', 'g.press': '12.0T/M²', 'l0.name#0': '' } };
  const c5 = X.computePlan(p5, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS); const rows = X.sheetBlocks(p5, c5, X.DEFAULT_SETTINGS).flatMap(b => b.rows);
  const cap = rows.find(r => r.id === 'l0.cap#0'); ok(cap && cap.ov && cap.v === '99.5T' && cap.calc !== cap.v, 'typed chart capacity replaces the printed one (upper case), calculated value kept');
  ok(rows.filter(r => r.id).every(r => /^(c|l|t)\d/.test(r.id)) && new Set(rows.filter(r => r.id).map(r => r.id)).size === rows.filter(r => r.id).length, 'every printed row has a unique id');
  ok(X.groundRows(p5, c5).find(r => r.id === 'g.press').v === '12.0T/M²', 'ground table value typed over');
  const sv = X.toSVG(X.buildSheet(p5, c5, X.DEFAULT_SETTINGS).P, {}); ok(sv.includes('99.5T') && sv.includes('MY CRANE') && sv.includes('12.0T/M²'), 'typed values print on the sheet');
  const ovs = X.sheetOverrides(p5, c5, X.DEFAULT_SETTINGS); ok(ovs.length === 3 && ovs.find(o => o.id === 'l0.cap#0').safety && !ovs.find(o => o.id === 'c0.crane#0').safety, 'overrides listed, safety rows flagged (empty entry ignored)'); }
// maker's figure wins and is not called an estimate
const p4 = clone(p3); p4.padMan = {}; p4.outrigger.maxLoad = 40; const c4 = X.computePlan(p4, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS); ok(c4.ground.src === 'maker' && c4.ground.P === 40, "maker's leg load wins");
// old plans (no outExt / padMan) still compute, every sample plan still builds
for (const s of X.SAMPLE_PLANS) { const p = X.normalizePlan(s.make()); const c = X.computePlan(p, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS); ok(c.outr && c.outr.ext.left === 'full' && c.outr.ext.right === 'full' && !c.outr.illus, `sample ${s.key}: full legs, nothing typed`); X.buildSheet(p, c, X.DEFAULT_SETTINGS); }
// every fleet crane: the estimated model keeps the CoG inside the legs with the hook empty, and stands at 100 % chart load over the rear
for (const c0 of X.DEFAULT_CRANES) {
  if (!(c0.charts || []).length) continue; const p = X.normalizePlan({ ...X.blankPlan(), craneId: c0.id, chartIdx: 0, colIdx: 0 });
  const r0 = X.computeLoad(p, c0, { ...p.loads[0], R: 8, w: 0, empty: true }, X.DEFAULT_SETTINGS); const o = X.outriggerCrane(p, c0, [{ li: 0, res: r0 }], {});
  ok(!o.lifts[0].unlTipped && o.lifts[0].at.state !== 'tipped', `${c0.id}: empty hook stands`);
}

console.log(`${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
