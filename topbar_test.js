const { chromium } = require('playwright'); const routes = require('./shot_login').routes;
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  for (const [W, H] of [[1024, 768], [1180, 820], [1280, 800], [1366, 768], [1440, 900], [1600, 900]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, colorScheme: 'dark' }); const p = await ctx.newPage();
    await routes(p); await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(1000);
    await p.evaluate(() => { authSave(false); localStorage.setItem('lp.toured', 'true'); }); await p.reload(); await p.waitForTimeout(2500);
    await p.screenshot({ path: `out/top_${W}.png`, clip: { x: 0, y: 0, width: W, height: 60 } });
    console.log(W, await p.evaluate(() => { const r = document.querySelector('#planName').getBoundingClientRect(); return [Math.round(r.width), document.documentElement.scrollWidth]; }));
    await ctx.close();
  }
  await b.close();
})();
