const { chromium } = require('playwright'); const fs = require('fs');
const T3 = (() => { const d = require('path').join(__dirname, 'node_modules', 'three'); return fs.existsSync(d + '/build/three.min.js') ? d : null; })();
const routes = require('./shot_login').routes;
const W = +(process.env.W || 1440), H = +(process.env.H || 900);
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, acceptDownloads: true, colorScheme: 'dark' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('PAGE ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n'))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await routes(p); await p.goto('file://' + process.cwd() + '/dist/index.html');
  await p.waitForTimeout(3000); await p.screenshot({ path: 'out/v5_login.png' });
  console.log('login visible', await p.isVisible('#lgForm'), 'webgl', await p.evaluate(() => C3D.ok()), 'hud', await p.textContent('#lgTh'));
  await p.fill('#lgPass', '1234'); await p.press('#lgPass', 'Enter'); await p.waitForTimeout(300);
  console.log('wrong pw ->', await p.textContent('#lgErr'));
  await p.screenshot({ path: 'out/v5_login_bad.png' });
  await p.fill('#lgPass', '12911'); await p.press('#lgPass', 'Enter'); await p.waitForTimeout(600); await p.screenshot({ path: 'out/v5_login_ok.png' });
  await p.waitForTimeout(2600);
  console.log('app on', await p.evaluate(() => document.body.className), 'login hidden', await p.evaluate(() => document.getElementById('login').hidden));
  await p.screenshot({ path: 'out/v5_studio.png' });
  // crane section
  await p.click('.ri[data-sec="crane"]').catch(() => {}); await p.waitForTimeout(300);
  console.log('drawer', await p.textContent('#drHead h2'));
  await p.screenshot({ path: 'out/v5_crane.png' });
  // manual telescope via console track
  await p.click('#console [data-dk="secs"]'); await p.waitForTimeout(300);
  const tr = await p.locator('.ttrack[data-ti="1"]').boundingBox();
  await p.mouse.move(tr.x + tr.width / 2, tr.y + tr.height - 2); await p.mouse.down(); await p.mouse.move(tr.x + tr.width / 2, tr.y + 4, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(300);
  console.log('tele', await p.evaluate(() => JSON.stringify([state.plan.tele, state.calc.loads[0].tele.L, state.calc.loads[0].geo.L])));
  await p.screenshot({ path: 'out/v5_tele.png' });
  await p.click('.tpre [data-v="1"]'); await p.waitForTimeout(300); console.log('full', await p.evaluate(() => [state.calc.loads[0].tele.L, state.calc.loads[0].spec.Lmax]));
  await p.click('.tpre [data-v="0"]'); await p.waitForTimeout(300); console.log('retract', await p.evaluate(() => [state.calc.loads[0].tele.L, state.calc.loads[0].spec.Lmin]));
  await p.click('#console [data-act="teleMode"][data-v="auto"]'); await p.waitForTimeout(300); console.log('auto', await p.evaluate(() => [state.plan.tele.mode, state.plan.boomOverride, state.plan.colIdx]));
  // accessories
  const accs = await p.evaluate(() => [...document.querySelectorAll('[data-cacc]')].map(b => b.dataset.cacc)); console.log('acc buttons', accs);
  if (accs.includes('flyjib')) { await p.click('[data-cacc="flyjib"]'); await p.waitForTimeout(300); console.log('fly', await p.evaluate(() => [state.plan.attach.type, state.calc.loads[0].geo.kind])); await p.screenshot({ path: 'out/v5_fly.png' }); await p.click('[data-cacc="flyjib"]'); await p.waitForTimeout(200); }
  // switch to a superlift crane
  await p.evaluate(() => { setCrane('ac700'); renderDrawer(); refresh(true); }); await p.waitForTimeout(300);
  await p.click('[data-cacc="superlift"]'); await p.waitForTimeout(300); console.log('superlift', await p.evaluate(() => state.calc.loads[0].acc.superlift));
  await p.click('[data-act="fit"]'); await p.waitForTimeout(300); await p.screenshot({ path: 'out/v5_superlift.png' });
  // weather
  await p.click('.ri[data-sec="weather"]'); await p.waitForTimeout(200); await p.click('[data-act="wxOn"]'); await p.waitForTimeout(200);
  await p.fill('#wxQ', 'Musaffah'); await p.click('[data-act="wxSearch"]'); await p.waitForTimeout(800);
  console.log('wx blocked msg', (await p.textContent('#drBody')).includes("can't load"));
  await p.fill('#f-weather\\.manual\\.wind', '8'); await p.fill('#f-weather\\.manual\\.gust', '11'); await p.fill('#f-weather\\.manual\\.rain', '20'); await p.waitForTimeout(400);
  console.log('wx calc', await p.evaluate(() => JSON.stringify(state.calc.weather && { s: state.calc.weather.status, w: state.calc.weather.maxW, g: state.calc.weather.maxG, tip: state.calc.weather.tipH })));
  await p.screenshot({ path: 'out/v5_weather.png' });
  // live forecast via injected data
  await p.evaluate(() => { const W = state.plan.weather; const t = [], ws = []; for (let d = 0; d < 2; d++) for (let hh = 0; hh < 24; hh++) { t.push(`2026-10-${19 + d}T${String(hh).padStart(2, '0')}:00`); ws.push(3 + 4 * Math.sin(hh / 4)); }
    Object.assign(W, { place: 'Musaffah, Abu Dhabi', lat: 24.35, lon: 54.5, date: '2026-10-19', fetched: '18 Oct 21:00', hourly: { time: t, ws10: ws, ws80: ws.map(v => v * 1.3), ws120: ws.map(v => v * 1.4), ws180: ws.map(v => v * 1.5), gust10: ws.map(v => v * 1.6), dir: ws.map(() => 310), pp: ws.map((v, i) => (i * 7) % 90), pr: ws.map(() => 0), code: ws.map((v, i) => i === 15 ? 95 : 2), temp: ws.map(() => 31) } });
    renderDrawer(); refresh(true); });
  await p.waitForTimeout(400); await p.screenshot({ path: 'out/v5_weather_live.png' });
  console.log('wx live', await p.evaluate(() => JSON.stringify({ s: state.calc.weather.status, g: state.calc.weather.maxG, rows: state.calc.weather.rows.length, msgs: state.calc.weather.msgs })));
  // 3D
  await p.click('#vsw [data-view="3d"]'); await p.waitForTimeout(2500); await p.screenshot({ path: 'out/v5_3d.png' });
  // sheet
  await p.click('#vsw [data-view="sheet"]'); await p.waitForTimeout(900); await p.screenshot({ path: 'out/v5_sheet.png' });
  await p.click('#vsw [data-view="plan"]'); await p.waitForTimeout(500); await p.screenshot({ path: 'out/v5_plan.png' });
  await p.click('#vsw [data-view="elev"]'); await p.waitForTimeout(300);
  // pages
  await p.click('.ri[data-page="fleet"]'); await p.waitForTimeout(400); await p.screenshot({ path: 'out/v5_fleet.png' });
  await p.click('.ri[data-page="plans"]'); await p.waitForTimeout(300); await p.screenshot({ path: 'out/v5_plans.png' });
  await p.click('.ri[data-page="settings"]'); await p.waitForTimeout(300); await p.screenshot({ path: 'out/v5_settings.png' });
  await p.click('[data-pact="close"]'); await p.waitForTimeout(300);
  // export
  const [d1] = await Promise.all([p.waitForEvent('download', { timeout: 90000 }), (async () => { await p.click('#bPdf'); await p.click('.menu-pop [data-top="pdf"]'); })()]); await d1.saveAs('out/v5_a1.pdf'); console.log('a1', d1.suggestedFilename());
  console.log('errors', errs.slice(0, 12)); await b.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
