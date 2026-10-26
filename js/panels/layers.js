import { displayedStyles } from '../animation/interpolation.js';
import { selectedElement } from '../state/store.js';

const ICONS = { rectangle: '▢', circle: '○', text: 'T', image: '▧' };
export function mountLayers(store) {
  const list = document.querySelector('#layer-list');
  const rows = new Map();
  const workspace = document.querySelector('.workspace');
  const toggle = document.querySelector('#toggle-layers');
  function setOpen(open) {
    workspace.classList.toggle('layers-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }
  toggle.addEventListener('click', () => setOpen(!workspace.classList.contains('layers-open')));
  document.querySelector('#close-layers').addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
  list.addEventListener('click', event => {
    const row = event.target.closest('[data-layer-id]');
    const button = event.target.closest('button');
    if (!row || !button) return;
    const id = row.dataset.layerId;
    if (button.dataset.action === 'select') {
      store.dispatch({ type: 'selection/set', id });
      setOpen(false);
    }
    if (button.dataset.action === 'visible') store.dispatch({ type: 'element/visibility', id });
    if (button.dataset.action === 'locked') store.dispatch({ type: 'element/lock', id });
  });
  list.addEventListener('dblclick', event => {
    if (!event.target.closest('[data-action="select"]')) return;
    document.dispatchEvent(new Event('motionlab:properties'));
    document.querySelector('#element-name').focus();
    document.querySelector('#element-name').select();
  });

  function render(state) {
    const elements = state.project.elements;
    const ids = new Set(elements.map(element => element.id));
    for (const [id, row] of rows) if (!ids.has(id)) { row.remove(); rows.delete(id); }
    // Reorder only when necessary so keyboard focus survives property edits.
    [...elements].reverse().forEach((element, index) => {
      let row = rows.get(element.id);
      if (!row) {
        row = document.createElement('li');
        row.dataset.layerId = element.id;
        row.innerHTML = '<button class="layer-select" data-action="select"><span class="layer-type" aria-hidden="true"></span><span class="layer-name"></span></button><button class="layer-control" data-action="visible"></button><button class="layer-control" data-action="locked"></button>';
        rows.set(element.id, row);
      }
      if (list.children[index] !== row) list.insertBefore(row, list.children[index] ?? null);
      row.classList.toggle('selected', element.id === state.selection);
      row.classList.toggle('hidden-layer', !element.visible);
      row.querySelector('.layer-type').textContent = ICONS[element.type];
      row.querySelector('.layer-name').textContent = element.name;
      const select = row.querySelector('[data-action="select"]');
      select.setAttribute('aria-label', `Select ${element.name}`);
      select.setAttribute('aria-pressed', String(element.id === state.selection));
      const visible = row.querySelector('[data-action="visible"]');
      visible.textContent = element.visible ? '◉' : '○';
      visible.setAttribute('aria-label', `${element.visible ? 'Hide' : 'Show'} ${element.name}`);
      visible.title = element.visible ? 'Hide layer' : 'Show layer';
      visible.setAttribute('aria-pressed', String(!element.visible));
      const locked = row.querySelector('[data-action="locked"]');
      locked.textContent = element.locked ? '▣' : '◇';
      locked.setAttribute('aria-label', `${element.locked ? 'Unlock' : 'Lock'} ${element.name}`);
      locked.title = element.locked ? 'Unlock layer' : 'Lock layer';
      locked.setAttribute('aria-pressed', String(element.locked));
    });
    document.querySelector('#layer-count').textContent = elements.length;
    document.querySelector('#layer-empty').hidden = elements.length > 0;
    document.querySelector('#empty-samples').hidden = elements.length > 0;
    document.querySelector('#element-status').textContent = `${elements.length} element${elements.length === 1 ? '' : 's'}`;
    const selected = selectedElement(state);
    const position = elements.findIndex(element => element.id === state.selection);
    document.querySelectorAll('[data-element-action]').forEach(button => {
      const action = button.dataset.elementAction;
      button.disabled = !selected || (selected.locked && ['delete', 'forward', 'backward'].includes(action))
        || (action === 'forward' && position === elements.length - 1) || (action === 'backward' && position === 0);
    });
    updateSummary(state);
  }
  function updateSummary(state) {
    const selected = selectedElement(state);
    const styles = selected ? displayedStyles(selected, state) : null;
    document.querySelector('#selection-title').textContent = selected ? selected.name : 'Your canvas, your composition.';
    document.querySelector('#selection-description').textContent = selected
      ? `${selected.locked ? 'Locked · ' : ''}${selected.visible ? '' : 'Hidden · '}${Math.round(styles.width)} × ${Math.round(styles.height)} px · ${Math.round(styles.rotation)}° rotation`
      : state.project.elements.length ? 'Select a layer to edit, or press Play to explore.' : 'Add an element to start designing.';
  }
  store.subscribe((state, action) => {
    if (action.type === 'timeline/tick' || action.type === 'timeline/seek') updateSummary(state);
    else render(state);
    if (action.type === 'element/add') setOpen(false);
  });
  render(store.getState());
}
