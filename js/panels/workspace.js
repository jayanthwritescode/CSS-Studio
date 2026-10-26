export function mountWorkspace() {
  const workspace = document.querySelector('.workspace');
  const toggle = document.querySelector('#toggle-properties');
  const narrow = matchMedia('(max-width: 600px)');
  function setProperties(open) {
    workspace.classList.toggle('properties-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }
  toggle.addEventListener('click', () => setProperties(!workspace.classList.contains('properties-open')));
  document.querySelector('#close-properties').addEventListener('click', () => { setProperties(false); toggle.focus(); });
  document.addEventListener('motionlab:properties', () => { if (narrow.matches) setProperties(true); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !narrow.matches || !workspace.classList.contains('properties-open') || document.querySelector('dialog[open]') || document.querySelector('.is-dragging')) return;
    // Let an input cancel its own edit before closing the drawer.
    if (event.target.matches('input,textarea,select')) return;
    event.preventDefault(); event.stopImmediatePropagation(); setProperties(false); toggle.focus();
  }, true);
  const toolbar = document.querySelector('.toolbar');
  new ResizeObserver(() => document.documentElement.style.setProperty('--toolbar-height', `${toolbar.getBoundingClientRect().height}px`)).observe(toolbar);
  for (const side of ['left', 'right']) {
    const handle = document.querySelector(`#resize-${side}`);
    let width = side === 'left' ? 240 : 280;
    const minimum = side === 'left' ? 180 : 230;
    const maximum = side === 'left' ? 340 : 380;
    function resize(value) {
      const other = parseFloat(getComputedStyle(workspace).getPropertyValue(`--${side === 'left' ? 'right' : 'left'}-panel-width`)) || (side === 'left' ? 280 : 240);
      width = Math.max(minimum, Math.min(maximum, workspace.clientWidth - other - 320, value));
      workspace.style.setProperty(`--${side}-panel-width`, `${width}px`);
      handle.setAttribute('aria-valuenow', String(Math.round(width)));
    }
    handle.setAttribute('aria-valuemin', String(minimum)); handle.setAttribute('aria-valuemax', String(maximum)); resize(width);
    let drag;
    handle.addEventListener('pointerdown', event => { if (event.button !== 0) return; event.preventDefault(); drag = { x: event.clientX, width }; handle.setPointerCapture(event.pointerId); });
    handle.addEventListener('pointermove', event => { if (drag) resize(drag.width + (event.clientX - drag.x) * (side === 'left' ? 1 : -1)); });
    handle.addEventListener('pointerup', () => { drag = null; });
    handle.addEventListener('lostpointercapture', () => { drag = null; });
    handle.addEventListener('dblclick', () => resize(side === 'left' ? 240 : 280));
    handle.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      resize(event.key === 'Home' ? minimum : event.key === 'End' ? maximum : width + (event.key === 'ArrowRight' ? 1 : -1) * (side === 'left' ? 1 : -1) * (event.shiftKey ? 50 : 10));
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 850) resize(width); });
  }
}
