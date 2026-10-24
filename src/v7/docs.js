// ===== v11 documentation: everything the report pack prints that the drawing cannot know (people, site, crane papers, ground,
// emergency contacts). Filled once per plan under More → Documentation (or Share & print). Making the report checks it first and asks
// for anything missing, so no page goes out with an empty box. Stored in plan.docs (plus a few existing plan fields). =====
const DOC_GROUPS = [
  ['people', 'People on this lift', 'Names go in the approval box, the permit, the briefing sheet and the contacts.'],
  ['site', 'Site and time', 'Where and when the lift happens.'],
  ['crane', 'Crane papers', 'From the crane\'s certificate file. They print on the crane data sheet.'],
  ['ground', 'Ground', 'From the site\'s ground report. The outrigger page checks the mats against it.'],
  ['emergency', 'Emergency', 'Printed on the emergency plan and read out at the briefing.']
];
// k = plan path, t = label, ph = example, req = the report needs it, kind = 'num' for numbers
const DOC_FIELDS = [
  { k: 'meta.drawnBy', g: 'people', t: 'Plan prepared by', ph: 'Your name', req: 1 },
  { k: 'meta.checkedBy', g: 'people', t: 'Appointed Person', ph: 'Checks and signs the plan', req: 1 },
  { k: 'docs.apPhone', g: 'people', t: 'Appointed Person — phone', ph: '050 000 0000', req: 1 },
  { k: 'docs.approver', g: 'people', t: 'Approved by (client or main contractor)', ph: 'Name, company', req: 1 },
  { k: 'docs.supervisor', g: 'people', t: 'Lift supervisor', ph: 'Name', req: 1 },
  { k: 'docs.supervisorPhone', g: 'people', t: 'Lift supervisor — phone', ph: '050 000 0000', req: 1 },
  { k: 'docs.operator', g: 'people', t: 'Crane operator', ph: 'Name', req: 1 },
  { k: 'docs.operatorCard', g: 'people', t: 'Operator licence / card no.', ph: 'e.g. TPC 123456, valid to 03/2027', req: 1 },
  { k: 'docs.slinger', g: 'people', t: 'Slinger / signaller', ph: 'Name', req: 1 },
  { k: 'docs.slingerCard', g: 'people', t: 'Slinger card no.', ph: 'e.g. TPC 654321', req: 1 },
  { k: 'docs.siteManager', g: 'people', t: 'Site manager', ph: 'Name', req: 1 },
  { k: 'docs.siteManagerPhone', g: 'people', t: 'Site manager — phone', ph: '050 000 0000', req: 1 },
  { k: 'docs.safety', g: 'people', t: 'Safety officer', ph: 'Name', req: 1 },
  { k: 'docs.safetyPhone', g: 'people', t: 'Safety officer — phone', ph: '050 000 0000', req: 1 },
  { k: 'meta.client', g: 'site', t: 'Client', ph: 'Company', req: 1 },
  { k: 'docs.clientRep', g: 'site', t: 'Client representative', ph: 'Name', req: 1 },
  { k: 'docs.clientPhone', g: 'site', t: 'Client representative — phone', ph: '050 000 0000', req: 1 },
  { k: 'meta.project', g: 'site', t: 'Project', ph: 'Project name', req: 1 },
  { k: 'docs.address', g: 'site', t: 'Site address', ph: 'Plot, street, area, city', req: 1 },
  { k: 'meta.date', g: 'site', t: 'Date of the lift', ph: 'dd/mm/yyyy', req: 1 },
  { k: 'docs.time', g: 'site', t: 'Lift window', ph: '07:00 – 11:00', req: 1 },
  { k: 'docs.siteContact', g: 'site', t: 'Site contact on the day', ph: 'Name', req: 1 },
  { k: 'docs.sitePhone', g: 'site', t: 'Site contact — phone', ph: '050 000 0000', req: 1 },
  { k: 'docs.craneReg', g: 'crane', t: 'Fleet / plate no.', ph: 'e.g. FHE-12 · AD 12345', req: 1 },
  { k: 'docs.craneSerial', g: 'crane', t: 'Serial no.', ph: 'From the maker\'s plate', req: 1 },
  { k: 'docs.tpiCert', g: 'crane', t: 'Third-party inspection certificate no.', ph: 'Certificate number', req: 1 },
  { k: 'docs.tpiExpiry', g: 'crane', t: 'Certificate valid until', ph: 'dd/mm/yyyy', req: 1 },
  { k: 'docs.lmiTest', g: 'crane', t: 'LMI last tested', ph: 'dd/mm/yyyy', req: 1 },
  { k: 'outrigger.allow', g: 'ground', t: 'Allowable ground bearing', unit: 't/m²', ph: 'From the ground report', req: 1, kind: 'num' },
  { k: 'docs.groundRef', g: 'ground', t: 'Ground report / survey reference', ph: 'Report number, date', req: 1 },
  { k: 'matSize', g: 'ground', t: 'Mat size under each leg', ph: '2.5x2.5m', req: 1 },
  { k: 'docs.muster', g: 'emergency', t: 'Muster point', ph: 'e.g. Gate 2 car park', req: 1 },
  { k: 'docs.firstAider', g: 'emergency', t: 'First-aider on site', ph: 'Name, phone', req: 1 },
  { k: 'docs.hospital', g: 'emergency', t: 'Nearest hospital', ph: 'Name, distance', req: 1 },
  { k: 'docs.ambulance', g: 'emergency', t: 'Ambulance access', ph: 'Gate and route in', req: 1 }
];
const docEmpty = (v) => v == null || String(v).trim() === '' || (typeof v === 'number' && !(v > 0));
function docVal(k, plan = state.plan) { const v = getP(plan, k); return docEmpty(v) ? '' : String(v).trim(); }
function docsMissing(plan = state.plan) { return DOC_FIELDS.filter(f => f.req && docEmpty(getP(plan, f.k))); }
function docsCount(plan = state.plan) { const need = DOC_FIELDS.filter(f => f.req); return { need: need.length, have: need.length - docsMissing(plan).length }; }
function docsField(f, miss) {
  const on = miss && docEmpty(getP(state.plan, f.k)) ? ' miss' : '';
  if (f.kind === 'num') return Fx.num(f.k, f.t, f.unit || '', { ph: f.ph }).replace('<label class="it', `<label class="it${on}`);
  return Fx.text(f.k, f.t, { ph: f.ph }).replace('<label class="it', `<label class="it${on}`);
}
function docsProgress() { const c = docsCount(); const pc = Math.round(100 * c.have / Math.max(1, c.need)); return `<div class="doc-prog" id="docProg"><div class="dp-t"><b class="num">${c.have}<small> / ${c.need}</small></b><span>${c.have === c.need ? 'Everything the report needs is filled in.' : `${c.need - c.have} still to fill. The report asks for them before it is made.`}</span></div><div class="dp-bar"><i style="width:${pc}%"></i></div></div>`; }
SH.docs = {
  title: () => 'Documentation', icon: 'file',
  body(arg) {
    const gate = arg && arg.gate; const miss = docsMissing(); let out = '';
    if (gate && miss.length) out += note('warn', 'alert', `<b>The report needs ${miss.length} more detail${miss.length === 1 ? '' : 's'}.</b> Fill the boxes marked in amber, then tap <b>Make the report pack</b>. Nothing goes out blank.`);
    out += docsProgress();
    const logo = state.settings.logoImg ? 'Your uploaded logo' : 'Built-in Friendship Hall mark';
    out += grp('Company', Fx.link('docsLogo', 'Logo on the report', { sub: 'Change it in Settings', val: h(logo) }), { foot: 'The logo heads every page, and a faint copy sits across the page so a photocopy or screenshot still shows where it came from.' });
    for (const [g, title, foot] of DOC_GROUPS) out += grp(title, DOC_FIELDS.filter(f => f.g === g).map(f => docsField(f, gate)).join(''), { foot });
    out += `<button type="button" class="btn wide pri tap" data-sa="docsGo" style="margin-top:18px">${ic('share', 20, 2.4)}Make the report pack</button>`;
    return out;
  }
};
SA_EXTRA.docsLogo = () => { closeSheet(true); openPage('settings'); };
SA_EXTRA.docsGo = (d, b) => {
  const miss = docsMissing();
  if (miss.length && !b.dataset.sure) { b.dataset.sure = '1'; b.innerHTML = `${ic('alert', 20, 2.4)}${miss.length} still empty — make it with write-in lines?`; b.classList.add('warn'); toast(`Still empty: ${miss.slice(0, 3).map(f => f.t).join(', ')}${miss.length > 3 ? '…' : ''}`); return; }
  V7.docsOk = true; openSheet('print'); setTimeout(() => { if (typeof shareBuild === 'function') shareBuild('rams'); }, 60);
};
// called by Share & print before the report pack is made: true = go ahead, false = the Documentation sheet opened instead
function docsGate() {
  if (V7.docsOk) { V7.docsOk = false; return true; }
  const miss = docsMissing(); if (!miss.length) return true;
  openSheet('docs', { gate: true }); toast(`The report needs ${miss.length} more detail${miss.length === 1 ? '' : 's'} first`); return false;
}
document.addEventListener('input', (e) => { if (V7.sheet?.kind !== 'docs' || !e.target.dataset?.k) return; const lab = e.target.closest('label.it'); if (lab) lab.classList.toggle('miss', lab.classList.contains('miss') && docEmpty(e.target.value)); const pr = $('#docProg'); if (pr) pr.outerHTML = docsProgress(); });
