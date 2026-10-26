import { createElement } from './model.js';
import { selectedElement } from '../state/store.js';

export function mountElements(store, notify) {
  const fileInput = document.querySelector('#image-file');
  const menu = document.querySelector('#insert-menu');
  let imagePending = false;

  function add(type, asset) {
    const { project } = store.getState();
    const label = `${type[0].toUpperCase()}${type.slice(1)}`;
    const names = new Set(project.elements.map(element => element.name));
    let number = 1;
    while (names.has(`${label} ${number}`)) number++;
    const element = createElement(type, project.canvas, number - 1, asset);
    store.dispatch({ type: 'element/add', element });
    document.querySelector('#viewport').focus({ preventScroll: true });
  }
  function requestAdd(type) {
    menu.open = false;
    if (type === 'image') { if (!imagePending) fileInput.click(); }
    else add(type);
  }
  function elementAction(action) {
    const element = selectedElement(store.getState());
    if (!element) return;
    if (action === 'rename') {
      const field = document.querySelector('#element-name');
      field.focus();
      field.select();
    } else if (action === 'forward' || action === 'backward') {
      store.dispatch({ type: 'element/reorder', id: element.id, direction: action === 'forward' ? 1 : -1 });
    } else if (action === 'duplicate' || action === 'delete') {
      store.dispatch({ type: `element/${action}`, id: element.id });
    }
  }
  document.addEventListener('click', event => {
    const addButton = event.target.closest('[data-add]');
    if (addButton) requestAdd(addButton.dataset.add);
    const actionButton = event.target.closest('[data-element-action]');
    if (actionButton) elementAction(actionButton.dataset.elementAction);
    if (!event.target.closest('#insert-menu')) menu.open = false;
  });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file || imagePending) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024 || file.size === 0) {
      notify('Choose a PNG, JPEG, WebP, or GIF image up to 5 MB.');
      return;
    }
    imagePending = true;
    try {
      const src = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Read failed'));
        reader.readAsDataURL(file);
      });
      const image = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Decode failed'));
        image.src = src;
      });
      if (image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('Image too large');
      add('image', { src, width: image.naturalWidth, height: image.naturalHeight });
      notify('Image added to the canvas.');
    } catch {
      notify('This image could not be opened. Try a valid image under 40 megapixels.');
    } finally { imagePending = false; }
  });
  document.addEventListener('keydown', event => {
    if (document.querySelector('#guide').open || event.target.closest('#timeline, input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'Escape') { menu.open = false; return; }
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'd') {
      event.preventDefault(); elementAction('duplicate'); return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (selectedElement(store.getState())) { event.preventDefault(); elementAction('delete'); }
      return;
    }
    const types = { r: 'rectangle', c: 'circle', t: 'text', i: 'image' };
    if (types[event.key.toLowerCase()]) { event.preventDefault(); requestAdd(types[event.key.toLowerCase()]); }
  });
}
