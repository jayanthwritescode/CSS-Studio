import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from '../js/elements/model.js';
import { PRESETS, buildPreset } from '../js/animation/presets.js';
import { validFrames } from '../js/animation/keyframes.js';
import { evaluateElement } from '../js/animation/interpolation.js';
import { createStore, selectedElement } from '../js/state/store.js';
import { elementStyles } from '../js/elements/styles.js';
import { parseEasing, easingFunction } from '../js/animation/easing.js';
import { graphRange, toGraph, fromGraph } from '../js/animation/easing-geometry.js';

const options = { duration: 1000, delay: 0, easing: 'linear' };
const element = type => createElement(type, { width: 1280, height: 720 });

test('all 24 named presets generate valid, changing, editable tracks', () => {
  assert.equal(PRESETS.length, 24);
  assert.equal(new Set(PRESETS.map(p => p.id)).size, 24);
  for (const preset of PRESETS) {
    const item = element(preset.types?.[0] ?? 'rectangle');
    const result = buildPreset(item, preset.id, options, 3000);
    assert.ok(result, preset.id);
    for (const track of result.elements) {
      assert.ok(validFrames(track.keyframes, result.duration), preset.id);
      assert.equal(track.keyframes[0].time, 0);
      assert.equal(track.keyframes.at(-1).time, 1000);
      const poses = track.keyframes.map(frame => JSON.stringify(evaluateElement(track, frame.time, result.duration)));
      assert.ok(new Set(poses).size > 1, `${preset.id} must change the actual pose`);
    }
    assert.equal(item.keyframes.length, 0, 'generator does not mutate the source');
  }
});

test('delay holds the preset starting pose and extends composition when necessary', () => {
  const result = buildPreset(element('rectangle'), 'fade-in', { ...options, delay: 2500 }, 3000);
  assert.equal(result.duration, 3500);
  const track = result.elements[0];
  assert.equal(evaluateElement(track, 0, 3500).opacity, 0);
  assert.equal(evaluateElement(track, 2000, 3500).opacity, 0);
  assert.equal(evaluateElement(track, 3000, 3500).opacity, 0.5);
  assert.equal(evaluateElement(track, 3500, 3500).opacity, 1);
});

test('bouncing dots create three independent staggered circle tracks', () => {
  const source = element('circle');
  const result = buildPreset(source, 'bouncing-dots', options, 3000);
  assert.equal(result.elements.length, 3);
  assert.equal(new Set(result.elements.map(e => e.id)).size, 3);
  assert.equal(result.elements[0].id, source.id);
  assert.ok(result.elements.every(e => e.styles.width === 32 && e.styles.height === 32));
  assert.notDeepEqual(result.elements[0].keyframes.map(f => f.time), result.elements[1].keyframes.map(f => f.time));
  const ids = result.elements.flatMap(e => e.keyframes.map(f => f.id));
  assert.equal(new Set(ids).size, ids.length);
});

test('typewriter reveals text in actual discrete steps', () => {
  const source = element('text'); source.content = 'Motion';
  const result = buildPreset(source, 'typewriter', options, 1000);
  const track = result.elements[0];
  assert.equal(track.keyframes[0].easing, 'steps(6, end)');
  assert.equal(evaluateElement(track, 100, 1000).reveal, 0);
  assert.equal(evaluateElement(track, 500, 1000).reveal, 0.5);
  assert.equal(evaluateElement(track, 1000, 1000).reveal, 1);
  assert.equal(parseEasing('steps(6, end)').count, 6);
  assert.equal(easingFunction('steps(4, end)')(0.49), 0.25);
  assert.equal(easingFunction('steps(4, end)')(1), 1);
  assert.equal(parseEasing('steps(0, end)'), null);
  assert.equal(parseEasing('steps(1001, end)'), null);
});

test('3D flip, shimmer and glow render real CSS effects', () => {
  const flip = buildPreset(element('rectangle'), 'flip', options, 1000).elements[0];
  assert.equal(evaluateElement(flip, 500, 1000).rotationY, 180);
  assert.match(elementStyles(evaluateElement(flip, 500, 1000), 'rectangle').transform, /perspective\(800px\) rotateY\(180deg\)/);
  const shimmer = buildPreset(element('rectangle'), 'skeleton-shimmer', options, 1000).elements[0];
  const start = elementStyles(evaluateElement(shimmer, 0, 1000), 'rectangle');
  const end = elementStyles(evaluateElement(shimmer, 1000, 1000), 'rectangle');
  assert.match(start.backgroundImage, /linear-gradient/);
  assert.notEqual(start.backgroundPosition, end.backgroundPosition);
  const glow = buildPreset(element('text'), 'neon-glow', options, 1000).elements[0];
  assert.match(elementStyles(evaluateElement(glow, 500, 1000), 'text').filter, /drop-shadow\(0 0 18px/);
});

test('preset application affects its target while preserving other tracks', () => {
  const store = createStore();
  const first = element('rectangle'), second = element('text');
  store.dispatch({ type: 'element/add', element: first });
  store.dispatch({ type: 'element/add', element: second });
  const before = store.getState().project.elements[1];
  store.dispatch({ type: 'preset/apply', id: first.id, presetId: 'slide-in', options });
  assert.equal(store.getState().project.elements[1], before);
  assert.equal(store.getState().selection, first.id);
  assert.equal(store.getState().timeline.mode, 'keyframe');
  const key = selectedElement(store.getState()).keyframes.at(-1);
  store.dispatch({ type: 'keyframe/update', id: first.id, keyframeId: key.id, properties: { x: 900 } });
  assert.equal(selectedElement(store.getState()).keyframes.at(-1).properties.x, 900);
  assert.doesNotThrow(() => JSON.stringify(store.getState().project));
});

test('incompatible, locked and invalid preset requests are harmless', () => {
  const rect = element('rectangle');
  for (const [id, config] of [
    ['typewriter', options], ['missing', options], ['pulse', { ...options, duration: 0 }],
    ['pulse', { ...options, delay: -1 }], ['pulse', { ...options, easing: 'invalid' }],
  ]) assert.equal(buildPreset(rect, id, config, 3000), null);
  assert.equal(buildPreset({ ...rect, locked: true }, 'pulse', options, 3000), null);
});

test('all presets remain valid at minimum duration and scale limits', () => {
  for (const preset of PRESETS) {
    const item = element(preset.types?.[0] ?? 'rectangle');
    item.styles.scaleX = 0.05; item.styles.scaleY = 10;
    const result = buildPreset(item, preset.id, { ...options, duration: 100, delay: 1 }, 3000);
    assert.ok(result, preset.id);
    assert.ok(result.elements.every(e => validFrames(e.keyframes, result.duration)), preset.id);
  }
});

test('graph coordinate mapping round trips, constrains X, and supports overshoot', () => {
  const points = [0.25, -0.5, 0.75, 1.5], range = graphRange(points);
  for (const [x, y] of [[0, 0], [1, 1], [0.25, -0.5], [0.75, 1.5]]) {
    const screen = toGraph(x, y, range);
    assert.deepEqual(fromGraph(screen.x, screen.y, range), [x, y]);
  }
  const bounded = fromGraph(-1000, -10000, range);
  assert.equal(bounded[0], 0); assert.equal(bounded[1], 10);
});

test('spinner is visible on a circle and switching effects clears effect flags', () => {
  const source = element('circle');
  const spinner = buildPreset(source, 'spinner', options, 3000).elements[0];
  assert.equal(spinner.styles.spinnerEnabled, true);
  assert.equal(spinner.styles.backgroundTransparent, true);
  assert.equal(elementStyles(spinner.styles, 'circle').borderTopColor, 'transparent');
  assert.equal(spinner.styles.borderWidth, 6);
  const glow = buildPreset(spinner, 'neon-glow', options, 3000).elements[0];
  assert.equal(glow.styles.spinnerEnabled, false);
  assert.equal(glow.styles.shimmerEnabled, false);
});

test('generated dot groups respect model coordinate bounds', () => {
  const source = element('circle');
  source.styles.x = 100000; source.styles.y = 100000; source.styles.width = 10000; source.styles.height = 10000;
  const result = buildPreset(source, 'bouncing-dots', options, 3000);
  assert.ok(result.elements.every(item => item.styles.x <= 100000 && item.styles.y <= 100000));
});
