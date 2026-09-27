// Keep the text centered in the illustrated white field, even when its length
// or line wrapping changes. The tail and transparent edges are not part of it.
const selector = '.section-5 .archive .calendar-biography p';
const portrait = matchMedia('(max-width: 760px) and (orientation: portrait)');
let pending = 0;

function centerSpeech() {
  pending = 0;
  for (const paragraph of document.querySelectorAll(selector)) {
    if (getComputedStyle(paragraph).display === 'none') continue;

    // Reset only the vertical dimensions. Horizontal insets stay proportional
    // to the graphic and therefore determine the actual line breaks.
    paragraph.style.height = 'auto';
    paragraph.style.paddingTop = '0px';
    paragraph.style.paddingBottom = '0px';
    const { width, height: copyHeight } = paragraph.getBoundingClientRect();
    if (!width || !copyHeight) continue;

    // Fractions are measured on the supplied wide and portrait illustrations.
    // The slightly generous right edge lets an occasional tall letter approach
    // the rounded corner without imposing excessive whitespace on every text.
    const fieldTop = portrait.matches ? .25 : .20;
    const fieldBottom = portrait.matches ? .86 : .82;
    const margin = portrait.matches ? 12 : 9;
    const minimum = width * (portrait.matches ? .35 : .20);
    const bubbleHeight = Math.ceil(Math.max(minimum, (copyHeight + margin * 2) / (fieldBottom - fieldTop)));
    const top = Math.max(0, (fieldTop + fieldBottom) * bubbleHeight / 2 - copyHeight / 2);

    paragraph.style.height = `${bubbleHeight}px`;
    paragraph.style.paddingTop = `${top}px`;
    paragraph.style.paddingBottom = `${Math.max(0, bubbleHeight - copyHeight - top)}px`;
  }
}

function scheduleSpeech() {
  if (!pending) pending = requestAnimationFrame(centerSpeech);
}

const root = document.getElementById('root');
if (root) {
  new MutationObserver(scheduleSpeech).observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}
addEventListener('resize', scheduleSpeech);
window.visualViewport?.addEventListener('resize', scheduleSpeech);
document.fonts?.ready.then(scheduleSpeech);
scheduleSpeech();
