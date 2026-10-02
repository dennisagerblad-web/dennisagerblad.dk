// Published galleries: Galleri 1, Gang and Galleri 2. Galleri 0 stays local.

const chooser = document.createElement('div');
chooser.className = 'art-version-chooser';
chooser.setAttribute('role', 'tablist');
chooser.setAttribute('aria-label', 'Vælg kunstgalleri');
const versions = [3, 4, 2];
const roomNames={3:'Galleri 1',4:'Gang',2:'Galleri 2'};
// One permanent marker; only its transform changes when a tab is selected.
const marker=document.createElement('span');marker.className='art-tab-marker';marker.setAttribute('aria-hidden','true');marker.innerHTML='<span class="art-tab-glow"></span>';chooser.append(marker);
const buttons = versions.map(version => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = roomNames[version];
  button.id=`art-gallery-tab-${version}`;button.setAttribute('role','tab');button.setAttribute('aria-controls','art-gallery-panel');
  button.addEventListener('pointerenter',()=>hintGlow(version));
  button.addEventListener('focus',()=>hintGlow(version));
  button.addEventListener('click', () => {
    navigateGallery(version);
  });
  chooser.append(button);
  return button;
});
document.body.append(chooser);

const storedVersion = Number(sessionStorage.getItem('dennis-art-room-order-v2'));
let selectedVersion = versions.includes(storedVersion) ? storedVersion : 3;
let tabVersion=selectedVersion;
function hintGlow(version){if(activeMotion)return;const direction=Math.sign(versions.indexOf(version)-versions.indexOf(tabVersion));chooser.style.setProperty('--glow-nudge',`${direction*7}px`);}
function syncTabs(){
 const index=versions.indexOf(tabVersion);chooser.style.setProperty('--glow-nudge','0px');
 const activeButton=buttons[index];
 if(activeButton?.offsetWidth){chooser.style.setProperty('--marker-left',activeButton.offsetLeft+'px');chooser.style.setProperty('--marker-width',activeButton.offsetWidth+'px');}
 buttons.forEach((button,i)=>{button.disabled=!!document.querySelector('.ship.section-4.art-images-loading');const active=i===index;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
 const panel=document.querySelector('.ship.section-4.is-open .art-room');if(panel){panel.id='art-gallery-panel';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',`art-gallery-tab-${tabVersion}`);}
}
function syncTravelTabs(position){
 const p=Math.max(0,Math.min(versions.length-1,position));
 const low=Math.floor(p),high=Math.min(low+1,versions.length-1),fraction=p-low;
 const left=buttons[low].offsetLeft+(buttons[high].offsetLeft-buttons[low].offsetLeft)*fraction;
 const width=buttons[low].offsetWidth+(buttons[high].offsetWidth-buttons[low].offsetWidth)*fraction;
 chooser.style.setProperty('--marker-left',left+'px');chooser.style.setProperty('--marker-width',width+'px');chooser.style.setProperty('--glow-nudge','0px');
 chooser.dataset.roomPosition=String(p);
 tabVersion=versions[Math.round(p)];
 buttons.forEach((button,i)=>{const active=i===Math.round(p);button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
 const panel=document.querySelector('.ship.section-4.is-open .art-room');if(panel)panel.setAttribute('aria-labelledby',`art-gallery-tab-${tabVersion}`);
}
function animateRoomTravel(start,end,duration,paint){
 let frame=0,done=false,resolve;const finished=new Promise(r=>resolve=r);let started;
 const finish=complete=>{if(done)return;done=true;cancelAnimationFrame(frame);resolve(complete);};
 function tick(time){
  if(started===undefined)started=time;
  const p=duration?Math.min(1,(time-started)/duration):1;
  const eased=p*p*(3-2*p);
  paint(start+(end-start)*eased);
  if(p===1)finish(true);else frame=requestAnimationFrame(tick);
 }
 paint(start);frame=requestAnimationFrame(tick);
 return {finished,cancel:()=>finish(false)};
}
chooser.addEventListener('pointerleave',()=>chooser.style.setProperty('--glow-nudge','0px'));
chooser.addEventListener('focusout',event=>{if(!chooser.contains(event.relatedTarget))chooser.style.setProperty('--glow-nudge','0px');});
// Manual activation: arrows/Home/End move focus; Enter or Space selects the room.
chooser.addEventListener('keydown',event=>{const index=buttons.indexOf(event.target);if(index<0)return;let next=index;if(event.key==='ArrowRight')next=(index+1)%buttons.length;else if(event.key==='ArrowLeft')next=(index+buttons.length-1)%buttons.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;else return;event.preventDefault();buttons[next].focus();});

const catDialog = document.createElement('dialog');
catDialog.className = 'art-cat-dialog';
catDialog.setAttribute('aria-label', 'To sider af en sjæl');
catDialog.innerHTML = `<header><h2>To sider af en sjæl</h2><button type="button" aria-label="Luk katteværket">Luk ×</button></header><img src="./assets/art-cat-updated.webp" alt="To sider af en sjæl, tekstilværk med katte">`;
catDialog.querySelector('button').addEventListener('click', () => catDialog.close());
catDialog.addEventListener('click', event => { if (event.target === catDialog) catDialog.close(); });
document.body.append(catDialog);

// Every projection uses one camera. Original artwork pixels never enter imagegen.
const W=1280,H=720,VP=[640,360],DEPTH=8.6;
const camera=5.8, roomWidth=8, roomHeight=3.4, focal=1280*camera/roomWidth;
const point=(x,y,z)=>[VP[0]+focal*x/(camera+z),VP[1]+focal*(roomHeight/2-y)/(camera+z)];
function homography(src,dst){
 const rows=[];src.forEach(([x,y],i)=>{const[u,v]=dst[i];rows.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);});
 for(let c=0;c<8;c++){let p=c;for(let r=c+1;r<8;r++)if(Math.abs(rows[r][c])>Math.abs(rows[p][c]))p=r;[rows[c],rows[p]]=[rows[p],rows[c]];const d=rows[c][c];for(let k=c;k<9;k++)rows[c][k]/=d;for(let r=0;r<8;r++){if(r===c)continue;const f=rows[r][c];for(let k=c;k<9;k++)rows[r][k]-=f*rows[c][k];}}
 const[a,b,c,d,e,f,g,h]=rows.map(r=>r[8]);return `matrix3d(${[a,d,0,g,b,e,0,h,0,0,1,0,c,f,0,1].join(',')})`;
}
const quad=(x0,x1,y0,y1,z)=>[point(x0,y1,z),point(x1,y1,z),point(x1,y0,z),point(x0,y0,z)];
function sideQuad(side,z,len,bottom,top){const x=side==='left'?-roomWidth/2:roomWidth/2;const q=[point(x,top,z),point(x,top,z+len),point(x,bottom,z+len),point(x,bottom,z)];return side==='left'?q:[q[1],q[0],q[3],q[2]];}
function image(layer,src,corners,width=300,height=300){const el=document.createElement('img');el.src=src;el.alt='';el.className='art-original';el.dataset.galleryQuad=JSON.stringify(corners);el.style.width=width+'px';el.style.height=height+'px';el.style.transform=homography([[0,0],[width,0],[width,height],[0,height]],corners);layer.append(el);return el;}
// One physical skirting height for rooms and passage; the opaque foot overlaps
// the floor slightly so anti-aliased image edges cannot expose the slide background.
const skirtingHeight=.16,skirtingFoot=-.025;
function addSkirting(layer,hall=false){
 const corners=hall?[quad(-4,4,skirtingFoot,skirtingHeight,0)]:[
 sideQuad('left',0,DEPTH,skirtingFoot,skirtingHeight),
 quad(-4,4,skirtingFoot,skirtingHeight,DEPTH),
 sideQuad('right',0,DEPTH,skirtingFoot,skirtingHeight)];
 corners.forEach(q=>image(layer,'./assets/art-white-skirting-v1.webp',q,1024,128).classList.add('art-skirting'));
}
function roomWalls(layer){
 const old=[[[0,0],[382,187],[382,405],[0,545]],[[382,187],[898,187],[898,405],[382,405]],[[898,187],[1280,0],[1280,545],[898,405]]];
 const target=[sideQuad('left',0,DEPTH,0,roomHeight),quad(-roomWidth/2,roomWidth/2,0,roomHeight,DEPTH),sideQuad('right',0,DEPTH,0,roomHeight)];
 old.forEach((source,i)=>{
  // Project only this wall's bounded photo region. Transforming the entire
  // room photograph for a side wall can place its unused pixels across the
  // perspective horizon, producing enormous compositor bounds on WebKit.
  const x=Math.min(...source.map(p=>p[0])),y=Math.min(...source.map(p=>p[1]));
  const width=Math.max(...source.map(p=>p[0]))-x,height=Math.max(...source.map(p=>p[1]))-y;
  const local=source.map(([a,b])=>[a-x,b-y]);
  const el=document.createElement('div');el.className='art-photo-wall';
  el.style.width=width+'px';el.style.height=height+'px';
  el.style.backgroundPosition=`${-x}px ${-y}px`;
  el.style.clipPath=`polygon(${local.map(([a,b])=>`${a}px ${b}px`).join(',')})`;
  el.style.transform=homography(local,target[i]);layer.append(el);
 });
 addSkirting(layer);
}
function addCeramics(layer){
 const display=document.createElement('img');display.className='art-photographic-ceramics';display.src='./assets/art-ceramics-near-v5.webp';display.alt='';layer.append(display);
 // Use only the generated photographic white faces. The existing glass and
 // ceramic photographs stay at their original coordinates, with unchanged pixels.
 const bases=document.createElement('div');bases.className='art-podium-extensions';layer.append(bases);
 const faces=[
  // Rear pedestal: the foreground tray occludes its left portion.
  [[[1111,308],[1307,308],[1307,572],[1111,572]],[[1112,502],[1308,502],[1308,815],[1112,815]]],
  // Left pedestal side and front.
  [[[304,447],[360,401],[360,707],[304,782]],[[304,638],[360,593],[360,955],[304,1030]]],
  [[[42,448],[304,448],[304,782],[42,782]],[[41,639],[304,639],[304,1030],[41,1030]]],
  // Right pedestal side and front.
  [[[1335,426],[1381,474],[1381,787],[1335,711]],[[1335,618],[1380,668],[1380,1015],[1335,940]]],
  [[[1381,475],[1638,475],[1638,787],[1381,787]],[[1380,669],[1640,669],[1640,1015],[1380,1015]]],
  // Foreground tray pedestal.
  [[[495,529],[1110,529],[1110,827],[495,827]],[[493,721],[1111,721],[1111,1060],[493,1060]]]
 ];
 faces.forEach(([source,target])=>{
  const x=Math.min(...source.map(p=>p[0])),y=Math.min(...source.map(p=>p[1]));
  const width=Math.max(...source.map(p=>p[0]))-x,height=Math.max(...source.map(p=>p[1]))-y;
  const local=source.map(([a,b])=>[a-x,b-y]);
  const face=document.createElement('div');face.className='art-podium-face';
  face.style.width=width+'px';face.style.height=height+'px';
  face.style.backgroundPosition=`${-x}px ${-y}px`;
  face.style.clipPath=`polygon(${local.map(([a,b])=>`${a}px ${b}px`).join(',')})`;
  face.style.transform=homography(local,target.map(([a,b])=>[a*1280/1672,b*720/941]));bases.append(face);
 });
}
function ensureLayers(ship,hitMap,version){
 let backdrop=ship.querySelector('.art-photo-surfaces');if(!backdrop){backdrop=document.createElement('div');backdrop.className='art-photo-surfaces';backdrop.innerHTML='<div class="art-photo-ceiling"></div><img class="art-photo-floor" src="./assets/art-floor-soft-v4.webp" alt="">';ship.prepend(backdrop);}
 backdrop.querySelector('.art-photo-ceiling').style.background=version===4 ? 'url(./assets/art-hall-ceiling-v1.webp) 0 0 / 1024px 1024px no-repeat' : '';
 const scale=ship.clientWidth/W,height=ship.clientHeight/scale,offset=(height-H)/2;
 const near=Math.max(-5.75,focal*(roomHeight/2)/(height/2+10)-camera);
 for(const [selector,y] of [['.art-photo-ceiling',roomHeight],['.art-photo-floor',0]]){
  const el=backdrop.querySelector(selector);let q=[point(-roomWidth/2,y,near),point(roomWidth/2,y,near),point(roomWidth/2,y,DEPTH),point(-roomWidth/2,y,DEPTH)].map(([x,y])=>[x*scale,(y+offset)*scale]);
  if(version===4){
   const far=point(0,y,0)[1],nearY=H/2+(y===0?1:-1)*(height/2+10),factor=(nearY-VP[1])/(far-VP[1]);
   q=[[640-640*factor,nearY],[640+640*factor,nearY],[1280,far],[0,far]].map(([x,y])=>[x*scale,(y+offset)*scale]);
  }
  el.style.transform=homography([[0,0],[1024,0],[1024,1024],[0,1024]],q);
 }
 let layer=hitMap.querySelector(`.art-preserved-layer[data-room="${version}"]`);
 if(!layer){layer=document.createElement('div');layer.className='art-preserved-layer';layer.dataset.room=version;layer.setAttribute('aria-hidden','true');if(version!==4)roomWalls(layer);
 if(version===2){[4,5,6,7,8,9].forEach((n,i)=>image(layer,`./archive/art/IMG_418${n}.jpg`,sideQuad('left',.12+i*1.04,1,1.1,2.3),300,360));
 image(layer,'./archive/art/selfportrait_01.jpg',sideQuad('right',.3,1.2,1.1,2.3));
 image(layer,'./archive/art/selfportrait_02.jpg',sideQuad('right',1.8,1.2,1.1,2.3));
 const installation=document.createElement('img');installation.className='art-installation-original';installation.src='./assets/art2-fixed-installation-v2.webp';installation.alt='';layer.append(installation);
 const bench=document.createElement('div');bench.className='art-fixed-bench';layer.append(bench);
 }else if(version===4){
 const hallTop=point(0,roomHeight,0)[1],hallBottom=point(0,0,0)[1],panelTop=point(0,skirtingHeight,0)[1];
 for(const [name,a,b,top,bottom] of [['art-hall-photo',75,512,hallTop,hallBottom]]){
  const el=document.createElement('div');el.className=name;
  const src=[[0,a],[W,a],[W,b],[0,b]],dst=[[0,top],[W,top],[W,bottom],[0,bottom]];
  el.style.clipPath=`polygon(${src.map(([x,y])=>`${x}px ${y}px`).join(',')})`;
  el.style.transform=homography(src,dst);layer.append(el);
 }
 addSkirting(layer,true);
 [1,2,3,4,5,6].forEach((n,i)=>image(layer,`./archive/art/IMG0010_0${n}.jpg`,[[310+(i%3)*225,220+Math.floor(i/3)*155],[510+(i%3)*225,220+Math.floor(i/3)*155],[510+(i%3)*225,343+Math.floor(i/3)*155],[310+(i%3)*225,343+Math.floor(i/3)*155]],500,307));
 image(layer,'./assets/art-pige.webp',[[1030,240],[1192,240],[1192,456],[1030,456]],300,400);
 }else{[1,2,3,4,5,6].forEach((n,i)=>image(layer,`./archive/art/${n}_400.jpg`,sideQuad('left',.05+i*1.4,1.2,1.1,2.3)));['hipie','hands','raab','finger','hair','wispher'].forEach((f,i)=>image(layer,`./archive/art/${f}.jpg`,sideQuad('right',.05+(5-i)*1.4,1.2,1.1,2.3)));image(layer,'./assets/art-cat-updated.webp',quad(-2.4,2.4,.30,.30+4.8*1106/1860,DEPTH),1860,1106);addCeramics(layer);}
 hitMap.append(layer);}
 layer.style.setProperty('--art-scale',String(hitMap.clientWidth/W));
}
window.addEventListener('resize',()=>update());

function ensureCatHotspot() {
  const hitMap = document.querySelector('.ship.section-4.is-open .art-hit-map');
  if (!hitMap) return;
  if (hitMap.querySelector('.art-cat-hotspot')) return;
  const hotspot = document.createElement('button');
  hotspot.type = 'button';
  hotspot.className = 'art-hotspot art-cat-hotspot';
  hotspot.setAttribute('aria-label', 'Åbn To sider af en sjæl');
  hotspot.style.cssText = 'left:38%;top:30%;width:25%;height:33%;';
  hotspot.addEventListener('click', () => catDialog.showModal());
  hitMap.append(hotspot);
}
let activeMotion=false,queuedDestination=null,travelAnimation=null;
let scheduled = false;
function update(force=false) {
  if(activeMotion && force!==true)return;
  const artOpen = !!document.querySelector('.ship.section-4.is-open .art-room');
  // has-section remains until the homepage pieces have finished closing.
  const artPresent = !!document.querySelector('.ship.has-section.section-4 .art-room');
  document.body.classList.toggle('art-gallery-open', artOpen);
  document.body.classList.toggle('art-version-2', artPresent && selectedVersion === 2);
  document.body.classList.toggle('art-version-3', artPresent && selectedVersion === 3);
  document.body.classList.toggle('art-version-4', artPresent && selectedVersion === 4);
  if (artPresent && selectedVersion > 1) {
    const hitMap=document.querySelector('.ship.has-section.section-4 .art-hit-map');
    if(hitMap){ensureLayers(hitMap.closest('.ship'),hitMap,selectedVersion);if(artOpen)ensureOpeningReady(hitMap.closest('.ship'),hitMap);}
    if (selectedVersion === 3) ensureCatHotspot();
    if (selectedVersion === 4) ensurePigeHotspot(hitMap);
  }
  else if (catDialog.open) catDialog.close();
  if(!artPresent&&!activeMotion&&!snapshotPreparation)releaseSnapshots();
  syncTabs();
}
new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; update(); });
}).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });

let travelToken=0;
// During travel, move small 2D room snapshots rather than nested projective
// DOM layers. Static rooms and the original-photo viewer remain unchanged.
const travelPhotos=new Map();
const decodedPhotos=new WeakMap();
const openingRooms=new WeakMap();
let roomTexture=null;
let roomSnapshots=null,snapshotPreparation=null;
function readyPhoto(img){
 if(decodedPhotos.has(img))return decodedPhotos.get(img);
 const pending=(async()=>{
  if(!img.complete)await new Promise((resolve,reject)=>{
   const cleanup=()=>{img.removeEventListener('load',loaded);img.removeEventListener('error',failed);};
   const loaded=()=>{cleanup();resolve();};
   const failed=()=>{cleanup();reject(new Error('Billedet kunne ikke indlæses: '+img.src));};
   img.addEventListener('load',loaded,{once:true});img.addEventListener('error',failed,{once:true});
   if(img.complete)(img.naturalWidth?loaded:failed)();
  });
  if(!img.naturalWidth)throw new Error('Billedet kunne ikke indlæses: '+img.src);
  if(typeof img.decode==='function'){
   try{await img.decode();}catch(error){
    // Safari can reject decode for an already loaded image. Check the actual
    // load result rather than swallowing an unfinished or failed request.
    if(!img.complete||!img.naturalWidth)throw error;
   }
  }
  return img;
 })().catch(error=>{decodedPhotos.delete(img);throw error;});
 decodedPhotos.set(img,pending);return pending;
}
async function travelPhoto(src){
 const url=new URL(src,location.href).href;
 if(!travelPhotos.has(url)){
  const img=new Image();img.src=url;
  travelPhotos.set(url,readyPhoto(img).catch(error=>{travelPhotos.delete(url);throw error;}));
 }
 return travelPhotos.get(url);
}
async function readyRoom(ship,map,room){
 const layer=map.querySelector(`.art-preserved-layer[data-room="${room}"]`);
 const elements=[...layer.querySelectorAll('img'),...ship.querySelectorAll('.art-photo-surfaces img')];
 await Promise.all(elements.map(readyPhoto));
 const backgrounds=['art-walls-warm-v2.webp','art-white-skirting-v1.webp','art-floor-soft-v4.webp',room===4?'art-hall-ceiling-v1.webp':'art-ceiling-shadow-v5.webp'];
 if(room===4)backgrounds.push('art-hall-wall-v2.webp');
 if(room===2)backgrounds.push('art2-room-photo-v3.webp');
 if(room===3)backgrounds.push('art-podium-extended-v6.webp');
 await Promise.all(backgrounds.map(src=>travelPhoto('./assets/'+src)));
}
function ensureOpeningReady(ship,map){
 if(openingRooms.has(map))return;
 const veil=document.createElement('div');veil.className='art-initial-loading';
 const label=document.createElement('p');label.setAttribute('role','status');label.textContent='Galleriet indlæses…';veil.append(label);
 const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Luk galleriet under indlæsning');close.onclick=()=>ship.querySelector('[aria-label="Tilbage til menu"]')?.click();veil.append(close);ship.append(veil);
 ship.classList.add('art-images-loading');syncTabs();
 const pending=prepareSnapshots(ship,map).then(()=>{
  veil.remove();ship.classList.remove('art-images-loading');syncTabs();
 }).catch(error=>{
  console.warn('Gallery initial images failed',error);label.textContent='Galleriet kunne ikke indlæses. Genindlæs siden for at prøve igen.';
 });
 openingRooms.set(map,pending);
}
function projectTexture(ctx,texture,m,width,height){
 const project=(x,y)=>{const w=m.m14*x+m.m24*y+m.m44;return [(m.m11*x+m.m21*y+m.m41)/w,(m.m12*x+m.m22*y+m.m42)/w];};
 if(Math.abs(m.m14)+Math.abs(m.m24)<1e-10){ctx.save();ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);ctx.drawImage(texture,0,0,width,height);ctx.restore();return;}
 const view=ctx.getTransform();
 const screen=p=>[view.a*p[0]+view.c*p[1]+view.e,view.b*p[0]+view.d*p[1]+view.f];
 function triangle(src,dst){
  const [[x0,y0],[x1,y1],[x2,y2]]=src,[[u0,v0],[u1,v1],[u2,v2]]=dst;
  const den=x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1);if(Math.abs(den)<1e-8)return;
  const a=(u0*(y1-y2)+u1*(y2-y0)+u2*(y0-y1))/den;
  const c=(u0*(x2-x1)+u1*(x0-x2)+u2*(x1-x0))/den;
  const e=(u0*(x1*y2-x2*y1)+u1*(x2*y0-x0*y2)+u2*(x0*y1-x1*y0))/den;
  const b=(v0*(y1-y2)+v1*(y2-y0)+v2*(y0-y1))/den;
  const d=(v0*(x2-x1)+v1*(x0-x2)+v2*(x1-x0))/den;
  const f=(v0*(x1*y2-x2*y1)+v1*(x2*y0-x0*y2)+v2*(x0*y1-x1*y0))/den;
  const cx=(u0+u1+u2)/3,cy=(v0+v1+v2)/3;
  ctx.save();ctx.beginPath();
  dst.forEach(([x,y],i)=>{const len=Math.hypot(x-cx,y-cy)||1;const p=[x+(x-cx)*.35/len,y+(y-cy)*.35/len];i?ctx.lineTo(...p):ctx.moveTo(...p);});
  ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,e,f);ctx.drawImage(texture,0,0,width,height);ctx.restore();
 }
 function patch(x,y,w,h,depth=0){
  const p=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]],q=p.map(([a,b])=>project(a,b)),bounds=q.map(screen);
  if(Math.max(...bounds.map(p=>p[0]))<0||Math.min(...bounds.map(p=>p[0]))>ctx.canvas.width||Math.max(...bounds.map(p=>p[1]))<0||Math.min(...bounds.map(p=>p[1]))>ctx.canvas.height)return;
  let error=0;
  for(let i=0;i<4;i++){const j=(i+1)%4;const mid=screen(project((p[i][0]+p[j][0])/2,(p[i][1]+p[j][1])/2));error=Math.max(error,Math.hypot(mid[0]-(bounds[i][0]+bounds[j][0])/2,mid[1]-(bounds[i][1]+bounds[j][1])/2));}
  if(error>.2&&depth<10){patch(x,y,w/2,h/2,depth+1);patch(x+w/2,y,w/2,h/2,depth+1);patch(x+w/2,y+h/2,w/2,h/2,depth+1);patch(x,y+h/2,w/2,h/2,depth+1);return;}
  triangle([p[0],p[1],p[2]],[q[0],q[1],q[2]]);triangle([p[0],p[2],p[3]],[q[0],q[2],q[3]]);
 }
 patch(0,0,width,height);
}
async function paintTravelElement(ctx,el){
 const style=getComputedStyle(el),width=parseFloat(style.width),height=parseFloat(style.height);
 if(!width||!height)return;
 const origin=style.transformOrigin.split(' ').map(parseFloat);
 const m=new DOMMatrix().translate(parseFloat(style.left)||0,parseFloat(style.top)||0).translate(origin[0]||0,origin[1]||0).multiply(new DOMMatrix(style.transform==='none'?undefined:style.transform)).translate(-(origin[0]||0),-(origin[1]||0));
 if(el.classList.contains('art-podium-extensions')){
  ctx.save();ctx.transform(m.a,m.b,m.c,m.d,m.e,m.f);
  for(const child of el.children)await paintTravelElement(ctx,child);ctx.restore();return;
 }
 // Reuse one scratch canvas rather than accumulating dozens of canvas contexts
 // while Safari prepares the three rooms.
 const texture=roomTexture||(roomTexture=document.createElement('canvas'));texture.width=Math.ceil(width);texture.height=Math.ceil(height);
 const t=texture.getContext('2d');
 const clip=style.clipPath.match(/^polygon\((.*)\)$/);
 if(clip){t.beginPath();clip[1].split(',').forEach((pair,i)=>{const p=pair.trim().split(/\s+/).map((n,j)=>parseFloat(n)*(n.endsWith('%')?(j?height:width)/100:1));i?t.lineTo(...p):t.moveTo(...p);});t.closePath();t.clip();}
 if(el.tagName==='IMG'){
  await readyPhoto(el);
  if(style.objectFit==='contain'){const s=Math.min(width/el.naturalWidth,height/el.naturalHeight);const w=el.naturalWidth*s,h=el.naturalHeight*s;t.drawImage(el,(width-w)/2,(height-h)/2,w,h);}
  else t.drawImage(el,0,0,width,height);
 }else{
  const url=style.backgroundImage.match(/url\(["']?(.*?)["']?\)/);if(!url)return;
  const img=await travelPhoto(url[1]);const size=style.backgroundSize.split(' ').map(parseFloat),pos=style.backgroundPosition.split(' ').map(parseFloat);
  t.drawImage(img,pos[0]||0,pos[1]||0,size[0]||width,size[1]||height);
 }
 projectTexture(ctx,texture,m,width,height);texture.width=texture.height=1;
}
async function captureRoom(ship){
 const frame=document.createElement('div');frame.className='art-slide-frame';
 const canvas=document.createElement('canvas');canvas.className='art-travel-snapshot';
 const width=ship.clientWidth,height=ship.clientHeight;
 // Three 390x844 rooms at 1.5x use under 9 MB of canvas pixels altogether.
 const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt(1500000/(width*height)));
 canvas.width=Math.ceil(width*ratio);canvas.height=Math.ceil(height*ratio);
 const ctx=canvas.getContext('2d',{alpha:false});ctx.scale(ratio,ratio);ctx.imageSmoothingQuality='high';ctx.fillStyle='#c4bdb4';ctx.fillRect(0,0,width,height);
 const surfaces=ship.querySelector('.art-photo-surfaces');
 for(const el of surfaces.children)await paintTravelElement(ctx,el);
 const source=ship.querySelector(`.art-preserved-layer[data-room="${selectedVersion}"]`);
 ctx.save();const scale=width/W;ctx.translate((width-W*scale)/2,(height-H*scale)/2);ctx.scale(scale,scale);
 const children=[...source.children].sort((a,b)=>(parseInt(getComputedStyle(a).zIndex)||0)-(parseInt(getComputedStyle(b).zIndex)||0));
 for(const el of children)await paintTravelElement(ctx,el);ctx.restore();
 frame.append(canvas);return frame;
}
function snapshotKey(ship){return `${ship.clientWidth}:${ship.clientHeight}:${devicePixelRatio||1}`;}
function releaseSnapshots(){
 if(roomSnapshots){for(const frame of roomSnapshots.frames.values()){const canvas=frame.querySelector('canvas');canvas.width=canvas.height=1;}roomSnapshots=null;}
}
async function prepareSnapshots(ship,map){
 const key=snapshotKey(ship);
 if(roomSnapshots?.key===key)return roomSnapshots;
 if(snapshotPreparation){await snapshotPreparation;return prepareSnapshots(ship,map);}
 const origin=selectedVersion,frames=new Map();
 const pending=(async()=>{
  releaseSnapshots();
  for(const room of versions)ensureLayers(ship,map,room);
  ensureLayers(ship,map,origin);
  await Promise.all(versions.map(room=>readyRoom(ship,map,room)));
  try{
   for(const room of versions){selectedVersion=room;update(true);frames.set(room,await captureRoom(ship));}
   if(snapshotKey(ship)!==key)throw new Error('Gallery viewport changed during preparation');
   roomSnapshots={key,frames};return roomSnapshots;
  }catch(error){for(const frame of frames.values()){const canvas=frame.querySelector('canvas');canvas.width=canvas.height=1;}throw error;}
  finally{selectedVersion=origin;tabVersion=origin;update(true);if(roomTexture)roomTexture.width=roomTexture.height=1;}
 })();
 snapshotPreparation=pending;
 try{return await pending;}finally{snapshotPreparation=null;}
}
// Release the compositor layers if the viewport or section changes mid-flight.
window.addEventListener('resize',()=>{travelAnimation?.cancel();const map=document.querySelector('.ship.section-4.is-open .art-hit-map');if(map){openingRooms.delete(map);if(!activeMotion)update();}});
window.addEventListener('pagehide',()=>travelAnimation?.cancel());
async function navigateGallery(destination,gesture=null) {
 const ship=document.querySelector('.ship.section-4.is-open');
 if(!ship||ship.classList.contains('art-images-loading'))return;
 if(activeMotion){if(!gesture)queuedDestination=destination;return;}
 if(destination===selectedVersion)return;
 const origin=selectedVersion,token=++travelToken,from=versions.indexOf(origin),to=versions.indexOf(destination),direction=Math.sign(to-from);
 const steps=direction>0?versions.slice(from+1,to+1):versions.slice(to,from).reverse();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 activeMotion=true;
 const strip=document.createElement('div');strip.className='art-travel-strip';
 let finalRoom=destination;
 try {
  ship.querySelector('.art-travel-error')?.remove();
  const snapshots=await prepareSnapshots(ship,ship.querySelector('.art-hit-map'));
  if(!ship.matches('.is-open')){finalRoom=origin;return;}
  const width=ship.clientWidth;
  [origin,...steps].forEach((room,i)=>{const frame=snapshots.frames.get(room);frame.style.left=`${i*direction*width}px`;strip.append(frame);});
  ship.append(strip);document.body.classList.add('art-travelling');chooser.classList.add('is-following-room');
  const paint=offset=>{
   strip.style.transform=`translateX(${offset}px)`;
   const position=from-offset/width;strip.dataset.roomPosition=String(position);syncTravelTabs(position);
  };
  let start=0,duration=(reduced?180:1050)*steps.length;
  if(gesture){
   gesture.strip=strip;gesture.width=width;gesture.direction=direction;gesture.follow=paint;
   gesture.paint();await gesture.finished;start=gesture.offset;
   const commit=!gesture.cancelled && gesture.dx*direction<0 && (Math.abs(gesture.dx)>Math.min(60,width*.18) || (Math.abs(gesture.dx)>20 && Math.abs(gesture.velocity)>.45));
   if(!commit)finalRoom=origin;
   duration=reduced?120:Math.max(180,420*(1-Math.min(1,Math.abs(start)/width)));
  }
  const end=finalRoom===origin?0:-direction*width*steps.length;
  travelAnimation=animateRoomTravel(start,end,duration,paint);
  const complete=await travelAnimation.finished;
  if(!complete)finalRoom=tabVersion;
 } catch(error) {
  finalRoom=origin;
  console.warn('Gallery transition could not prepare the complete room',error);
  const notice=document.createElement('div');notice.className='art-travel-error';notice.setAttribute('role','status');notice.textContent='Rummet kunne ikke indlæses. Prøv igen.';ship.querySelector('.art-travel-error')?.remove();ship.append(notice);
 } finally {
  travelAnimation?.cancel();travelAnimation=null;
  strip.querySelectorAll('.art-slide-frame').forEach(frame=>frame.remove());strip.remove();
  document.body.classList.remove('art-travelling');chooser.classList.remove('is-following-room');activeMotion=false;
  selectedVersion=finalRoom;tabVersion=finalRoom;update();syncTravelTabs(versions.indexOf(finalRoom));
  if(token===travelToken)sessionStorage.setItem('dennis-art-room-order-v2',String(finalRoom));
  const pending=queuedDestination;queuedDestination=null;
  if(pending!==null && pending!==selectedVersion)navigateGallery(pending);
 }
}
// Horizontal touch drags follow the finger; vertical gestures remain vertical.
let roomGesture=null,suppressClickUntil=0;
document.addEventListener('pointerdown',event=>{
 if(event.pointerType==='mouse' || activeMotion || document.querySelector('dialog[open]'))return;
 const room=event.target.closest('.ship.section-4.is-open .art-room');if(!room)return;
 roomGesture={id:event.pointerId,room,x:event.clientX,y:event.clientY,dx:0,lastX:event.clientX,lastTime:event.timeStamp,velocity:0,started:false,released:false,cancelled:false,offset:0};
});
document.addEventListener('pointermove',event=>{
 const g=roomGesture;if(!g||event.pointerId!==g.id)return;
 g.dx=event.clientX-g.x;const dy=event.clientY-g.y;
 if(!g.started){
  if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(g.dx)){roomGesture=null;return;}
  if(Math.abs(g.dx)<12||Math.abs(g.dx)<Math.abs(dy))return;
  const direction=g.dx<0?1:-1,next=versions[versions.indexOf(selectedVersion)+direction];
  if(next===undefined){roomGesture=null;return;}
  g.started=true;g.room.setPointerCapture(g.id);
  g.finished=new Promise(resolve=>g.finish=resolve);
  g.paint=()=>{if(!g.strip)return;g.offset=Math.max(-g.width,Math.min(g.width,g.dx));if(g.offset*g.direction>0)g.offset*=.15;g.follow(g.offset);};
  navigateGallery(next,g);
 }
 const dt=event.timeStamp-g.lastTime;if(dt>0)g.velocity=(event.clientX-g.lastX)/dt;
 g.lastX=event.clientX;g.lastTime=event.timeStamp;g.paint();event.preventDefault();
},{passive:false});
function releaseRoomGesture(event){
 const g=roomGesture;if(!g||event.pointerId!==g.id)return;roomGesture=null;
 if(!g.started)return;
 g.cancelled=event.type==='pointercancel';g.released=true;
 if(event.timeStamp-g.lastTime>100)g.velocity=0;
 suppressClickUntil=performance.now()+600;
 g.finish();
 if(g.room.hasPointerCapture(g.id))g.room.releasePointerCapture(g.id);
}
document.addEventListener('pointerup',releaseRoomGesture);
document.addEventListener('pointercancel',releaseRoomGesture);
document.addEventListener('click',event=>{if(performance.now()<suppressClickUntil&&event.target.closest('.art-room')){event.preventDefault();event.stopImmediatePropagation();}},true);

const pigeDialog=document.createElement('dialog');pigeDialog.className='art-cat-dialog';pigeDialog.setAttribute('aria-label','Pige');pigeDialog.innerHTML='<header><h2>Pige</h2><button type="button" aria-label="Luk Pige">Luk ×</button></header><img src="./assets/art-pige.webp" alt="Pige, tekstilværk">';document.body.append(pigeDialog);pigeDialog.querySelector('button').onclick=()=>pigeDialog.close();pigeDialog.onclick=e=>{if(e.target===pigeDialog)pigeDialog.close();};
function ensurePigeHotspot(map){
 if(map.querySelector('.art-pige-hotspot'))return;
 const b=document.createElement('button');b.type='button';b.className='art-hotspot art-pige-hotspot';b.setAttribute('aria-label','Åbn Pige');b.onclick=()=>pigeDialog.showModal();map.append(b);
}

import { installArtViewer } from './art-viewer.js?v=20261001-5';
installArtViewer({getVersion:()=>selectedVersion,homography});

update();
