const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {timelineEntries:entries}=await import('../content/timeline/entries.js');
 const read=p=>JSON.parse(fs.readFileSync(p));
 const galleries=read('content/timeline/galleries.json').entries,metadata=read('content/timeline/image-metadata.json').media,people=read('content/timeline/people.json').photos,looks=read('content/timeline/own-look-features.json').photos,thumbs=read('content/timeline/search-thumbnails.json').thumbnails;
 const langSource=fs.readFileSync('assets/site-language-data.js','utf8'),lang=JSON.parse(langSource.slice(langSource.indexOf('{'),langSource.lastIndexOf('}')+1));
 const configs=[['2013-08-30',4,'6yDZTMn4AtQ','Casten Bastholm'],['2013-05-17',4,'5egu-7Rnq5U','Michael Netjeaff'],['2013-09-07',3],['2012-02-20',3],['2012-03-01',11]];
 for(const [date,count,video,credit] of configs){
  const e=entries.find(e=>e.date===date&&e.group==='live');assert.ok(e,date);const g=galleries[[date,e.category,e.title].join('|')];assert.equal(g.images.length,count,date);assert.equal(g.imageDescriptions.length,count);assert.equal(new Set(g.images.map(s=>s.split('?')[0])).size,count,'No duplicate source photographs');assert.deepEqual(e.images,g.images);assert.ok(fs.existsSync(e.thumbnailPreview));
  if(video){assert.equal(e.videoId,video);assert.equal(e.videoAfterImages,true);assert.equal(e.creditName,credit);}
 }
 const pride=entries.find(e=>e.date==='2013-08-30');assert.ok(galleries[[pride.date,pride.category,pride.title].join('|')].details.includes('Videooptagelser: Cho Hae.'));
 const docs=[read('docs/timeline-pride-2013-20261016.json'),...read('docs/timeline-four-photo-batches-20261016.json').batches];
 let checked=0;
 for(const batch of docs) for(const photo of batch.photos){
  const src=photo.src,key=src.split('?')[0];assert.ok(fs.existsSync(key),src);assert.ok(fs.existsSync(thumbs[src]));assert.ok(looks[key]?.reviewed);assert.ok(metadata[src]?.width>0);assert.ok(metadata[src]?.height>0);assert.equal(lang[photo.descriptionDA],photo.descriptionEN);assert.ok(Object.values(galleries).some(g=>g.images.some((s,i)=>s===src&&g.imageDescriptions[i]===photo.descriptionDA)));
  for(const id of photo.confirmedPeople || [])assert.ok(people[key]?.people.includes(id));checked++;
 }
 const {parseTimelineSearchQuery:parse,matchTimelineResult:match,normalizeTimelineSearch:normalize}=await import('../assets/timeline-search-match.js');
 const anatomy=read('content/timeline/body-features.json').photos;
 const results=configs.map(([date])=>{const entry=entries.find(e=>e.date===date&&e.group==='live'),g=galleries[[date,entry.category,entry.title].join('|')];return {entry,searchable:normalize([entry.title,entry.details,...g.details].join(' ')),images:g.images.map((src,i)=>({src,description:g.imageDescriptions[i],people:people[src.split('?')[0]]?.people||[],look:looks[src.split('?')[0]],anatomy:anatomy[src.split('?')[0]]}))};});
 const supplied=new Set(docs.flatMap(batch=>batch.photos.map(photo=>photo.src)));
 const found=q=>[...new Set(results.map(r=>match(r,parse(q))).filter(Boolean).flatMap(r=>r.matchedImages.map(i=>i.src)).filter(src=>supplied.has(src)))];
 for(const [name,count] of [['Dennis Agerblad',22],['Ariel',1],['Blomst',1],['Delores Duchess LaCour',1],['Liebling Siebling',1]])assert.equal(found(name).length,count,'Owner-confirmed photo search: '+name);
 assert.deepEqual(found('Hestehoved').sort(),['./archive/timeline/performance/2012-03-01-08.webp','./archive/timeline/performance/2012-03-01-09.webp']);
 assert.deepEqual(found('Pik'),['./archive/timeline/performance/2012-03-01-05.webp']);
 assert.equal(parse('Pik').people.length,0,'Body content is not a person');
 const rest=entries.find(e=>e.date==='2012-03-01'&&e.group==='live');for(const n of ['01.jpg','02.jpg'])assert.ok(rest.images.includes('./archive/legacy/200_calendar/2012/2012_03_01_resturang/'+n));assert.ok(rest.details.includes('Forelsket I Et Dyr'));
 console.log('PASS: five galleries, 23 supplied photos, preserved existing images, no duplicate replacements, bilingual descriptions, optimized previews, confirmed tags and videos below slideshows');
})().catch(e=>{console.error(e);process.exitCode=1});
