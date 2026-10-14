const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const {timelineEntries} = await import('../content/timeline/entries.js');
  const {timelinePerformers,findTimelinePeople:find} = await import('../assets/timeline-search-people.js');
  const {parseTimelineSearchQuery:parse,matchTimelineResult:match,normalizeTimelineSearch:normalize} = await import('../assets/timeline-search-match.js');
  const read = path => JSON.parse(fs.readFileSync(path));
  const review = read('docs/timeline-all-name-confirmations-20261014.json');
  const galleries = read('content/timeline/galleries.json').entries;
  const records = read('content/timeline/people.json').photos;
  const looks = read('content/timeline/own-look-features.json').photos;
  const descriptions = new Map();
  for (const g of Object.values(galleries)) g.images.forEach((src,i) => descriptions.set(src.split('?')[0],g.imageDescriptions[i]));
  const results = timelineEntries.map(entry => {
    const g = galleries[`${entry.date}|${entry.category}|${entry.title}`];
    const biography = (entry.biography || []).filter(p => p.type === 'image');
    const sources = g?.images || entry.images || biography.map(p => p.src);
    const images = sources.map((src,i) => {
      const key = src.split('?')[0], record = records[key];
      const description = g?.imageDescriptions[i] || descriptions.get(key) || record?.description || biography.find(p => p.src === src)?.caption || '';
      return {src,description,people:[...new Set([...(record?.people || []),...find(description)])],look:looks[key],peopleLooks:record?.looks};
    }).filter(p => p.description);
    return {entry,images,galleryDetails:g?.searchDetails || g?.details || [],searchable:normalize(entry.title+' '+entry.details)};
  });
  let checked = 0;
  for (const person of review.people) {
    if (!person.manualPhotoCount) continue;
    const found = new Set(results.flatMap(r => match(r,parse(person.name))?.matchedImages || []).map(p => p.src.split('?')[0]));
    for (const r of review.records.filter(r => r.people.includes(person.id))) {
      assert.ok(found.has(r.src),`${person.name}: ${r.src}`); checked++;
    }
  }
  assert.equal(checked,review.manualNamedAssociations);
  assert.ok(!timelinePerformers.some(p => review.excludedReviewLabels.includes(p.name)));
  for (const word of ['Per','Bob','Blomst','Divine']) {
    assert.deepEqual(find(`En blomst, en bob og et beløb per person. Divine.`),[]);
    const unrelated = {entry:{title:'Et show'},searchable:normalize('Et show'),images:[{src:'unrelated',description:word,people:[]}]};
    assert.equal(match(unrelated,parse(word)),null);
  }
  assert.deepEqual(parse('Søde Car O’lina').people,parse("Søde Car O'lina").people);
  assert.ok(results.map(r => match(r,parse('Dennis Agerblad røde briller'))).filter(Boolean).some(r => r.matchedImages.length));
  assert.ok(!results.some(r => r.entry.date === '2005-06-11' && match(r,parse('Berlin'))));
  console.log(`PASS: ${checked} owner-confirmed associations across ${review.photoCount} photos, including native popups; review labels excluded, common-word names and apostrophes handled, Dennis appearance and Berlin correction preserved`);
})().catch(error => { console.error(error.message); process.exitCode=1; });
