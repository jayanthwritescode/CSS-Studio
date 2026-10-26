import { easingFunction } from './easing.js';

export const ANIMATABLE = Object.freeze([
  'x', 'y', 'width', 'height', 'rotation', 'scaleX', 'scaleY', 'opacity',
  'backgroundColor', 'color', 'borderColor', 'borderWidth', 'borderRadius', 'fontSize',
]);
const COLORS = new Set(['backgroundColor', 'color', 'borderColor']);
export const animatedProperties = styles => Object.fromEntries(ANIMATABLE.filter(key => key in styles).map(key => [key, styles[key]]));

export function interpolate(key, from, to, progress) {
  if (COLORS.has(key)) {
    const channels = [1, 3, 5].map(index => {
      const start = parseInt(from.slice(index, index + 2), 16), end = parseInt(to.slice(index, index + 2), 16);
      return Math.min(255, Math.max(0, Math.round(start + (end - start) * progress))).toString(16).padStart(2, '0');
    });
    return `#${channels.join('')}`;
  }
  let value = from + (to - from) * progress;
  if (key === 'opacity') value = Math.min(1, Math.max(0, value));
  if (['width', 'height', 'fontSize'].includes(key)) value = Math.max(0.001, value);
  if (key === 'borderWidth' || key === 'borderRadius') value = Math.max(0, value);
  return value;
}

/** Compile per-property tracks once per immutable element, not once per animation frame. */
const tracksCache = new WeakMap();
const posesCache = new WeakMap();
export function compileTracks(element) {
  if (tracksCache.has(element)) return tracksCache.get(element);
  const tracks = new Map();
  const frames = [...element.keyframes].sort((a, b) => a.time - b.time);
  for (const key of ANIMATABLE) {
    const points = [];
    for (const frame of frames) {
      if (!Object.hasOwn(frame.properties, key)) continue;
      const point = { time: frame.time, value: frame.properties[key], easing: frame.easing ?? 'linear' };
      // Last writer wins for externally supplied duplicate timestamps.
      if (points.at(-1)?.time === frame.time) points[points.length - 1] = point;
      else points.push(point);
    }
    if (!points.length) continue;
    if (points[0].time > 0) points.unshift({ time: 0, value: element.styles[key], easing: 'linear' });
    tracks.set(key, points);
  }
  tracksCache.set(element, tracks);
  return tracks;
}

export function evaluateElement(element, time, duration) {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const timestamp = Math.min(safeDuration, Math.max(0, Number.isFinite(time) ? time : 0));
  const cached = posesCache.get(element);
  if (cached?.time === timestamp && cached.duration === safeDuration) return cached.styles;
  const result = { ...element.styles };
  for (const [key, points] of compileTracks(element)) {
    if (timestamp <= points[0].time) { result[key] = points[0].value; continue; }
    if (timestamp >= points.at(-1).time) { result[key] = points.at(-1).value; continue; }
    let low = 0, high = points.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (points[middle].time <= timestamp) low = middle; else high = middle;
    }
    const from = points[low], to = points[high];
    const progress = (timestamp - from.time) / (to.time - from.time);
    result[key] = interpolate(key, from.value, to.value, easingFunction(from.easing)(progress));
  }
  Object.freeze(result);
  posesCache.set(element, { time: timestamp, duration: safeDuration, styles: result });
  return result;
}

export function displayedStyles(element, state) {
  return state.timeline.mode === 'base' && !state.timeline.playing
    ? element.styles : evaluateElement(element, state.timeline.time, state.project.duration);
}
