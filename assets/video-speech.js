// Fit the Video introduction to the illustrated white field as text and width change.
// The mobile image has a tip above the field; the wide image has one below it.
const selector = '.ship.section-1 .archive .scrolling-intro';
const portrait = matchMedia('(max-width: 760px) and (orientation: portrait)');
let scheduled = 0;

function fitVideoSpeech() {
  scheduled = 0;
  const paragraph = document.querySelector(selector);
  if (!paragraph) return;

  paragraph.style.height = 'auto';
  paragraph.style.padding = '0';
  const width = paragraph.getBoundingClientRect().width;
  if (!width) return;

  const mobile = portrait.matches;
  paragraph.style.paddingLeft = `${Math.round(width * (mobile ? .12 : .075))}px`;
  paragraph.style.paddingRight = `${Math.round(width * (mobile ? .11 : .085))}px`;
  const copyHeight = paragraph.getBoundingClientRect().height;
  const fieldTop = mobile ? .30 : .13;
  const fieldBottom = mobile ? .84 : .72;
  const margin = mobile ? 10 : 12;
  const height = Math.ceil(Math.max(
    width * (mobile ? .66 : .28),
    (copyHeight + margin * 2) / (fieldBottom - fieldTop),
  ));
  const top = Math.round((fieldTop + fieldBottom) * height / 2 - copyHeight / 2);

  paragraph.style.height = `${height}px`;
  paragraph.style.paddingTop = `${top}px`;
  paragraph.style.paddingBottom = `${height - copyHeight - top}px`;
}

function scheduleVideoSpeech() {
  if (!scheduled) scheduled = requestAnimationFrame(fitVideoSpeech);
}

const root = document.getElementById('root');
if (root) new MutationObserver(scheduleVideoSpeech).observe(root, { childList:true, subtree:true, characterData:true });
addEventListener('resize', scheduleVideoSpeech);
window.visualViewport?.addEventListener('resize', scheduleVideoSpeech);
document.fonts?.ready.then(scheduleVideoSpeech);
scheduleVideoSpeech();
