// v7 end-to-end: real clicks, real assertions. Exits non-zero on the first failure.
// node v7_e2e.js   (W=390 H=844 for the phone layout)
const { chromium } = require('playwright'); const { routes } = require('./shot_login'); const { pathToFileURL } = require('url'); const path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const W = +(process.env.W || 1440), H = +(process.env.H || 900); const mobile = W < 900;
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mobile, isMobile: mobile, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await routes(p); await p.goto(pathToFileURL(path.join(process.cwd(), 'dist', 'v7.html')).href); await p.waitForTimeout(1200);
  const ev = (f, a) => p.evaluate(f, a);

  // sign-in: all three users, wrong code refused
  for (const [u, c] of [['Habib', '12911'], ['Saad', '786'], ['Saeed', '911']]) ok(await ev(([u, c]) => authCheck(u, c), [u, c]), `login ${u}`);
  ok(!(await ev(() => authCheck('Saad', '911'))), 'wrong code refused');
  await p.click('.lg-u[data-u="Saad"]'); await p.fill('#lgPass', '786'); await p.click('#lgGo'); await p.waitForTimeout(3000);
  ok(await ev(() => !document.body.classList.contains('locked') && authUser() === 'Saad'), 'signed in as Saad');
  await ev(() => { LS.set('lp.coach7', true); document.getElementById('coach')?.remove(); });

  // reach dial: + button moves the radius by 0.5 m, typed value sticks
  const R0 = await ev(() => state.calc.loads[0].R);
  await p.click('[data-act="dial"][data-k="R"]'); await p.waitForTimeout(500);
  await p.click('[data-sa="step"][data-d="1"]'); await p.waitForTimeout(500);
  const R1 = await ev(() => state.calc.loads[0].R); ok(Math.abs(R1 - R0 - 0.5) < 0.01, `reach + step ${R0} -> ${R1}`);
  await p.fill('#dialIn', '20'); await p.press('#dialIn', 'Enter'); await p.waitForTimeout(300);
  ok(Math.abs(await ev(() => state.calc.loads[0].R) - 20) < 0.01, 'typed reach 20 m');
  ok((await p.textContent('#tvR')).startsWith('20.0'), 'reach tile shows 20.0');
  await ev(() => closeSheet(true));

  // weight: heavier load raises utilisation
  const u0 = await ev(() => state.calc.loads[0].util);
  await p.click('#wtBtn'); await p.waitForTimeout(400); await p.fill('#dialIn', '18'); await p.press('#dialIn', 'Enter'); await p.waitForTimeout(300);
  const u1 = await ev(() => state.calc.loads[0].util); ok(u1 > u0, `weight 18 t raises use ${u0?.toFixed(1)} -> ${u1?.toFixed(1)}%`);
  await ev(() => closeSheet(true));

  // undo brings the weight back
  await p.waitForTimeout(600); await ev(() => histGo(-1)); await p.waitForTimeout(200);
  ok(await ev(() => state.plan.loads[0].w) !== 18, 'undo reverted the weight');
  await ev(() => histGo(1)); ok(await ev(() => state.plan.loads[0].w) === 18, 'redo re-applied it');

  // lift side
  await p.click('.dk[data-act="side"]'); await p.waitForTimeout(400);
  await p.click('.side-btns [data-v="left"]'); await p.waitForTimeout(300);
  ok(await ev(() => state.plan.loads[0].side) === 'left', 'side set to left');
  ok(await ev(() => !document.querySelector('[data-sa="side"][data-v="front"]')), 'front cannot be picked');
  await p.click('.side-btns [data-v="rear"]'); await p.waitForTimeout(300); await ev(() => closeSheet(true));

  // site: add a building, gap shown, delete it
  const n0 = await ev(() => state.plan.site.obstacles.length);
  await p.click('.dk[data-act="site"]'); await p.waitForTimeout(400); await p.click('[data-sa="addObj"][data-type="building"]'); await p.waitForTimeout(400);
  ok(await ev(() => state.plan.site.obstacles.length) === n0 + 1, 'building added');
  ok(await ev(() => state.calc.loads[0].clearance != null), 'gap to building computed');
  await ev(() => closeSheet(true));
  if (await p.$('.sel-bar')) { await p.click('.sel-bar .danger'); await p.waitForTimeout(300); ok(await ev(() => state.plan.site.obstacles.length) === n0, 'building deleted from the selection bar'); }

  // crane change keeps a valid chart
  await ev(() => { setCrane('ltm1080'); commit(); }); await p.waitForTimeout(300);
  ok(await ev(() => state.calc.crane.id === 'ltm1080' && state.calc.loads[0].cap != null), 'crane changed to LTM1080 with a capacity');

  // v8 legs: leg loads, half out, hand-typed (illustration) values
  await p.click('.dk[data-act="legs"]'); await p.waitForTimeout(500);
  ok(await ev(() => V7.sheet?.kind === 'legs' && !!document.querySelector('#sheet .legs-pic') && document.querySelectorAll('#sheet .padc').length === 4), 'legs sheet: picture + four leg cards');
  await ev(() => { state.plan.loads[0].w = 4; commit(); }); await p.waitForTimeout(300); // 18 t at 20 m overloads the LTM1080 (the model then says it tips, all legs 0)
  ok(await ev(() => { const L = state.calc.outr.lifts[0]; return L.at.state !== 'tipped' && Math.abs(Object.values(L.at.R).reduce((s, v) => s + v, 0) - L.at.M) < 1e-6; }), 'leg loads add up to crane + load');
  ok(await ev(() => { const r = state.calc.loads[0]; state.plan.loads[0].w = 18; commit(); return r.util > 100; }), '18 t at 20 m is over the LTM1080 chart (why the model tipped)');
  await p.waitForTimeout(300);
  await p.click('[data-sa="legExt"][data-side="left"][data-v="half"]'); await p.waitForTimeout(400);
  ok(await ev(() => state.plan.outExt.left === 'half' && state.calc.outr.half), 'left legs half out');
  ok(await ev(() => state.calc.loads[0].checks.some(c => c.t === 'Outriggers' && c.s === 'fail')), 'half legs with a full-leg chart is a STOP');
  await p.click('[data-sa="legExt"][data-side="left"][data-v="full"]'); await p.waitForTimeout(400);
  ok(await ev(() => state.plan.outExt.left === 'full' && !state.calc.loads[0].checks.some(c => c.t === 'Outriggers')), 'back to full legs');
  await p.click('#sheet [data-sa-sw="legMan"]', { force: true }).catch(() => ev(() => { const i = document.querySelector('#sheet [data-sa-sw="legMan"]'); i.checked = true; i.dispatchEvent(new Event('change', { bubbles: true })); }));
  await p.waitForTimeout(400);
  await p.fill('#sheet input[data-k="padMan.FL"]', '44'); await p.press('#sheet input[data-k="padMan.FL"]', 'Enter'); await p.waitForTimeout(500);
  ok(await ev(() => state.calc.outr.illus && state.calc.outr.used.FL === 44), 'typed FL 44 t used');
  ok(await ev(() => /Illustration only/i.test(document.querySelector('#sheet').textContent) && allChecks(state.calc).some(c => /ILLUSTRATION ONLY/.test(c.m))), 'illustration warning on screen and in the checks');
  await ev(() => { state.plan.padMan = {}; V7.legMan = false; commit({ sheet: true }); closeSheet(true); }); await p.waitForTimeout(300);
  // v8 sheet values typed over
  await ev(() => openSheet('print')); await p.waitForTimeout(400); await p.click('[data-sa="open"][data-k="sheetData"]'); await p.waitForTimeout(500);
  ok(await ev(() => V7.sheet?.kind === 'sheetData' && document.querySelectorAll('#sheet [data-ov]').length > 10), 'sheet values panel lists the printed rows');
  await p.fill('#sheet input[data-ov="l0.cap#0"]', '25'); await p.press('#sheet input[data-ov="l0.cap#0"]', 'Enter'); await p.waitForTimeout(500);
  ok(await ev(() => state.plan.sheetRows.ov['l0.cap#0'] === '25' && state.calc.sheetOv.some(x => x.id === 'l0.cap#0' && x.safety)), 'chart capacity typed over and flagged');
  ok(await ev(() => sheetBlocks(state.plan, state.calc, settingsEff()).flatMap(b => b.rows).find(r => r.id === 'l0.cap#0').v === '25'), 'the sheet prints the typed value');
  await ev(() => { state.plan.sheetRows.ov = {}; commit(); closeSheet(true); }); await p.waitForTimeout(300);

  // second lift
  await p.click('[data-act="liftAdd"]'); await p.waitForTimeout(300);
  ok(await ev(() => state.plan.loads.length) === 2, 'second lift added');

  // save + reopen
  await p.click('[data-act="save"]'); await p.waitForTimeout(500);
  ok(await ev(() => state.plans.length) >= 1 && !(await ev(() => state.dirty)), 'plan saved');
  await ev(() => openPage('plans')); await p.waitForTimeout(700);
  await p.click('[data-pg="open"]'); await p.waitForTimeout(600);
  ok(await ev(() => state.plan.loads.length) === 2, 'saved plan reopened');

  // PDF download
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 90000 }), ev(() => exportPDF('A1'))]);
  ok(/\.pdf$/.test(dl.suggestedFilename()), 'A1 PDF downloaded: ' + dl.suggestedFilename());

  // views
  for (const v of ['plan', 'sheet', 'elev']) { await p.click(`[data-act="view"][data-v="${v}"]`); await p.waitForTimeout(400); ok(await ev(() => state.view) === v, 'view ' + v); }
  ok(await ev(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'no sideways scroll');
  ok(!errs.length, 'no page errors ' + JSON.stringify(errs));
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
