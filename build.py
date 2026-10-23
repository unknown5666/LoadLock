import re, os, sys
# usage: python build.py        -> dist/index.html (v6 UI)
#        python build.py v7     -> dist/v7.html    (v7 UI)
src = 'src'
rd = lambda p: open(p, encoding='utf-8').read()
strip = lambda s: re.sub(r"\nif \(typeof module[\s\S]*$", "\n", s)
CORE = ['data', 'library', 'engine', 'outrig', 'tandem', 'env', 'draw', 'rigging', 'crane2d', 'fixes', 'samples', 'weather', 'gis', 'three3d', 'scene']
TARGETS = {
    'v6': (CORE + ['wizard', 'login', 'app', 'studio', 'deck', 'pages', 'tour', 'main'], 'shell.html', 'dist/index.html'),
    'v7': (CORE + ['app', 'v7/core', 'v7/ui', 'v7/sheets', 'v7/rigging', 'v7/legs', 'v7/v9', 'v7/rams', 'v7/report', 'v7/risk', 'v7/share', 'v7/pages', 'v7/login', 'v7/main'], 'v7/shell.html', 'dist/v7.html'),
}
target = sys.argv[1] if len(sys.argv) > 1 else 'v6'
MODULES, SHELL, OUT = TARGETS[target]
PRIVATE = os.environ.get('LL_OUT')  # build to a scratch file only (parallel work): no public/ or sw.js
if PRIVATE: OUT = PRIVATE
data_js = rd('gen/assets.js') + '\n' + rd('gen/fonts.js') + '\n'
code_js = '\n'.join(strip(rd(f'{src}/{f}.js')) for f in MODULES if os.path.exists(f'{src}/{f}.js'))
js = data_js + code_js
shell = rd(f'{src}/{SHELL}')
T = 'https://cdn.jsdelivr.net/npm/three@0.147.0'
libs = f'''<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/svg2pdf.js@2.2.4/dist/svg2pdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script src="{T}/build/three.min.js"></script>
<script src="{T}/examples/js/shaders/CopyShader.js"></script>
<script src="{T}/examples/js/shaders/LuminosityHighPassShader.js"></script>
<script src="{T}/examples/js/postprocessing/Pass.js"></script>
<script src="{T}/examples/js/postprocessing/EffectComposer.js"></script>
<script src="{T}/examples/js/postprocessing/RenderPass.js"></script>
<script src="{T}/examples/js/postprocessing/ShaderPass.js"></script>
<script src="{T}/examples/js/postprocessing/UnrealBloomPass.js"></script>
'''
out = shell + '\n' + libs + '<script>\n"use strict";\n' + js + '\n</script>\n'
os.makedirs(os.path.dirname(OUT) or '.', exist_ok=True)
open(OUT, 'w', encoding='utf-8', newline='\n').write(out)
print(OUT, len(out))
if target == 'v7' and not PRIVATE:  # the deployable copy Vercel serves (vercel.json -> outputDirectory: public)
    os.makedirs('public', exist_ok=True)
    # v10: the deployed copy carries scrambled code (tools/protect.js); dist/v7.html stays readable for the tests.
    # LL_PLAIN=1 skips it (debugging the live copy).
    if not os.environ.get('LL_PLAIN'):
        import subprocess, tempfile
        tmp = tempfile.mkdtemp(); cin, cout = os.path.join(tmp, 'in.js'), os.path.join(tmp, 'out.js')
        open(cin, 'w', encoding='utf-8').write(code_js)
        subprocess.run(['node', 'tools/protect.js', cin, cout], check=True)
        out = shell + '\n' + libs + '<script>\n"use strict";\n' + data_js + '\n</script>\n<script>' + open(cout, encoding='utf-8').read() + '</script>\n'
    open('public/index.html', 'w', encoding='utf-8', newline='\n').write(out)
    print('public/index.html', len(out))
    # v9 offline: the service worker caches the app and its pinned libraries; its version follows the build so phones update
    import hashlib, json
    ver = hashlib.sha1(out.encode('utf-8')).hexdigest()[:12]
    cdn = re.findall(r'<script src="(https://[^"]+)"', out) + re.findall(r'<link rel="stylesheet" href="(https://[^"]+)"', out)
    sw = rd('src/v7/sw.js').replace('__VER__', ver).replace('__CDN__', json.dumps(cdn))
    open('public/sw.js', 'w', encoding='utf-8', newline='\n').write(sw)
    print('public/sw.js', ver, len(cdn), 'libraries')
