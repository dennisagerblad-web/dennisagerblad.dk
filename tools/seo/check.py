"""Check the modern public pages before publishing; historic pages are excluded."""
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[2]
class Page(HTMLParser):
 def __init__(self):
  super().__init__();self.meta={};self.links=[];self.scripts=[];self.ids=[];self.hrefs=[];self.text='';self.tag=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if tag=='a':self.hrefs.append(a.get('href',''))
  if tag=='meta':
   key=a.get('property',a.get('name'));assert key not in self.meta,('Duplicate meta',key);self.meta[key]=a.get('content','')
  if tag=='link' and a.get('rel')=='canonical':self.links.append(a.get('href'))
  if tag=='script' and a.get('type')=='application/ld+json':self.tag='json';self.text=''
 def handle_data(self,data):
  if self.tag:self.text+=data
 def handle_endtag(self,tag):
  if tag=='script' and self.tag:self.scripts.append(json.loads(self.text));self.tag=None
sitemap=ET.parse(ROOT/'sitemap.xml');ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
urls={e.findtext('s:loc',namespaces=ns):e.findtext('s:lastmod',namespaces=ns) for e in sitemap.findall('s:url',ns)}
for item in json.loads((ROOT/'tools/seo/pages.json').read_text()):
 p=Page();p.feed((ROOT/item['file']).read_text());url=item['url'];assert p.links==[url]
 for key in ['description','og:type','og:title','og:description','og:url','og:image','og:image:alt','twitter:card']:assert p.meta.get(key),key
 assert p.meta['og:url']==url and p.scripts
 image=urlparse(p.meta['og:image']);assert image.netloc=='dennisagerblad.dk' and (ROOT/image.path.lstrip('/')).is_file()
 assert len(p.ids)==len(set(p.ids)),('Duplicate IDs',item['file'])
 for href in p.hrefs:
  if href.startswith('#'):assert href[1:] in p.ids,('Missing anchor',href)
 assert urls.get(url)=='2026-10-10'
 print('PASS',item['file'])
assert 'Sitemap: https://dennisagerblad.dk/sitemap.xml' in (ROOT/'robots.txt').read_text()
print('PASS: metadata, JSON-LD syntax, local share images, anchors and sitemap. Not a Google Rich Results certification.')
