// Unit asserts for the lift-side feature (left / right / rear, never front): engine helpers, chart sectors, headings, the v6 plan migration and the
// drawings. Loads the modules straight from src/ — no browser, no dist build.   node test_side.js   (exits non-zero on any failure)
const fs = require('fs'), vm = require('vm');
const strip = s => s.replace(/\nif \(typeof module[\s\S]*$/, '\n');
const FILES = ['gen/assets', 'src/data', 'src/engine', 'src/draw', 'src/crane2d', 'src/fixes', 'src/samples', 'src/app'].filter(f => fs.existsSync(f + '.js'));
const code = FILES.map(f => strip(fs.readFileSync(f + '.js', 'utf8'))).join('\n') + `
this.X = { DEFAULT_CRANES, DEFAULT_SETTINGS, SAMPLE_PLANS, IMPORTED_CHARTS, CRANE_DRAWINGS, blankPlan, normalizePlan, computePlan, buildSheet, toSVG, Prims, drawElevation, drawSitePlan,
  sideOf, chartCoversSide, chartSectorsOf, chartSectorLabel, bestChartForSide, boomHeadingFor, carrierHeadingFor, sideFromHeadings, normDeg, degDiff, SIDE_OFFSET, SIDE_NAME, LIFT_SIDES,
  sitePlanState, liftBodyCrane, inferChartSectors, computeLoad, findCranes };`;
const ctx = { console, window: {}, localStorage: { getItem() { return null; }, setItem() {} } }; vm.createContext(ctx); vm.runInContext(code, ctx);
const X = ctx.X; const clone = (o) => JSON.parse(JSON.stringify(o));

let fails = 0, passes = 0;
const eq = (a, b, msg) => { const A = JSON.stringify(a), B = JSON.stringify(b); if (A === B) passes++; else { fails++; console.log(`FAIL ${msg}\n   got  ${A}\n   want ${B}`); } };
const ok = (c, msg) => { if (c) passes++; else { fails++; console.log('FAIL ' + msg); } };
const near = (a, b, msg, tol = 1e-6) => ok(Math.abs(a - b) <= tol, `${msg} (got ${a}, want ${b})`);
const crane = (id) => clone(X.DEFAULT_CRANES.find(c => c.id === id));
const stub = (name, sectors, kind = 'main') => ({ name, kind, sectors, src: 'H: 10\n5: 1' });

// ---------- sideOf: left / right / rear, anything else (and front) is rear ----------
eq(['left', 'right', 'rear'].map(s => X.sideOf({ side: s })), ['left', 'right', 'rear'], 'sideOf passes valid sides');
eq([undefined, null, {}, { side: 'front' }, { side: 'FRONT' }, { side: '' }, { side: 7 }, { side: 'top' }].map(l => X.sideOf(l)), Array(8).fill('rear'), 'sideOf: missing / invalid / front -> rear');
eq(X.sideOf({ side: 'LEFT' }), 'left', 'sideOf is case-insensitive');
ok(!X.LIFT_SIDES.includes('front'), 'front is not a lift side');

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
ok(X.chartCoversSide(stub('a', ['rear']), 'front') === true, 'an unknown side string is treated as rear');
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
  const rf = X.findCranes({ w: 3, R: 20, h: 2, rigH: 3, side: 'left', hookAllowance: 3, site: { obstacles: [] } }, [cr], X.DEFAULT_SETTINGS);
  ok(rf.length > 0 && rf.every(o => !o.ok && o.fails.some(f => /does not cover/.test(f.m))), 'findCranes: a rear-only chart is not offered for a left lift');
}

// ---------- headings: carrier faces carrierHeading; boom = carrier + 180 / +90 / -90 ----------
{
  const P = (rot, carrierRot) => ({ sitePlan: { rot, carrierRot } });
  const L = (side) => ({ side });
  eq(['rear', 'left', 'right'].map(s => X.boomHeadingFor(P(0, 90), L(s))), [270, 180, 0], 'boomHeadingFor with carrierRot 90 (cab faces north)');
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
  n = X.normalizePlan(old({ rot: 0, carrierRot: 180 })); eq([n.loads[0].side, X.boomHeadingFor(n, n.loads[0])], ['rear', 0], 'boom over the cab (front) -> rear, boom heading kept');
  n = X.normalizePlan(old({ rot: 0, carrierRot: 160 })); eq(n.loads[0].side, 'rear', 'nearly front -> rear');
  n = X.normalizePlan(old({ rot: 50, carrierRot: 0 }, [{ w: 1 }, { w: 2 }])); eq(n.loads.map(l => l.side), ['right', 'right'], 'every load of a v6 plan gets the derived side');
  // idempotent and respects what is stored
  const p1 = X.normalizePlan(old({ rot: 0, carrierRot: 90 })); const p2 = X.normalizePlan(clone(p1)); eq(p2, p1, 'normalizePlan is idempotent on a migrated plan');
  const mixed = X.normalizePlan(Object.assign(X.blankPlan(), { sitePlan: { rot: 0, carrierRot: 90 }, loads: [{ w: 1, side: 'left' }, { w: 2, side: 'right' }, { w: 3, side: 'front' }, { w: 4 }] }));
  eq(mixed.loads.map(l => l.side), ['left', 'right', 'rear', 'rear'], 'stored sides are kept; front / missing -> rear; no re-migration');
  eq(mixed.sitePlan.carrierRot, 90, 'plans that already have sides keep their carrierRot');
  const allFront = X.normalizePlan(old(null, [{ w: 1, side: 'front' }])); eq(allFront.loads[0].side, 'rear', 'a stored "front" never survives');
}

// ---------- drawings ----------
{
  const texts = (P) => P.list.filter(p => p.t === 'text').map(p => p.s);
  for (const [side, tag, row] of [['rear', 'LIFT OVER REAR', 'OVER REAR'], ['left', 'LIFT OVER LEFT', 'OVER LEFT SIDE'], ['right', 'LIFT OVER RIGHT', 'OVER RIGHT SIDE']]) {
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
  eq(X.liftBodyCrane({ ...c1250, drawing: 'proc' }, 'left'), { ...c1250, drawing: 'proc' }, 'procedural bodies are untouched');
  eq(X.liftBodyCrane({ ...c1250, drawing: 'unknown_body' }, 'rear').drawing, 'unknown_body', 'unlisted CAD bodies are never touched');
  // elevation extents follow the mirrored carrier (it now reaches left of the crane)
  const pl = X.normalizePlan(X.SAMPLE_PLANS[0].make()); const calc = X.computePlan(pl, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS);
  eq(calc.loads[0].side, 'rear', 'res.side exposed');
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
