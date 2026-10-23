// ===== 3D: realistic cranes built from the same side-view CAD drawings as the 2D elevation (carrier, superstructure, telescoping boom), a calm sign-in scene, and the live 3D twin (three.js r147) =====
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

// a "bag" merges many transformed primitives into ONE geometry per material (static crane parts cost a handful of draw calls, not hundreds)
C3D.bag = () => {
  const parts = new Map(), mm = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3(), q = new THREE.Quaternion(), eu = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  const UB = C3D._ub || (C3D._ub = new THREE.BoxGeometry(1, 1, 1)); const UC = C3D._uc || (C3D._uc = {});
  const slot = (mat) => { let s = parts.get(mat); if (!s) parts.set(mat, s = { pos: [], nor: [], idx: [], n: 0 }); return s; };
  const api = {
    geo(mat, geo, m4) {
      const s = slot(mat), P = geo.attributes.position, N = geo.attributes.normal, m = m4 || mm.identity(); nm.getNormalMatrix(m);
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m); s.pos.push(v.x, v.y, v.z); v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); s.nor.push(v.x, v.y, v.z); }
      if (geo.index) for (let i = 0; i < geo.index.count; i++) s.idx.push(geo.index.getX(i) + s.n); else for (let i = 0; i < P.count; i++) s.idx.push(i + s.n);
      s.n += P.count; return api;
    },
    xf(pos, rot, scl) { ps.set(pos[0], pos[1], pos[2]); eu.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0, 'XYZ'); q.setFromEuler(eu); sc.set(scl[0], scl[1], scl[2]); return new THREE.Matrix4().compose(ps, q, sc); },
    box(mat, size, pos, rot) { return api.geo(mat, UB, api.xf(pos, rot, size)); },
    // cylinder / cone along an axis ('x' | 'y' | 'z'); r2 = radius at the +axis end when different
    cyl(mat, r, len, pos, axis = 'y', seg = 16, r2) {
      const rot = axis === 'x' ? [0, 0, -Math.PI / 2] : axis === 'z' ? [Math.PI / 2, 0, 0] : [0, 0, 0];
      if (r2 != null && Math.abs(r2 - r) > 1e-6) return api.geo(mat, new THREE.CylinderGeometry(r2, r, len, seg), api.xf(pos, rot, [1, 1, 1]));
      const g = UC[seg] || (UC[seg] = new THREE.CylinderGeometry(1, 1, 1, seg)); return api.geo(mat, g, api.xf(pos, rot, [r, len, r]));
    },
    // extrude a 2-D outline [[x, y], …] (in the x-y plane) from z0 to z1
    poly(mat, pts, z0, z1, bevel = 0) {
      if (pts.length < 3 || z1 - z0 < 1e-4) return api; const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
      const geo = new THREE.ExtrudeGeometry(sh, { depth: z1 - z0 - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 8 });
      geo.translate(0, 0, z0 + bevel); api.geo(mat, geo); geo.dispose(); return api;
    },
    lathe(mat, prof, seg, pos, rot) { const geo = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), seg); api.geo(mat, geo, api.xf(pos, rot, [1, 1, 1])); geo.dispose(); return api; },
    build(parent, o = {}) {
      const out = []; for (const [mat, s] of parts) {
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(s.pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(s.nor, 3));
        geo.setIndex(s.n > 65535 ? new THREE.Uint32BufferAttribute(s.idx, 1) : new THREE.Uint16BufferAttribute(s.idx, 1)); geo.computeBoundingSphere();
        const m = new THREE.Mesh(geo, mat); m.castShadow = o.cast !== false && !mat.userData.noCast; m.receiveShadow = o.receive !== false; parent.add(m); out.push(m); if (o.disp) o.disp.push(geo);
      } return out;
    }
  };
  return api;
};
// soft studio-ish environment for the paint / glass / steel reflections (one small PMREM per renderer)
C3D.envMap = (r, tone = 'dark') => {
  const sc = new THREE.Scene(); const L = tone === 'light';
  const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(...(L ? [0.62, 0.78, 1.0] : [0.16, 0.26, 0.46])) }, hor: { value: new THREE.Color(...(L ? [1.15, 1.05, 0.95] : [0.85, 0.66, 0.5])) }, gnd: { value: new THREE.Color(...(L ? [0.34, 0.32, 0.3] : [0.06, 0.06, 0.07])) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 gnd; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0. ? mix(hor, top, pow(h, 0.55)) : mix(hor, gnd, smoothstep(0., 0.35, -h)); gl_FragColor = vec4(c, 1.); }' }));
  sc.add(sky);
  const soft = (x, y, z, w, h, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k * 0.97, k * 0.92), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m); };
  soft(-22, 26, 18, 26, 14, L ? 5 : 3.2); soft(26, 14, -20, 18, 9, L ? 2.4 : 1.4); soft(0, 40, 0, 20, 20, L ? 1.6 : 0.9);
  const pm = new THREE.PMREMGenerator(r); const rt = pm.fromScene(sc, 0.035); pm.dispose(); sky.geometry.dispose(); sky.material.dispose(); sc.traverse(o => { if (o.isMesh && o !== sky) { o.geometry.dispose(); o.material.dispose(); } });
  return rt;
};
// free what a crane owns (its geometries, its own materials / textures)
C3D.disposeCrane = (g) => {
  if (!g) return; const seen = new Set(); const d = (o) => o && o.traverse && o.traverse((m) => { if (m.geometry && !seen.has(m.geometry) && m.geometry !== C3D._ub) { seen.add(m.geometry); m.geometry.dispose(); } });
  d(g.root); d(g.hook); d(g.rope); d(g.slings); d(g.load); for (const x of g.disp || []) { try { x.dispose && x.dispose(); } catch {} }
};

// ---------- profiles: polylines [[x, y], …] sorted by x (a vertical step is two points at the same x) ----------
C3D.profAt = (pts, x) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (x <= b[0]) { const dx = b[0] - a[0]; return dx < 1e-9 ? Math.max(a[1], b[1]) : a[1] + (b[1] - a[1]) * (x - a[0]) / dx; } } return pts[pts.length - 1][1]; };
C3D.profClip = (pts, a, b) => { const o = [[a, C3D.profAt(pts, a)]]; for (const p of pts) if (p[0] > a + 1e-6 && p[0] < b - 1e-6) o.push(p); o.push([b, C3D.profAt(pts, b)]); return o; };
// Douglas–Peucker on [x, y] points
C3D.simplify = (pts, tol) => {
  if (pts.length < 3) return pts.slice(); const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
  while (st.length) { const [a, b] = st.pop(); let md = 0, mi = -1; const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L; if (d > md) { md = d; mi = i; } }
    if (md > tol && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); } }
  return pts.filter((_, i) => keep[i]);
};

// ---------- CAD → 3D: the side-view drawing is rasterised once (pure JS, no canvas), its solid silhouette is split into carrier and
// superstructure, and the outlines the 3D extrudes (carrier top incl. the cab, superstructure top / bottom, tyres) are read off it ----------
C3D.cadRaster = (dr, res) => {
  let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
  for (const it of dr.body) { const fl = it[2]; for (let i = 0; i < fl.length; i += 2) { const x = fl[i], y = fl[i + 1]; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; } }
  const x0 = bx0 / 100 - 0.3, y0 = -0.25, W = Math.ceil((bx1 / 100 + 0.3 - x0) / res), H = Math.ceil((by1 / 100 + 0.3 - y0) / res);
  const E = new Uint8Array(W * H), S = new Uint8Array(W * H);
  const stamp = (px, py) => { const ix = Math.round(px), iy = Math.round(py); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = ix + dx, Y = iy + dy; if (X >= 0 && X < W && Y >= 0 && Y < H) E[Y * W + X] = 1; } };
  for (const [f, , fl] of dr.body) {
    const n = fl.length / 2; const px = new Float32Array(n), py = new Float32Array(n);
    for (let i = 0; i < n; i++) { px[i] = (fl[2 * i] / 100 - x0) / res; py[i] = (fl[2 * i + 1] / 100 - y0) / res; }
    for (let i = 1; i < n; i++) { const ax = px[i - 1], ay = py[i - 1], bx = px[i], by = py[i]; const st = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 1.5)); for (let s = 0; s <= st; s++) stamp(ax + (bx - ax) * s / st, ay + (by - ay) * s / st); }
    if (f && n > 2) { // even-odd scanline fill
      let ymin = 1e9, ymax = -1e9; for (let i = 0; i < n; i++) { ymin = Math.min(ymin, py[i]); ymax = Math.max(ymax, py[i]); }
      for (let iy = Math.max(0, Math.floor(ymin)); iy <= Math.min(H - 1, Math.ceil(ymax)); iy++) { const yy = iy + 0.5, xs = [];
        for (let i = 0, j = n - 1; i < n; j = i++) { const ay = py[j], by = py[i]; if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(px[j] + (yy - ay) / (by - ay) * (px[i] - px[j])); }
        xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let ix = Math.max(0, Math.round(xs[k])); ix <= Math.min(W - 1, Math.round(xs[k + 1])); ix++) S[iy * W + ix] = 1; }
    }
  }
  for (let i = 0; i < S.length; i++) S[i] |= E[i];
  // exterior flood → solid = everything the outline encloses
  const out = new Uint8Array(W * H), stack = new Int32Array(W * H); let sp = 0;
  const push = (i) => { if (!S[i] && !out[i]) { out[i] = 1; stack[sp++] = i; } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); } for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (sp) { const i = stack[--sp], x = i % W; if (x > 0) push(i - 1); if (x < W - 1) push(i + 1); if (i >= W) push(i - W); if (i < W * (H - 1)) push(i + W); }
  let solid = new Uint8Array(W * H); for (let i = 0; i < solid.length; i++) solid[i] = out[i] ? 0 : 1;
  // opening (2 px): thin antennas, rails and stray lines disappear, bodies stay
  const sep = (src, r, grow) => { const tmp = new Uint8Array(W * H), dst = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = grow ? 0 : 1; for (let k = -r; k <= r; k++) { const X = x + k; const s = X >= 0 && X < W ? src[y * W + X] : 0; if (grow) { if (s) { v = 1; break; } } else if (!s) { v = 0; break; } } tmp[y * W + x] = v; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = grow ? 0 : 1; for (let k = -r; k <= r; k++) { const Y = y + k; const s = Y >= 0 && Y < H ? tmp[Y * W + x] : 0; if (grow) { if (s) { v = 1; break; } } else if (!s) { v = 0; break; } } dst[y * W + x] = v; }
    return dst; };
  solid = sep(sep(solid, 2, 0), 2, 1);
  return { W, H, x0, y0, res, E, solid };
};
C3D.cadAnalyse = (dr) => {
  const res = 0.05, R = C3D.cadRaster(dr, res), { W, H, x0, y0, E, solid } = R;
  const X = (ix) => x0 + ix * res, Y = (iy) => y0 + iy * res, ix_ = (x) => Math.round((x - x0) / res), iy_ = (y) => Math.round((y - y0) / res);
  // tyres from the vector data: closed, round-ish, standing on the ground
  const wh = [];
  for (const [, , fl] of dr.body) { if (fl.length < 24) continue; let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (let i = 0; i < fl.length; i += 2) { a = Math.min(a, fl[i]); c = Math.max(c, fl[i]); b = Math.min(b, fl[i + 1]); d = Math.max(d, fl[i + 1]); }
    const w = (c - a) / 100, h = (d - b) / 100; if (b / 100 < 0.3 && w > 0.8 && w < 2.0 && h > 0.9 && h < 1.7) wh.push({ x: (a + c) / 200, r: h / 2 }); }
  wh.sort((p, q) => p.x - q.x); const wc = []; for (const w of wh) { const l = wc[wc.length - 1]; if (l && Math.abs(l.x - w.x) < 0.4) { l.r = Math.max(l.r, w.r); } else wc.push({ ...w }); }
  const wr = wc.length ? wc.map(w => w.r).sort((a, b) => a - b)[wc.length >> 1] : 0.7;
  // the deck: the highest long horizontal edge between the boom-foot height minus 2.5 m and minus 1.45 m, within ±4.5 m of the slew centre (the ring's top)
  const pvY = dr.pivot[1]; const cnt = (iy) => { let n = 0; for (let ix = ix_(-4.5); ix <= ix_(4.5); ix++) if (E[iy * W + ix]) n++; return n; };
  let mx = 0; for (let iy = iy_(pvY - 2.5); iy <= iy_(pvY - 1.45); iy++) mx = Math.max(mx, cnt(iy));
  let deckRow = iy_(pvY - 1.9); for (let iy = iy_(pvY - 1.45); iy >= iy_(pvY - 2.5); iy--) if (cnt(iy) >= mx * 0.9) { deckRow = iy; break; }
  const deck = Y(deckRow) - 0.03;
  // carrier extents: columns that are solid just under the deck; the cab is at the longer end
  let lo = 1e9, hi = -1e9; const rowU = iy_(deck - 0.2); for (let ix = 0; ix < W; ix++) if (solid[rowU * W + ix]) { lo = Math.min(lo, ix); hi = Math.max(hi, ix); }
  const xa = X(lo), xb = X(hi + 1), sgn = Math.abs(xb) >= Math.abs(xa) ? 1 : -1;
  // superstructure = the columns around the boom foot that stand tall (>= boom foot - 0.6 m); a raised deck behind a rear cab is lower than that
  const colTop = new Float32Array(W).fill(-9); for (let ix = 0; ix < W; ix++) for (let iy = H - 1; iy >= 0; iy--) if (solid[iy * W + ix]) { colTop[ix] = Y(iy + 1); break; }
  let ux0 = ix_(dr.pivot[0]), ux1 = ux0; while (ux0 > 0 && colTop[ux0 - 1] >= pvY - 0.6) ux0--; for (let g = 0, j = ux1; j < W - 1 && g < 1.9 / res; j++) { if (colTop[j + 1] >= pvY - 0.6) { ux1 = j + 1; g = 0; } else g++; }
  const uTop = new Float32Array(W).fill(-9), uBot = new Float32Array(W).fill(99), r0 = iy_(deck);
  for (let ix = ux0; ix <= ux1; ix++) { uTop[ix] = colTop[ix]; let b = H; for (let iy = r0 - 2; iy < H; iy++) if (solid[iy * W + ix]) { b = iy; break; } uBot[ix] = Math.max(Y(b), deck - 0.02); }
  // carrier top profile (carrier frame u, cab at +u): under the superstructure it is the deck; elsewhere the silhouette top
  const ctop = []; for (let ix = lo; ix <= hi; ix++) { const inUp = ix >= ux0 && ix <= ux1; let t = colTop[ix]; t = inUp ? Math.min(t, deck) : Math.max(Math.min(t, 6), 0.9); ctop.push([sgn * (X(ix) + res / 2), t]); }
  if (sgn < 0) ctop.reverse();
  const sample = (a, step) => { const o = []; for (let i = 0; i < a.length; i += step) o.push(a[i]); if (o[o.length - 1] !== a[a.length - 1]) o.push(a[a.length - 1]); return o; };
  const up = []; for (let ix = ux0; ix <= ux1; ix++) up.push([X(ix) + res / 2, uTop[ix], uBot[ix]]);
  return { sgn, wheels: wc.map(w => ({ u: sgn * w.x, r: w.r })).sort((p, q) => p.u - q.u), wr, deck,
    carrier: { u0: sgn > 0 ? X(lo) : -X(hi + 1), u1: sgn > 0 ? X(hi + 1) : -X(lo), top: C3D.simplify(sample(ctop, 2), 0.035) },
    upper: { x0: X(ux0), x1: X(ux1 + 1), top: C3D.simplify(sample(up.map(p => [p[0], p[1]]), 2), 0.035), bot: C3D.simplify(sample(up.map(p => [p[0], p[2]]), 2), 0.035) } };
};
C3D.cadOf = (dr) => dr._c3d || (dr._c3d = C3D.cadAnalyse(dr));
// axle positions for m axles between the rear end u0 and the cab end u1: a steering group behind the cab, a drive group at the rear
C3D.axlesFor = (m, u0, u1, truck) => {
  const f = Math.min(m - 1, Math.max(1, Math.round(m * (truck ? 0.4 : 0.5)))), xs = [];
  for (let i = 0; i < f; i++) xs.push(u1 - 2.4 - i * 1.65); for (let i = 0; i < m - f; i++) xs.push(u0 + 1.4 + i * 1.65);
  return xs.sort((a, b) => a - b);
};
// the crane's shape in metres, in two frames: the carrier (u runs to the cab, y up) and the superstructure (x runs along the boom, y up).
// From the CAD side view when there is one — with the axle count set to the crane's (a stretch of plain chassis is added or taken out between the axle groups) — else a procedural body of the same kind.
C3D.model = (p) => {
  const W = p.W, m = Math.max(2, Math.round(p.axles || 4)), dr = p.dr && p.dr.v === 2 ? p.dr : null, truck = !!p.truck;
  const A = dr ? C3D.cadOf(dr) : null; const M = { W, cad: !!A };
  if (A) {
    M.wr = A.wheels.length ? A.wr : (truck ? 0.56 : 0.66); M.deck = A.deck;
    let ws = A.wheels.map(w => w.u), top = A.carrier.top.map(q => q.slice()), u1 = A.carrier.u1; const u0 = A.carrier.u0;
    if (!ws.length) ws = C3D.axlesFor(m, u0, u1, truck);
    else if (ws.length !== m) {
      const gaps = ws.slice(1).map((u, i) => u - ws[i]), srt = gaps.slice().sort((a, b) => a - b), pitch = srt[Math.max(0, Math.floor(srt.length * 0.35))] || 1.65;
      let gi = -1; gaps.forEach((gp, i) => { if (ws[i] > -1 && (gi < 0 || gp > gaps[gi])) gi = i; }); if (gi < 0) gi = gaps.length - 1;
      const uc = (ws[gi] + ws[gi + 1]) / 2; let d = m - ws.length, s;
      if (d > 0) { const nw = ws.slice(0, gi + 1); for (let k = 1; k <= d; k++) nw.push(ws[gi] + pitch * k); s = d * pitch; ws = nw.concat(ws.slice(gi + 1).map(u => u + s)); }
      else { d = Math.min(-d, gi); s = -d * pitch; ws = ws.slice(0, gi + 1 - d).concat(ws.slice(gi + 1).map(u => u + s)); }
      if (Math.abs(s) > 1e-6) { // the same shift in the outline: a flat strip is opened up (or cut out) at the cut
        const y = (u) => C3D.profAt(top, u), nt = []; for (const q of top) if (q[0] < uc + Math.min(0, s) - 1e-6) nt.push(q);
        if (s > 0) nt.push([uc, y(uc)], [uc + s, y(uc)]); else nt.push([uc + s, y(uc + s)], [uc + s, y(uc)]); for (const q of top) if (q[0] >= uc) nt.push([q[0] + s, q[1]]); top = nt; u1 += s; }
    }
    M.axles = ws; M.ctop = top; M.u0 = u0; M.u1 = u1;
    M.up = { x0: A.upper.x0, x1: A.upper.x1, top: A.upper.top.map(q => q.slice()), bot: A.upper.bot.map(q => q.slice()) }; M.pivX = dr.pivot[0]; M.pivY = dr.pivot[1];
  } else {
    const Lc = p.Lc || 15, deck = truck ? 1.7 : 1.9, wr = truck ? 0.56 : 0.66, u0 = -Math.min(5.2, Lc * 0.33), u1 = u0 + Lc, cabL = truck ? 2.3 : 2.6, roof = truck ? 3.2 : 3.35;
    M.wr = wr; M.deck = deck; M.u0 = u0; M.u1 = u1; M.axles = C3D.axlesFor(m, u0, u1, truck);
    M.ctop = [[u0, deck + 0.25], [u0 + 0.5, deck + 0.25], [u0 + 0.5, deck], [u1 - cabL, deck], [u1 - cabL, roof - 0.1], [u1 - cabL + 0.1, roof], [u1 - 0.95, roof], [u1 - 0.3, roof - 0.75], [u1 - 0.06, 1.55], [u1, 1.0]];
    const tail = Math.max(3, p.tail || 5), x0 = -tail + 0.3, cwt = Math.max(5, p.cwt || 30), cwW = Math.min(3.2, 1.2 + cwt / 55), cwH = Math.min(3.4, 0.9 + cwt / 32); M.pivX = p.pivX ?? -1.5; M.pivY = p.pivH || 3.2;
    const xc = x0 + cwW, xCab = M.pivX + 1.6, x1 = M.pivX + 4.1, body = Math.min(M.pivY - 0.3, deck + 2.3), roofU = deck + 2.9;
    M.up = { x0, x1, top: [[x0, deck + 0.6], [x0 + 0.12, deck + cwH], [xc, deck + cwH], [xc, body], [xCab, body], [xCab, roofU - 0.1], [xCab + 0.1, roofU], [x1 - 0.8, roofU], [x1 - 0.15, roofU - 0.8], [x1, deck + 1.5]], bot: [[x0, deck], [x1, deck]] };
  }
  return M;
};

// ---------- the crane ----------
// telescopic section: an octagonal prism along +x, length 1 (scaled to the section's length), depth d (y), width w (z)
C3D.prismX = (w, d, ch) => {
  const hy = d / 2, hz = w / 2, c = Math.min(ch, hy * 0.9, hz * 0.9);
  const ring = [[hy - c, hz], [hy, hz - c], [hy, -(hz - c)], [hy - c, -hz], [-(hy - c), -hz], [-hy, -(hz - c)], [-hy, hz - c], [-(hy - c), hz]];
  const pos = [], nor = [], idx = []; let n = 0;
  const tri = (a, b, c2, nn) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c2[0] - a[0], c2[1] - a[1], c2[2] - a[2]]; const cx = ab[1] * ac[2] - ab[2] * ac[1], cy = ab[2] * ac[0] - ab[0] * ac[2], cz = ab[0] * ac[1] - ab[1] * ac[0];
    const flip = cx * nn[0] + cy * nn[1] + cz * nn[2] < 0; const vs = flip ? [a, c2, b] : [a, b, c2]; for (const v of vs) { pos.push(...v); nor.push(...nn); idx.push(n++); } };
  for (let i = 0; i < 8; i++) { const [y1, z1] = ring[i], [y2, z2] = ring[(i + 1) % 8]; let ny = z2 - z1, nz = -(y2 - y1); if (ny * (y1 + y2) + nz * (z1 + z2) < 0) { ny = -ny; nz = -nz; } const l = Math.hypot(ny, nz); ny /= l; nz /= l;
    const A = [0, y1, z1], B = [1, y1, z1], C = [1, y2, z2], D = [0, y2, z2]; tri(A, B, C, [0, ny, nz]); tri(A, C, D, [0, ny, nz]); }
  for (const x of [0, 1]) for (let i = 0; i < 8; i++) { const [y1, z1] = ring[i], [y2, z2] = ring[(i + 1) % 8]; tri([x, 0, 0], [x, y1, z1], [x, y2, z2], [x ? 1 : -1, 0, 0]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx); g.computeBoundingSphere(); return g;
};
// hook block (origin: 0.95 m above the hook's bill, which is where the slings pick up; the sheaves are at the top)
C3D.hookBlock = (g, mats, nS, wB, hTop) => {
  const b = C3D.bag(), R1 = Math.max(0.26, Math.min(0.62, wB * 0.46)), zc = 0.07 + nS * 0.055, cy = hTop - R1;
  const arc = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * i / 14; arc.push([Math.cos(a) * R1, cy + Math.sin(a) * R1]); }
  const cheek = arc.concat([[-0.2, -0.1], [0.2, -0.1]]);
  for (const s of [-1, 1]) b.poly(mats.cheek, cheek, s * zc - 0.022, s * zc + 0.022, 0.006);
  for (let i = 0; i < nS; i++) b.cyl(mats.steel, R1 * 0.84, 0.075, [0, cy, (i - (nS - 1) / 2) * 0.115], 'z', 22);
  b.cyl(mats.steel, 0.07, 2 * zc + 0.2, [0, cy, 0], 'z', 10);
  b.box(mats.stripe, [Math.max(0.55, wB * 0.78), 0.46, 2 * zc + 0.06], [0, -0.12, 0]);
  b.cyl(mats.steel, 0.08, 0.34, [0, -0.46, 0], 'y', 10);
  b.cyl(mats.steel, 0.13, 0.1, [0, -0.3, 0], 'y', 14);
  const hk = new THREE.TorusGeometry(0.2, 0.062, 8, 22, Math.PI * 1.45); b.geo(mats.steel, hk, b.xf([0, -0.72, 0], [0, 0, Math.PI * 0.8], [1, 1, 1])); hk.dispose();
  b.box(mats.steel, [0.035, 0.2, 0.05], [0.1, -0.52, 0], [0, 0, -0.5]);
  const grp = new THREE.Group(); b.build(grp, { disp: g.disp }); return grp;
};
C3D.buildCrane = (p) => {
  const g = { disp: [] }; const own = (x) => (g.disp.push(x), x); const root = new THREE.Group(); g.root = root;
  const M = C3D.model(p), W = M.W, wr = M.wr, deck = M.deck, lift = 0.12, dr = M.cad ? p.dr : null; g.M = M; g.cad = !!dr;
  const col = p.paint || '#f5c400', mat = (o) => own(C3D.mat(o));
  const paint = mat({ color: col, metalness: 0.1, roughness: 0.38, envMapIntensity: 0.55 });
  const paintDk = mat({ color: '#' + new THREE.Color(col).multiplyScalar(0.66).getHexString(), metalness: 0.15, roughness: 0.5, envMapIntensity: 0.5 });
  const steel = mat({ color: '#31353b', metalness: 0.6, roughness: 0.46 });
  const frame = mat({ color: '#1b1e22', metalness: 0.3, roughness: 0.72 });
  const cw = mat({ color: '#464b52', metalness: 0.32, roughness: 0.58 });
  const glass = mat({ color: '#0a141d', metalness: 0.95, roughness: 0.05, envMapIntensity: 1.6 });
  const tyre = mat({ color: '#0f1011', metalness: 0, roughness: 0.96 });
  const rim = mat({ color: '#c6ccd2', metalness: 0.9, roughness: 0.3 });
  const chrome = mat({ color: '#d4d8dc', metalness: 0.95, roughness: 0.16 });
  const wood = mat({ color: '#6b5232', metalness: 0, roughness: 0.95 });
  const lampW = own(C3D.basic({ color: '#fff3d2' })), lampR = own(C3D.basic({ color: '#b01818' })), lampA = own(C3D.basic({ color: '#ffa81c' }));
  const stripe = own(new THREE.MeshStandardMaterial({ map: own(C3D.stripeTex()), metalness: 0.2, roughness: 0.5 }));
  g.mats = { paint, paintDk, steel, cw, glass, tyre, chrome, lat: mat({ color: col, metalness: 0.3, roughness: 0.45 }), frame };
  // ---------- carrier ----------
  const car = C3D.bag(), top = M.ctop, u0 = M.u0, u1 = M.u1, Wb = W - 0.2, trk = W / 2 - 0.3, yc = wr + lift;
  car.box(frame, [u1 - u0 - 1.6, Math.max(0.2, deck - 0.5 - 0.6), 0.95], [(u0 + u1) / 2 - 0.4, (0.6 + deck - 0.5) / 2, 0]);
  const R = wr, rimR = R * 0.58;
  const tyreG = new THREE.LatheGeometry([[rimR, -0.2], [R - 0.14, -0.225], [R - 0.045, -0.205], [R - 0.012, -0.15], [R, -0.1], [R, 0.1], [R - 0.012, 0.15], [R - 0.045, 0.205], [R - 0.14, 0.225], [rimR, 0.2]].map(q => new THREE.Vector2(q[0], q[1])), 26);
  const rimG = new THREE.LatheGeometry([[rimR, 0.1], [rimR, 0.2], [rimR * 0.92, 0.2], [rimR * 0.86, 0.17], [rimR * 0.36, 0.17], [rimR * 0.36, 0.228], [0, 0.228]].map(q => new THREE.Vector2(q[0], q[1])), 22);
  for (const u of M.axles) {
    car.cyl(steel, 0.1, 2 * trk, [u, yc, 0], 'z', 10); car.cyl(steel, 0.27, 0.5, [u, yc, 0], 'z', 12);
    for (const s of [-1, 1]) { const m4 = car.xf([u, yc, s * trk], [s * Math.PI / 2, 0, 0], [1, 1, 1]); car.geo(tyre, tyreG, m4); car.geo(rim, rimG, m4); }
  }
  tyreG.dispose(); rimG.dispose();
  // body: the CAD outline from the cab to the tail, bottom cut away over the tyres
  const flatBot = (t) => (t > 3.0 ? 0.85 : Math.max(0.95, Math.min(t - 0.5, deck - 0.5)));
  const bot = []; for (let u = u1; u >= u0 - 1e-6; u -= 0.1) { const t = C3D.profAt(top, u); let b = flatBot(t); for (const a of M.axles) { const ra = wr + 0.1, du = u - a; if (Math.abs(du) < ra) b = Math.max(b, yc + Math.sqrt(ra * ra - du * du)); } bot.push([u, Math.min(b, t - 0.07)]); }
  car.poly(paint, top.concat(bot), -Wb / 2, Wb / 2, 0.025);
  // cab
  const roof = Math.max(C3D.profAt(top, u1 - 0.8), C3D.profAt(top, u1 - 1.3), C3D.profAt(top, u1 - 2.0)), sill = Math.max(roof - 1.2, 1.35); let cabBack = u1 - 2.4;
  for (let u = u1 - 1.2; u > u1 - 3.4; u -= 0.05) if (C3D.profAt(top, u) < roof - 0.3) { cabBack = u; break; }
  { const wp = [], xa = cabBack + 0.14, xb = u1 - 0.1; wp.push([xa, sill]); for (let u = xa; u <= xb; u += 0.08) wp.push([u, Math.min(C3D.profAt(top, u) - 0.12, roof - 0.12)]); wp.push([xb, Math.min(C3D.profAt(top, xb) - 0.12, roof - 0.12)], [xb, sill]);
    const win = wp.filter((q, i) => q[1] > sill + 0.1 || i === 0 || i === wp.length - 1); car.poly(glass, win, Wb / 2 - 0.01, Wb / 2 + 0.018); car.poly(glass, win, -Wb / 2 - 0.018, -Wb / 2 + 0.01);
    let uA = u1; for (let u = u1 - 0.1; u > cabBack; u -= 0.05) if (C3D.profAt(top, u) >= roof - 0.2) { uA = u; break; } let uB = uA; for (let u = uA; u <= u1; u += 0.03) { uB = u; if (C3D.profAt(top, u) <= sill + 0.1) break; }
    const ya = C3D.profAt(top, uA) - 0.12, yb = Math.max(sill, C3D.profAt(top, uB)), dx = uB - uA, dy = yb - ya, L = Math.hypot(dx, dy);
    if (L > 0.3) { const nx = -dy / L, ny = dx / L; car.box(glass, [L, 0.03, Wb - 0.5], [(uA + uB) / 2 + nx * 0.018, (ya + yb) / 2 + ny * 0.018, 0], [0, 0, Math.atan2(dy, dx)]); } }
  for (const s of [-1, 1]) car.box(lampW, [0.05, 0.16, 0.36], [u1 - 0.035, 1.12, s * (Wb / 2 - 0.4)]);
  car.box(frame, [0.28, 0.26, Wb - 0.05], [u1 - 0.12, 0.8, 0]);
  { const yr = Math.max(1.2, C3D.profAt(top, u0 + 0.05) - 0.4); for (const s of [-1, 1]) car.box(lampR, [0.05, 0.18, 0.3], [u0 + 0.025, yr, s * (Wb / 2 - 0.3)]); }
  car.cyl(lampA, 0.1, 0.12, [cabBack + (u1 - cabBack) * 0.45, roof + 0.06, 0], 'y', 8);
  // outriggers: transverse boxes, two-stage beams out to the real spread (full or half, each side), jacks, pads and the timber mats
  const ouf = (p.outEx || 0) + (p.outL || 7) / 2, our = (p.outEx || 0) - (p.outL || 7) / 2, spanL = p.oTL ?? (p.outT || 7) / 2, spanR = p.oTR ?? (p.outT || 7) / 2, mw = p.mat || 1.6;
  for (const u of [ouf, our]) {
    car.box(paintDk, [0.8, 0.55, W - 0.35], [u, 0.98, 0]);
    for (const s of [-1, 1]) { const span = s < 0 ? spanL : spanR, z0 = s * (W / 2 - 0.25), zp = s * span, len = Math.abs(zp - z0);
      if (len > 0.2) { const l1 = len * 0.55, l2 = len - l1 + 0.3; car.box(paintDk, [0.52, 0.5, l1], [u, 0.98, z0 + s * l1 / 2]); car.box(steel, [0.4, 0.4, l2], [u, 0.98, z0 + s * (l1 + l2 / 2 - 0.3)]); }
      car.box(paintDk, [0.56, 0.62, 0.56], [u, 1.18, zp]); car.cyl(chrome, 0.1, 0.64, [u, 0.58, zp], 'y', 10); car.box(steel, [0.9, 0.14, 0.9], [u, 0.22, zp]); car.box(wood, [mw, 0.16, mw], [u, 0.08, zp]); }
  }
  car.build(root, { disp: g.disp });
  // ---------- superstructure (slews) ----------
  const up = new THREE.Group(); up.position.set(0, deck, 0); root.add(up); g.upper = up; g.px = M.pivX; g.ph = M.pivY - deck;
  const U = C3D.bag(), Wu = W - 0.5, uT = M.up.top.map(q => [q[0], q[1] - deck]), uB = M.up.bot.map(q => [q[0], q[1] - deck]), x0 = M.up.x0, x1 = M.up.x1, tA = (x) => C3D.profAt(uT, x);
  U.cyl(steel, 1.5, 0.3, [0, 0.15, 0], 'y', 32); U.cyl(frame, 1.2, 0.3, [0, -0.15, 0], 'y', 24);
  const region = (a, b, capY, floorY) => { const t = C3D.profClip(uT, a, b).map(q => [q[0], Math.max(Math.min(q[1], capY), C3D.profAt(uB, q[0]) + 0.05)]), bt = C3D.profClip(uB, a, b).map(q => [q[0], Math.max(q[1], floorY)]); return t.concat(bt.reverse()); };
  // counterweight: the tall plateau at the tail, as stacked slabs (fewer slabs with a lighter counterweight)
  let xc = x0 + 0.4; const cwTop = tA(x0 + 0.3); while (xc < x0 + 4.6 && Math.abs(tA(xc + 0.1) - cwTop) < 0.3) xc += 0.1; xc = Math.min(Math.max(xc, x0 + 1.2), x1 - 3.0);
  const cwR = Math.max(0.25, Math.min(1, p.cwtR ?? 1)), cwB = Math.max(...uB.filter(q => q[0] < xc).map(q => q[1])), cwCap = cwB + (cwTop - cwB) * (0.5 + 0.5 * cwR);
  U.poly(cw, region(x0, xc, cwCap, 0), -(W - 0.3) / 2, (W - 0.3) / 2, 0.02);
  for (let y = cwB + 0.55; y < cwCap - 0.2; y += 0.55) { let xl = x0; while (xl < xc && tA(xl) < y) xl += 0.05; U.box(frame, [xc - xl, 0.035, W - 0.3 + 0.03], [(xl + xc) / 2, y, 0]); }
  // body, then the front: the lower deck at full width and the operator's cab beside the boom
  const xCab = Math.max(M.pivX + 1.6, x1 - 2.2), sillU = 0.95;
  U.poly(paint, region(xc, xCab, 99, 0), -Wu / 2, Wu / 2, 0.025);
  U.poly(paint, region(xCab, x1, sillU, 0), -Wu / 2, Wu / 2, 0.025);
  { const ct = C3D.profClip(uT, xCab, x1); if (Math.max(...ct.map(q => q[1])) > sillU + 0.4) { const cp = ct.map(q => [q[0], Math.max(q[1], sillU + 0.05)]).concat([[x1, sillU], [xCab, sillU]]); const cwid = 1.35, zc0 = -Wu / 2, zc1 = zc0 + cwid; U.poly(paint, cp, zc0, zc1, 0.025);
      const cx = (xCab + x1) / 2, cyy = (Math.max(...ct.map(q => q[1])) + sillU) / 2, win = cp.map(q => [cx + (q[0] - cx) * 0.8, cyy + (q[1] - cyy) * 0.7]); U.poly(glass, win, zc0 - 0.015, zc0 + 0.012); U.poly(glass, win, zc1 - 0.012, zc1 + 0.015);
      const fa = ct[ct.length - 1], ym = Math.max(...ct.map(q => q[1])), fb = ct.slice().reverse().find(q => q[1] >= ym - 0.12) || fa; if (fa && fb && x1 - fb[0] > 0.1 && fb[1] - fa[1] > 0.3) { const dx = x1 - fb[0], dy = fa[1] - fb[1], L = Math.hypot(dx, dy); if (L > 0.3) U.box(glass, [L, 0.03, cwid - 0.15], [(x1 + fb[0]) / 2 + (-dy / L) * 0.02, (fa[1] + fb[1]) / 2 + (dx / L) * 0.02, (zc0 + zc1) / 2], [0, 0, Math.atan2(dy, dx)]); } } }
  // boom foot: cheek plates and pin
  const bw = 0.9 * (p.D || 1.4), pvl = g.ph; for (const s of [-1, 1]) U.box(paintDk, [0.7, 1.1, 0.12], [M.pivX + 0.25, pvl - 0.15, s * (bw / 2 + 0.16)]);
  U.cyl(steel, 0.11, bw + 0.6, [M.pivX, pvl, 0], 'z', 12);
  U.build(up, { disp: g.disp });
  // ---------- telescopic boom ----------
  const boom = new THREE.Group(); boom.position.set(M.pivX, pvl, 0); up.add(boom); g.boom = boom;
  const secs = [], n = p.n || 5; let tipN = 0, tipR = 0.35;
  if (dr) {
    const bs = baseSectionInfo(dr); let prev = null;
    dr.secs.forEach((s, i) => { let d = i === 0 ? bs.qb - bs.qa : s.n1 - s.n0, q = i === 0 ? (bs.qa + bs.qb) / 2 : (s.n0 + s.n1) / 2; if (prev) { d = Math.min(d, prev.d * 0.97); } if (i === dr.secs.length - 1) { d = prev.d * 0.94; q = prev.q; } secs.push({ s0: s.s0, len: s.s1 - s.s0, d, q }); prev = secs[secs.length - 1]; });
    tipN = dr.tip[1]; tipR = dr.tipR || 0.3; g.D = secs[0].d; g.qc = secs[0].q;
  } else {
    const D = p.D || 1.4, qc = p.qc != null ? p.qc : -0.3 * D; g.D = D; g.qc = qc;
    for (let i = 0; i < n; i++) secs.push({ s0: 0, len: 1, d: D * Math.pow(0.88, i), q: qc }); tipN = qc; tipR = Math.max(0.28, D * 0.28);
  }
  g.secs = []; g.drSecs = secs; g.tipN = tipN; g.tipR = tipR;
  secs.forEach((s, i) => {
    const w = s.d * 0.88, geo = own(C3D.prismX(w, s.d, Math.min(w, s.d) * 0.2)); const sec = new THREE.Mesh(geo, paint); sec.castShadow = sec.receiveShadow = true; sec.position.y = s.q; boom.add(sec);
    let colr = null; if (i < n - 1) { colr = new THREE.Mesh(C3D._ub, steel); colr.castShadow = true; colr.scale.set(0.42, s.d * 1.05, w * 1.05); colr.position.y = s.q; boom.add(colr); }
    g.secs.push({ sec, col: colr, d: s.d, w });
  });
  if (p.livery) { // company lettering on both faces of the base section
    const tex = own(C3D.textTex(p.livery, { color: C3D.lum(p.paint || '#f5c400') > 0.55 ? '#111111' : '#ffffff' }));
    const lm = own(new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    g.letters = [1, -1].map((s) => { const pl = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.125), lm); if (s < 0) pl.rotation.y = Math.PI; boom.add(pl); return { pl, s }; });
  }
  // boom head: housing, nose and the head sheaves
  const headM = new THREE.Group(); boom.add(headM); g.head = headM; { const H = C3D.bag(), last = g.secs[g.secs.length - 1], hw = last.w + 0.16, nS = Math.min(3, Math.max(1, Math.round((p.falls || 4) / 2))); g.nSh = nS;
    H.box(paintDk, [1.1, last.d * 0.96 + 0.1, hw], [-0.45, secs[secs.length - 1].q - tipN, 0]); H.cyl(paintDk, tipR + 0.2, hw, [0, 0, 0], 'z', 20);
    for (let i = 0; i < nS; i++) H.cyl(steel, tipR, 0.1, [0, 0, (i - (nS - 1) / 2) * 0.17], 'z', 22);
    H.cyl(chrome, 0.07, hw + 0.12, [0, 0, 0], 'z', 8); H.box(paintDk, [0.5, 0.2, hw * 0.7], [0.15, tipR + 0.25, 0]); H.build(headM, { disp: g.disp }); }
  // luffing cylinder: barrel pinned to the superstructure, rod to the boom
  g.cylA = dr ? new THREE.Vector3(dr.cyl.C[0], dr.cyl.C[1] - deck, 0) : new THREE.Vector3(M.pivX + 2.2, 0.85, 0); g.cylB = dr ? dr.cyl.B : null;
  g.barrel = C3D.cyl(g.D * 0.15, g.D * 0.15, 1, paintDk); g.rod = C3D.cyl(g.D * 0.085, g.D * 0.085, 1, chrome); up.add(g.barrel); up.add(g.rod);
  // hook block, rope, slings and the load hang in world space
  const nF = Math.max(2, Math.min(16, Math.round(p.falls || 4))); g.nF = nF; const nS2 = Math.max(1, Math.min(5, Math.ceil(nF / 2)));
  g.hookTop = dr && dr.hook ? Math.max(0.5, Math.min(1.5, dr.hook.h * 0.8 - 0.95)) : 0.5; const wB = dr && dr.hook ? dr.hook.w : 0.7;
  const cheek = mat({ color: '#e0b000', metalness: 0.3, roughness: 0.5 });
  const hook = new THREE.Group(); g.hook = hook; hook.add(C3D.hookBlock(g, { cheek, steel, stripe }, nS2, wB, g.hookTop));
  g.rope = C3D.lines('#17181a'); g.slings = new THREE.Group(); g.slingMat = own(new THREE.MeshStandardMaterial({ color: C3D.lin('#d13b2a'), roughness: 0.7, metalness: 0.05 }));
  g.legs = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), g.slingMat); m.castShadow = true; g.slings.add(m); g.disp.push(m.geometry); return m; });
  g.load = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), own(C3D.mat({ color: '#9aa1a8', metalness: 0.1, roughness: 0.85 }))); g.load.castShadow = g.load.receiveShadow = true;
  g.acc = { sl: null, yg: null, run: null, guy: C3D.lines('#1a1a1a') }; up.add(g.acc.guy); g.jib = null;
  g.p = p; g.state = { theta: 55, slew: 0, fr: Array(Math.max(1, n - 1)).fill(0.4), L: null, hookY: null, loadSize: [3, 1.5, 2], jib: null, acc: {}, legs: 4 };
  return g;
};
// pose everything from the state (every frame in the hero, on change in the twin)
C3D.pose = (g, st, world) => {
  const p = g.p, dr = g.cad ? p.dr : null; let lay, K = 1;
  const th = st.theta * Math.PI / 180; g.upper.rotation.y = st.slew * Math.PI / 180; g.boom.rotation.z = th;
  if (dr) { // sections slide exactly as the 2D elevation draws them (cadSections)
    const L = st.L || (p.Lmin + st.fr.reduce((a, f) => a + f * p.E, 0)), cs = cadSections(dr, L, st.fr); K = cs.k; const starts = [], lens = [];
    g.secs.forEach(({ sec, col, d }, i) => { const s = g.drSecs[i], L0 = s.len * K, x0 = (s.s0 + cs.D[i]) * K; starts.push(x0); lens.push(L0); sec.scale.x = L0; sec.position.x = x0; if (col) col.position.x = x0 + L0 - 0.21; });
    lay = { starts, lens, tip: (dr.tip[0] + cs.D[cs.D.length - 1]) * K, k: 1, foot: 0, head: 0, n: starts.length };
  } else {
    const spec = { n: p.n, lens: p.lens, lo: 0.3, E: p.E, foot: p.foot, head: p.head }; lay = boomLayout(spec, st.L || (p.Lmin + st.fr.reduce((a, f) => a + f * p.E, 0)), st.fr); K = lay.k;
    g.secs.forEach(({ sec, col }, i) => { const L0 = lay.lens[i] * K, x0 = lay.starts[i] * K; sec.scale.x = L0; sec.position.x = x0; if (col) col.position.x = x0 + L0 - 0.21; });
  }
  const tipX = (dr ? lay.tip : lay.tip * K); g.head.position.set(tipX, g.tipN, 0);
  if (g.letters) { const s0 = dr ? lay.starts[0] + 1.2 : (lay.starts[0] + lay.foot + 0.7) * K, s1 = dr ? lay.starts[0] + lay.lens[0] - 1.0 : (lay.starts[0] + lay.lens[0] - 0.8) * K; const len = Math.max(1, s1 - s0); const sec0 = g.secs[0]; let sc = len; if (sc * 0.125 > sec0.d * 0.8) sc = sec0.d * 0.8 / 0.125;
    for (const { pl, s } of g.letters) { pl.scale.set(sc, sc, 1); pl.position.set(s0 + len / 2, g.qc, s * (sec0.w / 2 + 0.012)); } }
  // luffing cylinder
  g.boom.updateMatrix(); const bAnchor = dr ? new THREE.Vector3(g.cylB[0], g.cylB[1], 0) : new THREE.Vector3((lay.starts[0] + lay.lens[0] * 0.42) * K, g.qc - g.D / 2, 0); bAnchor.applyMatrix4(g.boom.matrix);
  const mid = new THREE.Vector3().lerpVectors(g.cylA, bAnchor, 0.58); C3D.between(g.barrel, g.cylA, mid); C3D.between(g.rod, mid, bAnchor);
  // jib (fly / luffing)
  let tipLocal = new THREE.Vector3(tipX, g.tipN, 0);
  if (st.jib && st.jib.len > 0) {
    if (!g.jib || g.jib.userData.len !== st.jib.len) { if (g.jib) { g.boom.remove(g.jib); g.jib.traverse(o => o.geometry && o.geometry.dispose()); } g.jib = new THREE.Group(); g.jib.userData.len = st.jib.len; g.jib.add(C3D.lattice(st.jib.len, 1.25, 1.1, g.mats.lat, { taper: 0.55 })); g.boom.add(g.jib); }
    const rel = (st.jib.angle - st.theta) * Math.PI / 180; g.jib.position.set(tipX - 0.4, g.tipN, 0); g.jib.rotation.z = rel;
    tipLocal = new THREE.Vector3(tipX - 0.4 + st.jib.len * Math.cos(rel), g.tipN + st.jib.len * Math.sin(rel), 0); g.head.visible = false;
  } else { if (g.jib) { g.boom.remove(g.jib); g.jib.traverse(o => o.geometry && o.geometry.dispose()); g.jib = null; } g.head.visible = true; }
  C3D.poseAcc(g, st, lay, dr ? 1 : K);
  // world positions for the hanging parts
  g.root.updateMatrixWorld(true); const tipW = tipLocal.clone(); g.boom.localToWorld(tipW);
  const hookY = st.hookY != null ? Math.min(st.hookY, tipW.y - 1.4 - g.hookTop) : Math.max(2.5, tipW.y * 0.45);
  const yaw = g.root.rotation.y + g.upper.rotation.y, sy = Math.sin(yaw), cy = Math.cos(yaw);
  g.hook.position.set(tipW.x, hookY, tipW.z); g.hook.rotation.y = yaw;
  const rp = [], nF = g.nF, dz = Math.min(0.13, 0.5 / Math.max(1, nF - 1)), rt = g.hookTop - 0.1; // falls: one line per rope part, side by side across the sheaves
  for (let i = 0; i < nF; i++) { const z = (i - (nF - 1) / 2) * dz, lx = sy * z, lz = cy * z; rp.push(tipW.x + lx, tipW.y - (g.tipR || 0.3), tipW.z + lz, tipW.x + lx, hookY + rt, tipW.z + lz); } C3D.setLines(g.rope, rp);
  const [lx, ly, lz] = st.loadSize; const loadTop = hookY - 0.95 - Math.max(1.2, st.rig || 3);
  g.load.scale.set(lx, ly, lz); g.load.position.set(tipW.x, loadTop - ly / 2, tipW.z); g.load.rotation.y = yaw;
  // slings: legs from the bill of the hook to the top corners of the load (their colour is the code colour of the sling)
  const nl = Math.max(1, Math.min(4, st.legs || 4)), cs2 = nl === 1 ? [[0, 0]] : nl === 2 ? [[1, 0], [-1, 0]] : nl === 3 ? [[1, 0.9], [-1, 0.9], [0, -1]] : [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  if (st.slingCol && g.slingCol !== st.slingCol) { g.slingCol = st.slingCol; g.slingMat.color.copy(C3D.lin(st.slingCol)); }
  const a = new THREE.Vector3(tipW.x, hookY - 0.95, tipW.z), b = new THREE.Vector3();
  g.legs.forEach((m, i) => { m.visible = i < nl && !st.empty; if (!m.visible) return; const [ax, az] = cs2[i], ox = ax * lx / 2 * 0.85, oz = az * lz / 2 * 0.85; b.set(tipW.x + ox * cy + oz * sy, loadTop, tipW.z - ox * sy + oz * cy); C3D.between(m, a, b); });
  g.load.visible = g.slings.visible = !st.empty;
  if (world && !g._hung) { world.add(g.hook, g.rope, g.slings, g.load); g._hung = true; }
  g.tipW = tipW; g.lay = lay;
  return { tipW, hookY, lay: { ...lay, k: dr ? 1 : lay.k } };
};
C3D._drop = (parent, o) => { parent.remove(o); o.traverse((m) => m.geometry && m.geometry !== C3D._ub && m.geometry.dispose()); };
C3D.poseAcc = (g, st, lay, K) => {
  const A = st.acc || {}; const up = g.upper; const L = lay.tip * K; const th = st.theta * Math.PI / 180;
  const boomPt = (s, q = 0) => new THREE.Vector3(g.px + s * Math.cos(th) - q * Math.sin(th), g.ph + s * Math.sin(th) + q * Math.cos(th), 0); // boom axis → upper coords
  const guy = [];
  // superlift: derrick mast at 102°, ballast tray at the superlift radius, pendants to the boom head and the tray
  if (A.superlift) {
    const Lm = Math.max(14, Math.min(32, L * 0.42)), r = Math.max(8, num(A.slRadius, 15)), bt = Math.max(10, num(A.slBallast, 100)), bh = Math.max(0.8, Math.min(3.2, bt / 55));
    const key = [Lm.toFixed(1), r, bh].join('|');
    if (!g.acc.sl || g.acc.sl.userData.key !== key) {
      if (g.acc.sl) C3D._drop(up, g.acc.sl); const sl = new THREE.Group(); sl.userData.key = key;
      const mast = C3D.lattice(Lm, 1.4, 1.4, g.mats.lat, { bay: 1.8, r: 0.06 }); mast.position.set(g.px + 0.6, g.ph + 0.25, 0); mast.rotation.z = 102 * Math.PI / 180; sl.add(mast);
      C3D.box(4, bh, 3.2, g.mats.cw, -r, bh / 2 + 0.55 - 1.9, 0, sl); C3D.box(4.4, 0.35, 3.6, g.mats.steel, -r, 0.175 - 1.9, 0, sl);
      sl.userData.top = new THREE.Vector3(g.px + 0.6 + Lm * Math.cos(102 * Math.PI / 180), g.ph + 0.25 + Lm * Math.sin(102 * Math.PI / 180), 0); sl.userData.tray = new THREE.Vector3(-r, bh + 0.55 - 1.9, 0);
      up.add(sl); g.acc.sl = sl;
    }
    const top = g.acc.sl.userData.top, tray = g.acc.sl.userData.tray, head = boomPt(L - 1);
    for (const dz of [-0.35, 0.35]) guy.push(top.x, top.y, dz, head.x, head.y, dz, top.x, top.y, dz, tray.x + 0.6, tray.y, dz);
  } else if (g.acc.sl) { C3D._drop(up, g.acc.sl); g.acc.sl = null; }
  // Y-guying: two struts splayed sideways from the base section, guy ropes to the head and the foot
  if (A.yguy) {
    const Ly = Math.max(6, Math.min(12, L * 0.17)); const s0 = lay.starts[0] * K + lay.lens[0] * K * 0.3; const pin = boomPt(s0, g.qc + g.D / 2);
    const a = th + 97 * Math.PI / 180; const Y = new THREE.Vector3(pin.x + Ly * Math.cos(a), pin.y + Ly * Math.sin(a), 0);
    if (!g.acc.yg) { const yg = new THREE.Group(); g.acc.yg = yg; yg.userData.struts = [-1, 1].map(s => { const m = C3D.cyl(0.14, 0.1, 1, g.mats.paintDk, 8); yg.add(m); return { m, s }; }); up.add(yg); }
    for (const { m, s } of g.acc.yg.userData.struts) C3D.between(m, new THREE.Vector3(pin.x, pin.y, s * 0.45), new THREE.Vector3(Y.x, Y.y, s * 1.6));
    const head = boomPt(L - 0.8, g.qc + g.D * 0.3), foot = boomPt(lay.starts[0] * K + 0.7, g.qc + g.D / 2);
    for (const s of [-1, 1]) guy.push(Y.x, Y.y, s * 1.6, head.x, head.y, s * 0.2, Y.x, Y.y, s * 1.6, foot.x, foot.y, s * 0.3);
  } else if (g.acc.yg) { C3D._drop(up, g.acc.yg); g.acc.yg = null; }
  // runner: short single-sheave head beside the main head
  if (A.runner && !(st.jib && st.jib.len > 0)) {
    if (!g.acc.run) { const rn = new THREE.Group(); C3D.box(1.7, 0.4, 0.35, g.mats.steel, 0.85, 0, 0, rn); const sv = C3D.cyl(0.26, 0.26, 0.12, g.mats.chrome, 18); sv.rotation.x = Math.PI / 2; sv.position.set(1.7, 0, 0); rn.add(sv); g.boom.add(rn); g.acc.run = rn; }
    g.acc.run.position.set(lay.tip * K, 0, 0.45); g.acc.run.rotation.z = -25 * Math.PI / 180;
  } else if (g.acc.run) { C3D._drop(g.boom, g.acc.run); g.acc.run = null; }
  C3D.setLines(g.acc.guy, guy);
};
// crane parameters from the library + plan (shared by the sign-in hero and the twin)
// crane parameters from the library + plan (shared by the sign-in scene and the twin)
C3D.paramsFor = (crane, plan, calc, livery) => {
  const spec = boomSpec(crane, chartLengths(crane)); const dr0 = craneDrawing(crane), dr = dr0 && dr0.v === 2 ? dr0 : null;
  const b = dr ? baseSectionInfo(dr) : null; const cwt = num(plan?.cwt ?? crane.cwt, 40), cmax = Math.max(0, ...(crane.charts || []).map(c => num(c.cwt)));
  const sp = typeof outSpans === 'function' ? outSpans(crane, plan ? outExtOf(plan) : { left: 'full', right: 'full' }) : null;
  return { Lc: num(crane.carrierLen, 15), W: num(crane.width, 2.9), axles: Math.max(2, Math.round(num(crane.axles, 6))), outT: num(crane.outTrans, 8), outL: num(crane.outLong, 8), outEx: num(crane.outEx, 0), tail: num(crane.tail, 5),
    pivX: dr ? dr.pivot[0] : num(crane.pivotX, -1.5), pivH: dr ? dr.pivot[1] : num(crane.pivotH, 3.2), D: b ? Math.max(0.8, b.qb - b.qa) : spec.D, qc: b ? (b.qa + b.qb) / 2 : null,
    paint: crane.tint || !dr ? (crane.color || '#f5c400') : (isLightFill(b?.fill) ? b.fill : '#f2f2f2'), n: spec.n, lens: spec.lens, E: spec.E, foot: spec.foot, head: spec.head, Lmin: spec.Lmin, Lmax: spec.Lmax,
    cwt, cwtR: cmax > 0 ? Math.max(0.25, Math.min(1, cwt / cmax)) : 1, livery, truck: /truck/i.test(crane.type || ''), mat: matDims(plan?.matSize)[0], falls: Math.max(2, Math.round(num(plan?.falls, 4))),
    dr, dkey: dr ? String(crane.drawing || '') : '', ...(sp ? { oTL: sp.yL, oTR: sp.yR } : {}) };
};
C3D.sigOf = (p) => JSON.stringify(p, (k, v) => (k === 'dr' ? (v ? v.label || 1 : 0) : v));

// ---------- renderer shell ----------
C3D.makeRenderer = (host, o = {}) => {
  const r = new THREE.WebGLRenderer({ antialias: !!o.aa, alpha: false, powerPreference: o.power || 'high-performance', preserveDrawingBuffer: !!o.keep });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, o.maxDpr || 1.75));
  r.shadowMap.enabled = !!o.shadows; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = o.exposure || 1.0; r.outputEncoding = THREE.sRGBEncoding;
  r.domElement.style.cssText = 'display:block;width:100%;height:100%'; host.appendChild(r.domElement);
  return r;
};
// free a whole scene (geometry, materials, textures) — the sign-in scene is thrown away completely when the person signs in
C3D.disposeScene = (scene) => { const seen = new Set(); scene.traverse((o) => { if (o.geometry && o.geometry !== C3D._ub && o.geometry !== C3D._uc) o.geometry.dispose(); const ms = [].concat(o.material || []); for (const m of ms) { if (seen.has(m)) continue; seen.add(m); for (const k of ['map', 'emissiveMap', 'alphaMap']) if (m[k]) m[k].dispose(); m.dispose(); } }); if (scene.background && scene.background.dispose) scene.background.dispose(); };

// ---------- HERO: a calm, light scene behind the sign-in — one slim real crane, soft light, a slow drifting camera ----------
// No post-processing, no particles, no per-frame allocation. The pixel ratio is capped (1.5 on a desktop, 1 on a phone), the loop stops while the tab is hidden and
// draws one still frame when the person asks for reduced motion. o: { crane, livery, tone: 'dark' | 'light', reduce, onFirstFrame }
C3D.hero = (host, hud, o = {}) => {
  const light = o.tone === 'light', reduce = !!o.reduce;
  const W0 = () => host.clientWidth || window.innerWidth, H0 = () => host.clientHeight || window.innerHeight;
  const coarse = window.matchMedia('(pointer: coarse)').matches, small = Math.min(W0(), H0()) < 700 || coarse;
  const r = C3D.makeRenderer(host, { aa: true, exposure: light ? 0.96 : 1.06, maxDpr: small ? 1 : 1.5, shadows: true, power: 'default' }); r.shadowMap.autoUpdate = false;
  const P = light ? { top: '#7ea8e4', mid: '#bcd3ef', hor: '#f3e6d4', fog: '#dde4ec', gnd: '#aeb3ba', pad: '#bcc0c5', sun: '#fff0d6', sunI: 1.6, hs: '#cfe0ff', hg: '#8f877c', hI: 0.5, sky: '#7d99c0', bld: '#b4c0d0' }
    : { top: '#0d1b38', mid: '#34528a', hor: '#efb68b', fog: '#566a96', gnd: '#343e51', pad: '#3d4757', sun: '#ffcfa4', sunI: 2.2, hs: '#8fb0ea', hg: '#34302c', hI: 0.78, sky: '#34528a', bld: '#4b5f89' };
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(C3D.lin(P.fog), 140, 1050);
  const env = C3D.envMap(r, light ? 'light' : 'dark'); scene.environment = env.texture;
  const cam = new THREE.PerspectiveCamera(34, W0() / H0(), 1, 3600);
  // sky dome: its horizon colour is the fog colour, so the haze and the sky meet without a seam
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 24, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: C3D.lin(P.top) }, mid: { value: C3D.lin(P.mid) }, hor: { value: C3D.lin(P.hor) }, fogc: { value: C3D.lin(P.fog) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 fogc; varying vec3 vP; void main(){ float h = vP.y; vec3 c = mix(hor, mid, smoothstep(0.0, 0.2, h)); c = mix(c, top, smoothstep(0.15, 0.85, h)); c = mix(c, fogc, 1.0 - smoothstep(0.0, 0.06, h)); gl_FragColor = vec4(c, 1.); \n#include <tonemapping_fragment>\n#include <encodings_fragment>\n }' }));
  sky.renderOrder = -2; sky.frustumCulled = false; scene.add(sky);
  // ground + a lighter pad under the crane
  const ground = new THREE.Mesh(new THREE.CircleGeometry(1400, 48), C3D.mat({ color: P.gnd, roughness: 0.96, metalness: 0 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const pad = new THREE.Mesh(new THREE.CircleGeometry(19, 56), C3D.mat({ color: P.pad, roughness: 0.92 })); pad.rotation.x = -Math.PI / 2; pad.position.y = 0.02; pad.receiveShadow = true; scene.add(pad);
  // a quiet skyline in the haze (one instanced mesh) and two tower cranes
  { const n = 56, im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), C3D.mat({ color: P.bld, roughness: 0.95, metalness: 0 }), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), ax = new THREE.Vector3(0, 1, 0); let s = 7;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, d = 520 + rnd() * 560, hh = 14 + Math.pow(rnd(), 2.4) * 95, w = 18 + rnd() * 30; m4.compose(new THREE.Vector3(Math.cos(a) * d, hh / 2, Math.sin(a) * d - 60), q.setFromAxisAngle(ax, rnd() * 3), new THREE.Vector3(w, hh, w * (0.6 + rnd() * 0.8))); im.setMatrixAt(i, m4); }
    scene.add(im);
    const tm = C3D.mat({ color: light ? '#b79a45' : '#7d6c47', metalness: 0.3, roughness: 0.6 });
    for (const [x, z, h, jl, rot] of [[-150, -230, 60, 56, 0.5], [210, -300, 70, 62, 2.4]]) { const tg = new THREE.Group(); tg.position.set(x, 0, z); scene.add(tg); const mast = C3D.lattice(h, 1.8, 1.8, tm, { bay: 2.4, r: 0.08 }); mast.rotation.z = Math.PI / 2; tg.add(mast);
      const topG = new THREE.Group(); topG.position.y = h + 1; topG.rotation.y = rot; tg.add(topG); topG.add(C3D.lattice(jl, 1.6, 1.3, tm, { bay: 2.2, r: 0.07, taper: 0.4 })); const cj = C3D.lattice(jl * 0.3, 1.4, 1.3, tm, { bay: 2.2, r: 0.07 }); cj.rotation.y = Math.PI; topG.add(cj); } }
  // light: a low sun, a soft sky fill, the studio-ish reflections; the shadow follows the crane only
  scene.add(new THREE.HemisphereLight(C3D.lin(P.hs), C3D.lin(P.hg), P.hI));
  const sun = new THREE.DirectionalLight(C3D.lin(P.sun), P.sunI); sun.position.set(75, 58, -52); sun.target.position.set(-4, 6, 0); sun.castShadow = true; sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 20, far: 220 }); scene.add(sun, sun.target);
  // the crane
  const params = C3D.paramsFor(o.crane, null, null, o.livery || 'FRIENDSHIP HALL EST'); params.falls = 6;
  const g = C3D.buildCrane(params); scene.add(g.root); g.root.rotation.y = 0.1;
  const st = g.state, Lmax = params.Lmin + params.E * (params.n - 1); st.loadSize = [5.4, 0.45, 2.6]; st.rig = 4.4; st.legs = 4; st.slingCol = '#e8731c'; g.load.material = C3D.mat({ color: light ? '#aeb2b6' : '#8e949b', roughness: 0.92 }); g.disp.push(g.load.material);
  const L0 = params.Lmin + (Lmax - params.Lmin) * 0.5, fr0 = (L0 - params.Lmin) / Math.max(1e-6, Lmax - params.Lmin); st.L = L0; st.fr = Array(Math.max(1, params.n - 1)).fill(fr0);
  let raf = 0, alive = true, exit = null, first = true; const t0 = performance.now(); const look = new THREE.Vector3(), camPos = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(); let frame = 0;
  let portrait = false; const fit = () => { const w = W0(), h = H0(); r.setSize(w, h, false); cam.aspect = w / h; cam.fov = w / h < 0.9 ? 46 : 33; portrait = w / h < 0.9;
    if (w >= 900) cam.setViewOffset(w, h, -w * 0.17, 0, w, h); else if (h > w) cam.setViewOffset(w, h, 0, h * 0.33, w, h); else cam.clearViewOffset(); cam.updateProjectionMatrix(); };
  fit(); const onResize = () => { fit(); if (reduce || !raf) draw(performance.now()); }; window.addEventListener('resize', onResize);
  const ease = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  let out = null;
  const draw = (now) => {
    const t = reduce ? 14 : (now - t0) / 1000, k = ease(Math.min(1, t / 5));
    { const lf = portrait ? 0.3 : 0.5; st.L = params.Lmin + (Lmax - params.Lmin) * lf; st.fr.fill(lf); } st.theta = (portrait ? 38 : 50) + 1.6 * Math.sin(t * 0.045); st.slew = 205 + 5 * Math.sin(t * 0.03); out = C3D.pose(g, st, scene);
    st.hookY = Math.max(8, out.tipW.y - (portrait ? 10 : 15) - 2 * (0.5 + 0.5 * Math.sin(t * 0.08)));
    // camera: a slow drift around a low three-quarter view from the cab side, easing in over the first seconds
    const az = -1.12 + 0.13 * Math.sin(t * 0.07) - (1 - k) * 0.12, el = 0.15 + 0.012 * Math.sin(t * 0.05) + (1 - k) * 0.03, dist = (80 + 4 * Math.sin(t * 0.045) + (1 - k) * 14) * (portrait ? 1.25 : 1);
    look.set(-4, portrait ? 9 : 13, 2); camPos.set(look.x + dist * Math.cos(el) * Math.cos(az), look.y + dist * Math.sin(el), look.z + dist * Math.cos(el) * Math.sin(az));
    if (exit) { const e = ease(Math.min(1, (now - exit.t) / 1100)); camPos.lerp(e1.set(out.tipW.x + 14, out.tipW.y - 10, out.tipW.z - 18), e * 0.7); look.lerp(e2.copy(out.tipW), e * 0.8); r.toneMappingExposure = (light ? 0.96 : 1.06) + e * 0.25; if (e >= 1 && exit.done) { const d = exit.done; exit.done = null; d(); } }
    cam.position.copy(camPos); cam.lookAt(look); if (frame++ % 3 === 0) r.shadowMap.needsUpdate = true; r.render(scene, cam);
    if (first) { first = false; o.onFirstFrame && o.onFirstFrame(); }
  };
  // quality governor: if the frames take too long the pixel ratio steps down (it never goes up again — the scene is meant to be calm)
  let ema = 16, prev = 0, nf = 0, dprNow = r.getPixelRatio();
  const loop = (now) => { if (!alive) return; raf = requestAnimationFrame(loop); const dt = prev ? Math.min(250, now - prev) : 16; prev = now; draw(now);
    ema = ema * 0.9 + dt * 0.1; if (++nf % 24 === 0 && !exit) { if (ema > 21 && dprNow > 0.55) { dprNow = Math.max(0.55, dprNow * 0.8); r.setPixelRatio(dprNow); fit(); } else if (ema > 45 && dprNow <= 0.56 && sun.castShadow) { sun.castShadow = false; r.shadowMap.enabled = false; scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); } } };
  const start = () => { if (!raf && alive && !reduce) { prev = 0; raf = requestAnimationFrame(loop); } };
  if (reduce) { r.shadowMap.needsUpdate = true; draw(performance.now()); } else { r.shadowMap.needsUpdate = true; raf = requestAnimationFrame(loop); }
  const vis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else start(); }; document.addEventListener('visibilitychange', vis);
  let io = null; if (typeof IntersectionObserver !== 'undefined') { io = new IntersectionObserver((es) => { if (es[0] && !es[0].isIntersecting) { cancelAnimationFrame(raf); raf = 0; } else if (!document.hidden) start(); }); io.observe(host); }
  return {
    exit(done) { if (reduce) { done && done(); return; } exit = { t: performance.now(), done }; },
    stats: () => ({ calls: r.info.render.calls, tris: r.info.render.triangles, dpr: r.getPixelRatio(), frame: r.info.render.frame }),
    dispose() { alive = false; cancelAnimationFrame(raf); raf = 0; window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', vis); io && io.disconnect();
      try { C3D.disposeCrane(g); C3D.disposeScene(scene); env.dispose(); r.dispose(); r.forceContextLoss(); } catch {} host.innerHTML = ''; }
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
  scene.add(new THREE.HemisphereLight(C3D.lin('#c4d6ee'), C3D.lin('#3a3128'), 0.7)); const envRT = C3D.envMap(r, 'dark'); scene.environment = envRT.texture;
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
  const poseCrane = (gg, res, load, boomHd, carHd) => {
    const geo = res.geo; gg.state.theta = geo.theta || 45; gg.state.slew = boomHd - carHd; gg.state.L = geo.kind === 'main' ? geo.L : geo.Lb; gg.state.fr = res.tele?.fr || gg.state.fr; gg.state.acc = res.acc || {};
    gg.state.jib = geo.kind !== 'main' && geo.Lj ? { len: geo.Lj, angle: geo.gamma } : null;
    gg.state.loadSize = [Math.max(0.6, num(load.l, 2)), Math.max(0.3, num(load.h, 1.5)), Math.max(0.6, num(load.l, 2) * 0.6)]; gg.state.rig = res.rigH || 3;
    { const tk = (load.tackles || []).find(t => t && t.type === 'sling') || (load.tackles || []).find(t => t) || null; let si = null; try { si = typeof SLING_INFO === 'function' && tk ? SLING_INFO(tk) : null; } catch {}
      gg.state.slingCol = (si && (si.colour || si.color)) || '#d13b2a'; let lg = Math.round(num(tk?.legs, 0)); if (!(lg > 0)) { try { lg = typeof slingInfo === 'function' ? num(slingInfo(load)?.legs, 0) : 0; } catch { lg = 0; } } gg.state.legs = Math.max(1, Math.min(4, lg || 4)); }
    gg.state.empty = !!res.empty; gg.state.hookY = res.empty && res.hookY != null ? res.hookY + 0.95 : res.landY + num(load.h, 1.5) + (res.rigH || 3) + 0.95 + 0.5;
    gg.root.rotation.y = carHd * D2R; C3D.pose(gg, gg.state, scene);
  };
  const api = {
    update(plan, calc, crane, livery) {
      const li = Math.min(calc.loads.length - 1, plan.activeLoad || 0), res = calc.loads[li], load = plan.loads[li], geo = res.geo; if (!geo?.tip) return;
      const pp = C3D.paramsFor(crane, plan, calc, livery), s2 = C3D.sigOf(pp);
      if (s2 !== sig) { if (g) { scene.remove(g.root, g.hook, g.rope, g.slings, g.load); C3D.disposeCrane(g); } g = C3D.buildCrane(pp); g._hung = false; scene.add(g.root); sig = s2; }
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
          const pv = rigOf(plan, pk.crane), cr = pk.res.crane || crane; const ppx = C3D.paramsFor(cr, pv, calc, livery), ks = C3D.sigOf(ppx) + '|' + pk.k; seen.add(pk.k);
          let ex = extra.get(pk.k); if (!ex || ex.sig !== ks) { if (ex) { scene.remove(ex.g.root, ex.g.hook, ex.g.rope, ex.g.slings, ex.g.load); C3D.disposeCrane(ex.g); } ex = { sig: ks, g: C3D.buildCrane(ppx) }; ex.g._hung = false; scene.add(ex.g.root); extra.set(pk.k, ex); }
          const bh = normDeg(pk.boomHd + num(pk.mv?.swing)); ex.g.root.position.copy(P2W(pk.base.x, pk.base.y));
          poseCrane(ex.g, pk.res, load, bh, normDeg(bh - (SIDE_OFFSET[sideOf(pk.side)] ?? 0))); ex.g.load.visible = ex.g.slings.visible = false; ex.g.root.visible = ex.g.hook.visible = ex.g.rope.visible = true;
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
        api._auto = { dist: reach * 2.0, az: Math.PI / 2 - phS * D2R - 0.75, el: 0.36, tx: res.R * 0.45 * dir.x, tz: res.R * 0.45 * dir.z, ty: Math.max(6, (geo.tip?.y || 20) * 0.38) }; }
      if (!framed) { Object.assign(to, api._auto); go(!api._shown); framed = true; api._shown = true; }
      dirty = true;
    },
    reframe() { framed = false; dirty = true; },
    look(c) { Object.assign(to, c); go(true); },                                          // put the camera somewhere exact ({ az, el, dist, tx, ty, tz })
    zoom(f) { to.dist = Math.max(12, Math.min(600, to.dist / f)); go(); },
    view(kind) { const a0 = Math.PI / 2 - num(phS) * D2R; if (kind === 'side') { to.az = a0; to.el = 0.04; } else if (kind === 'top') { to.az = a0; to.el = 1.5; } else { to.az = a0 - 0.75; to.el = 0.36; } go(); },
    // move the canvas into another box (full view ↔ the small window); the scene and the WebGL context stay
    mount(h2) { if (!h2 || h2 === host) return; host = h2; h2.appendChild(r.domElement); ro.disconnect(); ro = new ResizeObserver(resize); ro.observe(h2); resize(); dirty = true; },
    host: () => host,
    // a still for the PDF: rendered once at the size asked, then the screen size is put back
    snapshot(w = 1600, h = 1000, auto) { const ow = W0(), oh = H0(), od = dpr, keep = { ...orb }; Object.assign(orb, auto && api._auto ? api._auto : to); applyCam(); r.setPixelRatio(1); r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); r.render(scene, cam); const url = r.domElement.toDataURL('image/jpeg', 0.9); if (auto) { Object.assign(orb, keep); applyCam(); } r.setPixelRatio(od); r.setSize(ow, oh, false); cam.aspect = ow / Math.max(1, oh); cam.updateProjectionMatrix(); dirty = true; return url; },
    stats: () => ({ dpr, ema: Math.round(ema * 10) / 10, calls: r.info.render.calls, tris: r.info.render.triangles, geos: r.info.memory.geometries, tex: r.info.memory.textures }),
    dispose() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', vis); try { C3D.disposeCrane(g); for (const ex of extra.values()) C3D.disposeCrane(ex.g); for (const k of Object.keys(labels)) dropLabel(k); disposeTree(site); C3D.disposeScene(scene); envRT.dispose(); r.dispose(); r.forceContextLoss(); } catch {} r.domElement.remove(); }
  };
  return api;
};
