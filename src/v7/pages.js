// ===== v7 pages: plans, fleet (cranes, charts, own DXF bodies), settings — pushed in from the right, iOS style =====

function openPage(name) {
  state.page = name; closeSheet(true);
  let el = $('#page');
  if (!el) { el = document.createElement('section'); el.id = 'page'; el.className = 'page'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); document.body.appendChild(el); bindPages(el); }
  el.hidden = false; renderPage(true);
  requestAnimationFrame(() => el.classList.add('on'));
  try { localStorage.setItem('lp.page', name); } catch {}
}
function closePage() {
  const el = $('#page'); state.page = null; try { localStorage.removeItem('lp.page'); } catch {}
  if (!el) return; el.classList.remove('on'); setTimeout(() => { if (!state.page) { el.hidden = true; el.innerHTML = ''; } }, 520); sceneDirty();
}
function renderPage(fresh) { if (state.page === 'plans') renderPlans(); else if (state.page === 'fleet') renderFleet(); else if (state.page === 'settings') renderSettings(); if (fresh) { const b = $('#page .pg-b'); if (b) b.scrollTop = 0; } }
function pageFrame(title, body, o = {}) {
  const el = $('#page'); if (!el) return; const keep = $('.pg-b', el)?.scrollTop || 0;
  el.innerHTML = `<nav class="pg-nav"><button type="button" class="back tap" data-pg="close">${ic('chevL', 24, 2.4)}Back</button><span class="t">${h(title)}</span><span class="sp"></span>${o.actions || ''}</nav><div class="pg-b"><div class="pg-in${o.narrow ? ' narrow' : ''}">${body}</div></div>`;
  $('.pg-b', el).scrollTop = keep;
}

// ---------- plans ----------
function renderPlans() {
  if (state.page !== 'plans') return; const q = (state.planQ || '').toLowerCase();
  const list = state.plans.filter(p => !q || [p.name, p.client, p.crane].join(' ').toLowerCase().includes(q));
  const stw = { fail: 'Stop', warn: 'Careful', ok: 'Safe' };
  const body = `<h1 class="pg-title">Plans<small>Saved on this ${/Mobi|Android/i.test(navigator.userAgent) ? 'phone' : 'computer'}. Send a plan as a file to open it somewhere else.</small></h1>
    <div class="btns" style="margin-bottom:18px"><button type="button" class="btn pri tap" data-pg="new">${ic('plus', 20, 2.4)}New plan</button><button type="button" class="btn tap" data-pg="import">${ic('file', 20)}Open a plan file</button></div>
    ${state.plans.length > 4 ? `<div class="search" style="margin-bottom:14px">${ic('search', 20, 2.2)}<input type="search" id="planQ" placeholder="Search plan, client or crane" value="${h(state.planQ || '')}" aria-label="Search plans"></div>` : ''}
    ${state.plans.length ? `<div class="pcards">${list.map(p => `<article class="pcard"><div style="display:flex;align-items:center;gap:8px"><span class="stp ${h(p.status)}">${stw[p.status] || 'Safe'}${p.util != null ? ' · ' + Math.round(+p.util) + '%' : ''}</span><span class="sp"></span><span style="font-size:13px;color:var(--ink-2)">${h(new Date(p.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }))}</span></div>
      <h4>${h(p.name)}</h4><p>${h(p.client || 'No client')}</p><div class="row3"><span>Crane <b>${h(p.crane || '—')}</b></span><span>Lifts <b>${(p.plan?.loads || []).length || 1}</b></span></div>
      <div class="btns"><button type="button" class="btn sm pri tap" data-pg="open" data-id="${h(p.id)}">Open</button><button type="button" class="btn sm tap" data-pg="copy" data-id="${h(p.id)}">${ic('copy', 16)}Copy</button><button type="button" class="btn sm tap" data-pg="exp" data-id="${h(p.id)}">${ic('dl', 16)}File</button><span class="sp"></span><button type="button" class="btn sm danger tap" data-pg="del" data-id="${h(p.id)}" aria-label="Delete">${ic('trash', 16)}</button></div></article>`).join('') || '<p class="hint">No plan matches that search.</p>'}</div>`
      : `<div class="note">${ic('info', 18, 2.4)}<div>No saved plans yet. Make one and tap <b>Save</b>, or start from an FHE example below.</div></div>`}
    <section class="grp" style="margin-top:28px"><h3>Start from an FHE example</h3><div class="list">${SAMPLE_PLANS.map(s => `<button type="button" class="it tap" data-pg="example" data-key="${s.key}"><span class="lb"><b>${h(s.label.split(' · ')[0])}</b><small>${h(s.label.split(' · ').slice(1).join(' · '))}</small></span>${ic('chev', 18, 2.2).replace('<svg', '<svg class="ch"')}</button>`).join('')}</div></section>`;
  pageFrame('Plans', body);
}
async function plansClick(b) {
  const a = b.dataset.pg; const rec = state.plans.find(p => p.id === b.dataset.id);
  if (a === 'new') { const p = normalizePlan(blankPlan()); if (state.settings.defaultDrawnBy) p.meta.drawnBy = state.settings.defaultDrawnBy; openPlan(p); toast('New plan started'); return; }
  if (a === 'example') { const s = SAMPLE_PLANS.find(x => x.key === b.dataset.key); if (s) { openPlan(normalizePlan(s.make())); toast('Example opened. Save it as your own.'); } return; }
  if (a === 'import') { const f = await pickFile('.json,application/json'); if (!f) return; try { const d = JSON.parse(await readText(f)); const p = normalizePlan(d.plan || d); p.id = null; openPlan(p); toast('Plan opened. Tap Save to keep it.'); } catch (err) { toast('Could not open it: ' + err.message); } return; }
  if (!rec) return;
  if (a === 'open') { const p = normalizePlan(clone(rec.plan)); p.id = rec.id; openPlan(p); state.savedAt = new Date(rec.updatedAt); updateSaveState(); }
  if (a === 'copy') { const p = normalizePlan(clone(rec.plan)); p.id = null; p.name += ' (copy)'; openPlan(p); toast('Copy opened. Save it to keep it.'); }
  if (a === 'exp') { const p = clone(rec.plan); await ensureEnvLoaded(p); (p.env || []).forEach(en => { if (en.assetId && ENV_CACHE[en.id] && !ENV_CACHE[en.id].img) en.data = ENV_CACHE[en.id]; }); exportJSON((rec.name || 'plan').replace(/[^\w\- ]+/g, '') + '.json', { version: 2, plan: p }); }
  if (a === 'del') { if (!confirmTap(b, 'Delete?')) return; await deletePlan(rec.id); renderPlans(); toast('Plan deleted'); }
}

// ---------- fleet ----------
const ACC_ALL = [['flyjib', 'Fly jib'], ['luffing', 'Luffing jib'], ['extension', 'Boom extension'], ['superlift', 'Superlift'], ['yguy', 'Y-guying'], ['runner', 'Runner']];
const fleetCur = () => clone(cranes().find(x => x.id === state.libSel));
let libSaveT;
function fleetCommit(c, rerender) { clearTimeout(libSaveT); state.userCranes[c.id] = c; _chartCache.clear(); libSaveT = setTimeout(() => saveCrane(c), 500); if (rerender) renderFleet(); if (state.plan?.craneId === c.id) refresh(true); }
function renderFleet() {
  if (state.page !== 'fleet') return; const cr = cranes();
  if (!state.libSel || !cr.find(c => c.id === state.libSel)) state.libSel = cr[0]?.id;
  const c = cr.find(x => x.id === state.libSel); const cbx = c ? customBody(c) : null;
  const fld = (k, lab, unit, type = 'number') => `<label class="it"><span class="lb"><b>${h(lab)}</b></span><input class="fld${type === 'number' ? ' num' : ''}" type="text"${type === 'number' ? ' inputmode="decimal"' : ''} data-c="${k}" data-ct="${type}" value="${h(c?.[k] ?? '')}" aria-label="${h(lab)}">${unit ? `<span class="unit">${h(unit)}</span>` : ''}</label>`;
  const body = `<h1 class="pg-title">Cranes and charts<small>Specs, extras, drawings and load charts for every crane. Paste a chart straight from Excel: boom lengths across the top, reach down the side, tonnes inside.</small></h1>
    <div class="split"><div class="stick"><div class="btns" style="margin-bottom:10px"><button type="button" class="btn sm pri tap" data-fl="add">${ic('plus', 18, 2.4)}Add crane</button><button type="button" class="btn sm tap" data-fl="export">${ic('dl', 18)}Save list</button><button type="button" class="btn sm tap" data-fl="import">${ic('file', 18)}Load list</button></div>
      <div class="list">${cr.map(x => `<button type="button" class="it tap${x.id === state.libSel ? ' sel' : ''}" data-fl="sel" data-id="${h(x.id)}"><span style="width:5px;align-self:stretch;border-radius:3px;background:${brandCol(x)}"></span><span class="lb"><b>${h(x.model)}</b><small>${h(x.make)} · ${x.cls} t · ${(x.charts || []).length ? (x.charts || []).length + ' charts' : 'no chart yet'}${state.userCranes[x.id] ? ' · edited' : ''}</small></span></button>`).join('')}</div></div>
    ${c ? `<div>
      <div class="cur-crane" style="--bc:${brandCol(c)};margin-bottom:12px"><div><div class="mk">${h(c.make)} · ${h(c.type || '')}</div><div class="md">${h(c.model)}</div></div><div class="cl num">${c.cls}<small>t</small></div></div>
      <div class="btns" style="margin-bottom:6px"><button type="button" class="btn sm tap" data-fl="dup">${ic('copy', 16)}Copy</button>${DEFAULT_CRANES.some(d => d.id === c.id) && state.userCranes[c.id] ? `<button type="button" class="btn sm tap" data-fl="reset">Back to factory data</button>` : ''}<span class="sp"></span><button type="button" class="btn sm danger tap" data-fl="del">${ic('trash', 16)}Remove</button></div>
      ${grp('Name', fld('model', 'Model', '', 'text') + fld('make', 'Make', '', 'text') + fld('cls', 'Size', 't'))}
      ${grp('Legs and weight', fld('outrigger', 'Outrigger text', '', 'text') + fld('outLong', 'Leg span, long', 'm') + fld('outTrans', 'Leg span, across', 'm') + fld('outTransHalf', 'Leg span across, half out', 'm') + fld('cwt', 'Counterweight', 't') + fld('hookBlock', 'Hook block', 't') + fld('mass', 'Crane weight', 't'), { foot: 'Empty “half out” = halfway between the carrier side and fully out.' })}
      ${grp('Leg loads — maker\'s weights', fld('omCarrier', 'Carrier weight', 't') + fld('omCarrierX', 'Carrier centre ahead of the turning centre', 'm') + fld('omSuper', 'Upper part (no boom, no counterweight)', 't') + fld('omBoom', 'Boom weight', 't') + fld('omCwtR', 'Counterweight centre (behind = minus)', 'm') + fld('outEx', 'Legs centre ahead of the turning centre', 'm') + fld('padMax', 'Most one leg can take', 't'), { foot: 'Leave empty and the leg loads use estimated weights (25 % boom, 15 % upper part, the rest carrier). Enter carrier and boom weight from the maker\'s data to make them real.' })}
      ${grp('Boom', fld('boomMin', 'All in', 'm') + fld('boomMax', 'All out', 'm') + fld('sections', 'Sections (with base)', '') + fld('pivotX', 'Boom pin from centre', 'm') + fld('pivotH', 'Boom pin height', 'm') + fld('boomDepth', 'Boom depth', 'm'), { foot: 'The boom can never go past “All out”. Take it from the crane\'s datasheet.' })}
      ${grp('Carrier', fld('carrierLen', 'Length', 'm') + fld('carrierH', 'Height', 'm') + fld('width', 'Width', 'm') + fld('axles', 'Axles', '') + fld('tail', 'Tail swing', 'm') + fld('color', 'Paint colour', '', 'text'))}
      ${grp('Extras this crane carries', ACC_ALL.map(([k, t]) => Fx.swRaw(`data-cacc2="${k}"`, t, (c.acc || ['flyjib']).includes(k))).join('') + ['fly', 'luff'].map(t => { const r = c.jib?.[t] || jibRange(c, t); return `<div class="it"><span class="lb"><b>${t === 'fly' ? 'Fly jib' : 'Luffing jib'} length</b></span><input class="fld num" style="max-width:70px" inputmode="decimal" data-cjib="${t}.0" value="${h(r[0])}" aria-label="min"><span class="unit">–</span><input class="fld num" style="max-width:70px" inputmode="decimal" data-cjib="${t}.1" value="${h(r[1])}" aria-label="max"><span class="unit">m</span></div>`; }).join(''))}
      ${grp('Drawing', `<label class="it"><span class="lb"><b>Body drawn from</b></span><select class="fld" style="max-width:240px" data-c="drawing" data-ct="text">${[['', c.customBody ? 'Your own DXF (below)' : 'Built from the specs'], ...Object.entries(typeof CRANE_DRAWINGS !== 'undefined' ? CRANE_DRAWINGS : {}).map(([k, d]) => [k, d.label])].map(([v, l]) => `<option value="${h(v)}"${(c.drawing || '') === v ? ' selected' : ''}>${h(l)}</option>`).join('')}</select></label>${Fx.swRaw('data-c="tint" data-ct="bool"', 'Paint it in the crane colour', !!c.tint)}
        <button type="button" class="it accent tap" data-fl="bodyImport">${ic('file', 20)}${c.customBody ? 'Replace' : 'Bring in'} your own DXF side view</button>${c.customBody ? '<button type="button" class="it danger tap" data-fl="bodyDel">Remove your drawing</button>' : ''}`,
        { foot: c.drawProxy && c.drawing && !c.customBody ? `No drawing exists for the ${h(c.model)}, so it borrows the ${h(CRANE_DRAWINGS[c.drawing]?.label || c.drawing)} body. Its numbers still come from its own chart.` : c.customBody ? `Using your drawing${cbx ? ` (${cbx.g.polys.length.toLocaleString()} lines)` : ''}. Boom pin ${fmt(c.pivotX, 2)} m from the centre, ${fmt(c.pivotH, 2)} m high.` : '' })}
      ${grp('Pictures on the sheet', `<div class="it stack">${c.imgChart ? `<img class="thumb" src="${h(c.imgChart)}" alt="Load chart">` : '<span class="hint">No chart picture. The sheet draws the chart table.</span>'}<div class="btns"><button type="button" class="btn sm tap" data-fl="img" data-which="Chart">${c.imgChart ? 'Replace' : 'Add'} chart picture</button>${c.imgChart ? '<button type="button" class="btn sm danger tap" data-fl="imgdel" data-which="Chart">Remove</button>' : ''}</div></div>
        <div class="it stack">${c.imgDims ? `<img class="thumb" src="${h(c.imgDims)}" alt="Crane sizes">` : '<span class="hint">No size picture. The sheet draws a sketch.</span>'}<div class="btns"><button type="button" class="btn sm tap" data-fl="img" data-which="Dims">${c.imgDims ? 'Replace' : 'Add'} size picture</button>${(c.imgDimsId || c.imgDimsData) ? '<button type="button" class="btn sm danger tap" data-fl="imgdel" data-which="Dims">Remove</button>' : ''}</div></div>
        ${c.dimsImg && !(c.imgDimsId || c.imgDimsData) ? Fx.swRaw('data-c="dimsSchematic" data-ct="bool"', 'Use the sketch instead', !!c.dimsSchematic) : ''}`)}
      <section class="grp"><h3>Load charts (${(c.charts || []).length})<span class="sp"></span><button type="button" class="tap" data-fl="addChart">Add chart</button></h3>
        ${(c.charts || []).map((ch, i) => `<details class="list" data-chi="${i}" style="margin-bottom:8px"><summary class="it tap" style="cursor:pointer;list-style:none"><span class="lb"><b>${h(ch.name)}</b><small>${h({ main: 'telescopic boom', fixedjib: 'fly jib', luffing: 'luffing jib' }[ch.kind || 'main'])}${ch.verify ? ' · check this chart' : ''}</small></span>${ic('chevD', 18, 2.2).replace('<svg', '<svg class="ch"')}</summary><div class="chart-body" data-chi="${i}" style="padding:4px 14px 14px"></div></details>`).join('')}</section>
    </div>` : '<p class="hint">No cranes. Add one.</p>'}</div>`;
  pageFrame('Cranes and charts', body);
  $$('#page details[data-chi][open]').forEach(d => fillChart(d));
}
function chartEditor(c, ch, i) {
  const p = parseChart(ch.src);
  const chf = (k, lab, v) => `<label class="f"><span class="fl">${h(lab)}</span><input type="text" data-ch="${i}.${k}" value="${h(v ?? '')}"></label>`;
  return `<div style="display:grid;gap:10px">${ch.source ? `<p class="hint">${h(ch.source)}</p>` : ''}
    <div class="row">${chf('name', 'Name', ch.name)}<label class="f"><span class="fl">Type</span><select data-ch="${i}.kind">${[['main', 'Telescopic boom'], ['luffing', 'Luffing jib (columns = boom angle)'], ['fixedjib', 'Fly jib (columns = offset)']].map(([v, l]) => `<option value="${v}"${(ch.kind || 'main') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
    <div class="row r3">${chf('config', 'Config', ch.config)}${chf('cwt', 'Counterweight t', ch.cwt)}${chf('outrigger', 'Legs', ch.outrigger)}</div>
    <div class="row">${chf('sectors', 'Covers (360, rear, side)', Array.isArray(ch.sectors) ? ch.sectors.join(', ') : (ch.sector || '360'))}<span></span></div>
    ${ch.kind && ch.kind !== 'main' ? `<div class="row r3">${chf('mainLen', 'Main boom (m)', ch.mainLen)}${chf('mainLabel', 'Main boom printed', ch.mainLabel)}${chf('jibLen', 'Jib length (m)', ch.jibLen)}</div>` : ''}
    <label class="f"><span class="fl">Chart · paste from Excel</span><textarea class="code" rows="8" data-ch="${i}.src" spellcheck="false">${h(ch.src)}</textarea></label>
    <p class="hint">${p.cols.length} boom columns · ${p.rows.length} reach rows</p>${p.errors.length ? `<p class="errs">${p.errors.slice(0, 4).map(h).join('<br>')}</p>` : ''}
    <div class="chart-preview">${chartPreview(p, ch)}</div>
    <button type="button" class="btn sm danger tap" data-fl="delChart" data-i="${i}" style="justify-self:start">${ic('trash', 16)}Remove this chart</button></div>`;
}
function chartPreview(p, ch) { if (!p.cols.length) return '<p class="hint" style="padding:8px">Nothing read yet.</p>'; return `<table><thead><tr><th>R</th>${p.cols.map(c => `<th>${h(colName(c))}${ch.kind === 'main' ? '' : '°'}</th>`).join('')}</tr></thead><tbody>${p.rows.map(r => `<tr><th>${r[0]}</th>${r.slice(1).map(v => `<td>${v ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`; }
function fillChart(d) { const body = d.querySelector('.chart-body'); if (!body || body.dataset.filled) return; const c = cranes().find(x => x.id === state.libSel); const i = +d.dataset.chi; if (!c || !c.charts[i]) return; body.innerHTML = chartEditor(c, c.charts[i], i); body.dataset.filled = '1'; }
async function fleetClick(b) {
  const a = b.dataset.fl;
  if (a === 'sel') { state.libSel = b.dataset.id; renderFleet(); if (!isDesk()) { const f = $('#page .cur-crane'); f && f.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
  if (a === 'add') { const id = 'crane-' + uid(); const c = { id, model: 'NEW CRANE', make: '', cls: 100, type: 'All-terrain', axles: 4, carrierLen: 13, carrierH: 3.9, width: 2.75, outrigger: '7.0x7.0', outLong: 7, outTrans: 7, pivotX: -1.5, pivotH: 3, tail: 4.5, boomMin: 12, boomMax: 50, sections: 5, boomDepth: 1.1, mass: 48, cwt: 20, hookBlock: 1, color: '#e8b33a', acc: ['flyjib'], charts: [] }; await saveCrane(c); state.libSel = id; renderFleet(); return; }
  if (a === 'export') { await exportJSON('fhe-crane-library.json', { version: 1, cranes: cranes().map(c => { const o = clone(c); delete o.imgChart; delete o.imgDims; return o; }) }); return; }
  if (a === 'import') { const f = await pickFile('.json,application/json'); if (!f) return; try { const d = JSON.parse(await readText(f)); const list = Array.isArray(d) ? d : d.cranes; if (!Array.isArray(list)) throw new Error('No cranes in the file'); for (const c of list) { if (c && c.id && c.model) await saveCrane(c); } state.hiddenCranes = state.hiddenCranes.filter(id => !list.some(c => c.id === id)); await saveSettings(); loadCustomBodies(); renderFleet(); toast(`${list.length} crane(s) loaded`); } catch (err) { toast('Could not load it: ' + err.message); } return; }
  const c = fleetCur(); if (!c) return;
  if (a === 'dup') { const n = clone(c); n.id = 'crane-' + uid(); n.model += ' (copy)'; delete n.imgChart; delete n.imgDims; await saveCrane(n); state.libSel = n.id; renderFleet(); }
  else if (a === 'reset') { delete state.userCranes[c.id]; if (state.db) { try { await state.db.doc('cranes/' + c.id).delete(); } catch {} } else LS.set('lp.cranes', state.userCranes); _chartCache.clear(); delete CUSTOM_BODY[c.id]; renderFleet(); refresh(true); toast('Factory data restored'); }
  else if (a === 'del') { if (!confirmTap(b, 'Tap again to remove')) return; await deleteCrane(c.id); state.libSel = null; renderFleet(); toast(c.model + ' removed'); }
  else if (a === 'addChart') { c.charts = c.charts || []; c.charts.push({ id: 'ch' + uid(), name: 'Main boom', kind: 'main', config: 'T', cwt: c.cwt, outrigger: c.outrigger, src: 'H: 12 | 18 | 24\n3: 50 - -\n5: 40 30 -\n10: 20 18 15', source: '' }); fleetCommit(c, true); }
  else if (a === 'delChart') { if (!confirmTap(b, 'Tap again to remove')) return; c.charts.splice(+b.dataset.i, 1); fleetCommit(c, true); }
  else if (a === 'img') { const f = await pickFile('image/png,image/jpeg,image/webp'); if (!f) return; const r = await storeImage(f); if (!r) return; const w = b.dataset.which; delete c['img' + w + 'Id']; delete c['img' + w + 'Data']; if (r.id) c['img' + w + 'Id'] = r.id; else c['img' + w + 'Data'] = r.data; delete c.imgChart; delete c.imgDims; fleetCommit(c, true); toast('Picture added. It prints on the sheet.'); }
  else if (a === 'imgdel') { const w = b.dataset.which; delete c['img' + w + 'Id']; delete c['img' + w + 'Data']; delete c.imgChart; delete c.imgDims; fleetCommit(c, true); }
  else if (a === 'bodyImport') bodyImportFlow(c);
  else if (a === 'bodyDel') { delete c.customBody; delete CUSTOM_BODY[c.id]; fleetCommit(c, true); toast('Back to the built-in drawing'); }
}

// ---------- settings ----------
function renderSettings() {
  if (state.page !== 'settings') return; const s = state.settings; const logo = s.logoId ? '/_blob/' + s.logoId : s.logoData;
  const sn = (k, lab, unit, sub) => `<label class="it"><span class="lb"><b>${h(lab)}</b>${sub ? `<small>${h(sub)}</small>` : ''}</span><input class="fld num" type="text" inputmode="decimal" data-s="${k}" data-t="num" value="${h(s[k] ?? '')}" aria-label="${h(lab)}">${unit ? `<span class="unit">${h(unit)}</span>` : ''}</label>`;
  const st = (k, lab, ph) => `<label class="it"><span class="lb"><b>${h(lab)}</b></span><input class="fld" type="text" data-s="${k}" value="${h(s[k] ?? '')}"${ph ? ` placeholder="${h(ph)}"` : ''} aria-label="${h(lab)}"></label>`;
  const sa = (k, lab, val, rows = 4) => `<label class="it stack"><span class="lb"><b>${h(lab)}</b></span><textarea class="fld" data-s="${k}" rows="${rows}" aria-label="${h(lab)}">${h(val)}</textarea></label>`;
  const body = `<h1 class="pg-title">Settings<small>The limits every plan is checked against, and what prints on the sheet.</small></h1>
    ${grp('Safety limits', sn('utilWarn', 'Careful from', '%', 'Amber above this') + sn('utilMax', 'Stop above', '%', 'Red above this') + sn('minClearance', 'Smallest gap to buildings', 'm') + sn('outriggerFactor', 'Leg load estimate', '×') + `<label class="it"><span class="lb"><b>Between chart rows</b></span><select class="fld" style="max-width:220px" data-s="lookup"><option value="conservative"${s.lookup !== 'interpolate' && s.lookup !== 'curve' ? ' selected' : ''}>Use the next bigger reach (safer)</option><option value="curve"${s.lookup === 'curve' ? ' selected' : ''}>Curve fit between chart points</option><option value="interpolate"${s.lookup === 'interpolate' ? ' selected' : ''}>Straight line in between</option></select></label>` + sn('tandemDerate', 'Tandem lifts may use', '%', 'of each crane\'s chart (often 75–80%)'), { foot: 'Many companies use 75% for careful and 90% for stop. The curve fit follows the bend of the load chart and is never more than a straight line between two chart points. Ask your Appointed Person.' })}
    ${grp('Ground pressure in', `<div class="it"><div class="seg" style="width:100%">${Object.entries(P_UNITS).map(([k, u]) => `<button type="button" class="tap" data-set-pu="${k}" aria-checked="${(s.pUnit || 't') === k}">${u[0]}</button>`).join('')}</div></div>`, { foot: '1 t/m² = 9.81 kN/m² = 1.42 psi. Sheets keep t/m².' })}
    ${grp('Satellite map', st('mapboxToken', 'Mapbox token (optional)', 'pk.…') + `<label class="it"><span class="lb"><b>Pictures from</b></span><select class="fld" data-s="mapProv" style="max-width:220px"><option value="esri"${(s.mapProv || 'esri') === 'esri' ? ' selected' : ''}>Esri World Imagery</option><option value="mapbox"${s.mapProv === 'mapbox' ? ' selected' : ''}${s.mapboxToken ? '' : ' disabled'}>Mapbox Satellite</option></select></label>`, { foot: 'Esri needs no key. Paste a Mapbox token to use Mapbox pictures instead.' })}
    ${grp('Look', `<div class="it"><div class="seg" style="width:100%">${[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<button type="button" class="tap" data-set-theme="${v}" aria-checked="${(s.theme || 'auto') === v}">${l}</button>`).join('')}</div></div>`)}
    ${grp('Title block', st('company', 'Company') + st('logoText', 'Logo text (no picture)') + sa('companyLines', 'Address · one per line', (s.companyLines || []).join('\n')) + st('defaultDrawnBy', 'Drawn by (default)', 'HABIB') + `<div class="it stack">${logo ? `<img src="${h(logo)}" alt="Logo" class="thumb" style="height:56px">` : '<span class="hint">No logo picture.</span>'}<div class="btns"><button type="button" class="btn sm tap" data-set="logo">${logo ? 'Replace' : 'Add'} logo</button>${logo ? '<button type="button" class="btn sm danger tap" data-set="logodel">Remove</button>' : ''}</div></div>`)}
    ${grp('Writing on the boom', st('boomText', 'Painted on every boom', s.company || 'FRIENDSHIP HALL EST') + Fx.swRaw('data-s="boomLivery"', 'Show it on drawings and 3D', s.boomLivery !== false))}
    ${grp('Sheet notes', sa('notes', 'General notes · one per line', (s.notes || []).join('\n'), 7) + sa('copyright', 'Copyright line', s.copyright || '', 3) + `<button type="button" class="it accent tap" data-set="resetNotes">Restore the standard notes</button>`)}
    ${grp('Account', `<div class="it"><span class="lb"><b>Signed in as ${h(V7.user || authUser() || '')}</b><small>The sign-in keeps casual visitors out. It is not a security system.</small></span></div><button type="button" class="it danger tap" data-set="signout">Sign out</button>`)}
    <p class="hint" style="text-align:center;margin:24px 0">FHE Lift Planner · version ${APP_VERSION} · designed and built by Saad Khan for Friendship Hall Est.<br>Crane data is library data. The Appointed Person checks every plan before use. Weather by Open-Meteo.</p>`;
  pageFrame('Settings', body, { narrow: true });
}
let setT;
async function settingsClick(b) {
  const a = b.dataset.set;
  if (a === 'logo') { const f = await pickFile('image/png,image/jpeg,image/webp'); if (!f) return; const r = await storeImage(f); if (!r) return; delete state.settings.logoId; delete state.settings.logoData; if (r.id) state.settings.logoId = r.id; else state.settings.logoData = r.data; await saveSettings(); renderSettings(); }
  if (a === 'logodel') { delete state.settings.logoId; delete state.settings.logoData; await saveSettings(); renderSettings(); }
  if (a === 'resetNotes') { state.settings.notes = clone(DEFAULT_SETTINGS.notes); await saveSettings(); renderSettings(); toast('Standard notes back'); }
  if (a === 'signout') { authClear(); if (state.dirty) draft(); location.reload(); }
}

// ---------- page events ----------
function bindPages(el) {
  el.addEventListener('click', (e) => {
    const pg = e.target.closest('[data-pg]'); if (pg) { if (pg.dataset.pg === 'close') closePage(); else plansClick(pg); return; }
    const fl = e.target.closest('[data-fl]'); if (fl) { fleetClick(fl); return; }
    const se = e.target.closest('[data-set]'); if (se) { settingsClick(se); return; }
    const pu = e.target.closest('[data-set-pu]'); if (pu) { state.settings.pUnit = pu.dataset.setPu; saveSettings(); renderSettings(); refresh(true); return; }
    const th = e.target.closest('[data-set-theme]'); if (th) { state.settings.theme = th.dataset.setTheme; saveSettings(); applyTheme(); renderSettings(); return; }
  });
  el.addEventListener('input', (e) => { if (e.target.id === 'planQ') { state.planQ = e.target.value; const pos = e.target.selectionStart; renderPlans(); const q = $('#planQ'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } } });
  el.addEventListener('toggle', (e) => { const d = e.target; if (d.matches && d.matches('details[data-chi]') && d.open) fillChart(d); }, true);
  el.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePage(); if (e.target.classList?.contains('fld') && e.target.tagName === 'INPUT' && e.key === 'Enter') e.target.blur(); });
  el.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.s) { const k = t.dataset.s; let v = t.type === 'checkbox' ? t.checked : t.value; if (k === 'notes' || k === 'companyLines') v = v.split('\n').map(x => x.trim()).filter(Boolean); else if (t.dataset.t === 'num') v = num(v); state.settings[k] = v; clearTimeout(setT); setT = setTimeout(saveSettings, 300); toast('Saved'); refresh(true); return; }
    if (t.dataset.c) { const c = fleetCur(); const k = t.dataset.c; const ty = t.dataset.ct; c[k] = ty === 'bool' ? t.checked : ty === 'number' ? (t.value === '' ? '' : num(t.value)) : t.value; if (k === 'drawing') { c.drawProxy = false; if (t.value) delete c.customBody; } fleetCommit(c, ['model', 'cls', 'make', 'drawing', 'dimsSchematic', 'color'].includes(k)); return; }
    if (t.dataset.cacc2) { const c = fleetCur(); const s = new Set(c.acc || ['flyjib']); if (t.checked) s.add(t.dataset.cacc2); else s.delete(t.dataset.cacc2); c.acc = ACC_ALL.map(([k]) => k).filter(k => s.has(k)); fleetCommit(c, false); return; }
    if (t.dataset.cjib) { const c = fleetCur(); const [ty, ix] = t.dataset.cjib.split('.'); c.jib = c.jib || {}; const r = (c.jib[ty] || jibRange(c, ty)).slice(); r[+ix] = num(t.value, r[+ix]); c.jib[ty] = [Math.min(r[0], r[1]), Math.max(r[0], r[1])]; fleetCommit(c, false); return; }
    if (t.dataset.ch) { const c = fleetCur(); const [i, k] = t.dataset.ch.split('.'); let v = t.value;
      if (['cwt', 'mainLen', 'mainLabel', 'jibLen'].includes(k) && v !== '' && !isNaN(+v)) v = +v;
      if (k === 'sectors') { const s = v.toLowerCase().split(/[\s,;/]+/).filter(x => ['360', 'rear', 'side'].includes(x)); v = s.length && !s.includes('360') ? s : ['360']; }
      c.charts[+i][k] = v; fleetCommit(c, false);
      const body = el.querySelector(`.chart-body[data-chi="${i}"]`); if (body) body.innerHTML = chartEditor(c, c.charts[+i], +i);
      const sm = el.querySelector(`details[data-chi="${i}"] summary b`); if (sm && k === 'name') sm.textContent = t.value; }
  });
}

// ---------- own DXF crane bodies (ported from v6) ----------
async function loadCustomBodies() {
  const jobs = [];
  for (const c of cranes()) { const cb = c.customBody; if (!cb || CUSTOM_BODY[c.id]) continue; if (cb.data) { CUSTOM_BODY[c.id] = cb.data; continue; } if (cb.assetId) jobs.push(fetch('/_blob/' + cb.assetId).then(r => r.ok ? r.json() : null).then(g => { if (g) CUSTOM_BODY[c.id] = g; }).catch(() => {})); }
  if (jobs.length) { await Promise.all(jobs); if (state.started) { refresh(true); if (state.page === 'fleet') renderFleet(); } }
}
async function bodyImportFlow(crane) {
  const f = await pickFile('.dxf,image/vnd.dxf'); if (!f) return;
  if (/\.dwg$/i.test(f.name)) { toast('Save the DWG as DXF in AutoCAD first'); return; }
  const dlg = openDialog(`<span class="eyebrow">Crane drawing · ${h(crane.model)}</span><h2>Reading “${h(f.name)}”…</h2>`, 'dlg big');
  dlg.back.querySelector('.wiz').style.width = 'min(980px, 100%)';
  let parsed; try { parsed = await parseDXF(await readText(f)); } catch (e) { dlg.close(); toast(e.message); return; }
  const layers = Object.entries(parsed.layerCount).sort((a, b) => b[1] - a[1]);
  const S = { keep: new Set(layers.map(([n]) => n).filter(n => !/defpoints|dim|text|title|frame|border|hatch|boom|jib/i.test(n))), unit: parsed.units === 'in' ? 'mm' : parsed.units, flip: false, step: 'origin', origin: null, pivot: null, crop: [], g: null };
  if (!S.keep.size) layers.forEach(([n]) => S.keep.add(n));
  const pack = () => { try { S.g = packGeom(parsed, S.keep); } catch { S.g = null; } S.origin = S.pivot = null; S.crop = []; };
  const toM = (pt) => { if (!S.g || !S.origin) return null; const s = S.g.q * (UNITS[S.unit] || 0.001); return [(S.flip ? -1 : 1) * (pt[0] - S.origin[0]) * s, (pt[1] - S.origin[1]) * s]; };
  const prevSVG = () => {
    const g = S.g; if (!g) return '<div class="twin-msg">Nothing on the ticked layers.</div>';
    const [, , W, H] = g.bbox; const pad = Math.max(W, H) * 0.04; const segs = [];
    for (const [ci, flat] of g.polys) { let d = ''; for (let i = 0; i < flat.length; i += 2) d += (i ? 'L' : 'M') + flat[i] + ' ' + (H - flat[i + 1]); segs.push(`<path d="${d}" stroke="${g.pal[ci]}" fill="none" vector-effect="non-scaling-stroke" stroke-width="1"/>`); }
    const mk = []; const r = Math.max(W, H) * 0.012;
    if (S.crop.length === 2) { const [a, b] = S.crop; mk.push(`<rect x="${Math.min(a[0], b[0])}" y="${H - Math.max(a[1], b[1])}" width="${Math.abs(b[0] - a[0])}" height="${Math.abs(b[1] - a[1])}" fill="rgba(79,224,255,.06)" stroke="#4fe0ff" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>`); }
    if (S.origin) mk.push(`<g stroke="#4fe0ff" stroke-width="2"><line x1="${S.origin[0] - r * 3}" y1="${H - S.origin[1]}" x2="${S.origin[0] + r * 3}" y2="${H - S.origin[1]}" vector-effect="non-scaling-stroke"/><line x1="${S.origin[0]}" y1="${H - S.origin[1] - r * 3}" x2="${S.origin[0]}" y2="${H - S.origin[1] + r * 3}" vector-effect="non-scaling-stroke"/></g>`);
    if (S.pivot) mk.push(`<circle cx="${S.pivot[0]}" cy="${H - S.pivot[1]}" r="${r}" fill="none" stroke="#ffc20e" stroke-width="2.5" vector-effect="non-scaling-stroke"/>`);
    return `<svg viewBox="${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad}" preserveAspectRatio="xMidYMid meet"><g style="filter:invert(1) hue-rotate(180deg)">${segs.join('')}</g>${mk.join('')}</svg>`;
  };
  const piv = () => { const m = S.pivot ? toM(S.pivot) : null; return m ? `Boom pin <b>${m[0].toFixed(2)} m</b> from the centre, <b>${m[1].toFixed(2)} m</b> high` : 'Tap the turning centre, then the boom pin'; };
  const render = () => {
    const steps = [['origin', '1 · Turning centre'], ['pivot', '2 · Boom pin'], ['crop', '3 · Crop (optional)']];
    dlg.body.innerHTML = `<span class="eyebrow">Crane drawing · ${h(crane.model)}</span><h2>${h(f.name)}</h2>
      <div class="steps-mini">${steps.map(([k, t]) => `<span class="${S.step === k ? 'on' : (k === 'origin' && S.origin) || (k === 'pivot' && S.pivot) || (k === 'crop' && S.crop.length === 2) ? 'done' : ''}">${t}</span>`).join('')}</div>
      <p class="hint">${S.step === 'origin' ? 'Tap the ground line right under the middle of the turning ring.' : S.step === 'pivot' ? 'Tap the middle of the boom foot pin, where the boom hinges.' : 'Optional: tap two corners around the crane to cut away title blocks or text.'}</p>
      <div class="dxf-prev" id="dxfPrev">${prevSVG()}</div>
      <div class="row r3"><label class="f"><span class="fl">Units</span><select id="bdUnit">${['mm', 'cm', 'm', 'in', 'ft'].map(u => `<option value="${u}"${u === S.unit ? ' selected' : ''}>${u}</option>`).join('')}</select></label>
        <label class="check"><input type="checkbox" id="bdFlip"${S.flip ? ' checked' : ''}><span>Boom points left (mirror it)</span></label><p class="hint">${piv()}</p></div>
      <details><summary class="hint" style="cursor:pointer">Layers (${S.keep.size} of ${layers.length})</summary><div class="layers" style="margin-top:8px">${layers.map(([n, c]) => `<label class="check"><input type="checkbox" data-bl="${h(n)}"${S.keep.has(n) ? ' checked' : ''}> <span>${h(n)}</span><small>${c}</small></label>`).join('')}</div></details>
      <div class="btns"><button type="button" class="btn" id="bdCancel">Cancel</button><span class="sp"></span>${S.step === 'crop' ? '<button type="button" class="btn" id="bdSkip">Skip crop</button>' : ''}<button type="button" class="btn pri" id="bdSave"${S.origin && S.pivot ? '' : ' disabled'}>Use this drawing</button></div>`;
    const prev = $('#dxfPrev', dlg.body); const svg = prev.querySelector('svg');
    if (svg) svg.addEventListener('click', (e) => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const u = pt.matrixTransform(svg.getScreenCTM().inverse()); const P2 = [u.x, S.g.bbox[3] - u.y];
      if (S.step === 'origin') { S.origin = P2; S.step = 'pivot'; } else if (S.step === 'pivot') { S.pivot = P2; S.step = 'crop'; } else { if (S.crop.length >= 2) S.crop = []; S.crop.push(P2); }
      render();
    });
    $('#bdCancel', dlg.body).onclick = () => dlg.close();
    $('#bdUnit', dlg.body).onchange = (e) => { S.unit = e.target.value; render(); };
    $('#bdFlip', dlg.body).onchange = (e) => { S.flip = e.target.checked; render(); };
    for (const cb of $$('[data-bl]', dlg.body)) cb.onchange = () => { if (cb.checked) S.keep.add(cb.dataset.bl); else S.keep.delete(cb.dataset.bl); pack(); S.step = 'origin'; render(); };
    const sk = $('#bdSkip', dlg.body); if (sk) sk.onclick = () => { S.crop = []; render(); };
    $('#bdSave', dlg.body).onclick = async () => {
      let g = S.g; if (!g) return;
      if (S.crop.length === 2) { const [a, b] = S.crop; const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]); const polys = g.polys.filter(([, fl]) => { for (let i = 0; i < fl.length; i += 2) if (fl[i] < x0 || fl[i] > x1 || fl[i + 1] < y0 || fl[i + 1] > y1) return false; return true; }); if (polys.length) g = { ...g, polys, bbox: [x0, y0, x1, y1] }; }
      const pv = toM(S.pivot);
      const body = { q: g.q, unit: S.unit, flip: S.flip, origin: S.origin.map(v => Math.round(v)), pivot: S.pivot.map(v => Math.round(v)), lines: g.polys.length, file: f.name };
      const data = { polys: g.polys, pal: g.pal, bbox: g.bbox };
      const btn = $('#bdSave', dlg.body); btn.disabled = true; btn.textContent = 'Saving…';
      let stored = false;
      if (state.assets) { try { const r = await state.assets.upload(new Blob([JSON.stringify(data)], { type: 'application/json' })); body.assetId = r.id; stored = true; } catch {} }
      if (!stored) { const sz = JSON.stringify(data).length; if (sz > 1.6e6) { btn.disabled = false; btn.textContent = 'Use this drawing'; toast('That drawing is too heavy to keep here. Crop it or untick layers.'); return; } body.data = data; }
      const c = fleetCur(); c.customBody = body; c.drawing = ''; c.pivotX = r2(pv[0]); c.pivotH = r2(pv[1]); CUSTOM_BODY[c.id] = data;
      fleetCommit(c, true); dlg.close(); toast(`${c.model} now uses your drawing`);
    };
  };
  pack(); render();
}
