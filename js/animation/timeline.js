import { selectedElement } from '../state/store.js';

export const formatTime = milliseconds => {
  const value = Math.max(0, Math.round(milliseconds));
  return `${String(Math.floor(value / 60000)).padStart(2, '0')}:${String(Math.floor(value / 1000) % 60).padStart(2, '0')}.${String(value % 1000).padStart(3, '0')}`;
};

export function mountTimeline(store, playback, notify) {
  const root = document.querySelector('#timeline');
  const scroll = document.querySelector('#timeline-scroll');
  const content = document.querySelector('#timeline-content');
  const rowsContainer = document.querySelector('#timeline-rows');
  const ruler = document.querySelector('#timeline-ruler .time-lane');
  const playhead = document.querySelector('#playhead');
  const time = document.querySelector('#timeline-seek');
  const duration = document.querySelector('#timeline-duration');
  const mode = document.querySelector('#animate-mode');
  const play = document.querySelector('#play');
  const rows = new Map();
  let trackWidth = 240, rulerKey = '', previousElements = null, gesture = null;

  function keyTimes(state) {
    const element = selectedElement(state);
    const elements = element ? [element] : state.project.elements;
    return [...new Set(elements.flatMap(item => item.keyframes.map(frame => frame.time)))].sort((a, b) => a - b);
  }
  const xForTime = (timestamp, length) => 16 + timestamp / length * (trackWidth - 32);
  function renderClock(state) {
    const { timeline, project } = state;
    playhead.style.left = `${120 + xForTime(timeline.time, project.duration)}px`;
    playhead.setAttribute('aria-valuemax', project.duration);
    playhead.setAttribute('aria-valuenow', Math.round(timeline.time));
    playhead.setAttribute('aria-valuetext', formatTime(timeline.time));
    document.querySelector('#time-display').value = formatTime(timeline.time);
    if (document.activeElement !== time) time.value = Math.round(timeline.time);
    const times = keyTimes(state);
    document.querySelector('#previous-keyframe').disabled = !times.some(value => value < timeline.time - 0.5);
    document.querySelector('#next-keyframe').disabled = !times.some(value => value > timeline.time + 0.5);
  }
  function render(state, action) {
    if (action?.type === 'timeline/tick' && state.timeline.playing) { renderClock(state); return; }
    const { timeline, project } = state;
    trackWidth = Math.max(240, scroll.clientWidth - 120) * timeline.zoom;
    content.style.width = `${120 + trackWidth}px`;
    ruler.style.width = `${trackWidth}px`;
    const nextRulerKey = `${trackWidth}:${project.duration}`;
    if (nextRulerKey !== rulerKey) {
      rulerKey = nextRulerKey;
      ruler.replaceChildren();
      const count = Math.max(2, Math.min(16, Math.floor(trackWidth / 70)));
      for (let index = 0; index <= count; index++) {
        const tick = document.createElement('span');
        tick.className = 'ruler-tick';
        tick.style.left = `${xForTime(project.duration * index / count, project.duration)}px`;
        tick.textContent = `${Number((project.duration * index / count / 1000).toFixed(3))}s`;
        ruler.append(tick);
      }
    }
    const structureChanged = previousElements !== project.elements;
    const ids = new Set(project.elements.map(element => element.id));
    if (structureChanged) for (const [id, record] of rows) if (!ids.has(id)) { record.row.remove(); rows.delete(id); }
    [...project.elements].reverse().forEach((element, index) => {
      let record = rows.get(element.id);
      if (!record) {
        const row = document.createElement('div');
        row.className = 'timeline-row';
        row.dataset.trackId = element.id;
        row.innerHTML = '<button type="button" class="track-name"><span></span><small></small></button><div class="time-lane"></div>';
        record = { row, lane: row.querySelector('.time-lane'), label: row.querySelector('.track-name'), markers: new Map() };
        rows.set(element.id, record);
      }
      if (structureChanged && rowsContainer.children[index] !== record.row) rowsContainer.insertBefore(record.row, rowsContainer.children[index] ?? null);
      record.row.classList.toggle('selected', element.id === state.selection);
      record.row.classList.toggle('hidden-track', !element.visible);
      record.row.classList.toggle('locked-track', element.locked);
      record.label.setAttribute('aria-label', `Select animation track ${element.name}`);
      record.label.setAttribute('aria-pressed', String(element.id === state.selection));
      const title = record.label.querySelector('span');
      if (title.textContent !== element.name) title.textContent = element.name;
      record.label.querySelector('small').textContent = element.keyframes.length;
      record.lane.style.width = `${trackWidth}px`;
      if (structureChanged) {
        const frameIds = new Set(element.keyframes.map(frame => frame.id));
        for (const [id, marker] of record.markers) if (!frameIds.has(id)) { marker.remove(); record.markers.delete(id); }
      }
      for (const frame of element.keyframes) {
        let marker = record.markers.get(frame.id);
        if (!marker) {
          marker = document.createElement('button');
          marker.className = 'keyframe-marker';
          marker.dataset.keyframeId = frame.id;
          record.lane.append(marker);
          record.markers.set(frame.id, marker);
        }
        marker.style.left = `${xForTime(frame.time, project.duration)}px`;
        marker.classList.toggle('active', frame.id === timeline.keyframeId && state.selection === element.id);
        marker.setAttribute('aria-label', `${element.name} keyframe at ${frame.time} milliseconds`);
        marker.setAttribute('aria-pressed', String(frame.id === timeline.keyframeId && state.selection === element.id));
        marker.title = `${frame.time} ms · ${frame.easing}${element.locked ? ' · Locked' : ''}`;
      }
    });
    previousElements = project.elements;
    renderClock(state);
    time.max = project.duration;
    if (document.activeElement !== duration) duration.value = project.duration / 1000;
    play.setAttribute('aria-label', timeline.playing ? 'Pause animation' : 'Play animation');
    play.innerHTML = timeline.playing ? 'Ⅱ <span>Pause</span>' : '▶ <span>Play</span>';
    for (const id of ['play', 'restart', 'stop', 'reverse']) document.getElementById(id).disabled = project.elements.length === 0;
    document.querySelector('#reverse').setAttribute('aria-pressed', String(timeline.rate < 0));
    document.querySelector('#loop').checked = timeline.loop;
    document.querySelector('#playback-speed').value = Math.abs(timeline.rate);
    document.querySelector('#timeline-zoom').value = timeline.zoom;
    mode.setAttribute('aria-pressed', String(timeline.mode === 'keyframe'));
    const selected = selectedElement(state);
    document.querySelector('#add-keyframe').disabled = !selected || selected.locked;
    document.querySelector('#timeline-empty').hidden = project.elements.length > 0;
    const status = document.querySelector('#timeline-status');
    const message = timeline.mode === 'base' ? 'Base mode · edit the starting design.' : timeline.playing ? 'Playing · pause to edit.' : 'Animate mode · transform, opacity, size and color edits are keyed.';
    if (status.textContent !== message) status.textContent = message;
  }

  document.querySelector('#play').addEventListener('click', playback.toggle);
  document.querySelector('#stop').addEventListener('click', playback.stop);
  document.querySelector('#restart').addEventListener('click', playback.restart);
  document.querySelector('#reverse').addEventListener('click', playback.reverse);
  document.querySelector('#loop').addEventListener('change', event => store.dispatch({ type: 'timeline/loop', loop: event.target.checked }));
  document.querySelector('#playback-speed').addEventListener('change', event => store.dispatch({ type: 'timeline/rate', rate: Math.sign(store.getState().timeline.rate) * Number(event.target.value) }));
  mode.addEventListener('click', () => store.dispatch({ type: 'timeline/mode', mode: store.getState().timeline.mode === 'base' ? 'keyframe' : 'base' }));
  const addKeyframe = () => {
    playback.pause();
    if (store.getState().selection) store.dispatch({ type: 'keyframe/add', id: store.getState().selection });
  };
  document.querySelector('#add-keyframe').addEventListener('click', addKeyframe);
  time.addEventListener('focus', playback.pause);
  duration.addEventListener('focus', playback.pause);
  time.addEventListener('input', () => { if (time.validity.valid) playback.seek(time.valueAsNumber); });
  time.addEventListener('blur', () => { time.value = Math.round(store.getState().timeline.time); });
  function commitDuration() {
    const nextDuration = Math.round(duration.valueAsNumber * 1000);
    if (duration.validity.valid && Number.isFinite(nextDuration)) {
      playback.pause();
      store.dispatch({ type: 'project/duration', duration: nextDuration });
    } else notify('Set a duration from 0.001 to 120 seconds.');
    duration.value = store.getState().project.duration / 1000;
  }
  duration.addEventListener('blur', commitDuration);
  duration.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); commitDuration(); duration.blur(); } });
  document.querySelector('#timeline-zoom').addEventListener('input', event => store.dispatch({ type: 'timeline/zoom', zoom: event.target.valueAsNumber }));
  for (const [id, direction] of [['previous-keyframe', -1], ['next-keyframe', 1]]) {
    document.getElementById(id).addEventListener('click', () => {
      const state = store.getState(), times = keyTimes(state);
      const next = direction < 0 ? times.filter(t => t < state.timeline.time - 0.5).at(-1) : times.find(t => t > state.timeline.time + 0.5);
      if (next !== undefined) playback.seek(next);
    });
  }

  scroll.addEventListener('click', event => {
    const row = event.target.closest('[data-track-id]');
    if (event.target.closest('.track-name') && row) store.dispatch({ type: 'selection/set', id: row.dataset.trackId });
    const marker = event.target.closest('[data-keyframe-id]');
    if (marker && row) store.dispatch({ type: 'keyframe/select', id: row.dataset.trackId, keyframeId: marker.dataset.keyframeId });
  });
  function pointerTime(event, lane) {
    const left = lane.getBoundingClientRect().left;
    let value = Math.round((event.clientX - left - 16) / (trackWidth - 32) * store.getState().project.duration);
    if (event.shiftKey) value = Math.round(value / 100) * 100;
    return Math.min(store.getState().project.duration, Math.max(0, value));
  }
  scroll.addEventListener('pointerdown', event => {
    if (event.button !== 0 || gesture || event.target.closest('.track-name')) return;
    const marker = event.target.closest('[data-keyframe-id]');
    const row = event.target.closest('[data-track-id]');
    const lane = event.target.closest('.time-lane') ?? (event.target.closest('#playhead') ? ruler : null);
    if (!lane) return;
    const state = store.getState();
    playback.pause();
    if (marker && row) {
      const element = state.project.elements.find(item => item.id === row.dataset.trackId);
      const keyframeId = marker.dataset.keyframeId;
      store.dispatch({ type: 'keyframe/select', id: element.id, keyframeId });
      if (element.locked) return;
      gesture = { pointer: event.pointerId, id: element.id, keyframeId, element, lane, before: state.timeline, startX: event.clientX, moved: false };
    } else {
      if (row) store.dispatch({ type: 'selection/set', id: row.dataset.trackId });
      gesture = { pointer: event.pointerId, lane, before: state.timeline };
      playback.seek(pointerTime(event, lane));
    }
    event.preventDefault();
    scroll.setPointerCapture(event.pointerId);
    playhead.focus({ preventScroll: true });
  });
  scroll.addEventListener('pointermove', event => {
    if (!gesture || gesture.pointer !== event.pointerId) return;
    if (gesture.keyframeId) {
      if (!gesture.moved && Math.abs(event.clientX - gesture.startX) < 3) return;
      gesture.moved = true;
      store.dispatch({ type: 'keyframe/move', id: gesture.id, keyframeId: gesture.keyframeId, time: pointerTime(event, gesture.lane) });
    } else playback.seek(pointerTime(event, gesture.lane));
  });
  function finish(cancel = false) {
    if (!gesture) return;
    const previous = gesture;
    gesture = null;
    if (cancel) {
      if (previous.id) store.dispatch({ type: 'element/restore-gesture', id: previous.id, styles: previous.element.styles, keyframes: previous.element.keyframes, keyframeId: previous.before.keyframeId });
      playback.seek(previous.before.time);
      if (previous.before.mode === 'base') store.dispatch({ type: 'timeline/mode', mode: 'base' });
    }
    if (scroll.hasPointerCapture(previous.pointer)) scroll.releasePointerCapture(previous.pointer);
  }
  scroll.addEventListener('pointerup', event => { if (gesture?.pointer === event.pointerId) finish(); });
  scroll.addEventListener('pointercancel', () => finish(true));
  scroll.addEventListener('lostpointercapture', () => finish(true));
  window.addEventListener('blur', () => finish(true));
  root.addEventListener('keydown', event => {
    if (event.target.closest('input, select, textarea')) return;
    if (event.key === 'Escape') { finish(true); return; }
    const marker = event.target.closest('[data-keyframe-id]');
    const row = marker?.closest('[data-track-id]');
    const state = store.getState();
    if ((event.key === 'Delete' || event.key === 'Backspace') && state.timeline.keyframeId) {
      event.preventDefault();
      store.dispatch({ type: 'keyframe/delete', id: state.selection, keyframeId: state.timeline.keyframeId });
    }
    if (!event.target.closest('#playhead, [data-keyframe-id]')) return;
    const delta = event.shiftKey ? 100 : 10;
    let next;
    if (event.key === 'ArrowLeft') next = state.timeline.time - delta;
    if (event.key === 'ArrowRight') next = state.timeline.time + delta;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = state.project.duration;
    if (next === undefined) return;
    event.preventDefault();
    if (marker && row) store.dispatch({ type: 'keyframe/move', id: row.dataset.trackId, keyframeId: marker.dataset.keyframeId, time: next });
    else playback.seek(next);
  });
  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || document.querySelector('dialog[open]') || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('.is-dragging')) return;
    if (event.code === 'Space') { event.preventDefault(); if (store.getState().project.elements.length) playback.toggle(); }
    if (event.key.toLowerCase() === 'k') { event.preventDefault(); addKeyframe(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) playback.pause(); });
  const observer = new ResizeObserver(() => render(store.getState()));
  observer.observe(scroll);
  store.subscribe(render);
  render(store.getState());
}
