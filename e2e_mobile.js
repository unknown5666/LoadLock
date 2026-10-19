const { chromium } = require('playwright'); const routes = require('./shot_login').routes;
(async () => {
  const W = +(process.env.W || 390), H = +(process.env.H || 844);
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: 'dark' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await routes(p); await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(4000);
  await p.screenshot({ path: `out/m_login_${W}.png` });
  const sw = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); console.log('login scrollW', sw);
  await p.fill('#lgPass', '12911'); await p.press('#lgPass', 'Enter'); await p.waitForTimeout(3500);
  await p.screenshot({ path: `out/m_studio_${W}.png` });
  console.log('studio scrollW', await p.evaluate(() => [document.documentElement.scrollWidth, document.body.scrollWidth, innerWidth]));
  await p.tap('.ri[data-sec="crane"]'); await p.waitForTimeout(600); await p.screenshot({ path: `out/m_crane_${W}.png` });
  await p.click('[data-act="drClose"]'); await p.waitForTimeout(500);
  await p.selectOption('#mvSw', '3d'); await p.waitForTimeout(2500); await p.screenshot({ path: `out/m_3d_${W}.png` });
  await p.selectOption('#mvSw', 'sheet'); await p.waitForTimeout(800); await p.screenshot({ path: `out/m_sheet_${W}.png` });
  await p.tap('[data-act="inspTg"]'); await p.waitForTimeout(500); await p.screenshot({ path: `out/m_insp_${W}.png` });
  console.log('errors', errs); await b.close();
})();
