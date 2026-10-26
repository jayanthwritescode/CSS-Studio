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
    },
    view: { zoom: 0.5, grid: true, fit: true },
  };
}

export function reduce(state, action) {
  switch (action.type) {
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
    case 'view/grid': {
      const grid = Boolean(action.visible);
      if (grid === state.view.grid) return state;
      return { ...state, view: { ...state.view, grid } };
    }
    default: return state;
  }
}

export function createStore(initialState = createInitialState()) {
  let state = deepFreeze(structuredClone(initialState));
  const listeners = new Set();
  return {
    getState: () => state,
    dispatch(action) {
      const next = reduce(state, action);
      if (next === state) return;
      state = deepFreeze(next);
      for (const listener of listeners) listener(state, action);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}
