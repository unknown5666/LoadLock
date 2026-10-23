// v7 end-to-end: real clicks, real assertions. Exits non-zero on the first failure.
// node v7_e2e.js   (W=390 H=844 for the phone layout)
const { chromium } = require('playwright'); const { routes } = require('./shot_login'); const { pathToFileURL } = require('url'); const path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const W = +(process.env.W || 1440), H = +(process.env.H || 900); const mobile = W < 900;
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mobile, isMobile: mobile, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await routes(p); await p.goto(pathToFileURL(process.env.LL_HTML || path.join(process.cwd(), 'dist', 'v7.html')).href); await p.waitForTimeout(1200);
  const ev = (f, a) => p.evaluate(f, a);

  // sign-in: all three users, wrong code refused
  for (const [u, c] of [['Habib', '12911'], ['Saad', '786'], ['Saeed', '911']]) ok(await ev(([u, c]) => authCheck(u, c), [u, c]), `login ${u}`);
  ok(!(await ev(() => authCheck('Saad', '911'))), 'wrong code refused');
  await p.click('.lg-u[data-u="Saad"]'); await p.fill('#lgPass', '786'); await p.click('#lgGo'); await p.waitForTimeout(3000);
  ok(await ev(() => !document.body.classList.contains('locked') && authUser() === 'Saad'), 'signed in as Saad');
  await ev(() => { LS.set('lp.coach7', true); LS.set('lp.new10', true); document.getElementById('coach')?.remove(); });

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
  ok(await ev(() => document.querySelectorAll('.side-btns [data-sa="side"]').length) === 4 && await ev(() => !!document.querySelector('.side-btns [data-v="front"] svg')), 'side picker has Left, Behind, Right and Front, each with an icon');
  await p.click('.side-btns [data-v="front"]'); await p.waitForTimeout(400);
  ok(await ev(() => state.plan.loads[0].side) === 'front', 'side set to front');
  ok(/driver's cab/.test(await p.textContent('.side-help')), 'front help says it is over the driver\'s cab');
  if (process.env.SHOTS) await p.screenshot({ path: path.join(process.env.SHOTS, `side_${W}.png`) });
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
  await ev(() => openSheet('print')); await p.waitForTimeout(400); await p.click('[data-sa="open"][data-k="sheetDetails"]'); await p.waitForTimeout(500);
  ok(await ev(() => V7.sheet?.kind === 'sheetDetails' && !!document.querySelector('#sheet [data-k="meta.client"]') && !!document.querySelector('#sheet [data-sa="layout"]') && !document.querySelector('#sheet [data-sa="export"]')), 'Sheet details holds job fields and layout, and no export buttons');
  await p.click('[data-sa="open"][data-k="sheetData"]'); await p.waitForTimeout(500);
  ok(await ev(() => V7.sheet?.kind === 'sheetData' && document.querySelectorAll('#sheet [data-ov]').length > 10), 'sheet values panel lists the printed rows');
  await p.fill('#sheet input[data-ov="l0.cap#0"]', '25'); await p.press('#sheet input[data-ov="l0.cap#0"]', 'Enter'); await p.waitForTimeout(500);
  ok(await ev(() => state.plan.sheetRows.ov['l0.cap#0'] === '25' && state.calc.sheetOv.some(x => x.id === 'l0.cap#0' && x.safety)), 'chart capacity typed over and flagged');
  ok(await ev(() => sheetBlocks(state.plan, state.calc, settingsEff()).flatMap(b => b.rows).find(r => r.id === 'l0.cap#0').v === '25'), 'the sheet prints the typed value');
  await ev(() => { state.plan.sheetRows.ov = {}; commit(); closeSheet(true); }); await p.waitForTimeout(300);

  // second lift
  await p.click('[data-act="liftAdd"]'); await p.waitForTimeout(300);
  ok(await ev(() => state.plan.loads.length) === 2, 'second lift added');

  // save + reopen
  await p.click('[data-act="save"]:visible'); await p.waitForTimeout(500);
  ok(await ev(() => state.plans.length) >= 1 && !(await ev(() => state.dirty)), 'plan saved');
  await ev(() => openPage('plans')); await p.waitForTimeout(700);
  await p.click('[data-pg="open"]'); await p.waitForTimeout(600);
  ok(await ev(() => state.plan.loads.length) === 2, 'saved plan reopened');

  // v10 top bar: undo, redo, plan name + saved state, Share & print are all in reach (44 px on a phone)
  const bar = await ev(() => { const r = (sel) => { const e = [...document.querySelectorAll(sel)].find(x => x.offsetParent); if (!e) return null; const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), x: Math.round(b.left), r: Math.round(b.right) }; }; return { undo: r('#tbUndo'), redo: r('#tbRedo'), share: r('#bPdf'), name: r('#tbName'), save: r('[data-act="save"]'), state: !!document.querySelector('#saveState,#tbState'), w: innerWidth }; });
  ok(bar.undo && bar.redo && bar.share && bar.name && bar.save && bar.state, 'top bar shows undo, redo, name, saved state, save and Share & print');
  ok(bar.undo.h >= (mobile ? 44 : 40) && bar.redo.h >= (mobile ? 44 : 40) && bar.share.h >= 40 && bar.share.r <= bar.w, `top bar buttons are big enough and inside the screen (${JSON.stringify(bar.share)})`);

  // v10 Share & print: two cards, one tap makes the PDF, then Save / Share / Print on the ready card
  await ev(() => { closeSheet(true); }); await p.click('.dk[data-act="print"]'); await p.waitForTimeout(500);
  ok(await ev(() => V7.sheet?.kind === 'print' && document.querySelectorAll('#sheet .xc').length === 2 && document.querySelectorAll('#sheet .xo-b').length === 4 && !!document.querySelector('#sheet [data-sa="open"][data-k="sheetDetails"]')), 'Share & print: two cards, four other formats, link to Sheet details');
  ok(await ev(() => !document.querySelector('#sheet [data-k="meta.client"]') && !document.querySelector('#sheet [data-sa="layout"]') && !document.querySelector('#sheet [data-sa="save"]')), 'Share & print has no job fields, layout or Save buttons');
  await p.click('#sheet [data-sa="xbuild"][data-kind="a1"]'); await p.waitForTimeout(200);
  ok(await ev(() => !!SHARE.job && !!document.querySelector('#sheet #xpFill') && !!document.querySelector('#sheet [role="progressbar"]')), 'the card shows a progress bar while it builds');
  await p.waitForSelector('#sheet [data-sa="xsave"][data-kind="a1"]', { timeout: 90000 });
  ok(await ev(() => !!document.querySelector('#sheet .xc.ready [data-sa="xprint"]') && !!SHARE.cache.a1 && SHARE.cache.a1.size > 20000), 'A1 card is ready with Save and Print');
  const at0 = await ev(() => +SHARE.cache.a1.at);
  const [dl1] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#sheet [data-sa="xsave"][data-kind="a1"]')]);
  const pdf1 = require('fs').readFileSync(await dl1.path());
  ok(/\.pdf$/.test(dl1.suggestedFilename()) && pdf1.slice(0, 4).toString() === '%PDF', 'Save downloads the PDF: ' + dl1.suggestedFilename());
  ok(/\/Encrypt/.test(pdf1.toString('latin1')), 'the PDF is locked (encrypted, print only)');
  ok(await ev(() => +SHARE.cache.a1.at) === at0, 'Save did not rebuild the PDF (cached)');
  await p.click('#sheet [data-sa="xprint"][data-kind="a1"]'); await p.waitForTimeout(900);
  ok(await ev(() => SHARE.lastPrint && SHARE.lastPrint.kind === 'a1' && (!!document.querySelector('#shPrintFrame') || SHARE.lastPrint.via === 'tab')), 'Print loads the PDF into a hidden frame (or a new tab)');
  // Web Share (Level 2): the button appears when the device can share files, and runs inside the tap
  await ev(() => { window.__sh = []; navigator.canShare = (d) => !!(d && d.files && d.files.length); navigator.share = (d) => { window.__sh.push({ n: d.files[0].name, t: d.files[0].type, sz: d.files[0].size, act: navigator.userActivation ? navigator.userActivation.isActive : null }); return Promise.resolve(); }; });
  await p.click('#sheet [data-sa="xbuild"][data-kind="a1"]'); await p.waitForSelector('#sheet [data-sa="xshare"][data-kind="a1"]', { timeout: 90000 }); await p.waitForTimeout(600);
  ok(/Share/.test(await p.textContent('#sheet [data-sa="xshare"][data-kind="a1"] b')), 'Share button appears: ' + (await p.textContent('#sheet [data-sa="xshare"][data-kind="a1"] b')));
  await p.click('#sheet [data-sa="xshare"][data-kind="a1"]'); await p.waitForTimeout(400);
  const sh = await ev(() => window.__sh);
  ok(sh.length === 1 && sh[0].t === 'application/pdf' && /\.pdf$/.test(sh[0].n) && sh[0].sz > 20000 && sh[0].act !== false, 'navigator.share got the PDF file inside the tap: ' + JSON.stringify(sh[0]));
  // WhatsApp: on a computer the PDF is saved and wa.me opens with a short summary; on a phone the share sheet gets the PDF
  ok(await ev(() => /WhatsApp/.test(document.querySelector('#sheet [data-sa="xwa"][data-kind="a1"] b').textContent) && !!document.querySelector('#sheet [data-sa="xwa"][data-kind="a1"] svg path[fill="#25D366"]')), 'WhatsApp button with the green glyph');
  await ev(() => { window.__wa = []; window.__open0 = window.open; window.open = (u) => { window.__wa.push(String(u)); return {}; }; });
  const [dlw] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#sheet [data-sa="xwa"][data-kind="a1"]')]);
  const wa = await ev(() => ({ urls: window.__wa, via: SHARE.lastWa && SHARE.lastWa.via, shared: window.__sh.length }));
  const waText = decodeURIComponent((wa.urls[0] || '').replace(/^https:\/\/wa\.me\/\?text=/, ''));
  ok(wa.via === 'web' && /^https:\/\/wa\.me\/\?text=/.test(wa.urls[0] || '') && /\.pdf$/.test(dlw.suggestedFilename()), 'WhatsApp on a computer: PDF saved and wa.me opened: ' + dlw.suggestedFilename());
  ok(/Lifting plan: .+/.test(waText) && /Crane: .+/.test(waText) && /Load: [\d.]+ t at [\d.]+ m radius/.test(waText) && /Using \d+% of the chart · (Safe|Careful|Stop)/.test(waText) && /PDF attached\./.test(waText), 'the WhatsApp text has plan, crane, load, radius, use, verdict: ' + JSON.stringify(waText));
  await ev(() => { window.open = window.__open0; Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' }); });
  await p.click('#sheet [data-sa="xwa"][data-kind="a1"]'); await p.waitForTimeout(400);
  const wa2 = await ev(() => ({ via: SHARE.lastWa && SHARE.lastWa.via, n: window.__sh.length, last: window.__sh[window.__sh.length - 1] }));
  ok(wa2.via === 'share' && wa2.n === 2 && wa2.last.t === 'application/pdf', 'WhatsApp on a phone: the share sheet gets the PDF');
  await ev(() => { delete navigator.userAgent; });
  // choose what goes in the report pack (stubbed here until the report module defines REPORT_SECTIONS / buildReport)
  await ev(() => {
    if (typeof REPORT_SECTIONS === 'undefined') { window.REPORT_SECTIONS = [{ id: 'cover', title: 'Cover and summary', sub: 'Page one', def: true }, { id: 'risk', title: 'Risk assessment', sub: 'Hazards and controls', def: true }, { id: 'method', title: 'Method statement', sub: 'Step by step', def: true }, { id: 'chart', title: 'Load chart', sub: 'The chart page', def: false }]; }
    window.__bi = []; const real = typeof buildReport === 'function' ? buildReport : null; window.buildReport = async (o) => { window.__bi.push(o.include); if (real) return real(o); return { blob: new Blob(['%PDF-1.3 stub'], { type: 'application/pdf' }), filename: 'stub report.pdf', pages: o.include.length }; };
    closeSheet(true); openSheet('print');
  }); await p.waitForTimeout(500);
  ok(await ev(() => !!document.querySelector('#sheet .xc[data-kind="rams"] .xc-pick') && /\d+ of \d+ parts/.test(document.querySelector('#sheet .xc-pick').textContent)), 'Report pack card has "Choose what is included"');
  ok(await ev(() => !SH.risk || (!!document.querySelector('#sheet [data-sa="open"][data-k="risk"]') && /hazard/.test(document.querySelector('#sheet [data-k="risk"] .vl')?.textContent || ''))), 'Share & print links to the risk assessment with its hazard count');
  await p.click('#sheet .xc-pick'); await p.waitForTimeout(500);
  const nSec = await ev(() => REPORT_SECTIONS.length);
  ok(await ev(() => V7.sheet.kind === 'reportPick') && await ev(() => document.querySelectorAll('#sheet [data-sa-sw="rp"]').length) === nSec, `the picker lists all ${nSec} parts`);
  await p.click('#sheet [data-sa="rpAll"]'); await p.waitForTimeout(300);
  ok(await ev(() => state.plan.reportInc.length === REPORT_SECTIONS.length), 'Everything ticks every part');
  await p.click('#sheet [data-sa="rpStd"]'); await p.waitForTimeout(300);
  ok(await ev(() => JSON.stringify(state.plan.reportInc) === JSON.stringify(REPORT_SECTIONS.filter(x => x.def).map(x => x.id)) && document.querySelectorAll('#sheet [data-sa-sw="rp"]:checked').length === REPORT_SECTIONS.filter(x => x.def).length), 'Standard set goes back to the defaults');
  await ev(() => { const i = document.querySelector('#sheet [data-sa-sw="rp"]'); i.checked = false; i.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(300);
  ok(await ev(() => Array.isArray(state.plan.reportInc) && !state.plan.reportInc.includes(REPORT_SECTIONS[0].id)), 'a part can be unticked');
  await p.click('#sheet .sh-back'); await p.waitForTimeout(500);
  ok(await ev(() => V7.sheet.kind === 'print'), 'Back returns to Share & print');
  await p.click('#sheet [data-sa="xbuild"][data-kind="rams"]'); await p.waitForSelector('#sheet .xc[data-kind="rams"] [data-sa="xsave"]', { timeout: 90000 });
  const inc = await ev(() => ({ asked: window.__bi[window.__bi.length - 1], want: state.plan.reportInc }));
  ok(JSON.stringify(inc.asked) === JSON.stringify(inc.want), 'the report was built with the chosen parts: ' + JSON.stringify(inc.asked));
  await ev(() => { state.plan.reportInc = REPORT_SECTIONS.filter(x => x.def).map(x => x.id); });
  // changing the plan makes the ready card out of date: Save / Share / Print are hidden until it is made again
  await ev(() => { state.plan.loads[0].w = 17; commit(); }); await p.waitForTimeout(700);
  ok(await ev(() => !document.querySelector('#sheet [data-sa="xsave"][data-kind="a1"]') && /changed the plan/.test(document.querySelector('#sheet [data-kind="a1"]').textContent)), 'plan changed: the card says it is out of date');
  await ev(() => { state.plan.loads[0].w = 18; commit(); closeSheet(true); }); await p.waitForTimeout(300);
  // other formats build into the same ready strip
  await ev(() => openSheet('print')); await p.waitForTimeout(400); await p.click('#sheet [data-sa="xbuild"][data-kind="dxf"]');
  await p.waitForSelector('#sheet .xs [data-sa="xsave"][data-kind="dxf"]', { timeout: 60000 });
  ok(await ev(() => /DXF/.test(document.querySelector('#sheet .xs .xc-meta').textContent) && !document.querySelector('#sheet .xs [data-sa="xprint"]')), 'DXF builds a ready strip with Save (no Print)');
  await ev(() => closeSheet(true));
  // What's new in 10: one card with a Got it button
  await ev(() => openSheet('new10')); await p.waitForTimeout(400);
  ok(await ev(() => document.querySelectorAll('#sheet .it.nw').length >= 6 && /Locked PDFs/.test(document.querySelector('#sheet').textContent)), "What's new in 10 lists the changes");
  await p.click('#sheet [data-sa="new10ok"]'); await p.waitForTimeout(300); ok(await ev(() => !V7.sheet), 'Got it closes the card');
  ok(await ev(() => APP_VERSION === '10.0'), 'version is 10.0');

  // PDF download
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 90000 }), ev(() => exportPDF('A1'))]);
  ok(/\.pdf$/.test(dl.suggestedFilename()), 'A1 PDF downloaded: ' + dl.suggestedFilename());

  // views
  for (const v of ['plan', 'sheet', 'elev']) { await p.click(`[data-act="view"][data-v="${v}"]`); await p.waitForTimeout(400); ok(await ev(() => state.view) === v, 'view ' + v); }
  ok(await ev(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'no sideways scroll');
  ok(!errs.length, 'no page errors ' + JSON.stringify(errs));
  await b.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
