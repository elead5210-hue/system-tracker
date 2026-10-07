import { getDb, SYSTEMS_STORE, PROJECTS_STORE } from './database.js';

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function createSystem(data = {}) {
  const db = await getDb();
  const now = new Date().toISOString();
  const system = {
    ...data,
    id: data.id || generateId(),
    name: typeof data.name === 'string' ? data.name.trim() : '',
    createdAt: now,
    updatedAt: now,
  };
  await db.add(SYSTEMS_STORE, system);
  return system;
}

export async function getSystem(id) {
  const db = await getDb();
  return (await db.get(SYSTEMS_STORE, id)) || null;
}

export async function listSystems() {
  const db = await getDb();
  const systems = await db.getAll(SYSTEMS_STORE);
  return systems.sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });
}

export async function updateSystem(id, changes = {}) {
  const db = await getDb();
  const tx = db.transaction(SYSTEMS_STORE, 'readwrite');
  const store = tx.objectStore(SYSTEMS_STORE);
  const existing = await store.get(id);
  if (!existing) {
    await tx.done;
    return null;
  }
  const updated = {
    ...existing,
    ...changes,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  if (typeof updated.name === 'string') {
    updated.name = updated.name.trim();
  }
  await store.put(updated);
  await tx.done;
  return updated;
}

export async function deleteSystem(id) {
  const db = await getDb();
  const tx = db.transaction([SYSTEMS_STORE, PROJECTS_STORE], 'readwrite');
  const projectsIndex = tx.objectStore(PROJECTS_STORE).index('systemId');
  let cursor = await projectsIndex.openKeyCursor(IDBKeyRange.only(id));
  const projectKeys = [];
  while (cursor) {
    projectKeys.push(cursor.primaryKey);
    cursor = await cursor.continue();
  }
  const projectsStore = tx.objectStore(PROJECTS_STORE);
  await Promise.all(projectKeys.map((key) => projectsStore.delete(key)));
  await tx.objectStore(SYSTEMS_STORE).delete(id);
  await tx.done;
}