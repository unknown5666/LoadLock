// ===== Boot: sign-in gate → studio =====
async function boot() {
  const d = LS.get('lp.draft', null);
  state.plan = normalizePlan(d && d.loads ? d : SAMPLE_PLANS[0].make());
  try { const s = localStorage.getItem('lp.sec'); if (SECTIONS.some(x => x[0] === s)) state.sec = s; const v = localStorage.getItem('lp.view'); if (['elev', 'plan', '3d', 'sheet'].includes(v)) state.view = v; } catch {}
  const storage = initStorage().catch((e) => console.error(e));
  bindPages();
  let started = false;
  const go = async () => { if (started) return; started = true; await storage; Scene.dark = state.settings.canvas !== 'paper'; startStudio(); loadCustomBodies(); try { const pg = localStorage.getItem('lp.page'); if (['plans', 'fleet', 'settings'].includes(pg)) openPage(pg); } catch {} };
  const sp = document.getElementById('splash'); const unsplash = () => { if (sp) { sp.classList.add('gone'); setTimeout(() => sp.remove(), 700); } };
  if (authValid()) { document.body.classList.remove('locked'); document.body.classList.add('on'); await go(); unsplash(); }
  else { loginShow(() => { go(); }); setTimeout(unsplash, 60); }
}
boot();
