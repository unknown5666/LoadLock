// ===== Client drawings: DXF / PDF / image import, scale, storage =====
const ENV_CACHE = {};
const CDN = {
  dxf: 'https://cdn.jsdelivr.net/npm/dxf-parser@1.1.2/dist/dxf-parser.js',
  pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
};
const _scripts = {};
function loadScript(url) {
  if (_scripts[url]) return _scripts[url];
  return (_scripts[url] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = url; s.onload = res; s.onerror = () => { delete _scripts[url]; rej(new Error('Could not load ' + url.split('/').pop() + ' — check the connection')); }; document.head.appendChild(s); }));
}
const UNITS = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048 };
const INSUNITS = { 1: 'in', 2: 'ft', 4: 'mm', 5: 'cm', 6: 'm' };

function aciRGB(i) {
  const base = { 1: '#ff0000', 2: '#ffff00', 3: '#00ff00', 4: '#00ffff', 5: '#0000ff', 6: '#ff00ff', 7: '#000000', 8: '#808080', 9: '#c0c0c0', 250: '#333333', 251: '#505050', 252: '#696969', 253: '#828282', 254: '#bebebe', 255: '#ffffff' };
  return base[i] || '#5a5a5a';
}
function paperColor(hex) { // light/yellow CAD colours are unreadable on white paper
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || ''); if (!m) return '#555555';
  let [r, g, b] = [1, 2, 3].map(i => parseInt(m[i], 16)); const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum > 165) { const f = 130 / lum; r = Math.round(r * f); g = Math.round(g * f); b = Math.round(b * f); }
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ---- DXF → polylines in drawing units (block references expanded) ----
async function parseDXF(text) {
  await loadScript(CDN.dxf);
  const DP = window.DxfParser && (window.DxfParser.default || window.DxfParser);
  if (!DP) throw new Error('The DXF reader did not load');
  let dxf; try { dxf = new DP().parseSync(text); } catch (e) { throw new Error('Not a readable DXF (' + (e.message || e) + '). Save it from AutoCAD as DXF (any version) and try again.'); }
  const layers = (dxf.tables && dxf.tables.layer && dxf.tables.layer.layers) || {};
  const blocks = dxf.blocks || {};
  const out = [], texts = [], layerCount = {};
  let budget = 800000;
  const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  const ap = (M, x, y) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];
  const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');
  const colorOf = (e, parent) => {
    const lay = layers[e.layer] || {};
    if (e.colorIndex === 0) return parent || '#000000';
    if (e.colorIndex == null || e.colorIndex === 256) return lay.color != null ? hex(lay.color) : aciRGB(lay.colorIndex);
    return e.color != null ? hex(e.color) : aciRGB(e.colorIndex);
  };
  const push = (layer, col, pts) => { if (pts.length < 2 || budget <= 0) return; budget -= pts.length; layerCount[layer] = (layerCount[layer] || 0) + 1; out.push({ layer, col: paperColor(col), pts }); };
  const arcPts = (M, cx, cy, r, a0, a1) => { while (a1 <= a0) a1 += Math.PI * 2; const n = Math.max(6, Math.min(72, Math.ceil((a1 - a0) / (Math.PI / 24)))); const pts = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(ap(M, cx + r * Math.cos(a), cy + r * Math.sin(a))); } return pts; };
  const walk = (ents, M, parentCol, layerOverride, depth) => {
    for (const e of ents || []) {
      if (budget <= 0) return;
      const layer = (e.layer === '0' && layerOverride) ? layerOverride : (e.layer || '0');
      const lay = layers[e.layer]; if (lay && (lay.visible === false || lay.frozen)) continue;
      const col = colorOf(e, parentCol);
      switch (e.type) {
        case 'LINE': if (e.vertices) push(layer, col, e.vertices.map(v => ap(M, v.x, v.y))); break;
        case 'LWPOLYLINE': case 'POLYLINE': {
          const vs = e.vertices || []; const pts = []; const closed = !!e.shape;
          for (let i = 0; i < vs.length; i++) {
            const v = vs[i]; pts.push(ap(M, v.x, v.y));
            const w = vs[i + 1] || (closed ? vs[0] : null);
            if (v.bulge && w) { // arc segment
              const th = 4 * Math.atan(v.bulge), dx = w.x - v.x, dy = w.y - v.y, c = Math.hypot(dx, dy);
              if (c > 0) {
                const d = c / (2 * Math.tan(th / 2)), cx = (v.x + w.x) / 2 - d * dy / c, cy = (v.y + w.y) / 2 + d * dx / c, r = Math.hypot(v.x - cx, v.y - cy);
                const a0 = Math.atan2(v.y - cy, v.x - cx), steps = Math.max(3, Math.ceil(Math.abs(th) / (Math.PI / 18)));
                for (let s = 1; s < steps; s++) { const a = a0 + th * s / steps; pts.push(ap(M, cx + r * Math.cos(a), cy + r * Math.sin(a))); }
              }
            }
          }
          if (closed && vs.length) pts.push(ap(M, vs[0].x, vs[0].y));
          push(layer, col, pts); break;
        }
        case 'CIRCLE': push(layer, col, arcPts(M, e.center.x, e.center.y, e.radius, 0, Math.PI * 2)); break;
        case 'ARC': push(layer, col, arcPts(M, e.center.x, e.center.y, e.radius, e.startAngle, e.endAngle)); break;
        case 'ELLIPSE': {
          const mx = e.majorAxisEndPoint.x, my = e.majorAxisEndPoint.y, a = Math.hypot(mx, my), b = a * e.axisRatio, rot = Math.atan2(my, mx);
          let s0 = e.startAngle || 0, s1 = e.endAngle || Math.PI * 2; while (s1 <= s0) s1 += Math.PI * 2;
          const pts = []; for (let i = 0; i <= 48; i++) { const t = s0 + (s1 - s0) * i / 48, x = a * Math.cos(t), y = b * Math.sin(t); pts.push(ap(M, e.center.x + x * Math.cos(rot) - y * Math.sin(rot), e.center.y + x * Math.sin(rot) + y * Math.cos(rot))); }
          push(layer, col, pts); break;
        }
        case 'SPLINE': { const cp = e.fitPoints && e.fitPoints.length > 1 ? e.fitPoints : (e.controlPoints || []); push(layer, col, cp.map(v => ap(M, v.x, v.y))); break; }
        case 'SOLID': case '3DFACE': { const p = e.points || e.vertices || []; if (p.length >= 3) push(layer, col, [...p, p[0]].map(v => ap(M, v.x, v.y))); break; }
        case 'TEXT': case 'MTEXT': {
          const pos = e.startPoint || e.position; if (!pos || !e.text) break;
          const p = ap(M, pos.x, pos.y), sc = Math.hypot(M[0], M[1]);
          const str = String(e.text).replace(/\\P/gi, ' ').replace(/\\[A-Za-z][^;\\]*;/g, '').replace(/[{}]/g, '').replace(/%%[cC]/g, 'Ø').replace(/%%[dD]/g, '°').replace(/%%[pP]/g, '±').trim();
          if (str) texts.push([p[0], p[1], (e.textHeight || e.height || 2.5) * sc, (e.rotation || 0) + Math.atan2(M[1], M[0]) * 180 / Math.PI, str.slice(0, 80), paperColor(col), layer]);
          break;
        }
        case 'INSERT': case 'DIMENSION': {
          if (depth > 7) break; const bk = blocks[e.name || e.block]; if (!bk) break;
          if (e.type === 'DIMENSION') { walk(bk.entities, M, col, layer, depth + 1); break; }
          const pos = e.position || { x: 0, y: 0 }, r = (e.rotation || 0) * Math.PI / 180, sx = e.xScale || 1, sy = e.yScale || 1, bp = bk.position || { x: 0, y: 0 };
          const L = mul([Math.cos(r) * sx, Math.sin(r) * sx, -Math.sin(r) * sy, Math.cos(r) * sy, pos.x, pos.y], [1, 0, 0, 1, -bp.x, -bp.y]);
          walk(bk.entities, mul(M, L), col, layer, depth + 1); break;
        }
      }
    }
  };
  walk(dxf.entities, [1, 0, 0, 1, 0, 0], null, null, 0);
  const units = INSUNITS[dxf.header && dxf.header.$INSUNITS] || 'mm';
  return { items: out, texts, layerCount, units, truncated: budget <= 0 };
}
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [i0, i1] = stack.pop(); const [x1, y1] = pts[i0], [x2, y2] = pts[i1]; const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    let md = -1, mi = -1;
    for (let i = i0 + 1; i < i1; i++) { const d = L > 1e-12 ? Math.abs(dx * (pts[i][1] - y1) - dy * (pts[i][0] - x1)) / L : Math.hypot(pts[i][0] - x1, pts[i][1] - y1); if (d > md) { md = d; mi = i; } }
    if (md > eps) { keep[mi] = 1; stack.push([i0, mi], [mi, i1]); }
  }
  return pts.filter((_, i) => keep[i]);
}
// compact geometry: palette + integer coords (q drawing-units per step) relative to bbox min
function packGeom(parsed, keepLayers, region) {
  const inR = (x, y) => !region || (x >= region.x0 && x <= region.x1 && y >= region.y0 && y <= region.y1);
  const items = parsed.items.filter(it => (!keepLayers || keepLayers.has(it.layer)) && (!region || it.pts.some(p => inR(p[0], p[1]))));
  const texts = parsed.texts.filter(t => (!keepLayers || keepLayers.has(t[6])) && inR(t[0], t[1]));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const it of items) for (const [x, y] of it.pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  if (!isFinite(x0)) throw new Error('Nothing to draw on the chosen layers');
  const diag = Math.hypot(x1 - x0, y1 - y0) || 1, eps = diag / 6000, q = diag / 300000;
  const pal = [], pi = new Map(); const ci = (c) => { if (!pi.has(c)) { pi.set(c, pal.length); pal.push(c); } return pi.get(c); };
  const polys = []; let npts = 0;
  for (const it of items) {
    const p = rdp(it.pts, eps); if (p.length < 2) continue;
    let ax = Infinity, bx = -Infinity, ay = Infinity, by = -Infinity; for (const [x, y] of p) { if (x < ax) ax = x; if (x > bx) bx = x; if (y < ay) ay = y; if (y > by) by = y; }
    if (bx - ax + by - ay < eps * 0.5) continue;
    const flat = []; for (const [x, y] of p) flat.push(Math.round((x - x0) / q), Math.round((y - y0) / q));
    polys.push([ci(it.col), flat]); npts += p.length;
  }
  const tx = texts.map(t => [Math.round((t[0] - x0) / q), Math.round((t[1] - y0) / q), +(t[2] / q).toFixed(1), Math.round(t[3]), t[4], ci(t[5])]);
  return { q, polys, texts: tx, pal, bbox: [0, 0, Math.round((x1 - x0) / q), Math.round((y1 - y0) / q)], npts, org: [x0, y0] };
}

// ---- PDF / image → raster ----
async function openPdf(file) {
  await loadScript(CDN.pdfWorker); await loadScript(CDN.pdf);
  const lib = window.pdfjsLib; if (!lib) throw new Error('The PDF reader did not load');
  lib.GlobalWorkerOptions.workerSrc = CDN.pdfWorker;
  const data = new Uint8Array(await file.arrayBuffer());
  return await lib.getDocument({ data, isEvalSupported: false, useSystemFonts: true }).promise;
}
async function renderPdfPage(pdf, n, maxPx = 4000) {
  const page = await pdf.getPage(n); const vp1 = page.getViewport({ scale: 1 });
  const scale = Math.min(maxPx / Math.max(vp1.width, vp1.height), 6); const vp = page.getViewport({ scale });
  const cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
  const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
  await page.render({ canvasContext: cx, viewport: vp }).promise;
  return { canvas: cv, w: cv.width, h: cv.height, mmPerPx: (25.4 / 72) / scale, paper: [vp1.width * 25.4 / 72, vp1.height * 25.4 / 72] };
}
async function imageToCanvas(file, maxPx = 4000) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Not a readable image')); i.src = url; });
    const s = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * s); cv.height = Math.round(img.naturalHeight * s);
    const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
    return { canvas: cv, w: cv.width, h: cv.height, srcScale: s };
  } finally { URL.revokeObjectURL(url); }
}
function shrinkCanvas(cv, maxPx) { if (Math.max(cv.width, cv.height) <= maxPx) return cv; const s = maxPx / Math.max(cv.width, cv.height); const c2 = document.createElement('canvas'); c2.width = Math.round(cv.width * s); c2.height = Math.round(cv.height * s); c2.getContext('2d').drawImage(cv, 0, 0, c2.width, c2.height); return c2; }
function canvasBlob(cv, q = 0.85) { return new Promise((res) => cv.toBlob(res, 'image/jpeg', q)); }

// ---- env record helpers ----
function envScaleFrom(e) {
  if (e.kind === 'dxf') return num(e.q, 1) * (UNITS[e.unit] || 0.001);
  if (e.kind === 'pdf') return num(e.mmPerPx, 0.1) * num(e.N, 100) / 1000;
  return num(e.sc, 0.02);
}
function envLocalSize(e) { const g = ENV_CACHE[e.id]; if (!g) return null; return g.img ? [g.w, g.h] : [g.bbox[2], g.bbox[3]]; }
function envWorldToLocal(e, X, Y) { const r = -num(e.rot, 0) * D2R, sc = num(e.sc, 0.001), dx = (X - num(e.x)) / sc, dy = (Y - num(e.y)) / sc; return [dx * Math.cos(r) - dy * Math.sin(r), dx * Math.sin(r) + dy * Math.cos(r)]; }
function envCenterAt(e, X, Y) { // move so its centre sits on (X,Y)
  const s = envLocalSize(e); if (!s) return; const f = envXf({ ...e, x: 0, y: 0 }); const c = f(s[0] / 2, s[1] / 2); e.x = r2(X - c[0]); e.y = r2(Y - c[1]);
}
async function ensureEnvLoaded(plan) {
  const jobs = [];
  for (const e of plan.env || []) {
    if (ENV_CACHE[e.id]) continue;
    if (e.data) { ENV_CACHE[e.id] = e.data; continue; }
    if (e.dataUrl) { ENV_CACHE[e.id] = { img: e.dataUrl, w: e.w, h: e.h }; continue; }
    if (e.assetId) {
      if (e.kind === 'dxf') jobs.push(fetch('/_blob/' + e.assetId).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(g => { ENV_CACHE[e.id] = g; }).catch(() => { e.missing = true; }));
      else ENV_CACHE[e.id] = { img: '/_blob/' + e.assetId, w: e.w, h: e.h };
    }
  }
  if (jobs.length) await Promise.all(jobs);
  return jobs.length > 0;
}
// persist geometry: shared asset store when available, otherwise inline in the plan
async function persistEnv(e, payload, assets) {
  if (assets) {
    try {
      const blob = payload.blob || new Blob([JSON.stringify(payload.geom)], { type: 'application/json' });
      const r = await assets.upload(blob); e.assetId = r.id; delete e.data; delete e.dataUrl; return 'asset';
    } catch (err) { /* fall through to inline */ }
  }
  if (payload.geom) { e.data = payload.geom; return JSON.stringify(payload.geom).length > 2.5e6 ? 'inline-big' : 'inline'; }
  if (payload.canvas) { const cv = shrinkCanvas(payload.canvas, 2200); e.dataUrl = cv.toDataURL('image/jpeg', 0.8); const f = cv.width / e.w; e.sc = num(e.sc) / f; if (e.mmPerPx) e.mmPerPx /= f; e.w = cv.width; e.h = cv.height; ENV_CACHE[e.id] = { img: e.dataUrl, w: e.w, h: e.h }; return 'inline'; }
  return 'none';
}
