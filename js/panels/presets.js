import { PRESETS, findPreset, buildPreset } from '../animation/presets.js';
import { selectedElement } from '../state/store.js';
import { createElement } from '../elements/model.js';
import { elementStyles } from '../elements/styles.js';
import { evaluateElement } from '../animation/interpolation.js';
import { parseEasing } from '../animation/easing.js';

export function mountPresets(store, playback, notify) {
  const dialog = document.querySelector('#preset-library');
  const grid = document.querySelector('#preset-grid');
  const search = document.querySelector('#preset-search');
  const category = document.querySelector('#preset-category');
  const duration = document.querySelector('#preset-duration');
  const delay = document.querySelector('#preset-delay');
  const easing = document.querySelector('#preset-easing');
  const custom = document.querySelector('#preset-custom-easing');
  const apply = document.querySelector('#apply-preset');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cards = new Map(), previews = new Map();
  let selectedId = PRESETS[0].id;

  for (const preset of PRESETS) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'preset-card';
    card.dataset.presetId = preset.id;
    const thumbnail = document.createElement('span');
    thumbnail.className = 'preset-thumbnail';
    thumbnail.setAttribute('aria-hidden', 'true');
    const name = document.createElement('strong'); name.textContent = preset.name;
    const label = document.createElement('span'); label.className = 'preset-card-category'; label.textContent = preset.category;
    card.append(thumbnail, name, label);
    card.setAttribute('aria-label', `Choose ${preset.name} preset`);
    cards.set(preset.id, card);
    grid.append(card);
    card.addEventListener('click', () => choose(preset.id));
    card.addEventListener('pointerenter', () => startPreview(preset.id));
    card.addEventListener('pointerleave', () => { if (selectedId !== preset.id) stopPreview(preset.id); });
    card.addEventListener('focus', () => startPreview(preset.id));
    card.addEventListener('blur', () => { if (selectedId !== preset.id) stopPreview(preset.id); });
  }
  function stopPreview(id) {
    const animations = previews.get(id);
    animations?.forEach(animation => animation.cancel());
    previews.delete(id);
  }
  function startPreview(id) {
    if (!dialog.open || reduced.matches || previews.has(id) || cards.get(id).hidden) return;
    const preset = findPreset(id), thumbnail = cards.get(id).querySelector('.preset-thumbnail');
    thumbnail.replaceChildren();
    const type = preset.types?.[0] ?? 'rectangle';
    const element = createElement(type, { width: 100, height: 64 });
    Object.assign(element.styles, { x: 35, y: 18, width: 30, height: 30, fontSize: 14, borderRadius: type === 'circle' ? 9999 : 7 });
    if (type === 'text') { element.content = 'Motion'; element.styles.width = 70; element.styles.height = 24; element.styles.x = 15; element.styles.fontFamily = 'monospace'; element.styles.color = '#d7c1ff'; }
    if (preset.createsLayers) element.styles.x = 49;
    const result = buildPreset(element, id, { duration: 1200, delay: 0, easing: preset.easing ?? 'ease-in-out' }, 1200);
    if (!result) return;
    const animations = [];
    const stage = document.createElement('span');
    stage.className = preset.createsLayers ? 'preset-preview-stage dots' : 'preset-preview-stage';
    thumbnail.append(stage);
    for (const item of result.elements) {
      const node = document.createElement('span');
      node.className = 'preset-preview-shape';
      if (type === 'text') node.textContent = item.content;
      Object.assign(node.style, elementStyles(item.styles, type));
      stage.append(node);
      const frames = item.keyframes.map(frame => {
        const pose = evaluateElement(item, frame.time, 1200);
        const css = elementStyles(pose, type);
        // A reveal's 100% endpoint must stay an inset for native CSS interpolation.
        if (preset.stepped) { css.clipPath = `inset(0 ${(1 - pose.reveal) * 100}% 0 0)`; css.width = 'max-content'; }
        return { ...css, offset: frame.time / 1200, easing: frame.easing };
      });
      if (typeof node.animate === 'function') animations.push(node.animate(frames, { duration: 1200, iterations: Infinity, fill: 'both' }));
    }
    previews.set(id, animations);
  }
  function renderCards() {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    for (const preset of PRESETS) {
      const card = cards.get(preset.id);
      card.hidden = (category.value !== 'All' && category.value !== preset.category) || !`${preset.name} ${preset.category} ${preset.description}`.toLowerCase().includes(query);
      card.setAttribute('aria-pressed', String(selectedId === preset.id));
      if (card.hidden) stopPreview(preset.id); else visible++;
      // Static preview remains useful without animation, including reduced-motion users.
      if (!card.querySelector('.preset-thumbnail').children.length) {
        const shape = document.createElement('span'); shape.className = `preset-static ${preset.types?.[0] ?? 'rectangle'}`;
        if (preset.types?.[0] === 'text') shape.textContent = 'Motion';
        card.querySelector('.preset-thumbnail').append(shape);
      }
    }
    document.querySelector('#preset-empty').hidden = visible > 0;
  }
  function renderTarget() {
    if (!dialog.open) return;
    const preset = findPreset(selectedId), element = selectedElement(store.getState());
    const compatible = element && !element.locked && (!preset.types || preset.types.includes(element.type));
    document.querySelector('#preset-target').textContent = !element ? 'Select an element on the canvas before applying.' : element.locked ? `${element.name} is locked. Unlock it to apply a preset.` : preset.types && !preset.types.includes(element.type) ? `Requires ${preset.types.join(' or ')}. Selected: ${element.name}.` : `Apply to ${element.name}`;
    apply.disabled = !compatible;
    apply.textContent = preset.createsLayers ? 'Create bouncing dots' : 'Apply preset';
  }
  function choose(id) {
    const previous = selectedId; selectedId = id;
    if (previous !== id) stopPreview(previous);
    const preset = findPreset(id);
    document.querySelector('#preset-selected-name').textContent = preset.name;
    document.querySelector('#preset-category-label').textContent = preset.category.toUpperCase();
    document.querySelector('#preset-description').textContent = preset.description;
    easing.value = preset.easing ?? 'ease-in-out';
    easing.disabled = Boolean(preset.stepped);
    custom.hidden = document.querySelector('#preset-custom-label').hidden = true;
    document.querySelector('#preset-timing-note').textContent = preset.stepped ? 'Character steps are generated automatically. Duration and delay remain editable.' : 'Timing is baked into editable keys. The composition extends if needed; remaining time holds the final pose.';
    renderCards(); renderTarget(); startPreview(id);
  }
  function open() {
    playback.pause();
    duration.value = Math.min(30, Math.max(0.1, store.getState().project.duration / 1000));
    delay.value = 0;
    dialog.showModal();
    choose(selectedId);
  }
  for (const id of ['open-presets', 'sidebar-presets']) document.getElementById(id).addEventListener('click', open);
  document.querySelector('#close-presets').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { for (const id of previews.keys()) stopPreview(id); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  search.addEventListener('input', renderCards);
  category.addEventListener('change', renderCards);
  easing.addEventListener('change', () => {
    custom.hidden = document.querySelector('#preset-custom-label').hidden = easing.value !== 'custom';
  });
  apply.addEventListener('click', () => {
    const element = selectedElement(store.getState()), preset = findPreset(selectedId);
    if (!element || element.locked) return;
    if (!duration.reportValidity() || !delay.reportValidity()) return;
    const value = easing.value === 'custom' ? custom.value : easing.value;
    if (!parseEasing(value)) { notify('Choose a valid CSS easing or cubic-bezier curve.'); custom.focus(); return; }
    const options = { duration: Math.round(duration.valueAsNumber * 1000), delay: Math.round(delay.valueAsNumber * 1000), easing: value };
    const previous = store.getState();
    store.dispatch({ type: 'preset/apply', id: element.id, presetId: selectedId, options });
    if (store.getState() === previous) { notify('This preset could not be applied to the selected element.'); return; }
    dialog.close();
    document.querySelector('.workspace').classList.remove('layers-open');
    document.querySelector('#toggle-layers').setAttribute('aria-expanded', 'false');
    notify(`${preset.name} applied. Its keyframes are ready to edit.`);
    document.querySelector('#viewport').focus({ preventScroll: true });
  });
  reduced.addEventListener('change', () => { for (const id of previews.keys()) stopPreview(id); if (!reduced.matches) startPreview(selectedId); });
  store.subscribe(renderTarget);
  renderCards();
}
