// ===== 2D crane elevation: Habib's blocks or brand bodies drawn from the crane's real dimensions, procedural telescopic boom, accessories =====
const BRAND = {
  sany: { accent: '#c8102e', cw: '#56595e', glass: '#9cc4dc', cab: 'angular' },
  zoomlion: { accent: '#1d63b3', cw: '#62676d', glass: '#a5cde2', cab: 'round' },
  demag: { accent: '#262626', cw: '#4f5358', glass: '#9cc4dc', cab: 'box' },
  liebherr: { accent: '#262626', cw: '#4f5358', glass: '#9cc4dc', cab: 'box' },
  generic: { accent: '#333333', cw: '#5a5e63', glass: '#9cc4dc', cab: 'box' }
};
function brandOf(crane) { const m = String(crane?.make || '').toLowerCase(); return BRAND[m] ? m : 'generic'; }
function matDims(s) { const [a, b] = String(s || '1.0x1.0').toLowerCase().replace(/m/g, '').split('x').map(v => num(v, 1)); return [a || 1, b || a || 1]; }

// block bodies sometimes carry stray far-away linework (jibs, notes) — keep only what sits around the machine
function cleanBody(d) {
  if (d._clean) return d._clean;
  d._clean = d.body.filter(([, , fl]) => { for (let i = 0; i < fl.length; i += 2) { const x = fl[i] / 100, y = fl[i + 1] / 100; if (x < -16 || x > 16 || y < -1.5 || y > 14) return false; } return true; });
  return d._clean;
}
function blockStroke(d) { // dominant outline colour of a block (blue for the truck-crane block, black for Liebherr)
  if (d._stroke) return d._stroke; const c = {};
  for (const [f, ci] of d.body) if (!f) c[ci] = (c[ci] || 0) + 1;
  const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return (d._stroke = top ? d.pal[+top[0]] : '#1d1d1d');
}

// ---------- procedural end-view body (carrier seen end-on, superstructure side-on: the FHE elevation convention) ----------
function drawProcBody(P, T, k, crane, plan) {
  const B = BRAND[brandOf(crane)]; const paint = crane.color || '#f5c400';
  const truck = /truck/i.test(crane.type || '');
  const W = num(crane.width, 2.75), deck = truck ? 1.72 : 1.92, tr = truck ? 0.56 : 0.66, lift = 0.12;
  const oT = num(crane.outTrans, 7) / 2, px = num(crane.pivotX, -1.5), ph = num(crane.pivotH, 3.0), tail = num(crane.tail, 4.5);
  const cwt = num(plan?.cwt ?? crane.cwt, 20);
  const st = { stroke: '#1b1b1b', w: 0.2, layer: 'CRANE' };
  const poly = (pts, s2 = {}) => P.poly(pts.map(([x, y]) => T(x, y)), { closed: true, ...st, ...s2 });
  const rect = (x0, y0, x1, y1, s2 = {}) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], s2);
  const line = (x1, y1, x2, y2, s2 = {}) => { const a = T(x1, y1), c = T(x2, y2); P.line(a[0], a[1], c[0], c[1], { ...st, ...s2 }); };
  const mat = matDims(plan?.matSize);
  // outriggers: beams out to the full spread, jacks, floats, mats
  for (const sx of [-1, 1]) {
    const jx = sx * (oT - 0.25);
    rect(jx - mat[0] / 2, 0, jx + mat[0] / 2, 0.2, { fill: '#8a6d3b', layer: 'MATS' });
    for (let i = 1; i < 4; i++) line(jx - mat[0] / 2 + i * mat[0] / 4, 0.02, jx - mat[0] / 2 + i * mat[0] / 4, 0.18, { w: 0.08, stroke: '#5c4524', layer: 'MATS' });
    poly([[jx - 0.4, 0.2], [jx + 0.4, 0.2], [jx + 0.3, 0.38], [jx - 0.3, 0.38]], { fill: '#3d3d3d' });
    rect(jx - 0.12, 0.38, jx + 0.12, 1.12, { fill: '#b9bcc0' });
    rect(jx - 0.25, 1.0, jx + 0.25, 1.86, { fill: shade(paint, -14) });
    const x0 = sx * (W / 2 - 0.2), x1 = jx + sx * 0.25;
    poly([[x0, 1.12], [x1, 1.12], [x1, 1.5], [x0, 1.5]], { fill: shade(paint, -6) });
    line(x0, 1.31, x1, 1.31, { w: 0.08, stroke: shade(paint, -35) });
  }
  // carrier end view: chassis, tyres (lifted off the ground on outriggers), mudguards
  rect(-W / 2 + 0.25, 0.86, W / 2 - 0.25, deck - 0.12, { fill: shade(paint, -4) });
  for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? W / 2 - 0.66 : -W / 2 + 0.02, x1 = x0 + 0.64;
    poly([[x0 + 0.08, lift], [x1 - 0.08, lift], [x1, lift + 0.12], [x1, lift + 2 * tr - 0.12], [x1 - 0.08, lift + 2 * tr], [x0 + 0.08, lift + 2 * tr], [x0, lift + 2 * tr - 0.12], [x0, lift + 0.12]], { fill: '#232323' });
    for (let i = 1; i < 6; i++) line(x0 + 0.04, lift + i * 2 * tr / 6, x1 - 0.04, lift + i * 2 * tr / 6, { w: 0.06, stroke: '#4a4a4a' });
    rect(sx > 0 ? x0 - 0.12 : x1, lift + tr - 0.18, sx > 0 ? x0 : x1 + 0.12, lift + tr + 0.18, { fill: '#9a9da1', w: 0.1 });
    rect(x0 - 0.04, lift + 2 * tr + 0.03, x1 + 0.04, lift + 2 * tr + 0.16, { fill: paint, w: 0.12 });
  }
  rect(-W / 2, deck - 0.14, W / 2, deck, { fill: '#2e2e2e' });
  rect(-W / 2 + 0.1, deck - 0.36, W / 2 - 0.1, deck - 0.14, { fill: B.accent, stroke: 'none' });
  // slewing ring + superstructure frame
  rect(-1.3, deck, 1.3, deck + 0.18, { fill: '#3a3a3a' });
  const cwW = Math.max(1.3, Math.min(3.2, 1.2 + cwt / 55)), cwH = Math.max(1.1, Math.min(3.4, 0.9 + cwt / 32));
  const fx0 = -tail + cwW * 0.5, fx1 = px + 1.9, fy0 = deck + 0.18, fy1 = deck + 0.95;
  poly([[fx0, fy0], [fx1 - 0.4, fy0], [fx1, fy0 + 0.35], [fx1, fy1], [fx0, fy1]], { fill: paint });
  line(fx0, fy0 + 0.12, fx1 - 0.4, fy0 + 0.12, { w: 0.08, stroke: shade(paint, -30) });
  // counterweight stack (brand-shaped), slabs
  const cx0 = -tail, cx1 = -tail + cwW, cy0 = deck + 0.28, cy1 = cy0 + cwH;
  const cwPts = B.cab === 'angular' ? [[cx0, cy0], [cx1, cy0], [cx1, cy1], [cx0 + 0.35, cy1], [cx0, cy1 - 0.35]]
    : B.cab === 'round' ? [[cx0, cy0], [cx1, cy0], [cx1, cy1], [cx0 + 0.45, cy1], [cx0 + 0.12, cy1 - 0.2], [cx0, cy1 - 0.5]]
    : [[cx0, cy0], [cx1, cy0], [cx1, cy1], [cx0, cy1]];
  poly(cwPts, { fill: B.cw, layer: 'CWT' });
  for (let y = cy0 + 0.42; y < cy1 - 0.15; y += 0.42) line(cx0 + (y > cy1 - 0.5 && B.cab !== 'box' ? 0.3 : 0.02), y, cx1 - 0.02, y, { w: 0.1, stroke: '#2c2e31', layer: 'CWT' });
  // engine house between counterweight and cab
  const hx0 = cx1, hx1 = px - 0.35, hy1 = deck + 1.95;
  if (hx1 > hx0 + 0.3) {
    poly([[hx0, fy1], [hx1, fy1], [hx1, hy1 - 0.25], [hx1 - 0.25, hy1], [hx0, hy1]], { fill: paint });
    for (let x = hx0 + 0.35; x < hx1 - 0.3; x += 0.22) line(x, fy1 + 0.25, x, hy1 - 0.3, { w: 0.07, stroke: shade(paint, -28) });
  }
  // hoist winch sits inside the house (no exposed drum)
  const wx = Math.min(hx1 - 0.6, cx1 + 0.85), wy = deck + 1.45;
  // boom-foot lug + pin
  poly([[px - 0.75, fy1], [px + 0.85, fy1], [px + 0.35, ph + 0.15], [px - 0.35, ph + 0.15]], { fill: shade(paint, -16) });
  // operator cab beside the boom
  const ox0 = px + 0.3, ox1 = px + 2.15, oy0 = deck + 0.55, oy1 = deck + 2.6;
  const cabPts = B.cab === 'round' ? [[ox0, oy0], [ox1, oy0], [ox1 + 0.12, oy0 + 0.7], [ox1, oy1 - 0.35], [ox1 - 0.3, oy1], [ox0 + 0.2, oy1], [ox0, oy1 - 0.2]]
    : B.cab === 'angular' ? [[ox0, oy0], [ox1, oy0], [ox1 + 0.25, oy0 + 0.95], [ox1, oy1], [ox0, oy1]]
    : [[ox0, oy0], [ox1, oy0], [ox1 + 0.15, oy0 + 0.85], [ox1 + 0.05, oy1], [ox0, oy1]];
  poly(cabPts, { fill: paint });
  poly([[ox0 + 0.55, oy0 + 0.75], [ox1 - 0.05, oy0 + 0.75], [ox1 + (B.cab === 'angular' ? 0.18 : 0.06), oy0 + 1.25], [ox1 - 0.08, oy1 - 0.18], [ox0 + 0.55, oy1 - 0.18]], { fill: B.glass, w: 0.12 });
  rect(ox0 + 0.08, oy0 + 0.5, ox0 + 0.45, oy1 - 0.25, { fill: B.glass, w: 0.1 });
  rect(ox0, oy0 + 0.12, ox1, oy0 + 0.32, { fill: B.accent, stroke: 'none' });
  return { C: [px + 2.15, deck + 0.82], winch: [wx, wy + 0.52], deck };
}

// ---------- procedural telescopic boom: sections that never separate, collars, head sheaves, lettering ----------
function drawProcBoom(P, T, k, A, th, spec, lay, qc, D, paint, o = {}) {
  const u = [Math.cos(th), Math.sin(th)], nn = [-u[1], u[0]], K = lay.k;
  const W = (s, q) => T(A.x + s * K * u[0] + q * nn[0], A.y + s * K * u[1] + q * nn[1]);
  const lc = o.lineCol || '#1b1b1b';
  const poly = (pts, s2 = {}) => P.poly(pts.map(([s, q]) => W(s, q)), { closed: true, stroke: lc, w: 0.2, layer: 'BOOM', ...s2 });
  const line = (s1, q1, s2_, q2, sty = {}) => { const a = W(s1, q1), b = W(s2_, q2); P.line(a[0], a[1], b[0], b[1], { stroke: lc, w: 0.1, layer: 'BOOM', ...sty }); };
  const n = lay.n, dep = (i) => D * Math.pow(0.88, i);
  const ends = lay.starts.map((s0, i) => s0 + lay.lens[i]);
  // hoist rope over the top to the head
  for (let i = n - 1; i >= 0; i--) {
    const s0 = lay.starts[i], s1 = ends[i], h = dep(i) / 2, fill = i % 2 ? shade(paint, -7) : paint;
    if (i === 0) poly([[s0, qc + h * 0.45], [s0 + 0.45, qc + h], [s1, qc + h], [s1, qc - h], [s0 + lay.foot * 0.95, qc - h], [s0, qc - h * 0.15]], { fill });
    else poly([[s0, qc - h], [s1, qc - h], [s1, qc + h], [s0, qc + h]], { fill });
    const vis0 = i === 0 ? s0 + 0.5 : ends[i - 1] + 0.05;
    if (s1 - 0.5 > vis0) { line(vis0, qc + h * 0.7, s1 - 0.5, qc + h * 0.7, { stroke: shade(fill, 22), w: 0.12 }); line(vis0, qc - h * 0.72, s1 - 0.5, qc - h * 0.72, { stroke: shade(fill, -30), w: 0.08 }); }
    if (i < n - 1) { // collar where the next section slides out
      poly([[s1 - 0.5, qc - h * 1.05], [s1, qc - h * 1.05], [s1, qc + h * 1.05], [s1 - 0.5, qc + h * 1.05]], { fill: shade(paint, -22), w: 0.15 });
      line(s1 - 0.25, qc - h * 1.05, s1 - 0.25, qc + h * 1.05, { w: 0.06, stroke: shade(paint, -45) });
    }
  }
  // head: plate + sheaves at the boom tip
  const hl = dep(n - 1) / 2, sE = ends[n - 1];
  poly([[sE - 0.1, qc - hl], [sE - 0.1, qc + hl], [lay.tip + 0.32, Math.max(0.5, qc + hl * 0.4)], [lay.tip + 0.32, Math.min(-0.5, qc - hl)]], { fill: shade(paint, -18) });
  const tp = W(lay.tip, 0), r1 = Math.max(0.36, D * 0.24) * k;
  P.circle(tp[0], tp[1], r1, { stroke: lc, w: 0.18, fill: '#3f4246', layer: 'BOOM' });
  P.circle(tp[0], tp[1], r1 * 0.55, { stroke: '#8a8d91', w: 0.12, fill: '#9ea2a6', layer: 'BOOM' });
  P.circle(tp[0], tp[1], r1 * 0.14, { stroke: lc, w: 0.08, fill: '#1b1b1b', layer: 'BOOM' });
  // pivot pin
  const pv = W(0, 0); P.circle(pv[0], pv[1], Math.max(0.18, D * 0.12) * k, { stroke: lc, w: 0.18, fill: '#6d7074', layer: 'BOOM' });
  // company lettering on the base section
  if (o.livery) { const s0 = lay.starts[0] + lay.foot + 0.7, s1 = ends[0] - 0.8; letterBoom(P, T, k, A, th, s0 * K, (s1 - s0) * K, qc, dep(0) * 0.92, o.livery, paint); }
  return { W, ends, dep };
}
function drawProcCylinder(P, T, k, C, A, th, lay, qc, D, paint) {
  const u = [Math.cos(th), Math.sin(th)], nn = [-u[1], u[0]], K = lay.k;
  const sB = (lay.starts[0] + lay.lens[0] * 0.42) * K, Bp = [A.x + sB * u[0] + (qc - D / 2) * nn[0], A.y + sB * u[1] + (qc - D / 2) * nn[1]];
  const dx = Bp[0] - C[0], dy = Bp[1] - C[1], L = Math.hypot(dx, dy); if (L < 0.5) return;
  const ax = [dx / L, dy / L], an = [-ax[1], ax[0]];
  const seg = (a0, a1, w, fill) => P.poly([[a0, -w], [a1, -w], [a1, w], [a0, w]].map(([s, q]) => T(C[0] + s * ax[0] + q * an[0], C[1] + s * ax[1] + q * an[1])), { closed: true, stroke: '#1b1b1b', w: 0.18, fill, layer: 'BOOM' });
  const bw = Math.max(0.2, D * 0.17);
  seg(-0.25, L * 0.6, bw, shade(paint, -12)); seg(L * 0.6, L + 0.2, bw * 0.55, '#c7cacd');
  const c0 = T(C[0], C[1]); P.circle(c0[0], c0[1], bw * 0.9 * k, { stroke: '#1b1b1b', w: 0.15, fill: '#55585c', layer: 'BOOM' });
}

// ---------- accessories ----------
function drawYGuy(P, T, k, A, th, lay, qc, D, paint) {
  const K = lay.k, u = [Math.cos(th), Math.sin(th)], nn = [-u[1], u[0]];
  const Wp = (s, q) => [A.x + s * K * u[0] + q * nn[0], A.y + s * K * u[1] + q * nn[1]];
  const L = lay.tip * K, Ly = Math.max(6, Math.min(12, L * 0.17));
  const pin = Wp(lay.starts[0] + lay.lens[0] * 0.3, qc + D / 2);
  const a = th + 97 * D2R, Y = [pin[0] + Ly * Math.cos(a), pin[1] + Ly * Math.sin(a)];
  const w0 = 0.32, w1 = 0.16, na = [-Math.sin(a), Math.cos(a)];
  P.poly([[pin[0] + na[0] * w0, pin[1] + na[1] * w0], [Y[0] + na[0] * w1, Y[1] + na[1] * w1], [Y[0] - na[0] * w1, Y[1] - na[1] * w1], [pin[0] - na[0] * w0, pin[1] - na[1] * w0]].map(p => T(p[0], p[1])), { closed: true, stroke: '#1b1b1b', w: 0.18, fill: shade(paint, -6), layer: 'YGUY' });
  const head = Wp(lay.tip - 0.8, qc + D * 0.3), foot = Wp(lay.starts[0] + 0.7, qc + D / 2);
  for (const q of [head, foot]) for (const off of [-0.07, 0.07]) { const p1 = T(Y[0] + off, Y[1]), p2 = T(q[0] + off, q[1]); P.line(p1[0], p1[1], p2[0], p2[1], { stroke: '#2a2a2a', w: 0.12, layer: 'YGUY' }); }
  const yc = T(Y[0], Y[1]); P.circle(yc[0], yc[1], 0.25 * k, { stroke: '#1b1b1b', w: 0.15, fill: '#6d7074', layer: 'YGUY' });
  return { Y };
}
function drawLatticeSeg(P, T, A, B, d, lay = 'SUPERLIFT', col = '#333') {
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]); const ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L, nx = -uy, ny = ux;
  const pt = (s, f) => [A[0] + ux * s + nx * d / 2 * f, A[1] + uy * s + ny * d / 2 * f]; const segs = []; const step = Math.max(1.2, d * 1.1);
  let p0 = pt(0, 1), q0 = pt(0, -1);
  for (let s = step, i = 0; s <= L + 1e-6; s += step, i++) { const ss = Math.min(s, L); const p1 = pt(ss, 1), q1 = pt(ss, -1); segs.push([p0, p1], [q0, q1], i % 2 ? [p0, q1] : [q0, p1]); p0 = p1; q0 = q1; }
  P.path(segs.map(([a, b]) => { const p = T(a[0], a[1]), q = T(b[0], b[1]); return [p[0], p[1], q[0], q[1]]; }), { stroke: col, w: 0.2, layer: lay });
}
function drawSuperlift(P, T, k, A, th, lay, acc, paint) {
  const K = lay.k, L = lay.tip * K, Lm = Math.max(14, Math.min(32, L * 0.42));
  const foot = [A.x + 0.6, A.y + 0.25], a = 102 * D2R, top = [foot[0] + Lm * Math.cos(a), foot[1] + Lm * Math.sin(a)];
  drawLatticeSeg(P, T, foot, top, 1.4, 'SUPERLIFT', '#2e2e2e');
  const head = [A.x + (L - 1) * Math.cos(th), A.y + (L - 1) * Math.sin(th)];
  const r = Math.max(8, num(acc.slRadius, 15)), bt = Math.max(10, num(acc.slBallast, 100)), bh = Math.max(0.8, Math.min(3.2, bt / 55)), tw = 4;
  const tray = [-r, 0.55 + bh];
  for (const [p, q] of [[top, head], [top, [tray[0] + 0.6, tray[1]]]]) for (const off of [-0.08, 0.08]) { const p1 = T(p[0] + off, p[1]), p2 = T(q[0] + off, q[1]); P.line(p1[0], p1[1], p2[0], p2[1], { stroke: '#2a2a2a', w: 0.12, layer: 'SUPERLIFT' }); }
  const t0 = T(-r - tw / 2, 0.55 + bh), t1 = T(-r + tw / 2, 0.35);
  P.rect(t0[0], t0[1], t1[0] - t0[0], t1[1] - t0[1], { stroke: '#1b1b1b', w: 0.2, fill: '#55595e', layer: 'SUPERLIFT' });
  for (let y = 0.35 + 0.45; y < 0.55 + bh - 0.1; y += 0.45) { const p = T(-r - tw / 2, y), q = T(-r + tw / 2, y); P.line(p[0], p[1], q[0], q[1], { stroke: '#2c2e31', w: 0.1, layer: 'SUPERLIFT' }); }
  const g0 = T(-r - tw / 2 - 0.2, 0.35), g1 = T(-r + tw / 2 + 0.2, 0); P.rect(g0[0], g0[1], g1[0] - g0[0], g1[1] - g0[1], { stroke: '#1b1b1b', w: 0.15, fill: '#8a6d3b', layer: 'SUPERLIFT' });
  const lb = T(-r, 0.55 + bh + 0.9); P.text(lb[0], lb[1], `SUPERLIFT BALLAST ${bt}T @ ${fmtM(r)}`, { size: 2.6, anchor: 'middle', layer: 'TEXT', color: '#333' });
  return { top, tray };
}
function drawRunner(P, T, k, tip, th) {
  const a = th - 25 * D2R, L = 1.7, e = [tip.x + L * Math.cos(a), tip.y + L * Math.sin(a)], nx = -Math.sin(a), ny = Math.cos(a), w = 0.22;
  P.poly([[tip.x + nx * w, tip.y + ny * w], [e[0] + nx * w * 0.7, e[1] + ny * w * 0.7], [e[0] - nx * w * 0.7, e[1] - ny * w * 0.7], [tip.x - nx * w, tip.y - ny * w]].map(p => T(p[0], p[1])), { closed: true, stroke: '#1b1b1b', w: 0.15, fill: '#5d6166', layer: 'BOOM' });
  const c = T(e[0], e[1]); P.circle(c[0], c[1], 0.26 * k, { stroke: '#1b1b1b', w: 0.15, fill: '#9ea2a6', layer: 'BOOM' });
}

// ---------- custom crane body imported from the client's / Habib's own AutoCAD side view (DXF) ----------
const CUSTOM_BODY = {}; // crane id → packed geometry (loaded from the asset store or kept inline)
function customBody(crane) { const cb = crane?.customBody; if (!cb || !cb.origin || !cb.pivot) return null; const g = CUSTOM_BODY[crane.id] || (cb.data ? (CUSTOM_BODY[crane.id] = cb.data) : null); return g ? { g, cb } : null; }
function customXf(cb) { const s = num(cb.q, 1) * (UNITS[cb.unit] || 0.001), f = cb.flip ? -1 : 1; return (u, v) => [f * (u - cb.origin[0]) * s, (v - cb.origin[1]) * s]; }
function customBBox(cbx) { const xf = customXf(cbx.cb), b = cbx.g.bbox; const p = xf(b[0], b[1]), q = xf(b[2], b[3]); return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])]; }
function drawCustomBody(P, T, cbx) {
  const { g, cb } = cbx; const xf = customXf(cb);
  for (const [ci, flat] of g.polys) { const pts = []; for (let i = 0; i < flat.length; i += 2) { const [x, y] = xf(flat[i], flat[i + 1]); pts.push(T(x, y)); } if (pts.length > 1) P.poly(pts, { closed: false, stroke: g.pal[ci] || '#1b1b1b', w: 0.13, fill: 'none', layer: 'CRANE' }); }
}

// ---------- CAD library crane (side view): static body, real telescopic sections sliding out, luffing cylinder ----------
// section offsets along the boom for a boom length L: the telescoping fractions drive how far each section is out
function cadSections(dr, L, fr) {
  const secs = dr.secs, m = secs.length, L0 = dr.tip[0]; const D = new Array(m).fill(0);
  const need = L - L0; let k = 1;
  if (need > 0.01) {
    const f = Array.from({ length: m - 1 }, (_, i) => Math.max(0, num(fr?.[i], 0))); let tot = f.reduce((a, b) => a + b, 0);
    if (tot < 1e-6) { f.fill(1); tot = m - 1; }
    const E = need / tot; let c = 0;
    for (let i = 1; i < m; i++) { const maxS = Math.max(0.5, (secs[i - 1].s1 - secs[i - 1].s0) - 1.2); c += Math.min(maxS, f[i - 1] * E); D[i] = c; }
    const tipNow = L0 + D[m - 1]; if (tipNow > 0) k = L / tipNow; // only if a section ran out of stroke
  } else k = L / L0;
  return { D, k };
}
function drawCadCrane(P, T, k, crane, geo, res, dr, o = {}) {
  const tint = crane.tint ? (crane.color || '#f5c400') : null; const lw = 0.09;
  const sty = { tint, w: lw, layer: 'CRANE' };
  emitItems(P, dr.body, dr.pal, (x, y) => T(x, y), sty);
  const A = geo.pivot, th = geo.theta * D2R, u = [Math.cos(th), Math.sin(th)], n = [-u[1], u[0]];
  const L = geo.kind === 'main' ? geo.L : geo.Lb;
  const { D, k: kk } = cadSections(dr, L, res?.tele?.fr);
  const BW = (s, q) => T(A.x + s * kk * u[0] + q * n[0], A.y + s * kk * u[1] + q * n[1]);
  if (dr.cyl) { // barrel pinned to the superstructure, rod pinned under the base section
    const C = dr.cyl.C, [bs, bn] = dr.cyl.B; const B = [A.x + bs * u[0] + bn * n[0], A.y + bs * u[1] + bn * n[1]];
    const a = Math.atan2(B[1] - C[1], B[0] - C[0]); const ax = [Math.cos(a), Math.sin(a)], an = [-ax[1], ax[0]];
    emitItems(P, dr.cyl.bar, dr.pal, (s, q) => T(C[0] + s * ax[0] + q * an[0], C[1] + s * ax[1] + q * an[1]), { ...sty, layer: 'BOOM' });
    emitItems(P, dr.cyl.rod, dr.pal, (s, q) => T(B[0] + s * ax[0] + q * an[0], B[1] + s * ax[1] + q * an[1]), { ...sty, layer: 'BOOM' });
  }
  for (let i = dr.secs.length - 1; i >= 0; i--) emitItems(P, dr.secs[i].items, dr.pal, (s, q) => BW(s + D[i], q), { ...sty, layer: 'BOOM' });
  const b = dr.secs[0]; const bl = b.s1 - b.s0;
  if (o.livery) {
    const fill = tint || '#ffffff';
    letterBoom(P, T, k, A, th, (b.s0 + bl * 0.24) * kk, bl * 0.6 * kk, (b.n0 + b.n1) / 2, (b.n1 - b.n0) * 0.82, o.livery, fill);
  }
  return { qc: (b.n0 + b.n1) / 2, D: b.n1 - b.n0, sheave: BW(dr.tip[0] + D[D.length - 1], dr.tip[1]), sheaveR: dr.tipR || 0.4 };
}

// ---------- whole machine ----------
function drawCraneElevation(P, T, k, crane, geo, res, plan, o = {}) {
  const dr = craneDrawing(crane); const cbx = dr ? null : customBody(crane);
  if (dr && dr.v === 2) {
    const acc0 = res?.acc || {}; const spec = res?.spec || boomSpec(crane); const Lm = geo.kind === 'main' ? geo.L : geo.Lb;
    const lay = boomLayout(spec, Lm, res?.tele?.fr || teleFor(spec, Lm).fr); const A = geo.pivot, th = geo.theta * D2R;
    const paint = crane.tint ? (crane.color || '#f5c400') : '#ffffff';
    if (acc0.superlift) drawSuperlift(P, T, k, A, th, lay, acc0, paint);
    const r = drawCadCrane(P, T, k, crane, geo, res, dr, o);
    if (acc0.yguy) drawYGuy(P, T, k, A, th, lay, r.qc, r.D, paint);
    if (acc0.runner && geo.kind === 'main') drawRunner(P, T, k, geo.tip, th);
    if (geo.kind !== 'main') drawLattice(P, T, k, geo.jibFoot, geo.tip, crane, geo, geo.pivot);
    return { lay, qc: r.qc, D: r.D, cad: r };
  }
  const spec = res?.spec || boomSpec(crane); const Lm = geo.kind === 'main' ? geo.L : geo.Lb;
  const fr = res?.tele?.fr || teleFor(spec, Lm).fr; const lay = boomLayout(spec, Lm, fr);
  const A = geo.pivot, th = geo.theta * D2R; const acc = res?.acc || {};
  let qc, D, paint = crane.color || '#f5c400', winch = null, C = null, lineCol = '#1b1b1b';
  if (dr) {
    const tint = crane.tint ? paint : null;
    emitItems(P, cleanBody(dr), dr.pal, (x, y) => T(x, y), { tint, w: 0.1, layer: 'CRANE' });
    const b = baseSectionInfo(dr); qc = (b.qa + b.qb) / 2; D = Math.max(0.6, b.qb - b.qa);
    if (!crane.tint) { paint = isLightFill(b.fill) ? b.fill : '#ffffff'; lineCol = blockStroke(dr); }
    if (dr.cyl) {
      const Pv = { x: dr.pivot[0], y: dr.pivot[1] }, u = [Math.cos(th), Math.sin(th)], n = [-u[1], u[0]];
      const Cc = dr.cyl.C, [bs, bn] = dr.cyl.B; const Bp = [Pv.x + bs * u[0] + bn * n[0], Pv.y + bs * u[1] + bn * n[1]];
      const a = Math.atan2(Bp[1] - Cc[1], Bp[0] - Cc[0]); const ax = [Math.cos(a), Math.sin(a)], an = [-ax[1], ax[0]];
      emitItems(P, dr.cyl.bar, dr.pal, (s, q) => T(Cc[0] + s * ax[0] + q * an[0], Cc[1] + s * ax[1] + q * an[1]), { tint, w: 0.1, layer: 'BOOM' });
      emitItems(P, dr.cyl.rod, dr.pal, (s, q) => T(Bp[0] + s * ax[0] + q * an[0], Bp[1] + s * ax[1] + q * an[1]), { tint, w: 0.1, layer: 'BOOM' });
    }
  } else if (cbx) {
    drawCustomBody(P, T, cbx); D = Math.max(0.6, num(crane.boomDepth, 1.2)); qc = -0.3 * D; C = [A.x + Math.max(2, D * 2), A.y - Math.max(0.8, D * 0.8)];
  } else {
    const r = drawProcBody(P, T, k, crane, plan); C = r.C; winch = r.winch;
    D = Math.max(0.6, num(crane.boomDepth, 1.2)); qc = -0.3 * D;
  }
  if (acc.superlift) drawSuperlift(P, T, k, A, th, lay, acc, paint);
  if (!dr) drawProcCylinder(P, T, k, C, A, th, lay, qc, D, paint);
  drawProcBoom(P, T, k, A, th, spec, lay, qc, D, paint, { livery: o.livery, winch, lineCol });
  if (acc.yguy) drawYGuy(P, T, k, A, th, lay, qc, D, paint);
  if (acc.runner && geo.kind === 'main') drawRunner(P, T, k, geo.tip, th);
  if (geo.kind !== 'main') drawLattice(P, T, k, geo.jibFoot, geo.tip, crane, geo, geo.pivot);
  return { lay, qc, D };
}
