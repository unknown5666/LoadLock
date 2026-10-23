// ===== v11 duty: the load chart follows what is rigged on the crane =====
// The crane is set up the way it stands on site (counterweight, Y-guying, fly jib or luffing jib, boom length) and the maker's chart
// for that set-up is found in the library, so the safe load changes as the boom telescopes or a jib / Y-guying goes on or comes off.
// Rules (all conservative):
//  · family first: main boom / fly jib / luffing jib, guyed or not, superlift or not. A chart for another rigging is never used.
//  · counterweight: the heaviest chart counterweight that is not more than what is fitted (a chart for more ballast would overstate).
//  · lift side: a chart that covers the side when there is one (otherwise the side check in computeLoad fails the lift).
//  · boom: a main chart reads the column for the boom length (between two columns: the lower of the two, in computeLoad).
//    Jib charts are printed for set boom lengths only, so the boom snaps to the nearest length that has a chart.
//  · jib length, offset and main-boom angle: snapped to what the charts print.
const DUTY_WORD = { main: 'main boom', fixedjib: 'fly jib', luffing: 'luffing jib' };
function chartFam(ch) {
  const cfg = String(ch?.config || '').toUpperCase().replace(/MAINBOOM/g, ''); const nm = String(ch?.name || '').toLowerCase();
  return { kind: ch?.kind || 'main', yguy: /Y/.test(cfg) || /\bguyed\b|y-guy/.test(nm), superlift: /SSL|SL$|SUPERLIFT/.test(cfg) || /superlift/.test(nm) };
}
// the boom length a jib chart is printed for, as the telescopic boom shows it (without the jib adapter)
function jibMainL(ch) { return num(ch?.mainLabel) > 0 ? num(ch.mainLabel) : num(ch?.mainLen); }
function chartCwt(ch) { const v = num(ch?.cwt, NaN); return Number.isFinite(v) && v > 0 ? v : null; }
function dutyWant(plan, crane) {
  const at = plan?.attach || {}, a = plan?.acc || {}, av = crane?.acc || [];
  const kind = at.type === 'fly' ? 'fixedjib' : at.type === 'luff' ? 'luffing' : 'main';
  const cw = plan?.cwt !== '' && plan?.cwt != null && num(plan.cwt) > 0 ? num(plan.cwt) : null;
  return { kind, ext: !!at.ext, yguy: !!a.yguy && (av.includes('yguy') || dutyHas(crane, { yguy: true })), superlift: !!a.superlift && av.includes('superlift'), cwt: cw, jibLen: num(at.jibLen, 0), offset: num(at.offset, 0), boomAngle: num(at.boomAngle, 83) };
}
function dutyHas(crane, f) { return (crane?.charts || []).some(ch => { const g = chartFam(ch); return Object.keys(f).every(k => g[k] === f[k]); }); }
// every chart of the family the crane is rigged for
function dutyFamily(crane, want) {
  const out = []; (crane?.charts || []).forEach((ch, i) => { const f = chartFam(ch); if (f.kind === want.kind && f.yguy === !!want.yguy && f.superlift === !!want.superlift) out.push({ ch, i, f }); });
  return out;
}
// the counterweights the charts of this family are printed for (heaviest first)
function dutyCwts(crane, want) { return [...new Set(dutyFamily(crane, want).map(o => chartCwt(o.ch)).filter(v => v != null))].sort((a, b) => b - a); }
// the counterweight on the crane: typed, else the one of the chart in use, else the crane record's
function dutyFitted(plan, crane) {
  if (plan?.cwt !== '' && plan?.cwt != null && num(plan.cwt) > 0) return num(plan.cwt);
  const cur = crane?.charts?.[+plan?.chartIdx]; return chartCwt(cur) ?? (num(crane?.cwt) > 0 ? num(crane.cwt) : null);
}
function nearestBy(arr, f, v) { let best = null, bd = Infinity; for (const o of arr) { const d = Math.abs(f(o) - v); if (d < bd - 1e-9) { bd = d; best = o; } } return best; }
// what is missing, in plain words, when no chart of the family fits
function dutyNoChart(crane, want, extra) {
  const what = (want.yguy ? 'Y-guyed ' : '') + (want.superlift ? 'superlift ' : '') + DUTY_WORD[want.kind];
  return `No ${what} chart for the ${crane?.model || 'crane'} in the library${extra ? ' ' + extra : ''}. ${want.kind === 'main' ? (want.yguy ? 'Take the Y-guying off, or type' : 'Type') : 'Type'} the capacity from the maker's chart for this set-up.`;
}
// → { kind, chartIdx, colIdx, boomOverride, L, jibLen, offset, boomAngle, cwt, why, snapped:{…} }
//   chartIdx −1 = no chart for this set-up (why says what is missing)
function resolveDuty(plan, crane, o = {}) {
  const want = dutyWant(plan, crane); const res = { kind: want.kind, chartIdx: -1, colIdx: 0, boomOverride: '', why: '', snapped: {}, want };
  const L = num(o.L, 0); res.L = L;
  let fam = dutyFamily(crane, want);
  if (!fam.length) { res.why = dutyNoChart(crane, want); res.boomOverride = L > 0 ? L : ''; return res; }
  // lift side first: a chart that covers it, when there is one
  const side = o.side || 'rear'; const cov = fam.filter(x => chartCoversSide(x.ch, side)); if (cov.length) fam = cov; else res.sideMiss = true;
  // counterweight: the heaviest chart ballast not above what is fitted
  const fitted = o.cwt != null ? num(o.cwt) : dutyFitted(plan, crane); res.fitted = fitted;
  if (fitted != null) {
    const ok = fam.filter(x => chartCwt(x.ch) == null || chartCwt(x.ch) <= fitted + 1e-6);
    if (!ok.length) { const need = Math.min(...fam.map(x => chartCwt(x.ch)).filter(v => v != null)); res.needCwt = need; res.why = `The ${DUTY_WORD[want.kind]} charts need at least ${fmtN(need)} t counterweight; ${fmtN(fitted)} t is fitted.`; res.boomOverride = L > 0 ? L : ''; return res; }
    const top = Math.max(...ok.map(x => chartCwt(x.ch) ?? -1)); fam = ok.filter(x => (chartCwt(x.ch) ?? -1) === top); res.cwt = top > 0 ? top : null;
  } else { const top = Math.max(...fam.map(x => chartCwt(x.ch) ?? -1)); fam = fam.filter(x => (chartCwt(x.ch) ?? -1) === top); res.cwt = top > 0 ? top : null; res.cwtUnknown = true; }
  const curI = +plan?.chartIdx;
  if (want.kind === 'main') {
    // the chart in use when it is still in the family (keeps an outrigger / sector choice), else the first one
    const pick = fam.find(x => x.i === curI) || fam[0]; res.chartIdx = pick.i; const pr = getChart(pick.ch);
    if (pr && pr.cols.length) {
      const curLab = pr.cols[+plan?.colIdx]?.label || ''; let best = 0, bd = Infinity;
      pr.cols.forEach((c, i) => { const d = Math.abs(c.L - L) + ((c.label || '') === curLab ? 0 : 0.01); if (d < bd) { bd = d; best = i; } });
      res.colIdx = best; res.boomOverride = L > 0 && bd >= 0.45 ? L : '';
    }
    return res;
  }
  // jib charts: the boom length, then the jib length, then the column (offset or main-boom angle)
  const mainLs = [...new Set(fam.map(x => jibMainL(x.ch)).filter(v => v > 0))].sort((a, b) => a - b);
  const mL = L > 0 ? nearestBy(mainLs, v => v, L) : mainLs[0]; res.L = mL; if (L > 0 && Math.abs(mL - L) > 0.05) res.snapped.L = [L, mL];
  const onL = fam.filter(x => Math.abs(jibMainL(x.ch) - mL) < 1e-6);
  const jls = [...new Set(onL.map(x => num(x.ch.jibLen)).filter(v => v > 0))].sort((a, b) => a - b);
  const jl = jls.length ? nearestBy(jls, v => v, want.jibLen || jls[0]) : null; res.jibLen = jl; if (jl != null && want.jibLen > 0 && Math.abs(jl - want.jibLen) > 0.05) res.snapped.jibLen = [want.jibLen, jl];
  const onJ = onL.filter(x => jl == null || Math.abs(num(x.ch.jibLen) - jl) < 1e-6);
  const pick = onJ.find(x => x.i === curI) || onJ[0]; res.chartIdx = pick.i; const pr = getChart(pick.ch);
  const target = want.kind === 'fixedjib' ? want.offset : want.boomAngle;
  if (pr && pr.cols.length) {
    const vals = [...new Set(pr.cols.map(c => c.L))]; const v = nearestBy(vals, x => x, target); res.colIdx = pr.cols.findIndex(c => c.L === v);
    // columns printed twice (some imported tables): the one with the most values
    let bestN = -1; pr.cols.forEach((c, i) => { if (c.L !== v) return; const n = pr.rows.filter(r => r[i + 1] != null).length; if (n > bestN) { bestN = n; res.colIdx = i; } });
    if (want.kind === 'fixedjib') { res.offset = v; if (Math.abs(v - want.offset) > 0.05) res.snapped.offset = [want.offset, v]; }
    else { res.boomAngle = v; if (Math.abs(v - want.boomAngle) > 0.05) res.snapped.boomAngle = [want.boomAngle, v]; }
  }
  return res;
}
const fmtN = (v) => (Math.round(num(v) * 10) / 10).toString();
// the choices the set-up screen offers: counterweights, boom lengths with a jib chart, jib lengths, offsets / angles
function dutyOptions(plan, crane, L) {
  const want = dutyWant(plan, crane); const fam = dutyFamily(crane, want); const out = { want, cwts: dutyCwts(crane, want), mainLs: [], jibLs: [], cols: [] };
  const anyKind = (k) => dutyHas(crane, { kind: k }); out.has = { fly: anyKind('fixedjib'), luff: anyKind('luffing'), yguy: dutyHas(crane, { yguy: true }), superlift: dutyHas(crane, { superlift: true }) };
  if (want.kind === 'main' || !fam.length) return out;
  const fitted = dutyFitted(plan, crane); const f2 = fitted != null ? fam.filter(x => chartCwt(x.ch) == null || chartCwt(x.ch) <= fitted + 1e-6) : fam;
  out.mainLs = [...new Set(f2.map(x => jibMainL(x.ch)).filter(v => v > 0))].sort((a, b) => a - b);
  const mL = out.mainLs.length ? nearestBy(out.mainLs, v => v, num(L, out.mainLs[0])) : null;
  const onL = f2.filter(x => mL != null && Math.abs(jibMainL(x.ch) - mL) < 1e-6);
  out.jibLs = [...new Set(onL.map(x => num(x.ch.jibLen)).filter(v => v > 0))].sort((a, b) => a - b);
  const jl = out.jibLs.length ? nearestBy(out.jibLs, v => v, want.jibLen || out.jibLs[0]) : null;
  const vals = new Set(); for (const x of onL) if (jl == null || Math.abs(num(x.ch.jibLen) - jl) < 1e-6) { const pr = getChart(x.ch); if (pr) pr.cols.forEach((c, ci) => { if (pr.rows.some(r => r[ci + 1] != null)) vals.add(c.L); }); }
  out.cols = [...vals].sort((a, b) => a - b);
  return out;
}
// does the chart in use match the set-up? (cheap: one chart, no search) → a check or null
function dutyCheck(plan, crane, chartDef, G) {
  const want = dutyWant(plan, crane);
  if (!chartDef) {
    if (G?.manual) return null;
    if (!(crane?.charts || []).length) return { s: 'fail', t: 'Load chart', m: `There is no load chart for the ${crane?.model || 'crane'} in the library yet. Type the capacity from the maker's chart, or add the chart under Fleet.` };
    const fam = dutyFamily(crane, want); if (!fam.length) return { s: 'fail', t: 'Load chart', m: dutyNoChart(crane, want) };
    const d = resolveDuty(plan, crane, {}); return { s: 'fail', t: 'Load chart', m: d.why || 'No load chart is picked for this set-up. Open Crane → Set-up, or type the capacity.' };
  }
  const f = chartFam(chartDef);
  if (want.yguy && !f.yguy && dutyHas(crane, { kind: f.kind, yguy: true })) return { s: 'warn', t: 'Y-guying', m: 'Y-guying is on but the capacity comes from the chart without it. Open Crane → Set-up so the Y-guy chart is used.' };
  if (want.yguy && !f.yguy) return { s: 'warn', t: 'Y-guying', m: dutyNoChart(crane, { ...want }, '— the capacity shown is from the chart without Y-guying') };
  const cw = chartCwt(chartDef);
  if (want.cwt != null && cw != null && cw > want.cwt + 1e-6) return { s: 'fail', t: 'Counterweight', m: `This chart is for ${fmtN(cw)} t counterweight but ${fmtN(want.cwt)} t is fitted. Use a chart for ${fmtN(want.cwt)} t or less.` };
  return null;
}
