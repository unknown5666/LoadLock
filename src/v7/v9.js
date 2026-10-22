// ===== v9 screens: tandem lift, Fit-Filter crane finder, net capacity, wind on the load, satellite site map, units, offline =====
Object.assign(IC, {
  tandem: 'M2 21h20M4 21v-5.5l6.5-6v2.5M20 21v-5.5l-6.5-6v2.5M10.5 9.5v5M13.5 9.5v5M9 14.5h6v3H9z',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
  cloudOff: 'M3 3l18 18M8.5 8.6A5 5 0 0 0 6 17h11M17.5 17.4A3.5 3.5 0 0 0 16 10.6a5.5 5.5 0 0 0-6-3.9',
  shield: 'M12 3l7 3v5.5c0 4.4-3 8.2-7 9.5-4-1.3-7-5.1-7-9.5V6zM8.5 12l2.5 2.5 4.5-5', bolt: 'M13 2L4 14h7l-1 8 9-12h-7z'
});

// ---------- ground pressure in the unit Settings asks for ----------
const P_UNITS = { t: ['t/m²', 1, 1], kN: ['kN/m²', 9.80665, 0], psi: ['psi', 9.80665 * 0.1450377, 1] };
function gbpTxt(tm2, d) { const u = P_UNITS[state.settings.pUnit] || P_UNITS.t; return tm2 == null || !isFinite(tm2) ? '—' : `${fmt(tm2 * u[1], d ?? u[2])} ${u[0]}`; }
function gbpMat(g) { if (!g?.side) return ''; const a = g.side * g.side; return `${g.side.toFixed(2)} m square · ${a.toFixed(2)} m² (${(a * 10.7639).toFixed(1)} ft²)`; }

// ---------- tandem: the lift's own crane + 1–3 more on one load ----------
function tandemCur() { const l = state.plan.loads[activeLi()]; return tandemOf(l) ? l.tandem : null; }
function tandemRes() { return state.calc?.loads?.[activeLi()]?.tandem || null; }
// add a crane to the plan without moving the lift onto it (addRig in app.js would): park a copy, give it a model, switch back
function tandemNewCrane() { const p = state.plan; rigPark(p); const c = rigPick(p); c.gridN = ''; c.gridE = ''; p.cranes.push(c); return p.cranes.length - 1; } // a copy of this lift's crane (same chart and boom) — change it from the tandem sheet
function tandemOn(n) {
  const p = state.plan, li = activeLi(), l = p.loads[li]; const r = state.calc.loads[li];
  const own = rigIndexOf(p, l); const others = (p.cranes || []).map((_, i) => i).filter(i => i !== own);
  while (others.length < n - 1) others.push(tandemNewCrane());
  const T = tandemDefault(l, n, num(r?.R, 10), boomHeadingFor(p, l));
  T.picks.forEach((pk, k) => { pk.crane = k === 0 ? own : others[k - 1]; });
  l.tandem = T; l.liftType = 'Tandem'; commit({ sheet: true }); toast(`Tandem lift with ${n} cranes — each crane may use ${T.derate || settingsEff().tandemDerate || TANDEM_DERATE}% of its chart`);
}
const TM_STEP = { boom: 0.1, swing: 0.1, hoist: 0.05 }, TM_MAX = { boom: 6, swing: 6, hoist: 2 };
function tandemSvg(T, l) {
  if (!T?.picks?.length) return '';
  const lh = Math.max(0.3, num(l.h, 1.5)); const live = T.live; const pk = T.picks;
  const tilt = live ? num(live.tilt) * D2R : 0; const ca = Math.cos(tilt), sa = Math.sin(tilt);
  const pickY = live ? live.pickY : Math.min(...pk.map(p => num(p.tipY, 20))) - 6;
  const P = live ? live.pose.P.map(q => [q.s, q.y]) : pk.map(p => [p.x, pickY]);
  const A = live ? live.anchors.map(a => [a.s, a.tipY]) : pk.map(p => [p.x, num(p.tipY, pickY + 8)]);
  const ax = num(T.axis) * D2R; const feet = pk.map((p, k) => { const d = { x: p.base.x - p.pos.x, y: p.base.y - p.pos.y }; return [p.x + d.x * Math.cos(ax) + d.y * Math.sin(ax), 2.6]; });
  const x0s = Math.min(...pk.map(p => p.x)), x1s = Math.max(...pk.map(p => p.x));
  const L0 = [P[0][0] - (pk[0].x - x0s + 0.6) * ca, P[0][1] - (pk[0].x - x0s + 0.6) * sa]; const L1 = [L0[0] + (x1s - x0s + 1.2) * ca, L0[1] + (x1s - x0s + 1.2) * sa];
  const dn = [sa * lh, -ca * lh]; const box = [L0, L1, [L1[0] + dn[0], L1[1] + dn[1]], [L0[0] + dn[0], L0[1] + dn[1]]];
  const g = { x: P[0][0] + (num(T.cog.x) - pk[0].x) * ca - num(T.cog.h) * sa, y: P[0][1] + (num(T.cog.x) - pk[0].x) * sa + num(T.cog.h) * ca };
  const xs = [...A, ...feet, ...box].map(q => q[0]), ys = [0, ...A.map(q => q[1]), ...box.map(q => q[1])];
  const VW = 340, VH = 230, pad = 22; const xmin = Math.min(...xs) - 2, xmax = Math.max(...xs) + 2, ymin = Math.min(...ys), ymax = Math.max(...ys) + 3;
  const k = Math.min((VW - 2 * pad) / (xmax - xmin), (VH - 2 * pad) / (ymax - ymin)); const ox = pad + ((VW - 2 * pad) - (xmax - xmin) * k) / 2;
  const S = (x, y) => [ox + (x - xmin) * k, VH - pad - (y - ymin) * k]; const pt = (q) => S(q[0], q[1]).map(v => v.toFixed(1)).join(' ');
  let s = `<line class="gnd" x1="0" y1="${S(0, 0)[1]}" x2="${VW}" y2="${S(0, 0)[1]}"/>`;
  pk.forEach((p, i) => { const f = S(feet[i][0], 0), tip = S(A[i][0], A[i][1]), ft = S(feet[i][0], feet[i][1]); s += `<rect class="car" x="${(f[0] - 14).toFixed(1)}" y="${(f[1] - 12).toFixed(1)}" width="28" height="12" rx="3"/><line class="bm" x1="${ft[0]}" y1="${ft[1]}" x2="${tip[0]}" y2="${tip[1]}"/>`;
    const pq = S(P[i][0], P[i][1]); const st = p.util == null ? 'fail' : p.util > T.derate ? 'fail' : p.util > T.derate * 0.9 ? 'warn' : 'ok';
    s += `<line class="rope${Math.abs(p.lineAng) > 3 ? ' fail' : Math.abs(p.lineAng) > 1 ? ' warn' : ''}" x1="${tip[0]}" y1="${tip[1]}" x2="${pq[0]}" y2="${pq[1]}"/><circle class="hd" cx="${tip[0]}" cy="${tip[1]}" r="4"/>`;
    s += `<text class="tl ${st}" x="${tip[0]}" y="${(tip[1] - 9).toFixed(1)}" text-anchor="middle">C${p.crane + 1} ${fmt(p.share, 1)} t</text>`;
    if (Math.abs(p.lineAng) >= 0.05) s += `<text class="ta" x="${((tip[0] + pq[0]) / 2 + 6).toFixed(1)}" y="${((tip[1] + pq[1]) / 2).toFixed(1)}">${Math.abs(p.lineAng).toFixed(1)}°</text>`; });
  s += `<path class="ld" d="M${box.map(pt).join('L')}Z"/>`;
  const gq = S(g.x, g.y); s += `<g class="cg"><circle cx="${gq[0]}" cy="${gq[1]}" r="6"/><path d="M${gq[0] - 9} ${gq[1]}h18M${gq[0]} ${gq[1] - 9}v18"/></g>`;
  if (live && Math.abs(live.tilt) >= 0.05) s += `<text class="ta" x="${S(L1[0], L1[1])[0] - 4}" y="${S(L1[0], L1[1])[1] + 16}" text-anchor="end">tilt ${Math.abs(live.tilt).toFixed(1)}°</text>`;
  return `<svg class="tdm-pic" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="The load hanging from the cranes, seen from the side">${s}</svg>`;
}
function tandemBars(T) {
  return `<div class="tdm-bars">${T.picks.map(p => { const st = p.util == null ? 'fail' : p.util > T.derate ? 'fail' : p.util > T.derate * 0.9 ? 'warn' : 'ok'; const w = Math.max(2, Math.min(100, num(p.util) / T.derate * 100));
    return `<div class="tdm-b ${st}"><div class="tdm-h"><b>Crane ${p.crane + 1}</b><span>${h(p.model || '')}</span><span class="sp"></span><b class="num">${fmt(p.share, 2)}<small> t · ${fmt(p.pct, 0)}%</small></b></div>
      <div class="tdm-track"><i style="width:${w.toFixed(1)}%"></i><em style="left:100%"></em></div>
      <div class="tdm-f"><span>${p.util != null ? `uses ${fmt(p.util, 0)}% of ${fmt(p.cap, 1)} t` : 'out of reach'}</span>${Math.abs(p.shift) > 0.005 ? `<span class="tdm-shift ${p.shift > 0 ? 'up' : 'dn'}">${p.shift > 0 ? '+' : ''}${fmt(p.shift, 2)} t</span>` : ''}${Math.abs(p.lineAng) >= 0.05 ? `<span>line ${fmt(Math.abs(p.lineAng), 1)}°</span>` : ''}</div></div>`; }).join('')}
    <p class="hint" style="margin:6px 4px 0">Bar end = the tandem limit (${T.derate}% of each crane's chart).</p></div>`;
}
SH.tandem = {
  title: () => 'Tandem lift', icon: 'tandem', subtitle: () => `Lift ${activeLi() + 1}`,
  body() {
    const p = state.plan, li = activeLi(), l = p.loads[li], T = tandemCur(), R = tandemRes();
    if (!T) return `${note('', 'info', 'A <b>tandem lift</b> shares one load between two or more cranes — a long beam, a tank stood up, a load too heavy for one crane. Each crane may only use part of its chart (BS 7121 / ASME B30.5: often 75–80%).')}
      <div class="tdm-start">${[2, 3, 4].map(n => `<button type="button" class="btn ${n === 2 ? 'pri ' : ''}tap" data-sa="tdmOn" data-n="${n}">${ic('tandem', 20, 2.1)}${n} cranes</button>`).join('')}</div>
      <p class="hint" style="margin-top:12px">This lift's crane is crane 1. Missing cranes are added to the plan as copies you can change.</p>`;
    const n = T.picks.length; const rigs = p.cranes || [];
    const craneOpts = rigs.map((rg, i) => { const c = cranes().find(x => x.id === (i === num(p.activeCrane) ? p.craneId : rg.craneId)); return [i, `Crane ${i + 1} · ${c ? c.model : '—'}`]; });
    let out = `<div class="tdm-live" id="tdmLive">${R ? tandemSvg(R, l) + tandemBars(R) : ''}</div>`;
    if (n === 2) out += grp('Try a move', T.picks.map((pk, k) => ['boom', 'swing', 'hoist'].map(f => `<div class="it stack tdm-mv"><span class="lb"><b>Crane ${num(pk.crane) + 1} · ${{ boom: 'boom up / down', swing: 'swing', hoist: 'hoist up / down' }[f]}</b><small data-tmv="${k}.${f}">${tmTxt(f, num(pk.mv?.[f]))}</small></span><input type="range" class="slider" data-tm="${k}.${f}" min="${-TM_MAX[f]}" max="${TM_MAX[f]}" step="${TM_STEP[f]}" value="${num(pk.mv?.[f])}" aria-label="Crane ${num(pk.crane) + 1} ${f}"></div>`).join('')).join('')
      + `<button type="button" class="it accent tap" data-sa="tdmZero">${ic('undo', 20)}Back to the plan (lines plumb)</button>`, { foot: 'Watch the load move from one crane to the other. Booming up or swinging pulls the hoist line out of plumb; hoisting one end tilts the load and shifts its weight.' });
    out += grp('The load', `${Fx.link('open', 'Weight', { data: 'data-k="dial" data-arg="W"', val: fmt(num(l.w), 2) + ' t', ic: icb('weight', 'var(--brand-ink)') })}${Fx.num(`loads.${li}.tandem.cog`, 'Centre of gravity', 'm', { sub: 'along the load, from where crane 1 lifts it' })}${Fx.num(`loads.${li}.tandem.cogH`, 'Centre of gravity height', 'm', { sub: 'above the lifting points (below = minus)' })}${n > 2 ? Fx.num(`loads.${li}.tandem.cogZ`, 'Centre of gravity across', 'm') : ''}${Fx.num(`loads.${li}.tandem.axis`, 'Load lies towards', '°', { sub: '0 = east, 90 = north (top view)' })}${Fx.num(`loads.${li}.tandem.derate`, 'Tandem limit', '%', { ph: String(settingsEff().tandemDerate || TANDEM_DERATE), sub: 'of each crane\'s chart — the Appointed Person decides' })}`);
    T.picks.forEach((pk, k) => {
      const pre = `loads.${li}.tandem.picks.${k}.`; const rp = R?.picks?.[k];
      out += grp(`Crane ${num(pk.crane) + 1}${k === 0 ? ' · this lift\'s crane' : ''}`, (k === 0 ? Fx.ro('Crane', h(rp?.model || curCrane()?.model || ''), { sub: 'reach, side and boom from the main screen' }) : Fx.sel(pre + 'crane', 'Crane', craneOpts, { numeric: 1 }))
        + Fx.num(pre + 'x', 'Lifts the load at', 'm', { sub: 'along the load' }) + (n > 2 ? Fx.num(pre + 'z', 'Across the load', 'm') : '')
        + (k > 0 ? Fx.num(pre + 'R', 'Reach', 'm') + Fx.num(pre + 'psi', 'Stands towards', '°', { sub: 'from its lifting point · 0 = east' }) + Fx.sel(pre + 'side', 'Lifts over its', SIDES.map(([v, t]) => [v, t === 'Behind' ? 'rear' : t.toLowerCase() + ' side'])) + Fx.num(pre + 'tk', 'Its slings & shackles', 't', { ph: '0' }) : '')
        + (rp ? Fx.ro('Carries', `<b>${fmt(rp.design, 2)} t</b>`, { sub: `${fmt(rp.share, 2)} t of the load + hook ${fmt(rp.hb, 2)} + rigging ${fmt(rp.tk, 2)}` }) : '')
        + (k > 0 ? `<button type="button" class="it accent tap" data-sa="tdmEdit" data-i="${num(pk.crane)}">${ic('crane', 20)}Change crane ${num(pk.crane) + 1}'s chart and boom</button>` : ''));
    });
    out += `<div class="btns two" style="margin-top:16px">${n < 4 ? `<button type="button" class="btn tap" data-sa="tdmAdd">${ic('plus', 18, 2.4)}Add a crane</button>` : '<span></span>'}<button type="button" class="btn danger tap" data-sa="tdmOff">One crane again</button></div>
      <p class="hint" style="margin-top:12px">Shares come from where the load is lifted and where its centre of gravity is. Two cranes: moves are worked out for real (the load hangs from both lines). Three or four: hoist lines kept plumb.</p>`;
    return out;
  },
  live(bd) { const R = tandemRes(), l = state.plan.loads[activeLi()]; const box = $('#tdmLive', bd); if (box && R) box.innerHTML = tandemSvg(R, l) + tandemBars(R); }
};
function tmTxt(f, v) { return f === 'hoist' ? (v ? `${v > 0 ? 'up' : 'down'} ${Math.abs(v).toFixed(2)} m` : 'as planned') : f === 'boom' ? (v ? `${v > 0 ? 'up' : 'down'} ${Math.abs(v).toFixed(1)}°` : 'as planned') : (v ? `${Math.abs(v).toFixed(1)}° ${v > 0 ? 'left' : 'right'}` : 'as planned'); }
SA_EXTRA.tdmOn = (d) => tandemOn(+d.n || 2);
SA_EXTRA.tdmOff = (d, b) => { if (!confirmTap(b, 'Tap again — one crane')) return; const l = state.plan.loads[activeLi()]; l.tandem = { ...(l.tandem || {}), on: false }; if (l.liftType === 'Tandem') l.liftType = ''; commit({ sheet: true }); toast('Back to one crane'); };
SA_EXTRA.tdmAdd = () => { const p = state.plan, l = p.loads[activeLi()], T = l.tandem; if (!T || T.picks.length >= 4) return; const used = new Set(T.picks.map(x => num(x.crane))); let ci = (p.cranes || []).findIndex((_, i) => !used.has(i)); if (ci < 0) ci = tandemNewCrane();
  const last = T.picks[T.picks.length - 1]; T.picks.push({ crane: ci, x: r2(num(last.x) + 2), z: 0, R: num(last.R, 10), psi: r2(normDeg(num(T.axis) + (T.picks.length % 2 ? 90 : -90))), side: 'rear', tk: 0, hb: '', mv: { boom: 0, swing: 0, hoist: 0 } }); commit({ sheet: true }); };
SA_EXTRA.tdmZero = () => { const T = tandemCur(); if (!T) return; T.picks.forEach(pk => { pk.mv = { boom: 0, swing: 0, hoist: 0 }; }); commit({ sheet: true }); };
SA_EXTRA.tdmEdit = (d) => { const back = rigIndexOf(state.plan, state.plan.loads[activeLi()]); switchRig(+d.i); commit(); closeSheet(true); V7.rigBack = back; openSheet('crane'); toast(`Editing crane ${+d.i + 1} — the lift stays on its own crane`); };
document.addEventListener('input', (e) => { const t = e.target; if (t.dataset?.tm == null || !t.closest('#sheet')) return; const [k, f] = t.dataset.tm.split('.'); const T = tandemCur(); if (!T) return;
  const pk = T.picks[+k]; pk.mv = { boom: 0, swing: 0, hoist: 0, ...(pk.mv || {}) }; pk.mv[f] = r2(+t.value); V7.sliding = true; syncSliders(t.parentElement);
  const lab = $(`[data-tmv="${k}.${f}"]`); if (lab) lab.textContent = tmTxt(f, pk.mv[f]); markDirty(); refresh(true); });
document.addEventListener('change', (e) => { const t = e.target; if (t.dataset?.tm == null || !t.closest('#sheet')) return; V7.sliding = false; histMark(); sheetLive(); });

// ---------- Fit-Filter: weight, reach, obstruction → the cranes that can do it, lightest set-up first ----------
function ffState() {
  if (!state.ff) { const li = activeLi(), l = state.plan.loads[li], r = state.calc.loads[li]; state.ff = { w: l.empty ? '' : num(l.w), R: r2(num(r?.R, num(l.R, 10))), oh: '', ox: '', side: sideOfLoad(l), jib: false, put: true }; }
  return state.ff;
}
function ffRun() {
  const F = ffState(), li = activeLi(), l = state.plan.loads[li], r = state.calc.loads[li];
  const req = { w: num(F.w), tk: num(r?.tk), hb: 0, cont: l.contOn !== false ? num(l.cont) : 0, R: num(F.R, 10), h: num(l.h, 2), rigH: num(r?.stack?.H, num(l.rigH, 3)), site: state.plan.site, hookAllowance: num(state.plan.hookAllowance, 3), side: F.side, obst: num(F.oh) > 0 ? { h: num(F.oh), x: num(F.ox) } : null };
  const t0 = performance.now(); let list = []; let n = 0;
  try { const all = findCranes(req, cranes(), settingsEff(), { allowJib: !!F.jib }); n = all.length; list = bestPerCrane(all); } catch (e) { console.error(e); }
  return { list, ms: performance.now() - t0, n, req };
}
function ffList() {
  const { list, ms, req } = ffRun(); const S = settingsEff(); const ok = list.filter(o => o.ok).length;
  return `<p class="ff-sum"><b>${ok ? `${ok} crane${ok > 1 ? 's' : ''} can do it` : 'No crane in the fleet can do it'}</b> · checked ${list.length} cranes in ${Math.max(1, Math.round(ms))} ms</p>
    <div class="ff-list">${list.map((o, i) => { const st = !o.ok ? 'no' : o.r.util > num(S.utilWarn, 75) ? 'warn' : 'ok';
      return `<button type="button" class="ff tap${o.crane.id === state.plan.craneId ? ' on' : ''}" data-sa="ffPick" data-id="${h(o.crane.id)}" data-chi="${o.chi}" data-ci="${o.ci}" style="--bc:${brandCol(o.crane)};--i:${i}">
        <span class="ff-v ${st}">${st === 'no' ? ic('x', 16, 3) : Math.round(o.r.util) + '<small>%</small>'}</span>
        <span class="ff-m"><b>${h(o.crane.make)} ${h(o.crane.model)}</b><span>${o.ok ? `boom ${fmt(o.col.L, 1)} m · ${fmt(num(o.chart.cwt, o.crane.cwt), 1)} t counterweight · lifts ${fmt(o.r.cap, 1)} t` : h(o.fails[0]?.m || 'can\'t do it').slice(0, 110)}</span></span>
        <span class="ff-c num">${o.crane.cls}<small>t</small></span></button>`; }).join('')}</div>`;
}
SH.find = {
  title: () => 'Find a crane', icon: 'search', sub: true,
  body() {
    const F = ffState();
    const inp = (k, lab, u, ph) => `<label class="ff-in"><span>${lab}</span><span class="ff-box"><input class="num" type="text" inputmode="decimal" data-ff="${k}" value="${h(F[k] ?? '')}" placeholder="${h(ph || '')}" aria-label="${lab}"><small>${u}</small></span></label>`;
    return `<div class="ff-ins">${inp('w', 'Load', 't', '0')}${inp('R', 'Reach', 'm', '10')}${inp('oh', 'Obstruction height', 'm', 'none')}${inp('ox', 'Obstruction at', 'm', 'auto')}</div>
      <div class="seg" style="width:100%;margin:10px 0 4px">${SIDES.map(([k, t]) => `<button type="button" class="tap" data-sa="ffSide" data-v="${k}" aria-checked="${F.side === k}">${t}</button>`).join('')}</div>
      ${grp('', Fx.swRaw('data-ffsw="jib"', 'Include jibs', !!F.jib, { sub: 'Fly and luffing jib charts too' }) + Fx.swRaw('data-ffsw="put"', 'Put the obstruction on the drawing', F.put !== false, { sub: 'When you pick a crane' }))}
      <div id="ffOut">${ffList()}</div>
      <p class="hint" style="margin-top:12px">Ranked: cranes that can do it first, then the smallest crane, the least counterweight and the shortest boom. The percent is how hard it works (with the hook, slings and your safety margin).</p>`;
  }
};
let ffT;
document.addEventListener('input', (e) => { const t = e.target; if (t.dataset?.ff == null || !t.closest('#sheet')) return; const F = ffState(); F[t.dataset.ff] = t.value; clearTimeout(ffT); ffT = setTimeout(() => { const o = $('#ffOut'); if (o) o.innerHTML = ffList(); }, 90); });
document.addEventListener('change', (e) => { const t = e.target; if (t.dataset?.ffsw == null || !t.closest('#sheet')) return; ffState()[t.dataset.ffsw] = t.checked; const o = $('#ffOut'); if (o) o.innerHTML = ffList(); });
SA_EXTRA.ffSide = (d) => { ffState().side = d.v; $$('[data-sa="ffSide"]').forEach(x => x.setAttribute('aria-checked', String(x.dataset.v === d.v))); const o = $('#ffOut'); if (o) o.innerHTML = ffList(); };
SA_EXTRA.ffPick = (d) => {
  const p = state.plan, li = activeLi(), l = p.loads[li], F = ffState();
  if (num(F.w) > 0) { l.w = r2(num(F.w)); l.empty = false; } if (num(F.R) > 0) { l.by = 'radius'; l.R = r2(num(F.R)); }
  if (F.side && F.side !== sideOfLoad(l)) { if (!hasCarrierRot(p.sitePlan)) p.sitePlan = { ...(p.sitePlan || {}), carrierRot: Math.round(carrierHeadingFor(p, l)) }; l.side = F.side; }
  setCrane(d.id); p.chartIdx = +d.chi; p.colIdx = +d.ci; p.boomOverride = ''; p.loads.forEach(x => { x.colIdx = ''; });
  if (num(F.oh) > 0 && F.put !== false) { const x = r2(num(F.ox) > 0 ? num(F.ox) : num(F.R) * 0.6); const o = p.site.obstacles.find(q => q.label === 'OBSTRUCTION'); if (o) Object.assign(o, { x, h: num(F.oh) }); else p.site.obstacles.push({ type: 'wall', x, y: 0, w: 0.3, h: num(F.oh), label: 'OBSTRUCTION' }); }
  state.ff = null; commit({ sheet: true }); closeSheet(true); toast(`${curCrane().model} set up: boom ${fmt(state.calc.loads[li]?.tele?.L, 1)} m, ${fmt(num(curChart().ch?.cwt, curCrane().cwt), 1)} t counterweight`);
};

// ---------- the satellite map ----------
function mapSt() { if (!state.map) { const W = state.plan.weather; state.map = { q: '', res: null, busy: false, err: '', lat: W?.lat ?? null, lon: W?.lon ?? null, place: W?.place || '', size: 200, prog: '' }; } return state.map; }
async function mapSearch() {
  const M = mapSt(); const q = (M.q || '').trim(); if (!q) { M.err = 'Type a place or coordinates first.'; sheetRefresh(); return; }
  const ll = GIS.parseLatLon(q); if (ll) { Object.assign(M, { lat: ll.lat, lon: ll.lon, place: `${ll.lat.toFixed(5)}, ${ll.lon.toFixed(5)}`, res: null, err: '' }); sheetRefresh(); return; }
  M.busy = true; M.err = ''; sheetRefresh();
  try { const r = await WX.geocode(q); M.res = r; if (!r.length) M.err = 'Nothing found. Try a nearby town, or paste coordinates like 24.4539, 54.3773.'; }
  catch (e) { M.err = e.blocked ? 'Search is blocked here — paste the coordinates from Google Maps instead (24.4539, 54.3773).' : 'Search failed: ' + e.message; }
  finally { M.busy = false; sheetRefresh(); }
}
async function mapFetch() {
  const M = mapSt(); if (M.lat == null) { M.err = 'Find the site first.'; sheetRefresh(); return; }
  const prov = state.settings.mapboxToken ? (state.settings.mapProv || 'esri') : 'esri';
  M.busy = true; M.err = ''; M.prog = 'Loading the map…'; sheetRefresh();
  try {
    const t0 = performance.now();
    const r = await GIS.fetchMap(+M.lat, +M.lon, +M.size, prov, state.settings.mapboxToken, (d, n) => { M.prog = `Loading ${d} of ${n} map tiles…`; const el = $('#mapProg'); if (el) el.textContent = M.prog; });
    const p = state.plan; const old = (p.env || []).findIndex(e => e.geo); if (old >= 0) { delete ENV_CACHE[p.env[old].id]; p.env.splice(old, 1); }
    const e = { id: 'env' + uid(), name: 'Satellite map', view: 'plan', kind: 'img', x: 0, y: 0, rot: 0, opacity: 1, mono: false, hidden: false, sc: r.mpp, w: r.w, h: r.h, calibrated: false, geo: { lat: +M.lat, lon: +M.lon, size: +M.size, z: r.z, prov, credit: r.credit, place: M.place } };
    ENV_CACHE[e.id] = { img: r.canvas.toDataURL('image/jpeg', 0.84), w: r.w, h: r.h };
    p.env = p.env || []; p.env.unshift(e); if (!p.sitePlan.enabled) p.sitePlan.enabled = true;
    const sp = sitePlanState(p); envCenterAt(e, num(sp.cx), num(sp.cy));
    await persistEnv(e, { canvas: r.canvas, blob: state.assets ? await canvasBlob(r.canvas) : null }, state.assets);
    M.busy = false; M.prog = ''; closeSheet(true); Scene.views.plan = null; if (state.view !== 'plan') setView('plan'); else sceneView(); commit({ sheet: true }); sceneFit(); sceneDirty();
    toast(`Satellite map in — ${M.size} m across at true scale (${Math.round(performance.now() - t0)} ms). Drag the yellow dot to stand the crane.`);
  } catch (err) { console.error(err); M.busy = false; M.prog = ''; M.err = err.message || 'The map could not load'; sheetRefresh(); }
}
SH.map = {
  title: () => 'Satellite map', icon: 'globe', sub: true,
  body() {
    const M = mapSt(); const cur = (state.plan.env || []).find(e => e.geo);
    let out = note('', 'globe', 'Put a true-scale satellite picture of the site under the top view. The crane stands in the middle of it; drag the yellow dot to move the crane onto its spot.');
    out += grp('Where is the site?', `<div class="it stack"><div class="search">${ic('search', 20, 2.2)}<input type="search" id="mapQ" placeholder="Place, area or 24.4539, 54.3773" value="${h(M.q)}" aria-label="Site place or coordinates"></div>
      <div class="btns"><button type="button" class="btn sm pri tap" data-sa="mapSearch"${M.busy ? ' disabled' : ''}>Search</button><button type="button" class="btn sm tap" data-sa="mapHere">${ic('pin', 18)}Where I am</button></div></div>
      ${(M.res || []).map((r, i) => `<button type="button" class="it tap" data-sa="mapPick" data-i="${i}"><span class="lb"><b>${h(r.name)}</b><small>${h(r.sub || '')}</small></span></button>`).join('')}
      ${M.lat != null ? `<div class="it has-ic">${icb('pin', 'var(--info-fill)')}<span class="lb"><b>${h(M.place || 'Site')}</b><small>${(+M.lat).toFixed(5)}, ${(+M.lon).toFixed(5)}</small></span></div>` : ''}`, { foot: M.err ? `<span style="color:var(--warn)">${h(M.err)}</span>` : '' });
    out += grp('How much ground', `<div class="it"><div class="seg" style="width:100%">${[100, 200, 400, 800].map(v => `<button type="button" class="tap" data-sa="mapSize" data-v="${v}" aria-checked="${+M.size === v}">${v} m</button>`).join('')}</div></div>`, { foot: 'Smaller = sharper. 200 m suits most jobs.' });
    out += `<button type="button" class="btn pri wide tap" data-sa="mapGo"${M.busy || M.lat == null ? ' disabled' : ''} style="margin-top:6px">${ic('globe', 20, 2.2)}${M.busy ? '<span id="mapProg">' + h(M.prog || 'Loading…') + '</span>' : cur ? 'Replace the map' : 'Put the map under the top view'}</button>`;
    if (cur) out += grp('On the plan', Fx.link('open', cur.geo.place || 'Satellite map', { data: `data-k="env" data-arg="${state.plan.env.indexOf(cur)}"`, ic: icb('globe', '#34aadc'), sub: `${cur.geo.size} m · ${cur.geo.prov === 'mapbox' ? 'Mapbox' : 'Esri'} · ${cur.calibrated ? 'scale set from two points' : 'true scale from the map'}` }), { foot: 'Fine-tune with “Set the scale from two points” on a distance you measured on site.' });
    out += `<p class="hint" style="margin-top:12px">${h(GIS.providers[state.settings.mapboxToken ? (state.settings.mapProv || 'esri') : 'esri'].credit)}. Needs the internet while it loads; afterwards it is saved with the plan.</p>`;
    return out;
  }
};
SA_EXTRA.mapSearch = () => mapSearch();
SA_EXTRA.mapPick = (d) => { const M = mapSt(); const r = M.res?.[+d.i]; if (!r) return; Object.assign(M, { lat: r.lat, lon: r.lon, place: r.name + (r.sub ? ', ' + r.sub.split(',').pop().trim() : ''), res: null, err: '' }); sheetRefresh(); };
SA_EXTRA.mapHere = () => { const M = mapSt(); if (!navigator.geolocation) { M.err = 'Location is not available here.'; sheetRefresh(); return; } M.busy = true; sheetRefresh();
  navigator.geolocation.getCurrentPosition((pos) => { Object.assign(M, { busy: false, lat: pos.coords.latitude, lon: pos.coords.longitude, place: 'Where I am', err: '' }); sheetRefresh(); }, () => { M.busy = false; M.err = 'Location was not shared. Search for the site instead.'; sheetRefresh(); }, { timeout: 9000, maximumAge: 600000 }); };
SA_EXTRA.mapSize = (d) => { mapSt().size = +d.v; sheetRefresh(); };
SA_EXTRA.mapGo = () => mapFetch();
document.addEventListener('input', (e) => { if (e.target.id === 'mapQ') mapSt().q = e.target.value; });
document.addEventListener('keydown', (e) => { if (e.target.id === 'mapQ' && e.key === 'Enter') { e.preventDefault(); mapSearch(); } });

// ---------- net capacity, deductions and wind on the load (inside the Hook sheet) ----------
function netCapRows(r) {
  if (!r) return '';
  const row = (lab, v, cls = '', sub = '') => `<div class="nc-r ${cls}"><span>${lab}${sub ? `<small>${sub}</small>` : ''}</span><b class="num">${v}</b></div>`;
  if (r.cap == null) return `<div class="nc">${row('Chart capacity', 'none', 'fail')}</div>`;
  const mn = (v) => `− ${fmt(v, 2)} t`;
  return `<div class="nc">${row('Chart capacity', `${fmt(r.cap, 2)} t`, '', r.capInfo?.wind ? `read ${fmt(r.wind.dR, 2)} m further out — wind drift` : r.capInfo?.curve ? 'curve fit between chart radii' : r.capInfo?.rounded ? `at ${r.capInfo.row} m (next chart radius up)` : '')}
    ${r.daf ? row('Bounce factor', `÷ ${r.daf.toFixed(3)}`) : ''}${row('Hook block', mn(r.hb))}${row('Slings & shackles', mn(r.tk))}${r.ex ? row('Anything else', mn(r.ex)) : ''}${r.jd ? row('Folded jib', mn(r.jd)) : ''}${r.rope ? row('Hoist rope', mn(r.rope), '', `${r.ropeInfo.falls} falls × ${fmt(r.ropeInfo.len, 1)} m`) : ''}
    ${row('Net capacity for the load', `${fmt(r.netCap, 2)} t`, 'tot')}${row('Load + safety margin', `${fmt(r.W + r.contW, 2)} t`)}
    ${row(r.netCap >= r.W + r.contW ? 'Spare' : 'Short by', `${fmt(Math.abs(r.netCap - r.W - r.contW), 2)} t`, r.netCap >= r.W + r.contW ? 'ok' : 'fail', r.margin != null ? `safety margin ${fmt(r.margin, 1)}% of the chart` : '')}</div>`;
}
function windRows(r) {
  const w = r?.wind; if (!w) return '';
  const st = w.vDes == null ? '' : w.vDes > w.vPerm ? 'fail' : w.vDes > 0.8 * w.vPerm ? 'warn' : 'ok';
  return `<div class="dial-out" style="padding:12px"><div class="mini ${w.vPerm < w.vTab ? 'warn' : ''}"><span>Lift only up to</span><b>${fmt(w.vPerm, 1)}<small>m/s</small></b></div><div class="mini ${st}"><span>Gust at the top</span><b>${w.vDes != null ? fmt(w.vDes, 1) + '<small>m/s</small>' : '—'}</b></div><div class="mini ${w.dR > 0.05 ? 'fail' : ''}"><span>Swings out</span><b>${fmt(w.dR, 2)}<small>m</small></b></div></div>`;
}

// ---------- offline: the app keeps working without signal (service worker), and says so ----------
function netChip() {
  let c = $('#netChip'); const off = !navigator.onLine;
  if (!c) { c = document.createElement('div'); c.id = 'netChip'; c.className = 'net-chip'; c.setAttribute('role', 'status'); document.body.appendChild(c); }
  c.innerHTML = `${ic('cloudOff', 15, 2.2)}<span>Offline — your work is kept on this phone</span>`; c.classList.toggle('on', off);
}
window.addEventListener('online', () => { netChip(); toast('Back online'); });
window.addEventListener('offline', () => { netChip(); if (state.dirty) draft(); });
function swRegister() { if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol) || /localhost|127\.0\.0\.1/.test(location.hostname) && !window.__swTest) return; navigator.serviceWorker.register('/sw.js').catch(() => {}); }
