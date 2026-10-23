#!/usr/bin/env python3
"""Generate src/library.js (const CRANE_LIBRARY) from the LoadLock Crane Library manifest.

    python3 pipeline/library/gen_library.py "/path/to/LoadLock Crane Library/manifest.json" [src/library.js]

Only metadata goes in: a display name, the publisher, the PUBLIC source URL and (CAD only) how close the drawing is to
the crane. No local paths, no file contents. Shape (other modules read CRANE_LIBRARY[crane.id]?.docs):
    CRANE_LIBRARY[id] = { folder, docs: [{ kind:'chart'|'cad'|'spec', name, source, url, match? }] }
      kind   chart = load chart / technical data / datasheet, spec = brochure / spec sheet, cad = DWG drawing
      source publisher label (e.g. 'Cranepedia', 'Bigge', 'CADforum')
      url    public link to the document (or its download page)
      match  CAD only: 'exact' | 'variant' | 'nearest' | 'collection'
      login  true when the link needs a free account (CADforum members)
"""
import json, re, sys, os

PROVIDERS = ['Cranepedia', 'CADforum', 'DWGmodels', 'Bigge', 'Nordic Crane', 'Superior Rigging', 'Felbermayr', 'Skaks',
             'Schmidbauer', 'BKL', 'Maxim', 'Mammoet', 'JPW Terex', 'Wagenborg', 'Universal Cranes', 'Sarens',
             'Antbuildz', 'Hueffermann', 'Tiong Woon', 'Liebherr asset', 'SANY official']
PROV_LABEL = {'Liebherr asset': 'Liebherr', 'SANY official': 'SANY', 'JPW Terex': 'JPW (Terex)'}

def provider_of(label):
    for p in sorted(PROVIDERS, key=len, reverse=True):
        if label.startswith(p):
            return p
    return None

def clean_name(label, prov):
    t = label
    if prov and t.startswith(prov):
        t = t[len(prov):].lstrip(' -')
    if prov == 'Cranepedia' and ' - ' in t:           # "Liebherr LTM 1160-5.2 - LTM 1160-5.2 | Technical Data" -> second half
        t = t.split(' - ', 1)[1]
    t = t.replace(' | ', ' · ').strip()
    return t or label

def kind_of(f, name):
    if f['category'] == 'cad':
        return 'cad'
    n = name.lower()
    if 'load chart' in n:
        return 'chart'
    if re.search(r'brochure|advantages|spec sheet|product guide|catalogue|specs?$', n):
        return 'spec'
    pages = f.get('pages') or 0
    return 'spec' if (pages and pages <= 12) else 'chart'

def main():
    man = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'library.js')
    m = json.load(open(man))
    lib = {}; models = {}
    for c in m['cranes']:
        lib[c['crane_id']] = {'folder': c['folder'], 'docs': [], '_seen': set()}
        models[c['crane_id']] = c['model']
    def add(cid, d):
        e = lib[cid]
        d = dict(d)
        base = re.sub(r'[\s\-_/]', '', models[cid].split('-')[0]).lower()          # LTM1160-5.2 -> ltm1160
        if d['kind'] != 'cad' and (base not in re.sub(r'[\s\-_/]', '', d['name']).lower() or d['name'].startswith('(')):
            d['name'] = models[cid].split('-')[0] + ' ' + d['name']          # "spec sheet" -> "STC500 spec sheet"
        key = (d['kind'], d['name'], d['url'])
        if key in e['_seen']:
            return
        e['_seen'].add(key); e['docs'].append(d)
    for f in m['files']:
        label = f['label']; prov = provider_of(label)
        name = clean_name(label, prov)
        d = {'kind': kind_of(f, name), 'name': name, 'source': PROV_LABEL.get(prov, prov) or 'Web', 'url': f.get('source_page') or f['source']}
        if f['category'] == 'cad':
            d['url'] = f['source']
            d['match'] = f.get('match', 'nearest')
        for cid in [f['crane_id']] + [x for x in f.get('also_for', []) if x != f['crane_id']]:
            if cid in lib:
                add(cid, d)
    # links the build could not fetch: keep the ones that still work (members-only DWGs, "open page and press download")
    for x in m.get('manual', []):
        lab = x['label']
        if 'download failed' in lab or 'no download on page' in lab or 'SCC 800C' in lab:
            continue
        prov = provider_of(lab)
        if x['category'] == 'cad':
            model = re.search(r'(LTM ?\d+(?:-[\d.]+)?|AC ?\d+(?:-\d)?)', lab)
            cid = x['crane_id']; exact = bool(model) and model.group(1).replace(' ', '').lower().startswith(cid.lower()) and (cid in ('ltm1200', 'ltm1250', 'ltm1300', 'ltm1500', 'ltm1160'))
            variant = bool(model) and 'LTM 1300-6.3' in lab
            d = {'kind': 'cad', 'name': re.sub(r'\s*\(free CADforum login required\)', '', clean_name(lab, prov)), 'source': 'CADforum', 'url': x['url'],
                 'match': 'variant' if variant else ('exact' if exact else 'nearest'), 'login': True}
        else:
            d = {'kind': 'chart' if 'Load Chart' in lab else 'spec', 'name': re.sub(r'\s*\(open page and press the download button\)', '', clean_name(lab, prov)),
                 'source': PROV_LABEL.get(prov, prov) or 'Web', 'url': x['url']}
        add(x['crane_id'], d)
    order = {'chart': 0, 'spec': 1, 'cad': 2}
    for e in lib.values():
        e['docs'].sort(key=lambda d: (order[d['kind']], {'exact': 0, 'variant': 1, 'nearest': 2, 'collection': 3}.get(d.get('match'), 9)))
        del e['_seen']
    lines = ['// ===== Crane library index (GENERATED by pipeline/library/gen_library.py - do not edit by hand) =====',
             '// Metadata only: publisher, display name and the PUBLIC source link of every load chart / spec sheet / CAD drawing collected for a fleet crane.',
             "// CRANE_LIBRARY[crane.id] = { folder, docs:[{ kind:'chart'|'spec'|'cad', name, source, url, match?, login? }] }",
             '// match (CAD): exact = that model, variant = same model other generation, nearest = closest public drawing, collection = multi-crane sheet.',
             '// Third-party documents are reference only - check every value against the manufacturer chart for the exact machine before a lift.',
             'const CRANE_LIBRARY = {']
    ids = list(lib.keys())
    for i, cid in enumerate(ids):
        e = lib[cid]
        lines.append('  %s: { folder: %s, docs: [' % (cid, json.dumps(e['folder'], ensure_ascii=False)))
        for j, d in enumerate(e['docs']):
            lines.append('    ' + json.dumps(d, ensure_ascii=False) + (',' if j < len(e['docs']) - 1 else ''))
        lines.append('  ] }' + (',' if i < len(ids) - 1 else ''))
    lines.append('};')
    open(out, 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    print('wrote', out, sum(len(e['docs']) for e in lib.values()), 'docs for', len(lib), 'cranes')

if __name__ == '__main__':
    main()
