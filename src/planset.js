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
function psSupport(P, b, L, X, o = {}) { // crane support locations: the carrier from above (front up the page), beams, pads on mats, spreads, leg loads
  const { plan } = X; const crane = L.crane, O = L.O; const ext = O ? O.ext : outExtOf(L.pv);
  const pads = O ? O.pads : outPads(crane, ext); const g = X.ground(L);
  const mat = outMatDims(plan.outrigger?.mat || plan.matSize) || [1, 1]; const Lc = num(crane.carrierLen, 12), Wc = num(crane.width, 2.75);
  const xs = [...pads.map(p => p.x), 0.64 * Lc, -0.36 * Lc], ys = pads.map(p => p.y);
  const spanL = Math.max(...xs) - Math.min(...xs) + mat[1] + 2, spanW = Math.max(...ys) - Math.min(...ys) + mat[0] + 2;
  const k = Math.min((b.w - 30) / spanW, (b.h - (o.top ?? 26) - 10) / spanL); const cx = b.x + b.w / 2 - 3, cy = b.y + (o.top ?? 26) / 2 + b.h / 2 - 5;
  const xm = (Math.max(...xs) + Math.min(...xs)) / 2, ym = (Math.max(...ys) + Math.min(...ys)) / 2;
  const S2 = (px, py) => [cx - (py - ym) * k, cy - (px - xm) * k];                     // +x (cab) up the page, the carrier's left to the left
  for (const p of pads) { const a = S2(p.x, Math.sign(p.y) * Wc / 2), c = S2(p.x, p.y); P.rect(Math.min(a[0], c[0]), Math.min(a[1], c[1]) - 0.35 * k, Math.abs(c[0] - a[0]), 0.7 * k, { fill: '#d1d5db', stroke: '#374151', w: 0.2, layer: 'SET' }); }
  { const a = S2(0.64 * Lc, Wc / 2), c = S2(-0.36 * Lc, -Wc / 2); P.rect(a[0], a[1], c[0] - a[0], c[1] - a[1], { fill: '#bbf7d0', stroke: '#166534', w: 0.3, layer: 'SET' });
    const cb = S2(0.64 * Lc - 2.2, -Wc / 2); P.rect(a[0], a[1], cb[0] - a[0], cb[1] - a[1], { fill: '#86efac', stroke: '#166534', w: 0.25, layer: 'SET' }); psT(P, (a[0] + cb[0]) / 2, (a[1] + cb[1]) / 2, 'CAB', 1.8, { anchor: 'middle', bold: true, color: '#14532d' });
    const o0 = S2(0, 0); psSlew(P, o0[0], o0[1], 1.6); }
  for (const p of pads) { const c = S2(p.x, p.y); const mw = Math.max(3, mat[0] * k), mh = Math.max(3, mat[1] * k);
    P.rect(c[0] - mw / 2, c[1] - mh / 2, mw, mh, { fill: '#fecaca', stroke: '#991b1b', w: 0.3, layer: 'SET' }); psMat(P, c[0], c[1], Math.max(2.2, Math.min(mw * 0.6, 0.9 * k)));
    const v = O ? O.used[p.id] : null; const left = p.y > 0; const tx = c[0] + (left ? -mw / 2 - 1.2 : mw / 2 + 1.2);
    psT(P, tx, c[1] - 1.4, p.id + (p.ext === 'half' ? ' · HALF' : ''), 2, { anchor: left ? 'end' : 'start', bold: true });
    if (v != null) psT(P, tx, c[1] + 1.6, `${psN(v, 1)} t${O.manual[p.id] != null ? ' *' : ''}`, 2.1, { anchor: left ? 'end' : 'start', bold: true, color: PSC.red });
    if (g?.pads?.[p.id] != null && o.press) psT(P, tx, c[1] + 4.4, `${psN(g.pads[p.id], 1)} t/m²`, 1.8, { anchor: left ? 'end' : 'start', color: PSC.ink2 }); }
  const fr = pads.find(q => q.id === 'FR'), rr = pads.find(q => q.id === 'RR'), fl = pads.find(q => q.id === 'FL');
  if (fr && rr) { const a = S2(rr.x, rr.y), c = S2(fr.x, fr.y); dimA(P, a, c, Math.max(9, mat[0] * k / 2 + 9), String(mm(fr.x - rr.x)), { side: 'right', size: 2.2 }); }
  const rl = pads.find(q => q.id === 'RL'); if (rl && rr) { const a = S2(rl.x, rl.y), c = S2(rr.x, rr.y); dimA(P, a, c, Math.max(6, mat[1] * k / 2 + 6, (rr.x + 0.36 * Lc) * k + 5), String(mm(rl.y - rr.y)), { side: 'down', size: 2.2 }); }
  { const a = S2(0.64 * Lc + 0.4, ym), c = [a[0], a[1] - 6]; P.line(a[0], a[1], c[0], c[1], { stroke: PSC.ink, w: 0.25, layer: 'SET' }); arrow(P, c[0], c[1], -Math.PI / 2, { stroke: PSC.ink, al: 1.6, aw: 0.6, layer: 'SET' }); psT(P, c[0] + 1.2, c[1] + 1, 'FRONT', 1.6, { bold: true, color: PSC.ink2 }); }
  psT(P, b.x + 2, b.y + 3, `MATS ${mat[0]} × ${mat[1]} m${plan.outrigger?.matSelf ? ` · ${psN(num(plan.outrigger.matSelf), 2)} t EACH` : ''}`, 1.9, { bold: true, color: '#991b1b', maxW: b.w - 4 });
  psT(P, b.x + 2, b.y + 6.2, `BEAMS ${outExtLabel(ext)}${O ? ` · LOADS ${O.basis === 'side' ? 'AT THE LIFT SIDE' : 'OVER A FULL SLEW'}` : ''}`, 1.7, { color: PSC.ink2, maxW: b.w - 4 });
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
  const spl = psEmbed(pg, tb, (Ps, bx) => drawSitePlan(Ps, bx, plan, calc, { livery: X.livery, labels: false }));
  psCaption(P, tb.x + tb.w / 2, tb.y + tb.h + 4.5, 'PLAN VIEW', spl?.scale ? `SCALE 1:${spl.scale.N * PS_K} (A3)` : '');
  const shotG = X.shotTall || X.shot;
  if (shotG) { P.rect(ib.x, ib.y, ib.w, ib.h, { fill: '#18212b', stroke: 'none', layer: 'SET' }); P.image(ib.x, ib.y, ib.w, ib.h, shotG, { fit: 'slice', clip: [ib.x, ib.y, ib.w, ib.h], layer: 'SET' }); }
  else psIso(P, ib, X, L);
  psCaption(P, ib.x + ib.w / 2, ib.y + ib.h + 4.5, 'ISOMETRIC VIEW', 'NOT TO SCALE');
  const el = psEmbed(pg, eb, (Ps, bx) => (r.tandem ? drawTandemElevation(Ps, bx, plan, calc, L.li, { title: false, livery: X.livery, padT: 6 }) : drawElevation(Ps, bx, plan, calc, L.li, { title: false, livery: X.livery, mainLabel: L.ch?.mainLabel, padB: 30 })));
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
function psRigDraw(P, b, L, view = 'front') { // the tackle arrangement drawn from the tackle list: hook, items, sling legs, load, balloons
  const r = L.res, st = r.stack, load = L.load, pf = L.pf; const items = st ? st.items : [];
  const lL = Math.max(0.5, num(load.l, 2)), lH = Math.max(0.3, num(load.h, 1.5)), across = view === 'side';
  const wd = num(load.wd) > 0 ? num(load.wd) : Math.max(0.5, Math.min(lL, lH));
  const bodyW = across ? wd : lL; const H = st ? st.H : pf ? pf.H : 3; const hbH = Math.max(0.6, Math.min(1.4, H * 0.2));
  const k = Math.min((b.w - 30) / Math.max(bodyW, ...(items.filter(t => t.type === 'spreader' || t.type === 'beam').map(t => num(t.L)))), (b.h - 34) / (hbH + H + lH));
  const cx = b.x + b.w / 2, y0 = b.y + 10; const X_ = (u) => cx + u * k, Y_ = (v) => y0 + v * k; // v down from the top of the hook block
  const balloons = []; const balloon = (x, y, n, dx) => balloons.push({ x, y, n, dx });
  // hook block
  { const w = Math.min(16, Math.max(4, hbH * 0.55 * k)), h = Math.min(18, hbH * k * 0.72); P.poly([[cx - w / 2, y0], [cx + w / 2, y0], [cx + w * 0.38, y0 + h], [cx - w * 0.38, y0 + h]], { closed: true, fill: '#6b7280', stroke: '#111827', w: 0.25, layer: 'SET' });
    P.arc(cx, y0 + h + 1.4, 1.4, 180, 360, { stroke: '#111827', w: 0.6, layer: 'SET' }); P.line(cx, y0 - 6, cx, y0, { stroke: '#111827', w: 0.3, layer: 'SET' }); balloon(cx + w / 2, y0 + h / 2, 1, 1); }
  let pts = [0], v = hbH; let n = 2;
  const picks = () => { if (!pf) return [-lL * 0.4, lL * 0.4]; if (across) return pf.n >= 3 ? [-pf.across / 2, pf.across / 2] : [0]; return pf.n === 1 ? [0] : [-pf.along / 2, pf.along / 2]; };
  items.forEach((t, i) => {
    const no = i + 2; const vt = Math.max(0.15, t.v);
    if (t.type === 'sling') {
      const beam = items.slice(i + 1).find(q => q.type === 'spreader' || q.type === 'beam'); const tg = beam ? (across ? [0] : [-num(beam.L) / 2, num(beam.L) / 2]) : picks();
      const pairs = pts.length === 1 ? tg.map(x => [pts[0], x]) : pts.length === tg.length ? pts.map((x, j) => [x, tg[j]]) : tg.map(x => [pts.reduce((a, q) => (Math.abs(q - x) < Math.abs(a - x) ? q : a), pts[0]), x]);
      for (const [a, c] of pairs) { P.line(X_(a), Y_(v), X_(c), Y_(v + vt), { stroke: '#92400e', w: 1.1, layer: 'SET' }); P.line(X_(a), Y_(v), X_(c), Y_(v + vt), { stroke: '#f59e0b', w: 0.7, layer: 'SET' }); }
      const [a, c] = pairs[pairs.length - 1]; balloon((X_(a) + X_(c)) / 2, (Y_(v) + Y_(v + vt)) / 2, no, c >= a ? 1 : -1);
      if (!across && pairs.length > 1 && t.ang != null) { const [a0, c0] = pairs[0]; const ang = Math.atan2(vt, Math.abs(c0 - a0)) * R2D; psT(P, X_(c0) + 2, Y_(v + vt) - 2.5, `${psN(90 - ang, 1)}° FROM VERTICAL`, 1.7, { color: COL.green, bold: true }); }
      pts = tg; v += vt;
    } else if (t.type === 'spreader' || t.type === 'beam') {
      const half = across ? 0.25 : num(t.L, 2) / 2; P.rect(X_(-half), Y_(v), half * 2 * k, Math.max(1.2, vt * k), { fill: '#fde047', stroke: '#713f12', w: 0.3, layer: 'SET' }); balloon(X_(half), Y_(v + vt / 2), no, 1);
      pts = across ? [0] : [-half, half]; v += vt;
    } else {
      for (const x of pts) { const a = X_(x), y1 = Y_(v), y2 = Y_(v + vt);
        if (t.type === 'shackle') { P.line(a, y1, a, y2, { stroke: '#1f2937', w: 0.25, layer: 'SET' }); P.circle(a, (y1 + y2) / 2, Math.max(0.8, Math.min(2, (y2 - y1) / 2)), { fill: 'none', stroke: '#be185d', w: 0.45, layer: 'SET' }); }
        else if (t.type === 'chain') { P.rect(a - 1, y1 + (y2 - y1) * 0.35, 2, (y2 - y1) * 0.3, { fill: '#c026d3', stroke: '#4a044e', w: 0.2, layer: 'SET' }); P.line(a, y1, a, y2, { stroke: '#111827', w: 0.35, dash: true, layer: 'SET' }); }
        else P.line(a, y1, a, y2, { stroke: '#374151', w: 0.5, layer: 'SET' }); }
      balloon(X_(pts[pts.length - 1]), Y_(v + vt / 2), no, 1); v += vt;
    }
  });
  if (!items.length && pf) { const tg = picks(); for (const x of tg) { P.line(cx, Y_(v), X_(x), Y_(v + pf.H), { stroke: '#92400e', w: 1.1, layer: 'SET' }); P.line(cx, Y_(v), X_(x), Y_(v + pf.H), { stroke: '#f59e0b', w: 0.7, layer: 'SET' }); } v += pf.H; }
  // the load
  const ly = Y_(v); P.rect(X_(-bodyW / 2), ly, bodyW * k, lH * k, { fill: '#cbd5e1', stroke: '#0f172a', w: 0.35, layer: 'SET' });
  psT(P, cx, ly + lH * k + 11, `${String(load.name || 'LOAD').toUpperCase()} · ${psN(r.W, 2)} t`, 2.4, { anchor: 'middle', bold: true, maxW: b.w - 6 });
  for (const x of picks()) psReaction(P, X_(x), ly, 1.2);
  const cg = across ? num(load.cogZ) : num(load.cogX); cogSymbol(P, X_(cg), ly + lH * k / 2, Math.min(1.6, Math.max(0.9, lH * k * 0.3)), 'SET');
  // dimensions: load length / width, hook to load
  dimA(P, [X_(-bodyW / 2), ly + lH * k], [X_(bodyW / 2), ly + lH * k], 4.5, String(mm(bodyW)), { side: 'down', size: 2.1 });
  const hx = X_(-bodyW / 2) - 6; dimA(P, [hx, Y_(hbH)], [hx, ly], 0, String(mm(v - hbH)), { side: 'left', size: 2.1, extA: false, extB: false });
  // balloons
  for (const q of balloons) { const bx = q.x + q.dx * 9, by = q.y - 3; P.line(q.x, q.y, bx - q.dx * 2.2, by, { stroke: PSC.red, w: 0.18, layer: 'SET' }); P.circle(bx, by, 2.2, { fill: '#ffffff', stroke: PSC.blue, w: 0.3, layer: 'SET' }); psT(P, bx, by, String(q.n).padStart(2, '0'), 1.8, { anchor: 'middle', bold: true, color: PSC.blue }); }
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
  let iy = psHead(P, ib.x, ib.y, ib.w, 'RIGGING SUMMARY');
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
  // location of forces (plan view) + tension diagrams
  if (!pf) return;
  const yb = Math.max(y + 2, fy - 2); const bh = D.y + D.h - yb - 9; if (bh < 40) return;
  const pb = { x: D.x, y: yb, w: 190, h: bh }; psBox(P, pb);
  const lL = Math.max(0.5, num(L.load.l, 2)), wd = num(L.load.wd) > 0 ? num(L.load.wd) : Math.max(pf.across + 0.3, Math.min(lL, num(L.load.h, 1.5)));
  const k = Math.min((pb.w - 34) / lL, (pb.h - 26) / wd); const cx = pb.x + pb.w / 2, cy = pb.y + pb.h / 2 + 2; const S2 = (x, z) => [cx + x * k, cy - z * k];
  { const a = S2(-lL / 2, wd / 2); P.rect(a[0], a[1], lL * k, wd * k, { fill: '#e2e8f0', stroke: '#0f172a', w: 0.35, layer: 'SET' }); }
  const G = S2(pf.cx, pf.cz);
  pf.pts.forEach(q => { const a = S2(q.x, q.z); P.line(a[0], a[1], G[0], G[1], { stroke: PSC.blue, w: 0.18, dash: true, layer: 'SET' }); });
  pf.pts.forEach(q => { const a = S2(q.x, q.z); psReaction(P, a[0], a[1], 1.9); const up = q.z >= 0; psT(P, a[0], a[1] + (up ? -4.2 : 4.6), `${q.id} = ${psN(q.R, 3)} Te`, 2.1, { anchor: 'middle', bold: true, color: PSC.red, bg: '#ffffff' }); });
  cogSymbol(P, G[0], G[1], 2, 'SET'); psT(P, G[0] + 3, G[1] + 3.6, `W = ${psN(pf.W, 3)} Te`, 2.1, { bold: true, color: PSC.blue, bg: '#ffffff' });
  if (pf.n === 2) { const a = S2(pf.pts[0].x, 0), c = S2(pf.pts[1].x, 0); const yl = cy + wd * k / 2 + 6; dimA(P, [a[0], yl], [G[0], yl], 0, `D1 = ${mm(pf.pts[0].d)}`, { size: 2, side: 'down', extA: false, extB: false }); dimA(P, [G[0], yl], [c[0], yl], 0, `D2 = ${mm(pf.pts[1].d)}`, { size: 2, side: 'down', extA: false, extB: false }); }
  else { const a = S2(-pf.along / 2, -pf.across / 2), c = S2(pf.along / 2, -pf.across / 2); dimA(P, a, c, wd * k / 2 - pf.across * k / 2 + 6, String(mm(pf.along)), { side: 'down', size: 2 }); const d = S2(pf.along / 2, pf.across / 2); dimA(P, c, d, (lL - pf.along) * k / 2 + 6, String(mm(pf.across)), { side: 'right', size: 2 }); }
  psCaption(P, pb.x + pb.w / 2, pb.y + pb.h + 4.4, 'LOCATION OF FORCES (PLAN VIEW)', 'DISTANCES IN mm');
  // tension diagrams — each leg against the vertical
  const tb = { x: pb.x + pb.w + 4, y: yb, w: D.x + D.w - pb.x - pb.w - 4, h: bh }; psBox(P, tb);
  const n = pf.pts.length, cw = tb.w / n; const hk = Math.min((tb.h - 24) / pf.H, (cw - 14) / Math.max(0.3, ...pf.pts.map(q => q.d)));
  pf.pts.forEach((q, i) => { const dir = q.x - pf.cx >= 0 ? 1 : -1; const ox = tb.x + cw * i + (dir > 0 ? 7 : cw - 7), oy = tb.y + Math.max(8, (tb.h - 16 - pf.H * hk) / 2); const px = ox + dir * q.d * hk, py = oy + pf.H * hk;
    P.line(ox, oy, ox, py, { stroke: PSC.ink3, w: 0.15, dash: true, layer: 'SET' }); P.line(ox, oy, px, py, { stroke: PSC.blue, w: 0.4, layer: 'SET' }); P.line(px - 4, py, px + 4, py, { stroke: '#64748b', w: 1.2, layer: 'SET' });
    psReaction(P, px, py, 1.2); P.circle(ox, oy, 1, { fill: '#6b7280', stroke: '#111', w: 0.15, layer: 'SET' });
    const ra = Math.min(8, pf.H * hk * 0.45); P.arc(ox, oy, ra, 270, 270 + (px >= ox ? 1 : -1) * q.beta, { stroke: PSC.red, w: 0.2, layer: 'SET' }); // from straight down to the leg
    psT(P, ox + (px >= ox ? 1 : -1) * (ra * 0.55 + 2.5), oy + ra + 3.2, `${psN(q.beta, 2)}°`, 2, { anchor: px >= ox ? 'start' : 'end', bold: true, color: PSC.red, bg: '#ffffff' });
    const mx = tb.x + cw * i + cw / 2; psT(P, mx, tb.y + tb.h - 7, `T${i + 1} = ${psN(q.T, 3)} Te`, 2.2, { anchor: 'middle', bold: true, color: PSC.blue }); psT(P, mx, tb.y + tb.h - 3.6, `${q.id} · ${psN(q.R, 3)} Te VERTICAL`, 1.5, { anchor: 'middle', color: PSC.ink3 }); if (i) P.line(tb.x + cw * i, tb.y + 4, tb.x + cw * i, tb.y + tb.h - 4, { stroke: PSC.hair, w: 0.15, layer: 'SET' }); });
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
