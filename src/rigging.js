// ===== Rigging detail (v10): webbing / round / wire-rope / chain slings, shackles, spreader and lifting beams =====
// A catalogue (EN standards, EN 1492 colour code), the WLL maths (hitch and multi-leg factors), plain-English check texts,
// pictograms and the elevation drawing of every kind of tackle. Pure functions; names are prefixed rg / RG_ because the whole app
// is one global script. engine.js and draw.js call into this file but also work without it (tests that load them alone).
//
// A tackle is { name, type:'sling'|'shackle'|'spreader'|'beam'|'chain'|'hook'|'other', L, w, legs, wll?,
//   mat?: 'webbing'|'round'|'wire'|'chain'|'shackle'|'spreader'|'beam'|'hook'|'other',
//   hitch?: 'straight'|'choke'|'basket', wllV? (vertical WLL, t), widthMm?, dia?, eye? ('thimble'|'soft'|'endless'),
//   cert?, inspected? (date), sleeve? (edge protection), colKey? (colour picked by hand), grade? ('8'|'10'), shape? ('bow'|'dee'), std? }

const _rgN = (v, d = 0) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : d; };
const _rgR2 = (v) => Math.round(v * 100) / 100;
const _rgF = (v) => String(+(+v).toFixed(2)); // 2 → "2", 1.6 → "1.6", 1.25 → "1.25"
const _rgClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const _rgM = (v) => { const n = +v; if (!isFinite(n)) return '—'; return (Math.abs(n * 10 - Math.round(n * 10)) > 1e-6 ? n.toFixed(2) : n.toFixed(1)) + 'M'; };
function _rgShade(hex, pct) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || ''); if (!m) return hex;
  const f = (v) => Math.max(0, Math.min(255, Math.round(parseInt(v, 16) * (1 + pct / 100)))).toString(16).padStart(2, '0');
  return '#' + f(m[1]) + f(m[2]) + f(m[3]);
}

// ---------- EN 1492 colour code by vertical WLL (t) — used for webbing and round slings ----------
const RG_COLOURS = [
  { wll: 1, key: 'violet', name: 'Violet', hex: '#7e3fa6' }, { wll: 2, key: 'green', name: 'Green', hex: '#2f9e44' },
  { wll: 3, key: 'yellow', name: 'Yellow', hex: '#f5c400' }, { wll: 4, key: 'grey', name: 'Grey', hex: '#8b9096' },
  { wll: 5, key: 'red', name: 'Red', hex: '#d62828' }, { wll: 6, key: 'brown', name: 'Brown', hex: '#7b4a22' },
  { wll: 8, key: 'blue', name: 'Blue', hex: '#1d5fc4' }, { wll: 10, key: 'orange', name: 'Orange', hex: '#f07c00' }
];
function rgEnColour(wll) { // the colour for a vertical WLL: the largest code at or below it (10 t and over: orange); under 1 t has none
  const w = _rgN(wll); if (!(w >= 1 - 1e-6)) return null;
  let r = RG_COLOURS[0]; for (const c of RG_COLOURS) if (w >= c.wll - 1e-6) r = c; return r;
}

// ---------- what each material is ----------
const RG_MATS = {
  webbing: { label: 'Flat webbing sling', short: 'WEBBING', noun: 'webbing sling', std: 'EN 1492-1', sling: true, textile: true, coded: true, base: '#b9c1cc', icon: 'Webbing',
    help: 'A flat polyester strap with sewn eyes. Its colour tag tells you the WLL. Soft on the load, but sharp edges cut it.' },
  round: { label: 'Round sling', short: 'ROUND SLING', noun: 'round sling', std: 'EN 1492-2', sling: true, textile: true, coded: true, base: '#b9c1cc', icon: 'Round',
    help: 'An endless loop of polyester fibres inside a tube cover. Same colour code as webbing. Good for smooth, delicate loads.' },
  wire: { label: 'Wire rope sling', short: 'WIRE ROPE', noun: 'wire rope sling', std: 'EN 13414-1', sling: true, base: '#262626', icon: 'Wire rope',
    help: 'Steel wire rope with an eye at each end (usually a thimble and a pressed ferrule). Strong and tough. Do not use with kinks or broken wires.' },
  chain: { label: 'Chain sling', short: 'CHAIN', noun: 'chain sling', std: 'EN 818-4', sling: true, base: '#8a7a5a', icon: 'Chain',
    help: 'Alloy steel chain, grade 8 or 10, with a master link. Takes heat and rough handling, but shock loads are hard on it.' },
  shackle: { label: 'Shackle', short: 'SHACKLE', noun: 'shackle', std: 'EN 13889', base: '#8f969c', icon: 'Shackle',
    help: 'A bow or dee shackle with a pin. It joins the sling to the hook or to the load. Always pull it in line, never from the side.' },
  spreader: { label: 'Spreader beam', short: 'SPREADER', noun: 'spreader beam', std: 'EN 13155', base: '#f2c230', icon: 'Spreader',
    help: 'A beam that keeps the sling legs apart and straight, so they pull downward and not inward.' },
  beam: { label: 'Lifting beam', short: 'LIFT BEAM', noun: 'lifting beam', std: 'EN 13155', base: '#9aa4ad', icon: 'Lift beam',
    help: 'A beam with lifting points along it. It spreads the load across several pick points.' },
  hook: { label: 'Hook / extension', short: 'HOOK', noun: 'hook extension', std: 'EN 1677', base: '#8f969c', icon: 'Hook',
    help: 'A hook, link or extension piece hanging below the hook block.' },
  other: { label: 'Other item', short: 'ITEM', noun: 'item', std: '', base: '#8f969c', icon: 'Other',
    help: 'Anything else that hangs below the hook.' }
};
const RG_MAT_ORDER = ['webbing', 'round', 'wire', 'chain', 'shackle', 'spreader', 'beam', 'hook', 'other'];
const RG_TYPE_OF = { webbing: 'sling', round: 'sling', wire: 'sling', chain: 'sling', shackle: 'shackle', spreader: 'spreader', beam: 'beam', hook: 'hook', other: 'other' };

// ---------- hitch ----------
const RG_HITCH = {
  straight: { label: 'straight', title: 'Straight', help: 'Hangs straight from the hook down to the load. Full rating.' },
  choke: { label: 'choke hitch', title: 'Choke', help: 'Wrapped round the load and passed through its own eye. The rating drops to 80 %.' },
  basket: { label: 'basket hitch', title: 'Basket', help: 'Passes under the load with both ends on the hook, so two legs share the weight. Up to twice the rating, if the legs stay near vertical.' }
};
const RG_EYES = { thimble: 'Thimble eye', soft: 'Soft eye', endless: 'Endless (grommet)' };

// EN 13414-1 / EN 1492 / EN 818-4 mode factors. beta = leg angle from the vertical in degrees.
function rgModeFactor(hitch, legs, beta) {
  const cb = Math.cos(Math.max(0, Math.min(89, beta)) * Math.PI / 180);
  if (hitch === 'basket') return _rgR2(legs * (beta <= 7 ? 2.0 : beta <= 45 ? 1.4 : beta <= 60 ? 1.0 : Math.max(0.1, 2 * cb)));
  const m = legs >= 3 ? (beta <= 45 ? 2.1 : beta <= 60 ? 1.5 : Math.max(0.1, 3 * cb)) : legs === 2 ? (beta <= 45 ? 1.4 : beta <= 60 ? 1.0 : Math.max(0.1, 2 * cb)) : 1;
  return _rgR2(m * (hitch === 'choke' ? 0.8 : 1));
}

// typical sizes — only ever offered as hints, never filled in as a WLL
const RG_WEB_WIDTH = [[1, 30], [2, 60], [3, 90], [4, 120], [5, 150], [6, 180], [8, 240], [10, 300]]; // EN 1492-1 nominal widths (mm)
function rgWebWidth(wll) { const w = _rgN(wll); if (!(w > 0)) return 0; let r = RG_WEB_WIDTH[0][1]; for (const [t, mm] of RG_WEB_WIDTH) if (w >= t - 1e-6) r = mm; return r; }
const RG_CHAIN_WLL = { // single leg, straight pull, tonnes (EN 818-4)
  8: { 6: 1.12, 7: 1.5, 8: 2, 10: 3.15, 13: 5.3, 16: 8, 18: 10, 20: 12.5, 22: 15, 26: 21.2, 32: 31.5 },
  10: { 6: 1.4, 7: 1.9, 8: 2.5, 10: 4, 13: 6.7, 16: 10, 18: 12.5, 20: 16, 22: 19, 26: 26.5, 32: 40 }
};
function rgChainTypical(dia, grade) { const g = String(grade) === '10' ? 10 : 8; return RG_CHAIN_WLL[g][Math.round(_rgN(dia))] || null; }
const RG_SHACKLE_WLL = [0.5, 0.75, 1, 1.5, 2, 3.25, 4.75, 6.5, 8.5, 9.5, 12, 13.5, 17, 25, 35, 55]; // common shackle sizes (t)
const RG_WIRE_DIA = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32];
const RG_CHAIN_DIA = [6, 8, 10, 13, 16, 20, 22, 26, 32];

// ---------- which kind of item is this? (old tackles only have type + name) ----------
function rgKindOf(t) {
  t = t || {};
  if (RG_MATS[t.mat]) return { kind: t.mat, generic: false };
  const nm = String(t.name || '').toLowerCase(), ty = t.type;
  if (ty === 'sling' || !ty) {
    if (/round|endless/.test(nm)) return { kind: 'round', generic: false };
    if (/web|nylon|polyester|flat|strap|belt/.test(nm)) return { kind: 'webbing', generic: false };
    if (/chain/.test(nm)) return { kind: 'chain', generic: false };
    if (/wire|rope|cable|steel/.test(nm)) return { kind: 'wire', generic: false };
    return ty === 'sling' ? { kind: 'wire', generic: true } : { kind: 'other', generic: false };
  }
  return { kind: { shackle: 'shackle', spreader: 'spreader', beam: 'beam', chain: 'chain', hook: 'hook' }[ty] || 'other', generic: false };
}
function rgKind(t) { return rgKindOf(t).kind; }

// months since the last thorough examination (null when no date); LOLER asks for one every 6 months
function rgExamMonths(inspected, now) {
  if (!inspected) return null; const d = Date.parse(String(inspected)); if (!isFinite(d)) return null;
  const n = now != null ? +now : Date.now(); if (d > n + 864e5) return null; return (n - d) / (30.4375 * 864e5);
}

// ---------- the catalogue entry for one tackle ----------
function SLING_INFO(t, o) {
  t = t || {}; o = o || {};
  const kd = rgKindOf(t), kind = kd.kind, M = RG_MATS[kind];
  const isSling = t.type ? t.type === 'sling' : !!M.sling;
  const legs = Math.max(1, Math.min(4, Math.round(_rgN(t.legs, isSling ? 2 : 1))));
  const hitch = isSling && RG_HITCH[t.hitch] ? t.hitch : 'straight';
  const wllV = Math.max(0, _rgN(t.wllV, 0) || _rgN(t.wll, 0));
  const angH = o.angH != null && isFinite(+o.angH) ? +o.angH : (t.ang != null && t.ang !== '' && isFinite(+t.ang) ? +t.ang : null); // leg angle to the horizontal
  const single = isSling && legs === 1 && hitch !== 'basket'; // one vertical leg
  const beta = single || angH == null ? 0 : Math.max(0, Math.min(89, 90 - angH));
  const branches = hitch === 'basket' ? legs * 2 : legs, eff = branches >= 4 ? 3 : branches; // 4 legs: only 3 are counted as carrying
  const modeFactor = isSling ? rgModeFactor(hitch, legs, beta) : 1;
  const wllLeg = _rgR2(wllV * (hitch === 'choke' ? 0.8 : 1)); // what one leg may pull
  const wllEff = _rgR2(wllV * modeFactor); // what the whole set may lift at this angle
  let col = null, colourName = '', colourKey = '';
  if (M.coded) { const en = RG_COLOURS.find(c => c.key === t.colKey) || rgEnColour(wllV); if (en) { col = en.hex; colourName = en.name; colourKey = en.key; } }
  const grade = kind === 'chain' ? (String(t.grade) === '10' ? '10' : t.grade ? '8' : '') : '';
  const shape = kind === 'shackle' ? (t.shape === 'dee' ? 'dee' : t.shape === 'bow' ? 'bow' : '') : '';
  const std = String(t.std || '').trim() || (kind === 'chain' ? (isSling ? 'EN 818-4' : 'EN 818') + (grade ? ' grade ' + grade : '') : M.std);
  const noun = kind === 'chain' ? (isSling ? (grade ? `grade ${grade} chain sling` : 'chain sling') : 'chain') : kind === 'shackle' ? (shape ? shape + ' shackle' : 'shackle') : kd.generic ? 'sling' : M.noun;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const label = cap([colourName.toLowerCase(), wllV > 0 ? _rgF(wllV) + ' t' : '', noun].filter(Boolean).join(' '));
  const notes = [];
  const am = rgExamMonths(t.inspected, o.now);
  if (!(wllV > 0)) notes.push('WLL not entered. Copy it from the tag so this item can be checked.');
  if (isSling && hitch === 'choke') notes.push('Choke hitch: the rating drops to 80 %.');
  if (isSling && hitch === 'basket') notes.push('Basket hitch: both ends go on the hook. It is rated up to twice the straight WLL while the legs stay close to vertical.');
  if (isSling && !single && angH != null) {
    if (beta > 60) notes.push(`The legs are ${Math.round(beta)}° from straight down. More than 60° is not allowed: use longer slings or a spreader.`);
    else if (beta > 45) notes.push(`The legs are ${Math.round(beta)}° from straight down. Over 45° the rating drops (${_rgF(rgModeFactor(hitch, legs, beta))} × the vertical WLL).`);
  }
  if (M.textile) notes.push(t.sleeve ? 'Edge protection fitted.' : 'Sharp edges cut textile slings: use a sleeve or corner pad.');
  if (M.coded && t.colKey && colourKey && wllV > 0) { const en = rgEnColour(wllV); if (en && en.key !== colourKey) notes.push(`The colour you picked is not the EN colour for ${_rgF(wllV)} t (that is ${en.name.toLowerCase()}).`); }
  if (am != null && am > 6) notes.push(`Last examined ${Math.round(am)} months ago. A thorough examination is due every 6 months (LOLER).`);
  return {
    kind, generic: kd.generic, isSling, matLabel: M.label, noun, label, std, colour: col || M.base, colourName, colourKey, enCoded: !!col,
    wll: wllV, hitch, hitchLabel: isSling ? RG_HITCH[hitch].label : '', modeFactor, wllLeg, wllEff, lengthM: _rgN(t.L), legs, beta: _rgR2(beta), branches, eff, single,
    widthMm: _rgN(t.widthMm), dia: _rgN(t.dia), eye: RG_EYES[t.eye] ? t.eye : kind === 'wire' ? 'thimble' : '', grade, shape, cert: String(t.cert || '').trim(), inspected: String(t.inspected || '').trim(),
    examMonths: am == null ? null : _rgR2(am), sleeve: !!t.sleeve, notes
  };
}

// the name the person typed; the engine's own fallback ("Sling legs", "Shackle"…) does not count
function rgCustomName(t) { const nm = String((t && t.name) || '').trim(); const d = typeof TACKLE_TYPES !== 'undefined' && t ? TACKLE_TYPES[t.type] : ''; return nm && nm !== d ? nm : ''; }
function rgName(t, info) { info = info || SLING_INFO(t); return rgCustomName(t) || (info.generic ? 'Sling' : info.matLabel); }
// "Green 2 t webbing sling, choke hitch, 2 legs" — with the name the person typed in front when it says more
function rgDescribe(t, info) {
  info = info || SLING_INFO(t); const nm = rgCustomName(t);
  const desc = info.label + (info.hitchLabel && info.hitch !== 'straight' ? ', ' + info.hitchLabel : '') + (info.isSling && info.legs > 1 ? `, ${info.legs} legs` : '');
  return !nm || nm.toLowerCase() === info.label.toLowerCase() ? desc : `${nm} (${desc})`;
}
// plain-English check sentence for a sling. c = { T per leg, util %, ang (to horizontal), carry }
function rgSlingMsg(t, info, c) {
  info = info || SLING_INFO(t); const multi = info.legs > 1 || info.hitch === 'basket';
  let m = rgDescribe(t, info) + ': ';
  if (info.wll > 0) m += `${_rgF(info.wllLeg)} t WLL${multi ? ' per leg' : ''}, carries ${_rgF(c.T)} t per leg (${Math.round(c.util)} %)`;
  else m += `carries ${_rgF(c.T)} t per leg, WLL not entered so it cannot be checked`;
  if (multi && c.ang != null) m += ` at ${Math.round(c.ang)}° to horizontal`;
  if (info.wllEff > 0 && multi && c.carry > info.wllEff * 1.0001 && c.util <= 100) m += ` — over the EN set rating of ${_rgF(info.wllEff)} t at this angle`;
  if (multi && c.ang != null && c.ang < 45) m += ' — angle under 45°, use longer slings or a spreader';
  return m;
}
// plain-English check sentence for a shackle, hook, beam… (no legs). c = { carry, util % }
function rgLoadMsg(t, info, c) {
  info = info || SLING_INFO(t);
  return `${rgDescribe(t, info)}: ${_rgF(info.wllEff)} t WLL, carries ${_rgF(c.carry)} t (${Math.round(c.util)} %)`;
}
function rgExamMsg(t, info) { return `${rgDescribe(t, info)}: last examined ${Math.round(info.examMonths)} months ago — a thorough examination is due every 6 months (LOLER)`; }

// a tackle ready for saving: new defaults added, nothing removed (old plans keep loading)
function rgNormTackle(t) {
  if (!t || typeof t !== 'object') return t;
  const o = { ...t }, kd = rgKindOf(o);
  if (!o.mat && !kd.generic) o.mat = kd.kind;
  o.hitch = RG_HITCH[o.hitch] ? o.hitch : 'straight';
  if (o.wllV == null || o.wllV === '') o.wllV = _rgN(o.wll) > 0 ? o.wll : '';
  o.cert = o.cert == null ? '' : String(o.cert); o.inspected = o.inspected ? String(o.inspected) : ''; o.sleeve = !!o.sleeve;
  return o;
}
// ---------- geometry helpers for drawing ----------
function rgEllipse(cx, cy, a, b, ux, uy, n) { // a = half-length along (ux,uy), b = half-width across
  n = n || 14; const pts = [];
  for (let i = 0; i < n; i++) { const th = 2 * Math.PI * i / n, ca = Math.cos(th) * a, sb = Math.sin(th) * b; pts.push([cx + ca * ux - sb * uy, cy + ca * uy + sb * ux]); }
  return pts;
}
const RG_INK = '#1d1d1d';

// one leg of a sling from p to q (sheet mm). k = sheet mm per metre, so widths follow the drawing scale but never get thinner than a clean line.
function rgDrawLeg(P, p, q, info, k, o) {
  o = o || {}; const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); if (L < 0.4) return;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, f = o.thin ? 0.72 : 1;
  const at = (s, off) => [p[0] + ux * s + nx * off, p[1] + uy * s + ny * off];
  const kp = { layer: 'RIGGING', keep: true }, lay = { layer: 'RIGGING' };
  const kind = info.kind, col = info.colour, dk = _rgShade(col, -40);
  if (kind === 'webbing') {
    const wb = _rgClamp((info.widthMm || rgWebWidth(info.wll) || 60) / 1000 * k, 0.8, 2.6) * f, eyeL = Math.min(L * 0.2, wb * 3.4);
    P.poly([at(0, wb / 2), at(L, wb / 2), at(L, -wb / 2), at(0, -wb / 2)], { closed: true, fill: col, stroke: RG_INK, w: 0.12, ...kp });
    if (wb >= 1.1 && L > eyeL * 2.5) for (const off of [wb * 0.27, -wb * 0.27]) { const a = at(eyeL * 0.9, off), b = at(L - eyeL * 0.9, off); P.line(a[0], a[1], b[0], b[1], { stroke: '#ffffff', w: 0.07, dash: true, ...kp }); }
    for (const s of [eyeL * 0.34, L - eyeL * 0.34]) { // stitched eyes at both ends
      const c = at(s, 0); P.poly(rgEllipse(c[0], c[1], eyeL * 0.62, wb * 0.64, ux, uy), { closed: true, fill: col, stroke: RG_INK, w: 0.12, ...kp });
      P.poly(rgEllipse(c[0], c[1], eyeL * 0.3, wb * 0.26, ux, uy, 10), { closed: true, fill: '#ffffff', stroke: dk, w: 0.08, ...kp });
    }
    if (o.sleeve || info.sleeve) { const s0 = L * 0.78, s1 = Math.min(L - eyeL, s0 + Math.max(2.4, L * 0.13)); P.poly([at(s0, wb * 0.82), at(s1, wb * 0.82), at(s1, -wb * 0.82), at(s0, -wb * 0.82)], { closed: true, fill: '#3b4046', stroke: RG_INK, w: 0.1, ...kp }); }
  } else if (kind === 'round') {
    const wt = _rgClamp((info.dia ? info.dia / 1000 : 0.018 + 0.004 * Math.min(info.wll || 2, 10)) * k, 0.9, 2.2) * f;
    P.line(p[0], p[1], q[0], q[1], { stroke: RG_INK, w: wt + 0.3, ...kp }); P.line(p[0], p[1], q[0], q[1], { stroke: col, w: wt, ...kp });
    if (wt >= 1.2 && L > 4) { const a = at(wt * 1.2, 0), b = at(L - wt * 1.2, 0); P.line(a[0], a[1], b[0], b[1], { stroke: '#ffffff', w: 0.07, dash: true, ...kp }); }
    if (o.sleeve || info.sleeve) { const s0 = L * 0.78, s1 = Math.min(L - wt, s0 + Math.max(2.4, L * 0.13)); P.poly([at(s0, wt * 0.95), at(s1, wt * 0.95), at(s1, -wt * 0.95), at(s0, -wt * 0.95)], { closed: true, fill: '#3b4046', stroke: RG_INK, w: 0.1, ...kp }); }
  } else if (kind === 'chain') {
    rgDrawChain(P, p, q, info, k, f);
  } else { // wire rope (and a plain, unnamed sling): a dark rope with a thimble or soft eye at each end
    const wr = _rgClamp((info.dia || 16) / 1000 * k, 0.28, 1.0) * f;
    P.line(p[0], p[1], q[0], q[1], { stroke: '#262626', w: wr, ...lay });
    if (wr >= 0.42) P.line(p[0], p[1], q[0], q[1], { stroke: '#9a9a9a', w: wr * 0.32, dash: true, ...lay });
    if (info.eye !== 'endless' && !info.generic) {
      const er = _rgClamp(wr * 1.9, 0.8, 2.0);
      for (const sgn of [0, 1]) {
        const s = sgn ? L - er * 0.9 : er * 0.9, c = at(s, 0);
        P.poly(rgEllipse(c[0], c[1], er * 1.05, er * 0.74, ux, uy), { closed: true, fill: info.eye === 'soft' ? 'none' : '#ffffff', stroke: '#262626', w: Math.max(0.16, er * 0.22), ...lay });
        if (info.eye !== 'soft' && L > er * 6) { const sF = sgn ? L - er * 2.7 : er * 2.7, hl = er * 0.7; P.poly([at(sF - hl, wr * 0.95), at(sF + hl, wr * 0.95), at(sF + hl, -wr * 0.95), at(sF - hl, -wr * 0.95)], { closed: true, fill: '#b8bec4', stroke: '#262626', w: 0.1, ...lay }); }
      }
    }
  }
}

function rgDrawChain(P, p, q, info, k, f) {
  f = f || 1; const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); if (L < 0.4) return;
  const ux = dx / L, uy = dy / L; const d = info.dia || 10;
  let Ll = _rgClamp(3.3 * d / 1000 * k, 1.7, 5.5) * f, pitch = Ll * 0.62; const maxN = 80;
  if (L / pitch > maxN) { pitch = L / maxN; Ll = pitch / 0.62; }
  const n = Math.max(1, Math.floor((L - Ll * 0.5) / pitch) + 1), fill = '#cfc6b3', ink = '#2b2217';
  for (let i = 0; i < n; i++) {
    const s = Math.min(L - Ll / 2, Ll / 2 + i * pitch), cx = p[0] + ux * s, cy = p[1] + uy * s, edge = i % 2 === 1;
    P.poly(rgEllipse(cx, cy, Ll / 2, edge ? Ll * 0.14 : Ll * 0.31, ux, uy, 12), { closed: true, fill: edge ? '#8d8372' : fill, stroke: ink, w: 0.12, layer: 'RIGGING' });
    if (!edge && Ll > 2.6) P.poly(rgEllipse(cx, cy, Ll * 0.3, Ll * 0.13, ux, uy, 10), { closed: true, fill: '#ffffff', stroke: ink, w: 0.07, layer: 'RIGGING' });
  }
}

// a shackle between sheet y = yT (pin end) and yB (bow end) at x = cx
function rgDrawShackle(P, cx, yT, yB, info, k) {
  const H = Math.max(1.6, yB - yT), hw = _rgClamp(H * 0.34, 0.9, 4.2), lw = _rgClamp(((info.dia || 18) / 1000) * k * 1.1, 0.45, 1.3);
  const dee = info.shape === 'dee', ytop = yT + lw * 0.8, ybase = yB - lw * 0.5;
  let pts;
  if (dee) { // D shape: straight sides, flat bottom, rounded corners
    const cr = Math.min(hw * 0.5, (ybase - ytop) * 0.4); pts = [[cx - hw, ytop], [cx - hw, ybase - cr]];
    for (let i = 0; i <= 4; i++) { const th = Math.PI / 2 * i / 4; pts.push([cx - hw + cr - cr * Math.cos(th), ybase - cr + cr * Math.sin(th)]); }
    for (let i = 0; i <= 4; i++) { const th = Math.PI / 2 * i / 4; pts.push([cx + hw - cr + cr * Math.sin(th), ybase - cr + cr * Math.cos(th)]); }
    pts.push([cx + hw, ytop]);
  } else { // bow: sides join in a round bottom
    const cy0 = Math.max(ytop, ybase - hw); pts = [[cx - hw, ytop], [cx - hw, cy0]];
    for (let i = 1; i <= 10; i++) { const th = Math.PI * i / 10; pts.push([cx - hw * Math.cos(th), cy0 + hw * Math.sin(th)]); }
    pts.push([cx + hw, ytop]);
  }
  P.poly(pts, { stroke: RG_INK, w: lw + 0.3, fill: 'none', layer: 'RIGGING', keep: true });
  P.poly(pts, { stroke: '#a7aeb5', w: lw, fill: 'none', layer: 'RIGGING', keep: true });
  const pin = Math.max(0.35, hw * 0.34); // the pin across the open end, with a head and a nut
  P.line(cx - hw - pin, ytop, cx + hw + pin, ytop, { stroke: RG_INK, w: lw * 0.95 + 0.26, layer: 'RIGGING', keep: true });
  P.line(cx - hw - pin, ytop, cx + hw + pin, ytop, { stroke: '#c8102e', w: lw * 0.95, layer: 'RIGGING', keep: true });
  P.circle(cx - hw - pin, ytop, lw * 0.85, { stroke: RG_INK, w: 0.12, fill: '#c8102e', layer: 'RIGGING', keep: true });
  P.rect(cx + hw + pin - lw * 0.35, ytop - lw * 0.8, lw * 0.9, lw * 1.6, { stroke: RG_INK, w: 0.1, fill: '#8f969c', layer: 'RIGGING', keep: true });
}

// a spreader or lifting beam between sheet corners (xa,ya) top-left and (xb,yb) bottom-right, with lugs
function rgDrawBeam(P, xa, ya, xb, yb, info, k, type) {
  const w = xb - xa, h = Math.max(1.4, yb - ya), sp = type === 'spreader' || info.kind === 'spreader';
  const fill = sp ? '#f2c230' : '#9aa4ad', lug = _rgClamp(h * 0.4, 0.6, 1.5);
  P.rect(xa, ya, w, h, { stroke: RG_INK, w: 0.16, fill, layer: 'RIGGING', keep: true });
  if (h >= 3) for (const yy of [ya + h * 0.2, yb - h * 0.2]) P.line(xa, yy, xb, yy, { stroke: RG_INK, w: 0.07, layer: 'RIGGING', keep: true });
  const cx = (xa + xb) / 2; // centre lug on top, end lugs below each end
  P.poly([[cx - lug * 1.3, ya], [cx + lug * 1.3, ya], [cx, ya - lug * 1.7]], { closed: true, fill, stroke: RG_INK, w: 0.1, layer: 'RIGGING', keep: true });
  P.circle(cx, ya - lug * 1.15, lug * 0.55, { stroke: RG_INK, w: 0.12, fill: '#ffffff', layer: 'RIGGING', keep: true });
  for (const ex of [xa + lug * 1.6, xb - lug * 1.6]) {
    P.poly([[ex - lug * 1.1, yb], [ex + lug * 1.1, yb], [ex, yb + lug * 1.6]], { closed: true, fill, stroke: RG_INK, w: 0.1, layer: 'RIGGING', keep: true });
    P.circle(ex, yb + lug * 1.05, lug * 0.5, { stroke: RG_INK, w: 0.12, fill: '#ffffff', layer: 'RIGGING', keep: true });
  }
}

// a vertical hook / chain block / other item from sheet point p down to q
function rgDrawVertical(P, p, q, info, k) {
  if (info.kind === 'chain') { rgDrawChain(P, p, q, info, k, 1); return; }
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.4) return;
  const r = _rgClamp(L * 0.16, 0.5, 1.4);
  P.line(p[0], p[1], q[0], q[1], { stroke: RG_INK, w: _rgClamp(0.04 * k, 0.4, 1.0) + 0.2, layer: 'RIGGING' });
  P.line(p[0], p[1], q[0], q[1], { stroke: '#8f969c', w: _rgClamp(0.04 * k, 0.4, 1.0), layer: 'RIGGING', keep: true });
  P.circle(p[0], p[1] + r, r, { stroke: RG_INK, w: 0.16, fill: 'none', layer: 'RIGGING' });
  if (info.kind === 'hook') P.arc(q[0], q[1] - r, r * 1.3, 180, 360, { stroke: RG_INK, w: 0.3, layer: 'RIGGING' });
  else P.circle(q[0], q[1] - r, r, { stroke: RG_INK, w: 0.16, fill: 'none', layer: 'RIGGING' });
}

// callout text for an item hanging under the hook (the elevation and the rigging sheet)
function rgCalloutLines(t, info) {
  info = info || SLING_INFO(t); const nm = rgName(t, info).toUpperCase();
  const ang = t.type === 'sling' && t.ang != null && !info.single ? ' @' + Math.round(t.ang) + '°' : '';
  const l1 = `${nm}${t.L ? ' ' + _rgM(t.L) : ''}${t.w ? ' · ' + (+t.w).toFixed(2) + 'T' : ''}${ang}`;
  const bits = []; if (info.colourName) bits.push(info.colourName.toUpperCase());
  if (info.wll > 0) bits.push(_rgF(info.wll) + 'T');
  if (!info.generic) bits.push(RG_MATS[info.kind].short + (info.grade ? ' GR' + info.grade : ''));
  if (info.hitchLabel && info.hitch !== 'straight') bits.push(info.hitchLabel.toUpperCase());
  return info.wll > 0 || !info.generic ? [l1, bits.join(' ')] : [l1];
}

// Draw the whole stack under the hook. T maps (metres, metres up) → sheet mm, k = mm per metre.
// c = { R, hookBot, half (half the pick spread), items (the engine's stack items), callout, size, lines(t, info), angles }.
function rgDrawStack(P, T, k, c) {
  const items = c.items, R = c.R; let y = c.hookBot, topSpan = 0; const labels = [];
  const isBeam = (x) => x.type === 'spreader' || x.type === 'beam';
  for (let i = 0; i < items.length; i++) {
    const t = items[i], y1 = y - t.v, info = t.rg || SLING_INFO(t);
    if (t.type === 'sling') {
      const below = items.slice(i + 1).find(isBeam), bSpan = below ? below.L : 2 * c.half, n = info.branches;
      const fr = n <= 1 ? [0] : n === 2 ? [-1, 1] : n === 3 ? [-1, 0, 1] : [-1, -0.34, 0.34, 1];
      for (const fx of fr) rgDrawLeg(P, T(R + fx * topSpan / 2, y), T(R + fx * bSpan / 2, y1), info, k, { thin: fr.length > 2 && Math.abs(fx) < 1 });
      if (fr.length > 1 && topSpan === 0) { const a = T(R, y), r = _rgClamp(k * 0.06, 0.7, 1.8); P.circle(a[0], a[1] + r * 0.9, r, { stroke: RG_INK, w: 0.2, fill: 'none', layer: 'RIGGING' }); } // master link
      labels.push([y - t.v / 2, R + (n <= 1 ? 0.15 : (topSpan + bSpan) / 4 + 0.15), t, info]);
      if (c.angles && !info.single && t.ang != null) { // the angle between the leg and the horizontal, at the load end of the right-hand leg
        const q = T(R + bSpan / 2, y1), ar = c.size ? c.size * 2.4 : 5; P.arc(q[0], q[1], ar, 180 - t.ang, 180, { stroke: '#e00000', w: 0.25, layer: 'DIM' });
        P.text(q[0] - ar - 1, q[1] - 0.6, Math.round(t.ang) + '°', { size: (c.size || 3) * 1.1, anchor: 'end', color: '#00a800', layer: 'DIMTEXT' });
      }
    } else if (isBeam(t)) {
      const p = T(R - t.L / 2, y), q = T(R + t.L / 2, y1);
      rgDrawBeam(P, p[0], p[1], q[0], q[1], info, k, t.type); topSpan = t.L; labels.push([y - t.v / 2, R + t.L / 2 + 0.4, t, info]);
    } else if (t.type === 'shackle') {
      const p = T(R, y), q = T(R, y1); rgDrawShackle(P, p[0], p[1], q[1] > p[1] ? q[1] : p[1] + 1.6, info, k); topSpan = 0; labels.push([y - t.v / 2, R + 0.18, t, info]);
    } else { const p = T(R, y), q = T(R, y1); rgDrawVertical(P, p, q, info, k); topSpan = 0; labels.push([y - t.v / 2, R + 0.4, t, info]); }
    y = y1;
  }
  if (c.callout !== false && labels.length) {
    const sz = c.size || 2.3, lx = Math.max(...labels.map(l => l[1]), R + c.half) + 0.6; let nextMin = -Infinity;
    for (const [yy, x0, t, info] of labels) {
      const lines = (c.lines || rgCalloutLines)(t, info), p0 = T(x0, yy), p1 = [T(lx, yy)[0], T(lx, yy)[1]];
      if (p1[1] < nextMin) p1[1] = nextMin; nextMin = p1[1] + Math.max(3.2, lines.length * sz * 1.3 + 0.6);
      P.line(p0[0], p0[1], p1[0] - 0.6, p1[1], { stroke: '#555', w: 0.1, layer: 'RIGGING' });
      P.circle(p0[0], p0[1], 0.35, { stroke: 'none', fill: '#555', layer: 'RIGGING' });
      lines.forEach((s, i) => P.text(p1[0], p1[1] + 0.9 + i * sz * 1.3, s, { size: i ? sz * 0.92 : sz, color: i ? '#5a3a12' : '#333', layer: 'RIGGING' }));
    }
  }
  return { labels, reach: Math.max(...labels.map(l => l[1]), R + c.half) };
}

// ---------- pictograms (a 24-unit grid scaled into the box x,y,w,h) ----------
function drawTackleIcon(P, x, y, w, h, tackle) {
  const info = SLING_INFO(tackle || {}), s = Math.min(w, h) / 24, ox = x + (w - 24 * s) / 2, oy = y + (h - 24 * s) / 2;
  const U = (a, b) => [ox + a * s, oy + b * s], lw = Math.max(0.08, 1.1 * s), ink = RG_INK, kp = { layer: 'ICON', keep: true }, lay = { layer: 'ICON' };
  const ell = (cx, cy, a, b, rot) => { const c = U(cx, cy), ux = Math.cos(rot || 0), uy = Math.sin(rot || 0); return rgEllipse(c[0], c[1], a * s, b * s, ux, uy, 16); };
  const col = info.colour, dk = _rgShade(col, -40), kind = info.kind;
  if (kind === 'webbing') {
    P.poly([U(8.6, 5), U(15.4, 5), U(15.4, 19), U(8.6, 19)], { closed: true, fill: col, stroke: ink, w: lw, ...kp });
    P.line(...U(10.3, 6), ...U(10.3, 18), { stroke: '#ffffff', w: lw * 0.5, dash: true, ...kp }); P.line(...U(13.7, 6), ...U(13.7, 18), { stroke: '#ffffff', w: lw * 0.5, dash: true, ...kp });
    for (const cy of [4.6, 19.4]) { P.poly(ell(12, cy, 3.4, 3.2, 0), { closed: true, fill: col, stroke: ink, w: lw, ...kp }); P.poly(ell(12, cy, 1.5, 1.4, 0), { closed: true, fill: '#ffffff', stroke: dk, w: lw * 0.6, ...kp }); }
  } else if (kind === 'round') {
    P.line(...U(12, 5), ...U(12, 19), { stroke: ink, w: 5.6 * s, ...kp }); P.line(...U(12, 5), ...U(12, 19), { stroke: col, w: 4.6 * s, ...kp });
    P.line(...U(12, 6), ...U(12, 18), { stroke: '#ffffff', w: lw * 0.5, dash: true, ...kp });
    for (const cy of [3.6, 20.4]) P.poly(ell(12, cy, 4, 2.6, 0), { closed: true, fill: 'none', stroke: ink, w: lw, ...kp });
  } else if (kind === 'wire') {
    P.line(...U(12, 7), ...U(12, 17), { stroke: '#262626', w: 1.8 * s, ...lay }); P.line(...U(12, 7), ...U(12, 17), { stroke: '#9a9a9a', w: 0.6 * s, dash: true, ...lay });
    for (const [cy, fy] of [[4, 7.4], [20, 16.6]]) { P.poly(ell(12, cy, 3, 3.6, Math.PI / 2), { closed: true, fill: '#ffffff', stroke: '#262626', w: lw * 1.2, ...lay }); P.rect(...U(10.6, fy - 1.1), 2.8 * s, 2.2 * s, { fill: '#b8bec4', stroke: '#262626', w: lw * 0.7, ...lay }); }
  } else if (kind === 'chain') {
    for (let i = 0; i < 5; i++) { const edge = i % 2, cy = 3.8 + i * 4.1; P.poly(ell(12, cy, 3.1, edge ? 1.2 : 2.6, Math.PI / 2), { closed: true, fill: edge ? '#8d8372' : '#cfc6b3', stroke: '#2b2217', w: lw, ...kp }); }
  } else if (kind === 'shackle') {
    const pts = [U(7, 6), U(7, 13)]; for (let i = 0; i <= 10; i++) { const a = Math.PI + Math.PI * i / 10; pts.push(U(12 + 5 * Math.cos(a), 13 - 5 * Math.sin(a))); } pts.push(U(17, 13), U(17, 6));
    P.poly(pts, { stroke: ink, w: 3.2 * s, fill: 'none', ...kp }); P.poly(pts, { stroke: '#a7aeb5', w: 2.2 * s, fill: 'none', ...kp });
    P.line(...U(4.4, 6), ...U(19.6, 6), { stroke: ink, w: 2.6 * s, ...kp }); P.line(...U(4.4, 6), ...U(19.6, 6), { stroke: '#c8102e', w: 1.8 * s, ...kp }); P.circle(...U(4.4, 6), 1.8 * s, { fill: '#c8102e', stroke: ink, w: lw * 0.7, ...kp });
  } else if (kind === 'spreader' || kind === 'beam') {
    const fill = kind === 'spreader' ? '#f2c230' : '#9aa4ad';
    P.rect(...U(2, 10), 20 * s, 5 * s, { fill, stroke: ink, w: lw, ...kp });
    if (kind === 'beam') { P.line(...U(2, 11.6), ...U(22, 11.6), { stroke: ink, w: lw * 0.5, ...kp }); P.line(...U(2, 13.4), ...U(22, 13.4), { stroke: ink, w: lw * 0.5, ...kp }); }
    P.poly([U(9.8, 10), U(14.2, 10), U(12, 6.6)], { closed: true, fill, stroke: ink, w: lw, ...kp }); P.circle(...U(12, 6.2), 1.2 * s, { fill: '#ffffff', stroke: ink, w: lw * 0.8, ...kp });
    for (const ex of [4.5, 19.5]) { P.poly([U(ex - 1.8, 15), U(ex + 1.8, 15), U(ex, 18.5)], { closed: true, fill, stroke: ink, w: lw, ...kp }); P.circle(...U(ex, 19), 1.2 * s, { fill: '#ffffff', stroke: ink, w: lw * 0.8, ...kp }); }
  } else if (kind === 'hook') {
    P.circle(...U(12, 4.6), 2.6 * s, { fill: 'none', stroke: ink, w: 1.4 * s, ...lay }); P.line(...U(12, 7.2), ...U(12, 14), { stroke: ink, w: 2.4 * s, ...lay });
    P.arc(...U(12 + 0, 14), 5 * s, 180, 360, { stroke: ink, w: 2.4 * s, ...lay }); P.line(...U(17, 14), ...U(17, 11), { stroke: ink, w: 2.4 * s, ...lay });
  } else {
    P.circle(...U(12, 4.6), 2.4 * s, { fill: 'none', stroke: ink, w: lw * 1.3, ...lay });
    P.rect(...U(6, 7.5), 12 * s, 11 * s, { fill: '#e6e8ec', stroke: ink, w: lw, ...lay }); P.line(...U(8.5, 13), ...U(15.5, 13), { stroke: ink, w: lw * 0.6, ...lay });
  }
}
// the same pictogram as an inline <svg> for the on-screen app (px square). Ink follows the page colour so it works in dark mode.
function rgIconSVG(tackleOrMat, px) {
  const t = typeof tackleOrMat === 'string' ? { mat: tackleOrMat, type: RG_TYPE_OF[tackleOrMat] } : tackleOrMat || {};
  const P = new Prims(); drawTackleIcon(P, 0, 0, 24, 24, t);
  return toSVG(P, { viewBox: [0, 0, 24, 24], width: px + 'px', height: px + 'px', cmap: (c) => c === RG_INK ? 'currentColor' : c, attrs: ' aria-hidden="true" focusable="false"' });
}

// ---------- the LIFTING TACKLES schedule ----------
const RG_COLS = [['ITEM', 21], ['TYPE / STANDARD', 21], ['COLOUR', 12], ['HITCH', 12], ['WLL T (VERT → EFF.)', 14], ['CARRIES T', 12], ['USED', 8], ['CERT. / EXAM', 21]];
function rgScheduleCells(it, j, ov) {
  const info = it.rg || SLING_INFO(it), nm = rgName(it, info).toUpperCase();
  const util = it.util != null ? it.util : null, carry = it.carry != null ? it.carry : null;
  const size = info.widthMm ? ` ${info.widthMm}MM` : info.dia ? ` Ø${_rgF(info.dia)}MM` : '';
  const hitch = info.isSling ? info.hitch.toUpperCase() : '—';
  const legs = info.isSling ? `${info.legs}-LEG${it.ang != null && !info.single ? ' @' + Math.round(it.ang) + '°' : ''}` : '';
  const wll = info.wll > 0 ? [_rgF(info.wll), info.wllEff !== info.wll ? '→ ' + _rgF(info.wllEff) : ''] : ['NOT GIVEN', ''];
  const per = it.type === 'sling' && it.T != null ? [_rgF(it.T), 'PER LEG'] : carry != null ? [_rgF(carry), 'TOTAL'] : ['—', ''];
  const cells = [
    { t: `${j + 1}. ${nm}`, s: `${it.L ? _rgM(it.L) : ''}${it.w ? ' · ' + (+it.w).toFixed(2) + 'T' : ''}`, bold: true },
    { t: RG_MATS[info.kind].short + (info.grade ? ' GR' + info.grade : '') + size, s: info.std.toUpperCase() },
    { t: info.colourName ? info.colourName.toUpperCase() : '—', s: info.enCoded ? 'EN CODE' : '', sw: info.enCoded ? info.colour : null },
    { t: hitch, s: legs },
    { t: wll[0], s: wll[1] },
    { t: per[0], s: per[1] },
    { t: util != null ? Math.round(util) + '%' : '—', s: '', color: util != null && util > 100 ? '#e00000' : util != null && util > 90 ? '#e07b00' : null, bold: util != null && util > 90 },
    { t: info.cert ? info.cert.toUpperCase() : '—', s: info.inspected ? 'EXAM ' + info.inspected : '' }
  ];
  if (info.examMonths != null && info.examMonths > 6) cells[7].color = COL.red;
  return cells;
}
// table data for one load: [{ cells, ov }] (ov = text typed over the row in "Values on the sheet")
function rgSchedule(plan, r, i, rowOf) {
  if (!r || !r.stack) return null;
  return { cols: RG_COLS, rows: r.stack.items.map((it, j) => { const row = rowOf ? rowOf(i, j) : null; return { cells: rgScheduleCells(it, j), ov: row && row.ov ? row.v : null }; }) };
}
const RG_ROW_MUL = 1.75; // a table row is this many normal rows high (two lines of text)
function rgScheduleUnits(tb) { return 1 + tb.rows.length * RG_ROW_MUL; }
// draw the table at (x, y) with width w; rh = one normal row. Returns the y below it.
function rgDrawSchedule(P, x, y, w, rh, tb, o) {
  o = o || {}; const LW = 0.2, tot = tb.cols.reduce((a, c) => a + c[1], 0), xs = [x]; tb.cols.forEach(c => xs.push(xs[xs.length - 1] + c[1] / tot * w));
  const hs = o.headSize || Math.min(2.1, rh * 0.42), rowH = rh * RG_ROW_MUL, fs = o.size || Math.min(3.1, rowH * 0.27);
  P.rect(x, y, w, rh, { fill: '#efefef', stroke: '#000', w: LW, layer: 'TABLE' });
  tb.cols.forEach((c, ci) => { if (ci) P.line(xs[ci], y, xs[ci], y + rh, { stroke: '#000', w: LW, layer: 'TABLE' }); cellText(P, (xs[ci] + xs[ci + 1]) / 2, y + rh / 2, c[0], xs[ci + 1] - xs[ci] - 1.2, hs, { bold: true, h: rh }); });
  y += rh;
  for (const row of tb.rows) {
    P.rect(x, y, w, rowH, { fill: 'none', stroke: '#000', w: LW, layer: 'TABLE' });
    if (row.ov == null) for (let ci = 1; ci < tb.cols.length; ci++) P.line(xs[ci], y, xs[ci], y + rowH, { stroke: '#000', w: LW, layer: 'TABLE' });
    if (row.ov != null) { // the person typed over this row: the item name stays, their text takes the rest
      const c0 = row.cells[0]; cellText(P, (xs[0] + xs[1]) / 2, y + rowH / 2, c0.t, xs[1] - xs[0] - 1.2, fs, { bold: true, h: rowH });
      cellText(P, (xs[1] + xs[tb.cols.length]) / 2, y + rowH / 2, row.ov, xs[tb.cols.length] - xs[1] - 2, fs * 1.1, { h: rowH });
      y += rowH; continue;
    }
    row.cells.forEach((c, ci) => {
      const cx = (xs[ci] + xs[ci + 1]) / 2, cw = xs[ci + 1] - xs[ci] - 1.2, two = !!c.s;
      if (c.sw) { // the EN colour as a bar, its name under it
        P.rect(cx - cw * 0.36, y + rowH * 0.16, cw * 0.72, rowH * 0.24, { fill: c.sw, stroke: '#000', w: 0.12, layer: 'TABLE', keep: true });
        cellText(P, cx, y + rowH * 0.6, c.t, cw, fs * 0.9, { bold: true, h: rowH / 2 }); cellText(P, cx, y + rowH * 0.84, c.s, cw, fs * 0.7, { color: '#555555', h: rowH / 3 }); return;
      }
      cellText(P, cx, two ? y + rowH * 0.32 : y + rowH / 2, c.t, cw, fs, { bold: c.bold, color: c.color, h: rowH / 2 });
      if (two) cellText(P, cx, y + rowH * 0.72, c.s, cw, fs * 0.82, { color: '#555555', h: rowH / 2 });
    });
    y += rowH;
  }
  return y;
}

// ---------- the rigging detail panel on the A1 sheet ("Drawing + slings" layout) ----------
function rgPanelLines(t, info) { // three short lines per item: what it is, what it is rated, what it carries
  const nm = rgName(t, info).toUpperCase();
  const l1 = `${t.j != null ? t.j + 1 + '. ' : ''}${nm}${t.L ? ' ' + _rgM(t.L) : ''}${t.w ? ' · ' + (+t.w).toFixed(2) + 'T' : ''}`;
  const b2 = []; if (info.colourName) b2.push(info.colourName.toUpperCase()); if (info.wll > 0) b2.push(_rgF(info.wll) + 'T'); b2.push(info.generic ? 'SLING' : RG_MATS[info.kind].short + (info.grade ? ' GR' + info.grade : ''));
  if (info.hitchLabel) b2.push(info.hitchLabel.toUpperCase()); if (info.isSling && info.legs > 1) b2.push(info.legs + ' LEGS'); if (info.std) b2.push(info.std.toUpperCase());
  const l3 = t.type === 'sling' && t.T != null ? `CARRIES ${_rgF(t.T)}T PER LEG${t.ang != null && !info.single ? ' @' + Math.round(t.ang) + '°' : ''}${t.util != null ? ' · ' + Math.round(t.util) + '% OF WLL' : ' · WLL NOT GIVEN'}`
    : t.carry != null ? `CARRIES ${_rgF(t.carry)}T${t.util != null ? ' · ' + Math.round(t.util) + '% OF WLL' : ''}` : '';
  return l3 ? [l1, b2.join(' · '), l3] : [l1, b2.join(' · ')];
}
function rgDrawRiggingPanel(P, box, plan, calc, li) {
  const load = plan.loads[li], res = calc.loads[li], st = res && res.stack; if (!st) return;
  const items = st.items, nI = items.length, lL = _rgN(load.l, 2), lH = _rgN(load.h, 1.5), pick = _rgN(load.pick) > 0 ? _rgN(load.pick) : Math.max(0.3, lL - 0.3), half = pick / 2;
  const tx = box.x + 2, tw = box.w - 4, rh = nI > 6 ? 5 : 6.2;
  const sumRows = [['LOAD WEIGHT (incl. contingency)', fmtT(res.W + res.contW)], ['HOOK BLOCK + TACKLES', fmtT(res.hb + res.tk)], ['TOTAL ON THE HOOK' + (res.daf ? ' / DESIGN (DAF)' : ''), fmtT(res.total) + (res.daf ? ' / ' + fmtT(res.design) : '')], ['RIGGING HEIGHT (HOOK TO LOAD)', _rgM(st.H)]];
  const worst = items.filter(t => t.util != null).sort((a, b) => b.util - a.util)[0];
  sumRows.push(['BUSIEST ITEM', worst ? `${rgName(worst).toUpperCase()} — ${Math.round(worst.util)}% OF WLL` : 'NO WLL ENTERED, NOT CHECKED']);
  const sumH = 8 + sumRows.length * 6, schH = 8 + rh + rh * RG_ROW_MUL * nI, hA = Math.max(110, box.h - sumH - schH - 10);
  // ---- the picture ----
  const spanMax = Math.max(lL, 2 * half, ...items.filter(t => t.type === 'spreader' || t.type === 'beam').map(t => t.L));
  const hookY = box.y + 24, k = Math.max(3, Math.min(45, (hA - 24 - 6) / Math.max(0.5, st.H + lH), (box.w * 0.44) / Math.max(1, spanMax)));
  const cx = box.x + 12 + spanMax / 2 * k, yTop = hookY + st.H * k, T = (mx, my) => [cx + mx * k, yTop - my * k];
  P.rect(cx - 5, hookY - 20, 10, 10, { closed: true, fill: '#e3b505', stroke: '#222', w: 0.3, layer: 'HOOK' });
  P.line(cx - 1.6, box.y + 1, cx - 1.6, hookY - 20, { stroke: '#222', w: 0.3, layer: 'HOOK' }); P.line(cx + 1.6, box.y + 1, cx + 1.6, hookY - 20, { stroke: '#222', w: 0.3, layer: 'HOOK' });
  P.arc(cx, hookY - 6.5, 3.2, 180, 360, { stroke: '#222', w: 0.7, layer: 'HOOK' }); P.line(cx, hookY - 10, cx, hookY - 3.3, { stroke: '#222', w: 0.5, layer: 'HOOK' });
  P.rect(cx - lL / 2 * k, yTop, lL * k, lH * k, { stroke: '#7a007a', w: 0.4, fill: '#f1d5f1', layer: 'LOAD' });
  P.text(cx, yTop + lH * k / 2, `${(load.name || 'LOAD').toUpperCase()} ${_rgF(res.W)}T`, { size: Math.min(4, Math.max(2.4, lL * k / 12)), anchor: 'middle', vAlign: 'middle', color: '#7a007a', layer: 'LOAD' });
  for (const f of [-1, 1]) P.circle(cx + f * half * k, yTop, 0.9, { stroke: COL.red, w: 0.35, fill: '#ffffff', layer: 'RIGGING' });
  const sz = nI > 5 ? 2.5 : 3;
  rgDrawStack(P, T, k, { R: 0, hookBot: st.H, half, items, callout: true, size: sz, angles: true, lines: rgPanelLines });
  if (st.H * k > 12) dimA(P, [cx - spanMax / 2 * k - 6, hookY], [cx - spanMax / 2 * k - 6, yTop], 4, 'RIGGING HEIGHT ' + _rgM(st.H), { side: 'left', size: 2.8 });
  // ---- summary and schedule ----
  let y = box.y + hA + 4;
  const bar = (txt) => { P.rect(tx, y, tw, 8, { fill: '#7f7f7f', stroke: '#222', w: 0.3 }); P.text(tx + tw / 2, y + 4, txt, { size: 4, bold: true, anchor: 'middle', vAlign: 'middle', color: '#fff' }); y += 8; };
  bar('RIGGING SUMMARY — LIFT ' + (li + 1));
  sumRows.forEach(([a, b]) => { P.rect(tx, y, tw, 6, { stroke: '#222', w: 0.2, fill: 'none' }); P.line(tx + tw * 0.62, y, tx + tw * 0.62, y + 6, { stroke: '#222', w: 0.2 }); cellText(P, tx + tw * 0.31, y + 3, a, tw * 0.62 - 3, 3, { bold: true, h: 6 }); cellText(P, tx + tw * 0.81, y + 3, b, tw * 0.38 - 3, 3.2, { h: 6 }); y += 6; });
  y += 4; bar('LIFTING TACKLE SCHEDULE'); y -= 0;
  const tb = rgSchedule(plan, res, li, (_, j) => (typeof sheetRow === 'function' ? sheetRow(plan, `t${li}.${j}`, '', '') : null));
  rgDrawSchedule(P, tx, y, tw, rh, tb, { size: 3, headSize: 2.4 });
}
