const { chromium } = require('playwright'); const routes = require('./shot_login').routes;
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await routes(p); await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(800);
  await p.evaluate(() => { authSave(false); localStorage.setItem('lp.toured', 'true'); }); await p.reload(); await p.waitForTimeout(2500);
  if (process.env.SAMPLE) await p.evaluate((i) => openPlan(normalizePlan(SAMPLE_PLANS[+i].make()), 'crane'), process.env.SAMPLE);
  if (process.env.EXTRAS) await p.evaluate(() => { const l = state.plan.loads[0]; l.tackles = [{ name: '25t bow shackle', type: 'shackle', L: 0.4, w: 0.05 }, { name: '4-leg chain sling 6m', type: 'sling', L: 6, w: 0.35, legs: 4 }]; l.daf = { on: true, mode: 'auto', cls: 'HC2', vh: 0.15 }; state.plan.sheetRows = { hide: { 'load.sf': true }, show: { 'load.angle': true, 'load.tipH': true }, custom: [{ label: 'Permit no.', value: 'PTW-0193', sec: 'load', load: '' }, { label: 'Banksman', value: 'Radio ch. 4', sec: 'extra', load: '' }] }; refresh(true); });
  await p.waitForTimeout(500);
  const svg = await p.evaluate(async () => { await ensureEnvLoaded(state.plan); const { P } = currentSheet(); return await inlineImages(toSVG(P)); });
  require('fs').writeFileSync('out/sheet.svg', svg);
  const W = +(process.env.PW || 3364);
  const p2 = await ctx.newPage(); await p2.setViewportSize({ width: W, height: Math.round(W * 594 / 841) });
  await p2.setContent(`<html><body style="margin:0;background:#fff">${svg.replace('<svg', `<svg style="width:${W}px;height:auto;display:block"`)}</body></html>`); await p2.waitForTimeout(1500);
  await p2.screenshot({ path: 'out/sheet.png' });
  console.log(errs); await b.close();
})();
