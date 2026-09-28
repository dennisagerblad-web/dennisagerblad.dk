"""Refresh timeline popup metadata and compact previews after adding photos.

Run this after new image paths have been added to content/timeline/entries.js.
Full-resolution files remain available to popup galleries; the generated
timeline-only WebP previews are small enough to load quickly on phones.
"""

from pathlib import Path
import subprocess
import sys


SITE = Path(__file__).resolve().parents[2]
TOOLS = Path(__file__).resolve().parent


def main():
    for script in ("prepare.py", "optimize_thumbnails.py"):
        subprocess.run([sys.executable, str(TOOLS / script)], cwd=SITE, check=True)


if __name__ == "__main__":
    main()
