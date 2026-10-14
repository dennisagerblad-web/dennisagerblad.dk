"""Build small previews for Timeline image-search results; leave originals untouched.
Run with a Python environment containing Pillow after adding gallery photos.
"""
from pathlib import Path
from hashlib import sha256
import json
from urllib.parse import urlsplit,unquote
from PIL import Image,ImageOps
root=Path(__file__).resolve().parents[2]
galleries=json.loads((root/'content/timeline/galleries.json').read_text())['entries']
out=root/'assets/timeline-search-thumbs';out.mkdir(exist_ok=True)
index={};missing=[]
for src in sorted({src for gallery in galleries.values() for src in gallery['images']}):
 path=root/unquote(urlsplit(src).path)
 if not path.is_file():missing.append(src);continue
 name=sha256(str(path.resolve().relative_to(root)).encode()).hexdigest()[:16]+'.webp'
 target=out/name
 if not target.exists() or target.stat().st_mtime<path.stat().st_mtime:
  with Image.open(path) as source:
   image=ImageOps.exif_transpose(source);image.thumbnail((160,180),Image.Resampling.LANCZOS)
   if image.mode not in ('RGB','RGBA'):image=image.convert('RGB')
   image.save(target,format='WEBP',quality=78,method=5)
 index[src]='./assets/timeline-search-thumbs/'+name
(root/'content/timeline/search-thumbnails.json').write_text(json.dumps({'thumbnails':index},ensure_ascii=False,separators=(',',':'))+'\n')
print(f'{len(index)} image paths indexed; {len(list(out.glob("*.webp")))} unique previews; {sum(p.stat().st_size for p in out.glob("*.webp"))/1024/1024:.2f} MB')
if missing:print('Missing files:',missing)
