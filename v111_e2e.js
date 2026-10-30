// v11.1 end to end, against a real local server: sign in as Saad and as Habib, build a plan with the wizard, change outriggers and counterweight, jib on and off, export the report.
//   node v111_e2e.js            HTML=public/index.html for the deployable copy
// Checks: identity per user, live chart, no tool name anywhere in the PDF or its metadata, no sideways scroll at 375 and 390 px. Screenshots: out/v111_*.png
const { chromium } = require('playwright'); const { routes } = require('./shot_login'); const http = require('http'); const fs = require('fs'); const path = require('path'); const zlib = require('zlib');
const HTML = process.env.HTML || 'dist/v7.html';
const CODES = { Saad: '786', Habib: '12911' };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('FAIL', m); } };
(async () => {
  const srv = http.createServer((q, r) => { if (q.url === '/' || q.url === '/index.html') { r.writeHead(200, { 'content-type': 'text/html' }); r.end(fs.readFileSync(HTML)); } else { r.writeHead(404); r.end(); } });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${srv.address().port}/`;
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  const open = async (w, h, mobile) => { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: !!mobile, isMobile: !!mobile, serviceWorkers: 'block' }); const p = await ctx.newPage(); p._errs = []; p.on('pageerror', e => p._errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(m.text())) p._errs.push(m.text()); }); await routes(p); await p.goto(url); await p.waitForTimeout(1200); return p; };
  const signIn = async (p, u) => { await p.click(`.lg-u[data-u="${u}"]`); await p.fill('#lgPass', CODES[u]); await p.click('#lgGo'); await p.waitForTimeout(2200); };
  const noScroll = async (p, what) => { const r = await p.evaluate(() => { const d = document.documentElement, sh = document.getElementById('shB'); return { doc: d.scrollWidth - d.clientWidth, sheet: sh ? sh.scrollWidth - sh.clientWidth : 0 }; }); ok(r.doc <= 1 && r.sheet <= 1, `${what}: no sideways scroll (${JSON.stringify(r)})`); };
  const fillW = async (p, k, v) => { await p.fill(`[data-w="${k}"]`, String(v)); };
  const next = async (p) => { await p.click('[data-wa="next"]'); await p.waitForTimeout(150); };
  const wizard = async (p, tag, w) => {
    await p.evaluate(() => wizStart()); await p.waitForTimeout(400); await noScroll(p, `${tag} wizard, client`); await p.screenshot({ path: `out/v111_${tag}_wiz0.png` });
    await p.click('[data-wa="next"]'); ok(await p.evaluate(() => !!document.querySelector('.wz-err')), 'the wizard asks for the client first');
    await fillW(p, 'company', 'City Star Cranes'); await fillW(p, 'project', 'Al Reem Tower'); await fillW(p, 'site', 'Plot 7, Al Reem Island'); await fillW(p, 'ref', 'CS-0142'); await fillW(p, 'contact', 'Ops Manager'); await next(p);
    await noScroll(p, `${tag} wizard, type`); await fillW(p, 'title', 'AC unit'); await next(p);
    await p.click('[data-wa="set"][data-v="stc1000m"]'); await p.waitForTimeout(150); await noScroll(p, `${tag} wizard, crane`); await p.screenshot({ path: `out/v111_${tag}_wiz2.png` }); await next(p);
    await fillW(p, 'w', 5); await fillW(p, 'R', 14); await next(p);
    await p.click('[data-wa="toggle"][data-k="publicArea"]'); await next(p); await noScroll(p, `${tag} wizard, sections`); await p.screenshot({ path: `out/v111_${tag}_wiz5.png` });
    ok(await p.evaluate(() => V7.wiz.sections.permit === true && V7.wiz.sections.ground === true), 'public area switches the permit on');
    await p.evaluate(() => { V7.wiz.sections.a1 = false; V7.wiz.sections.rigging = false; });
    await p.click('[data-wa="finish"]'); await p.waitForTimeout(800);
  };
  // ---------- Saad, desktop ----------
  { const p = await open(1440, 900); await signIn(p, 'Saad'); await p.evaluate(() => profileSave({ title: 'Lifting Engineer', certs: 'BS 7121' }));
    ok(await p.evaluate(() => profileOf().name === 'Saad Khan' && V7.user === 'Saad'), 'Saad signs in as Saad Khan');
    await wizard(p, 'saad', {});
    const st = await p.evaluate(() => { const r = state.calc.loads[0]; return { craneId: state.plan.craneId, drawnBy: state.plan.meta.drawnBy, co: settingsEff().company, chart: r.chartDef?.name, cap: r.cap, util: r.util, inc: state.plan.reportInc }; });
    ok(st.craneId === 'stc1000m' && st.drawnBy === 'Saad Khan' && st.co === 'CITY STAR CRANES', 'plan built: crane, prepared by, operator branding');
    ok(st.cap > 0 && st.util > 0, `capacity live: ${st.cap} t, ${st.util} %`); ok(!st.inc.includes('rigging') && !st.inc.includes('a1'), 'switched-off sections leave the report');
    // the chart moves with the set-up
    const cap = () => p.evaluate(() => { const r = state.calc.loads[0]; return { cap: r.cap, name: r.chartDef?.name, why: r.capInfo?.why }; });
    const c0 = await cap(); await p.evaluate(() => { state.plan.cwt = 8.52; applyDuty({ quiet: true }); }); const c1 = await cap(); ok(c1.name !== c0.name && c1.cap !== c0.cap, `counterweight changes the chart: ${c0.cap} → ${c1.cap}`);
    await p.evaluate(() => { state.plan.cwt = 19.46; accToggle('flyjib', true); state.plan.attach.jibLen = 18; state.plan.attach.offset = 15; applyDuty({ L: 52, quiet: true }); }); const c2 = await cap(); ok(/Fly jib 18 m/.test(c2.name || '') && c2.cap > 0, `fly jib 18 m chart in use: ${c2.cap} t`);
    await p.evaluate(() => { accToggle('flyjib', false); applyDuty({ L: 32.8, quiet: true }); });
    await p.evaluate(() => { SA_EXTRA.dutySetup({ v: 'tyres' }); }); await p.waitForTimeout(300); const c3 = await cap(); ok(c3.cap == null, `on tyres with no chart: ${c3.why || 'no capacity'}`);
    await p.evaluate(() => { SA_EXTRA.dutySetup({ v: 'full' }); }); const c4 = await cap(); ok(c4.cap > 0, 'back on full outriggers');
    await p.evaluate(() => { setCrane('stc1500s'); state.plan.cwt = 42; applyDuty({ quiet: true }); }); const f = await cap(); await p.evaluate(() => { SA_EXTRA.dutySetup({ v: 'half' }); }); const h = await cap(); ok(/half/i.test(h.name || '') && h.cap < f.cap, `STC1500S half outriggers: ${f.cap} → ${h.cap} t`);
    await p.evaluate(() => { SA_EXTRA.dutySetup({ v: 'full' }); setCrane('stc1000m'); state.plan.cwt = 19.46; applyDuty({ L: 32.8, quiet: true }); openSheet('crane'); }); await p.waitForTimeout(500); await p.screenshot({ path: 'out/v111_saad_crane.png' }); ok(await p.evaluate(() => !!document.querySelector('.duty-util')), 'set-up card shows hook load and %'); await p.evaluate(() => closeSheet(true));
    // the report
    const pdf = await p.evaluate(async () => { for (const fd of DOC_FIELDS) if (!getP(state.plan, fd.k)) setP(state.plan, fd.k, fd.kind === 'num' ? 25 : 'x'); commit(); const r = await buildReport({ include: state.plan.reportInc }); const u = new Uint8Array(await r.blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode(...u.subarray(i, i + 32768)); return { b64: btoa(s), pages: r.pages, ids: r.ids }; });
    fs.writeFileSync('out/v111_report.pdf', Buffer.from(pdf.b64, 'base64')); const raw = Buffer.from(pdf.b64, 'base64').toString('latin1');
    ok(!/jsPDF|LoadLock|Lift Planner|FHE/i.test(raw), 'raw PDF bytes carry no tool name'); ok(pdf.pages >= 10 && !pdf.ids.includes('rigging'), `report ${pdf.pages} pages`); ok(p._errs.length === 0, 'Saad: no page errors ' + JSON.stringify(p._errs)); await p.context().close(); }
  // ---------- Habib keeps the company in Settings on a plan with no client ----------
  { const p = await open(1440, 900); await signIn(p, 'Habib'); const s = await p.evaluate(() => ({ co: settingsEff().company, name: profileOf().name, u: V7.user })); ok(s.u === 'Habib' && s.name === 'HABIB' && /FRIENDSHIP/.test(s.co), 'Habib stays as he was'); ok(await p.evaluate(() => { const pl = normalizePlan(blankPlan()); return pl.meta.drawnBy === 'HABIB'; }), 'Habib is the default preparer on his plans'); ok(p._errs.length === 0, 'Habib: no page errors ' + JSON.stringify(p._errs)); await p.context().close(); }
  // ---------- phones ----------
  for (const w of [375, 390]) { const p = await open(w, 812, true); await signIn(p, 'Saad'); await noScroll(p, `${w} studio`); await wizard(p, 'm' + w, {}); await noScroll(p, `${w} after wizard`); await p.screenshot({ path: `out/v111_m${w}_studio.png` });
    await p.evaluate(() => openSheet('crane')); await p.waitForTimeout(500); await noScroll(p, `${w} crane set-up`); await p.screenshot({ path: `out/v111_m${w}_crane.png` });
    await p.evaluate(() => openSheet('profile')); await p.waitForTimeout(300); await noScroll(p, `${w} profile`); await p.screenshot({ path: `out/v111_m${w}_profile.png` });
    await p.evaluate(() => openSheet('print')); await p.waitForTimeout(500); await noScroll(p, `${w} share and print`); await p.screenshot({ path: `out/v111_m${w}_print.png` });
    const small = await p.evaluate(() => [...document.querySelectorAll('#shB button, #shB input, #shB select')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && r.height < 40 && !e.closest('.sw'); }).length); ok(small === 0, `${w}: thumb-sized controls (${small} small)`);
    ok(p._errs.length === 0, `${w}: no page errors ` + JSON.stringify(p._errs)); await p.context().close(); }
  await b.close(); srv.close(); console.log(`v111_e2e: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
