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
  const b64 = await p.evaluate(async () => { const r = await buildReport({ include: process_inc() }); const buf = await r.blob.arrayBuffer(); let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s);
    function process_inc() { return typeof reportIncOf === 'function' ? reportIncOf() : undefined; } });
  fs.writeFileSync(process.env.OUT || 'out/report.pdf', Buffer.from(b64, 'base64')); console.log('written', process.env.OUT || 'out/report.pdf');
  console.log('errors', errs); await b.close();
})();
