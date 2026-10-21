// v7 screenshots + smoke checks. W/H set the viewport, SCHEME=light|dark, STEPS=comma list of steps to run.
// node v7_shot.js            -> 1440x900
// W=390 H=844 node v7_shot.js
const { chromium } = require('playwright'); const { routes } = require('./shot_login'); const { pathToFileURL } = require('url'); const path = require('path');
(async () => {
  const W = +(process.env.W || 1440), H = +(process.env.H || 900), S = process.env.SCHEME || 'light', tag = `${W}${S === 'dark' ? 'd' : ''}`;
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const mobile = W < 900;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, colorScheme: S, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await routes(p);
  const url = pathToFileURL(path.join(process.cwd(), 'dist', 'v7.html')).href;
  await p.goto(url); await p.waitForTimeout(1500);
  const steps = (process.env.STEPS || 'login,main,dial,crane,side,load,site,print,checks,more,plan,3d,sheet,plans,fleet,settings').split(',');
  const shot = async (n) => { await p.waitForTimeout(650); await p.screenshot({ path: `out/v7_${tag}_${n}.png` }); };
  if (steps.includes('login')) await shot('login');
  // sign in as Saeed / 911
  await p.click('.lg-u[data-u="Saeed"]'); await p.fill('#lgPass', '000'); await p.click('#lgGo'); await p.waitForTimeout(400);
  const wrong = await p.textContent('#lgErr'); console.log('wrong code ->', wrong);
  await p.fill('#lgPass', '911'); await p.click('#lgGo'); await p.waitForTimeout(3200);
  console.log('user', await p.evaluate(() => authUser()));
  await p.evaluate(() => { LS.set('lp.coach7', true); document.getElementById('coach')?.remove(); V7.coach = null; });
  if (steps.includes('main')) await shot('main');
  const open = async (sel, n) => { if (!steps.includes(n)) return; await p.click(sel); await shot(n); await p.evaluate(() => closeSheet(true)); await p.waitForTimeout(200); };
  await open('[data-act="dial"][data-k="R"]', 'dial');
  await open('.dk[data-act="crane"], .tb-btn[data-act="crane"]', 'crane');
  await open('.dk[data-act="side"], .tb-btn[data-act="side"]', 'side');
  await open('.dk[data-act="load"], .tb-btn[data-act="load"]', 'load');
  await open('.dk[data-act="site"], .tb-btn[data-act="site"]', 'site');
  await open('.dk[data-act="print"], .tb-btn[data-act="print"]', 'print');
  await open('#stCard', 'checks');
  await open('.dk[data-act="more"], .tb-btn[data-act="more"]', 'more');
  for (const v of ['plan', '3d', 'sheet']) if (steps.includes(v)) { await p.click(`[data-act="view"][data-v="${v}"]`); await p.waitForTimeout(v === '3d' ? 2500 : 600); await shot(v); }
  await p.click('[data-act="view"][data-v="elev"]');
  for (const pg of ['plans', 'fleet', 'settings']) if (steps.includes(pg)) { await p.evaluate((g) => openPage(g), pg); await shot(pg); await p.evaluate(() => closePage()); await p.waitForTimeout(300); }
  const hs = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  console.log('scrollW/clientW', hs);
  console.log('errors', errs); await b.close();
})();
