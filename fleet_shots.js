const { chromium } = require('playwright'); const routes = require('./shot_login').routes;
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await routes(p); await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(800);
  await p.evaluate(() => { authSave(false); localStorage.setItem('lp.toured', 'true'); }); await p.reload(); await p.waitForTimeout(2500);
  const ids = await p.evaluate(() => cranes().map(c => [c.id, c.make + ' ' + c.model, c.drawing || '']));
  console.log(JSON.stringify(ids));
  const only = (process.env.ONLY || '').split(',').filter(Boolean);
  for (const [id] of ids) {
    if (only.length && !only.includes(id)) continue;
    await p.evaluate((id) => { setCrane(id); $('#work').classList.add('dr-off'); setCanvasTheme && 0; Scene.dark = false; refresh(true); Scene.views = {}; sceneFit(); sceneDirty(); }, id);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `out/fl_${id}.png`, clip: { x: 64, y: 52, width: 1110, height: 668 } });
  }
  console.log(errs); await b.close();
})();
