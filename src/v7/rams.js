// ===== v9 RAMS pack: a 2-page A4 risk assessment & method statement built from the plan in one tap =====
// Page 1: header (logo, project, site, date, Appointed Person), the verdict, the dimensioned elevation, the top view (with the satellite
// map when there is one), a 3D still, and the load & rigging breakdown. Page 2: outrigger reactions and mats, the highlighted load-chart
// excerpt, the checks, the risk assessment, the method statement and the sign-off. Drawings come from the A1 sheet engine (draw.js),
// drawn big and scaled down so their dimensions and text keep the A1 proportions. Vector PDF (svg2pdf + jsPDF), A4 portrait.
const RAMS_W = 210, RAMS_H = 297;
const RAMS_C = { ink: '#111111', grey: '#6b6b6b', line: '#9a9a9a', head: '#ffc20e', headInk: '#1a1400', soft: '#f3f3f5', ok: '#1a8f47', warn: '#c26a00', fail: '#d70015', okBg: '#e3f5ea', warnBg: '#fdeedb', failBg: '#fde2e2' };

// a drawing made at k× size on its own primitives, placed in the page box scaled by 1/k (clipped to the box)
let ramsClip = 0;
function ramsEmbed(Psub, vbW, vbH, x, y, w) {
  const inner = toSVG(Psub, { viewBox: [0, 0, vbW, vbH] }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const s = w / vbW, id = 'rc' + (++ramsClip);
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${vbH * s}"/></clipPath><g clip-path="url(#${id})"><g transform="translate(${x} ${y}) scale(${s})">${inner}</g></g>`;
}
function ramsTxt(P, x, y, s, size, o = {}) { s = String(s ?? ''); const sz = o.maxW ? fitSize(s, o.maxW, size, o.bold) : size; P.text(x, y, s, { size: sz, vAlign: o.vAlign || 'middle', anchor: o.anchor || 'start', bold: o.bold, color: o.color || RAMS_C.ink, layer: 'RAMS' }); }
function ramsWrap(P, x, y, s, size, maxW, maxLines, o = {}) {
  const per = Math.max(8, Math.floor(maxW / (size * 0.5))); const lines = wrapText(String(s || ''), per).slice(0, maxLines);
  lines.forEach((l, i) => ramsTxt(P, x, y + i * size * 1.22, l, size, { maxW, color: o.color, bold: o.bold && i === 0 ? true : o.bold })); return lines.length;
}
// table: cols = [{ w (mm), t (head), a: 'l'|'c'|'r' }], rows = [[cell…] | { cells, fill, bold }]
function ramsTable(P, x, y, cols, rows, o = {}) {
  const rh = o.rh || 4.6, fs = o.fs || 2.5; let cy = y; const W = cols.reduce((a, c) => a + c.w, 0);
  const cell = (cx, w, v, a, bold, color) => { const t = String(v ?? ''); if (a === 'c') cellText(P, cx + w / 2, cy + rh / 2, t, w - 1.6, fs, { bold, color, layer: 'RAMS' }); else ramsTxt(P, a === 'r' ? cx + w - 0.9 : cx + 0.9, cy + rh / 2, t, fs, { anchor: a === 'r' ? 'end' : 'start', bold, maxW: w - 1.8, color }); };
  if (cols.some(c => c.t)) { P.rect(x, cy, W, rh, { fill: o.headFill || RAMS_C.head, stroke: RAMS_C.ink, w: 0.2, layer: 'RAMS' }); let cx = x; for (const c of cols) { cell(cx, c.w, c.t, c.a === 'r' ? 'r' : c.a === 'c' ? 'c' : 'l', true, RAMS_C.headInk); cx += c.w; } cy += rh; }
  for (const r of rows) { const cells = Array.isArray(r) ? r : r.cells; const fill = r.fill || 'none'; const hh = r.h || rh;
    P.rect(x, cy, W, hh, { fill, stroke: RAMS_C.line, w: 0.15, layer: 'RAMS' }); let cx = x;
    cells.forEach((v, i) => { const c = cols[i]; if (i) P.line(cx, cy, cx, cy + hh, { stroke: RAMS_C.line, w: 0.15, layer: 'RAMS' });
      if (v && typeof v === 'object' && v.wrap) ramsWrap(P, cx + 0.9, cy + fs * 0.9, v.wrap, fs, c.w - 1.8, Math.max(1, Math.floor(hh / (fs * 1.22))), { color: v.color });
      else { const old = cy; if (hh !== rh) cy += (hh - rh) / 2; cell(cx, c.w, v && typeof v === 'object' ? v.t : v, c.a === 'r' ? 'r' : c.a === 'c' ? 'c' : 'l', r.bold || (v && v.bold), v && typeof v === 'object' ? v.color : undefined); cy = old; }
      cx += c.w; });
    cy += hh; }
  return cy;
}
function ramsSection(P, x, y, w, t) { P.rect(x, y, w, 5.2, { fill: RAMS_C.ink, stroke: 'none', layer: 'RAMS' }); ramsTxt(P, x + 2, y + 2.7, t, 2.9, { bold: true, color: '#ffffff', maxW: w - 4 }); return y + 5.2; }
function ramsHeader(P, plan, S, page, sub) {
  const m = plan.meta || {}; const logo = S.logoImg;
  P.rect(0, 0, RAMS_W, RAMS_H, { fill: '#ffffff', stroke: 'none', layer: 'RAMS' });
  P.rect(10, 9, 22, 22, { fill: logo ? '#ffffff' : RAMS_C.head, stroke: RAMS_C.ink, w: 0.25, layer: 'RAMS' });
  if (logo) P.image(11, 10, 20, 20, logo, { layer: 'RAMS' }); else cellText(P, 21, 20, S.logoText || 'FHE', 18, 7, { bold: true, color: RAMS_C.headInk, layer: 'RAMS' });
  ramsTxt(P, 35, 12.5, S.company || 'FRIENDSHIP HALL EST', 4.2, { bold: true, maxW: 105 });
  (S.companyLines || []).slice(0, 3).forEach((l, i) => ramsTxt(P, 35, 17.4 + i * 3.1, l, 2.3, { color: RAMS_C.grey, maxW: 105 }));
  ramsTxt(P, 35, 28.6, sub, 3.1, { bold: true, maxW: 105 });
  const rows = [['Document', `RAMS-${(m.drawingNo || plan.name || 'PLAN').toString().replace(/\s+/g, '-').slice(0, 18)}`], ['Revision', (m.revs || []).length ? m.revs[m.revs.length - 1].rev : '0'], ['Date', m.date || new Date().toLocaleDateString('en-GB')], ['Page', `${page} of 2`]];
  ramsTable(P, 144, 9, [{ w: 18, a: 'l' }, { w: 38, a: 'l' }], rows.map(([a, b]) => [{ t: a, color: RAMS_C.grey }, { t: b, bold: true }]), { rh: 5.5, fs: 2.5 });
  P.line(10, 33, 200, 33, { stroke: RAMS_C.ink, w: 0.5, layer: 'RAMS' });
}
function ramsFooter(P, page) { ramsTxt(P, 10, 291.5, `FHE Lift Planner ${APP_VERSION} · generated ${new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · planning document: the Appointed Person checks it and the crane's own load charts govern`, 2, { color: RAMS_C.grey, maxW: 170 }); ramsTxt(P, 200, 291.5, `${page} / 2`, 2.2, { anchor: 'end', bold: true }); }
function ramsVerdict(calc, r) { const st = calc.status; return st === 'fail' ? ['DO NOT LIFT AS PLANNED', 'Fix every red item on page 2 first.', RAMS_C.fail, RAMS_C.failBg] : st === 'warn' ? ['CRITICAL LIFT — APPOINTED PERSON TO SIGN OFF', 'Amber items need a named control and the AP\'s approval.', RAMS_C.warn, RAMS_C.warnBg] : ['SAFE TO LIFT AS PLANNED', 'Every check passes. Brief the team and follow the method statement.', RAMS_C.ok, RAMS_C.okBg]; }

// ---------- page 1: the lift ----------
function ramsPage1(plan, calc, S, shot) {
  const P = new Prims(); const li = activeLi(), r = calc.loads[li], l = plan.loads[li], crane = r.crane || calc.crane, ch = r.chartDef; const m = plan.meta || {};
  ramsHeader(P, plan, S, 1, 'LIFTING PLAN · RISK ASSESSMENT & METHOD STATEMENT');
  const site = plan.weather?.place || (plan.env || []).find(e => e.geo)?.geo?.place || m.project || '—';
  const T = r.tandem; const cranesTxt = T ? T.picks.map(p => `C${p.crane + 1} ${p.model}`).join(' + ') : `${crane.make || ''} ${crane.model}`.trim();
  let y = ramsTable(P, 10, 35, [{ w: 26, a: 'l' }, { w: 69, a: 'l' }, { w: 26, a: 'l' }, { w: 69, a: 'l' }], [
    [{ t: 'Client', color: RAMS_C.grey }, { t: m.client || '—', bold: true }, { t: 'Appointed Person', color: RAMS_C.grey }, { t: m.checkedBy || '', bold: true }],
    [{ t: 'Project', color: RAMS_C.grey }, { t: m.project || plan.name || '—', bold: true }, { t: 'Lift supervisor', color: RAMS_C.grey }, ''],
    [{ t: 'Site location', color: RAMS_C.grey }, { t: site, bold: true }, { t: 'Crane', color: RAMS_C.grey }, { t: cranesTxt, bold: true }],
    [{ t: 'Lift', color: RAMS_C.grey }, { t: `${l.name || m.title || 'Lift ' + (li + 1)} · ${fmt(num(l.w), 2)} t`, bold: true }, { t: 'Category', color: RAMS_C.grey }, { t: (l.liftType || (calc.status === 'warn' ? 'Critical' : 'Routine')) + (T ? ' · tandem' : ''), bold: true }]
  ], { rh: 5.2, fs: 2.5 });
  const [vw, vs, vc, vb] = ramsVerdict(calc, r);
  P.rect(10, y + 2, 190, 9, { fill: vb, stroke: vc, w: 0.5, layer: 'RAMS' }); P.rect(10, y + 2, 3, 9, { fill: vc, stroke: 'none', layer: 'RAMS' });
  ramsTxt(P, 16, y + 5.4, vw, 3.6, { bold: true, color: vc, maxW: 120 }); ramsTxt(P, 16, y + 9.1, vs, 2.3, { color: RAMS_C.ink, maxW: 120 });
  const um = T ? T.maxUtil : r.util; ramsTxt(P, 198, y + 6.6, r.cap != null || T ? `${fmt(um, 1)}% of ${T ? 'the tandem limit ' + T.derate + '%' : 'chart'}` : 'out of reach', 3.6, { anchor: 'end', bold: true, color: vc, maxW: 70 });
  y += 13;
  // the elevation, drawn at A1 proportions (k = 3) and scaled into the page
  y = ramsSection(P, 10, y, 190, `ELEVATION · ${(crane.model || '').toUpperCase()} · RADIUS ${fmt(r.R, 2)} m · BOOM ${fmt(r.tele?.L ?? r.geo?.L, 1)} m · OVER ${SIDE_NAME[sideOf(l)]}`);
  const k = 3, eh = 92; const Pe = new Prims(); Pe.rect(0, 0, 190 * k, eh * k, { fill: '#ffffff', stroke: 'none' });
  try { drawElevation(Pe, { x: 0, y: 0, w: 190 * k, h: eh * k }, plan, calc, li, { livery: livery(), titleLines: [''], mainLabel: ch?.mainLabel }); } catch (e) { console.error(e); }
  let svg = ramsEmbed(Pe, 190 * k, eh * k, 10, y, 190);
  P.rect(10, y, 190, eh, { fill: 'none', stroke: RAMS_C.line, w: 0.2, layer: 'RAMS' }); y += eh + 2;
  // top view (satellite map underneath when there is one) and the 3D still
  const bh = 66; ramsSection(P, 10, y, 94, 'TOP VIEW'); ramsSection(P, 106, y, 94, '3D VIEW'); y += 5.2;
  const Ps = new Prims(); Ps.rect(0, 0, 94 * k, bh * k, { fill: '#ffffff', stroke: 'none' });
  try { drawSitePlan(Ps, { x: 0, y: 0, w: 94 * k, h: bh * k }, plan, calc, { livery: livery() }); } catch (e) { console.error(e); }
  svg += ramsEmbed(Ps, 94 * k, bh * k, 10, y, 94);
  P.rect(10, y, 94, bh, { fill: 'none', stroke: RAMS_C.line, w: 0.2, layer: 'RAMS' }); P.rect(106, y, 94, bh, { fill: '#1b2229', stroke: RAMS_C.line, w: 0.2, layer: 'RAMS' });
  if (shot) P.image(106, y, 94, bh, shot, { layer: 'RAMS', fit: 'none' }); else cellText(P, 153, y + bh / 2, '3D view not available on this device', 80, 2.6, { color: '#ffffff', layer: 'RAMS' });
  y += bh + 2;
  // load & rigging breakdown (left) and capacity (right)
  ramsSection(P, 10, y, 94, 'LOAD & RIGGING'); ramsSection(P, 106, y, 94, T ? 'TANDEM — EACH CRANE' : 'CAPACITY'); y += 5.2;
  const t2 = (v) => `${fmt(v, 2)} t`;
  const left = [['Load weight', t2(r.W)], [`Safety margin ${r.contOn ? fmt(r.cont, 0) + '%' : 'off'}`, t2(r.contW)], ['Hook block', t2(r.hb)], ['Slings, shackles, beams', t2(r.tk)], ...(r.ex ? [['Other', t2(r.ex)]] : []), ...(r.jd ? [['Folded jib (deduction)', t2(r.jd)]] : []), ...(r.rope ? [['Hoist rope (deduction)', t2(r.rope)]] : []),
    { cells: [{ t: 'Total hook load', bold: true }, { t: t2(r.total), bold: true }], fill: RAMS_C.soft }, ...(r.daf ? [[`DAF ${r.daf.toFixed(3)} (EN 13001-2)`, t2(r.design)]] : [])];
  ramsTable(P, 10, y, [{ w: 64, a: 'l' }, { w: 30, a: 'r' }], left, { rh: 4.3, fs: 2.5 });
  if (T) ramsTable(P, 106, y, [{ w: 22, t: 'Crane', a: 'l' }, { w: 18, t: 'Share', a: 'r' }, { w: 18, t: 'Hook load', a: 'r' }, { w: 18, t: 'Chart', a: 'r' }, { w: 18, t: 'Use', a: 'r' }],
    T.picks.map(p => { const st = p.util == null || p.util > T.derate ? RAMS_C.fail : p.util > T.derate * 0.9 ? RAMS_C.warn : RAMS_C.ok; return [`C${p.crane + 1} ${p.model}`, `${fmt(p.share, 2)} t`, `${fmt(p.design, 2)} t`, p.cap != null ? `${fmt(p.cap, 2)} t` : '—', { t: p.util != null ? `${fmt(p.util, 1)}%` : '—', bold: true, color: st }]; }).concat([[{ t: `Limit ${T.derate}% each · load ${fmt(T.W, 2)} t`, color: RAMS_C.grey }, '', '', '', '']]), { rh: 4.3, fs: 2.4 });
  else {
    const uc = r.util == null ? RAMS_C.fail : r.util > num(S.utilMax, 90) ? RAMS_C.fail : r.util > num(S.utilWarn, 75) ? RAMS_C.warn : RAMS_C.ok;
    ramsTable(P, 106, y, [{ w: 64, a: 'l' }, { w: 30, a: 'r' }], [['Chart capacity (gross)', r.cap != null ? t2(r.cap) : '—'], ['Less hook, rigging, deductions', r.ded != null ? `− ${t2(r.ded)}` : '—'], { cells: [{ t: 'Net capacity for the load', bold: true }, { t: r.netCap != null ? t2(r.netCap) : '—', bold: true }], fill: RAMS_C.soft },
      ['Load + safety margin', t2(r.W + r.contW)], [{ t: 'Utilisation', bold: true }, { t: r.util != null ? `${fmt(r.util, 1)}%` : '—', bold: true, color: uc }], ['Safety margin on the chart', r.margin != null ? `${fmt(r.margin, 1)}%` : '—'],
      ['Chart', { t: ch ? ch.name : 'typed by hand' }], [`Counterweight · legs`, `${fmt(num(plan.cwt !== '' && plan.cwt != null ? plan.cwt : (ch?.cwt ?? crane.cwt)), 1)} t · ${outExtLabel(outExtOf(plan))}`]], { rh: 4.3, fs: 2.5 });
  }
  ramsFooter(P, 1);
  return { P, svg };
}

// ---------- page 2: legs, chart, checks, risk assessment, method, sign-off ----------
function ramsChartExcerpt(parsed, ci, Rrow) {
  const nc = parsed.cols.length; const c0 = Math.max(0, Math.min(nc - 9, ci - 4)), c1 = Math.min(nc, c0 + 9);
  const rows = parsed.rows; let ri = rows.findIndex(x => x[0] >= Rrow - 1e-6); if (ri < 0) ri = rows.length - 1;
  const r0 = Math.max(0, Math.min(rows.length - 13, ri - 6)), r1 = Math.min(rows.length, r0 + 13);
  return { sub: { cols: parsed.cols.slice(c0, c1), rows: rows.slice(r0, r1).map(x => [x[0], ...x.slice(1 + c0, 1 + c1)]) }, ci: ci - c0, more: c0 > 0 || c1 < nc || r0 > 0 || r1 < rows.length };
}
function ramsPage2(plan, calc, S) {
  const P = new Prims(); const li = activeLi(), r = calc.loads[li], l = plan.loads[li], crane = r.crane || calc.crane, ch = r.chartDef, T = r.tandem;
  ramsHeader(P, plan, S, 2, 'OUTRIGGERS · LOAD CHART · RISK ASSESSMENT · METHOD');
  let y = 35;
  // outrigger reactions: the crane from above with the load on every leg, and the ground table
  ramsSection(P, 10, y, 92, 'OUTRIGGER REACTIONS'); ramsSection(P, 104, y, 96, 'GROUND BEARING & MATS'); y += 5.2;
  const O = (calc.outrigs || []).find(o => o.rigI === r.rigI) || calc.outr; const g = calc.ground; const boxH = 62;
  P.rect(10, y, 92, boxH, { fill: '#fbfbfc', stroke: RAMS_C.line, w: 0.2, layer: 'RAMS' });
  if (O) {
    const xs = O.pads.map(p => p.x), ys = O.pads.map(p => p.y), Lc = num(crane.carrierLen, 12), Wc = num(crane.width, 2.75);
    const k = Math.min(60 / Math.max(1, Math.max(...ys) - Math.min(...ys)), 46 / Math.max(1, Math.max(...xs, 0.64 * Lc) - Math.min(...xs, -0.36 * Lc)));
    const cx = 56, cy = y + boxH / 2 + 2; const S2 = (px, py) => [cx - py * k, cy - px * k];
    const pl = O.pads.map(p => S2(p.x, p.y)); P.poly(pl, { closed: true, stroke: RAMS_C.line, w: 0.2, dash: true, fill: 'none', layer: 'RAMS' });
    const [ax, ay] = S2(0.64 * Lc, Wc / 2), [bx, by] = S2(-0.36 * Lc, -Wc / 2); P.rect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay), { fill: '#ffe9a6', stroke: RAMS_C.ink, w: 0.25, layer: 'RAMS' });
    ramsTxt(P, (ax + bx) / 2, Math.min(ay, by) + 2.5, 'CAB', 2, { anchor: 'middle', bold: true });
    const Lift = O.lifts.find(x => x.li === li) || O.lifts[0];
    if (Lift) { const t = Lift.theta * D2R; const [ox, oy] = S2(0, 0); const ex = ox - Math.sin(t) * 26, ey = oy - Math.cos(t) * 26; P.line(ox, oy, ex, ey, { stroke: '#e0a800', w: 1.6, layer: 'RAMS' }); P.circle(ex, ey, 1.4, { fill: '#e0a800', stroke: RAMS_C.ink, w: 0.2, layer: 'RAMS' }); }
    const mat = outMatDims(plan.outrigger?.mat || plan.matSize) || [1, 1];
    for (const p of O.pads) { const [px, py] = S2(p.x, p.y); const ms = Math.max(1.6, mat[0] * k); const v = O.used[p.id]; const q = g?.pads?.[p.id]; const st = g?.allow ? (q > g.allow ? RAMS_C.fail : q > 0.9 * g.allow ? RAMS_C.warn : RAMS_C.ok) : RAMS_C.ink;
      const [bx0, by0] = S2(p.x, Math.sign(p.y) * Wc / 2); P.line(bx0, by0, px, py, { stroke: '#666', w: 0.7, layer: 'RAMS' });
      P.rect(px - ms / 2, py - ms / 2, ms, ms, { fill: '#c9a46b', stroke: RAMS_C.ink, w: 0.2, layer: 'RAMS' }); P.circle(px, py, 1.1, { fill: st, stroke: 'none', layer: 'RAMS' });
      const right = px > cx, below = py > cy; const tx = px + (right ? 3 : -3), ty = py + (below ? 5 : -5.5);
      ramsTxt(P, tx, ty, `${p.id} ${fmt(v, 1)} t${O.manual[p.id] != null ? '*' : ''}`, 2.6, { anchor: right ? 'start' : 'end', bold: true }); ramsTxt(P, tx, ty + 3, `${fmt(v * OUT_G, 0)} kN${q != null ? ' · ' + gbpTxt(q) : ''}`, 2.1, { anchor: right ? 'start' : 'end', color: st }); }
    ramsTxt(P, 12, y + boxH - 2.5, `${outExtLabel(O.ext)} outriggers · ${O.basis === 'full' ? 'busiest over a full 360° slew' : 'over the lift side'}${O.est ? ' · estimated crane weights' : ''}`, 2, { color: RAMS_C.grey, maxW: 88 });
  } else cellText(P, 56, y + boxH / 2, 'No outrigger model for this crane', 80, 2.6, { color: RAMS_C.grey, layer: 'RAMS' });
  const gst = g?.status === 'fail' ? ['FAIL', RAMS_C.fail, RAMS_C.failBg] : g?.status === 'warn' ? ['CLOSE', RAMS_C.warn, RAMS_C.warnBg] : g?.status === 'ok' ? ['PASS', RAMS_C.ok, RAMS_C.okBg] : ['NOT CHECKED', RAMS_C.grey, RAMS_C.soft];
  let gy = ramsTable(P, 104, y, [{ w: 58, a: 'l' }, { w: 38, a: 'r' }], g ? [
    ['Busiest leg load', `${fmt(g.P, 1)} t · ${fmt(g.P * OUT_G, 0)} kN`], ['Source', { maker: "crane maker's figure", illus: 'typed by hand — ILLUSTRATIVE', calc: 'calculated (rigid-plane model)', est: 'rough estimate' }[g.src] || '—'],
    ['Mat', `${g.mat} · ${fmt(g.area, 2)} m²${g.self ? ' · ' + fmt(g.self, 2) + ' t' : ''}`], [{ t: 'Pressure under the mat', bold: true }, { t: gbpTxt(g.press), bold: true }],
    ['Ground can take', g.allow ? gbpTxt(g.allow) : 'not entered'], ['Smallest mat that works', g.side ? `${fmt(g.side, 2)} m square · ${fmt(g.side * g.side, 2)} m²` : '—']] : [['Ground check', 'switch on under Legs']], { rh: 4.6, fs: 2.4 });
  P.rect(104, gy + 1.5, 96, 9, { fill: gst[2], stroke: gst[1], w: 0.5, layer: 'RAMS' }); ramsTxt(P, 152, gy + 6, `GROUND BEARING: ${gst[0]}`, 3.4, { anchor: 'middle', bold: true, color: gst[1] });
  gy += 12; ramsWrap(P, 105, gy + 1, 'Planning model — the crane maker\'s outrigger data and a competent ground assessment govern. Check for voids, services, trenches and slab edges.', 2.1, 94, 3, { color: RAMS_C.grey });
  y += boxH + 2;
  // the load chart excerpt with the operating point
  ramsSection(P, 10, y, 190, `LOAD CHART · ${(crane.make || '').toUpperCase()} ${crane.model} · OPERATING POINT ${fmt(r.R, 2)} m / ${r.cap != null ? fmt(r.cap, 2) + ' t' : 'out of chart'}`); y += 5.2;
  const parsed = ch ? getChart(ch) : null; const chH = 52;
  if (parsed && parsed.cols.length) {
    const ex = ramsChartExcerpt(parsed, Math.max(0, num(r.ci)), num(r.capInfo?.row, r.R)); const k = 2.2; const Pc = new Prims(); Pc.rect(0, 0, 190 * k, chH * k, { fill: '#ffffff', stroke: 'none' });
    try { drawChartTable(Pc, { x: 0, y: 0, w: 190 * k, h: chH * k }, crane, ch, ex.sub, [{ ci: ex.ci, row: num(r.capInfo?.row, r.R) }], null); } catch (e) { console.error(e); }
    ramsSvgAdd(P, ramsEmbed(Pc, 190 * k, chH * k, 10, y, 190)); if (ex.more) ramsTxt(P, 12, y + chH + 1.6, 'Excerpt around the operating point — the full chart is on the A1 plan and in the crane\'s own documents.', 1.9, { color: RAMS_C.grey, maxW: 150 });
  } else cellText(P, 105, y + chH / 2, 'No load chart in the library — capacity typed by hand', 160, 2.8, { color: RAMS_C.grey, layer: 'RAMS' });
  y += chH + 3;
  // risk assessment
  y = ramsSection(P, 10, y, 190, 'RISK ASSESSMENT (L × S, 1–5) · RESIDUAL RISK AFTER CONTROLS');
  const ck = allChecks(calc); const sOf = (re) => { const c = ck.filter(x => re.test(x.t)); return c.some(x => x.s === 'fail') ? 'fail' : c.some(x => x.s === 'warn') ? 'warn' : 'ok'; };
  const lvl = (s) => s === 'fail' ? [{ t: '4×5=20 HIGH', bold: true, color: RAMS_C.fail }] : s === 'warn' ? [{ t: '2×5=10 MED', bold: true, color: RAMS_C.warn }] : [{ t: '1×5=5 LOW', bold: true, color: RAMS_C.ok }];
  const w = r.wind; const wx = calc.weather; const mc = num(S.minClearance, 1);
  const hz = [
    ['Crane overturns or is overloaded', `Chart ${ch ? ch.name : 'typed by hand'} checked at ${fmt(T ? T.maxUtil : r.util, 1)}% (stop above ${T ? T.derate : num(S.utilMax, 90)}%). LMI set to this exact configuration before the lift. Net capacity ${fmt(r.netCap, 2)} t for a ${fmt(r.W + r.contW, 2)} t load.`, sOf(/Capacity|Chart|Tandem ·|Lift side|Geometry/)],
    ['Outrigger or ground failure', `Legs ${outExtLabel(outExtOf(plan))} on ${g ? g.mat : 'mats'}; busiest leg ${g ? fmt(g.P, 1) + ' t' : '—'}, ${g ? gbpTxt(g.press) : '—'} against ${g?.allow ? gbpTxt(g.allow) : 'an allowable not yet entered'}. Ground checked for voids and services; level the crane.`, g ? (g.status === 'info' ? 'warn' : g.status) : 'warn'],
    ['Boom or load strikes a structure or power line', r.clearance != null ? `Closest gap ${fmt(r.clearance, 2)} m (minimum ${mc} m). Banksman watches the gap; slew slowly near structures.` : 'No structures entered near the boom. Walk the site and confirm; keep 6 m+ from live lines.', r.clearance != null ? (r.clearance <= 0 ? 'fail' : r.clearance < mc ? 'warn' : 'ok') : 'ok'],
    ['Load or rigging failure', `Certified tackle only (LOLER), every item inspected and tagged. ${(l.tackles || []).length ? l.tackles.map(t => t.name || TACKLE_TYPES[t.type]).join(', ') : 'Rigging as listed'}; sling angles ≥ 45° to horizontal; tag lines on the load.`, sOf(/Sling|Headroom|Tackle WLL/)],
    ['Wind and weather', w ? `Load wind area ${fmt(w.AW, 1)} m²: lift only up to ${fmt(w.vPerm, 1)} m/s at the boom head (chart ${w.vTab} m/s).${w.vDes != null ? ` Forecast gust ${fmt(w.vDes, 1)} m/s.` : ''}` : wx ? `Gusts ${fmt(wx.maxG, 1)} m/s at the boom head against a ${wx.limit} m/s limit. Check the crane's anemometer before and during the lift.` : 'Check the forecast and the crane\'s anemometer; stop above the chart wind limit.', w ? (w.vDes != null ? (w.vDes > w.vPerm ? 'fail' : w.vDes > 0.8 * w.vPerm ? 'warn' : 'ok') : 'warn') : wx ? wx.status : 'ok'],
    ['People struck by the load or the slewing crane', `Exclusion zone round the load path (radius ${fmt(r.R, 1)} m) and the tail swing (${fmt(num(crane.tail, 4), 1)} m) barriered. Nobody under a suspended load. One signaller in charge.`, 'ok'],
    ...(T ? [['Tandem lift — load moving between cranes', `One lift supervisor directs both operators. Each crane at most ${T.derate}% of its chart; hoist lines kept plumb (stop above 3°); move one motion at a time, slowly.`, sOf(/Tandem|Hoist line|Load tilt/)]] : [])
  ];
  y = ramsTable(P, 10, y, [{ w: 44, t: 'Hazard', a: 'l' }, { w: 120, t: 'Control measures', a: 'l' }, { w: 26, t: 'Residual', a: 'c' }],
    hz.map(([a, b, s]) => ({ cells: [{ t: a, bold: true }, { wrap: b }, ...lvl(s)], h: 8.2 })), { rh: 4.4, fs: 2.15 });
  y += 2;
  // method statement and sign-off
  y = ramsSection(P, 10, y, 190, 'METHOD STATEMENT');
  const tip = r.tipY != null ? `${fmt(r.tipY, 1)} m` : '—', ang = r.geo?.theta != null ? `${fmt(r.geo.theta, 1)}°` : '—';
  const steps = [
    `Permit, toolbox talk and lift briefing. Confirm the weather (${w ? 'stop above ' + fmt(w.vPerm, 1) + ' m/s' : wx ? 'limit ' + wx.limit + ' m/s' : 'chart limit'}) and the ground.`,
    `Set up the ${crane.model} as on the top view: legs ${outExtLabel(outExtOf(plan)).toLowerCase()} on ${g ? g.mat : 'the planned mats'}, level, counterweight ${fmt(num(plan.cwt !== '' && plan.cwt != null ? plan.cwt : (ch?.cwt ?? crane.cwt)), 1)} t, boom ${fmt(r.tele?.L ?? r.geo?.L, 1)} m. Set the LMI to this configuration.`,
    `Rig the load with the listed tackle; check every WLL and certificate. Fit tag lines.`,
    `Trial lift 100–300 mm: hold, check brakes, LMI reading and the legs. Lower and correct anything that moves.`,
    `Lift over the ${SIDE_WORD[sideOf(l)]} at ${fmt(r.R, 2)} m reach (boom ${ang}, boom head ${tip}). Slew slowly; the signaller keeps sight of the load${T ? '; the lift supervisor calls each crane in turn' : ''}.`,
    `Land on ${fmt(r.landY, 2)} m, take the weight off slowly, de-rig. STOP if the LMI warns, the ground moves, the wind rises or anyone is unsure.`
  ];
  steps.forEach((t, i) => { ramsTxt(P, 11, y + 2.4 + i * 3.3, `${i + 1}.`, 2.2, { bold: true }); ramsTxt(P, 15, y + 2.4 + i * 3.3, t, 2.15, { maxW: 184 }); }); y += 2 + steps.length * 3.3;
  y = Math.max(y + 1, 262); ramsSection(P, 10, y, 190, 'SIGN-OFF'); y += 5.2;
  ramsTable(P, 10, y, [{ w: 40, t: 'Role', a: 'l' }, { w: 60, t: 'Name', a: 'l' }, { w: 60, t: 'Signature', a: 'l' }, { w: 30, t: 'Date', a: 'l' }],
    [[{ t: 'Appointed Person', bold: true }, plan.meta?.checkedBy || '', '', ''], [{ t: 'Lift supervisor', bold: true }, '', '', ''], [{ t: 'Crane operator', bold: true }, '', '', ''], [{ t: 'Slinger / signaller', bold: true }, '', '', '']].map(c => ({ cells: c, h: 4.4 })), { rh: 4, fs: 2.3, headFill: '#e9e9ee' });
  ramsFooter(P, 2);
  return { P, svg: P.__extra || '' };
}
function ramsSvgAdd(P, s) { P.__extra = (P.__extra || '') + s; }
// the 3D still: the live 3D scene if it is running, else a short-lived one off screen
function ramsShot(calc) {
  if (!C3D.ok()) return null;
  const c = calc.loads[activeLi()]?.crane || calc.crane;
  try {
    if (state.twin) { state.twin.update(state.plan, calc, c, livery()); return state.twin.snapshot(1400, 984, true); }
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-99999px;top:0;width:700px;height:492px'; document.body.appendChild(host);
    const tw = C3D.twin(host); tw.update(state.plan, calc, c, livery()); const url = tw.snapshot(1400, 984, true); tw.dispose(); host.remove(); return url;
  } catch (e) { console.error(e); return null; }
}
async function exportRAMS() {
  const t0 = performance.now(); toast('Building the RAMS pack…');
  try {
    await ensureEnvLoaded(state.plan);
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('PDF library did not load');
    const calc = state.calc || computePlan(state.plan, cranes(), settingsEff()); const S = settingsEff();
    const shot = ramsShot(calc);
    const pages = [ramsPage1(state.plan, calc, S, shot), ramsPage2(state.plan, calc, S)];
    const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    if (typeof PDF_FONTS !== 'undefined') {
      doc.addFileToVFS('LiberationSans-Regular.ttf', PDF_FONTS.regular); doc.addFont('LiberationSans-Regular.ttf', 'Arial', 'normal');
      doc.addFileToVFS('LiberationSans-Bold.ttf', PDF_FONTS.bold); doc.addFont('LiberationSans-Bold.ttf', 'Arial', 'bold');
    }
    const stage = $('#pdfStage');
    for (let i = 0; i < pages.length; i++) {
      if (i) doc.addPage('a4', 'portrait');
      const base = toSVG(pages[i].P, { viewBox: [0, 0, RAMS_W, RAMS_H], width: RAMS_W + 'mm', height: RAMS_H + 'mm' });
      const svg = base.replace(/<\/svg>\s*$/, pages[i].svg + '</svg>');
      stage.innerHTML = await inlineImages(svg); const el = stage.querySelector('svg'); el.setAttribute('width', String(RAMS_W)); el.setAttribute('height', String(RAMS_H));
      await doc.svg(el, { x: 0, y: 0, width: RAMS_W, height: RAMS_H });
    }
    stage.innerHTML = '';
    doc.setProperties({ title: 'RAMS — ' + fileBase(), subject: 'Risk assessment and method statement', creator: 'FHE Lift Planner ' + APP_VERSION });
    const blob = doc.output('blob'); const ms = performance.now() - t0; state.lastRams = { ms: Math.round(ms), bytes: blob.size, pages: pages.length, shot: !!shot };
    await offerFile(fileBase() + ' RAMS.pdf', blob);
    toast(`RAMS pack ready — ${pages.length} pages in ${(ms / 1000).toFixed(1)} s`);
  } catch (e) { console.error(e); toast('RAMS export failed: ' + e.message); }
}
