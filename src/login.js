// ===== Sign-in: cinematic night-site hero + soft access gate (client-side only — it keeps casual visitors out, it is not security) =====
const AUTH = { user: 'Habib', role: 'Appointed Person', hash: '8eb08ee5636ae8c6da90236db2aac3352eb2c9b30ed59c38045aaafddbecac85', key: 'fhe.auth.v1', days: 14 };
function sha256hex(ascii) { // compact SHA-256 (public-domain algorithm layout), ASCII input
  const rr = (v, a) => (v >>> a) | (v << (32 - a)); const P = Math.pow, MW = P(2, 32); let i, j, out = '';
  const words = [], bitLen = ascii.length * 8; let hash = [], k = [], pc = 0; const comp = {};
  for (let c = 2; pc < 64; c++) { if (!comp[c]) { for (i = 0; i < 313; i += c) comp[i] = c; hash[pc] = (P(c, 0.5) * MW) | 0; k[pc++] = (P(c, 1 / 3) * MW) | 0; } }
  ascii += '\x80'; while (ascii.length % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) { j = ascii.charCodeAt(i); if (j >> 8) return ''; words[i >> 2] |= j << ((3 - i) % 4) * 8; }
  words[words.length] = (bitLen / MW) | 0; words[words.length] = bitLen;
  for (j = 0; j < words.length;) {
    const w = words.slice(j, j += 16); const old = hash; hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
      const t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] + (w[i] = i < 16 ? (w[i] | 0) : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
      const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(t1 + t2) | 0].concat(hash); hash[4] = (hash[4] + t1) | 0;
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
  }
  for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { const b = (hash[i] >> (j * 8)) & 255; out += (b < 16 ? '0' : '') + b.toString(16); }
  return out;
}
function authCheck(pass) { return sha256hex('fhe:' + AUTH.user + ':' + String(pass || '').trim()) === AUTH.hash; }
function authValid() {
  for (const st of [() => sessionStorage, () => localStorage]) { try { const a = JSON.parse(st().getItem(AUTH.key) || 'null'); if (a && a.u === AUTH.user && a.h === AUTH.hash && num(a.exp) > Date.now()) return true; } catch {} }
  return false;
}
function authSave(stay) { const rec = JSON.stringify({ u: AUTH.user, h: AUTH.hash, exp: Date.now() + (stay ? AUTH.days * 864e5 : 12 * 36e5) }); try { sessionStorage.setItem(AUTH.key, rec); } catch {} if (stay) { try { localStorage.setItem(AUTH.key, rec); } catch {} } }
function authClear() { try { sessionStorage.removeItem(AUTH.key); } catch {} try { localStorage.removeItem(AUTH.key); } catch {} }

const FHE_MARK = `<svg class="fhe-mark" viewBox="0 0 48 48" aria-hidden="true"><path d="M6 42h36" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/><path d="M11 42V18.5L38 7.5v4.6L15.6 21.4V42" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="miter"/><path d="M15.6 28.5h11" stroke="currentColor" stroke-width="2.6"/><path d="M34.5 11v13.5" stroke="currentColor" stroke-width="1.4"/><rect x="31" y="24.5" width="7" height="5" fill="currentColor"/></svg>`;

const Login = { hero: null, onDone: null, clockT: 0 };
function loginShow(onDone) {
  Login.onDone = onDone;
  document.body.classList.add('locked');
  let el = document.getElementById('login');
  if (!el) { el = document.createElement('div'); el.id = 'login'; document.body.prepend(el); }
  el.hidden = false; el.className = 'lg';
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.innerHTML = `
    <div class="lg-3d" id="lg3d" aria-hidden="true"></div>
    <div class="lg-fallback" aria-hidden="true">${loginFallbackArt()}</div>
    <div class="lg-shade" aria-hidden="true"></div>
    <div class="lg-scan" aria-hidden="true"></div><div class="lg-sweep" aria-hidden="true"></div>
    <div class="lg-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="lg-tag" id="lgTag" aria-hidden="true"><span class="lg-tag-dot"></span><b>HOOK</b><span id="lgTagV">—</span></div>
    <header class="lg-top">
      <div class="lg-brand">${FHE_MARK}<div><b>FRIENDSHIP HALL EST</b><span>Crane hire &amp; heavy lift · Abu Dhabi</span></div></div>
      <div class="lg-loc"><span>24.4539° N · 54.3773° E</span><span id="lgClock">--:--:--</span></div>
    </header>
    <section class="lg-hero">
      <p class="lg-eyebrow"><span>FHE LIFT PLANNER</span><i></i><span>v5.0</span></p>
      <h1>Plan every lift<br>to the <em>millimetre.</em></h1>
      <p class="lg-sub">Load charts, boom geometry, ground bearing and wind at the boom tip — drawn to scale on one A1 sheet, ready for the Appointed Person to sign.</p>
      <dl class="lg-stats"><div><dt>Fleet</dt><dd id="lgFleet">—</dd></div><div><dt>Load charts</dt><dd id="lgCharts">—</dd></div><div><dt>Output</dt><dd>A1 · A3 · DXF</dd></div></dl>
    </section>
    <form class="lg-card" id="lgForm" autocomplete="on" novalidate>
      <div class="lg-card-h"><span>Secure access</span><span class="lg-led" aria-hidden="true"></span></div>
      <div class="lg-field"><span class="lg-lab">Operator</span>
        <div class="lg-user"><span class="lg-av">H</span><span><b>${h(AUTH.user)}</b><small>${h(AUTH.role)}</small></span>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></div>
        <input type="text" name="username" autocomplete="username" value="${h(AUTH.user)}" readonly hidden></div>
      <label class="lg-field" for="lgPass"><span class="lg-lab">Access code</span>
        <span class="lg-pass"><input id="lgPass" name="password" type="password" inputmode="numeric" autocomplete="current-password" placeholder="•••••" aria-describedby="lgErr" required>
        <button type="button" class="lg-eye" id="lgEye" aria-label="Show access code"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0.01 0" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button></span></label>
      <label class="lg-stay"><input type="checkbox" id="lgStay"><span>Keep me signed in on this device</span></label>
      <button type="submit" class="lg-go" id="lgGo"><span>Enter the planner</span><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>
      <p class="lg-err" id="lgErr" role="alert"></p>
      <ol class="lg-boot" id="lgBoot" aria-live="polite"></ol>
    </form>
    <aside class="lg-hud" aria-label="Live crane telemetry (simulation)">
      <div><span>Boom</span><b id="lgTh">--.-</b><small>°</small></div>
      <div><span>Radius</span><b id="lgR">--.-</b><small>m</small></div>
      <div><span>Length</span><b id="lgL">--.-</b><small>m</small></div>
      <div><span>Slew</span><b id="lgSl">---</b><small>°</small></div>
      <div><span>Hook</span><b id="lgHk">--.-</b><small>m</small></div>
      <div class="lg-hud-sim"><span>Mode</span><b>SIM</b></div>
    </aside>
    <footer class="lg-foot"><span class="lg-credit">Designed &amp; built by <b>Saad Khan</b></span><span class="lg-dot" aria-hidden="true"></span><span>© ${new Date().getFullYear()} Friendship Hall Est. For FHE lifting operations.</span></footer>`;
  try { const cr = cranes(); $('#lgFleet', el).textContent = cr.length + ' cranes'; $('#lgCharts', el).textContent = cr.reduce((a, c) => a + (c.charts || []).length, 0) + ' configs'; } catch {}
  const clock = () => { const c = $('#lgClock', el); if (!c) return; const d = new Date(); c.textContent = d.toLocaleTimeString('en-GB', { hour12: false }) + ' ' + (Intl.DateTimeFormat().resolvedOptions().timeZone || '').split('/').pop().replace(/_/g, ' '); };
  clock(); clearInterval(Login.clockT); Login.clockT = setInterval(clock, 1000);
  // 3D hero
  const host = $('#lg3d', el);
  const start = () => {
    if (!C3D.ok() || Login.hero) { el.classList.add('no3d'); return; }
    try {
      const hero = cranes().find(c => c.id === 'ltm1500') || cranes().find(c => c.drawing) || cranes()[0];
      const fmt = (v, d = 1) => (v == null || !isFinite(v) ? '--' : v.toFixed(d));
      let last = 0;
      Login.hero = C3D.hero(host, (t) => {
        const tag = $('#lgTag'); if (tag) { tag.style.transform = `translate3d(${Math.round(t.x + 14)}px, ${Math.round(t.y - 10)}px, 0)`; tag.style.opacity = t.vis ? 1 : 0; }
        if (t.t - last < 0.09) return; last = t.t;
        const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
        set('lgTh', fmt(t.theta)); set('lgR', fmt(t.R)); set('lgL', fmt(t.L)); set('lgSl', String(Math.round(((t.slew % 360) + 360) % 360)).padStart(3, '0')); set('lgHk', fmt(t.hook)); set('lgTagV', `${fmt(t.hook)} m · R ${fmt(t.R)} m`);
      }, { crane: { ...hero, color: '#f4b400', tint: true }, livery: settingsEff().boomText || settingsEff().company || 'FRIENDSHIP HALL EST', reduce });
      requestAnimationFrame(() => el.classList.add('ready'));
    } catch (err) { console.error(err); el.classList.add('no3d'); }
  };
  if (document.fonts && document.fonts.load) Promise.race([document.fonts.load('900 64px "Archivo"'), new Promise(r => setTimeout(r, 900))]).then(start, start); else start();
  setTimeout(() => { el.classList.add('in'); if (!reduce) loginDecode($('.lg h1', el)); }, 30);
  // form
  const pass = $('#lgPass', el), err = $('#lgErr', el), form = $('#lgForm', el);
  setTimeout(() => pass.focus({ preventScroll: true }), 400);
  $('#lgEye', el).onclick = () => { const show = pass.type === 'password'; pass.type = show ? 'text' : 'password'; $('#lgEye', el).setAttribute('aria-label', show ? 'Hide access code' : 'Show access code'); pass.focus(); };
  pass.addEventListener('input', () => { err.textContent = ''; form.classList.remove('bad'); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (form.classList.contains('ok')) return;
    if (!authCheck(pass.value)) { err.textContent = pass.value ? 'Access code not recognised. Try again.' : 'Enter your access code.'; form.classList.remove('bad'); void form.offsetWidth; form.classList.add('bad'); pass.select(); return; }
    authSave($('#lgStay', el).checked); form.classList.add('ok'); pass.blur();
    const boot = $('#lgBoot', el); const cr = cranes(); const lines = [`Access granted · ${AUTH.user}`, `Crane fleet · ${cr.length} machines`, `Load charts · ${cr.reduce((a, c) => a + (c.charts || []).length, 0)} configurations`, 'Opening the studio'];
    lines.forEach((t, i) => setTimeout(() => { const li = document.createElement('li'); li.textContent = t; boot.appendChild(li); }, reduce ? 0 : 140 + i * 190));
    const finish = () => loginFinish();
    setTimeout(() => { if (Login.hero && !reduce) Login.hero.exit(finish); else finish(); }, reduce ? 200 : 900);
    setTimeout(finish, reduce ? 600 : 3200); // never wait on a slow GPU
  });
}
function loginDecode(h1) { // headline resolves out of random glyphs, letter by letter
  if (!h1) return; const glyphs = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&+=/<>'; const nodes = []; const walk = (n) => { for (const c of n.childNodes) { if (c.nodeType === 3 && c.textContent.trim()) nodes.push({ n: c, txt: c.textContent }); else if (c.nodeType === 1) walk(c); } }; walk(h1);
  const total = nodes.reduce((a, o) => a + o.txt.length, 0); const t0 = performance.now(), dur = 1100;
  const step = (now) => { const k = Math.min(1, (now - t0) / dur); let idx = 0;
    for (const o of nodes) { let out = ''; for (let i = 0; i < o.txt.length; i++, idx++) { const ch = o.txt[i]; const at = (idx / total) * 0.75; out += ch === ' ' || k >= at + 0.25 ? ch : k < at ? (Math.random() < 0.5 ? ' ' : glyphs[(Math.random() * glyphs.length) | 0]) : glyphs[(Math.random() * glyphs.length) | 0]; } o.n.textContent = out; }
    if (k < 1) requestAnimationFrame(step); else nodes.forEach(o => o.n.textContent = o.txt); };
  requestAnimationFrame(step);
}
function loginFinish() {
  const el = document.getElementById('login'); if (!el || el.classList.contains('out')) return;
  el.classList.add('out'); document.body.classList.remove('locked'); document.body.classList.add('on', 'app-in');
  const cb = Login.onDone; Login.onDone = null; if (cb) cb();
  setTimeout(() => { if (Login.hero) { Login.hero.dispose(); Login.hero = null; } clearInterval(Login.clockT); el.hidden = true; el.innerHTML = ''; el.classList.remove('out', 'ready', 'in', 'no3d'); document.body.classList.remove('app-in'); }, 900);
}
function loginFallbackArt() { // static night-site illustration when WebGL is off
  return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice"><defs><linearGradient id="lgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03060c"/><stop offset=".7" stop-color="#0d1626"/><stop offset="1" stop-color="#2a1a10"/></linearGradient></defs>
    <rect width="1600" height="900" fill="url(#lgSky)"/>
    <g fill="#070b11">${Array.from({ length: 40 }, (_, i) => { const x = i * 42 + (i % 3) * 7, hh = 80 + ((i * 53) % 230); return `<rect x="${x}" y="${760 - hh}" width="${30 + (i % 4) * 6}" height="${hh}"/>`; }).join('')}</g>
    <g fill="#ffb35c" opacity=".55">${Array.from({ length: 160 }, (_, i) => `<rect x="${(i * 97) % 1600}" y="${560 + ((i * 41) % 190)}" width="3" height="3"/>`).join('')}</g>
    <rect y="760" width="1600" height="140" fill="#0b0f15"/>
    <g stroke="#f4b400" stroke-width="10" fill="none" stroke-linecap="square"><path d="M560 735 L1180 290"/></g><g stroke="#f4b400" stroke-width="5"><path d="M1180 290 L1180 560"/></g>
    <rect x="1160" y="560" width="40" height="22" fill="#d0d4d8"/><rect x="430" y="700" width="260" height="46" fill="#f4b400"/><rect x="560" y="660" width="120" height="50" fill="#f4b400"/>
    <text x="760" y="525" transform="rotate(-35.8 760 525)" font-family="Archivo, Arial Black, sans-serif" font-weight="900" font-size="26" fill="#111" letter-spacing="1">FRIENDSHIP HALL EST</text></svg>`;
}
