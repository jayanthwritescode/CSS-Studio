import { SAMPLES, createSample } from '../samples/projects.js';
import { openProjectRepository } from './projects.js';
import { parseProject, normalizeProject, serializeProject, validateImageAssets, MAX_PROJECT_BYTES } from './serialization.js';
import { createInitialState } from '../state/store.js';
import { newId } from '../elements/model.js';
import { downloadFile, filename } from '../export/download.js';

export async function mountProjectManager(store, playback, notify) {
  const dialog = document.querySelector('#project-library');
  const list = document.querySelector('#project-list');
  const status = document.querySelector('#save-status');
  const importInput = document.querySelector('#project-file');
  const trash = document.querySelector('#show-trash');
  let repository, timer, queue = Promise.resolve(), loading = true, saved = null, busy = false;
  let observed = store.getState().project;
  const setStatus = (text, error = false) => { status.textContent = text; status.classList.toggle('save-error', error); };
  const message = error => notify(error?.message ?? 'Local project storage failed. Download project JSON to keep a copy.');
  async function flush() {
    clearTimeout(timer);
    if (!repository) { setStatus('Save unavailable', true); throw new Error('Local storage is unavailable. Export project JSON to keep your work.'); }
    const project = store.getState().project;
    if (saved === project) { setStatus('Saved locally'); return; }
    setStatus('Saving…');
    const task = queue.catch(() => {}).then(() => repository.save(project));
    queue = task;
    try {
      await task; saved = project;
      if (store.getState().project === project) setStatus('Saved locally');
    } catch (error) { setStatus('Save failed · export JSON', true); throw error; }
  }
  async function install(project) {
    loading = true;
    playback.pause(); store.endTransaction();
    store.dispatch({ type: 'project/load', project });
    saved = null;
    loading = false;
    await flush();
  }
  async function guard(operation) {
    if (busy) return;
    busy = true; dialog.setAttribute('aria-busy', 'true');
    const controls = [...dialog.querySelectorAll('button, input')].map(control => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    try { await operation(); } catch (error) { message(error); }
    finally { busy = false; dialog.removeAttribute('aria-busy'); controls.forEach(([control, disabled]) => { control.disabled = disabled; }); }
  }
  async function render() {
    if (!repository || !dialog.open) return;
    const rows = await repository.list(trash.checked);
    list.replaceChildren();
    document.querySelector('#project-empty').hidden = rows.length > 0;
    for (const row of rows) {
      const card = document.createElement('article'); card.className = 'project-row'; card.dataset.projectId = row.id;
      const input = document.createElement('input'); input.value = row.name; input.maxLength = 80; input.disabled = trash.checked;
      input.setAttribute('aria-label', `Rename project ${row.name}`);
      input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); input.blur(); } if (event.key === 'Escape') { input.value = row.name; input.blur(); } });
      input.addEventListener('blur', () => {
        const name = input.value.trim().slice(0, 80) || row.name; input.value = name;
        if (name === row.name) return;
        guard(async () => {
          if (row.id === store.getState().project.id) { store.dispatch({ type: 'project/rename', name }); await flush(); }
          else { const project = normalizeProject(await repository.load(row.id)); await repository.save({ ...project, name }, false); }
          await render();
        });
      });
      const meta = document.createElement('p'); meta.textContent = `${row.elementCount} element${row.elementCount === 1 ? '' : 's'} · ${new Date(row.updatedAt).toLocaleString()}${row.id === store.getState().project.id ? ' · Current' : ''}`;
      const actions = document.createElement('div'); actions.className = 'project-row-actions';
      for (const action of trash.checked ? ['Restore'] : ['Open', 'Duplicate', 'Trash']) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = action;
        button.setAttribute('aria-label', `${action} project ${row.name}`);
        button.addEventListener('click', () => guard(async () => {
          await flush();
          if (action === 'Trash' || action === 'Restore') {
            await repository.setTrashed(row.id, action === 'Trash');
            if (action === 'Trash' && row.id === store.getState().project.id) await install(createInitialState().project);
            notify(action === 'Trash' ? 'Project moved to Trash. You can restore it here.' : 'Project restored.');
          } else {
            let project = normalizeProject(await repository.load(row.id));
            await validateImageAssets(project);
            if (action === 'Duplicate') project = { ...project, id: newId(), name: `${project.name.slice(0, 74)} copy` };
            await install(project); dialog.close();
          }
          await render();
        }));
        actions.append(button);
      }
      card.append(input, meta, actions); list.append(card);
    }
  }
  const openLibrary = () => guard(async () => {
    playback.pause(); await flush(); trash.checked = false; dialog.showModal(); await render();
  });
  document.querySelector('#open-projects').addEventListener('click', openLibrary);
  document.querySelectorAll('[data-open-samples]').forEach(button => button.addEventListener('click', openLibrary));
  for (const sample of SAMPLES) {
    const button = document.createElement('button'); button.type = 'button'; button.className = `sample-card sample-${sample.id}`;
    button.setAttribute('aria-label', `Use ${sample.kind} sample`);
    const art = document.createElement('span'); art.className = 'sample-art'; art.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) art.append(document.createElement('i'));
    const name = document.createElement('strong'); name.textContent = sample.name;
    const kind = document.createElement('span'); kind.className = 'sample-kind'; kind.textContent = sample.kind;
    const description = document.createElement('span'); description.className = 'sample-description'; description.textContent = sample.description;
    button.append(art, name, kind, description);
    button.addEventListener('click', () => guard(async () => { await flush(); await install(createSample(sample.id)); dialog.close(); notify(`${sample.name} is ready. Press Play to explore its editable tracks.`); }));
    document.querySelector('#sample-list').append(button);
  }
  document.querySelector('#close-projects').addEventListener('click', () => dialog.close());
  trash.addEventListener('change', () => guard(render));
  document.querySelector('#new-project').addEventListener('click', () => guard(async () => { await flush(); await install(createInitialState().project); dialog.close(); notify('New project created.'); }));
  document.querySelector('#save-project').addEventListener('click', () => guard(async () => { await flush(); notify('Project saved locally.'); }));
  document.querySelector('#import-project').addEventListener('click', () => { if (!busy) importInput.click(); });
  importInput.addEventListener('change', () => guard(async () => {
    const file = importInput.files[0]; importInput.value = '';
    if (!file) return;
    if (file.size > MAX_PROJECT_BYTES) throw new Error('Project files must be at most 64 MB.');
    const project = parseProject(await file.text()); await validateImageAssets(project);
    // Import always creates a new local document rather than overwriting another project.
    project.id = newId();
    await flush(); await install(project); notify('Project imported and saved locally.');
  }));
  document.querySelector('#download-project').addEventListener('click', () => {
    const project = store.getState().project;
    try { downloadFile(serializeProject(project), `${filename(project.name)}.motionlab.json`, 'application/json'); } catch (error) { message(error); }
  });
  document.addEventListener('keydown', event => {
    if (loading) return;
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's') {
      event.preventDefault(); guard(async () => { await flush(); notify('Project saved locally.'); });
    }
  });
  store.subscribe(state => {
    if (state.project === observed) return;
    observed = state.project;
    if (loading || state.project === saved) return;
    setStatus('Unsaved changes'); clearTimeout(timer);
    timer = setTimeout(() => flush().catch(message), 600);
  });
  window.addEventListener('pagehide', () => { if (!loading && store.getState().project !== saved) flush().catch(() => {}); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && !loading) flush().catch(() => {}); });
  try {
    setStatus('Opening local projects…');
    repository = await openProjectRepository();
    const current = await repository.last();
    const catalog = await repository.list();
    if (current && catalog.some(item => item.id === current)) {
      try { const project = normalizeProject(await repository.load(current)); await validateImageAssets(project); store.dispatch({ type: 'project/load', project }); saved = store.getState().project; }
      catch (error) { message(new Error(`The previous project could not be opened: ${error.message}`)); }
    }
    loading = false; await flush();
  } catch (error) { loading = false; setStatus('Save unavailable · export JSON', true); message(error); }
  return { flush, repository };
}
