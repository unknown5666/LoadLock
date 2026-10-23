import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dump import OUT
import sys, json
from glyph import *
from asm import chart_text2, check
import io, contextlib
radii=['2.2','3.0','3.5','4.0','4.5','5.0','6.0','7.0','8.0','9.0','10.0','12.0','14.0','16.0','18.0']+['%.1f'%r for r in range(20,80,2)]
with contextlib.redirect_stdout(io.StringIO()):
    cols,tab,cmap=decode_table('zat4000v','ZAT4000',10,(640,60,1200,800),radii,660,154.2,(160,755))
del tab[2.2]   # starred = nominal case (page note), not a usable rating
cc=[(c[0],c[1],'') for c in cols]
print(check(cc,tab,cap=400))
src=chart_text2(cc,tab); print(src)
json.dump({'src':src},open(OUT+'/zat4000v_c92.json','w'))
