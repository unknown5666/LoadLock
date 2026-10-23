// v10 rigging asserts: EN colour code, hitch and multi-leg factors, effective WLL, plain-English check messages, old tackles, normalising. No browser.
//   node test_rigging.js        (exits non-zero on any failure)
const fs = require('fs'), vm = require('vm');
const strip = s => s.replace(/\nif \(typeof module[\s\S]*$/, '\n');
const load = (files, extra) => { const ctx = { console, window: {}, Date }; vm.createContext(ctx); vm.runInContext(files.map(f => strip(fs.readFileSync(f + '.js', 'utf8'))).join('\n') + '\n' + extra, ctx); return ctx; };
const BASE = ['gen/assets', 'src/data', 'src/engine'];
const full = load([...BASE, 'src/rigging', 'src/fixes'], 'this.X = { DEFAULT_CRANES, DEFAULT_SETTINGS, computeLoad, SLING_INFO, rgModeFactor, rgEnColour, rgNormTackle, rgKind, rgChainTypical, rgWebWidth, rgSchedule, rgDescribe, RG_COLOURS };').X;
const bare = load([...BASE, 'src/fixes'], 'this.X = { DEFAULT_CRANES, DEFAULT_SETTINGS, computeLoad };').X; // engine alone, as the older tests load it
let fails = 0, passes = 0;
const ok = (c, msg) => { if (c) passes++; else { fails++; console.log('FAIL ' + msg); } };
const eq = (a, b, msg) => ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
const near = (a, b, msg, tol = 1e-9) => ok(Math.abs(a - b) <= tol, `${msg} (got ${a}, want ${b})`);
const { SLING_INFO, rgModeFactor, rgEnColour, rgNormTackle, rgChainTypical, rgWebWidth } = full;

// ---------- 1. EN 1492 colour code ----------
for (const [w, key] of [[1, 'violet'], [2, 'green'], [3, 'yellow'], [4, 'grey'], [5, 'red'], [6, 'brown'], [8, 'blue'], [10, 'orange'], [12, 'orange'], [20, 'orange'], [2.5, 'green'], [7, 'brown'], [9.9, 'blue']])
  eq(rgEnColour(w).key, key, `${w} t is ${key}`);
eq(rgEnColour(0.5), null, 'under 1 t has no EN colour'); eq(rgEnColour(0), null, 'no WLL, no colour');
{ const i = SLING_INFO({ type: 'sling', mat: 'webbing', wllV: 2 }); eq(i.colourName, 'Green', 'webbing 2 t is green'); ok(/^#/.test(i.colour) && i.enCoded, 'it has a colour to draw'); }
eq(SLING_INFO({ type: 'sling', mat: 'round', wllV: 8 }).colourName, 'Blue', 'round sling 8 t is blue');
eq(SLING_INFO({ type: 'sling', mat: 'wire', wllV: 8 }).colourName, '', 'wire rope has no EN colour');
eq(SLING_INFO({ type: 'sling', mat: 'webbing', wllV: 2, colKey: 'red' }).colourName, 'Red', 'a colour picked by hand wins');
ok(SLING_INFO({ type: 'sling', mat: 'webbing', wllV: 2, colKey: 'red' }).notes.some(n => /not the EN colour/.test(n)), 'a colour that does not match the WLL is called out');

// ---------- 2. mode factors ----------
near(rgModeFactor('straight', 1, 0), 1, 'straight 1.0'); near(rgModeFactor('choke', 1, 0), 0.8, 'choke 0.8'); near(rgModeFactor('basket', 1, 0), 2.0, 'basket parallel 2.0');
near(rgModeFactor('basket', 1, 30), 1.4, 'basket at 30° 1.4'); near(rgModeFactor('basket', 1, 55), 1.0, 'basket at 55° 1.0');
near(rgModeFactor('straight', 2, 30), 1.4, '2 legs 0–45° 1.4'); near(rgModeFactor('straight', 2, 45), 1.4, '2 legs at 45° 1.4'); near(rgModeFactor('straight', 2, 50), 1.0, '2 legs 45–60° 1.0'); near(rgModeFactor('straight', 2, 60), 1.0, '2 legs at 60° 1.0');
near(rgModeFactor('straight', 3, 30), 2.1, '3 legs 0–45° 2.1'); near(rgModeFactor('straight', 4, 30), 2.1, '4 legs 0–45° 2.1'); near(rgModeFactor('straight', 3, 55), 1.5, '3 legs 45–60° 1.5'); near(rgModeFactor('straight', 4, 55), 1.5, '4 legs 45–60° 1.5');
near(rgModeFactor('straight', 2, 70), 2 * Math.cos(70 * Math.PI / 180), 'over 60° the factor falls with the angle (and the sling is flagged)', 0.01);
near(rgModeFactor('choke', 2, 30), 1.12, '2 legs choked: 1.4 × 0.8');

// ---------- 3. effective WLL, label, hitch ----------
{
  const i = SLING_INFO({ name: '', type: 'sling', mat: 'webbing', hitch: 'choke', legs: 1, wllV: 2, L: 3 });
  near(i.wll, 2, 'vertical WLL'); near(i.modeFactor, 0.8, 'choke factor'); near(i.wllEff, 1.6, 'effective WLL = 2 × 0.8'); near(i.wllLeg, 1.6, 'one leg limit'); eq(i.hitchLabel, 'choke hitch', 'hitch label'); eq(i.label, 'Green 2 t webbing sling', 'label'); eq(i.std, 'EN 1492-1', 'standard'); near(i.lengthM, 3, 'length'); eq(i.legs, 1, 'legs'); ok(Array.isArray(i.notes), 'notes is a list');
  const j = SLING_INFO({ type: 'sling', mat: 'webbing', hitch: 'straight', legs: 2, wllV: 3, ang: 60 }); // 60° to the horizontal = 30° from the vertical
  near(j.beta, 30, 'angle from the vertical comes from the stack angle'); near(j.modeFactor, 1.4, '2-leg set at 30°'); near(j.wllEff, 4.2, '3 t × 1.4');
  const k = SLING_INFO({ type: 'sling', mat: 'chain', grade: '10', legs: 4, wllV: 5, ang: 40 }); eq(k.std, 'EN 818-4 grade 10', 'chain grade in the standard'); near(k.modeFactor, 1.5, '4-leg chain at 50° from vertical'); eq(k.label, '5 t grade 10 chain sling', 'chain label'); near(k.eff, 3, 'four legs count as three');
  const s = SLING_INFO({ type: 'shackle', mat: 'shackle', shape: 'bow', wllV: 8.5 }); eq(s.label, '8.5 t bow shackle', 'shackle label'); eq(s.std, 'EN 13889', 'shackle standard'); near(s.wllEff, 8.5, 'shackle WLL as is'); eq(s.hitchLabel, '', 'a shackle has no hitch');
  eq(SLING_INFO({ type: 'shackle', mat: 'shackle', std: 'US Fed RR-C-271' }).std, 'US Fed RR-C-271', 'US shackle standard');
  ok(SLING_INFO({ type: 'sling', mat: 'wire' }).notes.some(n => /WLL not entered/.test(n)), 'no WLL → told to enter it');
  ok(SLING_INFO({ type: 'sling', mat: 'wire', legs: 2, ang: 20 }).notes.some(n => /more than 60/i.test(n)), 'legs past 60° are flagged');
  const old = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10); ok(SLING_INFO({ type: 'sling', mat: 'wire', inspected: old }).notes.some(n => /LOLER/.test(n)), 'an old examination date is flagged');
}
near(rgWebWidth(2), 60, 'usual width for 2 t'); near(rgChainTypical(13, '8'), 5.3, 'typical grade 8 13 mm'); near(rgChainTypical(10, '10'), 4, 'typical grade 10 10 mm');

// ---------- 4. old tackles (type + name only) ----------
{
  const o = (t) => SLING_INFO(t);
  eq(o({ name: 'Webbing slings', type: 'sling', L: 4, w: 0, legs: 2 }).kind, 'webbing', 'old "Webbing slings" is webbing');
  eq(o({ name: '2-leg wire rope sling', type: 'sling' }).kind, 'wire', 'old wire rope sling'); eq(o({ name: '4-leg chain sling', type: 'sling' }).kind, 'chain', 'old chain sling');
  eq(o({ name: 'Bow shackle', type: 'shackle' }).kind, 'shackle', 'old shackle'); eq(o({ name: 'Spreader beam', type: 'spreader' }).kind, 'spreader', 'old spreader'); eq(o({ type: 'beam' }).kind, 'beam', 'old beam');
  eq(o({ name: 'Chain block', type: 'chain' }).kind, 'chain', 'old chain block'); ok(!o({ name: 'Chain block', type: 'chain' }).isSling, 'a chain block is not a sling'); eq(o({ type: 'hook' }).kind, 'hook', 'old hook'); eq(o({ type: 'other' }).kind, 'other', 'old other');
  const g = o({ name: 'Sling', type: 'sling' }); ok(g.generic && g.label === 'Sling', 'an unnamed sling stays plain "Sling" (no material is invented)'); eq(g.colourName, '', 'no colour for it');
  const w = o({ name: 'Webbing', type: 'sling', wll: 3, legs: 2 }); near(w.wll, 3, 'old wll field counts as the vertical WLL'); eq(w.colourName, 'Yellow', 'and gets its colour'); eq(w.hitch, 'straight', 'old tackles are straight'); near(w.modeFactor, 1.4, 'two legs, vertical');
  near(o({ type: 'sling', L: 4 }).legs, 2, 'a sling has 2 legs unless told'); near(o({ type: 'shackle' }).legs, 1, 'a shackle is one');
  const n = rgNormTackle({ name: '2-leg wire rope sling', type: 'sling', wll: 2.5, L: 5 });
  eq(n.mat, 'wire', 'normalise adds the material it can tell'); eq(n.hitch, 'straight', 'hitch default'); eq(n.wllV, 2.5, 'wllV copied from wll'); eq(n.cert, '', 'cert default'); eq(n.sleeve, false, 'sleeve default'); eq(n.wll, 2.5, 'old field kept');
  eq(rgNormTackle({ name: 'Sling', type: 'sling' }).mat, undefined, 'a plain sling gets no material'); eq(rgNormTackle(rgNormTackle({ type: 'shackle' })).mat, 'shackle', 'normalising twice is harmless');
}

// ---------- 5. engine checks ----------
{
  const plan = { craneId: 'ltm1250', chartIdx: 0, colIdx: 6, site: { obstacles: [] }, loads: [] }, crane = full.DEFAULT_CRANES.find(c => c.id === 'ltm1250'), S = full.DEFAULT_SETTINGS;
  const run = (tackles, extra, E = full) => E.computeLoad(plan, E.DEFAULT_CRANES.find(c => c.id === 'ltm1250'), { w: 1, hb: 1.5, cont: 20, contOn: true, R: 20, h: 1.5, l: 3, tackles, ...(extra || {}) }, E.DEFAULT_SETTINGS);
  const chk = (r, t) => r.checks.filter(c => c.t === t);
  // the example from the brief: 1.2 t on one choked 2 t webbing leg
  let r = run([{ name: '', type: 'sling', mat: 'webbing', hitch: 'choke', L: 3, w: 0, legs: 1, wllV: 2 }]);
  eq(chk(r, 'Sling tension')[0].m, 'Green 2 t webbing sling, choke hitch: 1.6 t WLL, carries 1.2 t per leg (75 %)', 'plain-English sling message'); eq(chk(r, 'Sling tension')[0].s, 'ok', '75 % is fine');
  near(r.stack.items[0].T, 1.2, 'tension per leg'); near(r.stack.items[0].util, 75, 'utilisation'); near(r.stack.H, 3, 'one leg hangs straight down: its full length'); near(r.stack.items[0].ang, 90, 'angle 90° for a single leg');
  // over 90 % warns, over 100 % fails
  r = run([{ type: 'sling', mat: 'webbing', hitch: 'choke', L: 3, legs: 1, wllV: 1.4 }]); eq(chk(r, 'Sling tension')[0].s, 'fail', '1.2 t on 1.4 × 0.8 = 1.12 t is 107 %: fail');
  eq(chk(run([{ type: 'sling', mat: 'webbing', hitch: 'choke', L: 3, legs: 1, wllV: 1.5 }]), 'Sling tension')[0].s, 'warn', '1.2 of 1.2 t is exactly 100 %: warn, not fail');
  eq(chk(run([{ type: 'sling', mat: 'webbing', hitch: 'choke', L: 3, legs: 1, wllV: 1.2 }]), 'Sling tension')[0].s, 'fail', 'over the WLL fails');
  eq(chk(run([{ type: 'sling', mat: 'webbing', hitch: 'choke', L: 3, legs: 1, wllV: 1.6 }]), 'Sling tension')[0].s, 'warn', '94 % warns above 90 %');
  // two legs: per-leg tension with the stack angle, set rating in the message
  r = run([{ name: 'Lug slings', type: 'sling', mat: 'wire', L: 3, legs: 2, wllV: 2, w: 0.05 }]); const it = r.stack.items[0];
  ok(it.ang > 30 && it.ang < 90, 'two legs hang at an angle'); near(it.T, Math.round((1.2 + 0.05) / (2 * Math.sin(it.ang * Math.PI / 180)) * 100) / 100, 'per-leg tension = load / (2 sin α)', 0.011);
  ok(/^Lug slings \(2 t wire rope sling, 2 legs\): 2 t WLL per leg, carries [\d.]+ t per leg \(\d+ %\) at \d+° to horizontal/.test(chk(r, 'Sling tension')[0].m), 'multi-leg message: ' + chk(r, 'Sling tension')[0].m);
  // a basket hitch counts both branches
  r = run([{ type: 'sling', mat: 'round', hitch: 'basket', L: 3, legs: 1, wllV: 3 }]); const b = r.stack.items[0]; ok(b.rg.branches === 2 && b.T < 1.2, 'basket hitch shares the load over two branches'); ok(/basket hitch/.test(chk(r, 'Sling tension')[0].m), 'message names the hitch');
  // shackles are checked too: against the load, or one leg when they sit under a sling set
  r = run([{ type: 'shackle', mat: 'shackle', shape: 'bow', L: 0.4, w: 0.05, wllV: 1.35 }]); eq(chk(r, 'Shackle load')[0].s, 'warn', 'a shackle near its WLL warns'); ok(/bow shackle/.test(chk(r, 'Shackle load')[0].m) && /1.35 t WLL, carries 1.25 t/.test(chk(r, 'Shackle load')[0].m), 'shackle message: ' + chk(r, 'Shackle load')[0].m);
  eq(chk(run([{ type: 'shackle', mat: 'shackle', L: 0.4, wllV: 1 }]), 'Shackle load')[0].s, 'fail', 'shackle over its WLL fails');
  r = run([{ type: 'sling', mat: 'wire', L: 3, legs: 2, wllV: 5 }, { type: 'shackle', mat: 'shackle', L: 0.4, wllV: 2 }]); ok(r.stack.items[1].legLoad && Math.abs(r.stack.items[1].carry - r.stack.items[0].T) < 1e-9, 'a shackle under a sling set carries one leg');
  eq(chk(run([{ type: 'shackle', L: 0.4 }]), 'Shackle load').length, 0, 'no WLL, no shackle check (as before)');
  // an examination more than 6 months old
  const old = new Date(Date.now() - 300 * 864e5).toISOString().slice(0, 10);
  r = run([{ type: 'sling', mat: 'webbing', L: 3, legs: 1, wllV: 4, inspected: old }]); eq(chk(r, 'Tackle examination')[0].s, 'warn', 'old examination warns'); ok(/LOLER/.test(chk(r, 'Tackle examination')[0].m), 'and says why');
  eq(chk(run([{ type: 'sling', mat: 'webbing', L: 3, legs: 1, wllV: 4, inspected: new Date().toISOString().slice(0, 10) }]), 'Tackle examination').length, 0, 'a fresh examination is quiet');
  // old data: same checks as before, still there
  r = run([{ name: '4-leg chain 6m', type: 'sling', L: 6, w: 0.25, legs: 4, wll: 8.5 }, { name: 'Spreader 6m', type: 'spreader', L: 6, w: 0.9 }, { name: 'Bottom slings 3m', type: 'sling', L: 3, w: 0.1, legs: 4 }]);
  eq(chk(r, 'Sling tension').length, 2, 'old tackles: one sling check per sling'); ok(r.stack.items.filter(x => x.type === 'sling').every(x => x.T > 0), 'old tackles: tensions worked out'); ok(r.stack.items[0].util > 0, 'old wll still gives a utilisation'); near(r.stack.H, r.stack.items.reduce((a, x) => a + x.v, 0), 'height is the sum of the parts', 0.011);
  // without rigging.js the engine still runs and keeps its old message
  const rb = run([{ name: '4-leg chain 6m', type: 'sling', L: 6, w: 0.25, legs: 4, wll: 8.5 }], null, bare);
  ok(/^4-leg chain 6m: [\d.]+ t per leg at \d+° to horizontal vs WLL 8.5 t \(\d+%\)/.test(chk(rb, 'Sling tension')[0].m), 'engine alone: old message (' + chk(rb, 'Sling tension')[0].m + ')');
  // the table for the sheet
  const tb = full.rgSchedule({}, run([{ name: 'Web', type: 'sling', mat: 'webbing', L: 3, legs: 2, wllV: 2, cert: 'WS-1' }]), 0, null);
  eq(tb.rows.length, 1, 'schedule has a row per item'); eq(tb.cols.length, 8, '8 columns: item, type/standard, colour, hitch, WLL, carries, used, certificate'); eq(tb.rows[0].cells[2].t, 'GREEN', 'colour column'); eq(tb.rows[0].cells[7].t, 'WS-1', 'cert column');
}

// ---------- 6. an old saved plan loads, and gets the new defaults ----------
{
  const FILES = ['gen/assets', 'src/data', 'src/engine', 'src/outrig', 'src/tandem', 'src/draw', 'src/rigging', 'src/crane2d', 'src/fixes', 'src/samples', 'src/gis', 'src/app'];
  const ctx = { console, window: {}, localStorage: { getItem() { return null; }, setItem() {} }, performance, Date }; vm.createContext(ctx);
  vm.runInContext(FILES.map(f => strip(fs.readFileSync(f + '.js', 'utf8'))).join('\n') + '\nthis.X = { SAMPLE_PLANS, normalizePlan, computePlan, DEFAULT_CRANES, DEFAULT_SETTINGS, buildSheet, toSVG, toDXF };', ctx);
  const X = ctx.X, plan = JSON.parse(JSON.stringify(X.SAMPLE_PLANS[0].make()));
  plan.loads[0].tackles = [{ name: '25t bow shackle', type: 'shackle', L: 0.4, w: 0.05 }, { name: '4-leg chain sling 6m', type: 'sling', L: 6, w: 0.35, legs: 4, wll: 8 }, null, 'junk'];
  const p2 = X.normalizePlan(plan), tk = p2.loads[0].tackles;
  eq(tk.length, 2, 'normalising drops empty or broken tackle entries'); eq(tk[0].mat, 'shackle', 'old shackle gets its material'); eq(tk[1].mat, 'chain', 'old chain sling gets its material'); eq(tk[1].wllV, 8, 'old wll becomes the vertical WLL'); eq(tk[1].hitch, 'straight', 'hitch default'); eq(tk[1].legs, 4, 'old fields untouched');
  const calc = X.computePlan(p2, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS), { P } = X.buildSheet(p2, calc, X.DEFAULT_SETTINGS), svg = X.toSVG(P), dxf = X.toDXF(P, 100);
  ok(/GR8|CHAIN/.test(svg) && /LIFTING TACKLES/.test(svg), 'the sheet prints the tackle schedule'); ok(/LIFTING TACKLES/.test(dxf), 'and so does the DXF'); ok(calc.loads[0].checks.some(c => c.t === 'Sling tension'), 'the sling check is there');
}

console.log(`${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
