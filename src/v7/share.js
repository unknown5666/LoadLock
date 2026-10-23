// ===== v10 share: make a file once, then Save / Share (AirDrop) / Print from its card. Locked PDFs. =====
// Flow: tap "Make the PDF" -> the exporter runs (exportPDF / exportRAMS / ...) and ends in offerFile() -> shareCapture() keeps the blob
// -> the card turns into three buttons. Share runs straight inside that tap (Safari insists on a fresh tap), never after an await.
// For other modules: pdfNew(opts) then pdfFinish(doc, { title, docNo }) for every PDF; end an exporter with offerFile(name, blob) or
// deliverFile(name, blob, { kind }). Optional progress: shareProgress(0..1, 'what is happening', durationMs).

const SHARE = { cache: {}, job: null, err: null, other: null, fresh: null, sigV: '', sigAt: 0, lastPrint: null, lock: true };

// ---------- the device ----------
const shareApple = () => /iPhone|iPad|iPod|Macintosh|Mac OS X/.test(navigator.userAgent || '') || /^(Mac|iP)/.test(navigator.platform || '');
const shareIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent || '') || ((navigator.platform || '') === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
const shareMobile = () => shareIOS() || /Android|iPhone|iPad|iPod/.test(navigator.userAgent || '');
const shareLabel = () => (shareApple() ? 'AirDrop / Share' : 'Share');
function shareCan(file) { try { return !!(file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })); } catch { return false; } }
const shareMime = (n) => /\.pdf$/i.test(n) ? 'application/pdf' : /\.zip$/i.test(n) ? 'application/zip' : /\.svg$/i.test(n) ? 'image/svg+xml' : /\.json$/i.test(n) ? 'application/json' : /\.dxf$/i.test(n) ? 'image/vnd.dxf' : 'text/plain';
const shareSize = (n) => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' kB';
const shareClock = (d) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

// ---------- locked PDFs: they open and print, but cannot be copied from or edited ----------
function shareRandomPw() { const a = new Uint8Array(16); try { crypto.getRandomValues(a); } catch { for (let i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256); } return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); }
function pdfNew(o = {}) {
  const J = window.jspdf && window.jspdf.jsPDF; if (!J) throw new Error('PDF library did not load');
  const { locked, ...rest } = o; const opt = { orientation: 'portrait', unit: 'mm', format: 'a4', compress: true, ...rest };
  let doc = null;
  if (locked !== false && SHARE.lock) { // user password empty (anyone can open it), owner password random per file and never stored; only printing is allowed
    try { doc = new J({ ...opt, encryption: { userPassword: '', ownerPassword: shareRandomPw(), userPermissions: ['print'] } }); doc.__locked = true; } catch (e) { console.warn('PDF lock not available', e); doc = null; }
  }
  if (!doc) { doc = new J(opt); doc.__locked = false; }
  if (typeof PDF_FONTS !== 'undefined') {
    doc.addFileToVFS('LiberationSans-Regular.ttf', PDF_FONTS.regular); doc.addFont('LiberationSans-Regular.ttf', 'Arial', 'normal');
    doc.addFileToVFS('LiberationSans-Bold.ttf', PDF_FONTS.bold); doc.addFont('LiberationSans-Bold.ttf', 'Arial', 'bold');
  }
  return doc;
}
// the quiet watermark: one line of micro text in the margin of every page (bottom, and top on A4 pages). It stays clear of the drawing.
// Non-Latin characters in the document info break the lock on some viewers, so the info strings are plain Latin only.
const pdfSafe = (s) => String(s == null ? '' : s).replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[^\x20-\x7e\xa0-\xff]/g, '');
function pdfFinish(doc, o = {}) {
  const title = pdfSafe(o.title || (typeof fileBase === 'function' ? fileBase() : 'Lifting plan')); const docNo = pdfSafe(o.docNo || (typeof sheetDocNo === 'function' ? sheetDocNo() : 'FHE'));
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const unit = `FHE \u00b7 ${docNo} \u00b7 controlled copy \u00b7 ${date}`;
  const n = doc.getNumberOfPages();
  try {
    doc.setFont(typeof PDF_FONTS !== 'undefined' ? 'Arial' : 'helvetica', 'normal'); doc.setTextColor(188, 190, 196);
    for (let i = 1; i <= n; i++) {
      doc.setPage(i); const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
      const big = W > 400, k = big ? W / 841 : 1; // drawing sheets (A3, A1) have their frame close to the edge: the line sits just inside it, at the bottom only
      doc.setFontSize(3.4 * k); const gap = '      '; const uw = doc.getTextWidth(unit + gap);
      const reps = Math.max(1, Math.floor((W - 8) / uw)); const line = Array(reps).fill(unit).join(gap);
      doc.text(line, W / 2, H - 3 * k, { align: 'center' }); if (!big) doc.text(line, W / 2, 4.1, { align: 'center' });
    }
    doc.setPage(n);
  } catch (e) { console.warn('watermark skipped', e); }
  doc.setProperties({ title, subject: pdfSafe(o.subject || 'Crane lifting plan'), author: 'Friendship Hall Est', keywords: docNo, creator: 'FHE Lift Planner ' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '') });
  return doc;
}

// ---------- has the plan changed since the file was made? ----------
function shareHash(s) { let a = 2166136261, b = 5381; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 16777619); b = Math.imul(b, 33) ^ c; } return (a >>> 0).toString(36) + (b >>> 0).toString(36) + s.length; }
const SHARE_REPORT_ONLY = ['reportInc', 'risk', 'hazards']; // plan fields that only change the report pack: they do not make the A1 sheet or the other files out of date
function shareSig(force, kind) {
  const key = kind === 'rams' ? 'r' : 's'; const now = performance.now(); const m = SHARE.sigM || (SHARE.sigM = {});
  if (!force && m[key] && now - m[key].at < 250) return m[key].v;
  let s; try {
    let pl = state.plan; if (key === 's') { pl = { ...pl }; for (const k of SHARE_REPORT_ONLY) delete pl[k]; }
    s = shareHash(JSON.stringify(pl)) + '|' + shareHash(JSON.stringify(state.settings || {})) + '|' + (typeof CRANES_REV !== 'undefined' ? CRANES_REV : 0);
  } catch { s = 'x' + now; }
  m[key] = { v: s, at: now }; return s;
}
const shareStale = (c, force) => !c || c.sig !== shareSig(force, c.kind);

// ---------- the kinds of file ----------
const SHARE_KINDS = {
  a1: { run: () => exportPDF('A1'), pdf: true, name: 'Lifting plan' },
  rams: { run: async () => { // the report agent's buildReport({ include }) when it is there, else the plain pack
      if (typeof buildReport === 'function') { const r = await buildReport({ include: typeof REPORT_SECTIONS !== 'undefined' ? reportIncOf() : state.plan.reportInc }); if (r && r.blob) await deliverFile(r.filename || (fileBase() + ' RAMS.pdf'), r.blob, { kind: 'rams', pages: r.pages }); }
      else await exportRAMS();
    }, pdf: true, name: 'Report pack' },
  a3: { run: () => exportPDF('A3'), pdf: true, name: 'A3 PDF' },
  dxf: { run: () => exportDXF(), name: 'AutoCAD DXF' },
  svg: { run: () => exportSVG(), name: 'SVG picture' },
  json: { run: () => exportJSON(fileBase() + '.json', { version: 2, plan: state.plan }), name: 'Plan backup' }
};
const SHARE_UI = {
  a1: { t: 'Lifting plan', s: 'A1 drawing', d: 'One big sheet with the drawing, the data panel and the load chart. Takes a few seconds.', go: 'Make the A1 PDF', ico: 'sheet', tile: 'var(--brand)', ink: 'var(--brand-ink)' },
  rams: { t: 'Report pack', s: 'A4 pages', d: 'Risk assessment, method statement, drawings and checks, ready to read and sign. Takes a few seconds.', go: 'Make the report pack', ico: 'shield', tile: '#5856d6', ink: '#ffffff' }
};

// ---------- capture: an exporter ends in offerFile(); while a card is waiting, the file goes to the card instead of the downloads folder ----------
function shareBusy() { return !!SHARE.job; }
function shareCapture(filename, blob) { if (!SHARE.job || SHARE.job.got) return false; deliverFile(filename, blob, { kind: SHARE.job.kind }); return true; }
async function deliverFile(filename, blob, o = {}) {
  const j = SHARE.job; const kind = o.kind || (j && j.kind) || 'file';
  if (!j || j.kind !== kind) { // nobody is waiting for it (an older caller): keep a copy for Share and download it now
    keepFile(kind, filename, blob, shareSig(true, kind), o.pages); return saveFileNow(filename, blob);
  }
  keepFile(kind, filename, blob, j.sig, o.pages); j.got = true;
}
function keepFile(kind, filename, blob, sig, pages) {
  const old = SHARE.cache[kind]; if (old && old.url) { try { URL.revokeObjectURL(old.url); } catch {} }
  const type = blob.type || shareMime(filename); let file = null; try { file = new File([blob], filename, { type }); } catch {}
  const c = SHARE.cache[kind] = { kind, filename, blob, file, type, size: blob.size, at: new Date(), sig, url: '', canShare: shareCan(file), pages: pages || (kind === 'rams' && state.lastRams && state.lastRams.pages) || 0 };
  if (!(SHARE_UI[kind])) SHARE.other = kind;
  return c;
}
const shareUrl = (c) => c.url || (c.url = URL.createObjectURL(c.blob));
function shareFail(e) { if (SHARE.job) SHARE.job.err = (e && e.message) || String(e); }

// ---------- progress ----------
function shareVisual() { const f = $('#xpFill'); if (!f) return 0; try { const m = getComputedStyle(f).transform; if (m && m !== 'none') return parseFloat(m.slice(m.indexOf('(') + 1)) || 0; } catch {} return 0; }
function shareProgress(f, label, ms) {
  const j = SHARE.job; if (!j) return;
  if (label) j.label = label;
  if (f != null) { j.creep = false; if (f > j.frac) j.frac = Math.min(0.98, f); }
  shareKick(ms);
}
function shareKick(ms, fin) {
  const j = SHARE.job, fill = $('#xpFill'); if (!fill || (!j && !fin)) return;
  if (j) { const vis = shareVisual(); const target = j.creep ? 0.9 : Math.max(j.frac, vis); fill.style.setProperty('--d', (j.creep ? 16000 : ms || 700) + 'ms'); fill.style.setProperty('--p', String(target)); const l = $('#xpLabel'); if (l && l.textContent !== j.label) l.textContent = j.label; }
  else { fill.style.setProperty('--d', '260ms'); fill.style.setProperty('--p', '1'); }
}
function sharePaint() { if (V7.sheet && V7.sheet.kind === 'print') sheetRefresh(); }

async function shareBuild(kind) {
  if (SHARE.job || !SHARE_KINDS[kind]) return;
  try { navigator.vibrate?.(8); } catch {}
  SHARE.err = null; const old = SHARE.cache[kind];
  SHARE.job = { kind, frac: 0.04, label: 'Getting ready…', creep: true, sig: shareSig(true, kind), got: false, err: '', t0: performance.now() };
  if (old) { delete SHARE.cache[kind]; if (old.url) { try { URL.revokeObjectURL(old.url); } catch {} } }
  sharePaint(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); shareKick();
  SHARE.job.label = SHARE.job.creep ? (kind === 'rams' ? 'Writing the report pages…' : 'Drawing the sheet…') : SHARE.job.label; shareKick();
  try { await SHARE_KINDS[kind].run(); } catch (e) { console.error(e); shareFail(e); }
  const j = SHARE.job; if (!j.got && !j.err) j.err = 'The file did not finish. Read the message at the top, then try again.';
  if (j.got) { shareKick(0, true); await new Promise(r => setTimeout(r, 300)); }
  SHARE.job = null; SHARE.err = j.err ? { kind, msg: j.err } : null; SHARE.fresh = j.got ? kind : null; setTimeout(() => { SHARE.fresh = null; }, 900);
  sharePaint(); if (j.got) { try { navigator.vibrate?.([10, 30, 10]); } catch {} }
}

// ---------- Save / Share / Print: each runs straight inside the tap ----------
function shareReady(kind) {
  const c = SHARE.cache[kind]; if (!c) return null;
  if (shareStale(c, true)) { toast('You changed the plan. Make the file again first.'); sharePaint(); return null; }
  return c;
}
function shareSave(kind) { const c = shareReady(kind); if (c) saveFileNow(c.filename, c.blob); }
function shareShare(kind) {
  const c = shareReady(kind); if (!c) return;
  if (!shareCan(c.file)) { toast('Sharing is not available on this device. Use Save.'); return; }
  try { navigator.vibrate?.(8); } catch {}
  navigator.share({ files: [c.file], title: c.filename.replace(/\.[^.]+$/, '') }).then(() => toast('Sent'), (e) => {
    if (e && e.name === 'AbortError') return; // the person closed the share sheet
    console.warn(e); toast('Sharing did not work here, so the file was saved instead.'); saveFileNow(c.filename, c.blob);
  });
}
// WhatsApp: on a phone or tablet the share sheet (WhatsApp is in it) gets the PDF and a short summary; on a computer the PDF is saved
// and WhatsApp opens with the summary typed in, so the person only has to attach the file.
const waGlyph = (s = 26) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path fill="#25D366" d="M12.04 2C6.5 2 2 6.46 2 11.96c0 1.76.46 3.47 1.34 4.98L2 22l5.2-1.3a10 10 0 0 0 4.84 1.24h.01c5.53 0 10.03-4.46 10.03-9.96S17.58 2 12.04 2z"/><path fill="#fff" d="M17.2 14.5c-.28-.14-1.67-.82-1.93-.92-.26-.1-.45-.14-.64.14-.19.28-.73.92-.9 1.1-.16.19-.33.21-.61.07-.28-.14-1.2-.44-2.28-1.4-.84-.75-1.41-1.67-1.58-1.95-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.5.14-.16.19-.28.28-.47.1-.19.05-.35-.02-.5-.07-.14-.64-1.54-.88-2.1-.23-.55-.46-.48-.64-.49h-.54c-.19 0-.5.07-.76.35-.26.28-1 .98-1 2.39s1.03 2.77 1.17 2.96c.14.19 2.02 3.08 4.9 4.32.68.3 1.22.47 1.63.6.69.22 1.31.19 1.8.11.55-.08 1.67-.68 1.9-1.34.24-.66.24-1.22.17-1.34-.07-.12-.26-.19-.54-.33z"/></svg>`;
function shareSummary() { // plain text, a few lines
  const p = state.plan, calc = state.calc || {}, li = activeLi(), l = p.loads[li] || {}, r = (calc.loads || [])[li] || {};
  let crane = ''; try { crane = curCrane().model || ''; } catch {}
  const verdict = calc.status && VERDICT[calc.status] ? VERDICT[calc.status][0] : '';
  return [`Lifting plan: ${p.name || p.meta?.title || 'Untitled plan'}`, crane && `Crane: ${crane}`, `Load: ${fmt(num(l.w), 1)} t at ${fmt(r.R, 1)} m radius`, r.util != null && `Using ${Math.round(r.util)}% of the chart${verdict ? ' · ' + verdict : ''}`, 'PDF attached.'].filter(Boolean).join('\n');
}
function shareWhatsApp(kind) {
  const c = shareReady(kind); if (!c) return;
  const text = shareSummary(); try { navigator.vibrate?.(8); } catch {}
  const web = () => {
    const url = 'https://wa.me/?text=' + encodeURIComponent(text); SHARE.lastWa = { via: 'web', url, text };
    const w = window.open(url, '_blank'); if (w) { try { w.opener = null; } catch {} }
    saveFileNow(c.filename, c.blob); toast(w ? 'The PDF is saved. In WhatsApp, pick a chat and attach it.' : 'The PDF is saved. Open WhatsApp and attach it.');
  };
  if (shareMobile() && shareCan(c.file)) {
    SHARE.lastWa = { via: 'share', text };
    navigator.share({ files: [c.file], title: c.filename.replace(/\.[^.]+$/, ''), text }).then(() => toast('Sent'), (e) => { if (e && e.name === 'AbortError') return; console.warn(e); web(); });
  } else web();
}
function sharePrint(kind) {
  const c = shareReady(kind); if (!c) return;
  const url = shareUrl(c); SHARE.lastPrint = { kind, via: '' };
  const tab = () => { SHARE.lastPrint.via = 'tab'; const w = window.open(url, '_blank'); if (w) toast('In the new tab: Share, then Print.'); else { toast('Printing was blocked, so the file was saved. Open it and press Print.'); saveFileNow(c.filename, c.blob); } };
  if (shareIOS()) { tab(); return; } // iPhone and iPad cannot print from a hidden frame: the PDF viewer has Share, then Print
  let f = $('#shPrintFrame'); if (f) f.remove();
  f = document.createElement('iframe'); f.id = 'shPrintFrame'; f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1; f.style.cssText = 'position:fixed;right:0;bottom:0;width:2px;height:2px;border:0;opacity:0;pointer-events:none';
  let done = false;
  const fall = () => { if (done) return; done = true; tab(); };
  f.onload = () => { if (done) return; try { f.contentWindow.focus(); f.contentWindow.print(); done = true; SHARE.lastPrint.via = 'frame'; } catch (e) { console.warn(e); fall(); } };
  f.src = url; document.body.appendChild(f); setTimeout(fall, 7000);
}
Object.assign(SA_EXTRA, {
  xbuild: (d) => { shareBuild(d.kind); },
  xsave: (d) => shareSave(d.kind),
  xshare: (d) => shareShare(d.kind),
  xwa: (d) => shareWhatsApp(d.kind),
  xprint: (d) => sharePrint(d.kind)
});

// ---------- the Share & print sheet ----------
function shareActs(kind, o = {}) {
  const c = SHARE.cache[kind]; const can = c.canShare; const pdf = !!SHARE_KINDS[kind].pdf; const apple = shareApple();
  const A = (act, ico, label, help, cls = '') => `<button type="button" class="xa tap${cls}" data-sa="${act}" data-kind="${kind}">${ico.startsWith('<') ? ico : ic(ico, 26, 2)}<b>${label}</b><small>${help}</small></button>`;
  return `<div class="xc-acts${o.fresh ? ' fresh' : ''}">${A('xsave', 'dl', 'Save', 'Keep a copy here', can ? '' : ' pri')}${can ? A('xshare', apple ? 'airdrop' : 'share', shareLabel(), apple ? 'Send to a phone or Mac' : 'Send to another app', ' pri') : ''}${A('xwa', waGlyph(28), 'WhatsApp', shareMobile() && can ? 'Pick a chat' : 'Saves it, opens WhatsApp')}${pdf ? A('xprint', 'print', 'Print', 'On paper') : ''}</div>`;
}

function shareCard(kind) {
  const U = SHARE_UI[kind], c = SHARE.cache[kind], j = SHARE.job, E = SHARE.err && SHARE.err.kind === kind ? SHARE.err : null;
  const busy = j && j.kind === kind; const ready = !busy && c && !shareStale(c);
  const sty = `--tile:${U.tile};--tile-ink:${U.ink}`;
  let body = '';
  if (busy) body = `<div class="xp" role="progressbar" aria-label="Making the PDF" aria-valuemin="0" aria-valuemax="100"><i class="xp-f" id="xpFill" style="--p:${j.frac};--d:0ms"></i></div><p class="xp-l" id="xpLabel" aria-live="polite">${h(j.label)}</p>`;
  else if (ready) body = `<div class="xc-ok"><span class="xc-chip">${ic('check', 15, 3.2)}Ready</span><span class="xc-meta">${shareClock(c.at)} · ${c.pages ? c.pages + ' pages · ' : ''}${shareSize(c.size)}</span></div>
      ${shareActs(kind, { fresh: SHARE.fresh === kind })}
      <div class="xc-foot"><button type="button" class="btn plain sm tap" data-sa="xbuild" data-kind="${kind}">${ic('redo', 16, 2.2)}Make it again</button>${kind === 'a1' ? `<button type="button" class="btn plain sm tap" data-sa="view" data-v="sheet">${ic('eye', 16, 2.2)}See the sheet</button>` : ''}</div>`;
  else {
    body = `${c && !ready ? note('warn', 'alert', '<b>You changed the plan.</b> This file is out of date, so Save, Share, WhatsApp and Print are hidden. Make it again.') : ''}${E ? note('fail', 'alert', `<b>It did not work.</b> ${h(E.msg)}`) : ''}
      <button type="button" class="btn pri wide tap xc-go" data-sa="xbuild" data-kind="${kind}"${j ? ' disabled' : ''}>${ic('file', 20, 2.2)}${c && !ready ? 'Make it again' : E ? 'Try again' : U.go}</button>${kind === 'a1' ? `<button type="button" class="btn plain sm tap xc-see" data-sa="view" data-v="sheet">${ic('eye', 16, 2.2)}See the sheet first</button>` : ''}`;
  }
  return `<section class="xc${busy ? ' busy' : ready ? ' ready' : ''}" data-kind="${kind}" style="${sty}"><div class="xc-h"><span class="xc-ic">${ic(U.ico, 26, 2)}</span><div><h3>${h(U.t)}<small>${h(U.s)}</small></h3></div></div><p class="xc-d">${h(U.d)}</p>${kind === 'rams' && !busy ? shareReportPick() : ''}${body}</section>`;
}
// ---------- choose what goes in the report pack (the report agent defines REPORT_SECTIONS = [{ id, title, sub, def, pages? }]) ----------
const shareHasSections = () => typeof REPORT_SECTIONS !== 'undefined' && Array.isArray(REPORT_SECTIONS) && REPORT_SECTIONS.length > 0;
function reportIncOf(p = state.plan) { // the ids to build: the saved choice, or the standard set
  const all = REPORT_SECTIONS; if (Array.isArray(p.reportInc)) { const ids = new Set(all.map(s => s.id)); return all.filter(s => p.reportInc.includes(s.id) && ids.has(s.id)).map(s => s.id); }
  return all.filter(s => s.def).map(s => s.id);
}
function shareReportPick() {
  if (!shareHasSections()) return '';
  const n = reportIncOf().length, m = REPORT_SECTIONS.length;
  return `<button type="button" class="xc-pick tap" data-sa="open" data-k="reportPick">${ic('sliders', 20, 2.2)}<span><b>Choose what is included</b><small>${n} of ${m} parts · tick or untick</small></span>${ic('chev', 18, 2.2)}</button>`;
}
SH.reportPick = {
  title: () => 'Report contents', icon: 'shield', sub: true,
  body() {
    if (!shareHasSections()) return '<p class="hint">The report is not ready on this device.</p>';
    const on = new Set(reportIncOf()), all = REPORT_SECTIONS; const pg = all.every(s => isFinite(+s.pages)) ? all.filter(s => on.has(s.id)).reduce((a, s) => a + (+s.pages), 0) : null;
    const std = reportIncOf({ reportInc: null }); const isAll = on.size === all.length, isStd = on.size === std.length && std.every(id => on.has(id));
    return `<p class="hint" style="margin:0 4px 12px">Tick the parts you want. The choice is saved with this plan.</p>
      <div class="seg" style="width:100%;margin-bottom:12px"><button type="button" class="tap" data-sa="rpAll" aria-checked="${isAll}">Everything</button><button type="button" class="tap" data-sa="rpStd" aria-checked="${isStd}">Standard set</button></div>
      ${grp('', all.map(s => Fx.swRaw(`data-sa-sw="rp" data-id="${h(s.id)}"`, s.title, on.has(s.id), { sub: s.sub || '' })).join(''), { foot: `<b>${on.size} of ${all.length} parts</b>${pg != null ? ` · about ${pg} page${pg === 1 ? '' : 's'}` : ''}. Out-of-date reports are hidden until you make the report again.` })}`;
  }
};
function reportIncSet(ids) { // keep the order of REPORT_SECTIONS; never empty
  const next = REPORT_SECTIONS.filter(s => ids.includes(s.id)).map(s => s.id);
  if (!next.length) { toast('Keep at least one part in the report.'); sheetRefresh(); return; }
  state.plan.reportInc = next; commit({ sheet: true });
}
Object.assign(SA_EXTRA, {
  rpAll: () => reportIncSet(REPORT_SECTIONS.map(s => s.id)),
  rpStd: () => { state.plan.reportInc = REPORT_SECTIONS.filter(s => s.def).map(s => s.id); commit({ sheet: true }); }
});
document.addEventListener('change', (e) => { const t = e.target; if (t.dataset?.saSw !== 'rp' || !shareHasSections()) return; const cur = new Set(reportIncOf()); if (t.checked) cur.add(t.dataset.id); else cur.delete(t.dataset.id); reportIncSet([...cur]); });

// ---------- the risk assessment link (SH.risk comes from the report module) ----------
function shareRiskCount() {
  try { if (typeof riskRegister === 'function') return riskRegister(state.plan, state.calc).length; if (typeof riskCount === 'function') return riskCount(state.plan); const p = state.plan, r = p.risk || p.hazards; if (Array.isArray(r)) return r.length; if (r && typeof r === 'object') { for (const k of ['hazards', 'on', 'ids', 'sel']) if (Array.isArray(r[k])) return r[k].length; } } catch {}
  return null;
}
function riskLink() { // '' until the Risk sheet exists
  if (!SH.risk) return '';
  const n = shareRiskCount();
  return Fx.link('open', 'Risk assessment', { data: 'data-k="risk"', ic: icb('alert', '#ff9500'), sub: 'Tick the site hazards. They fill in the report.', val: n != null ? `${n} hazard${n === 1 ? '' : 's'}` : '' });
}
const SHARE_OTHER = [['a3', 'A3 PDF', 'For a smaller printer'], ['dxf', 'AutoCAD DXF', 'Opens in AutoCAD'], ['svg', 'SVG picture', 'A drawing you can edit'], ['json', 'Plan backup', 'Open it on another device']];
function shareOtherBlock() {
  const j = SHARE.job; const c = SHARE.other && SHARE.cache[SHARE.other]; const ready = c && !shareStale(c); const E = SHARE.err && !SHARE_UI[SHARE.err.kind] ? SHARE.err : null;
  let out = `<div class="xo">${SHARE_OTHER.map(([k, t, s]) => `<button type="button" class="xo-b tap${j && j.kind === k ? ' busy' : ''}" data-sa="xbuild" data-kind="${k}"${j ? ' disabled' : ''}><b>${t}</b><small>${s}</small>${j && j.kind === k ? '<i class="spin" aria-hidden="true"></i>' : ''}</button>`).join('')}</div>`;
  if (E) out += note('fail', 'alert', `<b>It did not work.</b> ${h(E.msg)}`);
  if (ready) out += `<div class="xs"><div class="xs-t"><span class="xc-chip">${ic('check', 15, 3.2)}Ready</span><span class="xc-meta">${h(c.filename)} · ${shareSize(c.size)}</span></div>${shareActs(c.kind)}</div>`;
  return out;
}
SH.print = {
  title: () => 'Share & print', icon: 'share',
  body() {
    const link = `<div style="margin-bottom:14px">` + grp('', Fx.link('open', 'Edit what is on the sheet', { data: 'data-k="sheetDetails"', ic: icb('sliders', 'var(--info-fill)'), sub: 'Job details, layout, rows, notes' }) + riskLink()) + '</div>';
    return `${link}${shareCard('a1')}${shareCard('rams')}${grp('Other formats', shareOtherBlock(), { raw: true, foot: 'The plan itself is locked inside the PDFs: they open and print, but cannot be copied or edited.' })}`;
  },
  live(root) { // the plan moved under a ready card: show it as out of date
    if (SHARE.job) return;
    for (const r of root.querySelectorAll('.xc.ready,.xs')) { const k = r.classList.contains('xs') ? SHARE.other : r.dataset.kind; if (shareStale(SHARE.cache[k])) { sheetRefresh(); return; } }
  }
};

// ---------- v10: what's new (shown once, then under More) ----------
const NEW10 = [
  ['front', 'Lift over the front', 'Pick Front next to Left, Behind and Right. The app tells you if the crane can do it.'],
  ['crane', 'Two cranes on the drawing', 'Tandem lifts are drawn in the side view, the top view and on the sheet.'],
  ['hook', 'Sling detail', 'See how the load hangs and what each sling leg takes.'],
  ['shield', 'A proper report pack', 'About 12 A4 pages: risk assessment, method statement, drawings and the load chart.'],
  ['share', 'Share & print in two taps', 'Make the PDF, then Save it, AirDrop it or print it. The sheet settings moved to their own page.'],
  ['lock', 'Locked PDFs', 'Your plans and reports open and print, but cannot be copied or edited.'],
  ['bolt', 'Faster and smoother', 'Sheets glide, views fade into each other and the buttons answer your finger.']
];
SH.new10 = {
  title: () => 'What is new in ' + APP_VERSION.split('.')[0], icon: 'sparkle',
  body() {
    return `<p class="hint" style="margin:0 4px 12px">A big update. Here is what you will notice.</p>${grp('', NEW10.map(([k, t, d]) => `<div class="it has-ic nw">${icb(k, 'var(--brand)').replace('<span class="ic"', '<span class="ic dk"')}<span class="lb"><b>${h(t)}</b><small>${h(d)}</small></span></div>`).join(''))}
      <button type="button" class="btn pri wide tap" data-sa="new10ok" style="margin-top:16px">Got it</button>`;
  }
};
SA_EXTRA.new10ok = () => { LS.set('lp.new10', true); closeSheet(true); };
