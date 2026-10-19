// ===== Site induction: guided tour with a gliding spotlight, hands-on steps and a certificate at the end =====
const Tour = { on: false, i: 0, el: null, stash: null, tick: 0, base: null, done: {}, keyH: null, task: null, adv: 0, down: false, raf: 0, cur: [], tgt: [], over: false, near: 0, wasFail: false, t0: 0 };
const tourV = (v) => typeof v === 'function' ? v() : v;
const tourLoad = () => state.calc?.loads?.[activeLi()];
const tourPct = () => { const r = tourLoad(); return r?.util != null ? r.util.toFixed(1) + ' %' : '—'; };
const tourInsp = () => window.matchMedia('(max-width: 1240px)').matches;
const tourVis = (el) => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
function tourPanel(open) { const w = $('#work'); if (!w) return; if (tourInsp()) w.classList.toggle('in-open', !!open); }
function tourDrawer(open) { const w = $('#work'); if (!w) return; if (open) w.classList.remove('dr-off'); else if (isMobile()) w.classList.add('dr-off'); railState(); }
const TOUR_STEPS = [
  { icon: 'star', title: () => `Hard hat on, ${AUTH.user}.`, body: 'Two minutes, hands on. We\'ll plan a real lift together — an LTM1250 setting precast panels over a school. Your own plan is parked safely and comes straight back at the end.', next: 'Let\'s lift', center: true },
  { icon: 'crane', target: () => $('#rail'), side: 'right', title: 'Your toolbox', body: 'Six sections, in the order a plan comes together: <b>Job → Crane → Lift → Site → Weather → Sheet</b>. A red or amber square on an icon means a check in that section needs you.', before: () => { tourDrawer(false); tourPanel(false); } },
  { icon: 'crane', target: () => $('.ccard'), side: 'right', title: 'Pick your machine', body: 'The whole fleet, each with its real boom range and load charts. <b>Which crane?</b> asks five questions and ranks every machine for the lift.', before: () => { setSection('crane', true); tourDrawer(true); } },
  { icon: 'fit', target: () => $('#cv'), side: 'left', title: 'Model space', body: 'Everything here is to scale. Drag the <b style="color:var(--amber)">amber dot</b> to move the crane, the <b style="color:var(--magenta)">magenta diamond</b> to move the load. Scroll to zoom, double-click to fit. Dimensions redraw as you go.', before: () => { tourDrawer(false); if (state.view !== 'elev') setView('elev'); } },
  { icon: 'lift', target: () => $('.dial[data-dial="R"]'), side: 'top', title: 'Swing the radius', body: 'This is the cab — every crane control in one place. <b>Radius</b> is how far the hook is from the crane. Type a number or drag the slider: the boom moves, the hook moves and the capacity changes live.', task: 'Change the radius by a couple of metres', start: () => ({ R: num(state.plan.loads[activeLi()].R), a: num(state.plan.loads[activeLi()].angle) }), wait: (b) => { const l = state.plan.loads[activeLi()]; return Math.abs(num(l.R) - b.R) >= 1.5 || Math.abs(num(l.angle) - b.a) >= 2; } },
  { icon: 'crane', target: () => $('.dial[data-dial="L"]'), side: 'top', title: 'Telescope the boom', body: 'Type a boom length or drag. See how the radius stays put? It\'s <b style="color:var(--amber)">held</b> — the amber one never moves. Tap <b>Hold</b> on another box (angle or tip height) to keep that one fixed instead.', task: 'Change the boom length by 2 m or more', start: () => ({ L: num(tourLoad()?.tele?.L) }), wait: (b) => Math.abs(num(tourLoad()?.tele?.L) - b.L) >= 1.9 },
  { icon: 'hook', target: () => [$('.dk-w'), $('#dkEmpty'), $('#dkCont'), $('#dkDaf'), $('#dkTk')].filter(Boolean), side: 'top', title: 'What\'s on the hook', body: '<b>Load</b> = the weight of the item. <b>Contingency</b> = a safety margin on top. <b>DAF</b> = extra pull from the load bouncing. <b>Tackles</b> = slings, shackles and beams. <b>Empty hook</b> shows the crane with nothing on. Tap any of them — each one explains itself.' },
  { icon: 'plus', target: () => $('.dk-acc'), side: 'top', title: 'Bolt-ons', body: 'Only what this machine actually carries — fly jib, luffing jib, superlift, Y-guying, runner. Switch one on and it\'s drawn on the elevation, in 3D and on the sheet.' },
  { icon: 'panel', target: () => Tour.over && tourInsp() ? $('.dial[data-dial="R"]') : $('.gauge'), extra: () => Tour.over && !tourInsp() ? [$('.dial[data-dial="R"]')] : [], side: 'left',
    title: () => Tour.over ? 'Whoa. Red.' : 'The LMI',
    body: () => Tour.over ? `You just pushed it to <b style="color:var(--fail)">${tourPct()}</b> of the chart — a real LMI would cut the hoist right there. Pull the radius in, or shorten the boom, until the gauge drops out of the red.` : `Utilisation against the load chart — right now <b>${tourPct()}</b>. <b style="color:var(--ok)">Green</b> is fine, <b style="color:var(--amber)">amber</b> is a critical lift for the AP to sign, <b style="color:var(--fail)">red</b> means change something. It moves with every drag.`,
    task: () => Tour.over ? 'Get the LMI out of the red' : null, live: () => tourPct(), wait: () => utilCls(tourLoad()) !== 'fail',
    before: () => { Tour.over = utilCls(tourLoad()) === 'fail'; tourPanel(!(Tour.over && tourInsp())); } },
  { icon: 'job', target: () => $('#inspIn .isec'), side: 'left', title: 'Every check, live', body: 'Capacity, headroom, boom clearance, sling angles, ground bearing, wind at the tip. Anything red here and the plan isn\'t ready to issue.', before: () => tourPanel(true) },
  { icon: 'site', target: () => [$('#addMenu > summary'), $('#addMenu[open] .menu-pop')], side: 'right', title: 'Build the site', body: 'Drop in the building, trailer, tower crane or tree in the lift zone and drag it into place. The dashed line shows exactly how much room the boom has.', task: 'Open Add and put something on the site', before: () => { tourPanel(false); if (state.view !== 'elev') setView('elev'); }, start: () => ({ n: state.plan.site.obstacles.length }), wait: (b) => state.plan.site.obstacles.length > b.n },
  { icon: 'measure', target: () => $('[data-act="measure"]'), side: 'right', title: 'Measure anything', body: 'Click two points for the true distance, with Δx and Δy. Perfect for checking an edge distance or a setback. Shortcut: <b>M</b>.', before: () => { const m = $('#addMenu'); if (m) m.open = false; if (state.sel) { state.sel = Scene.sel = null; state.selEdit = false; hudTools(); sceneDirty(); } } },
  { icon: 'cube', target: () => isMobile() ? $('#mvSw') : $('#vsw'), side: 'bottom', title: 'Four ways to look at it', body: 'Elevation, site plan, a live 3D twin, and the A1 sheet exactly as it prints. Keys <b>1–4</b> flip between them.', task: 'Open the 3D view', wait: () => state.view === '3d' },
  { icon: 'cube', target: () => $('#cv'), side: 'left', title: 'Walk around it', body: 'Drag to orbit, right-drag to pan, scroll to zoom. <b>Iso / Side / Top</b> snap the camera. Same plan, same numbers — just far more convincing in a client meeting.', before: () => { if (state.view !== '3d') setView('3d'); } },
  { icon: 'weather', target: () => $('#wxChip'), side: 'bottom', title: 'Check the sky', body: 'Add the lift location and date: wind is worked out at the boom-tip height, gusts are checked against the permitted wind, storms and rain are flagged — and it all prints on the sheet.', before: () => { if (state.view !== 'elev') setView('elev'); } },
  { icon: 'sheet', target: () => $('#cv'), side: 'left', title: 'The A1 sheet', body: 'What you issue: load chart, crane dimensions, the elevation, tables and the title block. Pick a layout and frame the view under <b>Sheet</b>.', before: () => { if (state.view !== 'sheet') setView('sheet'); } },
  { icon: 'dl', target: () => $('#bPdf'), side: 'bottom', title: 'Ship it', body: 'PDF at A1 or A3, or a DXF that opens in AutoCAD at true size. <b>Save</b> (Ctrl S) keeps the plan in the shared library for the team.', before: () => { if (state.view !== 'elev') setView('elev'); } },
  { finale: true, center: true }
];
function tourInvite() {
  if (Tour.on || $('#tourInvite') || document.body.classList.contains('locked')) return;
  const d = document.createElement('div'); d.id = 'tourInvite'; d.className = 'tinv';
  d.innerHTML = `<div class="tinv-ico">${ico('star', 18)}</div><div><b>First time in?</b><span>Take the 2-minute site induction — hands on, no hard hat required.</span></div><div class="tinv-a"><button type="button" class="btn primary sm" data-tinv="go">Start</button><button type="button" class="btn ghost sm" data-tinv="later">Later</button></div>`;
  document.body.appendChild(d);
  d.addEventListener('click', (e) => { const b = e.target.closest('[data-tinv]'); if (!b) return; LS.set('lp.toured', true); d.remove(); if (b.dataset.tinv === 'go') tourStart(); });
}
function tourStart() {
  if (Tour.on || !state.started) return; $('#tourInvite')?.remove(); LS.set('lp.toured', true);
  $$('details.menu[open]').forEach(m => m.open = false); if (state.page) closePage(); $('.wiz-back')?.remove(); const wz = $('#wizard'); if (wz) wz.hidden = true;
  Tour.stash = { plan: clone(state.plan), view: state.view, sec: state.sec, dirty: state.dirty, savedAt: state.savedAt, drOff: $('#work').classList.contains('dr-off'), inOpen: $('#work').classList.contains('in-open'), sel: state.sel };
  Tour.on = true; state.tour = true; Tour.done = {}; Tour.near = 0; Tour.wasFail = false; Tour.t0 = Date.now(); Tour.cur = []; Tour.tgt = []; Tour.adv = 0; Tour.down = false;
  Tour.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  openPlan(normalizePlan(SAMPLE_PLANS[0].make()), 'crane'); setView('elev');
  let el = $('#tour'); if (!el) { el = document.createElement('div'); el.id = 'tour'; document.body.appendChild(el); }
  el.className = 'tour'; el.hidden = false;
  el.innerHTML = `<svg class="tdim" aria-hidden="true"><defs><mask id="tMask"><rect width="100%" height="100%" fill="#fff"/><g id="tHoles" fill="#000"></g></mask></defs><rect class="tdim-fill" width="100%" height="100%" mask="url(#tMask)"/><path id="tBlock" fill-rule="evenodd"/></svg><div class="trings" aria-hidden="true"></div>
    <section class="tcard" role="dialog" aria-modal="false" aria-labelledby="tTitle" aria-describedby="tBody"><div class="ttop"><span class="tico" id="tIco"></span><span class="tstep" id="tStep"></span><span class="tbar" aria-hidden="true">${TOUR_STEPS.map(() => '<i></i>').join('')}</span><button type="button" class="tx" data-tact="skip" aria-label="End the tour">${ico('x', 14)}</button></div>
      <h3 id="tTitle"></h3><p id="tBody" aria-live="polite"></p><div class="ttask" id="tTask" hidden><span class="ttask-l"></span><span class="ttask-s"></span></div>
      <div class="tact"><button type="button" class="btn ghost sm" data-tact="back">Back</button><span class="sp"></span><button type="button" class="btn ghost sm" data-tact="skipstep" id="tSkipStep" hidden>Skip this</button><button type="button" class="btn primary sm" data-tact="next" id="tNext">Next</button></div></section>
    <canvas class="tconf" id="tConf" aria-hidden="true"></canvas>`;
  el.onclick = (e) => { const b = e.target.closest('[data-tact]'); if (!b) return; const a = b.dataset.tact; if (a === 'next' || a === 'skipstep') tourGo(Tour.i + 1); else if (a === 'back') tourGo(Math.max(0, Tour.i - 1)); else if (a === 'skip') tourEnd(false); else if (a === 'restore') tourEnd(false); else if (a === 'keep') tourEnd(true); };
  Tour.keyH = (e) => { if (!Tour.on) return; const tag = (e.target.tagName || '').toLowerCase(); if (['input', 'select', 'textarea'].includes(tag)) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); tourEnd(false); } else if (e.key === 'ArrowRight' || (e.key === 'Enter' && e.target === document.body)) { if (!Tour.task || Tour.done[Tour.i]) { e.preventDefault(); tourGo(Tour.i + 1); } } else if (e.key === 'ArrowLeft') { e.preventDefault(); tourGo(Math.max(0, Tour.i - 1)); } };
  Tour.downH = (e) => { if (e.type === 'pointerdown') Tour.down = true; else Tour.down = false; };
  document.addEventListener('keydown', Tour.keyH, true);
  ['pointerdown', 'pointerup', 'pointercancel'].forEach(t => window.addEventListener(t, Tour.downH, true));
  window.addEventListener('resize', tourPlace);
  clearInterval(Tour.tick); Tour.tick = setInterval(() => { tourPlace(); tourCheck(); }, 200);
  requestAnimationFrame(() => el.classList.add('in'));
  tourGo(0); tourAnim();
}
function tourGo(i) {
  if (!Tour.on) return; i = Math.max(0, Math.min(TOUR_STEPS.length - 1, i)); Tour.i = i; Tour.adv = 0; const st = TOUR_STEPS[i];
  try { st.before?.(); } catch (e) { console.error(e); }
  Tour.base = st.start ? st.start() : null; Tour.task = tourV(st.task) || null;
  const card = $('#tour .tcard'); card.classList.remove('done', 'fin', 'hot'); card.classList.add('swap'); setTimeout(() => card.classList.remove('swap'), 260);
  $$('#tour .tbar i').forEach((b, k) => b.className = k < i ? 'on' : k === i ? 'cur' : '');
  if (st.finale) { tourFinale(); return; }
  $('#tIco').innerHTML = ico(st.icon || 'star', 15); $('#tStep').textContent = i === 0 ? 'SITE INDUCTION' : `STEP ${String(i).padStart(2, '0')} / ${TOUR_STEPS.length - 2}`;
  $('#tTitle').textContent = tourV(st.title); $('#tBody').innerHTML = tourV(st.body);
  card.classList.toggle('hot', !!(Tour.task && st.live));
  const tk = $('#tTask'); tk.hidden = !Tour.task; if (Tour.task) { tk.className = 'ttask'; tk.querySelector('.ttask-l').textContent = 'Try it — ' + Tour.task; tk.querySelector('.ttask-s').textContent = Tour.done[i] ? 'Done' : st.live ? st.live() : 'waiting for you'; }
  const nx = $('#tNext'); nx.dataset.tact = 'next'; $('#tour [data-tact="keep"]')?.remove();
  nx.textContent = st.next || (i === TOUR_STEPS.length - 2 ? 'Finish' : 'Next'); nx.disabled = !!(Tour.task && !Tour.done[i]);
  $('#tSkipStep').hidden = !(Tour.task && !Tour.done[i]); $('#tour [data-tact="back"]').style.visibility = i === 0 ? 'hidden' : '';
  tourPlace(); setTimeout(tourPlace, 60); setTimeout(tourPlace, 380);
  setTimeout(() => { if (!Tour.task && Tour.on) nx.focus({ preventScroll: true }); }, 80);
}
function tourCheck() {
  if (!Tour.on) return; const st = TOUR_STEPS[Tour.i];
  const fail = state.calc?.status === 'fail'; if (fail && !Tour.wasFail) Tour.near++; Tour.wasFail = fail;
  if (Tour.adv && performance.now() > Tour.adv && !Tour.down) { const at = Tour.i; Tour.adv = 0; tourGo(at + 1); return; }
  if (st?.live && Tour.task) { const s = $('#tTask .ttask-s'); if (s) s.textContent = st.live() + (Tour.done[Tour.i] ? ' · done' : ''); }
  if (!st?.task || !Tour.task || Tour.done[Tour.i]) return;
  let ok = false; try { ok = !!st.wait(Tour.base); } catch {}
  if (!ok) return;
  Tour.done[Tour.i] = true; const card = $('#tour .tcard'); card.classList.add('done'); card.classList.remove('hot');
  const tk = $('#tTask'); tk.classList.add('ok'); tk.querySelector('.ttask-l').textContent = ['Nailed it.', 'Smooth.', 'Textbook.', 'Boom. Literally.', 'Like a pro.', 'Hoist released.'][Tour.i % 6]; tk.querySelector('.ttask-s').textContent = st.live ? st.live() + ' · done' : 'Done';
  const nx = $('#tNext'); nx.disabled = false; $('#tSkipStep').hidden = true;
  const r = Tour.rect; if (r) tourConfetti(r.x + r.w / 2, r.y + r.h / 2, 34);
  Tour.adv = performance.now() + 1500;
}
const tourRectOf = (els, pad = 6) => { const W = innerWidth, H = innerHeight; els = [].concat(els || []).filter(tourVis); if (!els.length) return null; const rs = els.map(e => e.getBoundingClientRect()); const x0 = Math.min(...rs.map(q => q.left)), y0 = Math.min(...rs.map(q => q.top)), x1 = Math.max(...rs.map(q => q.right)), y1 = Math.max(...rs.map(q => q.bottom)); const r = { x: Math.max(4, x0 - pad), y: Math.max(4, y0 - pad), w: 0, h: 0 }; r.w = Math.min(W - 4, x1 + pad) - r.x; r.h = Math.min(H - 4, y1 + pad) - r.y; return r; };
const tourHit = (a, b) => a.x < b.x + b.w + 4 && b.x < a.x + a.w + 4 && a.y < b.y + b.h + 4 && b.y < a.y + a.h + 4;
function tourPlace() {
  const el = $('#tour'); if (!el || !Tour.on) return; const st = TOUR_STEPS[Tour.i]; const W = innerWidth, H = innerHeight;
  const r = st.center ? null : tourRectOf(st.target ? st.target() : null);
  Tour.rect = r;
  // spotlight holes: the main target, plus any extra ones (merged if they touch)
  const holes = r ? [r] : [];
  if (r && st.extra) for (const e of [].concat(st.extra() || [])) { const q = tourRectOf(e); if (!q) continue; const hit = holes.find(o => tourHit(o, q)); if (hit) { const x1 = Math.max(hit.x + hit.w, q.x + q.w), y1 = Math.max(hit.y + hit.h, q.y + q.h); hit.x = Math.min(hit.x, q.x); hit.y = Math.min(hit.y, q.y); hit.w = x1 - hit.x; hit.h = y1 - hit.y; } else holes.push(q); }
  Tour.tgt = holes.length ? holes : [{ x: W / 2, y: H / 2, w: 0, h: 0, z: 1 }];
  const bp = $('#tBlock'); if (bp) bp.setAttribute('d', `M0 0H${W}V${H}H0Z` + holes.map(c => `M${c.x.toFixed(1)} ${c.y.toFixed(1)}v${c.h.toFixed(1)}h${c.w.toFixed(1)}v${(-c.h).toFixed(1)}Z`).join(''));
  // callout placement: preferred side, then the others; docked on phones
  const card = $('.tcard', el); const cw = Math.min(card.offsetWidth || 360, W - 24), ch = card.offsetHeight || 220; let x, y;
  const avoid = holes;
  if (!r) { x = (W - cw) / 2; y = (H - ch) / 2; }
  else if (W < 700) { const below = r.y + r.h + 12, above = r.y - ch - 12; y = (H - (r.y + r.h)) > ch + 24 ? below : above > 8 ? above : H - ch - 74; x = (W - cw) / 2; }
  else {
    const gap = 16; const opts = { right: [r.x + r.w + gap, r.y + r.h / 2 - ch / 2], left: [r.x - cw - gap, r.y + r.h / 2 - ch / 2], bottom: [r.x + r.w / 2 - cw / 2, r.y + r.h + gap], top: [r.x + r.w / 2 - cw / 2, r.y - ch - gap] };
    const order = [st.side || 'right', 'right', 'left', 'bottom', 'top'];
    const cl = (c) => [Math.max(8, Math.min(W - cw - 8, c[0])), Math.max(8, Math.min(H - ch - 8, c[1]))];
    const cands = order.map(k => cl(opts[k])).concat([[W - cw - 16, H - ch - 16], [8, H - ch - 8], [W - cw - 8, 8], [8, 8]]);
    const ovl = ([px, py]) => avoid.reduce((a, q) => a + Math.max(0, Math.min(px + cw, q.x + q.w) - Math.max(px, q.x)) * Math.max(0, Math.min(py + ch, q.y + q.h) - Math.max(py, q.y)), 0);
    let best = cands[0], bs = Infinity; for (const c of cands) { const sc = ovl(c); if (sc < bs - 1) { bs = sc; best = c; } } [x, y] = best;
  }
  card.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  if (Tour.reduce) tourPaint(true);
}
// the spotlight glides: current holes ease toward their targets every frame; new holes split off the main one
function tourAnim() {
  cancelAnimationFrame(Tour.raf); let last = performance.now();
  const loop = (now) => { if (!Tour.on) return; const dt = Math.min(0.25, (now - last) / 1000); last = now; tourPaint(false, dt); Tour.raf = requestAnimationFrame(loop); };
  Tour.raf = requestAnimationFrame(loop);
}
function tourPaint(snap, dt = 0.016) {
  const el = $('#tour'); if (!el) return; const tg = Tour.tgt; const cur = Tour.cur;
  const k = snap ? 1 : 1 - Math.exp(-dt * 10);
  while (cur.length < tg.length) { const t = tg[cur.length]; cur.push(cur.length ? { x: t.x + t.w / 2, y: t.y + t.h / 2, w: 0, h: 0 } : { x: t.x, y: t.y, w: t.w, h: t.h }); }
  for (let i = 0; i < cur.length; i++) { const c = cur[i]; const t = tg[i] || { x: c.x + c.w / 2, y: c.y + c.h / 2, w: 0, h: 0, gone: true }; c.x += (t.x - c.x) * k; c.y += (t.y - c.y) * k; c.w += (t.w - c.w) * k; c.h += (t.h - c.h) * k; c.gone = !!t.gone; }
  for (let i = cur.length - 1; i > 0; i--) if (cur[i].gone && cur[i].w < 1.5 && cur[i].h < 1.5) cur.splice(i, 1);
  const hs = $('#tHoles'); if (hs) { while (hs.children.length < cur.length) hs.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'rect')); while (hs.children.length > cur.length) hs.lastElementChild.remove();
    [...hs.children].forEach((r, i) => { const c = cur[i]; r.setAttribute('x', c.x.toFixed(1)); r.setAttribute('y', c.y.toFixed(1)); r.setAttribute('width', Math.max(0, c.w).toFixed(1)); r.setAttribute('height', Math.max(0, c.h).toFixed(1)); }); }
  const box = $('.trings', el); if (!box) return;
  while (box.children.length < cur.length) { const g = document.createElement('div'); g.className = 'tring' + (box.children.length ? ' sub' : ''); g.innerHTML = '<i></i><i></i><i></i><i></i>'; box.appendChild(g); }
  while (box.children.length > cur.length) box.lastElementChild.remove();
  [...box.children].forEach((g, i) => { const c = cur[i]; const vis = !(tg[0]?.z) && !c.gone && c.w > 4; g.style.cssText = `transform:translate3d(${c.x.toFixed(1)}px,${c.y.toFixed(1)}px,0);width:${Math.max(0, c.w).toFixed(1)}px;height:${Math.max(0, c.h).toFixed(1)}px;opacity:${vis ? 1 : 0}`; });
}
function tourFinale() {
  const card = $('#tour .tcard'); card.classList.add('fin');
  const d = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const secs = Math.max(1, Math.round((Date.now() - Tour.t0) / 1000)); const tm = `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, '0')}s`;
  const near = Tour.near ? `<span>Near misses: ${Tour.near} <em>(all caught)</em></span>` : '<span>Near misses: 0</span>';
  $('#tIco').innerHTML = ico('star', 15); $('#tStep').textContent = 'COMPLETE';
  $('#tTitle').textContent = 'Inducted.';
  $('#tBody').innerHTML = `<span class="cert"><span class="cert-h">FHE LIFT PLANNER · SITE INDUCTION</span><span class="cert-l">This certifies that</span><span class="cert-n">${h(AUTH.user)}</span><span class="cert-l">has completed the planner induction and is cleared to plan lifts.</span><span class="cert-f"><span>${h(d)}</span><span>Time: ${tm}</span><span>Incidents: 0</span>${near}</span><span class="cert-stamp">PASSED</span></span>`;
  $('#tTask').hidden = true; $('#tSkipStep').hidden = true; $('#tour [data-tact="back"]').style.visibility = 'hidden';
  const nx = $('#tNext'); nx.disabled = false; nx.textContent = 'Back to my plan'; nx.dataset.tact = 'restore';
  let keep = $('#tour [data-tact="keep"]'); if (!keep) { keep = document.createElement('button'); keep.type = 'button'; keep.className = 'btn ghost sm'; keep.dataset.tact = 'keep'; keep.textContent = 'Keep the demo plan'; nx.before(keep); }
  tourPlace(); setTimeout(tourPlace, 30);
  setTimeout(() => nx.focus({ preventScroll: true }), 120);
  setTimeout(() => tourConfetti(innerWidth / 2, innerHeight * 0.42, 180), 120);
}
function tourEnd(keepDemo) {
  if (!Tour.on) return; Tour.on = false; state.tour = false; clearInterval(Tour.tick); cancelAnimationFrame(Tour.raf); window.removeEventListener('resize', tourPlace); document.removeEventListener('keydown', Tour.keyH, true);
  ['pointerdown', 'pointerup', 'pointercancel'].forEach(t => window.removeEventListener(t, Tour.downH, true));
  const el = $('#tour'); if (el) { el.classList.remove('in'); setTimeout(() => { if (!Tour.on) { el.hidden = true; el.innerHTML = ''; } }, 380); }
  const s = Tour.stash; Tour.stash = null; const w = $('#work');
  if (s && !keepDemo) { openPlan(s.plan, s.sec); state.dirty = s.dirty; state.savedAt = s.savedAt; updateSaveState(); setView(s.view); w.classList.toggle('dr-off', s.drOff); w.classList.toggle('in-open', s.inOpen); railState(); toast('Your plan is back — welcome aboard'); }
  else { if (keepDemo) { state.plan.id = null; state.plan.name = 'Demo — ' + state.plan.name; $('#planName').value = state.plan.name; markDirty(); toast('Demo plan kept — Save it if you want it in the library'); } w.classList.remove('in-open'); railState(); }
  draft(); refresh(true);
}
function tourConfetti(cx, cy, n = 120) {
  const cv = $('#tConf') || (() => { const c = document.createElement('canvas'); c.className = 'tconf'; c.id = 'tConf'; document.body.appendChild(c); return c; })();
  const dpr = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cols = ['#ffb81c', '#ffd166', '#ffffff', '#4fe0ff', '#2fe08a', '#16120a'];
  const ps = Array.from({ length: n }, () => { const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 5 + Math.random() * 9; return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: 4 + Math.random() * 7, h: 2 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0], s: Math.random() < 0.18 }; });
  const t0 = performance.now(); cancelAnimationFrame(tourConfetti.raf);
  const step = (now) => { const t = (now - t0) / 1000; g.clearRect(0, 0, innerWidth, innerHeight); let alive = false;
    for (const p of ps) { p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; if (p.y < innerHeight + 20) alive = true;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - t / 2.6);
      if (p.s) { g.fillStyle = '#ffb81c'; g.fillRect(-p.w, -p.h / 2, p.w * 2, p.h); g.fillStyle = '#16120a'; for (let k = -p.w; k < p.w; k += 4) g.fillRect(k, -p.h / 2, 2, p.h); } else { g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
      g.restore(); }
    if (alive && t < 2.8) tourConfetti.raf = requestAnimationFrame(step); else g.clearRect(0, 0, innerWidth, innerHeight); };
  tourConfetti.raf = requestAnimationFrame(step);
}
