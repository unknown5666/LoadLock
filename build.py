import re, os
src = 'src'
strip = lambda s: re.sub(r"\nif \(typeof module[\s\S]*$", "\n", s)
MODULES = ['data', 'engine', 'env', 'draw', 'crane2d', 'samples', 'weather', 'three3d', 'scene', 'wizard', 'login', 'app', 'studio', 'deck', 'pages', 'tour', 'main']
js = open('gen/assets.js').read() + '\n' + open('gen/fonts.js').read() + '\n' + '\n'.join(
    strip(open(f'{src}/{f}.js').read()) for f in MODULES if os.path.exists(f'{src}/{f}.js'))
shell = open(f'{src}/shell.html').read()
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
open('dist/index.html', 'w').write(out)
print(len(out))
