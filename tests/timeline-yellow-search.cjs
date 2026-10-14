const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const {timelineEntries}=await import('../content/timeline/entries.js');
 const {parseTimelineSearchQuery:parse,matchTimelineResult:match,normalizeTimelineSearch:normalize}=await import('../assets/timeline-search-match.js');
 const galleries=JSON.parse(fs.readFileSync('content/timeline/galleries.json')).entries;
 const facts=JSON.parse(fs.readFileSync('content/timeline/own-look-features.json')).photos;
 const results=timelineEntries.map(entry=>{
  const g=galleries[`${entry.date}|${entry.category}|${entry.title}`];
  return {entry,searchable:normalize([entry.title,entry.details,entry.date].join(' ')),images:(g?.images||[]).map((src,i)=>({src,description:g.imageDescriptions[i],look:facts['./'+decodeURIComponent(src).replace(/^\.\//,'')]}))};
 });
 const hits=q=>results.map(r=>match(r,parse(q))).filter(Boolean);
 const yellow=hits('gult');
 assert.ok(yellow.length);
 assert.deepEqual(hits('gul').map(r=>r.entry.title),yellow.map(r=>r.entry.title));
 for(const date of ['2003-02-08','2003-01-12','2005-05-30','2019-02-22'])assert.ok(!yellow.some(r=>r.entry.date===date),date+' should not match yellow lighting, blond hair, skin or neutral clothing');
 assert.ok(!yellow.some(r=>r.entry.title.includes('Leitisstein')),'Olive-green radio clothing is not yellow');
 assert.ok(yellow.some(r=>r.entry.date==='2024-10-18'),'Actual yellow feather costume remains searchable');
 assert.ok(yellow.some(r=>r.entry.date==='2022-04-23'),'Actual yellow stage dress remains searchable');
 assert.ok(hits('gule stiletter').some(r=>r.entry.date==='2006-07-03'),'Yellow shoes remain searchable');
 assert.ok(!hits('gul kjole').some(r=>r.entry.date==='2006-07-03'),'Yellow shoes must not imply a yellow dress');
 assert.ok(hits('grønt').some(r=>r.entry.title.includes('Leitisstein')),'Corrected olive-green clothing is searchable');
 assert.ok(hits('pink').some(r=>r.entry.date==='2019-02-22'),'Pink costume has the correct colour');
 assert.ok(yellow.every(r=>r.matchedImages.every(i=>i.look.reviewed && i.look.subject==='dennis')));
 console.log(`PASS: ${yellow.length} yellow events; reported false positives excluded; actual yellow costumes, shoes and corrected olive/pink colours preserved`);
})().catch(e=>{console.error(e);process.exitCode=1});
