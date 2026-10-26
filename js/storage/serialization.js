import { createElement, isImageSource, isValidElement, validateStylePatch, newId } from '../elements/model.js';
import { validFrames } from '../animation/keyframes.js';

export const MAX_PROJECT_BYTES = 64 * 1024 * 1024;
export const DEFAULT_OUTPUT = Object.freeze({ iterations: 'infinite', direction: 'normal', fill: 'both', delay: 0, speed: 1 });
const plain = value => value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const id = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const hex = value => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
function requireValue(condition, message) { if (!condition) throw new Error(message); }

export function normalizeOutput(input = {}) {
  requireValue(plain(input), 'Invalid export settings.');
  const output = { ...DEFAULT_OUTPUT, ...input };
  requireValue(output.iterations === 'infinite' || integer(output.iterations, 1, 100), 'Iterations must be 1–100 or infinite.');
  requireValue(['normal', 'reverse', 'alternate', 'alternate-reverse'].includes(output.direction), 'Unsupported animation direction.');
  requireValue(['none', 'forwards', 'backwards', 'both'].includes(output.fill), 'Unsupported fill mode.');
  requireValue(Number.isFinite(output.delay) && output.delay >= 0 && output.delay <= 30, 'Export delay must be 0–30 seconds.');
  requireValue([0.5, 1, 2].includes(output.speed), 'Unsupported export speed.');
  return Object.fromEntries(Object.keys(DEFAULT_OUTPUT).map(key => [key, output[key]]));
}

export function validImageHeader(source) {
  if (!isImageSource(source)) return false;
  try {
    const type = source.slice(5, source.indexOf(';')).toLowerCase();
    const bytes = atob(source.slice(source.indexOf(',') + 1, source.indexOf(',') + 33));
    if (type === 'image/png') return bytes.startsWith('\x89PNG\r\n\x1a\n');
    if (type === 'image/jpeg') return bytes.startsWith('\xff\xd8\xff');
    if (type === 'image/gif') return /^GIF8[79]a/.test(bytes);
    return type === 'image/webp' && bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP';
  } catch { return false; }
}

/** Whitelist a project into fresh plain data. No imported object is installed verbatim. */
export function normalizeProject(input) {
  requireValue(plain(input), 'The file does not contain a MotionLab project.');
  requireValue(input.version === undefined || input.version === 1, 'This project version is not supported.');
  requireValue(id(input.id), 'Invalid project ID.');
  requireValue(typeof input.name === 'string' && input.name.trim().length > 0 && input.name.length <= 80, 'Project name must be 1–80 characters.');
  requireValue(plain(input.canvas) && integer(input.canvas.width, 64, 4096) && integer(input.canvas.height, 64, 4096) && hex(input.canvas.background), 'Invalid canvas settings.');
  requireValue(integer(input.duration, 1, 120000), 'Duration must be 1–120000 milliseconds.');
  requireValue(Array.isArray(input.elements) && input.elements.length <= 500, 'A project can contain up to 500 elements.');
  const canvas = { width: input.canvas.width, height: input.canvas.height, background: input.canvas.background.toLowerCase() };
  const ids = new Set(), frameIds = new Set();
  let totalFrames = 0, assetBytes = 0;
  const elements = input.elements.map((raw, index) => {
    requireValue(plain(raw) && id(raw.id) && !ids.has(raw.id), `Invalid or duplicate element ID at layer ${index + 1}.`);
    ids.add(raw.id);
    requireValue(['rectangle', 'circle', 'text', 'image'].includes(raw.type), 'Unsupported element type.');
    requireValue(typeof raw.name === 'string' && raw.name.trim().length > 0 && raw.name.length <= 80, 'Invalid layer name.');
    requireValue(plain(raw.styles) && validateStylePatch(raw.styles), `Invalid styles on ${raw.name}.`);
    let defaults;
    if (raw.type === 'image') {
      assetBytes += raw.src?.length ?? 0;
      requireValue(assetBytes <= 32 * 1024 * 1024, 'Embedded image data must total at most 32 MB.');
      requireValue(validImageHeader(raw.src), `Invalid image asset on ${raw.name}.`);
      defaults = createElement('image', canvas, 0, { src: raw.src, width: 100, height: 100 });
    } else defaults = createElement(raw.type, canvas);
    requireValue(JSON.stringify(raw.styles).length <= 2000, 'Element styles are too large.');
    const styles = { ...defaults.styles, ...validateStylePatch(raw.styles) };
    requireValue(typeof raw.content === 'string' || raw.content === undefined, 'Invalid text content.');
    requireValue(raw.visible === undefined || typeof raw.visible === 'boolean', 'Invalid layer visibility.');
    requireValue(raw.locked === undefined || typeof raw.locked === 'boolean', 'Invalid layer lock state.');
    requireValue(Array.isArray(raw.keyframes), 'Invalid keyframe list.');
    const keyframes = raw.keyframes.map(frame => {
      requireValue(plain(frame) && (frame.id === undefined || id(frame.id)), 'Invalid keyframe.');
      requireValue(frame.easing === undefined || (typeof frame.easing === 'string' && frame.easing.length <= 100), 'Invalid keyframe easing.');
      const frameId = frame.id ?? newId();
      requireValue(!frameIds.has(frameId), 'Duplicate keyframe IDs.'); frameIds.add(frameId);
      return { id: frameId, time: frame.time, properties: plain(frame.properties) ? { ...frame.properties } : null, easing: frame.easing ?? 'linear' };
    }).sort((a, b) => a.time - b.time);
    totalFrames += keyframes.length;
    requireValue(totalFrames <= 20000 && validFrames(keyframes, input.duration), 'Invalid, duplicate, or excessive keyframes.');
    const element = { id: raw.id, type: raw.type, name: raw.name.trim(), visible: raw.visible ?? true, locked: raw.locked ?? false, content: raw.content ?? '', styles, keyframes, ...(raw.type === 'image' ? { src: raw.src } : {}) };
    requireValue(isValidElement(element), `Invalid element ${raw.name}.`);
    return element;
  });
  return { version: 1, id: input.id, name: input.name.trim(), canvas, duration: input.duration, elements, output: normalizeOutput(input.output ?? {}) };
}

export function parseProject(text) {
  requireValue(typeof text === 'string' && new TextEncoder().encode(text).length <= MAX_PROJECT_BYTES, 'Project files must be at most 64 MB.');
  let input;
  try { input = JSON.parse(text); } catch { throw new Error('The project file is not valid JSON.'); }
  return normalizeProject(input);
}
export const serializeProject = project => JSON.stringify(normalizeProject(project), null, 2);

export async function validateImageAssets(project) {
  if (typeof Image === 'undefined') return;
  for (const element of project.elements) {
    if (element.type !== 'image') continue;
    await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.naturalWidth * image.naturalHeight <= 40_000_000 ? resolve() : reject(new Error('An image exceeds 40 megapixels.'));
      image.onerror = () => reject(new Error(`The image on ${element.name} could not be decoded.`));
      image.src = element.src;
    });
  }
}
