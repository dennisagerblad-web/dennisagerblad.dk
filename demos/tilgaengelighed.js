const frame = document.getElementById('preview');
const status = document.getElementById('status');
const focusLabel = document.getElementById('focus');
let enlarged = false, observer, pending = 0, originals = new Map(), generation = 0, activeMode = null;
const doc = () => frame.contentDocument;
function label(node) {
  return node?.getAttribute('aria-label') || node?.ownerDocument.getElementById(node?.getAttribute('aria-labelledby'))?.textContent || node?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 100) || node?.tagName || 'ingen';
}
function refreshText() {
  cancelAnimationFrame(pending);
  pending = requestAnimationFrame(() => {
    for (const [node, original] of originals) {
      if (!node.isConnected) { originals.delete(node); continue; }
      for (const property of ['font-size', 'line-height']) {
        const saved = original[property];
        if (saved.value) node.style.setProperty(property, saved.value, saved.priority);
        else node.style.removeProperty(property);
      }
    }
    if (!enlarged) { originals.clear(); frame.contentWindow.dispatchEvent(new Event('resize')); return; }
    const sizes = [];
    for (const node of doc().body.querySelectorAll('*')) {
      if (['SCRIPT','STYLE','SVG','PATH','NOSCRIPT'].includes(node.tagName) || node.closest('[aria-hidden="true"]')) continue;
      if (![...node.childNodes].some(child => child.nodeType === 3 && child.textContent.trim())) continue;
      if (!originals.has(node)) originals.set(node, Object.fromEntries(['font-size','line-height'].map(property => [property, {value:node.style.getPropertyValue(property), priority:node.style.getPropertyPriority(property)}])));
      const computed = frame.contentWindow.getComputedStyle(node);
      sizes.push([node, parseFloat(computed.fontSize), parseFloat(computed.lineHeight)]);
    }
    // Read every original size before applying any overrides, so nested text is not doubled twice.
    for (const [node, size, line] of sizes) {
      node.style.setProperty('font-size', `${size * 2}px`, 'important');
      if (Number.isFinite(line)) node.style.setProperty('line-height', `${line * 2}px`, 'important');
    }
    frame.contentWindow.dispatchEvent(new Event('resize'));
  });
}
frame.addEventListener('load', () => {
  if (!doc()?.body) return;
  observer?.disconnect(); originals.clear();
  doc().addEventListener('focusin', event => {
    focusLabel.textContent = `Fokus: ${label(event.target)}`;
    if(event.target.matches('.life-year'))status.textContent='Årets indlæg kan læses med skærmlæser. Tab går til årets links eller returansigtet. Escape går til kategorierne.';
    if(event.target.closest('.timeline-controls,.art-version-chooser')) requestAnimationFrame(()=>window.scrollTo(0,0));
  });
  doc().addEventListener('keydown', event => {
    const menu = activeMode === 'focus'
      ? [...doc().querySelectorAll('.face-menu button:not([disabled])')].filter(button => button.getClientRects().length && !button.closest('[inert]'))
      : [];
    const position = menu.indexOf(doc().activeElement);
    if (position !== -1 && event.key === 'Tab') {
      event.preventDefault();
      menu[(position + (event.shiftKey ? -1 : 1) + menu.length) % menu.length].focus({preventScroll:true});
      return;
    }
    if (position !== -1 && event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation(); activeMode = null;
      document.getElementById('try-focus').focus({preventScroll:true});
      status.textContent = 'Du er ude af fokusprøven. Vælg en ny prøve med knapperne ovenfor.';
      focusLabel.textContent = 'Fokus: prøveknappen »1. Fokus«';
      return;
    }
    if (event.key === 'Escape') setTimeout(() => {
      status.textContent = doc().activeElement.closest('.timeline-groups')
        ? 'Du er ved kategorierne. Brug Tab og Enter til at vælge en anden kategori.'
        : 'Escape lukker det åbne vindue. Fokus er tilbage på det, du åbnede.';
      focusLabel.textContent = `Fokus: ${label(doc().activeElement)}`;
    }, 100);
  }, true);
  observer = new MutationObserver(() => { if (enlarged) refreshText(); });
  observer.observe(doc().body, {childList:true, subtree:true});
  refreshText();
});
async function waitFor(find, run) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (run !== generation) throw new Error('Ny prøve valgt');
    const result = find(); if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 60));
  }
  throw new Error('Visningen blev ikke klar. Prøv knappen igen.');
}
async function prepare(mode) {
  const run = ++generation;
  activeMode = mode;
  const chosen = {focus:'try-focus', keys:'try-keys', pause:'try-pause', text:'try-text'}[mode];
  for (const id of ['try-focus','try-keys','try-pause','try-text']) document.getElementById(id).setAttribute('aria-pressed', String(id === chosen));
  document.getElementById('text-controls').hidden = mode !== 'text';
  window.scrollTo({top:0, behavior:'instant'});
  status.textContent = 'Gør prøven klar…';
  try {
    await new Promise(resolve => {
      frame.addEventListener('load', resolve, {once:true});
      frame.src = `/?demo=${run}-${Date.now()}`;
    });
    await waitFor(() => doc()?.querySelector('.face-menu .menu-5'), run);
    if (mode === 'focus') {
      const first = doc().querySelector('.face-menu button, .face-menu a');
      first.focus({preventScroll:true}); window.scrollTo(0, 0);
      // The user presses Tab to engage the site's actual keyboard focus styling.
      status.textContent = 'Tab følger menuens placering. Enter åbner det valgte punkt. På tidslinjen går Escape til kategorierne.';
      return;
    }
    doc().querySelector('.face-menu .menu-5').click();
    await waitFor(() => doc().querySelector('.timeline-groups button'), run);
    if (mode === 'text') {
      status.textContent = 'Klik på »200 % tekst« herunder. Se teksten blive større i telefonrammen. »100 %« gør den normal igen.';
      return;
    }
    const scene = [...doc().querySelectorAll('.timeline-groups button')].find(button => button.textContent.trim() === 'Scene');
    scene.click();
    const entry = await waitFor(() => [...doc().querySelectorAll('button.timeline-entry')].find(button => button.textContent.includes('Kaleido-show')), run);
    entry.focus({preventScroll:true}); entry.click();
    await waitFor(() => doc().querySelector('.tg-rotation:not([hidden])'), run);
    doc().querySelector('.tg-close')?.focus({preventScroll:true}); window.scrollTo(0, 0);
    status.textContent = mode === 'keys'
      ? 'Tryk Tab for at flytte mellem galleriets knapper. Tryk Escape for at lukke. Fokus går tilbage til indlægget.'
      : 'Klik på de to hvide streger nederst til højre i billedet for at pause. Knappen bliver til en trekant, som starter billedskift igen.';
  } catch (error) { if (run === generation) status.textContent = error.message; }
}
document.getElementById('try-focus').onclick = () => prepare('focus');
document.getElementById('try-keys').onclick = () => prepare('keys');
document.getElementById('try-pause').onclick = () => prepare('pause');
document.getElementById('try-text').onclick = () => prepare('text');
function textSize(large) {
  enlarged = large;
  document.getElementById('normal').setAttribute('aria-pressed', String(!large));
  document.getElementById('large').setAttribute('aria-pressed', String(large));
  refreshText();
  status.textContent = large ? 'Teksten vises ved 200 %. Prøv at skifte tab og vælge årstal.' : 'Teksten vises igen ved 100 %.';
}
document.getElementById('normal').onclick = () => textSize(false);
document.getElementById('large').onclick = () => textSize(true);
document.querySelectorAll('button').forEach(button => { button.disabled = false; });
