import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, createStore } from '../js/state/store.js';

test('project edits preserve view state and remain serializable', () => {
  const store = createStore();
  const view = store.getState().view;
  store.dispatch({ type: 'project/rename', name: '  Orbit study  ' });
  store.dispatch({ type: 'canvas/resize', width: 1080, height: 1920 });
  store.dispatch({ type: 'canvas/background', color: '#FFaa33' });
  const { project } = store.getState();
  assert.equal(project.name, 'Orbit study');
  assert.deepEqual(project.canvas, { width: 1080, height: 1920, background: '#ffaa33' });
  assert.equal(store.getState().view, view);
  assert.deepEqual(JSON.parse(JSON.stringify(project)), project);
  assert.throws(() => { project.canvas.width = 42; }, TypeError);
});

test('invalid canvas input cannot corrupt project state', () => {
  const store = createStore();
  const original = store.getState();
  for (const value of [0, -1, 63, 4097, Infinity, NaN, 20.5, '720']) {
    store.dispatch({ type: 'canvas/resize', width: value, height: 720 });
    assert.equal(store.getState(), original);
  }
  for (const color of ['red', '#fff', 'url(evil)', '', null]) {
    store.dispatch({ type: 'canvas/background', color });
    assert.equal(store.getState(), original);
  }
});

test('zoom is bounded and manual zoom leaves fit mode', () => {
  const store = createStore();
  store.dispatch({ type: 'view/zoom', zoom: 100 });
  assert.deepEqual(store.getState().view, { zoom: 2, fit: false, grid: true, snap: false, panX: 0, panY: 0 });
  store.dispatch({ type: 'view/zoom', zoom: 0 });
  assert.equal(store.getState().view.zoom, 0.05);
  const previous = store.getState();
  store.dispatch({ type: 'view/zoom', zoom: NaN });
  assert.equal(store.getState(), previous);
  store.dispatch({ type: 'view/zoom', zoom: 0.5, fit: true });
  assert.equal(store.getState().view.fit, true);
});

test('subscriptions fire only on changes and can unsubscribe', () => {
  const store = createStore();
  let calls = 0;
  const unsubscribe = store.subscribe(() => calls++);
  store.dispatch({ type: 'view/grid', visible: true });
  store.dispatch({ type: 'unknown' });
  assert.equal(calls, 0);
  store.dispatch({ type: 'view/grid', visible: false });
  assert.equal(calls, 1);
  unsubscribe();
  store.dispatch({ type: 'view/grid', visible: true });
  assert.equal(calls, 1);
});

test('rename handles blank, long and HTML-like strings as plain data', () => {
  const store = createStore();
  store.dispatch({ type: 'project/rename', name: '<img src=x onerror=alert(1)>' });
  assert.equal(store.getState().project.name, '<img src=x onerror=alert(1)>');
  store.dispatch({ type: 'project/rename', name: 'a'.repeat(100) });
  assert.equal(store.getState().project.name.length, 80);
  store.dispatch({ type: 'project/rename', name: '   ' });
  assert.equal(store.getState().project.name, 'Untitled motion');
});

test('stores do not share mutable input', () => {
  const initial = createInitialState();
  const store = createStore(initial);
  initial.project.canvas.width = 99;
  assert.equal(store.getState().project.canvas.width, 1280);
});

test('panning is view-only and fit can reset its offset', () => {
  const store = createStore();
  const project = store.getState().project;
  store.dispatch({ type: 'view/pan', x: 120, y: -45 });
  assert.equal(store.getState().project, project);
  assert.equal(store.getState().view.panX, 120);
  assert.equal(store.getState().view.fit, false);
  const previous = store.getState();
  store.dispatch({ type: 'view/pan', x: Infinity, y: 0 });
  assert.equal(store.getState(), previous);
  store.dispatch({ type: 'view/pan', x: 0, y: 0, fit: true });
  assert.equal(store.getState().view.panX, 0);
  assert.equal(store.getState().view.panY, 0);
  assert.equal(store.getState().view.fit, true);
});
