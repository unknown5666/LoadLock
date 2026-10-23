// Smoke test for the scrambled deploy copy (public/index.html): it loads, signs in, every view draws,
// and no page errors. Internals are private there, so this only uses real clicks. Exit 1 on failure.
//   node protect_smoke.js            (W=390 H=844 for the phone)
const { chromium } = require('playwright'); const { routes } = require('./shot_login'); const { pathToFileURL } = require('url'); const path = require('path'); const fs = require('fs');
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const W = +(process.env.W || 1440), H = +(process.env.H || 900); const mobile = W < 900;
  const file = process.env.LL_HTML || path.join(process.cwd(), 'public', 'index.html');
  const src = fs.readFileSync(file, 'utf8');
  ok(!/function computePlan|function exportRAMS|function drawElevation/.test(src), 'app code is scrambled');
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mobile, isMobile: mobile, acceptDownloads: true });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await routes(p); await p.goto(pathToFileURL(file).href); await p.waitForTimeout(1500);
  ok(await p.isVisible('#lgPass'), 'sign-in shows');
  await p.click('.lg-u[data-u="Saad"]'); await p.fill('#lgPass', '786'); await p.click('#lgGo'); await p.waitForTimeout(3000);
  ok(await p.evaluate(() => !document.body.classList.contains('locked')), 'signed in');
  for (const k of ['1', '2', '3', '4']) { await p.keyboard.press(k); await p.waitForTimeout(700); }
  await p.screenshot({ path: 'out/protect_smoke.png' });
  ok(errs.length === 0, 'no page errors ' + JSON.stringify(errs.slice(0, 3)));
  await b.close(); console.log(fails ? `${fails} FAILED` : 'all passed'); process.exit(fails ? 1 : 0);
})();
