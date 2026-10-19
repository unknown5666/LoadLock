const { chromium } = require('playwright'); const routes = require('./shot_login').routes;
(async () => {
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  for (const [W, H, mob] of [[1440, 900, false], [390, 844, true]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: mob, isMobile: mob, deviceScaleFactor: mob ? 2 : 1 }); const p = await ctx.newPage();
    await routes(p); await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(1500);
    const loginRes = await p.evaluate(() => [...document.querySelectorAll('button, summary, a, input, select, [role=button]')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height; }).map(e => { const n = (e.getAttribute('aria-label') || e.labels?.[0]?.textContent || e.textContent || e.title || e.placeholder || '').trim(); return n ? null : e.outerHTML.slice(0, 120); }).filter(Boolean));
    await p.evaluate(() => { authSave(false); localStorage.setItem('lp.toured', 'true'); }); await p.reload(); await p.waitForTimeout(2500);
    const out = {};
    for (const sec of ['job', 'crane', 'lift', 'site', 'weather', 'sheet']) {
      await p.evaluate((s) => setSection(s), sec); await p.waitForTimeout(300);
      const res = await p.evaluate((mob) => {
        const vis = (e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
        const els = [...document.querySelectorAll('button, summary, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=tab]')].filter(vis);
        const noName = els.filter(e => { const id = e.id; const lab = id ? document.querySelector(`label[for="${id}"]`) : null; const n = (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || (e.labels && e.labels[0] && e.labels[0].textContent) || lab?.textContent || e.textContent || e.title || e.placeholder || '').trim(); return !n; }).map(e => e.outerHTML.slice(0, 140));
        const small = mob ? els.filter(e => { const r = e.getBoundingClientRect(); return (r.width < 40 || r.height < 40) && !e.matches('input[type=range]'); }).map(e => `${e.tagName}.${[...e.classList].join('.')} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24)}"`) : [];
        const tiny = [...document.querySelectorAll('body *')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1) && vis(e) && parseFloat(getComputedStyle(e).fontSize) < 10 && !e.closest('svg')).map(e => `${e.tagName}.${[...e.classList].join('.')} ${getComputedStyle(e).fontSize} "${e.textContent.trim().slice(0, 20)}"`);
        return { noName, small: [...new Set(small)].slice(0, 30), tiny: [...new Set(tiny)].slice(0, 20) };
      }, mob);
      out[sec] = res;
    }
    console.log('=====', W, 'login unnamed:', loginRes);
    for (const [k, v] of Object.entries(out)) { if (v.noName.length || v.small.length || v.tiny.length) console.log('--', k, JSON.stringify(v, null, 1)); }
    await ctx.close();
  }
  await b.close();
})();
