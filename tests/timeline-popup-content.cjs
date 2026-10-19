const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const {timelineEntries}=await import('../content/timeline/entries.js');
 const {hasTimelinePopupContent:has,timelineInlineDetails:inline}=await import('../assets/timeline-popup-content.js');
 const galleries=JSON.parse(fs.readFileSync('content/timeline/galleries.json')).entries;
 const example=timelineEntries.find(e=>e.date==='2023-01-12');assert.equal(has(example),false);assert.equal(inline(example),'Jeg læste op til afslutningen på Skolen for Skrift.');
 const textOnly=timelineEntries.filter(e=>e.details&&!has(e));assert.equal(textOnly.length,13);
 for(const e of timelineEntries){const g=galleries[[e.date,e.category,e.title].join('|')];if(g?.images?.length||e.images?.length||e.videoId||e.href)assert.ok(has(e),e.title+' retains its existing content');}
 assert.equal(inline({title:'Jeg var Frankensteins brud på Teateret ved Sorte Hest.',details:'Jeg var Frankensteins brud.'}),'');
 console.log('PASS: all 13 text-only descriptions stay inline; galleries, videos and archive content remain eligible.');
})().catch(error=>{console.error(error);process.exitCode=1});
