// ===== v10 RAMS report pack: the pages =====
// An A4 portrait document written like an Appointed Person's lift file, not a dashboard: a narrow left rail with the section number,
// a 12-column grid (x 32–200 mm) with uneven spans, hairline rules instead of boxes, one accent (FHE yellow) and near-black.
// Pages are built as a list of RpPage objects (primitives + raw SVG, in drawing order) by rpBuild(); rams.js turns them into the PDF.
// Display type is Liberation Sans Bold squeezed to 84 % (SVG transform) — the PDF carries only regular and bold.
const RP_W = 210, RP_H = 297, RP_X0 = 32, RP_X1 = 200, RP_GW = 168, RP_G = 3, RP_CW = (168 - 33) / 12;
const RP_C = { ink: '#111111', grey: '#66666a', mid: '#9a9a9e', line: '#d2d2d4', soft: '#f3f3f1', acc: '#ffc20e', accInk: '#1a1400', ok: '#1b7a46', warn: '#bf6a00', fail: '#c8102e', okBg: '#e3f1e9', warnBg: '#fbecd6', failBg: '#fbe0e3' };
const rpCol = (c, span = 1) => ({ x: RP_X0 + c * (RP_CW + RP_G), w: span * RP_CW + (span - 1) * RP_G });
const rpR = (v) => Math.round(v * 100) / 100;
const rpPad = (n) => String(n).padStart(2, '0');
const rpSt = (s) => s === 'fail' ? RP_C.fail : s === 'warn' ? RP_C.warn : s === 'ok' ? RP_C.ok : RP_C.grey;
const rpStBg = (s) => s === 'fail' ? RP_C.failBg : s === 'warn' ? RP_C.warnBg : s === 'ok' ? RP_C.okBg : RP_C.soft;

// ---------- the page: primitives and raw SVG kept in drawing order ----------
class RpPage {
  constructor(o) { this.P = new Prims(); this.parts = []; Object.assign(this, { sec: null, name: '', cover: false, cont: false, land: false, no: 0 }, o); }
  flush() { if (this.P.list.length) { this.parts.push(ramsInner(this.P, RP_W, RP_H)); this.P.list.length = 0; } } // cleared in place: code may hold on to pg.P
  raw(s) { this.flush(); this.parts.push(s); }
  svg() { this.flush(); return this.parts.join('\n'); }
}
function rpPageSvg(pg) { const w = pg.land ? RP_H : RP_W, h = pg.land ? RP_W : RP_H; const wm = pg.wm ? rpWatermark(pg, w, h) : ['', '']; return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" font-family="Arial, Helvetica, sans-serif"><rect width="${w}" height="${h}" fill="#ffffff"/>${wm[0]}${pg.svg()}${wm[1]}</svg>`; }
// v11: the company mark. An uploaded logo (Settings) wins; otherwise the built-in Friendship Hall mark: a yellow tile with a crane boom,
// hoist rope and hook. Returned as raw SVG (s = size in mm) so it can sit in the page head, on the cover and behind the page.
function rpLogoSvg(x, y, s, S, o = {}) {
  const op = o.op != null ? ` fill-opacity="${o.op}" stroke-opacity="${o.op}"` : '';
  if (S?.logoImg && typeof S.logoImg === 'string') { const n = typeof imgNatural === 'function' ? imgNatural(S.logoImg) : null; let w = s, hh = s, xx = x, yy = y; if (n) { const k = Math.min(s / n.w, s / n.h); w = n.w * k; hh = n.h * k; xx = x + (s - w) / 2; yy = y + (s - hh) / 2; }
    return `<image x="${xx}" y="${yy}" width="${w}" height="${hh}" preserveAspectRatio="none"${o.op != null ? ` opacity="${o.op}"` : ''} href="${esc(S.logoImg)}" xlink:href="${esc(S.logoImg)}"/>`; }
  const k = s / 100, X = (v) => (x + v * k).toFixed(2), Y = (v) => (y + v * k).toFixed(2), sw = (v) => (v * k).toFixed(2);
  return `<g${op}><rect x="${X(0)}" y="${Y(0)}" width="${sw(100)}" height="${sw(100)}" rx="${sw(16)}" fill="#ffc20e"/>`
    + `<path d="M${X(14)} ${Y(84)}L${X(32)} ${Y(84)}L${X(30)} ${Y(66)}L${X(18)} ${Y(66)}Z" fill="#111111"/>`
    + `<path d="M${X(22)} ${Y(70)}L${X(78)} ${Y(20)}" stroke="#111111" stroke-width="${sw(9)}" stroke-linecap="round" fill="none"/>`
    + `<path d="M${X(29)} ${Y(64)}L${X(48)} ${Y(47)}" stroke="#ffc20e" stroke-width="${sw(2.4)}" fill="none"/>`
    + `<path d="M${X(78)} ${Y(20)}L${X(78)} ${Y(52)}" stroke="#111111" stroke-width="${sw(2.6)}" fill="none"/>`
    + `<path d="M${X(73)} ${Y(52)}L${X(83)} ${Y(52)}L${X(81)} ${Y(59)}L${X(75)} ${Y(59)}Z" fill="#111111"/>`
    + `<path d="M${X(78)} ${Y(59)}L${X(78)} ${Y(64)}A${sw(6)} ${sw(6)} 0 1 1 ${X(72)} ${Y(70)}" stroke="#111111" stroke-width="${sw(3.2)}" fill="none" stroke-linecap="round"/>`
    + (o.word === false ? '' : `<text x="${X(50)}" y="${Y(95)}" font-size="${sw(15)}" font-weight="bold" text-anchor="middle" fill="#111111" letter-spacing="${sw(1.5)}">FHE</text>`) + '</g>';
}
// behind the page: the mark large and pale; over the page: the company and document number in fine diagonal lines (a copy shows its source)
function rpWatermark(pg, w, h) {
  const { co, doc, S } = pg.wm; const s = Math.min(w, h) * 0.62; const bg = rpLogoSvg((w - s) / 2, (h - s) / 2 - 4, s, S, { op: 0.045, word: false });
  const t = esc(`${co}  ·  ${doc}  ·  CONTROLLED COPY  ·  `); let ov = `<g fill="#1a1a1a" fill-opacity="0.022" font-size="3" font-weight="bold" font-family="courier">`; // Courier only here: rams_check.js tells the watermark from the layout by it
  for (let i = -5; i < 10; i++) ov += `<text x="${-40}" y="${i * 34}" transform="rotate(-32 ${w / 2} ${h / 2})">${t.repeat(6)}</text>`;
  return [bg, ov + '</g>'];
}
function rpNewPage(c, sec, o = {}) {
  const pg = new RpPage({ sec: sec ? sec.no : null, name: sec ? sec.name : '', ...o }); c.pages.push(pg); if (sec && !sec.page) sec.page = c.pages.length; return pg;
}

// ---------- type ----------
function rpTx(pg, x, y, s, size, o = {}) { // y = baseline. With maxW the text shrinks to fit (down to 55 %), then is cut with an ellipsis rather than run out of its box
  s = String(s ?? ''); let sz = size;
  if (o.maxW) { sz = Math.max(size * (o.minK || 0.55), fitSize(s, o.maxW, size, o.bold)); if (textW(s, sz, o.bold) > o.maxW + 0.05) { while (s.length > 1 && textW(s + '…', sz, o.bold) > o.maxW) s = s.slice(0, -1); s = s.replace(/[\s,;:.]+$/, '') + '…'; } }
  pg.P.text(x, y, s, { size: sz, anchor: o.anchor || 'start', vAlign: 'base', bold: o.bold, color: o.color || RP_C.ink, bg: o.bg, layer: 'RAMS' }); return sz;
}
function rpLabel(pg, x, y, s, o = {}) { return rpTx(pg, x, y, String(s ?? '').toUpperCase(), o.size || 1.9, { bold: true, color: o.color || RP_C.grey, anchor: o.anchor, maxW: o.maxW }); }
function rpDisp(pg, x, y, s, size, o = {}) { // display type: bold, squeezed; returns the width used
  s = String(s ?? ''); const k = o.k || 0.84; let sz = size; if (o.maxW) { const w = textW(s, size, true) * k; if (w > o.maxW) sz = size * o.maxW / w; }
  const anchor = o.anchor === 'end' ? 'end' : o.anchor === 'middle' ? 'middle' : 'start'; const rot = o.rot ? ` rotate(${o.rot})` : '';
  pg.raw(`<text transform="translate(${rpR(x)} ${rpR(y)})${rot} scale(${k} 1)" font-size="${rpR(sz)}" font-weight="bold" text-anchor="${anchor}" fill="${o.color || RP_C.ink}">${esc(s)}</text>`);
  return textW(s, sz, true) * k;
}
function rpDispLines(s, size, k, maxW, maxLines) { // word-wrap display type by measured width
  const words = String(s ?? '').split(/\s+/).filter(Boolean); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (!cur || textW(t, size, true) * k <= maxW) cur = t; else { lines.push(cur); cur = w; } }
  if (cur) lines.push(cur); return lines;
}
function rpLines(s, size, w, bold, maxLines) {
  const words = String(s ?? '').split(/\s+/).filter(Boolean); const lines = []; let cur = '';
  for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (!cur || textW(t, size, bold) <= w) cur = t; else { lines.push(cur); cur = wd; } }
  if (cur) lines.push(cur);
  if (maxLines && lines.length > maxLines) { lines.length = maxLines; let l = lines[maxLines - 1]; while (l.length > 1 && textW(l + '…', size, bold) > w) l = l.slice(0, -1); lines[maxLines - 1] = l.replace(/[\s,;:.]+$/, '') + '…'; }
  return lines;
}
// a paragraph: first baseline y, returns the baseline after the last line
function rpPara(pg, x, y, s, size, w, o = {}) {
  const lead = size * (o.lead || 1.4); const lines = rpLines(s, size, w, o.bold, o.maxLines);
  lines.forEach((l, i) => rpTx(pg, x, y + i * lead, l, size, { bold: o.bold, color: o.color, maxW: w }));
  return y + lines.length * lead;
}
function rpParaH(s, size, w, o = {}) { return rpLines(s, size, w, o.bold, o.maxLines).length * size * (o.lead || 1.4); }
const rpHair = (pg, x1, x2, y, o = {}) => pg.P.line(x1, y, x2, y, { stroke: o.c || RP_C.line, w: o.w ?? 0.15, layer: 'RAMS' });
const rpInk = (pg, x1, x2, y, w = 0.35) => rpHair(pg, x1, x2, y, { c: RP_C.ink, w });
// a label above a value (the way a data sheet reads)
function rpFact(pg, x, y, w, label, value, o = {}) {
  rpLabel(pg, x, y, label, { maxW: w });
  const sz = o.size || 3.3; const lines = rpLines(value || '—', sz, w, true, o.maxLines || 2);
  lines.forEach((l, i) => rpTx(pg, x, y + 4.6 + i * sz * 1.28, l, sz, { bold: true, color: o.color, maxW: w }));
  return y + 4.6 + lines.length * sz * 1.28;
}
// hairline table. cols [{ w, t, a:'l'|'r'|'c', wrap }], rows [[cell | {t,bold,color,a,fill,wrap,draw}] | {cells,h,fill,bold}] ; o.maxY stops before a row that would run off
function rpTable(pg, x, y, cols, rows, o = {}) {
  const fs = o.fs || 2.5, pad = 1.3, lead = fs * 1.32, minH = o.rh || 5.8; const W = cols.reduce((a, c) => a + c.w, 0); let cy = y, n = 0;
  if (cols.some(c => c.t)) {
    let cx = x; for (const c of cols) { rpLabel(pg, c.a === 'r' ? cx + c.w - pad : c.a === 'c' ? cx + c.w / 2 : cx + (o.flush ? 0 : pad), cy + 3.3, c.t, { anchor: c.a === 'r' ? 'end' : c.a === 'c' ? 'middle' : 'start', size: o.hs || 1.8, maxW: c.w - 2 * pad }); cx += c.w; }
    rpInk(pg, x, x + W, cy + 4.6, 0.35); cy += 4.6;
  }
  for (const r of rows) {
    const cells = Array.isArray(r) ? r : r.cells; let hh = r.h || minH;
    const lines = cells.map((v, i) => { const c = cols[i]; const cell = v && typeof v === 'object' ? v : { t: v }; if (cell.draw || !(cell.wrap || c.wrap)) return null; const ls = rpLines(cell.t, cell.fs || fs, c.w - 2 * pad, r.bold || cell.bold, cell.maxLines || c.maxLines); return ls; });
    lines.forEach(ls => { if (ls) { hh = Math.max(hh, ls.length * lead + 2.8); } });
    if (o.maxY && cy + hh > o.maxY) break;
    if (r.fill) pg.P.rect(x, cy, W, hh, { fill: r.fill, stroke: 'none', layer: 'RAMS' });
    let cx = x;
    cells.forEach((v, i) => {
      const c = cols[i]; const cell = v && typeof v === 'object' ? v : { t: v }; const a = cell.a || c.a || 'l'; const sz = cell.fs || fs; const bold = r.bold || cell.bold || c.bold;
      const tx = a === 'r' ? cx + c.w - pad : a === 'c' ? cx + c.w / 2 : cx + (o.flush && i === 0 ? 0 : pad);
      const yt = (j, n) => o.valign === 'top' ? cy + 1.4 + sz * 0.88 + j * lead : cy + hh / 2 + sz * 0.35 + (j - (n - 1) / 2) * lead;
      if (cell.draw) cell.draw(pg, cx, cy, c.w, hh);
      else if (lines[i]) lines[i].forEach((l, j) => rpTx(pg, tx, yt(j, lines[i].length), l, sz, { bold, color: cell.color, anchor: a === 'r' ? 'end' : a === 'c' ? 'middle' : 'start', maxW: c.w - 2 * pad }));
      else rpTx(pg, tx, yt(0, 1), cell.t, sz, { bold, color: cell.color, anchor: a === 'r' ? 'end' : a === 'c' ? 'middle' : 'start', maxW: c.w - 2 * pad });
      cx += c.w;
    });
    if (!o.noRules) rpHair(pg, x, x + W, cy + hh, { c: r.rule || RP_C.line, w: r.rule ? 0.35 : 0.15 });
    cy += hh; n++;
  }
  return { y: cy, n };
}
// a drawing made on its own primitives at k× size and placed in a box of the page
function rpDrawing(pg, x, y, w, h, k, fn) {
  const Pd = new Prims(); Pd.rect(0, 0, w * k, h * k, { fill: '#ffffff', stroke: 'none' });
  try { fn(Pd, { x: 0, y: 0, w: w * k, h: h * k }); } catch (e) { console.error(e); }
  pg.raw(ramsEmbed(Pd, w * k, h * k, x, y, w));
}
// the elevation at an exact scale (the sheet snaps to 1:N steps, which wastes a third of a small box)
function rpElev(c, Pd, box, extra = {}) {
  const res = c.calc.loads[c.li]; let sc;
  try { const ext = elevationExtents(c.plan, res, c.crane, res.geo); const kRaw = Math.min((box.w - 36) / (ext.xmax - ext.xmin), (box.h - 12 - (extra.padB ?? 38)) / (ext.ymax - ext.ymin)); if (kRaw > 0 && isFinite(kRaw)) sc = { N: Math.max(1, Math.round(1000 / kRaw)), k: kRaw }; } catch (e) { sc = null; }
  return drawElevation(Pd, box, c.plan, c.calc, c.li, { livery: livery(), titleLines: [''], mainLabel: c.ch?.mainLabel, scale: sc || undefined, ...extra });
}
function rpStamp(pg, cx, cy, w, h, ang, color, l1, l2) { // an issue stamp: a rotated outline with two lines of text
  const a = ang * D2R, ca = Math.cos(a), sa = Math.sin(a); const pt = (dx, dy) => [cx + dx * ca - dy * sa, cy + dx * sa + dy * ca];
  const c4 = [pt(-w / 2, -h / 2), pt(w / 2, -h / 2), pt(w / 2, h / 2), pt(-w / 2, h / 2)]; pg.P.poly(c4, { closed: true, fill: 'none', stroke: color, w: 0.7, layer: 'RAMS' });
  const i4 = [pt(-w / 2 + 1.2, -h / 2 + 1.2), pt(w / 2 - 1.2, -h / 2 + 1.2), pt(w / 2 - 1.2, h / 2 - 1.2), pt(-w / 2 + 1.2, h / 2 - 1.2)]; pg.P.poly(i4, { closed: true, fill: 'none', stroke: color, w: 0.2, layer: 'RAMS' });
  const t1 = pt(0, -0.8), t2 = pt(0, 4.2); const sz1 = Math.min(3.4, fitSize(l1, w - 6, 3.4, true));
  pg.P.text(t1[0], t1[1], l1, { size: sz1, anchor: 'middle', vAlign: 'base', bold: true, color, rot: ang, layer: 'RAMS' });
  if (l2) pg.P.text(t2[0], t2[1], l2, { size: Math.min(2.2, fitSize(l2, w - 6, 2.2, false)), anchor: 'middle', vAlign: 'base', color, rot: ang, layer: 'RAMS' });
}
function rpCheckBox(pg, x, y, s = 3.2, on = false) { pg.P.rect(x, y, s, s, { fill: 'none', stroke: RP_C.ink, w: 0.3, layer: 'RAMS' }); if (on) pg.P.poly([[x + 0.6, y + s * 0.55], [x + s * 0.42, y + s - 0.7], [x + s - 0.5, y + 0.6]], { stroke: RP_C.ink, w: 0.45, layer: 'RAMS' }); }
// the numbers behind every page, worked out once
function rpCtx(plan, calc, S, shot) {
  const li = activeLi(), r = calc.loads[li], l = plan.loads[li], m = plan.meta || {};
  const crane = r.crane || calc.crane, ch = r.chartDef, T = r.tandem || null, rigI = r.rigI || 0;
  const pv = (calc.rigs || []).find(x => x.i === rigI)?.pv || plan;
  const O = (calc.outrigs || []).find(o => o.rigI === rigI) || calc.outr || null; const g = calc.ground || null; const ck = allChecks(calc);
  const revs = m.revs || []; const rev = revs.length ? String(revs[revs.length - 1].rev || revs.length) : '0';
  const base = String(m.drawingNo || '').trim().replace(/\s+/g, '-') || ('FHE-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(plan.id || plan.name || 'plan').replace(/[^\w]/g, '').slice(-4).toUpperCase());
  const today = new Date().toLocaleDateString('en-GB'); const date = m.date || today;
  const site = plan.weather?.place || (plan.env || []).find(e => e.geo)?.geo?.place || '';
  const cwt = num(pv.cwt !== '' && pv.cwt != null ? pv.cwt : (ch?.cwt ?? crane.cwt));
  const nF = ck.filter(x => x.s === 'fail').length, nW = ck.filter(x => x.s === 'warn').length, nOk = ck.filter(x => x.s === 'ok').length;
  const st = calc.status; const util = T ? T.maxUtil : r.util; const limit = T ? T.derate : num(S.utilMax, 90);
  const verdict = st === 'fail' ? { word: 'DO NOT LIFT AS PLANNED', col: RP_C.fail, bg: RP_C.failBg, stamp: 'NOT FOR USE', doc: 'Not approved' } : st === 'warn' ? { word: 'CRITICAL LIFT. AP SIGN-OFF REQUIRED', col: RP_C.warn, bg: RP_C.warnBg, stamp: 'ISSUED FOR APPROVAL', doc: 'For approval' } : { word: 'SAFE TO LIFT AS PLANNED', col: RP_C.ok, bg: RP_C.okBg, stamp: 'ISSUED FOR APPROVAL', doc: 'For approval' };
  const first = ck.find(x => x.s === 'fail') || ck.find(x => x.s === 'warn');
  verdict.line = st === 'fail' ? `${nF} red item${nF > 1 ? 's' : ''} open${first ? '. First: ' + first.t : ''}. Fix ${nF > 1 ? 'them' : 'it'} and issue again before any lift.` : st === 'warn' ? `${nW} amber item${nW > 1 ? 's need a named control' : ' needs a named control'} and the Appointed Person's signature before the lift.` : `All ${nOk} checks pass. Brief the crew and follow the method statement.`;
  const tackles = r.stack?.items || [];
  const cranesTxt = T ? T.picks.map(p => `C${p.crane + 1} ${p.model}`).join(' + ') : `${crane.make || ''} ${crane.model}`.trim();
  return { plan, calc, S, shot, li, r, l, m, crane, ch, T, rigI, pv, O, g, ck, rev, revs, docNo: 'RAMS-' + base, base, date, today, site, cwt, nF, nW, nOk, st, util, limit, verdict, tackles, cranesTxt,
    jobTitle: m.title || l.name || plan.name || 'Lifting plan', ap: m.checkedBy || '', pages: [], secs: [], d: plan.docs || {} };
}
// ---------- page furniture: rail, running head, footer, "controlled copy" strip ----------
function rpFurniture(pg, c, N) {
  const P = pg.P; const S = c.S; pg.wm = { co: (S.company || 'FRIENDSHIP HALL EST').toUpperCase(), doc: c.docNo, S };
  if (pg.land) { // the fitted A1 sheet: a landscape page with a footer only
    if (pg.head) { pg.raw(rpLogoSvg(10, 5.6, 7.4, S)); rpTx(pg, 19.6, 10.6, (S.company || 'FRIENDSHIP HALL EST').toUpperCase(), 2.2, { bold: true, maxW: 84 }); rpTx(pg, 287, 10.6, `${c.docNo}  /  REV ${c.rev}`, 2.2, { anchor: 'end', color: RP_C.grey, bold: true, maxW: 90 }); rpInk(pg, 10, 287, 14.2, 0.3); }
    rpHair(pg, 10, 287, 196, { c: RP_C.ink, w: 0.25 }); rpTx(pg, 10, 200.3, `${c.docNo}  ·  Rev ${c.rev}  ·  ${c.date}`, 2.3, { bold: true, maxW: 140 }); rpTx(pg, 287, 200.3, `Page ${pg.no} of ${N}`, 2.3, { bold: true, anchor: 'end' });
    P.rect(10, 202.4, 277, 4.4, { fill: RP_C.ink, stroke: 'none', layer: 'RAMS' }); P.rect(10, 202.4, 4.4, 4.4, { fill: RP_C.acc, stroke: 'none', layer: 'RAMS' }); rpTx(pg, 16.6, 205.4, 'CONTROLLED COPY', 2, { bold: true, color: '#ffffff' });
    rpTx(pg, 40.5, 205.4, "Planning document. The Appointed Person checks it; the crane maker's load chart and the crane's LMI govern.", 1.9, { color: '#d8d8d8', maxW: 240 }); return;
  }
  if (!pg.cover) {
    pg.raw(rpLogoSvg(RP_X0, 4.8, 7.4, S)); rpTx(pg, RP_X0 + 9.6, 10.6, (S.company || 'FRIENDSHIP HALL EST').toUpperCase(), 2.2, { bold: true, maxW: 84 });
    rpTx(pg, RP_X1, 10.6, `${c.docNo}  /  REV ${c.rev}`, 2.2, { anchor: 'end', color: RP_C.grey, bold: true, maxW: 90 });
    rpInk(pg, RP_X0, RP_X1, 13.2, 0.3);
    if (pg.sec != null) {
      rpDisp(pg, 10, 34.2, rpPad(pg.sec), 20, { color: RP_C.ink });
      P.rect(10, 37.4, 13, 1.5, { fill: RP_C.acc, stroke: 'none', layer: 'RAMS' });
      if (pg.cont) rpLabel(pg, 10, 43.2, 'Continued', { size: 1.7 });
      pg.P.text(14.2, 276, `${pg.name}  ·  ${c.jobTitle}`.toUpperCase().slice(0, 70), { size: 1.9, anchor: 'start', vAlign: 'base', bold: true, color: RP_C.mid, rot: -90, layer: 'RAMS' });
    }
  }
  rpHair(pg, 10, 200, 282, { c: RP_C.ink, w: 0.25 });
  rpTx(pg, 10, 286.3, `${c.docNo}  ·  Rev ${c.rev}  ·  ${c.date}`, 2.3, { bold: true, maxW: 110 });
  rpTx(pg, 200, 286.3, `Page ${pg.no} of ${N}`, 2.3, { bold: true, anchor: 'end' });
  P.rect(10, 288.4, 190, 4.4, { fill: RP_C.ink, stroke: 'none', layer: 'RAMS' }); P.rect(10, 288.4, 4.4, 4.4, { fill: RP_C.acc, stroke: 'none', layer: 'RAMS' });
  rpTx(pg, 16.6, 291.4, 'CONTROLLED COPY', 2, { bold: true, color: '#ffffff' });
  rpTx(pg, 40.5, 291.4, "Planning document. The Appointed Person checks it; the crane maker's load chart and the crane's LMI govern.", 1.9, { color: '#d8d8d8', maxW: 158 });
}
// the heading block: kicker, display title, standfirst in the right-hand columns
function rpHead(pg, c, kicker, title, stand) {
  rpLabel(pg, RP_X0, 21.5, kicker);
  rpDisp(pg, RP_X0, 34.2, title, 11.5, { maxW: stand ? 106 : 168 });
  if (stand) { const col = rpCol(8, 4); rpPara(pg, col.x, 21.6, stand, 2.45, col.w, { color: RP_C.grey, maxLines: 5, lead: 1.42 }); }
  rpInk(pg, RP_X0, RP_X1, 40, 0.5);
}
// ---------- 0 · cover ----------
function rpCover(c) {
  const pg = rpNewPage(c, null, { cover: true, name: 'Cover' }); const P = pg.P, S = c.S, m = c.m, l = c.l, r = c.r, v = c.verdict;
  pg.raw(rpLogoSvg(10, 9, 18, S)); // v11: the company mark (uploaded logo, else the built-in one)
  rpTx(pg, 30, 14.6, (S.company || 'FRIENDSHIP HALL EST').toUpperCase(), 4.2, { bold: true, maxW: 100 });
  (S.companyLines || []).slice(0, 3).forEach((t, i) => rpTx(pg, 30, 19.2 + i * 3.3, t, 2.1, { color: RP_C.grey, maxW: 100 }));
  rpLabel(pg, 200, 12, 'Document no.', { anchor: 'end' }); rpTx(pg, 200, 18.4, c.docNo, 4.6, { anchor: 'end', bold: true, maxW: 66 });
  rpTx(pg, 200, 23.6, `Revision ${c.rev}   ·   ${c.date}`, 2.5, { anchor: 'end', color: RP_C.grey });
  rpLabel(pg, 200, 28.4, v.doc, { anchor: 'end', color: v.col });
  P.rect(10, 33.4, 48, 1.7, { fill: RP_C.acc, stroke: 'none', layer: 'RAMS' }); rpInk(pg, 10, 200, 35.1, 0.6);
  P.rect(10, 46, 3.4, 232, { fill: RP_C.ink, stroke: 'none', layer: 'RAMS' }); P.rect(10, 46, 3.4, 34, { fill: RP_C.acc, stroke: 'none', layer: 'RAMS' });
  rpLabel(pg, RP_X0, 48.2, 'Lifting operation  ·  Risk assessment  ·  Method statement', { size: 2.1 });
  // the job, large
  let size = 17, lines = rpDispLines(c.jobTitle, size, 0.84, 112); if (lines.length > 2) { size = 12.5; lines = rpDispLines(c.jobTitle, size, 0.84, 112).slice(0, 3); }
  let y = 49.5 + size * 0.95; lines.forEach((t, i) => { rpDisp(pg, RP_X0, y + i * size * 0.98, t, size, { maxW: 114 }); }); y += (lines.length - 1) * size * 0.98;
  y += 9; rpTx(pg, RP_X0, y, [m.project || c.plan.name, c.site].filter((x, i, a) => x && a.indexOf(x) === i).join('  ·  '), 4.1, { color: RP_C.grey, maxW: 112 });
  rpStamp(pg, 177, 66, 40, 15, -6, v.col, v.stamp, `REV ${c.rev}  ·  ${c.date}`);
  // key facts: uneven columns, no boxes
  const f1 = [62, 58, 48]; let fy = y + 9; const fx = [RP_X0, RP_X0 + f1[0] + 0, RP_X0 + f1[0] + f1[1]];
  rpInk(pg, RP_X0, RP_X1, fy - 4.6, 0.3);
  const T = c.T; const wTxt = T ? `${fmt(T.W, 2)} t over ${T.picks.length} cranes` : `${fmt(r.W, 2)} t${r.contOn ? ' + ' + fmt(r.cont, 0) + '% margin' : ''}`;
  const e1 = Math.max(rpFact(pg, fx[0], fy, f1[0] - 4, 'Client', m.client || '—'), rpFact(pg, fx[1], fy, f1[1] - 4, 'Project', m.project || c.plan.name || '—'), rpFact(pg, fx[2], fy, f1[2], 'Date of lift', c.date));
  fy = e1 + 3.2; rpHair(pg, RP_X0, RP_X1, fy - 4.4, { w: 0.15 });
  const e2 = Math.max(rpFact(pg, fx[0], fy, f1[0] - 4, T ? 'Cranes' : 'Crane', c.cranesTxt || '—'), rpFact(pg, fx[1], fy, f1[1] - 4, 'Load', `${l.name ? l.name + ', ' : ''}${wTxt}`), rpFact(pg, fx[2], fy, f1[2], 'Radius · boom', `${fmt(r.R, 1)} m  ·  ${fmt(r.tele?.L ?? r.geo?.L, 1)} m`));
  // hero: the elevation
  const hy = e2 + 4, hh = Math.max(58, Math.min(86, 214 - hy)); rpInk(pg, RP_X0, RP_X1, hy, 0.3);
  if (c.shot) { // v11: the 3D render, full width, cropped to the band (never stretched)
    const ih = RP_GW * 984 / 1400; P.rect(RP_X0, hy + 1, RP_GW, hh, { fill: '#1b2229', stroke: 'none', layer: 'RAMS' }); P.image(RP_X0, hy + 1 - Math.max(0, (ih - hh) / 2), RP_GW, ih, c.shot, { layer: 'RAMS', fit: 'none', clip: [RP_X0, hy + 1, RP_GW, hh] });
    P.rect(RP_X0, hy + 1, 46, 6.4, { fill: '#11161c', stroke: 'none', layer: 'RAMS' }); rpTx(pg, RP_X0 + 2.4, hy + 5.4, '3D VIEW OF THE LIFT', 2.1, { bold: true, color: '#ffc20e' });
  } else rpDrawing(pg, RP_X0, hy + 1, RP_GW, hh, 2.6, (Pd, box) => rpElev(c, Pd, box));
  rpInk(pg, RP_X0, RP_X1, hy + hh + 2, 0.3);
  rpTx(pg, RP_X0, hy + hh + 5.6, `${c.shot ? '3D view' : 'Elevation'}  ·  ${c.cranesTxt}  ·  radius ${fmt(r.R, 2)} m  ·  over the ${SIDE_WORD[sideOf(l)]}  ·  not to scale`, 2, { color: RP_C.grey, maxW: 168 });
  // the elevation (or the top view) and the verdict
  const by = 221, bw = 80, bh = 56.2;
  if (c.shot) rpDrawing(pg, RP_X0, by, bw, bh, 2.6, (Pd, box) => rpElev(c, Pd, box, { padB: 26 }));
  else rpDrawing(pg, RP_X0, by, bw, bh, 2.6, (Pd, box) => drawSitePlan(Pd, box, c.plan, c.calc, { livery: livery() }));
  const vx = 122, vw = 78; P.rect(vx, by, 1.6, bh, { fill: v.col, stroke: 'none', layer: 'RAMS' });
  rpLabel(pg, vx + 5, by + 4, 'Status of this lift');
  const vl = rpDispLines(v.word, 8.4, 0.84, vw - 7).slice(0, 3); vl.forEach((t, i) => rpDisp(pg, vx + 5, by + 12.5 + i * 8.2, t, 8.4, { color: v.col, maxW: vw - 6 }));
  rpPara(pg, vx + 5, by + 12.5 + (vl.length - 1) * 8.2 + 6.5, v.line, 2.4, vw - 7, { color: RP_C.ink, maxLines: 4, lead: 1.4 });
  const ut = c.util != null ? fmt(c.util, 1) + '%' : 'out of reach'; const uw = rpDisp(pg, vx + 5, by + bh - 1, ut, 14, { color: RP_C.ink, maxW: 40 });
  rpTx(pg, vx + 5 + uw + 2.4, by + bh - 6.8, T ? `of the tandem limit ${T.derate}%` : 'of the chart capacity', 2.2, { color: RP_C.grey, maxW: vw - uw - 9 });
  rpTx(pg, vx + 5 + uw + 2.4, by + bh - 3.2, T ? 'worst crane' : `${c.ch ? c.ch.name : 'capacity typed by hand'}`, 2, { color: RP_C.grey, maxW: vw - uw - 9 });
  return pg;
}

// ---------- 1 · document control ----------
function rpSecDoc(c, sec, idx) {
  const pg = new RpPage({ sec: sec.no, name: sec.name }); c.pages[idx] = pg; sec.page = idx + 1; const m = c.m, v = c.verdict;
  rpHead(pg, c, 'Control', 'Document control', `Controlled copy of revision ${c.rev}. Issue a new revision when the crane, load, radius, lift side or site changes.`);
  let y = 49; rpLabel(pg, RP_X0, y, 'Revision history');
  const rv = rpCol(0, 8), isx = rpCol(8, 4); const rows = (c.revs || []).map((x, i, a) => [{ t: String(x.rev ?? i + 1), bold: true, draw: i === a.length - 1 ? (pg2, cx, cy, w, h) => { pg2.P.rect(cx, cy + 1, 1, h - 2, { fill: RP_C.acc, stroke: 'none', layer: 'RAMS' }); rpTx(pg2, cx + 2.4, cy + h / 2 + 0.9, String(x.rev ?? i + 1), 2.6, { bold: true }); } : undefined }, x.date || '', { t: x.desc || '', wrap: true }, { t: x.by || m.drawnBy || '', wrap: true, maxLines: 2 }]);
  if (!rows.length) rows.push([{ t: c.rev, bold: true }, c.date, { t: 'First issue', wrap: true }, { t: m.drawnBy || '', wrap: true, maxLines: 2 }]);
  while (rows.length < 3) rows.push(['', '', '', '']); // room for the next revisions
  const rt = rpTable(pg, rv.x, y + 3, [{ w: 14, t: 'Rev' }, { w: 22, t: 'Date' }, { w: 53, t: 'Description' }, { w: 20, t: 'By' }], rows.slice(-8), { rh: 6 });
  rpFact(pg, isx.x, y, isx.w, 'Document no.', c.docNo, { size: 3.1 }); let iy = y + 11.5;
  iy = rpFact(pg, isx.x, iy, isx.w, 'Revision', `${c.rev}  ·  ${c.date}`, { size: 3.1 }) + 3.4;
  iy = rpFact(pg, isx.x, iy, isx.w, 'Status', v.doc, { size: 3.1, color: v.col }) + 3.4;
  rpFact(pg, isx.x, iy, isx.w, 'Valid for', 'This lift only', { size: 3.1 });
  // approval
  y = Math.max(rt.y, y + 36) + 9; rpLabel(pg, RP_X0, y, 'Approval'); const ap = (name) => ({ t: name || '', bold: true });
  const sig = { draw: (pg2, cx, cy, w, h) => rpHair(pg2, cx + 2, cx + w - 4, cy + h - 3.2, { c: RP_C.mid, w: 0.2 }) };
  rpTable(pg, RP_X0, y + 3, [{ w: 40, t: 'Role' }, { w: 48, t: 'Name' }, { w: 54, t: 'Signature' }, { w: 26, t: 'Date' }], [
    [{ t: 'Prepared by', bold: true }, ap(m.drawnBy), sig, sig], [{ t: 'Checked by', bold: true }, ap(m.checkedBy), sig, sig], [{ t: 'Approved by', bold: true }, ap(rpDv(c, 'approver')), sig, sig]].map(q => ({ cells: q, h: 12 })), { rh: 12 });
  rpTx(pg, RP_X0 + 1.3, y + 3 + 4.6 + 36 + 4, 'Prepared by: the planner who built the plan. Checked by: the Appointed Person. Approved by: the client or principal contractor where the contract asks for it.', 2, { color: RP_C.grey, maxW: 166 });
  // distribution and contents
  y += 3 + 4.6 + 36 + 12; const dl = rpCol(0, 5), ct = rpCol(6, 6); rpLabel(pg, dl.x, y, 'Distribution'); rpLabel(pg, ct.x, y, 'Contents');
  const hold = [['Client', [m.client, rpDv(c, 'clientRep')].filter(Boolean).join(', ')], ['Site manager', rpDv(c, 'siteManager')], ['Lift supervisor', rpDv(c, 'supervisor')], ['Crane operator', rpDv(c, 'operator')], ['Slinger / signaller', rpDv(c, 'slinger')], [`${(c.S.company || 'FHE').split(' ').slice(0, 2).join(' ')} operations file`, '']];
  const dtab = rpTable(pg, dl.x, y + 3, [{ w: 9, t: 'Copy' }, { w: 40, t: 'Holder' }, { w: dl.w - 49, t: 'Received', a: 'l' }], hold.map(([a, b], i) => [{ t: String(i + 1), bold: true }, { t: a + (b ? ', ' + b : ''), wrap: true, maxLines: 2 }, '']), { rh: 6.4 });
  const toc = [...c.secs].filter(s => s.page).map(s => [{ t: rpPad(s.no), bold: true, color: RP_C.grey }, { t: s.name, bold: true }, { t: String(s.page), a: 'r', bold: true }]);
  rpTable(pg, ct.x, y + 3, [{ w: 9, t: 'No.' }, { w: ct.w - 24, t: 'Section' }, { w: 15, t: 'Page', a: 'r' }], [...(c.hasCover ? [[{ t: '', color: RP_C.grey }, { t: 'Cover', bold: true }, { t: '1', a: 'r', bold: true }]] : []), ...toc], { rh: 5.4 });
  let by = Math.max(y + 3 + 4.6 + hold.length * 6.4, dtab?.y ?? 0) + 9; rpLabel(pg, dl.x, by, 'Basis of this document'); by += 2;
  ['BS 7121-1: safe use of cranes', 'EN 13000: mobile cranes', 'EN 13001-2: load actions, dynamic factor', 'EN 1492, EN 818-4, EN 13889: slings, chain, shackles', "The crane maker's load chart for this machine"].forEach(t => { rpHair(pg, dl.x, dl.x + dl.w, by + 5); rpTx(pg, dl.x + 0.6, by + 3.6, t, 2.2, { maxW: dl.w - 1 }); by += 5; });
  const ny = Math.max(by + 1, y + 3 + 4.6 + (toc.length + 1) * 5.4) + 7;
  pg.P.rect(RP_X0, ny, 1.5, 17, { fill: RP_C.acc, stroke: 'none', layer: 'RAMS' });
  rpLabel(pg, RP_X0 + 5, ny + 3.4, 'Controlled copy', { color: RP_C.ink });
  rpPara(pg, RP_X0 + 5, ny + 8.2, 'This copy is controlled while it carries the revision in the footer and the Appointed Person\'s signature above. A printed or forwarded copy is uncontrolled: check its revision against the current issue before anyone lifts from it. ' + (rpSecNo(c, 'crane') ? `Crane maker documents listed in section ${rpPad(rpSecNo(c, 'crane'))} are reference only.` : '') + '', 2.3, 160, { color: RP_C.ink, maxLines: 4 });
  return pg;
}
// ---------- 2 · lift summary ----------
function rpGauge(pg, x, y, w, util, warn, max, col) { // a thin utilisation bar with the warning and stop marks
  pg.P.rect(x, y, w, 2.4, { fill: RP_C.soft, stroke: RP_C.line, w: 0.15, layer: 'RAMS' });
  if (util != null) pg.P.rect(x, y, Math.min(w, w * util / 100), 2.4, { fill: col, stroke: 'none', layer: 'RAMS' });
  [[warn, 'amber'], [max, 'stop']].forEach(([t, nm]) => { const tx = x + w * t / 100; pg.P.line(tx, y - 1.4, tx, y + 3.8, { stroke: RP_C.ink, w: 0.3, layer: 'RAMS' }); rpTx(pg, tx, y + 6.4, `${rpR(t)}%`, 1.9, { anchor: 'middle', color: RP_C.grey }); });
}
function rpWindLimit(c) { const r = c.r, wx = c.calc.weather; if (r.wind?.vPerm != null) return [fmt(r.wind.vPerm, 1), `from the load's ${fmt(r.wind.AW, 1)} m² wind area`]; if (wx?.limit) return [fmt(wx.limit, 1), 'weather limit on this plan']; const p = parseFloat(String(c.pv.wind || '').replace(',', '.')); if (p > 0) return [fmt(p, 1), 'typed on the plan']; return ['9.8', 'chart default at the boom head']; }
function rpSecSummary(c, sec) {
  const pg = rpNewPage(c, sec); const { r, l, g, T, S, verdict: v } = c; const t2 = (x) => `${fmt(x, 2)} t`;
  const worst = c.util == null ? 'fail' : T ? (c.util > c.limit ? 'fail' : c.util > c.limit * 0.9 ? 'warn' : 'ok') : utilCls(r);
  rpHead(pg, c, 'Overview', 'Lift summary', c.util == null ? 'No chart capacity at this radius.' : `${fmt(c.util, 1)}% of the ${T ? 'tandem limit' : 'chart'} at ${fmt(r.R, 1)} m. ${c.nF ? c.nF + ' red' : 'No red'} and ${c.nW ? c.nW + ' amber' : 'no amber'} item${c.nW === 1 ? '' : 's'}.`);
  // hero: utilisation
  let y = 49; const h1 = rpCol(0, 5); rpLabel(pg, h1.x, y, T ? 'Worst crane against the tandem limit' : 'Utilisation of the chart', { maxW: h1.w });
  const uw = rpDisp(pg, h1.x, y + 24, c.util != null ? fmt(c.util, 1) : '—', 27, { color: RP_C.ink, maxW: h1.w - 14 }); if (c.util != null) rpDisp(pg, h1.x + uw + 1.2, y + 24, '%', 13, { color: RP_C.grey });
  rpGauge(pg, h1.x, y + 30, h1.w - 6, c.util, T ? c.limit * 0.9 : num(S.utilWarn, 75), c.limit, rpSt(worst));
  rpPara(pg, h1.x, y + 43, T ? `Each crane may use ${T.derate}% of its own chart. The busiest uses ${fmt(T.maxUtil, 1)}%.` : r.cap != null ? `Design load ${t2(r.design)} against ${t2(r.netCap)} net. Gross chart capacity ${t2(r.cap)} at ${fmt(r.R, 2)} m.` : 'The chart gives no capacity at this radius.', 2.4, h1.w - 6, { color: RP_C.grey, maxLines: 3 });
  const gp = g ? gbpTxt(g.press).split(' ') : null; const wl = rpWindLimit(c); const th = r.geo?.theta;
  const stats = [['Load', fmt(r.W, 2), 't', r.contOn && r.contW ? `+ ${fmt(r.contW, 2)} t margin` : 'no margin added'], ['Total hook load', fmt(r.design ?? r.total, 2), 't', r.daf ? `incl. DAF ${r.daf.toFixed(2)}` : 'load, hook, tackle'], ['Radius', fmt(r.R, 1), 'm', `over the ${SIDE_WORD[sideOf(l)]}`],
    ['Boom', fmt(r.tele?.L ?? r.geo?.L, 1), 'm', th != null ? `at ${fmt(th, 1)}°` : ''], ['Ground pressure', gp ? gp[0] : '—', gp ? gp.slice(1).join(' ') : '', g ? (g.allow ? `allowable ${gbpTxt(g.allow)}` : 'allowable not entered') : 'ground check is off'], ['Wind limit', wl[0], 'm/s', wl[1]]];
  const sx = rpCol(5, 7); const cw = (sx.w + 3) / 3;
  stats.forEach(([lab, val, unit, sub], i) => { const cx = sx.x + (i % 3) * cw, cy = y + Math.floor(i / 3) * 26; if (i % 3 === 0 || true) rpHair(pg, cx, cx + cw - 4, cy - 3.4, { c: RP_C.ink, w: 0.3 });
    rpLabel(pg, cx, cy, lab, { maxW: cw - 4 }); const w = rpDisp(pg, cx, cy + 11, val, 10.5, { maxW: cw - 14 }); rpTx(pg, cx + w + 1.2, cy + 11, unit, 2.5, { color: RP_C.grey, bold: true, maxW: cw - w - 5 }); rpTx(pg, cx, cy + 16.4, sub, 2.1, { color: RP_C.grey, maxW: cw - 4 }); });
  // verdict and the reasons
  y = 107; rpInk(pg, RP_X0, RP_X1, y - 5, 0.5); const vc = rpCol(0, 4), rc = rpCol(4, 8); rpLabel(pg, vc.x, y, 'Verdict');
  const vl = rpDispLines(v.word, 9.2, 0.84, vc.w).slice(0, 4); vl.forEach((t, i) => rpDisp(pg, vc.x, y + 11 + i * 8.6, t, 9.2, { color: v.col, maxW: vc.w }));
  const vEnd = rpPara(pg, vc.x, y + 11 + (vl.length - 1) * 8.6 + 6.6, v.line, 2.4, vc.w, { color: RP_C.ink, maxLines: 6 });
  rpLabel(pg, rc.x, y, 'What the checks say'); const list = c.ck.filter(x => x.s === 'fail' || x.s === 'warn'); const oks = c.ck.filter(x => x.s === 'ok' || x.s === 'info'); const show = [...list, ...oks].slice(0, 11);
  const sq = (s) => ({ draw: (pg2, cx, cy, w, h) => pg2.P.rect(cx + 1.2, cy + 2.2, 2.8, 2.8, { fill: rpSt(s), stroke: 'none', layer: 'RAMS' }) });
  const tr = rpTable(pg, rc.x, y + 3, [{ w: 6.5 }, { w: 31, t: 'Check' }, { w: rc.w - 37.5, t: list.length ? 'Finding' : 'Margin' }], show.map(x => ({ cells: [sq(x.s), { t: x.t, bold: true, wrap: true, maxLines: 2 }, { t: String(x.m || '').replace(/\s+/g, ' '), wrap: true, maxLines: 3, color: x.s === 'fail' || x.s === 'warn' ? RP_C.ink : RP_C.grey }] })), { rh: 5.8, fs: 2.25, maxY: 205, valign: 'top' });
  if (tr.n < show.length) rpTx(pg, rc.x + 1.3, tr.y + 4, `and ${show.length - tr.n} more on the A1 plan`, 2.1, { color: RP_C.grey });
  // load build-up and capacity
  y = Math.max(tr.y, vEnd) + 13; const lb = rpCol(0, 7), cp = rpCol(8, 4); rpLabel(pg, lb.x, y, 'Load build-up'); rpLabel(pg, cp.x, y, 'Capacity');
  const L = [['Load weight', t2(r.W)], [`Safety margin ${r.contOn ? fmt(r.cont, 0) + '%' : 'off'}`, t2(r.contW)], ['Hook block', t2(r.hb)], ['Slings, shackles, beams', t2(r.tk)], ...(r.ex ? [['Other', t2(r.ex)]] : []), ...(r.jd ? [['Folded jib (deduction)', t2(r.jd)]] : []), ...(r.rope ? [['Hoist rope (deduction)', t2(r.rope)]] : []),
    { cells: [{ t: 'Total hook load', bold: true }, { t: t2(r.total), bold: true }], rule: RP_C.ink }, ...(r.daf ? [[`Dynamic factor ${r.daf.toFixed(3)} (EN 13001-2)`, t2(r.design)]] : [])];
  rpTable(pg, lb.x, y + 3, [{ w: lb.w - 30 }, { w: 30, a: 'r' }], L, { rh: 5.4 });
  if (T) rpTable(pg, cp.x, y + 3, [{ w: 14 }, { w: 14, a: 'r' }, { w: cp.w - 28, a: 'r' }], T.picks.map(p => [`C${p.crane + 1}`, `${fmt(p.share, 1)} t`, { t: p.util != null ? `${fmt(p.util, 1)}%` : '—', bold: true, color: rpSt(p.util == null || p.util > T.derate ? 'fail' : p.util > T.derate * 0.9 ? 'warn' : 'ok') }]), { rh: 5.4 });
  else rpTable(pg, cp.x, y + 3, [{ w: cp.w - 22 }, { w: 22, a: 'r' }], [['Chart capacity', r.cap != null ? t2(r.cap) : '—'], ['Less deductions', r.ded != null ? `− ${t2(r.ded)}` : '—'], { cells: [{ t: 'Net capacity', bold: true }, { t: r.netCap != null ? t2(r.netCap) : '—', bold: true }], rule: RP_C.ink }, ['Design load', t2(r.design)], [{ t: 'Utilisation', bold: true }, { t: r.util != null ? `${fmt(r.util, 1)}%` : '—', bold: true, color: rpSt(worst) }], ['Margin on chart', r.margin != null ? `${fmt(r.margin, 1)}%` : '—']], { rh: 5.4 });
  rpTx(pg, RP_X0, 270, `Chart: ${c.ch ? c.ch.name : 'typed by hand'}${c.ch?.source ? '  ·  source ' + c.ch.source : ''}${c.ch && c.ch.verify ? '  ·  transcribed from a public datasheet: check it against the maker\'s chart' : ''}`, 2.2, { color: RP_C.grey, maxW: 168 });
  return pg;
}
// ---------- 3 · lifting plan drawings (+ the tandem page) ----------
const rpCompass = (headingDeg) => { const b = ((90 - headingDeg) % 360 + 360) % 360; return `${String(Math.round(b)).padStart(3, '0')}° ${['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(b / 45) % 8]}`; };
function rpFiguresCol(pg, c, x, y, w) { // the figures behind the drawings, in the narrow column
  const { r, l, plan } = c; let ny = y; rpLabel(pg, x, ny, 'From the drawings'); ny += 4.2;
  const sp = plan.sitePlan || {}; const rows = [['Radius', `${fmt(r.R, 2)} m`], ['Boom', `${fmt(r.tele?.L ?? r.geo?.L, 1)} m at ${fmt(r.geo?.theta, 1)}°`], ['Boom head', `${fmt(r.tipY, 1)} m`], ['Hook', `${fmt(r.hookY, 1)} m`], ['Landing level', `${fmt(r.landY, 2)} m`], ['Over the', SIDE_WORD[sideOf(l)]],
    ...(sp.enabled ? [['Boom points', rpCompass(boomHeadingFor(plan, l))]] : []), ...(r.clearance != null ? [['Clearance', `${fmt(r.clearance, 2)} m${r.clearLine?.label ? ' to ' + String(r.clearLine.label).toLowerCase() : ''}`]] : [])];
  const tr = rpTable(pg, x, ny, [{ w: 19 }, { w: w - 19, bold: true, wrap: true, maxLines: 2 }], rows, { rh: 5.2, fs: 2.35, flush: true }); ny = tr.y + 6;
  const obs = (plan.site?.obstacles || []).filter(o => o.type !== 'person').slice(0, 6);
  if (obs.length) { rpLabel(pg, x, ny, 'On the site'); ny += 4.2; obs.forEach(o => { const t = `${o.label || o.type}${o.w ? ` ${fmt(o.w, 0)}${o.h ? '×' + fmt(o.h, 1) : ''} m` : ''}${o.x != null && o.x !== '' ? ` at ${fmt(num(o.x), 1)} m` : ''}`; ny = rpPara(pg, x, ny + 1.4, t, 2.2, w, { maxLines: 2, lead: 1.35 }) + 0.8; }); }
  const maps = (plan.env || []).filter(e => !e.hidden).length; if (maps) rpPara(pg, x, ny + 3, `${maps} client drawing${maps > 1 ? 's or maps sit' : ' or map sits'} under the views.`, 2.1, w, { color: RP_C.grey, maxLines: 2 });
}
function rpElevH(c, kE, maxH) { // the page height the elevation needs at this width, so the drawing fills its box
  try { const res = c.calc.loads[c.li]; const ext = elevationExtents(c.plan, res, c.crane, res.geo); const kW = (RP_GW * kE - 36) / (ext.xmax - ext.xmin); return Math.max(80, Math.min(maxH, ((ext.ymax - ext.ymin) * kW + 50) / kE + 2)); } catch (e) { return maxH; }
}
function rpSiteBox(c, kE, maxH) {
  try { const ext = sitePlanExtents(c.plan, c.calc); const kW = (RP_GW * kE - 16) / (ext.x1 - ext.x0); return Math.max(80, Math.min(maxH, ((ext.y1 - ext.y0) * kW + 22) / kE + 2)); } catch (e) { return maxH; }
}
function rpSiteDraw(c, Pd, box) { // the site plan at an exact scale (the sheet snaps to 1:N steps)
  let fixed; try { const ext = sitePlanExtents(c.plan, c.calc); const k = Math.min((box.w - 16) / (ext.x1 - ext.x0), (box.h - 22) / (ext.y1 - ext.y0)); const ox = box.x + 8 + Math.max(0, (box.w - 16 - (ext.x1 - ext.x0) * k) / 2), oy = box.y + box.h - 12 - Math.max(0, (box.h - 22 - (ext.y1 - ext.y0) * k) / 2); fixed = { T: (x, y) => [ox + (x - ext.x0) * k, oy - (y - ext.y0) * k], k, ext }; } catch (e) { fixed = undefined; }
  return drawSitePlan(Pd, box, c.plan, c.calc, { livery: livery(), fixed });
}
function rpOnSite(pg, c, x, y, w) { // the things on the site, and what hangs on the hook, as two short lists
  const { plan, r } = c; let ny = y; const obs = (plan.site?.obstacles || []).filter(o => o.type !== 'person').slice(0, 7);
  rpLabel(pg, x, ny, 'On the site'); ny += 2.6; if (!obs.length) rpPara(pg, x, ny + 3, 'No structures are drawn on the plan.', 2.3, w, { color: RP_C.grey });
  obs.forEach(o => { const t = `${o.label || o.type}${o.w ? `  ${fmt(o.w, 0)}${o.h ? ' × ' + fmt(o.h, 1) : ''} m` : ''}${o.x != null && o.x !== '' ? `, ${fmt(num(o.x), 1)} m from the crane` : ''}`; rpHair(pg, x, x + w, ny + 5); rpTx(pg, x + 0.6, ny + 3.6, t, 2.3, { maxW: w - 1 }); ny += 5; });
  return ny;
}
function rpSecElev(c, sec) { // v11: the crane gets the whole page — a landscape sheet, the drawing as large as it will go, the figures under it
  const pg = rpNewPage(c, sec, { land: true, head: true }); const { r, l } = c; const th = r.geo?.kind === 'luffing' ? r.geo.gamma : r.geo?.theta;
  rpLabel(pg, 10, 22.6, `${rpPad(sec.no)}  ·  Drawings`); rpDisp(pg, 10, 34, 'Elevation', 11.5, { maxW: 120 });
  rpPara(pg, 150, 21.6, `${c.cranesTxt}. Boom ${fmt(r.tele?.L ?? r.geo?.L, 1)} m at ${fmt(th, 1)}°, radius ${fmt(r.R, 1)} m over the ${SIDE_WORD[sideOf(l)]}, boom head ${fmt(r.tipY, 1)} m above the ground.${r.clearance != null ? ` Closest structure ${fmt(r.clearance, 1)} m from the boom.` : ''}`, 2.4, 137, { color: RP_C.grey, maxLines: 4, lead: 1.4 });
  pg.P.rect(10, 37.2, 22, 1.5, { fill: RP_C.acc, stroke: 'none', layer: 'RAMS' }); rpInk(pg, 32, 287, 37.9, 0.5);
  const y = 40, h = 131; rpDrawing(pg, 10, y, 277, h, 2.0, (Pd, box) => rpElev(c, Pd, box)); rpInk(pg, 10, 287, y + h + 1.2, 0.3);
  rpTx(pg, 10, y + h + 5, `Elevation  ·  ${c.cranesTxt}  ·  over the ${SIDE_WORD[sideOf(l)]}${hasSlew(l) && Math.abs(degDiff(slewOf(l), SIDE_OFFSET[sideOf(l)])) > 0.5 ? ` (slew ${Math.round(slewOf(l))}°)` : ''}  ·  dimensions in mm, levels in m`, 2, { color: RP_C.grey, maxW: 277 });
  const facts = [['Radius', `${fmt(r.R, 2)} m`], ['Boom', `${fmt(r.tele?.L ?? r.geo?.L, 1)} m`], ['Boom angle', `${fmt(th, 1)}°`], ['Boom head', `${fmt(r.tipY, 1)} m`], ['Hook', `${fmt(r.hookY, 1)} m`], ['Hook load', `${fmt(r.design ?? r.total, 2)} t`], ['Crane can lift', r.cap != null ? `${fmt(r.cap, 2)} t` : 'no chart'], ['Of the chart', r.util != null ? `${fmt(r.util, 1)} %` : '—']];
  const fw = 277 / facts.length; facts.forEach(([a, b], i) => rpFact(pg, 10 + i * fw, y + h + 12, fw - 3, a, b, { size: 3.2 }));
  return pg;
}
function rpSecPlanView(c, sec) {
  const pg = rpNewPage(c, sec); const { r, l } = c; const sp = c.plan.sitePlan || {};
  rpHead(pg, c, 'Drawings', 'Top view and site plan', `${sp.enabled ? 'Boom pointing ' + rpCompass(boomHeadingFor(c.plan, l)) + '. ' : ''}Reach ${fmt(r.R, 1)} m over the ${SIDE_WORD[sideOf(l)]}, tail swing ${fmt(num(c.crane.tail, 4), 1)} m. The ring is the exclusion zone.`);
  const y = 46, h = rpSiteBox(c, 2.0, 178); rpInk(pg, RP_X0, RP_X1, y, 0.3); rpDrawing(pg, RP_X0, y + 1, RP_GW, h, 2.0, (Pd, box) => rpSiteDraw(c, Pd, box)); rpInk(pg, RP_X0, RP_X1, y + h + 2, 0.3);
  rpTx(pg, RP_X0, y + h + 5.6, 'Top view  ·  north up  ·  boom, tail swing and exclusion zone as drawn', 2, { color: RP_C.grey, maxW: 168 });
  const fy = y + h + 14; const A = rpCol(0, 6), B = rpCol(6, 6); rpInk(pg, RP_X0, RP_X1, fy - 4, 0.3); rpFiguresRows(pg, c, A.x, fy, A.w); rpOnSite(pg, c, B.x, fy, B.w);
  return pg;
}
function rpFiguresRows(pg, c, x, y, w) { const { r, l, plan } = c; const sp = plan.sitePlan || {};
  rpLabel(pg, x, y, 'From the drawing'); const rows = [['Radius', `${fmt(r.R, 2)} m`], ['Boom', `${fmt(r.tele?.L ?? r.geo?.L, 1)} m at ${fmt(r.geo?.theta, 1)}°`], ['Landing level', `${fmt(r.landY, 2)} m`], ...(sp.enabled ? [['Boom points', rpCompass(boomHeadingFor(plan, l))]] : []), ...(r.clearance != null ? [['Clearance', `${fmt(r.clearance, 2)} m${r.clearLine?.label ? ' to ' + String(r.clearLine.label).toLowerCase() : ''}`]] : [])];
  return rpTable(pg, x, y + 2.6, [{ w: 26 }, { w: w - 26, bold: true }], rows, { rh: 5, fs: 2.3, flush: true }).y; }
function rpSecTandem(c, sec) {
  const T = c.T, pg = rpNewPage(c, sec);
  const worst = T.picks.reduce((a, p) => (p.util > (a.util ?? -1) ? p : a), T.picks[0]);
  rpHead(pg, c, 'Drawings', 'Tandem lift', `${T.picks.length} cranes share ${fmt(T.W, 2)} t. The busiest, crane ${worst.crane + 1}, is at ${fmt(worst.util, 1)}% of its chart against the ${T.derate}% tandem limit.`);
  let y = 49; rpLabel(pg, RP_X0, y, 'Share of the load'); y += 5.5; const bw = RP_GW, tot = Math.max(1e-6, T.picks.reduce((a, p) => a + p.share, 0)); let bx = RP_X0; const grey = ['#111111', '#6b6b6b', '#a9a9ad', '#d2d2d4'];
  T.picks.forEach((p, i) => { const w = bw * p.share / tot; pg.P.rect(bx, y, w, 10, { fill: i === 0 ? RP_C.acc : grey[i % 4], stroke: '#ffffff', w: 0.5, layer: 'RAMS' }); rpTx(pg, bx + 2, y + 6.6, `C${p.crane + 1}  ${fmt(p.pct, 0)}%  ·  ${fmt(p.share, 2)} t`, 2.7, { bold: true, color: i === 0 || i === 2 || i === 3 ? RP_C.accInk : '#ffffff', maxW: w - 3 }); bx += w; });
  // where the plumb-line shares would have put the boundary
  if (T.picks.length === 2 && T.picks[0].static != null) { const sx = RP_X0 + bw * T.picks[0].static / tot; pg.P.poly([[sx - 1.3, y - 2.2], [sx + 1.3, y - 2.2], [sx, y - 0.2]], { closed: true, fill: RP_C.ink, stroke: 'none', layer: 'RAMS' }); rpTx(pg, sx, y - 3.2, `plumb lines: C1 ${fmt(T.picks[0].static, 2)} t`, 1.9, { anchor: 'middle', color: RP_C.grey }); }
  y += 17;
  const lim = (p) => p.cap != null ? fmt(p.cap * T.derate / 100, 2) : '—';
  const tr = rpTable(pg, RP_X0, y, [{ w: 10, t: 'Crane' }, { w: 33, t: 'Model' }, { w: 21, t: 'Share', a: 'r' }, { w: 16, t: 'Radius m', a: 'r' }, { w: 19, t: 'Hook load t', a: 'r' }, { w: 18, t: 'Chart t', a: 'r' }, { w: 18, t: `${T.derate}% of chart`, a: 'r' }, { w: 15, t: 'Use', a: 'r' }, { w: 18, t: 'Line off plumb', a: 'r' }],
    T.picks.map(p => { const s = p.util == null || p.util > T.derate ? 'fail' : p.util > T.derate * 0.9 ? 'warn' : 'ok'; return [{ t: `C${p.crane + 1}`, bold: true }, p.model || '', `${fmt(p.share, 2)} t · ${fmt(p.pct, 0)}%`, fmt(p.Rnow ?? p.R, 1), fmt(p.design, 2), p.cap != null ? fmt(p.cap, 2) : '—', lim(p), { t: p.util != null ? `${fmt(p.util, 1)}%` : '—', bold: true, color: rpSt(s) }, { t: `${fmt(Math.abs(p.lineAng || 0), 1)}°`, color: Math.abs(p.lineAng || 0) > 3 ? RP_C.fail : Math.abs(p.lineAng || 0) > 1 ? RP_C.warn : RP_C.ink }]; }), { rh: 6.4, fs: 2.4 });
  y = tr.y + 4; rpTx(pg, RP_X0 + 1.3, y, `Hook load = share + hook block + tackle. The tandem limit is ${T.derate}% of each crane's own chart at its own radius.${T.live ? `  Load tilt ${fmt(Math.abs(T.live.tilt), 1)}°.` : ''}`, 2.1, { color: RP_C.grey, maxW: 166 });
  y += 10; const L = rpCol(0, 7), R = rpCol(8, 4); rpLabel(pg, L.x, y, 'Load transfer and balance'); rpLabel(pg, R.x, y, 'Before the first lift');
  const notes = T.checks.map(x => ({ cells: [{ draw: (pg2, cx, cy) => pg2.P.rect(cx + 1.2, cy + 2.2, 2.8, 2.8, { fill: rpSt(x.s === 'info' ? 'x' : x.s), stroke: 'none', layer: 'RAMS' }) }, { t: x.t, bold: true, wrap: true, maxLines: 2 }, { t: x.m, wrap: true, maxLines: 4 }] }));
  rpTable(pg, L.x, y + 3, [{ w: 6.5 }, { w: 28 }, { w: L.w - 34.5 }], notes, { rh: 6, fs: 2.25, maxY: 262, valign: 'top' });
  const steps = [`One lift supervisor directs both operators on a dedicated radio channel. Nobody else transmits.`, `Set each LMI to its own configuration. Stop a crane at ${T.derate}% of its chart.`, `Trial lift 100 mm. Each LMI should read near its share: ${T.picks.map(p => `C${p.crane + 1} ${fmt(p.design, 1)} t`).join(', ')}.`, `Hold the hoist lines within 1° of plumb. Stop at 3°.`, `One motion at a time, slowly. Read both LMIs after each move.`];
  let sy = y + 6; steps.forEach((t, i) => { rpTx(pg, R.x, sy + 2.4, String(i + 1), 2.4, { bold: true }); sy = rpPara(pg, R.x + 4, sy + 2.4, t, 2.3, R.w - 4, { lead: 1.38 }) + 1.6; });
  return pg;
}

// ---------- 4 · crane data sheet ----------
function rpDocKind(d) { return { chart: 'Load chart', spec: 'Spec sheet', cad: 'CAD outline' }[d.kind] || d.kind || ''; }
function rpSecCrane(c, sec) {
  const pg = rpNewPage(c, sec); const { crane, pv, ch, r, plan } = c; const ex = outExtOf(pv); const at = pv.attach || {}; const col = r.col;
  rpHead(pg, c, 'Equipment', 'Crane data sheet', `${crane.make || ''} ${crane.model}, ${crane.cls ? crane.cls + ' t ' : ''}${(crane.type || '').toLowerCase()}. Set up with ${fmt(c.cwt, 1)} t counterweight, ${outExtLabel(ex).toLowerCase()} outriggers and ${fmt(r.tele?.L ?? r.geo?.L, 1)} m of boom.`.replace(/\s+/g, ' '));
  const L = rpCol(0, 8), R = rpCol(8, 4); let y = 49;
  const sec3 = (title, rows) => { rpLabel(pg, L.x, y, title); const tr = rpTable(pg, L.x, y + 2.2, [{ w: 36 }, { w: L.w - 36, bold: true, wrap: true, maxLines: 2 }], rows.filter(x => x && x[1] != null && String(x[1]).trim() !== '').map(([a, b]) => [{ t: a, color: RP_C.grey }, String(b)]), { rh: 5.3, fs: 2.4, flush: true }); y = tr.y + 5.5; };
  const jib = at.type === 'fly' ? `Fly jib ${fmt(num(at.jibLen), 1)} m at ${num(at.offset)}°` : at.type === 'luff' ? `Luffing jib ${fmt(num(at.jibLen), 1)} m, boom at ${num(at.boomAngle)}°` : ch?.kind === 'luffing' || ch?.kind === 'fixedjib' ? `Jib ${ch.jibLen ? fmt(ch.jibLen, 1) + ' m' : ''}` : 'Main boom only';
  const acc = [r.acc?.yguy && 'Y-guy', r.acc?.superlift && `Superlift ${fmt(num(r.acc.slRadius), 1)} m / ${num(r.acc.slBallast)} t`, r.acc?.runner && 'Runner'].filter(Boolean).join(', ') || 'none fitted';
  sec3('Machine', [['Make and model', `${crane.make || ''} ${pv.modelTxt || crane.model}`.trim()], ['Class', crane.cls ? `${crane.cls} t` : ''], ['Type', `${crane.type || ''}${crane.axles ? ', ' + crane.axles + ' axles' : ''}`], ['Carrier mass', crane.mass ? `${fmt(crane.mass, 1)} t` : ''], ['Boom', crane.boomMin ? `${fmt(crane.boomMin, 1)} to ${fmt(crane.boomMax, 1)} m, ${crane.sections || '?'} sections` : '']]);
  sec3('Set-up for this lift', [['Load chart', ch ? ch.name : 'capacity typed by hand'], ['Configuration', pv.config || ch?.config], ['Counterweight', `${fmt(c.cwt, 1)} t`], ['Outriggers', `${(pv.outriggerTxt || ch?.outrigger || crane.outrigger || '').toString().replace(/x/i, ' × ')} m, ${outExtLabel(ex).toLowerCase()}${outExtHalf(ex) ? '' : ' on both sides'}`], ['Mats', pv.matSize || plan.outrigger?.mat], ['Boom length', `${fmt(r.tele?.L ?? r.geo?.L, 1)} m${r.tele?.mode === 'manual' ? ' (sections set by hand)' : ' (chart column)'}`], ['Boom angle', r.geo?.theta != null ? `${fmt(r.geo.theta, 1)}°` : ''], ['Jib', jib], ['Accessories', acc], ['Falls of rope', pv.falls || col?.falls], ['Hook block', `${fmt(r.hb, 2)} t`]]);
  sec3('Papers', [['Fleet / plate no.', rpDv(c, 'craneReg')], ['Serial no.', rpDv(c, 'craneSerial')], ['Inspection certificate', [rpDv(c, 'tpiCert'), rpDv(c, 'tpiExpiry') && 'valid to ' + rpDv(c, 'tpiExpiry')].filter(Boolean).join(', ')], ['LMI last tested', rpDv(c, 'lmiTest')], ['Operator', rpWho(c, 'operator', 'operatorCard')]]);
  sec3('Dimensions', [['Carrier', `${fmt(num(crane.carrierLen), 2)} m long, ${fmt(num(crane.width), 2)} m wide, ${fmt(num(crane.carrierH), 2)} m high`], ['Tail swing', crane.tail ? `${fmt(num(crane.tail), 2)} m radius` : ''], ['Outrigger span', crane.outLong ? `${fmt(num(crane.outLong), 2)} m along × ${fmt(num(crane.outTrans), 2)} m across` : '']]);
  // the maker's dimensions, narrow column
  const nat = crane.imgDims && typeof imgNatural === 'function' ? imgNatural(crane.imgDims) : null;
  rpLabel(pg, R.x, 49, 'Dimensions drawing'); const dh = nat ? Math.max(48, Math.min(140, (R.w - 8) * nat.h / nat.w + 16)) : 112; pg.P.rect(R.x, 52, R.w, dh, { fill: 'none', stroke: RP_C.line, w: 0.15, layer: 'RAMS' });
  rpDrawing(pg, R.x, 52, R.w, dh, 3, (Pd, box) => drawCraneDims(Pd, box, crane));
  rpTx(pg, R.x, 52 + dh + 4, crane.imgDims ? "Maker's dimension drawing" : 'Carrier, outriggers and boom stowed. Dimensions in mm.', 2, { color: RP_C.grey, maxW: R.w });
  // the reference documents the library holds for this crane
  y = Math.max(y, 52 + dh + 9) + 1; const lib = typeof CRANE_LIBRARY !== 'undefined' ? CRANE_LIBRARY[crane.id] : null; const docs = (lib?.docs || []).slice().sort((a, b) => ['chart', 'spec', 'cad'].indexOf(a.kind) - ['chart', 'spec', 'cad'].indexOf(b.kind));
  rpLabel(pg, RP_X0, y, 'Reference documents'); y += 2.2; const match = { exact: 'exact model', variant: 'same model, other issue', nearest: 'nearest public drawing', collection: 'multi-crane sheet' };
  const room = Math.max(1, Math.floor((276 - y - 12 - 4.6) / 5.2)); const shown = docs.slice(0, Math.min(room, 9));
  if (docs.length) {
    const anyCad = shown.some(d => d.kind === 'cad'); const tr = rpTable(pg, RP_X0, y, anyCad ? [{ w: 22, t: 'Type' }, { w: 90, t: 'Document' }, { w: 26, t: 'Source' }, { w: 30, t: 'Fit' }] : [{ w: 24, t: 'Type' }, { w: 108, t: 'Document' }, { w: 36, t: 'Source' }], shown.map(d => anyCad ? [{ t: rpDocKind(d), bold: true }, d.name, d.source || '', { t: d.kind === 'cad' ? (match[d.match] || '') : '', color: RP_C.grey }] : [{ t: rpDocKind(d), bold: true }, d.name, d.source || '']), { rh: 5.2, fs: 2.3 }); y = tr.y + 4;
    if (docs.length > shown.length) { rpTx(pg, RP_X0 + 1.3, y, `and ${docs.length - shown.length} more in the Fleet page`, 2.1, { color: RP_C.grey }); y += 4; }
  } else { rpTx(pg, RP_X0 + 1.3, y + 5, `The library holds no documents for this crane. Chart used: ${ch ? ch.name : 'typed by hand'}${ch?.source ? ', source ' + ch.source : ''}.`, 2.4, { color: RP_C.ink, maxW: 166 }); y += 9; }
  rpPara(pg, RP_X0 + 1.3, y + 1.5, "Third-party documents are reference only. Check every value against the manufacturer's chart for the exact machine before a lift.", 2.2, 166, { color: RP_C.grey });
  if (crane.imgDims) { // v11: the maker's dimension drawing on a landscape page of its own, as large as it goes (never stretched)
    const p2 = rpNewPage(c, sec, { land: true, head: true, cont: true });
    rpLabel(p2, 10, 22.6, `${rpPad(sec.no)}  ·  Equipment`); rpDisp(p2, 10, 34, 'Crane dimensions', 11.5, { maxW: 150 });
    rpPara(p2, 170, 21.6, `${crane.make || ''} ${crane.model}: carrier, outriggers and boom stowed, from the maker's data sheet. Dimensions in mm.`, 2.4, 117, { color: RP_C.grey, maxLines: 3, lead: 1.4 });
    p2.P.rect(10, 37.2, 22, 1.5, { fill: RP_C.acc, stroke: 'none', layer: 'RAMS' }); rpInk(p2, 32, 287, 37.9, 0.5);
    p2.P.image(10, 42, 277, 146, crane.imgDims, { layer: 'RAMS' });
    rpTx(p2, 10, 192.4, `Maker's dimension drawing  ·  ${crane.make || ''} ${crane.model}  ·  check against the machine on site`, 2, { color: RP_C.grey, maxW: 277 });
  }
  return pg;
}
// ---------- 5 · load chart extract with the duty point ----------
function rpChartTable(pg, x, y, w, ex, c) { // hairline chart: boom lengths across, radii down, the duty cell in yellow
  const { sub, ci, ri } = ex; const nc = sub.cols.length; const rcw = 17, cw = (w - rcw) / nc; const kind = c.ch?.kind; const hasLab = sub.cols.some(q => q.label); const hh = hasLab ? 10.5 : 7.2, rh = 5.1;
  pg.P.rect(x + rcw + ci * cw, y, cw, hh + sub.rows.length * rh, { fill: '#fff4cc', stroke: 'none', layer: 'RAMS' });
  pg.P.rect(x + rcw + ci * cw, y, cw, hh, { fill: RP_C.acc, stroke: 'none', layer: 'RAMS' });
  rpLabel(pg, x + 1.2, y + 4.6, kind === 'luffing' ? 'R m / °' : 'Radius m', { maxW: rcw - 2 });
  sub.cols.forEach((q, i) => { const cx = x + rcw + (i + 0.5) * cw; rpTx(pg, cx, y + 4.6, `${q.head || q.L}${kind === 'main' || !kind ? '' : '°'}`, 2.6, { bold: true, anchor: 'middle', maxW: cw - 1.5, color: i === ci ? RP_C.accInk : RP_C.ink }); if (hasLab && q.label) rpTx(pg, cx, y + 8.6, q.label, 1.9, { anchor: 'middle', color: i === ci ? RP_C.accInk : RP_C.grey, maxW: cw - 1.5 }); });
  rpTx(pg, x + rcw + (ci + 0.5) * cw, y - 1.6, 'DUTY BOOM', 1.7, { bold: true, anchor: 'middle', color: RP_C.grey });
  rpInk(pg, x, x + w, y + hh, 0.4);
  sub.rows.forEach((row, j) => { const ry = y + hh + j * rh; const duty = j === ri;
    if (duty) { pg.P.rect(x, ry, w, rh, { fill: 'none', stroke: RP_C.ink, w: 0.45, layer: 'RAMS' }); pg.P.poly([[x - 2.6, ry + 0.9], [x - 0.5, ry + rh / 2], [x - 2.6, ry + rh - 0.9]], { closed: true, fill: RP_C.ink, stroke: 'none', layer: 'RAMS' }); }
    else rpHair(pg, x, x + w, ry + rh);
    rpTx(pg, x + 1.2, ry + rh / 2 + 0.9, String(row[0]), 2.4, { bold: true, maxW: rcw - 2 });
    row.slice(1).forEach((v, i) => { const hit = duty && i === ci; if (hit) pg.P.rect(x + rcw + i * cw, ry, cw, rh, { fill: RP_C.acc, stroke: RP_C.ink, w: 0.45, layer: 'RAMS' });
      rpTx(pg, x + rcw + (i + 0.5) * cw, ry + rh / 2 + 0.9, v == null ? '·' : String(v), 2.4, { anchor: 'middle', bold: hit, color: v == null ? RP_C.mid : RP_C.ink, maxW: cw - 1 }); }); });
  const yEnd = y + hh + sub.rows.length * rh; rpInk(pg, x, x + w, yEnd, 0.4); return yEnd;
}
function rpChartCurve(pg, x, y, w, h, parsed, ci, c) { // the duty boom's capacity against radius, as the conservative lookup reads it (next radius up), with the lift on it
  const { r } = c; const pts = parsed.rows.filter(q => q[ci + 1] != null).map(q => [q[0], q[ci + 1]]); if (pts.length < 2) return;
  const x0 = Math.min(0, pts[0][0]), x1 = Math.max(pts[pts.length - 1][0], r.R + 1); const capMax = Math.max(...pts.map(p => p[1]), r.total || 0); const step = capMax > 120 ? 20 : capMax > 60 ? 10 : capMax > 30 ? 5 : 2; const y1 = Math.ceil(capMax * 1.05 / step) * step;
  const px = x + 9, pw = w - 11, py = y + 3, ph = h - 12; const X = (v) => px + (v - x0) / (x1 - x0) * pw, Y = (v) => py + ph - v / y1 * ph;
  for (let v = 0; v <= y1 + 1e-6; v += step) { rpHair(pg, px, px + pw, Y(v), { c: v === 0 ? RP_C.ink : RP_C.line, w: v === 0 ? 0.35 : 0.15 }); rpTx(pg, px - 1.4, Y(v) + 0.7, String(v), 1.9, { anchor: 'end', color: RP_C.grey }); }
  const xs = (x1 - x0) > 40 ? 10 : 5; for (let v = Math.ceil(x0 / xs) * xs; v <= x1; v += xs) { rpTx(pg, X(v), py + ph + 3.4, String(v), 1.9, { anchor: 'middle', color: RP_C.grey }); pg.P.line(X(v), py + ph, X(v), py + ph + 1, { stroke: RP_C.ink, w: 0.2, layer: 'RAMS' }); }
  rpTx(pg, px + pw, py + ph + 6.8, 'radius, m', 1.9, { anchor: 'end', color: RP_C.grey }); rpTx(pg, x, py - 0.2, 't', 1.9, { color: RP_C.grey });
  const line = [[X(pts[0][0]), Y(pts[0][1])]]; for (let i = 0; i < pts.length; i++) { const nxt = pts[i + 1]; line.push([X(pts[i][0]), Y(pts[i][1])]); if (nxt) line.push([X(pts[i][0]), Y(nxt[1])]); }
  const stepLine = []; for (let i = 0; i < pts.length; i++) { const prev = pts[i - 1]; const xa = prev ? prev[0] : pts[0][0]; stepLine.push([X(xa), Y(pts[i][1])], [X(pts[i][0]), Y(pts[i][1])]); }
  pg.P.poly(stepLine, { stroke: RP_C.ink, w: 0.6, fill: 'none', layer: 'RAMS' });
  if (r.cap != null && r.R >= pts[0][0] && r.R <= pts[pts.length - 1][0]) {
    const lo = r.design + (r.ded || 0); const cx = X(r.R); pg.P.rect(cx - 0.35, Y(r.cap), 0.7, Y(lo) - Y(r.cap), { fill: RP_C.acc, stroke: 'none', layer: 'RAMS' });
    pg.P.circle(cx, Y(r.cap), 1.5, { fill: RP_C.acc, stroke: RP_C.ink, w: 0.4, layer: 'RAMS' }); pg.P.circle(cx, Y(lo), 1.1, { fill: RP_C.ink, stroke: 'none', layer: 'RAMS' });
    const tx = cx + 3.4, an = 'start', tx2 = cx - 3.4;
    rpTx(pg, tx, Y(r.cap) - 3.2, `Chart ${fmt(r.cap, 2)} t`, 2.3, { bold: true, anchor: an, bg: '#ffffff' }); rpTx(pg, tx2, Y(lo) + 4.4, `Load + deductions ${fmt(lo, 2)} t`, 2.3, { bold: true, anchor: 'end', bg: '#ffffff' });
  }
}
function rpSecChart(c, sec) {
  const pg = rpNewPage(c, sec); const { r, ch, crane } = c; const parsed = getChart(ch); const ex = ramsChartExcerpt(parsed, Math.max(0, num(r.ci)), num(r.capInfo?.row, r.R), 10, 17);
  const colL = r.col ? `${r.col.head || r.col.L} m${r.col.label ? ' (' + r.col.label + ')' : ''}` : '';
  rpHead(pg, c, 'Capacity', 'Load chart extract', r.cap != null ? `Duty point ${fmt(r.R, 1)} m on the ${colL} boom: ${fmt(r.cap, 2)} t gross, ${fmt(r.netCap, 2)} t net after ${fmt(r.ded, 2)} t of hook block and tackle.` : `No capacity at ${fmt(r.R, 1)} m on this chart. ${r.capInfo?.why || ''}`);
  const sect = typeof chartSectorsOf === 'function' ? (chartSectorsOf(ch).includes('360') ? '360° slewing' : 'lifting over the ' + chartSectorsOf(ch).join(' and ')) : '';
  let y = 47; const f = [[ch.name, 'Chart', 70], [`${fmt(num(ch.cwt ?? crane.cwt), 1)} t`, 'Counterweight', 28], [`${ch.outrigger || crane.outrigger || '—'} m`, 'Outriggers', 34], [sect || '—', 'Sector', 36]]; let fx = RP_X0;
  f.forEach(([v, lab, w]) => { rpFact(pg, fx, y, w - 3, lab, v, { size: 2.9, maxLines: 2 }); fx += w; });
  y = 64; const yEnd = rpChartTable(pg, RP_X0, y, RP_GW, ex, c);
  rpTx(pg, RP_X0, yEnd + 4, `${ex.more ? 'Excerpt around the duty point. ' : ''}Capacity in tonnes. ${ch.source ? 'Source: ' + ch.source + '. ' : ''}${ch.verify ? 'Transcribed from a public datasheet: check it against the maker\'s chart before issue.' : ''}`, 2, { color: RP_C.grey, maxW: 168 });
  y = yEnd + 12; const cv = rpCol(0, 8), nt = rpCol(8, 4); rpLabel(pg, cv.x, y, 'Capacity of the duty boom against radius'); rpChartCurve(pg, cv.x, y + 2, cv.w, 258 - y - 2, parsed, Math.max(0, num(r.ci)), c);
  rpLabel(pg, nt.x, y, 'Reading the duty point'); const ci = r.capInfo || {};
  const notes = [r.capInfo?.rounded ? `The chart has no ${fmt(r.R, 1)} m row. It is read at the next row up, ${fmt(ci.row, 1)} m, so the capacity is never overstated.` : ci.interp ? `Read between rows at ${fmt(r.R, 2)} m.` : `Read at the ${fmt(ci.row ?? r.R, 1)} m row.`, `Gross ${fmt(r.cap, 2)} t, less ${fmt(r.ded, 2)} t (hook block ${fmt(r.hb, 2)}, tackle ${fmt(r.tk, 2)}${r.ex ? ', other ' + fmt(r.ex, 2) : ''}${r.jd ? ', folded jib ' + fmt(r.jd, 2) : ''}${r.rope ? ', rope ' + fmt(r.rope, 2) : ''}) leaves ${fmt(r.netCap, 2)} t.`, `Load ${fmt(r.W, 2)} t${r.contOn ? ' + ' + fmt(r.contW, 2) + ' t margin' : ''} is ${fmt(r.util, 1)}% of that.`];
  let ny = y + 5; notes.forEach(t => { ny = rpPara(pg, nt.x, ny, t, 2.3, nt.w, { lead: 1.4 }) + 2.2; });
  rpPara(pg, nt.x, ny + 1, "The crane's own LMI and load chart govern on the day.", 2.2, nt.w, { color: RP_C.grey });
  return pg;
}

// ---------- 6 · outriggers and ground ----------
function rpSecGround(c, sec) {
  const pg = rpNewPage(c, sec); const { O, g, r, crane, plan, l } = c; const li = c.li;
  const gst = g?.status === 'fail' ? 'fail' : g?.status === 'warn' ? 'warn' : g?.status === 'ok' ? 'ok' : 'x';
  rpHead(pg, c, 'Ground', 'Outriggers and ground', g ? `Busiest leg ${fmt(g.P, 1)} t on ${g.mat}: ${gbpTxt(g.press)}${g.allow ? ' against ' + gbpTxt(g.allow) + ' allowed' : ', allowable not entered'}. ${gst === 'ok' ? 'Passes.' : gst === 'fail' ? 'Fails. Enlarge the mats.' : gst === 'warn' ? 'Close to the limit.' : ''}` : 'Ground bearing check is off for this plan.');
  const D = rpCol(0, 8), K = rpCol(8, 4); let y = 47; const boxH = 112;
  rpInk(pg, D.x, D.x + D.w, y, 0.3); rpLabel(pg, D.x, y + 4.5, 'Leg loads, top view');
  if (O) {
    const xs = O.pads.map(p => p.x), ys = O.pads.map(p => p.y), Lc = num(crane.carrierLen, 12), Wc = num(crane.width, 2.75);
    const k = Math.min((boxH - 32) / Math.max(1, Math.max(...ys) - Math.min(...ys)), (D.w - 46) / Math.max(1, Math.max(...xs, 0.64 * Lc) - Math.min(...xs, -0.36 * Lc)));
    const cx = D.x + D.w / 2, cy = y + boxH / 2 + 4; const S2 = (px, py) => [cx - py * k, cy - px * k];
    pg.P.poly(O.pads.map(p => S2(p.x, p.y)), { closed: true, stroke: RP_C.mid, w: 0.2, dash: true, fill: 'none', layer: 'RAMS' });
    const [ax, ay] = S2(0.64 * Lc, Wc / 2), [bx, by] = S2(-0.36 * Lc, -Wc / 2); pg.P.rect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay), { fill: '#ffe9a6', stroke: RP_C.ink, w: 0.3, layer: 'RAMS' });
    rpTx(pg, (ax + bx) / 2, Math.min(ay, by) + 3.2, 'CAB', 2, { anchor: 'middle', bold: true });
    const Lift = O.lifts.find(q => q.li === li) || O.lifts[0];
    if (Lift) { const t = Lift.theta * D2R; const [ox, oy] = S2(0, 0); const e = Math.min(boxH * 0.42, 55); const ex = ox - Math.sin(t) * e, ey = oy - Math.cos(t) * e; pg.P.line(ox, oy, ex, ey, { stroke: '#e0a800', w: 1.8, layer: 'RAMS' }); pg.P.circle(ex, ey, 1.5, { fill: '#e0a800', stroke: RP_C.ink, w: 0.25, layer: 'RAMS' }); rpTx(pg, ex + (ex < ox ? -2.4 : 2.4), ey + 0.8, 'BOOM', 1.9, { bold: true, anchor: ex < ox ? 'end' : 'start', color: RP_C.grey }); }
    const mat = outMatDims(plan.outrigger?.mat || rpMatOf(c)) || [1, 1];
    for (const p of O.pads) { const [px, py] = S2(p.x, p.y); const ms = Math.max(2, mat[0] * k); const v = O.used[p.id]; const q = g?.pads?.[p.id]; const st = g?.allow ? (q > g.allow ? RP_C.fail : q > 0.9 * g.allow ? RP_C.warn : RP_C.ok) : RP_C.ink;
      const [bx0, by0] = S2(p.x, Math.sign(p.y) * Wc / 2); pg.P.line(bx0, by0, px, py, { stroke: '#666', w: 0.8, layer: 'RAMS' });
      pg.P.rect(px - ms / 2, py - ms / 2, ms, ms, { fill: '#c9a46b', stroke: RP_C.ink, w: 0.25, layer: 'RAMS' }); pg.P.circle(px, py, 1.3, { fill: st, stroke: 'none', layer: 'RAMS' });
      const right = px > cx, below = py > cy; const tx = px + (right ? ms / 2 + 2.4 : -ms / 2 - 2.4), ty = py + (below ? 2.6 : -2.2);
      rpTx(pg, tx, ty, `${p.id}  ${fmt(v, 1)} t${O.manual[p.id] != null ? '*' : ''}`, 3, { anchor: right ? 'start' : 'end', bold: true }); rpTx(pg, tx, ty + 3.7, `${fmt(v * OUT_G, 0)} kN${q != null ? '  ·  ' + gbpTxt(q) : ''}`, 2.2, { anchor: right ? 'start' : 'end', color: st }); }
    rpTx(pg, D.x, y + boxH - 1, `${outExtLabel(O.ext)} outriggers  ·  ${O.basis === 'full' ? 'busiest over a full 360° slew' : 'over the lift side'}${O.est ? '  ·  estimated crane weights' : ''}${Object.keys(O.manual || {}).length ? '  ·  * typed by hand, illustration only' : ''}`, 2, { color: RP_C.grey, maxW: D.w });
  } else rpTx(pg, D.x, y + 30, 'No outrigger model for this crane.', 2.8, { color: RP_C.grey });
  // right: the ground check as figures
  rpInk(pg, K.x, K.x + K.w, y, 0.3); let ky = y + 4.5; rpLabel(pg, K.x, ky, 'Ground bearing'); ky += 3;
  if (g) {
    const stc = rpSt(gst); const word = gst === 'ok' ? 'PASS' : gst === 'fail' ? 'FAIL' : gst === 'warn' ? 'CLOSE' : 'NOT SET';
    rpDisp(pg, K.x, ky + 13, word, 17, { color: stc, maxW: K.w }); ky += 20;
    const rows = [['Busiest leg', `${fmt(g.P, 1)} t · ${fmt(g.P * OUT_G, 0)} kN`], ['Source', { maker: "maker's figure", illus: 'typed by hand', calc: 'calculated', est: 'rough estimate' }[g.src] || '—'], ['Mat', `${g.mat}`], ['Mat area', `${fmt(g.area, 2)} m²${g.self ? ' · ' + fmt(g.self, 2) + ' t' : ''}`], ['Pressure', gbpTxt(g.press)], ['Ground allows', g.allow ? gbpTxt(g.allow) : 'not entered'], ...(rpDv(c, 'groundRef') ? [['Ground report', rpDv(c, 'groundRef')]] : []), ['Smallest mat', g.side ? `${fmt(g.side, 2)} m square` : '—']];
    const tr = rpTable(pg, K.x, ky, [{ w: 20 }, { w: K.w - 20, bold: true, wrap: true, maxLines: 2 }], rows.map(([a, b]) => [{ t: a, color: RP_C.grey }, b]), { rh: 5.4, fs: 2.35, flush: true }); ky = tr.y + 3;
    if (g.allow) { const fr = Math.min(1.25, g.press / g.allow); rpLabel(pg, K.x, ky + 3, 'Pressure against what the ground allows', { maxW: K.w }); pg.P.rect(K.x, ky + 5.6, K.w, 2.6, { fill: RP_C.soft, stroke: RP_C.line, w: 0.15, layer: 'RAMS' }); pg.P.rect(K.x, ky + 5.6, Math.min(K.w, K.w * fr / 1.25), 2.6, { fill: stc, stroke: 'none', layer: 'RAMS' }); const lx = K.x + K.w / 1.25; pg.P.line(lx, ky + 4.2, lx, ky + 9.4, { stroke: RP_C.ink, w: 0.35, layer: 'RAMS' }); rpTx(pg, lx, ky + 12.2, 'allowed', 1.9, { anchor: 'middle', color: RP_C.grey }); }
  } else rpPara(pg, K.x, ky + 4, 'Switch the ground check on in the Legs sheet to print leg loads, mat sizes and the pass mark here.', 2.4, K.w, { color: RP_C.grey });
  // below: the table of legs and the checks on the ground
  y = 47 + boxH + 6; rpInk(pg, RP_X0, RP_X1, y, 0.5); rpLabel(pg, RP_X0, y + 5, 'Per leg');
  if (O) {
    const legName = { FR: 'Front right', FL: 'Front left', RL: 'Rear left', RR: 'Rear right' };
    const rows = O.pads.map(p => { const v = O.used[p.id], q = g?.pads?.[p.id]; const st = g?.allow && q != null ? (q > g.allow ? 'fail' : q > 0.9 * g.allow ? 'warn' : 'ok') : 'x';
      return [{ t: p.id, bold: true }, legName[p.id] || '', { t: `${fmt(v, 2)} t${O.manual[p.id] != null ? ' *' : ''}`, bold: true }, `${fmt(v * OUT_G, 0)} kN`, q != null ? gbpTxt(q) : '—', { t: g?.allow ? (q > g.allow ? 'Over' : `${fmt(q / g.allow * 100, 0)}% of allowed`) : '—', color: rpSt(st), bold: true }]; });
    const tr = rpTable(pg, RP_X0, y + 7, [{ w: 14, t: 'Leg' }, { w: 40, t: 'Position' }, { w: 30, t: 'Load', a: 'r' }, { w: 24, t: 'Force', a: 'r' }, { w: 32, t: 'Pressure', a: 'r' }, { w: 28, t: 'Against ground', a: 'r' }], rows, { rh: 5.6, fs: 2.4 }); y = tr.y + 5;
  } else y += 9;
  const pts = [g?.allow ? `Mats ${g?.mat || ''} under every pad, tight to the pad, on level ground. Pack any void under a mat. The ground must take ${gbpTxt(g.allow)}.` : `Mats ${rpMatOf(c) || 'as planned'} under every pad. Get the allowable bearing from the site and enter it before the lift.`, 'Dig or probe for voids, trenches, drains and buried services under the footprint and the slew area. A slab edge is not a mat edge.', O?.ext && outExtHalf(O.ext) ? `Outriggers are not fully out on one side (${outExtLabel(O.ext).toLowerCase()}). Work only in the sector the chart gives for that set-up, and let the LMI see the set-up.` : 'Set the beams fully out and the cylinders down until the tyres are clear. Level the crane before the boom leaves its rest.', 'Planning model. The maker\'s outrigger data and a competent ground assessment govern.'];
  pts.forEach(t => { pg.P.rect(RP_X0 + 1.3, y + 0.4, 1.2, 1.2, { fill: RP_C.ink, stroke: 'none', layer: 'RAMS' }); y = rpPara(pg, RP_X0 + 5, y + 1.6, t, 2.4, 160, { maxLines: 2, lead: 1.4 }) + 1.6; });
  if (g && typeof GROUND_PRESETS !== 'undefined') { // what this leg load needs on common ground (rough guide, the site report wins)
    y += 3; rpLabel(pg, RP_X0, y, 'What this leg load needs on common ground, rough guide only'); const side = (q) => Math.sqrt(((g.P || 0) + (g.self || 0)) / q), have = Math.sqrt(g.area || 0);
    const rows = GROUND_PRESETS.map(([k, nm, kpa]) => { const q = kpa / 9.80665, need = side(q), ok = have + 1e-6 >= need; return [nm, `${fmt(q, 1)} t/m²`, { t: `${fmt(need, 2)} m square`, bold: true }, { t: ok ? 'This mat is enough' : 'Too small', color: ok ? RP_C.ok : RP_C.fail, bold: true }]; });
    rpTable(pg, RP_X0, y + 2, [{ w: 70, t: 'Ground' }, { w: 30, t: 'Allows', a: 'r' }, { w: 36, t: 'Smallest square mat', a: 'r' }, { w: 32, t: `${g.mat}`, a: 'r' }], rows, { rh: 4.9, fs: 2.3, maxY: 276 });
  }
  return pg;
}
function rpMatOf(c) { return c.pv?.matSize || c.plan.outrigger?.mat || ''; }
// ---------- 7 · rigging and sling schedule ----------
const RP_COLOURS = [[1, 'violet', '#7b3fa0'], [2, 'green', '#2e9e4f'], [3, 'yellow', '#f2c500'], [4, 'grey', '#8a8a8a'], [5, 'red', '#d0262d'], [6, 'brown', '#7a4a21'], [8, 'blue', '#2563b8'], [10, 'orange', '#f28a1a']];
const RP_MAT = { webbing: { std: 'EN 1492-1', label: 'Webbing sling' }, round: { std: 'EN 1492-2', label: 'Round sling' }, wire: { std: 'EN 13414-1', label: 'Wire rope sling' }, chain: { std: 'EN 818-4', label: 'Chain sling' }, shackle: { std: 'EN 13889', label: 'Shackle' }, beam: { std: 'EN 13155', label: 'Lifting beam' }, hook: { std: 'EN 1677-1', label: 'Hook' }, other: { std: '', label: 'Accessory' } };
function rpMaterial(it, si) {
  const k = String(si?.kind || '').toLowerCase(); if (RP_MAT[k]) return k; if (/web|flat/.test(k)) return 'webbing'; if (/round/.test(k)) return 'round'; if (/wire|rope/.test(k)) return 'wire'; if (/chain/.test(k)) return 'chain';
  const nm = String(it.name || '').toLowerCase(); if (it.type === 'shackle') return 'shackle'; if (it.type === 'spreader' || it.type === 'beam') return 'beam'; if (it.type === 'hook') return 'hook';
  if (/chain/.test(nm) || it.type === 'chain') return 'chain'; if (/wire|rope/.test(nm)) return 'wire'; if (/web|flat/.test(nm)) return 'webbing'; if (/shackle/.test(nm)) return 'shackle'; if (/beam|spreader/.test(nm)) return 'beam';
  return it.type === 'sling' ? 'round' : 'other';
}
// one row of the schedule: what the other modules know (SLING_INFO) when they are there, else what the tackle itself says
function rpTackleInfo(c, it, carried) {
  const tk = (c.l.tackles || [])[it.j] || it; let si = null; try { if (typeof SLING_INFO === 'function') si = SLING_INFO(tk); } catch (e) { si = null; }
  const mat = rpMaterial(it, si); const wll = num(si?.wll, it.wll) || null; const legs = Math.max(1, Math.round(num(si?.legs, num(it.legs, 1))) || 1);
  const colRow = si?.colour ? null : (mat === 'webbing' || mat === 'round') && wll ? [...RP_COLOURS].reverse().find(q => q[0] <= wll + 1e-9) : null;
  const factor = num(si?.modeFactor, 1) || 1; const wllEff = num(si?.wllEff, 0) || (wll ? wll * factor : null);
  const perLeg = it.T != null ? it.T : carried / legs; const util = wllEff ? perLeg / wllEff * 100 : null;
  const hitch = si?.hitchLabel || (it.type === 'sling' ? (legs === 1 ? 'Straight' : `${legs}-leg${it.ang != null ? ', ' + Math.round(it.ang) + '° to horizontal' : ''}`) : it.type === 'shackle' || it.type === 'hook' ? 'Direct' : legs > 1 ? `${legs}-leg` : 'Direct');
  return { mat, label: si?.label || RP_MAT[mat].label, std: si?.std || RP_MAT[mat].std, colour: si?.colour || colRow?.[2] || null, colourName: si?.colourName || colRow?.[1] || '', hitch, factor, wll, wllEff, perLeg, util, legs, len: num(si?.lengthM, it.L) || null, notes: si?.notes || '', ang: it.ang };
}
function rpStadium(cx, cy, rw, rh, n = 10) { const r = rh, pts = []; for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + Math.PI * i / n; pts.push([cx + rw - r + r * Math.cos(a), cy + r * Math.sin(a)]); } for (let i = 0; i <= n; i++) { const a = Math.PI / 2 + Math.PI * i / n; pts.push([cx - rw + r - 0 + r * Math.cos(a), cy + r * Math.sin(a)]); } return pts; }
function rpEllipse(cx, cy, rx, ry, n = 14) { const pts = []; for (let i = 0; i < n; i++) { const a = 2 * Math.PI * i / n; pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return pts; }
// a small pictogram for the schedule: the other module's drawTackleIcon when it is there, else line art of our own
function rpIcon(pg, x, y, w, h, it, mat) {
  if (typeof drawTackleIcon === 'function') { try { drawTackleIcon(pg.P, x, y, w, h, (pg.c?.l?.tackles || [])[it.j] || it); return; } catch (e) { /* fall through to ours */ } }
  const P = pg.P, ink = { stroke: RP_C.ink, fill: 'none', layer: 'RAMS' }, cx = x + w / 2, cy = y + h / 2;
  if (mat === 'round' || mat === 'webbing' || mat === 'wire') {
    P.poly(rpStadium(cx, cy, w / 2 - 0.4, h * 0.34), { closed: true, ...ink, w: mat === 'webbing' ? 1.1 : 0.5 }); if (mat === 'round') P.poly(rpStadium(cx, cy, w / 2 - 1.3, h * 0.2), { closed: true, ...ink, w: 0.3 });
    if (mat === 'wire') for (let i = 0; i < 6; i++) { const tx = x + 2.2 + i * (w - 4.4) / 5; P.line(tx - 0.6, cy - h * 0.34, tx + 0.6, cy - h * 0.34 + 1.2, { stroke: RP_C.ink, w: 0.25, layer: 'RAMS' }); P.line(tx - 0.6, cy + h * 0.34 - 1.2, tx + 0.6, cy + h * 0.34, { stroke: RP_C.ink, w: 0.25, layer: 'RAMS' }); }
    P.circle(x + 1.6, cy, 1.1, { ...ink, w: 0.4 }); P.circle(x + w - 1.6, cy, 1.1, { ...ink, w: 0.4 });
  } else if (mat === 'chain') { [[-w * 0.3, 1], [0, 0], [w * 0.3, 1]].forEach(([dx, flat]) => P.poly(rpEllipse(cx + dx, cy, flat ? w * 0.17 : w * 0.1, h * 0.26), { closed: true, ...ink, w: 0.6 })); }
  else if (mat === 'shackle') { const pts = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * (0.12 + 0.76 * i / 16) + Math.PI / 2 * 0; pts.push([cx + Math.cos(a + Math.PI) * w * 0.26 * -1, cy + h * 0.1 + Math.sin(a) * h * 0.3]); } P.poly(pts, { ...ink, w: 0.7 }); P.line(cx - w * 0.24, cy - h * 0.2, cx + w * 0.24, cy - h * 0.2, { stroke: RP_C.ink, w: 0.9, layer: 'RAMS' }); P.circle(cx - w * 0.24, cy - h * 0.2, 0.8, { fill: RP_C.ink, stroke: 'none', layer: 'RAMS' }); P.circle(cx + w * 0.24, cy - h * 0.2, 0.8, { fill: RP_C.ink, stroke: 'none', layer: 'RAMS' }); }
  else if (mat === 'beam') { P.rect(x + 0.6, cy - 0.9, w - 1.2, 1.8, { fill: '#e8e8e8', stroke: RP_C.ink, w: 0.4, layer: 'RAMS' }); P.line(cx, y + 0.8, x + 1.6, cy - 0.9, { stroke: RP_C.ink, w: 0.3, layer: 'RAMS' }); P.line(cx, y + 0.8, x + w - 1.6, cy - 0.9, { stroke: RP_C.ink, w: 0.3, layer: 'RAMS' }); P.circle(cx, y + 0.8, 0.7, { ...ink, w: 0.3 }); P.line(x + 1.6, cy + 0.9, x + 1.6, y + h - 1.2, { stroke: RP_C.ink, w: 0.3, layer: 'RAMS' }); P.line(x + w - 1.6, cy + 0.9, x + w - 1.6, y + h - 1.2, { stroke: RP_C.ink, w: 0.3, layer: 'RAMS' }); P.circle(x + 1.6, y + h - 0.9, 0.7, { ...ink, w: 0.3 }); P.circle(x + w - 1.6, y + h - 0.9, 0.7, { ...ink, w: 0.3 }); }
  else if (mat === 'hook') { const pts = [[cx - 0.5, y + 0.6], [cx - 0.5, cy + h * 0.05]]; for (let i = 0; i <= 14; i++) { const a = -Math.PI / 2 + Math.PI * 1.35 * i / 14; pts.push([cx - 0.5 + w * 0.2 * Math.cos(a) * 1 + w * 0.0, cy + h * 0.05 + h * 0.3 * (1 + Math.sin(a)) * 0.9]); } P.poly(pts, { ...ink, w: 0.9 }); }
  else { P.rect(x + 1, y + 1, w - 2, h - 2, { ...ink, w: 0.4 }); P.line(x + 1, y + 1, x + w - 1, y + h - 1, { stroke: RP_C.ink, w: 0.3, layer: 'RAMS' }); }
}
const RP_INSPECT = {
  round: ['Tag legible: WLL, length, EN 1492 mark, serial number. No tag, no lift.', 'Cover cut, snagged, burnt or stained by chemicals: reject. Core yarns showing: reject.', 'Eyes undistorted, stitching whole.', 'Pad every edge and corner. No knots, no twists. Never drag a sling out from under a load.'],
  webbing: ['Tag legible: WLL, colour, EN 1492 mark, serial number. No tag, no lift.', 'Cuts, edge wear, burns, melted or chemical-stained fibres: reject.', 'Stitching whole, eyes undistorted, no knots.', 'Sleeves or corner protectors on every edge.'],
  wire: ['Kinks, birdcaging, crushed or flattened strands, heat colour: reject.', 'Broken wires, pitting or a thinner rope: reject on the tables in the sling\'s certificate.', 'Ferrules uncracked and not slipping. Thimble seated in the eye.', 'Do not bend it tighter than the tag allows.'],
  chain: ['Every link: stretch, nicks, gouges, bent or twisted links reject the chain.', 'Hooks: throat not spread, latch springs shut, no cracks.', 'Master link and couplers are the same grade as the chain.', 'Never knot or bolt a chain. Shorten only with the clutch.'],
  shackle: ['Pin is the right type and fully home, or split-pinned. Never a bolt.', 'WLL and grade stamped on the body. Body not opened or bent.', 'Load in line. A dee takes a straight pull only; a bow takes angled legs.'],
  beam: ['SWL plate legible and the thorough-examination certificate in date.', 'Welds and lifting eyes: no cracks, bending or wear.', 'Slings at the angle the plate allows. Check it hangs level in the trial lift.'],
  hook: ['Latch works and closes. Throat not stretched, no cracks.', 'SWL stamped and legible.']
};
function rpStackPicture(pg, x, y, w, h, c) { // hook → each item → the load, drawn to fit
  const items = c.tackles, n = items.length; const cx = x + 22; const rowH = Math.min(24, (h - 30) / Math.max(1, n)); const compact = rowH < 13;
  pg.P.rect(cx - 5, y, 10, 5, { fill: RP_C.acc, stroke: RP_C.ink, w: 0.35, layer: 'RAMS' }); rpTx(pg, cx + 8, y + 3.6, 'Hook', 2.2, { color: RP_C.grey });
  let cy = y + 5; items.forEach((it, i) => { const inf = it._inf; pg.P.line(cx, cy, cx, cy + (compact ? 1.2 : 3), { stroke: RP_C.ink, w: 0.4, layer: 'RAMS' });
    if (compact) { rpIcon(pg, cx - 7, cy + 1.2, 14, rowH - 2.4, it, inf.mat); rpTx(pg, cx + 10, cy + rowH / 2 + 0.9, `${i + 1}  ${it.name}`, 2.2, { bold: true, maxW: w - 34 }); }
    else { rpIcon(pg, cx - 9, cy + 3, 18, rowH - 6, it, inf.mat); pg.P.line(cx, cy + rowH - 3, cx, cy + rowH, { stroke: RP_C.ink, w: 0.4, layer: 'RAMS' });
      rpTx(pg, cx + 13, cy + rowH / 2 - 0.4, `${i + 1}  ${it.name}`, 2.4, { bold: true, maxW: w - 38 }); rpTx(pg, cx + 13, cy + rowH / 2 + 3, `${it.L ? fmt(it.L, 1) + ' m  ·  ' : ''}${fmt(it.w, 2)} t${inf.wll ? '  ·  WLL ' + fmt(inf.wll, 1) + ' t' : ''}`, 2, { color: RP_C.grey, maxW: w - 38 }); }
    cy += rowH; });
  const lw = Math.min(w - 16, Math.max(26, num(c.l.l, 3) * 7)); pg.P.line(cx, cy - 1, cx, cy, { stroke: RP_C.ink, w: 0.4, layer: 'RAMS' }); pg.P.rect(cx - lw / 2, cy, lw, 13, { fill: '#e9e9e9', stroke: RP_C.ink, w: 0.4, layer: 'RAMS' });
  rpTx(pg, cx, cy + 5.4, (c.l.name || 'Load').toUpperCase(), 2.4, { bold: true, anchor: 'middle', maxW: lw - 3 }); rpTx(pg, cx, cy + 9.6, `${fmt(c.r.W, 2)} t`, 2.2, { anchor: 'middle', color: RP_C.grey });
}
function rpSecRigging(c, sec) {
  const pg = rpNewPage(c, sec); pg.c = c; const { r, l } = c; const raw = c.tackles.map(it => ({ ...it }));
  if (!raw.length && r.sling) raw.push({ j: -1, name: `${r.sling.label} sling`, type: 'sling', L: r.sling.L, w: 0, legs: r.sling.legs, wll: r.sling.wll, T: r.sling.T, ang: r.sling.ang });
  c.tackles = raw; const base = r.W + r.contW + r.ex; let below = base;
  for (let i = raw.length - 1; i >= 0; i--) { raw[i]._carried = below; below += raw[i].w || 0; }
  raw.forEach(it => { it._inf = rpTackleInfo(c, it, it._carried); });
  const worst = raw.reduce((a, it) => (it._inf.util != null && it._inf.util > (a?._inf.util ?? -1) ? it : a), null);
  rpHead(pg, c, 'Rigging', 'Rigging and sling schedule', raw.length ? `${raw.length} item${raw.length > 1 ? 's' : ''} between hook and load, ${fmt(r.tk, 2)} t of tackle.${worst ? ` Busiest: ${worst.name} at ${fmt(worst._inf.util, 0)}% of its effective WLL.` : ''}` : `No tackle is listed for this lift. The ${fmt(r.tk, 2)} t of tackle in the load is a single figure.`);
  let y = 46; rpLabel(pg, RP_X0, y, 'Between the hook and the load, top to bottom');
  const swatch = (inf) => ({ draw: (pg2, cx, cy, w, h) => { if (inf.colour) { pg2.P.circle(cx + 3.2, cy + h / 2, 1.8, { fill: inf.colour, stroke: RP_C.ink, w: 0.2, layer: 'RAMS' }); rpTx(pg2, cx + 6.4, cy + h / 2 + 0.8, inf.colourName, 2.1, { maxW: w - 7 }); } else rpTx(pg2, cx + 1.3, cy + h / 2 + 0.8, 'n/a', 2.1, { color: RP_C.mid }); } });
  const rows = raw.map((it, i) => { const inf = it._inf; const ut = inf.util;
    return { h: 13.5, cells: [
      { draw: (pg2, cx, cy, w, h) => { rpTx(pg2, cx + 1.3, cy + 4.4, String(i + 1), 2.6, { bold: true, color: RP_C.grey }); rpIcon(pg2, cx + 5.2, cy + 1.6, 14, h - 3.2, it, inf.mat); rpTx(pg2, cx + 21, cy + 5.4, it.name, 2.5, { bold: true, maxW: w - 22 }); rpTx(pg2, cx + 21, cy + 9.4, `${inf.label}${inf.len ? ', ' + fmt(inf.len, 1) + ' m' : ''}${it.w ? ', ' + fmt(it.w, 2) + ' t' : ''}`, 2, { color: RP_C.grey, maxW: w - 22 }); } },
      { t: inf.std || '—', fs: 2.3 }, swatch(inf), { t: inf.hitch, wrap: true, maxLines: 3, fs: 2.2 },
      inf.wll ? { draw: (pg2, cx, cy, w, h) => { const a = `${fmt(inf.wll, 1)} t`, b = `${fmt(inf.wllEff, 1)} t`; const sz = 2.4, x0 = cx + 1.3, yb = cy + h / 2 + 0.85, ax = x0 + textW(a, sz, true) + 1.3; rpTx(pg2, x0, yb, a, sz, { bold: true }); pg2.P.line(ax, cy + h / 2, ax + 3.2, cy + h / 2, { stroke: RP_C.ink, w: 0.3, layer: 'RAMS' }); pg2.P.poly([[ax + 2.2, cy + h / 2 - 0.9], [ax + 3.4, cy + h / 2], [ax + 2.2, cy + h / 2 + 0.9]], { closed: true, fill: RP_C.ink, stroke: 'none', layer: 'RAMS' }); rpTx(pg2, ax + 4.6, yb, b, sz, { bold: true, maxW: cx + w - ax - 5.6 }); } } : { t: 'WLL not entered', color: RP_C.warn },
      { t: `${fmt(inf.perLeg, 2)} t`, a: 'r', bold: true },
      { a: 'r', draw: (pg2, cx, cy, w, h) => { if (ut == null) { rpTx(pg2, cx + w - 1.3, cy + h / 2 + 0.9, '—', 2.4, { anchor: 'end', color: RP_C.mid }); return; } const s = ut > 100 ? 'fail' : ut > 80 ? 'warn' : 'ok'; pg2.P.rect(cx + 1.3, cy + h / 2 + 2.4, w - 2.6, 1.4, { fill: RP_C.soft, stroke: 'none', layer: 'RAMS' }); pg2.P.rect(cx + 1.3, cy + h / 2 + 2.4, Math.min(w - 2.6, (w - 2.6) * ut / 100), 1.4, { fill: rpSt(s), stroke: 'none', layer: 'RAMS' }); rpTx(pg2, cx + w - 1.3, cy + h / 2 - 0.2, `${fmt(ut, 0)}%`, 2.6, { anchor: 'end', bold: true, color: rpSt(s) }); } },
      { draw: (pg2, cx, cy, w, h) => { rpHair(pg2, cx + 1.5, cx + w - 1.5, cy + h - 4.4, { c: RP_C.mid, w: 0.2 }); rpTx(pg2, cx + 1.5, cy + h - 1.6, 'tag / cert no.', 1.6, { color: RP_C.mid }); } },
      { draw: (pg2, cx, cy, w, h) => rpCheckBox(pg2, cx + (w - 3.4) / 2, cy + h / 2 - 1.7, 3.4) }] }; });
  const cols = [{ w: 46, t: 'Item' }, { w: 17, t: 'Standard' }, { w: 15, t: 'Colour' }, { w: 17, t: 'Hitch' }, { w: 21, t: 'WLL → effective' }, { w: 13, t: 'Per leg', a: 'r' }, { w: 13, t: 'Use', a: 'r' }, { w: 16, t: 'Cert / tag' }, { w: 10, t: 'Insp.', a: 'c' }];
  if (rows.length) { const tr = rpTable(pg, RP_X0, y + 2.2, cols, rows, { rh: 13.5 }); y = tr.y + 2; rpTx(pg, RP_X0 + 1.3, y + 3.2, `WLL is the vertical rating on the tag. Effective WLL is that rating in the hitch used. Use is the load in each leg against it. Tick when the slinger has read the tag and checked the item.`, 1.95, { color: RP_C.grey, maxW: 166 }); y += 10; }
  else { y = rpPara(pg, RP_X0 + 1.3, y + 8, `List each sling, shackle and beam in the Lift sheet and this schedule fills in with its standard, colour code, hitch and use. Until then the lift carries a single ${fmt(r.tk, 2)} t allowance for tackle.`, 2.6, 160, { maxLines: 3 }) + 6; }
  // colour code key
  rpLabel(pg, RP_X0, y + 2, 'Colour code, textile slings (EN 1492), WLL straight'); const kw = RP_GW / RP_COLOURS.length; RP_COLOURS.forEach(([t, nm, hex], i) => { const kx = RP_X0 + i * kw; pg.P.rect(kx, y + 4.6, kw - 1.4, 3.6, { fill: hex, stroke: 'none', layer: 'RAMS' }); rpTx(pg, kx, y + 11.6, `${t}${i === RP_COLOURS.length - 1 ? ' t +' : ' t'}  ${nm}`, 2.1, { bold: true, maxW: kw - 1.4 }); });
  y += 18; // below the schedule: how it hangs, and what each leg carries
  const L = rpCol(0, 8), R = rpCol(8, 4); rpInk(pg, RP_X0, RP_X1, y, 0.4); rpLabel(pg, L.x, y + 5, 'How it hangs'); rpLabel(pg, R.x, y + 5, 'Weights');
  if (raw.length) rpStackPicture(pg, L.x, y + 8, L.w, 258 - y - 8, c);
  const wr = [['Load', `${fmt(r.W, 2)} t`], ['Safety margin', `${fmt(r.contW, 2)} t`], ['Hook block', `${fmt(r.hb, 2)} t`], ['Tackle', `${fmt(r.tk, 2)} t`], { cells: [{ t: 'On the hook', bold: true }, { t: `${fmt(r.total, 2)} t`, bold: true }], rule: RP_C.ink }];
  const tr2 = rpTable(pg, R.x, y + 8, [{ w: R.w - 22 }, { w: 22, a: 'r' }], wr, { rh: 5.2, fs: 2.35, flush: true });
  if (raw.some(it => it.ang != null)) { const worstA = raw.filter(it => it.ang != null).sort((a, b) => a.ang - b.ang)[0]; rpPara(pg, R.x, tr2.y + 5, `Flattest sling leg: ${fmt(worstA.ang, 0)}° to the horizontal. Keep it at 45° or more; below that each leg carries more than the load divided by the legs.`, 2.2, R.w, { color: worstA.ang < 45 ? RP_C.fail : RP_C.grey, maxLines: 5 }); }
  rpSecRiggingDetail(c, sec);
  return pg;
}
function rpSecRiggingDetail(c, sec) {
  const pg = rpNewPage(c, sec, { cont: true }); pg.c = c; const { calc, plan } = c; const rig = calc.rig;
  rpHead(pg, c, 'Rigging, continued', 'Rigging detail and inspection', rig ? `${rig.legs} legs at ${fmt(rig.alpha, 0)}° from the vertical carry ${fmt(rig.T, 2)} t each: ${fmt(rig.slingUtil, 0)}% of the sling WLL.` : 'Pre-use checks for each kind of tackle in this lift.');
  const D = rpCol(0, 8), K = rpCol(8, 4); let y = 47;
  if (rig) { rpInk(pg, D.x, D.x + D.w, y, 0.3); rpLabel(pg, D.x, y + 4.5, 'Sling arrangement from the A1 plan'); rpDrawing(pg, D.x, y + 6, D.w, 150, 2.1, (Pd, box) => drawRigging(Pd, box, plan, calc)); y += 160; }
  // inspection points by material, for what is in this lift
  const mats = [...new Set(c.tackles.map(it => it._inf?.mat).filter(m => RP_INSPECT[m]))]; if (!mats.length) mats.push('round', 'shackle');
  const full = !rig; const colw = full ? 80 : K.w; const colx = (i) => full ? RP_X0 + (i % 2) * 88 : K.x;
  const topY = full ? y + 3 : 47; rpInk(pg, full ? RP_X0 : K.x, full ? RP_X1 : K.x + K.w, topY - 3, 0.3); rpLabel(pg, full ? RP_X0 : K.x, topY + 1.5, 'Before every lift, every item'); let ky = topY + 5; const ky0 = ky; const ys = [ky, ky];
  mats.forEach((m, i) => { const col = full ? i % 2 : 0; let yy = full ? ys[col] : ky; const x0 = colx(i); rpTx(pg, x0, yy + 3, RP_MAT[m].label.toUpperCase(), 2.2, { bold: true }); rpHair(pg, x0, x0 + colw, yy + 4.6, { c: RP_C.ink, w: 0.3 }); yy += 5.4;
    RP_INSPECT[m].forEach(t => { pg.P.rect(x0 + 0.4, yy + 0.5, 1.1, 1.1, { fill: RP_C.ink, stroke: 'none', layer: 'RAMS' }); yy = rpPara(pg, x0 + 3, yy + 1.9, t, 2.2, colw - 3, { lead: 1.38, maxLines: 4 }) + 1; }); yy += 3; if (full) ys[col] = yy; else ky = yy; });
  const endY = full ? Math.max(...ys) : ky; let by = Math.max(endY, full ? 0 : y) + 2;
  pg.P.rect(RP_X0, by, 1.5, 15, { fill: RP_C.acc, stroke: 'none', layer: 'RAMS' }); rpLabel(pg, RP_X0 + 5, by + 3.4, 'Certificates', { color: RP_C.ink });
  rpPara(pg, RP_X0 + 5, by + 8, 'Every item has a current third-party examination certificate (lifting accessories are examined every six months) and an inspection tag for the current period. The slinger reads the tag number against the certificate and signs the tick box on the schedule before the item goes on the hook.', 2.3, 160, { maxLines: 3 });
  return pg;
}
// ---------- helpers for pages that run on ----------
// draws rows onto a page; when the next row will not fit it opens a continuation page (repeating the table header) and goes on
function rpFlow(c, sec, pg, y, cols, rows, o = {}) {
  let i = 0; let top = y;
  while (i < rows.length) {
    let res = rpTable(pg, RP_X0, y, cols, rows.slice(i), { ...o, maxY: o.maxY || 274 });
    if (res.n === 0) res = rpTable(pg, RP_X0, y, cols, rows.slice(i, i + 1), { ...o, maxY: 1e9 }); // a row taller than the page: draw it anyway
    i += res.n; y = res.y;
    if (i < rows.length) { pg = rpNewPage(c, sec, { cont: true }); rpHead(pg, c, o.kicker || 'Continued', (o.title || sec.name) + ', continued', ''); y = 47; top = y; }
  }
  return { pg, y };
}
const rpSecNo = (c, id) => (c.secs.find(s => s.id === id) || {}).no || null;
const rpSecRef = (c, id, what) => { const n = rpSecNo(c, id); return n ? `${what} in section ${rpPad(n)}` : what; };

// ---------- risk assessment: the 5 × 5 matrix and the register ----------
function rpChip(pg, x, y, w, L, S, band, fixed) { // a rating chip: L×S and the band
  pg.P.rect(x, y, w, 4.4, { fill: band.bg, stroke: 'none', layer: 'RAMS' }); rpTx(pg, x + 1.3, y + 3.1, `${L}×${S}`, 2.2, { bold: true, color: band.col });
  rpTx(pg, x + w - 1.1, y + 3.0, band.label.toUpperCase(), 1.65, { bold: true, color: band.col, anchor: 'end' });
}
function rpSecRisk(c, sec) {
  const rows = c.risk; let pg = rpNewPage(c, sec); const hi0 = rows.filter(r => r.score >= 10).length, hi1 = rows.filter(r => r.score2 >= 10).length, fixed = rows.filter(r => r.fixed);
  rpHead(pg, c, 'Hazards', 'Risk assessment', `${rows.length} hazards on this lift. ${hi0} rate high or worse before controls, ${hi1} after them.${fixed.length ? ` ${fixed.length} red check${fixed.length > 1 ? 's keep' : ' keeps'} its score until the plan changes.` : ''}`);
  const gx = 62, gy = 57, cw = 15.4, ch = 13.4; rpLabel(pg, RP_X0, 51, 'Likelihood × severity, before and after the controls');
  for (let L = 5; L >= 1; L--) for (let S = 1; S <= 5; S++) { const x = gx + (S - 1) * cw, y = gy + (5 - L) * ch; const b = riskBand(L * S); pg.P.rect(x, y, cw, ch, { fill: b.bg, stroke: '#ffffff', w: 0.6, layer: 'RAMS' }); rpTx(pg, x + 1.2, y + 2.8, String(L * S), 1.7, { color: b.col, bold: true }); }
  for (let L = 5; L >= 1; L--) { const y = gy + (5 - L) * ch + ch / 2; rpTx(pg, gx - 2, y + 0.7, `${L}  ${RISK_L[L - 1]}`, 1.9, { anchor: 'end', maxW: 26 }); }
  for (let S = 1; S <= 5; S++) { const x = gx + (S - 1) * cw + cw / 2; rpTx(pg, x, gy + 5 * ch + 3.4, String(S), 2.2, { anchor: 'middle', bold: true }); rpTx(pg, x, gy + 5 * ch + 6.6, RISK_S[S - 1], 1.65, { anchor: 'middle', color: RP_C.grey, maxW: cw - 1 }); }
  rpLabel(pg, gx, gy - 2.2, 'Severity increases to the right'); pg.P.text(RP_X0 + 1, gy + 5 * ch, 'LIKELIHOOD', { size: 1.9, bold: true, color: RP_C.grey, rot: -90, anchor: 'start', vAlign: 'base', layer: 'RAMS' });
  const slots = {}; const place = (L, S) => { const k = L + ',' + S; const n = slots[k] = (slots[k] ?? -1) + 1; const dx = [-5.2, 0, 5.2], dy = [-3.9, 0.2, 4.3]; return [gx + (S - 0.5) * cw + dx[n % 3] + (n >= 9 ? 1.8 : 0), gy + (5 - L) * ch + ch / 2 + dy[Math.floor(n / 3) % 3] + 0.2]; };
  const mk = rows.map(r => ({ r, a: place(r.L, r.S), b: place(r.LR, r.SR) }));
  mk.forEach(({ r, a, b }) => { if (r.L !== r.LR) pg.P.line(a[0], a[1], b[0], b[1], { stroke: '#777777', w: 0.2, layer: 'RAMS' }); });
  mk.forEach(({ r, a }) => { pg.P.circle(a[0], a[1], 2.1, { fill: '#ffffff', stroke: RP_C.ink, w: 0.35, layer: 'RAMS' }); rpTx(pg, a[0], a[1] + 0.65, String(r.n), 1.7, { anchor: 'middle', bold: true }); });
  mk.forEach(({ r, b }) => { pg.P.circle(b[0], b[1], 2.1, { fill: RP_C.ink, stroke: 'none', layer: 'RAMS' }); rpTx(pg, b[0], b[1] + 0.65, String(r.n), 1.7, { anchor: 'middle', bold: true, color: '#ffffff' }); });
  // the key
  const kx = 146, kw = 54; let ky = 51; rpLabel(pg, kx, ky, 'Key');
  pg.P.circle(kx + 2.4, ky + 5, 2, { fill: '#ffffff', stroke: RP_C.ink, w: 0.35, layer: 'RAMS' }); rpTx(pg, kx + 6, ky + 5.8, 'before the controls', 2.2); pg.P.circle(kx + 2.4, ky + 10.6, 2, { fill: RP_C.ink, stroke: 'none', layer: 'RAMS' }); rpTx(pg, kx + 6, ky + 11.4, 'after the controls', 2.2);
  ky += 17; const act = { low: 'Go ahead with the controls in the register.', med: 'Go ahead. The supervisor briefs each control.', high: 'No start until the Appointed Person signs and a named person holds each control.', ext: 'Stop. Change the plan.' };
  RISK_BANDS.forEach(([mx, b], i) => { const lo = i ? RISK_BANDS[i - 1][0] + 1 : 1; pg.P.rect(kx, ky, 4, 4, { fill: b.bg, stroke: b.col, w: 0.25, layer: 'RAMS' }); rpTx(pg, kx + 6, ky + 3, `${b.label}  ${lo}–${mx}`, 2.3, { bold: true }); ky = rpPara(pg, kx + 6, ky + 6.4, act[b.k], 2, kw - 6, { color: RP_C.grey, lead: 1.35, maxLines: 3 }) + 2.2; });
  ky += 1; rpLabel(pg, kx, ky, 'Hazards by band'); const cnt = (f) => RISK_BANDS.map(([, b]) => rows.filter(r => f(r).k === b.k).length);
  const c0 = cnt(r => r.band), c1 = cnt(r => r.band2); const kt = rpTable(pg, kx, ky + 1.5, [{ w: 22, t: '' }, { w: 16, t: 'Before', a: 'r' }, { w: 16, t: 'After', a: 'r' }], RISK_BANDS.map(([, b], i) => [{ t: b.label, bold: true, color: b.col }, { t: String(c0[i]), a: 'r' }, { t: String(c1[i]), a: 'r', bold: true }]), { rh: 4.6, fs: 2.3, flush: true });
  // every hazard in one table
  const y0 = Math.max(gy + 5 * ch + 13, kt.y + 8); rpLabel(pg, RP_X0, y0, 'Hazards at a glance');
  const srcT = (r) => r.src === 'auto' ? 'from the plan' : r.src === 'extra' ? 'added by the AP' : 'ticked on site';
  const chipCell = (L, S, band) => ({ draw: (pg2, cx, cy, w, h) => rpChip(pg2, cx + 1.3, cy + (h - 4.4) / 2, w - 2.6, L, S, band) });
  const tbl = rows.map(r => [{ t: String(r.n), bold: true }, { t: r.name, bold: true }, { t: srcT(r), color: RP_C.grey }, chipCell(r.L, r.S, r.band), chipCell(r.LR, r.SR, r.band2), { t: r.owner, color: RP_C.grey }]);
  const fl = rpFlow(c, sec, pg, y0 + 2, [{ w: 8, t: 'No' }, { w: 66, t: 'Hazard' }, { w: 26, t: 'Where it comes from' }, { w: 24, t: 'Before' }, { w: 24, t: 'After' }, { w: 20, t: 'Owner' }], tbl, { rh: 5.4, fs: 2.35, kicker: 'Hazards', title: 'Risk assessment' }); pg = fl.pg;
  // the register: controls, and what is left
  pg = rpNewPage(c, sec, { cont: true }); rpHead(pg, c, 'Hazards, continued', 'Risk register', 'What is in place against each hazard, and the rating that is left. Red checks cannot be argued down: the controls only help once the plan passes.');
  const cols = [{ w: 7, t: 'No' }, { w: 45, t: 'Hazard' }, { w: 17, t: 'Before' }, { w: 66, t: 'Controls' }, { w: 17, t: 'After' }, { w: 16, t: 'Owner' }]; const fs = 2.15, lead = fs * 1.34;
  const reg = rows.map(r => { const hl = rpLines(r.name, 2.4, 41, true, 3), wl = rpLines(r.why, 2.0, 41, false, 5); const cl = r.controls.map(t => rpLines(t, fs, 62, false, 4)); const nCl = cl.reduce((a, l) => a + l.length, 0);
    const hh = Math.max(hl.length * 3.2 + wl.length * 2.7 + 4, nCl * lead + cl.length * 0.9 + 3.4, 12);
    return { h: hh, cells: [{ t: String(r.n), bold: true, draw: (pg2, cx, cy) => rpTx(pg2, cx + 1.3, cy + 4.2, String(r.n), 2.6, { bold: true }) },
      { draw: (pg2, cx, cy) => { let yy = cy + 4.2; hl.forEach(l => { rpTx(pg2, cx + 1.3, yy, l, 2.4, { bold: true, maxW: 42 }); yy += 3.2; }); yy -= 0.4; wl.forEach(l => { rpTx(pg2, cx + 1.3, yy, l, 2.0, { color: RP_C.grey, maxW: 42 }); yy += 2.7; }); } },
      { draw: (pg2, cx, cy, w) => rpChip(pg2, cx + 1.3, cy + 2.6, w - 2.6, r.L, r.S, r.band) }, { draw: (pg2, cx, cy) => { let yy = cy + 4.2; cl.forEach(ls => { pg2.P.rect(cx + 1.5, yy - 1.5, 0.9, 0.9, { fill: RP_C.ink, stroke: 'none', layer: 'RAMS' }); ls.forEach((l, j) => { rpTx(pg2, cx + 3.6, yy + j * lead, l, fs, { maxW: 62 }); }); yy += ls.length * lead + 0.9; }); } },
      { draw: (pg2, cx, cy, w) => { rpChip(pg2, cx + 1.3, cy + 2.6, w - 2.6, r.LR, r.SR, r.band2); if (r.fixed) rpTx(pg2, cx + 1.3, cy + 9, 'unchanged:', 1.7, { color: RP_C.fail, bold: true }); if (r.fixed) rpTx(pg2, cx + 1.3, cy + 11.2, 'fix the plan', 1.7, { color: RP_C.fail }); } },
      { t: r.owner, wrap: true, maxLines: 3, color: RP_C.grey, fs: 2.0 }] }; });
  const fl2 = rpFlow(c, sec, pg, 47, cols, reg, { kicker: 'Hazards', title: 'Risk register', valign: 'top' }); pg = fl2.pg;
  // who assessed it
  const ay = Math.min(fl2.y + 12, 258); rpLabel(pg, RP_X0, ay, 'Assessed by'); rpTable(pg, RP_X0, ay + 2, [{ w: 44, t: 'Role' }, { w: 50, t: 'Name' }, { w: 48, t: 'Signature' }, { w: 26, t: 'Date' }], [[{ t: 'Appointed Person', bold: true }, { t: c.ap, bold: true }, '', '']].map(q => ({ cells: q, h: 10 })), { rh: 10 });
  return pg;
}

// ---------- method statement ----------
function rpMethodSteps(c) {
  const { r, l, crane, ch, g, T, pv, wx } = c; const side = SIDE_WORD[sideOf(l)]; const tk = c.tackles || r.stack?.items || []; const wind = r.wind?.vPerm != null ? fmt(r.wind.vPerm, 1) : wx?.limit ? fmt(wx.limit, 1) : '9.8';
  const worstAng = tk.filter(t => t.ang != null).sort((a, b) => a.ang - b.ang)[0]; const rigText = tk.length ? tk.map(t => t.name).join(', ') : (r.sling ? `${r.sling.label} sling, ${r.sling.legs} legs` : 'the tackle on the schedule');
  const perm = rpSecRef(c, 'permit', 'the briefing sheet'), emg = rpSecRef(c, 'emergency', 'the emergency plan');
  const rows = c.risk || []; const PH = { before: 'Before the lift', lift: 'The lift' }; const hz = (ph) => rows.filter(x => x.step && x.step[0] === ph).map(x => ({ ph: PH[ph], title: x.step[1], text: x.step[2], who: x.step[3] }));
  const S = [
    { ph: 'Before the lift', title: 'Permit and briefing', who: 'AP, supervisor', text: `The Appointed Person signs the permit before the crane moves. Everyone on the lift attends the briefing and signs ${perm}. Walk the lift: crane position, load path, landing, exclusion zone.` },
    { ph: 'Before the lift', title: 'Weather and ground', who: 'Supervisor', text: `Read the forecast and the anemometer. Stop limit ${wind} m/s at the boom head. Confirm the ground: ${g?.allow ? gbpTxt(g.allow) + ' allowable' : 'allowable bearing from the site report'}, mats ${g?.mat || pv.matSize || 'as planned'}. Probe for voids and services under the footprint.` },
    ...hz('before'),
    { ph: 'Before the lift', title: 'Set up the crane', who: 'Operator', text: `Set up the ${crane.model} where the plan shows it. Legs ${c.O ? outExtLabel(c.O.ext).toLowerCase() : 'full'} on the mats, cylinders down until the tyres are clear, crane level. Counterweight ${fmt(c.cwt, 1)} t, boom ${fmt(r.tele?.L ?? r.geo?.L, 1)} m at ${fmt(r.geo?.theta, 1)}°${c.falls ? ', ' + c.falls + ' falls' : ''}. Set the LMI to ${ch ? ch.name : 'this configuration'}.` },
    { ph: 'Before the lift', title: 'Exclusion zone', who: 'Supervisor', text: `Barrier the load path and the tail swing (${fmt(num(crane.tail, 4), 1)} m). Reach is ${fmt(r.R, 1)} m over the ${side}. Post one signaller. Nobody else inside the barrier once the slings are on.` },
    { ph: 'Before the lift', title: 'Rig the load', who: 'Slinger', text: `Rig ${fmt(r.W, 2)} t${l.name ? ' (' + l.name + ')' : ''} with ${rigText}. Read every tag against its certificate. ${worstAng ? `Flattest sling leg ${fmt(worstAng.ang, 0)}° to the horizontal: ${worstAng.ang < 45 ? 'too flat, lengthen the slings or add a spreader.' : 'keep it at 45° or more.'} ` : ''}Pad the edges. Fit tag lines.` },
    { ph: 'Before the lift', title: 'Pre-lift checks', who: 'Operator', text: 'Test the LMI, the anemometer, the hoist brake and the hook latch. Radio check with the signaller. Agree the hand signals and who calls STOP.' },
    { ph: 'The lift', title: 'Trial lift', who: 'Supervisor, operator', text: `Lift 100–300 mm and hold for a minute. The LMI should read about ${fmt(r.total, 1)} t (${fmt(c.util, 0)}% of ${T ? 'the tandem limit' : 'the chart'}). Watch the legs and mats, the level of the crane, the hang of the load. Anything off: lower and correct.` },
    ...hz('lift'),
    { ph: 'The lift', title: 'Lift and slew', who: 'Operator, signaller', text: `Hoist to travel height, then slew over the ${side} to ${fmt(r.R, 1)} m (boom head ${fmt(r.tipY, 1)} m).${r.clearance != null ? ` Closest gap ${fmt(r.clearance, 1)} m to ${r.clearLine?.label ? String(r.clearLine.label).toLowerCase() : 'the structure'}.` : ''} Slew slowly. The signaller keeps the load in sight${T ? '; the lift supervisor calls each crane in turn' : ''}. One motion at a time.` },
    { ph: 'The lift', title: 'Land the load', who: 'Slinger, operator', text: `Land at ${fmt(r.landY, 2)} m on packing so the slings can come out. Lower slowly, take the weight off, check the load is stable. Slings stay on until it is.` },
    { ph: 'After the lift', title: 'Release and clear', who: 'Slinger', text: 'Unhook only when the load is stable and the slings are slack. Coil and store the tackle. Inspect every item for damage and report defects before the next lift.' },
    { ph: 'After the lift', title: 'De-rig', who: 'Operator', text: 'Stow the boom and the hook block. Retract the outriggers one at a time, lift the mats, check the ground. Leave the area clear.' },
    { ph: 'After the lift', title: 'Close out', who: 'Supervisor', text: `Cancel the permit and collect the briefing sheet for the Appointed Person's file. Report incidents and near misses. Stop-work triggers and recovery are in ${emg}.` }];
  return S;
}
function rpSecMethod(c, sec) {
  let pg = rpNewPage(c, sec); const steps = rpMethodSteps(c);
  rpHead(pg, c, 'Procedure', 'Method statement', `${steps.length} steps from set-up to de-rig, written for the ${c.crane.model} lifting ${fmt(c.r.W, 1)} t at ${fmt(c.r.R, 1)} m over the ${SIDE_WORD[sideOf(c.l)]}.${c.risk.some(x => x.step) ? ' Steps from the hazards on site are folded in.' : ''}`);
  let y = 48, ph = '', n = 0; const tw = 118, bx = RP_X0 + 13;
  for (const s of steps) {
    const lines = rpLines(s.text, 2.35, tw, false), hh = 4.2 + lines.length * 3.2 + 2.6; const head = s.ph !== ph ? 8.5 : 0;
    if (y + head + hh > 274) { pg = rpNewPage(c, sec, { cont: true }); rpHead(pg, c, 'Procedure', 'Method statement, continued', ''); y = 48; }
    if (s.ph !== ph) { ph = s.ph; rpInk(pg, RP_X0, RP_X1, y, 0.5); rpLabel(pg, RP_X0, y + 4.8, ph, { color: RP_C.ink, size: 2.1 }); y += 8.5; }
    n++; rpDisp(pg, RP_X0, y + 7.6, rpPad(n), 8.2, { color: RP_C.mid, k: 0.84 }); rpTx(pg, bx + 4, y + 3.6, s.title, 3, { bold: true, maxW: tw });
    lines.forEach((l, i) => rpTx(pg, bx + 4, y + 7.9 + i * 3.2, l, 2.35, { maxW: tw })); rpLabel(pg, RP_X1, y + 3.6, s.who, { anchor: 'end', size: 1.7, maxW: 30 });
    rpHair(pg, bx + 4, RP_X1, y + hh - 0.6); y += hh;
  }
  return pg;
}
// ---------- 8 · sheet data panel (what the A1 sheet prints in its data panel) ----------
function rpSecPanel(c, sec) {
  let pg = rpNewPage(c, sec); const pg0 = pg; const blocks = sheetBlocks(c.plan, c.calc, c.S); const ovs = (c.calc.sheetOv || []).length;
  const nRows = blocks.reduce((a, b) => a + b.rows.length, 0);
  rpHead(pg, c, 'Drawings', 'Sheet data panel', `${nRows} values, as the A1 sheet prints them.${ovs ? ` ${ovs} typed over by hand (marked *).` : ''} Change a value in the plan and the sheet and this page follow.`);
  const total = blocks.reduce((a, b) => a + 11 + b.rows.length * 5, 0); const half = total / 2; const colX = [RP_X0, RP_X0 + 87], colW = 81; let col = 0, y = 49; const sentence = (s) => { const t = String(s || '').toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
  const newCol = () => { if (col === 0) { col = 1; y = 49; } else { pg = rpNewPage(c, sec, { cont: true }); rpHead(pg, c, 'Drawings', 'Sheet data panel, continued', ''); col = 0; y = 49; } };
  for (const b of blocks) {
    if (y + 9 + 5 > 274 || (col === 0 && y - 49 > half * 0.55 && pg === pg0)) newCol();
    const hd = String(b.head || 'DATA').replace(/^M\./, '').replace(/DATA(\d)$/, 'DATA'); rpInk(pg, colX[col], colX[col] + colW, y, 0.5); rpLabel(pg, colX[col], y + 4.6, hd, { color: RP_C.ink, size: 2.0 }); y += 7;
    for (const r of b.rows) {
      if (y + 5 > 274) { newCol(); rpLabel(pg, colX[col], y + 4.6, hd + ' (cont.)', { color: RP_C.grey, size: 1.8 }); y += 7; }
      const lab = sentence(r.label), v = String(r.v ?? '') + (r.ov ? ' *' : ''); rpTx(pg, colX[col] + 0.6, y + 3.4, lab, 2.25, { color: RP_C.grey, maxW: 42 }); rpTx(pg, colX[col] + colW - 0.6, y + 3.4, v, 2.4, { bold: true, anchor: 'end', maxW: 36, color: r.ov ? RP_C.warn : RP_C.ink }); rpHair(pg, colX[col], colX[col] + colW, y + 5); y += 5;
    }
    y += 4;
  }
  return pg;
}
// ---------- 9 · the whole A1 sheet, fitted to a landscape A4 page ----------
function rpSecA1(c, sec) {
  const pg = rpNewPage(c, sec, { land: true });
  const { P: Ps } = buildSheet(c.plan, c.calc, { ...c.S, paper: 'A1' }); const inner = ramsInner(Ps, 841, 594); const w = 186 * 841 / 594; // 186 mm high keeps the footer clear
  pg.raw(ramsPlace(inner, 841, 594, 10 + (277 - w) / 2, 6.4, w));
  rpLabel(pg, 10, 3.6, 'Full A1 sheet, fitted to the page', { size: 1.9 }); rpTx(pg, 287, 3.6, 'Not to scale. The A1 PDF is the plan of record.', 1.9, { anchor: 'end', color: RP_C.grey });
  return pg;
}

// ---------- 10 · permit to lift and the briefing sheet ----------
function rpBlank(pg, x, y, w, label, value) { rpLabel(pg, x, y, label, { maxW: w }); if (value) rpTx(pg, x, y + 6.6, String(value), 2.7, { bold: true, maxW: w }); rpHair(pg, x, x + w, y + 8, { c: RP_C.mid, w: 0.2 }); }
const rpDv = (c, k) => { const v = String(c.d?.[k] ?? '').trim(); return v; };   // a documentation value (v7/docs.js) or ''
const rpWho = (c, k, ph) => [rpDv(c, k), rpDv(c, ph)].filter(Boolean).join('  ·  ');
function rpSecPermit(c, sec) {
  const { r, l, crane, ch, g, T, m, S } = c; let pg = rpNewPage(c, sec); const crit = c.st !== 'ok' || (c.util != null && c.util >= num(S.utilWarn, 75)) || !!T; const wind = r.wind?.vPerm != null ? fmt(r.wind.vPerm, 1) : c.calc.weather?.limit ? fmt(c.calc.weather.limit, 1) : '9.8';
  rpHead(pg, c, 'Authorisation', 'Permit to lift', `${crit ? 'Critical lift.' : 'Routine lift.'} The Appointed Person issues it, the supervisor and the operator accept it. It is void the moment anything on this page changes.`);
  const gw = RP_GW / 4; let y = 49; const win = String(rpDv(c, 'time')).split(/\s*[–—-]\s*|\s+to\s+/i); const lday = m.date || c.date;
  [['Permit no.', rpDv(c, 'permitNo') || `${c.docNo}/PTL`], ['Site', rpDv(c, 'address') || c.site || m.project || ''], ['Valid from', win[0] ? `${lday}, ${win[0]}` : ''], ['Valid to', win[1] ? `${lday}, ${win[1]}` : '']].forEach((f, i) => { const x = RP_X0 + i * gw; if (f[1]) rpFact(pg, x, y, gw - 4, f[0], f[1], { size: 3, maxLines: 2 }); else rpBlank(pg, x, y, gw - 5, f[0] + ' (date, time)'); });
  y += 14; [['Crane', c.cranesTxt], ['Load', `${l.name ? l.name + ', ' : ''}${fmt(r.W, 2)} t`], ['Radius · boom · side', `${fmt(r.R, 1)} m · ${fmt(r.tele?.L ?? r.geo?.L, 1)} m · ${SIDE_WORD[sideOf(l)]}`], ['Category', `${crit ? 'Critical' : 'Routine'}${T ? ', tandem' : ''}`]].forEach(([a, b], i) => rpFact(pg, RP_X0 + i * gw, y, gw - 4, a, b, { size: 2.9, maxLines: 2 }));
  y += 16; rpInk(pg, RP_X0, RP_X1, y, 0.5);
  const L = rpCol(0, 6), R = rpCol(6, 6); rpLabel(pg, L.x, y + 5, 'Before the crane is set up'); rpLabel(pg, R.x, y + 5, 'Before the load leaves the ground');
  const A = [`Ground checked: ${g?.allow ? gbpTxt(g.allow) + ' allowable' : 'allowable bearing from the site report'}, mats ${g?.mat || c.pv.matSize || 'as planned'}.`, 'Voids, trenches and services probed under the footprint and the slew area.', `Exclusion zone barriered and signed. Tail swing ${fmt(num(crane.tail, 4), 1)} m.`, `Overhead lines and structures cleared${r.clearance != null ? ': closest gap ' + fmt(r.clearance, 1) + ' m' : ''}.`, `Forecast and anemometer read. Stop at ${wind} m/s at the boom head.`, 'Operator and slinger hold current certificates and have read this plan.'];
  const B = [`Outriggers ${c.O ? outExtLabel(c.O.ext).toLowerCase() : 'full'} on mats, crane level.`, `LMI set: ${ch ? ch.name : 'plan configuration'}, ${fmt(c.cwt, 1)} t counterweight, boom ${fmt(r.tele?.L ?? r.geo?.L, 1)} m${c.falls ? ', ' + c.falls + ' falls' : ''}.`, `Load weight confirmed: ${fmt(r.W, 2)} t. Hook load ${fmt(r.total, 2)} t, ${fmt(c.util, 0)}% of ${T ? 'the tandem limit' : 'the chart'}.`, 'Tackle tags read against certificates. Sling angle 45° or more. Tag lines fitted.', 'Radio check done. Hand signals agreed. One person gives signals.', 'Trial lift 100–300 mm done, held a minute, load level and legs steady.'];
  const list = (x, items) => { let yy = y + 11; items.forEach(t => { rpCheckBox(pg, x, yy - 2.6, 3.2); const ny = rpPara(pg, x + 5.4, yy, t, 2.35, 74, { lead: 1.38 }); yy = ny + 2.4; }); return yy; };
  const e1 = list(L.x, A), e2 = list(R.x, B); y = Math.max(e1, e2) + 3;
  rpLabel(pg, RP_X0, y, 'Authorisation'); const sig = { draw: (pg2, cx, cy, w, h) => rpHair(pg2, cx + 2, cx + w - 3, cy + h - 3, { c: RP_C.mid, w: 0.2 }) };
  const t1 = rpTable(pg, RP_X0, y + 2, [{ w: 42, t: 'Role' }, { w: 44, t: 'Name' }, { w: 44, t: 'Signature' }, { w: 22, t: 'Date' }, { w: 16, t: 'Time' }], [['Appointed Person: issues', c.ap], ['Lift supervisor: accepts', rpDv(c, 'supervisor')], ['Crane operator: accepts', rpWho(c, 'operator', 'operatorCard')], ['Slinger / signaller: accepts', rpWho(c, 'slinger', 'slingerCard')]].map(([a, b]) => ({ cells: [{ t: a, bold: true }, { t: b, bold: true }, sig, sig, sig], h: 10.5 })), { rh: 10.5 });
  y = t1.y + 6; rpLabel(pg, RP_X0, y, 'Lift complete'); const q = RP_GW / 4;
  [['Load landed at', ''], ['Area cleared', ''], ['Defects reported', ''], ['Permit cancelled by', '']].forEach(([a], i) => { rpCheckBox(pg, RP_X0 + i * q, y + 3.4, 3.2); rpTx(pg, RP_X0 + i * q + 5, y + 6, a, 2.3); rpHair(pg, RP_X0 + i * q + 5, RP_X0 + (i + 1) * q - 4, y + 12, { c: RP_C.mid, w: 0.2 }); });
  y += 18; pg.P.rect(RP_X0, y, 1.5, 15, { fill: RP_C.acc, stroke: 'none', layer: 'RAMS' }); rpLabel(pg, RP_X0 + 5, y + 3.2, 'This permit is void if', { color: RP_C.ink });
  rpPara(pg, RP_X0 + 5, y + 8, `the wind at the boom head reaches ${wind} m/s; the crane, load, radius, lift side, mats or rigging change; the LMI reads more than ${fmt(r.total, 1)} t on the hook; anyone calls STOP; or the shift changes.`, 2.35, 160, { maxLines: 3 });
  // the briefing sheet
  pg = rpNewPage(c, sec, { cont: true }); rpHead(pg, c, 'Authorisation', 'Briefing sheet', 'Toolbox talk before the lift. Everyone on the lift, and everyone who works inside the exclusion zone, signs.');
  const A2 = rpCol(0, 8), B2 = rpCol(8, 4); y = 49; rpLabel(pg, A2.x, y, 'Points to cover'); y += 3;
  const topRisks = (c.risk || []).slice().sort((a, b) => b.score - a.score).slice(0, 3).map(x => x.name.toLowerCase());
  const pts = [`The lift: ${fmt(r.W, 1)} t ${l.name ? l.name.toLowerCase() : 'load'} with the ${crane.model} at ${fmt(r.R, 1)} m over the ${SIDE_WORD[sideOf(l)]}${T ? ', tandem with ' + (T.picks.length - 1) + ' other crane' + (T.picks.length > 2 ? 's' : '') : ''}.`, 'Who does what: Appointed Person, supervisor, operator, slinger, signaller. Only the signaller gives signals; anyone may call STOP.', `Exclusion zone and where to stand. Nobody under the load, nobody inside the tail swing (${fmt(num(crane.tail, 4), 1)} m).`, `Weather: stop at ${wind} m/s. Who reads the anemometer.`, `Hazards on this lift: ${topRisks.join('; ')}.`, `Rigging: ${(c.tackles || []).length ? c.tackles.map(t => t.name).join(', ') : 'as scheduled'}. Tag lines, landing, how the slings come off.`, 'Emergency: where to muster, who calls 998, where the first-aider is, how the crane is made safe.'];
  pts.forEach((t, i) => { rpTx(pg, A2.x, y + 4.2, String(i + 1), 2.5, { bold: true }); y = rpPara(pg, A2.x + 5, y + 4.2, t, 2.35, A2.w - 6, { lead: 1.4 }) + 1.6; });
  let by = 49; [['Given by', rpDv(c, 'supervisor') || c.ap], ['Date', m.date || c.date], ['Time', String(rpDv(c, 'time')).split(/\s*[–—-]\s*/)[0] || ''], ['Site contact', rpWho(c, 'siteContact', 'sitePhone')]].forEach(([a, v]) => { rpBlank(pg, B2.x, by, B2.w, a, v); by += 12.5; });
  const ay = Math.max(y, by) + 4; rpLabel(pg, RP_X0, ay, 'Sign-in'); const nR = Math.max(6, Math.floor((274 - (ay + 2 + 4.6)) / 8.2));
  rpTable(pg, RP_X0, ay + 2, [{ w: 8, t: 'No' }, { w: 50, t: 'Name' }, { w: 40, t: 'Company, role' }, { w: 28, t: 'ID or pass no.' }, { w: 42, t: 'Signature' }], Array.from({ length: nR }, (_, i) => ({ cells: [{ t: String(i + 1), color: RP_C.mid }, '', '', '', ''], h: 8.2 })), { rh: 8.2 });
  return pg;
}

// ---------- 11 · emergency and rescue plan ----------
function rpSecEmergency(c, sec) {
  const { r, l, crane, S, T } = c; const pg = rpNewPage(c, sec); const wind = r.wind?.vPerm != null ? fmt(r.wind.vPerm, 1) : c.calc.weather?.limit ? fmt(c.calc.weather.limit, 1) : '9.8';
  rpHead(pg, c, 'Response', 'Emergency and rescue plan', `Stop at ${wind} m/s. Know the recovery for a load stuck in the air before it is in the air. Fill in the contacts at the briefing.`);
  const Lc = rpCol(0, 8), Rc = rpCol(8, 4); let y = 49; rpLabel(pg, Lc.x, y, 'Stop the lift when'); y += 3;
  const stops = [`The wind at the boom head reaches ${wind} m/s, or lightning is within 10 km.`, `The LMI warns, cuts out, or reads more than ${fmt(r.total, 1)} t at ${fmt(r.R, 1)} m.`, 'A mat moves or sinks, the crane leaves level, or a leg lifts.', 'Anyone who is not part of the lift enters the exclusion zone.', 'Radio or signals are lost.', 'A sling, shackle or the load shows damage, slips, or hangs out of level.', `The boom or load comes within ${fmt(num(c.S.minClearance, 1), 1)} m of anything it should not touch.`, 'Anyone calls STOP. The lift restarts only when the supervisor says so.'];
  stops.forEach((t, i) => { rpDisp(pg, Lc.x, y + 5.2, String(i + 1), 6.2, { color: RP_C.mid }); y = rpPara(pg, Lc.x + 8, y + 3.4, t, 2.4, Lc.w - 9, { lead: 1.38 }) + 1.8; rpHair(pg, Lc.x + 8, Lc.x + Lc.w, y - 1.2); });
  y += 5; rpLabel(pg, Lc.x, y, 'Load stuck in the air'); y += 3;
  const rec = ['Operator holds the load where it is. Supervisor calls STOP, widens the exclusion zone and sends everyone clear of the load path.', 'Nobody walks under it. Tell the Appointed Person. Find the cause: power or hydraulic loss, LMI cut-out, hoist fault, a snagged load.', 'LMI cut-out: use only the motions it allows, usually hoist down and boom up, to bring the load down. Never override the LMI.', 'Power or hydraulic loss: use the emergency lowering in the maker\'s manual. If the crane cannot lower, the Appointed Person decides: a second crane, or support the load from below on cribbing. No one climbs the boom.', 'Land and secure the load. Isolate the crane and tag it out. It lifts again only after a competent person has inspected it.'];
  rec.forEach((t, i) => { rpTx(pg, Lc.x, y + 4.2, String(i + 1), 2.5, { bold: true }); y = rpPara(pg, Lc.x + 5, y + 4.2, t, 2.35, Lc.w - 6, { lead: 1.4 }) + 1.8; });
  // right: the wind limit, numbers to call, and what to fill in
  let ry = 49; rpInk(pg, Rc.x, Rc.x + Rc.w, ry - 4, 0.5); rpLabel(pg, Rc.x, ry + 1, 'Wind limit, boom head'); const ww = rpDisp(pg, Rc.x, ry + 17, wind, 17, { maxW: Rc.w - 14 }); rpTx(pg, Rc.x + ww + 1.6, ry + 17, 'm/s', 3, { bold: true, color: RP_C.grey });
  ry += 25; rpInk(pg, Rc.x, Rc.x + Rc.w, ry, 0.3); rpLabel(pg, Rc.x, ry + 5, 'Emergency numbers, UAE'); const nums = [['Ambulance', '998'], ['Police', '999'], ['Fire, civil defence', '997']];
  nums.forEach(([a, b], i) => { rpTx(pg, Rc.x, ry + 12.5 + i * 8.5, a, 2.5, { color: RP_C.grey }); rpDisp(pg, Rc.x + Rc.w, ry + 13.2 + i * 8.5, b, 6.4, { anchor: 'end' }); rpHair(pg, Rc.x, Rc.x + Rc.w, ry + 15.6 + i * 8.5); });
  ry += 42; [['Muster point', rpDv(c, 'muster')], ['Nearest hospital', rpDv(c, 'hospital')], ['Ambulance access', rpDv(c, 'ambulance')], ['First-aider', rpDv(c, 'firstAider')]].forEach(([a, v]) => { rpBlank(pg, Rc.x, ry, Rc.w, a, v); ry += 12; });
  rpPara(pg, Rc.x, ry + 2, 'Injury: first-aider to the casualty and call 998. Do not move the casualty unless there is danger. Keep the area as it is.', 2.2, Rc.w, { color: RP_C.grey, maxLines: 5 });
  // contacts across the foot of the page
  y = Math.max(y, ry + 24) + 4; const tel = ((S.companyLines || []).find(t => /tel/i.test(t)) || '').replace(/^tel[:\s]*/i, '').split(/\s+fax/i)[0];
  rpLabel(pg, RP_X0, y, 'Contacts'); const roles = [['Appointed Person', c.ap, rpDv(c, 'apPhone')], ['Lift supervisor', rpDv(c, 'supervisor'), rpDv(c, 'supervisorPhone')], ['Site contact', rpDv(c, 'siteContact'), rpDv(c, 'sitePhone')], ['Site manager', rpDv(c, 'siteManager'), rpDv(c, 'siteManagerPhone')], ['Safety officer', rpDv(c, 'safety'), rpDv(c, 'safetyPhone')], ['Client representative', rpDv(c, 'clientRep') || c.m.client || '', rpDv(c, 'clientPhone')], [`${(S.company || 'FHE').split(' ').slice(0, 2).join(' ')} operations`, '', tel]];
  const room = Math.floor((274 - y - 9) / 6.4); const half = Math.ceil(Math.min(roles.length, room * 2) / 2);
  [roles.slice(0, half), roles.slice(half, half * 2)].forEach((rs, i) => { if (!rs.length) return; const x = RP_X0 + i * 87; rpTable(pg, x, y + 2, [{ w: 34, t: 'Role' }, { w: 26, t: 'Name' }, { w: 21, t: 'Phone' }], rs.map(([a, b, ph]) => [{ t: a, bold: true }, { t: b, wrap: false }, { t: ph || '', wrap: false }]), { rh: 6.4, fs: 2.3 }); });
  return pg;
}

// ---------- the sections the pack can include (the share sheet ticks these) ----------
const REPORT_SECTIONS = [
  { id: 'cover', title: 'Cover', sub: 'Job, crane, load, the drawing, a 3D picture and the status of the lift', def: true },
  { id: 'doc', title: 'Document control and contents', sub: 'Revisions, sign-off, distribution and the page list', def: true },
  { id: 'summary', title: 'Lift summary', sub: 'The key numbers and the verdict with its reasons', def: true },
  { id: 'elev', title: 'Elevation drawing', sub: 'The lift drawn side on, on a page of its own', def: true },
  { id: 'plan', title: 'Top view and site plan', sub: 'Boom swing, exclusion zone and what is around the lift', def: true },
  { id: 'tandem', title: 'Tandem lift', sub: 'Each crane\'s share, utilisation and the load-transfer notes (tandem lifts only)', def: true },
  { id: 'chart', title: 'Load chart extract', sub: 'The part of the chart round the duty point, with the lift marked', def: true },
  { id: 'panel', title: 'Sheet data panel', sub: 'Every value the A1 sheet prints in its data panel', def: true },
  { id: 'a1', title: 'Full A1 sheet, fitted to the page', sub: 'The whole plan on one landscape A4 page (small print)', def: false },
  { id: 'crane', title: 'Crane data sheet and references', sub: 'Set-up, dimensions and the maker documents the library holds', def: true },
  { id: 'ground', title: 'Outriggers and ground', sub: 'Leg loads, mats and the ground bearing check', def: true },
  { id: 'rigging', title: 'Rigging and sling schedule', sub: 'Every item with standard, colour code, WLL and use, plus pre-use checks', def: true },
  { id: 'risk', title: 'Risk assessment', sub: '5 × 5 matrix and register, filled from the plan and the site hazards you tick', def: true },
  { id: 'method', title: 'Method statement', sub: 'Numbered steps from set-up to de-rig for this lift', def: true },
  { id: 'permit', title: 'Permit to lift and briefing sheet', sub: 'Permit with its checks and signatures, and a sign-in sheet for the toolbox talk', def: true },
  { id: 'emergency', title: 'Emergency and rescue plan', sub: 'Stop-work triggers, recovering a load stuck in the air, contacts', def: true }
];
const RP_DEFS = [
  { id: 'cover', name: 'Cover' }, { id: 'doc', name: 'Document control' }, { id: 'summary', name: 'Lift summary', fn: rpSecSummary }, { id: 'elev', name: 'Elevation', fn: rpSecElev }, { id: 'plan', name: 'Top view and site plan', fn: rpSecPlanView },
  { id: 'tandem', name: 'Tandem lift', fn: rpSecTandem, when: (c) => !!c.T }, { id: 'chart', name: 'Load chart extract', fn: rpSecChart, when: (c) => !!(c.ch && getChart(c.ch)?.cols?.length) },
  { id: 'panel', name: 'Sheet data panel', fn: rpSecPanel, when: () => typeof sheetBlocks === 'function' }, { id: 'a1', name: 'Full A1 sheet, fitted to the page', fn: rpSecA1, when: () => typeof buildSheet === 'function' },
  { id: 'crane', name: 'Crane data sheet', fn: rpSecCrane }, { id: 'ground', name: 'Outriggers and ground', fn: rpSecGround, when: (c) => !!(c.O || c.g) }, { id: 'rigging', name: 'Rigging and sling schedule', fn: rpSecRigging },
  { id: 'risk', name: 'Risk assessment', fn: rpSecRisk }, { id: 'method', name: 'Method statement', fn: rpSecMethod }, { id: 'permit', name: 'Permit to lift', fn: rpSecPermit }, { id: 'emergency', name: 'Emergency and rescue plan', fn: rpSecEmergency }
];
// the sections that would print for this plan (a tandem page needs a tandem lift, a ground page needs an outrigger model …)
function reportAvailable(plan, calc, S) { try { const c = rpCtx(plan || state.plan, calc || state.calc, S || settingsEff(), null); return RP_DEFS.filter(d => !d.when || d.when(c)).map(d => d.id); } catch (e) { return RP_DEFS.map(d => d.id); } }
function rpBuild(plan, calc, S, shot, include) {
  const c = rpCtx(plan, calc, S, shot); const inc = new Set(Array.isArray(include) ? include : REPORT_SECTIONS.filter(x => x.def).map(x => x.id));
  const defs = RP_DEFS.filter(d => inc.has(d.id) && (!d.when || d.when(c))).map(d => ({ ...d }));
  if (!defs.length) throw new Error('Pick at least one section for the report');
  defs.filter(d => d.id !== 'cover').forEach((d, i) => { d.no = i + 1; }); c.secs = defs.filter(d => d.id !== 'cover'); c.hasCover = defs.some(d => d.id === 'cover');
  try { c.risk = typeof riskRegister === 'function' ? riskRegister(plan, calc) : []; } catch (e) { console.error(e); c.risk = []; }
  let docDef = null;
  for (const d of defs) { if (d.id === 'cover') rpCover(c); else if (d.id === 'doc') { docDef = d; d.idx = c.pages.length; c.pages.push(null); } else d.fn(c, d); } // document control is written last: it lists the page numbers
  if (docDef) rpSecDoc(c, docDef, docDef.idx);
  c.pages.forEach((pg, i) => { pg.no = i + 1; }); const N = c.pages.length;
  c.pages.forEach(pg => rpFurniture(pg, c, N));
  return { pages: c.pages, docNo: c.docNo, ctx: c, ids: defs.map(d => d.id) };
}
// @@NEXT
