# Timeline popups and galleries

The active site is `index.html`, `assets/site-app.js` and `assets/site.css`. Timeline text and image references live in `content/timeline/entries.js`; curated Scene and Kunst slideshow content lives in `content/timeline/galleries.json`. The older Vite app in `migration-tools/dennis-github-app` predates the September 2026 changes and must not be rebuilt over this version. See the site root `README.md` for the current editing workflow.

The popup is implemented in `assets/timeline-gallery.js` and `assets/timeline-gallery.css`. There are three named effects in `galleryEffects`, selected by `timelineEffects`:

- **Grow**: the approved organic vertical center stretch. Preserved in the shader and selectable with `live:'Grow'`. The full previously approved module and CSS are also saved in `presets/grow-approved/` (not loaded by the site).
- **Paint**: the approved horizontal image-based effect on Kunst, adapted from paniq's MIT GL Transitions shader. Its shader and 1100 ms smoothstep timing are unchanged. See `assets/timeline-gallery-LICENSE.txt`.
- **Morph**: the active Scene effect. Full-resolution arithmetic RGB means from each photo displace the OTHER photo vertically. Old sampling is `y - direction * intensity * newLight * progress`; new sampling is `y - direction * intensity * oldLight * (1-progress)`. With top-down UV coordinates, the old photo moves down while the new photo starts displaced down and moves up into place. Previous-image navigation mirrors both directions, preserving their opposing movement. Edges clamp/repeat. Intensity is 0.3, configurable up to 2. No external noise or blurred flow maps are used for Morph.

Grow and Morph use the same 1000 ms sine easing, `0.5 - cos(t * PI) / 2`, for displacement and fade. Pointer drags scrub progress directly; release eases over the remaining fraction. Reversal, cancellation, keyboard navigation and reduced motion are supported. No UI Initiative code is included, and there are no paid dependencies.

Each event gets an independent gallery. Its popup heading is `title`, with descriptions below it. Credits stay above the photo; an associated video is embedded directly before the photo instead of hidden behind a “Se videoen” control. The added “Se det oprindelige arkiv” link was removed. The only visible image controls are two white chevrons. No count, footer strip or fit toggle is shown.

Desktop retains its existing majority-orientation layout. Mobile slideshow geometry is computed once for the whole gallery and stays fixed through every image change, animation, drag cancellation and image load. Do not size a popup from the selected slide. Rotation is the only reason to recalculate mobile geometry; Safari toolbar-height changes do not resize an open popup.

In mobile portrait the popup uses the full viewport width minus the existing 16px outer margins. Its image area's desired height comes from the tallest image in the series, capped by the visible viewport after the header and 20px inner padding. In mobile landscape the popup uses the available viewport height minus 20px outer margins on each edge; its width is solved from the widest image and the wrapped header. Portrait-only series therefore get a narrower landscape popup. Every photograph is proportionally contained at the largest size within this fixed frame, retaining the complete image. Multiple-image galleries retain their transition backdrop; single images have none. Header overflow is scrollable so images retain space. These rules were clarified by Dennis on 2026-10-14.

## Rebuilding media metadata

Run `python3 tools/timeline-gallery/prepare.py` from the site with Pillow installed. It reads `content/timeline/entries.js`, preserves existing edited slideshow text and slide order in `galleries.json`, adds new galleries, and refreshes image dimensions in the generated `image-metadata.json`. It reuses the committed offline face bounds in `faces.json`. Diagnostic outputs go to `/tmp/timeline-current.json` and `/tmp/timeline-gallery-images.json`.

To re-analyze photos on macOS, run:

```sh
swift -module-cache-path /tmp/timeline-swift-cache tools/timeline-gallery/focus.swift /tmp/timeline-gallery-images.json /tmp/timeline-gallery-faces.json
```

Vision needs access to macOS image services; a restrictive sandbox can return CVPixelBuffer errors. Do not treat those as successful scans. The Swift output has absolute filename keys; convert them to `./`-relative site paths before updating `faces.json`, then rerun `prepare.py`. No photos are uploaded. The existing face scan found faces in 889 of 1152 unique image files.

## Validation

Run `node tools/timeline-gallery/verify-motion.mjs` for deterministic clock/input checks of Scene timing, scrubbing, reversal, cancellation and reduced-motion fallback.

Run `node tools/timeline-gallery/verify-geometry.mjs` for data-driven checks covering all populated galleries: majority orientation across viewports, order-independent sizing, proportional fill and top/face-prioritized crop behavior.

Serve the site on `http://127.0.0.1:8765` and run `node tools/timeline-gallery/verify.cjs` with `PLAYWRIGHT_PATH` pointing to an installed Playwright module if needed. Uses a separate headless Chrome profile. Covers desktop, portrait and landscape, heading equality, independent sliders, keyboard/close/focus restoration, reduced motion, failed images, crop geometry, old archive galleries and unchanged music popups. Screenshots go to `/tmp/timeline-*.png`.

The September 25 revision was also visually checked with the in-app browser at desktop, portrait and landscape sizes, including live transition frames against the reference demo.

The island year lists are defined per category in the active bundle. Their clicks jump directly to the matching year so Presse 1970 works on the first click. Four older Ord entries are classified under Presse, and the duplicate 2019 Sufi Dark Pop Poetry entry is hidden from Ord. All popup overlays use a theme-specific black tint at 50% opacity.

Existing unrelated untracked bundles were left intact.

## Searchable people and new uploads

For every future upload containing people, ask Dennis which depicted people should be searchable. Use his confirmed names or existing explicit photo captions to identify people. Never assign an identity from facial resemblance, a filename, styling credits or an event's guest list alone. Review each actual website image for useful visible search features; ordinary appearance filters continue to describe Dennis's own look. Do not infer absence from an unclear view.

Names and aliases are defined in `assets/timeline-search-people.js`. Confirmed photo associations live in `content/timeline/people.json`; descriptions remain in the image's Danish alt text in `galleries.json`, with English alt translations kept in step. Do not add descriptive paragraphs or captions to visible event copy. Ambiguous artist names such as Blomst and Areal need explicit people records rather than automatic ordinary-word matches. Keep source evidence in the dated people review document. An event mention can find the event; only a confirmed pictured identity can select a search-result photo.

When adding or reviewing images, preserve originals, check dimensions and file size, optimize website copies, update own-look facts and search thumbnails, and run `tests/timeline-image-search.cjs`. As requested by Dennis on 2026-10-14, publish Timeline changes after each completed edit without asking for a separate release approval. Verify the public deployment and changed assets before reporting them live. This standing authorization applies to Timeline work.

For nudity searches, inspect the specific image. Dennis approved including anatomy represented by his costumes on 2026-10-13. Real anatomy uses `nude`, `torso`, `penis`, `bum`; visible costume representations use `costumenude`, `costumepenis`, `costumebum`. `nøgenhed`, `pik`/`penis` and `røv`/`balder` search both kinds, with alt text explicitly identifying costume depictions. A crop showing only the upper body cannot match penis, and a front view cannot imply visible buttocks. Titles, printed words, generic props, obscured parts never establish a match. On 2026-10-14 Dennis requested that unqualified anatomy searches include all pictured people. Reviewed per-person anatomy is recorded in `content/timeline/body-features.json`; unidentified adults may be described without assigning a name. Named-person and combined appearance queries must keep the requested facts on that same person. Ordinary appearance queries still describe Dennis unless another person is named. Add the factual Danish alt clause and its English translation without adding visible caption text.

Hair colour must refer to Dennis's visibly exposed hair or hair wig in the specific photo, independently of clothing, a hat, costume fringe or other people. Use `hblack` only for visibly black hair, and `hdark` for dark hair of uncertain exact shade. Hidden hair gets no length, colour or wig facts; an unclear colour gets no colour fact. Never copy appearance facts across an event's photos. Record reviewed colour corrections and aligned Danish/English alt descriptions in the dated hair-review document.

Video content is indexed separately in `content/timeline/video-look-features.json`, keyed by the entry's videoId. Explicit first-party content confirmation by Dennis is valid evidence; record that source honestly. Do not infer video facts from its thumbnail, or thumbnail appearance from the video. A video match uses its actual poster alt description, opens its existing native popup, and leaves playback under user control.

Use `hblond` for explicitly blonde hair/wigs and `hgray` for grey ones. `lyst hår` describes lightness; `blond hår` excludes grey hair even when the grey hair is also light. `sort hår` requires an explicit `hair:black` fact and cannot borrow black clothing or a black hat.
