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

const installed = new WeakSet();
export function installTimelineImageRecovery(doc = document) {
  if (installed.has(doc)) return;
  installed.add(doc);
  const selector = '.timeline-thumbnail, #timeline-search-results img';
  const states = new WeakMap();
  function recover(image, restart = false) {
    if (!image?.matches?.(selector) || !image.isConnected) return;
    const source = image.getAttribute('src');
    if (!source) return;
    let state = states.get(image);
    if (!state || source !== state.current) {
      state = {source, current:source, attempts:0, timer:null, failed:true};
      states.set(image, state);
    }
    state.failed = true;
    if (state.timer !== null) return;
    if (restart) state.attempts = 0;
    if (state.attempts >= retryDelays.length) return;
    state.timer = setTimeout(() => {
      state.timer = null;
      if (!state.failed || !image.isConnected || image.getAttribute('src') !== state.current) return;
      state.current = timelineImageRetryURL(state.source, ++state.attempts, doc.baseURI);
      image.src = state.current;
    }, retryDelays[state.attempts]);
  }
  doc.addEventListener('error', event => recover(event.target), true);
  doc.addEventListener('load', event => {
    const state = states.get(event.target);
    if (state) state.failed = false;
  }, true);
  const retryFailed = () => {
    if (doc.visibilityState === 'hidden') return;
    for (const image of doc.querySelectorAll(selector)) {
      if (states.get(image)?.failed || image.complete && !image.naturalWidth && image.currentSrc) recover(image, true);
    }
  };
  doc.defaultView?.addEventListener('online', retryFailed);
  doc.addEventListener('visibilitychange', retryFailed);
  retryFailed();
}
