"""Build native Timeline popup content from maintained media and archive sources.

Archive HTML is input only: no legacy document, script, stylesheet or layout is
embedded in the new site. Existing original photographs are never rewritten.
"""
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
from PIL import Image

SITE = Path(__file__).resolve().parents[2]
BASE = 'https://dennisagerblad.dk/'


def timeline_group(entry):
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


def identity(src):
    return unquote(urlsplit(urljoin(BASE, src)).path)


def clean(text):
    return ' '.join(text.split())


class Archive(HTMLParser):
    block_tags = {'br', 'p', 'div', 'tr', 'h2', 'h3', 'li'}
    inline_tags = {'b': 'strong', 'strong': 'strong', 'i': 'em', 'em': 'em'}

    def __init__(self):
        super().__init__()
        self.images, self.links, self.text, self.rich, self.videos = [], [], [], [], []
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
            self.anchor = {'href': attrs['href'], 'text': [], 'fallback': attrs.get('aria-label') or attrs.get('title', '')}
        if tag == 'iframe':
            match = re.search(r'(?:youtube(?:-nocookie)?\.com/embed/|youtu\.be/)([\w-]{11})', attrs.get('src', ''))
            if match and match[1] not in self.videos:
                self.videos.append(match[1])
        if tag in self.block_tags:
            self.text.append('\n'); self.rich.append('\n')
        if tag in ('td', 'th'):
            self.text.append(' '); self.rich.append(' ')
        if tag in self.inline_tags:
            self.rich.append('<' + self.inline_tags[tag] + '>')

    def handle_endtag(self, tag):
        if tag in self.skip:
            self.skip.remove(tag)
            return
        if self.skip:
            return
        if tag == 'a' and self.anchor:
            self.links.append({'href': self.anchor['href'], 'label': clean(''.join(self.anchor['text'])) or self.anchor['fallback']})
            self.anchor = None
        if tag in self.inline_tags:
            self.rich.append('</' + self.inline_tags[tag] + '>')
        if tag in self.block_tags - {'br'}:
            self.text.append('\n'); self.rich.append('\n')

    def handle_data(self, data):
        if not self.skip:
            data = re.sub(r'\s+', ' ', data)
            self.text.append(data); self.rich.append(html.escape(data))
            if self.anchor:
                self.anchor['text'].append(data)

    def blocks(self):
        return [(clean(text), markup.strip()) for text, markup in zip(''.join(self.text).splitlines(), ''.join(self.rich).splitlines()) if clean(text)]


def prepare():
    source = (SITE / 'content/timeline/entries.js').read_text()
    entries = json.loads(source.removeprefix('export const timelineEntries = ').strip().removesuffix(';'))
    curated = json.loads((SITE / 'content/timeline/galleries.json').read_text())['entries']
    metadata = json.loads((SITE / 'content/timeline/image-metadata.json').read_text())['media']
    output, sizes, related, sources, owners = {}, {}, {}, {}, {}
    omitted, missing = set(), []
    known_sources = {identity(entry['href']): entry for entry in entries if entry.get('href')}

    def build(entry, related_key=None):
        key = related_key or '|'.join(entry[field] for field in ('date', 'category', 'title'))
        group = timeline_group(entry)
        gallery = curated.get(key)
        page = local(entry.get('href', ''))
        archive = None
        if page and page.suffix.lower() in ('.html', '.htm'):
            archive = Archive(); archive.feed(page.read_text(errors='replace'))
        images, descriptions, composites, excluded = [], [], {}, []
        previous_slice = False
        if archive:
            for attrs in archive.images:
                path = local(attrs['src'], page)
                if not path:
                    raise ValueError(f'Missing photo: {key}: {attrs["src"]}')
                with Image.open(path) as image:
                    width, height = image.size
                src = relative(path)
                sizes[src] = {'width': width, 'height': height}
                logo = ('logoer' in path.parts or re.search('logo|krydd|oyggjaskeggi', path.name, re.I)
                        or (width / height > 3 and height < 180))
                if logo:
                    excluded.append(src); omitted.add(src); previous_slice = False
                    continue
                if width < 70 or height < 70:
                    continue
                sliced = 'legacy-slice-part' in attrs.get('class', '')
                if sliced and previous_slice:
                    first = images[-1]
                    if first not in composites:
                        joined = first + '#popup-joined'
                        images[-1] = joined; composites[joined] = [first]
                        sizes[joined] = dict(sizes[first]); first = joined
                    composites[first].append(src)
                    sizes[first] = {'width': max(sizes[first]['width'], width), 'height': sizes[first]['height'] + height}
                elif src not in images:
                    images.append(src)
                    descriptions.append(metadata.get(src, {}).get('description') or attrs.get('alt') or f'{entry["title"]} – billede {len(images)}')
                previous_slice = sliced
        if gallery:
            images = list(gallery['images']); descriptions = list(gallery.get('imageDescriptions', [])); composites = {}
        elif entry.get('images'):
            images = list(entry['images']); descriptions = [metadata.get(src, {}).get('description', '') for src in images]
        elif entry.get('biography'):
            images = [part['src'] for part in entry['biography'] if part['type'] == 'image']
            descriptions = [part.get('caption', '') for part in entry['biography'] if part['type'] == 'image']
        elif not images and entry.get('thumbnail') and not entry.get('videoId') and not (archive and archive.videos):
            images = [entry['thumbnail']]; descriptions = [metadata.get(entry['thumbnail'], {}).get('description') or entry['title']]
        blocked = {identity(src) for src in excluded}
        pairs = [(src, descriptions[index] if index < len(descriptions) else metadata.get(src, {}).get('description', ''))
                 for index, src in enumerate(images)
                 if identity(src) not in blocked and not (group == 'press' and re.search(r'/(?:logoer)/|logo|krydd|oyggjaskeggi', src, re.I))]
        images = [src for src, description in pairs]; descriptions = [description for src, description in pairs]
        paragraphs = list(gallery.get('details', []) if gallery else [])
        markup = [html.escape(paragraph) for paragraph in paragraphs]
        if entry.get('details') and entry['details'] not in paragraphs:
            paragraphs.insert(0, entry['details']); markup.insert(0, html.escape(entry['details']))
        archive_blocks = []
        if archive:
            for text, rich in archive.blocks():
                if re.search(r'copyright|all rights reserved|website created|©|^GoogleVideo movie\.?$|^[_\- ]{5,}$', text, re.I):
                    continue
                archive_blocks.append((text, rich))
                if text not in paragraphs:
                    paragraphs.append(text); markup.append(rich)
        if entry.get('biography'):
            for part in entry['biography']:
                if part['type'] == 'text' and part['text'] not in paragraphs:
                    paragraphs.append(part['text']); markup.append(html.escape(part['text']))
        links = []
        if archive:
            for link in archive.links:
                href = urljoin(urljoin(BASE, entry['href']), link['href'])
                if urlsplit(href).scheme not in ('http', 'https', 'mailto') or not link['label']:
                    continue
                record = {'href': href, 'label': link['label']}
                if record not in links:
                    links.append(record)
        record = {}
        record.update(title=entry['title'], group=group, details=paragraphs, detailMarkup=markup, images=images, imageDescriptions=descriptions)
        if gallery:
            record.pop('images', None); record.pop('imageDescriptions', None)
            record['useCurated'] = True
            record['details'] = [text for text, rich in archive_blocks]
            record['detailMarkup'] = [rich for text, rich in archive_blocks]
        if entry.get('href'):
            record['source'] = entry['href']; sources[identity(entry['href'])] = key
        if entry.get('albumKey'):
            record['albumFooter'] = [{'text': text, 'markup': rich} for text, rich in zip(paragraphs, markup)]
            record['details'] = []; record['detailMarkup'] = []
        if links: record['links'] = links
        if composites: record['composites'] = composites
        if excluded: record['excludedImages'] = excluded
        if archive and archive.videos: record['videos'] = archive.videos
        owners[key] = entry
        output[key] = record
        if not (images or paragraphs or links or entry.get('videoId') or (archive and archive.videos)):
            missing.append(key)
        for src in images:
            if src not in sizes and src not in metadata:
                path = local(src)
                if not path: raise ValueError(f'Missing gallery photo: {src}')
                with Image.open(path) as image: sizes[src] = {'width': image.width, 'height': image.height}

    selected = [entry for entry in entries if timeline_group(entry) == 'press' or entry.get('href')]
    for entry in selected:
        build(entry)
    # Local linked articles receive the same native view; no link can reopen a
    # legacy archive document as popup content. Existing Timeline entries win.
    for owner_key, record in list(output.items()):
        for link in record.get('links', []):
            path = identity(link['href'])
            if path in known_sources or not path.startswith('/archive/legacy/') or not path.endswith(('.html', '.htm')) or path in sources:
                continue
            page = local(path)
            if not page: continue
            text = page.read_text(errors='replace')
            heading = re.search(r'<h1\b[^>]*>(.*?)</h1>', text, re.I | re.S)
            title = clean(html.unescape(re.sub('<[^>]+>', ' ', heading[1]))) if heading else record['title']
            title = re.sub(r'\s+\d{1,2}[/.-]\d{1,2}\s*-?\s*\d{4}\.?\s*$', '', title)
            parent = owners[owner_key]
            key = 'related:' + path
            entry = {'date': parent['date'], 'display': parent.get('display'), 'year': parent['year'], 'category': parent['category'], 'title': title, 'group': record['group'], 'href': path, 'contentKey': key}
            related[path] = entry; build(entry, key)
    used = {src for key, record in output.items() for src in record.get('images', curated.get(key, {}).get('images', []))}
    used.update(src for gallery in curated.values() for src in gallery['images'])
    for src in used:
        if src in metadata or src in sizes: continue
        path=local(src)
        if not path: raise ValueError(f'Missing maintained photo: {src}')
        with Image.open(path) as image: sizes[src]={'width':image.width,'height':image.height}
    measured = {src: sizes[src] for src in sorted(used) if src in sizes and src not in metadata}
    data = {'entries': output, 'media': measured, 'related': related, 'omittedLogos': sorted(omitted), 'emptyEntries': missing}
    target = SITE / 'content/timeline/popup-content.json'
    target.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'Native content: {len(output)} records ({sum(record["group"] == "press" for record in output.values())} Presse), {len(used)} photos, {len(omitted)} separate logos omitted.')
    print('Empty source entries:', json.dumps(missing, ensure_ascii=False))


if __name__ == '__main__':
    prepare()
