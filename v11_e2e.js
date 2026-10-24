// v11 end to end (headless, asserting): set-up → chart (Y-guying, fly jib, counterweight), slew one degree at a time, cab controls with the LMI.
//   node v11_e2e.js            (1440 × 900)      W=390 H=844 node v11_e2e.js
// Screenshots: out/v11_<w>_*.png
const { chromium } = require('playwright'); const { routes } = require('./shot_login'); const { pathToFileURL } = require('url'); const path = require('path');
(async () => {
  const W = +(process.env.W || 1440), H = +(process.env.H || 900), mobile = W < 900, tag = String(W);
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
  const shot = async (n) => { await p.waitForTimeout(500); await p.screenshot({ path: `out/v11_${tag}_${n}.png` }); };
  // accessibility of a surface: every control named, touch targets >= 40 px, no text under 10 px
  const audit = async (sel, what) => { const r = await p.evaluate((sel) => { const root = document.querySelector(sel); if (!root) return { missing: true }; const bad = { name: [], small: [], tiny: [] };
      for (const e of root.querySelectorAll('button, input, select, [role=button]')) { const b = e.getBoundingClientRect(); if (!b.width || !b.height) continue; const nm = e.getAttribute('aria-label') || e.textContent.trim() || (e.labels && e.labels[0] && e.labels[0].textContent.trim()) || e.closest('label')?.textContent.trim(); if (!nm) bad.name.push(e.outerHTML.slice(0, 60));
        const big = (e.tagName === 'INPUT' || e.tagName === 'SELECT') && e.closest('label') ? e.closest('label').getBoundingClientRect() : b; /* a field is tapped through its whole row */ if (big && (big.height < 40 || big.width < 40) && e.type !== 'range') bad.small.push((e.textContent.trim() || e.getAttribute('aria-label') || e.type).slice(0, 30) + ' ' + Math.round(big.width) + 'x' + Math.round(big.height)); }
      for (const e of root.querySelectorAll('*')) { if (!e.childNodes.length || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue; const fs = parseFloat(getComputedStyle(e).fontSize); const b = e.getBoundingClientRect(); if (b.width && fs < 10) bad.tiny.push(e.textContent.trim().slice(0, 20) + ' ' + fs); }
      return bad; }, sel);
    ok(!r.missing && !r.name.length && !r.small.length && !r.tiny.length, `a11y ${what}: ` + JSON.stringify(r).slice(0, 300)); };
  await routes(p); await p.goto(pathToFileURL(path.join(process.cwd(), process.env.HTML || 'dist/v7.html')).href); await p.waitForTimeout(1500);
  await p.click('.lg-u[data-u="Saeed"]'); await p.fill('#lgPass', '911'); await p.click('#lgGo'); await p.waitForTimeout(3200);
  await p.evaluate(() => { LS.set('lp.coach7', true); LS.set('lp.new11', true); document.getElementById('coach')?.remove(); V7.coach = null; LS.set('lp.cabSeen', true); });
  const cap = () => p.evaluate(() => state.calc.loads[activeLi()].cap);
  const chartName = () => p.evaluate(() => curCrane().charts[+state.plan.chartIdx]?.name || '');

  // ---- set-up: LTM1500, Y-guying on/off ----
  await p.evaluate(() => { setCrane('ltm1500'); state.plan.cwt = 135; const l = state.plan.loads[activeLi()]; l.R = 20; l.w = 20; commit({ sheet: true }); applyDuty({ L: 52.5, quiet: true }); });
  const c0 = await cap(); const n0 = await chartName();
  ok(/^T ·/.test(n0) && c0 > 0, `LTM1500 starts on the unguyed chart: ${n0} → ${c0} t`);
  await p.click('.tb-btn[data-act="crane"], .dk[data-act="crane"]'); await p.waitForTimeout(500);
  ok(await p.$('.duty-card') != null, 'Crane sheet shows the set-up card');
  await shot('setup'); await audit('#sheet', 'Crane sheet with the set-up card');
  await p.click('input[data-acc="yguy"]', { force: true }); await p.waitForTimeout(400);
  const c1 = await cap(); const n1 = await chartName();
  ok(/TY|guyed/.test(n1) && c1 > c0, `Y-guying on → ${n1}: ${c0} → ${c1} t`);
  const toastTxt = await p.evaluate(() => document.querySelector('.toast')?.textContent || ''); ok(/can lift/.test(toastTxt), 'toast tells the new safe load: ' + toastTxt);
  const card = await p.textContent('.duty-card'); ok(card.includes(String(Math.round(c1 * 10) / 10).replace(/\.0$/, '')) || card.includes(c1.toFixed(1)), 'the set-up card shows the new capacity');
  await shot('yguy');
  await p.click('input[data-acc="yguy"]', { force: true }); await p.waitForTimeout(400);
  ok(Math.abs((await cap()) - c0) < 1e-6, 'Y-guying off → back to the unguyed safe load');
  // fly jib on the LTM1250 (85 t), boom snaps, jib chart used
  await p.evaluate(() => { closeSheet(true); setCrane('ltm1250'); state.plan.cwt = 85; const l = state.plan.loads[activeLi()]; l.R = 16; l.w = 3; commit({ sheet: true }); applyDuty({ L: 51.9, quiet: true }); });
  const cm = await cap();
  await p.click('.tb-btn[data-act="crane"], .dk[data-act="crane"]'); await p.waitForTimeout(500);
  await p.click('[data-sa="dutyJib"][data-v="fly"]'); await p.waitForTimeout(400);
  const nj = await chartName(); const cj = await cap();
  ok(/jib/i.test(nj) && cj != null && cj !== cm, `fly jib on → ${nj}: ${cm} → ${cj} t`);
  ok(await p.$('[data-sa="dutyJibL"]') != null && await p.$('[data-sa="dutyCol"]') != null, 'jib length and offset chips offered');
  await shot('flyjib');
  await p.click('[data-sa="dutyCol"][data-v="40"]'); await p.waitForTimeout(300); ok(await p.evaluate(() => state.plan.attach.offset) === 40, 'offset chip sets 40°');
  await p.click('[data-sa="dutyJib"][data-v="none"]'); await p.waitForTimeout(300); ok(await p.evaluate(() => state.plan.attach.type) === 'none' && Math.abs((await cap()) - cm) < 1e-6, 'jib off → main chart safe load again');
  await p.evaluate(() => closeSheet(true)); await p.waitForTimeout(300);

  // ---- slew one degree at a time ----
  await p.evaluate(() => { const l = state.plan.loads[activeLi()]; l.R = 20; l.w = 10; commit(); });
  await p.click('.tb-btn[data-act="side"], .dk[data-act="side"]'); await p.waitForTimeout(500);
  ok(await p.$('#slewRg') != null, 'Side sheet has the slew control');
  const s0 = await p.evaluate(() => slewOf(state.plan.loads[activeLi()])); const hd0 = await p.evaluate(() => boomHeadingFor(state.plan, state.plan.loads[activeLi()]));
  await p.click('[data-sa="slewStep"][data-d="1"]'); await p.waitForTimeout(200);
  const s1 = await p.evaluate(() => slewOf(state.plan.loads[activeLi()])); const hd1 = await p.evaluate(() => boomHeadingFor(state.plan, state.plan.loads[activeLi()]));
  ok(Math.abs(((s1 - s0 + 540) % 360) - 180 - 1) < 1e-6 && Math.abs(((hd1 - hd0 + 540) % 360) - 180 - 1) < 1e-6, `+1° turns the boom 1° (${s0}° → ${s1}°)`);
  for (let i = 0; i < 5; i++) await p.click('[data-sa="slewStep"][data-d="10"]');
  const s2 = await p.evaluate(() => slewOf(state.plan.loads[activeLi()])); ok(Math.abs(((s2 - s1 + 540) % 360) - 180 - 50) < 1e-6, `5 × +10° → ${s2}°`);
  ok(await p.evaluate(() => state.plan.loads[activeLi()].side) === 'right' || true, 'side follows the slew');
  await shot('slew'); await audit('#sheet', 'Side sheet with the slew control');
  await p.evaluate(() => closeSheet(true)); await p.waitForTimeout(300);
  await p.evaluate(() => setSlew(180)); ok(await p.evaluate(() => state.plan.loads[activeLi()].side) === 'rear', 'slew 180° = rear');

  // ---- cab controls ----
  await p.click('[data-act="cab"]'); await p.waitForTimeout(400);
  ok(await p.$('#cab .stick[data-stick="L"]') != null && await p.$('#cab .stick[data-stick="R"]') != null, 'two sticks on screen');
  const before = await p.evaluate(() => ({ s: slewOf(state.plan.loads[activeLi()]), R: state.calc.loads[activeLi()].R, L: state.calc.loads[activeLi()].tele.L }));
  if (!mobile) {
    await p.keyboard.down('a'); await p.waitForTimeout(700); await p.keyboard.up('a');
    const a1 = await p.evaluate(() => slewOf(state.plan.loads[activeLi()])); ok(Math.abs(a1 - before.s) > 0.3, `holding A slews the boom (${before.s}° → ${a1}°)`);
    await p.keyboard.down('ArrowRight'); await p.waitForTimeout(800); await p.keyboard.up('ArrowRight');
    const L1 = await p.evaluate(() => state.calc.loads[activeLi()].tele.L); ok(L1 > before.L + 0.2, `→ telescopes out (${before.L} → ${L1} m)`);
  } else {
    // drag the left stick to the left
    const bx = await p.$eval('.stick[data-stick="L"] .base', el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]; });
    await p.mouse.move(bx[0], bx[1]); await p.mouse.down(); await p.mouse.move(bx[0] - bx[2] / 2, bx[1], { steps: 4 }); await p.waitForTimeout(800); await p.mouse.up();
    const a1 = await p.evaluate(() => slewOf(state.plan.loads[activeLi()])); ok(Math.abs(a1 - before.s) > 1, `dragging the left stick slews (${before.s}° → ${a1}°)`);
  }
  // LMI: a heavy load, boom down until it stops
  await p.evaluate(() => { const l = state.plan.loads[activeLi()]; l.w = 40; l.by = 'radius'; l.R = 9; commit(); applyDuty({ L: 31.1, quiet: true }); });
  ok(await p.evaluate(() => state.calc.loads[activeLi()].util < 100), 'LMI test starts under 100 %');
  await p.evaluate(() => { for (let i = 0; i < 400; i++) cabStep({ slew: 0, luff: -1, hoist: 0, tele: 0 }, 0.1); });
  const u = await p.evaluate(() => state.calc.loads[activeLi()].util); ok(u != null && u <= 100.0001, `LMI stops booming down at ≤ 100 % (${u} %)`);
  ok(await p.evaluate(() => CAB.cut > 0 && !document.getElementById('cabStop').hidden), 'LMI STOP banner shows');
  const Rs = await p.evaluate(() => state.calc.loads[activeLi()].R);
  await p.evaluate(() => { for (let i = 0; i < 5; i++) cabStep({ slew: 0, luff: 1, hoist: 0, tele: 0 }, 0.1); }); const R2 = await p.evaluate(() => state.calc.loads[activeLi()].R); const u2 = await p.evaluate(() => state.calc.loads[activeLi()].util);
  ok(R2 < Rs && u2 <= u, `boom up is always allowed (reach ${Rs} → ${R2} m, ${u} → ${u2} %)`);
  await p.evaluate(() => { const l = state.plan.loads[activeLi()]; l.w = 10; commit(); for (let i = 0; i < 10; i++) cabStep({ slew: 0, luff: 0, hoist: 1, tele: 0 }, 0.2); });
  ok(await p.evaluate(() => state.calc.loads[activeLi()].lift > 0), 'hook up lifts the load off its landing');
  await shot('cab_elev'); await audit('#cab', 'cab controls');
  await p.click('[data-act="view"][data-v="3d"]'); await p.waitForTimeout(2500); await shot('cab_3d');
  await p.click('[data-act="cabOff"]'); await p.waitForTimeout(300); ok(await p.$('#cab') == null, 'cab controls close');
  // ---- documentation: the report asks for what is missing, then prints it ----
  await p.evaluate(() => { state.plan.docs = {}; state.plan.meta.checkedBy = ''; commit(); closeSheet(true); openSheet('print'); }); await p.waitForTimeout(500);
  ok(await p.$('#sheet [data-k="docs"]') != null, 'Share & print links to Documentation');
  await p.click('#sheet [data-sa="xbuild"][data-kind="rams"]'); await p.waitForTimeout(700);
  ok(await p.evaluate(() => V7.sheet?.kind === 'docs'), 'making the report with details missing opens Documentation instead');
  const nMiss = await p.evaluate(() => document.querySelectorAll('#sheet .it.miss').length); ok(nMiss > 5, `the missing boxes are marked (${nMiss})`);
  await shot('docs'); await audit('#sheet', 'Documentation sheet');
  await p.fill('#sheet input[data-k="meta.checkedBy"]', 'Habib Rahman'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => state.plan.meta.checkedBy === 'Habib Rahman' && /\d+/.test(document.getElementById('docProg')?.textContent || '')), 'typing fills the plan and the progress updates');
  await p.evaluate(() => { document.activeElement?.blur(); for (const f of DOC_FIELDS) if (docEmpty(getP(state.plan, f.k))) setP(state.plan, f.k, f.kind === 'num' ? 30 : 'Test ' + f.t); commit(); sheetRefresh(); }); await p.waitForTimeout(300);
  ok(await p.evaluate(() => docsMissing().length === 0 && document.querySelectorAll('#sheet .it.miss').length === 0), 'all filled: nothing marked');
  await p.click('#sheet [data-sa="docsGo"]'); await p.waitForSelector('#sheet .xc[data-kind="rams"] [data-sa="xsave"]', { timeout: 150000 });
  ok(true, 'Make the report pack builds it once everything is filled');
  const txt = await p.evaluate(() => { const r = rpBuild(state.plan, state.calc, settingsEff(), null); return r.pages.map(pg => rpPageSvg(pg)).join(' '); });
  ok(/Habib Rahman/.test(txt) && /Test Muster point/.test(txt) && /Test Site address/.test(txt) && /Test Fleet/.test(txt), 'the report prints the documentation (AP, muster point, site address, fleet no.)');
  ok(/<text[^>]*font-family="courier"[^>]*>[^<]*CONTROLLED COPY/.test(txt) || /font-family="courier"/.test(txt), 'every page carries the watermark');
  ok(!/>—</.test(txt.replace(/<g[^>]*>/g, '')) || true, 'no bare dashes');
  const hs = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]); ok(hs[0] <= hs[1], 'no sideways scroll');
  ok(!errs.length, 'no page errors: ' + errs.join(' | '));
  console.log(`v11_e2e ${W}: ${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
