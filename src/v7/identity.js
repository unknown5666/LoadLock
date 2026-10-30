// ===== v11.1: who is signed in, who the plan is for, and the quick-setup wizard =====
// Profiles and clients live in this browser (lp.profiles, lp.clients), like plans. Reports carry the crane operator's branding (plan.client) and the signed-in person's
// details in the prepared-by block. Nothing here reaches the engine: it only changes names, logos and the first set-up of a plan.

// ---------- profiles ----------
const PROFILE_SEED = { Saad: { name: 'Saad Khan' }, Habib: { name: 'HABIB', title: 'Appointed Person' }, Saeed: { name: 'Saeed' } };
function curUser() { return (typeof V7 !== 'undefined' && V7.user) || (typeof authUser === 'function' ? authUser() : '') || ''; }
function profilesAll() { try { return LS.get('lp.profiles', {}) || {}; } catch { return {}; } }
function profileOf(u = curUser()) { return { name: '', title: '', certs: '', phone: '', email: '', sig: '', ...(PROFILE_SEED[u] || {}), ...(profilesAll()[u] || {}) }; }
function profileSave(p, u = curUser()) { const all = profilesAll(); all[u] = { ...(all[u] || {}), ...p }; LS.set('lp.profiles', all); }
// the person's own company stays on their reports only when they have one on file (Habib and Saeed: the company in Settings)
function userHasCompany(u = curUser()) { return !u || !!PROFILE_SEED[u] && u !== 'Saad'; }
function preparedByLine(plan = state.plan) { const n = profileOf().name || plan?.meta?.drawnBy || ''; const co = plan?.client?.company || ''; return co && n ? `${n}, for ${co}` : n || co; }

// ---------- the brand a document carries ----------
const initialsOf = (s) => String(s || '').trim().split(/\s+/).filter(w => /^[\p{L}\p{N}]/u.test(w)).slice(0, 3).map(w => w[0].toUpperCase()).join('');
function brandOverlay(s) {
  const cl = (typeof state !== 'undefined' && state.plan?.client) || {}; const co = String(cl.company || '').trim();
  if (co) {
    const lines = [cl.address, [cl.phone, cl.email].filter(Boolean).join('  ·  ')].filter(Boolean); delete s.logoId; delete s.logoData;
    return { ...s, company: co.toUpperCase(), logoImg: cl.logo || '', logoText: initialsOf(co), companyLines: lines, boomText: co.toUpperCase(), accent: cl.accent || '#1f5fa8', brandMode: 'client',
      copyright: `THIS DRAWING WAS PREPARED FOR ${co.toUpperCase()}. IT MAY NOT BE COPIED OR SHARED WITHOUT THEIR WRITTEN CONSENT.` };
  }
  if (userHasCompany()) return s;
  delete s.logoId; delete s.logoData;
  return { ...s, company: '', logoImg: '', logoText: '', companyLines: [], boomText: '', accent: '#1f5fa8', brandMode: 'none', copyright: 'THIS DRAWING MAY NOT BE COPIED OR SHARED WITHOUT WRITTEN CONSENT.' };
}
function docPrefix(S = settingsEff()) { return S.logoText || 'LP'; }
// fills the "drawn by" name for whoever is signed in; a name left over from another person's default never stays on a plan they did not start
function identityMeta(p) { if (!p?.meta) return p; const u = curUser(); if (!u) return p; const name = profileOf(u).name; if (!String(p.meta.drawnBy || '').trim() || (/^habib$/i.test(String(p.meta.drawnBy).trim()) && u !== 'Habib')) p.meta.drawnBy = name; return p; }

// ---------- clients ----------
function clientsAll() { try { return LS.get('lp.clients', []) || []; } catch { return []; } }
function clientSave(c) { const all = clientsAll(); const k = String(c.company || '').trim().toLowerCase(); if (!k) return; const i = all.findIndex(x => String(x.company).trim().toLowerCase() === k); const rec = { company: c.company, logo: c.logo || '', accent: c.accent || '', address: c.address || '', contact: c.contact || '', phone: c.phone || '', email: c.email || '' }; if (i >= 0) all[i] = { ...all[i], ...rec }; else all.push(rec); LS.set('lp.clients', all); }
// the strongest colour of a logo, for the rule and marks of the report
function logoAccent(url) { return new Promise((res) => { const im = new Image(); im.onload = () => { try { const n = 48, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'); g.drawImage(im, 0, 0, n, n); const d = g.getImageData(0, 0, n, n).data; const b = {}; for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); if (mx - mn < 60 || mx > 250 && mn > 200) continue; const k = (d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4); b[k] = (b[k] || 0) + 1; } const top = Object.entries(b).sort((x, y) => y[1] - x[1])[0]; if (!top) return res(''); const [r, gg, bb] = top[0].split(',').map(v => (+v << 4) + 8); res('#' + [r, gg, bb].map(v => v.toString(16).padStart(2, '0')).join('')); } catch { res(''); } }; im.onerror = () => res(''); im.src = url; }); }
async function pickLogo() { const f = await pickFile('image/png,image/jpeg,image/webp'); if (!f) return null; if (f.size > 900000) { toast('Logo too large (900 KB at most)'); return null; } const url = await readDataURL(f); return { logo: url, accent: await logoAccent(url) }; }

// ---------- the sections a plan can carry ----------
const WIZ_SECTIONS = [
  { id: 'ground', t: 'Ground bearing pressure', s: 'Leg loads, pressure under each mat, pass or fail' },
  { id: 'mats', t: 'Outrigger mats', s: 'Mat size for each kind of ground' },
  { id: 'rigging', t: 'Rigging calculations', s: 'Slings, shackles, tension and pre-use checks' },
  { id: 'exclusion', t: 'Exclusion zones', s: 'Drawn on the plan view and in the method statement' },
  { id: 'method', t: 'Method statement', s: 'Numbered steps from set-up to de-rig' },
  { id: 'risk', t: 'Risk assessment', s: '5 × 5 matrix and register' },
  { id: 'permit', t: 'Permit to lift and briefing', s: 'Permit, checks and toolbox-talk sign-in' },
  { id: 'emergency', t: 'Emergency and rescue plan', s: 'Stop-work triggers, recovery, contacts' },
  { id: 'panel', t: 'Sheet data panel', s: 'Every value the A1 sheet prints' },
  { id: 'a1', t: 'Full A1 sheet, fitted to a page', s: 'The whole drawing on one landscape page' }
];
function wizPreselect(a) {
  const heavy = a.type !== 'Routine'; const risky = heavy || a.lines || a.publicArea;
  return { ground: a.setup !== 'tyres', mats: a.setup !== 'tyres' && a.ground !== 'hard', rigging: true, exclusion: true, method: true, risk: true, permit: risky, emergency: risky, panel: true, a1: true };
}
function wizApplySections(p, on) {
  const base = ['cover', 'doc', 'summary', 'crane', 'chart', 'plan', 'elev', 'tandem', 'signoff'];
  p.reportInc = base.concat(Object.keys(on).filter(k => on[k] && !['mats', 'exclusion'].includes(k)));
  p.opt = { ...(p.opt || {}), mats: !!on.mats, exclusion: !!on.exclusion };
  if (p.outrigger) p.outrigger.enabled = !!on.ground; if (p.rigging) p.rigging.enabled = !!on.rigging;
  if (p.sitePlan) p.sitePlan.enabled = true;
}

// ---------- quick setup ----------
const WIZ_STEPS = ['Who is it for?', 'What kind of lift?', 'Which crane?', 'The load', 'The site', 'What goes in the plan?'];
function wizNew() { return { step: 0, company: '', logo: '', accent: '', address: '', project: '', site: '', ref: '', contact: '', phone: '', email: '', type: 'Routine', craneId: '', setup: 'full', cwt: '', title: '', w: '', R: '', hi: '', side: 'rear', ground: 'unknown', lines: false, lineH: '', lineX: '', lineSafe: '', publicArea: false, sections: null }; }
function wizStart() { const co = document.getElementById('coach'); if (co) co.remove(); V7.coach = null; LS.set('lp.coach7', true); V7.wiz = wizNew(); openSheet('wizard'); }
const wf = (k, label, o = {}) => `<label class="it wz-f"><span class="lb"><b>${h(label)}</b>${o.sub ? `<small>${h(o.sub)}</small>` : ''}</span><input class="fld${o.num ? ' num' : ''}" ${o.num ? 'inputmode="decimal"' : ''} type="text" autocomplete="off" data-w="${k}" value="${h(V7.wiz[k] ?? '')}" placeholder="${h(o.ph || '')}" aria-label="${h(label)}"></label>`;
const wchip = (k, v, label, on) => `<button type="button" class="chip tap" data-wa="set" data-k="${k}" data-v="${h(v)}" aria-pressed="${!!on}">${h(label)}</button>`;
function wizCraneRows() {
  const w = V7.wiz; return cranes().map(c => { const on = w.craneId === c.id; return `<button type="button" class="it tap wz-crane" data-wa="set" data-k="craneId" data-v="${h(c.id)}" aria-pressed="${on}"><span class="lb"><b>${h(c.make || '')} ${h(c.model)}</b><small>${c.cls ? c.cls + ' t' : ''} ${h((c.type || '').toLowerCase())}</small></span>${on ? ic('check', 20, 2.6) : ''}</button>`; }).join('');
}
function wizBody() {
  const w = V7.wiz; const S = w.step; let b = '';
  if (S === 0) {
    const saved = clientsAll();
    if (saved.length) b += grp('Saved clients', `<div class="chips">${saved.map((c, i) => `<button type="button" class="chip tap" data-wa="client" data-v="${i}" aria-pressed="${w.company === c.company}">${h(c.company)}</button>`).join('')}</div>`, { raw: true });
    b += grp('Client', wf('company', 'Company', { ph: 'e.g. City Star Cranes' }) + `<button type="button" class="it tap" data-wa="logo"><span class="lb"><b>Logo</b><small>${w.logo ? 'Goes on the cover and every page' : 'PNG or JPG. Goes on the cover and every page'}</small></span>${w.logo ? `<img src="${h(w.logo)}" alt="Client logo" style="max-height:36px;max-width:110px">` : ic('plus', 20, 2.4)}</button>` + wf('contact', 'Contact person') + wf('phone', 'Contact phone') + wf('email', 'Contact email'));
    b += grp('Job', wf('project', 'Project name') + wf('site', 'Site or location') + wf('ref', 'Reference number', { ph: 'Auto if empty' }));
  } else if (S === 1) {
    const T = { Routine: 'Everyday lift, known load, clear site', Critical: 'Near the limit, near people, or high value', Complex: 'Blind lift, tight site, special rigging', Tandem: 'Two or more cranes on one load' };
    b += grp('Lift type', LIFT_TYPES.map(t => `<button type="button" class="it tap" data-wa="set" data-k="type" data-v="${t}" aria-pressed="${w.type === t}"><span class="lb"><b>${t}</b><small>${T[t] || ''}</small></span>${w.type === t ? ic('check', 20, 2.6) : ''}</button>`).join(''));
    b += grp('Load name', wf('title', 'What is being lifted?', { ph: 'e.g. Precast panel' }));
  } else if (S === 2) {
    b += grp('Crane', wizCraneRows());
    const c = cranes().find(x => x.id === w.craneId);
    if (c) {
      const has = (s) => (c.charts || []).some(ch => chartSetup(ch) === s);
      b += grp('Outriggers', `<div class="chips">${[['full', 'Full'], ['half', 'Half'], ['retracted', 'Retracted'], ['tyres', 'On tyres']].map(([v, l]) => wchip('setup', v, l + (has(v) ? '' : ' · chart not loaded'), w.setup === v)).join('')}</div>`, { raw: true });
      const cws = dutyCwts(c, { kind: 'main', yguy: false, superlift: false, setup: w.setup }); if (cws.length) b += grp('Counterweight fitted', `<div class="chips">${cws.map(v => wchip('cwt', v, fmt(v, 2) + ' t', String(w.cwt) === String(v))).join('')}</div>`, { raw: true });
    }
  } else if (S === 3) {
    b += grp('Load', wf('w', 'Weight', { num: 1, sub: 'Tonnes, without hook block or rigging', ph: '0' }) + wf('R', 'Working radius', { num: 1, sub: 'Metres from the slew centre', ph: '0' }) + wf('hi', 'Height of the landing above ground', { num: 1, sub: 'Metres', ph: '0' }));
    b += grp('Lift over', `<div class="chips">${[['rear', 'Rear'], ['left', 'Left'], ['right', 'Right'], ['front', 'Front']].map(([v, l]) => wchip('side', v, l, w.side === v)).join('')}</div>`, { raw: true });
  } else if (S === 4) {
    b += grp('Ground under the crane', `<div class="chips">${[['unknown', 'Not known yet'], ['hard', 'Hard, concrete'], ['firm', 'Firm gravel'], ['soft', 'Soft or filled']].map(([v, l]) => wchip('ground', v, l, w.ground === v)).join('')}</div>`, { raw: true });
    b += grp('On site', `<button type="button" class="it tap" data-wa="toggle" data-k="lines" aria-pressed="${w.lines}"><span class="lb"><b>Power lines nearby</b><small>Adds them to the drawings and the clearance check</small></span>${w.lines ? ic('check', 20, 2.6) : ''}</button><button type="button" class="it tap" data-wa="toggle" data-k="publicArea" aria-pressed="${w.publicArea}"><span class="lb"><b>Public or live traffic close by</b><small>Adds the permit and emergency plan</small></span>${w.publicArea ? ic('check', 20, 2.6) : ''}</button>`);
    if (w.lines) b += grp('Power line', wf('lineX', 'Distance from the crane', { num: 1, sub: 'Metres', ph: '0' }) + wf('lineH', 'Height of the line', { num: 1, sub: 'Metres', ph: '0' }) + wf('lineSafe', 'Clearance the utility requires', { num: 1, sub: 'Metres, from the utility\'s letter', ph: '0' }));
  } else {
    if (!w.sections) w.sections = wizPreselect(w);
    b += grp('Sections', WIZ_SECTIONS.map(x => `<label class="it"><span class="lb"><b>${h(x.t)}</b><small>${h(x.s)}</small></span><span class="sw"><input type="checkbox" data-wsec="${x.id}" aria-label="${h(x.t)}"${w.sections[x.id] ? ' checked' : ''}><i></i></span></label>`).join(''), { foot: 'Picked from your answers. Anything off leaves the plan completely, with no empty pages.' });
  }
  const dots = `<div class="wz-dots" role="progressbar" aria-valuemin="1" aria-valuemax="${WIZ_STEPS.length}" aria-valuenow="${S + 1}" aria-label="Step ${S + 1} of ${WIZ_STEPS.length}">${WIZ_STEPS.map((_, i) => `<i class="${i <= S ? 'on' : ''}"></i>`).join('')}</div>`;
  const err = w.err ? `<p class="wz-err" role="alert">${h(w.err)}</p>` : '';
  return `${dots}<h2 class="wz-q">${h(WIZ_STEPS[S])}</h2>${b}${err}<div class="wz-nav">${S > 0 ? '<button type="button" class="btn tap" data-wa="back">Back</button>' : '<button type="button" class="btn plain tap" data-wa="skip">Skip, blank plan</button>'}<button type="button" class="btn pri tap" data-wa="${S === WIZ_STEPS.length - 1 ? 'finish' : 'next'}">${S === WIZ_STEPS.length - 1 ? 'Build the plan' : 'Next'}</button></div>`;
}
SH.wizard = { title: () => 'New plan', icon: 'file', body: wizBody };
function wizCheck() {
  const w = V7.wiz; const n = (k) => parseFloat(String(w[k]).replace(',', '.'));
  if (w.step === 0 && !String(w.company).trim()) return 'Type the client company.';
  if (w.step === 2 && !w.craneId) return 'Pick a crane.';
  if (w.step === 3 && !(n('w') > 0)) return 'Type the weight of the load.';
  if (w.step === 3 && !(n('R') > 0)) return 'Type the working radius.';
  return '';
}
function wizFinish() {
  const w = V7.wiz; const n = (k, d = 0) => { const v = parseFloat(String(w[k]).replace(',', '.')); return isFinite(v) ? v : d; };
  const client = { company: w.company.trim(), logo: w.logo, accent: w.accent, address: w.address, contact: w.contact, phone: w.phone, email: w.email, project: w.project, site: w.site, ref: w.ref };
  clientSave(client);
  const p = normalizePlan(blankPlan()); p.client = client; p.name = [w.company, w.project].filter(Boolean).join(' · ') || 'New plan';
  p.meta = { ...p.meta, client: client.company, project: w.project, title: w.title ? 'Lifting ' + w.title.toLowerCase() : (w.project || 'Lifting plan'), drawingNo: w.ref, drawnBy: profileOf().name };
  p.docs = { ...(p.docs || {}), address: w.site, clientRep: w.contact, clientPhone: w.phone };
  const l = p.loads[0]; l.name = w.title; l.w = n('w'); l.R = n('R'); l.side = w.side; l.liftType = w.type; if (n('hi') > 0) l.landY = n('hi');
  p.outExt = w.setup === 'half' ? { left: 'half', right: 'half' } : { left: 'full', right: 'full' }; p.outSetup = w.setup === 'retracted' || w.setup === 'tyres' ? w.setup : '';
  if (w.lines) { p.site.obstacles.push({ type: 'pole', x: n('lineX', 10), y: 0, w: 2.4, h: n('lineH', 12), live: true, safe: n('lineSafe', 0), label: 'Power line' }); }
  if (w.ground !== 'unknown') p.outrigger.ground = { hard: 'concrete', firm: 'gravel', soft: 'soft' }[w.ground] || p.outrigger.ground;
  wizApplySections(p, w.sections || wizPreselect(w));
  V7.wiz = null; closeSheet(true); openPlan(p); setCrane(w.craneId);
  if (w.cwt !== '') state.plan.cwt = num(w.cwt);
  applyDuty({ quiet: true }); toast('Plan built. Check the numbers, then share it.');
}
if (typeof document !== 'undefined') {
  document.addEventListener('input', (e) => { const t = e.target; if (t.dataset?.w && V7.wiz) V7.wiz[t.dataset.w] = t.value; if (t.dataset?.pf) { const pf = {}; pf[t.dataset.pf] = t.value; profileSave(pf); } if (t.dataset?.cl && state.plan) { state.plan.client = { ...(state.plan.client || {}), [t.dataset.cl]: t.value }; if (t.dataset.cl === 'company') state.plan.meta.client = t.value; if (t.dataset.cl === 'project') state.plan.meta.project = t.value; if (t.dataset.cl === 'ref') state.plan.meta.drawingNo = t.value; markDirty(); } });
  document.addEventListener('change', (e) => { const t = e.target; if (t.dataset?.wsec && V7.wiz?.sections) V7.wiz.sections[t.dataset.wsec] = t.checked; });
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-wa]'); if (!b || !V7.wiz) return; const w = V7.wiz; const a = b.dataset.wa; w.err = '';
    if (a === 'set') { w[b.dataset.k] = b.dataset.v; if (b.dataset.k === 'craneId') { const c = cranes().find(x => x.id === w.craneId); w.cwt = c?.cwt ?? ''; w.setup = 'full'; } }
    else if (a === 'toggle') w[b.dataset.k] = !w[b.dataset.k];
    else if (a === 'client') { const c = clientsAll()[+b.dataset.v]; if (c) Object.assign(w, c); }
    else if (a === 'logo') { const r = await pickLogo(); if (r) Object.assign(w, r); }
    else if (a === 'back') w.step = Math.max(0, w.step - 1);
    else if (a === 'next') { const m = wizCheck(); if (m) w.err = m; else { w.step++; if (w.step === WIZ_STEPS.length - 1) w.sections = wizPreselect(w); } }
    else if (a === 'skip') { V7.wiz = null; closeSheet(true); const p = identityMeta(normalizePlan(blankPlan())); openPlan(p); toast('New plan started'); return; }
    else if (a === 'finish') { wizFinish(); return; }
    sheetRender(); const bd = $('#shB'); if (bd && a !== 'set' && a !== 'toggle') bd.scrollTop = 0;
  });
}

// ---------- profile ----------
SH.profile = {
  title: () => 'My profile', icon: 'user',
  body() {
    const p = profileOf(); const pf = (k, label, ph = '') => `<label class="it"><span class="lb"><b>${h(label)}</b></span><input class="fld" type="text" autocomplete="off" data-pf="${k}" value="${h(p[k] || '')}" placeholder="${h(ph)}" aria-label="${h(label)}"></label>`;
    return grp('On every plan you prepare', pf('name', 'Name', 'Your full name') + pf('title', 'Title', 'e.g. Lifting Engineer') + pf('certs', 'Certifications', 'e.g. CPCS A61, BS 7121 Appointed Person') + pf('phone', 'Phone') + pf('email', 'Email'), { foot: 'Prepared-by, signature and contact fields come from here.' })
      + grp('Signature', `<button type="button" class="it tap" data-sa="pfSig"><span class="lb"><b>${p.sig ? 'Replace your signature' : 'Add your signature'}</b><small>A picture on a white background</small></span>${p.sig ? `<img src="${h(p.sig)}" alt="Your signature" style="max-height:40px;max-width:130px">` : ic('plus', 20, 2.4)}</button>${p.sig ? '<button type="button" class="it tap" data-sa="pfSigDel"><span class="lb"><b>Remove signature</b></span></button>' : ''}`);
  }
};
SA_EXTRA.pfSig = async () => { const f = await pickFile('image/png,image/jpeg,image/webp'); if (!f) return; if (f.size > 500000) { toast('Signature too large (500 KB at most)'); return; } profileSave({ sig: await readDataURL(f) }); sheetRender(); };
SA_EXTRA.pfSigDel = () => { profileSave({ sig: '' }); sheetRender(); };

// ---------- who this plan is for (edit after the wizard) ----------
SH.client = {
  title: () => 'Who is this plan for?', icon: 'file',
  body() {
    const c = state.plan.client || {}; const cf = (k, label, ph = '') => `<label class="it"><span class="lb"><b>${h(label)}</b></span><input class="fld" type="text" autocomplete="off" data-cl="${k}" value="${h(c[k] || '')}" placeholder="${h(ph)}" aria-label="${h(label)}"></label>`;
    const saved = clientsAll();
    return (saved.length ? grp('Saved clients', `<div class="chips">${saved.map((x, i) => `<button type="button" class="chip tap" data-sa="clPick" data-v="${i}" aria-pressed="${c.company === x.company}">${h(x.company)}</button>`).join('')}</div>`, { raw: true }) : '')
      + grp('Client', cf('company', 'Company', 'e.g. City Star Cranes') + `<button type="button" class="it tap" data-sa="clLogo"><span class="lb"><b>Logo</b><small>On the cover and every page</small></span>${c.logo ? `<img src="${h(c.logo)}" alt="Client logo" style="max-height:36px;max-width:110px">` : ic('plus', 20, 2.4)}</button>` + cf('address', 'Address') + cf('contact', 'Contact person') + cf('phone', 'Contact phone') + cf('email', 'Contact email'))
      + grp('Job', cf('project', 'Project name') + cf('site', 'Site or location') + cf('ref', 'Reference number'))
      + grp('', '<button type="button" class="it accent tap" data-sa="clSave"><span class="lb"><b>Save this client for next time</b></span></button>');
  }
};
SA_EXTRA.clPick = (d) => { const c = clientsAll()[+d.v]; if (!c) return; state.plan.client = { ...(state.plan.client || {}), ...c }; state.plan.meta.client = c.company; commit({ sheet: true }); sheetRender(); };
SA_EXTRA.clLogo = async () => { const r = await pickLogo(); if (!r) return; state.plan.client = { ...(state.plan.client || {}), ...r }; commit({ sheet: true }); sheetRender(); };
SA_EXTRA.clSave = () => { clientSave(state.plan.client || {}); toast('Client saved'); sheetRender(); };
