import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exercise real gallery handlers with a deterministic clock and lightweight DOM/GL.
// Browser verification separately covers actual rendering and native pointer input.
const source = (await readFile(new URL('../../assets/timeline-gallery.js',import.meta.url),'utf8'))
  .replace("import { timelineDate } from './timeline-ui.js?v=20260926-v11';", 'const timelineDate = (date, fallback) => fallback;')
  .replaceAll('import.meta.url',JSON.stringify('http://localhost/assets/timeline-gallery.js'))
  .replaceAll('export ', '');
async function fixture(group='live', reduced=false) {
  let now=0, id=0, progress, drawCount=0;
  const uniforms={};
  const nodes=[], frames=new Map();
  const gl=new Proxy({
    getShaderParameter:()=>true, getProgramParameter:()=>true,
    getUniformLocation:(_,name)=>name,
    uniform1f:(name,value)=>{ uniforms[name]=value; if(name==='progress') progress=value; },
    drawArrays:()=>drawCount++, getExtension:()=>null,
  },{get:(object,key)=>object[key] || (()=>({}))});
  const ctx=new Proxy({}, {get:()=>()=>{}});
  class Node {
    constructor(tag) {
      this.tag=tag; this.children=[]; this.listeners={}; this.attrs={}; this.dataset={};
      this.style={setProperty(){}}; this.clientWidth=1000; this.clientHeight=750; this.offsetHeight=100;
      this.classList={add:name=>this.classes.add(name),remove:name=>this.classes.delete(name)};
      this.classes=new Set(); nodes.push(this);
    }
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=nodes;}
    setAttribute(key,value){this.attrs[key]=value;}
    addEventListener(name,fn){(this.listeners[name] ||= []).push(fn);}
    dispatch(name,props={}){for(const fn of this.listeners[name]||[]) fn({target:this,preventDefault(){},...props});}
    getContext(type){return type==='webgl'?gl:ctx;}
    getBoundingClientRect(){return {width:1000,height:750};}
    closest(tag){return this.tag===tag?this:null;}
    setPointerCapture(id){this.capture=id;}
    hasPointerCapture(id){return this.capture===id;}
    releasePointerCapture(id){this.capture=null;this.dispatch('lostpointercapture',{pointerId:id});}
    focus(){}
    remove(){}
  }
  const body=new Node('body'), root=new Node('root');
  const entry={date:'2026-09-25',category:'Live',title:'Test',images:['a.jpg','b.jpg','c.jpg']};
  const context=vm.createContext({URL,console,
    document:{body,documentElement:{clientWidth:1200},createElement:tag=>new Node(tag),getElementById:()=>root,createTextNode:text=>text},
    window:{addEventListener(){},removeEventListener(){}},
    innerHeight:1000,devicePixelRatio:1,
    matchMedia:query=>({matches:query.includes('reduced')&&reduced,addEventListener(){},removeEventListener(){}}),
    ResizeObserver:class {observe(){} disconnect(){}},
    Image:class {naturalWidth=1000;naturalHeight=750;set src(value){queueMicrotask(()=>this.onload());}},
    fetch:async()=>({ok:true,json:async()=>({})}),
    performance:{now:()=>now},
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
  });
  vm.runInContext(source,context);
  context.openTimelineGallery(entry,group);
  const flush=async()=>{for(let i=0;i<12;i++) await Promise.resolve();};
  await flush();
  const stage=nodes.find(n=>n.className==='tg-stage');
  const next=nodes.find(n=>n.className==='tg-arrow tg-next');
  const effect=nodes.find(n=>n.className==='tg-effect');
  return {
    stage, effect, next, flush, uniforms,
    get progress(){return progress;}, get drawCount(){return drawCount;},
    get index(){return Number(stage.dataset.index);},
    async tick(time){now=time;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));await flush();},
    pointer(type,x,y=300){stage.dispatch('pointer'+type,{pointerId:1,clientX:x,clientY:y,button:0,isPrimary:true});},
    close(){nodes.find(n=>n.className==='tg-close').dispatch('click');},
  };
}
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);
const f=await fixture();
f.next.dispatch('click'); await f.flush();
assert.equal(f.stage.dataset.effect,'Morph');
assert.equal(f.uniforms.effect,2);assert.equal(f.uniforms.intensity,.3);
for(const [time,value] of [[0,0],[100,.024471741852423234],[250,.1464466094067262],[500,.5],[750,.8535533905932737],[900,.9755282581475768],[1000,1]]) {
  await f.tick(time); near(f.progress,value);
  assert.equal(f.index,time<1000?0:1);
}
assert(!f.effect.classes.has('is-active'));
// Dragging is linear, reversible while held, and doesn't advance on its own.
f.pointer('down',800);f.pointer('move',550);await f.flush();near(f.progress,.25);
await f.tick(1500);near(f.progress,.25);
f.pointer('move',300);near(f.progress,.5);
f.pointer('move',600);near(f.progress,.2);
f.pointer('up',600);
await f.tick(1900);near(f.progress,.6); // half of the remaining 800 ms
await f.tick(2300);assert.equal(f.index,2);near(f.progress,1);
// Crossing the origin selects the previous image, and cancellation restores it.
f.pointer('down',500);f.pointer('move',200);await f.flush();near(f.progress,.3);
f.pointer('move',700);await f.flush();near(f.progress,.2);
f.pointer('cancel',700);await f.tick(2500);assert.equal(f.index,2);near(f.progress,0);
f.pointer('down',500);f.pointer('move',700);await f.flush();f.pointer('up',700);
await f.tick(3300);assert.equal(f.index,1);
// A tap and a vertical scroll don't navigate or lock the arrows.
f.pointer('down',500);f.pointer('up',500);assert.equal(f.index,1);
f.pointer('down',500);f.pointer('move',502,400);f.pointer('up',502,400);
f.next.dispatch('click');await f.flush();await f.tick(4300);assert.equal(f.index,2);
// Closing mid-drag invalidates asynchronous preparation and subsequent frames.
f.pointer('down',600);f.pointer('move',100);f.close();await f.flush();
const draws=f.drawCount;await f.tick(5000);assert.equal(f.drawCount,draws);
const r=await fixture('live',true);r.next.dispatch('click');await r.flush();assert.equal(r.index,1);assert.equal(r.drawCount,0);
const art=await fixture('art');art.next.dispatch('click');await art.flush();
assert.equal(art.stage.dataset.effect,'Paint');assert.equal(art.uniforms.effect,1);
await art.tick(550);near(art.progress,.5);assert(art.effect.classes.has('is-active'));
await art.tick(1000);assert(art.effect.classes.has('is-active'));
await art.tick(1100);assert(!art.effect.classes.has('is-active'));
console.log('PASS: Scene 1000 ms sine timing; linear drag/reversal/release/cancel; tap/scroll; close; reduced motion; unchanged Kunst timing.');
