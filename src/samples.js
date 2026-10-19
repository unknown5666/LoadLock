// ===== Example plans recreated from FHE sample sheets =====
const today = () => { const d = new Date(); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear(); };
function blankPlan() {
  return {
    id: null, name: 'New lifting plan', layout: 'chart',
    meta: { client: '', project: '', title: '', drawingNo: '', sheetNo: '01', scale: '', drawnBy: 'HABIB', checkedBy: '', date: today(), revs: [] },
    craneId: 'ltm1250', chartIdx: 0, colIdx: 6, boomOverride: '', config: null, cwt: null, falls: 4, matSize: '2.5x2.5m', wind: '7M/S',
    hookAllowance: 3, mergeHook: false, activeLoad: 0, secondLoad: 1,
    site: { groundType: 'ground', stepX: '', targetGround: 0, obstacles: [] },
    loads: [{ name: '', w: 10, cont: 0, hb: 1.5, tk: 0.6, extra: 0, R: 20, l: 3, h: 2, rigH: 3, shape: 'box', colIdx: '', capOverride: '', landY: '' }],
    outrigger: { enabled: false, maxLoad: '', matSelf: 0.5, mat: '', allow: '' },
    rigging: { enabled: false, loadIdx: 0, legs: 4, effLegs: 3, slingL: 6, spread: 3, slingWLL: 10, shackleWLL: 12, slingDesc: '', shackleDesc: '', height: 3 },
    extraNotes: ''
  };
}
const SAMPLE_PLANS = [
  { key: 'hashim', label: 'LTM1250 · precast panels over building (Al Deem School)', make: () => ({ ...blankPlan(), name: 'Hashim — Al Deem School precast',
    meta: { client: 'Hashim Contracting', project: 'Al Deem School', title: 'Lifting precast panels', sheetNo: '01', drawnBy: 'HABIB', checkedBy: 'NOFAL', date: '15/10/2026', revs: [] },
    craneId: 'ltm1250', chartIdx: 2, colIdx: 6, falls: 4, matSize: '2.5x2.5m', wind: '7M/S', config: 'T', cwt: 72.5,
    site: { groundType: 'ground', obstacles: [{ type: 'building', x: 12, w: 26, h: 2.4, label: '' }] },
    loads: [{ name: 'Precast panel', w: 13, cont: 20, hb: 1.5, tk: 0.6, extra: 0, R: 28, l: 7, h: 0.4, rigH: 6, shape: 'box', colIdx: '', capOverride: '', landY: '' }] }) },
  { key: 'elswedey', label: 'STC500 · cable drums onto trailer (El Swedey)', make: () => ({ ...blankPlan(), name: 'El Swedey — 33kV cable drums',
    meta: { client: 'El Swedey', title: 'Lifting 33KV cable drums', sheetNo: '01', drawnBy: 'HABIB', checkedBy: 'HABIB', date: '08/10/2026', revs: [] },
    craneId: 'stc500', chartIdx: 0, colIdx: 4, falls: 6, matSize: '1.0x1.0m', wind: '', config: 'MAINBOOM', cwt: 3.5,
    site: { groundType: 'ground', obstacles: [{ type: 'trailer', x: 5.2, w: 13.6, h: 1.4, label: 'LOW-BED TRAILER' }] },
    loads: [{ name: '', w: 8.6, cont: 0, hb: 0.7, tk: 0.6, extra: 0, R: 9, l: 2.6, h: 2.6, rigH: 3.5, shape: 'drum', colIdx: '', capOverride: '', landY: '' }] }) },
  { key: 'emcc', label: 'ZTC1000V · AC unit onto roof + outrigger pressure (EMCC)', make: () => ({ ...blankPlan(), name: 'EMCC — AC unit',
    meta: { client: 'EMCC', title: 'Lifting AC unit', sheetNo: '01', drawnBy: 'HABIB', checkedBy: 'HNIFA', date: '11/09/2026', revs: [] },
    craneId: 'ztc1000v', chartIdx: 0, colIdx: 2, falls: 4, matSize: '1.0x1.0m', wind: '7M/S', config: '', cwt: 23,
    site: { groundType: 'ground', obstacles: [{ type: 'building', x: 8, w: 22, h: 12, label: 'BUILDING' }] },
    loads: [{ name: '', w: 3, cont: 0, hb: 0.7, tk: 1.0, extra: 0, R: 22, l: 2.4, h: 2.2, rigH: 4, shape: 'box', colIdx: '', capOverride: '', landY: '' }],
    outrigger: { enabled: true, maxLoad: 66.95, matSelf: 0.05, mat: '1.0x1.0', allow: '' } }) },
  { key: 'zakir', label: 'AC500 WIHI luffing jib · container at Khalifa Port', make: () => ({ ...blankPlan(), name: 'Zakir Marine — container (luffing jib)', layout: 'chart',
    meta: { client: 'Zakir Marine', title: 'Container lifting - Khalifa Port', titleRed: true, sheetNo: '01', drawnBy: 'HABIB', checkedBy: '', date: '17/08/2025', revs: [] },
    craneId: 'ac500', chartIdx: 0, colIdx: 0, falls: 2, matSize: '2.5x2.5m', wind: '7M/S', config: 'WIHI', cwt: 180,
    site: { groundType: 'ground', obstacles: [{ type: 'building', x: 8, w: 40, h: 5, label: 'QUAY / PLATFORM' }] },
    loads: [{ name: '', w: 23, cont: 0, hb: 0.75, tk: 0.6, extra: 0, R: 44, l: 6.1, h: 2.6, rigH: 5, shape: 'container', colIdx: '', capOverride: '', landY: '' }] }) },
  { key: 'transformer', label: 'AC500 · 43 t transformer with rigging & sling tension', make: () => ({ ...blankPlan(), name: '43T transformer', layout: 'rigging',
    meta: { client: '', title: 'Transformer lifting', sheetNo: '01', drawnBy: 'HABIB', checkedBy: 'CLIENT', date: '25/08/2026', revs: [] },
    craneId: 'ac500', chartIdx: -1, colIdx: 0, boomOverride: 33.2, falls: 6, matSize: '2.5x2.5m', wind: '', config: 'HA', cwt: 160,
    site: { groundType: 'ground', obstacles: [] },
    loads: [{ name: 'Transformer', w: 43, cont: 0, hb: 2.6, tk: 0.6, extra: 0, R: 20, l: 4.2, h: 3.0, rigH: 9.5, shape: 'box', colIdx: '', capOverride: 72, landY: '' }],
    rigging: { enabled: true, loadIdx: 0, legs: 4, effLegs: 3, slingL: 10, spread: 3.2, slingWLL: 20, shackleWLL: 25, slingDesc: "10m x 20t round webbing sling - 4No's", shackleDesc: "25t BOW SHACKLE - 4No's", height: 9.5 } }) },
  { key: 'tc', label: 'LTM1500 · tower crane erection, 2 loads side by side', make: () => ({ ...blankPlan(), name: 'Tower crane erection — 2 loads', layout: 'elev2',
    meta: { client: 'Brutplace', project: 'Al Raha', title: 'Tower crane lifting', sheetNo: '01', drawnBy: 'HABIB', checkedBy: '', date: today(), revs: [] },
    craneId: 'ltm1500', chartIdx: 0, colIdx: 7, falls: 2, matSize: '2.5x2.5m', wind: '9M/S', config: 'T', cwt: 135, mergeHook: true,
    site: { groundType: 'ground', obstacles: [{ type: 'towercrane', x: 26, w: 2, mastW: 2, h: 16, topH: 3, label: 'TOWER CRANE MAST' }] },
    loads: [
      { name: 'Slewing unit & cathead', w: 11, cont: 0, hb: 1.4, tk: 0.6, extra: 0, R: 26, l: 3, h: 4, rigH: 5, shape: 'tc', colIdx: '', capOverride: '', landY: 16 },
      { name: 'Counterjib', w: 9.5, cont: 0, hb: 1.4, tk: 0.6, extra: 0, R: 30, l: 10, h: 1.5, rigH: 5, shape: 'tc', colIdx: '', capOverride: '', landY: 19 }] }) },
];
