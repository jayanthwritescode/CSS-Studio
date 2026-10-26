import { createHistory } from './history.js';
import { normalizeProject, normalizeOutput } from '../storage/serialization.js';
import { editElementStyles, initialTimeline, reduceAnimation } from '../animation/reducer.js';
import { validFrames } from '../animation/keyframes.js';
import { isValidElement, newId, validateStylePatch } from '../elements/model.js';

/** Project data is serializable; workspace view state is kept separate. */
export const LIMITS = Object.freeze({ minDimension: 64, maxDimension: 4096, minZoom: 0.05, maxZoom: 2 });

export function createInitialState() {
  return {
    project: {
      version: 1,
      id: globalThis.crypto?.randomUUID?.() ?? `project-${Date.now()}`,
      name: 'Untitled motion',
      canvas: { width: 1280, height: 720, background: '#faf9ff' },
      duration: 3000,
      elements: [],
      output: normalizeOutput(),
    },
    view: { zoom: 0.5, grid: true, snap: false, fit: true, panX: 0, panY: 0 },
    selection: null,
    timeline: initialTimeline(),
  };
}

export function reduce(state, action) {
  if (action.type === 'element/restore-gesture' && !validateStylePatch(action.styles)) return state;
  const animation = reduceAnimation(state, action);
  if (animation !== undefined) return animation;
  switch (action.type) {
    case 'project/load': {
      try {
        return { ...state, project: normalizeProject(action.project), selection: null, timeline: initialTimeline(), view: { ...state.view, fit: true, panX: 0, panY: 0 } };
      } catch { return state; }
    }
    case 'project/output': {
      try { return { ...state, project: { ...state.project, output: normalizeOutput(action.output) } }; }
      catch { return state; }
    }
    case 'project/rename': {
      if (typeof action.name !== 'string') return state;
      const name = action.name.trim().slice(0, 80) || 'Untitled motion';
      if (name === state.project.name) return state;
      return { ...state, project: { ...state.project, name } };
    }
    case 'canvas/resize': {
      const { width, height } = action;
      const valid = value => Number.isInteger(value) && value >= LIMITS.minDimension && value <= LIMITS.maxDimension;
      if (!valid(width) || !valid(height)) return state;
      if (width === state.project.canvas.width && height === state.project.canvas.height) return state;
      return { ...state, project: { ...state.project, canvas: { ...state.project.canvas, width, height } } };
    }
    case 'canvas/background': {
      if (typeof action.color !== 'string' || !/^#[\da-f]{6}$/i.test(action.color)) return state;
      const background = action.color.toLowerCase();
      if (background === state.project.canvas.background) return state;
      return { ...state, project: { ...state.project, canvas: { ...state.project.canvas, background } } };
    }
    case 'view/zoom': {
      if (!Number.isFinite(action.zoom)) return state;
      const zoom = Math.min(LIMITS.maxZoom, Math.max(LIMITS.minZoom, action.zoom));
      const fit = action.fit === true;
      if (zoom === state.view.zoom && fit === state.view.fit) return state;
      return { ...state, view: { ...state.view, zoom, fit } };
    }
    case 'view/pan': {
      if (!Number.isFinite(action.x) || !Number.isFinite(action.y) || Math.abs(action.x) > 100000 || Math.abs(action.y) > 100000) return state;
      const fit = action.fit === true;
      if (action.x === state.view.panX && action.y === state.view.panY && fit === state.view.fit) return state;
      return { ...state, view: { ...state.view, panX: action.x, panY: action.y, fit } };
    }
    case 'view/snap': {
      const snap = Boolean(action.enabled);
      return snap === state.view.snap ? state : { ...state, view: { ...state.view, snap } };
    }
    case 'view/grid': {
      const grid = Boolean(action.visible);
      if (grid === state.view.grid) return state;
      return { ...state, view: { ...state.view, grid } };
    }
    case 'selection/set': {
      const selection = action.id === null || state.project.elements.some(element => element.id === action.id) ? action.id : state.selection;
      return selection === state.selection ? state : { ...state, selection, timeline: { ...state.timeline, keyframeId: null } };
    }
    case 'element/add': {
      if (state.project.elements.length >= 500 || !isValidElement(action.element) || !validFrames(action.element.keyframes, state.project.duration) || state.project.elements.some(element => element.id === action.element.id)) return state;
      if (action.element.type === 'image' && state.project.elements.reduce((sum, item) => sum + (item.src?.length ?? 0), action.element.src.length) > 32 * 1024 * 1024) return state;
      if (state.project.elements.reduce((sum, item) => sum + item.keyframes.length, action.element.keyframes.length) > 20000) return state;
      const element = structuredClone(action.element);
      element.keyframes.sort((a, b) => a.time - b.time);
      return { ...state, project: { ...state.project, elements: [...state.project.elements, element] }, selection: element.id, timeline: { ...state.timeline, keyframeId: null } };
    }
    case 'element/update': {
      const element = state.project.elements.find(item => item.id === action.id);
      if (!element || element.locked) return state;
      const patch = validateStylePatch(action.styles);
      if (!patch) return state;
      return editElementStyles(state, element, patch);
    }
    case 'element/content': {
      const element = state.project.elements.find(item => item.id === action.id);
      if (!element || element.locked || element.type !== 'text' || typeof action.content !== 'string' || action.content.length > 10000 || action.content === element.content) return state;
      return updateElement(state, element.id, { ...element, content: action.content });
    }
    case 'element/rename': {
      const element = state.project.elements.find(item => item.id === action.id);
      if (!element || typeof action.name !== 'string') return state;
      const name = action.name.trim().slice(0, 80) || element.name;
      return name === element.name ? state : updateElement(state, element.id, { ...element, name });
    }
    case 'element/visibility':
    case 'element/lock': {
      const element = state.project.elements.find(item => item.id === action.id);
      if (!element) return state;
      const key = action.type === 'element/lock' ? 'locked' : 'visible';
      return updateElement(state, element.id, { ...element, [key]: !element[key] });
    }
    case 'element/delete': {
      const element = state.project.elements.find(item => item.id === action.id);
      if (!element || element.locked) return state;
      return { ...state, project: { ...state.project, elements: state.project.elements.filter(item => item.id !== element.id) }, selection: state.selection === element.id ? null : state.selection, timeline: { ...state.timeline, keyframeId: state.selection === element.id ? null : state.timeline.keyframeId, playing: state.project.elements.length === 1 ? false : state.timeline.playing } };
    }
    case 'element/duplicate': {
      const index = state.project.elements.findIndex(item => item.id === action.id);
      if (index < 0 || state.project.elements.length >= 500) return state;
      const source = state.project.elements[index];
      if (source.src && state.project.elements.reduce((sum, item) => sum + (item.src?.length ?? 0), source.src.length) > 32 * 1024 * 1024) return state;
      if (state.project.elements.reduce((sum, item) => sum + item.keyframes.length, source.keyframes.length) > 20000) return state;
      const copy = structuredClone(state.project.elements[index]);
      copy.id = newId();
      copy.name = `${copy.name.slice(0, 73)} copy`;
      copy.locked = false;
      copy.keyframes = copy.keyframes.map(frame => ({ ...frame, id: newId(), properties: { ...frame.properties, ...('x' in frame.properties ? { x: Math.min(100000, frame.properties.x + 24) } : {}), ...('y' in frame.properties ? { y: Math.min(100000, frame.properties.y + 24) } : {}) } }));
      copy.styles.x = Math.min(100000, copy.styles.x + 24);
      copy.styles.y = Math.min(100000, copy.styles.y + 24);
      const elements = [...state.project.elements];
      elements.splice(index + 1, 0, copy);
      return { ...state, project: { ...state.project, elements }, selection: copy.id, timeline: { ...state.timeline, keyframeId: null } };
    }
    case 'element/reorder': {
      const index = state.project.elements.findIndex(item => item.id === action.id);
      if (index < 0 || state.project.elements[index].locked || ![-1, 1].includes(action.direction)) return state;
      const nextIndex = index + action.direction;
      if (nextIndex < 0 || nextIndex >= state.project.elements.length) return state;
      const elements = [...state.project.elements];
      [elements[index], elements[nextIndex]] = [elements[nextIndex], elements[index]];
      return { ...state, project: { ...state.project, elements } };
    }
    default: return state;
  }
}

export function createStore(initialState = createInitialState()) {
  let state = deepFreeze(structuredClone(initialState));
  const listeners = new Set();
  const history = createHistory();
  const snapshot = () => ({ project: state.project, selection: state.selection, timeline: { time: state.timeline.time, mode: state.timeline.mode, keyframeId: state.timeline.keyframeId } });
  const emit = action => { for (const listener of listeners) listener(state, action); };
  function restore(saved, type) {
    if (!saved) return;
    state = deepFreeze({ ...state, ...saved, timeline: { ...state.timeline, ...saved.timeline, playing: false } });
    emit({ type });
  }
  return {
    getState: () => state,
    dispatch(action) {
      const before = snapshot();
      const next = reduce(state, action);
      if (next === state) return;
      state = deepFreeze(next);
      if (action.type === 'project/load') history.clear();
      else history.record(before, snapshot());
      emit(action);
    },
    beginTransaction() { history.begin(snapshot()); },
    endTransaction() { history.end(snapshot()); emit({ type: 'history/change' }); },
    undo() { restore(history.undo(snapshot()), 'history/undo'); },
    redo() { restore(history.redo(snapshot()), 'history/redo'); },
    getHistory: () => ({ canUndo: history.canUndo, canRedo: history.canRedo }),
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function updateElement(state, id, next) {
  return { ...state, project: { ...state.project, elements: state.project.elements.map(element => element.id === id ? next : element) } };
}

export const selectedElement = state => state.project.elements.find(element => element.id === state.selection) ?? null;
