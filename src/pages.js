// ===== Pages: plans, fleet (cranes, charts, custom DXF bodies), settings =====
function pageHead(eyebrow, title, sub, actions = '') { return `<header class="pg-h"><div><div class="eyebrow">${h(eyebrow)}</div><h1>${h(title)}</h1>${sub ? `<p>${sub}</p>` : ''}</div><span class="sp"></span><div class="actions">${actions}<button type="button" class="btn ghost" data-pact="close">${ico('x', 14)}Back to the studio</button></div></header>`; }

// ---------- plans ----------
function renderPlans() {
  const el = $('#page'); if (!el) return; const q = (state.planQ || '').toLowerCase();
  const list = state.plans.filter(p => !q || [p.name, p.client, p.crane].join(' ').toLowerCase().includes(q));
  el.innerHTML = `<div class="pg">${pageHead('PLANS', 'Lifting plans', state.db ? 'Saved plans are shared with everyone who can edit this planner.' : 'Saved plans live in this browser. Export a plan file to move it to another device.',
    `<button type="button" class="btn" data-pact="import">Import plan file</button><button type="button" class="btn" data-pact="new">New blank plan</button><button type="button" class="btn primary" data-pact="wizard">${ico('star', 14)}Quick setup</button>`)}
    ${state.plans.length ? `<div class="row" style="grid-template-columns:minmax(0,420px)"><input type="search" id="planQ" placeholder="Search by plan, client or crane…" value="${h(state.planQ || '')}" aria-label="Search plans"></div>
    <div class="pcards">${list.map(p => `<article class="pcard"><span class="pill ${h(p.status)} pc-st">${p.status === 'fail' ? 'Fails' : p.status === 'warn' ? 'Critical' : 'OK'}</span><h3>${h(p.name)}</h3><p>${h(p.client || 'No client')} · saved ${h(new Date(p.updatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}</p>
      <dl><div><dt>Crane</dt><dd>${h(p.crane || '—')}</dd></div><div><dt>Util.</dt><dd>${p.util != null ? (+p.util).toFixed(1) + '%' : '—'}</dd></div><div><dt>Loads</dt><dd>${(p.plan?.loads || []).length || 1}</dd></div></dl>
      <div class="actions"><button type="button" class="btn sm primary" data-pact="open" data-id="${h(p.id)}">Open</button><button type="button" class="btn sm" data-pact="copy" data-id="${h(p.id)}">${ico('copy', 13)}Copy</button><button type="button" class="btn sm" data-pact="exp" data-id="${h(p.id)}">Export</button><span class="sp"></span><button type="button" class="btn sm ghost danger" data-pact="del" data-id="${h(p.id)}" aria-label="Delete">${ico('trash', 13)}</button></div></article>`).join('') || '<div class="empty">No plan matches that search.</div>'}</div>`
    : '<div class="empty">No saved plans yet. Build one in the studio and press <b>Save</b> — or start from an FHE example below.</div>'}
    <h2 class="sec">Start from a recreated FHE sheet</h2>
    <div class="examples">${SAMPLE_PLANS.map(s => `<button type="button" class="ex" data-pact="example" data-key="${s.key}"><b>${h(s.label.split(' · ')[0])}</b><span>${h(s.label.split(' · ').slice(1).join(' · '))}</span></button>`).join('')}</div></div>`;
}
async function plansClick(b) {
  const a = b.dataset.pact; const rec = state.plans.find(p => p.id === b.dataset.id);
  if (a === 'wizard') { wizOpen(); return; }
  if (a === 'new') { openPlan(normalizePlan(blankPlan()), 'job'); toast('New plan started'); return; }
  if (a === 'example') { const s = SAMPLE_PLANS.find(x => x.key === b.dataset.key); if (s) { openPlan(normalizePlan(s.make()), 'crane'); toast('Example loaded — edit it and save as your own'); } return; }
  if (a === 'import') { const f = await pickFile('.json,application/json'); if (!f) return; try { const d = JSON.parse(await readText(f)); const p = normalizePlan(d.plan || d); p.id = null; openPlan(p); toast('Plan imported — press Save to keep it'); } catch (err) { toast('Import failed: ' + err.message); } return; }
  if (!rec) return;
  if (a === 'open') { const p = normalizePlan(clone(rec.plan)); p.id = rec.id; openPlan(p); state.savedAt = new Date(rec.updatedAt); updateSaveState(); }
  if (a === 'copy') { const p = normalizePlan(clone(rec.plan)); p.id = null; p.name += ' (copy)'; openPlan(p); toast('Copy opened — Save to keep it'); }
  if (a === 'exp') { const p = clone(rec.plan); await ensureEnvLoaded(p); (p.env || []).forEach(en => { if (en.assetId && ENV_CACHE[en.id] && !ENV_CACHE[en.id].img) en.data = ENV_CACHE[en.id]; }); exportJSON((rec.name || 'plan').replace(/[^\w\- ]+/g, '') + '.json', { version: 2, plan: p }); }
  if (a === 'del') { if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.innerHTML = 'Tap again'; setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ''; b.innerHTML = ico('trash', 13); } }, 3000); return; } await deletePlan(rec.id); toast('Plan deleted'); }
}

// ---------- fleet ----------
const ACC_ALL = [['flyjib', 'Fly jib'], ['luffing', 'Luffing jib'], ['extension', 'Boom extension'], ['superlift', 'Superlift'], ['yguy', 'Y-guying'], ['runner', 'Runner']];
function renderFleet() {
  const el = $('#page'); if (!el) return; const cr = cranes();
  if (!state.libSel || !cr.find(c => c.id === state.libSel)) state.libSel = cr[0]?.id;
  const c = cr.find(x => x.id === state.libSel);
  const spec = (k, lab, unit, type = 'number') => `<label class="f" for="c-${k}"><span class="fl">${h(lab)}</span><span class="fi"><input type="${type}" ${type === 'number' ? 'step="any" inputmode="decimal"' : ''} id="c-${k}" data-c="${k}" value="${h(c?.[k] ?? '')}">${unit ? `<i>${h(unit)}</i>` : ''}</span></label>`;
  const cbx = c ? customBody(c) : null;
  el.innerHTML = `<div class="pg">${pageHead('FLEET', 'Cranes & load charts', `Specs, accessories, drawings and load charts for every machine. Paste a chart straight from Excel: first row boom lengths, first column radius, capacities in tonnes. ${state.db ? 'Changes are shared with everyone who can edit this planner.' : 'Changes are saved in this browser.'}`,
    `<button class="btn" data-lact="add">${ico('plus', 14)}Add crane</button><button class="btn" data-lact="export">Export library</button><button class="btn" data-lact="import">Import</button>`)}
  <div class="two-col"><div class="flist" role="list">${cr.map(x => `<button class="fli" role="listitem" data-lact="sel" data-id="${h(x.id)}" aria-current="${x.id === state.libSel}" style="--bc:${brandCol(x)}"><b>${h(x.model)}</b><span>${h(x.make)} · ${x.cls} t · ${(x.charts || []).length ? (x.charts || []).length + ' charts' : 'no chart yet'}${state.userCranes[x.id] ? ' · edited' : ''}${x.customBody ? ' · own drawing' : ''}</span></button>`).join('')}</div>
  ${c ? `<div class="card"><div class="card-b">
    <div class="actions"><div><div class="eyebrow">${h(c.make)} · ${h(c.type || '')}</div><h2>${h(c.model)}</h2></div><span class="sp"></span><button class="btn sm" data-lact="dup">${ico('copy', 13)}Duplicate</button>${DEFAULT_CRANES.some(d => d.id === c.id) && state.userCranes[c.id] ? '<button class="btn sm" data-lact="reset">Reset to default</button>' : ''}<button class="btn sm danger" data-lact="del">${ico('trash', 13)}Remove</button></div>
    <h3>Identity</h3><div class="row r3">${spec('model', 'Model', '', 'text')}${spec('make', 'Make', '', 'text')}${spec('cls', 'Class', 't')}</div>
    <h3>Outriggers & mass</h3><div class="row r3">${spec('outrigger', 'Outrigger text', '', 'text')}${spec('outLong', 'Span, long', 'm')}${spec('outTrans', 'Span, across', 'm')}</div>
    <div class="row r3">${spec('cwt', 'Default CWT', 't')}${spec('hookBlock', 'Hook block', 't')}${spec('mass', 'Crane mass', 't')}</div>
    <h3>Boom</h3><div class="row r3">${spec('boomMin', 'Retracted', 'm')}${spec('boomMax', 'Fully extended', 'm')}${spec('sections', 'Sections (incl. base)', '')}</div>
    <div class="row r3">${spec('pivotX', 'Pivot from slew centre', 'm')}${spec('pivotH', 'Pivot height', 'm')}${spec('boomDepth', 'Boom depth', 'm')}</div>
    <p class="hint" style="margin-top:-4px">The telescope sliders can never go past “fully extended” — set it from the crane's datasheet.</p>
    <h3>Carrier</h3><div class="row r3">${spec('carrierLen', 'Length', 'm')}${spec('carrierH', 'Height', 'm')}${spec('width', 'Width', 'm')}</div>
    <div class="row r3">${spec('axles', 'Axles', '')}${spec('tail', 'Tail swing', 'm')}${spec('color', 'Paint colour', '', 'text')}</div>
    <h3>Accessories this crane carries</h3>
    <div class="row r3">${ACC_ALL.map(([k, t]) => `<label class="check"><input type="checkbox" class="tog" data-cacc2="${k}"${(c.acc || ['flyjib']).includes(k) ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div>
    <div class="row r4">${['fly', 'luff'].map(t => { const r = c.jib?.[t] || jibRange(c, t); return `<label class="f"><span class="fl">${t === 'fly' ? 'Fly jib' : 'Luffing jib'} min</span><span class="fi"><input type="number" step="any" data-cjib="${t}.0" value="${h(r[0])}"><i>m</i></span></label><label class="f"><span class="fl">${t === 'fly' ? 'Fly jib' : 'Luffing jib'} max</span><span class="fi"><input type="number" step="any" data-cjib="${t}.1" value="${h(r[1])}"><i>m</i></span></label>`; }).join('')}</div>
    <h3>Elevation drawing</h3>
    <div class="row"><label class="f"><span class="fl">Body drawn from</span><select id="c-drawing" data-c="drawing">${[['', c.customBody ? 'Your own DXF drawing (below)' : 'Brand body built from the specs'], ...Object.entries(typeof CRANE_DRAWINGS !== 'undefined' ? CRANE_DRAWINGS : {}).map(([k, d]) => [k, d.label + ' — Habib\'s DWG block'])].map(([v, l]) => `<option value="${h(v)}"${(c.drawing || '') === v ? ' selected' : ''}>${h(l)}</option>`).join('')}</select></label>
      <label class="check" style="align-self:end"><input type="checkbox" class="tog" id="c-tint" data-c="tint" data-bool="1"${c.tint ? ' checked' : ''}><span>Paint the block in the crane colour</span></label></div>
    ${c.drawProxy && c.drawing && !c.customBody ? `<p class="hint">There's no DWG for the ${h(c.model)} in Habib's set, so it's drawn with the closest body (${h(CRANE_DRAWINGS[c.drawing]?.label || c.drawing)}). The numbers come from its own load chart. Pick another body above, or import its real side view as a DXF.</p>` : ''}
    <div class="sub"><div class="actions"><b style="font-size:12.5px">Own AutoCAD side view</b><span class="sp"></span>${c.customBody ? '<button class="btn sm ghost danger" data-lact="bodyDel">Remove</button>' : ''}<button class="btn sm" data-lact="bodyImport">${ico('file', 14)}${c.customBody ? 'Replace' : 'Import'} DXF body</button></div>
      <p class="hint">${c.customBody ? `Using your drawing${cbx ? ` — ${cbx.g.polys.length.toLocaleString()} lines` : ' (loading…)'}, boom pivot ${fmt(c.pivotX, 2)} m from the slew centre at ${fmt(c.pivotH, 2)} m. The boom, jib and accessories are still drawn live on top.` : 'Every make looks different. Export the crane side view from AutoCAD as DXF (without the boom, or with the boom on its own layer), import it here, click the slewing centre and the boom foot pin — the planner draws the real machine and telescopes the boom from your pin.'}</p></div>
    <h3>Sheet images</h3>
    <div class="row">
      <div style="display:grid;gap:6px">${c.imgChart ? `<img class="thumb" src="${h(c.imgChart)}" alt="Load chart image">` : '<span class="hint">No load-chart image — the sheet draws the chart table from the data.</span>'}<div class="actions"><button class="btn sm" data-lact="img" data-which="Chart">${c.imgChart ? 'Replace' : 'Upload'} chart image</button>${c.imgChart ? '<button class="btn sm ghost danger" data-lact="imgdel" data-which="Chart">Remove</button>' : ''}</div></div>
      <div style="display:grid;gap:6px">${c.imgDims ? `<img class="thumb" src="${h(c.imgDims)}" alt="Crane dimension sheet">` : '<span class="hint">No dimension image — the sheet draws a schematic.</span>'}<div class="actions"><button class="btn sm" data-lact="img" data-which="Dims">${c.imgDims ? 'Replace' : 'Upload'} dimension image</button>${(c.imgDimsId || c.imgDimsData) ? '<button class="btn sm ghost danger" data-lact="imgdel" data-which="Dims">Remove</button>' : ''}${c.dimsImg && !(c.imgDimsId || c.imgDimsData) ? `<label class="check"><input type="checkbox" data-c="dimsSchematic" data-bool="1"${c.dimsSchematic ? ' checked' : ''}> Use the schematic instead</label>` : ''}</div></div>
    </div>
    <h3>Load charts (${(c.charts || []).length})</h3>
    <div style="display:grid;gap:4px">${(c.charts || []).map((ch, i) => `<details class="card" data-chi="${i}"><summary>${h(ch.name)} <span class="sum-meta">${h({ main: 'telescopic', fixedjib: 'jib', luffing: 'luffing jib' }[ch.kind || 'main'])}${ch.verify ? ' · unverified' : ''}</span></summary><div class="card-b chart-body" data-chi="${i}"></div></details>`).join('')}</div>
    <button class="btn" data-lact="addChart">${ico('plus', 14)}Add load chart</button>
  </div></div>` : '<div class="empty">No cranes. Add one.</div>'}</div></div>`;
}
function chartEditor(c, ch, i) {
  const p = parseChart(ch.src);
  const chf = (k, lab, v) => `<label class="f"><span class="fl">${h(lab)}</span><input type="text" data-ch="${i}.${k}" id="ch-${i}-${k}" value="${h(v ?? '')}"></label>`;
  return `<div class="actions"><span class="hint">${h(ch.source || '')}</span><span class="sp"></span><button class="btn sm ghost danger" data-lact="delChart" data-i="${i}">Remove chart</button></div>
      <div class="row">${chf('name', 'Name', ch.name)}<label class="f"><span class="fl">Type</span><select data-ch="${i}.kind" id="ch-${i}-kind">${[['main', 'Telescopic main boom'], ['luffing', 'Luffing jib (columns = boom angle)'], ['fixedjib', 'Fixed fly jib (columns = offset)']].map(([v, l]) => `<option value="${v}"${(ch.kind || 'main') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <div class="row r3">${chf('config', 'Config', ch.config)}${chf('cwt', 'CWT (t)', ch.cwt)}${chf('outrigger', 'Outriggers', ch.outrigger)}</div>
      ${ch.kind && ch.kind !== 'main' ? `<div class="row r3">${chf('mainLen', 'Main boom for geometry (m)', ch.mainLen)}${chf('mainLabel', 'Main boom printed (m)', ch.mainLabel)}${chf('jibLen', 'Jib length (m)', ch.jibLen)}</div>` : ''}
      <label class="f"><span class="fl">Chart data <em>paste from Excel, or “H: 15.5 | 20.7/II/8” header + “radius: values” rows</em></span><textarea rows="8" data-ch="${i}.src" id="ch-${i}-src" spellcheck="false">${h(ch.src)}</textarea></label>
      <div class="hint">${p.cols.length} columns · ${p.rows.length} radius rows</div>${p.errors.length ? `<div class="errs">${p.errors.slice(0, 4).map(h).join('<br>')}</div>` : ''}
      <div class="chart-preview">${chartPreview(p, ch)}</div>`;
}
function chartPreview(p, ch) { if (!p.cols.length) return '<p class="hint" style="padding:8px">Nothing parsed yet.</p>'; return `<table><thead><tr><th>R</th>${p.cols.map(c => `<th>${h(colName(c))}${ch.kind === 'main' ? '' : '°'}</th>`).join('')}</tr></thead><tbody>${p.rows.map(r => `<tr><th>${r[0]}</th>${r.slice(1).map(v => `<td>${v ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table>`; }
let libSaveT;
const fleetCur = () => clone(cranes().find(x => x.id === state.libSel));
function fleetCommit(c, rerender) { clearTimeout(libSaveT); state.userCranes[c.id] = c; _chartCache.clear(); libSaveT = setTimeout(() => saveCrane(c), 500); if (rerender) renderFleet(); if (state.plan?.craneId === c.id) refresh(true); }
async function fleetClick(b) {
  const a = b.dataset.lact; const el = $('#page');
  if (a === 'sel') { state.libSel = b.dataset.id; renderFleet(); el.scrollTop = 0; return; }
  if (a === 'add') { const id = 'crane-' + uid(); const c = { id, model: 'NEW CRANE', make: '', cls: 100, type: 'All-terrain', axles: 4, carrierLen: 13, carrierH: 3.9, width: 2.75, outrigger: '7.0x7.0', outLong: 7, outTrans: 7, pivotX: -1.5, pivotH: 3, tail: 4.5, boomMin: 12, boomMax: 50, sections: 5, boomDepth: 1.1, mass: 48, cwt: 20, hookBlock: 1, color: '#e8b33a', acc: ['flyjib'], charts: [] }; await saveCrane(c); state.libSel = id; renderFleet(); return; }
  if (a === 'export') { await exportJSON('fhe-crane-library.json', { version: 1, cranes: cranes().map(c => { const o = clone(c); delete o.imgChart; delete o.imgDims; return o; }) }); return; }
  if (a === 'import') { const f = await pickFile('.json,application/json'); if (!f) return; try { const d = JSON.parse(await readText(f)); const list = Array.isArray(d) ? d : d.cranes; if (!Array.isArray(list)) throw new Error('No cranes in file'); for (const c of list) { if (c && c.id && c.model) await saveCrane(c); } state.hiddenCranes = state.hiddenCranes.filter(id => !list.some(c => c.id === id)); await saveSettings(); loadCustomBodies(); renderFleet(); toast(`Imported ${list.length} crane(s)`); } catch (err) { toast('Import failed: ' + err.message); } return; }
  const c = fleetCur(); if (!c) return;
  if (a === 'dup') { const n = clone(c); n.id = 'crane-' + uid(); n.model += ' (copy)'; delete n.imgChart; delete n.imgDims; await saveCrane(n); state.libSel = n.id; renderFleet(); }
  else if (a === 'reset') { delete state.userCranes[c.id]; if (state.db) { try { await state.db.doc('cranes/' + c.id).delete(); } catch {} } else LS.set('lp.cranes', state.userCranes); _chartCache.clear(); delete CUSTOM_BODY[c.id]; renderFleet(); toast('Restored the default data'); }
  else if (a === 'del') { if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Tap again to remove'; setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ''; b.innerHTML = ico('trash', 13) + 'Remove'; } }, 3000); return; } await deleteCrane(c.id); state.libSel = null; renderFleet(); toast(c.model + ' removed from the fleet'); }
  else if (a === 'addChart') { c.charts = c.charts || []; c.charts.push({ id: 'ch' + uid(), name: 'Main boom', kind: 'main', config: 'T', cwt: c.cwt, outrigger: c.outrigger, src: 'H: 12 | 18 | 24\n3: 50 - -\n5: 40 30 -\n10: 20 18 15', source: '' }); fleetCommit(c, true); }
  else if (a === 'delChart') { c.charts.splice(+b.dataset.i, 1); fleetCommit(c, true); }
  else if (a === 'img') { const f = await pickFile('image/png,image/jpeg,image/webp'); if (!f) return; const r = await storeImage(f); if (!r) return; const w = b.dataset.which; delete c['img' + w + 'Id']; delete c['img' + w + 'Data']; if (r.id) c['img' + w + 'Id'] = r.id; else c['img' + w + 'Data'] = r.data; delete c.imgChart; delete c.imgDims; fleetCommit(c, true); toast('Image added — it prints on the sheet'); }
  else if (a === 'imgdel') { const w = b.dataset.which; delete c['img' + w + 'Id']; delete c['img' + w + 'Data']; delete c.imgChart; delete c.imgDims; fleetCommit(c, true); }
  else if (a === 'bodyImport') bodyImportFlow(c);
  else if (a === 'bodyDel') { delete c.customBody; delete CUSTOM_BODY[c.id]; fleetCommit(c, true); toast('Back to the built-in body'); }
}
function bindPages() {
  const el = $('#page');
  el.addEventListener('click', (e) => {
    const pc = e.target.closest('[data-pact]'); if (pc) { if (pc.dataset.pact === 'close') { closePage(); return; } plansClick(pc); return; }
    const lc = e.target.closest('[data-lact]'); if (lc) { fleetClick(lc); return; }
    const sc = e.target.closest('[data-setact]'); if (sc) { settingsClick(sc); return; }
  });
  el.addEventListener('input', (e) => { if (e.target.id === 'planQ') { state.planQ = e.target.value; const pos = e.target.selectionStart; renderPlans(); const q = $('#planQ'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } } });
  el.addEventListener('toggle', (e) => {
    const d = e.target; if (!d.matches || !d.matches('details[data-chi]') || !d.open) return;
    const body = d.querySelector('.chart-body'); if (!body || body.dataset.filled) return;
    const c = cranes().find(x => x.id === state.libSel); const i = +d.dataset.chi; if (!c || !c.charts[i]) return;
    body.innerHTML = chartEditor(c, c.charts[i], i); body.dataset.filled = '1';
  }, true);
  el.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.s) { settingsChange(t); return; }
    if (t.dataset.c) { const c = fleetCur(); const k = t.dataset.c; c[k] = t.dataset.bool ? t.checked : t.type === 'number' ? (t.value === '' ? '' : +t.value) : t.value; if (k === 'drawing') { c.drawProxy = false; if (t.value) delete c.customBody; } fleetCommit(c, ['model', 'cls', 'make', 'drawing', 'dimsSchematic'].includes(k)); return; }
    if (t.dataset.cacc2) { const c = fleetCur(); const s = new Set(c.acc || ['flyjib']); if (t.checked) s.add(t.dataset.cacc2); else s.delete(t.dataset.cacc2); c.acc = ACC_ALL.map(([k]) => k).filter(k => s.has(k)); fleetCommit(c, false); return; }
    if (t.dataset.cjib) { const c = fleetCur(); const [ty, ix] = t.dataset.cjib.split('.'); c.jib = c.jib || {}; const r = (c.jib[ty] || jibRange(c, ty)).slice(); r[+ix] = num(t.value, r[+ix]); c.jib[ty] = [Math.min(r[0], r[1]), Math.max(r[0], r[1])]; fleetCommit(c, false); return; }
    if (t.dataset.ch) { const c = fleetCur(); const [i, k] = t.dataset.ch.split('.'); c.charts[+i][k] = ['cwt', 'mainLen', 'mainLabel', 'jibLen'].includes(k) && t.value !== '' && !isNaN(+t.value) ? +t.value : t.value; fleetCommit(c, false);
      const body = el.querySelector(`.chart-body[data-chi="${i}"]`); if (body) body.innerHTML = chartEditor(c, c.charts[+i], +i); const sm = el.querySelector(`details[data-chi="${i}"] > summary`); if (sm && k === 'name') sm.firstChild.textContent = t.value + ' '; }
  });
}

// ---------- custom DXF crane bodies ----------
async function loadCustomBodies() {
  const jobs = [];
  for (const c of cranes()) { const cb = c.customBody; if (!cb || CUSTOM_BODY[c.id]) continue; if (cb.data) { CUSTOM_BODY[c.id] = cb.data; continue; } if (cb.assetId) jobs.push(fetch('/_blob/' + cb.assetId).then(r => r.ok ? r.json() : null).then(g => { if (g) CUSTOM_BODY[c.id] = g; }).catch(() => {})); }
  if (jobs.length) { await Promise.all(jobs); if (state.started) { refresh(true); if (state.page === 'fleet') renderFleet(); } }
}
async function bodyImportFlow(crane) {
  const f = await pickFile('.dxf,image/vnd.dxf'); if (!f) return;
  if (/\.dwg$/i.test(f.name)) { toast('Save the DWG as DXF in AutoCAD first (SAVEAS → DXF)'); return; }
  const dlg = openDialog(`<span class="eyebrow">Crane body · ${h(crane.model)}</span><h2>Reading “${h(f.name)}”…</h2>`, 'dlg big');
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
    if (S.origin) mk.push(`<g stroke="#4fe0ff" vector-effect="non-scaling-stroke" stroke-width="2"><line x1="${S.origin[0] - r * 3}" y1="${H - S.origin[1]}" x2="${S.origin[0] + r * 3}" y2="${H - S.origin[1]}" vector-effect="non-scaling-stroke"/><line x1="${S.origin[0]}" y1="${H - S.origin[1] - r * 3}" x2="${S.origin[0]}" y2="${H - S.origin[1] + r * 3}" vector-effect="non-scaling-stroke"/></g>`);
    if (S.pivot) mk.push(`<circle cx="${S.pivot[0]}" cy="${H - S.pivot[1]}" r="${r}" fill="none" stroke="#ffb81c" stroke-width="2.5" vector-effect="non-scaling-stroke"/>`);
    return `<svg viewBox="${-pad} ${-pad} ${W + 2 * pad} ${H + 2 * pad}" preserveAspectRatio="xMidYMid meet"><g style="filter:invert(1) hue-rotate(180deg)">${segs.join('')}</g>${mk.join('')}</svg>`;
  };
  const piv = () => { const m = S.pivot ? toM(S.pivot) : null; return m ? `Pivot <b>${m[0].toFixed(2)} m</b> from the slew centre, <b>${m[1].toFixed(2)} m</b> high` : 'Pick the slew centre and the boom pin'; };
  const render = () => {
    const steps = [['origin', '1 · Slewing centre on the ground'], ['pivot', '2 · Boom foot pin'], ['crop', '3 · Crop (optional)']];
    dlg.body.innerHTML = `<span class="eyebrow">Crane body · ${h(crane.model)}</span><h2>${h(f.name)}</h2>
      <div class="steps-mini">${steps.map(([k, t]) => `<span class="${S.step === k ? 'on' : (k === 'origin' && S.origin) || (k === 'pivot' && S.pivot) || (k === 'crop' && S.crop.length === 2) ? 'done' : ''}">${t}</span>`).join('')}</div>
      <p class="hint">${S.step === 'origin' ? 'Click the point on the ground line directly under the slewing ring centre.' : S.step === 'pivot' ? 'Click the centre of the boom foot pin (where the boom hinges).' : 'Optional: click two corners around the machine to drop the title block, dimensions or a stowed boom. Skip if not needed.'}</p>
      <div class="dxf-prev" id="dxfPrev">${prevSVG()}</div>
      <div class="row r3"><label class="f"><span class="fl">Drawing units</span><select id="bdUnit">${['mm', 'cm', 'm', 'in', 'ft'].map(u => `<option value="${u}"${u === S.unit ? ' selected' : ''}>${u}</option>`).join('')}</select></label>
        <label class="check" style="align-self:end"><input type="checkbox" class="tog" id="bdFlip"${S.flip ? ' checked' : ''}><span>Boom points left in the drawing (mirror it)</span></label><p class="hint" style="align-self:end">${piv()}</p></div>
      <details><summary class="hint" style="cursor:pointer">Layers (${S.keep.size} of ${layers.length} shown)</summary><div class="layers" style="margin-top:8px">${layers.map(([n, c], i) => `<label class="check"><input type="checkbox" data-bl="${h(n)}"${S.keep.has(n) ? ' checked' : ''}> <span>${h(n)}</span><small>${c}</small></label>`).join('')}</div></details>
      <div class="actions"><button type="button" class="btn ghost" id="bdCancel">Cancel</button><span class="sp"></span>${S.step === 'crop' ? '<button type="button" class="btn" id="bdSkip">Skip crop</button>' : ''}<button type="button" class="btn primary" id="bdSave"${S.origin && S.pivot ? '' : ' disabled'}>Use this drawing</button></div>`;
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
      const s = g.q * (UNITS[S.unit] || 0.001); const pv = toM(S.pivot);
      const body = { q: g.q, unit: S.unit, flip: S.flip, origin: S.origin.map(v => Math.round(v)), pivot: S.pivot.map(v => Math.round(v)), lines: g.polys.length, file: f.name };
      const data = { polys: g.polys, pal: g.pal, bbox: g.bbox };
      const btn = $('#bdSave', dlg.body); btn.disabled = true; btn.textContent = 'Saving…';
      let stored = false;
      if (state.assets) { try { const r = await state.assets.upload(new Blob([JSON.stringify(data)], { type: 'application/json' })); body.assetId = r.id; stored = true; } catch {} }
      if (!stored) { const sz = JSON.stringify(data).length; if (sz > 1.6e6) { btn.disabled = false; btn.textContent = 'Use this drawing'; toast('That drawing is too heavy to keep here — crop it or untick layers'); return; } body.data = data; }
      const c = fleetCur(); c.customBody = body; c.drawing = ''; c.pivotX = r2(pv[0]); c.pivotH = r2(pv[1]); CUSTOM_BODY[c.id] = data;
      fleetCommit(c, true); dlg.close(); toast(`${c.model} now uses your drawing (${s > 0 ? 'scale ok' : ''})`.replace(' ()', ''));
    };
  };
  pack(); render();
}

// ---------- settings ----------
function renderSettings() {
  const el = $('#page'); if (!el) return; const s = state.settings;
  const t = (k, lab, ph) => `<label class="f" for="s-${k}"><span class="fl">${h(lab)}</span><input type="text" data-s="${k}" id="s-${k}" value="${h(s[k] ?? '')}"${ph ? ` placeholder="${h(ph)}"` : ''}></label>`;
  const n = (k, lab, unit) => `<label class="f" for="s-${k}"><span class="fl">${h(lab)}</span><span class="fi"><input type="number" step="any" data-s="${k}" id="s-${k}" value="${h(s[k] ?? '')}">${unit ? `<i>${h(unit)}</i>` : ''}</span></label>`;
  const logo = s.logoId ? '/_blob/' + s.logoId : s.logoData;
  el.innerHTML = `<div class="pg">${pageHead('SETTINGS', 'Settings', 'Title block, notes and the limits every plan is checked against.')}
  <div class="two-col" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)"><div style="display:grid;gap:16px;align-content:start">
    <div class="card"><div class="card-b"><h3>Limits</h3>
      <div class="row">${n('utilWarn', 'Critical-lift threshold', '%')}${n('utilMax', 'Maximum allowed', '%')}</div>
      <div class="row">${n('minClearance', 'Min boom clearance', 'm')}${n('outriggerFactor', 'Outrigger estimate factor', '×')}</div>
      <label class="f"><span class="fl">Between chart radii</span><select data-s="lookup" id="s-lookup"><option value="conservative"${s.lookup !== 'interpolate' ? ' selected' : ''}>Use the next larger radius (conservative)</option><option value="interpolate"${s.lookup === 'interpolate' ? ' selected' : ''}>Interpolate linearly</option></select></label>
      <label class="f"><span class="fl">Data table header</span><select data-s="headerStyle" id="s-headerStyle"><option value="yellow"${s.headerStyle !== 'classic' ? ' selected' : ''}>M.CRANE DATA1 + LOAD DATA (newer sheets)</option><option value="classic"${s.headerStyle === 'classic' ? ' selected' : ''}>Single CRANE DATA table when one load</option></select></label></div></div>
    <div class="card"><div class="card-b"><h3>Studio</h3>
      <div class="row"><label class="f"><span class="fl">Canvas</span><select data-s="canvas" id="s-canvas"><option value="night"${s.canvas !== 'paper' ? ' selected' : ''}>Night — dark model space</option><option value="paper"${s.canvas === 'paper' ? ' selected' : ''}>Paper — white drawing</option></select></label>${t('defaultDrawnBy', 'Default “drawn by”', 'HABIB')}</div>
      <p class="hint">The A1 sheet, PDF and DXF are always on white paper — the canvas setting only changes the studio.</p></div></div>
    <div class="about">${FHE_MARK}<div><b>FHE Lift Planner <em>v5</em></b><span>Designed &amp; built by <em>Saad Khan</em> for Friendship Hall Est.</span><span>Load charts and crane data are library values — the Appointed Person verifies every plan before issue. Weather by Open-Meteo.</span></div></div>
    <div class="card"><div class="card-b"><h3>Account</h3><p class="hint">Signed in as <b>Habib</b> (Appointed Person). The sign-in screen keeps casual visitors out of the planner; it is not a security system — don't put confidential data in a link you share widely.</p><div class="actions"><button class="btn" data-setact="signout">Sign out</button></div></div></div>
  </div>
  <div class="card"><div class="card-b"><h3>Title block</h3>
    <div class="row">${t('company', 'Company name')}${t('logoText', 'Logo text (when no image)')}</div>
    <label class="f"><span class="fl">Address lines <em>one per line</em></span><textarea rows="4" data-s="companyLines" id="s-companyLines">${h((s.companyLines || []).join('\n'))}</textarea></label>
    <div class="actions">${logo ? `<img src="${h(logo)}" alt="Logo" style="height:48px;background:#fff;border:1px solid var(--l2)">` : ''}<button class="btn sm" data-setact="logo">${logo ? 'Replace' : 'Upload'} logo image</button>${logo ? '<button class="btn sm ghost danger" data-setact="logodel">Remove</button>' : ''}</div>
    <h3>Boom lettering</h3>
    <div class="row"><label class="f" for="s-boomText"><span class="fl">Painted on every boom</span><input type="text" data-s="boomText" id="s-boomText" value="${h(s.boomText ?? '')}" placeholder="${h(s.company || 'FRIENDSHIP HALL EST')}"></label><label class="check" style="align-self:end"><input type="checkbox" class="tog" data-s="boomLivery" id="s-boomLivery"${s.boomLivery === false ? '' : ' checked'}><span>Show it on the drawings and in 3D</span></label></div>
    <label class="f"><span class="fl">General notes <em>one per line, numbered on the sheet</em></span><textarea rows="7" data-s="notes" id="s-notes">${h((s.notes || []).join('\n'))}</textarea></label>
    <label class="f"><span class="fl">Copyright strip</span><textarea rows="3" data-s="copyright" id="s-copyright">${h(s.copyright || '')}</textarea></label>
    <div class="actions"><button class="btn sm" data-setact="resetNotes">Restore default notes</button></div></div></div></div></div>`;
}
let setT;
function settingsChange(t) {
  const k = t.dataset.s; let v = t.value;
  if (t.type === 'checkbox') v = t.checked;
  else if (k === 'notes' || k === 'companyLines') v = v.split('\n').map(x => x.trim()).filter(Boolean);
  else if (t.type === 'number') v = +v;
  state.settings[k] = v; clearTimeout(setT); setT = setTimeout(saveSettings, 300); toast('Settings saved');
  if (k === 'canvas') { Scene.dark = v !== 'paper'; setView(state.view); }
  refresh(true);
}
async function settingsClick(b) {
  const a = b.dataset.setact;
  if (a === 'logo') { const f = await pickFile('image/png,image/jpeg,image/webp'); if (!f) return; const r = await storeImage(f); if (!r) return; delete state.settings.logoId; delete state.settings.logoData; if (r.id) state.settings.logoId = r.id; else state.settings.logoData = r.data; await saveSettings(); renderSettings(); }
  if (a === 'logodel') { delete state.settings.logoId; delete state.settings.logoData; await saveSettings(); renderSettings(); }
  if (a === 'resetNotes') { state.settings.notes = clone(DEFAULT_SETTINGS.notes); await saveSettings(); renderSettings(); }
  if (a === 'signout') topAction('signout');
}
