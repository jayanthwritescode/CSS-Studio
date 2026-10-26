import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, selectedElement } from '../js/state/store.js';
import { createElement, validateStylePatch, isImageSource } from '../js/elements/model.js';

function setup(type = 'rectangle') {
  const store = createStore();
  const element = createElement(type, store.getState().project.canvas);
  store.dispatch({ type: 'element/add', element });
  return { store, id: element.id };
}

test('creation selects an independent serializable element', () => {
  const { store, id } = setup();
  assert.equal(store.getState().selection, id);
  assert.equal(selectedElement(store.getState()).type, 'rectangle');
  assert.deepEqual(JSON.parse(JSON.stringify(store.getState().project)), store.getState().project);
  const count = store.getState().project.elements.length;
  store.dispatch({ type: 'element/add', element: selectedElement(store.getState()) });
  assert.equal(store.getState().project.elements.length, count, 'duplicate IDs rejected');
});

test('element transforms validate without contaminating siblings', () => {
  const { store, id } = setup();
  const second = createElement('circle', store.getState().project.canvas);
  store.dispatch({ type: 'element/add', element: second });
  store.dispatch({ type: 'element/update', id, styles: { x: 100.1256, rotation: 45, opacity: 0.5, scaleX: 1.25 } });
  const first = store.getState().project.elements[0];
  assert.equal(first.styles.x, 100.126);
  assert.equal(first.styles.rotation, 45);
  assert.equal(store.getState().project.elements[1].styles.rotation, 0);
  for (const styles of [{ width: 0 }, { scaleX: -1 }, { opacity: 2 }, { x: NaN }, { fontFamily: 'url(evil)' }, { transformOrigin: 'evil' }]) {
    const before = store.getState();
    store.dispatch({ type: 'element/update', id, styles });
    assert.equal(store.getState(), before);
  }
});

test('locking protects appearance, text, transform, order and deletion', () => {
  const { store, id } = setup('text');
  store.dispatch({ type: 'element/add', element: createElement('circle', store.getState().project.canvas) });
  store.dispatch({ type: 'element/lock', id });
  const before = store.getState();
  for (const action of [
    { type: 'element/update', id, styles: { x: 99 } },
    { type: 'element/content', id, content: 'changed' },
    { type: 'element/reorder', id, direction: 1 },
    { type: 'element/delete', id },
  ]) {
    store.dispatch(action);
    assert.equal(store.getState(), before);
  }
  store.dispatch({ type: 'element/lock', id });
  store.dispatch({ type: 'element/delete', id });
  assert.equal(store.getState().project.elements.length, 1);
});

test('duplicate creates a new editable copy directly above the original', () => {
  const { store, id } = setup();
  const original = selectedElement(store.getState());
  store.dispatch({ type: 'element/duplicate', id });
  const copy = selectedElement(store.getState());
  assert.notEqual(copy.id, id);
  assert.equal(copy.styles.x, original.styles.x + 24);
  store.dispatch({ type: 'element/update', id: copy.id, styles: { width: 300 } });
  assert.equal(store.getState().project.elements[0].styles.width, original.styles.width);
  assert.equal(store.getState().project.elements[1].styles.width, 300);
  store.dispatch({ type: 'element/delete', id: copy.id });
  assert.equal(store.getState().selection, null);
});

test('layer order and visibility are actual project data', () => {
  const { store, id } = setup();
  const second = createElement('circle', store.getState().project.canvas);
  store.dispatch({ type: 'element/add', element: second });
  store.dispatch({ type: 'element/reorder', id, direction: 1 });
  assert.deepEqual(store.getState().project.elements.map(e => e.id), [second.id, id]);
  const before = store.getState();
  store.dispatch({ type: 'element/reorder', id, direction: 1 });
  assert.equal(store.getState(), before);
  store.dispatch({ type: 'element/visibility', id });
  assert.equal(store.getState().project.elements[1].visible, false);
  store.dispatch({ type: 'selection/set', id: 'missing' });
  assert.equal(store.getState().selection, second.id);
});

test('text is stored as plain content and style injection is rejected', () => {
  const { store, id } = setup('text');
  const content = '<img src=x onerror=alert(1)>\nHello';
  store.dispatch({ type: 'element/content', id, content });
  assert.equal(selectedElement(store.getState()).content, content);
  assert.equal(validateStylePatch({ boxShadow: 'url(https://evil.test)' }), null);
  assert.deepEqual(validateStylePatch({ boxShadow: '0px 12px 24px -4px #112233' }), { boxShadow: '0px 12px 24px -4px #112233' });
  assert.equal(isImageSource('javascript:alert(1)'), false);
  assert.equal(isImageSource('data:image/svg+xml;base64,PHN2Zz4='), false);
  assert.equal(isImageSource('data:image/png;base64,aGVsbG8='), true);
});

test('prototype-shaped style keys are rejected without throwing', () => {
  assert.equal(validateStylePatch(JSON.parse('{"__proto__": {"x": 3}}')), null);
  assert.equal(validateStylePatch({ constructor: 'invalid' }), null);
  const store = createStore();
  store.dispatch({ type: 'element/add', element: { id: 'broken', type: 'text' } });
  assert.equal(store.getState().project.elements.length, 0);
});
