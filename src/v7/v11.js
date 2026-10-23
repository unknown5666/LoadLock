// ===== v11 (UI): set-up driven load chart, slew to any degree, cab controls (drive the crane with two sticks and a live LMI) =====

// ---------- set-up → chart (engine in duty.js) ----------
const chartShort = (ch) => ch ? String(ch.name || '').replace(/\s*·\s*p\.[\d,\s]+$/, '') : '';
function dutyNowL() { const r = state.calc?.loads?.[activeLi()]; return r?.tele?.L ?? r?.geo?.L ?? null; }
// find the maker's chart for what is rigged and switch to it; the safe load follows. o.L = boom length wanted, o.quiet = no toast
function applyDuty(o = {}) {
  const p = state.plan, li = activeLi(), l = p.loads[li], crane = curCrane(); if (!crane) return null;
  const before = state.calc?.loads?.[li]; const cap0 = before?.cap; const L = num(o.L ?? dutyNowL() ?? boomSpec(crane, chartLengths(crane)).Lmin);
  const d = resolveDuty(p, crane, { L, side: sideOfLoad(l) });
  p.chartIdx = d.chartIdx; p.colIdx = d.colIdx; p.loads.forEach(x => { x.colIdx = ''; });
  p.boomOverride = d.chartIdx < 0 ? (L > 0 ? r2(L) : '') : d.boomOverride;
  if (d.kind !== 'main') { if (p.tele?.mode === 'manual') p.tele = { mode: 'auto', fr: [] }; if (d.chartIdx >= 0) { if (d.jibLen != null) p.attach.jibLen = d.jibLen; if (d.offset != null) p.attach.offset = d.offset; if (d.boomAngle != null) p.attach.boomAngle = d.boomAngle; } }
  if (Scene.views) Scene.views.elev = null; if (state.twin && !o.live) state.twin.reframe();
  if (o.live) { markDirty(); histMark(); refresh(true); } else commit({ sheet: true });
  const after = state.calc?.loads?.[li];
  if (!o.quiet) {
    const ch = d.chartIdx >= 0 ? crane.charts[d.chartIdx] : null; const snap = d.snapped || {};
    const moved = [snap.L && `boom ${fmt(snap.L[1], 1)} m`, snap.jibLen && `jib ${fmt(snap.jibLen[1], 1)} m`, snap.offset && `offset ${fmt(snap.offset[1], 0)}°`, snap.boomAngle && `boom at ${fmt(snap.boomAngle[1], 0)}°`].filter(Boolean);
    const capTxt = after?.cap != null ? `can lift ${fmt(after.cap, 1)} t` + (cap0 != null && Math.abs(cap0 - after.cap) > 0.005 ? ` (was ${fmt(cap0, 1)} t)` : '') : 'no capacity';
    toast(ch ? `${chartShort(ch)} — ${capTxt}${moved.length ? ' · set to the charted ' + moved.join(', ') : ''}` : (d.why || after?.dutyWhy || 'No chart for this set-up'));
  }
  return d;
}
// the "Set-up on the crane" group at the top of the Crane sheet
function dutyGroup(crane, r) {
  const p = state.plan; const L = num(dutyNowL(), 0); const op = dutyOptions(p, crane, L); const want = op.want; const ch = crane.charts?.[+p.chartIdx];
  const fitted = dutyFitted(p, crane); const at = p.attach || {}; const av = crane.acc || [];
  const chip = (sa, v, label, on, extra = '') => `<button type="button" class="chip tap" data-sa="${sa}" data-v="${h(v)}" aria-pressed="${!!on}"${extra}>${h(label)}</button>`;
  const row = (title, sub, inner) => `<div class="it stack"><span class="lb"><b>${h(title)}</b>${sub ? `<small>${sub}</small>` : ''}</span><div class="chips" style="margin-top:8px">${inner}</div></div>`;
  const capTxt = r?.cap != null ? `${fmt(r.cap, 1)} t` : '—';
  let out = `<div class="duty-card ${r?.cap == null ? 'none' : ''}"><div class="dc-l"><span class="k">Crane can lift here</span><span class="v num">${capTxt}</span><span class="s">at ${fmt(r?.R, 1)} m reach · boom ${fmt(L, 1)} m</span></div>
    <div class="dc-r"><span class="k">Chart in use</span><b>${ch ? h(chartShort(ch)) : 'None for this set-up'}</b><small>${ch ? h(ch.source || '') + (ch.verify ? ' · <span class="w">check against the maker</span>' : '') : h(r?.dutyWhy || r?.capInfo?.why || '')}</small></div></div>`;
  let rows = '';
  const cws = op.cwts; if (cws.length) rows += row('Counterweight', fitted != null ? `${fmt(fitted, 1)} t on the crane${cws.includes(fitted) ? '' : ' — the chart for the next lighter counterweight is used'}` : 'Pick what is fitted', cws.map(v => chip('dutyCwt', v, fmt(v, 1) + ' t', fitted != null && Math.abs(v - fitted) < 1e-6)).join(''));
  if (op.has.yguy || av.includes('yguy')) rows += Fx.swRaw('data-acc="yguy"', 'Y-guying', !!want.yguy, { sub: op.has.yguy ? 'Guy ropes over the boom — longer booms lift more. The guyed chart is used.' : 'No guyed chart in the library for this crane' });
  const jibs = [['none', 'Boom only', true], ['fly', 'Fly jib', op.has.fly || av.includes('flyjib')], ['luff', 'Luffing jib', op.has.luff || av.includes('luffing')]].filter(x => x[2]);
  if (jibs.length > 1) rows += row('On the boom head', at.type === 'fly' ? (op.has.fly ? 'Fixed lattice / folding jib — the jib chart is used' : 'No fly-jib chart in the library — type the jib capacity below') : at.type === 'luff' ? (op.has.luff ? 'Luffing lattice jib — the luffing chart is used' : 'No luffing-jib chart in the library') : 'Telescopic boom only', jibs.map(([k, t]) => chip('dutyJib', k, t, (at.type || 'none') === k)).join(''));
  if (want.kind !== 'main' && op.mainLs.length) {
    rows += row('Boom length', 'Jib charts are printed for these boom lengths', op.mainLs.map(v => chip('dutyMain', v, fmt(v, 1) + ' m', Math.abs(v - L) < 0.06)).join(''));
    if (op.jibLs.length) rows += row('Jib length', '', op.jibLs.map(v => chip('dutyJibL', v, fmt(v, 1) + ' m', Math.abs(v - num(at.jibLen)) < 0.06)).join(''));
    if (op.cols.length) rows += row(want.kind === 'fixedjib' ? 'Jib offset' : 'Main boom angle', want.kind === 'fixedjib' ? 'How far the jib is bent down from the boom line' : 'The main boom stays at this angle; the jib luffs', op.cols.map(v => chip('dutyCol', v, fmt(v, 0) + '°', Math.abs(v - (want.kind === 'fixedjib' ? num(at.offset) : num(at.boomAngle))) < 0.06)).join(''));
  } else if (want.kind !== 'main') rows += Fx.num('attach.jibLen', 'Jib length', 'm') + (want.kind === 'fixedjib' ? Fx.num('attach.offset', 'Offset', '°') : Fx.num('attach.boomAngle', 'Main boom angle', '°')) + Fx.num('attach.swl', 'Jib can lift (from the maker\'s chart)', 't', { ph: 'type it' });
  out += `<div class="list" style="margin-top:12px">${rows || Fx.ro('Nothing to set on this crane', '')}</div>`;
  return grp('Set-up on the crane', out, { raw: true, foot: 'Change anything here and the app picks the maker\'s chart for it — the safe load changes with the boom, the counterweight, Y-guying and the jib.' });
}
SA_EXTRA.dutyCwt = (d) => { state.plan.cwt = num(d.v); applyDuty(); };
SA_EXTRA.dutyJib = (d) => { const k = d.v; if (k === 'none') { const at = state.plan.attach || {}; if (at.type === 'fly') accToggle(at.ext ? 'extension' : 'flyjib', false); else if (at.type === 'luff') accToggle('luffing', false); } else accToggle(k === 'fly' ? 'flyjib' : 'luffing', true); };
SA_EXTRA.dutyMain = (d) => applyDuty({ L: num(d.v) });
SA_EXTRA.dutyJibL = (d) => { state.plan.attach.jibLen = num(d.v); applyDuty(); };
SA_EXTRA.dutyCol = (d) => { const at = state.plan.attach; if (at.type === 'luff') at.boomAngle = num(d.v); else at.offset = num(d.v); applyDuty(); };

// ---------- slew: any angle, one degree at a time ----------
function slewNow(l = state.plan.loads[activeLi()]) { return slewOf(l); }
// set the boom's slew (degrees CCW from the cab's way). The carrier stays parked; the chart follows when the boom enters another sector.
function setSlew(deg, o = {}) {
  const p = state.plan, li = activeLi(), l = p.loads[li];
  if (!hasCarrierRot(p.sitePlan)) p.sitePlan = { ...(p.sitePlan || {}), carrierRot: Math.round(carrierHeadingFor(p, l) * 100) / 100 };
  const side0 = sideOfLoad(l); l.slew = r2(normDeg(deg)); l.side = sideFromSlew(l.slew);
  if (l.side !== side0) { const crane = curCrane(); const bi = typeof bestChartForSide === 'function' && crane ? bestChartForSide(crane, l.side, +p.chartIdx) : null; if (bi != null && bi >= 0 && bi !== +p.chartIdx) { p.chartIdx = bi; p.colIdx = 0; p.boomOverride = ''; p.loads.forEach(x => x.colIdx = ''); if (!o.quiet) toast('Load chart changed to one that covers this side'); } }
  markDirty(); histMark(); refresh(true); if (!o.noSheet) sheetLive();
  const v = $('#slewVal'); if (v) v.textContent = `${Math.round(l.slew)}°`; const rg = $('#slewRg'); if (rg && document.activeElement !== rg) { rg.value = String(Math.round(l.slew)); syncSliders(rg.parentElement); }
}
// the slew card at the top of the Side sheet
function slewCard() {
  const l = state.plan.loads[activeLi()]; const a = slewNow(l);
  const b = (d, t) => `<button type="button" class="btn tap slw" data-sa="slewStep" data-d="${d}" aria-label="Slew ${d > 0 ? 'left' : 'right'} ${Math.abs(d)} degree${Math.abs(d) === 1 ? '' : 's'}">${t}</button>`;
  return grp('Slew — turn the boom', `<div class="slew-card"><div class="slew-top">${b(-10, '−10°')}${b(-1, '−1°')}<div class="slew-v"><span id="slewVal" class="num">${Math.round(a)}°</span><small>${h(SIDE_WORD[sideOfLoad(l)])}</small></div>${b(1, '+1°')}${b(10, '+10°')}</div>
    <div class="slider-wrap"><input type="range" class="slider" id="slewRg" min="0" max="359" step="1" value="${Math.round(a)}" aria-label="Slew angle"></div>
    <div class="slew-ticks"><span>0° front</span><span>90° left</span><span>180° rear</span><span>270° right</span></div></div>`, { raw: true, foot: '+ turns the boom to the left (anticlockwise seen from above), − to the right. The keyboard does it too: , and . (Shift for 10°).' });
}
SA_EXTRA.slewStep = (d) => setSlew(slewNow() + num(d.d));
document.addEventListener('input', (e) => { if (e.target.id === 'slewRg') { V7.sliding = true; syncSliders(e.target.parentElement); setSlew(+e.target.value, { quiet: true }); } });
document.addEventListener('change', (e) => { if (e.target.id === 'slewRg') { V7.sliding = false; histMark(); sheetRefresh(); } });
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || CAB.on) return; const tag = (e.target.tagName || '').toLowerCase(); if (['input', 'select', 'textarea'].includes(tag) || document.body.classList.contains('locked') || state.page) return;
  if (e.key === ',' || e.key === '<') { e.preventDefault(); setSlew(slewNow() + (e.shiftKey ? 10 : 1)); } else if (e.key === '.' || e.key === '>') { e.preventDefault(); setSlew(slewNow() - (e.shiftKey ? 10 : 1)); }
  else if ((e.key === 'j' || e.key === 'J') && !V7.sheet) { e.preventDefault(); cabToggle(); }
});

// ---------- cab controls: two sticks like the crane's master switches, keyboard too, and a live LMI ----------
// Left stick: ← → slew, ↑ ↓ boom up / down. Right stick: ↑ ↓ hook up / down, ← → telescope in / out. Keys: A D · W S · ↑ ↓ · ← →.
// Speeds grow with how far the stick is pushed (squared, so small pushes are fine moves). The LMI stops any move that takes the lift over
// 100 % of the chart: you can always boom up, telescope in or set the load down.
const CAB = { on: false, sticks: { L: { x: 0, y: 0 }, R: { x: 0, y: 0 } }, keys: new Set(), raf: 0, t: 0, cut: 0, cutWhy: '', moving: false, fine: false };
const CAB_RATE = { slew: 6, luff: 3, tele: 1.2, hoist: 1.5 }; // °/s, °/s, m/s, m/s at full stick
const CAB_KEYS = { a: ['L', 'x', -1], d: ['L', 'x', 1], w: ['L', 'y', 1], s: ['L', 'y', -1], arrowup: ['R', 'y', 1], arrowdown: ['R', 'y', -1], arrowleft: ['R', 'x', -1], arrowright: ['R', 'x', 1] };
function cabToggle(on) {
  CAB.on = on ?? !CAB.on; let el = $('#cab');
  if (!CAB.on) { if (el) el.remove(); cancelAnimationFrame(CAB.raf); CAB.raf = 0; CAB.keys.clear(); CAB.sticks.L = { x: 0, y: 0 }; CAB.sticks.R = { x: 0, y: 0 }; histMark(); renderFloats(); sheetLive(); return; }
  const l = state.plan.loads[activeLi()]; if (!hasCarrierRot(state.plan.sitePlan)) state.plan.sitePlan = { ...(state.plan.sitePlan || {}), carrierRot: Math.round(carrierHeadingFor(state.plan, l) * 100) / 100 };
  if (!hasSlew(l)) l.slew = r2(slewOf(l));
  if (!el) { el = document.createElement('div'); el.id = 'cab'; el.className = 'cab'; $('#stage').appendChild(el); }
  el.innerHTML = cabHTML(); cabBind(el); cabHud(); renderFloats();
  CAB.t = performance.now(); CAB.raf = requestAnimationFrame(cabLoop);
  if (!LS.get('lp.cabSeen')) { LS.set('lp.cabSeen', true); toast('Cab controls on: left stick slews and booms up/down, right stick hoists and telescopes. J or ✕ to leave.'); }
}
function cabStick(id, labels) {
  return `<div class="stick" data-stick="${id}" role="group" aria-label="${id === 'L' ? 'Left stick: slew and boom' : 'Right stick: hook and telescope'}">
    <span class="sl t">${labels[0]}</span><span class="sl b">${labels[1]}</span><span class="sl l">${labels[2]}</span><span class="sl r">${labels[3]}</span>
    <div class="base"><div class="ring"></div><div class="knob"></div></div></div>`;
}
function cabHTML() {
  return `<div class="cab-hud" aria-live="polite"><div class="lmi"><div class="lmi-bar"><i id="cabBar"></i><b class="m75"></b><b class="m90"></b></div><div class="lmi-row"><span class="lmi-pct num" id="cabPct">—</span><span class="lmi-st" id="cabSt">LMI</span></div></div>
      <div class="cab-read" id="cabRead"></div><button type="button" class="cab-x tap" data-act="cabOff" aria-label="Leave cab controls">${ic('x', 20, 2.4)}</button></div>
    <div class="cab-stop" id="cabStop" hidden>LMI STOP — only moves that make the lift lighter: boom up, telescope in, set the load down</div>
    ${cabStick('L', ['Boom up', 'Boom down', 'Slew left', 'Slew right'])}${cabStick('R', ['Hook up', 'Hook down', 'Tele in', 'Tele out'])}
    <div class="cab-keys">${isDesk() ? 'Keys: A D slew · W S boom · ↑ ↓ hook · ← → telescope · Shift = slow' : ''}</div>`;
}
function cabBind(el) {
  el.addEventListener('click', (e) => { if (e.target.closest('[data-act="cabOff"]')) cabToggle(false); });
  for (const st of el.querySelectorAll('.stick')) {
    const id = st.dataset.stick, base = st.querySelector('.base'), knob = st.querySelector('.knob'); let pid = null;
    const set = (e) => { const r = base.getBoundingClientRect(), R = r.width / 2; let dx = (e.clientX - r.left - R) / R, dy = (e.clientY - r.top - R) / R; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; }
      knob.style.transform = `translate(${dx * R * 0.62}px, ${dy * R * 0.62}px)`; CAB.sticks[id] = { x: Math.abs(dx) < 0.08 ? 0 : dx, y: Math.abs(dy) < 0.08 ? 0 : -dy }; };
    base.addEventListener('pointerdown', (e) => { e.preventDefault(); pid = e.pointerId; try { base.setPointerCapture(pid); } catch {} st.classList.add('on'); set(e); });
    base.addEventListener('pointermove', (e) => { if (e.pointerId === pid) set(e); });
    const up = (e) => { if (e.pointerId !== pid) return; pid = null; st.classList.remove('on'); knob.style.transform = ''; CAB.sticks[id] = { x: 0, y: 0 }; histMark(); };
    base.addEventListener('pointerup', up); base.addEventListener('pointercancel', up);
  }
}
document.addEventListener('keydown', (e) => { if (!CAB.on) return; const k = e.key.toLowerCase(); const tag = (e.target.tagName || '').toLowerCase(); if (['input', 'select', 'textarea'].includes(tag)) return; if (CAB_KEYS[k]) { e.preventDefault(); CAB.keys.add(k); } if (e.key === 'Shift') CAB.fine = true; if (k === 'escape') cabToggle(false); });
document.addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); if (CAB.keys.delete(k)) histMark(); if (e.key === 'Shift') CAB.fine = false; });
window.addEventListener('blur', () => { CAB.keys.clear(); });
function cabAxes() {
  const ax = { L: { ...CAB.sticks.L }, R: { ...CAB.sticks.R } };
  for (const k of CAB.keys) { const [s, a, v] = CAB_KEYS[k]; ax[s][a] = Math.max(-1, Math.min(1, ax[s][a] + v)); }
  const f = (v) => Math.sign(v) * v * v * (CAB.fine ? 0.25 : 1);
  return { slew: -f(ax.L.x), luff: f(ax.L.y), hoist: f(ax.R.y), tele: f(ax.R.x) };
}
function cabLoop(t) {
  if (!CAB.on) return; CAB.raf = requestAnimationFrame(cabLoop);
  const dt = Math.min(0.1, Math.max(0, (t - CAB.t) / 1000)); CAB.t = t; const ax = cabAxes();
  const any = Object.values(ax).some(v => Math.abs(v) > 1e-4); if (!any) { if (CAB.moving) { CAB.moving = false; histMark(); sheetLive(); } return; }
  CAB.moving = true; cabStep(ax, dt);
}
// one frame of motion. Each axis is tried on its own; the LMI keeps the ones that do not push the lift over 100 % (or into a sector the chart
// does not cover) and throws the others back.
function cabStep(ax, dt) {
  const p = state.plan, li = activeLi(), l = p.loads[li]; let res = state.calc?.loads?.[li]; if (!res?.geo?.tip) return;
  const utilOf = (r) => r?.cap != null && r.cap > 0 ? r.util : r?.cap === 0 ? 999 : null;
  let why = '';
  const tryMove = (apply, undo, lighter) => {
    const u0 = utilOf(res), s0 = res?.sideOk !== false; apply(); refreshCalcOnly(); const r1 = state.calc?.loads?.[li]; const u1 = utilOf(r1);
    const worse = (u1 == null && u0 != null) || (u1 != null && u1 > 100 && (u0 == null || u1 > u0 + 1e-6)) || (s0 && r1?.sideOk === false);
    if (worse && !lighter) { undo(); refreshCalcOnly(); why = r1?.sideOk === false ? 'The chart does not cover that side' : u1 == null ? (r1?.capInfo?.why || 'Off the chart') : `${fmt(u1, 0)} % of the chart`; return false; }
    res = r1; return true;
  };
  // slew
  if (ax.slew) { const s0 = slewOf(l), side0 = l.side; const ds = ax.slew * CAB_RATE.slew * dt; tryMove(() => { l.slew = r2(normDeg(s0 + ds)); l.side = sideFromSlew(l.slew); }, () => { l.slew = s0; l.side = side0; }, false); }
  // boom up / down: hold the angle so telescoping keeps it, like the real crane
  if (ax.luff) { const ch = loadCol(li).ch; const [a0, a1] = angleRange(ch); const by0 = l.by, ang0 = l.angle; const cur = currentAngle(res, ch); const na = Math.max(a0, Math.min(a1, cur + ax.luff * CAB_RATE.luff * dt));
    tryMove(() => { l.by = 'angle'; l.angle = Math.round(na * 100) / 100; }, () => { l.by = by0; l.angle = ang0; }, ax.luff > 0); }
  // telescope: continuous length (the capacity between chart columns is the lower of the two)
  if (ax.tele) { if (res.tele?.locked) why = why || 'The jib chart fixes the boom length'; else { const crane = curCrane(); const sp = boomSpec(crane, chartLengths(crane)); const L0 = num(res.tele?.L, sp.Lmin); const nL = Math.max(sp.Lmin, Math.min(sp.Lmax, L0 + ax.tele * CAB_RATE.tele * dt));
    const ov0 = p.boomOverride, tl0 = p.tele, by0 = l.by, ang0 = l.angle; const keepA = currentAngle(res, loadCol(li).ch);
    tryMove(() => { p.tele = { mode: 'auto', fr: [] }; p.boomOverride = r2(nL); if (l.by !== 'angle') { l.by = 'angle'; l.angle = Math.round(keepA * 100) / 100; } }, () => { p.boomOverride = ov0; p.tele = tl0; l.by = by0; l.angle = ang0; }, ax.tele < 0); } }
  // hook up / down (picture only — the checks stay on the landed load)
  if (ax.hoist) { const h0 = num(l.hoist, 0); const mx = num(res.liftMax, 0); l.hoist = r2(Math.max(0, Math.min(mx, h0 + ax.hoist * CAB_RATE.hoist * dt))); if (ax.hoist > 0 && h0 >= mx - 1e-6) why = why || 'Hook at the top — two-block limit'; }
  if (why) { if (!CAB.cut && navigator.vibrate) try { navigator.vibrate(60); } catch {} CAB.cut = performance.now(); CAB.cutWhy = why; }
  else if (CAB.cut && performance.now() - CAB.cut > 700) { CAB.cut = 0; CAB.cutWhy = ''; }
  markDirty(); refresh(true); cabHud();
}
// recompute the plan without redrawing (the LMI tries a move, then keeps or undoes it)
function refreshCalcOnly() { state.calc = computePlan(state.plan, cranes(), settingsEff()); }
function cabHud() {
  if (!CAB.on) return; const li = activeLi(), l = state.plan.loads[li], r = state.calc?.loads?.[li]; if (!r) return; const S = settingsEff();
  const u = r.util, warn = num(S.utilWarn, 75), max = num(S.utilMax, 90); const bar = $('#cabBar'), pct = $('#cabPct'), st = $('#cabSt'), stop = $('#cabStop'), rd = $('#cabRead');
  const cls = r.cap == null ? 'off' : u > 100 ? 'stop' : u > max ? 'over' : u > warn ? 'warn' : 'ok';
  if (bar) { bar.style.width = `${Math.max(0, Math.min(100, r.cap == null ? 100 : u / 1.1))}%`; bar.className = cls; }
  if (pct) pct.textContent = r.cap == null ? 'NO CHART' : `${fmt(u, 1)} %`;
  if (st) { st.textContent = CAB.cut ? 'LMI STOP' : { ok: 'LMI OK', warn: 'CAREFUL', over: 'OVER PLAN LIMIT', stop: 'OVERLOAD', off: 'NO CAPACITY' }[cls]; st.className = 'lmi-st ' + (CAB.cut ? 'stop' : cls); }
  if (stop) { stop.hidden = !CAB.cut; if (CAB.cut) stop.textContent = `LMI STOP — ${CAB.cutWhy}. Boom up, telescope in or set the load down.`; }
  const ch = loadCol(li).ch; const ang = r.geo?.tip ? currentAngle(r, ch) : null;
  const cell = (k, v, u2) => `<div><span>${k}</span><b class="num">${v}<small>${u2}</small></b></div>`;
  if (rd) rd.innerHTML = cell('Slew', Math.round(slewOf(l)), '°') + cell('Boom', fmt(r.tele?.L, 1), 'm') + cell('Angle', ang != null ? fmt(ang, 1) : '—', '°') + cell('Reach', fmt(r.R, 1), 'm') + cell('Hook', fmt(num(r.hookY) + num(r.lift), 1), 'm') + cell('Load', fmt(r.design ?? r.total, 1), 't') + cell('Can lift', r.cap != null ? fmt(r.cap, 1) : '—', 't');
}
