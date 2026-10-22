// v10 asserts: ground surfaces (roads, slabs, bridges), lifting-point reactions and sling tensions, sling hitch / tackle WLL checks,
// reeving capacity, tandem lifts on the A1 sheet, and the multi-page lift plan set. No browser.   node test_planset.js   (exit 1 on failure)
const fs = require('fs'), vm = require('vm');
const strip = s => s.replace(/\nif \(typeof module[\s\S]*$/, '\n');
const FILES = ['gen/assets', 'src/data', 'src/engine', 'src/outrig', 'src/tandem', 'src/draw', 'src/crane2d', 'src/fixes', 'src/samples', 'src/app', 'src/planset'];
const code = FILES.map(f => strip(fs.readFileSync(f + '.js', 'utf8'))).join('\n') + `
this.X = { DEFAULT_CRANES, DEFAULT_SETTINGS, SAMPLE_PLANS, normalizePlan, computePlan, computeLoad, buildSheet, sheetBlocks, groundRows, toSVG, GROUND_PRESETS, GROUND_GROUPS, groundSurface, groundSurfaceChecks,
  pickForces, HITCH, tandemDefault, buildPlanSet, psPageSVG, PS, OUT_G, rigPick, boomHeadingFor };`;
const ctx = { console, window: {}, localStorage: { getItem() { return null; }, setItem() {} } }; vm.createContext(ctx); vm.runInContext(code, ctx);
const X = ctx.X; const clone = (o) => JSON.parse(JSON.stringify(o));
let fails = 0, passes = 0;
const ok = (c, msg) => { if (c) passes++; else { fails++; console.log('FAIL ' + msg); } };
const near = (a, b, msg, tol = 0.01) => ok(Math.abs(a - b) <= tol, `${msg} (got ${typeof a === 'number' ? a.toFixed(4) : a}, want ${b})`);
const S = X.DEFAULT_SETTINGS, CR = X.DEFAULT_CRANES;
const plan0 = () => X.normalizePlan(X.SAMPLE_PLANS[0].make());

// ---------- 1. ground surfaces ----------
{
  const keys = X.GROUND_PRESETS.map(g => g[0]);
  for (const k of ['asphalt', 'concrete', 'pavers', 'hardcore', 'fill', 'rock', 'sabkha', 'dune', 'bridge', 'slab', 'services', 'quay', 'deck']) ok(keys.includes(k), `surface ${k} offered`);
  for (const k of ['dgravel', 'csand', 'sclay', 'soft']) ok(keys.includes(k), `BS 8004 soil ${k} still there (old plans keep their key)`);
  ok(new Set(keys).size === keys.length, 'surface keys are unique');
  ok(X.GROUND_PRESETS.every(g => X.GROUND_GROUPS[g[4] || 'soil']), 'every surface is in a group');
  ok(X.GROUND_PRESETS.filter(g => g[4] === 'struct').every(g => g[2] === 0), 'structures carry no guessed value (engineer only)');
  ok(X.GROUND_PRESETS.filter(g => g[4] !== 'struct').every(g => g[2] > 0), 'every other surface has a typical value');
  const br = X.groundSurfaceChecks({ ground: 'bridge', allow: '' }); ok(br.length === 1 && br[0].s === 'fail', 'bridge with no engineer figure → FAIL');
  const br2 = X.groundSurfaceChecks({ ground: 'bridge', allow: 20 }); ok(br2[0].s === 'warn' && /approval reference/.test(br2[0].m), 'bridge figure without an approval ref → warn');
  const br3 = X.groundSurfaceChecks({ ground: 'bridge', allow: 20, approval: 'NOC-1' }); ok(br3[0].s === 'info' && /NOC-1/.test(br3[0].m), 'bridge with figure + ref → info, ref quoted');
  const as = X.groundSurfaceChecks({ ground: 'asphalt', allow: 15.29 }); ok(as[0].s === 'info' && /guide value/.test(as[0].m), 'asphalt → guide-value note');
  ok(X.groundSurfaceChecks({ ground: '' }).length === 0, 'no surface → no note');
  // computePlan: a structure switches the ground check on by itself and fails it until the engineer's figure is in
  const p = plan0(); p.outrigger = { ...p.outrigger, enabled: false, ground: 'bridge', allow: '' };
  const c = X.computePlan(p, CR, S); ok(c.ground && c.ground.status === 'fail' && c.ground.surface.key === 'bridge', 'plan on a bridge with no figure → ground FAIL even with the table off');
  ok(c.status === 'fail', 'plan status FAIL on an unapproved bridge');
  p.outrigger.allow = 200; p.outrigger.approval = 'BR-7'; const c2 = X.computePlan(p, CR, S); ok(c2.ground.pStatus === c2.ground.status && c2.ground.status !== 'fail', 'bridge with figure + ref: ground decided by pressure');
  const rows = X.groundRows(p, c2).map(r => r.label + '=' + r.v).join('|'); ok(/PADS STAND ON=BRIDGE DECK/.test(rows) && /\(ENGINEER\)/.test(rows) && /BR-7/.test(rows), 'A1 ground table prints the surface, ENGINEER and the ref');
  p.outrigger.ground = 'asphalt'; p.outrigger.allow = 15.29; const c3 = X.computePlan(p, CR, S); ok(c3.ground.checks[0].s === 'info', 'asphalt road: info note only');
  const op = plan0(); op.outrigger.ground = 'csand'; op.outrigger.allow = 30.58; ok(X.computePlan(op, CR, S).ground.surface.key === 'csand', 'old soil keys still resolve');
}

// ---------- 2. lifting points: reactions and tensions ----------
{
  const mk = (extra) => { const p = plan0(); Object.assign(p.loads[0], extra); const c = X.computePlan(p, CR, S); return { p, c, pf: X.pickForces(p.loads[0], c.loads[0], null) }; };
  // two slings, centred, hook 6 m above: R = W/2, β = atan(d/H)
  let { pf, c } = mk({ tackles: [{ name: 'Sling', type: 'sling', L: 6.5, w: 0.1, legs: 2 }], pick: 5, l: 6, cogX: 0 });
  const W = c.loads[0].W + c.loads[0].contW; near(pf.W, W, '2-leg: W = load + contingency'); ok(pf.n === 2, '2-leg sling → 2 lifting points');
  near(pf.pts[0].R, W / 2, '2-leg centred: R1 = W/2'); near(pf.pts[1].R, W / 2, '2-leg centred: R2 = W/2');
  const H = Math.sqrt(6.5 * 6.5 - 2.5 * 2.5); near(pf.H, H, '2-leg: hook height from the sling geometry', 0.01);
  near(pf.pts[0].beta, Math.atan2(2.5, H) * 180 / Math.PI, '2-leg: angle from vertical', 0.02); near(pf.pts[0].T, pf.pts[0].R / Math.cos(pf.pts[0].beta * Math.PI / 180), 'T = R / cos β', 0.01);
  // lever rule with the C.O.G. off centre: R1 = W·D2/(D1+D2)
  ({ pf } = mk({ tackles: [{ name: 'Sling', type: 'sling', L: 6.5, w: 0.1, legs: 2 }], pick: 5, l: 6, cogX: 0.5 }));
  near(pf.pts[0].R, W * 2.0 / 5, 'lever rule R1 (D1 3.0, D2 2.0)'); near(pf.pts[1].R, W * 3.0 / 5, 'lever rule R2'); near(pf.pts[0].R + pf.pts[1].R, W, 'reactions add up to W');
  ok(pf.pts[1].T > pf.pts[0].T, 'nearer sling carries more'); ok(pf.inside, 'C.O.G. between the points'); ok(pf.off, 'flagged off-centre');
  // the demo plan's numbers (W 14.193 t, D1 3.765, DA 2.871): R1 6.141, RA 8.052 — lever rule
  { const Wd = 14.193, d1 = 3.765, dA = 2.871; near(Wd * dA / (d1 + dA), 6.141, 'demo plan R1 by the same rule', 0.002); }
  // four slings: rigid plane — centred → W/4 each; LEEA 3-leg rating governs; off-centre keeps ΣR = W and the moments
  ({ pf } = mk({ tackles: [{ name: '4-leg', type: 'sling', L: 5, w: 0.2, legs: 4 }], pick: 4, l: 4.6, wd: 2.6, cogX: 0, cogZ: 0 }));
  ok(pf.n === 4 && Math.abs(pf.across - 2.3) < 1e-9, '4-leg: points across = width − 0.3');
  pf.pts.forEach((q, i) => near(q.R, W / 4, `4-leg centred R${i + 1} = W/4`));
  near(pf.Tgov, W / (3 * Math.cos(pf.pts[0].beta * Math.PI / 180)), '4-leg: governing tension on 3 legs (LEEA)', 0.01);
  ({ pf } = mk({ tackles: [{ name: '4-leg', type: 'sling', L: 5, w: 0.2, legs: 4 }], pick: 4, l: 4.6, wd: 2.6, cogX: 0.4, cogZ: 0.2 }));
  const sR = pf.pts.reduce((a, q) => a + q.R, 0), sx = pf.pts.reduce((a, q) => a + q.R * q.x, 0), sz = pf.pts.reduce((a, q) => a + q.R * q.z, 0);
  near(sR, W, '4-leg off-centre: ΣR = W', 0.02); near(sx, W * 0.4, '4-leg off-centre: ΣR·x = W·x_G', 0.03); near(sz, W * 0.2, '4-leg off-centre: ΣR·z = W·z_G', 0.03);
  ok(pf.pts.every(q => q.R >= 0), 'no lifting point pushes');
  // DAF goes into W; nothing entered → assumptions listed
  ({ pf } = mk({ tackles: [], rigType: '', slingL: '', rigH: 0, daf: { on: true, mode: 'manual', v: 1.1 } })); near(pf.W, W * 1.1, 'DAF multiplies W', 0.01); ok(pf.assumed.length >= 1, 'assumed lifting points are listed');
  ({ pf } = mk({ empty: true })); ok(pf === null, 'empty hook → no load forces');
  // C.O.G. outside the lifting points
  ({ pf } = mk({ tackles: [{ name: 'Sling', type: 'sling', L: 6.5, w: 0.1, legs: 2 }], pick: 2, l: 6, cogX: 2 })); ok(!pf.inside, 'C.O.G. outside the points is caught');
}

// ---------- 3. hitch mode factors, every tackle WLL, reeving ----------
{
  const p = plan0(); const l = p.loads[0]; l.w = 20; l.cont = 0; l.contOn = false;
  l.tackles = [{ name: '25t shackle', type: 'shackle', L: 0.4, w: 0.03, wll: 25 }, { name: 'Round slings', type: 'sling', L: 6, w: 0.1, legs: 2, wll: 14, hitch: 'choker' }, { name: '12t shackle', type: 'shackle', L: 0.3, w: 0.01, wll: 12 }];
  let r = X.computeLoad(p, CR.find(c => c.id === p.craneId), l, S);
  const sl = r.stack.items[1]; ok(sl.mf === 0.8 && sl.swl === 11.2, 'choker: SWL = WLL × 0.8'); near(sl.util, sl.T / 11.2 * 100, 'sling util against its SWL', 0.05);
  const top = r.stack.items[0], low = r.stack.items[2]; ok(top.T > 19.9 && !top.atLeg, 'shackle above the slings carries the whole load'); ok(low.atLeg && low.T === sl.T, 'shackle at each leg carries the leg tension');
  ok(r.checks.some(c => c.t === 'Tackle WLL' && /25t shackle/.test(c.m)), 'every item with a WLL is checked');
  l.tackles[0].wll = 17; r = X.computeLoad(p, CR.find(c => c.id === p.craneId), l, S); ok(r.checks.some(c => c.t === 'Tackle WLL' && c.s === 'fail'), 'over-loaded shackle → FAIL');
  ok(r.status === 'fail', 'lift status FAIL with an over-loaded shackle');
  l.daf = { on: true, mode: 'manual', v: 1.2 }; l.tackles[0].wll = 25; const r2 = X.computeLoad(p, CR.find(c => c.id === p.craneId), l, S); ok(r2.stack.items[0].T > top.T * 1.19, 'tackle forces include the DAF');
  for (const [k, [lab, f]] of Object.entries(X.HITCH)) ok(typeof lab === 'string' && f > 0, `hitch ${k} has a label and a factor`);
  // reeving: line pull × falls
  const q = plan0(); q.linePull = 10.6; q.falls = 3; const rr = X.computeLoad(q, CR.find(c => c.id === q.craneId), q.loads[0], S);
  near(rr.reeve, 31.8, 'reeving capacity = line pull × falls'); near(rr.reeveUtil, rr.design / 31.8 * 100, '% of reeving capacity', 0.01); ok(rr.checks.some(c => c.t === 'Rope reeving'), 'reeving checked');
  q.linePull = 3; const r3 = X.computeLoad(q, CR.find(c => c.id === q.craneId), q.loads[0], S); ok(r3.checks.some(c => c.t === 'Rope reeving' && c.s === 'fail'), 'too few falls → FAIL');
  const q2 = plan0(); const r4 = X.computeLoad(q2, CR.find(c => c.id === q2.craneId), q2.loads[0], S); ok(r4.reeve == null && !r4.checks.some(c => c.t === 'Rope reeving'), 'no line pull → no reeving check');
}

// ---------- 4. tandem lifts on the A1 sheet ----------
const tandemPlan = () => { const p = plan0(); p.cranes = [X.rigPick(p), X.rigPick(p)]; const l = p.loads[0]; l.tandem = X.tandemDefault(l, 2, 28, X.boomHeadingFor(p, l)); l.liftType = 'Tandem'; return p; };
{
  const p = tandemPlan(); const c = X.computePlan(p, CR, S); ok(!!c.loads[0].tandem, 'tandem computed');
  const blocks = X.sheetBlocks(p, c, S); const all = blocks.flatMap(b => b.rows.map(r => r.label + '=' + r.v)).join('|');
  ok(blocks.some(b => /LOAD DATA 1 · TANDEM/.test(b.head || '')), 'data panel: tandem load block');
  ok(/LOAD WEIGHT \(WHOLE LOAD\)=13\.00T/.test(all), 'data panel prints the whole load, not one crane\'s share');
  ok(/C1 SHARE OF LOAD/.test(all) && /C2 SHARE OF LOAD/.test(all), 'data panel: each crane\'s share'); ok(/C2 % CHART \(LIMIT 80%\)/.test(all), 'data panel: each crane against the tandem limit');
  ok(blocks.filter(b => /M\.CRANE DATA/.test(b.head || '')).length === 2, 'data panel: both cranes');
  for (const layout of ['chart', 'full', 'rigging', 'elev2']) {
    const q = clone(p); q.layout = layout; const cc = X.computePlan(q, CR, S); const { P } = X.buildSheet(q, cc, S); const txt = P.list.filter(x => x.t === 'text').map(x => x.s).join('|');
    ok(/C1: 7\.80T \(50%\)/.test(txt) && /C2: 7\.80T \(50%\)/.test(txt), `${layout}: elevation labels both cranes' shares`);
    ok(P.list.every(x => x.t !== 'text' || (isFinite(x.x) && isFinite(x.y))), `${layout}: no broken text positions`);
    if (layout !== 'elev2' && layout !== 'rigging') ok(/C1 7\.8T/.test(txt) && /C2 7\.8T/.test(txt), `${layout}: site plan shows both lifting points`);
  }
  const one = plan0(); const c1 = X.computePlan(one, CR, S); const t1 = X.buildSheet(one, c1, S).P.list.filter(x => x.t === 'text').map(x => x.s).join('|'); ok(!/TANDEM/.test(t1), 'single-crane sheet unchanged (no tandem labels)');
}

// ---------- 5. the lift plan set ----------
{
  const check = (p, name, want) => {
    const c = X.computePlan(p, CR, S); const idx = X.buildPlanSet(p, c, S, { index: true }); const pages = X.buildPlanSet(p, c, S, {});
    ok(pages.length === idx.length, `${name}: the index lists every sheet (${idx.length})`);
    for (const w of want) ok(pages.some(pg => pg.code === w || pg.code.startsWith(w)), `${name}: has ${w}`);
    pages.forEach((pg, i) => {
      const svg = X.psPageSVG(pg); const txt = pg.P.list.filter(x => x.t === 'text').map(x => x.s).join('|');
      ok(!/NaN|undefined|Infinity/.test(svg), `${name} sheet ${i + 1} (${pg.code}): no NaN / undefined in the drawing`);
      ok(txt.includes(`SHEET ${i + 1} OF ${pages.length}`) && txt.includes(`${i + 1} / ${pages.length}`), `${name} sheet ${i + 1}: numbered n of N`);
      ok(txt.includes(pg.title), `${name} sheet ${i + 1}: title in the title block`);
      ok(/^<svg[\s\S]*<\/svg>$/.test(svg.trim()) && (svg.match(/<clipPath/g) || []).length === (svg.match(/<\/clipPath>/g) || []).length, `${name} sheet ${i + 1}: well-formed SVG`);
      const outside = pg.P.list.filter(x => x.t === 'text' && (x.x < -1 || x.x > X.PS.W + 1 || x.y < -1 || x.y > X.PS.H + 1)); ok(!outside.length, `${name} sheet ${i + 1}: text on the paper${outside.length ? ' (' + outside[0].s + ')' : ''}`);
    });
    return { c, pages };
  };
  const a = check(plan0(), 'single lift', ['cover', 'ga0', 'site', 'rig0', 'calc0', 'cap0', 'out', 'rams', 'check']);
  ok(a.pages[0].code === 'cover' && a.pages[a.pages.length - 1].code === 'check', 'cover first, checklist last');
  const cov = a.pages[0].P.list.filter(x => x.t === 'text').map(x => x.s).join('|'); ok(a.pages.every(pg => cov.includes(pg.title)), 'drawing register lists every sheet');
  const ga = a.pages.find(pg => pg.code === 'ga0').P.list.filter(x => x.t === 'text').map(x => x.s); ['MAIN CRANE DATA', 'CRANE CENTRE COORDINATES', 'WEIGHT OF TOTAL LOAD × D.A.F', '% CRANE CAPACITY @ RADIUS', 'REEVING CAPACITY', 'PLAN VIEW', 'ISOMETRIC VIEW', 'CRANE SUPPORT LOCATIONS'].forEach(t => ok(ga.some(s => s.includes(t)), `GA has ${t}`));
  ok(ga.includes(String(Math.round(a.c.loads[0].total * 1000))), 'GA prints the total load in kg');
  const t = tandemPlan(); const b = check(t, 'tandem', ['tdm0', 'out0', 'out1']); ok(b.pages.filter(pg => /^out/.test(pg.code)).length === 2, 'tandem: a leg-load sheet for each crane');
  const tx = b.pages.find(pg => pg.code === 'tdm0').P.list.filter(x => x.t === 'text').map(x => x.s).join('|'); ok(/LOAD SHARE/.test(tx) && /C2/.test(tx), 'tandem sheet: load share table');
  const m = X.normalizePlan(X.SAMPLE_PLANS[5].make()); const cm = check(m, 'two lifts', ['ga0', 'ga1', 'calc1']); ok(cm.pages.some(pg => /— LIFT 2$/.test(pg.title)), 'two lifts: sheets say which lift');
  for (let i = 1; i < 5; i++) check(X.normalizePlan(X.SAMPLE_PLANS[i].make()), 'sample ' + X.SAMPLE_PLANS[i].key, ['cover', 'cap0']);
  const br = plan0(); br.outrigger = { ...br.outrigger, enabled: true, ground: 'bridge', allow: '' }; const cb = X.computePlan(br, CR, S); const pb = X.buildPlanSet(br, cb, S, {});
  const ot = pb.find(pg => /^out/.test(pg.code)).P.list.filter(x => x.t === 'text').map(x => x.s).join('|'); ok(/Bridge deck/.test(ot) && /ENGINEER ONLY/.test(ot) && /NOT GIVEN/.test(ot), 'ground sheet: bridge, engineer-only, approval not given');
  const cv = pb[0].P.list.filter(x => x.t === 'text').map(x => x.s).join('|'); ok(/DO NOT LIFT AS PLANNED/.test(cv), 'cover verdict follows the plan status');
}

console.log(`${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
