const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/site-app.js', 'utf8');
const helpers = source.slice(source.indexOf('let aaFocusRestoreFrame'), source.indexOf('function ze'));
let queued = new Map(), frame = 0;
const root = { inert: false };
let thumbnails = [];
const document = { activeElement: null, querySelector: () => root, querySelectorAll: () => thumbnails };
const context = vm.createContext({ document, requestAnimationFrame(fn) { queued.set(++frame, fn); return frame; }, cancelAnimationFrame(id) { queued.delete(id); } });
vm.runInContext(helpers, context);
function node(label, visible = true) { return { isConnected: true, getAttribute: () => label, getClientRects: () => visible ? [{}] : [], closest: () => null, focus() { document.activeElement = this; } }; }
function flush() { const callbacks = [...queued.values()]; queued.clear(); callbacks.forEach(fn => fn()); }
const opener = node('Vis foto'), close = node('Luk'), previous = node('Forrige'), next = node('Næste'), hidden = node('Skjult', false);
const dialog = { querySelectorAll: () => [close, previous, next, hidden], contains: el => [close, previous, next].includes(el) };
function tab(shiftKey = false) { let prevented = false; context.aaTrapFocus({ key: 'Tab', currentTarget: dialog, shiftKey, preventDefault() { prevented = true; } }); return prevented; }
opener.focus(); let cleanup = context.aaOpenDialog(close);
assert.equal(root.inert, true); assert.equal(document.activeElement, close);
next.focus(); assert.equal(tab(), true); assert.equal(document.activeElement, close);
assert.equal(tab(true), true); assert.equal(document.activeElement, next);
opener.focus(); assert.equal(tab(), true); assert.equal(document.activeElement, close);
previous.focus(); assert.equal(tab(), false);
cleanup(); flush(); assert.equal(root.inert, false); assert.equal(document.activeElement, opener);
// React strict effect replay must not let delayed cleanup steal dialog focus.
opener.focus(); cleanup = context.aaOpenDialog(close); cleanup(); cleanup = context.aaOpenDialog(close); flush(); assert.equal(document.activeElement, close); cleanup(); flush();
// Performance thumbnails are recreated when the viewer closes.
opener.focus(); cleanup = context.aaOpenDialog(close); opener.isConnected = false; const replacement = node('Vis foto'); thumbnails = [replacement]; cleanup(); flush(); assert.equal(document.activeElement, replacement);
// Existing inert state is preserved when opening above an already inert root.
root.inert = true; cleanup = context.aaOpenDialog(close); cleanup(); flush(); assert.equal(root.inert, true);
console.log('PASS: focus wrapping, hidden controls, opener restoration, recreated thumbnails, effect replay, inert restoration');

// Capture the opener before React removes it from the document.
root.inert=false; opener.isConnected=false; document.activeElement=null; cleanup=context.aaOpenDialog(close,opener); cleanup(); flush(); assert.equal(document.activeElement,replacement);
console.log('PASS: explicitly captured opener survives pre-effect removal');

// API-controlled YouTube iframes are not keyboard stops in the dialog.
const playerFrame={...node('YouTube'),tagName:'IFRAME',tabIndex:-1};
const archiveFrame={...node('Arkiv'),tagName:'IFRAME',tabIndex:0};
const videoDialog={querySelectorAll:()=>[close,playerFrame,next,archiveFrame]};
assert.deepEqual(Array.from(context.aaFocusable(videoDialog)),[close,next,archiveFrame]);
console.log('PASS: API-controlled video iframe is skipped; archive iframe stays available');
