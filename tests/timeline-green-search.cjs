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
 const green=hits('grøn');assert.ok(green.length);
 assert.deepEqual(hits('grønt').map(r=>r.entry.title),green.map(r=>r.entry.title));
 for(const date of ['2004-10-23','2003-10-30'])assert.ok(!green.some(r=>r.entry.date===date),date+' neutral clothing should not match green');
 assert.ok(green.some(r=>r.entry.date==='2024-08-10'),'Neon green costume is preserved');
 assert.ok(hits('grønne briller').some(r=>r.entry.title.includes('Leitisstein')),'Clearly green glasses are preserved');
 assert.ok(green.every(r=>r.matchedImages.every(i=>i.look.reviewed && i.look.subject==='dennis')));
 console.log(`PASS: ${green.length} green events; both reported false positives excluded; neon green costume and green glasses preserved`);
})().catch(e=>{console.error(e);process.exitCode=1});
