import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from '../js/elements/model.js';
import { createStore, selectedElement } from '../js/state/store.js';
import { evaluateElement, compileTracks, displayedStyles } from '../js/animation/interpolation.js';
import { easingFunction, parseEasing } from '../js/animation/easing.js';
import { advanceTime, createPlayback } from '../js/animation/engine.js';

const close = (actual, expected, tolerance = 1e-5) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const frame = (time, properties, easing = 'linear', id = `f-${time}`) => ({ id, time, properties, easing });
function animated(frames) {
  const element = createElement('rectangle', { width: 1280, height: 720 });
  element.keyframes = frames;
  return element;
}
function setup() {
  const store = createStore();
  const element = createElement('rectangle', store.getState().project.canvas);
  store.dispatch({ type: 'element/add', element });
  return { store, id: element.id };
}

test('independent sparse properties interpolate between their own keyframes', () => {
  const element = animated([
    frame(0, { x: 0, rotation: 0, opacity: 1, scaleX: 1 }),
    frame(1000, { opacity: 0.5 }),
    frame(3000, { x: 300, rotation: 360, opacity: 0, scaleX: 2 }),
  ]);
  const at = evaluateElement(element, 1500, 3000);
  close(at.x, 150); close(at.rotation, 180); close(at.opacity, 0.375); close(at.scaleX, 1.5);
  assert.equal(at.width, element.styles.width);
  assert.equal(compileTracks(element), compileTracks(element), 'tracks cached for immutable elements');
});

test('endpoints, out of range seeks, implicit base and trailing holds are deterministic', () => {
  const element = animated([frame(1000, { x: 100 }), frame(2000, { x: 200 })]);
  assert.equal(evaluateElement(element, -99, 3000).x, element.styles.x);
  close(evaluateElement(element, 500, 3000).x, (element.styles.x + 100) / 2);
  assert.equal(evaluateElement(element, 9000, 3000).x, 200);
  assert.equal(evaluateElement(element, NaN, 3000).x, element.styles.x);
  assert.equal(evaluateElement(element, 1000, 0).x, element.styles.x);
});

test('colors interpolate in sRGB and overshooting opacity stays within CSS bounds', () => {
  const element = animated([frame(0, { backgroundColor: '#000000', opacity: 0 }, 'cubic-bezier(0.2, 2, 0.8, 2)'), frame(1000, { backgroundColor: '#ffffff', opacity: 1 })]);
  const linear = animated([frame(0, { color: '#000000' }), frame(1000, { color: '#ffffff' })]);
  assert.equal(evaluateElement(linear, 500, 1000).color, '#808080');
  const result = evaluateElement(element, 700, 1000);
  assert.equal(result.opacity, 1);
  assert.equal(result.backgroundColor, '#ffffff');
});

test('unsorted and duplicate external timestamps do not produce division by zero', () => {
  const element = animated([frame(1000, { x: 200 }, 'linear', 'b'), frame(0, { x: 0 }), frame(1000, { x: 400 }, 'linear', 'c')]);
  assert.equal(evaluateElement(element, 1000, 1000).x, 400);
  close(evaluateElement(element, 500, 1000).x, 200);
});

test('standard CSS easing and custom curves solve time correctly', () => {
  close(easingFunction('linear')(0.2), 0.2);
  close(easingFunction('ease-in-out')(0.5), 0.5);
  assert.ok(easingFunction('ease-in')(0.5) < 0.5);
  assert.ok(easingFunction('ease-out')(0.5) > 0.5);
  assert.equal(easingFunction('ease')(0), 0);
  assert.equal(easingFunction('ease')(1), 1);
  close(easingFunction('cubic-bezier(0, 0, 1, 1)')(0.25), 0.25);
  for (const value of ['evil', 'cubic-bezier(-1, 0, 1, 1)', 'cubic-bezier(0, 0, 2, 1)', 'cubic-bezier(.., 0, 1, 1)', null]) assert.equal(parseEasing(value), null);
});

test('auto-key stores animated values separately and seeds the starting pose', () => {
  const { store, id } = setup();
  const original = selectedElement(store.getState()).styles.x;
  store.dispatch({ type: 'timeline/seek', time: 1500 });
  store.dispatch({ type: 'element/update', id, styles: { x: 800 } });
  const element = selectedElement(store.getState());
  assert.equal(element.styles.x, original);
  assert.equal(element.keyframes.length, 2);
  assert.equal(element.keyframes[0].time, 0);
  assert.equal(element.keyframes[1].properties.x, 800);
  close(evaluateElement(element, 750, 3000).x, (original + 800) / 2);
  store.dispatch({ type: 'timeline/mode', mode: 'base' });
  assert.equal(displayedStyles(element, store.getState()).x, original);
});

test('adding at an existing timestamp updates the frame without duplicates', () => {
  const { store, id } = setup();
  store.dispatch({ type: 'keyframe/add', id });
  const firstId = selectedElement(store.getState()).keyframes[0].id;
  store.dispatch({ type: 'keyframe/add', id });
  assert.equal(selectedElement(store.getState()).keyframes.length, 1);
  assert.equal(store.getState().timeline.keyframeId, firstId);
  store.dispatch({ type: 'element/update', id, styles: { x: 90 } });
  assert.equal(selectedElement(store.getState()).keyframes[0].properties.x, 90);
  assert.notEqual(selectedElement(store.getState()).styles.x, 90);
});

test('move, easing edit, delete, collisions and locked frames remain consistent', () => {
  const { store, id } = setup();
  store.dispatch({ type: 'keyframe/add', id });
  const startId = store.getState().timeline.keyframeId;
  store.dispatch({ type: 'timeline/seek', time: 3000 });
  store.dispatch({ type: 'keyframe/add', id });
  const endId = store.getState().timeline.keyframeId;
  let previous = store.getState();
  store.dispatch({ type: 'keyframe/move', id, keyframeId: endId, time: 0 });
  assert.equal(store.getState(), previous, 'collision rejected');
  store.dispatch({ type: 'keyframe/move', id, keyframeId: endId, time: 2000 });
  assert.equal(store.getState().timeline.time, 2000);
  store.dispatch({ type: 'keyframe/update', id, keyframeId: startId, easing: 'ease-in' });
  assert.equal(selectedElement(store.getState()).keyframes[0].easing, 'ease-in');
  store.dispatch({ type: 'element/lock', id });
  previous = store.getState();
  store.dispatch({ type: 'keyframe/delete', id, keyframeId: startId });
  assert.equal(store.getState(), previous);
  store.dispatch({ type: 'element/lock', id });
  store.dispatch({ type: 'keyframe/delete', id, keyframeId: endId });
  assert.equal(store.getState().timeline.keyframeId, null);
  assert.equal(selectedElement(store.getState()).keyframes.length, 1);
});

test('duration changes rescale tracks and playhead while rejecting invalid values', () => {
  const { store, id } = setup();
  store.dispatch({ type: 'keyframe/add', id });
  store.dispatch({ type: 'timeline/seek', time: 3000 });
  store.dispatch({ type: 'element/update', id, styles: { rotation: 180 } });
  store.dispatch({ type: 'project/duration', duration: 6000 });
  assert.equal(store.getState().timeline.time, 6000);
  assert.equal(selectedElement(store.getState()).keyframes.at(-1).time, 6000);
  const previous = store.getState();
  for (const duration of [0, -1, NaN, 120001, 0.5]) {
    store.dispatch({ type: 'project/duration', duration });
    assert.equal(store.getState(), previous);
  }
});

test('duration compression merges collisions and clears removed keyframe selections', () => {
  const { store, id } = setup();
  store.dispatch({ type: 'keyframe/add', id });
  for (const time of [1, 2, 3000]) { store.dispatch({ type: 'timeline/seek', time }); store.dispatch({ type: 'keyframe/add', id }); }
  const first = selectedElement(store.getState()).keyframes[0];
  store.dispatch({ type: 'keyframe/select', id, keyframeId: first.id });
  store.dispatch({ type: 'project/duration', duration: 1 });
  assert.deepEqual(selectedElement(store.getState()).keyframes.map(frame => frame.time), [0, 1]);
  assert.equal(store.getState().timeline.keyframeId, null);
});

test('multiple tracks evaluate independently and animated duplicates keep their offset', () => {
  const { store, id } = setup();
  store.dispatch({ type: 'keyframe/add', id });
  store.dispatch({ type: 'timeline/seek', time: 3000 });
  store.dispatch({ type: 'element/update', id, styles: { x: 900, rotation: 180 } });
  store.dispatch({ type: 'element/duplicate', id });
  const [original, copy] = store.getState().project.elements;
  assert.notEqual(original.keyframes[0].id, copy.keyframes[0].id);
  close(evaluateElement(copy, 1500, 3000).x - evaluateElement(original, 1500, 3000).x, 24);
  close(evaluateElement(copy, 1500, 3000).rotation, 90);
  store.dispatch({ type: 'element/delete', id: copy.id });
  assert.equal(store.getState().selection, null);
  assert.equal(store.getState().timeline.keyframeId, null);
});

test('gesture rollback restores keyframe data instead of leaving auto-key artifacts', () => {
  const { store, id } = setup();
  const element = selectedElement(store.getState());
  store.dispatch({ type: 'timeline/seek', time: 1500 });
  store.dispatch({ type: 'element/update', id, styles: { x: 700 } });
  assert.equal(selectedElement(store.getState()).keyframes.length, 2);
  store.dispatch({ type: 'element/restore-gesture', id, styles: element.styles, keyframes: element.keyframes });
  assert.equal(selectedElement(store.getState()).keyframes.length, 0);
});

function fakePlayback() {
  const { store, id } = setup();
  let clock = 0, sequence = 0;
  const queue = new Map();
  const playback = createPlayback(store, {
    now: () => clock,
    requestFrame(callback) { queue.set(++sequence, callback); return sequence; },
    cancelFrame(id) { queue.delete(id); },
  });
  return { store, id, playback, queue, step(ms) {
    clock += ms;
    const scheduled = [...queue.values()]; queue.clear();
    scheduled.forEach(callback => callback(clock));
  } };
}

test('playback owns one RAF and pause/resume excludes paused wall time', () => {
  const { store, playback, queue, step } = fakePlayback();
  playback.play(); playback.play();
  assert.equal(queue.size, 1);
  step(400); close(store.getState().timeline.time, 400);
  playback.pause(); assert.equal(queue.size, 0);
  step(2000);
  playback.play(); step(100);
  close(store.getState().timeline.time, 500);
  assert.equal(queue.size, 1);
  playback.destroy(); assert.equal(queue.size, 0);
});

test('seeking, reverse, loop boundaries and stop synchronize engine state', () => {
  const { store, playback, step, queue } = fakePlayback();
  store.dispatch({ type: 'timeline/loop', loop: false });
  playback.seek(2900); playback.play(); step(200);
  assert.equal(store.getState().timeline.time, 3000);
  assert.equal(store.getState().timeline.playing, false);
  assert.equal(queue.size, 0);
  playback.reverse(); playback.play(); step(500);
  assert.equal(store.getState().timeline.time, 2500);
  playback.seek(1000); assert.equal(queue.size, 0);
  playback.play(); step(100);
  assert.equal(store.getState().timeline.time, 900);
  playback.stop(); assert.equal(store.getState().timeline.time, 0);
  assert.deepEqual(advanceTime(2900, 200, 1, 3000, true), { time: 100, playing: true });
  assert.deepEqual(advanceTime(100, 200, -1, 3000, true), { time: 2900, playing: true });
  assert.deepEqual(advanceTime(0, 100, 1, 0, true), { time: 0, playing: false });
});

test('malformed or duplicate keyframe data cannot enter project state', () => {
  const store = createStore();
  for (const frames of [
    [frame(0, { x: NaN })],
    [frame(0, { unknown: 1 })],
    [frame(0, { x: 1 }, 'evil')],
    [frame(4000, { x: 1 })],
    [frame(0, { x: 1 }), frame(0, { x: 2 }, 'linear', 'other')],
    [frame(0, { x: 1 }, 'linear', 'same'), frame(1000, { x: 2 }, 'linear', 'same')],
  ]) {
    const element = animated(frames);
    const before = store.getState();
    store.dispatch({ type: 'element/add', element });
    assert.equal(store.getState(), before);
  }
});

test('deleting the final element stops the scheduler and clears selections', () => {
  const { store, id, playback, queue } = fakePlayback();
  store.dispatch({ type: 'keyframe/add', id });
  playback.play();
  assert.equal(queue.size, 1);
  store.dispatch({ type: 'element/delete', id });
  assert.equal(store.getState().timeline.playing, false);
  assert.equal(store.getState().timeline.keyframeId, null);
  assert.equal(queue.size, 0);
});

test('restart respects direction, speed changes reanchor, and base mode pauses playback', () => {
  const { store, playback, step, queue } = fakePlayback();
  playback.reverse(); playback.restart();
  assert.equal(store.getState().timeline.time, 3000);
  step(100); assert.equal(store.getState().timeline.time, 2900);
  store.dispatch({ type: 'timeline/rate', rate: -2 });
  step(100); assert.equal(store.getState().timeline.time, 2700);
  store.dispatch({ type: 'timeline/mode', mode: 'base' });
  assert.equal(store.getState().timeline.time, 0);
  assert.equal(store.getState().timeline.playing, false);
  assert.equal(queue.size, 0);
});

test('hidden elements preserve editable tracks and immutable poses stay reusable', () => {
  const { store, id } = setup();
  store.dispatch({ type: 'keyframe/add', id });
  store.dispatch({ type: 'timeline/seek', time: 3000 });
  store.dispatch({ type: 'element/update', id, styles: { x: 900 } });
  store.dispatch({ type: 'element/visibility', id });
  const element = selectedElement(store.getState());
  const first = evaluateElement(element, 1500, 3000);
  assert.equal(element.visible, false);
  assert.equal(evaluateElement(element, 1500, 3000), first);
  assert.throws(() => { first.x = 1; }, TypeError);
  assert.equal(element.keyframes.length, 2);
});
