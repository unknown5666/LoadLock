// ===== v10 Lift plan set: build, preview and download the multi-page drawing set (planset.js draws it) =====
IC.pages = 'M8 3h9l4 4v11H8zM16 3v5h5M4 7v14h11';

// the 3D stills: a wide one for the cover, a taller one for the isometric box on the general arrangement
function psShots(calc) {
  if (typeof C3D === 'undefined' || !C3D.ok()) return {};
  const c = calc.loads[activeLi()]?.crane || calc.crane; let host = null, tw = state.twin;
  try {
    if (!tw) { host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-99999px;top:0;width:700px;height:492px'; document.body.appendChild(host); tw = C3D.twin(host); }
    tw.update(state.plan, calc, c, livery());
    return { wide: tw.snapshot(1700, 1020, true), tall: tw.snapshot(1000, 1120, true) };
  } catch (e) { console.error(e); return {}; }
  finally { if (host) { try { tw.dispose(); } catch {} host.remove(); } }
}
async function planSetPages() {
  await ensureEnvLoaded(state.plan);
  const calc = state.calc || computePlan(state.plan, cranes(), settingsEff()); const sh = psShots(calc);
  const pages = buildPlanSet(state.plan, calc, settingsEff(), { shot: sh.wide, shotTall: sh.tall });
  const svgs = []; for (const pg of pages) svgs.push(await inlineImages(psPageSVG(pg)));
  return { pages, svgs, shot: !!sh.wide };
}
async function exportPlanSet(paper = 'A3') {
  const t0 = performance.now(); toast('Building the lift plan set…');
  try {
    if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('PDF library did not load');
    const { pages, svgs, shot } = await planSetPages();
    const [pw, ph] = paper === 'A1' ? [841, 594] : [PS.W, PS.H];
    const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: [pw, ph], compress: true });
    if (typeof PDF_FONTS !== 'undefined') {
      doc.addFileToVFS('LiberationSans-Regular.ttf', PDF_FONTS.regular); doc.addFont('LiberationSans-Regular.ttf', 'Arial', 'normal');
      doc.addFileToVFS('LiberationSans-Bold.ttf', PDF_FONTS.bold); doc.addFont('LiberationSans-Bold.ttf', 'Arial', 'bold');
    }
    const stage = $('#pdfStage');
    for (let i = 0; i < svgs.length; i++) {
      if (i) doc.addPage([pw, ph], 'landscape');
      stage.innerHTML = svgs[i]; const el = stage.querySelector('svg'); el.setAttribute('width', String(pw)); el.setAttribute('height', String(ph));
      await doc.svg(el, { x: 0, y: 0, width: pw, height: ph });
    }
    stage.innerHTML = '';
    doc.setProperties({ title: 'Lift plan — ' + fileBase(), subject: 'Lifting plan drawing set', creator: 'FHE Lift Planner ' + APP_VERSION });
    const blob = doc.output('blob'); const ms = performance.now() - t0; state.lastSet = { ms: Math.round(ms), bytes: blob.size, pages: pages.length, paper, shot };
    await offerFile(fileBase() + ' lift plan' + (paper === 'A1' ? ' (A1)' : '') + '.pdf', blob);
    toast(`Lift plan ready — ${pages.length} sheets in ${(ms / 1000).toFixed(1)} s`);
  } catch (e) { console.error(e); toast('Lift plan export failed: ' + e.message); }
}

// ---------- the page viewer: every sheet of the set, big, before it is printed ----------
let psvUrls = [];
async function openPlanSetView() {
  let ov = $('#psv');
  if (!ov) {
    ov = document.createElement('div'); ov.id = 'psv'; ov.className = 'psv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Lift plan sheets');
    ov.innerHTML = `<header class="psv-h"><button type="button" class="psv-x tap" data-psv="close" aria-label="Close">${ic('x', 22, 2.4)}</button><div class="psv-t"><b>Lift plan</b><small id="psvSub">Drawing the sheets…</small></div>
      <button type="button" class="btn sm tap" data-psv="A1" aria-label="Download as A1 PDF">A1</button><button type="button" class="btn pri sm tap" data-psv="A3">${ic('dl', 18, 2.4)}<span>Download PDF</span></button></header><div class="psv-b" id="psvB"></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', (e) => { const z = e.target.closest('.psv-im'); if (z) { z.classList.toggle('zoom'); return; } const b = e.target.closest('[data-psv]'); if (!b) return; const k = b.dataset.psv;
      if (k === 'close') closePlanSetView(); else { b.classList.add('busy'); exportPlanSet(k).finally(() => b.classList.remove('busy')); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#psv')?.hidden) closePlanSetView(); });
  }
  ov.hidden = false; requestAnimationFrame(() => ov.classList.add('on'));
  const B = $('#psvB'); B.innerHTML = `<p class="psv-wait">${ic('pages', 28, 2)}<span>Drawing the sheets…</span></p>`;
  try {
    const { pages, svgs } = await planSetPages();
    psvUrls.forEach(u => URL.revokeObjectURL(u)); psvUrls = svgs.map(s => URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' })));
    $('#psvSub').textContent = `${pages.length} sheets · A3 · ${state.calc.status === 'fail' ? 'has red items' : state.calc.status === 'warn' ? 'critical lift' : 'all checks pass'}`;
    B.innerHTML = pages.map((pg, i) => `<figure class="psv-pg"><div class="psv-im" role="button" tabindex="0" aria-label="Sheet ${i + 1}: ${h(pg.title)} — tap to zoom"><img src="${psvUrls[i]}" alt="Sheet ${i + 1}: ${h(pg.title)}" loading="lazy"></div><figcaption><b>${i + 1}</b>${h(pg.title)}</figcaption></figure>`).join('');
  } catch (e) { console.error(e); B.innerHTML = `<p class="psv-wait">Could not draw the sheets: ${h(e.message)}</p>`; }
}
function closePlanSetView() { const ov = $('#psv'); if (!ov) return; ov.classList.remove('on'); setTimeout(() => { if (!ov.classList.contains('on')) { ov.hidden = true; $('#psvB').innerHTML = ''; psvUrls.forEach(u => URL.revokeObjectURL(u)); psvUrls = []; } }, 300); }
SA_EXTRA.planSet = (d, b) => { if (d.v === 'view') { openPlanSetView(); return; } b.classList.add('busy'); exportPlanSet(d.v || 'A3').finally(() => b.classList.remove('busy')); };

// ---------- the title-block fields the set prints (Print → Lift plan details) ----------
SH.setInfo = {
  title: () => 'Lift plan details', icon: 'pages', sub: true,
  body() {
    const p = state.plan; const rigs = p.cranes || [];
    let out = note('', 'info', 'These go in the title block of every sheet of the lift plan, like a consultant\'s drawing set. Empty boxes print a dash.');
    out += grp('Who it is for', `${Fx.text('meta.client', 'Client')}${Fx.text('meta.project', 'Project')}${Fx.text('meta.contractor', 'Main contractor', { ph: 'e.g. the builder' })}${Fx.text('meta.subcontractor', 'Sub contractor', { ph: 'optional' })}`);
    out += grp('The drawing', `${Fx.text('meta.title', 'Drawing title', { ph: 'e.g. LIFTING PLAN FOR SPOOL' })}${Fx.text('meta.drawingNo', 'Drawing number', { ph: 'sheets get -01, -02 …' })}${Fx.text('meta.date', 'Date')}${Fx.text('meta.drawnBy', 'Drawn by')}${Fx.text('meta.checkedBy', 'Checked by (Appointed Person)')}`);
    out += grp('Crane centre coordinates', rigs.map((_, i) => { const pre = i === num(p.activeCrane, 0) ? '' : `cranes.${i}.`; return `${Fx.text(pre + 'gridN', `Crane ${i + 1} · plant north`, { ph: 'e.g. 1048.459' })}${Fx.text(pre + 'gridE', `Crane ${i + 1} · plant east`, { ph: 'e.g. 485.369' })}`; }).join(''),
      { foot: 'The slew centre of each crane on the site grid, from the site drawing.' });
    out += grp('References', Fx.area('meta.refs', 'One per line', { rows: 4, ph: 'ISO drawing 999-770-PI-ISO-00793\nMaster plot plan RG-D-00-1225-12' }), { foot: 'The load chart, BS 7121 and the DAF / wind standards are listed for you.' });
    out += grp('Notes on every sheet', Fx.area('extraNotes', 'One per line', { rows: 3 }));
    return out;
  }
};
