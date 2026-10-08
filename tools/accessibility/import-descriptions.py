"""Import reviewed Timeline image descriptions without changing archive images.
Usage: python3 tools/accessibility/import-descriptions.py reviewed.csv
Only rows whose status is 'Godkendt' are imported. Existing descriptions must
match or the import fails; no unreviewed text or blank descriptions is applied.
"""
import csv
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[2]
gallery_path = root / 'content/timeline/galleries.json'
data = json.loads(gallery_path.read_text())
entries = data['entries']
changes = []
seen = set()
with Path(sys.argv[1]).open(newline='') as source:
    for row in csv.DictReader(source):
        if row['status'].strip().casefold() != 'godkendt':
            continue
        key = row['post']
        index = int(row['billednummer']) - 1
        description = row['beskrivelse'].strip()
        if not description:
            raise ValueError(f'Empty reviewed description: {key} #{index + 1}')
        gallery = entries.get(key)
        if not gallery or not 0 <= index < len(gallery['images']):
            raise ValueError(f'Unknown placement: {key} #{index + 1}')
        if gallery['images'][index] != row['billedsti']:
            raise ValueError(f'Image path changed: {key} #{index + 1}')
        if (key, index) in seen:
            raise ValueError(f'Duplicate placement: {key} #{index + 1}')
        seen.add((key, index))
        existing = gallery.get('imageDescriptions', [])
        if index < len(existing) and existing[index] and existing[index] != description:
            raise ValueError(f'Existing description differs: {key} #{index + 1}')
        changes.append((gallery, index, description))
# Validate the entire input before writing anything.
for gallery, index, description in changes:
    descriptions = gallery.setdefault('imageDescriptions', [''] * len(gallery['images']))
    descriptions.extend([''] * (len(gallery['images']) - len(descriptions)))
    descriptions[index] = description
if changes:
    gallery_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print(f'Imported {len(changes)} reviewed descriptions.')
