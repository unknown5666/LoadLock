// v9 end-to-end: tandem lift, Fit-Filter, net capacity, wind on the load, satellite map, RAMS pack, live 3D window, 3D drag, offline,
// speed. Real clicks, real assertions, headless (nothing on screen, no screenshots). Exits non-zero on any failure.
//   node v9_e2e.js            desktop 1440 × 900
//   W=390 H=844 node v9_e2e.js   phone
const { chromium } = require('playwright'); const { routes } = require('./shot_login'); const { pathToFileURL } = require('url'); const path = require('path'); const fs = require('fs'); const zlib = require('zlib');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
// a plain 256 × 256 PNG standing in for a satellite tile (the real ones need the internet)
function pngTile() {
  const w = 256, h = 256, raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = 90 + (x >> 3); raw[o + 1] = 110 + (y >> 3); raw[o + 2] = 80; } }
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
(async () => {
  const W = +(process.env.W || 1440), H = +(process.env.H || 900); const mobile = W < 900;
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mobile, isMobile: mobile, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await routes(p); const tile = pngTile(); let tiles = 0;
  await p.route(/server\.arcgisonline\.com/, r => { tiles++; r.fulfill({ body: tile, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' } }); });
  await p.goto(pathToFileURL(process.env.LL_HTML || path.join(process.cwd(), 'dist', 'v7.html')).href); await p.waitForTimeout(1200);
  const ev = (f, a) => p.evaluate(f, a);
  await p.click('.lg-u[data-u="Saad"]'); await p.fill('#lgPass', '786'); await p.click('#lgGo'); await p.waitForTimeout(3000);
  await ev(() => { LS.set('lp.new10', true); });
  ok(await ev(() => !document.body.classList.contains('locked')), 'signed in');
  await ev(() => { LS.set('lp.coach7', true); document.getElementById('coach')?.remove(); });
  ok(await ev(() => APP_VERSION === '10.0'), 'version 10.0');

  // ---- speed: a full recompute + redraw per change ----
  const ms = await ev(() => { const t = performance.now(); for (let i = 0; i < 30; i++) setDial('R', 12 + (i % 10) * 0.5); return (performance.now() - t) / 30; });
  ok(ms < 40, `one change recomputes and redraws in ${ms.toFixed(1)} ms`);
  console.log('     computePlan', (await ev(() => { const t = performance.now(); for (let i = 0; i < 20; i++) computePlan(state.plan, cranes(), settingsEff()); return (performance.now() - t) / 20; })).toFixed(2), 'ms in the browser');

  // ---- live 3D window over the drawing; one 3D scene moves between the window and the full view ----
  await ev(() => setView('elev')); await p.waitForTimeout(400);
  ok(await ev(() => V7.pip === matchMedia('(min-width: 900px)').matches), `live 3D window starts ${mobile ? 'off on a phone' : 'on for a desktop'}`);
  if (!(await ev(() => V7.pip))) { await p.click('[data-act="pip"]'); } await p.waitForTimeout(900);
  ok(await ev(() => !!document.querySelector('#pip.on #pipGl canvas')), 'live 3D window shows over the drawing');
  ok(await ev(() => state.twin?.host()?.id === 'pipGl'), '3D scene is in the small window');
  await ev(() => setView('3d')); await p.waitForTimeout(500); ok(await ev(() => state.twin.host().id === 'twin' && document.querySelectorAll('canvas.twin-cv').length === 1), 'full 3D view reuses the same scene (one WebGL canvas)');
  await ev(() => setView('elev')); await p.waitForTimeout(400); ok(await ev(() => state.twin.host().id === 'pipGl'), 'back to the drawing: the scene returns to the window');
  const g0 = await ev(() => state.twin.stats().geos); await ev(async () => { for (let i = 0; i < 40; i++) { setDial('R', 14 + (i % 8)); await new Promise(r => requestAnimationFrame(r)); } }); const g1 = await ev(() => state.twin.stats().geos);
  ok(g1 - g0 < 12, `no geometry leak while dragging (${g0} → ${g1} geometries over 40 changes)`);
  await p.click('[data-act="pip"]'); await p.waitForTimeout(450); ok(await ev(() => !V7.pip && (document.getElementById('pip')?.hidden || !document.getElementById('pip')?.classList.contains('on'))), 'the 3D window can be hidden'); await p.click('[data-act="pip"]'); await p.waitForTimeout(400);
  // dragging the landing ring in 3D swings the crane and sets the reach (same rules as the top view)
  const drag = await ev(() => { const sp = sitePlanState(state.plan, state.plan.loads[activeLi()]); twinPad(sp.cx + 0, sp.cy + 16, 'move'); twinPad(0, 0, 'end'); const l = state.plan.loads[activeLi()]; return { R: state.calc.loads[activeLi()].R, rot: state.plan.sitePlan.rot, by: l.by }; });
  ok(Math.abs(drag.R - 16) < 0.06 && drag.rot === 90, `3D drag: reach ${drag.R} m, boom heading ${drag.rot}°`);

  // ---- net capacity and wind on the load (Hook sheet) ----
  await ev(() => openSheet('load')); await p.waitForTimeout(500);
  ok(/Net capacity for the load/.test(await p.textContent('[data-live="netcap"]')), 'net capacity breakdown in the Hook sheet');
  await p.fill('[data-k="loads.0.area"]', '30'); await p.press('[data-k="loads.0.area"]', 'Tab'); await p.waitForTimeout(400);
  ok(await ev(() => !!state.calc.loads[0].wind && state.calc.loads[0].wind.AW === 36), 'wind area 30 m² × 1.2 counted');
  ok(/m\/s/.test(await p.textContent('[data-live="windbox"]') || ''), 'wind limit shown live');
  await ev(() => { state.plan.weather = { limit: 9.8, start: '07:00', hours: 4, manual: { wind: 12, gust: 16 }, print: true }; commit({ sheet: true }); }); await p.waitForTimeout(300);
  ok(await ev(() => state.calc.loads[0].checks.some(c => c.t === 'Wind on the load' && c.s === 'fail')), 'strong gust on a big load → FAIL');
  await ev(() => { state.plan.weather = null; state.plan.loads[0].area = ''; commit({ sheet: true }); closeSheet(true); });

  // ---- Fit-Filter ----
  await ev(() => { openSheet('crane'); }); await p.waitForTimeout(400); await p.click('[data-sa="open"][data-k="find"]'); await p.waitForTimeout(500);
  await p.fill('[data-ff="w"]', '20'); await p.fill('[data-ff="R"]', '18'); await p.fill('[data-ff="oh"]', '25'); await p.fill('[data-ff="ox"]', '12'); await p.waitForTimeout(500);
  const sum = await p.textContent('.ff-sum'); const fms = +((/in (\d+) ms/.exec(sum) || [])[1] || 99999);
  ok(fms < 1000, `Fit-Filter: "${sum.trim()}"`); ok(await p.$$eval('#ffOut .ff', a => a.length) >= 8, 'a ranked list of cranes');
  const pick = await p.$('#ffOut .ff .ff-v.ok, #ffOut .ff .ff-v.warn'); ok(!!pick, 'at least one crane can do it');
  if (pick) { const id = await pick.evaluate(e => e.closest('.ff').dataset.id); await pick.evaluate(e => e.closest('.ff').click()); await p.waitForTimeout(500);
    ok(await ev((id) => state.plan.craneId === id && state.calc.loads[0].cap != null, id), `picked ${id} with its set-up`);
    ok(await ev(() => state.plan.site.obstacles.some(o => o.label === 'OBSTRUCTION' && o.h === 25)), 'obstruction put on the drawing'); ok(await ev(() => num(state.plan.loads[0].w) === 20), 'load weight set from the finder'); }

  // ---- tandem: two cranes, live load transfer ----
  await ev(() => { closeSheet(true); openSheet('load'); }); await p.waitForTimeout(400); await p.click('[data-sa="open"][data-k="tandem"]'); await p.waitForTimeout(400);
  await p.click('[data-sa="tdmOn"][data-n="2"]'); await p.waitForTimeout(600);
  const t1 = await ev(() => { const T = state.calc.loads[activeLi()].tandem; return T && { n: T.picks.length, sum: T.picks.reduce((a, q) => a + q.share, 0), W: T.W, s0: T.picks[0].share }; });
  ok(t1 && t1.n === 2 && Math.abs(t1.sum - t1.W) < 0.02, `tandem on: ${t1?.n} cranes share ${t1?.sum.toFixed(2)} of ${t1?.W} t`);
  ok(await p.$$eval('.tdm-b', a => a.length) === 2 && !!(await p.$('.tdm-pic')), 'share bars and the side picture');
  ok(/Tandem/.test(await p.textContent('#vSub')), 'status card says Tandem');
  await ev(() => { const l = state.plan.loads[activeLi()]; l.tandem.cogH = -1.5; commit({ sheet: true }); }); await p.waitForTimeout(300);
  const sl = await p.$('[data-tm="0.hoist"]'); await sl.evaluate(e => { e.value = '0.8'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(300);
  const t2 = await ev(() => { const T = state.calc.loads[activeLi()].tandem; return { s0: T.picks[0].share, tilt: T.live?.tilt, chk: T.checks.some(c => c.t === 'Load transfer') }; });
  ok(t2.s0 > t1.s0 + 0.005 && t2.chk, `hoisting crane 1 by 0.8 m moves load onto it (${t1.s0.toFixed(2)} → ${t2.s0.toFixed(2)} t, tilt ${t2.tilt}°)`);
  ok(/tilt/.test(await p.textContent('#tdmLive')), 'live picture updates while sliding');
  await ev(() => setView('3d')); await p.waitForTimeout(700); ok(await ev(() => state.twin.stats().calls > 0), '3D view renders the tandem cranes'); await ev(() => setView('elev')); await p.waitForTimeout(300);

  // ---- RAMS pack (2 × A4) ----
  await ev(() => { closeSheet(true); openSheet('print'); }); await p.waitForTimeout(400);
  await p.click('#sheet [data-sa="xbuild"][data-kind="rams"]'); await p.waitForSelector('#sheet .xc[data-kind="rams"] [data-sa="xsave"]', { timeout: 120000 });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('#sheet [data-sa="xsave"][data-kind="rams"]')]);
  const fp = await dl.path(); const pdf = fs.readFileSync(fp); const info = await ev(() => state.lastRams);
  fs.mkdirSync('out', { recursive: true }); fs.writeFileSync(path.join('out', mobile ? 'rams_e2e_phone.pdf' : 'rams_e2e.pdf'), pdf); // rams_check.js reads it
  ok(pdf.slice(0, 4).toString() === '%PDF' && pdf.length > 40000, `RAMS PDF: ${(pdf.length / 1024).toFixed(0)} kB, ${dl.suggestedFilename()}`);
  const nPages = (pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length;
  ok(nPages >= 2 && (!info || !info.pages || info.pages === nPages), `report pack has ${nPages} pages`);
  // v10 locked PDFs: opens without a password, prints, but no copy / edit; text, fonts and images still read back with pdfjs
  try {
    const pdfjs = require('pdfjs-dist/legacy/build/pdf.js'); const d = await pdfjs.getDocument({ data: new Uint8Array(pdf), verbosity: 0 }).promise;
    const perms = await d.getPermissions(); const pg1 = await d.getPage(1); const tc = await pg1.getTextContent(); const text = tc.items.map(x => x.str).join(' ');
    ok(/\/Encrypt/.test(pdf.toString('latin1')) && perms.includes(4) && !perms.includes(16) && !perms.includes(8), 'report pack is locked: print allowed, copy and edit off (permissions ' + JSON.stringify(perms) + ')');
    ok(d.numPages === nPages && text.length > 300 && /controlled copy/.test(text), `the locked PDF reads back: ${d.numPages} pages, ${text.length} characters on page 1, watermark present`);
    const ops = await pg1.getOperatorList(); ok(ops.fnArray.some(f => f === pdfjs.OPS.paintImageXObject || f === pdfjs.OPS.paintJpegXObject), 'images survive the lock');
  } catch (e) { ok(false, 'pdfjs could not read the locked PDF: ' + e.message); }
  ok(info && info.shot, '3D still included'); console.log('     RAMS built in', info?.ms, 'ms (headless software rendering)');
  ok(info && info.ms < 3000, `RAMS pack in under 3 s (${info?.ms} ms)`);
  await ev(() => { const l = state.plan.loads[activeLi()]; l.tandem.on = false; commit({ sheet: true }); closeSheet(true); });

  // ---- satellite map (tiles served locally) ----
  await ev(() => openSheet('map')); await p.waitForTimeout(400);
  await p.fill('#mapQ', '24.4539, 54.3773'); await p.click('[data-sa="mapSearch"]'); await p.waitForTimeout(300);
  ok(/24\.45390, 54\.37730/.test(await p.textContent('#shB')), 'coordinates accepted');
  await p.click('[data-sa="mapGo"]'); await p.waitForFunction(() => (state.plan.env || []).some(e => e.geo), null, { timeout: 20000 }).catch(() => {});
  const m = await ev(() => { const e = state.plan.env.find(x => x.geo); return e && { sc: e.sc, w: e.w, z: e.geo.z, view: state.view, img: !!ENV_CACHE[e.id]?.img, mpp: GIS.mpp(24.4539, e.geo.z) }; });
  ok(m && m.img && m.view === 'plan', `satellite map under the top view (${tiles} tiles, zoom ${m?.z})`); ok(m && Math.abs(m.sc - m.mpp) < 1e-9 && Math.abs(m.sc * m.w - 200) < 1, `true scale: ${m?.sc?.toFixed(4)} m per pixel × ${m?.w} px = 200 m`);

  // ---- ground pressure units ----
  await ev(() => { state.settings.pUnit = 'psi'; state.plan.outrigger = { ...state.plan.outrigger, enabled: true, allow: 20 }; commit(); openSheet('legs'); }); await p.waitForTimeout(400);
  ok(/psi/.test(await p.textContent('#shB')), 'ground pressure shown in psi'); ok(!!(await p.$('.gbp-v .gbp-chip')), 'PASS / FAIL chip for the ground'); await ev(() => { state.settings.pUnit = 't'; closeSheet(true); });

  // ---- offline ----
  await ctx.setOffline(true); await p.waitForTimeout(300); ok(await ev(() => document.getElementById('netChip')?.classList.contains('on')), 'offline chip shows without signal');
  await ctx.setOffline(false); await p.waitForTimeout(300); ok(await ev(() => !document.getElementById('netChip')?.classList.contains('on')), 'chip goes when the signal is back');
  ok(await ev(() => !!localStorage.getItem('lp.draft')), 'the draft is kept on the device');

  if (mobile) ok(await ev(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no sideways scroll on the phone');
  ok(!errs.length, 'no page errors ' + JSON.stringify(errs.slice(0, 3)));
  await b.close();
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
