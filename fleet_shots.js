// Elevation of every fleet crane -> out/fl_<id>.png (+ out/fl_<id>_head.png zoomed on the boom head with HEAD=1)
//   ONLY=id1,id2   HTML=dist/index.html   PFX=fl_   HEAD=1 (zoom on the head sheave & hook rope)
//   ALL=1  also adds one temporary crane per CAD drawing that no fleet crane uses (ids audit_<key>) so every body can be checked
const { chromium } = require('playwright'); const routes = require('./shot_login').routes;
const path = require('path'), { pathToFileURL } = require('url');
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const url = pathToFileURL(path.resolve(process.env.HTML || 'dist/index.html')).href; const pfx = process.env.PFX || 'fl_';
  await routes(p); await p.goto(url); await p.waitForTimeout(800);
  await p.evaluate(() => { authSave(false); localStorage.setItem('lp.toured', 'true'); }); await p.reload(); await p.waitForTimeout(2500);
  if (process.env.ALL) await p.evaluate(() => {
    const used = new Set(cranes().map(c => (DRAWING_ALIAS[c.drawing] || c.drawing)));
    const base = DEFAULT_CRANES.find(c => c.id === 'ltm1250');
    for (const k of Object.keys(CRANE_DRAWINGS)) if (!used.has(k)) state.userCranes['audit_' + k] = { ...base, id: 'audit_' + k, model: 'AUDIT-' + k, make: 'Liebherr', drawing: k, drawProxy: true, cls: 250 };
  });
  const ids = await p.evaluate(() => cranes().map(c => [c.id, c.make + ' ' + c.model, c.drawing || '']));
  console.log(JSON.stringify(ids));
  const only = (process.env.ONLY || '').split(',').filter(Boolean);
  for (const [id] of ids) {
    if (only.length && !only.includes(id)) continue;
    await p.evaluate((id) => { setCrane(id); $('#work').classList.add('dr-off'); setCanvasTheme && 0; Scene.dark = false; refresh(true); Scene.views = {}; sceneFit(); sceneDirty(); }, id);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `out/${pfx}${id}.png`, clip: { x: 64, y: 52, width: 1110, height: 668 } });
    if (process.env.HEAD) {
      const info = await p.evaluate(() => { const r = state.calc.loads[state.plan.activeLoad || 0]; const t = r.geo.tip; Scene.mode = 'elev'; const ppm = 80; Scene.views.elev = { ppm, x0: t.x - 7, y1: t.y + 3.6 }; sceneDirty(); return { tip: [t.x, t.y], theta: r.geo.theta, R: r.R, L: r.geo.L }; });
      await p.waitForTimeout(500);
      await p.screenshot({ path: `out/${pfx}${id}_head.png`, clip: { x: 64, y: 52, width: 1110, height: 668 } });
      console.log(id, JSON.stringify(info));
    }
  }
  console.log(errs); await b.close();
})();
