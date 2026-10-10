import { stopTimelineMotion } from './timeline-ui.js?v=20261010-talent-release-5';
import { timelineEntries } from '../content/timeline/entries.js?v=20261010-talent-release-5';
const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v5C6 8 3 12 3 20c3-5 6-7 11-7v5l8-7z"/></svg>';
let activePanel;
function closePanel() {
  if (!activePanel) return;
  activePanel.hidden = true;
  activePanel.previousElementSibling?.setAttribute('aria-expanded', 'false');
  activePanel = null;
}
document.addEventListener('pointerdown', event => {
  if (!activePanel || activePanel.contains(event.target) || activePanel.previousElementSibling?.contains(event.target)) return;
  closePanel();
}, true);
function info(dialog) {
  const title=dialog.querySelector('h2')?.textContent?.trim();
  const date=dialog.dataset.entryDate || dialog.querySelector('time')?.getAttribute('datetime');
  const entry=timelineEntries.find(e=>e.date===date && (e.title===title || e.shortTitle===title));
  if(!entry)return null;
  const group=entry.group==='media'?'press':entry.group;
  const url=new URL('/',location.origin);
  url.searchParams.set('opslag',[entry.date,entry.category,entry.title].join('|'));
  url.hash=`timeline-${group}-${entry.year}`;
  return {entry,url:url.href,publicUrl:url.href};
}
function add(dialog) {
  if(dialog.querySelector('.site-share-button'))return;
  const details=info(dialog);if(!details)return;
  const button=document.createElement('button');button.type='button';button.className='site-share-button';button.innerHTML=icon+'<span>DEL</span>';button.setAttribute('aria-label','Del dette opslag');button.setAttribute('aria-expanded','false');
  const panel=document.createElement('div');panel.className='site-share-panel';panel.hidden=true;
  const heading=document.createElement('strong');heading.textContent='Del dette opslag';
  const description=document.createElement('p');description.textContent='Linket åbner direkte på dette opslag.';
  const url=document.createElement('input');url.readOnly=true;url.value=details.publicUrl;url.setAttribute('aria-label','Link til opslaget');
  const copy=document.createElement('button');copy.type='button';copy.textContent='Kopiér link';
  const status=document.createElement('p');status.className='site-share-status';status.setAttribute('role','status');
  copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(details.publicUrl);status.textContent='Linket er kopieret';}catch{panel.insertBefore(url,copy);url.focus();url.select();status.textContent='Kopiér det markerede link';}});
  panel.append(copy);
  if(navigator.share && matchMedia('(pointer: coarse)').matches){const native=document.createElement('button');native.type='button';native.textContent='Del via …';native.addEventListener('click',async()=>{try{await navigator.share({title:details.entry.title,url:details.publicUrl});}catch(e){if(e.name!=='AbortError')status.textContent='Brug Kopiér link i stedet';}});panel.append(native);}
  panel.append(status);dialog.append(button,panel);
  button.addEventListener('click',event=>{const opening=panel.hidden;if(activePanel&&activePanel!==panel)closePanel();panel.hidden=!opening;button.setAttribute('aria-expanded',String(opening));activePanel=opening?panel:null;if(opening){status.textContent='';if(event.detail===0)copy.focus();}});
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();closePanel();button.focus();}});
}
const observer=new MutationObserver(()=>document.querySelectorAll('.timeline-popup,.tg-dialog').forEach(add));observer.observe(document.body,{childList:true,subtree:true});
const key=new URLSearchParams(location.search).get('opslag');
if(key){
 const entry=timelineEntries.find(e=>[e.date,e.category,e.title].join('|')===key);
 if(entry){
  const group=entry.group==='media'?'press':entry.group;const names={live:'Scene',music:'Musik',art:'Kunst',word:'Ord',press:'Presse'};
  let step=0,attempts=0;
  const timer=setInterval(()=>{
   if(++attempts>100){clearInterval(timer);return;}
   if(step===0){const b=[...document.querySelectorAll('.main-menu button,nav[aria-label="Hovedmenu"] button')].find(b=>b.textContent.trim()==='Tidslinje'||b.getAttribute('aria-label')==='Tidslinje');if(b){b.click();step=1;}return;}
   if(step===1){const b=[...document.querySelectorAll('.timeline-groups button')].find(b=>b.textContent.trim()===names[group]);if(b){b.click();step=2;}return;}
   const b=[...document.querySelectorAll('button.timeline-entry')].find(b=>b.textContent.includes(entry.title)&&b.querySelector(`time[datetime="${entry.date}"]`));
   if(b){
    const showEntry = () => {
      if (!b.isConnected) return;
      stopTimelineMotion();
      const scroller=b.closest('.archive-scroll');
      if (!scroller) return;
      const controls=b.closest('.timeline-shell')?.querySelector('.timeline-controls');
      const inset=(controls?.getBoundingClientRect().height || 0)+28;
      scroller.style.scrollBehavior='auto';
      scroller.scrollTop+=b.getBoundingClientRect().top-scroller.getBoundingClientRect().top-inset;
    };
    showEntry();
    b.click();
    const popup=document.querySelector('.timeline-popup,.tg-dialog');
    if(popup){
      clearInterval(timer);
      const closedObserver=new MutationObserver(()=>{
        if(popup.isConnected)return;
        closedObserver.disconnect();
        requestAnimationFrame(()=>{showEntry();b.focus({preventScroll:true});});
      });
      closedObserver.observe(document.body,{childList:true,subtree:true});
    }
   }
  },150);
 }
}
