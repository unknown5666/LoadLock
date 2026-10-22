// v10 end-to-end: the lift plan set (Print → Download the lift plan / See the sheets), the new ground surfaces in Legs, tackle WLL and
// hitch in the Hook sheet, and a tandem lift on the A1 sheet. Real clicks, real assertions, headless. Exits non-zero on any failure.
//   node planset_e2e.js            desktop 1440 × 900
//   W=390 H=844 node planset_e2e.js   phone
// SHOTS=1 also saves screenshots of the viewer and the sheets to out/ (to look at).
const { chromium } = require('playwright'); const { routes } = require('./shot_login'); const { pathToFileURL } = require('url'); const path = require('path'); const fs = require('fs');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const W = +(process.env.W || 1440), H = +(process.env.H || 900); const mobile = W < 900; const tag = mobile ? 'phone' : 'desk';
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mobile, isMobile: mobile, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await routes(p); await p.goto(pathToFileURL(path.join(process.cwd(), 'dist', 'v7.html')).href); await p.waitForTimeout(1200);
  const ev = (f, a) => p.evaluate(f, a); fs.mkdirSync('out', { recursive: true });
  await p.click('.lg-u[data-u="Saad"]'); await p.fill('#lgPass', '786'); await p.click('#lgGo'); await p.waitForTimeout(3000);
  ok(await ev(() => !document.body.classList.contains('locked')), 'signed in');
  await ev(() => { LS.set('lp.coach7', true); document.getElementById('coach')?.remove(); openPlan(normalizePlan(SAMPLE_PLANS[0].make())); }); await p.waitForTimeout(600);

  // ---- Print: the lift plan set is the main button and says how many sheets ----
  await ev(() => openSheet('print')); await p.waitForTimeout(500);
  const btn = await p.textContent('[data-sa="planSet"][data-v="A3"]'); const n0 = await ev(() => buildPlanSet(state.plan, state.calc, settingsEff(), { index: true }).length);
  ok(/Download the lift plan/.test(btn) && btn.includes(`${n0} sheets`), `print: main button "${btn.trim().replace(/\s+/g, ' ').slice(0, 60)}…" (${n0} sheets)`);
  ok(n0 >= 9, `a single lift makes ${n0} sheets`);
  if (process.env.SHOTS) await p.screenshot({ path: `out/print_${tag}.png` });
  // lift plan details (title block fields)
  await p.click('[data-sa="open"][data-k="setInfo"]'); await p.waitForTimeout(400);
  await p.fill('[data-k="meta.contractor"]', 'Main Builder LLC'); await p.press('[data-k="meta.contractor"]', 'Tab');
  await p.fill('[data-k="gridN"]', '1048.459'); await p.press('[data-k="gridN"]', 'Tab'); await p.fill('[data-k="gridE"]', '485.369'); await p.press('[data-k="gridE"]', 'Tab'); await p.waitForTimeout(300);
  ok(await ev(() => state.plan.meta.contractor === 'Main Builder LLC' && state.plan.gridN === '1048.459'), 'lift plan details: contractor and crane coordinates saved');
  await ev(() => closeSheet()); await p.waitForTimeout(500);

  // ---- See the sheets: the full-screen viewer ----
  await ev(() => { if (V7.sheet?.kind !== 'print') openSheet('print'); }); await p.waitForTimeout(300);
  await p.click('[data-sa="planSet"][data-v="view"]');
  await p.waitForFunction((n) => document.querySelectorAll('#psv .psv-pg img').length === n, n0, { timeout: 60000 });
  await p.waitForTimeout(800);
  const imgs = await ev(() => [...document.querySelectorAll('#psv .psv-pg img')].map(i => ({ w: i.naturalWidth, h: i.naturalHeight, ok: i.complete })));
  ok(imgs.length === n0 && imgs.every(i => i.ok && i.w > 0), `viewer shows all ${imgs.length} sheets`);
  ok(imgs.every(i => Math.abs(i.w / i.h - 420 / 297) < 0.01), 'every sheet is A3 landscape');
  const caps = await ev(() => [...document.querySelectorAll('#psv figcaption')].map(f => f.textContent));
  ok(/COVER SHEET/.test(caps[0]) && caps.some(c => /GENERAL ARRANGEMENT/.test(c)) && caps.some(c => /LOAD & SLING CALCULATIONS/.test(c)) && caps.some(c => /RISK ASSESSMENT/.test(c)), 'viewer captions: cover, GA, calculations, risk assessment');
  ok(await ev(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.querySelector('#psv .psv-b').scrollWidth <= document.querySelector('#psv .psv-b').clientWidth + 1), 'viewer: no sideways scroll');
  await p.click('#psv .psv-im'); await p.waitForTimeout(200); ok(await ev(() => document.querySelector('#psv .psv-im').classList.contains('zoom') && document.documentElement.scrollWidth <= innerWidth + 1), 'tap a sheet to zoom it (scrolls inside the sheet only)');
  await p.click('#psv .psv-im'); await p.waitForTimeout(200);
  if (process.env.SHOTS) { await p.screenshot({ path: `out/psv_${tag}.png` }); await ev(() => document.querySelectorAll('#psv .psv-pg')[1].scrollIntoView()); await p.waitForTimeout(400); await p.screenshot({ path: `out/psv2_${tag}.png` }); }
  // download from the viewer
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 120000 }), p.click('#psv [data-psv="A3"]')]);
  const pdf = fs.readFileSync(await dl.path()); fs.writeFileSync(`out/planset_${tag}.pdf`, pdf); const info = await ev(() => state.lastSet);
  ok(pdf.slice(0, 4).toString() === '%PDF' && pdf.length > 100000, `lift plan PDF: ${(pdf.length / 1024).toFixed(0)} kB, ${dl.suggestedFilename()}`);
  ok((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length === n0, `PDF has ${n0} pages`);
  ok(/\/MediaBox \[0 0 1190\.55 841\.89\]/.test(pdf.toString('latin1')) || /1190\.5\d* 841\.8/.test(pdf.toString('latin1')), 'PDF pages are A3 landscape (1190.55 × 841.89 pt)');
  ok(info && info.shot, '3D stills included'); console.log('     lift plan built in', info?.ms, 'ms (headless software rendering)');
  await p.click('#psv [data-psv="close"]'); await p.waitForTimeout(500); ok(await ev(() => document.getElementById('psv').hidden), 'viewer closes');

  // ---- Legs: roads, slabs and bridges ----
  await ev(() => { closeSheet(true); openSheet('legs'); }); await p.waitForTimeout(500);
  const groups = await ev(() => [...document.querySelectorAll('#sheet select[data-gp] optgroup')].map(g => g.label));
  ok(groups.length === 3 && groups.some(g => /Roads/.test(g)) && groups.some(g => /Structures/.test(g)), `ground picker grouped: ${groups.join(' / ')}`);
  await p.selectOption('#sheet select[data-gp]', 'asphalt'); await p.waitForTimeout(400);
  ok(await ev(() => state.plan.outrigger.ground === 'asphalt' && Math.abs(state.plan.outrigger.allow - 15.29) < 0.01), 'asphalt road fills 15.29 t/m²');
  ok(await ev(() => !!document.querySelector('#sheet .gs-tip') && /road edge/.test(document.querySelector('#sheet .gs-tip').textContent)), 'asphalt: what to check on site is shown');
  await p.selectOption('#sheet select[data-gp]', 'bridge'); await p.waitForTimeout(400);
  ok(await ev(() => state.plan.outrigger.allow === '' && state.calc.ground?.status === 'fail'), 'bridge: no guessed value, ground check FAILS until the engineer\'s figure is in');
  ok(await ev(() => !!document.querySelector('#sheet [data-k="outrigger.approval"]') && document.querySelector('#sheet .gs-tip.struct')), 'bridge: approval reference field + red warning');
  await p.fill('#sheet [data-k="outrigger.allow"]', '25'); await p.press('#sheet [data-k="outrigger.allow"]', 'Tab'); await p.waitForTimeout(300);
  await p.fill('#sheet [data-k="outrigger.approval"]', 'RTA-NOC-0193'); await p.press('#sheet [data-k="outrigger.approval"]', 'Tab'); await p.waitForTimeout(400);
  ok(await ev(() => state.calc.ground.checks[0].s === 'info' && /RTA-NOC-0193/.test(state.calc.ground.checks[0].m)), 'bridge with the engineer\'s figure + ref: approved');
  ok(await ev(() => allChecks(state.calc).some(c => c.t === 'Ground surface')), 'surface note in the checks list');
  if (process.env.SHOTS) await p.screenshot({ path: `out/legs_surface_${tag}.png` });

  // ---- Hook: tackle WLL and hitch, centre of gravity ----
  await ev(() => { closeSheet(true); const l = state.plan.loads[0]; l.tackles = [{ name: '10t shackle', type: 'shackle', L: 0.4, w: 0.02, wll: 10 }, { name: 'Round slings', type: 'sling', L: 6, w: 0.1, legs: 2, wll: 20 }]; commit({ sheet: true }); openSheet('load'); }); await p.waitForTimeout(500);
  ok(await ev(() => document.querySelectorAll('#sheet [data-tk$=".wll"]').length === 2 && !!document.querySelector('#sheet select[data-tk="1.hitch"]')), 'tackle rows have WLL; slings have "used as"');
  ok(await ev(() => state.calc.loads[0].checks.some(c => c.t === 'Tackle WLL' && c.s === 'fail')), '10 t shackle under a 13 t panel → FAIL');
  ok(await ev(() => !!document.querySelector('#sheet .tk-c.over')), 'overloaded item shown in red');
  await p.selectOption('#sheet select[data-tk="1.hitch"]', 'choker'); await p.waitForTimeout(400);
  ok(await ev(() => state.plan.loads[0].tackles[1].hitch === 'choker' && state.calc.loads[0].stack.items[1].swl === 16), 'choker hitch: SWL 20 × 0.8 = 16 t');
  await p.fill('#sheet [data-k="loads.0.cogX"]', '0.6'); await p.press('#sheet [data-k="loads.0.cogX"]', 'Tab'); await p.waitForTimeout(300);
  ok(await ev(() => num(state.plan.loads[0].cogX) === 0.6), 'centre of gravity typed');
  await ev(() => { const l = state.plan.loads[0]; l.tackles[0].wll = 25; commit({ sheet: true }); closeSheet(true); });

  // ---- tandem on the A1 sheet ----
  await ev(() => tandemOn(2)); await p.waitForTimeout(500);
  const sh = await ev(() => { const { P } = buildSheet(state.plan, state.calc, settingsEff()); const t = P.list.filter(x => x.t === 'text').map(x => x.s).join('|'); return { c1: /C1: 7\.80T/.test(t), c2: /C2: 7\.80T/.test(t), blk: /LOAD DATA 1 · TANDEM/.test(t), whole: /LOAD WEIGHT \(WHOLE LOAD\)/.test(t) }; });
  ok(sh.c1 && sh.c2 && sh.blk && sh.whole, 'tandem: A1 sheet shows both cranes, both shares and the whole load');
  const n1 = await ev(() => buildPlanSet(state.plan, state.calc, settingsEff(), { index: true }).map(x => x.code));
  ok(n1.includes('tdm0') && n1.filter(c => /^out/.test(c)).length === 2, 'tandem: plan set adds the tandem sheet and a leg-load sheet per crane');
  await ev(() => setView('sheet')); await p.waitForTimeout(800); if (process.env.SHOTS) await p.screenshot({ path: `out/tandem_sheet_${tag}.png` });
  await ev(() => setView('elev')); await p.waitForTimeout(300);

  const real = errs.filter(e => !/ERR_BLOCKED_BY_CLIENT/.test(e)); ok(!real.length, 'no page errors' + (real.length ? ': ' + real.join(' | ') : ''));
  console.log(`\n${fails ? 'FAILED' : 'ALL PASSED'} (${tag})`); await b.close(); process.exit(fails ? 1 : 0);
})();
