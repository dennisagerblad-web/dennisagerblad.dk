const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {parseTimelineSearchQuery:parse,matchTimelineResult:match,normalizeTimelineSearch:normalize}=await import('../assets/timeline-search-match.js');
 const {timelineEntries}=await import('../content/timeline/entries.js');
 const g=JSON.parse(fs.readFileSync('content/timeline/galleries.json')).entries;
 const f=JSON.parse(fs.readFileSync('content/timeline/own-look-features.json')).photos;
 const anatomy=JSON.parse(fs.readFileSync('content/timeline/body-features.json')).photos;
 const people=JSON.parse(fs.readFileSync('content/timeline/people.json')).photos;
 const inventory=JSON.parse(fs.readFileSync('docs/timeline-look-review-inventory-20261013.json'));
 const report=JSON.parse(fs.readFileSync('docs/timeline-body-search-review-20261013.json'));
 const real=timelineEntries.map(entry=>{
  const gallery=g[`${entry.date}|${entry.category}|${entry.title}`];const details=gallery?.details || [];
  return {entry,galleryDetails:details,searchable:normalize([entry.title,entry.details,entry.date,entry.display,entry.year,...details].join(' ')),images:(gallery?.images||[]).map((src,i)=>({src,description:gallery.imageDescriptions[i],look:f[src.split('?')[0]],anatomy:anatomy[src.split('?')[0]],people:people[src.split('?')[0]]?.people || [],peopleLooks:people[src.split('?')[0]]?.looks}))};
 });
 const search=q=>real.map(r=>match(r,parse(q))).filter(Boolean);
 const sources=q=>search(q).flatMap(r=>r.matchedImages.map(i=>i.src));
 const shared=sources('pik');
 for(const word of ['røv','nosser','røvhul','nøgen','hud','nøgenhed','penis','bare balder','testikler','røvhullet','nøgne']) assert.deepEqual(sources(word),shared,'Shared reviewed collection: '+word);
 const additions=JSON.parse(fs.readFileSync('docs/timeline-body-search-review-20261015.json'));
 for(const photo of additions.photos) assert.ok(shared.includes(photo.src),'Requested image matches: '+photo.src);
 assert.equal(new Set(shared).size,40,'Preserve confirmed collection and add the owner-confirmed Broken Mirror photo');
 assert.deepEqual(sources('Andreas Tange Lange røv'),['./archive/timeline/performance/2007-12-15-07.webp']);
 for(const photo of additions.excludedPhotos) {
  assert.ok(!shared.includes(photo.src),'Excluded photo: '+photo.src);
  assert.ok(!search('hud').some(r=>r.entry.date===photo.date),'Excluded event: '+photo.date);
 }
 for(const photo of additions.replacedPhotos) {
  assert.ok(!shared.includes(photo.incorrectSrc),'Wrong CSD image removed');
  assert.ok(shared.includes(photo.correctSrc),'Correct CSD close-up included');
 }
 assert.equal(anatomy[additions.replacedPhotos[0].correctSrc][0].subject,'unidentified-csd-adult','Do not assign the central person anatomy to Dennis');
 assert.ok(search('Sang Pik Nok').some(r=>r.entry.date==='2019-05-17'),'Song-title queries still work');
 assert.ok(search('Stiv pik til alle').some(r=>r.entry.group==='art'),'Printed phrase queries still work');
 const fixture={entry:{title:'Pik og røv'},searchable:normalize('Pik og røv'),images:[
  {src:'costume',description:'En penisrekvisit og røv på en plakat.',look:{reviewed:true,subject:'dennis',tags:['clothing:nylon-costume']}},
  {src:'other',description:'Synlig penis',look:{reviewed:true,subject:'context',tags:['body:penis-visible']}},
  {src:'bare-torso',description:'Dennis med bar overkrop',look:{reviewed:true,subject:'dennis',tags:['body:bare-torso','nudity:visible']}}
 ]};
 assert.deepEqual(match(fixture,parse('pik')).matchedImages.map(i=>i.src),['bare-torso'],'Text, unreviewed identities and props do not qualify; reviewed torso does');
 fixture.images[1].anatomy=[{reviewed:true,subject:'unidentified-adult',tags:['body:penis-visible']}];
 assert.deepEqual(match(fixture,parse('pik')).matchedImages.map(i=>i.src),['other','bare-torso'],'Reviewed anatomy can belong to an unidentified adult');
 fixture.images[1].anatomy=[];
 fixture.images[0].look.tags.push('costume:penis','costume:nudity');
 assert.deepEqual(match(fixture,parse('pik')).matchedImages.map(i=>i.src),['costume','bare-torso']);
 assert.deepEqual(sources('pik og røv'),shared,'Multiple shared synonyms do not narrow the collection');
 const unrelated={entry:{title:'Pik og røv'},searchable:normalize('Pik og røv'),images:[{src:'opaque',description:'Pik på plakat; hud og røv nævnt i teksten',look:{reviewed:true,subject:'dennis',tags:['clothing:underwear']}}]};
 for(const word of additions.synonyms)assert.equal(match(unrelated,parse(word)),null,'No anatomy proof from words or opaque underwear: '+word);
 const video=JSON.parse(fs.readFileSync('content/timeline/video-look-features.json')).videos.BIJTQxGkQ80;
 const videoResult={entry:{title:'Video Video'},searchable:'video video',images:[],videos:[{src:'video-video',description:video.description,look:video}]};
 for(const word of additions.synonyms)assert.equal(match(videoResult,parse(word)).matchedVideos.length,1,'Confirmed Video Video remains in collection: '+word);
 assert.ok(search('pik 2005').every(r=>r.entry.year===2005));
 assert.ok(search('røv grønne briller').every(r=>r.matchedImages.every(i=>i.look.tags.includes('glasses:green'))));
 for(const r of report.photos.filter(r=>!additions.excludedPhotos.some(p=>p.src===r.src))){assert.ok(f[r.src].subject==='dennis');r.tags.forEach(tag=>assert.ok(f[r.src].tags.includes(tag)));}
 for(const r of report.costumePhotos){assert.ok(f[r.src].subject==='dennis');r.tags.forEach(tag=>assert.ok(f[r.src].tags.includes(tag)));}
 for(const id of [276,1047,1048,1049,1050,1113,1114,1116,1117,1120])assert.ok(sources('pik').includes(inventory[id].src),'Approved costume penis '+id);
 assert.ok(sources('røv').includes(inventory[1118].src),'Approved costume buttocks');
 assert.equal(report.awaitingCostumeClarification.length,0);
 const prefix='./archive/legacy/200_calendar/';
 const rudi=prefix+'2005/05_10_07_be_queer_02/IMG_7381.jpg';
 for(const src of [prefix+'2004/04_09_25_puha_benutz/dennis_show_02.jpg',prefix+'2005/05_10_07_be_queer_02/IMG_7445.jpg',rudi])assert.ok(sources('pik').includes(src),'Owner screenshot must match: '+src);
 assert.deepEqual(sources('Rudi pik'),[rudi]);
 assert.deepEqual(sources('Rudi penis'),[rudi]);
 assert.ok(!sources('Tove Hansen pik').includes(rudi),'Tove cannot borrow Rudi anatomy on the same photograph');
 assert.ok(!sources('pik blå kjole').includes(rudi),'Dennis appearance cannot borrow another person anatomy');
 const samePerson={entry:{title:'Group'},searchable:'group',images:[{src:'group',description:'Group',people:['rudi','tove-hansen'],look:{reviewed:true,subject:'dennis',tags:['hair:black']},anatomy:[{reviewed:true,subject:'rudi',tags:['body:penis-visible']},{reviewed:true,subject:'tove-hansen',tags:['body:buttocks-visible']}]}]};
 assert.ok(match(samePerson,parse('pik røv')),'Both terms request the shared collection');
 assert.equal(match(samePerson,parse('pik sort hår')),null,'Do not combine Dennis hair with Rudi anatomy');
 assert.ok(match(samePerson,parse('Tove Hansen pik')),'Reviewed buttocks qualify for shared anatomy search');
 samePerson.images[0].anatomy.pop();
 assert.equal(match(samePerson,parse('Tove Hansen pik')),null,'Named person cannot borrow another person anatomy');
 assert.ok(match(samePerson,parse('Rudi pik')));
 console.log('PASS: shared six-word collection, five requested image facts, confirmed video, same-person constraints, approved costumes, no text-only or opaque-underwear matches, song/poster titles preserved');
 for(const q of additions.synonyms)console.log(q+': '+search(q).length+' events, '+new Set(sources(q)).size+' unique photos');
})().catch(e=>{console.error(e);process.exitCode=1});
