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
  const out = { derate, W: Wl, picks: [], checks: [], axis: num(T.axis), cog: { x: num(T.cog), z: num(T.cogZ), h: num(T.cogH) } };
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

if (typeof module !== 'undefined') module.exports = { TANDEM_DERATE, tandemMergeChecks, tandemOf, tandemDefault, tandemStatic, tandemPose, tandemTension, tandemHang, computeTandem };
