const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync('assets/site-app.js','utf8');
const data=JSON.parse(source.slice(source.indexOf('Le=[')+3,source.indexOf('],Re=',source.indexOf('Le=['))+1));
assert(data.length>20);
for(const item of data){assert(item.width>0&&item.height>0,`Missing intrinsic dimensions: ${item.image}`)}
const pending=new Map();
class ImageMock {
 constructor(){this.ready=new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject})}
 set src(value){this.source=value;pending.set(value,this)}
 decode(){return this.ready}
}
let hooks=[],cursor=0,effects=[];
const React={
 useRef(value){let i=cursor++;return hooks[i]??(hooks[i]={current:value})},
 useState(value){let i=cursor++;if(!(i in hooks))hooks[i]=value;return[hooks[i],value=>{hooks[i]=value}]},
 useEffect(callback,deps){let i=cursor++,old=hooks[i];if(!old||deps.some((d,j)=>d!==old.deps[j])){old?.cleanup?.();let h=hooks[i]={deps};effects.push(()=>{h.cleanup=callback()})}}
};
const context={Image:ImageMock,Map,Promise,document:{body:{}},Le:data,S:{jsx:(tag,props,key)=>({tag,props,key}),jsxs:(tag,props,key)=>({tag,props,key})},v:{createPortal:x=>x},aaOpenDialog:()=>()=>{},aaTrapFocus:()=>{}};
context._=React;
vm.createContext(context);vm.runInContext(source.slice(source.indexOf('var aaPerformanceReadyImages='),source.indexOf('function Be(',source.indexOf('var aaPerformanceReadyImages='))),context);
let requested=0,tree;
function render(){cursor=0;tree=context.ze({index:requested,change:step=>{requested=(requested+step+data.length)%data.length},close:()=>{}});let work=effects;effects=[];work.forEach(f=>f());return tree}
function find(tag,node=tree){if(!node||typeof node!=='object')return; if(node.tag===tag)return node;for(const child of [node.props?.children].flat(Infinity)){let match=find(tag,child);if(match)return match}}
async function tick(){await Promise.resolve();await Promise.resolve();await Promise.resolve();render()}
async function decode(index){let image=pending.get(data[index].image);assert(image,'Image requested');image.onload();await Promise.resolve();image.resolve();await tick()}
(async()=>{
 render();assert(!find('img'),'Opening must not show a zero-size undecoded image');
 let first=pending.get(data[0].image);first.onload();await tick();assert(!find('img'),'Load alone must not expose an undecoded image');first.resolve();await tick();assert.equal(find('img').props.src,data[0].image);
 requested=1;render();assert.equal(find('img').props.src,data[0].image,'Keep current photo while the next photo loads');await decode(1);assert.equal(find('img').props.src,data[1].image);assert.equal(find('img').props.width,data[1].width);assert.equal(find('img').key,data[1].image);
 requested=5;render();requested=6;render();await decode(5);assert.equal(find('img').props.src,data[1].image,'An obsolete request must not change the photo');await decode(6);assert.equal(find('img').props.src,data[6].image);
 find('figure').props.onTouchStart({touches:[{clientX:200,clientY:300}]});find('figure').props.onTouchEnd({changedTouches:[{clientX:100,clientY:302}]});assert.equal(requested,7,'Horizontal swipe navigates forward');
 find('figure').props.onTouchStart({touches:[{clientX:200,clientY:300}]});find('figure').props.onTouchEnd({changedTouches:[{clientX:205,clientY:400}]});assert.equal(requested,7,'Vertical scrolling must not change photos');
 requested=data.length-1;render();await decode(data.length-1);find('figure').props.onTouchStart({touches:[{clientX:200,clientY:300}]});find('figure').props.onTouchEnd({changedTouches:[{clientX:100,clientY:300}]});assert.equal(requested,0,'Last photo wraps to first');render();await decode(0);assert.equal(find('img').props.src,data[0].image);
 assert(vm.runInContext('aaPerformanceReadyImages.size',context)<=5,'Decoded-image cache is bounded');
 requested=20;render();pending.get(data[20].image).onerror(new Error('Test network failure'));await tick();assert.equal(find('img').props.src,data[0].image,'Failed photo keeps the last good image');assert(find('p').props.children.includes('kunne ikke'));
 console.log('Performance transition: opening/decode, pending frame, stale requests, dimensions, touch direction, wrap, bounded cache and failed requests pass.');
})().catch(e=>{console.error(e);process.exitCode=1});
