import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sys
import fitz, sys, json
LIB=os.environ.get("LL_LIB", "LoadLock Crane Library")          # folder holding manifest.json
OUT=os.environ.get("LL_CHART_OUT", "chart_out")                 # where the extracted chart texts are written
os.makedirs(OUT, exist_ok=True)
def find(crane, sub):
    m=json.load(open(LIB+'/manifest.json'))
    r=[f['file'] for f in m['files'] if f['crane_id']==crane and f['category']=='chart' and sub.lower() in f['file'].lower()]
    return r
if __name__=='__main__':
    crane, sub, pages = sys.argv[1], sys.argv[2], sys.argv[3]
    fs=find(crane,sub); assert len(fs)>=1, fs
    f=fs[0]; print('FILE:',f,'(',len(fs),'matches )')
    d=fitz.open(LIB+'/'+f)
    a,b=(pages.split('-')+[pages])[:2] if '-' in pages else (pages,pages)
    for i in range(int(a),int(b)+1):
        print('=== page',i)
        print(d[i-1].get_text('text'))
