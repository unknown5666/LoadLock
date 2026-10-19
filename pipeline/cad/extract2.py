"""Extract the visible children of a crane side-view block into parts with flattened, colour-resolved items (block coords, mm)."""
import sys, json
from ezdxf import recover
from ezdxf.addons.drawing import RenderContext, Frontend
from ezdxf.addons.drawing.backend import BackendInterface
from ezdxf.addons.drawing.config import Configuration, HatchPolicy, LineweightPolicy, BackgroundPolicy, LinePolicy

class Cap(BackendInterface):
    def __init__(s): s.items = []
    def configure(s, c): pass
    def enter_entity(s, e, p): pass
    def exit_entity(s, e): pass
    def set_background(s, c): pass
    def _c(s, p): return p.color[:7]
    def draw_point(s, pos, p): pass
    def draw_line(s, a, b, p): s.items.append(('s', s._c(p), [(a.x, a.y), (b.x, b.y)]))
    def draw_solid_lines(s, lines, p):
        for a, b in lines: s.items.append(('s', s._c(p), [(a.x, a.y), (b.x, b.y)]))
    def draw_path(s, path, p):
        for sp in (path.sub_paths() if hasattr(path, 'sub_paths') else [path]):
            pts = [(v.x, v.y) for v in sp.flattening(6)]
            if len(pts) > 1: s.items.append(('s', s._c(p), pts))
    def draw_filled_paths(s, paths, p):
        for path in paths:
            for sp in (path.sub_paths() if hasattr(path, 'sub_paths') else [path]):
                pts = [(v.x, v.y) for v in sp.flattening(6)]
                if len(pts) > 2: s.items.append(('f', s._c(p), pts))
    def draw_filled_polygon(s, pts, p):
        q = [(v.x, v.y) for v in pts.vertices()] if hasattr(pts, 'vertices') else [(v.x, v.y) for v in pts]
        if len(q) > 2: s.items.append(('f', s._c(p), q))
    def draw_image(s, i, p): pass
    def clear(s): pass
    def finalize(s): pass

def visible(e):
    if e.dxf.get('invisible', 0): return False
    if e.dxftype() == 'INSERT' and (abs(e.dxf.xscale) < 1e-3 or abs(e.dxf.yscale) < 1e-3): return False
    return True

def extract(f, name, out, doc=None):
    doc = doc or recover.readfile(f)[0]
    blk = doc.blocks.get(name)
    ctx = RenderContext(doc); ctx.set_current_layout(doc.modelspace())
    ins = [e for e in doc.modelspace().query('INSERT') if e.dxf.name == name]
    if ins: ctx.push_state(ctx.resolve_all(ins[0]))
    cfg = Configuration(hatch_policy=HatchPolicy.NORMAL, lineweight_policy=LineweightPolicy.ABSOLUTE, background_policy=BackgroundPolicy.WHITE, line_policy=LinePolicy.SOLID)
    parts = []
    for i, e in enumerate(blk):
        t = e.dxftype()
        if t in ('ATTDEF', 'ATTRIB', 'DIMENSION', 'MTEXT', 'TEXT', 'POINT') or not visible(e): continue
        cap = Cap(); fe = Frontend(ctx, cap, config=cfg)
        try: fe.draw_entities([e])
        except Exception as ex: print('skip', t, ex); continue
        if not cap.items: continue
        xs = [x for it in cap.items for x, _ in it[2]]; ys = [y for it in cap.items for _, y in it[2]]
        parts.append({'i': i, 'type': t, 'name': e.dxf.name if t == 'INSERT' else '', 'rot': round(e.dxf.rotation, 2) if t == 'INSERT' else 0,
                      'sx': round(e.dxf.xscale, 3) if t == 'INSERT' else 1, 'ins': [round(e.dxf.insert.x, 1), round(e.dxf.insert.y, 1)] if t == 'INSERT' else None,
                      'layer': e.dxf.layer, 'bbox': [min(xs), min(ys), max(xs), max(ys)], 'items': cap.items})
    json.dump({'file': f, 'block': name, 'parts': parts}, open(out, 'w'))
    return parts

if __name__ == '__main__':
    ps = extract(sys.argv[1], sys.argv[2], sys.argv[3])
    for p in ps: print(p['i'], p['type'], p['name'][-26:], p['rot'], p['sx'], [round(v) for v in p['bbox']], len(p['items']))
