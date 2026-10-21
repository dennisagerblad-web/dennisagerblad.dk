const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const {timelineEntries} = await import('../content/timeline/entries.js');
  const {parseTimelineSearchQuery:parse, matchTimelineResult:match, normalizeTimelineSearch:normalize} = await import('../assets/timeline-search-match.js');
  const {findTimelinePeople:find} = await import('../assets/timeline-search-people.js');
  const read = p => JSON.parse(fs.readFileSync(p));
  const proof = read('docs/timeline-person-confirmations-20261018.json');
  const galleries = read('content/timeline/galleries.json').entries;
  const records = read('content/timeline/people.json').photos;
  const englishRaw = fs.readFileSync('assets/site-language-data.js','utf8');
  const english = JSON.parse(englishRaw.split('window.DennisEnglish = ')[1].split(';\nwindow.DennisPopupDanish')[0]);
  const results = timelineEntries.map(entry => {
    const g = galleries[`${entry.date}|${entry.category}|${entry.title}`];
    return {entry,searchable:normalize(entry.title+' '+entry.details),galleryDetails:g?.details || [],images:(g?.images || []).map((src,i)=>({src,description:g.imageDescriptions[i],people:[...new Set([...(records[src.split('?')[0]]?.people || []),...find(g.imageDescriptions[i])])]}))};
  });
  let checked=0;
  for (const record of proof.records) {
    const images=results.flatMap(r=>r.images).filter(i=>i.src.split('?')[0]===record.src);
    assert.ok(images.length,record.src+' in a gallery');
    for (const name of record.names) {
      const found=new Set(results.flatMap(r=>match(r,parse(name))?.matchedImages || []).map(i=>i.src.split('?')[0]));
      assert.ok(found.has(record.src),name+': '+record.src);
      assert.ok(images.every(i=>i.description.includes(name)),name+' in Danish alt');
      assert.ok(images.every(i=>english[i.description]?.includes(name)),name+' in English alt');
      checked++;
    }
  }
  assert.equal(checked,proof.manualNamedAssociations);
  for (const name of ['Vera','Rune Gartner']) {
    const expected=proof.records.filter(r=>r.names.includes(name)).map(r=>r.src).sort();
    const actual=[...new Set(results.flatMap(r=>match(r,parse(name))?.matchedImages || []).map(i=>i.src.split('?')[0]))].sort();
    assert.deepEqual(actual,expected,'Only explicitly tagged photos for '+name);
  }
  for (const src of proof.photosWithoutSelectedNames) assert.equal(records[src],undefined,'Unmarked photo has no invented identity');
  console.log(`PASS: all ${checked} confirmed name/photo searches, Danish and English alt text, and exact Vera/Rune photo sets; unmarked photos remain unassigned.`);
})().catch(e=>{console.error(e);process.exitCode=1});
