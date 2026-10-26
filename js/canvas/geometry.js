const radians = degrees => degrees * Math.PI / 180;
export function rotateVector(x, y, degrees) {
  const angle = radians(degrees);
  return { x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) };
}
export function originFractions(styles) {
  return styles.transformOrigin.split(' ').map(value => parseFloat(value) / 100);
}
export function worldPoint(styles, localX, localY) {
  const [ox, oy] = originFractions(styles);
  const originX = ox * styles.width, originY = oy * styles.height;
  const offset = rotateVector((localX - originX) * styles.scaleX, (localY - originY) * styles.scaleY, styles.rotation);
  return { x: styles.x + originX + offset.x, y: styles.y + originY + offset.y };
}

/** Resize in the element's rotated local axes, preserving the opposite corner/edge. */
export function resizeFromDelta(styles, handle, dx, dy) {
  const delta = rotateVector(dx, dy, -styles.rotation);
  const localX = delta.x / styles.scaleX, localY = delta.y / styles.scaleY;
  const width = Math.min(10000, Math.max(1, styles.width + (handle.includes('e') ? localX : handle.includes('w') ? -localX : 0)));
  const height = Math.min(10000, Math.max(1, styles.height + (handle.includes('s') ? localY : handle.includes('n') ? -localY : 0)));
  const anchorX = handle.includes('w') ? 1 : handle.includes('e') ? 0 : 0.5;
  const anchorY = handle.includes('n') ? 1 : handle.includes('s') ? 0 : 0.5;
  const before = worldPoint(styles, anchorX * styles.width, anchorY * styles.height);
  const after = worldPoint({ ...styles, x: 0, y: 0, width, height }, anchorX * width, anchorY * height);
  return { width, height, x: before.x - after.x, y: before.y - after.y };
}

export function rotationFromPointer(styles, start, current, snap = false) {
  const [ox, oy] = originFractions(styles);
  const pivot = { x: styles.x + ox * styles.width, y: styles.y + oy * styles.height };
  const angle = point => Math.atan2(point.y - pivot.y, point.x - pivot.x);
  let delta = (angle(current) - angle(start)) * 180 / Math.PI;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  const rotation = styles.rotation + delta;
  return snap ? Math.round(rotation / 15) * 15 : rotation;
}

export function bounds(styles) {
  const corners = [[0, 0], [styles.width, 0], [0, styles.height], [styles.width, styles.height]].map(([x, y]) => worldPoint(styles, x, y));
  return { left: Math.min(...corners.map(p => p.x)), right: Math.max(...corners.map(p => p.x)), top: Math.min(...corners.map(p => p.y)), bottom: Math.max(...corners.map(p => p.y)) };
}
