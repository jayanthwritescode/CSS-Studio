import { selectedElement } from '../state/store.js';
import { EASINGS, parseEasing } from '../animation/easing.js';

export function mountKeyframeProperties(store, playback, notify) {
  const form = document.querySelector('#keyframe-settings');
  const time = document.querySelector('#keyframe-time');
  const easing = document.querySelector('#keyframe-easing');
  const preset = document.querySelector('#easing-preset');
  const error = document.querySelector('#easing-error');
  let previousId = null;
  function selection() {
    const state = store.getState();
    const element = selectedElement(state);
    return { state, element, frame: element?.keyframes.find(frame => frame.id === state.timeline.keyframeId) };
  }
  function render() {
    const { state, element, frame } = selection();
    form.hidden = !frame;
    if (!frame) { previousId = null; return; }
    const changed = previousId !== frame.id;
    if (changed) { error.hidden = true; easing.setAttribute('aria-invalid', 'false'); }
    previousId = frame.id;
    time.max = state.project.duration;
    document.querySelector('#keyframe-fields').disabled = element.locked;
    if (changed || document.activeElement !== time) time.value = frame.time;
    if (changed || document.activeElement !== easing) easing.value = frame.easing;
    preset.value = EASINGS.includes(frame.easing) ? frame.easing : 'custom';
  }
  function commitTime() {
    const { state, element, frame } = selection();
    if (!frame) return;
    if (!time.validity.valid || !Number.isInteger(time.valueAsNumber)) {
      notify(`Set a keyframe time from 0 to ${state.project.duration} ms.`);
    } else if (element.keyframes.some(item => item.id !== frame.id && item.time === time.valueAsNumber)) {
      notify('A keyframe already exists at this time. Choose another millisecond.');
    } else store.dispatch({ type: 'keyframe/move', id: element.id, keyframeId: frame.id, time: time.valueAsNumber });
    time.value = selection().frame?.time ?? '';
  }
  function commitEasing() {
    const { element, frame } = selection();
    if (!frame) return;
    const parsed = parseEasing(easing.value);
    error.hidden = Boolean(parsed);
    easing.setAttribute('aria-invalid', String(!parsed));
    if (parsed) {
      store.dispatch({ type: 'keyframe/update', id: element.id, keyframeId: frame.id, easing: parsed.value });
      easing.value = parsed.value;
    }
  }
  time.addEventListener('blur', commitTime);
  time.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); commitTime(); time.blur(); } });
  easing.addEventListener('blur', commitEasing);
  easing.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); commitEasing(); easing.blur(); }
    if (event.key === 'Escape') { easing.value = selection().frame?.easing ?? ''; error.hidden = true; easing.blur(); }
  });
  preset.addEventListener('change', () => {
    const { element, frame } = selection();
    if (!frame) return;
    const value = preset.value === 'custom' ? 'cubic-bezier(0.42, 0, 0.58, 1)' : preset.value;
    store.dispatch({ type: 'keyframe/update', id: element.id, keyframeId: frame.id, easing: value });
    error.hidden = true;
    easing.setAttribute('aria-invalid', 'false');
  });
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('focusin', playback.pause);
  document.querySelector('#delete-keyframe').addEventListener('click', () => {
    const { element, frame } = selection();
    if (frame) store.dispatch({ type: 'keyframe/delete', id: element.id, keyframeId: frame.id });
  });
  store.subscribe(render);
  render();
}
