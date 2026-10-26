import { newId, validateStylePatch } from '../elements/model.js';
import { parseEasing } from './easing.js';
import { validFrames } from './keyframes.js';

const definition = (id, name, category, description, samples, extra = {}) => Object.freeze({ id, name, category, description, samples, ...extra });
const sample = (offset, properties) => ({ offset, properties });
const sequence = (values, key) => values.map((value, index) => sample(index / (values.length - 1), { [key]: value }));
export const PRESET_CATEGORIES = ['All', 'Entrance', 'Exit', 'Attention', 'Loading', 'Creative'];
export const PRESETS = Object.freeze([
  definition('fade-in', 'Fade in', 'Entrance', 'A clean transition from transparent to visible.', s => [sample(0, { opacity: 0 }), sample(1, { opacity: s.opacity })]),
  definition('slide-in', 'Slide in', 'Entrance', 'Arrive from the left with a soft fade.', s => [sample(0, { x: s.x - s.width * 0.8, opacity: 0 }), sample(1, { x: s.x, opacity: s.opacity })]),
  definition('scale-in', 'Scale in', 'Entrance', 'Grow into place from a small starting pose.', s => [sample(0, { scaleX: s.scaleX * 0.1, scaleY: s.scaleY * 0.1, opacity: 0 }), sample(1, { scaleX: s.scaleX, scaleY: s.scaleY, opacity: s.opacity })]),
  definition('rotate-in', 'Rotate in', 'Entrance', 'Turn into place with a gentle reveal.', s => [sample(0, { rotation: s.rotation - 90, opacity: 0 }), sample(1, { rotation: s.rotation, opacity: s.opacity })]),
  definition('bounce-in', 'Bounce in', 'Entrance', 'Overshoot, settle, and land on the original size.', s => [sample(0, { scaleX: s.scaleX * 0.1, scaleY: s.scaleY * 0.1, opacity: 0 }), sample(0.55, { scaleX: s.scaleX * 1.15, scaleY: s.scaleY * 1.15, opacity: s.opacity }), sample(0.78, { scaleX: s.scaleX * 0.94, scaleY: s.scaleY * 0.94 }), sample(1, { scaleX: s.scaleX, scaleY: s.scaleY })]),
  definition('fade-out', 'Fade out', 'Exit', 'Fade away while preserving the element’s position.', s => [sample(0, { opacity: s.opacity }), sample(1, { opacity: 0 })]),
  definition('slide-out', 'Slide out', 'Exit', 'Move right and fade out of the composition.', s => [sample(0, { x: s.x, opacity: s.opacity }), sample(1, { x: s.x + s.width * 0.8, opacity: 0 })]),
  definition('zoom-out', 'Zoom out', 'Exit', 'Shrink toward the transform origin and disappear.', s => [sample(0, { scaleX: s.scaleX, scaleY: s.scaleY, opacity: s.opacity }), sample(1, { scaleX: s.scaleX * 0.1, scaleY: s.scaleY * 0.1, opacity: 0 })]),
  definition('rotate-out', 'Rotate out', 'Exit', 'Turn away with a fading finish.', s => [sample(0, { rotation: s.rotation, opacity: s.opacity }), sample(1, { rotation: s.rotation + 90, opacity: 0 })]),
  definition('shake', 'Shake', 'Attention', 'A quick horizontal shake that returns to rest.', s => sequence([0, -1, 1, -1, 1, -0.5, 0.5, 0].map(v => s.x + v * Math.min(s.width * 0.12, 24)), 'x')),
  definition('pulse', 'Pulse', 'Attention', 'Expand and contract around the original scale.', s => [sample(0, { scaleX: s.scaleX, scaleY: s.scaleY }), sample(0.5, { scaleX: s.scaleX * 1.15, scaleY: s.scaleY * 1.15 }), sample(1, { scaleX: s.scaleX, scaleY: s.scaleY })]),
  definition('wobble', 'Wobble', 'Attention', 'Combine side-to-side movement with a diminishing tilt.', s => [0, -1, 0.8, -0.6, 0.4, -0.2, 0].map((v, i) => sample(i / 6, { x: s.x + v * s.width * 0.12, rotation: s.rotation + v * 10 }))),
  definition('swing', 'Swing', 'Attention', 'Swing through diminishing arcs around the chosen origin.', s => sequence([0, 15, -12, 8, -5, 0].map(v => s.rotation + v), 'rotation')),
  definition('rubber-band', 'Rubber band', 'Attention', 'Stretch one axis while compressing the other.', s => [[1, 1], [1.25, 0.75], [0.8, 1.2], [1.1, 0.9], [0.97, 1.03], [1, 1]].map(([x, y], i) => sample(i / 5, { scaleX: s.scaleX * x, scaleY: s.scaleY * y }))),
  definition('heartbeat', 'Heartbeat', 'Attention', 'Two short pulses followed by a resting beat.', s => [1, 1.2, 1, 1.28, 1, 1, 1].map((v, i) => sample(i / 6, { scaleX: s.scaleX * v, scaleY: s.scaleY * v }))),
  definition('spinner', 'Spinner', 'Loading', 'A notched outline turns continuously. Pair with timeline Loop for a loader.', s => [sample(0, { rotation: s.rotation }), sample(1, { rotation: s.rotation + 360 })], { easing: 'linear', stylePatch: { spinnerEnabled: true, backgroundTransparent: true, borderWidth: 6, borderStyle: 'solid' } }),
  definition('bouncing-dots', 'Bouncing dots', 'Loading', 'Create three 32 px circle layers with staggered bounces.', s => [sample(0, { y: s.y }), sample(0.25, { y: s.y - 24 }), sample(0.5, { y: s.y }), sample(1, { y: s.y })], { types: ['circle'], easing: 'ease-in-out', createsLayers: true }),
  definition('skeleton-shimmer', 'Skeleton shimmer', 'Loading', 'Sweep a soft highlight across a filled shape.', () => [sample(0, { shimmer: 100 }), sample(1, { shimmer: -100 })], { types: ['rectangle', 'circle'], stylePatch: { shimmerEnabled: true, backgroundTransparent: false }, easing: 'linear' }),
  definition('pulsating-circle', 'Pulsating circle', 'Loading', 'A breathing circle with scale and opacity changes.', s => [sample(0, { scaleX: s.scaleX * 0.75, scaleY: s.scaleY * 0.75, opacity: s.opacity * 0.4 }), sample(0.5, { scaleX: s.scaleX, scaleY: s.scaleY, opacity: s.opacity }), sample(1, { scaleX: s.scaleX * 0.75, scaleY: s.scaleY * 0.75, opacity: s.opacity * 0.4 })], { types: ['circle'] }),
  definition('floating', 'Floating', 'Creative', 'Float up and return to the same resting position.', s => [sample(0, { y: s.y }), sample(0.5, { y: s.y - Math.min(40, s.height * 0.25) }), sample(1, { y: s.y })]),
  definition('neon-glow', 'Neon glow', 'Creative', 'Pulse a real glow around the element’s painted pixels.', () => [sample(0, { glow: 2 }), sample(0.5, { glow: 18 }), sample(1, { glow: 2 })]),
  definition('flip', 'Flip', 'Creative', 'Turn through a full 3D rotation around the vertical axis.', () => [sample(0, { rotationY: 0 }), sample(1, { rotationY: 360 })]),
  definition('elastic', 'Elastic movement', 'Creative', 'Travel into place through progressively smaller overshoots.', s => [-1, 0.25, -0.12, 0.06, -0.025, 0].map((v, i) => sample(i / 5, { x: s.x + v * Math.min(160, s.width), opacity: i ? s.opacity : 0 }))),
  definition('typewriter', 'Typewriter', 'Creative', 'Monospaced character reveal, best with single-line text.', () => [sample(0, { reveal: 0 }), sample(1, { reveal: 1 })], { types: ['text'], stepped: true, stylePatch: { fontFamily: 'monospace' } }),
]);

export const findPreset = id => PRESETS.find(preset => preset.id === id);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const EFFECT_DEFAULTS = { rotationY: 0, reveal: 1, glow: 0, shimmer: 0, shimmerEnabled: false, spinnerEnabled: false };

export function buildPreset(element, presetId, options, projectDuration) {
  const preset = findPreset(presetId);
  const { duration, delay, easing } = options ?? {};
  const parsed = parseEasing(easing);
  if (!preset || element.locked || (preset.types && !preset.types.includes(element.type)) || !Number.isInteger(duration) || duration < 100 || duration > 30000 || !Number.isInteger(delay) || delay < 0 || delay > 30000 || !parsed) return null;
  const instances = preset.createsLayers ? 3 : 1;
  const end = delay + duration;
  const elements = [];
  for (let index = 0; index < instances; index++) {
    const styles = { ...element.styles, ...EFFECT_DEFAULTS, ...preset.stylePatch };
    if (preset.createsLayers) Object.assign(styles, {
      width: 32, height: 32, backgroundTransparent: false, borderWidth: 0, scaleX: 1, scaleY: 1, rotation: 0, transformOrigin: '50% 50%', borderRadius: 9999,
      x: element.styles.x + element.styles.width / 2 - 64 + index * 48,
      y: element.styles.y + element.styles.height / 2 - 16,
    });
    styles.x = clamp(styles.x, -100000, 100000);
    styles.y = clamp(styles.y, -100000, 100000);
    const effectiveEasing = preset.stepped ? `steps(${clamp([...element.content].length, 1, 1000)}, end)` : parsed.value;
    let samples = preset.samples(styles);
    if (preset.createsLayers) {
      // All dots share an endpoint, with a stagger expressed in editable normalized keys.
      const offset = index * 0.15;
      samples = [sample(0, { y: styles.y }), sample(offset + 0.08, { y: styles.y }), sample(offset + 0.26, { y: styles.y - 24 }), sample(offset + 0.44, { y: styles.y }), sample(1, { y: styles.y })];
    }
    const merged = new Map();
    const normalize = properties => {
      const patch = { ...properties };
      for (const key of ['scaleX', 'scaleY']) if (key in patch) patch[key] = clamp(patch[key], 0.05, 10);
      for (const key of ['x', 'y']) if (key in patch) patch[key] = clamp(patch[key], -100000, 100000);
      for (const key of ['rotation', 'rotationY']) if (key in patch) patch[key] = clamp(patch[key], -36000, 36000);
      return validateStylePatch(patch);
    };
    const first = normalize(samples[0].properties);
    if (delay > 0) merged.set(0, { id: newId(), time: 0, properties: first, easing: 'linear' });
    for (const entry of samples) {
      const time = delay + Math.round(duration * entry.offset);
      const properties = normalize(entry.properties);
      if (!properties) return null;
      const previous = merged.get(time);
      merged.set(time, { id: previous?.id ?? newId(), time, properties: { ...previous?.properties, ...properties }, easing: effectiveEasing });
    }
    const keyframes = [...merged.values()].sort((a, b) => a.time - b.time);
    if (!validFrames(keyframes, Math.max(projectDuration, end))) return null;
    elements.push({ ...element, id: index ? newId() : element.id, name: index ? `${element.name.slice(0, 65)} · dot ${index + 1}` : element.name, styles, keyframes });
  }
  return { elements, duration: Math.max(projectDuration, end), preset };
}
