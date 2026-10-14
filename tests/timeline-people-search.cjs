const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const {timelinePerformers,findTimelinePeople:find}=await import('../assets/timeline-search-people.js');
 const {parseTimelineSearchQuery:parse,matchTimelineResult:match,normalizeTimelineSearch:normalize}=await import('../assets/timeline-search-match.js');
 const {timelineEntries}=await import('../content/timeline/entries.js');
 const galleries=JSON.parse(fs.readFileSync('content/timeline/galleries.json')).entries;
 const photoRecords=JSON.parse(fs.readFileSync('content/timeline/people.json')).photos;
 const facts=JSON.parse(fs.readFileSync('content/timeline/own-look-features.json')).photos;
 const results=timelineEntries.map(entry=>{
  const gallery=galleries[`${entry.date}|${entry.category}|${entry.title}`];
  const details=gallery?.details || [];
  const images=(gallery?.images || []).map((src,i)=>({src,description:gallery.imageDescriptions[i],people:[...new Set([...(photoRecords[src.split('?')[0]]?.people || []),...find(gallery.imageDescriptions[i])])],look:facts[src.split('?')[0]]}));
  return {entry,galleryDetails:details,searchable:normalize([entry.title,entry.details,...details].join(' ')),people:find([entry.title,entry.details,...details].join(' ')),images};
 });
 const search=q=>results.map(r=>match(r,parse(q))).filter(Boolean);
 for(const p of timelinePerformers)for(const alias of p.aliases)assert.ok(parse(alias).people.includes(p.id),alias);
 for(const aliases of [['Danny Boy','Daniel Svanberg Bøtcher'],['Moma Van Vest','Knud Vesterskov'],['Florence','Florince','Florance'],['Hairwerk Hugh Mongues','Hairwerk Hugh Mongous']]) {
  const titles=aliases.map(q=>search(q).map(r=>r.entry.title));assert.ok(titles[0].length);titles.forEach(t=>assert.deepEqual(t,titles[0]));
 }
 assert.ok(search('Tove Hansen').some(r=>r.matchedImages.length));
 assert.ok(search('Gina La Mirage').some(r=>r.matchedImages.length));
 assert.deepEqual(search('flo').map(r=>r.entry.title),search('Florence').map(r=>r.entry.title));
 assert.deepEqual(find('En lilla blomst på et stort areal.'),[]);
 assert.deepEqual(find('Ariel optræder.'),['areal'],'Correct drag name keeps existing photo identity');
 assert.deepEqual(parse('Ariel').people,['areal']);
 assert.deepEqual(parse('Areal').people,[],'Incorrect spelling is not a performer name');
 assert.ok(search('Blomst').some(r=>r.matchedImages.length),'Owner-confirmed Blomst photos are searchable');
 assert.equal(match({entry:{title:'En blomst på scenen'},searchable:normalize('En blomst på scenen'),images:[{src:'flower',description:'En blomst.',people:[]}]},parse('Blomst')),null,'Ordinary flowers cannot identify the performer');
 assert.ok(parse('blomster').terms.length,'Ordinary flower query remains ordinary text');
 assert.deepEqual(find('Gina Jet'),[],'Different Gina must not count as Gina La Mirage');
 const fixture={entry:{title:'Fest med Hairwerk'},searchable:normalize('Fest med Hairwerk'),people:['hairwerk'],images:[{src:'dennis',description:'Dennis med røde briller',people:[],look:{reviewed:true,subject:'dennis',tags:['glasses:red']}}]};
 assert.equal(match(fixture,parse('Hairwerk')).matchedImages.length,0,'Mention is not photo identity');
 assert.equal(match(fixture,parse('Hairwerk røde briller')),null,'Never borrow Dennis appearance');
 fixture.images.push({src:'hairwerk',description:'Hairwerk',people:['hairwerk'],peopleLooks:{hairwerk:{reviewed:true,subject:'hairwerk',tags:['glasses:red']}}});
 assert.deepEqual(match(fixture,parse('Hairwerk røde briller')).matchedImages.map(i=>i.src),['hairwerk']);
 console.log('PASS: all registered performer names, stage/legal aliases, partial name suggestions, legacy captions, same-image identities, no flower or other-person appearance false positives');
 console.log(JSON.stringify(Object.fromEntries(timelinePerformers.map(p=>[p.name,{entries:search(p.aliases[0]).length,photos:search(p.aliases[0]).reduce((n,r)=>n+r.matchedImages.length,0)}])),null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
