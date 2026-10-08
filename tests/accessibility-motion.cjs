const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('assets/timeline-gallery.js', 'utf8');
const controls = source.slice(source.indexOf('  function scheduleAutoplay'), source.indexOf('  function imageAt'));
const preference = source.match(/function motionPreferenceChanged\(\) \{[^\n]+\}/)[0];
let scheduled = [], cleared = [], listeners = {}, attributes = {}, live = {};
const state = { closed:false, paused:true, rotationPointerPaused:null, items:['a','b'], reduced:{matches:true}, autoplayTimer:12, navigate(){}, clearTimeout(id){cleared.push(id);}, window:{setTimeout(fn,delay){scheduled.push({fn,delay});return scheduled.length;}}, rotation:{dataset:{},setAttribute(k,v){attributes[k]=v;},addEventListener(k,fn){listeners[k]=fn;}}, announcement:{setAttribute(k,v){live[k]=v;}}, dialog:{addEventListener(k,fn){listeners[k]=fn;}}, close:{focus(){}} };
const context = vm.createContext(state); vm.runInContext(controls+preference,context);
context.toggleRotation(); assert.equal(scheduled.length,0); assert.equal(state.rotation.disabled,true);
state.reduced.matches=false; context.updateRotation(); context.toggleRotation(); assert.equal(state.paused,false); assert.equal(scheduled.length,1); assert.equal(live['aria-live'],'off');
context.pauseRotation(); assert.equal(state.paused,true); assert.equal(cleared.at(-1),1); assert.equal(live['aria-live'],'polite');
context.scheduleAutoplay(); assert.equal(scheduled.length,1);
context.toggleRotation(); assert.equal(scheduled.length,2); assert.equal(state.paused,false);
// Pointer focus may pause before click: a click intended to pause must stay paused.
listeners.pointerdown(); context.pauseRotation(); context.toggleRotation(); assert.equal(state.paused,true); assert.equal(scheduled.length,2);
// Explicit start works while the button already owns focus.
listeners.pointerdown(); context.toggleRotation(); assert.equal(state.paused,false); assert.equal(scheduled.length,3);
context.pauseRotation(); assert.equal(state.paused,true);
state.reduced.matches=true; context.motionPreferenceChanged(); assert.equal(state.rotation.disabled,true); assert.equal(state.paused,true);
state.reduced.matches=false; context.motionPreferenceChanged(); assert.equal(state.paused,true); assert.equal(scheduled.length,3);
state.closed=true; context.toggleRotation(); assert.equal(scheduled.length,3);
assert.equal(state.rotation.dataset.state,'playing');
assert.match(state.rotation.innerHTML,/<circle/);assert.match(state.rotation.innerHTML,/M13 11H18/);
context.pauseRotation();assert.equal(state.rotation.dataset.state,'paused');assert.match(state.rotation.innerHTML,/M16 11L29/);
assert.doesNotMatch(state.rotation.innerHTML,/billedskift/);
console.log('PASS: explicit start/pause, explicit pause, pointer focus ordering, reduced motion, no automatic restart, live announcement state');
