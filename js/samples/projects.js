import { createElement, newId } from '../elements/model.js';
import { buildPreset } from '../animation/presets.js';
import { DEFAULT_OUTPUT, normalizeProject } from '../storage/serialization.js';

export const SAMPLES = Object.freeze([
  { id: 'loading-indicator', name: 'Small moments', kind: 'Loading indicator', description: 'Three staggered dots, one quiet rhythm. Explore independent loading tracks.', color: '#b99ae9' },
  { id: 'text-entrance', name: 'Make an entrance', kind: 'Text entrance', description: 'Layer a headline, supporting text, and an accent with offset entrances.', color: '#edb188' },
  { id: 'motion-sequence', name: 'Find your rhythm', kind: 'Motion sequence', description: 'Compose position, rotation, and scale across three moving shapes.', color: '#b4a8d9' },
]);

export function sampleTemplate(id) {
  const metadata = SAMPLES.find(sample => sample.id === id);
  if (!metadata) throw new Error('Unknown sample project.');
  const project = {
    version: 1, id: `sample-${id}`, name: metadata.name,
    canvas: { width: 960, height: 600, background: id === 'loading-indicator' ? '#19141f' : id === 'text-entrance' ? '#faf7f2' : '#efeafb' },
    duration: id === 'loading-indicator' ? 1800 : id === 'text-entrance' ? 2600 : 3600,
    elements: [], output: { ...DEFAULT_OUTPUT },
  };
  const add = (type, name, styles, content = '') => {
    const element = createElement(type, project.canvas); element.name = name; element.content = content;
    Object.assign(element.styles, styles); project.elements.push(element); return element;
  };
  const text = (name, content, x, y, size, color, width = 840) => add('text', name, { x, y, width, height: size * 2.7, fontSize: size, color, fontWeight: 500 }, content);
  const keys = (element, frames, easing = 'ease-in-out') => {
    element.keyframes = frames.map(([time, properties]) => ({ id: newId(), time, properties, easing }));
  };
  if (id === 'loading-indicator') {
    text('Eyebrow', '01 / SMALL MOMENTS', 64, 48, 14, '#ad98be');
    text('Headline', 'Good things take a moment.', 64, 102, 52, '#f5edf9');
    const seed = createElement('circle', project.canvas);
    Object.assign(seed.styles, { x: 464, y: 300, width: 32, height: 32 });
    const dots = buildPreset(seed, 'bouncing-dots', { duration: 1800, delay: 0, easing: 'ease-in-out' }, 1800).elements;
    dots.forEach((dot, index) => { dot.name = ['Lilac dot', 'Peach dot', 'Ivory dot'][index]; dot.styles.backgroundColor = ['#b99ae9', '#edb188', '#f3e9f8'][index]; });
    project.elements.push(...dots);
    text('Loading caption', 'Preparing something good', 340, 380, 17, '#bbaac7', 300);
    text('Footer', 'A LITTLE MOTION. A CLEAR SIGNAL.', 64, 518, 12, '#907d9f');
  } else if (id === 'text-entrance') {
    text('Eyebrow', 'A STUDY IN ARRIVAL', 64, 56, 14, '#8b68bc');
    const accent = add('rectangle', 'Accent line', { x: 64, y: 186, width: 58, height: 6, borderRadius: 3, backgroundColor: '#9271ed' });
    keys(accent, [[0, { width: 1, opacity: 0 }], [900, { width: 58, opacity: 1 }]], 'ease-out');
    const headline = text('Headline entrance', 'Make an entrance.', 64, 220, 72, '#302445');
    keys(headline, [[0, { y: 270, opacity: 0 }], [200, { y: 270, opacity: 0 }], [1300, { y: 220, opacity: 1 }]], 'cubic-bezier(0.16, 1, 0.3, 1)');
    const subtitle = text('Supporting text', 'Give every idea a moment to arrive.', 68, 330, 24, '#877a91');
    keys(subtitle, [[0, { y: 365, opacity: 0 }], [650, { y: 365, opacity: 0 }], [1800, { y: 330, opacity: 1 }]], 'ease-out');
    add('circle', 'Peach accent', { x: 800, y: 72, width: 84, height: 84, backgroundColor: '#f0c4a5', opacity: 0.65 });
    text('Footer', 'PAUSE. SEEK. MAKE IT YOURS.', 64, 516, 12, '#95849f');
  } else {
    text('Headline', 'Find your own rhythm.', 56, 50, 44, '#302445');
    text('Supporting text', 'Three shapes. One shared timeline.', 58, 115, 17, '#8b7a9f');
    add('rectangle', 'Horizon', { x: 80, y: 432, width: 800, height: 2, borderRadius: 1, backgroundColor: '#d4c8e3' });
    const square = add('rectangle', 'Traveling square', { x: 140, y: 280, width: 100, height: 100, rotation: -12, backgroundColor: '#9571cf', borderRadius: 22 });
    keys(square, [[0, { x: 140, y: 280, rotation: -12 }], [900, { x: 300, y: 210, rotation: 78 }], [1800, { x: 430, y: 280, rotation: 168 }], [2700, { x: 300, y: 350, rotation: 258 }], [3600, { x: 140, y: 280, rotation: 348 }]]);
    const circle = add('circle', 'Breathing circle', { x: 440, y: 288, width: 84, height: 84, backgroundColor: '#edb188' });
    keys(circle, [[0, { y: 288, scaleX: 0.8, scaleY: 0.8, opacity: 0.65 }], [900, { y: 208, scaleX: 1.1, scaleY: 1.1, opacity: 1 }], [1800, { y: 288, scaleX: 0.8, scaleY: 0.8, opacity: 0.65 }], [2700, { y: 350, scaleX: 1.1, scaleY: 1.1, opacity: 1 }], [3600, { y: 288, scaleX: 0.8, scaleY: 0.8, opacity: 0.65 }]]);
    const pill = add('rectangle', 'Swinging pill', { x: 660, y: 300, width: 140, height: 60, borderRadius: 30, backgroundColor: '#40304f' });
    keys(pill, [[0, { x: 660, rotation: 0 }], [1200, { x: 560, rotation: -14 }], [2400, { x: 660, rotation: 14 }], [3600, { x: 660, rotation: 0 }]]);
    text('Footer', 'DESIGN IN SPACE. COMPOSE IN TIME.', 56, 518, 12, '#9a86aa');
  }
  project.elements = project.elements.map((element, index) => ({
    ...element, id: `${id}-layer-${index + 1}`,
    keyframes: element.keyframes.map((frame, frameIndex) => ({ ...frame, id: `${id}-key-${index + 1}-${frameIndex}` })),
  }));
  return normalizeProject(project);
}

export function createSample(id) { return { ...sampleTemplate(id), id: newId() }; }
