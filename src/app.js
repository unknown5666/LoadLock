// ===== App core: state, storage, exports, bound fields =====
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const h = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clone = (o) => JSON.parse(JSON.stringify(o));
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const fmt = (v, d = 1) => (v == null || !isFinite(v) ? '—' : (+v).toFixed(d));

const state = {
  sec: 'crane', page: null, view: 'elev', plan: null, settings: clone(DEFAULT_SETTINGS), userCranes: {}, hiddenCranes: [], plans: [],
  db: null, assets: null, downloads: null, libSel: null, calc: null, pickCrane: false, craneQ: '', craneMake: '', chartFilter: '', wiz: null, sel: null,
  savedAt: null, dirty: false, wx: { q: '', res: null, busy: false, err: '' }, twin: null, started: false
};

// v9: the fleet list is built once and reused until the fleet changes. Deep-cloning every default crane (hundreds of LICCON charts)
// on each call took ~15 ms per redraw, which made dragging stutter on phones. Every fleet edit goes through _chartCache.clear()
// (saveCrane, fleetCommit, the db snapshot, reset), so that bumps the revision; adding / removing / hiding changes the key itself.
let CRANES_REV = 0; const CRANES_MEMO = { key: null, list: null };
{ const clr = _chartCache.clear.bind(_chartCache); _chartCache.clear = () => { CRANES_REV++; _chartRev++; clr(); }; }
function cranes() {
  const key = CRANES_REV + '|' + Object.keys(state.userCranes).join(',') + '|' + state.hiddenCranes.join(',');
  if (CRANES_MEMO.key === key && CRANES_MEMO.u === state.userCranes) return CRANES_MEMO.list;
  const map = new Map(DEFAULT_CRANES.map(c => [c.id, clone(c)]));
  for (const [id, c] of Object.entries(state.userCranes)) map.set(id, c);
  const list = [...map.values()].filter(c => !state.hiddenCranes.includes(c.id)).sort((a, b) => a.cls - b.cls || a.model.localeCompare(b.model)).map(c => withImgs(c));
  Object.assign(CRANES_MEMO, { key, list, u: state.userCranes }); return list;
}
function withImgs(c) {
  const o = { ...c };
  if (c.imgChartId) o.imgChart = '/_blob/' + c.imgChartId; else if (c.imgChartData) o.imgChart = c.imgChartData;
  if (c.imgDimsId) o.imgDims = '/_blob/' + c.imgDimsId; else if (c.imgDimsData) o.imgDims = c.imgDimsData;
  else if (!c.dimsSchematic && c.dimsImg && typeof DIMS_IMG !== 'undefined' && DIMS_IMG[c.dimsImg]) o.imgDims = DIMS_IMG[c.dimsImg];
  return o;
}
function settingsEff() { const s = { ...DEFAULT_SETTINGS, ...state.settings }; if (s.logoId) s.logoImg = '/_blob/' + s.logoId; else if (s.logoData) s.logoImg = s.logoData; return s; }
function livery() { const S = settingsEff(); return S.boomLivery === false ? '' : (S.boomText || S.company || ''); }
const BRAND_COL = { liebherr: '#f5c400', demag: '#f3c300', tadano: '#e4342b', sany: '#d7182a', zoomlion: '#1d6fd1', xcmg: '#f2a900', grove: '#d22630', manitowoc: '#d22630' };
function brandCol(c) { const m = String(c?.make || '').toLowerCase(); for (const k in BRAND_COL) if (m.includes(k)) return BRAND_COL[k]; return c?.color || '#7d8a96'; }

// ---------- storage ----------
async function initStorage() {
  const C = window.claude;
  state.settings = { ...clone(DEFAULT_SETTINGS), ...LS.get('lp.settings', {}) };
  state.userCranes = LS.get('lp.cranes', {}); state.hiddenCranes = LS.get('lp.hidden', []); state.plans = LS.get('lp.plans', []);
  if (!C || !C.use) return;
  try { state.downloads = await C.use('downloads'); } catch {}
  try { state.assets = await C.use('assets'); } catch {}
  let db = null; try { db = await C.use('db'); } catch {}
  if (!db) return;
  state.db = db;
  try { const s = await db.doc('config/settings').get(); if (s.exists) { const d = s.data(); state.settings = { ...clone(DEFAULT_SETTINGS), ...d }; state.hiddenCranes = d.hiddenCranes || []; } } catch {}
  db.collection('cranes').onSnapshot((snap) => {
    const m = {}; snap.docs.forEach(d => { m[d.id] = d.data(); }); state.userCranes = m; _chartCache.clear(); loadCustomBodies();
    if (state.page === 'fleet') renderFleet(); if (state.started && !state.page) { renderDrawer(); refresh(true); }
  }, () => {});
  db.collection('plans').onSnapshot((snap) => {
    state.plans = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))); if (state.page === 'plans') renderPlans();
  }, () => {});
}
async function saveCrane(c) {
  const doc = clone(c); delete doc.imgChart; delete doc.imgDims;
  state.userCranes[c.id] = doc;
  if (state.db) { try { await state.db.doc('cranes/' + c.id).set(doc); } catch (e) { toast(dbMsg(e)); } }
  else LS.set('lp.cranes', state.userCranes);
  _chartCache.clear();
}
async function deleteCrane(id) {
  const isDefault = DEFAULT_CRANES.some(c => c.id === id);
  delete state.userCranes[id];
  if (state.db) { try { await state.db.doc('cranes/' + id).delete(); } catch {} } else LS.set('lp.cranes', state.userCranes);
  if (isDefault && !state.hiddenCranes.includes(id)) { state.hiddenCranes.push(id); await saveSettings(); }
}
async function saveSettings() {
  const s = { ...state.settings, hiddenCranes: state.hiddenCranes }; delete s.logoImg;
  if (state.db) { try { await state.db.doc('config/settings').set(s); } catch (e) { toast(dbMsg(e)); } }
  else { LS.set('lp.settings', s); LS.set('lp.hidden', state.hiddenCranes); }
}
function planForStore(p) { const c = clone(p); (c.env || []).forEach(e => { if (e.assetId) { delete e.data; delete e.dataUrl; } delete e.missing; }); return c; }
async function savePlan(asNew) {
  const p = state.plan; if (asNew || !p.id) p.id = uid();
  const calc = computePlan(p, cranes(), settingsEff());
  const rec = { plan: planForStore(p), name: p.name || p.meta.title || 'Untitled', client: p.meta.client || '', crane: calc.crane.model, status: calc.status, util: calc.loads[0]?.util ?? null, updatedAt: new Date().toISOString() };
  if (state.db) { try { await state.db.doc('plans/' + p.id).set(rec); toast('Saved to the shared plans'); } catch (e) { toast(dbMsg(e)); return; } }
  else { const i = state.plans.findIndex(x => x.id === p.id); const r = { id: p.id, ...rec }; if (i >= 0) state.plans[i] = r; else state.plans.unshift(r); LS.set('lp.plans', state.plans); toast('Saved in this browser'); }
  state.savedAt = new Date(); state.dirty = false; updateSaveState(); draft();
}
async function deletePlan(id) {
  if (state.db) { try { await state.db.doc('plans/' + id).delete(); } catch (e) { toast(dbMsg(e)); } }
  else { state.plans = state.plans.filter(p => p.id !== id); LS.set('lp.plans', state.plans); renderPlans(); }
}
function dbMsg(e) { return e?.code === 'invalid_argument' ? 'You have view access only — changes are not saved' : e?.code === 'quota_exceeded' ? 'Storage is full — delete old plans' : 'Could not save: ' + (e?.message || e); }
let draftT; function draft() { if (state.tour) return; clearTimeout(draftT); draftT = setTimeout(() => { if (!state.tour) LS.set('lp.draft', state.plan); }, 500); }
function markDirty() { if (!state.dirty) { state.dirty = true; updateSaveState(); } }
function updateSaveState() {
  const el = $('#saveState'), st = $('#tbState'); if (!el && !st) return;
  const p = state.plan; const where = state.db ? 'shared library' : 'this browser';
  const at = state.savedAt ? state.savedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
  if (el) {
    if (state.dirty) el.innerHTML = `<span class="dirty">● Unsaved changes</span> · ${h(p?.meta?.client || 'no client')}`;
    else if (state.savedAt) el.textContent = `Saved ${at} · ${where}`;
    else el.textContent = p?.id ? `Saved plan · ${where}` : `Not saved yet · ${where}`;
  }
  if (st) { // phone: the second row of the top bar. One tap saves.
    const saved = !state.dirty && (state.savedAt || p?.id);
    st.classList.toggle('dirty', !!state.dirty); st.classList.toggle('saved', !!saved);
    st.innerHTML = state.dirty ? `<i></i><span>Not saved</span><b>Save</b>` : saved ? `<i></i><span>${state.savedAt ? 'Saved ' + at : 'Saved'}</span>` : `<i></i><span>Not saved yet</span><b>Save</b>`;
    st.setAttribute('aria-label', state.dirty || !saved ? 'Save the plan' : 'The plan is saved. Tap to save again.');
  }
}

// ---------- downloads / exports ----------
async function offerFile(filename, blob) {
  if (typeof shareCapture === 'function' && shareCapture(filename, blob)) return; // v10: a Share & print card is waiting for this file (Save / Share / Print happen from its buttons)
  return saveFileNow(filename, blob);
}
async function saveFileNow(filename, blob) { // download the file: the artifact runtime when it is there, else a normal browser download
  if (state.downloads) {
    try { await state.downloads.save({ filename, data: blob }); return; }
    catch (e) { if (e?.code === 'declined') return; if (e?.code !== 'unavailable' && e?.code !== 'not_granted') { toast('Download failed: ' + (e.message || e.code)); return; } }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
function progressStep(f, label) { if (typeof shareProgress === 'function') shareProgress(f, label); } // v10: feeds the progress bar on the Share & print card (no-op in v6)
function fileBase() { const m = state.plan.meta; return ((m.client ? m.client + ' ' : '') + (m.title || state.plan.name || 'lifting plan')).replace(/[^\w\- ]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'lifting plan'; }
async function inlineImages(svg) {
  const urls = [...new Set([...svg.matchAll(/href="([^"]+)"/g)].map(m => m[1]).filter(u => !u.startsWith('data:')))];
  for (const u of urls) {
    try { const b = await (await fetch(u.replace(/&amp;/g, '&'))).blob(); const d = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); }); svg = svg.split(u).join(d); } catch {}
  }
  return svg;
}
function currentSheet(extra = {}) {
  const calc = state.calc || computePlan(state.plan, cranes(), settingsEff());
  const { P, scale } = buildSheet(state.plan, calc, { ...settingsEff(), ...extra });
  return { calc, P, scale };
}
async function exportPDF(paper = 'A1') {
  const btn = $('#bPdf'); if (btn) btn.classList.add('busy'); if (!(typeof shareBusy === 'function' && shareBusy())) toast('Building the ' + paper + ' PDF…');
  try {
    progressStep(0.06, 'Loading the pictures…'); await ensureEnvLoaded(state.plan);
    progressStep(0.14, 'Drawing the sheet…');
    const { P } = currentSheet({ paper }); const svg = toSVG(P, { width: '100%', height: '100%' });
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('PDF library did not load');
    const [pw, ph] = paper === 'A3' ? [420, 297] : [841, 594];
    let doc;
    if (typeof pdfNew === 'function') doc = pdfNew({ orientation: 'landscape', unit: 'mm', format: [pw, ph] }); // v10: locked (print only) and fonts embedded
    else {
      doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: [pw, ph], compress: true });
      if (typeof PDF_FONTS !== 'undefined') {
        doc.addFileToVFS('LiberationSans-Regular.ttf', PDF_FONTS.regular); doc.addFont('LiberationSans-Regular.ttf', 'Arial', 'normal');
        doc.addFileToVFS('LiberationSans-Bold.ttf', PDF_FONTS.bold); doc.addFont('LiberationSans-Bold.ttf', 'Arial', 'bold');
      }
    }
    progressStep(0.3, 'Putting the drawing on the page…');
    const stage = $('#pdfStage'); stage.innerHTML = await inlineImages(svg); const el = stage.querySelector('svg');
    el.setAttribute('width', String(pw)); el.setAttribute('height', String(ph));
    progressStep(0.4, 'Turning the drawing into a PDF…');
    await doc.svg(el, { x: 0, y: 0, width: pw, height: ph });
    stage.innerHTML = '';
    progressStep(0.94, 'Locking and finishing…');
    if (typeof pdfFinish === 'function') pdfFinish(doc, { title: fileBase(), docNo: sheetDocNo(), subject: 'Crane lifting plan' + (paper === 'A3' ? ' (A3)' : ' (A1)') });
    else doc.setProperties({ title: fileBase(), creator: 'FHE Lift Planner' });
    await offerFile(fileBase() + (paper === 'A3' ? ' (A3)' : '') + '.pdf', doc.output('blob'));
  } catch (e) { console.error(e); if (typeof shareFail === 'function') shareFail(e); toast('PDF export failed: ' + e.message); }
  finally { if (btn) btn.classList.remove('busy'); }
}
function sheetDocNo() { const m = state.plan?.meta || {}; return String(m.drawingNo || m.sheetNo || '').trim() || ('FHE-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(state.plan?.id || state.plan?.name || 'plan').replace(/[^\w]/g, '').slice(-4).toUpperCase()); }
async function exportDXF() {
  await ensureEnvLoaded(state.plan);
  const { P, scale } = currentSheet(); const S = scale ? scale.N : 100;
  const dxf = toDXF(P, S);
  const readme = `FHE Lift Planner — ${fileBase()}\r\n\r\nOpen the .dxf in AutoCAD (File > Open, type DXF), then SAVEAS .dwg.\r\nThe whole A1 sheet is drawn in model space at 1:${S}.\r\nThe elevation view is therefore true size in millimetres: measure it directly.\r\nTo plot: PLOT > A1 landscape > scale 1:${S} (1 mm = ${S} units), or Fit to paper.\r\nLayers: DIM / DIMTEXT (red/green dimensions), CRANE, BOOM, JIB, HOOK, LOAD, RIGGING, BUILDING, VEHICLE, CONTAINER, STRUCTURE, CLIENT-DWG, SITE-CRANE, SITE-RADIUS, GROUND, TABLE, CHART, NOTES, FRAME, TITLE.\r\nRaster images (load chart / crane sheet / logo / client PDF or photo) are not embedded: an IMAGE_FRAME rectangle marks where to IMAGEATTACH them.\r\n`;
  if (window.JSZip) {
    const z = new window.JSZip(); z.file(fileBase() + '.dxf', dxf); z.file('README.txt', readme);
    await offerFile(fileBase() + ' (DXF).zip', await z.generateAsync({ type: 'blob', compression: 'DEFLATE' }));
  } else await offerFile(fileBase() + ' (DXF).txt', new Blob([dxf], { type: 'text/plain' }));
}
async function exportSVG() { await ensureEnvLoaded(state.plan); const { P } = currentSheet(); await offerFile(fileBase() + '.svg', new Blob([await inlineImages(toSVG(P))], { type: 'image/svg+xml' })); }
async function exportJSON(name, obj) { await offerFile(name, new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })); }
function pickFile(accept) { return new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); i.click(); }); }
function readText(f) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(f); }); }
function readDataURL(f) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); }); }
async function storeImage(file) {
  if (state.assets) { try { const r = await state.assets.upload(file); return { id: r.id }; } catch (e) { toast('Upload failed: ' + (e.message || e.code)); return null; } }
  if (file.size > 900000) { toast('Image too large for browser storage (max ~900 KB here)'); return null; }
  return { data: await readDataURL(file) };
}
let toastT; function toast(msg) { let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.hidden = false; t.style.animation = 'none'; void t.offsetWidth; t.style.animation = ''; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3800); }
function openDialog(html, cls = 'dlg') {
  const back = document.createElement('div'); back.className = 'wiz-back'; back.innerHTML = `<div class="wiz ${cls}" role="dialog" aria-modal="true"><div class="wiz-body">${html}</div></div>`;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  back.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  return { body: back.querySelector('.wiz-body'), close, back };
}

// ---------- bound fields ----------
function getP(o, path) { return path.split('.').reduce((a, k) => a == null ? a : a[k], o); }
function setP(o, path, v) { const ks = path.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) { if (a[ks[i]] == null) a[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; a = a[ks[i]]; } a[ks[ks.length - 1]] = v; }
const F = {
  text(path, label, o = {}) {
    const v = getP(state.plan, path) ?? ''; const id = 'f-' + path;
    return `<label class="f${o.cls ? ' ' + o.cls : ''}" for="${id}"><span class="fl">${h(label)}${o.em ? ` <em>${h(o.em)}</em>` : ''}</span><span class="fi"><input type="${o.num ? 'number' : o.type || 'text'}" id="${id}" data-k="${path}" value="${h(v)}"${o.num ? ' step="any" inputmode="decimal"' : ''}${o.ph ? ` placeholder="${h(o.ph)}"` : ''}${o.list ? ` list="${o.list}"` : ''}${o.re ? ' data-re="1"' : ''}${o.min != null ? ` min="${o.min}"` : ''}${o.max != null ? ` max="${o.max}"` : ''}${o.dis ? ' disabled' : ''}>${o.unit ? `<i>${h(o.unit)}</i>` : ''}</span></label>`;
  },
  num(path, label, unit, o = {}) { return F.text(path, label, { ...o, num: true, unit }); },
  sel(path, label, opts, o = {}) { const v = String(getP(state.plan, path) ?? ''); return `<label class="f" for="f-${path}"><span class="fl">${h(label)}</span><select id="f-${path}" data-k="${path}"${o.re ? ' data-re="1"' : ''}${o.numeric ? ' data-num="1"' : ''}>${opts.map(([val, lab]) => `<option value="${h(val)}"${String(val) === v ? ' selected' : ''}>${h(lab)}</option>`).join('')}</select></label>`; },
  chk(path, label, o = {}) { return `<label class="check"><input type="checkbox" id="f-${path}" data-k="${path}" data-bool="1"${getP(state.plan, path) ? ' checked' : ''}${o.re ? ' data-re="1"' : ''}> <span>${h(label)}</span></label>`; },
  tog(path, o = {}) { return `<input type="checkbox" class="tog" id="f-${path}" data-k="${path}" data-bool="1"${getP(state.plan, path) ? ' checked' : ''}${o.re ? ' data-re="1"' : ''}${o.dis ? ' disabled' : ''} aria-label="${h(o.label || path)}">`; }
};
function normalizePlan(p) {
  const b = blankPlan();
  const out = { ...b, ...p, meta: { ...b.meta, ...(p.meta || {}) }, site: { ...b.site, ...(p.site || {}) }, outrigger: { ...b.outrigger, ...(p.outrigger || {}) }, rigging: { ...b.rigging, ...(p.rigging || {}) }, sitePlan: { enabled: false, cx: 0, cy: 0, rot: 0, carrierRot: '', ...(p.sitePlan || {}) } };
  out.site.obstacles = out.site.obstacles || [];
  out.env = (p.env || []).filter(e => e && e.id);
  out.attach = { type: 'none', jibLen: 16, offset: 15, boomAngle: 83, swl: '', ...(p.attach || {}) };
  out.tele = { mode: 'auto', fr: [], ...(p.tele || {}) };
  out.acc = { yguy: false, superlift: false, runner: false, slRadius: 15, slBallast: 100, ...(p.acc || {}) };
  out.weather = p.weather && typeof p.weather === 'object' ? { limit: 9, start: '07:00', hours: 4, manual: {}, ...p.weather } : null;
  out.loads = (p.loads && p.loads.length ? p.loads : b.loads).map(l => ({ ...b.loads[0], by: 'radius', angle: '', tipH: '', rigType: '', slingL: '', slingAng: 60, slingWLL: '', liftType: '', notes: '', contOn: true, empty: false, crane: 0, tackles: [], ...l, daf: { on: false, mode: 'auto', cls: 'HC1', vh: 0.1, v: 1.1, ...(l.daf || {}) } }));
  out.loads.forEach(l => { l.tackles = (Array.isArray(l.tackles) ? l.tackles : []).filter(t => t && typeof t === 'object').map(t => typeof rgNormTackle === 'function' ? rgNormTackle(t) : t); }); // v10: material, hitch, vertical WLL, certificate… (rigging.js)
  // cranes in the plan: top-level fields are the active crane, others parked here
  out.activeCrane = Math.max(0, Math.round(num(p.activeCrane, 0)));
  out.cranes = Array.isArray(p.cranes) && p.cranes.length ? p.cranes.map(c => ({ ...c })) : [rigPick(out)];
  if (out.activeCrane >= out.cranes.length) out.activeCrane = 0;
  out.loads.forEach(l => { l.crane = Math.max(0, Math.min(out.cranes.length - 1, Math.round(num(l.crane, 0)))); });
  // lift side (left / right / rear — never the front). v6 plans have none: work it out from where the boom pointed relative to the carrier
  // (a front lift, or no carrier heading at all, becomes 'rear'). The boom heading (sitePlan.rot) is kept, so the load stays where it was placed.
  const legacySide = !(p.loads || []).some(l => l && LIFT_SIDES.includes(String(l.side).toLowerCase()));
  let side0 = 'rear';
  if (legacySide && hasCarrierRot(out.sitePlan)) {
    side0 = sideFromHeadings(num(out.sitePlan.rot), num(out.sitePlan.carrierRot));
    out.sitePlan.carrierRot = r2(normDeg(num(out.sitePlan.rot) - SIDE_OFFSET[side0]));
  }
  out.loads.forEach(l => { l.side = legacySide ? side0 : sideOf(l); if (!hasSlew(l)) l.slew = ''; else l.slew = r2(normDeg(num(l.slew))); l.hoist = num(l.hoist, 0) > 0 ? r2(num(l.hoist)) : 0; }); // v11: any slew angle, hoist (cab controls)
  out.sheetRows = { hide: {}, show: {}, custom: [], ov: {}, ...(p.sheetRows || {}) };
  out.docs = p.docs && typeof p.docs === 'object' ? { ...p.docs } : {}; // v11: documentation for the report (v7/docs.js)
  // outriggers (v8): beams per side and hand-typed leg loads are per crane; plans from before v8 have neither → full legs, nothing typed
  const legs = (o) => { o.outExt = { left: 'full', right: 'full', ...(o.outExt && typeof o.outExt === 'object' ? o.outExt : {}) }; o.padMan = o.padMan && typeof o.padMan === 'object' ? { ...o.padMan } : {}; };
  legs(out); out.cranes.forEach(legs);
  // v10 report pack: which sections go in the RAMS pack (ids from REPORT_SECTIONS; missing = the defaults) and the site hazards the AP ticked (risk.js)
  out.reportInc = Array.isArray(p.reportInc) ? p.reportInc.filter(x => typeof x === 'string') : (typeof REPORT_SECTIONS !== 'undefined' ? REPORT_SECTIONS.filter(x => x.def).map(x => x.id) : null);
  out.risk = { haz: {}, extra: [], ...(p.risk && typeof p.risk === 'object' ? p.risk : {}) }; if (!out.risk.haz || typeof out.risk.haz !== 'object') out.risk.haz = {}; out.risk.extra = (Array.isArray(out.risk.extra) ? out.risk.extra : []).filter(x => x && typeof x === 'object');
  return out;
}
// ---------- several cranes on one plan ----------
function rigPick(p) { const o = {}; for (const k of CRANE_KEYS) o[k] = clone(p[k] ?? null); return o; }
function rigPark(p) { if (!p.cranes) p.cranes = []; p.cranes[num(p.activeCrane, 0)] = rigPick(p); }
function switchRig(i) { // make crane i the active (editable) crane
  const p = state.plan; i = Math.max(0, Math.min((p.cranes?.length || 1) - 1, i)); if (i === num(p.activeCrane, 0)) return false;
  rigPark(p); const r = p.cranes[i] || {}; for (const k of CRANE_KEYS) p[k] = clone(r[k] ?? (k === 'tele' ? { mode: 'auto', fr: [] } : k === 'attach' ? { type: 'none' } : k === 'acc' ? {} : k === 'outExt' ? { left: 'full', right: 'full' } : k === 'padMan' ? {} : ''));
  p.activeCrane = i; Scene.views = {}; if (state.twin) state.twin.reframe(); return true;
}
function selectLoad(i) { const p = state.plan; p.activeLoad = Math.max(0, Math.min(p.loads.length - 1, i)); switchRig(num(p.loads[p.activeLoad].crane, 0)); }
function addRig(craneId) { const p = state.plan; rigPark(p); const r = rigPick(p); p.cranes.push(r); const i = p.cranes.length - 1; p.loads[activeLi()].crane = i; switchRig(i); if (craneId) { setCrane(craneId); } return i; }
function removeRig(i) {
  const p = state.plan; if (!p.cranes || p.cranes.length < 2) return; rigPark(p);
  p.cranes.splice(i, 1); p.loads.forEach(l => { if (l.crane === i) l.crane = 0; else if (l.crane > i) l.crane--; });
  const act = num(p.activeCrane, 0); const keep = act === i ? 0 : act > i ? act - 1 : act; p.activeCrane = -1; switchRig(keep);
}
function setLoadRig(li, i) { const p = state.plan; p.loads[li].crane = i; if (li === activeLi()) switchRig(i); }
function curCrane() { const cr = cranes(); return cr.find(c => c.id === state.plan.craneId) || cr[0]; }
function curChart() { const c = curCrane(); const ch = c?.charts?.[+state.plan.chartIdx]; return { crane: c, ch, parsed: ch ? getChart(ch) : null }; }
function loadCol(li) { const crane = curCrane(); const L = state.plan.loads[li]; const G = geoSetup(state.plan, crane, L); return { ch: G.gChart, cap: G.chartDef, parsed: G.parsed, ci: G.ci, col: G.col, G, crane }; }
function angleName(ch) { return ch?.kind === 'luffing' ? 'Jib angle' : 'Boom angle'; }
function activeLi() { return Math.min(state.plan.loads.length - 1, +state.plan.activeLoad || 0); }
function radiusRange(li) {
  const { parsed, ci, G, crane } = loadCol(li);
  if (!parsed || G.manual || (G.boomOv > 0 && G.col && Math.abs(G.boomOv - G.col.L) > 0.05)) { const a = radiusFromAngle(crane, G.gChart, G.gCol, 84, G.boomOv), b = radiusFromAngle(crane, G.gChart, G.gCol, 1, G.boomOv); return [Math.max(0.5, Math.floor(Math.min(a, b))), Math.max(2, Math.ceil(Math.max(a, b)))]; }
  const rs = parsed.rows.filter(r => r[ci + 1] != null).map(r => r[0]); return rs.length ? [Math.max(0.5, rs[0]), rs[rs.length - 1]] : [1, 80];
}
function angleRange(ch) { return ch?.kind === 'luffing' ? [15, 87] : [0, 84]; }
function currentAngle(res, ch) { return ch?.kind === 'luffing' ? res.geo.gamma : res.geo.theta; }
