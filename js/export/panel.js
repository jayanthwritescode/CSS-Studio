import { generateCSS } from './css-generator.js';
import { generateHTML, generateDemo } from './html-generator.js';
import { serializeProject } from '../storage/serialization.js';
import { copyText, downloadFile, filename, highlight } from './download.js';

export function mountExport(store, playback, notify) {
  const dialog = document.querySelector('#export-dialog');
  const code = document.querySelector('#export-code');
  const frame = document.querySelector('#export-preview');
  let format = 'css', source = '', lastPreview = null;
  const settings = () => ({
    iterations: document.querySelector('#export-infinite').checked ? 'infinite' : Number(document.querySelector('#export-iterations').value),
    direction: document.querySelector('#export-direction').value, fill: document.querySelector('#export-fill').value,
    delay: Number(document.querySelector('#export-delay').value), speed: Number(document.querySelector('#export-speed').value),
  });
  function render(refreshDemo = true) {
    const { project } = store.getState();
    const output = settings();
    try {
      source = format === 'css' ? generateCSS(project, output) : format === 'html' ? generateHTML(project) : format === 'demo' ? generateDemo(project, output) : serializeProject(project);
      const truncated = highlight(code, source, format === 'css' ? 'css' : format);
      document.querySelector('#export-code-note').textContent = `${source.length.toLocaleString()} characters${truncated ? ' · preview limited to 100,000 characters; copy/download includes everything' : ''}`;
      document.querySelector('#export-format-label').textContent = { css: 'CSS', html: 'HTML snippet', demo: 'Standalone HTML', json: 'Project JSON' }[format];
      document.querySelectorAll('[data-export-format]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.exportFormat === format)));
      document.querySelector('#export-iterations').disabled = output.iterations === 'infinite';
      if (refreshDemo) {
        const demo = generateDemo(project, output);
        if (demo !== lastPreview) { frame.srcdoc = demo; lastPreview = demo; }
      }
    } catch (error) { notify(error.message); }
  }
  document.querySelector('#open-export').addEventListener('click', () => {
    playback.pause(); store.endTransaction();
    const output = store.getState().project.output;
    document.querySelector('#export-infinite').checked = output.iterations === 'infinite';
    document.querySelector('#export-iterations').value = output.iterations === 'infinite' ? 1 : output.iterations;
    document.querySelector('#export-direction').value = output.direction;
    document.querySelector('#export-fill').value = output.fill;
    document.querySelector('#export-delay').value = output.delay;
    document.querySelector('#export-speed').value = output.speed;
    dialog.showModal(); render();
  });
  document.querySelector('#close-export').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { frame.srcdoc = ''; lastPreview = null; });
  document.querySelectorAll('[data-export-format]').forEach(button => button.addEventListener('click', () => { format = button.dataset.exportFormat; render(false); }));
  function changeOptions(event) {
    if (event.target.matches('input') && !event.target.validity.valid) { if (event.type === 'change') event.target.reportValidity(); return; }
    const next = settings(), current = store.getState().project.output;
    if (Object.keys(next).every(key => next[key] === current[key])) return;
    store.dispatch({ type: 'project/output', output: next }); render();
  }
  document.querySelector('#export-options').addEventListener('change', changeOptions);
  document.querySelector('#export-options').addEventListener('input', changeOptions);
  document.querySelector('#copy-export').addEventListener('click', async () => {
    try { await copyText(source); notify('Full source copied.'); } catch (error) { notify(error.message); }
  });
  document.querySelector('#download-export').addEventListener('click', () => {
    const project = store.getState().project;
    const extension = { css: '.css', html: '.html', demo: '.html', json: '.motionlab.json' }[format];
    downloadFile(source, `${filename(project.name)}${format === 'demo' ? '-demo' : ''}${extension}`, format === 'json' ? 'application/json' : format === 'css' ? 'text/css' : 'text/html');
  });
  document.querySelector('#restart-export-preview').addEventListener('click', () => { lastPreview = null; render(); });
}
