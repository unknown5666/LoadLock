// RAMS pack layout check without looking at it: the page count, every section heading, text on the page, no overlapping text runs, the page numbers in the
// footers and the contents page matching the pages. Then the same for a pack built with only some sections (fewer pages, contents follows the choice).
//   node rams_check.js [file.pdf]            reads out/rams_e2e.pdf (written by v9_e2e.js) or the file given
//   LL_HTML=build.html node rams_check.js    also builds a partial pack in a headless browser from that bundle (default dist/v7.html) and checks it
//   node rams_check.js a.pdf --partial b.pdf checks b.pdf as the partial pack (built with PARTIAL_IDS) instead of building one
const fs = require('fs'); const path = require('path');
const PARTIAL_IDS = ['doc', 'summary', 'ground', 'risk', 'permit']; // what the partial pack is built with: no cover, no drawings, no rigging
// the heading each section carries (also its name on the contents page) and what else must be on its pages (case-insensitive)
const TITLE = { doc: 'Document control', summary: 'Lift summary', elev: 'Elevation', plan: 'Top view and site plan', tandem: 'Tandem lift', chart: 'Load chart extract', panel: 'Sheet data panel', a1: 'Full A1 sheet, fitted to the page', crane: 'Crane data sheet', ground: 'Outriggers and ground', rigging: 'Rigging and sling schedule', risk: 'Risk assessment', method: 'Method statement', permit: 'Permit to lift', emergency: 'Emergency and rescue plan' };
const NEED = { cover: ['Lifting operation', 'Document no.', 'Controlled copy'], doc: ['Revision history', 'Approval', 'Distribution', 'Contents'], summary: ['Verdict', 'Load build-up'], chart: ['Duty boom'], crane: ['Reference documents'], ground: ['Ground bearing'], rigging: ['Rigging detail and inspection'], risk: ['Risk register', 'Likelihood'], permit: ['Briefing sheet', 'Sign-in'], emergency: ['Stop the lift when', 'Contacts'] };
const REQUIRED = ['cover', 'doc', 'summary', 'elev', 'plan', 'chart', 'panel', 'crane', 'ground', 'rigging', 'risk', 'method', 'permit', 'emergency']; // tandem and a1 are optional

async function readPdf(file) {
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), disableFontFace: true, verbosity: 0 }).promise; const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pg = await doc.getPage(n); const vp = pg.getViewport({ scale: 1 }); const tc = await pg.getTextContent(); await pg.getOperatorList().catch(() => {});
    const fontName = (id) => { try { return pg.commonObjs.has(id) ? pg.commonObjs.get(id).name || '' : ''; } catch (e) { return ''; } };
    const items = tc.items.filter(t => t.str.trim()).map(t => { const [a, b, , d, e, f] = t.transform; const hgt = Math.abs(d) || Math.abs(a); const rot = Math.abs(b) > Math.abs(a) * 0.5;
      const o = rot ? { x0: e - hgt * 0.8, x1: e + hgt * 0.1, y0: b > 0 ? f : f - t.width, y1: b > 0 ? f + t.width : f } : { x0: e, x1: e + t.width, y0: f, y1: f + hgt * 0.72 };
      const fn = fontName(t.fontName); return { s: t.str, ...o, drawing: /helvetica/i.test(fn), wm: /courier/i.test(fn), size: hgt }; }).filter(t => !t.wm); // v11: the diagonal watermark (set in Courier) is not page layout
    pages.push({ n, w: vp.width, h: vp.height, items, text: items.map(t => t.s).join(' ') });
  }
  return pages;
}
function checkLayout(ok, pages, label) {
  for (const pg of pages) {
    const out = pg.items.filter(t => t.x0 < -0.5 || t.x1 > pg.w + 0.5 || t.y0 < -0.5 || t.y1 > pg.h + 0.5);
    ok(!out.length, `${label} page ${pg.n}: all ${pg.items.length} text runs on the page` + (out.length ? ' — off: ' + out.slice(0, 3).map(t => t.s).join(' | ') : ''));
    // overlapping runs of the page layout (the embedded drawings carry their own dimension text, set in Helvetica so it can be told apart)
    const big = pg.items.filter(t => !t.drawing && t.size >= 4 * 0.98); const hits = [];
    for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) { const A = big[i], B = big[j]; const ox = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), oy = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0); if (ox > 1.2 && oy > 1.2) hits.push(`"${A.s.slice(0, 24)}" × "${B.s.slice(0, 24)}"`); }
    ok(!hits.length, `${label} page ${pg.n}: no overlapping text in the page layout` + (hits.length ? ` (${hits.length}): ` + hits.slice(0, 4).join('; ') : ''));
  }
}
// the contents table on the document control page: every "name … page" pair
function contents(pages) {
  const dc = pages.find(p => /revision history/i.test(p.text)); if (!dc) return null; const rows = []; const names = Object.values(TITLE).map(t => t.toLowerCase());
  for (const it of dc.items) { const s = it.s.trim().toLowerCase(); const name = names.includes(s) ? Object.values(TITLE).find(t => t.toLowerCase() === s) : s === 'cover' ? 'Cover' : null; if (!name || it.size > 12) continue; // not the page heading
    const pgNo = dc.items.find(q => Math.abs(q.y0 - it.y0) < 0.8 && q.x0 > it.x1 && /^\d+$/.test(q.s.trim())); if (pgNo) rows.push({ name, page: +pgNo.s.trim() }); }
  return rows;
}
function sectionChecks(ok, pages, ids, label) {
  const lower = pages.map(p => p.text.toLowerCase()); const all = lower.join(' ');
  for (const id of ids) { if (TITLE[id]) ok(pages.some(p => p.items.some(t => t.s.trim().toLowerCase() === TITLE[id].toLowerCase()) || (id === 'a1' && /fitted to the page/i.test(p.text))), `${label}: heading "${TITLE[id]}"`); (NEED[id] || []).forEach(w => ok(all.includes(w.toLowerCase()), `${label}: "${w}"`)); }
  const toc = contents(pages);
  if (ids.includes('doc')) {
    ok(!!toc && toc.length > 0, `${label}: contents page lists ${toc ? toc.length : 0} sections`);
    if (toc) {
      for (const row of toc) { if (row.name === 'Cover') { ok(row.page === 1, `${label}: contents → Cover on page 1`); continue; } const pg = pages[row.page - 1]; ok(!!pg && (pg.items.some(t => t.s.trim().toLowerCase() === row.name.toLowerCase()) || (/^full a1/i.test(row.name) && /fitted to the page/i.test(pg.text))), `${label}: contents says "${row.name}" is on page ${row.page}`); }
      const have = toc.map(r => r.name).filter(n => n !== 'Cover'); const want = ids.filter(i => i !== 'cover' && TITLE[i] && (have.includes(TITLE[i]) || !['tandem', 'a1'].includes(i))).map(i => TITLE[i]);
      const missing = want.filter(n => !have.includes(n)), extra = have.filter(n => !want.includes(n));
      ok(!missing.length && !extra.length, `${label}: contents lists exactly the chosen sections (${have.length})` + (missing.length ? ' — missing: ' + missing.join(', ') : '') + (extra.length ? ' — not chosen: ' + extra.join(', ') : ''));
      ok(ids.includes('cover') === toc.some(r => r.name === 'Cover'), `${label}: the contents lists the cover only when there is one`);
    }
  }
  const dropped = Object.keys(TITLE).filter(i => !ids.includes(i) && i !== 'tandem' && i !== 'a1');
  dropped.forEach(i => ok(!pages.some(p => p.items.some(t => t.s.trim().toLowerCase() === TITLE[i].toLowerCase())), `${label}: "${TITLE[i]}" is not in the pack`));
  const N = pages.length; const bad = pages.filter(p => !new RegExp(`Page ${p.n} of ${N}(?!\\d)`).test(p.text)); ok(!bad.length, `${label}: every page says "Page x of ${N}"` + (bad.length ? ' — wrong on ' + bad.map(p => p.n).join(',') : ''));
}
// a partial pack built in a headless browser from the bundle (needs Playwright)
async function buildPartial(html, ids) {
  const { chromium } = require('playwright'); const { routes } = require('./shot_login'); const { pathToFileURL } = require('url');
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  try {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); await routes(p);
    await p.goto(pathToFileURL(html).href); await p.waitForTimeout(1000); await p.click('.lg-u[data-u="Saad"]'); await p.fill('#lgPass', '786'); await p.click('#lgGo'); await p.waitForTimeout(2500);
    const r = await p.evaluate(async (ids) => { const o = await buildReport({ include: ids }); const u = new Uint8Array(await o.blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return { b64: btoa(s), pages: o.pages, ids: o.ids }; }, ids);
    const file = path.join('out', 'rams_partial.pdf'); fs.mkdirSync('out', { recursive: true }); fs.writeFileSync(file, Buffer.from(r.b64, 'base64')); return { file, pages: r.pages, ids: r.ids };
  } finally { await b.close(); }
}
(async () => {
  const args = process.argv.slice(2); const pi = args.indexOf('--partial'); const partialFile = pi >= 0 ? args[pi + 1] : null; const file = args.find((a, i) => !a.startsWith('--') && i !== (pi >= 0 ? pi + 1 : -1)) || path.join('out', 'rams_e2e.pdf');
  if (!fs.existsSync(file)) { console.log('no PDF at ' + file + ' — run v9_e2e.js first'); process.exit(1); }
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  const pages = await readPdf(file); const N = pages.length; ok(N >= 10, `${N} pages (a normal plan makes 10 or more)`);
  const toc = contents(pages) || []; const ids = [...REQUIRED, ...['tandem', 'a1'].filter(i => toc.some(r => r.name === TITLE[i]))];
  sectionChecks(ok, pages, ids, 'full'); checkLayout(ok, pages, 'full');
  // a pack with only some sections
  let partial = null;
  if (partialFile) partial = { file: partialFile };
  else { const html = process.env.LL_HTML || path.join('dist', 'v7.html'); if (fs.existsSync(html)) { try { partial = await buildPartial(path.resolve(html), PARTIAL_IDS); } catch (e) { ok(false, 'could not build the partial pack: ' + String(e.message).split('\n')[0]); } } else console.log('SKIP partial pack: no bundle at ' + html + ' (set LL_HTML)'); }
  if (partial) {
    const pp = await readPdf(partial.file); ok(pp.length < N, `partial pack (${PARTIAL_IDS.join(', ')}): ${pp.length} pages, fewer than the full pack's ${N}`);
    ok(!/lifting operation/i.test(pp[0].text), 'partial pack: no cover page when the cover is not chosen'); sectionChecks(ok, pp, PARTIAL_IDS, 'partial'); checkLayout(ok, pp, 'partial');
  }
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
