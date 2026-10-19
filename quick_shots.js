const { chromium } = require('playwright'); const routes = require('./shot_login').routes;
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  for (const [W, H, mob] of [[1440, 900, false], [390, 844, true]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob, deviceScaleFactor: mob ? 2 : 1, colorScheme: 'dark' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await routes(p); await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(1000);
    await p.evaluate(() => { authSave(false); localStorage.setItem('lp.toured', 'true'); }); await p.reload(); await p.waitForTimeout(2500);
    for (const sec of (process.env.SECS || 'crane,lift,site,weather,sheet,job').split(',')) { await p.evaluate((s) => setSection(s), sec); await p.waitForTimeout(500); await p.screenshot({ path: `out/q_${W}_${sec}.png` }); }
    console.log(W, errs, await p.evaluate(() => document.documentElement.scrollWidth));
    await ctx.close();
  }
  await b.close();
})();
