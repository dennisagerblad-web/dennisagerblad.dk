# Billedbeskrivelser til tidslinjen

Arbejdslisten indeholder hver billedplacering, dens posttitel, billedsti og nummer. Beskriv det synlige indhold og den funktion, billedet har i posten. Identificer ikke personer, steder eller begivenheder ud fra gæt. Undgå at gentage hele postteksten.

1. Åbn billedet og læs postens tekst.
2. Skriv en kort dansk beskrivelse i `beskrivelse`.
3. Kontroller beskrivelsen mod billedet. Sæt `status` til `Godkendt`, når teksten er færdigredigeret. Det er en redaktionel status, ikke godkendelse af offentliggørelse.
4. Importer lokalt:

```sh
python3 tools/accessibility/import-descriptions.py docs/billedbeskrivelser-arbejdsliste.csv
```

Kun godkendte rækker importeres til postens `imageDescriptions`. Ved ukendte poster, ændrede billedstier, dubletter, tomme godkendte tekster eller konflikter med eksisterende beskrivelser bliver hele importen afvist inden skrivning. Billeder og historiske HTML-sider ændres ikke.

Galleriet bruger postens beskrivelse for det aktuelle billede. En beskrivelse i billedmetadata kan bruges som fælles fallback. Hvis ingen beskrivelse findes, bruges stadig posttitlen og billednummeret; denne fallback er ikke bevis for opfyldelse af 1.1.1.

Importen og ændringer i galleries.json skal cacheversioneres i `assets/timeline-gallery.js` før udgivelse. Alle AA-ændringer holdes fortsat lokale.
