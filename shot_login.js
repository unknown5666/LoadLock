const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
// three@0.147.0 from node_modules (npm i -D three@0.147.0); fonts are optional — set FONTS_DIR to a folder with the two fontsource woff2 packages, otherwise system fonts are used
const T3 = (() => { const d = path.join(__dirname, 'node_modules', 'three'); return fs.existsSync(path.join(d, 'build', 'three.min.js')) ? d : null; })();
const FN = process.env.FONTS_DIR || path.join(__dirname, 'test-fonts');
const fontCSS = `@font-face{font-family:'Archivo';font-style:normal;font-weight:100 900;font-stretch:62% 125%;src:url(file://${FN}/fontsource-variable-archivo-5.3.0/package/files/archivo-latin-standard-normal.woff2) format('woff2-variations');}
@font-face{font-family:'Martian Mono';font-style:normal;font-weight:100 800;font-stretch:75% 112.5%;src:url(file://${FN}/fontsource-variable-martian-mono-5.3.0/package/files/martian-mono-latin-standard-normal.woff2) format('woff2-variations');}`;
const haveFonts = fs.existsSync(FN);
module.exports.routes = async (p) => {
  await p.route(/cdn\.jsdelivr\.net\/npm\/jspdf/, r => r.fulfill({ path: 'node_modules/jspdf/dist/jspdf.umd.min.js', contentType: 'text/javascript' }));
  await p.route(/svg2pdf/, r => r.fulfill({ path: 'node_modules/svg2pdf.js/dist/svg2pdf.umd.min.js', contentType: 'text/javascript' }));
  await p.route(/jszip/, r => r.fulfill({ path: 'node_modules/jszip/dist/jszip.min.js', contentType: 'text/javascript' }));
  await p.route(/three@0\.147\.0\/(.*)$/, r => { if (!T3) return r.abort(); const m = /three@0\.147\.0\/(.*)$/.exec(r.request().url()); r.fulfill({ path: T3 + '/' + m[1], contentType: 'text/javascript' }); });
  await p.route(/fonts\.googleapis/, r => r.fulfill({ body: haveFonts ? fontCSS : '', contentType: 'text/css' }));
  await p.route(/open-meteo\.com/, r => r.abort('blockedbyclient'));
};
if (require.main === module) (async () => {
  const W = +(process.env.W || 1440), H = +(process.env.H || 900);
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, colorScheme: 'dark' }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await module.exports.routes(p); await p.goto('file://' + process.cwd() + '/dist/index.html');
  for (const t of (process.env.TS || '3,9,16').split(',').map(Number)) { await p.waitForFunction((tt) => performance.now() > tt * 1000, t, { timeout: 120000 }); await p.screenshot({ path: `out/login_${W}_${t}.png` }); }
  console.log('errors', errs); await b.close();
})();
