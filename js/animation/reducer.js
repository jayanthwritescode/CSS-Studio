import { buildPreset } from './presets.js';
import { isValidElement } from '../elements/model.js';
import { animatedProperties, ANIMATABLE, evaluateElement } from './interpolation.js';
import { upsertFrame, scaleFrames, validateProperties, validFrames } from './keyframes.js';
import { parseEasing } from './easing.js';

export const initialTimeline = () => ({ time: 0, playing: false, loop: true, rate: 1, zoom: 1, mode: 'base', keyframeId: null });
const update = (state, element) => ({ ...state, project: { ...state.project, elements: state.project.elements.map(item => item.id === element.id ? element : item) } });
const find = (state, id) => state.project.elements.find(element => element.id === id);
const clampTime = (time, duration) => Math.round(Math.min(duration, Math.max(0, time)));

export function editElementStyles(state, element, patch) {
  if (state.timeline.playing || !Object.keys(patch).length) return state;
  if (state.timeline.mode === 'base') {
    if (Object.keys(patch).every(key => element.styles[key] === patch[key])) return state;
    return update(state, { ...element, styles: { ...element.styles, ...patch } });
  }
  const animated = Object.fromEntries(Object.entries(patch).filter(([key]) => ANIMATABLE.includes(key)));
  const base = Object.fromEntries(Object.entries(patch).filter(([key]) => !ANIMATABLE.includes(key)));
  const next = { ...element, styles: { ...element.styles, ...base } };
  if (!Object.keys(animated).length) return update(state, next);
  if (!element.keyframes.some(frame => frame.time === Math.round(state.timeline.time)) && state.project.elements.reduce((sum, item) => sum + item.keyframes.length, 0) >= 19999) return state;
  const { keyframes, frame } = upsertFrame(next, Math.round(state.timeline.time), animated);
  return { ...update(state, { ...next, keyframes }), selection: element.id, timeline: { ...state.timeline, time: frame.time, keyframeId: frame.id } };
}

export function reduceAnimation(state, action) {
  const timeline = state.timeline;
  switch (action.type) {
    case 'preset/apply': {
      const element = find(state, action.id);
      if (!element) return state;
      const result = buildPreset(element, action.presetId, action.options, state.project.duration);
      if (!result || state.project.elements.length + result.elements.length - 1 > 500) return state;
      if (state.project.elements.reduce((sum, item) => sum + item.keyframes.length, 0) - element.keyframes.length + result.elements.reduce((sum, item) => sum + item.keyframes.length, 0) > 20000) return state;
      const elements = state.project.elements.flatMap(item => item.id === element.id ? result.elements : [item]);
      return { ...state, project: { ...state.project, duration: result.duration, elements }, selection: element.id,
        timeline: { ...timeline, time: action.options.delay, playing: false, mode: 'keyframe', keyframeId: result.elements[0].keyframes.find(frame => frame.time === action.options.delay).id } };
    }
    case 'timeline/seek': {
      if (!Number.isFinite(action.time)) return state;
      const time = clampTime(action.time, state.project.duration);
      if (time === timeline.time && timeline.mode === 'keyframe' && !timeline.playing && timeline.keyframeId === null) return state;
      return { ...state, timeline: { ...timeline, time, playing: false, mode: 'keyframe', keyframeId: null } };
    }
    case 'timeline/tick': {
      if (!timeline.playing || !Number.isFinite(action.time) || typeof action.playing !== 'boolean') return state;
      return { ...state, timeline: { ...timeline, time: Math.min(state.project.duration, Math.max(0, action.time)), playing: action.playing } };
    }
    case 'timeline/playing': {
      if (typeof action.playing !== 'boolean' || action.playing === timeline.playing) return state;
      return { ...state, timeline: { ...timeline, playing: action.playing, mode: action.playing ? 'keyframe' : timeline.mode, keyframeId: null } };
    }
    case 'timeline/loop': return { ...state, timeline: { ...timeline, loop: Boolean(action.loop) } };
    case 'timeline/rate': {
      if (![-2, -1, -0.5, 0.5, 1, 2].includes(action.rate)) return state;
      return { ...state, timeline: { ...timeline, rate: action.rate } };
    }
    case 'timeline/zoom': {
      if (!Number.isFinite(action.zoom)) return state;
      const zoom = Math.min(8, Math.max(1, action.zoom));
      return zoom === timeline.zoom ? state : { ...state, timeline: { ...timeline, zoom } };
    }
    case 'timeline/mode': {
      if (!['base', 'keyframe'].includes(action.mode)) return state;
      return { ...state, timeline: { ...timeline, mode: action.mode, playing: false, time: action.mode === 'base' ? 0 : timeline.time, keyframeId: null } };
    }
    case 'project/duration': {
      if (!Number.isInteger(action.duration) || action.duration < 1 || action.duration > 120000 || action.duration === state.project.duration) return state;
      const factor = action.duration / state.project.duration;
      const elements = state.project.elements.map(element => ({ ...element, keyframes: scaleFrames(element.keyframes, factor) }));
      const frameExists = elements.some(element => element.keyframes.some(frame => frame.id === timeline.keyframeId));
      return { ...state, project: { ...state.project, duration: action.duration, elements }, timeline: { ...timeline, time: clampTime(timeline.time * factor, action.duration), keyframeId: frameExists ? timeline.keyframeId : null } };
    }
    case 'keyframe/add': {
      const element = find(state, action.id);
      if (!element || element.locked) return state;
      const time = Math.round(timeline.time);
      if (!element.keyframes.some(frame => frame.time === time) && state.project.elements.reduce((sum, item) => sum + item.keyframes.length, 0) >= 19999) return state;
      const properties = validateProperties(animatedProperties(evaluateElement(element, time, state.project.duration)));
      if (!properties) return state;
      const { keyframes, frame } = upsertFrame(element, time, properties);
      return { ...update(state, { ...element, keyframes }), selection: element.id, timeline: { ...timeline, mode: 'keyframe', playing: false, keyframeId: frame.id, time } };
    }
    case 'keyframe/select': {
      const element = find(state, action.id);
      const frame = element?.keyframes.find(item => item.id === action.keyframeId);
      if (!frame) return state;
      return { ...state, selection: element.id, timeline: { ...timeline, mode: 'keyframe', time: frame.time, playing: false, keyframeId: frame.id } };
    }
    case 'keyframe/update': {
      const element = find(state, action.id);
      const frame = element?.keyframes.find(item => item.id === action.keyframeId);
      if (!frame || element.locked) return state;
      const properties = action.properties === undefined ? {} : validateProperties(action.properties);
      const easing = action.easing === undefined ? frame.easing : parseEasing(action.easing)?.value;
      if (!properties || !easing) return state;
      if (easing === frame.easing && Object.keys(properties).every(key => frame.properties[key] === properties[key])) return state;
      const next = { ...frame, properties: { ...frame.properties, ...properties }, easing };
      return update(state, { ...element, keyframes: element.keyframes.map(item => item.id === frame.id ? next : item) });
    }
    case 'keyframe/move': {
      const element = find(state, action.id);
      const frame = element?.keyframes.find(item => item.id === action.keyframeId);
      if (!frame || element.locked || !Number.isFinite(action.time)) return state;
      const time = clampTime(action.time, state.project.duration);
      if (element.keyframes.some(item => item.id !== frame.id && item.time === time)) return state;
      const keyframes = element.keyframes.map(item => item.id === frame.id ? { ...item, time } : item).sort((a, b) => a.time - b.time);
      return { ...update(state, { ...element, keyframes }), selection: element.id, timeline: { ...timeline, time, keyframeId: frame.id, mode: 'keyframe', playing: false } };
    }
    case 'keyframe/delete': {
      const element = find(state, action.id);
      if (!element || element.locked || !element.keyframes.some(frame => frame.id === action.keyframeId)) return state;
      const keyframes = element.keyframes.filter(frame => frame.id !== action.keyframeId);
      return { ...update(state, { ...element, keyframes }), timeline: { ...timeline, keyframeId: null, playing: false } };
    }
    case 'element/restore-gesture': {
      const element = find(state, action.id);
      if (!element || element.locked || !validFrames(action.keyframes, state.project.duration)) return state;
      const restored = { ...element, styles: action.styles, keyframes: action.keyframes };
      if (!isValidElement(restored)) return state;
      return { ...update(state, restored), timeline: { ...timeline, keyframeId: action.keyframeId ?? null } };
    }
    default: return undefined;
  }
}
