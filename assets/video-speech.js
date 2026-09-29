// Fit the Video introduction to the illustrated white field as text and width change.
// The mobile image points up; the supplied landscape image points right.
const selector = '.ship.section-1 .archive .scrolling-intro';
const portrait = matchMedia('(max-width: 760px) and (orientation: portrait)');
const landscape = matchMedia('(max-width: 950px) and (orientation: landscape)');
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
  const rightBubble = landscape.matches;
  paragraph.style.paddingLeft = `${Math.round(width * (mobile ? .075 : rightBubble ? .07 : .08))}px`;
  paragraph.style.paddingRight = `${Math.round(width * (mobile ? .075 : rightBubble ? .17 : .08))}px`;
  const copyHeight = paragraph.getBoundingClientRect().height;
  const fieldTop = mobile ? .30 : rightBubble ? .18 : .15;
  const fieldBottom = mobile ? .85 : rightBubble ? .79 : .72;
  const margin = mobile ? 5 : 6;
  const height = Math.ceil(Math.max(
    width * (mobile ? .29 : rightBubble ? .16 : .105),
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
