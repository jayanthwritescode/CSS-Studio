export function mountProperties(store) {
  const form = document.querySelector('#canvas-settings');
  const width = document.querySelector('#canvas-width');
  const height = document.querySelector('#canvas-height');
  const preset = document.querySelector('#canvas-size');
  const background = document.querySelector('#canvas-background');
  const grid = document.querySelector('#grid-setting');

  function render({ project, view }) {
    const canvas = project.canvas;
    // Preserve an in-progress numeric entry while unrelated state updates render.
    if (document.activeElement !== width) width.value = canvas.width;
    if (document.activeElement !== height) height.value = canvas.height;
    const key = `${canvas.width}x${canvas.height}`;
    preset.value = [...preset.options].some(option => option.value === key) ? key : 'custom';
    background.value = canvas.background;
    document.querySelector('#color-label').textContent = canvas.background.toUpperCase();
    document.querySelector('#canvas-summary').textContent = `${canvas.width} × ${canvas.height}`;
    grid.checked = view.grid;
  }

  function resize() {
    if (!width.reportValidity() || !height.reportValidity()) return;
    store.dispatch({ type: 'canvas/resize', width: width.valueAsNumber, height: height.valueAsNumber });
  }
  width.addEventListener('change', resize);
  height.addEventListener('change', resize);
  for (const input of [width, height]) {
    input.addEventListener('input', () => {
      if (width.validity.valid && height.validity.valid) {
        store.dispatch({ type: 'canvas/resize', width: width.valueAsNumber, height: height.valueAsNumber });
      }
    });
    input.addEventListener('blur', () => {
      if (!input.validity.valid) input.value = store.getState().project.canvas[input === width ? 'width' : 'height'];
    });
  }
  preset.addEventListener('change', () => {
    if (preset.value === 'custom') { width.focus(); return; }
    const [w, h] = preset.value.split('x').map(Number);
    store.dispatch({ type: 'canvas/resize', width: w, height: h });
  });
  background.addEventListener('input', () => store.dispatch({ type: 'canvas/background', color: background.value }));
  grid.addEventListener('change', () => store.dispatch({ type: 'view/grid', visible: grid.checked }));
  form.addEventListener('submit', event => event.preventDefault());
  store.subscribe(render);
  render(store.getState());
}
