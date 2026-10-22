// RAMS PDF layout check without looking at it: every text run must sit on the A4 page, the required sections must be there, and no two
// text runs may overlap (a sign of a crowded layout). Reads out/rams_e2e.pdf (written by v9_e2e.js) or the file given.
//   node rams_check.js [file.pdf]
const fs = require('fs'); const path = require('path');
(async () => {
  const file = process.argv[2] || path.join('out', 'rams_e2e.pdf'); if (!fs.existsSync(file)) { console.log('no PDF at ' + file + ' — run v9_e2e.js first'); process.exit(1); }
  const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), disableFontFace: true, verbosity: 0 }).promise;
  let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  ok(doc.numPages === 2, `${doc.numPages} pages`);
  const need = [['LIFTING PLAN', 'ELEVATION', 'TOP VIEW', '3D VIEW', 'LOAD & RIGGING', 'Appointed Person'], ['OUTRIGGER REACTIONS', 'GROUND BEARING', 'LOAD CHART', 'RISK ASSESSMENT', 'METHOD STATEMENT', 'SIGN-OFF', 'Crane operator']];
  for (let n = 1; n <= doc.numPages; n++) {
    const pg = await doc.getPage(n); const vp = pg.getViewport({ scale: 1 }); const tc = await pg.getTextContent();
    const items = tc.items.filter(t => t.str.trim()).map(t => { const [a, , , d, e, f] = t.transform; const hgt = Math.abs(d) || Math.abs(a); return { s: t.str, x0: e, x1: e + t.width, y0: f, y1: f + hgt * 0.72 }; });
    const all = items.map(t => t.s).join(' ');
    for (const w of need[n - 1] || []) ok(all.includes(w), `page ${n}: "${w}"`);
    const out = items.filter(t => t.x0 < -0.5 || t.x1 > vp.width + 0.5 || t.y0 < -0.5 || t.y1 > vp.height + 0.5);
    ok(!out.length, `page ${n}: all ${items.length} text runs on the page` + (out.length ? ' — off: ' + out.slice(0, 3).map(t => t.s).join(' | ') : ''));
    // overlapping text runs from the page frame (the A1 drawings scaled into boxes carry their own dimension text — skip runs smaller than 4 pt)
    const big = items.filter(t => t.y1 - t.y0 >= 4 * 0.72 * 0.98);
    const hits = []; for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) { const A = big[i], B = big[j]; const ox = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), oy = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0); if (ox > 1.2 && oy > 1.2) hits.push(`"${A.s.slice(0, 24)}" × "${B.s.slice(0, 24)}"`); }
    ok(!hits.length, `page ${n}: no overlapping text in the page layout` + (hits.length ? ` (${hits.length}): ` + hits.slice(0, 4).join('; ') : ''));
  }
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
