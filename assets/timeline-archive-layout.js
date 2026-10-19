// Archive documents grow to their full content height. The surrounding popup
// owns scrolling, just like the other Timeline dialogs.
const cleanups = new WeakMap();
export function fitTimelineArchiveFrame(frame, width, onSize) {
  cleanups.get(frame)?.();
  const document = frame.contentDocument;
  if (!document?.body) return;
  const body = document.body;
  for (const element of [document.documentElement, body]) {
    element.style.setProperty('overflow-y', 'hidden', 'important');
    element.style.setProperty('height', 'auto', 'important');
    element.style.setProperty('min-height', '0', 'important');
    element.style.setProperty('max-height', 'none', 'important');
  }
  frame.setAttribute('scrolling', 'no');
  frame.style.setProperty('max-height', 'none', 'important');
  let request = 0;
  let previousHeight = -1;
  let disposed = false;
  const measure = () => {
    request = 0;
    if (disposed || !frame.isConnected) return;
    const top = body.getBoundingClientRect().top;
    const range = document.createRange();
    range.selectNodeContents(body);
    let bottom = Math.max(top, range.getBoundingClientRect().bottom);
    for (const element of body.children) {
      const bounds = element.getBoundingClientRect();
      const margin = parseFloat(document.defaultView.getComputedStyle(element).marginBottom) || 0;
      bottom = Math.max(bottom, bounds.bottom + margin);
    }
    const padding = parseFloat(document.defaultView.getComputedStyle(body).paddingBottom) || 0;
    const height = Math.max(180, Math.ceil(bottom - top + padding));
    if (height !== previousHeight) {
      previousHeight = height;
      onSize({ width, height });
    }
  };
  const schedule = () => {
    if (!disposed && !request) request = requestAnimationFrame(measure);
  };
  const resize = new ResizeObserver(schedule);
  resize.observe(body);
  for (const element of body.children) resize.observe(element);
  body.addEventListener('load', schedule, true);
  const removal = new MutationObserver(() => {
    if (!frame.isConnected) cleanup();
  });
  removal.observe(frame.ownerDocument.body, { childList: true, subtree: true });
  const cleanup = () => {
    disposed = true;
    cancelAnimationFrame(request);
    resize.disconnect();
    removal.disconnect();
    body.removeEventListener('load', schedule, true);
    cleanups.delete(frame);
  };
  cleanups.set(frame, cleanup);
  schedule();
  document.fonts?.ready.then(schedule);
}
