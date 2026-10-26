/** Immutable snapshots share unchanged elements/assets. A gesture becomes one entry. */
export function createHistory(limit = 100) {
  let past = [], future = [], transaction = null, dirty = false;
  const same = (a, b) => a === b || (a && b && typeof a === 'object' && typeof b === 'object' && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.hasOwn(b, key) && same(a[key], b[key])));
  const equal = (a, b) => same(a.project, b.project);
  return {
    begin(snapshot) { if (!transaction) { transaction = snapshot; dirty = false; } },
    record(before, after) {
      if (equal(before, after)) return;
      if (transaction) { dirty = true; return; }
      past.push(before); if (past.length > limit) past.shift(); future = [];
    },
    end(snapshot) {
      if (!transaction) return;
      const start = transaction; transaction = null; dirty = false;
      if (!equal(start, snapshot)) { past.push(start); if (past.length > limit) past.shift(); future = []; }
    },
    undo(snapshot) {
      this.end(snapshot);
      if (!past.length) return null;
      future.push(snapshot); return past.pop();
    },
    redo(snapshot) {
      this.end(snapshot);
      if (!future.length) return null;
      past.push(snapshot); return future.pop();
    },
    clear() { past = []; future = []; transaction = null; dirty = false; },
    get canUndo() { return past.length > 0 || dirty; },
    get canRedo() { return !dirty && future.length > 0; },
  };
}
