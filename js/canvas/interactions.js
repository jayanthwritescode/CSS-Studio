import { selectedElement } from '../state/store.js';
import { resizeFromDelta, rotationFromPointer } from './geometry.js';

export function mountInteractions(store) {
  const viewport = document.querySelector('#viewport');
  const artboard = document.querySelector('#artboard');
  const panButton = document.querySelector('#pan-tool');
  let panMode = false;
  let gesture = null;

  function setPan(active) {
    panMode = active;
    viewport.classList.toggle('pan-mode', active);
    panButton.setAttribute('aria-pressed', String(active));
  }
  panButton.addEventListener('click', () => setPan(!panMode));
  function canvasPoint(event, zoom) {
    const rect = artboard.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / zoom, y: (event.clientY - rect.top) / zoom };
  }
  viewport.addEventListener('pointerdown', event => {
    if (gesture || (event.button !== 0 && event.button !== 1)) return;
    const pan = panMode || event.button === 1;
    if (pan) {
      gesture = { type: 'pan', pointer: event.pointerId, clientX: event.clientX, clientY: event.clientY, panX: store.getState().view.panX, panY: store.getState().view.panY };
    } else {
      const handle = event.target.closest('[data-handle]');
      const node = event.target.closest('[data-element-id]');
      if (!handle && !node) {
        store.dispatch({ type: 'selection/set', id: null });
        viewport.focus({ preventScroll: true });
        return;
      }
      if (node) store.dispatch({ type: 'selection/set', id: node.dataset.elementId });
      const selected = selectedElement(store.getState());
      if (!selected || selected.locked || !selected.visible) return;
      const zoom = store.getState().view.zoom;
      gesture = {
        type: handle?.dataset.handle === 'rotate' ? 'rotate' : handle ? 'resize' : 'move',
        handle: handle?.dataset.handle, id: selected.id, styles: { ...selected.styles }, zoom,
        pointer: event.pointerId, start: canvasPoint(event, zoom),
      };
    }
    event.preventDefault();
    viewport.focus({ preventScroll: true });
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('is-dragging');
  });
  viewport.addEventListener('pointermove', event => {
    if (!gesture || gesture.pointer !== event.pointerId) return;
    if (gesture.type === 'pan') {
      store.dispatch({ type: 'view/pan', x: gesture.panX + event.clientX - gesture.clientX, y: gesture.panY + event.clientY - gesture.clientY });
      return;
    }
    const current = canvasPoint(event, gesture.zoom);
    const dx = current.x - gesture.start.x, dy = current.y - gesture.start.y;
    let styles;
    if (gesture.type === 'move') styles = { x: gesture.styles.x + dx, y: gesture.styles.y + dy };
    if (gesture.type === 'resize') styles = resizeFromDelta(gesture.styles, gesture.handle, dx, dy);
    if (gesture.type === 'rotate') {
      gesture.rotation = rotationFromPointer({ ...gesture.styles, rotation: gesture.rotation ?? gesture.styles.rotation }, gesture.previous ?? gesture.start, current);
      gesture.previous = current;
      styles = { rotation: event.shiftKey ? Math.round(gesture.rotation / 15) * 15 : gesture.rotation };
    }
    store.dispatch({ type: 'element/update', id: gesture.id, styles });
  });
  function finish(cancel = false) {
    if (!gesture) return;
    const previous = gesture;
    gesture = null;
    if (cancel && previous.type === 'pan') store.dispatch({ type: 'view/pan', x: previous.panX, y: previous.panY });
    if (cancel && previous.id) store.dispatch({ type: 'element/update', id: previous.id, styles: previous.styles });
    if (viewport.hasPointerCapture(previous.pointer)) viewport.releasePointerCapture(previous.pointer);
    viewport.classList.remove('is-dragging');
  }
  viewport.addEventListener('pointerup', event => { if (gesture?.pointer === event.pointerId) finish(); });
  viewport.addEventListener('pointercancel', event => { if (gesture?.pointer === event.pointerId) finish(true); });
  viewport.addEventListener('lostpointercapture', () => finish(true));
  document.addEventListener('keydown', event => {
    if (document.querySelector('#guide').open || event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'Escape') {
      if (gesture) finish(true);
      else { store.dispatch({ type: 'selection/set', id: null }); setPan(false); }
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.toLowerCase() === 'h') setPan(true);
    if (event.key.toLowerCase() === 'v') setPan(false);
    const deltas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const delta = deltas[event.key];
    const selected = selectedElement(store.getState());
    if (!gesture && delta && selected && selected.visible && !selected.locked) {
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      store.dispatch({ type: 'element/update', id: selected.id, styles: { x: selected.styles.x + delta[0] * step, y: selected.styles.y + delta[1] * step } });
    }
  });
  window.addEventListener('blur', () => finish(true));
  return { setPan };
}
