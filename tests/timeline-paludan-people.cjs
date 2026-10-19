const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const {timelineEntries}=await import('../content/timeline/entries.js');
 const {findTimelinePeople,extractTimelinePeopleQuery,timelinePerformers}=await import('../assets/timeline-search-people.js');
 const {parseTimelineSearchQuery:parse,matchTimelineResult:match,normalizeTimelineSearch:normalize}=await import('../assets/timeline-search-match.js');
 const batch=JSON.parse(fs.readFileSync('docs/paludan-photo-batch-20261019.json'));
 const galleries=JSON.parse(fs.readFileSync('content/timeline/galleries.json')).entries;
 const people=JSON.parse(fs.readFileSync('content/timeline/people.json')).photos;
 const e=timelineEntries.find(e=>e.date==='2011-11-05'&&e.title.includes('Paludan'));assert.equal(e.group,'word');
 const g=galleries[[e.date,e.category,e.title].join('|')];assert.equal(g.images.length,6);
 const result={entry:e,searchable:normalize(e.title+' '+e.details),images:g.images.map((src,i)=>({src,description:g.imageDescriptions[i],people:people[src]?.people||[]}))};
 const sources=q=>(match(result,parse(q))?.matchedImages||[]).map(i=>i.src).sort();
 assert.deepEqual(sources('Dennis Agerblad'),g.images.slice().sort());
 assert.deepEqual(sources('Tóroddur Poulsen'),g.images.slice(0,5).sort());
 assert.equal(batch.personReview.associations,11);
 for(const label of ['Glemt person','Kunst','Ikke søgbare mennesker']){
  assert.ok(!timelinePerformers.some(p=>p.name===label||p.aliases.includes(label)));
  assert.deepEqual(findTimelinePeople(label),[]);assert.deepEqual(extractTimelinePeopleQuery(label).people,[]);
 }
 assert.deepEqual(sources('Glemt person'),[]);
 for(const name of ['assets/timeline-search-people.js','content/timeline/people.json','content/timeline/galleries.json','assets/site-language-data.js','docs/paludan-photo-batch-20261019.json'])assert.ok(!fs.readFileSync(name,'utf8').includes('Glemt person'));
 console.log('PASS: Dennis matches all six photos, Tóroddur matches the five confirmed photos; private review labels absent from public data and person search.');
})().catch(error=>{console.error(error);process.exitCode=1});
