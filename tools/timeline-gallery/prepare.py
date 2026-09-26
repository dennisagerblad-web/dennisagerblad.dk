"""Derive gallery media from the current published bundle, not the stale Vite copy."""
import json, re
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote
SITE = Path(__file__).resolve().parents[2]
index = (SITE / 'index.html').read_text()
bundle = SITE / re.search(r'src="\./(assets/index-[^?" ]+)', index)[1]
source = bundle.read_text()
raw = source.split('be=JSON.parse(`', 1)[1].split('`)', 1)[0]
# JSON is embedded in a JS template literal; unescape its extra backslashes.
entries = json.loads(raw.replace('\\\\', '\\').replace('\\`','`').replace('\\$', '$'))
Path('/tmp/timeline-current.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2))
print('Current entries:', len(entries))
for e in entries:
    if e['group'] in ('live','art') and e.get('shortTitle'):
        print(e['date'], e['shortTitle'], '|', e['title'])

from PIL import Image, ImageStat
from difflib import SequenceMatcher

def local_path(url, page=SITE/'index.html'):
    u=urlparse(url)
    if u.scheme or u.netloc: return None
    path=unquote(u.path)
    candidate=(SITE/path.lstrip('/') if path.startswith('/') else page.parent/path).resolve()
    return candidate if candidate.is_relative_to(SITE.resolve()) and candidate.is_file() else None

class Archive(HTMLParser):
    def __init__(self):
        super().__init__(); self.images=[]; self.frames=[]; self.links=[]; self.text=[]; self.skip=0
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag in ('head','script','style','h1'): self.skip+=1
        if tag=='img' and a.get('src'): self.images.append(a['src'])
        if tag=='frame' and a.get('src'): self.frames.append(a['src'])
        if tag=='a' and a.get('href'): self.links.append(a['href'])
        if tag in ('br','p','div','tr','h2','h3'): self.text.append('\n')
        if tag == 'a': self.text.append(' ')
    def handle_endtag(self,tag):
        if tag in ('head','script','style','h1'): self.skip=max(0,self.skip-1)
        if tag in ('p','div','tr','h2','h3'): self.text.append('\n')
    def handle_data(self,text):
        if not self.skip: self.text.append(text)

media={}
def photo(path):
    src='./'+str(path.relative_to(SITE))
    if src in media: return src
    try:
        with Image.open(path) as im:
            w,h=im.size
            if w<100 or h<100: return None
            im=im.convert('RGB'); im.thumbnail((24,24))
            rgb=[round(v*.62) for v in ImageStat.Stat(im).mean]
            media[src]={'width':w,'height':h,'color':'#'+''.join(f'{v:02x}' for v in rgb)}
        return src
    except Exception: return None

def archive(path, visited=None):
    visited=visited or set()
    if path in visited or len(visited)>50: return [],[]
    visited.add(path)
    p=Archive(); p.feed(path.read_text(errors='replace'))
    images=[]; descriptions=[]
    for link in p.images:
        target=local_path(link,path)
        if target and (src:=photo(target)): images.append(src)
    for link in p.frames:
        target=local_path(link,path)
        if target and target.suffix.lower() in ('.html','.htm'):
            pics,copy=archive(target,visited); images+=pics; descriptions+=copy
    # Linked full-size pictures belong to the same event; do not crawl adjacent events.
    for link in p.links:
        target=local_path(link,path)
        if not target or not target.is_relative_to(path.parent): continue
        if target.suffix.lower() in ('.jpg','.jpeg','.png','.webp'):
            if src:=photo(target): images.append(src)
        elif target.suffix.lower() in ('.html','.htm') and ('pages' in target.parts or not images):
            pics,copy=archive(target,visited); images+=pics; descriptions+=copy
    for line in ''.join(p.text).splitlines():
        line=' '.join(line.split())
        if len(line)>25 and not re.search(r'copyright|all rights|website created|©',line,re.I): descriptions.append(line)
    return list(dict.fromkeys(images)),list(dict.fromkeys(descriptions))

galleries={}
for e in entries:
    if e['group'] not in ('live','art'): continue
    title=e.get('shortTitle') or e['title']
    details=[e['details']] if e.get('details') else []
    if e.get('shortTitle') and '. ' in e['title']:
        details.append(e['title'].split('. ',1)[1])
    images=[]; texts=[]
    if e.get('images'):
        images=[src for url in e['images'] if (p:=local_path(url)) and (src:=photo(p))]
    if not images and e.get('href') and (p:=local_path(e['href'])):
        images,texts=archive(p)
    if not images and e.get('thumbnail') and (p:=local_path(e['thumbnail'])):
        if src:=photo(p): images.append(src)
    for line in texts:
        if SequenceMatcher(None,line.lower(),title.lower()).ratio()<.72 and line not in details:
            details.append(line)
    galleries['|'.join([e['date'],e['category'],e['title']])]={'title':title,'details':details,'images':images}
faces_path=Path(__file__).with_name('faces.json')
if faces_path.exists():
    for src, boxes in json.loads(faces_path.read_text()).items():
        if src in media: media[src]['faces']=[[round(v,5) for v in box] for box in boxes]
output=SITE/'assets/timeline-gallery-data.json'
output.write_text(json.dumps({'entries':galleries,'media':media},ensure_ascii=False,separators=(',',':')))
Path('/tmp/timeline-gallery-images.json').write_text(json.dumps([str(SITE/src[2:]) for src in media]))
print('Galleries:',len(galleries),'Images:',len(media),'Total slides:',sum(len(g['images']) for g in galleries.values()))
