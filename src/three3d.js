// ===== 3D: procedural crane + site (three.js r147). Cinematic night site for the sign-in, live digital twin for the studio =====
const C3D = {};
C3D.ok = () => { try { if (typeof THREE === 'undefined') return false; const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } };

// ---------- helpers ----------
C3D.lin = (c) => { const col = new THREE.Color(c); if (col.convertSRGBToLinear) col.convertSRGBToLinear(); return col; }; // author colours as seen on screen
C3D.mat = (o) => { const p = { ...o }; if (p.color != null) p.color = C3D.lin(p.color); if (p.emissive != null) p.emissive = C3D.lin(p.emissive); return new THREE.MeshStandardMaterial(p); };
C3D.basic = (o) => { const p = { ...o }; if (p.color != null) p.color = C3D.lin(p.color); return new THREE.MeshBasicMaterial(p); };
C3D.box = (w, h, d, mat, x = 0, y = 0, z = 0, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; if (parent) parent.add(m); return m; };
C3D.cyl = (r1, r2, h, mat, seg = 18) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); m.castShadow = m.receiveShadow = true; return m; };
C3D.between = (mesh, a, b) => { // orient a unit-height, Y-aligned mesh between two points
  const d = new THREE.Vector3().subVectors(b, a); const L = d.length(); mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.scale.set(1, Math.max(1e-3, L), 1); if (L > 1e-6) mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
};
C3D.lum = (hex) => { const c = new THREE.Color(hex); return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b; };
C3D.textTex = (text, o = {}) => {
  const c = document.createElement('canvas'); c.width = o.w || 2048; c.height = o.h || 256; const g = c.getContext('2d');
  const font = o.font || '"Archivo", "Arial Black", Arial, sans-serif'; let size = Math.round(c.height * 0.62);
  g.clearRect(0, 0, c.width, c.height); g.fillStyle = o.color || '#111'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${o.weight || 900} ${size}px ${font}`;
  while (g.measureText(text).width > c.width * 0.94 && size > 10) { size -= 4; g.font = `${o.weight || 900} ${size}px ${font}`; }
  g.fillText(text, c.width / 2, c.height / 2 + 2); const t = new THREE.CanvasTexture(c); t.anisotropy = 8; t.encoding = THREE.sRGBEncoding; return t;
};
C3D.stripeTex = (a = '#f5c400', b = '#141414') => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.fillStyle = a; g.fillRect(0, 0, 128, 128); g.fillStyle = b; for (let i = -128; i < 256; i += 48) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 24, 0); g.lineTo(i + 24 - 128, 128); g.lineTo(i - 128, 128); g.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; return t; };
C3D.glowTex = () => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); };
C3D.gradTex = (stops) => { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 256); stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; };
// lattice section (jibs, superlift mast, tower cranes) as one instanced mesh along +x
C3D.lattice = (len, h, w, mat, opts = {}) => {
  const bay = opts.bay || Math.max(1.2, h * 1.05), nb = Math.max(1, Math.round(len / bay)), b = len / nb;
  const geo = new THREE.CylinderGeometry(opts.r || 0.045, opts.r || 0.045, 1, 6); geo.translate(0, 0.5, 0);
  const im = new THREE.InstancedMesh(geo, mat, 4 + nb * 8); im.castShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), d = new THREE.Vector3();
  let k = 0; const put = (a, c) => { d.subVectors(c, a); const L = d.length(); q.setFromUnitVectors(up, d.normalize()); sc.set(1, L, 1); m4.compose(a, q, sc); im.setMatrixAt(k++, m4); };
  const tp = (x) => opts.taper ? Math.max(0.35, 1 - (x / len) * opts.taper) : 1;
  const corner = (x, i) => { const t = tp(x); return new THREE.Vector3(x, (i < 2 ? h / 2 : -h / 2) * t, (i % 2 ? w / 2 : -w / 2) * t); };
  for (let i = 0; i < 4; i++) put(corner(0, i), corner(len, i));
  for (let j = 0; j < nb; j++) { const x0 = j * b, x1 = x0 + b; put(corner(x0, 0), corner(x1, 2)); put(corner(x0, 1), corner(x1, 3)); put(corner(x0, 0), corner(x1, 1)); put(corner(x0, 2), corner(x1, 3)); put(corner(x1, 0), corner(x1, 2)); put(corner(x1, 1), corner(x1, 3)); put(corner(x1, 0), corner(x1, 1)); put(corner(x1, 2), corner(x1, 3)); }
  im.count = k; im.instanceMatrix.needsUpdate = true; return im;
};
C3D.lines = (color, opacity = 1) => { const l = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: C3D.lin(color), transparent: opacity < 1, opacity })); l.frustumCulled = false; return l; };
C3D.setLines = (l, pts) => { l.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); l.geometry.computeBoundingSphere(); };

// ---------- the crane ----------
C3D.buildCrane = (p) => {
  const g = {}; const root = new THREE.Group(); g.root = root;
  const paint = C3D.mat({ color: p.paint || '#f5c400', metalness: 0.3, roughness: 0.42 });
  const paintDk = C3D.mat({ color: '#' + new THREE.Color(p.paint || '#f5c400').multiplyScalar(0.74).getHexString(), metalness: 0.3, roughness: 0.5 });
  const steel = C3D.mat({ color: '#2b2f34', metalness: 0.6, roughness: 0.5 });
  const cw = C3D.mat({ color: '#3a3e43', metalness: 0.4, roughness: 0.65 });
  const glass = C3D.mat({ color: '#0e1b28', metalness: 0.9, roughness: 0.08, emissive: '#10324a', emissiveIntensity: 0.5 });
  const tyre = C3D.mat({ color: '#141414', metalness: 0.1, roughness: 0.92 });
  const chrome = C3D.mat({ color: '#d4d8dc', metalness: 0.95, roughness: 0.18 });
  const wood = C3D.mat({ color: '#6b5232', metalness: 0, roughness: 0.95 });
  const lat = C3D.mat({ color: p.paint || '#f5c400', metalness: 0.4, roughness: 0.45 });
  g.mats = { paint, paintDk, steel, cw, glass, tyre, chrome, lat };
  const Lc = p.Lc || 15, W = p.W || 2.9, deck = p.truck ? 1.7 : 1.9, tr = p.truck ? 0.56 : 0.66, lift = 0.12;
  const xr = -Lc * 0.55, xf = Lc * 0.45;
  // carrier
  C3D.box(Lc, 0.85, W - 0.5, steel, (xr + xf) / 2, 1.25, 0, root);
  C3D.box(Lc - 0.4, 0.38, W, paint, (xr + xf) / 2, deck - 0.19, 0, root);
  C3D.box(2.3, p.truck ? 1.7 : 1.35, W, paint, xf - 1.15, deck + (p.truck ? 0.85 : 0.67), 0, root);
  C3D.box(0.08, p.truck ? 1.0 : 0.8, W - 0.3, glass, xf + 0.01, deck + (p.truck ? 1.05 : 0.8), 0, root);
  C3D.box(1.6, 0.6, 0.04, glass, xf - 1.1, deck + (p.truck ? 1.15 : 0.9), W / 2 + 0.01, root);
  C3D.box(1.6, 0.6, 0.04, glass, xf - 1.1, deck + (p.truck ? 1.15 : 0.9), -W / 2 - 0.01, root);
  const ax = Math.max(2, p.axles || 4); const front = Math.min(ax - 1, Math.max(1, Math.round(ax * (p.truck ? 0.4 : 0.5))));
  const xs = []; for (let i = 0; i < front; i++) xs.push(xf - 2.4 - i * 1.65); for (let i = 0; i < ax - front; i++) xs.push(xr + 1.4 + i * 1.65);
  const wg = new THREE.CylinderGeometry(tr, tr, 0.6, 28); wg.rotateX(Math.PI / 2); const hg = new THREE.CylinderGeometry(tr * 0.5, tr * 0.5, 0.62, 18); hg.rotateX(Math.PI / 2);
  for (const x of xs) for (const z of [-(W / 2 - 0.3), W / 2 - 0.3]) { const w = new THREE.Mesh(wg, tyre); w.position.set(x, tr + lift, z); w.castShadow = true; root.add(w); const hh = new THREE.Mesh(hg, steel); hh.position.copy(w.position); root.add(hh); }
  const oT0 = (p.outT || 7) / 2, oL = (p.outL || 7) / 2;
  for (const x of [oL, -oL]) for (const s of [-1, 1]) {
    const oT = s < 0 ? (p.oTL ?? oT0) : (p.oTR ?? oT0); // this side's reach: left = −z (full or half out)
    const beamL = oT - W / 2 + 0.3; C3D.box(0.5, 0.42, beamL, paintDk, x, 1.3, s * (W / 2 + beamL / 2 - 0.3), root);
    const j = C3D.cyl(0.13, 0.13, 1.0, chrome); j.position.set(x, 0.85, s * (oT - 0.2)); root.add(j);
    C3D.box(0.55, 0.75, 0.55, paintDk, x, 1.55, s * (oT - 0.2), root);
    C3D.box(0.85, 0.18, 0.85, steel, x, 0.29, s * (oT - 0.2), root);
    C3D.box(p.mat || 1.6, 0.2, p.mat || 1.6, wood, x, 0.1, s * (oT - 0.2), root);
  }
  // superstructure (slews)
  const up = new THREE.Group(); up.position.set(0, deck, 0); root.add(up); g.upper = up;
  const ring = C3D.cyl(1.35, 1.35, 0.25, steel, 32); ring.position.y = 0.12; up.add(ring);
  const tail = p.tail || 5, px = p.pivX ?? -1.5, ph = (p.pivH || 3.2) - deck; g.px = px; g.ph = ph; g.tail = tail;
  C3D.box(tail + px + 2.2, 0.8, W - 0.2, paint, (-tail + px + 2.2) / 2 + 0.2, 0.62, 0, up);
  const cwt = Math.max(5, p.cwt || 30), cwW = Math.min(3.2, 1.2 + cwt / 55), cwH = Math.min(3.4, 0.9 + cwt / 32);
  for (let y = 0.4; y < 0.4 + cwH - 0.05; y += 0.42) C3D.box(cwW, Math.min(0.4, 0.4 + cwH - y), W + 0.25, cw, -tail + cwW / 2, y + 0.2, 0, up);
  C3D.box(Math.max(1, -px - cwW + tail - 1.2), 1.15, W - 0.4, paint, (-tail + cwW + px - 0.3) / 2, 1.45, 0, up);
  const drum = C3D.cyl(0.55, 0.55, W - 0.6, steel, 24); drum.rotation.x = Math.PI / 2; drum.position.set(-tail + cwW + 0.9, 1.5, 0); up.add(drum);
  const ocab = new THREE.Group(); ocab.position.set(px + 1.25, 0.6, -(W / 2 - 0.55)); up.add(ocab);
  C3D.box(1.9, 2.0, 1.0, paint, 0, 1.0, 0, ocab); C3D.box(0.06, 1.2, 0.85, glass, 0.96, 1.25, 0, ocab); C3D.box(1.5, 1.1, 0.04, glass, 0.05, 1.3, -0.51, ocab);
  C3D.box(1.4, ph + 0.2, 0.25, paintDk, px, (ph + 0.2) / 2 + 0.3, 0.75, up); C3D.box(1.4, ph + 0.2, 0.25, paintDk, px, (ph + 0.2) / 2 + 0.3, -0.75, up);
  // telescopic boom
  const boom = new THREE.Group(); boom.position.set(px, ph, 0); up.add(boom); g.boom = boom;
  const D = p.D || 1.4; const qc = p.qc != null ? p.qc : -0.3 * D; g.D = D; g.qc = qc;
  g.secs = []; const n = p.n || 5;
  for (let i = 0; i < n; i++) {
    const d = D * Math.pow(0.88, i), w = d * 0.78; const m = i % 2 ? paintDk : paint;
    const geo = new THREE.BoxGeometry(1, d, w); geo.translate(0.5, 0, 0);
    const sec = new THREE.Mesh(geo, m); sec.castShadow = sec.receiveShadow = true; sec.position.y = qc; boom.add(sec);
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, d * 1.06, w * 1.06), steel); col.castShadow = true; col.position.y = qc; if (i < n - 1) boom.add(col);
    g.secs.push({ sec, col, d, w });
  }
  if (p.livery) { // company lettering on both faces of the base section
    const tex = C3D.textTex(p.livery, { color: C3D.lum(p.paint || '#f5c400') > 0.55 ? '#111111' : '#ffffff' });
    const lm = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    g.letters = [1, -1].map((s) => { const pl = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.125), lm); if (s < 0) pl.rotation.y = Math.PI; boom.add(pl); return { pl, s }; });
  }
  const headM = new THREE.Group(); boom.add(headM); g.head = headM;
  C3D.box(1.2, D * 0.7, D * 0.6, paintDk, 0.3, qc * 0.4, 0, headM);
  for (const z of [-0.18, 0.18]) { const sh = C3D.cyl(0.42, 0.42, 0.14, steel, 24); sh.rotation.x = Math.PI / 2; sh.position.set(0.9, 0, z); headM.add(sh); }
  g.cylA = new THREE.Vector3(px + 2.2, 0.85, 0); g.barrel = C3D.cyl(D * 0.17, D * 0.17, 1, paintDk); g.rod = C3D.cyl(D * 0.09, D * 0.09, 1, chrome); up.add(g.barrel); up.add(g.rod);
  // hook, rope, slings and load hang in world space
  const hook = new THREE.Group(); g.hook = hook;
  const stripe = new THREE.MeshStandardMaterial({ map: C3D.stripeTex(), metalness: 0.3, roughness: 0.5 });
  C3D.box(0.9, 1.05, 0.55, stripe, 0, 0, 0, hook);
  for (const z of [-0.2, 0.2]) { const sh = C3D.cyl(0.32, 0.32, 0.1, steel, 18); sh.rotation.x = Math.PI / 2; sh.position.set(0, 0.25, z); hook.add(sh); }
  const hk = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.07, 10, 24, Math.PI * 1.45), steel); hk.position.set(0, -0.85, 0); hk.rotation.z = Math.PI * 0.8; hook.add(hk);
  const sh2 = C3D.cyl(0.07, 0.07, 0.35, steel); sh2.position.set(0, -0.6, 0); hook.add(sh2);
  g.rope = C3D.lines('#151515'); g.slings = C3D.lines('#d13b2a');
  g.load = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), C3D.mat({ color: '#9aa1a8', metalness: 0.1, roughness: 0.85 })); g.load.castShadow = g.load.receiveShadow = true;
  // accessories (built lazily)
  g.acc = { sl: null, yg: null, run: null, guy: C3D.lines('#1a1a1a') }; up.add(g.acc.guy);
  g.jib = null;
  g.p = p; g.state = { theta: 55, slew: 0, fr: Array(n - 1).fill(0.4), L: null, hookY: null, loadSize: [3, 1.5, 2], jib: null, acc: {} };
  return g;
};
// pose everything from the state (every frame in the hero, on change in the twin)
C3D.pose = (g, st, world) => {
  const p = g.p; const n = p.n; const spec = { n, lens: p.lens, lo: 0.3, E: p.E, foot: p.foot, head: p.head };
  const lay = boomLayout(spec, st.L || (p.Lmin + st.fr.reduce((a, f) => a + f * p.E, 0)), st.fr);
  const K = lay.k; const th = st.theta * Math.PI / 180;
  g.upper.rotation.y = st.slew * Math.PI / 180; g.boom.rotation.z = th;
  g.secs.forEach(({ sec, col }, i) => { const L = lay.lens[i] * K, x0 = lay.starts[i] * K; sec.scale.x = L; sec.position.x = x0; col.position.x = x0 + L - 0.25; });
  const tipX = lay.tip * K; g.head.position.x = tipX - 0.9;
  if (g.letters) { const s0 = (lay.starts[0] + lay.foot + 0.7) * K, s1 = (lay.starts[0] + lay.lens[0] - 0.8) * K; const len = Math.max(1, s1 - s0); const sec0 = g.secs[0]; let sc = len; if (sc * 0.125 > sec0.d * 0.8) sc = sec0.d * 0.8 / 0.125;
    for (const { pl, s } of g.letters) { pl.scale.set(sc, sc, 1); pl.position.set(s0 + len / 2, g.qc, s * (sec0.w / 2 + 0.012)); } }
  const bAnchor = new THREE.Vector3((lay.starts[0] + lay.lens[0] * 0.42) * K, g.qc - g.D / 2, 0); g.boom.updateMatrix(); bAnchor.applyMatrix4(g.boom.matrix);
  const mid = new THREE.Vector3().lerpVectors(g.cylA, bAnchor, 0.6); C3D.between(g.barrel, g.cylA, mid); C3D.between(g.rod, mid, bAnchor);
  // jib (fly / luffing)
  let tipLocal = new THREE.Vector3(tipX, 0, 0);
  if (st.jib && st.jib.len > 0) {
    if (!g.jib || g.jib.userData.len !== st.jib.len) { if (g.jib) g.boom.remove(g.jib); g.jib = new THREE.Group(); g.jib.userData.len = st.jib.len; g.jib.add(C3D.lattice(st.jib.len, 1.25, 1.1, g.mats.lat, { taper: 0.55 })); g.boom.add(g.jib); }
    const rel = (st.jib.angle - st.theta) * Math.PI / 180; g.jib.position.set(tipX - 0.4, 0, 0); g.jib.rotation.z = rel;
    tipLocal = new THREE.Vector3(tipX - 0.4 + st.jib.len * Math.cos(rel), st.jib.len * Math.sin(rel), 0);
  } else if (g.jib) { g.boom.remove(g.jib); g.jib = null; }
  C3D.poseAcc(g, st, lay, K);
  // world positions for the hanging parts
  g.root.updateMatrixWorld(true); const tipW = tipLocal.clone(); g.boom.localToWorld(tipW);
  const hookY = st.hookY != null ? Math.min(st.hookY, tipW.y - 1.4) : Math.max(2.5, tipW.y * 0.45);
  g.hook.position.set(tipW.x, hookY, tipW.z); g.hook.rotation.y = g.root.rotation.y + g.upper.rotation.y;
  const rp = []; for (const dz of [-0.16, 0.16]) rp.push(tipW.x, tipW.y - 0.4, tipW.z + dz, tipW.x, hookY + 0.5, tipW.z + dz); C3D.setLines(g.rope, rp);
  const [lx, ly, lz] = st.loadSize; const loadTop = hookY - 0.95 - Math.max(1.2, st.rig || 3);
  const yaw = g.root.rotation.y + g.upper.rotation.y; g.load.scale.set(lx, ly, lz); g.load.position.set(tipW.x, loadTop - ly / 2, tipW.z); g.load.rotation.y = yaw;
  const sp = []; const c = Math.cos(yaw), s_ = Math.sin(yaw);
  for (const [axx, azz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const ox = axx * lx / 2 * 0.85, oz = azz * lz / 2 * 0.85; sp.push(tipW.x, hookY - 1.0, tipW.z, tipW.x + ox * c + oz * s_, loadTop, tipW.z - ox * s_ + oz * c); }
  C3D.setLines(g.slings, sp); g.load.visible = g.slings.visible = !st.empty;
  if (world && !g._hung) { world.add(g.hook, g.rope, g.slings, g.load); g._hung = true; }
  g.tipW = tipW; g.lay = lay;
  return { tipW, hookY, lay };
};
C3D.poseAcc = (g, st, lay, K) => {
  const A = st.acc || {}; const up = g.upper; const L = lay.tip * K; const th = st.theta * Math.PI / 180;
  const boomPt = (s, q = 0) => new THREE.Vector3(g.px + s * Math.cos(th) - q * Math.sin(th), g.ph + s * Math.sin(th) + q * Math.cos(th), 0); // boom axis → upper coords
  const guy = [];
  // superlift: derrick mast at 102°, ballast tray at the superlift radius, pendants to the boom head and the tray
  if (A.superlift) {
    const Lm = Math.max(14, Math.min(32, L * 0.42)), r = Math.max(8, num(A.slRadius, 15)), bt = Math.max(10, num(A.slBallast, 100)), bh = Math.max(0.8, Math.min(3.2, bt / 55));
    const key = [Lm.toFixed(1), r, bh].join('|');
    if (!g.acc.sl || g.acc.sl.userData.key !== key) {
      if (g.acc.sl) up.remove(g.acc.sl); const sl = new THREE.Group(); sl.userData.key = key;
      const mast = C3D.lattice(Lm, 1.4, 1.4, g.mats.lat, { bay: 1.8, r: 0.06 }); mast.position.set(g.px + 0.6, g.ph + 0.25, 0); mast.rotation.z = 102 * Math.PI / 180; sl.add(mast);
      C3D.box(4, bh, 3.2, g.mats.cw, -r, bh / 2 + 0.55 - 1.9, 0, sl); C3D.box(4.4, 0.35, 3.6, g.mats.steel, -r, 0.175 - 1.9, 0, sl);
      sl.userData.top = new THREE.Vector3(g.px + 0.6 + Lm * Math.cos(102 * Math.PI / 180), g.ph + 0.25 + Lm * Math.sin(102 * Math.PI / 180), 0); sl.userData.tray = new THREE.Vector3(-r, bh + 0.55 - 1.9, 0);
      up.add(sl); g.acc.sl = sl;
    }
    const top = g.acc.sl.userData.top, tray = g.acc.sl.userData.tray, head = boomPt(L - 1);
    for (const dz of [-0.35, 0.35]) guy.push(top.x, top.y, dz, head.x, head.y, dz, top.x, top.y, dz, tray.x + 0.6, tray.y, dz);
  } else if (g.acc.sl) { up.remove(g.acc.sl); g.acc.sl = null; }
  // Y-guying: two struts splayed sideways from the base section, guy ropes to the head and the foot
  if (A.yguy) {
    const Ly = Math.max(6, Math.min(12, L * 0.17)); const s0 = lay.starts[0] * K + lay.lens[0] * K * 0.3; const pin = boomPt(s0, g.qc + g.D / 2);
    const a = th + 97 * Math.PI / 180; const Y = new THREE.Vector3(pin.x + Ly * Math.cos(a), pin.y + Ly * Math.sin(a), 0);
    if (!g.acc.yg) { const yg = new THREE.Group(); g.acc.yg = yg; yg.userData.struts = [-1, 1].map(s => { const m = C3D.cyl(0.14, 0.1, 1, g.mats.paintDk, 8); yg.add(m); return { m, s }; }); up.add(yg); }
    for (const { m, s } of g.acc.yg.userData.struts) C3D.between(m, new THREE.Vector3(pin.x, pin.y, s * 0.45), new THREE.Vector3(Y.x, Y.y, s * 1.6));
    const head = boomPt(L - 0.8, g.qc + g.D * 0.3), foot = boomPt(lay.starts[0] * K + 0.7, g.qc + g.D / 2);
    for (const s of [-1, 1]) guy.push(Y.x, Y.y, s * 1.6, head.x, head.y, s * 0.2, Y.x, Y.y, s * 1.6, foot.x, foot.y, s * 0.3);
  } else if (g.acc.yg) { up.remove(g.acc.yg); g.acc.yg = null; }
  // runner: short single-sheave head beside the main head
  if (A.runner && !(st.jib && st.jib.len > 0)) {
    if (!g.acc.run) { const rn = new THREE.Group(); C3D.box(1.7, 0.4, 0.35, g.mats.steel, 0.85, 0, 0, rn); const sv = C3D.cyl(0.26, 0.26, 0.12, g.mats.chrome, 18); sv.rotation.x = Math.PI / 2; sv.position.set(1.7, 0, 0); rn.add(sv); g.boom.add(rn); g.acc.run = rn; }
    g.acc.run.position.set(lay.tip * K, 0, 0.45); g.acc.run.rotation.z = -25 * Math.PI / 180;
  } else if (g.acc.run) { g.boom.remove(g.acc.run); g.acc.run = null; }
  C3D.setLines(g.acc.guy, guy);
};
// crane parameters from the library + plan (shared by the sign-in hero and the twin)
C3D.paramsFor = (crane, plan, calc, livery) => {
  const spec = boomSpec(crane, chartLengths(crane)); const dr = craneDrawing(crane);
  const b = dr ? baseSectionInfo(dr) : null;
  return { Lc: num(crane.carrierLen, 15), W: num(crane.width, 2.9), axles: num(crane.axles, 6), outT: num(crane.outTrans, 8), outL: num(crane.outLong, 8), tail: num(crane.tail, 5),
    pivX: dr ? dr.pivot[0] : num(crane.pivotX, -1.5), pivH: dr ? dr.pivot[1] : num(crane.pivotH, 3.2), D: b ? Math.max(0.8, b.qb - b.qa) : spec.D, qc: b ? (b.qa + b.qb) / 2 : null,
    paint: crane.tint || !dr ? (crane.color || '#f5c400') : (isLightFill(b?.fill) ? b.fill : '#f2f2f2'), n: spec.n, lens: spec.lens, E: spec.E, foot: spec.foot, head: spec.head, Lmin: spec.Lmin,
    cwt: num(plan?.cwt ?? crane.cwt, 40), livery, truck: /truck/i.test(crane.type || ''), mat: matDims(plan?.matSize)[0],
    ...(typeof outSpans === 'function' && plan ? (() => { const s = outSpans(crane, outExtOf(plan)); return { oTL: s.yL, oTR: s.yR }; })() : {}) };
};

// ---------- renderer shell ----------
C3D.makeRenderer = (host, o = {}) => {
  const r = new THREE.WebGLRenderer({ antialias: !!o.aa, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!o.keep });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, o.maxDpr || 1.75));
  r.shadowMap.enabled = !!o.shadows; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = o.exposure || 1.0; r.outputEncoding = THREE.sRGBEncoding;
  r.domElement.style.cssText = 'display:block;width:100%;height:100%'; host.appendChild(r.domElement);
  return r;
};
C3D.makeComposer = (r, scene, cam, bloom) => {
  if (!THREE.EffectComposer || !THREE.UnrealBloomPass) return null;
  const size = r.getSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(size.x * r.getPixelRatio(), size.y * r.getPixelRatio(), { type: THREE.HalfFloatType }); if (r.capabilities.isWebGL2) rt.samples = 4;
  const comp = new THREE.EffectComposer(r, rt); comp.addPass(new THREE.RenderPass(scene, cam));
  const bp = new THREE.UnrealBloomPass(new THREE.Vector2(size.x, size.y), bloom.strength, bloom.radius, bloom.threshold); comp.addPass(bp); comp.bloom = bp;
  return comp;
};

// ---------- HERO: night construction site behind the sign-in ----------
C3D.hero = (host, hud, o = {}) => {
  const W0 = () => host.clientWidth || window.innerWidth, H0 = () => host.clientHeight || window.innerHeight;
  const small = Math.min(W0(), H0()) < 700;
  const r = C3D.makeRenderer(host, { exposure: 1.1, maxDpr: small ? 1.25 : 1.5 });
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(C3D.lin('#0a1220'), 0.0042);
  const cam = new THREE.PerspectiveCamera(40, W0() / H0(), 0.5, 5000);
  // sky
  const skyM = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: C3D.lin('#02050a') }, mid: { value: C3D.lin('#0b1424') }, glow: { value: C3D.lin('#ff7a1a') }, haze: { value: C3D.lin('#1b2c44') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 glow; uniform vec3 haze; varying vec3 vP; void main(){ float h = vP.y; vec3 c = mix(mid, top, smoothstep(0.0, 0.6, h)); c = mix(haze, c, smoothstep(-0.02, 0.12, h)); float g = exp(-max(h + 0.02, 0.) * 14.0); float ang = 0.35 + 0.65 * pow(max(0., dot(normalize(vP.xz), normalize(vec2(-0.6, -0.8)))), 3.0); c += glow * g * 0.42 * ang; gl_FragColor = vec4(c, 1.); }' });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(2400, 32, 16), skyM));
  { const n = 1600, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, e = 0.12 + Math.random() * 1.35; pos.set([Math.cos(a) * Math.cos(e) * 2000, Math.sin(e) * 2000, Math.sin(a) * Math.cos(e) * 2000], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#a9bedc', size: 1.5, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.75 }))); }
  // ground, glowing site grid, rings
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), C3D.mat({ color: '#0c1016', metalness: 0.25, roughness: 0.85 })); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const grid = new THREE.GridHelper(400, 80, C3D.lin('#1d6f88'), C3D.lin('#112536')); grid.position.y = 0.02; grid.material.transparent = true; grid.material.opacity = 0.5; scene.add(grid);
  const ringM = (col, op) => new THREE.MeshBasicMaterial({ color: C3D.lin(col), transparent: true, opacity: op, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const site = new THREE.Mesh(new THREE.RingGeometry(57.6, 58, 160), ringM('#ffb81c', 0.45)); site.rotation.x = -Math.PI / 2; site.position.y = 0.05; scene.add(site);
  const scan = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 160), ringM('#4fe0ff', 0.9)); scan.rotation.x = -Math.PI / 2; scan.position.y = 0.06; scene.add(scan);
  const radR = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 160), ringM('#4fe0ff', 0.55)); radR.rotation.x = -Math.PI / 2; radR.position.y = 0.07; scene.add(radR);
  // city skyline with lit windows
  { const wc = document.createElement('canvas'); wc.width = 64; wc.height = 256; const g = wc.getContext('2d'); g.fillStyle = '#04070c'; g.fillRect(0, 0, 64, 256);
    for (let y = 4; y < 256; y += 8) for (let x = 3; x < 64; x += 7) if (Math.random() < 0.3) { g.fillStyle = Math.random() < 0.82 ? `rgba(255,${185 + Math.random() * 50 | 0},${120 + Math.random() * 50 | 0},${0.45 + Math.random() * 0.55})` : 'rgba(150,205,255,.85)'; g.fillRect(x, y, 4, 4); }
    const wt = new THREE.CanvasTexture(wc); wt.encoding = THREE.sRGBEncoding;
    const bm = new THREE.MeshStandardMaterial({ color: C3D.lin('#06090e'), emissive: new THREE.Color('#ffffff'), emissiveMap: wt, emissiveIntensity: 1.25, roughness: 0.8, metalness: 0.2 });
    const n = 420, im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bm, n); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, d = 290 + Math.random() * 640, hh = 20 + Math.pow(Math.random(), 2.4) * 230, w = 16 + Math.random() * 28;
      m4.compose(new THREE.Vector3(Math.cos(a) * d, hh / 2, Math.sin(a) * d), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 3), new THREE.Vector3(w, hh, w * (0.6 + Math.random() * 0.8))); im.setMatrixAt(i, m4); }
    scene.add(im);
    // aircraft warning lights on the tallest towers
    const tl = []; for (let i = 0; i < 24; i++) { const a = Math.random() * Math.PI * 2, d = 420 + Math.random() * 420; tl.push(Math.cos(a) * d, 120 + Math.random() * 130, Math.sin(a) * d); }
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(tl, 3)); scene.userData.warn = new THREE.Points(tg, new THREE.PointsMaterial({ color: C3D.lin('#ff3030'), size: 9, map: C3D.glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); scene.add(scene.userData.warn); }
  // highway with moving headlights / tail lights
  const road = (() => { const n = 70, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), sp = []; const glow = C3D.glowTex();
    for (let i = 0; i < n; i++) { const dir = i % 2 ? 1 : -1; pos.set([(Math.random() - 0.5) * 900, 0.8, -150 + dir * 3], i * 3); const c = dir > 0 ? C3D.lin('#fff1d6') : C3D.lin('#ff3a2a'); col.set([c.r, c.g, c.b], i * 3); sp.push(dir * (12 + Math.random() * 10)); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, map: glow, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(pts);
    const lamp = []; for (let x = -450; x < 450; x += 30) lamp.push(x, 9, -158); const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lamp, 3));
    scene.add(new THREE.Points(lg, new THREE.PointsMaterial({ color: C3D.lin('#ffb24a'), size: 4, map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    return { pts, sp }; })();
  // building under construction where the load is going
  const bld = new THREE.Group(); bld.position.set(-31, 0, -9); bld.rotation.y = 0.12; scene.add(bld);
  const conc = C3D.mat({ color: '#5b6067', roughness: 0.92, metalness: 0.05 }); const floors = 9, fh = 3.6;
  const colG = new THREE.BoxGeometry(0.55, fh, 0.55); const colIM = new THREE.InstancedMesh(colG, conc, floors * 24); let ci = 0; const m4 = new THREE.Matrix4();
  for (let f = 0; f <= floors; f++) { C3D.box(30, 0.32, 22, conc, 0, f * fh, 0, bld);
    if (f < floors) for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { m4.makeTranslation(-12.5 + i * 5, f * fh + fh / 2, -9 + j * 6); colIM.setMatrixAt(ci++, m4); }
    if (f < floors - 1 && f % 2 === 0) { const lw = new THREE.Mesh(new THREE.PlaneGeometry(29, fh - 0.4), C3D.basic({ color: '#ffb35c', transparent: true, opacity: 0.16 })); lw.position.set(0, f * fh + fh / 2, 11.05); bld.add(lw); } }
  colIM.count = ci; bld.add(colIM);
  const net = new THREE.Mesh(new THREE.PlaneGeometry(30, fh * 2), C3D.basic({ color: '#ff6a00', transparent: true, opacity: 0.2, side: THREE.DoubleSide })); net.position.set(0, floors * fh - fh, 11.2); bld.add(net);
  const rebar = C3D.mat({ color: '#7a4f33', roughness: 0.8 }); for (let i = 0; i < 24; i++) { const rb = C3D.cyl(0.04, 0.04, 2.4, rebar, 5); rb.position.set(-12.5 + (i % 6) * 5, floors * fh + 1.3, -9 + Math.floor(i / 6) * 6); bld.add(rb); }
  const landing = new THREE.Vector3(); bld.localToWorld(landing.set(4, floors * fh + 0.16, 2));
  // tower cranes behind, slowly slewing, with blinking obstacle lights
  const lights = []; const tcs = [];
  const towerCrane = (x, z, h, jl, rot, spd) => { const tg = new THREE.Group(); tg.position.set(x, 0, z); scene.add(tg);
    const tm = C3D.mat({ color: '#c99a1b', metalness: 0.5, roughness: 0.5 }); const mast = C3D.lattice(h, 1.8, 1.8, tm, { bay: 2.2, r: 0.07 }); mast.rotation.z = Math.PI / 2; tg.add(mast);
    const top = new THREE.Group(); top.position.y = h + 1; top.rotation.y = rot; tg.add(top);
    const jib = C3D.lattice(jl, 1.6, 1.3, tm, { bay: 2.0, r: 0.06, taper: 0.4 }); top.add(jib);
    const cj = C3D.lattice(jl * 0.32, 1.4, 1.3, tm, { bay: 2.0, r: 0.06 }); cj.rotation.y = Math.PI; top.add(cj); C3D.box(3, 2.2, 2, C3D.mat({ color: '#3a3f45' }), -jl * 0.3, -0.8, 0, top);
    const apex = C3D.lattice(6, 1.4, 1.4, tm, { bay: 2, r: 0.06 }); apex.rotation.z = Math.PI / 2; top.add(apex);
    for (const [lx, ly] of [[jl, 0.6], [0, 6], [-jl * 0.32, 0.6]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), new THREE.MeshBasicMaterial({ color: C3D.lin('#ff2a2a') })); s.position.set(lx, ly, 0); top.add(s); lights.push(s); }
    tcs.push({ top, spd, base: rot }); };
  towerCrane(-120, -175, 58, 52, 0.4, 0.018); towerCrane(70, -240, 66, 60, 2.6, -0.012); towerCrane(-250, -110, 50, 46, -0.8, 0.01); towerCrane(190, 120, 62, 56, 1.4, 0.014); towerCrane(-170, 210, 54, 50, -2.2, -0.016);
  // lights: hemisphere, moon, floodlights with visible beams, warm bounce
  scene.add(new THREE.HemisphereLight(C3D.lin('#5b7fb3'), C3D.lin('#1a120a'), 0.75));
  const moon = new THREE.DirectionalLight(C3D.lin('#a9c8ff'), 0.9); moon.position.set(140, 200, 120); scene.add(moon);
  const beamTex = C3D.gradTex([[0, 'rgba(255,255,255,0)'], [0.06, 'rgba(255,240,210,0.65)'], [1, 'rgba(255,255,255,0)']]);
  const flood = (x, z, tx, tz, col) => { const mast = C3D.cyl(0.25, 0.3, 18, C3D.mat({ color: '#30353b' })); mast.position.set(x, 9, z); scene.add(mast);
    const sp = new THREE.SpotLight(C3D.lin(col), 1.9, 170, 0.42, 0.65, 1.2); sp.position.set(x, 18, z); sp.target.position.set(tx, 0, tz); scene.add(sp, sp.target);
    const hgt = Math.hypot(tx - x, tz - z, 18) * 1.05; const cone = new THREE.Mesh(new THREE.ConeGeometry(Math.tan(0.45) * hgt, hgt, 40, 1, true), new THREE.MeshBasicMaterial({ color: C3D.lin(col), map: beamTex, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    const a = new THREE.Vector3(x, 18, z), b = new THREE.Vector3(tx, 0, tz); cone.position.copy(a).lerp(b, 0.5); cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), b.clone().sub(a).normalize()); scene.add(cone);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), new THREE.MeshBasicMaterial({ color: C3D.lin('#fff3d6') })); bulb.position.copy(a); scene.add(bulb); };
  flood(24, -16, 2, 0, '#ffdcaa'); flood(-56, -30, -32, -8, '#ffe2b8'); flood(-74, 4, -40, -6, '#c5e2ff');
  // dust in the light
  const dust = (() => { const n = 1400, pos = new Float32Array(n * 3), sp = new Float32Array(n); for (let i = 0; i < n; i++) { pos.set([(Math.random() - 0.6) * 110, Math.random() * 38, (Math.random() - 0.5) * 80], i * 3); sp[i] = 0.2 + Math.random(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: C3D.lin('#ffe7c2'), size: 0.2, map: C3D.glowTex(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(pts); return { pts, sp }; })();
  // welding sparks on the top floor (arc flash light + falling sparks — they bloom)
  const weld = (() => { const n = 520, pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), life = new Float32Array(n); for (let i = 0; i < n; i++) { life[i] = -1; pos[i * 3 + 1] = -100; }
    const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g2, new THREE.PointsMaterial({ color: C3D.lin('#ffc46b'), size: 0.34, map: C3D.glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pts.frustumCulled = false; scene.add(pts);
    const spots = [[-11, 0.6, 9], [8, 0.6, -7], [-2, 0.6, 10.6], [12.5, 0.6, 4]].map(([x, y, z]) => bld.localToWorld(new THREE.Vector3(x, floors * fh + y, z)));
    const flash = new THREE.PointLight(C3D.lin('#9fd8ff'), 0, 26, 2); scene.add(flash);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: C3D.lin('#e6f6ff') })); scene.add(core);
    return { pts, pos, vel, life, spots, flash, core, cur: 0, start: 0.5, until: 3, next: 4 }; })();
  // holographic survey pulse rolling out from the crane
  const pulse = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 7, 128, 1, true), new THREE.MeshBasicMaterial({ color: C3D.lin('#4fe0ff'), map: C3D.gradTex([[0, 'rgba(255,255,255,0)'], [0.82, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,.95)']]), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  pulse.position.y = 3.5; scene.add(pulse);
  // sky searchlights from the city
  const beams = [[-420, -520, 0.1], [520, -380, 2.2], [-260, 520, 4.1]].map(([x, z, ph]) => { const L = 900; const c = new THREE.Mesh(new THREE.ConeGeometry(28, L, 32, 1, true), new THREE.MeshBasicMaterial({ color: C3D.lin('#9cc7ff'), map: C3D.gradTex([[0, 'rgba(255,255,255,0)'], [0.75, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,.9)']]), transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    c.geometry.translate(0, -L / 2, 0); const pivot = new THREE.Group(); pivot.position.set(x, 0, z); pivot.add(c); c.rotation.x = Math.PI; scene.add(pivot); return { pivot, c, ph }; });
  // an aircraft on approach (nav lights)
  const plane = (() => { const g2 = new THREE.Group(); const mk = (col, sz) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: C3D.glowTex(), color: C3D.lin(col), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); m.scale.set(sz, sz, 1); g2.add(m); return m; };
    const wl = mk('#ff3a3a', 9), wr = mk('#36ff8a', 9), str = mk('#ffffff', 16); wl.position.x = -6; wr.position.x = 6; scene.add(g2); return { g: g2, str }; })();
  // drifting cloud deck lit by the city
  const clouds = (() => { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); x.fillStyle = 'rgba(0,0,0,0)'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 90; i++) { const cx = Math.random() * 512, cy = Math.random() * 512, r = 30 + Math.random() * 90; const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; for (const [ox, oy] of [[0, 0], [512, 0], [-512, 0], [0, 512], [0, -512]]) { x.save(); x.translate(ox, oy); x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); x.restore(); } }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4200, 4200), new THREE.MeshBasicMaterial({ map: t, color: C3D.lin('#3a4a66'), transparent: true, opacity: 0.55, depthWrite: false, fog: false })); m.rotation.x = Math.PI / 2; m.position.y = 420; scene.add(m); return t; })();
  // the hero crane, boom slewed towards the building
  const params = C3D.paramsFor(o.crane, null, null, o.livery || 'FRIENDSHIP HALL EST'); params.cwt = 135; params.n = Math.max(6, params.n);
  const spec2 = boomSpec({ ...o.crane, sections: params.n }, chartLengths(o.crane)); Object.assign(params, { lens: spec2.lens, E: spec2.E, foot: spec2.foot, head: spec2.head, Lmin: spec2.Lmin });
  const g = C3D.buildCrane(params); scene.add(g.root); g.root.rotation.y = 0.35;
  const st = g.state; st.loadSize = [6.2, 0.35, 3.0]; st.rig = 5.5; g.load.material = C3D.mat({ color: '#8b9198', roughness: 0.95 });
  const trl = new THREE.Group(); trl.position.set(9, 0, 15); trl.rotation.y = -0.25; scene.add(trl); C3D.box(14, 0.4, 2.6, C3D.mat({ color: '#25292e', metalness: 0.4 }), 0, 1.25, 0, trl); for (let i = 0; i < 3; i++) C3D.box(6.2, 0.35, 3.0, C3D.mat({ color: '#8b9198', roughness: 0.95 }), -3 + i * 0.2, 1.65 + i * 0.36, 0, trl);
  const beacon = new THREE.PointLight(C3D.lin('#ff9a1f'), 2.4, 20, 2); beacon.position.set(4, 4.2, 0); g.upper.add(beacon); const bmesh = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshBasicMaterial({ color: C3D.lin('#ffb84a') })); bmesh.position.copy(beacon.position); g.upper.add(bmesh);
  const tipLamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: C3D.lin('#ff2020') })); g.head.add(tipLamp); tipLamp.position.set(1.2, 0.6, 0);
  const comp = C3D.makeComposer(r, scene, cam, { strength: 0.85, radius: 0.55, threshold: 0.28 });
  // animation
  let t0 = performance.now(), raf = 0, alive = true, exit = null; const reduce = !!o.reduce;
  const v3 = new THREE.Vector3(), camPos = new THREE.Vector3(), look = new THREE.Vector3();
  const resize = () => { const w = W0(), h = H0(); r.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < 0.9 ? 52 : 40; cam.updateProjectionMatrix(); if (comp) comp.setSize(w, h); };
  resize(); window.addEventListener('resize', resize);
  const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const lerp = (a, b, k) => a + (b - a) * k;
  let last = performance.now();
  const frame = (now) => {
    if (!alive) return; raf = requestAnimationFrame(frame);
    const t = reduce ? 16 : (now - t0) / 1000; const dt = Math.min(0.1, (now - last) / 1000); last = now;
    // the lift: telescope out, luff, slew over the building, lower, then reset — a 30 s loop
    const cyc = (t % 30) / 30; const ext = 0.22 + 0.34 * (0.5 - 0.5 * Math.cos(Math.min(1, cyc * 2.6) * Math.PI));
    st.fr = st.fr.map((_, i) => Math.max(0, Math.min(1, ext * 1.25 - i * 0.05)));
    st.theta = 56 + 4 * Math.sin(t * 0.17); st.slew = 128 + 30 * (0.5 - 0.5 * Math.cos(cyc * Math.PI * 2));
    const out = C3D.pose(g, st, scene); const R = Math.hypot(out.tipW.x, out.tipW.z);
    st.hookY = Math.max(landing.y + 8, out.tipW.y - 8 - 9 * (0.5 + 0.5 * Math.sin(t * 0.29)));
    radR.scale.set(R, R, 1);
    const sr = (t * 20) % 150; scan.scale.set(sr, sr, 1); scan.material.opacity = Math.max(0, 0.8 - sr / 160);
    lights.forEach((l, i) => l.visible = ((t * 1.1 + i * 0.37) % 1.6) < 0.8); tipLamp.visible = (t % 1.4) < 0.7;
    if (scene.userData.warn) scene.userData.warn.material.opacity = 0.35 + 0.65 * (Math.sin(t * 2.2) > 0 ? 1 : 0.25);
    tcs.forEach(c => { c.top.rotation.y = c.base + Math.sin(t * c.spd * 3) * 0.6; });
    bmesh.material.color.setHSL(0.09, 1, 0.42 + 0.35 * Math.max(0, Math.sin(t * 9))); beacon.intensity = 1.4 + 1.8 * Math.max(0, Math.sin(t * 9));
    { // welding: bursts from one spot at a time, arc-flash flicker
      if (t > weld.next) { weld.cur = (Math.random() * weld.spots.length) | 0; weld.start = t; weld.until = t + 1.4 + Math.random() * 2.6; weld.next = weld.until + 0.5 + Math.random() * 1.8; }
      const active = t >= (weld.start || 0) && t < weld.until; const sp0 = weld.spots[weld.cur]; const pa2 = weld.pos;
      weld.flash.position.copy(sp0); weld.core.position.copy(sp0); const fl = active ? 0.4 + Math.random() * 1.6 : 0; weld.flash.intensity = fl * 2.2; weld.core.visible = active && Math.random() > 0.15;
      let spawn = active ? 9 : 0;
      for (let i = 0; i < weld.life.length; i++) { if (weld.life[i] <= 0 && spawn > 0) { spawn--; weld.life[i] = 0.6 + Math.random() * 0.9; pa2[i * 3] = sp0.x; pa2[i * 3 + 1] = sp0.y; pa2[i * 3 + 2] = sp0.z; const a2 = Math.random() * Math.PI * 2, v = 2 + Math.random() * 5; weld.vel[i * 3] = Math.cos(a2) * v; weld.vel[i * 3 + 1] = 1 + Math.random() * 4; weld.vel[i * 3 + 2] = Math.sin(a2) * v; }
        if (weld.life[i] > 0) { weld.life[i] -= dt; weld.vel[i * 3 + 1] -= 9.8 * dt; pa2[i * 3] += weld.vel[i * 3] * dt; pa2[i * 3 + 1] += weld.vel[i * 3 + 1] * dt; pa2[i * 3 + 2] += weld.vel[i * 3 + 2] * dt; if (weld.life[i] <= 0) pa2[i * 3 + 1] = -100; } }
      weld.pts.geometry.attributes.position.needsUpdate = true;
      const pt = (t % 7) / 7; const pr = 2 + pt * 170; pulse.scale.set(pr, 1 + pt * 0.6, pr); pulse.material.opacity = Math.max(0, 0.75 * (1 - pt)) * Math.min(1, pt * 8);
      beams.forEach(b2 => { b2.pivot.rotation.y = t * 0.11 + b2.ph; b2.c.rotation.z = 0.32 + 0.16 * Math.sin(t * 0.21 + b2.ph); });
      const pa3 = (t * 0.018) % 1, ang = -2.6 + pa3 * 2.2; plane.g.position.set(Math.cos(ang) * 900, 260 - pa3 * 60, Math.sin(ang) * 900 - 200); plane.str.visible = (t % 1.2) < 0.08;
      clouds.offset.x = t * 0.0016; clouds.offset.y = t * 0.0007; }
    const pa = dust.pts.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { let y = pa.getY(i) + 0.012 * dust.sp[i]; if (y > 38) y = 0; pa.setY(i, y); } pa.needsUpdate = true;
    const ra = road.pts.geometry.attributes.position; for (let i = 0; i < ra.count; i++) { let x = ra.getX(i) + road.sp[i] * dt; if (x > 450) x = -450; if (x < -450) x = 450; ra.setX(i, x); } ra.needsUpdate = true;
    // camera: a slow crane-up reveal, then a gentle orbit around a low, wide hero angle
    const k = ease(Math.min(1, t / 8));
    const az = lerp(1.0, 0.5, k) + Math.max(0, t - 2) * 0.042, el = lerp(0.5, 0.075, k) + 0.035 * Math.sin(t * 0.07), dist = lerp(160, 98, k) + 8 * Math.sin(t * 0.05);
    look.set(-5, 22 + 2 * Math.sin(t * 0.05), -8);
    camPos.set(look.x + dist * Math.sin(az) * Math.cos(el), Math.max(1.6, look.y + dist * Math.sin(el)) - 14 * k, look.z + dist * Math.cos(az) * Math.cos(el));
    camPos.x += Math.sin(t * 0.9) * 0.06; camPos.y += Math.sin(t * 1.3) * 0.05;
    if (exit) { const e = ease(Math.min(1, (now - exit.t) / 1500)); camPos.lerp(v3.set(out.tipW.x + 10, out.tipW.y - 4, out.tipW.z + 14), e); look.lerp(out.tipW, e); if (comp) comp.bloom.strength = 0.85 + e * 2.4; r.toneMappingExposure = 1.1 + e * 0.9; if (e >= 1 && exit.done) { const d = exit.done; exit.done = null; d(); } }
    cam.position.copy(camPos); cam.lookAt(look);
    if (comp) comp.render(); else r.render(scene, cam);
    if (hud) { const pv = g.hook.position.clone().project(cam); hud({ x: (pv.x * 0.5 + 0.5) * W0(), y: (-pv.y * 0.5 + 0.5) * H0(), vis: pv.z < 1 && Math.abs(pv.x) < 1, theta: st.theta, R, L: out.lay.tip * out.lay.k, slew: st.slew, hook: Math.max(0, out.hookY), t }); }
  };
  raf = requestAnimationFrame(frame);
  const vis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf && alive) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  document.addEventListener('visibilitychange', vis);
  return {
    exit(done) { exit = { t: performance.now(), done }; },
    dispose() { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', vis); try { r.dispose(); r.forceContextLoss(); } catch {} host.innerHTML = ''; }
  };
};

// ---------- TWIN: the plan in 3D ----------
// v9: one live scene serves the full 3D view and the small 3D window over the drawing (mount() moves the canvas; the WebGL context stays).
// Updates are deltas: a crane is rebuilt only when its make-up changes, site objects only when they change, rings and labels are moved
// in place, and nothing is redrawn while nothing moves. The camera eases toward where the fingers put it (one finger turns, two fingers
// pinch and pan, double-tap re-frames). On a slow device the resolution steps down while the picture moves and comes back sharp when it
// stops. opts.onPad(x, y, phase): the magenta landing ring was dragged to plan point (x, y) — reach and swing follow the finger.
C3D.twin = (host0, opts = {}) => {
  let host = host0;
  const W0 = () => host.clientWidth || 800, H0 = () => host.clientHeight || 500;
  const coarse = window.matchMedia('(pointer: coarse)').matches; const dprMax = Math.min(window.devicePixelRatio || 1, 2); let dpr = dprMax;
  const r = C3D.makeRenderer(host, { aa: !coarse || dprMax < 2, exposure: 1.0, maxDpr: dprMax, shadows: true });
  r.domElement.classList.add('twin-cv');
  const scene = new THREE.Scene(); scene.background = C3D.gradTex([[0, '#0b0f15'], [0.55, '#18212b'], [1, '#2a3440']]); scene.fog = new THREE.Fog(C3D.lin('#1f2833'), 220, 700);
  const cam = new THREE.PerspectiveCamera(38, W0() / H0(), 0.3, 3000);
  scene.add(new THREE.HemisphereLight(C3D.lin('#c4d6ee'), C3D.lin('#3a3128'), 0.85));
  const sun = new THREE.DirectionalLight(C3D.lin('#fff0d8'), 1.45); sun.position.set(-70, 120, 80); sun.castShadow = true; sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048); sun.shadow.bias = -0.0004;
  Object.assign(sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 420 }); scene.add(sun);
  const fill = new THREE.DirectionalLight(C3D.lin('#8fb6ff'), 0.35); fill.position.set(80, 40, -60); scene.add(fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), C3D.mat({ color: '#3a4048', roughness: 0.95 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const grid = new THREE.GridHelper(400, 80, C3D.lin('#5e7891'), C3D.lin('#465564')); grid.position.y = 0.02; grid.material.transparent = true; grid.material.opacity = 0.55; scene.add(grid);
  const site = new THREE.Group(), dyn = new THREE.Group(), tand = new THREE.Group(); scene.add(site, dyn, tand);
  // shared materials (made once — the old twin made new ones on every update and never freed them)
  const M = { conc: C3D.mat({ color: '#8a9097', roughness: 0.9 }), dark: C3D.mat({ color: '#454b52', roughness: 0.7 }), tm: C3D.mat({ color: '#d4a51e', metalness: 0.4, roughness: 0.5 }), cont: C3D.mat({ color: '#2f6fb3', roughness: 0.6, metalness: 0.4 }), box: C3D.mat({ color: '#9b7bc6' }), shed: C3D.mat({ color: '#c8b48c' }), trunk: C3D.mat({ color: '#5a3a1e' }), leaf: C3D.mat({ color: '#2f6b2f', roughness: 1 }), load: C3D.mat({ color: '#9aa1a8', metalness: 0.1, roughness: 0.85 }) };
  const ringM = (col, op) => new THREE.MeshBasicMaterial({ color: C3D.lin(col), transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false });
  const ringR = new THREE.Mesh(new THREE.BufferGeometry(), ringM('#4fe0ff', 0.9)), ringT = new THREE.Mesh(new THREE.BufferGeometry(), ringM('#ffb81c', 0.85));
  const pad = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.85, 40), ringM('#e040e0', 0.95)), padDot = new THREE.Mesh(new THREE.CircleGeometry(0.42, 28), ringM('#e040e0', 0.55));
  const padHit = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ visible: false })); // a bigger target for the finger
  for (const m of [ringR, ringT, pad, padDot, padHit]) { m.rotation.x = -Math.PI / 2; dyn.add(m); }
  const tLoad = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), M.load); tLoad.castShadow = tLoad.receiveShadow = true; const tSling = C3D.lines('#d13b2a'); tand.add(tLoad, tSling); tand.visible = false;
  let g = null, sig = '', siteSig = '', raf = 0, alive = true, dirty = true, framed = false, lastR = -1, lastTail = -1; const extra = new Map();
  // camera: `to` is where the gestures put it, `orb` eases toward it
  const to = { az: -0.75, el: 0.42, dist: 90, tx: 10, ty: 12, tz: 0 }; const orb = { ...to }; let phS = 0, easing = false;
  const applyCam = () => { cam.position.set(orb.tx + orb.dist * Math.cos(orb.el) * Math.cos(orb.az), orb.ty + orb.dist * Math.sin(orb.el), orb.tz + orb.dist * Math.cos(orb.el) * Math.sin(orb.az)); cam.lookAt(orb.tx, orb.ty, orb.tz); };
  const go = (snap) => { if (snap || reduceMotion3()) { Object.assign(orb, to); applyCam(); } easing = !snap; dirty = true; };
  function reduceMotion3() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  // ---- gestures ----
  const el = r.domElement; el.style.touchAction = 'none'; const ptrs = new Map(); let drag = null, pinch = null, lastTap = 0, moving = false;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const groundAtPtr = (e, y) => { const b = el.getBoundingClientRect(); ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); ray.setFromCamera(ndc, cam); const d = ray.ray.direction, o = ray.ray.origin; if (Math.abs(d.y) < 1e-6) return null; const t = (y - o.y) / d.y; return t > 0 ? o.clone().addScaledVector(d, t) : null; };
  const hitPad = (e) => { if (!opts.onPad || !padHit.visible) return false; const b = el.getBoundingClientRect(); ndc.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); ray.setFromCamera(ndc, cam); return ray.intersectObject(padHit).length > 0; };
  el.addEventListener('pointerdown', (e) => {
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { el.setPointerCapture(e.pointerId); } catch {} moving = true;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, o: { ...to } }; drag = null; return; }
    const now = performance.now(); if (now - lastTap < 300 && e.pointerType !== 'mouse') { framed = false; opts.onReframe?.(); lastTap = 0; return; } lastTap = now;
    if (e.button === 0 && !e.shiftKey && hitPad(e)) { drag = { kind: 'pad', y: pad.position.y }; el.style.cursor = 'grabbing'; return; }
    drag = { kind: e.button === 2 || e.shiftKey ? 'pan' : 'orbit', x: e.clientX, y: e.clientY, o: { ...to } };
  });
  el.addEventListener('pointermove', (e) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!ptrs.size) { if (opts.onPad) el.style.cursor = hitPad(e) ? 'grab' : ''; return; }
    if (pinch && ptrs.size === 2) { // pinch zooms, moving both fingers pans
      const [a, b] = [...ptrs.values()]; to.dist = Math.max(12, Math.min(600, pinch.o.dist * pinch.d / Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))));
      const s = to.dist / 600, dx = (a.x + b.x) / 2 - pinch.mx, dy = (a.y + b.y) / 2 - pinch.my;
      to.tx = pinch.o.tx - dx * Math.sin(to.az) * s; to.tz = pinch.o.tz + dx * Math.cos(to.az) * s; to.ty = Math.max(0, pinch.o.ty + dy * s); go(); return;
    }
    if (!drag) return;
    if (drag.kind === 'pad') { const w = groundAtPtr(e, drag.y); if (w) opts.onPad(w.x + orbBase.cx, -w.z + orbBase.cy, 'move'); return; }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (drag.kind === 'pan') { const s = to.dist / 600; to.tx = drag.o.tx - dx * Math.sin(to.az) * s; to.tz = drag.o.tz + dx * Math.cos(to.az) * s; to.ty = Math.max(0, drag.o.ty + dy * s); }
    else { to.az = drag.o.az + dx * 0.006; to.el = Math.max(0.03, Math.min(1.5, drag.o.el + dy * 0.005)); }
    go();
  });
  const up = (e) => { ptrs.delete(e.pointerId); if (drag?.kind === 'pad') { opts.onPad?.(0, 0, 'end'); el.style.cursor = ''; } if (ptrs.size < 2) pinch = null; drag = null; if (!ptrs.size) moving = false; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('dblclick', () => { framed = false; opts.onReframe?.(); });
  el.addEventListener('wheel', (e) => { e.preventDefault(); to.dist = Math.max(12, Math.min(600, to.dist * Math.exp(e.deltaY * 0.0012))); go(); }, { passive: false });
  const orbBase = { cx: 0, cy: 0 };                                                    // plan point at the scene origin (the lead crane)
  // ---- size, render loop, quality governor ----
  const resize = () => { const w = W0(), h = H0(); r.setSize(w, h, false); cam.aspect = w / Math.max(1, h); cam.updateProjectionMatrix(); dirty = true; };
  let ro = new ResizeObserver(resize); ro.observe(host); resize(); applyCam();
  let last = performance.now(), ema = 16, idleT = 0;
  const setDpr = (v) => { if (Math.abs(v - dpr) < 0.01) return; dpr = v; r.setPixelRatio(dpr); resize(); };
  const loop = (now) => {
    if (!alive) return; raf = requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (easing) { const k = 1 - Math.exp(-dt * 14); let big = 0; for (const key of ['az', 'el', 'dist', 'tx', 'ty', 'tz']) { const d = to[key] - orb[key]; orb[key] += d * k; big = Math.max(big, Math.abs(d) / (key === 'dist' ? Math.max(1, to.dist) : key.startsWith('t') ? Math.max(1, to.dist * 0.05) : 1)); }
      if (big < 2e-4) { Object.assign(orb, to); easing = false; } applyCam(); dirty = true; }
    if (!dirty || host.offsetParent === null) { if (!moving && !easing && dpr < dprMax && (idleT += dt) > 0.3) { setDpr(dprMax); dirty = true; } return; }
    dirty = false; idleT = 0; r.render(scene, cam);
    if (moving || easing) ema = ema * 0.85 + dt * 1000 * 0.15;                          // frame interval while the picture moves
    if ((moving || easing) && ema > 24 && dpr > 1) setDpr(Math.max(1, dpr - 0.25));     // too slow while moving: fewer pixels
  };
  raf = requestAnimationFrame(loop);
  const vis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf && alive) { last = performance.now(); dirty = true; raf = requestAnimationFrame(loop); } };
  document.addEventListener('visibilitychange', vis);
  // ---- labels (rebuilt only when their text changes) ----
  const labels = {};
  const label = (key, text, col = '#e9eef2') => {
    const old = labels[key]; if (old && old.userData.text === text) return old;
    if (old) { dyn.remove(old); old.material.map.dispose(); old.material.dispose(); }
    const F = '700 44px "Martian Mono", ui-monospace, monospace'; const c = document.createElement('canvas'); let x = c.getContext('2d'); x.font = F; const w = Math.ceil(x.measureText(text).width + 44); c.width = w; c.height = 96; x = c.getContext('2d'); x.font = F; x.fillStyle = 'rgba(8,11,15,.82)'; x.fillRect(0, 10, w, 76); x.fillStyle = col; x.fillRect(0, 10, 6, 76); x.textBaseline = 'middle'; x.fillText(text, 22, 50);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(w * 1.5 / 96, 1.5, 1); s.center.set(Math.min(0.5, 40 / w), 0); s.renderOrder = 10; s.userData.text = text;
    labels[key] = s; dyn.add(s); return s;
  };
  const dropLabel = (key) => { const o = labels[key]; if (o) { dyn.remove(o); o.material.map.dispose(); o.material.dispose(); delete labels[key]; } };
  const ringGeo = (mesh, rad, w, seg) => { mesh.geometry.dispose(); mesh.geometry = new THREE.RingGeometry(Math.max(0.01, rad - w), rad + w, seg); };
  const disposeTree = (o) => o.traverse?.((m) => { m.geometry?.dispose?.(); });
  const P2W = (x, y) => new THREE.Vector3(x - orbBase.cx, 0, -(y - orbBase.cy));       // plan point → world (scene origin = lead crane)
  // ---- the site objects (rebuilt only when they change) ----
  const buildSite = (plan, sp) => {
    while (site.children.length) { const c = site.children.pop(); disposeTree(c); }
    const dir = new THREE.Vector3(Math.cos(sp.boom * D2R), 0, -Math.sin(sp.boom * D2R));
    const place = (m, along) => { m.position.x = dir.x * along; m.position.z = dir.z * along; m.rotation.y = sp.boom * D2R; };
    for (const o of plan.site?.obstacles || []) {
      const e = objExtent(plan.site, o); const len = Math.max(0.3, e.x1 - e.x0), hgt = Math.max(0.2, e.top - e.b), dep = num(o.d) || (o.type === 'building' ? Math.max(12, len * 0.8) : o.type === 'wall' ? 12 : Math.max(2.4, len * 0.5));
      let m;
      if (o.type === 'tree') { m = new THREE.Group(); const tr2 = C3D.cyl(0.25, 0.3, hgt * 0.4, M.trunk); tr2.position.y = hgt * 0.2; m.add(tr2); const cn = new THREE.Mesh(new THREE.SphereGeometry(len * 0.5, 14, 10), M.leaf); cn.position.y = hgt * 0.68; cn.scale.y = 1.2; cn.castShadow = true; m.add(cn); m.position.y = e.b; place(m, num(o.x)); }
      else if (o.type === 'pole' || o.type === 'towercrane' || o.type === 'tower') { m = new THREE.Group(); const hh = num(o.h, 10); const mast = o.type === 'pole' ? C3D.cyl(0.18, 0.22, hh, M.dark) : C3D.lattice(hh, num(o.mastW, 2), num(o.mastW, 2), M.tm, { bay: 2, r: 0.06 }); if (o.type === 'pole') mast.position.y = hh / 2; else mast.rotation.z = Math.PI / 2; m.add(mast);
        if (o.type === 'towercrane' && num(o.jib) > 0) { const jb = C3D.lattice(num(o.jib), 1.5, 1.2, M.tm, { bay: 2, r: 0.05, taper: 0.3 }); jb.position.y = hh + 0.5; m.add(jb); }
        m.position.y = e.b; place(m, num(o.x)); }
      else { const mat = o.type === 'container' ? M.cont : o.type === 'trailer' || o.type === 'truck' ? M.dark : o.type === 'box' ? M.box : o.type === 'shed' ? M.shed : M.conc;
        m = C3D.box(len, hgt, dep, mat); m.position.y = e.b + hgt / 2; place(m, (e.x0 + e.x1) / 2); }
      site.add(m);
    }
    for (const en of plan.env || []) { if (en.view !== 'plan' || en.hidden) continue; const gm = typeof ENV_CACHE !== 'undefined' ? ENV_CACHE[en.id] : null; if (!gm) continue; const f = envXf(en);
      if (gm.img) { // a photo / satellite map lies on the ground as a texture
        const tex = new THREE.TextureLoader().load(gm.img, () => { dirty = true; }); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
        const w = gm.w * num(en.sc, 0.001), h = gm.h * num(en.sc, 0.001); const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: num(en.opacity, 1) < 1, opacity: num(en.opacity, 1), depthWrite: false }));
        const c = f(gm.w / 2, gm.h / 2); pl.rotation.x = -Math.PI / 2; pl.rotation.z = num(en.rot, 0) * D2R; pl.position.set(c[0] - sp.cx, 0.03, -(c[1] - sp.cy)); pl.renderOrder = -1; site.add(pl); continue; }
      const pts = [];
      for (const [, flat] of gm.polys) { for (let i = 2; i < flat.length; i += 2) { const a = f(flat[i - 2], flat[i - 1]), b = f(flat[i], flat[i + 1]); pts.push(a[0] - sp.cx, 0.04, -(a[1] - sp.cy), b[0] - sp.cx, 0.04, -(b[1] - sp.cy)); } if (pts.length > 600000) break; }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); site.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: C3D.lin('#ff8a6a'), transparent: true, opacity: 0.85 })));
    }
  };
  // ---- one crane of the scene (the lead, or a tandem crane): rebuilt only when its make-up changes ----
  const craneSig = (crane, pv, livery) => JSON.stringify([crane.id, crane.color, livery, pv.cwt, pv.matSize, crane.sections, crane.boomMin, crane.boomMax, pv.outExt, crane.outTrans, crane.outTransHalf]);
  const poseCrane = (gg, res, load, boomHd, carHd) => {
    const geo = res.geo; gg.state.theta = geo.theta || 45; gg.state.slew = boomHd - carHd; gg.state.L = geo.kind === 'main' ? geo.L : geo.Lb; gg.state.fr = res.tele?.fr || gg.state.fr; gg.state.acc = res.acc || {};
    gg.state.jib = geo.kind !== 'main' && geo.Lj ? { len: geo.Lj, angle: geo.gamma } : null;
    gg.state.loadSize = [Math.max(0.6, num(load.l, 2)), Math.max(0.3, num(load.h, 1.5)), Math.max(0.6, num(load.l, 2) * 0.6)]; gg.state.rig = res.rigH || 3;
    gg.state.empty = !!res.empty; gg.state.hookY = res.empty && res.hookY != null ? res.hookY + 0.95 : res.landY + num(load.h, 1.5) + (res.rigH || 3) + 0.95 + 0.5;
    gg.root.rotation.y = carHd * D2R; C3D.pose(gg, gg.state, scene);
  };
  const api = {
    update(plan, calc, crane, livery) {
      const li = Math.min(calc.loads.length - 1, plan.activeLoad || 0), res = calc.loads[li], load = plan.loads[li], geo = res.geo; if (!geo?.tip) return;
      const s2 = craneSig(crane, plan, livery);
      if (s2 !== sig) { if (g) { scene.remove(g.root, g.hook, g.rope, g.slings, g.load); disposeTree(g.root); } g = C3D.buildCrane(C3D.paramsFor(crane, plan, calc, livery)); g._hung = false; scene.add(g.root); sig = s2; }
      const sp = sitePlanState(plan, load); orbBase.cx = num(sp.cx); orbBase.cy = num(sp.cy);
      phS = sp.boom; poseCrane(g, res, load, sp.boom, sp.carrier);
      // site objects
      const ss = JSON.stringify([plan.site?.obstacles, plan.site?.stepX, plan.site?.targetGround, Math.round(sp.boom * 10), sp.cx, sp.cy, (plan.env || []).filter(e => e.view === 'plan').map(e => [e.id, e.hidden, e.x, e.y, e.sc, e.rot, e.opacity, !!(typeof ENV_CACHE !== 'undefined' && ENV_CACHE[e.id])])]);
      if (ss !== siteSig) { siteSig = ss; buildSite(plan, sp); }
      // rings, landing pad, labels — moved in place
      const dir = new THREE.Vector3(Math.cos(sp.boom * D2R), 0, -Math.sin(sp.boom * D2R));
      if (Math.abs(res.R - lastR) > 0.004) { lastR = res.R; ringGeo(ringR, res.R, 0.14, 180); } ringR.position.y = 0.05;
      const tl = num(crane.tail, 5); if (tl !== lastTail) { lastTail = tl; ringGeo(ringT, tl, 0.09, 96); } ringT.position.y = 0.05;
      const T = res.tandem; const padOn = !T;
      pad.visible = padDot.visible = padHit.visible = padOn;
      pad.position.set(dir.x * res.R, res.landY + 0.06, dir.z * res.R); padDot.position.copy(pad.position); padHit.position.copy(pad.position); padHit.scale.setScalar(Math.max(1.6, res.R * 0.07));
      const lb = label('R', `R ${res.R.toFixed(2)} m · OVER ${SIDE_NAME[sp.side]}`, '#4fe0ff'); lb.position.set(dir.x * res.R + 1, 0.8, dir.z * res.R);
      if (res.tipY != null && g.tipW) { const lt = label('tip', `TIP ${res.tipY.toFixed(1)} m · ${(geo.kind === 'luffing' ? geo.gamma : geo.theta).toFixed(1)}°`, '#ffb81c'); lt.position.copy(g.tipW).add(new THREE.Vector3(0, 1.6, 0)); } else dropLabel('tip');
      // tandem: the other cranes, one shared load, a sling from every hook to its lifting point
      const seen = new Set();
      if (T) {
        g.load.visible = g.slings.visible = false;
        T.picks.slice(1).forEach((pk) => {
          const pv = rigOf(plan, pk.crane), cr = pk.res.crane || crane; const ks = craneSig(cr, pv, livery) + '|' + pk.k; seen.add(pk.k);
          let ex = extra.get(pk.k); if (!ex || ex.sig !== ks) { if (ex) { scene.remove(ex.g.root, ex.g.hook, ex.g.rope, ex.g.slings, ex.g.load); disposeTree(ex.g.root); } ex = { sig: ks, g: C3D.buildCrane(C3D.paramsFor(cr, pv, calc, livery)) }; ex.g._hung = false; scene.add(ex.g.root); extra.set(pk.k, ex); }
          const bh = normDeg(pk.boomHd + num(pk.mv?.swing)); ex.g.root.position.copy(P2W(pk.base.x, pk.base.y));
          poseCrane(ex.g, pk.res, load, bh, normDeg(bh - SIDE_OFFSET[sideOf(pk.side)])); ex.g.load.visible = ex.g.slings.visible = false; ex.g.root.visible = ex.g.hook.visible = ex.g.rope.visible = true;
        });
        const hooks = [g, ...T.picks.slice(1).map(p => extra.get(p.k)?.g)].filter(Boolean);
        const pickY = g.hook.position.y - 0.95 - Math.max(1.2, res.rigH || 3); const tilt = num(T.live?.tilt) * D2R; const ax = num(T.axis) * D2R; const a = new THREE.Vector3(Math.cos(ax), 0, -Math.sin(ax));
        const xs = T.picks.map(p => p.x), x0 = Math.min(...xs), x1 = Math.max(...xs), mid = (x0 + x1) / 2; const p0 = T.picks[0];
        const origin = P2W(p0.pos.x, p0.pos.y); origin.y = pickY;
        const at = (x, z) => { const d = x - mid, c = Math.cos(tilt), s = Math.sin(tilt); const base = origin.clone().addScaledVector(a, mid - p0.x); const n = new THREE.Vector3(-a.z, 0, a.x).multiplyScalar(-(num(z) - num(p0.z))); return base.addScaledVector(a, d * c).add(new THREE.Vector3(0, d * s, 0)).add(n); };
        const lh = Math.max(0.3, num(load.h, 1.5)), lw = Math.max(1.2, Math.min(4, lh * 1.4)); tLoad.scale.set(x1 - x0 + 1.2, lh, lw);
        tLoad.rotation.set(0, ax, tilt, 'YZX'); tLoad.position.copy(at(mid, p0.z)).add(new THREE.Vector3(0, -lh / 2, 0).applyEuler(tLoad.rotation)); // the lifting points are on top of the load
        const sl = []; T.picks.forEach((pk, i) => { const hk = hooks[i]; if (!hk) return; const q = at(pk.x, pk.z); for (const dz of [-0.35, 0.35]) { const qq = q.clone().add(new THREE.Vector3(-a.z * dz, 0, a.x * dz)); sl.push(hk.hook.position.x, hk.hook.position.y - 1.0, hk.hook.position.z, qq.x, qq.y, qq.z); } });
        C3D.setLines(tSling, sl); tand.visible = true;
        T.picks.forEach((pk, i) => { const hk = hooks[i]; if (!hk) return; const lb = label('tc' + i, `C${pk.crane + 1} · ${(+pk.share).toFixed(1)} t · ${Math.round(num(pk.util))}%`, pk.util == null || pk.util > T.derate ? '#ff6961' : '#4fe0ff'); lb.position.copy(hk.hook.position).add(new THREE.Vector3(0.9, 1.4, 0)); });
        for (let i = T.picks.length; i < 4; i++) dropLabel('tc' + i);
      } else { tand.visible = false; g.load.visible = g.slings.visible = !res.empty; for (let i = 0; i < 4; i++) dropLabel('tc' + i); }
      for (const [k, ex] of extra) if (!seen.has(k)) { ex.g.root.visible = ex.g.hook.visible = ex.g.rope.visible = ex.g.slings.visible = ex.g.load.visible = false; }
      { const reach = Math.max(20, res.R, (geo.tip?.y || 20), ...(T ? T.picks.map(p => Math.hypot(p.base.x - sp.cx, p.base.y - sp.cy) * 0.6) : []));
        api._auto = { dist: reach * 2.3, az: Math.PI / 2 - phS * D2R - 0.75, el: 0.36, tx: res.R * 0.45 * dir.x, tz: res.R * 0.45 * dir.z, ty: Math.max(6, (geo.tip?.y || 20) * 0.38) }; }
      if (!framed) { Object.assign(to, api._auto); go(!api._shown); framed = true; api._shown = true; }
      dirty = true;
    },
    reframe() { framed = false; dirty = true; },
    zoom(f) { to.dist = Math.max(12, Math.min(600, to.dist / f)); go(); },
    view(kind) { const a0 = Math.PI / 2 - num(phS) * D2R; if (kind === 'side') { to.az = a0; to.el = 0.04; } else if (kind === 'top') { to.az = a0; to.el = 1.5; } else { to.az = a0 - 0.75; to.el = 0.36; } go(); },
    // move the canvas into another box (full view ↔ the small window); the scene and the WebGL context stay
    mount(h2) { if (!h2 || h2 === host) return; host = h2; h2.appendChild(r.domElement); ro.disconnect(); ro = new ResizeObserver(resize); ro.observe(h2); resize(); dirty = true; },
    host: () => host,
    // a still for the PDF: rendered once at the size asked, then the screen size is put back
    snapshot(w = 1600, h = 1000, auto) { const ow = W0(), oh = H0(), od = dpr, keep = { ...orb }; Object.assign(orb, auto && api._auto ? api._auto : to); applyCam(); r.setPixelRatio(1); r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); r.render(scene, cam); const url = r.domElement.toDataURL('image/jpeg', 0.9); if (auto) { Object.assign(orb, keep); applyCam(); } r.setPixelRatio(od); r.setSize(ow, oh, false); cam.aspect = ow / Math.max(1, oh); cam.updateProjectionMatrix(); dirty = true; return url; },
    stats: () => ({ dpr, ema: Math.round(ema * 10) / 10, calls: r.info.render.calls, tris: r.info.render.triangles, geos: r.info.memory.geometries, tex: r.info.memory.textures }),
    dispose() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', vis); try { r.dispose(); r.forceContextLoss(); } catch {} r.domElement.remove(); }
  };
  return api;
};
