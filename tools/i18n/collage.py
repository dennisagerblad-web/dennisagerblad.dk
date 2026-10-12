# Compose English headings from the existing collage letters using SVG viewports.
# Original source graphics are preserved; embedded WebP copies only reduce file size.
from pathlib import Path
from PIL import Image
import io,base64
root=Path(__file__).resolve().parents[2];out=root/'menu-english';out.mkdir(exist_ok=True)
sources={'lit':'menu-edited/litteratur.png','perf':'menu-edited/performance.png','cal':'menu-collage-v4/calendar.png','color':'menu-letters/color.png'}
letters={'L':('lit',(80,30,134,238)),'i':('lit',(215,40,64,188)),'T':('lit',(748,48,106,201)),'E':('lit',(416,43,105,203)),'R':('perf',(523,136,94,200)),'A':('cal',(72,73,61,102)),'U':('lit',(855,50,103,202)),'M':('perf',(614,136,108,212)),'N':('color',(559,304,110,132))}
for word,chars in [('literature','LiTERATURE'),('timeline','TiMELiNE')]:
 used=set(letters[c][0] for c in chars);defs=[]
 for key in used:
  im=Image.open(root/sources[key]);buf=io.BytesIO();im.save(buf,format='WEBP',quality=86,method=6)
  encoded=base64.b64encode(buf.getvalue()).decode();defs.append(f'<image id="{key}" width="{im.width}" height="{im.height}" href="data:image/webp;base64,{encoded}"/>')
 parts=[];cursor=24
 for i,c in enumerate(chars):
  key,(x,y,w,h)=letters[c];height=[210,196,206,216,203,211,205,215,208,202][i];width=w*height/h;top=[28,40,32,26,38,29,36,25,34,40][i]
  parts.append(f'<svg x="{cursor:.1f}" y="{top}" width="{width:.1f}" height="{height}" viewBox="{x} {y} {w} {h}"><use href="#{key}"/></svg>');cursor+=width-2
 width=cursor+24
 # Use rays proportional to the letter height, with both ends inside the canvas.
 accents='<path d="M29 244L7 267M48 242L31 273" stroke="#fff" stroke-width="11"/><path d="M%d 6l-9 24m34-21l-16 26" stroke="#ffe33b" stroke-width="12"/>'%(width-42)
 (out/f'{word}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{width:.1f}" height="280" viewBox="0 0 {width:.1f} 280"><defs>{"".join(defs)}</defs>{"".join(parts)}{accents}</svg>')
for source,name in [('menu-collage-v4/music.png','music.png'),('menu-collage-v4/art.png','art.png')]:
 (out/name).write_bytes((root/source).read_bytes())
print('English collage graphics generated.')

# Retain each source's existing rays without adding a second, detached set.
import re
for name,source in [('music','menu-english/music.png'),('art','menu-english/art.png'),('video','menu-original/video.png'),('performance','menu-edited/performance.png'),('literature','menu-english/literature.svg'),('timeline','menu-english/timeline.svg')]:
 path=root/source
 if path.suffix=='.svg':
  data=path.read_bytes();header=data.decode().split('>')[0];w=float(re.search(r'width="([0-9.]+)"',header)[1]);h=float(re.search(r'height="([0-9.]+)"',header)[1]);mime='image/svg+xml'
 else:
  im=Image.open(path);w,h=im.size;buf=io.BytesIO();im.save(buf,format='WEBP',quality=90,method=6);data=buf.getvalue();mime='image/webp'
 pad=h*.12;W=w+2*pad;H=h+2*pad
 encoded=base64.b64encode(data).decode()
 (out/f'{name}-rays.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><image x="{pad}" y="{pad}" width="{w}" height="{h}" href="data:{mime};base64,{encoded}"/></svg>')
