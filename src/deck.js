// ===== Cab control deck — every lift control in one place, like the operator's seat: boom length, angle, radius, tip height,
// load, contingency, DAF, tackles, hook, crane and accessories. Typed values or levers; per-section telescoping stays tucked away. =====
const Deck = { pop: null, secs: false, bound: false };
const DEFAULT_TACKLE_LIB = [
  { name: '4-leg chain sling', type: 'sling', L: 6, w: 0, legs: 4 }, { name: '2-leg wire rope sling', type: 'sling', L: 6, w: 0, legs: 2 },
  { name: 'Webbing slings', type: 'sling', L: 4, w: 0, legs: 2 }, { name: 'Bow shackle', type: 'shackle', L: 0.4, w: 0, legs: 1 },
  { name: 'Spreader beam', type: 'spreader', L: 6, w: 0, legs: 1 }, { name: 'Lifting beam', type: 'beam', L: 4, w: 0, legs: 1 },
  { name: 'Chain block', type: 'chain', L: 1.5, w: 0, legs: 1 }
];
const tackleLib = () => (Array.isArray(state.settings.tackleLib) && state.settings.tackleLib.length ? state.settings.tackleLib : DEFAULT_TACKLE_LIB);
const dk = (s) => `data-dk="${s}"`;
const DECK_HELP = {
  def: 'Type a number in any box or drag a slider — the drawing, capacity and checks update straight away. The amber value stays put when the boom telescopes.',
  lift: 'Lifts — one tab per pick. Add a tab for every load on this job (each lift can use its own crane).',
  crane: 'The crane doing this lift. Tap to change the model, load chart, counterweight, outriggers — or add a second crane.',
  load: 'Load weight in tonnes — just the item itself. The hook block, tackles and contingency are added for you.',
  empty: 'Empty hook — shows the crane with nothing on the hook, e.g. for a set-up or reach check.',
  cont: 'Contingency — a safety margin on the load weight in case it is heavier than stated (10–20 % is common). Tap to change or switch it off.',
  daf: 'DAF (dynamic factor) — a lift bounces a little when the hoist starts and stops; DAF adds that extra pull. Tap to auto-calculate or type your own.',
  tackles: 'Tackles — everything between the hook and the load: shackles, slings, spreader beams, chain blocks. Name them, set length and weight.',
  acc: 'Extra parts this crane can carry. Switch one on and it is drawn on the plan and used in the checks.',
  L: 'Boom length — how far the boom is telescoped out. Type a length or drag the slider.',
  A: 'Boom angle — how steep the boom is: 0° is flat, about 84° is nearly straight up.',
  R: 'Radius — how far the hook is from the centre of the crane. The further out, the less the crane can lift.',
  H: 'Tip height — how high the top of the boom is above the ground.',
  hold: 'Hold — keeps this value fixed while you change the boom length. The held value glows amber.',
  step: 'Nudge the value down or up a little.',
  secs: 'Push each telescopic section out by hand — only for special telescoping sequences. Most lifts do not need this.'
};
const hp = (k) => `data-help="${k}"`;

function dialHTML(key, title, unit, extra = '') {
  const lock = key === 'L' ? '' : `<button type="button" class="dl-lock" ${dk('drive')} ${hp('hold')} data-v="${{ A: 'angle', R: 'radius', H: 'height' }[key]}" title="Keep this value fixed when the boom telescopes" aria-label="Hold the ${h(title.toLowerCase())}">${ico('lock', 11)}<span>Hold</span></button>`;
  return `<div class="dial" data-dial="${key}" ${hp(key)}><div class="dl-h"><span>${h(title)}</span>${extra}${lock}</div>
    <div class="dl-v"><input class="dl-in" data-dial="${key}" inputmode="decimal" autocomplete="off" aria-label="${h(title)} in ${unit === '°' ? 'degrees' : 'metres'}"><i>${unit}</i></div>
    <input type="range" class="rg dl-rg" data-dial="${key}"${key === 'R' ? ' id="conRange"' : ''} step="0.1" aria-label="${h(title)}">
    <div class="dl-f"><span class="dl-note" id="dlN${key}"></span><span class="dl-st" ${hp('step')}><button type="button" ${dk('step')} data-k="${key}" data-v="-1" aria-label="Decrease ${h(title.toLowerCase())}">−</button><button type="button" ${dk('step')} data-k="${key}" data-v="1" aria-label="Increase ${h(title.toLowerCase())}">+</button></span></div></div>`;
}
function renderConsole() {
  const el = $('#console'); if (!el || !state.calc) return;
  if (!Deck.bound) { bindDeck(el); Deck.bound = true; }
  const p = state.plan, li = activeLi(), l = p.loads[li], res = state.calc.loads[li]; const crane = res.crane || state.calc.crane;
  const { ch, G } = loadCol(li); const tele = res.tele || G.tele, spec = res.spec || G.spec;
  const avail = crane.acc || ['flyjib']; const jibChart = ch && ch.kind && ch.kind !== 'main' && !G.manual;
  const sig = [li, p.loads.length, (p.cranes || []).length, num(p.activeCrane), tele.locked, spec.tele, avail.join(','), jibChart, ch?.kind, Deck.secs, crane.id].join('|');
  const accOn = (k) => k === 'flyjib' ? p.attach?.type === 'fly' && !p.attach.ext : k === 'extension' ? p.attach?.type === 'fly' && !!p.attach.ext : k === 'luffing' ? p.attach?.type === 'luff' : k === 'yguy' ? !!res.acc?.yguy : !!res.acc?.[k];
  if (el.dataset.sig !== sig) {
    el.dataset.sig = sig;
    const accBtn = (k, t) => { const dis = (jibChart && (k === 'flyjib' || k === 'luffing' || k === 'extension')) || (k === 'yguy' && res.acc?.yguyAuto); return `<button type="button" data-cacc="${k}" aria-pressed="${accOn(k)}"${dis ? ' disabled title="Set by the load chart"' : ''}>${t}</button>`; };
    const multi = (p.cranes || []).length > 1;
    el.innerHTML = `<div class="deck" role="group" aria-label="Crane controls">
      <div class="dk-top">
        <div class="dk-lifts" role="tablist" aria-label="Lifts" ${hp('lift')}>${p.loads.map((x, i) => `<button type="button" role="tab" class="lchip" ${dk('lift')} data-i="${i}" aria-selected="${i === li}" aria-pressed="${i === li}" title="Lift ${i + 1}${x.name ? ' · ' + h(x.name) : ''}"><b>L${i + 1}${multi ? `<sup>C${num(x.crane) + 1}</sup>` : ''}</b><small id="lcw${i}"></small><i class="ubar" id="lcu${i}"><i></i></i></button>`).join('')}${p.loads.length < 6 ? `<button type="button" class="lchip add" ${dk('addLift')} aria-label="Add a lift" title="Add a lift">+</button>` : ''}</div>
        <button type="button" class="dk-chip dk-crane" ${dk('pop')} ${hp('crane')} data-v="crane" aria-haspopup="dialog" aria-expanded="${Deck.pop === 'crane'}"><span class="dk-ci">${multi ? 'C' + (num(p.activeCrane) + 1) : ico('crane', 15)}</span><span class="dk-ct"><b>${h(crane.model)}</b><small id="dkCraneSub"></small></span>${ico('chevD', 13)}</button>
        <label class="dk-w" ${hp('load')}><span>Load</span><input class="dl-in sm" id="dkW" inputmode="decimal" autocomplete="off" aria-label="Load weight in tonnes"><i>t</i></label>
        <button type="button" class="dk-chip tg" ${dk('empty')} ${hp('empty')} id="dkEmpty" aria-pressed="false" title="Show the hook empty — no load, hook block only">${ico('hook', 14)}Empty hook</button>
        <button type="button" class="dk-chip" ${dk('pop')} ${hp('cont')} data-v="cont" id="dkCont" aria-haspopup="dialog">Contingency <b></b></button>
        <button type="button" class="dk-chip" ${dk('pop')} ${hp('daf')} data-v="daf" id="dkDaf" aria-haspopup="dialog">DAF <b></b></button>
        <button type="button" class="dk-chip" ${dk('pop')} ${hp('tackles')} data-v="tackles" id="dkTk" aria-haspopup="dialog">Tackles <b></b></button>
        <span class="sp"></span>
        <div class="accp dk-acc" aria-label="Accessories" ${hp('acc')}>${avail.map(k => accBtn(k, { flyjib: 'Fly jib', luffing: 'Luffing jib', superlift: 'Superlift', yguy: 'Y-guy', runner: 'Runner', extension: 'Extension' }[k] || k)).join('') || '<span class="none">no accessories</span>'}</div>
      </div>
      <div class="dk-dials">
        ${dialHTML('L', 'Boom length', 'm', tele.locked ? '<span class="dl-tag">jib chart</span>' : `<button type="button" class="dl-x" ${dk('secs')} ${hp('secs')} aria-pressed="${Deck.secs}" title="Set each telescopic section by hand" aria-label="Telescopic sections by hand"><svg width="13" height="11" viewBox="0 0 13 11" aria-hidden="true"><path d="M1 10V4M4.5 10V1M8 10V5M11.5 10V2" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>Secs</button>`)}
        ${dialHTML('A', ch?.kind === 'luffing' ? 'Jib angle' : 'Boom angle', '°')}
        ${dialHTML('R', 'Radius', 'm')}
        ${dialHTML('H', 'Tip height', 'm')}
      </div>
      ${Deck.secs && !tele.locked ? `<div class="dk-secs"><div class="tele" id="teleCols">${Array.from({ length: spec.tele }, (_, i) => `<div class="tcol"><output id="tco${i}"></output><div class="ttrack" data-ti="${i}" role="slider" tabindex="0" aria-label="Telescopic section ${i + 1}" aria-valuemin="0" aria-valuemax="100"><i></i><b></b></div><label>T${i + 1}</label></div>`).join('')}</div>
        <div class="tele-l"><output class="bigv" id="teleL"></output><span>${fmt(spec.Lmin, 1)} – ${fmt(spec.Lmax, 1)} m · ${spec.tele} sections</span></div>
        <div class="tpre"><button type="button" data-act="telePre" data-v="0" title="Retract all sections">Ret</button><button type="button" data-act="telePre" data-v="even" title="Even telescoping">Even</button><button type="button" data-act="telePre" data-v="seq" title="One section after the other">Seq</button><button type="button" data-act="telePre" data-v="1" title="All sections fully out">Full</button></div>
        <button type="button" class="btn ghost sm" data-act="teleMode" data-v="auto" title="Back to automatic even telescoping">Back to even</button></div>` : ''}
      <div class="dk-help" id="dkHelp"><span class="dk-hi">?</span><span id="dkHelpT">${DECK_HELP.def}</span></div>
    </div>`;
    if (Deck.secs) bindTeleTracks(el);
    const top = $('.dk-top', el); if (top) { const f = () => top.classList.toggle('end', top.scrollLeft + top.clientWidth >= top.scrollWidth - 4); top.addEventListener('scroll', f, { passive: true }); requestAnimationFrame(f); }
  }
  deckValues();
}
function heightRange(li) {
  const { crane, G } = loadCol(li); const [a0, a1] = angleRange(G.gChart);
  const y0 = tipFromAngle(crane, G.gChart, G.gCol, Math.max(a0, 1), G.boomOv).y, y1 = tipFromAngle(crane, G.gChart, G.gCol, Math.min(a1, 84), G.boomOv).y;
  return [Math.max(1, Math.floor(Math.min(y0, y1))), Math.ceil(Math.max(y0, y1))];
}
function deckValues() {
  const el = $('#console'); if (!el || !state.calc) return;
  const p = state.plan, li = activeLi(), l = p.loads[li], res = state.calc.loads[li]; const crane = res.crane || state.calc.crane;
  const { ch, G } = loadCol(li); const tele = res.tele || G.tele, spec = res.spec || G.spec; const g = res.geo || {};
  const by = l.by === 'angle' ? 'A' : l.by === 'height' ? 'H' : 'R';
  const [rmin, rmax] = radiusRange(li), [amin, amax] = angleRange(ch), [hmin, hmax] = heightRange(li);
  const ang = g.tip ? currentAngle(res, ch) : null;
  const vals = { L: [tele.L, spec.Lmin, spec.Lmax, 2], A: [ang, amin, amax, 1], R: [res.R, Math.min(rmin, res.R || rmin), Math.max(rmax, res.R || rmax), 2], H: [res.tipY, Math.min(hmin, res.tipY ?? hmin), Math.max(hmax, res.tipY ?? hmax), 2] };
  for (const [k, [v, mn, mx, dp]] of Object.entries(vals)) {
    const d = $(`.dial[data-dial="${k}"]`, el); if (!d) continue;
    d.classList.toggle('drv', k === by); d.classList.toggle('bad', k !== 'L' && !g.tip);
    const lk = $('.dl-lock', d); if (lk) { lk.setAttribute('aria-pressed', String(k === by)); const sp = lk.querySelector('span'); if (sp) sp.textContent = k === by ? 'Held' : 'Hold'; }
    const inp = $('.dl-in', d); if (inp && inp !== document.activeElement) inp.value = v != null && isFinite(v) ? (+v).toFixed(dp) : '—';
    const rg = $('.dl-rg', d); if (rg) { rg.min = (+mn).toFixed(1); rg.max = (+mx).toFixed(1); if (rg !== document.activeElement && v != null) rg.value = v; rg.disabled = k === 'L' && tele.locked; }
  }
  syncRanges(el);
  const nL = $('#dlNL'); if (nL) nL.textContent = tele.locked ? `fixed by the jib chart` : `${fmt(spec.Lmin, 1)}–${fmt(spec.Lmax, 1)} · ${tele.mode === 'manual' ? 'by hand' : res.capInfo?.between ? 'chart ' + res.capInfo.between.join('/') : G.col ? 'chart ' + colName(G.col) : 'auto'}`;
  const nA = $('#dlNA'); if (nA) nA.textContent = g.tip ? `max ${amax}°` : 'out of reach';
  const nR = $('#dlNR'); if (nR) nR.textContent = res.cap != null ? `cap ${res.cap.toFixed(2)} t` : 'no capacity';
  const nH = $('#dlNH'); if (nH) nH.textContent = res.hookY != null ? `hook ${fmt(res.hookY, 1)} m` : '';
  const w = $('#dkW'); if (w && w !== document.activeElement) w.value = num(l.w).toFixed(2).replace(/\.?0+$/, '') || '0';
  if (w) w.disabled = !!l.empty;
  const em = $('#dkEmpty'); if (em) em.setAttribute('aria-pressed', String(!!l.empty));
  const cs = $('#dkCraneSub'); if (cs) { const cw = num(p.cwt !== '' && p.cwt != null ? p.cwt : (res.chartDef?.cwt ?? crane.cwt)); cs.textContent = `${fmt(cw, 1)} t cwt${res.chartDef?.config ? ' · ' + res.chartDef.config : ''}`; }
  const ct = $('#dkCont'); if (ct) { const on = l.contOn !== false && num(l.cont) > 0 && !l.empty; ct.setAttribute('aria-pressed', String(on)); ct.querySelector('b').textContent = on ? num(l.cont) + '%' : 'off'; }
  const df = $('#dkDaf'); if (df) { df.setAttribute('aria-pressed', String(!!res.daf)); df.querySelector('b').textContent = res.daf ? res.daf.toFixed(3).replace(/0$/, '') : 'off'; }
  const tk = $('#dkTk'); if (tk) { const n = (l.tackles || []).filter(t => num(t.L) > 0 || num(t.w) > 0).length; tk.setAttribute('aria-pressed', String(n > 0)); tk.querySelector('b').textContent = n ? `${n} · ${fmt(res.tk, 2)} t` : `${fmt(res.tk, 2)} t`; }
  p.loads.forEach((x, i) => { const rr = state.calc.loads[i]; const wv = $('#lcw' + i); if (wv) wv.textContent = rr?.util != null ? rr.util.toFixed(0) + '%' : '—'; const u = $('#lcu' + i); if (u) { u.className = 'ubar ' + utilCls(rr); u.firstElementChild.style.width = Math.min(100, rr?.util || 0) + '%'; } });
  const tc = $('#teleCols'); if (tc) tc.classList.toggle('auto', tele.mode !== 'manual');
  tele.fr.forEach((f, i) => { const t = $(`.ttrack[data-ti="${i}"]`, el); if (t) { t.style.setProperty('--f', (f * 100).toFixed(1) + '%'); t.style.setProperty('--fv', f.toFixed(3)); t.setAttribute('aria-valuenow', Math.round(f * 100)); } const o = $('#tco' + i); if (o) o.textContent = Math.round(f * 100); });
  const tl = $('#teleL'); if (tl) tl.innerHTML = `${fmt(tele.L, 2)}<small>m</small>`;
  const accOn = (k) => k === 'flyjib' ? p.attach?.type === 'fly' && !p.attach.ext : k === 'extension' ? p.attach?.type === 'fly' && !!p.attach.ext : k === 'luffing' ? p.attach?.type === 'luff' : k === 'yguy' ? !!res.acc?.yguy : !!res.acc?.[k];
  $$('[data-cacc]', el).forEach(b => b.setAttribute('aria-pressed', String(accOn(b.dataset.cacc))));
  const pt = $('#dkPopTot'); if (pt) pt.innerHTML = popTotals();
  tackleSync();
}
// ---------- dial commits ----------
function setDial(k, v, o = {}) {
  const p = state.plan, li = activeLi(), l = p.loads[li]; if (!isFinite(v)) return;
  const res = state.calc?.loads?.[li];
  if (k === 'L') {
    if (res?.tele?.locked) { toast('This jib chart fixes the boom length'); return; }
    const { crane } = curChart(); const sp = boomSpec(crane, chartLengths(crane)); const L = Math.max(sp.Lmin, Math.min(sp.Lmax, v));
    if (!o.live && Math.abs(L - v) > 0.01) toast(`Boom limited to the real range ${fmt(sp.Lmin, 1)}–${fmt(sp.Lmax, 1)} m`);
    p.tele = { mode: 'auto', fr: [] }; setBoomLength(L);
  } else if (k === 'A') { const [a0, a1] = angleRange(loadCol(li).ch); l.by = 'angle'; l.angle = Math.round(Math.max(a0, Math.min(a1, v)) * 10) / 10; }
  else if (k === 'R') { l.by = 'radius'; l.R = r2(Math.max(0.5, v)); }
  else if (k === 'H') { l.by = 'height'; l.tipH = r2(Math.max(1, v)); }
  refresh(true); markDirty();
  if (!o.live) { syncDrawer(); if (state.sec === 'crane' || state.sec === 'lift') renderDrawer(); }
}
function holdDial(mode) { // keep the current value of this quantity when the boom telescopes
  const p = state.plan, li = activeLi(), l = p.loads[li], res = state.calc?.loads?.[li]; if (!res?.geo?.tip) return;
  const { ch } = loadCol(li);
  if (mode === 'angle') l.angle = Math.round(currentAngle(res, ch) * 10) / 10; else if (mode === 'height') l.tipH = r2(res.tipY); else l.R = r2(res.R);
  l.by = mode; refresh(true); markDirty(); toast({ angle: 'Boom angle held — telescoping changes the radius', height: 'Tip height held — telescoping changes the radius', radius: 'Radius held — telescoping changes the angle' }[mode]);
}
// ---------- popovers (crane, contingency, DAF, tackles) ----------
function popTotals() {
  const li = activeLi(), res = state.calc?.loads?.[li]; if (!res) return '';
  return `<span>On the hook <b>${fmt(res.total, 2)} t</b></span>${res.daf ? `<span>design <b>${fmt(res.design, 2)} t</b></span>` : ''}<span>chart <b>${res.cap != null ? fmt(res.cap, 2) + ' t' : '—'}</b></span><span class="${utilCls(res)}">${res.util != null ? res.util.toFixed(1) + '%' : '—'}</span>${res.stack ? `<span>rig height <b>${fmt(res.stack.H, 2)} m</b></span>` : ''}`;
}
const tkCalc = (c) => c ? (c.type === 'sling' ? `${Math.round(c.ang)}°${c.T != null ? ' · ' + c.T.toFixed(1) + ' t/leg' : ''}` : `↕ ${fmt(c.v, 2)} m`) : '';
function tackleSync() { // refresh the computed column of every tackle row in place (drawer + popover) — typing never loses focus
  const li = activeLi(), it = state.calc?.loads?.[li]?.stack?.items || [];
  $$('.tk-c[data-j]').forEach(el => { el.textContent = tkCalc(it.find(x => x.j === +el.dataset.j)); });
}
function tackleRows(li) {
  const l = state.plan.loads[li]; const res = state.calc?.loads?.[li]; const it = res?.stack?.items || [];
  const opts = Object.entries(TACKLE_TYPES);
  return (l.tackles || []).map((t, j) => { const c = it.find(x => x.j === j); const pre = `loads.${li}.tackles.${j}.`;
    return `<div class="tk-row"><span class="tk-n">${j + 1}</span>
      <input type="text" class="tk-name" data-k="${pre}name" value="${h(t.name || '')}" placeholder="${h(TACKLE_TYPES[t.type] || 'Name')}" aria-label="Tackle ${j + 1} name">
      <select class="tk-type" data-k="${pre}type" data-re-pop="1" aria-label="Tackle ${j + 1} type">${opts.map(([k, lab]) => `<option value="${k}"${k === t.type ? ' selected' : ''}>${h(lab)}</option>`).join('')}</select>
      <span class="fi tk-L"><input type="text" data-k="${pre}L" value="${h(t.L ?? '')}" inputmode="decimal" aria-label="Tackle ${j + 1} length"><i>${t.type === 'spreader' || t.type === 'beam' ? 'm span' : 'm'}</i></span>
      <span class="fi tk-w"><input type="text" data-k="${pre}w" value="${h(t.w ?? '')}" inputmode="decimal" aria-label="Tackle ${j + 1} weight"><i>t</i></span>
      ${t.type === 'sling' ? `<span class="fi tk-legs"><select data-k="${pre}legs" aria-label="Legs">${[1, 2, 3, 4].map(n => `<option value="${n}"${num(t.legs, 2) === n ? ' selected' : ''}>${n} leg${n > 1 ? 's' : ''}</option>`).join('')}</select></span>` : '<span class="tk-legs"></span>'}
      <span class="tk-c" data-j="${j}">${tkCalc(c)}</span>
      <span class="tk-a"><button type="button" class="tk-b" ${dk('tkUp')} data-j="${j}" aria-label="Move up" title="Move up"${j ? '' : ' disabled'}>↑</button><button type="button" class="tk-b" ${dk('tkSave')} data-j="${j}" title="Save to my tackle library" aria-label="Save to library">${ico('plus', 12)}</button><button type="button" class="tk-b" ${dk('tkDel')} data-j="${j}" aria-label="Remove tackle ${j + 1}">${ico('x', 12)}</button></span></div>`; }).join('');
}
function popHTML(kind) {
  const p = state.plan, li = activeLi(), l = p.loads[li], pre = `loads.${li}.`;
  const head = (t, sub) => `<div class="pop-h"><div><b>${h(t)}</b>${sub ? `<small>${sub}</small>` : ''}</div><button type="button" class="tx" ${dk('popClose')} aria-label="Close">${ico('x', 14)}</button></div>`;
  const why = (t) => `<p class="pop-why">${t}</p>`;
  if (kind === 'cont') return head('Contingency', `Lift ${li + 1}`) + why('A safety margin added to the load weight, in case the load is heavier than the paperwork says. 10–20 % is common.') + `<label class="check"><input type="checkbox" class="tog" data-k="${pre}contOn" data-bool="1"${l.contOn !== false ? ' checked' : ''} aria-label="Apply contingency"><span>Add a contingency on the load weight</span></label>
    <div class="row"><label class="f"><span class="fl">Contingency</span><span class="fi"><input type="text" data-k="${pre}cont" value="${h(l.cont ?? '')}" inputmode="decimal" aria-label="Contingency percent"><i>%</i></span></label><div class="seg sm">${[5, 10, 15, 20, 25].map(v => `<button type="button" ${dk('contSet')} data-v="${v}" aria-pressed="${num(l.cont) === v}">${v}</button>`).join('')}</div></div>
    <p class="hint">Off → the CONTINGENCY row leaves the sheet and the total drops to load + hook + tackles.</p><div class="pop-tot" id="dkPopTot">${popTotals()}</div>`;
  if (kind === 'daf') { const D = l.daf || {}; const auto = D.mode !== 'manual';
    return head('Dynamic amplification factor (DAF)', `Lift ${li + 1}`) + why('When the hoist starts or stops, the load bounces a little and pulls harder than its weight. DAF adds that extra pull so the check uses the real peak. Auto works it out for you from EN 13001-2 — or type your own value.') + `<label class="check"><input type="checkbox" class="tog" data-k="${pre}daf.on" data-bool="1"${D.on ? ' checked' : ''} aria-label="Apply DAF"><span>Apply a DAF to the lift weight</span></label>
      <div class="seg" role="radiogroup" aria-label="DAF source"><button type="button" role="radio" ${dk('dafMode')} data-v="auto" aria-checked="${auto}">Auto · EN 13001-2</button><button type="button" role="radio" ${dk('dafMode')} data-v="manual" aria-checked="${!auto}">Manual</button></div>
      ${auto ? `<div class="row"><label class="f"><span class="fl">Hoisting class</span><select data-k="${pre}daf.cls" aria-label="Hoisting class">${['HC1', 'HC2', 'HC3', 'HC4'].map(c => `<option${(D.cls || 'HC1') === c ? ' selected' : ''}>${c}</option>`).join('')}</select></label><label class="f"><span class="fl">Hoist speed</span><span class="fi"><input type="text" data-k="${pre}daf.vh" value="${h(D.vh ?? 0.1)}" inputmode="decimal" aria-label="Steady hoisting speed"><i>m/s</i></span></label></div>
        <p class="hint">φ₂ = φ₂,min + β₂·v<sub>h</sub> — HC1 1.05 + 0.17v, HC2 1.10 + 0.34v, HC3 1.15 + 0.51v, HC4 1.20 + 0.68v.</p>`
        : `<div class="row"><label class="f"><span class="fl">DAF</span><span class="fi"><input type="text" data-k="${pre}daf.v" value="${h(D.v ?? 1.1)}" inputmode="decimal" aria-label="DAF value"><i>×</i></span></label><div class="seg sm">${[1.05, 1.1, 1.15, 1.2, 1.3].map(v => `<button type="button" ${dk('dafSet')} data-v="${v}" aria-pressed="${num(D.v) === v}">${v}</button>`).join('')}</div></div>`}
      <p class="hint">With a DAF the utilisation is worked on the design load (total × DAF) and DAF + DESIGN LIFT WEIGHT print on the sheet.</p><div class="pop-tot" id="dkPopTot">${popTotals()}</div>`; }
  if (kind === 'tackles') return head('Lifting tackles', `Lift ${li + 1} · top of the list hangs from the hook`) + why('Everything between the hook and the load — shackles, slings, spreader beams, chain blocks. Give each a name, length and weight: lengths set how high the hook must be, weights are added to the lift. Save ones you use a lot to your library.') + `<div class="tk-list${isMobile() ? ' tk-card' : ''}">${tackleRows(li) || '<p class="hint">No tackles yet — add slings, shackles, a spreader… Lengths set the rigging height on the drawing, weights add to the lift.</p>'}</div>
    <div class="actions"><button type="button" class="btn sm" ${dk('tkAdd')}>${ico('plus', 13)}Add tackle</button><label class="tk-lib"><select ${dk('tkLib')} aria-label="Add from my tackle library"><option value="">From library…</option>${tackleLib().map((t, i) => `<option value="${i}">${h(t.name)}${t.L ? ' · ' + t.L + ' m' : ''}${t.w ? ' · ' + t.w + ' t' : ''}</option>`).join('')}</select></label>${(l.tackles || []).length ? `<button type="button" class="btn ghost sm" ${dk('tkClear')}>Clear</button>` : ''}</div>
    <div class="pop-tot" id="dkPopTot">${popTotals()}</div>`;
  if (kind === 'crane') {
    const rigs = p.cranes || [{}]; const act = num(p.activeCrane, 0); const { crane, ch, parsed } = curChart();
    const list = rigs.map((r, i) => { const c = cranes().find(x => x.id === (i === act ? p.craneId : r.craneId)) || crane; return `<div class="rig${i === act ? ' on' : ''}"><button type="button" ${dk('rig')} data-i="${i}" aria-pressed="${i === act}"><b>C${i + 1}</b><span>${h(c.model)}</span><small>${c.cls} t</small></button>${rigs.length > 1 ? `<button type="button" class="tx" ${dk('rigDel')} data-i="${i}" aria-label="Remove crane ${i + 1}">${ico('x', 12)}</button>` : ''}</div>`; }).join('');
    const colOpts = parsed ? parsed.cols.map((c, i) => `<option value="${i}"${i === +p.colIdx ? ' selected' : ''}>${h(String(c.head || c.L))}${ch.kind === 'main' ? ' m' : '°'}${c.label ? ' · ' + h(c.label) : ''}</option>`).join('') : '';
    return head('Crane', `Lift ${li + 1} uses crane ${act + 1}`) + why('Pick the machine, then its load chart (the page from the crane\'s manual that says what it can lift). Two cranes on the job? Add a crane — each lift tab then uses its own.') + `<div class="rigs">${list}<button type="button" class="btn ghost sm" ${dk('rigAdd')}>${ico('plus', 13)}Add a crane</button></div>
      ${cranePicker(crane.id)}
      <div class="row">${chartSelect(crane.charts || [], +p.chartIdx)}${parsed ? `<label class="f"><span class="fl">${ch.kind === 'main' ? 'Chart boom' : ch.kind === 'luffing' ? 'Main boom angle' : 'Fly-jib offset'}</span><select data-k="colIdx" data-num="1" data-re-pop="1">${colOpts}</select></label>` : ''}</div>
      <div class="row r3">${F.num('cwt', 'Counterweight', 't', { ph: String(ch?.cwt ?? crane.cwt ?? '') })}${F.text('outriggerTxt', 'Outriggers', { ph: ch?.outrigger || crane.outrigger })}${F.num('falls', 'Falls', '', { ph: String(parsed?.cols[+p.colIdx]?.falls || '') })}</div>`;
  }
  return '';
}
function openPop(kind) {
  const st = $('.stage'); if (!st || !kind) return;
  let el = $('#dkPop'); if (!el) { el = document.createElement('div'); el.id = 'dkPop'; el.className = 'dk-pop'; el.setAttribute('role', 'dialog'); st.appendChild(el); }
  Deck.pop = kind; el.dataset.kind = kind; el.hidden = false; el.style.bottom = (($('#console')?.offsetHeight || 150) + 8) + 'px'; el.setAttribute('aria-label', { crane: 'Crane', cont: 'Contingency', daf: 'DAF', tackles: 'Lifting tackles' }[kind] || kind);
  const sc = el.querySelector('.tk-list')?.scrollTop || 0;
  el.innerHTML = popHTML(kind); syncRanges(el); const tl = el.querySelector('.tk-list'); if (tl) tl.scrollTop = sc;
  $$('#console [data-dk="pop"]').forEach(b => b.setAttribute('aria-expanded', String(b.dataset.v === kind)));
}
function closePop() { const el = $('#dkPop'); Deck.pop = null; if (el) { el.hidden = true; el.innerHTML = ''; } $$('#console [data-dk="pop"]').forEach(b => b.setAttribute('aria-expanded', 'false')); }
function togglePop(kind) { if (Deck.pop === kind) closePop(); else openPop(kind); }
function deckHelp(k) { const t = $('#dkHelpT'); if (t) { const v = DECK_HELP[k] || DECK_HELP.def; if (t.textContent !== v) t.textContent = v; } }
function bindDeck(el) {
  el.addEventListener('pointerover', (e) => { const x = e.target.closest('[data-help]'); deckHelp(x ? x.dataset.help : 'def'); });
  el.addEventListener('pointerleave', () => { const f = document.activeElement?.closest?.('#console [data-help]'); deckHelp(f ? f.dataset.help : 'def'); });
  el.addEventListener('focusin', (e) => { const x = e.target.closest('[data-help]'); if (x) deckHelp(x.dataset.help); });
  el.addEventListener('input', (e) => {
    const t = e.target;
    if (t.classList.contains('dl-rg')) { setDial(t.dataset.dial, +t.value, { live: true }); }
  });
  el.addEventListener('change', (e) => {
    const t = e.target;
    if (t.classList.contains('dl-rg')) { syncDrawer(); if (state.sec === 'crane' || state.sec === 'lift') renderDrawer(); return; }
    if (t.classList.contains('dl-in') && t.dataset.dial) { const v = num(String(t.value).replace(/[^\d.,-]/g, ''), NaN); if (isFinite(v)) setDial(t.dataset.dial, v); else deckValues(); return; }
    if (t.id === 'dkW') { const l = state.plan.loads[activeLi()]; const v = num(t.value, NaN); if (isFinite(v) && v >= 0) { l.w = r2(v); refresh(true); syncDrawer(); markDirty(); } else deckValues(); return; }
  });
  el.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t.classList?.contains('dl-in') && (e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); if (e.key === 'Escape') deckValues(); t.blur(); }
    if (t.classList?.contains('dl-in') && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && t.dataset.dial) { e.preventDefault(); const v = num(t.value, NaN); if (isFinite(v)) setDial(t.dataset.dial, v + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 5 : t.dataset.dial === 'A' ? 0.5 : 0.1)); }
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dk]'); if (!b) return;
    const a = b.dataset.dk, p = state.plan, li = activeLi(), l = p.loads[li];
    if (a === 'lift') { selectLoad(+b.dataset.i); renderDrawer(); refresh(true); if (Deck.pop) openPop(Deck.pop); }
    else if (a === 'addLift') { const c = curCrane(); p.loads.push({ ...clone(l), name: '', colIdx: '', capOverride: '', hb: c?.hookBlock ?? 1, notes: '' }); selectLoad(p.loads.length - 1); renderDrawer(); refresh(true); markDirty(); toast(`Lift ${p.loads.length} added — set its radius and weight`); }
    else if (a === 'pop') togglePop(b.dataset.v);
    else if (a === 'empty') { l.empty = !l.empty; refresh(true); syncDrawer(); markDirty(); toast(l.empty ? 'Hook empty — no load on the drawing or in the total' : 'Load back on the hook'); }
    else if (a === 'secs') { Deck.secs = !Deck.secs; renderConsole(); }
    else if (a === 'drive') holdDial(b.dataset.v);
    else if (a === 'step') { const k = b.dataset.k, d = +b.dataset.v; const res = state.calc.loads[li]; const cur = { L: res.tele?.L, A: res.geo?.tip ? currentAngle(res, loadCol(li).ch) : null, R: res.R, H: res.tipY }[k]; if (cur != null) setDial(k, cur + d * (k === 'A' ? 0.5 : k === 'L' ? 0.5 : 0.5)); }
  });
}
// shared tackle / contingency / DAF actions — used by the popover and the Lift drawer
function liftAct(a, b) {
  const p = state.plan, li = activeLi(), l = p.loads[li];
  if (a === 'contSet') { l.cont = +b.dataset.v; l.contOn = true; }
  else if (a === 'dafMode') { l.daf = { ...(l.daf || {}), mode: b.dataset.v, on: true }; }
  else if (a === 'dafSet') { l.daf = { ...(l.daf || {}), mode: 'manual', v: +b.dataset.v, on: true }; }
  else if (a === 'tkAdd') { l.tackles = l.tackles || []; l.tackles.push({ name: '', type: l.tackles.length ? 'sling' : 'shackle', L: l.tackles.length ? 6 : 0.4, w: 0, legs: 2 }); }
  else if (a === 'tkDel') { l.tackles.splice(+b.dataset.j, 1); }
  else if (a === 'tkUp') { const j = +b.dataset.j; if (j > 0) [l.tackles[j - 1], l.tackles[j]] = [l.tackles[j], l.tackles[j - 1]]; }
  else if (a === 'tkClear') { l.tackles = []; }
  else if (a === 'tkSave') { const t = l.tackles[+b.dataset.j]; if (t) { const lib = [...tackleLib()]; lib.push({ name: t.name || TACKLE_TYPES[t.type], type: t.type, L: num(t.L), w: num(t.w), legs: num(t.legs, 1) }); state.settings.tackleLib = lib; saveSettings(); toast('Saved to your tackle library'); } return false; }
  else return false;
  refresh(true); markDirty(); return true;
}
function tackleFromLib(sel) { const l = state.plan.loads[activeLi()]; const src = tackleLib()[+sel.value]; if (!src) return false; l.tackles = l.tackles || []; l.tackles.push({ ...src }); refresh(true); markDirty(); return true; }
// popover interactions live on the stage (the popover is outside the console)
function bindPop() {
  const st = $('.stage'); if (!st || st.dataset.popBound) return; st.dataset.popBound = '1';
  st.addEventListener('click', (e) => {
    const ga = e.target.closest('#dkPop [data-act]'); if (ga && ['setCrane', 'craneMake'].includes(ga.dataset.act)) { setTimeout(() => openPop(Deck.pop), 0); return; }
    const b = e.target.closest('#dkPop [data-dk]'); if (!b) return;
    const a = b.dataset.dk, p = state.plan, li = activeLi();
    if (a === 'popClose') { closePop(); return; }
    if (a === 'rig') { switchRig(+b.dataset.i); p.loads[li].crane = +b.dataset.i; renderDrawer(); refresh(true); markDirty(); openPop('crane'); return; }
    if (a === 'rigAdd') { addRig(); renderDrawer(); refresh(true); markDirty(); openPop('crane'); toast(`Crane ${p.cranes.length} added for lift ${li + 1} — pick its model below`); return; }
    if (a === 'rigDel') { removeRig(+b.dataset.i); renderDrawer(); refresh(true); markDirty(); openPop('crane'); return; }
    if (liftAct(a, b)) { syncDrawer(); if (state.sec === 'lift') renderDrawer(); openPop(Deck.pop); }
  });
  st.addEventListener('change', (e) => {
    const t = e.target; if (!t.closest('#dkPop')) return;
    if (t.dataset.dk === 'tkLib' && t.value !== '') { if (tackleFromLib(t)) { if (state.sec === 'lift') renderDrawer(); openPop('tackles'); } return; }
    if (t.dataset.rePop || t.dataset.k === 'chartIdx' || /\.(contOn|daf\.on)$/.test(t.dataset.k || '')) setTimeout(() => { openPop(Deck.pop); if (state.sec === 'lift') renderDrawer(); }, 0);
  });
  const dr = $('#drBody');
  if (dr) {
    dr.addEventListener('click', (e) => { const b = e.target.closest('[data-dk]'); if (!b || b.tagName === 'SELECT') return; if (liftAct(b.dataset.dk, b)) { renderDrawer(); if (Deck.pop) openPop(Deck.pop); } });
    dr.addEventListener('change', (e) => { const t = e.target;
      if (t.dataset.dk === 'tkLib' && t.value !== '') { if (tackleFromLib(t)) { renderDrawer(); if (Deck.pop) openPop(Deck.pop); } return; }
      if (t.dataset.rePop) setTimeout(renderDrawer, 0); });
  }
  document.addEventListener('pointerdown', (e) => { if (!Deck.pop) return; if (e.target.closest('#dkPop, #console [data-dk="pop"], .menu-pop, #tour, .toast')) return; closePop(); }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && Deck.pop) { closePop(); } });
}
