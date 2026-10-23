// ===== v9 tandem lift: 2–4 cranes on one load — load share, live load transfer, hoist-line angles. Pure functions =====
// The load's pick line runs along `axis` (plan heading, degrees CCW from east, like sitePlan.rot). Pick k sits x m along that line and
// z m to its left. Crane k stands R m from its pick, out along heading `psi`, with its boom pointing back at the pick. Pick 0 is the lead
// crane: it is the plan's own crane position (sitePlan.cx/cy), so the other cranes are placed from it.
// Shares: with plumb hoist lines the load splits by the lever rule (2 picks), by a straight-line spread along the line (3–4 picks in a
// line) or by a rigid plane (picks spread in plan). With two cranes the "what if" moves (boom up / down, swing, hoist) are solved for real:
// the load hangs from two lines of fixed length anchored at the boom heads, settles where its centre of gravity is lowest, and the line
// tensions come from force and moment balance — so a crane that booms up, swings or hoists shifts load onto (or off) the other one.
// Tonnes, metres, degrees. A planning model: the Appointed Person's tandem method statement and the maker's charts govern.

const TANDEM_DERATE = 80;                 // % of each crane's chart a tandem lift may use unless set (BS 7121-1 / ASME B30.5 guidance 75–80 %)
const TANDEM_LINE = [1, 3];               // hoist line out of plumb: careful above 1°, stop above 3°
const TANDEM_TILT = 5;                    // load tilt (°) worth a warning

function tandemOf(load) { const t = load?.tandem; return t && t.on && Array.isArray(t.picks) && t.picks.length >= 2 ? t : null; }

// sensible starting set-up for n cranes on a load of length len: picks spread along the load, the lead crane where the plan has it,
// the second crane beyond the far end facing back (the classic two-crane tandem), a third / fourth crane on alternate sides
function tandemDefault(load, n, R0, axis) {
  const len = Math.max(1, num(load?.l, 10)); const k = Math.max(2, Math.min(4, Math.round(n)));
  const xs = Array.from({ length: k }, (_, i) => r2(len * 0.1 + (len * 0.8) * i / (k - 1)));
  return {
    on: true, axis: r2(normDeg(axis)), cog: r2((xs[0] + xs[k - 1]) / 2), cogZ: 0, cogH: r2(-num(load?.h, 1.5) / 2), derate: '',
    picks: xs.map((x, i) => ({ crane: i, x, z: 0, R: r2(num(R0, 10)), psi: i === 0 ? r2(normDeg(axis + 180)) : i === k - 1 ? r2(normDeg(axis)) : r2(normDeg(axis + (i % 2 ? 90 : -90))), side: 'rear', tk: 0, hb: '', mv: { boom: 0, swing: 0, hoist: 0 } }))
  };
}

// ---------- static share (plumb lines) ----------
function tandemCollinear(P) {
  if (P.length < 3) return true;
  const a = P[0]; let far = P[1], d = 0; for (const p of P) { const dd = Math.hypot(p.x - a.x, p.z - a.z); if (dd > d) { d = dd; far = p; } }
  if (d < 1e-6) return true; const ux = (far.x - a.x) / d, uz = (far.z - a.z) / d;
  return P.every(p => Math.abs((p.x - a.x) * uz - (p.z - a.z) * ux) < 0.05);
}
// W = load weight (t, with margin); (cx, cz) = its centre of gravity in plan, in the pick frame. Returns the share per pick (t).
function tandemStatic(picks, W, cx, cz) {
  const act = picks.map((_, i) => i);
  for (;;) {
    const P = act.map(i => picks[i]); let sh;
    if (P.length === 1) sh = [W];
    else if (tandemCollinear(P)) { // s_i = a + b·x_i with Σs = W and Σs·x = W·cx — for two picks this is exactly the lever rule
      const n = P.length, sx = P.reduce((s, p) => s + p.x, 0), sxx = P.reduce((s, p) => s + p.x * p.x, 0), det = n * sxx - sx * sx;
      if (Math.abs(det) < 1e-9) sh = P.map(() => W / n);
      else { const a = W * (sxx - sx * cx) / det, b = W * (n * cx - sx) / det; sh = P.map(p => a + b * p.x); }
    } else sh = outPlane(P.map(p => ({ x: p.x, y: p.z })), W, cx, cz);
    const min = Math.min(...sh);
    if (!(min < -1e-9 * Math.max(1, W)) || act.length <= 1) return picks.map((_, i) => { const j = act.indexOf(i); return j < 0 ? 0 : Math.max(0, sh[j]); });
    act.splice(sh.indexOf(min), 1);
  }
}

// ---------- two cranes: the load hanging from two lines (vertical plane of the pick line) ----------
// A = boom heads [{s, y}] (s along the pick line), L = line lengths boom head → pick, p = picks along the load [x0, x1],
// g = centre of gravity { c: along the load, e: above the pick line (negative = below) }. Returns the settled pose or null.
function tandemPose(A, L, p, g) {
  // parameter: the angle of line 1 from plumb. Its pick sits on a circle round boom head 1; pick 2 is |p1 − p0| further along the load
  // and on a circle round boom head 2 (the lower crossing — lines hang down, the load never flips end for end). Searching the line angle
  // rather than the load's tilt also covers the "parallelogram" case (equal plumb lines, picks as far apart as the boom heads).
  const dv = p[1] - p[0];
  const at = (ph) => {
    const P1 = { s: A[0].s + L[0] * Math.sin(ph), y: A[0].y - L[0] * Math.cos(ph) };
    const dx = A[1].s - P1.s, dy = A[1].y - P1.y, d = Math.hypot(dx, dy);
    if (d < 1e-12 || d > dv + L[1] + 1e-9 || d < Math.abs(dv - L[1]) - 1e-9) return null;
    const a = (dv * dv - L[1] * L[1] + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, dv * dv - a * a));
    const mx = P1.s + a * dx / d, my = P1.y + a * dy / d;
    let P2 = null;
    for (const c of [{ s: mx + hh * dy / d, y: my - hh * dx / d }, { s: mx - hh * dy / d, y: my + hh * dx / d }])
      if (c.s - P1.s > 1e-9 && c.y <= A[1].y + 1e-9 && (!P2 || c.y < P2.y)) P2 = c;
    if (!P2) return null;
    const al = Math.atan2(P2.y - P1.y, P2.s - P1.s), ca = Math.cos(al), sa = Math.sin(al);
    const G = { s: P1.s + (g.c - p[0]) * ca - g.e * sa, y: P1.y + (g.c - p[0]) * sa + g.e * ca };
    return { al, ph, P: [P1, P2], G };
  };
  // coarse scan for the lowest centre of gravity, then golden-section refine around it
  let best = null; const N = 320, lo0 = -1.4, hi0 = 1.4;
  for (let i = 0; i <= N; i++) { const q = at(lo0 + (hi0 - lo0) * i / N); if (q && (!best || q.G.y < best.G.y)) best = q; }
  if (!best) return null;
  let lo = best.ph - (hi0 - lo0) / N, hi = best.ph + (hi0 - lo0) / N; const gr = (Math.sqrt(5) - 1) / 2;
  const f = (ph) => { const q = at(ph); return q ? q.G.y : Infinity; };
  let x1 = hi - gr * (hi - lo), x2 = lo + gr * (hi - lo), f1 = f(x1), f2 = f(x2);
  for (let i = 0; i < 70; i++) { if (f1 <= f2) { hi = x2; x2 = x1; f2 = f1; x1 = hi - gr * (hi - lo); f1 = f(x1); } else { lo = x1; x1 = x2; f1 = f2; x2 = lo + gr * (hi - lo); f2 = f(x2); } }
  const q = at((lo + hi) / 2); return q && q.G.y <= best.G.y + 1e-9 ? q : best;
}
// line tensions for a settled pose: force balance (along, up) and moment balance, least squares (exact at equilibrium)
function tandemTension(pose, A, W) {
  const u = pose.P.map((P, k) => { const ds = A[k].s - P.s, dy = A[k].y - P.y, n = Math.hypot(ds, dy) || 1; return { s: ds / n, y: dy / n }; });
  const m = pose.P.map((P, k) => P.s * u[k].y - P.y * u[k].s);
  const rows = [[u[0].s, u[1].s, 0], [u[0].y, u[1].y, W], [m[0], m[1], W * pose.G.s]];
  let a = 0, b = 0, c = 0, r1 = 0, r2_ = 0; for (const [x, y, z] of rows) { a += x * x; b += x * y; c += y * y; r1 += x * z; r2_ += y * z; }
  const det = a * c - b * b; if (Math.abs(det) < 1e-12) return null;
  const T = [(c * r1 - b * r2_) / det, (a * r2_ - b * r1) / det];
  const res = Math.max(...rows.map(([x, y, z]) => Math.abs(x * T[0] + y * T[1] - z)));
  return { T, u, res };
}
// the two-line solve with slack handling: if one line would have to push, it goes slack and the load hangs from the other alone
function tandemHang(A, L, p, g, W) {
  if (p[1] < p[0]) { // solve with the pick line pointing the other way, then mirror back
    const m = tandemHang(A.map(a => ({ s: -a.s, y: a.y })), L, p.map(x => -x), { c: -g.c, e: g.e }, W); if (!m) return null;
    return { ...m, pose: { ...m.pose, al: -m.pose.al, P: m.pose.P.map(q => ({ s: -q.s, y: q.y })), G: { s: -m.pose.G.s, y: m.pose.G.y } }, u: m.u.map(u => ({ s: -u.s, y: u.y })) };
  }
  const pose = tandemPose(A, L, p, g);
  const tn = pose ? tandemTension(pose, A, W) : null;
  if (pose && tn && tn.T[0] >= -1e-6 * W && tn.T[1] >= -1e-6 * W) return { pose, ...tn, slack: -1 };
  for (const j of [0, 1]) { // hang from line j alone: its pick straight under its boom head, the centre of gravity straight under the pick
    const o = 1 - j, Pj = { s: A[j].s, y: A[j].y - L[j] }, dc = g.c - p[j];
    // tilt α that puts G under Pj: (g.c − p_j)·cosα − g.e·sinα = 0, taking the root with G below the pick
    let al = Math.atan2(dc, g.e); if (dc * Math.sin(al) + g.e * Math.cos(al) > 0) al += Math.PI; al = Math.atan2(Math.sin(al), Math.cos(al));
    const Po = { s: Pj.s + (p[o] - p[j]) * Math.cos(al), y: Pj.y + (p[o] - p[j]) * Math.sin(al) };
    if (Math.hypot(A[o].s - Po.s, A[o].y - Po.y) <= L[o] + 1e-6)
      return { pose: { al, P: j === 0 ? [Pj, Po] : [Po, Pj], G: { s: Pj.s, y: Pj.y - Math.hypot(dc, g.e) } }, T: j === 0 ? [W, 0] : [0, W], u: [{ s: 0, y: 1 }, { s: 0, y: 1 }], res: 0, slack: o };
  }
  return null;
}

// ---------- the whole tandem for one lift ----------
// Returns the lead crane's lift result (pick 0, carrying its share) with `.tandem` holding every crane's numbers and the checks.
function computeTandem(plan, craneList, settings, load, li) {
  const T = tandemOf(load); if (!T) return null;
  const S = settings || DEFAULT_SETTINGS; const derate = num(T.derate) > 0 ? num(T.derate) : num(S.tandemDerate, TANDEM_DERATE);
  const contOn = load.contOn !== false && !load.empty; const Wl = load.empty ? 0 : r2(num(load.w) * (1 + (contOn ? num(load.cont) : 0) / 100));
  const axis = num(T.axis) * D2R, ax = { x: Math.cos(axis), y: Math.sin(axis) }, nx = { x: -ax.y, y: ax.x };
  const lead = sitePlanStateT(plan);                                                    // where the lead crane stands
  const picks = T.picks.slice(0, 4).map((pk, k) => ({ k, crane: Math.max(0, Math.round(num(pk.crane, k))), x: num(pk.x), z: num(pk.z), R: Math.max(1, num(pk.R, 10)), psi: num(pk.psi), side: sideOf(pk.side), tk: num(pk.tk), hb: pk.hb, cap: pk.cap, mv: { boom: num(pk.mv?.boom), swing: num(pk.mv?.swing), hoist: num(pk.mv?.hoist) } }));
  const out = { derate, W: Wl, picks: [], checks: [], axis: num(T.axis), cog: { x: num(T.cog), z: num(T.cogZ), h: num(T.cogH) }, li, dim: { l: num(load.l, 2), h: num(load.h, 1.5), shape: load.shape || 'box', name: load.name || '' } };
  // pick 0 is the lift itself: the lead crane is the lift's crane (load.crane), stands where the plan puts it and lifts over the lift's side
  picks[0].crane = rigIndexOf(plan, load); picks[0].side = sideOf(load); picks[0].psi = normDeg(boomHeadingFor(plan, load) + 180); picks[0].own = true;
  const P0 = { x: lead.cx + picks[0].R * Math.cos((picks[0].psi + 180) * D2R), y: lead.cy + picks[0].R * Math.sin((picks[0].psi + 180) * D2R) };
  const seen = new Set(); let dup = false; for (const pk of picks) { if (seen.has(pk.crane)) dup = true; seen.add(pk.crane); }
  if (dup) out.checks.push({ s: 'fail', t: 'Tandem cranes', m: 'Each lifting point needs its own crane — two points use the same crane.' });
  const nR = Math.max(1, (plan.cranes || []).length); const gone = picks.filter(pk => pk.crane >= nR);
  if (gone.length) { out.checks.push({ s: 'fail', t: 'Tandem cranes', m: `Crane ${gone.map(g => g.crane + 1).join(', ')} is no longer on the plan — pick another crane for that lifting point.` }); gone.forEach(pk => { pk.crane = picks[0].crane; }); }
  // each crane's own set-up (its parked fields), its record and its geometry at the planned reach
  const view = (pk) => { const pv = rigOf(plan, pk.crane); const cr = craneList.find(c => c.id === pv.craneId) || craneList[0]; return { pv, cr }; };
  // pick 0 keeps the lift's own positioning (reach, boom angle or tip height held) and its own tackles; the others hang at their reach
  const baseLoad = (pk, w, R) => pk.own && R == null ? { ...load, tandem: null, w: r2(w), cont: 0, contOn: false, area: 0, empty: false }
    : { ...load, tandem: null, w: r2(w), cont: 0, contOn: false, tackles: pk.own ? load.tackles : [], tk: pk.own ? load.tk : pk.tk, hb: pk.own ? load.hb : pk.hb ?? '', extra: pk.own ? load.extra : 0, R: r2(R), by: 'radius', side: pk.side, area: 0, capOverride: pk.own ? load.capOverride : pk.cap ?? '', empty: false, colIdx: pk.own ? load.colIdx : '' };
  for (const pk of picks) { const { pv, cr } = view(pk); pk.pv = pv; pk.cr = cr; pk.g0 = computeLoad(pv, cr, baseLoad(pk, 0, pk.own ? null : pk.R), S); if (pk.own) pk.R = pk.g0.R; }
  { const P0b = { x: lead.cx + picks[0].R * Math.cos((picks[0].psi + 180) * D2R), y: lead.cy + picks[0].R * Math.sin((picks[0].psi + 180) * D2R) }; P0.x = P0b.x; P0.y = P0b.y; }
  for (const pk of picks) {
    const along = pk.x - picks[0].x, across = pk.z - picks[0].z;
    pk.pos = { x: P0.x + along * ax.x + across * nx.x, y: P0.y + along * ax.y + across * nx.y };
    pk.base = { x: pk.pos.x + pk.R * Math.cos(pk.psi * D2R), y: pk.pos.y + pk.R * Math.sin(pk.psi * D2R) }; // the crane's slew centre
    pk.boomHd = normDeg(pk.psi + 180);                                                 // boom heading: crane → pick
  }
  // static shares (plumb lines) — the plan as drawn
  const cx = num(T.cog), cz = num(T.cogZ), e = num(T.cogH);
  const inside = picks.length === 2 ? cx >= Math.min(picks[0].x, picks[1].x) - 1e-6 && cx <= Math.max(picks[0].x, picks[1].x) + 1e-6 : true;
  const st = tandemStatic(picks.map(p => ({ x: p.x, z: p.z })), Wl, cx, cz);
  picks.forEach((pk, k) => { pk.static = r2(st[k]); });
  // two cranes: solve the moves for real
  let live = null;
  if (picks.length === 2 && picks.every(p => p.g0.geo?.tip)) {
    const anchor = (pk, moved) => {
      const g0 = pk.g0; const ang0 = g0.gChart?.kind === 'luffing' ? g0.geo.gamma : g0.geo.theta;
      let R = pk.R, y = g0.geo.tip.y;
      if (moved && pk.mv.boom) { const tp = tipFromAngle(pk.cr, g0.gChart, g0.gCol, ang0 + pk.mv.boom, g0.boomOv); R = tp.x; y = tp.y; }
      const hd = (pk.boomHd + (moved ? pk.mv.swing : 0)) * D2R; const tip = { x: pk.base.x + R * Math.cos(hd), y: pk.base.y + R * Math.sin(hd) };
      const d = { x: tip.x - pk.pos.x, y: tip.y - pk.pos.y };
      return { R, tipY: y, tip, s: pk.x + d.x * ax.x + d.y * ax.y, n: d.x * nx.x + d.y * nx.y };
    };
    const pickY = Math.min(...picks.map(p => p.g0.geo.tip.y)) - Math.max(3, ...picks.map(p => num(p.g0.rigH, 3) + 2));
    const L0 = picks.map(p => p.g0.geo.tip.y - pickY);
    const A1 = picks.map(p => anchor(p, true)); const L1 = L0.map((L, k) => Math.max(0.5, L - picks[k].mv.hoist));
    const sol = tandemHang(A1.map(a => ({ s: a.s, y: a.tipY })), L1, picks.map(p => p.x), { c: cx, e }, Wl);
    if (sol) {
      const tiltDeg = r2(sol.pose.al * R2D);
      live = { tilt: tiltDeg, slack: sol.slack, res: sol.res, rise: r2(sol.pose.G.y - (pickY + e)), anchors: A1, L: L1, pickY, pose: sol.pose };
      picks.forEach((pk, k) => {
        const u = sol.u[k], Tk = Math.max(0, sol.T[k]);
        pk.share = r2(Tk * u.y); pk.line = r2(Tk); pk.horiz = r2(Tk * u.s); pk.lineAng = r2(Math.atan2(u.s, u.y) * R2D);
        pk.across = r2(A1[k].n); pk.Rnow = r2(A1[k].R); pk.tipYnow = r2(A1[k].tipY);
        const bd = { x: Math.cos(pk.boomHd * D2R), y: Math.sin(pk.boomHd * D2R) }; const along = ax.x * bd.x + ax.y * bd.y; // the pick line seen by this boom
        pk.radial = r2(pk.horiz * along); pk.sideLoad = r2(Math.abs(pk.horiz * Math.sqrt(Math.max(0, 1 - along * along))));
      });
    }
  }
  if (!live) picks.forEach(pk => { pk.share = pk.static; pk.line = pk.static; pk.horiz = 0; pk.lineAng = 0; pk.Rnow = pk.R; pk.radial = 0; pk.sideLoad = 0; });
  // each crane's own lift check with its share (at the reach it has after the move)
  for (const pk of picks) {
    const moved = pk.mv.boom || pk.mv.swing || pk.mv.hoist;
    pk.res = computeLoad(pk.pv, pk.cr, baseLoad(pk, pk.share, pk.own && !moved ? null : pk.Rnow), S); pk.res.crane = pk.cr; pk.res.rigI = pk.crane;
    pk.util = pk.res.util; pk.cap = pk.res.cap; pk.pct = Wl > 0 ? r2(pk.share / Wl * 100) : 0; pk.shift = r2(pk.share - pk.static);
    const nm = `Crane ${pk.crane + 1}`;
    if (pk.res.cap == null) out.checks.push({ s: 'fail', t: `Tandem · ${nm}`, m: `No capacity at ${(+pk.Rnow).toFixed(2)} m — ${pk.res.capInfo?.why || 'out of the chart'}` });
    else out.checks.push({ s: pk.util > derate ? 'fail' : pk.util > derate * 0.9 ? 'warn' : 'ok', t: `Tandem · ${nm}`, m: `${pk.share.toFixed(2)} t of the load (${pk.pct.toFixed(0)}%) + hook and rigging = ${pk.res.design.toFixed(2)} t: ${pk.util.toFixed(1)}% of its ${pk.cap.toFixed(2)} t — tandem limit ${derate}%` });
    if (Math.abs(pk.lineAng) > TANDEM_LINE[0]) out.checks.push({ s: Math.abs(pk.lineAng) > TANDEM_LINE[1] ? 'fail' : 'warn', t: `Hoist line · ${nm}`, m: `${Math.abs(pk.lineAng).toFixed(1)}° out of plumb — pulls ${Math.abs(pk.horiz).toFixed(2)} t sideways on the boom head` + (pk.sideLoad > 0.01 ? ` (${pk.sideLoad.toFixed(2)} t across the boom)` : '') + '. Keep the hoist lines plumb.' });
  }
  if (!inside) out.checks.push({ s: 'fail', t: 'Tandem balance', m: 'The centre of gravity is outside the lifting points — the load would tip. Move the lifting points or the slings.' });
  if (live) {
    if (live.slack >= 0) out.checks.push({ s: 'fail', t: 'Tandem balance', m: `Crane ${picks[live.slack].crane + 1}'s line goes slack — the other crane takes the whole load. Undo the last move.` });
    if (Math.abs(live.tilt) > TANDEM_TILT) out.checks.push({ s: 'warn', t: 'Load tilt', m: `The load tilts ${Math.abs(live.tilt).toFixed(1)}° — level it before moving off.` });
    const moved = picks.some(p => p.mv.boom || p.mv.swing || p.mv.hoist);
    if (moved) { const big = picks.reduce((a, p) => (Math.abs(p.shift) > Math.abs(a.shift) ? p : a), picks[0]); out.checks.push({ s: 'info', t: 'Load transfer', m: picks.map(p => `Crane ${p.crane + 1} ${p.static.toFixed(2)} → ${p.share.toFixed(2)} t`).join(' · ') + (Math.abs(big.shift) > 0.005 ? ` (${big.shift > 0 ? '+' : ''}${big.shift.toFixed(2)} t on crane ${big.crane + 1})` : '') }); }
  } else if (picks.length > 2) out.checks.push({ s: 'info', t: 'Tandem share', m: picks.map(p => `Crane ${p.crane + 1} ${p.share.toFixed(2)} t`).join(' · ') + ' — hoist lines kept plumb (moves are worked out for two cranes)' });
  out.live = live; out.picks = picks.map(pk => ({ k: pk.k, crane: pk.crane, model: pk.cr?.model, x: pk.x, z: pk.z, R: pk.R, Rnow: pk.Rnow, psi: pk.psi, boomHd: pk.boomHd, side: pk.side, pos: pk.pos, base: pk.base,
    static: pk.static, share: pk.share, pct: pk.pct, shift: pk.shift, line: pk.line, lineAng: pk.lineAng, horiz: pk.horiz, radial: pk.radial, sideLoad: pk.sideLoad, util: pk.util, cap: pk.cap, design: pk.res.design, hb: pk.res.hb, tk: pk.res.tk,
    across: pk.across || 0, tipY: pk.tipYnow ?? pk.g0.geo?.tip?.y, mv: pk.mv, res: pk.res }));
  out.status = out.checks.some(c => c.s === 'fail') ? 'fail' : out.checks.some(c => c.s === 'warn') ? 'warn' : 'ok';
  out.maxUtil = Math.max(0, ...out.picks.map(p => p.util || 0));
  // the lead crane's result stands for the lift; each crane's own capacity line is replaced by its tandem line (against the tandem limit)
  const res = out.picks[0].res; res.tandem = out; res.tandemLead = true;
  res.checks = res.checks.filter(c => c.t !== 'Capacity utilisation'); for (const c of out.checks) res.checks.push(c);
  tandemMergeChecks(res);
  return res;
}
// copy the other cranes' problems (geometry, headroom, clearance, their leg loads …) into the lead result with their crane number.
// Called again by computePlan once the leg checks exist; each check is copied once.
function tandemMergeChecks(res) {
  const T = res.tandem; if (!T) return;
  for (const p of T.picks.slice(1)) for (const c of p.res.checks) {
    if (c._copied || (c.s !== 'fail' && c.s !== 'warn') || c.t === 'Capacity utilisation') continue;
    c._copied = true; res.checks.push({ ...c, t: `Crane ${p.crane + 1} · ${c.t}` });
  }
  res.status = res.checks.some(c => c.s === 'fail') ? 'fail' : res.checks.some(c => c.s === 'warn') ? 'warn' : 'ok';
}
// sitePlanState lives in draw.js (loaded later in the bundle, absent in some Node tests) — the lead crane's position only
function sitePlanStateT(plan) { const sp = plan?.sitePlan || {}; return { cx: num(sp.cx), cy: num(sp.cy) }; }


// ===== v10: the tandem lift in the 2D elevation (app canvas, A1 sheet and report) =====
// The picture uses the LEAD crane's own elevation frame: x runs from its slew centre towards its lifting point, y up from the ground. Everything is
// projected onto the vertical plane through the pick line (the second crane is drawn in its own boom plane, with its boom head over its lifting
// point, so hoist lines hang as the engine worked them out). The two cranes face each other; each is drawn with the same body code as a single crane.
// Nothing here changes a number — it only draws what computeTandem returned.
function tandemElevModel(plan, res) {
  const TD = res && res.tandem; if (!TD || !Array.isArray(TD.picks) || TD.picks.length < 2) return null;
  const pks = TD.picks, p0 = pks[0], p1 = pks[1];
  if (!p0.res?.geo?.tip || !p1.res?.geo?.tip || !p0.pos || !p1.pos || !p0.base || !p1.base) return null;
  const ax = { x: Math.cos(num(TD.axis) * D2R), y: Math.sin(num(TD.axis) * D2R) };
  const live = TD.live && TD.live.pose && Array.isArray(TD.live.pose.P) && TD.live.pose.P.length >= 2 ? TD.live : null;
  const sAt = (pk, q) => pk.x + (q.x - pk.pos.x) * ax.x + (q.y - pk.pos.y) * ax.y;          // position along the pick line (m)
  const sBase = (pk) => sAt(pk, pk.base);
  const sHead = (pk) => { const hd = (num(pk.boomHd) + (live ? num(pk.mv?.swing) : 0)) * D2R, R = live ? num(pk.Rnow, pk.R) : num(pk.R); return sAt(pk, { x: pk.base.x + R * Math.cos(hd), y: pk.base.y + R * Math.sin(hd) }); };
  const sH0 = sHead(p0), sgn = sH0 - sBase(p0) >= 0 ? 1 : -1, xh0 = num(p0.res.R);
  const fx = (s) => xh0 + sgn * (s - sH0);
  const cranes = [p0, p1].map((pk, k) => {
    const crane = pk.res.crane, geo = pk.res.geo, R = num(pk.res.R), dS = sHead(pk) - sBase(pk);
    const d = k === 0 ? 1 : Math.abs(dS) < 0.02 ? -1 : sgn * (dS > 0 ? 1 : -1);               // +1: boom points right in the picture, −1: left
    const xh = fx(sHead(pk)), xc = xh - d * R;
    const body = typeof liftBodyCrane === 'function' ? liftBodyCrane(crane, pk.side) : crane;
    const drw = craneDrawing(body), cbx = !drw && typeof customBody === 'function' ? customBody(crane) : null;
    let bx0 = drw ? Math.max(-16, drw.bbox[0]) - 1.5 : cbx ? Math.max(-30, customBBox(cbx)[0]) - 1.5 : -Math.max(num(crane.tail, 4), num(crane.outTrans, 7) / 2) - 1.5;
    const bx1 = drw ? Math.max(drw.bbox[2], 3) + 1 : cbx ? Math.max(3, customBBox(cbx)[2]) + 1 : Math.max(0.64 * num(crane.carrierLen, 12), 4) + 1;
    if (body._endDeck != null) bx0 = Math.min(bx0, -num(crane.outTrans, 7) / 2 - 1.5);
    if (pk.res.acc?.superlift) bx0 = Math.min(bx0, -num(pk.res.acc.slRadius, 15) - 4);
    return { k, pk, crane, body, geo, res: pk.res, d, xc, xh, R, tipY: geo.tip.y, x0: d > 0 ? xc + bx0 : xc - bx1, x1: d > 0 ? xc + bx1 : xc - bx0, pv: typeof rigOf === 'function' ? rigOf(plan, pk.crane) : plan };
  });
  // the load: a box of its real length and height, hanging from the lifting points (level, or tilted as the two-line solve settled it)
  const dim = TD.dim || {}, l = Math.max(0.1, num(dim.l, 2)), h = Math.max(0.1, num(dim.h, 1.5));
  const cogC = num(TD.cog?.x), cogH = TD.cog && TD.cog.h != null ? num(TD.cog.h) : -h / 2;
  const yP0 = num(p0.res.landY) - (cogH - h / 2);                                              // pick plane: the load stands on its landing level
  const dy = live ? yP0 - num(live.pickY) : 0, al = live ? num(live.pose.al) : 0, ca = Math.cos(al), sa = Math.sin(al);
  const Ps = pks.map((pk, k) => (live && k < 2 ? { s: live.pose.P[k].s, y: live.pose.P[k].y + dy } : { s: pk.x, y: yP0 }));
  const at = (c, e) => ({ s: Ps[0].s + (c - p0.x) * ca - e * sa, y: Ps[0].y + (c - p0.x) * sa + e * ca });
  const W = (q) => ({ x: fx(q.s), y: q.y });
  const poly = [at(cogC - l / 2, cogH - h / 2), at(cogC + l / 2, cogH - h / 2), at(cogC + l / 2, cogH + h / 2), at(cogC - l / 2, cogH + h / 2)].map(W);
  const picks = pks.map((pk, k) => ({ k, pk, ...W(Ps[k]) })), cog = W(at(cogC, cogH));
  for (const c of cranes) { // hook block: its underside sits the rigging height above the lifting point
    const hk = typeof hookOf === 'function' ? hookOf(c.crane) : null, blkH = hk ? hk.h : Math.max(0.9, Math.min(2.2, 0.6 + num(c.crane.cls, 100) / 400));
    c.hk = hk; c.blkH = blkH; c.blkW = hk ? hk.w : Math.max(0.6, blkH * 0.55); c.xp = picks[c.k].x; c.hookBot = picks[c.k].y + Math.max(0.2, num(c.res.rigH, 3)); c.blkTop = c.hookBot + blkH;
  }
  const xs = [...cranes.flatMap(c => [c.x0, c.x1, c.xh]), ...poly.map(q => q.x)];
  return { TD, live, sgn, cranes, picks, poly, cog, l, h, shape: dim.shape || 'box', W: num(TD.W), xmin: Math.min(...xs), xmax: Math.max(...xs), ytop: Math.max(...cranes.map(c => c.tipY), ...poly.map(q => q.y)), more: pks.length - 2, dPlan: Math.hypot(p1.base.x - p0.base.x, p1.base.y - p0.base.y) };
}
// room for both cranes, the load and the crane labels (merged into the lead crane's extents by elevationExtents)
function tandemElevExtents(ext, plan, res) {
  let M = null; try { M = tandemElevModel(plan, res); } catch (e) { M = null; }
  if (!M) return ext;
  return { xmin: Math.min(ext.xmin, M.xmin - 2), xmax: Math.max(ext.xmax, M.xmax + 3), ymin: ext.ymin, ymax: Math.max(ext.ymax, M.ytop + 2) + 6 };
}
// both cranes (body + boom), hook blocks, hoist lines, the load, centre of gravity, lifting points and the crane labels. Returns what the dimensions need.
function tandemDrawRig(P, T, k, plan, M, o = {}) {
  const ds = o.dimSize || 4.4, avoid = []; const TD = M.TD;
  for (const c of M.cranes) {
    const Tk = (x, y) => T(c.xc + c.d * x, y);
    const sd = sideOf(c.pk.side); if (c.body._endDeck != null) drawCarrierEndView(P, Tk, c.crane, c.pv, c.body._endDeck, c.d > 0 ? sd : sd === 'left' ? 'right' : sd === 'right' ? 'left' : sd);
    const ce = drawCraneElevation(P, Tk, k, c.body, c.geo, c.res, c.pv, { livery: o.livery }); c.cad = ce?.cad; c.T = Tk;
    for (const [a, b] of c.geo.segments || []) { const p = Tk(a.x, a.y), q = Tk(b.x, b.y); avoid.push([p[0], p[1], q[0], q[1]]); }
  }
  // load
  const pts = M.poly.map(q => T(q.x, q.y)); const shape = M.shape;
  P.poly(pts, { closed: true, stroke: '#1d1d1d', w: 0.2, fill: shape === 'container' ? '#7a8fa6' : shape === 'tc' ? '#7cd65a' : shape === 'chiller' ? '#c3cad3' : shape === 'bundle' ? '#8d9298' : '#d8d8d8', layer: 'LOAD' });
  if (shape === 'box' || shape === 'beam') { P.line(pts[0][0], pts[0][1], pts[2][0], pts[2][1], { stroke: '#999', w: 0.1, layer: 'LOAD' }); P.line(pts[3][0], pts[3][1], pts[1][0], pts[1][1], { stroke: '#999', w: 0.1, layer: 'LOAD' }); }
  for (let i = 0; i < 4; i++) { const a = pts[i], b = pts[(i + 1) % 4]; avoid.push([a[0], a[1], b[0], b[1]]); }
  // hoist lines, hook blocks, rigging down to the lifting points
  for (const c of M.cranes) {
    const pt = M.picks[c.k], hk = c.hk, blkH = c.blkH;
    const fall = hk ? Math.max(0.12, Math.min(0.42, hk.w * 0.2)) : 0.3, sheaveY = c.geo.tip.y - (c.cad ? c.cad.sheaveR * 0.6 : 0.25);
    const sty = { stroke: '#1d1d1d', w: 0.16, layer: 'HOOK' };
    for (const dx of [-fall, fall]) { const a = T(c.xh + dx, sheaveY), b = T(pt.x + dx, c.blkTop - 0.05); P.line(a[0], a[1], b[0], b[1], sty); avoid.push([a[0], a[1], b[0], b[1]]); }
    if (hk) emitItems(P, hk.items, hk.pal, (x, y) => T(pt.x + x * hk.s, c.blkTop + y * hk.s), { tint: null, w: 0.08, layer: 'HOOK' });
    else P.poly([T(pt.x - c.blkW / 2, c.blkTop), T(pt.x + c.blkW / 2, c.blkTop), T(pt.x + c.blkW / 2, c.hookBot + blkH * 0.35), T(pt.x - c.blkW / 2, c.hookBot + blkH * 0.35)], { closed: true, stroke: '#222', w: 0.18, fill: '#e3b505', layer: 'HOOK' });
    const a = T(pt.x, c.hookBot), b = T(pt.x, pt.y); P.line(a[0], a[1], b[0], b[1], { stroke: '#5a3a12', w: 0.24, layer: 'RIGGING' });
  }
  // lifting points (all of them), centre of gravity
  for (const pt of M.picks) { const q = T(pt.x, pt.y); P.circle(q[0], q[1], 0.9, { fill: '#7a007a', stroke: 'none', layer: 'SITE-LOAD' }); if (pt.k >= 2) P.text(q[0], q[1] - 2.6, `C${pt.pk.crane + 1} ${(+pt.pk.share).toFixed(1)}T`, { size: ds * 0.65, bold: true, anchor: 'middle', color: '#7a007a', bg: '#ffffff', layer: 'SITE-LOAD' }); }
  { const g = T(M.cog.x, M.cog.y), r = 1.5; P.circle(g[0], g[1], r, { stroke: '#000', w: 0.2, fill: '#ffffff', layer: 'LOAD' });
    for (const [a0, a1] of [[0, 90], [180, 270]]) { const arc = [[g[0], g[1]]]; for (let i = 0; i <= 8; i++) { const an = (a0 + (a1 - a0) * i / 8) * D2R; arc.push([g[0] + r * Math.cos(an), g[1] - r * Math.sin(an)]); } P.poly(arc, { closed: true, fill: '#000', stroke: 'none', layer: 'LOAD' }); }
    P.text(g[0], g[1] + r + ds * 0.55, 'C.O.G.', { size: ds * 0.55, anchor: 'middle', vAlign: 'middle', color: '#000', bg: '#ffffff', layer: 'LOAD' });
    const lc = [(pts[0][0] + pts[2][0]) / 2, (pts[0][1] + pts[2][1]) / 2]; const lt = `${M.W.toFixed(1)}T`; P.text(lc[0], lc[1] - r - ds * 0.35, lt, { size: ds * 0.8, bold: true, anchor: 'middle', vAlign: 'middle', color: '#000', bg: '#ffffff', layer: 'LOAD' }); }
  if (M.more > 0) { const hb = Math.max(M.cranes[0].blkTop, M.cranes[1].blkTop), tp = Math.min(M.cranes[0].tipY, M.cranes[1].tipY), hx = (M.cranes[0].xh + M.cranes[1].xh) / 2, hy = hb + Math.max(1.5, (tp - hb) * 0.5); const q = T(hx, hy); // between the two hoist lines, half way up
    P.text(q[0], q[1], `+${M.more} MORE CRANE${M.more > 1 ? 'S' : ''} — SEE SITE PLAN`, { size: ds * 0.7, bold: true, anchor: 'middle', vAlign: 'middle', color: '#7a007a', bg: '#ffffff', layer: 'SITE-LOAD' }); }
  // crane labels: C1 / C2, share (t and %), utilisation against the derated chart — above each boom head, on the outer side
  for (const c of M.cranes) {
    const pk = c.pk, cap = pk.cap, der = cap != null ? cap * TD.derate / 100 : null, u = cap != null && pk.util != null ? pk.util / TD.derate * 100 : null;
    const L = [`C${pk.crane + 1} · ${String(pk.model || c.crane.model || '').toUpperCase()}`, `${(+pk.share).toFixed(2)}T · ${(+pk.pct).toFixed(0)}%`, u != null ? `${u.toFixed(1)}% OF DERATED ${der.toFixed(1)}T` : 'NO CAPACITY'];
    const H = T(c.xh, c.tipY), sz = ds * 0.78, lh = sz * 1.28, outer = c.d > 0 ? -1 : 1, bad = u == null || u > 100;
    const x = H[0] - outer * 2, y0 = H[1] - 14;   // starts over the head and runs outwards, clear of the boom-length dimension
    L.forEach((s, i) => P.text(x, y0 - (L.length - 1 - i) * lh, s, { size: i === 0 ? sz * 1.05 : sz, bold: i < 2, anchor: outer < 0 ? 'end' : 'start', vAlign: 'middle', color: i === 2 && bad ? COL.red : '#000', bg: '#ffffff', layer: 'DIMTEXT' }));
    const wd = Math.max(...L.map(s => textW(s, sz, true))); avoid.push([x - (outer < 0 ? wd : 0), y0 - 2.5 * lh, x + (outer < 0 ? 0 : wd), y0 - 2.5 * lh], [x - (outer < 0 ? wd : 0), y0 + lh, x + (outer < 0 ? 0 : wd), y0 + lh]);
  }
  return { avoid };
}
// dimensions: each crane's radius, distance between slew centres, hook heights, boom angle and length of the second crane. `o.hdim(x0, x1, y0w, y1w, row, label, size)` draws a row under the ground.
function tandemElevDims(P, T, k, plan, M, o) {
  const ds = o.dimSize || 4.4; let row = o.row; const c0 = M.cranes[0], c1 = M.cranes[1];
  // radius of the second crane (same row as the lead's when they do not overlap)
  const a = Math.min(c1.xh, c1.xc), b = Math.max(c1.xh, c1.xc), lead = Math.max(c0.xh, c0.xc);
  o.hdim(a, b, 0, 0, a > lead + 0.5 ? 0 : row++, String(mm(c1.R)), ds);
  // distance between the slew centres (the true plan distance when the cranes are not in line)
  const dr = Math.abs(c1.xc - c0.xc), lab = Math.abs(dr - M.dPlan) <= Math.max(0.05, 0.02 * M.dPlan) ? String(mm(dr)) : `${mm(M.dPlan)} (PLAN)`;
  o.hdim(Math.min(c0.xc, c1.xc), Math.max(c0.xc, c1.xc), 0, 0, row++, lab, ds);
  // hook heights: outside the load, ground to the underside of each hook block
  const left = M.cranes[0].xh <= M.cranes[1].xh ? M.cranes[0] : M.cranes[1], right = left === M.cranes[0] ? M.cranes[1] : M.cranes[0];
  const xl = Math.min(...M.poly.map(q => q.x), left.xp) - 1.8, xr = Math.max(...M.poly.map(q => q.x), right.xp) + 1.8;
  for (const [c, xd, sd] of [[left, xl, 'left'], [right, xr, 'right']]) {
    const g = T(xd, 0), t = T(xd, c.hookBot), e = T(c.xp + (xd < c.xp ? -1 : 1) * (c.blkW / 2 + 0.2), c.hookBot);
    P.line(t[0] + (xd < c.xp ? -1.2 : 1.2), t[1], e[0], e[1], { stroke: COL.red, w: 0.12, layer: 'DIM' });
    dimA(P, g, t, 0, String(mm(c.hookBot)), { side: sd, size: ds, extA: false, extB: false });
  }
  // second crane: boom length and boom angle in its own mirrored frame
  { const c = c1, A = c.geo.pivot, deg = c.geo.kind === 'main' ? c.geo.theta : c.geo.theta, Lm = c.geo.kind === 'main' ? c.geo.L : c.geo.Lb, u = [Math.cos(deg * D2R), Math.sin(deg * D2R)];
    const cad = craneDrawing(c.crane), top = cad && cad.v === 2 ? Math.max(0.2, cad.secs[0].n1) : num(c.crane.boomDepth, 1.2) * 0.6;
    const p = c.T(A.x, A.y), q = c.T(A.x + Lm * u[0], A.y + Lm * u[1]); dimA(P, p, q, Math.max(5, top * k + 4.5), String(mm(Lm)), { side: 'up', size: ds });
    const rr = Math.max(13, Math.min(34, Math.max(6.5, Lm * 0.3) * k)), th = c.geo.theta, ea = th * D2R, am = th / 2 * D2R, dd = c.d;
    if (dd > 0) P.arc(p[0], p[1], rr, 0, th, { stroke: COL.red, w: 0.14, layer: 'DIM' }); else P.arc(p[0], p[1], rr, 180 - th, 180, { stroke: COL.red, w: 0.14, layer: 'DIM' });
    P.line(p[0] + dd * (rr - 2.2), p[1], p[0] + dd * (rr + 2.2), p[1], { stroke: COL.red, w: 0.14, layer: 'DIM' });
    arrow(P, p[0] + dd * rr * Math.cos(ea), p[1] - rr * Math.sin(ea), dd > 0 ? -ea - Math.PI / 2 : ea + 3 * Math.PI / 2, { stroke: COL.red, al: 1.8, aw: 0.5 });
    P.text(p[0] + dd * Math.cos(am) * (rr + 3.6), p[1] - Math.sin(am) * (rr + 3.6), (Math.round(th * 10) / 10).toFixed(1).replace(/\.0$/, '') + '°', { size: ds, color: COL.green, anchor: dd > 0 ? 'start' : 'end', vAlign: 'middle', layer: 'DIMTEXT', bg: '#ffffff' }); }
  return row;
}
// the TANDEM block of the A1 data panel: one row per fact. `mk(id, label, value)` makes a sheet row (so typed-over values work like everywhere else).
function tandemSheetRows(i, r, mk) {
  const TD = r && r.tandem; if (!TD) return [];
  const n = TD.picks.length, rows = [], der = TD.derate, compact = n > 2;
  const t2 = (v) => v == null || !isFinite(v) ? '—' : (+v).toFixed(2) + 'T';
  rows.push(mk(`d${i}.type`, 'LIFT TYPE', `TANDEM · ${n} CRANES`));
  rows.push(mk(`d${i}.derate`, 'TANDEM LIMIT (DERATE)', `${der}% OF CHART`));
  rows.push(mk(`d${i}.load`, 'LOAD, ALL CRANES', t2(TD.W)));
  TD.picks.forEach((p, k) => {
    const c = `C${p.crane + 1}`, cap = p.cap, dc = cap != null ? cap * der / 100 : null, u = cap != null && p.util != null ? p.util : null, du = u != null ? u / der * 100 : null;
    const line = `${Math.abs(num(p.lineAng)).toFixed(1)}°`;
    rows.push(mk(`d${i}.c${k}.share`, `${c} SHARE`, `${t2(p.share)} · ${(+p.pct).toFixed(0)}%`));
    if (compact) {
      rows.push(mk(`d${i}.c${k}.cap`, `${c} R / CHART / DERATED`, `${(+p.Rnow).toFixed(1)}M / ${cap != null ? cap.toFixed(1) : '—'}T / ${dc != null ? dc.toFixed(1) : '—'}T`));
      rows.push(mk(`d${i}.c${k}.util`, `${c} UTIL. / LINE`, `${du != null ? du.toFixed(1) + '% DERATED' : '—'} · ${line}`));
    } else {
      rows.push(mk(`d${i}.c${k}.radius`, `${c} RADIUS`, fmtM(p.Rnow)));
      rows.push(mk(`d${i}.c${k}.cap`, `${c} CHART CAPACITY`, t2(cap)));
      rows.push(mk(`d${i}.c${k}.der`, `${c} DERATED CAPACITY`, t2(dc)));
      rows.push(mk(`d${i}.c${k}.util`, `${c} UTILISATION`, u != null ? `${u.toFixed(1)}% CHART · ${du.toFixed(1)}% DERATED` : '—'));
      rows.push(mk(`d${i}.c${k}.line`, `${c} HOIST LINE`, `${line} OUT OF PLUMB`));
    }
  });
  return rows;
}

if (typeof module !== 'undefined') module.exports = { TANDEM_DERATE, tandemMergeChecks, tandemOf, tandemDefault, tandemStatic, tandemPose, tandemTension, tandemHang, computeTandem, tandemElevModel, tandemElevExtents, tandemSheetRows };
