const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
  const {timelineEntries}=await import('../content/timeline/entries.js');
  const {timelinePerformers}=await import('../assets/timeline-search-people.js');
  const {parseTimelineSearchQuery:parse,matchTimelineResult:match,normalizeTimelineSearch:normalize}=await import('../assets/timeline-search-match.js');
  const read=p=>JSON.parse(fs.readFileSync(p));
  const records=read('content/timeline/people.json').photos;
  const galleries=read('content/timeline/galleries.json').entries;
  const proof=read('docs/timeline-person-corrections-20261021.json');
  const source=fs.readFileSync('assets/site-language-data.js','utf8');
  const english=JSON.parse(source.split('window.DennisEnglish = ')[1].split(';\nwindow.DennisPopupDanish')[0]);
  const results=timelineEntries.map(entry=>{
    const g=galleries[`${entry.date}|${entry.category}|${entry.title}`];
    return {entry,searchable:normalize(entry.title+' '+(entry.details||'')),galleryDetails:g?.details||[],images:(g?.images||[]).map((src,i)=>({src,description:g.imageDescriptions[i],people:records[src.split('?')[0]]?.people||[]}))};
  });
  const expected=Object.entries(records).filter(([,r])=>r.people?.includes('gitte-plads')).map(([src])=>src).sort();
  assert.ok(proof.photos.every(src=>expected.includes(src)),'All previously confirmed photos remain tagged');
  for(const query of ['Gitte Plass','Gitte Plads','Aupair Outrair']) {
    const found=[...new Set(results.flatMap(r=>match(r,parse(query))?.matchedImages||[]).map(i=>i.src.split('?')[0]))].sort();
    assert.deepEqual(found,expected,'Exact same confirmed photos for '+query);
  }
  assert.equal(timelinePerformers.find(p=>p.id==='gitte-plads').name,'Gitte Plass');
  for(const src of expected)assert.ok(['gitte-plads','aupair-outrair'].every(id=>records[src].people.includes(id)));
  for(const g of Object.values(galleries))for(let i=0;i<g.images.length;i++)if(expected.includes(g.images[i].split('?')[0])) {
    assert.ok(g.imageDescriptions[i].includes('Gitte Plass (Aupair Outrair)'));
    assert.ok(english[g.imageDescriptions[i]].includes('Gitte Plass (Aupair Outrair)'));
    assert.ok(!g.imageDescriptions[i].includes('Gitte Plads'));
  }
  assert.ok(!timelineEntries.some(e=>e.date==='2006-05-05'&&e.category==='Film'&&e.title==='Dancing'));
  assert.ok(!read('content/timeline/popup-content.json').entries['2006-05-05|Film|Dancing']);
  const retained=timelineEntries.find(e=>e.date==='2006-05-05'&&e.group==='live');
  assert.ok(retained);
  assert.equal(galleries[`${retained.date}|${retained.category}|${retained.title}`].images.length,4);
  console.log(`PASS: both names and the old spelling find the same ${expected.length} confirmed photos; bilingual alt text agrees; duplicate Dancing removed while the four-photo Scene event remains.`);
})().catch(error=>{console.error(error);process.exitCode=1});
