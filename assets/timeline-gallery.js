/* Named timeline effects: Grow, Paint, Morph and Contrast.
   Paint adapted from paniq's MIT-licensed GL Transitions shader.
   See timeline-gallery-LICENSE.txt. No UI Initiative code is included. */
import { timelineDate } from './timeline-ui.js?v=20261018-sproghoved-1';
import { attachPinchZoom } from './pinch-zoom.js?v=20261009-search-zoom-2';
import { videoEmbedURL } from './video-embed-url.js?v=20261012-video-history-1';
import { timelineEntries } from '../content/timeline/entries.js?v=20261020-scoop-2022-1';
import { timelinePopupParagraphs, timelinePopupGroup } from './timeline-popup-content.js?v=20261020-native-popups-3';
let dataPromise;
let closeActive;
let requestedSearchImage;
export const loadTimelineGalleryData = () => loadData();
export function selectTimelineSearchImage(entry, src) {
  requestedSearchImage={key:`${entry.date}|${entry.category}|${entry.title}`,src,expires:Date.now()+5000};
}
const assetBase = new URL('../', import.meta.url);
const absolute = src => new URL(src, assetBase).href;
const loadData = () => dataPromise ||= Promise.all([
  '../content/timeline/galleries.json?v=20261020-scoop-2022-1',
  '../content/timeline/image-metadata.json?v=20261020-scoop-2022-1',
  '../content/timeline/popup-content.json?v=20261020-native-popups-3',
].map((path,index) => fetch(new URL(path, import.meta.url)).then(response => {
  if (!response.ok) throw new Error('Gallery data unavailable');
  return response.json();
}).catch(error => { if (index === 2) return {}; throw error; })))
  .then(([galleries, metadata, native]) => ({
    entries:{...galleries.entries,...Object.fromEntries(Object.entries(native.entries || {}).map(([key,record])=>{
      const curated=galleries.entries[key];
      const source=curated || record;
      const excluded=new Set(record.excludedImages || []);
      const pairs=(source.images || []).map((src,index)=>({src,description:source.imageDescriptions?.[index] || ''}))
        .filter(({src})=>!(record.group==='press' && (excluded.has(src) || /\/logoer\/|logo|krydd|oyggjaskeggi/i.test(src))));
      return [key,{...record,...curated,details:[...(curated?.details || []),...(record.details || [])],
        detailMarkup:record.detailMarkup,archiveDetails:record.details,
        images:pairs.map(image=>image.src),imageDescriptions:pairs.map(image=>image.description)}];
    }))},
    media:{...metadata.media,...Object.fromEntries(Object.entries(native.media || {}).map(([src,size])=>[src,{...size,...metadata.media[src]}]))},
    related:native.related || {},
  }))
  .catch(error => { dataPromise = null; throw error; });
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
};
const button = (text, label, click) => {
  const node = el('button', '', text);
  node.type = 'button'; node.setAttribute('aria-label', label); node.addEventListener('click', click);
  return node;
};
const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
export const sceneDuration = 1000;
export const sineEase = t => .5 - Math.cos(clamp(t,0,1)*Math.PI)/2;
// Grow remains available: change live to 'Grow' to restore its approved motion.
export const galleryEffects = Object.freeze({
  Grow: { shader:0, intensity:0, duration:1000 },
  Paint: { shader:1, intensity:0, duration:1100 },
  Morph: { shader:2, intensity:.3, duration:1000 },
  Contrast: { shader:3, intensity:0, duration:1100 },
});
export const timelineEffects = Object.freeze({ live:'Morph', art:'Paint', press:'Contrast' });

// Use all available space while preserving the complete photograph.
export function containRect(imageWidth, imageHeight, frameWidth, frameHeight) {
  const scale = Math.min(frameWidth / imageWidth, frameHeight / imageHeight);
  const width = imageWidth * scale, height = imageHeight * scale;
  return [(frameWidth-width)/2, (frameHeight-height)/2, width, height];
}

// The widest photograph determines the desktop envelope for the whole series.
// Portrait photographs still fit in full, without changing the popup per slide.
export function galleryRatio(items, media, viewportRatio = 4/3) {
  const ratios = items.map(src => media[src]).filter(m => m?.width > 0 && m?.height > 0).map(m => m.width / m.height);
  return ratios.length ? Math.max(...ratios) : 4/3;
}

// One envelope for the entire slideshow, independent of the selected slide.
export function mobileGalleryRatios(items, media) {
  const ratios=items.map(src=>media[src]).filter(m=>m?.width>0 && m?.height>0).map(m=>m.width/m.height);
  return {tallest:ratios.length ? Math.min(...ratios) : 3/4, widest:ratios.length ? Math.max(...ratios) : 4/3};
}

const backdropCache = new WeakMap();
function blurredBackdrop(image, w, h) {
  const cached = backdropCache.get(image);
  if (cached?.width === w && cached?.height === h) return cached.canvas;
  // Blur a small copy in pixels, so the backdrop also works in browsers that
  // do not implement CanvasRenderingContext2D.filter.
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w / 8));
  canvas.height = Math.max(1, Math.ceil(h / 8));
  const ctx = canvas.getContext('2d');
  const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * 1.16;
  const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
  ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const temporary = new Uint8ClampedArray(pixels.data.length);
  const radius = Math.max(2, Math.round(Math.min(w, h) * .045 / 8));
  const blur = (source, target, horizontal) => {
    const length = horizontal ? canvas.width : canvas.height;
    const lines = horizontal ? canvas.height : canvas.width;
    const stride = horizontal ? 4 : canvas.width * 4;
    const divisor = radius * 2 + 1;
    for (let line = 0; line < lines; line++) {
      const start = horizontal ? line * canvas.width * 4 : line * 4;
      for (let channel = 0; channel < 4; channel++) {
        let sum = 0;
        for (let offset = -radius; offset <= radius; offset++) {
          sum += source[start + clamp(offset, 0, length - 1) * stride + channel];
        }
        for (let position = 0; position < length; position++) {
          target[start + position * stride + channel] = sum / divisor;
          sum += source[start + Math.min(length - 1, position + radius + 1) * stride + channel]
            - source[start + Math.max(0, position - radius) * stride + channel];
        }
      }
    }
  };
  for (let pass = 0; pass < 3; pass++) {
    blur(pixels.data, temporary, true);
    blur(temporary, pixels.data, false);
  }
  ctx.putImageData(pixels, 0, 0);
  backdropCache.set(image, { width: w, height: h, canvas });
  return canvas;
}

function compose(image, w, h, useBackdrop, displayRatio) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const pixelRatio = Math.min(devicePixelRatio || 1, 2);
  const frameWidth = w / pixelRatio, frameHeight = h / pixelRatio;
  ctx.imageSmoothingQuality = 'high';
  if (useBackdrop) {
    ctx.drawImage(blurredBackdrop(image, w, h), 0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.36)';
    ctx.fillRect(0, 0, w, h);
  }
  // Fit the sharp photograph to the available frame, also for smaller originals.
  const [x,y,iw,ih] = containRect(displayRatio || image.naturalWidth,displayRatio ? 1 : image.naturalHeight,frameWidth,frameHeight);
  ctx.drawImage(image,x*pixelRatio,y*pixelRatio,iw*pixelRatio,ih*pixelRatio);
  return canvas;
}

function createTransition(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) return null;
  const resources = [];
  const compile = (type, source) => {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    resources.push(['shader', shader]);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error('Shader compilation failed');
    return shader;
  };
  let program, buffer, textures;
  const destroy = () => {
    for (const [type, item] of resources) {
      if (type === 'shader') gl.deleteShader(item);
      if (type === 'texture') gl.deleteTexture(item);
      if (type === 'program') gl.deleteProgram(item);
      if (type === 'buffer') gl.deleteBuffer(item);
    }
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
  try {
    const vertex = compile(gl.VERTEX_SHADER, `attribute vec2 position; varying vec2 uv;
      void main(){ uv=vec2((position.x+1.)*.5, (1.-position.y)*.5); gl_Position=vec4(position,0.,1.); }`);
    const fragment = compile(gl.FRAGMENT_SHADER, `precision highp float;
      varying vec2 uv; uniform sampler2D before; uniform sampler2D after;
      uniform sampler2D flowBefore; uniform sampler2D flowAfter;
      uniform float progress; uniform float effect; uniform float direction;
      uniform float intensity;
      uniform vec2 viewportSize;
      float stretchHash(vec2 p) {
        return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);
      }
      float stretchNoise(vec2 p) {
        vec2 cell=floor(p), f=fract(p);
        f=f*f*(3.-2.*f);
        return mix(mix(stretchHash(cell),stretchHash(cell+vec2(1.,0.)),f.x),
                   mix(stretchHash(cell+vec2(0.,1.)),stretchHash(cell+vec2(1.,1.)),f.x),f.y);
      }
      void main(){
        float p=progress;
        if(effect<.5){
          // Grow: the approved vertical center-stretch, preserved unchanged.
          // A fixed 20%-height vertical displacement, modulated by soft
          // 100 CSS-pixel noise patches (1..1.5x), strongest along x=.5.
          // No horizontal sampling offset and no unused intensity setting.
          vec2 center=uv-.5;
          float lens=1.-.85*smoothstep(0.,.5,abs(center.x));
          float organic=1.+.5*stretchNoise(uv*viewportSize/100.);
          float displacement=.2*(center.y*2.)*lens*organic;
          // Inverse texture sampling: inward lookup stretches the old image
          // outward; outward lookup starts the new image compressed inward.
          vec2 a=vec2(uv.x,uv.y-displacement*p);
          vec2 b=vec2(uv.x,uv.y+displacement*(1.-p));
          gl_FragColor=mix(texture2D(before,clamp(a,0.,1.)),texture2D(after,clamp(b,0.,1.)),p);
        } else if(effect<1.5) {
          // Paint: the approved horizontal effect, preserved unchanged.
          // paniq / GL Transitions morph (MIT), adapted to the horizontal axis.
          // Both photos share the displacement field, preserving image detail
          // instead of bending the whole frame with an unrelated sine wave.
          vec4 ca=texture2D(flowBefore,uv), cb=texture2D(flowAfter,uv);
          float oa=ca.r+ca.b-1., ob=cb.r+cb.b-1.;
          float offset=mix(oa,ob,.5)*.65*direction;
          vec2 a=vec2(uv.x+offset*p,uv.y);
          vec2 b=vec2(uv.x-offset*(1.-p),uv.y);
          gl_FragColor=mix(texture2D(before,clamp(a,0.,1.)),texture2D(after,clamp(b,0.,1.)),p);
        } else if(effect<2.5) {
          // Morph: each full-resolution photo displaces the OTHER photo.
          // Arithmetic RGB mean, no external noise or blurred flow map.
          float oldLight=dot(texture2D(before,uv).rgb,vec3(1./3.));
          float newLight=dot(texture2D(after,uv).rgb,vec3(1./3.));
          // UV y increases downward. Both lookups start above their visible
          // pixels: the old moves down as p grows; the new rises into place
          // as (1-p) shrinks. Black=0, white=30% at intensity .3.
          vec2 a=vec2(uv.x,uv.y-direction*intensity*newLight*p);
          vec2 b=vec2(uv.x,uv.y-direction*intensity*oldLight*(1.-p));
          gl_FragColor=mix(texture2D(before,clamp(a,0.,1.)),texture2D(after,clamp(b,0.,1.)),p);
        } else {
          // Contrast between the two source photographs guides the reveal.
          // Only their original pixels are sampled and blended; RGB values
          // are never rotated, inverted, saturated or otherwise recoloured.
          vec3 oldColour=texture2D(before,uv).rgb;
          vec3 newColour=texture2D(after,uv).rgb;
          float contrast=clamp(length(oldColour-newColour)*.577350269,0.,1.);
          float movement=4.*p*(1.-p);
          vec2 a=vec2(uv.x+direction*.06*p*contrast,uv.y);
          vec2 b=vec2(uv.x-direction*.12*(1.-p)*contrast,uv.y);
          float reveal=clamp(p+.55*(contrast-.3)*movement,0.,1.);
          gl_FragColor=mix(texture2D(before,clamp(a,0.,1.)),
                           texture2D(after,clamp(b,0.,1.)),reveal);
        }
      }`);
    program = gl.createProgram(); resources.push(['program', program]);
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('Shader link failed');
    gl.useProgram(program);
    buffer = gl.createBuffer(); resources.push(['buffer', buffer]); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniforms=['before','after','flowBefore','flowAfter'];
    textures = uniforms.map((name,unit) => {
      const texture = gl.createTexture(); resources.push(['texture', texture]);
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(program, name), unit);
      return texture;
    });
  } catch { destroy(); return null; }
  const progress = gl.getUniformLocation(program, 'progress');
  return {
    prepare(before, after, effect, direction) {
      canvas.width = before.width; canvas.height = before.height; gl.viewport(0,0,canvas.width,canvas.height);
      // Low-pass only the displacement maps; source photos remain sharp.
      // Fine wall/cloth texture must not turn the transition into pixel noise.
      const flow = source => {
        const map=document.createElement('canvas'); map.width=128; map.height=Math.max(32,Math.round(128*source.height/source.width));
        const ctx=map.getContext('2d'); ctx.filter='blur(2px)';
        ctx.drawImage(source,-4,-4,map.width+8,map.height+8); return map;
      };
      [before,after,flow(before),flow(after)].forEach((image, unit) => {
        gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      });
      const preset=galleryEffects[effect];
      gl.uniform1f(gl.getUniformLocation(program, 'effect'), preset.shader);
      gl.uniform1f(gl.getUniformLocation(program, 'intensity'), clamp(preset.intensity,0,2));
      gl.uniform1f(gl.getUniformLocation(program, 'direction'), direction);
      gl.uniform2f(gl.getUniformLocation(program,'viewportSize'),canvas.clientWidth,canvas.clientHeight);
    },
    draw(p) { gl.uniform1f(progress, p); gl.drawArrays(gl.TRIANGLES, 0, 6); }, destroy,
  };
}

// Keep a gallery's chosen thumbnail first without separating descriptions
// from their images. Search openings still select their requested photograph.
export function thumbnailFirst(images, descriptions, thumbnail) {
  const identity = src => { const url = new URL(absolute(src)); url.search = ''; url.hash = ''; return url.href; };
  const first = thumbnail ? images.findIndex(src => identity(src) === identity(thumbnail)) : -1;
  const order = images.map((_, i) => i);
  if (first > 0) order.unshift(...order.splice(first, 1));
  return { images: order.map(i => images[i]), descriptions: order.map(i => descriptions[i]) };
}

export function openTimelineGallery(entry, group, theme = {}, options = {}) {
  closeActive?.();
  const proportion=String(entry.archiveImageAspectRatio || '').split('/').map(Number);
  const displayRatio=proportion.length===2 && proportion.every(value=>value>0) ? proportion[0]/proportion[1] : undefined;
  const composePhoto=(image,w,h,backdrop)=>compose(image,w,h,backdrop,displayRatio);
  const searchImage=options.initialImage || (requestedSearchImage?.key===`${entry.date}|${entry.category}|${entry.title}` && requestedSearchImage.expires>Date.now() ? requestedSearchImage.src : null);
  requestedSearchImage=null;
  const effectName=Object.hasOwn(galleryEffects,entry.galleryEffect) ? entry.galleryEffect : timelineEffects[group] || 'Grow';
  const palettes={music:'#123d50',live:'#410c12',art:'#452c0c',word:'#34203f',press:'#2b2828'};
  theme={'--timeline-deep':palettes[group] || '#171719',...theme};
  const opener = document.activeElement;
  const root = document.getElementById('root');
  const oldInert = root?.inert;
  if (root) root.inert = true;
  const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
  const overlay = el('div', 'timeline-overlay tg-overlay');
  overlay.dataset.theme = group;
  Object.entries(theme).forEach(([key,value]) => overlay.style.setProperty(key,value));
  const dialog = el('section', 'tg-dialog'); dialog.setAttribute('role','dialog');
  dialog.style.visibility='hidden';
  dialog.dataset.entryDate = entry.date;
  dialog.setAttribute('aria-modal','true'); dialog.setAttribute('aria-labelledby','tg-title');
  const header = el('header', 'tg-header');
  const title = el('h2', '', entry.title); title.id = 'tg-title';
  const details = el('div','tg-details');
  const date = el('time','tg-date',timelineDate(entry.date, entry.display)); date.dateTime = entry.date;
  header.append(date, title, details);
  const close = button('×','Luk billedvisning', () => cleanup()); close.className = 'tg-close';
  const viewer = el('div','tg-viewer');
  const stage = el('div','tg-stage'); stage.setAttribute('role','group'); stage.setAttribute('aria-roledescription','karrusel');
  stage.dataset.effect=effectName;
  stage.setAttribute('aria-label','Billeder fra '+title.textContent);
  const poster = el('canvas', 'tg-poster'); poster.setAttribute('role','img');
  const effectCanvas = el('canvas', 'tg-effect'); effectCanvas.setAttribute('aria-hidden','true');
  const status = el('p','tg-status','Henter billeder …'); status.setAttribute('role','status');
  const zoomImage = el('img','tg-zoom-image'); zoomImage.alt = ''; zoomImage.setAttribute('aria-hidden','true');
  stage.append(poster,effectCanvas,status,zoomImage);
  const previous = button('', 'Forrige billede', () => navigate(-1)); previous.className='tg-arrow tg-previous';
  const next = button('', 'Næste billede', () => navigate(1)); next.className='tg-arrow tg-next';
  previous.hidden=next.hidden=true;
  const announcement=el('span','tg-sr-only'); announcement.setAttribute('aria-live','polite');
  announcement.setAttribute('aria-atomic','true');
  // Credits and supplementary links stay with the text above the photograph.
  const supplementary=el('div','tg-supplementary'); header.append(supplementary);
  const rotation=button('','Start automatiske billedskift',toggleRotation); rotation.className='tg-rotation'; rotation.hidden=true;

  stage.append(previous,next,announcement,rotation); viewer.append(stage);
  dialog.append(close,header,viewer); overlay.append(dialog); document.body.append(overlay);
  let closed = false, index = 0, items = [], media = {}, descriptions = [], composites = {}, related = {}, drawing = null, request = 0;
  let frame = 0, transition = null, busy = false, startTouch = null, layoutFrame=0, autoplayTimer=0;
  let scene = null, drag = null, paused = options.autoplay===false || !!searchImage, rotationPointerPaused = null;
  let mobileLayoutKey;
  const zoom = attachPinchZoom(stage, (scale,x,y) => {
    zoomImage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    stage.classList.toggle('is-zoomed', scale > 1.01);
  }, () => { cancelScene(); startTouch = null; pauseRotation(); });
  const mobile = matchMedia('(max-width: 760px), (max-width: 1100px) and (max-height: 600px)');
  const portraitMobile = matchMedia('(max-width: 760px) and (orientation: portrait)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cache = new Map();
  const compositeSources = new Map();
  const shouldBackdrop = image => items.length > 1;
  function scheduleAutoplay(delay = 2000) {
    clearTimeout(autoplayTimer);
    if (closed || paused || reduced.matches || items.length < 2) return;
    autoplayTimer = window.setTimeout(() => { autoplayTimer = 0; navigate(1); }, delay);
  }
  function updateRotation() {
    rotation.innerHTML='<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="white" stroke-width="2.5"/>'+(paused||reduced.matches?'<path fill="white" d="M16 11L29 20L16 29Z"/>':'<path fill="white" d="M13 11H18V29H13ZM22 11H27V29H22Z"/>')+'</svg>';
    rotation.dataset.state=paused||reduced.matches?'paused':'playing';
    rotation.setAttribute('aria-label',reduced.matches?'Automatiske billedskift er slået fra ved reduceret bevægelse':paused?'Start automatiske billedskift':'Sæt automatiske billedskift på pause');
    rotation.disabled=reduced.matches;
    announcement.setAttribute('aria-live',paused?'polite':'off');
  }
  function pauseRotation() { paused=true; clearTimeout(autoplayTimer); updateRotation(); }
  function toggleRotation() {
    if (reduced.matches) return;
    paused=rotationPointerPaused===null?!paused:!rotationPointerPaused; rotationPointerPaused=null; clearTimeout(autoplayTimer); updateRotation();
    if (!paused) scheduleAutoplay();
  }
  rotation.addEventListener('pointerdown',()=>{rotationPointerPaused=paused;});
  rotation.addEventListener('pointercancel',()=>{rotationPointerPaused=null;});

  updateRotation();
  function imageAt(i) {
    const src = items[i];
    const load=source => new Promise((resolve,reject) => {
      const image = new Image(); image.decoding = 'async';
      image.onload = () => resolve(image); image.onerror = () => reject(Error('image'));
      image.src = source;
    });
    if (!cache.has(src)) cache.set(src,(composites[src]
      ? Promise.all(composites[src].map(part=>load(absolute(part)))).then(parts=>{
        // Display the existing, vertically sliced archive photo as one slide.
        // No source photo is rewritten and no gap is introduced between parts.
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(...parts.map(part=>part.naturalWidth));
        canvas.height=parts.reduce((height,part)=>height+part.naturalHeight,0);
        const ctx=canvas.getContext('2d'); let top=0;
        for (const part of parts) { ctx.drawImage(part,0,top); top+=part.naturalHeight; }
        const source=canvas.toDataURL(); compositeSources.set(src,source);
        return load(source);
      })
      : load(absolute(src))).catch(error=>{cache.delete(src);throw error;}));
    return cache.get(src);
  }
  function layout() {
    if (closed) return;
    const vh=window.visualViewport?.height || innerHeight, vw=document.documentElement.clientWidth;
    const compact=mobile.matches, portrait=portraitMobile.matches;
    const padding=40;
    if (!items.length) {
      const margin=compact?(portrait?16:20):32;
      const maxH=vh-margin*2;
      dialog.style.width=`${Math.floor(Math.min(vw-margin*2,compact?1200:900))}px`;
      dialog.style.height=''; dialog.style.maxHeight=`${maxH}px`;
      header.style.maxHeight=`${Math.floor(maxH*(dialog.querySelector('.video-frame') ? .5 : .85))}px`;
      header.style.overflow='auto';
      for (const frame of dialog.querySelectorAll('.video-frame')) {
        const available=Math.max(100,maxH-padding-header.getBoundingClientRect().height-60);
        frame.style.width=`min(100%,${Math.floor(available*16/9)}px)`;
        frame.style.marginLeft=frame.style.marginRight='auto';
      }
      placeClose(); return;
    }
    if (compact) {
      // Safari toolbar movement and image loading cannot resize an open popup.
      // Rotation changes the viewport width and receives a fresh calculation.
      const key=`${vw}:${portrait}`;
      if (mobileLayoutKey===key) return;
      mobileLayoutKey=key;
      const margin=portrait ? 16 : 20;
      const maxW=vw-margin*2, maxH=vh-margin*2;
      const {tallest}=mobileGalleryRatios(items,media);
      header.style.maxHeight=`${Math.floor(maxH*.34)}px`;
      header.style.overflow='auto';
      const flowHeight=node=>{
        const style=getComputedStyle(node);
        if (style.position==='absolute' || style.position==='fixed' || style.display==='none') return 0;
        return node.getBoundingClientRect().height+(parseFloat(style.marginTop)||0)+(parseFloat(style.marginBottom)||0);
      };
      const extra=()=>[...dialog.children].filter(node=>node!==header && node!==viewer && node!==close).reduce((sum,node)=>sum+flowHeight(node),0);
      let width=maxW;
      // Use the full landscape width. Shrinking the dialog to the image ratio
      // wraps the header into more lines and needlessly reduces image height.
      dialog.style.width=`${Math.floor(width)}px`;
      const available=Math.max(1,maxH-padding-flowHeight(header)-extra());
      const frameHeight=portrait ? Math.min((Math.floor(width)-padding)/tallest,available) : available;
      stage.style.height=`${frameHeight}px`;
      stage.style.aspectRatio='auto';
      const belowImages=viewer.querySelector('.tg-video-after-images');
      const belowHeight=belowImages ? flowHeight(belowImages) : 0;
      const portraitHeight=padding+flowHeight(header)+extra()+frameHeight;
      dialog.style.height=`${portrait ? (belowImages ? Math.min(maxH,portraitHeight+belowHeight) : portraitHeight) : maxH}px`;
      dialog.style.maxHeight=`${maxH}px`;
      placeClose(); return;
    }
    mobileLayoutKey=null;
    header.style.maxHeight=''; header.style.overflow='';
    dialog.style.height=''; dialog.style.maxHeight=''; stage.style.height=''; stage.style.aspectRatio='';
    const margin=32, maxW=Math.min(vw-margin*2,1200);
    const ratio=galleryRatio(items,media,vw/vh);
    let width=maxW;
    for(let i=0;i<8;i++) {
      dialog.style.width=`${width}px`;
      const available=Math.max(1,vh-margin*2-padding-header.getBoundingClientRect().height-20);
      const nextWidth=Math.min(maxW,Math.max(360,available*ratio+padding));
      if(Math.abs(nextWidth-width)<1) break;
      width=nextWidth;
    }
    dialog.style.width=`${Math.floor(width)}px`;
    dialog.style.setProperty('--tg-ratio',String(ratio));
    placeClose();
  }
  function placeClose() {
    if (closed) return;
    const rect=dialog.getBoundingClientRect();
    close.style.position='fixed';close.style.top=`${rect.top+8}px`;close.style.right=`${innerWidth-rect.right+8}px`;
  }
  function size() {
    const r = stage.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1,2);
    return [Math.max(1,Math.round(r.width*dpr)),Math.max(1,Math.round(r.height*dpr))];
  }
  function paint(composition) {
    poster.width = composition.width; poster.height = composition.height;
    poster.getContext('2d').drawImage(composition,0,0); drawing = composition;
    zoomImage.src = compositeSources.get(items[index]) || absolute(items[index]);
    if (displayRatio) {
      const rect=stage.getBoundingClientRect();
      const [left,top,width,height]=containRect(displayRatio,1,rect.width,rect.height);
      Object.assign(zoomImage.style,{inset:'auto',left:`${left}px`,top:`${top}px`,width:`${width}px`,height:`${height}px`,objectFit:'fill'});
    }
    const description=descriptions[index] || media[items[index]]?.description;
    poster.setAttribute('aria-label',`${typeof description==='string' && description.trim() ? description.trim() : title.textContent} — billede ${index+1} af ${items.length}`);
  }
  function announce() { announcement.textContent = `Billede ${index+1} af ${items.length}`; stage.dataset.index=String(index); }
  function prefetch() {
    const neighbors = [index,(index+1)%items.length,(index+items.length-1)%items.length];
    for (const [src] of cache) if (!neighbors.some(i => items[i] === src)) cache.delete(src);
    neighbors.forEach(i => imageAt(i).catch(() => {}));
  }
  function cancelScene() {
    scene = null;
    const pointer = drag?.id; drag = null;
    if (pointer !== undefined && stage.hasPointerCapture(pointer)) stage.releasePointerCapture(pointer);
  }
  function finishScene(session, commit) {
    if (scene !== session || closed) return;
    if (commit) { index = session.target; paint(session.after); announce(); }
    effectCanvas.classList.remove('is-active');
    scene = null; busy = false; stage.setAttribute('aria-busy','false'); prefetch();
    scheduleAutoplay(commit && session.animated ? 2000 - sceneDuration : 2000);
  }
  function settleScene(session, destination, started = performance.now()) {
    // A partial drag uses only the remaining fraction of the one-second run.
    const from = session.progress, duration = Math.abs(destination-from)*sceneDuration;
    session.ending = { destination, started, from, duration };
    if (!session.ready) return;
    if (!session.animated || duration === 0) { finishScene(session,destination === 1); return; }
    const animate = now => {
      if (closed || scene !== session) return;
      const t = clamp((now-started)/duration,0,1);
      session.progress = from+(destination-from)*sineEase(t);
      // One value drives both the sampling displacement and the dissolve.
      transition.draw(session.progress);
      if (t < 1) frame = requestAnimationFrame(animate);
      else finishScene(session,destination === 1);
    };
    cancelAnimationFrame(frame); animate(performance.now());
  }
  function beginScene(direction) {
    const session = { target:(index+direction+items.length)%items.length, direction, progress:0, ready:false };
    scene = session; busy = true; ++request;
    cancelAnimationFrame(frame); effectCanvas.classList.remove('is-active');
    stage.setAttribute('aria-busy','true');
    Promise.all([imageAt(index),imageAt(session.target)]).then(([currentImage,image]) => {
      if (closed || scene !== session) return;
      const [w,h] = size();
      const before=drawing || composePhoto(currentImage,w,h,shouldBackdrop(currentImage));
      session.after = composePhoto(image,w,h,shouldBackdrop(image));
      if (before && before.width === w && before.height === h && !reduced.matches) {
        transition ||= createTransition(effectCanvas);
        if (transition) {
          transition.prepare(before,session.after,effectName,direction);
          transition.draw(session.progress); effectCanvas.classList.add('is-active'); session.animated = true;
        }
      }
      status.hidden = true; session.ready = true;
      if (session.ending) {
        const { destination, started } = session.ending;
        settleScene(session,destination,started);
      }
    }).catch(() => {
      if (closed || scene !== session) return;
      cancelScene(); busy = false; stage.setAttribute('aria-busy','false');
      status.replaceChildren(document.createTextNode('Billedet kunne ikke indlæses. '),button('Prøv igen','Prøv at hente billedet igen',() => navigate(direction)));
      status.hidden = false;
    });
    return session;
  }
  async function render(direction = 0, previousIndex = null) {
    const ticket = ++request;
    clearTimeout(autoplayTimer);
    cancelScene();
    cancelAnimationFrame(frame); effectCanvas.classList.remove('is-active'); busy = false;
    if (!items.length || closed) return;
    stage.setAttribute('aria-busy','true');
    try {
      const image = await imageAt(index);
      if (closed || ticket !== request) return;
      const [w,h] = size();
      let before = drawing;
      if (direction && previousIndex !== null && before && (before.width !== w || before.height !== h)) {
        const previousImage = await imageAt(previousIndex);
        if (closed || ticket !== request) return;
        before = composePhoto(previousImage,w,h,shouldBackdrop(previousImage));
      }
      const composed = composePhoto(image,w,h,shouldBackdrop(image));
      status.hidden = true; poster.hidden = false;
      paint(composed); announce();
      if (direction && before && before.width === w && before.height === h && !reduced.matches) {
        transition ||= createTransition(effectCanvas);
        if (transition) {
          transition.prepare(before,composed,effectName,direction); transition.draw(0);
          effectCanvas.classList.add('is-active'); busy = true;
          const start = performance.now();
          const animate = now => {
            if (closed || ticket !== request) return;
            const progress = Math.min(1,(now-start)/1100); transition.draw(progress*progress*(3-2*progress));
            if (progress < 1) frame = requestAnimationFrame(animate);
            else { effectCanvas.classList.remove('is-active'); busy = false; scheduleAutoplay(2000 - 1100); }
          };
          frame = requestAnimationFrame(animate);
        }
      }
      // Keep memory bounded to current and adjacent photos.
      prefetch();
      if (group === 'live' && items.length > 1 && !reduced.matches) transition ||= createTransition(effectCanvas);
      if (!busy) scheduleAutoplay();
    } catch {
      if (closed || ticket !== request) return;
      poster.hidden = true; drawing = null; announce();
      status.replaceChildren(document.createTextNode('Billedet kunne ikke indlæses. '),button('Prøv igen','Prøv at hente billedet igen',() => render()));
      status.hidden = false;
    } finally { if (ticket === request) stage.setAttribute('aria-busy','false'); }
  }
  function navigate(direction) {
    if (busy || drag || items.length < 2) return;
    zoom.reset();
    clearTimeout(autoplayTimer);
    if (group === 'live') {
      const started = performance.now();
      settleScene(beginScene(direction),1,started); return;
    }
    const previousIndex = index;
    index = (index+direction+items.length)%items.length;
    render(direction,previousIndex);
  }
  function keydown(event) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); cleanup(); }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); event.stopImmediatePropagation(); navigate(event.key === 'ArrowRight' ? 1 : -1);
    }
    if (event.key === 'Tab') {
      const focusable = [...dialog.querySelectorAll('button,a[href],iframe,summary')].filter(n => !n.disabled && n.tabIndex>=0 && n.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }
  function cleanup() {
    if (closed) return;
    closed = true; ++request; clearTimeout(autoplayTimer); cancelScene(); zoom.reset(); cancelAnimationFrame(frame); cancelAnimationFrame(layoutFrame); observer.disconnect(); headerObserver.disconnect(); dialogObserver.disconnect();
    transition?.destroy(); cache.clear(); reduced.removeEventListener('change',motionPreferenceChanged); window.removeEventListener('keydown',keydown,true);
    mobile.removeEventListener('change',resize); window.removeEventListener('resize',resize); window.visualViewport?.removeEventListener('resize',resize); overlay.remove();
    if (root) root.inert = oldInert;
    document.body.style.overflow = oldOverflow;
    opener?.focus({preventScroll:true}); closeActive = null;
  }
  function resize() { cancelAnimationFrame(layoutFrame); layoutFrame=requestAnimationFrame(() => { layout(); render(); }); }
  closeActive = cleanup;
  function motionPreferenceChanged() { pauseRotation(); }
  reduced.addEventListener('change',motionPreferenceChanged);
  window.addEventListener('keydown',keydown,true); mobile.addEventListener('change',resize); window.addEventListener('resize',resize); window.visualViewport?.addEventListener('resize',resize);
  overlay.addEventListener('click',event => { if (event.target === overlay) cleanup(); });
  stage.addEventListener('pointerdown',event => {
    if (group !== 'live' || busy || items.length < 2 || !drawing || zoom.isZoomed() || zoom.isPinching() || !event.isPrimary || event.button !== 0 || event.target.closest('button')) return;
    drag = { id:event.pointerId, x:event.clientX, y:event.clientY, width:stage.clientWidth, horizontal:false };
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove',event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx=event.clientX-drag.x, dy=event.clientY-drag.y;
    if (!drag.horizontal) {
      if (Math.abs(dy)>8 && Math.abs(dy)>Math.abs(dx)) { cancelScene(); return; }
      if (Math.abs(dx)<6 || Math.abs(dx)<Math.abs(dy)*1.3) return;
      drag.horizontal = true;
    }
    const direction=dx<0 ? 1 : -1;
    if (!scene || (dx !== 0 && scene.direction !== direction)) beginScene(direction);
    // Deliberately no easing while held: the cursor/finger sets the shader value.
    scene.progress=clamp(Math.abs(dx)/drag.width,0,1);
    if (scene.ready && scene.animated) transition.draw(scene.progress);
  });
  function releaseDrag(event, cancelled = false) {
    if (!drag || drag.id !== event.pointerId) return;
    const pointer=drag.id; drag=null;
    if (stage.hasPointerCapture(pointer)) stage.releasePointerCapture(pointer);
    if (scene) settleScene(scene,cancelled || scene.progress === 0 ? 0 : 1);
  }
  stage.addEventListener('pointerup',event => releaseDrag(event));
  stage.addEventListener('pointercancel',event => releaseDrag(event,true));
  stage.addEventListener('lostpointercapture',event => releaseDrag(event,true));
  stage.addEventListener('touchstart',event => { if (group !== 'live') startTouch = event.touches.length === 1 ? [event.touches[0].clientX,event.touches[0].clientY] : null; },{passive:true});
  stage.addEventListener('touchend',event => {
    if (!startTouch || zoom.isZoomed() || zoom.isPinching()) return;
    const dx=event.changedTouches[0].clientX-startTouch[0],dy=event.changedTouches[0].clientY-startTouch[1];
    if (Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.3) navigate(dx<0?1:-1);
    startTouch=null;
  },{passive:true});
  stage.addEventListener('touchcancel',() => { startTouch=null; });
  effectCanvas.addEventListener('webglcontextlost',event => {
    event.preventDefault(); cancelAnimationFrame(frame); cancelScene(); effectCanvas.classList.remove('is-active'); busy=false; transition=null; stage.setAttribute('aria-busy','false'); scheduleAutoplay();
  });
  const observer = new ResizeObserver(() => {
    if (scene || busy || stage.getAttribute('aria-busy') === 'true') return;
    const [w,h] = size();
    if (!drawing || drawing.width !== w || drawing.height !== h) render();
  }); observer.observe(stage);
  const headerObserver = new ResizeObserver(() => {
    // Presse articles/mastheads can change header height after loading. Keep
    // their image inside the popup so its close button remains in view.
    mobileLayoutKey=null;
    resize();
  }); headerObserver.observe(header);
  const dialogObserver=new ResizeObserver(placeClose);dialogObserver.observe(dialog);
  function link(label, href) {
    const url = new URL(href,assetBase);
    if (!['http:','https:',...(group==='press'?['mailto:']:[])].includes(url.protocol)) return;
    const localSource=url.origin===assetBase.origin || /^(www\.)?dennisagerblad\.dk$/.test(url.hostname);
    const target=localSource ? timelineEntries.find(item=>item.href && new URL(item.href,assetBase).pathname===url.pathname) || related[decodeURIComponent(url.pathname)] : undefined;
    if (target?.popupContent===false) return;
    if (target) { const node=button(label,label,()=>openTimelineGallery(target,timelinePopupGroup(target)));node.className='tg-content-link';supplementary.append(node);return; }
    const node=el('a','',label); node.href=url.href; node.target='_blank'; node.rel='noreferrer'; supplementary.append(node);
  }
  function populate(data) {
    if (closed) return;
    related=data.related || {};
    const gallery = data.entries?.[entry.contentKey || `${entry.date}|${entry.category}|${entry.title}`];
    media = displayRatio ? Object.fromEntries(Object.entries(data.media || {}).map(([src,record])=>[src,{...record,width:displayRatio*1000,height:1000}])) : data.media || {}; descriptions=Array.isArray(gallery?.imageDescriptions)?gallery.imageDescriptions:[];
    composites=gallery?.composites || {};
    title.textContent = entry.title;
    const linkLabels=new Set((gallery?.links || []).flatMap(item=>[item.href,item.label]).filter(text=>/^(https?:|www\.)/.test(text)));
    const sourceParagraphs=[...(entry.details?[entry.details]:[]),...(gallery?.details || [])].filter(text=>!linkLabels.has(text.trim()));
    const paragraphs = timelinePopupParagraphs(entry,sourceParagraphs);
    const paragraph = text => {
      const node=el('p','',text);
      const index=gallery?.archiveDetails?.indexOf(text) ?? -1;
      const markup=gallery?.detailMarkup?.[index];
      if (markup && (markup.match(/<[^>]+>/g) || []).every(tag=>/^<\/?(?:strong|em)>$/.test(tag))) node.innerHTML=markup;
      return node;
    };
    const longCopy = entry.date !== '2012-10-12' && paragraphs.join(' ').length > 700 && paragraphs.length > 1;
    if (longCopy) {
      details.append(paragraph(paragraphs[0]));
      const more = el('details','tg-more'); more.append(el('summary','',group==='press'?(window.DennisLanguage?.current==='en'?'Read the full text':'Læs hele teksten'):'Læs mere om arrangementet'));
      paragraphs.slice(1).forEach(text => more.append(paragraph(text)));
      details.append(more);
    } else paragraphs.forEach(text => details.append(paragraph(text)));
    items = gallery?.images || entry.images || (entry.thumbnail && !entry.videoId ? [entry.thumbnail] : []);
    ({ images: items, descriptions } = thumbnailFirst(items, descriptions, entry.thumbnail));
    if (searchImage) {
      const identity=src=>{const url=new URL(absolute(src));url.search='';url.hash='';return url.href;};
      index=Math.max(0,items.findIndex(src=>identity(src)===identity(searchImage)));
    }
    if (entry.creditName) {
      const p=el('p','tg-credit',`${entry.creditPrefix || 'Foto:'} `);
      if (entry.creditHref) {
        const a=el('a','',entry.creditName); a.href=entry.creditHref; a.target='_blank'; a.rel='noreferrer'; p.append(a);
      } else p.append(document.createTextNode(entry.creditName));
      supplementary.append(p);
    }
    for (const videoId of [...new Set([entry.videoId,...(gallery?.videos || [])].filter(Boolean))]) {
      const video=el('iframe','tg-video'); video.src=videoEmbedURL(videoId);
      video.title=entry.videoTitle || entry.title; video.referrerPolicy='strict-origin-when-cross-origin'; video.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'; video.allowFullscreen=true;
      const videoFrame=el('div','video-frame');videoFrame.append(video);
      const youtube=el('a','tg-video-link','Se videoen på YouTube');
      youtube.href=`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
      youtube.target='_blank'; youtube.rel='noreferrer';
      if (entry.videoAfterImages) {
        const belowImages=el('div','tg-video-after-images');
        belowImages.append(videoFrame,youtube); viewer.append(belowImages);
      } else {
        dialog.insertBefore(videoFrame,viewer); dialog.insertBefore(youtube,viewer);
      }
    }
    if (entry.popupHref) link(entry.popupLabel || 'Se linket ↗',entry.popupHref);
    const seen=new Set(entry.popupHref?[new URL(entry.popupHref,assetBase).href]:[]);
    for (const item of [...(gallery?.links || []),...Object.values(entry.imageLinks || {})]) {
      const href=new URL(item.href,assetBase).href;
      if (!seen.has(href) && !entry.albumKey) { link(item.label || 'Se linket ↗',href); seen.add(href); }
    }
    if (entry.albumKey) {
      const footer=el('footer','tg-album-footer');
      const usedLinks=new Set();
      for (const part of gallery?.albumFooter || []) {
        if (/^(?:sum\s*[-–]\s*)?nakin\?/i.test(part.text) || /^(sum|nakin\?|land|STEV)\s*[-–]/.test(part.text)) continue;
        const p=el('p'); let rest=part.text;
        for (const item of gallery?.links || []) {
          if (/\/archive\/legacy\//.test(item.href) || !item.label || !rest.includes(item.label)) continue;
          const at=rest.indexOf(item.label);p.append(document.createTextNode(rest.slice(0,at)));
          const a=el('a','',item.label);a.href=item.href;a.target='_blank';a.rel='noreferrer';p.append(a);
          rest=rest.slice(at+item.label.length);usedLinks.add(item.href);
        }
        p.append(document.createTextNode(rest));footer.append(p);
      }
      for (const item of gallery?.links || []) {
        if (/\/archive\/legacy\//.test(item.href) || usedLinks.has(item.href)) continue;
        const p=el('p'),a=el('a','',item.label);a.href=item.href;a.target='_blank';a.rel='noreferrer';p.append(a);footer.append(p);
      }
      const nav=el('nav','tg-album-nav');nav.setAttribute('aria-label','maður:glotti-albums');
      timelineEntries.filter(album=>album.albumKey).sort((a,b)=>a.date.localeCompare(b.date)).forEach(album=>{
        const node=button(album.albumKey,album.albumKey,()=>openTimelineGallery(album,'music',theme));
        if(album.albumKey===entry.albumKey)node.setAttribute('aria-current','page');
        nav.append(node);
      });
      footer.append(nav);viewer.append(footer);
    }
    if (items.length) {
      previous.hidden=next.hidden=items.length<2; rotation.hidden=items.length<2; updateRotation();
      layout(); render();
    } else { stage.hidden=true; layout(); }
    dialog.style.visibility=''; close.focus({preventScroll:true});
  }
  loadData().then(populate).catch(() => populate({}));
}
