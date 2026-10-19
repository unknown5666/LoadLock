const { chromium } = require('playwright'); const routes = require('./shot_login').routes;
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  for (const [W, H] of [[1920, 1080], [1366, 768], [1024, 768]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, colorScheme: 'dark' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await routes(p); await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(9500);
    await p.screenshot({ path: `out/s_login_${W}.png` });
    await p.evaluate(() => { authSave(false); }); await p.reload(); await p.waitForTimeout(2500);
    await p.screenshot({ path: `out/s_studio_${W}.png` });
    await p.evaluate(() => setView('plan')); await p.waitForTimeout(600); await p.screenshot({ path: `out/s_plan_${W}.png` });
    await p.evaluate(() => setView('3d')); await p.waitForTimeout(2500); await p.screenshot({ path: `out/s_3d_${W}.png` });
    console.log(W, 'scroll', await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]), errs);
    await ctx.close();
  }
  await b.close();
})();
