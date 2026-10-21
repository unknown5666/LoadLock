// ===== v7 core: icons, actions, refresh loop, undo history, views =====
// The v7 interface keeps v6's engine, drawing and storage (app.js) and replaces every screen.

// ---------- icons (24px grid, round caps; never emoji) ----------
const IC = {
  crane: 'M3 21h18M6 21v-9l13-7v3.2L8.8 14V21M16 7v6.5M14.6 13.5h2.8v2.4h-2.8z',
  weight: 'M12 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM7 8.5h10l3 12H4zM10 13l4 4M14 13l-4 4',
  reach: 'M4 18h16M4 18V8M20 18l-3-3M20 18l-3 3M4 12h0',
  boom: 'M4 20L19 5M15 5h4v4M4 20h5',
  angle: 'M4 20h16M4 20L16 8M10 20a6 6 0 0 0-1.8-4.2',
  height: 'M12 20V5M8 9l4-4 4 4M5 20h14',
  hook: 'M12 3v6M10 9h4v3M12 12v2.5a3.5 3.5 0 1 1-3.5 3.5',
  side: 'M12 3a9 9 0 1 0 9 9M21 4v5h-5M12 8v4l3 2',
  site: 'M3 21h18M5 21V10h6v11M13 21V4h6v17M8 13h0M8 16h0M16 8h0M16 11h0M16 14h0M16 17h0',
  print: 'M6 9V3h12v6M6 17H4v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6h-2M7 14h10v7H7z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  redo: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h3',
  save: 'M5 3h11l4 4v14H4V4a1 1 0 0 1 1-1zM8 3v5h7V3M7 21v-7h10v7',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', x: 'M6 6l12 12M18 6L6 18', check: 'M5 12.5l4.5 4.5L19 7.5',
  alert: 'M12 8v5M12 16.5h.01', stop: 'M8 8l8 8M16 8l-8 8', info: 'M12 11v6M12 7.5h.01',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z', chev: 'M9 6l6 6-6 6', chevL: 'M15 6l-6 6 6 6', chevD: 'M6 9l6 6 6-6',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5L21 21',
  elev: 'M3 20h18M6 20v-7l10-6M16 7v7M14.5 14h3v2.5h-3z', plan: 'M4 4h16v16H4zM12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M12 12l5-5',
  cube: 'M12 2.5l8.5 4.8v9.4L12 21.5l-8.5-4.8V7.3zM12 12l8.5-4.7M12 12v9.5M12 12L3.5 7.3', sheet: 'M5 3h10l4 4v14H5zM14 3v5h5M8 13h8M8 17h5',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', zin: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M11 8v6M8 11h6', zout: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M8 11h6',
  measure: 'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2', trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14', copy: 'M8 8h12v12H8zM4 16V4h12',
  wind: 'M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7', pin: 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  folder: 'M3 6h7l2 2h9v12H3z', truck: 'M2 17h12V8H2zM14 17h4l3-3v-3h-7M5.5 20a1.5 1.5 0 1 0 0-.01M17.5 20a1.5 1.5 0 1 0 0-.01',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  out: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10', sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0', key: 'M14 10a4 4 0 1 0-1.2 2.8L20 20M17 17l2-2',
  file: 'M5 3h10l4 4v14H5zM14 3v5h5', dl: 'M12 3v12M7 10l5 5 5-5M4 20h16', star: 'M12 3l2.2 5.6L20 9.4l-4.5 3.8 1.4 5.8L12 16l-4.9 3 1.4-5.8L4 9.4l5.8-.8z',
  gap: 'M4 4v16M20 4v16M8 12h8M8 12l2-2M8 12l2 2M16 12l-2-2M16 12l-2 2', eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5', sliders: 'M4 6h9M17 6h3M15 4v4M4 12h3M11 12h9M9 10v4M4 18h11M19 18h1M17 16v4', help: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5M12 17.5h.01',
  phone: 'M7 3h10v18H7zM11 18h2'
};
const ic = (k, s = 22, w = 1.9) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path d="${IC[k] || ''}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const OBJ_ICON = { building: 'M3 21V8l7-4 7 4v13M7 21v-4h6v4', wall: 'M3 18h18M3 13h18M3 8h18M8 8v5M14 13v5M16 8v5', box: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8', container: 'M3 7h18v10H3zM7 7v10M11 7v10M15 7v10', trailer: 'M2 15h14v-3H2zM16 15h5v-4l-2-2h-3zM5 18a1.5 1.5 0 1 0 0-.01M18 18a1.5 1.5 0 1 0 0-.01', truck: 'M2 16h11V7H2zM13 16h7v-5l-3-3h-4zM6 19a1.5 1.5 0 1 0 0-.01M17 19a1.5 1.5 0 1 0 0-.01', towercrane: 'M8 21V5M12 21V5M8 5h13M3 5h5M8 9l4-4M8 13l4-4M8 17l4-4M19 5v5', tower: 'M12 3L6 21M12 3l6 18M8 14h8M4 8h16', person: 'M12 6a2 2 0 1 0 0-.01M12 9v6M9 21l3-6 3 6M8 12h8', tree: 'M12 21v-6M12 3a5 5 0 0 0-5 5 4 4 0 0 0 1 7h8a4 4 0 0 0 1-7 5 5 0 0 0-5-5z', pole: 'M12 3v18M6 6h12M7 6v2M17 6v2M10 21h4', shed: 'M3 11l9-7 9 7M5 10v11h14V10M10 21v-5h4v5' };
const oic = (t, s = 26) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path d="${OBJ_ICON[t] || OBJ_ICON.box}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const isDesk = () => window.matchMedia('(min-width: 900px)').matches;
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- v7 UI state ----------
const V7 = { sheet: null, hist: { u: [], r: [], cur: null, t: 0 }, ringU: 0, ringRaf: 0, sliding: false, coach: null, theme: 'auto', user: '' };

// ---------- status helpers ----------
function utilCls(r) { const S = settingsEff(); return r?.cap == null ? 'fail' : r.util > num(S.utilMax, 90) ? 'fail' : r.util > num(S.utilWarn, 75) ? 'warn' : 'ok'; }
const VERDICT = { ok: ['Safe', 'check'], warn: ['Careful', 'alert'], fail: ['Stop', 'stop'] };
function allChecks(calc) {
  const items = []; calc.loads.forEach((x, i) => x.checks.forEach(c => items.push({ ...c, t: (calc.loads.length > 1 ? `Lift ${i + 1} · ` : '') + c.t, li: i })));
  if (calc.ground) items.push({ s: calc.ground.status, t: 'Ground pressure', m: `${calc.ground.press.toFixed(2)} t/m² under each mat` + (calc.ground.allow ? ` — ${calc.ground.allow} t/m² allowed` : ' — add the allowed ground bearing to check it') });
  if (calc.rig) items.push({ s: calc.rig.status, t: 'Rigging', m: `${calc.rig.T.toFixed(2)} t in each sling leg at ${calc.rig.alpha.toFixed(0)}°` + (calc.rig.alpha > 45 ? ' — too wide, use longer slings or a spreader' : '') });
  if (calc.weather) items.push({ s: calc.weather.status, t: 'Weather', m: calc.weather.msgs.join(' · ') });
  const rank = { fail: 0, warn: 1, info: 2, ok: 3 }; items.sort((a, b) => (rank[a.s] ?? 4) - (rank[b.s] ?? 4));
  return items;
}

// ---------- refresh ----------
let refreshT;
function refresh(immediate) {
  if (!state.started) return;
  clearTimeout(refreshT);
  const run = () => {
    let calc; try { calc = computePlan(state.plan, cranes(), settingsEff()); } catch (e) { console.error(e); return; }
    state.calc = calc; state._sheet = null;
    try { renderPanel(); } catch (e) { console.error(e); }
    try { renderTop(); } catch (e) { console.error(e); }
    if (state.view === '3d') twinUpdate(); else sceneDirty();
    try { sheetLive(); } catch (e) { console.error(e); }
    draft();
  };
  if (immediate) run(); else refreshT = setTimeout(run, 40);
}
// v6 names that app.js / scene hooks call
function renderDrawer() { sheetRefresh(); }
function syncDrawer() { sheetLive(); }

// ---------- commit: every user change goes through here (dirty flag + undo checkpoint + redraw) ----------
function commit(o = {}) { markDirty(); histMark(); refresh(o.later ? false : true); if (o.sheet) sheetRefresh(); }
function histInit() { V7.hist = { u: [], r: [], cur: JSON.stringify(state.plan), t: 0 }; renderTopUndo(); }
function histMark() { // coalesce rapid edits (slider drags, typing) into one undo step
  clearTimeout(V7.hist.t);
  V7.hist.t = setTimeout(() => {
    const s = JSON.stringify(state.plan); if (s === V7.hist.cur) return;
    if (V7.hist.cur) { V7.hist.u.push(V7.hist.cur); if (V7.hist.u.length > 60) V7.hist.u.shift(); }
    V7.hist.cur = s; V7.hist.r = []; renderTopUndo();
  }, 450);
}
function histGo(dir) {
  clearTimeout(V7.hist.t);
  const now = JSON.stringify(state.plan); if (now !== V7.hist.cur && V7.hist.cur) { V7.hist.u.push(V7.hist.cur); V7.hist.cur = now; V7.hist.r = []; }
  const from = dir < 0 ? V7.hist.u : V7.hist.r, to = dir < 0 ? V7.hist.r : V7.hist.u;
  if (!from.length) return;
  to.push(V7.hist.cur); V7.hist.cur = from.pop();
  const keepView = Scene.views; state.plan = normalizePlan(JSON.parse(V7.hist.cur)); Scene.views = keepView; state.sel = Scene.sel = null;
  if (state.twin) state.twin.reframe();
  markDirty(); refresh(true); sheetRefresh(); renderTopUndo(); renderSel();
  toast(dir < 0 ? 'Undone' : 'Redone');
}

// ---------- position / boom actions (ported from v6, behaviour unchanged) ----------
function setPosition(li, v) { const l = state.plan.loads[li]; if (!(v > 0) && l.by !== 'angle') return; if (l.by === 'angle') l.angle = r2(v); else if (l.by === 'height') l.tipH = r2(v); else l.R = r2(v); commit(); }
function setBy(li, by) {
  const l = state.plan.loads[li]; if (l.by === by) return; const res = state.calc?.loads?.[li]; const { ch } = loadCol(li);
  if (by === 'angle') { l.angle = res?.geo?.tip ? Math.round(currentAngle(res, ch) * 10) / 10 : 60; l.by = 'angle'; }
  else if (by === 'height') { l.tipH = res?.geo?.tip ? r2(res.tipY) : 20; l.by = 'height'; }
  else { l.R = res ? r2(res.R) : l.R; l.by = 'radius'; }
  commit();
}
function setCrane(id) {
  const p = state.plan; const c = cranes().find(x => x.id === id); if (!c) return;
  p.craneId = id; p.chartIdx = c.charts?.length ? 0 : -1; p.colIdx = 0; p.loads.forEach(l => { l.colIdx = ''; l.hb = c.hookBlock ?? l.hb; }); p.cwt = null; p.config = null; p.outriggerTxt = ''; p.boomOverride = ''; p.tele = { mode: 'auto', fr: [] };
  const av = c.acc || ['flyjib']; if (p.attach?.type === 'luff' && !av.includes('luffing')) p.attach.type = 'none'; if (p.attach?.type === 'fly' && !av.includes(p.attach.ext ? 'extension' : 'flyjib')) p.attach.type = 'none';
  // the shortest boom on the first main chart that reaches this radius (and covers the lift side), else the longest boom
  const l0 = p.loads[activeLi()]; const R = num(l0?.R, 10); let found = false; const charts = c.charts || [];
  const side = sideOfLoad(l0);
  const order = charts.map((_, i) => i).filter(i => !charts[i].kind || charts[i].kind === 'main').sort((a, b) => (sideCovers(charts[b], side) ? 1 : 0) - (sideCovers(charts[a], side) ? 1 : 0));
  for (const ci0 of order) {
    const pr = getChart(charts[ci0]); if (!pr) continue;
    const i = pr.cols.findIndex((_, ci) => lookupCap(pr, ci, R).cap != null);
    if (i >= 0) { p.chartIdx = ci0; p.colIdx = i; found = true; break; }
  }
  if (!found) {
    const pr = charts[0] ? getChart(charts[0]) : null;
    if (pr && pr.cols.length) { p.colIdx = pr.cols.length - 1; if (charts.length) setTimeout(() => toast(`${c.model} can't reach ${fmt(R, 1)} m — bring the load closer`), 0); }
    else if (!charts.length) { const sp = boomSpec(c, []); p.boomOverride = r2(Math.max(sp.Lmin, Math.min(sp.Lmax, R / Math.cos(55 * Math.PI / 180) + 1))); }
  }
  Scene.views = {}; if (state.twin) state.twin.reframe();
}
function setBoomLength(L) { // auto mode: snap to a chart column when close, otherwise an override length
  const p = state.plan; const { crane, ch, parsed } = curChart(); const spec = boomSpec(crane, chartLengths(crane)); L = Math.max(spec.Lmin, Math.min(spec.Lmax, r2(L)));
  if (parsed && (!ch.kind || ch.kind === 'main')) {
    const curLab = parsed.cols[+p.colIdx]?.label || ''; let best = -1, bd = 1e9;
    parsed.cols.forEach((c, i) => { const d = Math.abs(c.L - L) + ((c.label || '') === curLab ? 0 : 0.01); if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd < 0.45) { p.colIdx = best; p.boomOverride = ''; return parsed.cols[best].L; }
  }
  p.boomOverride = L; return L;
}
function teleFr() { const r = state.calc?.loads?.[activeLi()]; return (r?.tele?.fr || []).slice(); }
function teleSetSection(i, f) {
  const p = state.plan; const fr = teleFr(); if (!fr.length) return;
  fr[i] = f; p.tele = { mode: 'manual', fr: fr.map(v => Math.round(v * 100) / 100) }; p.boomOverride = ''; commit();
}
function teleMode(m) {
  const p = state.plan; const r = state.calc?.loads?.[activeLi()]; if (!r || r.tele?.locked) return;
  if (m === 'manual') p.tele = { mode: 'manual', fr: r.tele.fr.map(v => Math.round(v * 100) / 100) };
  else { const L = r.tele.L; p.tele = { mode: 'auto', fr: [] }; setBoomLength(L); }
  commit({ sheet: true });
}
function telePreset(v) {
  const p = state.plan; const r = state.calc?.loads?.[activeLi()]; if (!r || r.tele?.locked) return; const n = r.spec.tele; let fr;
  if (v === 'even') fr = r.tele.mode === 'manual' ? Array(n).fill(r.tele.fr.reduce((a, b) => a + b, 0) / n) : r.tele.fr.slice();
  else if (v === 'seq') { let tot = r.tele.fr.reduce((a, b) => a + b, 0); fr = Array(n).fill(0); for (let i = 0; i < n && tot > 0; i++) { fr[i] = Math.min(1, tot); tot -= fr[i]; } }
  else fr = Array(n).fill(+v);
  p.tele = { mode: 'manual', fr: fr.map(x => Math.round(x * 100) / 100) }; p.boomOverride = ''; commit({ sheet: true });
}
function heightRange(li) {
  const { crane, G } = loadCol(li); const [a0, a1] = angleRange(G.gChart);
  const y0 = tipFromAngle(crane, G.gChart, G.gCol, Math.max(a0, 1), G.boomOv).y, y1 = tipFromAngle(crane, G.gChart, G.gCol, Math.min(a1, 84), G.boomOv).y;
  return [Math.max(1, Math.floor(Math.min(y0, y1))), Math.ceil(Math.max(y0, y1))];
}
// one place that sets any of the five numbers
function setDial(k, v, o = {}) {
  const p = state.plan, li = activeLi(), l = p.loads[li]; if (!isFinite(v)) return;
  const res = state.calc?.loads?.[li];
  if (k === 'W') { l.w = r2(Math.max(0, v)); if (l.empty && v > 0) l.empty = false; }
  else if (k === 'L') {
    if (res?.tele?.locked) { toast('The jib chart fixes the boom length'); return; }
    const { crane } = curChart(); const sp = boomSpec(crane, chartLengths(crane)); const L = Math.max(sp.Lmin, Math.min(sp.Lmax, v));
    if (!o.live && Math.abs(L - v) > 0.01) toast(`This boom goes from ${fmt(sp.Lmin, 1)} to ${fmt(sp.Lmax, 1)} m`);
    p.tele = { mode: 'auto', fr: [] }; setBoomLength(L);
  } else if (k === 'A') { const [a0, a1] = angleRange(loadCol(li).ch); l.by = 'angle'; l.angle = Math.round(Math.max(a0, Math.min(a1, v)) * 10) / 10; }
  else if (k === 'R') { l.by = 'radius'; l.R = r2(Math.max(0.5, v)); }
  else if (k === 'H') { l.by = 'height'; l.tipH = r2(Math.max(1, v)); }
  markDirty(); histMark(); refresh(true);
}
function holdDial(mode) { // keep this quantity fixed when the boom telescopes
  const p = state.plan, li = activeLi(), l = p.loads[li], res = state.calc?.loads?.[li]; if (!res?.geo?.tip) return;
  const { ch } = loadCol(li);
  if (mode === 'angle') l.angle = Math.round(currentAngle(res, ch) * 10) / 10; else if (mode === 'height') l.tipH = r2(res.tipY); else l.R = r2(res.R);
  l.by = mode; commit();
}
function dialValue(k, li = activeLi()) {
  const res = state.calc?.loads?.[li]; const l = state.plan.loads[li]; if (!res) return null; const { ch } = loadCol(li);
  return { W: num(l.w), L: res.tele?.L, A: res.geo?.tip ? currentAngle(res, ch) : null, R: res.R, H: res.tipY }[k];
}
function dialRange(k, li = activeLi()) {
  const res = state.calc?.loads?.[li]; const { ch, G } = loadCol(li); const spec = res?.spec || G.spec;
  if (k === 'W') return [0, Math.max(10, Math.ceil(num(res?.cap, 20) * 1.3 / 5) * 5)];
  if (k === 'L') return [spec.Lmin, spec.Lmax];
  if (k === 'A') return angleRange(ch);
  if (k === 'R') { const [a, b] = radiusRange(li); return [Math.min(a, res?.R ?? a), Math.max(b, res?.R ?? b)]; }
  const [a, b] = heightRange(li); return [Math.min(a, res?.tipY ?? a), Math.max(b, res?.tipY ?? b)];
}

// ---------- lift side (left / right / rear — never the front) ----------
const SIDES = [['left', 'Left'], ['rear', 'Behind'], ['right', 'Right']];
function sideOfLoad(l) { if (typeof sideOf === 'function') return sideOf(l); return ['left', 'right', 'rear'].includes(l?.side) ? l.side : 'rear'; }
function sideCovers(ch, side) { if (typeof chartCoversSide === 'function') return chartCoversSide(ch, side); return true; }
function setSide(side) {
  const p = state.plan, li = activeLi(), l = p.loads[li]; if (!['left', 'right', 'rear'].includes(side)) return;
  // the truck is parked: keep its heading and swing the boom to the new side
  if (typeof hasCarrierRot === 'function' && typeof carrierHeadingFor === 'function' && !hasCarrierRot(p.sitePlan)) p.sitePlan = { ...(p.sitePlan || {}), carrierRot: Math.round(carrierHeadingFor(p, l)) };
  l.side = side;
  const crane = curCrane();
  if (typeof bestChartForSide === 'function' && crane) { const bi = bestChartForSide(crane, side, +p.chartIdx); if (bi != null && bi >= 0 && bi !== +p.chartIdx) { p.chartIdx = bi; p.colIdx = 0; p.boomOverride = ''; p.loads.forEach(x => x.colIdx = ''); toast('Load chart changed to one that covers this side'); } }
  if (state.twin) state.twin.reframe();
  commit({ sheet: true });
}

// ---------- accessories, objects ----------
function accToggle(k, on) {
  const p = state.plan; const crane = curCrane(); const at = p.attach || (p.attach = { type: 'none' });
  if (k === 'flyjib' || k === 'extension') { if (on) { const [a, b] = jibRange(crane, 'fly'); p.attach = { ...at, type: 'fly', ext: k === 'extension', jibLen: Math.round(Math.max(a, Math.min(b, num(at.type === 'fly' ? at.jibLen : a + (b - a) * 0.4, a))) * 2) / 2, offset: k === 'extension' ? 0 : (at.type === 'fly' && !at.ext ? num(at.offset, 20) : 20) }; } else p.attach = { ...at, type: 'none' }; }
  else if (k === 'luffing') { if (on) { const [a, b] = jibRange(crane, 'luff'); p.attach = { ...at, type: 'luff', ext: false, jibLen: Math.round(Math.max(a, Math.min(b, num(at.type === 'luff' ? at.jibLen : a + (b - a) * 0.4, a))) * 2) / 2, boomAngle: num(at.boomAngle, 83) }; } else p.attach = { ...at, type: 'none' }; }
  else { p.acc = { ...(p.acc || {}), [k]: !!on }; }
  Scene.views.elev = null; if (state.twin) state.twin.reframe(); commit({ sheet: true });
}
function addObject(type) {
  const p = state.plan; const t = OBJ_TYPES[type]; const site = p.site; const R = state.calc?.loads?.[activeLi()]?.R || 15;
  const ends = (site.obstacles || []).map(o => objExtent(site, o).x1); const x = Math.max(4, ...(ends.length ? ends.map(e => e + 1) : [R - t.w / 2]));
  const centred = ['towercrane', 'tower', 'tree', 'pole', 'person'].includes(type);
  const o = { type, x: r2(centred ? x + t.w / 2 : x), y: 0, w: t.w, h: t.h, label: '' };
  if (type === 'pole') o.label = 'POLE'; if (type === 'shed') o.label = 'SHED';
  if (type === 'towercrane') Object.assign(o, { mastW: 2, topH: 3, label: 'TOWER CRANE' });
  if (type === 'trailer') o.label = 'LOW-BED TRAILER'; if (type === 'container') o.size = '20'; if (type === 'building') o.label = 'BUILDING';
  site.obstacles.push(o); state.sel = Scene.sel = 'obj:' + (site.obstacles.length - 1);
  if (state.view !== 'elev') setView('elev');
  commit(); renderSel();
  const vis = sceneVisible(); const ex = objExtent(site, o); if (ex.x0 < vis.x0 || ex.x1 > vis.x1) { sceneFit(); sceneDirty(); }
}
function selIndex() { const m = /^obj:(\d+)$/.exec(state.sel || ''); return m ? +m[1] : -1; }
function addLift() { const p = state.plan, l = p.loads[activeLi()], c = curCrane(); p.loads.push({ ...clone(l), name: '', colIdx: '', capOverride: '', hb: c?.hookBlock ?? 1, notes: '' }); selectLoad(p.loads.length - 1); commit({ sheet: true }); toast(`Lift ${p.loads.length} added`); }

// ---------- tackles, contingency, DAF ----------
const DEFAULT_TACKLE_LIB = [
  { name: '4-leg chain sling', type: 'sling', L: 6, w: 0, legs: 4 }, { name: '2-leg wire rope sling', type: 'sling', L: 6, w: 0, legs: 2 },
  { name: 'Webbing slings', type: 'sling', L: 4, w: 0, legs: 2 }, { name: 'Bow shackle', type: 'shackle', L: 0.4, w: 0, legs: 1 },
  { name: 'Spreader beam', type: 'spreader', L: 6, w: 0, legs: 1 }, { name: 'Lifting beam', type: 'beam', L: 4, w: 0, legs: 1 },
  { name: 'Chain block', type: 'chain', L: 1.5, w: 0, legs: 1 }
];
const tackleLib = () => (Array.isArray(state.settings.tackleLib) && state.settings.tackleLib.length ? state.settings.tackleLib : DEFAULT_TACKLE_LIB);
function liftAct(a, d) {
  const p = state.plan, li = activeLi(), l = p.loads[li];
  if (a === 'contSet') { l.cont = +d.v; l.contOn = true; }
  else if (a === 'dafMode') { l.daf = { ...(l.daf || {}), mode: d.v, on: true }; }
  else if (a === 'dafSet') { l.daf = { ...(l.daf || {}), mode: 'manual', v: +d.v, on: true }; }
  else if (a === 'tkAdd') { l.tackles = l.tackles || []; l.tackles.push({ name: '', type: l.tackles.length ? 'sling' : 'shackle', L: l.tackles.length ? 6 : 0.4, w: 0, legs: 2 }); }
  else if (a === 'tkLib') { const src = tackleLib()[+d.v]; if (!src) return; l.tackles = l.tackles || []; l.tackles.push({ ...src }); }
  else if (a === 'tkDel') { l.tackles.splice(+d.j, 1); }
  else if (a === 'tkUp') { const j = +d.j; if (j > 0) [l.tackles[j - 1], l.tackles[j]] = [l.tackles[j], l.tackles[j - 1]]; }
  else if (a === 'tkClear') { l.tackles = []; }
  else if (a === 'tkSave') { const t = l.tackles[+d.j]; if (t) { const lib = [...tackleLib()]; lib.push({ name: t.name || TACKLE_TYPES[t.type], type: t.type, L: num(t.L), w: num(t.w), legs: num(t.legs, 1) }); state.settings.tackleLib = lib; saveSettings(); toast('Saved to your tackle list'); } return; }
  else return;
  commit({ sheet: true });
}

// ---------- weather (ported) ----------
const WX_BLOCKED = 'Live forecasts can\'t load here. Type the wind from any forecast below instead.';
function wxEnsure() { const p = state.plan; if (!p.weather) p.weather = { limit: 9, start: '07:00', hours: 4, manual: {}, print: true }; return p.weather; }
async function wxSearch() {
  const q = (state.wx.q || '').trim(); if (!q) { state.wx.err = 'Type a place first.'; sheetRefresh(); return; }
  state.wx.busy = true; state.wx.err = ''; state.wx.res = null; sheetRefresh();
  try { const r = await WX.geocode(q); state.wx.res = r; if (!r.length) state.wx.err = 'No place found. Try a nearby town, or type coordinates like 24.45, 54.38.'; else if (r.length === 1 && r[0].sub === 'Coordinates') { wxPick(r[0]); return; } }
  catch (e) { state.wx.err = e.blocked ? WX_BLOCKED : 'Search failed: ' + e.message; }
  finally { state.wx.busy = false; sheetRefresh(); }
}
function wxPick(r) { const W = wxEnsure(); Object.assign(W, { place: r.name + (r.sub && r.sub !== 'Coordinates' ? ', ' + r.sub.split(',').pop().trim() : ''), lat: r.lat, lon: r.lon, tz: r.tz || '', hourly: null, fetched: '' }); state.wx.res = null; state.wx.editing = false; markDirty(); wxFetch(); }
async function wxFetch() {
  const W = wxEnsure(); if (W.lat == null) return; state.wx.busy = true; state.wx.err = ''; sheetRefresh();
  try {
    const d = await WX.forecast(+W.lat, +W.lon); W.hourly = d.hourly; W.tz = d.tz || W.tz; W.fetched = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const days = WX.days(W); if (!W.date || !days.includes(W.date)) { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(state.plan.meta.date || ''); const pd = m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null; W.date = pd && days.includes(pd) ? pd : (days[1] || days[0]); }
    toast('Forecast loaded for ' + (W.place || 'the lift site'));
  } catch (e) { state.wx.err = e.blocked ? WX_BLOCKED : 'Forecast failed: ' + e.message; }
  finally { state.wx.busy = false; commit({ sheet: true }); }
}
function wxLocate() {
  if (!navigator.geolocation) { state.wx.err = 'Location is not available here. Type the place instead.'; sheetRefresh(); return; }
  state.wx.busy = true; sheetRefresh();
  navigator.geolocation.getCurrentPosition((pos) => { state.wx.busy = false; wxPick({ name: 'Current location', sub: '', lat: pos.coords.latitude, lon: pos.coords.longitude }); },
    () => { state.wx.busy = false; state.wx.err = 'Location was not shared. Type the site or area instead.'; sheetRefresh(); }, { timeout: 9000, maximumAge: 600000 });
}

// ---------- views: drawing / top / 3D / sheet ----------
function setView(v) {
  if (!['elev', 'plan', '3d', 'sheet'].includes(v)) v = 'elev';
  state.view = v; try { localStorage.setItem('lp.view', v); } catch {}
  const sc = $('#scene'), tw = $('#twin');
  if (v === '3d') { sc.hidden = true; tw.hidden = false; ensureTwin(); }
  else { tw.hidden = true; sc.hidden = false; if (Scene.mode !== v) sceneSetMode(v); }
  if (Scene.tool) sceneSetTool(null);
  if (v !== 'elev') { state.sel = Scene.sel = null; }
  renderFloats(); renderSel(); refresh(true);
}
function ensureTwin() {
  const host = $('#twin'); if (state.twin || host.dataset.failed) return;
  if (!C3D.ok()) { host.dataset.failed = '1'; host.innerHTML = '<div class="twin-msg"><div><b>3D is switched off on this device.</b><br>The drawing, top view and sheet still work.</div></div>'; return; }
  try { state.twin = C3D.twin(host); } catch (e) { console.error(e); host.dataset.failed = '1'; host.innerHTML = `<div class="twin-msg">3D could not start: ${h(e.message)}</div>`; }
}
let twinT; function twinUpdate() { if (state.view !== '3d' || !state.twin || !state.calc) return; clearTimeout(twinT); twinT = setTimeout(() => { try { state.twin.update(state.plan, state.calc, state.calc.crane, livery()); } catch (e) { console.error(e); } }, 30); }

// ---------- theme: follows the phone unless set ----------
function applyTheme() {
  const t = state.settings.theme || 'auto'; V7.theme = t;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  const dark = t === 'dark' || (t === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  Scene.dark = dark; sceneDirty();
}

// ---------- plans ----------
function openPlan(p) {
  state.plan = p; state.sel = Scene.sel = null; Scene.views = {}; state.savedAt = null; state.dirty = false;
  if (state.twin) state.twin.reframe(); closePage(); closeSheet(true);
  histInit(); updateSaveState(); refresh(true); renderSel();
  ensureEnvLoaded(p).then(ch => { if (ch) refresh(); });
}

// ---------- client drawing import (ported) ----------
async function importEnvFlow() {
  const f = await pickFile('.dxf,.pdf,image/png,image/jpeg,image/webp,application/pdf,image/vnd.dxf');
  if (!f) return;
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  if (ext === 'dwg') { toast('Save the DWG as DXF or PDF in AutoCAD first'); return; }
  const kind = ext === 'dxf' ? 'dxf' : ext === 'pdf' || f.type === 'application/pdf' ? 'pdf' : 'img';
  const dlg = openDialog(`<span class="eyebrow">Client drawing</span><h2>${h(f.name)}</h2><p class="hint">Reading the file…</p>`);
  const curMode = state.view === 'plan' ? 'plan' : 'elev';
  const viewSel = `<label class="f"><span class="fl">Show it in</span><select id="imView"><option value="plan">Top view (site plan)</option><option value="elev">Drawing (side view)</option></select></label>`;
  const btns = `<div class="btns two"><button type="button" class="btn" id="imCancel">Cancel</button><button type="button" class="btn pri" id="imGo">Bring it in</button></div>`;
  try {
    let preview = null;
    if (kind === 'dxf') {
      const parsed = await parseDXF(await readText(f));
      const layers = Object.entries(parsed.layerCount).sort((a, b) => b[1] - a[1]);
      const skip = (n) => /^(defpoints|.*(title|frame|border|viewport|vport).*)$/i.test(n);
      dlg.body.innerHTML = `<span class="eyebrow">Client drawing · DXF</span><h2>${h(f.name)}</h2><p class="hint">${parsed.items.length.toLocaleString()} lines on ${layers.length} layers. Untick layers you don't need to keep it light.</p>
        <div class="row">${viewSel}<label class="f"><span class="fl">Units</span><select id="imUnit">${['mm', 'cm', 'm', 'in', 'ft'].map(u => `<option value="${u}"${u === (parsed.units === 'in' ? 'mm' : parsed.units) ? ' selected' : ''}>${{ mm: 'Millimetres', cm: 'Centimetres', m: 'Metres', in: 'Inches', ft: 'Feet' }[u]}</option>`).join('')}</select></label></div>
        <div class="layers">${layers.map(([n, c], i) => `<label class="check"><input type="checkbox" data-layer="${h(n)}" id="ly-${i}"${skip(n) ? '' : ' checked'}> <span>${h(n)}</span><small>${c}</small></label>`).join('')}</div>${btns}`;
      preview = parsed;
    } else if (kind === 'pdf') {
      const pdf = await openPdf(f);
      dlg.body.innerHTML = `<span class="eyebrow">Client drawing · PDF</span><h2>${h(f.name)}</h2><p class="hint">${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''}. Use the scale printed on the drawing. No scale? Leave 200 and fix it later from two points you know.</p>
        <div class="row r3"><label class="f"><span class="fl">Page</span><input type="number" id="imPage" min="1" max="${pdf.numPages}" value="1"></label><label class="f"><span class="fl">Scale 1:</span><input type="number" id="imN" value="200" step="any"></label>${viewSel}</div>${btns}`;
      preview = pdf;
    } else {
      dlg.body.innerHTML = `<span class="eyebrow">Client drawing · photo</span><h2>${h(f.name)}</h2><p class="hint">After it comes in, use “Set scale” on a distance you know.</p><div class="row r1">${viewSel}</div>${btns}`;
    }
    $('#imView', dlg.body).value = curMode;
    $('#imCancel', dlg.body).onclick = () => dlg.close();
    $('#imGo', dlg.body).onclick = async () => {
      const go = $('#imGo', dlg.body); go.disabled = true; go.textContent = 'Bringing it in…';
      try {
        const view = $('#imView', dlg.body).value;
        const e = { id: 'env' + uid(), name: f.name.replace(/\.[^.]+$/, ''), view, kind, x: 0, y: 0, rot: 0, opacity: kind === 'dxf' ? 1 : 0.85, mono: false, hidden: false };
        let payload;
        if (kind === 'dxf') {
          const keep = new Set($$('[data-layer]', dlg.body).filter(c => c.checked).map(c => c.dataset.layer));
          const g = packGeom(preview, keep); e.q = g.q; e.unit = $('#imUnit', dlg.body).value; e.sc = envScaleFrom(e); delete g.npts;
          ENV_CACHE[e.id] = g; payload = { geom: g };
        } else {
          let r;
          if (kind === 'pdf') { r = await renderPdfPage(preview, Math.max(1, Math.min(preview.numPages, Math.round(num($('#imPage', dlg.body).value, 1))))); e.mmPerPx = r.mmPerPx; e.N = num($('#imN', dlg.body).value, 200); e.sc = envScaleFrom(e); }
          else { r = await imageToCanvas(f); e.sc = 0.02; }
          e.w = r.w; e.h = r.h;
          ENV_CACHE[e.id] = { img: r.canvas.toDataURL('image/jpeg', 0.85), w: r.w, h: r.h };
          payload = { canvas: r.canvas, blob: state.assets ? await canvasBlob(r.canvas) : null };
        }
        addEnv(e);
        const where = await persistEnv(e, payload, state.assets);
        if (where === 'inline-big') toast('The drawing is large and may not fit in this phone\'s storage. Untick layers to slim it.');
        dlg.close(); commit({ sheet: true });
        toast('Drawing in. Drag the purple dot to move it.');
      } catch (err) { console.error(err); go.disabled = false; go.textContent = 'Bring it in'; toast('Could not bring it in: ' + err.message); }
    };
  } catch (err) { console.error(err); dlg.close(); toast(err.message || 'Could not read that file'); }
}
function addEnv(e) {
  const p = state.plan; p.env = p.env || []; p.env.push(e); state.openEnv = e.id;
  const mode = e.view === 'plan' ? 'plan' : 'elev'; if (state.view !== mode) setView(mode);
  if (mode === 'plan' && !p.sitePlan.enabled) p.sitePlan.enabled = true;
  state.calc = computePlan(p, cranes(), settingsEff());
  const v = sceneVisible(); envCenterAt(e, (v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2);
  if (mode === 'elev') { const b = envBBox(e); if (b) e.y = r2(num(e.y) - b.y0); }
  Scene.views[mode] = null; sceneView();
}
// canvas tools: measure, scale-from-two-points, line up a point
function sceneToolStep(t, n, pts) {
  const tip = $('#fTip'); if (!tip) return;
  if (!t) { tip.innerHTML = ''; return; }
  const pill = (inner) => `<div class="hint-pill" role="status">${inner}</div>`;
  if (t.kind === 'measure') { tip.innerHTML = pill(n === 2 ? `<span class="num">${Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y).toFixed(2)} m</span><button type="button" data-act="toolOff">Done</button>` : `<span>${n === 1 ? 'Tap the second point' : 'Tap the first point'}</span><button type="button" data-act="toolOff">Done</button>`); return; }
  const en = state.plan.env[t.i];
  if (t.kind === 'calib') {
    if (n === 2) { const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y); tip.innerHTML = pill(`<span>Real distance</span><input type="number" step="any" inputmode="decimal" id="calibDist" value="${r2(d)}" aria-label="Real distance in metres"><span>m</span><button type="button" data-act="calibOk">Set</button><button type="button" data-act="toolOff">Cancel</button>`); setTimeout(() => { const i = $('#calibDist'); i && (i.focus(), i.select()); }, 20); return; }
    tip.innerHTML = pill(`<span>${n === 1 ? 'Tap the other end' : 'Tap one end of a distance you know'}</span><button type="button" data-act="toolOff">Cancel</button>`);
  } else {
    if (n === 2) { envAlign(en, pts[0], pts[1]); sceneSetTool(null); commit(); toast('Drawing moved into place'); return; }
    tip.innerHTML = pill(`<span>${n === 1 ? 'Now tap where it should go' : 'Tap a point on the drawing'}</span><button type="button" data-act="toolOff">Cancel</button>`);
  }
}
function applyCalib() {
  const t = Scene.tool; if (!t || Scene.pts.length < 2) return; const d = num($('#calibDist')?.value);
  if (!(d > 0)) { toast('Type the real distance in metres'); return; }
  const en = state.plan.env[t.i]; envCalibrate(en, Scene.pts[0], Scene.pts[1], d); sceneSetTool(null); commit({ sheet: true }); toast('Scale set. The drawing is now true size.');
}
