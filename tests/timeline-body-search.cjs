const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {parseTimelineSearchQuery:parse,matchTimelineResult:match,normalizeTimelineSearch:normalize}=await import('../assets/timeline-search-match.js');
 const {timelineEntries}=await import('../content/timeline/entries.js');
 const g=JSON.parse(fs.readFileSync('content/timeline/galleries.json')).entries;
 const f=JSON.parse(fs.readFileSync('content/timeline/own-look-features.json')).photos;
 const inventory=JSON.parse(fs.readFileSync('docs/timeline-look-review-inventory-20261013.json'));
 const report=JSON.parse(fs.readFileSync('docs/timeline-body-search-review-20261013.json'));
 const real=timelineEntries.map(entry=>{
  const gallery=g[`${entry.date}|${entry.category}|${entry.title}`];const details=gallery?.details || [];
  return {entry,galleryDetails:details,searchable:normalize([entry.title,entry.details,entry.date,entry.display,entry.year,...details].join(' ')),images:(gallery?.images||[]).map((src,i)=>({src,description:gallery.imageDescriptions[i],look:f[src.split('?')[0]]}))};
 });
 const search=q=>real.map(r=>match(r,parse(q))).filter(Boolean);
 const sources=q=>search(q).flatMap(r=>r.matchedImages.map(i=>i.src));
 assert.deepEqual(sources('pik'),sources('penis'));
 assert.deepEqual(sources('røv'),sources('bare balder'));
 assert.deepEqual(sources('nøgenhed'),sources('nøgen'));
 assert.equal(new Set(sources('pik')).size,15);
 assert.equal(new Set(sources('røv')).size,9);
 assert.equal(new Set(sources('nøgenhed')).size,33);
 assert.ok(search('Sang Pik Nok').some(r=>r.entry.date==='2019-05-17'),'Song-title queries still work');
 assert.ok(search('Stiv pik til alle').some(r=>r.entry.group==='art'),'Printed phrase queries still work');
 for(const id of [14,77,214,838,917,1115,1118,1119,1253,1257]) {
  assert.ok(!sources('pik').includes(inventory[id].src),'Only a visibly depicted penis matches: '+id);
 }
 assert.ok(!sources('røv').includes(inventory[809].src),'Front of opaque briefs is not bare buttocks');
 const fixture={entry:{title:'Pik og røv'},searchable:normalize('Pik og røv'),images:[
  {src:'costume',description:'En penisrekvisit og røv på en plakat.',look:{reviewed:true,subject:'dennis',tags:['clothing:nylon-costume']}},
  {src:'other',description:'Synlig penis',look:{reviewed:true,subject:'context',tags:['body:penis-visible']}},
  {src:'bare-torso',description:'Dennis med bar overkrop',look:{reviewed:true,subject:'dennis',tags:['body:bare-torso','nudity:visible']}}
 ]};
 assert.equal(match(fixture,parse('pik')),null);
 fixture.images[0].look.tags.push('costume:penis','costume:nudity');
 assert.deepEqual(match(fixture,parse('pik')).matchedImages.map(i=>i.src),['costume']);
 fixture.images[0].look.tags=fixture.images[0].look.tags.filter(t=>!t.startsWith('costume:'));assert.equal(match(fixture,parse('røv')),null);
 assert.deepEqual(match(fixture,parse('nøgenhed')).matchedImages.map(i=>i.src),['bare-torso']);
 assert.deepEqual(sources('pik og røv'),sources('pik').filter(src=>sources('røv').includes(src)),'Same-image combination');
 assert.ok(search('pik 2005').every(r=>r.entry.year===2005));
 assert.ok(search('røv grønne briller').every(r=>r.matchedImages.every(i=>i.look.tags.includes('glasses:green'))));
 for(const r of report.photos){assert.ok(f[r.src].subject==='dennis');r.tags.forEach(tag=>assert.ok(f[r.src].tags.includes(tag)));}
 for(const r of report.costumePhotos){assert.ok(f[r.src].subject==='dennis');r.tags.forEach(tag=>assert.ok(f[r.src].tags.includes(tag)));}
 for(const id of [276,1047,1048,1049,1050,1113,1114,1116,1117,1120])assert.ok(sources('pik').includes(inventory[id].src),'Approved costume penis '+id);
 assert.ok(sources('røv').includes(inventory[1118].src),'Approved costume buttocks');
 assert.ok(!sources('røv').includes(inventory[1114].src),'Front view does not prove backside');
 assert.ok(search('pik 2002').length===2);
 assert.equal(report.awaitingCostumeClarification.length,0);
 console.log('PASS: real and approved costume anatomy, aliases, same-photo combinations, Dennis-only subject, no prop/word/opaque underwear matches and preserved named song/poster queries');
 for(const q of ['nøgenhed','pik','røv'])console.log(q+': '+search(q).length+' events, '+new Set(sources(q)).size+' unique photos; '+search(q).map(r=>r.entry.date+' '+r.entry.title).join(' | '));
})().catch(e=>{console.error(e);process.exitCode=1});
