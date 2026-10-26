// Development-only fixture: compare native CSS at a fixed time with expected.json.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInitialState } from '../js/state/store.js';
import { createElement } from '../js/elements/model.js';
import { PRESETS, buildPreset } from '../js/animation/presets.js';
import { evaluateElement } from '../js/animation/interpolation.js';
import { elementClass } from '../js/export/css-generator.js';
import { generateDemo } from '../js/export/html-generator.js';

const destination = resolve(process.argv[2] ?? '/tmp/motionlab-export-check');
const project = createInitialState().project;
project.name = 'MotionLab native export check'; project.output.iterations = 1;
const sparse = createElement('rectangle', project.canvas);
sparse.name = 'Independent sparse property tracks';
Object.assign(sparse.styles, { x: 0, y: 0, rotation: 0, backgroundColor: '#000000' });
sparse.keyframes = [
  { id: 'sparse-start', time: 0, properties: { x: 0, y: 0, rotation: 0, opacity: 1, backgroundColor: '#000000' }, easing: 'linear' },
  { id: 'sparse-middle', time: 1000, properties: { y: 100 }, easing: 'ease-in' },
  { id: 'sparse-end', time: 3000, properties: { x: 300, y: 200, rotation: 180, opacity: 0.4, backgroundColor: '#ffffff' }, easing: 'linear' },
];
project.elements = [sparse];
for (const preset of PRESETS) {
  const element = createElement(preset.types?.[0] ?? 'rectangle', project.canvas);
  element.name = preset.name; if (element.type === 'text') element.content = 'Motion';
  project.elements.push(...buildPreset(element, preset.id, { duration: 3000, delay: 0, easing: 'linear' }, 3000).elements);
}
const timestamp = 1500;
const html = generateDemo(project).replace('</style>', `.ml-element { animation-play-state: paused !important; animation-delay: -${timestamp / 1000}s !important; }\n</style>`);
const expected = project.elements.map((element, index) => ({ selector: `.${elementClass(project, index)}`, name: element.name, styles: evaluateElement(element, timestamp, project.duration) }));
await mkdir(destination, { recursive: true });
await Promise.all([
  writeFile(resolve(destination, 'index.html'), html),
  writeFile(resolve(destination, 'expected.json'), JSON.stringify({ timestamp, elements: expected }, null, 2)),
]);
console.log(`Native CSS fixture written to ${destination}`);
