# Metadata on modern pages

Every new public landing page needs a unique concise title and description, a canonical URL, Open Graph and Twitter card metadata with an appropriate compressed image and image alt text, and accurate JSON-LD reflecting the visible content. Register the page in pages.json and sitemap.xml. Update lastmod only when its actual content changes. Preserve historic index1–4 pages and their folders.

Run `python3 tools/seo/check.py` before release. The check covers the current three modern page URLs and does not prove indexing, ranking, rich result eligibility or social-platform rendering.

The Talent page describes its videos as CreativeWork entries. VideoObject rich results need verified video upload dates and other required fields; do not use performance dates as upload dates. Popup share URLs currently use the homepage metadata, rather than a distinct server-rendered social card per timeline entry. Review this separately before promising individual popup previews.
