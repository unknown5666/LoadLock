// ===== Calculation engine (pure functions) =====
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const num = (v, d = 0) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : d; };
const r2 = (v) => Math.round(v * 100) / 100;

// ===== Lift side: the load is lifted over the LEFT, RIGHT, REAR or FRONT of the carrier. Stored per load as load.side
// ('left' | 'right' | 'rear' | 'front'). A front lift puts the boom over the cab: the maker's chart must allow it (a 360° chart does) and a truck crane
// usually needs its front jack down — computeLoad adds a check for it. =====
const LIFT_SIDES = ['left', 'right', 'rear', 'front'];
// boom heading minus carrier heading, in degrees. Carrier heading = the way the cab faces; headings run counter-clockwise on the site plan
// (north up), so "left" is the driver's left when sitting facing forward. Front = the boom points the way the cab faces.
const SIDE_OFFSET = { rear: 180, left: 90, right: -90, front: 0 };
const SIDE_WORD = { rear: 'rear', left: 'left side', right: 'right side', front: 'front' };      // "lifting over the rear / left side / right side / front"
const SIDE_NAME = { rear: 'REAR', left: 'LEFT SIDE', right: 'RIGHT SIDE', front: 'FRONT' };       // "OVER REAR / OVER LEFT SIDE / OVER RIGHT SIDE / OVER FRONT" on the sheet
function sideOf(load) { if (hasSlew(load)) return sideFromSlew(load.slew); const s = String(typeof load === 'string' ? load : load?.side ?? '').toLowerCase(); return s === 'left' || s === 'right' || s === 'rear' || s === 'front' ? s : 'rear'; }
// v11 slew: the boom can point any way, one degree at a time. load.slew = boom direction relative to the carrier, degrees counter-clockwise
// from the way the cab faces (0 front, 90 left, 180 rear, 270 right); '' = straight over load.side. The side (the chart sector) follows the
// slew: front within 45° of the cab's way, then left, rear and right quarters.
function hasSlew(load) { return !!load && typeof load === 'object' && load.slew !== '' && load.slew != null && Number.isFinite(parseFloat(String(load.slew).replace(',', '.'))); }
function sideFromSlew(a) { a = normDeg(a); return a >= 45 && a < 135 ? 'left' : a >= 135 && a < 225 ? 'rear' : a >= 225 && a < 315 ? 'right' : 'front'; }
function slewOf(load) { return hasSlew(load) ? normDeg(num(load.slew)) : normDeg(SIDE_OFFSET[sideOf(load)]); }
function normDeg(a) { return ((num(a) % 360) + 360) % 360; }                      // 0 ≤ a < 360
function degDiff(a, b) { const d = normDeg(num(a) - num(b)); return d > 180 ? d - 360 : d; } // signed a − b, −180 < d ≤ 180
function hasCarrierRot(sp) { return !!sp && sp.carrierRot !== '' && sp.carrierRot != null && Number.isFinite(parseFloat(String(sp.carrierRot).replace(',', '.'))); }
// Carrier heading (degrees, the way the cab faces). When sitePlan.carrierRot is set it rules; when it is empty the carrier simply follows the
// boom (sitePlan.rot) so that the boom stays on the chosen side — which also keeps every v6 plan's boom heading exactly where it was.
function carrierHeadingFor(plan, load) { const sp = plan?.sitePlan || {}; return normDeg(hasCarrierRot(sp) ? num(sp.carrierRot) : num(sp.rot) - slewOf(load)); }
// Boom (= load) heading in degrees: carrier heading + 180 (rear) / +90 (left) / −90 (right) / +0 (front).
function boomHeadingFor(plan, load) { const sp = plan?.sitePlan || {}; return normDeg(hasCarrierRot(sp) ? num(sp.carrierRot) + slewOf(load) : num(sp.rot)); }
// v6 plans: which side was the boom on? `boom` and `carrier` are headings; v6 drew the carrier cab at the −u end, so the cab faced carrier + 180°.
// Boom within 45° of the way the cab faced = a lift over the FRONT (v6 drew it, so it stays a front lift and the front check applies).
function sideFromHeadings(boom, carrier) {
  const rel = degDiff(boom, num(carrier) + 180);               // boom relative to the way the cab faces
  return rel >= 45 && rel < 135 ? 'left' : rel <= -45 && rel > -135 ? 'right' : Math.abs(rel) < 45 ? 'front' : 'rear';
}
// Which sectors a load chart is valid for: ['360'] (all round, the default) or any of 'front', 'rear', 'side'. Reads chart.sectors (or chart.sector),
// else infers from the chart's name / source text (data.js inferChartSectors, which knows rear / side) plus "front" in the name.
function chartSectorsOf(ch) {
  if (!ch) return ['360'];
  if (Array.isArray(ch.sectors) && ch.sectors.length) return ch.sectors.map(String);
  if (typeof ch.sector === 'string' && ch.sector) return ch.sector.split(/[\s,+&]+/).filter(Boolean);
  let s = typeof inferChartSectors === 'function' ? inferChartSectors(ch) : ['360'];
  const nm = String(ch.name || '').toLowerCase();
  if (/\bfront\b/.test(nm) && !/360\s*°|360\s*deg|full[\s-]*(circle|slew)|all[\s-]*round/.test(nm)) s = s.filter(x => x !== '360').concat('front');   // "…over front only"
  return s;
}
// Is this load chart valid for lifting over `side` ('left' | 'right' | 'rear' | 'front')? A missing chart (manual capacity) never blocks.
// A 360° chart covers every side; "side" means left or right only (not the front); the front needs a 360° chart or a chart that says 'front'.
function chartCoversSide(ch, side) {
  if (!ch) return true;
  const s = chartSectorsOf(ch); const sd = sideOf(side);
  return s.includes('360') || s.includes(sd) || ((sd === 'left' || sd === 'right') && s.includes('side'));
}
// "all round (360°)" / "over the rear only" / "over the rear and sides" / "over the sides only" / "over the front only" — plain wording for messages and the chart header
function chartSectorLabel(ch) {
  const s = chartSectorsOf(ch);
  if (s.includes('360')) return 'all round (360°)';
  const front = s.includes('front'), rear = s.includes('rear'), side = s.includes('side') || s.includes('left') || s.includes('right');
  const parts = [front && 'front', rear && 'rear', side && 'sides'].filter(Boolean);
  if (!parts.length) return 'all round (360°)';
  return 'over the ' + parts.join(parts.length === 2 ? ' and ' : ', ').replace(/, ([^,]*)$/, ' and $1') + (parts.length === 1 ? ' only' : '');
}
// The chart index to use when the side changes: the current one if it covers the side, else the first main-boom chart that does
// (then any chart that does). If nothing covers the side the current index is returned unchanged (computeLoad then flags it).
function bestChartForSide(crane, side, currentIdx) {
  const charts = crane?.charts || []; const cur = currentIdx == null || currentIdx === '' || !Number.isFinite(+currentIdx) ? 0 : Math.round(+currentIdx);
  if (cur < 0 || cur >= charts.length || chartCoversSide(charts[cur], side)) return cur;
  let i = charts.findIndex(c => (!c.kind || c.kind === 'main') && chartCoversSide(c, side));
  if (i < 0) i = charts.findIndex(c => chartCoversSide(c, side));
  return i < 0 ? cur : i;
}

// Parse chart text. Accepts our "H:" format or tab/space separated paste from Excel
// (first row = header of boom lengths; first column = radius).
function parseChart(src) {
  const lines = String(src || '').replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { cols: [], rows: [], errors: ['Empty chart'] };
  const errors = [];
  let head = lines[0];
  let cols = [];
  const splitCells = (l) => l.includes('\t') ? l.split('\t') : (l.includes('|') ? l.split('|') : l.split(/\s+/));
  if (/^H:/i.test(head)) {
    cols = head.slice(2).split('|').map(s => s.trim()).filter(Boolean).map(tok => {
      const [len, a, b] = tok.split('/').map(x => x.trim());
      const L = num(len.replace('*', ''), NaN);
      let label = '', falls = null;
      if (a !== undefined) { if (b !== undefined) { label = a; falls = num(b, null); } else if (/^\d+$/.test(a) && num(a) <= 16 && !len.includes('*')) { falls = num(a); } else label = a; }
      return { L, head: len, label, falls };
    });
  } else {
    // pasted grid: header cells, first may be a caption
    const cells = splitCells(head).map(s => s.trim());
    if (cells.length && isNaN(num(cells[0].replace('*', ''), NaN))) cells.shift();
    cols = cells.filter(c => c !== '').map(c => ({ L: num(c.replace('*', ''), NaN), head: c, label: '', falls: null }));
  }
  const rows = [];
  for (const l of lines.slice(1)) {
    let r, rest;
    const m = l.match(/^([\d.,]+)\s*:\s*(.*)$/);
    if (m) { r = num(m[1], NaN); rest = m[2].split(/\s+/); }
    else { const c = splitCells(l).map(s => s.trim()); r = num(c[0], NaN); rest = c.slice(1); }
    if (!Number.isFinite(r)) { if (!/^(number|reeving|modes|lines)/i.test(l)) errors.push('Skipped line: ' + l.slice(0, 30)); continue; }
    const vals = cols.map((_, i) => { const t = (rest[i] ?? '').trim(); if (t === '' || t === '-' || t === '–') return null; const v = num(t, NaN); return Number.isFinite(v) ? v : null; });
    if (rest.filter(t => t.trim() !== '').length > cols.length) errors.push(`Row ${r}: more values than columns`);
    rows.push([r, ...vals]);
  }
  rows.sort((a, b) => a[0] - b[0]);
  // sanity: capacity should not rise with radius within a column
  cols.forEach((c, i) => {
    let prev = null;
    for (const row of rows) { const v = row[i + 1]; if (v == null) continue; if (prev != null && v > prev * 1.001) errors.push(`Check ${colName(c)} at ${row[0]} m: ${v} t is higher than at a shorter radius (${prev} t)`); prev = v; }
  });
  return { cols, rows, errors };
}
function colName(c) { return (c.head || String(c.L)) + (c.label ? ' (' + c.label + ')' : ''); }

function chartToText(p) {
  const h = 'H: ' + p.cols.map(c => [c.head || c.L, c.label || (c.falls ? '' : ''), c.falls || ''].filter((x, i) => i === 0 || x !== '').join('/')).join(' | ');
  return [h, ...p.rows.map(r => r[0] + ': ' + r.slice(1).map(v => v == null ? '-' : v).join(' '))].join('\n');
}

const _chartCache = new Map(); let _chartRev = 0; // _chartRev: bumped whenever a chart may have changed (app.js wraps _chartCache.clear)
function getChart(ch) {
  if (!ch) return null;
  const key = ch.src;
  if (!_chartCache.has(key)) _chartCache.set(key, parseChart(ch.src));
  return _chartCache.get(key);
}

// Capacity at radius R for column index ci.
function lookupCap(parsed, ci, R, mode = 'conservative') {
  if (!parsed || ci == null || ci < 0 || ci >= parsed.cols.length) return { cap: null, why: 'No chart column selected' };
  const pts = parsed.rows.filter(r => r[ci + 1] != null).map(r => [r[0], r[ci + 1]]);
  if (!pts.length) return { cap: null, why: 'Column has no values' };
  const min = pts[0][0], max = pts[pts.length - 1][0];
  if (R < min - 1e-9) return { cap: null, why: `Radius ${R} m is inside the chart minimum (${min} m) for this boom` };
  if (R > max + 1e-9) return { cap: null, why: `Radius ${R} m is beyond the chart maximum (${max} m) for this boom` };
  const exact = pts.find(p => Math.abs(p[0] - R) < 1e-6);
  if (exact) return { cap: exact[1], row: exact[0] };
  const hi = pts.find(p => p[0] > R); const lo = [...pts].reverse().find(p => p[0] < R);
  if (mode === 'interpolate' && lo && hi) return { cap: r2(lo[1] + (hi[1] - lo[1]) * (R - lo[0]) / (hi[0] - lo[0])), row: R, interp: true };
  if (mode === 'curve' && lo && hi) return { cap: r2(curveCap(pts, R)), row: R, interp: true, curve: true };
  return { cap: hi[1], row: hi[0], rounded: true };
}
// v9 curve fit between chart radii: a monotone cubic (Fritsch–Carlson / PCHIP) through the column, so the curve bends the way a load chart
// does instead of cutting straight across. Never more than the straight line between the two neighbouring points, never less than the next
// radius up — it sits between the "safe step" and plain interpolation.
function curveCap(pts, R) {
  const n = pts.length; let k = 0; while (k < n - 2 && pts[k + 1][0] < R) k++;
  const x = pts.map(p => p[0]), y = pts.map(p => p[1]); const h = [], d = [];
  for (let i = 0; i < n - 1; i++) { h.push(x[i + 1] - x[i]); d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i])); }
  const slope = (i) => {
    if (n < 3 || i === 0) return d[0]; if (i === n - 1) return d[n - 2];
    if (d[i - 1] * d[i] <= 0) return 0;
    const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; return (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  };
  const t = (R - x[k]) / h[k], t2 = t * t, t3 = t2 * t;
  const v = (2 * t3 - 3 * t2 + 1) * y[k] + (t3 - 2 * t2 + t) * h[k] * slope(k) + (-2 * t3 + 3 * t2) * y[k + 1] + (t3 - t2) * h[k] * slope(k + 1);
  const lin = y[k] + (y[k + 1] - y[k]) * t;
  return Math.max(Math.min(y[k], y[k + 1]), Math.min(v, lin, Math.max(y[k], y[k + 1])));
}

// crane side-view drawing (CAD library) for a crane record, following old keys
function drawingOf(crane) {
  if (typeof CRANE_DRAWINGS === 'undefined' || !crane || !crane.drawing || crane.drawing === 'proc') return null;
  const k = (typeof DRAWING_ALIAS !== 'undefined' && DRAWING_ALIAS[crane.drawing]) || crane.drawing; return CRANE_DRAWINGS[k] || null;
}
// boom foot pin (m from slew centre / ground) + the head-sheave offset normal to the boom (CAD drawings: the sheave sits below the pin line)
function geoPivot(crane) {
  const dr = drawingOf(crane);
  if (dr) { const v2 = dr.v === 2; const b = v2 && dr.secs?.[0]; return { x: dr.pivot[0], y: dr.pivot[1], n: v2 ? num(dr.tip?.[1]) : 0, nc: b ? (b.n0 + b.n1) / 2 : 0, half: b ? (b.n1 - b.n0) / 2 : num(crane?.boomDepth, 1.2) / 2 }; }
  return { x: num(crane?.pivotX, -1.5), y: num(crane?.pivotH, 3), n: 0, nc: 0, half: num(crane?.boomDepth, 1.2) / 2 };
}
// Geometry for telescopic or jib configurations. All in metres; origin = slew centre at crane ground.
// Main boom: theta is the boom (section) angle, L the boom length to the head sheave; the sheave sits n below the pin line,
// so the hook line is at R = Px + L·cosθ − n·sinθ.
function solveGeometry(crane, chartDef, col, R, boomOverride) {
  const Pf = geoPivot(crane || {}); const P = { x: Pf.x, y: Pf.y };
  const g = { pivot: P, ok: true, msgs: [], nOff: Pf.n, half: Pf.half };
  if (!chartDef || chartDef.kind === 'main' || !chartDef.kind) {
    const L = boomOverride > 0 ? boomOverride : (col ? col.L : NaN);
    g.kind = 'main'; g.L = L;
    if (!(L > 0)) { g.ok = false; g.msgs.push('Boom length not set'); return g; }
    const rho = Math.hypot(L, Pf.n), phi = Math.atan2(Pf.n, L);
    const c = (R - P.x) / rho;
    if (c > 1) { g.ok = false; g.msgs.push(`Radius ${R} m is out of reach for a ${r2(L)} m boom (max about ${r2(P.x + rho)} m)`); g.theta = 0; }
    else g.theta = (Math.acos(Math.max(-1, Math.min(1, c))) - phi) * R2D;
    if (g.theta > 85) { g.ok = false; g.msgs.push(`Boom angle ${g.theta.toFixed(1)}° — a telescopic boom can't luff past about 84°; increase the radius or shorten the boom`); }
    else if (g.theta > 82.5) g.msgs.push(`Boom angle ${g.theta.toFixed(1)}° is at the steep end of the chart (max ~84°)`);
    const t = g.theta * D2R + phi;
    g.tip = { x: P.x + rho * Math.cos(t), y: P.y + rho * Math.sin(t) };
    const u = [Math.cos(g.theta * D2R), Math.sin(g.theta * D2R)], nn = [-u[1], u[0]];
    const A = { x: P.x + Pf.nc * nn[0], y: P.y + Pf.nc * nn[1] }, B = { x: A.x + L * u[0], y: A.y + L * u[1] };
    g.segments = [[A, B]];
    return g;
  }
  const Lb = num(chartDef.mainLen), Lj = num(chartDef.jibLen);
  g.Lb = Lb; g.Lj = Lj;
  const head = (b) => ({ x: P.x + Lb * Math.cos(b * D2R) - Pf.n * Math.sin(b * D2R), y: P.y + Lb * Math.sin(b * D2R) + Pf.n * Math.cos(b * D2R) }); // main-boom head sheave
  if (chartDef.kind === 'luffing') {
    g.kind = 'luffing';
    const beta = col ? col.L : 83;
    const J = head(beta);
    const c = (R - J.x) / Lj;
    if (c > 1 || c < -0.2) { g.ok = false; g.msgs.push('Radius out of reach for this jib configuration'); }
    const gam = Math.acos(Math.max(-1, Math.min(1, c))) * R2D;
    g.theta = beta; g.gamma = gam; g.jibFoot = J;
    g.tip = { x: J.x + Lj * Math.cos(gam * D2R), y: J.y + Lj * Math.sin(gam * D2R) };
    if (gam > beta - 5) g.msgs.push('Jib is nearly in line with the main boom — check minimum angle between boom and jib');
    g.segments = [[P, J], [J, g.tip]];
    return g;
  }
  // fixed fly jib: columns are offset angles
  g.kind = 'fixedjib';
  const delta = col ? col.L : 0;
  const reach = (b) => head(b).x + Lj * Math.cos((b - delta) * D2R);
  let lo = 0, hi = 88;
  if (R > reach(lo) || R < reach(hi)) { g.ok = false; g.msgs.push('Radius out of reach for this fly-jib offset'); }
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (reach(m) > R) lo = m; else hi = m; }
  const beta = (lo + hi) / 2; const gam = beta - delta;
  const J = head(beta);
  g.theta = beta; g.gamma = gam; g.jibFoot = J;
  g.tip = { x: J.x + Lj * Math.cos(gam * D2R), y: J.y + Lj * Math.sin(gam * D2R) };
  g.segments = [[P, J], [J, g.tip]];
  return g;
}

// signed distance of point Q from segment AB: positive when Q is below the boom line
function clearanceToSegment(A, B, Q) {
  const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
  const t = Math.max(0, Math.min(1, ((Q.x - A.x) * dx + (Q.y - A.y) * dy) / (len * len)));
  const px = A.x + t * dx, py = A.y + t * dy;
  const d = Math.hypot(Q.x - px, Q.y - py);
  const cross = dx * (Q.y - A.y) - dy * (Q.x - A.x); // >0 → Q left of A→B (above when boom points right/up)
  return { d, below: cross < 0, t };
}

function groundAt(site, x) {
  const st = site || {};
  if (st.stepX != null && st.stepX !== '' && x >= num(st.stepX)) return num(st.targetGround, 0);
  return 0;
}

// ---- placed objects (buildings, trailers, containers…) in world metres; x measured from the slewing centre
const OBJ_TYPES = {
  building: { label: 'Building', w: 20, h: 12 }, wall: { label: 'Wall', w: 0.3, h: 3 }, box: { label: 'Equipment / box', w: 3, h: 2.5 },
  container: { label: 'Container', w: 6.06, h: 2.59 }, trailer: { label: 'Low-bed trailer', w: 20.2, h: 3.5 }, truck: { label: 'Truck', w: 10, h: 3.6 },
  towercrane: { label: 'Tower crane', w: 2, h: 30 }, tower: { label: 'Pylon / lattice tower', w: 6, h: 40 }, shed: { label: 'Shed / cabin', w: 6, h: 3 },
  tree: { label: 'Tree', w: 5, h: 8 }, pole: { label: 'Utility pole', w: 1.6, h: 10 }, person: { label: 'Person (scale)', w: 0.5, h: 1.8 }
};
function objBase(site, o) { return groundAt(site, num(o.x) + 0.01) + num(o.y, 0); }
function objExtent(site, o) { // horizontal span, height, landing surface
  const x = num(o.x), w = num(o.w, OBJ_TYPES[o.type]?.w || 2), h = num(o.h, OBJ_TYPES[o.type]?.h || 2), b = objBase(site, o);
  switch (o.type) {
    case 'towercrane': { const mw = num(o.mastW, 2), jb = num(o.jib), cj = jb > 0 ? num(o.cjib, r2(jb * 0.3)) : 0; return { x0: x - Math.max(mw / 2, cj), x1: x + Math.max(mw / 2, jb), top: b + h + num(o.topH), b, surf: null, jibY: jb > 0 ? b + h : null }; }
    case 'tree': case 'pole': return { x0: x - w / 2, x1: x + w / 2, top: b + h, b, surf: null };
    case 'shed': return { x0: x, x1: x + w, top: b + h + w * 0.15, b, surf: null };
    case 'tower': return { x0: x - w / 2, x1: x + w / 2, top: b + h, b, surf: null };
    case 'person': return { x0: x - 0.25, x1: x + 0.25, top: b + 1.8, b, surf: null };
    case 'trailer': return { x0: x, x1: x + 20.2, top: b + 3.5, b, surf: [x, x + 13.6, b + 1.45] };
    case 'truck': return { x0: x, x1: x + 10, top: b + 3.6, b, surf: [x, x + 7, b + 1.5] };
    case 'container': { const L = o.size === '40' ? 12.19 : 6.06; return { x0: x, x1: x + L, top: b + 2.59, b, surf: [x, x + L, b + 2.59] }; }
    default: return { x0: x, x1: x + w, top: b + h, b, surf: [x, x + w, b + h] };
  }
}
// key points of obstacles for clearance checks (m)
function obstaclePoints(site) {
  const pts = [];
  for (const o of (site?.obstacles || [])) {
    if (o.type === 'person') continue;
    const e = objExtent(site, o), lab = o.label || OBJ_TYPES[o.type]?.label?.toLowerCase() || 'obstruction';
    if (o.type === 'towercrane' && e.jibY != null) { pts.push({ x: e.x0, y: e.jibY + 1.6, label: 'tower crane counter-jib' }, { x: e.x1, y: e.jibY + 1.6, label: 'tower crane jib end' }, { x: num(o.x), y: e.top, label: 'tower crane top' }); continue; }
    if (o.type === 'tree' || o.type === 'pole') { pts.push({ x: num(o.x), y: e.top, label: lab + ' top' }, { x: e.x0, y: e.top - (o.type === 'tree' ? num(o.h, 8) * 0.3 : 0), label: lab }, { x: e.x1, y: e.top - (o.type === 'tree' ? num(o.h, 8) * 0.3 : 0), label: lab }); continue; }
    pts.push({ x: e.x0, y: e.top, label: lab + ' edge' }, { x: e.x1, y: e.top, label: lab + ' far edge' });
    if (o.type === 'trailer' || o.type === 'truck') pts.push({ x: e.x1 - 2.5, y: e.top, label: lab + ' cab' });
  }
  return pts;
}

// ---- telescopic boom model: real section count, retracted / fully extended lengths, per-section stroke ----
function boomSpec(crane, Lneed) {
  const dr2 = drawingOf(crane); const n = Math.max(2, Math.round(dr2?.v === 2 && dr2.secs?.length >= 2 ? dr2.secs.length : num(crane?.sections, 5)));
  let Lmin = num(crane?.boomMin, 10), Lmax = Math.max(Lmin + 1, num(crane?.boomMax, 40));
  for (const L of [].concat(Lneed || [])) if (L > 0) { if (L < Lmin) Lmin = L; if (L > Lmax) Lmax = L; } // chart columns always fit
  const D = Math.max(0.6, num(crane?.boomDepth, 1.2));
  const foot = Math.max(0.8, D * 0.7), head = Math.max(0.7, D * 0.55), lo = 0.3;
  const lenLast = Lmin + foot - (n - 1) * lo - head;
  const lens = Array.from({ length: n }, (_, i) => lenLast + 0.22 * (n - 1 - i));
  return { n, tele: n - 1, Lmin, Lmax, D, foot, head, lo, lens, E: (Lmax - Lmin) / (n - 1) };
}
// section start positions along the boom (m from the pivot) — never leaves a gap: each section keeps an overlap inside the previous one;
// if the data asks for more stroke than the sections allow, the whole boom is stretched uniformly (k) so the tip still lands exactly at L
function boomLayout(spec, L, fr) {
  const { n, lens, lo, E, foot, head } = spec; const starts = [-foot];
  for (let i = 1; i < n; i++) { const ov = Math.max(0.9, 0.1 * lens[i - 1]); let x = lo + Math.max(0, Math.min(1, num(fr?.[i - 1], 0))) * E; x = Math.min(x, lens[i - 1] - ov); starts.push(starts[i - 1] + x); }
  const tip = starts[n - 1] + lens[n - 1] + head;
  return { starts, lens, tip, k: L > 0 ? L / tip : 1, head, foot, n };
}
// fractions (0..1) of each telescopic section for a boom length (even telescoping) or the manual sliders
function teleFor(spec, L, manualFr) {
  if (manualFr) { const fr = Array.from({ length: spec.tele }, (_, i) => Math.max(0, Math.min(1, num(manualFr[i], 0)))); return { fr, L: r2(spec.Lmin + fr.reduce((a, f) => a + f * spec.E, 0)) }; }
  const f = Math.max(0, Math.min(1, (L - spec.Lmin) / Math.max(1e-6, spec.Lmax - spec.Lmin)));
  return { fr: Array(spec.tele).fill(f), L: r2(spec.Lmin + f * (spec.Lmax - spec.Lmin)) };
}
// every main-boom length the crane's charts use (boomSpec only needs the shortest and longest). v9: kept per crane record —
// the big Liebherrs carry 100–380 charts and this ran several times per lift on every redraw.
const _lenCache = new WeakMap();
function chartLengths(crane) { if (!crane || typeof crane !== 'object') return []; const hit = _lenCache.get(crane); if (hit && hit.charts === crane.charts && hit.n === (crane.charts || []).length && hit.rev === _chartRev) return hit.out;
  const all = chartLengthsAll(crane).filter(L => L > 0); const out = all.length ? [Math.min(...all), Math.max(...all)] : []; _lenCache.set(crane, { charts: crane.charts, n: (crane.charts || []).length, rev: _chartRev, out }); return out; }
function chartLengthsAll(crane) { const out = []; for (const ch of crane?.charts || []) { if (ch.kind === 'luffing' || ch.kind === 'fixedjib') { if (ch.mainLen) out.push(num(ch.mainLen)); } else { const p = getChart(ch); if (p) for (const c of p.cols) out.push(c.L); } } return out; }
// jib length range the crane really has (from its jib charts) or a sensible default
function jibRange(crane, type) {
  const kind = type === 'luff' ? 'luffing' : 'fixedjib'; const ls = (crane?.charts || []).filter(c => c.kind === kind).map(c => num(c.jibLen)).filter(v => v > 0);
  if (ls.length) return [Math.min(...ls), Math.max(...ls)];
  const j = crane?.jib?.[type]; if (j) return j;
  return type === 'luff' ? [20, Math.max(28, Math.round(num(crane?.cls, 100) / 6))] : [6, Math.max(12, Math.min(40, Math.round(num(crane?.cls, 100) / 7)))];
}
const ACC_LABELS = { flyjib: 'Fly jib', luffing: 'Luffing jib', yguy: 'Y-guying', superlift: 'Superlift', runner: 'Runner', extension: 'Boom extension' };
function accState(plan, crane, chartDef) {
  const a = plan.acc || {}; const avail = crane?.acc || ['flyjib'];
  const cfg = String(chartDef?.config || '').toUpperCase();
  const ty = /^TY/.test(cfg) || (typeof chartFam === 'function' && !!chartDef && chartFam(chartDef).yguy); // v11: any guyed chart (TY, TYF, TYN, T3Y…)
  return { yguy: (avail.includes('yguy') || ty) && (!!a.yguy || ty), yguyAuto: ty, superlift: avail.includes('superlift') && !!a.superlift, runner: avail.includes('runner') && !!a.runner,
    slRadius: num(a.slRadius, 15), slBallast: num(a.slBallast, 100), avail };
}
// capacity chart + geometry used for one load; a manual fly / luffing jib (no jib chart) overrides the geometry
function geoSetup(plan, crane, load) {
  const chartDef = crane?.charts?.[plan.chartIdx ?? 0] || null;
  const parsed = chartDef ? getChart(chartDef) : null;
  const ci = load && load.colIdx != null && load.colIdx !== '' ? +load.colIdx : (plan.colIdx != null ? +plan.colIdx : 0);
  const col = parsed?.cols?.[ci];
  const spec = boomSpec(crane, chartLengths(crane));
  const tv = plan.tele || {}; const jibChart = chartDef && chartDef.kind && chartDef.kind !== 'main';
  let mainL, teleMode = 'auto', locked = false;
  if (jibChart) { mainL = num(chartDef.mainLen, spec.Lmin); locked = true; }
  else if (tv.mode === 'manual' && Array.isArray(tv.fr)) { mainL = teleFor(spec, 0, tv.fr).L; teleMode = 'manual'; }
  else if (num(plan.boomOverride) > 0) mainL = Math.max(spec.Lmin, Math.min(spec.Lmax, num(plan.boomOverride)));
  else if (col && (!chartDef.kind || chartDef.kind === 'main')) mainL = col.L;
  else mainL = spec.Lmin + 0.35 * (spec.Lmax - spec.Lmin);
  const tele = teleFor(spec, mainL, teleMode === 'manual' ? tv.fr : null); if (teleMode !== 'manual') tele.L = r2(mainL);
  const boomOv = jibChart ? 0 : ((teleMode === 'manual' || num(plan.boomOverride) > 0 || !col) ? tele.L : 0);
  const at = plan.attach || {};
  let gChart = chartDef || { kind: 'main' }, gCol = col, manual = false;
  if ((at.type === 'fly' || at.type === 'luff') && !jibChart) {
    manual = at.type; const [jmin, jmax] = jibRange(crane, at.type);
    gChart = { kind: at.type === 'fly' ? 'fixedjib' : 'luffing', mainLen: tele.L, jibLen: Math.max(jmin, Math.min(jmax, num(at.jibLen, jmin))), manual: true };
    gCol = { L: at.type === 'fly' ? Math.max(0, Math.min(60, num(at.offset, 0))) : Math.max(60, Math.min(86, num(at.boomAngle, 83))) };
  }
  return { chartDef, parsed, ci, col, gChart, gCol, boomOv, manual, spec, tele: { ...tele, mode: teleMode, locked }, acc: accState(plan, crane, chartDef) };
}
const RIG_TYPES = { '4leg': { label: '4-leg chain sling', short: '4-LEG CHAIN', legs: 4, eff: 3 }, '2leg': { label: '2-leg chain sling', short: '2-LEG CHAIN', legs: 2, eff: 2 }, wire: { label: 'Wire rope slings', short: 'WIRE ROPE', legs: 2, eff: 2 }, nylon: { label: 'Webbing slings', short: 'WEBBING', legs: 2, eff: 2 }, spreader: { label: 'Spreader bar', short: 'SPREADER BAR', legs: 2, eff: 2, extra: 1.4 }, frame: { label: 'Lifting frame', short: 'LIFT FRAME', legs: 4, eff: 3, extra: 0.9 } };
const LIFT_TYPES = ['Routine', 'Critical', 'Complex', 'Tandem'];
function slingInfo(load) { // rigging geometry & tension from the per-load sling inputs
  const rt = RIG_TYPES[load.rigType]; const L = num(load.slingL); if (!rt && !(L > 0)) return null;
  const t = rt || RIG_TYPES['4leg']; const a = Math.max(5, Math.min(90, num(load.slingAng, 60)));
  const W = num(load.w) * (1 + num(load.cont) / 100);
  const T = r2(W / (t.eff * Math.sin(a * D2R)));
  const rigH = L > 0 ? r2(L * Math.sin(a * D2R) + (t.extra || 0)) : null;
  const wll = num(load.slingWLL);
  return { type: load.rigType || '4leg', label: t.label, legs: t.legs, eff: t.eff, ang: a, L, T, rigH, wll, util: wll > 0 ? r2(T / wll * 100) : null };
}

// dynamic amplification: EN 13001-2 φ2 = φ2,min + β2·vh (hoisting class, steady hoisting speed m/s)
const DAF_HC = { HC1: [1.05, 0.17], HC2: [1.10, 0.34], HC3: [1.15, 0.51], HC4: [1.20, 0.68] };
function dafAuto(D) { const t = DAF_HC[D?.cls] || DAF_HC.HC1; return Math.round((t[0] + t[1] * Math.max(0, num(D?.vh, 0.1))) * 1000) / 1000; }
// lifting tackles below the hook, listed top → bottom: names, lengths and weights the user keeps
const TACKLE_TYPES = { sling: 'Sling legs', shackle: 'Shackle', spreader: 'Spreader beam', beam: 'Lifting beam', chain: 'Chain block', hook: 'Hook extension', other: 'Other' };
const TACKLE_EXTRA_KEYS = ['mat', 'hitch', 'wllV', 'widthMm', 'dia', 'eye', 'cert', 'inspected', 'sleeve', 'colKey', 'grade', 'shape', 'std'];
function tackleStack(load) {
  const list = (load.tackles || []).filter(t => t && (num(t.L) > 0 || num(t.w) > 0));
  if (!list.length) return null;
  const lL = num(load.l, 2); const pick = num(load.pick) > 0 ? num(load.pick) : Math.max(0.3, lL - 0.3);
  let H = 0, w = 0; const items = [];
  for (let i = 0; i < list.length; i++) {
    const t = list[i]; const ty = TACKLE_TYPES[t.type] ? t.type : 'other'; const L = num(t.L); w += num(t.w);
    let v = 0, ang = null, sp = null; const legsN = Math.max(1, Math.round(num(t.legs, ty === 'sling' ? 2 : 1)));
    if (ty === 'sling' && legsN === 1 && t.hitch !== 'basket') { v = Math.max(0.2, L); ang = 90; } // one leg (straight or choke) hangs straight down
    else if (ty === 'sling') { // from the hook (one point) or from the beam above, down to the next beam or the load's pick points
      const isBeam = (x) => x.type === 'spreader' || x.type === 'beam';
      const below = list.slice(i + 1).find(isBeam), above = [...list.slice(0, i)].reverse().find(isBeam);
      sp = below ? Math.max(0.3, num(below.L, 2)) : pick; const top = above ? Math.max(0.3, num(above.L, 2)) : 0;
      const hh = Math.abs(sp - top) / 2; v = L > hh ? Math.sqrt(L * L - hh * hh) : Math.max(0.2, L * 0.4); ang = hh < 1e-6 ? 90 : L > hh ? Math.asin(v / L) * R2D : 10; }
    else if (ty === 'spreader' || ty === 'beam') v = Math.max(0.15, num(t.h, 0.45));
    else v = Math.max(0, L);
    const more = {}; for (const kk of TACKLE_EXTRA_KEYS) if (t[kk] !== undefined && t[kk] !== '') more[kk] = t[kk]; // v10: material, hitch, vertical WLL, certificate… (see rigging.js)
    items.push({ ...more, j: load.tackles.indexOf(t), name: t.name || TACKLE_TYPES[ty], type: ty, L, w: num(t.w), legs: legsN, wll: num(t.wll), v: r2(v), ang: ang != null ? r2(ang) : null, span: sp });
    H += v;
  }
  return { items, H: r2(H), w: r2(w) };
}

function computeLoad(plan, crane, load, settings) {
  const S = settings || DEFAULT_SETTINGS;
  const G = geoSetup(plan, crane, load); const { chartDef, parsed, ci, col } = G;
  const angleMode = load.by === 'angle', heightMode = load.by === 'height';
  let R;
  if (angleMode) R = radiusFromAngle(crane, G.gChart, G.gCol, num(load.angle, 60), G.boomOv);
  else if (heightMode) R = radiusFromAngle(crane, G.gChart, G.gCol, angleFromHeight(crane, G.gChart, G.gCol, num(load.tipH, 20), G.boomOv), G.boomOv);
  else R = num(load.R);
  const empty = !!load.empty; const stack = tackleStack(load);
  const boomOv = G.boomOv;
  // geometry first (v9: the hoist-rope deduction needs the boom-head height; nothing here depends on the weights)
  const g = solveGeometry(crane || {}, G.gChart, G.gCol, R, boomOv);
  if (!chartDef && !G.manual && boomOv > 0) { g.L = boomOv; }
  const W = empty ? 0 : num(load.w), contOn = load.contOn !== false && !empty, cont = contOn ? num(load.cont) : 0;
  const hb = (load.hb === '' || load.hb == null) ? num(crane?.hookBlock) : num(load.hb);
  const tk = empty && !load.emptyRig ? 0 : stack && stack.w > 0 ? stack.w : num(load.tk), ex = empty ? 0 : num(load.extra);
  const contW = r2(W * cont / 100);
  // v9 net-capacity deductions the load chart asks for: a fly jib / extension carried folded on the boom (not when a jib is in use),
  // and the hoist rope hanging between the boom head and the hook block (falls × length × kg/m) once the crane's rope weight is entered
  const jibInUse = !!G.manual || !!(chartDef?.kind && chartDef.kind !== 'main');
  const jd = !jibInUse && num(plan.jibDed) > 0 ? r2(num(plan.jibDed)) : 0;
  const hookYpre = (() => { const lg = load.landY !== '' && load.landY != null ? num(load.landY) : surfaceAt(plan.site, R); const sl0 = stack ? null : slingInfo(load); return lg + num(load.h, 1.5) + (stack ? stack.H : sl0 && sl0.rigH != null ? sl0.rigH : num(load.rigH, num(plan.rigging?.height, 3))); })();
  const falls = num(plan.falls) > 0 ? Math.round(num(plan.falls)) : num(col?.falls) > 0 ? num(col.falls) : 0;
  const ropeKgM = num(plan.ropeKgM); const ropeLen = g.tip ? r2(Math.max(0, g.tip.y - hookYpre - 1)) : 0;
  const rope = ropeKgM > 0 && falls > 0 ? r2(falls * ropeLen * ropeKgM / 1000) : 0;
  const total = r2(W + contW + hb + tk + ex + jd + rope);
  const Dd = load.daf || {}; const daf = Dd.on ? (Dd.mode === 'manual' ? Math.max(1, num(Dd.v, 1.1)) : dafAuto(Dd)) : null;
  const design = daf ? r2(total * daf) : total;
  const res = { R, W, contW, cont, contOn, hb, tk, ex, jd, rope, ropeInfo: { kgm: ropeKgM, falls, len: ropeLen }, total, daf, dafAuto: Dd.on && Dd.mode !== 'manual', design, empty, stack, checks: [], col, ci, chartDef, angleMode, heightMode, manualJib: G.manual, gChart: G.gChart, gCol: G.gCol, boomOv, tele: G.tele, spec: G.spec, acc: G.acc };
  // capacity — capAt reads the chart at any radius the same way (used again for the wind drift)
  const dutyC = typeof dutyCheck === 'function' ? dutyCheck(plan, crane, chartDef, G) : null; res.dutyWhy = !chartDef && dutyC ? dutyC.m : '';
  const capAt = (Rq) => {
    if (load.capOverride !== '' && load.capOverride != null && num(load.capOverride) > 0) return { cap: num(load.capOverride), manual: true };
    if (!parsed && !G.manual && res.dutyWhy) return { cap: null, why: res.dutyWhy };
    if (G.manual) return num(plan.attach?.swl) > 0 ? { cap: num(plan.attach.swl), manual: true, jib: true } : { cap: null, why: 'Enter the jib SWL from the ' + (G.manual === 'fly' ? 'fly-jib' : 'luffing-jib') + ' load chart' };
    if (parsed && chartDef.kind === 'main' && boomOv > 0 && col && Math.abs(boomOv - col.L) > 0.05) {
      // boom between chart columns → take the lower capacity of the bracketing lengths
      const Ls = [...new Set(parsed.cols.map(c => c.L))].sort((a, b) => a - b);
      const lower = [...Ls].reverse().find(L => L <= boomOv), upper = Ls.find(L => L >= boomOv);
      if (upper == null) return { cap: null, why: `Boom ${boomOv} m is longer than the longest chart column (${Ls[Ls.length - 1]} m)` };
      if (lower == null) return { cap: null, why: `Boom ${boomOv} m is shorter than the shortest column on this chart (${Ls[0]} m)` }; // v11: e.g. a Y-guy chart that starts at 31.7 m
      const cand = parsed.cols.map((c, i) => ({ c, i })).filter(o => (o.c.L === lower || o.c.L === upper) && (o.c.label || '') === (col.label || ''));
      const caps = cand.map(o => lookupCap(parsed, o.i, Rq, S.lookup)).filter(x => x.cap != null);
      return caps.length ? { cap: Math.min(...caps.map(x => x.cap)), row: caps[0].row, between: [lower ?? upper, upper] } : { cap: null, why: 'Boom length outside chart columns' };
    }
    // v11: a column printed twice (some imported tables carry the same boom / offset more than once) → the lower of the two
    const twins = parsed && col ? parsed.cols.map((c, i) => i).filter(i => i !== ci && parsed.cols[i].L === col.L && (parsed.cols[i].label || '') === (col.label || '')) : [];
    const own = lookupCap(parsed, ci, Rq, S.lookup); if (!twins.length) return own;
    const all = [own, ...twins.map(i => lookupCap(parsed, i, Rq, S.lookup))].filter(x => x.cap != null);
    return all.length ? all.reduce((a, b) => (b.cap < a.cap ? b : a)) : own;
  };
  let capInfo = capAt(R);
  res.capChart = capInfo.cap;
  // v9 wind on the load. A load chart's wind limit assumes about 1.2 m² of wind area per tonne on the hook (EN 13000). A load with more
  // area (A_W = projected area × drag coefficient) may only be lifted up to v_perm = v_chart · √(1.2 · m_H / A_W). When the gust at the
  // boom head is above that, the extra wind force pushes the hanging load out (worst case: straight away from the crane), so the chart is
  // read again at the drifted reach.
  const area = num(load.area);
  if (area > 0 && !empty && g.tip) {
    const cw = num(load.cw) > 0 ? num(load.cw) : 1.2, AW = r2(area * cw), mH = Math.max(0.05, total);
    const vTab = windTabOf(plan); const vPerm = r2(Math.min(vTab, vTab * Math.sqrt(1.2 * mH / AW)));
    const wx = evalWeather(plan, { tipY: g.tip.y }); const vDes = wx ? wx.maxG : null;
    const q = (v) => 0.5 * 1.25 * v * v / 1000;                                      // kN per m² of wind area at v m/s
    const Fdes = vDes != null ? r2(q(vDes) * AW) : null, Fref = q(vTab) * 1.2 * mH;   // the chart already allows for Fref
    const hang = Math.max(1, g.tip.y - (hookYpre - num(load.h, 1.5) / 2));             // boom head to the middle of the load
    const Fx = Fdes != null ? Math.max(0, Fdes - Fref) : 0; const phi = Math.atan(Fx / (mH * 9.81)); const dR = r2(hang * Math.sin(phi));
    const w = { area, cw, AW, mH: r2(mH), vTab, vPerm, vDes, F: Fdes, Fref: r2(Fref), hang: r2(hang), dR, swing: r2(phi * R2D), src: wx ? (wx.manual ? 'typed' : 'forecast') : null };
    if (dR > 0.005 && capInfo.cap != null && !capInfo.manual) { const c2 = capAt(R + dR); w.capWind = c2.cap; if (c2.cap == null || c2.cap < capInfo.cap) capInfo = { ...capInfo, cap: c2.cap, wind: true, why: c2.cap == null ? `The wind pushes the load ${dR.toFixed(2)} m out — beyond the chart` : capInfo.why }; }
    res.wind = w;
  }
  res.cap = capInfo.cap; res.capInfo = capInfo;
  if (res.cap != null && res.cap > 0) { res.util = r2(design / res.cap * 100); res.sf = Math.round(res.cap / design * 10000) / 10000; }
  // net capacity: what the load itself (with its margin) may weigh once the hook, tackles and deductions come off the chart value
  if (res.cap != null) { res.ded = r2(hb + tk + ex + jd + rope); res.netCap = r2(res.cap / (daf || 1) - res.ded); res.margin = res.cap > 0 ? r2((res.cap - design) / res.cap * 100) : null; }
  // v11: the chart has to be the one for the set-up on the crane (Y-guying, counterweight, jib) — duty.js. With no chart at all the
  // 'Chart capacity' check below already carries the reason.
  if (dutyC && chartDef && !capInfo.manual) res.checks.push(dutyC);
  if (chartDef && chartDef.verify) res.checks.push({ s: 'warn', t: 'Load chart', m: 'This chart was transcribed from a public datasheet (' + (chartDef.source || 'unverified') + ') — check it against the crane\'s own chart before issuing' });
  if (G.tele.mode === 'manual' && !G.tele.locked) res.checks.push({ s: 'info', t: 'Telescoping', m: `Sections set by hand (${G.tele.fr.map(f => Math.round(f * 100)).join(' / ')} %) → ${G.tele.L} m boom. Capacity is read for that length; check the crane's telescoping sequence gives the same chart` });
  res.geo = g;
  // lift side: the selected chart must be valid for the side the load is lifted over (a hand-entered capacity is the user's own responsibility)
  res.side = sideOf(load); res.slew = slewOf(load); res.sideOk = true;
  if (chartDef && !G.manual && !capInfo.manual && !chartCoversSide(chartDef, res.side)) {
    res.sideOk = false;
    res.checks.push({ s: 'fail', t: 'Lift side', m: `Chart does not cover lifting over the ${SIDE_WORD[res.side]} — this chart is only valid ${chartSectorLabel(chartDef)}. Pick a load chart that covers the ${SIDE_WORD[res.side]}, or lift over the rear instead.` });
  }
  // a lift over the FRONT puts the boom over the cab: say so on every front lift (the maker's chart / manual decides what is allowed)
  if (res.side === 'front') {
    const truck = /truck/i.test(crane?.type || '');
    if (truck) res.checks.push({ s: 'warn', t: 'Lift side', m: 'Over the front: check the maker allows it — truck cranes usually need the front jack down and may have lower front capacity.' });
    else if (chartDef && !G.manual && !capInfo.manual && res.sideOk) res.checks.push({ s: 'info', t: 'Lift side', m: `Over the front: this chart is ${chartSectorLabel(chartDef)}, so the front is allowed. Keep the cab and carrier clear of the load, and check the maker's notes for the front outriggers.` });
    else if (!chartDef || G.manual || capInfo.manual) res.checks.push({ s: 'info', t: 'Lift side', m: 'Over the front: the capacity was typed by hand, so make sure it is the maker\'s figure for lifting over the front.' });
  }
  // hook/load heights
  const landX = R; const landG = load.landY !== '' && load.landY != null ? num(load.landY) : null;
  const surface = landG != null ? landG : surfaceAt(plan.site, landX);
  res.landY = surface;
  const loadH = num(load.h, 1.5);
  const sl = stack ? null : slingInfo(load); res.sling = sl;
  const rig = stack ? stack.H : sl && sl.rigH != null ? sl.rigH : num(load.rigH, num(plan.rigging?.height, 3));
  res.rigH = rig;
  const allowance = num(plan.hookAllowance, 3);
  res.reqTipY = r2(surface + loadH + rig + allowance);
  res.hookY = r2(surface + loadH + rig);
  // v11 hoist: the load lifted off its landing (cab controls). Only the picture moves: the checks stay on the landed load (the worst case for
  // headroom is kept by stopping the hook short of the boom head, hook allowance included).
  res.lift = g.tip ? r2(Math.max(0, Math.min(num(load.hoist, 0), g.tip.y - allowance - res.hookY))) : 0; res.liftMax = g.tip ? r2(Math.max(0, g.tip.y - allowance - res.hookY)) : 0;
  // checks
  const lim = num(S.utilMax, 85), warn = num(S.utilWarn, 75);
  if (res.cap == null) res.checks.push({ s: 'fail', t: 'Chart capacity', m: capInfo.why || 'No capacity' });
  else {
    const note = capInfo.jib ? ' (jib SWL entered manually)' : capInfo.manual ? ' (entered manually)' : capInfo.wind ? ` (read at ${(R + res.wind.dR).toFixed(2)} m — the wind pushes the load ${res.wind.dR.toFixed(2)} m out)` : capInfo.between ? ` (lower of ${capInfo.between.join(' / ')} m columns)` : capInfo.rounded ? ` (taken at ${capInfo.row} m — next chart radius up)` : capInfo.curve ? ' (curve fit between chart radii)' : capInfo.interp ? ' (interpolated)' : '';
    res.checks.push({ s: res.util > 100 ? 'fail' : res.util > lim ? 'fail' : res.util > warn ? 'warn' : 'ok', t: 'Capacity utilisation', m: `${res.util.toFixed(2)}% of ${res.cap.toFixed(2)} t${note}${daf ? ` — with DAF ${daf} (${design.toFixed(2)} t design load)` : ''}` + (res.util > lim && res.util <= 100 ? ` — over the ${lim}% limit` : res.util > warn && res.util <= lim ? ` — critical lift (> ${warn}%)` : '') });
  }
  if (jd || rope) res.checks.push({ s: 'info', t: 'Deductions', m: [jd ? `folded jib ${jd.toFixed(2)} t` : '', rope ? `hoist rope ${rope.toFixed(2)} t (${falls} falls × ${ropeLen.toFixed(1)} m × ${ropeKgM} kg/m)` : ''].filter(Boolean).join(' and ') + ' counted in the hook load, as the load chart asks' });
  if (res.wind) { const w = res.wind;
    if (w.vDes != null) res.checks.push({ s: w.vDes > w.vPerm ? 'fail' : w.vDes > 0.8 * w.vPerm ? 'warn' : 'ok', t: 'Wind on the load', m: `${w.AW.toFixed(1)} m² wind area on ${w.mH.toFixed(1)} t: lift only up to ${w.vPerm.toFixed(1)} m/s (chart ${w.vTab} m/s). Gust at the boom head ${w.vDes.toFixed(1)} m/s` + (w.vDes > w.vPerm ? ` — too windy for this load${w.dR > 0 ? `; it would swing ${w.dR.toFixed(2)} m out` : ''}` : w.vDes > 0.8 * w.vPerm ? ' — close to the limit, use tag lines' : '') });
    else res.checks.push({ s: w.vPerm < w.vTab ? 'warn' : 'info', t: 'Wind on the load', m: `${w.AW.toFixed(1)} m² wind area on ${w.mH.toFixed(1)} t: stop lifting above ${w.vPerm.toFixed(1)} m/s at the boom head` + (w.vPerm < w.vTab ? ` (the chart allows ${w.vTab} m/s for normal loads)` : '') + '. Add the weather to check the forecast.' }); }
  if (!g.ok) g.msgs.forEach(m => res.checks.push({ s: 'fail', t: 'Geometry', m }));
  else g.msgs.forEach(m => res.checks.push({ s: 'warn', t: 'Geometry', m }));
  if (g.tip) {
    res.tipY = r2(g.tip.y);
    res.checks.push({ s: g.tip.y + 1e-6 >= res.reqTipY ? 'ok' : 'fail', t: 'Headroom', m: `Boom tip ${g.tip.y.toFixed(2)} m; needs ${res.reqTipY.toFixed(2)} m (landing ${surface.toFixed(2)} + load ${loadH} + rigging ${rig} + hook allowance ${allowance})` });
    // boom clearance vs obstacles
    const half = g.half != null ? g.half : num(crane?.boomDepth, 1.2) / 2;
    let worst = null;
    for (const q of obstaclePoints(plan.site)) {
      for (const [A, B] of g.segments) {
        if (q.x < Math.min(A.x, B.x) - 0.01 || q.x > Math.max(A.x, B.x) + 0.01) continue;
        const c = clearanceToSegment(A, B, q);
        const clr = c.below ? c.d - half : -(c.d + half);
        if (!worst || clr < worst.clr) worst = { clr, q, A, B, t: c.t };
      }
    }
    if (worst) {
      res.clearance = r2(worst.clr);
      { const fx = worst.A.x + worst.t * (worst.B.x - worst.A.x), fy = worst.A.y + worst.t * (worst.B.y - worst.A.y), dx = worst.q.x - fx, dy = worst.q.y - fy, d = Math.hypot(dx, dy) || 1;
        res.clearLine = { x1: worst.q.x, y1: worst.q.y, x2: fx + dx / d * half, y2: fy + dy / d * half, clr: r2(worst.clr), label: worst.q.label }; }
      const mc = num(S.minClearance, 1);
      res.checks.push({ s: worst.clr <= 0 ? 'fail' : worst.clr < mc ? 'warn' : 'ok', t: 'Boom clearance', m: worst.clr <= 0 ? `Boom hits the ${worst.q.label} — increase boom length or move the crane` : `${worst.clr.toFixed(2)} m to the ${worst.q.label} (min ${mc} m)` });
    }
  }
  if (stack && !empty) {
    const Wl = W + contW; let below = Wl + stack.items.reduce((a, t) => a + t.w, 0); let prev = null; const rgi = typeof SLING_INFO === 'function'; // rigging.js (v10); without it the old plain checks run
    for (const t of stack.items) {
      below -= t.w; const carry = r2(below + t.w); t.carry = carry; // what this item holds up: itself and everything under it
      const info = rgi ? SLING_INFO(t) : null; t.rg = info;
      if (t.type === 'sling') {
        const eff = info ? info.eff : t.legs >= 4 ? 3 : Math.max(1, t.legs); t.T = r2(carry / (eff * Math.sin(Math.max(5, t.ang) * D2R)));
        const lim = info && info.wll > 0 ? info.wllLeg : t.wll; // one leg's limit: vertical WLL × 1 (straight, basket) or × 0.8 (choke)
        t.util = lim > 0 ? r2(t.T / lim * 100) : null;
        const multi = info && (info.legs > 1 || info.hitch === 'basket'), overSet = !!(multi && info.wllEff > 0 && carry > info.wllEff * 1.0001); // the EN set rating at this angle
        const s2 = t.ang < 30 ? 'fail' : t.util != null && t.util > 100 ? 'fail' : t.ang < 45 || (t.util != null && t.util > 90) || overSet ? 'warn' : 'ok';
        res.checks.push({ s: s2, t: 'Sling tension', m: info ? rgSlingMsg(t, info, { T: t.T, util: t.util, ang: t.ang, carry }) : `${t.name}: ${t.T.toFixed(2)} t per leg at ${Math.round(t.ang)}° to horizontal${t.wll ? ` vs WLL ${t.wll} t (${t.util.toFixed(0)}%)` : ''}` + (t.ang < 45 ? ' — angle under 45°, use longer slings or a spreader' : '') });
      } else if (info && info.wll > 0) { // shackles, beams, hooks with a WLL: carried load against it
        const one = t.type === 'shackle' && prev && prev.type === 'sling' && prev.T != null; // a shackle under a sling set holds one leg
        const c1 = one ? prev.T : carry; t.carry = c1; t.legLoad = one; t.util = r2(c1 / info.wllEff * 100);
        res.checks.push({ s: t.util > 100 ? 'fail' : t.util > 90 ? 'warn' : 'ok', t: t.type === 'shackle' ? 'Shackle load' : 'Tackle load', m: rgLoadMsg(t, info, { carry: c1, util: t.util }) + (one ? ' (one sling leg)' : '') });
      }
      if (info && info.examMonths != null && info.examMonths > 6) res.checks.push({ s: 'warn', t: 'Tackle examination', m: rgExamMsg(t, info) });
      prev = t;
    }
  }
  if (empty) res.checks.push({ s: 'info', t: 'Empty hook', m: `Hook block only${tk ? ' + tackles' : ''} — ${total.toFixed(2)} t on the hook` });
  if (sl) {
    const s2 = sl.ang < 30 ? 'fail' : sl.util != null && sl.util > 100 ? 'fail' : sl.ang < 45 ? 'warn' : 'ok';
    res.checks.push({ s: s2, t: 'Sling tension', m: `${sl.T.toFixed(2)} t per leg — ${sl.label.toLowerCase()}, ${sl.ang}° to horizontal${sl.wll ? ` vs WLL ${sl.wll} t (${sl.util.toFixed(0)}%)` : ''}` + (sl.ang < 45 ? ' — sling angle under 45°, use longer slings' : '') });
  }
  const wind = num(plan.windMax, 0);
  res.status = res.checks.some(c => c.s === 'fail') ? 'fail' : res.checks.some(c => c.s === 'warn') ? 'warn' : 'ok';
  return res;
}

function surfaceAt(site, x) {
  let y = groundAt(site, x);
  for (const o of (site?.obstacles || [])) {
    const e = objExtent(site, o);
    if (e.surf && x >= e.surf[0] - 1e-6 && x <= e.surf[1] + 1e-6) y = Math.max(y, e.surf[2]);
  }
  return y;
}

// v9: the load chart's wind limit (m/s at the boom head): the weather card's limit, else the crane's own entry, else 9.8 m/s (a common chart value)
function windTabOf(plan) { const a = num(plan?.weather?.limit), b = num(plan?.windTab); return a > 0 ? a : b > 0 ? b : 9.8; }

// radius produced by a given boom (telescopic) / jib (luffing) / main-boom (fly jib) angle
function tipFromAngle(crane, chartDef, col, ang, boomOv) {
  const P = geoPivot(crane || {});
  const a = ang * D2R;
  if (!chartDef || !chartDef.kind || chartDef.kind === 'main') { const L = boomOv > 0 ? boomOv : (col ? col.L : 20); return { x: P.x + L * Math.cos(a) - P.n * Math.sin(a), y: P.y + L * Math.sin(a) + P.n * Math.cos(a) }; }
  const Lb = num(chartDef.mainLen), Lj = num(chartDef.jibLen);
  const hd = (b) => [P.x + Lb * Math.cos(b) - P.n * Math.sin(b), P.y + Lb * Math.sin(b) + P.n * Math.cos(b)];
  if (chartDef.kind === 'luffing') { const b = (col ? col.L : 83) * D2R, J = hd(b); return { x: J[0] + Lj * Math.cos(a), y: J[1] + Lj * Math.sin(a) }; }
  const delta = (col ? col.L : 0) * D2R, J = hd(a); return { x: J[0] + Lj * Math.cos(a - delta), y: J[1] + Lj * Math.sin(a - delta) };
}
function radiusFromAngle(crane, chartDef, col, ang, boomOv) { return r2(tipFromAngle(crane, chartDef, col, ang, boomOv).x); }
// boom / jib angle that puts the boom tip at height H (bisection; tip height rises with the angle)
function angleFromHeight(crane, chartDef, col, H, boomOv) {
  const f = (a) => tipFromAngle(crane, chartDef, col, a, boomOv).y - H; let lo = 0.5, hi = chartDef?.kind === 'luffing' ? 88 : 85;
  if (f(lo) >= 0) return lo; if (f(hi) <= 0) return hi;
  for (let i = 0; i < 44; i++) { const m = (lo + hi) / 2; if (f(m) < 0) lo = m; else hi = m; }
  return Math.round((lo + hi) * 50) / 100;
}

// inverse of radiusFromAngle (bisection; radius falls as the angle rises)
function angleFromRadius(crane, chartDef, col, R, boomOv) {
  let lo = 0.5, hi = 88.5; const f = (a) => radiusFromAngle(crane, chartDef, col, a, boomOv) - R;
  if (f(lo) <= 0) return lo; if (f(hi) >= 0) return hi;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; }
  return Math.round((lo + hi) * 5) / 10;
}

// several cranes per plan: the top-level crane fields are the active crane; the others are parked in plan.cranes[i]
const CRANE_KEYS = ['craneId', 'chartIdx', 'colIdx', 'cwt', 'config', 'outriggerTxt', 'boomOverride', 'tele', 'attach', 'acc', 'falls', 'matSize', 'modelTxt', 'hookAllowance', 'wind', 'outExt', 'padMan', 'jibDed', 'ropeKgM', 'windTab'];
function rigOf(plan, i) { const a = num(plan.activeCrane, 0); if (i === a || !plan.cranes?.[i]) return plan; return { ...plan, ...plan.cranes[i] }; }
function rigIndexOf(plan, l) { const i = Math.round(num(l?.crane, 0)); return plan.cranes?.[i] || i === num(plan.activeCrane, 0) ? i : num(plan.activeCrane, 0); }
function computePlan(plan, cranes, settings) {
  const crane = cranes.find(c => c.id === plan.craneId) || cranes[0];
  const rigs = new Map();
  const loads = (plan.loads || []).map((l, li) => {
    const ri = rigIndexOf(plan, l); const pv = rigOf(plan, ri); const cr = cranes.find(c => c.id === pv.craneId) || crane;
    if (!rigs.has(ri)) rigs.set(ri, { i: ri, crane: cr, pv });
    // v9: a tandem lift (2–4 cranes on this load) — the lift's own crane carries its share, tandem.js works out every crane
    const r = typeof computeTandem === 'function' && typeof tandemOf === 'function' && tandemOf(l) ? computeTandem(plan, cranes, settings, l, li) : computeLoad(pv, cr, l, settings);
    r.crane = cr; r.rigI = ri; return r;
  });
  // the other cranes of a tandem stand on their own legs too: their share goes into their outrigger model
  const extra = new Map();
  loads.forEach((res, li) => { for (const pk of res.tandem?.picks?.slice(1) || []) { if (!rigs.has(pk.crane)) rigs.set(pk.crane, { i: pk.crane, crane: pk.res.crane, pv: rigOf(plan, pk.crane) }); if (!extra.has(pk.crane)) extra.set(pk.crane, []); extra.get(pk.crane).push({ li, res: pk.res }); } });
  // outrigger (leg) loads per crane — outrig.js; the active crane's result drives the ground table
  const op = plan.outrigger || {};
  const outrigs = [];
  if (typeof outriggerCrane === 'function') for (const rg of rigs.values()) {
    const ex = extra.get(rg.i) || [];
    const O = outriggerCrane(rg.pv, rg.crane, [...loads.map((res, li) => ({ li, res })).filter(x => x.res.rigI === rg.i), ...ex], op);
    const lr = loads.slice(); for (const x of ex) lr[x.li] = x.res;                     // a tandem crane's leg checks land on its own result
    O.rigI = rg.i; O.crane = rg.crane; O.checks = outriggerChecks(O, rg.crane, lr); outrigs.push(O);
  }
  if (typeof tandemMergeChecks === 'function') for (const l of loads) if (l.tandem) tandemMergeChecks(l);
  const outr = outrigs.find(o => o.rigI === num(plan.activeCrane, 0)) || outrigs[0] || null;
  // ground pressure: the maker's leg load when typed, else the biggest leg load (calculated, or typed by hand for an illustration)
  let ground = null;
  if (op.enabled || num(op.allow) > 0) {
    const maxT = Math.max(0, ...loads.map(l => l.total || 0));
    const est = r2(num(settings.outriggerFactor, 0.8) * (num(crane.mass) + num(plan.cwt ?? crane.cwt) + maxT));
    const maker = num(op.maxLoad) > 0;
    const P = maker ? num(op.maxLoad) : outr?.any || outr?.illus ? outr.Pmax.v : est;
    const src = maker ? 'maker' : outr?.illus && outr.Pmax.manual ? 'illus' : outr?.any ? 'calc' : 'est';
    const [a, b] = String(op.mat || plan.matSize || '1.0x1.0').toLowerCase().replace('m', '').split('x').map(v => num(v, 1));
    const area = r2(a * b), self = num(op.matSelf, 0), eff = Math.max(0.05, Math.min(1, num(op.matEff, 1)));
    const press = r2((P + self) / (area * eff));
    ground = { P, est: src === 'est', src, illus: !maker && !!outr?.illus, estVal: est, self, mat: `${a.toFixed(1)}x${b.toFixed(1)}M`, area, eff, press, allow: num(op.allow, 0) };
    if (outr) ground.pads = Object.fromEntries(OUT_PADS.map(id => [id, r2((outr.used[id] + self) / (area * eff))]));
    if (ground.allow > 0) ground.side = r2(Math.sqrt((P + self) / (ground.allow * eff)));
    ground.status = ground.allow > 0 ? (press > ground.allow ? 'fail' : press > 0.9 * ground.allow ? 'warn' : 'ok') : 'info';
  }
  // rigging
  const rg = plan.rigging || {};
  let rig = null;
  if (rg.enabled) {
    const L = loads[num(rg.loadIdx, 0)] || loads[0];
    const legs = Math.max(1, Math.round(num(rg.legs, 2))), eff = Math.max(1, Math.min(legs, Math.round(num(rg.effLegs, legs >= 4 ? 3 : legs))));
    const sl = num(rg.slingL, 6), d = num(rg.spread, 2) / 2;
    const sin = Math.min(0.999, d / sl), alpha = Math.asin(sin) * R2D;
    const Wl = L ? L.W + L.contW : 0;
    const T = r2(Wl / (eff * Math.cos(alpha * D2R)));
    const vert = r2(sl * Math.cos(alpha * D2R));
    rig = { legs, eff, alpha: r2(alpha), included: r2(2 * alpha), toHoriz: r2(90 - alpha), T, vert, Wl, wll: num(rg.slingWLL), shackleWLL: num(rg.shackleWLL) };
    rig.slingUtil = rig.wll > 0 ? r2(T / rig.wll * 100) : null;
    rig.shackleUtil = rig.shackleWLL > 0 ? r2(T / rig.shackleWLL * 100) : null;
    rig.status = (rig.slingUtil > 100 || rig.shackleUtil > 100 || alpha > 60) ? 'fail' : (alpha > 45 ? 'warn' : 'ok');
  }
  // the leg checks were added to each lift after computeLoad set its status — settle it again
  for (const l of loads) l.status = l.checks.some(c => c.s === 'fail') ? 'fail' : l.checks.some(c => c.s === 'warn') ? 'warn' : 'ok';
  const sts = [...loads.map(l => l.status), ground?.status, rig?.status, ...outrigs.flatMap(o => o.checks.map(c => c.s))];
  const status = sts.includes('fail') ? 'fail' : sts.includes('warn') ? 'warn' : 'ok';
  const wx = evalWeather(plan, loads[Math.min(loads.length - 1, plan.activeLoad || 0)]);
  const st2 = wx && wx.status === 'fail' ? 'fail' : wx && wx.status === 'warn' && status === 'ok' ? 'warn' : status;
  return { crane, loads, ground, rig, status: st2, weather: wx, rigs: [...rigs.values()].sort((a, b) => a.i - b.i), outr, outrigs };
}

// ---- weather: wind at boom-tip height from the 10/80/120/180 m forecast levels, rain & storms in the lift window ----
const WX_CODES = { 0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Rain showers', 81: 'Rain showers', 82: 'Violent showers', 95: 'Thunderstorm', 96: 'Thunderstorm, hail', 99: 'Thunderstorm, heavy hail' };
function windAt(h, w10, w80, w120, w180) {
  const lv = [[10, w10], [80, w80], [120, w120], [180, w180]].filter(([, v]) => v != null && isFinite(v));
  if (!lv.length) return null; h = Math.max(2, h);
  if (h <= lv[0][0]) return lv[0][1] * Math.pow(h / lv[0][0], 0.14);
  for (let i = 1; i < lv.length; i++) if (h <= lv[i][0]) { const [h0, v0] = lv[i - 1], [h1, v1] = lv[i]; const t = Math.log(h / h0) / Math.log(h1 / h0); return v0 + (v1 - v0) * t; }
  const [hl, vl] = lv[lv.length - 1]; return vl * Math.pow(h / hl, 0.14);
}
function weatherWindow(W) {
  const H = W?.hourly; if (!H || !H.time?.length) return [];
  const d = W.date || H.time[0].slice(0, 10); const st = num(String(W.start || '07:00').split(':')[0], 7), hrs = Math.max(1, num(W.hours, 4));
  return H.time.map((t, i) => ({ t, i })).filter(({ t }) => t.slice(0, 10) === d && num(t.slice(11, 13)) >= st && num(t.slice(11, 13)) < st + hrs);
}
function evalWeather(plan, load0) {
  const W = plan.weather; if (!W || (!W.hourly && !(W.manual && (num(W.manual.wind) > 0 || num(W.manual.gust) > 0)))) return null;
  const tipH = Math.max(10, num(load0?.tipY, 30)); const limit = num(W.limit, 9);
  let rows = [];
  if (W.hourly) {
    const H = W.hourly;
    rows = weatherWindow(W).map(({ t, i }) => { const wt = windAt(tipH, H.ws10?.[i], H.ws80?.[i], H.ws120?.[i], H.ws180?.[i]); const g10 = H.gust10?.[i]; const gt = g10 != null && H.ws10?.[i] > 0.2 ? g10 * (wt / H.ws10[i]) : g10;
      return { t, w10: H.ws10?.[i], wt: wt != null ? r2(wt) : null, gt: gt != null ? r2(gt) : null, pp: H.pp?.[i], pr: H.pr?.[i], code: H.code?.[i], temp: H.temp?.[i], dir: H.dir?.[i] }; });
  }
  const man = W.manual || {}; const up = (v) => v > 0 ? windAt(tipH, v) : 0; // entered values are 10 m forecast figures → scaled to tip height
  const maxW = rows.length ? Math.max(...rows.map(r => r.wt || 0)) : up(num(man.wind));
  const maxG = rows.length ? Math.max(...rows.map(r => r.gt || 0)) : up(num(man.gust, num(man.wind)));
  const rain = rows.length ? Math.max(...rows.map(r => r.pp || 0)) : num(man.rain);
  const prMax = rows.length ? Math.max(...rows.map(r => r.pr || 0)) : 0;
  const storm = rows.some(r => r.code >= 95);
  const msgs = []; let s = 'ok';
  if (storm) { s = 'fail'; msgs.push('Thunderstorm forecast in the lift window — no lifting'); }
  if (maxG > limit) { s = 'fail'; msgs.push(`Gusts ${maxG.toFixed(1)} m/s at the boom tip exceed the ${limit} m/s limit`); }
  else if (maxG > limit * 0.8) { if (s === 'ok') s = 'warn'; msgs.push(`Gusts ${maxG.toFixed(1)} m/s at the boom tip — within 20% of the ${limit} m/s limit`); }
  if (rain >= 60 || prMax >= 1) { if (s === 'ok') s = 'warn'; msgs.push(`Rain likely (${Math.round(rain)}%${prMax ? `, up to ${prMax.toFixed(1)} mm/h` : ''})`); }
  if (!msgs.length) msgs.push(`Wind ${maxW.toFixed(1)} m/s, gusts ${maxG.toFixed(1)} m/s at ${Math.round(tipH)} m — under the ${limit} m/s limit`);
  const worst = rows.reduce((a, r) => (r.code ?? -1) > (a ?? -1) ? r.code : a, null);
  return { status: s, rows, maxW: r2(maxW), maxG: r2(maxG), rain: Math.round(rain), prMax: r2(prMax), storm, tipH: r2(tipH), limit, msgs, outlook: worst != null ? (WX_CODES[worst] || 'Code ' + worst) : (man.note || ''), place: W.place || '', date: W.date || '', start: W.start || '', hours: W.hours || '', manual: !rows.length, fetched: W.fetched || '' };
}

// Rank fleet options for one lift. opts: { allowJib, space: {L, W}, maxUtil, craneIds }
function outriggerSpan(crane, chart) {
  const m = /([\d.]+)\s*[x×]\s*([\d.]+)/i.exec(String(chart?.outrigger || crane.outrigger || ''));
  const a = m ? +m[1] : num(crane.outLong, 7), b = m ? +m[2] : num(crane.outTrans, 7);
  return [Math.max(a, b), Math.min(a, b)];
}
// v9 Fit-Filter: weight, reach and (optionally) an obstruction the boom must clear — height h at x m from the crane — plus the lift side.
// Every chart column is screened on its chart value first (the same reading computeLoad makes); only columns that can carry the hook load
// get the full geometry run (headroom, boom over the obstruction, side). A crane with nothing that works keeps its strongest column so the
// list can say how close it gets. ~0.1 s for the whole fleet.
function findCranes(req, cranes, settings, opts = {}) {
  const out = [];
  const lim = num(opts.maxUtil, num(settings?.utilMax, 90)); const S = { ...settings, utilMax: lim };
  const R = num(req.R), oh = num(req.obst?.h);
  const site = oh > 0 ? { ...(req.site || {}), obstacles: [...(req.site?.obstacles || []), { type: 'wall', x: r2(Math.max(0.5, num(req.obst.x) > 0 ? num(req.obst.x) : R * 0.6)), y: 0, w: 0.3, h: oh, label: 'OBSTRUCTION' }] } : req.site;
  const side = sideOf(req.side);
  for (const crane of cranes) {
    if (opts.craneIds && !opts.craneIds.includes(crane.id)) continue;
    const hb = req.hb > 0 ? num(req.hb) : num(crane.hookBlock);
    const need = (num(req.w) * (1 + num(req.cont) / 100) + num(req.tk) + hb) * 100 / lim; // chart value a column needs at this reach
    let okN = 0, best = null;
    const run = (o) => {
      const plan = { craneId: crane.id, chartIdx: o.chi, colIdx: o.ci, site, hookAllowance: req.hookAllowance, rigging: { height: req.rigH } };
      const load = { name: 'LOAD', w: req.w, hb, tk: req.tk, cont: req.cont, R, h: req.h, rigH: req.rigH, landY: req.landY ?? '', side };
      const r = computeLoad(plan, crane, load, S);
      if (r.cap == null || !r.geo.ok) return null;
      const fails = r.checks.filter(c => c.s === 'fail');
      if (!o.fits) fails.push({ s: 'fail', t: 'Outrigger space', m: `outriggers ${o.span[0]} × ${o.span[1]} m need more than the ${o.sp[0]} × ${o.sp[1]} m available` });
      const res = { crane, chi: o.chi, ci: o.ci, col: o.col, chart: o.ch, r, ok: fails.length === 0, fails, span: o.span, fits: o.fits };
      out.push(res); return res;
    };
    (crane.charts || []).forEach((ch, chi) => {
      if (!opts.allowJib && ch.kind && ch.kind !== 'main') return;
      const p = getChart(ch); if (!p) return;
      const span = outriggerSpan(crane, ch);
      const sp = opts.space && num(opts.space.L) > 0 && num(opts.space.W) > 0 ? [Math.max(num(opts.space.L), num(opts.space.W)), Math.min(num(opts.space.L), num(opts.space.W))] : null;
      const fits = !sp || (span[0] <= sp[0] + 1e-6 && span[1] <= sp[1] + 1e-6);
      p.cols.forEach((col, ci) => {
        const q = lookupCap(p, ci, R, S.lookup); if (q.cap == null) return;
        const o = { chi, ci, col, ch, span, sp, fits, cap: q.cap };
        if (q.cap + 1e-9 >= need && chartCoversSide(ch, side)) { const r = run(o); if (r && r.ok) okN++; }
        else if (!best || q.cap > best.cap) best = o;
      });
    });
    if (!okN && best) run(best);
  }
  out.sort((a, b) => (b.ok - a.ok) || (a.crane.cls - b.crane.cls) || (a.r.util - b.r.util));
  return out;
}
// best configuration per crane: main boom before jibs, least counterweight, shortest boom. A crane that can't do the lift shows its
// strongest configuration (how close it gets).
function bestPerCrane(res) {
  const by = new Map();
  const rank = (o) => o.ok ? [0, (o.chart.kind || 'main') === 'main' ? 0 : 1, num(o.chart.cwt, 999), o.col.L, o.r.util] : [1, -num(o.r.cap), o.r.util];
  const better = (a, b) => { const x = rank(a), y = rank(b); for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) return (x[i] ?? 0) < (y[i] ?? 0); return false; };
  for (const o of res) { const cur = by.get(o.crane.id); if (!cur || better(o, cur)) by.set(o.crane.id, o); }
  return [...by.values()].sort((a, b) => (b.ok - a.ok) || (a.crane.cls - b.crane.cls) || (a.r.util - b.r.util));
}

if (typeof module !== 'undefined') module.exports = { curveCap, windTabOf, LIFT_SIDES, SIDE_OFFSET, SIDE_WORD, SIDE_NAME, sideOf, normDeg, degDiff, carrierHeadingFor, boomHeadingFor, sideFromHeadings, chartSectorsOf, chartCoversSide, chartSectorLabel, bestChartForSide, boomLayout, boomSpec, teleFor, jibRange, accState, ACC_LABELS, windAt, evalWeather, weatherWindow, WX_CODES, geoSetup, slingInfo, RIG_TYPES, LIFT_TYPES, angleFromRadius, bestPerCrane, outriggerSpan, radiusFromAngle, objExtent, OBJ_TYPES, parseChart, chartToText, getChart, lookupCap, solveGeometry, computeLoad, computePlan, findCranes, clearanceToSegment, surfaceAt, groundAt, num, r2, colName };
