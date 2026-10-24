// Builds the real report PDF in the app (buildReport → svg2pdf → jsPDF) and writes out/report.pdf; then: python3 tools/pdf_png.py out/report.pdf
const { chromium } = require('playwright'); const { routes } = require('./shot_login'); const { pathToFileURL } = require('url'); const path = require('path'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await routes(p); await p.goto(pathToFileURL(path.join(process.cwd(), process.env.HTML || 'dist/v7.html')).href); await p.waitForTimeout(1500);
  await p.evaluate(() => { try { authSave('Saad'); } catch (e) {} try { if (typeof enterApp === 'function') enterApp(); } catch (e) {} });
  await p.waitForTimeout(800);
  if (process.env.SAMPLE) await p.evaluate((n) => { state.plan = normalizePlan(JSON.parse(JSON.stringify(SAMPLE_PLANS[+n]))); refresh(); }, process.env.SAMPLE);
  // fill the documentation the way a planner would (DOCS=0 leaves it empty)
  if (process.env.DOCS !== '0') await p.evaluate(() => { if (typeof DOC_FIELDS === 'undefined') return; const ex = { 'meta.drawnBy': 'Saad Khan', 'meta.checkedBy': 'Habib Rahman', 'docs.apPhone': '050 123 4567', 'docs.approver': 'R. Menon, Hashim Contracting', 'docs.supervisor': 'Imran Ali', 'docs.supervisorPhone': '050 222 3344', 'docs.operator': 'Saeed Khan', 'docs.operatorCard': 'TPC 448812, valid to 03/2027', 'docs.slinger': 'Rajesh Kumar', 'docs.slingerCard': 'TPC 556120', 'docs.siteManager': 'Ahmed Saleh', 'docs.siteManagerPhone': '050 777 1200', 'docs.safety': 'Joseph Mathew', 'docs.safetyPhone': '050 888 3100', 'meta.client': 'Hashim Contracting', 'docs.clientRep': 'R. Menon', 'docs.clientPhone': '050 333 9090', 'meta.project': 'Al Deem School', 'docs.address': 'Plot 14, Al Shamkha, Abu Dhabi', 'meta.date': '15/10/2026', 'docs.time': '07:00 – 11:00', 'docs.siteContact': 'Ahmed Saleh', 'docs.sitePhone': '050 777 1200', 'docs.craneReg': 'FHE-07 · AD 44812', 'docs.craneSerial': '095 112 4410', 'docs.tpiCert': 'TUV-AD-2026-1182', 'docs.tpiExpiry': '30/06/2027', 'docs.lmiTest': '02/09/2026', 'outrigger.allow': 25, 'docs.groundRef': 'GI-2026-031, 12/08/2026', 'matSize': '2.5x2.5m', 'docs.muster': 'Gate 2 car park', 'docs.firstAider': 'Joseph Mathew, 050 888 3100', 'docs.hospital': 'Al Rahba Hospital, 9 km', 'docs.ambulance': 'Gate 2, then the site road east' };
    for (const f of DOC_FIELDS) setP(state.plan, f.k, ex[f.k] ?? 'x'); commit(); });
  const b64 = await p.evaluate(async () => { const r = await buildReport({ include: process_inc() }); const buf = await r.blob.arrayBuffer(); let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s);
    function process_inc() { return typeof reportIncOf === 'function' ? reportIncOf() : undefined; } });
  fs.writeFileSync(process.env.OUT || 'out/report.pdf', Buffer.from(b64, 'base64')); console.log('written', process.env.OUT || 'out/report.pdf');
  console.log('errors', errs); await b.close();
})();
