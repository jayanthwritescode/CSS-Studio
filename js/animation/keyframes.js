import { newId, validateStylePatch } from '../elements/model.js';
import { ANIMATABLE, animatedProperties } from './interpolation.js';
import { parseEasing } from './easing.js';

export function validateProperties(properties) {
  if (!properties || typeof properties !== 'object' || !Object.keys(properties).length || Object.keys(properties).some(key => !ANIMATABLE.includes(key))) return null;
  return validateStylePatch(properties);
}
export function validFrame(frame, duration = Infinity) {
  return frame && typeof frame.id === 'string' && frame.id.length > 0 && Number.isInteger(frame.time)
    && frame.time >= 0 && frame.time <= duration && validateProperties(frame.properties) !== null && parseEasing(frame.easing) !== null;
}
export function upsertFrame(element, time, properties, easing = 'linear') {
  const frames = [...element.keyframes];
  if (!frames.length && time > 0) frames.push({ id: newId(), time: 0, properties: animatedProperties(element.styles), easing: 'linear' });
  const existing = frames.find(frame => frame.time === time);
  const frame = existing
    ? { ...existing, properties: { ...existing.properties, ...properties }, easing: existing.easing }
    : { id: newId(), time, properties: { ...properties }, easing };
  const keyframes = [...frames.filter(item => item.time !== time), frame].sort((a, b) => a.time - b.time);
  return { keyframes, frame };
}

export function scaleFrames(frames, factor) {
  const result = [];
  for (const frame of frames) {
    const next = { ...frame, time: Math.round(frame.time * factor) };
    if (result.at(-1)?.time === next.time) next.properties = { ...result.pop().properties, ...next.properties };
    result.push(next);
  }
  return result;
}

export function validFrames(frames, duration) {
  return Array.isArray(frames) && frames.every(frame => validFrame(frame, duration))
    && new Set(frames.map(frame => frame.id)).size === frames.length
    && new Set(frames.map(frame => frame.time)).size === frames.length;
}
