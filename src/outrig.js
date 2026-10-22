// ===== Outrigger loads (v8): leg (pad) reactions, lift-off, tipping and ground bearing — pure functions =====
// Model (the outrigger brief, §2–§7): the crane is a handful of point masses (carrier, superstructure, counterweight, boom, jib, hook load);
// the slewing ones turn with the boom. The four pads are the only supports. Four pads and three equilibrium equations is statically
// indeterminate, so it is closed with the rigid-plane assumption (reactions vary linearly over the pads). A pad that comes out negative
// has lifted off: it is dropped and the rest re-solved on three pads (exact). If the centre of gravity leaves the pad polygon the crane tips.
// Frame: origin = slew centre at ground level, +x = towards the cab (front), +y = the carrier's left. Slew angle θ runs counter-clockwise
// from +x: 0 front, 90 left side, 180 rear, 270 right side. Masses in tonnes, forces in tonnes-force (× 9.81 = kN), lengths in metres.
// This is a planning model: the crane maker's outrigger-force data and a competent ground assessment always govern.
const OUT_G = 9.81;
const OUT_PADS = ['FR', 'FL', 'RL', 'RR'];                                        // counter-clockwise seen from above
const OUT_PAD_NAME = { FR: 'Front right', FL: 'Front left', RL: 'Rear left', RR: 'Rear right' };
const OUT_SLEW = { rear: 180, left: 90, right: 270 };                             // slew angle for each lift side
const OUT_RATED = 0.85;                                                           // mobile crane on outriggers: rated ≤ 85 % of tipping
// Presumed allowable bearing (BS 8004 / OBC, preliminary only) — kPa; the app works in t/m² (kPa ÷ 9.81). A site value always overrides.
const GROUND_PRESETS = [
  ['dgravel', 'Dense gravel, sand & gravel', 600, 'over 600 kPa'], ['mgravel', 'Medium-dense gravel', 200, '200–600 kPa'], ['lgravel', 'Loose gravel', 100, 'under 200 kPa'],
  ['csand', 'Compact sand', 300, 'over 300 kPa'], ['msand', 'Medium-dense sand', 100, '100–300 kPa'], ['hclay', 'Very stiff / hard clay', 300, '300–600 kPa'],
  ['sclay', 'Stiff clay', 150, '150–300 kPa'], ['fclay', 'Firm clay', 75, 'about 75 kPa'], ['soft', 'Soft clay & silt', 50, 'under 75 kPa']
];

// ---------- set-up: beam extension per side, pad positions ----------
// pv.outExt = { left: 'full'|'half', right: 'full'|'half' } (per crane — a CRANE_KEYS field). Missing → full.
function outExtOf(pv) { const e = pv?.outExt || {}; const f = (v) => (v === 'half' ? 'half' : 'full'); return { left: f(e.left), right: f(e.right) }; }
function outExtHalf(ext) { return ext.left === 'half' || ext.right === 'half'; }
// 'FULL' / 'HALF' / 'LEFT HALF, RIGHT FULL' …
function outExtLabel(ext) { return ext.left === ext.right ? ext.left.toUpperCase() : `LEFT ${ext.left.toUpperCase()}, RIGHT ${ext.right.toUpperCase()}`; }
// Does a load chart assume half outriggers? Read from its name / legs text ("half", "50 %", "partial", "mid").
function chartOutExt(ch) { return /\bhalf\b|50\s*%|partial|\bmid\b/i.test(`${ch?.name || ''} ${ch?.outrigger || ''}`) ? 'half' : 'full'; }
// Spans in metres. outLong = front-to-rear pad spacing, outTrans = full width across, outTransHalf = width across at half extension
// (crane record; else halfway between the retracted beams at the carrier sides and full). outEx = box centre ahead of the slew centre.
function outSpans(crane, ext) {
  const L = Math.max(1, num(crane?.outLong, 7)), T = Math.max(1, num(crane?.outTrans, 7)), W = Math.min(T, Math.max(1, num(crane?.width, 2.75)));
  const Th = num(crane?.outTransHalf) > 0 ? Math.min(T, num(crane.outTransHalf)) : (T + W) / 2;
  const e = ext || { left: 'full', right: 'full' };
  return { long: L, trans: T, transHalf: r2(Th), estHalf: !(num(crane?.outTransHalf) > 0), yL: (e.left === 'half' ? Th : T) / 2, yR: (e.right === 'half' ? Th : T) / 2, ex: num(crane?.outEx, 0) };
}
function outPads(crane, ext) {
  const s = outSpans(crane, ext); const a = s.long / 2;
  return [{ id: 'FR', x: s.ex + a, y: -s.yR, ext: ext.right }, { id: 'FL', x: s.ex + a, y: s.yL, ext: ext.left }, { id: 'RL', x: s.ex - a, y: s.yL, ext: ext.left }, { id: 'RR', x: s.ex - a, y: -s.yR, ext: ext.right }];
}

// ---------- mass model ----------
// From the crane record. When the maker's split is not entered (omCarrier / omBoom …) it is estimated from the crane weight, tail swing and
// boom pin, and flagged `est` so every screen and the sheet can say so.
function outMassModel(crane, cwt) {
  const M = Math.max(1, num(crane?.mass, 40));
  const boom = num(crane?.omBoom) > 0 ? num(crane.omBoom) : 0.25 * M;
  const sup = num(crane?.omSuper) > 0 ? num(crane.omSuper) : 0.15 * M;
  const carrier = num(crane?.omCarrier) > 0 ? num(crane.omCarrier) : Math.max(0, M - boom - sup);
  const Lmin = num(crane?.boomMin, 10), Lmax = Math.max(Lmin + 1, num(crane?.boomMax, 40));
  return {
    est: !(num(crane?.omCarrier) > 0 && num(crane?.omBoom) > 0),
    carrier, carrierX: crane?.omCarrierX !== '' && crane?.omCarrierX != null ? num(crane.omCarrierX) : num(crane?.outEx, 0),
    sup, supR: crane?.omSuperR !== '' && crane?.omSuperR != null ? num(crane.omSuperR) : -1.0,
    cwt: Math.max(0, num(cwt)), cwtR: num(crane?.omCwtR) < 0 ? num(crane.omCwtR) : -Math.max(1.5, num(crane?.tail, 4.5) - 0.7),
    boom, jibPerM: 0.05,
    // the boom's centre of gravity, as a fraction of its length from the foot pin: further back when it is telescoped out (light top sections)
    boomF: (L) => 0.46 - 0.1 * Math.max(0, Math.min(1, (L - Lmin) / (Lmax - Lmin))),
    padMax: num(crane?.padMax, 0)
  };
}
// boom (and jib) centre of gravity as a signed radius from the slew centre, from the load's boom geometry (solveGeometry)
function outBoomCog(mm, geo) {
  const P = geo?.pivot || { x: -1.5, y: 3 }; const th = num(geo?.theta, 45) * D2R;
  const L = geo?.kind && geo.kind !== 'main' ? num(geo.Lb, 20) : num(geo?.L, 20);
  const r = P.x + mm.boomF(L) * L * Math.cos(th);
  let jib = null;
  if (geo?.kind && geo.kind !== 'main' && geo.jibFoot && geo.tip) jib = { m: mm.jibPerM * num(geo.Lj), r: (geo.jibFoot.x + geo.tip.x) / 2 };
  return { r, jib };
}
// every mass placed for slew angle θ (deg). hookT = gross hook load (t, incl. hook block, tackles, DAF), R = hook radius (m)
function outMasses(mm, geo, theta, hookT, R) {
  const t = theta * D2R, c = Math.cos(t), s = Math.sin(t);
  const out = [{ id: 'carrier', m: mm.carrier, x: mm.carrierX, y: 0 }];
  const sl = (id, m, r) => { if (m > 0) out.push({ id, m, x: r * c, y: r * s }); };
  const bc = outBoomCog(mm, geo);
  sl('superstructure', mm.sup, mm.supR); sl('counterweight', mm.cwt, mm.cwtR); sl('boom', mm.boom, bc.r);
  if (bc.jib) sl('jib', bc.jib.m, bc.jib.r);
  sl('hook', Math.max(0, num(hookT)), num(R));
  return out;
}
function outCog(ms) { let M = 0, x = 0, y = 0; for (const q of ms) { M += q.m; x += q.m * q.x; y += q.m * q.y; } return { M, x: M > 0 ? x / M : 0, y: M > 0 ? y / M : 0 }; }

// ---------- reactions ----------
// rigid plane over ≥ 3 pads: R_i = k_i (c0 + c1 x_i + c2 y_i), with ΣR = W, ΣR·x = W·x_cg, ΣR·y = W·y_cg  (brief §4 step 6b)
function outPlane(pads, W, xc, yc, k) {
  let s = 0, sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  pads.forEach((p, i) => { const w = k?.[i] ?? 1; s += w; sx += w * p.x; sy += w * p.y; sxx += w * p.x * p.x; sxy += w * p.x * p.y; syy += w * p.y * p.y; });
  const A = [[s, sx, sy], [sx, sxx, sxy], [sy, sxy, syy]], b = [W, W * xc, W * yc];
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(A); if (Math.abs(D) < 1e-12) return pads.map(() => NaN);
  const c = [0, 1, 2].map(j => det(A.map((row, i) => row.map((v, jj) => (jj === j ? b[i] : v)))) / D);
  return pads.map((p, i) => (k?.[i] ?? 1) * (c[0] + c[1] * p.x + c[2] * p.y));
}
// signed distance of the point from the nearest edge of the convex counter-clockwise polygon (+ inside, − outside)
function outMargin(x, y, poly) {
  let m = Infinity;
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const L = Math.hypot(b.x - a.x, b.y - a.y) || 1; m = Math.min(m, ((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x)) / L); }
  return m;
}
// reactions with lift-off (brief §4 step 6c). state: '4-point' | '3-point' | 'tipping-limit' | 'tipped'
function outSolve(pads, W, xc, yc, k) {
  const margin = outMargin(xc, yc, pads); const zero = pads.map(() => 0);
  if (margin < -1e-9) return { R: zero, state: 'tipped', lifted: [], margin };
  const active = pads.map((_, i) => i);
  for (;;) {
    const R = outPlane(active.map(i => pads[i]), W, xc, yc, active.map(i => k?.[i] ?? 1));
    const min = Math.min(...R);
    if (min >= -1e-9 * Math.max(1, W)) {
      const out = zero.slice(); active.forEach((i, j) => { out[i] = Math.max(0, R[j]); });
      const lifted = pads.filter((_, i) => !active.includes(i)).map(p => p.id);
      return { R: out, state: margin < 1e-3 ? 'tipping-limit' : lifted.length ? '3-point' : '4-point', lifted, margin };
    }
    if (active.length <= 3) return { R: zero, state: 'tipped', lifted: [], margin };
    active.splice(R.indexOf(min), 1);                                              // the most negative pad lifts off
  }
}
// one slew angle: total mass, centre of gravity and the four pad reactions
function outAt(mm, pads, geo, theta, hookT, R) {
  const c = outCog(outMasses(mm, geo, theta, hookT, R)); const s = outSolve(pads, c.M, c.x, c.y);
  const byId = {}; pads.forEach((p, i) => { byId[p.id] = s.R[i]; });
  return { theta, M: c.M, cog: { x: c.x, y: c.y }, R: byId, state: s.state, lifted: s.lifted, margin: s.margin };
}
// gross hook load that brings the centre of gravity onto the pad polygon edge at slew θ (bisection; brief §5.1). Infinity = never tips.
function outTipHook(mm, pads, geo, theta, R) {
  const inside = (m) => { const c = outCog(outMasses(mm, geo, theta, m, R)); return outMargin(c.x, c.y, pads) >= 0; };
  if (!inside(0)) return 0;
  let lo = 0, hi = 25; while (inside(hi)) { lo = hi; hi *= 2; if (hi > 1e5) return Infinity; }
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (inside(m)) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
// 360° slew sweep (brief §4 step 7): per pad the largest reaction and where it happens, plus the least stability margin
function outSweep(mm, pads, geo, hookT, R, step = 5) {
  const max = {}; for (const p of pads) max[p.id] = { v: 0, th: 0 };
  let minMargin = Infinity, thMin = 0, tipped = false, lifted = false;
  for (let th = 0; th < 360; th += step) {
    const a = outAt(mm, pads, geo, th, hookT, R);
    if (a.state === 'tipped') tipped = true; else if (a.lifted.length) lifted = true;
    if (a.margin < minMargin) { minMargin = a.margin; thMin = th; }
    for (const p of pads) if (a.R[p.id] > max[p.id].v) max[p.id] = { v: a.R[p.id], th };
  }
  return { max, minMargin, thMin, tipped, lifted };
}

// ---------- ground bearing (brief §7) ----------
// mat "1.0x1.0" / "2.5 x 2.5m" → [w, l] in metres
function outMatDims(s) { const m = /([\d.]+)\s*[x×*]\s*([\d.]+)/i.exec(String(s || '')); return m ? [num(m[1], 1), num(m[2], 1)] : null; }
// pressure (t/m²) under a pad of load P (t) on a mat w × l with self weight `self` (t) and effectiveness eff (0–1: a stiff, centred mat is 1)
function outPressure(P, w, l, self = 0, eff = 1) { return (num(P) + num(self)) / Math.max(1e-6, w * l * Math.max(0.05, Math.min(1, num(eff, 1)))); }
// smallest square mat side (m) that keeps the pressure within q_allow (t/m²)
function outMatSide(P, allow, self = 0, eff = 1) { return allow > 0 ? Math.sqrt((num(P) + num(self)) / (allow * Math.max(0.05, Math.min(1, num(eff, 1))))) : null; }

// ---------- one crane on a plan: everything the screens and the sheet need ----------
// pv = that crane's view of the plan (rigOf), crane = record, lifts = [{ li, res }] (computeLoad results for the lifts this crane does),
// op = plan.outrigger (manual pad loads live in pv.padMan — per crane).
function outriggerCrane(pv, crane, lifts, op = {}) {
  const ext = outExtOf(pv); const pads = outPads(crane, ext); const spans = outSpans(crane, ext);
  const chartDef = crane?.charts?.[pv.chartIdx ?? 0] || null;
  const cwt = num(pv.cwt !== '' && pv.cwt != null ? pv.cwt : (chartDef?.cwt ?? crane?.cwt));
  const mm = outMassModel(crane, cwt);
  const out = { ext, half: outExtHalf(ext), pads, spans, mm, est: mm.est, cwt, lifts: [], checks: [] };
  const sweepMax = {}; for (const p of pads) sweepMax[p.id] = { v: 0, th: 0, li: null, unl: false };
  const sideMax = {}; for (const p of pads) sideMax[p.id] = { v: 0, li: null };
  const bump = (tbl, id, v, extra) => { if (v > tbl[id].v) tbl[id] = { v, ...extra }; };
  let anyLift = false;
  for (const { li, res } of lifts) {
    if (!res?.geo) continue; anyLift = true;
    const side = res.side || 'rear', theta = OUT_SLEW[side] ?? 180, hookT = num(res.design, num(res.total)), R = num(res.R);
    const at = outAt(mm, pads, res.geo, theta, hookT, R);
    const tip = outTipHook(mm, pads, res.geo, theta, R);
    const sw = outSweep(mm, pads, res.geo, hookT, R, 5);
    // unloaded: hook block only, same boom, at the planned radius and with the boom steep (min radius) — the counterweight swings over a pad
    const hb = num(res.hb); const steep = { ...res.geo, theta: 80 };
    const u1 = outSweep(mm, pads, res.geo, hb, R, 5), u2 = outSweep(mm, pads, steep, hb, num(res.geo.pivot?.x, -1.5) + num(res.geo.L ?? res.geo.Lb, 20) * Math.cos(80 * D2R), 5);
    const L = { li, side, theta, hookT, R, at, tip, rated: Number.isFinite(tip) ? tip * OUT_RATED : Infinity, stabUtil: Number.isFinite(tip) && tip > 0 ? hookT / (OUT_RATED * tip) * 100 : 0, sweep: sw, unl: { max: {} } };
    for (const p of pads) {
      bump(sideMax, p.id, at.R[p.id], { li });
      bump(sweepMax, p.id, sw.max[p.id].v, { th: sw.max[p.id].th, li, unl: false });
      const u = u1.max[p.id].v >= u2.max[p.id].v ? u1.max[p.id] : u2.max[p.id]; L.unl.max[p.id] = u;
      bump(sweepMax, p.id, u.v, { th: u.th, li, unl: true });
    }
    L.unlWorse = Math.max(...pads.map(p => L.unl.max[p.id].v)) > Math.max(...pads.map(p => sw.max[p.id].v)) + 1e-6;
    L.unlTipped = u1.tipped || u2.tipped;
    out.lifts.push(L);
  }
  out.any = anyLift;
  out.sweepMax = sweepMax; out.sideMax = sideMax;
  out.basis = op.basis === 'side' ? 'side' : 'full';
  const calcPad = {}; for (const p of pads) calcPad[p.id] = r2((out.basis === 'side' ? sideMax : sweepMax)[p.id].v);
  // pad loads typed by hand (pv.padMan) — for illustration only, never real crane data
  const man = {}; const pm = pv.padMan || {};
  for (const p of pads) if (pm[p.id] !== '' && pm[p.id] != null && Number.isFinite(parseFloat(String(pm[p.id]).replace(',', '.')))) man[p.id] = Math.max(0, num(pm[p.id]));
  out.manual = man; out.illus = Object.keys(man).length > 0;
  out.calc = calcPad; out.used = {}; for (const p of pads) out.used[p.id] = man[p.id] != null ? man[p.id] : calcPad[p.id];
  const top = pads.reduce((a, p) => (out.used[p.id] > out.used[a.id] ? p : a), pads[0]);
  out.Pmax = { v: out.used[top.id], pad: top.id, manual: man[top.id] != null, th: sweepMax[top.id].th, unl: sweepMax[top.id].unl, li: (out.basis === 'side' ? sideMax : sweepMax)[top.id].li };
  // rule of thumb (brief §7.3): a single leg ≈ factor × (crane + counterweight + load) — a sanity check, not a design value
  const totMax = Math.max(0, ...out.lifts.map(l => l.at.M)); out.thumbW = r2(totMax);
  return out;
}
// checks for one crane's outrigger result (pushed into each lift's checks, and plan-level ones returned)
function outriggerChecks(O, crane, liftsRes) {
  const plan = []; if (!O) return plan;
  const est = O.est ? ' (estimated crane weights — check against the maker\'s data)' : '';
  for (const L of O.lifts) {
    const res = liftsRes[L.li]; if (!res) continue;
    const ch = res.chartDef; const manualCap = res.capInfo?.manual;
    if (O.half && ch && !res.manualJib && chartOutExt(ch) === 'full') {
      const sides = O.ext.left === 'half' && O.ext.right === 'half' ? 'both sides' : O.ext.left === 'half' ? 'the left side' : 'the right side';
      res.checks.push({ s: manualCap ? 'warn' : 'fail', t: 'Outriggers', m: `Legs are only half out on ${sides}, but this load chart is for legs fully out. ` + (manualCap ? 'You typed the capacity by hand — make sure it comes from the maker\'s half-outrigger chart.' : 'Use the maker\'s half-outrigger chart (type its capacity by hand) or put the legs fully out.') });
    }
    const a = L.at; const big = OUT_PADS.reduce((p, id) => (a.R[id] > a.R[p] ? id : p), 'FR');
    if (a.state === 'tipped') res.checks.push({ s: O.est ? 'warn' : 'fail', t: 'Leg loads', m: `The model puts the crane's centre of gravity outside the legs over the ${SIDE_WORD[L.side]} — it would tip${est}` });
    else if (a.state === 'tipping-limit') res.checks.push({ s: O.est ? 'warn' : 'fail', t: 'Leg loads', m: `At the tipping limit over the ${SIDE_WORD[L.side]} — only two legs carry the crane${est}` });
    else if (a.lifted.length) res.checks.push({ s: O.est ? 'info' : 'warn', t: 'Leg loads', m: `${a.lifted.map(id => OUT_PAD_NAME[id].toLowerCase()).join(', ')} leg goes light (lifts off) — the crane stands on three legs. Biggest: ${OUT_PAD_NAME[big].toLowerCase()} ${a.R[big].toFixed(1)} t${est}` });
    else res.checks.push({ s: 'ok', t: 'Leg loads', m: `All four legs down. Biggest: ${OUT_PAD_NAME[big].toLowerCase()} ${a.R[big].toFixed(1)} t over the ${SIDE_WORD[L.side]}` + (O.est ? ' (estimate)' : '') });
    if (L.unlTipped) res.checks.push({ s: O.est ? 'warn' : 'fail', t: 'Backward stability', m: `With the hook empty and the boom steep, the counterweight pulls the centre of gravity outside the legs${est}` });
  }
  if (O.illus) plan.push({ s: 'warn', t: 'Leg loads typed by hand', m: `${Object.keys(O.manual).map(id => `${id} ${O.manual[id].toFixed(1)} t`).join(', ')} — ILLUSTRATION ONLY. Not real crane data and not calculated. Never use these numbers to set up a real lift.` });
  if (O.mm.padMax > 0) { const over = OUT_PADS.filter(id => O.used[id] > O.mm.padMax); if (over.length) plan.push({ s: 'fail', t: 'Outrigger force', m: `${over.join(', ')} over the maker's ${O.mm.padMax} t maximum leg force` }); }
  return plan;
}

if (typeof module !== 'undefined') module.exports = { OUT_G, OUT_PADS, OUT_PAD_NAME, OUT_SLEW, OUT_RATED, GROUND_PRESETS, outExtOf, outExtHalf, outExtLabel, chartOutExt, outSpans, outPads, outMassModel, outBoomCog, outMasses, outCog, outPlane, outMargin, outSolve, outAt, outTipHook, outSweep, outMatDims, outPressure, outMatSide, outriggerCrane, outriggerChecks };
