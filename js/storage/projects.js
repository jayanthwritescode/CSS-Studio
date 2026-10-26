const DATABASE = 'motionlab-projects';
const requestResult = request => new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });

export async function openProjectRepository(factory = globalThis.indexedDB) {
  if (!factory) throw new Error('IndexedDB is unavailable in this browser.');
  const request = factory.open(DATABASE, 1);
  request.onupgradeneeded = () => {
    for (const store of ['projects', 'catalog', 'settings']) if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store, { keyPath: 'id' });
  };
  const db = await new Promise((resolve, reject) => {
    let settled = false;
    const fail = message => { if (settled) return; settled = true; clearTimeout(timer); reject(new Error(message)); };
    const timer = setTimeout(() => fail('Local storage did not respond. Export JSON to keep your work.'), 6000);
    request.onerror = () => fail(request.error?.message ?? 'Local storage could not be opened.');
    request.onblocked = () => fail('Close other MotionLab tabs and reload to enable local storage.');
    request.onsuccess = () => { if (settled) { request.result.close(); return; } settled = true; clearTimeout(timer); resolve(request.result); };
  });
  db.onversionchange = () => db.close();
  async function transaction(names, mode, run) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(names, mode);
      let result;
      try { result = run(tx); } catch (error) { tx.abort(); reject(error); return; }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error ?? new Error('Local project storage failed.'));
      tx.onabort = () => reject(tx.error ?? new Error('Local project storage was interrupted.'));
    });
  }
  return {
    async list(trashed = false) {
      const tx = db.transaction('catalog');
      const rows = await requestResult(tx.objectStore('catalog').getAll());
      return rows.filter(row => Boolean(row.trashed) === trashed).sort((a, b) => b.updatedAt - a.updatedAt);
    },
    async load(id) { return requestResult(db.transaction('projects').objectStore('projects').get(id)); },
    async last() { return (await requestResult(db.transaction('settings').objectStore('settings').get('current')))?.value ?? null; },
    async save(project, current = true) {
      await transaction(['projects', 'catalog', 'settings'], 'readwrite', tx => {
        tx.objectStore('projects').put(project);
        tx.objectStore('catalog').put({ id: project.id, name: project.name, updatedAt: Date.now(), elementCount: project.elements.length, trashed: false });
        if (current) tx.objectStore('settings').put({ id: 'current', value: project.id });
      });
    },
    async setTrashed(id, trashed) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(['catalog', 'settings'], 'readwrite');
        const get = tx.objectStore('catalog').get(id);
        get.onsuccess = () => {
          if (get.result) tx.objectStore('catalog').put({ ...get.result, trashed, updatedAt: Date.now() });
        };
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
      });
    },
    close() { db.close(); },
  };
}
