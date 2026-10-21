// ===== v7 sign-in: pick your name, type your code. A soft gate that keeps casual visitors out — it is not security. =====
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
// codes are never stored in clear: sha256('fhe:' + name + ':' + code)
const AUTH_USERS = [
  { u: 'Saeed', hash: '6387eaa358e61042450532315193fcf889a8d83463e0340628b772822e400f42' },
  { u: 'Saad', hash: '652a1c7b20506e00c98950bb4b7fcf4872cbb618a1047d7bdee6aee2f7cdbe00' },
  { u: 'Habib', hash: '8eb08ee5636ae8c6da90236db2aac3352eb2c9b30ed59c38045aaafddbecac85' }
];
const AUTH_KEY = 'fhe.auth.v7', AUTH_DAYS = 30;
function authFind(name) { const n = String(name || '').trim().toLowerCase(); return AUTH_USERS.find(x => x.u.toLowerCase() === n); }
function authCheck(name, pass) { const a = authFind(name); return !!a && sha256hex('fhe:' + a.u + ':' + String(pass || '').trim()) === a.hash; }
function authRec() {
  for (const st of [() => sessionStorage, () => localStorage]) { try { const a = JSON.parse(st().getItem(AUTH_KEY) || 'null'); const u = a && authFind(a.u); if (u && a.h === u.hash && num(a.exp) > Date.now()) return a; } catch {} }
  return null;
}
function authValid() { return !!authRec(); }
function authUser() { return authRec()?.u || ''; }
function authSave(stay, name = 'Habib') {
  const a = authFind(name) || AUTH_USERS[2]; const rec = JSON.stringify({ u: a.u, h: a.hash, exp: Date.now() + (stay !== false ? AUTH_DAYS * 864e5 : 12 * 36e5) });
  try { sessionStorage.setItem(AUTH_KEY, rec); } catch {} if (stay !== false) { try { localStorage.setItem(AUTH_KEY, rec); } catch {} }
  V7.user = a.u;
}
function authClear() { try { sessionStorage.removeItem(AUTH_KEY); } catch {} try { localStorage.removeItem(AUTH_KEY); } catch {} }

const Login = { hero: null, user: '', done: false };
function loginShow(onDone) {
  document.body.classList.add('locked');
  const el = $('#login'); el.hidden = false; el.className = '';
  Login.user = authFind(LS.get('fhe.lastUser', ''))?.u || '';
  el.innerHTML = `<div class="lg3d" id="lg3d" aria-hidden="true"></div><div class="lg-veil"></div>
    <div class="lg-in">
      <div class="lg-mark"><span class="mk">${ic('crane', 26, 2)}</span><div><b>FRIENDSHIP HALL EST</b><small>Lift Planner</small></div></div>
      <h1>Plan the lift.<br><em>Lift it safe.</em></h1>
      <form class="lg-card" id="lgForm" autocomplete="off" novalidate>
        <div class="lg-users" role="radiogroup" aria-label="Who are you?">${AUTH_USERS.map(a => `<button type="button" class="lg-u tap" role="radio" data-u="${a.u}" aria-checked="${Login.user === a.u}" aria-pressed="${Login.user === a.u}"><span class="av">${a.u[0]}</span>${a.u}</button>`).join('')}</div>
        <label class="lg-f">${ic('key', 22)}<input id="lgPass" type="password" inputmode="numeric" placeholder="Your code" aria-label="Your code" autocomplete="current-password"><button type="button" class="tap" id="lgEye" aria-label="Show the code" style="color:rgba(245,245,247,.6)">${ic('eye', 22)}</button></label>
        <div class="lg-err" id="lgErr" role="alert"></div>
        <button type="submit" class="lg-go tap" id="lgGo">Sign in ${ic('chev', 20, 2.6)}</button>
        <label class="lg-keep"><span>Keep me signed in</span><span class="sw"><input type="checkbox" id="lgStay" checked aria-label="Keep me signed in"><i></i></span></label>
      </form>
      <div class="lg-foot">Designed and built by Saad Khan · © ${new Date().getFullYear()} Friendship Hall Est.</div>
    </div>`;
  const reduce = reduceMotion();
  setTimeout(() => {
    if (Login.hero || typeof C3D === 'undefined' || !C3D.ok()) return;
    try {
      const hero = cranes().find(c => c.id === 'ltm1500') || cranes().find(c => c.drawing) || cranes()[0];
      Login.hero = C3D.hero($('#lg3d', el), () => {}, { crane: { ...hero, color: '#ffc20e', tint: true }, livery: settingsEff().boomText || settingsEff().company || 'FRIENDSHIP HALL EST', reduce });
      requestAnimationFrame(() => el.classList.add('ready'));
    } catch (err) { console.error(err); }
  }, 60);
  const pass = $('#lgPass', el), err = $('#lgErr', el), form = $('#lgForm', el);
  const shake = () => { form.classList.remove('bad'); void form.offsetWidth; form.classList.add('bad'); };
  const pick = (u) => { Login.user = u; $$('.lg-u', el).forEach(b => { const on = b.dataset.u === u; b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-checked', String(on)); }); err.textContent = ''; setTimeout(() => pass.focus({ preventScroll: true }), 30); };
  $$('.lg-u', el).forEach(b => b.addEventListener('click', () => pick(b.dataset.u)));
  if (Login.user) setTimeout(() => pass.focus({ preventScroll: true }), 500);
  $('#lgEye', el).onclick = () => { pass.type = pass.type === 'password' ? 'text' : 'password'; pass.focus(); };
  pass.addEventListener('input', () => { err.textContent = ''; });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!Login.user) { err.textContent = 'Tap your name first.'; shake(); return; }
    if (!authCheck(Login.user, pass.value)) { err.textContent = pass.value ? 'Wrong code. Try again.' : 'Type your code.'; shake(); pass.select(); return; }
    authSave($('#lgStay', el).checked, Login.user); LS.set('fhe.lastUser', Login.user);
    $('#lgGo', el).innerHTML = `${ic('check', 22, 3)} Welcome, ${h(Login.user)}`;
    const finish = () => {
      if (Login.done) return; Login.done = true;
      document.body.classList.remove('locked'); el.classList.add('out'); onDone && onDone();
      setTimeout(() => { try { Login.hero?.dispose(); } catch {} Login.hero = null; el.hidden = true; el.innerHTML = ''; }, 900);
    };
    if (Login.hero && !reduce) { Login.hero.exit(finish); setTimeout(finish, 2600); } else setTimeout(finish, 250);
  });
}
