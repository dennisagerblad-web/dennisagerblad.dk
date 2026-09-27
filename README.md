# Dennis Agerblad – vedligeholdelse af hjemmesiden

`index.html` er indgangen til den offentliggjorte hjemmeside. Den aktive
app ligger i `assets/site-app.js` og `assets/site.css`. De gamle
genererede bundles er fjernet fra arbejdsfilstrukturen; Git-historikken gemmer
tidligere versioner.

## Hvor redigeres tidslinjen?

| Indhold | Fil eller mappe |
| --- | --- |
| Datoer, overskrifter, kategorier, brødtekst, videoer og billedhenvisninger | `content/timeline/entries.js` |
| Rækkefølge, tekst og originalbilleder i Scene- og Kunst-slideshows | `content/timeline/galleries.json` |
| Automatisk målte billedformater og fokusdata | `content/timeline/image-metadata.json` |
| De store billeder | `archive/timeline/` eller deres eksisterende arkivmapper |
| Små, automatisk fremstillede tidslinjebilleder | `assets/timeline-thumbs/` |
| Tidslinjens popups, effekter og layout | `assets/timeline-gallery.js` og `assets/timeline-gallery.css` |
| Talebobler | `assets/timeline-speech.js` og billedfilerne i `assets/` |

`thumbnail` i en post peger på originalen, der kan bruges i en popup.
`thumbnailPreview` peger på den lille WebP-udgave til tidslinjens oversigt.
Samme original får altid samme forhåndsvisning. Previewfilerne kan genskabes
med `python3 tools/timeline-gallery/optimize_thumbnails.py`; scriptet sletter
også previews, der ikke længere er i brug. Kræver Pillow.

Hvis en ny Scene- eller Kunst-post har billeder, køres
`python3 tools/timeline-gallery/prepare.py` efter redigering af `entries.js`.
Det føjer nye gallerier til `galleries.json` og opdaterer den tekniske fil
`image-metadata.json`, men bevarer allerede redigerede tekster og
billedrækkefølger. Gennemgå derefter den nye post i `galleries.json`. Kør
preview-scriptet til sidst.

Ved ændringer i `entries.js` skal versionsparameteren i importen øverst i
`assets/site-app.js` øges. Ved ændringer i `galleries.json` eller
`image-metadata.json` skal versionsparameteren ved `fetch()` i
`assets/timeline-gallery.js` øges. Ved
ændringer i JavaScript-filerne øges deres versionsparameter i `index.html`
eller importen i bundle-filen. Det sikrer, at besøgende får den nye version
med det samme, selv hvis deres browser har gemt en ældre kopi.

De gamle sider i `200_calendar/`, `onewebmedia/` og lignende mapper er et
separat historisk arkiv. Deres filadresser er bevaret, fordi gamle links og
slideshowposter stadig kan bruge dem. De hentes ikke samlet, når forsiden
åbnes. Undlad at flytte eller slette dem uden at kontrollere henvisningerne.
