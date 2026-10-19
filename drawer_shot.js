const { chromium } = require('playwright'); const routes = require('./shot_login').routes;
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const W = +(process.env.W || 1440), H = +(process.env.H || 900), mob = W < 700;
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob, deviceScaleFactor: mob ? 2 : 1, colorScheme: 'dark' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await routes(p); await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(1000);
  await p.evaluate(() => { authSave(false); localStorage.setItem('lp.toured', 'true'); localStorage.removeItem('lp.draft'); }); await p.reload(); await p.waitForTimeout(2800);
  // hover the radius dial → help line
  await p.hover('.dial[data-dial="R"] .dl-in'); await p.waitForTimeout(250);
  console.log('help', await p.textContent('#dkHelpT'));
  // Lift drawer
  await p.click('#rail [data-sec="lift"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `out/dr_${W}_lift1.png` });
  await p.click('#drBody [data-dk="tkAdd"]'); await p.waitForTimeout(300); await p.click('#drBody [data-dk="tkAdd"]'); await p.waitForTimeout(300);
  await p.fill('#drBody .tk-name >> nth=1', 'Main sling 6m'); await p.press('#drBody .tk-name >> nth=1', 'Tab'); await p.waitForTimeout(300);
  await p.fill('#posH', '40'); await p.press('#posH', 'Enter'); await p.waitForTimeout(400);
  console.log('height mode', await p.evaluate(() => { const l = state.plan.loads[activeLi()], r = state.calc.loads[activeLi()]; return [l.by, l.tipH, r.tipY, r.R]; }));
  await p.evaluate(() => { const g = [...document.querySelectorAll('#drBody .grp')].find(x => /tackles/i.test(x.textContent)); g?.scrollIntoView(); });
  await p.waitForTimeout(300); await p.screenshot({ path: `out/dr_${W}_lift2.png` });
  await p.check('#f-loads\\.0\\.daf\\.on'); await p.waitForTimeout(500);
  await p.evaluate(() => { const g = [...document.querySelectorAll('#drBody .grp')].find(x => /DAF/.test(x.textContent)); g?.scrollIntoView(); });
  await p.waitForTimeout(300); await p.screenshot({ path: `out/dr_${W}_lift3.png` });
  console.log('daf', await p.evaluate(() => { const r = state.calc.loads[activeLi()]; return [r.daf, r.design, r.total]; }));
  // Crane drawer + add crane
  await p.click('#rail [data-sec="crane"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `out/dr_${W}_crane.png` });
  // Sheet drawer
  await p.click('#rail [data-sec="sheet"]'); await p.waitForTimeout(500);
  await p.click('.sr-chip:has([data-sr="load.angle"])'); await p.waitForTimeout(300);
  await p.click('#drBody [data-act="srAdd"]'); await p.waitForTimeout(300);
  await p.fill('.sr-row input >> nth=0', 'Permit no.'); await p.fill('.sr-row input >> nth=1', 'PTW-0193'); await p.press('.sr-row input >> nth=1', 'Tab'); await p.waitForTimeout(300);
  await p.screenshot({ path: `out/dr_${W}_sheet.png` });
  console.log('sheetRows', JSON.stringify(await p.evaluate(() => state.plan.sheetRows)));
  console.log('errors', errs); await b.close();
})();
