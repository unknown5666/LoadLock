// ===== Drawing primitives, A1 sheet composer, SVG + DXF writers =====
const SHEET = { W: 841, H: 594 };
const COL = { red: '#e00000', green: '#00a800', black: '#000000', grey: '#7f7f7f', lgrey: '#d9d9d9', yellow: '#c9c92a', blue: '#1f4fd1', magenta: '#c000c0', brick: '#555555', sand: '#b8a77a', white: '#ffffff', orange: '#e07b00' };
const fmtT = (v) => (v == null || !isFinite(v)) ? '—' : (+v).toFixed(2) + 'T';
const fmtM = (v) => { if (v == null || v === '' || !isFinite(v)) return '—'; const n = +v; return (Math.abs(n * 10 - Math.round(n * 10)) > 1e-6 ? n.toFixed(2) : n.toFixed(1)) + 'M'; };
const mm = (m) => Math.round(m * 1000);

class Prims {
  constructor() { this.list = []; }
  add(p) { this.list.push(p); return p; }
  line(x1, y1, x2, y2, o = {}) { return this.add({ t: 'line', x1, y1, x2, y2, ...o }); }
  poly(pts, o = {}) { return this.add({ t: 'poly', pts, ...o }); }
  rect(x, y, w, h, o = {}) { return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { closed: true, ...o }); }
  circle(cx, cy, r, o = {}) { return this.add({ t: 'circle', cx, cy, r, ...o }); }
  arc(cx, cy, r, a1, a2, o = {}) { return this.add({ t: 'arc', cx, cy, r, a1, a2, ...o }); } // degrees, sheet coords (y down) measured CCW visually
  text(x, y, s, o = {}) { return this.add({ t: 'text', x, y, s: String(s ?? ''), size: 3, anchor: 'start', vAlign: 'base', ...o }); }
  path(segs, o = {}) { return this.add({ t: 'path', segs, ...o }); } // segs: [[x1,y1,x2,y2],...]
  image(x, y, w, h, href, o = {}) { return this.add({ t: 'image', x, y, w, h, href, ...o }); }
}

// ---------- small helpers ----------
function arrow(P, x, y, ang, o) { // ang: direction arrow points to, radians, sheet coords
  const L = o.al || 2.6, Wd = o.aw || 0.9;
  const bx = x - Math.cos(ang) * L, by = y - Math.sin(ang) * L;
  const nx = -Math.sin(ang) * Wd, ny = Math.cos(ang) * Wd;
  P.poly([[x, y], [bx + nx, by + ny], [bx - nx, by - ny]], { closed: true, fill: o.stroke || COL.red, stroke: o.stroke || COL.red, w: 0.1, layer: o.layer || 'DIM' });
}
function dimLine(P, x1, y1, x2, y2, label, o = {}) {
  const st = { stroke: o.stroke || COL.red, w: o.w || 0.3, layer: 'DIM' };
  P.line(x1, y1, x2, y2, st);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  arrow(P, x2, y2, ang, st); arrow(P, x1, y1, ang + Math.PI, st);
  if (label) {
    let a = ang * 180 / Math.PI; if (a > 90) a -= 180; if (a < -90) a += 180;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, off = o.textOff ?? 1.2;
    const ar = a * Math.PI / 180; const nx = Math.sin(ar), ny = -Math.cos(ar);
    P.text(mx + nx * off, my + ny * off, label, { size: o.size || 5, anchor: 'middle', vAlign: 'base', color: o.color || COL.green, rot: a, layer: 'DIMTEXT', bg: o.bg });
  }
}
// CAD-style aligned dimension between two sheet points. The dimension line sits `off` mm from A→B on the side given by `side`
// ('up' | 'down' | 'left' | 'right'); extension lines start `gap` mm clear of the object and run `over` mm past the dimension line.
function dimA(P, a, b, off, label, o = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 0.4) return;
  const ux = dx / L, uy = dy / L; let nx = -uy, ny = ux;
  const side = o.side || 'up';
  if ((side === 'up' && ny > 0) || (side === 'down' && ny < 0) || (side === 'left' && nx > 0) || (side === 'right' && nx < 0)) { nx = -nx; ny = -ny; }
  const g = o.gap ?? 1.2, ov = o.over ?? 1.5; const red = o.stroke || COL.red;
  const A2 = [a[0] + nx * off, a[1] + ny * off], B2 = [b[0] + nx * off, b[1] + ny * off];
  if (o.extA !== false && off > g + 0.2) P.line(a[0] + nx * g, a[1] + ny * g, A2[0] + nx * ov, A2[1] + ny * ov, { stroke: red, w: 0.12, layer: 'DIM' });
  if (o.extB !== false && off > g + 0.2) P.line(b[0] + nx * g, b[1] + ny * g, B2[0] + nx * ov, B2[1] + ny * ov, { stroke: red, w: 0.12, layer: 'DIM' });
  P.line(A2[0], A2[1], B2[0], B2[1], { stroke: red, w: 0.16, layer: 'DIM' });
  const st = { stroke: red, al: o.al || 2.1, aw: o.aw || 0.55 }; const ang = Math.atan2(B2[1] - A2[1], B2[0] - A2[0]);
  if (L > 4.6) { arrow(P, B2[0], B2[1], ang, st); arrow(P, A2[0], A2[1], ang + Math.PI, st); }
  else { arrow(P, B2[0], B2[1], ang + Math.PI, st); arrow(P, A2[0], A2[1], ang, st); } // short: arrows outside
  if (label) {
    let deg = ang * R2D; if (deg > 90) deg -= 180; if (deg < -90) deg += 180;
    const size = o.size || 4.2; const r = deg * D2R; let tx = -Math.sin(r), ty = Math.cos(r); // text "up" vector (toward smaller y)
    if (ty > 0) { tx = -tx; ty = -ty; }
    const mx = (A2[0] + B2[0]) / 2 + tx * (0.9 + size * 0.36), my = (A2[1] + B2[1]) / 2 + ty * (0.9 + size * 0.36);
    P.text(mx, my, label, { size, anchor: 'middle', vAlign: 'middle', color: o.color || COL.green, rot: deg, layer: 'DIMTEXT', bg: o.bg === false ? undefined : '#ffffff' });
  }
}
function brickHatch(P, x, y, w, h, o = {}) {
  const ch = o.ch || 1.4, bw = o.bw || 3.6, segs = [];
  for (let yy = y + ch, i = 0; yy < y + h - 0.05; yy += ch, i++) segs.push([x, yy, x + w, yy]);
  let i = 0;
  for (let yy = y; yy < y + h - 0.05; yy += ch, i++) {
    const y2 = Math.min(y + h, yy + ch);
    for (let xx = x + ((i % 2) ? bw / 2 : bw); xx < x + w - 0.05; xx += bw) segs.push([xx, yy, xx, y2]);
  }
  P.path(segs, { stroke: o.stroke || COL.brick, w: 0.08, layer: 'HATCH' });
}
function stipple(P, x, y, w, h, seed = 1) {
  let s = Math.abs(Math.round(seed)) * 9301 + 49297; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const segs = []; const n = Math.min(1600, Math.floor(w * h / 5));
  for (let i = 0; i < n; i++) { const px = x + rnd() * w, py = y + rnd() * h; segs.push([px, py, px + 0.25, py + 0.12]); }
  P.path(segs, { stroke: COL.sand, w: 0.25, layer: 'GROUND' });
}
function wrapText(s, maxChars) {
  const words = String(s).split(/\s+/); const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > maxChars) { if (cur) lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  if (cur) lines.push(cur); return lines;
}

// ---------- the crane (world metres → sheet via T) ----------
function drawCrane(P, T, k, crane, geo, o = {}) {
  const Lc = num(crane.carrierLen, 12), cls = num(crane.cls, 100);
  const front = -0.64 * Lc, rear = 0.36 * Lc;
  const col = crane.color || '#e8b33a';
  const sty = { stroke: '#222', w: 0.25, layer: 'CRANE' };
  const poly = (pts, s = {}) => P.poly(pts.map(([x, y]) => T(x, y)), { closed: true, ...sty, ...s });
  const ln = (x1, y1, x2, y2, s = {}) => { const a = T(x1, y1), b = T(x2, y2); P.line(a[0], a[1], b[0], b[1], { ...sty, ...s }); };
  const base = o.baseY || 0;
  // mats + outrigger pads
  const oL = num(crane.outLong, 7) / 2;
  const mat = String(o.mat || '1.0x1.0').toLowerCase().replace('m', '').split('x').map(v => num(v, 1));
  for (const sx of [-oL, oL]) {
    const mx = sx + (sx < 0 ? 0.4 : -0.4);
    poly([[mx - mat[0] / 2, base], [mx + mat[0] / 2, base], [mx + mat[0] / 2, base + 0.22], [mx - mat[0] / 2, base + 0.22]], { fill: '#8a6d3b', layer: 'MATS' });
    poly([[mx - 0.35, base + 0.22], [mx + 0.35, base + 0.22], [mx + 0.3, base + 0.4], [mx - 0.3, base + 0.4]], { fill: '#555' });
    poly([[mx - 0.12, base + 0.4], [mx + 0.12, base + 0.4], [mx + 0.12, base + 1.25], [mx - 0.12, base + 1.25]], { fill: '#777' });
    ln(sx < 0 ? mx : mx, base + 1.15, sx < 0 ? front + 1.6 : rear - 0.6, base + 1.15, { w: 0.5 });
  }
  // wheels (lifted slightly: on outriggers)
  const ax = Math.max(2, num(crane.axles, 4)); const wr = 0.55;
  const fA = Math.min(2, Math.floor(ax / 2)), rA = ax - fA;
  const xs = [];
  for (let i = 0; i < fA; i++) xs.push(front + 2.0 + i * 1.6);
  const rStart = front + 2.0 + (fA - 1) * 1.6 + Math.max(2.4, (rear - 1.2 - (front + 2.0 + (fA - 1) * 1.6)) - (rA - 1) * 1.6);
  for (let i = 0; i < rA; i++) xs.push(rStart + i * 1.6);
  for (const x of xs) { const c = T(x, base + wr + 0.15); P.circle(c[0], c[1], wr * k, { ...sty, fill: '#2a2a2a' }); P.circle(c[0], c[1], wr * 0.45 * k, { ...sty, fill: '#9a9a9a' }); }
  // chassis
  poly([[front + 0.3, base + 0.9], [rear, base + 0.9], [rear, base + 1.55], [front + 0.3, base + 1.55]], { fill: col });
  // carrier cab
  poly([[front, base + 0.9], [front + 2.2, base + 0.9], [front + 2.2, base + 3.3], [front + 0.6, base + 3.3], [front, base + 2.2]], { fill: col });
  poly([[front + 0.15, base + 2.25], [front + 0.65, base + 3.1], [front + 1.9, base + 3.1], [front + 1.9, base + 2.25]], { fill: '#9fc3d8', w: 0.15 });
  // superstructure
  const tail = num(crane.tail, 4), ph = num(geo.pivot?.y, 3), px = num(geo.pivot?.x, -1.5);
  poly([[-1.6, base + 1.55], [1.6, base + 1.55], [1.4, base + 1.95], [-1.4, base + 1.95]], { fill: '#444' });
  poly([[-tail + 1.2, base + 1.95], [2.2, base + 1.95], [2.2, base + ph - 0.2], [-tail + 1.2, base + ph - 0.2]], { fill: col });
  // counterweight stack
  const cwH = Math.min(2.6, 0.8 + cls / 400);
  for (let i = 0; i < 4; i++) { const y0 = base + 1.95 + i * cwH / 4; poly([[-tail, y0], [-tail + 1.7, y0], [-tail + 1.7, y0 + cwH / 4 - 0.05], [-tail, y0 + cwH / 4 - 0.05]], { fill: '#6b6b6b', w: 0.15, layer: 'CWT' }); }
  // operator cab
  poly([[1.0, base + 1.95], [2.6, base + 1.95], [2.6, base + 3.2], [1.4, base + 3.4], [1.0, base + 3.2]], { fill: col });
  poly([[1.6, base + 2.5], [2.45, base + 2.5], [2.45, base + 3.1], [1.6, base + 3.25]], { fill: '#9fc3d8', w: 0.12 });
}


// ---------- detailed crane drawings (from Habib's AutoCAD crane blocks) ----------
function isLightFill(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || ''); if (!m) return false;
  const [r, g, b] = [1, 2, 3].map(i => parseInt(m[i], 16)); return (r + g + b) / 3 > 200;
}
function emitItems(P, items, pal, xf, sty) {
  for (const [f, ci, flat] of items) {
    const pts = []; for (let i = 0; i < flat.length; i += 2) pts.push(xf(flat[i] / 100, flat[i + 1] / 100));
    let col = pal[ci];
    if (f) {
      if (sty.tint && isLightFill(col)) col = sty.tint;
      P.poly(pts, { closed: true, fill: col, stroke: 'none', layer: sty.layer });
    } else P.poly(pts, { closed: false, stroke: col, w: sty.w || 0.1, fill: 'none', layer: sty.layer });
  }
}
function placeSections(d, L) {
  const secs = d.boom, s0 = secs.map(x => x.s0), m = secs.length - 1;
  if (m <= 0) return [s0[0]];
  const X = L - s0[0] - d.tipOff; const x0 = []; for (let i = 1; i <= m; i++) x0.push(s0[i] - s0[i - 1]);
  const lo = x0.map(() => 0.25), hi = x0.map((_, i) => secs[i].len * 0.85);
  const sum = (a) => a.reduce((p, c) => p + c, 0);
  let x = x0.map((v, i) => Math.min(Math.max(v + (X - sum(x0)) / m, lo[i]), hi[i]));
  for (let it = 0; it < 6; it++) {
    const rem = X - sum(x); const free = x.map((_, i) => i).filter(i => (rem > 0 && x[i] < hi[i] - 1e-9) || (rem < 0 && x[i] > lo[i] + 1e-9));
    if (Math.abs(rem) < 1e-6 || !free.length) break;
    for (const i of free) x[i] = Math.min(Math.max(x[i] + rem / free.length, lo[i]), hi[i]);
  }
  const rem = X - sum(x); x = x.map(v => v + rem / m);
  const out = [s0[0]]; for (const v of x) out.push(out[out.length - 1] + v); return out;
}
// ---------- boom lettering (company name painted along the base boom section) ----------
function lumOf(hex) { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || ''); if (!m) return 1; const [r, g, b] = [1, 2, 3].map(i => parseInt(m[i], 16) / 255); return 0.299 * r + 0.587 * g + 0.114 * b; }
function baseSectionInfo(d) { // q-bounds of the plain middle of the base section + its dominant fill colour
  if (d._b0) return d._b0;
  const sec = d.v === 2 ? { ...d.secs[0], len: d.secs[0].s1 - d.secs[0].s0 } : d.boom[0]; const s0 = sec.s0, len = sec.len; let qa = Infinity, qb = -Infinity; const fills = {};
  for (const [f, ci, flat] of sec.items) {
    let area = 0;
    for (let i = 0; i < flat.length; i += 2) { const sx = flat[i] / 100, q = flat[i + 1] / 100; if (sx >= s0 + 0.35 * len && sx <= s0 + 0.8 * len) { if (q < qa) qa = q; if (q > qb) qb = q; } }
    if (f) { for (let i = 0, j = flat.length - 2; i < flat.length; j = i, i += 2) area += (flat[j] / 100) * (flat[i + 1] / 100) - (flat[i] / 100) * (flat[j + 1] / 100); fills[ci] = (fills[ci] || 0) + Math.abs(area / 2); }
  }
  const dom = Object.entries(fills).sort((a, b) => b[1] - a[1])[0];
  return (d._b0 = { s0, len, qa: isFinite(qa) ? qa : -0.5, qb: isFinite(qb) ? qb : 0.5, fill: dom ? d.pal[+dom[0]] : '#f5c400' });
}
function letterBoom(P, T, k, A, ang, sStart, sLen, qc, depth, text, fill, o = {}) {
  if (!text || !(sLen > 0) || !(depth > 0)) return;
  let cap = depth * (o.capF || 0.46); const n = text.length; const avail = sLen * 0.86;
  if (n * 0.66 * cap > avail) cap = avail / (n * 0.66);
  const size = cap / 0.72 * k; if (size < 0.7) return;
  const u = [Math.cos(ang), Math.sin(ang)], nn = [-u[1], u[0]], sc = sStart + sLen / 2;
  const p = T(A.x + sc * u[0] + qc * nn[0], A.y + sc * u[1] + qc * nn[1]);
  let rot = -ang * R2D; if (o.upright) { const r = ((rot % 360) + 360) % 360; if (r > 90 && r < 270) rot += 180; }
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(fill || ''); let sat = 0; if (m) { const c = [1, 2, 3].map(i => parseInt(m[i], 16) / 255); const mx = Math.max(...c), mn = Math.min(...c); sat = mx > 0 ? (mx - mn) / mx : 0; }
  P.text(p[0], p[1], text, { size, bold: true, anchor: 'middle', vAlign: 'middle', rot, color: lumOf(fill) > 0.55 ? '#121212' : '#ffffff', layer: 'BOOM-LETTERING', keep: sat > 0.3 }); // painted (saturated) booms keep their lettering colour on the night canvas
}
function drawDetailedCrane(P, T, k, crane, geo, d, livery) {
  const sty = { tint: crane.tint ? (crane.color || '#f5c400') : null, w: 0.1 };
  const pal = d.pal;
  // body
  emitItems(P, d.body, pal, (x, y) => T(x, y), { ...sty, layer: 'CRANE' });
  const Pv = { x: d.pivot[0], y: d.pivot[1] };
  const th = geo.theta * D2R, u = [Math.cos(th), Math.sin(th)], n = [-u[1], u[0]];
  const Lmain = geo.kind === 'main' ? geo.L : geo.Lb;
  // luffing cylinder (barrel pinned to the superstructure, rod to the boom)
  if (d.cyl) {
    const C = d.cyl.C, [bs, bn] = d.cyl.B;
    const B = [Pv.x + bs * u[0] + bn * n[0], Pv.y + bs * u[1] + bn * n[1]];
    const a = Math.atan2(B[1] - C[1], B[0] - C[0]); const ax = [Math.cos(a), Math.sin(a)], an = [-ax[1], ax[0]];
    emitItems(P, d.cyl.bar, pal, (s, q) => T(C[0] + s * ax[0] + q * an[0], C[1] + s * ax[1] + q * an[1]), { ...sty, layer: 'BOOM' });
    emitItems(P, d.cyl.rod, pal, (s, q) => T(B[0] + s * ax[0] + q * an[0], B[1] + s * ax[1] + q * an[1]), { ...sty, layer: 'BOOM' });
  }
  // telescopic sections, outermost first so each collar covers the section sliding out of it
  const sn = placeSections(d, Lmain);
  for (let i = d.boom.length - 1; i >= 0; i--) {
    const sh = sn[i] - d.boom[i].s0;
    emitItems(P, d.boom[i].items, pal, (s, q) => T(Pv.x + (s + sh) * u[0] + q * n[0], Pv.y + (s + sh) * u[1] + q * n[1]), { ...sty, layer: 'BOOM' });
  }
  if (livery) { const b = baseSectionInfo(d); const fill = sty.tint && isLightFill(b.fill) ? sty.tint : b.fill; letterBoom(P, T, k, Pv, th, b.s0 + b.len * 0.2, b.len * 0.68, (b.qa + b.qb) / 2, b.qb - b.qa, livery, fill); }
}
function craneDrawing(crane) { return drawingOf(crane); }

function boomPoly(A, B, ha, hb) { // rectangle along A→B with half-depths
  const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  return [[A.x + nx * ha, A.y + ny * ha], [B.x + nx * hb, B.y + ny * hb], [B.x - nx * hb, B.y - ny * hb], [A.x - nx * ha, A.y - ny * ha]];
}
function drawBoom(P, T, k, crane, geo, o = {}) {
  const base = o.baseY || 0;
  const sh = (p) => ({ x: p.x, y: p.y + base });
  const sty = { stroke: '#222', w: 0.25, layer: 'BOOM' };
  const col = crane.color || '#e8b33a';
  const pp = (pts, s = {}) => P.poly(pts.map(([x, y]) => T(x, y)), { closed: true, ...sty, ...s });
  const depth = num(crane.boomDepth, 1.2);
  const Pv = sh(geo.pivot);
  // telescopic main boom
  const mainEnd = geo.kind === 'main' ? sh(geo.tip) : sh(geo.jibFoot);
  const L = Math.hypot(mainEnd.x - Pv.x, mainEnd.y - Pv.y);
  const ux = (mainEnd.x - Pv.x) / L, uy = (mainEnd.y - Pv.y) / L;
  const n = geo.kind === 'main' ? Math.max(2, Math.min(8, num(crane.sections, 5))) : 3;
  const baseLen = geo.kind === 'main' ? Math.min(L * 0.92, Math.max(num(crane.boomMin, 12) - 1, L / n)) : L * 0.5;
  const rest = (L - baseLen) / (n - 1 || 1);
  let s0 = -0.6, h = depth / 2;
  const pt = (s) => ({ x: Pv.x + ux * s, y: Pv.y + uy * s });
  for (let i = 0; i < n; i++) {
    const e = i === 0 ? baseLen : baseLen + rest * i;
    const sStart = i === 0 ? s0 : baseLen + rest * (i - 1) - Math.min(1.2, rest * 0.4);
    pp(boomPoly(pt(sStart), pt(Math.min(e, L)), h, h * (i === 0 ? 0.97 : 0.97)), { fill: i % 2 ? shade(col, -10) : col });
    h *= 0.86;
  }
  if (o.livery) letterBoom(P, T, k, Pv, Math.atan2(uy, ux), 0.6, baseLen * 0.9, 0, depth, o.livery, col);
  // head
  const hd = boomPoly(pt(L - 0.2), pt(L + 0.9), h * 1.3, h * 1.1); pp(hd, { fill: '#555' });
  const tipC = T(mainEnd.x, mainEnd.y);
  if (geo.kind === 'main') P.circle(tipC[0], tipC[1], Math.max(0.6, depth * 0.35 * k), { ...sty, fill: '#ccc' });
  // luffing cylinder
  const cyl0 = T(Pv.x + 2.4, base + 2.0), cylEnd = pt(Math.min(L * 0.38, 0.38 * num(crane.boomMin, 12) + 2));
  const c1 = T(cylEnd.x, cylEnd.y);
  P.line(cyl0[0], cyl0[1], c1[0], c1[1], { stroke: '#333', w: Math.max(0.6, depth * 0.28 * k), layer: 'BOOM' });
  P.line(cyl0[0], cyl0[1], c1[0], c1[1], { stroke: '#bbb', w: Math.max(0.2, depth * 0.1 * k), layer: 'BOOM' });
  // pivot pin
  const pv = T(Pv.x, Pv.y); P.circle(pv[0], pv[1], Math.max(0.5, depth * 0.25 * k), { ...sty, fill: '#666' });
  if (geo.kind !== 'main') drawLattice(P, T, k, sh(geo.jibFoot), sh(geo.tip), crane, geo, Pv);
}
function drawLattice(P, T, k, A, B, crane, geo, Pv) {
  const d = 1.4; const L = Math.hypot(B.x - A.x, B.y - A.y);
  const ux = (B.x - A.x) / L, uy = (B.y - A.y) / L, nx = -uy, ny = ux;
  const top = (s, f = 1) => ({ x: A.x + ux * s + nx * d / 2 * f, y: A.y + uy * s + ny * d / 2 * f });
  const bot = (s, f = 1) => ({ x: A.x + ux * s - nx * d / 2 * f, y: A.y + uy * s - ny * d / 2 * f });
  const taper = (s) => s < 3 ? 0.5 + s / 6 : s > L - 3 ? 0.5 + (L - s) / 6 : 1;
  const segs = [];
  const step = 1.6; let prevT = top(0, taper(0)), prevB = bot(0, taper(0));
  for (let s = step, i = 0; s <= L + 0.01; s += step, i++) {
    const t = top(Math.min(s, L), taper(Math.min(s, L))), b = bot(Math.min(s, L), taper(Math.min(s, L)));
    segs.push([prevT, t], [prevB, b], i % 2 ? [prevT, b] : [prevB, t]);
    prevT = t; prevB = b;
  }
  P.path(segs.map(([a, b]) => { const p = T(a.x, a.y), q = T(b.x, b.y); return [p[0], p[1], q[0], q[1]]; }), { stroke: '#333', w: 0.22, layer: 'JIB' });
  // luffing frames + guys
  const fl = Math.max(6, L * 0.14);
  const f1 = { x: A.x + Math.cos((geo.theta + 35) * D2R) * fl, y: A.y + Math.sin((geo.theta + 35) * D2R) * fl };
  const f2 = { x: A.x + Math.cos((geo.theta + 80) * D2R) * fl * 0.85, y: A.y + Math.sin((geo.theta + 80) * D2R) * fl * 0.85 };
  const g = (a, b, w = 0.15) => { const p = T(a.x, a.y), q = T(b.x, b.y); P.line(p[0], p[1], q[0], q[1], { stroke: '#333', w, layer: 'JIB' }); };
  g(A, f1, 0.45); g(A, f2, 0.45); g(f1, B); g(f1, f2); g(f2, { x: Pv.x - 1.5, y: Pv.y + 0.5 });
  const tip = T(B.x, B.y); P.circle(tip[0], tip[1], 0.9, { stroke: '#222', w: 0.25, fill: '#ccc', layer: 'JIB' });
}
function shade(hex, pct) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || ''); if (!m) return hex;
  const f = (v) => Math.max(0, Math.min(255, Math.round(parseInt(v, 16) * (1 + pct / 100)))).toString(16).padStart(2, '0');
  return '#' + f(m[1]) + f(m[2]) + f(m[3]);
}

function hookOf(crane) { // the crane's own CAD hook block, else a generic one scaled to the class
  const dr = craneDrawing(crane);
  if (dr && dr.v === 2 && dr.hook) return { items: dr.hook.items, pal: dr.pal, h: dr.hook.h, w: dr.hook.w, s: 1 };
  const g = typeof CRANE_DRAWINGS !== 'undefined' && CRANE_DRAWINGS.ltm1250;
  if (g && g.hook) { const s = Math.max(0.55, Math.min(1.15, num(crane?.cls, 100) / 250)); return { items: g.hook.items, pal: g.pal, h: g.hook.h * s, w: g.hook.w * s, s }; }
  return null;
}
function drawHookAndLoad(P, T, k, crane, geo, res, load, o = {}) {
  const base = o.baseY || 0;
  const tip = { x: geo.tip.x, y: geo.tip.y + base };
  const R = res.R, landY = res.landY + base;
  const lL = num(load.l, 2), lH = num(load.h, 1.5);
  const rigH = res.rigH != null ? res.rigH : num(load.rigH, num(o.rigH, 3));
  const hk = hookOf(crane);
  const blkH = hk ? hk.h : Math.max(0.9, Math.min(2.2, 0.6 + num(crane.cls, 100) / 400));
  const hookBot = landY + lH + rigH;
  const blkTop = hookBot + blkH;
  const sty = { stroke: '#1d1d1d', w: 0.16, layer: 'HOOK' };
  // hoist rope: two falls from the head sheave straight down to the hook block
  const fall = hk ? Math.max(0.12, Math.min(0.42, hk.w * 0.2)) : 0.3; const sheaveY = tip.y - (o.sheaveR || 0.25);
  for (const dx of [-fall, fall]) { const a = T(R + dx, sheaveY), b = T(R + dx, blkTop - 0.05); P.line(a[0], a[1], b[0], b[1], sty); }
  if (hk) emitItems(P, hk.items, hk.pal, (x, y) => T(R + x * hk.s, blkTop + y * hk.s), { tint: null, w: 0.08, layer: 'HOOK' });
  else {
    const bw = Math.max(0.6, blkH * 0.55);
    P.poly([T(R - bw / 2, blkTop), T(R + bw / 2, blkTop), T(R + bw / 2, hookBot + blkH * 0.35), T(R - bw / 2, hookBot + blkH * 0.35)], { closed: true, stroke: '#222', w: 0.18, fill: '#e3b505', layer: 'HOOK' });
  }
  if (res.empty) return { hookBot, blkTop, topY: hookBot };
  const shape = load.shape || 'box';
  const topY = landY + lH;
  const round = shape === 'drum' || shape === 'coil';
  const half = round ? lL * 0.35 : Math.max(0.15, (num(load.pick) > 0 ? num(load.pick) : lL - 0.3) / 2), pickY = round ? topY - lH * 0.15 : topY;
  const ln = (a, b, st) => { const p = T(a[0], a[1]), q = T(b[0], b[1]); P.line(p[0], p[1], q[0], q[1], { ...st, layer: 'RIGGING' }); };
  const legStyle = (t) => /chain/i.test(t.name || '') ? { stroke: '#5a3a12', w: 0.22 } : /web|nylon|round/i.test(t.name || '') ? { stroke: '#d77a00', w: 0.3 } : { stroke: '#2b2b2b', w: 0.18 };
  if (res.stack) { // named tackles, top → bottom, drawn to their real lengths
    let y = hookBot, topSpan = 0; const labels = [];
    const items = res.stack.items;
    for (let i = 0; i < items.length; i++) {
      const t = items[i]; const y1 = y - t.v;
      if (t.type === 'sling') {
        const below = items.slice(i + 1).find(x => x.type === 'spreader' || x.type === 'beam'); const bSpan = below ? below.L : 2 * half;
        const st = legStyle(t); const ends = t.legs >= 4 ? [-1, -0.34, 0.34, 1] : [-1, 1];
        for (const f of ends) ln([R + f * topSpan / 2, y], [R + f * bSpan / 2, y1], Math.abs(f) < 1 ? { ...st, w: st.w * 0.6 } : st);
        labels.push([y - t.v / 2, R + Math.max(topSpan, bSpan) / 4 + 0.3, t]);
      } else if (t.type === 'spreader' || t.type === 'beam') {
        const p = T(R - t.L / 2, y), q = T(R + t.L / 2, y1);
        P.rect(p[0], p[1], q[0] - p[0], q[1] - p[1], { stroke: '#1d1d1d', w: 0.16, fill: t.type === 'spreader' ? '#f2c230' : '#9aa4ad', layer: 'RIGGING' });
        for (const e of [-1, 1]) { const c = T(R + e * (t.L / 2 - 0.12), y1 + t.v * 0.5); P.circle(c[0], c[1], Math.max(0.25, 0.07 * k), { stroke: '#1d1d1d', w: 0.1, fill: '#ffffff', layer: 'RIGGING' }); }
        topSpan = t.L; labels.push([y - t.v / 2, R + t.L / 2 + 0.4, t]);
      } else if (t.type === 'shackle') {
        const w2 = Math.max(0.08, t.v * 0.32); const pts = []; for (let j = 0; j <= 12; j++) { const a2 = Math.PI * j / 12; pts.push(T(R + Math.cos(a2) * w2, y1 + w2 - Math.sin(a2) * w2)); }
        P.poly([T(R - w2, y), ...pts.reverse(), T(R + w2, y)], { closed: false, stroke: '#1d1d1d', w: 0.18, fill: 'none', layer: 'RIGGING' });
        const pn = T(R - w2 * 1.25, y), pq = T(R + w2 * 1.25, y); P.line(pn[0], pn[1], pq[0], pq[1], { stroke: '#1d1d1d', w: 0.2, layer: 'RIGGING' });
        topSpan = 0; labels.push([y - t.v / 2, R + 0.4, t]);
      } else {
        const p = T(R, y), q = T(R, y1); P.line(p[0], p[1], q[0], q[1], { stroke: t.type === 'chain' ? '#5a3a12' : '#1d1d1d', w: t.type === 'chain' ? 0.32 : 0.22, dash: t.type === 'chain', layer: 'RIGGING' });
        topSpan = 0; labels.push([y - t.v / 2, R + 0.4, t]);
      }
      y = y1;
    }
    if (o.callout !== false) {
      const lx = Math.max(...labels.map(l => l[1]), R + half) + 0.6; let lastY = Infinity;
      for (const [yy, x0, t] of labels) {
        const p0 = T(x0, yy); let ty = T(lx, yy)[1]; if (ty < lastY + 3.2 && lastY !== Infinity) ty = lastY + 3.2; lastY = ty;
        const p1 = [T(lx, yy)[0], ty];
        P.line(p0[0], p0[1], p1[0] - 0.6, p1[1], { stroke: '#555', w: 0.1, layer: 'RIGGING' });
        P.circle(p0[0], p0[1], 0.35, { stroke: 'none', fill: '#555', layer: 'RIGGING' });
        P.text(p1[0], p1[1] + 0.9, `${String(t.name || '').toUpperCase()}${t.L ? ' ' + fmtM(t.L) : ''}${t.w ? ' · ' + (+t.w).toFixed(2) + 'T' : ''}${t.type === 'sling' && t.ang != null ? ' @' + Math.round(t.ang) + '°' : ''}`, { size: 2.3, color: '#333', layer: 'RIGGING' });
      }
    }
  } else {
    // slings (style follows the rigging method)
    const sl = res.sling; const rt = sl ? sl.type : '';
    const rs = { '4leg': { stroke: '#5a3a12', w: 0.24 }, '2leg': { stroke: '#5a3a12', w: 0.24 }, wire: { stroke: '#2b2b2b', w: 0.18 }, nylon: { stroke: '#d77a00', w: 0.3 }, spreader: { stroke: '#5a3a12', w: 0.22 }, frame: { stroke: '#5a3a12', w: 0.22 } }[rt] || { stroke: COL.red, w: 0.16 };
    if (rt === 'spreader' || rt === 'frame') {
      const barY = topY + (rt === 'spreader' ? 1.2 : 0.75), bw = rt === 'spreader' ? Math.max(lL * 0.95, 1.5) / 2 : lL / 2 + 0.15;
      ln([R, hookBot], [R - bw, barY + 0.2], rs); ln([R, hookBot], [R + bw, barY + 0.2], rs);
      if (rt === 'spreader') { P.poly([T(R - bw, barY), T(R + bw, barY), T(R + bw, barY + 0.2), T(R - bw, barY + 0.2)], { closed: true, stroke: '#1d1d1d', w: 0.16, fill: '#f2c230', layer: 'RIGGING' }); ln([R - bw, barY], [R - half, pickY], rs); ln([R + bw, barY], [R + half, pickY], rs); }
      else { P.poly([T(R - bw, barY), T(R + bw, barY), T(R + bw, barY + 0.25), T(R - bw, barY + 0.25)], { closed: true, stroke: '#1d1d1d', w: 0.16, fill: '#9aa4ad', layer: 'RIGGING' }); for (const f of [-1, -0.34, 0.34, 1]) ln([R + bw * f * 0.97, barY], [R + half * f, pickY], { ...rs, w: 0.16 }); }
    } else {
      const fr = (sl ? sl.legs : 2) === 4 ? [-1, -0.34, 0.34, 1] : [-1, 1];
      for (const f of fr) ln([R, hookBot], [R + half * f, pickY], Math.abs(f) < 1 ? { ...rs, w: rs.w * 0.6 } : rs);
    }
    if (sl && o.callout !== false) {
      const txt = `${sl.label.toUpperCase()}${sl.L ? ' ' + fmtM(sl.L) : ''} @${Math.round(sl.ang)}°${sl.wll ? ' · WLL ' + sl.wll + 'T' : ''}`;
      const q = T(R + half + 0.6, (hookBot + topY) / 2); P.text(q[0] + 1, q[1], txt, { size: 2.4, color: '#5a3a12', layer: 'RIGGING' });
    }
  }
  // load
  const lsty = { stroke: '#1d1d1d', w: 0.2, layer: 'LOAD' };
  const box = (fill) => P.poly([T(R - lL / 2, landY), T(R + lL / 2, landY), T(R + lL / 2, topY), T(R - lL / 2, topY)], { closed: true, ...lsty, fill });
  const segsX = (x0, x1, step, y0, y1, st) => { const sg = []; for (let x = x0; x < x1 - 1e-6; x += step) { const p = T(x, y0), q = T(x, y1); sg.push([p[0], p[1], q[0], q[1]]); } P.path(sg, { ...st, layer: 'LOAD' }); };
  if (shape === 'coil') {
    const c = T(R, landY + lH / 2), rr = lH / 2 * k; P.circle(c[0], c[1], rr, { ...lsty, fill: '#9aa3ad' });
    P.circle(c[0], c[1], rr * 0.72, { stroke: '#6d7680', w: 0.12, fill: 'none', layer: 'LOAD' }); P.circle(c[0], c[1], rr * 0.5, { stroke: '#6d7680', w: 0.12, fill: 'none', layer: 'LOAD' }); P.circle(c[0], c[1], rr * 0.3, { ...lsty, fill: '#ffffff' });
  } else if (shape === 'cylinder') {
    const ry = Math.min(0.35, lH * 0.12);
    const ellPts = (y, a0, a1) => { const pts = []; for (let i = 0; i <= 24; i++) { const a = a0 + (a1 - a0) * i / 24; pts.push(T(R + lL / 2 * Math.cos(a), y + ry * Math.sin(a))); } return pts; };
    P.poly([T(R - lL / 2, topY), ...ellPts(landY + ry, Math.PI, 2 * Math.PI), T(R + lL / 2, topY)], { closed: true, ...lsty, fill: '#a9bccb' });
    P.poly(ellPts(topY, 0, 2 * Math.PI), { closed: true, ...lsty, fill: '#c8d6e2' });
  } else if (shape === 'bundle') {
    box('#8d9298'); segsX(R - lL / 2 + 0.15, R + lL / 2, Math.max(0.12, lH / 4), landY + 0.05, topY - 0.05, { stroke: '#5d6268', w: 0.08 });
    for (const f of [-0.25, 0.25]) { const p = T(R + lL * f - 0.08, topY), q = T(R + lL * f + 0.08, landY); P.rect(Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1]), { fill: '#e0a800', stroke: 'none', layer: 'LOAD' }); }
  } else if (shape === 'chiller') {
    box('#c3cad3'); segsX(R - lL / 2 + 0.2, R + lL / 2 - 0.1, 0.18, landY + 0.25, topY - 0.45, { stroke: '#8b95a1', w: 0.08 });
    const nf = Math.max(1, Math.round(lL / 1.6)); for (let i = 0; i < nf; i++) { const cx = R - lL / 2 + (i + 0.5) * lL / nf; P.poly([T(cx - 0.55, topY), T(cx - 0.45, topY + 0.35), T(cx + 0.45, topY + 0.35), T(cx + 0.55, topY)], { closed: true, ...lsty, w: 0.15, fill: '#9aa5b1' }); }
  } else if (shape === 'drum') {
    const c = T(R, landY + lH / 2); P.circle(c[0], c[1], lH / 2 * k, { ...lsty, fill: '#c9c9c9' });
    P.circle(c[0], c[1], lH / 6 * k, { ...lsty, fill: '#888' });
    for (let i = -2; i <= 2; i++) { const p = T(R + i * lH / 7, landY + 0.08), q = T(R + i * lH / 7, landY + lH - 0.08); P.line(p[0], p[1], q[0], q[1], { stroke: '#555', w: 0.1, layer: 'LOAD' }); }
  } else {
    P.poly([T(R - lL / 2, landY), T(R + lL / 2, landY), T(R + lL / 2, topY), T(R - lL / 2, topY)], { closed: true, ...lsty, fill: shape === 'container' ? '#7a8fa6' : shape === 'tc' ? '#7cd65a' : '#d8d8d8' });
    if (shape === 'container') { const segs = []; for (let x = R - lL / 2 + 0.3; x < R + lL / 2; x += 0.3) { const p = T(x, landY + 0.1), q = T(x, topY - 0.1); segs.push([p[0], p[1], q[0], q[1]]); } P.path(segs, { stroke: '#4a5a6a', w: 0.1, layer: 'LOAD' }); }
    else if (shape === 'tc') { const segs = []; for (let x = R - lL / 2; x < R + lL / 2 - 0.01; x += lH) { const p = T(x, landY), q = T(Math.min(x + lH, R + lL / 2), topY); segs.push([p[0], p[1], q[0], q[1]]); } P.path(segs, { stroke: '#2f7d1d', w: 0.18, layer: 'LOAD' }); }
    else if (shape === 'box') { const p = T(R - lL / 2, landY), q = T(R + lL / 2, topY); P.line(p[0], p[1], q[0], q[1], { stroke: '#999', w: 0.1, layer: 'LOAD' }); const p2 = T(R - lL / 2, topY), q2 = T(R + lL / 2, landY); P.line(p2[0], p2[1], q2[0], q2[1], { stroke: '#999', w: 0.1, layer: 'LOAD' }); }
  }
  return { hookBot, blkTop, topY };
}

function drawObstacles(P, T, k, plan, view) {
  const site = plan.site || {};
  const R = (x0, y0, x1, y1, o) => { const p = T(x0, y1), q = T(x1, y0); return P.rect(Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1]), o); };
  const wheel = (x, y, r = 0.5, lay = 'VEHICLE') => { const c = T(x, y); P.circle(c[0], c[1], r * k, { stroke: '#222', w: 0.25, fill: '#2a2a2a', layer: lay }); P.circle(c[0], c[1], r * 0.45 * k, { stroke: '#222', w: 0.15, fill: '#9a9a9a', layer: lay }); };
  const label = (o, def, x, y, opt = {}) => { const s_ = o.label ?? def; if (!s_) return; const q = T(x, y); P.text(q[0], q[1], s_, { size: 3.2, anchor: 'middle', vAlign: 'middle', layer: 'TEXT', ...opt }); };
  for (const o of (site.obstacles || [])) {
    const e = objExtent(site, o), x = num(o.x), b = e.b, h = e.top - b;
    if (o.type === 'building' || o.type === 'wall' || o.type === 'box') {
      const x2 = Math.min(e.x1, view.xmax);
      const p = T(e.x0, e.top), q = T(x2, b);
      const rx = Math.min(p[0], q[0]), ry = Math.min(p[1], q[1]), rw = Math.abs(q[0] - p[0]), rh = Math.abs(q[1] - p[1]);
      if (o.type === 'box') {
        P.rect(rx, ry, rw, rh, { stroke: '#7a007a', w: 0.35, fill: o.fill || '#f1d5f1', layer: 'EQUIPMENT' });
        label(o, '', (e.x0 + x2) / 2, b + h / 2, { color: '#7a007a', size: Math.min(4, Math.max(2.2, rw / 8)) });
        continue;
      }
      P.rect(rx, ry, rw, rh, { stroke: '#222', w: 0.35, fill: '#ffffff', layer: 'BUILDING' });
      brickHatch(P, rx, ry, rw, rh, { ch: Math.max(0.9, Math.min(1.6, rh / 40)), bw: Math.max(2.4, Math.min(3.6, rh / 16)) });
      if (e.x1 > view.xmax) P.line(q[0], ry - 2, q[0], ry + rh, { stroke: '#222', w: 0.35, layer: 'BUILDING', dash: true });
      const lab = o.label ?? (o.type === 'wall' ? 'WALL' : 'BUILDING');
      if (lab && rw > 20) P.text(rx + rw / 2, ry + rh / 2, lab, { size: Math.min(7, Math.max(3.5, rw / 12)), anchor: 'middle', vAlign: 'middle', color: COL.red, layer: 'TEXT', bg: '#ffffff' });
    } else if (o.type === 'container') {
      R(e.x0, b, e.x1, e.top, { stroke: '#1f3044', w: 0.3, fill: o.fill || '#7a8fa6', layer: 'CONTAINER' });
      const segs = []; for (let xx = e.x0 + 0.25; xx < e.x1 - 0.1; xx += 0.28) { const p1 = T(xx, b + 0.12), p2 = T(xx, e.top - 0.12); segs.push([p1[0], p1[1], p2[0], p2[1]]); }
      P.path(segs, { stroke: '#4a5a6a', w: 0.08, layer: 'CONTAINER' });
      label(o, (o.size === '40' ? "40' " : "20' ") + 'CONTAINER', (e.x0 + e.x1) / 2, b + h / 2, { color: '#fff', size: 2.6 });
    } else if (o.type === 'shed') {
      const wh = num(o.h, 3);
      const p = T(e.x0, b + wh), q = T(e.x1, b); const rx = Math.min(p[0], q[0]), ry = Math.min(p[1], q[1]), rw = Math.abs(q[0] - p[0]), rh = Math.abs(q[1] - p[1]);
      P.rect(rx, ry, rw, rh, { stroke: '#4a3a20', w: 0.3, fill: o.fill || '#e3d8bf', layer: 'STRUCTURE' });
      P.poly([T(e.x0 - 0.2, b + wh), T((e.x0 + e.x1) / 2, e.top), T(e.x1 + 0.2, b + wh)], { closed: true, stroke: '#4a3a20', w: 0.3, fill: '#a8762c', layer: 'STRUCTURE' });
      const dw = Math.min(1.1, (e.x1 - e.x0) * 0.25); P.poly([T(e.x0 + 0.6, b), T(e.x0 + 0.6, b + Math.min(2.1, wh * 0.75)), T(e.x0 + 0.6 + dw, b + Math.min(2.1, wh * 0.75)), T(e.x0 + 0.6 + dw, b)], { closed: true, stroke: '#4a3a20', w: 0.2, fill: '#c9b892', layer: 'STRUCTURE' });
      label(o, '', (e.x0 + e.x1) / 2, b + wh * 0.6, { size: Math.min(3.4, Math.max(2.2, rw / 8)), color: '#4a3a20' });
    } else if (o.type === 'tree') {
      const tw = Math.max(0.25, (e.x1 - e.x0) * 0.08); const tr = T(x - tw / 2, b + h * 0.38), tr2 = T(x + tw / 2, b);
      P.rect(tr[0], tr[1], tr2[0] - tr[0], tr2[1] - tr[1], { stroke: '#4a2a10', w: 0.2, fill: '#7a4a22', layer: 'TREE' });
      const cw = e.x1 - e.x0; [[0, 0.62, 0.42], [-0.22, 0.5, 0.3], [0.22, 0.5, 0.3], [0, 0.8, 0.3]].forEach(([dx, fy, fr]) => { const c = T(x + dx * cw, b + h * fy); P.circle(c[0], c[1], Math.min(fr * cw, h * 0.3) * k, { stroke: '#1f5a1f', w: 0.25, fill: '#3f8f3a', layer: 'TREE' }); });
      label(o, '', x, e.top + 0.9, { size: 2.6, color: '#1f5a1f' });
    } else if (o.type === 'pole') {
      const a = T(x, b), c = T(x, b + h); P.line(a[0], a[1], c[0], c[1], { stroke: '#6b6b6b', w: Math.max(0.5, 0.3 * k), layer: 'STRUCTURE' });
      const cw = (e.x1 - e.x0) / 2; const l1 = T(x - cw, b + h - 0.6), l2 = T(x + cw, b + h - 0.6); P.line(l1[0], l1[1], l2[0], l2[1], { stroke: '#555', w: Math.max(0.35, 0.15 * k), layer: 'STRUCTURE' });
      for (const f of [-1, -0.33, 0.33, 1]) { const q = T(x + cw * f * 0.9, b + h - 0.6); P.circle(q[0], q[1] - 0.25 * k, Math.max(0.4, 0.12 * k), { stroke: '#222', w: 0.12, fill: '#c9c9c9', layer: 'STRUCTURE' }); }
      label(o, '', x, e.top + 0.9, { size: 2.6, color: '#555' });
      if (o.live) { const q = T(x + cw + 0.4, b + h - 0.6); P.text(q[0] + 1, q[1], 'LIVE LINES', { size: 2.2, color: COL.red, layer: 'TEXT' }); }
    } else if (o.type === 'towercrane' && num(o.jib) > 0) {
      const mw = num(o.mastW, 2), hh = num(o.h, 30), jb = num(o.jib), cj = num(o.cjib, r2(jb * 0.3)), apex = Math.max(num(o.topH), 4) ;
      const segs = []; const L2 = (x1, y1, x2, y2) => { const p = T(x1, y1), q = T(x2, y2); segs.push([p[0], p[1], q[0], q[1]]); };
      for (let y = 0; y < hh - 0.01; y += mw) { const y2 = Math.min(hh, y + mw); L2(x - mw / 2, b + y, x - mw / 2, b + y2); L2(x + mw / 2, b + y, x + mw / 2, b + y2); L2(x - mw / 2, b + y, x + mw / 2, b + y); (Math.round(y / mw) % 2) ? L2(x - mw / 2, b + y, x + mw / 2, b + y2) : L2(x + mw / 2, b + y, x - mw / 2, b + y2); }
      const jy = b + hh, jd = 1.5; // jib: triangular lattice, height jd
      for (let s2 = 0; s2 < jb - 0.01; s2 += jd) { const s3 = Math.min(jb, s2 + jd); L2(x + s2, jy, x + s3, jy); L2(x + s2, jy + jd * (1 - s2 / jb * 0.5), x + s3, jy + jd * (1 - s3 / jb * 0.5)); L2(x + s2, jy, x + s3, jy + jd * (1 - s3 / jb * 0.5)); }
      L2(x + jb, jy, x + jb, jy + jd * 0.5);
      for (let s2 = 0; s2 < cj - 0.01; s2 += jd) { const s3 = Math.min(cj, s2 + jd); L2(x - s2, jy, x - s3, jy); L2(x - s2, jy + 1, x - s3, jy + 1); L2(x - s2, jy, x - s3, jy + 1); }
      L2(x - mw / 2, jy, x, jy + apex); L2(x + mw / 2, jy, x, jy + apex); L2(x, jy + apex, x + jb * 0.62, jy + jd * 0.7); L2(x, jy + apex, x - cj, jy + 1);
      P.path(segs, { stroke: '#16a316', w: 0.3, layer: 'STRUCTURE' });
      R(x - cj, jy - 2.2, x - cj + Math.min(3, cj * 0.35), jy, { stroke: '#222', w: 0.25, fill: '#9a9a9a', layer: 'STRUCTURE' });
      R(x + mw / 2, jy - 1.1, x + mw / 2 + 2.2, jy, { stroke: '#222', w: 0.2, fill: '#e8b100', layer: 'STRUCTURE' });
      const lp = T(x + mw / 2 + 1, b + hh * 0.5); P.text(lp[0] + 1, lp[1], o.label || 'TOWER CRANE', { size: 3.2, color: '#16a316', layer: 'TEXT' });
    } else if (o.type === 'towercrane' || o.type === 'tower') {
      const mw = e.x1 - e.x0, hh = o.type === 'towercrane' ? num(o.h, 30) : h;
      const segs = []; const step = o.type === 'towercrane' ? mw : Math.max(2, hh / 12);
      const wAt = (y) => o.type === 'tower' ? mw * (1 - 0.7 * y / hh) : mw;
      for (let y = 0; y < hh - 0.01; y += step) {
        const y2 = Math.min(hh, y + step), w1 = wAt(y) / 2, w2 = wAt(y2) / 2;
        const a = T(x - w1, b + y), bb = T(x + w1, b + y), c = T(x - w2, b + y2), d = T(x + w2, b + y2);
        segs.push([a[0], a[1], c[0], c[1]], [bb[0], bb[1], d[0], d[1]], [a[0], a[1], bb[0], bb[1]], (Math.round(y / step) % 2) ? [a[0], a[1], d[0], d[1]] : [bb[0], bb[1], c[0], c[1]]);
      }
      const tt = T(x - wAt(hh) / 2, b + hh), tt2 = T(x + wAt(hh) / 2, b + hh); segs.push([tt[0], tt[1], tt2[0], tt2[1]]);
      if (o.type === 'tower') { const arm = T(x - mw * 0.6, b + hh * 0.85), arm2 = T(x + mw * 0.6, b + hh * 0.85); segs.push([arm[0], arm[1], arm2[0], arm2[1]]); }
      P.path(segs, { stroke: o.type === 'towercrane' ? '#16a316' : COL.magenta, w: 0.3, layer: 'STRUCTURE' });
      if (o.type === 'towercrane' && num(o.topH) > 0) R(x - mw * 0.7, b + hh, x + mw * 0.7, b + hh + num(o.topH), { stroke: '#16a316', w: 0.3, fill: '#bff2b0', layer: 'STRUCTURE' });
      const lbl = o.label || (o.type === 'towercrane' ? 'TOWER CRANE' : '');
      if (lbl) { const lp = T(x + mw / 2 + 1, b + hh * 0.5); P.text(lp[0] + 1, lp[1], lbl, { size: 3.2, color: o.type === 'towercrane' ? '#16a316' : COL.magenta, layer: 'TEXT' }); }
    } else if (o.type === 'trailer') {
      const tl = 13.6;
      R(x, b + 1.1, x + tl, b + 1.45, { stroke: '#222', w: 0.3, fill: '#d0d0d0', layer: 'VEHICLE' });
      P.poly([T(x + tl - 0.2, b + 1.1), T(x + tl + 1.2, b + 1.6), T(x + tl + 1.2, b + 1.9), T(x + tl - 0.2, b + 1.45)], { closed: true, stroke: '#222', w: 0.3, fill: '#c0c0c0', layer: 'VEHICLE' });
      for (const ax of [x + 0.9, x + 2.2, x + 3.5]) wheel(ax, b + 0.5);
      const tx = x + tl + 0.2;
      R(tx, b + 0.9, tx + 6.2, b + 1.35, { stroke: '#222', w: 0.3, fill: '#bbb', layer: 'VEHICLE' });
      P.poly([T(tx + 3.9, b + 0.9), T(tx + 6.4, b + 0.9), T(tx + 6.4, b + 2.4), T(tx + 6.1, b + 3.5), T(tx + 3.9, b + 3.5)], { closed: true, stroke: '#222', w: 0.3, fill: '#f2f2f2', layer: 'VEHICLE' });
      P.poly([T(tx + 4.2, b + 2.4), T(tx + 6.0, b + 2.4), T(tx + 5.9, b + 3.2), T(tx + 4.2, b + 3.2)], { closed: true, stroke: '#222', w: 0.15, fill: '#9fc3d8', layer: 'VEHICLE' });
      for (const ax of [tx + 0.9, tx + 2.2, tx + 5.3]) wheel(ax, b + 0.5);
      if (o.label) label(o, '', x + tl / 2, b - 0.6, { size: 3 });
    } else if (o.type === 'truck') {
      R(x, b + 1.0, x + 7.3, b + 1.5, { stroke: '#222', w: 0.3, fill: '#d0d0d0', layer: 'VEHICLE' });
      R(x + 7.3, b + 0.9, x + 10, b + 1.3, { stroke: '#222', w: 0.3, fill: '#bbb', layer: 'VEHICLE' });
      P.poly([T(x + 7.5, b + 1.0), T(x + 10, b + 1.0), T(x + 10, b + 2.5), T(x + 9.7, b + 3.6), T(x + 7.5, b + 3.6)], { closed: true, stroke: '#222', w: 0.3, fill: o.fill || '#f2f2f2', layer: 'VEHICLE' });
      P.poly([T(x + 7.8, b + 2.5), T(x + 9.6, b + 2.5), T(x + 9.5, b + 3.3), T(x + 7.8, b + 3.3)], { closed: true, stroke: '#222', w: 0.15, fill: '#9fc3d8', layer: 'VEHICLE' });
      for (const ax of [x + 1.2, x + 2.6, x + 8.6]) wheel(ax, b + 0.5);
      if (o.label) label(o, '', x + 3.6, b - 0.6, { size: 3 });
    } else if (o.type === 'person') {
      const c = T(x, b + 1.62); P.circle(c[0], c[1], 0.16 * k, { stroke: '#222', w: 0.2, fill: '#f2b705', layer: 'PERSON' });
      const ln = (x1, y1, x2, y2) => { const p = T(x1, y1), q = T(x2, y2); P.line(p[0], p[1], q[0], q[1], { stroke: '#222', w: 0.3, layer: 'PERSON' }); };
      ln(x, b + 1.46, x, b + 0.85); ln(x, b + 0.85, x - 0.18, b); ln(x, b + 0.85, x + 0.18, b); ln(x - 0.25, b + 1.05, x, b + 1.35); ln(x + 0.25, b + 1.05, x, b + 1.35);
    }
  }
}

// ---------- client drawings (environment) ----------
function envGeom(e) { return (typeof ENV_CACHE !== 'undefined' && ENV_CACHE[e.id]) || null; }
function envXf(e) { const r = num(e.rot, 0) * D2R, c = Math.cos(r), s_ = Math.sin(r), sc = num(e.sc, 0.001); return (u, v) => [num(e.x) + (u * c - v * s_) * sc, num(e.y) + (u * s_ + v * c) * sc]; }
function clipSeg(x1, y1, x2, y2, R) { // Liang-Barsky
  let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
  for (const [p, q] of [[-dx, x1 - R.x0], [dx, R.x1 - x1], [-dy, y1 - R.y0], [dy, R.y1 - y1]]) {
    if (p === 0) { if (q < 0) return null; } else { const t = q / p; if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; } }
  }
  return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
}
function envBBox(e) { // world bbox
  const g = envGeom(e); if (!g) return null; const f = envXf(e);
  const pts = g.img ? [[0, 0], [g.w, 0], [g.w, g.h], [0, g.h]] : [[g.bbox[0], g.bbox[1]], [g.bbox[2], g.bbox[1]], [g.bbox[2], g.bbox[3]], [g.bbox[0], g.bbox[3]]];
  const w = pts.map(([u, v]) => f(u, v)); return { x0: Math.min(...w.map(p => p[0])), x1: Math.max(...w.map(p => p[0])), y0: Math.min(...w.map(p => p[1])), y1: Math.max(...w.map(p => p[1])) };
}
function drawEnv(P, T, plan, view, clip) {
  for (const e of (plan.env || [])) {
    if ((e.view || 'elev') !== view || e.hidden) continue;
    const g = envGeom(e); if (!g) continue;
    const f = envXf(e), op = num(e.opacity, 1);
    if (g.img) {
      const a = T(...f(0, g.h)), sc = num(e.sc, 0.001);
      const p0 = T(clip.x0, clip.y1), p1 = T(clip.x1, clip.y0);
      const wpx = Math.hypot(...[0, 1].map(i => T(...f(g.w, g.h))[i] - a[i]));
      const hpx = Math.hypot(...[0, 1].map(i => T(...f(0, 0))[i] - a[i]));
      P.image(a[0], a[1], wpx, hpx, g.img, { layer: 'CLIENT-DWG', note: 'CLIENT DRAWING ' + (e.name || ''), rot: -num(e.rot, 0), opacity: op, clip: [Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.abs(p1[0] - p0[0]), Math.abs(p1[1] - p0[1])], fit: 'none' });
    } else {
      const segsBy = new Map();
      for (const [ci, flat] of g.polys) {
        const col = e.mono ? '#6b6b6b' : (g.pal[ci] || '#555');
        let arr = segsBy.get(col); if (!arr) segsBy.set(col, arr = []);
        let prev = f(flat[0], flat[1]);
        for (let i = 2; i < flat.length; i += 2) {
          const cur = f(flat[i], flat[i + 1]);
          const c = clipSeg(prev[0], prev[1], cur[0], cur[1], clip);
          if (c) { const p = T(c[0], c[1]), q = T(c[2], c[3]); arr.push([p[0], p[1], q[0], q[1]]); }
          prev = cur;
        }
      }
      for (const [col, segs] of segsBy) if (segs.length) P.path(segs, { stroke: col, w: 0.13, layer: 'CLIENT-DWG', opacity: op });
      const kk = Math.hypot(T(1, 0)[0] - T(0, 0)[0], T(1, 0)[1] - T(0, 0)[1]) * num(e.sc, 0.001);
      let nt = 0;
      for (const t of g.texts || []) {
        const size = t[2] * kk; if (size < 1.1 || size > 60 || nt > 1500) continue;
        const w = f(t[0], t[1]); if (w[0] < clip.x0 || w[0] > clip.x1 || w[1] < clip.y0 || w[1] > clip.y1) continue;
        const q = T(w[0], w[1]); nt++;
        P.text(q[0], q[1], t[4], { size, color: e.mono ? '#6b6b6b' : (g.pal[t[5]] || '#555'), rot: -(t[3] + num(e.rot, 0)), layer: 'CLIENT-DWG', opacity: op });
      }
    }
  }
}

function niceScale(kRaw) { // kRaw sheet-mm per metre → pick a standard 1:N
  const Ns = [50, 75, 100, 125, 150, 200, 250, 300, 400, 500, 600, 750, 800, 1000, 1250, 1500, 2000, 2500];
  const need = 1000 / kRaw; const N = Ns.find(n => n >= need) || Math.ceil(need / 500) * 500; return { N, k: 1000 / N };
}

// ---------- elevation view ----------
function elevationExtents(plan, res, crane, geo) {
  const v = plan.sheetView;
  if (v && v.x1 > v.x0 && v.y1 > v.y0) return { xmin: v.x0, xmax: v.x1, ymin: v.y0, ymax: v.y1 };
  const site = plan.site || {}; const Lc = num(crane.carrierLen, 12);
  const bodyCrane = liftBodyCrane(crane, res.side); // rear lift: carrier mirrored (reaches the other way); left / right: carrier end-on
  const drw = craneDrawing(bodyCrane);
  const cbx = !drw && typeof customBody === 'function' ? customBody(crane) : null;
  let xmin = drw ? Math.max(-16, drw.bbox[0]) - 1.5 : cbx ? Math.max(-30, customBBox(cbx)[0]) - 1.5 : -Math.max(num(crane.tail, 4), num(crane.outTrans, 7) / 2) - 1.5;
  if (bodyCrane._endDeck != null) xmin = Math.min(xmin, -num(crane.outTrans, 7) / 2 - 1.5); // end-on outrigger beams
  if (res.acc?.superlift) xmin = Math.min(xmin, -num(res.acc.slRadius, 15) - 4);
  let xmax = Math.max(geo.tip ? geo.tip.x : 10, res.R + num(plan.loads?.[0]?.l, 2) / 2) + 6;
  let ymax = Math.max(geo.tip ? geo.tip.y : 10, res.reqTipY || 0) + 2;
  for (const o of site.obstacles || []) {
    const e = objExtent(site, o);
    if (o.type === 'building' || o.type === 'wall') xmax = Math.max(xmax, Math.min(e.x1, Math.max(res.R + 10, e.x0 + 12)) + 3);
    else xmax = Math.max(xmax, e.x1 + 3);
    xmin = Math.min(xmin, e.x0 - 2);
    ymax = Math.max(ymax, e.top + 2);
  }
  let ymin = Math.min(0, groundAt(site, xmax), ...(site.obstacles || []).map(o => objBase(site, o))) - 1.2;
  return { xmin, xmax, ymin, ymax };
}

// ---------- lift side in the elevation ----------
// Habib's CAD bodies all have the boom pointing right. In some the carrier cab is on the boom side (front = 1: drawn as a lift over the FRONT), in others it
// is on the far side (front = -1: already a lift over the rear). For a REAR lift the carrier of a front = 1 body is mirrored about the slew centre so the
// cab sits away from the load; the superstructure (turntable and above) is left alone. The split — turntable level `deck` and front edge of the
// superstructure `x1`, both in m — was checked by eye on every body; bodies that are not listed (or front = 0) are never touched.
// A left / right lift would show the carrier end-on, which the CAD library has no view for, so those keep the side-on body (the glyph says which side).
const CAD_CARRIER = {
  ltm1090: { front: -1 }, ltm1100: { front: -1 }, ltm1220: { front: -1 }, ltm1650: { front: -1 }, ltm1750: { front: 0 }, ac700: { front: -1 }, ztc600v: { front: -1 },
  ltm1110: { front: 1 }, ltm1160: { front: 1 }, ltm1230: { front: 1 }, ltm1250: { front: 1 }, ltm1300: { front: 1 }, ltm1300_63: { front: 1 }, ltm1400: { front: 1 }, ltm1450: { front: 1 },
  ltm1500: { front: 1 }, ltm11200: { front: 1 }, ztc1000v: { front: 1 }, ztc300v: { front: 1, deck: 1.5 }, zat2000v: { front: 1 }
};
// one flag per body item: carrier = not part of the superstructure (below the turntable, or beyond its front edge) and not stray linework far ahead of the machine
function cadCarrierMask(dr, deck, xFront) {
  const bb = dr.body.map(([, , fl]) => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, sy = 0, n = 0; for (let i = 0; i < fl.length; i += 2) { const x = fl[i] / 100, y = fl[i + 1] / 100; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; sy += y; n++; } return { x0, x1, y0, cy: n ? sy / n : 0 }; });
  const sup = bb.map(b => b.cy >= deck && b.y0 >= deck - 0.35 && b.x1 <= xFront + 0.001);
  const frontX = Math.max(0, ...bb.filter((b, i) => !sup[i] && b.y0 < 1.0).map(b => b.x1));
  return bb.map((b, i) => !sup[i] && b.x0 <= frontX + 0.3);
}
// derived drawings, built once and kept out of Object.keys(CRANE_DRAWINGS): `~rear` = carrier mirrored (cab away from the load), `~side` = superstructure only
// (the carrier is then drawn end-on by drawCarrierEndView)
function cadDerived(key, dr, kind) {
  const spec = CAD_CARRIER[key]; if (!spec || !dr || dr.v !== 2 || !Array.isArray(dr.body) || typeof CRANE_DRAWINGS === 'undefined') return null;
  if (kind === 'rear' && spec.front !== 1) return null;
  const rk = key + '~' + kind;
  if (!Object.prototype.hasOwnProperty.call(CRANE_DRAWINGS, rk)) {
    const mask = cadCarrierMask(dr, spec.deck ?? 2.05, spec.x1 ?? 3.2);
    const body = kind === 'rear' ? dr.body.map((it, i) => mask[i] ? [it[0], it[1], it[2].map((v, j) => j % 2 ? v : -v)] : it) : dr.body.filter((_, i) => !mask[i]);
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9; for (const [, , fl] of body) for (let i = 0; i < fl.length; i += 2) { const x = fl[i] / 100, y = fl[i + 1] / 100; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
    Object.defineProperty(CRANE_DRAWINGS, rk, { value: { ...dr, body, bbox: body.length ? [bx0, Math.min(0, by0), bx1, by1] : dr.bbox }, enumerable: false, configurable: true, writable: true });
  }
  return rk;
}
// The crane record to draw in the elevation for a lift side. REAR: same crane, carrier mirrored where the CAD body has its cab on the boom side.
// LEFT / RIGHT: the boom is square to the carrier, so the carrier is seen end-on — the CAD body is cut down to its superstructure and `_endDeck` (turntable level, m)
// tells drawElevation to draw the end-on carrier. Bodies that are not in CAD_CARRIER (or have no CAD body) come back untouched.
function liftBodyCrane(crane, side) {
  if (!crane || !crane.drawing || crane.drawing === 'proc' || typeof CRANE_DRAWINGS === 'undefined') return crane;
  const key = (typeof DRAWING_ALIAS !== 'undefined' && DRAWING_ALIAS[crane.drawing]) || crane.drawing; const spec = CAD_CARRIER[key];
  const rk = spec ? cadDerived(key, CRANE_DRAWINGS[key], sideOf(side) === 'rear' ? 'rear' : 'side') : null;
  return rk ? (sideOf(side) === 'rear' ? { ...crane, drawing: rk } : { ...crane, drawing: rk, _endDeck: spec.deck ?? 2.05 }) : crane;
}
// carrier seen end-on (outrigger beams, jacks, mats, chassis, tyres, slewing ring) — the same end view the procedural body uses, standing under a CAD superstructure
function drawCarrierEndView(P, T, crane, plan, deck0, side) {
  const B = BRAND[brandOf(crane)]; const paint = crane.tint ? (crane.color || '#f5c400') : '#ffffff'; const truck = /truck/i.test(crane.type || ''); // same paint rule as the CAD body
  const W = num(crane.width, 2.75), tr = truck ? 0.56 : 0.66, lift = 0.12, deck = deck0 - 0.12, oT = num(crane.outTrans, 7) / 2;
  const st = { stroke: '#1b1b1b', w: 0.2, layer: 'CRANE' };
  const poly = (pts, s2 = {}) => P.poly(pts.map(([x, y]) => T(x, y)), { closed: true, ...st, ...s2 });
  const rect = (x0, y0, x1, y1, s2 = {}) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], s2);
  const line = (x1, y1, x2, y2, s2 = {}) => { const a = T(x1, y1), c = T(x2, y2); P.line(a[0], a[1], c[0], c[1], { ...st, ...s2 }); };
  const mat = matDims(plan?.matSize);
  const spn = typeof outSpans === 'function' ? outSpans(crane, outExtOf(plan)) : null; // the boom side (+x) is the lift side; each side full or half out
  const reach = (sx) => !spn ? oT : (sx > 0) === (side === 'left') ? spn.yL : spn.yR;
  for (const sx of [-1, 1]) {
    const jx = sx * (reach(sx) - 0.25);
    rect(jx - mat[0] / 2, 0, jx + mat[0] / 2, 0.2, { fill: '#8a6d3b', layer: 'MATS' });
    for (let i = 1; i < 4; i++) line(jx - mat[0] / 2 + i * mat[0] / 4, 0.02, jx - mat[0] / 2 + i * mat[0] / 4, 0.18, { w: 0.08, stroke: '#5c4524', layer: 'MATS' });
    poly([[jx - 0.4, 0.2], [jx + 0.4, 0.2], [jx + 0.3, 0.38], [jx - 0.3, 0.38]], { fill: '#3d3d3d' });
    rect(jx - 0.12, 0.38, jx + 0.12, 1.12, { fill: '#b9bcc0' });
    rect(jx - 0.25, 1.0, jx + 0.25, 1.86, { fill: shade(paint, -14) });
    const x0 = sx * (W / 2 - 0.2), x1 = jx + sx * 0.25;
    poly([[x0, 1.12], [x1, 1.12], [x1, 1.5], [x0, 1.5]], { fill: shade(paint, -6) });
    line(x0, 1.31, x1, 1.31, { w: 0.08, stroke: shade(paint, -35) });
  }
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
  rect(-1.3, deck, 1.3, deck0 + 0.06, { fill: '#3a3a3a' });
}
// Plan-view orientation glyph: the carrier from above (cab up, so the driver's left is the left of the picture) with the boom as a red arrow and the words
// LIFT OVER REAR / LEFT / RIGHT. (x, y) = top-left corner, w = width in drawing units; o.ds = text size unit. Returns { w, h }.
function sideGlyphH(crane, w, ds = 4.4) { // height of the glyph for a given width (it follows the crane's proportions)
  const Lc = num(crane?.carrierLen, 12), oT = num(crane?.outTrans, 7) / 2, Ra = Math.max(0.55 * Lc, oT + 5), xm = Ra + 0.9;
  return (0.64 * Lc + 4.4 + Math.max(0.36 * Lc, Ra) + 0.9) * w / (2 * xm) + ds * 2.1;
}
function drawSideGlyph(P, x, y, w, crane, side, o = {}) {
  side = sideOf(side);
  const Lc = num(crane?.carrierLen, 12), W = num(crane?.width, 2.75), oT = num(crane?.outTrans, 7) / 2, oL = num(crane?.outLong, 7) / 2, tail = Math.min(num(crane?.tail, 4), 0.5 * Lc);
  const col = crane?.color || '#f5c400', ds = o.ds || 4.4, LY = 'SIDE-GLYPH';
  const Ra = Math.max(0.55 * Lc, oT + 5), xm = Ra + 0.9, yTop = 0.64 * Lc + 4.4, yBot = -Math.max(0.36 * Lc, Ra) - 0.9;   // metres
  const s = w / (2 * xm), hDraw = (yTop - yBot) * s, labH = ds * 2.1, H = hDraw + labH;
  const G = (mx, my) => [x + (mx + xm) * s, y + (yTop - my) * s];
  const d = { rear: [0, -1], left: [-1, 0], right: [1, 0] }[side];
  const GB = (u, v) => G(u * d[0] - v * d[1], u * d[1] + v * d[0]);                  // boom frame: u along the boom, v to its left
  P.rect(x, y, w, H, { fill: '#ffffff', stroke: '#555', w: 0.25, layer: LY });
  P.circle(...G(0, 0), tail * s, { stroke: '#a0a0a0', w: 0.18, fill: 'none', layer: LY });
  for (const sy of [-oL, oL]) { const a = G(-oT, sy), b = G(oT, sy); P.line(a[0], a[1], b[0], b[1], { stroke: '#333', w: 0.4, layer: LY }); for (const sx of [-oT, oT]) { const c = G(sx, sy); P.rect(c[0] - 0.7 * s, c[1] - 0.7 * s, 1.4 * s, 1.4 * s, { stroke: '#222', w: 0.15, fill: '#8a6d3b', layer: LY }); } }
  const poly = (pts, o2) => P.poly(pts, { closed: true, stroke: '#222', w: 0.25, layer: LY, ...o2 });
  poly([G(-W / 2, 0.64 * Lc), G(W / 2, 0.64 * Lc), G(W / 2, -0.36 * Lc), G(-W / 2, -0.36 * Lc)], { fill: col });
  poly([G(-W / 2, 0.64 * Lc), G(W / 2, 0.64 * Lc), G(W / 2, 0.64 * Lc - 2.2), G(-W / 2, 0.64 * Lc - 2.2)], { fill: shade(col, -28) });
  poly([GB(-tail, -1.5), GB(2.6, -1.5), GB(2.6, 1.5), GB(-tail, 1.5)], { fill: shade(col, -12) });
  poly([GB(0, -0.55), GB(Ra * 0.86, -0.4), GB(Ra * 0.86, 0.4), GB(0, 0.55)], { fill: col });
  poly([GB(Ra, 0), GB(Ra * 0.86, 1.15), GB(Ra * 0.86, -1.15)], { fill: COL.red, stroke: COL.red, w: 0.15 });
  const c0 = G(0, 0); P.circle(c0[0], c0[1], Math.max(0.5, 0.45 * s), { stroke: '#000', w: 0.15, fill: '#000', layer: LY });
  const f = G(0, 0.64 * Lc + 0.5), f2 = G(0, 0.64 * Lc + 2.1); P.line(f[0], f[1], f2[0], f2[1], { stroke: '#333', w: 0.3, layer: LY });
  P.poly([f2, [f2[0] - 0.9 * s, f2[1] + 1.1 * s], [f2[0] + 0.9 * s, f2[1] + 1.1 * s]], { closed: true, fill: '#333', stroke: '#333', w: 0.1, layer: LY });
  const ft = G(0, 0.64 * Lc + 3.35); P.text(ft[0], ft[1], 'FRONT', { size: Math.max(1.6, ds * 0.62), anchor: 'middle', vAlign: 'middle', color: '#333', layer: LY });
  const lab = 'LIFT OVER ' + SIDE_NAME[side].replace(' SIDE', ''); const ls = Math.min(ds * 1.05, fitSize(lab, w - 3, ds * 1.05, true));
  P.text(x + w / 2, y + hDraw + labH / 2, lab, { size: ls, bold: true, anchor: 'middle', vAlign: 'middle', color: '#000', layer: LY });
  return { w, h: H };
}

function drawElevation(P, box, plan, calc, li, ctx = {}) {
  const res = calc.loads[li], crane = res.crane || calc.crane, load = plan.loads[li], geo = res.geo;
  if (!geo.tip) { P.text(box.x + box.w / 2, box.y + box.h / 2, 'Geometry not solvable — check radius / boom', { size: 5, anchor: 'middle', color: COL.red }); return null; }
  let ext = ctx.ext || elevationExtents(plan, res, crane, geo);
  let sc, k, T;
  if (ctx.fixed) { ({ T, k } = ctx.fixed); sc = { N: Math.round(1000 / k), k }; ext = ctx.fixed.ext; }
  else {
    const padL = 14, padR = 22, padT = 12, padB = ctx.padB ?? 38;
    const kRaw = Math.min((box.w - padL - padR) / (ext.xmax - ext.xmin), (box.h - padT - padB) / (ext.ymax - ext.ymin));
    sc = ctx.scale || niceScale(kRaw); k = sc.k;
    const usedW = (ext.xmax - ext.xmin) * k, usedH = (ext.ymax - ext.ymin) * k;
    const ox = box.x + padL + Math.max(0, (box.w - padL - padR - usedW) / 2);
    const oy = box.y + box.h - padB - Math.max(0, (box.h - padT - padB - usedH) * 0.15);
    T = (x, y) => [ox + (x - ext.xmin) * k, oy - (y - ext.ymin) * k];
  }
  // world window actually visible in this box (for clipping client drawings)
  const inv = (px, py) => { const a = T(0, 0), b_ = T(1, 1); return [(px - a[0]) / (b_[0] - a[0]), (py - a[1]) / (b_[1] - a[1])]; };
  const w0 = inv(box.x, box.y + box.h), w1 = inv(box.x + box.w, box.y);
  const clipW = { x0: Math.max(ext.xmin - 4, w0[0]), x1: Math.min(ext.xmax + 4, w1[0]), y0: Math.max(ext.ymin - 4, w0[1]), y1: Math.min(ext.ymax + 6, w1[1]) };
  if (ctx.fixed) Object.assign(clipW, { x0: w0[0], x1: w1[0], y0: w0[1], y1: w1[1] });
  drawEnv(P, T, plan, 'elev', clipW);
  const site = plan.site || {};
  // ground
  const gx1 = ext.xmin, gx2 = ext.xmax;
  const stepX = site.stepX !== '' && site.stepX != null ? num(site.stepX) : null;
  const tg = num(site.targetGround, 0);
  const groundSegs = stepX != null && tg !== 0 ? [[gx1, stepX, 0], [stepX, gx2, tg]] : [[gx1, gx2, 0]];
  const band = 1.0;
  if (site.groundType === 'barge') {
    const b1 = T(gx1, 0), b2 = T(Math.max(4, num(crane.outLong, 8) / 2 + 3), -1.8);
    P.rect(b1[0], b1[1], b2[0] - b1[0], b2[1] - b1[1], { stroke: '#222', w: 0.35, fill: '#e65c00', layer: 'GROUND' });
    const lb = T((gx1 + 2), -0.9); P.text(lb[0] + 20, lb[1] + 1.5, 'BARGE', { size: 4.5, color: '#000', bold: true, layer: 'TEXT' });
    const w1 = T(gx1, -1.0), w2 = T(gx2, ext.ymin);
    const segs = []; for (let yy = w1[1] + 2; yy < w2[1]; yy += 2.2) for (let xx = w1[0]; xx < w2[0] - 3; xx += 4) segs.push([xx, yy, xx + 2, yy - 0.6], [xx + 2, yy - 0.6, xx + 4, yy]);
    P.path(segs, { stroke: '#3d7fd1', w: 0.12, layer: 'WATER' });
    const wl = T(gx1, -1.0); P.line(wl[0], wl[1], w2[0], wl[1], { stroke: '#3d7fd1', w: 0.3, layer: 'WATER' });
  } else if (!site.hideGround) {
    for (const [a, b, y] of groundSegs) {
      const p = T(a, y), q = T(b, y - band);
      P.line(p[0], p[1], q[0], p[1], { stroke: '#222', w: 0.4, layer: 'GROUND' });
      stipple(P, p[0], p[1] + 0.3, q[0] - p[0], q[1] - p[1] - 0.3, Math.round(a * 7 + 3));
    }
    if (groundSegs.length > 1) { const p = T(stepX, 0), q = T(stepX, tg); P.line(p[0], p[1], q[0], q[1], { stroke: '#222', w: 0.4, layer: 'GROUND' }); }
  }
  drawObstacles(P, T, k, plan, { xmax: ctx.objXmax ?? ext.xmax });
  const liftSide = sideOf(load), bodyCrane = liftBodyCrane(crane, liftSide);
  if (bodyCrane._endDeck != null) drawCarrierEndView(P, T, crane, plan, bodyCrane._endDeck, liftSide); // left / right lift: carrier end-on
  const ce = drawCraneElevation(P, T, k, bodyCrane, geo, res, plan, { livery: ctx.livery });
  const hl = drawHookAndLoad(P, T, k, crane, geo, res, load, { rigH: plan.rigging?.height, sheaveR: ce?.cad ? ce.cad.sheaveR * 0.6 : 0.25 });
  // ---- dimensions: thin, CAD style — every dimension stops on its extension lines and none run through the drawing ----
  const dimSize = ctx.dimSize || 4.4;
  const Wd = (x, y) => T(x, y);
  const objs = (site.obstacles || []).map(o => ({ o, e: objExtent(site, o) }));
  // boom length(s): parallel to the boom on its upper side, from the foot pin to the head sheave
  {
    const parts = geo.kind === 'main' ? [[geo.pivot, geo.theta, geo.L, ctx.mainLabel]] : [[geo.pivot, geo.theta, geo.Lb, ctx.mainLabel], [geo.jibFoot, geo.kind === 'luffing' ? geo.gamma : geo.gamma, geo.Lj]];
    const cad = craneDrawing(crane); const top = cad && cad.v === 2 ? Math.max(0.2, cad.secs[0].n1) : num(crane.boomDepth, 1.2) * 0.6;
    parts.forEach(([A, deg, Lm, lab], i) => {
      const u = [Math.cos(deg * D2R), Math.sin(deg * D2R)];
      const a = Wd(A.x, A.y), b = Wd(A.x + Lm * u[0], A.y + Lm * u[1]);
      const off = Math.max(5, (i === 0 ? top : 0.9) * k + 4.5);
      dimA(P, a, b, off, String(mm(lab && i === 0 ? lab : Lm)), { side: 'up', size: dimSize });
    });
  }
  // boom angle: arc clear of the cab, short reference tick only
  {
    const pv = Wd(geo.pivot.x, geo.pivot.y); const Lm = geo.kind === 'main' ? geo.L : geo.Lb;
    const rr = Math.max(13, Math.min(34, Math.max(6.5, Lm * 0.3) * k));
    P.arc(pv[0], pv[1], rr, 0, geo.theta, { stroke: COL.red, w: 0.14, layer: 'DIM' });
    P.line(pv[0] + rr - 2.2, pv[1], pv[0] + rr + 2.2, pv[1], { stroke: COL.red, w: 0.14, layer: 'DIM' });
    const ea = geo.theta * D2R; arrow(P, pv[0] + rr * Math.cos(ea), pv[1] - rr * Math.sin(ea), -ea - Math.PI / 2, { stroke: COL.red, al: 1.8, aw: 0.5 });
    const am = geo.theta / 2 * D2R; P.text(pv[0] + Math.cos(am) * (rr + 3.6), pv[1] - Math.sin(am) * (rr + 3.6), (Math.round(geo.theta * 10) / 10).toFixed(1).replace(/\.0$/, '') + '°', { size: dimSize, color: COL.green, vAlign: 'middle', layer: 'DIMTEXT', bg: '#ffffff' });
    if (geo.kind !== 'main') {
      const jf = Wd(geo.jibFoot.x, geo.jibFoot.y); const r2_ = Math.max(10, Math.min(24, geo.Lj * k * 0.2));
      P.arc(jf[0], jf[1], r2_, 0, geo.gamma, { stroke: COL.red, w: 0.14, layer: 'DIM' });
      P.line(jf[0] + r2_ - 2, jf[1], jf[0] + r2_ + 2, jf[1], { stroke: COL.red, w: 0.14, layer: 'DIM' });
      const gm = geo.gamma / 2 * D2R; P.text(jf[0] + Math.cos(gm) * (r2_ + 3.2), jf[1] - Math.sin(gm) * (r2_ + 3.2), Math.round(geo.gamma) + '°', { size: dimSize * 0.9, color: COL.green, vAlign: 'middle', layer: 'DIMTEXT', bg: '#ffffff' });
    }
  }
  // tip height: vertical dimension right of the load and of anything standing under it
  {
    let xd = Math.max(geo.tip.x + 1.6, res.R + num(load.l, 2) / 2 + 1.4);
    for (let it = 0; it < 6; it++) { const hit = objs.find(({ e }) => e.x0 - 0.6 < xd && e.x1 + 0.6 > xd && e.top > groundAt(site, xd) + 0.2); if (!hit) break; xd = hit.e.x1 + 1.6; }
    xd = Math.min(xd, ext.xmax - 0.5);
    const gy = groundAt(site, xd);
    const a = Wd(xd, gy), b = Wd(xd, geo.tip.y), t0 = Wd(geo.tip.x, geo.tip.y);
    P.line(t0[0] + 1.2, t0[1], b[0] + 1.5, b[1], { stroke: COL.red, w: 0.12, layer: 'DIM' });
    dimA(P, a, b, 0, String(mm(geo.tip.y - gy)), { side: 'right', size: dimSize, extA: false, extB: false });
  }
  // horizontal dimensions under the ground: slew centre → obstacle edges → load
  let row = 0; const oyG = T(ext.xmin, ext.ymin)[1];
  const below = (n) => oyG + 7 + n * 8.5;
  const hdim = (x0, x1, y0w, y1w, n, lab, sz) => { const a = Wd(x0, y0w), b = Wd(x1, y1w); const yL = below(n); const g = 1.2;
    P.line(a[0], a[1] + g, a[0], yL + 1.5, { stroke: COL.red, w: 0.12, layer: 'DIM' }); P.line(b[0], b[1] + g, b[0], yL + 1.5, { stroke: COL.red, w: 0.12, layer: 'DIM' });
    dimA(P, [a[0], yL], [b[0], yL], 0, lab, { side: 'up', size: sz || dimSize, extA: false, extB: false }); };
  hdim(0, res.R, 0, groundAt(site, res.R), row++, String(mm(res.R)));
  for (const { o, e } of objs) {
    const x = num(o.x), h = e.top - e.b, base = e.b;
    if (o.type === 'person') continue;
    const near = ['tree', 'pole', 'towercrane', 'tower'].includes(o.type) ? x : e.x0;
    // height on the face toward the crane, outside the object
    if (h > 0.5 && ['building', 'wall', 'shed', 'box', 'container', 'tree', 'pole', 'towercrane', 'tower'].includes(o.type)) {
      const xf = ['tree', 'pole', 'towercrane', 'tower'].includes(o.type) ? e.x1 + 0.9 : e.x0;
      const a = Wd(xf, base), b = Wd(xf, e.top);
      dimA(P, a, b, ['tree', 'pole', 'towercrane', 'tower'].includes(o.type) ? 0 : 3.2, String(mm(h)), { side: ['tree', 'pole', 'towercrane', 'tower'].includes(o.type) ? 'right' : 'left', size: dimSize * 0.9 });
    }
    if (near > 0.5 && Math.abs(near - res.R) > 0.5 && ['building', 'wall', 'shed', 'tree', 'pole', 'towercrane', 'tower'].includes(o.type)) {
      const n = row++; hdim(0, near, 0, base, n, String(mm(near)), dimSize * 0.9);
      if (res.R > near) { const yL = below(n); const a = Wd(near, 0), c = Wd(res.R, 0); dimA(P, [a[0], yL], [c[0], yL], 0, String(mm(res.R - near)), { side: 'up', size: dimSize * 0.9, extA: false, extB: false }); }
    }
  }
  if (stepX != null && tg !== 0) { const a = Wd(stepX - 1.2, 0), b = Wd(stepX - 1.2, tg); dimA(P, a, b, 0, String(mm(Math.abs(tg))), { side: 'left', size: dimSize * 0.85, extA: false, extB: false }); }
  // load landing level (if above ground and not obviously dimensioned)
  if (ctx.title !== false) {
    const tl = ctx.titleLines || [`${crane.cls}T MOBILE CRANE`, 'ELEVATION VIEW'];
    let ty = Math.min(box.y + box.h - 6, below(row) + 9);
    tl.forEach((s, i) => { const sz = i === 0 ? 6.5 : 6.5; P.text(box.x + box.w * 0.42, ty + i * 9, s, { size: sz, bold: true, anchor: 'middle', underline: true, layer: 'TITLE' }); });
  }
  if (ctx.loadTag) P.text(box.x + 6, box.y + 18, ctx.loadTag, { size: 4.2, bold: true, layer: 'TITLE' });
  // lift side glyph: on the sheet top-left of the view, hopping to a free corner if the boom, rope, load or a building is in the way; on the live canvas pinned next to the crane
  if (ctx.sideGlyph !== false) {
    const gw = ctx.sideGlyph?.w || dimSize * 9, ds = dimSize, gh = sideGlyphH(crane, gw, ds), m = 3;
    let gx = ctx.sideGlyph?.x ?? box.x + m, gy = ctx.sideGlyph?.y ?? box.y + m;
    if (ctx.fixed && !ctx.sideGlyph) {
      // live canvas: pinned in the world next to the crane, at a fixed screen size — above the tail end (the side away from the boom, which is always clear),
      // its right edge just left of the boom foot and its bottom edge one carrier height above the carrier; kept inside the view if the crane is panned off
      gx = T(geo.pivot.x - 0.5, 0)[0] - gw; gy = T(0, 2 * num(crane.carrierH, 3.8))[1] - gh;
      gx = Math.max(box.x + 4, Math.min(box.x + box.w - gw - 4, gx)); gy = Math.max(box.y + 4, Math.min(box.y + box.h - gh - 4, gy));
    } else if (!ctx.fixed && !ctx.sideGlyph) {
      const avoid = []; // screen-space segments to keep clear of
      for (const [a, b] of geo.segments || []) { const p = T(a.x, a.y), q = T(b.x, b.y); avoid.push([p[0], p[1], q[0], q[1]]); }
      { const tp = T(geo.tip.x, geo.tip.y), lp = T(res.R, res.landY); avoid.push([tp[0], tp[1], lp[0], lp[1]]); const lw2 = Math.max(1, num(load.l, 2)) * k / 2; avoid.push([lp[0] - lw2, lp[1], lp[0] + lw2, lp[1] - num(load.h, 1.5) * k]); }
      for (const { e } of objs) { const a = T(e.x0, e.top), b = T(e.x1, e.b); avoid.push([a[0], a[1], b[0], a[1]], [a[0], b[1], b[0], b[1]], [a[0], a[1], a[0], b[1]], [b[0], a[1], b[0], b[1]]); }
      const hits = (rx, ry) => avoid.some(([x1, y1, x2, y2]) => { const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 2)); for (let i = 0; i <= n; i++) { const px = x1 + (x2 - x1) * i / n, py = y1 + (y2 - y1) * i / n; if (px > rx - 2 && px < rx + gw + 2 && py > ry - 2 && py < ry + gh + 2) return true; } return false; });
      const cand = [[box.x + m, box.y + m], [box.x + box.w - gw - m, box.y + m], [box.x + m, box.y + m + gh + 3], [box.x + box.w - gw - m, box.y + m + gh + 3]];
      const free = cand.find(([cx, cy]) => !hits(cx, cy)); if (free) [gx, gy] = free;
    }
    drawSideGlyph(P, gx, gy, gw, crane, liftSide, { ds });
  }
  return { scale: sc, T, ext };
}


// ---------- site plan viewport (client plot + crane footprint, working radius) ----------
// site plan settings + the headings that follow from the load's lift side: sp.side, sp.boom (boom / load heading, deg) and sp.carrier (the way the cab faces, deg);
// `load` defaults to the active load. Headings run counter-clockwise from east, north up — the same as the 3D twin.
function sitePlanState(plan, load) {
  const sp = Object.assign({ enabled: false, cx: 0, cy: 0, rot: 0, carrierRot: null }, plan.sitePlan || {});
  const ld = load || (plan.loads || [])[Math.min((plan.loads || []).length - 1, plan.activeLoad || 0)] || {};
  sp.side = sideOf(ld); sp.boom = boomHeadingFor(plan, ld); sp.carrier = carrierHeadingFor(plan, ld);
  return sp;
}
function sitePlanExtents(plan, calc) {
  const sp = sitePlanState(plan); const R = (calc.loads[plan.activeLoad || 0] || calc.loads[0])?.R || 10;
  if (sp.view && sp.view.x1 > sp.view.x0) return { ...sp.view };
  let x0 = sp.cx - R - 6, x1 = sp.cx + R + 6, y0 = sp.cy - R - 6, y1 = sp.cy + R + 6;
  for (const e of plan.env || []) { if (e.view !== 'plan' || e.hidden) continue; const b = envBBox(e); if (b) { x0 = Math.min(x0, b.x0); x1 = Math.max(x1, b.x1); y0 = Math.min(y0, b.y0); y1 = Math.max(y1, b.y1); } }
  return { x0, x1, y0, y1 };
}
function drawCraneFootprint(P, T, k, crane, sp, R, lw, livery, ext) {
  const cr = (sp.carrier != null ? num(sp.carrier) : (sp.carrierRot == null || sp.carrierRot === '' ? num(sp.rot) + 180 : num(sp.carrierRot) + 180)) * D2R, br = (sp.boom != null ? num(sp.boom) : num(sp.rot)) * D2R;
  const rot = (a) => (u, v) => T(sp.cx + u * Math.cos(a) - v * Math.sin(a), sp.cy + u * Math.sin(a) + v * Math.cos(a));
  const C = rot(cr), B = rot(br);
  const poly = (f, pts, o) => P.poly(pts.map(([u, v]) => f(u, v)), { closed: true, ...o });
  const Lc = num(crane.carrierLen, 12), W = num(crane.width, 2.75), oL = num(crane.outLong, 7) / 2, oT = num(crane.outTrans, 7) / 2;
  const col = crane.color || '#f5c400';
  const spn = ext && typeof outSpans === 'function' ? outSpans(crane, ext) : null; // per side: full or half out (v = the carrier's left)
  for (const sx of [-oL, oL]) for (const sy of spn ? [-spn.yR, spn.yL] : [-oT, oT]) {
    const a = C(sx, 0), b = C(sx, sy); P.line(a[0], a[1], b[0], b[1], { stroke: '#333', w: 0.6, layer: 'SITE-CRANE' });
    poly(C, [[sx - 0.75, sy - 0.75], [sx + 0.75, sy - 0.75], [sx + 0.75, sy + 0.75], [sx - 0.75, sy + 0.75]], { stroke: '#222', w: 0.2, fill: '#8a6d3b', layer: 'SITE-CRANE' });
  }
  // carrier: the cab (darker block) is at the +u end, so u points the way the carrier faces; the slew centre sits 36% from the rear
  poly(C, [[0.64 * Lc, -W / 2], [-0.36 * Lc, -W / 2], [-0.36 * Lc, W / 2], [0.64 * Lc, W / 2]], { stroke: '#222', w: 0.3, fill: col, layer: 'SITE-CRANE' });
  poly(C, [[0.64 * Lc, -W / 2], [0.64 * Lc - 2.2, -W / 2], [0.64 * Lc - 2.2, W / 2], [0.64 * Lc, W / 2]], { stroke: '#222', w: 0.2, fill: shade(col, -15), layer: 'SITE-CRANE' });
  { const a = C(0.64 * Lc + 0.5, 0), b = C(0.64 * Lc + 0.5 + Math.max(2.4, 7 / k), 0); P.line(a[0], a[1], b[0], b[1], { stroke: '#333', w: 0.3, layer: 'SITE-CRANE' }); arrow(P, b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0]), { stroke: '#333', al: 2.4, aw: 0.9, layer: 'SITE-CRANE' });
    const t = C(0.64 * Lc + 0.5 + Math.max(2.4, 7 / k) + 2.2 / k, 0); P.text(t[0], t[1], 'FRONT', { size: 2.4, anchor: 'middle', vAlign: 'middle', color: '#333', layer: 'SITE-CRANE' }); }
  const tail = num(crane.tail, 4);
  poly(B, [[-tail, -1.5], [2.6, -1.5], [2.6, 1.5], [-tail, 1.5]], { stroke: '#222', w: 0.3, fill: shade(col, -22), layer: 'SITE-CRANE' });
  const bd = num(crane.boomDepth, 1.2) / 2;
  poly(B, [[-1.5, -bd], [R, -bd * 0.6], [R, bd * 0.6], [-1.5, bd]], { stroke: '#222', w: 0.3, fill: col, layer: 'SITE-CRANE' });
  if (livery && R > 6) letterBoom(P, T, k, { x: sp.cx, y: sp.cy }, br, 2.8, Math.min(R * 0.6, R - 4), 0, bd * 1.6, livery, col, { upright: true, capF: 0.5 });
  const c0 = T(sp.cx, sp.cy); P.circle(c0[0], c0[1], 0.9, { stroke: '#000', w: 0.2, fill: '#000', layer: 'SITE-CRANE' });
  // working radius + tail swing
  const ring = (r, stroke, dash) => { const segs = []; for (let a = 0; a < 360; a += 3) { const p = T(sp.cx + r * Math.cos(a * D2R), sp.cy + r * Math.sin(a * D2R)), q = T(sp.cx + r * Math.cos((a + 3) * D2R), sp.cy + r * Math.sin((a + 3) * D2R)); segs.push([p[0], p[1], q[0], q[1]]); } P.path(segs, { stroke, w: 0.3, dash, layer: 'SITE-RADIUS' }); };
  ring(R, COL.red, true); ring(tail, '#666', true);
  const lp = B(R, 0); P.rect(lp[0] - lw / 2 * k, lp[1] - lw / 2 * k, lw * k, lw * k, { stroke: '#7a007a', w: 0.35, fill: '#f1d5f1', layer: 'SITE-LOAD' });
  const lab = B(R * 0.55, R * 0.06 + 1); P.text(lab[0], lab[1], 'R=' + mm(R), { size: 3.6, color: COL.green, anchor: 'middle', rot: -((br * R2D % 360 + 360) % 360 > 90 && (br * R2D % 360 + 360) % 360 < 270 ? br * R2D + 180 : br * R2D), layer: 'DIMTEXT' });
}
function drawSitePlan(P, box, plan, calc, ctx = {}) {
  const li = plan.activeLoad || 0; const res = calc.loads[li] || calc.loads[0]; const load = plan.loads[li] || plan.loads[0]; const sp = sitePlanState(plan, load);
  let ext, T, k, scl;
  if (ctx.fixed) ({ T, k, ext } = ctx.fixed);
  else {
    ext = sitePlanExtents(plan, calc);
    const kRaw = Math.min((box.w - 16) / (ext.x1 - ext.x0), (box.h - 22) / (ext.y1 - ext.y0));
    scl = niceScale(kRaw); k = scl.k;
    const ox = box.x + 8 + Math.max(0, (box.w - 16 - (ext.x1 - ext.x0) * k) / 2), oy = box.y + box.h - 12 - Math.max(0, (box.h - 22 - (ext.y1 - ext.y0) * k) / 2);
    T = (x, y) => [ox + (x - ext.x0) * k, oy - (y - ext.y0) * k];
  }
  const a = T(0, 0), b_ = T(1, 1); const inv = (px, py) => [(px - a[0]) / (b_[0] - a[0]), (py - a[1]) / (b_[1] - a[1])];
  const w0 = inv(box.x, box.y + box.h), w1 = inv(box.x + box.w, box.y);
  drawEnv(P, T, plan, 'plan', { x0: w0[0], x1: w1[0], y0: w0[1], y1: w1[1] });
  drawCraneFootprint(P, T, k, calc.crane, sp, res?.R || 10, res?.tandem ? 0.01 : Math.max(1, num(load?.l, 2)), ctx.livery, typeof outExtOf === 'function' ? outExtOf(plan) : null);
  // v9 tandem: the other cranes where they stand, and the one load between the lifting points with each crane's share
  const TD = res?.tandem;
  if (TD) {
    for (const pk of TD.picks.slice(1)) { const cr = pk.res?.crane; if (!cr) continue; const bh = normDeg(pk.boomHd + num(pk.mv?.swing));
      drawCraneFootprint(P, T, k, cr, { cx: pk.base.x, cy: pk.base.y, boom: bh, carrier: normDeg(bh - SIDE_OFFSET[sideOf(pk.side)]) }, pk.Rnow ?? pk.R, 0.01, ctx.livery, typeof outExtOf === 'function' ? outExtOf(rigOf(plan, pk.crane)) : null); }
    const ax = num(TD.axis) * D2R, p0 = TD.picks[0], xs = TD.picks.map(q => q.x); const x0 = Math.min(...xs) - 0.6, x1 = Math.max(...xs) + 0.6, hw = Math.max(0.6, num(load?.h, 1.5) * 0.6);
    const at = (s, n) => { const d = s - p0.x; return T(p0.pos.x + d * Math.cos(ax) - n * Math.sin(ax), p0.pos.y + d * Math.sin(ax) + n * Math.cos(ax)); };
    P.poly([at(x0, -hw), at(x1, -hw), at(x1, hw), at(x0, hw)], { closed: true, stroke: '#7a007a', w: 0.35, fill: '#f1d5f1', layer: 'SITE-LOAD' });
    for (const pk of TD.picks) { const q = at(pk.x, num(pk.z) - num(p0.z)); P.circle(q[0], q[1], 0.8, { fill: '#7a007a', stroke: 'none', layer: 'SITE-LOAD' });
      P.text(q[0], q[1] - 2.4, `C${pk.crane + 1} ${(+pk.share).toFixed(1)}T`, { size: 2.8, bold: true, anchor: 'middle', color: '#7a007a', bg: '#ffffff', layer: 'SITE-LOAD' }); }
  }
  if (!ctx.fixed) {
    P.text(box.x + 6, box.y + 8, 'SITE PLAN', { size: 5.5, layer: 'TITLE' });
    P.text(box.x + 6, box.y + 13.5, 'LIFT OVER ' + SIDE_NAME[sp.side], { size: 3.4, bold: true, layer: 'TITLE' });
    if (scl) P.text(box.x + box.w - 4, box.y + box.h - 4, '1:' + scl.N, { size: 3.4, anchor: 'end', layer: 'TITLE' });
  } else if (ctx.sideTag !== false) { // live canvas: pinned under the crane (whatever way it faces), fixed screen size
    const Lc = num(calc.crane.carrierLen, 12), c0 = T(sp.cx, sp.cy), r = (Math.max(0.64 * Lc, num(calc.crane.outTrans, 7) / 2 + 1) + 2.5) * k;
    P.text(Math.max(box.x + 40, Math.min(box.x + box.w - 40, c0[0])), Math.max(box.y + 8, Math.min(box.y + box.h - 6, c0[1] + r)), 'LIFT OVER ' + SIDE_NAME[sp.side], { size: 4.4, bold: true, anchor: 'middle', layer: 'TITLE' });
  }
  return { scale: scl, T, k, ext };
}

// ---------- load chart table ----------
function drawChartTable(P, box, crane, chartDef, parsed, selCols, selRow) {
  if (!chartDef || !parsed || !parsed.cols.length) {
    P.text(box.x + box.w / 2, box.y + box.h / 2, 'No load chart in library for ' + (crane?.model || 'this crane'), { size: 4, anchor: 'middle', color: COL.grey });
    return;
  }
  const hdr = [`${crane.make || ''} ${crane.model}  —  ${chartDef.name}`.trim(), `Prerequisites: counterweight ${chartDef.cwt ?? crane.cwt} t · outriggers ${chartDef.outrigger || crane.outrigger} m · ${chartSectorsOf(chartDef).includes('360') ? '360° slewing' : 'lifting ' + chartSectorLabel(chartDef)} · capacities in tonnes${chartDef.kind === 'luffing' ? ` · main boom ${chartDef.mainLabel || chartDef.mainLen} m + jib ${chartDef.jibLen} m (columns = main boom angle °)` : chartDef.kind === 'fixedjib' ? ` · fly jib ${chartDef.jibLen} m (columns = offset °)` : ''}`];
  P.rect(box.x, box.y, box.w, 15, { fill: '#f7ecd2', stroke: 'none', layer: 'CHART' });
  P.text(box.x + 3, box.y + 5.5, hdr[0], { size: 3.6, bold: true, layer: 'CHART' });
  wrapText(hdr[1], Math.floor(box.w / 1.65)).slice(0, 2).forEach((l, i) => P.text(box.x + 3, box.y + 10 + i * 3.6, l, { size: 2.5, layer: 'CHART' }));
  const top = box.y + 17;
  const rows = parsed.rows; const nc = parsed.cols.length;
  const hasFalls = parsed.cols.some(c => c.falls);
  const hasLabel = parsed.cols.some(c => c.label);
  const avail = box.h - 17 - 2;
  const nHead = 1 + (hasLabel ? 1 : 0);
  const rh = Math.min(6.5, avail / (rows.length + nHead + (hasFalls ? 1 : 0)));
  const rcw = Math.min(18, box.w * 0.08); const cw = (box.w - 2 * rcw) / nc;
  const fs = Math.max(1.6, Math.min(3.2, rh * 0.62, cw * 0.28));
  const headFill = '#e9a23b';
  P.rect(box.x, top, box.w, rh * nHead, { fill: headFill, stroke: '#222', w: 0.2, layer: 'CHART' });
  P.text(box.x + rcw / 2, top + rh * nHead / 2, chartDef.kind === 'luffing' ? 'R (m) / °' : 'R (m)', { size: fs, anchor: 'middle', vAlign: 'middle', bold: true, layer: 'CHART' });
  P.text(box.x + box.w - rcw / 2, top + rh * nHead / 2, 'R (m)', { size: fs, anchor: 'middle', vAlign: 'middle', bold: true, layer: 'CHART' });
  parsed.cols.forEach((c, i) => {
    const cx = box.x + rcw + cw * (i + 0.5);
    P.text(cx, top + rh * 0.5, (c.head || c.L) + (chartDef.kind === 'main' ? '' : '°'), { size: fs, anchor: 'middle', vAlign: 'middle', bold: true, layer: 'CHART' });
    if (hasLabel) P.text(cx, top + rh * 1.5, c.label || '', { size: fs * 0.85, anchor: 'middle', vAlign: 'middle', layer: 'CHART' });
  });
  const y0 = top + rh * nHead;
  const vsegs = [];
  rows.forEach((r, ri) => {
    const y = y0 + ri * rh;
    if (ri % 2) P.rect(box.x, y, box.w, rh, { fill: '#ececec', stroke: 'none', layer: 'CHART' });
    P.text(box.x + rcw / 2, y + rh / 2, String(r[0]), { size: fs, anchor: 'middle', vAlign: 'middle', layer: 'CHART' });
    P.text(box.x + box.w - rcw / 2, y + rh / 2, String(r[0]), { size: fs, anchor: 'middle', vAlign: 'middle', layer: 'CHART' });
    r.slice(1).forEach((v, i) => { if (v != null) P.text(box.x + rcw + cw * (i + 0.5), y + rh / 2, String(v), { size: fs, anchor: 'middle', vAlign: 'middle', layer: 'CHART' }); });
  });
  let yEnd = y0 + rows.length * rh;
  if (hasFalls) {
    P.rect(box.x, yEnd, box.w, rh, { fill: '#f3f3f3', stroke: 'none', layer: 'CHART' });
    P.text(box.x + rcw / 2, yEnd + rh / 2, 'Falls', { size: fs * 0.9, anchor: 'middle', vAlign: 'middle', layer: 'CHART' });
    parsed.cols.forEach((c, i) => c.falls && P.text(box.x + rcw + cw * (i + 0.5), yEnd + rh / 2, String(c.falls), { size: fs, anchor: 'middle', vAlign: 'middle', layer: 'CHART' }));
    yEnd += rh;
  }
  for (let i = 0; i <= nc; i++) vsegs.push([box.x + rcw + cw * i, top, box.x + rcw + cw * i, yEnd]);
  vsegs.push([box.x, top, box.x, yEnd], [box.x + box.w, top, box.x + box.w, yEnd], [box.x, yEnd, box.x + box.w, yEnd]);
  P.path(vsegs, { stroke: '#444', w: 0.15, layer: 'CHART' });
  // highlights
  (selCols || []).forEach((sc) => {
    if (sc.ci == null || sc.ci < 0) return;
    const x = box.x + rcw + cw * sc.ci;
    let yb = yEnd;
    const ri = rows.findIndex(r => Math.abs(r[0] - sc.row) < 1e-6);
    if (ri >= 0) {
      const lastFilled = rows.reduce((m, r, i) => r[sc.ci + 1] != null ? i : m, -1);
      yb = y0 + (Math.max(ri, lastFilled) + 1) * rh;
      P.rect(box.x + 0.4, y0 + ri * rh, box.w - 0.8, rh, { stroke: COL.red, w: 0.35, fill: 'none', layer: 'CHART-MARK' });
    }
    P.rect(x, top, cw, yb - top, { stroke: COL.red, w: 0.45, fill: 'none', layer: 'CHART-MARK' });
  });
  if (chartDef.source) P.text(box.x + box.w, Math.min(box.y + box.h - 0.5, yEnd + 3.5), 'Source: ' + chartDef.source + ' — verify against OEM chart', { size: 2, anchor: 'end', color: COL.grey, layer: 'CHART' });
}

// ---------- crane dimension schematic ----------
function drawCraneDims(P, box, crane) {
  if (crane.imgDims) { P.image(box.x + 4, box.y + 12, box.w - 8, box.h - 16, crane.imgDims, { layer: 'IMAGE', note: 'CRANE DIMENSIONS IMAGE' }); return; }
  const Lc = num(crane.carrierLen, 12);
  const side = { x: box.x + 10, y: box.y + 14, w: box.w - 20, h: box.h * 0.42 };
  const geo = { pivot: { x: num(crane.pivotX, -1.5), y: num(crane.pivotH, 3) } };
  const bl = Math.min(num(crane.boomMin, 12), Lc * 1.05), d = num(crane.boomDepth, 1.2);
  const left = Math.min(-0.64 * Lc, geo.pivot.x + 0.4 - bl), right = 0.36 * Lc + 1.5;
  const k = Math.min(side.w / (right - left + 1), side.h / 6.5);
  const ox = side.x + (side.w - (right - left) * k) / 2 - left * k, oy = side.y + side.h - 8;
  const T = (x, y) => [ox + x * k, oy - y * k];
  drawCrane(P, T, k, crane, geo, { mat: '1.0x1.0' });
  // stowed boom over cab
  const b0 = T(geo.pivot.x + 0.4, geo.pivot.y + d * 0.2), b1 = T(geo.pivot.x - bl + 0.4, geo.pivot.y + d * 0.2);
  P.rect(Math.min(b0[0], b1[0]), b0[1] - d * k / 2, Math.abs(b1[0] - b0[0]), d * k, { stroke: '#222', w: 0.25, fill: crane.color || '#e8b33a', layer: 'CRANE' });
  const f = T(-0.64 * Lc, 0), r = T(0.36 * Lc, 0);
  dimLine(P, f[0], oy + 5, r[0], oy + 5, String(mm(Lc)), { size: 3, color: '#000' });
  const ht = T(0.36 * Lc + 0.8, 0), ht2 = T(0.36 * Lc + 0.8, num(crane.carrierH, 3.8));
  dimLine(P, ht[0], ht[1], ht2[0], ht2[1], String(mm(num(crane.carrierH, 3.8))), { size: 3, color: '#000' });
  // plan view
  const pl = { x: box.x + 10, y: box.y + box.h * 0.5, w: box.w - 20, h: box.h * 0.48 };
  const oL = num(crane.outLong, 7), oT = num(crane.outTrans, 7), W = num(crane.width, 2.75), tail = num(crane.tail, 4);
  const kp = Math.min(pl.w / (right - left + 3), pl.h / (oT + 4));
  const cx = pl.x + (pl.w - (right - left) * kp) / 2 - left * kp, cy = pl.y + pl.h / 2;
  const TP = (x, y) => [cx + x * kp, cy - y * kp];
  const c1 = TP(-0.64 * Lc, W / 2), c2 = TP(0.36 * Lc, -W / 2);
  P.rect(c1[0], c1[1], c2[0] - c1[0], c2[1] - c1[1], { stroke: '#222', w: 0.3, fill: crane.color || '#e8b33a', layer: 'CRANE' });
  for (const sx of [-oL / 2, oL / 2]) for (const sy of [-oT / 2, oT / 2]) {
    const a = TP(sx, 0), b = TP(sx, sy); P.line(a[0], a[1], b[0], b[1], { stroke: '#444', w: 0.9, layer: 'CRANE' });
    P.rect(b[0] - 0.5 * kp, b[1] - 0.5 * kp, kp, kp, { stroke: '#222', w: 0.25, fill: '#666', layer: 'CRANE' });
  }
  { const a = TP(-tail, 1.4), b = TP(2.4, -1.4); P.rect(a[0], a[1], b[0] - a[0], b[1] - a[1], { stroke: '#222', w: 0.25, fill: shade(crane.color || '#e8b33a', -15), layer: 'CRANE' }); const c = TP(num(crane.pivotX, -1.5) + 0.4, d / 2), e = TP(num(crane.pivotX, -1.5) + 0.4 - bl, -d / 2); P.rect(e[0], c[1], c[0] - e[0], e[1] - c[1], { stroke: '#222', w: 0.25, fill: crane.color || '#e8b33a', layer: 'CRANE' }); }
  const sc = TP(0, 0); P.circle(sc[0], sc[1], 1.5 * kp, { stroke: '#222', w: 0.25, fill: '#999', layer: 'CRANE' });
  P.arc(sc[0], sc[1], tail * kp, 120, 240, { stroke: COL.red, w: 0.25, layer: 'DIM' });
  P.text(sc[0] - tail * kp - 1, sc[1] - tail * kp * 0.6, 'R=' + mm(tail), { size: 2.8, anchor: 'end', layer: 'DIM' });
  const a1 = TP(-oL / 2, -oT / 2 - 1.2), a2 = TP(oL / 2, -oT / 2 - 1.2); dimLine(P, a1[0], a1[1], a2[0], a2[1], String(mm(oL)), { size: 3, color: '#000' });
  const b1_ = TP(0.36 * Lc + 1.2, -oT / 2), b2_ = TP(0.36 * Lc + 1.2, oT / 2); dimLine(P, b1_[0], b1_[1], b2_[0], b2_[1], String(mm(oT)), { size: 3, color: '#000' });
  P.text(box.x + box.w - 2, box.y + box.h - 2, 'Schematic — dimensions from library, verify against OEM data sheet', { size: 2, anchor: 'end', color: COL.grey });
}

// ---------- rigging detail ----------
function drawRigging(P, box, plan, calc) {
  const rg = plan.rigging || {}, rig = calc.rig; if (!rig) return;
  const li = num(rg.loadIdx, 0); const load = plan.loads[li] || plan.loads[0];
  const cx = box.x + box.w * 0.42, top = box.y + 30;
  const sl = num(rg.slingL, 6), spread = num(rg.spread, 2);
  const lL = Math.max(spread + 0.6, num(load.l, 3)), lH = num(load.h, 2);
  const k = Math.min((box.h * 0.5) / (rig.vert + lH + 2.5), (box.w * 0.55) / (lL + 2));
  const hook = [cx, top + 22];
  P.poly([[cx - 4, top], [cx + 4, top], [cx + 4, top + 14], [cx - 4, top + 14]], { closed: true, fill: '#e3b505', stroke: '#222', w: 0.3, layer: 'HOOK' });
  P.arc(cx, top + 18, 3.2, 180, 360, { stroke: '#222', w: 0.6, layer: 'HOOK' });
  P.line(cx, top + 14, cx, hook[1], { stroke: '#222', w: 0.4, layer: 'HOOK' });
  const pickY = hook[1] + rig.vert * k;
  const pts = [[cx - spread / 2 * k, pickY], [cx + spread / 2 * k, pickY]];
  for (const [x, y] of pts) { P.line(hook[0], hook[1], x, y, { stroke: '#111', w: 0.6, layer: 'RIGGING' }); P.circle(x, y + 1, 1.1, { stroke: COL.red, w: 0.4, fill: 'none', layer: 'RIGGING' }); }
  const lx = cx - lL / 2 * k; P.rect(lx, pickY + 2, lL * k, lH * k, { stroke: '#7a007a', w: 0.4, fill: '#f1d5f1', layer: 'LOAD' });
  P.text(cx, pickY + 2 + lH * k / 2, (load.name || 'LOAD').toUpperCase(), { size: 3.5, anchor: 'middle', vAlign: 'middle', color: '#7a007a' });
  // angle annotation (to horizontal at pick point)
  const [px, py] = pts[1];
  P.arc(px, py, 6, 180 - 0, 180 - (90 - rig.alpha) + 0, { stroke: COL.red, w: 0.25, layer: 'DIM' });
  P.text(px - 8, py - 2.5, Math.round(rig.toHoriz) + '°', { size: 3.5, color: COL.green, anchor: 'end', layer: 'DIMTEXT' });
  // leaders
  const mid = [(hook[0] + px) / 2, (hook[1] + py) / 2];
  P.line(mid[0], mid[1], mid[0] + 18, mid[1] - 18, { stroke: '#222', w: 0.2 }); arrow(P, mid[0], mid[1], Math.atan2(18, -18), { stroke: '#222', al: 2, aw: 0.7 });
  const sDesc = rg.slingDesc || `${sl}m x ${rig.wll || '?'}t sling - ${rig.legs}No's`;
  wrapText(sDesc, 28).forEach((l, i) => P.text(mid[0] + 19, mid[1] - 19 + i * 5, l, { size: 4.2 }));
  if (rg.shackleDesc || rig.shackleWLL) {
    const sp = [px + 1, py + 1]; P.line(sp[0], sp[1], sp[0] + 16, sp[1] - 8, { stroke: '#222', w: 0.2 }); arrow(P, sp[0], sp[1], Math.atan2(8, -16), { stroke: '#222', al: 2, aw: 0.7 });
    wrapText(rg.shackleDesc || `${rig.shackleWLL}t BOW SHACKLE - ${rig.legs}No's`, 24).forEach((l, i) => P.text(sp[0] + 17, sp[1] - 8 + i * 5, l, { size: 4.2 }));
  }
  // table
  const rows = [
    ['LOAD WEIGHT (incl. contingency)', fmtT(rig.Wl)], ['NO. OF LEGS / EFFECTIVE', `${rig.legs} / ${rig.eff}`],
    ['SLING LENGTH', fmtM(sl)], ['PICK POINT SPREAD', fmtM(spread)], ['SLING ANGLE FROM VERTICAL', rig.alpha.toFixed(1) + '°'],
    ['TENSION PER LEG = W / (n·cos α)', fmtT(rig.T)], ['SLING WLL (VERTICAL)', rig.wll ? fmtT(rig.wll) : '—'], ['SLING UTILISATION', rig.slingUtil != null ? rig.slingUtil.toFixed(1) + '%' : '—'],
    ['SHACKLE WLL', rig.shackleWLL ? fmtT(rig.shackleWLL) : '—'], ['SHACKLE UTILISATION', rig.shackleUtil != null ? rig.shackleUtil.toFixed(1) + '%' : '—']];
  const tx = box.x + 8, tw = box.w - 16, ty = box.y + box.h - 8 - rows.length * 6.5 - 8;
  P.rect(tx, ty, tw, 8, { fill: '#7f7f7f', stroke: '#222', w: 0.3 }); P.text(tx + tw / 2, ty + 4, 'SLING TENSION CALCULATION', { size: 4, bold: true, anchor: 'middle', vAlign: 'middle', color: '#fff' });
  rows.forEach(([a, b], i) => { const y = ty + 8 + i * 6.5; P.rect(tx, y, tw, 6.5, { stroke: '#222', w: 0.2, fill: 'none' }); P.line(tx + tw * 0.68, y, tx + tw * 0.68, y + 6.5, { stroke: '#222', w: 0.2 }); P.text(tx + 2, y + 3.25, a, { size: 3, bold: true, vAlign: 'middle' }); P.text(tx + tw * 0.84, y + 3.25, b, { size: 3.2, anchor: 'middle', vAlign: 'middle' }); });
}

// ---------- text metrics (canvas when available) so sheet text is sized to fit its box ----------
let _tm = null;
function textW(str, size, bold) {
  try { if (!_tm && typeof document !== 'undefined') _tm = document.createElement('canvas').getContext('2d'); } catch { _tm = null; }
  if (_tm) { _tm.font = `${bold ? 'bold ' : ''}100px Arial, Helvetica, sans-serif`; return _tm.measureText(String(str)).width / 100 * size; }
  return String(str).length * size * (bold ? 0.6 : 0.54);
}
function fitSize(str, maxW, size, bold) { const w = textW(str, size, bold); return w > maxW ? size * maxW / w : size; }
function cellText(P, cx, cy, str, maxW, size, o = {}) { // one line, shrunk to fit; two lines when it would get too small
  str = String(str ?? ''); let sz = fitSize(str, maxW, size, o.bold);
  if (sz < size * 0.72 && str.includes(' ')) {
    const words = str.split(' '); let best = null;
    for (let i = 1; i < words.length; i++) { const l1 = words.slice(0, i).join(' '), l2 = words.slice(i).join(' '); const s2 = Math.min(fitSize(l1, maxW, size, o.bold), fitSize(l2, maxW, size, o.bold), o.h ? o.h / 2.5 : size); if (!best || s2 > best[2]) best = [l1, l2, s2]; }
    if (best && best[2] > sz * 1.12) { const [l1, l2, s2] = best; P.text(cx, cy - s2 * 0.55, l1, { size: s2, anchor: 'middle', vAlign: 'middle', bold: o.bold, color: o.color, layer: o.layer || 'TABLE' }); P.text(cx, cy + s2 * 0.55, l2, { size: s2, anchor: 'middle', vAlign: 'middle', bold: o.bold, color: o.color, layer: o.layer || 'TABLE' }); return; }
  }
  P.text(cx, cy, str, { size: sz, anchor: 'middle', vAlign: 'middle', bold: o.bold, color: o.color, layer: o.layer || 'TABLE' });
}

// ---------- the data rows printed in the panel (each one can be switched off in Sheet; DAF, angle, tip height are optional) ----------
const SHEET_ROWS = {
  crane: [['crane', 'Crane selected'], ['config', 'Config selected'], ['outrigger', 'Outrigger'], ['cwt', 'Counter weight'], ['boom', 'Boom length'], ['tele', 'Telescoping'], ['jib', 'Fly jib / jib'], ['acc', 'Accessories'], ['falls', 'No. of falls'], ['mat', 'Mat size'], ['wind', 'Wind speed']],
  load: [['name', 'Load name'], ['cat', 'Lift category'], ['rig', 'Crane'], ['boom', 'Boom length (per load)'], ['radius', 'Radius'], ['side', 'Lift side'], ['angle', 'Boom angle'], ['tipH', 'Boom tip height'], ['hookH', 'Hook height'], ['weight', 'Load weight'], ['cont', 'Contingency'], ['hook', 'Hook block'], ['tackles', 'Lifting tackles'], ['other', 'Other deductions'], ['total', 'Total lift weight'], ['daf', 'DAF'], ['design', 'Design lift weight'], ['cap', 'Chart capacity'], ['util', '% chart capacity'], ['sf', 'Safety factor'], ['sling', 'Rigging / sling tension']],
  extra: [['tacklesList', 'Tackle schedule'], ['signoff', 'Sign-off box'], ['notes', 'General notes'], ['history', 'Drawing history']]
};
const SHEET_ROWS_OFF = { 'load.angle': 1, 'load.tipH': 1, 'load.hookH': 1 };
function sheetRowOn(plan, key) { const R = plan.sheetRows || {}; if (R.hide?.[key]) return false; if (SHEET_ROWS_OFF[key]) return !!R.show?.[key]; return true; }

// ---------- values typed over the printed ones (Print → Change values on the sheet) ----------
// plan.sheetRows.ov = { rowId: 'TEXT' }; an empty entry means "use the calculated value". Row ids are stable: c<crane>.<key>#<n>, l<lift>.<key>#<n>,
// t<lift>.<tackle>, g.<key> (outrigger pressure table), w.<key> (weather table).
function sheetOvOf(plan, id) { const v = id ? plan?.sheetRows?.ov?.[id] : null; return v != null && String(v).trim() !== '' ? String(v).toUpperCase() : null; }
function sheetRow(plan, id, label, calcV) { const o = sheetOvOf(plan, id); return { id, label, calc: String(calcV ?? ''), v: o ?? String(calcV ?? ''), ov: o != null }; }
// rows whose typed-over value matters for safety (they get a warning in the checks)
const SHEET_OV_SAFETY = /^(l\d+\.(radius|weight|cont|hook|tackles|other|total|daf|design|cap|util|sf|sling)|c\d+\.(cwt|boom|outrigger)|g\.(P|press|allow|area|self|legs))/;
// every block of the data panel: [{ head, fill, small, rows: [{ id, label, calc, v, ov, custom? }] }]
function sheetBlocks(plan, calc, settings) {
  const S = settings; const on = (k) => sheetRowOn(plan, k);
  const blocks = []; const rigs = calc.rigs && calc.rigs.length ? calc.rigs : [{ i: 0, crane: calc.crane, pv: plan }];
  const multi = rigs.length > 1;
  for (const rg of rigs) {
    const pv = rg.pv, crane = rg.crane, ch = crane.charts?.[pv.chartIdx ?? 0]; const parsed = ch ? getChart(ch) : null; const col0 = parsed?.cols?.[+pv.colIdx || 0];
    const ld = plan.loads.map((l, i) => [l, calc.loads[i]]).filter(([, r]) => r.rigI === rg.i);
    const r0 = ld.find(([, r]) => calc.loads.indexOf(r) === (plan.activeLoad || 0))?.[1] || ld[0]?.[1];
    const G0 = geoSetup(pv, crane, ld[0]?.[0] || {}); const at = pv.attach || {};
    const perLoadBoom = ld.some(([l]) => l.colIdx !== '' && l.colIdx != null && +l.colIdx !== +pv.colIdx);
    const boomLen = r0?.tele?.mode === 'manual' ? r0.tele.L : G0.manual ? G0.gChart.mainLen : ch?.kind === 'luffing' || ch?.kind === 'fixedjib' ? (ch.mainLabel || ch.mainLen) : (num(pv.boomOverride) > 0 ? num(pv.boomOverride) : col0?.L);
    const rows = []; const seen = {};
    const add = (key, label, val) => { if (!on('crane.' + key)) return; const n = seen[key] = (seen[key] ?? -1) + 1; rows.push(sheetRow(plan, `c${rg.i}.${key}#${n}`, label, val)); };
    add('crane', 'CRANE SELECTED', (pv.modelTxt || crane.model).toUpperCase());
    add('config', 'CONFIG SELECTED', pv.config ?? ch?.config ?? '');
    { const ex = typeof outExtOf === 'function' ? outExtOf(pv) : null; add('outrigger', 'OUTRIGGER', (pv.outriggerTxt || ch?.outrigger || crane.outrigger || '').toUpperCase() + 'M' + (ex && outExtHalf(ex) ? ' · ' + outExtLabel(ex) : '')); }
    add('cwt', 'COUNTER WEIGHT', num(pv.cwt !== '' && pv.cwt != null ? pv.cwt : (ch?.cwt ?? crane.cwt)).toFixed(1) + 'T');
    if (!perLoadBoom) add('boom', 'BOOM LENGTH', fmtM(boomLen));
    if (r0?.tele?.mode === 'manual') add('tele', 'TELESCOPING', r0.tele.fr.map(f => Math.round(f * 100)).join('/') + ' %');
    if (G0.manual === 'fly') add('jib', 'FLY JIB', fmtM(num(at.jibLen)) + ' @ ' + num(at.offset) + '°');
    else if (G0.manual === 'luff') { add('jib', 'LUFFING JIB', fmtM(num(at.jibLen))); add('jib', 'MAIN BOOM ANGLE', num(at.boomAngle) + '°'); }
    else add('jib', ch?.kind === 'luffing' || ch?.kind === 'fixedjib' ? 'JIB LENGTH' : 'FLYJIB', ch?.jibLen ? fmtM(ch.jibLen) : 'N/A');
    if (r0?.acc?.yguy) add('acc', 'Y-GUYING', 'YES');
    if (r0?.acc?.superlift) add('acc', 'SUPERLIFT', fmtM(r0.acc.slRadius) + ' / ' + num(r0.acc.slBallast) + 'T');
    if (r0?.acc?.runner) add('acc', 'RUNNER', 'FITTED');
    add('falls', 'NO. OF FALLS', ((pv.falls || col0?.falls) ? (pv.falls || col0?.falls) + ' FALLS' : '—'));
    if (pv.matSize) add('mat', 'MAT SIZE', pv.matSize);
    if (calc.weather) add('wind', 'WIND SPEED (MAX)', calc.weather.maxG.toFixed(1) + 'M/S'); else if (pv.wind) add('wind', 'WIND SPEED', pv.wind);
    for (const c of (plan.sheetRows?.custom || []).filter(c => c.sec === 'crane' && (c.label || c.value))) rows.push({ id: null, label: String(c.label || '').toUpperCase(), v: String(c.value || '').toUpperCase(), custom: true });
    const classic = S.headerStyle === 'classic' && plan.loads.length === 1 && !multi;
    blocks.push({ head: classic ? 'CRANE DATA' : `M.CRANE DATA${multi ? ' ' : ''}${rg.i + 1}`, fill: classic ? '#ffffff' : COL.yellow, rows });
  }
  const merge = !!plan.mergeHook;
  calc.loads.forEach((r, i) => {
    const l = plan.loads[i]; const rows = []; const seen = {}; const add = (key, label, val) => { if (!on('load.' + key)) return; const n = seen[key] = (seen[key] ?? -1) + 1; rows.push(sheetRow(plan, `l${i}.${key}#${n}`, label, val)); };
    if (l.name) add('name', 'LOAD NAME', l.name.toUpperCase());
    if (l.liftType) add('cat', 'LIFT CATEGORY', String(l.liftType).toUpperCase());
    if (multi) add('rig', 'CRANE', `${r.rigI + 1} · ${(rigs.find(x => x.i === r.rigI)?.pv.modelTxt || r.crane.model).toUpperCase()}`);
    if (l.colIdx !== '' && l.colIdx != null) add('boom', 'BOOM LENGTH', fmtM(r.tele?.L ?? r.col?.L));
    add('radius', 'RADIUS', fmtM(r.R));
    add('side', 'LIFT SIDE', 'OVER ' + SIDE_NAME[sideOf(l)]);
    if (r.geo?.tip) { add('angle', r.geo.kind === 'luffing' ? 'JIB ANGLE' : 'BOOM ANGLE', (r.geo.kind === 'luffing' ? r.geo.gamma : r.geo.theta).toFixed(1) + '°'); add('tipH', 'BOOM TIP HEIGHT', fmtM(r.tipY)); add('hookH', 'HOOK HEIGHT', fmtM(r.hookY)); }
    if (r.empty) add('weight', 'LOAD WEIGHT', 'HOOK EMPTY'); else add('weight', 'LOAD WEIGHT', fmtT(r.W));
    if (r.contOn && r.contW > 0) add('cont', `CONTINGENCY ${num(r.cont)}%`, fmtT(r.contW));
    if (merge) add('hook', 'WEIGHT OF HOOK BLOCK + TACKLES', fmtT(r.hb + r.tk)); else { add('hook', 'WEIGHT OF HOOK BLOCK', fmtT(r.hb)); if (r.tk > 0 || !r.empty) add('tackles', 'WEIGHT OF LIFTING TACKLES', fmtT(r.tk)); }
    if (r.ex > 0) add('other', 'OTHER DEDUCTIONS', fmtT(r.ex));
    add('total', 'TOTAL LIFT WEIGHT', fmtT(r.total));
    if (r.daf) { add('daf', r.dafAuto ? `DAF (EN 13001-2 ${(l.daf?.cls || 'HC1')})` : 'DAF', r.daf.toFixed(3).replace(/0$/, '')); add('design', 'DESIGN LIFT WEIGHT', fmtT(r.design)); }
    add('cap', 'CHART CAPACITY', fmtT(r.cap)); add('util', '% CHART CAPACITY', r.util != null ? r.util.toFixed(2) + '%' : '—'); add('sf', 'SAFETY FACTOR', r.sf != null ? r.sf.toFixed(4) : '—');
    if (r.sling) { add('sling', 'RIGGING', (RIG_TYPES[r.sling.type]?.short || '') + (r.sling.L ? ' ' + fmtM(r.sling.L) : '') + ' @' + Math.round(r.sling.ang) + '°'); add('sling', 'SLING TENSION / LEG', fmtT(r.sling.T)); }
    else if (r.stack) { const sl = r.stack.items.filter(t => t.type === 'sling' && t.T != null); sl.forEach(t => add('sling', `${String(t.name).toUpperCase()} / LEG`, fmtT(t.T))); }
    for (const c of (plan.sheetRows?.custom || []).filter(c => (c.sec === 'load' && (c.load == null || c.load === '' || +c.load === i)) && (c.label || c.value))) rows.push({ id: null, label: String(c.label || '').toUpperCase(), v: String(c.value || '').toUpperCase(), custom: true });
    blocks.push({ head: S.headerStyle === 'classic' && plan.loads.length === 1 && !multi ? null : 'LOAD DATA ' + (i + 1), fill: '#9a9a9a', rows });
    if (r.stack && on('extra.tacklesList')) blocks.push({ head: 'LIFTING TACKLES' + (plan.loads.length > 1 ? ' — LOAD ' + (i + 1) : ''), fill: '#d9d9d9', small: true, rows: r.stack.items.map((t, j) => sheetRow(plan, `t${i}.${j}`, String(t.name || '').toUpperCase(), `${t.L ? fmtM(t.L) : '—'} · ${(+t.w || 0).toFixed(2)}T${t.legs > 1 ? ' · ' + t.legs + 'L' : ''}`)) });
  });
  const extra = (plan.sheetRows?.custom || []).filter(c => c.sec === 'extra' && (c.label || c.value));
  if (extra.length) blocks.push({ head: 'ADDITIONAL DATA', fill: '#d9d9d9', rows: extra.map(c => ({ id: null, label: String(c.label || '').toUpperCase(), v: String(c.value || '').toUpperCase(), custom: true })) });
  if (blocks.length >= 2 && blocks[1].head === null) { blocks[0].rows.push(...blocks[1].rows); blocks.splice(1, 1); }
  return blocks;
}

// ---------- title block / lifting-plan data panel ----------
function drawTitleBlock(P, plan, calc, settings, scaleTxt) {
  const x = 712, w = 121, S = settings, X1 = x + w;
  const m = plan.meta || {};
  const on = (k) => sheetRowOn(plan, k);
  const LW = 0.2, LW2 = 0.35;
  P.line(x, 10, x, 584, { stroke: '#000', w: 0.5, layer: 'FRAME' });
  // ---------- fixed blocks, bottom up ----------
  let yb = 584;
  // drawing details
  const ddH = 21; yb -= ddH; const ddy = yb;
  P.rect(x, ddy, w, 6, { fill: '#efefef', stroke: '#000', w: LW2, layer: 'TABLE' }); cellText(P, x + w / 2, ddy + 3, 'DRAWING DETAILS', w - 4, 3.1, { bold: true });
  const c3 = [x, x + w / 3, x + 2 * w / 3, X1];
  [[`SCALE: ${scaleTxt || m.scale || '-'}`, `SHEET SIZE: ${S.paper || 'A1'}`, `SHEET NO: ${m.sheetNo || '01'}`], [`DRAWN BY: ${m.drawnBy || ''}`, `CHECKED BY: ${m.checkedBy || ''}`, `DATE: ${m.date || ''}`]].forEach((row, ri) => {
    const yy = ddy + 6 + ri * 7.5; P.rect(x, yy, w, 7.5, { fill: 'none', stroke: '#000', w: LW, layer: 'TABLE' });
    row.forEach((t, ci) => { if (ci) P.line(c3[ci], yy, c3[ci], yy + 7.5, { stroke: '#000', w: LW, layer: 'TABLE' }); cellText(P, (c3[ci] + c3[ci + 1]) / 2, yy + 3.75, t, w / 3 - 2, 2.3); });
  });
  if (m.drawingNo) P.text(X1 - 1, ddy - 1, 'DWG NO: ' + m.drawingNo, { size: 2, anchor: 'end', layer: 'TABLE' });
  // drawing title
  const dtH = 16; yb -= dtH; const dty = yb;
  P.rect(x, dty, w, dtH, { fill: 'none', stroke: '#000', w: LW2, layer: 'TABLE' }); P.line(x + 42, dty, x + 42, dty + dtH, { stroke: '#000', w: LW, layer: 'TABLE' });
  cellText(P, x + 21, dty + dtH / 2, 'DRAWING TITLE:', 38, 2.9, { bold: true });
  cellText(P, x + 42 + (w - 42) / 2, dty + dtH / 2, (m.title || '').toUpperCase(), w - 46, 3.4, { color: m.titleRed ? COL.red : '#000', h: dtH });
  // company
  const coH = 30; yb -= coH; const coy = yb;
  P.rect(x, coy, w, coH, { fill: 'none', stroke: '#000', w: LW2, layer: 'TABLE' });
  if (S.logoImg) P.image(x + 3, coy + 3, 24, 24, S.logoImg, { note: 'LOGO' });
  else { P.circle(x + 15, coy + coH / 2, 11, { stroke: COL.red, w: 0.9, fill: 'none', layer: 'LOGO' }); P.text(x + 15, coy + coH / 2, S.logoText || 'FHE', { size: 6.5, bold: true, anchor: 'middle', vAlign: 'middle', color: COL.red, layer: 'LOGO' }); }
  const cx0 = x + 30, cw0 = w - 32;
  P.text(cx0 + cw0 / 2, coy + 8, S.company || '', { size: fitSize(S.company || '', cw0, 4.6), anchor: 'middle', layer: 'TITLE' });
  (S.companyLines || []).forEach((l, i) => P.text(cx0 + cw0 / 2, coy + 13.5 + i * 3.6, l, { size: fitSize(l, cw0, 2.3), anchor: 'middle', layer: 'TITLE' }));
  // client + project
  const clH = 15; yb -= clH; const cly = yb;
  P.rect(x, cly, w, clH, { fill: 'none', stroke: '#000', w: LW2, layer: 'TABLE' });
  P.text(x + 3, cly + 4.2, 'CLIENT:', { size: 2.6, underline: true, layer: 'TABLE' }); cellText(P, x + w / 2, cly + 9.6, (m.client || '').toUpperCase(), w - 8, 4.6);
  if (m.project) { yb -= clH; const py = yb; P.rect(x, py, w, clH, { fill: 'none', stroke: '#000', w: LW2, layer: 'TABLE' }); P.text(x + 3, py + 4.2, 'PROJECT NAME:', { size: 2.6, underline: true, layer: 'TABLE' }); cellText(P, x + w / 2, py + 9.6, m.project.toUpperCase(), w - 8, 4.4); }
  // general notes (sized to their text)
  let noteLines = [];
  if (on('extra.notes')) {
    const all = [...(S.notes || []), ...(plan.extraNotes || '').split('\n').filter(Boolean), ...(plan.loads || []).map((l, i) => l.notes ? `LOAD ${i + 1}${l.name ? ' (' + l.name.toUpperCase() + ')' : ''}: ${String(l.notes).toUpperCase()}` : '').filter(Boolean)];
    all.forEach((n, i) => wrapText(String(n).toUpperCase(), 64).forEach((l, j) => noteLines.push([j === 0 ? `${i + 1}) ` : '', l])));
  }
  let nfs = 1.95; const notesH0 = (f) => noteLines.length ? 7 + noteLines.length * f * 1.3 + 2 : 0; let notesH = notesH0(nfs);
  // ---------- title ----------
  P.text(x + w / 2, 24, 'LIFTING PLAN', { size: fitSize('LIFTING PLAN', w - 10, 10), anchor: 'middle', layer: 'TITLE' });
  P.line(x + 4, 28.5, X1 - 4, 28.5, { stroke: '#000', w: 0.3, layer: 'TITLE' });
  // ---------- data blocks ----------
  const blocks = sheetBlocks(plan, calc, settings);
  // sign-off box takes what is left (min 26 mm); the tables share the rest evenly
  const signOn = on('extra.signoff'), histOn = on('extra.history');
  const nRows = blocks.reduce((a, b2) => a + b2.rows.length, 0), nHead = blocks.length;
  const dataTop = 31; const histMin = histOn ? 8.6 + 5 * 4.1 + 2 : 0, signMin = signOn ? 28 : 0;
  // top → bottom: data tables, sign-off, notes, drawing history — no gaps: spare room grows rows, then notes, then sign-off, then history rows
  let rh = Math.max(4.2, Math.min(11, (yb - dataTop - histMin - signMin - notesH - 4) / (nRows + nHead * 1.3)));
  const dataH = () => rh * (nRows + nHead * 1.3);
  if (noteLines.length) { while (nfs < 2.5 && dataTop + dataH() + signMin + notesH0(nfs + 0.05) + histMin + 4 < yb) nfs += 0.05; notesH = notesH0(nfs); }
  let signH = signOn ? Math.max(26, Math.min(60, yb - (dataTop + dataH()) - notesH - histMin - 4)) : 0;
  const dataBot = yb - notesH - histMin - 2;
  const hh = rh * 1.3;
  let y = dataTop; const lw = w * 0.56;
  for (const bl of blocks) {
    P.rect(x, y, w, hh, { fill: bl.fill, stroke: '#000', w: LW2, layer: 'TABLE' });
    cellText(P, x + w / 2, y + hh / 2, bl.head, w - 6, Math.min(7.2, hh * 0.72), { bold: true });
    y += hh;
    for (const { label: a2, v } of bl.rows) {
      P.rect(x, y, w, rh, { fill: 'none', stroke: '#000', w: LW, layer: 'TABLE' });
      P.line(x + lw, y, x + lw, y + rh, { stroke: '#000', w: LW, layer: 'TABLE' });
      const fs = Math.min(4.3, rh * 0.47) * (bl.small ? 0.88 : 1);
      cellText(P, x + lw / 2, y + rh / 2, a2, lw - 3, fs, { bold: true, h: rh });
      cellText(P, x + lw + (w - lw) / 2, y + rh / 2, v, w - lw - 3, fs, { h: rh });
      y += rh;
    }
  }
  // notes
  let ny = y + 2;
  if (signOn) {
    const sTop = y + 2, sH = signH;
    P.rect(x, sTop, w, 6, { fill: '#efefef', stroke: '#000', w: LW2, layer: 'TABLE' }); cellText(P, x + w / 2, sTop + 3, 'SIGN-OFF', w - 4, 3, { bold: true });
    const who = ['APPOINTED PERSON', 'LIFT SUPERVISOR', 'CRANE OPERATOR']; const rr = (sH - 6) / who.length; const cA = [x, x + 40, x + 82, X1];
    who.forEach((t, i) => { const yy = sTop + 6 + i * rr; P.rect(x, yy, w, rr, { fill: 'none', stroke: '#000', w: LW, layer: 'TABLE' }); P.line(cA[1], yy, cA[1], yy + rr, { stroke: '#000', w: LW, layer: 'TABLE' }); P.line(cA[2], yy, cA[2], yy + rr, { stroke: '#000', w: LW, layer: 'TABLE' });
      cellText(P, (cA[0] + cA[1]) / 2, yy + rr / 2, t, 37, Math.min(3, rr * 0.2), { bold: true }); P.text(cA[1] + 1.5, yy + rr - 1.6, i === 0 && m.checkedBy ? 'NAME: ' + String(m.checkedBy).toUpperCase() : 'NAME:', { size: 2.1, color: '#555', layer: 'TABLE' }); P.text(cA[2] + 1.5, yy + rr - 1.6, 'SIGN / DATE:', { size: 2.1, color: '#555', layer: 'TABLE' }); });
    ny = sTop + sH + 2;
  }
  if (noteLines.length) {
    P.text(x + 3, ny + 3.5, 'GENERAL NOTES:', { size: 2.8, underline: true, layer: 'NOTES' });
    noteLines.forEach(([n, l], i) => P.text(x + (n ? 2.5 : 6.5), ny + 8 + i * nfs * 1.3, n + l, { size: fitSize(n + l, w - 6, nfs), color: COL.green, layer: 'NOTES' }));
    ny += notesH;
  }
  // drawing history takes the rest down to the project / client boxes (more revision lines when there is room)
  if (histOn) {
    const hy = ny + 1, hH = yb - 1 - hy, hh0 = 4.6, nRev = Math.max(3, Math.min(14, Math.floor((hH - hh0 - 4) / 4.1))), rh0 = (hH - hh0 - 4) / nRev;
    P.rect(x + 1, hy, w - 2, hH, { stroke: '#000', w: LW2, fill: 'none', layer: 'TABLE' });
    cellText(P, x + w / 2, hy + hh0 / 2, 'DRAWING HISTORY', w - 6, 2.3, { bold: true });
    const cxs = [x + 1, x + 22, x + 92, X1 - 1];
    P.line(x + 1, hy + hh0, X1 - 1, hy + hh0, { stroke: '#000', w: LW, layer: 'TABLE' }); P.line(x + 1, hy + hh0 + 4, X1 - 1, hy + hh0 + 4, { stroke: '#000', w: LW, layer: 'TABLE' });
    ['REV.', 'DESCRIPTION', 'DATE'].forEach((t, i) => cellText(P, (cxs[i] + cxs[i + 1]) / 2, hy + hh0 + 2, t, cxs[i + 1] - cxs[i] - 2, 2));
    P.line(cxs[1], hy + hh0, cxs[1], hy + hH, { stroke: '#000', w: LW, layer: 'TABLE' }); P.line(cxs[2], hy + hh0, cxs[2], hy + hH, { stroke: '#000', w: LW, layer: 'TABLE' });
    const revs = (m.revs || []).slice(-nRev);
    for (let i = 0; i < nRev; i++) { const yy = hy + hh0 + 4 + i * rh0; if (i) P.line(x + 1, yy, X1 - 1, yy, { stroke: '#000', w: 0.12, layer: 'TABLE' }); const r = revs[i] || { rev: '-', desc: '-', date: '-' }; [r.rev, r.desc, r.date].forEach((t, j) => cellText(P, (cxs[j] + cxs[j + 1]) / 2, yy + rh0 / 2, String(t || '-'), cxs[j + 1] - cxs[j] - 2, 2)); }
  }
}

function drawFrame(P, settings) {
  P.rect(2, 2, 837, 590, { stroke: COL.red, w: 0.35, fill: 'none', layer: 'FRAME' });
  P.rect(14, 10, 819, 574, { stroke: COL.red, w: 0.5, fill: 'none', layer: 'FRAME' });
  const n = 41, cw = 819 / n; const segs = [];
  for (let i = 0; i <= n; i++) { const xx = 14 + i * cw; segs.push([xx, 2, xx, 10]); if (i < n) P.text(xx + cw / 2, 7.2, String(i + 1), { size: 2.4, anchor: 'middle', vAlign: 'middle', layer: 'FRAME' }); }
  const L = 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z AA AB AC'.split(' '); const rh = 574 / L.length;
  L.forEach((s, i) => { const yy = 10 + i * rh; segs.push([833, yy, 839, yy]); P.text(836, yy + rh / 2, s, { size: 2.4, anchor: 'middle', vAlign: 'middle', layer: 'FRAME' }); });
  P.path(segs, { stroke: '#000', w: 0.15, layer: 'FRAME' });
  // copyright: fitted to the full length of the left and bottom margins
  const cr = String(settings.copyright || '');
  if (cr) {
    const sL = Math.min(3.2, fitSize(cr, 566, 3.2)); P.text(8.6, 297, cr, { size: sL, rot: -90, anchor: 'middle', vAlign: 'middle', layer: 'FRAME' });
    const sB = Math.min(3.6, fitSize(cr, 810, 3.6)); P.text(423.5, 588.2, cr, { size: sB, anchor: 'middle', vAlign: 'middle', layer: 'FRAME' });
  }
}

function panelTitle(P, x, y, s) { P.text(x, y, s, { size: 6.2, layer: 'TITLE' }); }

// the outrigger pressure table and the weather table, as rows that can be typed over (ids g.* / w.*)
function groundRows(plan, calc) {
  const g = calc.ground; if (!g) return []; const O = calc.outr; const tag = { maker: '', calc: ' (CALC.)', illus: ' (ILLUSTRATIVE)', est: ' (EST.)' }[g.src || (g.est ? 'est' : '')] || '';
  const rows = [sheetRow(plan, 'g.P', 'MAX LOAD ON OUTRIGGERS' + tag, g.P.toFixed(2) + 'T')];
  if (O) rows.push(sheetRow(plan, 'g.beams', 'OUTRIGGER BEAMS', outExtLabel(O.ext)));
  rows.push(sheetRow(plan, 'g.self', 'SELF WEIGHT OF MAT', g.self.toFixed(2) + 'T'), sheetRow(plan, 'g.mat', 'LOAD DISTRIBUTION MAT SPECIFICATION', g.mat + (g.eff < 1 ? ' @ ' + Math.round(g.eff * 100) + '%' : '')),
    sheetRow(plan, 'g.area', 'AREA OF LOAD DISTRIBUTION', g.area.toFixed(2) + 'M²'), sheetRow(plan, 'g.press', 'MAX LOAD TO THE GROUND', g.press.toFixed(2) + 'T/M²'));
  if (g.allow) rows.push(sheetRow(plan, 'g.allow', 'ALLOWABLE GROUND BEARING', g.allow.toFixed(1) + 'T/M²'));
  return rows;
}
function wxRows(plan, wx) {
  if (!wx) return [];
  return [sheetRow(plan, 'w.place', 'LOCATION', (wx.place || '—').toUpperCase().slice(0, 30)), sheetRow(plan, 'w.date', 'DATE / WINDOW', `${wx.date || '—'} ${wx.start || ''}${wx.hours ? ' +' + wx.hours + 'H' : ''}`.trim()),
    sheetRow(plan, 'w.wind', 'MAX WIND @ TIP (' + Math.round(wx.tipH) + 'M)', wx.maxW.toFixed(1) + ' M/S'), sheetRow(plan, 'w.gust', 'MAX GUST @ TIP', wx.maxG.toFixed(1) + ' M/S'), sheetRow(plan, 'w.limit', 'PERMITTED WIND', wx.limit.toFixed(1) + ' M/S'),
    sheetRow(plan, 'w.rain', 'RAIN CHANCE', wx.rain + '%' + (wx.prMax ? ' / ' + wx.prMax + 'MM/H' : '')), sheetRow(plan, 'w.outlook', 'OUTLOOK', (wx.outlook || '—').toUpperCase().slice(0, 26))];
}
// every typed-over value on the sheet (for the checks list): [{ id, label, calc, v, safety }]
function sheetOverrides(plan, calc, settings) {
  if (!Object.keys(plan?.sheetRows?.ov || {}).some(k => sheetOvOf(plan, k) != null)) return [];
  const wx = calc.weather && plan.weather?.print !== false ? calc.weather : null;
  const rows = [...sheetBlocks(plan, calc, settings).flatMap(b => b.rows), ...(plan.outrigger?.enabled ? groundRows(plan, calc) : []), ...wxRows(plan, wx)];
  return rows.filter(r => r.ov).map(r => ({ ...r, safety: SHEET_OV_SAFETY.test(r.id) }));
}

// ---------- compose the whole sheet ----------
function buildSheet(plan, calc, settings) {
  const P = new Prims();
  P.rect(0, 0, SHEET.W, SHEET.H, { fill: '#ffffff', stroke: 'none', layer: 'BG', noDxf: true });
  drawFrame(P, settings);
  const layout = plan.layout || 'chart';
  let scaleInfo = null;
  const crane = calc.crane; const ch = crane.charts?.[plan.chartIdx ?? 0]; const parsed = ch ? getChart(ch) : null;
  const titleLines = [plan.viewTitle1 || `${crane.cls}T MOBILE CRANE`, plan.viewTitle2 ?? 'ELEVATION VIEW'];
  const livery = settings.boomLivery === false ? '' : (settings.boomText || settings.company || '');
  const sel = calc.loads.filter(r => (r.rigI ?? 0) === num(plan.activeCrane, 0)).map(r => ({ ci: r.ci, row: r.capInfo?.row }));
  const ov = plan.outrigger?.enabled && calc.ground;
  const drawGround = (bx) => {
    const g = calc.ground, O = calc.outr; const rows = groundRows(plan, calc).map(r => [r.label, r.v]);
    const w = 108, x0 = bx.x + bx.w - w - 1, y0 = bx.y + 1, rh = 4.6;
    P.rect(x0, y0, w, 6, { fill: '#a6a6a6', stroke: '#000', w: 0.3 }); P.text(x0 + w / 2, y0 + 3, 'OUTRIGGER PRESSURE CALCULATION', { size: 3.4, bold: true, anchor: 'middle', vAlign: 'middle' });
    let y = y0 + 6;
    rows.forEach(([a, b]) => { const red = /^MAX LOAD TO/.test(a); P.rect(x0, y, w, rh, { stroke: '#000', w: 0.2, fill: 'none' }); P.line(x0 + w * 0.76, y, x0 + w * 0.76, y + rh, { stroke: '#000', w: 0.2 }); P.text(x0 + 1, y + rh / 2, a, { size: Math.min(2.4, fitSize(a, w * 0.76 - 2, 2.4, true)), bold: true, vAlign: 'middle', color: red ? COL.red : '#000' }); P.text(x0 + w * 0.88, y + rh / 2, b, { size: Math.min(2.6, fitSize(b, w * 0.24 - 1.5, 2.6)), anchor: 'middle', vAlign: 'middle' }); y += rh; });
    if (O) { // the four legs: what each one carries (typed-by-hand values marked *)
      const t = 'LEG LOADS' + (O.basis === 'side' ? ' AT THE LIFT SIDE' : ' OVER A FULL SLEW (360°)') + (g.src === 'maker' ? ' — MODEL, FOR INFORMATION' : '');
      P.rect(x0, y, w, rh, { stroke: '#000', w: 0.2, fill: '#e6e6e6' }); P.text(x0 + w / 2, y + rh / 2, t, { size: Math.min(2.4, fitSize(t, w - 2, 2.4, true)), bold: true, anchor: 'middle', vAlign: 'middle' }); y += rh;
      OUT_PADS.forEach((id, i) => { const cx = x0 + w / 4 * i; const man = O.manual[id] != null; const v = `${id} ${O.used[id].toFixed(1)}T${man ? ' *' : ''}`; P.rect(cx, y, w / 4, rh, { stroke: '#000', w: 0.2, fill: 'none' }); P.text(cx + w / 8, y + rh / 2, v, { size: Math.min(2.5, fitSize(v, w / 4 - 1.5, 2.5, man)), bold: man, anchor: 'middle', vAlign: 'middle', color: man ? COL.red : '#000' }); });
      y += rh;
      if (O.illus) { const t2 = '* ILLUSTRATIVE — TYPED BY HAND, NOT REAL CRANE DATA. NOT FOR LIFTING.'; P.rect(x0, y, w, 5, { fill: COL.red, stroke: '#000', w: 0.3 }); P.text(x0 + w / 2, y + 2.5, t2, { size: Math.min(2.6, fitSize(t2, w - 2, 2.6, true)), bold: true, anchor: 'middle', vAlign: 'middle', color: '#fff' }); y += 5; }
      else if (g.src !== 'maker') { const t2 = 'Calculated by the planner' + (O.est ? ' from estimated crane weights' : '') + ' — check against the crane maker\'s outrigger data.'; P.text(x0, y + 2.4, t2, { size: Math.min(1.8, fitSize(t2, w, 1.8)), color: '#555' }); y += 3.6; }
    }
    return y - y0 + 2;
  };
  const wx = calc.weather && plan.weather?.print !== false ? calc.weather : null;
  const drawWx = (bx) => { // weather forecast table, top-left of the overview
    const w = 112, x0 = bx.x + 1, y0 = bx.y + 1;
    const col = wx.status === 'fail' ? COL.red : wx.status === 'warn' ? COL.orange : COL.green;
    const rows = wxRows(plan, wx).map(r => [r.label, r.v]);
    P.rect(x0, y0, w, 6, { fill: '#a6a6a6', stroke: '#000', w: 0.3 }); P.text(x0 + w / 2, y0 + 3, 'WEATHER FORECAST' + (wx.manual ? ' (ENTERED)' : ''), { size: 3.4, bold: true, anchor: 'middle', vAlign: 'middle' });
    rows.forEach(([a, b], i) => { const y = y0 + 6 + i * 4.6; P.rect(x0, y, w, 4.6, { stroke: '#000', w: 0.2, fill: 'none' }); P.line(x0 + w * 0.55, y, x0 + w * 0.55, y + 4.6, { stroke: '#000', w: 0.2 }); P.text(x0 + 1, y + 2.3, a, { size: 2.3, bold: true, vAlign: 'middle' }); P.text(x0 + w * 0.775, y + 2.3, b, { size: 2.4, anchor: 'middle', vAlign: 'middle', color: i === 3 || i === 2 ? col : '#000' }); });
    const yv = y0 + 6 + rows.length * 4.6; P.rect(x0, yv, w, 5, { fill: col, stroke: '#000', w: 0.3 }); P.text(x0 + w / 2, yv + 2.5, wx.status === 'fail' ? 'DO NOT LIFT IN THESE CONDITIONS' : wx.status === 'warn' ? 'MARGINAL — MONITOR ON SITE' : 'WITHIN LIMITS', { size: 2.8, bold: true, anchor: 'middle', vAlign: 'middle', color: '#fff' });
    if (!wx.manual) P.text(x0, yv + 8, 'Source: Open-Meteo forecast' + (wx.fetched ? ', ' + wx.fetched : '') + ' — confirm with the site anemometer', { size: 1.8, color: '#555' });
    return 6 + rows.length * 4.6 + 13;
  };
  const tables = (bx) => { let a = 0, b = 0; if (ov) a = drawGround(bx); if (wx) b = drawWx(bx); return Math.max(a, b); };
  if (layout === 'chart') {
    const split = 297, mid = 392;
    P.line(mid, 10, mid, 584, { stroke: '#000', w: 0.4, layer: 'FRAME' }); P.line(14, split, mid, split, { stroke: '#000', w: 0.4, layer: 'FRAME' });
    panelTitle(P, 20, 20, plan.chartTitle || (crane.imgChart ? 'LOAD CHART' : 'CRANE LOAD CHART'));
    if (crane.imgChart) P.image(18, 24, mid - 22, split - 28, crane.imgChart, { note: 'LOAD CHART IMAGE' });
    else drawChartTable(P, { x: 20, y: 24, w: mid - 26, h: split - 28 }, crane, ch, parsed, sel, null);
    panelTitle(P, 20, split + 10, 'CRANE DIMENSIONS');
    drawCraneDims(P, { x: 16, y: split + 12, w: mid - 20, h: 584 - split - 14 }, crane);
    panelTitle(P, mid + 6, 20, 'OVERVIEW');
    const spOn = sitePlanState(plan).enabled;
    const box = { x: mid + 2, y: 24, w: 712 - mid - 4, h: spOn ? 318 : 560 };
    const off = tables(box);
    const e = drawElevation(P, { ...box, y: box.y + off, h: box.h - off }, plan, calc, plan.activeLoad || 0, { livery, titleLines, mainLabel: ch?.mainLabel, padB: spOn ? 30 : 38 });
    scaleInfo = e?.scale;
    if (spOn) { P.line(mid, 344, 712, 344, { stroke: '#000', w: 0.4, layer: 'FRAME' }); drawSitePlan(P, { x: mid + 2, y: 346, w: 712 - mid - 4, h: 236 }, plan, calc, { livery }); }
  } else if (layout === 'elev2') {
    const mid = 363; P.line(mid, 10, mid, 584, { stroke: '#000', w: 0.4, layer: 'FRAME' });
    panelTitle(P, 20, 20, 'OVERVIEW');
    const i2 = Math.min(calc.loads.length - 1, num(plan.secondLoad, 1));
    const b1 = { x: 16, y: 24, w: mid - 18, h: 560 }, b2 = { x: mid + 2, y: 24, w: 712 - mid - 4, h: 560 };
    // common scale
    const r1 = calc.loads[plan.activeLoad || 0], r2_ = calc.loads[i2];
    const ex1 = elevationExtents(plan, r1, r1.crane || crane, r1.geo), ex2 = elevationExtents(plan, r2_, r2_.crane || crane, r2_.geo);
    const ext = { xmin: Math.min(ex1.xmin, ex2.xmin), xmax: Math.max(ex1.xmax, ex2.xmax), ymin: Math.min(ex1.ymin, ex2.ymin), ymax: Math.max(ex1.ymax, ex2.ymax) };
    const kRaw = Math.min((b1.w - 36) / (ext.xmax - ext.xmin), (b1.h - 50) / (ext.ymax - ext.ymin));
    const sc = niceScale(kRaw);
    const off = tables(b2);
    drawElevation(P, b1, plan, calc, plan.activeLoad || 0, { livery, ext, scale: sc, titleLines: ['LOAD DATA ' + ((plan.activeLoad || 0) + 1) + ' — ' + (plan.loads[plan.activeLoad || 0].name || '').toUpperCase()], dimSize: 4.2, mainLabel: ch?.mainLabel });
    drawElevation(P, { ...b2, y: b2.y + off, h: b2.h - off }, plan, calc, i2, { livery, ext, scale: sc, titleLines: ['LOAD DATA ' + (i2 + 1) + ' — ' + (plan.loads[i2].name || '').toUpperCase()], dimSize: 4.2, mainLabel: ch?.mainLabel });
    scaleInfo = sc;
  } else if (layout === 'rigging') {
    const mid = 460; P.line(mid, 10, mid, 584, { stroke: '#000', w: 0.4, layer: 'FRAME' });
    P.text(20, 20, 'ELEVATION VIEW', { size: 6.2 }); P.text(20, 28, plan.viewSub || 'MAX RADIUS MAX WEIGHT', { size: 6.2 });
    const e = drawElevation(P, { x: 16, y: 30, w: mid - 18, h: 554 }, plan, calc, plan.activeLoad || 0, { livery, titleLines: [titleLines[0]], mainLabel: ch?.mainLabel });
    scaleInfo = e?.scale;
    P.text(mid + 6, 20, 'LIFTING TACKLE ARRANGEMENT', { size: 6.2 }); P.text(mid + 6, 28, '& SLING TENSION CALCULATION', { size: 6.2 });
    let off = 0; if (ov) off = drawGround({ x: mid + 2, y: 32, w: 712 - mid - 4, h: 100 });
    drawRigging(P, { x: mid + 2, y: 34 + off, w: 712 - mid - 4, h: 548 - off }, plan, calc);
  } else { // full width elevation
    panelTitle(P, 20, 20, 'OVERVIEW');
    const spOn = sitePlanState(plan).enabled;
    const box = { x: 16, y: 24, w: spOn ? 400 : 712 - 18, h: 560 };
    const off = tables(box);
    const e = drawElevation(P, { ...box, y: box.y + off, h: box.h - off }, plan, calc, plan.activeLoad || 0, { livery, titleLines, mainLabel: ch?.mainLabel });
    scaleInfo = e?.scale;
    if (spOn) { P.line(418, 10, 418, 584, { stroke: '#000', w: 0.4, layer: 'FRAME' }); drawSitePlan(P, { x: 420, y: 14, w: 290, h: 568 }, plan, calc, { livery }); }
  }
  const scaleTxt = plan.meta?.scale || (scaleInfo ? '1:' + scaleInfo.N * (settings.paper === 'A3' ? 2 : 1) + ' (elev.)' : '-');
  drawTitleBlock(P, plan, calc, settings, scaleTxt);
  return { P, scale: scaleInfo };
}

// ---------- SVG writer ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function textY(p) { return p.vAlign === 'middle' ? p.y + p.size * 0.36 : p.vAlign === 'top' ? p.y + p.size * 0.75 : p.y; }
function toSVG(P, o = {}) {
  const f = (v) => (Math.round(v * 100) / 100); let clipN = 0; const C = o.cmap || ((c) => c); const iS = o.imgStyle ? ` style="${o.imgStyle}"` : '';
  const out = [];
  const vb = o.viewBox || [0, 0, SHEET.W, SHEET.H]; const minW = o.minW || 0;
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${vb.map(f).join(' ')}" width="${o.width || SHEET.W + 'mm'}" height="${o.height || SHEET.H + 'mm'}" font-family="Arial, Helvetica, sans-serif"${o.attrs || ''}>`);
  if (o.pre) out.push(o.pre);
  for (const p of P.list) {
    const CC = p.keep ? ((c) => c) : C;
    const st = (fillDefault = 'none') => `stroke="${p.stroke === 'none' ? 'none' : CC(p.stroke || '#000')}" stroke-width="${f(Math.max(minW, p.w ?? 0.25))}" fill="${CC(p.fill || fillDefault)}"${p.dash ? ' stroke-dasharray="3 1.5"' : ''}`;
    if (p.t === 'line') out.push(`<line x1="${f(p.x1)}" y1="${f(p.y1)}" x2="${f(p.x2)}" y2="${f(p.y2)}" ${st()} stroke-linecap="round"/>`);
    else if (p.t === 'poly') out.push(`<${p.closed ? 'polygon' : 'polyline'} points="${p.pts.map(q => f(q[0]) + ',' + f(q[1])).join(' ')}" ${st()} stroke-linejoin="round"/>`);
    else if (p.t === 'circle') out.push(`<circle cx="${f(p.cx)}" cy="${f(p.cy)}" r="${f(p.r)}" ${st()}/>`);
    else if (p.t === 'arc') {
      const a1 = p.a1 * D2R, a2 = p.a2 * D2R;
      const x1 = p.cx + p.r * Math.cos(a1), y1 = p.cy - p.r * Math.sin(a1), x2 = p.cx + p.r * Math.cos(a2), y2 = p.cy - p.r * Math.sin(a2);
      const large = Math.abs(p.a2 - p.a1) > 180 ? 1 : 0, sweep = p.a2 > p.a1 ? 0 : 1;
      out.push(`<path d="M${f(x1)} ${f(y1)} A${f(p.r)} ${f(p.r)} 0 ${large} ${sweep} ${f(x2)} ${f(y2)}" ${st()}/>`);
    } else if (p.t === 'path') {
      if (!p.segs.length) continue;
      out.push(`<path d="${p.segs.map(s => `M${f(s[0])} ${f(s[1])}L${f(s[2])} ${f(s[3])}`).join('')}" stroke="${CC(p.stroke || '#000')}" stroke-width="${f(Math.max(minW, p.w ?? 0.2))}" fill="none"${p.dash ? ' stroke-dasharray="3 1.5"' : ''}${p.opacity != null && p.opacity < 1 ? ` stroke-opacity="${p.opacity}"` : ''}/>`);
    } else if (p.t === 'text') {
      const anchor = p.anchor === 'middle' ? 'middle' : p.anchor === 'end' ? 'end' : 'start';
      const y = textY(p);
      const tr = p.rot ? ` transform="rotate(${f(p.rot)} ${f(p.x)} ${f(p.y)})"` : '';
      if (p.bg) { const wEst = p.s.length * p.size * 0.6; const bx = anchor === 'middle' ? p.x - wEst / 2 : anchor === 'end' ? p.x - wEst : p.x; out.push(`<rect x="${f(bx - 0.8)}" y="${f(y - p.size * 0.85)}" width="${f(wEst + 1.6)}" height="${f(p.size * 1.15)}" fill="${CC(p.bg)}"${tr}/>`); }
      out.push(`<text x="${f(p.x)}" y="${f(y)}" font-size="${f(p.size)}" text-anchor="${anchor}" fill="${CC(p.color || '#000')}"${p.bold ? ' font-weight="bold"' : ''}${p.opacity != null && p.opacity < 1 ? ` fill-opacity="${p.opacity}"` : ''}${tr}>${esc(p.s)}</text>`);
      if (p.underline) { const wEst = p.s.length * p.size * (p.bold ? 0.6 : 0.55); const bx = anchor === 'middle' ? p.x - wEst / 2 : anchor === 'end' ? p.x - wEst : p.x; out.push(`<line x1="${f(bx)}" y1="${f(y + p.size * 0.18)}" x2="${f(bx + wEst)}" y2="${f(y + p.size * 0.18)}" stroke="${CC(p.color || '#000')}" stroke-width="${f(p.size * 0.07)}"/>`); }
    } else if (p.t === 'image') {
      if (!p.href) continue;
      let pre = '', post = '';
      if (p.clip) { const id = 'c' + (++clipN); pre = `<clipPath id="${id}"><rect x="${f(p.clip[0])}" y="${f(p.clip[1])}" width="${f(p.clip[2])}" height="${f(p.clip[3])}"/></clipPath><g clip-path="url(#${id})">`; post = '</g>'; }
      const tr = p.rot ? ` transform="rotate(${f(p.rot)} ${f(p.x)} ${f(p.y)})"` : '';
      out.push(`${pre}<image x="${f(p.x)}" y="${f(p.y)}" width="${f(p.w)}" height="${f(p.h)}" preserveAspectRatio="${p.fit === 'none' ? 'none' : 'xMidYMid meet'}"${p.opacity != null && p.opacity < 1 ? ` opacity="${p.opacity}"` : ''}${tr}${iS} href="${esc(p.href)}" xlink:href="${esc(p.href)}"/>${post}`);
    }
  }
  if (o.post) out.push(o.post);
  out.push('</svg>');
  return out.join('\n');
}

// ---------- DXF writer (R12 ASCII, model space; sheet mm × S so the elevation is 1:1 in mm) ----------
const ACI = [[1, '#ff0000'], [2, '#ffff00'], [3, '#00ff00'], [4, '#00ffff'], [5, '#0000ff'], [6, '#ff00ff'], [7, '#000000'], [8, '#808080'], [9, '#c0c0c0'], [30, '#ff7f00'], [40, '#ffbf00'], [50, '#ffff00'], [52, '#c9c92a'], [94, '#00a800'], [140, '#3d7fd1'], [32, '#8a6d3b'], [251, '#555555'], [254, '#e3e3e3'], [212, '#c000c0']];
function aci(hex) {
  if (!hex || hex === 'none') return 7;
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex); if (!m) return 7;
  const [r, g, b] = [1, 2, 3].map(i => parseInt(m[i], 16));
  if (r > 235 && g > 235 && b > 235) return 7;
  let best = 7, bd = 1e9;
  for (const [n, h] of ACI) { const q = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(h); const d = (r - parseInt(q[1], 16)) ** 2 + (g - parseInt(q[2], 16)) ** 2 + (b - parseInt(q[3], 16)) ** 2; if (d < bd) { bd = d; best = n; } }
  return best;
}
function dxfText(s) { return String(s).replace(/°/g, '%%d').replace(/²/g, '2').replace(/[×]/g, 'x').replace(/[—–]/g, '-').replace(/·/g, '-').replace(/[≥]/g, '>=').replace(/[^\x20-\x7e%]/g, ''); }
function toDXF(P, S) {
  const L = []; const layers = new Set(['0']);
  const X = (x) => (x * S).toFixed(3), Y = (y) => ((SHEET.H - y) * S).toFixed(3);
  const ent = (type, layer, color, pairs) => { layers.add(layer); L.push('0', type, '8', layer); if (color != null) L.push('62', String(color)); for (const [c, v] of pairs) L.push(String(c), String(v)); };
  for (const p of P.list) {
    if (p.noDxf) continue;
    const layer = (p.layer || 'DETAIL').toUpperCase().replace(/[^A-Z0-9_\-]/g, '_');
    const col = aci(p.t === 'text' ? (p.color || '#000') : (p.stroke && p.stroke !== 'none' ? p.stroke : p.fill));
    if (p.t === 'line') ent('LINE', layer, col, [[10, X(p.x1)], [20, Y(p.y1)], [30, 0], [11, X(p.x2)], [21, Y(p.y2)], [31, 0]]);
    else if (p.t === 'path') for (const s of p.segs) ent('LINE', layer, col, [[10, X(s[0])], [20, Y(s[1])], [30, 0], [11, X(s[2])], [21, Y(s[3])], [31, 0]]);
    else if (p.t === 'poly') {
      const lightFill = (() => { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(p.fill || ''); return m ? (parseInt(m[1], 16) + parseInt(m[2], 16) + parseInt(m[3], 16)) / 3 > 215 : true; })();
      if (p.fill && p.fill !== 'none' && !lightFill && p.pts.length >= 3 && p.pts.length <= 4 && (layer === 'TABLE' || layer === 'CHART' || layer === 'DIM' || layer === 'DETAIL')) {
        const q = p.pts; const a = q[0], b = q[1], c = q[2], d = q[3] || q[2];
        ent('SOLID', layer, aci(p.fill), [[10, X(a[0])], [20, Y(a[1])], [30, 0], [11, X(b[0])], [21, Y(b[1])], [31, 0], [12, X(d[0])], [22, Y(d[1])], [32, 0], [13, X(c[0])], [23, Y(c[1])], [33, 0]]);
      }
      if (p.stroke === 'none') continue;
      layers.add(layer);
      L.push('0', 'POLYLINE', '8', layer, '62', String(col), '66', '1', '10', '0', '20', '0', '30', '0', '70', p.closed ? '1' : '0');
      for (const q of p.pts) L.push('0', 'VERTEX', '8', layer, '10', X(q[0]), '20', Y(q[1]), '30', '0');
      L.push('0', 'SEQEND', '8', layer);
    } else if (p.t === 'circle') ent('CIRCLE', layer, col, [[10, X(p.cx)], [20, Y(p.cy)], [30, 0], [40, (p.r * S).toFixed(3)]]);
    else if (p.t === 'arc') { const nrm = (a) => ((a % 360) + 360) % 360; const a1 = nrm(Math.min(p.a1, p.a2)), a2 = nrm(Math.max(p.a1, p.a2)); ent('ARC', layer, col, [[10, X(p.cx)], [20, Y(p.cy)], [30, 0], [40, (p.r * S).toFixed(3)], [50, a1.toFixed(3)], [51, a2.toFixed(3)]]); }
    else if (p.t === 'text') {
      if (!p.s.trim()) continue;
      const h = p.size * 0.72 * S; const ha = p.anchor === 'middle' ? 1 : p.anchor === 'end' ? 2 : 0; const va = p.vAlign === 'middle' ? 2 : p.vAlign === 'top' ? 3 : 0;
      const pairs = [[10, X(p.x)], [20, Y(p.y)], [30, 0], [40, h.toFixed(3)], [1, dxfText(p.s)], [7, 'ARIAL']];
      if (p.rot) pairs.push([50, (-p.rot).toFixed(3)]);
      if (ha || va) pairs.push([72, ha], [11, X(p.x)], [21, Y(p.y)], [31, 0], [73, va]);
      ent('TEXT', layer, col, pairs);
    } else if (p.t === 'image') {
      ent('POLYLINE', 'IMAGE_FRAME', 8, [[66, 1], [10, 0], [20, 0], [30, 0], [70, 1]]);
      for (const q of [[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.h], [p.x, p.y + p.h]]) L.push('0', 'VERTEX', '8', 'IMAGE_FRAME', '10', X(q[0]), '20', Y(q[1]), '30', '0');
      L.push('0', 'SEQEND', '8', 'IMAGE_FRAME');
      ent('TEXT', 'IMAGE_FRAME', 8, [[10, X(p.x + p.w / 2)], [20, Y(p.y + p.h / 2)], [30, 0], [40, (4 * S).toFixed(3)], [1, dxfText('[ ' + (p.note || 'IMAGE') + ' - INSERT RASTER IN AUTOCAD ]')], [72, 1], [11, X(p.x + p.w / 2)], [21, Y(p.y + p.h / 2)], [31, 0], [73, 2]]);
    }
  }
  const head = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$INSUNITS', '70', '4', '9', '$EXTMIN', '10', '0', '20', '0', '30', '0', '9', '$EXTMAX', '10', (SHEET.W * S).toFixed(1), '20', (SHEET.H * S).toFixed(1), '30', '0', '0', 'ENDSEC'];
  const tables = ['0', 'SECTION', '2', 'TABLES',
    '0', 'TABLE', '2', 'LTYPE', '70', '1', '0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0', '0', 'ENDTAB',
    '0', 'TABLE', '2', 'LAYER', '70', String(layers.size)];
  const layerColor = { DIM: 1, DIMTEXT: 3, NOTES: 3, BUILDING: 7, HATCH: 8, GROUND: 32, CRANE: 2, BOOM: 2, JIB: 8, HOOK: 2, LOAD: 6, RIGGING: 1, FRAME: 1, TABLE: 7, CHART: 7, 'CHART-MARK': 1, TITLE: 7, TEXT: 1, STRUCTURE: 3 };
  for (const l of layers) tables.push('0', 'LAYER', '2', l, '70', '0', '62', String(layerColor[l] || 7), '6', 'CONTINUOUS');
  tables.push('0', 'ENDTAB', '0', 'TABLE', '2', 'STYLE', '70', '1', '0', 'STYLE', '2', 'ARIAL', '70', '0', '40', '0.0', '41', '1.0', '50', '0.0', '71', '0', '42', '2.5', '3', 'arial.ttf', '4', '', '0', 'ENDTAB', '0', 'ENDSEC');
  return [...head, ...tables, '0', 'SECTION', '2', 'ENTITIES', ...L, '0', 'ENDSEC', '0', 'EOF'].join('\r\n');
}

if (typeof module !== 'undefined') module.exports = { buildSheet, toSVG, toDXF, Prims };
