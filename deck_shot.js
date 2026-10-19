const { chromium } = require('playwright'); const routes = require('./shot_login').routes;
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const W = +(process.env.W || 1440), H = +(process.env.H || 900), mob = W < 700;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob, deviceScaleFactor: mob ? 2 : 1, colorScheme: 'dark' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await routes(p); await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(1000);
  await p.evaluate(() => { authSave(false); localStorage.setItem('lp.toured', 'true'); localStorage.removeItem('lp.draft'); }); await p.reload(); await p.waitForTimeout(2800);
  await p.screenshot({ path: `out/dk_${W}_a.png` });
  for (const k of (process.env.POPS || 'tackles,crane').split(',').filter(Boolean)) {
    await p.click(`#console [data-dk="pop"][data-v="${k}"]`); await p.waitForTimeout(500);
    if (k === 'tackles') { await p.click('#dkPop [data-dk="tkAdd"]'); await p.waitForTimeout(300); await p.click('#dkPop [data-dk="tkAdd"]'); await p.waitForTimeout(300); }
    await p.screenshot({ path: `out/dk_${W}_${k}.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  }
  // type values in dials
  await p.fill('.dl-in[data-dial="R"]', '24'); await p.press('.dl-in[data-dial="R"]', 'Enter'); await p.waitForTimeout(400);
  await p.fill('.dl-in[data-dial="L"]', '50'); await p.press('.dl-in[data-dial="L"]', 'Enter'); await p.waitForTimeout(400);
  await p.click('#console [data-dk="secs"]'); await p.waitForTimeout(400);
  await p.screenshot({ path: `out/dk_${W}_b.png` });
  console.log(await p.evaluate(() => { const r = state.calc.loads[activeLi()]; return [r.R, r.tele.L, r.geo.theta.toFixed(1), r.tipY, r.util]; }));
  await p.click('#console [data-dk="empty"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `out/dk_${W}_c.png` });
  console.log('errors', errs); await b.close();
})();
