"""Record visually reviewed, subject-specific image-search tags.
Input JSON maps stable review-inventory IDs to space-separated tag codes.
Descriptions and visible event text are not changed.
"""
from pathlib import Path
import json,sys
root=Path(__file__).resolve().parents[2]
inventory_path=Path(sys.argv[2]) if len(sys.argv)>2 else root/'docs/timeline-look-review-inventory-20261013.json'
inventory=json.loads(inventory_path.read_text())
p=root/'content/timeline/own-look-features.json'
data=json.loads(p.read_text()) if p.exists() else {'scope':'Only Dennis Agerblad; unknown or obscured details do not imply absence.','photos':{}}
color={'r':'red','g':'green','b':'blue','v':'purple','o':'orange','t':'turquoise','k':'black','w':'white','n':'brown','p':'pink','y':'yellow','a':'grey','s':'silver','z':'gold'}
fixed={
 'g':'glasses:present','g0':'glasses:absent','gs':'glasses:sunglasses',
 'hs':'hair:short','hl':'hair:long','hbald':'hair:bald',
 'hgray':'hair:grey','hlight':'hair:light','hdark':'hair:dark','hbrown':'hair:brown','hblond':'hair:blond','hblack':'hair:black','hwhite':'hair:white',
 'ws':'wig:short','wl':'wig:long','wig':'wig:present',
 'mic':'microphone:handheld','out':'setting:outdoor','stage':'setting:stage','alone':'stage:alone',
 'lie':'pose:lying','dance':'pose:dancing','mouth':'mouth:open','gaze':'gaze:direct',
 'scarf':'clothing:scarf','coat':'clothing:outerwear','under':'clothing:underwear','nylon':'clothing:nylon-costume',
 'classic':'makeup:classic','brown':'look:brown','dress':'clothing:dress','dots':'pattern:dots',
 'dressdots':'dress:dots','stripe':'pattern:stripes','flower':'pattern:flowers','heellow':'heels:low','heelhigh':'heels:high',
 'costumenude':'costume:nudity','costumepenis':'costume:penis','costumebum':'costume:buttocks',
 'nude':'nudity:visible','torso':'body:bare-torso','penis':'body:penis-visible','bum':'body:buttocks-visible',
 'band':'show:dennis-agerblad-band','solo':'show:solo','group':'show:group','perform':'show:performance',
}
def decode(codes):
 tags=set()
 for code in codes.split():
  if code in ('none','context'):continue
  if code in fixed:tags.add(fixed[code])
  elif code.startswith('c') and code[1:] in color:tags.add('outfit:'+color[code[1:]])
  elif code.startswith('g') and code[1:] in color:tags.add('glasses:'+color[code[1:]])
  elif code.startswith('heel') and code[4:] in color:tags.update(['heels:present','heels:'+color[code[4:]]])
  else:raise ValueError('Unknown code '+code)
 if any(t.startswith('glasses:') and t!='glasses:absent' for t in tags):tags.add('glasses:present')
 if 'hair:blond' in tags:tags.add('hair:light')
 if 'hair:black' in tags:tags.add('hair:dark')
 if any(t.startswith('wig:') for t in tags):
  tags.add('wig:present')
  for length in ['short','long']:
   if 'wig:'+length in tags:tags.add('hair:'+length)
 if any(t.startswith('heels:') for t in tags):tags.add('heels:present')
 if any(t in tags for t in ['costume:penis','costume:buttocks']):tags.add('costume:nudity')
 if any(t.startswith('body:') for t in tags):tags.add('nudity:visible')
 if 'stage:alone' in tags:tags.update(['setting:stage','show:solo','show:performance'])
 if 'setting:stage' in tags:tags.add('show:performance')
 # A casual group portrait is not evidence of a group performance.
 if 'show:performance' not in tags:tags.discard('show:group')
 for t in list(tags):
  if t.startswith(('outfit:','glasses:')) and t.split(':')[1] in color.values():tags.add('appearance:'+t.split(':')[1])
 assert not {'glasses:present','glasses:absent'}<=tags
 return sorted(tags)
rows=json.loads(Path(sys.argv[1]).read_text())
for raw,codes in rows.items():
 row=inventory[int(raw)];tags=decode(codes)
 data['photos'][row['src']]={'reviewed':True,'subject':'unknown' if codes.strip()=='none' else 'context' if 'context' in codes.split() else 'dennis','tags':tags}
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(f'Recorded {len(rows)} photos; total reviewed {len(data["photos"])} / {len(inventory)}')
