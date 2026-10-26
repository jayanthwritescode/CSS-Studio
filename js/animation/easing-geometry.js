export const PLOT = Object.freeze({ left: 24, right: 216, top: 24, bottom: 196, width: 240, height: 220 });
export function graphRange(points) {
  return { min: Math.min(-0.25, points[1] - 0.15, points[3] - 0.15), max: Math.max(1.25, points[1] + 0.15, points[3] + 0.15) };
}
export function toGraph(x, y, range) {
  return { x: PLOT.left + x * (PLOT.right - PLOT.left), y: PLOT.bottom - (y - range.min) / (range.max - range.min) * (PLOT.bottom - PLOT.top) };
}
export function fromGraph(x, y, range) {
  const clamp = (value, min, max) => Math.round(Math.min(max, Math.max(min, value)) * 1000) / 1000;
  return [clamp((x - PLOT.left) / (PLOT.right - PLOT.left), 0, 1), clamp(range.min + (PLOT.bottom - y) / (PLOT.bottom - PLOT.top) * (range.max - range.min), -10, 10)];
}
