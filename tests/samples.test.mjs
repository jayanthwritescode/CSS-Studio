import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SAMPLES, sampleTemplate, createSample } from '../js/samples/projects.js';
import { normalizeProject, serializeProject, parseProject } from '../js/storage/serialization.js';
import { evaluateElement } from '../js/animation/interpolation.js';
import { createStore } from '../js/state/store.js';

test('three bundled samples match validated, portable project files', async () => {
  assert.equal(SAMPLES.length, 3);
  for (const { id } of SAMPLES) {
    const project = sampleTemplate(id);
    assert.deepEqual(normalizeProject(project), project);
    assert.deepEqual(parseProject(serializeProject(project)), project);
    const bundled = JSON.parse(await readFile(new URL(`../assets/samples/${id}.motionlab.json`, import.meta.url), 'utf8'));
    assert.deepEqual(bundled, project);
    assert.ok(project.elements.length >= 6);
    assert.equal(new Set(project.elements.flatMap(element => [element.id, ...element.keyframes.map(frame => frame.id)])).size, project.elements.reduce((sum, element) => sum + 1 + element.keyframes.length, 0));
  }
});
test('opening samples creates independent documents without changing their template', () => {
  for (const { id } of SAMPLES) {
    const first = createSample(id), second = createSample(id);
    assert.notEqual(first.id, second.id);
    first.elements[0].name = 'Edited';
    assert.notEqual(second.elements[0].name, 'Edited');
    assert.notEqual(sampleTemplate(id).elements[0].name, 'Edited');
  }
  assert.throws(() => createSample('missing'));
});
test('sample tracks change visibly and remain within their compositions', () => {
  for (const { id } of SAMPLES) {
    const project = sampleTemplate(id);
    const animated = project.elements.filter(element => element.keyframes.length);
    assert.equal(animated.length, 3);
    for (const element of animated) {
      assert.ok(element.keyframes.every(frame => frame.time >= 0 && frame.time <= project.duration));
      const poses = [0, .25, .5, .75, 1].map(fraction => evaluateElement(element, project.duration * fraction, project.duration));
      assert.ok(poses.some(pose => JSON.stringify(pose) !== JSON.stringify(poses[0])));
    }
  }
});
test('grid snapping is view state and does not dirty or undo project data', () => {
  const store = createStore(); const project = store.getState().project;
  assert.equal(store.getState().view.snap, false);
  store.dispatch({ type: 'view/snap', enabled: true });
  assert.equal(store.getState().view.snap, true);
  assert.equal(store.getState().project, project);
  assert.equal(store.getHistory().canUndo, false);
});
