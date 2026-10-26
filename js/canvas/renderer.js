import { elementStyles } from '../elements/styles.js';
import { displayedStyles } from '../animation/interpolation.js';
import { selectedElement } from '../state/store.js';

export function applyElementStyles(node, styles, type) {
  Object.assign(node.style, elementStyles(styles, type));
}

export function mountCanvas(store) {
  const viewport = document.querySelector('#viewport');
  const frame = document.querySelector('#canvas-frame');
  const artboard = document.querySelector('#artboard');
  const overlay = document.querySelector('#selection-overlay');
  const dimensions = document.querySelector('#artboard-dimensions');
  const hint = artboard.querySelector('.canvas-empty');
  const nodes = new Map();
  const box = document.createElement('div');
  box.className = 'selection-box';
  for (const direction of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'rotate']) {
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = `selection-handle handle-${direction}`;
    handle.dataset.handle = direction;
    handle.tabIndex = -1;
    handle.setAttribute('aria-label', direction === 'rotate' ? 'Rotate selected element by dragging' : `Resize ${direction} by dragging`);
    box.append(handle);
  }
  overlay.append(box);

  function render(state) {
    const { project, view } = state;
    const { width, height, background } = project.canvas;
    frame.style.transform = `translate(${view.panX}px, ${view.panY}px)`;
    frame.style.width = `${width * view.zoom}px`;
    frame.style.height = `${height * view.zoom}px`;
    artboard.style.width = overlay.style.width = `${width}px`;
    artboard.style.height = overlay.style.height = `${height}px`;
    artboard.style.backgroundColor = background;
    artboard.style.transform = overlay.style.transform = `scale(${view.zoom})`;
    overlay.style.setProperty('--handle-size', `${8 / view.zoom}px`);
    overlay.style.setProperty('--outline-width', `${1 / view.zoom}px`);
    overlay.style.setProperty('--rotate-offset', `${26 / view.zoom}px`);
    hint.hidden = project.elements.length > 0 || width * view.zoom < 300 || height * view.zoom < 190;
    viewport.classList.toggle('grid-visible', view.grid);
    dimensions.textContent = `${width} × ${height}`;

    const ids = new Set(project.elements.map(element => element.id));
    for (const [id, node] of nodes) if (!ids.has(id)) { node.remove(); nodes.delete(id); }
    project.elements.forEach((element, index) => {
      let node = nodes.get(element.id);
      if (!node) {
        node = document.createElement('div');
        node.className = `canvas-element element-${element.type}`;
        node.dataset.elementId = element.id;
        if (element.type === 'text') {
          const text = document.createElement('span');
          text.className = 'element-text-content';
          node.append(text);
        }
        if (element.type === 'image') {
          const image = document.createElement('img');
          image.draggable = false;
          image.alt = '';
          image.src = element.src;
          node.append(image);
        }
        artboard.append(node);
        nodes.set(element.id, node);
      }
      const pose = displayedStyles(element, state);
      if (element.type === 'text') {
        const text = node.querySelector('.element-text-content');
        if (text.textContent !== element.content) text.textContent = element.content;
        text.style.clipPath = `inset(0 ${(1 - pose.reveal) * 100}% 0 0)`;
      }
      applyElementStyles(node, pose, element.type);
      node.style.zIndex = index;
      node.hidden = !element.visible;
      node.classList.toggle('is-locked', element.locked);
      node.classList.toggle('is-selected', element.id === state.selection);
      node.setAttribute('aria-label', `${element.name}${element.locked ? ', locked' : ''}`);
    });
    const selected = selectedElement(state);
    box.hidden = !selected || !selected.visible || state.timeline.playing;
    if (selected) {
      const pose = displayedStyles(selected, state);
      applyElementStyles(box, pose, selected.type);
      box.classList.toggle('turned-in-3d', Math.abs(pose.rotationY % 360) > 0.001);
      // Selection chrome is independent of the element's visual appearance.
      Object.assign(box.style, { opacity: 1, background: 'none', borderRadius: 0, boxShadow: 'none', border: 'none', filter: 'none', clipPath: 'none' });
      box.classList.toggle('locked', selected.locked);
    }
  }

  function fit() {
    const { width, height } = store.getState().project.canvas;
    const zoom = Math.min(Math.max(1, viewport.clientWidth - 96) / width, Math.max(1, viewport.clientHeight - 100) / height, 1);
    store.dispatch({ type: 'view/pan', x: 0, y: 0, fit: true });
    store.dispatch({ type: 'view/zoom', zoom, fit: true });
    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;
  }
  const unsubscribe = store.subscribe((state, action) => {
    render(state);
    if (action.type === 'canvas/resize' && state.view.fit) fit();
  });
  const observer = new ResizeObserver(() => { if (store.getState().view.fit) fit(); });
  observer.observe(viewport);
  render(store.getState());
  fit();
  return { fit, destroy() { unsubscribe(); observer.disconnect(); } };
}
