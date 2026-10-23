// Unit asserts for the lift-side feature (left / right / rear / front): engine helpers, chart sectors, headings, the v6 plan migration, the front-lift check,
// the outrigger slew angle and the drawings. Loads the modules straight from src/ — no browser, no dist build.   node test_side.js   (exits non-zero on any failure)
const fs = require('fs'), vm = require('vm');
const strip = s => s.replace(/\nif \(typeof module[\s\S]*$/, '\n');
const FILES = ['gen/assets', 'src/data', 'src/library', 'src/engine', 'src/duty', 'src/outrig', 'src/draw', 'src/rigging', 'src/crane2d', 'src/fixes', 'src/samples', 'src/app'].filter(f => fs.existsSync(f + '.js'));
const code = FILES.map(f => strip(fs.readFileSync(f + '.js', 'utf8'))).join('\n') + `
this.X = { DEFAULT_CRANES, DEFAULT_SETTINGS, SAMPLE_PLANS, IMPORTED_CHARTS, CRANE_DRAWINGS, blankPlan, normalizePlan, computePlan, buildSheet, toSVG, Prims, drawElevation, drawSitePlan,
  sideOf, chartCoversSide, chartSectorsOf, chartSectorLabel, bestChartForSide, boomHeadingFor, carrierHeadingFor, sideFromHeadings, normDeg, degDiff, SIDE_OFFSET, SIDE_NAME, LIFT_SIDES,
  sitePlanState, liftBodyCrane, inferChartSectors, computeLoad, findCranes, OUT_SLEW, SIDE_WORD, outAt, outTipHook, outSweep, outPads, outExtOf, outMassModel, CRANE_DRAWINGS, DRAWING_ALIAS };`;
const ctx = { console, window: {}, localStorage: { getItem() { return null; }, setItem() {} } }; vm.createContext(ctx); vm.runInContext(code, ctx);
const X = ctx.X; const clone = (o) => JSON.parse(JSON.stringify(o));

let fails = 0, passes = 0;
const eq = (a, b, msg) => { const A = JSON.stringify(a), B = JSON.stringify(b); if (A === B) passes++; else { fails++; console.log(`FAIL ${msg}\n   got  ${A}\n   want ${B}`); } };
const ok = (c, msg) => { if (c) passes++; else { fails++; console.log('FAIL ' + msg); } };
const near = (a, b, msg, tol = 1e-6) => ok(Math.abs(a - b) <= tol, `${msg} (got ${a}, want ${b})`);
const crane = (id) => clone(X.DEFAULT_CRANES.find(c => c.id === id));
const stub = (name, sectors, kind = 'main') => ({ name, kind, sectors, src: 'H: 10\n5: 1' });

// ---------- sideOf: left / right / rear / front, anything else is rear ----------
eq(['left', 'right', 'rear', 'front'].map(s => X.sideOf({ side: s })), ['left', 'right', 'rear', 'front'], 'sideOf passes valid sides');
eq([undefined, null, {}, { side: '' }, { side: 7 }, { side: 'top' }].map(l => X.sideOf(l)), Array(6).fill('rear'), 'sideOf: missing / invalid -> rear');
eq(['front', 'FRONT', ' front'.trim()].map(s => X.sideOf({ side: s })), ['front', 'front', 'front'], 'sideOf: front is a lift side (case-insensitive)');
eq(X.sideOf('front'), 'front', 'sideOf also takes the side name itself');
eq(X.sideOf({ side: 'LEFT' }), 'left', 'sideOf is case-insensitive');
ok(X.LIFT_SIDES.includes('front') && X.LIFT_SIDES.length === 4, 'front is a lift side');
eq([X.SIDE_OFFSET.front, X.SIDE_NAME.front, X.SIDE_WORD.front], [0, 'FRONT', 'front'], 'front: boom heading = carrier heading, names');

// ---------- charts: sectors, chartCoversSide ----------
ok(X.DEFAULT_CRANES.every(c => (c.charts || []).every(ch => Array.isArray(ch.sectors) && ch.sectors.length)), 'every built-in chart is tagged with sectors');
ok(Object.values(X.IMPORTED_CHARTS).every(a => a.every(ch => Array.isArray(ch.sectors))), 'every imported Liebherr chart is tagged with sectors');
eq(crane('ztc1000v').charts[0].sectors, ['rear', 'side'], 'ZTC1000V "over rear & sides" -> [rear, side]');
eq(crane('ltm1250').charts[0].sectors, ['360'], 'LTM1250 360° chart -> [360]');
eq(crane('ac700').charts[0].sectors, ['360'], 'AC700 (source mentions over-rear values REMOVED) is still 360°');
const z = crane('ztc1000v').charts[0];
eq(['rear', 'left', 'right'].map(s => X.chartCoversSide(z, s)), [true, true, true], 'ZTC1000V covers rear + both sides');
eq(['rear', 'left', 'right'].map(s => X.chartCoversSide(stub('a', ['rear']), s)), [true, false, false], 'rear-only chart');
eq(['rear', 'left', 'right'].map(s => X.chartCoversSide(stub('a', ['side']), s)), [false, true, true], 'side-only chart');
eq(['rear', 'left', 'right'].map(s => X.chartCoversSide(stub('a', ['360']), s)), [true, true, true], '360 chart');
eq(['rear', 'left', 'right'].map(s => X.chartCoversSide({ name: 'No sector info', src: '' }, s)), [true, true, true], 'unknown chart defaults to 360');
eq(['rear', 'left', 'right'].map(s => X.chartCoversSide({ name: 'Main boom · over rear only', src: '' }, s)), [true, false, false], 'name says "over rear only" (inferred)');
eq(['rear', 'left', 'right'].map(s => X.chartCoversSide({ name: 'Main boom · over sides', src: '' }, s)), [false, true, true], 'name says "over sides" (inferred)');
eq(['rear', 'left', 'right'].map(s => X.chartCoversSide({ name: 'Main boom 360°', source: 'over rear only', src: '' }, s)), [true, true, true], '360° in the name wins');
eq(['rear', 'left', 'right'].map(s => X.chartCoversSide({ name: 'x', sector: 'rear', src: '' }, s)), [true, false, false], 'singular chart.sector = rear');
ok(X.chartCoversSide(null, 'left') && X.chartCoversSide(undefined, 'rear'), 'no chart (manual capacity) never blocks');
ok(X.chartCoversSide(stub('a', ['rear']), 'bogus') === true, 'an unknown side string is treated as rear');
// the front: only a 360° chart (or one that says front) covers it; 'rear' and 'side' charts do not
eq(['front', 'rear', 'left', 'right'].map(s => X.chartCoversSide(stub('a', ['360']), s)), [true, true, true, true], '360 chart covers the front');
eq(['front', 'rear', 'left', 'right'].map(s => X.chartCoversSide(stub('a', ['rear']), s)), [false, true, false, false], 'rear-only chart does not cover the front');
eq(['front', 'rear', 'left', 'right'].map(s => X.chartCoversSide(stub('a', ['side']), s)), [false, false, true, true], 'side-only chart does not cover the front');
eq(['front', 'rear', 'left', 'right'].map(s => X.chartCoversSide(stub('a', ['rear', 'side']), s)), [false, true, true, true], 'rear + side chart does not cover the front');
eq(['front', 'rear', 'left', 'right'].map(s => X.chartCoversSide(stub('a', ['front']), s)), [true, false, false, false], 'a chart that says front covers the front only');
eq(['front', 'rear'].map(s => X.chartCoversSide({ name: 'Main boom · over front only', src: '' }, s)), [true, false], 'name says "over front only" (inferred)');
eq(['front', 'rear'].map(s => X.chartCoversSide({ name: 'Main boom 360° (front allowed)', src: '' }, s)), [true, true], '360° in the name still wins over the word front');
eq(['front', 'rear', 'left'].map(s => X.chartCoversSide({ name: 'x', sector: 'front rear', src: '' }, s)), [true, true, false], 'singular chart.sector = "front rear"');
ok(X.CRANE_DRAWINGS && X.DEFAULT_CRANES.filter(c => c.charts.some(ch => X.chartCoversSide(ch, 'front'))).length > 0, 'some built-in charts cover the front (360° ones)');
eq(X.chartCoversSide(crane('ztc1000v').charts[0], 'front'), false, 'ZTC1000V "over rear & sides" chart does not cover the front');
eq(X.chartSectorLabel(stub('a', ['front'])), 'over the front only', 'label: front only');
eq(X.chartSectorLabel(stub('a', ['front', 'rear'])), 'over the front and rear', 'label: front + rear');
eq(X.chartSectorLabel(stub('a', ['rear', 'side'])), 'over the rear and sides', 'label: rear + sides');
eq(X.chartSectorLabel(stub('a', ['rear'])), 'over the rear only', 'label: rear only');

// ---------- bestChartForSide ----------
const fake = { charts: [stub('rear only', ['rear']), stub('jib', ['360'], 'fixedjib'), stub('all round', ['360']), stub('sides', ['side'])] };
eq(X.bestChartForSide(fake, 'rear', 0), 0, 'current chart kept when it covers the side');
eq(X.bestChartForSide(fake, 'left', 0), 2, 'first MAIN chart that covers the side (jib chart skipped)');
eq(X.bestChartForSide(fake, 'right', 2), 2, 'current all-round chart kept');
eq(X.bestChartForSide(fake, 'rear', 3), 0, 'sides-only chart -> first main chart covering the rear');
eq(X.bestChartForSide({ charts: [stub('r', ['rear']), stub('j', ['360'], 'luffing')] }, 'left', 0), 1, 'no main chart covers it -> any chart that does');
eq(X.bestChartForSide({ charts: [stub('r', ['rear'])] }, 'left', 0), 0, 'nothing covers the side -> index unchanged (computeLoad flags it)');
eq(X.bestChartForSide(fake, 'left', -1), -1, 'manual capacity (-1) is left alone');
eq(X.bestChartForSide({ charts: [] }, 'left', 0), 0, 'crane without charts');
eq(X.bestChartForSide(fake, 'left', undefined), 2, 'undefined index counts as 0');
eq(X.bestChartForSide(crane('ztc1000v'), 'left', 0), 0, 'ZTC1000V left stays on its only chart');
eq(X.bestChartForSide(fake, 'front', 0), 2, 'front: first MAIN chart that covers the front (a 360° one)');
eq(X.bestChartForSide(fake, 'front', 2), 2, 'front: current 360° chart kept');
eq(X.bestChartForSide({ charts: [stub('r', ['rear']), stub('s', ['side'])] }, 'front', 0), 0, 'front: nothing covers it -> index unchanged (computeLoad flags it)');

// ---------- computeLoad: the side check ----------
const base = () => { const p = X.normalizePlan(X.SAMPLE_PLANS[2].make()); return p; };   // EMCC: ZTC1000V (rear & sides chart)
{
  const p = base(); const cr = crane('ztc1000v'); cr.charts[0].sectors = ['rear'];
  for (const [side, okay] of [['rear', true], ['left', false], ['right', false]]) {
    p.loads[0].side = side; const calc = X.computePlan(p, [cr], X.DEFAULT_SETTINGS); const r = calc.loads[0];
    eq([r.side, r.sideOk], [side, okay], `computeLoad(${side}) with a rear-only chart: side + sideOk`);
    const f = r.checks.filter(c => c.s === 'fail' && /Chart does not cover lifting over the/.test(c.m));
    eq(f.length, okay ? 0 : 1, `computeLoad(${side}): fail check present only when not covered`);
    if (!okay) { ok(f[0].m.includes(`Chart does not cover lifting over the ${side} side`), 'check message names the side: ' + f[0].m); ok(calc.status === 'fail' && r.status === 'fail', 'status is fail when the chart does not cover the side'); }
  }
  p.loads[0].side = 'left'; p.loads[0].capOverride = 50; const r2 = X.computePlan(p, [cr], X.DEFAULT_SETTINGS).loads[0];
  eq(r2.sideOk, true, 'hand-entered capacity: the chart is not used, so no side failure');
  const p3 = base(); p3.loads[0].side = 'left'; const r3 = X.computePlan(p3, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS).loads[0];
  eq([r3.sideOk, r3.checks.some(c => /does not cover/.test(c.m))], [true, false], 'the real ZTC1000V chart covers a left lift');
  const p4 = X.normalizePlan(X.SAMPLE_PLANS[0].make()); p4.loads[0].side = 'right'; const r4 = X.computePlan(p4, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS).loads[0];
  eq(r4.sideOk, true, '360° Liebherr chart covers a right lift');
  const crR = clone(cr); crR.charts.forEach(ch => { ch.sectors = ['rear']; }); // the fleet may carry more than one chart per crane: all of them rear-only
  const rf = X.findCranes({ w: 3, R: 20, h: 2, rigH: 3, side: 'left', hookAllowance: 3, site: { obstacles: [] } }, [crR], X.DEFAULT_SETTINGS);
  ok(rf.length > 0 && rf.every(o => !o.ok && o.fails.some(f => /does not cover/.test(f.m))), 'findCranes: a rear-only chart is not offered for a left lift');
}

// ---------- computeLoad: the front-lift check ----------
{
  const front = (cr, mod) => { const p = base(); p.loads[0].side = 'front'; if (mod) mod(p); const calc = X.computePlan(p, [cr], X.DEFAULT_SETTINGS); return calc.loads[0]; };
  const sideChecks = (r) => r.checks.filter(c => c.t === 'Lift side');
  // all-terrain with a 360° chart: allowed, one info line, nothing to worry about
  const at = crane('ltm1250'); const r1 = (() => { const p = X.normalizePlan(X.SAMPLE_PLANS[0].make()); p.loads[0].side = 'front'; return X.computePlan(p, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS).loads[0]; })();
  eq([r1.side, r1.sideOk], ['front', true], 'all-terrain, 360° chart: front lift is allowed');
  eq(sideChecks(r1).map(c => c.s), ['info'], 'all-terrain, 360° chart: one info check on a front lift');
  ok(/Over the front/.test(sideChecks(r1)[0].m) && /360/.test(sideChecks(r1)[0].m), 'info check says the 360° chart covers the front: ' + sideChecks(r1)[0].m);
  // a rear lift gets no such line
  const rr = (() => { const p = X.normalizePlan(X.SAMPLE_PLANS[0].make()); return X.computePlan(p, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS).loads[0]; })();
  eq(sideChecks(rr).length, 0, 'a rear lift has no lift-side check');
  // truck crane: warn (front jack / lower front capacity) even though the chart covers it
  const tc = crane('ztc1000v'); tc.charts[0].sectors = ['360'];
  const r2t = front(tc);
  eq([r2t.sideOk, sideChecks(r2t).map(c => c.s)], [true, ['warn']], 'truck crane, 360° chart: front lift gets a warning');
  ok(/check the maker allows it/.test(sideChecks(r2t)[0].m) && /front jack/.test(sideChecks(r2t)[0].m) && /lower front capacity/.test(sideChecks(r2t)[0].m), 'truck warning text: ' + sideChecks(r2t)[0].m);
  ok(r2t.status !== 'ok' && r2t.checks.some(c => c.t === 'Lift side' && c.s === 'warn'), 'the warning shows in the lift status');
  // chart that does not cover the front: FAIL (and the truck warning as well)
  const tc2 = crane('ztc1000v'); const r3 = front(tc2);
  eq(r3.sideOk, false, 'truck crane, rear + side chart: front lift fails');
  ok(sideChecks(r3).some(c => c.s === 'fail' && /Chart does not cover lifting over the front/.test(c.m)), 'FAIL message names the front: ' + sideChecks(r3).map(c => c.m).join(' | '));
  ok(r3.status === 'fail', 'status fail');
  // all-terrain with a rear-only chart: FAIL, no "allowed" info
  const at2 = crane('ltm1250'); at2.charts[0].sectors = ['rear'];
  const r4 = front(at2, (p) => { p.craneId = 'ltm1250'; p.chartIdx = 0; });
  eq([r4.sideOk, sideChecks(r4).map(c => c.s)], [false, ['fail']], 'all-terrain, rear-only chart: front fails and there is no "allowed" info');
  // a hand-typed capacity: the chart is not used, so the line asks the planner to check the front figure
  const r5 = front(crane('ltm1250'), (p) => { p.loads[0].capOverride = 50; p.craneId = 'ltm1250'; });
  eq(sideChecks(r5).map(c => c.s), ['info'], 'hand-typed capacity: info only');
  ok(/typed by hand/.test(sideChecks(r5)[0].m), 'hand-typed capacity: the line says so');
  // findCranes does not offer a rear-only crane for a front lift
  const crZ = crane('ztc1000v'); crZ.charts.forEach(ch => { ch.sectors = ['rear', 'side']; });
  const rf = X.findCranes({ w: 3, R: 20, h: 2, rigH: 3, side: 'front', hookAllowance: 3, site: { obstacles: [] } }, [crZ], X.DEFAULT_SETTINGS);
  ok(rf.length > 0 && rf.every(o => !o.ok && o.fails.some(f => /does not cover/.test(f.m))), 'findCranes: a rear + side chart is not offered for a front lift');
}

// ---------- outriggers: the front is slew angle 0 (boom over the cab), the sweep covers it ----------
{
  eq([X.OUT_SLEW.front, X.OUT_SLEW.left, X.OUT_SLEW.rear, X.OUT_SLEW.right], [0, 90, 180, 270], 'outrigger slew angle per side (front = 0)');
  const lift = (side) => { const p = X.normalizePlan(X.SAMPLE_PLANS[0].make()); p.loads[0].side = side; p.outrigger = { ...(p.outrigger || {}), enabled: true }; const c = X.computePlan(p, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS); return c; };
  const cf = lift('front'), cr = lift('rear'); const Lf = cf.outr?.lifts?.[0], Lr = cr.outr?.lifts?.[0];
  ok(!!Lf && !!Lr, 'outrigger result present for front and rear lifts');
  if (Lf && Lr) {
    eq([Lf.side, Lf.theta, Lr.theta], ['front', 0, 180], 'front lift: leg model uses slew angle 0');
    // boom over the cab puts the load on the FRONT legs; over the rear it is the rear legs
    const fr = Math.max(Lf.at.R.FR, Lf.at.R.FL), rr2 = Math.max(Lf.at.R.RL, Lf.at.R.RR);
    ok(fr > rr2, `front lift: the front legs carry more than the rear legs (${fr.toFixed(1)} vs ${rr2.toFixed(1)} t)`);
    const fr2 = Math.max(Lr.at.R.FR, Lr.at.R.FL), rr3 = Math.max(Lr.at.R.RL, Lr.at.R.RR);
    ok(rr3 > fr2, `rear lift: the rear legs carry more (${rr3.toFixed(1)} vs ${fr2.toFixed(1)} t)`);
    // symmetric about the centre line: left and right legs share a front lift
    near(Lf.at.R.FR, Lf.at.R.FL, 'front lift: front legs equal (symmetric carrier)', 1e-6); near(Lf.at.R.RL, Lf.at.R.RR, 'front lift: rear legs equal', 1e-6);
    // the 360° sweep passes through the front: the biggest leg load over a full turn is at least the front-lift value
    cf.outr.sweepMax && ['FR', 'FL', 'RL', 'RR'].forEach(id => ok(cf.outr.sweepMax[id].v >= Lf.at.R[id] - 1e-6, `360° sweep covers the front lift (${id})`));
    ok(Number.isFinite(Lf.tip) ? Lf.tip > 0 : true, 'tipping load over the front is a positive number (or never)');
    ok(cf.loads[0].checks.some(c => c.t === 'Leg loads' && /over the front/.test(c.m)), 'leg-load check says "over the front": ' + cf.loads[0].checks.filter(c => c.t === 'Leg loads').map(c => c.m).join(' | '));
  }
}

// ---------- headings: carrier faces carrierHeading; boom = carrier + 180 / +90 / -90 ----------
{
  const P = (rot, carrierRot) => ({ sitePlan: { rot, carrierRot } });
  const L = (side) => ({ side });
  eq(['rear', 'left', 'right'].map(s => X.boomHeadingFor(P(0, 90), L(s))), [270, 180, 0], 'boomHeadingFor with carrierRot 90 (cab faces north)');
  eq([X.boomHeadingFor(P(0, 90), L('front')), X.boomHeadingFor(P(0, 0), L('front')), X.boomHeadingFor(P(0, -30), L('front'))], [90, 0, 330], 'front: the boom points the way the cab faces');
  eq([X.carrierHeadingFor(P(35, ''), L('front')), X.boomHeadingFor(P(35, ''), L('front')), X.carrierHeadingFor(P(0, 90), L('front'))], [35, 35, 90], 'front, carrierRot empty: the carrier follows the boom (same heading)');
  eq(X.carrierHeadingFor(P(-30, ''), L('front')), 330, 'front: headings are normalised');
  eq(['rear', 'left', 'right'].map(s => X.boomHeadingFor(P(0, 0), L(s))), [180, 90, 270], 'carrier facing east: rear = west, left = NORTH (driver\'s left), right = south');
  eq(['rear', 'left', 'right'].map(s => X.carrierHeadingFor(P(0, 90), L(s))), [90, 90, 90], 'carrierRot set: carrier heading is carrierRot');
  eq(['rear', 'left', 'right'].map(s => X.boomHeadingFor(P(35, ''), L(s))), [35, 35, 35], 'carrierRot empty: the boom keeps sitePlan.rot');
  eq(['rear', 'left', 'right'].map(s => X.carrierHeadingFor(P(35, ''), L(s))), [215, 305, 125], 'carrierRot empty: the carrier follows (rot - offset)');
  eq(['rear', 'left', 'right'].map(s => X.carrierHeadingFor(P(35, null), L(s))), [215, 305, 125], 'carrierRot null behaves like empty');
  eq(X.boomHeadingFor(P(-30, ''), L('rear')), 330, 'headings are normalised to 0..360');
  eq(X.boomHeadingFor(P(0, -90), L('left')), 0, 'negative carrierRot');
  eq(X.boomHeadingFor(P(5, 10), {}), 190, 'a load without side counts as rear');
  eq(X.boomHeadingFor({}, L('left')), 0, 'plan without sitePlan');
  eq(X.boomHeadingFor(P(5, '12'), L('left')), 102, 'carrierRot given as a string');
  for (const s of X.LIFT_SIDES) for (const cr of [0, 33, 200, 359]) near(X.degDiff(X.boomHeadingFor(P(0, cr), L(s)), X.carrierHeadingFor(P(0, cr), L(s))), X.degDiff(X.SIDE_OFFSET[s], 0), `boom - carrier = offset (${s}, ${cr})`);
  const sp = X.sitePlanState({ sitePlan: { enabled: true, cx: 4, cy: 5, rot: 35, carrierRot: '' }, loads: [L('left'), L('right')], activeLoad: 1 });
  eq([sp.cx, sp.cy, sp.side, sp.boom, sp.carrier], [4, 5, 'right', 35, 125], 'sitePlanState: headings follow the active load\'s side');
  const sp3 = X.sitePlanState({ sitePlan: { rot: 35, carrierRot: 100 }, loads: [L('front')], activeLoad: 0 });
  eq([sp3.side, sp3.boom, sp3.carrier], ['front', 100, 100], 'sitePlanState: front lift, boom = carrier heading');
  const sp2 = X.sitePlanState({ sitePlan: { rot: 35, carrierRot: '' }, loads: [L('left'), L('right')], activeLoad: 0 }, { side: 'rear' });
  eq([sp2.side, sp2.boom, sp2.carrier], ['rear', 35, 215], 'sitePlanState(plan, load) uses the given load');
}

// ---------- normalizePlan: new plans and the v6 migration ----------
{
  eq(X.blankPlan().loads[0].side, 'rear', 'blankPlan: new loads default to rear');
  ok(X.SAMPLE_PLANS.every(s => X.normalizePlan(s.make()).loads.every(l => l.side === 'rear')), 'all sample plans load with side = rear');
  const old = (sp, loads) => { const p = X.blankPlan(); delete p.sitePlan; p.loads = loads || [{ name: 'x', w: 5, R: 12 }]; if (sp) p.sitePlan = sp; return p; };
  let n = X.normalizePlan(old()); eq(n.loads.map(l => l.side), ['rear'], 'v6 plan without sitePlan -> rear');
  n = X.normalizePlan(old({ enabled: true, cx: 0, cy: 0, rot: 35, carrierRot: '' })); eq([n.loads[0].side, n.sitePlan.carrierRot, X.boomHeadingFor(n, n.loads[0])], ['rear', '', 35], 'carrierRot empty (boom over the front in v6) -> rear, boom heading kept');
  n = X.normalizePlan(old({ rot: 35, carrierRot: 35 })); eq([n.loads[0].side, X.boomHeadingFor(n, n.loads[0])], ['rear', 35], 'carrierRot = rot -> rear');
  // v6 drew the cab at the -u end, i.e. facing carrierRot + 180: boom 90 deg from carrierRot
  n = X.normalizePlan(old({ rot: 90, carrierRot: 0 })); eq([n.loads[0].side, X.boomHeadingFor(n, n.loads[0]), n.sitePlan.carrierRot], ['right', 90, 180], 'rot 90 / carrier 0: cab faced west, boom north = right; boom heading kept, carrier = rot + 90');
  n = X.normalizePlan(old({ rot: 0, carrierRot: 90 })); eq([n.loads[0].side, X.boomHeadingFor(n, n.loads[0]), n.sitePlan.carrierRot], ['left', 0, 270], 'rot 0 / carrier 90: cab faced south, boom east = left');
  n = X.normalizePlan(old({ rot: 100, carrierRot: 10 })); eq([n.loads[0].side, X.boomHeadingFor(n, n.loads[0])], ['right', 100], 'nearest side (90 deg +/- 10), boom heading exactly kept');
  n = X.normalizePlan(old({ rot: 0, carrierRot: 180 })); eq([n.loads[0].side, X.boomHeadingFor(n, n.loads[0]), n.sitePlan.carrierRot], ['front', 0, 0], 'boom over the cab (front) -> front, boom heading kept, carrier = boom heading');
  n = X.normalizePlan(old({ rot: 0, carrierRot: 160 })); eq([n.loads[0].side, X.boomHeadingFor(n, n.loads[0])], ['front', 0], 'nearly front -> front');
  n = X.normalizePlan(old({ rot: 0, carrierRot: 120 })); eq(n.loads[0].side, 'left', '60 deg off the way the cab faced is a side lift, not a front lift');
  eq([[0, 180], [40, 180], [-40, 180], [44, 180], [180, 180], [0, 0], [50, 180]].map(([b, c]) => X.sideFromHeadings(b, c)), ['front', 'front', 'front', 'front', 'rear', 'rear', 'left'], 'sideFromHeadings: within 45 deg of the cab direction = front; opposite = rear');
  n = X.normalizePlan(old({ rot: 50, carrierRot: 0 }, [{ w: 1 }, { w: 2 }])); eq(n.loads.map(l => l.side), ['right', 'right'], 'every load of a v6 plan gets the derived side');
  // idempotent and respects what is stored
  const p1 = X.normalizePlan(old({ rot: 0, carrierRot: 90 })); const p2 = X.normalizePlan(clone(p1)); eq(p2, p1, 'normalizePlan is idempotent on a migrated plan');
  const mixed = X.normalizePlan(Object.assign(X.blankPlan(), { sitePlan: { rot: 0, carrierRot: 90 }, loads: [{ w: 1, side: 'left' }, { w: 2, side: 'right' }, { w: 3, side: 'front' }, { w: 4 }] }));
  eq(mixed.loads.map(l => l.side), ['left', 'right', 'front', 'rear'], 'stored sides are kept (front too); missing -> rear; no re-migration');
  eq(mixed.sitePlan.carrierRot, 90, 'plans that already have sides keep their carrierRot');
  const allFront = X.normalizePlan(old(null, [{ w: 1, side: 'front' }])); eq(allFront.loads[0].side, 'front', 'a stored "front" survives normalizePlan');
  eq(X.normalizePlan(clone(allFront)).loads[0].side, 'front', 'front is stable through a second normalizePlan');
}

// ---------- drawings ----------
{
  const texts = (P) => P.list.filter(p => p.t === 'text').map(p => p.s);
  for (const [side, tag, row] of [['rear', 'LIFT OVER REAR', 'OVER REAR'], ['left', 'LIFT OVER LEFT', 'OVER LEFT SIDE'], ['right', 'LIFT OVER RIGHT', 'OVER RIGHT SIDE'], ['front', 'LIFT OVER FRONT', 'OVER FRONT']]) {
    const plan = X.normalizePlan(X.SAMPLE_PLANS[0].make()); plan.loads[0].side = side; plan.sitePlan = { enabled: true, cx: 0, cy: 0, rot: 35, carrierRot: '' };
    plan.chartIdx = X.bestChartForSide(crane(plan.craneId), side, plan.chartIdx);
    const calc = X.computePlan(plan, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS);
    const { P } = X.buildSheet(plan, calc, X.DEFAULT_SETTINGS); const T = texts(P);
    ok(T.includes(tag), `${side}: sheet elevation glyph says "${tag}"`);
    ok(T.includes('LIFT SIDE') && T.includes(row), `${side}: data panel row LIFT SIDE = ${row}`);
    ok(T.includes('LIFT OVER ' + X.SIDE_NAME[side]), `${side}: site plan says which side`);
    const E = new X.Prims(); X.drawElevation(E, { x: 0, y: 0, w: 300, h: 200 }, plan, calc, 0, {}); ok(texts(E).includes(tag), `${side}: drawElevation glyph`);
    const E2 = new X.Prims(); X.drawElevation(E2, { x: 0, y: 0, w: 300, h: 200 }, plan, calc, 0, { sideGlyph: false }); ok(!texts(E2).includes(tag), `${side}: glyph can be switched off`);
    const S = new X.Prims(); X.drawSitePlan(S, { x: 0, y: 0, w: 300, h: 300 }, plan, calc, {}); ok(texts(S).includes('FRONT'), `${side}: site plan marks the front of the carrier`);
    ok(X.toSVG(P).includes(tag) && !/NaN/.test(X.toSVG(P)), `${side}: SVG has the tag and no NaN`);
  }
  // the carrier is mirrored for a rear lift only where the CAD body has its cab on the boom side
  const keys0 = Object.keys(X.CRANE_DRAWINGS).length;
  const c1250 = crane('ltm1250'), c1080 = crane('ltm1080');
  const rear = X.liftBodyCrane(c1250, 'rear'), left = X.liftBodyCrane(c1250, 'left');
  eq([rear.drawing, left.drawing, left._endDeck != null, rear._endDeck], ['ltm1250~rear', 'ltm1250~side', true, undefined], 'LTM1250: rear = mirrored carrier, left = superstructure + end-on carrier');
  const maxX = (d) => Math.max(...d.body.flatMap(([, , fl]) => fl.filter((_, i) => i % 2 === 0)));
  const orig = X.CRANE_DRAWINGS.ltm1250, mir = X.CRANE_DRAWINGS['ltm1250~rear'], side = X.CRANE_DRAWINGS['ltm1250~side'];
  ok(maxX(orig) > 1000 && maxX(mir) < 700, 'mirrored body: the cab moved from +11 m to the other side of the slew centre');
  eq(mir.body.length, orig.body.length, 'mirroring keeps every item');
  ok(side.body.length < orig.body.length * 0.5 && side.body.length > 50, 'side body keeps only the superstructure');
  eq(mir.pivot, orig.pivot, 'pivot / secs untouched');
  eq(Object.keys(X.CRANE_DRAWINGS).length, keys0, 'derived drawings are not enumerable in CRANE_DRAWINGS');
  eq(X.liftBodyCrane(c1080, 'rear').drawing, c1080.drawing, 'LTM1090 body already has the cab away from the load: untouched for rear');
  ok(X.liftBodyCrane(c1080, 'right')._endDeck != null, 'LTM1090 side lift: end-on carrier');
  // front lift: the cab must face the load. LTM1250 (cab already on the boom side) is untouched; LTM1090 (cab on the far side) gets its carrier mirrored
  eq(X.liftBodyCrane(c1250, 'front').drawing, c1250.drawing, 'LTM1250 front lift: cab already faces the load -> body untouched');
  const fr1090 = X.liftBodyCrane(c1080, 'front'); eq([fr1090.drawing, fr1090._endDeck], ['ltm1090~front', undefined], 'LTM1090 front lift: carrier mirrored, not end-on');
  const o90 = X.CRANE_DRAWINGS.ltm1090, f90 = X.CRANE_DRAWINGS['ltm1090~front'];
  ok(o90.bbox[0] < -7 && f90.bbox[2] > 6 && f90.bbox[0] > -6, `mirrored body: cab moved from ${o90.bbox[0]} m to ${f90.bbox[2]} m (the boom side); the superstructure stays`);
  eq(f90.body.length, o90.body.length, 'front mirroring keeps every item'); eq(f90.pivot, o90.pivot, 'front: pivot untouched');
  eq(X.liftBodyCrane({ ...c1250, drawing: 'proc' }, 'front'), { ...c1250, drawing: 'proc' }, 'front: procedural bodies are untouched');
  eq(Object.keys(X.CRANE_DRAWINGS).includes('ltm1090~front'), false, 'front-derived drawings are not enumerable in CRANE_DRAWINGS');
  eq(X.liftBodyCrane(c1080, 'rear').drawing, c1080.drawing, 'LTM1090 rear lift still untouched');
  eq(X.liftBodyCrane({ ...c1250, drawing: 'proc' }, 'left'), { ...c1250, drawing: 'proc' }, 'procedural bodies are untouched');
  eq(X.liftBodyCrane({ ...c1250, drawing: 'unknown_body' }, 'rear').drawing, 'unknown_body', 'unlisted CAD bodies are never touched');
  // elevation extents follow the mirrored carrier (it now reaches left of the crane)
  const pl = X.normalizePlan(X.SAMPLE_PLANS[0].make()); const calc = X.computePlan(pl, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS);
  eq(calc.loads[0].side, 'rear', 'res.side exposed');
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
