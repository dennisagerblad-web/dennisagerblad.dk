// Keyboard enhancements for the current site; historical archive pages are untouched.
import { stopTimelineMotion } from './timeline-ui.js?v=20261008-year-focus-1';
const root = document.getElementById('root');
const svgNS = 'http://www.w3.org/2000/svg';
function visible(node) {
  const style = getComputedStyle(node);
  return node.getClientRects().length && style.visibility !== 'hidden' && style.display !== 'none'
    && !node.closest('[inert], [aria-hidden="true"]') && !node.disabled;
}
function pageControls() {
  return [...document.querySelectorAll('a[href],button,input,select,textarea,summary,iframe,[tabindex]')]
    .filter(node => node.tabIndex >= 0 && visible(node) && !node.closest('dialog:not([open])'));
}
function syncFace() {
  const face = root?.querySelector('.panel-0');
  if (!face) return;
  face.setAttribute('aria-label','Til forsiden');
  let svg = face.querySelector('.aa-face-focus');
  if (!svg) {
    svg = document.createElementNS(svgNS,'svg');
    svg.classList.add('aa-face-focus'); svg.setAttribute('viewBox','0 0 100 100');
    svg.setAttribute('preserveAspectRatio','none'); svg.setAttribute('aria-hidden','true');
    for (const className of ['aa-face-dark','aa-face-bright']) {
      const polygon = document.createElementNS(svgNS,'polygon'); polygon.classList.add(className); svg.append(polygon);
    }
    face.append(svg);
  }
  const clip = getComputedStyle(face).clipPath;
  if (clip.startsWith('polygon(')) {
    const points = clip.slice(8,-1).split(',').map(pair=>pair.trim().replaceAll('%','').replace(/\s+/,',')).join(' ');
    for (const polygon of svg.children) if (polygon.getAttribute('points') !== points) polygon.setAttribute('points',points);
  }
}
let youtubeAPI;
function loadYouTubeAPI() {
  if(window.YT?.Player)return Promise.resolve(window.YT);
  return youtubeAPI ||= new Promise((resolve,reject)=>{
    const previous=window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady=()=>{previous?.();resolve(window.YT);};
    const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';
    script.onerror=()=>{youtubeAPI=null;reject(Error('Videoafspilleren kunne ikke indlæses.'));};
    document.head.append(script);
  });
}
const videoPlayers=new Set();
function syncVideos() {
  for (const frame of document.querySelectorAll('.video-frame,.timeline-video-viewer')) {
    if(frame.querySelector('.aa-video-entry'))continue;
    const iframe=frame.querySelector('iframe');if(!iframe)continue;
    iframe.tabIndex=-1;
    const entry=document.createElement('button');entry.type='button';entry.className='aa-video-entry';
    const title=iframe.title;
    entry.textContent=`Afspil video: ${title}`;
    entry.setAttribute('aria-description','Enter afspiller eller pauser videoen her på siden. Tab går videre.');
    frame.prepend(entry);
    let player,ready=false,pending=false;
    entry.addEventListener('click',()=>{
      if(!ready){pending=true;entry.textContent=`Indlæser video: ${title}`;return;}
      if(player.getPlayerState()===1)player.pauseVideo();else player.playVideo();
    });
    loadYouTubeAPI().then(YT=>{
      if(!iframe.isConnected)return;
      player=new YT.Player(iframe,{events:{
        onReady:()=>{ready=true;entry.textContent=`Afspil video: ${title}`;if(pending)player.playVideo();},
        onStateChange:event=>{
          entry.textContent=`${event.data===1?'Pause':'Afspil'} video: ${title}`;
          frame.dataset.playback=String(event.data);
        },
        onError:()=>{entry.textContent=`Videoen kan ikke afspilles: ${title}`;}
      }});
      videoPlayers.add(player);
    }).catch(()=>{entry.textContent=`Videoafspilleren kunne ikke indlæses: ${title}`;});
  }
}
function focusCategories() {
  const selected=root.querySelector('.timeline-groups button[aria-pressed="true"]');
  if(!selected)return false;
  stopTimelineMotion();
  const scroller=selected.closest('.archive-scroll');
  if(scroller)scroller.scrollTop=0;
  selected.focus({preventScroll:true});
  return true;
}
let selectedYear=null, selectedYearScroll=null;
document.addEventListener('click',event=>{
  const year=event.target.closest('.timeline-year-rail a');
  if(year)selectedYear=document.getElementById(year.getAttribute('href').slice(1));
  if(event.target.closest('.timeline-groups button')){selectedYear=null;selectedYearScroll=null;}
},true);
function focusChosenYear() {
  if(!selectedYear?.isConnected)return false;
  stopTimelineMotion();
  selectedYear.tabIndex=-1;
  const heading=selectedYear.querySelector('h2');
  if(heading){heading.id ||= selectedYear.id+'-heading';selectedYear.setAttribute('role','region');selectedYear.setAttribute('aria-labelledby',heading.id);}
  selectedYearScroll=selectedYear.closest('.archive-scroll')?.scrollTop;
  selectedYear.focus({preventScroll:true});
  return true;
}
function orderedControls() {
  const face=root.querySelector('.panel-0');
  const controls=pageControls().filter(node=>node!==face
    &&!node.matches('.video-frame iframe')&&!node.closest('.art-version-chooser'));
  const tabs=[...document.querySelectorAll('.art-version-chooser button')].filter(visible);
  const timeline=controls.filter(node=>node.matches('.timeline-groups button,.timeline-year-rail a'));
  const orderedTimeline=[...timeline.filter(node=>node.matches('button')),...timeline.filter(node=>node.matches('a'))];
  let content=controls.filter(node=>!timeline.includes(node));
  if(selectedYear?.isConnected){
    content=content.filter(node=>selectedYear.contains(node));
  }
  return [...tabs,...orderedTimeline,...content,...(visible(face)?[face]:[])];
}
let scheduled=false;
function schedule() {
  if (scheduled) return; scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;syncFace();syncVideos();});
}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','open']});
window.addEventListener('resize',schedule); schedule();
// Keep keyboard focus visible without leaving a frame after a touch or mouse click.
document.documentElement.dataset.aaInput='pointer';
document.addEventListener('pointerdown',()=>{
  document.documentElement.dataset.aaInput='pointer';syncFrameFocus();
},true);
document.addEventListener('keydown',event=>{
  if (['Tab','Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) {
    document.documentElement.dataset.aaInput='keyboard';syncFrameFocus();
  }
},true);
function syncFrameFocus() {
  const active=document.activeElement;
  for (const frame of document.querySelectorAll('iframe')) frame.classList.toggle('aa-frame-focused', frame===active && document.documentElement.dataset.aaInput==='keyboard');
}
window.addEventListener('blur',()=>setTimeout(syncFrameFocus,0));
document.addEventListener('focusin',syncFrameFocus);
document.addEventListener('keydown',event=> {
  if (!root?.querySelector('.ship.is-open')
    || document.querySelector('dialog[open],.timeline-overlay,.performance-lightbox,.art-series-overlay')) return;
  const face=root.querySelector('.panel-0');
  if (!face || !visible(face)) return;
  if(event.key==='Escape'){for(const player of videoPlayers)try{player.pauseVideo();}catch{}}
  if(event.key==='Escape'&&root.querySelector('.ship.section-5')){
    event.preventDefault();event.stopPropagation();focusCategories();return;
  }
  if(event.key!=='Tab')return;
  const controls=orderedControls(), index=controls.indexOf(document.activeElement);
  if(document.activeElement===selectedYear){
    event.preventDefault();
    const local=controls.filter(node=>selectedYear.contains(node));
    const target=event.shiftKey?root.querySelector('.timeline-year-rail a[href="#'+selectedYear.id+'"]'):local[0]||face;
    target?.focus({preventScroll:true});
    if(target===face&&selectedYearScroll!==null)selectedYear.closest('.archive-scroll').scrollTop=selectedYearScroll;
    return;
  }
  if(index<0&&!document.activeElement.matches('h1'))return;
  event.preventDefault();
  const next=index<0?(event.shiftKey?controls.at(-1):controls[0]):controls[(index+(event.shiftKey?-1:1)+controls.length)%controls.length];
  if(document.activeElement.closest('.timeline-year-rail')&&!next?.closest('.timeline-year-rail')){
    stopTimelineMotion();if(!event.shiftKey&&focusChosenYear())return;
  }
  next?.focus(next===face?{preventScroll:true}:undefined);
});
