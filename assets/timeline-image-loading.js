// Retry only failed Timeline image requests; successful images retain their URL.
const retryDelays = [300, 1200];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
export function timelineImageRetryURL(source, attempt, base) {
  const url = new URL(source, base);
  if (!/^https?:$/.test(url.protocol)) return source;
  url.searchParams.set('timeline-image-retry', `${Date.now()}-${attempt}`);
  return url.href;
}
export async function loadTimelineImage(source, options = {}) {
  const ImageCtor = options.ImageCtor || Image;
  const pause = options.wait || wait;
  let failure;
  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    if (attempt) await pause(retryDelays[attempt - 1]);
    try {
      return await new Promise((resolve, reject) => {
        const image = new ImageCtor(); image.decoding = 'async';
        const clear = () => { image.onload = image.onerror = null; };
        image.onload = () => {
          clear();
          if (image.naturalWidth > 0 && image.naturalHeight > 0) resolve(image);
          else reject(new Error('Image has no decoded pixels'));
        };
        image.onerror = () => { clear(); reject(new Error('Image request failed')); };
        image.src = attempt ? timelineImageRetryURL(source, attempt) : source;
      });
    } catch (error) { failure = error; }
  }
  throw new Error(`Timeline image could not be loaded: ${source}`, {cause:failure});
}

// A load/error event is not guaranteed after a suspended Safari tab or a stalled
// native lazy request. Check pixels as well, and repair only images near view.
export function shouldReloadImages({failed,oldest=0,online=true,blocked=false}) {
  return online && !blocked && oldest >= 12000 && failed > 0;
}
export function claimImageReload(storage, now) {
  if (!storage) return false; // Without a durable guard an automatic reload is unsafe.
  try {
    const previous = Number(storage.getItem('dennis-image-reload-at'));
    if (previous > 0 && now - previous < 600000) return false;
    storage.setItem('dennis-image-reload-at', String(now));
    return storage.getItem('dennis-image-reload-at') === String(now);
  } catch { return false; }
}
const recoveryKey = Symbol.for('dennis-image-recovery');
export function installTimelineImageRecovery(doc = document, options = {}) {
  if (doc[recoveryKey]) return doc[recoveryKey];
  const win=doc.defaultView || globalThis, now=options.now || Date.now;
  const later=options.setTimeout || setTimeout, cancel=options.clearTimeout || clearTimeout;
  const repeat=options.setInterval || setInterval, cancelRepeat=options.clearInterval || clearInterval;
  const selector='.timeline-thumbnail, #timeline-search-results img, .face-menu .collage-word, .vertical-name img, .section-heading .collage-word';
  const delays=[500,2000,5000], states=new WeakMap(), queue=[];
  let active=0, timer=null, disposed=false, reloading=false;
  let reachable=false,confirmedAt=0,probeAt=-Infinity,probing=false;
  const online=()=>win.navigator?.onLine!==false || reachable;
  function probe() {
    if (probing || now()-probeAt<15000 || !win.fetch) return;
    probing=true;probeAt=now();
    const controller=new AbortController(),timeout=later(()=>controller.abort(),4000);
    const url=new URL('./assets/image-recovery-probe.txt',doc.baseURI);url.searchParams.set('v',String(now()));
    Promise.resolve(win.fetch(url.href,{method:'HEAD',cache:'no-store',credentials:'omit',signal:controller.signal}))
      .then(response=>{reachable=!!response;confirmedAt=reachable?now():0;})
      .catch(()=>{reachable=false;confirmedAt=0;})
      .finally(()=>{cancel(timeout);probing=false;schedule();});
  }
  const connected=image=>image?.isConnected && image.matches?.(selector);
  const visible=options.visible || (image=>{
    if (!connected(image) || !image.getClientRects().length) return false;
    if (image.closest('.face-menu') && doc.querySelector('.ship.has-section')) return false;
    if (image.closest('.vertical-name') && doc.querySelector('.ship.has-section')) return false;
    let r=image.getBoundingClientRect();
    // Pending/failed images may have no intrinsic size yet. Their visible
    // timeline card still tells us that the visitor is looking at this image.
    if (!r.width || !r.height) r=image.closest('.timeline-entry,.menu-point,.section-heading,.vertical-name')?.getBoundingClientRect() || r;
    const clip=image.closest('.archive-scroll')?.getBoundingClientRect();
    const top=Math.max(0,clip?.top || 0),bottom=Math.min(win.innerHeight,clip?.bottom || win.innerHeight);
    return r.width>0 && r.height>0 && r.bottom>top && r.top<bottom && r.right>0 && r.left<win.innerWidth;
  });
  function stateFor(image) {
    const src=image.getAttribute('src'); if (!src) return null;
    let state=states.get(image);
    if (!state || src!==state.current) {
      if (state?.active) release(state);
      state={source:src,current:src,attempts:0,firstSeen:now(),pendingSince:now(),failed:false,queued:false,active:false,nextAt:0,timeout:null};
      states.set(image,state);
    }
    return state;
  }
  function release(state) {
    if (state.timeout!==null) { cancel(state.timeout); state.timeout=null; }
    if (state.active) { state.active=false; active--; }
  }
  function schedule() {
    if (!disposed && timer===null) timer=later(()=>{timer=null;check();},150);
  }
  function fail(image) {
    if (!connected(image)) return;
    const state=stateFor(image); if (!state) return;
    release(state);state.failed=true;state.nextAt=now()+(delays[state.attempts] || 0);
    schedule();
  }
  function loaded(image) {
    if (!connected(image) || !image.naturalWidth) return;
    const state=states.get(image); if (!state) return;
    release(state);state.failed=false;state.queued=false;
    if (image.dataset) image.dataset.imageRecovery='recovered';
    schedule();
  }
  function pump() {
    if (doc.visibilityState==='hidden') return;
    while (active<2 && queue.length) {
      const [image,state]=queue.shift();state.queued=false;
      if (!connected(image) || states.get(image)!==state || !visible(image) || state.attempts>=delays.length) continue;
      if (image.complete && image.naturalWidth>0) { loaded(image);continue; }
      state.active=true;active++;state.attempts++;state.failed=false;state.pendingSince=now();
      // If the small preview itself is unavailable, use this entry's existing source.
      const fallback=image.getAttribute('data-image-fallback');
      const source=state.attempts===delays.length && fallback ? fallback : state.source;
      state.current=timelineImageRetryURL(source,state.attempts,doc.baseURI);
      state.timeout=later(()=>{
        release(state);
        if (!connected(image) || states.get(image)!==state) return;
        if (image.complete && image.naturalWidth>0) loaded(image);
        else { state.failed=true;state.nextAt=now()+(delays[state.attempts] || 0);schedule(); }
      },16000);
      image.loading='eager';image.decoding='async';
      if (image.dataset) image.dataset.imageRecovery='retry-'+state.attempts;
      image.src=state.current;
    }
  }
  function reload() {
    let storage;try { storage=win.sessionStorage; } catch { return; }
    if (!claimImageReload(storage,now())) return;
    reloading=true;
    if (options.reload) { options.reload();return; }
    const url=new URL(win.location.href);
    if (doc.querySelector('.section-5 .timeline-shell')) {
      win.DennisTimelinePosition?.addToUrl(url);url.pathname='/tidslinje/';
    }
    url.searchParams.set('image-recovery',String(now()));
    win.location.replace(url.href);
  }
  function check() {
    if (disposed || reloading || doc.visibilityState==='hidden') return;
    const isOnline=online(), images=[...doc.querySelectorAll(selector)].filter(visible), failures=[];
    for (const image of images) {
      if (image.complete && image.naturalWidth>0) { if (states.get(image)?.active) loaded(image);continue; }
      const state=stateFor(image);if (!state) continue;
      // Promote only visible lazy images: do not start the whole timeline at once.
      if (image.loading==='lazy') image.loading='eager';
      if (image.complete && !image.naturalWidth) state.failed=true;
      if (!state.active && !state.queued && state.attempts<delays.length &&
          (state.failed && now()>=state.nextAt || !state.failed && now()-state.pendingSince>=16000)) {
        state.queued=true;queue.push([image,state]);
      }
      if (state.attempts>=delays.length && state.failed && !state.active) failures.push([image,state]);
    }
    if (!isOnline && images.some(image=>!image.naturalWidth)) probe();
    pump();
    const oldest=failures.length ? Math.max(...failures.map(([,s])=>now()-s.firstSeen)) : 0;
    const blocked=!!doc.querySelector('.timeline-overlay,.performance-lightbox,.art-series-overlay') ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(doc.activeElement?.tagName || '');
    if (shouldReloadImages({failed:failures.length,oldest,online:isOnline,blocked})) {
      if (confirmedAt>0 && now()-confirmedAt<30000) reload(); else probe();
    }
  }
  const onError=e=>fail(e.target),onLoad=e=>loaded(e.target);
  const restored=()=>{
    if (doc.visibilityState==='hidden') return;
    for (const image of doc.querySelectorAll(selector)) {
      const state=states.get(image);
      if (state?.failed && !state.active) {state.attempts=0;state.nextAt=0;state.firstSeen=now();}
    }
    schedule();
  };
  doc.addEventListener('error',onError,true);doc.addEventListener('load',onLoad,true);
  doc.addEventListener('visibilitychange',restored);doc.addEventListener('scroll',schedule,{capture:true,passive:true});
  win.addEventListener?.('online',restored);win.addEventListener?.('pageshow',restored);
  const interval=repeat(check,1500);
  const control={check,dispose(){disposed=true;cancel(timer);cancelRepeat(interval);
    doc.removeEventListener?.('error',onError,true);doc.removeEventListener?.('load',onLoad,true);
    doc.removeEventListener?.('visibilitychange',restored);doc.removeEventListener?.('scroll',schedule,true);
    win.removeEventListener?.('online',restored);win.removeEventListener?.('pageshow',restored);
    for (const image of doc.querySelectorAll(selector)) {const state=states.get(image);if(state)release(state);}
    delete doc[recoveryKey];
  }};
  doc[recoveryKey]=control;schedule();return control;
}
