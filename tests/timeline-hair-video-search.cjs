const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {parseTimelineSearchQuery:parse,matchTimelineResult:match,normalizeTimelineSearch:normalize}=await import('../assets/timeline-search-match.js');
 const {timelineEntries}=await import('../content/timeline/entries.js');
 const galleries=JSON.parse(fs.readFileSync('content/timeline/galleries.json')).entries;
 const facts=JSON.parse(fs.readFileSync('content/timeline/own-look-features.json')).photos;
 const videos=JSON.parse(fs.readFileSync('content/timeline/video-look-features.json')).videos;
 const fixture={entry:{title:'Show'},searchable:'show',images:[
  {src:'black-clothes-blond',description:'Dennis med blond hår og sort tøj',look:{reviewed:true,subject:'dennis',tags:['appearance:black','outfit:black','hair:light']}},
  {src:'black-clothes-grey',description:'Dennis med gråt hår og sort tøj',look:{reviewed:true,subject:'dennis',tags:['appearance:black','outfit:black','hair:grey','hair:light']}},
  {src:'visible-black-hair',description:'Dennis med sort hår og rød kjole',look:{reviewed:true,subject:'dennis',tags:['hair:black','hair:dark','outfit:red']}},
  {src:'hidden',description:'Dennis i hovedbeklædning',look:{reviewed:true,subject:'dennis',tags:['outfit:white']}}
 ]};
 assert.deepEqual(parse('sort hår').filters,['hair:black']);assert.deepEqual(parse('sort hår').terms,[]);
 const photoSources=q=>match(fixture,parse(q))?.matchedImages.map(i=>i.src) || [];
 for(const query of ['sort hår','sort paryk','kort sort hår','hår sort'])assert.ok(!photoSources(query).includes('black-clothes-blond'),query);
 assert.deepEqual(photoSources('sort hår'),['visible-black-hair']);
 assert.deepEqual(photoSources('blond hår'),['black-clothes-blond']);
 assert.deepEqual(photoSources('gråt hår'),['black-clothes-grey']);
 assert.deepEqual(photoSources('lyst hår'),['black-clothes-blond','black-clothes-grey'],'Light can describe grey; blond excludes grey');
 const real=timelineEntries.map(entry=>{
  const g=galleries[`${entry.date}|${entry.category}|${entry.title}`];const v=entry.videoId && videos[entry.videoId];
  return {entry,searchable:normalize([entry.title,entry.details,entry.date,entry.year,...(g?.details||[])].join(' ')),images:(g?.images||[]).map((src,i)=>({src,description:g.imageDescriptions[i],look:facts[src.split('?')[0]]})),videos:v ? [{src:entry.thumbnail,videoId:entry.videoId,description:v.description,look:v}] : []};
 });
 const search=q=>real.map(r=>match(r,parse(q))).filter(Boolean);
 for(const q of ['sort hår','sort paryk','kort sort hår','lang sort paryk']) {
  const hits=search(q);assert.ok(hits.length);assert.ok(hits.every(r=>r.matchedImages.every(i=>i.look.tags.includes('hair:black'))));
  assert.ok(hits.every(r=>r.entry.date!=='2015-01-31' && r.entry.date!=='2002-08-17' && r.entry.date!=='2002-08-03' && r.entry.date!=='1994-04-10' && r.entry.date!=='2003-02-22'),'All screenshot false positives gone');
 }
 for(const q of ['blond hår','lyst hår','lang paryk','mørkt hår','sort hår','kort hår'])assert.ok(search(q).every(r=>r.entry.date!=='2009-07-31'),'Covered hair in Råhuset: '+q);
 for(const q of ['pik','penis','nøgenhed','pik 2020','pik Video Video'])assert.ok(search(q).some(r=>r.entry.title==='Video Video' && r.matchedVideos[0].videoId==='BIJTQxGkQ80'),q);
 assert.ok(search('blond hår').every(r=>r.entry.title!=='Video Video'),'Poster appearance cannot establish video facts');
 const videoFixture={entry:{title:'Video'},searchable:'video',images:[],videos:[{src:'poster',description:'Dennis med synlig penis i filmen',look:{reviewed:true,subject:'dennis',tags:['body:penis-visible','nudity:visible']}}]};
 assert.equal(match(videoFixture,parse('pik')).matchedImages.length,0);
 assert.equal(match(videoFixture,parse('pik')).matchedVideos.length,1);
 assert.equal(match(videoFixture,parse('sort hår')),null);
 console.log('PASS: hair colours bind to hair; screenshot false positives removed; hidden hair cannot match; Video Video anatomy confirmation matches its video independently of poster/photo appearance');
 console.log('sort hår: '+search('sort hår').length+' events; blond hår: '+search('blond hår').length+' events; pik: '+search('pik').length+' events including Video Video');
})().catch(e=>{console.error(e);process.exitCode=1;});
