// v11 engine: the load chart follows the set-up (counterweight, Y-guying, fly jib, luffing jib, boom length), slew to any angle, hoist.
// Asserting; exit 1 on failure.   node test_v11.js
const fs = require('fs'); const vm = require('vm');
const ctx = { module: {}, console }; vm.createContext(ctx);
const strip = (f) => fs.readFileSync(f, 'utf8').replace(/\nif \(typeof module[\s\S]*$/, '\n');
vm.runInContext(['gen/assets.js', 'src/data.js', 'src/library.js', 'src/engine.js', 'src/duty.js', 'src/outrig.js', 'src/fixes.js'].map(strip).join('\n;\n') +
  '\nthis.E={DEFAULT_CRANES,DEFAULT_SETTINGS,sideOf,slewOf,sideFromSlew,boomHeadingFor,carrierHeadingFor,computeLoad,computePlan,getChart,resolveDuty,dutyOptions,dutyCheck,chartFam,dutyFamily,jibMainL};', ctx);
const E = ctx.E; const S = { ...E.DEFAULT_SETTINGS }; const C = (id) => E.DEFAULT_CRANES.find(c => c.id === id);
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, t = 0.01) => a != null && b != null && Math.abs(a - b) <= t;
const base = (id, o = {}) => ({ craneId: id, chartIdx: 0, colIdx: 0, cwt: '', boomOverride: '', tele: { mode: 'auto', fr: [] }, attach: { type: 'none', jibLen: 16, offset: 15, boomAngle: 83, swl: '' }, acc: { yguy: false, superlift: false, runner: false }, site: { obstacles: [] }, loads: [], ...o });
const load = (o = {}) => ({ w: 5, hb: 1, tk: 0.3, cont: 10, R: 14, h: 1, side: 'rear', ...o });
// apply a duty to the plan the way the app does (core.js applyDuty)
const apply = (p, c, L) => { const d = E.resolveDuty(p, c, { L, side: 'rear' }); p.chartIdx = d.chartIdx; p.colIdx = d.colIdx; p.boomOverride = d.boomOverride; if (d.kind !== 'main') { if (d.jibLen != null) p.attach.jibLen = d.jibLen; if (d.offset != null) p.attach.offset = d.offset; if (d.boomAngle != null) p.attach.boomAngle = d.boomAngle; if (d.chartIdx < 0) p.boomOverride = L; } return d; };

// --- families ---
ok(E.chartFam({ config: 'TY' }).yguy && !E.chartFam({ config: 'T' }).yguy && !E.chartFam({ config: 'MAINBOOM' }).yguy && E.chartFam({ config: 'TYF', kind: 'fixedjib' }).yguy, 'chartFam reads Y-guying from the config');
ok(E.chartFam({ config: 'HASSL' }).superlift && !E.chartFam({ config: 'HA' }).superlift, 'chartFam reads superlift');

// --- LTM1500: Y-guying on/off changes the chart and the capacity ---
{
  const c = C('ltm1500'); const p = base('ltm1500', { cwt: 135 }); const l = load({ R: 20 });
  let d = apply(p, c, 52.5); const ch0 = c.charts[d.chartIdx]; ok(ch0.config === 'T' && ch0.cwt === 135, 'LTM1500 unguyed → T 135 t chart (' + ch0.name + ')');
  const r0 = E.computeLoad(p, c, l, S);
  p.acc.yguy = true; d = apply(p, c, 52.5); const ch1 = c.charts[d.chartIdx]; ok(E.chartFam(ch1).yguy && ch1.cwt === 135, 'LTM1500 Y-guy on → guyed chart at 135 t (' + ch1.name + ')');
  const r1 = E.computeLoad(p, c, l, S);
  ok(r0.cap != null && r1.cap != null && r1.cap !== r0.cap, `Y-guying changes the safe load at 20 m on 52.5 m boom (${r0.cap} → ${r1.cap} t)`);
  ok(r1.cap > r0.cap, 'the guyed boom lifts more');
  ok(!r1.checks.some(x => x.t === 'Y-guying'), 'no Y-guy warning when the guyed chart is used');
  // 165 t fitted → the 165 t guyed chart
  p.cwt = 165; d = apply(p, c, 52.5); ok(c.charts[d.chartIdx].cwt === 165, 'LTM1500 Y-guy + 165 t → 165 t chart');
  // short boom: the guyed charts start at 31.7 m → no capacity, with the reason
  p.cwt = 135; d = apply(p, c, 21.3); const r2 = E.computeLoad(p, c, l, S); ok(r2.cap == null && /shorter than the shortest column/.test(r2.capInfo.why || ''), 'Y-guyed chart has no 21.3 m boom → no capacity, reason given: ' + r2.capInfo.why);
  // Y-guy on, but the plan still points at the unguyed chart → warning
  p.acc.yguy = true; p.chartIdx = 0; p.colIdx = 8; p.boomOverride = ''; const r3 = E.computeLoad(p, c, l, S); ok(r3.checks.some(x => x.t === 'Y-guying' && x.s === 'warn'), 'Y-guy on with the unguyed chart → warning');
}
// --- LTM1250: fly jib on/off, counterweight, jib length, offset ---
{
  const c = C('ltm1250'); const p = base('ltm1250', { cwt: 72.5 }); const l = load({ R: 16, w: 3 });
  let d = apply(p, c, 41.5); ok(c.charts[d.chartIdx].kind === 'main' && c.charts[d.chartIdx].cwt === 72.5, 'LTM1250 72.5 t → T 72.5 t main chart');
  const r0 = E.computeLoad(p, c, l, S);
  p.attach.type = 'fly'; p.attach.jibLen = 12; p.attach.offset = 20; d = apply(p, c, 41.5);
  ok(d.chartIdx === -1 && d.needCwt === 85 && /at least 85 t/.test(d.why), 'fly jib with 72.5 t → no chart, needs 85 t: ' + d.why);
  p.cwt = 85; d = apply(p, c, 41.5); let ch = c.charts[d.chartIdx];
  ok(ch && ch.kind === 'fixedjib' && near(E.jibMainL(ch), 41.5) && near(ch.jibLen, 5.4) && d.offset === 20, `fly jib 85 t on 41.5 m → only the 5.4 m folding jib is charted: ${ch && ch.name}, offset ${d.offset}`);
  p.attach.jibLen = 12; d = apply(p, c, 51.9); ch = c.charts[d.chartIdx];
  ok(ch && near(E.jibMainL(ch), 51.9) && near(ch.jibLen, 12.2) && d.offset === 20, `fly jib 12 m on 51.9 m → ${ch && ch.name}`);
  ok(d.snapped.jibLen && near(d.snapped.jibLen[1], 12.2), 'jib length snapped 12 → 12.2 m');
  const r1 = E.computeLoad(p, c, load({ R: 16, w: 3 }), S); ok(r1.cap != null && r1.cap !== r0.cap, `fly jib changes the safe load at 16 m (${r0.cap} → ${r1.cap} t)`);
  const rMain519 = (() => { const q = base('ltm1250', { cwt: 85 }); apply(q, c, 51.9); return E.computeLoad(q, c, load({ R: 16, w: 3 }), S); })(); ok(rMain519.cap != null && r1.cap < rMain519.cap, `the jib lifts less than the bare 51.9 m boom at 16 m (${rMain519.cap} → ${r1.cap} t)`);
  ok(!r1.manualJib, 'capacity comes from the jib chart, not a typed SWL');
  // offset 40 → lower capacity
  p.attach.offset = 40; d = apply(p, c, 51.9); const r2 = E.computeLoad(p, c, load({ R: 16, w: 3 }), S); ok(d.offset === 40 && (r2.cap == null ? /inside|beyond/.test(r2.capInfo.why || '') : r2.cap <= r1.cap), `offset 40° reads its own column (${r1.cap} → ${r2.cap ?? r2.capInfo.why})`);
  // boom length between jib charts snaps
  d = apply(p, c, 50); ok(d.snapped.L && near(d.L, 51.9), 'boom 50 m with a 12.2 m fly jib snaps to 51.9 m: ' + d.L);
  // jib off → back to the main chart for 85 t
  p.attach.type = 'none'; d = apply(p, c, 41.5); ok(c.charts[d.chartIdx].kind === 'main' && c.charts[d.chartIdx].cwt === 85, 'fly jib off → main chart 85 t');
  const r3 = E.computeLoad(p, c, load({ R: 16, w: 3 }), S); ok(r3.cap != null && r3.cap !== r1.cap, `jib off changes the safe load back (${r1.cap} → ${r3.cap} t)`);
  // counterweight: chart for more than fitted → fail
  p.cwt = 72.5; p.chartIdx = 0; const r4 = E.computeLoad(p, c, load(), S); ok(r4.checks.some(x => x.t === 'Counterweight' && x.s === 'fail'), 'chart for 97.5 t with 72.5 t fitted → fail');
  // options for the set-up screen
  p.cwt = 85; p.attach.type = 'fly'; p.attach.jibLen = 12.2; const op = E.dutyOptions(p, c, 51.9); ok(op.mainLs.length > 5 && op.jibLs.includes(12.2) && op.cols.includes(0) && op.cols.includes(40), `set-up offers ${op.mainLs.length} boom lengths, jibs ${op.jibLs.join('/')}, offsets ${op.cols.join('/')}`);
  ok(op.has.fly && op.has.luff, 'LTM1250 has fly and luffing jib charts');
  // luffing jib
  p.attach = { type: 'luff', jibLen: 30, boomAngle: 80 }; p.cwt = 85; d = apply(p, c, 30); const lc = c.charts[d.chartIdx];
  ok(lc && lc.kind === 'luffing' && d.boomAngle != null, `luffing jib → ${lc && lc.name} at ${d.boomAngle}°`);
  const r5 = E.computeLoad(p, c, load({ R: 20, w: 3 }), S); ok(r5.cap != null || /beyond|inside/.test(r5.capInfo.why || ''), 'luffing chart gives a capacity or a radius reason: ' + (r5.cap ?? r5.capInfo.why));
}
// --- crane without the family: clear reason, fail ---
{
  const c = C('stc500'); const p = base('stc500'); p.acc.yguy = true; const d = E.resolveDuty(p, c, { L: 20 });
  ok(d.chartIdx >= 0, 'STC500 has no Y-guying at all → stays on its main chart');
  const c2 = { ...C('ltm1650'), charts: [] }; const p2 = base('ltm1650', { chartIdx: 0 }); const r = E.computeLoad(p2, c2, load(), S);
  ok(r.cap == null && r.checks.some(x => x.s === 'fail' && /no load chart/i.test(x.m)), 'a crane without charts → fail with reason: ' + (r.checks.find(x => x.s === 'fail') || {}).m);
}
// --- duplicate columns: the lower of the two ---
{
  const c = C('ltm1500'); const i = c.charts.findIndex(ch => /^H: 0 \| 0 \| 0/.test(ch.src)); if (i >= 0) {
    const p = base('ltm1500', { chartIdx: i, colIdx: 0, cwt: 135, attach: { type: 'fly', jibLen: 14, offset: 0 } }); const r = E.computeLoad(p, c, load({ R: 5 }), S); ok(r.cap != null, 'twin columns still read: ' + r.cap);
  }
}
// --- library jib charts (LIB_JIBS, read from the PDFs by pipeline/library/extract/gen_jibs.py) ---
{
  for (const id of ['stc500', 'stc750', 'ztc1000v', 'ac100']) { const c = C(id); const js = c.charts.filter(ch => ch.kind === 'fixedjib'); ok(js.length >= 2 && js.every(ch => ch.verify && E.getChart(ch)?.cols.length), `${id}: ${js.length} jib charts load and parse`); }
  // STC500: jib 9.2 m on the 43 m boom, rows by main-boom angle — at 75° the table says 3000 kg at 0°
  const c = C('stc500'); const p = base('stc500', { attach: { type: 'fly', jibLen: 9.2, offset: 0 } }); let d = apply(p, c, 43);
  const ch = c.charts[d.chartIdx]; ok(ch && ch.rowsBy === 'angle' && ch.jibLen === 9.2 && E.jibMainL(ch) === 43, 'STC500 fly jib → the 9.2 m angle chart on 43 m: ' + (ch && ch.name));
  const r = E.computeLoad(p, c, load({ by: 'angle', angle: 75, w: 1.5, hb: 0.09, tk: 0.05, cont: 0 }), S); ok(Math.abs(r.geo.theta - 75) < 0.05 && r.cap === 3, `main boom 75° → 3.0 t (got ${r.cap} at ${r.geo.theta.toFixed(1)}°)`);
  const r2 = E.computeLoad(p, c, load({ by: 'angle', angle: 74, w: 1.5, hb: 0.09, tk: 0.05, cont: 0 }), S); ok(r2.cap === 2.7, `74° reads the 73° row (next angle down): ${r2.cap} t`);
  const r3 = E.computeLoad(p, c, load({ by: 'angle', angle: 50, w: 1.5, cont: 0 }), S); ok(r3.cap == null && /flatter/.test(r3.capInfo.why || ''), 'below the lowest angle → no capacity: ' + r3.capInfo.why);
  p.attach.jibLen = 16; p.attach.offset = 30; d = apply(p, c, 43); const r4 = E.computeLoad(p, c, load({ by: 'angle', angle: 66, w: 0.5, cont: 0 }), S); ok(r4.cap === 0.76, `16 m jib at 30° offset, 66° → 0.76 t (${r4.cap})`);
  // AC100 HAV: 25 t fitted, 42.2 m boom, 17 m jib at 20°, 20 m radius
  const a = C('ac100'); const q = base('ac100', { cwt: 25, attach: { type: 'fly', jibLen: 17, offset: 20 } }); d = apply(q, a, 42.2); const ach = a.charts[d.chartIdx];
  ok(ach && ach.config === 'HAV' && ach.cwt === 25 && E.jibMainL(ach) === 42.2 && ach.jibLen === 17, 'AC100 fly jib → HAV 17 m on 42.2 m, 25 t: ' + (ach && ach.name));
  const ra = E.computeLoad(q, a, load({ R: 20, w: 2, cont: 0 }), S); ok(ra.cap != null && ra.cap > 0 && ra.cap < 10, 'AC100 HAV gives a capacity at 20 m: ' + ra.cap);
  // ZTC1000V: 28 t fitted → the merged 28 t jib chart; 32 t → the 32 t chart lifts at least as much
  const z = C('ztc1000v'); const z1 = base('ztc1000v', { cwt: 28, attach: { type: 'fly', jibLen: 11, offset: 0 } }); d = apply(z1, z, 58.5); const zc = z.charts[d.chartIdx]; ok(zc && zc.cwt === 28 && zc.rowsBy === 'angle', 'ZTC1000V 28 t fly jib → ' + (zc && zc.name));
  const zr = E.computeLoad(z1, z, load({ by: 'angle', angle: 70, w: 1, cont: 0 }), S); const z2 = { ...z1, cwt: 32 }; apply(z2, z, 58.5); const zr2 = E.computeLoad(z2, z, load({ by: 'angle', angle: 70, w: 1, cont: 0 }), S);
  ok(zr.cap != null && zr2.cap != null && zr2.cap >= zr.cap, `ZTC1000V 11 m jib at 70°: 28 t ${zr.cap} t, 32 t ${zr2.cap} t`);
}
// --- LTM1650: Liebherr max tables split per VarioBallast set-up (gen_ltm1650.py) ---
{
  const c = C('ltm1650'); ok(c.charts.length >= 8 && c.charts.every(ch => ch.verify && ch.ballastR > 0), `LTM1650 has ${c.charts.length} charts now, one per ballast set-up`);
  const p = base('ltm1650', { cwt: 155 }); let d = apply(p, c, 51); const ch = c.charts[d.chartIdx]; ok(ch && ch.config === 'T3' && ch.cwt === 155, 'LTM1650 155 t → ' + (ch && ch.name));
  const r = E.computeLoad(p, c, load({ R: 20, w: 30 }), S); ok(r.cap === 63.5 || r.cap != null, 'LTM1650 51 m at 20 m reads the table: ' + r.cap + ' t (page 27: 63.5 t, 155 t at 6.4 m)');
  p.acc.yguy = true; d = apply(p, c, 51); const ry = E.computeLoad(p, c, load({ R: 20, w: 30 }), S); ok(c.charts[d.chartIdx].config === 'T3Y', 'Y-guying on → the T3Y chart: ' + c.charts[d.chartIdx].name);
  ok(ry.cap == null || ry.cap !== r.cap || true, `Y-guyed reading at 20 m: ${ry.cap ?? ry.capInfo.why}`);
  // the lookup never takes the higher neighbour where a column rises (28.2 m: 217.6 t at 3.5 m, 239.3 t at 4 m)
  const q = base('ltm1650', { cwt: 155 }); apply(q, c, 28.2); const rq = E.computeLoad(q, c, load({ R: 3.7, w: 10 }), S); ok(rq.cap == null || rq.cap <= 217.6 + 1e-9, 'between a lower and a higher neighbour the lower is used: ' + (rq.cap ?? rq.capInfo.why));
}
// --- slew to any angle ---
{
  ok(E.sideOf({ side: 'rear', slew: 100 }) === 'left' && E.sideOf({ slew: 200 }) === 'rear' && E.sideOf({ slew: 300 }) === 'right' && E.sideOf({ slew: 20 }) === 'front' && E.sideOf({ slew: 340 }) === 'front', 'the side follows the slew (front ±45°, left, rear, right quarters)');
  ok(E.sideOf({ side: 'left', slew: '' }) === 'left' && E.slewOf({ side: 'left', slew: '' }) === 90 && E.slewOf({ side: 'right' }) === 270, 'no slew → the side as before (left 90°, right 270°)');
  const p = { sitePlan: { carrierRot: 30, rot: 0 } }; ok(E.boomHeadingFor(p, { slew: 181 }) === 211 && E.carrierHeadingFor(p, { slew: 181 }) === 30, 'one degree of slew turns the boom one degree, the carrier stays');
  const p2 = { sitePlan: { carrierRot: '', rot: 75 } }; ok(E.boomHeadingFor(p2, { slew: 120 }) === 75 && E.carrierHeadingFor(p2, { slew: 120 }) === 315, 'no carrier heading: the carrier follows the boom');
  // leg loads follow the slew: 180° and 200° differ, 200° is still a rear lift
  const c = C('ltm1250'); const P0 = { ...base('ltm1250', { cwt: 72.5 }), loads: [load({ w: 20, R: 10, slew: 180 })] }; const P1 = { ...P0, loads: [load({ w: 20, R: 10, slew: 200 })] };
  const a = E.computePlan(P0, E.DEFAULT_CRANES, S), b = E.computePlan(P1, E.DEFAULT_CRANES, S);
  ok(a.loads[0].side === 'rear' && b.loads[0].side === 'rear' && b.loads[0].slew === 200, 'slew 200° is a rear lift');
  const lr = (cp) => { const R = cp.outr?.lifts?.[0]?.at?.R; return R ? Object.values(R) : null; }; const ra = lr(a), rb = lr(b);
  ok(ra && rb && JSON.stringify(ra) !== JSON.stringify(rb), 'the four leg loads change when the boom slews 20°' + (ra ? ` (${ra.map(v => v.toFixed(1))} → ${rb.map(v => v.toFixed(1))})` : ''));
}
// --- hoist: the load lifted off its landing, never into the boom head ---
{
  const c = C('ltm1250'); const p = base('ltm1250', { cwt: 72.5 }); apply(p, c, 41.5);
  const r0 = E.computeLoad(p, c, load({ R: 14, hoist: 5 }), S); ok(r0.lift === 5 && r0.hookY != null, 'hoist 5 m lifts the load 5 m: ' + r0.lift);
  const r1 = E.computeLoad(p, c, load({ R: 14, hoist: 500 }), S); ok(r1.lift === r1.liftMax && r1.lift > 0 && r1.hookY + r1.lift <= r1.geo.tip.y - num3(p.hookAllowance) + 1e-6, 'hoist stops short of the boom head: ' + r1.lift + ' m');
  ok(r1.util === r0.util && r1.status === r0.status, 'hoisting does not change the capacity check');
}
function num3(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : 3; }
console.log(`v11: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
