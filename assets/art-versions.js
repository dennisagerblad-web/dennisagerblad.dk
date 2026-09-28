// Kunst 1 is the original gallery. Kunst 2 uses two CSS image layers:
// a stretchable room on the ship and the original photograph on its underlay.

const chooser = document.createElement('div');
chooser.className = 'art-version-chooser';
chooser.setAttribute('role', 'group');
chooser.setAttribute('aria-label', 'Vælg kunstgalleri');
const versions = [1, 2];
const buttons = versions.map(version => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = `Kunst ${version}`;
  button.addEventListener('click', () => {
    selectedVersion = version;
    sessionStorage.setItem('dennis-art-version', String(version));
    update();
  });
  chooser.append(button);
  return button;
});
document.body.append(chooser);

let selectedVersion = Number(sessionStorage.getItem('dennis-art-version')) === 2 ? 2 : 1;
let scheduled = false;
function update() {
  const artOpen = !!document.querySelector('.ship.section-4.is-open .art-room');
  document.body.classList.toggle('art-gallery-open', artOpen);
  document.body.classList.toggle('art-version-2', artOpen && selectedVersion === 2);
  buttons.forEach((button, index) => {
    const active = selectedVersion === versions[index];
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; update(); });
}).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
update();
