const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {timelineEntries}=await import('../content/timeline/entries.js');
 const {parseTimelineSearchQuery:parse,matchTimelineResult:match,normalizeTimelineSearch:normalize}=await import('../assets/timeline-search-match.js');
 const {findTimelinePeople:find}=await import('../assets/timeline-search-people.js');
 const read=p=>JSON.parse(fs.readFileSync(p));
 const batch=read('docs/sproghoved-photo-batch-20261018.json'),review=batch.personReview;
 const galleries=read('content/timeline/galleries.json').entries,people=read('content/timeline/people.json').photos;
 const english=JSON.parse(fs.readFileSync('assets/site-language-data.js','utf8').split('window.DennisEnglish = ')[1].trim().replace(/;$/,''));
 const entry=timelineEntries.find(e=>e.date==='2011-07-10'&&e.title.includes('Sproghoved'));
 assert.equal(entry.group,'music');assert.equal(entry.gallery,true);
 const gallery=galleries[[entry.date,entry.category,entry.title].join('|')];assert.equal(gallery.images.length,20);assert.equal(gallery.images[0],entry.thumbnail);
 const results=timelineEntries.map(entry=>{const g=galleries[[entry.date,entry.category,entry.title].join('|')];return {entry,searchable:normalize(entry.title+' '+(entry.details||'')),images:(g?.images||[]).map((src,i)=>({src,description:g.imageDescriptions?.[i]||'',people:[...new Set([...(people[src]?.people||[]),...find(g.imageDescriptions?.[i]||'')])]}))}});
 let count=0;
 for(const record of review.records){
  const i=gallery.images.indexOf(record.src);assert.ok(i>=0);assert.equal(gallery.imageDescriptions[i],record.description);assert.equal(english[record.description],record.english);
  for(const name of record.names){assert.ok(results.flatMap(r=>match(r,parse(name))?.matchedImages||[]).some(i=>i.src===record.src),name+': '+record.src);count++;}
 }
 assert.equal(count,32);
 for(const person of review.newPeople){const expected=review.records.filter(r=>r.people.includes(person.id)).map(r=>r.src).sort();const actual=[...new Set(results.flatMap(r=>match(r,parse(person.name))?.matchedImages||[]).map(i=>i.src))].sort();assert.deepEqual(actual,expected,'Exact confirmed image set for '+person.name);}
 for(const src of review.unassignedPhotos)assert.equal(people[src],undefined,'No invented names on unassigned image');
 console.log(`PASS: 20 Sproghoved photos in Musik, all ${count} confirmed photo/name matches, exact seven new name sets, aligned Danish/English descriptions; unassigned photo retained.`);
})().catch(e=>{console.error(e);process.exitCode=1});
