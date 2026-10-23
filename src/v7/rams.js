// ===== v10 RAMS pack: the entry point (exportRAMS), the 3D still, drawings embedded at A1 proportions, the chart excerpt =====
// The pages themselves (cover, document control, lift summary, drawings, crane data, chart, ground, rigging, risk, method, permit, toolbox
// talk, emergency) are written by report.js (rpBuild). This file turns them into an A4 PDF with the same pipeline as the A1 sheet
// (draw.js primitives → toSVG → svg2pdf → jsPDF) and hands the file to the share card.

// a drawing made at k× size on its own primitives, placed in the page box scaled by 1/k (clipped to the box)
let ramsClip = 0;
function ramsInner(Psub, vbW, vbH) { return toSVG(Psub, { viewBox: [0, 0, vbW, vbH] }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''); }
function ramsEmbed(Psub, vbW, vbH, x, y, w) { return ramsPlace(ramsInner(Psub, vbW, vbH), vbW, vbH, x, y, w); }
function ramsPlace(inner, vbW, vbH, x, y, w, clipH) {
  const s = w / vbW, id = 'rc' + (++ramsClip);
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${clipH ?? vbH * s}"/></clipPath><g clip-path="url(#${id})" font-family="Helvetica, sans-serif"><g transform="translate(${x} ${y}) scale(${s})">${inner}</g></g>`; // drawings are set in plain Helvetica so their small dimension text can be told from the page layout (rams_check.js)
}
// the part of a load chart around the operating point: nCols boom columns and nRows radii, the duty cell inside
function ramsChartExcerpt(parsed, ci, Rrow, nCols = 9, nRows = 13) {
  const nc = parsed.cols.length; nCols = Math.min(nCols, nc); nRows = Math.min(nRows, parsed.rows.length);
  const c0 = Math.max(0, Math.min(nc - nCols, ci - Math.floor(nCols / 2))), c1 = Math.min(nc, c0 + nCols);
  const rows = parsed.rows; let ri = rows.findIndex(x => x[0] >= Rrow - 1e-6); if (ri < 0) ri = rows.length - 1;
  const r0 = Math.max(0, Math.min(rows.length - nRows, ri - Math.floor(nRows / 2))), r1 = Math.min(rows.length, r0 + nRows);
  return { sub: { cols: parsed.cols.slice(c0, c1), rows: rows.slice(r0, r1).map(x => [x[0], ...x.slice(1 + c0, 1 + c1)]) }, ci: ci - c0, ri: ri - r0, c0, c1, r0, r1, more: c0 > 0 || c1 < nc || r0 > 0 || r1 < rows.length };
}
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
// build the report pack for the chosen sections (ids from REPORT_SECTIONS; none given = the plan's saved choice, else the defaults)
// → { blob, filename, pages, docNo, ids, ms }. Nothing is delivered here: the share sheet (or exportRAMS) hands the blob on.
async function buildReport(o = {}) {
  const t0 = performance.now(); const plan = state.plan;
  const include = Array.isArray(o.include) ? o.include : (Array.isArray(plan.reportInc) ? plan.reportInc : null);
  const want = new Set(include || REPORT_SECTIONS.filter(x => x.def).map(x => x.id));
  progressStep(0.04, 'Loading the pictures…'); await ensureEnvLoaded(plan);
  if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('PDF library did not load');
  const calc = state.calc || computePlan(plan, cranes(), settingsEff()); const S = settingsEff();
  progressStep(0.08, want.has('cover') ? 'Taking the 3D picture…' : 'Checking the lift…'); const shot = want.has('cover') ? ramsShot(calc) : null;
  progressStep(0.16, 'Writing the pages…'); const rp = rpBuild(plan, calc, S, shot, include); const pages = rp.pages;
  let doc;
  if (typeof pdfNew === 'function') doc = pdfNew({ orientation: pages[0].land ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' }); // v10: locked (print only) and fonts embedded
  else {
    doc = new window.jspdf.jsPDF({ orientation: pages[0].land ? 'landscape' : 'portrait', unit: 'mm', format: 'a4', compress: true });
    if (typeof PDF_FONTS !== 'undefined') {
      doc.addFileToVFS('LiberationSans-Regular.ttf', PDF_FONTS.regular); doc.addFont('LiberationSans-Regular.ttf', 'Arial', 'normal');
      doc.addFileToVFS('LiberationSans-Bold.ttf', PDF_FONTS.bold); doc.addFont('LiberationSans-Bold.ttf', 'Arial', 'bold');
    }
  }
  const stage = $('#pdfStage');
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i]; const w = pg.land ? RP_H : RP_W, h = pg.land ? RP_W : RP_H;
    progressStep(0.22 + 0.7 * i / pages.length, `Page ${i + 1} of ${pages.length}…`);
    if (i) doc.addPage('a4', pg.land ? 'landscape' : 'portrait');
    stage.innerHTML = await inlineImages(rpPageSvg(pg)); const el = stage.querySelector('svg'); el.setAttribute('width', String(w)); el.setAttribute('height', String(h));
    await doc.svg(el, { x: 0, y: 0, width: w, height: h });
  }
  stage.innerHTML = '';
  progressStep(0.94, 'Locking and finishing…');
  if (typeof pdfFinish === 'function') pdfFinish(doc, { title: 'RAMS — ' + fileBase(), docNo: rp.docNo, subject: 'Risk assessment and method statement' });
  else doc.setProperties({ title: 'RAMS — ' + fileBase(), subject: 'Risk assessment and method statement', creator: 'FHE Lift Planner ' + APP_VERSION });
  const blob = doc.output('blob'); const ms = Math.round(performance.now() - t0);
  state.lastRams = { ms, bytes: blob.size, pages: pages.length, shot: !!shot, docNo: rp.docNo, ids: rp.ids }; // read by the end-to-end test
  return { blob, filename: fileBase() + ' RAMS.pdf', pages: pages.length, docNo: rp.docNo, ids: rp.ids, ms, shot: !!shot };
}
// the one-tap export: builds the pack with the plan's saved choice of sections and hands the file over
async function exportRAMS() {
  if (!(typeof shareBusy === 'function' && shareBusy())) toast('Building the RAMS pack…');
  try {
    const r = await buildReport({ include: state.plan.reportInc });
    if (typeof deliverFile === 'function') await deliverFile(r.filename, r.blob, { kind: 'rams' }); else await offerFile(r.filename, r.blob);
    toast(`RAMS pack ready — ${r.pages} pages in ${(r.ms / 1000).toFixed(1)} s`);
  } catch (e) { console.error(e); if (typeof shareFail === 'function') shareFail(e); toast('RAMS export failed: ' + e.message); }
}
