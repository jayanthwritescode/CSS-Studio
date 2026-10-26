import { displayedStyles } from '../animation/interpolation.js';
import { bounds } from '../canvas/geometry.js';
import { selectedElement } from '../state/store.js';
import { FONT_FAMILIES, ORIGINS } from '../elements/model.js';

const number = (key, label, min, max, step = 1, unit = '') => `<label><span class="field-label">${label}</span><span class="input-wrap"><input data-style="${key}" type="number" min="${min}" max="${max}" step="${step}" required aria-label="Element ${label.toLowerCase()}"><span>${unit}</span></span></label>`;
const color = (key, label) => `<label class="style-color"><span class="field-label">${label}</span><span class="color-field"><input data-style="${key}" type="color" aria-label="Element ${label.toLowerCase()}"><output data-color-label="${key}"></output></span></label>`;
const select = (key, label, options) => `<label><span class="field-label">${label}</span><select data-style="${key}" aria-label="Element ${label.toLowerCase()}">${options.map(option => `<option value="${option}">${option}</option>`).join('')}</select></label>`;

const displayNumber = (field, value) => {
  const step = field.step === 'any' ? 0.001 : Number(field.step) || 1;
  return Math.round(Math.round(value / step) * step * 1000) / 1000;
};

export function mountElementProperties(store, playback) {
  const form = document.querySelector('#element-settings');
  form.innerHTML = `
    <section class="property-section"><div class="section-title"><h3>Selected element</h3><span id="element-state" class="subtle-tag"></span></div><label class="field-label" for="element-name">Layer name</label><input id="element-name" class="full-input" maxlength="80" aria-label="Layer name"><p id="animation-edit-hint" class="field-hint" hidden>Transform, opacity, dimensions, colors, reveal, glow, shimmer, border width/radius and font size are keyed. 3D turns use numerical transform controls. Other styles apply across the animation.</p><p id="lock-hint" class="field-hint" hidden>Unlock the layer to edit its properties.</p></section>
    <fieldset id="element-style-fields"><section class="property-section"><h3>Transform</h3><div class="field-grid">
      ${number('x', 'X', -100000, 100000, 'any', 'px')}${number('y', 'Y', -100000, 100000, 'any', 'px')}
      ${number('width', 'Width', 1, 10000, 'any', 'px')}${number('height', 'Height', 1, 10000, 'any', 'px')}
      ${number('rotation', 'Rotation', -36000, 36000, 'any', '°')}${number('rotationY', '3D turn', -36000, 36000, 'any', '°')}${number('opacity', 'Opacity', 0, 1, 0.01)}
      ${number('scaleX', 'Scale X', 0.05, 10, 0.01)}${number('scaleY', 'Scale Y', 0.05, 10, 0.01)}
    </div><label class="field-label origin-label" for="element-origin">Transform origin</label><select id="element-origin" data-style="transformOrigin" aria-label="Element transform origin">${ORIGINS.map((value, index) => `<option value="${value}">${['Top left', 'Top center', 'Top right', 'Center left', 'Center', 'Center right', 'Bottom left', 'Bottom center', 'Bottom right'][index]}</option>`).join('')}</select>
    <div class="alignment-tools" aria-label="Align element to canvas"><button type="button" data-align="left" title="Align left" aria-label="Align left">⇤</button><button type="button" data-align="centerX" title="Center horizontally" aria-label="Center horizontally">↔</button><button type="button" data-align="right" title="Align right" aria-label="Align right">⇥</button><button type="button" data-align="top" title="Align top" aria-label="Align top">↥</button><button type="button" data-align="centerY" title="Center vertically" aria-label="Center vertically">↕</button><button type="button" data-align="bottom" title="Align bottom" aria-label="Align bottom">↧</button></div></section>
    <section id="text-properties" class="property-section"><h3>Text</h3><label class="field-label" for="element-content">Content</label><textarea id="element-content" maxlength="10000" rows="3" spellcheck="false"></textarea>${select('fontFamily', 'Font family', FONT_FAMILIES)}<div class="field-grid">${number('fontSize', 'Font size', 1, 1000, 1, 'px')}${select('fontWeight', 'Font weight', [100, 200, 300, 400, 500, 600, 700, 800, 900])}</div>${color('color', 'Text color')}</section>
    <section class="property-section"><h3>Effects</h3><div class="field-grid">${number('reveal', 'Reveal', 0, 1, 0.01)}${number('glow', 'Glow', 0, 80, 1, 'px')}${number('shimmer', 'Shimmer', -200, 200, 'any', '%')}</div><label class="switch-row"><span>Shimmer fill</span><input data-style="shimmerEnabled" type="checkbox" role="switch" aria-label="Shimmer fill"></label><label class="switch-row"><span>Spinner stroke</span><input data-style="spinnerEnabled" type="checkbox" role="switch" aria-label="Spinner stroke"></label></section><section class="property-section"><h3>Fill & border</h3>${color('backgroundColor', 'Fill color')}<label class="switch-row"><span>Transparent fill</span><input data-style="backgroundTransparent" type="checkbox" role="switch" aria-label="Transparent fill"></label><div class="field-grid">${number('borderWidth', 'Border width', 0, 100, 1, 'px')}${number('borderRadius', 'Radius', 0, 10000, 1, 'px')}</div>${select('borderStyle', 'Border style', ['solid', 'dashed', 'dotted', 'double', 'none'])}${color('borderColor', 'Border color')}</section>
    <section class="property-section"><h3>Shadow</h3><label class="switch-row"><span>Drop shadow</span><input id="shadow-enabled" type="checkbox" role="switch"></label><div id="shadow-fields" class="field-grid">${number('shadowX', 'Shadow X', -1000, 1000, 1, 'px')}${number('shadowY', 'Shadow Y', -1000, 1000, 1, 'px')}${number('shadowBlur', 'Blur', 0, 1000, 1, 'px')}${number('shadowSpread', 'Spread', -1000, 1000, 1, 'px')}</div>${color('shadowColor', 'Shadow color')}</section></fieldset>`;
  const fields = [...form.querySelectorAll('[data-style]')];
  const name = document.querySelector('#element-name');
  const content = document.querySelector('#element-content');
  const shadowEnabled = document.querySelector('#shadow-enabled');
  let renderedId = null;
  let shadow = { shadowX: 0, shadowY: 12, shadowBlur: 24, shadowSpread: 0, shadowColor: '#31234f' };
  function render(state) {
    const element = selectedElement(state);
    form.hidden = !element;
    document.querySelector('#canvas-settings').hidden = Boolean(element);
    document.querySelector('#properties-note').hidden = Boolean(element);
    document.querySelector('#show-canvas').disabled = !element;
    if (!element) { renderedId = null; return; }
    const styles = displayedStyles(element, state);
    const selectionChanged = renderedId !== element.id;
    renderedId = element.id;
    if (selectionChanged || document.activeElement !== name) name.value = element.name;
    if (selectionChanged || document.activeElement !== content) content.value = element.content;
    document.querySelector('#element-state').textContent = element.locked ? 'Locked' : state.timeline.mode === 'base' ? 'Base styles' : 'Animated pose';
    document.querySelector('#animation-edit-hint').hidden = state.timeline.mode === 'base';
    document.querySelector('#lock-hint').hidden = !element.locked;
    document.querySelector('#element-style-fields').disabled = element.locked;
    form.querySelectorAll('[data-align]').forEach(button => { button.disabled = Math.abs(styles.rotationY % 360) > 0.001; });
    document.querySelector('#text-properties').hidden = element.type !== 'text';
    const match = styles.boxShadow.match(/^(-?[\d.]+)px (-?[\d.]+)px ([\d.]+)px (-?[\d.]+)px (#[\da-f]{6})$/i);
    if (match) shadow = { shadowX: Number(match[1]), shadowY: Number(match[2]), shadowBlur: Number(match[3]), shadowSpread: Number(match[4]), shadowColor: match[5] };
    else if (selectionChanged) shadow = { shadowX: 0, shadowY: 12, shadowBlur: 24, shadowSpread: 0, shadowColor: '#31234f' };
    shadowEnabled.checked = styles.boxShadow !== 'none';
    for (const field of fields) {
      const value = field.dataset.style.startsWith('shadow') ? shadow[field.dataset.style] : styles[field.dataset.style];
      if (selectionChanged || document.activeElement !== field) {
        if (field.type === 'checkbox') field.checked = value;
        else field.value = field.type === 'number' ? displayNumber(field, value) : value;
      }
      const label = form.querySelector(`[data-color-label="${field.dataset.style}"]`);
      if (label) label.textContent = String(value).toUpperCase();
      if (field.dataset.style.startsWith('shadow')) field.disabled = !shadowEnabled.checked;
    }
  }
  function updateShadow() {
    const element = selectedElement(store.getState());
    if (!element) return;
    const value = shadowEnabled.checked ? `${shadow.shadowX}px ${shadow.shadowY}px ${shadow.shadowBlur}px ${shadow.shadowSpread}px ${shadow.shadowColor}` : 'none';
    store.dispatch({ type: 'element/update', id: element.id, styles: { boxShadow: value } });
  }
  form.addEventListener('click', event => {
    const button = event.target.closest('[data-align]');
    const { project } = store.getState();
    const element = selectedElement(store.getState());
    if (!button || !element || element.locked) return;
    const styles = displayedStyles(element, store.getState());
    if (Math.abs(styles.rotationY % 360) > 0.001) return;
    const box = bounds(styles);
    const moves = {
      left: { x: styles.x - box.left }, right: { x: styles.x + project.canvas.width - box.right },
      centerX: { x: styles.x + project.canvas.width / 2 - (box.left + box.right) / 2 },
      top: { y: styles.y - box.top }, bottom: { y: styles.y + project.canvas.height - box.bottom },
      centerY: { y: styles.y + project.canvas.height / 2 - (box.top + box.bottom) / 2 },
    };
    store.dispatch({ type: 'element/update', id: element.id, styles: moves[button.dataset.align] });
  });
  form.addEventListener('focusin', () => playback.pause());
  form.addEventListener('submit', event => event.preventDefault());
  let nameBeforeEdit = '';
  let editingId = null;
  name.addEventListener('focus', () => {
    const element = selectedElement(store.getState());
    nameBeforeEdit = element?.name ?? '';
    editingId = element?.id ?? null;
  });
  name.addEventListener('input', () => {
    if (editingId) store.dispatch({ type: 'element/rename', id: editingId, name: name.value });
  });
  name.addEventListener('blur', () => {
    const element = selectedElement(store.getState());
    if (element?.id === editingId) store.dispatch({ type: 'element/rename', id: element.id, name: name.value });
    name.value = selectedElement(store.getState())?.name ?? '';
  });
  name.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); name.blur(); }
    if (event.key === 'Escape') { name.value = nameBeforeEdit; name.blur(); }
  });
  content.addEventListener('input', () => {
    const element = selectedElement(store.getState());
    if (element) store.dispatch({ type: 'element/content', id: element.id, content: content.value });
  });
  for (const field of fields) {
    field.addEventListener('input', () => {
      const element = selectedElement(store.getState());
      if (!element || !field.validity.valid) return;
      const key = field.dataset.style;
      const value = field.type === 'number' ? field.valueAsNumber : field.type === 'checkbox' ? field.checked : field.value;
      if (key.startsWith('shadow')) { shadow[key] = value; updateShadow(); }
      else store.dispatch({ type: 'element/update', id: element.id, styles: { [key]: value } });
    });
    field.addEventListener('blur', () => {
      const element = selectedElement(store.getState());
      if (!element || field.type !== 'number') return;
      field.value = displayNumber(field, field.dataset.style.startsWith('shadow') ? shadow[field.dataset.style] : displayedStyles(element, store.getState())[field.dataset.style]);
    });
  }
  shadowEnabled.addEventListener('change', () => { updateShadow(); render(store.getState()); });
  document.querySelector('#show-canvas').addEventListener('click', () => store.dispatch({ type: 'selection/set', id: null }));
  store.subscribe(render);
  render(store.getState());
}
