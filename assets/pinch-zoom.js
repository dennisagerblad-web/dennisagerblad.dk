// Two-finger zoom for the mobile image viewers. The caller owns the image layer.
export function attachPinchZoom(surface, onChange, onPinchStart = () => {}, transformsSurface = false) {
  let scale = 1, x = 0, y = 0, gesture = null, panning = null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const point = touch => ({x: touch.clientX, y: touch.clientY});
  const center = touches => ({x: (touches[0].clientX + touches[1].clientX) / 2, y: (touches[0].clientY + touches[1].clientY) / 2});
  const distance = touches => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  function apply() {
    x = clamp(x, -(scale - 1) * surface.clientWidth / 2, (scale - 1) * surface.clientWidth / 2);
    y = clamp(y, -(scale - 1) * surface.clientHeight / 2, (scale - 1) * surface.clientHeight / 2);
    onChange(scale, x, y);
  }
  function reset() { scale = 1; x = y = 0; gesture = panning = null; apply(); }
  surface.addEventListener('touchstart', event => {
    if (event.target.closest('button')) return;
    if (event.touches.length >= 2) {
      gesture = {distance: distance(event.touches), scale, x, y, middle: center(event.touches)};
      panning = null;
      onPinchStart();
    } else if (scale > 1 && event.touches.length === 1) {
      panning = {point: point(event.touches[0]), x, y};
    }
  }, {passive: true});
  surface.addEventListener('touchmove', event => {
    if (gesture && event.touches.length >= 2) {
      event.preventDefault();
      const middle = center(event.touches);
      scale = clamp(gesture.scale * distance(event.touches) / Math.max(1, gesture.distance), 1, 5);
      const bounds = surface.getBoundingClientRect();
      const cx = bounds.left + bounds.width / 2 - (transformsSurface ? x : 0);
      const cy = bounds.top + bounds.height / 2 - (transformsSurface ? y : 0);
      x = middle.x - cx - (gesture.middle.x - cx - gesture.x) * scale / gesture.scale;
      y = middle.y - cy - (gesture.middle.y - cy - gesture.y) * scale / gesture.scale;
      if (scale === 1) x = y = 0;
      apply();
    } else if (panning && event.touches.length === 1 && scale > 1) {
      event.preventDefault();
      const current = point(event.touches[0]);
      x = panning.x + current.x - panning.point.x;
      y = panning.y + current.y - panning.point.y;
      apply();
    }
  }, {passive: false});
  const settle = event => {
    if (event.touches.length < 2) gesture = null;
    panning = event.touches.length === 1 && scale > 1 ? {point: point(event.touches[0]), x, y} : null;
  };
  surface.addEventListener('touchend', settle, {passive: true});
  surface.addEventListener('touchcancel', settle, {passive: true});
  return {reset, isZoomed: () => scale > 1.01, isPinching: () => Boolean(gesture)};
}
