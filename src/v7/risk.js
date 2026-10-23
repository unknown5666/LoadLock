// ===== v10 risk assessment that fills itself: a hazard library, the register built from the plan, and the "Site hazards" sheet =====
// riskRegister(plan, calc) → rows, one per hazard that applies to THIS lift. A hazard is in the register when
//   (a) it is a core hazard of any crane lift (overload, ground, strike, rigging, weather, people, landing, signals),
//   (b) the engine switched it on (a check is amber or red, utilisation is high, tandem, side lift, a wire near the boom …), or
//   (c) the Appointed Person ticked it in the Site hazards sheet (plan.risk.haz[id]), or typed it as an extra (plan.risk.extra).
// Scores are 5 × 5 (likelihood × severity). A check that is red cannot be argued down by controls: its residual stays where it started.
// The report pack (report.js) draws the matrix and the register from these rows and takes its method-statement steps from `step`.
const RISK_L = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'];
const RISK_S = ['First aid', 'Minor injury', 'Lost time', 'Major injury', 'Fatality'];
const RISK_BANDS = [[4, { k: 'low', label: 'Low', col: '#1b7a46', bg: '#e3f1e9' }], [9, { k: 'med', label: 'Medium', col: '#8a6a00', bg: '#fff1bf' }], [16, { k: 'high', label: 'High', col: '#b35400', bg: '#fbdcb8' }], [25, { k: 'ext', label: 'Extreme', col: '#c8102e', bg: '#f6c4cb' }]];
function riskBand(score) { return RISK_BANDS.find(b => score <= b[0])[1]; }

function riskCtx(plan, calc) {
  const li = Math.min(plan.loads.length - 1, Math.max(0, Math.round(num(plan.activeLoad, 0)))); const r = calc.loads[li], l = plan.loads[li]; const S = settingsEff();
  const crane = r.crane || calc.crane, T = r.tandem || null, rigI = r.rigI || 0; const pv = (calc.rigs || []).find(q => q.i === rigI)?.pv || plan; const ch = r.chartDef;
  const O = (calc.outrigs || []).find(o => o.rigI === rigI) || calc.outr || null; const ext = typeof outExtOf === 'function' ? outExtOf(pv) : { left: 'full', right: 'full' };
  return { plan, calc, li, r, l, S, crane, T, pv, ch, O, g: calc.ground || null, ck: allChecks(calc), util: T ? T.maxUtil : r.util, limit: T ? T.derate : num(S.utilMax, 90), wx: calc.weather || null, minClr: num(S.minClearance, 1), side: sideOf(l), ext,
    legs: outExtLabel(ext).toLowerCase(), cwt: num(pv.cwt !== '' && pv.cwt != null ? pv.cwt : (ch?.cwt ?? crane.cwt)), boom: r.tele?.L ?? r.geo?.L, falls: pv.falls || r.col?.falls, extra: [], obs: (plan.site?.obstacles || []) };
}
function riskStat(x, re) { const c = x.ck.filter(q => re.test(q.t)); return c.some(q => q.s === 'fail') ? 'fail' : c.some(q => q.s === 'warn') ? 'warn' : 'ok'; }
const riskT = (v, d = 1) => fmt(v, d) + ' t';
const riskObs = (x, re) => x.obs.find(o => re.test(`${o.type || ''} ${o.label || ''}`));

// L = likelihood before controls, S = severity, LR = likelihood after the controls are in place (1–5). cat groups the tick list.
// tick: the sheet offers it as a tick; core: always in the register; auto(x): a string (the reason) when the plan switches it on.
const RISK_LIBRARY = [
  // ---- core: every crane lift ----
  { id: 'overload', core: 1, cat: 'The lift', name: 'Crane overloaded or overturned', L: 3, S: 5, LR: 1, owner: 'Appointed Person',
    stat: (x) => riskStat(x, /Capacity|Load chart|Lift side|Geometry|Tandem ·|Hoist line|Tandem balance/),
    why: (x) => x.r.cap == null ? `No chart capacity at ${fmt(x.r.R, 1)} m.` : `${fmt(x.util, 1)}% of the ${x.T ? 'tandem limit (' + x.T.derate + '%)' : 'chart'} at ${fmt(x.r.R, 1)} m. Net capacity ${riskT(x.r.netCap, 2)} for ${riskT(x.r.design, 2)}.`,
    controls: (x) => [`Set the LMI to this configuration before the first lift: ${x.ch ? x.ch.name : 'the chart on the plan'}, ${fmt(x.cwt, 1)} t counterweight, ${x.legs} outriggers, ${fmt(x.boom, 1)} m boom${x.falls ? ', ' + x.falls + ' falls' : ''}.`, `Weight of the load confirmed before rigging. Hook load ${riskT(x.r.total, 2)}.`, `Stop at ${fmt(x.limit, 0)}% of the chart or at any LMI warning.`] },
  { id: 'ground', core: 1, cat: 'The ground', name: 'Ground or outrigger failure', L: 3, S: 5, LR: 1, owner: 'Lift supervisor',
    stat: (x) => { const s = riskStat(x, /Leg loads|Ground pressure/); const gs = x.g ? (x.g.status === 'fail' ? 'fail' : x.g.status === 'ok' ? 'ok' : 'warn') : 'warn'; return s === 'fail' || gs === 'fail' ? 'fail' : s === 'warn' || gs === 'warn' ? 'warn' : 'ok'; },
    why: (x) => x.g ? `Busiest leg ${riskT(x.g.P, 1)} on ${x.g.mat}: ${gbpTxt(x.g.press)}${x.g.allow ? ' against ' + gbpTxt(x.g.allow) + ' allowed' : ', allowable not entered'}.` : 'Ground bearing is not checked on this plan.',
    controls: (x) => [`Mats ${x.g?.mat || x.pv.matSize || 'as planned'} under every pad, tight to the pad, on ground that has been levelled and compacted. Pack any void.`, `Outriggers ${x.legs}, cylinders down until the tyres are clear. Level the crane before the boom leaves its rest.`, 'Walk the footprint and slew area for voids, trenches, drains and buried services.', 'Watch the legs through the trial lift. Any settlement: lower and re-pack.'] },
  { id: 'strike', core: 1, cat: 'The lift', name: 'Boom or load strikes a structure', L: 2, S: 4, LR: 1, owner: 'Signaller',
    stat: (x) => riskStat(x, /Boom clearance|Headroom/),
    why: (x) => x.r.clearance != null ? `Closest gap ${fmt(x.r.clearance, 2)} m${x.r.clearLine?.label ? ' to ' + String(x.r.clearLine.label).toLowerCase() : ''} (minimum ${fmt(x.minClr, 1)} m).` : 'No structures entered near the boom path.',
    controls: (x) => [`Signaller watches the gap${x.r.clearance != null ? ` (${fmt(x.r.clearance, 1)} m now)` : ''} and calls every slew.`, 'Slew and luff slowly near structures; one motion at a time.', 'Tag lines on the load, held from outside the swing.'] },
  { id: 'rigging', core: 1, cat: 'The load', name: 'Load or rigging failure', L: 2, S: 5, LR: 1, owner: 'Slinger',
    stat: (x) => riskStat(x, /Sling|Shackle|Tackle|Rigging/),
    why: (x) => { const it = (x.r.stack?.items || []).filter(i => i.util != null || i.T != null).sort((a, b) => (b.util || 0) - (a.util || 0))[0]; return (x.r.stack?.items || []).length ? `${x.r.stack.items.length} item${x.r.stack.items.length > 1 ? 's' : ''} below the hook, ${riskT(x.r.tk, 2)}${it && it.util != null ? `. ${it.name} carries ${fmt(it.T, 2)} t per leg (${fmt(it.util, 0)}% of WLL)` : ''}.` : x.r.sling ? `${x.r.sling.label}, ${fmt(x.r.sling.T, 2)} t per leg at ${fmt(x.r.sling.ang, 0)}°.` : 'Tackle weight is a single figure on the plan.'; },
    controls: (x) => ['Certified tackle only. The slinger reads each tag against its certificate before it goes on the hook.', 'Sling legs at 45° or more to the horizontal. Pad every edge.', 'Reject on sight: cuts, kinks, stretched or bent links, damaged tags.', 'Trial lift 100–300 mm first.'] },
  { id: 'wind', core: 1, cat: 'The weather', name: 'Wind and weather', L: 2, S: 4, LR: 1, owner: 'Lift supervisor',
    stat: (x) => riskStat(x, /Weather|Wind on the load/),
    why: (x) => x.r.wind ? `Wind area ${fmt(x.r.wind.AW, 1)} m²: lift only up to ${fmt(x.r.wind.vPerm, 1)} m/s at the boom head${x.r.wind.vDes != null ? ` (forecast gust ${fmt(x.r.wind.vDes, 1)} m/s)` : ''}.` : x.wx ? `Gusts ${fmt(x.wx.maxG, 1)} m/s at the boom head against a ${fmt(x.wx.limit, 1)} m/s limit.` : 'No forecast on the plan. The chart wind limit applies.',
    controls: (x) => [`Anemometer on the boom head, read before the lift and through it. Stop at ${x.r.wind ? fmt(x.r.wind.vPerm, 1) : x.wx ? fmt(x.wx.limit, 1) : '9.8'} m/s.`, 'Forecast checked on the morning of the lift. Lightning within 10 km: stop and lower.', 'Large flat loads catch wind: tag lines and a slow slew.'] },
  { id: 'people', core: 1, cat: 'The site', name: 'People struck by the load or the slewing crane', L: 3, S: 5, LR: 1, owner: 'Lift supervisor',
    stat: () => 'ok',
    why: (x) => `Load path to ${fmt(x.r.R, 1)} m, tail swing ${fmt(num(x.crane.tail, 4), 1)} m.${x.obs.some(o => o.type === 'person') ? ' People are shown on the plan near the lift.' : ''}`,
    controls: (x) => [`Exclusion zone barriered out to ${fmt(Math.max(num(x.crane.tail, 4), 3) + 1, 0)} m round the crane and under the load path.`, 'Nobody under a suspended load. One signaller in charge, in sight of the operator.', 'Everyone inside the zone has been briefed and has signed the briefing sheet.'] },
  { id: 'landing', core: 1, cat: 'The load', name: 'Load swings, spins or lands badly', L: 3, S: 3, LR: 1, owner: 'Slinger',
    stat: () => 'ok',
    why: (x) => `${x.l.name || 'The load'} ${fmt(num(x.l.l, 0), 1)} × ${fmt(num(x.l.h, 0), 1)} m, landing at ${fmt(x.r.landY, 2)} m.`,
    controls: (x) => ['Tag lines on both ends.', 'Land on packing so the slings can come out. No hand under the load.', 'Take the weight off slowly. Release only when the load is stable and the slings are slack.'] },
  { id: 'comms', core: 1, cat: 'The site', name: 'Radio or signals lost', L: 3, S: 3, LR: 1, owner: 'Signaller',
    stat: () => 'ok',
    why: () => 'Operator and signaller depend on one radio channel.',
    controls: () => ['Radio check before the first lift. Hand signals agreed and briefed as the fallback.', 'Radio lost: stop all motion and lower to a safe position.', 'One person gives signals. Anyone may call STOP.'] },
  // ---- switched on by the lift ----
  { id: 'highutil', cat: 'The lift', name: 'High utilisation, little reserve', L: 4, S: 5, LR: 2, owner: 'Appointed Person',
    auto: (x) => x.util != null && x.util >= num(x.S.utilWarn, 75) && x.r.cap != null ? `${fmt(x.util, 1)}% of the ${x.T ? 'tandem limit' : 'chart'} (warning from ${fmt(num(x.S.utilWarn, 75), 0)}%).` : null,
    stat: (x) => x.util > x.limit ? 'fail' : x.util > x.limit * 0.9 ? 'warn' : 'ok',
    why: (x) => `${fmt(x.util, 1)}% used. Only ${fmt(x.r.margin, 1)}% of the chart in hand.`,
    controls: (x) => ['Critical lift: the Appointed Person is on site and signs the permit.', 'No change to radius, boom or load after the trial lift without re-checking the chart.', 'Hoist and slew slowly. Wind at 70% of the limit or less.'],
    step: (x) => ['lift', 'Critical lift', `Utilisation is ${fmt(x.util, 1)}%. The Appointed Person watches the LMI through the lift. Nothing changes without a stop.`, 'AP'] },
  { id: 'liftoff', cat: 'The ground', name: 'Outrigger goes light or the crane tips', L: 3, S: 5, LR: 1, owner: 'Lift supervisor',
    auto: (x) => { const c = x.ck.find(q => /Leg loads/.test(q.t) && (q.s === 'warn' || q.s === 'fail')); return c ? String(c.m).slice(0, 140) : null; },
    stat: (x) => riskStat(x, /Leg loads/),
    why: (x) => String((x.ck.find(q => /Leg loads/.test(q.t)) || {}).m || '').slice(0, 160),
    controls: (x) => [`Outriggers ${x.legs}. Do not slew to a sector where a leg is light.`, 'Fit the full counterweight for the chart. Stay inside the chart sector.', 'Stop if a pad moves or the crane tilts.'] },
  { id: 'sidelift', cat: 'The lift', name: 'Lift over the side of the carrier', L: 2, S: 5, LR: 1, owner: 'Operator',
    auto: (x) => x.side !== 'rear' ? `Lifting over the ${SIDE_WORD[x.side]}.` : null, stat: (x) => riskStat(x, /Lift side/),
    why: (x) => `Over the ${SIDE_WORD[x.side]} at ${fmt(x.r.R, 1)} m. ${x.r.sideOk === false ? 'The chart does not cover this side.' : 'The chart covers this side.'}`,
    controls: (x) => [`Use only the chart sector for the ${SIDE_WORD[x.side]}: ${x.ch ? x.ch.name : 'as on the plan'}.`, 'Slew limiter or marker set so the boom cannot leave the sector.', 'Outriggers fully out on the lift side.'],
    step: (x) => ['before', 'Lift side', `The load goes over the ${SIDE_WORD[x.side]}. Set the slew limit on that sector and tell the operator which chart applies.`, 'Operator'] },
  { id: 'tandem', cat: 'The lift', name: 'Two cranes on one load', L: 4, S: 5, LR: 2, owner: 'Lift supervisor',
    auto: (x) => x.T ? `${x.T.picks.length} cranes share ${riskT(x.T.W, 2)}.` : null, stat: (x) => riskStat(x, /Tandem|Hoist line|Load tilt/),
    why: (x) => x.T ? `${x.T.picks.map(p => `C${p.crane + 1} ${riskT(p.share, 2)}`).join(', ')}. Busiest at ${fmt(x.T.maxUtil, 1)}% of its chart (limit ${x.T.derate}%).` : '',
    controls: (x) => [`One lift supervisor directs every operator on a dedicated radio channel.`, `Each crane at ${x.T?.derate || 80}% of its own chart or less. Hoist lines within 1° of plumb; stop at 3°.`, 'One motion at a time, slowly. Read both LMIs after each move.', 'Rehearse with the load on the ground.'],
    step: (x) => ['before', 'Tandem briefing', 'Walk through the lift with both operators and the lift supervisor. Agree the radio channel, the order of movements and who calls STOP.', 'Supervisor'] },
  { id: 'powerlines', tick: 1, cat: 'Around the lift', name: 'Overhead power lines', L: 3, S: 5, LR: 1, owner: 'Appointed Person',
    help: 'Any overhead line the boom, the rope or the load could reach. Look up before you look at the ground.',
    auto: (x) => { const o = riskObs(x, /power|overhead|cable|pylon|line|pole/i); return o ? `${o.label || o.type} on the plan.` : null; },
    why: (x) => { const o = riskObs(x, /power|overhead|cable|pylon|line|pole/i); return o ? `${o.label || o.type} near the lift${o.x != null ? ' at ' + fmt(num(o.x), 1) + ' m' : ''}.` : 'Overhead lines near the lift (ticked).'; },
    controls: () => ['Line owner and voltage found out before set-up.', 'Boom, rope and load kept at least 6 m from the line, and further for lines above 33 kV, unless the owner gives written clearance or isolates the line.', 'Goal-post markers or a banksman on the line side. Slew limit set.', 'If anything touches a line: stay in the cab, warn everyone, do not step down until the owner says it is dead.'],
    step: () => ['before', 'Overhead lines', 'Walk the boom path with the signaller and mark every line. Agree the safe distance with the line owner and set the slew limit before the first lift.', 'AP'] },
  { id: 'public', tick: 1, cat: 'Around the lift', name: 'Public or traffic close to the lift', L: 3, S: 5, LR: 1, owner: 'Lift supervisor',
    help: 'A road, footpath, shop front or any place where people who are not on your crew can walk.',
    why: () => 'Members of the public or traffic can reach the lift area (ticked).',
    controls: () => ['Close or divert the path and the lane for the duration. Marshals at both ends.', 'Barriers and signs beyond the tail swing and the load path. Lift in a quiet window.', 'Stop the lift if anyone enters the zone.'],
    step: () => ['before', 'Public and traffic', 'Close the road or path and post the marshals. The lift does not start until both ends are covered.', 'Supervisor'] },
  { id: 'overpeople', tick: 1, cat: 'Around the lift', name: 'Lifting over people or occupied buildings', L: 2, S: 5, LR: 1, owner: 'Appointed Person',
    help: 'The load would pass over workers, the public, or a building people are inside.',
    why: () => 'The load path crosses an occupied area (ticked).',
    controls: () => ['Re-route so the load never passes over people. If it cannot be done, clear and barrier the area under the path.', 'Lift when the building or area is empty, with the client\'s written agreement.', 'Shortest route, lowest height, slowest slew.'] },
  { id: 'otherplant', tick: 1, cat: 'Around the lift', name: 'Other cranes or plant working nearby', L: 3, S: 5, LR: 2, owner: 'Lift supervisor',
    help: 'Another crane, a loader or a piling rig whose boom or movements could overlap yours.',
    auto: (x) => (x.plan.cranes || []).length > 1 && !x.T ? `${x.plan.cranes.length} cranes are on this plan.` : null,
    why: (x) => (x.plan.cranes || []).length > 1 && !x.T ? `${x.plan.cranes.length} cranes on this plan, not working together.` : 'Other plant works within reach of this lift (ticked).',
    controls: () => ['Working areas and slew zones agreed in writing and marked on the plan.', 'One person in charge of the overlap. Radio contact between operators.', 'Booms never cross unless the operators have agreed the order.'] },
  { id: 'services', tick: 1, cat: 'The ground', name: 'Buried or live services under the footprint', L: 3, S: 5, LR: 1, owner: 'Lift supervisor',
    help: 'Cables, ducts, pipes or drains under the crane or the mats.',
    why: () => 'Services are known or suspected under the crane footprint (ticked).',
    controls: () => ['Scan and mark services before set-up. Get the drawings from the owner.', 'Hand-dig to prove a service before a mat goes on it. Cover shallow ones with road plates.', 'No outrigger over a duct or a drain that is not rated for it.'] },
  { id: 'excavation', tick: 1, cat: 'The ground', name: 'Excavation, slope or quay edge near the crane', L: 3, S: 5, LR: 1, owner: 'Lift supervisor',
    help: 'A trench, basement, embankment or waterfront close to the outriggers.',
    why: () => 'The crane stands near an edge or a cut (ticked).',
    controls: () => ['Every mat set back from the edge by at least the depth of the cut, and more if the engineer says so.', 'Edge protected and the support of the cut confirmed by the person responsible for it.', 'Check the ground at the edge again after rain or heavy traffic.'] },
  { id: 'softground', tick: 1, cat: 'The ground', name: 'Soft, made or unknown ground', L: 3, S: 5, LR: 2, owner: 'Appointed Person',
    help: 'Reclaimed land, sabkha, dune sand, fill, or anywhere the bearing has not been tested.',
    auto: (x) => x.plan.outrigger?.enabled && x.g && !(x.g.allow > 0) ? 'The ground check is on but the allowable bearing is not entered.' : null,
    stat: (x) => x.g && !(x.g.allow > 0) ? 'warn' : 'ok',
    why: (x) => x.g && !(x.g.allow > 0) ? 'Allowable bearing not entered, so the leg pressure cannot be judged.' : 'Ground of unknown strength (ticked).',
    controls: (x) => ['Allowable bearing taken from the site report. If there is none, test or assume the lowest value for the soil.', `Mats sized for it${x.g?.side ? ': at least ' + fmt(x.g.side, 2) + ' m square for this leg load' : ''}. Add a second layer if in doubt.`, 'Re-level after the trial lift and after the first slew. Settlement means lower and re-pack.'],
    step: () => ['before', 'Ground bearing', 'Get the allowable bearing in writing from the site engineer. If it is not known, treat the ground as soft and size the mats for that.', 'AP'] },
  { id: 'barge', cat: 'The ground', name: 'Lifting from or onto a barge or vessel', L: 3, S: 5, LR: 2, owner: 'Appointed Person',
    auto: (x) => x.plan.site?.groundType === 'barge' ? 'The ground type on the plan is a barge.' : null,
    why: () => 'The crane or the landing is on a floating platform.',
    controls: () => ['The maker\'s chart for a floating base, or no lift. Heel and trim read before and during the lift.', 'Moorings checked, no vessel movement nearby. Stop on any swell or wash.', 'Load and crane kept on the centreline to limit heel.'] },
  { id: 'exposed', tick: 1, cat: 'The weather', name: 'Exposed site, strong wind at height', L: 3, S: 4, LR: 2, owner: 'Lift supervisor',
    help: 'Open ground, coast, a high roof or a tall boom where the wind is stronger than at the cab.',
    auto: (x) => x.r.tipY >= 45 ? `Boom head at ${fmt(x.r.tipY, 0)} m, where the wind is stronger than at ground level.` : null,
    why: (x) => `Boom head ${fmt(x.r.tipY, 1)} m above the ground${x.wx ? `. Gusts ${fmt(x.wx.maxG, 1)} m/s against ${fmt(x.wx.limit, 1)} m/s` : ''}.`,
    controls: () => ['Wind read at the boom head, not at the cab.', 'Lift in the calm part of the day. Stop at the limit; do not wait to see if it eases while the load is in the air.', 'Hold the load on tag lines from the start.'] },
  { id: 'night', tick: 1, cat: 'The weather', name: 'Night work or poor light', L: 3, S: 4, LR: 2, owner: 'Lift supervisor',
    help: 'The lift runs after dark, or dust, fog or glare makes it hard to see the load.',
    auto: (x) => { const s = String(x.wx?.start || x.plan.weather?.start || ''); const h = parseInt(s.slice(0, 2), 10); const e = h + num(x.wx?.hours ?? x.plan.weather?.hours, 0); return Number.isFinite(h) && (h >= 18 || h < 5 || e >= 19) && s ? `The lift window starts at ${s} for ${fmt(num(x.wx?.hours ?? x.plan.weather?.hours, 0), 0)} h.` : null; },
    why: () => 'Part of the lift is in poor light.',
    controls: () => ['Lighting on the lift area and the landing, not shining at the operator.', 'Boom and hook lights on. Signaller with lit wands and hi-vis.', 'No lift if the signaller cannot see the load or the operator.'] },
  { id: 'tight', tick: 1, cat: 'Around the lift', name: 'Tight space or tail swing', L: 3, S: 4, LR: 2, owner: 'Signaller',
    help: 'Not much room between the crane, the load and walls, scaffold or other plant.',
    auto: (x) => x.r.clearance != null && x.r.clearance < x.minClr * 2 ? `Only ${fmt(x.r.clearance, 2)} m from the boom to ${x.r.clearLine?.label ? String(x.r.clearLine.label).toLowerCase() : 'a structure'}.` : null,
    stat: (x) => riskStat(x, /Boom clearance/),
    why: (x) => x.r.clearance != null ? `${fmt(x.r.clearance, 2)} m clear at the closest point. Tail swing ${fmt(num(x.crane.tail, 4), 1)} m.` : `Tail swing ${fmt(num(x.crane.tail, 4), 1)} m in a tight space (ticked).`,
    controls: () => ['Tail swing barriered. A banksman on the tight side with a line of sight to the operator.', 'Rehearse the swing empty at slow speed before the load goes on.', 'Slew limits set so the crane cannot reach the obstruction.'] },
  { id: 'blind', tick: 1, cat: 'Around the lift', name: 'Blind lift: the operator cannot see the load', L: 3, S: 5, LR: 1, owner: 'Signaller',
    help: 'The load lands or travels where the operator has no view of it.',
    why: () => 'The operator cannot see the pick or the landing (ticked).',
    controls: () => ['A dedicated signaller at the landing, on the radio, in sight of the load.', 'A camera on the hook or a second signaller to relay.', 'Radio lost: stop all motion.'] },
  { id: 'unknownw', tick: 1, cat: 'The load', name: 'Weight or centre of gravity not certain', L: 3, S: 5, LR: 1, owner: 'Appointed Person',
    help: 'The load weight is an estimate, or the load may hang tilted because the centre of gravity is off to one side.',
    why: (x) => `Plan weight ${riskT(x.r.W, 2)}${x.r.contOn ? ' with ' + fmt(x.r.cont, 0) + '% margin' : ', no margin added'}.`,
    controls: (x) => ['Weigh it, or take the weight from the maker\'s drawing. Do not guess.', `Margin on the weight: ${x.r.contOn ? fmt(x.r.cont, 0) + '%' : 'none now, add one'}.`, 'Trial lift 100–300 mm. If it tilts, lower and move the hook over the centre of gravity.'],
    step: () => ['before', 'Weight check', 'Confirm the weight of the load against the plan and find the centre of gravity before the slings go on.', 'AP'] },
  { id: 'sharp', tick: 1, cat: 'The load', name: 'Sharp edges on the load', L: 3, S: 4, LR: 1, owner: 'Slinger',
    help: 'Steel sections, precast corners, plate edges. Anything that can cut a textile sling.',
    why: () => 'The load has edges that can cut slings (ticked).',
    controls: () => ['Sleeves or corner protectors on every edge the sling touches.', 'Chain or wire slings for abrasive or sharp loads. Inspect after the lift.', 'No sling is pulled out from under a load.'] },
  { id: 'landing_struct', tick: 1, cat: 'The load', name: 'Landing on a roof, slab, trailer or vessel', L: 3, S: 4, LR: 1, owner: 'Appointed Person',
    help: 'The load lands on something that has to carry it: a roof, a slab, a low-bed trailer or a deck.',
    auto: (x) => num(x.r.landY) > 1.2 ? `Landing level ${fmt(x.r.landY, 2)} m, not on the ground.` : null,
    why: (x) => `Landing at ${fmt(x.r.landY, 2)} m with ${riskT(x.r.W, 2)}.`,
    controls: (x) => [`The person responsible for the surface confirms in writing that it takes ${riskT(x.r.W, 1)}, including point loads under packing.`, 'Spread the load on packing or beams. Trailers chocked and the driver out of the cab.', 'Take the weight off slowly and watch the surface.'] },
  { id: 'heat', tick: 1, cat: 'The weather', name: 'Heat stress on the crew', L: 3, S: 3, LR: 2, owner: 'Lift supervisor',
    help: 'Hot, humid work on open ground, with the crew in hi-vis and gloves.',
    why: () => 'The lift is in hot conditions (ticked).',
    controls: () => ['Shade, water and rest breaks at the lift area. Rotate the signaller and slingers.', 'Follow the midday work ban while it is in force.', 'Any sign of heat illness: stop the lift, move the person to shade and cool them.'] },
  { id: 'longboom', cat: 'The lift', name: 'Long boom or jib, side loads and deflection', L: 3, S: 4, LR: 2, owner: 'Operator',
    auto: (x) => x.pv.attach?.type && x.pv.attach.type !== 'none' ? 'A jib is fitted.' : x.ch && x.ch.kind !== 'main' ? 'The chart is for a jib configuration.' : null,
    why: (x) => `${x.ch && x.ch.kind !== 'main' ? 'Jib configuration' : 'Jib fitted'}, boom ${fmt(x.boom, 1)} m.`,
    controls: () => ['No side pull and no dragging of the load. Hoist plumb.', 'Lower wind limit than for the main boom: stop at 70% of the chart wind.', 'Boom and jib angles set from the LMI, not by eye.'] }
];

// ---------- the register ----------
// returns rows: { id, n, name, cat, src:'auto'|'ticked'|'extra', why, status, L, S, score, band, controls[], LR, SR, score2, band2, owner, step, fixed }
function riskRegister(plan, calc) {
  const x = riskCtx(plan, calc); const tick = (plan.risk && plan.risk.haz) || {}; const out = [];
  for (const h of RISK_LIBRARY) {
    let reason = null; try { reason = h.auto ? h.auto(x) : null; } catch (e) { reason = null; }
    const on = h.core || reason || tick[h.id]; if (!on) continue;
    let st = 'ok'; try { st = h.stat ? h.stat(x) : 'ok'; } catch (e) { st = 'ok'; }
    const L = Math.max(h.L, st === 'fail' ? 4 : st === 'warn' ? 3 : 0); const S = h.S;
    const LR = st === 'fail' ? L : st === 'warn' ? Math.min(L, Math.max(h.LR + 1, 2)) : Math.min(L, h.LR);
    let why = ''; try { why = h.why ? h.why(x) : ''; } catch (e) { why = ''; } if (!why) why = reason || '';
    let controls = []; try { controls = h.controls(x); } catch (e) { controls = []; }
    let step = null; try { step = h.step ? h.step(x) : null; } catch (e) { step = null; }
    out.push({ id: h.id, name: h.name, cat: h.cat, src: h.core || reason ? 'auto' : 'ticked', ticked: !!tick[h.id], why: why.trim(), status: st, L, S, score: L * S, band: riskBand(L * S), controls, LR, SR: S, score2: LR * S, band2: riskBand(LR * S), owner: h.owner || 'Lift supervisor', step, fixed: st === 'fail' });
  }
  for (const e of (plan.risk && plan.risk.extra) || []) {
    if (!String(e.name || '').trim()) continue; const L = Math.max(1, Math.min(5, Math.round(num(e.L, 3)))), S = Math.max(1, Math.min(5, Math.round(num(e.S, 4)))); const LR = Math.max(1, L - 2);
    out.push({ id: 'x' + out.length, name: String(e.name).trim(), cat: 'Added by the AP', src: 'extra', ticked: true, why: 'Added by the Appointed Person.', status: 'ok', L, S, score: L * S, band: riskBand(L * S), controls: String(e.controls || '').split(/\n|;/).map(s => s.trim()).filter(Boolean), LR, SR: S, score2: LR * S, band2: riskBand(LR * S), owner: 'Appointed Person', step: null, fixed: false });
  }
  const core = out.filter(r => RISK_LIBRARY.find(h => h.id === r.id)?.core); const rest = out.filter(r => !core.includes(r)).sort((a, b) => b.score - a.score);
  const rows = [...rest.filter(r => r.score >= 15), ...core, ...rest.filter(r => r.score < 15)]; rows.forEach((r, i) => { r.n = i + 1; }); return rows;
}

// ---------- the "Site hazards" sheet: a tick list in plain English, the register as it will print, and your own hazards ----------
(function () { if (typeof document === 'undefined' || document.getElementById('riskCss')) return; const s = document.createElement('style'); s.id = 'riskCss'; s.textContent = `
.rk-list { display: grid; gap: 1px; background: var(--hair); border-radius: var(--r); overflow: hidden; }
.rk-r { display: grid; grid-template-columns: 26px 1fr auto; gap: 4px 10px; align-items: center; padding: 11px 14px; background: var(--card); }
.rk-n { font: 700 12px var(--f-num); color: var(--ink-3); }
.rk-t b { display: block; font-size: 15px; font-weight: 600; line-height: 1.25; }
.rk-t small { display: block; font-size: 12.5px; color: var(--ink-2); line-height: 1.35; margin-top: 2px; }
.rk-s { display: flex; align-items: center; gap: 6px; font: 650 12px var(--f-num); white-space: nowrap; }
.rk-s i { font-style: normal; padding: 3px 7px; border-radius: 7px; }
.rk-tag { grid-column: 2 / 4; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-3); font-weight: 650; }
.rk-tag.auto { color: var(--info); } .rk-tag.ticked { color: var(--ink); }
.rk-b-low { background: #e3f1e9; color: #1b7a46; } .rk-b-med { background: #fff1bf; color: #7a5c00; } .rk-b-high { background: #fbdcb8; color: #9a4a00; } .rk-b-ext { background: #f6c4cb; color: #b00d28; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .rk-b-low { background: rgba(52,199,89,.2); color: #6fe08f; } :root:not([data-theme="light"]) .rk-b-med { background: rgba(255,214,10,.2); color: #ffd84d; } :root:not([data-theme="light"]) .rk-b-high { background: rgba(255,159,10,.22); color: #ffb54d; } :root:not([data-theme="light"]) .rk-b-ext { background: rgba(255,59,48,.24); color: #ff7b72; } }
:root[data-theme="dark"] .rk-b-low { background: rgba(52,199,89,.2); color: #6fe08f; } :root[data-theme="dark"] .rk-b-med { background: rgba(255,214,10,.2); color: #ffd84d; } :root[data-theme="dark"] .rk-b-high { background: rgba(255,159,10,.22); color: #ffb54d; } :root[data-theme="dark"] .rk-b-ext { background: rgba(255,59,48,.24); color: #ff7b72; }
`; document.head.appendChild(s); })();
const riskChip = (r) => `<span class="rk-s"><i class="rk-b-${r.band.k}">${r.L}×${r.S}</i>→<i class="rk-b-${r.band2.k}">${r.LR}×${r.SR}</i></span>`;
SH.risk = {
  title: () => 'Site hazards', icon: 'shield',
  body() {
    const p = state.plan; p.risk = p.risk || { haz: {}, extra: [] }; const x = riskCtx(p, state.calc); let out = '';
    out += note('info', 'shield', `<b>Tick what is true on this site.</b> The risk assessment in the report pack already finds the hazards the lift itself raises (capacity, ground, wind, tackle, side lift, tandem). Ticks add the ones only you can see.`);
    const cats = ['Around the lift', 'The ground', 'The weather', 'The load']; const autoNow = (h) => { try { return h.auto ? h.auto(x) : null; } catch (e) { return null; } };
    for (const cat of cats) {
      const items = RISK_LIBRARY.filter(h => h.tick && h.cat === cat);
      out += grp(cat, items.map(h => { const a = autoNow(h); return a ? Fx.ro(h.name, '<span class="rk-s"><i class="rk-b-med">auto</i></span>', { sub: a }) : Fx.sw('risk.haz.' + h.id, h.name, { sub: h.help }); }).join(''));
    }
    out += grp('Your own hazards', (p.risk.extra || []).map((e, i) => `${Fx.text('risk.extra.' + i + '.name', 'Hazard', { ph: 'What could go wrong' })}${Fx.text('risk.extra.' + i + '.controls', 'What controls it', { ph: 'One control per line, or separate with ;' })}${Fx.sel('risk.extra.' + i + '.L', 'Likelihood', RISK_L.map((t, k) => [k + 1, `${k + 1} · ${t}`]), { numeric: 1 })}${Fx.sel('risk.extra.' + i + '.S', 'Severity', RISK_S.map((t, k) => [k + 1, `${k + 1} · ${t}`]), { numeric: 1 })}${Fx.link('riskDel', 'Remove this hazard', { data: `data-i="${i}"` })}`).join('') + Fx.link('riskAdd', 'Add a hazard', { sub: 'For anything the list does not cover' }));
    const rows = riskRegister(p, state.calc); const nA = rows.filter(r => r.src === 'auto').length, nT = rows.filter(r => r.src === 'ticked').length, nE = rows.filter(r => r.src === 'extra').length;
    out += `<section class="grp"><h3>The register as it will print</h3><div class="rk-list">${rows.map(r => `<div class="rk-r"><span class="rk-n">${r.n}</span><span class="rk-t"><b>${h(r.name)}</b><small>${h(r.why.slice(0, 150))}</small></span>${riskChip(r)}<span class="rk-tag ${r.src === 'auto' ? 'auto' : 'ticked'}">${r.src === 'auto' ? 'from the plan' : r.src === 'extra' ? 'added by you' : 'ticked by you'}${r.fixed ? ' · controls cannot fix this: change the plan' : ''}</span></div>`).join('')}</div><p class="foot">${rows.length} hazards: ${nA} from the plan, ${nT} ticked, ${nE} added. Each chip is likelihood × severity before the controls, then after them. A red check keeps its score until the plan changes.</p></section>`;
    return out;
  }
};
SA_EXTRA.riskAdd = () => { const p = state.plan; p.risk = p.risk || { haz: {}, extra: [] }; p.risk.extra = p.risk.extra || []; p.risk.extra.push({ name: '', controls: '', L: 3, S: 4 }); commit({ sheet: true }); };
SA_EXTRA.riskDel = (d) => { const p = state.plan; p.risk.extra.splice(+d.i, 1); commit({ sheet: true }); };
