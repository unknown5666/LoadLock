// ===== Studio canvas: live elevation / site plan / sheet, to scale, with drag handles =====
const Scene = {
  host: null, mode: 'elev', views: {}, U: 2, sel: null, drag: null, tool: null, pts: [], dirty: false, last: null, dark: true, hoverW: null,
  hooks: { plan: () => null, calc: () => null, sheet: () => null, edited: () => {}, select: () => {}, tool: () => {}, hover: () => {} }
};
// night canvas: AutoCAD-style colour flip — neutrals invert (black lines → light, white fills → dark), saturated colours keep their hue
const _dk = new Map();
function sceneDarkColor(c) {
  if (!c || c === 'none' || c === 'transparent' || c[0] !== '#') { if (c === 'white') c = '#ffffff'; else if (c === 'black') c = '#000000'; else return c; }
  if (_dk.has(c)) return _dk.get(c);
  let x = c.slice(1); if (x.length === 3) x = x.split('').map(v => v + v).join(''); if (x.length !== 6) return c;
  const r = parseInt(x.slice(0, 2), 16) / 255, g = parseInt(x.slice(2, 4), 16) / 255, b = parseInt(x.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; let hh = 0, ss = 0;
  if (d > 1e-6) { ss = d / (1 - Math.abs(2 * l - 1)); hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; if (hh < 0) hh += 360; }
  let H = hh, S = ss, L = l;
  if (ss < 0.16 || d < 0.07) { H = 212; S = 0.1; L = 0.075 + (1 - l) * 0.80; }
  else if (l > 0.8) { S = Math.min(ss, 0.55); L = 0.12 + (1 - l) * 0.55; }
  else if (l < 0.42) L = 0.42 + (0.42 - l) * 0.35;
  const q = L < 0.5 ? L * (1 + S) : L + S - L * S, pp = 2 * L - q; const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp; };
  const out = '#' + [f(H / 360 + 1 / 3), f(H / 360), f(H / 360 - 1 / 3)].map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');
  _dk.set(c, out); return out;
}
const SC_GRIP = '#2f7bff', SC_HOT = '#ff3b30', SC_ACC = '#ffc20e';

function sceneInit(host, hooks) {
  Scene.host = host; Object.assign(Scene.hooks, hooks);
  const ptrs = new Map(); let pinch = null;
  host.addEventListener('pointerdown', (e) => {
    if (e.button === 2) return;
    host.focus({ preventScroll: true });
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { host.setPointerCapture(e.pointerId); } catch {}
    if (ptrs.size === 2) { Scene.drag = null; const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), v: { ...sceneView() }, c: sceneLocal({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }) }; return; }
    const w = sceneWorld(e);
    if (Scene.tool) { sceneToolClick(w); e.preventDefault(); return; }
    const hEl = e.target.closest && e.target.closest('[data-h]');
    if (hEl) { sceneStartDrag(hEl.dataset.h, w, e); e.preventDefault(); return; }
    const pick = Scene.mode === 'elev' ? scenePickObject(w) : null;
    if (pick != null) { Scene.sel = 'obj:' + pick; Scene.hooks.select(Scene.sel); sceneStartDrag('obj:' + pick, w, e); sceneDirty(); e.preventDefault(); return; }
    if (Scene.sel) { Scene.sel = null; Scene.hooks.select(null); sceneDirty(); }
    Scene.drag = { kind: 'pan', start: sceneLocal(e), v: { ...sceneView() } };
  });
  host.addEventListener('pointermove', (e) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size === 2) {
      const [a, b] = [...ptrs.values()]; const f = Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, pinch.d);
      Object.assign(sceneView(), pinch.v); sceneZoomAt(pinch.c, f); sceneDirty(); return;
    }
    if (Scene.mode !== 'sheet') { Scene.hoverW = sceneWorld(e); Scene.hooks.hover(Scene.hoverW); if (Scene.tool?.kind === 'measure' && Scene.pts.length === 1) sceneDirty(); }
    if (!Scene.drag) { sceneHover(e); return; }
    sceneMoveDrag(e);
  });
  const end = (e) => {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
    if (Scene.drag && Scene.drag.kind !== 'pan' && Scene.drag.moved) Scene.hooks.edited('drag-end');
    Scene.drag = null; host.classList.remove('dragging');
  };
  host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end);
  host.addEventListener('pointerleave', () => { Scene.hoverW = null; Scene.hooks.hover(null); });
  host.addEventListener('wheel', (e) => { e.preventDefault(); sceneZoomAt(sceneLocal(e), Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))); sceneDirty(); }, { passive: false });
  host.addEventListener('dblclick', (e) => { if (!e.target.closest('[data-h]')) { sceneFit(); sceneDirty(); } });
  host.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (Scene.tool) sceneSetTool(null); else if (Scene.sel) { Scene.sel = null; Scene.hooks.select(null); sceneDirty(); } return; }
    const m = /^obj:(\d+)$/.exec(Scene.sel || ''); if (!m) return;
    const plan = Scene.hooks.plan(); const o = plan.site.obstacles[+m[1]]; if (!o) return;
    const st = e.shiftKey ? 1 : 0.1;
    const mv = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, st], ArrowDown: [0, -st] }[e.key];
    if (mv) { e.preventDefault(); o.x = r2(num(o.x) + mv[0]); o.y = r2(Math.max(0, num(o.y) + mv[1])); Scene.hooks.edited('nudge'); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); plan.site.obstacles.splice(+m[1], 1); Scene.sel = null; Scene.hooks.select(null); Scene.hooks.edited('delete'); }
  });
  new ResizeObserver(() => sceneDirty()).observe(host);
}
function sceneView() { const m = Scene.mode; if (!Scene.views[m]) sceneFit(); if (!Scene.views[m]) Scene.views[m] = m === 'sheet' ? { x: 0, y: 0, w: SHEET.W } : { ppm: 10, x0: -10, y1: 40 }; return Scene.views[m]; }
function sceneLocal(e) { const r = Scene.host.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function sceneWorld(e) {
  const p = sceneLocal(e), v = sceneView();
  if (Scene.mode === 'sheet') { const s = v.w / Scene.host.clientWidth; return { x: v.x + p.x * s, y: v.y + p.y * s }; }
  return { x: v.x0 + p.x / v.ppm, y: v.y1 - p.y / v.ppm };
}
function sceneZoomAt(p, f) {
  const v = sceneView();
  if (Scene.mode === 'sheet') { const s = v.w / Scene.host.clientWidth; const wx = v.x + p.x * s, wy = v.y + p.y * s; v.w = Math.min(SHEET.W * 2, Math.max(40, v.w / f)); const s2 = v.w / Scene.host.clientWidth; v.x = wx - p.x * s2; v.y = wy - p.y * s2; return; }
  const wx = v.x0 + p.x / v.ppm, wy = v.y1 - p.y / v.ppm;
  v.ppm = Math.min(400, Math.max(0.4, v.ppm * f)); v.x0 = wx - p.x / v.ppm; v.y1 = wy + p.y / v.ppm;
}
function sceneZoom(f) { sceneZoomAt({ x: Scene.host.clientWidth / 2, y: Scene.host.clientHeight / 2 }, f); sceneDirty(); }
function sceneFit() {
  const W = Math.max(200, Scene.host.clientWidth), H = Math.max(200, Scene.host.clientHeight);
  if (Scene.mode === 'sheet') { const top = 52, Ha = Math.max(100, H - top); const w = Math.max(SHEET.W * 1.02, SHEET.H * 1.02 * W / Ha); const s = w / W; Scene.views.sheet = { x: (SHEET.W - w) / 2, y: -top * s - (Ha * s - SHEET.H) / 2, w }; return; }
  const plan = Scene.hooks.plan(), calc = Scene.hooks.calc(); if (!plan || !calc) return;
  let ex;
  if (Scene.mode === 'elev') {
    const res = calc.loads[plan.activeLoad || 0] || calc.loads[0];
    const e0 = elevationExtents({ ...plan, sheetView: null }, res, calc.crane, res.geo);
    ex = { x0: e0.xmin, x1: e0.xmax, y0: e0.ymin - 3, y1: e0.ymax + 1 };
    for (const e of plan.env || []) { if ((e.view || 'elev') !== 'elev' || e.hidden) continue; const b = envBBox(e); if (b) { ex.x0 = Math.min(ex.x0, b.x0); ex.x1 = Math.max(ex.x1, b.x1); ex.y0 = Math.min(ex.y0, b.y0); ex.y1 = Math.max(ex.y1, b.y1); } }
  } else { const s = sitePlanExtents({ ...plan, sitePlan: { ...(plan.sitePlan || {}), view: null } }, calc); ex = s; }
  const ppm = Math.min(W / (ex.x1 - ex.x0), H / (ex.y1 - ex.y0)) * 0.9;
  Scene.views[Scene.mode] = { ppm, x0: (ex.x0 + ex.x1) / 2 - W / 2 / ppm, y1: (ex.y0 + ex.y1) / 2 + H / 2 / ppm };
}
function sceneSetMode(m) { Scene.mode = m; Scene.sel = null; Scene.tool = null; Scene.pts = []; sceneDirty(); }
function sceneDirty() { if (Scene.dirty) return; Scene.dirty = true; requestAnimationFrame(() => { Scene.dirty = false; sceneRender(); }); }
function sceneVisible() { // world window currently on screen
  const v = sceneView(), W = Scene.host.clientWidth, H = Scene.host.clientHeight;
  return { x0: v.x0, x1: v.x0 + W / v.ppm, y0: v.y1 - H / v.ppm, y1: v.y1 };
}

// ---- render ----
function sceneGrid(P, T, k, vis, ppm, mode) {
  const steps = [0.5, 1, 2, 5, 10, 20, 50, 100, 200]; const st = steps.find(s => s * ppm >= 22) || 200; const major = st * 5;
  const minor = [], maj = [];
  for (let x = Math.ceil(vis.x0 / st) * st; x <= vis.x1; x += st) { const a = T(x, vis.y0), b = T(x, vis.y1); (Math.abs(x / major - Math.round(x / major)) < 1e-6 ? maj : minor).push([a[0], a[1], b[0], b[1]]); }
  for (let y = Math.ceil(vis.y0 / st) * st; y <= vis.y1; y += st) { const a = T(vis.x0, y), b = T(vis.x1, y); (Math.abs(y / major - Math.round(y / major)) < 1e-6 ? maj : minor).push([a[0], a[1], b[0], b[1]]); }
  P.path(minor, { stroke: '#e8eae3', w: 0.45, layer: 'GRID' }); P.path(maj, { stroke: '#d5d9cf', w: 0.6, layer: 'GRID' });
  const fs = 9 / Scene.U;
  for (let x = Math.ceil(vis.x0 / major) * major; x <= vis.x1; x += major) { const a = T(x, vis.y0); P.text(a[0] + 2 / Scene.U, a[1] - 4 / Scene.U, (mode === 'elev' ? '' : 'E ') + Math.round(x) + ' m', { size: fs, color: '#9aa093', layer: 'GRID' }); }
  for (let y = Math.ceil(vis.y0 / major) * major; y <= vis.y1; y += major) { const a = T(vis.x0, y); P.text(a[0] + 3 / Scene.U, a[1] - 2 / Scene.U, (mode === 'elev' ? '+' : 'N ') + Math.round(y) + ' m', { size: fs, color: '#9aa093', layer: 'GRID' }); }
  return st;
}
function sceneRender() {
  const host = Scene.host; if (!host || !host.isConnected) return;
  const W = host.clientWidth, H = host.clientHeight; if (W < 10 || H < 10) return;
  const plan = Scene.hooks.plan(), calc = Scene.hooks.calc(); if (!plan || !calc) return;
  const U = Scene.U = W < 600 ? 1.6 : 2;
  let svg = '', info = {};
  try {
    if (Scene.mode === 'sheet') {
      const v = sceneView(); const { P } = Scene.hooks.sheet();
      svg = toSVG(P, { viewBox: [v.x, v.y, v.w, v.w * H / W], width: '100%', height: '100%' });
      info = { scale: null };
    } else {
      const v = sceneView(), k = v.ppm / U;
      const T = (x, y) => [(x - v.x0) * k, (v.y1 - y) * k];
      const vis = sceneVisible(); const P = new Prims();
      P.rect(0, 0, W / U, H / U, { fill: Scene.dark ? '#ffffff' : '#fbfbf8', stroke: 'none', layer: 'BG' });
      const grid = sceneGrid(P, T, k, vis, v.ppm, Scene.mode);
      const li = Math.min(plan.loads.length - 1, plan.activeLoad || 0);
      if (Scene.mode === 'elev') {
        const res = calc.loads[li]; const nat = elevationExtents({ ...plan, sheetView: null }, res, calc.crane, res.geo);
        drawElevation(P, { x: 0, y: 0, w: W / U, h: H / U }, plan, calc, li, { livery: Scene.hooks.livery ? Scene.hooks.livery() : '', fixed: { T, k, ext: { xmin: vis.x0 - 2, xmax: vis.x1 + 2, ymin: nat.ymin, ymax: vis.y1 } }, title: false, dimSize: 5.2, objXmax: 1e6, mainLabel: calc.crane.charts?.[plan.chartIdx]?.mainLabel });
      } else drawSitePlan(P, { x: 0, y: 0, w: W / U, h: H / U }, plan, calc, { livery: Scene.hooks.livery ? Scene.hooks.livery() : '', fixed: { T, k, ext: vis } });
      info = { grid, ppm: v.ppm };
      svg = toSVG(P, { viewBox: [0, 0, W / U, H / U], width: '100%', height: '100%', minW: 0.5, post: sceneOverlay(plan, calc, T, k), cmap: Scene.dark ? sceneDarkColor : null, imgStyle: Scene.dark ? 'filter:invert(1) hue-rotate(180deg)' : '' });
    }
  } catch (err) { console.error(err); svg = `<div class="scene-err">Drawing error: ${String(err.message || err).replace(/</g, '&lt;')}</div>`; }
  host.innerHTML = svg;
  host.classList.toggle('tool-on', !!Scene.tool);
  Scene.last = info; Scene.hooks.rendered && Scene.hooks.rendered(info);
}

// ---- handles ----
function sceneOverlay(plan, calc, T, k) {
  const U = Scene.U, r = 8 / U, out = []; const ink = Scene.dark ? '#e9eef2' : '#1d2226', halo = Scene.dark ? '#0b0f14' : '#fbfbf8', ring = Scene.dark ? '#0b0f14' : '#fff';
  const grip = (id, x, y, o = {}) => { const p = T(x, y); const hot = Scene.drag?.kind === id || Scene.sel === id; const sz = (o.r || r);
    const shape = o.shape === 'sq' ? `<rect x="${p[0] - sz * 0.8}" y="${p[1] - sz * 0.8}" width="${sz * 1.6}" height="${sz * 1.6}" rx="${sz * 0.2}"` : o.shape === 'dia' ? `<path d="M${p[0]} ${p[1] - sz * 1.15}L${p[0] + sz * 1.15} ${p[1]}L${p[0]} ${p[1] + sz * 1.15}L${p[0] - sz * 1.15} ${p[1]}Z"` : `<circle cx="${p[0]}" cy="${p[1]}" r="${sz}"`;
    out.push(`<g class="grip" data-h="${id}"><circle cx="${p[0]}" cy="${p[1]}" r="${sz * 2.2}" fill="transparent" stroke="none"/>${shape} fill="${hot ? SC_HOT : (o.fill || SC_GRIP)}" stroke="${ring}" stroke-width="${1.6 / U}"/>${o.label ? `<text x="${p[0] + sz * 1.6}" y="${p[1] + (o.dy ?? -sz * 1.4)}" font-size="${10.5 / U}" font-weight="600" font-family="Archivo, Arial, sans-serif" fill="${ink}" stroke="${halo}" stroke-width="${3 / U}" paint-order="stroke">${o.label}</text>` : ''}</g>`); };
  const li = Math.min(plan.loads.length - 1, plan.activeLoad || 0), res = calc.loads[li], load = plan.loads[li];
  const mono = 'font-family="Martian Mono, ui-monospace, monospace"'; const CY = Scene.dark ? '#4fe0ff' : '#0a72ad'; const GO = Scene.dark ? '#2fe08a' : '#0b8a4c', AM = Scene.dark ? '#ffb81c' : '#b06f00', RD = Scene.dark ? '#ff4b4b' : '#d01f1f';
  const tag = (x, y, s, col, anchor = 'start', size = 10) => `<text x="${x}" y="${y}" font-size="${size / U}" font-weight="600" ${mono} text-anchor="${anchor}" fill="${col}" stroke="${halo}" stroke-width="${3 / U}" paint-order="stroke">${s}</text>`;
  if (Scene.mode === 'elev') {
    const site = plan.site || {};
    // live boom-clearance line to the critical corner
    const cl = res?.clearLine; const S0 = typeof settingsEff === 'function' ? settingsEff() : {}; const minC = num(S0.minClearance, 1);
    if (cl && S0.showGap !== false) { const a = T(cl.x1, cl.y1), b = T(cl.x2, cl.y2); const col = cl.clr <= 0 ? RD : cl.clr < minC ? AM : GO;
      // boom-to-building gap: dashed line with a pill label (v7 "show the gap" switch in Site)
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, txt = `${cl.clr.toFixed(2)} m gap`, fs = 11.5 / U, pw = txt.length * fs * 0.62 + 14 / U, ph = fs + 9 / U;
      out.push(`<g pointer-events="none"><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${col}" stroke-width="${1.6 / U}" stroke-dasharray="${5 / U} ${3 / U}"/><circle cx="${a[0]}" cy="${a[1]}" r="${3 / U}" fill="${col}"/><circle cx="${b[0]}" cy="${b[1]}" r="${3 / U}" fill="${ring}" stroke="${col}" stroke-width="${1.4 / U}"/>
        <rect x="${mx + 8 / U}" y="${my - ph / 2}" width="${pw}" height="${ph}" rx="${ph / 2}" fill="${col}"/><text x="${mx + 8 / U + pw / 2}" y="${my + fs * 0.36}" font-size="${fs}" font-weight="700" font-family="-apple-system, Inter, Segoe UI, Arial, sans-serif" text-anchor="middle" fill="#fff">${txt}</text></g>`); }
    (site.obstacles || []).forEach((o, i) => {
      const e = objExtent(site, o); const sel = Scene.sel === 'obj:' + i;
      if (sel) { const a = T(e.x0, e.top), b = T(e.x1, e.b); out.push(`<rect x="${Math.min(a[0], b[0]) - 3 / U}" y="${a[1] - 3 / U}" width="${Math.abs(b[0] - a[0]) + 6 / U}" height="${b[1] - a[1] + 6 / U}" fill="none" stroke="${SC_GRIP}" stroke-width="${1.4 / U}" stroke-dasharray="${5 / U} ${3 / U}"/>`);
        // live placement dimensions: slew centre → near side, width, height
        const yD = e.top + 1.4, p0 = T(0, yD), p1 = T(e.x0, yD), p2 = T(e.x1, yD), t0 = T(e.x1, e.b), t1 = T(e.x1, e.top); const tick = (p) => `<line x1="${p[0]}" y1="${p[1] - 4 / U}" x2="${p[0]}" y2="${p[1] + 4 / U}" stroke="${CY}" stroke-width="${1 / U}"/>`;
        const centred = ['towercrane', 'tower', 'tree', 'pole', 'person'].includes(o.type); const xRef = centred ? num(o.x) : e.x0; const pr = T(xRef, yD);
        out.push(`<g pointer-events="none" opacity=".95"><line x1="${p0[0]}" y1="${p0[1]}" x2="${pr[0]}" y2="${pr[1]}" stroke="${CY}" stroke-width="${0.9 / U}"/>${tick(p0)}${tick(pr)}${tag((p0[0] + pr[0]) / 2, p0[1] - 5 / U, `${xRef.toFixed(2)} m`, CY, 'middle')}
          ${!centred ? `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="${CY}" stroke-width="${0.9 / U}" stroke-dasharray="${3 / U} ${2 / U}"/>${tick(p2)}${tag((p1[0] + p2[0]) / 2, p1[1] - 5 / U, `w ${(e.x1 - e.x0).toFixed(2)}`, CY, 'middle', 9)}` : ''}
          <line x1="${t0[0] + 8 / U}" y1="${t0[1]}" x2="${t1[0] + 8 / U}" y2="${t1[1]}" stroke="${CY}" stroke-width="${0.9 / U}"/>${tag(t1[0] + 12 / U, (t0[1] + t1[1]) / 2, `h ${(e.top - e.b).toFixed(2)}${num(o.y) ? ` · +${num(o.y).toFixed(2)}` : ''}`, CY, 'start', 9)}</g>`); }
      grip('obj:' + i, ['towercrane', 'tower', 'tree', 'pole', 'person'].includes(o.type) ? num(o.x) : (e.x0 + e.x1) / 2, e.b + Math.min(e.top - e.b, 3) / 2, { shape: 'sq', r: 6 / U, fill: sel ? SC_GRIP : '#5b6670', label: sel ? (o.label || OBJ_TYPES[o.type]?.label || o.type) : '' });
      if (sel && ['building', 'wall', 'box', 'tower', 'towercrane'].includes(o.type)) grip('objsz:' + i, ['tower', 'towercrane'].includes(o.type) ? (e.x0 + e.x1) / 2 : e.x1, e.top, { shape: 'sq', r: 5 / U, fill: SC_GRIP });
    });
    (plan.env || []).forEach((e, i) => { if ((e.view || 'elev') !== 'elev' || e.hidden) return; const b = envBBox(e); if (b) grip('env:' + i, b.x0, b.y1, { r: 6 / U, fill: '#7c4dff', label: e.name ? e.name.slice(0, 28) : 'Drawing', dy: -9 / U }); });
    if (site.stepX !== '' && site.stepX != null && num(site.targetGround) !== 0) grip('step', num(site.stepX), num(site.targetGround) / 2, { shape: 'sq', r: 5 / U, fill: '#5b6670' });
    grip('crane', 0, -0.2, { r: 9 / U, fill: SC_ACC, label: '⇆ crane', dy: 22 / U });
    if (res?.geo?.tip) grip('load', res.R, res.landY + Math.max(0.6, num(load.h, 1.5)) / 2, { shape: 'dia', r: 8 / U, fill: '#c000c0', label: load.by === 'angle' ? Math.round(num(load.angle) * 10) / 10 + '°' : load.by === 'height' ? 'tip ' + num(res.tipY).toFixed(1) + ' m' : 'R ' + res.R.toFixed(1) + ' m' });
  } else {
    const sp = sitePlanState(plan, load), R = res?.R || 10, br = sp.boom * D2R, cr = sp.carrier * D2R; // sp.boom / sp.carrier follow the lift side (draw.js)
    const Lc = num(calc.crane.carrierLen, 12);
    (plan.env || []).forEach((e, i) => { if (e.view !== 'plan' || e.hidden) return; const b = envBBox(e); if (b) grip('penv:' + i, b.x0, b.y1, { r: 6 / U, fill: '#7c4dff', label: e.name ? e.name.slice(0, 28) : 'Drawing', dy: -9 / U }); });
    grip('pcar', sp.cx + 0.64 * Lc * Math.cos(cr), sp.cy + 0.64 * Lc * Math.sin(cr), { shape: 'sq', r: 6 / U, fill: '#5b6670', label: 'cab' }); // the cab end of the carrier
    grip('pload', sp.cx + R * Math.cos(br), sp.cy + R * Math.sin(br), { shape: 'dia', r: 8 / U, fill: '#c000c0', label: 'R ' + R.toFixed(1) + ' m · ' + Math.round(sp.boom) % 360 + '°' });
    grip('pcrane', sp.cx, sp.cy, { r: 9 / U, fill: SC_ACC, label: 'crane' });
  }
  if (Scene.tool?.kind !== 'measure') for (const [i, p] of Scene.pts.entries()) { const q = T(p.x, p.y); out.push(`<g><circle cx="${q[0]}" cy="${q[1]}" r="${5 / U}" fill="none" stroke="${SC_HOT}" stroke-width="${1.5 / U}"/><path d="M${q[0] - 9 / U} ${q[1]}H${q[0] + 9 / U}M${q[0]} ${q[1] - 9 / U}V${q[1] + 9 / U}" stroke="${SC_HOT}" stroke-width="${1 / U}"/><text x="${q[0] + 7 / U}" y="${q[1] - 7 / U}" font-size="${10 / U}" fill="${SC_HOT}">${i + 1}</text></g>`); }
  if (Scene.tool?.kind === 'measure' && Scene.pts.length) {
    const A = Scene.pts[0], B = Scene.pts[1] || Scene.hoverW; if (B) { const a = T(A.x, A.y), b = T(B.x, B.y); const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy); const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      out.push(`<g class="meas"><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${a[1]}" stroke="${CY}" stroke-width="${0.8 / U}" stroke-dasharray="${3 / U} ${3 / U}" opacity=".6"/><line x1="${b[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${CY}" stroke-width="${0.8 / U}" stroke-dasharray="${3 / U} ${3 / U}" opacity=".6"/><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${CY}" stroke-width="${1.6 / U}"/><circle cx="${a[0]}" cy="${a[1]}" r="${3 / U}" fill="${CY}"/><circle cx="${b[0]}" cy="${b[1]}" r="${3 / U}" fill="${CY}"/><text x="${mx + 6 / U}" y="${my - 6 / U}" font-size="${12 / U}" font-weight="700" font-family="Martian Mono, ui-monospace, monospace" fill="${CY}" stroke="${halo}" stroke-width="${3.5 / U}" paint-order="stroke">${d.toFixed(2)} m</text><text x="${mx + 6 / U}" y="${my + 9 / U}" font-size="${9.5 / U}" font-family="Martian Mono, ui-monospace, monospace" fill="${ink}" stroke="${halo}" stroke-width="${3 / U}" paint-order="stroke">Δx ${Math.abs(dx).toFixed(2)} · Δy ${Math.abs(dy).toFixed(2)}</text></g>`); }
  }
  if (Scene.pts.length === 2 && Scene.tool?.kind === 'calib') { const a = T(Scene.pts[0].x, Scene.pts[0].y), b = T(Scene.pts[1].x, Scene.pts[1].y); out.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${SC_HOT}" stroke-width="${1.2 / U}" stroke-dasharray="${4 / U} ${3 / U}"/>`); }
  return out.join('');
}
function scenePickObject(w) {
  const plan = Scene.hooks.plan(); const site = plan.site || {}; const list = site.obstacles || [];
  for (let i = list.length - 1; i >= 0; i--) { const e = objExtent(site, list[i]); if (w.x >= e.x0 - 0.2 && w.x <= e.x1 + 0.2 && w.y >= e.b - 0.2 && w.y <= e.top + 0.2) return i; }
  return null;
}
function sceneHover(e) {
  const h = e.target.closest && e.target.closest('[data-h]');
  Scene.host.style.cursor = Scene.tool ? 'crosshair' : h ? 'grab' : (Scene.mode === 'elev' && scenePickObject(sceneWorld(e)) != null ? 'move' : '');
}
const snap = (v, s = 0.1) => Math.round(v / s) * s;
function sceneStartDrag(kind, w, e) {
  const plan = Scene.hooks.plan(); const calc = Scene.hooks.calc();
  Scene.drag = { kind, w0: w, orig: JSON.parse(JSON.stringify({ site: plan.site, env: plan.env || [], loads: plan.loads, sp: plan.sitePlan || {} })), v: { ...sceneView() }, moved: false, calc };
  Scene.host.classList.add('dragging');
  const m = /^(obj|objsz):(\d+)$/.exec(kind); if (m && Scene.sel !== 'obj:' + m[2]) { Scene.sel = 'obj:' + m[2]; Scene.hooks.select(Scene.sel); }
}
function sceneMoveDrag(e) {
  const d = Scene.drag; const plan = Scene.hooks.plan(); const w = sceneWorld(e);
  if (d.kind === 'pan') { const p = sceneLocal(e), v = sceneView(); if (Scene.mode === 'sheet') { const s = v.w / Scene.host.clientWidth; v.x = d.v.x - (p.x - d.start.x) * s; v.y = d.v.y - (p.y - d.start.y) * s; } else { v.x0 = d.v.x0 - (p.x - d.start.x) / v.ppm; v.y1 = d.v.y1 + (p.y - d.start.y) / v.ppm; } sceneDirty(); return; }
  d.moved = true;
  const dx = w.x - d.w0.x, dy = w.y - d.w0.y; const O = d.orig;
  const li = Math.min(plan.loads.length - 1, plan.activeLoad || 0); const load = plan.loads[li];
  const crane = d.calc.crane;
  const setRadius = (L, R) => { R = Math.max(1, snap(R)); if (L.by === 'angle' || L.by === 'height') { const G = geoSetup(plan, crane, L); const a = angleFromRadius(crane, G.gChart, G.gCol, R, G.boomOv); if (L.by === 'angle') L.angle = a; else L.tipH = r2(tipFromAngle(crane, G.gChart, G.gCol, a, G.boomOv).y); } else L.R = r2(R); };
  let m;
  if (d.kind === 'crane') {
    const s = snap(dx);
    plan.site.obstacles.forEach((o, i) => { o.x = r2(num(O.site.obstacles[i].x) - s); });
    (plan.env || []).forEach((en, i) => { if ((en.view || 'elev') === 'elev') en.x = r2(num(O.env[i].x) - s); });
    if (O.site.stepX !== '' && O.site.stepX != null) plan.site.stepX = r2(num(O.site.stepX) - s);
    plan.loads.forEach((L, i) => { if (L.by !== 'angle') L.R = r2(Math.max(1, num(O.loads[i].R) - s)); });
    const v = sceneView(); v.x0 = d.v.x0 - s;
  } else if (d.kind === 'load') {
    setRadius(load, w.x);
    const r0 = d.calc.loads[Math.min(d.calc.loads.length - 1, plan.activeLoad || 0)];
    if (Math.abs(dy) > 0.4 || d.vert) {
      d.vert = true; const auto = surfaceAt(plan.site, num(load.R, r0.R)); const ly = Math.max(0, r0.landY + dy);
      load.landY = Math.abs(ly - auto) < 0.4 ? '' : r2(snap(ly, 0.05));
    }
  }
  else if ((m = /^obj:(\d+)$/.exec(d.kind))) {
    const o = plan.site.obstacles[+m[1]], oo = O.site.obstacles[+m[1]]; if (!o) return;
    o.x = r2(snap(num(oo.x) + dx));
    let y = Math.max(0, num(oo.y) + dy);
    const others = { ...plan.site, obstacles: plan.site.obstacles.filter((_, i) => i !== +m[1]) };
    const e = objExtent(plan.site, { ...o, y: 0 }); const g = e.b; const cx = (e.x0 + e.x1) / 2;
    const surf = surfaceAt(others, cx) - g; if (Math.abs(y - surf) < 0.5) y = surf; else if (y < 0.3) y = 0;
    o.y = r2(snap(y, 0.05));
  } else if ((m = /^objsz:(\d+)$/.exec(d.kind))) {
    const o = plan.site.obstacles[+m[1]]; if (!o) return; const e = objExtent(plan.site, o);
    if (o.type === 'tower' || o.type === 'towercrane') o.h = r2(Math.max(1, snap(w.y - e.b - (o.type === 'towercrane' ? num(o.topH) : 0))));
    else { o.w = r2(Math.max(0.1, snap(w.x - num(o.x)))); o.h = r2(Math.max(0.1, snap(w.y - e.b))); }
  } else if ((m = /^p?env:(\d+)$/.exec(d.kind))) {
    const en = plan.env[+m[1]], oe = O.env[+m[1]]; en.x = r2(num(oe.x) + dx); en.y = r2(num(oe.y) + dy);
  } else if (d.kind === 'step') plan.site.stepX = r2(Math.max(0.5, snap(w.x)));
  else if (d.kind === 'pcrane') { plan.sitePlan = { ...(plan.sitePlan || {}), cx: r2(snap(num(O.sp.cx) + dx)), cy: r2(snap(num(O.sp.cy) + dy)) }; }
  else if (d.kind === 'pload') { // dragging the load swings the whole crane: the carrier turns so the boom stays on the chosen lift side
    const sp = sitePlanState(plan, load); const ang = Math.round(Math.atan2(w.y - sp.cy, w.x - sp.cx) * R2D); const off = SIDE_OFFSET[sp.side];
    plan.sitePlan = { ...(plan.sitePlan || {}), rot: Math.round(normDeg(ang)), carrierRot: Math.round(normDeg(ang - off)) };
    setRadius(load, Math.hypot(w.x - sp.cx, w.y - sp.cy));
  } else if (d.kind === 'pcar') { // dragging the cab end turns the carrier; the boom follows to the same side (sitePlan.rot is kept in step for older code)
    const sp = sitePlanState(plan, load); const ch = Math.round(normDeg(Math.atan2(w.y - sp.cy, w.x - sp.cx) * R2D));
    plan.sitePlan = { ...(plan.sitePlan || {}), carrierRot: ch, rot: Math.round(normDeg(ch + SIDE_OFFSET[sp.side])) };
  }
  Scene.hooks.edited('drag');
}

// ---- tools: two-point scale calibration and point alignment for client drawings ----
function sceneSetTool(t) { Scene.tool = t; Scene.pts = []; Scene.hooks.tool(t); sceneDirty(); }
function sceneToolClick(w) {
  const t = Scene.tool;
  if (t.kind === 'measure') { if (Scene.pts.length >= 2) Scene.pts = []; Scene.pts.push(w); sceneDirty(); Scene.hooks.tool(t, Scene.pts.length, Scene.pts.slice()); return; }
  Scene.pts.push(w); sceneDirty();
  if (Scene.pts.length < 2) { Scene.hooks.tool(t, 1); return; }
  Scene.hooks.tool(t, 2, Scene.pts.slice());
}
function envCalibrate(e, A, B, dist) { // A,B world points picked on the drawing; dist = true distance in m
  const a = envWorldToLocal(e, A.x, A.y), b = envWorldToLocal(e, B.x, B.y); const dl = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!(dl > 0) || !(dist > 0)) return false;
  e.sc = dist / dl; e.calibrated = true; const f = envXf({ ...e, x: 0, y: 0 }); const pa = f(a[0], a[1]); e.x = r2(A.x - pa[0]); e.y = r2(A.y - pa[1]); return true;
}
function envAlign(e, A, B) { e.x = r2(num(e.x) + B.x - A.x); e.y = r2(num(e.y) + B.y - A.y); }
