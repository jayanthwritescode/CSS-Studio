import { selectedElement } from '../state/store.js';
import { parseEasing, easingFunction } from '../animation/easing.js';
import { PLOT, graphRange, toGraph, fromGraph } from '../animation/easing-geometry.js';

export function mountEasingEditor(store, playback) {
  const root = document.querySelector('#bezier-editor');
  const graph = document.querySelector('#bezier-graph');
  const fields = [...root.querySelectorAll('[data-bezier-coordinate]')];
  const handles = [...root.querySelectorAll('[data-bezier-point]')];
  const dot = document.querySelector('#easing-preview-dot');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let gesture = null, preview = null, lastPreview = '', currentRange = { min: -0.25, max: 1.25 };
  const selection = () => {
    const state = store.getState(), element = selectedElement(state);
    const frame = element?.keyframes.find(frame => frame.id === state.timeline.keyframeId);
    return { state, element, frame, parsed: parseEasing(frame?.easing) };
  };
  const pathPoint = point => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  function previewCurve(value, explicit = false) {
    preview?.cancel(); preview = null;
    const width = Math.max(0, document.querySelector('#easing-preview-track').clientWidth - 12);
    if (motion.matches && !explicit) {
      dot.style.transform = `translateX(${width * easingFunction(value)(0.5)}px)`;
      return;
    }
    dot.style.transform = '';
    if (typeof dot.animate === 'function') preview = dot.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${width}px)` }], { duration: 1100, easing: value, fill: 'both' });
  }
  function render() {
    const { element, frame, parsed } = selection();
    if (!frame || !parsed) { preview?.cancel(); preview = null; lastPreview = ''; return; }
    const steps = parsed.kind === 'steps';
    const points = parsed.points ?? [0, 0, 1, 1];
    currentRange = gesture?.range ?? graphRange(points);
    const start = toGraph(0, 0, currentRange), end = toGraph(1, 1, currentRange);
    let grid = '';
    for (let i = 0; i <= 4; i++) {
      const x = PLOT.left + i / 4 * (PLOT.right - PLOT.left), y = PLOT.top + i / 4 * (PLOT.bottom - PLOT.top);
      grid += `M ${x} ${PLOT.top} V ${PLOT.bottom} M ${PLOT.left} ${y} H ${PLOT.right} `;
    }
    document.querySelector('#bezier-grid').setAttribute('d', grid);
    document.querySelector('#bezier-reference').setAttribute('d', `M ${pathPoint(start)} L ${pathPoint(end)}`);
    if (steps) {
      let path = `M ${pathPoint(start)}`;
      for (let i = 1; i <= parsed.count; i++) {
        path += ` L ${pathPoint(toGraph(i / parsed.count, (i - 1) / parsed.count, currentRange))} L ${pathPoint(toGraph(i / parsed.count, i / parsed.count, currentRange))}`;
      }
      document.querySelector('#bezier-curve').setAttribute('d', path);
      document.querySelector('#bezier-connectors').setAttribute('d', '');
    } else {
      const first = toGraph(points[0], points[1], currentRange), second = toGraph(points[2], points[3], currentRange);
      document.querySelector('#bezier-curve').setAttribute('d', `M ${pathPoint(start)} C ${pathPoint(first)}, ${pathPoint(second)}, ${pathPoint(end)}`);
      document.querySelector('#bezier-connectors').setAttribute('d', `M ${pathPoint(start)} L ${pathPoint(first)} M ${pathPoint(end)} L ${pathPoint(second)}`);
      [first, second].forEach((point, index) => {
        handles[index].style.left = `${point.x / PLOT.width * 100}%`;
        handles[index].style.top = `${point.y / PLOT.height * 100}%`;
        handles[index].setAttribute('aria-label', `${index ? 'Second' : 'First'} easing control point, x ${points[index * 2]}, y ${points[index * 2 + 1]}`);
      });
    }
    handles.forEach(handle => { handle.hidden = steps; handle.disabled = element.locked; });
    fields.forEach((field, index) => {
      field.disabled = element.locked || steps;
      if (document.activeElement !== field) field.value = points[index];
    });
    document.querySelector('#bezier-tip').textContent = steps ? 'Stepped easing. Choose a cubic curve to use control points.' : 'Drag points or use arrow keys. Shift changes coordinates by 0.1.';
    document.querySelector('#bezier-value').textContent = frame.easing;
    const nextPreview = `${frame.id}:${frame.easing}`;
    if (nextPreview !== lastPreview) { lastPreview = nextPreview; previewCurve(frame.easing); }
  }
  function apply(points) {
    const { element, frame } = selection();
    if (!frame || element.locked) return;
    store.dispatch({ type: 'keyframe/update', id: element.id, keyframeId: frame.id, easing: `cubic-bezier(${points.map(value => Math.round(value * 1000) / 1000).join(', ')})` });
  }
  graph.addEventListener('pointerdown', event => {
    const handle = event.target.closest('[data-bezier-point]');
    const { element, frame, parsed } = selection();
    if (!handle || event.button !== 0 || !frame || element.locked || !parsed.points) return;
    event.preventDefault();
    playback.pause();
    gesture = { pointer: event.pointerId, point: Number(handle.dataset.bezierPoint), range: currentRange, original: frame.easing, id: element.id, frameId: frame.id };
    graph.setPointerCapture(event.pointerId);
    handle.focus({ preventScroll: true });
  });
  graph.addEventListener('pointermove', event => {
    if (!gesture || gesture.pointer !== event.pointerId) return;
    const { parsed, frame } = selection();
    if (frame?.id !== gesture.frameId || !parsed?.points) { finish(true); return; }
    const bounds = graph.getBoundingClientRect();
    const next = fromGraph((event.clientX - bounds.left) / bounds.width * PLOT.width, (event.clientY - bounds.top) / bounds.height * PLOT.height, gesture.range);
    const points = [...parsed.points];
    points.splice(gesture.point * 2, 2, ...next);
    apply(points);
  });
  function finish(cancel = false) {
    if (!gesture) return;
    const previous = gesture; gesture = null;
    if (cancel) store.dispatch({ type: 'keyframe/update', id: previous.id, keyframeId: previous.frameId, easing: previous.original });
    if (graph.hasPointerCapture(previous.pointer)) graph.releasePointerCapture(previous.pointer);
    render();
  }
  graph.addEventListener('pointerup', event => { if (gesture?.pointer === event.pointerId) finish(); });
  graph.addEventListener('pointercancel', () => finish(true));
  graph.addEventListener('lostpointercapture', () => finish(true));
  window.addEventListener('blur', () => finish(true));
  graph.addEventListener('keydown', event => {
    if (event.key === 'Escape' && gesture) { event.preventDefault(); event.stopPropagation(); finish(true); return; }
    const handle = event.target.closest('[data-bezier-point]');
    const { parsed } = selection();
    if (!handle || !parsed?.points) return;
    const deltas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
    if (!deltas[event.key]) return;
    event.preventDefault(); event.stopPropagation();
    const index = Number(handle.dataset.bezierPoint) * 2, step = event.shiftKey ? 0.1 : 0.01;
    const points = [...parsed.points], delta = deltas[event.key];
    points[index] = Math.min(1, Math.max(0, points[index] + delta[0] * step));
    points[index + 1] = Math.min(10, Math.max(-10, points[index + 1] + delta[1] * step));
    apply(points);
  });
  for (const [index, field] of fields.entries()) {
    field.addEventListener('input', () => {
      const { parsed } = selection();
      if (!parsed?.points || !field.validity.valid) return;
      const points = [...parsed.points]; points[index] = field.valueAsNumber;
      apply(points);
    });
    field.addEventListener('blur', render);
  }
  document.querySelector('#replay-easing').addEventListener('click', () => {
    const { frame } = selection();
    if (frame) previewCurve(frame.easing, true);
  });
  motion.addEventListener('change', () => { lastPreview = ''; render(); });
  store.subscribe(render);
  render();
}
