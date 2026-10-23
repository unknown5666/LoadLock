#!/usr/bin/env python3
"""Rewrite the LIB_CHARTS block of src/data.js from the extracted chart texts (all_charts.json written by gen_all.py).

    python3 pipeline/library/extract/inject_data_js.py chart_out/all_charts.json [src/data.js]

The block starts at the "v10: charts from the crane library" comment and ends at the loop that appends LIB_CHARTS to DEFAULT_CRANES,
so running it again replaces the block instead of duplicating it. Charts are only ever appended after a crane's own charts (saved plans store a chart number).
"""
import json, sys, os
ORDER = ['stc1000', 'ztc1000v', 'sac2600', 'zat4000v', 'ac100', 'ac500', 'ac700']
START = '// ---------- v10: charts from the crane library (UNVERIFIED) ----------'
END = 'for (const c of DEFAULT_CRANES) if (LIB_CHARTS[c.id]) c.charts = (c.charts || []).concat(LIB_CHARTS[c.id]);\n'
HEAD = """// Gap fillers transcribed from the manufacturers' tables in the LoadLock Crane Library (see src/library.js for the public links, pipeline/library/README.md for how).
// Every one is verify:true, so a plan that uses it shows the "Check this chart" warning and the sheet prints it. source = the library PDF and page.
// Appended after each crane's own charts, so saved plans (which store a chart number) keep pointing at the same chart.
// Values are in tonnes, copied as printed; "-" = the maker's table has no value there (including cells the maker marks for another boom length or over-rear only).
// Gaps this fills: STC1000 (21.5 t chart only covers 13-26 m booms), ZTC1000V (51-70 m only), SAC2600 (62.5-71.3 m only), ZAT4000V (77-90 m only), AC100 / AC500 (no main-boom chart),
// plus more counterweights for the AC700. Not added: LTM1650 (its tables colour-code the ballast set-up per cell - see pipeline/library/README.md).
const LIB_CHARTS = {"""

def main():
    src = sys.argv[1]; dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', '..', '..', 'src', 'data.js')
    a = json.load(open(src)); L = [START, HEAD]
    for i, c in enumerate(ORDER):
        L.append('  %s: [' % c)
        for j, ch in enumerate(a[c]):
            f = ['id:%s' % json.dumps(ch['id']), 'name:%s' % json.dumps(ch['name'], ensure_ascii=False), "kind:'main'", 'config:%s' % json.dumps(ch['config']), 'cwt:%s' % json.dumps(ch['cwt'])]
            if ch.get('outrigger'): f.append('outrigger:%s' % json.dumps(ch['outrigger']))
            f.append('verify:true')
            L.append('    { ' + ', '.join(f) + ',')
            L.append('      source:%s,' % json.dumps(ch['source'], ensure_ascii=False))
            L.append('      src:`' + ch['src'] + '` }' + (',' if j < len(a[c]) - 1 else ''))
        L.append('  ]' + (',' if i < len(ORDER) - 1 else ''))
    L.append('};'); L.append(END.rstrip('\n')); block = '\n'.join(L) + '\n'
    s = open(dst, encoding='utf-8').read()
    i = s.index(START); j = s.index(END) + len(END)
    open(dst, 'w', encoding='utf-8').write(s[:i] + block + s[j:])
    print('LIB_CHARTS block rewritten in', dst, '(%d chars)' % len(block))

if __name__ == '__main__': main()
