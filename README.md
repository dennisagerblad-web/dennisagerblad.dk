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
| Talebobler | `assets/timeline-speech.js`, `assets/video-speech.js` og billedfilerne i `assets/` |

`thumbnail` i en post peger på originalen, der kan bruges i en popup.
`thumbnailPreview` peger på den lille WebP-udgave til tidslinjens oversigt.
Samme original får altid samme forhåndsvisning. Når der kommer nye fotos til
tidslinjen, opdaterer jeg deres metadata og previewbilleder som en fast del af
arbejdet. Den samlede arbejdsgang kan køres med
`python3 tools/timeline-gallery/prepare_new_photos.py`; den opretter små WebP-
forhåndsvisninger til tidslinjen og fjerner forældede previews uden at ændre
popuporiginalerne. Kræver Pillow.

Hvis en ny Scene- eller Kunst-post har billeder, køres
`python3 tools/timeline-gallery/prepare_new_photos.py` efter redigering af `entries.js`.
Det føjer nye gallerier til `galleries.json` og opdaterer den tekniske fil
`image-metadata.json`, men bevarer allerede redigerede tekster og
billedrækkefølger. Gennemgå derefter den nye post i `galleries.json`. Den
samlede kommando udfører også preview-trinnet.

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


## Offentligt galleri, 1. oktober 2026
Kunst åbner Galleri 1. Navigationen indeholder kun Galleri 1, Gang og Galleri 2. Galleri 0 findes kun i den lokale kunst2-proeve-mappe og må aldrig genindføres offentligt. Fotografiske rumlag styres i assets/art-versions.js og assets/art-versions.css. Kunstværker og popupvisning styres i assets/art-viewer.js; originalerne i archive/art og content/art/originals skal bevares uændret ved senere rumredigering.

Galleri 1 er rummet med keramik og katteværket; Galleri 2 er rummet med tøjinstallationen. Rækkefølgen er Galleri 1, Gang, Galleri 2. På mobil følger rummene et vandret træk, og kunsten bliver indlæst før overgangen starter.
