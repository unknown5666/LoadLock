// ===== Studio: rail + drawer sections, operator console, inspector, HUD, views =====
const ICO = {
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z', hook: 'M12 2v6M10 8h4v3M12 11v2a4 4 0 1 1-4 4', chevD: 'M6 9l6 6 6-6',
  job: 'M8 3h8v3H8zM6 5H4v16h16V5h-2M8 11h8M8 15h5',
  crane: 'M3 20h18M6 20v-8l12-7v3L8.6 13.4V20M15.5 7v6.5M14 13.5h3v2.6h-3z',
  lift: 'M12 2v7M12 9a3 3 0 1 1-3 3M6 17h12l2 4H4z',
  site: 'M3 21h18M5 21V11h5v10M12 21V4h7v17M7 14h1M7 17h1M15 8h1M15 11h1M15 14h1M15 17h1',
  weather: 'M3 9h10a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7',
  sheet: 'M3 4h18v16H3zM15 4v16M15 14h6M15 9h6M6 16l3-5 2 3 2-2',
  plans: 'M3 6h7l2 2h9v12H3z',
  fleet: 'M2 17h12V9H2zM14 17h4l3-3v-3h-7M5.5 20a1.5 1.5 0 1 0 0.01 0M17.5 20a1.5 1.5 0 1 0 0.01 0',
  settings: 'M4 6h9M17 6h3M15 4v4M4 12h3M11 12h9M9 10v4M4 18h11M19 18h1M17 16v4',
  plus: 'M12 5v14M5 12h14', measure: 'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2', fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z', sun: 'M12 8a4 4 0 1 0 0.01 0M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  panel: 'M3 4h18v16H3zM15 4v16', chev: 'M9 6l6 6-6 6', chevL: 'M15 6l-6 6 6 6', x: 'M6 6l12 12M18 6L6 18', pin: 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11zM12 7.5a2.5 2.5 0 1 0 0.01 0',
  file: 'M5 3h10l4 4v14H5zM14 3v5h5M8 13h8M8 17h6', search: 'M10.5 4a6.5 6.5 0 1 0 0.01 0M15.5 15.5L21 21', locate: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0.01 0',
  dl: 'M12 3v12M7 10l5 5 5-5M4 20h16', cube: 'M12 2l9 5v10l-9 5-9-5V7zM12 12l9-5M12 12v10M12 12L3 7', copy: 'M8 8h12v12H8zM4 16V4h12', trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7', ext: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6', star: 'M12 3l2.2 5.6L20 9.4l-4.5 3.8 1.4 5.8L12 16l-4.9 3 1.4-5.8L4 9.4l5.8-.8z'
};
const ico = (k, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path d="${ICO[k] || ''}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SECTIONS = [
  ['job', 'Job', 'Who it\'s for — fills in the title block'], ['crane', 'Crane', 'Pick the crane and its load chart'], ['lift', 'Lift', 'What you lift, how heavy, what hangs off the hook'],
  ['site', 'Site', 'Buildings and things near the lift — clearance is checked'], ['weather', 'Weather', 'Wind at the boom top on lift day (optional)'], ['sheet', 'Sheet', 'Choose what prints, then export the PDF']
];
const PAGES = [['plans', 'Plans'], ['fleet', 'Fleet'], ['settings', 'Settings']];
const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

// ---------- shell ----------
function renderShell() {
  $('#rail').innerHTML = SECTIONS.map(([k, t]) => `<button type="button" class="ri" data-sec="${k}" aria-current="false" title="${h(t)}">${ico(k, 20)}<span>${h(t)}</span><i class="bdg ok" id="bdg-${k}"></i></button>`).join('')
    + `<span class="sp"></span><hr>` + PAGES.map(([k, t]) => `<button type="button" class="ri" data-page="${k}" aria-current="false" title="${h(t)}">${ico(k, 20)}<span>${h(t)}</span></button>`).join('');
  sceneInit($('#scene'), {
    plan: () => state.plan, calc: () => state.calc, livery,
    sheet: () => { if (!state._sheet || state._sheet.calc !== state.calc) { const { P, scale } = buildSheet(state.plan, state.calc, settingsEff()); state._sheet = { calc: state.calc, P, scale }; } return state._sheet; },
    edited: (kind) => { refresh(true); syncDrawer(); markDirty(); if (kind === 'drag-end' || kind === 'delete') { draft(); if (kind === 'delete') { renderDrawer(); hudTools(); } } },
    select: (s) => { state.sel = s; state.selEdit = false; if (state.sec === 'site') renderDrawer(); hudTools(); },
    tool: (t, n, pts) => sceneToolStep(t, n, pts),
    hover: (w) => { const c = $('#coords'); if (!c) return; c.innerHTML = w ? `<span>X <b>${w.x.toFixed(2)}</b></span><span>${Scene.mode === 'plan' ? 'N' : 'Y'} <b>${w.y.toFixed(2)}</b></span><span>m</span>` : ''; },
    rendered: (info) => { const hs = $('#hudScale'); if (!hs) return; hs.textContent = Scene.mode === 'sheet' ? (settingsEff().paper || 'A1') + ' · 841 × 594 mm' : `GRID ${info.grid} m`; }
  });
  Scene.dark = state.settings.canvas !== 'paper';
  bindStudio();
  window.addEventListener('resize', () => { posVswInd(); });
  makeGrain();
}
function makeGrain() {
  try { const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'); const im = g.createImageData(160, 160);
    for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0); $('#grain').style.backgroundImage = `url(${c.toDataURL('image/png')})`; } catch {}
}
function startStudio() {
  state.started = true;
  renderShell();
  $('#planName').value = state.plan.name || '';
  if (isMobile()) $('#work').classList.add('dr-off');
  setSection(state.sec, true, isMobile());
  setView(state.view, true);
  updateSaveState(); bindPop();
  ensureEnvLoaded(state.plan).then(ch => { if (ch) refresh(); });
  if (!LS.get('lp.toured', false)) setTimeout(tourInvite, 1800);
}
function setSection(k, quiet, keepClosed) {
  const work = $('#work');
  if (state.page) closePage();
  if (!quiet && k === state.sec && !work.classList.contains('dr-off')) { work.classList.add('dr-off'); railState(); return; }
  state.sec = k; if (!keepClosed) work.classList.remove('dr-off'); try { localStorage.setItem('lp.sec', k); } catch {}
  renderDrawer(); railState(); const b = $('#drBody'); if (b) b.scrollTop = 0;
}
function railState() { const off = $('#work').classList.contains('dr-off'); $$('.ri[data-sec]').forEach(b => b.setAttribute('aria-current', String(!state.page && !off && b.dataset.sec === state.sec))); $$('.ri[data-page]').forEach(b => b.setAttribute('aria-current', String(state.page === b.dataset.page))); }
function openPage(name) {
  state.page = name; const pg = $('#page'); pg.hidden = false; pg.scrollTop = 0;
  if (name === 'plans') renderPlans(); else if (name === 'fleet') renderFleet(); else renderSettings();
  railState(); try { localStorage.setItem('lp.page', name); } catch {}
}
function closePage() { state.page = null; const pg = $('#page'); pg.hidden = true; pg.innerHTML = ''; railState(); try { localStorage.removeItem('lp.page'); } catch {} sceneDirty(); }
function openPlan(p, sec) { state.plan = p; state.sel = Scene.sel = null; Scene.views = {}; state.savedAt = null; state.dirty = false; if (state.twin) state.twin.reframe(); if (state.page) closePage(); $('#planName').value = p.name || ''; if (sec) state.sec = sec; setSection(state.sec, true); updateSaveState(); refresh(true); ensureEnvLoaded(p).then(ch => { if (ch) refresh(); }); }

// ---------- views ----------
function setView(v, quiet) {
  if (!['elev', 'plan', '3d', 'sheet'].includes(v)) v = 'elev';
  state.view = v; try { localStorage.setItem('lp.view', v); } catch {}
  const cv = $('#cv'); cv.classList.toggle('sheet', v === 'sheet'); cv.classList.toggle('paper', (v === 'elev' || v === 'plan') && !Scene.dark);
  $$('#vsw button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === v)));
  if (v === '3d') { $('#scene').hidden = true; $('#twin').hidden = false; ensureTwin(); }
  else { $('#twin').hidden = true; $('#scene').hidden = false; if (Scene.mode !== v) sceneSetMode(v); }
  if (Scene.tool) sceneSetTool(null);
  posVswInd(); hudView(); hudTools();
  if (!quiet || state.calc) refresh(true); else refresh(true);
}
function posVswInd() { const b = $(`#vsw button[aria-selected="true"]`), ind = $('#vswInd'); if (!b || !ind) return; ind.style.left = b.offsetLeft + 'px'; ind.style.width = b.offsetWidth + 'px'; }
function ensureTwin() {
  const host = $('#twin'); if (state.twin || host.dataset.failed) return;
  if (!C3D.ok()) { host.dataset.failed = '1'; host.innerHTML = '<div class="twin-msg"><div><b>3D needs WebGL</b><br>This browser or device has WebGL switched off. The elevation, site plan and sheet still work.</div></div>'; return; }
  try { state.twin = C3D.twin(host); } catch (e) { console.error(e); host.dataset.failed = '1'; host.innerHTML = `<div class="twin-msg">3D view could not start: ${h(e.message)}</div>`; }
}
let twinT; function twinUpdate() { if (state.view !== '3d' || !state.twin || !state.calc) return; clearTimeout(twinT); twinT = setTimeout(() => { try { state.twin.update(state.plan, state.calc, state.calc.crane, livery()); } catch (e) { console.error(e); } }, 30); }
function setCanvasTheme(dark) { Scene.dark = dark; state.settings.canvas = dark ? 'night' : 'paper'; saveSettings(); setView(state.view); }

// ---------- drawer ----------
function renderDrawer() {
  const body = $('#drBody'); if (!body || !state.plan) return;
  try { state.calc = computePlan(state.plan, cranes(), settingsEff()); } catch (e) { console.error(e); }
  const i = SECTIONS.findIndex(s => s[0] === state.sec); const [k, title, sub] = SECTIONS[Math.max(0, i)];
  $('#drHead').innerHTML = `<span class="dr-idx">${String(i + 1).padStart(2, '0')}</span><h2>${h(title)}<span class="dr-sub">${h(sub)}</span></h2><button type="button" class="btn ghost icon sm" data-act="drClose" aria-label="Hide panel" title="Hide panel">${ico(isMobile() ? 'x' : 'chevL', 16)}</button>`;
  const keep = body.scrollTop;
  try { body.innerHTML = ({ job: secJob, crane: secCrane, lift: secLift, site: secSite, weather: secWeather, sheet: secSheet }[k] || secCrane)(); } catch (e) { console.error(e); body.innerHTML = `<p class="errs">Panel error: ${h(e.message)}</p>`; }
  body.scrollTop = keep;
  const prev = SECTIONS[i - 1], next = SECTIONS[i + 1];
  $('#drFoot').innerHTML = `${prev ? `<button type="button" class="btn ghost sm" data-sec-go="${prev[0]}">${ico('chevL', 14)}${h(prev[1])}</button>` : ''}<span class="sp"></span>${next ? `<button type="button" class="btn sm" data-sec-go="${next[0]}">Next: ${h(next[1])}${ico('chev', 14)}</button>` : '<button type="button" class="btn primary sm" data-top="pdf">Export PDF</button>'}`;
  syncRanges(body);
}
function syncDrawer() { // reflect canvas / console edits into visible inputs without re-rendering
  for (const el of $$('[data-k]', $('#app'))) { if (el === document.activeElement || el.disabled) continue; const v = getP(state.plan, el.dataset.k); if (el.type === 'checkbox') el.checked = !!v; else if (el.type === 'range') { if (v !== '' && v != null) el.value = v; } else if (String(el.value) !== String(v ?? '')) el.value = v ?? ''; }
  liftPosSync();
  syncRanges(document);
}
function liftPosSync() { // keep the Lift drawer's radius / angle / tip-height boxes in step with the deck and the canvas
  const li = activeLi(), r = state.calc?.loads?.[li]; if (!r || !$('#posR')) return; const ch = loadCol(li).ch;
  const v = { R: r.R, A: r.geo?.tip ? currentAngle(r, ch) : null, H: r.tipY };
  for (const k of ['R', 'A', 'H']) { const el = $('#pos' + k); if (el && el !== document.activeElement) el.value = v[k] != null && isFinite(v[k]) ? (+v[k]).toFixed(k === 'A' ? 1 : 2) : ''; }
  const po = $('#posOther'); if (po) { const b = po.querySelector('b'); if (b && r.hookY != null) b.textContent = fmt(r.hookY, 2) + ' m'; }
}
function syncRanges(root) { for (const r of $$('input[type=range].rg', root)) { const mn = +r.min || 0, mx = +r.max || 100; r.style.setProperty('--p', ((+r.value - mn) / Math.max(1e-9, mx - mn) * 100).toFixed(2) + '%'); } }
const grp = (title, inner, o = {}) => `<section class="grp"${o.id ? ` id="${o.id}"` : ''}><div class="gh"><h3>${h(title)}</h3><span class="sp"></span>${o.right || ''}</div>${inner}</section>`;

// ----- JOB -----
function secJob() {
  const p = state.plan;
  return grp('Plan', `<div class="row r1">${F.text('name', 'Plan name', { ph: 'e.g. Al Deem School — precast panels' })}</div>
      <div class="row">${F.text('meta.client', 'Client')}${F.text('meta.project', 'Project', { ph: 'optional' })}</div>`)
    + grp('Drawing', `<div class="row r1">${F.text('meta.title', 'Drawing title', { ph: 'e.g. LIFTING CHILLERS' })}</div>
      <div class="row r3">${F.text('meta.date', 'Date')}${F.text('meta.drawnBy', 'Drawn by')}${F.text('meta.checkedBy', 'Checked by')}</div>
      <div class="row r3">${F.text('meta.sheetNo', 'Sheet no')}${F.text('meta.drawingNo', 'Drawing no')}${F.text('meta.scale', 'Scale', { ph: 'auto' })}</div>`)
    + grp('Start faster', `<button type="button" class="btn wide" data-top="wizard">${ico('star', 15)}Quick setup — answer 5 questions, get the crane</button>
      <button type="button" class="btn ghost wide" data-page-go="plans">${ico('plans', 15)}Open a saved plan or an FHE example</button>
      <p class="hint">Everything you set here prints in the title block of the A1 sheet.</p>`);
}

// ----- CRANE -----
function chartSelect(charts, sel) {
  const q = (state.chartFilter || '').toLowerCase().split(/\s+/).filter(Boolean);
  const kinds = [['main', 'Telescopic boom'], ['fixedjib', 'Folding / lattice jib'], ['luffing', 'Luffing jib']];
  const match = (c, i) => i === sel || q.every(t => (c.name + ' ' + (c.config || '')).toLowerCase().includes(t));
  const groups = kinds.map(([k, lab]) => { const opts = charts.map((c, i) => [c, i]).filter(([c, i]) => (c.kind || 'main') === k && match(c, i)); return opts.length ? `<optgroup label="${lab} (${opts.length})">${opts.map(([c, i]) => `<option value="${i}"${i === sel ? ' selected' : ''}>${h(c.name)}</option>`).join('')}</optgroup>` : ''; }).join('');
  return `<label class="f" for="f-chartIdx"><span class="fl">Load chart</span><select id="f-chartIdx" data-k="chartIdx" data-re="1" data-num="1">${groups}<option value="-1"${sel === -1 ? ' selected' : ''}>No chart — enter capacity manually</option></select></label>`;
}
function craneCard(crane) {
  const spec = boomSpec(crane, chartLengths(crane)); const nCh = (crane.charts || []).length;
  return `<div class="ccard" style="--bc:${brandCol(crane)}"><div><div class="mk">${h(crane.make || '')} · ${h(crane.type || 'mobile crane')}</div><div class="md">${h(crane.model)}</div></div>
    <div class="cl">${h(crane.cls)}<small> t</small></div>
    <dl><div><dt>Boom</dt><dd>${fmt(spec.Lmin, 1)}–${fmt(spec.Lmax, 1)} m</dd></div><div><dt>Sections</dt><dd>${spec.n}</dd></div><div><dt>Outriggers</dt><dd>${h(crane.outrigger || '—')}</dd></div><div><dt>Charts</dt><dd>${nCh || 'none'}</dd></div></dl>
    <div class="acts"><button type="button" class="btn sm" data-act="pickCrane" aria-expanded="${state.pickCrane}">${state.pickCrane ? 'Done' : 'Change crane'}</button><button type="button" class="btn ghost sm" data-top="wizard">${ico('star', 14)}Which crane?</button><span class="sp"></span><button type="button" class="btn ghost sm" data-page-go="fleet" title="Edit specs and charts">Specs</button></div></div>`;
}
function cranePicker(cur) {
  const all = cranes(); const makes = [...new Set(all.map(c => (c.make || 'Other').split(' ')[0]))];
  const q = state.craneQ.toLowerCase(); const list = all.filter(c => (!state.craneMake || (c.make || 'Other').startsWith(state.craneMake)) && (!q || (c.make + ' ' + c.model + ' ' + c.cls).toLowerCase().includes(q)));
  return `<div class="cpick"><div class="cpick-tools"><input type="search" id="craneQ" placeholder="Search model or tonnage…" value="${h(state.craneQ)}" aria-label="Search cranes"></div>
    <div class="seg sm" role="radiogroup" aria-label="Make"><button type="button" role="radio" data-act="craneMake" data-v="" aria-checked="${!state.craneMake}">All</button>${makes.map(m => `<button type="button" role="radio" data-act="craneMake" data-v="${h(m)}" aria-checked="${state.craneMake === m}">${h(m)}</button>`).join('')}</div>
    <div class="ctiles">${list.map(c => `<button type="button" class="ctile${c.id === cur ? ' on' : ''}" data-act="setCrane" data-id="${h(c.id)}" style="--bc:${brandCol(c)}"><span class="c1"><b>${h(c.model)}</b><span class="t">${c.cls}t</span></span><small>${h(c.make)} · ${(c.charts || []).length ? (c.charts || []).length + ' charts' : 'no chart'}</small></button>`).join('') || '<p class="hint">No crane matches.</p>'}</div></div>`;
}
function teleFigure(spec, tele) {
  const W = 300, H = 64, L = tele.L; const lay = boomLayout(spec, L, tele.fr); const Lx = Math.max(spec.Lmax * 1.04, L + 1);
  const X = (s) => 8 + (s + spec.foot) / (Lx + spec.foot) * (W - 16);
  const out = [`<svg class="tele-fig" viewBox="0 0 ${W} ${H}" role="img" aria-label="Telescopic boom sections">`];
  out.push(`<line x1="8" y1="${H - 10}" x2="${W - 8}" y2="${H - 10}" stroke="#25303b"/>`);
  for (const Lm of [spec.Lmin, spec.Lmax]) out.push(`<line x1="${X(Lm)}" y1="${H - 14}" x2="${X(Lm)}" y2="${H - 6}" stroke="#4a5560"/><text x="${X(Lm)}" y="${H - 1}" fill="#6b7783" font-size="7.5" font-family="Martian Mono, monospace" text-anchor="middle">${fmt(Lm, 1)}</text>`);
  for (let i = lay.n - 1; i >= 0; i--) { const s0 = lay.starts[i] * lay.k, s1 = (lay.starts[i] + lay.lens[i]) * lay.k; const d = 28 * Math.pow(0.86, i); const y = 26 - d / 2;
    out.push(`<rect x="${X(s0).toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1, X(s1) - X(s0)).toFixed(1)}" height="${d.toFixed(1)}" fill="${i ? (i % 2 ? '#c98a00' : '#ffb81c') : '#ffb81c'}" fill-opacity="${i ? 0.9 : 1}" stroke="#0b0f14" stroke-width="1"/>`);
    if (i) out.push(`<text x="${(X(s1) - 3).toFixed(1)}" y="${(26 + 2.6).toFixed(1)}" fill="#160f02" font-size="7" font-weight="700" font-family="Martian Mono, monospace" text-anchor="end">${i}</text>`); }
  out.push(`<line x1="${X(L)}" y1="6" x2="${X(L)}" y2="${H - 10}" stroke="#4fe0ff" stroke-dasharray="2 2"/><text x="${Math.min(W - 30, X(L) + 4)}" y="10" fill="#4fe0ff" font-size="8.5" font-family="Martian Mono, monospace">${fmt(L, 2)} m</text>`);
  out.push('</svg>'); return out.join('');
}
function secCrane() {
  const p = state.plan; const { crane, ch, parsed } = curChart(); if (!crane) return '<div class="empty">No cranes in the fleet. Add one under Fleet.</div>';
  const charts = crane.charts || []; const chartIdx = +p.chartIdx; const res = state.calc?.loads?.[activeLi()];
  const colOpts = parsed ? parsed.cols.map((c, i) => [i, `${c.head || c.L}${ch.kind === 'main' ? ' m' : '°'}${c.label ? ' · ' + c.label : ''}${c.falls ? ' · ' + c.falls + ' falls' : ''}`]) : [];
  const G = geoSetup(p, crane, p.loads[activeLi()]); const spec = G.spec, tele = G.tele;
  const models = [...new Set([...cranes().map(c => c.model), 'LTM1100-4.2', 'LTM1300-6.2', 'LTM1400-6.2', 'GMK5150L', 'GMK6300L', 'ATF 100G-4', 'ATF 130G-5', 'AC 350-6', 'AC 500-2', 'Grove RT890E'])];
  const rigs = p.cranes || [{}], act = num(p.activeCrane, 0);
  const rigRow = `<div class="rigs dr-rigs" role="group" aria-label="Cranes on this plan">${rigs.map((r, i) => { const c = cranes().find(x => x.id === (i === act ? p.craneId : r.craneId)) || crane; const n = p.loads.filter(l => num(l.crane) === i).length; return `<div class="rig${i === act ? ' on' : ''}"><button type="button" data-act="rigSel" data-i="${i}" aria-pressed="${i === act}"><b>C${i + 1}</b><span>${h(c.model)}</span><small>${n} lift${n === 1 ? '' : 's'}</small></button>${rigs.length > 1 ? `<button type="button" class="tx" data-act="rigDel" data-i="${i}" aria-label="Remove crane ${i + 1}">${ico('x', 12)}</button>` : ''}</div>`; }).join('')}<button type="button" class="btn ghost sm" data-act="rigAdd">${ico('plus', 13)}Add a crane</button></div>
    <p class="hint">${rigs.length > 1 ? `You're editing <b>crane ${act + 1}</b>. Each lift picks its crane under Lift; the sheet prints a CRANE DATA block per crane.` : 'Two cranes on one job? Add a second crane — each lift then picks which crane does it.'}</p>`;
  let out = `<section class="grp"><div class="gh"><h3>Cranes on this plan</h3><span class="sp"></span></div>${rigRow}</section><section class="grp">${craneCard(crane)}${state.pickCrane ? cranePicker(crane.id) : ''}
    <div class="row r1">${F.text('modelTxt', 'Model printed on the sheet', { list: 'modelList', ph: crane.model, em: 'any crane — the drawing uses ' + crane.model })}</div><datalist id="modelList">${models.map(m => `<option value="${h(m)}">`).join('')}</datalist></section>`;
  // load chart
  out += grp('Load chart', `${chartSelect(charts, chartIdx)}
    ${charts.length > 12 ? `<label class="f" for="chartFilter"><span class="fl">Filter <em>${charts.length} charts — try “T 72.5”, “luffing 42”</em></span><input type="search" id="chartFilter" value="${h(state.chartFilter || '')}" placeholder="filter by CWT, boom, jib…"></label>` : ''}
    ${parsed ? `<div class="row">${F.sel('colIdx', ch.kind === 'main' ? 'Chart boom length' : ch.kind === 'luffing' ? 'Main boom angle' : 'Fly-jib offset', colOpts, { re: 1, numeric: 1 })}${ch.kind === 'main' ? `<label class="f"><span class="fl">Config</span><input type="text" disabled value="${h(ch.config || '—')} · CWT ${h(ch.cwt ?? '—')} t"></label>` : `<label class="f"><span class="fl">Jib</span><input type="text" disabled value="${h((ch.mainLabel || ch.mainLen) + ' m + ' + ch.jibLen + ' m')}"></label>`}</div>` : '<p class="hint">No chart — enter the chart capacity on each load (Lift).</p>'}
    ${ch?.verify ? `<div class="note warn"><b>Unverified chart.</b> ${h(ch.source || 'Transcribed from a public datasheet')}. Check every value against the crane's own load chart before issuing.</div>` : ''}
    ${parsed?.errors?.length ? `<div class="errs">Chart note: ${h(parsed.errors[0])}</div>` : ''}`, { right: `<span class="tag">${charts.length} in library</span>` });
  // telescopic boom
  const locked = tele.locked; const man = tele.mode === 'manual';
  const lens = parsed && ch.kind === 'main' ? [...new Set(parsed.cols.map(c => c.L))].sort((a, b) => a - b) : [];
  const ticks = lens.map(L => { const x = (L - spec.Lmin) / Math.max(1e-6, spec.Lmax - spec.Lmin) * 100; return `<i class="${Math.abs(L - tele.L) < 0.05 ? 'on' : ''}" style="left:${x.toFixed(2)}%"></i>`; }).join('');
  const tickLab = lens.length <= 9 ? lens.map(L => `<span style="left:${((L - spec.Lmin) / Math.max(1e-6, spec.Lmax - spec.Lmin) * 100).toFixed(2)}%">${L}</span>`).join('') : '';
  out += grp('Telescopic boom', `${teleFigure(spec, tele)}
    ${locked ? `<div class="note">The ${ch.kind === 'luffing' ? 'luffing-jib' : 'fly-jib'} chart fixes the main boom at <b>${fmt(tele.L, 1)} m</b>. Pick a telescopic chart to telescope by hand.</div>` : `
    ${!man ? `<label class="f"><span class="fl">Boom length <em>${fmt(spec.Lmin, 1)}–${fmt(spec.Lmax, 1)} m real range · snaps to chart lengths</em></span>
      <input type="range" class="rg" id="boomRange" min="${spec.Lmin}" max="${spec.Lmax}" step="0.1" value="${tele.L}" aria-label="Boom length"><div class="rg-ticks">${ticks}${tickLab}</div></label>
      <div class="row">${F.num('boomOverride', 'Set length', 'm', { ph: fmt(tele.L, 1), min: spec.Lmin, max: spec.Lmax })}<div class="f"><span class="fl">Capacity from</span><input type="text" disabled value="${res?.capInfo?.between ? 'lower of ' + res.capInfo.between.join(' / ') + ' m' : G.col ? colName(G.col) + ' m column' : '—'}"></div></div>
      <details class="adv"><summary>Advanced — push each section out by hand</summary><p class="hint">Normally all sections slide out evenly, like most cranes do. Only switch this on if the operator telescopes a special sequence.</p><button type="button" class="btn sm" data-act="teleMode" data-v="manual">Set sections by hand</button></details>`
    : `<div class="tsecs">${tele.fr.map((f, i) => `<div class="tsec"><b>T${i + 1}</b><input type="range" class="rg" data-tsec="${i}" min="0" max="100" step="1" value="${Math.round(f * 100)}" aria-label="Section ${i + 1} extension"><output>${Math.round(f * 100)}%<small> · ${fmt(f * spec.E, 1)} m</small></output></div>`).join('')}</div>
      <div class="actions"><button type="button" class="btn sm" data-act="telePre" data-v="0">Retract all</button><button type="button" class="btn sm" data-act="telePre" data-v="even">Even</button><button type="button" class="btn sm" data-act="telePre" data-v="seq">In sequence</button><button type="button" class="btn sm" data-act="telePre" data-v="1">Full out</button></div>
      <button type="button" class="btn ghost sm" data-act="teleMode" data-v="auto">${ico('refresh', 13)}Back to even telescoping</button>`}
    <p class="hint">${spec.tele} telescopic sections · each strokes up to ${fmt(spec.E, 2)} m · boom can't go past ${fmt(spec.Lmax, 1)} m.</p>`}`, { right: `<span class="tag">${man ? 'MANUAL' : 'AUTO'} · ${fmt(tele.L, 2)} m</span>` });
  out += grp('Accessories', accPanel(crane, ch, G));
  out += grp('Counterweight & support', `<div class="row r3">${F.num('cwt', 'Counterweight', 't', { ph: String(ch?.cwt ?? crane.cwt ?? '') })}${F.text('config', 'Config', { ph: ch?.config || '' })}${F.text('outriggerTxt', 'Outriggers', { ph: ch?.outrigger || crane.outrigger })}</div>
    <div class="row r3">${F.num('falls', 'Falls', '', { ph: String(parsed?.cols[+p.colIdx]?.falls || '') })}${F.text('matSize', 'Mat size', { ph: '2.5x2.5m' })}${F.text('wind', 'Wind (sheet)', { ph: '7M/S' })}</div>
    <div class="row">${F.num('hookAllowance', 'Hook + 2-block allowance', 'm')}<label class="check" style="align-self:end">${F.tog('mergeHook', { label: 'Hook and tackles as one row' })}<span>Hook + tackles as one row</span></label></div>`);
  return out;
}
function accPanel(crane, ch, G) {
  const p = state.plan; const avail = crane.acc || ['flyjib']; const at = p.attach || {}; const jibChart = ch && ch.kind && ch.kind !== 'main';
  const A = G.acc || {}; const rows = [];
  const row = (key, title, sub, on, body, dis) => `<div class="acc${on ? ' on' : ''}${dis ? ' na' : ''}"><div class="acc-h"><b>${h(title)}<small>${h(sub)}</small></b><input type="checkbox" class="tog" data-acc="${key}"${on ? ' checked' : ''}${dis ? ' disabled' : ''} aria-label="${h(title)}"></div>${on && body ? body : ''}</div>`;
  if (avail.includes('flyjib')) { const [a, b] = jibRange(crane, 'fly'); const on = at.type === 'fly' && !at.ext;
    rows.push(row('flyjib', 'Fly jib', jibChart ? 'set by the jib load chart' : `lattice jib ${a}–${b} m`, on, `<div class="row">${F.num('attach.jibLen', 'Jib length', 'm', { min: a, max: b })}${F.num('attach.offset', 'Offset', '°', { min: 0, max: 60 })}</div><div class="row">${F.num('attach.swl', 'Jib SWL', 't', { ph: 'from chart', em: 'at this radius' })}<span></span></div>
      <input type="range" class="rg" data-k="attach.jibLen" min="${a}" max="${b}" step="0.5" value="${num(at.jibLen, a)}" aria-label="Jib length"><div class="seg sm">${[0, 20, 40].map(o => `<button type="button" data-act="flyOff" data-v="${o}" aria-pressed="${num(at.offset) === o}">${o}° offset</button>`).join('')}</div>
      <p class="hint">Capacity comes from the jib SWL you enter — read it off the fly-jib chart for this radius.</p>`, jibChart)); }
  if (avail.includes('extension')) { const [a, b] = jibRange(crane, 'fly'); const on = at.type === 'fly' && !!at.ext;
    rows.push(row('extension', 'Boom extension', 'lattice extension in line with the boom', on, `<div class="row">${F.num('attach.jibLen', 'Extension length', 'm', { min: a, max: b })}${F.num('attach.swl', 'SWL', 't', { ph: 'from chart' })}</div>`, jibChart)); }
  if (avail.includes('luffing')) { const [a, b] = jibRange(crane, 'luff'); const on = at.type === 'luff';
    rows.push(row('luffing', 'Luffing jib', jibChart ? 'set by the jib load chart' : `luffing jib ${a}–${b} m`, on, `<div class="row">${F.num('attach.boomAngle', 'Main boom angle', '°', { min: 60, max: 86 })}${F.num('attach.jibLen', 'Jib length', 'm', { min: a, max: b })}</div><div class="row">${F.num('attach.swl', 'Jib SWL', 't', { ph: 'from chart', em: 'at this radius' })}<span></span></div>
      <input type="range" class="rg" data-k="attach.jibLen" min="${a}" max="${b}" step="0.5" value="${num(at.jibLen, a)}" aria-label="Luffing jib length">
      <input type="range" class="rg" data-k="attach.boomAngle" min="60" max="86" step="0.5" value="${num(at.boomAngle, 83)}" aria-label="Main boom angle"><p class="hint">Main boom fixed at ${num(at.boomAngle, 83)}°; the radius sets the jib angle.</p>`, jibChart)); }
  if (avail.includes('superlift')) rows.push(row('superlift', 'Superlift', 'derrick mast + suspended ballast', A.superlift, `<div class="row">${F.num('acc.slRadius', 'Ballast radius', 'm', { min: 8, max: 25 })}${F.num('acc.slBallast', 'Superlift ballast', 't')}</div><input type="range" class="rg" data-k="acc.slRadius" min="8" max="25" step="0.5" value="${num(p.acc?.slRadius, 15)}" aria-label="Ballast radius">`));
  if (avail.includes('yguy')) rows.push(row('yguy', 'Y-guying', A.yguyAuto ? 'on — the TY chart needs it' : 'telescopic boom guying', A.yguy, '', A.yguyAuto));
  if (avail.includes('runner')) rows.push(row('runner', 'Runner', 'single-sheave head for a second hook', A.runner, ''));
  return rows.length ? `<div class="accs">${rows.join('')}</div><p class="hint">Only what this crane actually carries is listed. Drawn on the elevation, the 3D view and the sheet.</p>` : '<p class="hint">No accessories listed for this crane — add them under Fleet.</p>';
}

// ----- LIFT -----
const LOAD_PRESETS = [['box', 'Box / equipment'], ['chiller6', 'Chiller / AC unit 6 m'], ['chiller12', 'Chiller 12 m'], ['c20', "Container 20' (6.06 m)"], ['c40', "Container 40' (12.19 m)"], ['drum', 'Cable drum'], ['coil', 'Steel coil'], ['cylinder', 'Cylinder / tank'], ['bundle', 'Steel bundle'], ['tc', 'Tower-crane part']];
const PRESET_DIMS = { box: ['box'], chiller6: ['chiller', 6, 2.59], chiller12: ['chiller', 12, 2.59], c20: ['container', 6.06, 2.59], c40: ['container', 12.19, 2.59], drum: ['drum'], coil: ['coil', 1.6, 1.6], cylinder: ['cylinder', 1.5, 2], bundle: ['bundle', 6, 0.8], tc: ['tc'] };
function loadPreset(l) { const sh = l.shape || 'box'; if (sh === 'container') return num(l.l) > 9 ? 'c40' : 'c20'; if (sh === 'chiller') return num(l.l) > 9 ? 'chiller12' : 'chiller6'; return PRESET_DIMS[sh] ? sh : 'box'; }
function utilCls(r) { const S = settingsEff(); return r?.cap == null ? 'fail' : r.util > num(S.utilMax, 100) ? 'fail' : r.util > num(S.utilWarn, 100) ? 'warn' : 'ok'; }
function secLift() {
  const p = state.plan; const L = p.loads; const li = activeLi(); const l = L[li];
  const { ch, parsed, col } = loadCol(li); const res = state.calc?.loads?.[li]; const crane = curCrane();
  const [rmin, rmax] = radiusRange(li);
  const colOpts = parsed ? parsed.cols.map((c, i) => [i, `${c.head || c.L}${ch.kind === 'main' ? ' m' : '°'}${c.label ? ' · ' + c.label : ''}`]) : [];
  const by = l.by === 'angle' ? 'angle' : l.by === 'height' ? 'height' : 'radius';
  const ang = res?.geo?.tip ? currentAngle(res, ch) : null; const rigs = p.cranes || [];
  const posIn = (key, label, unit, val, step, drive) => `<label class="f pin${by === drive ? ' drv' : ''}" for="pos${key}"><span class="fl">${h(label)}${by === drive ? ' <em>held</em>' : ''}</span><span class="fi"><input type="number" class="posIn" id="pos${key}" data-dial="${key}" step="${step}" inputmode="decimal" value="${val != null && isFinite(val) ? (+val).toFixed(key === 'A' ? 1 : 2) : ''}"><i>${unit}</i></span></label>`;
  const D = l.daf || {}; const dafAutoMode = D.mode !== 'manual';
  const stackW = (l.tackles || []).some(t => num(t.w) > 0 || num(t.L) > 0);
  return `<section class="grp"><div class="ltabs" role="tablist">${L.map((x, i) => { const rr = state.calc?.loads?.[i]; const u = rr?.util; return `<button type="button" role="tab" class="ltab" data-act="selLoad" data-i="${i}" aria-selected="${i === li}"><b>Lift ${i + 1}${rigs.length > 1 ? ' · C' + (num(x.crane) + 1) : ''}${x.liftType ? ' · ' + h(x.liftType) : ''}</b><span>${h(x.name || 'unnamed')} · ${x.empty ? 'empty hook' : num(x.w) + ' t'} · ${u != null ? u.toFixed(0) + '%' : '—'}</span><i class="ubar ${utilCls(rr)}"><i style="width:${Math.min(100, u || 0)}%"></i></i></button>`; }).join('')}${L.length < 6 ? '<button type="button" class="ltab add" data-act="addLoad" aria-label="Add a lift">+</button>' : ''}</div></section>`
    + grp('The load', `<div class="row">${F.text(`loads.${li}.name`, 'Load name', { ph: 'optional' })}<label class="f" for="loadPreset"><span class="fl">Type</span><select id="loadPreset" data-li="${li}">${LOAD_PRESETS.map(([v, lab]) => `<option value="${v}"${v === loadPreset(l) ? ' selected' : ''}>${h(lab)}</option>`).join('')}</select></label></div>
      <div class="row r3">${F.num(`loads.${li}.w`, 'Weight', 't', { dis: !!l.empty })}${F.num(`loads.${li}.cont`, 'Contingency', '%', { ph: '0', dis: l.contOn === false })}${F.sel(`loads.${li}.liftType`, 'Category', [['', '—'], ...LIFT_TYPES.map(t => [t, t])])}</div>
      <div class="row"><label class="check">${F.tog(`loads.${li}.contOn`, { re: 1, label: 'Contingency on' })}<span>Contingency on</span></label><label class="check">${F.tog(`loads.${li}.empty`, { re: 1, label: 'Show the hook empty' })}<span>Hook empty</span></label></div>
      ${rigs.length > 1 ? `<div class="row r1">${F.sel(`loads.${li}.crane`, 'Lifted by', rigs.map((r, i) => { const c = cranes().find(x => x.id === (i === num(p.activeCrane) ? p.craneId : r.craneId)); return [i, `Crane ${i + 1} · ${c ? c.model : '—'}`]; }), { numeric: 1, re: 1 })}</div>` : ''}
      ${l.empty ? '<p class="hint">Hook empty — only the hook block (and tackles, if any) count. The sheet prints LOAD WEIGHT: HOOK EMPTY.</p>' : ''}`)
    + grp('Position', `<span class="fl">Keep fixed when the boom telescopes</span><div class="seg" role="radiogroup" aria-label="Keep fixed when the boom telescopes">${[['radius', 'Radius'], ['angle', ch?.kind === 'luffing' ? 'Jib angle' : 'Angle'], ['height', 'Tip height']].map(([v, t]) => `<button type="button" role="radio" data-act="by" data-v="${v}" aria-checked="${by === v}">${h(t)}</button>`).join('')}</div>
      <div class="row r3 pos3">${posIn('R', 'Radius', 'm', res?.R, 0.1, 'radius')}${posIn('A', angleName(ch), '°', ang, 0.5, 'angle')}${posIn('H', 'Tip height', 'm', res?.tipY, 0.1, 'height')}</div>
      <p class="hint" id="posOther">${res?.geo?.tip ? `Hook at <b>${fmt(res.hookY, 2)} m</b> · boom ${fmt(res.tele?.L, 2)} m. ` : '<span class="errs">Out of reach. </span>'}Type any value — that one is held when the boom telescopes. ${parsed && !(res?.capInfo?.between) ? `Chart covers ${rmin}–${rmax} m.` : `Reach ${rmin}–${rmax} m.`}</p>`)
    + grp('Lifting tackles', `<div class="tk-list dr-tk">${tackleRows(li) || '<p class="hint">No tackles — add slings, shackles, a spreader beam… Lengths build the rigging height on the drawing, weights add to the lift.</p>'}</div>
      <div class="actions"><button type="button" class="btn sm" data-dk="tkAdd">${ico('plus', 13)}Add tackle</button><label class="tk-lib"><select data-dk="tkLib" aria-label="Add from my tackle library"><option value="">From library…</option>${tackleLib().map((t, i) => `<option value="${i}">${h(t.name)}${t.L ? ' · ' + t.L + ' m' : ''}${t.w ? ' · ' + t.w + ' t' : ''}</option>`).join('')}</select></label>${(l.tackles || []).length ? '<button type="button" class="btn ghost sm" data-dk="tkClear">Clear</button>' : ''}</div>`, { right: `<span class="tag">${fmt(res?.tk, 2)} t${res?.stack ? ' · ' + fmt(res.stack.H, 2) + ' m' : ''}</span>` })
    + grp('Deductions', `<div class="row r3">${F.num(`loads.${li}.hb`, 'Hook block', 't', { ph: String(crane?.hookBlock ?? '') })}${stackW ? `<label class="f"><span class="fl">Tackles <em>from the list</em></span><span class="fi"><input type="text" disabled value="${fmt(res?.tk, 2)}" aria-label="Tackle weight from the list"><i>t</i></span></label>` : F.num(`loads.${li}.tk`, 'Tackles', 't', { ph: '0' })}${F.num(`loads.${li}.extra`, 'Other', 't', { ph: '0' })}</div>
      <p class="hint">Total on the hook <b>${res ? res.total.toFixed(2) + ' t' : '—'}</b>${res?.daf ? ` · design <b>${res.design.toFixed(2)} t</b>` : ''}${res?.cap != null ? ` of <b>${res.cap.toFixed(2)} t</b> chart capacity` : ''}.${stackW ? ' Tackle weight is the sum of the list above.' : (l.tackles || []).length ? ' Give the tackles a weight in the list and it replaces this number.' : ''}</p>`)
    + grp('Dynamic amplification (DAF)', `<label class="check">${F.tog(`loads.${li}.daf.on`, { re: 1, label: 'Apply a DAF' })}<span>Apply a DAF — utilisation on total × DAF</span></label>
      ${D.on ? `<div class="seg" role="radiogroup" aria-label="DAF source"><button type="button" role="radio" data-dk="dafMode" data-v="auto" aria-checked="${dafAutoMode}">Auto · EN 13001-2</button><button type="button" role="radio" data-dk="dafMode" data-v="manual" aria-checked="${!dafAutoMode}">Manual</button></div>
      ${dafAutoMode ? `<div class="row">${F.sel(`loads.${li}.daf.cls`, 'Hoisting class', ['HC1', 'HC2', 'HC3', 'HC4'].map(c => [c, c]))}${F.num(`loads.${li}.daf.vh`, 'Hoist speed', 'm/s')}</div><p class="hint">φ₂ = φ₂,min + β₂·v<sub>h</sub> → <b>${res?.daf ? res.daf.toFixed(3) : '—'}</b>. HC1 1.05 + 0.17v · HC2 1.10 + 0.34v · HC3 1.15 + 0.51v · HC4 1.20 + 0.68v.</p>`
        : `<div class="row">${F.num(`loads.${li}.daf.v`, 'DAF', '×')}<span></span></div>`}` : ''}`)
    + grp('Rigging', `<div class="row">${F.sel(`loads.${li}.rigType`, 'Method', [['', 'Simple slings (not detailed)'], ...Object.entries(RIG_TYPES).map(([k, t]) => [k, t.label])], { re: 1 })}${F.num(`loads.${li}.slingL`, 'Sling length', 'm', { ph: 'optional', list: 'slingLens' })}</div>
      <div class="row">${F.num(`loads.${li}.slingAng`, 'Sling angle', '°', { ph: '60' })}${F.num(`loads.${li}.slingWLL`, 'Sling WLL', 't', { ph: 'not checked' })}</div>
      <p class="hint" id="slingOut">${res?.sling ? `<b>${res.sling.T.toFixed(2)} t</b> per leg${res.sling.rigH != null ? ` · rig height ${res.sling.rigH.toFixed(2)} m` : ''}` : 'Pick a method or a sling length to check the tension.'}</p>
      <datalist id="slingLens">${[2, 3, 4, 5, 6, 7, 8, 10, 12].map(v => `<option value="${v}">`).join('')}</datalist>`)
    + grp('Size & landing', `<div class="row r3">${F.num(`loads.${li}.l`, 'Length', 'm')}${F.num(`loads.${li}.h`, 'Height', 'm')}${F.num(`loads.${li}.rigH`, 'Rigging height', 'm', { dis: res?.sling?.rigH != null })}</div>
      <div class="row">${F.num(`loads.${li}.landY`, 'Landing level', 'm', { ph: res ? 'auto ' + res.landY.toFixed(2) : 'auto' })}${F.num(`loads.${li}.capOverride`, 'Chart capacity', 't', { ph: parsed ? 'from chart' : 'required' })}</div>
      ${parsed ? `<div class="row r1">${F.sel(`loads.${li}.colIdx`, 'Boom for this load', [['', 'Same as crane setup'], ...colOpts], { re: 1 })}</div>` : ''}`)
    + grp('On the sheet', `<div class="row">${F.sel('activeLoad', 'Elevation shows', L.map((x, i) => [i, `Load ${i + 1}${x.name ? ' · ' + x.name : ''}`]), { numeric: 1, re: 1 })}${p.layout === 'elev2' ? F.sel('secondLoad', 'Second elevation', L.map((x, i) => [i, `Load ${i + 1}${x.name ? ' · ' + x.name : ''}`]), { numeric: 1 }) : F.text('viewTitle1', 'View caption', { ph: (crane?.cls || '') + 'T MOBILE CRANE' })}</div>
      <label class="f" for="f-loads.${li}.notes"><span class="fl">Notes for this lift <em>printed under general notes</em></span><textarea id="f-loads.${li}.notes" data-k="loads.${li}.notes" rows="2" placeholder="e.g. tag lines both sides, banksman at the gate">${h(l.notes || '')}</textarea></label>
      <div class="actions">${L.length < 4 ? `<button type="button" class="btn sm" data-act="dupLoad" data-i="${li}">${ico('copy', 14)}Duplicate load ${li + 1}</button>` : ''}${L.length > 1 ? `<button type="button" class="btn ghost sm danger" data-act="delLoad" data-i="${li}">${ico('trash', 14)}Remove load ${li + 1}</button>` : ''}</div>`);
}

// ----- SITE -----
const OBJ_ICON = { building: 'M3 21V8l7-4 7 4v13M7 21v-4h6v4', wall: 'M3 18h18M3 13h18M3 8h18M8 8v5M14 13v5M16 8v5', box: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8', container: 'M3 7h18v10H3zM7 7v10M11 7v10M15 7v10', trailer: 'M2 15h14v-3H2zM16 15h5v-4l-2-2h-3zM5 18a1.5 1.5 0 1 0 0-.01M18 18a1.5 1.5 0 1 0 0-.01', truck: 'M2 16h11V7H2zM13 16h7v-5l-3-3h-4zM6 19a1.5 1.5 0 1 0 0-.01M17 19a1.5 1.5 0 1 0 0-.01', towercrane: 'M8 21V5M12 21V5M8 5h13M3 5h5M8 9l4-4M8 13l4-4M8 17l4-4M19 5v5', tower: 'M12 3L6 21M12 3l6 18M8 14h8M4 8h16', person: 'M12 6a2 2 0 1 0 0-.01M12 9v6M9 21l3-6 3 6M8 12h8', tree: 'M12 21v-6M12 3a5 5 0 0 0-5 5 4 4 0 0 0 1 7h8a4 4 0 0 0 1-7 5 5 0 0 0-5-5z', pole: 'M12 3v18M6 6h12M7 6v2M17 6v2M10 21h4', shed: 'M3 11l9-7 9 7M5 10v11h14V10M10 21v-5h4v5' };
function objIcon(t) { return `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="${OBJ_ICON[t] || OBJ_ICON.box}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function objFields(o, i) {
  const pre = `site.obstacles.${i}.`;
  const xl = ['towercrane', 'tower', 'person', 'tree', 'pole'].includes(o.type) ? 'Centre at' : 'Near side at';
  const rows = [`<div class="row r1">${F.text(pre + 'label', 'Label', { ph: OBJ_TYPES[o.type]?.label.toUpperCase() })}</div>`, `<div class="row">${F.num(pre + 'x', xl, 'm')}${F.num(pre + 'y', 'Raised by', 'm', { ph: '0' })}</div>`];
  if (['building', 'wall', 'box'].includes(o.type)) rows.push(`<div class="row r3">${F.num(pre + 'w', 'Width', 'm')}${F.num(pre + 'h', 'Height', 'm')}${o.type === 'building' ? F.num(pre + 'd', 'Depth', 'm', { ph: 'auto' }) : '<span></span>'}</div>`);
  if (o.type === 'container') rows.push(`<div class="row">${F.sel(pre + 'size', 'Size', [['20', "20' (6.06 m)"], ['40', "40' (12.19 m)"]])}<span></span></div>`);
  if (o.type === 'towercrane') rows.push(`<div class="row r3">${F.num(pre + 'h', 'Mast height', 'm')}${F.num(pre + 'mastW', 'Mast width', 'm')}${F.num(pre + 'topH', 'Top', 'm')}</div><div class="row">${F.num(pre + 'jib', 'Jib reach', 'm', { ph: 'none' })}${F.num(pre + 'cjib', 'Counter-jib', 'm', { ph: '30% of jib' })}</div>`);
  if (o.type === 'tree') rows.push(`<div class="row">${F.num(pre + 'w', 'Canopy width', 'm')}${F.num(pre + 'h', 'Height', 'm')}</div>`);
  if (o.type === 'pole') rows.push(`<div class="row">${F.num(pre + 'h', 'Height', 'm')}${F.num(pre + 'w', 'Cross-arm', 'm')}</div><div class="row r1">${F.chk(pre + 'live', 'Live power lines — keep the exclusion zone')}</div>`);
  if (o.type === 'shed') rows.push(`<div class="row">${F.num(pre + 'w', 'Width', 'm')}${F.num(pre + 'h', 'Wall height', 'm')}</div>`);
  if (o.type === 'tower') rows.push(`<div class="row">${F.num(pre + 'w', 'Base width', 'm')}${F.num(pre + 'h', 'Height', 'm')}</div>`);
  return rows.join('');
}
function envFields(e, i) {
  const pre = `env.${i}.`;
  const scale = e.kind === 'dxf' ? F.sel(pre + 'unit', 'Units', [['mm', 'Millimetres'], ['cm', 'Centimetres'], ['m', 'Metres'], ['in', 'Inches'], ['ft', 'Feet']], { re: 1 })
    : e.kind === 'pdf' ? F.num(pre + 'N', 'Scale 1:', '', { re: 1 }) : F.num(pre + 'sc', 'Metres / px', 'm');
  return `<div class="row">${F.text(pre + 'name', 'Name')}${F.sel(pre + 'view', 'Shown in', [['elev', 'Elevation'], ['plan', 'Site plan']], { re: 1 })}</div>
    <div class="row r3">${scale}${F.num(pre + 'rot', 'Rotate', '°')}${F.num(pre + 'opacity', 'Opacity', '')}</div>
    ${e.calibrated ? '<p class="hint ok">Scale set from two measured points.</p>' : ''}
    <div class="row">${F.chk(pre + 'mono', 'Grey lines')}${F.chk(pre + 'hidden', 'Hide')}</div>
    <div class="actions"><button type="button" class="btn sm" data-act="envCalib" data-i="${i}">Scale from 2 points</button><button type="button" class="btn sm" data-act="envAlign" data-i="${i}">Line up a point</button><button type="button" class="btn ghost sm" data-act="envCentre" data-i="${i}">Centre</button><button type="button" class="btn ghost sm danger" data-act="envDel" data-i="${i}">Remove</button></div>
    ${e.missing ? '<p class="errs">The drawing file could not be loaded.</p>' : ''}`;
}
function secSite() {
  const p = state.plan; const site = p.site; const obs = site.obstacles || [];
  const selI = /^obj:(\d+)$/.exec(state.sel || '')?.[1];
  return grp('Ground', `<div class="row r3">${F.sel('site.groundType', 'Crane on', [['ground', 'Ground'], ['barge', 'Barge']], { re: 1 })}${F.num('site.stepX', 'Step at', 'm', { ph: 'none' })}${F.num('site.targetGround', 'New level', 'm', { ph: '0' })}</div>`)
    + grp('Obstructions & landing', `<div class="otiles">${Object.entries(OBJ_TYPES).map(([k, t]) => `<button type="button" class="otile" data-act="addObj" data-type="${k}">${objIcon(k)}<span>${h(t.label)}</span></button>`).join('')}</div>
      <div class="olist">${obs.map((o, i) => `<details class="oitem${String(i) === selI ? ' sel' : ''}" data-oi="${i}"${String(i) === selI ? ' open' : ''}><summary>${objIcon(o.type)}<b>${h(o.label || OBJ_TYPES[o.type]?.label || o.type)}</b><span>${num(o.x).toFixed(1)} m${num(o.y) ? ' · +' + num(o.y).toFixed(2) : ''}</span><button type="button" class="x" data-act="delObj" data-i="${i}" aria-label="Remove">${ico('x', 14)}</button></summary><div class="obody">${objFields(o, i)}</div></details>`).join('') || '<p class="hint">Nothing placed yet. Add the building, trailer or anything else in the lift zone — it is drawn to scale and checked for boom clearance.</p>'}</div>`,
      { right: obs.length ? '<button type="button" class="btn ghost xs danger" data-act="clearObjs">Clear all</button>' : '' })
    + grp('Client drawings', `<p class="hint">Bring in the client's plot, section or site plan (DXF, PDF or image). Set the scale from two known points, then drag it under the crane.</p>
      <button type="button" class="btn wide" data-act="importEnv">${ico('file', 15)}Import DXF, PDF or image</button>
      <div class="olist">${(p.env || []).map((e, i) => `<details class="oitem" data-ei="${i}"${state.openEnv === e.id ? ' open' : ''}><summary>${ico('file', 16)}<b>${h(e.name || 'Drawing')}</b><span>${e.kind.toUpperCase()} · ${e.view === 'plan' ? 'plan' : 'elev'}${e.hidden ? ' · hidden' : ''}</span><span></span></summary><div class="obody">${envFields(e, i)}</div></details>`).join('')}</div>`)
    + grp('Site plan', `<label class="check">${F.tog('sitePlan.enabled', { re: 1, label: 'Print a site plan' })}<span>Print a site plan next to the elevation</span></label>
      <div class="row r3">${F.num('sitePlan.cx', 'Crane E', 'm')}${F.num('sitePlan.cy', 'Crane N', 'm')}${F.num('sitePlan.rot', 'Slew to', '°')}</div>
      <div class="row">${F.num('sitePlan.carrierRot', 'Carrier heading', '°', { ph: 'same as slew' })}<button type="button" class="btn sm" style="align-self:end" data-view-go="plan">Open site plan view</button></div>
      <p class="hint">In the site plan view drag the amber dot to move the crane, the magenta diamond to slew and set the radius, the grey square to turn the carrier. The 3D view follows the same slew.</p>`);
}

// ----- WEATHER -----
const WX_BLOCKED = 'Live forecasts can\'t load inside this claude.ai link — the page isn\'t allowed to fetch outside data. They work in the offline copy of the planner. Enter the forecast below in the meantime.';
function secWeather() {
  const p = state.plan; const W = p.weather; const S = state.wx; const res = state.calc?.loads?.[activeLi()]; const tipH = Math.max(10, num(res?.tipY, 30));
  if (!W) return grp('Weather', `<p class="hint">Optional. Add the lift location and date to pull an hourly forecast — wind is worked out at the boom-tip height, gusts are checked against the permitted wind speed, and rain or storms are flagged. The forecast prints on the sheet.</p>
    <button type="button" class="btn primary wide" data-act="wxOn">${ico('weather', 15)}Add a forecast to this plan</button>`);
  const wx = state.calc?.weather; const days = WX.days(W);
  let out = grp('Location', `${W.place ? `<div class="wx-place">${ico('pin', 18)}<div><b>${h(W.place)}</b><small>${W.lat != null ? `${(+W.lat).toFixed(4)}, ${(+W.lon).toFixed(4)}${W.tz ? ' · ' + h(W.tz) : ''}` : 'no coordinates — forecast entered by hand'}</small></div><button type="button" class="btn ghost xs" data-act="wxChange">Change</button></div>` : ''}
    ${!W.place || S.editing ? `<div class="row" style="grid-template-columns:minmax(0,1fr) auto"><input type="search" id="wxQ" placeholder="Site, area or city — e.g. Musaffah, Khalifa Port" value="${h(S.q)}" aria-label="Lift location"><button type="button" class="btn" data-act="wxSearch"${S.busy ? ' disabled' : ''}>${ico('search', 15)}${S.busy ? 'Searching…' : 'Search'}</button></div>
    <div class="actions"><button type="button" class="btn ghost sm" data-act="wxLocate">${ico('locate', 14)}Use my location</button><span class="hint">or type coordinates: 24.45, 54.38</span></div>
    ${S.res ? `<div class="wx-res">${S.res.map((r, i) => `<button type="button" data-act="wxPick" data-i="${i}"><b>${h(r.name)}</b><small>${h(r.sub || '')} · ${r.lat.toFixed(3)}, ${r.lon.toFixed(3)}</small></button>`).join('')}</div>` : ''}
    ${WX.blocked && S.q && !WX.parseLatLon(S.q) ? `<button type="button" class="btn sm" data-act="wxNameOnly">Use “${h(S.q)}” as the place name</button>` : ''}` : ''}
    ${S.err ? `<div class="note warn">${h(S.err)}</div>` : ''}`, { right: W.fetched ? `<span class="tag">updated ${h(W.fetched)}</span>` : '' });
  out += grp('Lift window', `<div class="row"><label class="f" for="wxDate"><span class="fl">Date</span>${days.length ? `<select id="wxDate" data-k="weather.date" data-re="1">${days.map(d => `<option value="${d}"${d === W.date ? ' selected' : ''}>${new Date(d + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}</option>`).join('')}</select>` : `<input type="date" id="wxDate" data-k="weather.date" value="${h(W.date || '')}">`}</label>
    ${F.text('weather.start', 'Start', { type: 'time' })}</div><div class="row">${F.num('weather.hours', 'Duration', 'h', { min: 1, max: 12 })}${F.num('weather.limit', 'Permitted wind', 'm/s')}</div>
    <p class="hint">Use the permitted wind speed from the crane's load chart for this configuration (often 9–14 m/s). Gusts at the boom tip are checked against it.</p>`);
  if (W.hourly) {
    out += grp('Forecast', `${wx ? `<div class="wx-sum"><div class="${wx.maxG > wx.limit ? 'fail' : wx.maxG > wx.limit * 0.8 ? 'warn' : ''}"><span>Gust @ tip</span><b>${fmt(wx.maxG)}<small> m/s</small></b></div><div><span>Wind @ tip</span><b>${fmt(wx.maxW)}<small> m/s</small></b></div><div class="${wx.rain >= 60 ? 'warn' : ''}"><span>Rain</span><b>${wx.rain}<small>%</small></b></div><div class="${wx.storm ? 'fail' : ''}"><span>Outlook</span><b style="font-size:11px">${h(wx.outlook || '—')}</b></div></div>
      <div class="note ${wx.status === 'fail' ? 'fail' : wx.status === 'warn' ? 'warn' : ''}"><b>${wx.status === 'fail' ? 'Do not lift.' : wx.status === 'warn' ? 'Marginal.' : 'Within limits.'}</b> ${h(wx.msgs.join(' · '))}</div>` : '<p class="hint">No hours in the lift window — check the date and start time.</p>'}
      ${WX.chart(W, tipH, { pick: true })}
      <div class="wx-legend"><span><i></i>wind @ ${Math.round(tipH)} m</span><span><i class="g"></i>gust</span><span><i class="r"></i>rain chance</span><span><i class="l"></i>limit</span></div>
      <p class="hint">Tap an hour on the chart to move the lift window. Wind is scaled from the 10/80/120/180 m forecast levels to the boom tip.</p>`, { right: `<button type="button" class="btn ghost xs" data-act="wxFetch"${S.busy ? ' disabled' : ''}>${ico('refresh', 13)}${S.busy ? 'Loading…' : 'Refresh'}</button>` });
  } else if (W.lat != null) out += grp('Forecast', `<button type="button" class="btn wide" data-act="wxFetch"${S.busy ? ' disabled' : ''}>${ico('refresh', 15)}${S.busy ? 'Loading the forecast…' : 'Get the hourly forecast'}</button>`);
  out += grp(W.hourly ? 'Override by hand' : 'Forecast by hand', `<div class="row">${F.num('weather.manual.wind', 'Wind at 10 m', 'm/s')}${F.num('weather.manual.gust', 'Gust at 10 m', 'm/s')}</div><div class="row">${F.num('weather.manual.rain', 'Rain chance', '%')}${F.text('weather.manual.note', 'Outlook', { ph: 'Clear' })}</div>
    <p class="hint">${W.hourly ? 'Only used if you clear the live forecast.' : `Values at 10 m from any forecast — scaled to the ${Math.round(tipH)} m boom tip for the check.`}${W.lat != null ? ` <a href="${WX.windyUrl(+W.lat, +W.lon)}" target="_blank" rel="noopener" style="color:var(--cyan)">Open Windy for this spot ↗</a>` : ''}</p>
    ${WX.blocked && !W.hourly ? `<div class="note">${h(WX_BLOCKED)}</div>` : ''}`);
  out += grp('On the sheet', `<label class="check"><input type="checkbox" class="tog" data-k="weather.print" data-bool="1"${W.print !== false ? ' checked' : ''}><span>Print the weather table on the sheet</span></label>
    <div class="actions">${W.hourly ? '<button type="button" class="btn ghost sm" data-act="wxClearLive">Clear live forecast</button>' : ''}<button type="button" class="btn ghost sm danger" data-act="wxOff">Remove weather from this plan</button></div>
    <p class="hint">Forecasts are a planning aid. On the day the crane's anemometer and the lift supervisor decide.</p>`);
  return out;
}

// ----- SHEET -----
function layoutIcon(v) {
  const boom = (x, y, L, a) => { const r = a * Math.PI / 180, bx = x + L * Math.cos(r), by = y - L * Math.sin(r); return `<path d="M${x - 4} ${y}h9M${x} ${y - 1}L${bx.toFixed(1)} ${by.toFixed(1)}v${(y - by) * 0.55}" class="ib"/><rect x="${(bx - 1.6).toFixed(1)}" y="${(by + (y - by) * 0.55).toFixed(1)}" width="3.2" height="2.4" class="il"/>`; };
  const tb = '<rect x="71" y="2" width="11" height="55" class="it"/>';
  const g = { chart: `<path d="M38 2v55M2 30h36" class="ig"/><path d="M6 8h28M6 12h28M6 16h28M6 20h28M6 24h20" class="iq"/>${boom(46, 50, 26, 52)}`, full: boom(12, 52, 44, 50), elev2: `<path d="M36 2v55" class="ig"/>${boom(8, 50, 24, 55)}${boom(42, 50, 24, 48)}`, rigging: `<path d="M44 2v55" class="ig"/>${boom(8, 50, 30, 52)}<path d="M57 14l-6 16M57 14l6 16M49 30h16" class="ib"/><rect x="49" y="30" width="16" height="7" class="il"/>` }[v] || '';
  return `<svg class="lt-ico" viewBox="0 0 84 59" aria-hidden="true"><rect x="0.5" y="0.5" width="83" height="58" class="if"/>${tb}${g}</svg>`;
}
const SR_SEC = { crane: 'Crane data', load: 'Load data', extra: 'Extras' };
const SR_HELP = { 'load.daf': 'only when a DAF is switched on (Lift → DAF)', 'load.design': 'total × DAF', 'load.cont': 'only when contingency is on', 'load.angle': 'off by default', 'load.tipH': 'off by default', 'load.hookH': 'off by default', 'crane.tele': 'only when sections are set by hand', 'load.rig': 'only with 2+ cranes', 'extra.tacklesList': 'only when the lift has tackles' };
function sheetRowsUI() {
  const p = state.plan; const R = p.sheetRows || { custom: [] };
  const box = Object.entries(SHEET_ROWS).map(([sec, rows]) => `<div class="sr-sec"><span class="sr-h">${SR_SEC[sec]}</span><div class="sr-chips">${rows.map(([k, lab]) => { const key = sec + '.' + k; const on = sheetRowOn(p, key); return `<label class="sr-chip${on ? ' on' : ''}" title="${h(SR_HELP[key] || 'Tap to show or hide this row on the sheet')}"><input type="checkbox" data-sr="${key}"${on ? ' checked' : ''}><span>${h(lab)}</span></label>`; }).join('')}</div></div>`).join('');
  const L = p.loads || [];
  const secOpts = (c) => [['crane', 'Crane data'], ['load', 'Every load'], ...L.map((_, i) => ['load' + i, 'Load ' + (i + 1) + ' only']), ['extra', 'Own block']].map(([v, t]) => { const cur = c.sec === 'load' ? (c.load === '' || c.load == null ? 'load' : 'load' + c.load) : c.sec; return `<option value="${v}"${cur === v ? ' selected' : ''}>${h(t)}</option>`; }).join('');
  const custom = (R.custom || []).map((c, i) => `<div class="sr-row"><input type="text" data-k="sheetRows.custom.${i}.label" value="${h(c.label || '')}" placeholder="Label — e.g. LIFT SUPERVISOR" aria-label="Row ${i + 1} label"><input type="text" data-k="sheetRows.custom.${i}.value" value="${h(c.value || '')}" placeholder="Value" aria-label="Row ${i + 1} value"><select data-srsec="${i}" aria-label="Row ${i + 1} goes in">${secOpts(c)}</select><button type="button" class="tk-b" data-act="srDel" data-i="${i}" aria-label="Remove row ${i + 1}">${ico('x', 12)}</button></div>`).join('');
  return `<p class="hint">Tap a row to hide or show it on the A1 sheet. Lit = printed.</p>${box}
    <div class="sr-sec"><span class="sr-h">Your own rows</span>${custom ? `<div class="sr-list">${custom}</div>` : '<p class="hint">Need something else on the sheet — permit number, banksman, ground bearing? Add your own row.</p>'}
    <button type="button" class="btn sm" data-act="srAdd">${ico('plus', 13)}Add a row</button></div>`;
}
function secSheet() {
  const p = state.plan; const L = p.loads;
  const layouts = [['chart', 'Chart + elevation', 'Load chart, crane dims, overview'], ['full', 'Full elevation', 'One big overview'], ['elev2', 'Two elevations', 'Load 1 and 2 side by side'], ['rigging', 'Elevation + rigging', 'Sling tension detail']];
  const locked = !!(p.sheetView && p.sheetView.x1 > p.sheetView.x0);
  return grp('Layout', `<div class="ltiles" role="radiogroup">${layouts.map(([v, a, b]) => `<button type="button" role="radio" class="lt" data-act="layout" data-v="${v}" aria-checked="${p.layout === v}">${layoutIcon(v)}<b>${a}</b><small>${b}</small></button>`).join('')}</div>
      <div class="sub"><div class="gh"><h3>Elevation framing</h3></div><p class="hint">${locked ? 'The sheet uses the area you framed on the canvas.' : 'The sheet fits the crane, load and site automatically.'}</p>
        <div class="actions"><button type="button" class="btn sm" data-act="lockView">${locked ? 'Re-frame from the current view' : 'Use the current elevation view'}</button>${locked ? '<button type="button" class="btn ghost sm" data-act="unlockView">Back to auto</button>' : ''}</div></div>
      <button type="button" class="btn ghost sm" data-view-go="sheet">Preview the A1 sheet</button>`)
    + grp('What prints in the data panel', sheetRowsUI(), { right: `<button type="button" class="btn ghost xs" data-act="srReset">Reset</button>` })
    + grp('Outrigger ground pressure', `<label class="check">${F.tog('outrigger.enabled', { re: 1, label: 'Ground pressure table' })}<span>Add the outrigger pressure table</span></label>
      ${p.outrigger?.enabled ? `<div class="row">${F.num('outrigger.maxLoad', 'Max outrigger load', 't', { ph: 'estimate' })}${F.text('outrigger.mat', 'Mat (L x W)', { ph: p.matSize || '2.5x2.5' })}</div>
      <div class="row">${F.num('outrigger.matSelf', 'Mat self weight', 't')}${F.num('outrigger.allow', 'Allowable bearing', 't/m²', { ph: 'not checked' })}</div>
      <p class="hint">Use the manufacturer's outrigger reaction (LICCON / Demag planner). Left blank it estimates ${Math.round(num(state.settings.outriggerFactor, .8) * 100)}% of crane mass + counterweight + lift — rough only.</p>` : ''}`)
    + grp('Rigging detail', `<label class="check">${F.tog('rigging.enabled', { re: 1, label: 'Sling tension' })}<span>Calculate sling tension (rigging layout)</span></label>
      ${p.rigging?.enabled ? `<div class="row r3">${F.sel('rigging.loadIdx', 'For load', L.map((l, i) => [i, 'Load ' + (i + 1)]), { numeric: 1 })}${F.num('rigging.legs', 'Legs', '')}${F.num('rigging.effLegs', 'Effective', '')}</div>
      <div class="row r3">${F.num('rigging.slingL', 'Sling length', 'm')}${F.num('rigging.spread', 'Spread', 'm')}${F.num('rigging.slingWLL', 'Sling WLL', 't')}</div>
      <div class="row">${F.num('rigging.shackleWLL', 'Shackle WLL', 't')}${F.text('rigging.slingDesc', 'Sling callout', { ph: "10m x 20t round sling - 4No's" })}</div>
      <div class="row r1">${F.text('rigging.shackleDesc', 'Shackle callout', { ph: "25t BOW SHACKLE - 4No's" })}</div>` : ''}`)
    + grp('Drawing history', `${(p.meta.revs || []).map((r, i) => `<div class="row r3">${F.text(`meta.revs.${i}.rev`, 'Rev')}${F.text(`meta.revs.${i}.desc`, 'Description')}${F.text(`meta.revs.${i}.date`, 'Date')}</div>`).join('') || '<p class="hint">No revisions yet — the table prints dashes.</p>'}
      <button type="button" class="btn sm" data-act="addRev">${ico('plus', 14)}Add revision</button>`)
    + grp('Notes', `<label class="f" for="f-extraNotes"><span class="fl">Extra general notes <em>one per line</em></span><textarea id="f-extraNotes" data-k="extraNotes" rows="4">${h(p.extraNotes || '')}</textarea></label>`)
    + grp('Export', `<div class="actions"><button type="button" class="btn primary" data-top="pdf">${ico('dl', 15)}PDF · A1</button><button type="button" class="btn" data-top="pdfA3">PDF · A3</button><button type="button" class="btn" data-top="dxf">DXF for AutoCAD</button><button type="button" class="btn ghost" data-top="svg">SVG</button></div>
      <p class="hint">The DXF is the whole sheet in model space with the elevation at true size — SAVEAS .dwg in AutoCAD.</p>`);
}

// ---------- console: see deck.js (cab control deck) ----------
function bindTeleTracks(root) {
  for (const t of $$('.ttrack', root)) {
    const i = +t.dataset.ti;
    let lastF = null;
    const setFrom = (e) => { const r = t.getBoundingClientRect(); const f = Math.round(Math.max(0, Math.min(1, (r.bottom - e.clientY) / r.height)) * 20) / 20; if (f === lastF) return; lastF = f; teleSetSection(i, f, { live: true }); };
    t.addEventListener('pointerdown', (e) => { if (state.calc?.loads?.[activeLi()]?.tele?.locked) { toast('This jib chart fixes the boom length'); return; } lastF = null; t.setPointerCapture(e.pointerId); t.classList.add('drag'); setFrom(e); e.preventDefault(); });
    t.addEventListener('pointermove', (e) => { if (t.hasPointerCapture && t.hasPointerCapture(e.pointerId)) setFrom(e); });
    const end = () => { if (!t.classList.contains('drag')) return; t.classList.remove('drag'); draft(); if (state.sec === 'crane') renderDrawer(); };
    t.addEventListener('pointerup', end); t.addEventListener('pointercancel', end);
    t.addEventListener('keydown', (e) => { const d = { ArrowUp: 0.05, ArrowRight: 0.05, ArrowDown: -0.05, ArrowLeft: -0.05, PageUp: 0.25, PageDown: -0.25 }[e.key]; if (d == null) return; e.preventDefault(); const cur = state.calc?.loads?.[activeLi()]?.tele?.fr?.[i] ?? 0; teleSetSection(i, Math.max(0, Math.min(1, cur + d))); });
  }
}
function teleFr() { const r = state.calc?.loads?.[activeLi()]; return (r?.tele?.fr || []).slice(); }
function teleSetSection(i, f, o = {}) {
  const p = state.plan; const fr = teleFr(); if (!fr.length) return;
  if (p.tele?.mode !== 'manual') toast('Manual telescoping — each section set by hand');
  fr[i] = f; p.tele = { mode: 'manual', fr: fr.map(v => Math.round(v * 100) / 100) }; p.boomOverride = '';
  refresh(true); markDirty();
  if (state.sec === 'crane') { if (o.live) teleDrawerSync(); else renderDrawer(); }
}
function teleDrawerSync() { // update the drawer's telescope readouts in place, so a slider being dragged stays alive
  const r = state.calc?.loads?.[activeLi()]; if (!r) return; const spec = r.spec, tele = r.tele;
  const fig = $('#drBody .tele-fig'); if (fig) fig.outerHTML = teleFigure(spec, tele);
  $$('#drBody [data-tsec]').forEach(inp => { const k = +inp.dataset.tsec; const f = tele.fr[k] ?? 0; if (inp !== document.activeElement) inp.value = Math.round(f * 100); const out = inp.nextElementSibling; if (out) out.innerHTML = `${Math.round(f * 100)}%<small> · ${fmt(f * spec.E, 1)} m</small>`; });
  const tg = $('#drBody .tele-fig')?.closest('.grp')?.querySelector('.gh .tag'); if (tg) tg.textContent = `${tele.mode === 'manual' ? 'MANUAL' : 'AUTO'} · ${fmt(tele.L, 2)} m`;
  syncRanges($('#drBody'));
}
function teleMode(m) {
  const p = state.plan; const r = state.calc?.loads?.[activeLi()]; if (!r || r.tele?.locked) return;
  if (m === 'manual') p.tele = { mode: 'manual', fr: r.tele.fr.map(v => Math.round(v * 100) / 100) };
  else { const L = r.tele.L; p.tele = { mode: 'auto', fr: [] }; setBoomLength(L, true); }
  renderDrawer(); refresh(true); markDirty();
}
function telePreset(v) {
  const p = state.plan; const r = state.calc?.loads?.[activeLi()]; if (!r || r.tele?.locked) return; const n = r.spec.tele;
  let fr;
  if (v === 'even') fr = r.tele.mode === 'manual' ? Array(n).fill(r.tele.fr.reduce((a, b) => a + b, 0) / n) : r.tele.fr.slice();
  else if (v === 'seq') { let tot = r.tele.fr.reduce((a, b) => a + b, 0); fr = Array(n).fill(0); for (let i = 0; i < n && tot > 0; i++) { fr[i] = Math.min(1, tot); tot -= fr[i]; } }
  else fr = Array(n).fill(+v);
  p.tele = { mode: 'manual', fr: fr.map(x => Math.round(x * 100) / 100) }; p.boomOverride = '';
  renderDrawer(); refresh(true); markDirty();
}
function setBoomLength(L, quiet) { // auto mode: snap to a chart column when close, otherwise an override length
  const p = state.plan; const { crane, ch, parsed } = curChart(); const spec = boomSpec(crane, chartLengths(crane)); L = Math.max(spec.Lmin, Math.min(spec.Lmax, r2(L)));
  if (parsed && (!ch.kind || ch.kind === 'main')) {
    const curLab = parsed.cols[+p.colIdx]?.label || ''; let best = -1, bd = 1e9;
    parsed.cols.forEach((c, i) => { const d = Math.abs(c.L - L) + ((c.label || '') === curLab ? 0 : 0.01); if (d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd < 0.45) { p.colIdx = best; p.boomOverride = ''; return parsed.cols[best].L; }
  }
  p.boomOverride = L; return L;
}

// ---------- inspector ----------
function gaugeSVG(u, S) {
  const W = 260, H = 150, cx = 130, cy = 128, R = 104; const a0 = 200, a1 = -20; const vmax = 120;
  const ang = (v) => (a0 + (a1 - a0) * Math.max(0, Math.min(vmax, v)) / vmax) * Math.PI / 180;
  const pt = (v, r) => [cx + r * Math.cos(ang(v)), cy - r * Math.sin(ang(v))];
  const arc = (v0, v1, r) => { const [x0, y0] = pt(v0, r), [x1, y1] = pt(v1, r); const large = Math.abs((v1 - v0) / vmax * (a0 - a1)) > 180 ? 1 : 0; return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
  const warn = num(S.utilWarn, 100), mx = num(S.utilMax, 100); const st = u == null ? 'none' : u > mx ? 'fail' : u > warn ? 'warn' : 'ok'; const col = { ok: '#2fe08a', warn: '#ffb81c', fail: '#ff4b4b', none: '#4a5560' }[st];
  const out = [`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Utilisation ${u != null ? u.toFixed(1) : 'unknown'} percent"><defs><filter id="gglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.2"/></filter></defs>`];
  out.push(`<path d="${arc(0, vmax, R)}" stroke="#182029" stroke-width="12" fill="none"/>`);
  out.push(`<path d="${arc(0, Math.min(warn, vmax), R + 11)}" stroke="rgba(47,224,138,.35)" stroke-width="2" fill="none"/><path d="${arc(Math.min(warn, vmax), Math.min(mx, vmax), R + 11)}" stroke="rgba(255,184,28,.5)" stroke-width="2" fill="none"/><path d="${arc(Math.min(mx, vmax), vmax, R + 11)}" stroke="rgba(255,75,75,.6)" stroke-width="2" fill="none"/>`);
  for (let v = 0; v <= vmax; v += 5) { const [x0, y0] = pt(v, R - 9), [x1, y1] = pt(v, R - (v % 25 === 0 ? 17 : 12)); out.push(`<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${v % 25 === 0 ? '#6b7783' : '#34414e'}" stroke-width="${v % 25 === 0 ? 1.4 : 1}"/>`); if (v % 25 === 0 && v <= 100) { const [tx, ty] = pt(v, R - 27); out.push(`<text x="${tx.toFixed(1)}" y="${(ty + 3).toFixed(1)}" fill="#6b7783" font-size="8.5" font-family="Martian Mono, monospace" text-anchor="middle">${v}</text>`); } }
  const [mx0, my0] = pt(100, R - 8), [mx1, my1] = pt(100, R + 15); out.push(`<line x1="${mx0.toFixed(1)}" y1="${my0.toFixed(1)}" x2="${mx1.toFixed(1)}" y2="${my1.toFixed(1)}" stroke="#ff4b4b" stroke-width="2"/>`);
  if (u != null && u > 0) { out.push(`<path d="${arc(0, u, R)}" stroke="${col}" stroke-width="12" fill="none" filter="url(#gglow)" opacity=".6"/><path d="${arc(0, u, R)}" stroke="${col}" stroke-width="12" fill="none"/>`); const [nx, ny] = pt(u, R); out.push(`<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="4" fill="#0b0f14" stroke="${col}" stroke-width="2"/>`); }
  out.push('</svg>'); return { svg: out.join(''), st };
}
function renderInspector() {
  const el = $('#inspIn'); if (!el || !state.calc) return;
  const calc = state.calc, S = settingsEff(), li = activeLi(), r = calc.loads[li], g = r?.geo || {}; const { ch } = loadCol(li);
  const { svg, st } = gaugeSVG(r?.util, S);
  const items = []; calc.loads.forEach((x, i) => x.checks.forEach(c => items.push({ ...c, t: (calc.loads.length > 1 ? `L${i + 1} · ` : '') + c.t })));
  if (calc.ground) items.push({ s: calc.ground.status, t: 'Ground pressure', m: `${calc.ground.press.toFixed(2)} t/m² (${calc.ground.P.toFixed(1)} t${calc.ground.est ? ' est.' : ''} + mat ${calc.ground.self} t over ${calc.ground.area} m²)` + (calc.ground.allow ? ` vs ${calc.ground.allow} t/m² allowed` : ' — enter the allowable bearing to check') });
  if (calc.rig) items.push({ s: calc.rig.status, t: 'Rigging', m: `${calc.rig.T.toFixed(2)} t per leg at ${calc.rig.alpha.toFixed(1)}° from vertical` + (calc.rig.alpha > 45 ? ' — over 45°, use longer slings or a spreader' : '') });
  if (calc.weather) items.push({ s: calc.weather.status, t: 'Weather', m: calc.weather.msgs.join(' · ') });
  const rank = { fail: 0, warn: 1, info: 2, ok: 3 }; items.sort((a, b) => (rank[a.s] ?? 4) - (rank[b.s] ?? 4));
  const nf = items.filter(c => c.s === 'fail').length, nw = items.filter(c => c.s === 'warn').length;
  const TIP = { Radius: 'How far the hook is from the centre of the crane', 'Boom angle': 'How steep the boom is (0° flat, ~84° nearly upright)', 'Jib angle': 'How steep the luffing jib is', Boom: 'Telescoped boom length', 'Main + jib': 'Main boom + jib length', 'Tip height': 'Top of the boom above the ground', Clearance: 'Gap between the boom and the nearest building edge', 'Hook height': 'Where the hook sits when the load is landed', Counterweight: 'Weight on the back of the crane that stops it tipping', Telescope: 'How the boom sections slide out', 'Wind @ tip': 'Strongest gust up at the boom top in the lift window', 'Sling / leg': 'Pull in each sling leg' };
  const cell = (k, v, u, cls = '') => `<div class="${cls}" title="${h(TIP[k] || '')}"><span>${k}</span><b>${v}${u ? `<small>${u}</small>` : ''}</b></div>`;
  const slT = r?.sling ? r.sling.T : r?.stack ? Math.max(0, ...r.stack.items.filter(t => t.T != null).map(t => t.T)) || null : null;
  const wx = calc.weather;
  el.innerHTML = `<div class="gauge ${st}">${svg}<div class="g-n"><b>${r?.util != null ? r.util.toFixed(1) : '—'}<small>%</small></b><span title="How much of the crane's capacity this lift uses — under 75 % is comfortable, over 100 % is a no">Utilisation${calc.loads.length > 1 ? ' · lift ' + (li + 1) : ''}</span></div><div class="g-sub"><span>load <b>${r ? r.total.toFixed(2) : '—'} t</b></span><span>chart <b>${r?.cap != null ? r.cap.toFixed(2) : '—'} t</b></span></div></div>
    <div class="verdict ${calc.status}"><i></i>${calc.status === 'fail' ? 'Not acceptable as drawn' : calc.status === 'warn' ? 'Critical — AP sign-off' : 'All checks pass'}<small>${items.length} checks</small></div>
    <div class="rdo">${cell('Radius', r ? r.R.toFixed(2) : '—', 'm')}${cell(g.kind === 'luffing' ? 'Jib angle' : 'Boom angle', g.tip ? (g.kind === 'luffing' ? g.gamma : g.theta).toFixed(1) : '—', '°', g.ok === false ? 'fail' : '')}
      ${cell(g.kind === 'main' ? 'Boom' : 'Main + jib', g.kind === 'main' ? fmt(g.L, 2) : `${fmt(g.Lb, 1)}+${fmt(g.Lj, 1)}`, 'm')}${cell('Tip height', fmt(r?.tipY, 2), 'm', r?.tipY != null && r.tipY < r.reqTipY ? 'fail' : '')}
      ${cell('Clearance', r?.clearance != null ? r.clearance.toFixed(2) : '—', 'm', r?.clearance != null ? (r.clearance <= 0 ? 'fail' : r.clearance < num(S.minClearance, 1) ? 'warn' : '') : '')}${cell('Hook height', fmt(r?.hookY, 2), 'm')}
      ${cell('Counterweight', fmt(num(state.plan.cwt !== '' && state.plan.cwt != null ? state.plan.cwt : (r?.chartDef?.cwt ?? calc.crane.cwt)), 1), 't')}${cell('Telescope', r?.tele ? (r.tele.locked ? 'jib chart' : r.tele.mode === 'manual' ? 'manual' : 'auto') : '—', '')}
      ${cell('Wind @ tip', wx ? fmt(wx.maxG, 1) : '—', wx ? 'm/s' : '', wx ? (wx.maxG > wx.limit ? 'fail' : wx.maxG > wx.limit * 0.8 ? 'warn' : '') : '')}${cell('Sling / leg', slT != null ? slT.toFixed(2) : '—', slT != null ? 't' : '')}</div>
    <div class="isec"><div class="isec-h"><h4>Checks</h4><span>${nf ? nf + ' fail' : ''}${nf && nw ? ' · ' : ''}${nw ? nw + ' warn' : ''}${!nf && !nw ? 'all clear' : ''}</span></div><ul class="cks">${items.map(c => `<li class="${c.s}"><i class="${c.s}"></i><div><b>${h(c.t)}</b><span>${h(c.m)}</span></div></li>`).join('')}</ul></div>
    <div class="isec"><div class="isec-h"><h4>Weather</h4><span>${wx ? h(wx.date || '') : ''}</span></div></div>
    ${wx ? `<button type="button" class="wxm" data-sec-go="weather"><div class="wxm-h"><span>${WX.icon(wx.storm ? 95 : wx.rain >= 60 ? 61 : 1, 15)} ${h(wx.place || 'Lift site')}</span><small>${h(wx.start || '')}${wx.hours ? ' +' + wx.hours + 'h' : ''}</small></div>
      <div class="wbar ${wx.status}"><i style="width:${Math.min(100, wx.maxG / Math.max(1, wx.limit * 1.3) * 100).toFixed(1)}%"></i><b style="left:${(100 / 1.3).toFixed(1)}%"></b></div>
      <div class="wxm-r"><span>gust <b>${fmt(wx.maxG)}</b> / ${fmt(wx.limit)} m/s</span><span>rain <b>${wx.rain}%</b></span></div></button>`
      : `<button type="button" class="wxm empty" data-sec-go="weather">${WX.icon(2, 15)} No forecast yet — add the lift location to check wind and rain.</button>`}
    <p class="hint" style="padding:12px 16px 0">Library data. The Appointed Person verifies every plan before issue.</p>`;
}

// ---------- top bar + rail badges ----------
function updateTop() {
  const calc = state.calc; if (!calc) return; const li = activeLi(), r = calc.loads[li];
  const st = $('#stChip'); if (st) { st.className = 'chip st ' + calc.status; st.innerHTML = `<i class="led"></i><span class="num">${r?.util != null ? r.util.toFixed(1) + '%' : '—'}</span><span>${calc.status === 'fail' ? 'FAIL' : calc.status === 'warn' ? 'CRITICAL' : 'OK'}</span>`; }
  const wc = $('#wxChip'); if (wc) { const wx = calc.weather; wc.className = 'chip ' + (wx ? wx.status : ''); wc.innerHTML = wx ? `${WX.icon(wx.storm ? 95 : wx.rain >= 60 ? 61 : 1, 15)}<span class="num">${fmt(wx.maxG)} m/s</span><span class="wx-t">${wx.rain}% rain</span>` : `${WX.icon(2, 15)}<span class="wx-t">Add forecast</span>`; }
  const sev = (list) => list.some(c => c.s === 'fail') ? 'fail' : list.some(c => c.s === 'warn') ? 'warn' : 'ok';
  const all = calc.loads.flatMap(x => x.checks);
  const bd = { crane: sev(all.filter(c => /Geometry|Load chart|Chart capacity/.test(c.t))), lift: sev(all.filter(c => /Capacity|Headroom|Sling/.test(c.t))), site: sev(all.filter(c => /clearance/i.test(c.t))), weather: calc.weather ? calc.weather.status : 'ok', sheet: calc.ground ? (calc.ground.status === 'info' ? 'ok' : calc.ground.status) : 'ok', job: 'ok' };
  for (const [k, s] of Object.entries(bd)) { const b = $('#bdg-' + k); if (b) b.className = 'bdg ' + s; }
}

// ---------- HUD ----------
function hudTools() {
  const el = $('#hudTools'); if (!el) return;
  const mv = `<select class="hb mv-sw" id="mvSw" aria-label="View">${[['elev', 'Elevation'], ['plan', 'Site plan'], ['3d', '3D'], ['sheet', 'Sheet']].map(([k, t]) => `<option value="${k}"${state.view === k ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
  if (state.view === 'sheet' || state.view === '3d') { el.innerHTML = mv; $('#selPop')?.remove(); return; }
  const sel = state.view === 'elev' ? /^obj:(\d+)$/.exec(state.sel || '') : null; const i = sel ? +sel[1] : -1; const o = sel ? state.plan.site.obstacles[i] : null;
  el.innerHTML = `${mv}<details class="menu" id="addMenu"><summary class="hb" title="Add an object" aria-label="Add an object to the site">${ico('plus', 14)}<span class="lbl">Add</span></summary><div class="menu-pop left">${state.view === 'elev' ? Object.entries(OBJ_TYPES).map(([k, t]) => `<button type="button" data-act="addObj" data-type="${k}">${objIcon(k)}${h(t.label)}</button>`).join('') + '<hr>' : ''}<button type="button" data-act="importEnv">${ico('file', 18)}Client drawing…</button></div></details>
    <button type="button" class="hb" data-act="measure" aria-pressed="${Scene.tool?.kind === 'measure'}" title="Measure (M)" aria-label="Measure a distance">${ico('measure', 14)}<span class="lbl">Measure</span></button>
    ${o ? `<span class="selchip"><span>${objIcon(o.type)}${h(o.label || OBJ_TYPES[o.type]?.label)}</span><button type="button" data-act="selEdit" aria-expanded="${!!state.selEdit}">Edit</button><button type="button" data-act="dupSel" title="Duplicate">${ico('copy', 13)}</button><button type="button" data-act="delSel" aria-label="Delete selected">${ico('trash', 13)}</button></span>` : ''}`;
  $('#selPop')?.remove();
  if (o && state.selEdit) { const pop = document.createElement('div'); pop.className = 'selpop'; pop.id = 'selPop'; pop.innerHTML = objFields(o, i) + `<p class="hint">Arrow keys nudge 0.1 m (Shift = 1 m). Drag the corner handle to resize.</p>`; $('#cv').appendChild(pop); }
}
function hudView() {
  const el = $('#hudView'); if (!el) return;
  const insp = `<button type="button" class="hb insp-tg" data-act="inspTg" title="Status panel" aria-label="Show the lift status panel">${ico('panel', 14)}</button>`;
  if (state.view === '3d') { el.innerHTML = `<span class="hgrp hide-m"><button type="button" class="hb" data-act="tw" data-v="iso">Iso</button><button type="button" class="hb" data-act="tw" data-v="side">Side</button><button type="button" class="hb" data-act="tw" data-v="top">Top</button></span><span class="hgrp"><button type="button" class="hb" data-act="twZoom" data-v="0.8" aria-label="Zoom out">−</button><button type="button" class="hb" data-act="twFit">Fit</button><button type="button" class="hb" data-act="twZoom" data-v="1.25" aria-label="Zoom in">+</button></span>${insp}`; return; }
  el.innerHTML = `${state.view !== 'sheet' ? `<button type="button" class="hb hide-m" data-act="theme" title="${Scene.dark ? 'Paper canvas' : 'Night canvas'}" aria-label="${Scene.dark ? 'Switch to the paper canvas' : 'Switch to the night canvas'}">${ico(Scene.dark ? 'sun' : 'moon', 14)}</button>` : ''}<span class="hgrp"><button type="button" class="hb" data-act="zoomOut" aria-label="Zoom out">−</button><button type="button" class="hb" data-act="fit">Fit</button><button type="button" class="hb" data-act="zoomIn" aria-label="Zoom in">+</button></span><span class="hscale hide-m" id="hudScale"></span>${insp}`;
}

// ---------- refresh ----------
let refreshT;
function refresh(immediate) {
  if (!state.started) return;
  clearTimeout(refreshT);
  const run = () => {
    const S = settingsEff();
    let calc; try { calc = computePlan(state.plan, cranes(), S); } catch (e) { console.error(e); return; }
    state.calc = calc; state._sheet = null;
    try { renderInspector(); } catch (e) { console.error(e); }
    try { renderConsole(); } catch (e) { console.error(e); }
    updateTop();
    liftPosSync();
    const so = $('#slingOut'); if (so) { const r = calc.loads[activeLi()]; so.innerHTML = r?.sling ? `<b>${r.sling.T.toFixed(2)} t</b> per leg${r.sling.rigH != null ? ` · rig height ${r.sling.rigH.toFixed(2)} m` : ''}` : 'Pick a method or a sling length to check the tension.'; }
    if (state.view === '3d') twinUpdate(); else sceneDirty();
    draft();
  };
  if (immediate) run(); else refreshT = setTimeout(run, 60);
}

// ---------- actions ----------
function setPosition(li, v) { const l = state.plan.loads[li]; if (!(v > 0) && l.by !== 'angle') return; if (l.by === 'angle') l.angle = r2(v); else l.R = r2(v); refresh(true); syncDrawer(); markDirty(); }
function setBy(li, by) {
  const l = state.plan.loads[li]; if (l.by === by) return; const res = state.calc?.loads?.[li]; const { ch } = loadCol(li);
  if (by === 'angle') { l.angle = res?.geo?.tip ? Math.round(currentAngle(res, ch) * 10) / 10 : 60; l.by = 'angle'; }
  else if (by === 'height') { l.tipH = res?.geo?.tip ? r2(res.tipY) : 20; l.by = 'height'; }
  else { l.R = res ? r2(res.R) : l.R; l.by = 'radius'; }
  renderDrawer(); refresh(true);
}
function setCrane(id) {
  const p = state.plan; const c = cranes().find(x => x.id === id); if (!c) return;
  p.craneId = id; state.chartFilter = ''; p.chartIdx = c.charts?.length ? 0 : -1; p.colIdx = 0; p.loads.forEach(l => { l.colIdx = ''; l.hb = c.hookBlock ?? l.hb; }); p.cwt = null; p.config = null; p.outriggerTxt = ''; p.boomOverride = ''; p.tele = { mode: 'auto', fr: [] };
  const av = c.acc || ['flyjib']; if (p.attach?.type === 'luff' && !av.includes('luffing')) p.attach.type = 'none'; if (p.attach?.type === 'fly' && !av.includes(p.attach.ext ? 'extension' : 'flyjib')) p.attach.type = 'none';
  // pick a set-up that actually reaches the lift: the shortest boom on the first main chart that covers this radius,
  // else any main chart that does; if nothing reaches, the longest boom so the drawing shows how far short it is
  const R = num(p.loads[activeLi()]?.R, 10); let found = false;
  const charts = c.charts || [];
  for (const ci0 of charts.map((_, i) => i).filter(i => !charts[i].kind || charts[i].kind === 'main')) {
    const pr = getChart(charts[ci0]); if (!pr) continue;
    const i = pr.cols.findIndex((_, ci) => lookupCap(pr, ci, R).cap != null);
    if (i >= 0) { p.chartIdx = ci0; p.colIdx = i; found = true; break; }
  }
  if (!found) {
    const pr = charts[0] ? getChart(charts[0]) : null;
    if (pr && pr.cols.length) { p.colIdx = pr.cols.length - 1; if (charts.length) setTimeout(() => toast(`${c.model}: no chart reaches ${fmt(R, 1)} m — showing its longest boom. Bring the radius in.`), 0); }
    else if (!charts.length) { const sp = boomSpec(c, []); p.boomOverride = r2(Math.max(sp.Lmin, Math.min(sp.Lmax, R / Math.cos(55 * Math.PI / 180) + 1))); }
  }
  Scene.views = {}; if (state.twin) state.twin.reframe();
}
function accToggle(k, on) {
  const p = state.plan; const crane = curCrane(); const at = p.attach || (p.attach = { type: 'none' });
  if (k === 'flyjib' || k === 'extension') { if (on) { const [a, b] = jibRange(crane, 'fly'); p.attach = { ...at, type: 'fly', ext: k === 'extension', jibLen: Math.round(Math.max(a, Math.min(b, num(at.type === 'fly' ? at.jibLen : a + (b - a) * 0.4, a))) * 2) / 2, offset: k === 'extension' ? 0 : (at.type === 'fly' && !at.ext ? num(at.offset, 20) : 20) }; } else p.attach = { ...at, type: 'none' }; }
  else if (k === 'luffing') { if (on) { const [a, b] = jibRange(crane, 'luff'); p.attach = { ...at, type: 'luff', ext: false, jibLen: Math.round(Math.max(a, Math.min(b, num(at.type === 'luff' ? at.jibLen : a + (b - a) * 0.4, a))) * 2) / 2, boomAngle: num(at.boomAngle, 83) }; } else p.attach = { ...at, type: 'none' }; }
  else { p.acc = { ...(p.acc || {}), [k]: !!on }; }
  Scene.views.elev = null; if (state.twin) state.twin.reframe(); renderDrawer(); refresh(true); markDirty();
}
function addObject(type) {
  const p = state.plan; const t = OBJ_TYPES[type]; const site = p.site; const R = state.calc?.loads?.[activeLi()]?.R || 15;
  const ends = (site.obstacles || []).map(o => objExtent(site, o).x1); const x = Math.max(4, ...(ends.length ? ends.map(e => e + 1) : [R - t.w / 2]));
  const centred = ['towercrane', 'tower', 'tree', 'pole', 'person'].includes(type);
  const o = { type, x: r2(centred ? x + t.w / 2 : x), y: 0, w: t.w, h: t.h, label: '' };
  if (type === 'pole') o.label = 'POLE'; if (type === 'shed') o.label = 'SHED';
  if (type === 'towercrane') Object.assign(o, { mastW: 2, topH: 3, label: 'TOWER CRANE' });
  if (type === 'trailer') o.label = 'LOW-BED TRAILER'; if (type === 'container') o.size = '20'; if (type === 'building') o.label = 'BUILDING';
  site.obstacles.push(o); state.sel = 'obj:' + (site.obstacles.length - 1); Scene.sel = state.sel; state.selEdit = true;
  if (state.view !== 'elev') setView('elev');
  if (state.sec === 'site') renderDrawer(); hudTools(); refresh(true); markDirty();
  const vis = sceneVisible(); const ex = objExtent(site, o); if (ex.x0 < vis.x0 || ex.x1 > vis.x1) { sceneFit(); sceneDirty(); }
}
function selIndex() { const m = /^obj:(\d+)$/.exec(state.sel || ''); return m ? +m[1] : -1; }

// ---------- weather actions ----------
function wxEnsure() { const p = state.plan; if (!p.weather) p.weather = { limit: 9, start: '07:00', hours: 4, manual: {}, print: true }; return p.weather; }
async function wxSearch() {
  const q = (state.wx.q || '').trim(); if (!q) { state.wx.err = 'Type a place first.'; renderDrawer(); return; }
  state.wx.busy = true; state.wx.err = ''; state.wx.res = null; renderDrawer();
  try { const r = await WX.geocode(q); state.wx.res = r; if (!r.length) state.wx.err = 'No place found — try a nearby town or district, or type coordinates like 24.45, 54.38.'; else if (r.length === 1 && r[0].sub === 'Coordinates') { wxPick(r[0]); return; } }
  catch (e) { state.wx.err = e.blocked ? WX_BLOCKED : 'Search failed: ' + e.message; }
  finally { state.wx.busy = false; renderDrawer(); }
}
function wxPick(r) { const W = wxEnsure(); Object.assign(W, { place: r.name + (r.sub && r.sub !== 'Coordinates' ? ', ' + r.sub.split(',').pop().trim() : ''), lat: r.lat, lon: r.lon, tz: r.tz || '', hourly: null, fetched: '' }); state.wx.res = null; state.wx.editing = false; markDirty(); wxFetch(); }
async function wxFetch() {
  const W = wxEnsure(); if (W.lat == null) return; state.wx.busy = true; state.wx.err = ''; renderDrawer();
  try {
    const d = await WX.forecast(+W.lat, +W.lon); W.hourly = d.hourly; W.tz = d.tz || W.tz; W.fetched = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const days = WX.days(W); if (!W.date || !days.includes(W.date)) { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(state.plan.meta.date || ''); const pd = m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null; W.date = pd && days.includes(pd) ? pd : (days[1] || days[0]); }
    toast('Forecast loaded for ' + (W.place || 'the lift site'));
  } catch (e) { state.wx.err = e.blocked ? WX_BLOCKED : 'Forecast failed: ' + e.message; }
  finally { state.wx.busy = false; renderDrawer(); refresh(true); markDirty(); }
}
function wxLocate() {
  if (!navigator.geolocation) { state.wx.err = 'Location is not available in this browser — type the place instead.'; renderDrawer(); return; }
  state.wx.busy = true; renderDrawer();
  navigator.geolocation.getCurrentPosition((pos) => { state.wx.busy = false; wxPick({ name: 'Current location', sub: '', lat: pos.coords.latitude, lon: pos.coords.longitude }); },
    () => { state.wx.busy = false; state.wx.err = 'Location was not shared here — type the site or area instead.'; renderDrawer(); }, { timeout: 9000, maximumAge: 600000 });
}

// ---------- events ----------
function bindStudio() {
  const app = $('#app');
  app.addEventListener('input', (e) => {
    const t = e.target;
    if (t.type === 'range' && t.classList.contains('rg')) syncRanges(t.parentElement || app);
    if (t.id === 'planName') { state.plan.name = t.value; const f = $('#f-name'); if (f && f !== t) f.value = t.value; markDirty(); draft(); return; }
    if (t.id === 'chartFilter') { state.chartFilter = t.value; const c = curCrane(); const wrap = $('#f-chartIdx')?.closest('label'); if (wrap && c) { const tmp = document.createElement('div'); tmp.innerHTML = chartSelect(c.charts || [], +state.plan.chartIdx); wrap.replaceWith(tmp.firstElementChild); } return; }
    if (t.id === 'craneQ') { state.craneQ = t.value; const box = $('.cpick'); if (box) { const tmp = document.createElement('div'); tmp.innerHTML = cranePicker(state.plan.craneId); box.querySelector('.ctiles').replaceWith(tmp.querySelector('.ctiles')); } return; }
    if (t.id === 'wxQ') { state.wx.q = t.value; return; }
    if (t.id === 'conRange' || t.classList.contains('dl-rg') || t.classList.contains('dl-in')) return; // the cab deck handles its own controls
    if (t.id === 'posVal') { setPosition(+t.dataset.li, num(t.value)); return; }
    if (t.id === 'boomRange') { const L = setBoomLength(+t.value); refresh(true); markDirty(); const tg = t.closest('.grp')?.querySelector('.tag'); if (tg) tg.textContent = 'AUTO · ' + fmt(L, 2) + ' m'; const bo = $('#f-boomOverride'); if (bo && bo !== document.activeElement) bo.value = state.plan.boomOverride ?? ''; return; }
    if (t.dataset.tsec != null) { teleSetSection(+t.dataset.tsec, +t.value / 100, { live: true }); return; }
    if (t.id === 'loadPreset') return;
    const k = t.dataset.k; if (!k || !t.isConnected || t.tagName === 'SELECT' || t.dataset.re) return;
    setP(state.plan, k, t.dataset.bool ? t.checked : t.value);
    for (const tw of $$(`[data-k="${CSS.escape(k)}"]`, app)) if (tw !== t && tw.type !== 'checkbox') tw.value = t.value;
    if (k === 'name') $('#planName').value = t.value;
    markDirty(); refresh(/^env\.\d+\.(sc|rot|opacity)$/.test(k) || t.type === 'range');
  });
  app.addEventListener('change', (e) => {
    const t = e.target; if (!t.isConnected) return;
    if (t.id === 'mvSw') { setView(t.value); return; }
    if (t.dataset.acc) { accToggle(t.dataset.acc, t.checked); return; }
    if (t.id === 'loadPreset') { const l = state.plan.loads[+t.dataset.li]; const d = PRESET_DIMS[t.value] || ['box']; l.shape = d[0]; if (d[1]) { l.l = d[1]; l.h = d[2]; } renderDrawer(); refresh(true); markDirty(); return; }
    if (t.dataset.sr) { const R = state.plan.sheetRows = state.plan.sheetRows || { hide: {}, show: {}, custom: [] }; R.hide = R.hide || {}; R.show = R.show || {}; const k = t.dataset.sr;
      if (t.checked) { delete R.hide[k]; if (SHEET_ROWS_OFF[k]) R.show[k] = true; } else { if (SHEET_ROWS_OFF[k]) delete R.show[k]; else R.hide[k] = true; }
      t.closest('.sr-chip')?.classList.toggle('on', t.checked); markDirty(); refresh(true); return; }
    if (t.dataset.srsec != null) { const c = state.plan.sheetRows.custom[+t.dataset.srsec]; const v = t.value; if (v.startsWith('load')) { c.sec = 'load'; c.load = v === 'load' ? '' : +v.slice(4); } else { c.sec = v; c.load = ''; } markDirty(); refresh(true); return; }
    if (t.classList.contains('posIn')) { const v = num(t.value, NaN); if (isFinite(v)) setDial(t.dataset.dial, v); return; }
    if (/^loads\.\d+\.crane$/.test(t.dataset.k || '')) { setLoadRig(+t.dataset.k.split('.')[1], +t.value); renderDrawer(); refresh(true); markDirty(); return; }
    if (t.id === 'boomRange' || t.dataset.tsec != null) { renderDrawer(); return; }
    if (t.type === 'range' && /^attach\.|^acc\./.test(t.dataset.k || '')) { renderDrawer(); return; }
    const k = t.dataset.k; if (!k) return;
    let v = t.dataset.bool ? t.checked : t.value;
    if (t.tagName === 'SELECT' && t.dataset.num && v !== '') v = +v;
    if (k === 'boomOverride' && v !== '') { const sp = boomSpec(curCrane(), chartLengths(curCrane())); const L = Math.max(sp.Lmin, Math.min(sp.Lmax, num(v))); if (L !== num(v)) toast(`Boom limited to the real range ${fmt(sp.Lmin, 1)}–${fmt(sp.Lmax, 1)} m`); state.plan.tele = { mode: 'auto', fr: [] }; setBoomLength(L); renderDrawer(); refresh(true); markDirty(); return; }
    if (k === 'activeLoad') { selectLoad(+v); renderDrawer(); refresh(true); return; }
    setP(state.plan, k, v);
    if (k === 'chartIdx') { const p = state.plan; p.colIdx = 0; p.cwt = null; p.config = null; p.loads.forEach(l => l.colIdx = ''); p.boomOverride = ''; if (p.tele?.mode === 'manual') p.tele = { mode: 'auto', fr: [] }; Scene.views.elev = null; }
    if (k === 'colIdx') { state.plan.boomOverride = ''; Scene.views.elev = null; }
    const m = /^env\.(\d+)\.(unit|N)$/.exec(k); if (m) { const en = state.plan.env[+m[1]]; en.sc = envScaleFrom(en); en.calibrated = false; }
    if (/^env\.\d+\.view$/.test(k)) { const en = state.plan.env[+k.split('.')[1]]; state.openEnv = en.id; }
    if (k === 'sitePlan.enabled' && v && state.view === 'elev') toast('Site plan added to the sheet — open the Site plan view to place the crane');
    if (t.dataset.re) renderDrawer();
    markDirty(); refresh(true);
  });
  app.addEventListener('click', async (e) => {
    if (e.target.closest('.pname small')) { setSection('job', true); $('#work').classList.remove('dr-off'); railState(); return; }
    const sg = e.target.closest('[data-sec-go]'); if (sg) { setSection(sg.dataset.secGo, true); if (isMobile()) $('#work').classList.remove('dr-off'); railState(); return; }
    const sc = e.target.closest('[data-sec]'); if (sc) { setSection(sc.dataset.sec); return; }
    const pg = e.target.closest('[data-page],[data-page-go]'); if (pg) { const n = pg.dataset.page || pg.dataset.pageGo; if (state.page === n && pg.dataset.page) closePage(); else openPage(n); return; }
    const vb = e.target.closest('[data-view],[data-view-go]'); if (vb && !vb.closest('.menu-pop')) { setView(vb.dataset.view || vb.dataset.viewGo); if (isMobile() && vb.dataset.viewGo) $('#work').classList.add('dr-off'); return; }
    const wh = e.target.closest('[data-wxh]'); if (wh) { const W = state.plan.weather; if (W) { W.start = String(wh.dataset.wxh).padStart(2, '0') + ':00'; renderDrawer(); refresh(true); markDirty(); } return; }
    const ca = e.target.closest('[data-cacc]'); if (ca) { accToggle(ca.dataset.cacc, ca.getAttribute('aria-pressed') !== 'true'); return; }
    const tp = e.target.closest('[data-top]'); if (tp) { const m = tp.closest('details.menu'); if (m) m.open = false; topAction(tp.dataset.top); return; }
    const b = e.target.closest('[data-act]'); if (!b) { $$('details.menu[open]').forEach(m => { if (!m.contains(e.target)) m.open = false; }); return; }
    const p = state.plan, a = b.dataset.act, i = +b.dataset.i;
    const menu = b.closest('details.menu'); if (menu) menu.open = false;
    if (a === 'drClose') { $('#work').classList.add('dr-off'); railState(); }
    else if (a === 'pickCrane') { state.pickCrane = !state.pickCrane; renderDrawer(); if (state.pickCrane) setTimeout(() => $('#craneQ')?.focus(), 30); }
    else if (a === 'craneMake') { state.craneMake = b.dataset.v; renderDrawer(); }
    else if (a === 'setCrane') { setCrane(b.dataset.id); state.pickCrane = false; renderDrawer(); refresh(true); markDirty(); toast(curCrane().model + ' selected'); }
    else if (a === 'selLoad') { selectLoad(i); renderDrawer(); refresh(true); }
    else if (a === 'addLoad') { const c = curCrane(); p.loads.push({ ...clone(p.loads[activeLi()]), name: '', colIdx: '', capOverride: '', hb: c?.hookBlock ?? 1, notes: '' }); p.activeLoad = p.loads.length - 1; if (state.sec !== 'lift') setSection('lift', true); else renderDrawer(); refresh(true); markDirty(); }
    else if (a === 'dupLoad') { p.loads.splice(i + 1, 0, clone(p.loads[i])); p.activeLoad = i + 1; renderDrawer(); refresh(true); markDirty(); }
    else if (a === 'delLoad') { p.loads.splice(i, 1); selectLoad(Math.min(+p.activeLoad || 0, p.loads.length - 1)); p.secondLoad = Math.min(+p.secondLoad || 0, p.loads.length - 1); renderDrawer(); refresh(true); markDirty(); }
    else if (a === 'by') setBy(activeLi(), b.dataset.v);
    else if (a === 'posStep') { const li = activeLi(), l = p.loads[li], d = +b.dataset.d; const { ch } = loadCol(li); if (l.by === 'angle') { const [mn, mx] = angleRange(ch); setPosition(li, Math.max(mn, Math.min(mx, num(l.angle, 60) + d))); } else { const [mn, mx] = radiusRange(li); setPosition(li, Math.max(Math.min(mn, 0.5), Math.min(mx + 10, num(l.R, 10) + d))); } }
    else if (a === 'teleMode') teleMode(b.dataset.v);
    else if (a === 'srAdd') { const R = p.sheetRows = p.sheetRows || { hide: {}, show: {}, custom: [] }; R.custom = R.custom || []; R.custom.push({ label: '', value: '', sec: 'load', load: '' }); renderDrawer(); markDirty(); setTimeout(() => { const ins = $$('.sr-row input[type=text]'); ins[ins.length - 2]?.focus(); }, 30); }
    else if (a === 'srDel') { p.sheetRows.custom.splice(i, 1); renderDrawer(); refresh(true); markDirty(); }
    else if (a === 'srReset') { p.sheetRows = { hide: {}, show: {}, custom: p.sheetRows?.custom || [] }; renderDrawer(); refresh(true); markDirty(); toast('Sheet rows back to the standard set'); }
    else if (a === 'rigSel') { switchRig(i); const li = activeLi(); if (num(p.loads[li].crane) !== i) { const k = p.loads.findIndex(l => num(l.crane) === i); if (k >= 0) p.activeLoad = k; } renderDrawer(); refresh(true); }
    else if (a === 'rigAdd') { addRig(); renderDrawer(); refresh(true); markDirty(); state.pickCrane = true; renderDrawer(); toast(`Crane ${p.cranes.length} added and given to lift ${activeLi() + 1} — pick its model`); }
    else if (a === 'rigDel') { if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.innerHTML = '?'; b.title = 'Tap again to remove'; setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ''; b.innerHTML = ico('x', 12); } }, 3000); return; } removeRig(i); renderDrawer(); refresh(true); markDirty(); }
    else if (a === 'telePre') telePreset(b.dataset.v);
    else if (a === 'flyOff') { p.attach.offset = +b.dataset.v; Scene.views.elev = null; renderDrawer(); refresh(true); markDirty(); }
    else if (a === 'clearObjs') { if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Tap again to clear'; setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ''; b.textContent = 'Clear all'; } }, 3000); return; } p.site.obstacles = []; state.sel = Scene.sel = null; renderDrawer(); hudTools(); refresh(true); markDirty(); }
    else if (a === 'addObj') addObject(b.dataset.type);
    else if (a === 'delObj') { e.preventDefault(); p.site.obstacles.splice(i, 1); state.sel = Scene.sel = null; renderDrawer(); hudTools(); refresh(true); markDirty(); }
    else if (a === 'selEdit') { state.selEdit = !state.selEdit; hudTools(); }
    else if (a === 'dupSel') { const k = selIndex(); if (k >= 0) { const o = clone(p.site.obstacles[k]); const ex = objExtent(p.site, o); o.x = r2(num(o.x) + (ex.x1 - ex.x0) + 1); p.site.obstacles.push(o); state.sel = Scene.sel = 'obj:' + (p.site.obstacles.length - 1); if (state.sec === 'site') renderDrawer(); hudTools(); refresh(true); markDirty(); } }
    else if (a === 'delSel') { const k = selIndex(); if (k >= 0) { p.site.obstacles.splice(k, 1); state.sel = Scene.sel = null; state.selEdit = false; if (state.sec === 'site') renderDrawer(); hudTools(); refresh(true); markDirty(); } }
    else if (a === 'measure') { sceneSetTool(Scene.tool?.kind === 'measure' ? null : { kind: 'measure' }); hudTools(); }
    else if (a === 'importEnv') importEnvFlow();
    else if (a === 'envDel') { const en = p.env[i]; if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Tap again'; setTimeout(() => { if (b.isConnected) { b.dataset.confirm = ''; b.textContent = 'Remove'; } }, 3000); return; } p.env.splice(i, 1); delete ENV_CACHE[en.id]; renderDrawer(); refresh(true); markDirty(); }
    else if (a === 'envCentre') { const en = p.env[i]; const mode = en.view === 'plan' ? 'plan' : 'elev'; if (state.view !== mode) setView(mode); const v = sceneVisible(); envCenterAt(en, (v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2); syncDrawer(); refresh(true); }
    else if (a === 'envCalib' || a === 'envAlign') { const en = p.env[i]; const mode = en.view === 'plan' ? 'plan' : 'elev'; if (state.view !== mode) setView(mode); en.hidden = false; sceneSetTool({ kind: a === 'envCalib' ? 'calib' : 'align', i }); if (isMobile()) $('#work').classList.add('dr-off'); }
    else if (a === 'layout') { p.layout = b.dataset.v; renderDrawer(); refresh(true); markDirty(); }
    else if (a === 'lockView') { if (state.view !== 'elev') setView('elev'); const v = sceneVisible(); p.sheetView = { x0: r2(v.x0), x1: r2(v.x1), y0: r2(v.y0), y1: r2(v.y1) }; renderDrawer(); refresh(true); markDirty(); toast('The sheet now uses this framing'); }
    else if (a === 'unlockView') { p.sheetView = null; renderDrawer(); refresh(true); markDirty(); }
    else if (a === 'addRev') { p.meta.revs = p.meta.revs || []; p.meta.revs.push({ rev: String(p.meta.revs.length), desc: '', date: p.meta.date }); renderDrawer(); markDirty(); }
    else if (a === 'zoomIn') sceneZoom(1.35); else if (a === 'zoomOut') sceneZoom(1 / 1.35); else if (a === 'fit') { sceneFit(); sceneDirty(); }
    else if (a === 'theme') setCanvasTheme(!Scene.dark);
    else if (a === 'inspTg') $('#work').classList.toggle('in-open');
    else if (a === 'tw') state.twin?.view(b.dataset.v); else if (a === 'twZoom') state.twin?.zoom(+b.dataset.v); else if (a === 'twFit') { state.twin?.reframe(); twinUpdate(); }
    else if (a === 'tipCancel') { sceneSetTool(null); hudTools(); }
    else if (a === 'tipOk') applyCalib();
    else if (a === 'wxOn') { wxEnsure(); state.wx.editing = true; renderDrawer(); refresh(true); markDirty(); setTimeout(() => $('#wxQ')?.focus(), 30); }
    else if (a === 'wxOff') { p.weather = null; state.wx = { q: '', res: null, busy: false, err: '' }; renderDrawer(); refresh(true); markDirty(); }
    else if (a === 'wxChange') { state.wx.editing = true; state.wx.q = ''; renderDrawer(); setTimeout(() => $('#wxQ')?.focus(), 30); }
    else if (a === 'wxSearch') wxSearch();
    else if (a === 'wxPick') wxPick(state.wx.res[i]);
    else if (a === 'wxLocate') wxLocate();
    else if (a === 'wxFetch') wxFetch();
    else if (a === 'wxNameOnly') { const W = wxEnsure(); W.place = state.wx.q.trim(); W.lat = null; W.lon = null; state.wx.editing = false; state.wx.err = ''; renderDrawer(); refresh(true); markDirty(); }
    else if (a === 'wxClearLive') { const W = wxEnsure(); W.hourly = null; W.fetched = ''; renderDrawer(); refresh(true); markDirty(); }
  });
  app.addEventListener('keydown', (e) => {
    if (e.target.id === 'wxQ' && e.key === 'Enter') { e.preventDefault(); wxSearch(); return; }
    if (e.target.id === 'calibDist' && e.key === 'Enter') { e.preventDefault(); applyCalib(); return; }
  });
  app.addEventListener('toggle', (e) => { const d = e.target; if (d.matches && d.matches('details[data-ei]') && d.open) state.openEnv = state.plan.env[+d.dataset.ei]?.id; if (d.matches && d.matches('details[data-oi]') && d.open) { state.sel = Scene.sel = 'obj:' + d.dataset.oi; hudTools(); sceneDirty(); } }, true);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!document.body.classList.contains('locked')) savePlan(false); return; }
    if (document.body.classList.contains('locked') || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase(); if (['input', 'select', 'textarea'].includes(tag) || e.target.isContentEditable || e.target.closest?.('.ttrack')) return;
    if (e.key === 'Escape') { $$('details.menu[open]').forEach(m => m.open = false); if (state.selEdit) { state.selEdit = false; hudTools(); } if (Scene.tool) { sceneSetTool(null); hudTools(); } return; }
    if (e.key === '?' && !Tour.on) { tourStart(); return; }
    if (state.page || Tour.on && e.key !== '1' && e.key !== '2' && e.key !== '3' && e.key !== '4') return;
    const views = { 1: 'elev', 2: 'plan', 3: '3d', 4: 'sheet' }; if (views[e.key]) { setView(views[e.key]); e.preventDefault(); return; }
    if (e.key === 'f' || e.key === 'F') { if (state.view === '3d') { state.twin?.reframe(); twinUpdate(); } else { sceneFit(); sceneDirty(); } return; }
    if (e.key === 'm' || e.key === 'M') { if (state.view === 'elev' || state.view === 'plan') { sceneSetTool(Scene.tool?.kind === 'measure' ? null : { kind: 'measure' }); hudTools(); } return; }
    if (e.key === '[' || e.key === ']') { const li = activeLi(), l = state.plan.loads[li], d = (e.key === ']' ? 1 : -1) * (e.shiftKey ? 5 : 0.5); if (l.by === 'angle') setPosition(li, num(l.angle, 60) + d); else setPosition(li, Math.max(0.5, num(l.R, 10) + d)); }
  });
}
function topAction(a) {
  if (a === 'wizard') wizOpen(); else if (a === 'save') savePlan(false); else if (a === 'saveNew') savePlan(true);
  else if (a === 'pdf') exportPDF('A1'); else if (a === 'pdfA3') exportPDF('A3'); else if (a === 'dxf') exportDXF(); else if (a === 'svg') exportSVG();
  else if (a === 'json') exportJSON(fileBase() + '.json', { version: 2, plan: state.plan });
  else if (a === 'weather') { setSection('weather', true); $('#work').classList.remove('dr-off'); railState(); }
  else if (a === 'checks') { const w = $('#work'); if (window.matchMedia('(max-width: 1240px)').matches) w.classList.toggle('in-open'); else { w.classList.remove('in-off'); $('#inspIn').scrollTop = $('.isec')?.offsetTop - 10 || 0; } }
  else if (a === 'plans' || a === 'fleet' || a === 'settings') openPage(a);
  else if (a === 'tour') tourStart();
  else if (a === 'job') { setSection('job', true); $('#work').classList.remove('dr-off'); railState(); }
  else if (a === 'signout') { authClear(); if (state.dirty) draft(); location.reload(); }
}

// ---------- canvas tools ----------
function sceneToolStep(t, n, pts) {
  const tip = $('#hudTip'); if (!tip) return;
  if (!t) { tip.hidden = true; tip.innerHTML = ''; return; }
  if (t.kind === 'measure') { tip.hidden = false; tip.innerHTML = n === 2 ? `<b>${Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y).toFixed(3)} m</b><span>Click again to start a new measurement · Esc to finish</span><div><button type="button" class="btn sm ghost" data-act="tipCancel">Done</button></div>` : `<b>Measure</b><span>${n === 1 ? 'Click the second point.' : 'Click the first point — snaps to nothing, reads true metres.'}</span><div><button type="button" class="btn sm ghost" data-act="tipCancel">Done</button></div>`; return; }
  const en = state.plan.env[t.i]; tip.hidden = false;
  if (t.kind === 'calib') {
    if (n === 2) { const d = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y); tip.innerHTML = `<b>Real distance between the two points</b><div class="tip-row"><span class="fi"><input type="number" step="any" inputmode="decimal" id="calibDist" value="${r2(d)}" aria-label="Real distance in metres"><i>m</i></span><button type="button" class="btn sm primary" data-act="tipOk">Set scale</button><button type="button" class="btn sm ghost" data-act="tipCancel">Cancel</button></div>`; setTimeout(() => { const i = $('#calibDist'); i && (i.focus(), i.select()); }, 20); return; }
    tip.innerHTML = `<b>Set the scale of “${h(en.name || 'drawing')}”</b><span>Click ${n === 1 ? 'the second' : 'the first'} end of a dimension you know (a building width, a grid spacing).</span><div><button type="button" class="btn sm ghost" data-act="tipCancel">Cancel</button></div>`;
  } else {
    if (n === 2) { envAlign(en, pts[0], pts[1]); sceneSetTool(null); syncDrawer(); refresh(true); toast('Drawing moved into place'); return; }
    tip.innerHTML = `<b>Line up “${h(en.name || 'drawing')}”</b><span>${n === 1 ? 'Now click where that point should be — e.g. the building face on the ground line.' : 'Click a point on the drawing, for example the corner of the building.'}</span><div><button type="button" class="btn sm ghost" data-act="tipCancel">Cancel</button></div>`;
  }
}
function applyCalib() {
  const t = Scene.tool; if (!t || Scene.pts.length < 2) return; const d = num($('#calibDist')?.value);
  if (!(d > 0)) { toast('Enter the real distance in metres'); return; }
  const en = state.plan.env[t.i]; envCalibrate(en, Scene.pts[0], Scene.pts[1], d); sceneSetTool(null); renderDrawer(); refresh(true); markDirty(); toast(`Scale set — ${en.name || 'drawing'} is now true size`);
}

// ---------- client drawing import ----------
async function importEnvFlow() {
  const f = await pickFile('.dxf,.pdf,image/png,image/jpeg,image/webp,application/pdf,image/vnd.dxf');
  if (!f) return;
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  if (ext === 'dwg') { toast('DWG is AutoCAD-only — save it as DXF (SAVEAS → DXF) or PDF first'); return; }
  const kind = ext === 'dxf' ? 'dxf' : ext === 'pdf' || f.type === 'application/pdf' ? 'pdf' : 'img';
  const dlg = openDialog(`<span class="eyebrow">Client drawing</span><h2>Import “${h(f.name)}”</h2><p class="hint">Reading the file…</p>`);
  const curMode = state.view === 'plan' ? 'plan' : 'elev';
  try {
    let preview = null;
    if (kind === 'dxf') {
      if (f.size > 60e6) toast('Large DXF — this can take a while');
      const parsed = await parseDXF(await readText(f));
      const layers = Object.entries(parsed.layerCount).sort((a, b) => b[1] - a[1]);
      const skip = (n) => /^(defpoints|.*(title|frame|border|viewport|vport).*)$/i.test(n);
      dlg.body.innerHTML = `<span class="eyebrow">Client drawing · DXF</span><h2>Import “${h(f.name)}”</h2><p class="hint">${parsed.items.length.toLocaleString()} lines on ${layers.length} layers${parsed.truncated ? ' — very large, only the first part was read' : ''}. Untick layers you don't need (title blocks, hatching) to keep it light.</p>
        <div class="row"><label class="f"><span class="fl">Shown in</span><select id="imView"><option value="plan">Site plan (top view)</option><option value="elev">Elevation (side view)</option></select></label>
        <label class="f"><span class="fl">Drawing units</span><select id="imUnit">${['mm', 'cm', 'm', 'in', 'ft'].map(u => `<option value="${u}"${u === (parsed.units === 'in' ? 'mm' : parsed.units) ? ' selected' : ''}>${{ mm: 'Millimetres', cm: 'Centimetres', m: 'Metres', in: 'Inches', ft: 'Feet' }[u]}</option>`).join('')}</select></label></div>
        <p class="hint">The file says “${h(parsed.units)}”. Most UAE drawings are in millimetres; you can fix the scale later from two known points.</p>
        <div class="layers">${layers.map(([n, c], i) => `<label class="check"><input type="checkbox" data-layer="${h(n)}" id="ly-${i}"${skip(n) ? '' : ' checked'}> <span>${h(n)}</span><small>${c}</small></label>`).join('')}</div>
        <div class="actions"><button type="button" class="btn primary" id="imGo">Import</button><button type="button" class="btn ghost" id="imCancel">Cancel</button></div>`;
      preview = parsed;
    } else if (kind === 'pdf') {
      const pdf = await openPdf(f);
      dlg.body.innerHTML = `<span class="eyebrow">Client drawing · PDF</span><h2>Import “${h(f.name)}”</h2><p class="hint">${pdf.numPages} page${pdf.numPages > 1 ? 's' : ''}. The page comes in as a picture at its printed scale.</p>
        <div class="row r3"><label class="f"><span class="fl">Page</span><input type="number" id="imPage" min="1" max="${pdf.numPages}" value="1"></label><label class="f"><span class="fl">Drawing scale 1:</span><input type="number" id="imN" value="200" step="any"></label><label class="f"><span class="fl">Shown in</span><select id="imView"><option value="plan">Site plan</option><option value="elev">Elevation</option></select></label></div>
        <p class="hint">Use the scale printed in the client's title block. No scale on it? Leave 200 and set it from two known points after importing.</p>
        <div class="actions"><button type="button" class="btn primary" id="imGo">Import</button><button type="button" class="btn ghost" id="imCancel">Cancel</button></div>`;
      preview = pdf;
    } else {
      dlg.body.innerHTML = `<span class="eyebrow">Client drawing · image</span><h2>Import “${h(f.name)}”</h2><p class="hint">Photos, screenshots and scans come in as a picture. After importing, use “Scale from 2 points” on a dimension you know.</p>
        <div class="row"><label class="f"><span class="fl">Shown in</span><select id="imView"><option value="plan">Site plan</option><option value="elev">Elevation</option></select></label><span></span></div>
        <div class="actions"><button type="button" class="btn primary" id="imGo">Import</button><button type="button" class="btn ghost" id="imCancel">Cancel</button></div>`;
    }
    $('#imView', dlg.body).value = curMode;
    $('#imCancel', dlg.body).onclick = () => dlg.close();
    $('#imGo', dlg.body).onclick = async () => {
      const go = $('#imGo', dlg.body); go.disabled = true; go.textContent = 'Importing…';
      try {
        const view = $('#imView', dlg.body).value;
        const e = { id: 'env' + uid(), name: f.name.replace(/\.[^.]+$/, ''), view, kind, x: 0, y: 0, rot: 0, opacity: kind === 'dxf' ? 1 : 0.85, mono: false, hidden: false };
        let payload;
        if (kind === 'dxf') {
          const keep = new Set($$('[data-layer]', dlg.body).filter(c => c.checked).map(c => c.dataset.layer));
          const g = packGeom(preview, keep); e.q = g.q; e.unit = $('#imUnit', dlg.body).value; e.sc = envScaleFrom(e); delete g.npts;
          ENV_CACHE[e.id] = g; payload = { geom: g };
        } else {
          let r;
          if (kind === 'pdf') { r = await renderPdfPage(preview, Math.max(1, Math.min(preview.numPages, Math.round(num($('#imPage', dlg.body).value, 1))))); e.mmPerPx = r.mmPerPx; e.N = num($('#imN', dlg.body).value, 200); e.sc = envScaleFrom(e); }
          else { r = await imageToCanvas(f); e.sc = 0.02; }
          e.w = r.w; e.h = r.h;
          ENV_CACHE[e.id] = { img: r.canvas.toDataURL('image/jpeg', 0.85), w: r.w, h: r.h };
          payload = { canvas: r.canvas, blob: state.assets ? await canvasBlob(r.canvas) : null };
        }
        addEnv(e);
        const where = await persistEnv(e, payload, state.assets);
        if (where === 'inline-big') toast('Drawing is large — it is kept with this plan but may not fit in browser storage. Untick layers to slim it down.');
        dlg.close(); renderDrawer(); refresh(true); markDirty();
        toast('Drawing imported — drag the purple dot to move it, or “Line up a point”');
      } catch (err) { console.error(err); go.disabled = false; go.textContent = 'Import'; toast('Import failed: ' + err.message); }
    };
  } catch (err) { console.error(err); dlg.close(); toast(err.message || 'Could not read that file'); }
}
function addEnv(e) {
  const p = state.plan; p.env = p.env || []; p.env.push(e); state.openEnv = e.id; state.sec = 'site';
  const mode = e.view === 'plan' ? 'plan' : 'elev'; if (state.view !== mode) setView(mode);
  if (mode === 'plan' && !p.sitePlan.enabled) p.sitePlan.enabled = true;
  state.calc = computePlan(p, cranes(), settingsEff());
  const v = sceneVisible(); envCenterAt(e, (v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2);
  if (mode === 'elev') { const b = envBBox(e); if (b) e.y = r2(num(e.y) - b.y0); }
  Scene.views[mode] = null; sceneView(); setSection('site', true);
}
