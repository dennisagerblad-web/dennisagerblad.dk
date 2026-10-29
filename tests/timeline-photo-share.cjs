const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const path=require('node:path');
(async()=>{
 const {timelineEntryKey,readTimelinePhotoShare,timelineShareURL}=await import(pathToFileURL(path.resolve('assets/timeline-share-state.js')));
 const entry={date:'2023-05-27',category:'Optræden',title:'Kønspolitisk Melodigrandprix, Bøssehuset',year:2023,group:'live',shareAliases:['old-key']};
 const image='./archive/timeline/performance/2023-05-27-05.jpg';
 const paused=new URL(timelineShareURL(entry,{origin:'https://dennisagerblad.dk',group:'live',language:'da',image,paused:true}));
 assert.equal(paused.searchParams.get('opslag'),timelineEntryKey(entry));assert.equal(paused.searchParams.get('billede'),image);assert.equal(paused.searchParams.get('pause'),'1');assert.equal(paused.searchParams.get('lang'),'da');assert.deepEqual(readTimelinePhotoShare(paused.search,entry),{image,paused:true});
 const playing=new URL(timelineShareURL(entry,{origin:'https://dennisagerblad.dk',group:'live',language:'en',image,paused:false}));assert.equal(playing.searchParams.get('lang'),'en');assert.deepEqual(readTimelinePhotoShare(playing.search,entry),{image,paused:false});
 assert.equal(readTimelinePhotoShare('?opslag='+encodeURIComponent(timelineEntryKey(entry)),entry),null,'Legacy event-only links remain normal');
 const other={...entry,date:'2023-09-27'};assert.equal(readTimelinePhotoShare(paused.search,other),null,'Photo selection must not leak to another event');
 paused.searchParams.set('opslag','old-key');assert.deepEqual(readTimelinePhotoShare(paused.search,entry),{image,paused:true});
 paused.searchParams.delete('pause');assert.equal(readTimelinePhotoShare(paused.search,entry).paused,true,'Photo links default to paused');
 paused.searchParams.set('billede','http://[');assert.equal(readTimelinePhotoShare(paused.search,entry),null,'Malformed source is ignored');
 paused.searchParams.set('billede','a'.repeat(3001));assert.equal(readTimelinePhotoShare(paused.search,entry),null);
 const oldPhoto=new URL(timelineShareURL(entry,{origin:'https://dennisagerblad.dk',group:'live',image:'./archive/old.jpg'}));const newPhoto=new URL(timelineShareURL(entry,{origin:'https://dennisagerblad.dk',group:'live',image}));assert.notEqual(oldPhoto.href,newPhoto.href,'A later selected image gets a fresh link');
 console.log('PASS: stable image address, pause/play, both languages, legacy links, event scoping, aliases and malformed source guards.');
})().catch(e=>{console.error(e);process.exitCode=1});
