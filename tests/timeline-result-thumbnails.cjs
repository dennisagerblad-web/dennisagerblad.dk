const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {timelineSearchResultMedia:media,matchTimelineResult:match,parseTimelineSearchQuery:parse,normalizeTimelineSearch:normalize}=await import('../assets/timeline-search-match.js');
 const {timelineEntries}=await import('../content/timeline/entries.js');
 const galleries=JSON.parse(fs.readFileSync('content/timeline/galleries.json')).entries;
 let withImages=0,withoutImages=0;
 for(const entry of timelineEntries){
  const g=galleries[`${entry.date}|${entry.category}|${entry.title}`];
  const result={entry,title:entry.title,matchedImages:[],matchedVideos:[],images:(g?.images || entry.images || []).map(src=>({src,description:entry.title}))};
  const selected=media(result);
  if(!selected.length){withoutImages++;continue;}
  withImages++;
  if(entry.thumbnail)assert.equal(selected[0].src,entry.thumbnail,'Use the exact Timeline image');
  assert.ok(fs.existsSync(selected[0].thumbnail.split('?')[0]),'Existing thumbnail: '+selected[0].thumbnail);
  assert.equal(result.matchedImages.length,0,'Displaying an event image never creates a search match');
 }
 const exact={src:'correct-person',thumbnail:'matched-photo',description:'Confirmed person'};
 assert.deepEqual(media({entry:{thumbnail:'event-photo'},matchedImages:[exact],matchedVideos:[]}),[exact],'Keep the actual matching photograph');
 const video={kind:'video',src:'video',thumbnail:'confirmed-video'};
 assert.deepEqual(media({entry:{thumbnail:'event-photo'},matchedImages:[],matchedVideos:[video]}),[video],'Keep confirmed video match');
 const fixture={entry:{title:'Koncert med Hairwerk',thumbnail:'event-photo'},searchable:normalize('Koncert med Hairwerk'),images:[{src:'unrelated',description:'Et andet billede',people:['dennis'],look:{reviewed:true,subject:'dennis',tags:['hair:blond']}}]};
 const textMatch=match(fixture,parse('Hairwerk'));
 assert.ok(textMatch);assert.equal(textMatch.matchedImages.length,0);assert.equal(media(textMatch)[0].src,'event-photo');
 assert.equal(match(fixture,parse('Hairwerk sort hår')),null,'Fallback cannot establish person or appearance facts');
 console.log(`PASS: existing Timeline image on ${withImages} entries, ${withoutImages} have no image; precise photo/video matches preserved and fallback does not affect search matching`);
})().catch(error=>{console.error(error);process.exitCode=1});
