"""Convert parsed Liebherr tables into lift-planner chart definitions (JSON list per crane)."""
import json, sys, collections

def fmt(v):
    return ('%g' % v)

def build(parsed, source):
    out = []
    # ---- main boom: merge consecutive tables of the same page / cwt / guying
    mains = [c for c in parsed if c['kind'] == 'main']
    groups = []
    for c in mains:
        if groups and groups[-1]['page'] == c['page'] and groups[-1]['cwt'] == c['cwt'] and groups[-1]['guyed'] == c['guyed']:
            groups[-1]['parts'].append(c)
        else: groups.append({'page': c['page'], 'cwt': c['cwt'], 'guyed': c['guyed'], 'slew': c['slew'], 'tab': c['tab'], 'parts': [c]})
    for g in groups:
        cols = []; radii = set()
        for c in g['parts']:
            for k, spec in enumerate(c['cols']):
                if spec.get('boom') is None: continue
                cols.append((spec['boom'], '*' if spec.get('star') else '', {r[0]: r[k + 1] for r in c['rows'] if r[k + 1] is not None}))
            radii |= {r[0] for r in c['rows']}
        if not cols: continue
        # label duplicate boom lengths
        cnt = collections.Counter(L for L, _, _ in cols); seen = collections.Counter()
        head = []
        for L, star, _ in cols:
            seen[L] += 1
            lab = star or ('' if cnt[L] == 1 else 'abcdef'[seen[L] - 1])
            head.append(fmt(L) + ('/' + lab if lab else ''))
        rr = sorted(radii)
        lines = ['H: ' + ' | '.join(head)] + [fmt(r) + ': ' + ' '.join('-' if d.get(r) is None else fmt(d[r]) for _, _, d in cols) for r in rr]
        code = 'TY' if g['guyed'] else 'T'
        out.append({'id': f"{code.lower()}{fmt(g['cwt'] or 0)}p{g['page']}", 'name': f"{code} · {fmt(g['cwt'])} t CWT · {g['slew'] or 'see chart'} · telescopic boom{' (guyed)' if g['guyed'] else ''} · p.{g['page']}",
                    'kind': 'main', 'config': code, 'cwt': g['cwt'], 'src': '\n'.join(lines), 'source': f"{source} p.{g['page']} {g['tab']}".strip()})
    # ---- fixed / folding jib: one chart per (boom, adapter, jib), columns = offset angle
    fj = collections.OrderedDict()
    for c in [c for c in parsed if c['kind'] == 'fixedjib']:
        for k, spec in enumerate(c['cols']):
            b, j = spec.get('boom'), spec.get('jib')
            if b is None or j is None: continue
            key = (c['guyed'], c['cwt'], b, spec.get('adapter', 0), j, c['page'])
            e = fj.setdefault(key, {'cols': [], 'c': c})
            e['cols'].append((spec.get('deg', 0) or 0, {r[0]: r[k + 1] for r in c['rows'] if r[k + 1] is not None}))
    for (guyed, cwt, b, ad, j, page), e in fj.items():
        cols = [x for x in e['cols'] if x[1]]
        if not cols: continue
        rr = sorted({r for _, d in cols for r in d})
        lines = ['H: ' + ' | '.join(fmt(a) for a, _ in cols)] + [fmt(r) + ': ' + ' '.join('-' if d.get(r) is None else fmt(d[r]) for _, d in cols) for r in rr]
        code = ('TY' if guyed else 'T') + ('F' if ad else 'K')
        out.append({'id': f"fj{fmt(b)}-{fmt(j)}-{fmt(cwt or 0)}p{page}", 'name': f"{'Lattice' if ad else 'Folding'} jib {fmt(j)} m on {fmt(b)} m boom{' + ' + fmt(ad) + ' m adapter' if ad else ''} · {fmt(cwt)} t{' · guyed' if guyed else ''}",
                    'kind': 'fixedjib', 'config': code, 'cwt': cwt, 'mainLen': round(b + ad, 2), 'mainLabel': b, 'jibLen': j, 'src': '\n'.join(lines),
                    'source': f"{source} p.{page} {e['c']['tab']}".strip()})
    # ---- luffing jib: one chart per (guyed, boom, adapter, jib, cwt); columns = main boom angle
    lj = collections.OrderedDict()
    for c in [c for c in parsed if c['kind'] == 'luffing']:
        ang = c['mainAngle'] or 0
        for k, spec in enumerate(c['cols']):
            b, j = spec.get('boom'), spec.get('jib')
            if b is None or j is None: continue
            key = (c['guyed'], b, spec.get('adapter', 0), j, c['cwt'])
            e = lj.setdefault(key, {'cols': {}, 'pages': set(), 'tab': c['tab']})
            e['cols'].setdefault(ang, {}).update({r[0]: r[k + 1] for r in c['rows'] if r[k + 1] is not None})
            e['pages'].add(c['page'])
    for (guyed, b, ad, j, cwt), e in lj.items():
        cols = sorted([(a, d) for a, d in e['cols'].items() if d], key=lambda x: -x[0])
        if not cols: continue
        rr = sorted({r for _, d in cols for r in d})
        lines = ['H: ' + ' | '.join(fmt(a) for a, _ in cols)] + [fmt(r) + ': ' + ' '.join('-' if d.get(r) is None else fmt(d[r]) for _, d in cols) for r in rr]
        code = ('TY' if guyed else 'T') + 'N'
        out.append({'id': f"lj{fmt(b)}-{fmt(j)}-{fmt(cwt or 0)}{'y' if guyed else ''}", 'name': f"Luffing jib {fmt(j)} m on {fmt(b)} m boom{' + ' + fmt(ad) + ' m' if ad else ''} · {fmt(cwt)} t{' · guyed' if guyed else ''}",
                    'kind': 'luffing', 'config': code, 'cwt': cwt, 'mainLen': round(b + ad, 2), 'mainLabel': b, 'jibLen': j, 'src': '\n'.join(lines),
                    'source': f"{source} p.{','.join(map(str, sorted(e['pages'])))} {e['tab']}".strip()})
    return out

if __name__ == '__main__':
    parsed = json.load(open(sys.argv[1])); res = build(parsed, sys.argv[3])
    json.dump(res, open(sys.argv[2], 'w'))
    k = collections.Counter(c['kind'] for c in res)
    print(sys.argv[1], dict(k), 'size KB', len(json.dumps(res)) // 1024)
    for c in res[:6]: print('  ', c['name'], '|', c['src'].split('\n')[0][:120])
