// ===== v7 screens: top bar, capacity ring, number tiles, action dock, canvas controls, events =====

function startStudio() {
  state.started = true;
  applyTheme();
  sceneInit($('#scene'), {
    plan: () => state.plan, calc: () => state.calc, livery,
    sheet: () => { if (!state._sheet || state._sheet.calc !== state.calc) { const { P, scale } = buildSheet(state.plan, state.calc, settingsEff()); state._sheet = { calc: state.calc, P, scale }; } return state._sheet; },
    edited: (kind) => { markDirty(); refresh(true); if (kind === 'drag-end' || kind === 'delete' || kind === 'nudge') histMark(); if (kind === 'delete') { state.sel = null; renderSel(); } },
    select: (s) => { state.sel = s; renderSel(); },
    tool: (t, n, pts) => sceneToolStep(t, n, pts),
    hover: () => {}, rendered: () => {}
  });
  bindUI();
  renderTop(); renderFloats();
  setView(state.view);
  histInit(); updateSaveState();
  ensureEnvLoaded(state.plan).then(ch => { if (ch) refresh(); });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if ((state.settings.theme || 'auto') === 'auto') applyTheme(); });
  window.matchMedia('(min-width: 900px)').addEventListener?.('change', () => { $('#panel').dataset.sig = ''; refresh(true); renderFloats(); });
  if (!LS.get('lp.coach7', false)) setTimeout(coachStart, 900);
}

// ---------- top bar ----------
function renderTop() {
  const el = $('#top'); if (!el || !state.calc) return;
  const p = state.plan, li = activeLi();
  const sig = [p.loads.length, li, isDesk()].join('|');
  if (el.dataset.sig !== sig) {
    el.dataset.sig = sig;
    el.innerHTML = `<button type="button" class="brand tap" data-act="plans" aria-label="Plans"><span class="mk">${ic('crane', 22, 2)}</span><span class="nm"><b id="tbName"></b><small id="saveState"></small></span></button>
      <nav class="lifts" role="tablist" aria-label="Lifts">${p.loads.map((x, i) => `<button type="button" role="tab" class="lift-t tap" data-act="lift" data-i="${i}" aria-selected="${i === li}"><i class="dot" id="ltd${i}"></i><span>Lift ${i + 1}</span><span class="lt-w num" id="ltw${i}"></span></button>`).join('')}${p.loads.length < 6 ? `<button type="button" class="lift-t add tap" data-act="liftAdd" aria-label="Add a lift">${ic('plus', 18, 2.2)}</button>` : ''}</nav>
      <button type="button" class="tb-btn tb-undo tap" data-act="undo" id="tbUndo" aria-label="Undo" title="Undo (Ctrl Z)">${ic('undo', 22)}</button>
      <button type="button" class="tb-btn tb-undo tap" data-act="redo" id="tbRedo" aria-label="Redo" title="Redo (Ctrl Shift Z)">${ic('redo', 22)}</button>
      <button type="button" class="tb-btn tb-save tap" data-act="save" id="tbSave" aria-label="Save plan" title="Save (Ctrl S)">${ic('save', 22)}<i></i></button>
      <button type="button" class="tb-pdf tap" data-act="pdf" id="bPdf">${ic('dl', 18, 2.2)}PDF</button>
      <button type="button" class="tb-btn tap" data-act="more" aria-label="More">${ic('more', 26, 3)}</button>`;
    updateSaveState();
  }
  const nm = $('#tbName'); if (nm) nm.textContent = p.name || p.meta?.title || 'Untitled plan';
  p.loads.forEach((x, i) => { const r = state.calc.loads[i]; const d = $('#ltd' + i); if (d) d.className = 'dot ' + utilCls(r); const w = $('#ltw' + i); if (w) w.textContent = x.empty ? 'empty' : fmt(num(x.w), 1) + ' t'; });
  $('#tbSave')?.classList.toggle('dirty', !!state.dirty);
  renderTopUndo();
}
function renderTopUndo() { const u = $('#tbUndo'), r = $('#tbRedo'); if (u) u.disabled = !V7.hist.u.length; if (r) r.disabled = !V7.hist.r.length; }

// ---------- the panel: ring + numbers + dock ----------
const TILES = [['R', 'Reach', 'reach', 'm', 1], ['L', 'Boom', 'boom', 'm', 1], ['A', 'Angle', 'angle', '°', 0], ['H', 'Height', 'height', 'm', 1]];
const DOCK = [['crane', 'Crane', 'crane'], ['side', 'Side', 'side'], ['legs', 'Legs', 'legs'], ['load', 'Hook', 'hook'], ['site', 'Site', 'site'], ['print', 'Print', 'print']];
function renderPanel() {
  const el = $('#panel'); if (!el || !state.calc) return;
  const desk = isDesk(); const sig = desk ? 'd' : 'm';
  if (el.dataset.sig !== sig) {
    el.dataset.sig = sig;
    const ring = `<button type="button" class="status tap" id="stCard" data-act="checks" aria-label="Lift status — open the checks">
        <div class="ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="trk" cx="50" cy="50" r="43" fill="none" stroke-width="11"/><circle class="arc" id="ringArc" cx="50" cy="50" r="43" fill="none" stroke-width="11" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100"/></svg><div class="val"><b id="ringN" class="num">0</b><small>%</small></div></div>
        <div class="verdict"><div class="vw"><span class="vi" id="vIc"></span><span id="vWord"></span></div><div class="vs2" id="vSub"></div></div>
        ${desk ? '' : ic('chev', 20, 2.2).replace('<svg', '<svg class="chev"')}</button>`;
    const wt = `<button type="button" class="wt tap" id="wtBtn" data-act="dial" data-k="W" aria-label="Load weight"><span class="wl">${ic('weight', 16, 2.2)}Load</span><span class="wv num" id="wtV"></span></button>`;
    const tiles = TILES.map(([k, t, icn, u]) => `<button type="button" class="tile tap" data-act="dial" data-k="${k}" id="tile${k}" aria-label="${t}"><span class="tl"><span class="ti" id="ti${k}" data-i="${icn}">${ic(icn, 15, 2.2)}</span>${t}</span><span class="tv num" id="tv${k}"></span></button>`).join('')
      + `<button type="button" class="tile ro tile-gap tap" data-act="site" id="tileG" aria-label="Gap to building"><span class="tl">${ic('gap', 15, 2.2)}Gap to building</span><span class="tv num" id="tvG"></span></button>`
      + `<button type="button" class="tile ro tile-gap tap" data-act="checks" id="tileC" aria-label="Crane can lift"><span class="tl">${ic('crane', 15, 2.2)}Crane can lift</span><span class="tv num" id="tvC"></span></button>`;
    const dock = DOCK.map(([k, t, icn]) => `<button type="button" class="dk tap" data-act="${k}" aria-label="${t}"><span class="di">${ic(icn, 26)}<i class="badge" id="bd-${k}" hidden></i></span><span>${t}</span><span class="dsub" id="ds-${k}"></span></button>`).join('');
    el.innerHTML = desk ? `${ring}${wt}<div class="tiles">${tiles}</div><div class="checks-mini" id="ckMini"></div><nav class="dock" aria-label="Set up">${dock}</nav>`
      : `<div class="status-row">${ring}${wt}</div><div class="tiles">${tiles}</div><nav class="dock" aria-label="Set up">${dock}</nav>`;
  }
  const calc = state.calc, li = activeLi(), r = calc.loads[li], l = state.plan.loads[li], S = settingsEff();
  const st = utilCls(r); const card = $('#stCard'); card.className = 'status tap st-' + st;
  const [word, vic] = VERDICT[st]; $('#vWord').textContent = word; $('#vIc').innerHTML = ic(vic, 16, 3);
  $('#vSub').innerHTML = r?.cap != null ? (isDesk() ? `<b>${fmt(r.daf ? r.design : r.total, 1)} t</b> on hook · crane can take <b>${fmt(r.cap, 1)} t</b>` : `<b>${fmt(r.daf ? r.design : r.total, 1)}</b> of <b>${fmt(r.cap, 1)} t</b>`) : `<b>Out of reach</b>`;
  ringTo(r?.cap != null ? r.util : null);
  const wv = $('#wtV'); if (wv) wv.innerHTML = l.empty ? 'Empty hook' : `${fmt(num(l.w), num(l.w) < 10 ? 2 : 1).replace(/\.?0+$/, '')}<small>t</small>`;
  $('#wtBtn')?.classList.toggle('empty', !!l.empty);
  const by = l.by === 'angle' ? 'A' : l.by === 'height' ? 'H' : 'R';
  for (const [k, , , u, d] of TILES) {
    const v = dialValue(k); const t = $('#tile' + k); if (!t) continue;
    $('#tv' + k).innerHTML = v != null && isFinite(v) ? `${(+v).toFixed(d)}<small>${u}</small>` : '—';
    const held = k === by; if (t.classList.contains('held') !== held || !t.dataset.init) { t.dataset.init = '1'; const ti = $('#ti' + k); if (ti) ti.innerHTML = held ? ic('lock', 12, 2.8) : ic(ti.dataset.i, 15, 2.2); t.setAttribute('aria-label', TILES.find(x => x[0] === k)[1] + (held ? ', kept fixed' : '')); }
    t.classList.toggle('held', held); t.classList.toggle('bad', k !== 'L' && !r?.geo?.tip);
  }
  const gt = $('#tileG'); if (gt) { const c = r?.clearance; const mc = num(S.minClearance, 1); gt.className = 'tile ro tile-gap tap ' + (c == null ? '' : c <= 0 ? 'fail' : c < mc ? 'warn' : 'ok'); $('#tvG').innerHTML = c != null ? `${c.toFixed(2)}<small>m</small>` : '<small>no building</small>'; }
  const ct = $('#tileC'); if (ct) $('#tvC').innerHTML = r?.cap != null ? `${fmt(r.cap, 1)}<small>t</small>` : '—';
  // dock subtitles + badges
  const crane = r?.crane || calc.crane; const all = calc.loads.flatMap(x => x.checks);
  const sev = (list) => list.some(c => c.s === 'fail') ? 'fail' : list.some(c => c.s === 'warn') ? 'warn' : '';
  const sub = { crane: crane?.model || '', side: SIDES.find(s => s[0] === sideOfLoad(l))?.[1] || '', load: (l.tackles || []).length ? `${l.tackles.length} tackle${l.tackles.length > 1 ? 's' : ''} · ${fmt(r?.tk, 2)} t` : `hook ${fmt(r?.hb ?? l.hb, 2)} t`, legs: legsDockSub(calc, r), site: (state.plan.site.obstacles || []).length ? `${state.plan.site.obstacles.length} object${state.plan.site.obstacles.length > 1 ? 's' : ''}` : 'nothing placed', print: (state.settings.paper || 'A1') + ' sheet' };
  const badge = { crane: sev(all.filter(c => /Geometry|chart|Chart|side/i.test(c.t))), site: sev(all.filter(c => /clearance/i.test(c.t))), load: sev(all.filter(c => /Headroom|Sling/i.test(c.t))), side: sev(all.filter(c => /side/i.test(c.t) && /chart/i.test(c.t))), legs: sev([...all.filter(c => /^(Leg loads|Outriggers|Backward stability)$/.test(c.t)), ...(calc.outrigs || []).flatMap(o => o.checks), ...(calc.ground ? [calc.ground] : [])]), print: calc.sheetOv?.some(x => x.safety) ? 'warn' : '' };
  for (const [k] of DOCK) { const s = $('#ds-' + k); if (s) s.textContent = sub[k]; const b = $('#bd-' + k); if (b) { b.hidden = !badge[k]; b.className = 'badge ' + (badge[k] === 'warn' ? 'warn' : ''); b.textContent = '!'; } }
  const ck = $('#ckMini'); if (ck) { const items = allChecks(calc).filter(c => c.s === 'fail' || c.s === 'warn').slice(0, 3); ck.hidden = !items.length; ck.innerHTML = items.map(c => `<button type="button" class="ck ${c.s} tap" data-act="checks" style="text-align:left;width:100%"><span class="ci">${ic(c.s === 'fail' ? 'stop' : 'alert', 14, 3)}</span><div><b>${h(c.t)}</b><span>${h(c.m)}</span></div></button>`).join(''); }
}
// ring: spring-animated toward the new utilisation (critically damped — no wobble, just weight)
function ringTo(u) {
  const target = u == null ? 0 : Math.max(0, u);
  const arc = $('#ringArc'), n = $('#ringN'); if (!arc || !n) return;
  if (u == null) n.textContent = '—';
  V7.ringT = target; if (V7.ringRaf) return;
  if (reduceMotion()) { V7.ringU = target; paintRing(u == null); return; }
  let v = V7.ringV || 0, last = performance.now();
  const step = (now) => {
    let dt = Math.min(0.25, (now - last) / 1000); last = now;
    const k = 260, c = 2 * Math.sqrt(k);
    while (dt > 0) { const s = Math.min(0.008, dt); dt -= s; const a = k * (V7.ringT - V7.ringU) - c * v; v += a * s; V7.ringU += v * s; } // fixed sub-steps: same feel at 30 or 120 fps
    if (Math.abs(V7.ringT - V7.ringU) < 0.05 && Math.abs(v) < 0.05) { V7.ringU = V7.ringT; v = 0; V7.ringRaf = 0; V7.ringV = 0; paintRing(state.calc?.loads?.[activeLi()]?.cap == null); return; }
    V7.ringV = v; paintRing(false); V7.ringRaf = requestAnimationFrame(step);
  };
  V7.ringRaf = requestAnimationFrame(step);
}
function paintRing(none) {
  const arc = $('#ringArc'), n = $('#ringN'); if (!arc || !n) return;
  const u = V7.ringU; const f = Math.max(0, Math.min(100, u));
  arc.setAttribute('stroke-dasharray', `${f.toFixed(2)} 100`);
  n.textContent = none ? '—' : Math.round(u);
}

// ---------- canvas floating controls ----------
const VIEWS = [['elev', 'Drawing', 'elev'], ['plan', 'Top', 'plan'], ['3d', '3D', 'cube'], ['sheet', 'Sheet', 'sheet']];
function renderFloats() {
  const tl = $('#fTL'), tr = $('#fTR'); if (!tl || !tr) return;
  tl.innerHTML = `<div class="pill-bar" role="tablist" aria-label="View">${VIEWS.map(([k, t, icn]) => `<button type="button" role="tab" class="vs tap" data-act="view" data-v="${k}" aria-selected="${state.view === k}">${ic(icn, 20)}<span>${t}</span></button>`).join('')}</div>`;
  if (state.view === '3d') tr.innerHTML = `<div class="pill-bar">${[['iso', 'Angle'], ['side', 'Side'], ['top', 'Top']].map(([v, t]) => `<button type="button" class="fbtn tap" data-act="tw" data-v="${v}" aria-label="${t} view" style="width:auto;padding:0 10px;font-size:13px;font-weight:600">${t}</button>`).join('')}<button type="button" class="fbtn tap" data-act="twFit" aria-label="Fit">${ic('fit', 20)}</button></div>`;
  else tr.innerHTML = `<div class="pill-bar">${isDesk() ? `<button type="button" class="fbtn tap" data-act="zout" aria-label="Zoom out">${ic('zout', 20)}</button><button type="button" class="fbtn tap" data-act="zin" aria-label="Zoom in">${ic('zin', 20)}</button>` : ''}${state.view !== 'sheet' ? `<button type="button" class="fbtn tap" data-act="measure" aria-pressed="${Scene.tool?.kind === 'measure'}" aria-label="Measure">${ic('measure', 20)}</button>` : ''}<button type="button" class="fbtn tap" data-act="fit" aria-label="Fit to screen">${ic('fit', 20)}</button></div>`;
}
function renderSel() {
  const el = $('#fSel'); if (!el) return;
  const i = selIndex(); const o = i >= 0 && state.view === 'elev' ? state.plan.site.obstacles[i] : null;
  if (!o) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="sel-bar" role="toolbar" aria-label="Selected object">${oic(o.type, 22)}<b>${h(o.label || OBJ_TYPES[o.type]?.label || o.type)}</b><button type="button" class="tap" data-act="selEdit">${ic('sliders', 18)}Edit</button><button type="button" class="tap" data-act="selDup" aria-label="Copy">${ic('copy', 18)}</button><button type="button" class="tap danger" data-act="selDel" aria-label="Delete">${ic('trash', 18)}</button></div>`;
}

// ---------- events ----------
function bindUI() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b || b.closest('#login')) return;
    const a = b.dataset.act, p = state.plan, d = b.dataset;
    if (a === 'lift') { selectLoad(+d.i); refresh(true); renderTop(); sheetRefresh(); }
    else if (a === 'liftAdd') { addLift(); renderTop(); }
    else if (a === 'view') setView(d.v);
    else if (a === 'fit') { if (state.view === '3d') { state.twin?.reframe(); twinUpdate(); } else { sceneFit(); sceneDirty(); } }
    else if (a === 'zin') sceneZoom(1.35); else if (a === 'zout') sceneZoom(1 / 1.35);
    else if (a === 'measure') { sceneSetTool(Scene.tool?.kind === 'measure' ? null : { kind: 'measure' }); renderFloats(); }
    else if (a === 'toolOff') { sceneSetTool(null); renderFloats(); }
    else if (a === 'calibOk') applyCalib();
    else if (a === 'tw') state.twin?.view(d.v); else if (a === 'twFit') { state.twin?.reframe(); twinUpdate(); }
    else if (a === 'undo') histGo(-1); else if (a === 'redo') histGo(1);
    else if (a === 'save') savePlan(false).then(() => renderTop());
    else if (a === 'pdf') exportPDF('A1');
    else if (a === 'plans') openPage('plans');
    else if (a === 'more') openSheet('more');
    else if (a === 'checks') openSheet('checks');
    else if (a === 'dial') openSheet('dial', d.k);
    else if (['crane', 'side', 'legs', 'load', 'site', 'print'].includes(a)) openSheet(a);
    else if (a === 'selEdit') { const i = selIndex(); if (i >= 0) openSheet('obj', i); }
    else if (a === 'selDup') { const k = selIndex(); if (k >= 0) { const o = clone(p.site.obstacles[k]); const ex = objExtent(p.site, o); o.x = r2(num(o.x) + (ex.x1 - ex.x0) + 1); p.site.obstacles.push(o); state.sel = Scene.sel = 'obj:' + (p.site.obstacles.length - 1); commit(); renderSel(); } }
    else if (a === 'selDel') { const k = selIndex(); if (k >= 0) { p.site.obstacles.splice(k, 1); state.sel = Scene.sel = null; commit(); renderSel(); toast('Removed'); } }
    else return;
  });
  document.addEventListener('keydown', (e) => {
    if (document.body.classList.contains('locked')) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); savePlan(false).then(() => renderTop()); return; }
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); histGo(e.shiftKey ? 1 : -1); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); histGo(1); return; }
    if (e.key === 'Escape') { if (V7.sheet) { closeSheet(); return; } if (Scene.tool) { sceneSetTool(null); renderFloats(); } return; }
    if (mod || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase(); if (['input', 'select', 'textarea'].includes(tag) || e.target.isContentEditable) return;
    if (V7.sheet || state.page) return;
    const views = { 1: 'elev', 2: 'plan', 3: '3d', 4: 'sheet' }; if (views[e.key]) { setView(views[e.key]); e.preventDefault(); return; }
    if (e.key === 'f' || e.key === 'F') { if (state.view === '3d') { state.twin?.reframe(); twinUpdate(); } else { sceneFit(); sceneDirty(); } return; }
    if (e.key === 'm' || e.key === 'M') { if (state.view === 'elev' || state.view === 'plan') { sceneSetTool(Scene.tool?.kind === 'measure' ? null : { kind: 'measure' }); renderFloats(); } return; }
    if (e.key === '[' || e.key === ']') { const li = activeLi(), l = state.plan.loads[li], dd = (e.key === ']' ? 1 : -1) * (e.shiftKey ? 5 : 0.5); const k = l.by === 'angle' ? 'A' : l.by === 'height' ? 'H' : 'R'; const v = dialValue(k); if (v != null) setDial(k, v + dd); }
  });
  document.addEventListener('keydown', (e) => { if (e.target.id === 'calibDist' && e.key === 'Enter') { e.preventDefault(); applyCalib(); } });
}

// ---------- first-run coach marks: three bubbles, no more ----------
const COACH = [
  ['#stCard', 'Is it safe?', 'Green means the crane can do this lift. Amber, be careful. Red, stop. The number is how much of the crane\'s strength the lift uses.'],
  ['.tiles', 'Change the numbers', 'Tap Load, Reach, Boom or Angle to change it. Big plus and minus buttons, or slide.'],
  ['.dock', 'Set up the job', 'Pick the crane, the side you lift on, what hangs on the hook, buildings nearby, then print the plan.']
];
function coachStart(force) { // never interrupts: skipped while a sheet or page is open, or once seen
  if (document.body.classList.contains('locked') || V7.coach != null || V7.sheet || state.page || (!force && LS.get('lp.coach7', false))) return;
  V7.coach = 0; coachShow();
}
function coachShow() {
  let el = $('#coach'); if (!el) { el = document.createElement('div'); el.id = 'coach'; el.className = 'coach'; document.body.appendChild(el); }
  const i = V7.coach; const step = COACH[i]; const t = step && $(step[0]);
  if (!step || !t) { el.remove(); V7.coach = null; LS.set('lp.coach7', true); return; }
  const r = t.getBoundingClientRect(); const pad = 6;
  const below = r.top < window.innerHeight * 0.45; const bw = Math.min(300, window.innerWidth - 24);
  const left = Math.max(12, Math.min(window.innerWidth - bw - 12, r.left + r.width / 2 - bw / 2));
  el.innerHTML = `<div class="ring-hl" style="left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px"></div>
    <div class="bub" role="dialog" aria-label="${h(step[1])}" style="width:${bw}px;left:${left}px;${below ? `top:${r.bottom + 16}px` : `bottom:${window.innerHeight - r.top + 16}px`}"><b>${h(step[1])}</b>${h(step[2])}
    <div class="btns"><button type="button" class="btn sm" id="coSkip">Skip</button><button type="button" class="btn sm pri" id="coNext">${i < COACH.length - 1 ? 'Next' : 'Got it'}</button></div></div>`;
  $('#coSkip').onclick = () => { V7.coach = 99; coachShow(); };
  $('#coNext').onclick = () => { V7.coach++; coachShow(); };
  setTimeout(() => $('#coNext')?.focus(), 50);
}
