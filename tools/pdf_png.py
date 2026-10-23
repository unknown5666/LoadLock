# Renders each page of a PDF to PNG next to it (needs PyMuPDF): python3 tools/pdf_png.py out/report.pdf [dpi] [pages e.g. 1,4]
import sys, os, fitz
f = sys.argv[1]; dpi = int(sys.argv[2]) if len(sys.argv) > 2 else 110; only = set(int(x) for x in sys.argv[3].split(',')) if len(sys.argv) > 3 else None
d = fitz.open(f); base = os.path.splitext(f)[0]
for i, pg in enumerate(d):
    if only and i + 1 not in only: continue
    pg.get_pixmap(dpi=dpi).save(f'{base}_p{i + 1:02d}.png')
print(len(d), 'pages')
