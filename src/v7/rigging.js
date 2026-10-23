// ===== v10 rigging editor: the "Hanging on the hook" list in the Hook sheet, with real detail for each tackle =====
// Replaces the plain Type/Length/Weight rows from sheets.js. Each item gets a material picker (pictograms), WLL with the EN colour,
// hitch, legs, size, certificate, examination date, edge protection and a live line "Carries X t per leg — Y % of WLL".
// Maths, catalogue and pictograms live in src/rigging.js.

(() => { // styles for the new controls (the shell is owned elsewhere)
  try {
    if (document.getElementById('rigCss')) return;
    const st = document.createElement('style'); st.id = 'rigCss';
    st.textContent = `
.rg-card, #rgSec { grid-template-columns: minmax(0, 1fr); min-width: 0; }
.rg-card { display: grid; gap: 10px; padding: 12px; border-radius: var(--r); background: var(--card); box-shadow: var(--shadow-1); }
.rg-card + .rg-card { margin-top: 8px; }
.rg-mats { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
.rg-mat { min-height: 62px; display: grid; justify-items: center; align-content: center; gap: 3px; padding: 6px 2px; border-radius: 12px; background: var(--card-2); color: var(--ink); font-size: 11px; font-weight: 600; line-height: 1.1; text-align: center; }
.rg-mat[aria-checked="true"] { background: var(--ink); color: var(--card); }
.rg-help { margin: 0; font-size: 13px; line-height: 1.35; color: var(--ink-2); }
.rg-f { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.rg-f.c3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.rg-f label { display: grid; gap: 2px; align-content: start; min-height: 44px; padding: 6px 10px; border-radius: 10px; background: var(--card-2); }
.rg-f label > span { font-size: 11px; font-weight: 600; color: var(--ink-2); }
.rg-f input:not([type=checkbox]), .rg-f select { width: 100%; min-width: 0; border: 0; background: transparent; color: var(--ink); font-size: 16px; font-weight: 650; height: 28px; padding: 0; }
.rg-f small { font-size: 11px; line-height: 1.25; color: var(--ink-3); }
.rg-f .wide { grid-column: 1 / -1; }
.rg-lab { margin: 0 2px; font-size: 12px; font-weight: 700; color: var(--ink-2); text-transform: uppercase; letter-spacing: .02em; }
.rg-seg { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 4px; }
.rg-seg button { min-height: 44px; padding: 0 6px; border-radius: 10px; background: var(--card-2); color: var(--ink); font-size: 14px; font-weight: 600; }
.rg-seg button[aria-checked="true"] { background: var(--ink); color: var(--card); }
.rg-wll { display: flex; align-items: center; gap: 8px; }
.rg-wll input { flex: 1; }
.rg-sw { display: inline-block; flex: none; width: 22px; height: 22px; border-radius: 7px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.28); background: var(--fill-2); }
.rg-chips { display: flex; gap: 6px; overflow-x: auto; padding: 2px 0 4px; scrollbar-width: none; }
.rg-chips::-webkit-scrollbar { display: none; }
.rg-chips button { flex: none; min-width: 48px; min-height: 44px; padding: 0 10px; border-radius: 12px; background: var(--card-2); color: var(--ink); font-size: 14px; font-weight: 650; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.rg-chips button[aria-pressed="true"] { box-shadow: inset 0 0 0 2px var(--ink); }
.rg-rate { margin: 0; font-size: 13px; line-height: 1.35; color: var(--ink-2); }
.rg-live { padding: 9px 12px; border-radius: 10px; font-size: 14px; line-height: 1.35; font-weight: 500; background: var(--fill); color: var(--ink); }
.rg-live b { font-weight: 750; }
.rg-live.ok { background: var(--safe-soft); color: var(--safe); }
.rg-live.warn { background: var(--warn-soft); color: var(--warn); }
.rg-live.fail { background: var(--stop-soft); color: var(--stop); }
.rg-notes { margin: 0; padding: 0 0 0 16px; font-size: 12.5px; line-height: 1.4; color: var(--ink-2); }
.rg-add { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.rg-add .chip { height: 44px; }
.rg-sleeve { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; padding: 6px 10px; border-radius: 10px; background: var(--card-2); }
.rg-sleeve b { display: block; font-size: 14px; font-weight: 650; } .rg-sleeve small { display: block; font-size: 11px; color: var(--ink-3); }
`;
    document.head.appendChild(st);
  } catch (e) { console.error(e); }
})();

// a richer starter list for "From my list" (a saved list of your own replaces it). Names carry the WLL, so nothing is assumed.
DEFAULT_TACKLE_LIB.splice(0, DEFAULT_TACKLE_LIB.length,
  { name: 'Green 2 t webbing sling', type: 'sling', mat: 'webbing', hitch: 'straight', L: 4, w: 0, legs: 2, wllV: 2, wll: 2 },
  { name: 'Yellow 3 t round sling', type: 'sling', mat: 'round', hitch: 'straight', L: 3, w: 0, legs: 2, wllV: 3, wll: 3 },
  { name: '2-leg wire rope sling', type: 'sling', mat: 'wire', hitch: 'straight', L: 6, w: 0, legs: 2, eye: 'thimble' },
  { name: '4-leg chain sling (grade 8)', type: 'sling', mat: 'chain', grade: '8', hitch: 'straight', L: 6, w: 0, legs: 4 },
  { name: 'Bow shackle', type: 'shackle', mat: 'shackle', shape: 'bow', std: 'EN 13889', L: 0.4, w: 0, legs: 1 },
  { name: 'Spreader beam', type: 'spreader', mat: 'spreader', L: 6, w: 0, legs: 1 },
  { name: 'Lifting beam', type: 'beam', mat: 'beam', L: 4, w: 0, legs: 1 },
  { name: 'Chain block', type: 'chain', mat: 'chain', L: 1.5, w: 0, legs: 1 });

const RG_NEW = { // a fresh item: size and shape only. The WLL is left empty on purpose: it must come from the tag.
  webbing: { L: 4, legs: 2, hitch: 'straight' }, round: { L: 3, legs: 2, hitch: 'straight' }, wire: { L: 4, legs: 2, hitch: 'straight', eye: 'thimble' },
  chain: { L: 4, legs: 2, hitch: 'straight', grade: '8' }, shackle: { L: 0.4, legs: 1, shape: 'bow', std: 'EN 13889' }, spreader: { L: 3, legs: 1 }, beam: { L: 3, legs: 1 },
  hook: { L: 0.5, legs: 1 }, other: { L: 0.5, legs: 1 }
};
const rgLi = () => state.plan.loads[activeLi()];
const rgItemOf = (j) => state.calc?.loads?.[activeLi()]?.stack?.items?.find(x => x.j === +j) || null;

// "Rated 1.6 t as hung ..." — what the item can lift the way it is rigged
function rgRateText(t, info) {
  if (!(info.wll > 0)) return 'Type the WLL from the tag. Without it the app cannot check this item.';
  if (!info.isSling) return `Rated ${_rgF(info.wllEff)} t.`;
  if (info.hitch === 'basket') return `Basket hitch: the set is rated ${_rgF(info.wllEff)} t (${info.modeFactor} × ${_rgF(info.wll)} t). Each branch is limited to ${_rgF(info.wllLeg)} t.`;
  if (info.legs === 1) return info.hitch === 'choke' ? `Choke hitch: rated ${_rgF(info.wllEff)} t (80 % of ${_rgF(info.wll)} t).` : `Straight pull: rated ${_rgF(info.wll)} t.`;
  return `The set is rated ${_rgF(info.wllEff)} t at ${Math.round(info.beta)}° from straight down (${info.modeFactor} × ${_rgF(info.wll)} t). Each leg is limited to ${_rgF(info.wllLeg)} t.`;
}
// the live line under each item
function rgLiveState(t, it, info) {
  if (!it) return { cls: '', html: 'Give it a length or a weight and it counts in the lift.' };
  const per = it.type === 'sling' && it.T != null ? `${_rgF(it.T)} t per leg` : `${_rgF(it.carry != null ? it.carry : 0)} t`;
  const angle = it.type === 'sling' && it.ang != null && !info.single ? ` · legs ${Math.round(90 - it.ang)}° from straight down` : '';
  if (!(info.wll > 0)) return { cls: 'warn', html: `Carries <b>${per}</b>. Type the WLL from the tag to check it.${angle}` };
  const u = it.util != null ? it.util : 0, cls = u > 100 ? 'fail' : u > 90 ? 'warn' : 'ok';
  return { cls, html: `Carries <b>${per}</b> — <b>${Math.round(u)} %</b> of WLL${u > 100 ? ' (too much)' : u > 90 ? ' (very close to the limit)' : ''}${angle}` };
}

function rgCard(t, j, r) {
  const it = r?.stack?.items?.find(x => x.j === j) || null;
  const info = SLING_INFO(it || t), kind = info.kind, M = RG_MATS[kind], isSling = info.isSling, k = `data-rg="${j}.`;
  const picked = t.mat && RG_MATS[t.mat] ? t.mat : (info.generic ? '' : kind);
  const wllNow = info.wll;
  const mats = RG_MAT_ORDER.map(m => `<button type="button" class="rg-mat tap" role="radio" aria-checked="${picked === m}" data-sa="rgMat" data-j="${j}" data-v="${m}" aria-label="${h(RG_MATS[m].label)}">${rgIconSVG({ mat: m, type: RG_TYPE_OF[m], wllV: (m === 'webbing' || m === 'round') ? wllNow : '', colKey: t.colKey }, 30)}<span>${h(RG_MATS[m].icon)}</span></button>`).join('');
  const lenLab = kind === 'spreader' || kind === 'beam' ? 'Span (m)' : isSling ? 'Length of one leg (m)' : 'Height it adds (m)';
  const lenHelp = kind === 'spreader' || kind === 'beam' ? 'Distance between the lifting points.' : isSling ? 'From the hook (or beam) down to the load.' : 'How far it lowers the load.';
  let out = `<div class="rg-card" data-rgcard="${j}">
    <div class="tk-h"><span class="n">${j + 1}</span><input type="text" data-tk="${j}.name" value="${h(t.name || '')}" placeholder="${h(info.label)}" aria-label="Item ${j + 1} name"><button type="button" class="tap" data-sa="tkUp" data-j="${j}" aria-label="Move up"${j ? '' : ' disabled'}>${ic('chev', 18, 2.2).replace('<svg', '<svg style="transform:rotate(-90deg)"')}</button><button type="button" class="tap" data-sa="rgSave" data-j="${j}" aria-label="Save to my list">${ic('star', 18)}</button><button type="button" class="tap" data-sa="tkDel" data-j="${j}" aria-label="Remove">${ic('trash', 18)}</button></div>
    <p class="rg-lab">What is it made of?</p><div class="rg-mats" role="radiogroup" aria-label="Material of item ${j + 1}">${mats}</div>
    <p class="rg-help">${picked ? `<b>${h(M.label)}</b>${info.std ? ' · ' + h(info.std) : ''}. ${h(M.help)}` : 'Pick what it is made of. The app then knows its standard, its colour code and how its WLL changes with the hitch and the angle.'}</p>
    <div class="rg-f c3"><label><span>${lenLab}</span><input type="text" inputmode="decimal" ${k}L" value="${h(t.L ?? '')}" aria-label="${lenLab}"><small>${lenHelp}</small></label>
      <label><span>Its own weight (t)</span><input type="text" inputmode="decimal" ${k}w" value="${h(t.w ?? '')}" aria-label="Weight in tonnes"><small>Counted in the lift.</small></label>
      ${isSling ? `<label><span>Number of legs</span><select ${k}legs" aria-label="Number of legs">${[1, 2, 3, 4].map(n => `<option value="${n}"${info.legs === n ? ' selected' : ''}>${n}${n === 1 ? ' leg' : ' legs'}</option>`).join('')}</select><small>How many legs carry the load.</small></label>` : '<span></span>'}</div>`;
  if (isSling) out += `<p class="rg-lab">How is it hitched?</p><div class="rg-seg" role="radiogroup" aria-label="Hitch">${Object.entries(RG_HITCH).map(([hk, hv]) => `<button type="button" class="tap" role="radio" aria-checked="${info.hitch === hk}" data-sa="rgHitch" data-j="${j}" data-v="${hk}">${h(hv.title)}</button>`).join('')}</div><p class="rg-help">${h(RG_HITCH[info.hitch].help)}</p>`;
  // WLL with the colour swatch
  const chips = M.coded ? RG_COLOURS.map(c => `<button type="button" class="tap" data-sa="rgWll" data-j="${j}" data-v="${c.wll}" aria-pressed="${Math.abs(wllNow - c.wll) < 1e-6}" aria-label="${c.name} ${c.wll} tonnes"><i class="rg-sw" style="background:${c.hex};width:16px;height:16px"></i>${c.wll}</button>`).join('')
    : kind === 'shackle' ? RG_SHACKLE_WLL.map(w => `<button type="button" class="tap" data-sa="rgWll" data-j="${j}" data-v="${w}" aria-pressed="${Math.abs(wllNow - w) < 1e-6}">${w}</button>`).join('') : '';
  out += `<p class="rg-lab">Strength (from the tag)</p><div class="rg-f"><label class="wide"><span>WLL, straight pull of one leg (t)</span><div class="rg-wll">${M.coded ? `<i class="rg-sw" data-rgsw style="${info.enCoded ? 'background:' + info.colour : ''}"></i>` : ''}<input type="text" inputmode="decimal" ${k}wllV" value="${h(t.wllV ?? t.wll ?? '')}" placeholder="from the tag" aria-label="Vertical WLL in tonnes"></div><small data-rgswn>${M.coded ? (info.enCoded ? `${h(info.colourName)} is the EN colour for this WLL.` : 'The EN colour appears when you type a WLL of 1 t or more.') : 'WLL is the most the item may carry. Copy it from the tag or certificate. The app never guesses it.'}</small></label></div>`;
  if (chips) out += `<div class="rg-chips" aria-label="Quick WLL choices">${chips}</div>`;
  if (M.coded) out += `<div class="rg-f"><label class="wide"><span>Colour on the tag</span><select ${k}colKey" aria-label="Tag colour"><option value="">Automatic (EN code)</option>${RG_COLOURS.map(c => `<option value="${c.key}"${t.colKey === c.key ? ' selected' : ''}>${c.name} · ${c.wll}${c.wll >= 10 ? '+' : ''} t</option>`).join('')}</select><small>Leave it on automatic unless the tag says otherwise.</small></label></div>`;
  out += `<p class="rg-rate" data-rgrate>${h(rgRateText(t, info))}</p>`;
  // kind-specific size
  const size = [];
  if (kind === 'webbing') size.push(`<label><span>Width (mm)</span><input type="text" inputmode="decimal" ${k}widthMm" value="${h(t.widthMm ?? '')}" placeholder="${rgWebWidth(wllNow) || ''}" aria-label="Webbing width in millimetres"><small>Wider strap, higher WLL.${rgWebWidth(wllNow) ? ` Usual for ${_rgF(wllNow)} t: ${rgWebWidth(wllNow)} mm.` : ''}</small></label>`);
  if (kind === 'wire' && !info.generic) size.push(`<label><span>Rope diameter (mm)</span><input type="text" inputmode="decimal" ${k}dia" value="${h(t.dia ?? '')}" placeholder="16" aria-label="Wire rope diameter in millimetres"><small>Measured across the rope.</small></label><label><span>Eye at the ends</span><select ${k}eye" aria-label="Eye type">${Object.entries(RG_EYES).map(([ek, ev]) => `<option value="${ek}"${info.eye === ek ? ' selected' : ''}>${ev}</option>`).join('')}</select><small>A thimble protects the eye from wear.</small></label>`);
  if (kind === 'chain') { const ty = info.dia > 0 ? rgChainTypical(info.dia, info.grade || '8') : null; size.push(`<label><span>Chain size (mm)</span><input type="text" inputmode="decimal" ${k}dia" value="${h(t.dia ?? '')}" placeholder="13" aria-label="Chain size in millimetres"><small>${ty ? `Typical grade ${info.grade || '8'} at ${_rgF(info.dia)} mm: about ${_rgF(ty)} t. Check the tag.` : 'The thickness of one link.'}</small></label><label><span>Chain grade</span><select ${k}grade" aria-label="Chain grade"><option value="8"${(info.grade || '8') === '8' ? ' selected' : ''}>Grade 8</option><option value="10"${info.grade === '10' ? ' selected' : ''}>Grade 10</option></select><small>Stamped on the links. EN 818-4.</small></label>`); }
  if (kind === 'shackle') size.push(`<label><span>Shape</span><select ${k}shape" aria-label="Shackle shape"><option value="bow"${info.shape !== 'dee' ? ' selected' : ''}>Bow (rounded)</option><option value="dee"${info.shape === 'dee' ? ' selected' : ''}>Dee (D shape)</option></select><small>Bow shackles take a pull at an angle better.</small></label><label><span>Standard</span><select ${k}std" aria-label="Shackle standard"><option value="EN 13889"${info.std === 'EN 13889' ? ' selected' : ''}>EN 13889</option><option value="US Fed RR-C-271"${/RR-C-271/.test(info.std) ? ' selected' : ''}>US Fed RR-C-271</option></select><small>Printed on the shackle body.</small></label><label><span>Pin size (mm)</span><input type="text" inputmode="decimal" ${k}dia" value="${h(t.dia ?? '')}" placeholder="optional" aria-label="Pin size in millimetres"><small>Only used for the drawing.</small></label>`);
  if (size.length) out += `<div class="rg-f">${size.join('')}</div>`;
  // certificate and examination
  out += `<p class="rg-lab">Paperwork</p><div class="rg-f"><label><span>Certificate or tag no.</span><input type="text" ${k}cert" value="${h(t.cert ?? '')}" placeholder="e.g. WS-118" autocomplete="off" aria-label="Certificate or tag number"><small>Printed on the sheet.</small></label>
    <label><span>Last examined</span><input type="date" ${k}inspected" value="${h(t.inspected ?? '')}" aria-label="Date of last thorough examination"><small>Needed every 6 months (LOLER).</small></label></div>`;
  if (info.isSling) out += `<label class="rg-sleeve"><span><b>Edge protection fitted</b><small>A sleeve or corner pad where the sling bends over a sharp edge. Shown on the drawing.</small></span><span class="sw"><input type="checkbox" ${k}sleeve" ${t.sleeve ? 'checked' : ''} aria-label="Edge protection fitted"><i></i></span></label>`;
  const lv = rgLiveState(t, it, info);
  out += `<div class="rg-live ${lv.cls}" data-rglive role="status">${lv.html}</div>`;
  const nts = info.notes.filter(n => !/^WLL not entered/.test(n) && !/^Edge protection fitted|^Sharp edges cut/.test(n));
  if (nts.length) out += `<ul class="rg-notes" data-rgnotes>${nts.map(n => `<li>${h(n)}</li>`).join('')}</ul>`;
  return out + '</div>';
}

function rgSection() {
  const li = activeLi(), l = state.plan.loads[li], r = state.calc.loads[li], tk = l.tackles || [];
  return `<section class="grp" id="rgSec"><h3>Hanging on the hook<span class="sp"></span><span style="text-transform:none;font-weight:600;color:var(--ink)" data-live="tk"></span></h3>
    <p class="foot" style="margin:0 4px 6px">Everything between the hook and the load, top to bottom. Pick what each item is made of, then copy its WLL from the tag. The app checks every item against its WLL.</p>
    ${tk.map((t, j) => rgCard(t, j, r)).join('') || '<p class="hint" style="margin:0 4px">Nothing yet. Add a shackle, slings or a spreader beam. Their length sets how high the hook must be and their weight is added to the lift.</p>'}
    <div class="rg-add" role="group" aria-label="Add an item"><span class="rg-lab" style="width:100%">Add</span>${['webbing', 'round', 'wire', 'chain', 'shackle', 'spreader', 'beam'].map(m => `<button type="button" class="chip tap" data-sa="rgAdd" data-v="${m}">${ic('plus', 16, 2.4)}${h(RG_MATS[m].icon)}</button>`).join('')}
      <label class="chip" style="position:relative">${ic('star', 16)}From my list<select data-sa-lib="1" style="position:absolute;inset:0;opacity:0" aria-label="Add from my list"><option value="">From my list…</option>${tackleLib().map((t, i) => `<option value="${i}">${h(t.name)}${t.L ? ' · ' + t.L + ' m' : ''}${t.w ? ' · ' + t.w + ' t' : ''}</option>`).join('')}</select></label>${tk.length ? `<button type="button" class="chip tap" data-sa="tkClear">Clear all</button>` : ''}</div></section>`;
}

// ---- wrap the Hook sheet: swap the old list for this one ----
const _rgLoadBody = SH.load.body, _rgLoadLive = SH.load.live;
SH.load.body = function () {
  const out = _rgLoadBody.apply(this, arguments); const a = out.indexOf('<section class="grp"><h3>Hanging on the hook'); if (a < 0) return out;
  const b = out.indexOf('</section>', a); if (b < 0) return out;
  return out.slice(0, a) + rgSection() + out.slice(b + 10);
};
SH.load.live = function (root, arg) { // keep the numbers fresh while typing
  if (_rgLoadLive) _rgLoadLive.call(this, root, arg);
  const l = rgLi(); if (!l) return;
  for (const card of root.querySelectorAll('[data-rgcard]')) {
    const j = +card.dataset.rgcard, t = l.tackles && l.tackles[j]; if (!t) continue;
    const it = rgItemOf(j), info = SLING_INFO(it || t), lv = rgLiveState(t, it, info);
    const live = card.querySelector('[data-rglive]'); if (live) { if (live.innerHTML !== lv.html) live.innerHTML = lv.html; live.className = 'rg-live ' + lv.cls; }
    const sw = card.querySelector('[data-rgsw]'); if (sw) sw.style.background = RG_MATS[info.kind].coded && info.enCoded ? info.colour : '';
    const sn = card.querySelector('[data-rgswn]'); if (sn && RG_MATS[info.kind].coded) sn.textContent = info.enCoded ? `${info.colourName} is the EN colour for this WLL.` : 'The EN colour appears when you type a WLL of 1 t or more.';
    const rt = card.querySelector('[data-rgrate]'); if (rt) rt.textContent = rgRateText(t, info);
    for (const c of card.querySelectorAll('[data-sa="rgWll"]')) c.setAttribute('aria-pressed', String(Math.abs(info.wll - +c.dataset.v) < 1e-6));
    const wm = card.querySelector('[data-rg$=".widthMm"]'); if (wm) wm.placeholder = rgWebWidth(info.wll) || '';
  }
};

// ---- actions ----
SA_EXTRA.rgAdd = (d) => { const l = rgLi(), m = RG_MATS[d.v] ? d.v : 'other'; l.tackles = l.tackles || []; l.tackles.push({ name: '', type: RG_TYPE_OF[m], mat: m, w: 0, wllV: '', cert: '', inspected: '', sleeve: false, ...RG_NEW[m] }); commit({ sheet: true }); };
SA_EXTRA.rgMat = (d) => {
  const l = rgLi(), t = l.tackles[+d.j]; if (!t || !RG_MATS[d.v]) return; const m = d.v, was = SLING_INFO(t);
  const groupChanged = (was.isSling ? 'sling' : was.kind) !== (RG_MATS[m].sling ? 'sling' : m); // sling ↔ shackle ↔ beam…: start from that kind's usual size
  const keepChainBlock = m === 'chain' && t.type === 'chain';
  t.mat = m; if (!keepChainBlock) t.type = RG_TYPE_OF[m];
  const dflt = RG_NEW[m] || {}; if (groupChanged) { t.L = dflt.L; t.legs = dflt.legs; }
  if (RG_MATS[m].sling && !t.hitch) t.hitch = 'straight';
  if (m === 'chain' && !t.grade) t.grade = '8'; if (m === 'wire' && !t.eye) t.eye = 'thimble'; if (m === 'shackle') { t.shape = t.shape || 'bow'; t.std = t.std || 'EN 13889'; }
  if (!RG_MATS[m].coded) delete t.colKey;
  commit({ sheet: true });
};
SA_EXTRA.rgHitch = (d) => { const t = rgLi().tackles[+d.j]; if (!t || !RG_HITCH[d.v]) return; t.hitch = d.v; commit({ sheet: true }); };
SA_EXTRA.rgWll = (d) => { const t = rgLi().tackles[+d.j]; if (!t) return; t.wllV = +d.v; t.wll = +d.v; commit({ sheet: true }); };
SA_EXTRA.rgSave = (d) => {
  const t = rgLi().tackles[+d.j]; if (!t) return; const lib = [...tackleLib()]; const c = JSON.parse(JSON.stringify(t));
  c.name = c.name || SLING_INFO(t).label; lib.push(c); state.settings.tackleLib = lib; saveSettings(); toast('Saved to your tackle list');
};

// ---- typing ----
const RG_NUMF = { L: 1, w: 1, wllV: 1, widthMm: 1, dia: 1 };
function rgSet(el, final) {
  if (!el.closest('#sheet')) return; const dot = el.dataset.rg.indexOf('.'), j = +el.dataset.rg.slice(0, dot), f = el.dataset.rg.slice(dot + 1);
  const l = rgLi(), t = l && l.tackles && l.tackles[j]; if (!t) return;
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (RG_NUMF[f]) { if (final) v = v === '' ? '' : num(String(v).replace(/[^\d.,-]/g, ''), ''); }
  else if (f === 'legs') v = Math.max(1, Math.min(4, Math.round(num(v, 1))));
  t[f] = v; if (f === 'wllV') t.wll = v === '' ? '' : num(v, ''); // wll is the older field name: keep both in step
  if (!final) { markDirty(); refresh(); return; }
  // typed boxes are updated in place (sheetLive below): a full redraw between a finger going down and up would swallow the tap on the next button
  commit({ sheet: f === 'legs' || f === 'colKey' || f === 'eye' || f === 'grade' || f === 'shape' || f === 'std' || f === 'inspected' || f === 'sleeve' });
}
document.addEventListener('input', (e) => { const t = e.target; if (t.dataset?.rg != null && t.type !== 'checkbox' && t.tagName !== 'SELECT' && t.type !== 'date') rgSet(t, false); });
document.addEventListener('change', (e) => { const t = e.target; if (t.dataset?.rg != null) rgSet(t, true); });
