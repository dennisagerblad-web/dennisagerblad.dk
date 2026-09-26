# Timeline popups and galleries

The active site is `index.html` plus the bundle it references (`assets/index-281e0f92.js` at this revision). The older Vite app in `migration-tools/dennis-github-app` predates the September 2026 changes. Rebuilding it would overwrite newer content. The current bundle imports the readable module `assets/timeline-gallery.js`. The other categories retain their archive, video and release content inside popups with the same title-first header.

The popup is implemented in `assets/timeline-gallery.js` and `assets/timeline-gallery.css`. There are three named effects in `galleryEffects`, selected by `timelineEffects`:

- **Grow**: the approved organic vertical center stretch. Preserved in the shader and selectable with `live:'Grow'`. The full previously approved module and CSS are also saved in `presets/grow-approved/` (not loaded by the site).
- **Paint**: the approved horizontal image-based effect on Kunst, adapted from paniq's MIT GL Transitions shader. Its shader and 1100 ms smoothstep timing are unchanged. See `assets/timeline-gallery-LICENSE.txt`.
- **Morph**: the active Scene effect. Full-resolution arithmetic RGB means from each photo displace the OTHER photo vertically. Old sampling is `y - direction * intensity * newLight * progress`; new sampling is `y - direction * intensity * oldLight * (1-progress)`. With top-down UV coordinates, the old photo moves down while the new photo starts displaced down and moves up into place. Previous-image navigation mirrors both directions, preserving their opposing movement. Edges clamp/repeat. Intensity is 0.3, configurable up to 2. No external noise or blurred flow maps are used for Morph.

Grow and Morph use the same 1000 ms sine easing, `0.5 - cos(t * PI) / 2`, for displacement and fade. Pointer drags scrub progress directly; release eases over the remaining fraction. Reversal, cancellation, keyboard navigation and reduced motion are supported. No UI Initiative code is included, and there are no paid dependencies.

Each event gets an independent gallery. Its popup heading is `title`, with descriptions below it. Credits stay above the photo; an associated video is embedded directly before the photo instead of hidden behind a “Se videoen” control. The added “Se det oprindelige arkiv” link was removed. The only visible image controls are two white chevrons. No count, footer strip or fit toggle is shown.

The majority of portrait or landscape photos determines the frame orientation on every platform, using the geometric mean of the winning photos' aspect ratios. Squares are neutral; tied counts follow the viewport orientation. All photos fill this stable frame using proportional cover cropping. Vertical cropping starts at the top; detected faces can shift the crop just enough to retain them. If all faces cannot fit horizontally, the largest face is prioritized. Face detection is approximate; not every person can fit into a narrow crop. Overrides may supply `focus` / `faces` in the media manifest.

Popup dimensions fit the available viewport without a fixed maximum width. Text has a bounded, scrollable header (34% of viewport height, at most 320 px) so long descriptions cannot squeeze away the photograph. Portrait series retain their format on landscape screens and vice versa. Rotation recalculates available space. The photo meets both sides and the bottom of the popup. Blurred backdrop composition remains available as a fallback, but normal cover rendering fills the entire frame.

## Rebuilding media metadata

Run `python3 tools/timeline-gallery/prepare.py` from the site with Pillow installed. It reads the current bundle referenced by index.html; it does not alter the timeline data. It reuses the committed offline face bounds in `faces.json`. Outputs: the gallery manifest, `/tmp/timeline-current.json` and `/tmp/timeline-gallery-images.json`.

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
