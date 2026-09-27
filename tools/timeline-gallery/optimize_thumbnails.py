"""Build small timeline previews while retaining full-size popup originals.

Run from the site root with Pillow available. The event data in
content/timeline/entries.js is the only source of preview paths.
"""

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps

SITE = Path(__file__).resolve().parents[2]
DATA = SITE / "content/timeline/entries.js"
OUTPUT = SITE / "assets/timeline-thumbs"
PREFIX = "export const timelineEntries = "


def main():
    source = DATA.read_text()
    if not source.startswith(PREFIX) or not source.rstrip().endswith(";"):
        raise ValueError("Unexpected timeline data module")
    entries = json.loads(source[len(PREFIX):].strip()[:-1])
    OUTPUT.mkdir(exist_ok=True)
    made = {}
    for entry in entries:
        original = entry.get("thumbnail")
        if not original:
            entry.pop("thumbnailPreview", None)
            continue
        path = (SITE / original.removeprefix("./")).resolve()
        if not path.is_relative_to(SITE) or not path.is_file():
            raise FileNotFoundError(original)
        # Include the file contents so replacing a photo at the same path
        # gives its preview a fresh URL instead of showing a cached old copy.
        digest = hashlib.sha256(original.encode() + path.read_bytes()).hexdigest()
        name = digest[:16] + ".webp"
        preview = OUTPUT / name
        if not preview.exists():
            with Image.open(path) as opened:
                image = ImageOps.exif_transpose(opened)
                image.seek(0)
                image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
                image.thumbnail((384, 384), Image.Resampling.LANCZOS)
                image.save(preview, "WEBP", quality=84, method=6)
        entry["thumbnailPreview"] = "./assets/timeline-thumbs/" + name
        made[name] = original
    DATA.write_text(PREFIX + json.dumps(entries, ensure_ascii=False, indent=2) + ";\n")
    removed = 0
    for path in OUTPUT.glob("*.webp"):
        if path.name not in made:
            path.unlink()
            removed += 1
    originals = sum((SITE / p.removeprefix("./")).stat().st_size for p in made.values())
    previews = sum((OUTPUT / name).stat().st_size for name in made)
    print(f"{len(made)} previews: {originals / 1e6:.1f} MB originals -> {previews / 1e6:.1f} MB; removed {removed} stale previews")


if __name__ == "__main__":
    main()
