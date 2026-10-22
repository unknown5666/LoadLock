// ===== v7 boot: draft → sign-in → studio =====
async function boot() {
  const d = LS.get('lp.draft', null);
  state.plan = normalizePlan(d && d.loads ? d : SAMPLE_PLANS[0].make());
  try { const v = localStorage.getItem('lp.view'); if (['elev', 'plan', '3d', 'sheet'].includes(v)) state.view = v; } catch {}
  const t = LS.get('lp.settings', {}).theme; if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  const storage = initStorage().catch((e) => console.error(e));
  let started = false;
  const go = async () => {
    if (started) return; started = true; await storage; V7.user = authUser();
    if (!state.settings.limitsV7) { if (num(state.settings.utilWarn) === 100 && num(state.settings.utilMax) === 100) { state.settings.utilWarn = 75; state.settings.utilMax = 90; } state.settings.limitsV7 = true; saveSettings(); }
    startStudio(); loadCustomBodies(); netChip(); swRegister();
    try { const pg = localStorage.getItem('lp.page'); if (['plans', 'fleet', 'settings'].includes(pg)) openPage(pg); } catch {}
  };
  const sp = $('#splash'); const unsplash = () => { if (sp) { sp.classList.add('gone'); setTimeout(() => sp.remove(), 700); } };
  if (authValid()) { document.body.classList.remove('locked'); await go(); unsplash(); }
  else { await storage; loginShow(() => { go(); }); setTimeout(unsplash, 80); }
}
boot();
