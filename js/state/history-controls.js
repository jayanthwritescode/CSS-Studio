export function mountHistory(store, playback) {
  const undo = document.querySelector('#undo'), redo = document.querySelector('#redo');
  let field = null, pointer = null;
  const editable = target => target.closest('input:not([type=file]), textarea, select');
  function endField() { if (field) { field = null; store.endTransaction(); } }
  document.addEventListener('focusin', event => {
    const next = editable(event.target);
    if (next === field) return;
    endField();
    if (next) { field = next; store.beginTransaction(); }
  }, true);
  document.addEventListener('focusout', () => { queueMicrotask(() => { if (field && document.activeElement !== field) endField(); }); }, true);
  document.addEventListener('pointerdown', event => {
    if (event.button !== 0 || editable(event.target) || !event.target.closest('#viewport, #timeline-scroll, #bezier-graph')) return;
    endField();
    pointer = event.pointerId; store.beginTransaction();
  }, true);
  const endPointer = event => {
    if (pointer !== event.pointerId) return;
    pointer = null;
    // Bubble handlers finish cancellation before the snapshot is committed.
    queueMicrotask(() => store.endTransaction());
  };
  document.addEventListener('pointerup', endPointer, true);
  document.addEventListener('pointercancel', endPointer, true);
  window.addEventListener('blur', () => { endField(); pointer = null; queueMicrotask(() => store.endTransaction()); });
  function perform(method) {
    endField(); store.endTransaction(); playback.pause(); store[method]();
  }
  undo.addEventListener('click', () => perform('undo'));
  redo.addEventListener('click', () => perform('redo'));
  document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || document.querySelector('dialog[open]')) return;
    if (event.key.toLowerCase() !== 'z') return;
    // Keep native text undo inside fields; document history is used outside them.
    if (editable(event.target)) return;
    event.preventDefault(); perform(event.shiftKey ? 'redo' : 'undo');
  });
  const render = () => { const history = store.getHistory(); undo.disabled = !history.canUndo; redo.disabled = !history.canRedo; };
  store.subscribe(render); render();
}
