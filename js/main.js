import { createStore } from './state/store.js';
import { mountCanvas } from './canvas/renderer.js';
import { mountProperties } from './panels/properties.js';
import { mountToolbar } from './panels/toolbar.js';

const store = createStore();
const canvas = mountCanvas(store);
mountProperties(store);
mountToolbar(store, canvas);
