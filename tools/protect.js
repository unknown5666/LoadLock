// Scrambles the app code for the deployed copy (public/index.html) so it can't be read or lifted.
// usage: node tools/protect.js <in.js> <out.js>   (in = the concatenated src modules, no data)
// The code is wrapped in one closure so every top-level name is private and gets renamed, then
// minified (terser) and obfuscated (string table, renamed identifiers). dist/v7.html stays readable for tests.
const fs = require('fs');
const { minify } = require('terser');
const JO = require('javascript-obfuscator');
(async () => {
  const [, , inp, out] = process.argv;
  const src = '(function(){"use strict";\n' + fs.readFileSync(inp, 'utf8') + '\n})();';
  const min = await minify(src, { ecma: 2020, compress: { passes: 2 }, mangle: true, format: { comments: false } });
  if (min.error) throw min.error;
  const ob = JO.obfuscate(min.code, {
    compact: true, target: 'browser', seed: 1066,
    identifierNamesGenerator: 'mangled-shuffled', renameGlobals: false,
    stringArray: true, stringArrayEncoding: ['base64'], stringArrayThreshold: 0.75,
    stringArrayRotate: true, stringArrayShuffle: true, stringArrayIndexShift: true,
    stringArrayWrappersCount: 2, stringArrayWrappersType: 'function',
    splitStrings: false, controlFlowFlattening: false, deadCodeInjection: false,
    selfDefending: false, debugProtection: false, transformObjectKeys: false,
    numbersToExpressions: false, simplify: true, unicodeEscapeSequence: false,
  });
  fs.writeFileSync(out, ob.getObfuscatedCode());
  console.log('protected', src.length, '→', fs.statSync(out).size, 'bytes');
})().catch(e => { console.error(e); process.exit(1); });
