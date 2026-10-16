"""Build crawlable section entry points from the current homepage shell."""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = 'https://dennisagerblad.dk'
SECTIONS = [
    ('musik', 'Musik', 'Sange, udgivelser og musikalske projekter af Dennis Agerblad.',
     [('Sproghoved / Málhøvð', '/musik/sproghoved-malhovd/')]),
    ('video', 'Video', 'Musikvideoer og optagelser med Dennis Agerblad.',
     [('Danmark har talent', '/video/danmark-har-talent/'),
      ('Københavns værste trash drag', '/video/koebenhavns-vaerste-trash-drag/')]),
    ('performance', 'Performance', 'Liveoptrædener og performancekunst af Dennis Agerblad.',
     [('Bol Mig I Mit Numsehul', '/performance/bol-mig-i-mit-numsehul/')]),
    ('kunst', 'Kunst', 'Billedkunst og kunstneriske projekter af Dennis Agerblad.',
     [('Trashdrag', '/kunst/trashdrag/')]),
    ('litteratur', 'Litteratur', 'Tekster og litterære projekter af Dennis Agerblad.', []),
    ('tidslinje', 'Tidslinje', 'En interaktiv tidslinje over Dennis Agerblads liv og kunstneriske arbejde.', []),
]


def replace_once(source, pattern, replacement):
    result, count = re.subn(pattern, lambda match: replacement, source, count=1)
    if count != 1:
        raise ValueError(f'Expected one match for {pattern!r}, got {count}')
    return result


template = (ROOT / 'index.html').read_text()
for slug, name, description, details in SECTIONS:
    url = f'{BASE}/{slug}/'
    title = f'{name} – Dennis Agerblad'
    page = template.replace('<head>', '<head>\n    <base href="/">', 1)
    page = replace_once(page, r'<title>.*?</title>', f'<title>{html.escape(title)}</title>')
    page = replace_once(page, r'(<meta name="description" content=")[^"]*(">)',
                        f'<meta name="description" content="{html.escape(description, quote=True)}">')
    for property_name, value in [
        ('og:title', title), ('og:description', description), ('og:url', url),
        ('twitter:title', title), ('twitter:description', description),
    ]:
        pattern = rf'<meta property="{property_name}" content="[^"]*">' if property_name.startswith('og:') else rf'<meta name="{property_name}" content="[^"]*">'
        page = replace_once(page, pattern, f'<meta {"property" if property_name.startswith("og:") else "name"}="{property_name}" content="{html.escape(value, quote=True)}">')
    page = replace_once(page, r'<link rel="canonical" href="[^"]+">',
                        f'<link rel="canonical" href="{url}">')
    jsonld_match = re.search(r'<script type="application/ld\+json">(.*?)</script>', page, re.S)
    if not jsonld_match:
        raise ValueError('Missing JSON-LD in homepage')
    graph = json.loads(jsonld_match.group(1))
    webpage = next(item for item in graph['@graph'] if item['@type'] == 'WebPage')
    webpage.update({'@id': url + '#webpage', 'url': url, 'name': title, 'description': description})
    page = page.replace(jsonld_match.group(1), json.dumps(graph, ensure_ascii=False))
    detail_links = ''.join(f'<li><a href="{path}">{html.escape(label)}</a></li>' for label, path in details)
    all_links = ''.join(f'<li><a href="/{other_slug}/">{other_name}</a></li>' for other_slug, other_name, *_ in SECTIONS)
    fallback = (f'<main id="section-index" class="section-index">\n'
                f'  <p><a href="/">Dennis Agerblad</a></p>\n'
                f'  <h1>{name}</h1><p>{description}</p>\n'
                f'  {"<ul>" + detail_links + "</ul>" if details else ""}\n'
                f'  <nav aria-label="Hovedsektioner"><ul>{all_links}</ul></nav>\n'
                f'</main>\n    ')
    page = page.replace('<div id="root"></div>', fallback + '<div id="root"></div>', 1)
    target = ROOT / slug / 'index.html'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("\n".join(line.rstrip() for line in page.splitlines()) + "\n")
    print(target.relative_to(ROOT))
