// FHE Lift Planner — offline cache. Written into public/sw.js by build.py (the version changes with every build, so phones take new
// releases on the next visit). The app page: network first (4 s), the cached copy when there is no signal. The pinned libraries and
// fonts: cache first. Map tiles and weather are never cached here — they need the internet when asked for.
const VER = 'fb665ec78a85', CACHE = 'fhe-lp-' + VER, CDN = ["https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js", "https://cdn.jsdelivr.net/npm/svg2pdf.js@2.2.4/dist/svg2pdf.umd.min.js", "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js", "https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js", "https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/shaders/CopyShader.js", "https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/shaders/LuminosityHighPassShader.js", "https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/postprocessing/Pass.js", "https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/postprocessing/EffectComposer.js", "https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/postprocessing/RenderPass.js", "https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/postprocessing/ShaderPass.js", "https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/postprocessing/UnrealBloomPass.js", "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"];
const keep = (req, res) => caches.open(CACHE).then(c => c.put(req, res)).catch(() => {});
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(['/', ...CDN].map(u => fetch(u, { mode: u.startsWith('http') ? 'cors' : 'same-origin', cache: 'reload' }).then(r => (r.ok ? c.put(u, r) : null)).catch(() => null)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => { for (const k of await caches.keys()) if (k.startsWith('fhe-lp-') && k !== CACHE) await caches.delete(k); await self.clients.claim(); })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (req.mode === 'navigate' && u.origin === self.location.origin) {
    e.respondWith((async () => {
      const net = fetch(req).then(r => { if (r.ok) keep('/', r.clone()); return r; });
      try { return await Promise.race([net, new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))]); }
      catch { return (await caches.match('/')) || net; }
    })());
    return;
  }
  if (/^(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === 'opaque') keep(req, r.clone()); return r; })));
  }
});
