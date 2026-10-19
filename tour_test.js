const { chromium } = require('playwright'); const routes = require('./shot_login').routes;
(async () => {
  const W = +(process.env.W || 1440), H = +(process.env.H || 900);
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, colorScheme: 'dark', hasTouch: W < 700, isMobile: W < 700, deviceScaleFactor: W < 700 ? 2 : 1 }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await routes(p); await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(1200);
  await p.evaluate(() => { authSave(false); try { localStorage.removeItem('lp.toured'); } catch {} }); await p.reload(); await p.waitForTimeout(3500);
  await p.screenshot({ path: `out/tour_${W}_invite.png` });
  console.log('invite', await p.isVisible('#tourInvite'));
  const before = await p.evaluate(() => state.plan.name);
  await p.click('[data-tinv="go"]'); await p.waitForTimeout(700);
  const shot = async (n) => { await p.waitForTimeout(650); await p.screenshot({ path: `out/tour_${W}_${String(n).padStart(2, '0')}.png` }); };
  await shot(0);
  for (let i = 1; i <= 20; i++) {
    const nextDisabled = await p.evaluate(() => document.getElementById('tNext').disabled);
    const step = await p.evaluate(() => Tour.i);
    if (nextDisabled) {
      // do the task like a user would
      if (step === 4) { const r = await p.locator('#conRange').boundingBox(); await p.mouse.move(r.x + r.width * 0.5, r.y + r.height / 2); await p.mouse.down(); await p.mouse.move(r.x + r.width * 0.85, r.y + r.height / 2, { steps: 6 }); await p.mouse.up(); }
      else if (step === 5) { const t = await p.locator('.dl-rg[data-dial="L"]').boundingBox(); await p.mouse.move(t.x + t.width * 0.4, t.y + t.height / 2); await p.mouse.down(); await p.mouse.move(t.x + t.width * 0.75, t.y + t.height / 2, { steps: 6 }); await p.mouse.up(); }
      else if (step === 8) { await shot('08_challenge'); await p.fill('.dl-in[data-dial="L"]', '35'); await p.press('.dl-in[data-dial="L"]', 'Enter'); await p.waitForTimeout(300); const r = await p.locator('#conRange').boundingBox(); await p.mouse.move(r.x + r.width * 0.85, r.y + r.height / 2); await p.mouse.down(); await p.mouse.move(r.x + r.width * 0.35, r.y + r.height / 2, { steps: 6 }); await p.waitForTimeout(500); await shot('08_held'); await p.mouse.up(); }
      else if (step === 10) { await p.click('#addMenu > summary'); await p.waitForTimeout(400); await shot('10b'); await p.click('#addMenu .menu-pop [data-type="container"]'); }
      else if (step === 12) { if (W < 700) await p.selectOption('#mvSw', '3d'); else await p.click('#vsw [data-view="3d"]'); }
      await p.waitForTimeout(600); await shot(`${step}_done`); await p.waitForTimeout(1300);
      console.log('task step', step, '->', await p.evaluate(() => Tour.i));
    } else { await shot(step); await p.click('#tNext'); }
    await p.waitForTimeout(400);
    if (await p.evaluate(() => TOUR_STEPS[Tour.i].finale)) break;
  }
  await shot('finale'); await p.waitForTimeout(1200); await shot('finale2');
  console.log('finale step', await p.evaluate(() => [Tour.i, Tour.on]));
  await p.click('#tour [data-tact="restore"]'); await p.waitForTimeout(800);
  console.log('restored', before, '=>', await p.evaluate(() => [state.plan.name, Tour.on, state.tour]));
  await p.screenshot({ path: `out/tour_${W}_after.png` });
  console.log('errors', errs); await b.close();
})();
