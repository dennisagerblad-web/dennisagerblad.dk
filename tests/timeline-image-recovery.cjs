const assert=require('node:assert/strict');
(async()=>{
 const {loadTimelineImage,installTimelineImageRecovery,shouldReloadImages,claimImageReload}=await import('../assets/timeline-image-loading.js');
 const requests=[];let failures=2;
 class TestImage {set src(url){this._src=url;requests.push(url);queueMicrotask(()=>{if(failures-->0)this.onerror();else{this.naturalWidth=960;this.naturalHeight=1280;this.onload();}})}get src(){return this._src}}
 const image=await loadTimelineImage('https://example.com/photo.webp?v=keep',{ImageCtor:TestImage,wait:async()=>{}});
 assert.equal(requests.length,3);assert.equal(image.naturalWidth,960);assert.equal(new URL(requests[2]).searchParams.get('v'),'keep');
 failures=10;requests.length=0;await assert.rejects(loadTimelineImage('https://example.com/no.webp',{ImageCtor:TestImage,wait:async()=>{}}),/could not be loaded/);assert.equal(requests.length,3);
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 assert(claimImageReload(storage,1000000));assert(!claimImageReload(storage,1000001));assert(!claimImageReload(storage,1599999));assert(claimImageReload(storage,1600000));
 assert(!claimImageReload(null,2000000));assert(!claimImageReload({getItem(){throw Error('denied')}},2000000));
 assert(shouldReloadImages({failed:2,total:3,oldest:12000}));assert(shouldReloadImages({failed:1,total:5,oldest:12000}));assert(!shouldReloadImages({failed:0,total:5,oldest:12000}));
 for(const extra of [{oldest:11999},{online:false},{blocked:true}])assert(!shouldReloadImages({failed:2,total:2,oldest:20000,...extra}));
 function fixture(count=1,realVisibility=false){
  let time=2000000,serial=0,reloads=0;const timers=new Map(),events={},winEvents={},localStorage=new Map();
  const schedule=(fn,delay=0)=>{const id=++serial;timers.set(id,{fn,at:time+delay});return id};
  const win={innerWidth:390,innerHeight:844,navigator:{onLine:true},fetch:async()=>({status:200}),sessionStorage:{getItem:k=>localStorage.get(k)??null,setItem:(k,v)=>localStorage.set(k,v)},addEventListener:(n,fn)=>winEvents[n]=fn};
  const images=Array.from({length:count},(_,i)=>({src:`./thumb-${i}.webp`,isConnected:true,complete:false,naturalWidth:0,loading:'lazy',dataset:{},inView:true,writes:[],matches:s=>true,getAttribute(n){return n==='src'?this.src:n==='data-image-fallback'?this.fallback:null}}));
  for(const im of images){let url=im.src;Object.defineProperty(im,'src',{get:()=>url,set(v){url=v;this.complete=false;this.naturalWidth=0;this.writes.push(v)}})}
  for(const im of images){im.getClientRects=()=>[{}];im.getBoundingClientRect=()=>({width:0,height:0,left:100,right:100,top:200,bottom:200});im.closest=selector=>selector.includes('.timeline-entry')?{getBoundingClientRect:()=>({width:160,height:200,left:100,right:260,top:100,bottom:300})}:null;}
  const doc={baseURI:'https://example.com/',visibilityState:'visible',defaultView:win,querySelectorAll:()=>images,querySelector:()=>null,addEventListener:(n,fn)=>events[n]=fn};
  const options={now:()=>time,setTimeout:schedule,clearTimeout:id=>timers.delete(id),setInterval:()=>0,clearInterval:()=>{},visible:realVisibility?undefined:im=>im.inView&&im.isConnected,reload:()=>reloads++};
  const control=installTimelineImageRecovery(doc,options);assert.equal(installTimelineImageRecovery(doc,options),control);
  const tick=ms=>{const end=time+ms;while(true){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;time=due[1].at;timers.delete(due[0]);due[1].fn()}time=end;control.check()};
  const fail=im=>{im.complete=true;im.naturalWidth=0;events.error({target:im})};const load=im=>{im.complete=true;im.naturalWidth=200;events.load({target:im})};
  return {doc,win,events,winEvents,images,control,tick,fail,load,reloads:()=>reloads};
 }
 let z=fixture(1,true);z.tick(17000);assert.equal(z.images[0].writes.length,1,'A 0x0 pending image in a visible timeline card must be retried');
 // A failed DOM image added after installation is repaired even with no error event.
 let f=fixture();f.images[0].complete=true;f.tick(200);assert.equal(f.images[0].writes.length,1);f.load(f.images[0]);f.tick(60000);assert.equal(f.images[0].writes.length,1);
 // A lazy request that never emits load/error is restarted after 16s.
 f=fixture();f.tick(15000);assert.equal(f.images[0].writes.length,0);f.tick(1500);assert.equal(f.images[0].writes.length,1);
 // Avoid a burst when many visible requests fail together; ignore offscreen ones.
 f=fixture(5);f.images[4].inView=false;for(const im of f.images)f.fail(im);f.tick(600);assert.equal(f.images.filter(i=>i.writes.length).length,2);f.load(f.images[0]);f.tick(200);assert.equal(f.images.filter(i=>i.writes.length).length,3);assert.equal(f.images[4].writes.length,0);
 // Offline still allows bounded image attempts, but never a page reload without a successful origin probe.
 f=fixture();f.win.navigator.onLine=false;f.win.fetch=async()=>{throw Error('offline')};f.fail(f.images[0]);f.tick(2000);assert.equal(f.images[0].writes.length,1);assert.equal(f.reloads(),0);f.win.navigator.onLine=true;f.winEvents.online();f.tick(200);assert.equal(f.images[0].writes.length,1);
 f=fixture();f.fail(f.images[0]);f.tick(600);f.fail(f.images[0]);f.tick(2100);f.fail(f.images[0]);f.images[0].fallback='./original.jpg';f.tick(5100);assert.equal(new URL(f.images[0].src).pathname,'/original.jpg');f.fail(f.images[0]);f.tick(5000);await new Promise(setImmediate);f.tick(200);assert.equal(f.reloads(),1);f.tick(60000);assert.equal(f.reloads(),1,'No reload loop');
 // Reload guard survives a new document/controller in the same tab.
 const shared=f.win.sessionStorage;f=fixture();f.win.sessionStorage=shared;for(let n=0;n<3;n++){f.fail(f.images[0]);f.tick([600,2100,5100][n])}f.fail(f.images[0]);f.tick(20000);await new Promise(setImmediate);f.tick(200);assert.equal(f.reloads(),0);
 f.winEvents.pageshow();f.tick(200);assert(f.images[0].writes.length>3,'Restored page gets targeted recovery again');
 f=fixture();f.win.navigator.onLine=false;f.fail(f.images[0]);f.tick(200);await new Promise(setImmediate);f.tick(600);assert.equal(f.images[0].writes.length,1,'A false offline flag must not block a reachable origin');
 console.log('PASS: late errors and silent stalls recover; visible-only queue capped at two; source fallback; offline and bfcache recovery; one guarded reload; successful images untouched');
})().catch(e=>{console.error(e);process.exitCode=1});
