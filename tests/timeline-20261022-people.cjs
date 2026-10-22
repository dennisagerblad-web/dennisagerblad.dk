const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
  const {timelineEntries}=await import('../content/timeline/entries.js');
  const {timelinePerformers}=await import('../assets/timeline-search-people.js');
  const {parseTimelineSearchQuery:parse,matchTimelineResult:match,normalizeTimelineSearch:normalize}=await import('../assets/timeline-search-match.js');
  const read=p=>JSON.parse(fs.readFileSync(p));
  const proof=read('docs/timeline-person-confirmations-20261022.json');
  const galleries=read('content/timeline/galleries.json').entries,records=read('content/timeline/people.json').photos;
  const english=JSON.parse(fs.readFileSync('assets/site-language-data.js','utf8').split('window.DennisEnglish = ')[1].split(';\nwindow.DennisPopupDanish')[0]);
  const results=timelineEntries.map(entry=>{
    const g=galleries[`${entry.date}|${entry.category}|${entry.title}`];
    return {entry,searchable:normalize(entry.title+' '+(entry.details||'')),galleryDetails:g?.details||[],images:(g?.images||[]).map((src,i)=>({src,description:g.imageDescriptions[i],people:records[src.split('?')[0]]?.people||[]}))};
  });
  const searchPhotos=name=>new Set(results.flatMap(r=>match(r,parse(name))?.matchedImages||[]).map(i=>i.src.split('?')[0]));
  let checked=0;
  for(const record of proof.records){
    for(const name of record.addedNames){
      assert.ok(searchPhotos(name).has(record.src),`${name}: ${record.src}`);
      assert.ok(record.da.includes(name)&&record.en.includes(name),'Both alt languages preserve '+name);
      checked++;
    }
    const image=results.flatMap(r=>r.images).find(i=>i.src===record.src);
    assert.equal(image.description,record.da);
    assert.equal(english[image.description],record.en);
  }
  assert.equal(checked,proof.addedAssociations);
  for(const person of proof.newPeople){
    const expected=proof.records.filter(r=>r.people.includes(person.id)).map(r=>r.src).sort();
    assert.deepEqual([...searchPhotos(person.name)].sort(),expected,'Only owner-selected photos for '+person.name);
  }
  for(const name of ['Kunst','Glemt person','Ikke søgbare mennesker','Ninna Fedder Helsinghoff']){
    assert.ok(!timelinePerformers.some(p=>p.name===name));
    assert.ok(!JSON.stringify(proof).includes(name),'No private labels or withdrawn name in public proof');
  }
  console.log(`PASS: ${checked} additional confirmed name/photo searches on ${proof.photosChanged} photos; exact photo sets for five new people; bilingual descriptions agree and private labels remain private.`);
})().catch(error=>{console.error(error);process.exitCode=1});
