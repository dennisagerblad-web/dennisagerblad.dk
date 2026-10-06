# Besøgsstatistik for den nye hjemmeside

Den nye `index.html` indlæser `assets/layout-analytics.js`. Scriptet måler
skærm og browservindue, åbning af menupunkter, klik på faner i Tidslinje,
år nået ved scroll samt åbning af tidslinjevinduer med dato og titel.
Det gemmer ikke cookies eller varige besøgs-id'er. Datoen i rapporten er
postens dato, ikke tidspunktet for besøget.

Målingerne sendes til `/_stats/collect`. En Cloudflare Worker i denne mappe
gemmer dem i D1 og viser en adgangsbeskyttet rapport på `/_stats/report`.
Rapporten har perioder på 7, 30 og 90 dage. Lande udledes på serveren.

## Opsætning ved godkendt publicering

Databasen, dens tabeller, Workeren og ruterne er oprettet i Cloudflare.
Den aktive opsætning er gemt i `wrangler.jsonc`. Rapporten kræver stadig,
at hemmeligheden `REPORT_PASSWORD` sættes af ejeren i Cloudflare.
Udgiv hjemmesiden og dens nye indholdskopier, og kontroller derefter en
prøveseance i den private rapport.

Statistikken begynder først at samle data efter publicering. Hvis Workeren
ikke er sat op, har målescriptet ingen synlig virkning på siden.
