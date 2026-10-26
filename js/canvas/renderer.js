export function mountCanvas(store) {
  const viewport = document.querySelector('#viewport');
  const frame = document.querySelector('#canvas-frame');
  const artboard = document.querySelector('#artboard');
  const dimensions = document.querySelector('#artboard-dimensions');

  function render({ project, view }) {
    const { width, height, background } = project.canvas;
    frame.style.width = `${width * view.zoom}px`;
    frame.style.height = `${height * view.zoom}px`;
    artboard.style.width = `${width}px`;
    artboard.style.height = `${height}px`;
    artboard.style.backgroundColor = background;
    artboard.style.transform = `scale(${view.zoom})`;
    // Keep the foundation hint legible on tiny/custom artboards; it is editor UI only.
    const hint = artboard.querySelector('.canvas-empty');
    hint.hidden = width < 600 || height < 400;
    hint.style.display = hint.hidden ? 'none' : '';
    viewport.classList.toggle('grid-visible', view.grid);
    dimensions.textContent = `${width} × ${height}`;
  }

  function fit() {
    const { width, height } = store.getState().project.canvas;
    const availableWidth = Math.max(1, viewport.clientWidth - 96);
    const availableHeight = Math.max(1, viewport.clientHeight - 100);
    const zoom = Math.min(availableWidth / width, availableHeight / height, 1);
    store.dispatch({ type: 'view/zoom', zoom, fit: true });
  }

  const unsubscribe = store.subscribe((state, action) => {
    render(state);
    if (action.type === 'canvas/resize' && state.view.fit) fit();
  });
  const observer = new ResizeObserver(() => {
    if (store.getState().view.fit) fit();
  });
  observer.observe(viewport);
  render(store.getState());
  fit();

  return { fit, destroy() { unsubscribe(); observer.disconnect(); } };
}
