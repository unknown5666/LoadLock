// 3D screenshots of fleet cranes (v11 look): out/v11_3d_<id>[_cab].png.  ONLY=ltm1250,stc500  W/H set the size
const { chromium } = require('playwright'); const { routes } = require('./shot_login'); const { pathToFileURL } = require('url'); const path = require('path');
(async () => {
  const W = +(process.env.W || 1440), H = +(process.env.H || 900), mobile = W < 900;
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: mobile, isMobile: mobile })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await routes(p); await p.goto(pathToFileURL(path.join(process.cwd(), 'dist', 'v7.html')).href); await p.waitForTimeout(1500);
  await p.click('.lg-u[data-u="Saeed"]'); await p.fill('#lgPass', '911'); await p.click('#lgGo'); await p.waitForTimeout(3200);
  await p.evaluate(() => { LS.set('lp.coach7', true); LS.set('lp.new11', true); document.getElementById('coach')?.remove(); V7.coach = null; LS.set('lp.cabSeen', true); });
  await p.click('[data-act="view"][data-v="3d"]'); await p.waitForTimeout(2000);
  const ids = (process.env.ONLY || 'ltm1250,ltm1500,stc500,ac700,ztc1000v,ltm1650').split(',');
  for (const id of ids) {
    await p.evaluate((id) => { setCrane(id); commit({ sheet: true }); if (typeof applyDuty === 'function') applyDuty({ quiet: true }); state.twin?.view('iso'); state.twin?.reframe(); twinUpdate(); }, id); await p.waitForTimeout(2200);
    await p.screenshot({ path: `out/v11_3d_${id}.png` });
    if (!process.env.NOCAB) { await p.evaluate(() => { state.twin?.view('cab'); renderFloats(); }); await p.waitForTimeout(1200); await p.screenshot({ path: `out/v11_3d_${id}_cab.png` }); await p.evaluate(() => { state.twin?.view('iso'); renderFloats(); }); }
    if (process.env.SIDE) { await p.evaluate(() => { state.twin?.view('side'); }); await p.waitForTimeout(1500); await p.screenshot({ path: `out/v11_3d_${id}_side.png` }); }
  }
  console.log('stats', JSON.stringify(await p.evaluate(() => state.twin?.stats?.())));
  console.log('errors', errs); await b.close();
})();
