import { usesRevealClip } from '../elements/styles.js';
import { compileTracks } from '../animation/interpolation.js';
import { normalizeOutput } from '../storage/serialization.js';

const COLORS = new Set(['backgroundColor', 'color', 'borderColor']);
const number = value => Number(value.toFixed(8)).toString();
export function projectPrefix(project) {
  let hash = 2166136261;
  for (const char of project.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `ml-${(hash >>> 0).toString(36)}`;
}
export const elementClass = (project, index) => `${projectPrefix(project)}-e${index + 1}`;
const channels = value => [1, 3, 5].map(offset => parseInt(value.slice(offset, offset + 2), 16));

/** Registered numeric variables keep sparse property tracks independent in native CSS. */
export function generateCSS(project, settings = project.output) {
  const output = normalizeOutput(settings);
  const prefix = projectPrefix(project);
  const css = [
    '/* MotionLab · native CSS animation. Registered custom properties require a modern browser. */',
    `.${prefix}-stage, .${prefix}-stage * { box-sizing: border-box; }`,
    `.${prefix}-stage { position: relative; isolation: isolate; overflow: hidden; width: ${project.canvas.width}px; height: ${project.canvas.height}px; background: ${project.canvas.background}; }`,
    `.${prefix}-stage > .ml-element { position: absolute; top: 0; left: 0; overflow: hidden; }`,
    `.${prefix}-stage .ml-text-content { display: block; width: max-content; max-width: 100%; min-height: 1.25em; white-space: pre-wrap; overflow-wrap: anywhere; }`,
    `.${prefix}-stage img { display: block; width: 100%; height: 100%; object-fit: contain; }`,
  ];
  project.elements.forEach((element, index) => {
    const name = elementClass(project, index), styles = element.styles;
    const tracks = new Map([...compileTracks(element)].filter(([key, points]) => !points.every(point => point.value === styles[key])));
    const animations = [], variables = [];
    for (const [key, track] of tracks) {
      const color = COLORS.has(key), parts = color ? ['r', 'g', 'b'] : [''];
      const initial = color ? channels(styles[key]) : [styles[key]];
      parts.forEach((part, partIndex) => {
        const variable = `--${name}-${key}${part ? `-${part}` : ''}`;
        css.push(`@property ${variable} { syntax: "<number>"; inherits: true; initial-value: ${number(initial[partIndex])}; }`);
        variables.push(`${variable}: ${number(initial[partIndex])};`);
      });
      const animationName = `${name}-${key}`;
      animations.push(animationName);
      const points = [...track];
      if (points.at(-1).time < project.duration) points.push({ ...points.at(-1), time: project.duration, easing: 'linear' });
      const rules = points.map(point => {
        const values = color ? channels(point.value) : [point.value];
        const declarations = parts.map((part, partIndex) => `--${name}-${key}${part ? `-${part}` : ''}: ${number(values[partIndex])};`).join(' ');
        return `  ${number(point.time / project.duration * 100)}% { ${declarations} animation-timing-function: ${point.easing}; }`;
      });
      css.push(`@keyframes ${animationName} {\n${rules.join('\n')}\n}`);
    }
    const raw = key => tracks.has(key) ? `var(--${name}-${key})` : number(styles[key]);
    const px = (key, minimum) => minimum === undefined ? `calc(${raw(key)} * 1px)` : `max(${minimum}px, calc(${raw(key)} * 1px))`;
    const color = key => tracks.has(key) ? `rgb(clamp(0, var(--${name}-${key}-r), 255) clamp(0, var(--${name}-${key}-g), 255) clamp(0, var(--${name}-${key}-b), 255))` : styles[key];
    const glowColor = color(element.type === 'text' ? 'color' : 'backgroundColor');
    const reveal = `clamp(0, ${raw('reveal')}, 1)`;
    const declarations = [
      ...variables, `z-index: ${index};`, `width: ${px('width', 0.001)};`, `height: ${px('height', 0.001)};`,
      `transform: translate(${px('x')}, ${px('y')}) rotate(calc(${raw('rotation')} * 1deg)) perspective(800px) rotateY(calc(${raw('rotationY')} * 1deg)) scale(${raw('scaleX')}, ${raw('scaleY')});`,
      `transform-origin: ${styles.transformOrigin};`, `opacity: clamp(0, ${raw('opacity')}, 1);`,
      `background-color: ${styles.backgroundTransparent ? 'transparent' : color('backgroundColor')};`, `color: ${color('color')};`,
      `border: ${px('borderWidth', 0)} ${styles.borderStyle} ${color('borderColor')};`,
      `border-top-color: ${styles.spinnerEnabled ? 'transparent' : color('borderColor')};`,
      `border-radius: ${px('borderRadius', 0)};`, `box-shadow: ${styles.boxShadow};`,
      `font-family: ${styles.fontFamily};`, `font-size: ${px('fontSize', 0.001)};`, `font-weight: ${styles.fontWeight};`,
      'line-height: 1.25;', 'white-space: pre-wrap;', 'overflow-wrap: anywhere;',
      `filter: drop-shadow(0 0 ${px('glow', 0)} ${glowColor}) drop-shadow(0 0 max(0px, calc(${raw('glow')} * 0.5px)) ${glowColor});`,
      `background-image: ${styles.shimmerEnabled ? 'linear-gradient(100deg, transparent 20%, #ffffff99 50%, transparent 80%)' : 'none'};`,
      `background-size: ${styles.shimmerEnabled ? '200% 100%' : 'auto'};`, `background-position: calc(${raw('shimmer')} * 1%) 0;`,
    ];
    if (!element.visible) declarations.push('display: none;');
    if (element.type !== 'text') declarations.push(usesRevealClip(element) ? `clip-path: inset(0 calc((1 - ${reveal}) * 100%) 0 0);` : 'clip-path: none;');
    if (animations.length) declarations.push(
      `animation-name: ${animations.join(', ')};`, `animation-duration: ${number(project.duration / 1000 / output.speed)}s;`,
      'animation-timing-function: linear;', `animation-delay: ${number(output.delay)}s;`,
      `animation-iteration-count: ${output.iterations};`, `animation-direction: ${output.direction};`, `animation-fill-mode: ${output.fill};`,
    );
    css.push(`.${name} {\n  ${declarations.join('\n  ')}\n}`);
    if (element.type === 'text') css.push(`.${name} > .ml-text-content { clip-path: inset(0 calc((1 - ${reveal}) * 100%) 0 0); }`);
  });
  return `${css.join('\n\n')}\n`;
}
