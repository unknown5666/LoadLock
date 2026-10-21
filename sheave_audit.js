// Sheave audit: for every CAD drawing, list circle-like items near the boom head and render a zoomed boom-frame crop.
// usage: node sheave_audit.js            -> prints circle candidates per drawing, writes out/sheave/head_<key>.png
//        node sheave_audit.js nopng      -> data only
//        ONLY=ltm1500,ztc300v node sheave_audit.js
//        FIXED=1 node sheave_audit.js    -> apply SHEAVE_FIX (src/fixes.js) before drawing, marks files head_<key>_fixed.png
const fs = require('fs'), vm = require('vm');
const strip = s => s.replace(/\nif \(typeof module[\s\S]*$/, '\n');
const fixed = !!process.env.FIXED;
const files = ['gen/assets.js', 'src/data.js', 'src/engine.js']; if (fixed) files.push('src/fixes.js');
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(files.map(f => strip(fs.readFileSync(f, 'utf8'))).join('\n') + '\nthis.CD=CRANE_DRAWINGS;this.AL=DRAWING_ALIAS;', ctx);
const CD = ctx.CD;
const only = (process.env.ONLY || '').split(',').filter(Boolean);
// circle detection on a polyline (cm integer points): closed-ish, many points, constant radius
function circ(pts) {
  const n = pts.length / 2; if (n < 8) return null; let cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i += 2) { cx += pts[i]; cy += pts[i + 1]; } cx /= n; cy /= n;
  const r = []; for (let i = 0; i < pts.length; i += 2) r.push(Math.hypot(pts[i] - cx, pts[i + 1] - cy));
  const m = r.reduce((a, b) => a + b, 0) / n; const sd = Math.sqrt(r.reduce((a, b) => a + (b - m) ** 2, 0) / n);
  const gap = Math.hypot(pts[0] - pts[pts.length - 2], pts[1] - pts[pts.length - 1]);
  if (m < 6 || sd / m > 0.06) return null;
  return { cx, cy, r: m, closed: gap < m * 0.4 };
}
const out = {};
for (const [key, d] of Object.entries(CD)) {
  if (only.length && !only.includes(key)) continue;
  const cands = [];
  (d.secs || []).forEach((s, si) => (s.items || []).forEach(([f, c, pts]) => { const c0 = circ(pts); if (c0 && c0.r > 8) cands.push({ sec: si, f, s: c0.cx / 100, n: c0.cy / 100, r: c0.r / 100, closed: c0.closed, pts: pts.length / 2 }); }));
  const last = d.secs && d.secs[d.secs.length - 1];
  console.log(`\n== ${key}  tip=[${d.tip}] tipR=${d.tipR} lattice=${d.lattice} secs=${d.secs ? d.secs.length : 0} last=${last ? [last.s0, last.s1, last.n0, last.n1].join(',') : '-'}`);
  const nearHead = cands.filter(c => c.s > d.tip[0] - 4.5 && c.s < d.tip[0] + 2.5);
  nearHead.sort((a, b) => b.s - a.s);
  for (const c of nearHead) console.log(`   sec${c.sec} circ s=${c.s.toFixed(2)} n=${c.n.toFixed(2)} r=${c.r.toFixed(2)} ${c.closed ? 'closed' : 'open'} pts=${c.pts} fill=${c.f}`);
  out[key] = { d, cands: nearHead };
}
fs.writeFileSync('out/sheave/_cands.json', JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { tip: v.d.tip, tipR: v.d.tipR, cands: v.cands }]))));
if (process.argv[2] === 'nopng') process.exit(0);
// ---- render crops (boom frame, retracted) to PNG with Playwright ----
const { chromium } = require('playwright');
function svgFor(key, d, cands, W = 1000, Hh = 700) {
  let s0 = d.tip[0] - 4.2, s1 = d.tip[0] + 1.8, n0 = d.tip[1] - 3.2, n1 = d.tip[1] + 3.2;
  if (process.env.WIN) [s0, s1, n0, n1] = process.env.WIN.split(',').map(Number);
  const sc = Math.min(W / (s1 - s0), Hh / (n1 - n0));
  const X = s => (s - s0) * sc, Y = n => (n1 - n) * sc;
  let g = '';
  const pal = d.pal;
  for (let si = d.secs.length - 1; si >= 0; si--) for (const [f, c, pts] of d.secs[si].items) {
    let p = ''; for (let i = 0; i < pts.length; i += 2) p += (i ? 'L' : 'M') + X(pts[i] / 100).toFixed(1) + ',' + Y(pts[i + 1] / 100).toFixed(1);
    g += `<path d="${p}" fill="${f ? pal[c] : 'none'}" fill-opacity="0.5" stroke="${pal[c] === '#ffffff' ? '#888' : pal[c]}" stroke-width="1.2"/>`;
  }
  if (process.env.BODY) { // body in the boom frame (grey), to spot head parts that were classed as body
    const th = d.theta0 * Math.PI / 180, ux = Math.cos(th), uy = Math.sin(th);
    for (const [f, c, pts] of d.body) { let p = ''; for (let i = 0; i < pts.length; i += 2) { const x = pts[i] / 100 - d.pivot[0], y = pts[i + 1] / 100 - d.pivot[1]; const ss = x * ux + y * uy, nn = -x * uy + y * ux; p += (i ? 'L' : 'M') + X(ss).toFixed(1) + ',' + Y(nn).toFixed(1); } g += `<path d="${p}" fill="none" stroke="#6a6" stroke-width="1"/>`; }
  }
  // grid ticks every metre
  for (let s = Math.ceil(s0); s <= s1; s++) g += `<line x1="${X(s)}" y1="0" x2="${X(s)}" y2="${Hh}" stroke="#ddd" stroke-width="0.5"/><text x="${X(s) + 2}" y="12" font-size="11" fill="#999">${s}</text>`;
  for (let n = Math.ceil(n0); n <= n1; n++) g += `<line x1="0" y1="${Y(n)}" x2="${W}" y2="${Y(n)}" stroke="${n === 0 ? '#aaa' : '#ddd'}" stroke-width="${n === 0 ? 1 : 0.5}"/><text x="2" y="${Y(n) - 2}" font-size="11" fill="#999">n=${n}</text>`;
  // candidate circles (blue), current tip (red)
  cands.forEach((c, i) => { g += `<circle cx="${X(c.s)}" cy="${Y(c.n)}" r="${c.r * sc}" fill="none" stroke="#1a5fd0" stroke-width="2" stroke-dasharray="4 3"/><text x="${X(c.s) + c.r * sc + 3}" y="${Y(c.n) + 4}" font-size="12" fill="#1a5fd0">c${i} (${c.s.toFixed(2)},${c.n.toFixed(2)}) r${c.r.toFixed(2)}</text>`; });
  g += `<circle cx="${X(d.tip[0])}" cy="${Y(d.tip[1])}" r="${(d.tipR || 0.4) * sc}" fill="rgba(255,0,0,0.12)" stroke="red" stroke-width="2"/><path d="M${X(d.tip[0]) - 8},${Y(d.tip[1])}h16M${X(d.tip[0])},${Y(d.tip[1]) - 8}v16" stroke="red" stroke-width="2"/>`;
  g += `<text x="${W - 4}" y="${Hh - 6}" font-size="13" text-anchor="end" fill="#000">${key}${fixed ? ' (FIXED)' : ''} tip=[${d.tip}] R=${d.tipR}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}"><rect width="${W}" height="${Hh}" fill="#fff"/>${g}</svg>`;
}
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  for (const [key, v] of Object.entries(out)) {
    if (!v.d.secs) { console.log('skip (lattice)', key); continue; }
    await p.setContent('<body style="margin:0">' + svgFor(key, v.d, v.cands) + '</body>');
    await p.screenshot({ path: `out/sheave/head_${key}${process.env.WIN ? '_zoom' : ''}${fixed ? '_fixed' : ''}.png` });
  }
  await b.close(); console.log('done');
})();
