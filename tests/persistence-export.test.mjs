import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createInitialState, selectedElement } from '../js/state/store.js';
import { createHistory } from '../js/state/history.js';
import { createElement } from '../js/elements/model.js';
import { buildPreset, PRESETS } from '../js/animation/presets.js';
import { normalizeProject, parseProject, serializeProject, validImageHeader, normalizeOutput } from '../js/storage/serialization.js';
import { generateCSS, projectPrefix } from '../js/export/css-generator.js';
import { generateHTML, generateDemo } from '../js/export/html-generator.js';
import { usesRevealClip } from '../js/elements/styles.js';

function project() {
  const p = createInitialState().project;
  p.elements.push(createElement('rectangle', p.canvas));
  return p;
}

test('serialization round trips complete projects and whitelists external fields', () => {
  const p = project(); p.elements[0].locked = true; p.elements[0].visible = false;
  const loaded = parseProject(serializeProject(p));
  assert.deepEqual(loaded, p);
  const external = { ...p, malicious: '<script>', elements: p.elements.map(e => ({ ...e, injected: 'ignore' })) };
  assert.equal('malicious' in normalizeProject(external), false);
  assert.equal('injected' in normalizeProject(external).elements[0], false);
});

test('legacy project defaults and missing keyframe IDs migrate without losing data', () => {
  const p = project(); delete p.version; delete p.output;
  const e = p.elements[0]; delete e.styles.rotationY; delete e.styles.spinnerEnabled;
  e.keyframes = [{ time: 0, properties: { x: 10 } }, { time: 3000, properties: { x: 200 }, easing: 'ease' }];
  const result = normalizeProject(p);
  assert.equal(result.elements[0].styles.rotationY, 0);
  assert.equal(result.elements[0].styles.spinnerEnabled, false);
  assert.equal(result.output.fill, 'both');
  assert.equal(new Set(result.elements[0].keyframes.map(f => f.id)).size, 2);
});

test('corrupt, unsupported and unsafe imported projects fail with useful errors', () => {
  assert.throws(() => parseProject('{broken'), /valid JSON/);
  assert.throws(() => normalizeProject({ ...project(), version: 2 }), /version/);
  const p = project(); p.elements.push(structuredClone(p.elements[0]));
  assert.throws(() => normalizeProject(p), /duplicate element/i);
  const malformed = project(); malformed.elements[0].keyframes = [{ id: 'bad', time: 0, properties: { x: Infinity }, easing: 'linear' }];
  assert.throws(() => normalizeProject(malformed), /keyframes/);
  const unsafe = project(); unsafe.elements[0].styles = JSON.parse('{"__proto__":{"x":1}}');
  assert.throws(() => normalizeProject(unsafe), /styles/);
  assert.equal(validImageHeader('data:image/png;base64,aGVsbG8='), false);
  assert.throws(() => normalizeOutput({ direction: 'invalid' }), /direction/);
});

test('undo/redo covers creation, grouped movement, keyframe edits and redo invalidation', () => {
  const store = createStore();
  const e = createElement('rectangle', store.getState().project.canvas);
  store.dispatch({ type: 'element/add', element: e });
  store.beginTransaction();
  for (const x of [100, 150, 200, 250]) store.dispatch({ type: 'element/update', id: e.id, styles: { x } });
  store.endTransaction(); store.undo();
  assert.equal(selectedElement(store.getState()).styles.x, e.styles.x);
  store.redo(); assert.equal(selectedElement(store.getState()).styles.x, 250);
  store.dispatch({ type: 'keyframe/add', id: e.id });
  store.undo(); assert.equal(selectedElement(store.getState()).keyframes.length, 0);
  store.redo(); assert.equal(selectedElement(store.getState()).keyframes.length, 1);
  store.undo(); store.dispatch({ type: 'element/rename', id: e.id, name: 'Changed' });
  assert.equal(store.getHistory().canRedo, false);
});

test('canceled gestures leave no history entries and preset groups undo atomically', () => {
  const store = createStore(); const e = createElement('circle', store.getState().project.canvas);
  store.dispatch({ type: 'element/add', element: e });
  store.beginTransaction();
  store.dispatch({ type: 'element/update', id: e.id, styles: { x: 100 } });
  store.dispatch({ type: 'element/restore-gesture', id: e.id, styles: e.styles, keyframes: [] });
  store.endTransaction(); store.undo();
  assert.equal(store.getState().project.elements.length, 0);
  store.redo();
  store.dispatch({ type: 'preset/apply', id: e.id, presetId: 'bouncing-dots', options: { duration: 1000, delay: 0, easing: 'linear' } });
  assert.equal(store.getState().project.elements.length, 3);
  store.undo(); assert.equal(store.getState().project.elements.length, 1);
  store.redo(); assert.equal(store.getState().project.elements.length, 3);
});

test('document switches reset history and timeline state', () => {
  const store = createStore(); store.dispatch({ type: 'project/rename', name: 'First' });
  const next = project(); next.name = 'Second';
  store.dispatch({ type: 'project/load', project: next });
  assert.equal(store.getHistory().canUndo, false);
  assert.equal(store.getState().timeline.playing, false);
  assert.equal(store.getState().selection, null);
});

test('bounded history and pending transactions expose consistent controls', () => {
  const history = createHistory(2);
  const snap = n => ({ project: { value: n } });
  history.record(snap(0), snap(1)); history.record(snap(1), snap(2)); history.record(snap(2), snap(3));
  assert.deepEqual(history.undo(snap(3)), snap(2));
  assert.deepEqual(history.undo(snap(2)), snap(1));
  assert.equal(history.undo(snap(1)), null);
  history.clear(); history.begin(snap(0)); history.record(snap(0), snap(1));
  assert.equal(history.canUndo, true); history.end(snap(0)); assert.equal(history.canUndo, false);
});

test('CSS exports sparse property tracks independently with implicit endpoints', () => {
  const p = project(), e = p.elements[0];
  e.keyframes = [
    { id: 'a', time: 0, properties: { x: 0, rotation: 0 }, easing: 'linear' },
    { id: 'b', time: 1000, properties: { rotation: 90 }, easing: 'ease-in' },
    { id: 'c', time: 3000, properties: { x: 300, rotation: 180 }, easing: 'linear' },
  ];
  const css = generateCSS(p);
  assert.match(css, /@property .* syntax: "<number>"/);
  assert.match(css, /@keyframes .*?-x/); assert.match(css, /@keyframes .*?-rotation/);
  assert.match(css, /33\.33333333%/);
  assert.match(css, /animation-timing-function: ease-in/);
  assert.match(css, /100%/);
  assert.match(css, /perspective\(800px\) rotateY/);
});

test('all presets generate reusable native CSS and matching HTML', () => {
  for (const preset of PRESETS) {
    const p = project(), e = createElement(preset.types?.[0] ?? 'rectangle', p.canvas);
    p.elements = buildPreset(e, preset.id, { duration: 3000, delay: 0, easing: 'linear' }, 3000).elements;
    assert.match(generateCSS(p), /@keyframes/);
    assert.ok(generateHTML(p).includes(projectPrefix(p)));
    assert.ok(generateDemo(p).startsWith('<!doctype html>'));
  }
});

test('HTML escapes imported text and names while keeping data assets local', () => {
  const p = project(); p.name = '</title><script>alert(1)</script>';
  const e = createElement('text', p.canvas); e.content = '<img src=x onerror=alert(1)>'; e.name = '" onclick="evil'; p.elements = [e];
  const html = generateHTML(p), demo = generateDemo(p);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.equal(html.includes('<img src=x'), false);
  assert.equal(demo.includes('</title><script>alert'), false);
  assert.ok(html.includes('&quot; onclick=&quot;evil'));
});

test('export playback settings and reveal clipping remain explicit', () => {
  const p = project(), e = p.elements[0];
  e.keyframes = [{ id: 'a', time: 0, properties: { reveal: 0 }, easing: 'linear' }, { id: 'b', time: 3000, properties: { reveal: 1 }, easing: 'linear' }];
  assert.equal(usesRevealClip(e), true);
  const css = generateCSS(p, { iterations: 3, direction: 'alternate', fill: 'forwards', delay: 0.5, speed: 2 });
  assert.match(css, /animation-duration: 1\.5s/); assert.match(css, /animation-delay: 0\.5s/);
  assert.match(css, /animation-iteration-count: 3/); assert.match(css, /animation-direction: alternate/);
  assert.match(css, /animation-fill-mode: forwards/);
  assert.match(css, /clip-path: inset/);
});

test('undo preserves workspace playback preferences while restoring edit context', () => {
  const store = createStore();
  store.dispatch({ type: 'project/rename', name: 'Edited' });
  store.dispatch({ type: 'timeline/loop', loop: false });
  store.dispatch({ type: 'timeline/rate', rate: -2 });
  store.dispatch({ type: 'timeline/zoom', zoom: 3 });
  store.undo();
  assert.equal(store.getState().project.name, 'Untitled motion');
  assert.equal(store.getState().timeline.loop, false);
  assert.equal(store.getState().timeline.rate, -2);
  assert.equal(store.getState().timeline.zoom, 3);
  assert.equal(store.getState().timeline.playing, false);
});
