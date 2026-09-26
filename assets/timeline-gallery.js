/* Named timeline effects: Grow, Paint and Morph.
   Paint adapted from paniq's MIT-licensed GL Transitions shader.
   See timeline-gallery-LICENSE.txt. No UI Initiative code is included. */
import { timelineDate } from './timeline-ui.js?v=20260926-v16';
let dataPromise;
let closeActive;
const assetBase = new URL('../', import.meta.url);
const absolute = src => new URL(src, assetBase).href;
const loadData = () => dataPromise ||= fetch(new URL('./timeline-gallery-data.json?v=dansk-20260926-v22', import.meta.url)).then(r => {
  if (!r.ok) throw new Error('Gallery data unavailable');
  return r.json();
}).catch(error => { dataPromise = null; throw error; });
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
});
export const timelineEffects = Object.freeze({ live:'Morph', art:'Paint' });

// Fill the series frame proportionally, anchored at the top. Shift the crop
// only as far as needed to retain detected faces; never stretch the photo.
// Overrides can supply `faces` or `focus: [x, y]` in the media manifest.
export function cropRect(iw, ih, w, h, meta, fill) {
  if (!fill) return null;
  const scale = Math.max(w / iw, h / ih), cw = w / scale, ch = h / scale;
  const faces = meta.faces || [];
  let x = (meta.focus?.[0] ?? .5) * iw - cw / 2;
  let y = meta.focus ? meta.focus[1] * ih - ch / 2 : 0;
  if (faces.length) {
    const left = Math.max(0, Math.min(...faces.map(f => f[0])) - .035) * iw;
    const right = Math.min(1, Math.max(...faces.map(f => f[0] + f[2])) + .035) * iw;
    const top = Math.max(0, Math.min(...faces.map(f => f[1])) - .05) * ih;
    const bottom = Math.min(1, Math.max(...faces.map(f => f[1] + f[3])) + .035) * ih;
    if (right-left <= cw) x=clamp(x,right-cw,left);
    else {
      // A narrow crop cannot include widely separated faces. Keep the
      // largest face instead of centering on empty space between people.
      const main=faces.reduce((a,b)=>a[2]*a[3]>=b[2]*b[3]?a:b);
      x=(main[0]+main[2]/2)*iw-cw/2;
    }
    // If all faces cannot fit vertically, favor the uppermost faces.
    y = bottom-top <= ch ? clamp(y,bottom-ch,top) : top;
  }
  return [clamp(x, 0, iw - cw), clamp(y, 0, ih - ch), cw, ch];
}

// Majority orientation determines the frame on every device. A tie follows
// the viewport; square photos are neutral. Resolution does not affect voting.
export function galleryRatio(items, media, viewportRatio = 4/3) {
  const ratios = items.map(src => media[src]).filter(m => m?.width > 0 && m?.height > 0).map(m => m.width / m.height);
  if (!ratios.length) return 4/3;
  const portrait=ratios.filter(r=>r<1), landscape=ratios.filter(r=>r>1);
  const usePortrait=portrait.length>landscape.length || (portrait.length===landscape.length && viewportRatio<1);
  const majority=usePortrait ? portrait : landscape;
  return majority.length ? Math.exp(majority.reduce((sum,r)=>sum+Math.log(r),0)/majority.length) : 1;
}

function compose(image, w, h, meta, fill) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const pixelRatio = Math.min(devicePixelRatio || 1, 2);
  const frameWidth = w / pixelRatio, frameHeight = h / pixelRatio;
  const canFillWithoutEnlarging = image.naturalWidth >= frameWidth && image.naturalHeight >= frameHeight;
  const crop = canFillWithoutEnlarging && !meta.preserveFull ? cropRect(image.naturalWidth,image.naturalHeight,w,h,meta,fill) : null;
  if (crop) { ctx.drawImage(image,...crop,0,0,w,h); return canvas; }
  // A low-resolution enlarged copy gives a soft backdrop even on browsers
  // without canvas filters. The sharp foreground remains undistorted at rest.
  const backdrop = document.createElement('canvas'); backdrop.width = 48; backdrop.height = Math.max(16, Math.round(48*h/w));
  const bg = backdrop.getContext('2d');
  const scale = Math.max(backdrop.width/image.naturalWidth,backdrop.height/image.naturalHeight)*1.18;
  bg.drawImage(image,(backdrop.width-image.naturalWidth*scale)/2,(backdrop.height-image.naturalHeight*scale)/2,image.naturalWidth*scale,image.naturalHeight*scale);
  ctx.save(); ctx.filter = `blur(${Math.max(12,w*.025)}px) brightness(.64)`;
  const bleed = Math.ceil(w*.08);
  ctx.drawImage(backdrop,-bleed,-bleed,w+bleed*2,h+bleed*2); ctx.restore();
  // Display archival scans at no more than their natural CSS pixel size.
  // This leaves their original detail intact while the same image fills the
  // unused field as a soft, enlarged backdrop.
  const fit = Math.min(frameWidth/image.naturalWidth,frameHeight/image.naturalHeight,1);
  const iw=image.naturalWidth*fit*pixelRatio, ih=image.naturalHeight*fit*pixelRatio;
  ctx.drawImage(image,(w-iw)/2,(h-ih)/2,iw,ih);
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
        } else {
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

export function openTimelineGallery(entry, group, theme = {}) {
  closeActive?.();
  const effectName=timelineEffects[group] || 'Grow';
  const opener = document.activeElement;
  const root = document.getElementById('root');
  const oldInert = root?.inert;
  if (root) root.inert = true;
  const oldOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
  const overlay = el('div', 'timeline-overlay tg-overlay');
  overlay.dataset.theme = group;
  Object.entries(theme).forEach(([key,value]) => overlay.style.setProperty(key,value));
  const dialog = el('section', 'tg-dialog'); dialog.setAttribute('role','dialog');
  dialog.setAttribute('aria-modal','true'); dialog.setAttribute('aria-labelledby','tg-title');
  const header = el('header', 'tg-header');
  const title = el('h2', '', entry.title); title.id = 'tg-title';
  const details = el('div','tg-details');
  const date = el('time','tg-date',timelineDate(entry.date, entry.display)); date.dateTime = entry.date;
  header.append(date, title, details);
  const close = button('×','Luk billedvisning', () => cleanup()); close.className = 'tg-close';
  const viewer = el('div','tg-viewer');
  const stage = el('div','tg-stage'); stage.setAttribute('aria-roledescription','karrusel');
  stage.dataset.effect=effectName;
  stage.setAttribute('aria-label','Billeder fra '+title.textContent);
  const poster = el('canvas', 'tg-poster'); poster.setAttribute('role','img');
  const effectCanvas = el('canvas', 'tg-effect'); effectCanvas.setAttribute('aria-hidden','true');
  const status = el('p','tg-status','Henter billeder …'); status.setAttribute('role','status');
  stage.append(poster,effectCanvas,status);
  const previous = button('', 'Forrige billede', () => navigate(-1)); previous.className='tg-arrow tg-previous';
  const next = button('', 'Næste billede', () => navigate(1)); next.className='tg-arrow tg-next';
  previous.hidden=next.hidden=true;
  const announcement=el('span','tg-sr-only'); announcement.setAttribute('aria-live','polite');
  announcement.setAttribute('aria-atomic','true');
  // Credits and supplementary links belong with the text, so the photograph
  // meets both sides and the bottom of the popup without a footer strip.
  const supplementary=el('div','tg-supplementary'); header.append(supplementary);
  stage.append(previous,next,announcement); viewer.append(stage);
  dialog.append(close,header,viewer); overlay.append(dialog); document.body.append(overlay);
  close.focus({preventScroll:true});
  let closed = false, index = 0, items = [], media = {}, drawing = null, request = 0;
  let frame = 0, transition = null, busy = false, startTouch = null, layoutFrame=0;
  let scene = null, drag = null;
  const mobile = matchMedia('(max-width: 760px), (max-width: 1100px) and (max-height: 600px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cache = new Map();
  function imageAt(i) {
    const src = items[i];
    if (!cache.has(src)) cache.set(src,new Promise((resolve,reject) => {
      const image = new Image(); image.decoding = 'async';
      image.onload = () => resolve(image); image.onerror = () => { cache.delete(src); reject(Error('image')); };
      image.src = absolute(src);
    }));
    return cache.get(src);
  }
  function layout() {
    if (closed) return;
    const vh=window.visualViewport?.height || innerHeight, vw=document.documentElement.clientWidth;
    const compact=mobile.matches;
    const margin=compact ? 0 : 32;
    const maxW=vw-margin*2;
    const ratio=galleryRatio(items,media,vw/vh);
    const readableWidth=Math.min(maxW,360);
    let width=maxW;
    for(let i=0;i<8;i++) {
      dialog.style.width=`${width}px`;
      const available=Math.max(1,vh-margin*2-header.offsetHeight);
      // A short viewport or a long heading must not squeeze the entire popup
      // below the original width of a 360px archive scan.
      const frameRatio=Math.max(ratio,readableWidth/available);
      dialog.style.setProperty('--tg-ratio',String(frameRatio));
      const nextWidth=Math.max(1,Math.min(maxW,available*frameRatio));
      if(Math.abs(nextWidth-width)<1) break;
      width=nextWidth;
    }
    dialog.style.width=`${Math.floor(width)}px`;
  }
  function size() {
    const r = stage.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1,2);
    return [Math.max(1,Math.round(r.width*dpr)),Math.max(1,Math.round(r.height*dpr))];
  }
  function paint(composition) {
    poster.width = composition.width; poster.height = composition.height;
    poster.getContext('2d').drawImage(composition,0,0); drawing = composition;
    poster.setAttribute('aria-label',`${title.textContent} — billede ${index+1} af ${items.length}`);
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
    imageAt(session.target).then(image => {
      if (closed || scene !== session) return;
      const [w,h] = size(), meta = media[items[session.target]] || {};
      session.after = compose(image,w,h,meta,true);
      if (drawing && drawing.width === w && drawing.height === h && !reduced.matches) {
        transition ||= createTransition(effectCanvas);
        if (transition) {
          transition.prepare(drawing,session.after,effectName,direction);
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
  async function render(direction = 0) {
    const ticket = ++request;
    cancelScene();
    cancelAnimationFrame(frame); effectCanvas.classList.remove('is-active'); busy = false;
    if (!items.length || closed) return;
    stage.setAttribute('aria-busy','true');
    try {
      const image = await imageAt(index);
      if (closed || ticket !== request) return;
      const [w,h] = size(), meta = media[items[index]] || {};
      const composed = compose(image,w,h,meta,true);
      status.hidden = true; poster.hidden = false;
      const before = drawing; paint(composed); announce();
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
            else { effectCanvas.classList.remove('is-active'); busy = false; }
          };
          frame = requestAnimationFrame(animate);
        }
      }
      // Keep memory bounded to current and adjacent photos.
      prefetch();
      if (group === 'live' && items.length > 1 && !reduced.matches) transition ||= createTransition(effectCanvas);
    } catch {
      if (closed || ticket !== request) return;
      poster.hidden = true; drawing = null; announce();
      status.replaceChildren(document.createTextNode('Billedet kunne ikke indlæses. '),button('Prøv igen','Prøv at hente billedet igen',() => render()));
      status.hidden = false;
    } finally { if (ticket === request) stage.setAttribute('aria-busy','false'); }
  }
  function navigate(direction) {
    if (busy || drag || items.length < 2) return;
    if (group === 'live') {
      const started = performance.now();
      settleScene(beginScene(direction),1,started); return;
    }
    index = (index+direction+items.length)%items.length;
    render(direction);
  }
  function keydown(event) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); cleanup(); }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault(); event.stopImmediatePropagation(); navigate(event.key === 'ArrowRight' ? 1 : -1);
    }
    if (event.key === 'Tab') {
      const focusable = [...dialog.querySelectorAll('button,a[href],iframe,summary')].filter(n => !n.disabled && n.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }
  function cleanup() {
    if (closed) return;
    closed = true; ++request; cancelScene(); cancelAnimationFrame(frame); cancelAnimationFrame(layoutFrame); observer.disconnect(); headerObserver.disconnect();
    transition?.destroy(); cache.clear(); window.removeEventListener('keydown',keydown,true);
    mobile.removeEventListener('change',resize); window.removeEventListener('resize',resize); window.visualViewport?.removeEventListener('resize',resize); overlay.remove();
    if (root) root.inert = oldInert;
    document.body.style.overflow = oldOverflow;
    opener?.focus({preventScroll:true}); closeActive = null;
  }
  function resize() { cancelAnimationFrame(layoutFrame); layoutFrame=requestAnimationFrame(() => { layout(); render(); }); }
  closeActive = cleanup;
  window.addEventListener('keydown',keydown,true); mobile.addEventListener('change',resize); window.addEventListener('resize',resize); window.visualViewport?.addEventListener('resize',resize);
  overlay.addEventListener('click',event => { if (event.target === overlay) cleanup(); });
  stage.addEventListener('pointerdown',event => {
    if (group !== 'live' || busy || items.length < 2 || !drawing || !event.isPrimary || event.button !== 0 || event.target.closest('button')) return;
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
    if (!startTouch) return;
    const dx=event.changedTouches[0].clientX-startTouch[0],dy=event.changedTouches[0].clientY-startTouch[1];
    if (Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.3) navigate(dx<0?1:-1);
    startTouch=null;
  },{passive:true});
  stage.addEventListener('touchcancel',() => { startTouch=null; });
  effectCanvas.addEventListener('webglcontextlost',event => {
    event.preventDefault(); cancelAnimationFrame(frame); cancelScene(); effectCanvas.classList.remove('is-active'); busy=false; transition=null; stage.setAttribute('aria-busy','false');
  });
  const observer = new ResizeObserver(() => render()); observer.observe(stage);
  const headerObserver = new ResizeObserver(resize); headerObserver.observe(header);
  function link(label, href) {
    const url = new URL(href,assetBase);
    if (!['http:','https:'].includes(url.protocol)) return;
    const node=el('a','',label); node.href=url.href; node.target='_blank'; node.rel='noreferrer'; supplementary.append(node);
  }
  function populate(data) {
    if (closed) return;
    const gallery = data.entries?.[`${entry.date}|${entry.category}|${entry.title}`];
    media = data.media || {};
    title.textContent = entry.title;
    const paragraphs = gallery?.details || (entry.details ? [entry.details] : []);
    const longCopy = paragraphs.join(' ').length > 700 && paragraphs.length > 1;
    if (longCopy) {
      details.append(el('p','',paragraphs[0]));
      const more = el('details','tg-more'); more.append(el('summary','','Læs mere om arrangementet'));
      paragraphs.slice(1).forEach(text => more.append(el('p','',text)));
      details.append(more);
    } else paragraphs.forEach(text => details.append(el('p','',text)));
    items = gallery?.images || entry.images || (entry.thumbnail ? [entry.thumbnail] : []);
    if (entry.creditName) {
      const p=el('p','tg-credit',`${entry.creditPrefix || 'Foto:'} `);
      if (entry.creditHref) {
        const a=el('a','',entry.creditName); a.href=entry.creditHref; a.target='_blank'; a.rel='noreferrer'; p.append(a);
      } else p.append(document.createTextNode(entry.creditName));
      supplementary.append(p);
    }
    if (entry.videoId) {
      const video=el('iframe','tg-video'); video.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(entry.videoId)}`;
      video.title=entry.title; video.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'; video.allowFullscreen=true;
      const more=el('details','tg-more'); more.append(el('summary','','Se videoen'),video); supplementary.append(more);
    }
    if (entry.popupHref) link(entry.popupLabel || 'Se linket ↗',entry.popupHref);
    if (items.length) {
      previous.hidden=next.hidden=items.length<2;
      layout(); render();
    } else { stage.hidden=true; layout(); }
  }
  loadData().then(populate).catch(() => populate({}));
}
