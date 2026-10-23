// ===== v7 sheets: every editor opens as a bottom sheet on phones and a side card on desktop =====

// ---------- field helpers (inset-grouped rows bound to plan paths) ----------
const fval = (path) => getP(state.plan, path);
const Fx = {
  num(path, label, unit, o = {}) { const v = fval(path); return `<label class="it${o.off ? ' off' : ''}"><span class="lb"><b>${h(label)}</b>${o.sub ? `<small>${h(o.sub)}</small>` : ''}</span><input class="fld num" type="text" inputmode="decimal" autocomplete="off" data-k="${path}" data-t="num"${o.re ? ' data-re="1"' : ''} value="${h(v ?? '')}"${o.ph != null ? ` placeholder="${h(o.ph)}"` : ''}${o.off ? ' disabled' : ''} aria-label="${h(label)}">${unit ? `<span class="unit">${h(unit)}</span>` : ''}</label>`; },
  text(path, label, o = {}) { const v = fval(path); return `<label class="it"><span class="lb"><b>${h(label)}</b></span><input class="fld" type="text" autocomplete="off" data-k="${path}"${o.re ? ' data-re="1"' : ''} value="${h(v ?? '')}"${o.ph ? ` placeholder="${h(o.ph)}"` : ''} aria-label="${h(label)}"></label>`; },
  area(path, label, o = {}) { return `<label class="it stack"><span class="lb"><b>${h(label)}</b></span><textarea class="fld" data-k="${path}" rows="${o.rows || 3}"${o.ph ? ` placeholder="${h(o.ph)}"` : ''} aria-label="${h(label)}">${h(fval(path) || '')}</textarea></label>`; },
  sel(path, label, opts, o = {}) { const v = String(fval(path) ?? ''); return `<label class="it"><span class="lb"><b>${h(label)}</b>${o.sub ? `<small>${h(o.sub)}</small>` : ''}</span><select class="fld" data-k="${path}"${o.numeric ? ' data-t="int"' : ''} data-re="1" aria-label="${h(label)}">${opts.map(([val, lab]) => `<option value="${h(val)}"${String(val) === v ? ' selected' : ''}>${h(lab)}</option>`).join('')}</select></label>`; },
  sw(path, label, o = {}) { return `<label class="it"><span class="lb"><b>${h(label)}</b>${o.sub ? `<small>${h(o.sub)}</small>` : ''}</span><span class="sw"><input type="checkbox" data-k="${path}" data-t="bool" data-re="1"${fval(path) ? ' checked' : ''}${o.dis ? ' disabled' : ''} aria-label="${h(label)}"><i></i></span></label>`; },
  swRaw(attr, label, on, o = {}) { return `<label class="it${o.ic ? ' has-ic' : ''}">${o.ic || ''}<span class="lb"><b>${h(label)}</b>${o.sub ? `<small>${h(o.sub)}</small>` : ''}</span><span class="sw"><input type="checkbox" ${attr}${on ? ' checked' : ''}${o.dis ? ' disabled' : ''} aria-label="${h(label)}"><i></i></span></label>`; },
  link(act, label, o = {}) { return `<button type="button" class="it${o.ic ? ' has-ic' : ''} tap" data-sa="${act}"${o.data ? ' ' + o.data : ''}>${o.ic || ''}<span class="lb"><b>${h(label)}</b>${o.sub ? `<small>${o.sub}</small>` : ''}</span>${o.val != null ? `<span class="vl">${o.val}</span>` : ''}${ic('chev', 18, 2.2).replace('<svg', '<svg class="ch"')}</button>`; },
  ro(label, val, o = {}) { return `<div class="it"><span class="lb"><b>${h(label)}</b>${o.sub ? `<small>${h(o.sub)}</small>` : ''}</span><span class="vl"${o.live ? ` data-live="${o.live}"` : ''}>${val}</span></div>`; }
};
const grp = (title, inner, o = {}) => `<section class="grp">${title ? `<h3>${h(title)}${o.right ? `<span class="sp"></span>${o.right}` : ''}</h3>` : ''}${o.raw ? inner : `<div class="list">${inner}</div>`}${o.foot ? `<p class="foot">${o.foot}</p>` : ''}</section>`;
const icb = (k, bg) => `<span class="ic" style="background:${bg}">${ic(k, 18, 2.2)}</span>`;
const note = (cls, iconK, html) => `<div class="note ${cls}">${ic(iconK, 18, 2.4)}<div>${html}</div></div>`;

// ---------- sheet frame ----------
const SH = {}; // kind → { title(arg), icon, body(arg), live?(root,arg) }
function openSheet(kind, arg) {
  const def = SH[kind]; if (!def) return;
  let scrim = $('#scrim'), sh = $('#sheet');
  if (!sh) {
    scrim = document.createElement('div'); scrim.id = 'scrim'; scrim.className = 'scrim'; document.body.appendChild(scrim);
    sh = document.createElement('section'); sh.id = 'sheet'; sh.className = 'sheet'; sh.setAttribute('role', 'dialog'); sh.setAttribute('aria-modal', 'true');
    sh.innerHTML = '<div class="grab" aria-hidden="true"></div><header class="sh-h" id="shH"></header><div class="sh-b" id="shB"></div>';
    document.body.appendChild(sh); bindSheet(sh, scrim);
  }
  const was = V7.sheet; const prev = was && was.kind !== kind ? was : null;
  V7.sheet = { kind, arg, back: prev && def.sub ? { kind: prev.kind, arg: prev.arg, back: prev.back } : (was && was.kind === kind ? was.back : null) };
  scrim.classList.toggle('desk-clear', true);
  sh.setAttribute('aria-label', def.title(arg));
  sheetRender(true);
  scrim.hidden = false; sh.hidden = false; sh.classList.remove('drag'); sh.style.transform = '';
  requestAnimationFrame(() => { scrim.classList.add('on'); sh.classList.add('on'); });
  if (!was) { const f = sh.querySelector('[autofocus]'); if (f && isDesk()) setTimeout(() => f.focus({ preventScroll: true }), 120); }
}
function closeSheet(instant) {
  const sh = $('#sheet'), scrim = $('#scrim'); if (!sh || !V7.sheet) return;
  if (V7.sheet.back && !instant) { const b = V7.sheet.back; V7.sheet = null; openSheet(b.kind, b.arg); if (V7.sheet) V7.sheet.back = b.back; return; }
  V7.sheet = null; sh.classList.remove('on'); scrim.classList.remove('on'); sh.style.transform = '';
  if (V7.rigBack != null) { const rb = V7.rigBack; V7.rigBack = null; switchRig(rb); refresh(true); } // v9: back to the lift's own crane after editing a tandem crane
  const done = () => { if (!V7.sheet) { sh.hidden = true; scrim.hidden = true; $('#shB').innerHTML = ''; } };
  if (instant) done(); else setTimeout(done, 520);
  const ae = document.activeElement; if (ae && sh.contains(ae)) ae.blur();
}
function sheetRender(fresh) {
  const s = V7.sheet; if (!s) return; const def = SH[s.kind];
  const hd = $('#shH'), bd = $('#shB'); const keep = fresh ? 0 : bd.scrollTop;
  hd.innerHTML = `${s.back ? `<button type="button" class="sh-back tap" data-sa="back">${ic('chevL', 22, 2.4)}Back</button>` : (def.icon ? `<span class="sh-ic">${ic(def.icon, 20, 2.2)}</span>` : '')}<h2>${h(def.title(s.arg))}${def.sub && def.subtitle ? `<small>${h(def.subtitle(s.arg))}</small>` : def.subtitle ? `<small>${h(def.subtitle(s.arg))}</small>` : ''}</h2><button type="button" class="sh-x tap" data-sa="close" aria-label="Close">${ic('x', 18, 2.6)}</button>`;
  let html = ''; try { html = def.body(s.arg); } catch (e) { console.error(e); html = `<p class="errs">Something went wrong here: ${h(e.message)}</p>`; }
  bd.innerHTML = html; bd.classList.toggle('fade-in', !!fresh); bd.scrollTop = keep;
  syncSliders(bd); sheetLive();
}
function sheetRefresh() { // full re-render, unless the person is typing in this sheet
  if (!V7.sheet) return; const ae = document.activeElement; const bd = $('#shB');
  if (ae && bd && bd.contains(ae) && /^(text|number|search|textarea)$/.test(ae.type || ae.tagName.toLowerCase())) { sheetLive(); return; }
  if (V7.sliding) { sheetLive(); return; }
  sheetRender(false);
}
function sheetLive() { // update only the computed numbers inside the open sheet
  const s = V7.sheet; if (!s) return; const def = SH[s.kind]; const bd = $('#shB'); if (!bd) return;
  if (def.live) def.live(bd, s.arg);
  for (const el of $$('[data-live]', bd)) { const v = liveVal(el.dataset.live); if (v != null && el.innerHTML !== v) el.innerHTML = v; }
}
function syncSliders(root) { for (const r of $$('input[type=range].slider', root)) { const mn = +r.min || 0, mx = +r.max || 100; r.style.setProperty('--p', ((+r.value - mn) / Math.max(1e-9, mx - mn) * 100).toFixed(2) + '%'); } }
function liveVal(k) {
  const li = activeLi(), r = state.calc?.loads?.[li]; if (!r) return null;
  const M = {
    total: `${fmt(r.total, 2)} t`, design: r.daf ? `${fmt(r.design, 2)} t` : '—', cap: r.cap != null ? `${fmt(r.cap, 2)} t` : '—', util: r.util != null ? `${r.util.toFixed(1)}%` : '—', tk: `${fmt(r.tk, 2)} t`,
    rigH: r.stack ? `${fmt(r.stack.H, 2)} m` : '—', daf: r.daf ? r.daf.toFixed(3) : '—', sling: r.sling ? `${r.sling.T.toFixed(2)} t per leg` : '—', gap: r.clearance != null ? `${r.clearance.toFixed(2)} m` : '—',
    netcap: typeof netCapRows === 'function' ? netCapRows(r) : '', windbox: typeof windRows === 'function' ? windRows(r) : '', net: r.netCap != null ? `${fmt(r.netCap, 2)} t` : '—'
  };
  return M[k] ?? null;
}

// ---------- sheet events ----------
function bindSheet(sh, scrim) {
  scrim.addEventListener('click', () => closeSheet(true));
  // drag the header / grabber down to dismiss (phones). Follows the finger, flicks close, springs back otherwise.
  let drag = null;
  const startDrag = (e) => { if (isDesk() || e.button > 0 || e.target.closest('button,input,select,textarea')) return; drag = { y0: e.clientY, t0: performance.now(), y: 0, id: e.pointerId }; sh.classList.add('drag'); try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} };
  const moveDrag = (e) => { if (!drag || e.pointerId !== drag.id) return; const dy = e.clientY - drag.y0; drag.y = dy > 0 ? dy : dy / 6; sh.style.transform = `translateY(${drag.y}px)`; scrim.style.opacity = String(Math.max(0, 1 - drag.y / 500)); };
  const endDrag = (e) => { if (!drag || e.pointerId !== drag.id) return; const v = drag.y / Math.max(1, performance.now() - drag.t0); sh.classList.remove('drag'); scrim.style.opacity = ''; if (drag.y > 110 || (v > 0.6 && drag.y > 24)) { drag = null; closeSheet(true); } else { sh.style.transform = ''; drag = null; } };
  for (const el of [sh.querySelector('.grab'), sh.querySelector('.sh-h')]) { el.addEventListener('pointerdown', startDrag); el.addEventListener('pointermove', moveDrag); el.addEventListener('pointerup', endDrag); el.addEventListener('pointercancel', endDrag); }
  sh.addEventListener('click', (e) => { const b = e.target.closest('[data-sa]'); if (b) sheetAct(b.dataset.sa, b.dataset, b, e); });
  sh.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'dialRg') { V7.sliding = true; syncSliders(t.parentElement); dialSet(+t.value, true); return; }
    if (t.id === 'craneQ') { state.craneQ = t.value; const g = $('#cgrid'); if (g) g.innerHTML = craneGrid(); return; }
    if (t.id === 'wxQ') { state.wx.q = t.value; return; }
    if (t.dataset.tsec != null) { V7.sliding = true; syncSliders(t.parentElement); teleSetSection(+t.dataset.tsec, +t.value / 100); return; }
    if (t.dataset.k && t.dataset.t !== 'bool' && t.tagName !== 'SELECT') { setP(state.plan, t.dataset.k, fieldVal(t)); markDirty(); refresh(); sheetLive(); }
    if (t.dataset.tk) { const [j, f] = t.dataset.tk.split('.'); const l = state.plan.loads[activeLi()]; l.tackles[+j][f] = f === 'name' ? t.value : t.value; markDirty(); refresh(); }
  });
  sh.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'dialRg') { V7.sliding = false; histMark(); sheetLive(); return; }
    if (t.id === 'dialIn') { const v = num(String(t.value).replace(/[^\d.,-]/g, ''), NaN); if (isFinite(v)) dialSet(v, false); else sheetLive(); return; }
    if (t.dataset.tsec != null) { V7.sliding = false; histMark(); sheetRefresh(); return; }
    if (t.dataset.acc) { accToggle(t.dataset.acc, t.checked); return; }
    if (t.dataset.s) { settingsSet(t); return; }
    if (t.dataset.tk) { const [j, f] = t.dataset.tk.split('.'); const l = state.plan.loads[activeLi()]; l.tackles[+j][f] = f === 'type' || f === 'name' ? t.value : (t.value === '' ? '' : num(t.value)); if (f === 'type' || f === 'legs') { if (f === 'legs') l.tackles[+j].legs = +t.value; } commit({ sheet: f === 'type' }); return; }
    if (t.dataset.sr) { const R = state.plan.sheetRows = state.plan.sheetRows || { hide: {}, show: {}, custom: [] }; R.hide = R.hide || {}; R.show = R.show || {}; const k = t.dataset.sr;
      if (t.checked) { delete R.hide[k]; if (SHEET_ROWS_OFF[k]) R.show[k] = true; } else { if (SHEET_ROWS_OFF[k]) delete R.show[k]; else R.hide[k] = true; } commit(); return; }
    if (t.dataset.srsec != null) { const c = state.plan.sheetRows.custom[+t.dataset.srsec]; const v = t.value; if (v.startsWith('load')) { c.sec = 'load'; c.load = v === 'load' ? '' : +v.slice(4); } else { c.sec = v; c.load = ''; } commit(); return; }
    if (t.id === 'loadPreset') return;
    const k = t.dataset.k; if (!k) return;
    let v = fieldVal(t);
    const p = state.plan;
    if (k === 'boomOverride' && v !== '') { setDial('L', num(v)); sheetRefresh(); return; }
    if (k === 'activeLoad') { selectLoad(+v); commit({ sheet: true }); return; }
    if (/^loads\.\d+\.crane$/.test(k)) { setLoadRig(+k.split('.')[1], +v); commit({ sheet: true }); return; }
    setP(p, k, v);
    if (k === 'chartIdx') { p.colIdx = 0; p.cwt = null; p.config = null; p.loads.forEach(l => l.colIdx = ''); p.boomOverride = ''; if (p.tele?.mode === 'manual') p.tele = { mode: 'auto', fr: [] }; Scene.views.elev = null; }
    if (k === 'colIdx') { p.boomOverride = ''; Scene.views.elev = null; }
    const m = /^env\.(\d+)\.(unit|N)$/.exec(k); if (m) { const en = p.env[+m[1]]; en.sc = envScaleFrom(en); en.calibrated = false; }
    if (k === 'name') renderTop();
    commit({ sheet: !!t.dataset.re });
  });
  sh.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t.id === 'dialIn' && e.key === 'Enter') { e.preventDefault(); t.blur(); }
    if (t.id === 'wxQ' && e.key === 'Enter') { e.preventDefault(); wxSearch(); }
    if (t.classList?.contains('fld') && t.tagName === 'INPUT' && e.key === 'Enter') { e.preventDefault(); t.blur(); }
  });
  // hold-to-repeat on the big ± buttons
  let rep = null;
  const stopRep = () => { if (rep) { clearTimeout(rep.t); rep = null; histMark(); } };
  sh.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-sa="step"]'); if (!b) return; e.preventDefault();
    const d = +b.dataset.d; let n = 0; dialStep(d);
    const go = () => { n++; dialStep(d * (n > 12 ? 4 : 1)); rep.t = setTimeout(go, n > 6 ? 55 : 110); };
    rep = { t: setTimeout(go, 380) };
  });
  sh.addEventListener('pointerup', stopRep); sh.addEventListener('pointercancel', stopRep); sh.addEventListener('pointerleave', stopRep);
}
function fieldVal(t) {
  const ty = t.dataset.t;
  if (ty === 'bool') return t.checked;
  if (ty === 'num') { const s = String(t.value).trim(); return s === '' ? '' : num(s, ''); }
  if (ty === 'int') return t.value === '' ? '' : +t.value;
  return t.value;
}
function settingsSet(t) {
  const k = t.dataset.s; let v = t.type === 'checkbox' ? t.checked : t.value;
  if (k === 'notes' || k === 'companyLines') v = String(v).split('\n').map(x => x.trim()).filter(Boolean);
  else if (t.dataset.t === 'num') v = num(v);
  state.settings[k] = v; saveSettings();
  if (k === 'theme') applyTheme();
  refresh(true); if (t.dataset.re) sheetRefresh();
}

// ---------- sheet actions ----------
const SA_EXTRA = {}; // actions added by later modules (legs.js): name → (dataset, button)
function sheetAct(a, d, b) {
  if (SA_EXTRA[a]) { SA_EXTRA[a](d, b); return; }
  const p = state.plan, li = activeLi(), l = p.loads[li];
  if (a === 'close') { closeSheet(true); return; }
  if (a === 'back') { closeSheet(); return; }
  if (a === 'open') { openSheet(d.k, d.arg != null ? (isNaN(+d.arg) ? d.arg : +d.arg) : undefined); return; }
  if (a === 'step') return; // handled on pointerdown (hold to repeat)
  if (a === 'hold') { holdDial(d.v); sheetRefresh(); return; }
  if (a === 'empty') { l.empty = !l.empty; commit({ sheet: true }); toast(l.empty ? 'Empty hook — no load counted' : 'Load back on the hook'); return; }
  if (a === 'side') { try { navigator.vibrate?.(10); } catch {} setSide(d.v); return; }
  if (a === 'setCrane') { setCrane(d.id); commit({ sheet: true }); toast(curCrane().model + ' selected'); if (state.view === '3d') twinUpdate(); return; }
  if (a === 'craneMake') { state.craneMake = d.v; const g = $('#cgrid'); if (g) g.innerHTML = craneGrid(); $$('[data-sa="craneMake"]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === d.v))); return; }
  if (a === 'findPick') { setCrane(d.id); p.chartIdx = +d.chi; p.colIdx = +d.ci; p.boomOverride = ''; commit(); closeSheet(); toast(curCrane().model + ' picked'); return; }
  if (a === 'rig') { switchRig(+d.i); p.loads[li].crane = +d.i; commit({ sheet: true }); return; }
  if (a === 'rigAdd') { addRig(); commit({ sheet: true }); toast(`Crane ${p.cranes.length} added — pick its model below`); return; }
  if (a === 'rigDel') { if (!confirmTap(b, 'Remove?')) return; removeRig(+d.i); commit({ sheet: true }); return; }
  if (a === 'tele') { if (d.v === 'manual' || d.v === 'auto') teleMode(d.v); else telePreset(d.v); return; }
  if (a === 'flyOff') { p.attach.offset = +d.v; Scene.views.elev = null; commit({ sheet: true }); return; }
  if (['contSet', 'dafMode', 'dafSet', 'tkAdd', 'tkDel', 'tkUp', 'tkClear', 'tkSave'].includes(a)) { liftAct(a, d); return; }
  if (a === 'preset') { const pr = PRESET_DIMS[d.v] || ['box']; l.shape = pr[0]; if (pr[1]) { l.l = pr[1]; l.h = pr[2]; } commit({ sheet: true }); return; }
  if (a === 'dupLift') { p.loads.splice(li + 1, 0, clone(l)); p.activeLoad = li + 1; commit({ sheet: true }); renderTop(); return; }
  if (a === 'delLift') { if (!confirmTap(b, 'Tap again to remove')) return; p.loads.splice(li, 1); selectLoad(Math.min(+p.activeLoad || 0, p.loads.length - 1)); p.secondLoad = Math.min(+p.secondLoad || 0, p.loads.length - 1); commit({ sheet: true }); renderTop(); return; }
  if (a === 'addObj') { addObject(d.type); if (!isDesk()) closeSheet(true); else sheetRefresh(); toast(OBJ_TYPES[d.type].label + ' added — drag it into place'); return; }
  if (a === 'objDel') { const i = +d.i; p.site.obstacles.splice(i, 1); state.sel = Scene.sel = null; commit(); renderSel(); closeSheet(); return; }
  if (a === 'objDup') { const k = +d.i; const o = clone(p.site.obstacles[k]); const ex = objExtent(p.site, o); o.x = r2(num(o.x) + (ex.x1 - ex.x0) + 1); p.site.obstacles.push(o); state.sel = Scene.sel = 'obj:' + (p.site.obstacles.length - 1); commit(); renderSel(); openSheet('obj', p.site.obstacles.length - 1); return; }
  if (a === 'objFind') { const i = +d.i; state.sel = Scene.sel = 'obj:' + i; if (state.view !== 'elev') setView('elev'); renderSel(); sceneDirty(); if (!isDesk()) closeSheet(true); return; }
  if (a === 'clearObjs') { if (!confirmTap(b, 'Tap again to clear all')) return; p.site.obstacles = []; state.sel = Scene.sel = null; commit({ sheet: true }); renderSel(); return; }
  if (a === 'gapLine') { state.settings.showGap = !(state.settings.showGap !== false); saveSettings(); sceneDirty(); sheetRefresh(); return; }
  if (a === 'importEnv') { importEnvFlow(); return; }
  if (a === 'envDel') { if (!confirmTap(b, 'Tap again to remove')) return; const en = p.env[+d.i]; p.env.splice(+d.i, 1); delete ENV_CACHE[en.id]; commit(); closeSheet(); return; }
  if (a === 'envCentre') { const en = p.env[+d.i]; const mode = en.view === 'plan' ? 'plan' : 'elev'; if (state.view !== mode) setView(mode); const v = sceneVisible(); envCenterAt(en, (v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2); commit(); return; }
  if (a === 'envCalib' || a === 'envAlign') { const en = p.env[+d.i]; const mode = en.view === 'plan' ? 'plan' : 'elev'; if (state.view !== mode) setView(mode); en.hidden = false; closeSheet(true); sceneSetTool({ kind: a === 'envCalib' ? 'calib' : 'align', i: +d.i }); return; }
  if (a === 'view') { setView(d.v); if (!isDesk()) closeSheet(true); return; }
  if (a === 'layout') { p.layout = d.v; commit({ sheet: true }); return; }
  if (a === 'lockView') { if (state.view !== 'elev') setView('elev'); const v = sceneVisible(); p.sheetView = { x0: r2(v.x0), x1: r2(v.x1), y0: r2(v.y0), y1: r2(v.y1) }; commit({ sheet: true }); toast('The sheet now uses what you see on screen'); return; }
  if (a === 'unlockView') { p.sheetView = null; commit({ sheet: true }); return; }
  if (a === 'addRev') { p.meta.revs = p.meta.revs || []; p.meta.revs.push({ rev: String(p.meta.revs.length), desc: '', date: p.meta.date }); commit({ sheet: true }); return; }
  if (a === 'delRev') { p.meta.revs.splice(+d.i, 1); commit({ sheet: true }); return; }
  if (a === 'srAdd') { const R = p.sheetRows = p.sheetRows || { hide: {}, show: {}, custom: [] }; R.custom = R.custom || []; R.custom.push({ label: '', value: '', sec: 'load', load: '' }); commit({ sheet: true }); return; }
  if (a === 'srDel') { p.sheetRows.custom.splice(+d.i, 1); commit({ sheet: true }); return; }
  if (a === 'srReset') { p.sheetRows = { hide: {}, show: {}, custom: p.sheetRows?.custom || [], ov: p.sheetRows?.ov || {} }; commit({ sheet: true }); return; }
  if (a === 'export') { const k = d.v; b.classList.add('busy'); const done = () => b.classList.remove('busy'); (k === 'pdf' ? exportPDF('A1') : k === 'pdfA3' ? exportPDF('A3') : k === 'dxf' ? exportDXF() : k === 'svg' ? exportSVG() : exportJSON(fileBase() + '.json', { version: 2, plan: state.plan })).finally(done); return; }
  if (a === 'rams') { b.classList.add('busy'); exportRAMS().finally(() => b.classList.remove('busy')); return; }
  if (a === 'save') { savePlan(d.v === 'new').then(() => { renderTop(); sheetRefresh(); }); return; }
  if (a === 'page') { closeSheet(true); openPage(d.v); return; }
  if (a === 'theme') { state.settings.theme = d.v; saveSettings(); applyTheme(); sheetRefresh(); return; }
  if (a === 'coach') { closeSheet(true); V7.coach = null; setTimeout(() => coachStart(true), 600); return; }
  if (a === 'signout') { authClear(); if (state.dirty) draft(); location.reload(); return; }
  if (a === 'wxOn') { wxEnsure(); state.wx.editing = true; commit({ sheet: true }); return; }
  if (a === 'wxOff') { p.weather = null; state.wx = { q: '', res: null, busy: false, err: '' }; commit({ sheet: true }); return; }
  if (a === 'wxChange') { state.wx.editing = true; state.wx.q = ''; sheetRefresh(); return; }
  if (a === 'wxSearch') { wxSearch(); return; } if (a === 'wxPick') { wxPick(state.wx.res[+d.i]); return; } if (a === 'wxLocate') { wxLocate(); return; } if (a === 'wxFetch') { wxFetch(); return; }
  if (a === 'wxNameOnly') { const W = wxEnsure(); W.place = state.wx.q.trim(); W.lat = null; W.lon = null; state.wx.editing = false; state.wx.err = ''; commit({ sheet: true }); return; }
  if (a === 'wxClearLive') { const W = wxEnsure(); W.hourly = null; W.fetched = ''; commit({ sheet: true }); return; }
  if (a === 'wxh') { const W = p.weather; if (W) { W.start = String(d.v).padStart(2, '0') + ':00'; commit({ sheet: true }); } return; }
}
function confirmTap(b, msg) {
  if (b.dataset.confirm === '1') return true;
  b.dataset.confirm = '1'; const old = b.innerHTML; b.textContent = msg; b.classList.add('danger');
  setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ''; b.innerHTML = old; } }, 2800); return false;
}
// the weather chart uses data-wxh on its hour bars
document.addEventListener('click', (e) => { const w = e.target.closest('#sheet [data-wxh]'); if (w) sheetAct('wxh', { v: w.dataset.wxh }, w); });

// ---------- number editor ("dial") ----------
const DIALS = {
  W: { t: 'Load weight', icon: 'weight', u: 't', why: 'Only the item itself. The hook, slings and safety margin are added for you.' },
  R: { t: 'Reach', icon: 'reach', u: 'm', why: 'How far the hook is from the middle of the crane. Further out, the crane lifts less.' },
  L: { t: 'Boom length', icon: 'boom', u: 'm', why: 'How far the boom slides out.' },
  A: { t: 'Boom angle', icon: 'angle', u: '°', why: 'How steep the boom is. 0° is flat, about 84° is almost straight up.' },
  H: { t: 'Boom top height', icon: 'height', u: 'm', why: 'How high the top of the boom is above the ground.' }
};
const dialDp = (k, v) => k === 'A' ? 1 : k === 'W' ? (v < 10 ? 2 : 1) : 2;
function dialStepSize(k, v) { return k === 'W' ? (v < 5 ? 0.1 : v < 20 ? 0.25 : 0.5) : k === 'A' ? 0.5 : k === 'L' ? 0.5 : 0.5; }
function dialStep(dir) {
  try { navigator.vibrate?.(6); } catch {}
  const s = V7.sheet; if (!s || s.kind !== 'dial') return; const k = s.arg; const cur = dialValue(k); if (cur == null) return;
  if (k === 'L') { // jump to the next chart boom length when there is one
    const { parsed, ch } = curChart(); const lens = parsed && (!ch.kind || ch.kind === 'main') ? [...new Set(parsed.cols.map(c => c.L))].sort((a, b) => a - b) : [];
    const nx = dir > 0 ? lens.find(x => x > cur + 0.05) : [...lens].reverse().find(x => x < cur - 0.05);
    if (lens.length && nx != null && Math.abs(dir) === 1) { dialSet(nx, true); return; }
  }
  const st = dialStepSize(k, cur); const v = Math.round((cur + dir * st) / st) * st; const [mn, mx] = dialRange(k);
  dialSet(Math.max(k === 'W' ? 0 : mn, Math.min(k === 'W' ? 9999 : mx, v)), true);
}
function dialSet(v, live) { const s = V7.sheet; if (!s || s.kind !== 'dial') return; setDial(s.arg, v, { live }); sheetLive(); }
SH.dial = {
  title: (k) => DIALS[k].t, icon: null,
  body(k) {
    const D = DIALS[k], li = activeLi(), l = state.plan.loads[li], r = state.calc.loads[li]; const v = dialValue(k); const [mn, mx] = dialRange(k);
    const by = l.by === 'angle' ? 'A' : l.by === 'height' ? 'H' : 'R'; const locked = k === 'L' && r?.tele?.locked;
    let out = `<div class="dial"><p class="hint" style="text-align:center">${h(D.why)}</p>
      <div class="dial-v"><button type="button" class="pm tap" data-sa="step" data-d="-1" aria-label="Less"${locked ? ' disabled' : ''}>${ic('minus', 28, 2.6)}</button>
        <div class="bignum"><input id="dialIn" inputmode="decimal" autocomplete="off" value="${v != null && isFinite(v) ? (+v).toFixed(dialDp(k, v)) : ''}" aria-label="${h(D.t)} in ${D.u}"${locked ? ' disabled' : ''}><span>${D.u}</span></div>
        <button type="button" class="pm tap" data-sa="step" data-d="1" aria-label="More"${locked ? ' disabled' : ''}>${ic('plus', 28, 2.6)}</button></div>
      <input type="range" class="slider" id="dialRg" min="${(+mn).toFixed(1)}" max="${(+mx).toFixed(1)}" step="${k === 'W' ? 0.05 : 0.1}" value="${v ?? mn}" aria-label="${h(D.t)}"${locked ? ' disabled' : ''}>
      <div class="dial-range"><span>${fmt(mn, k === 'W' ? 0 : 1)} ${D.u}</span><span>${fmt(mx, k === 'W' ? 0 : 1)} ${D.u}</span></div>
      <div class="dial-out" id="dialOut">${dialOut(k)}</div></div>`;
    if (k === 'R' || k === 'A' || k === 'H') {
      const mode = { R: 'radius', A: 'angle', H: 'height' }[k];
      out += grp('', `<button type="button" class="it has-ic tap" data-sa="hold" data-v="${mode}" aria-pressed="${by === k}">${icb('lock', by === k ? 'var(--brand-ink)' : 'var(--ink-3)')}<span class="lb"><b>${by === k ? 'Kept fixed' : 'Keep this fixed'}</b><small>${by === k ? 'When the boom slides in or out, this number stays the same.' : `Right now the ${{ R: 'reach', A: 'angle', H: 'boom top height' }[by]} stays fixed when the boom changes.`}</small></span>${by === k ? ic('check', 22, 2.6) : ''}</button>`);
    }
    if (k === 'W') out += grp('', `${Fx.swRaw('data-sa-sw="empty"', 'Empty hook', l.empty, { sub: 'Nothing on the hook — for a reach or set-up check' })}${Fx.link('open', 'Safety margin', { data: 'data-k="load"', val: l.contOn !== false && num(l.cont) ? num(l.cont) + '%' : 'off' })}${Fx.link('open', 'What hangs on the hook', { data: 'data-k="load"', val: liveVal('tk') })}`);
    if (k === 'L') out += locked ? note('', 'info', `The jib chart fixes the main boom at <b>${fmt(r.tele.L, 1)} m</b>.`) : grp('', Fx.link('open', 'Slide sections by hand', { data: 'data-k="tele"', sub: 'Only for special telescoping', val: r?.tele?.mode === 'manual' ? 'On' : 'Off' }));
    return out;
  },
  live(bd, k) {
    const inp = $('#dialIn', bd), rg = $('#dialRg', bd), out = $('#dialOut', bd); const v = dialValue(k);
    if (inp && inp !== document.activeElement && v != null) inp.value = (+v).toFixed(dialDp(k, v));
    if (rg && !V7.sliding && v != null) { const [mn, mx] = dialRange(k); rg.min = (+mn).toFixed(1); rg.max = (+mx).toFixed(1); rg.value = v; syncSliders(bd); }
    if (out) out.innerHTML = dialOut(k);
  }
};
function dialOut(k) {
  const li = activeLi(), r = state.calc.loads[li]; const st = utilCls(r);
  const cap = `<div class="mini ${st}"><span>Crane can lift</span><b>${r.cap != null ? fmt(r.cap, 1) + '<small>t</small>' : 'none'}</b></div>`;
  const util = `<div class="mini ${st}"><span>Using</span><b>${r.util != null ? Math.round(r.util) + '<small>%</small>' : '—'}</b></div>`;
  const other = { W: ['On hook', fmt(r.daf ? r.design : r.total, 1), 't'], R: ['Boom', fmt(r.tele?.L, 1), 'm'], L: ['Reach', fmt(r.R, 1), 'm'], A: ['Reach', fmt(r.R, 1), 'm'], H: ['Reach', fmt(r.R, 1), 'm'] }[k];
  return cap + util + `<div class="mini"><span>${other[0]}</span><b>${other[1]}<small>${other[2]}</small></b></div>`;
}
// the "empty hook" switch inside the weight dial
document.addEventListener('change', (e) => { if (e.target.dataset?.saSw === 'empty') { const l = state.plan.loads[activeLi()]; l.empty = e.target.checked; commit({ sheet: true }); } });

// ---------- telescoping by hand ----------
SH.tele = {
  title: () => 'Boom sections', icon: 'boom', sub: true,
  body() {
    const r = state.calc.loads[activeLi()]; const spec = r.spec, tele = r.tele; const man = tele.mode === 'manual';
    if (tele.locked) return note('', 'info', 'The jib chart fixes the boom length.');
    return `${note('', 'info', 'Most cranes slide all sections out evenly. Only set them by hand for a special sequence.')}
      ${grp('', `${Fx.swRaw('data-sa-sw="tele"', 'Set each section by hand', man)}`)}
      ${man ? grp(`${spec.tele} sections · ${fmt(tele.L, 2)} m`, tele.fr.map((f, i) => `<div class="it stack"><span class="lb"><b>Section ${i + 1} · ${Math.round(f * 100)}% · ${fmt(f * spec.E, 1)} m</b></span><input type="range" class="slider" data-tsec="${i}" min="0" max="100" step="5" value="${Math.round(f * 100)}" aria-label="Section ${i + 1}"></div>`).join(''))
        + `<div class="btns" style="margin-top:12px">${[['0', 'All in'], ['even', 'Even'], ['seq', 'One by one'], ['1', 'All out']].map(([v, t]) => `<button type="button" class="chip tap" data-sa="tele" data-v="${v}">${t}</button>`).join('')}</div>` : ''}`;
  }
};
document.addEventListener('change', (e) => { if (e.target.dataset?.saSw === 'tele') teleMode(e.target.checked ? 'manual' : 'auto'); });

// ---------- crane ----------
function craneGrid() {
  const all = cranes(); const q = (state.craneQ || '').toLowerCase(); const cur = state.plan.craneId;
  const list = all.filter(c => (!state.craneMake || (c.make || 'Other').startsWith(state.craneMake)) && (!q || (c.make + ' ' + c.model + ' ' + c.cls).toLowerCase().includes(q)));
  return list.map(c => `<button type="button" class="cc tap${c.id === cur ? ' on' : ''}" data-sa="setCrane" data-id="${h(c.id)}" style="--bc:${brandCol(c)}"><span class="t num">${c.cls}<small>t</small></span><b>${h(c.model)}</b><span>${h(c.make)}</span></button>`).join('') || '<p class="hint">No crane matches.</p>';
}
SH.crane = {
  title: () => 'Crane', icon: 'crane',
  body() {
    const p = state.plan; const { crane, ch, parsed } = curChart(); if (!crane) return '<p class="hint">No cranes in the fleet. Add one under Fleet.</p>';
    const spec = boomSpec(crane, chartLengths(crane)); const r = state.calc.loads[activeLi()];
    const charts = crane.charts || []; const makes = [...new Set(cranes().map(c => (c.make || 'Other').split(' ')[0]))];
    const cw = num(p.cwt !== '' && p.cwt != null ? p.cwt : (ch?.cwt ?? crane.cwt));
    let out = `<div class="cur-crane" style="--bc:${brandCol(crane)}"><div><div class="mk">${h(crane.make || '')}</div><div class="md">${h(crane.model)}</div></div><div class="cl num">${crane.cls}<small>t</small></div>
      <div class="spec"><span>Boom <b>${fmt(spec.Lmin, 1)}–${fmt(spec.Lmax, 1)} m</b></span><span>Counterweight <b>${fmt(cw, 1)} t</b></span><span>Legs <b>${h(ch?.outrigger || crane.outrigger || '—')}</b></span></div></div>
      <div style="margin-top:12px"><button type="button" class="btn wide pri tap" data-sa="open" data-k="find">${ic('search', 20, 2.4)}Find the right crane for this lift</button></div>`;
    if ((p.cranes || []).length > 1 || true) {
      const rigs = p.cranes || [{}], act = num(p.activeCrane, 0);
      out += grp('Cranes on this job', rigs.map((rg, i) => { const c = cranes().find(x => x.id === (i === act ? p.craneId : rg.craneId)) || crane; const n = p.loads.filter(x => num(x.crane) === i).length;
        return `<div class="it${i === act ? ' sel' : ''}"><button type="button" class="lb tap" data-sa="rig" data-i="${i}" style="text-align:left"><b>Crane ${i + 1} · ${h(c.model)}</b><small>${n} lift${n === 1 ? '' : 's'}${i === act ? ' · you are editing this one' : ''}</small></button>${rigs.length > 1 ? `<button type="button" class="btn sm tap" data-sa="rigDel" data-i="${i}">${ic('trash', 16)}</button>` : ''}</div>`; }).join('') + `<button type="button" class="it accent tap" data-sa="rigAdd">${ic('plus', 20, 2.4)}Add another crane</button>` + Fx.link('open', 'Tandem lift — 2 to 4 cranes on one load', { data: 'data-k="tandem"', ic: icb('tandem', 'var(--info-fill)'), val: tandemOf(p.loads[activeLi()]) ? 'On' : '' }), { foot: rigs.length > 1 ? 'Each lift uses its own crane — pick it under Hook.' : 'Two cranes on one job? Add the second one here.' });
    }
    out += grp('Change crane', `<div class="search">${ic('search', 20, 2.2)}<input type="search" id="craneQ" placeholder="Search name or tonnes" value="${h(state.craneQ || '')}" aria-label="Search cranes"></div>
      <div class="chips" style="margin:10px 0"><button type="button" class="chip tap" data-sa="craneMake" data-v="" aria-pressed="${!state.craneMake}">All</button>${makes.map(m => `<button type="button" class="chip tap" data-sa="craneMake" data-v="${h(m)}" aria-pressed="${state.craneMake === m}">${h(m)}</button>`).join('')}</div>
      <div class="cgrid" id="cgrid">${craneGrid()}</div>`, { raw: true });
    const kinds = { main: 'Boom', fixedjib: 'Fly jib', luffing: 'Luffing jib' };
    const chartOpts = charts.map((c, i) => [i, `${kinds[c.kind || 'main']} · ${c.name}`]).concat([[-1, 'No chart — type the capacity']]);
    const colOpts = parsed ? parsed.cols.map((c, i) => [i, `${c.head || c.L}${ch.kind === 'main' ? ' m' : '°'}${c.label ? ' · ' + c.label : ''}${c.falls ? ' · ' + c.falls + ' falls' : ''}`]) : [];
    out += grp('Load chart', Fx.sel('chartIdx', 'Chart', chartOpts, { numeric: 1 }) + (parsed ? Fx.sel('colIdx', ch.kind === 'main' ? 'Boom on the chart' : ch.kind === 'luffing' ? 'Main boom angle' : 'Jib offset', colOpts, { numeric: 1 }) : '')
      + Fx.num('cwt', 'Counterweight', 't', { ph: String(ch?.cwt ?? crane.cwt ?? '') }) + Fx.text('outriggerTxt', 'Outrigger legs', { ph: ch?.outrigger || crane.outrigger }) + Fx.num('falls', 'Rope falls', '', { ph: String(parsed?.cols[+p.colIdx]?.falls || '') }),
      { foot: ch?.verify ? `<span style="color:var(--warn);font-weight:600">Check this chart.</span> ${h(ch.source || 'Copied from a public datasheet')}. Compare every value with the crane's own chart before you lift.` : r?.capInfo?.between ? `Capacity uses the lower of ${r.capInfo.between.join(' / ')} m.` : '' });
    out += grp('Extras on the boom', accRows(crane, ch, r), { foot: 'Only parts this crane carries are listed.' });
    out += grp('More', Fx.link('open', 'Slide sections by hand', { data: 'data-k="tele"', val: r?.tele?.mode === 'manual' ? 'On' : 'Off' }) + Fx.text('modelTxt', 'Name printed on the sheet', { ph: crane.model }) + Fx.num('hookAllowance', 'Hook + 2-block allowance', 'm') + Fx.text('matSize', 'Mat size', { ph: '2.5x2.5m' }) + Fx.text('wind', 'Wind on the sheet', { ph: '7M/S' }));
    return out;
  }
};
function accRows(crane, ch, r) {
  const p = state.plan; const avail = crane.acc || ['flyjib']; const at = p.attach || {}; const jibChart = ch && ch.kind && ch.kind !== 'main'; const A = r?.acc || {};
  const rows = [];
  const row = (key, title, sub, on, body, dis) => Fx.swRaw(`data-acc="${key}"`, title, on, { sub, dis }) + (on && body ? body : '');
  if (avail.includes('flyjib')) { const [a, b] = jibRange(crane, 'fly'); rows.push(row('flyjib', 'Fly jib', jibChart ? 'set by the jib chart' : `${a}–${b} m lattice jib`, at.type === 'fly' && !at.ext, Fx.num('attach.jibLen', 'Jib length', 'm') + Fx.num('attach.offset', 'Offset', '°') + Fx.num('attach.swl', 'Jib can lift', 't', { ph: 'from chart' }), jibChart)); }
  if (avail.includes('extension')) rows.push(row('extension', 'Boom extension', 'lattice piece in line with the boom', at.type === 'fly' && !!at.ext, Fx.num('attach.jibLen', 'Extension length', 'm') + Fx.num('attach.swl', 'Can lift', 't', { ph: 'from chart' }), jibChart));
  if (avail.includes('luffing')) { const [a, b] = jibRange(crane, 'luff'); rows.push(row('luffing', 'Luffing jib', jibChart ? 'set by the jib chart' : `${a}–${b} m luffing jib`, at.type === 'luff', Fx.num('attach.boomAngle', 'Main boom angle', '°') + Fx.num('attach.jibLen', 'Jib length', 'm') + Fx.num('attach.swl', 'Jib can lift', 't', { ph: 'from chart' }), jibChart)); }
  if (avail.includes('superlift')) rows.push(row('superlift', 'Superlift', 'mast and hanging ballast', A.superlift, Fx.num('acc.slRadius', 'Ballast reach', 'm') + Fx.num('acc.slBallast', 'Ballast', 't')));
  if (avail.includes('yguy')) rows.push(row('yguy', 'Y-guying', A.yguyAuto ? 'on — the chart needs it' : 'boom guying', A.yguy, '', A.yguyAuto));
  if (avail.includes('runner')) rows.push(row('runner', 'Runner', 'small head for a second hook', A.runner, ''));
  return rows.join('') || Fx.ro('None listed', '');
}
SH.find = {
  title: () => 'Find a crane', icon: 'search', sub: true,
  body() {
    const li = activeLi(), l = state.plan.loads[li], r = state.calc.loads[li];
    const req = { w: l.empty ? 0 : num(l.w), tk: num(r?.tk), hb: 0, cont: l.contOn !== false ? num(l.cont) : 0, R: num(r?.R, num(l.R, 10)), h: num(l.h, 2), rigH: num(r?.stack?.H, num(l.rigH, 3)), site: state.plan.site, hookAllowance: num(state.plan.hookAllowance, 3) };
    let best = [];
    try { best = bestPerCrane(findCranes(req, cranes(), settingsEff(), { allowJib: false })); } catch (e) { console.error(e); }
    best.sort((a, b) => (a.ok === b.ok ? 0 : a.ok ? -1 : 1) || (a.ok ? a.crane.cls - b.crane.cls : (b.r.cap || 0) - (a.r.cap || 0)));
    return `${note('', 'info', `Looking for a crane that lifts <b>${fmt(req.w, 1)} t</b> at <b>${fmt(req.R, 1)} m</b> reach, with the hook and slings added.`)}
      <div class="cgrid" style="margin-top:14px">${best.map(o => { const st = !o.ok ? 'no' : o.r.util > num(settingsEff().utilWarn, 75) ? 'warn' : 'ok';
        return `<button type="button" class="cc tap${o.crane.id === state.plan.craneId ? ' on' : ''}" data-sa="findPick" data-id="${h(o.crane.id)}" data-chi="${o.chi}" data-ci="${o.ci}" style="--bc:${brandCol(o.crane)}"><span class="fit ${st}">${st === 'no' ? 'No' : Math.round(o.r.util) + '%'}</span><span class="t num">${o.crane.cls}<small>t</small></span><b>${h(o.crane.model)}</b><span>${o.r.cap != null ? 'lifts ' + fmt(o.r.cap, 1) + ' t' : 'can\'t reach'} · boom ${fmt(o.col.L, 1)} m</span></button>`; }).join('') || '<p class="hint">No chart data to compare.</p>'}</div>
      <p class="hint" style="margin-top:12px">Green = can do it. The percent is how hard the crane works. Tap one to use it.</p>`;
  }
};

// ---------- lift side ----------
const SIDE_HELP = {
  left: 'Over the left side of the crane. Common when the crane drives along the building.',
  rear: 'Over the back of the crane. The strongest side on most load charts.',
  right: 'Over the right side of the crane. Common when the crane drives along the building.',
  front: "Over the front — over the driver's cab. Many load charts give a lot less here, and some give nothing, so the app checks it."
};
function sideIco(k, s = 30) { // little top-down crane with an arrow to the side you lift over
  const A = { front: 'M16 16V3M12 7l4-4 4 4', rear: 'M16 16v13M12 25l4 4 4-4', left: 'M16 16H3M7 12l-4 4 4 4', right: 'M16 16h13M25 12l4 4-4 4' }[k] || '';
  return `<svg viewBox="0 0 32 32" width="${s}" height="${s}" aria-hidden="true"><rect x="11.5" y="8" width="9" height="17" rx="2.5" fill="currentColor" fill-opacity=".14" stroke="currentColor" stroke-width="1.4"/><rect x="11.5" y="8" width="9" height="5.5" rx="2" fill="currentColor" fill-opacity=".5"/><path d="${A}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
SH.side = {
  title: () => 'Lift side', icon: 'side',
  body() {
    const li = activeLi(), l = state.plan.loads[li], r = state.calc.loads[li]; const side = sideOfLoad(l);
    const rot = { left: -90, rear: 180, right: 90, front: 0 }[side] ?? 180;
    const cx = 170, cy = 170, r0 = 100, r1 = 162;
    const sector = (a0, a1) => { const p = (a, rr) => [cx + rr * Math.cos((a - 90) * Math.PI / 180), cy + rr * Math.sin((a - 90) * Math.PI / 180)]; const [x0, y0] = p(a0, r1), [x1, y1] = p(a1, r1), [x2, y2] = p(a1, r0), [x3, y3] = p(a0, r0); return `M${x0} ${y0}A${r1} ${r1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 0 0 ${x3} ${y3}Z`; };
    const lab = (a) => { const rr = (r0 + r1) / 2; return [cx + rr * Math.cos((a - 90) * Math.PI / 180), cy + rr * Math.sin((a - 90) * Math.PI / 180) + 5]; };
    const zone = (k, a0, a1, t, cls = '') => { const [tx, ty] = lab((a0 + a1) / 2); return `<g class="zone ${cls}${side === k ? ' on' : ''}" ${cls === 'no' ? '' : `data-sa="side" data-v="${k}" role="button" tabindex="0" aria-label="Lift on the ${t}"`}><path d="${sector(a0 + 2, a1 - 2)}"/><text x="${tx}" y="${ty}" text-anchor="middle">${t}</text></g>`; };
    const svg = `<svg viewBox="0 0 340 340" role="img" aria-label="Crane seen from above. Pick the side you lift on.">
      ${zone('front', -45, 45, 'Front')}${zone('right', 45, 135, 'Right')}${zone('rear', 135, 225, 'Behind')}${zone('left', 225, 315, 'Left')}
      <rect class="body" x="${cx - 30}" y="${cy - 78}" width="60" height="156" rx="10"/><rect class="cab" x="${cx - 26}" y="${cy - 74}" width="52" height="22" rx="6"/>
      <path d="M${cx - 30} ${cy - 40}h-22M${cx + 30} ${cy - 40}h22M${cx - 30} ${cy + 46}h-22M${cx + 30} ${cy + 46}h22" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity=".35"/>
      <circle cx="${cx}" cy="${cy}" r="20" fill="var(--card)" stroke="currentColor" stroke-width="2"/>
      <g style="transform:rotate(${rot}deg);transform-origin:${cx}px ${cy}px;transition:transform .6s var(--spring)"><line class="boom" x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 90}"/><line class="boom-f" x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 90}"/><circle cx="${cx}" cy="${cy - 90}" r="7" fill="var(--brand)" stroke="var(--brand-ink)" stroke-width="2"/></g>
      <text x="${cx}" y="${cy - 84}" text-anchor="middle" style="font:700 11px var(--f-ui);fill:var(--ink-2)">CAB</text></svg>`;
    const sideChk = (r?.checks || []).find(c => /side/i.test(c.t));
    return `<div class="side-pick">${svg}<div class="side-btns">${SIDES.map(([k, t]) => `<button type="button" class="tap" data-sa="side" data-v="${k}" aria-pressed="${side === k}" title="${h(SIDE_HELP[k])}">${sideIco(k)}<span>${t}</span></button>`).join('')}</div></div>
      <p class="side-help" aria-live="polite"><b>${h((SIDES.find(x => x[0] === side) || [0, side])[1])}.</b> ${h(SIDE_HELP[side])}</p>
      ${sideChk && sideChk.s !== 'ok' ? note(sideChk.s === 'fail' ? 'fail' : 'warn', 'alert', `<b>${h(sideChk.t)}.</b> ${h(sideChk.m)}`) : note('ok', 'check', `Lifting <b>${side === 'rear' ? 'behind the crane' : side === 'front' ? 'over the front' : 'on the ' + side + ' side'}</b>. The chart covers this side.`)}
      <p class="hint" style="margin-top:12px">The yellow dot is the boom. The cab is at the top of the picture.</p>`;
  }
};

// ---------- the hook: load, margin, tackles, DAF ----------
const LOAD_PRESETS = [['box', 'Box', 'box'], ['chiller6', 'Chiller 6 m', 'container'], ['chiller12', 'Chiller 12 m', 'container'], ['c20', "Container 20'", 'container'], ['c40', "Container 40'", 'container'], ['drum', 'Cable drum', 'drum'], ['coil', 'Steel coil', 'drum'], ['cylinder', 'Tank', 'tank'], ['bundle', 'Steel bundle', 'bundle'], ['tc', 'Tower crane part', 'towercrane']];
const PRESET_DIMS = { box: ['box'], chiller6: ['chiller', 6, 2.59], chiller12: ['chiller', 12, 2.59], c20: ['container', 6.06, 2.59], c40: ['container', 12.19, 2.59], drum: ['drum'], coil: ['coil', 1.6, 1.6], cylinder: ['cylinder', 1.5, 2], bundle: ['bundle', 6, 0.8], tc: ['tc'] };
Object.assign(OBJ_ICON, { drum: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', tank: 'M6 6a6 2 0 0 0 12 0 6 2 0 0 0-12 0v12a6 2 0 0 0 12 0V6', bundle: 'M3 9h18M3 12h18M3 15h18M5 7v10M19 7v10' });
function loadPreset(l) { const sh = l.shape || 'box'; if (sh === 'container') return num(l.l) > 9 ? 'c40' : 'c20'; if (sh === 'chiller') return num(l.l) > 9 ? 'chiller12' : 'chiller6'; return PRESET_DIMS[sh] ? sh : 'box'; }
SH.load = {
  title: () => 'Hook', icon: 'hook', subtitle: () => `Lift ${activeLi() + 1}`,
  body() {
    const p = state.plan, li = activeLi(), l = p.loads[li], r = state.calc.loads[li], pre = `loads.${li}.`; const crane = curCrane();
    const D = l.daf || {}; const dafAutoMode = D.mode !== 'manual'; const stackW = (l.tackles || []).some(t => num(t.w) > 0);
    const { parsed, ch } = loadCol(li); const rigs = p.cranes || [];
    let out = `<div class="dial-out" style="margin-bottom:18px"><div class="mini"><span>On the hook</span><b data-live="total"></b></div><div class="mini ${utilCls(r)}"><span>Crane can lift</span><b data-live="cap"></b></div><div class="mini ${utilCls(r)}"><span>Using</span><b data-live="util"></b></div></div>`;
    out += grp('The load', `${Fx.link('open', 'Weight', { data: 'data-k="dial" data-arg="W"', val: l.empty ? 'Empty hook' : fmt(num(l.w), 2) + ' t', ic: icb('weight', 'var(--brand-ink)') })}${Fx.swRaw('data-sa-sw="empty"', 'Empty hook', l.empty, { sub: 'Show the crane with nothing on the hook' })}${Fx.text(pre + 'name', 'Name', { ph: 'e.g. Chiller unit' })}`)
      + grp('What is it?', `<div class="otiles">${LOAD_PRESETS.map(([v, t, icn]) => `<button type="button" class="ot tap" data-sa="preset" data-v="${v}" aria-pressed="${loadPreset(l) === v}">${oic(icn)}${h(t)}</button>`).join('')}</div>`, { raw: true })
      + grp('Safety margin', `${Fx.sw(pre + 'contOn', 'Add a safety margin', { sub: 'Extra weight in case the load is heavier than the papers say' })}${l.contOn !== false ? `<div class="it"><div class="chips">${[5, 10, 15, 20, 25].map(v => `<button type="button" class="chip tap" data-sa="contSet" data-v="${v}" aria-pressed="${num(l.cont) === v}">${v}%</button>`).join('')}</div></div>${Fx.num(pre + 'cont', 'Margin', '%', { ph: '0' })}` : ''}`);
    out += `<section class="grp"><h3>Hanging on the hook<span class="sp"></span><span style="text-transform:none;font-weight:600;color:var(--ink)" data-live="tk"></span></h3>
      ${(l.tackles || []).map((t, j) => { const it = r?.stack?.items?.find(x => x.j === j); const tp = `${j}.`;
        return `<div class="tk"><div class="tk-h"><span class="n">${j + 1}</span><input type="text" data-tk="${tp}name" value="${h(t.name || '')}" placeholder="${h(TACKLE_TYPES[t.type] || 'Name')}" aria-label="Item ${j + 1} name"><button type="button" class="tap" data-sa="tkUp" data-j="${j}" aria-label="Move up"${j ? '' : ' disabled'}>${ic('chev', 18, 2.2).replace('<svg', '<svg style="transform:rotate(-90deg)"')}</button><button type="button" class="tap" data-sa="tkSave" data-j="${j}" aria-label="Save to my list">${ic('star', 18)}</button><button type="button" class="tap" data-sa="tkDel" data-j="${j}" aria-label="Remove">${ic('trash', 18)}</button></div>
          <div class="tk-f"><label><span>Type</span><select data-tk="${tp}type">${Object.entries(TACKLE_TYPES).map(([k, lab]) => `<option value="${k}"${k === t.type ? ' selected' : ''}>${h(lab)}</option>`).join('')}</select></label><label><span>${t.type === 'spreader' || t.type === 'beam' ? 'Span m' : 'Length m'}</span><input type="text" inputmode="decimal" data-tk="${tp}L" value="${h(t.L ?? '')}"></label><label><span>Weight t</span><input type="text" inputmode="decimal" data-tk="${tp}w" value="${h(t.w ?? '')}"></label>
          ${t.type === 'sling' ? `<label><span>Legs</span><select data-tk="${tp}legs">${[1, 2, 3, 4].map(n => `<option value="${n}"${num(t.legs, 2) === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label>` : ''}</div>
          ${it ? `<div class="tk-c">${it.type === 'sling' ? `${Math.round(it.ang)}° from straight down${it.T != null ? ' · ' + it.T.toFixed(1) + ' t per leg' : ''}` : `adds ${fmt(it.v, 2)} m below the hook`}</div>` : ''}</div>`; }).join('') || '<p class="hint" style="margin:0 4px">Nothing yet. Add shackles, slings or a spreader beam. Their length sets how high the hook must be; their weight is added to the lift.</p>'}
      <div class="btns" style="margin-top:8px"><button type="button" class="btn sm tap" data-sa="tkAdd">${ic('plus', 18, 2.4)}Add</button><label class="btn sm" style="position:relative">${ic('star', 18)}From my list<select data-sa-lib="1" style="position:absolute;inset:0;opacity:0" aria-label="Add from my list"><option value="">From my list…</option>${tackleLib().map((t, i) => `<option value="${i}">${h(t.name)}${t.L ? ' · ' + t.L + ' m' : ''}${t.w ? ' · ' + t.w + ' t' : ''}</option>`).join('')}</select></label>${(l.tackles || []).length ? `<button type="button" class="btn sm plain tap" data-sa="tkClear">Clear</button>` : ''}</div></section>`;
    out += grp('Hook and other weight', `${Fx.num(pre + 'hb', 'Hook block', 't', { ph: String(crane?.hookBlock ?? '') })}${stackW ? Fx.ro('Slings & shackles', '<span data-live="tk"></span>', { sub: 'from the list above' }) : Fx.num(pre + 'tk', 'Slings & shackles', 't', { ph: '0' })}${Fx.num(pre + 'extra', 'Anything else', 't', { ph: '0' })}${Fx.ro('Total on the hook', '<b data-live="total"></b>')}`);
    out += grp('Net capacity', `<div data-live="netcap">${netCapRows(r)}</div>${Fx.num('jibDed', 'Folded jib on the boom', 't', { ph: '0', sub: 'Only when the load chart says to take it off' })}${Fx.num('ropeKgM', 'Hoist rope weight', 'kg/m', { ph: 'not counted', sub: r?.ropeInfo?.falls ? `${r.ropeInfo.falls} falls × ${fmt(r.ropeInfo.len, 1)} m hanging` : 'Set the rope falls under Crane to count it' })}`, { raw: false, foot: 'Chart capacity minus everything on the hook that is not the load = what the load itself may weigh.' });
    out += grp('Wind on the load', `${Fx.num(pre + 'area', 'Wind area of the load', 'm²', { ph: 'not checked', sub: 'Its biggest face — length × height', re: 1 })}${num(l.area) > 0 ? Fx.num(pre + 'cw', 'Shape factor', '×', { ph: '1.2', sub: '1.2 box · 1.4 flat sheet · 0.8 round' }) + (p.weather ? Fx.ro('Chart wind limit', `${fmt(windTabOf(p), 1)} m/s`, { sub: 'from Wind and weather' }) : Fx.num('windTab', 'Chart wind limit', 'm/s', { ph: '9.8', sub: 'The crane chart\'s top wind speed' })) + `<div data-live="windbox">${windRows(r)}</div>` : ''}`, { foot: num(l.area) > 0 ? 'Big, light loads catch the wind: the chart\'s wind limit assumes 1.2 m² per tonne (EN 13000). More area means a lower wind limit for this lift.' : 'Panels, chillers and cladding catch the wind. Add the area to get the wind limit for this load.' });
    out += grp('Bounce factor (DAF)', `${Fx.sw(pre + 'daf.on', 'Add a bounce factor', { sub: 'The load pulls harder when the hoist starts and stops' })}${D.on ? `<div class="it"><div class="seg" style="width:100%"><button type="button" class="tap" data-sa="dafMode" data-v="auto" aria-checked="${dafAutoMode}">Work it out</button><button type="button" class="tap" data-sa="dafMode" data-v="manual" aria-checked="${!dafAutoMode}">Type it</button></div></div>
      ${dafAutoMode ? Fx.sel(pre + 'daf.cls', 'Hoisting class', ['HC1', 'HC2', 'HC3', 'HC4'].map(c => [c, c])) + Fx.num(pre + 'daf.vh', 'Hoist speed', 'm/s') : Fx.num(pre + 'daf.v', 'Factor', '×')}${Fx.ro('Factor used', '<span data-live="daf"></span>')}${Fx.ro('Design weight', '<b data-live="design"></b>')}` : ''}`, { foot: D.on ? 'EN 13001-2: HC1 1.05 + 0.17v · HC2 1.10 + 0.34v · HC3 1.15 + 0.51v · HC4 1.20 + 0.68v.' : '' });
    out += grp('Size and landing', `${Fx.num(pre + 'l', 'Length', 'm')}${Fx.num(pre + 'h', 'Height', 'm')}${Fx.num(pre + 'rigH', 'Sling height', 'm', { off: r?.sling?.rigH != null })}${Fx.num(pre + 'landY', 'Landing level', 'm', { ph: r ? 'auto ' + r.landY.toFixed(2) : 'auto' })}`);
    out += grp('Rigging check', `${Fx.sel(pre + 'rigType', 'Method', [['', 'Simple slings'], ...Object.entries(RIG_TYPES).map(([k, t]) => [k, t.label])])}${Fx.num(pre + 'slingL', 'Sling length', 'm', { ph: 'optional' })}${Fx.num(pre + 'slingAng', 'Sling angle', '°', { ph: '60' })}${Fx.num(pre + 'slingWLL', 'Sling WLL', 't', { ph: 'not checked' })}${Fx.ro('Pull in each leg', '<span data-live="sling"></span>')}`);
    out += grp('Two or more cranes', Fx.link('open', tandemOf(l) ? `Tandem · ${l.tandem.picks.length} cranes` : 'Lift with 2–4 cranes (tandem)', { data: 'data-k="tandem"', ic: icb('tandem', 'var(--info-fill)'), sub: tandemOf(l) ? 'Load share, live moves, every crane checked' : 'Share this load between cranes', val: r?.tandem ? `busiest ${fmt(r.tandem.maxUtil, 0)}%` : '' }));
    out += grp('This lift', `${Fx.sel(pre + 'liftType', 'Category', [['', '—'], ...LIFT_TYPES.map(t => [t, t])])}${rigs.length > 1 ? Fx.sel(pre + 'crane', 'Lifted by', rigs.map((rg, i) => { const c = cranes().find(x => x.id === (i === num(p.activeCrane) ? p.craneId : rg.craneId)); return [i, `Crane ${i + 1} · ${c ? c.model : '—'}`]; }), { numeric: 1 }) : ''}${Fx.num(pre + 'capOverride', 'Crane can lift (by hand)', 't', { ph: parsed ? 'from chart' : 'needed' })}${parsed ? Fx.sel(pre + 'colIdx', 'Boom for this lift', [['', 'Same as the crane'], ...parsed.cols.map((c, i) => [i, `${c.head || c.L}${ch.kind === 'main' ? ' m' : '°'}${c.label ? ' · ' + c.label : ''}`])]) : ''}${Fx.area(pre + 'notes', 'Notes for this lift', { ph: 'e.g. tag lines both sides, banksman at the gate' })}`)
      + `<div class="btns two" style="margin-top:16px">${p.loads.length < 6 ? `<button type="button" class="btn tap" data-sa="dupLift">${ic('copy', 18)}Copy lift</button>` : '<span></span>'}${p.loads.length > 1 ? `<button type="button" class="btn danger tap" data-sa="delLift">${ic('trash', 18)}Remove lift</button>` : ''}</div>`;
    return out;
  }
};
document.addEventListener('change', (e) => { if (e.target.dataset?.saLib && e.target.value !== '') { liftAct('tkLib', { v: e.target.value }); e.target.value = ''; } });

// ---------- site ----------
SH.site = {
  title: () => 'Site', icon: 'site',
  body() {
    const p = state.plan, site = p.site, obs = site.obstacles || [], r = state.calc.loads[activeLi()], S = settingsEff(); const showGap = state.settings.showGap !== false;
    const c = r?.clearance; const mc = num(S.minClearance, 1); const gs = c == null ? '' : c <= 0 ? 'fail' : c < mc ? 'warn' : 'ok';
    let out = '';
    out += grp('Gap between boom and building', `<div class="it"><span class="lb"><b>Closest gap now</b><small>${c != null ? (gs === 'ok' ? 'Enough room' : gs === 'warn' ? 'Tight — less than ' + mc + ' m' : 'The boom hits it') : 'Add a building to measure the gap'}</small></span><span class="vl num" style="font-size:22px;font-weight:750;color:var(--${gs === 'fail' ? 'stop' : gs === 'warn' ? 'warn' : gs === 'ok' ? 'safe' : 'ink-2'})" data-live="gap"></span></div>
      ${Fx.swRaw('data-sa-sw="gap"', 'Show the gap on the drawing', showGap)}<label class="it"><span class="lb"><b>Smallest safe gap</b></span><input class="fld num" type="text" inputmode="decimal" data-s="minClearance" data-t="num" value="${h(state.settings.minClearance ?? 1)}" aria-label="Smallest safe gap"><span class="unit">m</span></label>`);
    out += grp('Add to the drawing', `<div class="otiles">${Object.entries(OBJ_TYPES).map(([k, t]) => `<button type="button" class="ot tap" data-sa="addObj" data-type="${k}">${oic(k)}${h(t.label.replace(' (scale)', ''))}</button>`).join('')}</div>`, { raw: true });
    if (obs.length) out += grp('On site', obs.map((o, i) => `<button type="button" class="it has-ic tap${state.sel === 'obj:' + i ? ' sel' : ''}" data-sa="open" data-k="obj" data-arg="${i}"><span class="ic" style="background:var(--card-2);color:var(--ink)">${oic(o.type, 20)}</span><span class="lb"><b>${h(o.label || OBJ_TYPES[o.type]?.label || o.type)}</b><small>${num(o.x).toFixed(1)} m from the crane${num(o.y) ? ' · raised ' + num(o.y).toFixed(2) + ' m' : ''}</small></span>${ic('chev', 18, 2.2).replace('<svg', '<svg class="ch"')}</button>`).join('') + `<button type="button" class="it danger tap" data-sa="clearObjs">Clear all</button>`);
    out += grp('Ground', `<div class="it"><div class="seg" style="width:100%"><button type="button" class="tap" data-sa-gt="ground" aria-checked="${site.groundType !== 'barge'}">On ground</button><button type="button" class="tap" data-sa-gt="barge" aria-checked="${site.groundType === 'barge'}">On a barge</button></div></div>${Fx.num('site.stepX', 'Ground step at', 'm', { ph: 'none' })}${Fx.num('site.targetGround', 'Level after the step', 'm', { ph: '0' })}`);
    const W = p.weather; const wx = state.calc.weather;
    out += grp('Wind and weather', Fx.link('open', W ? (W.place || 'Lift site') : 'Add the weather', { data: 'data-k="weather"', ic: icb('wind', 'var(--info-fill)'), sub: wx ? `gust ${fmt(wx.maxG)} of ${fmt(wx.limit)} m/s allowed · rain ${wx.rain}%` : 'Optional — checks the wind up at the boom top', val: wx ? (wx.status === 'fail' ? 'Too windy' : wx.status === 'warn' ? 'Careful' : 'OK') : '' }));
    out += grp('Satellite map', Fx.link('open', (p.env || []).some(e => e.geo) ? 'Satellite map of the site' : 'Add a satellite map of the site', { data: 'data-k="map"', ic: icb('globe', '#34aadc'), sub: (p.env || []).find(e => e.geo)?.geo?.place || 'True scale, under the top view' }));
    out += grp('Client drawings', (p.env || []).filter(e => !e.geo).map((e) => { const i = p.env.indexOf(e); return [e, i]; }).map(([e, i]) => Fx.link('open', e.name || 'Drawing', { data: `data-k="env" data-arg="${i}"`, ic: icb('file', '#7c4dff'), sub: `${e.kind.toUpperCase()} · ${e.view === 'plan' ? 'top view' : 'drawing'}${e.hidden ? ' · hidden' : ''}` })).join('') + `<button type="button" class="it accent tap" data-sa="importEnv">${ic('plus', 20, 2.4)}Bring in a DXF, PDF or photo</button>`, { foot: 'Put the client\'s plan or section under the crane, then set its scale from two points you know.' });
    out += grp('Top view', `${Fx.sw('sitePlan.enabled', 'Print the top view on the sheet')}${Fx.num('sitePlan.cx', 'Crane east', 'm')}${Fx.num('sitePlan.cy', 'Crane north', 'm')}${Fx.num('sitePlan.carrierRot', 'Crane faces', '°', { ph: 'auto' })}<button type="button" class="it accent tap" data-sa="view" data-v="plan">${ic('plan', 20)}Open the top view</button>`, { foot: 'In the top view, drag the yellow dot to move the crane and the purple diamond to swing the load.' });
    return out;
  }
};
document.addEventListener('change', (e) => { if (e.target.dataset?.saSw === 'gap') { state.settings.showGap = e.target.checked; saveSettings(); sceneDirty(); } });
document.addEventListener('click', (e) => { const b = e.target.closest('#sheet [data-sa-gt]'); if (b) { state.plan.site.groundType = b.dataset.saGt; commit({ sheet: true }); } });
SH.obj = {
  title: (i) => { const o = state.plan.site.obstacles[i]; return o ? (o.label || OBJ_TYPES[o.type]?.label || 'Object') : 'Object'; }, icon: 'site', sub: true,
  body(i) {
    const o = state.plan.site.obstacles[i]; if (!o) return '<p class="hint">This object was removed.</p>';
    const pre = `site.obstacles.${i}.`; const xl = ['towercrane', 'tower', 'person', 'tree', 'pole'].includes(o.type) ? 'Middle is at' : 'Near side is at';
    let rows = Fx.text(pre + 'label', 'Name', { ph: OBJ_TYPES[o.type]?.label.toUpperCase() }) + Fx.num(pre + 'x', xl, 'm', { sub: 'from the middle of the crane' }) + Fx.num(pre + 'y', 'Raised by', 'm', { ph: '0' });
    if (['building', 'wall', 'box'].includes(o.type)) rows += Fx.num(pre + 'w', 'Width', 'm') + Fx.num(pre + 'h', 'Height', 'm') + (o.type === 'building' ? Fx.num(pre + 'd', 'Depth', 'm', { ph: 'auto' }) : '');
    if (o.type === 'container') rows += Fx.sel(pre + 'size', 'Size', [['20', "20' (6.06 m)"], ['40', "40' (12.19 m)"]]);
    if (o.type === 'towercrane') rows += Fx.num(pre + 'h', 'Mast height', 'm') + Fx.num(pre + 'mastW', 'Mast width', 'm') + Fx.num(pre + 'topH', 'Top', 'm') + Fx.num(pre + 'jib', 'Jib reach', 'm', { ph: 'none' }) + Fx.num(pre + 'cjib', 'Counter-jib', 'm', { ph: '30% of jib' });
    if (o.type === 'tree') rows += Fx.num(pre + 'w', 'Tree width', 'm') + Fx.num(pre + 'h', 'Height', 'm');
    if (o.type === 'pole') rows += Fx.num(pre + 'h', 'Height', 'm') + Fx.num(pre + 'w', 'Cross-arm', 'm') + Fx.sw(pre + 'live', 'Live power lines', { sub: 'Keep the safety zone clear' });
    if (o.type === 'shed') rows += Fx.num(pre + 'w', 'Width', 'm') + Fx.num(pre + 'h', 'Wall height', 'm');
    if (o.type === 'tower') rows += Fx.num(pre + 'w', 'Base width', 'm') + Fx.num(pre + 'h', 'Height', 'm');
    return grp('', rows) + `<div class="btns two" style="margin-top:16px"><button type="button" class="btn tap" data-sa="objDup" data-i="${i}">${ic('copy', 18)}Copy</button><button type="button" class="btn danger tap" data-sa="objDel" data-i="${i}">${ic('trash', 18)}Delete</button></div>
      <button type="button" class="btn plain wide tap" data-sa="objFind" data-i="${i}" style="margin-top:6px">Show it on the drawing</button>`;
  }
};
SH.env = {
  title: (i) => state.plan.env[i]?.name || 'Drawing', icon: 'file', sub: true,
  body(i) {
    const e = state.plan.env[i]; if (!e) return '<p class="hint">Removed.</p>'; const pre = `env.${i}.`;
    const scale = e.kind === 'dxf' ? Fx.sel(pre + 'unit', 'Units', [['mm', 'Millimetres'], ['cm', 'Centimetres'], ['m', 'Metres'], ['in', 'Inches'], ['ft', 'Feet']]) : e.kind === 'pdf' ? Fx.num(pre + 'N', 'Scale 1:', '', { re: 1 }) : Fx.num(pre + 'sc', 'Metres per pixel', 'm');
    return grp('', `${Fx.text(pre + 'name', 'Name')}${Fx.sel(pre + 'view', 'Show in', [['elev', 'Drawing (side)'], ['plan', 'Top view']])}${scale}${Fx.num(pre + 'rot', 'Turn', '°')}${Fx.num(pre + 'opacity', 'See-through', '', { sub: '0 to 1' })}${Fx.sw(pre + 'mono', 'Grey lines')}${Fx.sw(pre + 'hidden', 'Hide it')}`, { foot: e.calibrated ? 'Scale set from two points.' : '' })
      + grp('Place it', `<button type="button" class="it accent tap" data-sa="envCalib" data-i="${i}">${ic('measure', 20)}Set the scale from two points</button><button type="button" class="it accent tap" data-sa="envAlign" data-i="${i}">${ic('pin', 20)}Line up a point</button><button type="button" class="it accent tap" data-sa="envCentre" data-i="${i}">${ic('fit', 20)}Bring to the middle</button><button type="button" class="it danger tap" data-sa="envDel" data-i="${i}">Remove the drawing</button>`);
  }
};

// ---------- weather ----------
SH.weather = {
  title: () => 'Wind and weather', icon: 'wind', sub: true,
  body() {
    const p = state.plan; const W = p.weather; const S = state.wx; const res = state.calc.loads[activeLi()]; const tipH = Math.max(10, num(res?.tipY, 30));
    if (!W) return `${note('', 'info', 'Add where and when you lift. The wind is worked out up at the boom top and checked against the crane\'s wind limit.')}<button type="button" class="btn pri wide tap" data-sa="wxOn" style="margin-top:14px">${ic('wind', 20, 2.2)}Add the weather</button>`;
    const wx = state.calc.weather; const days = WX.days(W);
    let out = grp('Place', `${W.place ? `<div class="it has-ic">${icb('pin', 'var(--info-fill)')}<span class="lb"><b>${h(W.place)}</b><small>${W.lat != null ? `${(+W.lat).toFixed(3)}, ${(+W.lon).toFixed(3)}` : 'typed by hand'}</small></span><button type="button" class="btn sm tap" data-sa="wxChange">Change</button></div>` : ''}
      ${!W.place || S.editing ? `<div class="it stack"><div class="search">${ic('search', 20, 2.2)}<input type="search" id="wxQ" placeholder="Site, area or city" value="${h(S.q)}" aria-label="Lift place"></div><div class="btns"><button type="button" class="btn sm pri tap" data-sa="wxSearch"${S.busy ? ' disabled' : ''}>${S.busy ? 'Searching…' : 'Search'}</button><button type="button" class="btn sm tap" data-sa="wxLocate">${ic('pin', 18)}Where I am</button></div></div>
      ${S.res ? S.res.map((r, i) => `<button type="button" class="it tap" data-sa="wxPick" data-i="${i}"><span class="lb"><b>${h(r.name)}</b><small>${h(r.sub || '')}</small></span></button>`).join('') : ''}
      ${WX.blocked && S.q && !WX.parseLatLon(S.q) ? `<button type="button" class="it accent tap" data-sa="wxNameOnly">Use “${h(S.q)}” as the place name</button>` : ''}` : ''}`, { foot: S.err ? `<span style="color:var(--warn)">${h(S.err)}</span>` : '' });
    out += grp('When', `<label class="it"><span class="lb"><b>Day</b></span>${days.length ? `<select class="fld" data-k="weather.date" data-re="1">${days.map(d => `<option value="${d}"${d === W.date ? ' selected' : ''}>${new Date(d + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}</option>`).join('')}</select>` : `<input class="fld" type="date" data-k="weather.date" value="${h(W.date || '')}">`}</label>${Fx.text('weather.start', 'Start time', { ph: '07:00' })}${Fx.num('weather.hours', 'How long', 'h')}${Fx.num('weather.limit', 'Wind limit', 'm/s', { sub: 'from the crane\'s chart, often 9–14' })}`);
    if (W.hourly) out += grp('Forecast', `${wx ? `<div class="dial-out" style="padding:12px"><div class="mini ${wx.maxG > wx.limit ? 'fail' : wx.maxG > wx.limit * 0.8 ? 'warn' : 'ok'}"><span>Gust at top</span><b>${fmt(wx.maxG)}<small>m/s</small></b></div><div class="mini"><span>Wind at top</span><b>${fmt(wx.maxW)}<small>m/s</small></b></div><div class="mini ${wx.rain >= 60 ? 'warn' : ''}"><span>Rain</span><b>${wx.rain}<small>%</small></b></div></div>` : ''}<div class="it stack">${WX.chart(W, tipH, { pick: true })}</div>`, { right: `<button type="button" class="tap" data-sa="wxFetch">${S.busy ? 'Loading…' : 'Refresh'}</button>`, foot: wx ? h(wx.msgs.join(' · ')) : 'No hours in the lift window. Check the day and time.' });
    else if (W.lat != null) out += `<button type="button" class="btn wide tap" data-sa="wxFetch" style="margin-top:16px">${S.busy ? 'Loading the forecast…' : 'Get the forecast'}</button>`;
    out += grp(W.hourly ? 'Or type it' : 'Type the forecast', `${Fx.num('weather.manual.wind', 'Wind at 10 m', 'm/s')}${Fx.num('weather.manual.gust', 'Gust at 10 m', 'm/s')}${Fx.num('weather.manual.rain', 'Rain chance', '%')}${Fx.text('weather.manual.note', 'Outlook', { ph: 'Clear' })}`, { foot: W.hourly ? 'Only used if you clear the live forecast.' : `Wind from any forecast at 10 m. It is scaled up to the ${Math.round(tipH)} m boom top for the check.` });
    out += grp('On the sheet', `${Fx.sw('weather.print', 'Print the weather on the sheet')}${W.hourly ? '<button type="button" class="it accent tap" data-sa="wxClearLive">Clear the live forecast</button>' : ''}<button type="button" class="it danger tap" data-sa="wxOff">Remove the weather</button>`, { foot: 'A forecast helps you plan. On the day, the crane\'s wind meter and the supervisor decide.' });
    return out;
  }
};

// ---------- print & job details ----------
const LAYOUTS = [['chart', 'Chart + drawing'], ['full', 'Big drawing'], ['elev2', 'Two lifts'], ['rigging', 'Drawing + slings']];
function layoutIco(v) {
  const boom = (x, y, L, a) => { const r = a * Math.PI / 180, bx = x + L * Math.cos(r), by = y - L * Math.sin(r); return `<path d="M${x - 4} ${y}h9M${x} ${y - 1}L${bx.toFixed(1)} ${by.toFixed(1)}v${((y - by) * 0.55).toFixed(1)}" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>`; };
  const g = { chart: `<path d="M38 4v51M4 30h34M8 10h26M8 15h26M8 20h26" stroke="currentColor" stroke-width="1.4" opacity=".5"/>${boom(46, 50, 24, 52)}`, full: boom(12, 52, 44, 50), elev2: `<path d="M36 4v51" stroke="currentColor" stroke-width="1.4" opacity=".5"/>${boom(8, 50, 22, 55)}${boom(42, 50, 22, 48)}`, rigging: `<path d="M44 4v51" stroke="currentColor" stroke-width="1.4" opacity=".5"/>${boom(8, 50, 28, 52)}<path d="M57 16l-6 14M57 16l6 14M49 30h16v7H49z" stroke="currentColor" stroke-width="1.6" fill="none"/>` }[v] || '';
  return `<svg viewBox="0 0 84 59" width="84" height="59" aria-hidden="true"><rect x="1" y="1" width="82" height="57" rx="5" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".4"/><rect x="71" y="4" width="9" height="51" rx="1.5" fill="currentColor" opacity=".18"/>${g}</svg>`;
}
SH.sheetDetails = { // v10: everything that is printed on the sheet. The export buttons live in "Share & print".
  title: () => 'Sheet details', icon: 'sheet', sub: true,
  body() {
    const p = state.plan; const locked = !!(p.sheetView && p.sheetView.x1 > p.sheetView.x0);
    let out = `<p class="hint" style="margin:0 4px 12px">What is printed on the sheet and in the report. Changes show on the Sheet view straight away.</p><button type="button" class="btn plain wide tap" data-sa="view" data-v="sheet" style="margin-bottom:6px">${ic('eye', 20)}See the sheet</button>`;
    if (typeof riskLink === 'function' && riskLink()) out += grp('Report', riskLink());
    out += grp('Job', `${Fx.text('name', 'Plan name', { ph: 'e.g. Al Deem School panels' })}${Fx.text('meta.client', 'Client')}${Fx.text('meta.project', 'Project', { ph: 'optional' })}${Fx.text('meta.title', 'Drawing title', { ph: 'e.g. LIFTING CHILLERS' })}${Fx.text('meta.date', 'Date')}${Fx.text('meta.drawnBy', 'Drawn by')}${Fx.text('meta.checkedBy', 'Checked by')}`);
    out += grp('Sheet layout', `<div class="otiles" style="grid-template-columns:repeat(2,minmax(0,1fr))">${LAYOUTS.map(([v, t]) => `<button type="button" class="ot tap" data-sa="layout" data-v="${v}" aria-pressed="${p.layout === v}">${layoutIco(v)}${h(t)}</button>`).join('')}</div>`, { raw: true });
    out += grp('More', `${Fx.text('meta.sheetNo', 'Sheet no')}${Fx.text('meta.drawingNo', 'Drawing no')}${Fx.text('meta.scale', 'Scale', { ph: 'auto' })}${p.layout === 'elev2' ? Fx.sel('secondLoad', 'Second drawing shows', p.loads.map((x, i) => [i, `Lift ${i + 1}${x.name ? ' · ' + x.name : ''}`]), { numeric: 1 }) : Fx.text('viewTitle1', 'Drawing caption', { ph: (curCrane()?.cls || '') + 'T MOBILE CRANE' })}
      ${Fx.link('open', 'What prints in the data panel', { data: 'data-k="rows"' })}${Fx.link('open', 'Change values on the sheet', { data: 'data-k="sheetData"', sub: 'Type over any number or word printed in the data panel', val: (state.calc.sheetOv || []).length ? `${state.calc.sheetOv.length} typed` : '' })}<button type="button" class="it accent tap" data-sa="${locked ? 'unlockView' : 'lockView'}">${locked ? 'Frame the sheet automatically' : 'Use what I see on screen for the sheet'}</button>`);
    out += grp('Ground pressure table', `${Fx.sw('outrigger.enabled', 'Add the ground pressure table')}${Fx.link('open', 'Leg loads, mats and ground', { data: 'data-k="legs"', ic: icb('legs', 'var(--brand-ink)'), val: state.calc.ground ? `${state.calc.ground.press.toFixed(1)} t/m²` : '' })}`, { foot: 'The busiest leg load is worked out for the crane, the load and the lift side. Mats, ground and the maker\'s figure are set under Legs.' });
    out += grp('Sling detail', `${Fx.sw('rigging.enabled', 'Add the sling drawing')}${p.rigging?.enabled ? `${Fx.sel('rigging.loadIdx', 'For lift', p.loads.map((l, i) => [i, 'Lift ' + (i + 1)]), { numeric: 1 })}${Fx.num('rigging.legs', 'Legs', '')}${Fx.num('rigging.effLegs', 'Legs that carry', '')}${Fx.num('rigging.slingL', 'Sling length', 'm')}${Fx.num('rigging.spread', 'Spread', 'm')}${Fx.num('rigging.slingWLL', 'Sling WLL', 't')}${Fx.num('rigging.shackleWLL', 'Shackle WLL', 't')}${Fx.text('rigging.slingDesc', 'Sling text', { ph: "10m x 20t round sling - 4No's" })}${Fx.text('rigging.shackleDesc', 'Shackle text', { ph: "25t BOW SHACKLE - 4No's" })}` : ''}`);
    out += grp('Changes (revisions)', (p.meta.revs || []).map((rv, i) => `<div class="it" style="gap:8px"><input class="fld" style="max-width:52px;text-align:left" data-k="meta.revs.${i}.rev" value="${h(rv.rev || '')}" aria-label="Revision"><input class="fld wide" data-k="meta.revs.${i}.desc" value="${h(rv.desc || '')}" placeholder="What changed" aria-label="Description"><input class="fld" style="max-width:96px" data-k="meta.revs.${i}.date" value="${h(rv.date || '')}" aria-label="Date"><button type="button" class="btn sm tap" data-sa="delRev" data-i="${i}" aria-label="Remove">${ic('x', 16)}</button></div>`).join('') + `<button type="button" class="it accent tap" data-sa="addRev">${ic('plus', 20, 2.4)}Add a change</button>`);
    out += grp('Notes', Fx.area('extraNotes', 'Extra notes · one per line', { rows: 4 }));
    return out;
  }
};
const SR_SEC = { crane: 'Crane', load: 'Load', extra: 'Extras' };
SH.rows = {
  title: () => 'Data panel', icon: 'sheet', sub: true,
  body() {
    const p = state.plan; const R = p.sheetRows || { custom: [] }; const L = p.loads || [];
    let out = Object.entries(SHEET_ROWS).map(([sec, rows]) => grp(SR_SEC[sec], rows.map(([k, lab]) => { const key = sec + '.' + k; return Fx.swRaw(`data-sr="${key}"`, lab, sheetRowOn(p, key)); }).join(''))).join('');
    const secOpts = (c) => [['crane', 'Crane block'], ['load', 'Every lift'], ...L.map((_, i) => ['load' + i, 'Lift ' + (i + 1) + ' only']), ['extra', 'Own block']].map(([v, t]) => { const cur = c.sec === 'load' ? (c.load === '' || c.load == null ? 'load' : 'load' + c.load) : c.sec; return `<option value="${v}"${cur === v ? ' selected' : ''}>${h(t)}</option>`; }).join('');
    out += grp('Your own rows', (R.custom || []).map((c, i) => `<div class="it stack"><input class="fld wide" data-k="sheetRows.custom.${i}.label" value="${h(c.label || '')}" placeholder="Label — e.g. LIFT SUPERVISOR" aria-label="Row ${i + 1} label"><input class="fld wide" data-k="sheetRows.custom.${i}.value" value="${h(c.value || '')}" placeholder="Value" aria-label="Row ${i + 1} value"><div style="display:flex;gap:8px;align-items:center"><select class="fld" style="max-width:none;text-align:left" data-srsec="${i}" aria-label="Goes in">${secOpts(c)}</select><button type="button" class="btn sm danger tap" data-sa="srDel" data-i="${i}">Remove</button></div></div>`).join('') + `<button type="button" class="it accent tap" data-sa="srAdd">${ic('plus', 20, 2.4)}Add a row</button>`)
      + `<button type="button" class="btn plain wide tap" data-sa="srReset" style="margin-top:12px">Back to the standard rows</button>`;
    return out;
  }
};

// ---------- checks ----------
SH.checks = {
  title: () => 'Checks', icon: null,
  body() {
    const calc = state.calc, li = activeLi(), r = calc.loads[li], g = r?.geo || {}, S = settingsEff(); const st = utilCls(r); const items = allChecks(calc);
    const { ch } = loadCol(li); const wx = calc.weather; const slT = r?.sling ? r.sling.T : r?.stack ? Math.max(0, ...r.stack.items.filter(t => t.T != null).map(t => t.T)) || null : null;
    const [word, vic] = VERDICT[calc.status];
    const cell = (t, v, u, cls = '') => `<div class="mini ${cls}"><span>${t}</span><b>${v}${u ? `<small>${u}</small>` : ''}</b></div>`;
    return `<div class="status st-${calc.status}" style="margin-bottom:16px;box-shadow:none"><div class="verdict" style="grid-column:1/-1"><div class="vw"><span class="vi">${ic(vic, 16, 3)}</span>${word}</div><div class="vs2">${calc.status === 'fail' ? 'Do not lift as drawn. Fix the red items.' : calc.status === 'warn' ? 'Critical lift. The Appointed Person must sign it off.' : 'Every check passes.'}</div></div></div>
      ${grp(`${items.length} checks`, items.map(c => `<div class="ck ${c.s}"><span class="ci">${ic(c.s === 'fail' ? 'stop' : c.s === 'warn' ? 'alert' : c.s === 'info' ? 'info' : 'check', 15, 3)}</span><div><b>${h(c.t)}</b><span>${h(c.m)}</span></div></div>`).join(''))}
      <section class="grp"><h3>Numbers</h3><div class="dial-out" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        ${cell('On hook', fmt(r?.total, 2), 't')}${cell('Can lift', r?.cap != null ? fmt(r.cap, 2) : '—', 't', st)}${cell('Using', r?.util != null ? r.util.toFixed(1) : '—', '%', st)}
        ${cell('Net for load', r?.netCap != null ? fmt(r.netCap, 2) : '—', 't', r?.netCap != null && r.netCap < r.W + r.contW ? 'fail' : '')}${cell('Margin', r?.margin != null ? fmt(r.margin, 1) : '—', '%')}${cell('Wind limit', r?.wind ? fmt(r.wind.vPerm, 1) : '—', r?.wind ? 'm/s' : '', r?.wind?.vDes != null ? (r.wind.vDes > r.wind.vPerm ? 'fail' : r.wind.vDes > 0.8 * r.wind.vPerm ? 'warn' : 'ok') : '')}
        ${cell('Reach', fmt(r?.R, 2), 'm')}${cell(ch?.kind === 'luffing' ? 'Jib angle' : 'Angle', g.tip ? (g.kind === 'luffing' ? g.gamma : g.theta).toFixed(1) : '—', '°', g.ok === false ? 'fail' : '')}${cell('Boom', g.kind === 'main' ? fmt(g.L, 2) : `${fmt(g.Lb, 1)}+${fmt(g.Lj, 1)}`, 'm')}
        ${cell('Boom top', fmt(r?.tipY, 2), 'm', r?.tipY != null && r.tipY < r.reqTipY ? 'fail' : '')}${cell('Hook', fmt(r?.hookY, 2), 'm')}${cell('Gap', r?.clearance != null ? r.clearance.toFixed(2) : '—', 'm', r?.clearance != null ? (r.clearance <= 0 ? 'fail' : r.clearance < num(S.minClearance, 1) ? 'warn' : 'ok') : '')}
        ${cell('Counterweight', fmt(num(state.plan.cwt !== '' && state.plan.cwt != null ? state.plan.cwt : (r?.chartDef?.cwt ?? calc.crane.cwt)), 1), 't')}${cell('Wind at top', wx ? fmt(wx.maxG, 1) : '—', wx ? 'm/s' : '', wx ? (wx.maxG > wx.limit ? 'fail' : wx.maxG > wx.limit * 0.8 ? 'warn' : '') : '')}${cell('Each sling', slT != null ? slT.toFixed(2) : '—', slT != null ? 't' : '')}
      </div></section>
      <p class="hint" style="margin-top:16px">Crane data comes from the library. The Appointed Person checks every plan before it is used.</p>`;
  }
};

// ---------- more ----------
SH.more = {
  title: () => 'More', icon: null,
  body() {
    const t = state.settings.theme || 'auto';
    return grp('', `${Fx.link('page', 'Plans', { data: 'data-v="plans"', ic: icb('folder', 'var(--info-fill)'), sub: 'Open, copy or start a plan' })}<button type="button" class="it has-ic tap" data-sa="open" data-k="print">${icb('share', 'var(--info-fill)')}<span class="lb"><b>Share &amp; print</b><small>Make the PDF, then save, AirDrop or print it</small></span></button><button type="button" class="it has-ic tap" data-sa="save" data-v="">${icb('save', 'var(--safe-fill)')}<span class="lb"><b>Save</b><small id="moreSave">${h($('#saveState')?.textContent || $('#tbState')?.textContent || '')}</small></span></button><button type="button" class="it has-ic tap" data-sa="save" data-v="new">${icb('copy', 'var(--safe-fill)')}<span class="lb"><b>Save a copy</b><small>A new plan with the same set-up</small></span></button>`)
      + grp('', `${Fx.link('page', 'Cranes and charts', { data: 'data-v="fleet"', ic: icb('truck', '#ff9500') })}${Fx.link('page', 'Settings', { data: 'data-v="settings"', ic: icb('gear', 'var(--ink-3)') })}<button type="button" class="it has-ic tap" data-sa="coach">${icb('help', '#af52de')}<span class="lb"><b>Show the tips again</b></span></button><button type="button" class="it has-ic tap" data-sa="open" data-k="new10">${icb('sparkle', '#ff9500')}<span class="lb"><b>What is new in ${h(APP_VERSION.split('.')[0])}</b></span></button>`)
      + grp('Look', `<div class="it"><div class="seg" style="width:100%">${[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<button type="button" class="tap" data-sa="theme" data-v="${v}" aria-checked="${t === v}">${l}</button>`).join('')}</div></div>`)
      + grp('', `<button type="button" class="it has-ic tap" data-sa="signout">${icb('out', 'var(--stop-fill)')}<span class="lb"><b>Sign out</b><small>Signed in as ${h(V7.user || authUser() || '')}</small></span></button>`)
      + `<p class="hint" style="text-align:center;margin-top:20px">FHE Lift Planner · version ${APP_VERSION} · built by Saad Khan for Friendship Hall Est.</p>`;
  }
};
