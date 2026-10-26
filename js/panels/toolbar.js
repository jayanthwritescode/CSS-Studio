import { LIMITS } from '../state/store.js';

export function mountToolbar(store, canvas) {
  const name = document.querySelector('#project-name');
  const guide = document.querySelector('#guide');
  const zoomLabel = document.querySelector('#zoom-label');
  const zoomIn = document.querySelector('#zoom-in');
  const zoomOut = document.querySelector('#zoom-out');
  const grid = document.querySelector('#toggle-grid');
  const changeZoom = factor => store.dispatch({ type: 'view/zoom', zoom: store.getState().view.zoom * factor });
  const toggleGrid = () => store.dispatch({ type: 'view/grid', visible: !store.getState().view.grid });

  function render({ project, view }) {
    if (document.activeElement !== name) name.value = project.name;
    document.title = `MotionLab · ${project.name}`;
    zoomLabel.value = `${Math.round(view.zoom * 100)}%`;
    zoomIn.disabled = view.zoom >= LIMITS.maxZoom;
    zoomOut.disabled = view.zoom <= LIMITS.minZoom;
    grid.setAttribute('aria-pressed', String(view.grid));
  }
  let nameBeforeEdit = store.getState().project.name;
  name.addEventListener('focus', () => { nameBeforeEdit = store.getState().project.name; });
  name.addEventListener('input', () => store.dispatch({ type: 'project/rename', name: name.value }));
  name.addEventListener('blur', () => {
    store.dispatch({ type: 'project/rename', name: name.value });
    name.value = store.getState().project.name;
  });
  name.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); name.blur(); }
    if (event.key === 'Escape') { name.value = nameBeforeEdit; name.blur(); }
  });
  zoomIn.addEventListener('click', () => changeZoom(1.25));
  zoomOut.addEventListener('click', () => changeZoom(0.8));
  grid.addEventListener('click', toggleGrid);
  document.querySelector('#fit').addEventListener('click', canvas.fit);
  document.querySelector('#reset-view').addEventListener('click', () => {
    store.dispatch({ type: 'view/grid', visible: true });
    canvas.fit();
  });
  document.querySelector('#help').addEventListener('click', () => guide.showModal());
  document.querySelector('#close-guide').addEventListener('click', () => guide.close());
  guide.addEventListener('click', event => { if (event.target === guide) {
    const bounds = guide.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) guide.close();
  } });
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || document.querySelector('dialog[open]') || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
    const key = event.key.toLowerCase();
    if (key === 'f') { event.preventDefault(); canvas.fit(); }
    if (key === 'g' && !event.repeat) { event.preventDefault(); if (event.shiftKey) store.dispatch({ type: 'view/snap', enabled: !store.getState().view.snap }); else toggleGrid(); }
    if (key === '+' || key === '=') { event.preventDefault(); changeZoom(1.25); }
    if (key === '-') { event.preventDefault(); changeZoom(0.8); }
    if (key === '?') { event.preventDefault(); guide.showModal(); }
  });
  store.subscribe(render);
  render(store.getState());
}
