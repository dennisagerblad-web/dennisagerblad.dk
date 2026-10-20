"""Index existing multi-image Presse popups without changing archive files/photos."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
from PIL import Image

SITE = Path(__file__).resolve().parents[2]
BASE = 'https://dennisagerblad.dk/'
source = (SITE / 'content/timeline/entries.js').read_text()
entries = json.loads(source.removeprefix('export const timelineEntries = ').strip().removesuffix(';'))
curated = json.loads((SITE / 'content/timeline/galleries.json').read_text())['entries']
metadata = json.loads((SITE / 'content/timeline/image-metadata.json').read_text())['media']


def timeline_group(entry):
    # Match the maintained routing in site-app.js / timeline-search.js.
    if entry['date'] in ('2012-04-18', '2013-02-12', '2011-08-14', '2008-05-23', '2007-11-10'):
        return 'press'
    if entry['title'] in ('Fjøllini Dansa, København.', 'Loco Mama, MIX-Copenhagen BLOG') or re.search('video marathon', entry['category'], re.I):
        return 'press'
    if re.search('video|youtube', entry['category'], re.I):
        return 'music'
    if re.search('artist talk', entry['title'], re.I) or re.search('litteratur|blog|bøssedanmark|oplæs|læser|læse op', entry['category'] + ' ' + entry['title'], re.I):
        return 'word'
    if entry['group'] == 'media':
        return 'art' if re.search('art exhibition|udstilling|exhibition|installation|textil|kunst', entry['category'], re.I) else 'press'
    return entry['group']


def local(src, page=SITE / 'index.html'):
    url = urlsplit(src)
    if url.scheme or url.netloc:
        return None
    name = unquote(url.path)
    path = (SITE / name.lstrip('/') if name.startswith('/') else page.parent / name).resolve()
    return path if path.is_relative_to(SITE) and path.is_file() else None


def relative(path):
    return './' + path.relative_to(SITE).as_posix()


class Archive(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images, self.links, self.text = [], [], []
        self.skip = []
        self.anchor = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('head', 'script', 'style', 'h1'):
            self.skip.append(tag)
        if self.skip:
            return
        if tag == 'img' and attrs.get('src'):
            self.images.append(attrs)
        if tag == 'a' and attrs.get('href'):
            self.anchor = {'href': attrs['href'], 'text': []}
        if tag in ('br', 'p', 'div', 'tr', 'h2', 'h3', 'li'):
            self.text.append('\n')
        if tag in ('td', 'th'):
            self.text.append(' ')

    def handle_endtag(self, tag):
        if tag in self.skip:
            self.skip.remove(tag)
            return
        if self.skip:
            return
        if tag == 'a' and self.anchor:
            self.links.append({'href': self.anchor['href'], 'label': ' '.join(''.join(self.anchor['text']).split())})
            self.anchor = None
        if tag in ('p', 'div', 'tr', 'h2', 'h3', 'li'):
            self.text.append('\n')

    def handle_data(self, data):
        if not self.skip:
            self.text.append(re.sub(r"\s+", " ", data))
            if self.anchor:
                self.anchor['text'].append(data)


output, sizes = {}, {}
audited = 0
for entry in entries:
    if timeline_group(entry) != 'press':
        continue
    audited += 1
    key = '|'.join(entry[field] for field in ('date', 'category', 'title'))
    gallery = curated.get(key)
    page = local(entry.get('href', ''))
    archive = None
    if page and page.suffix.lower() in ('.html', '.htm'):
        archive = Archive()
        archive.feed(page.read_text(errors='replace'))
    images, descriptions, logos, composites = [], [], [], {}
    previous_slice = False
    if archive:
        for attrs in archive.images:
            path = local(attrs['src'], page)
            if not path:
                raise ValueError(f'Missing archive image: {key}: {attrs["src"]}')
            with Image.open(path) as image:
                width, height = image.size
            src = relative(path)
            sizes[src] = {'width': width, 'height': height}
            # Publisher mastheads stay above the slideshow, not as photo slides.
            masthead = ('logoer' in path.parts or re.search('logo|krydd|oyggjaskeggi', path.name, re.I)
                        or (width / height > 3 and height < 180))
            if masthead:
                logos.append({'src': src, 'alt': attrs.get('alt') or path.stem.replace('_', ' '), 'width': width, 'height': height})
                previous_slice = False
                continue
            if width < 70 or height < 70:
                continue
            sliced = 'legacy-slice-part' in attrs.get('class', '')
            if sliced and previous_slice:
                first = images[-1]
                if first not in composites:
                    joined = first + '#press-joined'
                    images[-1] = joined
                    composites[joined] = [first]
                    sizes[joined] = dict(sizes[first])
                    first = joined
                parts = composites[first]
                parts.append(src)
                sizes[first] = {'width': max(sizes[first]['width'], width), 'height': sizes[first]['height'] + height}
            elif src not in images:
                images.append(src)
                descriptions.append(metadata.get(src, {}).get('description') or attrs.get('alt') or f'{entry["title"]} – billede {len(images)}')
            previous_slice = sliced
    # Existing editorial order, descriptions and photo replacements take priority.
    if gallery:
        images = gallery['images']
        descriptions = gallery.get('imageDescriptions', [])
        composites = {}
    elif entry.get('images'):
        images = entry['images']
        descriptions = [metadata.get(src, {}).get('description', '') for src in images]
    elif entry.get('biography'):
        images = [part['src'] for part in entry['biography'] if part['type'] == 'image']
        descriptions = [part.get('caption', '') for part in entry['biography'] if part['type'] == 'image']
    if len(images) < 2:
        continue
    paragraphs = list(gallery.get('details', []) if gallery else [])
    if entry.get('details') and entry['details'] not in paragraphs:
        paragraphs.insert(0, entry['details'])
    if archive:
        for line in ''.join(archive.text).splitlines():
            line = ' '.join(line.split())
            if line and not re.search('copyright|all rights reserved|website created|©', line, re.I) and line not in paragraphs:
                paragraphs.append(line)
    if entry.get('biography'):
        paragraphs += [part['text'] for part in entry['biography'] if part['type'] == 'text' and part['text'] not in paragraphs]
    links = []
    if archive:
        for link in archive.links:
            href = urljoin(urljoin(BASE, entry['href']), link['href'])
            if urlsplit(href).scheme not in ('http', 'https', 'mailto') or not link['label']:
                continue
            record = {'href': href, 'label': link['label']}
            if record not in links:
                links.append(record)
    record = dict(gallery or {})
    record.update(title=entry['title'], details=paragraphs, images=images, imageDescriptions=descriptions)
    if links:
        record['links'] = links
    if logos:
        record['logos'] = logos
    if composites:
        record['composites'] = composites
    output[key] = record
    for src in images:
        if src not in sizes and src not in metadata:
            path = local(src)
            if not path:
                raise ValueError(f'Missing gallery photo: {src}')
            with Image.open(path) as image:
                sizes[src] = {'width': image.width, 'height': image.height}
# Only record measured data used by these Presse galleries.
used = {src for gallery in output.values() for src in gallery['images']}
measured = {src: sizes[src] for src in used if src in sizes}
(SITE / 'content/timeline/press-galleries.json').write_text(json.dumps({'entries': output, 'media': measured}, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'Audited {audited} Presse entries; {len(output)} multi-image slideshows; {sum(len(g["images"]) for g in output.values())} slides; {sum(len(g.get("links", [])) for g in output.values())} archive links preserved.')
print('Joined display groups:', sum(len(g.get('composites', {})) for g in output.values()))
