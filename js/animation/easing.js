const PRESETS = {
  linear: [0, 0, 1, 1], ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1],
};
const cache = new Map();
export const EASINGS = Object.keys(PRESETS);
export function parseEasing(value) {
  if (typeof value !== 'string') return null;
  value = value.trim();
  if (Object.hasOwn(PRESETS, value)) return { value, points: PRESETS[value] };
  const steps = value.match(/^steps\(\s*(\d+)\s*,\s*end\s*\)$/);
  if (steps) {
    const count = Number(steps[1]);
    return count >= 1 && count <= 1000 ? { value: `steps(${count}, end)`, kind: 'steps', count } : null;
  }
  const match = value.match(/^cubic-bezier\(\s*([-+\d.]+)\s*,\s*([-+\d.]+)\s*,\s*([-+\d.]+)\s*,\s*([-+\d.]+)\s*\)$/);
  if (!match) return null;
  const points = match.slice(1).map(Number);
  if (points.some(n => !Number.isFinite(n)) || points[0] < 0 || points[0] > 1 || points[2] < 0 || points[2] > 1 || Math.abs(points[1]) > 10 || Math.abs(points[3]) > 10) return null;
  return { value: `cubic-bezier(${points.join(', ')})`, points };
}

export function easingFunction(value = 'linear') {
  if (cache.has(value)) return cache.get(value);
  const parsed = parseEasing(value);
  if (!parsed) return progress => progress;
  if (parsed.kind === 'steps') return progress => progress >= 1 ? 1 : Math.floor(Math.max(0, progress) * parsed.count + 1e-9) / parsed.count;
  const [x1, y1, x2, y2] = parsed.points;
  const coordinate = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
  const easing = progress => {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;
    // Solve x(t) for time; y(t) is allowed to overshoot for spring-like curves.
    let low = 0, high = 1, t = progress;
    for (let iteration = 0; iteration < 24; iteration++) {
      const x = coordinate(t, x1, x2);
      if (Math.abs(x - progress) < 1e-8) break;
      if (x < progress) low = t; else high = t;
      t = (low + high) / 2;
    }
    return coordinate(t, y1, y2);
  };
  if (cache.size >= 100) cache.clear();
  cache.set(value, easing);
  return easing;
}
