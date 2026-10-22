// ===== v9 site map: a true-scale satellite picture of the job under the top view =====
// Web-Mercator tiles are stitched into one north-up picture centred on the crane. Its scale comes from the map itself
// (metres per pixel = 156 543.03 · cos(latitude) / 2^zoom for 256-px tiles), so it lands at true size; "Set the scale from two points"
// can still fine-tune it against a distance measured on site. Imagery: Esri World Imagery (no key, credit printed on the picture), or
// Mapbox Satellite when a Mapbox token is saved in Settings. Needs the internet at the moment it is fetched; afterwards it is saved
// with the plan like any client drawing.
const GIS = {
  providers: {
    esri: { name: 'Esri World Imagery', tile: 256, max: 19, credit: 'Imagery © Esri, Maxar, Earthstar Geographics', url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}` },
    mapbox: { name: 'Mapbox Satellite', tile: 512, max: 21, credit: '© Mapbox © Maxar', url: (z, x, y, tok) => `https://api.mapbox.com/v4/mapbox.satellite/${z}/${x}/${y}@2x.jpg90?access_token=${encodeURIComponent(tok || '')}` }
  },
  // metres per pixel of a 256-px tile pyramid at this latitude and zoom
  mpp(lat, z) { return 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z); },
  // fractional tile (x, y) of a point at zoom z
  tileXY(lat, lon, z) { const n = Math.pow(2, z), la = Math.max(-85.0511, Math.min(85.0511, lat)) * Math.PI / 180; return { x: (lon + 180) / 360 * n, y: (1 - Math.log(Math.tan(la) + 1 / Math.cos(la)) / Math.PI) / 2 * n }; },
  // zoom and tile range for a square of `size` metres round (lat, lon) that stays under maxPx pixels across
  layout(lat, lon, size, prov, maxPx = 1800) {
    const P = GIS.providers[prov] || GIS.providers.esri; const k = P.tile / 256;
    let z = P.max; while (z > 1 && size / (GIS.mpp(lat, z) / k) > maxPx) z--;
    const mpp = GIS.mpp(lat, z) / k; const c = GIS.tileXY(lat, lon, z); const halfT = size / 2 / (mpp * P.tile);
    const x0 = Math.floor(c.x - halfT), x1 = Math.floor(c.x + halfT), y0 = Math.floor(c.y - halfT), y1 = Math.floor(c.y + halfT);
    const px = Math.round(size / mpp);
    return { z, mpp, tile: P.tile, c, x0, x1, y0, y1, px, n: (x1 - x0 + 1) * (y1 - y0 + 1) };
  },
  // "24.4539, 54.3773" or "24.4539 54.3773" → { lat, lon }
  parseLatLon(s) { const m = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(String(s || '')); if (!m) return null; const lat = +m[1], lon = +m[2]; return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null; },
  // fetch + stitch (browser): returns { canvas, mpp, w, h, z, credit }
  async fetchMap(lat, lon, size, prov = 'esri', token = '', onProgress) {
    const P = GIS.providers[prov] || GIS.providers.esri; if (prov === 'mapbox' && !token) throw new Error('Add your Mapbox token in Settings first');
    const L = GIS.layout(lat, lon, size, prov); if (L.n > 64) throw new Error('That area is too big — pick a smaller one');
    const cv = document.createElement('canvas'); cv.width = cv.height = L.px; const g = cv.getContext('2d');
    g.fillStyle = '#7d858c'; g.fillRect(0, 0, L.px, L.px);
    const ox = L.px / 2 - (L.c.x - L.x0) * L.tile, oy = L.px / 2 - (L.c.y - L.y0) * L.tile; // canvas position of tile (x0, y0)
    const jobs = []; let done = 0, failed = 0; const n2 = Math.pow(2, L.z);
    for (let ty = L.y0; ty <= L.y1; ty++) for (let tx = L.x0; tx <= L.x1; tx++) {
      jobs.push(new Promise((res) => {
        const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async';
        im.onload = () => { g.drawImage(im, ox + (tx - L.x0) * L.tile, oy + (ty - L.y0) * L.tile, L.tile, L.tile); done++; onProgress?.(done, L.n); res(); };
        im.onerror = () => { failed++; done++; onProgress?.(done, L.n); res(); };
        im.src = P.url(L.z, ((tx % n2) + n2) % n2, ty, token);
      }));
    }
    await Promise.all(jobs);
    if (failed === L.n) throw new Error('The map could not load — check the internet connection');
    // credit + north arrow, burnt into the picture so they travel with it onto the sheet
    const fs = Math.max(11, Math.round(L.px / 90)); g.font = `600 ${fs}px Arial, sans-serif`; const tw = g.measureText(P.credit).width;
    g.fillStyle = 'rgba(255,255,255,.78)'; g.fillRect(L.px - tw - fs * 1.2, L.px - fs * 1.8, tw + fs * 1.2, fs * 1.8); g.fillStyle = '#222'; g.fillText(P.credit, L.px - tw - fs * 0.6, L.px - fs * 0.55);
    const ax = fs * 2.2, ay = fs * 3.6; g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(ax, ay - fs * 0.6, fs * 1.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d70015'; g.beginPath(); g.moveTo(ax, ay - fs * 1.9); g.lineTo(ax + fs * 0.6, ay - fs * 0.2); g.lineTo(ax - fs * 0.6, ay - fs * 0.2); g.closePath(); g.fill();
    g.fillStyle = '#111'; g.font = `800 ${fs}px Arial, sans-serif`; g.textAlign = 'center'; g.fillText('N', ax, ay + fs * 0.75); g.textAlign = 'start';
    return { canvas: cv, mpp: L.mpp, w: L.px, h: L.px, z: L.z, credit: P.credit, failed };
  }
};

if (typeof module !== 'undefined') module.exports = { GIS };
