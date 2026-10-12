from pathlib import Path
import re,json
from html.parser import HTMLParser
root=Path(__file__).resolve().parents[2]
texts={}
def add(s,origin):
 s=s.strip()
 if s and re.search(r'[A-Za-zÆØÅæøå]',s) and not s.startswith(('http','./','../','/archive/')):
  texts.setdefault(s,[]).append(origin)
class Parser(HTMLParser):
 def __init__(self,origin):super().__init__();self.skip=0;self.origin=origin
 def handle_starttag(self,t,a):
  if t in ['script','style']:self.skip+=1
  if not self.skip:
   for k,v in a:
    if k in ['alt','title','aria-label','placeholder']:add(v or '',self.origin)
 def handle_endtag(self,t):
  if t in ['script','style']:self.skip=max(0,self.skip-1)
 def handle_data(self,s):
  if not self.skip:add(s,self.origin)
for name in ['index.html','kunst/trashdrag/index.html','musik/sproghoved-malhovd/index.html','video/danmark-har-talent/index.html','video/koebenhavns-vaerste-trash-drag/index.html','performance/bol-mig-i-mit-numsehul/index.html']:
 Parser(name).feed((root/name).read_text())
s=(root/'assets/site-app.js').read_text();s=s[s.rfind('function te(){'):]
for m in re.finditer(r'`([^`]*?)`',s):
 v=m.group(1)
 if not '${' in v and not any(c in v for c in '{}<>') and (re.search(r'[æøåÆØÅ]',v) or ' ' in v or v in ['Musik','Kunst','Tidslinje','Litteratur','Scene','Ord','Presse']):add(v,'app')
for file in ['content/timeline/entries.js','content/timeline/galleries.json','content/timeline/image-metadata.json']:
 s=(root/file).read_text();d=json.loads(s[s.index('['):s.rindex(']')+1]) if file.endswith('.js') else json.loads(s)
 def walk(o,k=''):
  if isinstance(o,dict):
   for a,b in o.items():walk(b,a)
  elif isinstance(o,list):
   for a in o:walk(a,k)
  elif isinstance(o,str) and k in ['title','details','category','shortTitle','popupTitle','imageDescriptions','description','alt','caption']:add(o,file)
 walk(d)
for file in ['timeline-gallery.js','timeline-search.js','timeline-ui.js','art-versions-v14.js','art-viewer.js','share-preview.js','landing-share.js','video-speech.js','talent-navigation.js','trashdrag-navigation.js','album-youtube.js']:
 s=(root/'assets'/file).read_text()
 for m in re.finditer(r"(['\"`])([^\n]*?)\1",s):
  v=m.group(2)
  if re.search(r'[æøåÆØÅ]',v) and not any(c in v for c in '<>{}\\'):add(v,file)
out=[{'id':i,'da':s,'origins':list(set(o))} for i,(s,o) in enumerate(texts.items())]
(root/'tools/i18n/inventory.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print('Strings:',len(out),'chars:',sum(len(x['da']) for x in out))
