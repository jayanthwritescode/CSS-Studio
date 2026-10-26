import { generateCSS, elementClass, projectPrefix } from './css-generator.js';
export const escapeHTML = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export function generateHTML(project) {
  const elements = project.elements.map((element, index) => {
    const content = element.type === 'text' ? `<span class="ml-text-content">${escapeHTML(element.content)}</span>` : element.type === 'image' ? `<img src="${escapeHTML(element.src)}" alt="${escapeHTML(element.name)}">` : '';
    return `  <div class="ml-element ${elementClass(project, index)}" aria-label="${escapeHTML(element.name)}">${content}</div>`;
  });
  return `<div class="${projectPrefix(project)}-stage" role="img" aria-label="${escapeHTML(project.name)}">\n${elements.join('\n')}\n</div>\n`;
}
export function generateDemo(project, settings = project.output) {
  const prefix = projectPrefix(project);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHTML(project.name)} · MotionLab</title>
<style>
html, body { margin: 0; min-height: 100%; background: #17141e; }
body { display: grid; place-items: center; padding: 24px; min-height: 100vh; box-sizing: border-box; }
.ml-demo-frame { position: relative; }
.${prefix}-stage { transform-origin: top left; }
${generateCSS(project, settings)}
</style>
</head>
<body>
<div class="ml-demo-frame">${generateHTML(project)}</div>
<script>
// Layout only: the animation itself runs entirely in CSS.
const frame = document.querySelector('.ml-demo-frame');
const stage = frame.firstElementChild;
function fit() {
  const scale = Math.min(1, Math.max(1, innerWidth - 48) / ${project.canvas.width});
  frame.style.width = (${project.canvas.width} * scale) + 'px';
  frame.style.height = (${project.canvas.height} * scale) + 'px';
  stage.style.transform = 'scale(' + scale + ')';
}
addEventListener('resize', fit); fit();
</script>
</body>
</html>\n`;
}
