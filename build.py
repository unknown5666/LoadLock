import re, os, sys
# usage: python build.py        -> dist/index.html (v6 UI)
#        python build.py v7     -> dist/v7.html    (v7 UI)
src = 'src'
rd = lambda p: open(p, encoding='utf-8').read()
strip = lambda s: re.sub(r"\nif \(typeof module[\s\S]*$", "\n", s)
CORE = ['data', 'engine', 'outrig', 'env', 'draw', 'crane2d', 'fixes', 'samples', 'weather', 'three3d', 'scene']
TARGETS = {
    'v6': (CORE + ['wizard', 'login', 'app', 'studio', 'deck', 'pages', 'tour', 'main'], 'shell.html', 'dist/index.html'),
    'v7': (CORE + ['app', 'v7/core', 'v7/ui', 'v7/sheets', 'v7/legs', 'v7/pages', 'v7/login', 'v7/main'], 'v7/shell.html', 'dist/v7.html'),
}
target = sys.argv[1] if len(sys.argv) > 1 else 'v6'
MODULES, SHELL, OUT = TARGETS[target]
js = rd('gen/assets.js') + '\n' + rd('gen/fonts.js') + '\n' + '\n'.join(
    strip(rd(f'{src}/{f}.js')) for f in MODULES if os.path.exists(f'{src}/{f}.js'))
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
os.makedirs('dist', exist_ok=True)
open(OUT, 'w', encoding='utf-8', newline='\n').write(out)
print(OUT, len(out))
if target == 'v7':  # the deployable copy Vercel serves (vercel.json -> outputDirectory: public)
    os.makedirs('public', exist_ok=True)
    open('public/index.html', 'w', encoding='utf-8', newline='\n').write(out)
    print('public/index.html', len(out))
