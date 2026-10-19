// ===== Quick setup: questionnaire → ranked crane options → new plan =====
const LOAD_KINDS = [
  { k: 'box', label: 'Equipment / box', shape: 'box', l: 3, h: 2, rigH: 3 },
  { k: 'ac', label: 'AC unit / chiller', shape: 'box', l: 4.5, h: 2.4, rigH: 4, name: 'AC unit' },
  { k: 'c20', label: "20' container", shape: 'container', l: 6.06, h: 2.59, rigH: 5, name: "20' container" },
  { k: 'c40', label: "40' container", shape: 'container', l: 12.19, h: 2.59, rigH: 6, name: "40' container" },
  { k: 'drum', label: 'Cable drum', shape: 'drum', l: 2.6, h: 2.6, rigH: 3.5, name: 'Cable drum' },
  { k: 'precast', label: 'Precast panel', shape: 'box', l: 7, h: 0.4, rigH: 6, name: 'Precast panel' },
  { k: 'trafo', label: 'Transformer', shape: 'box', l: 4.2, h: 3, rigH: 6, name: 'Transformer' },
  { k: 'steel', label: 'Steel beam / truss', shape: 'box', l: 12, h: 0.8, rigH: 5, name: 'Steel beam' },
  { k: 'tc', label: 'Tower crane part', shape: 'tc', l: 6, h: 3, rigH: 5, name: 'Tower crane section' }
];
const LAND_KINDS = [
  { k: 'ground', label: 'On the ground', hint: 'Set down on site level' },
  { k: 'roof', label: 'On a roof', hint: 'Over the building edge' },
  { k: 'trailer', label: 'Onto a trailer', hint: 'Low-bed, deck at 1.45 m' },
  { k: 'structure', label: 'Onto a structure', hint: 'Plinth, steel frame, tower' }
];
function wizDefaults() {
  return { step: 0, kind: 'box', name: '', w: '', cont: 0, tk: 0.6, l: 3, h: 2, rigH: 3,
    land: 'ground', R: '', face: '', into: '', roofH: '', bw: 20, structH: '',
    spaceAny: true, spL: '', spW: '', ground: 'ground', allowJib: false, maxUtil: '', wind: '7M/S', bearing: '',
    client: '', project: '', title: '', drawnBy: '', checkedBy: '', res: null, pick: '' };
}
const WIZ_STEPS = ['The load', 'Where it goes', 'Site limits', 'Job details', 'Crane options'];
function wizOpen() {
  if (!state.wiz) state.wiz = wizDefaults();
  state.wiz.step = Math.min(state.wiz.step, 3); if (state.wiz.res) state.wiz.step = 4;
  let m = $('#wizard'); if (!m) { m = document.createElement('div'); m.id = 'wizard'; m.className = 'wiz-back'; document.body.appendChild(m); bindWizard(m); }
  m.hidden = false; renderWizard(); setTimeout(() => { const f = m.querySelector('input:not([type=radio]), button.chip'); f && f.focus({ preventScroll: true }); }, 30);
}
function wizClose() { const m = $('#wizard'); if (m) m.hidden = true; }
function wizReq(a) {
  const R = a.land === 'roof' && num(a.face) > 0 ? num(a.face) + num(a.into) : num(a.R);
  const site = { groundType: a.ground, obstacles: [] };
  if (a.land === 'roof') site.obstacles.push({ type: 'building', x: num(a.face, Math.max(2, R - 5)), w: Math.max(num(a.bw, 20), num(a.into) + 3), h: num(a.roofH, 10), label: 'BUILDING' });
  if (a.land === 'trailer') site.obstacles.push({ type: 'trailer', x: r2(R - 6.8), label: 'LOW-BED TRAILER' });
  if (a.land === 'structure') site.obstacles.push({ type: 'box', x: r2(R - Math.max(1.5, num(a.l, 2) / 2 + 0.5)), w: r2(Math.max(3, num(a.l, 2) + 1)), h: num(a.structH, 5), label: 'STRUCTURE' });
  return { w: num(a.w), tk: num(a.tk), hb: 0, cont: num(a.cont), R, h: num(a.h, 2), rigH: num(a.rigH, 3), site, hookAllowance: 3 };
}
function wizRun() {
  const a = state.wiz; const req = wizReq(a);
  const opts = { allowJib: !!a.allowJib, space: a.spaceAny ? null : { L: a.spL, W: a.spW }, maxUtil: a.maxUtil || undefined };
  const all = findCranes(req, cranes(), settingsEff(), opts);
  a.res = { req, best: bestPerCrane(all), count: all.filter(o => o.ok).length };
}
function wizValid(a, step) {
  if (step === 0) return num(a.w) > 0 ? '' : 'Enter the load weight';
  if (step === 1) { const R = a.land === 'roof' && num(a.face) > 0 ? num(a.face) + num(a.into) : num(a.R); if (!(R > 0)) return a.land === 'roof' ? 'Enter the distance to the building face (and how far in)' : 'Enter the radius'; if (a.land === 'roof' && !(num(a.roofH) > 0)) return 'Enter the roof height'; if (a.land === 'structure' && !(num(a.structH) > 0)) return 'Enter the structure height'; }
  if (step === 2 && !a.spaceAny && !(num(a.spL) > 0 && num(a.spW) > 0)) return 'Enter the space for the outriggers, or tick “no limit”';
  return '';
}
function renderWizard() {
  const m = $('#wizard'); const a = state.wiz; const s = a.step;
  const fld = (k, lab, unit, o = {}) => `<label class="f"><span>${h(lab)}${unit ? ` <span class="unit">${h(unit)}</span>` : ''}</span><input id="wz-${k}" data-w="${k}" type="${o.text ? 'text' : 'number'}" ${o.text ? '' : 'step="any" inputmode="decimal"'} value="${h(a[k] ?? '')}"${o.ph ? ` placeholder="${h(o.ph)}"` : ''}></label>`;
  const chips = (k, list) => `<div class="chips-pick" role="radiogroup">${list.map(o => `<button type="button" class="chip${a[k] === o.k ? ' on' : ''}" role="radio" aria-checked="${a[k] === o.k}" data-wpick="${k}" data-v="${o.k}"><b>${h(o.label)}</b>${o.hint ? `<small>${h(o.hint)}</small>` : ''}</button>`).join('')}</div>`;
  let body = '';
  if (s === 0) body = `<h3>What are you lifting?</h3>${chips('kind', LOAD_KINDS)}
    <div class="row r3">${fld('w', 'Load weight', 't')}${fld('cont', 'Contingency', '%')}${fld('tk', 'Lifting tackles', 't')}</div>
    <div class="row r3">${fld('l', 'Load length', 'm')}${fld('h', 'Load height', 'm')}${fld('rigH', 'Rigging height', 'm')}</div>
    <div class="row r1">${fld('name', 'Load name on the sheet', '', { text: 1, ph: LOAD_KINDS.find(x => x.k === a.kind)?.name || 'optional' })}</div>`;
  else if (s === 1) body = `<h3>Where does it land?</h3>${chips('land', LAND_KINDS)}
    ${a.land === 'roof' ? `<div class="row r3">${fld('face', 'Crane centre to building face', 'm')}${fld('into', 'Landing point in from the face', 'm')}${fld('roofH', 'Roof height', 'm')}</div><div class="row">${fld('bw', 'Building width', 'm')}<p class="hint" style="align-self:end">Radius = face distance + distance in${num(a.face) > 0 ? ` = <b>${r2(num(a.face) + num(a.into))} m</b>` : ''}.</p></div>`
      : `<div class="row">${fld('R', 'Radius — crane centre to landing point', 'm')}${a.land === 'structure' ? fld('structH', 'Structure height', 'm') : '<span></span>'}</div>`}
    <p class="hint">Measure from the crane's slewing centre. You can drag the crane and the load on the drawing later.</p>`;
  else if (s === 2) body = `<h3>Site limits</h3>
    <div class="sub"><label class="check"><input type="checkbox" id="wz-spaceAny" data-w="spaceAny" ${a.spaceAny ? 'checked' : ''}> No limit on outrigger space</label>
    ${a.spaceAny ? '' : `<div class="row">${fld('spL', 'Space available, long', 'm')}${fld('spW', 'Space available, across', 'm')}</div>`}</div>
    <div class="row">${`<label class="f"><span>Crane stands on</span><select id="wz-ground" data-w="ground"><option value="ground"${a.ground === 'ground' ? ' selected' : ''}>Ground</option><option value="barge"${a.ground === 'barge' ? ' selected' : ''}>Barge</option></select></label>`}${fld('bearing', 'Allowable ground bearing', 't/m²', { ph: 'skip' })}</div>
    <div class="row">${fld('maxUtil', 'Max chart utilisation', '%', { ph: String(settingsEff().utilMax) })}${fld('wind', 'Wind speed limit', '', { text: 1 })}</div>
    <label class="check"><input type="checkbox" id="wz-allowJib" data-w="allowJib" ${a.allowJib ? 'checked' : ''}> Consider luffing and fly-jib configurations</label>`;
  else if (s === 3) body = `<h3>Job details</h3><div class="row">${fld('client', 'Client', '', { text: 1 })}${fld('project', 'Project', '', { text: 1, ph: 'optional' })}</div>
    <div class="row r1">${fld('title', 'Drawing title', '', { text: 1, ph: 'Lifting ' + (a.name || LOAD_KINDS.find(x => x.k === a.kind)?.name || 'load').toLowerCase() })}</div>
    <div class="row">${fld('drawnBy', 'Drawn by', '', { text: 1, ph: settingsEff().defaultDrawnBy || '' })}${fld('checkedBy', 'Checked by', '', { text: 1 })}</div>`;
  else {
    const r = a.res; const S = settingsEff();
    const card = (o, i) => { const u = o.r.util; const cls = !o.ok ? 'fail' : u > num(S.utilWarn, 100) ? 'warn' : 'ok';
      return `<article class="opt ${cls}${i === 0 && o.ok ? ' top' : ''}"><header><span class="cls">${o.crane.cls}<small>T</small></span><div><b>${h(o.crane.make)} ${h(o.crane.model)}</b><span>${h(o.chart.name)}</span></div>${i === 0 && o.ok ? '<span class="pill ok">Best fit</span>' : !o.ok ? `<span class="pill fail">${h(o.fails[0]?.t || 'Fails')}</span>` : ''}</header>
        <div class="lmi"><i style="width:${Math.min(100, u)}%"></i><span>${u.toFixed(1)}%</span></div>
        <dl><div><dt>Boom</dt><dd>${h(colName(o.col))}${o.chart.kind === 'main' ? ' m' : '°'}</dd></div><div><dt>Angle</dt><dd>${o.r.geo.theta.toFixed(1)}°</dd></div><div><dt>Chart</dt><dd>${o.r.cap.toFixed(1)} t</dd></div><div><dt>Total</dt><dd>${o.r.total.toFixed(2)} t</dd></div><div><dt>Spread</dt><dd>${o.span[0]}×${o.span[1]}</dd></div><div><dt>CWT</dt><dd>${h(o.chart.cwt ?? o.crane.cwt)} t</dd></div></dl>
        ${!o.ok ? `<p class="why">${h(o.fails.map(f => f.m).slice(0, 2).join(' · '))}</p>` : ''}
        <button type="button" class="btn ${o.ok ? 'primary' : ''}" data-wact="use" data-i="${i}">Use ${h(o.crane.model)}</button></article>`; };
    const okList = r.best.filter(o => o.ok); const list = okList.length >= 3 ? okList.slice(0, 9) : [...okList, ...r.best.filter(o => !o.ok).slice(0, 3 - okList.length + 1)];
    body = `<h3>${r.count ? `${r.best.filter(o => o.ok).length} crane${r.best.filter(o => o.ok).length === 1 ? '' : 's'} can do it` : 'No crane in the library passes every check'}</h3>
      <p class="hint">${h(r.req.w)} t load + tackles at ${h(r.req.R)} m radius. Smallest crane first; each card shows its least-counterweight configuration that works.${r.count ? '' : ' The closest misses are shown so you can see what to change.'}</p>
      <div class="opts">${list.map(card).join('') || '<div class="empty">No crane in the library has a chart that reaches this radius.</div>'}</div>
      <div class="sub"><div class="sub-head">Or pick a crane yourself</div><div class="row"><label class="f"><span>Crane</span><select id="wz-pick" data-w="pick">${cranes().map(c => `<option value="${h(c.id)}"${a.pick === c.id ? ' selected' : ''}>${h(c.model)} · ${c.cls} t</option>`).join('')}</select></label><button type="button" class="btn" style="align-self:end" data-wact="pick">Use this crane</button></div></div>`;
  }
  const err = s < 4 ? wizValid(a, s) : '';
  m.innerHTML = `<div class="wiz" role="dialog" aria-modal="true" aria-labelledby="wizTitle">
    <header class="wiz-head"><div><span class="eyebrow">Quick setup</span><h2 id="wizTitle">${h(WIZ_STEPS[s])}</h2></div><button type="button" class="btn ghost icon" data-wact="close" aria-label="Close">✕</button></header>
    <ol class="wiz-steps">${WIZ_STEPS.map((t, i) => `<li class="${i === s ? 'on' : i < s ? 'done' : ''}"><button type="button" data-wact="goto" data-i="${i}"${i > s && !(i === 4 && a.res) ? ' disabled' : ''}><span>${i + 1}</span>${h(t)}</button></li>`).join('')}</ol>
    <div class="wiz-body">${body}</div>
    <footer class="wiz-foot"><button type="button" class="btn ghost" data-wact="back"${s === 0 ? ' disabled' : ''}>Back</button><span class="err" id="wizErr">${s < 4 && err && a.tried ? h(err) : ''}</span>${s < 3 ? '<button type="button" class="btn primary" data-wact="next">Next</button>' : s === 3 ? '<button type="button" class="btn primary" data-wact="find">Find cranes</button>' : '<button type="button" class="btn" data-wact="restart">Start over</button>'}</footer></div>`;
}
function bindWizard(m) {
  m.addEventListener('click', (e) => {
    if (e.target === m) { wizClose(); return; }
    const b = e.target.closest('[data-wact],[data-wpick]'); if (!b) return; const a = state.wiz;
    if (b.dataset.wpick) {
      a[b.dataset.wpick] = b.dataset.v;
      if (b.dataset.wpick === 'kind') { const d = LOAD_KINDS.find(x => x.k === b.dataset.v); Object.assign(a, { l: d.l, h: d.h, rigH: d.rigH }); }
      renderWizard(); return;
    }
    const act = b.dataset.wact;
    if (act === 'close') wizClose();
    else if (act === 'back') { a.step = Math.max(0, a.step - 1); a.tried = false; renderWizard(); }
    else if (act === 'goto') { a.step = +b.dataset.i; a.tried = false; renderWizard(); }
    else if (act === 'next' || act === 'find') {
      const err = wizValid(a, a.step); if (err) { a.tried = true; renderWizard(); return; }
      for (let i = 0; i <= a.step; i++) { const e2 = wizValid(a, i); if (e2) { a.step = i; a.tried = true; renderWizard(); return; } }
      a.tried = false; if (act === 'find') { wizRun(); a.step = 4; } else a.step++; renderWizard();
      m.querySelector('.wiz-body').scrollTop = 0;
    } else if (act === 'restart') { state.wiz = wizDefaults(); renderWizard(); }
    else if (act === 'use') wizApply(a.res.best[+b.dataset.i]);
    else if (act === 'pick') {
      const id = a.pick || cranes()[0]?.id; const all = findCranes(a.res.req, cranes(), settingsEff(), { allowJib: true, craneIds: [id], space: a.spaceAny ? null : { L: a.spL, W: a.spW }, maxUtil: a.maxUtil || undefined });
      const best = bestPerCrane(all)[0];
      wizApply(best || { crane: cranes().find(c => c.id === id), none: true });
    }
  });
  m.addEventListener('input', (e) => { const k = e.target.dataset.w; if (!k) return; const a = state.wiz; a[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; if (a.res && a.step < 4) a.res = null; const er = $('#wizErr'); if (er && a.tried) er.textContent = wizValid(a, a.step); });
  m.addEventListener('change', (e) => { const k = e.target.dataset.w; if (k === 'spaceAny' || k === 'land') renderWizard(); });
  m.addEventListener('keydown', (e) => { if (e.key === 'Escape') wizClose(); if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); const nb = m.querySelector('[data-wact="next"],[data-wact="find"]'); nb && nb.click(); } });
}
function wizApply(o) {
  const a = state.wiz; const req = a.res.req; const S = settingsEff();
  const kind = LOAD_KINDS.find(x => x.k === a.kind) || LOAD_KINDS[0];
  const p = normalizePlan(blankPlan());
  const crane = o.crane;
  p.craneId = crane.id;
  if (!o.none) { p.chartIdx = o.chi; p.colIdx = o.ci; p.cwt = o.chart.cwt ?? null; p.falls = o.col.falls || ''; }
  else { p.chartIdx = crane.charts?.length ? 0 : -1; p.colIdx = 0; }
  const lname = a.name || kind.name || '';
  p.name = `${crane.model} — ${lname || 'load'} ${req.w} t at ${req.R} m`;
  p.meta = { ...p.meta, client: a.client, project: a.project, title: a.title || ('Lifting ' + (lname || 'load').toLowerCase()), drawnBy: a.drawnBy || S.defaultDrawnBy || p.meta.drawnBy, checkedBy: a.checkedBy };
  p.site = { ...p.site, groundType: a.ground, obstacles: JSON.parse(JSON.stringify(req.site.obstacles)) };
  p.loads = [{ ...p.loads[0], name: lname, w: req.w, cont: req.cont, tk: req.tk, hb: crane.hookBlock ?? 1, R: req.R, l: num(a.l, 2), h: req.h, rigH: req.rigH, shape: kind.shape, by: 'radius', angle: '' }];
  p.wind = a.wind || p.wind;
  if (num(a.bearing) > 0) p.outrigger = { ...p.outrigger, enabled: true, allow: num(a.bearing) };
  p.mergeHook = false;
  wizClose(); openPlan(p, 'lift');
  toast(`${crane.model} set up — drag the crane or the load to fine-tune`);
}
