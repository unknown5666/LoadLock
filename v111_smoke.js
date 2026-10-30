// v11.1 smoke test of the deployable, scrambled copy, driven only through the screen as a person would, on a local server. Same bytes as production.
//   node v111_smoke.js       exit 1 on failure       W=390 H=844 for a phone
const { chromium } = require('playwright'); const { routes } = require('./shot_login'); const http = require('http'); const fs = require('fs');
const CODES = { Saad: '786', Habib: '12911' }; const W = +(process.env.W || 1440), H = +(process.env.H || 900), mobile = W < 900;
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
(async () => {
  const srv = http.createServer((q, r) => { if (q.url === '/') { r.writeHead(200, { 'content-type': 'text/html' }); r.end(fs.readFileSync('public/index.html')); } else { r.writeHead(404); r.end(); } }); await new Promise(r => srv.listen(0, '127.0.0.1', r)); const url = `http://127.0.0.1:${srv.address().port}/`;
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  for (const u of ['Saad', 'Habib']) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mobile, isMobile: mobile, serviceWorkers: 'block' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { const B = window.Blob; window.__pdf = null; window.Blob = class extends B { constructor(parts, o) { super(parts, o); if (o && o.type === 'application/pdf' && this.size > 20000) window.__pdf = this; } }; });
    await routes(p); await p.goto(url); await p.waitForTimeout(1500);
    await p.click(`.lg-u[data-u="${u}"]`); await p.fill('#lgPass', CODES[u]); await p.click('#lgGo'); await p.waitForTimeout(3000);
    ok(await p.evaluate(() => !document.body.classList.contains('locked')), `${u} signs in`);
    await p.click('[data-act="more"]'); await p.waitForTimeout(400); await p.click('[data-sa="page"][data-v="plans"]'); await p.waitForTimeout(500); await p.click('[data-pg="new"]'); await p.waitForTimeout(600);
    ok(await p.isVisible('.wz-q'), `${u}: new plan opens the wizard`);
    await p.fill('[data-w="company"]', 'City Star Cranes'); await p.fill('[data-w="project"]', 'Smoke test'); await p.click('[data-wa="next"]'); await p.waitForTimeout(150); await p.click('[data-wa="next"]'); await p.waitForTimeout(150);
    await p.click('[data-wa="set"][data-v="stc1000m"]'); await p.waitForTimeout(150); await p.click('[data-wa="next"]'); await p.waitForTimeout(150); await p.fill('[data-w="w"]', '5'); await p.fill('[data-w="R"]', '14'); await p.click('[data-wa="next"]'); await p.waitForTimeout(150); await p.click('[data-wa="next"]'); await p.waitForTimeout(150); await p.click('[data-wa="finish"]'); await p.waitForTimeout(1200);
    // the crane sheet: outrigger chips move the chart
    await p.click('[data-act="more"]').catch(() => {}); await p.waitForTimeout(300); await p.evaluate(() => document.querySelector('#scrim')?.click()); await p.waitForTimeout(400);
    const vw = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); ok(vw <= 1, `${u}: no sideways scroll at ${W} px`);
    await p.click('#bPdf'); await p.waitForTimeout(700); await p.click('[data-sa="xbuild"][data-kind="rams"]').catch(() => {}); await p.waitForTimeout(800);
    for (let i = 0; i < 2; i++) if (await p.locator('[data-sa="docsGo"]').count()) { await p.locator('[data-sa="docsGo"]').first().click(); await p.waitForTimeout(500); }
    await p.waitForFunction(() => !!window.__pdf, null, { timeout: 60000 }).catch(() => {});
    const r = await p.evaluate(async () => { if (!window.__pdf) return null; const u8 = new Uint8Array(await window.__pdf.arrayBuffer()); return { n: u8.length, s: String.fromCharCode(...u8.subarray(0, 8)), raw: Array.from(u8, c => String.fromCharCode(c)).join('') }; });
    ok(!!r && r.s.startsWith('%PDF'), `${u}: report PDF built (${r ? r.n : 0} bytes)`);
    if (r) { ok(!/LoadLock|jsPDF|Lift Planner|Friendship/i.test(r.raw), `${u}: no tool name in the raw PDF`); fs.writeFileSync(`out/smoke_${u}.pdf`, Buffer.from(r.raw, 'latin1')); }
    ok(errs.length === 0, `${u}: no page errors ${JSON.stringify(errs.slice(0, 3))}`); await ctx.close();
  }
  await b.close(); srv.close(); console.log(fail ? fail + ' FAILED' : 'all passed'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
