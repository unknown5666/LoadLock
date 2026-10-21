// Renders the lift-side drawings (elevation, site plan, A1 sheet) for side = rear / left / right to out/side_*.png
//   node side_shots.js            -> sample 0 (hashim, LTM1250)
//   SAMPLE=1 node side_shots.js   -> another sample plan (index into SAMPLE_PLANS)
//   SIDES=rear,left node side_shots.js
// Loads the engine/drawing modules straight from src/ (no dist build needed); Chromium only rasterises the SVG.
const fs = require('fs'), vm = require('vm'), path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
const strip = s => s.replace(/\nif \(typeof module[\s\S]*$/, '\n');
const FILES = ['gen/assets', 'src/data', 'src/engine', 'src/draw', 'src/crane2d', 'src/fixes', 'src/samples', 'src/app'].filter(f => fs.existsSync(f + '.js'));
const code = FILES.map(f => strip(fs.readFileSync(f + '.js', 'utf8'))).join('\n')
  + '\nthis.X={DEFAULT_CRANES,DEFAULT_SETTINGS,SAMPLE_PLANS,normalizePlan,computePlan,buildSheet,toSVG,Prims,drawElevation,drawSitePlan,elevationExtents,DIMS_IMG,'
  + 'bestChartForSide: typeof bestChartForSide==="function"?bestChartForSide:null};';
const ctx = { console, window: {}, localStorage: { getItem() { return null; }, setItem() {} } }; vm.createContext(ctx); vm.runInContext(code, ctx);
const X = ctx.X;

function makePlan(sampleIdx, side, extra) {
  const plan = X.normalizePlan(X.SAMPLE_PLANS[sampleIdx].make());
  plan.loads[0].side = side;
  const crane = X.DEFAULT_CRANES.find(c => c.id === plan.craneId);
  if (X.bestChartForSide) plan.chartIdx = X.bestChartForSide(crane, side, plan.chartIdx);
  plan.layout = 'chart';
  // crane at the origin, the load pointing north-east; carrier heading chosen so the boom heading = carrier + side offset
  plan.sitePlan = { enabled: true, cx: 0, cy: 0, rot: 35, carrierRot: '' , ...(extra || {}) };
  plan.env = [];
  return plan;
}

(async () => {
  const sample = +(process.env.SAMPLE || 0);
  const sides = (process.env.SIDES || 'rear,left,right').split(',');
  fs.mkdirSync('out', { recursive: true });
  const b = await chromium.launch(); const page = await b.newPage();
  const shot = async (svg, w, h, file) => {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<html><body style="margin:0;background:#fff">${svg.replace('<svg', `<svg style="width:${w}px;height:${h}px;display:block"`)}</body></html>`);
    await page.screenshot({ path: file }); console.log('wrote', file);
  };
  for (const side of sides) {
    const plan = makePlan(sample, side, { rot: 35 });
    if (process.env.CARRIER) plan.sitePlan.carrierRot = +process.env.CARRIER;
    const calc = X.computePlan(plan, X.DEFAULT_CRANES, X.DEFAULT_SETTINGS);
    for (const c of X.DEFAULT_CRANES) if (c.dimsImg && X.DIMS_IMG) c.imgDims = X.DIMS_IMG[c.dimsImg];
    // A1 sheet
    const { P } = X.buildSheet(plan, calc, X.DEFAULT_SETTINGS);
    await shot(X.toSVG(P, { width: '1682', height: '1188' }), 2000, Math.round(2000 * 594 / 841), `out/side_${side}_sheet.png`);
    // elevation alone (same call the live canvas makes)
    const E = new X.Prims(); X.drawElevation(E, { x: 0, y: 0, w: 400, h: 280 }, plan, calc, 0, { livery: 'FHE' });
    await shot(X.toSVG(E, { viewBox: [0, 0, 400, 280], width: '1400', height: '980' }), 1400, 980, `out/side_${side}_elev.png`);
    // site plan alone
    const S = new X.Prims(); X.drawSitePlan(S, { x: 0, y: 0, w: 300, h: 300 }, plan, calc, { livery: 'FHE' });
    await shot(X.toSVG(S, { viewBox: [0, 0, 300, 300], width: '1000', height: '1000' }), 1000, 1000, `out/side_${side}_plan.png`);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
