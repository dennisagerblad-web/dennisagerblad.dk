const assert=require('node:assert/strict');
(async()=>{
 const {loadTimelineImage,installTimelineImageRecovery}=await import('../assets/timeline-image-loading.js');
 const requests=[];let failures=2;
 class TestImage {
  set src(url){this._src=url;requests.push(url);queueMicrotask(()=>{if(failures-->0)this.onerror();else{this.naturalWidth=960;this.naturalHeight=1280;this.onload();}})}
  get src(){return this._src}
 }
 const image=await loadTimelineImage('https://example.com/photo.webp?v=keep',{ImageCtor:TestImage,wait:async()=>{}});
 assert.equal(requests.length,3);assert.equal(image.naturalWidth,960);
 assert.equal(new URL(requests[2]).searchParams.get('v'),'keep');assert(new URL(requests[2]).searchParams.has('timeline-image-retry'));
 requests.length=0;failures=10;
 await assert.rejects(loadTimelineImage('https://example.com/missing.webp',{ImageCtor:TestImage,wait:async()=>{}}),/could not be loaded/);assert.equal(requests.length,3,'Retries must be bounded');
 const events={},online={};let timers=[];
 const originalTimer=global.setTimeout;global.setTimeout=fn=>(timers.push(fn),timers.length);
 const thumb={src:'./assets/thumb.webp',isConnected:true,matches:s=>true,getAttribute(n){return n==='src'?this.src:null}};
 const doc={baseURI:'https://example.com/',visibilityState:'visible',addEventListener(n,fn){assert(!events[n],'Install once');events[n]=fn},querySelectorAll:()=>[thumb],defaultView:{addEventListener(n,fn){online[n]=fn}}};
 try{
  installTimelineImageRecovery(doc);installTimelineImageRecovery(doc);
  events.error({target:thumb});events.error({target:thumb});assert.equal(timers.length,1,'A pending retry must not be duplicated');timers.shift()();assert(new URL(thumb.src).searchParams.has('timeline-image-retry'));
  events.error({target:thumb});timers.shift()();events.error({target:thumb});assert.equal(timers.length,0,'Stop after two thumbnail retries');
  online.online();assert.equal(timers.length,1,'Recover failed thumbnails after reconnect');timers.shift()();events.load({target:thumb});online.online();assert.equal(timers.length,0,'Do not reload successful thumbnails');
  thumb.src='./assets/another.webp';events.error({target:thumb});assert.equal(timers.length,1);timers.shift()();assert.equal(new URL(thumb.src).pathname,'/assets/another.webp');
 }finally{global.setTimeout=originalTimer}
 console.log('PASS: failed photos and thumbnails recover; retries bounded; query preserved; online recovery and source changes handled; no successful image reloaded');
})().catch(e=>{console.error(e);process.exitCode=1});
