// Browser check of the lift-side work in the real app (dist/index.html): live site plan + 3D twin for each side, and the carrier / boom drag rules.
//   python build.py && node side_e2e.js     -> out/side_e2e_{plan,3d}_{rear,left,right}.png, exits non-zero on a failed assertion
const { chromium } = require('playwright'); const routes = require('./shot_login').routes; const { pathToFileURL } = require('url'); const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } else console.log('ok  ', m); };
  await routes(p); await p.goto(pathToFileURL(path.resolve('dist/index.html')).href); await p.waitForTimeout(800);
  await p.evaluate(() => { authSave(false); localStorage.setItem('lp.toured', 'true'); }); await p.reload(); await p.waitForTimeout(2500);
  await p.evaluate(() => { const pl = normalizePlan(SAMPLE_PLANS[0].make()); pl.sitePlan = { enabled: true, cx: 0, cy: 0, rot: 35, carrierRot: '' }; openPlan(pl, 'crane'); });
  await p.click('#vsw [data-view="plan"]'); await p.waitForTimeout(600);
  for (const side of ['rear', 'left', 'right']) {
    await p.evaluate((s) => { state.plan.loads[0].side = s; refresh(true); sceneFit(); sceneDirty(); }, side); await p.waitForTimeout(500);
    const hd = await p.evaluate(() => { const sp = sitePlanState(state.plan); return [sp.boom, sp.carrier, sp.side]; });
    const wantC = { rear: 215, left: 305, right: 125 }[side];
    ok(hd[0] === 35 && hd[1] === wantC && hd[2] === side, `${side}: boom 35, carrier ${wantC} (got ${JSON.stringify(hd)})`);
    await p.screenshot({ path: `out/side_e2e_plan_${side}.png` });
  }
  // drag the load handle: with side = left the carrier must turn so that boom = carrier + 90
  await p.evaluate(() => { state.plan.loads[0].side = 'left'; state.plan.sitePlan.carrierRot = ''; state.plan.sitePlan.rot = 35; refresh(true); sceneFit(); sceneDirty(); }); await p.waitForTimeout(500);
  const g = await p.locator('[data-h="pload"] path, [data-h="pload"] circle').last().boundingBox();
  const from = { x: g.x + g.width / 2, y: g.y + g.height / 2 };
  const c0 = await p.evaluate(() => { const v = sceneView(); const sp = sitePlanState(state.plan); const r = Scene.host.getBoundingClientRect(); return { x: r.left + (sp.cx - v.x0) * v.ppm, y: r.top + (v.y1 - sp.cy) * v.ppm }; });
  const R = Math.hypot(from.x - c0.x, from.y - c0.y); const ang = 120 * Math.PI / 180;               // drag the load to heading 120 deg
  await p.mouse.move(from.x, from.y); await p.mouse.down(); await p.mouse.move(c0.x + R * Math.cos(ang), c0.y - R * Math.sin(ang), { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
  const d1 = await p.evaluate(() => ({ sp: { ...state.plan.sitePlan }, boom: sitePlanState(state.plan).boom, carrier: sitePlanState(state.plan).carrier }));
  ok(Math.abs(d1.sp.rot - 120) <= 2, 'load drag: boom heading follows the pointer (' + d1.sp.rot + ')');
  ok(Math.abs(((d1.sp.carrierRot - (d1.sp.rot - 90)) % 360 + 540) % 360 - 180) <= 1, 'load drag: carrierRot = drag angle - 90 for a left lift (' + d1.sp.carrierRot + ')');
  // drag the cab-end handle: carrier turns, boom stays carrier + 90
  const gc = await p.locator('[data-h="pcar"] rect').last().boundingBox(); const fc = { x: gc.x + gc.width / 2, y: gc.y + gc.height / 2 };
  await p.mouse.move(fc.x, fc.y); await p.mouse.down(); await p.mouse.move(c0.x + 150, c0.y, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
  const d2 = await p.evaluate(() => ({ sp: { ...state.plan.sitePlan }, boom: sitePlanState(state.plan).boom, carrier: sitePlanState(state.plan).carrier }));
  ok(Math.abs(d2.carrier - 0) <= 2 || Math.abs(d2.carrier - 360) <= 2, 'cab handle: carrier heading follows the pointer (' + d2.carrier + ')');
  ok(Math.abs(d2.boom - 90) <= 2, 'cab handle: boom stays carrier + 90 (' + d2.boom + ')');
  // 3D twin for each side
  await p.click('#vsw [data-view="3d"]'); await p.waitForTimeout(2500);
  for (const side of ['rear', 'left', 'right']) {
    await p.evaluate((s) => { state.plan.loads[0].side = s; state.plan.sitePlan.carrierRot = ''; state.plan.sitePlan.rot = 35; refresh(true); state.twin && state.twin.reframe(); }, side); await p.waitForTimeout(1800);
    await p.screenshot({ path: `out/side_e2e_3d_${side}.png` });
  }
  console.log('page errors', errs); if (errs.length) bad++;
  await b.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
