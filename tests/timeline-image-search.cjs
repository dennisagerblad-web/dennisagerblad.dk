const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const {normalizeTimelineSearch:normalize,timelineSearchTerms:terms,parseTimelineSearchQuery:parse,matchTimelineResult:match}=await import('../assets/timeline-search-match.js');
 const fixture={entry:{title:'Fest',date:'2016-05-20'},searchable:normalize('Fest 2016-05-20'),images:[
  {src:'blouse',description:'Person i en bluse med hvide prikker.'},
  {src:'dress',description:'Person i en ensfarvet rød kjole.'},
  {src:'dots-dress',description:'Person i rød kjole med hvide prikker.'},
 ]};
 for(const query of ['prikker kjoler','prikket kjole','prikkede kjoler','jeg havde prikker på kjolen','rødprikket kjole']) {
  assert.deepEqual(match(fixture,terms(query)).matchedImages.map(i=>i.src),['dots-dress'],query);
 }
 assert.deepEqual(match(fixture,terms('2016 hvide prikker')).matchedImages.map(i=>i.src),['blouse','dots-dress']);
 const separated={...fixture,images:fixture.images.slice(0,2)};
 assert.equal(match(separated,terms('prikker kjoler')),null,'Cannot combine attributes from different photos');
 const titleOnly={...separated,entry:{title:'Prikket kjole'},searchable:normalize('Prikket kjole')};
 assert.equal(match(titleOnly,terms('prikker kjoler')),null,'A title cannot override what the individual photo shows');
 assert.equal(match(fixture,terms('lilla kjole')),null);
 assert.ok(match(fixture,terms('2016')));
 assert.deepEqual(terms('Sjæl på Dåse'),terms('Sjael paa Daase'));
 assert.deepEqual(terms('Sang COVID-19'),['sang','covid-19']);
 assert.deepEqual(terms('Black & White'),['black','white']);
 const concert={entry:{title:'Koncert på Maggies'},searchable:normalize('Koncert på Maggies'),images:[]};
 const political={entry:{title:'Kønspolitisk Melodigrandprix'},searchable:normalize('Kønspolitisk Melodigrandprix'),images:[]};
 assert.equal(match(concert,terms('køn')),null,'Danish ø must not match o in concert');
 assert.ok(match(political,terms('køn')),'Partial words must still find kønspolitisk');
 assert.ok(match(concert,terms('kon')),'Concert prefix search still works');
 const english={...fixture,images:[{src:'english-dress',description:'Person i kjole'}]};
 assert.equal(match(english,terms('red dress'),text=>text==='Person i kjole'?'Person in a red dress':text).matchedImages[0].src,'english-dress');
 const reviewed=(src,tags,subject='dennis')=>({src,description:'Dennis i kostume',look:{reviewed:true,subject,tags}});
 const looks={entry:{title:'Solo med røde briller'},searchable:normalize('Solo med røde briller 2021'),images:[
  reviewed('red-dress-black-glasses',['outfit:red','clothing:dress','dress:dots','glasses:present','glasses:black','hair:short','hair:light','wig:present','wig:short','setting:stage','pose:lying']),
  reviewed('red-glasses',['outfit:blue','glasses:present','glasses:red','microphone:handheld']),
  reviewed('no-glasses',['glasses:absent','hair:short','hair:dark','gaze:direct']),
  {src:'unknown',description:'En person uden briller med røde briller ved siden af.'},
  reviewed('other-performer',['glasses:red','glasses:present'],'context'),
  reviewed('red-shoes',['heels:present','heels:red','heels:low']),
  reviewed('dress-and-dotted-gloves',['clothing:dress','pattern:dots','outfit:orange']),
 ]};
 const sources=q=>match(looks,parse(q))?.matchedImages.map(i=>i.src) || [];
 assert.deepEqual(sources('røde briller'),['red-glasses'],'Red clothes or another performer must not count as red glasses');
 assert.deepEqual(sources('uden briller'),['no-glasses'],'Unknown is not an absence observation');
 assert.deepEqual(sources('med briller'),['red-dress-black-glasses','red-glasses']);
 assert.deepEqual(sources('rødprikket kjole'),['red-dress-black-glasses'],'Dotted gloves next to a dress are not a dotted dress');
 assert.deepEqual(sources('ligger på scenen'),['red-dress-black-glasses']);
 assert.deepEqual(sources('kort lyst hår'),['red-dress-black-glasses']);
 assert.deepEqual(sources('kort lys paryk'),['red-dress-black-glasses']);
 assert.deepEqual(sources('røde stiletter'),['red-shoes']);
 assert.deepEqual(sources('røde lave stilletter'),['red-shoes']);
 assert.deepEqual(sources('billeder hvor jeg holder en synlig microfon'),['red-glasses']);
 assert.deepEqual(sources('kort hår uden briller 2021'),['no-glasses']);
 assert.deepEqual(parse('lilla/violet').filters,['appearance:purple']);
 assert.equal(match(concert,parse('køn')),null);
 assert.ok(match(political,parse('køn')));
 const galleries=JSON.parse(fs.readFileSync('content/timeline/galleries.json')).entries;
 const facts=JSON.parse(fs.readFileSync('content/timeline/own-look-features.json')).photos;
 const previews=JSON.parse(fs.readFileSync('content/timeline/search-thumbnails.json')).thumbnails;
 const identity=src=>'./'+decodeURIComponent(src.split(/[?#]/)[0]).replace(/^\.\//,'');
 let placements=0;
 for(const gallery of Object.values(galleries)) {
  assert.equal(gallery.images.length,(gallery.imageDescriptions || []).length,'Every image must have an aligned description');
  gallery.images.forEach((src,index)=>{
   placements++;
   assert.ok(gallery.imageDescriptions[index].trim());
   const look=facts[identity(src)];
   assert.ok(look?.reviewed,src+' must have been visually reviewed');
   assert.ok(!(look.tags.includes('glasses:present') && look.tags.includes('glasses:absent')));
   assert.ok(!look.tags.includes('show:group') || look.tags.includes('show:performance'),'A group portrait is not a group show');
   assert.ok(fs.existsSync(previews[src]),src+' must have a usable thumbnail');
  });
 }
 const {timelineEntries}=await import('../content/timeline/entries.js');
 const realResults=timelineEntries.map(entry=>{
  const gallery=galleries[`${entry.date}|${entry.category}|${entry.title}`];
  return {entry,searchable:normalize([entry.title,entry.shortTitle,entry.details,entry.date,entry.year].join(' ')),images:(gallery?.images||[]).map((src,i)=>({src,description:gallery.imageDescriptions[i],look:facts[identity(src)]}))};
 });
 const realSearch=q=>realResults.map(result=>match(result,parse(q))).filter(Boolean);
 assert.equal(realSearch('køn').length,10);
 assert.ok(realSearch('køn').every(result=>!result.entry.title.includes('Maggies')));
 assert.equal(realSearch('Sjæl på Dåse').length,10);
 for(const q of ['røde briller','grønne briller','sorte briller','uden briller','kort paryk','lang paryk','microfon','ligger på scenen','rødprikket kjole','klassisk makeup']) {
  const hits=realSearch(q);assert.ok(hits.length,q+' has observed matches');
  assert.ok(hits.every(result=>result.matchedImages.every(photo=>photo.look.subject==='dennis')),q+' applies only to Dennis');
 }
 console.log('PASS: Danish inflections, natural query, exact photo matching, date plus clothing, no cross-photo/title false positives, English descriptions and existing title terms');
 console.log('PASS: Danish ø prefixes, own subject only, unknown versus absent glasses, object colours, dress dots, same-photo combinations and requested Danish phrases');
 console.log(`PASS: ${placements} aligned gallery placements, ${Object.keys(facts).length} reviewed sources, thumbnails and real Timeline queries`);
})().catch(error=>{console.error(error);process.exitCode=1;});
