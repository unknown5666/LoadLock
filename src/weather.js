// ===== Weather: Open-Meteo forecast for the lift location (wind by height, gusts, rain, storms) =====
const WX = {
  GEO: 'https://geocoding-api.open-meteo.com/v1/search',
  API: 'https://api.open-meteo.com/v1/forecast',
  blocked: false,
  async getJSON(url, ms = 12000) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null; const t = setTimeout(() => ctl && ctl.abort(), ms);
    try { const r = await fetch(url, ctl ? { signal: ctl.signal } : {}); if (!r.ok) throw new Error('Forecast service answered ' + r.status); return await r.json(); }
    catch (e) { if (e && (e.name === 'TypeError' || /fetch|network|load failed|content security/i.test(e.message || ''))) { WX.blocked = true; const err = new Error('blocked'); err.blocked = true; throw err; } throw e; }
    finally { clearTimeout(t); }
  },
  parseLatLon(q) { const m = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(q || ''); if (!m) return null; const lat = +m[1], lon = +m[2]; return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon, name: `${lat.toFixed(4)}, ${lon.toFixed(4)}` } : null; },
  async geocode(q) {
    const ll = WX.parseLatLon(q); if (ll) return [{ name: ll.name, lat: ll.lat, lon: ll.lon, sub: 'Coordinates' }];
    const d = await WX.getJSON(`${WX.GEO}?name=${encodeURIComponent(String(q).trim())}&count=8&language=en&format=json`);
    return (d.results || []).map(r => ({ name: r.name, lat: r.latitude, lon: r.longitude, sub: [r.admin2, r.admin1, r.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', '), tz: r.timezone, elev: r.elevation }));
  },
  async forecast(lat, lon) {
    const vars = 'wind_speed_10m,wind_speed_80m,wind_speed_120m,wind_speed_180m,wind_gusts_10m,wind_direction_10m,precipitation_probability,precipitation,weather_code,temperature_2m';
    const d = await WX.getJSON(`${WX.API}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=${vars}&wind_speed_unit=ms&timezone=auto&forecast_days=16`);
    const H = d.hourly || {}; const r1 = (a) => (a || []).map(v => v == null ? null : Math.round(v * 10) / 10);
    return { tz: d.timezone || '', hourly: { time: H.time || [], ws10: r1(H.wind_speed_10m), ws80: r1(H.wind_speed_80m), ws120: r1(H.wind_speed_120m), ws180: r1(H.wind_speed_180m), gust10: r1(H.wind_gusts_10m), dir: (H.wind_direction_10m || []).map(v => v == null ? null : Math.round(v)), pp: H.precipitation_probability || [], pr: r1(H.precipitation), code: H.weather_code || [], temp: r1(H.temperature_2m) } };
  },
  windyUrl(lat, lon) { return `https://www.windy.com/?${lat.toFixed(3)},${lon.toFixed(3)},11`; },
  dirName(d) { if (d == null) return ''; return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((d % 360) + 360) % 360 / 45) % 8]; },
  icon(code, size = 16) { // tiny line icons
    const c = num(code, -1); const p = c >= 95 ? 'M7 17l3-5H7l3-5M5 12a5 5 0 0 1 9-3 4 4 0 0 1 3 7' : c >= 51 ? 'M6 14a5 5 0 0 1 9-4 4 4 0 0 1 3 6H6zM8 18l-1 2M12 18l-1 2M16 18l-1 2' : c >= 45 ? 'M4 10h16M6 14h12M4 18h16' : c >= 2 ? 'M6 16a5 5 0 0 1 9-4 4 4 0 0 1 3 6H7a3 3 0 0 1-1-2z' : 'M12 7a5 5 0 1 0 0.01 0M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2';
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${p}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  },
  days(W) { const t = W?.hourly?.time || []; return [...new Set(t.map(s => s.slice(0, 10)))]; },
  // hourly chart for one day: rain bars, wind at tip line, gusts line, permitted limit, lift window
  chart(W, tipH, opts = {}) {
    const H = W?.hourly; if (!H || !H.time?.length) return '';
    const day = W.date || H.time[0].slice(0, 10); const idx = H.time.map((t, i) => [t, i]).filter(([t]) => t.slice(0, 10) === day).map(([, i]) => i);
    if (!idx.length) return '<p class="hint">No forecast for that date — Open-Meteo covers the next 16 days.</p>';
    const w = 640, hgt = 190, l = 34, r = 10, t = 14, b = 26; const cw = (w - l - r) / 24;
    const rows = idx.map(i => { const wt = windAt(tipH, H.ws10[i], H.ws80[i], H.ws120[i], H.ws180[i]); const gt = H.gust10[i] != null && H.ws10[i] > 0.2 ? H.gust10[i] * (wt / H.ws10[i]) : H.gust10[i]; return { h: num(H.time[i].slice(11, 13)), wt, gt, pp: H.pp[i], code: H.code[i] }; });
    const lim = num(W.limit, 9); const vmax = Math.max(lim * 1.25, ...rows.map(x => x.gt || 0), ...rows.map(x => x.wt || 0)) * 1.08;
    const Y = (v) => t + (hgt - t - b) * (1 - v / vmax), X = (hh) => l + hh * cw;
    const st = num(String(W.start || '07:00').split(':')[0], 7), hrs = Math.max(1, num(W.hours, 4));
    const out = [`<svg class="wxchart" viewBox="0 0 ${w} ${hgt}" role="img" aria-label="Hourly wind and rain forecast">`];
    out.push(`<rect x="${X(st)}" y="${t - 6}" width="${Math.min(24 - st, hrs) * cw}" height="${hgt - t - b + 6}" class="wx-win"/>`);
    for (let v = 0; v <= vmax; v += vmax > 24 ? 10 : 4) out.push(`<line x1="${l}" x2="${w - r}" y1="${Y(v)}" y2="${Y(v)}" class="wx-grid"/><text x="${l - 6}" y="${Y(v) + 3.5}" class="wx-ax" text-anchor="end">${v}</text>`);
    rows.forEach(x => { const ph = (hgt - t - b) * (num(x.pp) / 100); out.push(`<rect x="${X(x.h) + 2}" y="${hgt - b - ph}" width="${cw - 4}" height="${ph}" class="wx-rain${x.code >= 95 ? ' storm' : ''}"><title>${String(x.h).padStart(2, '0')}:00 · rain ${num(x.pp)}%</title></rect>`); });
    out.push(`<line x1="${l}" x2="${w - r}" y1="${Y(lim)}" y2="${Y(lim)}" class="wx-lim"/><text x="${w - r - 2}" y="${Y(lim) - 4}" class="wx-ax lim" text-anchor="end">LIMIT ${lim} m/s</text>`);
    const line = (k) => rows.filter(x => x[k] != null).map((x, i) => `${i ? 'L' : 'M'}${(X(x.h) + cw / 2).toFixed(1)} ${Y(x[k]).toFixed(1)}`).join('');
    out.push(`<path d="${line('gt')}" class="wx-gust"/><path d="${line('wt')}" class="wx-wind"/>`);
    rows.forEach(x => { if (x.wt != null) out.push(`<circle cx="${X(x.h) + cw / 2}" cy="${Y(x.wt)}" r="2.2" class="wx-dot${x.gt > lim ? ' over' : ''}"><title>${String(x.h).padStart(2, '0')}:00 · wind ${x.wt.toFixed(1)} · gust ${num(x.gt).toFixed(1)} m/s at ${Math.round(tipH)} m</title></circle>`); });
    for (let hh = 0; hh < 24; hh += 3) out.push(`<text x="${X(hh) + cw / 2}" y="${hgt - 8}" class="wx-ax" text-anchor="middle">${String(hh).padStart(2, '0')}</text>`);
    if (opts.pick) for (let hh = 0; hh < 24; hh++) out.push(`<rect x="${X(hh)}" y="${t - 6}" width="${cw}" height="${hgt - t - b + 6}" fill="transparent" data-wxh="${hh}" class="wx-hit"><title>Start the lift at ${String(hh).padStart(2, '0')}:00</title></rect>`);
    out.push('</svg>');
    return out.join('');
  }
};
