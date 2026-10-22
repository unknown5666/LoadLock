// ===== v8 screens: outrigger legs (loads, half / full beams, mats and ground, hand-typed illustration values) and typed-over sheet values =====

// the outrigger result for the crane that does lift li (multi-crane plans have one per crane)
function legsFor(li) { const calc = state.calc; const r = calc?.loads?.[li]; return (calc?.outrigs || []).find(o => o.rigI === r?.rigI) || calc?.outr || null; }
function legsLift(O, li) { return O?.lifts.find(x => x.li === li) || O?.lifts[0] || null; }
function legsDockSub(calc, r) {
  const O = (calc.outrigs || []).find(o => o.rigI === r?.rigI) || calc.outr; const L = legsLift(O, activeLi()); if (!O || !L) return '';
  return O.illus ? 'typed by hand' : `${fmt(Math.max(...OUT_PADS.map(id => L.at.R[id])), 1)} t max` + (O.half ? ' · half' : '');
}
// colour class for one pad: lifted / typed by hand / against the ground limit
function padCls(O, L, id) {
  if (O.manual[id] != null) return 'man';
  if (L?.at.lifted.includes(id)) return 'lift';
  const g = state.calc.ground; if (!g?.allow || !g.pads) return '';
  const q = g.pads[id] / g.allow; return q > 1 ? 'fail' : q > 0.9 ? 'warn' : 'ok';
}

// ---------- the picture: crane from above, cab at the top, left side on the left (same as the Side screen) ----------
function legsSvg(O, L, crane) {
  const Lc = num(crane?.carrierLen, 12), Wc = num(crane?.width, 2.75);
  const xs = [...O.pads.map(p => p.x), 0.64 * Lc, -0.36 * Lc], ys = O.pads.map(p => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const VW = 340, VH = 380, k = Math.min((VW - 150) / Math.max(1, y1 - y0), (VH - 120) / Math.max(1, x1 - x0));
  const xm = (x0 + x1) / 2, ymid = (y0 + y1) / 2;
  const S = (x, y) => [VW / 2 - (y - ymid) * k, VH / 2 - (x - xm) * k];
  const pt = (x, y) => S(x, y).map(v => v.toFixed(1)).join(' ');
  const val = (id) => (O.manual[id] != null ? O.manual[id] : L ? L.at.R[id] : O.used[id]);
  const vmax = Math.max(1e-6, ...O.pads.map(p => val(p.id)));
  let g = '';
  // support polygon + the "all four legs down" diamond (centre of gravity inside it → no leg lifts)
  g += `<path class="poly" d="M${O.pads.map(p => pt(p.x, p.y)).join('L')}Z"/>`;
  const mid = (a, b) => [(a.x + b.x) / 2, (a.y + b.y) / 2]; const P4 = O.pads;
  g += `<path class="kern" d="M${[mid(P4[0], P4[1]), mid(P4[1], P4[2]), mid(P4[2], P4[3]), mid(P4[3], P4[0])].map(([x, y]) => pt(x, y)).join('L')}Z"/>`;
  // beams, then the carrier and cab on top
  for (const p of O.pads) g += `<path class="beam${p.ext === 'half' ? ' half' : ''}" d="M${pt(p.x, Math.sign(p.y) * Wc / 2)}L${pt(p.x, p.y)}"/>`;
  { const [ax, ay] = S(0.64 * Lc, Wc / 2), [bx, by] = S(-0.36 * Lc, -Wc / 2); g += `<rect class="body" x="${Math.min(ax, bx)}" y="${Math.min(ay, by)}" width="${Math.abs(bx - ax)}" height="${Math.abs(by - ay)}" rx="6"/>`; }
  { const [ax, ay] = S(0.64 * Lc, Wc / 2 - 0.1), [bx, by] = S(0.64 * Lc - 1.6, -Wc / 2 + 0.1); g += `<rect class="cab" x="${Math.min(ax, bx)}" y="${Math.min(ay, by)}" width="${Math.abs(bx - ax)}" height="${Math.abs(by - ay)}" rx="4"/>`; const [tx, ty] = S(0.64 * Lc - 0.8, 0); g += `<text class="cabt" x="${tx}" y="${ty + 4}" text-anchor="middle">CAB</text>`; }
  // boom towards the lift side (shortened to stay on the picture) and the load
  if (L) {
    const t = L.theta * Math.PI / 180, [ox, oy] = S(0, 0); const len = Math.min(num(L.R) * k, 128); const ex = ox - Math.sin(t) * len, ey = oy - Math.cos(t) * len;
    g += `<line class="boom" x1="${ox}" y1="${oy}" x2="${ex}" y2="${ey}"/><circle cx="${ex}" cy="${ey}" r="8" class="hk"/><text class="hkt" x="${ex}" y="${ey + (Math.cos(t) > 0.5 ? -14 : 22)}" text-anchor="middle">${fmt(L.hookT, 1)} t · ${fmt(L.R, 1)} m</text>`;
    g += `<circle cx="${ox}" cy="${oy}" r="9" class="ring"/>`;
    const [cgx, cgy] = S(L.at.cog.x, L.at.cog.y); const cs = L.at.state === 'tipped' || L.at.state === 'tipping-limit' ? 'fail' : L.at.lifted.length ? 'warn' : 'ok';
    g += `<g class="cog ${cs}"><circle cx="${cgx}" cy="${cgy}" r="7"/><path d="M${cgx - 11} ${cgy}h22M${cgx} ${cgy - 11}v22"/></g>`;
  }
  // the pads: size follows the load, colour the ground check; numbers in big type
  for (const p of O.pads) {
    const [px, py] = S(p.x, p.y); const v = val(p.id); const r = 10 + 14 * Math.sqrt(Math.max(0, v) / vmax); const cls = padCls(O, L, p.id);
    const right = px > VW / 2, below = py > VH / 2;
    g += `<g class="pad ${cls}"><circle cx="${px}" cy="${py}" r="${r.toFixed(1)}"/><text class="pid" x="${px}" y="${py + 4}" text-anchor="middle">${p.id}</text>
      <text class="pv" x="${px + (right ? 1 : -1) * (r + 6)}" y="${py + (below ? 16 : -6)}" text-anchor="${right ? 'start' : 'end'}">${cls === 'lift' ? 'lifts' : fmt(v, 1)}<tspan class="u">${cls === 'lift' ? '' : ' t'}</tspan></text>${cls === 'man' ? `<text class="pm2" x="${px + (right ? 1 : -1) * (r + 6)}" y="${py + (below ? 30 : 8)}" text-anchor="${right ? 'start' : 'end'}">typed</text>` : ''}</g>`;
  }
  return `<svg class="legs-pic" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Crane from above with the load on each leg">${g}</svg>`;
}

// ---------- the Legs sheet ----------
SH.legs = {
  title: () => 'Outrigger legs', icon: 'legs', subtitle: () => `Lift ${activeLi() + 1}`,
  body() {
    const p = state.plan, li = activeLi(), O = legsFor(li), L = legsLift(O, li); const crane = O?.crane || curCrane();
    if (!O || !L) return note('', 'info', 'Pick a crane and a lift first.');
    const g = state.calc.ground, op = p.outrigger || {}; const man = V7.legMan || O.illus;
    const sp = O.spans; const big = OUT_PADS.reduce((a, id) => (L.at.R[id] > L.at.R[a] ? id : a), 'FR');
    let out = '';
    if (O.illus) out += note('fail', 'hand', `<b>Illustration only.</b> You typed ${Object.keys(O.manual).map(id => OUT_PAD_NAME[id].toLowerCase()).join(', ')}. These are <b>not real crane data</b> and not worked out — the sheet will say <b>ILLUSTRATIVE, NOT FOR LIFTING</b>. Never set up a real lift with them.`);
    out += `<div class="legs-wrap">${legsSvg(O, L, crane)}</div>`;
    const st = L.at.state === 'tipped' ? ['fail', 'stop', 'Would tip over'] : L.at.state === 'tipping-limit' ? ['fail', 'stop', 'At the tipping point'] : L.at.lifted.length ? ['warn', 'alert', `${L.at.lifted.map(id => OUT_PAD_NAME[id]).join(', ')} goes light`] : ['ok', 'check', 'All four legs down'];
    out += note(st[0], st[1], `<b>${st[2]}.</b> Lifting ${fmt(L.hookT, 1)} t at ${fmt(L.R, 1)} m over the ${SIDE_WORD[L.side]}. Busiest leg: <b>${OUT_PAD_NAME[big].toLowerCase()} ${fmt(L.at.R[big], 1)} t</b> (${fmt(L.at.R[big] * OUT_G, 0)} kN).`);
    // the four legs, laid out like the crane (front at the top)
    const card = (id) => { const cls = padCls(O, L, id); const v = O.manual[id] != null ? O.manual[id] : L.at.R[id]; const q = g?.pads?.[id];
      return `<div class="padc ${cls}"><span>${OUT_PAD_NAME[id]}${O.pads.find(x => x.id === id).ext === 'half' ? ' · half out' : ''}</span><b class="num">${cls === 'lift' ? 'lifts off' : fmt(v, 1) + '<small>t</small>'}</b>
        <em>${cls === 'man' ? `typed by hand · worked out ${fmt(L.at.R[id], 1)} t` : `full turn up to ${fmt(O.sweepMax[id].v, 1)} t`}</em>${q != null && g.allow ? `<em class="q">${gbpTxt(q)} on the ground</em>` : ''}</div>`; };
    out += `<div class="pads">${['FL', 'FR', 'RL', 'RR'].map(card).join('')}</div>`;
    // half / full per side
    const seg = (side) => `<div class="it"><span class="lb"><b>${side === 'left' ? 'Left' : 'Right'} legs</b><small>${fmt((side === 'left' ? sp.yL : sp.yR) * 2, 2)} m across if both were like this</small></span><div class="seg" style="width:190px">${['full', 'half'].map(v => `<button type="button" class="tap" data-sa="legExt" data-side="${side}" data-v="${v}" aria-checked="${O.ext[side] === v}">${v === 'full' ? 'Full out' : 'Half out'}</button>`).join('')}</div></div>`;
    out += grp('How far the legs go out', seg('left') + seg('right') + `<div class="it"><span class="lb"><b>Legs stand</b><small>front to back × across</small></span><span class="vl num">${fmt(sp.long, 2)} × ${fmt(sp.yL + sp.yR, 2)} m</span></div>`,
      { foot: O.half ? `<span style="color:var(--stop);font-weight:650">Half-out legs need the maker's half-outrigger load chart.</span> The leg loads go up and the crane can lift less. Half out = ${fmt(sp.transHalf, 2)} m across${sp.estHalf ? ' (estimated — enter the real figure under Fleet)' : ''}.` : 'Full out gives the most stability. Use half out only when the site is too tight, with the maker\'s half-outrigger chart.' });
    out += grp('Which leg loads count', `<div class="it"><div class="seg" style="width:100%"><button type="button" class="tap" data-sa="legBasis" data-v="full" aria-checked="${O.basis === 'full'}">Full turn (360°)</button><button type="button" class="tap" data-sa="legBasis" data-v="side" aria-checked="${O.basis === 'side'}">Lift side only</button></div></div>`,
      { foot: O.basis === 'full' ? 'Safer: the load swings round on its way, and the busiest leg is often when the boom is over a corner. An empty hook with the boom up is counted too.' : 'Only the position over the lift side. Use this when the crane does not slew past the corners.' });
    if (L.unlWorse) out += note('warn', 'alert', `With the hook empty and the boom up, the counterweight puts more on one leg (up to <b>${fmt(Math.max(...OUT_PADS.map(id => L.unl.max[id].v)), 1)} t</b>) than the loaded lift. The ground must take that too.`);
    // ground and mats
    const gp = GROUND_PRESETS.find(x => x[0] === op.ground);
    out += grp('Mats and ground', `${Fx.text('outrigger.mat', 'Mat size', { ph: p.matSize || '2.5x2.5', re: 1 })}${Fx.num('outrigger.matSelf', 'Mat weight', 't', { re: 1 })}${Fx.num('outrigger.matEff', 'Mat spreads the load', '×', { re: 1, sub: '1 = stiff mat, leg in the middle · less for timber or off-centre' })}
      <label class="it"><span class="lb"><b>Ground type</b><small>Rough guide only — a site report wins</small></span><select class="fld" data-gp="1" aria-label="Ground type"><option value="">Pick to fill in…</option>${GROUND_PRESETS.map(([k, t, kpa, txt]) => `<option value="${k}"${op.ground === k ? ' selected' : ''}>${h(t)} · ${txt}</option>`).join('')}</select></label>
      ${Fx.num('outrigger.allow', 'Ground can take', 't/m²', { re: 1, ph: 'not checked', sub: gp ? `${gp[1]}: ${gp[2]} kPa = ${fmt(gp[2] / OUT_G, 1)} t/m²` : '' })}${Fx.num('outrigger.maxLoad', 'Leg load from the crane maker', 't', { re: 1, ph: 'not entered', sub: 'From the maker\'s planner — it wins over the numbers here' })}
      ${g ? `<div class="it"><span class="lb"><b>Pressure under the busiest leg</b><small>${g.P.toFixed(1)} t${{ maker: ' from the maker', illus: ' typed by hand', calc: ' worked out', est: ' estimate' }[g.src] || ''} + mat ÷ ${g.area.toFixed(2)} m²${g.eff < 1 ? ' × ' + g.eff : ''}</small></span><span class="vl num" style="font-size:20px;font-weight:750;color:var(--${g.status === 'fail' ? 'stop' : g.status === 'warn' ? 'warn' : g.status === 'ok' ? 'safe' : 'ink-2'})">${gbpTxt(g.press)}</span></div>${g.allow ? `<div class="it gbp-v ${g.status}"><span class="gbp-chip">${ic(g.status === 'fail' ? 'stop' : g.status === 'warn' ? 'alert' : 'check', 16, 3)}${g.status === 'fail' ? 'FAIL' : g.status === 'warn' ? 'CLOSE' : 'PASS'}</span><span class="lb"><b>${gbpTxt(g.press)} on ${gbpTxt(g.allow)} allowed</b><small>${g.status === 'fail' ? 'The ground cannot take it — bigger mats or better ground' : g.status === 'warn' ? 'Within 10% of what the ground can take' : 'The ground takes it'}</small></span></div>` : ''}${g.side ? Fx.ro('Smallest mat that works', gbpMat(g)) : ''}` : ''}
      ${Fx.sw('outrigger.enabled', 'Print the ground table on the sheet')}`, { foot: 'Water, made ground, buried services, trenches and slab edges change everything. In the UAE, reclaimed land, sabkha and loose dune sand can be far weaker than they look.' });
    // typed by hand — for pictures only
    out += grp('Type leg loads by hand', `${Fx.swRaw('data-sa-sw="legMan"', 'Type some leg loads myself', man, { sub: 'For a picture or a talk only — not real data' })}${man ? OUT_PADS.map(id => Fx.num('padMan.' + id, OUT_PAD_NAME[id], 't', { ph: fmt((O.basis === 'side' ? O.sideMax : O.sweepMax)[id].v, 1), re: 1 })).join('') : ''}`,
      { foot: man ? '<span style="color:var(--stop);font-weight:650">Numbers you type here are not real crane data.</span> Leave a box empty to keep the worked-out value. The sheet marks typed legs with * and prints ILLUSTRATIVE — NOT FOR LIFTING.' : '' });
    // model
    const tip = Number.isFinite(L.tip) ? `${fmt(L.tip, 1)} t` : 'never (hook inside the legs)';
    out += grp('Tipping check (model)', `<div class="dial-out" style="padding:12px"><div class="mini ${L.stabUtil > 100 ? 'fail' : L.stabUtil > 90 ? 'warn' : ''}"><span>Tips at about</span><b>${Number.isFinite(L.tip) ? fmt(L.tip, 1) + '<small>t</small>' : '—'}</b></div><div class="mini"><span>85 % of that</span><b>${Number.isFinite(L.rated) ? fmt(L.rated, 1) + '<small>t</small>' : '—'}</b></div><div class="mini"><span>On the hook</span><b>${fmt(L.hookT, 1)}<small>t</small></b></div></div>`,
      { raw: true, foot: `Tipping load over the ${SIDE_WORD[L.side]} at this reach: ${tip}. ${O.est ? 'Worked out from <b>estimated</b> crane weights (carrier, boom, counterweight) — add the maker\'s figures under Fleet to make it real.' : 'From the crane weights in the fleet.'} The load chart always decides what the crane may lift.` });
    out += `<p class="hint" style="margin-top:14px">Simulation only — check against the crane maker's outrigger-load data and a ground assessment. Rigid-chassis model: real carriers twist, and soft ground moves load between legs.</p>`;
    return out;
  }
};
SA_EXTRA.legExt = (d) => { const p = state.plan; const e = outExtOf(p); e[d.side] = d.v === 'half' ? 'half' : 'full'; p.outExt = e; commit({ sheet: true }); toast(outExtHalf(e) ? `${d.side === 'left' ? 'Left' : 'Right'} legs ${d.v === 'half' ? 'half out — use the half-outrigger chart' : 'fully out'}` : 'All legs fully out'); };
SA_EXTRA.legBasis = (d) => { const p = state.plan; p.outrigger = { ...(p.outrigger || {}), basis: d.v === 'side' ? 'side' : 'full' }; commit({ sheet: true }); };
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset?.saSw === 'legMan') { V7.legMan = t.checked; if (!t.checked) { state.plan.padMan = {}; commit({ sheet: true }); toast('Back to the worked-out leg loads'); } else sheetRefresh(); return; }
  if (t.dataset?.gp && t.closest('#sheet')) { const gp = GROUND_PRESETS.find(x => x[0] === t.value); const p = state.plan; p.outrigger = { ...(p.outrigger || {}), ground: t.value }; if (gp) p.outrigger.allow = r2(gp[2] / OUT_G); commit({ sheet: true }); }
});

// ---------- every value printed on the A1 sheet, typed over by hand ----------
function sheetOvSet(id, v) { const p = state.plan; const R = p.sheetRows = p.sheetRows || { hide: {}, show: {}, custom: [] }; R.ov = R.ov || {}; if (String(v).trim() === '') delete R.ov[id]; else R.ov[id] = String(v); }
SH.sheetData = {
  title: () => 'Values on the sheet', icon: 'sheet', sub: true,
  body() {
    const p = state.plan, calc = state.calc, S = settingsEff(); const ov = p.sheetRows?.ov || {};
    const row = (r) => r.id ? `<div class="it ovr${r.ov ? ' on' : ''}"><span class="lb"><b>${h(r.label)}</b><small>${r.ov ? 'Worked out: ' + h(r.calc || '—') : 'Worked out'}</small></span><input class="fld" type="text" autocomplete="off" data-ov="${h(r.id)}" value="${h(ov[r.id] ?? '')}" placeholder="${h(r.calc)}" aria-label="${h(r.label)}">${r.ov ? `<button type="button" class="btn sm tap" data-sa="ovClr" data-id="${h(r.id)}" aria-label="Use the worked-out value">${ic('undo', 16)}</button>` : ''}</div>`
      : Fx.ro(r.label, h(r.v), { sub: 'your own row — change it under What prints' });
    const n = (calc.sheetOv || []).length;
    let out = note(n ? 'warn' : '', n ? 'hand' : 'info', n ? `<b>${n} value${n > 1 ? 's' : ''} typed by hand.</b> The sheet prints what you typed instead of the worked-out number. The Appointed Person must check them.` : 'Type over anything printed in the data panel. Leave a box empty to print the worked-out value (shown in grey).');
    out += grp('Title block', `${Fx.text('meta.title', 'Drawing title')}${Fx.text('meta.client', 'Client')}${Fx.text('meta.project', 'Project')}${Fx.text('meta.drawingNo', 'Drawing no')}${Fx.text('meta.sheetNo', 'Sheet no')}${Fx.text('meta.scale', 'Scale', { ph: 'auto' })}${Fx.text('meta.drawnBy', 'Drawn by')}${Fx.text('meta.checkedBy', 'Checked by')}${Fx.text('meta.date', 'Date')}`);
    let blocks = []; try { blocks = sheetBlocks(p, calc, S); } catch (e) { console.error(e); }
    for (const b of blocks) if (b.rows.length) out += grp(b.head || 'Crane and load data', b.rows.map(row).join(''));
    if (p.outrigger?.enabled && calc.ground) {
      const O = calc.outr;
      out += grp('Outrigger pressure table', groundRows(p, calc).map(row).join('') + (O ? OUT_PADS.map(id => Fx.num('padMan.' + id, `Leg load ${id}`, 't', { ph: fmt(O.calc[id], 1), re: 1, sub: 'typed = illustration only' })).join('') : ''),
        { foot: 'Leg loads you type are printed with * and ILLUSTRATIVE — NOT FOR LIFTING.' });
    }
    const wx = calc.weather && p.weather?.print !== false ? calc.weather : null;
    if (wx) out += grp('Weather table', wxRows(p, wx).map(row).join(''));
    if (n) out += `<button type="button" class="btn wide danger tap" data-sa="ovClrAll" style="margin-top:16px">Use every worked-out value</button>`;
    return out;
  }
};
SA_EXTRA.ovClr = (d) => { sheetOvSet(d.id, ''); commit({ sheet: true }); };
SA_EXTRA.ovClrAll = (d, b) => { if (!confirmTap(b, 'Tap again to clear them all')) return; state.plan.sheetRows.ov = {}; commit({ sheet: true }); toast('The sheet prints the worked-out values again'); };
document.addEventListener('input', (e) => { const t = e.target; if (t.dataset?.ov != null && t.closest('#sheet')) { sheetOvSet(t.dataset.ov, t.value); t.closest('.ovr')?.classList.toggle('on', t.value.trim() !== ''); markDirty(); refresh(); } });
document.addEventListener('change', (e) => { const t = e.target; if (t.dataset?.ov != null && t.closest('#sheet')) { histMark(); sheetRefresh(); } });
