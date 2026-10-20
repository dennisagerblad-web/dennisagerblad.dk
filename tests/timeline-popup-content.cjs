const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const {timelineEntries}=await import('../content/timeline/entries.js');
 const {hasTimelinePopupContent:has,canOpenTimelinePopup:opens,timelineInlineDetails:inline,timelinePopupParagraphs:paragraphs}=await import('../assets/timeline-popup-content.js');
 const galleries=JSON.parse(fs.readFileSync('content/timeline/galleries.json')).entries;
 const grandprix=timelineEntries.find(e=>e.date==='2026-06-05'&&e.category==='Melodigrandprix');
 const grandprixGallery=galleries[[grandprix.date,grandprix.category,grandprix.title].join('|')];
 const grandprixText=paragraphs(grandprix,[grandprix.details,...grandprixGallery.details]);
 assert.deepEqual(grandprixText,[grandprix.details],'The corrected Grandprix song and participant list appears once');
 assert.ok(grandprixText[0].includes('Fru Direktør Elsa Kragh Madsen'));
 assert.ok(!grandprixText.join(' ').includes('Direktørfrue Andersen'),'Do not restore the superseded participant name');
 const example=timelineEntries.find(e=>e.date==='2023-01-12');assert.equal(has(example),false);assert.equal(inline(example),'Jeg læste op til afslutningen på Skolen for Skrift.');
 const textOnly=timelineEntries.filter(e=>e.details&&!has(e));assert.equal(textOnly.length,13);
 for(const e of timelineEntries){const g=galleries[[e.date,e.category,e.title].join('|')];if(e.popupContent!==false&&(g?.images?.length||e.images?.length||e.videoId||e.href))assert.ok(has(e),e.title+' retains its existing content');}
 assert.equal(inline({title:'Jeg var Frankensteins brud på Teateret ved Sorte Hest.',details:'Jeg var Frankensteins brud.'}),'');
 const filming=timelineEntries.find(e=>e.date==='2011-07-09'&&e.title.includes('Sproghoved'));
 assert.equal(opens(filming),true,'The real filming gallery must remain accessible without a videoId');
 assert.equal(galleries[[filming.date,filming.category,filming.title].join('|')].images.length,20);
 assert.equal(inline(filming),'','Do not repeat the event title as a second description');
 assert.deepEqual(galleries[[filming.date,filming.category,filming.title].join('|')].details,[]);
 assert.equal(opens({category:'Musikvideo',thumbnail:'poster.webp'}),false,'A video poster alone is not a playable video');
 assert.equal(opens({category:'Musikvideo',videoId:'example'}),true);
 for(const e of timelineEntries){
   const video=/video/i.test(e.category)||!!e.videoId;
   const previous=has(e)&&(video?!!(e.videoId||e.href&&(!e.thumbnail||/video marathon/i.test(e.category))||e.images?.length):!!(e.href||e.thumbnail||e.images?.length||e.biography?.length||e.albumKey||e.popupHref));
   if(e!==filming)assert.equal(opens(e),previous,e.title+' keeps its existing popup behavior');
 }
 console.log('PASS: all 13 text-only descriptions stay inline; galleries, videos and archive content remain eligible.');
})().catch(error=>{console.error(error);process.exitCode=1});
