// Renders every page of the report pack to out/rp/p<NN>.png (SVG pages straight from rpBuild, no PDF step).
//   node report_shots.js            SAMPLE=n picks a sample plan (default: the start-up plan), ONLY=1,3 picks pages
const { chromium } = require('playwright'); const { routes } = require('./shot_login'); const { pathToFileURL } = require('url'); const path = require('path'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const p = await (await b.newContext({ viewport: { width: 1240, height: 1754 } })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await routes(p); await p.goto(pathToFileURL(path.join(process.cwd(), 'dist', 'v7.html')).href); await p.waitForTimeout(1200);
  await p.evaluate(() => { authSave && authSave('Saad'); });
  await p.evaluate((n) => { if (n != null && typeof SAMPLE_PLANS !== 'undefined') { state.plan = normalizePlan(JSON.parse(JSON.stringify(SAMPLE_PLANS[+n]))); } if (typeof refresh === 'function') refresh(); }, process.env.SAMPLE ?? null);
  await p.waitForTimeout(600);
  const svgs = await p.evaluate(async () => { const S = settingsEff(); const calc = state.calc || computePlan(state.plan, cranes(), S); let shot = null; try { shot = (V7.twin && V7.twin.snapshot) ? await V7.twin.snapshot(1200, 800, true) : null; } catch (e) {}
    const r = rpBuild(state.plan, calc, S, shot, typeof planReportInc === 'function' ? planReportInc() : undefined); return r.pages.map(pg => ({ land: !!pg.land, svg: rpPageSvg(pg) })); });
  const only = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null; fs.mkdirSync('out/rp', { recursive: true });
  for (let i = 0; i < svgs.length; i++) { if (only && !only.includes(i + 1)) continue; const s = svgs[i]; const w = s.land ? 1754 : 1240, h = s.land ? 1240 : 1754;
    const q = await b.newPage({ viewport: { width: w, height: h } }); await q.setContent(`<html><body style="margin:0">${s.svg.replace(/width="[\d.]+mm" height="[\d.]+mm"/, `width="${w}" height="${h}"`)}</body></html>`); await q.waitForTimeout(150);
    await q.screenshot({ path: `out/rp/p${String(i + 1).padStart(2, '0')}.png` }); await q.close(); }
  console.log('pages', svgs.length); console.log('errors', errs); await b.close();
})();
