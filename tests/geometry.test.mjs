import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement, ORIGINS } from '../js/elements/model.js';
import { bounds, resizeFromDelta, worldPoint, rotationFromPointer } from '../js/canvas/geometry.js';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} should equal ${b}`);
const base = createElement('rectangle', { width: 1280, height: 720 }).styles;

test('resizing preserves the opposite anchor across rotation, scale and origin', () => {
  for (const transformOrigin of ORIGINS) for (const rotation of [0, 45, 90, -120]) for (const handle of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
    const styles = { ...base, rotation, scaleX: 1.5, scaleY: 0.7, transformOrigin };
    const ax = handle.includes('w') ? 1 : handle.includes('e') ? 0 : 0.5;
    const ay = handle.includes('n') ? 1 : handle.includes('s') ? 0 : 0.5;
    const before = worldPoint(styles, ax * styles.width, ay * styles.height);
    const next = { ...styles, ...resizeFromDelta(styles, handle, 30, 22) };
    const after = worldPoint(next, ax * next.width, ay * next.height);
    close(before.x, after.x); close(before.y, after.y);
  }
});

test('resize clamps before crossing zero and keeps its anchor', () => {
  const next = { ...base, ...resizeFromDelta(base, 'nw', 10000, 10000) };
  assert.equal(next.width, 1); assert.equal(next.height, 1);
  const before = worldPoint(base, base.width, base.height);
  const after = worldPoint(next, next.width, next.height);
  close(before.x, after.x); close(before.y, after.y);
});

test('rotation follows the origin and can snap to 15 degrees', () => {
  const styles = { ...base, transformOrigin: '0% 0%', rotation: 0 };
  const start = { x: styles.x + 100, y: styles.y };
  const end = { x: styles.x, y: styles.y + 100 };
  close(rotationFromPointer(styles, start, end), 90);
  assert.equal(rotationFromPointer(styles, start, { x: styles.x + 100, y: styles.y + 30 }, true), 15);
});

test('bounds reflect the transformed shape for canvas alignment', () => {
  const box = bounds({ ...base, x: 10, y: 20, width: 200, height: 100, rotation: 90 });
  close(box.left, 60); close(box.right, 160); close(box.top, -30); close(box.bottom, 170);
});
