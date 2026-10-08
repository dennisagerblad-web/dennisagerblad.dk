// Local photographic gallery viewer. Art pixels are never regenerated.
const archive='./archive/art/';
const sets={
 'Selvportrætter i Trashdrag':Array.from({length:6},(_,i)=>archive+`IMG_${4184+i}.jpg`),
 'Færøske Selvportrætter':['hipie','hands','raab','finger','hair','wispher'].map(n=>archive+n+'.jpg'),
 'Det Skjulte Kys':Array.from({length:6},(_,i)=>archive+`${i+1}_400.jpg`),
 'Maleriserie':Array.from({length:6},(_,i)=>archive+`IMG0010_0${i+1}.jpg`),
 'Selvportrætter':['selfportrait_01.jpg','selfportrait_02.jpg'].map(n=>archive+n),
 'Voksen Dukke Leg':['CIMG1156.jpg','CIMG1159.jpg','CIMG1162.jpg','CIMG0125.jpg','DSC09669.jpg','DSC09777.jpg','DSC09832.jpg'].map(n=>archive+n),
 'Kongeligt Porcelæn':Array.from({length:9},(_,i)=>archive+`porcelaen-${i+1}.jpeg`),
 'Pige':['./assets/art-pige.webp'],
 'To sider af en sjæl':['./assets/art-cat-updated.webp']
};
const fullQuality={'./assets/art-pige.webp':'./content/art/originals/pige.png','./assets/art-cat-updated.webp':'./content/art/originals/to-sider-af-en-sjael.jpg'};
const rectangle=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
export function installArtViewer({getVersion,homography}){
 const dialog=document.createElement('dialog');dialog.className='art-focus-viewer';
 dialog.innerHTML='<div class="art-focus-shade"></div><div class="art-focus-stage"></div><header class="art-focus-header"><h2></h2><button aria-label="Luk kunstvisning" class="art-focus-close">×</button></header><button class="art-focus-previous" aria-label="Forrige billede">‹</button><button class="art-focus-next" aria-label="Næste billede">›</button><span class="art-focus-count" aria-live="polite"></span>';
 document.body.append(dialog);
 const stage=dialog.querySelector('.art-focus-stage'),header=dialog.querySelector('header'),shade=dialog.querySelector('.art-focus-shade'),close=dialog.querySelector('.art-focus-close'),previous=dialog.querySelector('.art-focus-previous'),next=dialog.querySelector('.art-focus-next'),count=dialog.querySelector('.art-focus-count');
 let state=null,primary=null,peeks=[],busy=false,pointerStart=null,sequence=0,peekSequence=0;
 const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
 const wallImages=()=>[...document.querySelectorAll(`.art-preserved-layer[data-room="${getVersion()}"] .art-original[data-gallery-quad]`)];
 function sourceFor(src){return wallImages().find(el=>new URL(el.src).href===new URL(src,location.href).href);}
 function corners(el){const layer=el.closest('.art-preserved-layer'),r=layer.getBoundingClientRect(),scale=r.width/1280;return JSON.parse(el.dataset.galleryQuad).map(([x,y])=>[r.left+x*scale,r.top+y*scale]);}
 function origin(src){const el=sourceFor(src);if(el)return corners(el);return state.origin;}
 function target(img){
  const many=state.files.length>1,ratio=img.naturalWidth/img.naturalHeight;
  const viewport=dialog.getBoundingClientRect(),heading=header.getBoundingClientRect();
  const width=dialog.clientWidth||innerWidth,height=dialog.clientHeight||innerHeight;
  // Reserve only a sliver for neighbors; never fit three full artworks.
  const inset=Math.max(many?28:12,heading.left-viewport.left,width-(heading.right-viewport.left));
  const top=Math.max(52,heading.bottom-viewport.top)+8,bottom=many?30:12;
  const wMax=Math.max(1,width-inset*2),hMax=Math.max(1,height-top-bottom);
  const w=Math.min(wMax,hMax*ratio),h=w/ratio;
  return {x:(width-w)/2,y:top+(hMax-h)/2,w,h};
 }
 function matrix(q,img){return homography(rectangle(0,0,img.naturalWidth,img.naturalHeight),q);}
 async function animate(el,frames,duration=650){if(reduced())return;await el.animate(frames,{duration,easing:'cubic-bezier(.22,.7,.2,1)',fill:'none'}).finished.catch(()=>{});}
 // Interpolate projected corners rather than decomposing perspective matrices.
 // Matrix decomposition can flip a right-wall image midway through the animation.
 async function animateArtwork(img,from,to,duration=650){
  img.style.transform=matrix(from,img);
  if(reduced()){img.style.transform=matrix(to,img);return;}
  await new Promise(resolve=>{const start=performance.now();function frame(now){const progress=Math.min(1,(now-start)/duration),ease=1-Math.pow(1-progress,3);const q=from.map((corner,i)=>corner.map((n,j)=>n+(to[i][j]-n)*ease));img.style.transform=matrix(q,img);if(progress<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
 }
 function removePeeks(){++peekSequence;peeks.forEach(img=>img.remove());peeks=[];}
 function setHeader(){
  previous.hidden=state.index===0;next.hidden=state.index===state.files.length-1;count.textContent=state.files.length>1?`${state.index+1} / ${state.files.length}`:'';
 }
 async function picture(src,cls){const img=new Image();img.className=cls;img.draggable=false;img.alt=state.title;img.src=fullQuality[src]||src;await img.decode();img.style.width=img.naturalWidth+'px';img.style.height=img.naturalHeight+'px';return img;}
 async function drawPeek(){
  removePeeks();const request=peekSequence,current=state;
  if(!current)return;
  const neighbors=[-1,1].filter(delta=>current.index+delta>=0&&current.index+delta<current.files.length);
  const images=await Promise.all(neighbors.map(delta=>picture(current.files[current.index+delta],'art-focus-image art-focus-peek')));
  if(state!==current||request!==peekSequence)return;
  const t=target(primary);
  images.forEach((img,i)=>{const delta=neighbors[i],h=t.h,w=h*img.naturalWidth/img.naturalHeight,x=delta<0?t.x-10-w:t.x+t.w+10;img.style.transform=matrix(rectangle(x,t.y,w,h),img);img.setAttribute('aria-label',delta<0?'Vis forrige billede':'Vis næste billede');img.onclick=()=>move(delta);stage.append(img);});
  peeks=images;
 }
 function hideWall(){wallImages().forEach(el=>el.style.visibility=el===sourceFor(state.files[state.index])?'hidden':'');}
 async function open(button,event,title,files){
  if(busy||state)return;busy=true;const token=++sequence;
  const candidates=wallImages().filter(el=>files.some(src=>new URL(src,location.href).href===el.src));
  let index=0;if(candidates.length){const chosen=candidates.reduce((best,el)=>{const r=el.getBoundingClientRect(),d=Math.hypot(event.clientX-(r.left+r.width/2),event.clientY-(r.top+r.height/2));return !best||d<best.d?{el,d}:best;},null).el;index=files.findIndex(src=>new URL(src,location.href).href===chosen.src);}
  else if(title==='Kongeligt Porcelæn'){const n=[...button.parentElement.children].indexOf(button);index=({6:4,7:0,8:2,9:7})[n]??0;}
  const r=button.getBoundingClientRect();state={title,files,index,button,origin:rectangle(r.left,r.top,r.width,r.height)};
  try{primary=await picture(files[index],'art-focus-image art-focus-primary');if(token!==sequence)return;
   dialog.setAttribute('aria-label',title);dialog.querySelector('h2').textContent=title;dialog.showModal();document.body.classList.add('art-focus-open');stage.replaceChildren(primary);const t=target(primary),end=matrix(rectangle(t.x,t.y,t.w,t.h),primary);primary.style.transform=end;setHeader(t);hideWall();
   await Promise.all([animateArtwork(primary,origin(files[index]),rectangle(t.x,t.y,t.w,t.h)),animate(shade,[{opacity:0},{opacity:1}]),animate(header,[{opacity:0},{opacity:1}])]);
   await drawPeek();close.focus();
  }catch(error){console.error('Unable to open artwork',error);await finish();}finally{busy=false;layout();}
 }
 async function move(delta){if(!state||busy)return;const index=state.index+delta;if(index<0||index>=state.files.length)return;busy=true;const old=primary,t=target(old);try{const img=await picture(state.files[index],'art-focus-image art-focus-primary');removePeeks();state.index=index;primary=img;stage.append(img);const nt=target(img),end=matrix(rectangle(nt.x,nt.y,nt.w,nt.h),img);img.style.transform=end;setHeader(nt);hideWall();await Promise.all([animate(old,[{transform:old.style.transform,opacity:1},{transform:matrix(rectangle(t.x-delta*innerWidth,t.y,t.w,t.h),old),opacity:0}],420),animate(img,[{transform:matrix(rectangle(nt.x+delta*innerWidth,nt.y,nt.w,nt.h),img),opacity:.5},{transform:end,opacity:1}],420)]);old.remove();await drawPeek();}finally{busy=false;layout();}}
 async function finish(){if(!state)return;wallImages().forEach(el=>el.style.visibility='');const button=state.button;state=null;primary=null;removePeeks();dialog.close();stage.replaceChildren();document.body.classList.remove('art-focus-open');button?.focus();}
 async function shut(){
  if(!state||busy)return;busy=true;removePeeks();const img=primary,t=target(img),from=rectangle(t.x,t.y,t.w,t.h);let to=origin(state.files[state.index]);
  const installation=state.title==='Voksen Dukke Leg';
  if(installation){const r=state.button.getBoundingClientRect(),scale=Math.min(r.width/t.w,r.height/t.h),w=t.w*scale,h=t.h*scale;to=rectangle(r.left+(r.width-w)/2,r.top+(r.height-h)/2,w,h);}
  await Promise.all([animateArtwork(img,from,to),...((installation||state.title==='Kongeligt Porcelæn')?[animate(img,[{opacity:1},{opacity:0}])]:[]),animate(shade,[{opacity:1},{opacity:0}]),animate(header,[{opacity:1},{opacity:0}])]);
  await finish();busy=false;
 }
 document.addEventListener('click',event=>{const button=event.target.closest('.ship.section-4.is-open .art-hotspot');if(!button)return;const title=button.getAttribute('aria-label')?.replace(/^Åbn /,'');if(!sets[title])return;event.preventDefault();event.stopImmediatePropagation();const files=title==='Selvportrætter'&&getVersion()===2?[...sets[title]].reverse():sets[title];open(button,event,title,files);},true);
 close.onclick=shut;previous.onclick=()=>move(-1);next.onclick=()=>move(1);shade.onclick=shut;
 dialog.addEventListener('cancel',e=>{e.preventDefault();shut();});
 dialog.addEventListener('keydown',e=>{
  if(e.key==='Escape')e.stopPropagation();
  if(e.key==='Tab'){
   const controls=[close,previous,next].filter(button=>!button.hidden&&!button.disabled&&button.getClientRects().length);
   const index=controls.indexOf(document.activeElement);
   e.preventDefault();
   const target=index<0?(e.shiftKey?controls.at(-1):controls[0]):controls[(index+(e.shiftKey?-1:1)+controls.length)%controls.length];
   target?.focus();
  }
  if(e.key==='ArrowRight'){e.preventDefault();move(1);}
  if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}
 });
 dialog.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY};});
 dialog.addEventListener('pointerup',e=>{if(!pointerStart)return;const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;pointerStart=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){e.preventDefault();move(dx<0?1:-1);}});
 function layout(){if(!state||busy||!primary)return;const t=target(primary);primary.style.transform=matrix(rectangle(t.x,t.y,t.w,t.h),primary);setHeader(t);drawPeek();}
 window.addEventListener('resize',layout);
}
