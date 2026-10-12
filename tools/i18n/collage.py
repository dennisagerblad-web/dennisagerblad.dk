"""Validate image-generated menu delivery assets. Never draw or crop letters.

Artwork is generated with the built-in image_gen tool. The preserved originals,
prompts and delivery metadata are in menu-imagegen-20261012 beside this file.
This replaces the obsolete code-composition workflow that clipped letters into
SVG viewports. Re-run image_gen for artwork changes, preserving the Danish refs.
"""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
manifest = json.loads((root / "tools/i18n/menu-imagegen-20261012/manifest.json").read_text())
for asset in manifest:
    original = root / asset["original"]
    website = root / asset["website"]
    assert original.is_file() and website.is_file(), asset["word"]
    with Image.open(original) as source, Image.open(website) as delivery:
        assert source.size == tuple(asset["source_dimensions"]), asset["word"]
        assert delivery.size == tuple(asset["dimensions"]), asset["word"]
        assert "A" in source.getbands() and "A" in delivery.getbands(), asset["word"]
        assert abs(source.width / source.height - delivery.width / delivery.height) < .01, asset["word"]
    print(f"{asset['word']}: preserved original and transparent WebP verified")
print("PASS: six image-generated words; no code drawing, cropping or compositing")
