// ===== v10 Lift Plan Set: a multi-page A3 drawing set built from the plan =====
// Cover & document control, general arrangement (plan, 3D, elevation, crane support locations, main crane data), site layout, rigging
// tackle list & arrangement, load & sling calculations, crane capacity, outrigger loads & ground bearing, tandem lift, risk assessment &
// method statement, pre-lift checklist & sign-off. Every page shares one frame and title column (company, notes, legend, references,
// revisions, project / client / contractors, drawing title, status, scale / date / sheet / size) — the layout of a consultant's lift plan.
// Drawings come from the A1 engine (draw.js) drawn PS_K× bigger and scaled into their box, so dimensions and text keep A1 proportions.
// Pure: buildPlanSet(plan, calc, settings, { shot }) → [{ P, extra, code, title }]; psPageSVG(page) → one SVG per page (A3 landscape, mm).
const PS = { W: 420, H: 297, m: 8, tb: 74 };
PS.x1 = PS.W - PS.m; PS.y1 = PS.H - PS.m; PS.tx = PS.x1 - PS.tb;          // title column starts at PS.tx
const PS_DA = { x: PS.m + 3, y: PS.m + 3, w: PS.tx - PS.m - 6, h: PS.H - 2 * PS.m - 6 }; // the drawing area inside the frame
const PS_K = 2;                                                            // A1-engine drawings are made at this size and scaled down
const PSC = { ink: '#0f172a', ink2: '#475569', ink3: '#64748b', line: '#94a3b8', hair: '#cbd5e1', head: '#14213d', accent: '#fca311', soft: '#eef2f7', zebra: '#f8fafc',
  blue: '#1d4ed8', red: '#dc2626', green: '#15803d', mag: '#a21caf', ok: '#15803d', warn: '#b45309', fail: '#b91c1c', okBg: '#dcfce7', warnBg: '#fef3c7', failBg: '#fee2e2', infoBg: '#e0f2fe' };
const psSt = (s) => (s === 'fail' ? [PSC.fail, PSC.failBg] : s === 'warn' ? [PSC.warn, PSC.warnBg] : s === 'ok' ? [PSC.ok, PSC.okBg] : [PSC.ink2, PSC.soft]);
const psKg = (t) => (t == null || !isFinite(t) ? '—' : String(Math.round(t * 1000)));
const psN = (v, d = 2) => (v == null || v === '' || !isFinite(v) ? '—' : (+v).toFixed(d));

// ---------- text, tables, captions ----------
function psT(P, x, y, s, size, o = {}) {
  s = String(s ?? ''); const sz = o.maxW ? Math.min(size, fitSize(s, o.maxW, size, o.bold)) : size;
  P.text(x, y, s, { size: sz, anchor: o.anchor || 'start', vAlign: o.vAlign || 'middle', bold: o.bold, color: o.color || PSC.ink, rot: o.rot, underline: o.underline, bg: o.bg, layer: o.layer || 'SET' });
}
function psLines(s, size, maxW, bold) {
  const out = [];
  for (const para of String(s ?? '').split('\n')) {
    let cur = ''; for (const w of para.split(/\s+/).filter(Boolean)) { const t = cur ? cur + ' ' + w : w; if (cur && textW(t, size, bold) > maxW) { out.push(cur); cur = w; } else cur = t; }
    out.push(cur);
  }
  return out;
}
function psWrap(P, x, y, s, size, maxW, o = {}) { // top-aligned paragraph; returns the height used
  let L = psLines(s, size, maxW, o.bold); const lh = size * (o.lh || 1.32);
  if (o.max && L.length > o.max) { L = L.slice(0, o.max); L[L.length - 1] = L[L.length - 1].replace(/\s*\S*$/, '') + ' …'; }
  L.forEach((l, i) => psT(P, x, y + size * 0.62 + i * lh, l, size, { ...o, maxW, vAlign: 'middle' }));
  return L.length * lh;
}
// cols: [{ w, t (head; '\n' for two lines), a: 'l'|'c'|'r' }]; rows: [cells] | { cells, fill, bold, h, color }; cell: text | { t, bold, color, fill, wrap }
function psTable(P, x, y, cols, rows, o = {}) {
  const rh = o.rh || 5, fs = o.fs || 2.3, W = cols.reduce((a, c) => a + c.w, 0); let cy = y;
  const put = (cx, w, h, v, a, bold, color, size) => {
    const t = String(v ?? ''); const sz = size || fs;
    if (a === 'c') cellText(P, cx + w / 2, cy + h / 2, t, w - 1.4, sz, { bold, color: color || PSC.ink, layer: 'SET', h });
    else psT(P, a === 'r' ? cx + w - 1 : cx + 1.1, cy + h / 2, t, sz, { anchor: a === 'r' ? 'end' : 'start', bold, color, maxW: w - 2.2 });
  };
  if (o.title) { const th = o.th || 6.4; P.rect(x, cy, W, th, { fill: PSC.head, stroke: PSC.head, w: 0.2, layer: 'SET' }); P.rect(x, cy, 1.4, th, { fill: PSC.accent, stroke: 'none', layer: 'SET' }); psT(P, x + W / 2, cy + th / 2, o.title, o.tfs || 3.1, { anchor: 'middle', bold: true, color: '#ffffff', maxW: W - 6 }); cy += th; }
  if (cols.some(c => c.t)) {
    const hh = o.hh || rh; P.rect(x, cy, W, hh, { fill: o.headFill || PSC.soft, stroke: PSC.line, w: 0.15, layer: 'SET' }); let cx = x;
    for (const c of cols) { const ls = String(c.t || '').split('\n'); const hs = Math.min(o.hfs || fs, ...ls.map(l => fitSize(l, c.w - 1.4, o.hfs || fs, true)));
      ls.forEach((l, i) => psT(P, cx + c.w / 2, cy + hh / 2 + (i - (ls.length - 1) / 2) * hs * 1.15, l, hs, { anchor: 'middle', bold: true, color: PSC.ink }));
      if (cx > x) P.line(cx, cy, cx, cy + hh, { stroke: PSC.line, w: 0.15, layer: 'SET' }); cx += c.w; }
    cy += hh;
  }
  rows.forEach((r, ri) => {
    const arr = Array.isArray(r), cells = arr ? r : r.cells, ro = arr ? {} : r; const hh = ro.h || rh; // (an array has its own .fill — never read row options off one)
    P.rect(x, cy, W, hh, { fill: ro.fill || (o.zebra !== false && ri % 2 ? PSC.zebra : '#ffffff'), stroke: PSC.hair, w: 0.12, layer: 'SET' });
    let cx = x;
    cells.forEach((v, i) => {
      const c = cols[i]; if (!c) return; const ob = v && typeof v === 'object' ? v : { t: v };
      if (ob.fill) P.rect(cx, cy, c.w, hh, { fill: ob.fill, stroke: 'none', layer: 'SET' });
      if (i) P.line(cx, cy, cx, cy + hh, { stroke: PSC.hair, w: 0.12, layer: 'SET' });
      if (ob.wrap) psWrap(P, cx + 1.1, cy + 0.7, ob.wrap, ob.size || fs, c.w - 2.2, { max: Math.max(1, Math.floor((hh - 0.8) / ((ob.size || fs) * 1.32))), color: ob.color, bold: ob.bold });
      else put(cx, c.w, hh, ob.t, c.a, ro.bold || ob.bold, ob.color || ro.color, ob.size);
      cx += c.w;
    });
    cy += hh;
  });
  P.rect(x, y, W, cy - y, { fill: 'none', stroke: PSC.ink, w: 0.3, layer: 'SET' });
  return cy;
}
function psHead(P, x, y, w, t, o = {}) { const h = o.h || 6; P.rect(x, y, w, h, { fill: PSC.head, stroke: 'none', layer: 'SET' }); P.rect(x, y, 1.4, h, { fill: PSC.accent, stroke: 'none', layer: 'SET' }); psT(P, x + 3.4, y + h / 2, t, o.fs || 3, { bold: true, color: '#ffffff', maxW: w - 6 }); return y + h; }
function psDot(P, x, y, color) { P.rect(x - 0.7, y - 0.7, 1.4, 1.4, { fill: color || PSC.accent, stroke: 'none', layer: 'SET' }); } // a bullet (the ■ glyph is not in the PDF font)
function psCaption(P, cx, y, t, sub) { psT(P, cx, y, t, 3.3, { anchor: 'middle', bold: true, underline: true }); if (sub) psT(P, cx, y + 4, sub, 2, { anchor: 'middle', color: PSC.ink3 }); }
function psBox(P, b, o = {}) { P.rect(b.x, b.y, b.w, b.h, { fill: o.fill || 'none', stroke: o.stroke || PSC.hair, w: o.w ?? 0.2, layer: 'SET' }); }
// a drawing from the A1 engine, drawn PS_K× bigger and scaled into the box (clipped to it)
let psClipN = 0;
function psEmbed(pg, b, draw, o = {}) {
  const K = o.k || PS_K; const Ps = new Prims(); let r = null;
  try { r = draw(Ps, { x: 0, y: 0, w: b.w * K, h: b.h * K }); } catch (e) { console.error(e); psT(pg.P, b.x + b.w / 2, b.y + b.h / 2, 'Drawing not available — ' + e.message, 2.4, { anchor: 'middle', color: PSC.fail, maxW: b.w - 6 }); return null; }
  const inner = toSVG(Ps, { viewBox: [0, 0, b.w * K, b.h * K] }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const id = 'psc' + (++psClipN);
  pg.extra.push(`<clipPath id="${id}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/></clipPath><g clip-path="url(#${id})"><g transform="translate(${b.x} ${b.y}) scale(${1 / K})">${inner}</g></g>`);
  return r;
}
function psPageSVG(pg) { return toSVG(pg.P, { viewBox: [0, 0, PS.W, PS.H], width: PS.W + 'mm', height: PS.H + 'mm' }).replace(/<\/svg>\s*$/, pg.extra.join('\n') + '\n</svg>'); }

// ---------- symbols (also used in the legend) ----------
function psReaction(P, x, y, r, col = PSC.red) { // a load reaction / lifting point: quartered circle
  P.circle(x, y, r, { fill: '#ffffff', stroke: col, w: 0.25, layer: 'SET' });
  for (const a0 of [0, 180]) { const pts = [[x, y]]; for (let a = a0; a <= a0 + 90; a += 15) pts.push([x + r * Math.cos(a * D2R), y - r * Math.sin(a * D2R)]); P.poly(pts, { closed: true, fill: col, stroke: 'none', layer: 'SET' }); }
  P.line(x - r * 1.4, y, x + r * 1.4, y, { stroke: col, w: 0.14, layer: 'SET' }); P.line(x, y - r * 1.4, x, y + r * 1.4, { stroke: col, w: 0.14, layer: 'SET' });
}
function psSlew(P, x, y, r) { P.circle(x, y, r, { fill: '#ffffff', stroke: PSC.ink, w: 0.25, layer: 'SET' }); P.line(x - r * 1.5, y, x + r * 1.5, y, { stroke: PSC.ink, w: 0.15, layer: 'SET' }); P.line(x, y - r * 1.5, x, y + r * 1.5, { stroke: PSC.ink, w: 0.15, layer: 'SET' }); P.circle(x, y, r * 0.35, { fill: PSC.ink, stroke: 'none', layer: 'SET' }); }
function psMat(P, x, y, s, label) { P.rect(x - s / 2, y - s / 2, s, s, { fill: '#e8c9a0', stroke: '#7c4a1e', w: 0.25, layer: 'SET' }); P.rect(x - s * 0.18, y - s * 0.18, s * 0.36, s * 0.36, { fill: '#9ca3af', stroke: '#374151', w: 0.2, layer: 'SET' }); if (label) psT(P, x, y, label, Math.max(1.4, s * 0.16), { anchor: 'middle', bold: true }); }

// ---------- what each lift / crane is ----------
function psLift(plan, calc, li) {
  const res = calc.loads[li], load = plan.loads[li], crane = res.crane || calc.crane, pv = rigOf(plan, res.rigI ?? 0);
  const ch = res.chartDef || crane.charts?.[pv.chartIdx ?? 0] || null; const parsed = ch ? getChart(ch) : null;
  const cwt = num(pv.cwt !== '' && pv.cwt != null ? pv.cwt : (ch?.cwt ?? crane.cwt));
  const O = (calc.outrigs || []).find(o => o.rigI === res.rigI) || null;
  return { li, res, load, crane, pv, ch, parsed, cwt, O, name: load.name || `Lift ${li + 1}`, model: `${crane.make || ''} ${pv.modelTxt || crane.model}`.trim() };
}
function psBoomTxt(L) { const r = L.res, g = r.geo || {}; return g.kind && g.kind !== 'main' ? `${psN(g.Lb, 1)} + ${psN(g.Lj, 1)}` : psN(r.tele?.L ?? g.L, 1); }

// ---------- the frame and the title column (drawn last, once the number of sheets is known) ----------
function psFrame(pg, X, n, N) {
  const P = pg.P, { plan, S, calc } = X; const m = plan.meta || {}; const x = PS.tx, w = PS.tb;
  P.rect(PS.m, PS.m, PS.W - 2 * PS.m, PS.H - 2 * PS.m, { fill: 'none', stroke: PSC.ink, w: 0.6, layer: 'SET' });
  P.line(x, PS.m, x, PS.y1, { stroke: PSC.ink, w: 0.5, layer: 'SET' });
  psT(P, PS.W / 2, PS.H - 3.6, String(S.copyright || '').toUpperCase(), 1.55, { anchor: 'middle', color: PSC.ink3, maxW: PS.W - 30 });
  psT(P, PS.m, 4.6, `${S.company || 'FRIENDSHIP HALL EST'} · LIFT PLAN SET`, 1.9, { bold: true, color: PSC.ink3 }); psT(P, PS.x1, 4.6, `SHEET ${n} OF ${N}`, 1.9, { anchor: 'end', bold: true, color: PSC.ink3 });
  let y = PS.m;
  // company band
  const bh = 21; P.rect(x, y, w, bh, { fill: PSC.head, stroke: 'none', layer: 'SET' }); P.rect(x, y + bh - 1.2, w, 1.2, { fill: PSC.accent, stroke: 'none', layer: 'SET' });
  P.rect(x + 3, y + 3, 15, 15, { fill: '#ffffff', stroke: 'none', layer: 'SET' });
  if (S.logoImg) P.image(x + 3.5, y + 3.5, 14, 14, S.logoImg, { layer: 'SET' }); else { P.circle(x + 10.5, y + 10.5, 6, { fill: 'none', stroke: COL.red, w: 0.6, layer: 'SET' }); psT(P, x + 10.5, y + 10.5, S.logoText || 'FHE', 3.2, { anchor: 'middle', bold: true, color: COL.red }); }
  psT(P, x + 21, y + 6.5, S.company || 'FRIENDSHIP HALL EST', 3.2, { bold: true, color: '#ffffff', maxW: w - 23 });
  psT(P, x + 21, y + 10.8, 'CRANE HIRE · LIFTING · HEAVY HAUL', 1.75, { color: PSC.accent, bold: true, maxW: w - 23 });
  (S.companyLines || []).slice(0, 2).forEach((l, i) => psT(P, x + 21, y + 14.2 + i * 2.6, l, 1.55, { color: '#cbd5e1', maxW: w - 23 }));
  y += bh;
  // the bottom blocks are fixed; notes take what is left
  const sub = (yy, lab) => psT(P, x + 1.6, yy + 2, lab, 1.55, { bold: true, color: PSC.ink3 });
  const yB = PS.y1 - 87.9; // revisions 14.2 + project 8.5 + client 11 + contractors 16 + title 17 + status 6.2 + grid 15
  // notes
  sub(y, 'NOTES'); let ny = y + 4.4;
  const notes = X.notes; let k = 0;
  for (const t of notes) { if (ny > yB - 90) break; const h = psWrap(P, x + 5, ny, t, 1.75, w - 7, { max: 3, color: PSC.ink }); psT(P, x + 1.8, ny + 1.1, `${++k}.`, 1.75, { bold: true }); ny += h + 0.6; }
  // legend
  let ly = ny + 2; P.line(x, ly, x + w, ly, { stroke: PSC.line, w: 0.2, layer: 'SET' }); sub(ly, 'LEGEND'); ly += 5.2;
  const leg = [['CENTRE OF GRAVITY', (cx, cy) => cogSymbol(P, cx, cy, 1.6, 'SET')], ['REACTION / LIFTING POINT', (cx, cy) => psReaction(P, cx, cy, 1.6)], ['CRANE SLEW CENTRE', (cx, cy) => psSlew(P, cx, cy, 1.3)],
    ['OUTRIGGER PAD ON MAT', (cx, cy) => psMat(P, cx, cy, 3.4)], ['WORKING RADIUS', (cx, cy) => P.line(cx - 3, cy, cx + 3, cy, { stroke: COL.red, w: 0.3, dash: true, layer: 'SET' })],
    ['DIMENSION (mm)', (cx, cy) => { P.line(cx - 3.2, cy, cx + 3.2, cy, { stroke: COL.red, w: 0.15, layer: 'SET' }); arrow(P, cx + 3.2, cy, 0, { stroke: COL.red, al: 1, aw: 0.35 }); arrow(P, cx - 3.2, cy, Math.PI, { stroke: COL.red, al: 1, aw: 0.35 }); psT(P, cx, cy - 1.3, '1000', 1.2, { anchor: 'middle', color: COL.green }); }]];
  leg.forEach(([t, f], i) => { const cx = x + 6, cy = ly + i * 5.4; f(cx, cy); psT(P, x + 12, cy, t, 1.8, { maxW: w - 14 }); });
  ly += leg.length * 5.4 - 1;
  // references
  P.line(x, ly, x + w, ly, { stroke: PSC.line, w: 0.2, layer: 'SET' }); sub(ly, 'REFERENCES'); let ry = ly + 4.2;
  X.refs.slice(0, 5).forEach((t, i) => { if (ry > yB - 2) return; psT(P, x + 1.8, ry + 1.1, `${i + 1}.`, 1.6, { bold: true }); ry += psWrap(P, x + 5, ry, t, 1.6, w - 7, { max: 2 }) + 0.3; });
  // key plan: the site at a glance, in whatever room is left
  const kh = yB - ry - 6; if (kh > 26 && X.keyPlan !== false) { P.line(x, ry + 1, x + w, ry + 1, { stroke: PSC.line, w: 0.2, layer: 'SET' }); sub(ry + 1, 'KEY PLAN'); const kb = { x: x + 2, y: ry + 5, w: w - 4, h: kh };
    psEmbed(pg, kb, (Ps, b) => drawSitePlan(Ps, b, plan, calc, { labels: false, sideTag: false }), { k: 3 }); P.rect(kb.x, kb.y, kb.w, kb.h, { fill: 'none', stroke: PSC.hair, w: 0.2, layer: 'SET' });
    const nx = kb.x + kb.w - 5, ny = kb.y + 6; P.poly([[nx, ny - 3.6], [nx + 1.5, ny + 1.6], [nx, ny + 0.8], [nx - 1.5, ny + 1.6]], { closed: true, fill: PSC.ink, stroke: 'none', layer: 'SET' }); psT(P, nx, ny - 5, 'N', 1.8, { anchor: 'middle', bold: true }); }
  // revisions
  y = yB; P.line(x, y, x + w, y, { stroke: PSC.ink, w: 0.3, layer: 'SET' });
  const revs = (m.revs || []).slice(-3); const rows = [...Array(3 - revs.length).fill(null), ...revs].map(rv => rv ? [rv.rev || '', rv.date || '', { t: String(rv.desc || '').toUpperCase() }, m.drawnBy || '', m.checkedBy || '', ''] : ['', '', '', '', '', '']);
  y = psTable(P, x, y, [{ w: 6, t: 'REV', a: 'c' }, { w: 13, t: 'DATE', a: 'c' }, { w: 28, t: 'DESCRIPTION', a: 'l' }, { w: 9, t: 'DRN', a: 'c' }, { w: 9, t: 'CHK', a: 'c' }, { w: 9, t: 'APP', a: 'c' }], rows, { rh: 3.6, fs: 1.6, hh: 3.4, zebra: false });
  const blk = (lab, val, h, size, o = {}) => { P.rect(x, y, w, h, { fill: o.fill || '#ffffff', stroke: PSC.line, w: 0.15, layer: 'SET' }); psT(P, x + 1.5, y + 2, lab, 1.45, { bold: true, color: PSC.ink3 }); psT(P, x + (o.left ? 2 : w / 2), y + h / 2 + 1.2, String(val || '—').toUpperCase(), size, { anchor: o.left ? 'start' : 'middle', bold: true, maxW: w - 4, color: o.color }); y += h; };
  blk('PROJECT', m.project || plan.name, 8.5, 2.6);
  blk('CLIENT', m.client, 11, 5.6);
  blk('MAIN CONTRACTOR', m.contractor, 8, 3.2);
  blk('SUB CONTRACTOR', m.subcontractor, 8, 3.2);
  // drawing title + this sheet
  P.rect(x, y, w, 17, { fill: '#ffffff', stroke: PSC.line, w: 0.15, layer: 'SET' }); psT(P, x + 1.5, y + 2, 'DRAWING TITLE', 1.45, { bold: true, color: PSC.ink3 });
  psT(P, x + w / 2, y + 7, String(m.title || plan.name || 'LIFTING PLAN').toUpperCase(), 3.2, { anchor: 'middle', bold: true, maxW: w - 4 });
  psT(P, x + w / 2, y + 12.6, pg.title, 2.5, { anchor: 'middle', bold: true, color: PSC.blue, maxW: w - 4 }); y += 17;
  // status
  const [sc, sb] = psSt(calc.status); const stT = calc.status === 'fail' ? 'STATUS: DO NOT LIFT AS PLANNED' : calc.status === 'warn' ? 'STATUS: CRITICAL — AP TO APPROVE' : 'STATUS: ALL CHECKS PASS';
  P.rect(x, y, w, 6.2, { fill: sb, stroke: sc, w: 0.3, layer: 'SET' }); P.rect(x, y, 1.6, 6.2, { fill: sc, stroke: 'none', layer: 'SET' }); psT(P, x + w / 2 + 0.8, y + 3.1, stT, 2.2, { anchor: 'middle', bold: true, color: sc, maxW: w - 5 }); y += 6.2;
  // scale / date / sheet / size, then drawn / checked / drawing no
  const grid = (cells, h) => { let cx = x; for (const [lab, val, cw] of cells) { P.rect(cx, y, cw, h, { fill: '#ffffff', stroke: PSC.line, w: 0.15, layer: 'SET' }); psT(P, cx + cw / 2, y + 1.9, lab, 1.4, { anchor: 'middle', bold: true, color: PSC.ink3 }); psT(P, cx + cw / 2, y + h / 2 + 1.3, String(val ?? '—').toUpperCase(), 2.2, { anchor: 'middle', bold: true, maxW: cw - 2 }); cx += cw; } y += h; };
  grid([['SCALE', pg.scale || 'AS SHOWN', 20], ['DATE', m.date || '', 20], ['SHEET No.', `${n} / ${N}`, 18], ['SIZE', 'A3', 16]], 7.5);
  grid([['DRAWN', m.drawnBy || '', 25], ['CHECKED (AP)', m.checkedBy || '', 25], ['DRAWING No.', `${X.docNo}-${String(n).padStart(2, '0')}`, 24]], 7.5);
}

// ---------- page: cover & document control ----------
function psCover(pg, X) {
  const { plan, calc, S } = X; const P = pg.P, m = plan.meta || {}; const D = PS_DA; const L = X.lifts[X.li0];
  const r = L.res; const T = r.tandem;
  // banner
  P.rect(D.x, D.y, D.w, 40, { fill: PSC.head, stroke: 'none', layer: 'SET' }); P.rect(D.x, D.y + 40, D.w, 1.6, { fill: PSC.accent, stroke: 'none', layer: 'SET' });
  psT(P, D.x + 8, D.y + 13, 'LIFTING PLAN', 12, { bold: true, color: '#ffffff' });
  psT(P, D.x + 8, D.y + 24, String(m.title || plan.name || '').toUpperCase(), 5, { bold: true, color: PSC.accent, maxW: 200 });
  psT(P, D.x + 8, D.y + 32.5, [m.project, m.client].filter(Boolean).join('  ·  ').toUpperCase() || 'PROJECT DETAILS TO BE ADDED', 3, { color: '#cbd5e1', maxW: 200, bold: true });
  const chip = (cx, lab, val) => { P.rect(cx, D.y + 9, 36, 20, { fill: '#1f2f52', stroke: '#33476f', w: 0.3, layer: 'SET' }); psT(P, cx + 18, D.y + 14, lab, 1.9, { anchor: 'middle', bold: true, color: '#94a3b8' }); psT(P, cx + 18, D.y + 21.5, val, 4.2, { anchor: 'middle', bold: true, color: '#ffffff', maxW: 33 }); };
  chip(D.x + D.w - 118, 'DOCUMENT', X.docNo); chip(D.x + D.w - 79, 'REVISION', (m.revs || []).length ? m.revs[m.revs.length - 1].rev : '0'); chip(D.x + D.w - 40, 'SHEETS', String(X.N));
  // hero: the 3D still, else the elevation
  const hb = { x: D.x, y: D.y + 46, w: 214, h: 128 };
  if (X.shot) { P.rect(hb.x, hb.y, hb.w, hb.h, { fill: '#18212b', stroke: 'none', layer: 'SET' }); P.image(hb.x, hb.y, hb.w, hb.h, X.shot, { fit: 'slice', clip: [hb.x, hb.y, hb.w, hb.h], layer: 'SET' }); }
  else { P.rect(hb.x, hb.y, hb.w, hb.h, { fill: '#ffffff', stroke: 'none', layer: 'SET' }); psEmbed(pg, hb, (Ps, b) => (T ? drawTandemElevation(Ps, b, plan, calc, L.li, { title: false, livery: X.livery }) : drawElevation(Ps, b, plan, calc, L.li, { title: false, livery: X.livery, mainLabel: L.ch?.mainLabel, sideGlyph: false }))); }
  psBox(P, hb, { stroke: PSC.ink, w: 0.3 });
  P.rect(hb.x, hb.y + hb.h - 9, hb.w, 9, { fill: PSC.head, stroke: 'none', layer: 'SET' });
  psT(P, hb.x + 4, hb.y + hb.h - 4.5, `${L.model.toUpperCase()}${T ? ` + ${T.picks.length - 1} MORE (TANDEM)` : ''}  ·  ${String(L.name).toUpperCase()}  ·  ${psN(r.W, 2)} t AT ${psN(r.R, 1)} m OVER THE ${SIDE_NAME[sideOf(L.load)]}`, 2.6, { bold: true, color: '#ffffff', maxW: hb.w - 8 });
  // verdict + key figures
  const kx = hb.x + hb.w + 4, kw = D.x + D.w - kx; let ky = hb.y;
  const [vc, vb] = psSt(calc.status);
  P.rect(kx, ky, kw, 16, { fill: vb, stroke: vc, w: 0.4, layer: 'SET' }); P.rect(kx, ky, 2, 16, { fill: vc, stroke: 'none', layer: 'SET' });
  psT(P, kx + 5, ky + 5.6, calc.status === 'fail' ? 'DO NOT LIFT AS PLANNED' : calc.status === 'warn' ? 'CRITICAL LIFT — AP TO APPROVE' : 'SAFE TO LIFT AS PLANNED', 3.6, { bold: true, color: vc, maxW: kw - 8 });
  psT(P, kx + 5, ky + 11.4, calc.status === 'fail' ? 'Fix every red item on the checklist sheet first.' : calc.status === 'warn' ? 'Amber items need a named control and the Appointed Person\'s signature.' : 'Every check passes. Brief the team and follow the method statement.', 2, { color: PSC.ink, maxW: kw - 8 });
  ky += 19;
  const g = X.ground(L); const util = T ? T.maxUtil : r.util; const uLim = T ? T.derate : num(S.utilMax, 90);
  const tiles = [['LOAD WEIGHT', psN(T ? num(L.load.w) : r.W, 2), 't'], ['TOTAL ON HOOK' + (r.daf ? ' × DAF' : ''), psN(T ? Math.max(...T.picks.map(q => q.design)) : r.design, 2), 't'], ['WORKING RADIUS', psN(r.R, 1), 'm'], ['BOOM · ANGLE', `${psBoomTxt(L)} · ${psN(r.geo?.theta, 1)}°`, 'm · °'],
    ['CHART CAPACITY', psN(r.cap, 2), 't'], [T ? 'BUSIEST CRANE' : 'UTILISATION', util != null ? psN(util, 1) : '—', '%', util == null || util > uLim ? 'fail' : util > (T ? uLim * 0.9 : num(S.utilWarn, 75)) ? 'warn' : 'ok'],
    ['BUSIEST LEG', g ? psN(g.P, 1) : L.O ? psN(L.O.Pmax.v, 1) : '—', 't'], ['GROUND PRESSURE', g ? psN(g.press, 1) : '—', 't/m²', g?.allow ? g.status : g?.surface?.struct ? 'fail' : null]];
  const tw = (kw - 3) / 2, th = 17.6;
  tiles.forEach(([lab, val, unit, st], i) => { const tx = kx + (i % 2) * (tw + 3), ty = ky + Math.floor(i / 2) * (th + 2.4); const [c, b] = st ? psSt(st) : [PSC.ink, PSC.soft];
    P.rect(tx, ty, tw, th, { fill: st ? b : PSC.soft, stroke: st ? c : PSC.hair, w: 0.25, layer: 'SET' }); psT(P, tx + 2.5, ty + 3.6, lab, 1.85, { bold: true, color: PSC.ink3, maxW: tw - 5 });
    psT(P, tx + 2.5, ty + 10.8, val, 6, { bold: true, color: st ? c : PSC.ink, maxW: tw - 12 }); psT(P, tx + tw - 2.5, ty + 12.5, unit, 2.4, { anchor: 'end', bold: true, color: PSC.ink3 }); });
  // drawing register
  const y2 = hb.y + hb.h + 6; const reg = X.register;
  const regRows = reg.map((p, i) => [String(i + 1).padStart(2, '0'), `${X.docNo}-${String(i + 1).padStart(2, '0')}`, { t: p.title, bold: i === 0 }, (m.revs || []).length ? m.revs[m.revs.length - 1].rev : '0']);
  const rhR = Math.max(3.6, Math.min(5, (PS_DA.y + PS_DA.h - y2 - 13) / Math.max(1, reg.length)));
  psTable(P, D.x, y2, [{ w: 11, t: 'SHEET', a: 'c' }, { w: 26, t: 'DRAWING No.', a: 'c' }, { w: 108, t: 'TITLE', a: 'l' }, { w: 11, t: 'REV', a: 'c' }], regRows, { title: 'DRAWING REGISTER', rh: rhR, fs: 2.15, hh: 4.4 });
  // lift summary + approval
  const sx = D.x + 160, sw = D.x + D.w - sx;
  const site = plan.weather?.place || (plan.env || []).find(e => e.geo)?.geo?.place || '';
  const cr = T ? T.picks.map(q => `C${q.crane + 1} ${q.model}`).join(' + ') : L.model;
  let sy = psTable(P, sx, y2, [{ w: 34, a: 'l' }, { w: sw - 34, a: 'l' }], [
    [{ t: 'CLIENT', bold: true, color: PSC.ink3 }, { t: String(m.client || '—').toUpperCase(), bold: true }], [{ t: 'PROJECT', bold: true, color: PSC.ink3 }, String(m.project || plan.name || '—').toUpperCase()],
    [{ t: 'LOCATION', bold: true, color: PSC.ink3 }, String(site || '—').toUpperCase()], [{ t: 'CRANE(S)', bold: true, color: PSC.ink3 }, cr.toUpperCase()],
    [{ t: 'LIFT CATEGORY', bold: true, color: PSC.ink3 }, String(L.load.liftType || (T ? 'TANDEM' : calc.status === 'warn' ? 'CRITICAL' : 'ROUTINE')).toUpperCase()], [{ t: 'LIFTS IN THIS PLAN', bold: true, color: PSC.ink3 }, plan.loads.map((l, i) => l.name || `Lift ${i + 1}`).join(' · ').toUpperCase()],
    [{ t: 'DATE / WINDOW', bold: true, color: PSC.ink3 }, `${m.date || '—'}${plan.weather?.start ? ' · ' + plan.weather.start + (plan.weather.hours ? ' +' + plan.weather.hours + ' h' : '') : ''}`]], { title: 'LIFT SUMMARY', rh: 4.6, fs: 2.2 });
  sy += 3;
  psTable(P, sx, sy, [{ w: 30, t: 'ROLE', a: 'l' }, { w: 34, t: 'NAME', a: 'l' }, { w: sw - 30 - 34 - 22, t: 'SIGNATURE', a: 'l' }, { w: 22, t: 'DATE', a: 'c' }],
    [[{ t: 'PREPARED BY', bold: true }, String(m.drawnBy || '').toUpperCase(), '', ''], [{ t: 'CHECKED BY (AP)', bold: true }, String(m.checkedBy || '').toUpperCase(), '', ''], [{ t: 'APPROVED BY', bold: true }, '', '', ''], [{ t: 'CLIENT ACCEPTANCE', bold: true }, '', '', '']].map(c => ({ cells: c, h: 6.2 })),
    { title: 'DOCUMENT APPROVAL', rh: 6, fs: 2.1, hh: 4.2, zebra: false });
}

// ---------- page: general arrangement (one per lift) ----------
function psMainData(L, X) {
  const { plan, calc, S } = X; const r = L.res, g = r.geo || {}, crane = L.crane, pv = L.pv, ch = L.ch; const at = pv.attach || {}; const acc = r.acc || {};
  const daf = r.daf || 1; const spn = L.O?.spans; const cap = r.cap;
  const uCol = r.util == null ? PSC.fail : r.util > num(S.utilMax, 90) ? PSC.fail : r.util > num(S.utilWarn, 75) ? PSC.warn : PSC.ok;
  const rows = [
    ['CRANE MODEL', L.model.toUpperCase(), '-'], ['CRANE RATED CAPACITY', psN(num(crane.cls), 0), 'Tons'], ['CRANE TYPE', String(crane.type || 'MOBILE').toUpperCase(), '-'], ['COMBINATION', String(pv.config ?? ch?.config ?? '-').toUpperCase() || '-', '-'],
    ['MAIN BOOM', psN(g.kind && g.kind !== 'main' ? g.Lb : (r.tele?.L ?? g.L), 2), 'm'], ['JIB', g.kind && g.kind !== 'main' ? psN(g.Lj, 2) : 'NA', 'm'],
    ['BOOM COMBINATION (TELESCOPING)', r.tele?.fr?.length ? r.tele.fr.map(f => Math.round(f * 100)).join('-') : '-', '%'], ['SUPPORT (OUTRIGGER SPREAD)', spn ? `${psN(spn.long, 2)} × ${psN(spn.yL + spn.yR, 2)}` : String(pv.outriggerTxt || ch?.outrigger || crane.outrigger || '-'), 'm'],
    ['COUNTER WT.', psN(L.cwt, 1), 'Tons'], ['SL C/WT.', acc.superlift ? psN(num(acc.slBallast), 1) : 'NA', 'Tons'], ['SINGLE LINE PULL CAPACITY', r.linePull ? psN(r.linePull, 1) : 'NA', 'Tons'], ['WIRE ROPE DIAMETER', r.ropeDia ? psN(r.ropeDia, 0) : 'NA', 'mm'],
    ['NUMBER OF FALLS', r.ropeInfo?.falls || 'NA', '-'], ['CHART ALLOWABLE WIND SPEED', psN(windTabOf(plan), 1), 'm/s'], [g.kind === 'luffing' ? 'JIB ANGLE @ RADIUS' : 'MAIN BOOM ANGLE @ RADIUS', psN(g.kind === 'luffing' ? g.gamma : g.theta, 1), '°'],
    ['SL RADIUS', acc.superlift ? psN(num(acc.slRadius), 1) : 'NA', 'm'], ['WORKING RADIUS', psN(r.R, 2), 'm'], ['LIFT SIDE', 'OVER ' + SIDE_NAME[sideOf(L.load)], '-'],
    ...(r.tandem ? [['CONTINGENCY FACTOR', L.load.contOn !== false ? psN(num(L.load.cont), 1) : '0', '%'], ['DYNAMIC AMPLIFICATION FACTOR (D.A.F)', r.daf ? psN((daf - 1) * 100, 1) : '0', '%'],
      ['WEIGHT OF LIFTED ITEM (WHOLE LOAD)', psKg(num(L.load.w)), 'Kgs'], ['SHARE ON THIS CRANE (WITH CONTINGENCY)', psKg(r.W), 'Kgs']]
      : [['CONTINGENCY FACTOR', r.contOn ? psN(r.cont, 1) : '0', '%'], ['DYNAMIC AMPLIFICATION FACTOR (D.A.F)', r.daf ? psN((daf - 1) * 100, 1) : '0', '%'], ['WEIGHT OF LIFTED ITEM', psKg(r.W), 'Kgs'], ['WEIGHT OF CONTINGENCY', psKg(r.contW), 'Kgs']]),
    ['WEIGHT OF RIGGING', psKg(r.tk), 'Kgs'], ['WEIGHT OF HOOK BLOCK', psKg(r.hb), 'Kgs'],
    ...(r.ex ? [['OTHER DEDUCTIONS', psKg(r.ex), 'Kgs']] : []), ...(r.jd ? [['FOLDED JIB (DEDUCTION)', psKg(r.jd), 'Kgs']] : []), ...(r.rope ? [['HOIST ROPE (DEDUCTION)', psKg(r.rope), 'Kgs']] : []),
    [{ t: 'WEIGHT OF TOTAL LOAD', bold: true }, { t: psKg(r.total), bold: true }, 'Kgs'], [{ t: 'WEIGHT OF TOTAL LOAD × D.A.F', bold: true }, { t: psKg(r.design), bold: true }, 'Kgs'],
    [{ t: 'CRANE CAPACITY @ RADIUS', bold: true }, { t: psKg(cap), bold: true }, 'Kgs'], [{ t: '% CRANE CAPACITY @ RADIUS', bold: true }, { t: r.util != null ? psN(r.util, 2) : '—', bold: true, color: uCol }, '%'],
    ['REEVING CAPACITY', r.reeve ? psKg(r.reeve) : 'NA', 'Kgs'], ['PERCENTAGE OF REEVING CAPACITY', r.reeveUtil != null ? psN(r.reeveUtil, 2) : 'NA', '%'],
    ['BOOM TIP HEIGHT', psN(r.tipY, 2), 'm'], ['CLEARANCE BOOM TO OBSTRUCTION', r.clearance != null ? psN(r.clearance, 2) : 'NA', 'm']
  ];
  if (calc.ground && L.O && calc.outr === L.O) rows.push(['MAX. OUTRIGGER LOAD', psN(calc.ground.P, 2), 'Tons'], ['PRESSURE UNDER MAT', psN(calc.ground.press, 2), 't/m²']);
  else if (L.O) rows.push(['MAX. OUTRIGGER LOAD (MODEL)', psN(L.O.Pmax.v, 2), 'Tons']);
  if (r.tandem) { const q = r.tandem.picks[0]; rows.push([{ t: 'TANDEM — SHARE OF THIS CRANE', bold: true }, { t: `${psKg(q.share)} (${Math.round(q.pct)}%)`, bold: true }, 'Kgs'], ['TANDEM LIMIT PER CRANE', psN(r.tandem.derate, 0), '%']); }
  return rows;
}
function psCallout(P, x, y, tx, ty, lines, o = {}) { // a boxed label with a leader to the point it names (demo style)
  const fs = o.fs || 1.9, w = Math.max(...lines.map(l => textW(l, fs, true))) + 3, h = lines.length * fs * 1.3 + 1.8; const bx = tx - (o.right ? 0 : w), by = ty - h / 2;
  P.line(x, y, o.right ? bx : bx + w, ty, { stroke: PSC.blue, w: 0.2, layer: 'SET' }); P.circle(x, y, 0.45, { fill: PSC.blue, stroke: 'none', layer: 'SET' });
  P.rect(bx, by, w, h, { fill: '#ffffff', stroke: PSC.blue, w: 0.25, layer: 'SET' }); lines.forEach((l, i) => psT(P, bx + w / 2, by + 0.9 + fs * 0.65 + i * fs * 1.3, l, fs, { anchor: 'middle', bold: true, color: PSC.blue }));
}
function psSupport(P, b, L, X, o = {}) { // crane support locations: the crane from above (front up the page), mats, spreads, set-out, leg loads
  const { plan } = X; const crane = L.crane, O = L.O; const ext = O ? O.ext : outExtOf(L.pv);
  const pads = O ? O.pads : outPads(crane, ext); const g = X.ground(L);
  const mat = outMatDims(plan.outrigger?.mat || plan.matSize) || [1, 1]; const Lc = num(crane.carrierLen, 12), Wc = num(crane.width, 2.75);
  const xs = [...pads.map(p => p.x), 0.64 * Lc + 2, -0.36 * Lc - 1.5], ys = pads.map(p => p.y);
  const spanL = Math.max(...xs) - Math.min(...xs) + mat[1] + 2, spanW = Math.max(...ys) - Math.min(...ys) + mat[0] + 2;
  const top = o.top ?? 26; const k = Math.min((b.w - 34) / spanW, (b.h - top - 14) / spanL); const cx = b.x + b.w / 2 - 2, cy = b.y + top / 2 + b.h / 2 - 4;
  const xm = (Math.max(...xs) + Math.min(...xs)) / 2, ym = (Math.max(...ys) + Math.min(...ys)) / 2;
  const S2 = (px, py) => [cx - (py - ym) * k, cy - (px - xm) * k];                     // carrier frame: +x (cab) up the page, the carrier's left to the left
  const Tw = (xw, yw) => [cx + (xw + ym) * k, cy - (yw - xm) * k];                      // world frame with the carrier facing north (90°)
  const side = sideOf(L.load); const boomDeg = normDeg(90 + SIDE_OFFSET[side]);
  drawCraneFootprint(P, Tw, k, crane, { cx: 0, cy: 0, carrier: 90, boom: boomDeg }, num(L.res?.R, 10), 0, '', ext, { res: L.res, mat, bare: true, stub: side === 'rear' ? 0.36 * Lc + 1.6 : Wc / 2 + 2.2 });
  for (const p of pads) { const c = S2(p.x, p.y); const mh = mat[1] * k; const v = O ? O.used[p.id] : null; const fr0 = p.x > 0; // labels in the gap between the front and rear pads
    const ty = fr0 ? c[1] + mh / 2 + 2.6 : c[1] - mh / 2 - 2.4 - (o.press ? 5.4 : 2.8);
    psT(P, c[0], ty, `${p.id}${p.ext === 'half' ? ' · HALF' : ''}${v != null ? ' · ' + psN(v, 1) + ' t' + (O.manual[p.id] != null ? ' *' : '') : ''}`, 2.1, { anchor: 'middle', bold: true, color: v != null ? PSC.red : PSC.ink, bg: '#ffffff' });
    if (g?.pads?.[p.id] != null && o.press) psT(P, c[0], ty + 2.7, `${psN(g.pads[p.id], 1)} t/m² ON THE GROUND`, 1.6, { anchor: 'middle', color: PSC.ink2, bg: '#ffffff' });
    psReaction(P, c[0], c[1], Math.max(0.9, Math.min(1.6, 0.35 * k))); }
  const fr = pads.find(q => q.id === 'FR'), rr = pads.find(q => q.id === 'RR'), fl = pads.find(q => q.id === 'FL'), rl = pads.find(q => q.id === 'RL');
  const offR = Math.max(9, mat[0] * k / 2 + 9);
  if (fr && rr) { const a = S2(rr.x, rr.y), c = S2(fr.x, fr.y); dimA(P, a, c, offR, String(mm(fr.x - rr.x)), { side: 'right', size: 2.2 });
    const o0 = S2(0, rr.y); dimA(P, a, o0, offR - 4.5, String(mm(0 - rr.x)), { side: 'right', size: 1.9 }); dimA(P, o0, c, offR - 4.5, String(mm(fr.x)), { side: 'right', size: 1.9 }); }
  if (rl && rr) { const a = S2(rl.x, rl.y), c = S2(rr.x, rr.y); dimA(P, a, c, Math.max(6, mat[1] * k / 2 + 6, (rr.x + 0.36 * Lc) * k + 5), String(mm(rl.y - rr.y)), { side: 'down', size: 2.2 }); }
  if (fl) { const c = S2(fl.x, fl.y), mw = mat[0] * k, mh = mat[1] * k; dimA(P, [c[0] - mw / 2, c[1] - mh / 2], [c[0] + mw / 2, c[1] - mh / 2], 2.6, String(mm(mat[0])), { side: 'up', size: 1.8 }); }
  if (fr) { const c = S2(fr.x, fr.y); psCallout(P, c[0] + mat[0] * k / 2 - 0.5, c[1] - mat[1] * k / 2 + 0.5, Math.min(b.x + b.w - 2, c[0] + mat[0] * k / 2 + 20), c[1] - mat[1] * k / 2 - 8, ['CRANE MAT (TYP.)', `${mat[0]} × ${mat[1]} m`], { fs: 1.75 }); }
  if (rl) { const c = S2(rl.x, rl.y); psCallout(P, c[0], c[1] + 0.8, Math.max(b.x + 2, c[0] - 6), c[1] + mat[1] * k / 2 + 10, ['OUTRIGGER PAD (TYP.)', g?.surface ? 'ON ' + g.surface.name.toUpperCase() : 'LEVEL, ON THE MAT CENTRE'], { fs: 1.6, right: true }); }
  { const a = S2(0.64 * Lc + 1.2, ym), c = [a[0], a[1] - 6]; P.line(a[0], a[1], c[0], c[1], { stroke: PSC.ink, w: 0.25, layer: 'SET' }); arrow(P, c[0], c[1], -Math.PI / 2, { stroke: PSC.ink, al: 1.6, aw: 0.6, layer: 'SET' }); psT(P, c[0] + 1.2, c[1] + 1, 'FRONT', 1.6, { bold: true, color: PSC.ink2 }); }
  { const sc = S2(0, 0); psCallout(P, sc[0], sc[1], b.x + 3, sc[1] + (side === 'rear' ? 0 : 14), ['SLEW CENTRE', 'SETTING-OUT POINT'], { fs: 1.5, right: true }); }
  psT(P, b.x + 2, b.y + 3, `MATS ${mat[0]} × ${mat[1]} m${plan.outrigger?.matSelf ? ` · ${psN(num(plan.outrigger.matSelf), 2)} t EACH` : ''}`, 1.9, { bold: true, color: '#7c4a1e', maxW: b.w - 4 });
  psT(P, b.x + 2, b.y + 6.2, `BEAMS ${outExtLabel(ext)}${O ? ` · LOADS ${O.basis === 'side' ? 'AT THE LIFT SIDE' : 'OVER A FULL SLEW'}` : ''} · BOOM OVER THE ${SIDE_NAME[side]}`, 1.7, { color: PSC.ink2, maxW: b.w - 4 });
  if (O?.est) psT(P, b.x + 2, b.y + 9, 'LEG LOADS FROM ESTIMATED CRANE WEIGHTS', 1.6, { color: PSC.warn, bold: true, maxW: b.w - 4 });
}
function psIso(P, b, X, L) { // vector isometric — used when there is no 3D still (no WebGL)
  const { plan } = X; const r = L.res, g = r.geo; const crane = L.crane; const sp = sitePlanState(plan, L.load);
  const car = (sp.carrier ?? 0) * D2R, bm = (sp.boom ?? 0) * D2R; const Lc = num(crane.carrierLen, 12), Wc = num(crane.width, 2.75), Hc = num(crane.carrierH, 3.6);
  const pr = (x, y, z) => [(x - y) * 0.866, (x + y) * 0.5 - z];
  const rot = (a) => (u, v) => [u * Math.cos(a) - v * Math.sin(a), u * Math.sin(a) + v * Math.cos(a)];
  const C = rot(car), B = rot(bm); const pts = [];
  const tip = g?.tip ? B(g.tip.x, 0) : B(r.R, 0), tz = g?.tip ? g.tip.y : 20; const ld = B(r.R, 0);
  const all = [[-14, -14, 0], [14, 14, 0], [tip[0], tip[1], tz + 2], [ld[0] - 3, ld[1] - 3, 0], [ld[0] + 3, ld[1] + 3, 0]].map(q => pr(...q));
  const x0 = Math.min(...all.map(q => q[0])), x1 = Math.max(...all.map(q => q[0])), y0 = Math.min(...all.map(q => q[1])), y1 = Math.max(...all.map(q => q[1]));
  const k = Math.min((b.w - 10) / (x1 - x0), (b.h - 10) / (y1 - y0)); const ox = b.x + (b.w - (x1 - x0) * k) / 2, oy = b.y + (b.h - (y1 - y0) * k) / 2;
  const S = (x, y, z) => { const q = pr(x, y, z); return [ox + (q[0] - x0) * k, oy + (q[1] - y0) * k]; };
  for (let i = -6; i <= 6; i++) { const a = S(i * 5, -30, 0), c = S(i * 5, 30, 0), d = S(-30, i * 5, 0), e = S(30, i * 5, 0); P.line(a[0], a[1], c[0], c[1], { stroke: '#e2e8f0', w: 0.15, layer: 'SET' }); P.line(d[0], d[1], e[0], e[1], { stroke: '#e2e8f0', w: 0.15, layer: 'SET' }); }
  const boxF = (u0, u1, v0, v1, z0, z1, f, col) => { const c = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => f(u, v)); const top = c.map(([x, y]) => S(x, y, z1));
    const sides = [[0, 1], [1, 2], [2, 3], [3, 0]].map(([i, j]) => [S(c[i][0], c[i][1], z0), S(c[j][0], c[j][1], z0), S(c[j][0], c[j][1], z1), S(c[i][0], c[i][1], z1)]);
    sides.sort((p, q) => (p[0][1] + p[1][1]) - (q[0][1] + q[1][1])).forEach(s => P.poly(s, { closed: true, fill: shade(col, -18), stroke: '#1f2937', w: 0.15, layer: 'SET' }));
    P.poly(top, { closed: true, fill: col, stroke: '#1f2937', w: 0.15, layer: 'SET' }); };
  const pads = L.O ? L.O.pads : outPads(crane, outExtOf(L.pv));
  for (const p of pads) { const [x, y] = C(p.x, p.y); boxF(-0.9, 0.9, -0.9, 0.9, 0, 0.15, (u, v) => [x + u, y + v], '#e8c9a0'); }
  boxF(-0.36 * Lc, 0.64 * Lc, -Wc / 2, Wc / 2, 0.6, Hc * 0.55, C, '#4ade80');
  boxF(-num(crane.tail, 4), 2.4, -1.4, 1.4, Hc * 0.55, Hc * 0.95, B, '#22c55e');
  const pv = g?.pivot ? B(g.pivot.x, 0) : [0, 0]; const a = S(pv[0], pv[1], g?.pivot?.y ?? Hc), c = S(tip[0], tip[1], tz);
  P.line(a[0], a[1], c[0], c[1], { stroke: '#166534', w: 2.2, layer: 'SET' }); P.line(a[0], a[1], c[0], c[1], { stroke: '#4ade80', w: 1.2, layer: 'SET' });
  const hy = r.hookY ?? tz - 6; const h1 = S(tip[0], tip[1], hy); P.line(c[0], c[1], h1[0], h1[1], { stroke: '#111827', w: 0.2, layer: 'SET' });
  const lL = num(L.load.l, 3) / 2, lH = num(L.load.h, 1.5), ly = r.landY ?? 0;
  boxF(-lL, lL, -lL * 0.5, lL * 0.5, ly, ly + lH, (u, v) => { const q = B(u, v); return [ld[0] + q[0], ld[1] + q[1]]; }, '#cbd5e1');
  psT(P, b.x + 2, b.y + b.h - 2.5, 'Simplified view — the 3D still prints when the PDF is made in the app.', 1.6, { color: PSC.ink3 });
}
function psGA(pg, X, L) {
  const { plan, calc } = X; const P = pg.P; const D = PS_DA; const r = L.res;
  const vx = D.x, vw = 232, rx = D.x + vw + 3, rw = D.x + D.w - rx;
  // right: crane centre coordinates + main crane data
  const N = L.pv.gridN, E = L.pv.gridE;
  let y = psTable(P, rx, D.y, [{ w: rw / 2, t: 'PLANT NORTH', a: 'c' }, { w: rw / 2, t: 'PLANT EAST', a: 'c' }], [[{ t: N !== '' && N != null ? String(N) : '—', bold: true }, { t: E !== '' && E != null ? String(E) : '—', bold: true }]], { title: 'CRANE CENTRE COORDINATES', th: 5.4, tfs: 2.5, rh: 4.6, hh: 3.8, fs: 2.2 });
  const rows = psMainData(L, X); const avail = D.y + D.h - (y + 3) - 6.4 - 4.4; const rh = Math.max(3.4, Math.min(6.2, avail / rows.length));
  psTable(P, rx, y + 3, [{ w: rw - 32, t: 'ITEM', a: 'l' }, { w: 21, t: 'VALUE', a: 'c' }, { w: 11, t: 'UNIT', a: 'c' }], rows.map(rw_ => rw_.map((c, i) => i === 1 && typeof c !== 'object' ? { t: c, bold: true } : c)), { title: r.tandem ? 'MAIN CRANE DATA · LEAD CRANE' : 'MAIN CRANE DATA', th: 6.4, tfs: 3.4, rh, hh: 4.4, fs: Math.min(2.25, rh * 0.5) });
  // views
  const tb = { x: vx, y: D.y, w: 116, h: 128 }, ib = { x: vx + 118, y: D.y, w: vw - 118, h: 128 };
  const eb = { x: vx, y: D.y + 141, w: 148, h: 126 }, sb = { x: vx + 150, y: D.y + 141, w: vw - 150, h: 126 };
  [tb, ib, eb, sb].forEach(b => psBox(P, b));
  const spl = psEmbed(pg, tb, (Ps, bx) => drawSitePlan(Ps, bx, plan, calc, { livery: X.livery, labels: false, ext: sitePlanTightExt(plan, calc, L.li) }));
  psCaption(P, tb.x + tb.w / 2, tb.y + tb.h + 4.5, 'PLAN VIEW', spl?.scale ? `SCALE 1:${spl.scale.N * PS_K} (A3)` : '');
  const shotG = X.shotTall || X.shot;
  if (shotG) { P.rect(ib.x, ib.y, ib.w, ib.h, { fill: '#18212b', stroke: 'none', layer: 'SET' }); P.image(ib.x, ib.y, ib.w, ib.h, shotG, { fit: 'slice', clip: [ib.x, ib.y, ib.w, ib.h], layer: 'SET' }); }
  else psIso(P, ib, X, L);
  psCaption(P, ib.x + ib.w / 2, ib.y + ib.h + 4.5, 'ISOMETRIC VIEW', 'NOT TO SCALE');
  const el = psEmbed(pg, eb, (Ps, bx) => (r.tandem ? drawTandemElevation(Ps, bx, plan, calc, L.li, { title: false, livery: X.livery, padT: 6 }) : drawElevation(Ps, bx, plan, calc, L.li, { title: false, livery: X.livery, mainLabel: L.ch?.mainLabel, padB: 30, hookDim: true })));
  psCaption(P, eb.x + eb.w / 2, eb.y + eb.h + 4.5, r.tandem ? 'ELEVATION ALONG THE LOAD (TANDEM)' : `ELEVATION VIEW @ ${psN(r.R, 1)} m RADIUS`, el?.scale ? `SCALE 1:${el.scale.N * PS_K} (A3)` : '');
  psSupport(P, sb, L, X);
  psCaption(P, sb.x + sb.w / 2, sb.y + sb.h + 4.5, 'CRANE SUPPORT LOCATIONS', 'DIMENSIONS IN mm');
  pg.scale = 'AS SHOWN';
}

// ground bearing for one crane: the plan's ground table when it is that crane's, else worked out the same way from its leg model
function psGroundOf(plan, calc, L) {
  if (calc.ground && (!L.O || calc.outr === L.O)) return calc.ground;
  const O = L.O; if (!O) return null; const op = plan.outrigger || {};
  const [a, b] = String(op.mat || plan.matSize || '1.0x1.0').toLowerCase().replace('m', '').split('x').map(v => num(v, 1));
  const area = r2(a * b), self = num(op.matSelf, 0), eff = Math.max(0.05, Math.min(1, num(op.matEff, 1))), allow = num(op.allow, 0), P = O.Pmax.v;
  const press = r2((P + self) / (area * eff)); const st = allow > 0 ? (press > allow ? 'fail' : press > 0.9 * allow ? 'warn' : 'ok') : 'info';
  return { P, src: O.illus ? 'illus' : 'calc', self, mat: `${a.toFixed(1)}x${b.toFixed(1)}M`, area, eff, press, allow, status: st, pStatus: st, side: allow > 0 ? r2(Math.sqrt((P + self) / (allow * eff))) : null,
    pads: Object.fromEntries(OUT_PADS.map(id => [id, r2((O.used[id] + self) / (area * eff))])), surface: typeof groundSurface === 'function' ? groundSurface(op.ground) : null, approval: String(op.approval || '') };
}
function psChecks(calc) { // every check of the plan, worst first (the same list the app shows)
  const items = []; calc.loads.forEach((x, i) => x.checks.forEach(c => items.push({ ...c, t: (calc.loads.length > 1 ? `Lift ${i + 1} · ` : '') + c.t })));
  for (const O of calc.outrigs || []) O.checks.forEach(c => items.push({ ...c, t: ((calc.outrigs.length > 1 ? `Crane ${O.rigI + 1} · ` : '') + c.t) }));
  if (calc.ground) { const g = calc.ground; items.push({ s: g.pStatus || g.status, t: 'Ground pressure', m: `${g.press.toFixed(2)} t/m² under the busiest leg (${g.P.toFixed(1)} t)` + (g.allow ? ` — ${g.allow} t/m² allowed` : ' — allowable not entered') }); for (const c of g.checks || []) items.push(c); }
  if (calc.rig) items.push({ s: calc.rig.status, t: 'Rigging', m: `${calc.rig.T.toFixed(2)} t in each sling leg at ${calc.rig.alpha.toFixed(0)}°` });
  if (calc.weather) items.push({ s: calc.weather.status, t: 'Weather', m: calc.weather.msgs.join(' · ') });
  const rank = { fail: 0, warn: 1, info: 2, ok: 3 }; return items.sort((a, b) => (rank[a.s] ?? 4) - (rank[b.s] ?? 4));
}
function psStatusCell(s) { const [c, b] = psSt(s); return { t: s === 'fail' ? 'FAIL' : s === 'warn' ? 'CHECK' : s === 'ok' ? 'PASS' : 'INFO', bold: true, color: c, fill: b }; }

// ---------- page: site layout ----------
function psSite(pg, X) {
  const { plan, calc } = X; const P = pg.P, D = PS_DA; const L = X.lifts[X.li0], r = L.res;
  const mb = { x: D.x, y: D.y, w: 226, h: D.h - 10 }; psBox(P, mb);
  const ez0 = r2(Math.max(r.R + num(L.load.l, 2) / 2, 0) + 2), tail0 = num(L.crane.tail, 4.5);
  const sp = psEmbed(pg, mb, (Ps, b) => { const o = drawSitePlan(Ps, b, plan, calc, { livery: X.livery, labels: false }); const st = sitePlanState(plan, L.load); const c0 = o.T(st.cx, st.cy);
    const ring = (rad, col, lab, ang) => { const segs = []; for (let a = 0; a < 360; a += 2) { const p1 = o.T(st.cx + rad * Math.cos(a * D2R), st.cy + rad * Math.sin(a * D2R)), p2 = o.T(st.cx + rad * Math.cos((a + 2) * D2R), st.cy + rad * Math.sin((a + 2) * D2R)); segs.push([p1[0], p1[1], p2[0], p2[1]]); } Ps.path(segs, { stroke: col, w: 0.9, dash: true, layer: 'SITE-RADIUS' }); const t = o.T(st.cx + rad * Math.cos(ang * D2R), st.cy + rad * Math.sin(ang * D2R)); Ps.text(t[0], t[1], lab, { size: 4.4, bold: true, color: col, anchor: 'middle', vAlign: 'middle', bg: '#ffffff', layer: 'SITE-RADIUS' }); };
    ring(ez0, '#d97706', `EXCLUSION ZONE R=${mm(ez0)}`, 125); ring(tail0 + 0.6, '#7c3aed', `TAIL SWING ${mm(tail0 + 0.6)}`, 235); return o; });
  psCaption(P, mb.x + mb.w / 2, mb.y + mb.h + 4.4, 'SITE LAYOUT — CRANE POSITION, WORKING RADIUS & TAIL SWING', sp?.scale ? `SCALE 1:${sp.scale.N * PS_K} (A3)` : '');
  // north arrow
  { const nx = mb.x + mb.w - 10, ny = mb.y + 12; P.circle(nx, ny, 6, { fill: '#ffffff', stroke: PSC.ink, w: 0.3, layer: 'SET' }); P.poly([[nx, ny - 5.2], [nx + 2.2, ny + 2.5], [nx, ny + 1.2], [nx - 2.2, ny + 2.5]], { closed: true, fill: PSC.ink, stroke: 'none', layer: 'SET' }); psT(P, nx, ny - 7.6, 'N', 2.6, { anchor: 'middle', bold: true }); }
  const rx = mb.x + mb.w + 4, rw = D.x + D.w - rx; let y = D.y;
  const T = r.tandem; const cranesOn = (calc.rigs || []).map(rg => ({ rg, pv: rg.pv, crane: rg.crane }));
  y = psTable(P, rx, y, [{ w: 12, t: 'CRANE', a: 'c' }, { w: rw - 12 - 34, t: 'MODEL', a: 'l' }, { w: 17, t: 'NORTH', a: 'c' }, { w: 17, t: 'EAST', a: 'c' }],
    cranesOn.map(({ rg, pv, crane }) => [`C${rg.i + 1}`, `${crane.make || ''} ${pv.modelTxt || crane.model}`.trim().toUpperCase(), pv.gridN !== '' && pv.gridN != null ? String(pv.gridN) : '—', pv.gridE !== '' && pv.gridE != null ? String(pv.gridE) : '—']), { title: 'CRANE CENTRE COORDINATES', rh: 5, fs: 2.2 });
  y += 4;
  const tail = num(L.crane.tail, 4.5), ez = r2(Math.max(r.R + num(L.load.l, 2) / 2, 0) + 2);
  y = psTable(P, rx, y, [{ w: rw - 24, a: 'l' }, { w: 24, a: 'r' }], [
    ['Working radius', `${psN(r.R, 2)} m`], ['Boom heading (0 = east)', `${psN(sitePlanState(plan, L.load).boom, 0)}°`], ['Lift side', SIDE_NAME[sideOf(L.load)]], ['Tail swing radius', `${psN(tail, 2)} m`],
    ['Tail swing clearance (keep clear)', `${psN(tail + 0.6, 2)} m`], ['Load path exclusion radius', `${psN(ez, 2)} m`], ['Closest boom gap', r.clearance != null ? `${psN(r.clearance, 2)} m` : 'no structures entered']], { title: 'POSITIONS & ZONES', rh: 5, fs: 2.2 });
  y += 4; y = psHead(P, rx, y, rw, 'EXCLUSION ZONE & ACCESS');
  const tx = ['Barrier the tail swing (radius + 0.6 m) and the area under the load path before the lift; one controlled entry point.', 'Keep pedestrians and plant out of the slewing area; the lift supervisor controls the zone.', 'Check the access route, ground and overhead lines for the crane, trailers and mats before arrival.', 'Keep 6 m+ from overhead power lines unless the owner has isolated them in writing.', 'Mark buried services, drains, manholes and slab edges near the pads before setting up.'];
  y += 2; tx.forEach((t, i) => { psDot(P, rx + 1.6, y + 1.5, PSC.accent); y += psWrap(P, rx + 5, y, t, 2, rw - 6) + 1.2; });
  { const g = X.ground(L), wx = calc.weather, w = plan.weather; y += 3;
    y = psTable(P, rx, y, [{ w: rw - 40, a: 'l' }, { w: 40, a: 'r' }], [['Pads stand on', g?.surface ? g.surface.name : 'not chosen'], ['Allowable bearing', g?.allow ? `${psN(g.allow, 1)} t/m²` : 'not entered'], ['Mats', g ? g.mat : (plan.outrigger?.mat || plan.matSize || '—')],
      ['Date / lift window', `${plan.meta?.date || '—'}${w?.start ? ' · ' + w.start + (w.hours ? ' +' + w.hours + ' h' : '') : ''}`], ['Wind limit at the boom head', `${psN(windTabOf(plan), 1)} m/s`], ['Forecast gust at the boom head', wx ? `${psN(wx.maxG, 1)} m/s` : 'not added']], { title: 'SITE CONDITIONS', rh: 5, fs: 2.15 }); }
  if (T) { y += 3; y = psHead(P, rx, y, rw, 'TANDEM — CRANE POSITIONS'); y = psTable(P, rx, y + 1, [{ w: 12, t: 'CRANE', a: 'c' }, { w: rw - 12 - 40, t: 'MODEL', a: 'l' }, { w: 20, t: 'RADIUS', a: 'c' }, { w: 20, t: 'SHARE', a: 'c' }], T.picks.map(q => [`C${q.crane + 1}`, String(q.model || '').toUpperCase(), `${psN(q.Rnow ?? q.R, 1)} m`, `${psN(q.share, 2)} t`]), { rh: 4.8, fs: 2.1 }); }
  pg.scale = sp?.scale ? `1:${sp.scale.N * PS_K}` : 'AS SHOWN';
}

// ---------- rigging: list of tackle + arrangement drawings ----------
function psTackleRows(L) {
  const r = L.res, st = r.stack, falls = r.ropeInfo?.falls || 0; const rows = [];
  const hookT = r.design;
  rows.push({ no: 1, desc: `[CRANE HOOK BLOCK]${L.crane.hookBlock ? '' : ''}`, use: falls ? `[${falls} FALLS]` : '[HOOK]', mf: 1, wll: r.reeve || null, unitW: r.hb, qty: 1, line: 'NA', T: r2(hookT - 0), w: r.hb, tl: 'HOOK' });
  if (st) { // forces come from the engine (computeLoad): slings per leg, items at the leg ends, the rest the whole load below — × DAF
    let nT = 0, leg = null;
    st.items.forEach((t) => {
      let line, qty = t.qty || 1, use;
      if (t.type === 'sling') { nT++; line = `T${nT}`; qty = t.legs; use = `[${(t.hitchLabel || 'STRAIGHT PULL').toUpperCase()}]`; leg = { line, legs: t.legs }; }
      else if (t.type === 'spreader' || t.type === 'beam') { line = 'TB'; use = `[SPAN ${psN(t.L, 2)} m]`; leg = null; }
      else if (leg) { line = leg.line; use = '[INLINE · AT EACH LEG]'; qty = Math.max(qty, leg.legs); }
      else { line = 'TM'; use = t.type === 'chain' ? '[CONNECTED TO CRANE]' : '[INLINE]'; }
      const swl = t.swl ?? (t.wll > 0 ? r2(t.wll * (t.mf || 1)) : null);
      rows.push({ no: rows.length + 1, desc: `[${String(t.name || TACKLE_TYPES[t.type]).toUpperCase()}]${t.L ? ` [${psN(t.L, 2)} m]` : ''}`, use, mf: t.mf || 1, wll: t.wll || null, swl, unitW: qty ? t.w / qty : t.w, qty, line, T: t.T ?? null, util: t.util ?? null, w: t.w });
    });
  } else if (r.tk > 0) rows.push({ no: 2, desc: '[LIFTING TACKLES — WEIGHT AS ENTERED]', use: '[AS RIGGED]', mf: 1, wll: null, swl: null, unitW: r.tk, qty: 1, line: '—', T: null, util: null, w: r.tk });
  return rows;
}
// ---------- rigging hardware, drawn like a rigging-study (page mm) ----------
const PS_WLL_COL = [[1, '#7c3aed'], [2, '#16a34a'], [3, '#facc15'], [4, '#9ca3af'], [5, '#dc2626'], [6, '#92400e'], [8, '#2563eb'], [Infinity, '#f97316']]; // EN 1492 round-sling colours
function psSlingKind(t) { const n = String(t?.name || ''); return /chain/i.test(n) ? 'chain' : /wire|wrs|steel|cable/i.test(n) ? 'wire' : /web|flat|belt|strap/i.test(n) ? 'web' : 'round'; }
function psSlingCol(t) { const w = num(t?.wll); if (!(w > 0)) return '#f59e0b'; return PS_WLL_COL.find(([lim]) => w <= lim)[1]; }
function psSling(P, a, b, kind, col, w) { // one sling leg from a to b, with its eyes
  const dx = b[0] - a[0], dy = b[1] - a[1], Ln = Math.hypot(dx, dy) || 1, ux = dx / Ln, uy = dy / Ln, nx = -uy, ny = ux;
  if (kind === 'chain') { const step = Math.max(0.9, w * 1.25); let j = 0; for (let d = 0; d < Ln - step * 0.3; d += step * 0.75, j++) { const cx = a[0] + ux * (d + step / 2), cy = a[1] + uy * (d + step / 2);
      if (j % 2) P.line(cx - ux * step * 0.42, cy - uy * step * 0.42, cx + ux * step * 0.42, cy + uy * step * 0.42, { stroke: '#1f2937', w: w * 0.35, layer: 'SET' });
      else { const pts = []; for (let q = 0; q <= 16; q++) { const t = q / 16 * Math.PI * 2; pts.push([cx + ux * Math.cos(t) * step * 0.5 + nx * Math.sin(t) * w * 0.42, cy + uy * Math.cos(t) * step * 0.5 + ny * Math.sin(t) * w * 0.42]); } P.poly(pts, { closed: true, fill: 'none', stroke: '#1f2937', w: w * 0.22, layer: 'SET' }); } }
    return; }
  const hw = kind === 'wire' ? w * 0.3 : kind === 'web' ? w * 0.62 : w * 0.5; const fill = kind === 'wire' ? '#6b7280' : col, edge = kind === 'wire' ? '#111827' : shade(col, -35);
  const e = Math.min(Ln * 0.18, w * 2.6); // eye length at each end
  const band = (d0, d1) => P.poly([[a[0] + ux * d0 + nx * hw, a[1] + uy * d0 + ny * hw], [a[0] + ux * d1 + nx * hw, a[1] + uy * d1 + ny * hw], [a[0] + ux * d1 - nx * hw, a[1] + uy * d1 - ny * hw], [a[0] + ux * d0 - nx * hw, a[1] + uy * d0 - ny * hw]], { closed: true, fill, stroke: edge, w: 0.15, layer: 'SET' });
  band(e, Ln - e);
  for (const [d0, sg] of [[0, 1], [Ln, -1]]) { const cx = a[0] + ux * (d0 + sg * e / 2), cy = a[1] + uy * (d0 + sg * e / 2); const pts = []; for (let q = 0; q <= 18; q++) { const t = q / 18 * Math.PI * 2; pts.push([cx + ux * Math.cos(t) * e / 2 + nx * Math.sin(t) * hw * 1.25, cy + uy * Math.cos(t) * e / 2 + ny * Math.sin(t) * hw * 1.25]); }
    P.poly(pts, { closed: true, fill: 'none', stroke: kind === 'wire' ? '#111827' : fill, w: hw * 0.9, layer: 'SET' });
    if (kind === 'wire') { const fx = a[0] + ux * (d0 + sg * (e + w * 0.5)), fy = a[1] + uy * (d0 + sg * (e + w * 0.5)); P.poly([[fx + nx * hw * 1.6 - ux * w * 0.45, fy + ny * hw * 1.6 - uy * w * 0.45], [fx + nx * hw * 1.6 + ux * w * 0.45, fy + ny * hw * 1.6 + uy * w * 0.45], [fx - nx * hw * 1.6 + ux * w * 0.45, fy - ny * hw * 1.6 + uy * w * 0.45], [fx - nx * hw * 1.6 - ux * w * 0.45, fy - ny * hw * 1.6 - uy * w * 0.45]], { closed: true, fill: '#d1d5db', stroke: '#111827', w: 0.12, layer: 'SET' }); } }
  if (kind !== 'wire') P.line(a[0] + ux * e, a[1] + uy * e, b[0] - ux * e, b[1] - uy * e, { stroke: shade(col, 25), w: Math.max(0.08, hw * 0.25), layer: 'SET' });
}
function psShackle(P, x, y, ang, s) { // bow shackle hanging at (x, y) = the pin, opening along ang (radians, page)
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux; const L = s, wb = s * 0.42; const col = '#db2777', edge = '#831843';
  const pts = []; for (let q = 0; q <= 20; q++) { const t = Math.PI * q / 20; pts.push([x + ux * (L * 0.55 + Math.sin(t) * L * 0.45) + nx * Math.cos(t) * wb, y + uy * (L * 0.55 + Math.sin(t) * L * 0.45) + ny * Math.cos(t) * wb]); }
  P.poly([[x + nx * wb * 0.8, y + ny * wb * 0.8], ...pts, [x - nx * wb * 0.8, y - ny * wb * 0.8]], { closed: false, fill: 'none', stroke: edge, w: s * 0.22, layer: 'SET' });
  P.poly([[x + nx * wb * 0.8, y + ny * wb * 0.8], ...pts, [x - nx * wb * 0.8, y - ny * wb * 0.8]], { closed: false, fill: 'none', stroke: col, w: s * 0.13, layer: 'SET' });
  P.line(x + nx * wb * 1.25, y + ny * wb * 1.25, x - nx * wb * 1.25, y - ny * wb * 1.25, { stroke: '#374151', w: s * 0.16, layer: 'SET' });
  P.circle(x + nx * wb * 1.3, y + ny * wb * 1.3, s * 0.11, { fill: '#374151', stroke: 'none', layer: 'SET' });
}
function psLink(P, x, y, h) { const w = h * 0.55; const pts = []; for (let q = 0; q <= 24; q++) { const t = q / 24 * Math.PI * 2; pts.push([x + Math.sin(t) * w / 2, y + h / 2 - Math.cos(t) * h / 2]); } P.poly(pts, { closed: true, fill: 'none', stroke: '#1f2937', w: h * 0.14, layer: 'SET' }); P.poly(pts, { closed: true, fill: 'none', stroke: '#9ca3af', w: h * 0.06, layer: 'SET' }); }
function psPadeye(P, x, y, s) { P.poly([[x - s * 0.55, y], [x - s * 0.3, y - s * 0.9], [x + s * 0.3, y - s * 0.9], [x + s * 0.55, y]], { closed: true, fill: '#9ca3af', stroke: '#111827', w: 0.15, layer: 'SET' }); P.circle(x, y - s * 0.55, s * 0.18, { fill: '#ffffff', stroke: '#111827', w: 0.12, layer: 'SET' }); }
function psChainBlock(P, x, y1, y2) { // hook, housing with the hand chain, load chain, bottom hook
  const h = y2 - y1, bw = Math.max(2.4, Math.min(5, h * 0.22)), by = y1 + h * 0.18, bh = Math.max(2.6, h * 0.24);
  P.line(x, y1, x, by, { stroke: '#111827', w: 0.35, layer: 'SET' });
  P.rect(x - bw / 2, by, bw, bh, { fill: '#1f2937', stroke: '#000', w: 0.2, layer: 'SET' }); P.rect(x - bw / 2 + 0.4, by + bh * 0.3, bw - 0.8, bh * 0.25, { fill: '#c026d3', stroke: 'none', layer: 'SET' });
  const pts = []; for (let q = 0; q <= 20; q++) { const t = q / 20 * Math.PI * 2; pts.push([x + bw / 2 + 1.2 + Math.cos(t) * 1.2, by + bh / 2 + h * 0.2 + Math.sin(t) * h * 0.22]); } P.poly(pts, { closed: true, fill: 'none', stroke: '#6b7280', w: 0.15, dash: true, layer: 'SET' });
  for (let yy = by + bh; yy < y2 - 0.6; yy += 1.1) P.circle(x, yy + 0.55, 0.45, { fill: 'none', stroke: '#111827', w: 0.2, layer: 'SET' });
}
function psLoadFront(P, x0, y0, w, h, shape, o = {}) { // the load seen side-on, shaded; (x0, y0) = top-left, page mm
  const ink = '#0f172a', base = o.col || '#cbd5e1';
  if (shape === 'drum' || shape === 'coil') { const r = Math.min(w, h) / 2, cx = x0 + w / 2, cy = y0 + h / 2; P.circle(cx, cy, r, { fill: shape === 'coil' ? '#9aa3ad' : '#d6c7a1', stroke: ink, w: 0.3, layer: 'SET' }); P.circle(cx, cy, r * 0.72, { fill: 'none', stroke: '#6b7280', w: 0.15, layer: 'SET' }); P.circle(cx, cy, r * 0.3, { fill: '#ffffff', stroke: ink, w: 0.2, layer: 'SET' }); return; }
  if (shape === 'cylinder') { const ry = Math.min(h * 0.08, 2.4); P.rect(x0, y0 + ry, w, h - 2 * ry, { fill: '#b6c6d3', stroke: 'none', layer: 'SET' });
    P.poly(Array.from({ length: 25 }, (_, q) => { const t = Math.PI * q / 24; return [x0 + w / 2 - Math.cos(t) * w / 2, y0 + h - ry + Math.sin(t) * ry]; }), { closed: false, fill: 'none', stroke: ink, w: 0.3, layer: 'SET' });
    P.line(x0, y0 + ry, x0, y0 + h - ry, { stroke: ink, w: 0.3, layer: 'SET' }); P.line(x0 + w, y0 + ry, x0 + w, y0 + h - ry, { stroke: ink, w: 0.3, layer: 'SET' });
    P.poly(Array.from({ length: 33 }, (_, q) => { const t = 2 * Math.PI * q / 32; return [x0 + w / 2 + Math.cos(t) * w / 2, y0 + ry + Math.sin(t) * ry]; }), { closed: true, fill: '#dbe5ee', stroke: ink, w: 0.3, layer: 'SET' });
    P.rect(x0 + w * 0.12, y0 + ry * 2, w * 0.08, h - ry * 3, { fill: '#e8eef4', stroke: 'none', layer: 'SET' }); return; }
  const d = Math.min(3.2, h * 0.18, w * 0.12); // a little depth: top face and side face for a solid look
  P.poly([[x0, y0], [x0 + d, y0 - d * 0.7], [x0 + w + d, y0 - d * 0.7], [x0 + w, y0]], { closed: true, fill: shade(base, 18), stroke: ink, w: 0.2, layer: 'SET' });
  P.poly([[x0 + w, y0], [x0 + w + d, y0 - d * 0.7], [x0 + w + d, y0 + h - d * 0.7], [x0 + w, y0 + h]], { closed: true, fill: shade(base, -18), stroke: ink, w: 0.2, layer: 'SET' });
  P.rect(x0, y0, w, h, { fill: shape === 'container' ? '#7a8fa6' : shape === 'chiller' ? '#c3cad3' : shape === 'tc' ? '#86efac' : shape === 'bundle' ? '#8d9298' : base, stroke: ink, w: 0.3, layer: 'SET' });
  if (shape === 'container') for (let xx = x0 + 1; xx < x0 + w - 0.5; xx += 1.2) P.line(xx, y0 + 0.6, xx, y0 + h - 0.6, { stroke: '#4a5a6a', w: 0.12, layer: 'SET' });
  else if (shape === 'chiller') { for (let xx = x0 + 1; xx < x0 + w - 1; xx += 0.9) P.line(xx, y0 + h * 0.2, xx, y0 + h * 0.85, { stroke: '#8b95a1', w: 0.1, layer: 'SET' }); }
  else if (shape === 'bundle') for (let yy = y0 + h / 4; yy < y0 + h - 0.2; yy += h / 4) P.line(x0, yy, x0 + w, yy, { stroke: '#5d6268', w: 0.15, layer: 'SET' });
  else { P.line(x0 + 0.8, y0 + h * 0.22, x0 + w - 0.8, y0 + h * 0.22, { stroke: shade(base, -12), w: 0.15, layer: 'SET' }); P.line(x0 + 0.8, y0 + h - 1, x0 + w - 0.8, y0 + h - 1, { stroke: shade(base, -12), w: 0.15, layer: 'SET' }); }
}
function psRigDraw(P, b, L, view = 'front') { // the tackle arrangement drawn from the tackle list: hook block, hardware, sling legs, load, balloons
  const r = L.res, st = r.stack, load = L.load, pf = L.pf; const items = st ? st.items : [];
  const lL = Math.max(0.5, num(load.l, 2)), lH = Math.max(0.3, num(load.h, 1.5)), across = view === 'side';
  const wd = num(load.wd) > 0 ? num(load.wd) : Math.max(0.5, Math.min(lL, lH));
  const bodyW = across ? wd : lL; const H = st ? st.H : pf ? pf.H : 3;
  const hk = hookOf(L.crane); const hbH = hk ? hk.h : 1.6, hbW = hk ? hk.w : 0.9;
  const spanMax = Math.max(bodyW, hbW, ...(items.filter(t => t.type === 'spreader' || t.type === 'beam').map(t => across ? 0.6 : num(t.L))));
  const k = Math.min((b.w - 40) / (spanMax + 0.6), (b.h - 34) / (hbH + H + lH + 0.3));
  const cx = b.x + b.w / 2 - 6, y0 = b.y + 9; const X_ = (u) => cx + u * k, Y_ = (v) => y0 + v * k;
  const balloons = []; const balloon = (x, y, n, dx) => balloons.push({ x, y, n, dx: dx || 1 });
  // hoist rope falls and the crane's own hook block (from its CAD drawing)
  for (const dx of [-0.18, 0.18]) P.line(X_(dx * hbW), b.y + 2, X_(dx * hbW), y0 + 0.4, { stroke: '#111827', w: 0.22, layer: 'SET' });
  if (hk) emitItems(P, hk.items, hk.pal, (x, y) => [cx + x * hk.s * k, y0 - y * hk.s * k], { tint: '#facc15', w: 0.12, layer: 'SET' });
  else { P.poly([[X_(-0.45), y0], [X_(0.45), y0], [X_(0.32), Y_(hbH * 0.7)], [X_(-0.32), Y_(hbH * 0.7)]], { closed: true, fill: '#facc15', stroke: '#111827', w: 0.25, layer: 'SET' }); P.arc(cx, Y_(hbH * 0.85), hbH * 0.15 * k, 180, 360, { stroke: '#111827', w: 0.6, layer: 'SET' }); }
  balloon(X_(hbW / 2), Y_(hbH * 0.35), 1);
  const pickX = () => { if (!pf) return [-lL * 0.4, lL * 0.4]; if (across) return pf.n >= 3 ? [-pf.across / 2, pf.across / 2] : [0]; return pf.n === 1 ? [0] : [-pf.along / 2, pf.along / 2]; };
  const legW = Math.max(0.9, Math.min(2.2, 0.09 * k));
  let pts = [0], v = hbH, prevSling = null; const lbl = [];
  const slingLegs = (t, from, to, v0, v1, no) => {
    const kind = psSlingKind(t), col = psSlingCol(t);
    if (from.length === 1 && to.length > 1 && !(items[items.indexOf(t) - 1]?.type === 'shackle')) psLink(P, X_(from[0]), Y_(v0) - 0.6, Math.max(2.2, legW * 2.2));
    const pairs = from.length === 1 ? to.map(x => [from[0], x]) : from.length === to.length ? from.map((x, j) => [x, to[j]]) : to.map(x => [from.reduce((a, q) => (Math.abs(q - x) < Math.abs(a - x) ? q : a), from[0]), x]);
    if (!across && t.legs >= 4) for (const [a, c] of pairs) psSling(P, [X_(a) + 0.8, Y_(v0) + 0.3], [X_(c) + 0.8 * Math.sign(c - a || 1), Y_(v1)], kind, shade(col, -25), legW * 0.85); // the two legs behind
    for (const [a, c] of pairs) psSling(P, [X_(a), Y_(v0)], [X_(c), Y_(v1)], kind, col, legW);
    const [a, c] = pairs[pairs.length - 1]; balloon((X_(a) + X_(c)) / 2, (Y_(v0) + Y_(v1)) / 2, no, c >= a ? 1 : -1);
    const [a0, c0] = pairs[0]; if (pairs.length > 1 || Math.abs(c0 - a0) > 0.01) { const ang = Math.atan2(Math.abs(c0 - a0), v1 - v0) * R2D; const ra = Math.min(9, (v1 - v0) * k * 0.3);
      P.arc(X_(a0), Y_(v0), ra, 270, 270 + (c0 >= a0 ? ang : -ang), { stroke: COL.red, w: 0.18, layer: 'SET' }); P.line(X_(a0), Y_(v0), X_(a0), Y_(v0) + ra * 1.3, { stroke: COL.red, w: 0.12, dash: true, layer: 'SET' });
      psT(P, X_(a0) + (c0 >= a0 ? 1.4 : -1.4), Y_(v0) + ra + 2.4, `${psN(ang, 1)}°`, 1.9, { anchor: c0 >= a0 ? 'start' : 'end', bold: true, color: COL.red, bg: '#ffffff' }); }
    if (t.L) { const mx = (X_(a) + X_(c)) / 2, my = (Y_(v0) + Y_(v1)) / 2; let rot = Math.atan2(Y_(v1) - Y_(v0), X_(c) - X_(a)) * R2D; if (rot > 90) rot -= 180; if (rot < -90) rot += 180;
      const nx = Math.sin(rot * D2R), ny = -Math.cos(rot * D2R), off = legW + 2.8; P.text(mx + nx * off, my + ny * off, `L = ${psN(t.L, 2)} m`, { size: 1.7, bold: true, anchor: 'middle', vAlign: 'middle', rot, color: '#065f46', bg: '#ffffff', layer: 'SET' }); }
    return pairs.map(p => p[1]);
  };
  items.forEach((t, i) => {
    const no = i + 2, vt = Math.max(0.15, t.v);
    if (t.type === 'sling') { const beam = items.slice(i + 1).find(q => q.type === 'spreader' || q.type === 'beam'); const tg = beam ? (across ? [0] : [-num(beam.L) / 2, num(beam.L) / 2]) : pickX();
      pts = slingLegs(t, pts, tg, v, v + vt, no); prevSling = t; v += vt; return; }
    if (t.type === 'spreader' || t.type === 'beam') { const half = across ? 0.3 : num(t.L, 2) / 2; const y1 = Y_(v + vt * 0.25), bh = Math.max(1.6, vt * 0.5 * k);
      P.rect(X_(-half), y1, half * 2 * k, bh, { fill: t.type === 'spreader' ? '#fde047' : '#d1d5db', stroke: '#713f12', w: 0.3, layer: 'SET' }); P.line(X_(-half), y1 + bh * 0.22, X_(half), y1 + bh * 0.22, { stroke: '#a16207', w: 0.12, layer: 'SET' }); P.line(X_(-half), y1 + bh * 0.78, X_(half), y1 + bh * 0.78, { stroke: '#a16207', w: 0.12, layer: 'SET' });
      const ends = across ? [0] : [-half + 0.08, half - 0.08]; for (const e of ends) { psPadeye(P, X_(e), y1, Math.max(1.6, bh * 0.9)); const bp = [X_(e) - Math.max(0.8, bh * 0.4), y1 + bh, X_(e) + Math.max(0.8, bh * 0.4)]; P.poly([[bp[0], bp[1]], [X_(e), bp[1] + bh * 0.8], [bp[2], bp[1]]], { closed: true, fill: '#9ca3af', stroke: '#111827', w: 0.15, layer: 'SET' }); }
      psT(P, X_(0), y1 + bh / 2, `${String(t.name || 'SPREADER').toUpperCase()} · SPAN ${psN(t.L, 2)} m`, Math.min(1.9, bh * 0.45), { anchor: 'middle', bold: true, color: '#713f12', maxW: half * 2 * k - 6 });
      balloon(X_(half), y1 + bh / 2, no); pts = across ? [0] : [-half + 0.08, half - 0.08]; prevSling = null; v += vt; return; }
    for (const x of pts) { const a = X_(x), y1 = Y_(v), y2 = Y_(v + vt);
      if (t.type === 'shackle') psShackle(P, a, y1, Math.PI / 2, Math.max(2.4, Math.min(5, (y2 - y1) * 0.95)));
      else if (t.type === 'chain') psChainBlock(P, a, y1, y2);
      else { P.line(a, y1, a, y2, { stroke: '#374151', w: 0.5, layer: 'SET' }); psLink(P, a, y2 - 2, 2); } }
    balloon(X_(pts[pts.length - 1]) + 1.5, Y_(v + vt / 2), no); v += vt;
  });
  if (!items.length && pf) { const t = { name: 'SLINGS', legs: pf.n, L: pf.pts[0]?.L }; pts = slingLegs(t, [0], pickX(), v, v + pf.H, 2); v += pf.H; }
  // the load, its lifting points (padeyes), the centre of gravity
  const ly = Y_(v); psLoadFront(P, X_(-bodyW / 2), ly, bodyW * k, lH * k, load.shape || 'box');
  for (const x of pickX()) psPadeye(P, X_(x), ly, Math.max(1.4, Math.min(3, 0.18 * k)));
  const cg = across ? num(load.cogZ) : num(load.cogX); cogSymbol(P, X_(cg), ly + lH * k / 2, Math.min(1.8, Math.max(1, lH * k * 0.22)), 'SET');
  psT(P, X_(cg) + 2.4, ly + lH * k / 2 + 2.6, 'C.O.G.', 1.6, { bold: true, color: PSC.ink2 });
  // dimensions: load length / width, lifting points, hook to load, load height
  dimA(P, [X_(-bodyW / 2), ly + lH * k], [X_(bodyW / 2), ly + lH * k], 4.5, String(mm(bodyW)), { side: 'down', size: 2.1 });
  const px = pickX(); if (px.length > 1) { const yd = ly + lH * k + 9.5; dimA(P, [X_(px[0]), yd], [X_(cg), yd], 0, String(mm(cg - px[0])), { side: 'down', size: 1.9, extA: false, extB: false }); dimA(P, [X_(cg), yd], [X_(px[px.length - 1]), yd], 0, String(mm(px[px.length - 1] - cg)), { side: 'down', size: 1.9, extA: false, extB: false });
    for (const xx of [px[0], cg, px[px.length - 1]]) P.line(X_(xx), ly + lH * k + 1, X_(xx), yd + 1.2, { stroke: COL.red, w: 0.1, layer: 'DIM' }); }
  const hx = X_(-spanMax / 2) - 7; dimA(P, [hx, Y_(hbH)], [hx, ly], 0, String(mm(v - hbH)), { side: 'left', size: 2.1, extA: false, extB: false });
  P.line(hx - 1, Y_(hbH), X_(0) - 1, Y_(hbH), { stroke: COL.red, w: 0.1, dash: true, layer: 'DIM' });
  dimA(P, [X_(bodyW / 2) + 4.5, ly], [X_(bodyW / 2) + 4.5, ly + lH * k], 0, String(mm(lH)), { side: 'right', size: 1.9, extA: false, extB: false });
  psT(P, cx, ly + lH * k + 17, `${String(load.name || 'LOAD').toUpperCase()} · ${psN(r.W, 2)} t`, 2.4, { anchor: 'middle', bold: true, maxW: b.w - 6 });
  // balloons, kept apart
  balloons.sort((p, q) => p.y - q.y); let lastR = -99, lastL = -99;
  for (const q of balloons) { const right = q.dx >= 0; let by = q.y - 2; if (right) { by = Math.max(by, lastR + 5); lastR = by; } else { by = Math.max(by, lastL + 5); lastL = by; }
    const bx = right ? Math.min(b.x + b.w - 4, q.x + 10) : Math.max(b.x + 4, q.x - 10);
    P.line(q.x, q.y, bx + (right ? -2.2 : 2.2), by, { stroke: PSC.red, w: 0.18, layer: 'SET' }); P.circle(q.x, q.y, 0.4, { fill: PSC.red, stroke: 'none', layer: 'SET' });
    P.circle(bx, by, 2.2, { fill: '#ffffff', stroke: PSC.blue, w: 0.3, layer: 'SET' }); psT(P, bx, by, String(q.n).padStart(2, '0'), 1.8, { anchor: 'middle', bold: true, color: PSC.blue }); }
}
// the rig in 3D (isometric): load block, lifting points, every sling leg up to the hook, the spreader, tension labels
function psRigIso(P, b, L, o = {}) {
  const r = L.res, pf = L.pf, load = L.load, st = r.stack; if (!pf) return;
  const lL = Math.max(0.5, num(load.l, 2)), lH = Math.max(0.3, num(load.h, 1.5)), wd = num(load.wd) > 0 ? num(load.wd) : Math.max(pf.across + 0.3, Math.min(lL, lH));
  const items = st ? st.items : []; const H = st ? st.H : pf.H; const hb = 1.2;
  const pr = (x, z, y) => [(x - z) * 0.866, (x + z) * 0.5 - y];                       // x along the load, z across, y up
  const box3 = [[-lL / 2, -wd / 2, 0], [lL / 2, wd / 2, lH + H + hb]].flatMap(([x, z, y]) => [pr(x, z, y)]);
  const corners = []; for (const x of [-lL / 2, lL / 2]) for (const z of [-wd / 2, wd / 2]) for (const y of [0, lH + H + hb]) corners.push(pr(x, z, y));
  const xs = corners.map(c => c[0]), ys = corners.map(c => c[1]); const k = Math.min((b.w - 16) / (Math.max(...xs) - Math.min(...xs)), (b.h - 16) / (Math.max(...ys) - Math.min(...ys)));
  const ox = b.x + (b.w - (Math.max(...xs) - Math.min(...xs)) * k) / 2 - Math.min(...xs) * k, oy = b.y + 8 - Math.min(...ys) * k;
  const S = (x, z, y) => { const q = pr(x, z, y); return [ox + q[0] * k, oy + q[1] * k]; };
  // ground shadow and the load block (three visible faces)
  const f = (pts, fill) => P.poly(pts.map(p => S(...p)), { closed: true, fill, stroke: '#0f172a', w: 0.2, layer: 'SET' });
  f([[-lL / 2 - 0.4, -wd / 2 - 0.4, 0], [lL / 2 + 0.4, -wd / 2 - 0.4, 0], [lL / 2 + 0.4, wd / 2 + 0.4, 0], [-lL / 2 - 0.4, wd / 2 + 0.4, 0]], '#f1f5f9');
  f([[-lL / 2, wd / 2, 0], [lL / 2, wd / 2, 0], [lL / 2, wd / 2, lH], [-lL / 2, wd / 2, lH]], '#94a3b8');
  f([[lL / 2, -wd / 2, 0], [lL / 2, wd / 2, 0], [lL / 2, wd / 2, lH], [lL / 2, -wd / 2, lH]], '#64748b');
  f([[-lL / 2, -wd / 2, lH], [lL / 2, -wd / 2, lH], [lL / 2, wd / 2, lH], [-lL / 2, wd / 2, lH]], '#cbd5e1');
  { const g = S(pf.cx, pf.cz, lH); cogSymbol(P, g[0], g[1], 1.3, 'SET'); }
  // levels from the hook down: the hook above the C.O.G., then each sling / beam
  const top = lH + H; let lvl = [{ x: pf.cx, z: pf.cz }], y = top; const legs = [];
  const picks3 = pf.pts.map(q => ({ x: q.x, z: q.z, id: q.id, T: q.T }));
  if (items.length) items.forEach((t, i) => { const vt = Math.max(0.15, t.v);
    if (t.type === 'sling') { const beam = items.slice(i + 1).find(q => q.type === 'spreader' || q.type === 'beam'); const tg = beam ? [{ x: pf.cx - num(beam.L) / 2, z: pf.cz }, { x: pf.cx + num(beam.L) / 2, z: pf.cz }] : picks3;
      for (const p of tg) { const from = lvl.reduce((a, q) => (Math.hypot(q.x - p.x, q.z - p.z) < Math.hypot(a.x - p.x, a.z - p.z) ? q : a), lvl[0]); legs.push({ a: [from.x, from.z, y], c: [p.x, p.z, y - vt], t, p }); }
      lvl = tg; }
    else if (t.type === 'spreader' || t.type === 'beam') { const a = S(pf.cx - num(t.L) / 2, pf.cz, y - vt / 2), c = S(pf.cx + num(t.L) / 2, pf.cz, y - vt / 2); P.line(a[0], a[1], c[0], c[1], { stroke: '#713f12', w: 2.2, layer: 'SET' }); P.line(a[0], a[1], c[0], c[1], { stroke: '#fde047', w: 1.4, layer: 'SET' }); }
    else for (const q of lvl) { const a = S(q.x, q.z, y), c = S(q.x, q.z, y - vt); P.line(a[0], a[1], c[0], c[1], { stroke: t.type === 'shackle' ? '#db2777' : '#1f2937', w: 0.7, layer: 'SET' }); }
    y -= vt; });
  else for (const p of picks3) legs.push({ a: [pf.cx, pf.cz, top], c: [p.x, p.z, lH], t: { name: 'sling' }, p });
  legs.sort((p, q) => (p.c[0] + p.c[1]) - (q.c[0] + q.c[1]));
  for (const lg of legs) { const a = S(...lg.a), c = S(...lg.c); psSling(P, a, c, psSlingKind(lg.t), psSlingCol(lg.t), 1.1); }
  for (const p of picks3) { const c = S(p.x, p.z, lH); psReaction(P, c[0], c[1], 1.1); if (o.tension) psT(P, c[0] + 1.6, c[1] + 2.8, `${p.id.replace('R', 'T')} ${psN(p.T, 2)} Te`, 1.8, { bold: true, color: PSC.blue, bg: '#ffffff' }); }
  { const h = S(pf.cx, pf.cz, top + hb * 0.15); P.poly([[h[0] - 1.8, h[1] - hb * k * 0.75], [h[0] + 1.8, h[1] - hb * k * 0.75], [h[0] + 1.2, h[1]], [h[0] - 1.2, h[1]]], { closed: true, fill: '#facc15', stroke: '#111827', w: 0.25, layer: 'SET' }); P.line(h[0], b.y + 1, h[0], h[1] - hb * k * 0.75, { stroke: '#111827', w: 0.25, layer: 'SET' }); }
}
function psRigging(pg, X, L) {
  const P = pg.P, D = PS_DA; const r = L.res; const rows = psTackleRows(L);
  const tot = rows.slice(1).reduce((a, q) => a + num(q.w), 0);
  const cols = [{ w: 9, t: 'NO.', a: 'c' }, { w: 70, t: 'DESCRIPTION', a: 'l' }, { w: 36, t: 'USAGE', a: 'c' }, { w: 13, t: 'MODE\nFACTOR', a: 'c' }, { w: 13, t: 'WLL\n(TE)', a: 'c' }, { w: 13, t: 'SWL\n(TE)', a: 'c' },
    { w: 17, t: 'UNIT\nWEIGHT (KGS)', a: 'c' }, { w: 11, t: 'QTY\n(EA)', a: 'c' }, { w: 15, t: 'TENSION\nLINE', a: 'c' }, { w: 17, t: 'TENSION\nFORCE (TE)', a: 'c' }, { w: 14, t: '%\nUTIL.', a: 'c' }];
  cols.push({ w: D.w - cols.reduce((a, c) => a + c.w, 0), t: 'TOTAL\nWEIGHT (KGS)', a: 'c' });
  const body = rows.map(q => { const uc = q.util == null ? PSC.ink : q.util > 100 ? PSC.fail : q.util > 90 ? PSC.warn : PSC.ink; return [String(q.no).padStart(2, '0'), q.desc, q.use, psN(q.mf, 2), q.wll ? psN(q.wll, 1) : '—', q.swl ? psN(q.swl, 2) : q.wll ? psN(q.wll, 2) : '—', psKg(q.unitW), String(q.qty), q.line, q.T != null ? psN(q.T, 3) : '—', { t: q.util != null ? psN(q.util, 2) + '%' : '—', color: uc, bold: q.util > 90 }, { t: psKg(q.w), bold: true }]; });
  body.push({ cells: [{ t: '' }, { t: '' }, { t: 'TOTAL WEIGHT OF RIGGING', bold: true }, '', '', '', '', '', '', '', '', { t: psKg(tot), bold: true }], fill: PSC.soft });
  body.push({ cells: [{ t: '' }, { t: '' }, { t: 'TOTAL WEIGHT OF RIGGING + HOOK BLOCK', bold: true }, '', '', '', '', '', '', '', '', { t: psKg(tot + r.hb), bold: true }], fill: PSC.soft });
  const rh = Math.max(3.8, Math.min(5, 120 / Math.max(1, body.length)));
  let y = psTable(P, D.x, D.y, cols, body, { title: `LIST OF RIGGING TACKLE — ${String(L.name).toUpperCase()}`, rh, fs: 2.05, hh: 7.2, hfs: 1.95 });
  y += 5;
  const h = D.y + D.h - y - 10; const fb = { x: D.x, y, w: 150, h }, sb = { x: D.x + 153, y, w: 80, h }, ib = { x: D.x + 236, y, w: D.w - 236, h };
  psBox(P, fb); psBox(P, sb);
  psRigDraw(P, fb, L, 'front'); psCaption(P, fb.x + fb.w / 2, fb.y + fb.h + 4.4, 'TACKLE ARRANGEMENT — FRONT VIEW', 'NOT TO SCALE');
  psRigDraw(P, sb, L, 'side'); psCaption(P, sb.x + sb.w / 2, sb.y + sb.h + 4.4, 'SIDE VIEW', 'NOT TO SCALE');
  const isoH = Math.min(78, Math.max(50, ib.h * 0.42)); psBox(P, { x: ib.x, y: ib.y, w: ib.w, h: isoH }); psRigIso(P, { x: ib.x, y: ib.y, w: ib.w, h: isoH }, L); psT(P, ib.x + 2, ib.y + 3, 'ISOMETRIC VIEW (NOT TO SCALE)', 1.8, { bold: true, color: PSC.ink2 });
  let iy = psHead(P, ib.x, ib.y + isoH + 3, ib.w, 'RIGGING SUMMARY');
  const pf = L.pf; const sl = r.stack?.items?.filter(t => t.type === 'sling') || [];
  iy = psTable(P, ib.x, iy, [{ w: ib.w - 26, a: 'l' }, { w: 26, a: 'r' }], [
    ['Rigging height (hook to load)', `${psN(r.rigH, 2)} m`], ['Hook height above landing', `${psN(r.hookY, 2)} m`], ['Boom tip height', `${psN(r.tipY, 2)} m`], ['Headroom needed (incl. hook allowance)', `${psN(r.reqTipY, 2)} m`],
    ['Lifting points', pf ? `${pf.n} · ${psN(pf.along, 2)}${pf.n >= 3 ? ' × ' + psN(pf.across, 2) : ''} m` : '—'], ...sl.map(t => [`${t.name}: angle from vertical`, `${psN(90 - num(t.ang), 1)}°`]),
    ...sl.map(t => [`${t.name}: tension per leg`, t.T != null ? `${psN(t.T, 2)} t` : '—']), ['Rigging weight', `${psN(r.tk, 3)} t`]], { rh: 4.6, fs: 2.05 });
  iy += 3; iy = psHead(P, ib.x, iy, ib.w, 'RIGGING RULES'); iy += 1.5;
  ['Every item certified, inspected and colour-coded for this period (LOLER). No damaged slings.', 'Sling angle not more than 60° from vertical (120° included). Protect slings on sharp edges.', 'Chain blocks used for levelling only — set before the lift; never shorten slings with knots.', 'A 4-leg sling is rated as if only 3 legs carry the load.'].forEach(t => { psDot(P, ib.x + 1.6, iy + 1.5, PSC.accent); iy += psWrap(P, ib.x + 5, iy, t, 1.95, ib.w - 6) + 1; });
  iy += 3; if (iy < ib.y + ib.h - 40) psTable(P, ib.x, iy, [{ w: ib.w * 0.34, t: 'ANGLE FROM\nVERTICAL', a: 'c' }, { w: ib.w * 0.33, t: 'INCLUDED\nANGLE', a: 'c' }, { w: ib.w - ib.w * 0.67, t: 'TENSION\nFACTOR 1 / cos a', a: 'c' }],
    [0, 15, 30, 45, 60].map(a => [`${a}°`, `${a * 2}°`, { t: psN(1 / Math.cos(a * D2R), 3), bold: true, color: a > 45 ? PSC.fail : a > 30 ? PSC.warn : PSC.ink }]), { title: 'SLING ANGLE — TENSION FACTOR', rh: 4.4, fs: 2, hh: 6.4, tfs: 2.5 });
}

// ---------- load & sling calculations ----------
function psCalc(pg, X, L) {
  const P = pg.P, D = PS_DA; const r = L.res, pf = L.pf; const lw = 168;
  let y = D.y;
  const sec = (t) => { psT(P, D.x, y + 2.5, t, 2.7, { bold: true }); y += 5; };
  sec('WEIGHT + CONTINGENCY + D.A.F');
  y = psTable(P, D.x, y, [{ w: 38, t: 'ITEM LOAD (TONS)', a: 'c' }, { w: 38, t: 'CONTINGENCY', a: 'c' }, { w: 38, t: 'D.A.F', a: 'c' }, { w: 40, t: 'TOTAL WEIGHT W (TONS)', a: 'c' }],
    [[psN(r.W, 3), `${psN(r.contOn ? r.cont : 0, 2)}%`, r.daf ? `${psN((r.daf - 1) * 100, 2)}%` : '0.00%', { t: psN(pf?.W ?? (r.W + r.contW), 3), bold: true }]], { rh: 5, fs: 2.3, hh: 5 }) + 4;
  if (pf) {
    const ids = pf.pts.map(q => q.id);
    sec(`REACTION FORCES AT THE LIFTING POINTS (${ids.join(', ')})`);
    y = psTable(P, D.x, y, [{ w: 40, t: 'FORCE', a: 'c' }, { w: 14, t: 'UNITS', a: 'c' }, { w: 20, t: 'MAIN LOAD\nWEIGHT', a: 'c' }, ...ids.map(id => ({ w: Math.min(22, (lw - 96) / ids.length), t: 'REACTION\n' + id, a: 'c' })), { w: 22, t: 'TOTAL', a: 'c' }],
      [['DISTANCE FROM C.O.G.', 'MTR', '-', ...pf.pts.map(q => psN(q.d, 3)), '-'], ['VERTICAL LOAD', 'Te', psN(pf.W, 3), ...pf.pts.map(q => psN(q.R, 3)), { t: psN(pf.pts.reduce((a, q) => a + q.R, 0), 3), bold: true }]], { rh: 5, fs: 2.25, hh: 7 }) + 4;
    sec('TENSION FORCES');
    y = psTable(P, D.x, y, [{ w: 40, t: 'TENSION LOADS', a: 'c' }, { w: 14, t: 'UNITS', a: 'c' }, ...pf.pts.map((q, i) => ({ w: Math.min(26, (lw - 54) / pf.n), t: 'T' + (i + 1), a: 'c' }))],
      [['VERTICAL LOAD', 'Te', ...pf.pts.map(q => psN(q.R, 3))], ['ANGLE FROM VERTICAL', '°', ...pf.pts.map(q => psN(q.beta, 2))], ['LEG LENGTH (HOOK TO POINT)', 'MTR', ...pf.pts.map(q => psN(q.L, 3))], [{ t: 'TENSION FORCE', bold: true }, 'Te', ...pf.pts.map(q => ({ t: psN(q.T, 3), bold: true, color: PSC.blue }))]], { rh: 5, fs: 2.25, hh: 5 }) + 1.5;
    if (pf.n >= 4) { psT(P, D.x, y + 2, `4-leg sling rated on 3 legs (LEEA): governing tension W / (3 × cos a) = ${psN(pf.Tgov, 3)} Te`, 2.1, { bold: true, color: PSC.warn }); y += 4.5; }
    y += 2.5; sec('LOAD ON HOOK BLOCK');
    y = psTable(P, D.x, y, [{ w: 40, t: 'LOAD ON HOOK BLOCK (L_H)', a: 'c' }, { w: 14, t: 'UNITS', a: 'c' }, { w: 30, t: 'WEIGHT (W)', a: 'c' }, { w: 30, t: 'WEIGHT RIGGING', a: 'c' }, { w: 30, t: 'TOTAL', a: 'c' }],
      [['VERTICAL LOAD', 'Te', psN(pf.W, 3), psN(pf.rigW, 3), { t: psN(pf.hookLoad, 3), bold: true }]], { rh: 5, fs: 2.25, hh: 5 }) + 4;
  } else { psT(P, D.x, y + 3, 'Hook empty — no load forces to work out.', 2.6, { color: PSC.ink2 }); y += 8; }
  // formulas, definitions, assumptions (right)
  const fx = D.x + lw + 6, fw = D.x + D.w - fx; let fy = D.y;
  const box = (title, lines, o = {}) => { const top = fy; fy = psHead(P, fx, fy, fw, title, { fs: 2.6 }) + 2; lines.forEach((t, i) => { const pre = o.num ? `${i + 1}.` : '•'; psT(P, fx + 2, fy + 1.6, pre, 2.1, { bold: true, color: o.col }); fy += psWrap(P, fx + 7, fy, t, o.fs || 2.15, fw - 9, { color: o.col }) + 1; }); fy += 1.5; P.rect(fx, top, fw, fy - top, { fill: 'none', stroke: PSC.ink, w: 0.3, layer: 'SET' }); fy += 3; };
  box('GENERAL FORMULAS — REACTION LOADS', ['W = (Load + contingency) × D.A.F', 'Two lifting points (lever rule): R1 = W × D2 / (D1 + D2) and R2 = W × D1 / (D1 + D2), D = distance from the C.O.G.', 'Three or four lifting points: rigid-load plane — sum R = W, sum R·x = W·x_G, sum R·z = W·z_G; a point that would have to push goes slack.'], { num: true });
  box('GENERAL FORMULAS — TENSION LOADS', ['Hook straight above the C.O.G., H above the lifting points: angle from vertical a = atan(D / H).', 'Tension in each leg: T = R / cos a (leg length = square root of H² + D²).', 'Load on the hook block: L_H = W + weight of rigging under the hook block.', 'Sling check: T ≤ SWL = WLL × mode factor (choker 0.8, basket up to 2.0).'], { num: true });
  box('DEFINITIONS', ['R1…Rn: vertical reaction at lifting point 1…n.', 'T1…Tn: tension in the lifting appliance at lifting point 1…n.', 'W: weight of the load with contingency and D.A.F.', 'L_H: load carried by the crane hook block.', 'C.O.G.: the load\'s centre of gravity.'], { num: true });
  if (pf?.assumed?.length) box('ASSUMED — CHECK ON SITE', pf.assumed.map(a => a.charAt(0).toUpperCase() + a.slice(1) + '.'), { col: PSC.warn });
  if (pf && !pf.inside) box('C.O.G. OUTSIDE THE LIFTING POINTS', ['The load will tip until its centre of gravity is under the hook. Move the lifting points or re-rig before lifting.'], { col: PSC.fail });
  // location of forces (plan view), the tensions in 3D, and a small elevation of every leg
  if (!pf) return;
  const yb = Math.max(y + 2, fy - 2); const bh = D.y + D.h - yb - 9; if (bh < 40) return;
  const pb = { x: D.x, y: yb, w: 128, h: bh }, ib = { x: pb.x + pb.w + 3, y: yb, w: 92, h: bh }, tb = { x: ib.x + ib.w + 3, y: yb, w: D.x + D.w - ib.x - ib.w - 3, h: bh };
  [pb, ib, tb].forEach(q => psBox(P, q));
  const lL = Math.max(0.5, num(L.load.l, 2)), wd = num(L.load.wd) > 0 ? num(L.load.wd) : Math.max(pf.across + 0.3, Math.min(lL, num(L.load.h, 1.5)));
  const k = Math.min((pb.w - 36) / lL, (pb.h - 40) / wd); const cx = pb.x + pb.w / 2, cy = pb.y + pb.h / 2 - 2; const S2 = (x, z) => [cx + x * k, cy - z * k];
  { const a = S2(-lL / 2, wd / 2); P.rect(a[0] + 1.4, a[1] + 1.4, lL * k, wd * k, { fill: '#e2e8f0', stroke: 'none', layer: 'SET' }); P.rect(a[0], a[1], lL * k, wd * k, { fill: '#f8fafc', stroke: '#0f172a', w: 0.35, layer: 'SET' });
    P.line(a[0], cy, a[0] + lL * k, cy, { stroke: '#94a3b8', w: 0.12, dash: true, layer: 'SET' }); P.line(cx, a[1], cx, a[1] + wd * k, { stroke: '#94a3b8', w: 0.12, dash: true, layer: 'SET' });
    psT(P, cx, a[1] + wd * k - 2.4, String(L.load.name || 'LOAD').toUpperCase() + ' (FROM ABOVE)', 1.8, { anchor: 'middle', bold: true, color: PSC.ink2, maxW: lL * k - 10 }); }
  const G = S2(pf.cx, pf.cz);
  pf.pts.forEach(q => { const a = S2(q.x, q.z); P.line(a[0], a[1], G[0], G[1], { stroke: PSC.blue, w: 0.2, dash: true, layer: 'SET' }); const m = [(a[0] + G[0]) / 2, (a[1] + G[1]) / 2]; let rot = Math.atan2(G[1] - a[1], G[0] - a[0]) * R2D; if (rot > 90) rot -= 180; if (rot < -90) rot += 180; P.text(m[0], m[1] - 1, `D=${mm(q.d)}`, { size: 1.6, anchor: 'middle', rot, color: PSC.blue, bold: true, bg: '#f8fafc', layer: 'SET' }); });
  pf.pts.forEach(q => { const a = S2(q.x, q.z); P.rect(a[0] - 1.6, a[1] - 1.6, 3.2, 3.2, { fill: '#9ca3af', stroke: '#111827', w: 0.15, layer: 'SET' }); psReaction(P, a[0], a[1], 1.7); const up = q.z >= 0; psT(P, a[0], a[1] + (up ? -4.4 : 4.8), `${q.id} = ${psN(q.R, 3)} Te`, 2, { anchor: 'middle', bold: true, color: PSC.red, bg: '#ffffff' }); });
  cogSymbol(P, G[0], G[1], 2, 'SET'); psT(P, G[0] + 3, G[1] + 3.4, `W = ${psN(pf.W, 3)} Te`, 2, { bold: true, color: PSC.blue, bg: '#ffffff' });
  // set-out of the points and the C.O.G. from the load's middle
  const xs = [...new Set([...pf.pts.map(q => q.x), pf.cx])].sort((a, b) => a - b), zs = [...new Set([...pf.pts.map(q => q.z), pf.cz])].sort((a, b) => a - b);
  const yl = cy + wd * k / 2 + 6; for (let i = 0; i + 1 < xs.length; i++) if (xs[i + 1] - xs[i] > 0.01) dimA(P, [S2(xs[i], 0)[0], yl], [S2(xs[i + 1], 0)[0], yl], 0, String(mm(xs[i + 1] - xs[i])), { size: 1.8, side: 'down', extA: false, extB: false });
  for (const xx of xs) P.line(S2(xx, 0)[0], cy + wd * k / 2 + 0.6, S2(xx, 0)[0], yl + 1.2, { stroke: COL.red, w: 0.1, layer: 'DIM' });
  if (zs.length > 1) { const xl = cx + lL * k / 2 + 6; for (let i = 0; i + 1 < zs.length; i++) if (zs[i + 1] - zs[i] > 0.01) dimA(P, [xl, S2(0, zs[i])[1]], [xl, S2(0, zs[i + 1])[1]], 0, String(mm(zs[i + 1] - zs[i])), { size: 1.8, side: 'right', extA: false, extB: false });
    for (const zz of zs) P.line(cx + lL * k / 2 + 0.6, S2(0, zz)[1], xl + 1.2, S2(0, zz)[1], { stroke: COL.red, w: 0.1, layer: 'DIM' }); }
  dimA(P, S2(-lL / 2, -wd / 2), S2(lL / 2, -wd / 2), 13, String(mm(lL)), { side: 'down', size: 1.9 });
  psT(P, pb.x + 2, pb.y + 3, pf.off ? `C.O.G. ${mm(pf.cx)} mm ALONG, ${mm(pf.cz)} mm ACROSS FROM THE MIDDLE` : 'C.O.G. IN THE MIDDLE OF THE LOAD', 1.7, { bold: true, color: PSC.ink2, maxW: pb.w - 4 });
  psCaption(P, pb.x + pb.w / 2, pb.y + pb.h + 4.4, 'LOCATION OF FORCES (PLAN VIEW)', 'DISTANCES IN mm');
  psRigIso(P, ib, L, { tension: true }); psCaption(P, ib.x + ib.w / 2, ib.y + ib.h + 4.4, 'TENSION FORCES (ISOMETRIC)', 'NOT TO SCALE');
  // one small elevation per leg: hook straight above the C.O.G., the leg to its lifting point, the angle from vertical
  const n = pf.pts.length, nc = n > 2 ? 2 : n, nr = Math.ceil(n / nc), cw = tb.w / nc, ch = tb.h / nr; const lH2 = Math.max(0.4, num(L.load.h, 1.5));
  const dmax = Math.max(0.3, ...pf.pts.map(q => q.d)); const kk = Math.min((cw - 12) / (2 * dmax + 0.8), (ch - 18) / (pf.H + Math.min(lH2, pf.H * 0.4)));
  const slT = (L.res.stack?.items || []).filter(t => t.type === 'sling').pop() || { name: 'sling' };
  pf.pts.forEach((q, i) => { const ox = tb.x + cw * (i % nc), oy = tb.y + ch * Math.floor(i / nc); const hx = ox + cw / 2, hy = oy + 6; const dir = (q.x - pf.cx) + (q.z - pf.cz) * 0.001 >= 0 ? 1 : -1;
    const topY = hy + pf.H * kk, lh = Math.min(lH2, pf.H * 0.4) * kk, px = hx + dir * q.d * kk;
    psLoadFront(P, hx - (dmax + 0.4) * kk, topY, (2 * dmax + 0.8) * kk, lh, L.load.shape || 'box');
    psPadeye(P, px, topY, Math.max(1, Math.min(2, 0.2 * kk)));
    P.line(hx, hy, hx, topY + lh / 2, { stroke: '#64748b', w: 0.15, dash: true, layer: 'SET' }); cogSymbol(P, hx, topY + lh / 2, Math.min(1.3, Math.max(0.8, lh * 0.25)), 'SET');
    psSling(P, [hx, hy], [px, topY], psSlingKind(slT), psSlingCol(slT), 1);
    P.poly([[hx - 1.6, hy - 3.2], [hx + 1.6, hy - 3.2], [hx + 1, hy], [hx - 1, hy]], { closed: true, fill: '#facc15', stroke: '#111827', w: 0.2, layer: 'SET' });
    const ra = Math.min(7, pf.H * kk * 0.4); P.arc(hx, hy, ra, 270, 270 + dir * q.beta, { stroke: PSC.red, w: 0.22, layer: 'SET' });
    psT(P, hx + dir * (ra * 0.55 + 2.4), hy + ra + 1.8, `${psN(q.beta, 2)}°`, 1.9, { anchor: dir > 0 ? 'start' : 'end', bold: true, color: PSC.red, bg: '#ffffff' });
    psT(P, hx, oy + ch - 5.4, `T${i + 1} = ${psN(q.T, 3)} Te`, 2.1, { anchor: 'middle', bold: true, color: PSC.blue }); psT(P, hx, oy + ch - 2.6, `${q.id} ${psN(q.R, 3)} Te · LEG ${psN(q.L, 2)} m`, 1.45, { anchor: 'middle', color: PSC.ink3 });
    if (i % nc) P.line(ox, oy + 3, ox, oy + ch - 3, { stroke: PSC.hair, w: 0.15, layer: 'SET' }); if (Math.floor(i / nc)) P.line(ox + 3, oy, ox + cw - 3, oy, { stroke: PSC.hair, w: 0.15, layer: 'SET' }); });
  psCaption(P, tb.x + tb.w / 2, tb.y + tb.h + 4.4, 'TENSION FORCES — ANGLE FROM VERTICAL', `HOOK ${psN(pf.H, 2)} m ABOVE THE LIFTING POINTS`);
}

// ---------- crane capacity: the chart, the capacity curve, the numbers ----------
function psCapCurve(P, b, L, X) {
  const r = L.res, parsed = L.parsed, ci = Math.max(0, num(r.ci)); const S = X.S;
  psBox(P, b, { fill: '#ffffff' });
  if (!parsed || !parsed.cols[ci]) { psT(P, b.x + b.w / 2, b.y + b.h / 2, 'No load chart in the library — capacity typed by hand', 2.6, { anchor: 'middle', color: PSC.ink2 }); return; }
  const pts = parsed.rows.map(row => [row[0], row[1 + ci]]).filter(([R, c]) => c != null && isFinite(c) && c > 0);
  if (pts.length < 2) return;
  const Rmax = Math.max(...pts.map(q => q[0]), r.R) * 1.05, Cmax = Math.max(...pts.map(q => q[1]), r.design || 0) * 1.1;
  const pl = { x: b.x + 14, y: b.y + 10, w: b.w - 20, h: b.h - 22 }; const X_ = (R) => pl.x + R / Rmax * pl.w, Y_ = (c) => pl.y + pl.h - c / Cmax * pl.h;
  // grid
  const stepR = Rmax > 60 ? 10 : Rmax > 30 ? 5 : 2, stepC = [1, 2, 5, 10, 20, 25, 50, 100].find(s => Cmax / s <= 8) || 200;
  for (let R = 0; R <= Rmax; R += stepR) { P.line(X_(R), pl.y, X_(R), pl.y + pl.h, { stroke: '#e2e8f0', w: 0.15, layer: 'SET' }); psT(P, X_(R), pl.y + pl.h + 2.6, String(R), 1.8, { anchor: 'middle', color: PSC.ink2 }); }
  for (let c = 0; c <= Cmax; c += stepC) { P.line(pl.x, Y_(c), pl.x + pl.w, Y_(c), { stroke: '#e2e8f0', w: 0.15, layer: 'SET' }); psT(P, pl.x - 1.5, Y_(c), String(c), 1.8, { anchor: 'end', color: PSC.ink2 }); }
  P.rect(pl.x, pl.y, pl.w, pl.h, { fill: 'none', stroke: PSC.ink, w: 0.3, layer: 'SET' });
  psT(P, pl.x + pl.w / 2, pl.y + pl.h + 6.4, 'RADIUS (m)', 1.9, { anchor: 'middle', bold: true, color: PSC.ink2 }); psT(P, b.x + 3.5, pl.y + pl.h / 2, 'CAPACITY (t)', 1.9, { anchor: 'middle', bold: true, color: PSC.ink2, rot: -90 });
  // limit curves (stop / careful) and the chart itself as a step line (the chart value holds to the next radius)
  const step = (f) => { const segs = []; for (let i = 0; i < pts.length; i++) { const [R0, c] = pts[i], R1 = i + 1 < pts.length ? pts[i + 1][0] : R0; const prev = i ? pts[i - 1][0] : R0; segs.push([X_(prev), Y_(c * f), X_(R0), Y_(c * f)]); if (i + 1 < pts.length) segs.push([X_(R0), Y_(c * f), X_(R0), Y_(pts[i + 1][1] * f)]); } return segs; };
  P.path(step(num(S.utilMax, 90) / 100), { stroke: PSC.fail, w: 0.3, dash: true, layer: 'SET' }); P.path(step(num(S.utilWarn, 75) / 100), { stroke: PSC.warn, w: 0.3, dash: true, layer: 'SET' });
  P.path(step(1), { stroke: PSC.head, w: 0.7, layer: 'SET' });
  if (r.design) { P.line(pl.x, Y_(r.design), pl.x + pl.w, Y_(r.design), { stroke: PSC.blue, w: 0.35, layer: 'SET' }); psT(P, pl.x + pl.w - 1, Y_(r.design) - 2, `LOAD ON HOOK ${psN(r.design, 2)} t`, 1.9, { anchor: 'end', bold: true, color: PSC.blue, bg: '#ffffff' }); }
  if (r.cap != null) { const ox = X_(r.R), oy = Y_(r.cap); P.line(ox, pl.y + pl.h, ox, oy, { stroke: PSC.mag, w: 0.25, dash: true, layer: 'SET' }); P.circle(ox, Y_(r.design), 1.4, { fill: PSC.mag, stroke: '#ffffff', w: 0.3, layer: 'SET' }); P.circle(ox, oy, 1.1, { fill: '#ffffff', stroke: PSC.head, w: 0.4, layer: 'SET' });
    psT(P, ox + 2, oy - 2.4, `${psN(r.cap, 2)} t @ ${psN(r.R, 1)} m`, 2, { bold: true, bg: '#ffffff' }); }
  // key
  const kx = pl.x + 3; let ky = pl.y + 3; [[PSC.head, false, `CHART — ${colName(parsed.cols[ci])} m BOOM`], [PSC.warn, true, `CAREFUL ABOVE ${num(S.utilWarn, 75)}%`], [PSC.fail, true, `STOP ABOVE ${num(S.utilMax, 90)}%`], [PSC.blue, false, 'LOAD ON THE HOOK (× DAF)']].forEach(([c, d, t]) => { P.line(kx, ky, kx + 6, ky, { stroke: c, w: 0.6, dash: d, layer: 'SET' }); psT(P, kx + 8, ky, t, 1.8, { bold: true, color: PSC.ink2, bg: '#ffffff' }); ky += 3.4; });
}
function psCapacity(pg, X, L) {
  const P = pg.P, D = PS_DA; const r = L.res, ch = L.ch, parsed = L.parsed; const S = X.S;
  const need = parsed ? (17 + 6.5 * (parsed.rows.length + 3)) / PS_K + 2 : 60; const cb = { x: D.x, y: D.y + 8, w: 196, h: Math.min(D.h - 8, need) };
  psT(P, D.x, D.y + 3, `LOAD CHART — ${String(L.model).toUpperCase()}${ch ? ' · ' + String(ch.name).toUpperCase() : ''}`, 2.7, { bold: true, maxW: cb.w });
  if (parsed && parsed.cols.length) psEmbed(pg, cb, (Ps, b) => drawChartTable(Ps, b, L.crane, ch, parsed, [{ ci: Math.max(0, num(r.ci)), row: num(r.capInfo?.row, r.R) }], null));
  else { psBox(P, cb); psT(P, cb.x + cb.w / 2, cb.y + cb.h / 2, 'No load chart in the library — capacity typed by hand', 2.8, { anchor: 'middle', color: PSC.ink2 }); }
  const dh = D.y + D.h - (cb.y + cb.h) - 12; if (dh > 55) { const db = { x: D.x, y: cb.y + cb.h + 8, w: cb.w, h: dh }; psT(P, D.x, db.y - 3, `CRANE DIMENSIONS — ${String(L.model).toUpperCase()}`, 2.7, { bold: true }); psBox(P, db); psEmbed(pg, db, (Ps, b) => drawCraneDims(Ps, b, L.crane)); }
  const rx = cb.x + cb.w + 4, rw = D.x + D.w - rx; let y = D.y;
  y = psHead(P, rx, y, rw, 'CAPACITY CURVE AT THE SELECTED BOOM');
  psCapCurve(P, { x: rx, y, w: rw, h: 92 }, L, X); y += 95;
  const uc = r.util == null ? 'fail' : r.util > num(S.utilMax, 90) ? 'fail' : r.util > num(S.utilWarn, 75) ? 'warn' : 'ok';
  y = psTable(P, rx, y, [{ w: rw - 30, a: 'l' }, { w: 30, a: 'r' }], [
    ['Chart capacity at the radius', r.cap != null ? `${psN(r.cap, 2)} t` : '—'], ['How the chart was read', r.capInfo?.manual ? 'typed by hand' : r.capInfo?.wind ? 'at the wind drift' : r.capInfo?.between ? 'lower of two booms' : r.capInfo?.rounded ? `next radius up (${r.capInfo.row} m)` : r.capInfo?.curve ? 'curve fit' : 'chart value'],
    ['Hook block + rigging + deductions', r.ded != null ? `${psN(r.ded, 2)} t` : '—'], [{ t: 'Net capacity for the load', bold: true }, { t: r.netCap != null ? `${psN(r.netCap, 2)} t` : '—', bold: true }], ['Load + contingency', `${psN(r.W + r.contW, 2)} t`],
    ['Total on the hook × D.A.F', `${psN(r.design, 2)} t`], [{ t: '% of chart capacity', bold: true }, { t: r.util != null ? `${psN(r.util, 2)}%` : '—', bold: true, color: psSt(uc)[0], fill: psSt(uc)[1] }], ['Safety factor (capacity ÷ load)', r.sf != null ? psN(r.sf, 3) : '—'],
    ['Reeving capacity (line pull × falls)', r.reeve ? `${psN(r.reeve, 2)} t · ${psN(r.reeveUtil, 1)}%` : 'line pull not entered'], ['Careful above / stop above', `${num(S.utilWarn, 75)}% / ${num(S.utilMax, 90)}%`]], { title: 'CAPACITY CHECK', rh: 4.7, fs: 2.1 });
  y += 3; const w = r.wind;
  y = psTable(P, rx, y, [{ w: rw - 30, a: 'l' }, { w: 30, a: 'r' }], w ? [
    ['Wind area × shape factor', `${psN(w.area, 1)} × ${psN(w.cw, 1)} = ${psN(w.AW, 1)} m²`], ['Chart wind limit v_chart', `${psN(w.vTab, 1)} m/s`], ['Allowed for this load v_perm', `${psN(w.vPerm, 1)} m/s`], ['Gust at the boom head', w.vDes != null ? `${psN(w.vDes, 1)} m/s` : 'no forecast'], ['Load swing-out in that gust', `${psN(w.dR, 2)} m`]]
    : [['Chart wind limit (boom head)', `${psN(windTabOf(X.plan), 1)} m/s`], ['Wind area of the load', 'not entered — normal load (≤ 1.2 m²/t)'], ['Forecast gust at the boom head', X.calc.weather ? `${psN(X.calc.weather.maxG, 1)} m/s` : 'not added']], { title: 'WIND (EN 13000) — v_perm = v_chart × root(1.2 × m_H / A_W)', rh: 4.7, fs: 2.05, tfs: 2.4 });
  y += 3; const g0 = r.geo || {};
  y = psTable(P, rx, y, [{ w: rw - 34, a: 'l' }, { w: 34, a: 'r' }], [['Boom length', `${psBoomTxt(L)} m`], [g0.kind === 'luffing' ? 'Jib angle' : 'Boom angle', `${psN(g0.kind === 'luffing' ? g0.gamma : g0.theta, 1)}°`], ['Boom head height', `${psN(r.tipY, 2)} m`], ['Counterweight', `${psN(L.cwt, 1)} t`], ['Outriggers', `${outExtLabel(outExtOf(L.pv))} · ${L.ch?.outrigger || L.crane.outrigger || ''}`], ['Slewing range of the chart', L.ch ? chartSectorLabel(L.ch) : '—'], ['Lift side', SIDE_NAME[sideOf(L.load)]], ['Rope falls', String(r.ropeInfo?.falls || '—')]], { title: 'CRANE CONFIGURATION FOR THIS LIFT', rh: 4.6, fs: 2.05, tfs: 2.5 });
  if (ch?.verify) { y += 3; P.rect(rx, y, rw, 9, { fill: PSC.warnBg, stroke: PSC.warn, w: 0.4, layer: 'SET' }); psT(P, rx + rw / 2, y + 3.2, 'UNVERIFIED CHART', 2.8, { anchor: 'middle', bold: true, color: PSC.warn }); psT(P, rx + rw / 2, y + 6.8, 'Transcribed from a public datasheet — check against the crane\'s own chart.', 1.8, { anchor: 'middle', color: PSC.warn, maxW: rw - 4 }); }
}

// ---------- outrigger loads & ground bearing (one per crane) ----------
function psSweepChart(P, b, O, Lx, res) {
  psBox(P, b, { fill: '#ffffff' });
  const pl = { x: b.x + 13, y: b.y + 9, w: b.w - 18, h: b.h - 21 };
  const th = Array.from({ length: 73 }, (_, i) => i * 5); const data = th.map(t => outAt(O.mm, O.pads, res.geo, t, Lx.hookT, Lx.R).R);
  const vmax = Math.max(1, ...data.flatMap(d => OUT_PADS.map(id => d[id]))) * 1.12;
  const X_ = (t) => pl.x + t / 360 * pl.w, Y_ = (v) => pl.y + pl.h - v / vmax * pl.h; const step = [5, 10, 20, 25, 50, 100].find(s => vmax / s <= 7) || 200;
  for (let t = 0; t <= 360; t += 45) { P.line(X_(t), pl.y, X_(t), pl.y + pl.h, { stroke: '#e2e8f0', w: 0.15, layer: 'SET' }); psT(P, X_(t), pl.y + pl.h + 2.6, t + '°', 1.7, { anchor: 'middle', color: PSC.ink2 }); }
  for (let v = 0; v <= vmax; v += step) { P.line(pl.x, Y_(v), pl.x + pl.w, Y_(v), { stroke: '#e2e8f0', w: 0.15, layer: 'SET' }); psT(P, pl.x - 1.4, Y_(v), String(v), 1.7, { anchor: 'end', color: PSC.ink2 }); }
  P.rect(pl.x, pl.y, pl.w, pl.h, { fill: 'none', stroke: PSC.ink, w: 0.3, layer: 'SET' });
  const cols = { FR: '#dc2626', FL: '#2563eb', RL: '#16a34a', RR: '#d97706' };
  OUT_PADS.forEach(id => { const segs = []; for (let i = 1; i < th.length; i++) segs.push([X_(th[i - 1]), Y_(data[i - 1][id]), X_(th[i]), Y_(data[i][id])]); P.path(segs, { stroke: cols[id], w: 0.55, layer: 'SET' }); });
  const lt = Lx.theta; P.line(X_(lt), pl.y, X_(lt), pl.y + pl.h, { stroke: PSC.mag, w: 0.35, dash: true, layer: 'SET' }); psT(P, X_(lt) + 1, pl.y + 3, `LIFT (${SIDE_NAME[Lx.side]})`, 1.8, { bold: true, color: PSC.mag, bg: '#ffffff' });
  OUT_PADS.forEach((id, i) => { const kx = pl.x + 3 + i * 14; P.line(kx, pl.y + pl.h - 3, kx + 4, pl.y + pl.h - 3, { stroke: cols[id], w: 0.8, layer: 'SET' }); psT(P, kx + 5, pl.y + pl.h - 3, id, 1.8, { bold: true, bg: '#ffffff' }); });
  psT(P, pl.x + pl.w / 2, pl.y + pl.h + 6.2, 'SLEW ANGLE (0° = BOOM OVER THE FRONT, CCW)', 1.8, { anchor: 'middle', bold: true, color: PSC.ink2 }); psT(P, b.x + 3.4, pl.y + pl.h / 2, 'LEG LOAD (t)', 1.8, { anchor: 'middle', bold: true, color: PSC.ink2, rot: -90 });
}
function psOutrig(pg, X, L) {
  const P = pg.P, D = PS_DA; const O = L.O, r = L.res; const g = X.ground(L); const op = X.plan.outrigger || {};
  const sb = { x: D.x, y: D.y, w: 128, h: D.h - 10 }; psBox(P, sb);
  psSupport(P, sb, L, X, { press: true, top: 30 }); psCaption(P, sb.x + sb.w / 2, sb.y + sb.h + 4.4, 'OUTRIGGER PLAN — LEG LOADS', 'DIMENSIONS IN mm');
  const rx = sb.x + sb.w + 4, rw = D.x + D.w - rx; let y = D.y;
  const Lx = O?.lifts?.find(q => q.li === L.li) || O?.lifts?.[0];
  if (O && Lx) { y = psHead(P, rx, y, rw, `LEG LOADS THROUGH A FULL SLEW — ${psN(Lx.hookT, 2)} t AT ${psN(Lx.R, 1)} m`); psSweepChart(P, { x: rx, y, w: rw, h: 78 }, O, Lx, Lx.res || r); y += 81; }
  if (O) {
    const rows = OUT_PADS.map(id => { const v = O.used[id], q = g?.pads?.[id]; const s = g?.allow ? (q > g.allow ? 'fail' : q > 0.9 * g.allow ? 'warn' : 'ok') : 'info';
      return [{ t: `${id} · ${OUT_PAD_NAME[id].toUpperCase()}`, bold: true }, `${psN(v, 2)}${O.manual[id] != null ? ' *' : ''}`, psN(v * OUT_G, 1), psN(Lx?.at?.R?.[id], 2), q != null ? psN(q, 2) : '—', g?.allow ? `${psN(q / g.allow * 100, 0)}%` : '—', psStatusCell(s)]; });
    y = psTable(P, rx, y, [{ w: rw - 120, t: 'LEG', a: 'l' }, { w: 20, t: 'MAX LOAD\n(t)', a: 'c' }, { w: 18, t: 'MAX LOAD\n(kN)', a: 'c' }, { w: 20, t: 'AT THE LIFT\n(t)', a: 'c' }, { w: 22, t: 'PRESSURE\n(t/m²)', a: 'c' }, { w: 18, t: '% OF\nALLOWED', a: 'c' }, { w: 22, t: 'GROUND', a: 'c' }],
      rows, { title: 'OUTRIGGER REACTIONS & GROUND BEARING', rh: 5.2, fs: 2.15, hh: 7 }) + 3;
  }
  const lw2 = (rw - 4) / 2; let y1 = y, y2 = y;
  y1 = psTable(P, rx, y1, [{ w: lw2 - 24, a: 'l' }, { w: 24, a: 'r' }], g ? [
    ['Busiest leg load F', `${psN(g.P, 2)} t`], ['Source', { maker: "crane maker's figure", illus: 'TYPED — ILLUSTRATIVE', calc: 'calculated (model)', est: 'rough estimate' }[g.src] || '—'], ['Mat', `${g.mat} · ${psN(g.area, 2)} m²`], ['Mat weight · spread factor e', `${psN(g.self, 2)} t · ${psN(g.eff, 2)}`],
    [{ t: 'Pressure P = (F + mat) / (A × e)', bold: true }, { t: `${psN(g.press, 2)} t/m²`, bold: true }], ['Allowable (ground / engineer)', g.allow ? `${psN(g.allow, 2)} t/m²` : 'not entered'], ['Smallest square mat', g.side ? `${psN(g.side, 2)} m` : '—'],
    [{ t: 'GROUND BEARING', bold: true }, psStatusCell(g.pStatus || g.status)]] : [['Ground check', 'no leg model for this crane']], { title: 'GROUND BEARING CHECK', rh: 4.8, fs: 2.05, tfs: 2.6 });
  const sf = g?.surface; const tipRows = Lx ? [['Tipping load over the lift side (model)', Number.isFinite(Lx.tip) ? `${psN(Lx.tip, 1)} t` : 'never'], ['85% of the tipping load', Number.isFinite(Lx.rated) ? `${psN(Lx.rated, 1)} t` : '—'], ['On the hook (× DAF)', `${psN(Lx.hookT, 2)} t`], ['Stability used', `${psN(Lx.stabUtil, 1)}%`], ['Crane weights', O.est ? 'ESTIMATED' : "maker's figures"]] : [];
  y2 = psTable(P, rx + lw2 + 4, y2, [{ w: lw2 - 22, a: 'l' }, { w: 22, a: 'r' }], [['Pads stand on', sf ? sf.name : (op.ground ? op.ground : 'not chosen')], ['Typical value', sf ? (sf.kpa ? `${sf.kpa} kPa = ${psN(sf.kpa / OUT_G, 1)} t/m²` : sf.txt) : '—'], ...(sf?.struct ? [['Engineer approval ref.', g?.approval || 'NOT GIVEN']] : []), ...tipRows], { title: 'SURFACE & STABILITY', rh: 4.8, fs: 2.05, tfs: 2.6 });
  y = Math.max(y1, y2) + 3;
  const ref = Object.entries(GROUND_GROUPS).flatMap(([gk, gt]) => GROUND_PRESETS.filter(q => (q[4] || 'soil') === gk && gk !== 'soil').map(q => ({ q, gt }))).concat(GROUND_PRESETS.filter(q => ['dgravel', 'csand', 'sclay', 'soft', 'rock', 'sabkha'].includes(q[0])).map(q => ({ q, gt: GROUND_GROUPS.soil })));
  const refRows = ref.map(({ q }) => { const on = op.ground === q[0]; return { cells: [{ t: q[1], bold: on }, q[2] ? `${q[2]} kPa · ${psN(q[2] / OUT_G, 1)} t/m²` : { t: 'ENGINEER ONLY', bold: true, color: PSC.fail }], fill: on ? PSC.infoBg : undefined }; });
  const tipsY = D.y + D.h - refRows.length * 3.8 - 16;
  const tips = [sf?.tip, 'Check under every pad for voids, services, trenches, soft spots and slab edges. Mats level and fully bearing; leg in the middle of its mat.', 'Planning model: the crane maker\'s outrigger data and a competent ground assessment govern.'].filter(Boolean);
  if (y < tipsY - 14) { y = psHead(P, rx, y, rw, 'GROUND NOTES'); y += 1.5; for (const t of tips) { if (y > tipsY - 8) break; psDot(P, rx + 1.6, y + 1.5, sf?.struct ? PSC.fail : PSC.accent); y += psWrap(P, rx + 5, y, t, 2, rw - 6, { color: sf?.struct && t === sf.tip ? PSC.fail : PSC.ink, bold: sf?.struct && t === sf.tip }) + 1; } }
  if (y < tipsY + 2) psTable(P, rx, Math.max(y + 2, tipsY), [{ w: rw - 52, t: 'SURFACE UNDER THE PADS', a: 'l' }, { w: 52, t: 'TYPICAL ALLOWABLE (GUIDE ONLY)', a: 'c' }], refRows, { title: 'STANDARD SURFACES — ROADS, SLABS, BRIDGES & GROUND', rh: 3.8, fs: 1.9, hh: 4, tfs: 2.4 });
}

// ---------- tandem lift ----------
function psTandem(pg, X, L) {
  const P = pg.P, D = PS_DA; const { plan, calc } = X; const T = L.res.tandem;
  const eb = { x: D.x, y: D.y, w: D.w, h: 150 }; psBox(P, eb);
  const el = psEmbed(pg, eb, (Ps, b) => drawTandemElevation(Ps, b, plan, calc, L.li, { title: false, livery: X.livery, padT: 30 }));
  psCaption(P, eb.x + eb.w / 2, eb.y + eb.h + 4.4, `TANDEM LIFT — ${T.picks.length} CRANES — ELEVATION ALONG THE LOAD`, el?.scale ? `SCALE 1:${el.scale.N * PS_K} (A3) · DEVELOPED VIEW` : 'DEVELOPED VIEW');
  let y = eb.y + eb.h + 10;
  const sb = { x: D.x, y, w: 120, h: D.y + D.h - y - 9 }; psBox(P, sb);
  const sp = psEmbed(pg, sb, (Ps, b) => drawSitePlan(Ps, b, plan, calc, { livery: X.livery, labels: false }));
  psCaption(P, sb.x + sb.w / 2, sb.y + sb.h + 4.4, 'TANDEM — PLAN VIEW', sp?.scale ? `SCALE 1:${sp.scale.N * PS_K} (A3)` : '');
  const rx = sb.x + sb.w + 4, rw = D.x + D.w - rx;
  y = psTable(P, rx, y, [{ w: 12, t: 'CRANE', a: 'c' }, { w: rw - 12 - 132, t: 'MODEL', a: 'l' }, { w: 16, t: 'PICK AT\n(m)', a: 'c' }, { w: 22, t: 'SHARE\n(t)', a: 'c' }, { w: 14, t: '%\nOF LOAD', a: 'c' }, { w: 16, t: 'RADIUS\n(m)', a: 'c' }, { w: 18, t: 'ON HOOK\n(t)', a: 'c' }, { w: 18, t: 'CHART\n(t)', a: 'c' }, { w: 14, t: '% CHART', a: 'c' }, { w: 14, t: 'LINE\n(°)', a: 'c' }],
    T.picks.map(q => { const s = q.util == null || q.util > T.derate ? 'fail' : q.util > T.derate * 0.9 ? 'warn' : 'ok'; return [`C${q.crane + 1}`, String(q.model || '').toUpperCase(), psN(q.x, 2), { t: psN(q.share, 3), bold: true }, psN(q.pct, 1), psN(q.Rnow ?? q.R, 2), psN(q.design, 2), psN(q.cap, 2), { t: q.util != null ? psN(q.util, 1) : '—', ...psStatusCell(s), t: q.util != null ? psN(q.util, 1) : '—' }, psN(Math.abs(q.lineAng), 1)]; }),
    { title: `LOAD SHARE — ${psN(T.W, 2)} t (WITH CONTINGENCY) · LIMIT ${T.derate}% OF EACH CRANE'S CHART`, rh: 5.2, fs: 2.1, hh: 7, tfs: 2.6 }) + 3;
  const lw = (rw - 4) / 2; let y1 = psHead(P, rx, y, lw, 'LOAD SHARE — FORMULAS', { fs: 2.4 }) + 1.5; const y0 = y;
  ['Two cranes (lever rule): R1 = W × D2 / (D1 + D2), R2 = W × D1 / (D1 + D2); D = distance from the C.O.G. to each lifting point.', 'Three or four cranes: rigid-load plane — sum R = W and sum R·x = W·x_G.', 'Each crane: share + its hook block and rigging (× DAF) ≤ the tandem limit of its chart.', 'Live moves (two cranes): the load hangs from two lines; tensions from force and moment balance.'].forEach(t => { psDot(P, rx + 1.6, y1 + 1.5, PSC.accent); y1 += psWrap(P, rx + 5, y1, t, 1.95, lw - 6) + 0.8; });
  P.rect(rx, y0, lw, y1 - y0 + 1, { fill: 'none', stroke: PSC.ink, w: 0.3, layer: 'SET' });
  let y2 = psHead(P, rx + lw + 4, y, lw, 'TANDEM RULES', { fs: 2.4 }) + 1.5;
  ['One lift supervisor directs every crane operator on one radio channel.', 'Move one motion at a time, slowly; keep the hoist lines plumb (stop above 3°).', 'Equal hoist speeds; no slewing of both cranes together unless planned.', 'Trial lift: raise 100–300 mm, hold, check both LMI readings against the plan.'].forEach(t => { psDot(P, rx + lw + 5.6, y2 + 1.5, PSC.accent); y2 += psWrap(P, rx + lw + 9, y2, t, 1.95, lw - 6) + 0.8; });
  P.rect(rx + lw + 4, y0, lw, y2 - y0 + 1, { fill: 'none', stroke: PSC.ink, w: 0.3, layer: 'SET' });
  y = Math.max(y1, y2) + 4;
  const ck = T.checks.slice(0, Math.max(0, Math.floor((D.y + D.h - y - 6) / 4.6)));
  if (ck.length) psTable(P, rx, y, [{ w: 18, t: 'STATUS', a: 'c' }, { w: rw - 18, t: 'TANDEM CHECK', a: 'l' }], ck.map(c => [psStatusCell(c.s), `${c.t}: ${c.m}`]), { rh: 4.6, fs: 1.95 });
}

// ---------- risk assessment & method statement ----------
function psRams(pg, X) {
  const P = pg.P, D = PS_DA; const { plan, calc, S } = X; const L = X.lifts[X.li0], r = L.res, l = L.load, T = r.tandem, crane = L.crane; const g = X.ground(L); const w = r.wind; const wx = calc.weather; const mc = num(S.minClearance, 1);
  const ck = psChecks(calc); const sOf = (re) => { const c = ck.filter(x => re.test(x.t)); return c.some(x => x.s === 'fail') ? 'fail' : c.some(x => x.s === 'warn') ? 'warn' : 'ok'; };
  const lvl = (s) => s === 'fail' ? { t: '4 × 5 = 20 HIGH', bold: true, color: PSC.fail, fill: PSC.failBg } : s === 'warn' ? { t: '2 × 5 = 10 MEDIUM', bold: true, color: PSC.warn, fill: PSC.warnBg } : { t: '1 × 5 = 5 LOW', bold: true, color: PSC.ok, fill: PSC.okBg };
  const hz = [
    ['Crane overturns or is overloaded', 'Operator, AP', `Chart ${L.ch ? L.ch.name : 'typed by hand'} at ${psN(T ? T.maxUtil : r.util, 1)}% (stop above ${T ? T.derate : num(S.utilMax, 90)}%). LMI set to this exact configuration. Net capacity ${psN(r.netCap, 2)} t for ${psN(r.W + r.contW, 2)} t.`, sOf(/Capacity|Chart|Tandem ·|Lift side|Geometry|Rope reeving/)],
    ['Outrigger or ground failure', 'Everyone nearby', `Legs ${outExtLabel(outExtOf(plan)).toLowerCase()} on ${g ? g.mat : 'mats'}${g?.surface ? ' on ' + g.surface.name.toLowerCase() : ''}; busiest leg ${g ? psN(g.P, 1) + ' t' : '—'}, ${g ? psN(g.press, 1) + ' t/m²' : '—'} against ${g?.allow ? psN(g.allow, 1) + ' t/m²' : 'an allowable not yet entered'}. Crane levelled; pads checked for voids and services.`, g ? (g.status === 'info' ? 'warn' : g.status) : 'warn'],
    ['Boom or load strikes a structure or power line', 'Public, workers', r.clearance != null ? `Closest gap ${psN(r.clearance, 2)} m (minimum ${mc} m). Signaller watches the gap; slew slowly near structures.` : 'No structures entered near the boom: walk the site and confirm; keep 6 m+ from live lines.', r.clearance != null ? (r.clearance <= 0 ? 'fail' : r.clearance < mc ? 'warn' : 'ok') : 'ok'],
    ['Rigging failure, load drops', 'Slinger, workers', `Certified tackle only, every item inspected and tagged (LOLER). Sling angles ≤ 60° from vertical; tag lines on the load. Tension per leg on the calculation sheet.`, sOf(/Sling|Headroom|Rigging|Tackle WLL/)],
    ['Wind and weather', 'Everyone', w ? `Load wind area ${psN(w.AW, 1)} m²: lift only up to ${psN(w.vPerm, 1)} m/s at the boom head (chart ${w.vTab} m/s).` : wx ? `Gusts ${psN(wx.maxG, 1)} m/s at the boom head against a ${wx.limit} m/s limit. Anemometer checked before and during the lift.` : 'Check the forecast and the crane\'s anemometer; stop above the chart wind limit.', w ? (w.vDes != null ? (w.vDes > w.vPerm ? 'fail' : w.vDes > 0.8 * w.vPerm ? 'warn' : 'ok') : 'warn') : wx ? wx.status : 'ok'],
    ['People struck by the load or the slewing crane', 'Workers, public', `Exclusion zone round the load path (radius ${psN(r.R, 1)} m) and the tail swing (${psN(num(crane.tail, 4), 1)} m) barriered. Nobody under a suspended load. One signaller in charge.`, 'ok'],
    ['Crane failure or operator error', 'Operator, AP', 'Crane inspected (daily checks, valid thorough examination). Competent, certified operator, briefed on this plan. LMI and limit switches tested before the lift.', 'ok'],
    ...(T ? [['Tandem: load moves between cranes', 'Everyone', `One lift supervisor directs both operators. Each crane at most ${T.derate}% of its chart; hoist lines plumb (stop above 3°); one motion at a time.`, sOf(/Tandem|Hoist line|Load tilt/)]] : [])
  ];
  let y = psTable(P, D.x, D.y, [{ w: 8, t: 'NO.', a: 'c' }, { w: 52, t: 'HAZARD', a: 'l' }, { w: 26, t: 'WHO IS AT RISK', a: 'c' }, { w: D.w - 8 - 52 - 26 - 32, t: 'CONTROL MEASURES', a: 'l' }, { w: 32, t: 'RESIDUAL RISK\n(L × S)', a: 'c' }],
    hz.map(([a, who, c, s], i) => ({ cells: [String(i + 1).padStart(2, '0'), { t: a, bold: true }, who, { wrap: c, size: 2 }, lvl(s)], h: 9.6 })), { title: 'RISK ASSESSMENT — RESIDUAL RISK AFTER CONTROLS', rh: 5, fs: 2.1, hh: 7 }) + 4;
  const tip = r.tipY != null ? `${psN(r.tipY, 1)} m` : '—', ang = r.geo?.theta != null ? `${psN(r.geo.theta, 1)}°` : '—';
  const steps = [
    `Permit to work, toolbox talk and lift briefing for everyone involved. Confirm the weather (${w ? 'stop above ' + psN(w.vPerm, 1) + ' m/s' : wx ? 'limit ' + wx.limit + ' m/s' : 'chart wind limit'}) and the ground.`,
    `Barrier the exclusion zone and the tail swing. Check the access route and the set-up area for services, voids and overhead lines.`,
    `Set up the ${crane.model} as on the general arrangement: legs ${outExtLabel(outExtOf(plan)).toLowerCase()} on ${g ? g.mat : 'the planned mats'}, level, counterweight ${psN(L.cwt, 1)} t, boom ${psBoomTxt(L)} m. Set the LMI to this configuration.`,
    `Rig the load with the tackle on the rigging sheet; check every WLL, certificate and colour code. Fit tag lines.`,
    `Trial lift 100–300 mm: hold, check the brakes, the LMI reading and the legs. Lower and correct anything that moves.`,
    `Lift over the ${SIDE_WORD[sideOf(l)]} at ${psN(r.R, 2)} m radius (boom ${ang}, boom head ${tip}). Slew slowly; the signaller keeps sight of the load${T ? '; the lift supervisor calls each crane in turn' : ''}.`,
    `Land on ${psN(r.landY, 2)} m, take the weight off slowly, check the load is stable, then de-rig.`,
    `STOP if the LMI warns, the ground moves, the wind rises above the limit, visibility is lost or anyone is unsure. Make safe and tell the AP.`];
  const mw = 200; let my = psHead(P, D.x, y, mw, 'METHOD STATEMENT — SEQUENCE OF WORK') + 2; const ms = my - 2;
  steps.forEach((t, i) => { P.circle(D.x + 4, my + 1.7, 2, { fill: PSC.head, stroke: 'none', layer: 'SET' }); psT(P, D.x + 4, my + 1.7, String(i + 1), 1.9, { anchor: 'middle', bold: true, color: '#ffffff' }); my += Math.max(4.4, psWrap(P, D.x + 8, my, t, 2.05, mw - 10) + 1.4); });
  P.rect(D.x, ms - 6, mw, my - ms + 7, { fill: 'none', stroke: PSC.ink, w: 0.3, layer: 'SET' });
  const sx = D.x + mw + 4, sw = D.x + D.w - sx; let sy = y;
  sy = psTable(P, sx, sy, [{ w: 34, a: 'l' }, { w: sw - 34, a: 'l' }], [[{ t: 'Appointed Person', bold: true }, String(plan.meta?.checkedBy || '').toUpperCase()], [{ t: 'Lift supervisor', bold: true }, ''], [{ t: 'Crane operator(s)', bold: true }, ''], [{ t: 'Slinger / signaller', bold: true }, ''], [{ t: 'Radio channel', bold: true }, ''], [{ t: 'Emergency contact', bold: true }, '']].map(c => ({ cells: c, h: 5.6 })), { title: 'LIFT TEAM', rh: 5.4, fs: 2.1, zebra: false }) + 4;
  sy = psHead(P, sx, sy, sw, 'STOP THE LIFT IF') + 2;
  ['The LMI warns or cuts out', 'Wind at the boom head goes over the limit', 'A pad sinks, a mat cracks or the crane goes off level', 'Anyone enters the exclusion zone', 'Signals are lost or anyone is unsure'].forEach(t => { psDot(P, sx + 2, sy + 1.5, PSC.fail); sy += psWrap(P, sx + 6, sy, t, 2.05, sw - 8) + 0.8; });
  // bottom row: risk matrix, PPE, emergency arrangements
  const by = Math.max(my + 6, sy + 4); const bh = D.y + D.h - by; if (bh < 50) return;
  const mxw = 104; psHead(P, D.x, by, mxw, 'RISK MATRIX — LIKELIHOOD × SEVERITY');
  const cell = Math.min((mxw - 42) / 5, (bh - 22) / 5); const gx = D.x + 18, gy = by + 9;
  for (let li = 0; li < 5; li++) for (let si = 0; si < 5; si++) { const Lk = 5 - li, Sv = si + 1, v = Lk * Sv; const c = v >= 15 ? '#fca5a5' : v >= 8 ? '#fde68a' : '#bbf7d0';
    P.rect(gx + si * cell, gy + li * cell, cell, cell, { fill: c, stroke: '#ffffff', w: 0.4, layer: 'SET' }); psT(P, gx + si * cell + cell / 2, gy + li * cell + cell / 2, String(v), 2.4, { anchor: 'middle', bold: true, color: PSC.ink }); }
  ['ALMOST CERTAIN', 'LIKELY', 'POSSIBLE', 'UNLIKELY', 'RARE'].forEach((t, i) => psT(P, gx - 1.5, gy + i * cell + cell / 2, `${5 - i} ${t}`, 1.45, { anchor: 'end', bold: true, color: PSC.ink2, maxW: 15 }));
  ['MINOR', 'MODERATE', 'SERIOUS', 'MAJOR', 'FATAL'].forEach((t, i) => psT(P, gx + i * cell + cell / 2, gy + 5 * cell + 2.4, `${i + 1} ${t}`, 1.45, { anchor: 'middle', bold: true, color: PSC.ink2, maxW: cell }));
  psT(P, gx + 5 * cell + 2, gy + 4, '15–25 HIGH', 1.7, { bold: true, color: PSC.fail }); psT(P, gx + 5 * cell + 2, gy + 8, '8–12 MEDIUM', 1.7, { bold: true, color: PSC.warn }); psT(P, gx + 5 * cell + 2, gy + 12, '1–6 LOW', 1.7, { bold: true, color: PSC.ok });
  const px = D.x + mxw + 4, pw = 92; let ppy = psHead(P, px, by, pw, 'PPE — EVERYONE IN THE LIFT AREA') + 2;
  ['Safety helmet with chin strap', 'Safety boots (toe caps)', 'High-visibility vest or coverall', 'Rigger gloves for slingers', 'Safety glasses', 'Harness and lanyard when working at height', 'Radio for the lift team'].forEach(t => { P.rect(px + 1.5, ppy + 0.4, 2.6, 2.6, { fill: PSC.ok, stroke: 'none', layer: 'SET' }); P.path([[px + 2.1, ppy + 1.8, px + 2.6, ppy + 2.4], [px + 2.6, ppy + 2.4, px + 3.6, ppy + 1.1]], { stroke: '#ffffff', w: 0.35, layer: 'SET' }); ppy += psWrap(P, px + 6, ppy, t, 2, pw - 8) + 1; });
  const ex = px + pw + 4, ew = D.x + D.w - ex; let ey = psHead(P, ex, by, ew, 'EMERGENCY ARRANGEMENTS') + 2;
  ['STOP the lift on any alarm: lower the load if safe, else hold it and clear the area below.', 'Crane failure with a suspended load: keep the zone clear, call the AP and the crane supplier; never rescue the load with another crane without a new plan.', 'Injury: first aider and site emergency number; keep the access route clear for the ambulance.', 'Fire / overturn: evacuate to the assembly point, account for everyone, isolate the area.'].forEach(t => { psDot(P, ex + 1.6, ey + 1.5, PSC.fail); ey += psWrap(P, ex + 5, ey, t, 2, ew - 7) + 1.2; });
}

// ---------- pre-lift checklist, every calculated check, sign-off ----------
function psChecklist(pg, X) {
  const P = pg.P, D = PS_DA; const { plan, calc } = X;
  const groups = [['DOCUMENTS', ['Lift plan approved and signed by the AP', 'Permit to work issued and displayed', 'Crane thorough examination certificate in date', 'Operator and slinger/signaller certificates checked', 'Rigging certificates (LOLER) for every item']],
    ['CRANE', ['Daily checks done and logged', 'LMI set to the planned configuration and tested', 'Counterweight and boom as on the plan', 'Hoist rope, hook latch and limit switches checked']],
    ['GROUND & SET-UP', ['Ground / surface checked against the plan (see ground sheet)', 'Mats as specified, level and fully bearing', 'Crane level (bubble) on all four legs', 'Clear of services, voids, trenches and slab edges']],
    ['RIGGING & LOAD', ['Load weight and C.O.G. confirmed', 'Tackle as listed, inspected and tagged', 'Sling angles and lengths as calculated', 'Tag lines fitted; loose items removed from the load']],
    ['AREA & PEOPLE', ['Exclusion zone and tail swing barriered', 'Overhead lines / structures checked', 'Toolbox talk held, everyone signed in', 'Radio check: one signaller in charge']],
    ['WEATHER', ['Wind at boom-head height under the limit', 'No lightning; visibility good', 'Weather re-checked just before the lift']]];
  const cw = 108; let y = psHead(P, D.x, D.y, cw, 'PRE-LIFT CHECKLIST — TICK BEFORE LIFTING') + 2;
  for (const [h, items] of groups) { psT(P, D.x + 1, y + 2, h, 2.2, { bold: true, color: PSC.blue }); y += 4.4; for (const t of items) { P.rect(D.x + 1.5, y + 0.4, 2.8, 2.8, { fill: '#ffffff', stroke: PSC.ink, w: 0.25, layer: 'SET' }); y += Math.max(3.8, psWrap(P, D.x + 6, y, t, 1.95, cw - 8) + 0.6); } y += 1.2; }
  P.rect(D.x, D.y, cw, y - D.y + 1, { fill: 'none', stroke: PSC.ink, w: 0.3, layer: 'SET' });
  const rx = D.x + cw + 4, rw = D.x + D.w - rx; const ck = psChecks(calc);
  const maxRows = Math.floor((D.h - 70) / 4.4); const shown = ck.slice(0, maxRows);
  let ry = psTable(P, rx, D.y, [{ w: 16, t: 'STATUS', a: 'c' }, { w: 44, t: 'CHECK', a: 'l' }, { w: rw - 60, t: 'RESULT', a: 'l' }], shown.map(c => [psStatusCell(c.s), { t: c.t, bold: true }, String(c.m || '')]), { title: `CALCULATED CHECKS — ${ck.filter(c => c.s === 'fail').length} FAIL · ${ck.filter(c => c.s === 'warn').length} TO CHECK · ${ck.filter(c => c.s === 'ok').length} PASS`, rh: 4.4, fs: 1.85, tfs: 2.6 });
  if (ck.length > shown.length) { psT(P, rx, ry + 2.2, `… and ${ck.length - shown.length} more — see the app.`, 1.9, { color: PSC.ink3 }); ry += 4; }
  ry += 4;
  psTable(P, rx, ry, [{ w: 40, t: 'NAME', a: 'l' }, { w: 40, t: 'COMPANY / ROLE', a: 'l' }, { w: rw - 100, t: 'SIGNATURE', a: 'l' }, { w: 20, t: 'DATE', a: 'c' }],
    Array.from({ length: Math.max(4, Math.min(24, Math.floor((D.y + D.h - ry - 14) / 6.2))) }, () => ({ cells: ['', '', '', ''], h: 6.2 })), { title: 'TOOLBOX TALK & LIFT BRIEFING — ATTENDANCE', rh: 6, fs: 2, zebra: false });
  // final go / no-go under the checklist
  const ay = y + 6; if (ay < D.y + D.h - 40) { let yy = psHead(P, D.x, ay, cw, 'AUTHORISATION TO LIFT'); const cols = [{ w: 36, a: 'l' }, { w: cw - 36, a: 'l' }];
    yy = psTable(P, D.x, yy, cols, [[{ t: 'All checks above done', bold: true }, '[   ] YES        [   ] NO'], [{ t: 'Lift may proceed', bold: true }, '[   ] GO          [   ] NO-GO'], [{ t: 'Appointed Person', bold: true }, ''], [{ t: 'Signature / time', bold: true }, ''], [{ t: 'Lift supervisor', bold: true }, ''], [{ t: 'Signature / time', bold: true }, '']].map(c => ({ cells: c, h: 6.4 })), { rh: 6.4, fs: 2.1, zebra: false }); }
}

// ---------- build the whole set ----------
function psRefs(plan, X) {
  const own = String(plan.meta?.refs || '').split('\n').map(s => s.trim()).filter(Boolean);
  const ch = X.lifts[X.li0]?.ch;
  return [...own, `Crane maker's load chart: ${ch ? ch.name : 'capacity typed by hand'}${ch?.verify ? ' (transcribed — check against the crane\'s own chart)' : ''}`, 'Crane maker\'s operating manual and outrigger data', 'BS 7121-1 & BS 7121-3: safe use of cranes (mobile cranes)', 'EN 13000 (wind) · EN 13001-2 (DAF) · LEEA COPSULE (rigging)'];
}
function psNotes(plan, calc, S) {
  const ex = String(plan.extraNotes || '').split('\n').map(s => s.trim()).filter(Boolean);
  const g = calc.ground; const out = ['Crane working conditions to be in line with the manufacturer\'s specifications and load charts.',
    g?.surface ? `Outriggers on ${g.surface.name.toLowerCase()} — ${g.surface.struct ? 'engineer\'s approval required before set-up.' : 'confirm the ground on site before set-up.'}` : 'Crane to be set up level on firm ground, on the mats shown.',
    'All dimensions in millimetres, levels and radii in metres, weights as stated, unless noted otherwise.', ...ex, ...(S.notes || []).slice(1, 3).map(s => s.charAt(0) + s.slice(1).toLowerCase())];
  if ((calc.sheetOv || []).length) out.push('Some values on the A1 sheet were typed over by hand; this set prints the calculated values.');
  return out;
}
function buildPlanSet(plan, calc, settings, opts = {}) {
  const S = settings || DEFAULT_SETTINGS; psClipN = 0;
  const X = { plan, calc, S, shot: opts.shot || null, shotTall: opts.shotTall || null, livery: S.boomLivery === false ? '' : (S.boomText || S.company || ''), pages: [] };
  X.lifts = plan.loads.map((_, li) => psLift(plan, calc, li)); X.li0 = Math.min(plan.loads.length - 1, num(plan.activeLoad, 0));
  const m = plan.meta || {}; X.docNo = String(m.drawingNo || ('LP-' + String(plan.name || 'PLAN').replace(/[^A-Za-z0-9]+/g, '').slice(0, 8).toUpperCase())).trim();
  X.refs = psRefs(plan, X); X.notes = psNotes(plan, calc, S);
  const page = (code, title, fill) => { const P = new Prims(); P.rect(0, 0, PS.W, PS.H, { fill: '#ffffff', stroke: 'none', layer: 'BG' }); const pg = { P, extra: [], code, title, fill }; X.pages.push(pg); return pg; };
  const order = opts.lifts || X.lifts.map((_, i) => i); const many = plan.loads.length > 1;
  X.ground = (L) => psGroundOf(plan, calc, L);
  for (const L of X.lifts) L.pf = pickForces(L.load, L.res, calc.rig && num(plan.rigging?.loadIdx, 0) === L.li ? { legs: calc.rig.legs, spread: plan.rigging.spread, vert: calc.rig.vert } : null);
  const cover = page('cover', 'COVER SHEET & DOCUMENT CONTROL', psCover);
  for (const li of order) { const L = X.lifts[li]; const t = many ? ` — LIFT ${li + 1}` : ''; page('ga' + li, 'GENERAL ARRANGEMENT' + t, (pg) => psGA(pg, X, L)); }
  page('site', 'SITE LAYOUT & EXCLUSION ZONE', (pg) => psSite(pg, X));
  for (const li of order) { const L = X.lifts[li]; const t = many ? ` — LIFT ${li + 1}` : ''; if (L.res.empty) continue;
    page('rig' + li, 'RIGGING ARRANGEMENT' + t, (pg) => psRigging(pg, X, L)); page('calc' + li, 'LOAD & SLING CALCULATIONS' + t, (pg) => psCalc(pg, X, L)); }
  for (const li of order) { const L = X.lifts[li]; const t = many ? ` — LIFT ${li + 1}` : ''; page('cap' + li, 'CRANE CAPACITY' + t, (pg) => psCapacity(pg, X, L)); }
  const seen = new Set(); for (const li of order) { const L = X.lifts[li]; if (!L.O || seen.has(L.O)) continue; seen.add(L.O); const t = (calc.outrigs || []).length > 1 ? ` — CRANE ${L.O.rigI + 1}` : ''; page('out' + L.O.rigI, 'OUTRIGGER LOADS & GROUND BEARING' + t, (pg) => psOutrig(pg, X, L)); }
  for (const O of calc.outrigs || []) { if (seen.has(O) || !O.lifts.length) continue; seen.add(O); const li = O.lifts[0].li; const res = calc.loads[li]?.tandem?.picks?.find(q => q.crane === O.rigI)?.res || calc.loads[li];
    const L = { li, res, load: plan.loads[li], crane: O.crane, pv: rigOf(plan, O.rigI), O, ch: null, model: `${O.crane.make || ''} ${O.crane.model}`.trim(), name: plan.loads[li]?.name || `Lift ${li + 1}` };
    page('out' + O.rigI, `OUTRIGGER LOADS & GROUND BEARING — CRANE ${O.rigI + 1}`, (pg) => psOutrig(pg, X, L)); }
  for (const li of order) { const L = X.lifts[li]; if (!L.res.tandem) continue; page('tdm' + li, 'TANDEM LIFT' + (many ? ` — LIFT ${li + 1}` : ''), (pg) => psTandem(pg, X, L)); }
  page('rams', 'RISK ASSESSMENT & METHOD STATEMENT', (pg) => psRams(pg, X));
  page('check', 'PRE-LIFT CHECKLIST & SIGN-OFF', (pg) => psChecklist(pg, X));
  X.N = X.pages.length; X.register = X.pages;
  if (opts.index) return X.pages.map(pg => ({ code: pg.code, title: pg.title }));   // just the list of sheets (cheap — nothing drawn)
  for (const pg of X.pages) { if (pg === cover) continue; pg.fill(pg); }
  cover.fill(cover, X);
  X.pages.forEach((pg, i) => psFrame(pg, X, i + 1, X.N));
  return X.pages;
}

if (typeof module !== 'undefined') module.exports = { PS, buildPlanSet, psPageSVG, psTable };
