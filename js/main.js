import { createStore } from './state/store.js';
import { mountCanvas } from './canvas/renderer.js';
import { mountInteractions } from './canvas/interactions.js';
import { mountProperties } from './panels/properties.js';
import { mountElementProperties } from './panels/element-properties.js';
import { mountLayers } from './panels/layers.js';
import { mountToolbar } from './panels/toolbar.js';
import { mountElements } from './elements/controller.js';

const store = createStore();
let notificationTimer;
function notify(message) {
  const notification = document.querySelector('#notification');
  clearTimeout(notificationTimer);
  notification.textContent = message;
  notification.hidden = false;
  notificationTimer = setTimeout(() => { notification.hidden = true; }, 6000);
}
const canvas = mountCanvas(store);
mountProperties(store);
mountElementProperties(store);
mountLayers(store);
mountToolbar(store, canvas);
mountInteractions(store);
mountElements(store, notify);
